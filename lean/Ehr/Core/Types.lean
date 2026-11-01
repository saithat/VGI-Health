/-!
Core data formats: hospital rules, UI programs, patient facts, state and events.
Imports only Init; JSON readers and writers live in Ehr.Core.Json.
Optional fields ending in `?` omit that suffix in JSON and are absent when none.
See docs/design/core-model.md for field meanings.
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
  /-- A dose in a unit declared for the selected formulary drug, on this slot. -/
  | medicationDose
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

/-- Closed, reviewable input/output constraints; no executable predicates. -/
inductive Validation
  | nonempty
  | codeMember (system version : String)
  | isoDate
  | token (minLength maxLength : Nat) (alphabet : String)
  /-- Text/code retains lexical input; leading/trailing zeros are forbidden
  when their flags are false. Ordinary quantities retain their numeric meaning. -/
  | decimal (maxFraction : Nat) (leadingZeros trailingZeros : Bool)
  | quantityRange (unit : UnitKind) (minTenths maxTenths : Nat)
  | formulationUnit (formulation : ElementId) (pairs : List (String × UnitKind))
  | weightBand (minKgTenths maxKgTenths : Nat)
  | gtin14
  /-- GS1 UDI with mandatory (01), optional (17), (10), (21), in that order. -/
  | udiGs1
  | supplyDaysCeil (quantity dose frequency : ElementId)
  | doseByWeight (weight : ElementId) (factorTenths capTenths : Nat) (unit : UnitKind)
  | and (left right : Validation)
  deriving DecidableEq, Repr, Inhabited

/-- Trusted, versioned terminology/product table. Membership is enforced,
not inferred from a ValueKind.coded value-set name. -/
structure CodeTable where
  system : String
  version : String
  codes : List String
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
  /-- The sole named record fact a fromRecord prefill may use. None forbids it. -/
  recordFact? : Option String := none
  /-- Where the app writes the value, e.g. `"MedicationRequest.reasonCode"`. -/
  fhirTarget : String
  validation? : Option Validation := none
  defaultValue? : Option String := none
  deriving DecidableEq, Repr, Inhabited

/-- Closed patient/episode dimensions. Values retain their source coding. -/
inductive ClinicalField
  | service | payer | setting | homelessness | pregnancy | capacity | consent
  deriving DecidableEq, Repr, Inhabited

/-- A current-version coded clinical fact with explicit record provenance. -/
structure ClinicalObservation where
  code : String
  artifactKey : String
  artifact : String
  version : Nat
  deriving DecidableEq, Repr, Inhabited

/-- Age in years with the record source used to establish it. -/
structure ClinicalAge where
  years : Nat
  source : ClinicalObservation
  deriving DecidableEq, Repr, Inhabited

/-- Named facts, not overloaded encounter-kind strings. Absence means unknown. -/
structure ClinicalFacts where
  age? : Option ClinicalAge := none
  service? : Option ClinicalObservation := none
  payer? : Option ClinicalObservation := none
  setting? : Option ClinicalObservation := none
  homelessness? : Option ClinicalObservation := none
  pregnancy? : Option ClinicalObservation := none
  capacity? : Option ClinicalObservation := none
  consent? : Option ClinicalObservation := none
  risks : List (String × ClinicalObservation) := []
  testResults : List (String × ClinicalObservation) := []
  deriving DecidableEq, Repr, Inhabited

/-- Closed applicability language. Evaluation is three-valued; unknown
conservatively applies a requirement and fires an explicit unknown alert key. -/
inductive ClinicalPredicate
  | ageBetween (minYears maxYears : Nat)
  | factEquals (field : ClinicalField) (code : String)
  | riskEquals (risk code : String)
  | testEquals (test code : String)
  | capturedCode (element : ElementId) (slot : Nat) (code : String)
  | and (left right : ClinicalPredicate)
  | or (left right : ClinicalPredicate)
  | not (predicate : ClinicalPredicate)
  deriving DecidableEq, Repr, Inhabited

/-- Identifier categories with semantic meaning, independent of HTML layout. -/
inductive IdentifierCategory
  | patient | encounter | order | drug | product | prescriber | pharmacy
  deriving DecidableEq, Repr, Inhabited

/-- A required payload field, with optional value and availability checks. -/
structure PayloadFieldReq where
  field : String
  /-- False availability explicitly skips this field; absent/unknown requires it. -/
  ifAvailable : Bool := false
  kind? : Option ValueKind := none
  validation? : Option Validation := none
  deriving DecidableEq, Repr, Inhabited

