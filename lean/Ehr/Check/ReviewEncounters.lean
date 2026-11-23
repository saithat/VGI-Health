import Ehr.Check.ReviewTrace
import Ehr.Check.EntryCases
import Ehr.Render.PatientWorkspace

namespace Ehr.Check.ReviewTrace
open Ehr Ehr.Props EntryWitness

/-- New specification for owner review. Bind the shared clinical fixture and
selection directory to this program and its clinician. -/
def encounterInput (sp : Spec) (p : Program) (f : Facts) : InitInput :=
  ⟨sp,p,selectionFacts p f,⟨p.owner,p.role⟩⟩

/-- New specification for owner review. Enter the named field with a real
human event. A confirmed, correctly valued linked field can already be met. -/
def enterValue (e : ElementId) (v : Value) : Checkpoint :=
  ⟨"enter " ++ e, fun c => (fieldOf? c.kind).any (fun f => f.1 == e), fun i s c => do
    if ["dosingWeight", "orderDiagnosis", "claimDiagnosis"].contains e &&
        (capturedAt? s e s.currentSlot).any (fun x => x.confirmed && x.value == v) then return s
    (execute (enterAt {i with paths := []} c e v) s).map (·.2), fun _ _ => true⟩

/-- New specification for owner review. Order-line overrides and additional
conditional fields are specific to this fixture and release. -/
def prepare (sp : Spec) (cm : CommitId) (f : Facts) (overrides : List (ElementId × Value))
    (omitted : List ElementId := []) : List Checkpoint := Id.run do
  let mut fields := (EntryWitness.fields cm).map fun e =>
    -- These fixture text values are fixed even for a differently typed schema.
    (e, if ["indication", "chiefComplaint", "hpi", "ros", "exam", "assessmentPlan",
        "patientInstructions", "nursingAssessment", "opFindings", "opSpecimens",
        "dischargeInstructions"].contains e then .text "Held-out documented clinical findings"
      else sample sp cm "metformin" e)
  if cm == "signOrders" then
    if f.encounterKind? == some "preop" then
      fields := fields ++ [("consentVerified", .flag true), ("hpUpdate", .text "Held-out documented clinical findings"),
        ("medsToHold", .text "Held-out documented clinical findings")]
    if overrides.lookup "drug" == some (.code "amoxicillin") && (sp.element? "abxIndication").isSome then
      fields := fields ++ [("abxIndication", .code "respiratory-infection")]
  return (fields.filter fun pair => !omitted.contains pair.1).map fun (e, v) =>
    enterValue e ((overrides.lookup e).getD (if e == "medScan" then .code (f.medToGive?.getD "") else v))

/-- New specification for owner review. All six controlled-prescription details
are visible together on one row of the displayed native order summary. -/
def showsControlledLine (i : InitInput) (s : State) (display : Render.Display) : Bool :=
  let ui := Render.renderPatientWorkspace i.spec i.program i.facts display i.user s
  let expected := [("Drug", "oxycodone"), ("Dose", "5.0 mg"), ("Route", "oral"),
    ("Frequency", "q6h"), ("Quantity", "14.0"), ("Refills", "0.0")]
  (Render.uiAtomsList (ui.workspace ++ ui.side ++ ui.modal.toList)).any fun node =>
    match node with
    | .info _ _ "orderSummary" _ rows => rows.any fun row => expected.all fun (k, v) => row.lookup k == some v
    | _ => false

/-- New specification for owner review. Human signature through a shown commit
control with bounded, distinct modal acknowledgments. An interrupt probe also
tries scrolling, acknowledging the wrong ID and reopening the handled key. -/
def finish (cm : CommitId) (panels : List InfoId := []) (interrupt : Option AlertId := none) : Checkpoint :=
  ⟨"complete " ++ cm, fun c => commitOf? c.kind == some cm, fun i s c => do
    for panel in panels do
      unless (runView ⟨i.spec, i.program, i.facts, i.user, s⟩).items.any (fun item =>
        item.shown && showsInfo panel item.comp.kind) do throw s!"Show {panel} before {cm}"
    if panels.contains "orderSummary" && !showsControlledLine i s Render.Display.empty then
      throw "Show the complete controlled prescription on its order summary row"
    (execute (finishAt i c.id cm [] interrupt false 40) s).map (·.2), fun _ _ => true⟩

/-- New specification for owner review. Attempt this semantic action and check
the specific native refusal plus the absence of a signature. -/
def refuseCommit (cm reason : String) : Checkpoint :=
  ⟨"refuse " ++ cm ++ " for " ++ reason, fun c => commitOf? c.kind == some cm, fun i s c => do
    let r := dispatch i s (.click c.id)
    let entry := i.spec.entries.any fun rq => rq.commit == cm && rq.element == reason &&
      !entryMet i.spec i.facts i.user s rq && r.result == .blocked (entryReason i.spec i.facts i.user s rq)
    let review := i.spec.reviews.any fun rq =>
      let receipt := match rq.mode with | .shownOnCommit => "" | .shownOrReceipt .. => " or covered by a valid receipt"
      let waiver := rq.waivedBy?.map (fun e => s!" (or a reason entered in {e})")
      rq.commit == cm && rq.info == reason && !reviewMet i.spec i.program i.facts s rq &&
        r.result == .blocked (s!"review required: {reason} must be shown" ++ receipt ++ waiver.getD "")
    unless !r.state.commits.contains cm && r.state.popup?.isNone && (entry || review) do
      throw s!"Expected refusal for {reason}, got {repr r.result}"
    return r.state, fun _ _ => true⟩

