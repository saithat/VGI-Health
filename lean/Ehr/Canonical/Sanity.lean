import Ehr.Canonical.Patch
import Ehr.Specs.V1
import Ehr.Core.Basics
namespace Ehr.Canonical
/-- All components in screen order. -/
def components (p : Program) : List Component := p.screens.flatMap (·.components)
/-- Navigation edges, including explicit macro gotos. -/
def edges (p : Program) (s : ScreenId) : List ScreenId :=
  match p.screen? s with
  | none => []
  | some sc => sc.components.flatMap fun c =>
    match c.kind with
    | .button (.goto t) => [t]
    | .«macro» m => (p.macro? m).toList.flatMap fun m => m.steps.flatMap fun st =>
        match st with | .goto t => [t] | _ => []
    | _ => []
/-- Breadth-first search, bounded by the number of screens. -/
def reachable (p : Program) (start : ScreenId) : List ScreenId :=
  (List.range p.screens.length).foldl (fun seen _ =>
    (seen ++ seen.flatMap (edges p)).eraseDups) [start]
/-- References must name objects declared by the spec and program. -/
def referencesValid (sp : Spec) (p : Program) : Bool :=
  p.screens.all fun s => s.components.all fun c =>
    (c.parent?.all fun id => s.components.any fun par => par.id == id &&
      match par.kind with | .group .. | .tabs => true | _ => false) &&
    match c.kind with
    | .field e _ _ => (sp.element? e).isSome
    | .panel i | .table i | .trend i | .priorAuth i => (sp.info? i).isSome
    | .alert a _ => (sp.alert? a).isSome
    | .button (.commit k) => (sp.commit? k).isSome
    | .button (.markReviewed i) => (sp.info? i).isSome
    | .button (.goto t) => (p.screen? t).isSome
    | .«macro» m => (p.macro? m).isSome
    | _ => true
/-- Macro gotos, clicks and field writes have existing targets. -/
def macroTargetsValid (p : Program) : Bool :=
  p.macros.all fun m => m.steps.all fun st =>
    match st with
    | .goto s => (p.screen? s).isSome
    | .click c => (components p).any (·.id == c)
    | .setValue c _ => (components p).any fun x => x.id == c &&
        match x.kind with | .field .. => true | _ => false
/-- Every spec commit has a button. -/
def commitsPresent (sp : Spec) (p : Program) : Bool :=
  sp.commits.all fun k => (components p).any fun c =>
    match c.kind with | .button (.commit id) => id == k.id | _ => false
/-- A record prefill names exactly the source declared by its element. -/
def recordSourcesValid (sp : Spec) (p : Program) : Bool := (components p).all fun c =>
  match c.kind with
  | .field e _ (.fromRecord source) => (sp.element? e).any fun el =>
      el.prefill != .never && !el.humanOnly && el.recordFact? == some source
  | _ => true

#guard Specs.V1.allDistinct (components canonicalV1 |>.map (·.id))
#guard Specs.V1.allDistinct (canonicalV1.screens.map (·.id))
#guard Specs.V1.allDistinct (canonicalV1.macros.map (·.id))
#guard referencesValid Specs.V1.specV1 canonicalV1
#guard macroTargetsValid canonicalV1
#guard commitsPresent Specs.V1.specV1 canonicalV1
#guard canonicalV1.inCatalog Specs.V1.specV1
#guard canonicalV1.screens.all fun s => (reachable canonicalV1 "home").contains s.id
#guard canonicalV1.screens.all fun s => (reachable canonicalV1 s.id).contains "home"
#guard recordSourcesValid Specs.V1.specV1 canonicalV1
-- Every workflow target carries its passive rule inline, outside tabs/groups.
#guard Specs.V1.specV1.alerts.all fun a => a.tier != .passive ||
  canonicalV1.screens.all fun s => !a.screens.contains s.workflow ||
    s.components.any fun c => c.kind == .alert a.id false && c.parent? == none
end Ehr.Canonical
