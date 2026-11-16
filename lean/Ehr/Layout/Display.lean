import Ehr.Layout.Format
import Ehr.Render.Json

/-! # Display parts

New specification for owner review. A clinical screen displays *parts*: every
piece of text a user sees is one part with a role. Each part is an occurrence
of the semantic inventory (`Semantic.screenNodes`), so the layout rules, the
safety-text guarantees and the painter see it on its own: a field is a label,
a control, a unit and its annotations, not one composed string. Nothing here
reads a layout; what a part says is decided before any geometry exists.

`ownPart` is what the node's own occurrence shows (its caption); `leafParts`
are the further parts of the node, placed before its child nodes. -/
namespace Ehr.Layout
open Lean Ehr.Render

/-- New specification for owner review: the role of a displayed part. A
painter and a layout select presentation by role; they never read the text. -/
inductive PartRole
  /-- The patient banner landmark (one occurrence; its fields are `runs`). -/
  | banner
  /-- The screen title. -/
  | title
  /-- Static text. -/
  | text
  /-- A structural node with no ink of its own (columns, a tabs or value-set
  wrapper, a presentation hint, a row-action group, a stepper, a board). -/
  | wrapper
  /-- A section, table, timeline, navigation group or pane caption. -/
  | heading
  /-- The caption of a field. -/
  | label
  /-- The control of a field: the target; its text is the displayed value. -/
  | control
  | unit
  /-- The code of a selected choice, when codes are shown beside labels. -/
  | code
  | required
  /-- Entry guidance for a field. -/
  | hint
  /-- Where a prefilled value came from. -/
  | source
  /-- A prefilled value awaits confirmation. -/
  | pending
  /-- Only a human may enter this value. -/
  | human
  /-- A button: a target; its text is the label. -/
  | button
  /-- Why a button is blocked. -/
  | reason
  | hotkey
  /-- One tab of a tabs node: a target. -/
  | tab
  /-- An alert; `tone` and `kind` carry its severity. -/
  | alert
  /-- A column or cell caption of an info table. -/
  | cellLabel
  | cellValue
  /-- A cell whose value is a state; `tone` classifies it. -/
  | status
  /-- A cell whose value is a flag (for example a result flag). -/
  | badge
  /-- The explicit statement that an info table has no rows. -/
  | empty
  /-- One step of a stepper. -/
  | step
  /-- One record of a list a node carries beside its children (a dated source,
  a reference curve, a quick-pick option list). -/
  | item
  /-- New specification for owner review: where the window of a bounded list
  is, "Records a–b of n". -/
  | position
  /-- New specification for owner review: a pager target of a bounded list (the
  previous page, the next page, the page selector, the next page with a flagged
  record). `comp` is the list and `col` the page it selects. -/
  | pager
  /-- New specification for owner review: how many flagged records of a
  bounded list are on other pages. -/
  | flagged
  deriving Repr, DecidableEq, Inhabited, ToJson, FromJson

/-- New specification for owner review: the role of a run inside the banner. -/
inductive RunRole | name | identity | badge | detail | clinician | separator
  deriving Repr, DecidableEq, Inhabited, ToJson, FromJson

/-- New specification for owner review: a run is a stretch of a part's text
with one role. The text of a part with runs is exactly their concatenation. -/
structure Run where
  role : RunRole
  text : String
  deriving Repr, DecidableEq, Inhabited, ToJson, FromJson

/-- New specification for owner review: one displayed part.

`text` is what is measured, wrapped and painted. `raw` is the datum it
presents; it differs from `text` only where a formatter rewords the datum.
The remaining fields are the part's state for the painter and a layout; none
of them is drawn as text. -/
structure Part where
  role : PartRole
  text : String := ""
  raw : String := text
  /-- The user can operate this part. -/
  target : Bool := false
  /-- The current-task commit. -/
  commit : Bool := false
  /-- Component identity of the control, button, tab, alert or info. -/
  comp : String := ""
  /-- Native control kind of a control; the role of a button; the severity of
  an alert; the display mode of an info heading; the presentation kind. -/
  kind : String := ""
  /-- Colour class decided in Lean: `red`, `orange`, `yellow`, `green`, `blue`,
  `violet`, `gray`, or a result flag `critical`, `high`, `low`. -/
  tone : String := ""
  /-- The selected tab, the current step, the active navigation link, a
  checked flag, a required field's label. -/
  selected : Bool := false
  /-- False for a blocked button. -/
  enabled : Bool := true
  /-- Row and column of an info cell; the row of a row-action group. -/
  row : Option Nat := none
  col : Option Nat := none
  runs : List Run := []
  /-- The choices of a select control, code and label, in order: data for its
  popup, never painted as text. -/
  options : List (String × String) := []
  /-- The value kind of a field, from which its entry event is built. -/
  entry : String := ""
  /-- The unit a field's value is entered in. -/
  unit : String := ""
  /-- What an empty control shows. -/
  placeholder : String := ""
  deriving Repr, DecidableEq, Inhabited

/-- Only fields that differ from their defaults are written. -/
instance : ToJson Part where
  toJson p := Json.mkObj (
    [("role",toJson p.role),("text",toJson p.text)] ++
    (if p.raw == p.text then [] else [("raw",toJson p.raw)]) ++
    (if p.target then [("target",toJson true)] else []) ++
    (if p.commit then [("commit",toJson true)] else []) ++
    (if p.comp == "" then [] else [("comp",toJson p.comp)]) ++
    (if p.kind == "" then [] else [("kind",toJson p.kind)]) ++
    (if p.tone == "" then [] else [("tone",toJson p.tone)]) ++
    (if p.selected then [("selected",toJson true)] else []) ++
    (if p.enabled then [] else [("enabled",toJson false)]) ++
    (p.row.map fun r => ("row",toJson r)).toList ++
    (p.col.map fun c => ("col",toJson c)).toList ++
    (if p.runs.isEmpty then [] else [("runs",toJson p.runs)]) ++
    (if p.options.isEmpty then [] else [("options",toJson p.options)]) ++
    (if p.entry == "" then [] else [("entry",toJson p.entry)]) ++
    (if p.unit == "" then [] else [("unit",toJson p.unit)]) ++
    (if p.placeholder == "" then [] else [("placeholder",toJson p.placeholder)]))

