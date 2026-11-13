import Ehr.Core.EntryTimes
import Ehr.Core.Navigation
import Ehr.Render.DateIndex
import Ehr.Core.Workspace
import Ehr.Render.Presentations
import Ehr.Render.SurgeryChoices
import Ehr.Render.CodeChoices
import Ehr.Render.GrowthStandards

/-! Semantic EHR rendering. This module and its imports use only Init.
The interpreter resolves visibility exactly once. Nesting consumes no item:
children whose container precedes them are placed in that container; malformed
out-of-order/orphan items remain visible at workspace level. Nothing is deduplicated.
-/
namespace Ehr.Render

/-- Empty program labels receive a readable label without changing their identity. -/
def uiLabel (s fallback : String) : String := if s = "" then fallback else s

/-- Source identifiers remain proof metadata; clinicians see the source's name. -/
def uiSourceText (cx : Ctx) (source : String) : String :=
  if source.startsWith "record:" then
    let key := (source.drop 7).toString
    let name := ((cx.sp.elements.find? (·.recordFact? == some key)).map (·.label)).getD ""
    "From chart" ++ (if name == "" then "" else " — " ++ name)
  else if source.startsWith "linked:" then
    let key := (source.drop 7).toString
    let name := ((cx.sp.element? key).map (·.label)).getD ""
    "Linked value" ++ (if name == "" then "" else " — " ++ name)
  else if source == "macro" then "From template / order favorites"
  else if source == "default" then "Default value"
  else "Prefilled value"

/-- Every visible source gets a display label without changing its capture. -/
def uiSourceLabels (cx : Ctx) : List (String × String) :=
  ((cx.v.items.filter (·.shown)).filterMap fun it =>
    it.provenance?.map fun source => (source, uiSourceText cx source)).eraseDups

/-- A recorded non-kg value stays visible while the kg input awaits human entry.
This is display guidance, never a conversion or a confirmation. -/
def uiEntryHint (cx : Ctx) (it : ItemView) : Option String :=
  match it.comp.kind, it.value? with
    | .field e _ _, some (.qty n unit) =>
      if (cx.sp.element? e).any (·.kind == .quantity .kg) && unit != .kg then
        some ("Recorded value: " ++ valueText (.qty n unit) ++ " " ++ unitName unit ++
          ". Enter the weight in kg.")
      else none
    | _, _ => none

/-- Hints belong to their existing field and add no interpreter action. -/
def uiEntryHints (cx : Ctx) : List (CompId × String) :=
  (cx.v.items.filter (·.shown)).filterMap fun it =>
    (uiEntryHint cx it).map (fun hint => (it.comp.id, hint))

/-- A surgeon's department favorites attach only to their actual visible field.
They never select a value, change a flag, or replace the spec's validators. -/
def uiFieldChoices (cx : Ctx) : List (CompId × UiCodeChoices) :=
  if cx.user.role != .surgeon then [] else
  (cx.v.items.filter (·.shown)).filterMap fun it => match it.comp.kind with
    | .field element _ _ =>
      (cx.sp.element? element).bind fun spec =>
        let choices := surgicalChoices spec.kind
        if !spec.enteredBy.contains cx.user.role || choices.isEmpty then none else
          some (it.comp.id, {
            options := choices
            showCode := spec.kind == .coded "icd10" || spec.kind == .coded "cpt" })
    | _ => none

def uiBanner (d : Display) : List (String × String) :=
  [("Patient", d.banner.name), ("DOB", uiDate d.banner.dob), ("MRN", d.banner.mrn),
   ("Age / sex", (if d.banner.dob == "" then "Age not recorded" else toString d.banner.ageYears) ++ " / " ++ d.banner.sex),
   ("Language", d.banner.language), ("PCP", d.banner.pcp), ("Coverage", d.banner.coverage),
   ("Last encounter", d.banner.encounterClass), ("Last provider", d.banner.attending), ("Last location", d.banner.location)]


/-- Recorded banner weight is distinct from a human-confirmed dosing weight. -/
def uiBannerWeight (facts : Facts) (d : Display) : String :=
  let weight := d.banner.weight?.orElse fun _ =>
    facts.weightToday?.map fun (value, unit) => (value, unit, d.asOf)
  match weight with
  | none => "Not recorded"
  | some (value, unit, date) =>
      let weight := if unit == .lb then
        let kg := (value * 45359237 + 50000000) / 100000000
        s!"{kg / 10}.{kg % 10} kg (from {value / 10}.{value % 10} lb)"
        else s!"{value / 10}.{value % 10} {unit.name}"
      weight ++
      (if date == "" then "" else " · " ++ uiDate date)

