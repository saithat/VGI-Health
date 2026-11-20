import Ehr.Check.ContextSound
import Ehr.Canonical.Personas
import Ehr.Core.Json
import Ehr.Examples.Tiny

/-! R4/R6 new specifications: boundary and anti-bypass regressions. -/
namespace Ehr.Check.ContextTests
open Ehr Ehr.Check Ehr.Props

def sp : Spec := { Examples.Tiny.spec with
  workflowContexts? := some [("W1", ["currentMeds"])] }
def commit : Component := { id := "sign", kind := .button (.commit "signOrders"), label := "Sign" }
def meds : Component := { id := "meds", kind := .panel "currentMeds" }
def link : Component := { id := "next", kind := .button (.goto "context"), label := "Context" }
def source : Screen := { id := "commit", title := "Commit", workflow := "W1", components := [commit, link] }
def destination : Screen := { id := "context", title := "Context", workflow := "chart", components := [meds] }
def remote : Program := { Examples.Tiny.program with start := "commit", screens := [source, destination], macros := [] }
def limit (n : Nat) : Spec := { sp with design := { sp.design with maxDepth := n } }
def replaceDestination (cs : List Component) : Program := { remote with screens := [source, { destination with components := cs }] }

#guard contextRetained (limit 1) remote
#guard !contextRetained (limit 0) remote
#guard contextRetained (limit 0) { remote with screens := [{ source with components := [commit, meds] }] }
#guard !contextRetained sp (replaceDestination [])
#guard !contextRetained sp { remote with screens := [{ source with workflow := "chart" }, destination] }
#guard !contextRetained sp (replaceDestination [{ meds with size := .tiny }])
#guard !contextRetained sp (replaceDestination [{ meds with visibility := .unlessReceipt "currentMeds" }])
#guard contextRetained sp (replaceDestination [
  { id := "closed", kind := .group true false }, { meds with parent? := some "closed" }])
#guard contextRetained sp (replaceDestination [
  { id := "tabs", kind := .tabs }, { meds with parent? := some "tabs", tab := 2 }])
#guard !contextRetained sp (replaceDestination [
  { id := "parent", kind := .button .back }, { meds with parent? := some "parent" }])
#guard !contextRetained sp (replaceDestination [
  { id := "closed", kind := .group true false, visibility := .unlessReceipt "currentMeds" },
  { meds with parent? := some "closed" }])
#guard !contextRetained sp { remote with screens := [
  { source with components := [commit, { link with size := .tiny }] }, destination] }
#guard !contextRetained sp { remote with screens := [
  { source with components := [commit, { link with visibility := .encounter "outpatient" }] }, destination] }
-- An off-start commit screen must independently retain context; the home route
-- to the provider cannot excuse a stranded commit screen.
#guard !contextRetained sp { remote with screens := remote.screens ++
  [{ id := "stranded", title := "Stranded", workflow := "W1", components := [commit] }] }
#guard !contextRetained { sp with infos := [] } remote
-- Duplicate workflow keys cannot hide a later requirement.
#guard !contextRetained { sp with workflowContexts? := some [("W1", []), ("W1", ["missing"])] } remote
-- Legacy frozen releases apply the exact sourced policy, not an empty set.
#guard Specs.DesignPolicies.contexts { sp with version := "v1", workflowContexts? := none } == Specs.DesignPolicies.workflowContexts
#guard Specs.DesignPolicies.aliases { sp with version := "v1", navigationAliases? := none } == Specs.DesignPolicies.navigationAliases
-- New specification: omitting the policy cannot silently disable R4 on a
-- future spec, even for a program without any commit buttons.
def missingContextSpec : Spec := { sp with version := "v4", workflowContexts? := none }
#guard !Specs.DesignPolicies.contextsDeclared missingContextSpec
#guard ["v1", "v2", "v3"].all fun v =>
  Specs.DesignPolicies.contextsDeclared { missingContextSpec with version := v } &&
    Specs.DesignPolicies.contexts { missingContextSpec with version := v } == Specs.DesignPolicies.workflowContexts
#guard (rules missingContextSpec none remote remote).any fun r =>
  r.property == "contextRetained" && !r.passes
def noCommits : Program := { remote with screens := [{ destination with components := [] }] }
#guard contextRetained missingContextSpec noCommits
#guard (rules missingContextSpec none noCommits noCommits).any fun r =>
  r.property == "contextRetained" && !r.passes &&
    (r.explain ()).any (fun f => (f.message.splitOn "workflowContexts").length > 1)
-- Explicitly empty is still an intentional policy. Missing aliases remain
-- strict: future specs accept exact titles and no undeclared synonyms.
#guard Specs.DesignPolicies.contextsDeclared { missingContextSpec with workflowContexts? := some [] }
#guard (rules { missingContextSpec with workflowContexts? := some [] } none noCommits noCommits).any fun r =>
  r.property == "contextRetained" && r.passes
#guard Specs.DesignPolicies.aliases { missingContextSpec with navigationAliases? := none } == []