/-- New specification for owner review: the lines a part reserves in the
reference layouts: two for a control, a button and an alert, one otherwise. -/
def Part.lines (p : Part) : Nat :=
  match p.role with
  | .control | .button | .alert => 2
  | _ => 1

/-- New specification for owner review: what a part needs to know beyond its
node: inherited choices and the screen's field metadata. -/
structure DisplayCx where
  /-- Options of the enclosing value set: code and label. -/
  options : List (String × String) := []
  allowCustom : Bool := false
  fieldChoices : List (String × UiCodeChoices) := []
  fieldSources : List (String × String) := []
  sourceLabels : List (String × String) := []
  entryHints : List (String × String) := []
  activeNav : Option String := none
  /-- Components with an explicit confirmation button on the screen. -/
  confirms : List String := []
  /-- New specification for owner review: the windows of the screen's bounded
  lists (`UiScreen.windows?`). -/
  windows : List UiWindow := []
  deriving Inhabited

/-! ## Fields -/

/-- The base of a field kind: `code:a|b` is `code`. -/
def kindBase (kind : String) : String := (kind.splitOn ":").headD ""

/-- New specification for owner review: options listed in the kind itself
(`code:a|b|c`); the code is the label. -/
def kindOptions (kind : String) : List (String × String) :=
  match kind.splitOn ":" with
  | _ :: rest => (((":".intercalate rest).splitOn "|").filter (· != "")).map fun c => (c,c)
  | [] => []

/-- New specification for owner review: the choices of a field: the screen's
quick picks for the component, otherwise the enclosing value set, otherwise
the options listed in its kind. -/
def fieldOptions (cx : DisplayCx) (comp kind : String) : List (String × String) :=
  match cx.fieldChoices.lookup comp with
  | some set => set.options
  | none => if cx.options.isEmpty then kindOptions kind else cx.options

def fieldAllowsOther (cx : DisplayCx) (comp : String) : Bool :=
  match cx.fieldChoices.lookup comp with
  | some set => set.allowOther
  | none => cx.allowCustom

def fieldShowsCode (cx : DisplayCx) (comp : String) : Bool :=
  ((cx.fieldChoices.lookup comp).map (·.showCode)).getD false

def codedKind (kind : String) : Bool := kindBase kind == "code" || kindBase kind == "coded"

/-- New specification for owner review: the native control a field's control
part is drawn as. A coded field with a closed list is a select; a coded field
that accepts other codes stays a text entry. -/
def controlKind (cx : DisplayCx) (comp kind : String) : String :=
  let base := kindBase kind
  if base == "flag" then "checkbox"
  else if base == "qty" || base == "quantity" || base == "number" then "number"
  else if codedKind kind && !fieldAllowsOther cx comp && !(fieldOptions cx comp kind).isEmpty then "select"
  else if base == "observation-time" then "datetime"
  else if base == "textarea" || base == "text" then "textarea"
  else if base == "search" then "search"
  else "text"

/-- New specification for owner review: the text a field's control displays.
A coded value shows the label of its option, not its code; a value without an
option, and every other kind of value, is shown as recorded (formatted by
`Format.fieldValue`). -/
def controlText (cx : DisplayCx) (comp kind : String) (value : Option String) : String :=
  match value with
  | none => ""
  | some v =>
    if codedKind kind then ((fieldOptions cx comp kind).lookup v).getD (Format.fieldValue kind v)
    else Format.fieldValue kind v

/-- New specification for owner review: the caption of a prefill source: the
screen's caption for the field, otherwise its label for the source, otherwise
the plain name of the kind of source. A caption that only names an internal
binding reads "Source"; the recorded source stays the part's `raw`. -/
def sourceCaption (cx : DisplayCx) (comp source : String) : String :=
  let caption := match cx.fieldSources.lookup comp with
    | some caption => caption
    | none => (cx.sourceLabels.lookup source).getD (Format.provenance source)
  if Format.internalSource caption then "Source" else caption

def optionList (xs : List Part) (present : Bool) : List Part := if present then xs else []

/-- New specification for owner review: the options a select offers: the
field's choices, and the recorded value itself when it is not among them, so
that a recorded value is never dropped from its own control. -/
def selectOptions (cx : DisplayCx) (comp kind : String) (value : Option String) : List (String × String) :=
  let options := fieldOptions cx comp kind
  match value with
  | some v => if v == "" || (options.lookup v).isSome then options else options ++ [(v,v)]
  | none => options

/-- New specification for owner review: the control of a field: the target.
Its text is the displayed value, `raw` the recorded one. -/
def controlPart (cx : DisplayCx) (comp label kind : String) (value unit : Option String) : Part :=
  { role := .control, text := controlText cx comp kind value, raw := value.getD "", target := true, comp,
    kind := controlKind cx comp kind, selected := kindBase kind == "flag" && value == some "true",
    options := if controlKind cx comp kind == "select" then selectOptions cx comp kind value else [],
    entry := kind, unit := unit.getD "", placeholder := Format.fieldPlaceholder label (controlKind cx comp kind) }

