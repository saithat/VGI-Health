import { archivedReleaseEventId } from "../../scripts/historical-releases.mjs";
/**
 * The living world: an initial state (day 0) and a deterministic daily
 * transition. Day d is a pure function of (seed, d, state of day d-1): the
 * day seed hashes all three, and every subsystem draws from its own stream.
 *
 * Within a day the subsystems run in a fixed order:
 *   census snapshot -> medical discharges -> ED (admits, consults)
 *   -> surgery (rounds, OR, discharges, clinic) -> ward med passes
 *   -> P1 clinic and inbox -> pediatric clinic -> carry-over.
 */
import { DayBuild, type PopIndex, indexPopulation } from "./build";
import { SHIFTS, dateOf } from "./calendar";
import { computeContext } from "./context";
import { assignChronicOpioids, worldHomeMedResources } from "./controlled";
import { addAppointment, addPendingLab, admit, labValue, maxCensus } from "./flows/common";
import { runP1 } from "./flows/clinic";
import { decideRefill } from "./flows/clinic";
import { initialAdmissionPlan, runEd } from "./flows/ed";
import { initPedsChild, runPeds } from "./flows/peds";
import { PROCEDURES, bookElective, canBook, electiveCap, electiveDiagnosis, postopOrders, runSurgery } from "./flows/surgery";
import { censusAtShiftStart, dischargeMedicine, runWard } from "./flows/ward";
import { homeOrder, isDiabetic } from "./clinical";
import type { LabKey } from "./fhir";
import type { PatientProfile } from "./patients";
import { Rng, hashHex, stableStringify } from "./rng";
import type { DaySchedule, Persona, Task, Workflow } from "./schema";
import { PERSONAS, perPersona } from "./schema";
import type { WorldState } from "./state";

function emptyToday(): WorldState["today"] {
  const clinic = () => ({ booked: 0, seen: 0, noShows: [], addOns: [], newPatients: 0 });
  return {
    ed: { arrivals: [], peakCensus: 0, boardersAtShiftStart: 0 },
    ward: { censusAtShiftStart: [], admissions: [], discharges: [] },
    clinics: { P1: clinic(), P4: clinic(), P5: clinic() },
    inbox: { P1: { arrived: 0, handled: 0, backlogAfter: 0 }, P5: { arrived: 0, handled: 0 } },
    surgery: { consults: [], casesOperated: [] },
    taskCounts: perPersona(() => ({})),
    events: [],
  };
}

/** Population used by the world: the loaded patients plus world-assigned chronic opioid therapy. */
export function worldPopulation(patients: PatientProfile[], seed: number): PopIndex {
  return indexPopulation(assignChronicOpioids(patients, seed));
}

