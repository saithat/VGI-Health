/**
 * TEMPORARY hand-written MIRRORS of Lean-owned data formats.
 *
 * Source of truth: the Lean types (docs/design/core-model.md sections 2, 7, 8).
 * The Lean lane will emit `lean/generated/ehr-types.ts`; when it lands on
 * `origin/lane/lean-core`, merge it and replace this file with re-exports of
 * the generated types and validators. Do not add agent-owned types here.
 *
 * JSON conventions (Lean `deriving ToJson/FromJson`, checked against the
 * v4.35 deriving handler):
 * - nullary constructors serialize as strings ("kg", "ok");
 * - constructors with named arguments serialize as `{ "<ctor>": { <args> } }`;
 * - `Option` fields serialize as `null` (we also accept a missing key);
 * - products `(a × b)` serialize as 2-element arrays.
 *
 * The mirrors are deliberately a little tolerant (nullish options, future
 * component kinds) because the agent only reads these formats; the Lean
 * checker is the authority on validity.
 */
import { z } from 'zod';

const nat = z.number().int().nonnegative();
const str = z.string();
/** Lean `Option`: `null` on the wire; a missing key is accepted and normalized to `null`. */
const opt = <T extends z.ZodType>(schema: T) => schema.nullable().default(null);

// ---------------------------------------------------------------- spec (section 2)
export const roleSchema = z.enum(['physician', 'np', 'rn', 'surgeon']);
export const unitKindSchema = z.enum(['kg', 'lb', 'g', 'mg', 'mcg', 'mL', 'mgPerKg', 'units', 'none']);
export const prefillPolicySchema = z.enum(['never', 'recordConfirm', 'defaultConfirm', 'autoLinked']);
export const frictionSchema = z.enum(['safety', 'compliance', 'accidental']);
export const valueKindSchema = z.union([
  z.enum(['text', 'flag', 'identity', 'cosign']),
  z.object({ quantity: z.object({ unit: unitKindSchema }) }),
  z.object({ coded: z.object({ valueSet: str }) }),
  z.object({ scan: z.object({ target: str }) }),
]);
export const elementSpecSchema = z.object({
  id: str,
  label: str,
  kind: valueKindSchema,
  enteredBy: z.array(roleSchema),
  prefill: prefillPolicySchema,
  friction: frictionSchema,
  humanOnly: z.boolean().default(false),
  linkedFrom: opt(str),
  fhirTarget: str.default(''),
});
export const infoSpecSchema = z.object({ id: str, label: str, version: str.default('') });
export const commitSpecSchema = z.object({ id: str, label: str, roles: z.array(roleSchema) });
export const whenSchema = z.union([
  z.enum(['always', 'highAlertMed', 'abnormalResult']),
  z.object({ orderClass: z.object({ cls: str }) }),
  z.object({ medClass: z.object({ cls: str }) }),
]);
export const entryReqSchema = z.object({
  commit: str,
  element: str,
  when: whenSchema.default('always'),
  perOrderLine: z.boolean().default(false),
});
export const reviewModeSchema = z.union([
  z.literal('shownOnCommit'),
  z.object({ shownOrReceipt: z.object({ windowMin: nat, roles: z.array(roleSchema) }) }),
]);
export const reviewReqSchema = z.object({
  commit: str,
  info: str,
  mode: reviewModeSchema,
  when: whenSchema.default('always'),
});
export const alertCondSchema = z.enum([
  'drugAllergy', 'interaction', 'duplicateTherapy', 'doseOutOfRange', 'weightInLb', 'careGap', 'highAlertMed',
]);
export const tierSchema = z.enum(['interruptive', 'passive', 'removable']);
export const alertSpecSchema = z.object({
  id: str,
  label: str,
  cond: alertCondSchema,
  tier: tierSchema,
  commit: str,
  screens: z.array(str).default([]),
});
export const designRulesSchema = z.object({
  maxDepth: nat,
  minTextSize: nat,
  stabilityBudget: nat,
  landmarks: z.array(str),
  catalog: z.array(str),
});
export const specSchema = z.object({
  version: str,
  elements: z.array(elementSpecSchema),
  infos: z.array(infoSpecSchema),
  commits: z.array(commitSpecSchema),
  entries: z.array(entryReqSchema),
  reviews: z.array(reviewReqSchema),
  alerts: z.array(alertSpecSchema),
  design: designRulesSchema,
});

