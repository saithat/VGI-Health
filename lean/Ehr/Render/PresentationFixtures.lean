import Ehr.Render.Api
import Ehr.Examples.Tiny

/-! Reproducible visual fixtures from fictional FHIR and explicit typed payloads.
This tool uses renderUi, not a hand-authored browser-only UiScreen. -/
namespace Ehr.Render.PresentationFixtures
open Lean

/-- Each example selects the same public tag a canonical component can use. -/
def cases : List (UiPresentationKind × InfoId × String) :=
  [(.schedule, "schedule", "Today's schedule"), (.trackBoard, "trackBoard", "Emergency Department"),
   (.orSchedule, "orSchedule", "Operating Room Schedule"), (.worklist, "worklist", "My Worklist"),
   (.timeGrid, "mar", "Medication Administration Record"), (.flowsheet, "flowsheet", "Adult Assessment • Vitals and I&O"),
   (.folderList, "inBasketFolders", "My Messages"), (.messages, "inBasketMessages", "Results • In Basket"),
   (.results, "labResults", "Laboratory Results"), (.trend, "resultTrend", "Result Trends"),
   (.growth, "growthChart", "Growth Chart"), (.notes, "encounterNotes", "Notes"),
   (.table, "currentMeds", "Medication Review")]

/-- A one-screen read-only example. Actions remain ordinary semantic controls. -/
def program (kind : UiPresentationKind) (info title : String) : Program :=
  { Examples.Tiny.program with
    id := "presentation-example", start := "example", screens :=
      [{ id := "example", title, workflow := "W1", components :=
        [{ id := "banner", kind := .banner, tag := "banner" },
         { id := "records", kind := .table info, label := title, tag := "present." ++ kind.tag }] }] }

/-- A normal source group supplies both panes of an In Basket screen. -/
def inBasketProgram : Program :=
  { Examples.Tiny.program with
    id := "in-basket-example", start := "example", screens :=
      [{ id := "example", title := "In Basket", workflow := "W2", components :=
        [{ id := "banner", kind := .banner, tag := "banner" },
         { id := "basket", kind := .group false false, label := "In Basket", tag := "layout.columns" },
         { id := "folders", parent? := some "basket", kind := .panel "inBasketFolders", label := "My Messages", tag := "present.folderList" },
         { id := "messages", parent? := some "basket", kind := .table "inBasketMessages", label := "Results • In Basket", tag := "present.messages" }] }] }

/-- Each source row has a real chart-navigation control with its original event. -/
def rowActionsProgram : Program :=
  { Examples.Tiny.program with
    id := "worklist-row-actions", start := "example", screens :=
      [{ id := "example", title := "My Worklist", workflow := "W3", components :=
        [{ id := "banner", kind := .banner, tag := "banner" },
         { id := "worklist", kind := .group false false, label := "Patient Tasks", tag := "present.worklist" },
         { id := "records", parent? := some "worklist", kind := .table "worklist", label := "My Worklist", tag := "present.worklist" },
         { id := "open-mar", parent? := some "worklist", kind := .button (.goto "mar-detail"), label := "Open MAR", tag := "present.row|records|0" },
         { id := "open-pain", parent? := some "worklist", kind := .button (.goto "pain-detail"), label := "Open assessment", tag := "present.row|records|1" },
         { id := "open-vitals", parent? := some "worklist", kind := .button (.goto "vitals-detail"), label := "Open vitals", tag := "present.row|records|2" }] }] ++
       [("mar-detail", "Medication Administration Record", "mar"),
        ("pain-detail", "Pain Assessment", "flowsheet"),
        ("vitals-detail", "Recorded Vitals", "vitals")].map fun (id, title, info) =>
          { id, title, workflow := "W3", components :=
            [{ id := "banner", kind := .banner, tag := "banner" },
             { id := "detail", kind := .table info, label := title, tag := "detail" },
             { id := "back", kind := .button (.goto "example"), label := "Back to worklist", tag := "back" }] } }

mutual
/-- Strip only layout wrappers for the same-record before view. -/
def unstyled : UiNode → List UiNode
  | .presentation _ children => unstyledList children
  | .rowAction _ _ children => unstyledList children
  | .section id title children => [.section id title (unstyledList children)]
  | .columns children => [.columns (unstyledList children)]
  | .tabs id labels selected children => [.tabs id labels selected (unstyledList children)]
  | node => [node]
termination_by node => sizeOf node
/-- Preserve child order while removing presentation wrappers. -/
def unstyledList : List UiNode → List UiNode
  | [] => []
  | n :: ns => unstyled n ++ unstyledList ns
termination_by nodes => sizeOf nodes
end
end Ehr.Render.PresentationFixtures

