import Ehr.Canonical.Releases
import Ehr.Canonical.Personas
import Ehr.Core.Json

open Ehr Ehr.Canonical

def writeJson [Lean.ToJson α] (root : System.FilePath) (path : String) (x : α) : IO Unit := do
  IO.FS.createDirAll (root / path).parent.get!
  IO.FS.writeFile (root / path) ((Lean.toJson x).pretty ++ "\n")

def main (args : List String) : IO Unit := do
  let root : System.FilePath := args.headD ".."
  let base := forPersona Ehr.Specs.V1.specV1 canonicalV1 "P1" .physician
  let rewrite := fun (p : Program) (f : Component → Option Component) =>
    { p with screens := p.screens.map fun s => { s with components := s.components.filterMap f } }
  let cures := rewrite base fun c => if showsInfo "curesReport" c.kind then none else some c
  let linked := rewrite base fun c => some (match c.kind with
    | .field "dosingWeight" slot _ => { c with kind := .field "dosingWeight" slot (.default "70") }
    | _ => c)
  let foreign := base.updateScreen base.start fun s => { s with components := s.components ++
    [{ id := "foreignAllergies", kind := .button (.markReviewed "patient-A-allergies"), label := "Other patient's allergies" }] }
  let empty := rewrite { base with macros := [] } fun c => match c.kind with
    | .field "drug" _ _ | .field "orderKind" _ _ | .field "orderCode" _ _ | .«macro» _ => none
    | _ => some c
  let denial := rewrite base fun c => match c.kind with
    | .field "refillDenyReason" _ _ => none
    | _ => some c
  let cases := [("36-cures-without-review", "completable", cures),
    ("37-stale-dosing-weight", "capturesAllOnce", linked),
    ("38-cross-patient-panel", "writesOnly", foreign),
    ("39-empty-order-signing", "completable", empty),
    ("40-denial-without-reason", "completable", denial)]
  for (name, _, p) in cases do writeJson root s!"lean/Ehr/Check/bad/{name}.json" p
  writeJson root "lean/Ehr/Check/conformance-bad-programs.json" (cases.map fun (name, prop, _) => (s!"lean/Ehr/Check/bad/{name}.json", prop))
