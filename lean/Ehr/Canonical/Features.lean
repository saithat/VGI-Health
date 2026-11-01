import Ehr.Canonical.Rules
import Ehr.Canonical.FeaturePlacements

/-! Canonical support for the five feature families. External timing, clinical
facts and payloads remain trusted record inputs. Entry fields never manufacture
that evidence. Required reviews/payloads stay before the human commit control. -/
namespace Ehr.Canonical.Features
open Ehr.Specs.V1

/-- Existing commit controls determine the clinical obligations for this screen. -/
def screenCommits (s : Screen) : List CommitId := s.components.filterMap fun c =>
  match c.kind with | .button (.commit k) => some k | _ => none

/-- Dedicated related artifacts keep the ordinary shell and navigation. -/
def artifactScreen (id workflow commit : String) : Screen :=
  Rules.withPrescriptionFields {
    id, workflow
    title := ((specV1.commit? commit).map (·.label)).getD commit
    components := shell id [] hospitalSidebar [] ++
      (if issuanceCommits.contains commit then lineFields id "" .current ++ controlledFields id else []) ++
      [commitBtn id commit ((specV1.commit? commit).map (·.label) |>.getD commit)] }

/-- Add each required field once, in open artifact sections. Existing inputs and
prefills retain their policies; new mandated defaults come from the spec. -/
def withFields (s : Screen) : List Component :=
  let commits := screenCommits s
  let wanted := (specV1.entries.filter (fun r => commits.contains r.commit)).map (·.element) |>.eraseDups
  let absent := wanted.filter fun e => !Rules.hasField s e &&
    -- Existing prescribing paths capture ordinary/per-line entries on composers.
    !(specV1.entries.any fun r => r.element == e && r.perOrderLine) &&
    ((Specs.Rules.Features.elements.any (·.id == e)) || artifacts.any (·.1 == s.id))
  let dependencies : List ElementId := ["dispenseQuantity", "dispenseDose", "dispenseFrequency", "liquidFormulation", "weight"]
  let absent := absent.filter dependencies.contains ++ absent.filter (fun e => !dependencies.contains e)
  if absent.isEmpty then [] else
    group s.id "featureDocumentation" "Clinical decision and documentation" (collapsible := false) ::
    absent.map fun e =>
      let el := specV1.element? e
      field s.id ("feature." ++ e) e (el.map (·.label) |>.getD e)
        (parent := some "featureDocumentation")
        (prefill := (el.bind (·.defaultValue?)).map Prefill.default |>.getD .none)

/-- All new commit reviews and structured contracts are visible and pinned.
Phase panels follow the clinical workflow; the photo remains in every care shell.
Missing phase context activates all contracts and fails closed where inappropriate. -/
def withPanels (s : Screen) : List Component :=
  let commits := screenCommits s
  let reviews := (specV1.reviews.filter fun r => commits.contains r.commit).map (·.info)
  let displays := (specV1.displays?.getD []).filterMap fun d => match d.scope with
    | .commit k => if commits.contains k then some d.info else none
    | .phase workflow name =>
      if name == "care" || workflow == s.workflow || (workflow == "shell" && s.id == "home")
      then some d.info else none
  (reviews ++ displays).eraseDups.filterMap fun i =>
    let pinned := displays.contains i
    let present := s.components.any fun c =>
      showsInfo i c.kind && (!pinned || (c.parent?.isNone && c.visibility == .always))
    if present then none else some (panel s.id ("feature." ++ i) i
      ((specV1.info? i).map (·.label) |>.getD i))

/-- Append related artifact links by service, preserving existing routes. -/
def augment (s : Screen) : Screen :=
  let fields := withFields s ++ (if s.id == "home" then
    [field s.id "feature.patientSelected" "patientSelected" "Select this patient"] else [])
  let panels := withPanels s
  let buttons := s.components.map fun c => match c.kind with
    | .button (.commit k) => match (specV1.commit? k).bind (·.actionLabel?) with
      | some label => { c with label }
      | none => c
    | _ => c
  let before := buttons.takeWhile fun c => match c.kind with | .button (.commit _) => false | _ => true
  let after := buttons.drop before.length
  let alerts := (specV1.alerts.filter fun a => (screenCommits s).contains a.commit &&
    Specs.Rules.Features.alerts.any (·.id == a.id)).map fun a =>
      alertC s.id ("feature.alert." ++ a.id) a.id a.label false
  let links := (routes.filter fun (workflow, _) => workflow == s.workflow).filterMap fun (_, id) =>
    let k := id.drop 8 |>.toString
    if id == s.id then none else some (goto s.id ("featureNav." ++ k) id
      ((specV1.commit? k).map (·.label) |>.getD k) (parent := some "featureNavigation"))
  { s with components := before ++ fields ++ panels ++ alerts ++ after ++
      (if links.isEmpty then [] else group s.id "featureNavigation" "Related care and compliance" (collapsible := false) :: links) }

/-- Preserve every original screen; new artifacts remain reachable by workflow. -/
def screens (base : List Screen) : List Screen :=
  (base ++ artifacts.map fun (id, workflow, commit) => artifactScreen id workflow commit).map augment
end Ehr.Canonical.Features
