/**
 * World state, persisted per day as `runs/world/<seed>/state-day-<d>.json`.
 *
 * `state-day-d` is the world at the END of day d: what happened today
 * (`today`), plus everything carried into day d+1 (census, appointments,
 * pending labs, inbox backlog, surgical cases, pediatric growth). Day d+1
 * is a pure function of (seed, d+1, state-day-d). This format is owned by the
 * world lane (it is not a Lean type).
 */
import type { Weekday } from "./calendar";
import type { LabKey } from "./fhir";
import type { Load, OrderChoice, Persona, Workflow } from "./schema";

export interface DayContext {
  day: number;
  date: string;
  weekday: Weekday;
  week: number;
  monday: boolean;
  fluWeek: boolean;
  /** Scripted event: P1 covers urgent care (BRIEF section 9, day 5). */
  urgentCareDay: boolean;
  p5DayType: "clinic" | "or";
  /** Global volume factor (1 = an ordinary day). */
  volume: number;
  globalLoad: Load;
  /** Target share of drug-allergic patients among today's visits. */
  allergyShare: number;
  /** Share of ED triage weights typed in lb today. */
  lbShare: number;
  interruptionFactor: number;
  /** Per-persona volume factor and the load label derived from it (DaySchedule.load). */
  personaVolume: Record<Persona, number>;
  personaLoad: Record<Persona, Load>;
  scriptedEvents: string[];
}

export interface Regimen {
  fromDay: number;
  /** Clock time (minutes since midnight) the regimen takes effect. */
  fromClock: number;
  source: string;
  orders: OrderChoice[];
}

export interface Inpatient {
  patientId: string;
  admissionId: string;
  service: "medicine" | "surgery";
  admitDay: number;
  admitClock: number;
  source: "ed" | "surgical-consult" | "postop" | "initial";
  diagnosis: string;
  plannedDischargeDay: number;
  dischargeClock: number;
  room: string;
  weightKg: number;
  diabetic: boolean;
  regimens: Regimen[];
  /** Mean PRN analgesic doses per shift. */
  prnPerShift: number;
  caseId: string | null;
  /** Off the ward (pre-op holding, OR, PACU): scheduled doses are documented as delayed in these windows. */
  offWard: { day: number; fromClock: number; toClock: number }[];
  /** NPO until this clock on this day (before surgery). */
  npo: { day: number; untilClock: number }[];
}

export type AppointmentKind = "post-discharge" | "ed-followup" | "postop" | "recheck";

export interface Appointment {
  id: string;
  persona: "P1" | "P4" | "P5";
  patientId: string;
  day: number;
  kind: AppointmentKind;
  reason: string;
  createdDay: number;
  /** The discharge / ED visit / case / visit that created it. */
  sourceId: string;
  rescheduledFrom: number[];
}

export interface PendingLab {
  id: string;
  patientId: string;
  lab: LabKey;
  orderedDay: number;
  resultDay: number;
  recipient: "P1" | "P5";
  source: string;
  value: number;
  interpretation: "H" | "L" | "N" | "A";
  text: string | null;
  /** Orders the recipient places when acknowledging (fixed clinical choice). */
  followUp: OrderChoice[];
}

export interface RefillRequest {
  id: string;
  patientId: string;
  requestedDay: number;
  current: OrderChoice;
  decision: "approve" | "deny" | "modify";
  modified: OrderChoice | null;
  reason: string;
  labs: { lab: LabKey; value: number; interpretation: "H" | "L" | "N"; daysAgo: number }[];
  lastFilledDaysAgo: number;
}

export interface InboxItem {
  id: string;
  kind: "result" | "refill";
  patientId: string;
  arrivedDay: number;
  /** 0 = abnormal result, 1 = refill, 2 = normal result. */
  priority: number;
  lab: PendingLab | null;
  refill: RefillRequest | null;
}

