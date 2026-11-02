import Ehr.Api
import Ehr.Render.Fhir
import Ehr.Render.Page
import Ehr.Render.PatientWorkspace

namespace Ehr.Render

/-- Render the actual interpreter state into the painter's wire format. -/
def runRender (i : RenderInput) : PageNode :=
  if Workspace.enabled i.program && !Workspace.bound i.facts i.state then
    (Html.text (Workspace.activity i.program i.facts i.state).title).toPage
  else (render i.spec i.program i.facts i.display i.user i.state).toPage

@[export ehr_render]
def apiRender (input : String) : String :=
  match decodeJson RenderInput input with
  | .error e => errorJson e
  | .ok i => encodeJson (runRender i)

def runRenderUi (i : RenderInput) : UiScreen :=
  renderPatientWorkspace i.spec i.program i.facts i.display i.user i.state

/-- Semantic renderer envelope, with the same error boundary as ehr_render. -/
@[export ehr_render_ui]
def apiRenderUi (input : String) : String :=
  match decodeJson RenderInput input with
  | .error e => errorJson e
  | .ok i => encodeJson (runRenderUi i)

@[export ehr_facts]
def apiFacts (input : String) : String :=
  match decodeJson Fhir.FactsInput input with
  | .error e => errorJson e
  | .ok i => match Fhir.runFacts i with
    | .error e => errorJson e
    | .ok out => encodeJson out

end Ehr.Render
