import Ehr.Core.Navigation
import Ehr.Render.Presentations

/-! Semantic EHR rendering. This module and its imports use only Init.
The interpreter resolves visibility exactly once. Nesting consumes no item:
children whose container precedes them are placed in that container; malformed
out-of-order/orphan items remain visible at workspace level. Nothing is deduplicated.
-/
namespace Ehr.Render

/-- Empty program labels receive a readable label without changing their identity. -/
def uiLabel (s fallback : String) : String := if s = "" then fallback else s

def uiBanner (d : Display) : List (String × String) :=
  [("Patient", d.banner.name), ("DOB", uiDate d.banner.dob), ("MRN", d.banner.mrn),
   ("Age / sex", s!"{d.banner.ageYears} / {d.banner.sex}"),
   ("Language", d.banner.language), ("PCP", d.banner.pcp), ("Coverage", d.banner.coverage),
   ("Encounter", d.banner.encounterClass), ("Attending", d.banner.attending), ("Location", d.banner.location)]

/-- Clinical banner content comes from Lean, so the painter need not infer it.
An unavailable code status is explicit, never silently treated as full code. -/
def uiClinicalBanner (facts : Facts) (d : Display) : List (String × String) :=
  uiBanner d ++
    [("Allergies", if d.allergies.isEmpty then "No allergy records on file"
      else "; ".intercalate (d.allergies.map (fun r => r.substance ++
        (if r.reaction == "" then "" else " — " ++ r.reaction) ++
        (if r.status == "" then "" else " (" ++ r.status ++ ")")))),
     ("Code status", uiLabel ((facts.record.lookup "codeStatus").getD "") "Not recorded")]

/-- Overview uses public activities and navigator sections, retaining every screen. -/
def uiOverviewNav (prog : Program) : List (String × List (String × String)) :=
  ((prog.screens.map (fun sc => (navigatorNames sc).1)).eraseDups).map fun activity =>
    (activity, (prog.screens.filter (fun sc => (navigatorNames sc).1 == activity)).map fun sc =>
      (sc.id, uiLabel (navigatorNames sc).2 "Untitled screen"))

def uiSteps (cx : Ctx) : List (String × String) :=
  let workflow := ((cx.prog.screen? cx.s.screen).map (·.workflow)).getD ""
  (cx.prog.screens.filter (·.workflow == workflow)).map fun sc =>
    (sc.id, uiLabel (navigatorNames sc).2 "Untitled screen")

/-- Fixed-point results retain their two decimal places (e.g. 4.05, not 4.5). -/
def uiHundredths (n : Nat) : String :=
  s!"{n / 100}.{if n % 100 < 10 then "0" else ""}{n % 100}"

def allergyCells (r : AllergyRow) : List (String × String) :=
  [("Substance", r.substance), ("Reaction", r.reaction), ("Severity", r.severity),
   ("Status", r.status), ("Verification", r.verification), ("Recorded", uiDate r.recorded)]
def medCells (r : MedRow) : List (String × String) :=
  [("Medication", r.name), ("Instructions", r.sig), ("Status", r.status),
   ("Authored", uiDate r.authored), ("Prescriber", r.prescriber)]
def noteCells (r : NoteRow) : List (String × String) :=
  [("Date", uiDate r.date), ("Type", r.noteType), ("Author", r.author),
   ("Encounter", r.encounter), ("Title", r.title), ("Text", r.text), ("Status", r.status)] ++
   (if r.sourceDate == "" then [] else [("Source date", uiDate r.sourceDate)]) ++
   (if r.shiftDays == "" then [] else [("Shift days", r.shiftDays)])
def historyCells (r : HistoryRow) : List (String × String) :=
  [("Kind", r.kind), ("Item", r.item), ("Detail", r.detail), ("Status", r.status), ("Source", r.source)]
def vitalCells (r : VitalRow) : List (String × String) :=
  [("Vital sign", r.name), ("Value", r.value), ("Unit", r.unit), ("Recorded", uiDate r.date)]
