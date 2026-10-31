import Ehr.Core.Json
import Ehr.Formulary

/- The world lane's boundary check uses the actual Lean decoder and encoder.
   Run after `cd lean && lake build`, with no other lake process running. -/
def main : IO UInt32 := do
  IO.println (Ehr.encodeJson Ehr.formulary)
  let stdin ← IO.getStdin
  repeat
    let line ← stdin.getLine
    if line.isEmpty then break
    match Ehr.decodeJson Ehr.DaySchedule line with
    | .error e => IO.eprintln e; return 1
    | .ok schedule => IO.println (Ehr.encodeJson schedule)
  return 0