/-- Required fields and identifier categories, on every row when requested. -/
structure PayloadContract where
  fields : List PayloadFieldReq := []
  identifiers : List IdentifierCategory := []
  rowFields : List String := []
  rowConstraints? : Option (List PayloadFieldReq) := none
  groupBy? : Option String := none
  deriving DecidableEq, Repr, Inhabited

/-- A categorized identifier with its system and value. -/
structure PayloadIdentifier where
  category : IdentifierCategory
  system : String
  value : String
  deriving DecidableEq, Repr, Inhabited

/-- One identified payload row, its order slot, values and availability evidence. -/
structure PayloadRow where
  id : String
  slot : Nat
  fields : List (String × String)
  availability? : Option (List (String × Bool)) := none
  deriving DecidableEq, Repr, Inhabited

/-- Trusted current-version data, not a declaration that a placeholder exists. -/
structure InfoPayload where
  info : InfoId
  patient : String
  artifactKey : String
  artifact : String
  version : Nat
  fields : List (String × String) := []
  identifiers : List PayloadIdentifier := []
  availability : List (String × Bool) := []
  rows : List PayloadRow := []
  deriving DecidableEq, Repr, Inhabited

/-- The current named phase of a workflow. -/
structure WorkflowPhase where
  workflow : String
  phase : String
  deriving DecidableEq, Repr, Inhabited

/-- The commit or workflow phase where a display requirement applies. -/
inductive DisplayScope
  | commit (id : CommitId)
  | phase (workflow name : String)
  deriving DecidableEq, Repr, Inhabited

/-- An independent display contract; no review receipt or waiver bypasses it. -/
structure DisplayReq where
  info : InfoId
  scope : DisplayScope
  when? : Option ClinicalPredicate := none
  pinned : Bool := false
  /-- Confirmed flags on each row's slot drive selection emphasis. -/
  selectionElement? : Option ElementId := none
  deriving DecidableEq, Repr, Inhabited

/-- A payload row and whether a confirmed selection marks it. -/
structure SelectedPayloadRow where
  row : PayloadRow
  selected : Bool
  deriving DecidableEq, Repr, Inhabited

/-- Rows sharing a display grouping key. -/
structure PayloadGroup where
  key : String
  rows : List SelectedPayloadRow
  deriving DecidableEq, Repr, Inhabited

/-- The source payload and its grouped rows for display. -/
structure PayloadView where
  source : InfoPayload
  groups : List PayloadGroup
  deriving DecidableEq, Repr, Inhabited

/-- A piece of information the UI can display. -/
structure InfoSpec where
  id : InfoId
  label : String
  /-- Name of the fact that versions this info (e.g. `"allergyVersion"`),
  or `""` if it is not versioned. -/
  version : String
  payload? : Option PayloadContract := none
  deriving DecidableEq, Repr, Inhabited

/-- A named clinical or documentation event (completion and filing are distinct). -/
abbrev EventId := String

/-- Select current-version evidence through a caller-supplied artifact binding. -/
structure EventRef where
  event : EventId
  artifactKey : String
  deriving DecidableEq, Repr, Inhabited

/-- Elapsed minutes or hospital-calendar business dates crossed. -/
inductive TimeMetric
  | minutes
  | businessDays (calendar : String)
  deriving DecidableEq, Repr, Inhabited

/-- Ordering is independent of the number of business dates crossed. -/
inductive TemporalDirection
  | before | after | either
  deriving DecidableEq, Repr, Inhabited

/-- Subject time minus anchor time must lie in these inclusive bounds.
The deadline is an explicit offset from the anchor, in the same metric.
Missing evidence always blocks; passing a deadline also exposes overdue status. -/
structure TemporalReq where
  id : String
  when? : Option ClinicalPredicate := none
  subject : EventRef
  anchor : EventRef
  metric : TimeMetric := .minutes
  /-- Required for business-day windows, whose zero distance alone has no ordering. -/
  direction? : Option TemporalDirection := none
  minOffset : Int
  maxOffset : Int
  deadline : Int
  deriving DecidableEq, Repr, Inhabited

/-- Current artifact identity/version, supplied by the record adapter. -/
structure ArtifactBinding where
  key : String
  artifact : String
  version : Nat
  deriving DecidableEq, Repr, Inhabited

