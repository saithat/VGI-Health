import Ehr.Proofs.Runtime
import Ehr.Check.Sound

/-! Accepted-program coverage for runtime execution. Every theorem below is
a new specification for owner review, outside Comparator. Static conjuncts
retain their original definitions; commit conjuncts use the effective input.
These are not an assertion of all twelve original properties for runStep. -/

namespace Ehr.Runtime
open Ehr Props Proofs

/-- New specification for owner review: all static conjuncts of the twelve
accepted properties are independent of the execution entry point. In
particular budgets and navigation are entirely static. No runtime reachability
premise or clinical state refinement is required for these conjuncts. -/
theorem accepted_static (sp prev can p) (h : Check.check sp prev can p = .ok) :
    CatalogOnly sp p ∧ SpecIdsUnique sp ∧ IdsUnique p ∧ ReferencesResolve sp p ∧
    RequiredWithinDepth sp can p ∧ LinkedNotRetyped sp p ∧ DeclaredWritesInSpec sp p ∧
    NoAutomationAttempts sp p ∧ QuantityPrefillsKeepUnits sp p ∧
    WithinBudgets sp prev can p ∧ NoAlertSuppression p ∧ NoInterruptivePopupRequests sp p ∧
    PopupRequestedOnce sp p ∧ NoPassivePopupRequests sp p ∧ NavigationSane p := by
  obtain ⟨hc, hs, hi, hr, hd, _⟩ := Check.accepted_wellFormed sp prev can p h
  exact ⟨hc, hs, hi, hr, hd,
    (Check.accepted_capturesAllOnce sp prev can p h).1,
    (Check.accepted_writesOnly sp prev can p h).1,
    (Check.accepted_humanOnlyKept sp prev can p h).1,
    (Check.accepted_units sp prev can p h).1,
    Check.accepted_budgets sp prev can p h,
    (Check.accepted_alertsFire sp prev can p h).1,
    (Check.accepted_noFalseAlarms sp prev can p h).1,
    (Check.accepted_noRepeatInterruptions sp prev can p h).1,
    (Check.accepted_severityTiers sp prev can p h).1,
    Check.accepted_navigation sp prev can p h⟩

/-- New specification for owner review: the commit-captures-all conjunct at
the effective input, for every runtime call (including all reachable states).
Per-order-line and allowed-value requirements retain their full definitions. -/
theorem commit_entries (i : StepInput) (c : CommitId)
    (hnew : c ∉ i.state.commits) (hafter : c ∈ (runStep i).state.commits)
    (rq : EntryReq) (hrq : rq ∈ i.spec.entries) (hc : rq.commit = c) :
    EntryMetIn ⟨i.spec, i.program, i.facts, i.user⟩ (inputState i) rq := by
  apply (Check.entryMet_iff _ _ _).mp
  exact ((commitGuard_iff ..).mp (T0_commit_needs_guard i c hnew hafter)).2.1 rq hrq hc

/-- New specification for owner review: the commit-reviews-met conjunct at
the effective input, with shown info, receipts and waivers exactly as before. -/
theorem commit_reviews (i : StepInput) (c : CommitId)
    (hnew : c ∉ i.state.commits) (hafter : c ∈ (runStep i).state.commits)
    (rq : ReviewReq) (hrq : rq ∈ i.spec.reviews) (hc : rq.commit = c) :
    ReviewMetIn ⟨i.spec, i.program, i.facts, i.user⟩ (inputState i) rq := by
  apply (Check.reviewMet_iff _ _ _).mp
  exact ((commitGuard_iff ..).mp (T0_commit_needs_guard i c hnew hafter)).2.2.1 rq hrq hc

