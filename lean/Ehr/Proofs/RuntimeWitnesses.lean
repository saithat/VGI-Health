import Ehr.Proofs.Runtime
import Ehr.Check.Sound

/-! Kernel-reduced counterexamples for deployed execution. Every declaration
here is a new specification for owner review, outside Comparator. All witnesses
use accepted programs and actual runs from runInit; no fabricated popup state
is assumed. `decide` is confined to these concrete finite computations. -/

namespace Ehr.Runtime.Witness
open Ehr Props Check

/-- New specification for owner review: an accepted scalar program's clinical
alert, using the Tiny patient's due care gap. -/
def spec : Spec :=
  Scalar.spec .flag .physician .shownOnCommit .careGap .interruptive

/-- New specification for owner review: the existing scalar program, unchanged. -/
def program : Program := Scalar.program .physician

/-- New specification for owner review: a responsible clinician's incoming
critical-result ticket on the Tiny patient's otherwise unchanged facts. -/
def facts : Facts :=
  { Examples.Tiny.facts with criticalResults? := some [{ result := {
      id := "k1", patient := Examples.Tiny.facts.patientId, label := "Critical result",
      responsible := Examples.Tiny.user.id, covering := "cover", availableAt := 0, limit := 60 } }] }

/-- New specification for owner review: the exact handler entry event. -/
def action : Event := .enter "critical.action:k1" (.text "called ICU")

/-- New specification for owner review: the extra confirmed human capture. -/
def capture : Captured :=
  { element := "critical.action:k1", slot := 0, value := .text "called ICU",
    byHuman := true, confirmed := true }

/-- New specification for owner review: API input assembly for the fixed run. -/
def input (s : State) (e : Event) : StepInput :=
  ⟨spec, program, facts, Examples.Tiny.user, s, e⟩

/-- New specification for owner review: the actual API initial state. -/
def initial : State := runInit ⟨spec, program, facts, Examples.Tiny.user⟩

/-- New specification for owner review: open a real alert through its shown
component, before documenting a critical result. -/
def opened : State := (runStep (input initial (.click "alert"))).state

/-- New specification for owner review: document while the popup stays open. -/
def documented : State := (runStep (input opened action)).state

/-- New specification for owner review: the fixed ordinary witness is accepted. -/
theorem accepted : check spec none program program = .ok := by decide

/-- New specification for owner review: the witness popup is actually open. -/
theorem opened_popup : opened.popup?.isSome = true := by decide

/-- New specification for owner review: this is a fixed-facts runtime run. -/
theorem documented_reachable :
    FixedReachable ⟨spec, program, facts, Examples.Tiny.user⟩ documented :=
  .event action (.event (.click "alert") .start)

/-- New specification for owner review: a checked program reaches a capture
with no spec element, refuting the captured-value clause of WritesAllowed. -/
theorem writes_not_allowed :
    Examples.Tiny.user.role = program.role ∧ capture ∈ documented.captured ∧
    spec.element? capture.element = none := by decide

/-- New specification for owner review: even this ordinary fixed-facts
runtime state has no exact core reachable counterpart. A wholesale identity
refinement is impossible because core WritesAllowed excludes its extra capture. -/
theorem not_core_reachable :
    ¬ Props.Reachable ⟨spec, program, facts, Examples.Tiny.user⟩ documented := by
  intro hs
  have hw := (Check.accepted_writesOnly spec none program program accepted).2
    facts Examples.Tiny.user writes_not_allowed.1 documented hs
  obtain ⟨el, hel, _⟩ := hw.1 capture writes_not_allowed.2.1
  rw [writes_not_allowed.2.2] at hel
  contradiction

/-- New specification for owner review: the popup-blocks rule fails in a
reachable state of an accepted ordinary program. The core refuses the event,
while runStep returns ok, changes captures and retains the open popup. -/
theorem popup_does_not_block :
    (step spec program facts Examples.Tiny.user .human opened action).2 =
      .blocked "popup: acknowledge the alert first" ∧
    (runStep (input opened action)).result = .ok ∧
    documented.captured ≠ opened.captured ∧ documented.popup? = opened.popup? := by decide

/-- New specification for owner review: the responsible clinician's role is
not checked by the critical handler, even with the clinical popup open. -/
theorem nurse_can_document :
    (runStep { input opened action with user := { Examples.Tiny.user with role := .rn } }).result = .ok ∧
    capture ∈ (runStep { input opened action with
      user := { Examples.Tiny.user with role := .rn } }).state.captured := by decide

/-- New specification for owner review: fixed workspace witness program. -/
def workspace : Program := { program with patientSelection? := some true }

/-- New specification for owner review: directory/facts sufficient to open
and hydrate the scalar program's single clinical screen. -/
def directoryFacts : Facts :=
  { facts with sourcePatientId? := some "source-A", patientDirectory? := some {
      patients := [{ id := "source-A", name := "Patient A", mrn := "A" }],
      activities := [{ info := "scheduleTasks", title := "Schedule", rows := [{ patient := "source-A", fields := [] }] }] } }

/-- New specification for owner review: workspace API input assembly. -/
def workspaceInput (s : State) (e : Event) : StepInput :=
  ⟨spec, workspace, directoryFacts, Examples.Tiny.user, s, e⟩

/-- New specification for owner review: unselected workspace start. -/
def landing : State := runInit ⟨spec, workspace, directoryFacts, Examples.Tiny.user⟩

