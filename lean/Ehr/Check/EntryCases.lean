import Ehr.Check.EntryWitness

/-! Fixed, synthetic release fixtures in conformance/clinical.mjs. The order,
values and expected omissions are independent of the candidate's guard table. -/
namespace Ehr.Check.EntryWitness
open Ehr Ehr.Props

/-- New specification for owner review. Clinical inputs of the held-out entry episode. -/
def facts (cm : CommitId) : Facts where
  patientId := "heldout-A"
  identity := ⟨"HA", "F", 42⟩
  allergyVersion := 3
  allergyClasses := []
  medsVersion := 4
  notesVersion := 2
  historyVersion := 1
  currentMedClasses := []
  weightToday? := some (700, .kg)
  careGaps := []
  abnormalResult := cm == "ackResult"
  now := 20000
  medToGive? := if cm == "administerMed" then some "morphine" else none
  record := [("appointmentReason", "Held-out visit"), ("preferredPharmacy", "community")]

/-- New specification for owner review. Selection adds the suite's one-patient
directory and source binding, leaving clinical data intact. -/
def selectionFacts (p : Program) (f : Facts) : Facts := Id.run do
  if !Workspace.enabled p then return f
  let id := f.sourcePatientId?.getD f.patientId
  let name := "Heldout " ++ id
  let activities := [("scheduleTasks","Schedule"), ("edTrackBoard","Track Board"),
    ("shiftWorklist","Unit Census"), ("unitCensus","Unit Census"), ("orSchedule","OR Schedule"),
    ("consultList","Consults"), ("inboxResults","Inbox"), ("inboxRxRequests","Rx Requests")]
  let rows : List PatientListRow := [⟨id, [("Patient",name), ("MRN",id), ("Context","Held-out scheduled encounter")], none⟩]
  return { f with sourcePatientId? := some id, patientDirectory? := some <|
    f.patientDirectory?.getD ⟨[⟨id,name,id⟩], activities.map fun (info,title) => ⟨info,title,rows⟩⟩ }

/-- New specification for owner review. Declared commit workloads of the five release personas. -/
def personaCommits : String → List CommitId
  | "P1" => ["signOrders","signNote","ackResult","approveRefill","denyRefill"]
  | "P2" => ["signOrders","signNote","disposition"]
  | "P3" => ["administerMed","chartAssessment"]
  | "P4" => ["signOrders","signNote","recordImmunization","ackResult","approveRefill","denyRefill"]
  | "P5" => ["signOrders","signNote","ackResult","signOpNote","discharge"]
  | _ => []

/-- New specification for owner review. Ordered human-entry prefixes; diagnosis
precedes order entry as the source of a possible linked capture. -/
def fields : CommitId → List ElementId
  | "signOrders" => ["visitDiagnosis", "patientIdReentry", "weight", "dosingWeight", "drug",
      "dose", "doseUnit", "route", "freq", "duration",
      "quantity", "refills", "indication", "pharmacy", "substitution",
      "prn", "orderDiagnosis"]
  | "signNote" => ["chiefComplaint", "hpi", "ros", "exam", "assessmentPlan",
      "visitDiagnosis", "claimDiagnosis", "levelOfService", "followUp", "patientInstructions",
      "medRecDecision"]
  | "ackResult" => ["resultAction", "patientMessage"]
  | "approveRefill" => ["refillDecision", "refillQuantity", "refillRefills", "refillPharmacy", "refillProtocolMet"]
  | "denyRefill" => ["refillDecision", "refillDenyReason"]
  | "administerMed" => ["wristbandScan", "medScan", "adminStatus", "adminReason", "painScore",
      "highAlertCosign"]
  | "chartAssessment" => ["bpSystolic", "bpDiastolic", "heartRate", "respRate", "temperature",
      "spo2", "painReassessment", "nursingAssessment"]
  | "recordImmunization" => ["vaccine", "vaccineLot", "vaccineSite", "vaccineRoute", "visGiven",
      "visEditionDate", "vaccineManufacturer", "vaccineProvider"]
  | "signOpNote" => ["opPreopDiagnosis", "opPostopDiagnosis", "opProcedure", "opAnesthesia", "opFindings",
      "opEbl", "opSpecimens", "opComplications", "opCondition"]
  | "discharge" => ["dischargeMedRec", "dischargeDiagnosis", "dischargeFollowUp", "dischargeInstructions", "dischargeCondition",
      "dischargeDestination"]
  | "disposition" => ["dispositionChoice", "visitDiagnosis", "dispositionCondition"]
  | _ => []

