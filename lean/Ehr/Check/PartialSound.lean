import Ehr.Check.RuleSound
import Ehr.Check.PinSound
import Ehr.Check.RequestSound

/-!
Proved safety and layout portions of the checker result.
These theorems do not prove general completion (T1).
-/
namespace Ehr.Check
open Ehr Ehr.Props

private theorem accepted_pins (sp prev can p) (h : check sp prev can p = .ok) :
    reviewsPinned sp p = true ∧ landmarksPinned sp p = true ∧ passivePinned sp p = true := by
  have hall := (check_ok_iff sp prev can p).mp h
  simp only [rules, List.mem_cons, forall_eq_or_imp, List.not_mem_nil] at hall
  rcases hall with ⟨_, _, _, _, _, _, _, _, _, _, _, _, hr, _, hl, hp, _⟩
  simp only [Bool.and_eq_true] at hp
  exact ⟨hr, hl, hp.1⟩

/-- Accepted programs pass the three pin rules: reviews on commit screens,
landmarks on every screen, and passive alerts on their targeted screens. -/
theorem accepted_pinRules (sp prev can p) (h : check sp prev can p = .ok) :
    reviewsPinned sp p = true ∧ landmarksPinned sp p = true ∧ passivePinned sp p = true :=
  accepted_pins sp prev can p h

/-- Accepted programs have catalog/ID/reference correctness and all
landmarks on every reachable screen (property 1). -/
theorem accepted_wellFormed (sp prev can p) (h : check sp prev can p = .ok) :
    WellFormed sp can p := by
  have ht := accepted_structural sp prev can p h
  refine ⟨ht.1, ht.2.1, ht.2.2.1, ht.2.2.2.1, ?_⟩
  intro facts user _
  exact landmarksPinned_sound ⟨sp, p, facts, user⟩ ht.2.2.2.1.1
    (accepted_pins _ _ _ _ h).2.1

/-- Accepted programs show each applicable review on its commit screen or
cover it with a valid receipt/waiver (property 4). -/
theorem accepted_reviewsBeforeCommit (sp prev can p) (h : check sp prev can p = .ok) :
    ReviewsBeforeCommit sp p := by
  intro facts user _
  have href := (accepted_structural sp prev can p h).2.2.2.1
  exact ⟨commitReviewsMet _, reviewsPinned_sound ⟨sp, p, facts, user⟩ href.1
    (accepted_pins _ _ _ _ h).1⟩

/-- Accepted quantity prefills retain units, and the guard enforces the
required units when any commit occurs (property 7). -/
theorem accepted_units (sp prev can p) (h : check sp prev can p = .ok) : UnitsRight sp p := by
  have ht := accepted_structural sp prev can p h
  exact ⟨ht.2.2.2.2.2.2.2.2.2.1, fun facts user _ => commitUnitsRight ⟨sp, p, facts, user⟩⟩

/-- Accepted programs cannot suppress an alert via a macro; interruptive
alerts must be acknowledged and passive workflow alerts are shown (A1). -/
theorem accepted_alertsFire (sp prev can p) (h : check sp prev can p = .ok) : AlertsFire sp p := by
  have ht := accepted_structural sp prev can p h
  exact ⟨ht.2.2.2.2.2.2.2.1, fun facts user _ =>
    ⟨interruptiveHandled ⟨sp, p, facts, user⟩,
      passivePinned_sound ⟨sp, p, facts, user⟩ (accepted_pins _ _ _ _ h).2.2⟩⟩

#print axioms accepted_pinRules
#print axioms accepted_wellFormed
#print axioms accepted_reviewsBeforeCommit
#print axioms accepted_units
#print axioms accepted_alertsFire
#print axioms accepted_pins

end Ehr.Check