/-- Case display data uses the ordinary selected-patient, version-bound reader. -/
def uiCaseValue (facts : Facts) (label : String) : String :=
  let value := (infoPayload facts "scheduleTasks").bind fun payload =>
    ((payload.rows.head?).bind (fun row => row.fields.lookup label)).orElse fun _ =>
      payload.fields.lookup label
  uiLabel (value.getD "") "Not recorded"

/-- A preoperative episode is not the patient's previous ambulatory encounter.
Planned OR and surgeon describe the supplied request, not a current admission. -/
def uiEncounterBanner (facts : Facts) (d : Display) : List (String × String) :=
  if facts.encounterKind? == some "preop" then
    ((uiBanner d).filter fun pair => !["Encounter", "Attending", "Location"].contains pair.1) ++
      [("Encounter context", "Preoperative chart review"),
       ("Planned OR", uiCaseValue facts "Room"), ("Surgeon", uiCaseValue facts "Surgeon")]
  else
    let base := if facts.encounterKind? == some "emergency" || facts.encounterKind? == some "inpatient" then
      (uiBanner d).map fun (key, value) =>
        if key == "Last encounter" then ("Encounter", uiEncounterClass value)
        else if key == "Last provider" then ("Attending", value)
        else if key == "Last location" then ("Location", value) else (key, value)
      else uiBanner d
    base ++ [("Encounter type", (facts.record.lookup "encounterName").getD ""),
      ("Department", (facts.record.lookup "department").getD "")] ++
      (let pod := (facts.record.lookup "postoperativeDay").getD ""
       if pod == "" then [] else [("Postoperative day", "POD #" ++ pod)])

/-- Human-readable clinical roles never expose a user ID. -/
def uiViewer : Role → String
  | .physician => "Physician"
  | .np => "Nurse practitioner"
  | .rn => "Registered nurse"
  | .surgeon => "General surgeon"

/-- The visible name requires the same unique identity as the permission-bearing
user. Missing or ambiguous source names leave the clinical role alone. -/
def uiClinicianViewer (user : User) (d : Display) : String :=
  let role := uiViewer user.role
  if user.id == "" then role else
  match (d.clinicians?.getD []).filter (fun row => row.id == user.id) with
  | [row] =>
    let name := row.name.trimAscii.toString
    if name == "" then role else name ++ " · " ++ role
  | _ => role

/-- Header allergies summarize substances and status; reactions remain complete
in the allergy list and mandatory reviews. Unknown code status stays explicit. -/
def uiClinicalBanner (facts : Facts) (d : Display) : List (String × String) :=
  uiEncounterBanner facts d ++
    [("Allergies", if d.allergies.isEmpty then "No allergy records on file"
      else "; ".intercalate (d.allergies.map (fun r => r.substance ++
        (if r.reaction == "" then "" else " — " ++ r.reaction) ++
        (if r.severity == "" then "" else " (" ++ r.severity ++ ")") ++
        (if r.status == "" || r.status == "active" then "" else " (" ++ r.status ++ ")")))),
     ("Code status", uiLabel ((facts.record.lookup "codeStatus").getD "") "Not recorded"),
     ("Weight", uiBannerWeight facts d),
     ("Isolation", uiLabel ((facts.record.lookup "isolation").getD "") "Not recorded")]

/-- Overview uses public activities and workflow sections, retaining every screen. -/
def uiOverviewNav (prog : Program) : List (String × List (String × String)) :=
  ((prog.screens.map (fun sc => (workflowNames sc).1)).eraseDups).map fun activity =>
    (activity, (prog.screens.filter (fun sc => (workflowNames sc).1 == activity)).map fun sc =>
      (sc.id, uiLabel (workflowNames sc).2 "Untitled screen"))

def uiSteps (cx : Ctx) : List (String × String) :=
  let workflow := ((cx.prog.screen? cx.s.screen).map (·.workflow)).getD ""
  (cx.prog.screens.filter (·.workflow == workflow)).map fun sc =>
    (sc.id, uiLabel (workflowNames sc).2 "Untitled screen")

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

/-- Latest dated vital per measure. Safety panels below retain all records tied
at that latest timestamp, including conflicting values. -/
def uiLatestVitals (d : Display) : List VitalRow :=
  ((d.vitals.map (·.code)).eraseDups).filterMap fun code =>
    (d.vitals.filter (·.code == code)).foldl (fun current r =>
      match current with
      | none => some r
      | some prev => some (if prev.date < r.date then r else prev)) none
def problemCells (r : ProblemRow) : List (String × String) :=
  [("Problem", r.name), ("Code", r.code), ("Onset", uiDate r.onset), ("Abatement", uiDate r.abatement), ("Status", r.status)]