/-- New specification for owner review: actual semantic patient-open control. -/
def selectPatient : Event := .click "workspace.open|source-A|0|scheduleTasks"

/-- New specification for owner review: select, hydrate, and enter a confirmed
spec value through the deployed API. -/
def assessed : State :=
  let selected := (runStep (workspaceInput landing selectPatient)).state
  (runStep (workspaceInput selected (.enter "assessmentField" (.flag true)))).state

/-- New specification for owner review: open then acknowledge the clinical
popup in the selected patient's chart. -/
def acknowledged : State :=
  let modal := (runStep (workspaceInput assessed (.click "alert"))).state
  (runStep (workspaceInput modal (.ack "clinicalAlert"))).state

/-- New specification for owner review: return to the list after acknowledgment. -/
def returned : State := (runStep (workspaceInput acknowledged (.click "workspace.return"))).state

/-- New specification for owner review: selection-enabled witness is accepted. -/
theorem workspace_accepted : check spec none workspace workspace = .ok := by
  apply (check_ok_iff spec none workspace workspace).mpr
  simp only [rules, List.mem_cons, List.not_mem_nil, forall_eq_or_imp]
  repeat' constructor
  all_goals first
    | decide
    | (simp [workspace, program, Scalar.program, Scalar.screen, Scalar.field, Scalar.button,
        Props.allComps])

/-- New specification for owner review: the confirmed and acknowledged chart
state is reached through selection, hydration and human API events. -/
theorem acknowledged_reachable :
    FixedReachable ⟨spec, workspace, directoryFacts, Examples.Tiny.user⟩ acknowledged :=
  .event (.ack "clinicalAlert") (.event (.click "alert")
    (.event (.enter "assessmentField" (.flag true)) (.event selectPatient .start)))

/-- New specification for owner review: global confirmed-capture retention
(EnteredOnce) fails across workspace return, a non-entry, non-macro click. -/
theorem return_loses_capture :
    ∃ x ∈ acknowledged.captured, x.confirmed = true ∧ x ∉ returned.captured ∧
      clickedMacro? spec workspace directoryFacts acknowledged "workspace.return" = none := by
  refine ⟨{ element := "assessment", slot := 0, value := .flag true, byHuman := true, confirmed := true }, ?_⟩
  decide

/-- New specification for owner review: global acknowledgment persistence
(InterruptsOnce) and the acknowledgment-change clause of OnlyHumanCommitsAndAcks
fail across workspace return. The clearing event is a click, not an ack. -/
theorem return_loses_ack :
    acknowledged.acked ≠ [] ∧ returned.acked = [] ∧
      ∀ a, (Event.click "workspace.return") ≠ .ack a := by
  refine ⟨by decide, by decide, ?_⟩
  intro a h
  cases h

/-- New specification for owner review: the unselected runtime view has no
items, including the required patient banner. Thus a global LandmarksShown
analogue using runView fails before a patient is selected. -/
theorem landing_has_no_landmark :
    "patientBanner" ∈ spec.design.landmarks ∧
    (runView ⟨spec, workspace, directoryFacts, Examples.Tiny.user, landing⟩).items = [] := by decide

/-- New specification for owner review: the same accepted scalar layout can
carry a passive care-gap alert. -/
def passiveSpec : Spec := Scalar.spec .flag .physician .shownOnCommit .careGap .passive

/-- New specification for owner review: the passive workspace program is accepted. -/
theorem passive_accepted : check passiveSpec none workspace workspace = .ok := by
  apply (check_ok_iff passiveSpec none workspace workspace).mpr
  simp only [rules, List.mem_cons, List.not_mem_nil, forall_eq_or_imp]
  repeat' constructor
  all_goals first
    | decide
    | (simp [workspace, program, Scalar.program, Scalar.screen, Scalar.field, Scalar.button,
        Props.allComps])

/-- New specification for owner review: global PassiveShownInline using
runView fails in the initial unbound workspace, even though its screen is
program-defined, targeted, and its passive care-gap alert is firing. -/
theorem landing_passive_not_shown :
    let al := Scalar.alert .careGap .passive
    al ∈ passiveSpec.alerts ∧ al.tier = .passive ∧
    (workspace.screen? landing.screen).any al.targetsScreen = true ∧
    alertHolds passiveSpec directoryFacts landing al.id = true ∧
    (runView ⟨passiveSpec, workspace, directoryFacts, Examples.Tiny.user, landing⟩).items = [] := by
  decide

/-- New specification for owner review: the passive-alert landing witness is
itself the deployed initial state for that spec and is runtime reachable. -/
theorem passive_landing_reachable :
    FixedReachable ⟨passiveSpec, workspace, directoryFacts, Examples.Tiny.user⟩ landing :=
  .start

#print axioms accepted
#print axioms opened_popup
#print axioms documented_reachable
#print axioms writes_not_allowed
#print axioms not_core_reachable
#print axioms popup_does_not_block
#print axioms nurse_can_document
#print axioms workspace_accepted
#print axioms acknowledged_reachable
#print axioms return_loses_capture
#print axioms return_loses_ack
#print axioms landing_has_no_landmark
#print axioms passive_accepted
#print axioms landing_passive_not_shown
#print axioms passive_landing_reachable
end Ehr.Runtime.Witness
