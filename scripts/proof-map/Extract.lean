import Lean
import Std.Data.HashMap
open Lean Meta

/-! Proof-map extractor: reads compiled project modules and writes one JSON
record per project declaration (kind, module, location, signature, docstring,
statement dependencies, proof/body dependencies, axioms for theorems). -/

def ownModule (m : Name) : Bool :=
  (`Ehr).isPrefixOf m || (`CommitProtocol).isPrefixOf m || m == `Solution

/-- Map an auxiliary/private name to the user-facing declaration it belongs to. -/
partial def owner (env : Environment) (n : Name) : Option Name :=
  let n' := (privateToUserName? n).getD n
  let rec up (x : Name) : Option Name :=
    match x with
    | .anonymous => none
    | _ =>
      let isAux := x.isInternal || x.components.any (fun c => c.toString.startsWith "match_" || c.toString.startsWith "proof_" || c.toString == "eq_def" || c.toString.startsWith "eq_" || c.toString.startsWith "_")
      if !isAux && (env.contains x || env.contains (mkPrivateName env x)) then some x else up x.getPrefix
  if env.contains n && !n.isInternal && !(n'.components.any (fun c => c.toString.startsWith "match_" || c.toString.startsWith "proof_" || c.toString.startsWith "eq_" || c.toString == "eq_def")) then some n else up n'

def kindOf : ConstantInfo → String
  | .thmInfo _ => "theorem" | .defnInfo _ => "def" | .axiomInfo _ => "axiom"
  | .opaqueInfo _ => "opaque" | .inductInfo _ => "inductive" | .ctorInfo _ => "ctor"
  | .recInfo _ => "rec" | .quotInfo _ => "quot"

unsafe def main (args : List String) : IO Unit := do
  let out := args.headD "proofmap.json"
  let mods := (args.drop 1).toArray.map String.toName
  enableInitializersExecution
  initSearchPath (← findSysroot)
  let env ← importModules (mods.map fun m => { module := m }) {} (trustLevel := 1024) (loadExts := true)
  let modName (n : Name) : Option Name := (env.getModuleIdxFor? n).map fun i => env.header.moduleNames[i.toNat]!
  -- axioms, memoised
  let memo ← IO.mkRef ({} : Std.HashMap Name (Array Name))
  let rec axiomsOf (fuel : Nat) (n : Name) : IO (Array Name) := do
    if let some a := (← memo.get)[n]? then return a
    match fuel with
    | 0 => return #[]
    | fuel+1 =>
    memo.modify (·.insert n #[])  -- cycle guard
    let r ← match env.find? n with
      | some (.axiomInfo _) => pure #[n]
      | some ci =>
        let cs := ci.type.getUsedConstants ++ (match ci.value? (allowOpaque := true) with | some v => v.getUsedConstants | none => #[])
        let cs := match ci with
          | .inductInfo i => cs ++ i.ctors.toArray
          | _ => cs
        let mut acc : NameSet := {}
        for c in cs do
          for a in (← axiomsOf fuel c) do acc := acc.insert a
        pure acc.toArray
      | none => pure #[]
    memo.modify (·.insert n r)
    return r
  let ctx : Core.Context := { fileName := "<proofmap>", fileMap := default, options := ({} : Options).insert `format.width (.ofNat 100), maxHeartbeats := 0 }
  let st : Core.State := { env }
  let mut records : Array Json := #[]
  let mut count := 0
  for (n, ci) in env.constants.toList do
    let some m := modName n | continue
    unless ownModule m do continue
    if n.isInternal && (privateToUserName? n).isNone then continue
    match ci with
    | .ctorInfo _ | .recInfo _ | .quotInfo _ => continue
    | _ => pure ()
    if (owner env n) != some n then continue
    if isAuxRecursor env n || isNoConfusion env n || Meta.isMatcherCore env n then continue
    let userName := (privateToUserName? n).getD n
    let deps (e : Expr) : Array String :=
      let s : NameSet := e.getUsedConstants.foldl (init := {}) fun s c =>
        match owner env c with
        | some o => if o != n && (modName o).any ownModule then s.insert o else s
        | none => s
      s.toArray.map toString |>.qsort (· < ·)
    let stmtDeps := deps ci.type
    let bodyDeps := match ci.value? (allowOpaque := true) with | some v => deps v | none => #[]
    let ctorDeps := match ci with
      | .inductInfo i => i.ctors.toArray.foldl (init := #[]) fun acc c => acc ++ (match env.find? c with | some cc => deps cc.type | none => #[])
      | _ => #[]
    let sig ← try
        let (f, _) ← ((PrettyPrinter.ppSignature n).run' : CoreM _).toIO ctx st
        pure (toString f.fmt)
      catch _ => pure ""
    let doc ← findDocString? env n
    let range ← try
        let (r, _) ← (findDeclarationRanges? n : CoreM _).toIO ctx st
        pure (r.map (·.range.pos.line))
      catch _ => pure none
    let ax ← if ci matches .thmInfo _ then (axiomsOf 100000 n) else pure #[]
    let isStruct := isStructure env n
    let isInst := (instanceExtension.getState env).instanceNames.contains n
    records := records.push <| Json.mkObj [
      ("name", toJson userName.toString), ("raw", toJson n.toString),
      ("kind", toJson (if isStruct then "structure" else if isInst then "instance" else kindOf ci)),
      ("module", toJson m.toString), ("line", toJson range),
      ("private", toJson (privateToUserName? n).isSome),
      ("sig", toJson sig), ("doc", toJson doc),
      ("stmt", toJson stmtDeps), ("body", toJson (bodyDeps ++ ctorDeps).toList.eraseDups.toArray),
      ("axioms", toJson (ax.map toString))]
    count := count + 1
  -- module import graph
  let modEdges : Array Json := env.header.moduleNames.zip env.header.moduleData |>.filterMap fun (mn, md) =>
    if ownModule mn then some (Json.mkObj [("module", toJson mn.toString), ("imports", toJson ((md.imports.map (·.module)).filter ownModule |>.map toString))]) else none
  IO.FS.writeFile out (Json.compress (Json.mkObj [("decls", Json.arr records), ("modules", Json.arr modEdges)]))
  IO.println s!"wrote {count} declarations to {out}"
