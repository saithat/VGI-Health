import Ehr.Examples.Tiny

-- Native-encoded fixture data, never a hand-maintained mirror of Lean's types.
def main : IO Unit := do
  let input : Ehr.InitInput := {
    spec := Ehr.Examples.Tiny.spec
    program := Ehr.Examples.Tiny.program
    facts := Ehr.Examples.Tiny.facts
    user := Ehr.Examples.Tiny.user }
  IO.println (Ehr.encodeJson input)
