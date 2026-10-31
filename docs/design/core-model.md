# Core model: data formats and interpreter semantics

This is the contract every lane builds against. It sits under `BRIEF.md`. The Lean types below give the **authoritative shape**: fix syntax and deriving details as needed, but get orchestrator/owner approval for any change in meaning. Once implemented, the Lean files (`lean/Ehr/Core/*.lean`) are the source of truth, and TS types are generated from them.

## 1. Design principle: safety by construction, plus a checker for the rest

The interpreter (Lean, compiled to WASM for the app and native for the pipeline) enforces safety for **every** program:
- **The commit guard (T0):** a commit happens only if its entry requirements are captured and confirmed, its review requirements are shown or covered by a valid receipt, its human-only elements were entered by a human in this episode, and every interruptive alert concerning it has been acknowledged.
- **Macros run as `actor := macro`.** The interpreter refuses human-only events from a macro (entering human-only elements, scans, cosign, acks, commits), so a macro stops there (T3, T6).
- **Alerts** are evaluated by the interpreter from the spec and the facts:
  - an alert appears only when its condition holds (A2);
  - an interruptive alert is not re-raised for the same key in an episode (A3);
  - a passive alert never pops up (A4).
- **Prefill on a `never` element is ignored.** A prefilled value for a confirm-policy element doesn't count until a human confirms it.
- **Captured weight in `lb`** never satisfies a `kg` requirement.

The **checker** (offline) then certifies that a program is usable and well designed. These are mostly structural checks, each proven to imply its semantic property (T1):
- well-formed (catalog, landmarks, depth);
- completable (the guard never leaves the user stuck: required info is pinned on the commit screen or receipt-conditional, fields are reachable, and human steps are reachable);
- enter once;
- writes only;
- prefill policy;
- units;
- A1 (each interruptive alert has a popup path before its commit, and each passive alert is shown inline on its relevant screen);
- the alert budget;
- the stability budget.

It also rejects malformed constructs even where the interpreter would neutralize them (for example, a macro containing a human-only step, or a prefill on a `never` element), returning a counterexample. Defense in depth: the checker rejects, and the interpreter would block anyway.

## 2. Types (Lean sketch)

```lean
namespace Ehr
abbrev ElementId := String   -- spec data element, e.g. "weight", "patientIdReentry", "abxIndication"
abbrev InfoId    := String   -- displayable info, e.g. "allergyList", "currentMeds", "doseCheck", "resultTrend"
abbrev CommitId  := String   -- "signOrders" | "signNote" | "approveRefill" | "ackResult" | "administerMed"
                             -- | "recordImmunization" | "signOpNote" | "discharge" | ...
abbrev AlertId   := String
abbrev ScreenId  := String
abbrev CompId    := String
abbrev MacroId   := String
abbrev UserId    := String

inductive Role | physician | np | rn | surgeon   -- a surgeon is a physician with a surgical task mix; keep separate for permissions clarity
inductive UnitKind | kg | lb | g | mg | mcg | mL | mgPerKg | units | none
inductive PrefillPolicy | never | recordConfirm | defaultConfirm | autoLinked
inductive Friction | safety | compliance | accidental

inductive ValueKind
  | quantity (unit : UnitKind)    -- required unit
  | coded (valueSet : String)
  | text
  | flag                          -- a checkbox / confirmation
  | identity                      -- patient-ID re-entry; must match the patient's initials/sex/age
  | scan (target : String)        -- "wristband" | "medication"
  | cosign                        -- a second user's ID; must differ from the current user

structure ElementSpec where
  id : ElementId
  label : String
  kind : ValueKind
  enteredBy : List Role
  prefill : PrefillPolicy
  friction : Friction
  humanOnly : Bool := false        -- re-performed by a human every time; never automated
  linkedFrom : Option ElementId := none   -- for autoLinked
  fhirTarget : String              -- where the app writes it, e.g. "MedicationRequest.reasonCode"

structure InfoSpec where
  id : InfoId
  label : String
  version : String                 -- name of the fact that versions it (e.g. "allergyVersion"), "" if unversioned

structure CommitSpec where
  id : CommitId
  label : String
  roles : List Role

inductive When
  | always
  | orderClass (cls : String)      -- some order line's drug is in this class
  | medClass (cls : String)        -- the med being given is in this class
  | highAlertMed
  | abnormalResult

structure EntryReq where
  commit : CommitId
  element : ElementId
  when : When := .always
  perOrderLine : Bool := false     -- required for each order line that matches `when`

inductive ReviewMode
  | shownOnCommit                  -- shown on the commit screen; no receipt allowed
  | shownOrReceipt (windowMin : Nat) (roles : List Role)

structure ReviewReq where
  commit : CommitId
  info : InfoId
  mode : ReviewMode
  when : When := .always

inductive AlertCond | drugAllergy | interaction | duplicateTherapy | doseOutOfRange | weightInLb | careGap | highAlertMed
inductive Tier | interruptive | passive | removable

structure AlertSpec where
  id : AlertId
  label : String
  cond : AlertCond
  tier : Tier
  commit : CommitId                -- the commit it concerns
  screens : List String := []      -- workflows/screens where a passive alert must be shown inline

structure DesignRules where
  maxDepth : Nat
  minTextSize : Nat                -- legibility: Size.tiny is below this
  stabilityBudget : Nat            -- max components moved per accepted version
  landmarks : List InfoId          -- e.g. ["patientBanner"]: must be on every screen
  catalog : List String            -- allowed component kind tags

structure Spec where
  version : String
  elements : List ElementSpec
  infos : List InfoSpec
  commits : List CommitSpec
  entries : List EntryReq
  reviews : List ReviewReq
  alerts : List AlertSpec
  design : DesignRules
```