/-- New specification for owner review. Human sample values from the entry,
human-only and two-line prescribing fixtures. Quantities are in tenths. -/
def sample (sp : Spec) (cm drug : String) : ElementId → Value
  | "patientIdReentry" => .text "HA/F/42"
  | "weight" | "dosingWeight" => .qty 700 .kg
  | "drug" => .code drug
  | "dose" => .qty (if drug == "oxycodone" then 50 else if drug == "amoxicillin" then 10000 else 5000) .mg
  | "doseUnit" => .code "mg"
  | "route" => .code "oral"
  | "freq" => .code (if drug == "oxycodone" then "q6h" else "bid")
  | "duration" => .code "7-days"
  | "quantity" => .qty 140 .none
  | "refills" | "refillRefills" => .qty 0 .none
  | "pharmacy" | "refillPharmacy" => .code "community"
  | "substitution" | "prn" => .code "false"
  | "orderDiagnosis" | "visitDiagnosis" | "claimDiagnosis" | "dischargeDiagnosis" => .code "J18.9"
  | "levelOfService" => .code "99213"
  | "followUp" | "dischargeFollowUp" => .code "2-weeks"
  | "medRecDecision" => .code "continue"
  | "resultAction" => .code "reviewed"
  | "patientMessage" => .text "Discussed abnormal result; follow up arranged"
  | "refillDecision" => .code (if cm == "denyRefill" then "deny" else "approve")
  | "refillQuantity" => .qty 300 .none
  | "refillProtocolMet" | "visGiven" | "priorAuthRequest" | "naloxoneEducation" | "consentVerified" => .flag true
  | "refillDenyReason" => .code "needs-visit"
  | "wristbandScan" => .code "heldout-A"
  | "medScan" => .code "morphine"
  | "adminStatus" => .code "given"
  | "adminReason" => .code "scheduled"
  | "painScore" => .code "4"
  | "highAlertCosign" => .user "heldout-second-nurse"
  | "bpSystolic" => .qty 1200 .none
  | "bpDiastolic" => .qty 800 .none
  | "heartRate" => .qty 720 .none
  | "respRate" => .qty 160 .none
  | "temperature" => .qty 370 .none
  | "spo2" => .qty 980 .none
  | "painReassessment" => .code "2"
  | "vaccine" => .code "140"
  | "vaccineLot" => .text "HELDOUT-LOT"
  | "vaccineSite" => .code "left-deltoid"
  | "vaccineRoute" => .code "IM"
  | "visEditionDate" => .text "2025-01-31"
  | "vaccineManufacturer" => .text "Synthetic manufacturer"
  | "vaccineProvider" => .text "Heldout clinician"
  | "opPreopDiagnosis" | "opPostopDiagnosis" => .code "K35.80"
  | "opProcedure" => .code "44970"
  | "opAnesthesia" => .code "general"
  | "opEbl" => .qty 100 .mL
  | "opComplications" => .code "none"
  | "opCondition" | "dischargeCondition" | "dispositionCondition" => .code "stable"
  | "dischargeMedRec" => .code "reconciled"
  | "dischargeDestination" => .code "home"
  | "dispositionChoice" => .code "discharge"
  | "abxIndication" => .code "respiratory-infection"
  | "naloxoneOffer" => .code "offered-declined"
  | e => match (sp.element? e).map ElementSpec.kind with
    | some (.coded _) => .code "documented"
    | some (.quantity unit) => .qty 10 unit
    | some .flag => .flag true
    | _ => .text "Held-out documented clinical findings"

/-- New specification for owner review. Use only the suite's declared sources. -/
def linkSource : ElementId → Option ElementId
  | "dosingWeight" => some "weight"
  | "claimDiagnosis" | "orderDiagnosis" => some "visitDiagnosis"
  | _ => none