/-- Preserve every supplied artifact field/row alongside captured-order rows. -/
def uiPayloadRows (cx : Ctx) (i : InfoId) : List (List (String × String)) :=
  match infoPayload cx.facts i with
  | none => []
  | some p => ((if p.fields.isEmpty then [] else [p.fields]) ++ p.rows.map (·.fields)).map
      (fun row => row.map (fun (label, value) => (uiClinicalHeading label, uiDate value)))

/-- The current visit document uses the existing clinical note fields. -/
def uiVisitNoteElements : List ElementId :=
  ["chiefComplaint", "hpi", "ros", "exam", "assessmentPlan", "visitDiagnosis",
   "anticipatoryGuidance", "followUp", "patientInstructions"]

/-- The displayed text is the exact entered value, with its current confirmation state. -/
def uiVisitNoteRow (cx : Ctx) (element : ElementId) (entry : Captured) : List (String × String) :=
  [("Section", uiLabel (((cx.sp.element? element).map (·.label)).getD "") "Documentation"),
   ("Text", valueText entry.value),
   ("Entry status", if !entry.confirmed then "Needs confirmation"
     else if valueText entry.value == "" then "Empty entry" else "Entered")]

/-- Only current editor captures contribute to this visit's note preview. -/
def uiVisitNoteRows (cx : Ctx) : List (List (String × String)) :=
  uiVisitNoteElements.flatMap fun element =>
    (cx.s.captured.filter (fun entry => entry.element == element)).map (uiVisitNoteRow cx element)

/-- An unstarted note is explicit. Supplied supporting records remain alongside it. -/
def uiNoteSummaryRows (cx : Ctx) : List (List (String × String)) :=
  let rows := uiVisitNoteRows cx
  (if rows.isEmpty then [[("Section", "Visit note"), ("Text", "No visit documentation entered yet.")]]
    else rows) ++ uiPayloadRows cx "noteSummary"

/-- All clinical records, without truncation. Payload contracts contribute their
clinical fields/rows, never a serialized payload, artifact key, or debug object. -/
def uiRows (cx : Ctx) (i : InfoId) : List (List (String × String)) :=
  if i == "noteSummary" then uiNoteSummaryRows cx
  else if uiOrderInfo i then uiOrderRows cx ++ uiPayloadRows cx i
  else if i == "refillComparison" then uiRefillComparisonRows cx (uiPayloadRows cx i)
  else if i == "resultTrend" && (infoPayload cx.facts i).isSome then uiPayloadRows cx i
  else match structuredRows? cx i with
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
    | "vitals" => if (infoPayload cx.facts i).isSome then uiPayloadRows cx i else
      (cx.disp.vitals.filter fun r => (uiLatestVitals cx.disp).any fun latest =>
        latest.code == r.code && latest.date == r.date).map vitalCells
    | "problemList" =>
      let includeResolved := cx.s.expanded.any (fun id => id.endsWith ".includeResolved")
      (cx.disp.problems.filter (fun r => includeResolved || (r.status != "resolved" && r.status != "inactive" && r.abatement == ""))).map problemCells
    | "labs" | "labResults" | "resultTrend" =>
      if (infoPayload cx.facts i).isSome then uiPayloadRows cx i else
      if !cx.disp.labResults.isEmpty then
        let labels := (cx.disp.labResults.map (fun r => (r.name, r.code))).eraseDups
        cx.disp.labResults.map (labResultCells labels)
      else cx.disp.labs.flatMap fun r =>
        [("Test", r.name), ("Value", r.value), ("Unit", r.unit), ("Range", r.refRange),
         ("Recorded", uiDate r.date), ("Flag", (cx.disp.labFlags.lookup r.code).getD (if r.abnormal then "A" else ""))] ::
        r.trend.map (fun p => [("Test", r.name), ("Recorded", uiDate p.date),
          ("Value", uiHundredths p.hundredths), ("Unit", r.unit)])
    | "anticoagulants" | "anticoagulantList" =>
        (cx.disp.meds.filter uiAntithrombotic).map medCells ++ uiPayloadRows cx i
    | "immunizations" | "immunizationHistory" => (cx.disp.immunizations.map fun r =>
        [("Vaccine", r.vaccine), ("CVX", r.cvx), ("Date", uiDate r.date), ("Status", r.status)]) ++ uiPayloadRows cx i
    | "encounters" | "encounterHistory" => cx.disp.encounters.map fun r =>
        [("Encounter", r.encType), ("Class", uiEncounterClass r.encClass), ("Start", uiDate r.start),
         ("End", uiDate r.stop), ("Reason", r.reason), ("Provider", r.provider), ("Location", r.location)]
    | "procedures" => cx.disp.procedures.map fun r =>
        [("Procedure", r.name), ("Code", r.code), ("Date", uiDate r.date), ("Status", r.status)]
    | "growthChart" => (cx.disp.growth.map fun r =>
        [("Date", uiDate r.date), ("Age (months)",
          if isoDateValid cx.disp.banner.dob && isoDateValid r.date && cx.disp.banner.dob ≤ r.date
          then toString r.ageMonths else "Not recorded"),
         ("Weight (kg)", (r.weightTenths?.map valueTextQty).getD ""),
         ("Height (cm)", (r.heightTenths?.map valueTextQty).getD "")]) ++ uiPayloadRows cx i
    | "doseCheck" => uiDoseRows cx
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
  | .coded "esi" => "code:1|2|3|4|5"
  | .coded "pain-0-10" => "code:0|1|2|3|4|5|6|7|8|9|10"
  | .coded _ => "code"
  | .text => "text" | .flag => "flag" | .identity => "identity"
  | .scan _ => "scan" | .cosign => "cosign"

