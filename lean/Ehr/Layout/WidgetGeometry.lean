import Ehr.Layout.Density

/-! New specification for owner review: rich marks bind to an already reserved
semantic box. Both the family geometry and the bound marks pass unchanged
G1–G11. No clinical rule or existing theorem statement changes. -/
namespace Ehr.Layout
open Lean Ehr.Render

/-- New specification for owner review: scale normalized points into the
reserved box using integer arithmetic. SVG has precisely this view box. -/
def widgetPoint (r : Rect) (p : Point) : Point :=
  ⟨p.x * r.w / 10000,p.y * r.h / 10000⟩

/-- New specification for owner review: a leading square inside the alert.
For the shell and dense boxes its side is the box height. The minimum also
keeps the square inside an arbitrarily narrow untrusted box. -/
def alertSquare (r : Rect) : Rect :=
  { r with w := min r.w r.h, h := min r.w r.h }

/-- New specification for owner review: the icon square stays in its alert. -/
theorem alertSquare_inside (r : Rect) : Contains r (alertSquare r) := by
  simp only [Contains,alertSquare,Rect.right,Rect.bottom]
  omega

/-- New specification for owner review: wide alerts use their full height. -/
theorem alertSquare_side (r : Rect) (wide : r.h ≤ r.w) :
    (alertSquare r).w = r.h ∧ (alertSquare r).h = r.h := by
  simp [alertSquare, Nat.min_eq_right wide]

/-- New specification for owner review: Lean binds alert marks to their square
and reserves its width in the text slot. Other plots use the full box. The
opaque background and ink still pass G6, and inset text still passes G4. -/
def widgetBox (part : Part) (p : Placed) : Placed :=
  match part.plot with
  | none => p
  | some plot =>
    let r := if part.role == .alert then alertSquare p.rect else p.rect
    {p with info := {p.info with
      text := p.info.text.map fun t => if part.role == .alert then {t with inset := r.w} else t
      mark := .plot (plot.paths.map fun path => path.map (widgetPoint r)) (plot.dots.map (widgetPoint r)) 128}}

/-- New specification for owner review: rich binding never changes a rectangle. -/
theorem widgetBox_rect (part : Part) (p : Placed) : (widgetBox part p).rect = p.rect := by
  unfold widgetBox
  split <;> rfl

/-- New specification for owner review: bind marks within their own occurrence. -/
def widgetBoxes (screen : UiScreen) (ps : List Placed) : List Placed :=
  let entries := screenNodes screen
  ps.map fun p =>
    match p.info.source.bind (fun path => entries.lookup path) with
    | none => p
    | some part => widgetBox part p

/-- New specification for owner review: rich binding never changes a rectangle. -/
theorem widgetBoxes_rects (screen : UiScreen) (ps : List Placed) :
    (widgetBoxes screen ps).map (·.rect) = ps.map (·.rect) := by
  simp only [widgetBoxes, List.map_map]
  congr 1
  funext p
  dsimp only [Function.comp_def]
  split
  · rfl
  · exact widgetBox_rect _ _

#print axioms alertSquare_inside
#print axioms alertSquare_side
#print axioms widgetBox_rect
#print axioms widgetBoxes_rects
end Ehr.Layout
