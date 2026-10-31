/**
 * Cross-persona world events: admissions, discharges (which create follow-up
 * appointments and pending labs), appointments, and lab results.
 */
import type { DayBuild, PopIndex } from "../build";
import { URGENT_CARE_DAY, p5DayType } from "../context";
import { type LabKey, labDef } from "../fhir";
import type { PatientProfile } from "../patients";
import type { Rng } from "../rng";
import type { OrderChoice } from "../schema";
import type { Appointment, AppointmentKind, DischargeRecord, Inpatient, PendingLab } from "../state";

/** Ward census cap: realistic ward size, scaled down for tiny test populations (so outpatients remain). */
export function maxCensus(pop: PopIndex): number {
  return Math.max(1, Math.min(16, Math.floor(pop.adults.length * 0.3)));
}

export function canAdmit(b: DayBuild): boolean {
  return b.state.inpatients.filter((ip) => ip.plannedDischargeDay > b.day || ip.admitDay === b.day).length < maxCensus(b.pop);
}

export function isInpatient(b: DayBuild, patientId: string): boolean {
  return b.state.inpatients.some((ip) => ip.patientId === patientId && ip.plannedDischargeDay >= b.day);
}

function allocateRoom(b: DayBuild, service: "medicine" | "surgery"): string {
  const prefix = service === "medicine" ? "4W" : "5S";
  const used = new Set(b.state.inpatients.map((ip) => ip.room));
  for (let n = 1; n <= 40; n++) {
    const room = `${prefix}-${String(n).padStart(2, "0")}`;
    if (!used.has(room)) return room;
  }
  return `${prefix}-overflow-${b.state.inpatients.length}`;
}

export interface AdmitArgs {
  patient: PatientProfile;
  clock: number;
  service: "medicine" | "surgery";
  source: Inpatient["source"];
  diagnosis: string;
  losNights: number;
  regimen: OrderChoice[];
  regimenSource: string;
  prnPerShift: number;
  caseId: string | null;
  fromTaskId: string | null;
  weightKg: number;
  diabetic: boolean;
}

export function admit(b: DayBuild, a: AdmitArgs, rng: Rng): Inpatient {
  const id = b.nextId("adm");
  const ip: Inpatient = {
    patientId: a.patient.id,
    admissionId: id,
    service: a.service,
    admitDay: b.day,
    admitClock: a.clock,
    source: a.source,
    diagnosis: a.diagnosis,
    plannedDischargeDay: b.day + Math.max(1, a.losNights),
    dischargeClock: rng.int(11 * 60, 15 * 60),
    room: allocateRoom(b, a.service),
    weightKg: a.weightKg,
    diabetic: a.diabetic,
    regimens: [{ fromDay: b.day, fromClock: a.clock, source: a.regimenSource, orders: a.regimen }],
    prnPerShift: a.prnPerShift,
    caseId: a.caseId,
    offWard: [],
    npo: [],
  };
  b.state.inpatients.push(ip);
  b.state.admissions.push({
    id,
    patientId: a.patient.id,
    day: b.day,
    clock: a.clock,
    service: a.service,
    source: a.source,
    diagnosis: a.diagnosis,
    fromTaskId: a.fromTaskId,
    caseId: a.caseId,
  });
  b.state.today.ward.admissions.push(id);
  b.picker.block(a.patient.id);
  b.log(`admit ${a.patient.id} (${a.diagnosis}) to ${a.service} ${ip.room}, planned discharge day ${ip.plannedDischargeDay}`);
  return ip;
}

/** First P5 clinic day on or after `day`. */
export function nextP5ClinicDay(day: number): number {
  let d = day;
  while (p5DayType(d) !== "clinic") d++;
  return d;
}

