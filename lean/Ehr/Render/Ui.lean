import Ehr.Render.Page

/-! Semantic EHR rendering. This module and its imports use only Init.
The interpreter resolves visibility exactly once. Nesting consumes no item:
children whose container precedes them are placed in that container; malformed
out-of-order/orphan items remain visible at workspace level. Nothing is deduplicated.
-/
namespace Ehr.Render

/-- Empty program labels receive a readable label without changing their identity. -/
def uiLabel (s fallback : String) : String := if s = "" then fallback else s

def uiBanner (d : Display) : List (String × String) :=
  [("Patient", d.banner.name), ("DOB", d.banner.dob), ("MRN", d.banner.mrn),
   ("Age / sex", s!"{d.banner.ageYears} / {d.banner.sex}"),
   ("Language", d.banner.language), ("PCP", d.banner.pcp), ("Coverage", d.banner.coverage),
   ("Encounter", d.banner.encounterClass), ("Attending", d.banner.attending), ("Location", d.banner.location)]

def workflowLabel : String → String
  | "W1" => "Outpatient visit" | "W2" => "Results" | "W3" => "Emergency"
  | "W4" => "Inpatient MAR" | "W5" => "Pediatric visit" | "W6" => "Surgical day"
  | "W7" => "Refills" | "chart" | "shell" => "Chart review"
  | s => uiLabel s "Chart review"

/-- Group once by workflow, retaining every screen in declared program order. -/
def uiNav (prog : Program) : List (String × List (String × String)) :=
  ((prog.screens.map (·.workflow)).eraseDups).map fun w =>
    (workflowLabel w, (prog.screens.filter (·.workflow == w)).map fun sc =>
      (sc.id, uiLabel sc.title "Untitled screen"))

def uiSteps (cx : Ctx) : List (String × String) :=
  let workflow := ((cx.prog.screen? cx.s.screen).map (·.workflow)).getD ""
  (cx.prog.screens.filter (·.workflow == workflow)).map fun sc =>
    (sc.id, uiLabel sc.title "Untitled screen")

def allergyCells (r : AllergyRow) : List (String × String) :=
  [("Substance", r.substance), ("Reaction", r.reaction), ("Severity", r.severity),
   ("Status", r.status), ("Verification", r.verification), ("Recorded", r.recorded)]
def medCells (r : MedRow) : List (String × String) :=
  [("Medication", r.name), ("Instructions", r.sig), ("Status", r.status),
   ("Authored", r.authored), ("Prescriber", r.prescriber)]
def vitalCells (r : VitalRow) : List (String × String) :=
  [("Vital sign", r.name), ("Value", r.value), ("Unit", r.unit), ("Recorded", r.date)]
def problemCells (r : ProblemRow) : List (String × String) :=
  [("Problem", r.name), ("Code", r.code), ("Onset", r.onset), ("Abatement", r.abatement), ("Status", r.status)]

