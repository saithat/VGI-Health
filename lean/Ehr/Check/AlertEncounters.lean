import Ehr.Check.ReviewEncounters
import Ehr.Render.PatientWorkspace

namespace Ehr.Check.ReviewTrace
open Ehr Ehr.Props EntryWitness Ehr.Render

/-- New specification for owner review. Stand at a shown commit before
navigating to an optional or passive alert, without signing yet. -/
def atCommit (i : Scene) (cm : CommitId)
    (action : State → Component → Except String State := fun s _ => .ok s) : Trial Unit :=
  control i ("visit " ++ cm) (fun c => commitOf? c.kind == some cm) action

/-- New specification for owner review. Configured alert is actually shown and
firing in the native view. A passive click on its workflow must leave no popup. -/
def observeAlert (i : Scene) (id : AlertId) (workflow : Option String) : Trial Unit :=
  control i ("inspect " ++ id) (fun c => (alertOf? c.kind).any (·.1 == id)) fun s c => do
    if let some wf := workflow then
      unless (i.program.screen? s.screen).any (·.workflow == wf) do throw s!"Show {id} in {wf}"
    unless (runView ⟨i.spec, i.program, i.facts, i.user, s⟩).items.any (fun it =>
      it.comp.id == c.id && it.shown && it.firing) do throw s!"Show firing {id}"
    if workflow.isSome then
      let t := (dispatch i.toInitInput s (.click c.id)).state
      unless t.popup?.isNone do throw s!"Keep {id} inline"
      return t
    return s

/-- New specification for owner review. Full interrupt, passive and removable
alert encounters, including the predecessor's interaction severity trigger. -/
def alertCases (sp : Spec) (p : Program) (workflows : List String) (cm : CommitId) : List Case := Id.run do
  let base := (facts "")
  let antibiotic : List (ElementId × Value) := [("drug", .code "amoxicillin"), ("dose", .qty 10000 .mg)]
  let allergy := {base with allergyClasses := ["penicillin"]}
  let alert := fun id f vals omitted => completeCase sp p cm ("alert." ++ id) [] f vals omitted (some id)
  let inline := fun id f vals omitted wf =>
    let present := (allComps p).any fun sc => (alertOf? sc.2.kind).any (·.1 == id)
    let i := scene sp p "" f
    let site := atCommit i cm fun s _ => do
      if id == "minorInteractionPopup" then
        unless (sp.alert? id).any (fun a => a.cond == .interaction || a.cond == .minorInteraction) do
          throw "Declare the minor interaction trigger"
      return s
    (⟨"alert." ++ id, i, do
      checked (fun s => (execute (openChart i.toInitInput) s).map (·.2))
      prepare i sp cm f vals omitted
      site
      if wf.isSome || present then observeAlert i id wf
      finish i cm⟩ : Case)
  let work := workflows.contains
  match cm with
  | "signOrders" =>
    let notice := "highAlertOrderNotice"
    let noticeCase := if (sp.alert? notice).any (·.tier == .removable) then inline notice base controlled [] none
      else alert notice base controlled []
    return [alert "drugAllergyOrder" allergy antibiotic [],
      alert "interactionOrder" {base with currentMedClasses := ["iodinatedContrast"]} [] [],
      alert "doseRangeOrder" base ([("dose", .qty 999990 .mg)] ++ antibiotic) [], noticeCase] ++
      (if work "W1" then [inline "duplicateTherapyInline" {base with currentMedClasses := ["biguanide"]} [] [] (some "W1")] else [])
  | "administerMed" =>
    let omitted := ["painScore", "highAlertCosign"]
    let med := {allergy with medToGive? := some "amoxicillin"}
    let old := (sp.alert? "minorInteractionPopup").any (·.cond == .interaction)
    let minor := {base with medToGive? := some "amoxicillin",
                            interactions? := if old then none else some [⟨"heldout-minor", .minor⟩],
                            currentMedClasses := if old then ["vitaminKAntagonist"] else []}
    return [alert "drugAllergyAdmin" med [] omitted, alert "highAlertAdmin" (facts cm) [] [],
      inline "minorInteractionPopup" minor [] omitted none]
  | "approveRefill" =>
    return [alert "interactionRefill" {base with medToGive? := some "metformin", currentMedClasses := ["iodinatedContrast"]} [] [],
      inline "activeRxPopup" {base with medToGive? := some "metformin", currentMedClasses := ["biguanide"]} [] [] none,
      inline "refillCareGapPopup" {base with careGaps := ["screening-due"]} [] [] none]
  | "signNote" =>
    let gap := {base with careGaps := ["screening-due"]}
    return [inline "healthMaintenancePopup" gap [] [] none] ++
      (if work "W1" then [inline "careGapsInline" gap [] [] (some "W1")] else [])
  | "recordImmunization" =>
    return if work "W5" then [inline "immunizationsDueInline" {base with careGaps := ["vaccine-due"]} [] [] (some "W5")] else []
  | _ => return []

