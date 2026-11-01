import Ehr.Check.GuardSound

namespace Ehr.Check
open Ehr Ehr.Props Ehr.Proofs

/-- The state predicate used verbatim in `WritesAllowed`. -/
def WritesState (sp : Spec) (facts : Facts) (u : User) (s : State) : Prop :=
  (∀ x ∈ s.captured, ∃ el, sp.element? x.element = some el ∧ u.role ∈ el.enteredBy) ∧
  (∀ c ∈ s.commits, ∃ cs, sp.commit? c = some cs ∧ u.role ∈ cs.roles) ∧
  (∀ r ∈ s.receipts, r ∈ facts.receipts ∨ (sp.info? r.info).isSome)

private theorem setCaptured_writes (sp : Spec) (u : User) (xs : List Captured)
    (x : Captured) (h : ∀ y ∈ xs, ∃ el, sp.element? y.element = some el ∧ u.role ∈ el.enteredBy)
    (hx : ∃ el, sp.element? x.element = some el ∧ u.role ∈ el.enteredBy) :
    ∀ y ∈ setCaptured xs x, ∃ el, sp.element? y.element = some el ∧ u.role ∈ el.enteredBy := by
  intro y hy
  simp only [setCaptured, List.mem_append, List.mem_filter, List.mem_singleton] at hy
  rcases hy with ⟨hy, _⟩ | rfl
  · exact h y hy
  · exact hx

private theorem comp_mem_all (p : Program) (z : ScreenId) (c : Component)
    (h : c ∈ p.compsOf z) : ∃ scr, (scr, c) ∈ allComps p := by
  cases hs : p.screen? z with
  | none => simp [Program.compsOf, hs] at h
  | some scr =>
    refine ⟨scr, ?_⟩
    simp only [allComps, List.mem_flatMap, List.mem_map]
    exact ⟨scr, List.mem_of_find?_eq_some hs, c, by simpa [Program.compsOf, hs] using h, rfl⟩

private def FieldAllowed (sp : Spec) (u : User) (c : Component) : Prop :=
  ∀ e slot pf, c.kind = .field e slot pf →
    ∃ el, sp.element? e = some el ∧ u.role ∈ el.enteredBy

private theorem declared_field (sp p u z c) (h : DeclaredWritesInSpec sp p)
    (hu : u.role = p.role) (hc : c ∈ p.compsOf z) : FieldAllowed sp u c := by
  intro e slot pf hk
  obtain ⟨scr, hsc⟩ := comp_mem_all p z c hc
  obtain ⟨el, hel, hr⟩ := h.1 (scr, c) hsc (e, slot, pf) (by simp [fieldOf?, hk])
  exact ⟨el, by simpa using hel, hu ▸ hr⟩

private theorem prefillField_writes (sp f u s c) (h : WritesState sp f u s)
    (hf : FieldAllowed sp u c) : WritesState sp f u (prefillField sp f s c) := by
  unfold prefillField
  split
  · rename_i e slot pf hk
    obtain ⟨el, hel, hr⟩ := hf e slot pf hk
    simp only [hel]
    split
    · exact h
    · split
      · exact h
      · rename_i x hx
        refine ⟨?_, h.2⟩
        intro y hy
        simp only [List.mem_append, List.mem_singleton] at hy
        rcases hy with hy | rfl
        · exact h.1 y hy
        · exact ⟨el, by simpa [prefillRecord_element hx] using hel, hr⟩
  · exact h

private theorem prefillScreen_writes (sp p f u s) (h : WritesState sp f u s)
    (hd : DeclaredWritesInSpec sp p) (hu : u.role = p.role) :
    WritesState sp f u (prefillScreen sp p f s) := by
  have hfields : ∀ c ∈ p.compsOf s.screen, FieldAllowed sp u c :=
    fun c hc => declared_field sp p u s.screen c hd hu hc
  unfold prefillScreen
  generalize p.compsOf s.screen = cs at hfields ⊢
  induction cs generalizing s with
  | nil => exact h
  | cons c cs ih =>
    exact ih _ (prefillField_writes sp f u s c h (hfields c (by simp)))
      (fun c' hc' => hfields c' (by simp [hc']))

private theorem roleOk_witness (sp : Spec) (u : User) (c : CommitId)
    (h : roleOk sp u c = true) : ∃ cs, sp.commit? c = some cs ∧ u.role ∈ cs.roles := by
  unfold roleOk at h
  split at h
  · rename_i cs hcs
    exact ⟨cs, hcs, by simpa using h⟩
  · contradiction