/-- All clinical records, without truncation. Payload contracts contribute their
clinical fields/rows, never a serialized payload, artifact key, or debug object. -/
def uiRows (cx : Ctx) (i : InfoId) : List (List (String × String)) :=
  match i with
  | "patientBanner" => [uiBanner cx.disp]
  | "allergyList" => cx.disp.allergies.map allergyCells
  | "currentMeds" => cx.disp.meds.map medCells
  | "vitals" => cx.disp.vitals.map vitalCells
  | "problemList" => cx.disp.problems.map problemCells
  | "labs" | "labResults" | "resultTrend" => cx.disp.labs.flatMap fun r =>
      [("Test", r.name), ("Value", r.value), ("Unit", r.unit), ("Range", r.refRange),
       ("Recorded", r.date), ("Abnormal", toString r.abnormal)] ::
      r.trend.map (fun p => [("Test", r.name), ("Recorded", p.date),
        ("Value", s!"{p.hundredths / 100}.{p.hundredths % 100}"), ("Unit", r.unit)])
  | "anticoagulants" | "anticoagulantList" =>
      (cx.disp.meds.filter fun r => inClass r.drug "anticoagulant" || inClass r.drug "antiplatelet").map medCells
  | "immunizations" | "immunizationHistory" => cx.disp.immunizations.map fun r =>
      [("Vaccine", r.vaccine), ("CVX", r.cvx), ("Date", r.date), ("Status", r.status)]
  | "encounters" | "encounterHistory" => cx.disp.encounters.map fun r =>
      [("Encounter", r.encType), ("Class", r.encClass), ("Start", r.start),
       ("End", r.stop), ("Reason", r.reason), ("Provider", r.provider), ("Location", r.location)]
  | "procedures" => cx.disp.procedures.map fun r =>
      [("Procedure", r.name), ("Code", r.code), ("Date", r.date), ("Status", r.status)]
  | "growthChart" => cx.disp.growth.map fun r =>
      [("Date", r.date), ("Age (months)", toString r.ageMonths),
       ("Weight (kg)", (r.weightTenths?.map valueTextQty).getD ""),
       ("Height (cm)", (r.heightTenths?.map valueTextQty).getD "")]
  | "doseCheck" =>
      [("Weight for dose check", (weightKgTenths? cx.facts cx.s).map (fun w => valueTextQty w ++ " kg")
        |>.getD "No confirmed kg weight available")] ::
      (orderLines cx.s).map fun (n, drug) => [("Line", toString (n + 1)), ("Drug", drug),
        ("Dose check", if doseOutOfRange cx.facts cx.s n drug then "OUT OF RANGE" else "No out-of-range flag")]
  | "careGaps" => cx.facts.careGaps.map fun g => [("Care gap", g)]
  | "priorAuthStatus" => [[("Prior authorization", if (capturedAt? cx.s priorAuthElement cx.s.currentSlot).isSome
      then "Requested" else "Not requested")]]
  | _ => match infoPayload cx.facts i with
    | none => []
    | some p => (if p.fields.isEmpty then [] else [p.fields]) ++ p.rows.map (·.fields)
where
  valueTextQty (n : Nat) : String := s!"{n / 10}.{n % 10}"

def uiEnabled (cx : Ctx) (id : String) : Bool := cx.v.enabled.contains id

def uiBlocked (cx : Ctx) (id : String) : Option String :=
  if uiEnabled cx id then none
  else some (uiLabel (blockedReason cx id) "Action unavailable")

def uiButton (cx : Ctx) (it : ItemView) (role : String) : UiNode :=
  .button it.comp.id (uiLabel it.comp.label "Action") role (uiEnabled cx it.comp.id)
    (uiBlocked cx it.comp.id) it.comp.hotkey?

def actionRole : Action → String
  | .commit _ => "primary" | .goto _ | .back => "nav" | _ => "secondary"

def uiField (cx : Ctx) (it : ItemView) (e : ElementId) : UiNode :=
  let kind := ((cx.sp.element? e).map (·.kind)).getD .text
  let (vk, _, want) := fieldKind kind
  let unit := match it.value? with | some (.qty _ u) => u | _ => want
  .field it.comp.id (uiLabel it.comp.label "Clinical entry") vk.name (it.value?.map valueText)
    (if unit == .none then none else some (unitName unit))
    it.provenance? it.pendingConfirm it.humanOnly
    (cx.sp.entries.any fun r => r.element == e && whenHolds cx.facts cx.s r.when)

def uiInfo (cx : Ctx) (comp label i display : String) : UiNode :=
  .info comp (uiLabel label (uiLabel (infoLabel cx i) "Clinical information")) i display (uiRows cx i)

