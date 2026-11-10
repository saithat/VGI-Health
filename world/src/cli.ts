/**
 * pnpm --filter world gen --seed 1 --days 10 [--fixtures <index.json>] [--out <dir>]
 *
 * Optional: --policy bounded --hidden-preferences (default remains expert).
 * --case-mix synthetic-hospital|legacy and --note-text synthetic-hospital|legacy
 * (defaults synthetic-hospital: setting case mix and note section text from
 * Synthetic Hospital, labeled synthetic-benchmark; legacy keeps local draws and
 * fixed phrases). --note-authoring template|full defaults to template (N18,
 * 2018 origin shares; scenario section/operator model). --note-typed-share N
 * overrides effort with a uniform scenario share, preserving full text.
 * Defaults to runs/world/2 (world revision, independent of seed); writes
 * state-day-<d>.json, day-<d>-<persona>.json
 * (DaySchedule, validated against src/schema.ts) and manifest.json.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SIM_START_DATE, withCalendar } from "./calendar";
import { loadPopulation } from "./patients";
import { personaParams } from "./personas";
import { DayScheduleSchema, PERSONAS } from "./schema";
import { dayFacts, dayTable } from "./summary";
import { withInformationData } from "./information-needs";
import { withTiming, mergeTimedDays } from "./timing/arrivals";
import { generateWorld } from "./world";
import { CASE_MIX_MODES, SYNTHETIC_HOSPITAL_MIX } from "./case-mix";
import { NOTE_TEXT_MODES, NOTE_AUTHORING_MODES, NOTE_AUTHORING_PROFILE, NoteTexts, loadSectionDonors, withNoteTexts } from "./notes";
import { nativeAdt, simulateAdt } from "./adt";

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

async function main(): Promise<void> {
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
  const clockMode = arg(args, "clock-mode") ?? "continuous";
  if (!["continuous", "legacy"].includes(clockMode)) throw new Error("--clock-mode must be continuous or legacy");
  const worldClock = arg(args, "world-clock") ?? "continuous";
  if (worldClock !== "continuous" && worldClock !== "legacy") throw new Error("--world-clock must be continuous or legacy");
  const caseMix = CASE_MIX_MODES.find((m) => m === (arg(args, "case-mix") ?? "synthetic-hospital"));
  if (caseMix === undefined) throw new Error("--case-mix must be synthetic-hospital or legacy");
  const noteText = NOTE_TEXT_MODES.find((m) => m === (arg(args, "note-text") ?? "synthetic-hospital"));
  if (noteText === undefined) throw new Error("--note-text must be synthetic-hospital or legacy");
  const sectionsPath = join(root, "fixtures", "synthetic-hospital-sections.json");
  if (noteText === "synthetic-hospital" && !existsSync(sectionsPath))
    throw new Error(`${relative(root, sectionsPath)} missing: run make synthetic-hospital, or pass --note-text legacy`);
  const notes = noteText === "synthetic-hospital" ? new NoteTexts(loadSectionDonors(sectionsPath)) : undefined;
  const typedShare = arg(args, "note-typed-share") === undefined ? undefined : intArg(args, "note-typed-share", 1000);
  if (typedShare !== undefined && typedShare > 1000) throw new Error("--note-typed-share must be 0..1000 (per mille)");
  const noteAuthoring = NOTE_AUTHORING_MODES.find(m => m === (arg(args, "note-authoring") ?? "template"));
  if (noteAuthoring === undefined) throw new Error("--note-authoring must be template or full");
  const pop = loadPopulation(fixtures);
  const workflows = arg(args, "workflows") ?? "realistic";
  if (workflows !== "realistic" && workflows !== "legacy") throw new Error("--workflows must be realistic or legacy");
  const run = generateWorld(seed, days, pop.patients, undefined, { caseMix, worldClock, workflows });
  const adt = arg(args, "adt") ?? "realistic";
  if (!["off", "realistic"].includes(adt)) throw new Error("--adt must be off or realistic");

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
  if (adt === "realistic") {
    const native = nativeAdt(process.env.EHR_BIN ?? join(root, "lean/.lake/build/bin/ehr"));
    try { write("adt.json", await simulateAdt(run, native.apply)); }
    finally { native.close(); }
    files.push("adt.json");
  } else rmSync(join(outDir, "adt.json"), {force:true});
  for (const p of PERSONAS) {
    const name = `personas/${p}.json`;
    write(name, personaParams(p, seed, policy, args.includes("--hidden-preferences")));
    files.push(name);
  }
  write("state-day-0.json", run.initial);
  files.push("state-day-0.json");
  const timedDays: Record<string, ReturnType<typeof withTiming>[]> = {};
  for (const d of run.days) {
    write(`state-day-${d.state.day}.json`, d.state);
    files.push(`state-day-${d.state.day}.json`);
    // Diagnosis keys for donor matching: ED scenarios and clinic/pediatric visit kinds.
    const scenarios = new Map([...d.state.today.ed.arrivals.map((a) => [a.taskId, a.scenario] as const), ...Object.entries(d.visitKinds)]);
    for (const p of PERSONAS) {
      const base = notes === undefined ? d.schedules[p] : withNoteTexts(d.schedules[p], notes, (id) => run.pop.byId.get(id), (id) => scenarios.get(id), typedShare, noteAuthoring);
      const schedule = clockMode === "legacy" ? {...base, clockMode: "legacy" as const}
        : withTiming(base, d.state);
      const parsed = DayScheduleSchema.safeParse(informationNeeds === "v1" ? {...schedule, tasks: schedule.tasks.map(t => withCalendar(worldClock, () => withInformationData(t)))} : schedule);
      if (!parsed.success) throw new Error(`day ${d.state.day} ${p}: schedule fails the schema: ${parsed.error.message}`);
      (timedDays[p] ??= []).push(parsed.data);
      const name = `day-${d.state.day}-${p}.json`;
      write(name, parsed.data);
      files.push(name);
      const agentName = `schedules/day-${String(d.state.day).padStart(2, "0")}/${p}.json`;
      write(agentName, parsed.data);
      files.push(agentName);
    }
  }
  if (worldClock === "continuous" && clockMode === "continuous" && run.days.length) {
    for (const p of PERSONAS) {
      const name = `horizon-${p}.json`;
      write(name, DayScheduleSchema.parse(mergeTimedDays(timedDays[p] ?? [], run.days.map(d => d.state.date))));
      files.push(name);
    }
  }
  write("manifest.json", {
    generator: GENERATOR,
    worldClock,
    workloadProtocol: clockMode === "legacy" ? "task-local-legacy" : "continuous-workload-v1",
    ...(adt === "realistic" ? {adtProtocol: "adt-realism-v1"} : {}),
    ...(informationNeeds === "v1" ? {informationProtocol: "information-needs-v1"} : {}),
    // Synthetic-benchmark inputs (Synthetic Hospital); absent keys mean legacy local draws.
    ...(caseMix === "synthetic-hospital" ? {caseMix, caseMixSource: SYNTHETIC_HOSPITAL_MIX.source} : {}),
    ...(noteText === "synthetic-hospital" ? {noteText, noteTextSource: relative(root, sectionsPath),
      ...(typedShare !== undefined ? {noteTypedSharePerMille: typedShare, noteAuthoring: "scenario-uniform-share"}
        : {noteAuthoring, ...(noteAuthoring === "template" ? {noteAuthoringProfile: NOTE_AUTHORING_PROFILE} : {})})} : {}),
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

void main().catch(error => { console.error(error); process.exitCode = 1; });
