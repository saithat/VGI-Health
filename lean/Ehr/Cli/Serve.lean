import Ehr.Cli.Commit
import Ehr.Api
import Ehr.Render.Api
import Ehr.Multi.Model

/-! Native-only JSON-lines transport. One response per line; malformed requests
are isolated. This module changes neither the guard nor the shared transition. -/
namespace Ehr.Cli.Serve
open Lean

deriving instance ToJson, FromJson for Multi.DoseKey
deriving instance ToJson, FromJson for Multi.State
deriving instance ToJson, FromJson for Multi.Action

structure SharedInput where
  state : Multi.State
  action : Multi.Action
  deriving FromJson

private def applyJson (α β : Type) [FromJson α] [ToJson β]
    (f : α → β) (input : Json) : Except String Json := do
  pure (toJson (f (← fromJson? input)))

/-- Transport dispatch uses the same functions as the one-shot native commands. -/
def dispatch (request : Json) : Except String Json := do
  let op ← (← request.getObjVal? "op").getStr?
  let input ← request.getObjVal? "input"
  match op with
  | "commit-check" => applyJson Commit.Request Commit.Decision Commit.check input
  | "init" => applyJson InitInput State runInit input
  | "step" => applyJson StepInput StepOutput runStep input
  | "facts" =>
    let i ← fromJson? input
    pure (toJson (← Render.Fhir.runFacts i))
  | "multi-step" =>
    let i : SharedInput ← fromJson? input
    let next := Multi.step i.state i.action
    pure (Json.mkObj [("state", toJson next), ("changed", toJson (next != i.state))])
  | _ => throw "unsupported operation"

/-- Echo IDs even on errors so a supervisor can correlate requests. -/
def respond (line : String) : String :=
  match Json.parse line with
  | .error e => (Json.mkObj [("id", .null), ("error", .str e)]).compress
  | .ok request =>
    let id := (request.getObjVal? "id").toOption.getD .null
    (Json.mkObj (("id", id) :: (match dispatch request with
      | .ok result => [("result", result)]
      | .error e => [("error", .str e)]))).compress

/-- The process is stateless between calls; the host owns durable session state. -/
def run : IO UInt32 := do
  let stdin ← IO.getStdin
  let stdout ← IO.getStdout
  repeat
    let line ← stdin.getLine
    if line.isEmpty then break
    stdout.putStrLn (respond line)
    stdout.flush
  return 0

end Ehr.Cli.Serve
