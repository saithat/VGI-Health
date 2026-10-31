/**
 * zod schemas for the simulation formats the world generator emits.
 *
 * These MIRROR the Lean types in docs/design/core-model.md section 7
 * (`Workflow`, `UnitKind`, `OrderChoice`, `TaskChoices`, `Task`, `DaySchedule`,
 * `PersonaParams`). The Lean types are the single source of truth. This file is
 * a temporary hand-written mirror (core-model.md section 6) and must be
 * replaced by, or checked against, the TS/zod generated from Lean once lane A
 * emits it.
 *
 * JSON conventions (Lean derived `ToJson`/`FromJson`):
 * - Enum constructors serialize as plain strings ("W1", "mgPerKg").
 * - `Nat` is a non-negative integer.
 * - `Option α` fields are omitted when `none`. We also accept `null`, which
 *   Lean's `FromJson (Option α)` reads as `none`.
 * - Fields with a Lean default (`:= []`, `:= false`, `:= 0`) are still always
 *   emitted, because derived `FromJson` does not fill in defaults for missing
 *   keys. The schemas therefore require them.
 * - Objects are strict: an unknown key is a drift from the Lean type.
 */
import { z } from "zod";

/** Lean `Nat`. */
export const Nat = z.number().int().nonnegative();

/** Lean `Option α` as a structure field: omitted, or null, means `none`. */
const opt = <T extends z.ZodType>(t: T) => t.nullable().optional();

/** `inductive Workflow | W1 | W2 | W3 | W4 | W5 | W6 | W7` (BRIEF section 5). */
export const WorkflowSchema = z.enum(["W1", "W2", "W3", "W4", "W5", "W6", "W7"]);
export type Workflow = z.infer<typeof WorkflowSchema>;
export const WORKFLOWS: readonly Workflow[] = WorkflowSchema.options;

/** `inductive UnitKind | kg | lb | g | mg | mcg | mL | mgPerKg | units | none`. */
export const UnitKindSchema = z.enum(["kg", "lb", "g", "mg", "mcg", "mL", "mgPerKg", "units", "none"]);
export type UnitKind = z.infer<typeof UnitKindSchema>;

/** `inductive Role | physician | np | rn | surgeon`. */
export const RoleSchema = z.enum(["physician", "np", "rn", "surgeon"]);
export type Role = z.infer<typeof RoleSchema>;

/** Persona ids "P1" … "P5" (Lean: `String`). */
export const PersonaSchema = z.enum(["P1", "P2", "P3", "P4", "P5"]);
export type Persona = z.infer<typeof PersonaSchema>;
export const PERSONAS: readonly Persona[] = PersonaSchema.options;

/**
 * `structure OrderChoice`: one clinical decision, fixed per scenario and
 * independent of the UI.
 *
 * `drug`: the core-model comment says "RxNorm code from the formulary"; the
 * world lane was asked to emit lowercase generic names (see
 * `formulary.ts`, which also carries the RxNorm ingredient code for each).
 */
export const OrderChoiceSchema = z.strictObject({
  drug: z.string().min(1),
  doseTenths: Nat,
  unit: UnitKindSchema,
  route: z.string().min(1),
  freq: z.string().min(1),
  indication: opt(z.string().min(1)),
  prn: z.boolean(),
});
export type OrderChoice = z.infer<typeof OrderChoiceSchema>;

/** `structure TaskChoices`. */
export const TaskChoicesSchema = z.strictObject({
  orders: z.array(OrderChoiceSchema),
  administer: z.array(OrderChoiceSchema),
  ackResult: z.boolean(),
  refill: opt(z.enum(["approve", "deny", "modify"])),
  disposition: opt(z.enum(["admit", "discharge", "consult"])),
  immunizations: z.array(z.string().min(1)),
  noteSections: z.array(z.string().min(1)),
});
export type TaskChoices = z.infer<typeof TaskChoicesSchema>;

/** `Lean.Json`: any JSON value. */
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
export const JsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(JsonSchema), z.record(z.string(), JsonSchema)]),
);

/** `structure Task`. */
export const TaskSchema = z.strictObject({
  id: z.string().min(1),
  day: Nat,
  persona: PersonaSchema,
  workflow: WorkflowSchema,
  patientId: z.string().min(1),
  startMin: Nat,
  choices: TaskChoicesSchema,
  todayResources: z.array(JsonSchema),
  interruptions: Nat,
});
export type Task = z.infer<typeof TaskSchema>;

/** Day load label (Lean: `String`, "quiet" | "normal" | "busy"). */
export const LoadSchema = z.enum(["quiet", "normal", "busy"]);
export type Load = z.infer<typeof LoadSchema>;

/** `structure DaySchedule`. */
export const DayScheduleSchema = z.strictObject({
  day: Nat,
  persona: PersonaSchema,
  load: LoadSchema,
  tasks: z.array(TaskSchema),
});
export type DaySchedule = z.infer<typeof DayScheduleSchema>;

/** `structure PersonaParams` (behavior, not clinical choices). Not emitted by the world yet. */
export const PersonaParamsSchema = z.strictObject({
  id: z.string().min(1),
  role: RoleSchema,
  keyboardShare: Nat,
  reviewsAllergiesEarly: z.boolean(),
  scansSidebar: z.boolean(),
  backtrackRate: Nat,
  searchWhenBuried: z.boolean(),
  overrideRate: Nat,
});
export type PersonaParams = z.infer<typeof PersonaParamsSchema>;

/**
 * Stricter check used on every resource the world puts in `todayResources`:
 * a FHIR R4 resource object with a `resourceType` and an `id`.
 */
export const FhirResourceSchema = z.looseObject({
  resourceType: z.string().min(1),
  id: z.string().min(1),
});

/** Build a record keyed by persona, evaluating `f` in P1..P5 order (deterministic). */
export function perPersona<T>(f: (p: Persona) => T): Record<Persona, T> {
  const p1 = f("P1");
  const p2 = f("P2");
  const p3 = f("P3");
  const p4 = f("P4");
  const p5 = f("P5");
  return { P1: p1, P2: p2, P3: p3, P4: p4, P5: p5 };
}
