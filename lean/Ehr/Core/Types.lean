/-!
# Core types

The data formats every lane builds against: the hospital spec, the UI program,
the facts taken from the patient record, the interpreter state, events, and the
screen view. See `docs/design/core-model.md` (sections 2, 3, 4, 7, 8) for the
meaning of each field.

This module imports only `Init`, so the WASM build stays small. JSON instances
live in `Ehr.Core.Json`.

Naming rule for optional fields: an `Option` field whose name ends in `?`
(for example `parent?`) is written to JSON under the name without `?`
(`"parent"`) and is left out of the JSON object when it is `none`.
-/

namespace Ehr

/-! ## Identifiers -/

/-- A data element in the spec, e.g. `"weight"`, `"patientIdReentry"`. -/
abbrev ElementId := String
/-- A piece of displayable information, e.g. `"allergyList"`, `"doseCheck"`. -/
abbrev InfoId := String
/-- A commit (an action that changes the record), e.g. `"signOrders"`. -/
abbrev CommitId := String
/-- An alert rule in the spec. -/
abbrev AlertId := String
/-- A screen of a UI program. -/
abbrev ScreenId := String
/-- A component on a screen. -/
abbrev CompId := String
/-- A macro (a stored list of steps) of a UI program. -/
abbrev MacroId := String
/-- A clinician's user ID. -/
abbrev UserId := String

/-! ## Spec -/

/-- A clinical role. A surgeon is a physician with a surgical task mix; it is a
separate role so permissions stay clear. -/
inductive Role
  | physician
  | np
  | rn
  | surgeon
  deriving DecidableEq, Repr, Inhabited

/-- Units of measure. `none` is for unitless quantities. -/
inductive UnitKind
  | kg
  | lb
  | g
  | mg
  | mcg
  | mL
  | mgPerKg
  | units
  | none
  deriving DecidableEq, Repr, Inhabited

/-- How a data element may be filled in before a human touches it.
- `never`: a human must enter it.
- `recordConfirm`: copied from the record; a human confirms it.
- `defaultConfirm`: a default is allowed; a human confirms it.
- `autoLinked`: copied from a linked element; no confirm needed (enter once). -/
inductive PrefillPolicy
  | never
  | recordConfirm
  | defaultConfirm
  | autoLinked
  deriving DecidableEq, Repr, Inhabited

/-- Why a prompt exists in the canonical UI.
- `safety`: kept, and done by a human.
- `compliance`: required, but a prefill or a valid receipt may satisfy it.
- `accidental`: free to remove. -/
inductive Friction
  | safety
  | compliance
  | accidental
  deriving DecidableEq, Repr, Inhabited

/-- The kind of value a data element holds. -/
inductive ValueKind
  /-- A number in the given unit (the unit is required). -/
  | quantity (unit : UnitKind)
  /-- A code from a value set. -/
  | coded (valueSet : String)
  /-- Free text. -/
  | text
  /-- A checkbox or confirmation. -/
  | flag
  /-- Patient-ID re-entry. Must match the patient's initials, sex, and age. -/
  | identity
  /-- A barcode scan, e.g. `"wristband"` or `"medication"`. -/
  | scan (target : String)
  /-- A second user's ID. Must differ from the current user. -/
  | cosign
  deriving DecidableEq, Repr, Inhabited

/-- A data element the spec knows about. -/
structure ElementSpec where
  id : ElementId
  label : String
  kind : ValueKind
  /-- Roles allowed to enter (or confirm) this element. -/
  enteredBy : List Role
  prefill : PrefillPolicy
  friction : Friction
  /-- Re-performed by a human every time; never automated. -/
  humanOnly : Bool := false
  /-- The element this one is copied from, for `autoLinked`. -/
  linkedFrom? : Option ElementId := none
  /-- Where the app writes the value, e.g. `"MedicationRequest.reasonCode"`. -/
  fhirTarget : String
  deriving DecidableEq, Repr, Inhabited

