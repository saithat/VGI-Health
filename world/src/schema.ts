import { ArrivalSchema, ShiftSchema } from "./timing/schema";
/**
 * zod schemas for the simulation formats the world generator emits.
 *
 * These validate the Lean types in Ehr/Core/Types.lean and Json.lean
 * (`Workflow`, `UnitKind`, `OrderChoice`, `TaskChoices`, `Task`, `DaySchedule`,
 * `PersonaParams`). Lean is the single source of truth. Enum values come from
 * generated TS; test/synthea.test.ts round-trips every real-population schedule
 * through Lean’s actual derived FromJson/ToJson to detect contract drift.
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
import { WorkflowValues, UnitKindValues, RoleValues, OrderKindValues, W6StepValues } from "../../lean/generated/ehr-types";

/** Lean `Nat`. */
export const Nat = z.number().int().nonnegative();

/** Lean `Option α` as a structure field: omitted, or null, means `none`. */
const opt = <T extends z.ZodType>(t: T) => t.nullable().optional();

/** `inductive Workflow | W1 | W2 | W3 | W4 | W5 | W6 | W7` (BRIEF section 5). */
export const WorkflowSchema = z.enum(WorkflowValues);
export type Workflow = z.infer<typeof WorkflowSchema>;
export const WORKFLOWS: readonly Workflow[] = WorkflowSchema.options;

/** `inductive UnitKind | kg | lb | g | mg | mcg | mL | mgPerKg | units | none`. */
export const UnitKindSchema = z.enum(UnitKindValues);
export type UnitKind = z.infer<typeof UnitKindSchema>;

/** `inductive Role | physician | np | rn | surgeon`. */
export const RoleSchema = z.enum(RoleValues);
export type Role = z.infer<typeof RoleSchema>;

/** Persona ids "P1" … "P5" (Lean: `String`). */
export const PersonaSchema = z.enum(["P1", "P2", "P3", "P4", "P5"]);
export type Persona = z.infer<typeof PersonaSchema>;
export const PERSONAS: readonly Persona[] = PersonaSchema.options;

/**
 * `structure OrderChoice`: one clinical decision, fixed per scenario and
 * independent of the UI.
 *
 * `drug`: the lowercase generic formulary name, as defined in lean/Ehr/Formulary.lean.
 */
export const AdministrationDecisionSchema = z.strictObject({
  outcome: z.enum(["given", "held", "refused", "notGiven", "delayed"]),
  reason: z.string().min(1),
  occurrence: z.string().min(1),
  scheduledMin: Nat,
  windowEndMin: Nat,
  attemptMin: Nat,
  windowStartMin: opt(Nat),
  administeredMin: opt(Nat),
  chartedMin: opt(Nat),
  reoffer: z.boolean(),
  notifyPrescriber: z.boolean(),
}).superRefine((a, ctx) => {
  if (a.windowEndMin < a.scheduledMin || a.attemptMin < (a.windowStartMin ?? a.scheduledMin) ||
      ((a.outcome === "given" || a.outcome === "delayed") && a.attemptMin > a.windowEndMin)) {
    ctx.addIssue({ code: "custom", message: "Administration attempt outside its declared window" });
  }
  if (a.windowStartMin != null && (a.windowStartMin !== Math.max(0, a.scheduledMin - (a.windowEndMin - a.scheduledMin)) ||
      ![30, 60, 120].includes(a.windowEndMin - a.scheduledMin) ||
      a.chartedMin == null || a.chartedMin < a.attemptMin ||
      (a.outcome === "given" ? a.administeredMin !== a.attemptMin : a.administeredMin != null))) {
    ctx.addIssue({ code: "custom", message: "Distinct administration and charting times required" });
  }
});
export type AdministrationDecision = z.infer<typeof AdministrationDecisionSchema>;

export const OrderChoiceSchema = z.strictObject({
  drug: z.string(),
  kind: opt(z.enum(OrderKindValues)),
  code: opt(z.string().min(1)),
  doseTenths: Nat,
  unit: UnitKindSchema,
  route: z.string(),
  freq: z.string(),
  supplyDays: opt(Nat),
  curesExemptReason: opt(z.string().min(1)),
  holdReason: opt(z.string().min(1)),
  administration: opt(AdministrationDecisionSchema),
  indication: opt(z.string().min(1)),
  prn: z.boolean(),
}).superRefine((o, ctx) => {
  if (o.holdReason != null && o.administration != null) {
    ctx.addIssue({ code: "custom", message: "Order hold and administration decision must be separate" });
  }
  const service = o.kind === "imaging" || o.kind === "procedure";
  if (service ? o.drug !== "" || !o.code || o.doseTenths !== 0 || o.unit !== "none" || o.route !== "" || o.freq !== "" || o.prn || o.supplyDays != null || o.curesExemptReason != null || o.holdReason != null || o.administration != null : o.drug === "" || o.route === "" || o.freq === "") {
    ctx.addIssue({ code: "custom", message: "Expected a medication or a coded, nondrug service order" });
  }
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
  painScore: opt(Nat.max(10)),
  w6Step: opt(z.enum(W6StepValues)),
  refillReason: opt(z.string().min(1)),
});
export type TaskChoices = z.infer<typeof TaskChoicesSchema>;

/** `Lean.Json`: any JSON value. */
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
export const JsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(JsonSchema), z.record(z.string(), JsonSchema)]),
);

export const WorkflowPlanSchema = z.strictObject({
  kind: z.enum(["refill", "alert", "advice", "result", "call", "consult", "chart", "pharmacy", "dispensing", "reconciliation", "prescription", "coordination"]),
  owner: z.string().min(1), delegateTo: opt(z.string().min(1)), delegateAccepted: z.boolean(),
  phaseMs: Nat, responseWaitMs: Nat,
});
export type WorkflowPlan = z.infer<typeof WorkflowPlanSchema>;

/** `structure Task`. */
export const TaskSchema = z.strictObject({
  id: z.string().min(1),
  day: Nat,
  persona: PersonaSchema,
  workflow: WorkflowSchema,
  patientId: z.string().min(1),
  startMin: Nat,
  timing: ArrivalSchema.exactOptional(),
  workflowPlan: WorkflowPlanSchema.exactOptional(),
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
  clockMode: z.enum(["continuous", "legacy"]).exactOptional(),
  shifts: z.array(ShiftSchema).exactOptional(),
});
export type DaySchedule = z.infer<typeof DayScheduleSchema>;

/** Persona behavior JSON; optional bounded supplements are parsed separately from Lean Core. */
export const PersonaParamsSchema = z.strictObject({
  id: z.string().min(1),
  role: RoleSchema,
  keyboardShare: Nat,
  reviewsAllergiesEarly: z.boolean(),
  scansSidebar: z.boolean(),
  backtrackRate: Nat,
  searchWhenBuried: z.boolean(),
  overrideRate: Nat,
  policy: z.enum(["expert", "bounded"]).exactOptional(),
  hiddenPreferences: z.object({
    placements: z.array(z.object({tag:z.string(),nearTag:z.string(),weight:Nat})),
    changeSensitivity: Nat,
  }).exactOptional(),
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
