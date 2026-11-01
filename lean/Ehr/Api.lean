import Ehr.Core.Workspace
import Ehr.JsonCompat

/-!
Shared JSON API for the app's WASM module and the native command-line tool.
Record functions call the interpreter; string functions parse and print JSON.
Parse failures return an error object. App events run as human actions;
macros run inside the interpreter.
-/

namespace Ehr

/-! ## Record-level functions (shared by WASM and the CLI) -/

/-- The initial state for an episode. -/
def runInit (i : InitInput) : State :=
  if Workspace.enabled i.program then Workspace.init i.program else init i.spec i.program i.facts i.user

/-- One human event. -/
def runStep (i : StepInput) : StepOutput :=
  let r := if Workspace.enabled i.program then Workspace.step i.spec i.program i.facts i.user i.state i.event
    else step i.spec i.program i.facts i.user .human i.state i.event
  { state := r.1, result := r.2 }

/-- The screen view. -/
def runView (i : ViewInput) : ScreenView :=
  if Workspace.enabled i.program && !Workspace.bound i.facts i.state then
    { screen := i.state.screen, title := (Workspace.activity i.program i.facts i.state).title,
      items := [], enabled := (Workspace.navigation i.program i.facts i.state ++ Workspace.openControls i.program i.facts i.state).map (·.id), blocked := [] }
  else view i.spec i.program i.facts i.user i.state

/-- Run one batch case from `init`: one output record per event. -/
def runBatchCase (caseIdx : Nat) (c : BatchCase) : List BatchStep :=
  let results := runEvents c.spec c.program c.facts c.user .human (init c.spec c.program c.facts c.user) c.events
  (List.range results.length).zip results |>.map fun (idx, r) =>
    { case := caseIdx, index := idx, state := r.1, result := r.2
      view := view c.spec c.program c.facts c.user r.1 }

/-! ## String functions (exported for the WASM build) -/

/-- A JSON error object. -/
def errorJson (msg : String) : String :=
  (Lean.Json.mkObj [("error", Lean.Json.str msg)]).compress

/-- Parse one argument, naming it in the error message. -/
def parseArg (α : Type) [Lean.FromJson α] (name s : String) : Except String α :=
  match decodeJson α s with
  | .ok x => .ok x
  | .error e => .error s!"{name}: {e}"

/-- `init(spec, program, facts, user) → state` (all JSON strings). -/
@[export ehr_init]
def apiInit (specJson programJson factsJson userJson : String) : String :=
  match (do
      let spec ← parseArg Spec "spec" specJson
      let program ← parseArg Program "program" programJson
      let facts ← parseArg Facts "facts" factsJson
      let user ← parseArg User "user" userJson
      pure { spec, program, facts, user : InitInput }) with
  | .ok i => encodeJson (runInit i)
  | .error e => errorJson e

/-- `step(spec, program, facts, user, state, event) → {state, result}`. -/
@[export ehr_step]
def apiStep (specJson programJson factsJson userJson stateJson eventJson : String) : String :=
  match (do
      let spec ← parseArg Spec "spec" specJson
      let program ← parseArg Program "program" programJson
      let facts ← parseArg Facts "facts" factsJson
      let user ← parseArg User "user" userJson
      let state ← parseArg State "state" stateJson
      let event ← parseArg Event "event" eventJson
      pure { spec, program, facts, user, state, event : StepInput }) with
  | .ok i => encodeJson (runStep i)
  | .error e => errorJson e

/-- `view(spec, program, facts, user, state) → screenView`. -/
@[export ehr_view]
def apiView (specJson programJson factsJson userJson stateJson : String) : String :=
  match (do
      let spec ← parseArg Spec "spec" specJson
      let program ← parseArg Program "program" programJson
      let facts ← parseArg Facts "facts" factsJson
      let user ← parseArg User "user" userJson
      let state ← parseArg State "state" stateJson
      pure { spec, program, facts, user, state : ViewInput }) with
  | .ok i => encodeJson (runView i)
  | .error e => errorJson e

/-- Envelope form of `step`: one JSON object `StepInput` → `StepOutput`. -/
@[export ehr_step_envelope]
def apiStepEnvelope (inputJson : String) : String :=
  match parseArg StepInput "input" inputJson with
  | .ok i => encodeJson (runStep i)
  | .error e => errorJson e

/-- Envelope form of `view`: one JSON object `ViewInput` → `ScreenView`. -/
@[export ehr_view_envelope]
def apiViewEnvelope (inputJson : String) : String :=
  match parseArg ViewInput "input" inputJson with
  | .ok i => encodeJson (runView i)
  | .error e => errorJson e

/-- Envelope form of `init`: one JSON object `InitInput` → `State`. -/
@[export ehr_init_envelope]
def apiInitEnvelope (inputJson : String) : String :=
  match parseArg InitInput "input" inputJson with
  | .ok i => encodeJson (runInit i)
  | .error e => errorJson e

end Ehr