/-- Trusted evidence, never manufactured by a UI click or typed attestation.
Timestamps are UTC epoch minutes, including times before the epoch. -/
structure EventEvidence where
  event : EventId
  patient : String
  episode : String
  actor : UserId
  artifact : String
  version : Nat
  time : Int
  /-- Only anchors may describe planned future events. -/
  planned : Bool := false
  deriving DecidableEq, Repr, Inhabited

/-- Hospital-local business dates as epoch-day numbers, with explicit coverage.
The adapter owns timezone/holiday conversion; duplicate dates do not add days. -/
structure BusinessCalendar where
  id : String
  firstDay : Int
  lastDay : Int
  workingDays : List Int
  /-- UTC-minute transition -> local offset in minutes. None denotes UTC;
  other zones require coverage before both endpoints, including DST changes. -/
  utcOffsets? : Option (List (Int × Int)) := none
  deriving DecidableEq, Repr, Inhabited

/-- Status of an event obligation, also returned by the screen view. -/
inductive ObligationStatus
  | met | missing | invalid | overdue
  deriving DecidableEq, Repr, Inhabited

/-- A requirement status for one commit, reported to the screen view. -/
structure ObligationView where
  commit : CommitId
  requirement : String
  status : ObligationStatus
  deriving DecidableEq, Repr, Inhabited

/-- Durable order/detention identity, independent of UI slots and episodes. -/
abbrev OrderInstanceId := String
/-- The original order timestamp from which expiry is measured. -/
inductive ClockAnchor
  | issued | started | firstFill
  deriving DecidableEq, Repr, Inhabited

/-- A hospital-local civil timestamp and its UTC instant. The timezone adapter
supplies the offset; core verifies date validity and exact UTC conversion. -/
structure ClockStamp where
  time : Int
  year : Nat
  month : Nat
  day : Nat
  minuteOfDay : Nat
  utcOffsetMinutes : Int
  zone : String
  deriving DecidableEq, Repr, Inhabited

/-- Resolved calendar anniversary; timezone service resolves DST ambiguity.
Core checks the anniversary date, wall time, zone, and UTC conversion. -/
structure MonthCutoff where
  anchor : ClockAnchor
  months : Nat
  stamp : ClockStamp
  deriving DecidableEq, Repr, Inhabited

/-- A renewal event with actor, time and record version. -/
structure ClockRenewal where
  event : EventId
  time : Int
  actor : UserId
  version : Nat
  deriving DecidableEq, Repr, Inhabited

/-- Original anchors are record inputs. Navigation, transfer and renewal never
write them. Renewal evidence belongs to this durable instance/current version. -/
structure OrderClock where
  id : OrderInstanceId
  patient : String
  issued : ClockStamp
  started? : Option ClockStamp := none
  firstFill? : Option ClockStamp := none
  monthCutoffs : List MonthCutoff := []
  renewals : List ClockRenewal := []
  deriving DecidableEq, Repr, Inhabited

/-- An expiry interval measured in minutes or calendar months. -/
inductive ExpiryDuration
  | minutes (duration : Nat)
  | calendarMonths (months : Nat)
  deriving DecidableEq, Repr, Inhabited

/-- The renewal event required and how long its evidence remains valid. -/
structure RenewalPolicy where
  event : EventId
  validForMinutes : Nat
  deriving DecidableEq, Repr, Inhabited

/-- Actions are blocked at expiry, including the exact cutoff instant.
Renewal is allowed only when explicitly authorized; maximum original lifetime
and reassessment remain independent requirements and cannot be reset. -/
structure ExpiryReq where
  id : String
  orderKey : String
  anchor : ClockAnchor
  duration : ExpiryDuration
  when? : Option ClinicalPredicate := none
  renewal? : Option RenewalPolicy := none
  reassessment? : Option RenewalPolicy := none
  maxOriginalMinutes? : Option Nat := none
  deriving DecidableEq, Repr, Inhabited

/-- In this encounter kind, only these roles may perform the commit. -/
structure EncounterRoleRule where
  encounter : String
  roles : List Role
  reason : String
  deriving DecidableEq, Repr, Inhabited

