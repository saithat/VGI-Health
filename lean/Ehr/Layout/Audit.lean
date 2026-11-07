import Ehr.Layout.Family
import Ehr.Render.Cli
namespace Ehr.Layout
open Lean Ehr Ehr.Render
/-- Read-only targeted W1 audit. Each path is parsed as a Program; no snapshots
or certificates are rewritten. Variants are native probes, not state coverage. -/
def auditProgram (path specPath : String) (facts : Facts) (display : Display) : IO Json := do
  let p ← Render.Cli.readJson Program path
  let sp ← Render.Cli.readJson Spec specPath
  let user : User := { id := p.owner, role := p.role }
  let screens := p.screens.filter (fun s => s.id == "w1Sign")
  let mut checks : List Json := []
  let mut sample : Option UiScreen := none
  let mut shapes : List ScreenShape := []
  for sc in screens do
    for (variant,state) in Render.Cli.variants sp p facts user sc do
      let selected := { state with patientContext? := some {
        patient? := facts.sourcePatientId?, bound? := facts.sourcePatientId?,
        activity := Workspace.primary p, target? := some state.screen } }
      let screen := runRenderUi ⟨sp,p,facts,display,user,selected⟩
      if sample.isNone then sample := some screen
      if !shapes.contains (screenShape screen) then shapes := screenShape screen :: shapes
      for v in viewports do
        let (node,data,e) := portScreen v screen
        let ps := boxes v node
        let errors := contentErrors data ps
        checks := checks ++ [Json.mkObj [("variant",toJson variant),("viewport",toJson v),
          ("accepted",toJson (check e v ps && errors.isEmpty)),
          ("findings",toJson (findings e v ps ++ errors)), ("sources",toJson e.length),
          ("hasCurrentCommit",toJson (ps.any (·.info.commit))),
          ("g9Exempt",toJson (v == ⟨92160,57600⟩ && !(ps.any (·.info.commit)))),
          ("g9Passed",toJson (decide (G9 v ps)))]]
  let family : Family := shapes.map fun shape => ⟨shape,fun v => compileShape v shape⟩
  return Json.mkObj [("path",toJson path),("sample",toJson sample),("checks",toJson checks),
    ("familyCases",toJson shapes.length),("familyAccepted",toJson (acceptFamily family))]
end Ehr.Layout

def main (args : List String) : IO Unit := do
  let paths ← Ehr.Render.Cli.readJson (List (String × String)) (args.headD "")
  let bundle ← Ehr.Render.Cli.readJson Lean.Json (args[1]?.getD "")
  let (facts,display) ← IO.ofExcept (Ehr.Render.Fhir.parseBundle { today := "2026-10-31" } bundle)
  for (path,spec) in paths do
    IO.println ((← Ehr.Layout.auditProgram path spec facts display).compress)
