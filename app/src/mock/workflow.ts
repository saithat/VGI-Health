import {
  factsSchema,
  programSchema,
  screenViewSchema,
  specSchema,
  type Component,
  type ElementSpec,
  type Kind,
  type ScreenView,
  type ValueKind,
} from "../core/types";

function component(
  id: string,
  kind: Kind,
  label: string,
  parent: string | null = null,
  tab = 0,
): Component {
  return {
    id,
    kind,
    label,
    parent,
    tab,
    visibility: "always",
    size: "compact",
    hotkey: null,
    tag: id,
    copyOf: null,
  };
}
function field(
  id: string,
  label: string,
  parent: string | null = null,
  prefill: Component["kind"] = {
    field: { element: id, slot: "current", prefill: "none" },
  },
) {
  return component(id, prefill, label, parent);
}
function goto(id: string, screen: string, label: string) {
  return component(id, { button: { action: { goto: { screen } } } }, label);
}
function info(id: string, infoId: string, label: string) {
  return component(id, { table: { info: infoId } }, label);
}
const banner = () =>
  component("patient-banner", "banner", "Patient identification");
const rooming: Component[] = [
  banner(),
  component("visit-tabs", "tabs", "Encounter activities"),
  component(
    "intake-section",
    { group: { collapsible: false, startCollapsed: false } },
    "Rooming & intake",
    "visit-tabs",
    0,
  ),
  field("chiefComplaint", "Chief complaint", "intake-section"),
  field("weight", "Weight today", "intake-section", {
    field: {
      element: "weight",
      slot: "current",
      prefill: { fromRecord: { fact: "weightToday" } },
    },
  }),
  field("painScore", "Pain score (0–10)", "intake-section"),
  field("tobacco", "Tobacco use", "intake-section"),
  field("depression", "PHQ-2 screening", "intake-section"),
  field("interpreter", "Interpreter requested", "intake-section"),
  component(
    "history-section",
    { group: { collapsible: false, startCollapsed: false } },
    "History & prevention",
    "visit-tabs",
    1,
  ),
  component(
    "history-immunizations",
    { table: { info: "immunizations" } },
    "Immunization history",
    "history-section",
  ),
  component(
    "history-encounters",
    { table: { info: "encounters" } },
    "Prior encounters",
    "history-section",
  ),
  component(
    "medication-section",
    { group: { collapsible: true, startCollapsed: false } },
    "Medication reconciliation",
  ),
  component(
    "medication-table",
    { table: { info: "currentMeds" } },
    "Active medications",
    "medication-section",
  ),
  field("medReconciliation", "Reconciliation notes", "medication-section"),
  info("allergy-list", "allergyList", "Allergies & reactions"),
  component(
    "review-allergies",
    { button: { action: { markReviewed: { info: "allergyList" } } } },
    "Mark allergies reviewed",
  ),
  component("vitals-table", { table: { info: "vitals" } }, "Vitals · today"),
  component(
    "care-gap-preview",
    { alert: { alert: "care-gap", popup: false } },
    "Synthetic example · care gaps: retinal eye exam and colorectal screening overdue",
  ),
  goto("rooming-next", "documentation", "Continue to documentation →"),
];
const documentation: Component[] = [
  banner(),
  component(
    "note-template",
    { macro: { id: "visit-template" } },
    "Insert follow-up template",
  ),
  field("hpi", "History of present illness"),
  field("ros", "Review of systems"),
  field("exam", "Physical examination"),
  field("assessment", "Assessment"),
  field("plan", "Plan"),
  field("diagnosis", "Encounter diagnosis"),
  info("note-problems", "problemList", "Longitudinal problem list"),
  component(
    "note-labs",
    { trend: { info: "resultTrend" } },
    "Hemoglobin A1c · longitudinal trend",
  ),
  goto("documentation-back", "rooming", "← Rooming"),
  goto("documentation-next", "orders", "Continue to orders →"),
];
const orders: Component[] = [
  banner(),
  component(
    "order-search",
    { search: { scope: "Medication & laboratory catalog" } },
    "Search orders",
  ),
  component(
    "order-favorites",
    { macro: { id: "diabetes-followup" } },
    "Diabetes follow-up order favorites",
  ),
  component(
    "med-order",
    { group: { collapsible: true, startCollapsed: false } },
    "Medication order composer · draft",
  ),
  ...[
    ["drug", "Medication"],
    ["dose", "Dose"],
    ["route", "Route"],
    ["frequency", "Frequency"],
    ["duration", "Duration (days)"],
    ["quantity", "Quantity"],
    ["refills", "Refills"],
    ["indication", "Indication / diagnosis"],
    ["pharmacy", "Destination pharmacy"],
    ["substitution", "Allow generic substitution"],
    ["prn", "As needed"],
    ["prnReason", "PRN indication"],
  ].map(([id, label]) => field(id ?? "", label ?? "", "med-order")),
  info("orders-allergies", "allergyList", "Allergy history"),
  info("orders-meds", "currentMeds", "Current therapy"),
  component(
    "lab-order",
    { group: { collapsible: true, startCollapsed: true } },
    "Laboratory orders & diagnosis association",
  ),
  field("lab", "Laboratory test", "lab-order"),
  field("labDiagnosis", "Associated diagnosis", "lab-order"),
  goto("orders-back", "documentation", "← Documentation"),
  goto("orders-next", "sign", "Review & sign →"),
];
const sign: Component[] = [
  banner(),
  info("sign-allergies", "allergyList", "Allergies"),
  info("sign-meds", "currentMeds", "Medication review"),
  component("sign-trend", { trend: { info: "resultTrend" } }, "Recent results"),
  field("levelOfService", "Level of service"),
  field("followup", "Follow-up interval"),
  field("instructions", "Patient instructions"),
  field("patientIdReentry", "Re-enter patient identity"),
  component(
    "sign-orders",
    { button: { action: { commit: { commit: "signOrders" } } } },
    "Sign orders",
  ),
  component(
    "sign-note",
    { button: { action: { commit: { commit: "signNote" } } } },
    "Sign note & close encounter",
  ),
  goto("sign-back", "orders", "← Back to orders"),
];
const chartPages = [
  ["results", "Results", "resultTrend", "trend"],
  ["medications", "Medications", "currentMeds", "table"],
  ["problems", "Problem List", "problemList", "table"],
  ["allergies", "Allergies", "allergyList", "table"],
  ["immunizations", "Immunizations", "immunizations", "table"],
  ["vitals", "Vitals / Flowsheet", "vitals", "table"],
  ["growth", "Growth Chart", "growthChart", "trend"],
  ["encounters", "Encounters", "encounters", "table"],
] as const;
const screenInputs = [
  { id: "rooming", title: "Rooming", workflow: "W1", components: rooming },
  {
    id: "documentation",
    title: "Visit documentation",
    workflow: "W1",
    components: documentation,
  },
  { id: "orders", title: "Orders", workflow: "W1", components: orders },
  { id: "sign", title: "Review & sign", workflow: "W1", components: sign },
  ...chartPages.map(([id, title, infoId, kind]) => ({
    id,
    title,
    workflow: "W1",
    components: [
      banner(),
      component(
        `${id}-info`,
        kind === "trend"
          ? { trend: { info: infoId } }
          : { table: { info: infoId } },
        title,
      ),
      goto(`${id}-return`, "rooming", "Return to encounter"),
    ],
  })),
];
// Navigation itself is also a program action, so the shell emits click events.
export const activityLinks = [
  ["rooming", "Chart History"],
  ["results", "Results"],
  ["medications", "Medications"],
  ["problems", "Problem List"],
  ["allergies", "Allergies"],
  ["immunizations", "Immunizations"],
  ["vitals", "Vitals / Flowsheet"],
  ["growth", "Growth Chart"],
  ["documentation", "Notes"],
  ["orders", "Orders"],
  ["encounters", "Encounters"],
] as const;
const screens = screenInputs.map((screen) => {
  const [landmark, ...contents] = screen.components;
  if (!landmark) throw new Error("Mock screen requires a landmark");
  return {
    ...screen,
    components: [
      landmark,
      ...activityLinks.map(([target, label]) =>
        component(
          `activity-${target}`,
          { button: { action: { goto: { screen: target } } } },
          label,
        ),
      ),
      ...contents,
    ],
  };
});
export const mockProgram = programSchema.parse({
  id: "w1-outpatient-preview",
  version: 0,
  owner: "P1",
  role: "physician",
  specVersion: "preview-only",
  start: "rooming",
  screens,
  macros: [
    { id: "visit-template", label: "Follow-up template", steps: [] },
    { id: "diabetes-followup", label: "Diabetes follow-up", steps: [] },
  ],
});
const coded = (valueSet: string): ValueKind => ({ coded: { valueSet } });
const quantity = (unit: "kg" | "mg" | "none"): ValueKind => ({
  quantity: { unit },
});
const elementInputs: [string, string, ValueKind, boolean][] = [
  ["chiefComplaint", "Chief complaint", "text", false],
  ["weight", "Weight today", quantity("kg"), false],
  ["painScore", "Pain score", quantity("none"), false],
  ["tobacco", "Tobacco use", coded("tobacco"), false],
  ["depression", "PHQ-2 screening", coded("phq2"), false],
  ["interpreter", "Interpreter requested", "flag", false],
  ["medReconciliation", "Reconciliation notes", "text", false],
  ...["hpi", "ros", "exam", "assessment", "plan", "diagnosis"].map(
    (id): [string, string, ValueKind, boolean] => [
      id,
      id.toUpperCase(),
      "text",
      false,
    ],
  ),
  ["drug", "Medication", coded("medications"), false],
  ["dose", "Dose", quantity("mg"), false],
  ["route", "Route", coded("route"), false],
  ["frequency", "Frequency", coded("frequency"), false],
  ["duration", "Duration", quantity("none"), false],
  ["quantity", "Quantity", quantity("none"), false],
  ["refills", "Refills", quantity("none"), false],
  ["indication", "Indication", "text", false],
  ["pharmacy", "Pharmacy", coded("pharmacy"), false],
  ["substitution", "Generic substitution", "flag", false],
  ["prn", "As needed", "flag", false],
  ["prnReason", "PRN indication", "text", false],
  ["lab", "Laboratory test", coded("labs"), false],
  ["labDiagnosis", "Associated diagnosis", "text", false],
  ["levelOfService", "Level of service", coded("service"), false],
  ["followup", "Follow-up interval", "text", false],
  ["instructions", "Patient instructions", "text", false],
  ["patientIdReentry", "Patient identity", "identity", true],
];
const elements: ElementSpec[] = elementInputs.map(
  ([id, label, kind, humanOnly]) => ({
    id,
    label,
    kind,
    enteredBy: ["physician", "np", "rn", "surgeon"],
    humanOnly,
    prefill: id === "weight" ? "recordConfirm" : "never",
    friction: humanOnly ? "safety" : "compliance",
    linkedFrom: null,
    fhirTarget: id === "weight" ? "Observation.valueQuantity" : "",
  }),
);
export const mockSpec = specSchema.parse({
  version: "preview-only",
  elements,
  infos: [],
  commits: [],
  entries: [],
  reviews: [],
  alerts: [],
  design: {
    maxDepth: 4,
    minTextSize: 12,
    stabilityBudget: 0,
    landmarks: ["patientBanner"],
    catalog: [
      "banner",
      "field",
      "panel",
      "table",
      "trend",
      "alert",
      "button",
      "group",
      "tabs",
      "macro",
      "search",
    ],
  },
});
export const mockFacts = factsSchema.parse({
  patientId: "sample-patient",
  identity: { initials: "AM", sex: "female", ageYears: 58 },
  allergyVersion: 0,
  allergyClasses: [],
  medsVersion: 0,
  currentMedClasses: [],
  weightToday: null,
  careGaps: [],
  abnormalResult: false,
  now: 0,
});
export const mockViews: ScreenView[] = mockProgram.screens.map((screen) =>
  screenViewSchema.parse({
    screen: screen.id,
    title: screen.title,
    items: screen.components.map((comp) => ({
      component: comp,
      shown: true,
      depth: comp.parent ? 1 : 0,
      expanded:
        typeof comp.kind === "object" && "group" in comp.kind
          ? !comp.kind.group.startCollapsed
          : false,
      selectedTab: 0,
      bound:
        comp.id === "weight"
          ? {
              value: { qty: { tenths: 824, unit: "kg" } },
              provenance: "Observation/weight · rooming RN · 2026-10-31 09:12",
              pendingConfirm: true,
            }
          : null,
      alertActive: comp.id === "care-gap-preview",
    })),
    // Static development affordances, not a computed safety decision.
    enabled: screen.components
      .filter(
        (comp) =>
          ![
            "sign-orders",
            "sign-note",
            "review-allergies",
            "note-template",
            "order-favorites",
          ].includes(comp.id),
      )
      .map((comp) => comp.id),
    blocked: screen.components
      .filter((comp) =>
        [
          "sign-orders",
          "sign-note",
          "review-allergies",
          "note-template",
          "order-favorites",
        ].includes(comp.id),
      )
      .map((comp) => [
        comp.id,
        "Lean WASM required. This preview cannot sign, create receipts, or execute macros.",
      ]),
    popup: null,
  }),
);