export function addAppointment(
  b: DayBuild,
  persona: Appointment["persona"],
  patientId: string,
  day: number,
  kind: AppointmentKind,
  reason: string,
  sourceId: string,
): Appointment {
  const rescheduledFrom: number[] = [];
  let d = day;
  if (persona === "P1" && d === URGENT_CARE_DAY) {
    rescheduledFrom.push(d);
    d += 1; // P1 is covering urgent care that day
  }
  if (persona === "P5" && kind === "postop") d = nextP5ClinicDay(d);
  const appt: Appointment = { id: b.nextId("appt"), persona, patientId, day: d, kind, reason, createdDay: b.day, sourceId, rescheduledFrom };
  b.state.appointments.push(appt);
  return appt;
}

const VALUE_RANGES: Record<LabKey, { normal: [number, number]; high?: [number, number]; low?: [number, number] }> = {
  potassium: { normal: [3.7, 4.9], high: [5.3, 6.1], low: [2.9, 3.3] },
  creatinine: { normal: [0.7, 1.15], high: [1.5, 2.6] },
  a1c: { normal: [5.0, 5.5], high: [6.6, 9.8] },
  ldl: { normal: [62, 96], high: [118, 192] },
  inr: { normal: [0.9, 1.1], high: [3.4, 4.8], low: [1.3, 1.8] },
  hemoglobin: { normal: [12.6, 15.8], low: [8.4, 11.2] },
  wbc: { normal: [5.0, 9.8], high: [12.4, 17.8] },
  glucose: { normal: [76, 98], high: [128, 265] },
  sodium: { normal: [136, 143], low: [127, 133] },
  tsh: { normal: [0.8, 3.6], high: [5.2, 11.5] },
  bloodCulture: { normal: [0, 0] },
  pathology: { normal: [0, 0] },
};

export interface LabResult {
  value: number;
  interpretation: "H" | "L" | "N" | "A";
}

/** A lab value: normal, or abnormal in the given (or the lab's usual) direction. */
export function labValue(rng: Rng, key: LabKey, abnormal: boolean, direction?: "H" | "L"): LabResult {
  const def = labDef(key);
  if (def.text !== undefined) return { value: 0, interpretation: abnormal ? "A" : "N" };
  const r = VALUE_RANGES[key];
  let range = r.normal;
  let interpretation: LabResult["interpretation"] = "N";
  if (abnormal) {
    const dir = direction ?? (r.high !== undefined ? "H" : "L");
    const rr = dir === "H" ? r.high : r.low;
    if (rr !== undefined) {
      range = rr;
      interpretation = dir;
    }
  }
  const scale = 10 ** def.decimals;
  return { value: Math.round(rng.real(range[0], range[1]) * scale) / scale, interpretation };
}

/** INR for a patient on warfarin: therapeutic (2-3), high, or low; all flagged H against the lab range. */
export function warfarinInr(rng: Rng, kind: "therapeutic" | "high" | "low"): LabResult {
  const range: [number, number] = kind === "therapeutic" ? [2.1, 2.9] : kind === "high" ? [3.4, 4.8] : [1.4, 1.8];
  return { value: Math.round(rng.real(range[0], range[1]) * 10) / 10, interpretation: "H" };
}

export interface LabArgs {
  patientId: string;
  lab: LabKey;
  resultDay: number;
  recipient: "P1" | "P5";
  source: string;
  result: LabResult;
  text?: string;
  followUp?: OrderChoice[];
}

export function addPendingLab(b: DayBuild, a: LabArgs): PendingLab {
  const lab: PendingLab = {
    id: b.nextId("lab"),
    patientId: a.patientId,
    lab: a.lab,
    orderedDay: b.day,
    resultDay: a.resultDay,
    recipient: a.recipient,
    source: a.source,
    value: a.result.value,
    interpretation: a.result.interpretation,
    text: a.text ?? null,
    followUp: a.followUp ?? [],
  };
  b.state.pendingLabs.push(lab);
  return lab;
}

/** P1 follow-up day after a discharge (3-6 days later; never the urgent-care day). */
export function p1FollowupDay(rng: Rng, day: number): number {
  return day + rng.int(3, 6);
}

