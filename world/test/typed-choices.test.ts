import { dataReason } from "./data";
import { PRIOR_AUTH_RELEASE_DAY } from "../src/releases";
import { beforeAll, describe, expect, it } from "vitest";
import { getString } from "../src/json";
import { isControlled, serviceOrder } from "../src/formulary";
import { OrderChoiceSchema } from "../src/schema";
import { allTasks, FIXTURE_INDEX, run, SYNTHEA_INDEX } from "./helpers";

[FIXTURE_INDEX, SYNTHEA_INDEX].forEach((index) => {
  const reason = dataReason(index);
  describe.skipIf(Boolean(reason))(`typed decisions (${index})${reason ? ` (${reason})` : ""}`, () => {
  let tasks: ReturnType<typeof allTasks>;
  beforeAll(() => {
  tasks = allTasks(run(1, index));

  });

  it("uses typed pain, holds/refusals, surgical stages and refill reasons", () => {
    expect(tasks.some((t) => t.choices.painScore !== undefined)).toBe(true);
    expect(tasks.some((t) => t.choices.administer.some((o) => o.holdReason === "patient-refused"))).toBe(true);
    expect(tasks.some((t) => t.choices.administer.some((o) => o.holdReason !== undefined && o.holdReason !== "patient-refused"))).toBe(true);
    for (const t of tasks) {
      if (t.workflow === "W6") expect(t.choices.w6Step).toBeDefined();
      if (t.workflow === "W7" && t.choices.refill !== "approve") expect(t.choices.refillReason).toBeTruthy();
      expect(t.choices.noteSections.some((s) => /^(supplyDays|hold|refused|painScore|painReassessment|sedationScore|prnReason|naloxoneOffer|denyReason|modifyReason):/.test(s)), t.id).toBe(false);
    }
  });

  it("places exemption reasons only on short ED/post-op supplies", () => {
    let exempt = 0;
    for (const t of tasks) for (const o of t.choices.orders) {
      if (o.curesExemptReason === undefined) continue;
      expect(isControlled(o.drug)).toBe(true);
      expect(o.supplyDays).toBeGreaterThan(0);
      expect(o.supplyDays).toBeLessThanOrEqual(7);
      expect(t.choices.disposition === "discharge" || t.choices.w6Step === "discharge").toBe(true);
      exempt++;
    }
    expect(exempt).toBeGreaterThan(0);
    for (const t of tasks.filter((t) => t.choices.w6Step === "postop")) {
      expect(t.choices.orders.every((o) => o.supplyDays === undefined)).toBe(true);
    }
  });

  it("emits P1/P5 imaging and procedures after the v2 release, with no medication administrations", () => {
    for (const persona of ["P1", "P5"]) for (const kind of ["imaging", "procedure"]) {
      expect(tasks.some((t) => t.persona === persona && t.day >= PRIOR_AUTH_RELEASE_DAY && t.choices.orders.some((o) => o.kind === kind)), `${persona} ${kind}`).toBe(true);
    }
    for (const t of tasks) {
      expect(t.choices.administer.every((o) => o.kind === undefined || o.kind === "medication")).toBe(true);
      for (const o of t.choices.orders.filter((o) => o.kind === "imaging" || o.kind === "procedure")) {
        expect(t.day).toBeGreaterThanOrEqual(PRIOR_AUTH_RELEASE_DAY);
        expect(o).toMatchObject({ drug: "", doseTenths: 0, unit: "none", route: "", freq: "", prn: false });
        expect(o.code).toBeTruthy();
        expect(o.indication).toBeTruthy();
      }
    }
  });

  it("represents naloxone responses, PRN reasons and sedation as structured FHIR facts", () => {
    const observationTasks = [...tasks, ...allTasks(run(2, index)), ...allTasks(run(3, index))];
    const observations = observationTasks.flatMap((t) => t.todayResources).filter((r) => getString(r, "code", "coding", 0, "system") === "urn:vgi:world:clinical");
    for (const code of ["naloxoneOffer", "prnReason", "sedationScore"]) {
      expect(observations.some((r) => getString(r, "code", "coding", 0, "code") === code), code).toBe(true);
    }
    for (const r of observations.filter((r) => getString(r, "code", "coding", 0, "code") === "naloxoneOffer")) {
      expect(["accepted", "declined"]).toContain(getString(r, "valueCodeableConcept", "coding", 0, "code"));
    }
  });
});
});

it("rejects service orders disguised as medications or with missing service codes", () => {
  const good = serviceOrder("imaging", "mri-lumbar-spine-without-contrast", "persistent-low-back-pain");
  expect(OrderChoiceSchema.safeParse(good).success).toBe(true);
  expect(OrderChoiceSchema.safeParse({ ...good, drug: "morphine" }).success).toBe(false);
  expect(OrderChoiceSchema.safeParse({ ...good, code: undefined }).success).toBe(false);
  expect(OrderChoiceSchema.safeParse({ ...good, doseTenths: 10 }).success).toBe(false);
});
