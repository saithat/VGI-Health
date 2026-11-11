import Ehr.Proofs.RuntimeEpisodeProps

/-! Checker-accepted programs with patient selection satisfy the accepted
properties in every bound patient episode. The hydrated chart is not the core
start state, so the proofs use what hydration establishes about it: program
screen names, allowed writes, no prefilled human-required value, and no popup.
Every definition and theorem here is a new specification for owner review,
outside Comparator. -/

namespace Ehr.Runtime
open Ehr Props

/-- A predicate that reads neither the clock nor the patient context holds at
the hydrated chart if it holds at every `chart`. -/
theorem start_lift (E : BoundEpisode) (hyd : E.Hydrates) {P : State → Prop}
    (hframe : ∀ t k c, P t → P { t with clock := k, patientContext? := some c })
    (h : ∀ first, P (chart E.toEpisode first)) : P E.start := by
  obtain ⟨first, c, he⟩ := start_eq E hyd
  rw [he]
  exact hframe _ _ _ (h first)

section Chart
variable (ep : Episode) (first : ScreenId)

/-- The chart is on a program screen with a program back stack. -/
theorem chart_names (hstart : (ep.prog.screen? ep.prog.start).isSome = true) :
    Check.ScreenNames ep.prog (chart ep first) :=
  Check.goTo_names _ _ _ _ _ (Check.reachable_screenNames ep hstart _ .start)

/-- The chart holds only allowed writes: prefills and the facts' receipts. -/
theorem chart_writes (hd : DeclaredWritesInSpec ep.spec ep.prog) (hu : ep.user.role = ep.prog.role) :
    Check.WritesState ep.spec ep.facts ep.user (chart ep first) :=
  Check.goTo_writesState _ _ _ _ _ _ (Check.writesAllowed ep hd hu _ .start) hd hu

/-- Hydration prefills no value a human must enter. -/
theorem chart_noHuman : ∀ x ∈ (chart ep first).captured, ∀ el,
    ep.spec.element? x.element = some el → ¬ HumanMustEnter el :=
  fun x hx el hel hh => (Check.humanStepsByHuman ep).1 x
    (Check.goTo_noNewHuman _ _ _ _ _ x hx el hel hh) el hel hh

/-- Every human-required value in the chart is a confirmed human entry (there is none). -/
theorem chart_humanCaptured : Check.HumanCaptured ep.spec (chart ep first) :=
  (Check.goTo_noNewHuman _ _ _ _ _).humanCaptured (Check.reachable_humanCaptured ep _ .start)

/-- The chart has no open popup. -/
theorem chart_popup : (chart ep first).popup? = none :=
  (Proofs.goTo_popup ..).trans (Proofs.init_popup ..)

end Chart

/-- New specification for owner review: the reachable-state and per-step
clauses of accepted properties 1, 2, 3, 4, 5, 7, 9, 10 and 11 for one bound
patient episode. Properties 8 and 13 are static, and property 12 is
`accepted_severityTiers`. -/
structure EpisodeAccepted (E : BoundEpisode) : Prop where
  landmarksShown : EpisodeLandmarksShown E
  commitCapturesAll : EpisodeCommitCapturesAll E
  enteredOnce : EpisodeEnteredOnce E
  writesAllowed : EpisodeWritesAllowed E
  commitReviewsMet : EpisodeCommitReviewsMet E
  commitScreenShowsReviews : EpisodeCommitScreenShowsReviews E
  humanStepsByHuman : EpisodeHumanStepsByHuman E
  onlyHumanCommitsAndAcks : EpisodeOnlyHumanCommitsAndAcks E
  cosignIsSecondUser : EpisodeCosignIsSecondUser E
  commitUnitsRight : EpisodeCommitUnitsRight E
  interruptiveHandled : EpisodeInterruptiveHandled E
  passiveShownInline : EpisodePassiveShownInline E
  alertsOnlyWhenTrue : EpisodeAlertsOnlyWhenTrue E
  interruptsOnce : EpisodeInterruptsOnce E

