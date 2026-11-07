import Ehr.Cli.Commit
import Ehr.Api
import Ehr.Render.Api
import Ehr.Commit.Mar
import Ehr.Commit.Adt

/-! Native-only JSON-lines transport. One response per line; malformed requests
are isolated. This module changes neither the guard nor the shared transition. -/
namespace Ehr.Cli.Serve
open Lean

deriving instance ToJson, FromJson for Multi.Action

structure SharedInput where
  state : Multi.State
  action : Multi.Action
  deriving FromJson

private def applyJson (α β : Type) [FromJson α] [ToJson β]
    (f : α → β) (input : Json) : Except String Json := do
  pure (toJson (f (← fromJson? input)))

structure EncounterInput where
  patient : String
  bundle : Json
  user : User
  version : Nat
  expectedVersion : Nat
  deriving FromJson

/-- Opening an episode is an administrative command: it cannot sign, place a
patient in a bed, create reviews, or administer a drug. -/
def mayOpenEncounter (i : EncounterInput) : Bool :=
  i.version == i.expectedVersion && Commit.validId i.patient &&
    [Role.physician, Role.np, Role.surgeon].contains i.user.role &&
    ((Render.Fhir.bundleResources i.bundle).filter (fun r => Render.Fhir.resourceType r == "Patient")).map
      (fun r => Render.Fhir.str r "id") == [i.patient]

/-- Transport dispatch uses the same functions as the one-shot native commands. -/
def dispatch (request : Json) : Except String Json := do
  let op ← (← request.getObjVal? "op").getStr?
  let input ← request.getObjVal? "input"
  match op with
  | "encounter-open" =>
    let i : EncounterInput ← fromJson? input
    pure (Json.mkObj [("accepted", toJson (mayOpenEncounter i))])
  | "adt-commit" =>
    let i : Commit.Adt.Input ← fromJson? input
    pure <| match Commit.Adt.commit i with
      | some accepted => toJson accepted
      | none => Json.mkObj [("rejected", .str "adt_guard")]
  | "mar-import-context" =>
    let i ← fromJson? input
    pure (toJson (← Commit.Mar.importContextFor i))
  | "mar-context" =>
    let i ← fromJson? input
    pure (toJson (← Commit.Mar.contextFor i))
  | "mar-commit" =>
    let i : Commit.Mar.Input ← fromJson? input
    pure <| match Commit.Mar.commit i with
      | some accepted => toJson accepted
      | none => Json.mkObj [("rejected", toJson (
          if i.dose ∈ i.state.shared.administrations.map Prod.fst
          then "dose_already_administered" else "invalid_mar_status_or_guard"))]
  | "review-check" =>
    let i : Commit.Request ← fromJson? input
    let current ← Commit.prepare i
    let next := step i.spec i.program current.facts i.user .human i.state i.event
    let added := next.1.receipts.filter (fun r => !i.state.receipts.contains r)
    pure <| if next.2 == .ok && next.1.commits == i.state.commits && added.length == 1 &&
        next.1.receipts.length == i.state.receipts.length + 1 then
      Json.mkObj [("accept", Json.mkObj [("state", toJson next.1)])]
    else Json.mkObj [("reject", Json.mkObj [("reason", .str "review event must add exactly one native receipt")])]
  | "commit-check" => applyJson Commit.Request Commit.Decision Commit.check input
  | "init" => applyJson InitInput State runInit input
  | "screen-canonical" => applyJson Render.UiScreen String Render.UiScreen.canonical input
  | "render-screen" =>
    let i : Render.RenderInput ← fromJson? input
    let screen := Render.runRenderUi i
    pure (Json.mkObj [("screen", toJson screen), ("canonical", .str screen.canonical)])
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
