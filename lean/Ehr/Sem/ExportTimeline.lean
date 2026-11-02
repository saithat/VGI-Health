import Ehr.Sem.TimelineProgram

/-- Emit the canonical proved screen for the independent browser gate. -/
def main (args : List String) : IO Unit :=
  IO.println (if args == ["program-screen"] then
    (Lean.toJson Ehr.Sem.canonicalTimelineProgramScreen).compress
    else (Lean.toJson Ehr.Sem.canonicalTimeline).compress)