// ---------------------------------------------------------------- programs (section 2)
export const slotSchema = z.union([z.literal('current'), z.object({ fixed: z.object({ n: nat }) })]);
export const prefillSchema = z.union([
  z.literal('none'),
  z.object({ fromRecord: z.object({ fact: str }) }),
  z.object({ default: z.object({ value: str }) }),
  z.object({ linked: z.object({ element: str }) }),
]);
export const actionSchema = z.union([
  z.enum(['back', 'newOrderLine']),
  z.object({ goto: z.object({ screen: str }) }),
  z.object({ commit: z.object({ commit: str }) }),
  z.object({ markReviewed: z.object({ info: str }) }),
]);
export const visibilitySchema = z.union([z.literal('always'), z.object({ unlessReceipt: z.object({ info: str }) })]);
export const sizeSchema = z.enum(['normal', 'compact', 'tiny']);

const knownKindSchema = z.union([
  z.enum(['banner', 'tabs']),
  z.object({ field: z.object({ element: str, slot: slotSchema, prefill: prefillSchema }) }),
  z.object({ panel: z.object({ info: str }) }),
  z.object({ table: z.object({ info: str }) }),
  z.object({ trend: z.object({ info: str }) }),
  z.object({ alert: z.object({ alert: str, popup: z.boolean() }) }),
  z.object({ button: z.object({ action: actionSchema }) }),
  z.object({ group: z.object({ collapsible: z.boolean(), startCollapsed: z.boolean() }) }),
  z.object({ macro: z.object({ id: str }) }),
  z.object({ search: z.object({ scope: str }) }),
]);
/**
 * Kinds added by vendor releases (e.g. v1.1 `priorAuthStatus`) are not known
 * to this mirror yet; accept any single-constructor object so the agent can
 * carry them through. The Lean checker validates them.
 */
const futureKindSchema = z.record(str, z.unknown()).refine((o) => Object.keys(o).length === 1, {
  message: 'a component kind is a single constructor object',
});
export const kindSchema = z.union([knownKindSchema, futureKindSchema]);

export const componentSchema = z.object({
  id: str.min(1),
  kind: kindSchema,
  label: str.default(''),
  parent: opt(str),
  tab: nat.default(0),
  visibility: visibilitySchema.default('always'),
  size: sizeSchema.default('normal'),
  hotkey: opt(str),
  tag: str.default(''),
  copyOf: opt(str),
});
export const screenSchema = z.object({
  id: str.min(1),
  title: str,
  workflow: str,
  components: z.array(componentSchema),
});
export const macroStepSchema = z.union([
  z.object({ setValue: z.object({ comp: str, value: str }) }),
  z.object({ click: z.object({ comp: str }) }),
  z.object({ goto: z.object({ screen: str }) }),
]);
export const macroSchema = z.object({ id: str.min(1), label: str, steps: z.array(macroStepSchema) });
export const programSchema = z.object({
  id: str.min(1),
  version: nat,
  owner: str,
  role: roleSchema,
  specVersion: str,
  start: str,
  screens: z.array(screenSchema),
  macros: z.array(macroSchema),
});

// ---------------------------------------------------------------- events (section 2)
export const valueSchema = z.union([
  z.object({ qty: z.object({ tenths: nat, unit: unitKindSchema }) }),
  z.object({ code: z.object({ c: str }) }),
  z.object({ text: z.object({ s: str }) }),
  z.object({ flag: z.object({ b: z.boolean() }) }),
  z.object({ user: z.object({ u: str }) }),
]);
export const eventSchema = z.union([
  z.object({ click: z.object({ comp: str }) }),
  z.object({ selectTab: z.object({ comp: str, idx: nat }) }),
  z.object({ enter: z.object({ comp: str, value: valueSchema }) }),
  z.object({ confirm: z.object({ comp: str }) }),
  z.object({ ack: z.object({ alert: str }) }),
  z.object({ scroll: z.object({ screen: str }) }),
  z.object({ search: z.object({ query: str }) }),
]);
export const stepResultSchema = z.union([z.enum(['ok', 'ignored']), z.object({ blocked: z.object({ reason: str }) })]);

