import Ehr.Props.Basics
import Ehr.Specs.DesignPolicies

/-! R4, context retained. New specification, outside Comparator. -/
namespace Ehr.Props
open Ehr

/-- A nonempty context policy declares each commit screen's workflow. -/
def ContextWorkflowDeclared (sp : Spec) (workflow : String) : Prop :=
  (Specs.DesignPolicies.contexts sp).isEmpty = true ∨
    ∃ row ∈ Specs.DesignPolicies.contexts sp, row.1 = workflow

instance (sp workflow) : Decidable (ContextWorkflowDeclared sp workflow) := by
  unfold ContextWorkflowDeclared; infer_instance

/-- New specification R4: on every screen containing a commit button, each
context info declared for its workflow exists in the spec and is shown there
or on a screen within `spec.design.maxDepth` goto bound, measured
from that commit screen. The destination shows the info after opening groups and selecting tabs.
This preserves access, not clinical completeness, reading or comprehension. -/
def ContextRetained (sp : Spec) (p : Program) : Prop :=
  ∀ scr ∈ p.screens, ∀ c ∈ scr.components, ∀ cm ∈ commitOf? c.kind,
    ContextWorkflowDeclared sp scr.workflow ∧
    ∀ i ∈ Specs.DesignPolicies.contextFor sp scr.workflow,
      (sp.info? i).isSome = true ∧
      ∃ z hops, GotoPath p scr.id hops z ∧ hops.length ≤ sp.design.maxDepth ∧
        ∀ (facts : Facts) (user : User) (s : State), s.screen = z → ∃ expanded tabs,
          InfoShown ⟨sp, p, facts, user⟩ { s with expanded := expanded, tabSel := tabs } i

end Ehr.Props
