import Ehr.Core.Types

/-!
Types for page nodes, read-only clinical content and component actions.
The internal tree uses a fixed set of attributes and classes; PageNode is
the JSON form sent to the browser. Display holds rows read from FHIR.
The browser draws the tree and sends user events to the interpreter.
-/

namespace Ehr.Render

/-! ## Tags, classes, attributes -/

/-- HTML element names the renderer may use. -/
inductive Tag
  | div | span | table | thead | tbody | tr | th | td | button | input | select | option
  | label | h1 | h2 | h3 | ul | li | svg | polyline
  deriving DecidableEq, Repr, Inhabited

/-- The HTML name of a tag. -/
def Tag.name : Tag → String
  | .div => "div" | .span => "span" | .table => "table" | .thead => "thead"
  | .tbody => "tbody" | .tr => "tr" | .th => "th" | .td => "td" | .button => "button"
  | .input => "input" | .select => "select" | .option => "option" | .label => "label"
  | .h1 => "h1" | .h2 => "h2" | .h3 => "h3" | .ul => "ul" | .li => "li" | .svg => "svg"
  | .polyline => "polyline"

/-- Stylesheet classes (section 9.1), without `ehr-tiny`. The CSS name is
`Cls.name`: `ehr-` followed by the constructor name in kebab case. -/
inductive Cls
  -- shell
  | shell | banner | bannerField | bannerLabel | badge | badgeAllergy | badgeFlag
  | sidebar | sidebarSection | main | screenTitle | nav | navItem | navActive | toolbar
  -- structure
  | «section» | sectionHeader | sectionCollapsed | tabs | tab | tabActive | grid | row
  | landmark
  -- fields
  | field | fieldLabel | input | inputPending | unit | provenance | confirm | humanOnly
  | required | value
  -- info
  | panel | panelTitle | table | tableCompact | empty | trend | trendLine | abnormal
  -- alerts
  | alertInline | alertInterruptive | alertPassive | modalBackdrop | modal | modalTitle
  | modalBody
  -- actions
  | button | buttonPrimary | buttonSecondary | blockedReason | «macro» | hotkey | search
  -- size
  | compact
  deriving DecidableEq, Repr, Inhabited

/-- The CSS class name. -/
def Cls.name : Cls → String
  | .shell => "ehr-shell" | .banner => "ehr-banner" | .bannerField => "ehr-banner-field"
  | .bannerLabel => "ehr-banner-label" | .badge => "ehr-badge"
  | .badgeAllergy => "ehr-badge-allergy" | .badgeFlag => "ehr-badge-flag"
  | .sidebar => "ehr-sidebar" | .sidebarSection => "ehr-sidebar-section"
  | .main => "ehr-main" | .screenTitle => "ehr-screen-title" | .nav => "ehr-nav"
  | .navItem => "ehr-nav-item" | .navActive => "ehr-nav-active" | .toolbar => "ehr-toolbar"
  | .«section» => "ehr-section" | .sectionHeader => "ehr-section-header"
  | .sectionCollapsed => "ehr-section-collapsed" | .tabs => "ehr-tabs" | .tab => "ehr-tab"
  | .tabActive => "ehr-tab-active" | .grid => "ehr-grid" | .row => "ehr-row"
  | .landmark => "ehr-landmark"
  | .field => "ehr-field" | .fieldLabel => "ehr-field-label" | .input => "ehr-input"
  | .inputPending => "ehr-input-pending" | .unit => "ehr-unit"
  | .provenance => "ehr-provenance" | .confirm => "ehr-confirm"
  | .humanOnly => "ehr-human-only" | .required => "ehr-required" | .value => "ehr-value"
  | .panel => "ehr-panel" | .panelTitle => "ehr-panel-title" | .table => "ehr-table"
  | .tableCompact => "ehr-table-compact" | .empty => "ehr-empty" | .trend => "ehr-trend"
  | .trendLine => "ehr-trend-line" | .abnormal => "ehr-abnormal"
  | .alertInline => "ehr-alert-inline" | .alertInterruptive => "ehr-alert-interruptive"
  | .alertPassive => "ehr-alert-passive" | .modalBackdrop => "ehr-modal-backdrop"
  | .modal => "ehr-modal" | .modalTitle => "ehr-modal-title" | .modalBody => "ehr-modal-body"
  | .button => "ehr-button" | .buttonPrimary => "ehr-button-primary"
  | .buttonSecondary => "ehr-button-secondary" | .blockedReason => "ehr-blocked-reason"
  | .«macro» => "ehr-macro" | .hotkey => "ehr-hotkey" | .search => "ehr-search"
  | .compact => "ehr-compact"