// ---------------------------------------------------------------- simulation (section 7)
export const workflowSchema = z.enum(['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7']);
export const orderChoiceSchema = z.object({
  drug: str,
  doseTenths: nat,
  unit: unitKindSchema,
  route: str,
  freq: str,
  indication: opt(str),
  prn: z.boolean().default(false),
});
export const taskChoicesSchema = z.object({
  orders: z.array(orderChoiceSchema).default([]),
  administer: z.array(orderChoiceSchema).default([]),
  ackResult: z.boolean().default(false),
  refill: opt(str),
  disposition: opt(str),
  immunizations: z.array(str).default([]),
  noteSections: z.array(str).default([]),
});
export const taskSchema = z.object({
  id: str,
  day: nat,
  persona: str,
  workflow: workflowSchema,
  patientId: str,
  startMin: nat,
  choices: taskChoicesSchema,
  todayResources: z.array(z.unknown()).default([]),
  interruptions: nat.default(0),
});
export const dayScheduleSchema = z.object({
  day: nat,
  persona: str,
  load: z.enum(['quiet', 'normal', 'busy']),
  tasks: z.array(taskSchema),
});
export const personaParamsSchema = z.object({
  id: str,
  role: roleSchema,
  keyboardShare: nat,
  reviewsAllergiesEarly: z.boolean(),
  scansSidebar: z.boolean(),
  backtrackRate: nat,
  searchWhenBuried: z.boolean(),
  overrideRate: nat,
});
export const opSchema = z.enum(['click', 'key', 'scroll', 'scan', 'point', 'think', 'wait']);
export const traceEventSchema = z.object({
  task: str,
  t: nat,
  screen: str,
  event: eventSchema,
  ops: z.array(opSchema),
  result: stepResultSchema,
});
export const taskMetricsSchema = z.object({
  task: str,
  clicks: nat,
  keystrokes: nat,
  scrolls: nat,
  popups: nat,
  overrides: nat,
  searches: nat,
  backtracks: nat,
  klmDeciSec: nat,
  completed: z.boolean(),
});
export const dayResultSchema = z.object({
  day: nat,
  persona: str,
  programVersion: nat,
  trace: z.array(traceEventSchema),
  tasks: z.array(taskMetricsSchema),
  floor: z.array(taskMetricsSchema),
  complaints: z.array(str),
});

// ---------------------------------------------------------------- checker (section 8)
export const violationSchema = z.object({
  property: str,
  message: str,
  counterexample: z.array(eventSchema),
  screens: z.array(str),
});
/** Lean: `inductive Verdict | ok | violation (property message counterexample screens)`. */
export const verdictSchema = z.union([z.literal('ok'), z.object({ violation: violationSchema })]);
export const certificateSchema = z.object({
  specVersion: str,
  specHash: str,
  programHash: str,
  verdict: verdictSchema,
  checkerVersion: str,
  time: z.union([str, nat]),
});

/**
 * ASSUMED format (not yet in the design doc): `ehr min-clicks` output.
 * One row per task of the given schedule; `clicks`/`keystrokes` are the exact
 * minimum over completing paths (T9).
 */
export const minClicksRowSchema = z.object({
  task: str,
  workflow: opt(str),
  clicks: nat,
  keystrokes: nat,
});
export const minClicksResultSchema = z.object({ tasks: z.array(minClicksRowSchema) });

export type Role = z.infer<typeof roleSchema>;
export type Spec = z.infer<typeof specSchema>;
export type ElementSpec = z.infer<typeof elementSpecSchema>;
export type Kind = z.infer<typeof kindSchema>;
export type Component = z.infer<typeof componentSchema>;
export type Screen = z.infer<typeof screenSchema>;
export type Macro = z.infer<typeof macroSchema>;
export type Program = z.infer<typeof programSchema>;
export type Event = z.infer<typeof eventSchema>;
export type Workflow = z.infer<typeof workflowSchema>;
export type Task = z.infer<typeof taskSchema>;
export type DaySchedule = z.infer<typeof dayScheduleSchema>;
export type PersonaParams = z.infer<typeof personaParamsSchema>;
export type TraceEvent = z.infer<typeof traceEventSchema>;
export type TaskMetrics = z.infer<typeof taskMetricsSchema>;
export type DayResult = z.infer<typeof dayResultSchema>;
export type Violation = z.infer<typeof violationSchema>;
export type Verdict = z.infer<typeof verdictSchema>;
export type Certificate = z.infer<typeof certificateSchema>;
export type MinClicksResult = z.infer<typeof minClicksResultSchema>;

export function violationOf(verdict: Verdict): Violation | null {
  return verdict === 'ok' ? null : verdict.violation;
}
