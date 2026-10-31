import Ehr.Formulary

/-!
# Interpreter basics

Lookups, value checks, time and receipts, order lines, and the layout part of
visibility. Everything here is a plain, computable function over the core
types. Imports only `Init` (through `Ehr.Formulary`).
-/

namespace Ehr

/-! ## Well-known IDs

The interpreter gives a fixed meaning to a few element and info IDs. -/

/-- The element holding an order line's drug: a formulary name, as `Value.code`.
Each slot with a captured drug is an order line. -/
def drugElement : ElementId := "drug"
/-- The element holding an order line's dose (a quantity, checked in mg). -/
def doseElement : ElementId := "dose"
/-- The element holding the patient's weight (required in kg). -/
def weightElement : ElementId := "weight"
/-- The element holding an order line's frequency, e.g. `"q6h"` or `"bid"`. -/
def freqElement : ElementId := "freq"
/-- The info the `banner` component shows. -/
def bannerInfo : InfoId := "patientBanner"

/-! ## Names for messages -/

/-- A role's name, as in JSON. -/
def Role.name : Role → String
  | .physician => "physician" | .np => "np" | .rn => "rn" | .surgeon => "surgeon"

/-- A unit's name, as in JSON. -/
def UnitKind.name : UnitKind → String
  | .kg => "kg" | .lb => "lb" | .g => "g" | .mg => "mg" | .mcg => "mcg" | .mL => "mL"
  | .mgPerKg => "mgPerKg" | .units => "units" | .none => "none"

/-! ## Lookups (first match by ID) -/

/-- The spec's element with this ID. -/
def Spec.element? (sp : Spec) (e : ElementId) : Option ElementSpec :=
  sp.elements.find? (·.id == e)

/-- The spec's info with this ID. -/
def Spec.info? (sp : Spec) (i : InfoId) : Option InfoSpec :=
  sp.infos.find? (·.id == i)

/-- The spec's commit with this ID. -/
def Spec.commit? (sp : Spec) (c : CommitId) : Option CommitSpec :=
  sp.commits.find? (·.id == c)

/-- The spec's alert rule with this ID. -/
def Spec.alert? (sp : Spec) (a : AlertId) : Option AlertSpec :=
  sp.alerts.find? (·.id == a)

/-- The program's screen with this ID. -/
def Program.screen? (p : Program) (s : ScreenId) : Option Screen :=
  p.screens.find? (·.id == s)

/-- The program's macro with this ID. -/
def Program.macro? (p : Program) (m : MacroId) : Option Macro :=
  p.macros.find? (·.id == m)

/-- The components of a screen (empty if the screen does not exist). -/
def Program.compsOf (p : Program) (s : ScreenId) : List Component :=
  match p.screen? s with
  | some sc => sc.components
  | none => []

/-- The selected tab of a tabs component (default 0). -/
def State.tabOf (s : State) (c : CompId) : Nat :=
  match s.tabSel.find? (·.1 == c) with
  | some p => p.2
  | none => 0

/-! ## Elements and values -/

/-- An element only a human may enter: marked `humanOnly`, or of kind
`identity`, `scan`, or `cosign`. Such elements are never prefilled and never
entered by a macro. -/
def needsHuman (el : ElementSpec) : Bool :=
  el.humanOnly ||
    match el.kind with
    | .identity | .scan _ | .cosign => true
    | _ => false

/-- The element with this ID only a human may enter (unknown IDs: no). -/
def Spec.isHumanOnly (sp : Spec) (e : ElementId) : Bool :=
  match sp.element? e with
  | some el => needsHuman el
  | none => false

/-- The text a user must type for patient-ID re-entry, e.g. `"JD/F/34"`. -/
def identityText (p : PatientIdentity) : String :=
  p.initials ++ "/" ++ p.sex ++ "/" ++ toString p.ageYears

/-- A scan matches its target: a wristband scan must read the patient ID; a
medication scan must read the drug being given. Other targets need a
non-empty code. -/
def scanMatches (facts : Facts) (target code : String) : Bool :=
  if target == "wristband" then code == facts.patientId
  else if target == "medication" then facts.medToGive? == some code
  else !code.isEmpty

/-- A value may be entered for an element of this kind. Quantities may be in
any unit here (a wrong unit is stored, raises the weight-in-lb alert, and never
satisfies the guard). An identity must match the patient; a cosign must name a
different user; a scan must match its target. -/
def valueAccepted (facts : Facts) (user : User) : ValueKind → Value → Bool
  | .quantity _, .qty _ _ => true
  | .coded _, .code c => !c.isEmpty
  | .text, .text _ => true
  | .flag, .flag _ => true
  | .identity, .text t => t == identityText facts.identity
  | .scan target, .code c => scanMatches facts target c
  | .cosign, .user u => !u.isEmpty && u != user.id
  | _, _ => false