/-- Narrative captures use multiline editors. This is only the control's
presentation; the same text Value, entry event and confirmations are retained. -/
def uiNarrativeElement (e : ElementId) : Bool :=
  ["hpi", "ros", "exam", "assessmentPlan", "anticipatoryGuidance",
   "patientInstructions", "patientMessage", "refillNote", "refillDenyReason"].contains e

/-- Preserve the clinical title once. A field repeats it as an entry prompt;
a child info panel beneath the same heading uses a neutral record label. -/
def uiTitledLabel (cx : Ctx) (it : ItemView) (label duplicate fallback : String) : String :=
  uiLabel (if cx.v.items.any (fun parent =>
    it.comp.parent? == some parent.comp.id && parent.comp.label == label)
    then duplicate else label) fallback

/-- An opted-in reconciliation slot retains its source caption and adds the
corresponding current-medication name. Missing source rows add no context. -/
def uiMedicationFieldLabel (cx : Ctx) (it : ItemView) (element : ElementId) : String :=
  let suffix := if element == "medRecDecision" &&
      (it.comp.tag.splitOn ".").contains "currentMedication" then
    match cx.disp.meds[it.slot]? with
    | some med => if med.name == "" then "" else " — " ++ med.name
    | none => ""
    else ""
  it.comp.label ++ suffix

def uiField (cx : Ctx) (it : ItemView) (e : ElementId) : UiNode :=
  let kind := ((cx.sp.element? e).map (·.kind)).getD .text
  let (_, _, baseUnit) := fieldKind kind
  let want := if kind == .medicationDose then (doseInputUnit? cx.s it.slot).getD .none else baseUnit
  let inputKind := if (cx.sp.element? e).any (·.observationOf?.isSome) then "observation-time"
    else if e == "doseUnit" && kind == .coded "dose-unit" then
    "code:" ++ "|".intercalate ((doseUnitsAt cx.s it.slot).map (fun rule => rule.unit.name))
    else if kind == .text && (it.comp.tag.endsWith ".narrative" || it.comp.tag.endsWith ".multiline" || uiNarrativeElement e) then "textarea"

    else uiFieldKind kind
  let metricWeight := kind == .quantity .kg
  let unit := if kind == .medicationDose || metricWeight then want else
    match it.value? with | some (.qty _ u) => u | _ => want
  let value := if (kind == .medicationDose || metricWeight) &&
    it.value?.any (fun v => match v with | .qty _ u => u != want | _ => true)
    then none else it.value?.map valueText
  let value := if (cx.sp.element? e).any (·.observationOf?.isSome) then
    (value.filter (· != "")).orElse fun _ => do
      let source ← (cx.sp.element? e).bind (·.observationOf?)
      let captured ← capturedAt? cx.s source it.slot
      toString <$> captured.enteredAt?
    else value
  .field it.comp.id (uiTitledLabel cx it (uiMedicationFieldLabel cx it e) ("Enter " ++ it.comp.label) "Clinical entry") inputKind value
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
  | .group false _ => uiTagIs it.comp.tag "nav" || uiTagIs it.comp.tag "workflow"
  | _ => false

/-- The pair-only nav wire format can represent enabled, ordinary click buttons.
An explicit nav group or a nav segment in the semantic tag places the control.
Controls with a hotkey or blocked reason stay in the workspace with all metadata. -/
def uiNavButton (cx : Ctx) (it : ItemView) : Bool :=
  match it.comp.kind with
  | .button (.goto _) => uiEnabled cx it.comp.id && it.comp.hotkey?.isNone &&
      (cx.v.items.any (fun parent => uiNavGroup parent && it.comp.parent? == some parent.comp.id) ||
        (it.comp.tag.splitOn ".").contains "nav")
  | _ => false