/-- A piece of information the UI can display. -/
structure InfoSpec where
  id : InfoId
  label : String
  /-- Name of the fact that versions this info (e.g. `"allergyVersion"`),
  or `""` if it is not versioned. -/
  version : String
  deriving DecidableEq, Repr, Inhabited

/-- A commit and the roles allowed to perform it. -/
structure CommitSpec where
  id : CommitId
  label : String
  roles : List Role
  deriving DecidableEq, Repr, Inhabited

/-- When a requirement applies. -/
inductive When
  /-- Always. -/
  | always
  /-- Some order line's drug is in this class. -/
  | orderClass (cls : String)
  /-- The medication being given is in this class. -/
  | medClass (cls : String)
  /-- A high-alert medication is involved. -/
  | highAlertMed
  /-- The patient has an abnormal result. -/
  | abnormalResult
  /-- Naloxone should be offered (CA B&P Code §741): some order line's drug is
  an opioid, and the patient takes a benzodiazepine or the line's daily MME is
  90 or more (an unknown dose, frequency, or MME factor counts as a risk). -/
  | naloxoneRisk
  deriving DecidableEq, Repr, Inhabited

/-- An element that must be captured before a commit. -/
structure EntryReq where
  commit : CommitId
  element : ElementId
  when : When := .always
  /-- Required for each order line that matches `when`. -/
  perOrderLine : Bool := false
  deriving DecidableEq, Repr, Inhabited

/-- How a review requirement can be met. -/
inductive ReviewMode
  /-- Shown on the commit screen; no receipt allowed. -/
  | shownOnCommit
  /-- Shown on the commit screen, or a receipt no older than `windowMin`
  minutes from one of `roles`. -/
  | shownOrReceipt (windowMin : Nat) (roles : List Role)
  deriving DecidableEq, Repr, Inhabited

/-- Information that must be reviewed before a commit. -/
structure ReviewReq where
  commit : CommitId
  info : InfoId
  mode : ReviewMode
  when : When := .always
  /-- An element that, when entered by a human (confirmed, non-empty) in this
  episode, documents why the review was not done and so meets the requirement
  (CA H&S Code §11165.4: the reason CURES was not consulted). -/
  waivedBy? : Option ElementId := none
  deriving DecidableEq, Repr, Inhabited

/-- The trigger condition of an alert. -/
inductive AlertCond
  | drugAllergy
  | interaction
  | duplicateTherapy
  | doseOutOfRange
  | weightInLb
  | careGap
  | highAlertMed
  deriving DecidableEq, Repr, Inhabited

/-- Alert tier.
- `interruptive`: pops up and must be acknowledged before its commit.
- `passive`: shown inline; never pops up.
- `removable`: accidental friction; a program may pop it up or drop it. -/
inductive Tier
  | interruptive
  | passive
  | removable
  deriving DecidableEq, Repr, Inhabited

/-- An alert rule. -/
structure AlertSpec where
  id : AlertId
  label : String
  cond : AlertCond
  tier : Tier
  /-- The commit this alert concerns. -/
  commit : CommitId
  /-- Screens where a passive alert must be shown inline. -/
  screens : List String := []
  deriving DecidableEq, Repr, Inhabited

/-- Design rules every program must follow (checked offline). -/
structure DesignRules where
  maxDepth : Nat
  /-- Legibility: `Size.tiny` is below this. -/
  minTextSize : Nat
  /-- Maximum components moved per accepted version. -/
  stabilityBudget : Nat
  /-- Info that must be on every screen, e.g. `["patientBanner"]`. -/
  landmarks : List InfoId
  /-- Allowed component kind tags. -/
  catalog : List String
  deriving DecidableEq, Repr, Inhabited

/-- A hospital governance spec (one version). -/
structure Spec where
  version : String
  elements : List ElementSpec
  infos : List InfoSpec
  commits : List CommitSpec
  entries : List EntryReq
  reviews : List ReviewReq
  alerts : List AlertSpec
  design : DesignRules
  deriving DecidableEq, Repr, Inhabited

/-! ## UI programs

