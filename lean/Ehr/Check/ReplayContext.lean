import Ehr.Core.View

namespace Ehr.Check
open Ehr

/-- The patient used to replay counterexamples. Navigation does not depend on
the record; the final click shows the hard stop. -/
def replayFacts : Facts where
  patientId := "pt-replay"
  identity := { initials := "AB", sex := "F", ageYears := 40 }
  allergyVersion := 1
  allergyClasses := []
  medsVersion := 1
  currentMedClasses := []
  weightToday? := some (700, .kg)
  careGaps := []
  abnormalResult := false
  now := 600

/-- The user used to replay counterexamples: the program's role. -/
def replayUser (prog : Program) : User := { id := "replay-user", role := prog.role }

end Ehr.Check