/** The world on day 0 (the Friday before the simulation): census, bookings, pending results, backlog. */
export function initialState(seed: number, pop: PopIndex): WorldState {
  const daySeed = hashHex(`${seed}|init`);
  const st: WorldState = {
    schemaVersion: 1,
    seed,
    day: 0,
    date: dateOf(0),
    daySeed,
    prevStateHash: null,
    context: computeContext(seed, 0, daySeed),
    today: emptyToday(),
    inpatients: [],
    appointments: [],
    pendingLabs: [],
    inboxBacklog: [],
    peds: pop.peds.map(initPedsChild),
    surgicalCases: [],
    p1Panel: [],
    admissions: [],
    discharges: [],
    counters: {},
  };
  const b = new DayBuild(0, st.context, pop, st, daySeed);
  const rng = new Rng(`${daySeed}:init`);

  // P1's panel: adults with chronic problems or meds, plus most of the rest (the others can be "new" patients).
  st.p1Panel = pop.adults.filter((p) => p.tags.length > 0 || p.homeMeds.length > 0 || rng.chance(0.55)).map((p) => p.id);
  const panel = new Set(st.p1Panel);

  // Medical inpatients already on the ward (older adults first, so young adults stay free for ED surgical presentations).
  const censusCap = maxCensus(pop);
  const nMedical = Math.max(1, Math.min(censusCap - 1, rng.int(6, 8)));
  for (let k = 0; k < nMedical; k++) {
    const r = rng.fork(`init-ip-${k}`);
    const p = b.picker.pick(r, (q) => q.ageYears >= 45) ?? b.picker.pick(r, (q) => q.ageYears >= 18);
    if (p === undefined) break;
    const plan = initialAdmissionPlan(p, p.weightKg, r);
    const admitDay = r.int(-2, 0);
    const ip = admit(
      b,
      {
        patient: p,
        clock: r.int(14 * 60, 22 * 60),
        service: "medicine",
        source: "initial",
        diagnosis: plan.diagnosis,
        losNights: 1,
        regimen: plan.regimen,
        regimenSource: "admission orders (before simulation)",
        prnPerShift: plan.prnPerShift,
        caseId: null,
        fromTaskId: null,
        weightKg: p.weightKg,
        diabetic: isDiabetic(p),
      },
      r,
    );
    ip.admitDay = admitDay;
    ip.plannedDischargeDay = r.int(1, 3);
    for (const reg of ip.regimens) reg.fromDay = admitDay;
    const rec = st.admissions.find((a) => a.id === ip.admissionId);
    if (rec !== undefined) rec.day = admitDay;
  }

  // One post-op patient from a day-0 elective cholecystectomy (P5 rounds and discharges on day 1).
  {
    const r = rng.fork("init-postop");
    const p = b.picker.pick(r, (q) => q.ageYears >= 30 && q.ageYears <= 75 && !q.tags.includes("cholecystectomy"));
    if (p !== undefined && st.inpatients.length < censusCap) {
      const c = bookElective(b, p, "symptomatic-cholelithiasis", 0, r);
      c.bookedDay = -8;
      c.disposition = "overnight";
      c.stage = "operated";
      c.orStartClock = 13 * 60;
      c.orEndClock = 13 * 60 + PROCEDURES["symptomatic-cholelithiasis"].durationMin;
      const post = postopOrders(p, p.weightKg, c);
      const ip = admit(
        b,
        {
          patient: p,
          clock: 15 * 60,
          service: "surgery",
          source: "postop",
          diagnosis: `s/p ${c.procedure}`,
          losNights: 1,
          regimen: post.orders,
          regimenSource: "post-op order set (before simulation)",
          prnPerShift: 1.5,
          caseId: c.id,
          fromTaskId: null,
          weightKg: p.weightKg,
          diabetic: isDiabetic(p),
        },
        r,
      );
      c.admissionId = ip.admissionId;
      addPendingLab(b, { patientId: p.id, lab: "pathology", resultDay: 2, recipient: "P5", source: `case ${c.id}`, result: { value: 0, interpretation: "A" }, text: "Gallbladder: chronic cholecystitis with cholelithiasis" });
    }
  }

  const outpatients = (filter: (p: PatientProfile) => boolean): PatientProfile[] => pop.adults.filter((p) => !b.picker.isBlocked(p.id) && filter(p));

  // Follow-ups booked before the simulation.
  const fu = rng.shuffle(outpatients((p) => panel.has(p.id)));
  fu.slice(0, 3).forEach((p, i) => addAppointment(b, "P1", p.id, 1 + (i % 3), "post-discharge", "hospital follow-up (discharged before simulation)", "pre-sim"));
  fu.slice(3, 4).forEach((p) => addAppointment(b, "P1", p.id, 2, "ed-followup", "ED follow-up (before simulation)", "pre-sim"));
  rng.shuffle(outpatients((p) => p.ageYears >= 25)).slice(0, 3).forEach((p, i) => addAppointment(b, "P5", p.id, i < 2 ? 1 : 3, "postop", "post-op check (surgery before simulation)", "pre-sim"));
  if (pop.peds.length > 0) {
    const child = rng.pick(pop.peds);
    addAppointment(b, "P4", child.id, 1, "recheck", "recheck otitis-media", "pre-sim");
  }

  // Results pending from before the simulation, landing on days 1-3.
  const labKeys: LabKey[] = ["potassium", "creatinine", "a1c", "ldl", "hemoglobin", "tsh", "glucose"];
  rng.shuffle(pop.adults.filter((p) => panel.has(p.id))).slice(0, 6).forEach((p, i) => {
    const r = rng.fork(`init-lab-${i}`);
    const lab = r.pick(labKeys);
    addPendingLab(b, { patientId: p.id, lab, resultDay: 1 + (i % 3), recipient: "P1", source: "before simulation", result: labValue(r, lab, r.chance(0.35)) });
  });

  // Inbox backlog carried in from the previous week.
  rng.shuffle(pop.adults.filter((p) => panel.has(p.id))).slice(0, 4).forEach((p, i) => {
    const r = rng.fork(`init-backlog-${i}`);
    const med = p.homeMeds.find((m) => !m.prn);
    if (i % 2 === 0 && med !== undefined) {
      const d = decideRefill(med, r, false);
      st.inboxBacklog.push({
        id: b.nextId("item"),
        kind: "refill",
        patientId: p.id,
        arrivedDay: 0,
        priority: 1,
        lab: null,
        refill: { id: b.nextId("rx"), patientId: p.id, requestedDay: 0, current: homeOrder(med), decision: d.decision, modified: d.modified, reason: d.reason, labs: d.labs, lastFilledDaysAgo: r.int(26, 34) },
      });
    } else {
      const lab = r.pick(labKeys);
      const res = labValue(r, lab, r.chance(0.3));
      st.inboxBacklog.push({
        id: b.nextId("item"),
        kind: "result",
        patientId: p.id,
        arrivedDay: 0,
        priority: res.interpretation === "N" ? 2 : 0,
        lab: { id: b.nextId("lab"), patientId: p.id, lab, orderedDay: -2, resultDay: 0, recipient: "P1", source: "before simulation", value: res.value, interpretation: res.interpretation, text: null, followUp: [] },
        refill: null,
      });
    }
  });

  // Elective cases booked before the simulation (OR days 2, 4, 6).
  const elective = rng.shuffle(outpatients((p) => p.ageYears >= 25 && p.ageYears <= 85 && canBook(st.surgicalCases, p.id)));
  const cap = electiveCap(pop);
  [2, 2, 2, 4, 4, 6]
    .filter((orDay, i, all) => all.slice(0, i).filter((x) => x === orDay).length < cap)
    .forEach((orDay, i) => {
      const p = elective[i];
      if (p === undefined) return;
      const r = rng.fork(`init-case-${i}`);
      const c = bookElective(b, p, electiveDiagnosis(p, r), orDay, r);
      c.bookedDay = -r.int(5, 15);
    });

  st.today.events = b.events;
  return st;
}

