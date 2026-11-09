import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DayBuild } from "../src/build";
import { runWard } from "../src/flows/ward";
import { doseAttempts } from "../src/medication/outcomes";
import { Rng } from "../src/rng";
import { AdministrationDecisionSchema, OrderChoiceSchema, type AdministrationDecision, type OrderChoice } from "../src/schema";
import type { Inpatient } from "../src/state";
import { allTasks, run } from "./helpers";

const oral: OrderChoice = { drug: "atorvastatin", doseTenths: 200, unit: "mg", route: "PO", freq: "daily", prn: false };
const patient: Inpatient = { patientId: "p", admissionId: "a", service: "medicine", admitDay: 0, admitClock: 500,
  source: "initial", diagnosis: "test", plannedDischargeDay: 5, dischargeClock: 800, room: "4W-1", weightKg: 70,
  diabetic: false, regimens: [], prnPerShift: 0, caseId: null, offWard: [], npo: [] };

/** Explicit branch inputs test clinical precedence and recovery boundaries. */
class Decisions extends Rng {
  constructor(private decisions: boolean[]) { super("controlled-outcome-test"); }
  override chance(): boolean {
    const decision = this.decisions.shift();
    if (decision === undefined) throw new Error("unexpected probability draw");
    return decision;
  }
}
const attempt = (o = oral, ip = patient, decisions = [false, false, false]) =>
  doseAttempts(o, ip, 1, 540, "a:1:540:0", new Decisions(decisions), true);

const cases: { name: string; med: OrderChoice; attempts: AdministrationDecision[] }[] = [
  { name: "given", med: oral, attempts: attempt() },
  { name: "NPO clinical hold", med: oral, attempts: attempt(oral, { ...patient, npo: [{ day: 1, untilClock: 600 }] }, []) },
  { name: "refusal then given", med: oral, attempts: attempt(oral, patient, [false, true, true]) },
  { name: "repeated refusal", med: oral, attempts: attempt(oral, patient, [false, true, false]) },
  { name: "unavailable then given", med: oral, attempts: attempt(oral, patient, [true, true]) },
  { name: "unavailable missed", med: oral, attempts: attempt(oral, patient, [true, false]) },
  { name: "off unit returns in window", med: oral, attempts: attempt(oral, { ...patient, offWard: [{ day: 1, fromClock: 530, toClock: 600 }] }, []) },
  { name: "off unit beyond window", med: oral, attempts: attempt(oral, { ...patient, offWard: [{ day: 1, fromClock: 530, toClock: 700 }] }, []) },
  { name: "late beyond window", med: oral, attempts: attempt(oral, patient, [false, false, true]) },
  { name: "discharge before reoffer", med: oral, attempts: attempt(oral, { ...patient, plannedDischargeDay: 1, dischargeClock: 560 }, [true, true]) },
];

it("enumerates clinical decisions and follow-up without conflating refusal and hold", () => {
  expect(cases.map(c => c.attempts.map(a => a.outcome))).toEqual([
    ["given"], ["held"], ["refused", "given"], ["refused", "refused"], ["delayed", "given"],
    ["delayed", "notGiven"], ["delayed", "given"], ["delayed", "notGiven"], ["notGiven"], ["delayed", "notGiven"],
  ]);
  expect(cases[3]?.attempts.at(-1)?.notifyPrescriber).toBe(true);
  for (const c of cases) {
    expect(new Set(c.attempts.map(a => a.occurrence)).size).toBe(1);
    for (const a of c.attempts) {
      expect(AdministrationDecisionSchema.parse(a)).toEqual(a);
      if (a.outcome === "given") expect(a.attemptMin).toBeLessThanOrEqual(a.windowEndMin);
    }
  }
});

it("documents held critical medications and all drug-specific parameter holds", () => {
  for (const [drug, route, reason] of [
    ["lisinopril", "PO", "sbp-below-100"], ["insulin lispro", "SC", "poor-oral-intake"],
    ["warfarin", "PO", "inr-above-range"], ["heparin", "SC", "platelets-low"], ["enoxaparin", "SC", "platelets-low"],
  ]) {
    const a = attempt({ ...oral, drug: drug ?? "", route: route ?? "" }, patient, [true]);
    expect(a[0]?.reason).toBe(reason);
    expect(a[0]?.outcome).toBe("held");
    expect(a[0]?.notifyPrescriber).toBe(drug !== "lisinopril");
  }
  const insulin = { ...oral, drug: "insulin lispro", route: "SC" };
  const held = attempt(insulin, { ...patient, npo: [{ day: 1, untilClock: 600 }] }, []);
  expect(held[0]).toMatchObject({ outcome: "held", reason: "npo", notifyPrescriber: true, windowEndMin: 570 });
  const delayed = attempt({ ...oral, drug: "amoxicillin" }, { ...patient, offWard: [{ day: 1, fromClock: 530, toClock: 571 }] }, []);
  expect(delayed.map(a => a.outcome)).toEqual(["delayed", "notGiven"]);
  expect(delayed.at(-1)?.notifyPrescriber).toBe(true);
  const boundary = attempt({ ...oral, drug: "amoxicillin" }, { ...patient, offWard: [{ day: 1, fromClock: 530, toClock: 570 }] }, []);
  expect(boundary.at(-1)).toMatchObject({ outcome: "given", attemptMin: 570, windowEndMin: 570 });
});

