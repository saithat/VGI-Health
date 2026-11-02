/**
 * MOCK-ONLY legacy fixture types for docs/design/core-model.md §2, §4–5.
 * The real painter/session use generated Event/Value/StepOutput; these schemas
 * describe only the explicitly selected development mock, including its old
 * ScreenView binding representation. Do not use them to decode real Lean output.
 * Constructors with arguments use Lean's constructor-keyed derived JSON;
 * Option uses null and products use pairs. Nat is a nonnegative integer.
 * ItemView's underspecified field binding is made explicit below; confirm
 * its field names against the first Lean export before connecting WASM.
 */
import { z } from "zod";

const nat = z.number().int().nonnegative();
const id = z.string().min(1);
const ctor = <T extends z.ZodRawShape>(shape: T) => z.strictObject(shape);
export const roleSchema = z.enum(["physician", "np", "rn", "surgeon"]);
export const unitKindSchema = z.enum([
  "kg",
  "lb",
  "g",
  "mg",
  "mcg",
  "mL",
  "mgPerKg",
  "units",
  "none",
]);
export const prefillPolicySchema = z.enum([
  "never",
  "recordConfirm",
  "defaultConfirm",
  "autoLinked",
]);
export const frictionSchema = z.enum(["safety", "compliance", "accidental"]);
export const valueKindSchema = z.union([
  ctor({ quantity: ctor({ unit: unitKindSchema }) }),
  ctor({ coded: ctor({ valueSet: z.string() }) }),
  z.enum(["text", "flag", "identity", "cosign"]),
  ctor({ scan: ctor({ target: z.string() }) }),
]);
export const elementSpecSchema = ctor({
  id,
  label: z.string(),
  kind: valueKindSchema,
  enteredBy: z.array(roleSchema),
  prefill: prefillPolicySchema,
  friction: frictionSchema,
  humanOnly: z.boolean(),
  linkedFrom: id.nullable(),
  fhirTarget: z.string(),
});
export const infoSpecSchema = ctor({
  id,
  label: z.string(),
  version: z.string(),
});
export const commitSpecSchema = ctor({
  id,
  label: z.string(),
  roles: z.array(roleSchema),
});
export const whenSchema = z.union([
  z.enum(["always", "highAlertMed", "abnormalResult"]),
  ctor({ orderClass: ctor({ cls: z.string() }) }),
  ctor({ medClass: ctor({ cls: z.string() }) }),
]);
export const reviewModeSchema = z.union([
  z.literal("shownOnCommit"),
  ctor({
    shownOrReceipt: ctor({ windowMin: nat, roles: z.array(roleSchema) }),
  }),
]);
export const entryReqSchema = ctor({
  commit: id,
  element: id,
  when: whenSchema,
  perOrderLine: z.boolean(),
});
export const reviewReqSchema = ctor({
  commit: id,
  info: id,
  mode: reviewModeSchema,
  when: whenSchema,
});
export const alertCondSchema = z.enum([
  "drugAllergy",
  "interaction",
  "duplicateTherapy",
  "doseOutOfRange",
  "weightInLb",
  "careGap",
  "highAlertMed",
]);
export const tierSchema = z.enum(["interruptive", "passive", "removable"]);
export const alertSpecSchema = ctor({
  id,
  label: z.string(),
  cond: alertCondSchema,
  tier: tierSchema,
  commit: id,
  screens: z.array(z.string()),
});
export const designRulesSchema = ctor({
  maxDepth: nat,
  minTextSize: nat,
  stabilityBudget: nat,
  landmarks: z.array(id),
  catalog: z.array(z.string()),
});
export const specSchema = ctor({
  version: z.string(),
  elements: z.array(elementSpecSchema),
  infos: z.array(infoSpecSchema),
  commits: z.array(commitSpecSchema),
  entries: z.array(entryReqSchema),
  reviews: z.array(reviewReqSchema),
  alerts: z.array(alertSpecSchema),
  design: designRulesSchema,
});
export const slotSchema = z.union([
  z.literal("current"),
  ctor({ fixed: ctor({ n: nat }) }),
]);
export const prefillSchema = z.union([
  z.literal("none"),
  ctor({ fromRecord: ctor({ fact: z.string() }) }),
  ctor({ default: ctor({ value: z.string() }) }),
  ctor({ linked: ctor({ element: id }) }),
]);
export const actionSchema = z.union([
  z.enum(["back", "newOrderLine"]),
  ctor({ goto: ctor({ screen: id }) }),
  ctor({ commit: ctor({ commit: id }) }),
  ctor({ markReviewed: ctor({ info: id }) }),
]);
export const visibilitySchema = z.union([
  z.literal("always"),
  ctor({ unlessReceipt: ctor({ info: id }) }),
]);
export const sizeSchema = z.enum(["normal", "compact", "tiny"]);
export const kindSchema = z.union([
  z.enum(["banner", "tabs"]),
  ctor({
    field: ctor({ element: id, slot: slotSchema, prefill: prefillSchema }),
  }),
  ctor({ panel: ctor({ info: id }) }),
  ctor({ table: ctor({ info: id }) }),
  ctor({ trend: ctor({ info: id }) }),
  ctor({ alert: ctor({ alert: id, popup: z.boolean() }) }),
  ctor({ button: ctor({ action: actionSchema }) }),
  ctor({
    group: ctor({ collapsible: z.boolean(), startCollapsed: z.boolean() }),
  }),
  ctor({ macro: ctor({ id }) }),
  ctor({ search: ctor({ scope: z.string() }) }),
]);
export const componentSchema = ctor({
  id,
  kind: kindSchema,
  label: z.string(),
  parent: id.nullable(),
  tab: nat,
  visibility: visibilitySchema,
  size: sizeSchema,
  hotkey: z.string().nullable(),
  tag: z.string(),
  copyOf: id.nullable(),
});
export const screenSchema = ctor({
  id,
  title: z.string(),
  workflow: z.string(),
  components: z.array(componentSchema),
});
export const macroStepSchema = z.union([
  ctor({ setValue: ctor({ comp: id, value: z.string() }) }),
  ctor({ click: ctor({ comp: id }) }),
  ctor({ goto: ctor({ screen: id }) }),
]);
export const macroSchema = ctor({
  id,
  label: z.string(),
  steps: z.array(macroStepSchema),
});
export const programSchema = ctor({
  id,
  version: nat,
  owner: id,
  role: roleSchema,
  specVersion: z.string(),
  start: id,
  screens: z.array(screenSchema),
  macros: z.array(macroSchema),
});
export const drugInfoSchema = ctor({
  code: z.string(),
  name: z.string(),
  classes: z.array(z.string()),
  minMgPerKgTenths: nat,
  maxMgPerKgTenths: nat,
  highAlert: z.boolean(),
  interactsWith: z.array(z.string()),
});
export const patientIdentitySchema = ctor({
  initials: z.string(),
  sex: z.string(),
  ageYears: nat,
});
export const factsSchema = ctor({
  patientId: id,
  identity: patientIdentitySchema,
  allergyVersion: nat,
  allergyClasses: z.array(z.string()),
  medsVersion: nat,
  notesVersion: nat.default(0),
  historyVersion: nat.default(0),
  currentMedClasses: z.array(z.string()),
  weightToday: z.tuple([nat, unitKindSchema]).nullable(),
  careGaps: z.array(z.string()),
  abnormalResult: z.boolean(),
  now: nat,
});
export const valueSchema = z.union([
  ctor({ qty: ctor({ tenths: nat, unit: unitKindSchema }) }),
  ctor({ code: ctor({ c: z.string() }) }),
  ctor({ text: ctor({ s: z.string() }) }),
  ctor({ flag: ctor({ b: z.boolean() }) }),
  ctor({ user: ctor({ u: z.string() }) }),
]);
export const actorSchema = z.enum(["human", "macro"]);
export const capturedSchema = ctor({
  element: id,
  slot: nat,
  value: valueSchema,
  byHuman: z.boolean(),
  confirmed: z.boolean(),
  provenance: z.string().nullable(),
});
export const receiptSchema = ctor({
  info: id,
  dataVersion: nat,
  time: nat,
  role: roleSchema,
  user: id,
});
export const userSchema = ctor({ id, role: roleSchema });
export const stateSchema = ctor({
  screen: id,
  history: z.array(id),
  captured: z.array(capturedSchema),
  receipts: z.array(receiptSchema),
  acked: z.array(z.tuple([id, z.string()])),
  commits: z.array(id),
  expanded: z.array(id),
  tabSel: z.array(z.tuple([id, nat])),
  searchQueries: z.array(z.tuple([id, z.string()])).optional(),
  popup: z.tuple([id, z.string()]).nullable(),
  currentSlot: nat,
  clock: nat,
});
export const eventSchema = z.union([
  ctor({ click: ctor({ comp: id }) }),
  ctor({ selectTab: ctor({ comp: id, idx: nat }) }),
  ctor({ enter: ctor({ comp: id, value: valueSchema }) }),
  ctor({ confirm: ctor({ comp: id }) }),
  ctor({ ack: ctor({ alert: id }) }),
  ctor({ scroll: ctor({ screen: id }) }),
  ctor({ search: ctor({ query: z.string() }) }),
]);
// §4 leaves these record field names open. Keep this one adapter seam visible.
export const fieldBindingSchema = ctor({
  value: valueSchema,
  provenance: z.string().nullable(),
  pendingConfirm: z.boolean(),
});
export const itemViewSchema = ctor({
  component: componentSchema,
  shown: z.boolean(),
  depth: nat,
  expanded: z.boolean(),
  selectedTab: nat,
  bound: fieldBindingSchema.nullable(),
  alertActive: z.boolean(),
});
export const screenViewSchema = ctor({
  screen: id,
  title: z.string(),
  items: z.array(itemViewSchema),
  enabled: z.array(id),
  blocked: z.array(z.tuple([id, z.string()])),
  popup: z.tuple([id, z.string()]).nullable(),
}).superRefine((view, context) => {
  const ids = view.items.map((item) => item.component.id);
  if (new Set(ids).size !== ids.length)
    context.addIssue({ code: "custom", message: "Duplicate component IDs" });
});
export const stepResultSchema = z.union([
  z.enum(["ok", "ignored"]),
  ctor({ blocked: ctor({ reason: z.string() }) }),
]);
export const stepResponseSchema = ctor({
  state: stateSchema,
  result: stepResultSchema,
});