/-- New specification for owner review. A field must write this element on the active line. -/
def field (i : Scene) (e : ElementId) : Trial Component :=
  visit i ("field " ++ e) fun s c => match c.kind with
    | .field id slot _ => id == e && resolveSlot s slot == s.currentSlot
    | _ => false

/-- New specification for owner review. Entering a field succeeds and records
the expected confirmed human value on the active line. -/
def enterAt (i : Scene) (c : Component) (e : ElementId) (v : Value) : Trial Unit := do
  applyOk i.toInitInput (.enter c.id v)
  let s ← current
  require ((capturedAt? s e s.currentSlot).any fun x => x.value == v && x.confirmed && x.byHuman)
    s!"Human entry of {e} must confirm {repr v} on line {s.currentSlot}"

/-- New specification for owner review. Reveal the active field and enter the sample there. -/
def enter (i : Scene) (e : ElementId) (v : Value) : Trial Unit := do
  enterAt i (← field i e) e v

/-- New specification for owner review. An actual matching commit button, after navigation. -/
def button (i : Scene) (cm : CommitId) : Trial Component :=
  visit i ("commit " ++ cm) fun _ c => c.kind == .button (.commit cm)

/-- New specification for owner review. The first unmet guard entry has the
exact expected identifier. The native refusal must give that entry's full
reason. The empty order uses the separate drug-or-service guard. -/
def refusal (i : Scene) (cm e : String) (empty := false) : Trial Unit := do
  let c ← button i cm
  let s ← current
  let rq := i.spec.entries.find? fun q => q.commit == cm && !entryMet i.spec i.facts i.user s q
  let expected := if empty then some "entry required: drug or complete service order" else do
    let q ← rq
    guard (q.element == e)
    return entryReason i.spec i.facts i.user s q
  let r ← act i.toInitInput (.click c.id)
  require ((if empty then orderLines s == [] && !s.captured.any (fun x => serviceOrderAt s x.slot) &&
      !signingHasOrder i.spec s cm else true) &&
    expected.any (fun reason => reason.contains e && r == .blocked reason) && !(← current).commits.contains cm)
    s!"{cm} at {s.screen} must refuse {e} before signing; observed {repr r}"

/-- New specification for owner review. Bound signature attempts and insist
on successful real acknowledgments, distinct popup keys and a new signature. -/
def finishAt (i : Scene) (id cm : String) (seen : List (AlertId × String)) : Nat → Trial Unit
  | 0 => require false s!"Complete {cm} within the suite's 40 interactions"
  | n+1 => do
    let r ← act i.toInitInput (.click id)
    let s ← current
    if let some key := s.popup? then
      require (r == .blocked "alert" && !seen.contains key) s!"Resolve distinct {cm} alert {key.1}"
      applyOk i.toInitInput (.ack key.1)
      finishAt i id cm (key :: seen) n
    else require (r == .ok && s.commits.contains cm) s!"Complete {cm} at {s.screen}; observed {repr r}"

/-- New specification for owner review. Start the signature with a still-unsigned chart. -/
def finish (i : Scene) (cm : CommitId) : Trial Unit := do
  let c ← button i cm
  require (!(← current).commits.contains cm) s!"{cm} was already signed"
  finishAt i c.id cm [] 20

/-- New specification for owner review. A declared link must yield the exact
source value, confirmed with linked provenance. Manual fields are human-entered. -/
def supplyAt (i : Scene) (cm drug e src : String) (testOmission linked : Bool) : Trial Unit := do
  let v := sample i.spec cm drug e
  let c ← visit i ("field " ++ e) fun s c => match c.kind with
    | .field id slot pf => id == e && resolveSlot s slot == s.currentSlot &&
        (match pf with | .linked x => linked && x == src | _ => !linked)
    | _ => false
  if linked then
    let s ← current
    if (capturedAt? s e s.currentSlot).isNone then
      let leave ← visit i "navigation away from the linked field" fun t x =>
        (gotoOf? x.kind).any (· != t.screen)
      applyOk i.toInitInput (.click leave.id)
      let _ ← field i e
    let t ← current
    require ((capturedAt? t e t.currentSlot).any fun x => x.confirmed && x.value == v &&
      x.provenance? == some ("linked:" ++ src)) s!"Refresh {e} from confirmed {src}"
  else
    if testOmission then fork (refusal i cm e)
    enterAt i c e v

