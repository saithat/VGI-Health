import { dataReason } from "./data";
import { historicalReleaseEventId } from "../../scripts/historical-releases.mjs";
import { spawnSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { DRUG_NAMES, FORMULARY } from "../src/formulary";
import { loadPopulation, profilesFromBundle } from "../src/patients";
import { DayScheduleSchema, PERSONAS } from "../src/schema";
import { generateWorld } from "../src/world";
import { PRIOR_AUTH_RELEASE_DAY } from "../src/releases";
import { criticalResultObservation } from "../src/fhir";

// Worlds 1/2 froze before the additive critical-result source (b95173d7).
// Compare the complete successor schedule, adding that exact source to the
// frozen expected input; every original task, choice and resource stays checked.
function successor(value: unknown, ungatedServices = false) {
  const schedule = structuredClone(DayScheduleSchema.parse(value));
  expect(schedule).toEqual(value);
  // World 1 predates the service-order release gate in DayBuild.addTask.
  if (ungatedServices && schedule.day < PRIOR_AUTH_RELEASE_DAY) for (const task of schedule.tasks)
    task.choices.orders = task.choices.orders.filter(order => (order.kind ?? "medication") === "medication");
  const first = schedule.persona === 'P1' ? schedule.tasks.find(t => t.workflow === 'W2') : undefined;
  if (first) {
    const lab = z.object({id:z.string()}).parse(first.todayResources[0]);
    first.todayResources.splice(1,0,criticalResultObservation(lab.id.replace(/-result$/, '-critical'),first.patientId,first.day,first.startMin));
  }
  return schedule;
}

const root = resolve(__dirname, "../..");
const reason = dataReason("fixtures/synthea", "runs/world/1", "runs/world/2");
describe.skipIf(Boolean(reason))(`archived Synthea worlds${reason ? ` (${reason})` : ""}`, () => {
let population: ReturnType<typeof loadPopulation>;
let run: ReturnType<typeof generateWorld>;
beforeAll(() => {
  population = loadPopulation(join(root, "fixtures/synthea/index.json"));
  run = generateWorld(1, 10, population.patients);
});

it("keeps the regenerated seed-1 snapshot and below 20 MB", () => {
  const dir = join(root, "runs/world/2");
  const read = (file: string): unknown => JSON.parse(readFileSync(join(dir, file), "utf8"));
  const manifest = z.object({ seed: z.number(), days: z.number(), files: z.array(z.string()) }).parse(read("manifest.json"));
  expect(manifest.seed).toBe(1);
  expect(manifest.days).toBe(10);
  expect(manifest.files.reduce((bytes, file) => bytes + statSync(join(dir, file)).size, 0)).toBeLessThan(20_000_000);
  expect(read("state-day-0.json")).toEqual(run.initial);
  for (const d of run.days) {
    expect(read(`state-day-${d.state.day}.json`)).toEqual(d.state);
    for (const p of PERSONAS) {
      expect(successor(read(`day-${d.state.day}-${p}.json`))).toEqual(d.schedules[p]);
      expect(successor(read(`schedules/day-${String(d.state.day).padStart(2, "0")}/${p}.json`))).toEqual(d.schedules[p]);
    }
  }
});

it("preserves world 1 state and random draws through the explicit service-release and critical-result successors", () => {
  for (const d of run.days) {
    const legacy = JSON.parse(readFileSync(join(root, `runs/world/1/state-day-${d.state.day}.json`), "utf8"));
    legacy.context.scriptedEvents = legacy.context.scriptedEvents.map(historicalReleaseEventId);
    expect(legacy).toEqual(d.state);
    for (const p of PERSONAS) {
      const original = DayScheduleSchema.parse(JSON.parse(readFileSync(join(root, `runs/world/1/day-${d.state.day}-${p}.json`), "utf8")));
      for (const task of original.tasks) {
        DayScheduleSchema.parse({ ...original, tasks: [task] });
      }
      expect(d.schedules[p]).toEqual(successor(original, true));
    }
  }
});

describe("real Synthea population", () => {
  it("is deterministic on the full population and independent of the horizon", () => {
    expect(generateWorld(1, 10, population.patients).days).toEqual(run.days);
    expect(generateWorld(1, 4, population.patients).days).toEqual(run.days.slice(0, 4));
  });

  it("loads all 174 patients, including 50 children and 17 penicillin allergies", () => {
    expect(population.patients).toHaveLength(174);
    expect(run.pop.adults).toHaveLength(124);
    expect(run.pop.peds).toHaveLength(50);
    expect(population.patients.filter((p) => p.allergies.some((a) => a.classes.includes("penicillin")))).toHaveLength(17);
  });

  it("keeps ten-day volumes in range, including the flu week and surgical add-ons", () => {
    const census: number[] = [];
    for (const d of run.days) {
      for (const p of PERSONAS) DayScheduleSchema.parse(d.schedules[p]);
      const today = d.state.today;
      if (d.state.day !== 5) {
        expect(today.clinics.P1.seen).toBeGreaterThanOrEqual(16);
        expect(today.clinics.P1.seen).toBeLessThanOrEqual(20);
      }
      expect(today.ed.arrivals.length).toBeGreaterThanOrEqual(12);
      expect(today.ed.arrivals.length).toBeLessThanOrEqual(22);
      expect(today.clinics.P4.seen).toBeGreaterThanOrEqual(12);
      expect(today.clinics.P4.seen).toBeLessThanOrEqual(22);
      census.push(today.ward.censusAtShiftStart.length);
      if (d.state.context.p5DayType === "or") {
        expect(today.surgery.casesOperated.length).toBeGreaterThanOrEqual(2);
        expect(today.surgery.casesOperated.length).toBeLessThanOrEqual(4);
      }
    }
    // Urgent surgical admissions can use one overflow bed beyond the routine cap.
    expect(Math.max(...census)).toBeLessThanOrEqual(11);
    expect(census.reduce((a, b) => a + b, 0) / census.length).toBeGreaterThanOrEqual(6);
  });

  it("retains unsupported Synthea drugs without substituting a different ingredient", () => {
    const others = population.patients.flatMap((p) => p.otherMedDisplays);
    expect(others.some((s) => /Humulin/.test(s))).toBe(true);
    expect(others.some((s) => /Hydrocodone.*Extended Release/.test(s))).toBe(true);
    expect(others.some((s) => /Fentanyl/.test(s))).toBe(true);
    const combo = population.patients.flatMap((p) => p.homeMeds).filter((m) => m.drug === "hydrocodone-acetaminophen");
    expect(combo.length).toBeGreaterThan(0);
    expect(combo.every((m) => /acetaminophen/i.test(m.display))).toBe(true);
  });


});

it("round-trips every Synthea schedule through Lean and checks all formulary reference fields", () => {
  const schedules = run.days.flatMap((d) => PERSONAS.map((p) => d.schedules[p]));
  // One lake process for the entire contract test. Build Lean before running this suite.
  const result = spawnSync("sh", ["-c", "ulimit -v 8000000; export LEAN_NUM_THREADS=6 LEAN_STACK_SIZE_KB=65536; exec lake env lean -j6 --run ../world/test/lean/Contract.lean"], {
    cwd: join(root, "lean"), input: schedules.map((s) => JSON.stringify(s)).join("\n") + "\n",
    encoding: "utf8", maxBuffer: 20 * 1024 * 1024, timeout: 60_000,
  });
  expect(result.error).toBeUndefined();
  expect(result.status, result.stderr || result.stdout).toBe(0);
  const lines = result.stdout.trim().split("\n");
  const leanDrugs = z.array(z.object({
    name: z.string(), rxnorm: z.array(z.string()), classes: z.array(z.string()),
    highAlert: z.boolean(), minMgPerKgTenths: z.number(), maxMgPerKgTenths: z.number(),
    interactsWith: z.array(z.string()), mmeFactorTenths: z.number(), maxDoseMgTenths: z.number(),
  })).parse(JSON.parse(lines.shift() ?? "null"));
  expect(leanDrugs.map((d) => d.name).sort()).toEqual([...DRUG_NAMES].sort());
  for (const name of DRUG_NAMES) {
    const lean = leanDrugs.find((d) => d.name === name);
    const local = FORMULARY[name];
    expect(lean, name).toEqual({
      name, rxnorm: [local.rxnorm], classes: local.classes, highAlert: local.highAlert,
      minMgPerKgTenths: (local.weightRange?.min ?? 0) * 10,
      maxMgPerKgTenths: (local.weightRange?.max ?? 0) * 10,
      interactsWith: local.interactsWith, mmeFactorTenths: (local.mmeFactor ?? 0) * 10, maxDoseMgTenths: local.maxDoseMg * 10,
    });
    expect(local.schedule !== undefined).toBe(local.classes.includes("controlled-II-IV"));
    expect(local.schedule === "II").toBe(local.classes.includes("scheduleII"));
  }
  expect(lines.map((s) => JSON.parse(s))).toEqual(schedules);
});

});

it("maps combination strengths, insulin brands, extended-release oxycodone and penicillin variants", () => {
    const meds = ["Hydrocodone Bitartrate 10 MG / Acetaminophen 325 MG", "insulin glargine [Basaglar]", "insulin lispro [Admelog]", "12 HR Oxycodone Hydrochloride 10 MG Extended Release Oral Tablet"];
    const profiles = profilesFromBundle({ entry: [
      { resource: { resourceType: "Patient", id: "mapping", birthDate: "1970-01-01" } },
      ...meds.map((display, i) => ({ resource: { resourceType: "MedicationRequest", id: `m${i}`, status: "active", medicationCodeableConcept: { text: display } } })),
      ...["Penicillin V", "Penicillin G", "amoxicillin"].map((text) => ({ resource: { resourceType: "AllergyIntolerance", category: ["medication"], code: { text } } })),
    ] });
    const p = profiles[0];
    expect(p?.homeMeds.find((m) => m.drug === "hydrocodone-acetaminophen")?.dose).toBe(10);
    expect(p?.homeMeds.find((m) => m.drug === "insulin glargine")?.unit).toBe("units");
    expect(p?.homeMeds.find((m) => m.drug === "insulin lispro")?.unit).toBe("units");
    expect(p?.homeMeds.find((m) => m.drug === "oxycodone")).toMatchObject({ dose: 10, freq: "q12h", prn: false });
    expect(p?.allergies.every((a) => a.classes.includes("penicillin"))).toBe(true);
  });