def problemCells (r : ProblemRow) : List (String × String) :=
  [("Problem", r.name), ("Code", r.code), ("Onset", uiDate r.onset), ("Abatement", uiDate r.abatement), ("Status", r.status)]

/-- Preserve every supplied artifact field/row alongside captured-order rows. -/
def uiPayloadRows (cx : Ctx) (i : InfoId) : List (List (String × String)) :=
  match infoPayload cx.facts i with
  | none => []
  | some p => ((if p.fields.isEmpty then [] else [p.fields]) ++ p.rows.map (·.fields)).map
      (fun row => row.map (fun (label, value) => (label, uiDate value)))

/-- All clinical records, without truncation. Payload contracts contribute their
clinical fields/rows, never a serialized payload, artifact key, or debug object. -/
def uiRows (cx : Ctx) (i : InfoId) : List (List (String × String)) :=
  if uiOrderInfo i then uiOrderRows cx ++ uiPayloadRows cx i else match structuredRows? cx i with
  | some rows => rows
  | none => match i with
    | "patientBanner" => [uiClinicalBanner cx.facts cx.disp]
    | "allergyList" => cx.disp.allergies.map allergyCells
    | "currentMeds" => cx.disp.meds.map medCells
    | "encounterNotes" | "priorNotes" => cx.disp.notes.map noteCells
    | "importedHistory" => cx.disp.history.map historyCells
    | "familyHistory" => (cx.disp.history.filter (·.kind == "Family history")).map historyCells
    | "socialHistory" => (cx.disp.history.filter (·.kind == "Social history")).map historyCells
    | "surgicalHistory" => (cx.disp.history.filter (·.kind == "Surgical history")).map historyCells
    | "vitals" => cx.disp.vitals.map vitalCells
    | "problemList" => cx.disp.problems.map problemCells
    | "labs" | "labResults" | "resultTrend" =>
      if !cx.disp.labResults.isEmpty then
        let labels := (cx.disp.labResults.map (fun r => (r.name, r.code))).eraseDups
        cx.disp.labResults.map (labResultCells labels)
      else cx.disp.labs.flatMap fun r =>
        [("Test", r.name), ("Value", r.value), ("Unit", r.unit), ("Range", r.refRange),
         ("Recorded", uiDate r.date), ("Flag", (cx.disp.labFlags.lookup r.code).getD (if r.abnormal then "A" else ""))] ::
        r.trend.map (fun p => [("Test", r.name), ("Recorded", uiDate p.date),
          ("Value", uiHundredths p.hundredths), ("Unit", r.unit)])
    | "anticoagulants" | "anticoagulantList" =>
        (cx.disp.meds.filter fun r => inClass r.drug "anticoagulant" || inClass r.drug "antiplatelet").map medCells
    | "immunizations" | "immunizationHistory" => cx.disp.immunizations.map fun r =>
        [("Vaccine", r.vaccine), ("CVX", r.cvx), ("Date", uiDate r.date), ("Status", r.status)]
    | "encounters" | "encounterHistory" => cx.disp.encounters.map fun r =>
        [("Encounter", r.encType), ("Class", r.encClass), ("Start", uiDate r.start),
         ("End", uiDate r.stop), ("Reason", r.reason), ("Provider", r.provider), ("Location", r.location)]
    | "procedures" => cx.disp.procedures.map fun r =>
        [("Procedure", r.name), ("Code", r.code), ("Date", uiDate r.date), ("Status", r.status)]
    | "growthChart" => (cx.disp.growth.map fun r =>
        [("Date", uiDate r.date), ("Age (months)",
          if isoDateValid cx.disp.banner.dob && isoDateValid r.date && cx.disp.banner.dob ≤ r.date
          then toString r.ageMonths else "Not recorded"),
         ("Weight (kg)", (r.weightTenths?.map valueTextQty).getD ""),
         ("Height (cm)", (r.heightTenths?.map valueTextQty).getD "")]) ++ uiPayloadRows cx i
    | "doseCheck" =>
        [("Weight for dose check", (weightKgTenths? cx.facts cx.s).map (fun w => valueTextQty w ++ " kg")
          |>.getD "No confirmed kg weight available")] ::
        (orderLines cx.s).map fun (n, drug) => [("Line", toString (n + 1)), ("Drug", drug),
          ("Dose check", if doseOutOfRange cx.facts cx.s n drug then "OUT OF RANGE" else "No out-of-range flag")]
    | "careGaps" => cx.facts.careGaps.map fun g => [("Care gap", g)]
    | "priorAuthStatus" => [[("Prior authorization", if (capturedAt? cx.s priorAuthElement cx.s.currentSlot).isSome
        then "Requested" else "Not requested")]]
    | _ => uiPayloadRows cx i
