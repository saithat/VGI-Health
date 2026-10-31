import Ehr.Check.Check
import Ehr.Core.Json

/-!
# Deploy: publish a program only with an ok verdict

`deployPlan` is the whole decision, as a pure function: it runs the checker
and lists the files to write. The command-line tool only carries out the
plan. T4 (`Ehr.Proofs.CheckDeploy`) proves that the plan publishes
(writes `current.json`) only when the verdict is `ok`.

Files, under `<out>/<owner>/`:
- `v<N>.json`, the program, and `v<N>.cert.json`, its certificate: always
  written, so a rejected candidate leaves a record with its counterexample;
- `current.json`, the program, and `current.cert.json`, its certificate: the
  published version the app loads. Written only if the verdict is `ok`.

Hashes are FNV-1a (64-bit) over the compact JSON text (keys sorted).
-/

namespace Ehr.Check

open Ehr

/-! ## Hashing -/

/-- FNV-1a, 64-bit, over the UTF-8 bytes of a string. -/
def fnv1a64 (s : String) : UInt64 :=
  s.toUTF8.foldl (fun h b => (h ^^^ b.toUInt64) * 1099511628211) 14695981039346656037

/-- A 64-bit number as 16 lowercase hex digits. -/
def hex16 (n : UInt64) : String :=
  let digits := (List.range 16).reverse.map fun i =>
    let d := ((n >>> (4 * i).toUInt64) &&& 15).toNat
    (Nat.toDigits 16 d).headD '0'
  String.ofList digits

/-- The hash of a value: FNV-1a over its compact JSON text. -/
def jsonHash {α : Type} [Lean.ToJson α] (x : α) : String :=
  "fnv1a64:" ++ hex16 (fnv1a64 (encodeJson x))

-- Known FNV-1a test vectors.
#guard fnv1a64 "" == 14695981039346656037
#guard hex16 (fnv1a64 "a") == "af63dc4c8601ec8c"

/-! ## The plan -/

/-- Where a planned file goes, under `<out>/<owner>/`. -/
inductive Target
  /-- `v<N>.json`: this version's program. -/
  | version (n : Nat)
  /-- `v<N>.cert.json`: this version's certificate. -/
  | versionCert (n : Nat)
  /-- `current.json`: the published program. -/
  | current
  /-- `current.cert.json`: the published program's certificate. -/
  | currentCert
  deriving DecidableEq, Repr

/-- The target publishes: it is `current.json` or `current.cert.json`. -/
def Target.publishes : Target → Bool
  | .current | .currentCert => true
  | _ => false

/-- The file name of a target. -/
def Target.fileName : Target → String
  | .version n => s!"v{n}.json"
  | .versionCert n => s!"v{n}.cert.json"
  | .current => "current.json"
  | .currentCert => "current.cert.json"

/-- One file to write. -/
structure FileWrite where
  target : Target
  content : String
  deriving Repr

/-- The certificate for a checked program. -/
def certificate (spec : Spec) (prog : Program) (verdict : Verdict) (time : String) : Certificate where
  specVersion := spec.version
  specHash := jsonHash spec
  programHash := jsonHash prog
  verdict := verdict
  checkerVersion := checkerVersion
  time := time

/-- **The deploy decision.** Check the program, then plan the writes: the
version and its certificate always; `current.json` and its certificate only
if the verdict is `ok`. -/
def deployPlan (spec : Spec) (prev : Option Program) (canonical prog : Program) (time : String) :
    Verdict × List FileWrite :=
  let verdict := check spec prev canonical prog
  let cert := certificate spec prog verdict time
  let record := [{ target := .version prog.version, content := (Lean.toJson prog).pretty : FileWrite },
                 { target := .versionCert prog.version, content := (Lean.toJson cert).pretty }]
  let publish := [{ target := .current, content := (Lean.toJson prog).pretty : FileWrite },
                  { target := .currentCert, content := (Lean.toJson cert).pretty }]
  (verdict, if verdict == .ok then record ++ publish else record)

end Ehr.Check
