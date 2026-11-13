import Ehr.Core.View
import Ehr.Core.Navigation
import Ehr.Core.Json

/-! Patient selection surrounds the unchanged, patient-scoped clinical interpreter.
The day directory never supplies clinical captures or review receipts. Leaving
a chart saves its captures and acknowledgments as that patient's draft in
`State.patientDrafts?`; hydrating the same patient again restores them. -/
namespace Ehr.Workspace

/-- An actual workspace action, declared by the fixed semantic control builder. -/
inductive Action
  | openPatient (patient : String) (target : ScreenId)
  | showList (activity : String)
  deriving DecidableEq, Repr, Inhabited

/-- A labeled action, optionally attached to its supplied list row. -/
structure Control where
  id : CompId
  label : String
  action : Action
  row? : Option Nat := none
  deriving DecidableEq, Repr, Inhabited

/-- Older programs omit the opt-in flag and retain their exact interpreter behavior. -/
def enabled (p : Program) : Bool := p.patientSelection? == some true

/-- A unique source patient binding; ambiguous identities cannot open a chart. -/
def patient? (f : Facts) (id : String) : Option PatientChoice :=
  match ((f.patientDirectory?.map (·.patients)).getD []).filter (·.id == id) with
  | [p] => if id == "" then none else some p
  | _ => none

/-- Clinical entry points are existing program screens, never data-supplied routes. -/
def target (p : Program) (info : String) : Option ScreenId :=
  let candidates := match info with
    | "edTrackBoard" => ["w3Triage"]
    | "shiftWorklist" | "unitCensus" => ["w4Mar"]
    | "orSchedule" => ["w6PreOp"]
    | "consultList" => ["w6Consult"]
    | "inboxResults" => ["w2Result"]
    | "inboxRxRequests" => ["w7Review", "w7Request", "w7Decision"]
    | _ => if p.role == Role.np then ["w5Rooming"] else ["w1Rooming"]
  let workflow := match info with
    | "edTrackBoard" => "W3" | "shiftWorklist" | "unitCensus" => "W4"
    | "orSchedule" | "consultList" => "W6" | "inboxResults" => "W2"
    | "inboxRxRequests" => "W7" | _ => if p.role == .np then "W5" else "W1"
  (candidates.find? (fun id => (p.screen? id).isSome)).orElse fun _ =>
    ((p.screens.find? (·.workflow == workflow)).orElse fun _ =>
      p.screens.find? (fun screen => screen.workflow != "shell" && screen.workflow != "chart")).map (·.id)

/-- The role's default department activity. -/
def primary (p : Program) : String :=
  match p.presetOwner with
  | "P2" => "edTrackBoard" | "P3" => "shiftWorklist" | "P5" => "orSchedule"
  | _ => "scheduleTasks"

/-- Only department activities with a real clinical destination are available. -/
def activities (p : Program) (f : Facts) : List PatientActivity :=
  ((f.patientDirectory?.map (·.activities)).getD []).filter fun a => (target p a.info).isSome

/-- A missing activity falls back to the role's existing landing list. -/
def activity (p : Program) (f : Facts) (s : State) : PatientActivity :=
  let all := activities p f
  let key := (s.patientContext?.map (·.activity)).getD (primary p)
  ((all.find? (·.info == key)).orElse (fun _ => all.find? (·.info == primary p))).getD
    { info := primary p, title := "Patient workspace", rows := [] }

/-- Name and MRN lookup reads directory identities, never a chart's clinical data. -/
def patientMatches (query : String) (p : PatientChoice) : Bool :=
  let q := query.trimAscii.toString.toLower
  let words := ((q.replace "," " ").splitOn " ").filter (· != "")
  let name := p.name.toLower
  q != "" && ((!words.isEmpty && words.all (fun word => (name.splitOn word).length > 1)) ||
    (p.mrn.toLower.splitOn q).length > 1)

/-- The rows on the selected landing activity or the current lookup results. -/
def rows (p : Program) (f : Facts) (s : State) : List PatientListRow :=
  let c := s.patientContext?.getD {}
  if c.query != "" then
    (((f.patientDirectory?.map (·.patients)).getD []).filter (patientMatches c.query)).map fun p =>
      { patient := p.id, fields := [("Patient", p.name), ("MRN", p.mrn)] }
  else if c.activity == "lookup" then [] else (activity p f s).rows

/-- Every source row opens its own patient, even when displayed names have another format. -/
def openControls (p : Program) (f : Facts) (s : State) : List Control :=
  let info := if (s.patientContext?.map (·.activity)).getD "" == "lookup" then primary p else (activity p f s).info
  match target p info with
  | none => []
  | some target => (rows p f s).zipIdx.filterMap fun (row, index) => do
      let patient ← patient? f row.patient
      pure {
        id := "workspace.open|" ++ patient.id ++ "|" ++ toString index ++ "|" ++
          (if (s.patientContext?.map (·.query)).getD "" != "" then "lookup" else info)
        label := "Open chart: " ++ patient.name ++ (if patient.mrn == "" then "" else " (MRN " ++ patient.mrn ++ ")")
        action := .openPatient patient.id target, row? := some index }

