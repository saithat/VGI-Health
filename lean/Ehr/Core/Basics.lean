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
/-- The element a prior-authorization request writes (release v1.1). -/
def priorAuthElement : ElementId := "priorAuthRequest"
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

/-! ## Catalog tags -/

/-- The catalog tag of a component kind. `DesignRules.catalog` lists the tags a
program may use. A button that requests prior authorization has the tag
`"priorAuth"`, so it needs the release v1.1 catalog too. -/
def Kind.catalogTag : Kind → String
  | .banner => "banner"
  | .field .. => "field"
  | .panel _ => "panel"
  | .table _ => "table"
  | .trend _ => "trend"
  | .alert .. => "alert"
  | .button .requestPriorAuth => "priorAuth"
  | .button _ => "button"
  | .group .. => "group"
  | .tabs => "tabs"
  | .«macro» _ => "macro"
  | .search _ => "search"
  | .priorAuth _ => "priorAuth"

/-- Every catalog tag a program uses, in order (with repeats). -/
def Program.catalogTags (p : Program) : List String :=
  p.screens.flatMap fun sc => sc.components.map (·.kind.catalogTag)

/-- Every component kind the program uses is in the spec's catalog. -/
def Program.inCatalog (p : Program) (sp : Spec) : Bool :=
  p.catalogTags.all (sp.design.catalog.contains ·)

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

/-- The value of a decimal digit character. -/
def digitVal (c : Char) : Nat := c.toNat - '0'.toNat

/-- Read decimal digits (all characters must be digits) after `acc`. -/
def digitsVal : List Char → Nat → Option Nat
  | [], acc => some acc
  | c :: cs, acc => if c.isDigit then digitsVal cs (acc * 10 + digitVal c) else none

/-- Parse a decimal with at most one digit after the point into tenths
(`"72.5"` ↦ `725`, `"500"` ↦ `5000`). Written over characters, with
structural recursion, so the kernel can evaluate it. -/
def parseTenthsChars (cs : List Char) : Option Nat :=
  match cs.span (· != '.') with
  | ([], _) => none
  | (w, []) => (digitsVal w 0).map (· * 10)
  | (w, ['.', f]) => if f.isDigit then (digitsVal w 0).map (· * 10 + digitVal f) else none
  | _ => none

/-- Parse a decimal with at most one digit after the point into tenths. -/
def parseTenths (s : String) : Option Nat :=
  parseTenthsChars s.toList

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

/-! ## Bound event evidence and temporal obligations -/

/-- Absolute interpreter time; absence never falls back to a day-relative clock. -/
def epochNow (facts : Facts) (s : State) : Option Int :=
  facts.epochMinute?.map (· + Int.ofNat (s.clock / 600))

/-- Require unique bindings/evidence, patient, episode, actor and current version.
An old episode or an obsolete document cannot satisfy a current obligation. -/
def eventTime (facts : Facts) (s : State) (ref : EventRef) (allowPlanned : Bool) : Option Int := do
  let episode ← facts.episodeId?
  let now ← epochNow facts s
  let [binding] := (facts.artifactBindings?.getD []).filter (·.key == ref.artifactKey) | none
  let [ev] := (facts.eventEvidence?.getD []).filter (fun e =>
    e.event == ref.event && e.artifact == binding.artifact) | none
  if episode.isEmpty || binding.artifact.isEmpty || ev.patient != facts.patientId ||
      ev.episode != episode || ev.version != binding.version || ev.actor.isEmpty ||
      (!allowPlanned && ev.planned) || (now < ev.time && !ev.planned) then none
  else some ev.time

