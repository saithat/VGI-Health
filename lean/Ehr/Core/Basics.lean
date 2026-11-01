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
    e.event == ref.event && e.artifact == binding.artifact && e.version == binding.version &&
      e.patient == facts.patientId && e.episode == episode) | none
  if episode.isEmpty || binding.artifact.isEmpty || ev.patient != facts.patientId ||
      ev.episode != episode || ev.version != binding.version || ev.actor.isEmpty ||
      (!allowPlanned && ev.planned) || (now < ev.time && !ev.planned) then none
  else some ev.time

/-- Convert UTC event time to a hospital-local epoch day using a complete,
unique offset-transition table. The adapter supplies timezone/DST truth. -/
def businessLocalDay (cal : BusinessCalendar) (time : Int) : Option Int :=
  match cal.utcOffsets? with
  | none => some (time / 1440)
  | some transitions =>
    if (transitions.map (·.1)).eraseDups.length != transitions.length ||
        transitions.any (fun p => p.2 < -840 || 840 < p.2) then none else
    match transitions.filter (fun p => p.1 ≤ time) with
    | [] => none
    | first :: rest =>
      let latest := rest.foldl (fun best next => if best.1 < next.1 then next else best) first
      some ((time + latest.2) / 1440)

/-- Signed distance. Calendar coverage must include both endpoints.
Business-day offsets count working dates in (earlier date, later date]. -/
def timeDistance (facts : Facts) (metric : TimeMetric) (a b : Int) : Option Int :=
  match metric with
  | .minutes => some (b - a)
  | .businessDays name => do
    let [cal] := (facts.calendars?.getD []).filter (·.id == name) | none
    let da ← businessLocalDay cal a
    let db ← businessLocalDay cal b
    let lo := min da db
    let hi := max da db
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

/-- Zero business-day distance does not imply chronological ordering.
An explicit direction is mandatory for that metric, including .either. -/
def temporalOrdering (rq : TemporalReq) (anchor subject : Int) : Bool :=
  match rq.direction? with
  | some .before => subject ≤ anchor
  | some .after => anchor ≤ subject
  | some .either => true
  | none => match rq.metric with | .minutes => true | .businessDays _ => false

/-- Evaluate one obligation. A missing/invalid subject is overdue only after
its explicit deadline; an already completed valid event stays met thereafter. -/
def temporalStatus (facts : Facts) (s : State) (rq : TemporalReq) : ObligationStatus :=
  if rq.when?.any (fun p => !clinicalApplies facts s p) then .met else
  match eventTime facts s rq.anchor true, epochNow facts s with
  | some anchor, some now =>
    let overdue : Bool := match timeDistance facts rq.metric anchor now with
      | some d => rq.deadline < d ||
          (rq.direction? == some .before && rq.deadline == 0 && anchor < now)
      | none => false
    match eventTime facts s rq.subject false with
    | some subject =>
      match timeDistance facts rq.metric anchor subject with
      | some d =>
        if temporalOrdering rq anchor subject && rq.minOffset ≤ d && d ≤ rq.maxOffset && d ≤ rq.deadline then .met
        else if overdue then .overdue else .invalid
      | none => .invalid
    | none => if overdue then .overdue else .missing
  | _, _ => .missing

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

/-- Lexical values are kept verbatim as text/code. Numeric fields have no
lexical spelling and cannot satisfy a lexical constraint. -/
def lexicalValue : Value → Option String
  | .text t | .code t => some t
  | _ => none

def leapYear (y : Nat) : Bool := y % 400 == 0 || (y % 4 == 0 && y % 100 != 0)
def validDate (y m d : Nat) : Bool :=
  let days := if m == 2 then (if leapYear y then 29 else 28)
    else if [4, 6, 9, 11].contains m then 30 else 31
  1 ≤ y && 1 ≤ m && m ≤ 12 && 1 ≤ d && d ≤ days

/-- Read fixed-width digit groups without destructively matching a long list.
This keeps the same full Gregorian date grammar on native and 32-bit WASM. -/
def isoDateValid (t : String) : Bool :=
  match t.splitOn "-" with
  | [year, month, day] =>
    year.length == 4 && month.length == 2 && day.length == 2 &&
      match digitsVal year.toList 0, digitsVal month.toList 0, digitsVal day.toList 0 with
      | some y, some m, some d => validDate y m d
      | _, _, _ => false
  | _ => false

