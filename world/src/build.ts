/**
 * Shared machinery for building one simulated day: id allocation, seeded
 * random streams, the patient picker, and task construction.
 */
import { PRIOR_AUTH_RELEASE_DAY } from "./releases";
import { SHIFTS } from "./calendar";
import { clinicalObservation, type ClinicalObservation } from "./fhir";
import type { PatientProfile } from "./patients";
import { hasAllergyClass } from "./patients";
import { Rng } from "./rng";
import type { Json, OrderChoice, Persona, Task, TaskChoices, Workflow } from "./schema";
import type { DayContext, WorldState } from "./state";

export interface PopIndex {
  all: PatientProfile[];
  byId: Map<string, PatientProfile>;
  adults: PatientProfile[];
  peds: PatientProfile[];
}

export function indexPopulation(patients: PatientProfile[]): PopIndex {
  const all = [...patients].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return {
    all,
    byId: new Map(all.map((p) => [p.id, p])),
    adults: all.filter((p) => p.ageYears >= 18),
    peds: all.filter((p) => p.ageYears < 18),
  };
}

/** A patient with at least one drug allergy (not food/environment). */
export function hasDrugAllergy(p: PatientProfile): boolean {
  return p.allergies.some((a) => a.classes.some((c) => c !== "food" && c !== "environment"));
}

export function isPcnAllergic(p: PatientProfile): boolean {
  return hasAllergyClass(p, "penicillin");
}

/**
 * Picks patients for today's encounters. Inpatients are never picked for
 * outpatient or ED work. Among the rest, the least-used-today patients are
 * preferred, so a large population gives distinct patients and a tiny test
 * population cycles. The allergy share biases toward allergic patients.
 */
export class Picker {
  private usage = new Map<string, number>();
  private blocked = new Set<string>();

  constructor(private readonly pop: PopIndex) {}

  block(id: string): void {
    this.blocked.add(id);
  }

  unblock(id: string): void {
    this.blocked.delete(id);
  }

  isBlocked(id: string): boolean {
    return this.blocked.has(id);
  }

  use(id: string): void {
    this.usage.set(id, (this.usage.get(id) ?? 0) + 1);
  }

  usedToday(id: string): number {
    return this.usage.get(id) ?? 0;
  }

  pick(rng: Rng, filter: (p: PatientProfile) => boolean, allergyShare?: number): PatientProfile | undefined {
    const candidates = this.pop.all.filter((p) => !this.blocked.has(p.id) && filter(p));
    if (candidates.length === 0) return undefined;
    const minUse = Math.min(...candidates.map((p) => this.usedToday(p.id)));
    const group = candidates.filter((p) => this.usedToday(p.id) === minUse);
    let pool = group;
    if (allergyShare !== undefined) {
      const allergic = group.filter(hasDrugAllergy);
      const other = group.filter((p) => !hasDrugAllergy(p));
      if (allergic.length > 0 && other.length > 0) pool = rng.chance(allergyShare) ? allergic : other;
    }
    const chosen = rng.pick(pool);
    this.use(chosen.id);
    return chosen;
  }
}

export interface ChoiceInput {
  orders?: OrderChoice[];
  administer?: OrderChoice[];
  ackResult?: boolean;
  refill?: "approve" | "deny" | "modify";
  disposition?: "admit" | "discharge" | "consult";
  immunizations?: string[];
  noteSections?: string[];
  painScore?: number;
  w6Step?: NonNullable<TaskChoices["w6Step"]>;
  refillReason?: string;
  observations?: ClinicalObservation[];
}

/** Build a `TaskChoices` with every defaulted field present and `none` options omitted. */
export function choices(c: ChoiceInput): TaskChoices {
  const out: TaskChoices = {
    orders: c.orders ?? [],
    administer: c.administer ?? [],
    ackResult: c.ackResult ?? false,
    immunizations: c.immunizations ?? [],
    noteSections: c.noteSections ?? [],
  };
  if (c.refill !== undefined) out.refill = c.refill;
  if (c.disposition !== undefined) out.disposition = c.disposition;
  if (c.painScore !== undefined) out.painScore = c.painScore;
  if (c.w6Step !== undefined) out.w6Step = c.w6Step;
  if (c.refillReason !== undefined) out.refillReason = c.refillReason;
  return out;
}

/** Mean interruptions per task by persona (BRIEF section 6 input styles). */
const INTERRUPTION_MEAN: Record<Persona, number> = { P1: 0.3, P2: 0.8, P3: 1.0, P4: 0.4, P5: 0.6 };

export class DayBuild {
  readonly tasks: Record<Persona, Task[]> = { P1: [], P2: [], P3: [], P4: [], P5: [] };
  readonly picker: Picker;
  readonly events: string[] = [];
  private seq: Record<Persona, number> = { P1: 0, P2: 0, P3: 0, P4: 0, P5: 0 };

  constructor(
    readonly day: number,
    readonly ctx: DayContext,
    readonly pop: PopIndex,
    readonly state: WorldState,
    readonly daySeed: string,
  ) {
    this.picker = new Picker(pop);
  }

  /** An independent random stream for one subsystem, so subsystems do not shift each other. */
  rng(label: string): Rng {
    return new Rng(`${this.daySeed}:${label}`);
  }

  nextId(prefix: string): string {
    const n = (this.state.counters[prefix] ?? 0) + 1;
    this.state.counters[prefix] = n;
    return `${prefix}-${String(n).padStart(4, "0")}`;
  }

  patient(id: string): PatientProfile {
    const p = this.pop.byId.get(id);
    if (p === undefined) throw new Error(`unknown patient ${id}`);
    return p;
  }

  log(msg: string): void {
    this.events.push(msg);
  }

  interruptions(persona: Persona, rng: Rng, scale = 1): number {
    return Math.min(6, rng.poisson(INTERRUPTION_MEAN[persona] * this.ctx.interruptionFactor * scale));
  }

  /** Create and register a task. `startMin` is clamped into the persona's shift. */
  addTask(
    persona: Persona,
    workflow: Workflow,
    patientId: string,
    startMin: number,
    c: ChoiceInput,
    todayResources: Json[],
    interruptions: number,
  ): Task {
    this.seq[persona] += 1;
    const id = `d${String(this.day).padStart(2, "0")}-${persona}-${workflow}-${String(this.seq[persona]).padStart(3, "0")}`;
    // Filter after scenario generation so release gating consumes no random draws.
    const orders = (c.orders ?? []).filter((o) =>
      this.day >= PRIOR_AUTH_RELEASE_DAY || (o.kind ?? "medication") === "medication");
    const task: Task = {
      id,
      day: this.day,
      persona,
      workflow,
      patientId,
      startMin: Math.max(0, Math.min(SHIFTS[persona].lengthMin, Math.round(startMin))),
      choices: choices({ ...c, orders }),
      todayResources: [...todayResources, ...(c.observations ?? []).map((o, i) => clinicalObservation(`${id}-clinical-${i}`, patientId, this.day, SHIFTS[persona].startClock + startMin, o))],
      interruptions,
    };
    this.tasks[persona].push(task);
    return task;
  }

  /** The id the next task for this persona will get (for cross-references made before creation). */
  peekTaskId(persona: Persona, workflow: Workflow): string {
    return `d${String(this.day).padStart(2, "0")}-${persona}-${workflow}-${String(this.seq[persona] + 1).padStart(3, "0")}`;
  }
}