/-- New specification for owner review: the confirmation of a prefilled value.
Without an explicit confirmation button on the screen it is a target that
confirms the value. -/
def pendingPart (cx : DisplayCx) (comp : String) : Part :=
  if cx.confirms.contains comp then { role := .pending, text := "Confirmation pending", comp }
  else { role := .pending, text := "Confirm", raw := "Confirmation pending", target := true, comp, kind := "confirm" }

/-- New specification for owner review: the parts of a field after its label,
in reading order: control, unit, code, required marker, hint, source,
confirmation, human-entry marker. A part is present only when its datum is.

A pending confirmation without an explicit confirmation button is a target
of its own: it confirms the value, and the control stays an editor. -/
def fieldParts (cx : DisplayCx) (comp label kind : String) (value unit provenance : Option String)
    (pending human required : Bool) : List Part :=
  [controlPart cx comp label kind value unit] ++
  (unit.map fun u => ({ role := .unit, text := Format.unit u, raw := u } : Part)).toList ++
  (match value with
    | some v => optionList [{ role := .code, text := v }]
        (fieldShowsCode cx comp && ((fieldOptions cx comp kind).lookup v).isSome)
    | none => []) ++
  optionList [{ role := .required, text := "Required" }] required ++
  ((cx.entryHints.lookup comp).map fun hint => ({ role := .hint, text := hint } : Part)).toList ++
  (provenance.map fun source =>
    ({ role := .source, text := sourceCaption cx comp source, raw := source } : Part)).toList ++
  optionList [pendingPart cx comp] pending ++
  optionList [{ role := .human, text := "Human entry" }] human

/-! ## Buttons, alerts, tabs, steps -/

/-- New specification for owner review: the colour class of a severity. -/
def severityTone (severity : String) : String :=
  let s := severity.toLower
  if severity == "interruptive" then "red"
  else if ["removable","passive","fyi","notice","information","info","advisory"].contains s then "yellow"
  else if ["severe","critical","error","high","danger"].contains s then "red"
  else if ["warning","caution","moderate"].contains s then "orange"
  else if ["success","successful"].contains s then "green"
  else "blue"

/-- New specification for owner review: the parts of a button after its
label: the reason it is blocked, and its hotkey. A blocked button without a
recorded reason still says that it is unavailable. -/
def buttonParts (enabled : Bool) (reason hotkey : Option String) : List Part :=
  optionList [{ role := .reason, text := reason.getD "Unavailable", raw := reason.getD "" }]
    (!enabled || reason.isSome) ++
  (hotkey.map fun key => ({ role := .hotkey, text := key } : Part)).toList

/-- New specification for owner review: one target per tab label; the selected
tab is a flag on its part, and its position among the parts is the tab index. -/
def tabPart (id : String) (selected : Nat) (tab : String × Nat) : Part :=
  { role := .tab, text := tab.1, target := true, comp := id, kind := "tab", selected := tab.2 == selected,
    col := some tab.2 }

def tabParts (id : String) (labels : List String) (selected : Nat) : List Part :=
  labels.zipIdx.map (tabPart id selected)

/-- New specification for owner review: one part per step, numbered in order;
the current step is flagged. -/
def stepPart (current : Nat) (step : (String × String) × Nat) : Part :=
  { role := .step, text := toString (step.2+1) ++ ". " ++ Format.sectionCaption step.1.2, raw := step.1.2,
    comp := step.1.1, selected := step.2 == current, col := some step.2 }

def stepParts (steps : List (String × String)) (current : Nat) : List Part :=
  steps.zipIdx.map (stepPart current)

/-! ## Info tables -/

/-- New specification for owner review: the role and tone of a value cell. A
cell under a state column is a status; a result flag is a badge. -/
def cellRole (key value : String) : PartRole × String :=
  if Format.statusColumn key then (.status,Format.statusTone value)
  else if key == "Flag" || key == "Abnormal" then (.badge,Format.resultTone value)
  else (.cellValue,"")

def valueCell (infoId : String) (row : List (String × String)) (r c : Nat) (cell : String × String) : Part :=
  { role := (cellRole cell.1 cell.2).1, text := Format.cellText infoId row cell.1 cell.2, raw := cell.2,
    tone := (cellRole cell.1 cell.2).2, row := some r, col := some c }

def labelCell (r c : Nat) (key : String) : Part :=
  { role := .cellLabel, text := Format.columnCaption key, raw := key, row := some r, col := some c }

/-- New specification for owner review: all rows carry the same captions in
the same order, and there are at least two rows: the captions are shown once,
as a header. -/
def uniformRows (rows : List (List (String × String))) : Bool :=
  match rows with
  | first :: second :: rest => (second :: rest).all fun row => row.map Prod.fst == first.map Prod.fst
  | _ => false

/-- New specification for owner review: the cells of an info table, each with
its row and column. A uniform table shows its captions once (row 0), then one
value cell per record cell; otherwise every value cell follows its own
caption. An empty table says so. -/
def infoParts (infoId display : String) (rows : List (List (String × String))) : List Part :=
  if rows.isEmpty then
    optionList [{ role := .empty, text := Format.emptyInfo infoId }] (display != "status")
  else if uniformRows rows then
    ((rows.headD []).zipIdx.map fun (cell,c) => labelCell 0 c cell.1) ++
    rows.zipIdx.flatMap fun (row,r) => row.zipIdx.map fun (cell,c) => valueCell infoId row r c cell
  else
    rows.zipIdx.flatMap fun (row,r) => row.zipIdx.flatMap fun (cell,c) =>
      [labelCell r c cell.1, valueCell infoId row r c cell]

/-! ## Bounded lists