/-- New specification for owner review. Exercise both declared modes when the
layout mixes manual and linked controls for an entry. The alternate attempt
starts at the same prefix. -/
def supply (i : Scene) (cm drug e : String) (testOmission : Bool) : Trial Unit := do
  match linkSource e with
  | none =>
    if testOmission then fork (refusal i cm e)
    enter i e (sample i.spec cm drug e)
  | some src =>
    let modes := i.program.screens.flatMap fun sc => sc.components.filterMap fun c => do
      let (id,_,pf) ← fieldOf? c.kind
      guard (id == e)
      return (match pf with | .linked _ => true | _ => false)
    if modes.contains true && modes.contains false && testOmission then
      fork (supplyAt i cm drug e src true false)
    supplyAt i cm drug e src testOmission (modes.contains true)

/-- New specification for owner review. For every ordinary entry, branch at
its fixture prefix, observe the exact omission, then continue the human path.
Drug uses the empty-code edit on a populated line. -/
def entryScenario (i : Scene) (cm : CommitId) : Trial Unit := do
  openChart i.toInitInput
  for e in fields cm do
    if cm == "signOrders" && e == "drug" then
      fork (refusal i cm e true)
      enter i e (.code "metformin")
      fork do
        let c ← field i e
        let r ← act i.toInitInput (.enter c.id (.code ""))
        let s ← current
        require ((match r with | .blocked _ => true | _ => false) &&
          (capturedAt? s e s.currentSlot).any (·.value == .code "metformin"))
          "Refuse the empty medication code and preserve metformin"
    else supply i cm "metformin" e (!(cm == "signOrders" && e == "visitDiagnosis"))
  finish i cm

/-- New specification for owner review. Build the native scene from the candidate,
the clinical fixture and the first commit workflow. -/
def scene (sp : Spec) (p : Program) (cm : String) (f : Facts) : Scene where
  spec := sp
  program := p
  facts := selectionFacts p f
  user := ⟨p.owner,p.role⟩
  workflow := ((p.screens.find? fun sc => sc.components.any fun c =>
    c.kind == .button (.commit cm)).map (·.workflow)).getD ""
  edges := p.screens.map fun sc => (sc.id, openGotoEdges p sc.id)

/-- New specification for owner review. When the mixed reference has no named
persona, the suite falls back to *all* workflows applicable to the role. -/
def roleCommits : Role → List CommitId
  | .physician => ["signOrders","signNote","ackResult","approveRefill","denyRefill",
      "recordImmunization","discharge","disposition"]
  | .np => ["signOrders","signNote","ackResult","approveRefill","denyRefill",
      "recordImmunization","discharge","disposition"]
  | .surgeon => ["signOrders","signNote","ackResult","signOpNote","discharge"]
  | .rn => ["administerMed","chartAssessment","recordImmunization"]
/-- New specification for owner review. The release contract follows the
persona canonical when one is supplied, or the program persona under the mixed
vendor reference. Custom-spec mathematical examples have no release workload. -/
def workload (sp : Spec) (can p : Program) : List CommitId :=
  if !["v1","v2","v3"].contains sp.version then [] else
  if !(personaCommits can.presetOwner).isEmpty then personaCommits can.presetOwner
  else if can.id == "canonical" then
    let cms := personaCommits p.presetOwner
    if cms.isEmpty then roleCommits p.role else cms
  else []

/-- New specification for owner review. A whole native scenario starts at native init. -/
def Realized (i : Scene) (task : Trial Unit) : Prop :=
  ∃ t, task.holds (runInit i.toInitInput) () t

/-- New specification for owner review. Return the first missing witness for a scene. -/
def diagnose (i : Scene) (task : Trial Unit) : Option String :=
  match task.search (runInit i.toInitInput) with
  | .ok _ => none
  | .error why => some why

theorem diagnose_sound {i task} (pass : diagnose i task = none) : Realized i task := by
  unfold diagnose at pass
  split at pass
  next out _ => exact ⟨out.val.2, out.property⟩
  next => contradiction

#print axioms diagnose_sound
end Ehr.Check.EntryWitness
