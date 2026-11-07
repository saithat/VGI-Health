/**
 * pnpm --filter world gen --seed 1 --days 10 [--fixtures <index.json>] [--out <dir>]
 *
 * Optional: --policy bounded --hidden-preferences (default remains expert).
 * Defaults to runs/world/2 (world revision, independent of seed); writes
 * state-day-<d>.json, day-<d>-<persona>.json
 * (DaySchedule, validated against src/schema.ts) and manifest.json.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SIM_START_DATE } from "./calendar";
import { loadPopulation } from "./patients";
import { personaParams } from "./personas";
import { DayScheduleSchema, PERSONAS } from "./schema";
import { dayFacts, dayTable } from "./summary";
import { withInformationData } from "./information-needs";
import { generateWorld } from "./world";

export const GENERATOR = "world@0.1.0";

function repoRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    dir = dirname(dir);
  }
  return process.cwd();
}

/** The Synthea fixtures if the infra lane has produced them, else the hand-written test fixtures. */
export function defaultFixtures(root: string): string {
  const synthea = join(root, "fixtures", "synthea", "index.json");
  return existsSync(synthea) ? synthea : join(root, "world", "test", "fixtures", "index.json");
}

function arg(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  if (i >= 0) return args[i + 1];
  const eq = args.find((a) => a.startsWith(`--${name}=`));
  return eq?.slice(name.length + 3);
}

function intArg(args: string[], name: string, dflt: number): number {
  const v = arg(args, name);
  if (v === undefined) return dflt;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0) throw new Error(`--${name} must be a non-negative integer, got ${v}`);
  return n;
}

function main(): void {
  const args = process.argv.slice(2).filter((a) => a !== "--");
  const root = repoRoot();
  const seed = intArg(args, "seed", 1);
  const days = intArg(args, "days", 10);
  const policy = arg(args, "policy") ?? "expert";
  if (policy !== "expert" && policy !== "bounded") throw new Error("--policy must be expert or bounded");
  const fixtures = resolve(arg(args, "fixtures") ?? defaultFixtures(root));
  const outDir = resolve(arg(args, "out") ?? join(root, "runs", "world", "2"));

  const informationNeeds = arg(args, "information-needs") ?? "off";
  if (!["off", "v1"].includes(informationNeeds)) throw new Error("--information-needs must be off or v1");
  const pop = loadPopulation(fixtures);
  const run = generateWorld(seed, days, pop.patients);

  mkdirSync(outDir, { recursive: true });
  for (const f of readdirSync(outDir)) if (/^(state-day-\d+|day-\d+-P\d)\.json$/.test(f)) rmSync(join(outDir, f));
  for (const dir of ["schedules", "personas"]) rmSync(join(outDir, dir), { recursive: true, force: true });
  const write = (name: string, data: unknown) => {
    mkdirSync(dirname(join(outDir, name)), { recursive: true });
    writeFileSync(join(outDir, name), `${JSON.stringify(data, null, 2)}\n`);
  };

  const files: string[] = [];
  write("world.json", { seed, days, personas: PERSONAS });
  files.push("world.json");
  for (const p of PERSONAS) {
    const name = `personas/${p}.json`;
    write(name, personaParams(p, seed, policy, args.includes("--hidden-preferences")));
    files.push(name);
  }
  write("state-day-0.json", run.initial);
  files.push("state-day-0.json");
  for (const d of run.days) {
    write(`state-day-${d.state.day}.json`, d.state);
    files.push(`state-day-${d.state.day}.json`);
    for (const p of PERSONAS) {
      const parsed = DayScheduleSchema.safeParse(informationNeeds === "v1" ? {...d.schedules[p], tasks: d.schedules[p].tasks.map(withInformationData)} : d.schedules[p]);
      if (!parsed.success) throw new Error(`day ${d.state.day} ${p}: schedule fails the schema: ${parsed.error.message}`);
      const name = `day-${d.state.day}-${p}.json`;
      write(name, informationNeeds === "v1" ? parsed.data : d.schedules[p]);
      files.push(name);
      const agentName = `schedules/day-${String(d.state.day).padStart(2, "0")}/${p}.json`;
      write(agentName, informationNeeds === "v1" ? parsed.data : d.schedules[p]);
      files.push(agentName);
    }
  }
  write("manifest.json", {
    generator: GENERATOR,
    ...(informationNeeds === "v1" ? {informationProtocol: "information-needs-v1"} : {}),
    seed,
    days,
    startDate: SIM_START_DATE,
    fixtures: {
      index: relative(root, fixtures),
      source: pop.source,
      patients: run.pop.all.length,
      adults: run.pop.adults.length,
      pediatric: run.pop.peds.length,
      worldAssignedHomeMeds: run.pop.all.filter((p) => p.homeMeds.some((m) => m.origin === "world")).map((p) => p.id),
    },
    perDay: run.days.map((d) => ({ day: d.state.day, date: d.state.date, weekday: d.state.context.weekday, events: d.state.context.scriptedEvents, loads: d.state.context.personaLoad, taskCounts: d.state.today.taskCounts })),
    files: [...files, "manifest.json"],
  });

  // Presentation context has an independent deterministic stream and never changes tasks/state.
  execFileSync(process.execPath, [join(root, "world/realism/generate.mjs"), "--world", outDir,
    "--fixtures", fixtures, "--clinical", outDir === join(root, "runs/world/2")
      ? join(root, "fixtures/clinical") : join(outDir, "clinical")], { stdio: "inherit" });

  console.log(`world: seed ${seed}, ${days} days, ${run.pop.all.length} patients from ${relative(root, fixtures)}`);
  console.log(`wrote ${files.length + 1} files to ${relative(root, outDir) || outDir}`);
  const first = run.days[0];
  if (first !== undefined) {
    console.log("\nDay 1 tasks per persona and workflow:");
    console.log(dayTable(first));
    console.log("");
    console.log(dayFacts(first));
  }
  if (!args.includes("--quiet")) {
    console.log("\nAll days (tasks per persona):");
    for (const d of run.days) {
      const counts = PERSONAS.map((p) => `${p} ${String(d.schedules[p].tasks.length).padStart(3)} ${d.schedules[p].load.padEnd(6)}`).join(" | ");
      console.log(`  day ${String(d.state.day).padStart(2)} ${d.state.context.weekday}: ${counts}`);
    }
  }
}

main();
