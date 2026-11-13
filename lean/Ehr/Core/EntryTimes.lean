import Ehr.Core.Interp
import Ehr.Core.Json

namespace Ehr.EntryTimes

/-- New specification for owner review: human-only companion on the existing field/event path. -/
def companion (e : ElementSpec) : ElementSpec :=
  { id := e.id ++ ".observedAt", label := e.label ++ " — Time taken"
    kind := .text, enteredBy := e.enteredBy, prefill := .never, friction := .compliance
    humanOnly := true, observationOf? := some e.id, validation? := some (.observationTime e.id)
    fhirTarget := "Provenance.extension.observedAt" }

/-- New specification for owner review: optional companions, never requirements. -/
def withCompanions (elements : List ElementSpec) : List ElementSpec :=
  elements ++ (elements.filter (fun e => e.observation? == some true)).map companion

/-- New specification for owner review: confirmed human override on the same slot,
otherwise the source's entry time. -/
def observedAt? (sp : Spec) (facts : Facts) (s : State) (c : Captured) : Option Int :=
  let override := s.captured.find? fun t => t.slot == c.slot && t.byHuman && t.confirmed &&
    (sp.element? t.element).any (fun el => el.observationOf? == some c.element &&
      observationTimeValid facts s el t.slot t.value)
  (override.bind fun t => match t.value with | .text raw => raw.toInt? | _ => none).or c.enteredAt?

/-- New specification for owner review: informational local policy, strict threshold. -/
def late (d : DesignRules) (observed signed : Int) : Bool :=
  signed - observed > Int.ofNat d.lateEntryMinutes

/-- New specification for owner review: sign preview and persisted provenance data.
All times are UTC epoch minutes. -/
structure StoredTime where
  element : ElementId
  slot : Nat
  enteredAt : Int
  observedAt : Int
  signedAt : Int
  lateEntry : Bool
  deriving DecidableEq, Repr, Lean.ToJson, Lean.FromJson

/-- New specification for owner review: omit legacy captures lacking an absolute clock. -/
def records (sp : Spec) (facts : Facts) (s : State) : List StoredTime :=
  s.captured.filterMap fun c => do
    if !c.confirmed || (sp.element? c.element).any (·.observationOf?.isSome) then none else do
      let entered ← c.enteredAt?
      let observed ← observedAt? sp facts s c
      let signed ← epochNow facts s
      return { element := c.element, slot := c.slot, enteredAt := entered, observedAt := observed, signedAt := signed, lateEntry := late sp.design observed signed }

/-- New specification for owner review: absolute times cannot exceed sign time. -/
def valid (sp : Spec) (facts : Facts) (s : State) : Bool :=
  s.captured.all (fun c => c.enteredAt?.all (fun entered =>
    (epochNow facts s).any (entered ≤ ·))) &&
  (records sp facts s).all (fun t => t.observedAt ≤ t.signedAt)

/-- New specification for owner review: label exactness, including equality. -/
theorem late_iff (d : DesignRules) (observed signed : Int) :
    late d observed signed = true ↔ signed - observed > Int.ofNat d.lateEntryMinutes := by
  simp [late]

/-- New specification for owner review: every validated stored observation precedes signing. -/
theorem stored_observed_le_signed (sp : Spec) (facts : Facts) (s : State)
    (h : valid sp facts s = true) (t : StoredTime) (ht : t ∈ records sp facts s) :
    t.observedAt ≤ t.signedAt := by
  simp only [valid, Bool.and_eq_true, List.all_eq_true, decide_eq_true_eq] at h
  exact h.2 t ht

/-- New specification for owner review: time companions are always human-only. -/
theorem companion_needsHuman (e : ElementSpec) : needsHuman (companion e) = true := by
  simp [needsHuman, companion]

/-- New specification for owner review: prefills retain the trusted entry clock.
Legacy clockless replay retains none; no day-relative time is invented. -/
theorem prefill_enteredAt (facts : Facts) (s : State) (e : ElementId)
    (el : ElementSpec) (n : Nat) (pf : Prefill) (c : Captured)
    (h : prefillRecord facts s e el n pf = some c) : c.enteredAt? = epochNow facts s := by
  cases pf <;> simp only [prefillRecord] at h
  · contradiction
  · split at h
    · contradiction
    · obtain ⟨v, _, rfl⟩ := Option.map_eq_some_iff.mp h
      rfl
  · obtain ⟨v, _, rfl⟩ := Option.map_eq_some_iff.mp h
    rfl
  · obtain ⟨v, _, rfl⟩ := Option.map_eq_some_iff.mp h
    rfl

