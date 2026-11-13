import Ehr.Check.ScreenSound

/-! Reachable order-line locations for fixed-slot drug composers. This uses the
public interpreter, including prefills, macros and new-order-line actions. -/
namespace Ehr.Check
open Ehr Ehr.Props Ehr.Proofs

/-- Every stored drug capture belongs to one of the declared fixed slots. -/
def DrugSlotsWithin (slots : List Nat) (s : State) : Prop :=
  ∀ x ∈ s.captured, x.element = drugElement → x.slot ∈ slots

/-- Every enumerated order line inherits its captured drug's slot bound. -/
theorem orderLines_slots (slots : List Nat) (s : State) (h : DrugSlotsWithin slots s)
    (line : Nat × String) (hl : line ∈ orderLines s) : line.1 ∈ slots := by
  obtain ⟨x, hx, hl⟩ := List.mem_filterMap.mp hl
  split at hl
  · rename_i hd
    cases hv : x.value <;> simp only [hv] at hl
    all_goals first
      | contradiction
      | (cases hl; exact h x hx (by simpa using hd))
  · contradiction

/-- Every drug field in the program binds to a declared fixed slot. Other
fields may bind to current slots; macros and navigation are unrestricted. -/
def FixedDrugSlots (p : Program) (slots : List Nat) : Prop :=
  ∀ sc ∈ allComps p, ∀ slot pf, sc.2.kind = .field drugElement slot pf →
    ∃ n ∈ slots, slot = .fixed n

/-- A field prefill keeps the slot selected by that field. -/
theorem prefillRecord_slot {f : Facts} {s : State} {e : ElementId} {el : ElementSpec}
    {n : Nat} {pf : Prefill} {x : Captured} (h : prefillRecord f s e el n pf = some x) :
    x.slot = n := by
  cases pf <;> simp [prefillRecord] at h
  case fromRecord => obtain ⟨_, _, _, rfl⟩ := h; rfl
  all_goals (obtain ⟨_, _, rfl⟩ := h; rfl)

private theorem field_slot (p : Program) (slots : List Nat) (bound : FixedDrugSlots p slots)
    (s : State) (comp : Component) (hc : comp ∈ p.compsOf s.screen)
    (slot : Slot) (pf : Prefill) (hk : comp.kind = .field drugElement slot pf) :
    resolveSlot s slot ∈ slots := by
  cases hs : p.screen? s.screen with
  | none => simp [Program.compsOf, hs] at hc
  | some scr =>
    have member : (scr, comp) ∈ allComps p :=
      List.mem_flatMap.mpr ⟨scr, List.mem_of_find?_eq_some hs,
        List.mem_map.mpr ⟨comp, by simpa [Program.compsOf, hs] using hc, rfl⟩⟩
    obtain ⟨n, hn, rfl⟩ := bound (scr, comp) member slot pf hk
    exact hn

private theorem prefillField_slots (sp : Spec) (p : Program) (f : Facts) (slots : List Nat)
    (bound : FixedDrugSlots p slots) (s : State) (c : Component)
    (hc : c ∈ p.compsOf s.screen) (h : DrugSlotsWithin slots s) :
    DrugSlotsWithin slots (prefillField sp f s c) := by
  unfold prefillField
  split
  · rename_i e slot pf hk
    split
    · exact h
    · dsimp only
      split
      · exact h
      · split
        · exact h
        · rename_i x hx
          intro y hy he
          rcases List.mem_append.mp hy with hy | hy
          · exact h y hy he
          · have eq : y = x := List.mem_singleton.mp hy
            subst y
            have elem := prefillRecord_element hx
            have loc := prefillRecord_slot hx
            have ee : e = drugElement := elem.symm.trans he
            rw [ee] at hk
            rw [loc]
            exact field_slot p slots bound s c hc slot pf hk
  · exact h