/-- A value satisfies a requirement for an element of this kind: it is
accepted, a quantity is in the required unit, and a flag is checked. -/
def valueSatisfies (facts : Facts) (user : User) (k : ValueKind) (v : Value) : Bool :=
  valueAccepted facts user k v &&
    match k, v with
    | .quantity u, .qty _ u' => u' == u
    | .flag, .flag b => b
    | _, _ => true

/-- Parse a decimal with at most one digit after the point into tenths
(`"72.5"` ↦ `725`, `"500"` ↦ `5000`). -/
def parseTenths (s : String) : Option Nat :=
  match s.splitOn "." with
  | [w] => (w.toNat?).map (· * 10)
  | [w, f] =>
    if f.length == 1 then
      match w.toNat?, f.toNat? with
      | some a, some b => some (a * 10 + b)
      | _, _ => none
    else none
  | _ => none

/-- Parse a string (a default, a record value, or a macro value) according to
an element's kind. Quantities take the kind's unit. -/
def parseValue (k : ValueKind) (s : String) : Option Value :=
  match k with
  | .quantity u => (parseTenths s).map (Value.qty · u)
  | .coded _ => if s.isEmpty then none else some (.code s)
  | .text => some (.text s)
  | .flag => if s == "true" then some (.flag true)
             else if s == "false" then some (.flag false) else none
  | .identity => some (.text s)
  | .scan _ => some (.code s)
  | .cosign => some (.user s)

/-- A named value from the record, for `Prefill.fromRecord`. `weightToday`
keeps the unit as recorded (so a weight recorded in lb stays in lb). -/
def recordValue (facts : Facts) (k : ValueKind) (fact : String) : Option Value :=
  if fact == "weightToday" then facts.weightToday?.map (fun p => .qty p.1 p.2)
  else if fact == "medToGive" then facts.medToGive?.map .code
  else
    match facts.record.find? (·.1 == fact) with
    | some p => parseValue k p.2
    | none => none

/-! ## Time and receipts -/

/-- The current time in minutes (same scale as `Facts.now` and receipt times). -/
def nowMin (facts : Facts) (s : State) : Nat :=
  facts.now + s.clock / 600

/-- The value of a version fact by name. `""` (unversioned) is version 0.
Unknown names have no version, so no receipt can match them. -/
def factVersion (facts : Facts) (name : String) : Option Nat :=
  if name == "" then some 0
  else if name == "allergyVersion" then some facts.allergyVersion
  else if name == "medsVersion" then some facts.medsVersion
  else none

/-- The current data version of an info (none if the info is unknown). -/
def infoVersion (sp : Spec) (facts : Facts) (i : InfoId) : Option Nat :=
  match sp.info? i with
  | some inf => factVersion facts inf.version
  | none => none

/-- A receipt is valid for info `i`, under a time window (minutes) and a list
of roles, when: it is for `i`; its data version equals the current version;
it is not from the future; it is at most `window` minutes old; and its role is
allowed. -/
def receiptValid (sp : Spec) (facts : Facts) (now : Nat) (i : InfoId)
    (window : Nat) (roles : List Role) (r : Receipt) : Bool :=
  r.info == i && infoVersion sp facts i == some r.dataVersion &&
    decide (r.time ≤ now) && decide (now - r.time ≤ window) && roles.contains r.role

/-- Some review requirement for `i` accepts receipts, and the state holds a
receipt valid under it. Used by `Visibility.unlessReceipt`. -/
def hasValidReceipt (sp : Spec) (facts : Facts) (s : State) (i : InfoId) : Bool :=
  sp.reviews.any fun rq =>
    rq.info == i &&
      match rq.mode with
      | .shownOnCommit => false
      | .shownOrReceipt w roles => s.receipts.any (receiptValid sp facts (nowMin facts s) i w roles)

/-! ## Order lines -/

/-- The order lines: each captured drug with its slot (prefilled or not). -/
def orderLines (s : State) : List (Nat × String) :=
  s.captured.filterMap fun x =>
    if x.element == drugElement then
      match x.value with
      | .code d => some (x.slot, d)
      | _ => none
    else none