it("does not re-offer a discontinued order or assess an off-unit patient", () => {
  const world = run(1);
  const state = structuredClone(world.initial);
  state.inpatients = [{ ...patient, offWard: [{ day: 1, fromClock: 400, toClock: 560 }],
    regimens: [{ fromDay: 0, fromClock: 0, source: "initial", orders: [oral] },
      { fromDay: 1, fromClock: 550, source: "discontinued", orders: [] }] }];
  const context = world.days[0]?.state.context;
  if (!context) throw new Error("missing day 1 context");
  const build = new DayBuild(1, context, world.pop, state, "discontinued-dose");
  runWard(build);
  const medicationTasks = build.tasks.P3.filter(t => t.choices.administer.length > 0).sort((a, b) => a.startMin - b.startMin);
  expect(medicationTasks.flatMap(t => t.choices.administer.map(m => m.administration?.outcome))).toEqual(["delayed", "notGiven"]);
  expect(medicationTasks.some(t => t.choices.administer.some(m => m.administration?.reason === "order-no-longer-active"))).toBe(true);
  expect(build.tasks.P3.filter(t => t.startMin + 420 < 560).every(t => !t.choices.noteSections.includes("assessment"))).toBe(true);
  expect(build.tasks.P3.some(t => t.choices.noteSections.includes("assessment") && t.startMin + 420 >= 560)).toBe(true);
});

it("rejects ambiguous data and giving after the declared window", () => {
  const a = attempt()[0];
  expect(OrderChoiceSchema.safeParse({ ...oral, administration: a, holdReason: "patient-refused" }).success).toBe(false);
  expect(AdministrationDecisionSchema.safeParse({ ...a, outcome: "given", attemptMin: 1000 }).success).toBe(false);
});

const generated = [1, 2, 3].flatMap(seed => allTasks(run(seed)).flatMap(t => t.choices.administer).filter(m => m.administration != null));
it("generated seeds have explicit outcomes, stable attempts and at most one given per occurrence", () => {
  expect(new Set(generated.map(m => m.administration?.outcome))).toEqual(new Set(["given", "held", "refused", "delayed", "notGiven"]));
  const occurrences = new Map<string, AdministrationDecision[]>();
  // Each seed has its own independent occurrence namespace.
  for (const seed of [1, 2, 3]) for (const t of allTasks(run(seed))) for (const m of t.choices.administer) {
    const a = m.administration;
    if (!a) continue; // PRN is not a scheduled occurrence.
    expect(m.holdReason).toBeUndefined();
    expect(t.startMin + 420).toBeGreaterThanOrEqual(a.attemptMin);
    const key = `${seed}:${a.occurrence}`;
    occurrences.set(key, [...(occurrences.get(key) ?? []), a]);
  }
  for (const attempts of occurrences.values()) {
    expect(attempts.filter(a => a.outcome === "given").length).toBeLessThanOrEqual(1);
    expect(attempts.some(a => a.outcome !== "delayed")).toBe(true);
    for (const a of attempts.filter(a => a.reoffer)) expect(a.attemptMin).toBeLessThanOrEqual(a.windowEndMin);
  }
});

// Needs the Lean toolchain and compiled modules: CI runs this in the `lean` job
// with VGI_REQUIRE_LEAN_TESTS=1 (fail instead of skip); the `unit` job has only
// the native binary, so it skips there.
const leanRoot = resolve(import.meta.dirname, "../../lean");
const noLean = spawnSync("lean", ["--version"], { encoding: "utf8" }).error !== undefined
  || !existsSync(resolve(leanRoot, ".lake/build/lib/lean/Ehr.olean"));
if (noLean && process.env.VGI_REQUIRE_LEAN_TESTS === "1") throw new Error("Lean toolchain or build missing but VGI_REQUIRE_LEAN_TESTS=1");

describe.skipIf(noLean)(`world → Lean goals → MAR reducer boundary${noLean ? " (Lean toolchain or build unavailable)" : ""}`, () => {
  it("checks every controlled path and generated seed 1/2/3 outcome with the real Lean decoder", () => {
    const medicines = [...cases.flatMap(c => c.attempts.map(administration => ({ ...c.med, administration }))), ...generated];
    const result = spawnSync("lean", ["-j6", "--run", "../world/test/lean/Administration.lean"], {
      cwd: resolve(import.meta.dirname, "../../lean"),
      env: { ...process.env, LEAN_PATH: resolve(import.meta.dirname, "../../lean/.lake/build/lib/lean") }, input: JSON.stringify(medicines) + "\n", encoding: "utf8",
      timeout: 60_000, maxBuffer: 4 * 1024 * 1024,
    });
    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(result.stdout.trim()).toBe(`checked ${medicines.length} administration decisions`);
  });
});