/-- The class list of section 9.1, as written in `app/src/ehr.css`. -/
def stylesheetClasses : List String := [
  "ehr-shell", "ehr-banner", "ehr-banner-field", "ehr-banner-label", "ehr-badge",
  "ehr-badge-allergy", "ehr-badge-flag", "ehr-sidebar", "ehr-sidebar-section", "ehr-main",
  "ehr-screen-title", "ehr-nav", "ehr-nav-item", "ehr-nav-active", "ehr-toolbar",
  "ehr-section", "ehr-section-header", "ehr-section-collapsed", "ehr-tabs", "ehr-tab",
  "ehr-tab-active", "ehr-grid", "ehr-row", "ehr-landmark",
  "ehr-field", "ehr-field-label", "ehr-input", "ehr-input-pending", "ehr-unit",
  "ehr-provenance", "ehr-confirm", "ehr-human-only", "ehr-required", "ehr-value",
  "ehr-panel", "ehr-panel-title", "ehr-table", "ehr-table-compact", "ehr-empty",
  "ehr-trend", "ehr-trend-line", "ehr-abnormal",
  "ehr-alert-inline", "ehr-alert-interruptive", "ehr-alert-passive", "ehr-modal-backdrop",
  "ehr-modal", "ehr-modal-title", "ehr-modal-body",
  "ehr-button", "ehr-button-primary", "ehr-button-secondary", "ehr-blocked-reason",
  "ehr-macro", "ehr-hotkey", "ehr-search",
  "ehr-compact", "ehr-tiny"]

/-- The `data-event` values: what the painter sends when the node is used. -/
inductive EventName
  | click | enter | confirm | selectTab | ack | toggle | scroll | search
  deriving DecidableEq, Repr, Inhabited

/-- The `data-event` value. -/
def EventName.name : EventName → String
  | .click => "click" | .enter => "enter" | .confirm => "confirm" | .selectTab => "selectTab"
  | .ack => "ack" | .toggle => "toggle" | .scroll => "scroll" | .search => "search"

/-- The `data-value-kind` values: which `Value` constructor an entry builds. -/
inductive ValueKindName
  | qty | code | text | flag | user
  deriving DecidableEq, Repr, Inhabited

/-- The `data-value-kind` value. -/
def ValueKindName.name : ValueKindName → String
  | .qty => "qty" | .code => "code" | .text => "text" | .flag => "flag" | .user => "user"

/-- Input types. There is no `hidden`. -/
inductive InputType
  | text | number | checkbox | search | button
  deriving DecidableEq, Repr, Inhabited

/-- The `type` value. -/
def InputType.name : InputType → String
  | .text => "text" | .number => "number" | .checkbox => "checkbox" | .search => "search"
  | .button => "button"

/-- ARIA attributes. There is no `aria-hidden`. -/
inductive AriaName
  | label | expanded | selected | modal | checked | live | current | required | disabled
  deriving DecidableEq, Repr, Inhabited

/-- The attribute name, e.g. `aria-label`. -/
def AriaName.name : AriaName → String
  | .label => "aria-label" | .expanded => "aria-expanded" | .selected => "aria-selected"
  | .modal => "aria-modal" | .checked => "aria-checked" | .live => "aria-live"
  | .current => "aria-current" | .required => "aria-required" | .disabled => "aria-disabled"

/-- ARIA roles. -/
inductive AriaRole
  | banner | main | navigation | complementary | region | dialog | alert | status
  | tablist | tab | tabpanel | img | group | list | listitem | note | toolbar
  deriving DecidableEq, Repr, Inhabited

/-- The `role` value. -/
def AriaRole.name : AriaRole → String
  | .banner => "banner" | .main => "main" | .navigation => "navigation"
  | .complementary => "complementary" | .region => "region" | .dialog => "dialog"
  | .alert => "alert" | .status => "status" | .tablist => "tablist" | .tab => "tab"
  | .tabpanel => "tabpanel" | .img => "img" | .group => "group" | .list => "list"
  | .listitem => "listitem" | .note => "note" | .toolbar => "toolbar"

/-- A unit's name for `data-unit` (as in JSON). -/
def unitName : UnitKind → String
  | .kg => "kg" | .lb => "lb" | .g => "g" | .mg => "mg" | .mcg => "mcg" | .mL => "mL"
  | .mgPerKg => "mgPerKg" | .units => "units" | .none => "none"