// Value sets are display reference data; the interpreter owns admissibility.
export const mockValueSets: Record<string, { value: string; label: string }[]> =
  {
    tobacco: ["Never", "Former", "Current"].map((value) => ({
      value,
      label: value,
    })),
    phq2: ["0 — Negative", "1", "2", "3", "4", "5", "6"].map((value) => ({
      value,
      label: value,
    })),
    medications: [
      "Metformin ER 500 mg tablet",
      "Lisinopril 10 mg tablet",
      "Atorvastatin 20 mg tablet",
    ].map((value) => ({ value, label: value })),
    route: ["Oral", "Topical", "Subcutaneous", "Intramuscular"].map(
      (value) => ({ value, label: value }),
    ),
    frequency: ["Daily", "Twice daily", "At bedtime", "Every 6 hours"].map(
      (value) => ({ value, label: value }),
    ),
    pharmacy: ["Northside Community Pharmacy", "Central Mail Order"].map(
      (value) => ({ value, label: value }),
    ),
    labs: [
      "Hemoglobin A1c",
      "Comprehensive metabolic panel",
      "Lipid panel",
      "Urine albumin / creatinine",
    ].map((value) => ({ value, label: value })),
    service: ["99213 — Established patient", "99214 — Established patient"].map(
      (value) => ({ value, label: value }),
    ),
  };