private theorem clickCommit_writes (sp p f u s cm) (h : WritesState sp f u s) :
    WritesState sp f u (clickCommit sp p f u s cm).1 := by
  have hcap : (clickCommit sp p f u s cm).1.captured = s.captured := by
    unfold clickCommit
    repeat' (first | rfl | split | dsimp only)
  have hrec : (clickCommit sp p f u s cm).1.receipts = s.receipts := by
    unfold clickCommit
    repeat' (first | rfl | split | dsimp only)
  refine ⟨by simpa only [hcap] using h.1, ?_, by simpa only [hrec] using h.2.2⟩
  intro c hc
  rcases clickCommit_guarded sp p f u s cm c hc with hc | hg
  · exact h.2.1 c hc
  · exact roleOk_witness sp u c ((commitGuard_iff ..).mp hg).1

private theorem enterCore_writes (sp p f u actor s cid v) (h : WritesState sp f u s) :
    WritesState sp f u (enterCore sp p f u actor s cid v).1 := by
  unfold enterCore
  split
  · exact h
  · split
    · rename_i e slot pf hk
      split
      · exact h
      · rename_i el hel
        split
        · exact h
        · rename_i hr
          have hrole : u.role ∈ el.enteredBy := by simpa using hr
          split
          · split
            · exact h
            · split
              · exact h
              · exact ⟨setCaptured_writes sp u s.captured _ h.1 ⟨el, hel, hrole⟩, h.2⟩
          · split
            · exact h
            · exact ⟨setCaptured_writes sp u s.captured _ h.1 ⟨el, hel, hrole⟩, h.2⟩
    · exact h

private theorem confirmCore_writes (sp p f u actor s cid) (h : WritesState sp f u s) :
    WritesState sp f u (confirmCore sp p f u actor s cid).1 := by
  unfold confirmCore
  repeat' (first | exact h | split | dsimp only)
  refine ⟨?_, h.2⟩
  intro x hx
  obtain ⟨y, hy, rfl⟩ := List.mem_map.mp hx
  split <;> exact h.1 y hy

private theorem requestPriorAuth_writes (sp f u actor s) (h : WritesState sp f u s) :
    WritesState sp f u (requestPriorAuth sp u actor s).1 := by
  unfold requestPriorAuth
  split
  · exact h
  · rename_i el hel
    split
    · exact h
    · rename_i hr
      have hrole : u.role ∈ el.enteredBy := by simpa using hr
      repeat' (first | exact h | split | dsimp only)
      all_goals exact ⟨setCaptured_writes sp u s.captured _ h.1 ⟨el, hel, hrole⟩, h.2⟩

private theorem markReviewed_writes (sp p f u s i) (h : WritesState sp f u s) :
    WritesState sp f u (markReviewed sp p f u s i).1 := by
  unfold markReviewed
  split
  · exact h
  · split
    · exact h
    · rename_i v hv
      have hi : (sp.info? i).isSome := by
        unfold infoVersion at hv
        split at hv
        · rename_i inf hinf; simp [hinf]
        · contradiction
      refine ⟨h.1, h.2.1, ?_⟩
      intro r hr
      simp only [List.mem_append, List.mem_singleton] at hr
      rcases hr with hr | rfl
      · exact h.2.2 r hr
      · exact Or.inr hi

private theorem clickAlert_writes (sp p f u s a) (h : WritesState sp f u s) :
    WritesState sp f u (clickAlert sp p f s a).1 := by
  unfold clickAlert
  repeat' (first | exact h | split | dsimp only)

private theorem goTo_writes (sp p f u s z) (h : WritesState sp f u s)
    (hd : DeclaredWritesInSpec sp p) (hu : u.role = p.role) :
    WritesState sp f u (goTo sp p f s z).1 := by
  unfold goTo
  split
  · exact h
  · exact prefillScreen_writes _ _ _ _ _ h hd hu

private theorem goBack_writes (sp p f u s) (h : WritesState sp f u s)
    (hd : DeclaredWritesInSpec sp p) (hu : u.role = p.role) :
    WritesState sp f u (goBack sp p f s).1 := by
  unfold goBack
  split
  · exact h
  · exact prefillScreen_writes _ _ _ _ _ h hd hu

