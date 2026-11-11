import Ehr.Proofs.RuntimeOrdinary

/-! Kernel-reduced witnesses for deployed execution. Every declaration here is
a new specification for owner review, outside Comparator. All witnesses use
accepted programs and actual runs from runInit; no fabricated popup state is
assumed. `decide` is confined to these concrete finite computations. The
ordinary witness is a regression for the repaired critical-result handler; the
workspace witnesses are counterexamples to the original global forms of
runtime properties. `Ehr.Proofs.RuntimeDraftWitness` continues the workspace
run through Return and reopening. -/

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

/-- New specification for owner review: API input assembly for the fixed run. -/
def input (s : State) (e : Event) : StepInput :=
  ⟨spec, program, facts, Examples.Tiny.user, s, e⟩

/-- New specification for owner review: the actual API initial state. -/
def initial : State := runInit ⟨spec, program, facts, Examples.Tiny.user⟩

/-- New specification for owner review: open a real alert through its shown
component, before documenting a critical result. -/
def opened : State := (runStep (input initial (.click "alert"))).state

/-- New specification for owner review: acknowledge the open alert. -/
def cleared : State := (runStep (input opened (.ack "clinicalAlert"))).state

/-- New specification for owner review: document the action after the
acknowledgment. -/
def documented : State := (runStep (input cleared action)).state

/-- New specification for owner review: the fixed ordinary witness is accepted. -/
theorem accepted : check spec none program program = .ok := by decide

/-- New specification for owner review: the witness popup is actually open. -/
theorem opened_popup : opened.popup?.isSome = true := by decide

/-- New specification for owner review: this is a fixed-facts runtime run. -/
theorem documented_reachable :
    FixedReachable ⟨spec, program, facts, Examples.Tiny.user⟩ documented :=
  .event action (.event (.ack "clinicalAlert") (.event (.click "alert") .start))

/-- New specification for owner review: regression for the former popup
counterexample. With the alert popup open, the critical-result entry is
refused by the API exactly as by the core interpreter, and the state is unchanged. -/
theorem popup_blocks_action :
    runStep (input opened action) =
      { state := opened, result := .blocked "popup: acknowledge the alert first" } ∧
    step spec program facts Examples.Tiny.user .human opened action =
      (opened, .blocked "popup: acknowledge the alert first") := by decide

/-- New specification for owner review: regression for the former
writes-not-allowed counterexample. After the acknowledgment the entry is
accepted; its text is a draft, `captured` is unchanged, and every capture is
for a spec element. -/
theorem action_is_draft :
    (runStep (input cleared action)).result = .ok ∧
    documented.captured = opened.captured ∧
    documented.criticalDrafts? = some [("k1", "called ICU")] ∧
    ∀ x ∈ documented.captured, (spec.element? x.element).isSome = true := by decide

/-- New specification for owner review: the handler authorizes by responsible
or covering user ID, not by role. An RN signed in with the responsible ID may
still draft the action text; this now changes only critical workflow state. -/
theorem role_not_checked :
    let nurse : StepInput := { input cleared action with user := { Examples.Tiny.user with role := .rn } }
    (runStep nurse).result = .ok ∧ (runStep nurse).state.captured = cleared.captured := by decide

/-- New specification for owner review: the former counterexample program now
has the runtime writes property, by the general theorem for accepted ordinary
programs. -/
theorem writes_allowed : FixedWritesAllowed ⟨spec, program, facts, Examples.Tiny.user⟩ :=
  (accepted_ordinary spec none program program accepted rfl facts Examples.Tiny.user
    (by decide)).writesAllowed

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

/-- New specification for owner review: the original global form of
confirmed-capture retention (`FixedEnteredOnce`) still fails across workspace
return, a non-entry, non-macro click: Return moves the chart's captures into
the patient's stored draft, so `State.captured` of the list state is empty.
The capture is not lost; see `Ehr.Runtime.Witness.return_keeps_capture` and
the session form `Ehr.Runtime.session_captures`. This replaces
`return_loses_capture`. -/
theorem return_empties_captured :
    ∃ x ∈ acknowledged.captured, x.confirmed = true ∧ x ∉ returned.captured ∧
      clickedMacro? spec workspace directoryFacts acknowledged "workspace.return" = none := by
  refine ⟨{ element := "assessment", slot := 0, value := .flag true, byHuman := true, confirmed := true }, ?_⟩
  decide

/-- New specification for owner review: the original global forms of
acknowledgment persistence (`FixedInterruptsOnce`) and of the
acknowledgment-change clause of `FixedOnlyHumanCommitsAndAcks` still fail
across workspace return: Return moves the chart's acknowledgments into the
patient's stored draft, so `State.acked` of the list state is empty, and the
event is a click, not an ack. The acknowledgment is not lost; see
`Ehr.Runtime.Witness.return_keeps_ack` and the session form
`Ehr.Runtime.session_acks`. This replaces `return_loses_ack`. -/
theorem return_empties_acked :
    acknowledged.acked ≠ [] ∧ returned.acked = [] ∧
      ∀ a, (Event.click "workspace.return") ≠ .ack a := by
  refine ⟨by decide, by decide, ?_⟩
  intro a h
  cases h

/-- New specification for owner review: the unselected runtime view has no
items, including the required patient banner. Thus a global LandmarksShown
analogue using runView fails before a patient is selected. What holds there
instead is `Ehr.Runtime.unselected_view`: the view shows no patient data. -/
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
program-defined, targeted, and its passive care-gap alert is firing. No
patient is selected, so by `Ehr.Runtime.unselected_view` no patient-specific
alert may be shown there. -/
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
#print axioms popup_blocks_action
#print axioms action_is_draft
#print axioms role_not_checked
#print axioms writes_allowed
#print axioms workspace_accepted
#print axioms acknowledged_reachable
#print axioms return_empties_captured
#print axioms return_empties_acked
#print axioms landing_has_no_landmark
#print axioms passive_accepted
#print axioms landing_passive_not_shown
#print axioms passive_landing_reachable
end Ehr.Runtime.Witness