/-- A commit and the roles allowed to perform it. -/
structure CommitSpec where
  id : CommitId
  label : String
  roles : List Role
  temporal? : Option (List TemporalReq) := none
  expiry? : Option (List ExpiryReq) := none
  actionLabel? : Option String := none
  /-- No encounter-specific role restriction when absent. Matching rules all apply. -/
  encounterRoles? : Option (List EncounterRoleRule) := none
  deriving DecidableEq, Repr, Inhabited

/-- When a requirement applies. -/
inductive When
  /-- Always. -/
  | always
  /-- Some order line's drug is in this class. -/
  | orderClass (cls : String)
  /-- Some medication order line's drug is in this class (alias of orderClass).
  Per-order-line requirements test only that line's drug. -/
  | drugClass (cls : String)
  /-- The medication being given is in this class. -/
  | medClass (cls : String)
  /-- A high-alert medication is involved. -/
  | highAlertMed
  /-- The patient has an abnormal result. -/
  | abnormalResult
  /-- Episode encounter kind, e.g. "preop" (not a historical encounter). -/
  | encounter (kind : String)
  /-- Some order drug has a nonzero weight-based dose range. -/
  | weightBased
  /-- Naloxone should be offered (CA B&P Code §741): some order line's drug is
  an opioid, and the patient takes a benzodiazepine or the line's daily MME is
  90 or more (an unknown dose, frequency, or MME factor counts as a risk). -/
  | naloxoneRisk
  | clinical (predicate : ClinicalPredicate)
  deriving DecidableEq, Repr, Inhabited

/-- An element that must be captured before a commit. -/
structure EntryReq where
  commit : CommitId
  element : ElementId
  when : When := .always
  /-- Required for each order line that matches `when`. -/
  perOrderLine : Bool := false
  /-- Allowed values, parsed using the element's kind. None adds no constraint;
  some [] permits no value. For numeric refills, some ["0"] permits only zero. -/
  allowed? : Option (List String) := none
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
  | clinical (predicate : ClinicalPredicate)
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
  /-- Workflow tags whose screens must show this passive alert inline.
  These are Screen.workflow values, never program-specific screen IDs. -/
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
  displays? : Option (List DisplayReq) := none
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
  /-- Requests prior authorization for the current order line (release v2).
  It captures only the `"priorAuthRequest"` element (a ServiceRequest/Task). -/
  | requestPriorAuth
  deriving DecidableEq, Repr, Inhabited

/-- When a component is visible. `unlessReceipt i`: only when there is no
valid receipt for `i`. -/
inductive Visibility
  | encounter (kind : String)
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
  /-- Prior-authorization status of the current order line (release v2;
  catalog tag `"priorAuth"`). Counts as showing `info`, like a panel. -/
  | priorAuth (info : InfoId)
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

/-- A source-only template. String fields may use `{{param}}` placeholders.
Bodies cannot contain `use`; expansion is finite and structural. -/
structure ComponentDef where
  name : String
  params : List String
  body : List Component
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
  componentDefs : List ComponentDef := []
  /-- Opt in to the certified patient-selection workspace; omitted by archived programs. -/
  patientSelection? : Option Bool := none
  deriving DecidableEq, Repr, Inhabited

/-! ## Facts (the patient record, abstracted) -/

/-- A patient in the day's searchable directory. IDs remain transport metadata. -/
structure PatientChoice where
  id : String
  name : String
  mrn : String
  deriving DecidableEq, Repr, Inhabited

/-- One department-list row, with its explicit patient binding. -/
structure PatientListRow where
  patient : String
  fields : List (String × String)
  /-- Exact source work item; transport may retain its existing encounter/task focus. -/
  source? : Option String := none
  deriving DecidableEq, Repr, Inhabited

/-- A source-bounded landing activity. It contains no clinical captures. -/
structure PatientActivity where
  info : InfoId
  title : String
  rows : List PatientListRow
  deriving DecidableEq, Repr, Inhabited

/-- Day context is separate from the selected patient's clinical facts. -/
structure PatientDirectory where
  patients : List PatientChoice
  activities : List PatientActivity
  deriving DecidableEq, Repr, Inhabited

/-- Selected patient and hydration binding. No patient means a list workspace. -/
structure PatientContext where
  patient? : Option String := none
  bound? : Option String := none
  target? : Option ScreenId := none
  activity : String := ""
  query : String := ""
  deriving DecidableEq, Repr, Inhabited

/-- Native-unit dose bounds. Zero means that no bound is specified. -/
structure DoseUnitRule where
  unit : UnitKind
  minTenths : Nat := 0
  maxTenths : Nat := 0
  deriving DecidableEq, Repr, Inhabited