/-- Signed distance. Calendar coverage must include both endpoints.
Business-day offsets count working dates in (earlier date, later date]. -/
def timeDistance (facts : Facts) (metric : TimeMetric) (a b : Int) : Option Int :=
  match metric with
  | .minutes => some (b - a)
  | .businessDays name => do
    let [cal] := (facts.calendars?.getD []).filter (·.id == name) | none
    let lo := min (a / 1440) (b / 1440)
    let hi := max (a / 1440) (b / 1440)
    if cal.firstDay > lo || cal.lastDay < hi then none else
      let n := (cal.workingDays.eraseDups.filter (fun d => lo < d && d ≤ hi)).length
      some (if a ≤ b then Int.ofNat n else -Int.ofNat n)

/-- Accept only a uniquely bound, current-version source for a clinical fact. -/
def clinicalSourceValid (facts : Facts) (o : ClinicalObservation) : Bool :=
  match (facts.artifactBindings?.getD []).filter (·.key == o.artifactKey) with
  | [b] => !o.code.isEmpty && !o.artifact.isEmpty && b.artifact == o.artifact && b.version == o.version
  | _ => false

def clinicalCode (facts : Facts) (o : Option ClinicalObservation) : Option String := do
  let o ← o
  if clinicalSourceValid facts o then some o.code else none

def ClinicalFacts.field (f : ClinicalFacts) : ClinicalField → Option ClinicalObservation
  | .service => f.service? | .payer => f.payer? | .setting => f.setting?
  | .homelessness => f.homelessness? | .pregnancy => f.pregnancy?
  | .capacity => f.capacity? | .consent => f.consent?

def namedClinicalCode (facts : Facts) (xs : List (String × ClinicalObservation))
    (name : String) : Option String :=
  match xs.filter (·.1 == name) with
  | [(_, o)] => clinicalCode facts (some o)
  | _ => none

/-- Kleene three-valued logic: false AND unknown is false; true OR unknown
is true; NOT unknown remains unknown. No absent fact becomes false. -/
def clinicalEval (facts : Facts) (s : State) : ClinicalPredicate → Option Bool
  | .ageBetween lo hi => do
    let age ← facts.clinical?.bind (·.age?)
    if clinicalSourceValid facts age.source then some (lo ≤ age.years && age.years ≤ hi) else none
  | .factEquals field code =>
    (clinicalCode facts (facts.clinical?.bind (·.field field))).map (· == code)
  | .riskEquals name code =>
    (namedClinicalCode facts (facts.clinical?.map (·.risks) |>.getD []) name).map (· == code)
  | .testEquals name code =>
    (namedClinicalCode facts (facts.clinical?.map (·.testResults) |>.getD []) name).map (· == code)
  | .capturedCode e slot code =>
    match s.captured.filter (fun x => x.element == e && x.slot == slot) with
    | [x] => if !x.confirmed then none else
      match x.value with | .code c => some (c == code) | _ => none
    | _ => none
  | .and l r =>
    match clinicalEval facts s l, clinicalEval facts s r with
    | some false, _ | _, some false => some false
    | some true, some true => some true
    | _, _ => none
  | .or l r =>
    match clinicalEval facts s l, clinicalEval facts s r with
    | some true, _ | _, some true => some true
    | some false, some false => some false
    | _, _ => none
  | .not p => (clinicalEval facts s p).map (!·)

/-- Fixed explicit unknown policy: requirements apply unless known false. -/
def clinicalApplies (facts : Facts) (s : State) (p : ClinicalPredicate) : Bool :=
  clinicalEval facts s p != some false

/-- Evaluate one obligation. A missing/invalid subject is overdue only after
its explicit deadline; an already completed valid event stays met thereafter. -/
def temporalStatus (facts : Facts) (s : State) (rq : TemporalReq) : ObligationStatus :=
  if rq.when?.any (fun p => !clinicalApplies facts s p) then .met else
  match eventTime facts s rq.anchor true, epochNow facts s with
  | some anchor, some now =>
    let overdue : Bool := match timeDistance facts rq.metric anchor now with
      | some d => rq.deadline < d
      | none => false
    match eventTime facts s rq.subject false with
    | some subject =>
      match timeDistance facts rq.metric anchor subject with
      | some d =>
        if rq.minOffset ≤ d && d ≤ rq.maxOffset && d ≤ rq.deadline then .met
        else if overdue then .overdue else .invalid
      | none => .invalid
    | none => if overdue then .overdue else .missing
  | _, _ => .missing

