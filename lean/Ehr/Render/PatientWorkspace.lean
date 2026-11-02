import Ehr.Core.Workspace
import Ehr.Render.Ui

namespace Ehr.Render

def workspaceNav (p : Program) (f : Facts) (s : State) : String × List (String × String) :=
  ("Application activities", (Workspace.navigation p f s).map fun c => (c.id, c.label))

/-- An unbound workspace reads only directory identities and dated list context. -/
def patientLandingUi (p : Program) (f : Facts) (u : User) (s : State) : UiScreen :=
  let c := s.patientContext?.getD {}
  let pending := c.patient?.isSome
  let title := if pending then "Loading patient chart" else if c.activity == "lookup" then "Patient Lookup" else (Workspace.activity p f s).title
  let info := if c.activity == "lookup" || c.query != "" then "patientLookup" else (Workspace.activity p f s).info
  let kind : UiPresentationKind := if info == "edTrackBoard" then .trackBoard else if info == "shiftWorklist" || info == "unitCensus" then .worklist else if info.startsWith "inBasket" then .messages else if info == "orSchedule" then .orSchedule else .schedule
  { screen? := some ("workspace:" ++ c.activity ++ (if pending then ":loading" else "")),
    banner := [], viewer? := some (uiViewer u.role), nav := [workspaceNav p f s],
    title, side := [], modal := none,
    workspace := if pending then [.text "Loading the selected patient's chart…"] else
      [.field "workspace.search" "Patient search by name or MRN" "search"
        (if c.query == "" then none else some c.query) none none false false false,
       .presentation kind ((if info.startsWith "inBasket" then
         [.presentation .folderList [.info "" "In Basket folders" "inBasketFolders" "table"
           ((((f.patientDirectory?.map (·.activities)).getD []).filter (fun a => a.info.startsWith "inBasket")).map fun a =>
             [("Folder", a.title), ("Count", toString a.rows.length)])]] else []) ++ [.info "workspace.list" title info "table" ((Workspace.rows p f s).map (·.fields))] ++
        (Workspace.openControls p f s).map fun control =>
          .rowAction "workspace.list" (control.row?.getD 0)
            [.button control.id control.label "nav" true none none])] ++
       (if p.screens.any (·.id == "chartSummary") then
         [.info "" "Reports" "chartReports" "summary" [[("Department snapshot", "Schedule, census and case lists are available in Application activities.")]]]
        else []) }

/-- Patient-scoped renderUi retains all clinical presentation guarantees. -/
def renderPatientWorkspace (sp : Spec) (p : Program) (f : Facts) (d : Display) (u : User) (s : State) : UiScreen :=
  if !Workspace.enabled p then renderUi sp p f d u s else
  if Workspace.bound f s then
    let clinical := renderUi sp p f d u s
    { clinical with nav := workspaceNav p f s :: clinical.nav }
  else patientLandingUi p f u s

end Ehr.Render