def decimalValid (t : String) (scale : Nat) (leading trailing : Bool) : Bool :=
  let (whole, rest) := t.toList.span (· != '.')
  !whole.isEmpty && (digitsVal whole 0).isSome &&
    (leading || whole.length == 1 || whole.head? != some '0') &&
    match rest with
    | [] => true
    | '.' :: fraction => !fraction.isEmpty && fraction.length ≤ scale &&
        (digitsVal fraction 0).isSome && (trailing || fraction.getLast? != some '0')
    | _ => false

def gtinValid (t : String) : Bool :=
  let cs := t.toList
  cs.length == 14 && cs.all Char.isDigit &&
    (cs.zipIdx.foldl (fun acc (c, i) => acc + digitVal c * (if i % 2 == 0 then 3 else 1)) 0) % 10 == 0

/-- A deliberately closed GS1 human-readable grammar. Other issuer formats
must use an explicitly versioned validated product table, never a loose token. -/
def udiValid (t : String) : Bool :=
  let parts := t.splitOn "("
  match parts with
  | "" :: first :: rest =>
    let gtin := first.drop 3 |>.toString
    first.startsWith "01)" && gtinValid gtin &&
      rest.length ≤ 3 && rest.eraseDups.length == rest.length &&
      (rest.map (fun p => (p.take 3).toString) ==
        (["17)", "10)", "21)"].filter (fun ai => rest.any (·.startsWith ai)))) &&
      rest.all (fun p =>
        let value := (p.drop 3).toString
        if p.startsWith "17)" then
          value.length == 6 && isoDateValid ("20" ++ (value.take 2).toString ++ "-" ++
            ((value.drop 2).take 2).toString ++ "-" ++ (value.drop 4).toString)
        else (p.startsWith "10)" || p.startsWith "21)") &&
          1 ≤ value.length && value.length ≤ 20 && value.toList.all (fun c => c.isAlphanum || c == '-'))
  | _ => false

/-- Relational inputs must be unique, confirmed, and on the same slot. -/
def validationCapture (s : State) (slot : Nat) (e : ElementId) : Option Value :=
  match s.captured.filter (fun x => x.slot == slot && x.element == e) with
  | [x] => if x.confirmed then some x.value else none
  | _ => none