private theorem clickCore_writes (sp p f u actor s c) (h : WritesState sp f u s)
    (hd : DeclaredWritesInSpec sp p) (hu : u.role = p.role) :
    WritesState sp f u (clickCore sp p f u actor s c).1 := by
  unfold clickCore
  split
  · cases actor
    · exact clickAlert_writes _ _ _ _ _ _ h
    · exact h
  · exact goTo_writes _ _ _ _ _ _ h hd hu
  · exact goBack_writes _ _ _ _ _ h hd hu
  · cases actor
    · exact clickCommit_writes _ _ _ _ _ _ h
    · exact h
  · cases actor
    · exact markReviewed_writes _ _ _ _ _ _ h
    · exact h
  · split
    · exact prefillScreen_writes _ _ _ _ _ h hd hu
    · exact h
  · exact requestPriorAuth_writes _ _ _ _ _ h
  · exact h
  · cases actor <;> exact h
  · exact h

private theorem stepCore_writes (sp p f u actor s e) (h : WritesState sp f u s)
    (hd : DeclaredWritesInSpec sp p) (hu : u.role = p.role) :
    WritesState sp f u (stepCore sp p f u actor s e).1 := by
  unfold stepCore
  split
  · exact h
  · cases e with
    | click cid =>
      simp only [stepEvent]
      split
      · exact h
      · exact clickCore_writes _ _ _ _ _ _ _ h hd hu
    | enter cid v => exact enterCore_writes _ _ _ _ _ _ _ _ h
    | confirm cid => exact confirmCore_writes _ _ _ _ _ _ _ h
    | ack a => simp only [stepEvent]; unfold ackCore; repeat' (first | exact h | split | dsimp only)
    | selectTab cid idx => simp only [stepEvent]; unfold selectTabCore; repeat' (first | exact h | split | dsimp only)
    | scroll z => simp only [stepEvent]; split <;> exact h
    | search q => simp only [stepEvent]; split <;> exact h

private theorem macroStep_writes (sp p f u s st) (h : WritesState sp f u s)
    (hd : DeclaredWritesInSpec sp p) (hu : u.role = p.role) :
    WritesState sp f u (macroStep sp p f u s st).1 := by
  cases st with
  | setValue cid v => exact stepCore_writes _ _ _ _ _ _ _ h hd hu
  | click cid => exact stepCore_writes _ _ _ _ _ _ _ h hd hu
  | goto z => simp only [macroStep]; split; exact h; exact goTo_writes _ _ _ _ _ _ h hd hu

private theorem runMacro_writes (sp p f u) (steps : List MacroStep) (i s)
    (h : WritesState sp f u s) (hd : DeclaredWritesInSpec sp p) (hu : u.role = p.role) :
    WritesState sp f u (runMacro sp p f u i s steps).1 := by
  induction steps generalizing i s with
  | nil => exact h
  | cons st steps ih =>
    have ht := macroStep_writes sp p f u s st h hd hu
    unfold runMacro
    split
    · rename_i t he; rw [he] at ht; exact ih _ _ ht
    · rename_i t r hr he; rw [he] at ht; exact ht

/-- Field declaration permissions suffice for the actual interpreter's write
invariant; enter, commit, receipt and request actions also check permissions. -/
theorem writesAllowed (ep : Episode) (hd : DeclaredWritesInSpec ep.spec ep.prog)
    (hu : ep.user.role = ep.prog.role) : WritesAllowed ep := by
  intro s hs
  change WritesState ep.spec ep.facts ep.user s
  induction hs with
  | start =>
    apply prefillScreen_writes _ _ _ _ _ _ hd hu
    exact ⟨by simp, by simp, fun r hr => Or.inl hr⟩
  | step actor e _ ih =>
    unfold Episode.next step
    split
    · split
      · exact runMacro_writes _ _ _ _ _ _ _ ih hd hu
      · exact stepCore_writes _ _ _ _ _ _ _ ih hd hu
    · exact stepCore_writes _ _ _ _ _ _ _ ih hd hu
  | wait d _ ih => exact ih

/-- Accepted programs write only authorized spec elements, commits and infos
(property 3), including every reachable macro and timed execution. -/
theorem accepted_writesOnly (sp prev can p) (h : check sp prev can p = .ok) :
    WritesOnly sp p := by
  have hd := (accepted_structural sp prev can p h).2.2.2.2.1
  exact ⟨hd, fun facts user hu => writesAllowed ⟨sp, p, facts, user⟩ hd hu⟩

#print axioms writesAllowed
#print axioms accepted_writesOnly
end Ehr.Check