/-- New specification for owner review. Same-key suppression, then a new
allergy version on that very chart and a matching new human acknowledgment. -/
def changedAllergy (sp : Spec) (p : Program) : Case :=
  let cm := "signOrders"
  let id := "drugAllergyOrder"
  let f := {(facts "") with allergyClasses := ["penicillin"]}
  let vals := [("drug", Value.code "amoxicillin"), ("dose", Value.qty 10000 .mg)]
  let i := scene sp p "" f
  let changed := control i "review changed allergy version" (fun c => (alertOf? c.kind).any (·.1 == id))
    fun s c => do
      let same := (dispatch i.toInitInput s (.click c.id)).state
      unless same.popup?.isNone do throw "Previously acknowledged allergy evidence interrupted again"
      let fresh := {i with facts := {i.facts with allergyVersion := i.facts.allergyVersion + 1}}
      let next := (dispatch fresh.toInitInput same (.click c.id)).state
      unless next.popup?.any (·.1 == id) do throw "Updated allergy evidence must interrupt"
      advance fresh.toInitInput next (.ack id)
  ⟨"alerts.changed-data-reinterrupts", i, do
    checked (fun s => (execute (openChart i.toInitInput) s).map (·.2)); prepare i sp cm f vals; finish i cm; changed⟩

/-- New specification for owner review. Render exactly the suite's empty chart
display for the result lifecycle and inspect the native semantic tree. -/
def clinicalUi (i : InitInput) (s : State) : UiScreen :=
  renderPatientWorkspace i.spec i.program i.facts Display.empty i.user s

/-- New specification for owner review. Critical alert occurrences with their
actual semantic severity, including children of every rendered container. -/
def criticalAlerts (nodes : List UiNode) : List String :=
  (uiAtomsList nodes).filterMap fun n => match n with
    | .alert _ "criticalResult" _ severity => some severity
    | _ => none

/-- New specification for owner review. Available unresolved ticket persists
through UI ack and inbox signature. Receive, document and resolve using the
enabled rendered controls. Future and resolved alternatives inspect the whole UI. -/
def criticalCases (sp : Spec) (p : Program) : List Case := Id.run do
  let cm := "ackResult"
  let action := "Contacted patient; urgent treatment arranged"
  let result : Multi.Critical.Result := ⟨"heldout-critical", "heldout-A", "Critical potassium",
    p.owner, "heldout-covering", 19990, 30, none⟩
  let ticket : Multi.Critical.Ticket := { result }
  let f := {(facts "") with abnormalResult := true, criticalResults? := some [ticket]}
  let i := scene sp p "" f
  let follow := atCommit i cm fun s c => do
    let urgent := fun t => criticalAlerts ((clinicalUi i.toInitInput t).urgent?.getD [])
    let pending := fun t => (CriticalRuntime.tickets i.facts t).head?.any (·.resolution.isNone)
    unless urgent s == ["passive"] && s.popup?.isNone do throw "Show one passive urgent result"
    let ack := (dispatch i.toInitInput s (.ack "criticalResult")).state
    unless pending ack && urgent ack == ["passive"] do throw "UI acknowledgment cleared the result"
    let signed ← signAt i.toInitInput cm [] none ack c
    unless pending signed && urgent signed == ["passive"] do throw "Inbox signature cleared the result"
    let button := fun t label => (uiAtomsList (clinicalUi i.toInitInput t).workspace).findSome? fun n =>
      match n with | .button id title _ true _ _ => if title == label then some id else none | _ => none
    let some receive := button signed "Receive critical result" | throw "Enable receipt for the responsible clinician"
    let received ← advance i.toInitInput signed (.click receive)
    let some field := (uiAtomsList (clinicalUi i.toInitInput received).workspace).findSome? (fun n => match n with
      | .field id "Clinical action taken" .. => some id | _ => none) | throw "Show the clinical action field"
    let documented ← advance i.toInitInput received (.enter field (.text action))
    let some resolve := button documented "Record action and resolve" | throw "Enable resolution after documentation"
    let resolved ← advance i.toInitInput documented (.click resolve)
    unless ((resolved.criticalResults?.getD []).head?.bind (·.resolution)).any (fun r =>
      r.actor == result.responsible && r.action == action) && (urgent resolved).isEmpty do throw "Record resolution and clear the urgent result"
    return resolved
  let suppressed := fun (i : Scene) => atCommit i cm fun s _ => do
    let ui := clinicalUi i.toInitInput s
    unless (criticalAlerts (ui.workspace ++ ui.side ++ ui.modal.toList ++ ui.urgent?.getD [])).isEmpty do
      throw "Suppress future and resolved critical results everywhere"
    return s
  let negative := fun (name : String) (t : Multi.Critical.Ticket) =>
    let j := scene sp p "" {(facts "") with criticalResults? := some [t]}
    (⟨name, j, do checked (fun s => (execute (openChart j.toInitInput) s).map (·.2)); suppressed j⟩ : Case)
  return [⟨"criticalResult.followThrough", i, do checked (fun s => (execute (openChart i.toInitInput) s).map (·.2)); prepare i sp cm f []; follow⟩,
    negative "criticalResult.future" {ticket with result := {result with availableAt := 30000}},
    negative "criticalResult.resolved" {ticket with resolution := some ⟨p.owner, 20000, action⟩}]

end Ehr.Check.ReviewTrace
