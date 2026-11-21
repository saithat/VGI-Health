import path from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { z } from "zod";
import { assertCertified } from "./certification.js";
import { createEhr, type EhrClient } from "./ehr.js";
import { fileHash, treeHash } from "./fingerprints.js";
import { geometryEhr } from "./geometry.js";
import { designOf } from "./layout-design.js";
import {
  LeanScreenChecker,
  type LeanCheckerOptions,
} from "./lean-screencheck.js";
import { createScreenChecker } from "./screencheck.js";
import { noAgentReference } from "./vendor-reference.js";
import {
  legacyModes,
  simulationModesSchema,
  withSimulationModes,
} from "./simulation-modes.js";
import { assertReplay } from "./hillclimb.js";
import { daySeed } from "./night.js";
import { RunStore } from "./store.js";
import { loadWorld } from "./world.js";
import {
  certificateSchema,
  programSchema,
  type Program,
  type DaySchedule,
  type TaskMetrics,
} from "./schema.js";
import { stableStringify } from "./program.js";
import {
  pad2,
  readJson,
  REPO_ROOT,
  writeFileAtomic,
  writeJson,
} from "./util.js";

const metrics = [
  "tasks",
  "completed",
  "clicks",
  "scrolls",
  "keystrokes",
  "scrollPx",
  "klmDeciSec",
] as const;
type Totals = Record<(typeof metrics)[number], number>;
const zero = (): Totals => ({
  tasks: 0,
  completed: 0,
  clicks: 0,
  scrolls: 0,
  keystrokes: 0,
  scrollPx: 0,
  klmDeciSec: 0,
});
function total(tasks: TaskMetrics[]) {
  const value = zero();
  for (const t of tasks) {
    if (typeof t.scrollPx !== "number")
      throw Error(`Missing measured scroll pixels for ${t.task}`);
    value.tasks++;
    value.completed += Number(t.completed);
    for (const key of [
      "clicks",
      "scrolls",
      "keystrokes",
      "klmDeciSec",
    ] as const)
      value[key] += t[key];
    value.scrollPx += t.scrollPx;
  }
  return value;
}
function compare(rows: { day: number; version: Totals; vendor: Totals }[]) {
  const version = zero(),
    vendor = zero(),
    delta = zero();
  for (const row of rows)
    for (const k of metrics) {
      version[k] += row.version[k];
      vendor[k] += row.vendor[k];
      delta[k] += row.version[k] - row.vendor[k];
    }
  return { days: rows.map((r) => r.day), version, vendor, delta };
}
const manifestSchema = z.object({
  status: z.enum(["completed", "completed-with-llm-errors"]),
  days: z.number().int().positive(),
  world: z.string(),
  worldSeed: z.number(),
  personas: z.array(z.string()),
  screenGate: z.string().optional(),
  simulationModes: simulationModesSchema.optional(),
  ehr: z.object({ mode: z.enum(["fake", "real"]) }),
  fhirBundles: z.array(z.string()).optional(),
  fingerprints: z
    .object({
      world: z.string(),
      ehr: z.string(),
      layoutExecutable: z.string().optional(),
    })
    .optional(),
});