function countTasks(tasks: Task[]): Partial<Record<Workflow, number>> {
  const out: Partial<Record<Workflow, number>> = {};
  for (const t of tasks) out[t.workflow] = (out[t.workflow] ?? 0) + 1;
  return out;
}

export interface DayOutput {
  state: WorldState;
  schedules: Record<Persona, DaySchedule>;
}

/** Advance the world one day. `prev` is not modified. */
export function advanceDay(prev: WorldState, pop: PopIndex): DayOutput {
  const day = prev.day + 1;
  // Release display names must not perturb the clinical scenario seed.
  const seedState = { ...prev, context: { ...prev.context,
    scriptedEvents: prev.context.scriptedEvents.map(archivedReleaseEventId) } };
  const prevStateHash = hashHex(stableStringify(seedState));
  const daySeed = hashHex(`${prev.seed}|${day}|${prevStateHash}`);
  const ctx = computeContext(prev.seed, day, daySeed);
  const state: WorldState = { ...structuredClone(prev), day, date: dateOf(day), daySeed, prevStateHash, context: ctx, today: emptyToday() };
  const b = new DayBuild(day, ctx, pop, state, daySeed);

  for (const ip of state.inpatients) b.picker.block(ip.patientId);
  for (const c of state.surgicalCases) if (c.orDay === day && c.stage === "booked") b.picker.block(c.patientId);
  for (const a of state.appointments) if (a.day === day) b.picker.use(a.patientId);

  state.today.ward.censusAtShiftStart = censusAtShiftStart(b).map((ip) => ({ patientId: ip.patientId, room: ip.room, service: ip.service, admitDay: ip.admitDay, diagnosis: ip.diagnosis }));

  dischargeMedicine(b);
  runEd(b);
  runSurgery(b);
  runWard(b);
  runP1(b);
  runPeds(b);

  // World-assigned home meds travel with every task for that patient, so FHIR-derived facts see them.
  for (const persona of PERSONAS) {
    for (const t of b.tasks[persona]) {
      const extra = worldHomeMedResources(b.patient(t.patientId));
      if (extra.length > 0) t.todayResources.push(...extra);
    }
  }

  // Carry-over: drop today's discharges; anyone whose planned discharge passed without one stays a day longer.
  const dischargedToday = new Set(state.discharges.filter((d) => d.day === day && d.admissionId !== null).map((d) => d.admissionId));
  state.inpatients = state.inpatients.filter((ip) => !dischargedToday.has(ip.admissionId));
  for (const ip of state.inpatients) {
    if (ip.plannedDischargeDay <= day) {
      ip.plannedDischargeDay = day + 1;
      b.log(`length of stay extended: ${ip.patientId} (${ip.diagnosis})`);
    }
  }
  for (const a of state.appointments) {
    if (a.day <= day) {
      a.rescheduledFrom.push(a.day);
      a.day = day + 1;
    }
  }

  const schedules = perPersona((persona): DaySchedule => {
    const tasks = [...b.tasks[persona]].sort((x, y) => x.startMin - y.startMin || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
    return { day, persona, load: ctx.personaLoad[persona], tasks };
  });
  state.today.taskCounts = perPersona((p) => countTasks(schedules[p].tasks));
  state.today.events = b.events;
  return { state, schedules };
}

export interface WorldRun {
  seed: number;
  pop: PopIndex;
  initial: WorldState;
  days: DayOutput[];
}

/** Generate `days` days for a seed. Day d's output does not depend on how many days are generated. */
export function generateWorld(seed: number, days: number, patients: PatientProfile[]): WorldRun {
  const pop = worldPopulation(patients, seed);
  const initial = initialState(seed, pop);
  const out: DayOutput[] = [];
  let prev = initial;
  for (let d = 1; d <= days; d++) {
    const r = advanceDay(prev, pop);
    out.push(r);
    prev = r.state;
  }
  return { seed, pop, initial, days: out };
}

export { SHIFTS };