export type ElementId = string;
export type InfoId = string;
export type CommitId = string;
export type AlertId = string;
export type ScreenId = string;
export type CompId = string;
export type MacroId = string;
export type UserId = string;
export type Role = z.infer<typeof roleSchema>;
export type UnitKind = z.infer<typeof unitKindSchema>;
export type PrefillPolicy = z.infer<typeof prefillPolicySchema>;
export type Friction = z.infer<typeof frictionSchema>;
export type ValueKind = z.infer<typeof valueKindSchema>;
export type ElementSpec = z.infer<typeof elementSpecSchema>;
export type InfoSpec = z.infer<typeof infoSpecSchema>;
export type CommitSpec = z.infer<typeof commitSpecSchema>;
export type When = z.infer<typeof whenSchema>;
export type EntryReq = z.infer<typeof entryReqSchema>;
export type ReviewMode = z.infer<typeof reviewModeSchema>;
export type ReviewReq = z.infer<typeof reviewReqSchema>;
export type AlertCond = z.infer<typeof alertCondSchema>;
export type Tier = z.infer<typeof tierSchema>;
export type AlertSpec = z.infer<typeof alertSpecSchema>;
export type DesignRules = z.infer<typeof designRulesSchema>;
export type Spec = z.infer<typeof specSchema>;
export type Slot = z.infer<typeof slotSchema>;
export type Prefill = z.infer<typeof prefillSchema>;
export type Action = z.infer<typeof actionSchema>;
export type Visibility = z.infer<typeof visibilitySchema>;
export type Size = z.infer<typeof sizeSchema>;
export type Kind = z.infer<typeof kindSchema>;
export type Component = z.infer<typeof componentSchema>;
export type Screen = z.infer<typeof screenSchema>;
export type MacroStep = z.infer<typeof macroStepSchema>;
export type Macro = z.infer<typeof macroSchema>;
export type Program = z.infer<typeof programSchema>;
export type DrugInfo = z.infer<typeof drugInfoSchema>;
export type PatientIdentity = z.infer<typeof patientIdentitySchema>;
export type Facts = z.infer<typeof factsSchema>;
export type Value = z.infer<typeof valueSchema>;
export type Actor = z.infer<typeof actorSchema>;
export type Captured = z.infer<typeof capturedSchema>;
export type Receipt = z.infer<typeof receiptSchema>;
export type User = z.infer<typeof userSchema>;
export type State = z.infer<typeof stateSchema>;
export type Event = z.infer<typeof eventSchema>;
export type ItemView = z.infer<typeof itemViewSchema>;
export type ScreenView = z.infer<typeof screenViewSchema>;
export type StepResult = z.infer<typeof stepResultSchema>;
