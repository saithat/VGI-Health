import Ehr.Canonical.Personas
import Ehr.Render.Api

/-! Reproducible P1 review screens from the actual saved release and a Synthea
bundle. No manufactured clinical evidence or payload rows. Missing adapter data
stays missing and signatures stay blocked. This is visual input, not certification.
Run from lean after export-content:
  lake env lean --run Ehr/Canonical/ReviewScreens.lean <bundle> <out-dir>
-/
namespace Ehr.Canonical.ReviewScreens

def read [Lean.FromJson α] (path : System.FilePath) : IO α := do
  let raw ← IO.FS.readFile path
  match Lean.Json.parse raw >>= Lean.fromJson? with
  | .ok value => pure value
  | .error e => throw (IO.userError s!"{path}: {e}")

def writeScreens (bundlePath out : System.FilePath) : IO Unit := do
  let sp : Spec ← read "../releases/v1/spec.json"
  let prog : Program ← read "../releases/v1/personas/P1.json"
  let bundle : Lean.Json ← read bundlePath
  let (facts, display) ← match Render.Fhir.parseBundle { today := "2026-10-31" } bundle with
    | .ok result => pure result | .error e => throw (IO.userError e)
  let user : User := { id := "P1-review", role := .physician }
  IO.FS.createDirAll out
  for screen in ["w1Rooming", "w1Orders", "w1Sign"] do
    let state := (goTo sp prog facts (init sp prog facts user) screen).1
    let ui := Render.renderUi sp prog facts display user state
    IO.FS.writeFile (out / (screen ++ ".json")) ((Lean.toJson ui).pretty ++ "\n")
    IO.println s!"P1 review {screen}: {bundlePath} -> {out}"
end Ehr.Canonical.ReviewScreens

def main (args : List String) : IO Unit :=
  match args with
  | [bundle, out] => Ehr.Canonical.ReviewScreens.writeScreens bundle out
  | _ => throw (IO.userError "usage: ReviewScreens.lean <synthea-bundle> <out-dir>")
