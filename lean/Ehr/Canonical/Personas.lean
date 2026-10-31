import Ehr.Canonical.Releases
namespace Ehr.Canonical

/-- Keep field and commit declarations within the intended clinician's role.
The all-workflows canonical is a source template; deployment uses these role
projections. Navigation and information remain available for chart review. -/
def roleComponentAllowed (sp : Spec) (role : Role) (c : Component) : Bool :=
  match c.kind with
  | .field e _ _ => (sp.element? e).any fun el => el.enteredBy.contains role
  | .button (.commit k) => (sp.commit? k).any fun cs => cs.roles.contains role
  | .button .requestPriorAuth => (sp.element? "priorAuthRequest").any fun el => el.enteredBy.contains role
  | _ => true

/-- Produce a role-safe canonical, dropping macros that target removed fields
or buttons and dropping their macro buttons. No clinical rule is changed. -/
def forPersona (sp : Spec) (p : Program) (owner : String) (role : Role) : Program :=
  let screens := p.screens.map fun s =>
    { s with components := s.components.filter (roleComponentAllowed sp role) }
  let kept := screens.flatMap (·.components)
  let macros := p.macros.filter fun m => m.steps.all fun st => match st with
    | .goto id => screens.any (·.id == id)
    | .setValue id _ | .click id => kept.any (·.id == id)
  { p with id := p.id ++ "-" ++ owner, owner, role, macros
           screens := screens.map fun s =>
             { s with components := s.components.filter fun c => match c.kind with
                 | .«macro» id => macros.any (·.id == id) | _ => true } }

/-- The five BRIEF personas and their authorized role. -/
def personaRoles : List (String × Role) :=
  [("P1", .physician), ("P2", .physician), ("P3", .rn), ("P4", .np), ("P5", .surgeon)]

/-- Each role projection has valid references and macros, and no declaration
outside that role's permissions. These are executable regression checks, not
a substitute for checker certification. -/
def roleProjectionValid (sp : Spec) (p : Program) : Bool :=
  referencesValid sp p && macroTargetsValid p && recordSourcesValid sp p &&
  (components p).all (roleComponentAllowed sp p.role)

#guard personaRoles.all fun (id, role) => roleProjectionValid Specs.V1.specV1
  (forPersona Specs.V1.specV1 canonicalV1 id role)
#guard personaRoles.all fun (id, role) => roleProjectionValid Specs.V1_1.specV1_1
  (forPersona Specs.V1_1.specV1_1 canonicalV1_1 id role)
#guard personaRoles.all fun (id, role) => roleProjectionValid Specs.V2.specV2
  (forPersona Specs.V2.specV2 canonicalV2 id role)
end Ehr.Canonical