/-- Additional commit contracts. Kept separate from entries/review receipts. -/
def extraGuard (sp : Spec) (_prog : Program) (facts : Facts) (s : State) (c : CommitId) : Bool :=
  match sp.commit? c with
  | none => false
  | some cs => (cs.temporal?.getD []).all (fun rq => temporalStatus facts s rq == .met)

/-- All event obligations, including ones on screens without a commit button. -/
def obligationViews (sp : Spec) (facts : Facts) (s : State) : List ObligationView :=
  sp.commits.flatMap fun cs => (cs.temporal?.getD []).map fun rq =>
    { commit := cs.id, requirement := rq.id, status := temporalStatus facts s rq }

/-! ## Order lines -/

/-- The order lines: each captured drug with its slot (prefilled or not). -/
def orderLines (s : State) : List (Nat × String) :=
  s.captured.filterMap fun x =>
    if x.element == drugElement then
      match x.value with
      | .code d => some (x.slot, d)
      | _ => none
    else none

/-- Effective order kind; old schedules without a kind describe medications. -/
def OrderChoice.orderKind (o : OrderChoice) : OrderKind :=
  o.kind?.getD .medication

/-- Service orders are the order kinds covered by the CMS-0057-F prior-auth
release; drugs have their own authorization workflows. -/
def OrderChoice.isPriorAuthService (o : OrderChoice) : Bool :=
  o.orderKind != .medication

/-- A captured imaging/procedure order has a kind and a nonempty service code
on the same slot, with no drug on that slot. Drug alerts continue to use only
`orderLines`; a service code is never interpreted as a generic drug name. -/
def serviceOrderAt (s : State) (slot : Nat) : Bool :=
  !(orderLines s).any (·.1 == slot) &&
  s.captured.any (fun x => x.slot == slot && x.element == "orderKind" &&
    (x.value == .code "imaging" || x.value == .code "procedure")) &&
  s.captured.any (fun x => x.slot == slot && x.element == "orderCode" &&
    match x.value with | .code code => !code.isEmpty | _ => false)

/-- Any medication or service order exists on this slot. -/
def hasOrderAt (s : State) (slot : Nat) : Bool :=
  (orderLines s).any (·.1 == slot) || serviceOrderAt s slot

/-- Doses per day for a frequency code (`q4h` 6, `q6h` 4, `q8h` 3, `q12h` 2,
`daily` 1, `bid` 2, `tid` 3, `qid` 4; case does not matter). Unknown: none.
Written over characters so the kernel can evaluate it. -/
def freqPerDay (f : String) : Option Nat :=
  match f.toList.map Char.toLower with
  | ['q', '4', 'h'] => some 6
  | ['q', '6', 'h'] => some 4
  | ['q', '8', 'h'] => some 3
  | ['q', '1', '2', 'h'] => some 2
  | ['d', 'a', 'i', 'l', 'y'] => some 1
  | ['b', 'i', 'd'] => some 2
  | ['t', 'i', 'd'] => some 3
  | ['q', 'i', 'd'] => some 4
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

-- The kernel can evaluate these (used by `decide` in examples).
example : parseTenths "72.5" = some 725 := by decide
example : freqPerDay "QID" = some 4 := by decide
#guard parseTenths "500" == some 5000
#guard parseTenths "7.25" == none
#guard parseTenths "" == none && parseTenths ".5" == none && parseTenths "5." == none
#guard parseTenths "12a" == none
#guard identityText { initials := "JD", sex := "F", ageYears := 34 } == "JD/F/34"

end Ehr