/-- Render one shown item and its already-visible children. No visibility test
is repeated here. Confirm buttons retain the field's id for Event.confirm. -/
def uiItem (cx : Ctx) (it : ItemView) (kids : List UiNode) : List UiNode :=
  match it.comp.kind with
  | .banner => [uiInfo cx it.comp.id it.comp.label "patientBanner" "summary"]
  | .field e _ _ => uiField cx it e ::
      if it.pendingConfirm then
        [.button it.comp.id "Confirm prefilled value" "confirm" (uiEnabled cx it.comp.id)
          (uiBlocked cx it.comp.id) none] else []
  | .panel i | .priorAuth i => [uiInfo cx it.comp.id it.comp.label i "list"]
  | .table i => [uiInfo cx it.comp.id it.comp.label i "table"]
  | .trend i => [uiInfo cx it.comp.id it.comp.label i "trend"]
  | .button a => [uiButton cx it (actionRole a)]
  | .«macro» _ => [uiButton cx it "macro"]
  | .search _ => [.field it.comp.id (uiLabel it.comp.label "Search chart") "search" none none none false false false]
  | .alert a _ => [.alert it.comp.id a
      (uiLabel (((cx.sp.alert? a).map (·.label)).getD it.comp.label) "Clinical alert")
      (match (cx.sp.alert? a).map (·.tier) with
       | some Tier.interruptive => "interruptive" | some Tier.passive => "passive" | _ => "removable")]
  | .group coll _ => [.section it.comp.id (uiLabel it.comp.label "Section")
      ((if coll then [uiButton cx it "toggle"] else []) ++ if it.expanded then kids else [])]
  | .tabs =>
      let siblings := cx.v.items.filter (·.comp.parent? == some it.comp.id)
      let indices := (siblings.map (·.comp.tab)).eraseDups
      -- Labels occupy their actual tab indexes, including sparse indexes.
      let count := indices.foldl (fun n i => max n (i + 1)) 0
      let labels := (List.range count).map fun n =>
        uiLabel ((siblings.find? (·.comp.tab == n)).map (·.comp.label) |>.getD "") s!"Tab {n + 1}"
      [.tabs it.comp.id labels it.selectedTab kids]

/-- A pending branch retains its parent's identity until that parent is rendered. -/
structure UiBranch where
  parent : Option CompId
  nodes : List UiNode

def uiTakesChildren (it : ItemView) : Bool :=
  match it.comp.kind with | .group _ _ => it.expanded | .tabs => true | _ => false

/-- Folding from the end preserves each shown item exactly once, including
orphans and malformed component order. Duplicate panels/labels are retained. -/
def uiNest (cx : Ctx) (it : ItemView) (rest : List UiBranch) : List UiBranch :=
  let take := fun b : UiBranch => uiTakesChildren it && b.parent == some it.comp.id
  let kids := (rest.filter take).flatMap (·.nodes)
  { parent := it.comp.parent?, nodes := uiItem cx it kids } :: rest.filter (fun b => !take b)

def uiComponents (cx : Ctx) : List UiNode :=
  (((cx.v.items.filter (·.shown)).foldr (uiNest cx) []).flatMap (·.nodes))

/-- Clinical sidebar, never identity/debug transport metadata. No row limit. -/
def uiSide (cx : Ctx) : List UiNode :=
  [uiInfo cx "" "Allergies" "allergyList" "summary",
   uiInfo cx "" "Active medications" "currentMeds" "summary",
   uiInfo cx "" "Problems" "problemList" "summary",
   uiInfo cx "" "Recent vitals" "vitals" "summary"]

/-- Passive/unknown alerts cannot become modals, even in a malformed state.
Only the matching Event.ack is accepted by the interpreter while a popup is open. -/
def uiModal (cx : Ctx) : Option UiNode := do
  let (a, _) ← cx.v.popup?
  let rule ← cx.sp.alert? a
  if rule.tier == .passive then none else
    some (.section a (uiLabel rule.label "Clinical alert")
      [.text (uiLabel rule.label "Clinical alert"),
       .button a "Acknowledge" "ack" true none none])

def uiWorkspace (cx : Ctx) : List UiNode :=
  let steps := uiSteps cx
  .stepper steps ((steps.map (·.1)).idxOf cx.s.screen) :: uiComponents cx

/-- The actual semantic UI sent to the browser. Banner fields are first in the
wire record; component banners become info nodes, never a second landmark. -/
def renderUi (sp : Spec) (prog : Program) (facts : Facts) (disp : Display)
    (user : User) (s : State) : UiScreen :=
  let cx : Ctx := { sp, prog, facts, disp, user, s }
  { banner := uiBanner disp, nav := uiNav prog, title := cx.v.title,
    workspace := uiWorkspace cx, side := uiSide cx, modal := uiModal cx }

end Ehr.Render