private theorem prefillScreen_slots (sp : Spec) (p : Program) (f : Facts) (slots : List Nat)
    (bound : FixedDrugSlots p slots) (s : State) (h : DrugSlotsWithin slots s) :
    DrugSlotsWithin slots (prefillScreen sp p f s) := by
  unfold prefillScreen
  generalize he : p.compsOf s.screen = cs
  have go (cs : List Component) (s : State)
      (hc : ∀ c ∈ cs, c ∈ p.compsOf s.screen) (h : DrugSlotsWithin slots s) :
      DrugSlotsWithin slots (cs.foldl (prefillField sp f) s) := by
    induction cs generalizing s with
    | nil => exact h
    | cons c cs ih =>
      apply ih (prefillField sp f s c)
      · intro x hx
        rw [(prefillField_frame sp f s c).2.2.2.2.1]
        exact hc x (by simp [hx])
      · exact prefillField_slots sp p f slots bound s c (hc c (by simp)) h
  exact go cs s (by intro c hc; simpa [he] using hc) h

private theorem enterCore_slots (sp p f u actor s cid v slots)
    (bound : FixedDrugSlots p slots) (h : DrugSlotsWithin slots s) :
    DrugSlotsWithin slots (enterCore sp p f u actor s cid v).1 := by
  unfold enterCore
  split
  · exact h
  · rename_i comp shown
    have member : comp ∈ p.compsOf s.screen := List.mem_of_find?_eq_some shown
    split
    · rename_i eid slot pf hk
      have store (human confirmed : Bool) (provenance : Option String) : DrugSlotsWithin slots
          { s with captured := setCaptured s.captured { element := eid, slot := resolveSlot s slot, value := v, byHuman := human, confirmed := confirmed, provenance? := provenance, enteredAt? := epochNow f s } } := by
        intro x hx he
        simp only [setCaptured, List.mem_append, List.mem_filter, List.mem_singleton] at hx
        rcases hx with ⟨hx, _⟩ | rfl
        · exact h x hx he
        · have ee : eid = drugElement := he
          rw [ee] at hk
          exact field_slot p slots bound s comp member slot pf hk
      repeat' (first | exact h | split | dsimp only)
      all_goals exact store _ _ _
    · cases v <;> exact h
    · exact h

private theorem confirmCore_slots (sp p f u actor s cid slots) (h : DrugSlotsWithin slots s) :
    DrugSlotsWithin slots (confirmCore sp p f u actor s cid).1 := by
  unfold confirmCore
  repeat' (first | exact h | split | dsimp only)
  intro x hx he
  obtain ⟨y, hy, rfl⟩ := List.mem_map.mp hx
  split
  · rename_i hh
    rw [ite_eq_left hh] at he
    exact h y hy he
  · rename_i hh
    rw [ite_eq_right hh] at he
    exact h y hy he

private theorem request_slots (sp u actor s slots) (h : DrugSlotsWithin slots s) (time : Option Int) :
    DrugSlotsWithin slots (requestPriorAuth sp u actor s time).1 := by
  unfold requestPriorAuth
  repeat' (first | exact h | split | dsimp only)
  all_goals
    intro x hx he
    simp only [setCaptured, List.mem_append, List.mem_filter, List.mem_singleton] at hx
    rcases hx with ⟨hx, _⟩ | rfl
    · exact h x hx he
    · simp [storedCapture, priorAuthElement, drugElement] at he

private theorem goTo_slots (sp p f s z slots) (bound : FixedDrugSlots p slots)
    (h : DrugSlotsWithin slots s) : DrugSlotsWithin slots (goTo sp p f s z).1 := by
  unfold goTo
  split
  · exact h
  · exact prefillScreen_slots sp p f slots bound _ h

private theorem goBack_slots (sp p f s slots) (bound : FixedDrugSlots p slots)
    (h : DrugSlotsWithin slots s) : DrugSlotsWithin slots (goBack sp p f s).1 := by
  unfold goBack
  split
  · exact h
  · exact prefillScreen_slots sp p f slots bound _ h

private theorem clickCore_slots (sp p f u actor s comp slots) (bound : FixedDrugSlots p slots)
    (h : DrugSlotsWithin slots s) : DrugSlotsWithin slots (clickCore sp p f u actor s comp).1 := by
  unfold clickCore
  split
  · cases actor
    · unfold clickAlert; repeat' (first | exact h | split | dsimp only)
    · exact h
  · exact goTo_slots _ _ _ _ _ _ bound h
  · exact goBack_slots _ _ _ _ _ bound h
  · cases actor
    · unfold clickCommit; repeat' (first | exact h | split | dsimp only)
    · exact h
  · cases actor
    · unfold markReviewed; repeat' (first | exact h | split | dsimp only)
    · exact h
  · split
    · exact prefillScreen_slots sp p f slots bound _ h
    · exact h
  · exact request_slots _ _ _ _ _ h (epochNow f s)
  · exact h
  · cases actor <;> exact h
  · exact h

