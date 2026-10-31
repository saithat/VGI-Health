import Ehr.Render.Api
import Ehr.Render.FhirTests
import Ehr.Examples.Tiny

namespace Ehr.Render.Tests
open Ehr.Examples

def tinyInitial := init Tiny.spec Tiny.program Tiny.facts Tiny.user

def tinyPage (s : State) := render Tiny.spec Tiny.program Tiny.facts parsed.display Tiny.user s

mutual
def compIds : Html → List String
  | .text _ => []
  | .node _ _ attrs ch => attrs.filterMap (fun a => match a with | .compId id => some id | _ => none) ++ compIdsList ch
def compIdsList : List Html → List String
  | [] => []
  | h :: hs => compIds h ++ compIdsList hs
end

#guard (compIds (tinyPage tinyInitial)).contains "weightField"
#guard !(compIds (tinyPage tinyInitial)).contains "signButton"
#guard (tinyPage { tinyInitial with screen := "sign" }).toHtmlString.contains 'd'
#guard Fhir.containsStr (tinyPage { tinyInitial with screen := "sign" }).toHtmlString "disabled=\"disabled\""
#guard Fhir.containsStr (tinyPage tinyInitial).toHtmlString "record:weightToday"
#guard Fhir.containsStr (tinyPage tinyInitial).toHtmlString "Confirm prefilled value"
#guard !(Fhir.containsStr (tinyPage tinyInitial).toHtmlString "ehr-tiny")
#guard (Lean.Json.parse (apiRender "{}")).isOk
#guard Fhir.containsStr (apiRender "{}") "error"
#guard Fhir.containsStr (apiFacts "{}") "error"
#guard (Lean.fromJson? (α := PageNode) (Lean.toJson (runRender
  { spec := Tiny.spec, program := Tiny.program, facts := Tiny.facts,
    display := parsed.display, user := Tiny.user, state := tinyInitial }))).isOk
end Ehr.Render.Tests