New specifications for owner review. A list the layout bounds
(`Ehr.Layout.Window`) shows one page of its records; these parts say where the
page is and reach the others. They come before the list's cells. -/

/-- The first record (counting from 1) of page `p`. -/
def windowFirst (w : UiWindow) (p : Nat) : Nat := p * w.size + 1

/-- The last record (counting from 1) of page `p`. -/
def windowLast (w : UiWindow) (p : Nat) : Nat := min w.total ((p+1) * w.size)

/-- The records of page `p`, as the page selector names it. -/
def pageOption (w : UiWindow) (p : Nat) : String :=
  "Page " ++ toString (p+1) ++ ": records " ++ toString (windowFirst w p) ++ "–" ++ toString (windowLast w p)

/-- "Records a–b of n". -/
def positionText (w : UiWindow) : String :=
  "Records " ++ toString (windowFirst w w.page) ++ "–" ++ toString (windowLast w w.page) ++ " of " ++ toString w.total

/-- How many flagged records are on other pages; it says so when none are. -/
def flaggedText (n : Nat) : String :=
  if n == 0 then "No flagged records on other pages"
  else if n == 1 then "1 flagged record on another page"
  else toString n ++ " flagged records on other pages"

/-- The parts of a window, in reading order: the position, the flagged count,
then four targets: the previous page, the next page, the page selector (a
select whose options are every page) and the next page with a flagged record.
A target that cannot move is shown but not enabled. -/
def pagerParts (w : UiWindow) : List Part :=
  [{ role := .position, text := positionText w, comp := w.comp, kind := "position", col := some w.page },
   { role := .flagged, text := flaggedText w.flaggedElsewhere, comp := w.comp, kind := "flagged",
     tone := if w.flaggedElsewhere == 0 then "" else "red" },
   { role := .pager, text := "Previous page", target := true, comp := w.comp, kind := "previous",
     col := some (w.page - 1), enabled := decide (0 < w.page) },
   { role := .pager, text := "Next page", target := true, comp := w.comp, kind := "next",
     col := some (w.page + 1), enabled := decide (w.page + 1 < w.pages) },
   { role := .pager, text := "Page " ++ toString (w.page+1) ++ " of " ++ toString w.pages, target := true,
     comp := w.comp, kind := "page", col := some w.page, selected := true,
     options := (List.range w.pages).map fun q => (toString q, pageOption w q) },
   { role := .pager, text := "Next flagged", target := true, comp := w.comp, kind := "nextFlagged",
     col := some (w.nextFlagged?.getD w.page), enabled := w.nextFlagged?.isSome }]

/-- The window parts of a list component, if the layout bounds it. -/
def windowParts (cx : DisplayCx) (comp : String) : List Part :=
  match cx.windows.find? (·.comp == comp) with
  | some w => pagerParts w
  | none => []

/-! ## Banner -/

/-- New specification for owner review: the role of a banner field by its
caption: the patient name; date of birth, record number, age and sex; the
badges (allergies, code status, isolation, weight); any other detail. -/
def bannerRunRole (key : String) : RunRole :=
  let k := key.toLower
  if k == "patient" || k == "name" || k == "patient name" then .name
  else if k == "dob" || k == "mrn" || (k.startsWith "age" && k.endsWith "sex") then .identity
  else if Format.hasSub k "allerg" || Format.hasSub k "code status" || Format.hasSub k "isolation" ||
      Format.hasSub k "weight" then .badge
  else .detail

/-- New specification for owner review: one banner field as a run. The name
stands alone; every other field reads as `Format.bannerField` puts it. -/
def bannerRun (pair : String × String) : Run :=
  match bannerRunRole pair.1 with
  | .name => ⟨.name,pair.2⟩
  | role => ⟨role,Format.bannerField pair.1 pair.2⟩

def joinRuns : List Run → List Run
  | [] => []
  | [run] => [run]
  | run :: rest => run :: ⟨.separator,"  "⟩ :: joinRuns rest

/-- New specification for owner review: the banner's runs in display order:
the patient name, the identity fields, the badges (allergies, code status,
isolation, weight), the remaining details, then the signed-in clinician. -/
def bannerRuns (banner : List (String × String)) (viewer : Option String) : List Run :=
  let of (role : RunRole) := (banner.filter fun pair => bannerRunRole pair.1 == role).map bannerRun
  joinRuns (of .name ++ of .identity ++ of .badge ++ of .detail ++
    (viewer.map fun v => (⟨.clinician,"Signed in: " ++ v⟩ : Run)).toList)

def runsText (runs : List Run) : String := String.join (runs.map (·.text))

/-- New specification for owner review: the banner is one part, so rule G1
keeps all of it fixed on screen; its fields are runs of that part. -/
def bannerPart (banner : List (String × String)) (viewer : Option String) : Part :=
  { role := .banner, text := runsText (bannerRuns banner viewer), runs := bannerRuns banner viewer }

/-! ## Lists a node carries beside its children -/

/-- New specification for owner review: a board demand: the patient (name and
record number when the banner has them, otherwise the pane identifier), then
the alert. -/
def demandPart (d : UiBoardDemand) : Part :=
  let name := (d.banner.lookup "Patient").getD d.patient
  let who := match d.banner.lookup "MRN" with
    | some mrn => name ++ " · MRN " ++ mrn
    | none => name
  { role := .alert, text := who ++ " · " ++ d.label, raw := d.label, comp := d.alertId, kind := d.severity,
    tone := severityTone d.severity }

/-- New specification for owner review: a dated source: its UTC instant, then
the record, field and recorded timestamp it was read from. -/
def datedPart (item : UiDatedItem) : Part :=
  { role := .item, kind := "dated", raw := item.source.timestamp,
    text := Format.utcInstant item.utcSecond item.nanosecond.val ++ " · " ++ item.source.resource ++ " · " ++
      item.source.field ++ " · " ++ item.source.timestamp }

