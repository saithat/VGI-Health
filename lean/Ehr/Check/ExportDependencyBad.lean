import Ehr.Check.DoseCompletionObstruction
import Ehr.Core.Json

/-- Export the dependency regression without changing the release catalogs. -/
def main (args : List String) : IO Unit := do
  let root : System.FilePath := args.headD ".."
  let dir := root / "lean/Ehr/Check/bad"
  IO.FS.createDirAll dir
  IO.FS.writeFile (dir / "dose-only-spec.json")
    ((Lean.toJson Ehr.Check.DoseCompletionObstruction.spec).pretty ++ "\n")
  IO.FS.writeFile (dir / "35-dose-without-drug.json")
    ((Lean.toJson Ehr.Check.DoseCompletionObstruction.program).pretty ++ "\n")
