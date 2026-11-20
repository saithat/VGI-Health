import Ehr.Cli.Sim
import Ehr.Api
import Ehr.Render.Api

/- Render one task after the day-wide replay has established episode facts and
starting states. These are the same record functions used by ehr serve. -/
open Lean Ehr

namespace TraceTask

structure Segment where
  start : Nat
  «end» : Nat
  facts : Facts
  initialState : State
  deriving FromJson

structure Input where
  segments : Array Segment
  events : Array TraceEvent
  projection : Render.Fhir.FactsInput
  startMinute : Nat
  deriving FromJson

def replay (sp : Spec) (prog : Program) (i : Input) : IO Unit := do
  let display := (← Cli.Sim.ioExcept (Render.Fhir.runFacts i.projection)).display
  let user : User := { id := prog.owner, role := prog.role }
  let out ← IO.getStdout
  let mut count := 0
  for segment in i.segments do
    if segment.start != count then throw (IO.userError "Noncontiguous trace segments")
    let mut state := segment.initialState
    for idx in [segment.start:segment.end] do
      let some row := i.events[idx]? | throw (IO.userError "Missing trace event")
      if let some ctx := state.patientContext? then
        if ctx.patient?.any (· != "") && ctx.bound? != ctx.patient? then
          state := (runStep { spec := sp, program := prog, facts := segment.facts, user, state, event := .scroll state.screen }).state
      if row.t < i.startMinute * 600 then throw (IO.userError "Negative trace clock")
      state := { state with clock := row.t - i.startMinute * 600 }
      let ui := Render.runRenderUi {spec := sp, program := prog, facts := segment.facts, display, user, state}
      let after := runStep {spec := sp, program := prog, facts := segment.facts, user, state, event := row.event}
      if state.screen != row.screen || after.result != row.result then
        throw (IO.userError s!"Native geometry replay mismatch {row.task}/{idx}")
      out.putStrLn (toJson ui).compress
      state := after.state
      count := count + 1
  if count != i.events.size then throw (IO.userError "Incomplete native geometry state coverage")

end TraceTask

def main (args : List String) : IO Unit := do
  let [spec, program] := args | throw (IO.userError "expected spec and program paths")
  let input ← Cli.Sim.ioExcept (Json.parse (← (← IO.getStdin).getLine) >>= fromJson?)
  TraceTask.replay (← Cli.Sim.readAs Spec spec) (← Cli.Sim.readAs Program program) input
