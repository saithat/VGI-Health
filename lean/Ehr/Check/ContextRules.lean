import Ehr.Check.Rules
import Ehr.Props.Context

/-! R4 executable check. New specification. Routes stay visible; providers may be revealed through groups and tabs.
Only layout state changes: receipt-conditional or encounter-conditional info fails. -/
namespace Ehr.Check
open Ehr Ehr.Props

/-- Only goto buttons that stay visible in every layout state. -/
def contextEdges (p : Program) (a : ScreenId) : List Hop :=
  (p.compsOf a).filterMap fun c => match gotoOf? c.kind with
    | some z => if fixedShown (p.compsOf a) c && (p.screen? z).isSome then some (c.id, z) else none
    | none => none

/-- Rechecked bounded paths, starting at the commit screen rather than home. -/
def contextDestinations (sp : Spec) (p : Program) (a : ScreenId) : List ScreenId :=
  ((bfs p (contextEdges p) a).filter fun zh =>
    isGotoPath p a zh.2 zh.1 && decide (zh.2.length ≤ sp.design.maxDepth)).map (·.1)

/-- Tab selections needed by one provider's ancestor chain. Cycles exhaust fuel. -/
def contextTabs (comps : List Component) : Nat → Component → List (CompId × Nat)
  | 0, _ => []
  | n + 1, c => match c.parent?.bind (fun id => comps.find? (·.id == id)) with
    | none => []
    | some par => (if par.kind == .tabs then [(par.id, c.tab)] else []) ++ contextTabs comps n par

/-- A proposed layout reveal: open groups and select this provider's ancestor tabs. -/
def contextLayout (comps : List Component) (c : Component) : State :=
  { (default : State) with expanded := comps.map (·.id), tabSel := contextTabs comps (comps.length + 1) c }

/-- Fact-independent visibility in a specified layout. Reject conditional
visibility at every level, tiny controls, non-containers and parent cycles. -/
def contextShownAux (comps : List Component) (layout : State) : Nat → Component → Bool
  | 0, _ => false
  | n + 1, c => c.size != .tiny && c.visibility == .always &&
    match c.parent? with
    | none => true
    | some id => match comps.find? (·.id == id) with
      | none => false
      | some par => parentOpen layout par c && contextShownAux comps layout n par

/-- The destination's actual looked-up screen has a provider that can be
shown by changing only group expansion and tab selection. -/
def contextProvider (p : Program) (z : ScreenId) (i : InfoId) : Bool :=
  (p.screen? z).any fun scr =>
    scr.components.any fun c => showsInfo i c.kind &&
      contextShownAux scr.components (contextLayout scr.components c) (scr.components.length + 1) c

def contextAvailable (sp : Spec) (p : Program) (a : ScreenId) (i : InfoId) : Bool :=
  (sp.info? i).isSome && (contextDestinations sp p a).any (contextProvider p · i)

/-- Every commit screen retains every item in its workflow context set. -/
def contextRetained (sp : Spec) (p : Program) : Bool :=
  p.screens.all fun scr => scr.components.all fun c =>
    (commitOf? c.kind).isNone ||
      (decide (ContextWorkflowDeclared sp scr.workflow) &&
        (Specs.DesignPolicies.contextFor sp scr.workflow).all (contextAvailable sp p scr.id))

end Ehr.Check