/-- New specification for owner review: a source without a usable instant
says so, then its record, field and recorded timestamp. -/
def undatedPart (source : UiSourceDate) : Part :=
  { role := .item, kind := "undated", raw := source.timestamp,
    text := "Time or offset unavailable · " ++ source.resource ++ " · " ++ source.field ++ " · " ++ source.timestamp }

/-- New specification for owner review: a reference curve: what it measures,
its percentile, source and population, then every sample as age in months and
value. -/
def referencePart (ref : UiChartReference) : Part :=
  { role := .item, kind := "reference", raw := ref.measure,
    text := ref.measure ++ " (" ++ ref.unit ++ ") · percentile " ++ ref.percentile ++ " · " ++ ref.source ++ " · " ++
      ref.population ++ " · " ++ "; ".intercalate (ref.points.map fun (month,value) =>
        Format.tenths month ++ " mo: " ++ Format.hundredths value) }

/-- New specification for owner review: the urgent alerts and acknowledgments
a patient pane carries. -/
def stripAtomPart : UiStripAtom → Part
  | .alert comp _ label severity =>
    { role := .alert, text := label, comp, kind := severity, tone := severityTone severity }
  | .button comp label role enabled _ _ =>
    { role := .button, text := Format.controlCaption label, raw := label, target := true, comp, kind := role, enabled }

/-! ## Every node -/

/-- New specification for owner review: what a node's own occurrence shows.
A field shows its label, a button its label, an alert its label with the
severity as tone, a section, table or timeline its caption. A node with no
caption is a wrapper with no text. No JSON is displayed. -/
def ownPart (cx : DisplayCx) : UiNode → Part
  | .text s => { role := .text, text := s }
  | .section id title _ => { role := .heading, text := Format.sectionCaption title, raw := title, comp := id }
  | .timeline title _ => { role := .heading, text := Format.sectionCaption title, raw := title, kind := "timeline" }
  | .datedTimeline title _ _ _ =>
    { role := .heading, text := Format.sectionCaption title, raw := title, kind := "datedTimeline" }
  | .columns _ => { role := .wrapper, kind := "columns" }
  | .presentation kind _ => { role := .wrapper, kind := (toJson kind).getStr?.toOption.getD "presentation" }
  | .tabs id _ _ _ => { role := .wrapper, comp := id, kind := "tabs" }
  | .stepper _ _ => { role := .wrapper, kind := "stepper" }
  | .valueSet _ _ _ => { role := .wrapper, kind := "valueSet" }
  | .chartReferences _ _ => { role := .wrapper, kind := "chartReferences" }
  | .rowAction target row _ => { role := .wrapper, comp := target, kind := "rowAction", row := some row }
  | .board _ _ => { role := .wrapper, kind := "board" }
  | .patientPane patient banner _ _ _ =>
    { role := .heading, comp := patient, kind := "patientPane",
      text := if banner.isEmpty then patient else runsText (bannerRuns banner none),
      runs := if banner.isEmpty then [] else bannerRuns banner none }
  | .field comp label _ _ _ _ _ _ required =>
    { role := .label, text := Format.fieldCaption label, raw := label, comp, selected := required }
  | .info comp label infoId display _ =>
    { role := .heading, text := Format.sectionCaption label, raw := label,
      comp := if comp == "" then infoId else comp, kind := display, tone := Format.sectionTone label }
  | .alert comp _ label severity =>
    { role := .alert, text := label, comp, kind := severity, tone := severityTone severity }
  | .button comp label role enabled _ _ =>
    { role := .button, text := Format.controlCaption label, raw := label, target := true,
      commit := role == "primary", comp, kind := role, enabled,
      selected := role == "nav" && cx.activeNav == some comp }

/-- New specification for owner review: the further parts of a node, in
reading order, before its child nodes. -/
def leafParts (cx : DisplayCx) : UiNode → List Part
  | .field comp label kind value unit provenance pending human required =>
    fieldParts cx comp label kind value unit provenance pending human required
  | .button _ _ _ enabled reason hotkey => buttonParts enabled reason hotkey
  | .tabs id labels selected _ => tabParts id labels selected
  | .stepper steps current => stepParts steps current
  | .info comp _ infoId display rows => windowParts cx comp ++ infoParts infoId display rows
  | .board urgent _ => urgent.map demandPart
  | .datedTimeline _ dated undated _ => dated.map datedPart ++ undated.map undatedPart
  | .chartReferences references _ => references.map referencePart
  | .patientPane _ _ metadata _ _ => (metadata.urgent?.getD []).map stripAtomPart
  | _ => []

/-- The text of a node's own occurrence. It does not depend on the context. -/
def semanticText (node : UiNode) : String := (ownPart {} node).text

theorem ownPart_text (cx : DisplayCx) (node : UiNode) : (ownPart cx node).text = semanticText node := by
  cases node <;> rfl

/-- New specification for owner review: the context of the nodes inside a
value set: its options and whether other codes are accepted. -/
def DisplayCx.inValueSet (cx : DisplayCx) (options : List UiCodeChoice) (allowCustom : Bool) : DisplayCx :=
  { cx with options := options.map fun o => (o.code,o.label), allowCustom }

/-- New specification for owner review: the context of the nodes inside a
patient pane: the pane's own metadata. -/
def DisplayCx.inPane (cx : DisplayCx) (metadata : UiPaneMetadata) : DisplayCx :=
  { cx with fieldChoices := metadata.fieldChoices, fieldSources := metadata.fieldSources,
            sourceLabels := metadata.sourceLabels, entryHints := metadata.entryHints }