where
  valueTextQty (n : Nat) : String := s!"{n / 10}.{n % 10}"

def uiEnabled (cx : Ctx) (id : String) : Bool := cx.v.enabled.contains id

def uiBlocked (cx : Ctx) (id : String) : Option String :=
  if uiEnabled cx id then none
  else some (uiLabel (uiReasonText cx (blockedReason cx id)) "Action unavailable")

def uiButton (cx : Ctx) (it : ItemView) (role : String) : UiNode :=
  .button it.comp.id (uiLabel it.comp.label "Action") role (uiEnabled cx it.comp.id)
    (uiBlocked cx it.comp.id) it.comp.hotkey?

def actionRole : Action → String
  | .commit _ => "primary" | .goto _ | .back => "nav" | _ => "secondary"

/-- Preserve the control semantics and the existing formulary choices inside
section 10's open kind string. The painter does not reconstruct value sets. -/
def uiFieldKind : ValueKind → String
  | .quantity _ | .medicationDose => "qty"
  | .coded "formulary" => "code:" ++ "|".intercalate (formulary.map (·.name))
  | .coded _ => "code"
  | .text => "text" | .flag => "flag" | .identity => "identity"
  | .scan _ => "scan" | .cosign => "cosign"

/-- Preserve the clinical title once. A field repeats it as an entry prompt;
a child info panel beneath the same heading uses a neutral record label. -/
def uiTitledLabel (cx : Ctx) (it : ItemView) (label duplicate fallback : String) : String :=
  uiLabel (if cx.v.items.any (fun parent =>
    it.comp.parent? == some parent.comp.id && parent.comp.label == label)
    then duplicate else label) fallback

def uiField (cx : Ctx) (it : ItemView) (e : ElementId) : UiNode :=
  let kind := ((cx.sp.element? e).map (·.kind)).getD .text
  let (_, _, baseUnit) := fieldKind kind
  let want := if kind == .medicationDose then (doseInputUnit? cx.s it.slot).getD .none else baseUnit
  let inputKind := if e == "doseUnit" && kind == .coded "dose-unit" then
    "code:" ++ "|".intercalate ((doseUnitsAt cx.s it.slot).map (fun rule => rule.unit.name))
    else uiFieldKind kind
  let unit := if kind == .medicationDose then want else
    match it.value? with | some (.qty _ u) => u | _ => want
  let value := if kind == .medicationDose &&
    it.value?.any (fun v => match v with | .qty _ u => u != want | _ => true)
    then none else it.value?.map valueText
  .field it.comp.id (uiTitledLabel cx it it.comp.label ("Enter " ++ it.comp.label) "Clinical entry") inputKind value
    (if unit == .none then none else some (unitName unit))
    it.provenance? it.pendingConfirm it.humanOnly
    (cx.sp.entries.any fun r => r.element == e && whenHolds cx.facts cx.s r.when)

def uiInfo (cx : Ctx) (comp label i display : String) : UiNode :=
  .info comp (uiLabel label (uiLabel (infoLabel cx i) "Clinical information")) i (if uiOrderInfo i then "table" else display) (uiRows cx i)

