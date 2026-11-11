import Ehr.Proofs.RuntimeEpisodeAccepted
import Ehr.Proofs.RuntimeWitnesses

/-! Regression for bound patient episodes on the workspace witness program of
`Ehr.Proofs.RuntimeWitnesses`. The chart state that the global counterexamples
start from is in an episode; the landing view and the state after Return are
in none; the per-episode theorems apply to it. Every declaration here is a new
specification for owner review, outside Comparator. `decide` is confined to
these concrete finite computations. -/

namespace Ehr.Runtime.Witness
open Ehr Props Check

/-- New specification for owner review: the witness patient is opened but the
chart is not yet hydrated. -/
def selected : State := (runStep (workspaceInput landing selectPatient)).state

/-- New specification for owner review: the bound patient episode of the
workspace witness, starting when `selected` is hydrated. -/
def chartEpisode : BoundEpisode :=
  { spec, prog := workspace, facts := directoryFacts, user := Examples.Tiny.user, opened := selected }

/-- New specification for owner review: hydration of the witness chart succeeds. -/
theorem chart_hydrates : chartEpisode.Hydrates := ⟨by decide, by decide, by decide⟩

/-- New specification for owner review: the confirmed and acknowledged chart
state of the global counterexamples is in the episode. -/
theorem acknowledged_inEpisode : InEpisode chartEpisode acknowledged :=
  .event (.ack "clinicalAlert")
    (.event (.click "alert")
      (.first (.enter "assessmentField" (.flag true)) chart_hydrates (by decide)) (by decide))
    (by decide)

/-- New specification for owner review: the unselected landing view is in no
episode, for any spec, program, facts, user and opened state. -/
theorem landing_not_inEpisode (E : BoundEpisode) : ¬ InEpisode E landing :=
  unselected_not_inEpisode (by decide) E

/-- New specification for owner review: the state after Return to the list is
in no episode. -/
theorem returned_not_inEpisode (E : BoundEpisode) : ¬ InEpisode E returned :=
  unselected_not_inEpisode (by decide) E

/-- New specification for owner review: the opened but not yet hydrated state
is not in its own episode. -/
theorem selected_not_inEpisode : ¬ InEpisode chartEpisode selected :=
  unbound_not_inEpisode chartEpisode (by decide)

/-- New specification for owner review: the Return click that the global
counterexamples use is workspace navigation, so it is not a call of the episode. -/
theorem return_leaves : ¬ chartEpisode.Stays acknowledged (.click "workspace.return") := by decide

/-- New specification for owner review: the per-episode properties hold for
the witness, by the general theorem for accepted programs. -/
theorem episode_accepted : EpisodeAccepted chartEpisode :=
  accepted_episode spec none workspace workspace workspace_accepted directoryFacts
    Examples.Tiny.user (by decide) selected

/-- New specification for owner review: property 1 per episode on the
witness. The patient banner is shown in the acknowledged chart, and the API
view there is the interpreter's view. Compare `landing_has_no_landmark`. -/
theorem acknowledged_landmark :
    InfoShown chartEpisode.toEpisode acknowledged "patientBanner" ∧
    runView ⟨spec, workspace, directoryFacts, Examples.Tiny.user, acknowledged⟩ =
      chartEpisode.toEpisode.screen acknowledged :=
  ⟨episode_accepted.landmarksShown _ acknowledged_inEpisode _ (by decide),
   episode_runView chartEpisode acknowledged_inEpisode⟩

/-- New specification for owner review: property 2 per episode on the
witness. Every later call that is not workspace navigation, not an entry and
not a macro click keeps each confirmed capture. Compare `return_empties_captured`. -/
theorem acknowledged_keeps_captures (e : Event) (hstay : chartEpisode.Stays acknowledged e)
    (hentry : ∀ cid v, e ≠ .enter cid v)
    (hmacro : ∀ cid, e = .click cid →
      clickedMacro? spec workspace directoryFacts acknowledged cid = none ∨
        acknowledged.popup?.isSome) :
    ∀ x ∈ acknowledged.captured, x.confirmed = true →
      x ∈ (chartEpisode.next acknowledged e).captured :=
  episode_accepted.enteredOnce.2 _ acknowledged_inEpisode e hstay hentry hmacro

/-- New specification for owner review: properties 5 and 11 per episode on
the witness. Every later call that is not workspace navigation keeps each
acknowledgment, and changes the list only by an `ack` event. Compare
`return_empties_acked`. -/
theorem acknowledged_keeps_acks (e : Event) (hstay : chartEpisode.Stays acknowledged e) :
    (∀ p ∈ acknowledged.acked, p ∈ (chartEpisode.next acknowledged e).acked) ∧
    ((chartEpisode.next acknowledged e).acked ≠ acknowledged.acked → ∃ a, e = .ack a) :=
  ⟨(episode_accepted.interruptsOnce.1.2 _ acknowledged_inEpisode e hstay).1,
   (episode_accepted.onlyHumanCommitsAndAcks.2 _ acknowledged_inEpisode e hstay).2⟩

#print axioms chart_hydrates
#print axioms acknowledged_inEpisode
#print axioms landing_not_inEpisode
#print axioms returned_not_inEpisode
#print axioms selected_not_inEpisode
#print axioms return_leaves
#print axioms episode_accepted
#print axioms acknowledged_landmark
#print axioms acknowledged_keeps_captures
#print axioms acknowledged_keeps_acks
end Ehr.Runtime.Witness
