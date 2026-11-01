import Ehr.Canonical.Releases
import Ehr.Core.Navigation
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

/-- Clinic presets place the existing encounter opener in the selected schedule
row. In Basket remains a separate activity; no destination or event is added. -/
def clinicLandingLayout (owner : String) (screen : Screen) : Screen :=
  if screen.id != "home" then screen else
  if !["P1", "P4"].contains owner then
    let info := if owner == "P2" then "edTrackBoard" else if owner == "P3" then "shiftWorklist" else "orSchedule"
    let kind := if owner == "P5" then "orSchedule" else "trackBoard"
    { screen with components := screen.components.map fun c =>
        if c.id == "home.schedule" then { c with kind := .table info, label := if owner == "P3" then "My Patients" else screen.title, tag := "layout.overview.present." ++ kind } else c }
  else
  match screen.components.find? (·.id == "home.work") with
  | none => screen
  | some work =>
    let work := { work with label := "Scheduled visits", tag := "layout.overview.present.schedule" }
    let activities : Component :=
      { id := "home.activityTabs", kind := .group false false, label := "Activities", tag := "activities" }
    let rest := screen.components.filter (·.id != "home.work")
    { screen with components := rest.flatMap fun c =>
        if c.kind == .banner then [{ c with tag := "layout.clinicalActivity" }]
        else if c.id == "home.schedule" then
          [activities, work, { c with label := "Appointments", parent? := some "home.work" }]
        else match c.kind with
        | .button (.goto target) =>
          if !c.id.startsWith "home.work." then [c]
          else if ["w1Rooming", "w5Rooming"].contains target then
            [{ c with tag := "present.row|home.schedule|0" }]
          else [{ c with parent? := some "home.activityTabs" }]
        | _ => [c] }

/-- Apply the pre-set view before permissions, removing links to absent screens. -/
def presetProgram (owner : String) (p : Program) : Program :=
  if !["P1", "P2", "P3", "P4", "P5"].contains owner then p else
  let screens := (p.screens.filter (presetScreen owner)).map fun sc =>
    if owner == "P5" then W6.workspaceView (W6.clinicView sc) else sc
  let host := if screens.any (fun s => s.workflow == "W6") then none else
    (screens.find? (fun s => s.components.any (fun c => c.kind == .button (.commit "signOrders")))).map (·.id)
  let screens := screens.map fun s => if host != some s.id then s else
    let fields := ["consentVerified", "hpUpdate", "medsToHold"].filterMap fun e =>
      (p.screens.flatMap (·.components)).findSome? fun c => match c.kind with
        | .field id _ _ => if id == e then some { c with id := s.id ++ ".preop." ++ e, parent? := none, copyOf? := none, visibility := .encounter "preop" } else none
        | _ => none
    { s with components := fields ++ s.components }
  let available := screens.map (·.id)
  { p with screens := screens.map fun s =>
      clinicLandingLayout owner { s with
               title := if s.id == "home" then ((presetLandings owner).head?).map (·.2) |>.getD s.title
                        else (navigatorNames s).2
               components := s.components.filterMap fun c =>
                 match c.kind with
                 | .button (.goto target) =>
                   if !available.contains target then none else
                   if s.id == "home" && c.id.startsWith "home.work." then
                     ((presetLandings owner).find? (·.1 == target)).map (fun landing =>
                       { c with label := presetLandingControlLabel owner target landing.2 })
                   else some c
                 | .group _ _ => some (if c.id == "home.work" then { c with label := "Activities" } else c)
                 | _ => some c } }

/-- Produce a role-safe canonical, dropping macros that target removed fields
or buttons and dropping their macro buttons. No clinical rule is changed. -/
def forPersona (sp : Spec) (p : Program) (owner : String) (role : Role) : Program :=
  let p := presetProgram owner p
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
  (components p).all (roleComponentAllowed sp p.role) && p.screens.all (presetScreen p.owner)

#guard personaRoles.all fun (id, role) => roleProjectionValid Specs.V1.specV1
  (forPersona Specs.V1.specV1 canonicalV1 id role)
#guard personaRoles.all fun (id, role) => roleProjectionValid Specs.V2.specV2
  (forPersona Specs.V2.specV2 canonicalV2 id role)
#guard personaRoles.all fun (id, role) => roleProjectionValid Specs.V3.specV3
  (forPersona Specs.V3.specV3 canonicalV3 id role)
end Ehr.Canonical