/-- Shell placement follows semantic tags, including descendants of tagged groups.
A finite ancestor walk also handles malformed cyclic parents. -/
def uiTagIs (tag name : String) : Bool := tag == name || tag.endsWith ("." ++ name)

def uiSideAt (cx : Ctx) (id : CompId) : Bool :=
  let rec go : Nat → CompId → Bool
    | 0, _ => false
    | n + 1, id => match cx.v.items.find? (·.comp.id == id) with
      | none => false
      | some it => uiTagIs it.comp.tag "sidebar" ||
          (it.comp.parent?.map (go n)).getD false
  go (cx.v.items.length + 1) id

def uiNavGroup (it : ItemView) : Bool :=
  match it.comp.kind with
  | .group false _ => uiTagIs it.comp.tag "nav" || uiTagIs it.comp.tag "navigator"
  | _ => false

/-- The pair-only nav wire format can represent enabled, ordinary click buttons.
Controls with a hotkey or blocked reason stay in the workspace with all metadata. -/
def uiNavButton (cx : Ctx) (it : ItemView) : Bool :=
  match it.comp.kind with
  | .button (.goto _) => uiEnabled cx it.comp.id && it.comp.hotkey?.isNone &&
      cx.v.items.any (fun parent => uiNavGroup parent && it.comp.parent? == some parent.comp.id)
  | _ => false

def uiNavTitle (cx : Ctx) (it : ItemView) : String :=
  uiLabel ((cx.v.items.find? (fun parent => uiNavGroup parent && it.comp.parent? == some parent.comp.id)).map (·.comp.label) |>.getD "") "Navigator"

def uiNav (cx : Ctx) : List (String × List (String × String)) :=
  let items := cx.v.items.filter (fun it => it.shown && uiNavButton cx it)
  let groups := (cx.v.items.filter (fun it => it.shown && uiNavGroup it)).map
    (fun it => uiLabel it.comp.label "Navigator")
  ((groups ++ items.map (uiNavTitle cx)).eraseDups).map fun title =>
    (title, (items.filter (fun it => uiNavTitle cx it == title)).map fun it =>
      (it.comp.id, uiLabel it.comp.label "Action"))

/-- One compact line per source record; workspace info retains the full rows. -/
def uiAllergySummary (r : AllergyRow) : List (String × String) :=
  [("Record", r.substance ++ (if r.reaction == "" then "" else " — " ++ r.reaction) ++
    (if r.severity == "" then "" else " (" ++ r.severity ++ ")") ++
    (if r.status == "" || r.status == "active" then "" else " — " ++ r.status))]
def uiMedSummary (r : MedRow) : List (String × String) :=
  [("Record", r.name ++ (if r.sig == "" then "" else " — " ++ r.sig) ++
    (if r.status == "" || r.status == "active" then "" else " (" ++ r.status ++ ")"))]
def uiProblemSummary (r : ProblemRow) : List (String × String) :=
  [("Record", r.name ++ (if r.status == "" then "" else " (" ++ r.status ++ ")"))]
def uiLatestVitals (d : Display) : List VitalRow :=
  ((d.vitals.map (·.code)).eraseDups).filterMap fun code =>
    (d.vitals.filter (·.code == code)).foldl (fun current r =>
      match current with
      | none => some r
      | some prev => some (if prev.date < r.date then r else prev)) none

def uiSummaryRows (cx : Ctx) (i : InfoId) : List (List (String × String)) :=
  match i with
  | "encounterNotes" | "priorNotes" => cx.disp.notes.map noteCells
  | "allergyList" => cx.disp.allergies.map uiAllergySummary
  | "currentMeds" => cx.disp.meds.map uiMedSummary
  | "problemList" => (cx.disp.problems.filter (fun r => r.status != "resolved" && r.status != "inactive" && r.abatement == "")).map uiProblemSummary
  | "vitals" => (uiLatestVitals cx.disp).map fun r =>
      [("Record", r.name ++ " " ++ r.value ++ (if r.unit == "" then "" else " " ++ r.unit) ++
        " (" ++ (if cx.disp.asOf != "" && r.date.startsWith cx.disp.asOf then "today" else uiDate r.date) ++ ")")]
  | _ => (uiRows cx i).map fun row => [("Record", " · ".intercalate (row.map (·.2)))]

