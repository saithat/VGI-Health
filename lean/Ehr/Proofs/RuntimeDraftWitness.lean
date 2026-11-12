import Ehr.Proofs.RuntimeUnselected
import Ehr.Proofs.RuntimeEpisodeWitness

/-! Regression for per-patient drafts on the workspace witness program of
`Ehr.Proofs.RuntimeWitnesses`. The run continues from the confirmed and
acknowledged chart through Return to the list, reopening the same patient and
hydrating the chart again. The capture and the acknowledgment survive, the
acknowledged alert does not interrupt again, a changed fact does, and the
hydrating call refuses a commit click and an acknowledgment. Every declaration
here is a new specification for owner review, outside Comparator. `decide` and
`#guard` are confined to these concrete finite computations. -/

namespace Ehr.Runtime.Witness
open Ehr Props Check

/-- New specification for owner review: the witness patient is opened again
from the list after Return; the chart is not yet hydrated. -/
def reselected : State := (runStep (workspaceInput returned selectPatient)).state

/-- New specification for owner review: the app's hydrating call, a scroll. -/
def reopened : State := (runStep (workspaceInput reselected (.scroll "clinical"))).state

/-- New specification for owner review: the confirmed human entry of the witness. -/
def assessment : Captured :=
  { element := "assessment", slot := 0, value := .flag true, byHuman := true, confirmed := true }

/-- New specification for owner review: the second bound patient episode of
the witness, starting when `reselected` is hydrated. -/
def reopenEpisode : BoundEpisode :=
  { spec, prog := workspace, facts := directoryFacts, user := Examples.Tiny.user,
    opened := reselected }

/-- New specification for owner review: the whole run is a fixed-facts API run. -/
theorem reopened_reachable :
    FixedReachable ⟨spec, workspace, directoryFacts, Examples.Tiny.user⟩ reopened :=
  .event (.scroll "clinical") (.event selectPatient
    (.event (.click "workspace.return") acknowledged_reachable))

/-- New specification for owner review: **the capture survives return and
reopen.** After Return it is in the patient's stored draft; after reopening it
is in the chart again. This replaces `return_loses_capture`. -/
theorem return_keeps_capture :
    assessment ∈ acknowledged.captured ∧
    assessment ∈ (Workspace.draft returned "source-A").captured ∧
    assessment ∈ sessionCaptured "source-A" returned ∧
    assessment ∈ reopened.captured := by decide

/-- New specification for owner review: **the acknowledgment survives return
and reopen.** This replaces `return_loses_ack`. -/
theorem return_keeps_ack :
    acknowledged.acked = [("clinicalAlert", "colorectalScreening")] ∧
    (Workspace.draft returned "source-A").acked = acknowledged.acked ∧
    sessionAcked "source-A" returned = acknowledged.acked ∧
    reopened.acked = acknowledged.acked := by decide

/-- New specification for owner review: hydration takes the draft out of the
store; the reopened chart holds the work and the store is empty again. -/
theorem reopened_store : returned.patientDrafts?.isSome = true ∧ reopened.patientDrafts? = none := by
  decide

/-- New specification for owner review: **an acknowledged alert does not
interrupt again on reopen.** In the first chart the commit click opens the
interruptive alert and is blocked. In the reopened chart the same click
commits and no popup opens. -/
theorem reopen_does_not_interrupt :
    (runStep (workspaceInput assessed (.click "recordButton"))).result = .blocked "alert" ∧
    (runStep (workspaceInput assessed (.click "recordButton"))).state.popup? =
      some ("clinicalAlert", "colorectalScreening") ∧
    (runStep (workspaceInput reopened (.click "recordButton"))).result = .ok ∧
    (runStep (workspaceInput reopened (.click "recordButton"))).state.popup? = none ∧
    (runStep (workspaceInput reopened (.click "recordButton"))).state.commits = ["recordReview"] := by
  decide

/-- New specification for owner review: the same patient's facts after the
care gap changed while the chart was closed. -/
def changedFacts : Facts := { directoryFacts with careGaps := ["cervicalScreening"] }

/-- New specification for owner review: the chart reopened with the changed facts. -/
def reopenedChanged : State :=
  (runStep ⟨spec, workspace, changedFacts, Examples.Tiny.user, reselected, .scroll "clinical"⟩).state

/-- New specification for owner review: **a changed fact alerts again.** The
stored acknowledgment is for the old key. With the changed fact the alert has
a new key, which is not acknowledged, and the commit click opens the popup
for it and is blocked. -/
theorem changed_fact_interrupts :
    reopenedChanged.acked = [("clinicalAlert", "colorectalScreening")] ∧
    (runStep ⟨spec, workspace, changedFacts, Examples.Tiny.user, reopenedChanged,
      .click "recordButton"⟩).result = .blocked "alert" ∧
    (runStep ⟨spec, workspace, changedFacts, Examples.Tiny.user, reopenedChanged,
      .click "recordButton"⟩).state.popup? = some ("clinicalAlert", "cervicalScreening") ∧
    (runStep ⟨spec, workspace, changedFacts, Examples.Tiny.user, reopenedChanged,
      .click "recordButton"⟩).state.commits = [] := by decide