/-! ## Nothing is lost

New specifications for owner review. For each kind of node, its parts carry
every datum the node carries. Together with `Realizes`, which shows the
complete text of every occurrence (`Range.realized_part`), no label, value,
unit, source, flag, row, cell, step or selection can be dropped or abbreviated
by a layout. -/

/-- New specification for owner review: a field's label, value, unit, source
and flags each have a part. -/
theorem field_complete (cx : DisplayCx) (comp label kind : String) (value unit provenance : Option String)
    (pending human required : Bool) :
    let node := UiNode.field comp label kind value unit provenance pending human required
    (ownPart cx node).role = .label ∧ (ownPart cx node).raw = label ∧
    (ownPart cx node).text = Format.fieldCaption label ∧
    (∃ p ∈ leafParts cx node, p.role = .control ∧ p.target = true ∧ p.comp = comp ∧
      p.raw = value.getD "" ∧ p.text = controlText cx comp kind value) ∧
    (∀ u, unit = some u → ∃ p ∈ leafParts cx node, p.role = .unit ∧ p.raw = u ∧ p.text = Format.unit u) ∧
    (∀ s, provenance = some s → ∃ p ∈ leafParts cx node, p.role = .source ∧ p.raw = s ∧
      p.text = sourceCaption cx comp s) ∧
    (pending = true → ∃ p ∈ leafParts cx node, p.role = .pending) ∧
    (human = true → ∃ p ∈ leafParts cx node, p.role = .human ∧ p.text = "Human entry") ∧
    (required = true → ∃ p ∈ leafParts cx node, p.role = .required ∧ p.text = "Required") ∧
    (∀ hint, cx.entryHints.lookup comp = some hint → ∃ p ∈ leafParts cx node, p.role = .hint ∧ p.text = hint) := by
  refine ⟨rfl,rfl,rfl,⟨controlPart cx comp label kind value unit,by simp [leafParts,fieldParts],rfl,rfl,rfl,rfl,rfl⟩,
    ?_,?_,?_,?_,?_,?_⟩
  · intro u hu
    exact ⟨{ role := .unit, text := Format.unit u, raw := u },by simp [leafParts,fieldParts,hu],rfl,rfl,rfl⟩
  · intro s hs
    exact ⟨{ role := .source, text := sourceCaption cx comp s, raw := s },by simp [leafParts,fieldParts,hs],rfl,rfl,rfl⟩
  · intro hp
    refine ⟨pendingPart cx comp,by simp [leafParts,fieldParts,optionList,hp],?_⟩
    unfold pendingPart
    split <;> rfl
  · intro hh
    exact ⟨{ role := .human, text := "Human entry" },by simp [leafParts,fieldParts,optionList,hh],rfl,rfl⟩
  · intro hr
    exact ⟨{ role := .required, text := "Required" },by simp [leafParts,fieldParts,optionList,hr],rfl,rfl⟩
  · intro hint hh
    exact ⟨{ role := .hint, text := hint },by simp [leafParts,fieldParts,hh],rfl,rfl⟩

/-- New specification for owner review: a coded value is displayed as the
label of its option; without an option it is displayed as recorded. -/
theorem control_shows_choice (cx : DisplayCx) (comp kind code label : String) (coded : codedKind kind = true)
    (option : (fieldOptions cx comp kind).lookup code = some label) :
    controlText cx comp kind (some code) = label := by
  simp [controlText,coded,option]

/-- New specification for owner review: a button's label, state, blocked
reason and hotkey each have a part; a blocked button always states a reason. -/
theorem button_complete (cx : DisplayCx) (comp label role : String) (enabled : Bool) (reason hotkey : Option String) :
    let node := UiNode.button comp label role enabled reason hotkey
    (ownPart cx node).role = .button ∧ (ownPart cx node).raw = label ∧
    (ownPart cx node).text = Format.controlCaption label ∧ (ownPart cx node).target = true ∧
    (ownPart cx node).enabled = enabled ∧ (ownPart cx node).kind = role ∧ (ownPart cx node).comp = comp ∧
    (enabled = false → ∃ p ∈ leafParts cx node, p.role = .reason ∧ p.text = reason.getD "Unavailable") ∧
    (∀ r, reason = some r → ∃ p ∈ leafParts cx node, p.role = .reason ∧ p.text = r ∧ p.raw = r) ∧
    (∀ key, hotkey = some key → ∃ p ∈ leafParts cx node, p.role = .hotkey ∧ p.text = key) := by
  refine ⟨rfl,rfl,rfl,rfl,rfl,rfl,rfl,?_,?_,?_⟩
  · intro blocked
    exact ⟨{ role := .reason, text := reason.getD "Unavailable", raw := reason.getD "" },
      by simp [leafParts,buttonParts,optionList,blocked],rfl,rfl⟩
  · intro r hr
    exact ⟨{ role := .reason, text := r, raw := r },by simp [leafParts,buttonParts,optionList,hr],rfl,rfl,rfl⟩
  · intro key hk
    exact ⟨{ role := .hotkey, text := key },by simp [leafParts,buttonParts,hk],rfl,rfl⟩

/-- New specification for owner review: an alert shows its label; its severity
is carried as the part's kind and decides its tone. -/
theorem alert_complete (cx : DisplayCx) (comp alertId label severity : String) :
    let part := ownPart cx (.alert comp alertId label severity)
    part.role = .alert ∧ part.text = label ∧ part.kind = severity ∧ part.tone = severityTone severity ∧
    part.comp = comp :=
  ⟨rfl,rfl,rfl,rfl,rfl⟩

