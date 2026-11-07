import Ehr.Cli.Completion
import Ehr.Canonical.CoreWorkflowTests

/-! Targeted native-only matrix and scenario timing. Writes only to the
explicit scratch output; does not issue or replace certificates. -/
namespace Ehr.Tools.CompletionBench
open Ehr Ehr.Sim Ehr.Cli.Completion Lean

def choices (persona : String) : Workflow × TaskChoices :=
  match persona with
  | "P2" => (.W3, { orders := [{ drug := "acetaminophen", doseTenths := 10000, unit := .mg, route := "PO", freq := "q6h" }], disposition? := some "discharge" })
  | "P3" => (.W4, { administer := [{ drug := "insulin lispro", doseTenths := 20, unit := .units, route := "SC", freq := "once" }] })
  | "P4" => (.W5, { orders := [{ drug := "amoxicillin", doseTenths := 5000, unit := .mg, route := "PO", freq := "BID" }] })
  | "P5" => (.W6, { noteSections := ["opNote"] })
  | _ => (.W1, { orders := [{ drug := "lisinopril", doseTenths := 100, unit := .mg, route := "PO", freq := "daily" }] })

def scenarios (sp : Spec) (p : Program) (persona : String) : List Scenario :=
  let (wf, ch) := choices persona
  let facts := if persona == "P4" then Ehr.Canonical.CoreTests.child else Ehr.Canonical.CoreTests.adult
  let user : User := { id := "completion-bench", role := p.role }
  (episodes facts wf ch).zipIdx |>.map fun (ep, i) =>
    { id := s!"{persona}-{i}", facts := ep.facts, user,
      goals := deriveGoals sp ep.facts user wf ep.choices ep.orders ep.med?,
      space := "navigationDirected", bound := 2000 }

def programReport (root out : System.FilePath) (release persona : String) (reference : Bool) : IO Json := do
  let path := s!"releases/{release}/" ++ (if reference then "canonical.json" else s!"personas/{persona}.json")
  let sp ← Ehr.Cli.readJson Spec (root / s!"releases/{release}/spec.json").toString
  let p ← Ehr.Cli.readJson Program (root / path).toString
  let can ← Ehr.Cli.readJson Program (root / s!"releases/{release}/canonical.json").toString
  let prev ← if reference || release == "v1" then pure none else
    some <$> Ehr.Cli.readJson Program (root / s!"releases/{if release == "v2" then "v1" else "v2"}/personas/{persona}.json").toString
  let start ← IO.monoMsNow
  let staticVerdict := Ehr.Check.check sp prev can p
  let staticMs := (← IO.monoMsNow) - start
  let cases := scenarios sp p persona
  IO.FS.writeFile (out / s!"{release}-{if reference then "canonical" else persona}-scenarios.json") ((toJson cases).pretty ++ "\n")
  let mut results := []
  let mut accepted := true
  for scenario in cases do
    try
      let (ok, report) ← Ehr.Cli.Completion.run sp p scenario
      accepted := accepted && ok
      results := results ++ [report]
    catch e =>
      accepted := false
      results := results ++ [Json.mkObj [("id", toJson scenario.id), ("status", toJson "inputError"), ("error", toJson e.toString)]]
  IO.eprintln s!"{path}: static={if staticVerdict == .ok then "ok" else "refused"}, scenario={accepted}"
  return Json.mkObj [("program", toJson path), ("reference", toJson reference),
    ("staticVerdict", toJson staticVerdict), ("staticMs", toJson staticMs),
    ("scenarioAccepted", toJson accepted), ("scenarios", toJson results)]

def badReport (root : System.FilePath) (path property : String) (doseOnly := false) : IO Json := do
  let p ← Ehr.Cli.readJson Program (root / path).toString
  let specPath := if doseOnly then "lean/Ehr/Check/bad/dose-only-spec.json" else s!"releases/{p.specVersion}/spec.json"
  let canPath := if doseOnly then path else s!"releases/{p.specVersion}/canonical.json"
  let sp ← Ehr.Cli.readJson Spec (root / specPath).toString
  let can ← Ehr.Cli.readJson Program (root / canPath).toString
  let start ← IO.monoMsNow
  let verdict := Ehr.Check.check sp none can p
  let elapsed := (← IO.monoMsNow) - start
  let expected := match verdict with | .violation prop _ _ _ => prop == property | _ => false
  unless expected do throw (IO.userError s!"unexpected matrix verdict: {path}")
  return Json.mkObj [("program", toJson path), ("staticMs", toJson elapsed), ("verdict", toJson verdict), ("expectedProperty", toJson property)]

def main (args : List String) : IO UInt32 := do
  let [repo, output] := args | throw (IO.userError "usage: completion-bench REPO SCRATCH-OUT")
  let root : System.FilePath := repo
  let out : System.FilePath := output
  IO.FS.createDirAll out
  let mut programs := []
  for release in ["v1", "v2", "v3"] do
    programs := programs ++ [← programReport root out release "P1" true]
    for persona in ["P1", "P2", "P3", "P4", "P5"] do
      programs := programs ++ [← programReport root out release persona false]
  let profiles ← Ehr.Cli.readJson (List (String × String) × List String) (root / "lean/Ehr/Check/bad-program-profiles.json").toString
  let mut bad := []
  for (name, property) in profiles.1 do
    bad := bad ++ [← badReport root s!"programs/bad/{name}.json" property]
  bad := bad ++ [← badReport root "lean/Ehr/Check/bad/35-dose-without-drug.json" "completable" true]
  let extra ← Ehr.Cli.readJson (List (String × String)) (root / "lean/Ehr/Check/conformance-bad-programs.json").toString
  for (path, property) in extra do
    bad := bad ++ [← badReport root path property]
  IO.FS.writeFile (out / "report.json") ((Json.mkObj [
    ("scope", toJson "targeted native static matrix plus one navigationDirected task per persona/reference; no recertification"),
    ("property6Closed", toJson false), ("programs", toJson programs), ("bad", toJson bad)]).pretty ++ "\n")
  return 0
end Ehr.Tools.CompletionBench

def main := Ehr.Tools.CompletionBench.main
