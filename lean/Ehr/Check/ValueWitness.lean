import Ehr.Props.Properties

namespace Ehr.Check
open Ehr Ehr.Props

/-- Every kind has a valid human-enterable value whenever its medication
scan target exists. This is a constructive sub-obligation of general T1;
it does not assume a completion path or assert that such a path exists. -/
theorem value_witness (facts : Facts) (user : User) (kind : ValueKind)
    (hmed : kind = .scan "medication" → facts.medToGive?.isSome = true) :
    ∃ value, valueSatisfies facts user kind value = true := by
  cases kind with
  | quantity unit => exact ⟨.qty 0 unit, by simp [valueSatisfies, valueAccepted]⟩
  | medicationDose => exact ⟨.qty 0 .mg, rfl⟩
  | coded _ => exact ⟨.code "entered", by simp [valueSatisfies, valueAccepted]⟩
  | text => exact ⟨.text "entered", rfl⟩
  | flag => exact ⟨.flag true, rfl⟩
  | identity => exact ⟨.text (identityText facts.identity), by simp [valueSatisfies, valueAccepted]⟩
  | cosign =>
    by_cases h : user.id = "second"
    · exact ⟨.user "third", by simp [valueSatisfies, valueAccepted, h]⟩
    · exact ⟨.user "second", by simpa [valueSatisfies, valueAccepted, ne_comm] using h⟩
  | scan target =>
    by_cases hw : target = "wristband"
    · subst target
      exact ⟨.code facts.patientId, by simp [valueSatisfies, valueAccepted, scanMatches]⟩
    · by_cases hm : target = "medication"
      · subst target
        cases hf : facts.medToGive? with
        | none => simp [hf] at hmed
        | some drug =>
          exact ⟨.code drug, by simp [valueSatisfies, valueAccepted, scanMatches, hf]⟩
      · exact ⟨.code "scanned", by simp [valueSatisfies, valueAccepted, scanMatches, hw, hm]⟩

/-- The property's scan-domain assumption supplies the premise above for
every declared element. No encounter or role restriction is introduced. -/
theorem declared_value_witness (spec : Spec) (facts : Facts) (user : User)
    (hscan : RecordAllowsScans spec facts) (el : ElementSpec) (hel : el ∈ spec.elements) :
    ∃ value, valueSatisfies facts user el.kind value = true :=
  value_witness facts user el.kind (fun h => hscan ⟨el, hel, h⟩)

#print axioms value_witness
#print axioms declared_value_witness
end Ehr.Check