def uiNavTitle (cx : Ctx) (it : ItemView) : String :=
  uiLabel ((cx.v.items.find? (fun parent => uiNavGroup parent && it.comp.parent? == some parent.comp.id)).map (·.comp.label) |>.getD "") "Workflow"

def uiNav (cx : Ctx) : List (String × List (String × String)) :=
  let items := cx.v.items.filter (fun it => it.shown && uiNavButton cx it)
  let groups := (cx.v.items.filter (fun it => it.shown && uiNavGroup it)).map
    (fun it => uiLabel it.comp.label "Workflow")
  ((groups ++ items.map (uiNavTitle cx)).eraseDups).map fun title =>
    (title, (items.filter (fun it => uiNavTitle cx it == title)).map fun it =>
      (it.comp.id, uiLabel it.comp.label "Action"))

/-- Selection comes from the actual goto target, without interpreting labels. -/
def uiActiveNav (cx : Ctx) : Option CompId :=
  (cx.v.items.find? fun it => it.shown && uiNavButton cx it && match it.comp.kind with
    | .button (.goto target) => target == cx.s.screen
    | _ => false).map (·.comp.id)

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
def uiSummaryRows (cx : Ctx) (i : InfoId) : List (List (String × String)) :=
  match i with
  | "scheduleTasks" | "consultRequest" => uiRows cx i
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

/-- Reference data decorates only the growth plot; its ordinary info is complete. -/
def uiWrapGrowthReferences (cx : Ctx) (kind : Option UiPresentationKind) (i : InfoId)
    (node : UiNode) : UiNode :=
  if kind == some .growth && i == "growthChart" then
    .chartReferences (uiGrowthReferences cx.disp) [node]
  else node

def uiItemInfo (cx : Ctx) (it : ItemView) (i display : String) : UiNode :=
  let kind := if uiSideAt cx it.comp.id then none else presentationKind? it.comp.tag i
  let node := uiWrapInfo kind <| .info it.comp.id (uiTitledLabel cx it (uiLabel it.comp.label (uiLabel (infoLabel cx i) "Clinical information")) "Records" "Clinical information") i
    (if uiOrderInfo i then "table" else if uiSideAt cx it.comp.id then "list"
      else if uiTagIs it.comp.tag "layout.document" then "document" else display)
    (uiItemRows cx it.comp.id i)
  uiWrapGrowthReferences cx kind i node

/-- Search reads typed chart rows or the supplied code catalog. It never replaces
required reviews, captures clinical evidence, or selects an order. -/
def uiSearchLabs (cx : Ctx) : List (List (String × String)) :=
  if (infoPayload cx.facts "resultTrend").isSome then uiPayloadRows cx "resultTrend" else
  if !cx.disp.labResults.isEmpty then
    let labels := (cx.disp.labResults.map (fun row => (row.name, row.code))).eraseDups
    cx.disp.labResults.map (labResultCells labels)
  else cx.disp.labs.map fun row => [("Test", row.name), ("Value", row.value), ("Unit", row.unit),
    ("Range", row.refRange), ("Recorded", uiDate row.date), ("Abnormal", toString row.abnormal)]

def uiSearchSource (cx : Ctx) (scope : String) : List (List (String × String)) :=
  if scope == "formulary" then
    formulary.map fun drug => [("Medication", drug.name), ("RxNorm", ", ".intercalate drug.rxnorm)]
  else if scope == "inbox" then
    uiRows cx "inboxResults" ++ uiRows cx "inboxRxRequests"
  else if scope == "loinc" then
    commonLabChoices.map (fun term => [("Test", term.label), ("LOINC", term.code)]) ++
    (cx.facts.codeTables?.getD []).flatMap (fun table =>
      if table.system == "LOINC" then table.codes.map (fun code => [("Code", code), ("System", table.system)]) else [])
  else if scope == "chart" then
    (["currentMeds", "allergyList", "problemList", "vitals", "encounterNotes",
      "importedHistory", "immunizations", "encounterHistory", "procedures", "imaging"] : List String).flatMap (uiRows cx) ++ uiSearchLabs cx
  else
    (cx.v.items.filter (·.shown)).flatMap fun item => match item.comp.kind with
      | .panel info | .table info | .trend info =>
          if ["labs", "labResults", "resultTrend"].contains info then uiSearchLabs cx else uiRows cx info
      | _ => []

/-- A bounded excerpt is centered near the matching text. Ellipses mark omitted
text; the full note remains in Chart History and required review panels. -/
def uiSearchExcerpt (text query : String) : String :=
  let before := ((text.toLower.splitOn query.toLower).headD "").length
  let start := before - 60
  let excerpt := (text.toSlice.drop start).take 200
  (if start > 0 then "…" else "") ++ excerpt.toString ++
    (if (text.toSlice.drop (start + 200)).isEmpty then "" else "…")