/-- A page-tree attribute (section 9.1 whitelist). Classes are not attributes
here; they are a separate field of each node. -/
inductive Attr
  /-- `data-comp-id`: the component this node belongs to. -/
  | compId (id : String)
  /-- `data-event`: the event the painter sends when this node is used. -/
  | event (e : EventName)
  /-- `data-tab`: the tab index, for `selectTab`. -/
  | tab (index : Nat)
  /-- `data-alert`: the alert ID, for `ack`. -/
  | alert (id : String)
  /-- `data-value-kind`: which value an entry builds. -/
  | valueKind (k : ValueKindName)
  /-- `data-unit`: the unit of a quantity entry. -/
  | unit (u : UnitKind)
  | aria (name : AriaName) (value : String)
  | disabled
  | value (v : String)
  | type (t : InputType)
  | placeholder (s : String)
  | title (s : String)
  | role (r : AriaRole)
  /-- SVG polyline points. -/
  | points (s : String)
  /-- SVG view box. -/
  | viewBox (s : String)
  deriving DecidableEq, Repr, Inhabited

/-- A page tree: text, or an element with classes, attributes, and children. -/
inductive Html
  | text : String → Html
  | node (tag : Tag) (cls : List Cls) (attrs : List Attr) (children : List Html)
  deriving Repr, Inhabited

/-! ## Read-only content and component parts -/

/-- Attributes allowed in read-only content: no component ID, no event, no
`disabled`. -/
inductive RoAttr
  | title (s : String)
  | role (r : AriaRole)
  | aria (name : AriaName) (value : String)
  | points (s : String)
  | viewBox (s : String)
  deriving DecidableEq, Repr, Inhabited

/-- Read-only content (info rows, the banner, the sidebar). It cannot carry a
component ID or an event, so the painter can never send an event from it. -/
inductive Ro
  | text : String → Ro
  | el (tag : Tag) (cls : List Cls) (attrs : List RoAttr) (children : List Ro)
  deriving Repr, Inhabited

/-- Attributes a component part may set itself. The component ID, the event,
and `disabled` are added by the renderer (see `Part.toHtmls`). -/
inductive PAttr
  | ro (a : RoAttr)
  | tab (index : Nat)
  | valueKind (k : ValueKindName)
  | unit (u : UnitKind)
  | value (v : String)
  | type (t : InputType)
  | placeholder (s : String)
  deriving DecidableEq, Repr, Inhabited

/-- The rendering of one component, before its ID is filled in.
- `ro`: read-only content;
- `el`: an element with no component ID;
- `box`: an element that carries the component ID (no event);
- `act`: an interactive element: it carries the component ID and the event,
  and `disabled` exactly when the view does not list the component as enabled;
- `kids`: the place where the component's children go (groups and tabs). -/
inductive Part
  | ro : Ro → Part
  | el (tag : Tag) (cls : List Cls) (attrs : List PAttr) (children : List Part)
  | box (tag : Tag) (cls : List Cls) (attrs : List PAttr) (children : List Part)
  | act (ev : EventName) (tag : Tag) (cls : List Cls) (attrs : List PAttr) (children : List Part)
  | kids
  deriving Repr, Inhabited

/-! ## Wire form (JSON for the painter) -/

/-- An attribute as the painter receives it: `{"name": …, "value": …}`. -/
structure PageAttr where
  name : String
  value : String
  deriving DecidableEq, Repr, Inhabited

/-- A page-tree node as the painter receives it. JSON:
`{"text": {"s": "…"}}` or
`{"node": {"tag": "div", "attrs": [{"name", "value"}…], "children": […]}}`.
The class list is the attribute `class` (space-separated). -/
inductive PageNode
  | text (s : String)
  | node (tag : Tag) (attrs : List PageAttr) (children : List PageNode)
  deriving Repr, Inhabited

/-! ## Display projection of the patient's FHIR records -/

