import { dataReason } from "./data";
/**
 * Shape checks against core-model.md section 7. The zod schemas in
 * src/schema.ts mirror the Lean types (`Task`, `TaskChoices`, `OrderChoice`,
 * `DaySchedule`); they must be replaced by, or checked against, the schemas
 * generated from Lean once lane A emits them.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { getNumber, getString } from "../src/json";
import { SHIFTS } from "../src/calendar";
import { naloxoneCheck } from "../src/controlled";
import { DRUG_NAMES, FREQS, ROUTES, dosePerKg, drugDef, isControlled, pedsDoseCaps } from "../src/formulary";
import { DayScheduleSchema, FhirResourceSchema, type OrderChoice, OrderChoiceSchema, PERSONAS, TaskSchema } from "../src/schema";
import { allTasks, FIXTURE_INDEX, SYNTHEA_INDEX, run, schedule, stateOf } from "./helpers";

const r = run(1);

describe("DaySchedule JSON shape (core-model section 7)", () => {
  it("every emitted schedule parses with the strict Lean-mirror schema", () => {
    for (const d of r.days) for (const p of PERSONAS) expect(() => DayScheduleSchema.parse(JSON.parse(JSON.stringify(d.schedules[p])))).not.toThrow();
  });

  it("emits every defaulted field and omits `none` options, like Lean's derived ToJson", () => {
    for (const t of allTasks(r)) {
      expect(Object.keys(t).sort()).toEqual(["choices", "day", "id", "interruptions", "patientId", "persona", "startMin", "todayResources", "workflow"]);
      for (const k of ["orders", "administer", "ackResult", "immunizations", "noteSections"]) expect(t.choices).toHaveProperty(k);
      for (const o of [...t.choices.orders, ...t.choices.administer]) {
        expect(o).toHaveProperty("prn");
        if ("indication" in o) expect(typeof o.indication).toBe("string");
      }
    }
  });

  it("rejects drift: unknown keys, bad enums, negative Nat, missing defaulted fields", () => {
    const good = schedule(r, 1, "P2").tasks[0];
    expect(good).toBeDefined();
    if (good === undefined) return;
    expect(TaskSchema.safeParse({ ...good, extra: 1 }).success).toBe(false);
    expect(TaskSchema.safeParse({ ...good, workflow: "W8" }).success).toBe(false);
    expect(TaskSchema.safeParse({ ...good, startMin: -1 }).success).toBe(false);
    expect(TaskSchema.safeParse({ ...good, choices: { ...good.choices, orders: undefined } }).success).toBe(false);
    expect(OrderChoiceSchema.safeParse({ drug: "amoxicillin", doseTenths: 5000, unit: "mg/kg", route: "PO", freq: "TID", prn: false }).success).toBe(false);
    expect(OrderChoiceSchema.safeParse({ drug: "amoxicillin", doseTenths: 5000, unit: "mg", route: "PO", freq: "TID", prn: false, indication: null }).success).toBe(true);
  });

  it("tasks are well-formed: unique ids, matching day/persona, start inside the shift, sorted", () => {
    const ids = new Set<string>();
    for (const d of r.days) {
      for (const p of PERSONAS) {
        const s = d.schedules[p];
        expect(s.day).toBe(d.state.day);
        let last = -1;
        for (const t of s.tasks) {
          expect(ids.has(t.id), t.id).toBe(false);
          ids.add(t.id);
          expect(t.day).toBe(s.day);
          expect(t.persona).toBe(p);
          expect(t.startMin).toBeLessThanOrEqual(SHIFTS[p].lengthMin);
          expect(t.startMin).toBeGreaterThanOrEqual(last);
          last = t.startMin;
        }
      }
    }
  });

  it("todayResources are FHIR resources with unique ids per task", () => {
    for (const t of allTasks(r)) {
      const seen = new Set<string>();
      for (const res of t.todayResources) {
        const parsed = FhirResourceSchema.safeParse(res);
        expect(parsed.success, `${t.id} resource`).toBe(true);
        if (parsed.success) {
          expect(seen.has(parsed.data.id), `${t.id} duplicate ${parsed.data.id}`).toBe(false);
          seen.add(parsed.data.id);
        }
      }
    }
  });

  it("each persona works its own workflows", () => {
    const allowed: Record<string, string[]> = { P1: ["W1", "W2", "W7"], P2: ["W3"], P3: ["W4"], P4: ["W5"], P5: ["W1", "W2", "W6"] };
    for (const t of allTasks(r)) expect(allowed[t.persona]).toContain(t.workflow);
  });
});

function weightKg(t: { todayResources: unknown[] }): { value: number; unit: string } | undefined {
  for (const res of t.todayResources) {
    if (typeof res !== "object" || res === null || Array.isArray(res)) continue;
    const code = JSON.stringify(res);
    if (!code.includes('"29463-7"')) continue;
    const vq = "valueQuantity" in res ? res.valueQuantity : undefined;
    if (typeof vq === "object" && vq !== null && "value" in vq && "unit" in vq && typeof vq.value === "number" && typeof vq.unit === "string") return { value: vq.value, unit: vq.unit };
  }
  return undefined;
}

[FIXTURE_INDEX, SYNTHEA_INDEX].forEach((index) => {
  const reason = dataReason(index);
  describe.skipIf(Boolean(reason))(`clinical choices (${index})${reason ? ` (${reason})` : ""}`, () => {
  let r: ReturnType<typeof run>;
  let tasks: ReturnType<typeof allTasks>;
  let orders: ReturnType<typeof allTasks>[number]["choices"]["orders"];
  beforeAll(() => {
  r = run(1, index);
  tasks = allTasks(r);
  orders = tasks.flatMap((t) => [...t.choices.orders, ...t.choices.administer]).filter((o) => o.kind !== "imaging" && o.kind !== "procedure");

  });

  it("use only formulary drugs, routes and frequencies, with positive doses", () => {
    expect(DRUG_NAMES.length).toBe(25);
    for (const o of orders) {
      expect(drugDef(o.drug), o.drug).toBeDefined();
      expect(ROUTES).toContain(o.route);
      expect(FREQS).toContain(o.freq);
      expect(o.doseTenths).toBeGreaterThan(0);
    }
  });

  it("every antibiotic order carries an indication; no other order does", () => {
    for (const o of orders) expect(o.indication !== undefined && o.indication !== null, `${o.drug}`).toBe(drugDef(o.drug)?.antibiotic);
  });

  it("penicillin-allergic patients (record or new at triage) never get amoxicillin, and get vancomycin instead of cefazolin", () => {
    const pcn = new Set(r.pop.all.filter((p) => p.allergies.some((a) => a.classes.includes("penicillin"))).map((p) => p.id));
    for (const t of tasks) {
      const triage = t.todayResources.some((x) => JSON.stringify(x).includes('"AllergyIntolerance"'));
      if (!pcn.has(t.patientId) && !triage) continue;
      for (const o of t.choices.orders) {
        expect(o.drug, `${t.id}`).not.toBe("amoxicillin");
        expect(o.drug, `${t.id}`).not.toBe("cefazolin");
      }
    }
    expect(tasks.some((t) => pcn.has(t.patientId) && t.choices.orders.some((o) => o.drug === "vancomycin" || o.drug === "azithromycin"))).toBe(true);
  });

  it("P4: every visit records today's weight in kg, and every prescription is inside its mg/kg range", () => {
    let checked = 0;
    for (let d = 1; d <= 10; d++) {
      for (const t of schedule(r, d, "P4").tasks) {
        const w = weightKg(t);
        expect(w?.unit, t.id).toBe("kg");
        if (w === undefined) continue;
        for (const o of t.choices.orders) {
          const range = drugDef(o.drug)?.weightRange;
          expect(range, `${o.drug} has a weight range`).toBeDefined();
          if (range === undefined) continue;
          const perKg = dosePerKg(o, w.value);
          const capped = pedsDoseCaps(o.drug).includes(o.doseTenths / 10);
          if (!capped) expect(perKg, `${t.id} ${o.drug} ${o.doseTenths / 10}${o.unit} at ${w.value} kg`).toBeGreaterThanOrEqual(range.min - 1e-9);
          expect(perKg, `${t.id} ${o.drug} ${o.doseTenths / 10}${o.unit} at ${w.value} kg`).toBeLessThanOrEqual(range.max + 1e-9);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(10);
  });

  it("P2: every ED patient has a triage weight, some typed in lb", () => {
    let lb = 0;
    for (let d = 1; d <= 10; d++) {
      for (const t of schedule(r, d, "P2").tasks) {
        const w = weightKg(t);
        expect(w, t.id).toBeDefined();
        if (w?.unit === "lb") lb++;
      }
    }
    expect(lb).toBeGreaterThan(5);
  });

  it("P3: med passes include high-alert meds (insulin or heparin), PRNs with pain scores and reassessments", () => {
    const p3 = tasks.filter((t) => t.persona === "P3");
    expect(p3.some((t) => t.choices.administer.some((o) => drugDef(o.drug)?.highAlert === true))).toBe(true);
    expect(p3.some((t) => t.choices.administer.some((o) => o.prn) && t.choices.painScore !== undefined)).toBe(true);
    expect(p3.some((t) => t.choices.noteSections.includes("painReassessment") && t.choices.painScore !== undefined)).toBe(true);
    expect(p3.some((t) => t.choices.administer.some((o) => o.holdReason !== undefined))).toBe(true);
    expect(p3.some((t) => t.choices.noteSections.includes("handoff"))).toBe(true);
  });

  it("P1: 16-20 W1 visits on clinic days; W2 and W7 come in bursts", () => {
    for (let d = 1; d <= 10; d++) {
      if (d === 5) continue;
      const w1 = schedule(r, d, "P1").tasks.filter((t) => t.workflow === "W1").length;
      expect(w1, `day ${d}`).toBeGreaterThanOrEqual(16);
      expect(w1, `day ${d}`).toBeLessThanOrEqual(20);
    }
    const starts = schedule(r, 1, "P1").tasks.filter((t) => t.workflow !== "W1").map((t) => t.startMin);
    expect(starts.some((m) => m < 30)).toBe(true);
  });

  it("P5 alternates clinic and OR days; OR days carry pre-op and post-op order sets", () => {
    for (let d = 1; d <= 10; d++) {
      const kinds = schedule(r, d, "P5").tasks.filter((t) => t.workflow === "W6").map((t) => t.choices.w6Step);
      if (d % 2 === 0 && stateOf(r, d).today.surgery.casesOperated.length > 0) expect(kinds).toEqual(expect.arrayContaining(["preop", "postop"]));
      if (d % 2 === 1) expect(schedule(r, d, "P5").tasks.some((t) => t.workflow === "W1")).toBe(true);
    }
  });
});
});

[FIXTURE_INDEX, SYNTHEA_INDEX].forEach((index) => {
  const reason = dataReason(index);
  describe.skipIf(Boolean(reason))(`controlled substances (CURES / naloxone facts, ${index})${reason ? ` (${reason})` : ""}`, () => {
  let r: ReturnType<typeof run>;
  let tasks: ReturnType<typeof allTasks>;
  beforeAll(() => {
  r = run(1, index);
  tasks = allTasks(r);

  });

  it("every outpatient controlled prescription records its supply in days", () => {
    let n = 0;
    for (const t of tasks) {
      const outpatient = t.workflow === "W1" || t.workflow === "W7" || (t.workflow === "W3" && t.choices.disposition === "discharge") || (t.workflow === "W6" && t.choices.w6Step === "discharge");
      if (!outpatient) continue;
      const rx = t.workflow === "W3" ? t.choices.orders.filter((o) => o.freq !== "once") : t.choices.orders;
      for (const o of rx) {
        if (!isControlled(o.drug) || o.route !== "PO" || o.holdReason !== undefined) continue;
        expect(o.supplyDays, `${t.id} ${o.drug}`).toBeGreaterThan(0);
        n++;
      }
    }
    expect(n).toBeGreaterThan(5);
  });

  it("covers short CURES-exempt ED supplies, longer supplies, post-op opioids, chronic refills and naloxone offers", () => {
    const supply = tasks.flatMap((t) => t.choices.orders.filter((o) => o.supplyDays !== undefined).map((o) => ({ t, o })));
    expect(supply.some((x) => x.t.workflow === "W3" && (x.o.supplyDays ?? 0) <= 7 && x.o.curesExemptReason !== undefined)).toBe(true);
    expect(supply.some((x) => (x.o.supplyDays ?? 0) > 7)).toBe(true);
    expect(supply.some((x) => x.t.workflow === "W6")).toBe(true);
    expect(tasks.some((t) => t.workflow === "W7" && t.todayResources.some((res) => /oxycodone|hydrocodone|tramadol|alprazolam|lorazepam/.test(JSON.stringify(res)) && JSON.stringify(res).includes('"Task"')))).toBe(true);
    expect(tasks.some((t) => t.todayResources.some((res) => getString(res, "code", "coding", 0, "code") === "naloxoneOffer"))).toBe(true);
    expect(tasks.some((t) => t.persona === "P3" && t.choices.administer.some((o) => o.prn && isControlled(o.drug)))).toBe(true);
  });

  it("naloxone offers appear exactly where the MME >= 90 or opioid + benzodiazepine rule applies", () => {
    for (const t of tasks) {
      if (t.workflow === "W7") continue; // Approval renews the contained FHIR prescription.
      const offered = t.todayResources.some((res) => getString(res, "code", "coding", 0, "code") === "naloxoneOffer");
      const hasSupply = t.choices.orders.some((o) => o.supplyDays !== undefined);
      if (!hasSupply) {
        expect(offered, t.id).toBe(false);
        continue;
      }
      const p = r.pop.byId.get(t.patientId);
      if (p === undefined) continue;
      const rx = t.choices.orders.filter((o) => o.freq !== "once" && o.route === "PO");
      expect(offered, t.id).toBe(naloxoneCheck(rx, p.homeMeds).applies);
    }
  });

  it("approved controlled refills carry supply on the contained FHIR prescription", () => {
    let checked = 0;
    for (const t of tasks.filter((x) => x.workflow === "W7" && x.choices.refill === "approve")) {
      for (const res of t.todayResources) {
        const drug = getString(res, "contained", 0, "medicationCodeableConcept", "text");
        if (drug === undefined || !isControlled(drug)) continue;
        expect(getNumber(res, "contained", 0, "dispenseRequest", "expectedSupplyDuration", "value")).toBe(30);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("naloxoneCheck: 90 MME or opioid + benzodiazepine triggers; 60 MME alone does not", () => {
    const oxy = (mg: number): OrderChoice => ({ drug: "oxycodone", doseTenths: mg * 10, unit: "mg", route: "PO", freq: "q6h", prn: true });
    expect(naloxoneCheck([oxy(15)], []).applies).toBe(true);
    expect(naloxoneCheck([oxy(10)], []).applies).toBe(false);
    expect(naloxoneCheck([oxy(5)], [{ drug: "alprazolam", dose: 0.5, unit: "mg", route: "PO", freq: "TID", prn: true, display: "", origin: "world" }]).applies).toBe(true);
  });
});
});