def uiSearchCells (row : List (String × String)) : List (String × String) :=
  (row.filter fun pair =>
    pair.2 != "" && pair.2 != "Unknown" && pair.2 != "Not recorded" &&
      !["Source", "Source date", "Shift days"].contains pair.1 &&
      !pair.2.startsWith "urn:uuid:").map fun pair =>
        if pair.1 == "Title" then (pair.1, (pair.2.splitOn ". Source date").headD pair.2) else pair

/-- Search is a summary view. Opaque encounter references and converter metadata
stay out of the result list; existing full source panels remain unchanged. -/
def uiSearchSummary (row : List (String × String)) (query : String) : List (String × String) :=
  let pairs := uiSearchCells row
  match pairs with
  | [] => [("Record", "Matching record")]
  | first :: rest =>
      [("Record", first.1 ++ ": " ++ (if first.2.length > 240 then uiSearchExcerpt first.2 query else first.2))] ++
      if rest.isEmpty then [] else [("Details", " · ".intercalate (rest.map fun pair =>
        if pair.1 == "Text" || pair.2.length > 240 then "Excerpt: " ++ uiSearchExcerpt pair.2 query
        else pair.1 ++ ": " ++ pair.2))]

/-- Case-insensitive matching reads full supplied values and displays concise
summaries. Empty results are explicit. Full source panels are never filtered. -/
def uiSearchRows (cx : Ctx) (scope query : String) : List (List (String × String)) :=
  let needle := query.toLower
  let rows := (uiSearchSource cx scope).filter fun row =>
    (uiSearchCells row).any fun pair => (pair.2.toLower.splitOn needle).length > 1
  if rows.isEmpty then [[("Search", "No matching records")]]
  else (rows.take 25).map (fun row => uiSearchSummary row query) ++
    if (rows.drop 25).isEmpty then [] else
      [[("Record", "More results available"), ("Details", "Showing the first 25 matches. Refine your search to narrow the results.")]]

/-- Opted-in review actions show a read-only receipt status only while the
core accepts a receipt at the current data version, time and reviewer role. -/
def uiReviewStatus (cx : Ctx) (it : ItemView) : List UiNode :=
  match it.comp.kind with
  | .button (.markReviewed info) =>
      if (it.comp.tag.splitOn ".").contains "feedback" && hasValidReceipt cx.sp cx.facts cx.s info then
        [.info "" ("Review recorded: " ++ uiLabel (((cx.sp.info? info).map (·.label)).getD "") "Chart section")
          "reviewReceiptStatus" "status" []]
      else []
  | _ => []

/-- A queue opener belongs only to the current chart's named row. Missing
snapshot membership leaves the ordinary action adjacent to the list. -/
def uiQueueRowTag (cx : Ctx) (tag : String) : String :=
  match uiRowTarget? tag with
  | none => tag
  | some (target, _) =>
    match cx.v.items.find? (fun it => it.comp.id == target) with
    | none => tag
    | some it => match it.comp.kind with
      | .table info | .panel info =>
        if !["scheduleTasks", "orSchedule", "edTrackBoard", "shiftWorklist", "consultList", "inboxResults", "inboxRxRequests"].contains info then tag
        else
          let payload := infoPayload cx.facts info
          let selected := if payload.any (fun p => p.artifactKey.startsWith "world:") then
            payload.bind fun p => p.rows.findIdx? (fun row => row.id == "selected-chart")
          else (uiRows cx info).findIdx? (fun row => row.lookup "Patient" == some cx.disp.banner.name)
          match selected with
          | none => ""
          | some index => "present.row|" ++ target ++ "|" ++ toString index
      | _ => tag

/-- Render one shown item and its already-visible children. No visibility test
is repeated here. Confirm buttons retain the field's id for Event.confirm. -/
def uiItem (cx : Ctx) (it : ItemView) (kids : List UiNode) : List UiNode :=
  match it.comp.kind with
  | .banner => [.info "" "Patient banner" "patientBanner" "summary" [uiClinicalBanner cx.facts cx.disp]]
  | .field e _ _ => uiWrapFieldChoices cx e (uiField cx it e) ::
      if it.pendingConfirm then
        [.button it.comp.id "Confirm prefilled value" "confirm" (uiEnabled cx it.comp.id)
          (uiBlocked cx it.comp.id) none] else []
  | .panel i | .priorAuth i => [uiItemInfo cx it i "list"]
  | .table i => [uiItemInfo cx it i "table"]
  | .trend i => [uiItemInfo cx it i "trend"]
  | .button a => [uiWrapRow (if uiNavButton cx it then "" else uiQueueRowTag cx it.comp.tag) (uiButton cx it (actionRole a))] ++ uiReviewStatus cx it
  | .«macro» _ => [uiButton cx it "macro"]
  | .search scope =>
      let query := ((cx.s.searchQueries?.getD []).lookup it.comp.id).getD ""
      .field it.comp.id (uiLabel it.comp.label "Search chart") "search"
        (if query == "" then none else some query) none none false false false ::
      if query == "" then [] else
        [.info it.comp.id s!"Search results for “{query}”" "searchResults" "list" (uiSearchRows cx scope query)]
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