/**
 * Discharge an inpatient: records it and creates its follow-ups (always a P1
 * visit; a P5 post-op visit for surgical patients) and, for medical
 * patients, pending labs that land in P1's in-basket on later days.
 */
export function dischargeInpatient(b: DayBuild, ip: Inpatient, clock: number, taskId: string | null, rng: Rng): DischargeRecord {
  ip.plannedDischargeDay = b.day;
  ip.dischargeClock = clock;
  const id = b.nextId("dc");
  const followUps: string[] = [];
  const pendingLabs: string[] = [];
  followUps.push(addAppointment(b, "P1", ip.patientId, p1FollowupDay(rng, b.day), "post-discharge", `hospital follow-up: ${ip.diagnosis}`, id).id);
  if (ip.service === "surgery") {
    followUps.push(addAppointment(b, "P5", ip.patientId, b.day + rng.int(5, 8), "postop", `post-op check: ${ip.diagnosis}`, id).id);
  } else {
    const labs: LabKey[] = rng.chance(0.5) ? ["potassium", "hemoglobin"] : ["creatinine"];
    if (/pneumonia|cellulitis|pyelo|sepsis/i.test(ip.diagnosis)) labs.push("bloodCulture");
    for (const key of labs) {
      const abnormal = rng.chance(key === "bloodCulture" ? 0.1 : 0.35);
      pendingLabs.push(
        addPendingLab(b, {
          patientId: ip.patientId,
          lab: key,
          resultDay: b.day + (key === "bloodCulture" ? rng.int(2, 4) : rng.int(1, 2)),
          recipient: "P1",
          source: `discharge ${id}`,
          result: labValue(rng, key, abnormal),
        }).id,
      );
    }
  }
  const rec: DischargeRecord = {
    id,
    patientId: ip.patientId,
    day: b.day,
    clock,
    kind: "inpatient",
    service: ip.service,
    admissionId: ip.admissionId,
    caseId: ip.caseId,
    followUps,
    pendingLabs,
    dischargeTaskId: taskId,
  };
  b.state.discharges.push(rec);
  b.state.today.ward.discharges.push(id);
  b.log(`discharge ${ip.patientId} (${ip.diagnosis}) day ${b.day}; follow-ups ${followUps.join(", ")}`);
  return rec;
}

/** Discharge after same-day surgery: P5 post-op visit (and P1 if on P1's panel). */
export function dischargeSameDay(b: DayBuild, patientId: string, caseId: string, procedure: string, clock: number, taskId: string, rng: Rng): DischargeRecord {
  const id = b.nextId("dc");
  const followUps = [addAppointment(b, "P5", patientId, b.day + rng.int(7, 10), "postop", `post-op check: ${procedure}`, id).id];
  if (b.state.p1Panel.includes(patientId) && rng.chance(0.5)) {
    followUps.push(addAppointment(b, "P1", patientId, p1FollowupDay(rng, b.day) + 3, "post-discharge", `post-surgery check-in: ${procedure}`, id).id);
  }
  const rec: DischargeRecord = {
    id,
    patientId,
    day: b.day,
    clock,
    kind: "same-day-surgery",
    service: "surgery",
    admissionId: null,
    caseId,
    followUps,
    pendingLabs: [],
    dischargeTaskId: taskId,
  };
  b.state.discharges.push(rec);
  b.log(`same-day discharge ${patientId} after ${procedure}`);
  return rec;
}

/** The regimen in effect for an inpatient at (day, clock). */
export function activeOrders(ip: Inpatient, day: number, clock: number): OrderChoice[] {
  let current: OrderChoice[] = [];
  for (const r of ip.regimens) {
    if (r.fromDay < day || (r.fromDay === day && r.fromClock <= clock)) current = r.orders;
  }
  return current;
}

export function setRegimen(ip: Inpatient, day: number, clock: number, source: string, orders: OrderChoice[]): void {
  ip.regimens.push({ fromDay: day, fromClock: clock, source, orders });
  ip.regimens.sort((a, b) => a.fromDay - b.fromDay || a.fromClock - b.fromClock);
}
