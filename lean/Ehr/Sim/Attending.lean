import Ehr.Core.Guard

namespace Ehr.Sim
/-- Identify the cosign fields declared by encounter rules for this role and episode. -/
def attendingElement (sp : Spec) (facts : Facts) (user : User) (element : ElementId) : Bool :=
  sp.commits.any fun cs => cs.roles.contains user.role &&
    (cs.encounterRoles?.getD []).any fun rule =>
      encounterMatches facts.encounterKind? rule.encounter && !rule.roles.contains user.role &&
      rule.cosign? == some element && encounterRouteAvailable sp user.role rule

/-- A pending attending response remains a human event in the shared interpreter. -/
def attendingResponse (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (s : State) (event : Event) : Bool :=
  match event with
  | .enter id _ => (shownComp? sp prog facts s id).any fun comp => match comp.kind with
      | .field element _ _ => attendingElement sp facts user element
      | _ => false
  | _ => false
end Ehr.Sim
