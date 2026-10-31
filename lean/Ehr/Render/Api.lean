import Ehr.Api
import Ehr.Render.Fhir
import Ehr.Render.Page

namespace Ehr.Render

/-- Render the actual interpreter state into the painter's wire format. -/
def runRender (i : RenderInput) : PageNode :=
  (render i.spec i.program i.facts i.display i.user i.state).toPage

@[export ehr_render]
def apiRender (input : String) : String :=
  match decodeJson RenderInput input with
  | .error e => errorJson e
  | .ok i => encodeJson (runRender i)

@[export ehr_facts]
def apiFacts (input : String) : String :=
  match decodeJson Fhir.FactsInput input with
  | .error e => errorJson e
  | .ok i => match Fhir.runFacts i with
    | .error e => errorJson e
    | .ok out => encodeJson out

end Ehr.Render