export interface PedsChild {
  patientId: string;
  birthDate: string;
  gender: string;
  /** Weight anchor: kg on `anchorDay` (may be before day 1, from the record). */
  anchorKg: number;
  anchorDay: number;
  growthKgPerDay: number;
  lastVisitDay: number | null;
  /** Today's measured weight per sim day (kg, 0.1 kg). */
  weights: Record<string, number>;
  vaccinesGiven: { cvx: string; day: number }[];
}

export type CaseDiagnosis = "appendicitis" | "acute-cholecystitis" | "symptomatic-cholelithiasis" | "inguinal-hernia" | "umbilical-hernia";

export interface SurgicalCase {
  id: string;
  patientId: string;
  diagnosis: CaseDiagnosis;
  procedure: string;
  urgency: "urgent" | "elective";
  bookedDay: number;
  consultDay: number | null;
  consultClock: number | null;
  edTaskId: string | null;
  orDay: number;
  orStartClock: number | null;
  orEndClock: number | null;
  disposition: "overnight" | "same-day";
  complicated: boolean;
  admissionId: string | null;
  dischargeDay: number | null;
  stage: "booked" | "consulted" | "operated" | "discharged";
  postopVisitDay: number | null;
  p1FollowupDay: number | null;
}

export interface AdmissionRecord {
  id: string;
  patientId: string;
  day: number;
  clock: number;
  service: "medicine" | "surgery";
  source: Inpatient["source"];
  diagnosis: string;
  fromTaskId: string | null;
  caseId: string | null;
}

export interface DischargeRecord {
  id: string;
  patientId: string;
  day: number;
  clock: number;
  kind: "inpatient" | "same-day-surgery";
  service: "medicine" | "surgery";
  admissionId: string | null;
  caseId: string | null;
  followUps: string[];
  pendingLabs: string[];
  dischargeTaskId: string | null;
}

export interface EdVisit {
  taskId: string;
  patientId: string;
  arrivalClock: number;
  /** Scenario exogenous stages; actual provider/decision times are in workload output. */
  providerReadyClock?: number;
  admitDecisionClock?: number;
  bedDepartureClock?: number;
  boardingMin?: number;
  esi: number;
  scenario: string;
  orderSet: string;
  disposition: "admit" | "discharge" | "consult";
  weightUnit: "kg" | "lb";
  newAllergy: boolean;
  admissionId: string | null;
  caseId: string | null;
}

export interface ClinicDay {
  booked: number;
  seen: number;
  noShows: string[];
  addOns: string[];
  newPatients: number;
}

export interface WorldState {
  schemaVersion: 1;
  worldClock?: "continuous";
  /** ED beds still occupied at the next 07:00 boundary. */
  edCarry?: EdVisit[];
  seed: number;
  day: number;
  date: string;
  daySeed: string;
  prevStateHash: string | null;
  context: DayContext;
  today: {
    ed: { arrivals: EdVisit[]; peakCensus: number; boardersAtShiftStart: number };
    ward: {
      censusAtShiftStart: { patientId: string; room: string; service: string; admitDay: number; diagnosis: string }[];
      admissions: string[];
      discharges: string[];
    };
    clinics: { P1: ClinicDay; P4: ClinicDay; P5: ClinicDay };
    inbox: { P1: { arrived: number; handled: number; backlogAfter: number }; P5: { arrived: number; handled: number } };
    surgery: { consults: string[]; casesOperated: string[] };
    taskCounts: Record<Persona, Partial<Record<Workflow, number>>>;
    events: string[];
  };
  inpatients: Inpatient[];
  appointments: Appointment[];
  pendingLabs: PendingLab[];
  inboxBacklog: InboxItem[];
  peds: PedsChild[];
  surgicalCases: SurgicalCase[];
  p1Panel: string[];
  admissions: AdmissionRecord[];
  discharges: DischargeRecord[];
  counters: Record<string, number>;
}