def uiItemRows (cx : Ctx) (id : CompId) (i : InfoId) : List (List (String × String)) :=
  if uiSideAt cx id && !uiOrderInfo i then uiSummaryRows cx i else uiRows cx i

def uiItemInfo (cx : Ctx) (it : ItemView) (i display : String) : UiNode :=
  uiWrapInfo (if uiSideAt cx it.comp.id then none else presentationKind? it.comp.tag i) <|
  .info it.comp.id (uiTitledLabel cx it (uiLabel it.comp.label (uiLabel (infoLabel cx i) "Clinical information")) "Records" "Clinical information") i
    (if uiOrderInfo i then "table" else if uiSideAt cx it.comp.id then "list" else display)
    (uiItemRows cx it.comp.id i)

/-- Render one shown item and its already-visible children. No visibility test
is repeated here. Confirm buttons retain the field's id for Event.confirm. -/
def uiItem (cx : Ctx) (it : ItemView) (kids : List UiNode) : List UiNode :=
  match it.comp.kind with
  | .banner => [.info "" "Patient banner" "patientBanner" "summary" [uiClinicalBanner cx.facts cx.disp]]
  | .field e _ _ => uiField cx it e ::
      if it.pendingConfirm then
        [.button it.comp.id "Confirm prefilled value" "confirm" (uiEnabled cx it.comp.id)
          (uiBlocked cx it.comp.id) none] else []
  | .panel i | .priorAuth i => [uiItemInfo cx it i "list"]
  | .table i => [uiItemInfo cx it i "table"]
  | .trend i => [uiItemInfo cx it i "trend"]
  | .button a => [uiWrapRow (if uiNavButton cx it then "" else it.comp.tag) (uiButton cx it (actionRole a))]
  | .«macro» _ => [uiButton cx it "macro"]
  | .search _ => [.field it.comp.id (uiLabel it.comp.label "Search chart") "search" none none none false false false]
  | .alert a _ => [.alert it.comp.id a
      (uiLabel (((cx.sp.alert? a).map (·.label)).getD it.comp.label) "Clinical alert")
      (match (cx.sp.alert? a).map (·.tier) with
       | some Tier.interruptive => "interruptive" | some Tier.passive => "passive" | _ => "removable")]
  | .group coll _ => if uiNavGroup it then [] else [uiWrapInfo (presentationKind? it.comp.tag "") <|
      .section it.comp.id (uiTitledLabel cx it it.comp.label "Details" "Section")
      ((if coll then [.button it.comp.id (if it.expanded then "Collapse section" else "Expand section") "toggle" (uiEnabled cx it.comp.id) (uiBlocked cx it.comp.id) it.comp.hotkey?] else []) ++
       if it.expanded then uiColumnChildren it.comp.tag kids else [])]
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
  match it.comp.kind with | .group _ _ => !uiNavGroup it && it.expanded | .tabs => true | _ => false

/-- Folding from the end preserves each shown item exactly once, including
orphans and malformed component order. Duplicate panels/labels are retained. -/
def uiNest (cx : Ctx) (it : ItemView) (rest : List UiBranch) : List UiBranch :=
  let take := fun b : UiBranch => uiTakesChildren it && b.parent == some it.comp.id
  let kids := (rest.filter take).flatMap (·.nodes)
  { parent := it.comp.parent?, nodes := uiItem cx it kids } :: rest.filter (fun b => !take b)