A program is a flat list of screens, each a flat list of components. Nesting
is expressed with `parent?`, which keeps programs easy to patch and diff. -/

/-- Which order line a field is bound to. `current` means `State.currentSlot`. -/
inductive Slot
  | fixed (n : Nat)
  | current
  deriving DecidableEq, Repr, Inhabited

/-- Where a field's prefilled value comes from. -/
inductive Prefill
  | none
  /-- A named fact from the record, e.g. `"weightToday"`. -/
  | fromRecord (fact : String)
  /-- A fixed default value (parsed according to the element's kind). -/
  | default (value : String)
  /-- The value captured for another element. -/
  | linked (element : ElementId)
  deriving DecidableEq, Repr, Inhabited

/-- What a button does. -/
inductive Action
  | goto (screen : ScreenId)
  | back
  | commit (commit : CommitId)
  /-- Records that the user reviewed this info (creates a receipt). -/
  | markReviewed (info : InfoId)
  /-- Starts a new order line. -/
  | newOrderLine
  deriving DecidableEq, Repr, Inhabited

/-- When a component is visible. `unlessReceipt i`: only when there is no
valid receipt for `i`. -/
inductive Visibility
  | always
  | unlessReceipt (info : InfoId)
  deriving DecidableEq, Repr, Inhabited

/-- Display size. `tiny` never counts as shown. -/
inductive Size
  | normal
  | compact
  | tiny
  deriving DecidableEq, Repr, Inhabited

/-- The kind of a component. -/
inductive Kind
  /-- The patient banner (shows the `"patientBanner"` landmark). -/
  | banner
  /-- An input for one data element on one order line. -/
  | field (element : ElementId) (slot : Slot) (prefill : Prefill)
  /-- A read-only info block. -/
  | panel (info : InfoId)
  | table (info : InfoId)
  | trend (info : InfoId)
  /-- An alert. `popup` asks to show it as a popup (only removable alerts use this). -/
  | alert (alert : AlertId) (popup : Bool)
  | button (action : Action)
  /-- A container. Children name it as their `parent?`. -/
  | group (collapsible : Bool) (startCollapsed : Bool)
  /-- A tab container. Children pick their tab with `tab`. -/
  | tabs
  /-- A button that runs a macro. -/
  | «macro» (id : MacroId)
  | search (scope : String)
  deriving DecidableEq, Repr, Inhabited

/-- One component on a screen. -/
structure Component where
  id : CompId
  kind : Kind
  label : String := ""
  /-- A group or tabs component on the same screen. -/
  parent? : Option CompId := none
  /-- Tab index inside a parent `tabs` component. -/
  tab : Nat := 0
  visibility : Visibility := .always
  size : Size := .normal
  hotkey? : Option String := none
  /-- Stable semantic tag used by agent patches and stability tracking. -/
  tag : String := ""
  /-- Marks a copy (copies don't count against the stability budget). -/
  copyOf? : Option CompId := none
  deriving DecidableEq, Repr, Inhabited

/-- A screen. List order of `components` is render order. -/
structure Screen where
  id : ScreenId
  title : String
  /-- Workflow tag, `"W1"` … `"W7"`. -/
  workflow : String
  components : List Component
  deriving DecidableEq, Repr, Inhabited

/-- One step of a macro. -/
inductive MacroStep
  /-- Enter a value into a field (the string is parsed by the element's kind). -/
  | setValue (comp : CompId) (value : String)
  | click (comp : CompId)
  | goto (screen : ScreenId)
  deriving DecidableEq, Repr, Inhabited

/-- A macro: steps run on the user's behalf, as `Actor.macro`. -/
structure Macro where
  id : MacroId
  label : String
  steps : List MacroStep
  deriving DecidableEq, Repr, Inhabited

/-- A per-clinician UI program (one version). -/
structure Program where
  id : String
  version : Nat
  owner : UserId
  role : Role
  specVersion : String
  start : ScreenId
  screens : List Screen
  macros : List Macro
  deriving DecidableEq, Repr, Inhabited

/-! ## Facts (the patient record, abstracted) -/

/-- A drug in the formulary. The formulary is keyed by `name`, the lowercase
generic name (e.g. `"amoxicillin"`). -/
structure DrugInfo where
  /-- Lowercase generic name; the key used everywhere else. -/
  name : String
  /-- RxNorm codes for this drug (may be empty). -/
  rxnorm : List String := []
  /-- Drug classes. The first is the therapeutic class used for
  duplicate-therapy checks; all are used for allergy and interaction matching. -/
  classes : List String
  /-- Usual dose range in tenths of mg per kg (`0`/`0` = no weight-based range). -/
  minMgPerKgTenths : Nat
  maxMgPerKgTenths : Nat
  highAlert : Bool
  /-- Classes this drug interacts with. -/
  interactsWith : List String
  /-- Oral morphine milligram equivalent factor, in tenths (morphine = 10).
  `0` for non-opioids. -/
  mmeFactorTenths : Nat := 0
  deriving DecidableEq, Repr, Inhabited

/-- What patient-ID re-entry is checked against. -/
structure PatientIdentity where
  initials : String
  sex : String
  ageYears : Nat
  deriving DecidableEq, Repr, Inhabited

/-- A review receipt: evidence that a user reviewed an info at a data version. -/
structure Receipt where
  info : InfoId
  dataVersion : Nat
  /-- Minutes, on the same scale as `Facts.now`. -/
  time : Nat
  role : Role
  user : UserId
  deriving DecidableEq, Repr, Inhabited

/-- The few facts from the patient record the spec needs. -/
structure Facts where
  patientId : String
  identity : PatientIdentity
  /-- From AllergyIntolerance `meta.versionId`. -/
  allergyVersion : Nat
  allergyClasses : List String
  medsVersion : Nat
  currentMedClasses : List String
  /-- Weight recorded today: tenths, and the unit as recorded. -/
  weightToday? : Option (Nat × UnitKind) := none
  careGaps : List String
  abnormalResult : Bool
  /-- Minutes since the day's start (receipt times use the same scale). -/
  now : Nat
  /-- The medication being given in this episode (formulary name), if any. -/
  medToGive? : Option String := none
  /-- Prior review receipts (from Provenance records). -/
  receipts : List Receipt := []
  /-- Other record values a field may prefill from, by name
  (e.g. `("visitDiagnosis", "J18.9")`). -/
  record : List (String × String) := []
  deriving DecidableEq, Repr, Inhabited

/-! ## Interpreter state and events -/

/-- A captured value. Quantities are in tenths of the unit. -/
inductive Value
  | qty (tenths : Nat) (unit : UnitKind)
  | code (c : String)
  | text (s : String)
  | flag (b : Bool)
  | user (u : UserId)
  deriving DecidableEq, Repr, Inhabited

/-- Who performs an event: a human, or a macro on the human's behalf. -/
inductive Actor
  | human
  | «macro»
  deriving DecidableEq, Repr, Inhabited

/-- A value captured for an element on an order line (`slot`). -/
structure Captured where
  element : ElementId
  slot : Nat
  value : Value
  /-- Entered by a human (not a prefill or a macro). -/
  byHuman : Bool
  /-- `false` for prefills awaiting a human confirm. -/
  confirmed : Bool
  /-- Where a prefilled value came from, e.g. `"record:weightToday"`. -/
  provenance? : Option String := none
  deriving DecidableEq, Repr, Inhabited

/-- The signed-in user. -/
structure User where
  id : UserId
  role : Role
  deriving DecidableEq, Repr, Inhabited

/-- Interpreter state for one episode (one patient task). -/
structure State where
  screen : ScreenId
  history : List ScreenId
  captured : List Captured
  /-- Initialized from `Facts.receipts`, plus new ones. -/
  receipts : List Receipt
  /-- Alert + key (e.g. drug name and data version) handled this episode. -/
  acked : List (AlertId × String)
  commits : List CommitId
  /-- Groups that are open. -/
  expanded : List CompId
  /-- Selected tab per tabs component (default 0). -/
  tabSel : List (CompId × Nat)
  /-- The alert popup currently shown, with its key. -/
  popup? : Option (AlertId × String) := none
  /-- The order line that `Slot.current` fields are bound to. -/
  currentSlot : Nat
  /-- Deciseconds since the episode started (the caller advances it). -/
  clock : Nat
  deriving DecidableEq, Repr, Inhabited

/-- A user (or macro) action. -/
inductive Event
  /-- Click a button, macro button, or group header (toggles it). -/
  | click (comp : CompId)
  | selectTab (comp : CompId) (idx : Nat)
  | enter (comp : CompId) (value : Value)
  /-- Confirm a prefilled value. -/
  | confirm (comp : CompId)
  /-- Acknowledge the current popup. -/
  | ack (alert : AlertId)
  | scroll (screen : ScreenId)
  | search (query : String)
  deriving DecidableEq, Repr, Inhabited

/-- What happened to an event.
- `ok`: applied.
- `blocked reason`: refused by a safety rule (the reason says which).
- `ignored`: did not apply (e.g. the component is not shown). -/
inductive StepResult
  | ok
  | blocked (reason : String)
  | ignored
  deriving DecidableEq, Repr, Inhabited

/-! ## Screen view (what the app paints) -/

/-- One component as the app should paint it. -/
structure ItemView where
  comp : Component
  /-- Counts as shown: on screen, ancestors open, visibility holds, not tiny,
  and (for alerts) the alert condition holds. -/
  shown : Bool
  /-- Nesting depth (0 = top level). -/
  depth : Nat
  /-- For groups: open or closed. -/
  expanded : Bool
  /-- For tabs: the selected tab index. -/
  selectedTab : Nat
  /-- For fields: the order line the field is bound to. -/
  slot : Nat
  /-- For fields: the bound value, if any. -/
  value? : Option Value := none
  /-- For fields: where a prefilled value came from. -/
  provenance? : Option String := none
  /-- For fields: a prefilled value is waiting for a human confirm. -/
  pendingConfirm : Bool := false
  /-- For fields: only a human may enter this element (render as unskippable). -/
  humanOnly : Bool := false
  /-- For alerts: the alert condition holds. -/
  firing : Bool := false
  deriving DecidableEq, Repr, Inhabited

/-- The current screen as the app should paint it. -/
structure ScreenView where
  screen : ScreenId
  title : String
  /-- Every component on the screen, in render order. -/
  items : List ItemView
  /-- Components that accept a click or entry now. -/
  enabled : List CompId
  /-- Components that are refused now, with the reason. -/
  blocked : List (CompId × String)
  popup? : Option (AlertId × String) := none
  deriving DecidableEq, Repr, Inhabited

/-! ## Interface records (API and CLI input/output) -/

/-- Input of `ehr init` (stdin). -/
structure InitInput where
  spec : Spec
  program : Program
  facts : Facts
  user : User
  deriving DecidableEq, Repr, Inhabited

/-- Output of `step`. -/
structure StepOutput where
  state : State
  result : StepResult
  deriving DecidableEq, Repr, Inhabited

/-- Input of `ehr step` (stdin). -/
structure StepInput where
  spec : Spec
  program : Program
  facts : Facts
  user : User
  state : State
  event : Event
  deriving DecidableEq, Repr, Inhabited

/-- Input of `ehr view` (stdin). -/
structure ViewInput where
  spec : Spec
  program : Program
  facts : Facts
  user : User
  state : State
  deriving DecidableEq, Repr, Inhabited

/-- One line of an `ehr run-batch` file. The state starts from `init`. -/
structure BatchCase where
  spec : Spec
  program : Program
  facts : Facts
  user : User
  events : List Event
  deriving DecidableEq, Repr, Inhabited

/-- One output line of `ehr run-batch`: the result of one event. -/
structure BatchStep where
  /-- Index of the case (line) in the batch file. -/
  case : Nat
  /-- Index of the event within the case. -/
  index : Nat
  state : State
  result : StepResult
  view : ScreenView
  deriving DecidableEq, Repr, Inhabited

/-! ## Simulation formats (section 7)

`Task` and `DaySchedule` carry raw FHIR JSON, so they live in `Ehr.Core.Json`. -/

/-- Workflows W1–W7 (BRIEF section 5). -/
inductive Workflow
  | W1 | W2 | W3 | W4 | W5 | W6 | W7
  deriving DecidableEq, Repr, Inhabited

/-- A clinical decision, fixed per scenario (independent of the UI). -/
structure OrderChoice where
  /-- Formulary name (lowercase generic), e.g. `"amoxicillin"`. -/
  drug : String
  doseTenths : Nat
  unit : UnitKind
  route : String
  freq : String
  indication? : Option String := none
  prn : Bool := false
  deriving DecidableEq, Repr, Inhabited

/-- The clinical choices for one task. -/
structure TaskChoices where
  /-- W1, W3, W5, W6 (pre-op/post-op), W7 (modify). -/
  orders : List OrderChoice := []
  /-- W4: meds due this pass. -/
  administer : List OrderChoice := []
  /-- W2. -/
  ackResult : Bool := false
  /-- W7: `"approve"` | `"deny"` | `"modify"`. -/
  refill? : Option String := none
  /-- W3: `"admit"` | `"discharge"` | `"consult"`. -/
  disposition? : Option String := none
  /-- W5: CVX codes. -/
  immunizations : List String := []
  /-- Documentation sections to complete. -/
  noteSections : List String := []
  deriving DecidableEq, Repr, Inhabited

/-- Persona behavior (not clinical choices). -/
structure PersonaParams where
  id : String
  role : Role
  /-- Percent of entries done by keyboard shortcut when available. -/
  keyboardShare : Nat
  /-- Creates receipts during rooming. -/
  reviewsAllergiesEarly : Bool
  scansSidebar : Bool
  /-- Per-mille chance of a detour per screen. -/
  backtrackRate : Nat
  searchWhenBuried : Bool
  /-- Per-mille chance of overriding a removable alert instead of reading it. -/
  overrideRate : Nat
  deriving DecidableEq, Repr, Inhabited

/-- KLM-style operators charged for an event. -/
inductive Op
  | click | key | scroll | scan | point | think | wait
  deriving DecidableEq, Repr, Inhabited

/-- One event in a simulated day. -/
structure TraceEvent where
  task : String
  /-- Deciseconds since shift start. -/
  t : Nat
  screen : ScreenId
  event : Event
  ops : List Op
  result : StepResult
  deriving DecidableEq, Repr, Inhabited

/-- Effort counts for one task. -/
structure TaskMetrics where
  task : String
  clicks : Nat
  keystrokes : Nat
  scrolls : Nat
  popups : Nat
  overrides : Nat
  searches : Nat
  backtracks : Nat
  klmDeciSec : Nat
  completed : Bool
  deriving DecidableEq, Repr, Inhabited

/-- The result of simulating one day for one persona. -/
structure DayResult where
  day : Nat
  persona : String
  programVersion : Nat
  trace : List TraceEvent
  tasks : List TaskMetrics
  /-- The same tasks at the floor (human-only steps and clinical choices only). -/
  floor : List TaskMetrics
  /-- Prompts a receipt could not satisfy, with reasons. -/
  complaints : List String
  deriving DecidableEq, Repr, Inhabited

/-! ## Checker formats (section 8) -/

/-- The checker's verdict on a program. -/
inductive Verdict
  | ok
  /-- The violated property, a message, and a click path that shows it. -/
  | violation (property : String) (message : String)
      (counterexample : List Event) (screens : List ScreenId)
  deriving DecidableEq, Repr, Inhabited

/-- Stored next to each deployed program. -/
structure Certificate where
  specVersion : String
  specHash : String
  programHash : String
  verdict : Verdict
  checkerVersion : String
  /-- ISO 8601 timestamp of the check. -/
  time : String
  deriving DecidableEq, Repr, Inhabited

end Ehr