### UI programs (flat component list, so they are easy to patch, diff, and prove things about)
```lean
inductive Slot | fixed (n : Nat) | current              -- order line index; `current` = state.currentSlot
inductive Prefill | none | fromRecord (fact : String) | default (value : String) | linked (element : ElementId)
inductive Action
  | goto (screen : ScreenId) | back
  | commit (commit : CommitId)
  | markReviewed (info : InfoId)                         -- creates a receipt
  | newOrderLine
inductive Visibility | always | unlessReceipt (info : InfoId)
inductive Size | normal | compact | tiny

inductive Kind
  | banner
  | field (element : ElementId) (slot : Slot) (prefill : Prefill)   -- text/number/coded/scan/cosign/identity input
  | panel (info : InfoId)      -- read-only info block
  | table (info : InfoId)
  | trend (info : InfoId)
  | alert (alert : AlertId) (popup : Bool)
  | button (action : Action)
  | group (collapsible : Bool) (startCollapsed : Bool)
  | tabs                       -- children pick their tab with `tab`
  | macro (id : MacroId)       -- a button that runs a macro
  | search (scope : String)

structure Component where
  id : CompId
  kind : Kind
  label : String := ""
  parent : Option CompId := none   -- a group or tabs component on the same screen
  tab : Nat := 0
  visibility : Visibility := .always
  size : Size := .normal
  hotkey : Option String := none
  tag : String := ""               -- stable semantic tag used by agent patches and stability tracking
  copyOf : Option CompId := none   -- marks a copy (copies don't count against the stability budget)

structure Screen where
  id : ScreenId
  title : String
  workflow : String                -- "W1" … "W7"
  components : List Component      -- list order = render order

inductive MacroStep | setValue (comp : CompId) (value : String) | click (comp : CompId) | goto (screen : ScreenId)
structure Macro where
  id : MacroId
  label : String
  steps : List MacroStep

structure Program where
  id : String
  version : Nat
  owner : UserId
  role : Role
  specVersion : String
  start : ScreenId
  screens : List Screen
  macros : List Macro
```

### Facts (the FHIR abstraction; computed by Lean from a FHIR bundle)
```lean
structure DrugInfo where
  code : String                    -- RxNorm
  name : String
  classes : List String            -- "antibiotic", "penicillin", "anticoagulant", "insulin", ...
  minMgPerKgTenths : Nat
  maxMgPerKgTenths : Nat
  highAlert : Bool
  interactsWith : List String      -- classes

structure PatientIdentity where
  initials : String
  sex : String
  ageYears : Nat

structure Facts where
  patientId : String
  identity : PatientIdentity
  allergyVersion : Nat             -- from AllergyIntolerance meta.versionId (sum/max over the list)
  allergyClasses : List String
  medsVersion : Nat
  currentMedClasses : List String
  weightToday : Option (Nat × UnitKind)   -- tenths, unit as recorded
  careGaps : List String
  abnormalResult : Bool
  now : Nat                        -- minutes since the day's start
```
The formulary (`List DrugInfo`) is reference data in Lean (`Ehr/Formulary.lean`), keyed by the RxNorm codes Synthea uses.

### Interpreter state and events
```lean
inductive Value | qty (tenths : Nat) (unit : UnitKind) | code (c : String) | text (s : String) | flag (b : Bool) | user (u : UserId)
inductive Actor | human | macro

structure Captured where
  element : ElementId
  slot : Nat
  value : Value
  byHuman : Bool
  confirmed : Bool                 -- false for prefills awaiting a human confirm
  provenance : Option String

structure Receipt where
  info : InfoId
  dataVersion : Nat
  time : Nat
  role : Role
  user : UserId

structure User where
  id : UserId
  role : Role

structure State where
  screen : ScreenId
  history : List ScreenId
  captured : List Captured
  receipts : List Receipt          -- initialized from context (prior Provenance), plus new ones
  acked : List (AlertId × String)  -- alert + key (drug code / slot) handled this episode
  commits : List CommitId
  expanded : List CompId           -- groups the user has opened (initially: non-startCollapsed groups)
  tabSel : List (CompId × Nat)     -- tab index per tabs component (default 0)
  popup : Option (AlertId × String)
  currentSlot : Nat
  clock : Nat                      -- deciseconds since the episode started (simulation advances it)

inductive Event
  | click (comp : CompId)          -- button, macro button, group header (toggles), tab header via selectTab
  | selectTab (comp : CompId) (idx : Nat)
  | enter (comp : CompId) (value : Value)
  | confirm (comp : CompId)        -- confirm a prefilled value
  | ack (alert : AlertId)          -- handle the current popup
  | scroll (screen : ScreenId)
  | search (query : String)
```

