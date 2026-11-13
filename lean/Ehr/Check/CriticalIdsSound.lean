import Ehr.Check.RuleSound

/-! The runtime owns the critical. component namespace. These statements are
new specification surface for owner review (2026-11-11), outside Comparator. -/
namespace Ehr.Check
open Ehr Ehr.Props

/-- Accepted programs contain no component in the runtime's critical namespace,
on any screen, regardless of visibility or patient-selection mode. -/
theorem accepted_criticalIds (sp prev can p) (h : check sp prev can p = .ok) :
    ∀ sc ∈ allComps p, CriticalRuntime.reservedId sc.2.id = false := by
  have hall := (check_ok_iff sp prev can p).mp h
  have hr : (allComps p).all (fun sc => !CriticalRuntime.reservedId sc.2.id) = true :=
    hall { property := "criticalIds"
           passes := (allComps p).all (fun sc => !CriticalRuntime.reservedId sc.2.id)
           explain := fun _ => compFinding "criticalIds" p false fun scr c =>
             if CriticalRuntime.reservedId c.id then
               some s!"component {c.id} on screen {scr.id} uses the critical. action namespace reserved for critical results"
             else none } (by simp [rules])
  intro sc hc
  have hn := List.all_eq_true.mp hr sc hc
  cases hv : CriticalRuntime.reservedId sc.2.id <;> simp_all

private theorem reserved_append (head tail : String)
    (h : CriticalRuntime.reservedId head = true) :
    CriticalRuntime.reservedId (head ++ tail) = true := by
  apply List.isPrefixOf_iff_prefix.mpr
  exact List.IsPrefix.trans (List.isPrefixOf_iff_prefix.mp h)
    (by simp [String.toList_append])

/-- Every event matched by the actual handler targets a critical. component ID.
This includes refused events (popup, authorization or reducer refusal). -/
theorem critical_handle_reserved (f u s e out)
    (h : CriticalRuntime.handle f u s e = some out) :
    ∃ cid, (e = .click cid ∨ ∃ text, e = .enter cid (.text text)) ∧
      CriticalRuntime.reservedId cid = true := by
  cases e with
  | click comp =>
    cases ht : (CriticalRuntime.tickets f s).find? (fun t =>
        ["critical.receive:", "critical.resolve:", "critical.escalate:"].any
          (fun head => comp == head ++ t.result.id)) with
    | none =>
      simp only [CriticalRuntime.handle, ht, Bind.bind, Option.bind_none] at h
      contradiction
    | some t =>
      have hm := List.find?_some ht
      simp only [List.any_cons, List.any_nil, Bool.or_eq_true, Bool.false_eq_true,
        or_false, beq_iff_eq] at hm
      refine ⟨comp, Or.inl rfl, ?_⟩
      rcases hm with hm | hm | hm <;> rw [hm]
      all_goals exact reserved_append _ _ (by decide)
  | enter comp value =>
    cases value <;> try { simp [CriticalRuntime.handle] at h }
    case text text =>
      cases ht : (CriticalRuntime.tickets f s).find? (fun t => comp == "critical.action:" ++ t.result.id) with
      | none =>
        simp only [CriticalRuntime.handle, ht, Bind.bind, Option.bind_none] at h
        contradiction
      | some t =>
        have hm := List.find?_some ht
        refine ⟨comp, Or.inr ⟨text, rfl⟩, ?_⟩
        rw [beq_iff_eq.mp hm]
        exact reserved_append _ _ (by decide)
  | _ => simp [CriticalRuntime.handle] at h

/-- For an accepted program, any handler-matched event (even a refusal) names
no program component on any screen: the handler cannot shadow a control. -/
theorem accepted_critical_no_shadow (sp prev can p) (ha : check sp prev can p = .ok)
    (f u s e out) (hh : CriticalRuntime.handle f u s e = some out) :
    ∃ cid, (e = .click cid ∨ ∃ text, e = .enter cid (.text text)) ∧
      ∀ sc ∈ allComps p, sc.2.id ≠ cid := by
  obtain ⟨cid, he, hr⟩ := critical_handle_reserved f u s e out hh
  refine ⟨cid, he, ?_⟩
  intro sc hc hid
  have hn := accepted_criticalIds sp prev can p ha sc hc
  rw [hid, hr] at hn
  contradiction

/-- New specification for owner review: accepted programs contain no component
in the runtime's reconciliation namespace, regardless of screen or visibility. -/
theorem accepted_reconcileIds (sp prev can p) (h : check sp prev can p = .ok) :
    ∀ sc ∈ allComps p, reconcileReservedId sc.2.id = false := by
  have hall := (check_ok_iff sp prev can p).mp h
  have hr : (allComps p).all (fun sc => !reconcileReservedId sc.2.id) = true :=
    hall { property := "reconcileIds"
           passes := (allComps p).all (fun sc => !reconcileReservedId sc.2.id)
           explain := fun _ => compFinding "reconcileIds" p false fun scr c =>
             if reconcileReservedId c.id then
               some s!"component {c.id} on screen {scr.id} uses the reconcile.line| namespace reserved for order reconciliation"
             else none } (by simp [rules])
  intro sc hc
  have hn := List.all_eq_true.mp hr sc hc
  cases hv : reconcileReservedId sc.2.id <;> simp_all

/-- New specification for owner review: every reconciliation control is reserved. -/
theorem reconcile_comp_reserved (n : Nat) : reconcileReservedId (reconcileComp n) = true := by
  simp [reconcileReservedId, reconcileComp, String.toList_append]

/-- New specification for owner review: runtime reconciliation can never name
any program component of an accepted layout, on any screen. -/
theorem accepted_reconcile_no_shadow (sp prev can p) (ha : check sp prev can p = .ok)
    (n : Nat) : ∀ sc ∈ allComps p, sc.2.id ≠ reconcileComp n := by
  intro sc hc hid
  have hn := accepted_reconcileIds sp prev can p ha sc hc
  rw [hid, reconcile_comp_reserved] at hn
  contradiction

#print axioms accepted_reconcileIds
#print axioms reconcile_comp_reserved
#print axioms accepted_reconcile_no_shadow

#print axioms accepted_criticalIds
#print axioms reserved_append
#print axioms critical_handle_reserved
#print axioms accepted_critical_no_shadow
end Ehr.Check
