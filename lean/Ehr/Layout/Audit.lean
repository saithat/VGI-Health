import Ehr.Layout.Range
import Ehr.Render.Cli
namespace Ehr.Layout
open Lean Ehr Ehr.Render
/-- Read-only targeted W1 audit. Each path is parsed as a Program; no snapshots
or certificates are rewritten. Variants are native probes, not state coverage. -/
def auditProgram (path specPath : String) (facts : Facts) (display : Display) (allScreens : Bool := false) : IO Json := do
  let p ← Render.Cli.readJson Program path
  let sp ← Render.Cli.readJson Spec specPath
  let user : User := { id := p.owner, role := p.role }
  let screens := p.screens.filter (fun s => allScreens || s.id == "w1Sign")
  let mut checks : List Json := []
  let mut classChecks : List Json := []
  let mut sample : Option UiScreen := none
  let mut shapes : List ScreenShape := []
  for sc in screens do
    -- Preserve the established W1 variant matrix. Other screens contribute
    -- initial/expanded class probes only; none are a renderer range proof.
    let initial := (goTo sp p facts (init sp p facts user) sc.id).1
    let groups := sc.components.filterMap fun c => match c.kind with
      | .group true _ => some c.id | _ => none
    let variants := if sc.id == "w1Sign" then Render.Cli.variants sp p facts user sc else
      [("initial",initial),("expanded",{ initial with expanded := (groups ++ initial.expanded).eraseDups })]
    for (variant,state) in variants do
      let selected := { state with patientContext? := some {
        patient? := facts.sourcePatientId?, bound? := facts.sourcePatientId?,
        activity := Workspace.primary p, target? := some state.screen } }
      let screen := runRenderUi ⟨sp,p,facts,display,user,selected⟩
      if sample.isNone && sc.id == "w1Sign" then sample := some screen
      let shape := screenShape screen
      let classOk := Shell.accepts shape
      classChecks := classChecks ++ [Json.mkObj [("screen",toJson sc.id),("variant",toJson variant),
        ("classAccepted",toJson classOk),("classDecline",toJson
          (if classOk then "" else "fixed-shell-invariant-failed"))]]
      if sc.id == "w1Sign" then
        if !shapes.contains (screenShape screen) then shapes := screenShape screen :: shapes
        for v in viewports do
          let (node,data,e) := portScreen v screen
          let ps := boxes v node
          let errors := contentErrors data ps
          let shell := Shell.classBoxes v shape
          checks := checks ++ [Json.mkObj [("screen",toJson sc.id),("variant",toJson variant),("viewport",toJson v),
            ("accepted",toJson (check e v ps && errors.isEmpty)),
            ("shellAccepted",toJson (check (shapeSources shape) v shell && decide (Linked shape shell))),
            ("shellG9",toJson (decide (G9 v shell))),
            ("findings",toJson (findings e v ps ++ errors)), ("sources",toJson e.length),
            ("hasCurrentCommit",toJson (ps.any (·.info.commit))),
            ("g9Exempt",toJson (v == ⟨92160,57600⟩ && !(ps.any (·.info.commit)))),
            ("g9Passed",toJson (decide (G9 v ps)))]]
  let family : Family := shapes.map fun shape => ⟨shape,fun v => compileShape v shape⟩
  return Json.mkObj [("path",toJson path),("sample",toJson sample),("checks",toJson checks),
    ("classChecks",toJson classChecks),("familyCases",toJson shapes.length),("familyAccepted",toJson (acceptFamily family)),
    ("programCertificate",Json.mkObj [("accepted",toJson (Range.checkProgram sp p)),
      ("theorem",toJson "Ehr.Layout.Range.checkProgram_sound"),("class",toJson "fixed-shell-v2")])]
end Ehr.Layout

def main (args : List String) : IO Unit := do
  let paths ← Ehr.Render.Cli.readJson (List (String × String)) (args.headD "")
  let bundle ← Ehr.Render.Cli.readJson Lean.Json (args[1]?.getD "")
  let (facts,display) ← IO.ofExcept (Ehr.Render.Fhir.parseBundle { today := "2026-10-31" } bundle)
  for (path,spec) in paths do
    if args.contains "--all-screens" then IO.eprintln s!"class audit: {path}"
    IO.println ((← Ehr.Layout.auditProgram path spec facts display (args.contains "--all-screens")).compress)
