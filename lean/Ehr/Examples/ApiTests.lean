import Ehr.Api
import Ehr.Examples.TinyTests

/-!
# API tests

The string API gives the same answers as the interpreter, and reports parse
errors as `{"error": …}`.
-/

namespace Ehr.Examples.ApiTests

open Ehr Ehr.Examples.Tiny Ehr.Examples.TinyTests

/-- The tiny inputs as JSON strings. -/
def specJ : String := encodeJson spec
def programJ : String := encodeJson program
def factsJ : String := encodeJson facts
def userJ : String := encodeJson user

#guard apiInit specJ programJ factsJ userJ == encodeJson s0
#guard apiStep specJ programJ factsJ userJ (encodeJson atSignAmox) (encodeJson (Event.click "signButton")) ==
  encodeJson ({ state := popped.1, result := popped.2 } : StepOutput)
#guard apiView specJ programJ factsJ userJ (encodeJson popped.1) ==
  encodeJson (view spec program facts user popped.1)
#guard apiStepEnvelope (encodeJson ({ spec, program, facts, user, state := atSignAmox
                                      event := .click "signButton" } : StepInput)) ==
  apiStep specJ programJ factsJ userJ (encodeJson atSignAmox) (encodeJson (Event.click "signButton"))
-- Errors name the argument.
#guard apiStep specJ programJ factsJ userJ "{}" "\"nope\"" ==
  "{\"error\":\"state: Ehr.State.screen: String expected\"}"
-- A batch case gives one output per event, starting from `init`.
#guard (runBatchCase 0 { spec, program, facts, user, events := toSign "amoxicillin" 5000 }).length == 6
#guard ((runBatchCase 0 { spec, program, facts, user, events := toSign "amoxicillin" 5000 }).getLast?.map
  (·.state)) == some (run s0 (toSign "amoxicillin" 5000))

end Ehr.Examples.ApiTests
