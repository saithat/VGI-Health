import Ehr

def main (args : List String) : IO UInt32 := do
  IO.println s!"{Ehr.projectName}: ehr CLI (args: {args})"
  return 0
