// Benchmark a historical workstation against today's measurement implementation.
// All generated state (including the geometry store) belongs to a fresh scratch directory.
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { z } from "zod";
import { ClimbHost, climbingGate, climbWorkspace } from "./hillclimb.js";
import { createEhr } from "./ehr.js";
import { geometryEhr } from "./geometry.js";
import { LeanScreenChecker } from "./lean-screencheck.js";
import { recordingEhr } from "./recording-ehr.js";
import { RunStore } from "./store.js";
import { loadWorld } from "./world.js";
import { loadRelease, releaseForPersona } from "./releases.js";
import { daySeed } from "./night.js";
import { sha256 } from "./program.js";
import {
  simulationModesSchema,
  withSimulationModes,
} from "./simulation-modes.js";
import {
  dayResultSchema,
  type JsonPatchOp,
  type Program,
  type UserMemory,
} from "./schema.js";
import { REPO_ROOT, readJson } from "./util.js";

async function benchmark(night: number, id: string, identityOnly = false) {
  const dir = path.join(REPO_ROOT, "runs/lean-10day");
  const scratch = await mkdtemp(path.join(tmpdir(), "bench-hillclimb-"));
  console.log(JSON.stringify({ persona: id, night, scratch }));
  const sourceStore = new RunStore(dir, path.join(scratch, "custom"), true);
  const store = new RunStore(scratch);
  const manifest = await readJson(
    path.join(dir, "manifest.json"),
    z.object({
      scoring: z.object({ incompletePenalty: z.number() }),
      world: z.string(),
      worldSeed: z.number(),
      simulationModes: simulationModesSchema,
    }),
  );
  const world = await loadWorld(
    path.join(REPO_ROOT, "runs/world", path.basename(manifest.world)),
  );
  if (world.manifest.seed !== manifest.worldSeed)
    throw Error("World seed mismatch");
  const native = withSimulationModes(
    createEhr({ fake: false }),
    manifest.simulationModes,
  );
  const params = world.personas.get(id);
  if (!params) throw Error("Missing persona");
  const persona = { id, userId: world.userId(id), params };
  const past = [],
    versions = new Map<number, Program>();
  let memory: UserMemory = { actor: persona.userId, entries: [] };
  const declaredWorkload = [];
  for (let day = 1; day <= world.manifest.days; day++) {
    const schedule = await world.schedule(day, id);
    if (!schedule) throw Error("Missing schedule");
    declaredWorkload.push(...schedule.tasks);
    if (day > night) continue;
    const result = await readJson(
      sourceStore.dayPath(day, id),
      dayResultSchema,
    );
    const program =
      versions.get(result.programVersion) ??
      (await sourceStore.readProgram(id, result.programVersion));
    versions.set(program.version, program);
    past.push({ schedule, result });
    const bounded = await native.simulate({
      program,
      specVersion: program.specVersion,
      policy: "bounded",
      memory,
      persona: params,
      schedule,
      worldDir: world.dir,
      seed: daySeed(world.manifest.seed, day),
    });
    if (!bounded.memory || bounded.memory.actor !== persona.userId)
      throw Error("Invalid historical memory");
    memory = bounded.memory;
  }
  const current = versions.get(past.at(-1)?.result.programVersion ?? -1);
  if (!current) throw Error("No deployed program");
  const release = await releaseForPersona(
    await loadRelease(current.specVersion, native),
    id,
  );
  const input = { night, persona, current, release, declaredWorkload };
  for (const [name, content] of Object.entries(
    climbWorkspace(input, past, versions),
  )) {
    const file = path.join(scratch, "workspace", name);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content);
  }
  let timings: Record<string, number> = {};
  async function time<T>(phase: string, work: () => Promise<T>) {
    const start = performance.now();
    try {
      return await work();
    } finally {
      timings[phase] = (timings[phase] ?? 0) + performance.now() - start;
    }
  }
  const journal = recordingEhr(native, path.join(scratch, "ehr", id), id);
  const profiled = {
    ...journal,
    renderScreens: (i: Parameters<typeof journal.renderScreens>[0]) =>
      time("export", () => journal.renderScreens(i)),
    check: (i: Parameters<typeof journal.check>[0]) =>
      time("leanCheck", () => journal.check(i)),
    simulate: (i: Parameters<typeof journal.simulate>[0]) =>
      time(i.policy ?? "expert", () => journal.simulate(i)),
  };
  const screens = new LeanScreenChecker(profiled, {
    artifactsDir: path.join(scratch, "screens"),
    layoutTiming: (ms) => {
      timings["layoutNative"] = (timings["layoutNative"] ?? 0) + ms;
    },
  });
  const ehr = geometryEhr(
    profiled,
    (i) => time("geometry", () => screens.geometry(i)),
    scratch,
    true,
  );
  const gate = climbingGate(
    {
      store,
      ehr: {
        ...ehr,
        simulate: (i) => time("replayIncludingAtlas", () => ehr.simulate(i)),
      },
      screens: {
        mode: "lean",
        check: (i) => time("screenGate", () => screens.check(i)),
      },
      worldDir: world.dir,
      worldSeed: world.manifest.seed,
      incompletePenalty: manifest.scoring.incompletePenalty,
    },
    input,
    past,
    memory,
    Infinity,
  );
  const host = new ClimbHost(gate.measure, Infinity, async () => {});
  const reorder: JsonPatchOp[] = [
    {
      op: "move",
      from: "/screens/0/components/7",
      path: "/screens/0/components/6",
    },
  ];
  for (const [label, patch] of [
    ["identity", []],
    ["reorder", reorder],
    ["repeat", reorder],
  ] as const) {
    if (identityOnly && label !== "identity") break;
    timings = {};
    const start = performance.now();
    const { output: report } = await host.execute({
      command: "measure",
      argv: ["patch.json"],
      file: { name: "patch.json", text: JSON.stringify(patch) },
    });
    const ms = performance.now() - start;
    if (timings["replayIncludingAtlas"] !== undefined)
      timings["atlasStorageAndAttachment"] =
        timings["replayIncludingAtlas"] -
        (timings["expert"] ?? 0) -
        (timings["bounded"] ?? 0) -
        (timings["geometry"] ?? 0);
    const json = JSON.stringify(report);
    await writeFile(path.join(scratch, label + ".json"), json);
    console.log(
      JSON.stringify({
        persona: id,
        night,
        label,
        ms,
        timings,
        processPeakKiB: process.resourceUsage().maxRSS,
        referenceStats: screens.referenceStats,
        digest: sha256(json),
        reason: z.object({ reason: z.string() }).parse(report).reason,
      }),
    );
  }
}

const [nightArg = "9", mode] = process.argv.slice(2);
const night = Number(nightArg);
if (
  ![1, 9].includes(night) ||
  (mode !== undefined && mode !== "--capacity") ||
  process.argv.length > 4
)
  throw Error("Usage: bench-hillclimb.ts 1|9 [--capacity]");
if (mode === "--capacity") {
  await Promise.all(
    ["P1", "P2", "P3", "P4", "P5"].map((id) => benchmark(night, id, true)),
  );
} else {
  await benchmark(night, "P1");
}
