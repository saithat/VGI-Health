import Ehr.Check.Completion

/-! Finite alert discharge for arbitrary alert lists with unique IDs. The
lookup premise of human_finish_ready follows from the checker's ID condition. -/
namespace Ehr.Check
open Ehr Ehr.Props

/-- A unique alert ID finds the actual rule that declares it. -/
theorem alert_lookup_unique (sp : Spec) (unique : (sp.alerts.map (·.id)).Nodup)
    (al : AlertSpec) (member : al ∈ sp.alerts) : sp.alert? al.id = some al := by
  unfold Spec.alert?
  have go (xs : List AlertSpec) (hn : (xs.map (·.id)).Nodup) (ha : al ∈ xs) :
      xs.find? (fun rule => rule.id == al.id) = some al := by
    induction xs with
    | nil => cases ha
    | cons x xs ih =>
      simp only [List.map_cons, List.nodup_cons] at hn
      rcases List.mem_cons.mp ha with rfl | ha
      · simp
      · have ne : x.id ≠ al.id := by
          intro he
          exact hn.1 (List.mem_map.mpr ⟨al, ha, he.symm⟩)
        simp [ne, ih hn.2 ha]
  exact go sp.alerts unique member

/-- With unique rule IDs, an empty candidate list means every firing
interruptive key for the commit has been acknowledged. -/
theorem alertsAcked_of_no_candidates (sp : Spec) (p : Program) (facts : Facts) (s : State)
    (c : CommitId) (unique : (sp.alerts.map (·.id)).Nodup)
    (empty : popupCandidates sp p facts s c = []) : alertsAcked sp facts s c = true := by
  apply List.all_eq_true.mpr
  intro al member
  by_cases hc : al.commit = c
  · by_cases ht : al.tier = .interruptive
    · simp only [hc, ht, bne_self_eq_false, Bool.false_or]
      apply List.all_eq_true.mpr
      intro key firing
      by_cases ack : (al.id, key) ∈ s.acked
      · simpa using ack
      · have can : canPopup sp p s al.id = true := by
          simp [canPopup, alert_lookup_unique sp unique al member, ht]
        have pending : (al.id, key) ∈ popupCandidates sp p facts s c := by
          apply List.mem_flatMap.mpr
          refine ⟨al, member, ?_⟩
          simp only [hc, BEq.rfl, can, Bool.and_self, ↓reduceIte]
          exact List.mem_map.mpr ⟨key, List.mem_filter.mpr ⟨firing, by simpa using ack⟩, rfl⟩
        simp [empty] at pending
    · simp [ht]
  · simp [hc]

/-- Once the non-alert guard is ready, any finite unique-ID alert family
can be discharged through real click/ack events. Unique IDs replace the
previous universal lookup-consistency premise. -/
theorem human_finish_ready_unique (sp : Spec) (p : Program) (facts : Facts) (u : User)
    (s : State) (c : CommitId) (button : Component)
    (kind : button.kind = .button (.commit c)) (modal : s.popup? = none)
    (ready : ∀ ack, guardBase sp p facts u { s with acked := ack, popup? := none } c = true)
    (shown : ∀ ack, shownComp? sp p facts { s with acked := ack, popup? := none } button.id = some button)
    (unique : (sp.alerts.map (·.id)).Nodup) :
    ∃ es : List Event, c ∈ (runAll sp p facts u .human s es).commits :=
  human_finish_ready sp p facts u s c button kind modal ready shown
    (fun state empty => alertsAcked_of_no_candidates sp p facts state c unique empty)

#print axioms alertsAcked_of_no_candidates
#print axioms human_finish_ready_unique
end Ehr.Check