open Ehr.Render
#guard labelWords "Exam / Assessment & Plan" == 3
#guard labelWords " one\ttwo\nthree four " == 4
#guard decide (NavLabelHonest sp destination "Context")
#guard !decide (NavLabelHonest sp destination "Orders")
#guard !decide (NavLabelHonest Specs.V1.specV1 { destination with title := "Rooming" } "Clinic Schedule")
#guard !decide (NavLabelHonest Specs.V1.specV1 { destination with title := "Rooming" } "Schedule")
def aliasSpec : Spec := { sp with navigationAliases? := some [("Context", ["Clinical context", "one two three four five"])] }
#guard decide (NavLabelHonest aliasSpec destination "Clinical context")
#guard !decide (NavLabelHonest aliasSpec { destination with title := "Other" } "Clinical context")
#guard !decide (NavLabelHonest aliasSpec destination "one two three four five")
#guard !decide (NavLabelHonest sp { destination with title := "one two three four five" } "one two three four five")
#guard decide (NavLabelHonest { aliasSpec with design := { sp.design with maxLabelWords := 5 } }
  destination "one two three four five")
#guard navLink source { link with tag := "workflow.nav.next" }
#guard !navLink source link
#guard navLink { source with components := [{ id := "nav", kind := .group false true, tag := "workflow" }] }
  { link with parent? := some "nav" }
#guard !decide (NavigationLabelsHonest sp { remote with screens := [
  { source with components := [{ link with tag := "nav", label := "Orders" }] }, destination] })
#guard decide (NavigationLabelsHonest sp { remote with screens := [
  { source with components := [{ link with tag := "nav" }] }, destination] })
-- A title/overview mismatch cannot hide behind a different screen ID.
#guard !decide (NavigationLabelsHonest sp { remote with screens := [
  { source with id := "w1Hpi", title := "Orders", components := [] }] })
#guard ((Lean.fromJson? (Lean.toJson { sp.design with maxLabelWords := 2 }) : Except String DesignRules).toOption.map (·.maxLabelWords)) == some 2
#guard (Lean.toJson sp.design).getObjVal? "maxLabelWords" |>.toOption |>.isNone
#guard (Lean.fromJson? ((Lean.toJson sp.design).setObjVal! "maxLabelWords" (.str "invalid")) : Except String DesignRules).isOk == false

-- Each release declares all seven workflow sets, using real info IDs.
#guard Specs.DesignPolicies.workflowContexts.length == 7
#guard Specs.DesignPolicies.workflowContexts.all fun (_, infos) =>
  infos.all fun i => (Specs.V1.specV1.info? i).isSome

-- P1/P4 schedule-row actions are outside navigation; P5's activity link is
-- checked by R6 and must use the target's title. All labels fit four words.
#guard [("P1", Role.physician, "w1Rooming"), ("P4", Role.np, "w5Rooming"),
  ("P5", Role.surgeon, "w1Rooming")].all fun (id, role, target) =>
    let p := Canonical.forPersona Specs.V1.specV1 Canonical.canonicalV1 id role
    (p.screen? "home").any fun home => home.components.any fun c =>
      c.kind == .button (.goto target) && labelWords c.label ≤ 4 &&
        if id == "P5" then navLink home c && c.label == "Rooming"
        else !navLink home c && c.label == "Open encounter"

-- New specification for owner review. Test the workflow route, each required
-- control and the optional-release boundary using the context graph above.
#guard Id.run do
  let service : Component := { id := "kind", kind := .field "orderKind" .current .none }
  let request : Component := { id := "request", kind := .button .requestPriorAuth }
  let input : Component := { id := "input", kind := .field priorAuthElement .current .none }
  let composer := { source with components := [service, link] }
  let layout := fun (origin : Screen) (workflow : String) (cs : List Component) =>
    { remote with screens := [origin, { destination with workflow, components := cs }] }
  let pass := fun cs => priorAuthAvailable Examples.Tiny.specV2 (layout composer "W1" cs) composer
  let inputScreen := { destination with id := "paperwork", workflow := "W1", components := [
    { id := "details", kind := .tabs }, { input with parent? := some "details", tab := 2 }] }
  let separate := layout composer "W1" [request, { link with kind := .button (.goto "paperwork") }]
  return priorAuthAvailable Examples.Tiny.specV2
      { separate with screens := separate.screens ++ [inputScreen] } composer &&
    pass [request, input] && !pass [request] && !pass [input] &&
    !pass [{ request with size := .tiny }, input] &&
    !pass [request, { input with kind := .field priorAuthElement (.fixed 1) .none }] &&
    !priorAuthAvailable Examples.Tiny.specV2 (layout composer "chart" [request, input]) composer &&
    !priorAuthAvailable Examples.Tiny.specV2
      (layout { composer with components := [service] } "W1" [request, input]) composer &&
    priorAuthAvailable Examples.Tiny.spec (layout composer "W1" []) composer

#guard priorAuthAvailable Examples.Tiny.specV2 remote source

end Ehr.Check.ContextTests
