import Ehr.Render.Ui

namespace Ehr.Props
open Ehr

/-- D5 checks the actual semantic renderer's navigation tree: unique group and
within-group labels, at most twelve groups/entries, and every program screen
represented. This observes `uiNav`; it does not invent a second navigation model. -/
def NavigationSane (p : Program) : Prop :=
  let nav := Render.uiNav p
  (nav.map (·.1)).Nodup ∧ nav.length ≤ 12 ∧
  (∀ g ∈ nav, (g.2.map (·.2)).Nodup ∧ g.2.length ≤ 12) ∧
  (∀ sc ∈ p.screens, ∃ g ∈ nav, ∃ e ∈ g.2, e.1 = sc.id)

instance (p : Program) : Decidable (NavigationSane p) := by
  unfold NavigationSane
  infer_instance
end Ehr.Props