/-- New specification for owner review: a section shows its title. -/
theorem section_complete (cx : DisplayCx) (id title : String) (children : List UiNode) :
    let part := ownPart cx (.section id title children)
    part.role = .heading ∧ part.raw = title ∧ part.text = Format.sectionCaption title :=
  ⟨rfl,rfl,rfl⟩

private theorem zipIdx_at {α : Type} (xs : List α) (i : Nat) (x : α) (h : xs[i]? = some x) :
    (x,i) ∈ xs.zipIdx := by
  apply List.mem_zipIdx_iff_getElem?.mpr
  simpa using h

/-- New specification for owner review: every tab label has a target part,
and exactly the selected one is flagged. -/
theorem tabs_complete (cx : DisplayCx) (id : String) (labels : List String) (selected : Nat) (body : List UiNode)
    (i : Nat) (label : String) (h : labels[i]? = some label) :
    ∃ p ∈ leafParts cx (.tabs id labels selected body), p.role = .tab ∧ p.text = label ∧ p.target = true ∧
      p.comp = id ∧ p.col = some i ∧ (p.selected = true ↔ i = selected) := by
  refine ⟨tabPart id selected (label,i),?_,rfl,rfl,rfl,rfl,rfl,by simp [tabPart]⟩
  exact List.mem_map.mpr ⟨(label,i),zipIdx_at labels i label h,rfl⟩

/-- New specification for owner review: every step has a part, and exactly
the current one is flagged. -/
theorem stepper_complete (cx : DisplayCx) (steps : List (String × String)) (current i : Nat)
    (step : String × String) (h : steps[i]? = some step) :
    ∃ p ∈ leafParts cx (.stepper steps current), p.role = .step ∧ p.raw = step.2 ∧ p.comp = step.1 ∧
      p.col = some i ∧ (p.selected = true ↔ i = current) := by
  refine ⟨stepPart current (step,i),?_,rfl,rfl,rfl,rfl,by simp [stepPart]⟩
  exact List.mem_map.mpr ⟨(step,i),zipIdx_at steps i step h,rfl⟩

/-- New specification for owner review: an info table shows its caption, and
every cell of every row has a value part at its row and column, with its
caption at the same column (in the header row of a uniform table, otherwise
in its own row). -/
theorem info_complete (cx : DisplayCx) (comp label infoId display : String) (rows : List (List (String × String)))
    (r c : Nat) (row : List (String × String)) (cell : String × String)
    (hr : rows[r]? = some row) (hc : row[c]? = some cell) :
    let node := UiNode.info comp label infoId display rows
    (ownPart cx node).role = .heading ∧ (ownPart cx node).raw = label ∧
    (∃ p ∈ leafParts cx node, p.row = some r ∧ p.col = some c ∧ p.raw = cell.2 ∧
      p.text = Format.cellText infoId row cell.1 cell.2 ∧ p.role = (cellRole cell.1 cell.2).1) ∧
    (∃ p ∈ leafParts cx node, p.role = .cellLabel ∧ p.col = some c ∧ p.raw = cell.1 ∧
      p.text = Format.columnCaption cell.1 ∧ (p.row = some r ∨ p.row = some 0)) := by
  have rowMember := zipIdx_at rows r row hr
  have cellMember := zipIdx_at row c cell hc
  have nonempty : rows.isEmpty = false := by
    cases rows with
    | nil => simp at hr
    | cons => rfl
  have lift : ∀ p, p ∈ infoParts infoId display rows → p ∈ leafParts cx (.info comp label infoId display rows) :=
    fun p member => List.mem_append_right _ member
  refine ⟨rfl,rfl,?_,?_⟩
  · refine ⟨valueCell infoId row r c cell,lift _ ?_,rfl,rfl,rfl,rfl,rfl⟩
    simp only [infoParts,nonempty,Bool.false_eq_true,↓reduceIte]
    split
    · exact List.mem_append_right _ (List.mem_flatMap.mpr ⟨(row,r),rowMember,
        List.mem_map.mpr ⟨(cell,c),cellMember,rfl⟩⟩)
    · exact List.mem_flatMap.mpr ⟨(row,r),rowMember,List.mem_flatMap.mpr ⟨(cell,c),cellMember,by simp⟩⟩
  · suffices h : ∃ p ∈ infoParts infoId display rows, p.role = .cellLabel ∧ p.col = some c ∧ p.raw = cell.1 ∧
        p.text = Format.columnCaption cell.1 ∧ (p.row = some r ∨ p.row = some 0) by
      obtain ⟨p,member,rest⟩ := h
      exact ⟨p,lift p member,rest⟩
    simp only [infoParts,nonempty,Bool.false_eq_true,↓reduceIte]
    split
    next uniform =>
      -- The header row is the first row's captions; a uniform table has the same captions in every row.
      obtain ⟨first,second,rest,rfl⟩ : ∃ first second rest, rows = first :: second :: rest := by
        match rows, uniform with
        | first :: second :: rest, _ => exact ⟨first,second,rest,rfl⟩
      have same : row.map Prod.fst = first.map Prod.fst := by
        cases r with
        | zero => simp at hr; rw [hr]
        | succ k =>
          have inTail : row ∈ second :: rest := List.mem_of_getElem? (by simpa using hr)
          simpa using List.all_eq_true.mp uniform row inTail
      have key : (first.map Prod.fst)[c]? = some cell.1 := by
        rw [← same,List.getElem?_map,hc]; rfl
      obtain ⟨headCell,hh,hk⟩ : ∃ headCell, first[c]? = some headCell ∧ headCell.1 = cell.1 := by
        rw [List.getElem?_map] at key
        cases hf : first[c]? with
        | none => simp [hf] at key
        | some headCell => exact ⟨headCell,rfl,by simpa [hf] using key⟩
      refine ⟨labelCell 0 c headCell.1,?_,rfl,rfl,by rw [hk]; rfl,by rw [hk]; rfl,Or.inr rfl⟩
      exact List.mem_append_left _ (List.mem_map.mpr ⟨(headCell,c),zipIdx_at first c headCell hh,rfl⟩)
    · refine ⟨labelCell r c cell.1,?_,rfl,rfl,rfl,rfl,Or.inl rfl⟩
      exact List.mem_flatMap.mpr ⟨(row,r),rowMember,List.mem_flatMap.mpr ⟨(cell,c),cellMember,by simp⟩⟩