/-- A drug in the formulary. The formulary is keyed by `name`, the lowercase
generic name (e.g. `"amoxicillin"`). -/
structure DrugInfo where
  /-- Lowercase generic name; the key used everywhere else. -/
  name : String
  /-- RxNorm codes for this drug (may be empty). -/
  rxnorm : List String := []
  /-- Allowed dose units and their native-unit ranges; the first is the composer default. -/
  doseUnits : List DoseUnitRule := [{ unit := .mg }]
  /-- Drug classes. The first is the therapeutic class used for
  duplicate-therapy checks; all are used for allergy and interaction matching. -/
  classes : List String
  /-- Usual dose range in tenths of mg per kg (`0`/`0` = no weight-based range). -/
  minMgPerKgTenths : Nat
  maxMgPerKgTenths : Nat
  /-- Absolute per-dose maximum in tenths of mg; 0 means no cap specified. -/
  maxDoseMgTenths : Nat := 0
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
  notesVersion : Nat := 0
  historyVersion : Nat := 0
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
  /-- Kind of this episode, e.g. "preop". Absent means no encounter-kind match. -/
  encounterKind? : Option String := none
  episodeId? : Option String := none
  /-- Absolute time; the existing receipt clock retains its original meaning. -/
  epochMinute? : Option Int := none
  artifactBindings? : Option (List ArtifactBinding) := none
  eventEvidence? : Option (List EventEvidence) := none
  calendars? : Option (List BusinessCalendar) := none
  clinical? : Option ClinicalFacts := none
  codeTables? : Option (List CodeTable) := none
  orderClocks? : Option (List OrderClock) := none
  infoPayloads? : Option (List InfoPayload) := none
  phase? : Option WorkflowPhase := none
  /-- Exact source Patient.id, independent of its business identifier. -/
  sourcePatientId? : Option String := none
  /-- Read-only day lists and the searchable patient directory. -/
  patientDirectory? : Option PatientDirectory := none
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
  /-- Queries entered into shown search components. Absent in legacy episodes. -/
  searchQueries? : Option (List (CompId × String)) := none
  /-- The alert popup currently shown, with its key. -/
  popup? : Option (AlertId × String) := none
  /-- The order line that `Slot.current` fields are bound to. -/
  currentSlot : Nat
  /-- Deciseconds since the episode started (the caller advances it). -/
  clock : Nat
  /-- Present only for programs using in-UI patient selection. -/
  patientContext? : Option PatientContext := none
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
  payload? : Option PayloadView := none
  pinned? : Option Bool := none
  validationError? : Option String := none
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
  /-- For fields: the order line the field is bound to. For `priorAuth`: the
  current order line. -/
  slot : Nat
  /-- For fields: the bound value, if any. For `priorAuth`: the request on the
  current order line (`flag true`), if any. -/
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
  obligations? : Option (List ObligationView) := none
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

/-- Kind of order. Imaging and procedures use a service code, not a drug name. -/
inductive OrderKind
  | medication | imaging | procedure
  deriving DecidableEq, Repr, Inhabited

/-- Surgical workflow step for this task. -/
inductive W6Step
  | consult | preop | postop | rounding | discharge
  deriving DecidableEq, Repr, Inhabited

/-- A clinical decision, fixed per scenario (independent of the UI). -/
structure OrderChoice where
  /-- Formulary name (lowercase generic), e.g. `"amoxicillin"`. -/
  drug : String
  /-- Omitted means medication for compatibility with existing schedules. -/
  kind? : Option OrderKind := none
  /-- Service code (e.g. CPT) for imaging/procedure; drug is empty in that case. -/
  code? : Option String := none
  doseTenths : Nat
  unit : UnitKind
  route : String
  freq : String
  /-- Days supplied for this prescription. -/
  supplyDays? : Option Nat := none
  /-- Documented CURES exemption reason, if applicable to this prescription. -/
  curesExemptReason? : Option String := none
  /-- Reason this administration is held or refused. -/
  holdReason? : Option String := none
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
  /-- Pain score for this task (0-10). -/
  painScore? : Option Nat := none
  /-- W6 stage; independent of free-text documentation. -/
  w6Step? : Option W6Step := none
  /-- Reason for a refill denial or modification. -/
  refillReason? : Option String := none
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
  wallTimeMinutes? : Option Nat := none
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
