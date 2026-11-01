import Ehr.Render.Ui

namespace Ehr.Render

mutual
/-- Walk a semantic tree, retaining each container's identity with an empty
body. Leaf nodes are unchanged. This observes presence, never browser styling. -/
def uiAtoms : UiNode → List UiNode
  | .section id title kids => .section id title [] :: uiAtomsList kids
  | .columns kids => .columns [] :: uiAtomsList kids
  | .tabs id labels selected body => .tabs id labels selected [] :: uiAtomsList body
  | n => [n]
termination_by n => sizeOf n

def uiAtomsList : List UiNode → List UiNode
  | [] => []
  | n :: ns => uiAtoms n ++ uiAtomsList ns
termination_by ns => sizeOf ns
end

/-- Presence of a semantic leaf or container in the actual workspace. -/
def UiPresent (screen : UiScreen) (node : UiNode) : Prop :=
  node ∈ uiAtomsList screen.workspace

/-- Identity of component-bearing semantic nodes. Sidebar and safety supplement
info nodes use the empty id and cannot dispatch component events. -/
def uiComp : UiNode → Option CompId
  | .section id _ _ | .tabs id _ _ _ => some id
  | .field id _ _ _ _ _ _ _ _ | .info id _ _ _ _ | .alert id _ _ _
  | .button id _ _ _ _ _ => some id
  | _ => none

/-- Semantic action safety includes every button, including toggle and confirm. -/
def UiActionHonest (cx : Ctx) (node : UiNode) : Prop :=
  match node with
  | .button id label role enabled reason _ =>
    label ≠ "" ∧
    (enabled = false → ∃ why, reason = some why ∧ why ≠ "") ∧
    (role = "primary" →
      (∃ it ∈ cx.v.items, it.shown = true ∧ it.comp.id = id ∧
        ∃ cm, it.comp.kind = .button (.commit cm)) ∧ enabled = uiEnabled cx id)
  | _ => True

end Ehr.Render