/-- New specification for owner review: **the hydrating call refuses a
commit click and an acknowledgment** and returns the hydrated chart; an entry
on the hydrating call is applied as before. -/
theorem hydrating_call_refuses :
    runStep (workspaceInput reselected (.click "recordButton")) =
      { state := reopened, result := .blocked "Chart is loading" } ∧
    runStep (workspaceInput reselected (.ack "clinicalAlert")) =
      { state := reopened, result := .blocked "Chart is loading" } ∧
    (runStep (workspaceInput reselected (.enter "assessmentField" (.flag true)))).result = .ok := by
  decide

/-- New specification for owner review: hydration of the reopened chart succeeds. -/
theorem reopen_hydrates : reopenEpisode.Hydrates := ⟨by decide, by decide, by decide⟩

/-- New specification for owner review: the reopened chart is in the second
episode, and the per-episode properties hold for it with the restored draft. -/
theorem reopened_inEpisode :
    InEpisode reopenEpisode reopened ∧ EpisodeAccepted reopenEpisode :=
  ⟨.first (.scroll "clinical") reopen_hydrates (by decide),
   accepted_episode spec none workspace workspace workspace_accepted directoryFacts
    Examples.Tiny.user (by decide) reselected⟩

/-- New specification for owner review: the original global form of the
per-step human-entry clause (`FixedHumanStepsByHuman`) fails on the hydrating
call: the restored entry is new in `State.captured` and the event is a scroll.
The entry was made by an entry event in the first episode; the session form
`Ehr.Runtime.session_humanEntries` holds. -/
theorem reopen_restores_entry :
    assessment ∈ reopened.captured ∧ assessment ∉ reselected.captured ∧
    (∃ el, spec.element? assessment.element = some el ∧ HumanMustEnter el) ∧
    ∀ cid v, (Event.scroll "clinical") ≠ .enter cid v := by
  refine ⟨by decide, by decide, by decide, ?_⟩
  intro cid v h
  cases h

/-- New specification for owner review: properties 2, 5 and 11 hold across
workspace navigation on the witness, in the form of `SelectionGlobal`. -/
theorem witness_global : SelectionGlobal ⟨spec, workspace, directoryFacts, Examples.Tiny.user⟩ :=
  selection_global _ (by decide)

/-- New specification for owner review: the landing view of the witness shows
no patient data. Compare `landing_has_no_landmark`: properties 1 and 9 still
fail there in their original global form, and this is the property that holds. -/
theorem landing_workspaceOnly :
    WorkspaceOnly ⟨spec, workspace, directoryFacts, Examples.Tiny.user, landing⟩ :=
  unselected_view _ (by decide) (by decide)

#print axioms reopened_reachable
#print axioms return_keeps_capture
#print axioms return_keeps_ack
#print axioms reopened_store
#print axioms reopen_does_not_interrupt
#print axioms changed_fact_interrupts
#print axioms hydrating_call_refuses
#print axioms reopen_hydrates
#print axioms reopened_inEpisode
#print axioms reopen_restores_entry
#print axioms witness_global
#print axioms landing_workspaceOnly

/-! ## Executable regressions -/

/-- A second patient in the day list, for the isolation regressions. -/
def twoPatients : Facts :=
  let rows : List PatientListRow :=
    [{ patient := "source-A", fields := [] }, { patient := "source-B", fields := [] }]
  { directoryFacts with patientDirectory? := some {
      patients := [{ id := "source-A", name := "Patient A", mrn := "A" },
        { id := "source-B", name := "Patient B", mrn := "B" }],
      activities := [{ info := "scheduleTasks", title := "Schedule", rows := rows }] } }

/-- The same directory with patient B's record loaded. -/
def factsB : Facts := { twoPatients with sourcePatientId? := some "source-B" }

/-- One API call of the witness program with the given facts. -/
def call (f : Facts) (s : State) (e : Event) : State :=
  (runStep ⟨spec, workspace, f, Examples.Tiny.user, s, e⟩).state

/-- Patient B's chart, opened and hydrated after leaving patient A's. -/
def chartB : State :=
  call factsB (call twoPatients returned (.click "workspace.open|source-B|1|scheduleTasks"))
    (.scroll "clinical")

/-- Patient A's chart, reopened after leaving patient B's. -/
def chartA : State :=
  let list := call factsB chartB (.click "workspace.return")
  call twoPatients (call twoPatients list (.click "workspace.open|source-A|0|scheduleTasks"))
    (.scroll "clinical")

