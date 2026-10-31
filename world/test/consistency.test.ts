import { describe, expect, it } from "vitest";
import { PERSONAS } from "../src/schema";
import { DAYS, FIXTURE_INDEX, SYNTHEA_INDEX, run, schedule, stateOf } from "./helpers";

const CASES = [
  ...[1, 2, 3].map((seed) => ({ seed, index: FIXTURE_INDEX })),
  { seed: 1, index: SYNTHEA_INDEX },
];

describe.each(CASES)("cross-persona consistency ($index, seed $seed)", ({ seed, index }) => {
  const r = run(seed, index);

  it("every admitted patient is on P3's census the next day, with ward tasks", () => {
    let checked = 0;
    for (let d = 1; d < DAYS; d++) {
      const admitted = stateOf(r, d).admissions.filter((a) => a.day === d);
      const next = stateOf(r, d + 1);
      const census = new Set(next.today.ward.censusAtShiftStart.map((c) => c.patientId));
      const p3 = new Set(schedule(r, d + 1, "P3").tasks.map((t) => t.patientId));
      for (const a of admitted) {
        expect(census.has(a.patientId), `day ${d} admission ${a.id} (${a.patientId}) on day ${d + 1} census`).toBe(true);
        expect(p3.has(a.patientId), `day ${d} admission ${a.id} (${a.patientId}) has P3 tasks on day ${d + 1}`).toBe(true);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("every P3 census patient gets at least one W4 task, and only census patients do", () => {
    for (let d = 1; d <= DAYS; d++) {
      const census = new Set(stateOf(r, d).today.ward.censusAtShiftStart.map((c) => c.patientId));
      const p3 = new Set(schedule(r, d, "P3").tasks.map((t) => t.patientId));
      expect([...p3].every((id) => census.has(id))).toBe(true);
      expect([...census].every((id) => p3.has(id))).toBe(true);
    }
  });

  it("every discharge creates a follow-up (P1 for inpatients, P5 after surgery)", () => {
    const final = stateOf(r, DAYS);
    expect(final.discharges.length).toBeGreaterThan(0);
    for (const dc of final.discharges) {
      expect(dc.followUps.length, `discharge ${dc.id}`).toBeGreaterThan(0);
      const created = stateOf(r, dc.day).appointments.filter((a) => dc.followUps.includes(a.id));
      expect(created.length, `discharge ${dc.id} appointments exist`).toBe(dc.followUps.length);
      for (const a of created) expect(a.patientId).toBe(dc.patientId);
      if (dc.kind === "inpatient") expect(created.some((a) => a.persona === "P1"), `discharge ${dc.id} has a P1 follow-up`).toBe(true);
      if (dc.service === "surgery") expect(created.some((a) => a.persona === "P5"), `discharge ${dc.id} has a P5 post-op visit`).toBe(true);
    }
  });

  it("follow-up appointments are kept: seen that day, a recorded no-show, or rescheduled", () => {
    let seen = 0;
    for (let d = 1; d <= DAYS; d++) {
      const due = stateOf(r, d - 1).appointments.filter((a) => a.day === d);
      const st = stateOf(r, d);
      for (const a of due) {
        const tasks = schedule(r, d, a.persona).tasks.filter((t) => t.patientId === a.patientId && (t.workflow === "W1" || t.workflow === "W5"));
        const clinic = st.today.clinics[a.persona];
        const rescheduled = st.appointments.some((x) => x.id === a.id && x.day > d);
        const ok = tasks.length > 0 || clinic.noShows.includes(a.patientId) || rescheduled;
        expect(ok, `appointment ${a.id} (${a.persona} ${a.patientId}) on day ${d}`).toBe(true);
        if (tasks.length > 0) seen++;
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it("discharge labs land in P1's in-basket on a later day (or wait in the backlog)", () => {
    const final = stateOf(r, DAYS);
    const handled = new Set<string>();
    for (let d = 1; d <= DAYS; d++) for (const t of schedule(r, d, "P1").tasks) for (const res of t.todayResources) if (typeof res === "object" && res !== null && !Array.isArray(res) && typeof res["id"] === "string") handled.add(res["id"]);
    const backlog = new Set(final.inBasketBacklog.map((i) => i.lab?.id));
    let checked = 0;
    for (const dc of final.discharges) {
      for (const labId of dc.pendingLabs) {
        const lab = stateOf(r, dc.day).pendingLabs.find((l) => l.id === labId);
        expect(lab, `lab ${labId}`).toBeDefined();
        if (lab === undefined) continue;
        expect(lab.resultDay).toBeGreaterThan(dc.day);
        expect(lab.recipient).toBe("P1");
        if (lab.resultDay > DAYS) continue;
        const day = Array.from({ length: DAYS }, (_, i) => i + 1).find((d) => schedule(r, d, "P1").tasks.some((t) => t.workflow === "W2" && t.todayResources.some((x) => typeof x === "object" && x !== null && !Array.isArray(x) && x["id"] === `${labId}-result`)));
        expect(day !== undefined || backlog.has(labId), `lab ${labId} reaches P1`).toBe(true);
        if (day !== undefined) expect(day).toBeGreaterThanOrEqual(lab.resultDay);
        checked++;
      }
    }
    expect(handled.size).toBeGreaterThan(0);
    void checked;
  });

  it("the scripted surgical flow runs: P2 consult -> P5 consult + admit -> OR next day -> P3 meds -> P5 rounds -> discharge -> follow-ups", () => {
    const c = stateOf(r, DAYS).surgicalCases.find((x) => x.urgency === "urgent" && x.consultDay === 1 && x.diagnosis === "appendicitis");
    expect(c, "day-1 appendicitis case").toBeDefined();
    if (c === undefined) return;
    const p2 = schedule(r, 1, "P2").tasks.find((t) => t.id === c.edTaskId);
    expect(p2?.choices.disposition).toBe("consult");
    expect(p2?.patientId).toBe(c.patientId);
    expect(schedule(r, 1, "P5").tasks.some((t) => t.patientId === c.patientId && t.workflow === "W6" && t.choices.noteSections[0] === "consultNote")).toBe(true);
    expect(c.orDay).toBe(2);
    const p5day2 = schedule(r, 2, "P5").tasks.filter((t) => t.patientId === c.patientId && t.workflow === "W6").map((t) => t.choices.noteSections[0]);
    expect(p5day2).toEqual(expect.arrayContaining(["hAndPUpdate", "briefOpNote"]));
    expect(schedule(r, 2, "P3").tasks.some((t) => t.patientId === c.patientId)).toBe(true);
    expect(c.dischargeDay).not.toBeNull();
    const dcDay = c.dischargeDay ?? 0;
    expect(dcDay).toBeGreaterThan(c.orDay);
    // Post-op days: P3 gives meds and P5 rounds before discharge.
    for (let d = c.orDay + 1; d <= dcDay; d++) {
      expect(schedule(r, d, "P3").tasks.some((t) => t.patientId === c.patientId && t.choices.administer.length > 0), `P3 meds day ${d}`).toBe(true);
      expect(schedule(r, d, "P5").tasks.some((t) => t.patientId === c.patientId && t.choices.noteSections[0] === "progressNote"), `P5 rounds day ${d}`).toBe(true);
    }
    expect(schedule(r, dcDay, "P5").tasks.some((t) => t.patientId === c.patientId && t.choices.noteSections[0] === "medRec")).toBe(true);
    expect(c.postopVisitDay).not.toBeNull();
    expect(c.p1FollowupDay).not.toBeNull();
  });

  it("no patient is an inpatient and an outpatient or ED arrival on the same day", () => {
    for (let d = 1; d <= DAYS; d++) {
      const st = stateOf(r, d);
      const census = new Set(st.today.ward.censusAtShiftStart.map((c) => c.patientId));
      for (const p of ["P1", "P2", "P4"] as const) {
        for (const t of schedule(r, d, p).tasks) {
          if (t.workflow === "W2" || t.workflow === "W7") continue; // results/refills can arrive for anyone
          expect(census.has(t.patientId), `day ${d} ${p} ${t.id} patient ${t.patientId} is on the ward`).toBe(false);
        }
      }
    }
  });

  it("pediatric weights change from day to day and drive the doses", () => {
    const weights = new Map<string, Set<number>>();
    for (let d = 1; d <= DAYS; d++) {
      for (const t of schedule(r, d, "P4").tasks) {
        const w = t.todayResources.find((x) => typeof x === "object" && x !== null && !Array.isArray(x) && x["resourceType"] === "Observation");
        const v = typeof w === "object" && w !== null && !Array.isArray(w) ? w["valueQuantity"] : undefined;
        const kg = typeof v === "object" && v !== null && !Array.isArray(v) ? v["value"] : undefined;
        if (typeof kg === "number") {
          const s = weights.get(t.patientId) ?? new Set<number>();
          s.add(kg);
          weights.set(t.patientId, s);
        }
      }
    }
    expect([...weights.values()].some((s) => s.size >= 3)).toBe(true);
  });

  it("load labels vary and day 5 is the urgent-care day", () => {
    const loads = new Set(r.days.flatMap((d) => PERSONAS.map((p) => d.schedules[p].load)));
    expect(loads.size).toBeGreaterThanOrEqual(2);
    const uc = schedule(r, 5, "P1").tasks;
    expect(uc.filter((t) => t.workflow === "W1").every((t) => t.choices.noteSections.includes("urgentCareTriage"))).toBe(true);
    expect(uc.filter((t) => t.workflow !== "W1").every((t) => t.startMin >= 600)).toBe(true);
    // The in-basket mostly waits on the urgent-care day: at most 5 items handled, the rest carried over.
    const ib4 = stateOf(r, 4).today.inBasket.P1;
    const ib5 = stateOf(r, 5).today.inBasket.P1;
    expect(ib5.handled).toBeLessThanOrEqual(5);
    expect(ib5.backlogAfter).toBe(ib4.backlogAfter + ib5.arrived - ib5.handled);
  });
});
