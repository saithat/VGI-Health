import Ehr.Check.ValueWitness

namespace Ehr.Check
open Ehr Ehr.Props

/-- A shown, authorized field accepts a valid human value in the real public
interpreter, storing one confirmed human capture. This is the write step of
the outstanding constructive T1 completion proof. -/
theorem human_enter (sp : Spec) (p : Program) (facts : Facts) (user : User)
    (s : State) (comp : Component) (eid : ElementId) (slot : Slot) (pf : Prefill)
    (el : ElementSpec) (value : Value)
    (modal : s.popup? = none) (shown : shownComp? sp p facts s comp.id = some comp)
    (field : comp.kind = .field eid slot pf) (decl : sp.element? eid = some el)
    (role : user.role ∈ el.enteredBy) (valid : valueAccepted facts user el.kind value = true)
    (validation : elementValueValid facts s el (resolveSlot s slot) value = true) :
    step sp p facts user .human s (.enter comp.id value) =
      ({ s with captured := setCaptured s.captured {
          element := eid, slot := resolveSlot s slot, value, byHuman := true,
          confirmed := true, provenance? := none } }, .ok) := by
  simp [step, stepCore, stepEvent, modal, Event.isAck, enterCore, shown, field, decl, role, valid, validation]

/-- A scalar witness can be entered without relational dose constraints.
Medication doses and their selectors require a selected formulary drug. -/
theorem human_entry_exists (sp : Spec) (p : Program) (facts : Facts) (user : User)
    (s : State) (comp : Component) (eid : ElementId) (slot : Slot) (pf : Prefill)
    (el : ElementSpec) (modal : s.popup? = none)
    (shown : shownComp? sp p facts s comp.id = some comp)
    (field : comp.kind = .field eid slot pf) (decl : sp.element? eid = some el)
    (role : user.role ∈ el.enteredBy) (noValidation : el.validation? = none)
    (nonDose : el.kind ≠ .medicationDose)
    (nonSelector : el.id ≠ "doseUnit" ∨ el.kind ≠ .coded "dose-unit")
    (scans : RecordAllowsScans sp facts) :
    ∃ value : Value, (step sp p facts user .human s (.enter comp.id value)).2 = .ok := by
  have member : el ∈ sp.elements := List.mem_of_find?_eq_some decl
  obtain ⟨value, hv⟩ := declared_value_witness sp facts user scans el member
  have valid : valueAccepted facts user el.kind value = true := by
    cases hk : el.kind <;> cases value <;> simp_all [valueSatisfies, valueAccepted]
  refine ⟨value, ?_⟩
  rw [human_enter sp p facts user s comp eid slot pf el value modal shown field decl role valid
    (by simp [elementValueValid, noValidation, nonDose, nonSelector])]

#print axioms human_enter
#print axioms human_entry_exists
end Ehr.Check
