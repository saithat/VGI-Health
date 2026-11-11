import Ehr.Proofs.RuntimeEpisodeProps

/-! Checker-accepted programs with patient selection satisfy the accepted
properties in every bound patient episode. The hydrated chart is not the core
start state, so the proofs use what hydration establishes about it: program
screen names, allowed writes, no prefilled human-required value, no popup, and
that the restored draft adds only confirmed human entries for spec elements
the signed-in role may enter.
Every definition and theorem here is a new specification for owner review,
outside Comparator. -/

namespace Ehr.Runtime
open Ehr Props

/-- A predicate that reads neither the clock, the patient context nor the
draft store holds at the hydrated chart if it holds at every `chart` with the
selected patient's stored draft restored. -/
theorem start_lift (E : BoundEpisode) (hyd : E.Hydrates) {P : State → Prop}
    (hframe : ∀ t k c d, P t →
      P { t with clock := k, patientContext? := some c, patientDrafts? := d })
    (h : ∀ first, P (Workspace.restore E.spec E.user (chart E.toEpisode first) (pending E.opened))) :
    P E.start := by
  obtain ⟨first, c, he⟩ := start_eq E hyd
  rw [he]
  exact hframe _ _ _ _ (h first)

section Restore
variable {sp : Spec} {u : User} {t : State} {d : PatientDraft}

/-- A restorable capture is a confirmed human entry for a spec element that
the signed-in role may enter. -/
theorem restorable_spec {x : Captured} (h : Workspace.restorable sp u x = true) :
    x.byHuman = true ∧ x.confirmed = true ∧
      ∃ el, sp.element? x.element = some el ∧ u.role ∈ el.enteredBy := by
  simp only [Workspace.restorable, Bool.and_eq_true, Option.any_eq_true,
    List.contains_iff_mem] at h
  exact ⟨h.1.1, h.1.2, h.2⟩

/-- New specification for owner review: a capture of the chart after
restoring a draft is a capture of the fresh chart or a restorable stored one. -/
theorem restore_mem {x : Captured} (hx : x ∈ (Workspace.restore sp u t d).captured) :
    x ∈ t.captured ∨ (x ∈ d.captured ∧ Workspace.restorable sp u x = true) := by
  simp only [Workspace.restore, Workspace.restored, List.mem_append, List.mem_filter] at hx
  rcases hx with ⟨hx, _⟩ | hx
  · exact Or.inl hx
  · exact Or.inr hx

/-- New specification for owner review: every restorable stored capture is in
the chart after restoring. -/
theorem restore_keeps {x : Captured} (hx : x ∈ d.captured)
    (hr : Workspace.restorable sp u x = true) : x ∈ (Workspace.restore sp u t d).captured := by
  simp only [Workspace.restore, Workspace.restored, List.mem_append, List.mem_filter]
  exact Or.inr ⟨hx, hr⟩

/-- New specification for owner review: the acknowledgments of the chart
after restoring are exactly the stored ones. -/
theorem restore_acked : (Workspace.restore sp u t d).acked = d.acked := rfl

/-- Restoring a draft keeps the allowed-writes invariant. -/
theorem restore_writes {f : Facts} (h : Check.WritesState sp f u t) :
    Check.WritesState sp f u (Workspace.restore sp u t d) :=
  ⟨fun x hx => (restore_mem hx).elim (h.1 x) (fun hr => (restorable_spec hr.2).2.2), h.2.1, h.2.2⟩

/-- Restoring a draft keeps human-only values confirmed human entries. -/
theorem restore_humanCaptured (h : Check.HumanCaptured sp t) :
    Check.HumanCaptured sp (Workspace.restore sp u t d) :=
  fun x hx el hel hh => (restore_mem hx).elim (fun hx => h x hx el hel hh)
    (fun hr => ⟨(restorable_spec hr.2).1, (restorable_spec hr.2).2.1⟩)