/-- New specification for owner review: **accepted programs per bound patient
episode.** If the checker accepts a program, then for any facts, any user of
the program's role and any opened state, the bound patient episode that
hydration of that state starts satisfies the per-episode form of each
reachable-state and per-step clause of the accepted properties. If hydration
does not succeed the episode has no state and the statement is empty.

Scope: one episode with fixed facts. Nothing is claimed across workspace
navigation, for the landing or list views, or for facts the host replaces
inside an episode. -/
theorem accepted_episode (sp prev can p) (h : Check.check sp prev can p = .ok)
    (facts : Facts) (user : User) (hrole : user.role = p.role) (opened : State) :
    EpisodeAccepted { spec := sp, prog := p, facts, user, opened } := by
  obtain ⟨_, _, _, href, _, _⟩ := Check.accepted_wellFormed sp prev can p h
  obtain ⟨hd, _⟩ := Check.accepted_writesOnly sp prev can p h
  obtain ⟨hreviews, hlandmarks, hpassive⟩ := Check.accepted_pinRules sp prev can p h
  have hstart := href.1
  let E : BoundEpisode := { spec := sp, prog := p, facts, user, opened }
  have names (hyd : E.Hydrates) : Check.ScreenNames p E.start :=
    start_lift E hyd (fun _ _ _ ht => ht) (fun first => chart_names E.toEpisode first hstart)
  have popup (hyd : E.Hydrates) : E.start.popup? = none :=
    start_lift E hyd (P := fun t => t.popup? = none) (fun _ _ _ ht => ht)
      (fun first => chart_popup E.toEpisode first)
  exact {
    landmarksShown := episode_landmarksShown E fun hyd =>
      landmarksShown_from _ _ (names hyd) hlandmarks
    commitCapturesAll := episode_commitCapturesAll E fun _ => commitCapturesAll_from _ _
    enteredOnce := episode_enteredOnce E fun _ => enteredOnce_from _ _
    writesAllowed := episode_writesAllowed E fun hyd =>
      writesAllowed_from _ _ (start_lift E hyd (fun _ _ _ ht => ht)
        (fun first => chart_writes E.toEpisode first hd hrole)) hd hrole
    commitReviewsMet := episode_commitReviewsMet E fun _ => commitReviewsMet_from _ _
    commitScreenShowsReviews := episode_commitScreenShowsReviews E fun hyd =>
      commitScreenShowsReviews_from _ _ (names hyd) hreviews
    humanStepsByHuman := episode_humanStepsByHuman E fun hyd =>
      humanStepsByHuman_from _ _
        (start_lift E hyd
          (P := fun t => ∀ x ∈ t.captured, ∀ el, sp.element? x.element = some el → ¬ HumanMustEnter el)
          (fun _ _ _ ht => ht) (fun first => chart_noHuman E.toEpisode first))
        (start_lift E hyd (fun _ _ _ ht => ht) (fun first => chart_humanCaptured E.toEpisode first))
    onlyHumanCommitsAndAcks := episode_onlyHumanCommitsAndAcks E fun _ =>
      onlyHumanCommitsAndAcks_from _ _
    cosignIsSecondUser := episode_cosignIsSecondUser E fun _ => cosignIsSecondUser_from _ _
    commitUnitsRight := episode_commitUnitsRight E fun _ => commitUnitsRight_from _ _
    interruptiveHandled := episode_interruptiveHandled E fun _ => interruptiveHandled_from _ _
    passiveShownInline := episode_passiveShownInline E fun _ =>
      passiveShownInline_from _ _ hpassive
    alertsOnlyWhenTrue := episode_alertsOnlyWhenTrue E fun hyd =>
      alertsOnlyWhenTrue_from _ _ (popup hyd)
    interruptsOnce := episode_interruptsOnce E fun hyd => interruptsOnce_from _ _ (popup hyd) }

#print axioms start_lift
#print axioms chart_names
#print axioms chart_writes
#print axioms chart_noHuman
#print axioms chart_humanCaptured
#print axioms chart_popup
#print axioms accepted_episode
end Ehr.Runtime
