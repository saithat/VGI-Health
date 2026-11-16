import Ehr.Layout.Api

/-- JSONL frontend of the shared layout API. -/
def main : IO Unit := do
  let stdin ← IO.getStdin
  let stdout ← IO.getStdout
  repeat
    let line ← stdin.getLine
    if line.isEmpty then break
    stdout.putStrLn (Ehr.Layout.apiLayout line)