/-- Validation also re-runs at commit, so changed dependencies invalidate outputs. -/
def validationHolds (facts : Facts) (s : State) (slot : Nat) (v : Value) : Validation → Bool
  | .nonempty => (lexicalValue v).any (fun t => !t.trimAscii.toString.isEmpty)
  | .codeMember system version =>
    match (facts.codeTables?.getD []).filter (fun t => t.system == system && t.version == version), lexicalValue v with
    | [table], some code => table.codes.contains code
    | _, _ => false
  | .isoDate => (lexicalValue v).any isoDateValid
  | .token lo hi alphabet => (lexicalValue v).any fun t =>
      lo ≤ t.length && t.length ≤ hi && t.toList.all (alphabet.toList.contains ·)
  | .decimal scale leading trailing => (lexicalValue v).any (decimalValid · scale leading trailing)
  | .quantityRange unit lo hi =>
    match v with | .qty n u => u == unit && lo ≤ n && n ≤ hi | _ => false
  | .formulationUnit e pairs =>
    match validationCapture s slot e, v with
    | some (.code formulation), .qty _ unit => pairs.contains (formulation, unit)
    | _, _ => false
  | .weightBand lo hi =>
    let weight := if s.captured.any (fun x => x.element == "weight" && x.slot == 0) then
      match validationCapture s 0 "weight" with
      | some (.qty w .kg) => some w
      | _ => none
    else match facts.weightToday? with | some (w, .kg) => some w | _ => none
    weight.any (fun w => 0 < w && lo ≤ w && w ≤ hi)
  | .gtin14 => (lexicalValue v).any gtinValid
  | .udiGs1 => (lexicalValue v).any udiValid
  | .supplyDaysCeil quantity dose frequency =>
    match validationCapture s slot quantity, validationCapture s slot dose,
        validationCapture s slot frequency, v with
    | some (.qty q u), some (.qty d u'), some (.code f), .qty days .none =>
      match freqPerDay f with
      | some n => u == u' && 0 < q && 0 < d &&
          days == ((q + d * n - 1) / (d * n)) * 10
      | none => false
    | _, _, _, _ => false
  | .doseByWeight weight factor cap unit =>
    match validationCapture s 0 weight, v with
    | some (.qty w .kg), .qty dose u =>
      u == unit && 0 < w && 0 < factor && 0 < cap && dose == min cap (w * factor / 10)
    | _, _ => false
  | .and l r => validationHolds facts s slot v l && validationHolds facts s slot v r

/-- Optional constraints preserve the original element contract. -/
def elementValueValid (facts : Facts) (s : State) (el : ElementSpec) (slot : Nat) (v : Value) : Bool :=
  el.validation?.all (validationHolds facts s slot v)

def validationsOk (sp : Spec) (facts : Facts) (s : State) : Bool :=
  sp.elements.all fun el => s.captured.all fun x =>
    x.element != el.id || elementValueValid facts s el x.slot x.value

/-- Required defaults are a program contract as well as a prefill check. -/
def defaultsOk (sp : Spec) (prog : Program) : Bool :=
  sp.elements.all fun el => el.defaultValue?.all fun expected =>
    let fields := (prog.screens.flatMap (·.components)).filter fun c =>
      match c.kind with | .field e _ _ => e == el.id | _ => false
    !fields.isEmpty && fields.all (fun c =>
      match c.kind with | .field _ _ pf => pf == .default expected | _ => false)

def monthDays (year month : Nat) : Nat :=
  if month == 2 then (if leapYear year then 29 else 28)
  else if [4, 6, 9, 11].contains month then 30 else 31

/-- Gregorian UTC conversion, with 1970-01-01 as epoch day zero. -/
def stampMinute (t : ClockStamp) : Option Int :=
  if !validDate t.year t.month t.day || 1440 ≤ t.minuteOfDay || t.zone.isEmpty ||
      t.utcOffsetMinutes < -840 || 840 < t.utcOffsetMinutes then none else
    let y := t.year - 1
    let days := 365 * y + y / 4 - y / 100 + y / 400 +
      ((List.range (t.month - 1)).foldl (fun acc m => acc + monthDays t.year (m + 1)) 0) + t.day - 1
    some ((Int.ofNat days - 719162) * 1440 + Int.ofNat t.minuteOfDay - t.utcOffsetMinutes)

def stampValid (t : ClockStamp) : Bool := stampMinute t == some t.time

def OrderClock.anchorStamp (o : OrderClock) : ClockAnchor → Option ClockStamp
  | .issued => some o.issued | .started => o.started? | .firstFill => o.firstFill?

/-- Calendar months clamp the anniversary's day to the last day of that month.
The chosen cutoff has one exact UTC instant, preventing DST clock reversal. -/
def expiryCutoff (o : OrderClock) (a : ClockAnchor) (stamp : ClockStamp) : ExpiryDuration → Option Int
  | .minutes duration => some (stamp.time + Int.ofNat duration)
  | .calendarMonths months => do
    let [cutoff] := o.monthCutoffs.filter (fun c => c.anchor == a && c.months == months) | none
    let total := stamp.year * 12 + (stamp.month - 1) + months
    let y := total / 12
    let m := total % 12 + 1
    let t := cutoff.stamp
    if stampValid t && t.zone == stamp.zone && t.year == y && t.month == m &&
        t.day == min stamp.day (monthDays y m) && t.minuteOfDay == stamp.minuteOfDay
    then some t.time else none

def renewalValid (o : OrderClock) (version : Nat) (now : Int) (p : RenewalPolicy) : Bool :=
  o.renewals.any fun r => r.event == p.event && !r.actor.isEmpty && r.version == version &&
    o.issued.time ≤ r.time && r.time ≤ now && now < r.time + Int.ofNat p.validForMinutes

/-- Evaluate a durable clock without consulting the episode/slot. Stop/release
routes should be separate commits; this guards actions on the expired instance. -/
def expiryStatus (facts : Facts) (s : State) (rq : ExpiryReq) : ObligationStatus :=
  if rq.when?.any (fun p => !clinicalApplies facts s p) then .met else
  match epochNow facts s with
  | none => .missing
  | some now =>
    match (facts.artifactBindings?.getD []).filter (·.key == rq.orderKey) with
    | [binding] =>
      match (facts.orderClocks?.getD []).filter (·.id == binding.artifact) with
      | [o] =>
        match o.anchorStamp rq.anchor with
        | none => .missing
        | some anchor =>
          if o.patient != facts.patientId || !stampValid o.issued || !stampValid anchor ||
              now < anchor.time || anchor.time < o.issued.time then .invalid else
          match expiryCutoff o rq.anchor anchor rq.duration with
          | none => .missing
          | some cutoff =>
            if !rq.maxOriginalMinutes?.all (fun n => now < o.issued.time + Int.ofNat n) then .overdue
            else if !rq.reassessment?.all (renewalValid o binding.version now) then .missing
            else if now < cutoff || rq.renewal?.any (renewalValid o binding.version now) then .met
            else .overdue
      | _ => .missing
    | _ => .missing

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

/-- Unique, patient-bound, current-version payload; missing data fails closed. -/
def infoPayload (facts : Facts) (i : InfoId) : Option InfoPayload := do
  let [p] := (facts.infoPayloads?.getD []).filter (·.info == i) | none
  let [b] := (facts.artifactBindings?.getD []).filter (·.key == p.artifactKey) | none
  if p.patient == facts.patientId && !p.artifact.isEmpty && p.artifact == b.artifact &&
      p.version == b.version then some p else none

def payloadField (fields : List (String × String)) (id : String) : Option String :=
  match fields.filter (·.1 == id) with
  | [(_, value)] => if value.trimAscii.toString.isEmpty then none else some value
  | _ => none

def fieldRequired (availability : List (String × Bool)) (r : PayloadFieldReq) : Bool :=
  !r.ifAvailable || (match availability.filter (·.1 == r.field) with
    | [(_, false)] => false | _ => true)

/-- Validate external artifact output with the same AST used at entry/prefill. -/
def payloadFieldMet (facts : Facts) (s : State) (slot : Nat)
    (fields : List (String × String)) (availability : List (String × Bool))
    (r : PayloadFieldReq) : Bool :=
  !fieldRequired availability r || (payloadField fields r.field).any (fun raw =>
    (parseValue (r.kind?.getD .text) raw).any (fun v =>
      r.validation?.all (validationHolds facts s slot v)))

/-- Every required field/identifier and every contracted row field is present
and valid. Grouping derives from row values, never a free-form HTML promise. -/
def payloadComplete (p : InfoPayload) (contract : PayloadContract)
    (facts : Facts := default) (s : State := default) : Bool :=
  contract.fields.all (payloadFieldMet facts s 0 p.fields p.availability) &&
    contract.identifiers.all (fun cat => p.identifiers.any (fun i => i.category == cat &&
      !i.system.trimAscii.toString.isEmpty && !i.value.trimAscii.toString.isEmpty)) &&
    (p.rows.map (·.id)).eraseDups.length == p.rows.length &&
    p.rows.all (fun row => !row.id.trimAscii.toString.isEmpty &&
      contract.rowFields.all (fun f => (payloadField row.fields f).isSome) &&
      (contract.rowConstraints?.getD []).all
        (payloadFieldMet facts s row.slot row.fields (row.availability?.getD [])) &&
      contract.groupBy?.all (fun f => (payloadField row.fields f).isSome))

/-- Absent phase context conservatively activates phase requirements. -/
def displayScopeActive (facts : Facts) (commit : Option CommitId) : DisplayScope → Bool
  | .commit c => commit == some c
  | .phase workflow name => facts.phase?.all (fun p => p.workflow == workflow && p.phase == name)

def displayActive (facts : Facts) (s : State) (commit : Option CommitId) (r : DisplayReq) : Bool :=
  displayScopeActive facts commit r.scope && r.when?.all (clinicalApplies facts s)

/- Review/display use exactly the same component kinds and layout visibility. -/
/-- The component kind displays this info. -/
def showsInfo (i : InfoId) : Kind → Bool
  | .panel j | .table j | .trend j | .priorAuth j => j == i
  | .banner => i == bannerInfo
  | _ => false

def displayShown (sp : Spec) (prog : Program) (facts : Facts) (s : State) (r : DisplayReq) : Bool :=
  let comps := prog.compsOf s.screen
  comps.any fun c => showsInfo r.info c.kind && layoutShown sp facts s comps c &&
    (!r.pinned || (c.parent?.isNone && c.visibility == .always))

def displayReqMet (sp : Spec) (prog : Program) (facts : Facts) (s : State) (r : DisplayReq) : Bool :=
  displayShown sp prog facts s r &&
    match sp.info? r.info, infoPayload facts r.info with
    | some inf, some payload =>
      match inf.payload? with
      | some contract => payloadComplete payload contract facts s &&
        (r.selectionElement?.isNone || (payload.rows.map (·.slot)).eraseDups.length == payload.rows.length)
      | none => false
    | _, _ => false

/-- Labels are exact semantic action contracts, checked on every shown button. -/
def actionLabelOk (sp : Spec) (prog : Program) (facts : Facts) (s : State) (c : CommitId) : Bool :=
  match (sp.commit? c).bind (·.actionLabel?) with
  | none => true
  | some expected =>
    let comps := prog.compsOf s.screen
    let buttons := comps.filter (fun b => b.kind == .button (.commit c) && layoutShown sp facts s comps b)
    !expected.isEmpty && !buttons.isEmpty && buttons.all (·.label == expected)

def displaysOk (sp : Spec) (prog : Program) (facts : Facts) (s : State) (c : CommitId) : Bool :=
  (sp.displays?.getD []).all (fun r => !displayActive facts s (some c) r || displayReqMet sp prog facts s r) &&
    actionLabelOk sp prog facts s c

/-- Grouped rows with explicit confirmed selection, for the owning renderer. -/
def payloadView (sp : Spec) (facts : Facts) (s : State) (i : InfoId) : Option PayloadView := do
  let payload ← infoPayload facts i
  let contract ← (sp.info? i).bind (·.payload?)
  let groupKey := fun row : PayloadRow => contract.groupBy?.bind (payloadField row.fields) |>.getD ""
  let selection := (sp.displays?.getD []).filter (fun r => r.info == i &&
    (displayActive facts s none r || match r.scope with
      | .commit c => displayActive facts s (some c) r
      | _ => false))
  let selected := fun row : PayloadRow => selection.any fun r => r.selectionElement?.any fun e =>
    validationCapture s row.slot e == some (.flag true)
  let keys := if contract.groupBy?.isNone then [""] else (payload.rows.map groupKey).eraseDups
  pure { source := payload, groups := keys.map fun key =>
    { key, rows := (payload.rows.filter (fun r => groupKey r == key)).map (fun row => { row, selected := selected row }) } }

def infoPinned (sp : Spec) (facts : Facts) (s : State) (i : InfoId) : Bool :=
  (sp.displays?.getD []).any fun r => r.info == i && r.pinned &&
    (displayActive facts s none r || match r.scope with
      | .commit c => displayActive facts s (some c) r
      | _ => false)

/-- Additional commit contracts. Kept separate from entries/review receipts. -/
def extraGuard (sp : Spec) (prog : Program) (facts : Facts) (s : State) (c : CommitId) : Bool :=
  match sp.commit? c with
  | none => false
  | some cs => (cs.temporal?.getD []).all (fun rq => temporalStatus facts s rq == .met) &&
      validationsOk sp facts s && defaultsOk sp prog &&
      (cs.expiry?.getD []).all (fun rq => expiryStatus facts s rq == .met) &&
      displaysOk sp prog facts s c

/-- All event obligations, including ones on screens without a commit button. -/
def obligationViews (sp : Spec) (facts : Facts) (s : State) : List ObligationView :=
  sp.commits.flatMap fun cs =>
    ((cs.temporal?.getD []).map fun rq =>
      { commit := cs.id, requirement := rq.id, status := temporalStatus facts s rq }) ++
    ((cs.expiry?.getD []).map fun rq =>
      { commit := cs.id, requirement := rq.id, status := expiryStatus facts s rq })

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
