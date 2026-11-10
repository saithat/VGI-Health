import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { MIX_MIN_MATCHED, MIX_PSEUDO_COUNT, SYNTHETIC_HOSPITAL_MIX, datasetCount, drawImagingPriority, imagingPriorityWeights, mixWeights, settingQualifies } from "../src/case-mix";
import { NOTE_SECTION_TYPES, NOTE_AUTHORING_PROFILE, authorSection, NoteTexts, type SectionDonor, typedPortion, withNoteTexts } from "../src/notes";
import { loadPopulation } from "../src/patients";
import { DayScheduleSchema, PERSONAS, type Task } from "../src/schema";
import { generateWorld } from "../src/world";
import { FIXTURE_INDEX } from "./helpers";

describe("Synthetic Hospital case mix (synthetic-benchmark)", () => {
  it("records the pinned source and totals", () => {
    expect(SYNTHETIC_HOSPITAL_MIX.label).toBe("synthetic-benchmark");
    expect(SYNTHETIC_HOSPITAL_MIX.source.commit).toBe("911f34c4ac65a508543c4b3b90c373a0cd16534d");
    expect(SYNTHETIC_HOSPITAL_MIX.totals).toMatchObject({ patients: 1268, encounters: 5602, sections: 59964, imagingOrders: 1865 });
    expect(SYNTHETIC_HOSPITAL_MIX.imagingPriority.overall).toEqual({ stat: 676, routine: 650, urgent: 539 });
  });

  it("keeps legacy weights in legacy mode and replaces them otherwise, preserving ineligibility", () => {
    const entries = [["chest-pain", 12], ["hyperglycemia", 0]] as const;
    expect(mixWeights("legacy", "edAdult", entries, (k) => k)).toEqual(entries);
    expect(mixWeights("synthetic-hospital", "edAdult", entries, (k) => k, () => 2)).toEqual([
      ["chest-pain", (datasetCount("edAdult", "chest-pain") + MIX_PSEUDO_COUNT) * 2], ["hyperglycemia", 0]]);
    expect(() => datasetCount("edAdult", "not-a-scenario")).toThrow();
  });

  it("uses dataset weights only where at least 30 encounters match", () => {
    expect(MIX_MIN_MATCHED).toBe(30);
    const settings = ["edAdult", "edPeds", "edSurgicalConsult", "clinicChronic", "clinicAcute", "pedsSick", "wardAdmission"] as const;
    expect([...settings].sort()).toEqual(Object.keys(SYNTHETIC_HOSPITAL_MIX.settings).sort());
    const qualifying = settings.filter((s) => settingQualifies(s));
    expect(qualifying.sort()).toEqual(["clinicChronic", "edAdult"]);
    const peds = [["peds-asthma", 3]] as const;
    expect(mixWeights("synthetic-hospital", "edPeds", peds, (k) => k)).toEqual(peds);
  });

  it("draws outpatient imaging priority deterministically and mostly routine", () => {
    const draws = Array.from({ length: 4000 }, (_, i) => drawImagingPriority("outpatient", `k${i}`));
    expect(drawImagingPriority("outpatient", "k1")).toBe(draws[1]);
    expect(draws.filter((d) => d === "routine").length / draws.length).toBeGreaterThan(0.65);
  });

  it("orders ED imaging mostly stat and outpatient imaging mostly routine", () => {
    const ed = Object.fromEntries(imagingPriorityWeights("ed"));
    const outpatient = Object.fromEntries(imagingPriorityWeights("outpatient"));
    expect(ed.stat).toBeGreaterThan(ed.urgent ?? 0);
    expect(outpatient.routine).toBeGreaterThan(outpatient.urgent ?? 0);
  });

  it("is deterministic, schema-valid and differs from the legacy mix", () => {
    const patients = loadPopulation(FIXTURE_INDEX).patients;
    const a = generateWorld(1, 4, patients, undefined, { caseMix: "synthetic-hospital" });
    const b = generateWorld(1, 4, loadPopulation(FIXTURE_INDEX).patients, undefined, { caseMix: "synthetic-hospital" });
    const legacy = generateWorld(1, 4, patients);
    expect(a.days).toEqual(b.days);
    for (const d of a.days) for (const p of PERSONAS) DayScheduleSchema.parse(d.schedules[p]);
    const scenarios = (r: typeof a) => r.days.flatMap((d) => d.state.today.ed.arrivals.map((x) => x.scenario));
    expect(scenarios(a)).not.toEqual(scenarios(legacy));
    const imaging = a.days.flatMap((d) => PERSONAS.flatMap((p) => d.schedules[p].tasks.flatMap((t) => t.choices.orders.filter((o) => o.kind === "imaging"))));
    expect(imaging.every((o) => o.priority !== undefined)).toBe(true);
    const legacyImaging = legacy.days.flatMap((d) => PERSONAS.flatMap((p) => d.schedules[p].tasks.flatMap((t) => t.choices.orders.filter((o) => o.kind === "imaging"))));
    expect(legacyImaging.every((o) => o.priority === undefined)).toBe(true);
    expect(Object.keys(a.days[0]?.visitKinds ?? {}).length).toBeGreaterThan(0);
  });
});