def uiComponentsWhere (cx : Ctx) (keep : ItemView → Bool) : List UiNode :=
  (((cx.v.items.filter (fun it => it.shown && keep it)).foldr (uiNest cx) []).flatMap (·.nodes))

def uiComponents (cx : Ctx) : List UiNode := uiComponentsWhere cx (fun _ => true)

def uiInWorkspace (cx : Ctx) (it : ItemView) : Bool :=
  it.comp.kind != .banner && !uiNavButton cx it && !uiSideAt cx it.comp.id


/-- Only a shown source component can request an overview workspace. -/
def uiOverview (cx : Ctx) : Bool :=
  cx.v.items.any (fun it => it.shown && uiOverviewTag it.comp.tag)

/-- Fallback summaries are read-only and are emitted only for information not
already present in the program's side column. Overview screens omit these
automatic supplements; every explicit source component remains present. -/
def uiSide (cx : Ctx) : List UiNode :=
  uiComponentsWhere cx (fun it => it.comp.kind != .banner && !uiNavButton cx it && uiSideAt cx it.comp.id) ++
    (if uiOverview cx || (cx.disp.history.filter (·.kind == "Home medications (reported)")).isEmpty then [] else
      [.info "" "Home medications (reported)" "importedHistory" "list"
        ((cx.disp.history.filter (·.kind == "Home medications (reported)")).map historyCells)]) ++
    (if uiOverview cx then [] else
    ([ ("allergyList", "Allergies"), ("currentMeds", "Active medications"),
       ("problemList", "Problems"), ("vitals", "Recent vitals") ] : List (String × String)).filterMap fun (i, label) =>
      if cx.v.items.any (fun it => it.shown && uiSideAt cx it.comp.id && showsInfo i it.comp.kind)
      then none else some (.info "" label i "list" (uiSummaryRows cx i)))

/-- Passive/unknown alerts cannot become modals, even in a malformed state.
Only the matching Event.ack is accepted by the interpreter while a popup is open. -/
def uiModal (cx : Ctx) : Option UiNode := do
  let (a, _) ← cx.v.popup?
  let rule ← cx.sp.alert? a
  if rule.tier == .passive then none else
    some (.section a (uiLabel rule.label "Clinical alert")
      [.button a "Acknowledge" "ack" true none none])

/-- Applicable reviews on this screen, including disabled commit buttons.
The original component tree is untouched; the safety supplement has no event id. -/
def uiRequiredReviews (cx : Ctx) : List ReviewReq :=
  cx.sp.reviews.filter fun r =>
    whenHolds cx.facts cx.s r.when && cx.v.items.any (fun it =>
      it.shown && it.comp.kind == .button (.commit r.commit))

def uiFullInfoShown (cx : Ctx) (i : InfoId) : Bool :=
  cx.v.items.any fun it => it.shown && uiInWorkspace cx it && showsInfo i it.comp.kind

def uiMissingReviews (cx : Ctx) : List UiNode :=
  ((uiRequiredReviews cx).filter fun r => !uiFullInfoShown cx r.info).map fun r =>
    uiInfo cx "" (infoLabel cx r.info) r.info "list"

def uiWorkspace (cx : Ctx) : List UiNode :=
  let steps := uiSteps cx
  .stepper steps ((steps.map (·.1)).idxOf cx.s.screen) :: (uiComponentsWhere cx (uiInWorkspace cx) ++ uiMissingReviews cx)

/-- The actual semantic UI sent to the browser. Program banners contribute to
the single shell landmark and are excluded from workspace and side components. -/
def renderUi (sp : Spec) (prog : Program) (facts : Facts) (disp : Display)
    (user : User) (s : State) : UiScreen :=
  let cx : Ctx := { sp, prog, facts, disp, user, s }
  { banner := uiClinicalBanner facts disp, nav := uiNav cx, title := cx.v.title,
    workspace := uiWorkspace cx, side := uiSide cx, modal := uiModal cx }

end Ehr.Render
