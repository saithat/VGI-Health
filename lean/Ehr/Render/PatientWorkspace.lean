import Ehr.Core.Workspace
import Ehr.Render.UrgentStrip

namespace Ehr.Render

def workspaceNav (p : Program) (f : Facts) (s : State) : String × List (String × String) :=
  ("Activities", (Workspace.navigation p f s).map fun c => (c.id, c.label))

/-- An unbound workspace reads only directory identities and dated list context. -/
def patientLandingUi (p : Program) (f : Facts) (u : User) (s : State) : UiScreen :=
  let c := s.patientContext?.getD {}
  let pending := c.patient?.isSome
  let title := if pending then "Loading patient chart" else if c.activity == "lookup" then "Patient Lookup" else (Workspace.activity p f s).title
  let info := if c.activity == "lookup" || c.query != "" then "patientLookup" else (Workspace.activity p f s).info
  let kind : UiPresentationKind := if info == "edTrackBoard" then .trackBoard else if info == "shiftWorklist" || info == "unitCensus" || info == "deficiencies" then .worklist else if info.startsWith "inbox" then .messages else if info == "orSchedule" then .orSchedule else .schedule
  { screen? := some ("workspace:" ++ c.activity ++ (if pending then ":loading" else "")),
    banner := [], viewer? := some (uiViewer u.role), nav := [workspaceNav p f s],
    title, side := [], modal := none,
    workspace := if pending then [.text "Loading the selected patient's chart…"] else
      [.field "workspace.search" "Patient search by name or MRN" "search"
        (if c.query == "" then none else some c.query) none none false false false,
       .presentation kind ((if info.startsWith "inbox" then
         [.presentation .folderList [.info "" "Inbox folders" "inboxFolders" "table"
           ((((f.patientDirectory?.map (·.activities)).getD []).filter (fun a => a.info.startsWith "inbox")).map fun a =>
             [("Folder", a.title), ("Count", toString a.rows.length)])]] else []) ++ [.info "workspace.list" title info "table" ((Workspace.rows p f s).map (·.fields))] ++
        (Workspace.openControls p f s).map fun control =>
          .rowAction "workspace.list" (control.row?.getD 0)
            [.button control.id control.label "nav" true none none])] ++
       (if p.screens.any (·.id == "chartSummary") then
         [.info "" "Reports" "chartReports" "summary" [[("Department snapshot", "Schedule, census and case lists are available in Activities.")]]]
        else []) }

/-- A value as plain text. -/
def reconcileValueText : Value → String
  | .code c | .text c | .user c => c
  | .qty t _ => toString (t / 10) ++ "." ++ toString (t % 10)
  | .flag b => if b then "yes" else "no"

/-- New specification for owner review: what an order line awaiting
reconciliation orders, from its own drug or service code. -/
def reconcileLineText (s : State) (n : Nat) : String :=
  match s.captured.find? (fun x => x.slot == n && (x.element == drugElement || x.element == "orderCode")) with
  | some x => ": " ++ reconcileValueText x.value
  | none => ""

/-- New specification for owner review: the per-line reconciliation controls
the runtime adds to a chart whose restored order lines await a decision after a
transfer. Each control is an ordinary coded field; choosing a value sends the
`reconcileComp` entry that `reconcileCore` handles. The section is absent when
no line awaits a decision. -/
def reconcileNodes (s : State) : List UiNode :=
  match reconcileSlots s with
  | [] => []
  | slots => [.section "orderReconciliation" "Order reconciliation after transfer"
      (.text "These unsigned orders were saved before the patient was transferred. Choose keep, change or discontinue for each line before signing orders." ::
        slots.map fun n =>
          .valueSet [⟨"keep", "Keep"⟩, ⟨"change", "Change"⟩, ⟨"discontinue", "Discontinue"⟩] false
            [.field (reconcileComp n) ("Order line " ++ toString (n + 1) ++ reconcileLineText s n)
              "coded" none none (some reconcileTag) false true true])]

/-- Patient-scoped renderUi retains all clinical presentation guarantees. -/
def renderPatientWorkspace (sp : Spec) (p : Program) (f : Facts) (d : Display) (u : User) (s : State) : UiScreen :=
  let effective := CriticalRuntime.effectiveFacts f s
  if !Workspace.enabled p then withUrgentStrip sp effective u s (renderUi sp p effective d u s) else
  if Workspace.bound f s then
    let clinical := withUrgentStrip sp effective u s (renderUi sp p effective d u s)
    { clinical with nav := workspaceNav p f s :: clinical.nav,
                    workspace := reconcileNodes s ++ clinical.workspace }
  else patientLandingUi p f u s

end Ehr.Render