export async function finalEval(
  dir: string,
  fixture?: { ehr: EhrClient; lean: LeanCheckerOptions },
) {
  const manifest = await readJson(
    path.join(dir, "manifest.json"),
    manifestSchema,
  );
  if (manifest.ehr.mode === "real" && fixture)
    throw Error(
      "Real final evaluation requires the recorded native simulation and screen gate",
    );
  const world = await loadWorld(manifest.world),
    lean = manifest.screenGate === "lean";
  if (world.manifest.seed !== manifest.worldSeed)
    throw Error("World seed differs from recording");
  const store = new RunStore(dir, path.join(dir, "custom"), lean),
    out = path.join(dir, "final-eval");
  const native = withSimulationModes(
    fixture?.ehr ?? createEhr({ fake: manifest.ehr.mode === "fake" }),
    manifest.simulationModes ?? legacyModes,
  );
  if (native.mode === "real") {
    const recorded = manifest.fingerprints;
    if (
      !recorded ||
      !native.binary ||
      (await treeHash(world.dir)) !== recorded.world ||
      (await fileHash(native.binary)) !== recorded.ehr
    )
      throw Error("Final evaluation world or simulator differs from recording");
    if (
      lean &&
      (await fileHash(
        path.join(REPO_ROOT, "lean/.lake/build/bin/ui-layout"),
      )) !== recorded.layoutExecutable
    )
      throw Error("Final evaluation layout checker differs from recording");
  }
  const scratch = await mkdtemp(path.join(tmpdir(), "final-eval-"));
  const table: string[] = [];
  try {
    for (const persona of manifest.personas) {
      const opts = {
        ...(manifest.fhirBundles ? { bundles: manifest.fhirBundles } : {}),
        ...fixture?.lean,
      };
      const checker = lean
        ? new LeanScreenChecker(native, opts)
        : createScreenChecker(native, {
            ...opts,
            referenceProgram: noAgentReference(dir),
          });
      if (!checker.geometry)
        throw Error("Final evaluation requires measured geometry");
      const ehr = geometryEhr(native, checker.geometry, scratch, lean);
      const params = world.personas.get(persona);
      if (!params) throw Error(`Missing recorded clinician ${persona}`);
      const days: DaySchedule[] = [];
      const vendors = new Map<string, Program>();
      const built = new Map([[0, 0]]);
      for (let day = 1; day <= manifest.days; day++) {
        const schedule = await world.schedule(day, persona);
        if (!schedule) throw Error(`Missing schedule for ${day}/${persona}`);
        const actual = await readJson(
          store.dayPath(day, persona),
          z.object({
            persona: z.string(),
            day: z.number(),
            programVersion: z.number(),
            tasks: z.array(z.object({ task: z.string() })),
          }),
        );
        if (
          actual.persona !== persona ||
          actual.day !== day ||
          !built.has(actual.programVersion) ||
          stableStringify(actual.tasks.map((t) => t.task).sort()) !==
            stableStringify(schedule.tasks.map((t) => t.id).sort())
        )
          throw Error("Day does not match recorded workload");
        const vendor = await readJson(
          path.join(
            dir,
            "baselines",
            `day-${pad2(day)}`,
            `${persona}.program.json`,
          ),
          programSchema,
        );
        const prior = vendors.get(vendor.specVersion);
        if (prior && stableStringify(prior) !== stableStringify(vendor))
          throw Error("Inconsistent canonical at the same spec");
        vendors.set(vendor.specVersion, vendor);
        days.push(schedule);
        if (day < manifest.days) {
          const decision = await store.readDecision(day, persona);
          if (decision.deployed) built.set(decision.versionAfter, day);
        }
      }
      const rows = [];
      table.push(
        persona,
        `version spec | all | seen | subsequent   (days; ${metrics.join(", ")}; delta vs vendor in same order)`,
      );
      const references = new Map<string, Totals[]>();
      for (const [version, builtNight] of built) {
        const program = await store.readProgram(persona, version),
          spec = program.specVersion;
        assertCertified(
          program,
          await readJson(store.certPath(persona, version), certificateSchema),
          spec,
          native.mode,
        );
        const specVersion =
          native.mode === "fake"
            ? spec
            : path.join(
                dir,
                "certifications",
                persona,
                `v${version}`,
                "spec.json",
              );
        const vendor = vendors.get(spec);
        if (!vendor)
          throw Error(`Missing recorded canonical for ${persona}/${spec}`);
        const run = async (p: Program) => {
          const measured = [];
          for (const schedule of days) {
            const result = await ehr.simulate({
              specVersion,
              program: p,
              schedule,
              persona: params,
              worldDir: world.dir,
              seed: daySeed(manifest.worldSeed, schedule.day),
              policy: "expert",
            });
            assertReplay(result, schedule, p);
            measured.push(total(result.tasks));
          }
          return measured;
        };
        let reference = references.get(spec);
        if (!reference) {
          if (
            (await ehr.check({
              program: vendor,
              prev: vendor,
              canonical: vendor,
              specVersion,
            })) !== "ok"
          )
            throw Error("Uncertified canonical");
          reference = await run(vendor);
          references.set(spec, reference);
        }
        const values =
          stableStringify(program) === stableStringify(vendor) &&
          !designOf(program)?.length
            ? reference
            : await run(program);
        const perDay = days.map((s, i) => {
          const value = values[i],
            vendor = reference[i];
          if (!value || !vendor) throw Error("Incomplete version comparison");
          return {
            day: s.day,
            seed: daySeed(manifest.worldSeed, s.day),
            version: value,
            vendor,
          };
        });
        const all = compare(perDay),
          seen = compare(perDay.filter((d) => d.day <= builtNight)),
          subsequent = compare(perDay.filter((d) => d.day > builtNight));
        rows.push({ version, spec, builtNight, all, seen, subsequent, perDay });
        const cell = (group: typeof all) =>
          `[${group.days.join(",")}] ${metrics.map((k) => group.version[k]).join("/")} Δ ${metrics.map((k) => group.delta[k]).join("/")}`;
        if (!rows.slice(0, -1).some((row) => row.spec === spec)) {
          const ref = compare(perDay.map((d) => ({ ...d, version: d.vendor })));
          table.push(`vendor ${spec} | ${cell(ref)} | — | —`);
        }
        table.push(
          `v${version} ${spec} | ${cell(all)} | ${cell(seen)} | ${cell(subsequent)}`,
        );
      }
      await writeJson(path.join(out, `${persona}.json`), {
        persona,
        metrics,
        delta: "version minus same-spec canonical",
        versions: rows,
      });
      table.push("");
    }
    await writeFileAtomic(
      path.join(out, "final-eval.txt"),
      table.join("\n") + "\n",
    );
    return table.join("\n");
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const { values } = parseArgs({ options: { run: { type: "string" } } });
  if (!values.run) throw Error("Usage: pnpm final-eval --run <id>");
  console.log(await finalEval(path.resolve(REPO_ROOT, "runs", values.run)));
}