/-- Doses per day for a frequency code (`q4h` 6, `q6h` 4, `q8h` 3, `q12h` 2,
`daily` 1, `bid` 2, `tid` 3, `qid` 4; case does not matter). Unknown: none. -/
def freqPerDay (f : String) : Option Nat :=
  match f.toLower with
  | "q4h" => some 6
  | "q6h" => some 4
  | "q8h" => some 3
  | "q12h" => some 2
  | "daily" => some 1
  | "bid" => some 2
  | "tid" => some 3
  | "qid" => some 4
  | _ => none

/-- The frequency (doses per day) captured on an order line, if known. -/
def lineFreqPerDay? (s : State) (slot : Nat) : Option Nat :=
  s.captured.findSome? fun x =>
    if x.element == freqElement && x.slot == slot then
      match x.value with
      | .code f | .text f => freqPerDay f
      | _ => none
    else none

/-- The dose (tenths of mg) captured on an order line, if any. -/
def lineDoseMgTenths? (s : State) (slot : Nat) : Option Nat :=
  s.captured.findSome? fun x =>
    if x.element == doseElement && x.slot == slot then
      match x.value with
      | .qty d .mg => some d
      | _ => none
    else none

/-- The order line's daily MME is 90 or more, or cannot be computed (unknown
dose in mg, frequency, or MME factor: the stricter choice). In tenths:
`dose × perDay × factor ≥ 9000`. -/
def highMme (s : State) (slot : Nat) (d : String) : Bool :=
  match lineDoseMgTenths? s slot, lineFreqPerDay? s slot with
  | some dose, some perDay =>
    mmeFactor d == 0 || decide (9000 ≤ dose * perDay * mmeFactor d)
  | _, _ => true

/-- The order line needs a naloxone offer: its drug is an opioid, and the
patient takes a benzodiazepine or the line's daily MME is high (or unknown). -/
def naloxoneLine (facts : Facts) (s : State) (slot : Nat) (d : String) : Bool :=
  inClass d "opioid" && (facts.currentMedClasses.contains "benzodiazepine" || highMme s slot d)

/-- Drugs in play: the order-line drugs plus the drug being given, if any. -/
def drugsInPlay (facts : Facts) (s : State) : List String :=
  (orderLines s).map (·.2) ++ facts.medToGive?.toList

/-! ## Layout visibility

Whether a component is on screen and open: not tiny, its visibility condition
holds, and each ancestor is shown and open (a group expanded, a tabs component
on the right tab). Alerts also need their condition; see `compShown`. -/

/-- The component's own conditions: not tiny, and its visibility holds. -/
def ownVisible (sp : Spec) (facts : Facts) (s : State) (c : Component) : Bool :=
  c.size != .tiny &&
    match c.visibility with
    | .always => true
    | .unlessReceipt i => !hasValidReceipt sp facts s i

/-- The parent lets the child through: an expanded (or non-collapsible) group,
or a tabs component with the child's tab selected. Anything else: no. -/
def parentOpen (s : State) (parent child : Component) : Bool :=
  match parent.kind with
  | .group collapsible _ => !collapsible || s.expanded.contains parent.id
  | .tabs => s.tabOf parent.id == child.tab
  | _ => false

/-- Layout visibility with a step bound (a parent cycle ends as "not shown"). -/
def layoutShownAux (sp : Spec) (facts : Facts) (s : State) (comps : List Component) :
    Nat → Component → Bool
  | 0, _ => false
  | fuel + 1, c =>
    ownVisible sp facts s c &&
      match c.parent? with
      | none => true
      | some pid =>
        match comps.find? (·.id == pid) with
        | none => false
        | some p => parentOpen s p c && layoutShownAux sp facts s comps fuel p

/-- Layout visibility of a component among the screen's components. -/
def layoutShown (sp : Spec) (facts : Facts) (s : State) (comps : List Component)
    (c : Component) : Bool :=
  layoutShownAux sp facts s comps (comps.length + 1) c

/-- Nesting depth (0 = top level), with a step bound. -/
def depthAux (comps : List Component) : Nat → Component → Nat
  | 0, _ => 0
  | fuel + 1, c =>
    match c.parent? with
    | none => 0
    | some pid =>
      match comps.find? (·.id == pid) with
      | none => 0
      | some p => depthAux comps fuel p + 1

#guard parseTenths "72.5" == some 725
#guard freqPerDay "Q6H" == some 4 && freqPerDay "prn" == none
#guard parseTenths "500" == some 5000
#guard parseTenths "7.25" == none
#guard identityText { initials := "JD", sex := "F", ageYears := 34 } == "JD/F/34"

end Ehr
