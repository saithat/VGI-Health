import Ehr.Check.PatchWitness

namespace Ehr.Check
open Ehr Ehr.Canonical

/-- A predicate of the element bound by a field, independent of presentation. -/
def FieldRule (ok : ElementId → Prop) (c : Component) : Prop :=
  ∀ e slot pf, c.kind = .field e slot pf → ok e

def FieldsRespect (ok : ElementId → Prop) (cs : List Component) : Prop :=
  ∀ c ∈ cs, FieldRule ok c

theorem fields_filter (ok : ElementId → Prop) (cs : List Component) (p : Component → Bool)
    (h : FieldsRespect ok cs) : FieldsRespect ok (cs.filter p) :=
  fun c hc => h c (List.mem_filter.mp hc).1

theorem fields_append (ok : ElementId → Prop) (xs ys : List Component)
    (hx : FieldsRespect ok xs) (hy : FieldsRespect ok ys) : FieldsRespect ok (xs ++ ys) := by
  intro c hc
  exact (List.mem_append.mp hc).elim (hx c) (hy c)

theorem fields_map (ok : ElementId → Prop) (cs : List Component) (f : Component → Component)
    (h : FieldsRespect ok cs) (kept : ∀ c, FieldRule ok c → FieldRule ok (f c)) :
    FieldsRespect ok (cs.map f) := by
  intro c hc
  obtain ⟨original, ho, rfl⟩ := List.mem_map.mp hc
  exact kept original (h original ho)

theorem field_route (ok : ElementId → Prop) (c : Component) (h : FieldRule ok c) :
    FieldRule ok (Blueprint.route c) := by
  cases hk : c.kind <;> simp_all [FieldRule, Blueprint.route]
  rename_i action
  cases action <;> simp_all [FieldRule, Blueprint.route]

theorem fields_fold {α : Type} (ok : ElementId → Prop)
    (f : α × List Component → Component → α × List Component)
    (step : ∀ a c, FieldsRespect ok a.2 → FieldRule ok c → FieldsRespect ok (f a c).2)
    (xs : List Component) (a : α × List Component) (hx : FieldsRespect ok xs)
    (ha : FieldsRespect ok a.2) : FieldsRespect ok (xs.foldl f a).2 := by
  induction xs generalizing a with
  | nil => exact ha
  | cons c cs ih =>
    exact ih (f a c) (fun d hd => hx d (List.mem_cons_of_mem c hd))
      (step a c ha (hx c (List.mem_cons_self)))

theorem nonempty_head_mem {α : Type} [Inhabited α] (xs : List α)
    (h : xs.isEmpty = false) : xs.head! ∈ xs := by
  cases xs <;> simp_all [List.head!]

/-- Signature construction only copies existing fields. Its new controls and
section headings do not introduce element bindings. -/
theorem signature_fields (ok : ElementId → Prop) (s : Screen)
    (h : FieldsRespect ok s.components) : FieldsRespect ok (Blueprint.signature s).components := by
  unfold Blueprint.signature
  dsimp only
  split
  · exact h
  · rename_i nonempty
    have hi := h _ ((List.mem_filter.mp (nonempty_head_mem _
      (by simpa only [Bool.not_eq_true] using nonempty))).1)
    apply fields_fold (ok := ok)
    · intro a c ha hc
      rcases a with ⟨used, out⟩
      dsimp only
      split
      · split
        · apply fields_append ok _ _ ha
          intro d hd
          simp only [List.mem_cons, List.not_mem_nil, or_false] at hd
          rcases hd with rfl | rfl | rfl
          · simp [FieldRule, group, mk]
          · split <;> simpa [FieldRule] using hi
          · simpa [FieldRule] using hc
        · exact fields_append ok _ _ ha (by simpa [FieldsRespect] using hc)
      · exact fields_append ok _ _ ha (by simpa [FieldsRespect] using hc)
    · exact fields_filter ok _ _ h
    · simp [FieldsRespect]

/-- Cleanup changes only navigation targets and presentation parents. -/
theorem clean_fields (ok : ElementId → Prop) (s : Screen)
    (h : FieldsRespect ok s.components) : FieldsRespect ok (Blueprint.clean s) := by
  apply fields_map ok _ _ (fields_filter ok _ _ h)
  intro c hc
  apply field_route
  split <;> simpa [FieldRule] using hc

/-- Related-link deduplication changes only navigation controls. -/
theorem related_fields (ok : ElementId → Prop) (source : List Screen) (s : Screen)
    (cs : List Component) (h : FieldsRespect ok cs) :
    FieldsRespect ok (Blueprint.relatedLinks source s cs) := by
  unfold Blueprint.relatedLinks
  apply fields_filter
  apply fields_fold (ok := ok)
  · intro a c ha hc
    rcases a with ⟨targets, out⟩
    dsimp only
    split <;> (repeat' split) <;> dsimp only
    all_goals first
      | exact ha
      | apply fields_append ok _ _ ha
        intro d hd
        obtain rfl := List.mem_singleton.mp hd
        first | exact hc | simp_all [FieldRule]
  · exact h
  · simp [FieldsRespect]
end Ehr.Check