/-- Activities and Patient Lookup are semantic navigation actions. -/
def navigation (p : Program) (f : Facts) (s : State) : List Control :=
  let controls : List Control := (activities p f).map (fun a =>
    { id := "workspace.activity|" ++ a.info, label := a.title ++ (if a.info.startsWith "inbox" || a.info == "deficiencies" then " (" ++ toString a.rows.length ++ ")" else ""), action := .showList a.info }) ++
  [{ id := "workspace.lookup", label := "Patient Lookup", action := .showList "lookup" },
   { id := "workspace.return", label := "Return to " ++ (((activities p f).find? (·.info == primary p)).map (·.title)).getD "patient list"
     action := .showList (primary p) }]
  controls.filter fun control =>
      let c := s.patientContext?.getD {}
      if control.id == "workspace.return" then c.patient?.isSome else
      match control.action with
      | .showList activity => c.patient?.isSome || activity != c.activity || c.query != ""
      | _ => true

/-- Resolve only controls that the semantic workspace actually supplies. -/
def action? (p : Program) (f : Facts) (s : State) (id : CompId) : Option Action :=
  ((navigation p f s ++ (if (s.patientContext?.bind (·.patient?)).isNone then openControls p f s else [])).find?
    (·.id == id)).map (·.action)

/-- The initial workspace has no patient, captured values, receipts or chart history. -/
def init (p : Program) : State :=
  { screen := p.start, history := [], captured := [], receipts := [], acked := [], commits := [],
    expanded := [], tabSel := [], currentSlot := 0, clock := 0,
    patientContext? := some { activity := primary p } }

/-- The patient whose chart the state holds: selected and hydrated. Unlike
`bound`, this does not read the facts. New specification for owner review. -/
def chart? (s : State) : Option String :=
  s.patientContext?.bind fun c => if c.patient?.isSome && c.bound? == c.patient? then c.patient? else none

/-- The stored draft of one patient; empty when none is stored. New
specification for owner review. -/
def draft (s : State) (id : String) : PatientDraft :=
  ((s.patientDrafts?.getD []).find? (·.patient == id)).getD { patient := id, captured := [], acked := [] }

/-- The per-patient store without one patient's draft. It is `none` when it
would be empty, so states without drafts serialize as before. New
specification for owner review. -/
def others (s : State) (id : String) : Option (List PatientDraft) :=
  let rest := (s.patientDrafts?.getD []).filter (·.patient != id)
  if rest.isEmpty then none else some rest

/-- New specification for owner review: a capture belongs to signed work
when its element is named by an entry requirement of any commit in `s.commits`.
Requirements identify elements, not individual capture identities; remove all
slots of that element, including conditional/per-order-line requirements. This
conservative rule needs no stale facts and prevents signing the same work again. -/
def signedEntry (sp : Spec) (s : State) (x : Captured) : Bool :=
  sp.entries.any fun rq => s.commits.contains rq.commit && rq.element == x.element

/-- New specification for owner review: captures not covered by a signed
commit's entry requirements. Acknowledgments are independent of signatures. -/
def unsigned (sp : Spec) (s : State) : List Captured :=
  s.captured.filter fun x => !signedEntry sp s x

/-- The per-patient store after leaving the chart: only unsigned captures
and all acknowledgments replace its draft. Commits, receipts and popup are not
kept. Without a hydrated chart the store is unchanged. New specification for
owner review. -/
def save (sp : Spec) (s : State) : Option (List PatientDraft) :=
  match chart? s with
  | none => s.patientDrafts?
  | some id =>
    if (unsigned sp s).isEmpty && s.acked.isEmpty then others s id
    else some ((others s id).getD [] ++ [{ patient := id, captured := unsigned sp s, acked := s.acked }])

/-- A stored capture is restored only if a human entered it and the signed-in
role may still enter its element. Prefilled values, confirmed or not, are not
restored: hydration computes them again from the record. New specification for
owner review. -/
def restorable (sp : Spec) (u : User) (x : Captured) : Bool :=
  x.byHuman && x.confirmed && (sp.element? x.element).any (fun el => el.enteredBy.contains u.role)

/-- The stored captures that hydration restores. -/
def restored (sp : Spec) (u : User) (d : PatientDraft) : List Captured :=
  d.captured.filter (restorable sp u)