/-- New specification for owner review. Remove exactly the named display
providers, retaining every other component and all native action behavior. -/
def withoutPanel (p : Program) (panel : InfoId) : Program :=
  {p with screens := p.screens.map fun sc => {sc with components := sc.components.filter fun c =>
    match c.kind with
    | .panel i | .table i | .trend i | .priorAuth i => i != panel
    | _ => true}}

/-- New specification for owner review. A single applicable encounter contract. -/
structure ClinicalCase where
  name : String
  input : InitInput
  steps : List Checkpoint
  service : Bool := false

/-- New specification for owner review. Order fixtures for controlled and
antibiotic prescribing. Doses are in tenths of their declared native unit. -/
def controlled : List (ElementId × Value) :=
  [("drug", .code "oxycodone"), ("dose", .qty 50 .mg), ("freq", .code "q6h")]

/-- New specification for owner review. Complete the actual prepared encounter,
observing the required panels immediately before pressing its signing button. -/
def completeCase (sp : Spec) (p : Program) (cm : CommitId) (name : String)
    (panels : List InfoId := []) (facts : Facts := facts cm) (values : List (ElementId × Value) := [])
    (omitted : List ElementId := []) (interrupt : Option AlertId := none) : ClinicalCase :=
  ⟨name, encounterInput sp p facts, prepare sp cm facts values omitted ++ [finish cm panels interrupt], false⟩

/-- New specification for owner review. Generic, preoperative, and drug-specific
review and completion encounters. Compound panel lists share a single trace. -/
def reviewCases (sp : Spec) (p : Program) (cm : CommitId) : List ClinicalCase := Id.run do
  let plain := completeCase sp p cm ("positive." ++ cm)
  let review := fun panels => completeCase sp p cm ("review." ++ cm) panels
  match cm with
  | "signOrders" =>
    let preop := {(facts "") with encounterKind? := some "preop"}
    let pre := p.role != .np
    let panels := ["allergyList", "currentMeds", "doseCheck", "curesReport", "orderSummary"] ++
      (if pre then ["anticoagulantList"] else [])
    return [plain, completeCase sp p cm ("review." ++ cm) panels (if pre then preop else (facts "")) controlled] ++
      (if pre then [completeCase sp p cm "positive.preop" ["anticoagulantList"] preop] else [])
  | "administerMed" =>
    let med := fun drug panel => completeCase sp p cm ("review." ++ panel) [panel] {(facts "") with medToGive? := some drug} [] ["painScore"]
    let abx := {(facts "") with
      medToGive? := some "amoxicillin"
      receipts := [⟨"abxIndication", 0, 20000, .rn, "prior-nurse"⟩]}
    return [review ["allergyList", "marDoseDetails"], med "insulin lispro" "glucoseTrend", med "heparin" "coagLabs"] ++
      (if sp.version == "v3" then [completeCase sp p cm "v3.mar-indication-shown" ["abxIndication"] abx []
        ["painScore", "highAlertCosign"]] else [])
  | "ackResult" => return [review ["resultDetail", "resultTrend"]]
  | "approveRefill" => return [review ["relevantLabs", "lastVisit", "adherence"]]
  | "recordImmunization" => return [review ["allergyList", "immunizationHistory"]]
  | "signOpNote" => return [review ["intraopRecord"]]
  | "discharge" => return [review ["currentMeds", "allergyList"]]
  | "disposition" => return [review ["vitals"]]
  | _ => return [plain]

/-- New specification for owner review. Current, expired, wrong-version and
wrong-role receipts on a layout with only the tested panel suppressed. -/
def receiptCases (sp : Spec) (p : Program) : List ClinicalCase :=
  [("allergyList", 3), ("currentMeds", 4), ("orderSummary", 0)].flatMap fun (panel, version) => Id.run do
    let epcs := panel == "orderSummary"
    return (if epcs then ["fresh"] else ["valid", "expired", "wrong-version", "wrong-role"]).map fun variant =>
      let receipt := ⟨panel, version + (if variant == "wrong-version" then 1 else 0),
        20000 - (if variant == "expired" then 241 else 0), if variant == "wrong-role" then .rn else p.role,
        if epcs then p.owner else "prior-reviewer"⟩
      let f := {(facts "") with receipts := [receipt]}
      ⟨"receipt." ++ panel ++ "." ++ variant, encounterInput sp (withoutPanel p panel) f,
        prepare sp "signOrders" f (if epcs then controlled else []) ++
          [if variant == "valid" then finish "signOrders" else refuseCommit "signOrders" panel], false⟩

end Ehr.Check.ReviewTrace
