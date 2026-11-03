import Ehr.Render.Types

namespace Ehr.Render

/-! The original clinical projection. Date-index payloads have a separate,
non-erasing observer in DateIndex; clinical child-preservation statements remain
unchanged. -/
mutual
/-- Walk a semantic tree, retaining each container's identity with an empty
body. Leaf nodes are unchanged. This observes presence, never browser styling. -/
def uiAtoms : UiNode → List UiNode
  | .board _ kids | .datedTimeline _ _ _ kids => uiAtomsList kids
  | .patientPane _ _ _ kids modal => uiAtomsList kids ++ uiAtomsList modal
  | .timeline _ kids => uiAtomsList kids
  | .presentation _ kids => uiAtomsList kids
  | .valueSet _ _ kids => uiAtomsList kids
  | .chartReferences _ kids => uiAtomsList kids
  | .rowAction _ _ kids => uiAtomsList kids
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


@[simp] theorem uiAtomsList_append (xs ys) :
    uiAtomsList (xs ++ ys) = uiAtomsList xs ++ uiAtomsList ys := by
  induction xs with
  | nil => simp [uiAtomsList]
  | cons x xs ih => simp [uiAtomsList, ih, List.append_assoc]

#print axioms uiAtomsList_append

end Ehr.Render
