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
          confirmed := true, provenance? := (if ".observedAt".toList.isSuffixOf eid.toList then el.observationOf?.or el.linkedFrom? else el.linkedFrom?).map ("linked:" ++ ·),
          enteredAt? := epochNow facts s } }, .ok) := by
  have notClear : value ≠ .cleared := by
    rintro rfl
    cases hk : el.kind <;> simp [hk, valueAccepted] at valid
  simp [notClear, step, stepCore, stepEvent, modal, Event.isAck, enterCore, shown, field, decl, role, valid, validation]

/-- New specification for owner review. Clearing a shown field successfully removes
its entire capture, including its confirmation, timestamp and provenance. -/
theorem human_clear_missing (sp p facts user s cid comp eid slot pf t)
    (shown : shownComp? sp p facts s cid = some comp) (field : comp.kind = .field eid slot pf)
    (ok : step sp p facts user .human s (.enter cid .cleared) = (t, .ok)) :
    capturedAt? t eid (resolveSlot s slot) = none := by
  simp only [step, stepCore, stepEvent, shown, enterCore, field, beq_self_eq_true, ↓reduceIte] at ok
  repeat' (first | (simp at ok; done) | split at ok | dsimp only at ok)
  obtain ⟨rfl, _⟩ := Prod.mk.inj ok
  apply List.find?_eq_none.mpr
  intro x hx
  intro hm
  have kept := (Bool.and_eq_true_iff.mp (List.mem_filter.mp hx).2).1
  simp [hm] at kept

/-- New specification for owner review. For an initially absent field, entering
a value and successfully clearing that same field restores its original lookup.
A field that already held a value must also become absent on clear. -/
theorem enter_then_clear (sp p facts user s cid value comp eid slot pf t)
    (absent : capturedAt? s eid (resolveSlot s slot) = none)
    (entered : State) (entry : entered = (step sp p facts user .human s (.enter cid value)).1)
    (shown : shownComp? sp p facts entered cid = some comp) (field : comp.kind = .field eid slot pf)
    (sameSlot : resolveSlot entered slot = resolveSlot s slot)
    (ok : step sp p facts user .human entered (.enter cid .cleared) = (t, .ok)) :
    capturedAt? t eid (resolveSlot s slot) = capturedAt? s eid (resolveSlot s slot) := by
  subst entry
  rw [absent, ← sameSlot]
  exact human_clear_missing sp p facts user _ cid comp eid slot pf t shown field ok

#print axioms human_clear_missing
#print axioms enter_then_clear

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
