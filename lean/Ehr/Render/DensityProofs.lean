import Ehr.Sem.Screen

namespace Ehr.Render

/-- Change only normal/compact sizes. Tiny components retain their visibility. -/
def withDensity (compact : CompId → Bool) (c : Component) : Component :=
  { c with size := if c.size == .tiny then .tiny else if compact c.id then .compact else .normal }

@[simp] theorem withDensity_id (f) (c : Component) : (withDensity f c).id = c.id := rfl

@[simp] theorem density_ownVisible (f) (sp facts s) (c : Component) :
    ownVisible sp facts s (withDensity f c) = ownVisible sp facts s c := by
  cases h : c.size <;> simp [ownVisible, withDensity, h] <;> split <;> rfl

@[simp] theorem density_parentOpen (f) (s) (p c : Component) :
    parentOpen s (withDensity f p) (withDensity f c) = parentOpen s p c := rfl

/-- Parent traversal is unchanged, including malformed parent cycles. -/
theorem density_layoutShownAux (f) (sp facts s) (cs : List Component) (fuel : Nat)
    (c : Component) :
    layoutShownAux sp facts s (cs.map (withDensity f)) fuel (withDensity f c) =
      layoutShownAux sp facts s cs fuel c := by
  induction fuel generalizing c with
  | zero => rfl
  | succ fuel ih =>
    simp only [layoutShownAux, density_ownVisible]
    simp only [withDensity]
    simp only [List.find?_map]
    cases h : c.parent? with
    | none => rfl
    | some pid =>
      simp only
      change (ownVisible sp facts s c && match
        ((cs.find? (fun p => p.id == pid)).map (withDensity f)) with
        | none => false
        | some p => parentOpen s p (withDensity f c) &&
            layoutShownAux sp facts s (cs.map (withDensity f)) fuel p) = _
      cases hp : cs.find? (fun p => p.id == pid) with
      | none => rfl
      | some p => simpa only [Option.map, density_parentOpen] using
          congrArg (fun b => ownVisible sp facts s c && (parentOpen s p c && b)) (ih p)

/-- The shown-item decision ignores density; alert firing is unchanged too. -/
theorem density_compShown (f) (sp facts s) (cs : List Component) (c : Component) :
    compShown sp facts s (cs.map (withDensity f)) (withDensity f c) =
      compShown sp facts s cs c := by
  simp only [compShown, layoutShown, List.length_map, density_layoutShownAux]
  rfl

/-- The complete ordered shown-ID list is identical for every density assignment. -/
theorem density_shown_ids (f) (sp facts s) (cs : List Component) :
    (((cs.map (withDensity f)).map (itemView sp facts s (cs.map (withDensity f)))).filter
      (·.shown)).map (·.comp.id) =
    ((cs.map (itemView sp facts s cs)).filter (·.shown)).map (·.comp.id) := by
  have go (xs : List Component) :
      (((xs.map (withDensity f)).map (itemView sp facts s (cs.map (withDensity f)))).filter
        (·.shown)).map (·.comp.id) =
      ((xs.map (itemView sp facts s cs)).filter (·.shown)).map (·.comp.id) := by
    induction xs with
    | nil => rfl
    | cons c xs ih =>
      simp only [List.map_cons, List.filter_cons]
      have shown : (itemView sp facts s (cs.map (withDensity f)) (withDensity f c)).shown =
          (itemView sp facts s cs c).shown := density_compShown f sp facts s cs c
      rw [shown]
      split
      · simpa only [List.map_cons, itemView, withDensity] using congrArg (List.cons c.id) ih
      · exact ih
  exact go cs

/-- Density changes across a whole program; no other component field changes. -/
def programWithDensity (f : CompId → Bool) (p : Program) : Program :=
  { p with screens := p.screens.map fun sc =>
      { sc with components := sc.components.map (withDensity f) } }

theorem density_compsOf (f) (p : Program) (screen : ScreenId) :
    (programWithDensity f p).compsOf screen = (p.compsOf screen).map (withDensity f) := by
  simp only [Program.compsOf, Program.screen?, programWithDensity, List.find?_map]
  simp only [Function.comp_def]
  cases h : p.screens.find? (fun sc => sc.id == screen) <;> rfl

/-- The actual interpreter view has exactly the same ordered shown component IDs. -/
theorem density_view_shown_ids (f) (sp) (p : Program) (facts user state) :
    (((view sp (programWithDensity f p) facts user state).items.filter (·.shown)).map
      (·.comp.id)) =
    (((view sp p facts user state).items.filter (·.shown)).map (·.comp.id)) := by
  simp only [view, density_compsOf]
  exact density_shown_ids f sp facts state (p.compsOf state.screen)

/-- Presentation metadata alone never changes abstract screen meaning. -/
theorem density_metadata_meaning (screen : UiScreen) (ids : Option (List CompId)) :
    Ehr.Sem.meaning { screen with compact? := ids } = Ehr.Sem.meaning screen := rfl

/-- Exact membership contract for the exported side table. -/
theorem uiCompact_mem (cx : Ctx) (id : CompId) :
    id ∈ uiCompact cx ↔ ∃ it ∈ cx.v.items,
      it.shown = true ∧ it.comp.size = .compact ∧ it.comp.id = id := by
  simp [uiCompact, List.mem_map, List.mem_filter, Bool.and_eq_true, beq_iff_eq,
    and_assoc]

#print axioms withDensity_id
#print axioms density_parentOpen
#print axioms density_ownVisible
#print axioms density_layoutShownAux
#print axioms density_compShown
#print axioms density_shown_ids
#print axioms density_compsOf
#print axioms density_view_shown_ids
#print axioms density_metadata_meaning
#print axioms uiCompact_mem
end Ehr.Render