/-- New specification for owner review: an empty table says that it is empty
(a status line has only its caption). -/
theorem info_empty (cx : DisplayCx) (comp label infoId display : String) (shown : display ≠ "status") :
    ∃ p ∈ leafParts cx (.info comp label infoId display []), p.role = .empty ∧ p.text = Format.emptyInfo infoId := by
  exact ⟨{ role := .empty, text := Format.emptyInfo infoId },
    List.mem_append_right _ (by simp [infoParts,optionList,shown]),rfl,rfl⟩

private theorem bannerRunRole_cases (key : String) :
    bannerRunRole key = .name ∨ bannerRunRole key = .identity ∨ bannerRunRole key = .badge ∨
      bannerRunRole key = .detail := by
  simp only [bannerRunRole]
  split
  · exact .inl rfl
  · split
    · exact .inr (.inl rfl)
    · split
      · exact .inr (.inr (.inl rfl))
      · exact .inr (.inr (.inr rfl))

private theorem mem_joinRuns (run : Run) : ∀ runs : List Run, run ∈ runs → run ∈ joinRuns runs
  | [], h => by simp at h
  | [only], h => by simpa [joinRuns] using h
  | first :: second :: rest, h => by
    rcases List.mem_cons.mp h with rfl | tail
    · simp [joinRuns]
    · have := mem_joinRuns run (second :: rest) tail
      simp only [joinRuns,List.mem_cons]
      exact Or.inr (Or.inr this)

/-- New specification for owner review: every banner field and the signed-in
clinician is a run of the banner part, and the banner's text is exactly the
concatenation of its runs. -/
theorem banner_complete (banner : List (String × String)) (viewer : Option String) :
    (bannerPart banner viewer).role = .banner ∧
    (bannerPart banner viewer).text = runsText (bannerPart banner viewer).runs ∧
    (∀ pair ∈ banner, bannerRun pair ∈ (bannerPart banner viewer).runs) ∧
    (∀ v, viewer = some v → (⟨.clinician,"Signed in: " ++ v⟩ : Run) ∈ (bannerPart banner viewer).runs) := by
  refine ⟨rfl,rfl,?_,?_⟩
  · intro pair member
    apply mem_joinRuns
    have inClass : ∀ role : RunRole, bannerRunRole pair.1 = role →
        bannerRun pair ∈ (banner.filter fun p => bannerRunRole p.1 == role).map bannerRun :=
      fun role same => List.mem_map.mpr ⟨pair,List.mem_filter.mpr ⟨member,by simp [same]⟩,rfl⟩
    simp only [List.mem_append]
    rcases bannerRunRole_cases pair.1 with role | role | role | role
    · exact Or.inl (Or.inl (Or.inl (Or.inl (inClass _ role))))
    · exact Or.inl (Or.inl (Or.inl (Or.inr (inClass _ role))))
    · exact Or.inl (Or.inl (Or.inr (inClass _ role)))
    · exact Or.inl (Or.inr (inClass _ role))
  · intro v hv
    apply mem_joinRuns
    simp [hv]

/-- New specification for owner review: every demand of a board, every dated
and undated source of a dated timeline, every reference curve and every
urgent atom of a patient pane has a part. -/
theorem lists_complete (cx : DisplayCx) :
    (∀ urgent children, ∀ d ∈ urgent, demandPart d ∈ leafParts cx (.board urgent children)) ∧
    (∀ title dated undated children, (∀ item ∈ dated, datedPart item ∈
        leafParts cx (.datedTimeline title dated undated children)) ∧
      ∀ source ∈ undated, undatedPart source ∈ leafParts cx (.datedTimeline title dated undated children)) ∧
    (∀ references children, ∀ ref ∈ references, referencePart ref ∈
      leafParts cx (.chartReferences references children)) ∧
    (∀ patient banner metadata children modal, ∀ atom ∈ metadata.urgent?.getD [],
      stripAtomPart atom ∈ leafParts cx (.patientPane patient banner metadata children modal)) := by
  refine ⟨?_,?_,?_,?_⟩
  · intro urgent children d member
    exact List.mem_map.mpr ⟨d,member,rfl⟩
  · intro title dated undated children
    exact ⟨fun item member => List.mem_append_left _ (List.mem_map.mpr ⟨item,member,rfl⟩),
      fun source member => List.mem_append_right _ (List.mem_map.mpr ⟨source,member,rfl⟩)⟩
  · intro references children ref member
    exact List.mem_map.mpr ⟨ref,member,rfl⟩
  · intro patient banner metadata children modal atom member
    exact List.mem_map.mpr ⟨atom,member,rfl⟩

#print axioms zipIdx_at
#print axioms bannerRunRole_cases
#print axioms mem_joinRuns
#print axioms ownPart_text
#print axioms field_complete
#print axioms control_shows_choice
#print axioms button_complete
#print axioms alert_complete
#print axioms section_complete
#print axioms tabs_complete
#print axioms stepper_complete
#print axioms info_complete
#print axioms info_empty
#print axioms banner_complete
#print axioms lists_complete
end Ehr.Layout