/-- Patient banner fields. -/
structure BannerInfo where
  /-- `"Family, Given Middle"`. -/
  name : String
  /-- Medical record number (Patient.identifier of type `MR`), empty if absent. -/
  mrn : String
  /-- Date of birth, `YYYY-MM-DD`. -/
  dob : String
  ageYears : Nat
  /-- `"F"`, `"M"`, or `"U"`. -/
  sex : String
  language : String
  /-- Primary care provider (or the last encounter's practitioner). -/
  pcp : String
  /-- Payer of the latest coverage or claim. -/
  coverage : String
  /-- Class of the latest encounter: `"AMB"`, `"EMER"`, `"IMP"`, … -/
  encounterClass : String
  /-- Practitioner of the latest encounter. -/
  attending : String
  /-- Location or service provider of the latest encounter. -/
  location : String
  /-- Latest body-weight Observation: tenths, recorded unit and date. -/
  weight? : Option (Nat × UnitKind × String) := none
  deriving DecidableEq, Repr, Inhabited

/-- One AllergyIntolerance. -/
structure AllergyRow where
  id : String
  substance : String
  code : String
  /-- `medication`, `food`, `environment`, `biologic`. -/
  category : String
  /-- `low`, `high`, `unable-to-assess`. -/
  criticality : String
  /-- Manifestations, comma-separated. -/
  reaction : String
  severity : String
  /-- Clinical status code (`active`, `inactive`, `resolved`). -/
  status : String
  verification : String
  recorded : String
  versionId : String
  deriving DecidableEq, Repr, Inhabited

/-- One MedicationRequest. -/
structure MedRow where
  id : String
  name : String
  rxnorm : String
  /-- Formulary name of the drug, `""` if it is not in the formulary. -/
  drug : String
  /-- Dosage instructions as text. -/
  sig : String
  status : String
  authored : String
  prescriber : String
  versionId : String
  deriving DecidableEq, Repr, Inhabited

/-- One vital-sign Observation. -/
structure VitalRow where
  id : String
  /-- LOINC code. -/
  code : String
  name : String
  /-- The value as recorded (`"128/82"` for blood pressure). -/
  value : String
  unit : String
  date : String
  /-- Numeric value × 100, if numeric. -/
  hundredths? : Option Nat := none
  deriving DecidableEq, Repr, Inhabited

/-- One point of a lab trend. -/
structure TrendPoint where
  date : String
  /-- Value × 100. -/
  hundredths : Nat
  deriving DecidableEq, Repr, Inhabited

/-- One lab test (by LOINC code): the latest result and its trend. -/
structure LabRow where
  code : String
  name : String
  value : String
  unit : String
  date : String
  /-- Reference range as text (`""` if unknown). -/
  refRange : String
  /-- The latest result is outside the reference range (or flagged abnormal). -/
  abnormal : Bool
  /-- All results of this test, oldest first. -/
  trend : List TrendPoint
  deriving DecidableEq, Repr, Inhabited

/-- One recorded laboratory result with its own value, unit and report metadata. -/
structure LabResultRow where
  code : String
  name : String
  value : String
  unit : String
  date : String
  refRange : String
  flag : String
  status : String
  deriving DecidableEq, Repr, Inhabited

/-- One Condition. -/
structure ProblemRow where
  id : String
  name : String
  code : String
  onset : String
  abatement : String
  /-- Clinical status code. -/
  status : String
  deriving DecidableEq, Repr, Inhabited

/-- One Immunization. -/
structure ImmRow where
  id : String
  vaccine : String
  cvx : String
  date : String
  status : String
  deriving DecidableEq, Repr, Inhabited

/-- One Encounter. -/
structure EncRow where
  id : String
  encType : String
  /-- Encounter class code (`AMB`, `EMER`, `IMP`, …). -/
  encClass : String
  start : String
  stop : String
  reason : String
  provider : String
  location : String
  deriving DecidableEq, Repr, Inhabited

/-- One Procedure. -/
structure ProcRow where
  id : String
  name : String
  code : String
  date : String
  status : String
  deriving DecidableEq, Repr, Inhabited

/-- One growth-chart point (weight and/or height on a day). -/
structure GrowthPoint where
  date : String
  ageMonths : Nat
  /-- Body weight in tenths of kg. -/
  weightTenths? : Option Nat := none
  /-- Body height in tenths of cm. -/
  heightTenths? : Option Nat := none
  deriving DecidableEq, Repr, Inhabited

/-- One visible DocumentReference, with all inline plain-text attachments. -/
structure NoteRow where
  id : String
  date : String
  noteType : String
  author : String
  encounter : String
  title : String
  text : String
  status : String
  sourceDate : String
  shiftDays : String
  versionId : String
  deriving DecidableEq, Repr, Inhabited

/-- Reported history; never an order or evidence of administration. -/
structure HistoryRow where
  id : String
  kind : String
  item : String
  detail : String
  status : String
  source : String
  versionId : String
  deriving DecidableEq, Repr, Inhabited

/-- One scheduled appointment, with human-readable participants only. -/
structure ScheduleRow where
  time : String
  patient : String
  ageSex : String
  visitType : String
  status : String
  complaint : String
  provider : String
  location : String
  deriving DecidableEq, Repr, Inhabited

/-- One encounter on a department board. Missing assignments stay empty. -/
structure BoardRow where
  room : String
  patient : String
  ageSex : String
  complaint : String
  acuity : String
  arrival : String
  nurse : String
  provider : String
  disposition : String
  status : String
  deriving DecidableEq, Repr, Inhabited

/-- A medication order and its explicitly recorded scheduled timestamps. -/
structure MarOrderRow where
  /-- Transport identity used only to join administrations; never shown. -/
  id : String
  medication : String
  dose : String
  route : String
  frequency : String
  status : String
  scheduled : List String
  deriving DecidableEq, Repr, Inhabited

/-- An actual MedicationAdministration, never inferred from an order. -/
structure AdministrationRow where
  /-- Referenced order identity; never a visible clinical column. -/
  orderId : String
  medication : String
  dose : String
  route : String
  site : String
  time : String
  status : String
  reason : String
  performer : String
  deriving DecidableEq, Repr, Inhabited

/-- An Observation series point, including pain, assessments and I&O. -/
structure ObservationRow where
  measure : String
  value : String
  unit : String
  time : String
  status : String
  /-- Source categories select the clinical collection; older rows have none. -/
  categories : List String := []
  deriving DecidableEq, Repr, Inhabited

/-- A supplied practitioner name. Its logical identity is transport metadata. -/
structure ClinicianRow where
  id : UserId
  name : String
  deriving DecidableEq, Repr, Inhabited

/-- The patient's records as the page shows them. Computed in Lean from the
FHIR bundle (`Ehr.Render.Fhir.parseBundle`). Lists are newest first. -/
structure Display where
  /-- The date the records were read for (`YYYY-MM-DD`, "today"). -/
  asOf : String
  banner : BannerInfo
  /-- Every AllergyIntolerance except those entered in error. -/
  allergies : List AllergyRow
  /-- Every MedicationRequest that is active or on hold. -/
  meds : List MedRow
  /-- Every vital-sign Observation. -/
  vitals : List VitalRow
  /-- One row per lab test, with its trend. -/
  labs : List LabRow
  /-- Every Condition except those entered in error. -/
  problems : List ProblemRow
  immunizations : List ImmRow
  encounters : List EncRow
  procedures : List ProcRow
  growth : List GrowthPoint
  /-- Explicit US Core birth-sex coding for published growth references.
  Administrative gender alone does not select a reference population. -/
  growthReferenceSex? : Option String := none
  notes : List NoteRow := []
  history : List HistoryRow := []
  schedule : List ScheduleRow := []
  board : List BoardRow := []
  marOrders : List MarOrderRow := []
  administrations : List AdministrationRow := []
  observations : List ObservationRow := []
  /-- Latest lab interpretation by code, computed in Lean. -/
  labFlags : List (String × String) := []
  /-- Optional practitioner identities; the header requires a unique user match. -/
  clinicians? : Option (List ClinicianRow) := none
  /-- Full per-observation results, including qualitative values and components. -/
  labResults : List LabResultRow := []
  deriving DecidableEq, Repr, Inhabited

/-- An empty display (no records). -/
def Display.empty : Display :=
  { asOf := ""
    banner := { name := "", mrn := "", dob := "", ageYears := 0, sex := "U", language := ""
                pcp := "", coverage := "", encounterClass := "", attending := "", location := "" }
    allergies := [], meds := [], vitals := [], labs := [], problems := []
    immunizations := [], encounters := [], procedures := [], growth := [], notes := [], history := [] }

/-! ## Semantic UI (section 10; Init-only) -/

/-- Read-only clinical layouts. Their child info retains every source row. -/
inductive UiPresentationKind
  | table | schedule | trackBoard | orSchedule | worklist | timeGrid | flowsheet
  | folderList | messages | results | trend | growth | notes
  deriving DecidableEq, Repr, Inhabited

/-- A displayed term and the exact code sent by its ordinary field. -/
structure UiCodeChoice where
  code : String
  label : String
  deriving DecidableEq, Repr, Inhabited

/-- Published growth-curve samples, separate from patient measurements.
Points use tenths of a month and hundredths of the stated unit. -/
structure UiChartReference where
  measure : String
  unit : String
  percentile : String
  source : String
  population : String
  points : List (Nat × Nat)
  deriving DecidableEq, Repr, Inhabited

/-- Semantic EHR nodes. Only the selected tab body is emitted. -/
inductive UiNode
  /-- Ordered full-detail events; timeline never filters, sorts or invents timestamps. -/
  | timeline (title : String) (children : List UiNode)
  /-- A layout hint around ordinary semantic nodes; never a visibility filter. -/
  | presentation (kind : UiPresentationKind) (children : List UiNode)
  /-- Choices decorate the original field; they do not enter or validate it. -/
  | valueSet (options : List UiCodeChoice) (allowCustom : Bool) (children : List UiNode)
  /-- Reference curves decorate an unchanged complete clinical info child. -/
  | chartReferences (references : List UiChartReference) (children : List UiNode)
  /-- Place existing controls with a source info row; unmatched controls stay inline. -/
  | rowAction (target : CompId) (row : Nat) (children : List UiNode)
  | section (id : String) (title : String) (children : List UiNode)
  | columns (children : List UiNode)
  | tabs (id : String) (labels : List String) (selected : Nat) (body : List UiNode)
  | stepper (steps : List (String × String)) (current : Nat)
  | field (comp : CompId) (label : String) (kind : String) (value : Option String)
      (unit : Option String) (provenance : Option String) (pendingConfirm : Bool)
      (humanOnly : Bool) (required : Bool)
  | info (comp : CompId) (label : String) (infoId : InfoId) (display : String)
      (rows : List (List (String × String)))
  | alert (comp : CompId) (alertId : AlertId) (label : String) (severity : String)
  | button (comp : CompId) (label : String) (role : String) (enabled : Bool)
      (blockedReason : Option String) (hotkey : Option String)
  | text (s : String)
  deriving Repr, Inhabited

/-- Code quick picks carry their display mode, not clinical defaults or rules. -/
structure UiCodeChoices where
  options : List (String × String)
  showCode : Bool := false
  allowOther : Bool := true
  deriving Repr, Inhabited

/-- A semantic screen. The banner is the first and sole banner landmark. -/
structure UiScreen where
  /-- Stable view identity for scroll/focus lifecycle; never a visible label. -/
  screen? : Option ScreenId := none
  /-- Public source captions for fields whose exact provenance remains in their node. -/
  fieldSources? : Option (List (CompId × String)) := none
  banner : List (String × String)
  /-- Signed-in clinical role, supplied by the same Lean user as permissions. -/
  viewer? : Option String := none
  nav : List (String × List (String × String))
  /-- The declared navigator component that opens the current screen, if any. -/
  activeNav? : Option CompId := none
  /-- Readable labels for prefill sources; raw provenance remains on each field. -/
  sourceLabels? : Option (List (String × String)) := none
  /-- Entry guidance for a field, including recorded values in another unit. -/
  entryHints? : Option (List (CompId × String)) := none
  /-- Optional department quick picks: raw code and readable description. -/
  fieldChoices? : Option (List (CompId × UiCodeChoices)) := none
  title : String
  workspace : List UiNode
  side : List UiNode
  modal : Option UiNode
  urgent? : Option (List UiNode) := none
  deriving Repr, Inhabited

/-! ## API records -/

/-- What the FHIR parser needs besides the bundle: the date and time "now",
and episode context that is not in the patient record. -/
structure FactsContext where
  /-- Today's date, `YYYY-MM-DD`. "Recorded today" means an `effectiveDateTime`
  starting with this date. -/
  today : String
  /-- Minutes since the day's start (`Facts.now`). -/
  now : Nat := 0
  /-- The medication being given in this episode (formulary name), if any. -/
  medToGive? : Option String := none
  /-- Prior review receipts (from Provenance records). -/
  receipts : List Receipt := []
  /-- Episode kind supplied by the caller, e.g. "preop". -/
  encounterKind? : Option String := none
  /-- The selected FHIR Encounter. Its identity stays in transport metadata. -/
  encounterId? : Option String := none
  /-- Extra named record values, added after the ones derived from the bundle. -/
  record : List (String × String) := []
  deriving DecidableEq, Repr, Inhabited

/-- Output of `facts`: the facts the spec needs and the display rows. -/
structure FactsOutput where
  facts : Facts
  display : Display
  deriving DecidableEq, Repr, Inhabited

/-- Input of `render` (one JSON object). -/
structure RenderInput where
  spec : Spec
  program : Program
  facts : Facts
  display : Display
  user : User
  state : State
  deriving DecidableEq, Repr, Inhabited

end Ehr.Render