describe("note section text", () => {
  const donor = (encounter: number, setting: SectionDonor["setting"], age: number, scenarios: string[] = []): SectionDonor => ({
    encounter, patient: encounter, setting, sex: "F", age, scenarios,
    sections: [{ type: "hpi", order: 1, text: `HPI ${encounter}` }, { type: "assessment", order: 2, text: `A ${encounter}` }, { type: "plan", order: 3, text: `P ${encounter}` }],
  });
  const notes = new NoteTexts([donor(1, "ed", 30), donor(2, "ed", 70, ["chest-pain"]), donor(3, "outpatient", 30)]);
  const task = (persona: Task["persona"], noteSections: string[]): Task => ({
    id: `d01-${persona}-x`, day: 1, persona, workflow: persona === "P2" ? "W3" : "W1", patientId: "p", startMin: 0,
    choices: { orders: [], administer: [], ackResult: false, immunizations: [], noteSections }, todayResources: [], interruptions: 0,
  });

  it("types mapped sections from one setting-matched donor and leaves unmapped sections to Lean", () => {
    const texts = notes.texts(task("P2", ["hpi", "assessmentPlan", "careGaps"]), undefined, "chest-pain");
    expect(texts).toEqual([{ id: "hpi", text: "HPI 2" }, { id: "assessmentPlan", text: "A 2\nP 2" }]);
    expect(NOTE_SECTION_TYPES.careGaps).toBeUndefined();
    expect(notes.texts(task("P1", ["hpi"]), undefined, undefined)).toEqual([{ id: "hpi", text: "HPI 3" }]);
  });

  const root = resolve(__dirname, "../..");
  const noLean = spawnSync("lean", ["--version"], { encoding: "utf8" }).error !== undefined || !existsSync(join(root, "lean/.lake/build/lib/lean/Ehr.olean"));
  it.skipIf(noLean)("round-trips supplied note text through the Lean decoder and encoder", () => {
    const patients = loadPopulation(FIXTURE_INDEX).patients;
    const world = generateWorld(1, 1, patients, undefined, { caseMix: "synthetic-hospital" });
    const donors = new NoteTexts([donor(1, "ed", 30), donor(2, "inpatient", 70), donor(3, "outpatient", 30), donor(4, "outpatient", 8)]);
    const schedules = PERSONAS.map((p) => withNoteTexts(world.days[0]?.schedules[p] ?? { day: 1, persona: p, load: "normal", tasks: [] }, donors, (id) => world.pop.byId.get(id), () => undefined));
    expect(schedules.some((s) => s.tasks.some((t) => (t.choices.noteTexts?.length ?? 0) > 0))).toBe(true);
    const result = spawnSync("sh", ["-c", "if [ -n \"$VGI_LEAN_SLOT\" ]; then \"$VGI_LEAN_SLOT\" acquire w3follow >&2; trap '\"$VGI_LEAN_SLOT\" release w3follow' EXIT; fi; ulimit -v 8000000; export LEAN_NUM_THREADS=4 LEAN_STACK_SIZE_KB=65536; lake env lean -j4 --run ../world/test/lean/Contract.lean"], {
      cwd: join(root, "lean"), input: schedules.map((s) => JSON.stringify(s)).join("\n") + "\n", encoding: "utf8", maxBuffer: 20 * 1024 * 1024, timeout: 60_000,
    });
    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(result.stdout.trim().split("\n").slice(1).map((s): unknown => JSON.parse(s))).toEqual(schedules);
  });

  it("matches clinic donors on the recorded visit kind", () => {
    const clinic = new NoteTexts([donor(5, "outpatient", 30), donor(6, "outpatient", 30, ["htn"])]);
    expect(clinic.texts(task("P1", ["hpi"]), undefined, "htn")).toEqual([{ id: "hpi", text: "HPI 6" }]);
  });

  it("types only the declared share of each section when the discount is on", () => {
    expect(typedPortion("abcdefghij", 1000)).toBe("abcdefghij");
    expect(typedPortion("abcdefghij", 300)).toBe("abc");
    expect(() => typedPortion("x", 1001)).toThrow();
  });

  it("uses three section origins with full text and explicit selection/edit effort", () => {
    expect(NOTE_AUTHORING_PROFILE).toMatchObject({sourceId:"N18",dataYear:2018,label:"calibrated"});
    const text = "x".repeat(2000);
    const sections = Array.from({length:10000}, (_,i) => authorSection(`t${i}`, {id:"hpi",text}));
    for (const origin of ["template", "copied", "freeText"]) {
      const rows = sections.filter(s => s.authoring.origin === origin);
      expect(rows.length).toBeGreaterThan(1000);
      expect(rows.every(s => s.text === text)).toBe(true);
      expect(rows[0]?.authoring).toMatchObject(origin === "template" ? {typedCharacters:0,selections:2}
        : origin === "copied" ? {typedCharacters:100,selections:1} : {typedCharacters:2000,selections:0});
    }
    expect(sections.filter(s => s.authoring.origin === "freeText").length / sections.length).toBeCloseTo(0.294,1);
    expect(authorSection("x",{id:"hpi",text},294)).toMatchObject({text,authoring:{typedCharacters:588,selections:0}});
    expect(() => authorSection("x",{id:"hpi",text},1001)).toThrow();
  });

  it("adds text without changing anything else in the schedule", () => {
    const schedule = { day: 1, persona: "P2" as const, load: "normal" as const, tasks: [task("P2", ["hpi"]), task("P2", ["careGaps"])] };
    const out = withNoteTexts(schedule, notes, () => undefined, () => undefined);
    expect(DayScheduleSchema.parse(out)).toEqual(out);
    expect(out.tasks[0]?.choices.noteTexts?.[0]?.id).toBe("hpi");
    expect(out.tasks[1]).toEqual(schedule.tasks[1]);
  });
});
