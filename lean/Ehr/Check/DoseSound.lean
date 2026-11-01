import Ehr.Check.GuardSound

namespace Ehr.Check
open Ehr Ehr.Props Ehr.Proofs

/-- Committing rechecks every medication dose against its own slot's drug and
unit selector, including captures made before a dependency changed. -/
theorem committed_dose_native (ep : Episode) (s : State) (actor : Actor)
    (event : Event) (c : CommitId) (happened : CommitHappens ep s actor event c)
    (el : ElementSpec) (hel : el ∈ ep.spec.elements) (kind : el.kind = .medicationDose)
    (x : Captured) (hx : x ∈ s.captured) (bound : x.element = el.id) :
    doseValueValid s x.slot x.value = true := by
  have extra := T0_extra_contract ep.spec ep.prog ep.facts ep.user actor s event c happened.1 happened.2
  unfold extraGuard at extra
  cases hc : ep.spec.commit? c with
  | none => simp [hc] at extra
  | some cs =>
    simp only [hc, Bool.and_eq_true] at extra
    have vals := extra.1.1.1.2
    have entry := List.all_eq_true.mp (List.all_eq_true.mp vals el hel) x hx
    have valid : elementValueValid ep.facts s el x.slot x.value = true := by
      simpa [bound] using entry
    simpa [elementValueValid, kind] using (Bool.and_eq_true_iff.mp valid).1

#print axioms committed_dose_native
end Ehr.Check
