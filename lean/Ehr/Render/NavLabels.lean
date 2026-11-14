import Ehr.Render.NavRules
import Ehr.Props.Basics
import Ehr.Specs.DesignPolicies

/-! R6 extends D5 with honest, bounded navigation labels. New specification. -/
namespace Ehr.Render
open Ehr Ehr.Props

/-- Whitespace-separated words containing a letter or digit. Standalone
punctuation (e.g. `/` or `&` in a title) is not a word. -/
def labelWords (label : String) : Nat :=
  (label.toList.foldl (fun (n, inWord) c =>
    if c.isWhitespace then (n, false)
    else if c.isAlphanum && !inWord then (n + 1, true)
    else (n, inWord)) (0, false)).1

/-- Exact title or an explicitly declared alias, within the spec word limit. -/
def NavLabelHonest (sp : Spec) (target : Screen) (label : String) : Prop :=
  (label = target.title ∨ ∃ a ∈ Specs.DesignPolicies.aliases sp,
    a.1 = target.title ∧ label ∈ a.2) ∧ labelWords label ≤ sp.design.maxLabelWords

instance (sp target label) : Decidable (NavLabelHonest sp target label) := by
  unfold NavLabelHonest; infer_instance

/-- Structural superset of links selected by `uiNavButton`: goto links in
navigation/workflow groups or tagged nav, even when currently hidden/disabled.
Hotkey metadata cannot exempt a navigation control from the rule. -/
def navLink (scr : Screen) (c : Component) : Bool :=
  (gotoOf? c.kind).isSome &&
    ((c.tag.toList.splitOn '.').contains "nav".toList || scr.components.any fun par =>
      c.parent? == some par.id && ((par.tag.toList == "nav".toList || ".nav".toList.isSuffixOf par.tag.toList) ||
        (par.tag.toList == "workflow".toList || ".workflow".toList.isSuffixOf par.tag.toList)) &&
      match par.kind with | .group false _ => true | _ => false)

/-- New specification R6/D5: check rendered overview/step names as well as
all links that can populate the interactive navigation bar. Action buttons
outside navigation (e.g. Next/Back) retain their action-specific labels. -/
def NavigationLabelsHonest (sp : Spec) (p : Program) : Prop :=
  (∀ scr ∈ p.screens, NavLabelHonest sp scr (uiLabel (workflowNames scr).2 "Untitled screen")) ∧
  (∀ scr ∈ p.screens, ∀ c ∈ scr.components, navLink scr c = true →
    ∀ z ∈ gotoOf? c.kind, ∃ target ∈ p.screen? z,
      NavLabelHonest sp target (uiLabel c.label "Action"))

instance (sp p) : Decidable (NavigationLabelsHonest sp p) := by
  unfold NavigationLabelsHonest; infer_instance
end Ehr.Render