/-- The program can dedicate its workspace to a wide grid. -/
def uiWideWorkspace (cx : Ctx) : Bool :=
  cx.v.items.any fun it => it.shown && (it.comp.tag.splitOn ".").contains "wideWorkspace"

/-- Automatic summaries are optional layout supplements. Authored panels are separate. -/
def uiSummaryPairs (cx : Ctx) : List (String × String) :=
  if uiWideWorkspace cx || uiOverview cx || cx.v.items.any (fun it => it.shown && it.comp.tag == "layout.focusedWorkspace") then [] else
    [("allergyList", "Allergies"), ("currentMeds", "Active medications"),
     ("problemList", "Problems"), ("vitals", "Recent vitals")]

/-- Fallback summaries are read-only and are emitted only for information not
already present in the program's side column. Overview screens omit these
automatic supplements; every explicit source component remains present. -/
def uiSide (cx : Ctx) : List UiNode :=
  uiComponentsWhere cx (fun it => it.comp.kind != .banner && !uiNavButton cx it && uiSideAt cx it.comp.id) ++
    (if uiWideWorkspace cx || uiOverview cx || (cx.disp.history.filter (·.kind == "Home medications (reported)")).isEmpty then [] else
      [.info "" "Home medications (reported)" "importedHistory" "list"
        ((cx.disp.history.filter (·.kind == "Home medications (reported)")).map historyCells)]) ++
    (uiSummaryPairs cx).filterMap fun (i, label) =>

      if cx.v.items.any (fun it => it.shown && uiSideAt cx it.comp.id && showsInfo i it.comp.kind)
      then none else some (.info "" label i "list" (uiSummaryRows cx i))

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

/-- Clinical activity frames use their real workflow/row actions. The optional
read-only progress overview remains available to other source programs. -/
def uiProgress (cx : Ctx) : List UiNode :=
  let steps := uiSteps cx
  if (uiNav cx).any (fun (_, entries) => !entries.isEmpty) || cx.v.items.any (fun it => it.shown && uiTagIs it.comp.tag "layout.clinicalActivity") then []
  else [.stepper steps ((steps.map (·.1)).idxOf cx.s.screen)]

/-- Root return controls opt into footer placement through source metadata. -/
def uiFooterNode (cx : Ctx) (node : UiNode) : Bool :=
  match node with
  | .button id .. => cx.v.items.any fun it =>
      it.comp.id == id && it.comp.parent?.isNone && (it.comp.tag.splitOn ".").contains "footer"
  | _ => false

/-- Layout changes semantic drawing order, never the program's action order. -/
def uiPlaceFooter (cx : Ctx) (nodes : List UiNode) : List UiNode :=
  nodes.filter (fun node => !uiFooterNode cx node) ++ nodes.filter (uiFooterNode cx)

/-- New specification for owner review: informational label on signing screens. -/
def uiLateEntries (cx : Ctx) : List UiNode :=
  if cx.v.items.any (fun it => it.shown && match it.comp.kind with
      | .button (.commit _) => true | _ => false) then
    ((EntryTimes.records cx.sp cx.facts cx.s).filter (·.lateEntry)).map fun t =>
      .info "" "Late entry" "entryTimes" "status"
        [[("Entry", ((cx.sp.element? t.element).map (·.label)).getD t.element),
          ("Observed", toString t.observedAt),
          ("Signed", toString t.signedAt),
          ("Local policy (minutes)", toString cx.sp.design.lateEntryMinutes)]]
  else []

def uiWorkspace (cx : Ctx) : List UiNode :=
  uiProgress cx ++ uiLateEntries cx ++ uiPlaceFooter cx (uiComponentsWhere cx (uiInWorkspace cx) ++ uiMissingReviews cx)

