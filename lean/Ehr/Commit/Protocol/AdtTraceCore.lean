import Ehr.Commit.Protocol.AdtModel
import Lean

open Lean
namespace Ehr.Commit.Protocol.AdtModel


/-- Transaction-linearized implementation refinement TEST input. SQL statement
interleavings and cache replay equivalence are not proved by this checker. -/
structure Attempt where
  request : Request
  ops : List String
  observed : List Adt.Version
  observedBoard : Option Adt.State := none
  acceptedBoard : Option Adt.State := none
  result : String
  alternateOps : List String := []
  after : List Nat := []
  deriving FromJson

private def parseOp : String → Option Op
  | "request" => some .request
  | "lock" => some .lock
  | "read" => some .read
  | "guard" => some .guard
  | "update" => some .update
  | "write" => some .write
  | "stage" => some .stage
  | "commit" => some .commit
  | "unlock" => some .unlock
  | "respond" => some .respond
  | "crash" => some .crash
  | _ => none

private def answerKind : Answer → String
  | .accepted _ => "accepted"
  | .refused => "refused"
  | .conflict => "conflict"
  | .payloadConflict => "payloadConflict"

/-- Every witness edge executes Model.advance, including its lock/CAS checks. -/
def replayAttempt (baseline : Adt.State) (m : Machine) (i : Nat) (a : Attempt) : Option Machine := do
  let mut m := m
  for word in a.ops do
    let op ← parseOp word
    m ← advance m i op
    if op == .read then
      let tx ← m.txs[i]?
      if tx.observed != a.observed then none
      if a.observedBoard != some m.durable.board then none
    if op == .guard then
      if let some board := a.acceptedBoard then
        if Adt.apply m.durable.board a.request.command != board then none
    if op == .commit then
      unless safe baseline m.durable do none
  let tx ← m.txs[i]?
  if a.result == "aborted" then
    if tx.phase != .aborted then none else some m
  else
    let answer ← tx.answer
    if tx.phase != .done || answerKind answer != a.result then none else some m

/-- Search for a serial order compatible with observed locked snapshots and
nonoverlapping invocation/response intervals. Search budget exhaustion fails. -/
private partial def search (baseline : Adt.State) (attempts : Array Attempt) (m : Machine)
    (remaining order : List Nat) (budget : IO.Ref Nat) : IO (Option (List Nat)) := do
  if remaining.isEmpty then return some order.reverse
  let fuel ← budget.get
  if fuel == 0 then throw <| IO.userError "INCOMPLETE trace linearization: search budget exhausted"
  budget.set (fuel - 1)
  for i in remaining do
    let some a := attempts[i]? | throw <| IO.userError "invalid attempt index"
    if a.after.all (fun j => j ∈ order) then
      for ops in [a.ops] ++ (if a.alternateOps.isEmpty then [] else [a.alternateOps]) do
        if let some next := replayAttempt baseline m i { a with ops } then
          if let some witness ← search baseline attempts next (remaining.filter (· != i)) (i :: order) budget then
            return some witness
  return none

def checkTrace (baseline : Adt.State) (attempts : List Attempt) : IO Unit := do
  if attempts.isEmpty then throw <| IO.userError "empty trace"
  unless Adt.valid baseline do throw <| IO.userError "invalid ADT baseline"
  let initial : Machine := { durable := initial baseline, txs := attempts.map fun a => { request := a.request } }
  let budget ← IO.mkRef 100000
  match ← search baseline attempts.toArray initial (List.range attempts.length) [] budget with
  | none => throw <| IO.userError "NOT A MODEL TRACE: no compatible serialized execution"
  | some order => IO.println s!"ADT protocol refinement TEST: {attempts.length} attempts; Lean model witness {order}"

end Ehr.Commit.Protocol.AdtModel

structure TraceInput where
  baseline : Ehr.Commit.Adt.State
  attempts : List Ehr.Commit.Protocol.AdtModel.Attempt
  deriving Lean.FromJson

def Ehr.Commit.Protocol.AdtModel.traceCommand (args : List String) : IO Unit := do
  let [path] := args | throw <| IO.userError "usage: AdtTrace.lean program.json"
  let json ← IO.ofExcept <| Lean.Json.parse (← IO.FS.readFile path)
  let input ← IO.ofExcept <| Lean.fromJson? (α := TraceInput) json
  Ehr.Commit.Protocol.AdtModel.checkTrace input.baseline input.attempts