-- Save on leaving, restore on reopening.
#guard (Workspace.draft returned "source-A").captured == acknowledged.captured
#guard (Workspace.draft returned "source-A").acked == acknowledged.acked
#guard returned.captured.isEmpty && returned.acked.isEmpty && returned.commits.isEmpty
#guard reselected.captured.isEmpty && reselected.acked.isEmpty
#guard reopened.captured == acknowledged.captured && reopened.acked == acknowledged.acked
#guard reopened.commits.isEmpty && reopened.popup?.isNone && reopened.patientDrafts?.isNone
-- Another patient's chart gets nothing of patient A's draft, and keeps it stored.
#guard Workspace.bound factsB chartB
#guard chartB.captured.all (fun x => !x.byHuman) && chartB.acked.isEmpty
#guard (Workspace.draft chartB "source-A").captured == acknowledged.captured
#guard chartA.captured == acknowledged.captured && chartA.acked == acknowledged.acked
-- Leaving a chart without unsigned work stores nothing.
#guard (call directoryFacts (call directoryFacts selected (.scroll "clinical"))
  (.click "workspace.return")).patientDrafts?.isNone
-- Only confirmed human entries for spec elements the role may enter are restored.
#guard (Workspace.restore spec Examples.Tiny.user chartEpisode.start
  { patient := "source-A", acked := [],
    captured := [assessment, { assessment with byHuman := false },
      { assessment with confirmed := false }, { assessment with element := "notInSpec" }] }).captured
  == [assessment]
#guard (Workspace.restore spec { Examples.Tiny.user with role := .rn } chartEpisode.start
  { patient := "source-A", acked := [], captured := [assessment] }).captured.isEmpty
-- The hydrating call refuses a commit click and an acknowledgment.
#guard (runStep (workspaceInput reselected (.click "recordButton"))).result == .blocked "Chart is loading"
#guard (runStep (workspaceInput reselected (.ack "clinicalAlert"))).result == .blocked "Chart is loading"
#guard (runStep (workspaceInput reselected (.click "recordButton"))).state == reopened
#guard (runStep (workspaceInput reopened (.click "recordButton"))).result == .ok
/-- New specification for owner review: sign, leave and reopen the witness. -/
def signed : State := call directoryFacts reopened (.click "recordButton")
def signedLeft : State := call directoryFacts signed (.click "workspace.return")
def signedReopened : State :=
  call directoryFacts (call directoryFacts signedLeft selectPatient) (.scroll "clinical")

/-- New specification for owner review: signed work is absent after reopen;
acknowledgments survive and the missing required entry prevents a second sign. -/
theorem signed_not_restored :
    signed.commits = ["recordReview"] ∧ assessment ∉ signedReopened.captured ∧
    signedReopened.acked = signed.acked ∧
    (runStep (workspaceInput signedReopened (.click "recordButton"))).state.commits = [] := by decide
#print axioms signed_not_restored
#guard signedReopened.captured.isEmpty
#guard (Workspace.draft signedLeft "source-A").captured.isEmpty
#guard signedReopened.acked == acknowledged.acked
-- Shared elements and nonzero order slots are covered; unrelated work stays.
#guard Workspace.unsigned spec { signed with captured :=
    [assessment, { assessment with slot := 2 }, { assessment with element := "unrelated" }] }
  == [{ assessment with element := "unrelated" }]
#guard Workspace.unsigned spec { signed with commits := ["otherCommit"] } == signed.captured

-- JSON: a state without stored drafts serializes as before the field existed.
#guard encodeJson landing ==
  "{\"acked\":[],\"captured\":[],\"clock\":0,\"commits\":[],\"currentSlot\":0,\"expanded\":[]," ++
  "\"history\":[],\"patientContext\":{\"activity\":\"scheduleTasks\",\"query\":\"\"}," ++
  "\"receipts\":[],\"screen\":\"clinical\",\"tabSel\":[]}"
#guard [landing, selected, assessed, acknowledged, reopened].all fun s =>
  s.patientDrafts? == none && ((encodeJson s).splitOn "patientDrafts").length == 1 &&
  (decodeJson State (encodeJson s)).toOption == some s
#guard (decodeJson State
  ("{\"acked\":[],\"captured\":[],\"clock\":0,\"commits\":[],\"currentSlot\":0,\"expanded\":[]," ++
   "\"history\":[],\"receipts\":[],\"screen\":\"home\",\"tabSel\":[]}")).toOption.map
  (·.patientDrafts?) == some none
-- JSON: a state with stored drafts round-trips.
#guard ((encodeJson returned).splitOn "\"patientDrafts\":[{\"acked\":[[\"clinicalAlert\",").length == 2
#guard roundTrips returned && roundTrips reselected && roundTrips chartB && roundTrips chartA
#guard (decodeJson State (encodeJson returned)).toOption == some returned

end Ehr.Runtime.Witness