/-- New specification for owner review: whole-episode quantity requirements
at runtime commits have confirmed captures in their declared units, at the
effective input. This does not redefine the original CommitUnitsRight. -/
theorem commit_units (i : StepInput) (c : CommitId)
    (hnew : c ∉ i.state.commits) (hafter : c ∈ (runStep i).state.commits)
    (rq : EntryReq) (hrq : rq ∈ i.spec.entries) (hc : rq.commit = c)
    (el : ElementSpec) (u : UnitKind) (hel : i.spec.element? rq.element = some el)
    (hk : el.kind = .quantity u) (hwhen : whenHolds i.facts (inputState i) rq.when = true)
    (hper : rq.perOrderLine = false) :
    ∃ x ∈ (inputState i).captured, x.element = el.id ∧ x.confirmed = true ∧
      ∃ t, x.value = .qty t u := by
  obtain ⟨x, hx, he, hv⟩ := T0_entry_values i c hnew hafter rq hrq hc hper hwhen el hel
  exact ⟨x, hx, he, hv.1, hv.2.2.1 u hk⟩

/-- New specification for owner review: at runtime commits all firing
interruptive keys are acknowledged in the effective input. -/
theorem commit_interruptive_handled (i : StepInput) (c : CommitId)
    (hnew : c ∉ i.state.commits) (hafter : c ∈ (runStep i).state.commits)
    (al : AlertSpec) (hal : al ∈ i.spec.alerts) (hc : al.commit = c)
    (ht : al.tier = .interruptive) (k : String) (hk : k ∈ alertKeys i.facts (inputState i) al.cond) :
    (al.id, k) ∈ (inputState i).acked :=
  ((commitGuard_iff ..).mp (T0_commit_needs_guard i c hnew hafter)).2.2.2.1 al hal hc ht k hk

/-- New specification for owner review: the entire severity-tiers property
transfers, with runtime reachability replacing Props.Reachable. This includes
arbitrary host facts and all selection-enabled workspace states. -/
theorem accepted_severityTiers (sp prev can p) (h : Check.check sp prev can p = .ok) :
    NoPassivePopupRequests sp p ∧
    ∀ u s, Reachable sp p u s → ∀ a k al, s.popup? = some (a, k) →
      sp.alert? a = some al → al.tier ≠ .passive := by
  refine ⟨(Check.accepted_severityTiers sp prev can p h).1, ?_⟩
  intro u s hs a k al hp hal
  obtain ⟨other, hother, ht⟩ := A4_run sp p u s hs a k hp
  rw [hal] at hother
  cases hother
  exact ht

/-- New specification for owner review: an ordinary fixed-facts runtime
whose reachable calls all decline the critical handler refines the core
exactly. This is a conditional boundary, not an assumption that all handlers
are inert. The critical capture witness shows why the premise is necessary. -/
theorem fixed_refines_core (ep : Episode)
    (hordinary : Workspace.enabled ep.prog = false)
    (hhandler : ∀ s, FixedReachable ep s → ∀ e,
      CriticalRuntime.handle ep.facts ep.user s e = none)
    (s : State) (hs : FixedReachable ep s) : Props.Reachable ep s := by
  induction hs with
  | start =>
    simpa only [runInit, hordinary, Bool.false_eq_true, ↓reduceIte, Episode.start] using
      (Props.Reachable.start (ep := ep))
  | @event s e hs ih =>
    have he : (runStep ⟨ep.spec, ep.prog, ep.facts, ep.user, s, e⟩).state =
        ep.next .human s e := by
      simp only [runStep, hordinary, Bool.false_and, Bool.false_eq_true, ↓reduceIte,
        hhandler s hs e, Option.getD_none, Episode.next]
    rw [he]
    exact .step .human e ih
  | wait d _ ih => exact .wait d ih

/-- New specification for owner review: state invariants transfer wholesale
on the conditional handler-free ordinary fragment, using exact refinement. -/
theorem fixed_invariant (ep : Episode)
    (hordinary : Workspace.enabled ep.prog = false)
    (hhandler : ∀ s, FixedReachable ep s → ∀ e,
      CriticalRuntime.handle ep.facts ep.user s e = none)
    (P : State → Prop) (hp : Props.Always ep P) :
    ∀ s, FixedReachable ep s → P s :=
  fun s hs => hp s (fixed_refines_core ep hordinary hhandler s hs)

#print axioms accepted_static
#print axioms commit_entries
#print axioms commit_reviews
#print axioms commit_units
#print axioms commit_interruptive_handled
#print axioms accepted_severityTiers
#print axioms fixed_refines_core
#print axioms fixed_invariant
end Ehr.Runtime
