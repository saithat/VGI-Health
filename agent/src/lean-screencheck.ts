import { LayoutReplyCache, PackedCache } from "./layout-reply-cache.js";
import { mapOrdered, taskSlots } from "./replay-pool.js";
import { BoundedMap } from './bounded-map.js';
import { applyLayoutRules, LayoutRuleRefusal, denseOutline } from "./layout-rules.js";
import { shapeFor } from "../../scripts/layout-reference/generator.mjs";
import { LeanReference, referenceGeneratorVersion } from "./lean-reference.js";
import { randomUUID } from "node:crypto";
import { fileHash } from "./fingerprints.js";
import { LeanLayoutRefusal } from "./lean-layout-refusal.js";
import path from "node:path";
import { mkdtemp, readFile, rm, appendFile, mkdir, rename } from "node:fs/promises";
import { tmpdir } from "node:os";
import { z } from "zod";
import type { GeometryAtlas } from "../../app/src/metrics/geometry.js";
import type { EhrClient } from "./ehr.js";
import type { ScreenChecker, ScreenCheckInput } from "./screencheck.js";
import type { GeometryProvider } from "./geometry.js";
import {
  geometryProgramHash,
  geometryComponentsHash,
  geometryCacheKey,
} from "./geometry.js";
import { designOf, withDesign, ruleCase, appliesTo } from "./layout-design.js";
import { expandProgram } from "./composites.js";
import { stableStringify, sha256 } from "./program.js";
import {
  layoutRunner,
  viewport,
  viewports,
  type LayoutRunner,
  type LayoutReply,
} from "./lean-layout-native.js";
import {
  paintSchema,
  placedGeometry,
  occurrences,
  type Paint,
} from "./lean-layout-geometry.js";
import { traceStates, type LeanScreenState } from "./lean-layout-states.js";
import { REPO_ROOT, writeJson, writeJsonCompactAtomic, errorMessage } from "./util.js";
import { specSchema, type Spec } from "./schema.js";
import type { ScreenCheckResult } from "../../app/src/dashboard/agent-evidence.js";
function required<T>(value: T | undefined): T {
  if (value === undefined) throw Error("Incomplete native layout response");
  return value;
}
export interface DensityLimit {
  limit: number;
  source: string;
}
/** Only vendor measurements supply limits. Retained candidate counts never do. */
export async function vendorDensityLimits(
  version: string,
  persona: string,
): Promise<Record<string, DensityLimit>> {
  const audit = z
    .object({
      programs: z.array(
        z.object({
          group: z.string(),
          id: z.string(),
          screens: z.array(
            z.object({
              screen: z.string(),
              maximum: z.number().int().nonnegative(),
            }),
          ),
        }),
      ),
    })
    .parse(
      JSON.parse(
        await readFile(
          path.join(REPO_ROOT, "docs/audits/r5-per-screen.json"),
          "utf8",
        ),
      ),
    );
  const limits: Record<string, DensityLimit> = {};
  const vendor = audit.programs.filter(
    (p) => p.group === "vendor" && p.id.startsWith(`${version}/`),
  );
  const personal = vendor.filter(
    (p) =>
      p.id === `${version}/${persona}` ||
      p.id === `${version}/personas/${persona}`,
  );
  for (const p of personal.length
    ? personal
    : vendor.filter((p) => p.id === `${version}/canonical`))
    for (const s of p.screens)
      limits[s.screen] = {
        limit: Math.max(limits[s.screen]?.limit ?? 0, s.maximum),
        source: `docs/audits/r5-per-screen.json:${p.id}`,
      };
  const snapshotFile = path.join(
    REPO_ROOT,
    "docs/methods/lean-screen-density.json",
  );
  const snapshots = z
    .object({
      measurements: z.record(
        z.string(),
        z.object({
          vendorProgramSha256: z.string(),
          sources: z.record(
            z.string(),
            z.object({ source: z.string(), reportSha256: z.string() }),
          ),
          limits: z.record(z.string(), z.number().int().nonnegative()),
        }),
      ),
    })
    .parse(JSON.parse(await readFile(snapshotFile, "utf8")));
  const measured = snapshots.measurements[`${version}/${persona}`];
  if (measured) {
    const vendor = z
      .record(z.string(), z.json())
      .parse(
        JSON.parse(
          await readFile(
            path.join(
              REPO_ROOT,
              "releases",
              version,
              "personas",
              `${persona}.json`,
            ),
            "utf8",
          ),
        ),
      );
    const hash = sha256(
      stableStringify({ ...vendor, id: persona, owner: persona }),
    );
    if (hash !== measured.vendorProgramSha256)
      throw Error(
        "Recorded vendor density snapshot belongs to a different release Program",
      );
    for (const [screen, limit] of Object.entries(measured.limits)) {
      const source = measured.sources[screen];
      if (!source) throw Error("Missing vendor density provenance");
      limits[screen] = {
        limit,
        source: `${source.source}#sha256=${source.reportSha256}`,
      };
    }
  }
  // Lean-painted screens show bounded lists one page at a time. The frozen
  // vendor baseline (owner-approved rule) is the larger of the measured vendor
  // limit and the vendor release Program's own dense layout over the retained
  // recorded states; a candidate's layout never sets a limit.
  const pagedFile = path.join(REPO_ROOT, "docs/methods/lean-paged-density.json");
  const pagedBytes = await readFile(pagedFile).catch(() => undefined);
  if (pagedBytes) {
    const paged = z
      .object({
        limits: z.record(
          z.string(),
          z.object({
            limit: z.number().int().nonnegative(),
            measured: z.number().int().nonnegative(),
            applied: z.enum(["measured", "vendor-dense"]),
          }),
        ),
      })
      .parse(JSON.parse(pagedBytes.toString("utf8")));
    const digest = sha256(pagedBytes.toString("utf8"));
    for (const [key, entry] of Object.entries(paged.limits)) {
      const prefix = `${version}/${persona}/`;
      if (!key.startsWith(prefix)) continue;
      const screen = key.slice(prefix.length);
      const measuredLimit = limits[screen]?.limit ?? 15;
      const limit = Math.max(entry.limit, measuredLimit);
      limits[screen] = {
        limit,
        source:
          limit > measuredLimit
            ? `vendor dense layout with bounded lists: docs/methods/lean-paged-density.json#sha256=${digest}`
            : (limits[screen]?.source ?? "Lean default (15)"),
      };
    }
  }
  return limits;
}
export interface LeanCheckerOptions {
  artifactsDir?: string;
  runner?: LayoutRunner;
  layoutTiming?: (elapsedMs: number) => void;
  states?: (
    input: Parameters<GeometryProvider>[0],
    spec: Spec,
  ) => Promise<LeanScreenState[]>;
  limits?: (
    version: string,
    persona: string,
  ) => Promise<Record<string, DensityLimit>>;
  bundles?: string[];
}
/** The admission verdict of a paint: what failure reporting reads. */
type Verdict = Pick<LayoutReply, "accepted" | "linked" | "findings" | "error">;
const verdictOf = (reply: LayoutReply): Verdict => ({
  ...(reply.accepted !== undefined ? { accepted: reply.accepted } : {}),
  ...(reply.linked !== undefined ? { linked: reply.linked } : {}),
  ...(reply.findings !== undefined ? { findings: reply.findings } : {}),
  ...(reply.error !== undefined ? { error: reply.error } : {}),
});
type SampleMeasurement = {
  verdict: Verdict;
  selection: "dense" | "fallback" | "custom" | "refused";
  failures: {screen:string; findings:unknown[]}[];
  admission?: Verdict;
  geometry: GeometryAtlas["states"];
  references?: unknown;
};
/** The placed boxes of an accepted paint: all `placedGeometry` reads. */
function compactPaint(reply: LayoutReply): Paint | undefined {
  if (!reply.accepted) return undefined;
  const parsed = paintSchema.parse(reply);
  return {
    accepted: parsed.accepted,
    boxes: parsed.boxes,
    ...(parsed.viewport ? { viewport: parsed.viewport } : {}),
  };
}
export class LeanScreenChecker implements ScreenChecker {
  readonly mode = "lean" as const;
  private trainingWorkspace:
    | { schedule: NonNullable<ScreenCheckInput["schedule"]>; worldDir: string }
    | undefined;
  setTrainingWorkspace(
    schedule: NonNullable<ScreenCheckInput["schedule"]>,
    worldDir: string,
  ): void {
    if (schedule.day % 2 !== 1)
      throw Error("Lean prompt workspace requires an odd training day");
    this.trainingWorkspace = { schedule: structuredClone(schedule), worldDir };
  }
  private coverageKey(input: ScreenCheckInput) {
    return (
      geometryCacheKey(input.program) +
      ":" +
      sha256(
        stableStringify([
          input.schedule ?? this.trainingWorkspace?.schedule,
          input.worldDir ?? this.trainingWorkspace?.worldDir,
        ]),
      )
    );
  }
  private readonly inventories = new BoundedMap<string, string>(8);
  private readonly checks = new BoundedMap<string, Promise<ScreenCheckResult>>(
    8,
  );
  private readonly runner: LayoutRunner;
  private readonly reference: LeanReference;
  private layoutHash: Promise<string> | undefined;
  private readonly traceSamples = new PackedCache<SampleMeasurement>(
    48 * 1024 * 1024,
  );
  private readonly replayLayouts: LayoutReplyCache;
  readonly referenceUsage: {
    day: number;
    persona: string;
    dense: number;
    fallback: number;
    custom: number;
    refused: number;
  }[] = [];
  get referenceStats() {
    return {
      ...this.reference.stats,
      generatorVersion: referenceGeneratorVersion,
    };
  }
  constructor(
    private readonly ehr: EhrClient,
    private readonly opts: LeanCheckerOptions = {},
  ) {
    const run = opts.runner ?? layoutRunner;
    this.runner = opts.layoutTiming
      ? async (requests) => {
          const start = performance.now();
          try {
            return await run(requests);
          } finally {
            opts.layoutTiming?.(performance.now() - start);
          }
        }
      : run;
    this.reference = new LeanReference(
      this.runner,
      undefined,
      run === layoutRunner,
    );
    this.replayLayouts = new LayoutReplyCache(this.runner);
  }
  private layoutExecutableHash() {
    this.layoutHash ??= fileHash(
      path.join(REPO_ROOT, "lean/.lake/build/bin/ui-layout"),
    ).catch((error) => {
      this.layoutHash = undefined;
      throw error;
    });
    return this.layoutHash;
  }
  private async spec(input: ScreenCheckInput) {
    return this.ehr.mode === "fake"
      ? this.ehr.specExport(input.specVersion)
      : specSchema.parse(
          JSON.parse(
            await readFile(
              input.specVersion.endsWith(".json")
                ? path.resolve(input.specVersion)
                : path.join(
                    REPO_ROOT,
                    "releases",
                    input.specVersion,
                    "spec.json",
                  ),
              "utf8",
            ),
          ),
        );
  }
  private async states(
    input: Parameters<GeometryProvider>[0],
    spec: Spec,
  ): Promise<LeanScreenState[]> {
    if (this.opts.states) return this.opts.states(input, spec);
    if (input.result && input.schedule && input.worldDir) {
      if (!this.ehr.binary)
        throw Error(
          "Fake simulation requires an explicit Lean screen-state fixture",
        );
      return traceStates(this.ehr.binary, {
        ...input,
        spec,
        schedule: input.schedule,
        worldDir: input.worldDir,
        result: input.result,
      });
    }
    const workspace =
      input.schedule && input.worldDir
        ? { schedule: input.schedule, worldDir: input.worldDir }
        : this.trainingWorkspace;
    const dir = await mkdtemp(path.join(tmpdir(), "lean-screen-export-"));
    try {
      const out: LeanScreenState[] = [];
      for (const [index, fhir] of (this.opts.bundles?.length
        ? this.opts.bundles
        : [path.join(REPO_ROOT, "fixtures/synthea/Ashly_Rippin_149fcc1f.json")]
      ).entries()) {
        const files = await this.ehr.renderScreens({
          ...input,
          fhir,
          ui: true,
          outDir: path.join(dir, String(index)),
          ...(workspace ? { workspace } : {}),
        });
        for (const file of files) {
          const ui = z
            .record(z.string(), z.unknown())
            .parse(JSON.parse(await readFile(file, "utf8")));
          if (!("workspace" in ui)) continue;
          const screen = z.string().parse(ui["screen"]);
          out.push({
            ui,
            screen,
            state: path.basename(file, ".json"),
            sample: `b${index}`,
          });
        }
      }
      if (!out.length) throw Error("No semantic screen states exported");
      return out;
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
  private async batch(requests: unknown[]): Promise<LayoutReply[]> {
    const out: LayoutReply[] = [];
    for (let i = 0; i < requests.length; i += 32) {
      const batch = requests.slice(i, i + 32);
      out.push(
        ...(await (taskSlots.getStore()
          ? this.replayLayouts.batch(batch)
          : this.runner(batch))),
      );
    }
    return out;
  }
  /** The screens as the clinical page lays them out and paints them: with
   * the host session group (`Layout.withSession`, through the same native
   * `session` operation as the page). Only admission, painting and geometry
   * read these; trace identities and recorded results keep the clinical
   * screen. Screens shared by several states stay shared. */
  private async sessioned(
    states: LeanScreenState[],
  ): Promise<LeanScreenState[]> {
    const distinct = [...new Set(states.map((s) => s.ui))];
    const replies = await this.batch(
      distinct.map((screen) => ({ op: "session", screen })),
    );
    const shown = new Map(
      distinct.map((ui, i) => {
        const reply = replies[i];
        if (reply?.error) throw Error(reply.error);
        return [
          ui,
          z.object({ screen: z.record(z.string(), z.unknown()) }).parse(reply)
            .screen,
        ] as const;
      }),
    );
    return states.map((s) => ({ ...s, ui: required(shown.get(s.ui)) }));
  }
  private async measure(
    input: Parameters<GeometryProvider>[0],
    spec: Spec,
    needAtlas = true,
  ) {
    const states = await this.sessioned(await this.states(input, spec)),
      design = designOf(input.program) ?? [];
    const limits = await (this.opts.limits ?? vendorDensityLimits)(
      input.program.specVersion,
      input.program.id,
    );
    const limitFor = (screen: string) =>
      limits[screen] ?? { limit: 15, source: "Lean default (15)" };
    // The same compact semantic screen serves many trace events. Compute its
    // structural keys once without retaining it beyond this measurement.
    const shapeKeys = new WeakMap<object, string>();
    const placementKeys = new WeakMap<object, string>();
    function shapeKeyOf(s: LeanScreenState) {
      let key = shapeKeys.get(s.ui);
      if (!key) {
        key = sha256(stableStringify([s.screen, shapeFor(s.ui)]));
        shapeKeys.set(s.ui, key);
      }
      return key;
    }
    function placementOf(s: LeanScreenState) {
      let key = placementKeys.get(s.ui);
      if (!key) {
        key = shapeKeyOf(s) + sha256(stableStringify(occurrences(s.ui)));
        placementKeys.set(s.ui, key);
      }
      return key;
    }
    const unique = new Map<string, LeanScreenState>();
    for (const s of states) unique.set(shapeKeyOf(s), s);
    const samples = [...unique.values()];
    const shapeRows = await this.batch(
      samples.map((s) => ({
        // Empty-family diagnostics expose the exact native erased shape,
        // without rechecking a reference family for every value change.
        // Admission still runs independently below on every distinct shape.
        op: "family-paint",
        references: [],
        screen: s.ui,
      })),
    );
    const shapes = samples.map((s, i) => {
      const shape = shapeRows[i]?.uncoveredShape;
      if (!shape) throw Error(`Native semantic shape unavailable: ${s.screen}`);
      return shape;
    });
    const selections = samples.map((s, i) =>
      design.find(
        (c) =>
          !ruleCase(c) &&
          c.screen === s.screen &&
          stableStringify(c.shape) === stableStringify(shapes[i]),
      ),
    );
    const unknown = input.result
      ? []
      : design.filter(
          (c) =>
            !ruleCase(c) &&
            !samples.some(
              (s, i) =>
                s.screen === c.screen &&
                stableStringify(c.shape) === stableStringify(shapes[i]),
            ),
        );
    const ruleFailures: { screen: string; findings: unknown[] }[] = [];
    if (!input.result)
      for (const c of design.filter(ruleCase)) {
        if (!samples.some((s) => appliesTo(c, s.screen)))
          ruleFailures.push({
            screen: c.screen,
            findings: [
              {
                rule: "layout-rule",
                metric: "rule screen has no native witness",
              },
            ],
          });
      }
    const referenceResults: ("dense" | "fallback" | "custom" | "refused")[] =
      [];
    // Only each sample's verdict and its placed boxes are kept for the rest of
    // the call; the full paint (lines, glyph advances, trees) and, for trace
    // measurements, the family are dropped as soon as they are read. Holding
    // them for every distinct shape of a day's trace exhausted the Node heap.
    // The first state of each placement (`[screen, shape, occurrences]`) is
    // placed as soon as its shape's paint is read; the paint is then dropped.
    const placementsByShape = new Map<
      string,
      { key: string; s: LeanScreenState }[]
    >();
    if (needAtlas) {
      const seen = new Set<string>();
      for (const s of states) {
        const shapeKey = shapeKeyOf(s);
        const key = placementOf(s);
        if (seen.has(key)) continue;
        seen.add(key);
        const list = placementsByShape.get(shapeKey) ?? [];
        list.push({ key, s });
        placementsByShape.set(shapeKey, list);
      }
    }
    const geometryByOccurrences = new Map<
      string,
      GeometryAtlas["states"][number]
    >();
    const paints: Verdict[] = [];
    const families: unknown[] = [];
    const galleryScreens = new Set<string>();
    const extra: { index: number; reply: LayoutReply }[] = [];
    const slots = taskSlots.getStore() ?? 1;
    const nativeFamily = !this.opts.runner || this.opts.runner === layoutRunner;
    const paintSample = async (s: LeanScreenState, i: number) => {
      const maxTargetsPerViewport = limitFor(s.screen).limit;
      const failures: typeof ruleFailures = [];
      let layouts = selections[i]?.layouts;
      let paint: LayoutReply | undefined, admission: LayoutReply | undefined;
      const referencesFor = (value: NonNullable<typeof layouts>) => [
        { screen: s.ui, layouts: value },
      ];
      const paintFamily = async (value: NonNullable<typeof layouts>) =>
        required(
          (
            await this.batch([
              {
                op: "family-paint",
                references: referencesFor(value),
                screen: s.ui,
                viewport,
                maxTargetsPerViewport,
              },
            ])
          )[0],
        );
      const checkFamily = async (value: NonNullable<typeof layouts>) =>
        required(
          (
            await this.batch([
              {
                op: "family-check",
                references: referencesFor(value),
                maxTargetsPerViewport,
              },
            ])
          )[0],
        );
      const entries = design
        .filter(ruleCase)
        .filter((c) => appliesTo(c, s.screen));
      if (entries.length) {
        if (layouts)
          failures.push({
            screen: s.screen,
            findings: [
              {
                rule: "layout-rule",
                metric:
                  "literal case and rules both select this shape; remove one",
              },
            ],
          });
        else
          try {
            const rules = entries.flatMap((c) => c.rules);
            const expanded = viewports.map((viewport) => ({
              viewport,
              tree: z.json().parse(applyLayoutRules(s.ui, viewport, rules)),
            }));
            // Native familyOutput checks admission at every supported viewport.
            // A negative paint still needs the independent family verdict to
            // distinguish a rule refusal from failure on the bound screen.
            if (nativeFamily) paint = await paintFamily(expanded);
            if (!paint?.accepted) admission = await checkFamily(expanded);
            if (admission?.error)
              throw new LayoutRuleRefusal(
                `native family refusal: ${admission.error}`,
              );
            if (!paint?.accepted && typeof admission?.accepted !== "boolean")
              throw Error("Missing rule family verdict");
            if (paint?.accepted || admission?.accepted) layouts = expanded;
            else {
              const diagnoses = await this.batch(
                viewports.map((viewport) => ({
                  op: "family-paint",
                  references: referencesFor(expanded),
                  screen: s.ui,
                  viewport,
                  maxTargetsPerViewport,
                })),
              );
              const findings = [
                ...(admission?.findings ?? []),
                ...diagnoses.flatMap((d) => d.findings ?? []),
              ].filter((f) => !f.warning);
              failures.push({
                screen: s.screen,
                findings: [
                  {
                    rule: "layout-rule",
                    metric:
                      "expanded rules refused; reference fallback retained",
                    kinds: rules.map((r) => r.kind),
                  },
                  ...new Map(
                    findings.map((f) => [stableStringify(f), f]),
                  ).values(),
                ],
              });
            }
          } catch (error) {
            if (!(error instanceof LayoutRuleRefusal)) throw error;
            failures.push({
              screen: s.screen,
              findings: [{ rule: "layout-rule", metric: error.message }],
            });
          }
      }
      if (layouts) {
        paint ??= await paintFamily(layouts);
        if (!admission && !(nativeFamily && paint.accepted))
          admission = await checkFamily(layouts);
        return {
          paint,
          references: referencesFor(layouts),
          selection: "custom" as const,
          failures,
          admission,
        };
      }
      const reference = await this.reference.get(s.ui, maxTargetsPerViewport);
      const selection = reference.dense
        ? "dense"
        : reference.paint.accepted
          ? "fallback"
          : "refused";
      return { ...reference, selection, failures } as const;
    };
    const measureSample = async (
      s: LeanScreenState,
      i: number,
    ): Promise<SampleMeasurement> => {
      const placements = placementsByShape.get(shapeKeyOf(s)) ?? [];
      // The same exact native screen can occur in several programs. Bind the
      // result to its selected layout, applicable rules, limit, and every
      // occurrence-to-control map used to place its boxes.
      const key =
        input.result && taskSlots.getStore()
          ? sha256(
              JSON.stringify([
                s.screen,
                s.ui,
                selections[i],
                design.filter((c) => ruleCase(c) && appliesTo(c, s.screen)),
                limitFor(s.screen).limit,
                placements.map((p) => p.key),
              ]),
            )
          : undefined;
      const cached = key && this.traceSamples.get(key);
      if (cached) return cached;
      const result = await paintSample(s, i);
      const paint = needAtlas ? compactPaint(result.paint) : undefined;
      const measured: SampleMeasurement = {
        verdict: verdictOf(result.paint),
        selection: result.selection,
        failures: result.failures,
        geometry: paint
          ? placements.map(({ s }) => placedGeometry(paint, s.ui, s.screen, ""))
          : [],
        ...("admission" in result && result.admission
          ? { admission: verdictOf(result.admission) }
          : {}),
        ...(!input.result ? { references: result.references } : {}),
      };
      if (key) this.traceSamples.set(key, measured);
      return measured;
    };
    // Release recursive paints and family trees after each bounded batch.
    // Fold findings in the original shape order, irrespective of finish order.
    for (let start = 0; start < samples.length; start += slots) {
      const group = samples.slice(start, start + slots);
      const results = await mapOrdered(group, slots, (sample, offset) =>
        measureSample(sample, start + offset),
      );
      for (const [offset, result] of results.entries()) {
        paints.push(result.verdict);
        const screen = required(group[offset]).screen;
        const gallery =
          !input.result &&
          this.opts.artifactsDir &&
          (!galleryScreens.has(screen) || selections[start + offset]);
        families.push(gallery ? result.references : undefined);
        galleryScreens.add(screen);
        const placements =
          placementsByShape.get(shapeKeyOf(required(group[offset]))) ?? [];
        for (const [j, geometry] of result.geometry.entries()) {
          geometryByOccurrences.set(required(placements[j]).key, geometry);
        }
        referenceResults.push(result.selection);
        ruleFailures.push(...result.failures);
        if (result.admission)
          extra.push({ index: start + offset, reply: result.admission });
      }
    }
    const failures: { screen: string; findings: unknown[] }[] = [
      ...ruleFailures,
    ];
    const rules: Record<string, number> = {};
    for (const failure of ruleFailures)
      for (const f of failure.findings) {
        const name = z.object({ rule: z.string() }).parse(f).rule;
        rules[name] = (rules[name] ?? 0) + 1;
      }
    const fail = (screen: string, reply: LayoutReply) => {
      const findings = (reply.findings ?? []).filter((f) => !f.warning);
      if (reply.error) findings.push({ rule: "layout", metric: reply.error });
      if (reply.linked === false)
        findings.push({
          rule: "G7",
          metric: "semantic source flags not linked",
        });
      if (!findings.length)
        findings.push({ rule: "layout", metric: "admission refused" });
      for (const rule of new Set(findings.map((f) => f.rule)))
        rules[rule] = (rules[rule] ?? 0) + 1;
      failures.push({ screen, findings });
    };
    const declared = new Set<string>();
    for (const c of design) {
      if (ruleCase(c)) continue;
      const shapeKey = stableStringify([c.screen, c.shape]);
      if (declared.has(shapeKey))
        fail(c.screen, { error: "duplicate custom screen shape" });
      declared.add(shapeKey);
      const sizes = new Set<string>();
      for (const layout of c.layouts) {
        const size = stableStringify(layout.viewport);
        if (sizes.has(size))
          fail(c.screen, { error: "duplicate custom viewport case" });
        sizes.add(size);
        if (
          !viewports.some(
            (v) => v.w === layout.viewport.w && v.h === layout.viewport.h,
          )
        )
          fail(c.screen, { error: "unsupported custom viewport case" });
      }
    }
    paints.forEach((p, i) => {
      if (!p.accepted || p.linked === false)
        fail(required(samples[i]).screen, p);
    });
    extra.forEach(({ reply, index }) => {
      if (!reply.accepted) fail(required(samples[index]).screen, reply);
    });
    for (const c of unknown)
      fail(c.screen, {
        error: "custom shape has no native screen witness in this coverage set",
      });
    const perScreen = Object.fromEntries(
      [...new Set(states.map((s) => s.screen))].map((id) => [id, limitFor(id)]),
    );
    const atlas: GeometryAtlas & {
      sourceDetail: string;
      traceTargets: Record<string, string>;
    } = {
      schemaVersion: 1,
      programHash: geometryProgramHash(input.program),
      componentsSha256: geometryComponentsHash(input.program),
      appSha256: `lean-layout:${await this.layoutExecutableHash()}`,
      source: "recorded-fixture",
      sourceDetail: "Lean placed boxes; no Chromium or deployed React geometry",
      viewport: { width: 1440, height: 900 },
      states: [],
      traceTargets: {},
    };
    if (!input.result && !taskSlots.getStore())
      this.inventories.set(
        this.coverageKey(input),
        JSON.stringify({
          currentLayouts: design,
          screens: samples.map((s, i) => ({
            screen: s.screen,
            shape: shapes[i],
            occurrences: occurrences(s.ui),
            denseOutline: denseOutline(s.ui, viewport),
          })),
          limits: perScreen,
        }),
      );
    const key = this.coverageKey(input);
    const alertComponents = new Map<string, string>();
    if (needAtlas)
      for (const screen of expandProgram(input.program).screens) {
        for (const component of screen.components) {
          const alert =
            typeof component.kind === "object" && "alert" in component.kind
              ? z.object({ alert: z.string() }).safeParse(component.kind.alert)
                  .data?.alert
              : undefined;
          if (alert !== undefined && !alertComponents.has(alert))
            alertComponents.set(alert, component.id);
        }
      }
    const traceKey = sha256(stableStringify(input.result?.trace ?? [])).slice(
      0,
      12,
    );
    const usage = {
      day: input.schedule?.day ?? 0,
      persona: input.program.id,
      dense: 0,
      fallback: 0,
      custom: 0,
      refused: 0,
    };
    const selectedByShape = new Map(
      samples.map((s, i) => [
        shapeKeyOf(s),
        {
          selection: referenceResults[i],
          accepted: required(paints[i]).accepted,
        },
      ]),
    );
    // Placement depends on the admitted shape and occurrence-to-control map,
    // not patient text. Share immutable boxes within this call, while keeping
    // each state's label and event aliases separate and in their original order.
    for (const s of states) {
      const sample = required(selectedByShape.get(shapeKeyOf(s)));
      if (sample.selection === "dense") usage.dense++;
      else if (sample.selection === "fallback") usage.fallback++;
      else if (sample.selection === "refused") usage.refused++;
      else usage.custom++;
      if (!needAtlas || !sample.accepted) continue;
      const geometryKey = placementOf(s);
      const template = geometryByOccurrences.get(geometryKey);
      if (!template) throw Error(`Missing Lean placement for ${s.screen}`);
      const state = {
        ...template,
        state: `${s.state}-${traceKey}`,
        components: { ...template.components },
      };
      if (s.sample) state.sample = s.sample;
      if (s.eventIndex !== undefined) {
        const target = `lean-event-${s.eventIndex}-${traceKey}`;
        const row = input.result?.trace[s.eventIndex],
          payload = row
            ? Object.entries(row.event).find(
                ([k]) => !["hotkey", "scroll"].includes(k),
              )?.[1]
            : undefined;
        if (payload && typeof payload === "object") {
          const id = Object.entries(payload).find(([k]) =>
            ["comp", "alert"].includes(k),
          )?.[1];
          if (typeof id === "string") {
            const tabIndex = Object.entries(payload).find(
              ([k]) => k === "idx",
            )?.[1];
            let box =
              state.components[
                typeof tabIndex === "number" ? `${id}#tab:${tabIndex}` : id
              ];
            if (!box) {
              const alert = alertComponents.get(id);
              if (alert !== undefined) box = state.components[alert];
            }
            if (box) {
              state.components[target] = box;
              atlas.traceTargets[String(s.eventIndex)] = target;
            }
          }
        }
      }
      atlas.states.push(state);
    }
    if (input.result) this.referenceUsage.push(usage);
    if (this.opts.artifactsDir) {
      const directory = path.join(
        this.opts.artifactsDir,
        input.program.owner,
        `v${input.program.version}`,
        sha256(key),
        input.result ? `trace-${traceKey}` : "gallery",
      );
      await mkdir(directory, { recursive: true });
      await writeJson(path.join(directory, "coverage.json"), {
        screenGate: "lean",
        browserCertified: false,
        programHash: atlas.programHash,
        layoutsSha256: sha256(stableStringify(design)),
        limits: perScreen,
        referenceGeneratorVersion,
        referenceUsage: usage,
        referenceStats: this.referenceStats,
        states: states.length,
        distinct: samples.length,
        traceReplay: Boolean(input.result),
        failures,
        rules,
      });
      // The gallery paints boxes only. Admission diagnostics remain above;
      // recursive native trees and the semantic UI duplicate the same text.
      const gallery = path.join(this.opts.artifactsDir,input.program.owner,
        `v${input.program.version}`,sha256(stableStringify([atlas.programHash,geometryComponentsHash(input.program)])),"gallery");
      const {existsSync}=await import('node:fs');
      if(!input.result&&!failures.length&&!existsSync(path.join(gallery,'coverage.json'))){
        const staging=path.join(path.dirname(gallery),`gallery-${randomUUID()}.tmp`);
        try{
        const saved = new Set<string>(),savedScreens=new Set<string>();
        for (const [i,s] of samples.entries()) {
          // The review gallery displays one before/after view per screen.
          // Retain custom shapes as well; every shape's gate evidence is kept.
          if(savedScreens.has(s.screen)&&!selections[i])continue;
          const shapeKey=sha256(stableStringify([s.screen,shapes[i]]));
          if(saved.has(shapeKey))continue;
          saved.add(shapeKey);
          savedScreens.add(s.screen);
          const [raw]=await this.batch([{op:"family-paint",references:families[i],screen:s.ui,viewport,maxTargetsPerViewport:limitFor(s.screen).limit}]);
          const paint=z.record(z.string(),z.unknown()).parse(raw);
          const tree=z.object({drawn:z.unknown()}).parse(paint['tree']);
          await writeJsonCompactAtomic(path.join(staging,`${i}.json`),{
            screen:s.screen,shape:shapes[i],ui:{},
            paint:{accepted:paint['accepted'],viewport:paint['viewport'],tree:{drawn:tree.drawn,children:[]},boxes:paint['boxes'],lineWidths:[],findings:paint['findings']},
          });
        }
        await writeJson(path.join(staging,'coverage.json'),{screenGate:'lean',browserCertified:false,reportFormatVersion:2,programHash:atlas.programHash,layoutsSha256:sha256(stableStringify(design)),failures:[]});
        // The gallery reader indexes numeric files before reading coverage.
        // Publish the whole directory together so it never sees a partial set.
        try{await rename(staging,gallery);}catch(error){
          const collision=error&&typeof error==='object'&&'code'in error&&['EEXIST','ENOTEMPTY'].includes(String(error.code));
          if(!collision||!existsSync(path.join(gallery,'coverage.json')))throw error;
        }
        }finally{await rm(staging,{recursive:true,force:true});}
      }
    }
    return { atlas, failures, rules, pages: states.length, limits: perScreen };
  }
  async check(input: ScreenCheckInput): Promise<ScreenCheckResult> {
    if (designOf(input.program) === undefined) withDesign(input.program);
    const key = this.coverageKey(input);
    let pending = this.checks.get(key);
    if (pending) return pending;
    // A provider input may also carry a simulated result. Admission exports
    // and prompt inventories must stay separate from that private trace replay.
    pending = this.checkNow({
      specVersion: input.specVersion,
      program: input.program,
      ...(input.schedule ? { schedule: input.schedule } : {}),
      ...(input.worldDir ? { worldDir: input.worldDir } : {}),
      ...(input.referenceProgram
        ? { referenceProgram: input.referenceProgram }
        : {}),
    });
    this.checks.set(key, pending);
    const result = await pending;
    if (result.status === "error") this.checks.delete(key);
    return result;
  }
  private async checkNow(input: ScreenCheckInput): Promise<ScreenCheckResult> {
    const started = performance.now(),
      base = {
        mode: this.mode,
        bundles: this.opts.bundles ?? [],
        pages: 0,
        failingFiles: [],
      };
    let result: ScreenCheckResult;
    try {
      const spec = await this.spec(input),
        [program] = await this.batch([
          { op: "program-check", spec, program: expandProgram(input.program) },
        ]);
      if (!program?.accepted)
        result = {
          ...base,
          status: "fail",
          failingScreens: input.program.screens.map((s) => s.id),
          message: JSON.stringify({ gate: "Lean program-check", ...program }),
        };
      else {
        const measured = await this.measure(input, spec, false);
        result = {
          ...base,
          pages: measured.pages,
          status: measured.failures.length ? "fail" : "pass",
          failingScreens: [...new Set(measured.failures.map((f) => f.screen))],
          message: JSON.stringify({
            gate: "Lean G1–G11; no browser certification",
            findings: measured.failures,
            limits: measured.limits,
          }),
        };
      }
    } catch (error) {
      result = {
        ...base,
        status: "error",
        failingScreens: [],
        message: errorMessage(error),
      };
    }
    if (this.opts.artifactsDir) {
      await mkdir(this.opts.artifactsDir, { recursive: true });
      await appendFile(
        path.join(this.opts.artifactsDir, "admissions.jsonl"),
        JSON.stringify({
          programHash: geometryProgramHash(input.program),
          designHash: geometryComponentsHash(input.program),
          elapsedMs: performance.now() - started,
          ...result,
        }) + "\n",
      );
    }
    return result;
  }
  geometry: GeometryProvider = async (input) => {
    if (designOf(input.program) === undefined) withDesign(input.program);
    const checked = await this.check(input);
    if (checked.status === "fail") throw new LeanLayoutRefusal(checked);
    if (checked.status === "error") throw Error(checked.message);
    const measured = await this.measure(input, await this.spec(input));
    if (measured.failures.length)
      throw new LeanLayoutRefusal({
        mode: "lean",
        status: "fail",
        pages: measured.pages,
        bundles: [],
        failingFiles: [],
        failingScreens: [...new Set(measured.failures.map((f) => f.screen))],
        message: JSON.stringify({
          gate: "Lean geometry state admission",
          findings: measured.failures,
        }),
      });
    return measured.atlas;
  };
  /** The admission inventory has no validation or future trace payload. */
  async promptDesign(program: ScreenCheckInput["program"]): Promise<string> {
    const key = this.coverageKey({ program, specVersion: program.specVersion });
    if (!this.inventories.has(key)) this.checks.delete(key);
    const checked = await this.check({
      program,
      specVersion: program.specVersion,
    });
    if (checked.status !== "pass") throw Error(checked.message);
    return required(
      this.inventories.get(
        this.coverageKey({ program, specVersion: program.specVersion }),
      ),
    );
  }
}