/-- If the fresh chart holds no human-required value, every such value after
restoring is a confirmed human entry of the stored draft. -/
theorem restore_human
    (hnone : ∀ x ∈ t.captured, ∀ el, sp.element? x.element = some el → ¬ HumanMustEnter el) :
    ∀ x ∈ (Workspace.restore sp u t d).captured, ∀ el,
      sp.element? x.element = some el → HumanMustEnter el →
        x ∈ d.captured ∧ x.byHuman = true ∧ x.confirmed = true :=
  fun x hx el hel hh => (restore_mem hx).elim (fun hx => absurd hh (hnone x hx el hel))
    (fun hr => ⟨hr.1, (restorable_spec hr.2).1, (restorable_spec hr.2).2.1⟩)

end Restore

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

Scope: one episode with fixed facts, for any stored draft: no premise on the
restored state is needed, because hydration restores only confirmed human
entries for spec elements the role may enter. Nothing is claimed here across
workspace navigation, for the landing or list views, or for facts the host
replaces inside an episode. -/
theorem accepted_episode (sp prev can p) (h : Check.check sp prev can p = .ok)
    (facts : Facts) (user : User) (hrole : user.role = p.role) (opened : State) :
    EpisodeAccepted { spec := sp, prog := p, facts, user, opened } := by
  obtain ⟨_, _, _, href, _, _⟩ := Check.accepted_wellFormed sp prev can p h
  obtain ⟨hd, _⟩ := Check.accepted_writesOnly sp prev can p h
  obtain ⟨hreviews, hlandmarks, hpassive⟩ := Check.accepted_pinRules sp prev can p h
  have hstart := href.1
  let E : BoundEpisode := { spec := sp, prog := p, facts, user, opened }
  have names (hyd : E.Hydrates) : Check.ScreenNames p E.start :=
    start_lift E hyd (fun _ _ _ _ ht => ht) (fun first => chart_names E.toEpisode first hstart)
  have popup (hyd : E.Hydrates) : E.start.popup? = none :=
    start_lift E hyd (P := fun t => t.popup? = none) (fun _ _ _ _ ht => ht)
      (fun first => chart_popup E.toEpisode first)
  exact {
    landmarksShown := episode_landmarksShown E fun hyd =>
      landmarksShown_from _ _ (names hyd) hlandmarks
    commitCapturesAll := episode_commitCapturesAll E fun _ => commitCapturesAll_from _ _
    enteredOnce := episode_enteredOnce E fun _ => enteredOnce_from _ _
    writesAllowed := episode_writesAllowed E fun hyd =>
      writesAllowed_from _ _ (start_lift E hyd (fun _ _ _ _ ht => ht)
        (fun first => restore_writes (chart_writes E.toEpisode first hd hrole))) hd hrole
    commitReviewsMet := episode_commitReviewsMet E fun _ => commitReviewsMet_from _ _
    commitScreenShowsReviews := episode_commitScreenShowsReviews E fun hyd =>
      commitScreenShowsReviews_from _ _ (names hyd) hreviews
    humanStepsByHuman := episode_humanStepsByHuman E
      (fun hyd => start_lift E hyd
        (P := fun t => ∀ x ∈ t.captured, ∀ el, sp.element? x.element = some el →
          HumanMustEnter el →
            x ∈ (pending opened).captured ∧ x.byHuman = true ∧ x.confirmed = true)
        (fun _ _ _ _ ht => ht) (fun first => restore_human (chart_noHuman E.toEpisode first)))
      (fun hyd => humanEntries_from _ _ (start_lift E hyd (fun _ _ _ _ ht => ht)
        (fun first => restore_humanCaptured (chart_humanCaptured E.toEpisode first))))
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
#print axioms restorable_spec
#print axioms restore_mem
#print axioms restore_keeps
#print axioms restore_acked
#print axioms restore_writes
#print axioms restore_humanCaptured
#print axioms restore_human
#print axioms chart_names
#print axioms chart_writes
#print axioms chart_noHuman
#print axioms chart_humanCaptured
#print axioms chart_popup
#print axioms accepted_episode
end Ehr.Runtime