open Ehr Ehr.Render Ehr.Render.PresentationFixtures Lean in
/-- Export each example and its ordinary-info before view as real semantic JSON. -/
def main (args : List String) : IO Unit := do
  let out : System.FilePath := args.headD "../app/src/fixtures/presentations"
  let bundle ← IO.ofExcept (Json.parse (← IO.FS.readFile "Ehr/Render/TestData/presentations.json"))
  let payloadData ← IO.ofExcept (Json.parse (← IO.FS.readFile "Ehr/Render/TestData/presentation-payloads.json"))
  IO.FS.createDirAll out
  let mut inputs : List (String × RenderInput) := []
  for (kind, info, title) in cases do
    let selected := if kind == .growth then "p0" else "p1"
    let resources := Fhir.bundleResources bundle
    let resources := resources.filter fun r =>
      let rt := Fhir.resourceType r
      let subject := Fhir.str (Fhir.field r "subject") "reference"
      if rt == "Encounter" then
        if kind == .trackBoard then Fhir.str (Fhir.field r "class") "code" == "EMER"
        else Fhir.str r "id" == "inpatient" && selected == "p1"
      else if rt == "Appointment" then kind == .schedule
      else subject == "" || subject == "Patient/" ++ selected
    let resources := resources.filter (fun r => Fhir.resourceType r == "Patient" && Fhir.str r "id" == selected) ++
      resources.filter (fun r => Fhir.resourceType r != "Patient" || Fhir.str r "id" != selected)
    let sampleBundle := Json.mkObj [("resourceType", .str "Bundle"), ("entry", .arr (resources.map (fun r => Json.mkObj [("resource", r)])).toArray)]
    let (facts, display) ← IO.ofExcept (Fhir.parseBundle { today := "2026-11-01" } sampleBundle)
    let mut payloads : List InfoPayload := []
    let mut bindings : List ArtifactBinding := []
    for (_, info, _) in cases do
      match payloadData.getObjVal? info with
      | .error _ => pure ()
      | .ok data =>
        let rows : List (List (String × String)) ← IO.ofExcept (fromJson? data)
        payloads := payloads ++ [{ info, patient := facts.patientId, artifactKey := info, artifact := "example-" ++ info, version := 1, rows := rows.zipIdx.map fun (fields, slot) => { id := toString slot, slot, fields } }]
        bindings := bindings ++ [{ key := info, artifact := "example-" ++ info, version := 1 }]
    let facts := { facts with infoPayloads? := some payloads, artifactBindings? := some bindings, record := ("codeStatus", "Full code") :: facts.record }
    let prog := program kind info title
    let user : User := { id := "visual-review", role := .physician }
    let state := init Examples.Tiny.spec prog facts user
    let input : RenderInput := { spec := Examples.Tiny.spec, program := prog, facts, display, user, state }
    inputs := inputs ++ [(kind.tag, input)]
    let screen := runRenderUi input
    IO.FS.writeFile (out / (kind.tag ++ ".json")) (toJson screen).pretty
    IO.FS.writeFile (out / (kind.tag ++ "-before.json")) (toJson { screen with workspace := unstyledList screen.workspace }).pretty
  if let some (_, base) := inputs.getLast? then
    let input := { base with program := inBasketProgram, state := init base.spec inBasketProgram base.facts base.user }
    inputs := inputs ++ [("inBasket", input)]
    let screen := runRenderUi input
    IO.FS.writeFile (out / "inBasket.json") (toJson screen).pretty
    IO.FS.writeFile (out / "inBasket-before.json") (toJson { screen with workspace := unstyledList screen.workspace }).pretty
    let input := { base with program := rowActionsProgram, state := init base.spec rowActionsProgram base.facts base.user }
    inputs := inputs ++ [("rowActions", input)]
    let screen := runRenderUi input
    for (control, target) in [("open-mar", "mar-detail"), ("open-pain", "pain-detail"), ("open-vitals", "vitals-detail")] do
      let (next, _) := Ehr.step input.spec input.program input.facts input.user .human input.state (.click control)
      unless next.screen == target do throw (IO.userError s!"Row action failed: {control}")
      let (back, _) := Ehr.step input.spec input.program input.facts input.user .human next (.click "back")
      unless back.screen == "example" do throw (IO.userError s!"Return failed: {control}")
    IO.FS.writeFile (out / "rowActions.json") (toJson screen).pretty
    IO.FS.writeFile (out / "rowActions-before.json") (toJson { screen with workspace := unstyledList screen.workspace }).pretty
  IO.FS.writeFile (out / "api-inputs.jsonl") ("\n".intercalate (inputs.map encodeJson) ++ "\n")
  IO.println s!"Exported {inputs.length} structured examples and before views to {out}"
