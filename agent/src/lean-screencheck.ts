import { createHash } from "node:crypto";
import { LeanLayoutRefusal } from "./lean-layout-refusal.js";
import path from "node:path";
import { mkdtemp, readFile, rm, appendFile, mkdir } from "node:fs/promises";
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
import { designOf, withDesign, type LayoutDesign } from "./layout-design.js";
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
  shellTree,
  occurrences,
} from "./lean-layout-geometry.js";
import { traceStates, type LeanScreenState } from "./lean-layout-states.js";
import { REPO_ROOT, writeJson, errorMessage } from "./util.js";
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
  return limits;
}
export interface LeanCheckerOptions {
  artifactsDir?: string;
  runner?: LayoutRunner;
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
  private readonly inventories = new Map<string, string>();
  private readonly checks = new Map<string, Promise<ScreenCheckResult>>();
  private readonly runner: LayoutRunner;
  constructor(
    private readonly ehr: EhrClient,
    private readonly opts: LeanCheckerOptions = {},
  ) {
    this.runner = opts.runner ?? layoutRunner;
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
    for (let i = 0; i < requests.length; i += 32)
      out.push(...(await this.runner(requests.slice(i, i + 32))));
    return out;
  }
  private async measure(input: Parameters<GeometryProvider>[0], spec: Spec) {
    const states = await this.states(input, spec),
      design = designOf(input.program) ?? [];
    const limits = await (this.opts.limits ?? vendorDensityLimits)(
      input.program.specVersion,
      input.program.id,
    );
    const limitFor = (screen: string) =>
      limits[screen] ?? { limit: 15, source: "Lean default (15)" };
    const unique = new Map<string, LeanScreenState>();
    for (const s of states) unique.set(stableStringify(s.ui), s);
    const observed = [...unique.values()];
    const shapeRows = await this.batch(
      observed.map((s) => ({
        // Empty-family diagnostics expose the exact native erased shape,
        // without rechecking a reference family for every value change.
        // Admission still runs independently below on every distinct shape.
        op: "family-paint",
        references: [],
        screen: s.ui,
      })),
    );
    const representatives = new Map<
      string,
      { state: LeanScreenState; shape: LayoutDesign[number]["shape"] }
    >();
    const stateShapes = new Map<string, string>();
    for (const [i, s] of observed.entries()) {
      const shape = shapeRows[i]?.uncoveredShape;
      if (!shape) throw Error(`Native semantic shape unavailable: ${s.screen}`);
      const key = stableStringify([s.screen, shape]);
      stateShapes.set(stableStringify(s.ui), key);
      if (!representatives.has(key))
        representatives.set(key, { state: s, shape });
    }
    const samples = [...representatives.values()].map((r) => r.state),
      shapes = [...representatives.values()].map((r) => r.shape);
    const selections = samples.map((s, i) =>
      design.find(
        (c) =>
          c.screen === s.screen &&
          stableStringify(c.shape) === stableStringify(shapes[i]),
      ),
    );
    const uncovered = samples
      .filter(
        (s, i) => design.some((c) => c.screen === s.screen) && !selections[i],
      )
      .map((s) => s.screen);
    const unknown = input.result
      ? []
      : design.filter(
          (c) =>
            !samples.some(
              (s, i) =>
                s.screen === c.screen &&
                stableStringify(c.shape) === stableStringify(shapes[i]),
            ),
        );
    const requests = samples.map((s, i) =>
      selections[i]
        ? {
            op: "family-paint",
            references: [{ screen: s.ui, layouts: selections[i]?.layouts }],
            screen: s.ui,
            viewport,
            maxTargetsPerViewport: limitFor(s.screen).limit,
          }
        : s.render
          ? { op: "program-paint", render: s.render, viewport }
          : { op: "structural-paint", screen: s.ui, viewport },
    );
    const paints = await this.batch(requests);
    const extra: { index: number; requests: unknown[] }[] = [];
    for (const [i, s] of samples.entries()) {
      const selected = selections[i];
      if (selected) {
        extra.push({
          index: i,
          requests: [
            {
              op: "family-check",
              references: [{ screen: s.ui, layouts: selected.layouts }],
              maxTargetsPerViewport: limitFor(s.screen).limit,
            },
          ],
        });
      } else if (limitFor(s.screen).limit < 15) {
        const all = await this.batch(
          viewports.map((v) =>
            s.render
              ? { op: "program-paint", render: s.render, viewport: v }
              : { op: "structural-paint", screen: s.ui, viewport: v },
          ),
        );
        const layouts = all.map((p, k) => ({
          viewport: viewports[k],
          tree: shellTree(paintSchema.parse(p)),
        }));
        extra.push({
          index: i,
          requests: [
            {
              op: "family-check",
              references: [{ screen: s.ui, layouts }],
              maxTargetsPerViewport: limitFor(s.screen).limit,
            },
          ],
        });
      }
    }
    const extras = await this.batch(extra.flatMap((e) => e.requests));
    const failures: { screen: string; findings: unknown[] }[] = [];
    const rules: Record<string, number> = {};
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
    extras.forEach((p, i) => {
      if (!p.accepted)
        fail(required(samples[required(extra[i]).index]).screen, p);
    });
    for (const screen of uncovered)
      fail(screen, { error: "uncovered custom screen shape" });
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
      appSha256: `lean-layout:${createHash("sha256")
        .update(
          await readFile(
            path.join(REPO_ROOT, "lean/.lake/build/bin/ui-layout"),
          ),
        )
        .digest("hex")}`,
      source: "recorded-fixture",
      sourceDetail: "Lean placed boxes; no Chromium or deployed React geometry",
      viewport: { width: 1440, height: 900 },
      states: [],
      traceTargets: {},
    };
    if (!input.result)
      this.inventories.set(
        this.coverageKey(input),
        JSON.stringify({
          currentLayouts: design,
          screens: samples.map((s, i) => ({
            screen: s.screen,
            shape: shapes[i],
            occurrences: occurrences(s.ui),
          })),
          limits: perScreen,
        }),
      );
    const key = this.coverageKey(input),
      painted = new Map(
        samples.map((s, i) => [
          required(stateShapes.get(stableStringify(s.ui))),
          { s, paint: required(paints[i]), shape: shapes[i] },
        ]),
      );
    const traceKey = sha256(stableStringify(input.result?.trace ?? [])).slice(
      0,
      12,
    );
    for (const s of states) {
      const p = required(
        painted.get(required(stateShapes.get(stableStringify(s.ui)))),
      );
      if (!p.paint.accepted) continue;
      const state = placedGeometry(
        paintSchema.parse(p.paint),
        s.ui,
        s.screen,
        `${s.state}-${traceKey}`,
      );
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
            let box = state.components[id];
            if (!box) {
              const alert = expandProgram(input.program)
                .screens.flatMap((sc) => sc.components)
                .find(
                  (c) =>
                    typeof c.kind === "object" &&
                    "alert" in c.kind &&
                    z
                      .object({ alert: z.object({ alert: z.string() }) })
                      .safeParse(c.kind).data?.alert.alert === id,
                );
              if (alert) box = state.components[alert.id];
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
        states: states.length,
        distinct: samples.length,
        traceReplay: Boolean(input.result),
        failures,
        rules,
      });
      // One representative real patient per shape; no per-event paint duplication.
      const saved = new Set<string>();
      for (const [i, s] of (input.result ? [] : samples).entries()) {
        const shapeKey = sha256(stableStringify([s.screen, shapes[i]]));
        if (saved.has(shapeKey)) continue;
        saved.add(shapeKey);
        await writeJson(path.join(directory, `${i}.json`), {
          screen: s.screen,
          shape: shapes[i],
          ui: s.ui,
          paint: paints[i],
        });
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
        const measured = await this.measure(input, spec);
        result = {
          ...base,
          pages: measured.pages,
          status: measured.failures.length ? "fail" : "pass",
          failingScreens: [...new Set(measured.failures.map((f) => f.screen))],
          message: JSON.stringify({
            gate: "Lean G1–G10; no browser certification",
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
