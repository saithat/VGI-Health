import Audit.SpecSurface
import Ehr

/-! Export the kernel environment's statement/body closure. Root selection and
freshness policy live in spec-surface.py; no proof expression is traversed here. -/
open Lean

unsafe def main (args : List String) : IO Unit := do
  let [out, rootsFile] := args | throw <| IO.userError "expected output and roots file"
  enableInitializersExecution
  initSearchPath (← findSysroot)
  let modules := (← IO.FS.lines rootsFile).filter (!·.isEmpty)
  -- The audited solution imports all canonical headline modules, never challenge stubs.
  let env ← importModules #[{ module := `Audit.SpecSurface }, { module := `Ehr }] {} (loadExts := true)
  let mut surface : NameSet := {}
  for root in modules do
    let n := root.toName
    unless (env.find? n).isSome do throw <| IO.userError s!"Missing headline declaration: {n}"
    for c in (VerificationAudit.specSurface env n).toList do surface := surface.insert c
  let ctx : Core.Context := { fileName := "<spec-surface>", fileMap := default }
  let st : Core.State := { env }
  let mut decls : Array Json := #[]
  for n in surface.toList do
    let some idx := env.getModuleIdxFor? n | continue
    let m := env.header.moduleNames[idx.toNat]!
    unless (`Ehr).isPrefixOf m || (`CommitProtocol).isPrefixOf m do continue
    let (range, _) ← (findDeclarationRanges? n : CoreM _).toIO ctx st
    decls := decls.push <| Json.mkObj [
      ("name", toJson n.toString),
      ("displayName", toJson ((privateToUserName? n).getD n).toString),
      ("file", toJson s!"lean/{m.toString.replace "." "/"}.lean"),
      ("line", toJson (range.map (·.range.pos.line))),
      ("endLine", toJson (range.map (·.range.endPos.line)))]
  IO.FS.writeFile out (Json.compress (Json.arr decls))