/-- Public source descriptions are separate from exact machine provenance. -/
def uiProvenanceSourceLabel (source : String) : String :=
  if source.startsWith "record:" then
    match (source.toSlice.drop 7).toString with
    | "weightToday" => "Chart weight recorded today"
    | "appointmentReason" => "Appointment reason"
    | "preferredPharmacy" => "Preferred pharmacy on file"
    | "requestPharmacy" => "Pharmacy from refill request"
    | "requestDose" => "Dose from refill request"
    | "requestQuantity" => "Quantity from refill request"
    | "requestRefills" => "Refills from refill request"
    | _ => "Chart record"
  else if source.startsWith "linked:" then "Linked clinical entry"
  else if source == "default" then "Configured default"
  else if source == "macro" then "Automated entry"
  else "Prefilled value"

/-- The date identifies the chart snapshot, not an invented observation time. -/
def uiProvenanceText (cx : Ctx) (source : String) : String :=
  "Source: " ++ uiProvenanceSourceLabel source ++ " · chart as of " ++ cx.disp.asOf

/-- A linked source uses its public spec label; other sources use chart captions.
The exact machine provenance remains unchanged in the ordinary field node. -/
def uiFieldSourceText (cx : Ctx) (source : String) : String :=
  if source.startsWith "linked:" then
    match cx.sp.element? (source.toSlice.drop 7).toString with
    | some element => "Source: Linked entry — " ++ uiLabel element.label "Clinical entry"
    | none => uiProvenanceText cx source
  else uiProvenanceText cx source

/-- Only shown fields contribute public captions. This metadata adds no action,
capture or confirmation, and does not replace the original field provenance. -/
def uiFieldSources (cx : Ctx) : List (CompId × String) :=
  cx.v.items.filterMap fun it =>
    if !it.shown then none else match it.comp.kind with
    | .field .. => it.provenance?.map fun source => (it.comp.id, uiFieldSourceText cx source)
    | _ => none


/-- Both entry points use this gate, including direct ordinary renderUi calls. -/
def uiDateBound (cx : Ctx) : Bool :=
  (!Workspace.enabled cx.prog || Workspace.bound cx.facts cx.s) &&
    cx.facts.sourcePatientId?.isSome && cx.facts.sourcePatientId? == cx.disp.sourcePatientId?

/-- Only full rows actually emitted in workspace/side may back an index entry.
Payload overrides are not interpreted as a license to reveal underlying records. -/
def uiDateSourcesAt (cx : Ctx) (nodes : List UiNode) : List UiSourceDate :=
  if uiDateBound cx then
    DateIndex.select (cx.disp.timelineSources?.getD [])
      ((cx.disp.timelineBackings?.getD []).filter fun b =>
        (cx.disp.timelineSources?.getD []).contains b.source && (infoPayload cx.facts b.info).isNone)
      nodes
  else []

def uiDateSources (cx : Ctx) : List UiSourceDate :=
  uiDateSourcesAt cx (uiWorkspace cx ++ uiSide cx)

/-- Dated opt-in retains the clinical workspace and indexes only its shown sources. -/
def uiDatedWorkspace (cx : Ctx) : List UiNode :=
  if uiDateBound cx && cx.v.items.any (fun it => it.shown &&
      (it.comp.tag == "layout.datedTimeline" || it.comp.tag.endsWith ".layout.datedTimeline")) then
    [.datedTimeline "Dated clinical timeline (UTC)" (Dated.dated (uiDateSources cx))
      (Dated.undated (uiDateSources cx)) (uiWorkspace cx)]
  else uiWorkspace cx

/-- Density decorates shown components without wrapping or filtering semantic nodes. -/
def uiCompact (cx : Ctx) : List CompId :=
  (cx.v.items.filter (fun it => it.shown && it.comp.size == .compact)).map (·.comp.id)

/-- The actual semantic UI sent to the browser. Program banners contribute to
the single shell landmark and are excluded from workspace and side components. -/
def renderUi (sp : Spec) (prog : Program) (facts : Facts) (disp : Display)
    (user : User) (s : State) : UiScreen :=
  let cx : Ctx := { sp, prog, facts, disp, user, s }
  let sources := uiSourceLabels cx
  let hints := uiEntryHints cx
  let choices := uiFieldChoices cx
  let compact := uiCompact cx
  { screen? := some s.screen, fieldSources? := some (uiFieldSources cx),
    banner := uiClinicalBanner facts disp, viewer? := some (uiClinicianViewer user disp),
    nav := uiNav cx, activeNav? := uiActiveNav cx, title := cx.v.title,
    sourceLabels? := if sources.isEmpty then none else some sources,
    compact? := if compact.isEmpty then none else some compact,
    entryHints? := if hints.isEmpty then none else some hints,
    fieldChoices? := if choices.isEmpty then none else some choices,
    workspace := uiDatedWorkspace cx, side := uiSide cx, modal := uiModal cx }

end Ehr.Render
