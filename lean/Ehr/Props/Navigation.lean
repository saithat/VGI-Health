import Ehr.Render.NavRules

namespace Ehr.Props
open Ehr

/-- D5 checks the actual semantic renderer's navigation tree: unique group and
within-group labels, at most twelve groups/entries, and every program screen
represented. This observes `uiNav`; it does not invent a second navigation model. -/
def NavigationSane (p : Program) : Prop := Render.NavSane default p

/-- The renderer ignores the spec parameter: both names check the same tree. -/
theorem navigationSane_iff (sp : Spec) (p : Program) :
    NavigationSane p ↔ Render.NavSane sp p := Iff.rfl

instance (p : Program) : Decidable (NavigationSane p) := by
  unfold NavigationSane
  infer_instance
end Ehr.Props