/-- Put a stored draft into a freshly hydrated chart. A restored entry
replaces a fresh prefill of the same element and order line. The
acknowledgments are the stored ones. Every other field is the fresh chart's.
New specification for owner review. -/
def restore (sp : Spec) (u : User) (fresh : State) (d : PatientDraft) : State :=
  { fresh with
    captured := fresh.captured.filter (fun y =>
      !(restored sp u d).any (fun x => x.element == y.element && x.slot == y.slot)) ++ restored sp u d
    acked := d.acked }

/-- Opening a chart starts from an empty workspace state before any data is
loaded. The chart being left, if any, is saved as that patient's draft. -/
def openPatient (sp : Spec) (p : Program) (s : State) (id target : String) : State :=
  { init p with clock := s.clock, patientDrafts? := save sp s, patientContext? := some {
      patient? := some id, target? := some target,
      activity := (s.patientContext?.map (·.activity)).getD (primary p),
      query := (s.patientContext?.map (·.query)).getD "" } }

/-- Showing a list leaves the chart: the workspace state is empty again and
the chart being left, if any, is saved as that patient's draft. -/
def showList (sp : Spec) (p : Program) (s : State) (activity : String) : State :=
  { init p with clock := s.clock, patientDrafts? := save sp s, patientContext? := some { activity } }

/-- A clinical page is usable only with facts loaded from the selected source Patient.id. -/
def bound (f : Facts) (s : State) : Bool :=
  match s.patientContext? with
  | some c => c.patient?.isSome && c.patient? == c.bound? && c.patient? == f.sourcePatientId?
  | none => false

/-- Hydration initializes only the selected patient's interpreter, then
restores that patient's stored draft and takes it out of the store. A stale
response cannot bind. -/
def bind (sp : Spec) (p : Program) (f : Facts) (u : User) (s : State) : State :=
  match s.patientContext? with
  | none => s
  | some c =>
    if c.patient?.isNone || c.patient? != f.sourcePatientId? || patient? f (c.patient?.getD "") == none then s
    else if c.bound? == c.patient? then s
    else
      let fresh := Ehr.init sp p f u
      let first := if p.screens.any (·.id == "chartSummary") then "chartSummary" else c.target?.getD p.start
      let entered := restore sp u (goTo sp p f fresh first).1 (draft s (c.patient?.getD ""))
      { entered with clock := s.clock, patientContext? := some { c with bound? := c.patient? },
                     patientDrafts? := others s (c.patient?.getD "") }

/-- This call hydrates the chart: the incoming state is not bound to the
facts' patient and binding it gives a state that is. New specification for
owner review. -/
def hydrates (sp : Spec) (p : Program) (f : Facts) (u : User) (s : State) : Bool :=
  !bound f s && bound f (bind sp p f u s)

/-- A click on a commit button of the current screen. New specification for
owner review. -/
def commitClick (p : Program) (s : State) (id : CompId) : Bool :=
  (p.compsOf s.screen).any fun c => c.id == id && match c.kind with
    | .button (.commit _) => true
    | _ => false

/-- The refusal of a commit click or an acknowledgment on the call that
hydrates a chart, and of a search before the chart is loaded. -/
def loading : StepResult := .blocked "Chart is loading"

/-- Workspace navigation cannot acknowledge a clinical popup or operate
without a patient. The call that hydrates a chart refuses a commit click and
an acknowledgment: the clinician has not yet seen the chart. -/
def step (sp : Spec) (p : Program) (f : Facts) (u : User) (s : State) (e : Event) : State × StepResult :=
  let first := hydrates sp p f u s
  let s := bind sp p f u s
  match e with
  | .click id =>
    match action? p f s id with
    | some action =>
      if s.popup?.isSome then (s, .blocked "Acknowledge the clinical alert before leaving this chart") else
      match action with
      | .openPatient patient target => (openPatient sp p s patient target, .ok)
      | .showList activity => (showList sp p s activity, .ok)
    | none =>
      if !bound f s then (s, .blocked "Select a patient before opening clinical work") else
      if first && commitClick p s id then (s, loading) else
      Ehr.step sp p f u .human s e
  | .scroll _ => if !bound f s then (s, .ok) else Ehr.step sp p f u .human s e
  | .enter "workspace.search" (.text query) =>
    if (s.patientContext?.bind (·.patient?)).isNone then
      ({ s with patientContext? := some { (s.patientContext?.getD {}) with query := query } }, .ok)
    else (s, .blocked "Return to Patient Lookup to search")
  | .search query =>
    if (s.patientContext?.bind (·.patient?)).isNone then
      ({ s with patientContext? := some { (s.patientContext?.getD {}) with query := query } }, .ok)
    else if bound f s then Ehr.step sp p f u .human s e else (s, loading)
  | .ack _ =>
    if !bound f s then (s, .blocked "Select a patient before clinical entry") else
    if first then (s, loading) else Ehr.step sp p f u .human s e
  | _ => if bound f s then Ehr.step sp p f u .human s e else (s, .blocked "Select a patient before clinical entry")

end Ehr.Workspace
