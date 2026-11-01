import Ehr.Check.Catalog
import Ehr.Check.ReplaySound

namespace Ehr.Check
open Ehr Ehr.Props

/-- No finding means every rule passed, including rules without explanations. -/
theorem firstFinding_none_iff (rs : List Rule) :
    firstFinding rs = none ↔ ∀ r ∈ rs, r.passes = true := by
  induction rs with
  | nil => simp [firstFinding]
  | cons r rs ih =>
    cases hp : r.passes <;> simp [firstFinding, hp, firstFinding] at ih ⊢

/-- A finding always comes from a failing rule. An explanation cannot turn a
passing rule into a rejection. -/
theorem firstFinding_some (rs : List Rule) (f : Finding)
    (h : firstFinding rs = some f) : ∃ r ∈ rs, r.passes = false := by
  induction rs with
  | nil => simp [firstFinding] at h
  | cons r rs ih =>
    cases hp : r.passes
    · exact ⟨r, by simp, hp⟩
    · have ht : firstFinding rs = some f := by simpa [firstFinding, hp] using h
      obtain ⟨r', hr', hf⟩ := ih ht
      exact ⟨r', by simp [hr'], hf⟩

/-- Acceptance is exactly the conjunction of the executable rules. -/
theorem check_ok_iff (sp : Spec) (prev : Option Program) (can p : Program) :
    check sp prev can p = .ok ↔ ∀ r ∈ rules sp prev can p, r.passes = true := by
  unfold check
  cases hf : firstFinding (rules sp prev can p) with
  | none => simpa using (firstFinding_none_iff _).mp hf
  | some f =>
    constructor
    · intro h; contradiction
    · intro h
      have hn := (firstFinding_none_iff _).mpr h
      rw [hf] at hn
      contradiction

/-- **T7 (rejection).** A rejected candidate has a failing checker rule and
the displayed navigation is replayable. The failing rule certifies a static
violation; a blocked final click displays the interpreter's defense. -/
theorem T7_rejection (sp : Spec) (prev : Option Program) (can p : Program)
    (property message : String) (es : List Event) (screens : List ScreenId)
    (h : check sp prev can p = .violation property message es screens) :
    (∃ r ∈ rules sp prev can p, r.passes = false) ∧ ValidCounterexample sp p es := by
  unfold check at h
  split at h
  · contradiction
  · rename_i f hf
    have he := T7_counterexample_replays sp p f
    simp only [Verdict.violation.injEq] at h
    exact ⟨firstFinding_some _ f hf, h.2.2.1 ▸ he⟩

/-- The decidable structural portion of T1. The semantic obligations are
proved separately; this statement makes no claim to the full T1 yet. -/
theorem accepted_structural (sp : Spec) (prev : Option Program) (can p : Program)
    (h : check sp prev can p = .ok) :
    CatalogOnly sp p ∧ SpecIdsUnique sp ∧ IdsUnique p ∧ ReferencesResolve sp p ∧
    DeclaredWritesInSpec sp p ∧ NoPassivePopupRequests sp p ∧
    PopupRequestedOnce sp p ∧ NoInterruptivePopupRequests sp p ∧ NoAlertSuppression p ∧
    NoAutomationAttempts sp p ∧ QuantityPrefillsKeepUnits sp p ∧
    LinkedNotRetyped sp p ∧ StabilityBudget sp prev p := by
  have hall := (check_ok_iff sp prev can p).mp h
  simp only [rules, List.mem_cons, forall_eq_or_imp, List.not_mem_nil] at hall
  rcases hall with ⟨hcat, hids, hpi, href, hw, hpassive, hrepeat, hint, hhuman, hal,
    hu, _, hlink, _, _, _, _, _, _, hstable⟩
  exact ⟨(inCatalog_iff sp p).mp hcat, of_decide_eq_true hids,
    of_decide_eq_true hpi, of_decide_eq_true href, of_decide_eq_true hw,
    of_decide_eq_true hpassive, (filteredPopupRequests_iff sp p).mp (of_decide_eq_true hrepeat), of_decide_eq_true hint, of_decide_eq_true hal,
    of_decide_eq_true hhuman, of_decide_eq_true hu, of_decide_eq_true hlink,
    of_decide_eq_true hstable.1⟩

#print axioms firstFinding_none_iff
#print axioms T7_rejection
#print axioms accepted_structural
end Ehr.Check