private theorem stepCore_slots (sp p f u actor s e slots) (bound : FixedDrugSlots p slots)
    (h : DrugSlotsWithin slots s) : DrugSlotsWithin slots (stepCore sp p f u actor s e).1 := by
  unfold stepCore
  split
  · exact h
  · cases e with
    | click cid =>
      simp only [stepEvent]
      split
      · exact h
      · exact clickCore_slots _ _ _ _ _ _ _ _ bound h
    | enter cid v =>
      simp only [stepEvent]
      split
      · intro x hx he
        obtain ⟨y, hy, hel, hsl, -⟩ := reconcileCore_captured sp u actor s cid v x hx
        rw [hsl]; exact h y hy (hel ▸ he)
      · exact enterCore_slots _ _ _ _ _ _ _ _ _ bound h
    | confirm cid => exact confirmCore_slots _ _ _ _ _ _ _ _ h
    | ack a => simp only [stepEvent]; unfold ackCore; repeat' (first | exact h | split | dsimp only)
    | selectTab cid idx => simp only [stepEvent]; unfold selectTabCore; repeat' (first | exact h | split | dsimp only)
    | scroll z => simp only [stepEvent]; split <;> exact h
    | search q => simp only [stepEvent]; split <;> exact h

private theorem macroStep_slots (sp p f u s st slots) (bound : FixedDrugSlots p slots)
    (h : DrugSlotsWithin slots s) : DrugSlotsWithin slots (macroStep sp p f u s st).1 := by
  cases st with
  | setValue cid v => exact stepCore_slots _ _ _ _ _ _ _ _ bound h
  | click cid => exact stepCore_slots _ _ _ _ _ _ _ _ bound h
  | goto z => simp only [macroStep]; split; exact h; exact goTo_slots _ _ _ _ _ _ bound h

private theorem runMacro_slots (sp p f u) (steps : List MacroStep) (i s slots)
    (bound : FixedDrugSlots p slots) (h : DrugSlotsWithin slots s) :
    DrugSlotsWithin slots (runMacro sp p f u i s steps).1 := by
  induction steps generalizing i s with
  | nil => exact h
  | cons st rest ih =>
    have ht := macroStep_slots sp p f u s st slots bound h
    unfold runMacro
    split
    · rename_i t he; rw [he] at ht; exact ih _ _ ht
    · rename_i t r hr he; rw [he] at ht; exact ht

/-- Fixed drug-field slots bound every drug capture after any public event,
including a human macro click and a new-order-line action. -/
theorem step_drugSlots (sp p f u actor s e slots) (bound : FixedDrugSlots p slots)
    (h : DrugSlotsWithin slots s) : DrugSlotsWithin slots (step sp p f u actor s e).1 := by
  unfold step
  split
  · split
    · exact runMacro_slots _ _ _ _ _ _ _ _ bound h
    · exact stepCore_slots _ _ _ _ _ _ _ _ bound h
  · exact stepCore_slots _ _ _ _ _ _ _ _ bound h

/-- All reachable states, with arbitrary macros and time passing, obey the
fixed drug-slot declaration. No checker or completion premise is assumed. -/
theorem reachable_drugSlots (ep : Episode) (slots : List Nat) (bound : FixedDrugSlots ep.prog slots) :
    Always ep (DrugSlotsWithin slots) := by
  intro s hs
  induction hs with
  | start => exact prefillScreen_slots _ _ _ _ bound _ (by intro x hx; cases hx)
  | step actor e _ ih => exact step_drugSlots _ _ _ _ _ _ _ _ bound ih
  | wait d _ ih => exact ih

#print axioms reachable_drugSlots
#print axioms enterCore_slots
#print axioms request_slots
#print axioms clickCore_slots

#print axioms stepCore_slots

end Ehr.Check