## 3. Interpreter semantics (key rules)

`step : Spec → Program → Facts → User → Actor → State → Event → State × StepResult`. `StepResult` reports `ok | blocked (reason) | ignored`, so traces and counterexamples can explain themselves.

- **Visibility.** A component is *shown* iff:
  - it is on the current screen;
  - every ancestor group is expanded and every ancestor `tabs` has its tab selected;
  - its visibility condition holds (`unlessReceipt i`: no valid receipt for `i`);
  - its size is not `tiny`.
- **Valid receipt** for info `i` at commit `c` under `shownOrReceipt w roles`:
  - its `dataVersion` equals the current fact version for `i`;
  - `clock - time ≤ w` (in minutes);
  - its role is in `roles`.
- **`enter`** on a field:
  - allowed only if the user's role is in `enteredBy`;
  - if the actor is a macro and the element is `humanOnly` or kind `identity`/`scan`/`cosign`, it is blocked;
  - an `identity` value must match `Facts.identity`;
  - a `cosign` value must differ from `User.id`;
  - stores `Captured` with `byHuman := actor = human` and `confirmed := true`.
- **Prefill** happens when a screen is entered. A field with `fromRecord`/`default`/`linked` gets a value with `confirmed := false` and provenance, unless:
  - the element policy is `never`: the prefill is ignored;
  - the policy is `autoLinked`: `confirmed := true`.

  `confirm` (human only) sets `confirmed := true`.
- **`click`** on a `commit c` button: if the guard fails, the result is `blocked reason`. If it passes but an interruptive alert concerning `c` holds and isn't acked for its key, the alert is set as `popup` and the result is `blocked "alert"`. Otherwise `c` is appended to `commits`.
- **Guard(c):**
  - all applicable `EntryReq` are captured and confirmed, with unit = the required unit;
  - `humanOnly` elements were captured `byHuman` in this episode;
  - all applicable `ReviewReq` are shown on the current screen, or covered by a valid receipt (`shownOrReceipt` only);
  - all applicable interruptive alerts are acked;
  - the user's role is in `CommitSpec.roles`.
- **`ack a`:** human only, and only when `popup = some (a, k)`; adds `(a, k)` to `acked` and clears `popup`.
- **Alerts:** an alert component is visible only if its condition holds (A2). Passive alerts never become `popup` (A4). An acked `(a, k)` never pops up again in the episode (A3).
- **`markReviewed i`:** adds a receipt with the current version, clock, and the user's role.
- **Macros:** clicking a macro button runs its steps as `actor := macro` through `step`, stopping at the first step that is not `ok`.

## 4. Screen view (what React paints)

`view : Spec → Program → Facts → User → State → ScreenView`, where:
- `ScreenView` has `screen`, `title`, `items : List ItemView` (every component on the screen, in order, with `shown : Bool`, `depth`, `expanded`, `selectedTab`), `enabled : List CompId`, `blocked : List (CompId × String)`, and `popup`.
- Each `ItemView` carries:
  - the component;
  - the bound value with its provenance and pending-confirm flag (for fields);
  - whether the alert condition holds (for alerts).
- React renders info contents (allergy rows, med lists, trends) from FHIR by `InfoId`. Lean decides presence and visibility.

## 5. Interfaces
- **WASM library (option A):** JSON in and JSON out, exporting:
  - `init(specJson, programJson, factsOrBundleJson, userJson) → stateJson`;
  - `step(…, stateJson, eventJson) → {state, result}`;
  - `view(…, stateJson) → screenViewJson`;
  - `facts(bundleJson) → factsJson`.

  Keep the exported surface tiny and string-based.
- **Native `ehr` CLI:** `check`, `simulate`, `min-clicks`, `run-batch`, `spec-export`, `deploy`, plus `serve` (option B fallback only). JSON over files/stdin/stdout.

## 6. JSON conventions
- Use derived `ToJson`/`FromJson`. Enum constructors serialize as strings.
- Programs live in `programs/<owner>/v<N>.json` and the canonical one in `programs/canonical/v<N>.json`. Specs are exported to `releases/<ver>/spec.json`.
- TS types are generated from Lean (lane A emits a JSON Schema or a `.d.ts` via a small Lean generator). Hand-written TS mirrors are temporary and must be replaced.