#print axioms late_iff
#print axioms stored_observed_le_signed
#print axioms companion_needsHuman
#print axioms prefill_enteredAt

/-- New specification for owner review: every new value entered by either actor
retains the trusted entry clock; old captures may be historical. -/
theorem enter_new_enteredAt (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (actor : Actor) (s : State) (cid : CompId) (v : Value) (c : Captured)
    (hc : c ∈ (enterCore sp prog facts user actor s cid v).1.captured) :
    c ∈ s.captured ∨ c.enteredAt? = epochNow facts s := by
  unfold enterCore at hc
  repeat' (first | exact Or.inl hc | split at hc | dsimp only at hc)
  all_goals
    simp only [setCaptured, List.mem_append, List.mem_filter, List.mem_singleton] at hc
    rcases hc with ⟨hc, _⟩ | rfl
    · exact Or.inl hc
    · exact Or.inr (by simp [storedCapture])

/-- New specification for owner review: even a hostile prefill on a time companion
cannot change captured observations. -/
theorem companion_no_prefill (sp : Spec) (facts : Facts) (s : State) (c : Component)
    (e : ElementSpec) (slot : Slot) (pf : Prefill)
    (field : c.kind = .field (companion e).id slot pf)
    (decl : sp.element? (companion e).id = some (companion e)) :
    prefillField sp facts s c = s := by
  simp only [prefillField, field]
  rw [decl]
  simp [companion, needsHuman]

/-- New specification for owner review: a macro cannot enter an observed time. -/
theorem companion_no_macro (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (s : State) (cid : CompId) (c : Component) (e : ElementSpec)
    (slot : Slot) (pf : Prefill) (v : Value)
    (shown : shownComp? sp prog facts s cid = some c)
    (field : c.kind = .field (companion e).id slot pf)
    (decl : sp.element? (companion e).id = some (companion e)) :
    (enterCore sp prog facts user .«macro» s cid v).1 = s := by
  simp only [enterCore, shown, field]
  rw [decl]
  by_cases h : user.role ∈ e.enteredBy <;> simp [companion, needsHuman, h]

/-- New specification for owner review: with a trusted clock every newly
entered capture has an absolute entry time, for humans and macros. -/
theorem new_entry_has_enteredAt (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (actor : Actor) (s : State) (cid : CompId) (v : Value) (c : Captured) (time : Int)
    (clock : epochNow facts s = some time)
    (hc : c ∈ (enterCore sp prog facts user actor s cid v).1.captured)
    (newCapture : c ∉ s.captured) : c.enteredAt? = some time := by
  rcases enter_new_enteredAt sp prog facts user actor s cid v c hc with old | entered
  · exact False.elim (newCapture old)
  · exact entered.trans clock

/-- New specification for owner review: a stored label uses the exact threshold. -/
theorem records_late_exact (sp : Spec) (facts : Facts) (s : State)
    (t : StoredTime) (ht : t ∈ records sp facts s) :
    t.lateEntry = true ↔ t.signedAt - t.observedAt > Int.ofNat sp.design.lateEntryMinutes := by
  obtain ⟨c, _, hc⟩ := List.mem_filterMap.mp ht
  split at hc
  · contradiction
  · cases he : c.enteredAt? <;> cases ho : observedAt? sp facts s c <;>
      cases hs : epochNow facts s <;> simp_all [late]
    cases hc
    simp

/-- New specification for owner review: a human can always reset an optional
time override to the source entry time, even with incomplete historical facts. -/
theorem observation_time_reset (facts : Facts) (s : State) (el : ElementSpec) (slot : Nat) :
    observationTimeValid facts s el slot (.text "") = true := by
  unfold observationTimeValid
  split <;> simp

#print axioms observation_time_reset
#print axioms new_entry_has_enteredAt
#print axioms records_late_exact
#print axioms enter_new_enteredAt
#print axioms companion_no_prefill
#print axioms companion_no_macro

end Ehr.EntryTimes
