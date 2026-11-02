import Ehr.Sem.ExoticApi

/-- JSONL fixture/API runner. Never writes clinical data. -/
def main : IO Unit := do
  let stdin ← IO.getStdin
  let stdout ← IO.getStdout
  repeat
    let line ← stdin.getLine
    if line.isEmpty then break
    stdout.putStrLn (Ehr.Sem.Exotic.apiExotic line)
