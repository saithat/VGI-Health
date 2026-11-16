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

/-- New specification for owner review: Lean alone binds plot paths and points.
The full box retains its declared opaque background and ink, checked by G6. -/
def widgetBoxes (screen : UiScreen) (ps : List Placed) : List Placed :=
  let entries := screenNodes screen
  ps.map fun p =>
    match p.info.source.bind (fun path => entries.lookup path) |>.bind (·.plot) with
    | none => p
    | some plot => {p with info := {p.info with mark := .plot (plot.paths.map fun path => path.map (widgetPoint p.rect)) (plot.dots.map (widgetPoint p.rect)) 128}}

/-- New specification for owner review: rich binding never changes a rectangle. -/
theorem widgetBoxes_rects (screen : UiScreen) (ps : List Placed) :
    (widgetBoxes screen ps).map (·.rect) = ps.map (·.rect) := by
  simp only [widgetBoxes, List.map_map]
  congr 1
  funext p
  dsimp only [Function.comp_def]
  split <;> rfl

#print axioms widgetBoxes_rects
end Ehr.Layout
