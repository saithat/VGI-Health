import Ehr.Core.Json

namespace Ehr.Specs.MarTiming
open Ehr

/-- Additive scheduled-dose contract. Legacy records omit the early boundary;
new records distinguish bedside administration from charting. CMS S14 (2026)
supplies window widths; criticality and other clinical guards remain separate. -/
def valid (a : AdministrationDecision) : Bool :=
  (a.windowStartMin?.getD a.scheduledMin ≤ a.attemptMin) &&
  (if a.outcome == .given || a.outcome == .delayed then a.attemptMin ≤ a.windowEndMin else true) &&
  (match a.windowStartMin? with
   | none => true
   | some first => (first == a.scheduledMin - (a.windowEndMin - a.scheduledMin)) &&
      [30, 60, 120].contains (a.windowEndMin - a.scheduledMin) &&
      a.chartedMin?.any (a.attemptMin ≤ ·) &&
      (if a.outcome == .given then a.administeredMin? == some a.attemptMin
       else a.administeredMin?.isNone))

theorem valid_not_early (a : AdministrationDecision) (h : valid a = true) :
    a.windowStartMin?.getD a.scheduledMin ≤ a.attemptMin := by
  simp only [valid, Bool.and_eq_true, decide_eq_true_eq] at h
  exact h.1.1

theorem valid_charted_after_attempt (a : AdministrationDecision) (first : Nat)
    (early : a.windowStartMin? = some first) (h : valid a = true) :
    ∃ charted, a.chartedMin? = some charted ∧ a.attemptMin ≤ charted := by
  simp only [valid, early, Bool.and_eq_true, decide_eq_true_eq] at h
  have hc := h.2.1.2
  cases he : a.chartedMin? with
  | none => simp [he] at hc
  | some t => exact ⟨t, rfl, by simpa [he] using hc⟩

#print axioms valid_not_early
#print axioms valid_charted_after_attempt
end Ehr.Specs.MarTiming
