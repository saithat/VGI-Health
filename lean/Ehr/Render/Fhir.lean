import Lean.Data.Json
import Ehr.Render.Json
import Ehr.Formulary

/-!
# FHIR bundle → facts and display

`parseBundle ctx bundle` reads a FHIR R4 Bundle (Synthea output, or a Medplum
search result) and returns
- `Facts`: the few facts the spec and the interpreter need, and
- `Display`: the patient's records as table rows for the page.

Every reader here is total: a missing field reads as `""`, `[]`, or `none`.
A row is never dropped because a field is missing. `parseBundle` fails only
when the input is not a Bundle or has no Patient.

Reading rules (the trusted surface of T5 and T11):
- the resources of a bundle are `entry[].resource`, in order (`bundleResources`);
- an AllergyIntolerance is **active** unless its clinical status is
  `inactive` or `resolved`, or it was entered in error (`allergyActive`); a
  missing status counts as active, the safe reading;
- a MedicationRequest is **active** when its status is `active`;
- a body-weight Observation has LOINC code `29463-7`, is not entered in error
  or cancelled, and is **dated today** when its `effectiveDateTime` starts
  with `ctx.today`; its unit is read from the UCUM code (`kg`, `[lb_av]`, `g`);
- the allergy (and meds) data version is a 52-bit digest of the sorted
  `id@versionId` keys of all AllergyIntolerance (MedicationRequest) resources.
  It changes whenever a resource is added, removed, or updated (up to digest
  collisions). See `docs/design/render.md` for why this is not a sum.

Reference ranges and care-gap rules here are demo data, not clinical advice.
-/

namespace Ehr.Render.Fhir

open Lean

/-! ## Total JSON readers -/

/-- The value of key `k` (`null` if missing or not an object). -/
def field (j : Json) (k : String) : Json := j.getObjValD k

/-- The string at key `k` (`""` if missing or not a string). -/
def str (j : Json) (k : String) : String :=
  match j.getObjValD k with
  | .str s => s
  | _ => ""

/-- The array at key `k` (`[]` if missing or not an array). -/
def arr (j : Json) (k : String) : List Json :=
  match j.getObjValD k with
  | .arr a => a.toList
  | _ => []

/-- The codings of a CodeableConcept. -/
def codings (cc : Json) : List Json := arr cc "coding"

/-- The first coding's code (`""` if none). -/
def firstCode (cc : Json) : String :=
  match codings cc with
  | c :: _ => str c "code"
  | [] => ""

/-- The CodeableConcept has a coding with this code. -/
def hasCode (cc : Json) (code : String) : Bool :=
  (codings cc).any (fun c => str c "code" == code)

/-- Display text of a CodeableConcept: its `text`, else the first coding's
display, else its code. -/
def ccText (cc : Json) : String :=
  let t := str cc "text"
  if t != "" then t
  else
    match codings cc with
    | c :: _ => let d := str c "display"; if d != "" then d else str c "code"
    | [] => ""

/-- The first element of an array field (`null` if empty). -/
def first (j : Json) (k : String) : Json :=
  (arr j k).headD .null

/-- Construct a string by pushes. On wasm32 Lean 4.35's runtime string-data
reader produces a boxed UInt32 zero as the list terminator, while its native
String.ofList primitive expects a scalar list terminator. Structural folds
inspect the constructor tag correctly; pushing avoids that runtime mismatch. -/
def stringOfChars (cs : List Char) : String := cs.foldl String.push ""

/-- A substring of `s`: `len` characters from `start`. -/
def sub (s : String) (start len : Nat) : String :=
  stringOfChars ((s.toList.drop start).take len)

/-- The date part (`YYYY-MM-DD`) of a FHIR dateTime. -/
def dayOf (t : String) : String := sub t 0 10

/-- Year, month, day of a FHIR date or dateTime. -/
def ymd (t : String) : Option (Nat × Nat × Nat) := do
  let y ← (sub t 0 4).toNat?
  let m ← (sub t 5 2).toNat?
  let d ← (sub t 8 2).toNat?
  pure (y, m, d)

/-- Whole years from `dob` to `today` (0 if a date is unreadable). -/
def ageYears (dob today : String) : Nat :=
  match ymd dob, ymd today with
  | some (y, m, d), some (ty, tm, td) =>
    if tm < m || (tm == m && td < d) then ty - y - 1 else ty - y
  | _, _ => 0

/-- Whole months from `dob` to `when` (0 if a date is unreadable). -/
def ageMonths (dob when_ : String) : Nat :=
  match ymd dob, ymd when_ with
  | some (y, m, d), some (ty, tm, td) =>
    let months := (ty * 12 + tm) - (y * 12 + m)
    if td < d then months - 1 else months
  | _, _ => 0

/-- A JSON number scaled by `10^k` and rounded down (`none` if negative).
`scaled 72.5 1 = 725`. -/
def scaled (n : JsonNumber) (k : Nat) : Option Nat :=
  if n.mantissa < 0 then none
  else some (n.mantissa.toNat * 10 ^ k / 10 ^ n.exponent)

/-- The `value` of a Quantity, scaled by `10^k`. -/
def qtyScaled (q : Json) (k : Nat) : Option Nat :=
  match field q "value" with
  | .num n => scaled n k
  | _ => none

/-- The `value` of a Quantity as text, as recorded. -/
def qtyText (q : Json) : String :=
  match field q "value" with
  | .num n => toString n
  | _ => ""

/-- The unit of a Quantity as text (the `unit`, else the UCUM `code`). -/
def qtyUnitText (q : Json) : String :=
  let u := str q "unit"
  if u != "" then u else str q "code"

/-- The unit of a body weight, from the UCUM code (else the unit text):
`kg`, `[lb_av]` or `lb`, `g`. Anything else is unknown (`none`). -/
def unitOf (q : Json) : Option UnitKind :=
  let c := str q "code"
  let key := if c != "" then c else str q "unit"
  if key == "kg" then some .kg
  else if key == "[lb_av]" || key == "lb" || key == "lbs" then some .lb
  else if key == "g" then some .g
  else none

/-! ## Bundle -/

/-- A resource's type. -/
def resourceType (r : Json) : String := str r "resourceType"

/-- Normalize a fixture resource's identity. Medplum resources keep their
server id; Synthea transaction entries without an id use the entire fullUrl. -/
def entryResource (e : Json) : Json :=
  let r := field e "resource"
  match r with
  | .obj _ =>
    if str r "id" == "" then r.setObjVal! "id" (.str (str e "fullUrl")) else r
  | _ => r

/-- **The resources of a bundle**: normalized `entry[i].resource`, in order. -/
def bundleResources (b : Json) : List Json :=
  (arr b "entry").map entryResource

/-- Sort newest first by a date key (stable: ties keep bundle order). -/
def newestFirst {α : Type} (key : α → String) (l : List α) : List α :=
  l.mergeSort (fun a b => decide (key b ≤ key a))

/-- Sort oldest first by a date key (stable). -/
def oldestFirst {α : Type} (key : α → String) (l : List α) : List α :=
  l.mergeSort (fun a b => decide (key a ≤ key b))

/-- The last element with the greatest key (`none` for an empty list). -/
def latestBy {α : Type} (key : α → String) : List α → Option α
  | [] => none
  | x :: xs =>
    match latestBy key xs with
    | none => some x
    | some y => if key x ≤ key y then some y else some x

/-! ## Patient -/

/-- The patient's official name (else the first). -/
def officialName (p : Json) : Json :=
  let names := arr p "name"
  match names.find? (fun n => str n "use" == "official") with
  | some n => n
  | none => names.headD .null

/-- Given names of a HumanName. -/
def givenNames (n : Json) : List String :=
  (arr n "given").filterMap fun g => match g with | .str s => some s | _ => none

/-- `"Family, Given Middle"`. -/
def displayName (p : Json) : String :=
  let n := officialName p
  let fam := str n "family"
  let given := " ".intercalate (givenNames n)
  if fam == "" then given else if given == "" then fam else fam ++ ", " ++ given

/-- First letter of the first given name and of the family name, upper case. -/
def initials (p : Json) : String :=
  let n := officialName p
  let g := (givenNames n).headD ""
  let f := str n "family"
  stringOfChars ((g.toList.take 1 ++ f.toList.take 1).map Char.toUpper)

/-- `"F"`, `"M"`, or `"U"`. -/
def sexOf (p : Json) : String :=
  match str p "gender" with
  | "female" => "F"
  | "male" => "M"
  | _ => "U"

/-- Stable identity shared by fixture and Medplum Patient records. This is
also the wristband payload: the Synthea identifier search token when present,
else the normalized source id. Medplum assigns unrelated server ids. -/
def patientIdOf (p : Json) : String :=
  match (arr p "identifier").find? (fun i =>
      str i "system" == "https://github.com/synthetichealth/synthea" && str i "value" != "") with
  | some i => "https://github.com/synthetichealth/synthea|" ++ str i "value"
  | none => str p "id"

/-- A medical record number is a business identifier, not the resource id. -/
def mrnOf (p : Json) : String :=
  match (arr p "identifier").find? (fun i => hasCode (field i "type") "MR") with
  | some i => str i "value"
  | none => ""

/-! ## Allergies (T11) -/

/-- An AllergyIntolerance resource. -/
def isAllergy (r : Json) : Bool := resourceType r == "AllergyIntolerance"

/-- Clinical status code (`""` if missing). -/
def clinicalStatus (r : Json) : String := firstCode (field r "clinicalStatus")

/-- Verification status code (`""` if missing). -/
def verificationStatus (r : Json) : String := firstCode (field r "verificationStatus")

/-- **Active allergy**: not `inactive`, not `resolved`, not entered in error.
A missing status counts as active. -/
def allergyActive (r : Json) : Bool :=
  clinicalStatus r != "inactive" && clinicalStatus r != "resolved" &&
    verificationStatus r != "entered-in-error"

/-- Reaction manifestations, comma-separated. -/
def reactionText (r : Json) : String :=
  ", ".intercalate ((arr r "reaction").flatMap fun rx => (arr rx "manifestation").map ccText)

/-- The highest reaction severity (`severe` > `moderate` > `mild`). -/
def severityText (r : Json) : String :=
  let sev := (arr r "reaction").map (str · "severity")
  if sev.contains "severe" then "severe"
  else if sev.contains "moderate" then "moderate"
  else if sev.contains "mild" then "mild" else ""

/-- Categories, comma-separated. -/
def categoryText (r : Json) : String :=
  ", ".intercalate ((arr r "category").filterMap fun c => match c with | .str s => some s | _ => none)

/-- The display row of an AllergyIntolerance. -/
def allergyRow (r : Json) : AllergyRow where
  id := str r "id"
  substance := ccText (field r "code")
  code := firstCode (field r "code")
  category := categoryText r
  criticality := str r "criticality"
  reaction := reactionText r
  severity := severityText r
  status := clinicalStatus r
  verification := verificationStatus r
  recorded := str r "recordedDate"
  versionId := str (field r "meta") "versionId"

/-- The allergy rows: every AllergyIntolerance not entered in error, newest
first. -/
def allergyRows (rs : List Json) : List AllergyRow :=
  newestFirst (·.recorded)
    ((rs.filter fun r => isAllergy r && verificationStatus r != "entered-in-error").map allergyRow)

/-- Allergen keywords and the drug class they rule out. -/
def allergenClasses : List (String × String) := [
  ("penicillin", "penicillin"), ("amoxicillin", "penicillin"), ("ampicillin", "penicillin"),
  ("cephalosporin", "cephalosporin"), ("cefazolin", "cephalosporin"),
  ("ceftriaxone", "cephalosporin"), ("cephalexin", "cephalosporin"),
  ("sulfa", "sulfonamide"), ("sulfamethoxazole", "sulfonamide"),
  ("aspirin", "nsaid"), ("ibuprofen", "nsaid"), ("naproxen", "nsaid"), ("nsaid", "nsaid"),
  ("codeine", "opioid"), ("morphine", "opioid"), ("opioid", "opioid"),
  ("macrolide", "macrolide"), ("erythromycin", "macrolide"), ("azithromycin", "macrolide"),
  ("heparin", "unfractionatedHeparin"), ("latex", "latex")]

/-- `s` contains `key`. -/
def containsStr (s key : String) : Bool :=
  (s.splitOn key).length > 1

/-- Drug classes an allergy rules out: from the keyword table, and the first
class of a formulary drug named in the substance or matching its RxNorm code. -/
def allergyClassesOf (r : Json) : List String :=
  let s := (ccText (field r "code")).toLower
  let code := firstCode (field r "code")
  let fromTable := allergenClasses.filterMap fun (k, c) => if containsStr s k then some c else none
  let fromFormulary := formulary.filterMap fun d =>
    if containsStr s d.name || d.rxnorm.contains code then d.classes.head? else none
  fromTable ++ fromFormulary

/-! ## Medications (T11) -/

/-- A MedicationRequest resource. -/
def isMedRequest (r : Json) : Bool := resourceType r == "MedicationRequest"

/-- **Active medication request**: status `active`. -/
def medActive (r : Json) : Bool := str r "status" == "active"

/-- A current medication request: `active` or `on-hold`. -/
def medCurrent (r : Json) : Bool := str r "status" == "active" || str r "status" == "on-hold"

/-- The medication's name: its CodeableConcept, else the reference display. -/
def medName (r : Json) : String :=
  let cc := field r "medicationCodeableConcept"
  if cc != .null then ccText cc else str (field r "medicationReference") "display"

/-- The first RxNorm-style code of the medication. -/
def medCode (r : Json) : String := firstCode (field r "medicationCodeableConcept")

/-- The formulary drug of a medication: the first whose name occurs in the
medication's name or whose RxNorm list has the code (`""` if none). -/
def medDrug (r : Json) : String :=
  let n := (medName r).toLower
  let c := medCode r
  match formulary.find? (fun d => containsStr n d.name || d.rxnorm.contains c) with
  | some d => d.name
  | none => ""

/-- Dosage instructions as text. -/
def sigText (r : Json) : String :=
  let di := first r "dosageInstruction"
  let t := str di "text"
  if t != "" then t
  else
    let dq := field (first di "doseAndRate") "doseQuantity"
    let dose := if qtyText dq != "" then qtyText dq ++ (if qtyUnitText dq != "" then " " ++ qtyUnitText dq else "") else ""
    let rep := field (field di "timing") "repeat"
    let freq := match field rep "frequency", field rep "period" with
      | .num f, .num p => s!"{f}x per {p} {str rep "periodUnit"}"
      | _, _ => ""
    let prn := match field di "asNeededBoolean" with | .bool true => "as needed" | _ => ""
    ", ".intercalate ([dose, freq, prn].filter (· != ""))

/-- The display row of a MedicationRequest. -/
def medRow (r : Json) : MedRow where
  id := str r "id"
  name := medName r
  rxnorm := medCode r
  drug := medDrug r
  sig := sigText r
  status := str r "status"
  authored := str r "authoredOn"
  prescriber := str (field r "requester") "display"
  versionId := str (field r "meta") "versionId"

/-- The medication rows: every current MedicationRequest, newest first. -/
def medRows (rs : List Json) : List MedRow :=
  newestFirst (·.authored) ((rs.filter fun r => isMedRequest r && medCurrent r).map medRow)

/-! ## Data versions (T5) -/

/-- The version key of a resource: `id@versionId`. -/
def versionKey (r : Json) : String := str r "id" ++ "@" ++ str (field r "meta") "versionId"

/-- FNV-1a over the characters of the keys (each key ends with a newline),
reduced to 52 bits so it is a safe integer in JavaScript. -/
def versionDigest (keys : List String) : Nat :=
  let step (h : Nat) (c : Char) : Nat := ((h ^^^ c.toNat) * 1099511628211) % 2 ^ 64
  let h := keys.foldl (fun h k => (k.toList ++ ['\n']).foldl step h) 14695981039346656037
  h % 2 ^ 52

/-- **The data version of a list of resources**: the digest of their sorted
version keys. It does not depend on bundle order. -/
def listVersion (rs : List Json) : Nat :=
  versionDigest ((rs.map versionKey).mergeSort (fun a b => decide (a ≤ b)))

/-! ## Observations -/

/-- An Observation resource that is not entered in error or cancelled. -/
def isObservation (r : Json) : Bool :=
  resourceType r == "Observation" &&
    str r "status" != "entered-in-error" && str r "status" != "cancelled"

/-- The Observation's category codes. -/
def categoryCodes (r : Json) : List String :=
  (arr r "category").flatMap fun cc => (codings cc).map (str · "code")

/-- When an observation was made: `effectiveDateTime`, else the start of
`effectivePeriod`, else `issued`. -/
def obsWhen (r : Json) : String :=
  let t := str r "effectiveDateTime"
  if t != "" then t
  else
    let p := str (field r "effectivePeriod") "start"
    if p != "" then p else str r "issued"

/-- LOINC code for body weight. -/
def bodyWeightCode : String := "29463-7"
/-- LOINC code for body height. -/
def bodyHeightCode : String := "8302-2"

/-- **A body-weight Observation** (LOINC `29463-7`, not in error). -/
def isBodyWeight (r : Json) : Bool :=
  isObservation r && hasCode (field r "code") bodyWeightCode

/-- A weight reading: the value in tenths and the unit (both must be known). -/
def weightReading (r : Json) : Option (Nat × UnitKind) :=
  let q := field r "valueQuantity"
  match qtyScaled q 1, unitOf q with
  | some w, some u => some (w, u)
  | _, _ => none

/-- **Weight recorded today**: the latest body-weight Observation dated
`today` that has a value and a known unit, with the unit as recorded. -/
def weightTodayOf (today : String) (rs : List Json) : Option (Nat × UnitKind) :=
  let todays := rs.filter fun r => isBodyWeight r && dayOf (obsWhen r) == today
  let readings := todays.filterMap fun r => (weightReading r).map (obsWhen r, ·)
  (latestBy (·.1) readings).map (·.2)

/-- The banner shows the latest recorded body weight no later than the chart
date, with its original unit and date. It is not confirmed dosing evidence. -/
def bannerWeightOf (today : String) (rs : List Json) : Option (Nat × UnitKind × String) :=
  let readings := rs.filterMap fun r =>
    if isBodyWeight r && dayOf (obsWhen r) <= today then
      (weightReading r).map fun (weight, unit) => (obsWhen r, weight, unit)
    else none
  (latestBy (·.1) readings).map fun (date, weight, unit) => (weight, unit, date)

/-- A vital-sign Observation. -/
def isVital (r : Json) : Bool := isObservation r && (categoryCodes r).contains "vital-signs"

/-- A laboratory Observation. -/
def isLab (r : Json) : Bool := isObservation r && (categoryCodes r).contains "laboratory"

/-- The value of an observation as text, its unit, and its value × 100.
Blood pressure (components) reads `"128/82"`. -/
def obsValue (r : Json) : String × String × Option Nat :=
  let q := field r "valueQuantity"
  if q != .null then (qtyText q, qtyUnitText q, qtyScaled q 2)
  else
    let comps := arr r "component"
    if !comps.isEmpty then
      let qs := comps.map (field · "valueQuantity")
      ("/".intercalate (qs.map qtyText), qtyUnitText (qs.headD .null), none)
    else
      let cc := field r "valueCodeableConcept"
      if cc != .null then (ccText cc, "", none) else (str r "valueString", "", none)

/-- The display row of a vital sign. -/
def vitalRow (r : Json) : VitalRow :=
  let (v, u, h) := obsValue r
  { id := str r "id", code := firstCode (field r "code"), name := ccText (field r "code")
    value := v, unit := u, date := obsWhen r, hundredths? := h }

/-! ## Labs -/

/-- Demo reference ranges (×100) by LOINC code: low, high, text. Not clinical advice. -/
def refRanges : List (String × Nat × Nat) := [
  ("2339-0", 7000, 9900),     -- glucose mg/dL
  ("4548-4", 400, 560),       -- hemoglobin A1c %
  ("6298-4", 350, 510),       -- potassium mmol/L
  ("2947-0", 13600, 14500),   -- sodium mmol/L
  ("2069-3", 9800, 10700),    -- chloride mmol/L
  ("2028-9", 2200, 2900),     -- CO2 mmol/L
  ("38483-4", 60, 130),       -- creatinine mg/dL
  ("6299-2", 700, 2000),      -- urea nitrogen mg/dL
  ("49765-1", 850, 1020),     -- calcium mg/dL
  ("2093-3", 0, 19900),       -- total cholesterol mg/dL
  ("18262-6", 0, 9900),       -- LDL mg/dL
  ("2085-9", 4000, 100000),   -- HDL mg/dL
  ("2571-8", 0, 14900),       -- triglycerides mg/dL
  ("718-7", 1200, 1750),      -- hemoglobin g/dL
  ("6690-2", 450, 1100),      -- WBC 10*3/uL
  ("777-3", 15000, 45000),    -- platelets 10*3/uL
  ("33914-3", 6000, 100000)]  -- eGFR mL/min/1.73m2

/-- Format a value × 100 (`425` ↦ `"4.25"`, `420` ↦ `"4.2"`, `400` ↦ `"4"`). -/
def fmtHundredths (n : Nat) : String :=
  let w := n / 100
  let f := n % 100
  if f == 0 then toString w
  else if f % 10 == 0 then s!"{w}.{f / 10}"
  else if f < 10 then s!"{w}.0{f}" else s!"{w}.{f}"

/-- Interpretation codes that mean abnormal. -/
def abnormalCodes : List String := ["H", "L", "HH", "LL", "A", "AA", "HU", "LU", "<", ">"]

/-- One lab result: code, name, value text, unit, time, value × 100,
reference range (×100, if known), flagged abnormal by the source. -/
structure LabPoint where
  code : String
  name : String
  value : String
  unit : String
  date : String
  hundredths? : Option Nat
  range? : Option (Nat × Nat)
  flagged : Bool

/-- Read one lab Observation. -/
def labPoint (r : Json) : LabPoint :=
  let (v, u, h) := obsValue r
  let code := firstCode (field r "code")
  let rr := first r "referenceRange"
  let fromObs := match qtyScaled (field rr "low") 2, qtyScaled (field rr "high") 2 with
    | some lo, some hi => some (lo, hi)
    | _, _ => none
  let fromTable := (refRanges.find? (·.1 == code)).map (·.2)
  { code, name := ccText (field r "code"), value := v, unit := u, date := obsWhen r
    hundredths? := h, range? := fromObs <|> fromTable
    flagged := (arr r "interpretation").any (fun cc => abnormalCodes.contains (firstCode cc)) }

/-- A lab point is abnormal: flagged by the source, or outside its range. -/
def LabPoint.abnormal (p : LabPoint) : Bool :=
  p.flagged ||
    match p.hundredths?, p.range? with
    | some v, some (lo, hi) => decide (v < lo) || decide (hi < v)
    | _, _ => false

/-- One row per lab test (LOINC code): the latest result, its range, whether
it is abnormal, and the trend (oldest first). Newest test first. -/
def labRows (rs : List Json) : List LabRow :=
  let pts := (rs.filter isLab).map labPoint
  let codes := (pts.map (·.code)).eraseDups
  let rows := codes.filterMap fun c =>
    let mine := oldestFirst (·.date) (pts.filter (·.code == c))
    match mine.getLast? with
    | none => none
    | some last =>
      some { code := c, name := last.name, value := last.value, unit := last.unit
             date := last.date
             refRange := match last.range? with
               | some (lo, hi) => fmtHundredths lo ++ "–" ++ fmtHundredths hi
               | none => ""
             abnormal := last.abnormal
             trend := mine.filterMap fun p => p.hundredths?.map ({ date := p.date, hundredths := · }) }
  newestFirst (·.date) rows

/-! ## Problems, immunizations, encounters, procedures -/

/-- The display row of a Condition. -/
def problemRow (r : Json) : ProblemRow where
  id := str r "id"
  name := ccText (field r "code")
  code := firstCode (field r "code")
  onset := let o := str r "onsetDateTime"; if o != "" then o else str r "recordedDate"
  abatement := str r "abatementDateTime"
  status := clinicalStatus r

/-- The display row of an Immunization. -/
def immRow (r : Json) : ImmRow where
  id := str r "id"
  vaccine := ccText (field r "vaccineCode")
  cvx := firstCode (field r "vaccineCode")
  date := str r "occurrenceDateTime"
  status := str r "status"

/-- The display row of an Encounter. -/
def encRow (r : Json) : EncRow where
  id := str r "id"
  encType := ccText (first r "type")
  encClass := str (field r "class") "code"
  start := str (field r "period") "start"
  stop := str (field r "period") "end"
  reason := ccText (first r "reasonCode")
  provider := str (field (first r "participant") "individual") "display"
  location :=
    let l := str (field (first r "location") "location") "display"
    if l != "" then l else str (field r "serviceProvider") "display"

/-- The display row of a Procedure. -/
def procRow (r : Json) : ProcRow where
  id := str r "id"
  name := ccText (field r "code")
  code := firstCode (field r "code")
  date := let d := str r "performedDateTime"; if d != "" then d else str (field r "performedPeriod") "start"
  status := str r "status"

/-- Resources of one type. -/
def ofType (rt : String) (rs : List Json) : List Json :=
  rs.filter (resourceType · == rt)

/-! ## Notes and reported history (display only) -/

def knownText (s : String) : String := if s == "" then "Unknown" else s

def refText (r : Json) : String :=
  let d := str r "display"
  if d != "" then d else "Not recorded"

def isDocumentReference (r : Json) : Bool := resourceType r == "DocumentReference"

def documentVisible (r : Json) : Bool :=
  str r "status" != "entered-in-error" && str r "docStatus" != "entered-in-error"

/-- Strict RFC 4648 alphabet, including canonical padding bits. -/
def base64Digit (c : Char) : Option Nat :=
  if 'A' ≤ c && c ≤ 'Z' then some (c.toNat - 'A'.toNat)
  else if 'a' ≤ c && c ≤ 'z' then some (26 + c.toNat - 'a'.toNat)
  else if '0' ≤ c && c ≤ '9' then some (52 + c.toNat - '0'.toNat)
  else if c == '+' then some 62 else if c == '/' then some 63 else none

/-- Structural recursion consumes four input characters per step. -/
def base64Bytes : List Char → Option (List UInt8)
  | [] => some []
  | a :: b :: c :: d :: rest => do
      let x ← base64Digit a
      let y ← base64Digit b
      let first := UInt8.ofNat (x * 4 + y / 16)
      if c == '=' then
        if d == '=' && rest.isEmpty && y % 16 == 0 then some [first] else none
      else
        let z ← base64Digit c
        let second := UInt8.ofNat (y % 16 * 16 + z / 4)
        if d == '=' then
          if rest.isEmpty && z % 4 == 0 then some [first, second] else none
        else
          let w ← base64Digit d
          let tail ← base64Bytes rest
          some (first :: second :: UInt8.ofNat (z % 4 * 64 + w) :: tail)
  | _ => none

/-- Pure decoding followed by Lean's strict UTF-8 validation. -/
def decodeBase64Utf8 (s : String) : Option String := do
  let bytes ← base64Bytes (s.toList.filter (fun c => !c.isWhitespace))
  String.fromUTF8? (ByteArray.mk bytes.toArray)

/-- Never fetch attachments or interpret HTML. -/
def noteAttachmentText (a : Json) : String :=
  if ((((str a "contentType").splitOn ";").headD "").trimAscii.toString.toLower) != "text/plain"
  then "Note body unavailable (not inline text/plain)"
  else if str a "data" == "" then "Note body unavailable (no inline data)"
  else (decodeBase64Utf8 (str a "data")).getD "Note body unavailable (invalid base64 or UTF-8)"

def extensionText (r : Json) (suffix : String) : String :=
  match (arr r "extension").find? (fun e => (str e "url").endsWith suffix) with
  | none => ""
  | some e =>
    let d := str e "valueDate"
    if d != "" then d else
      match field e "valueInteger" with
      | .num n => toString n
      | _ => str e "valueString"

def noteRow (r : Json) : NoteRow :=
  let attachments := (arr r "content").map (field · "attachment")
  let date := str r "date"
  let period := str (field (field r "context") "period") "start"
  { id := str r "id"
    date := if date != "" then date else if period != "" then period
      else ((attachments.map (str · "creation")).find? (· != "")).getD ""
    noteType := knownText (ccText (field r "type"))
    author := knownText (", ".intercalate ((arr r "author").map refText))
    encounter := knownText (", ".intercalate ((arr (field r "context") "encounter").map refText))
    title := let title := str r "description"
      if title != "" then title else knownText (str (attachments.headD .null) "title")
    text := if attachments.isEmpty then "Note body unavailable (no attachments)"
      else "\n\n".intercalate (attachments.zipIdx.map fun (a, i) =>
        "Attachment " ++ toString (i + 1) ++
        (if str a "title" == "" then "" else ": " ++ str a "title") ++ "\n" ++ noteAttachmentText a)
    status := knownText (" / ".intercalate ([str r "status", str r "docStatus"].filter (· != "")))
    sourceDate := extensionText r ":original-date"
    shiftDays := extensionText r ":shift-days"
    versionId := str (field r "meta") "versionId" }

def noteRows (rs : List Json) : List NoteRow :=
  newestFirst (·.date) ((rs.filter fun r => isDocumentReference r && documentVisible r).map noteRow)

/-- MedicationStatement is reported history, never a MedicationRequest. -/
def medicationStatementHistoryRow (r : Json) : HistoryRow :=
  { id := str r "id", kind := "Home medications (reported)", item := knownText (medName r)
    detail := "Reported home medication; " ++
      knownText ("; ".intercalate ((arr r "dosage").map (str · "text"))) ++
      "; date: " ++ knownText (str r "effectiveDateTime")
    status := knownText (str r "status")
    source := "MedicationStatement (reported history); " ++ knownText (refText (field r "informationSource"))
    versionId := str (field r "meta") "versionId" }

def familyHistoryRows (r : Json) : List HistoryRow :=
  let conditions := arr r "condition"
  (if conditions.isEmpty then [Json.null] else conditions).map fun c =>
    { id := str r "id", kind := "Family history"
      item := knownText (ccText (field c "code"))
      detail := knownText (ccText (field r "relationship")) ++
        (if ccText (field c "outcome") == "" then "" else "; " ++ ccText (field c "outcome")) ++
        (let notes := (arr r "note" ++ arr c "note").map (str · "text")
         if notes.isEmpty then "" else "; " ++ "; ".intercalate notes)
      status := knownText (str r "status"), source := "FamilyMemberHistory"
      versionId := str (field r "meta") "versionId" }

def socialHistoryRow (r : Json) : HistoryRow :=
  let (v, u, _) := obsValue r
  let value := if v != "" then v else match field r "valueBoolean" with
    | .bool b => toString b
    | _ => match field r "valueInteger" with | .num n => toString n | _ => ""
  { id := str r "id", kind := "Social history", item := knownText (ccText (field r "code"))
    detail := knownText value ++ (if u == "" then "" else " " ++ u) ++ "; date: " ++ knownText (obsWhen r)
    status := knownText (str r "status"), source := "Observation (social-history)"
    versionId := str (field r "meta") "versionId" }

def procedureHistoryRow (r : Json) : HistoryRow :=
  { id := str r "id", kind := "Surgical history", item := knownText (ccText (field r "code"))
    detail := "Date: " ++ knownText (procRow r).date ++
      (let notes := (arr r "note").map (str · "text")
       if notes.isEmpty then "" else "; " ++ "; ".intercalate notes)
    status := knownText (str r "status"), source := "Procedure"
    versionId := str (field r "meta") "versionId" }

def isHistoryResource (r : Json) : Bool :=
  ["MedicationStatement", "FamilyMemberHistory", "Procedure"].contains (resourceType r) ||
    (resourceType r == "Observation" && (categoryCodes r).contains "social-history")

def historyRows (rs : List Json) : List HistoryRow :=
  rs.flatMap fun r =>
    if str r "status" == "entered-in-error" then [] else
    match resourceType r with
    | "MedicationStatement" => [medicationStatementHistoryRow r]
    | "FamilyMemberHistory" => familyHistoryRows r
    | "Procedure" => [procedureHistoryRow r]
    | "Observation" => if (categoryCodes r).contains "social-history" then [socialHistoryRow r] else []
    | _ => []

def notesVersionOf (rs : List Json) : Nat := listVersion (rs.filter isDocumentReference)
def historyVersionOf (rs : List Json) : Nat := listVersion (rs.filter isHistoryResource)

/-! ## Growth -/

/-- Growth points: body weights (kg) and heights (cm), joined by day, oldest
first. -/
def growthPoints (dob : String) (rs : List Json) : List GrowthPoint :=
  let ws := (rs.filter isBodyWeight).filterMap fun r =>
    match weightReading r with
    | some (w, .kg) => some (dayOf (obsWhen r), w)
    | some (w, .lb) => some (dayOf (obsWhen r), w * 4536 / 10000)
    | _ => none
  let hs := (rs.filter fun r => isObservation r && hasCode (field r "code") bodyHeightCode).filterMap
    fun r => (qtyScaled (field r "valueQuantity") 1).map (dayOf (obsWhen r), ·)
  let days := oldestFirst id ((ws.map (·.1) ++ hs.map (·.1)).eraseDups)
  days.map fun d =>
    { date := d, ageMonths := ageMonths dob d
      weightTenths? := (ws.reverse.find? (·.1 == d)).map (·.2)
      heightTenths? := (hs.reverse.find? (·.1 == d)).map (·.2) }

/-! ## Care gaps and abnormal results (demo rules, not clinical advice) -/

/-- Influenza vaccine CVX codes. -/
def fluCvx : List String :=
  ["88", "135", "140", "141", "144", "149", "150", "153", "155", "158", "161", "166",
   "168", "171", "185", "186", "197", "205"]

/-- The date `years` years before `today` (same month and day). -/
def yearsBefore (today : String) (years : Nat) : String :=
  match ymd today with
  | some (y, _, _) => toString (y - years) ++ sub today 4 6
  | none => ""

/-- Care gaps: `influenzaVaccine` (no flu vaccine in the last year),
`colorectalScreening` (age 45–75, no colonoscopy in 10 years),
`hba1cMonitoring` (active diabetes, no HbA1c in the last year). -/
def careGapsOf (today : String) (age : Nat) (rs : List Json) : List String :=
  let since1 := yearsBefore today 1
  let flu := (ofType "Immunization" rs).any fun r =>
    fluCvx.contains (firstCode (field r "vaccineCode")) && since1 ≤ str r "occurrenceDateTime"
  let colo := (ofType "Procedure" rs).any fun r =>
    hasCode (field r "code") "73761001" && yearsBefore today 10 ≤ (procRow r).date
  let diabetic := (ofType "Condition" rs).any fun r =>
    hasCode (field r "code") "44054006" && clinicalStatus r == "active"
  let a1c := (rs.filter isLab).any fun r =>
    hasCode (field r "code") "4548-4" && since1 ≤ obsWhen r
  (if flu then [] else ["influenzaVaccine"]) ++
  (if 45 ≤ age && age ≤ 75 && !colo then ["colorectalScreening"] else []) ++
  (if diabetic && !a1c then ["hba1cMonitoring"] else [])

/-! ## Banner -/

/-- The latest encounter (by start), if any. -/
def latestEncounter (rs : List Json) : Option Json :=
  latestBy (fun r => str (field r "period") "start") (ofType "Encounter" rs)

/-- The payer: Coverage `payor[0].display`, else the latest claim's insurer. -/
def coverageOf (rs : List Json) : String :=
  match (ofType "Coverage" rs).reverse.head? with
  | some c => str (first c "payor") "display"
  | none =>
    match (ofType "ExplanationOfBenefit" rs).reverse.head? with
    | some e => str (field (first e "insurance") "coverage") "display"
    | none => ""

/-- The banner fields. -/
def bannerOf (today : String) (rs : List Json) (p : Json) : BannerInfo :=
  let enc := (latestEncounter rs).getD .null
  let encProvider := str (field (first enc "participant") "individual") "display"
  let gp := str (first p "generalPractitioner") "display"
  { name := displayName p
    mrn := mrnOf p
    dob := str p "birthDate"
    ageYears := ageYears (str p "birthDate") today
    sex := sexOf p
    language := ccText (field (first p "communication") "language")
    pcp := gp
    coverage := coverageOf rs
    encounterClass := str (field enc "class") "code"
    attending := encProvider
    location := (encRow enc).location
    weight? := bannerWeightOf today rs }

/-! ## Structured display projections -/

/-- Resolve a reference against the supplied bundle, without guessing a patient. -/
def referenced? (rs : List Json) (ref : Json) : Option Json :=
  let key := str ref "reference"
  if key == "" then none else rs.find? fun r =>
    str r "id" != "" && (str r "id" == key || key == resourceType r ++ "/" ++ str r "id")

/-- Human-readable reference text. Internal FHIR references are never displayed. -/
def humanRef (rs : List Json) (ref : Json) : String :=
  let display := str ref "display"
  if display != "" then display else
    match referenced? rs ref with
    | none => ""
    | some r => if resourceType r == "Patient" || resourceType r == "Practitioner"
      then displayName r else str r "name"

/-- Age and sex are read only from the referenced patient. -/
def refAgeSex (today : String) (rs : List Json) (ref : Json) : String :=
  match referenced? rs ref with
  | some p => if resourceType p == "Patient" && str p "birthDate" != ""
      then s!"{ageYears (str p "birthDate") today} / {sexOf p}" else ""
  | none => ""

/-- Appointment participants supply patient, clinician and location displays. -/
def appointmentActor (rs : List Json) (r : Json) (kind : String) : Json :=
  ((arr r "participant").map (field · "actor")).find? (fun actor =>
    (str actor "reference").startsWith (kind ++ "/") ||
      ((referenced? rs actor).map resourceType).getD "" == kind) |>.getD .null

/-- A day-list row from an Appointment. A booked appointment is not a signed visit. -/
def scheduleRow (today : String) (rs : List Json) (r : Json) : ScheduleRow :=
  let patient := appointmentActor rs r "Patient"
  { time := str r "start", patient := humanRef rs patient
    ageSex := refAgeSex today rs patient
    visitType := ccText (field r "appointmentType")
    status := str r "status", complaint := ccText (first r "reasonCode")
    provider := humanRef rs (appointmentActor rs r "Practitioner")
    location := humanRef rs (appointmentActor rs r "Location") }

/-- All supplied appointments in chronological order, without a hidden row limit. -/
def scheduleRows (today : String) (rs : List Json) : List ScheduleRow :=
  oldestFirst (·.time) ((ofType "Appointment" rs |>.filter (fun r => str r "status" != "entered-in-error")).map (scheduleRow today rs))

/-- An Encounter participant assigned to the supplied participation code. -/
def encounterParticipant (rs : List Json) (r : Json) (code : String) : String :=
  let p := (arr r "participant").find? fun p =>
    (arr p "type").any (hasCode · code)
  (p.map fun p => humanRef rs (field p "individual")).getD ""

/-- A board row from Encounter. Priority text is not relabeled as an ESI score. -/
def boardRow (today : String) (rs : List Json) (r : Json) : BoardRow :=
  let subject := field r "subject"
  { room := humanRef rs (field (first r "location") "location")
    patient := humanRef rs subject, ageSex := refAgeSex today rs subject
    complaint := ccText (first r "reasonCode"), acuity := ccText (field r "priority")
    arrival := str (field r "period") "start"
    nurse := ""
    provider := encounterParticipant rs r "ATND"
    disposition := ccText (field (field r "hospitalization") "dischargeDisposition")
    status := str r "status" }

/-- All department encounters supplied by the caller. -/
def boardRows (today : String) (rs : List Json) : List BoardRow :=
  oldestFirst (·.arrival) ((ofType "Encounter" rs |>.filter (fun r => str r "status" != "entered-in-error")).map (boardRow today rs))

/-- A quantity with its recorded unit, without conversion. -/
def quantityLabel (q : Json) : String :=
  qtyText q ++ (if qtyUnitText q == "" then "" else " " ++ qtyUnitText q)

/-- Order detail and explicit timing events only. Frequency is never expanded. -/
def marOrderRow (r : Json) : MarOrderRow :=
  let di := first r "dosageInstruction"
  { id := str r "id", medication := medName r
    dose := quantityLabel (field (first di "doseAndRate") "doseQuantity")
    route := ccText (field di "route"), frequency := sigText r
    status := str r "status"
    scheduled := (arr r "dosageInstruction").flatMap fun d =>
      (arr (field d "timing") "event").filterMap fun t =>
        match t with | .str s => some s | _ => none }

/-- Current MedicationRequests, including held orders, as MAR order rows. -/
def marOrderRows (rs : List Json) : List MarOrderRow :=
  (rs.filter fun r => isMedRequest r && medCurrent r).map marOrderRow

/-- Preserve administration status; only completed administrations say Given. -/
def administrationStatus (s : String) : String :=
  match s with
  | "completed" => "Given" | "not-done" => "Not given" | "on-hold" => "Held"
  | "in-progress" => "In progress" | "stopped" => "Stopped" | _ => s

/-- Actual dose, site, performer, time and reason from MedicationAdministration. -/
def administrationRow (rs : List Json) (r : Json) : AdministrationRow :=
  let dosage := field r "dosage"
  { orderId := str (field r "request") "reference"
    medication := medName r, dose := quantityLabel (field dosage "dose")
    route := ccText (field dosage "route"), site := ccText (field dosage "site")
    time := let t := str r "effectiveDateTime"
      if t != "" then t else str (field r "effectivePeriod") "start"
    status := administrationStatus (str r "status")
    reason := "; ".intercalate ((arr r "statusReason").map ccText)
    performer := ", ".intercalate ((arr r "performer").map fun p => humanRef rs (field p "actor")) }

/-- Actual administration records; entered-in-error records are excluded. -/
def administrationRows (rs : List Json) : List AdministrationRow :=
  oldestFirst (·.time) ((ofType "MedicationAdministration" rs |>.filter
    (fun r => str r "status" != "entered-in-error")).map (administrationRow rs))

/-- One clinical Observation, including integer and boolean assessments. -/
def observationRow (r : Json) : ObservationRow :=
  let (value, unit, _) := obsValue r
  let value := if value != "" then value else
    match field r "valueInteger" with
    | .num n => toString n
    | _ => match field r "valueBoolean" with
      | .bool b => if b then "Yes" else "No"
      | _ => "Not recorded"
  { measure := ccText (field r "code"), value, unit, time := obsWhen r, status := str r "status" }

/-- Each clinical Observation retains its own time, unit, value and status. -/
def observationRows (rs : List Json) : List ObservationRow :=
  oldestFirst (·.time) ((rs.filter isObservation).map observationRow)

/-- Lab flag from source interpretation, else numeric comparison in Lean.
The existing demo reference-range policy is unchanged. -/
def labFlag (r : Json) : String :=
  let source := ((arr r "interpretation").flatMap codings).map (str · "code")
  let explicit := source.find? (abnormalCodes.contains ·)
  match explicit with
  | some flag => flag
  | none => match (labPoint r).hundredths?, (labPoint r).range? with
    | some value, some (lo, hi) => if value < lo then "L" else if hi < value then "H" else ""
    | _, _ => ""

/-- Latest interpretation for each analyte, matching labRows' latest result. -/
def labFlags (rs : List Json) : List (String × String) :=
  let labs := rs.filter isLab
  ((labs.map (fun r => firstCode (field r "code"))).eraseDups).filterMap fun code =>
    (latestBy obsWhen (labs.filter (fun r => firstCode (field r "code") == code))).map
      (fun r => (code, labFlag r))

/-! ## Facts and display -/

/-! ## Acute-care supporting information

These are read-only projections of supplied resources. Selection uses exact
resource references; no scan, signature, due time or clinical event is created.
The record adapter may supply selectedEncounterId and selectedMedicationRequestId.
They are selectors, never visible clinical columns or evidence of completion. -/

/-- Match a FHIR reference to the exact supplied resource, including fixture URNs. -/
def acuteRefersTo (reference resource : Json) : Bool :=
  let id := str resource "id"
  let ref := str reference "reference"
  id != "" && (ref == id || ref == resourceType resource ++ "/" ++ id)

/-- Patient-scoped sources; another patient's records never enter these panels. -/
def acutePatientResources (rs : List Json) (patient : Json) : List Json :=
  rs.filter fun r => acuteRefersTo (field r "subject") patient ||
    acuteRefersTo (field r "patient") patient || acuteRefersTo (field r "for") patient

/-- An explicit encounter selector is authoritative. Otherwise use only an
ongoing ED/inpatient encounter for this patient, never a historical clinic visit. -/
def acuteEncounter (ctx : FactsContext) (rs : List Json) (patient : Json) : Option Json :=
  let encounters := ofType "Encounter" (acutePatientResources rs patient)
  match ctx.record.lookup "selectedEncounterId" with
  | some id => encounters.find? (fun r => str r "id" == id)
  | none => latestBy (fun r => str (field r "period") "start")
      (encounters.filter fun r => str r "status" == "in-progress" &&
        ["EMER", "IMP"].contains (str (field r "class") "code"))

/-- The medication task must name its exact order. A same-drug order is not a
substitute, even if it is the only current order in the supplied chart. -/
def acuteMedicationRequest (ctx : FactsContext) (rs : List Json) (patient : Json) : Option Json := do
  let id ← ctx.record.lookup "selectedMedicationRequestId"
  let order ← (ofType "MedicationRequest" (acutePatientResources rs patient)).find?
    (fun r => str r "id" == id)
  let encounter ← acuteEncounter ctx rs patient
  if acuteRefersTo (field order "encounter") encounter then some order else none

/-- Recorded administration status remains distinct from an active medication order. -/
def acuteAdministrationStatus (r : Json) : String :=
  match str r "status" with
  | "completed" => "Given"
  | "not-done" =>
    let reasons := (arr r "statusReason").map firstCode
    if reasons.contains "refused" then "Refused"
    else if reasons.contains "held" then "Held" else "Not given"
  | "on-hold" => "Held"
  | "in-progress" => "In progress"
  | other => other

/-- Actual dose, route, site and time are read from MedicationAdministration only. -/
def acuteAdministrationRow (r : Json) : List (String × String) :=
  let dosage := field r "dosage"
  [("Medication", ccText (field r "medicationCodeableConcept")),
   ("Actual dose", qtyText (field dosage "dose")),
   ("Unit", qtyUnitText (field dosage "dose")),
   ("Route", ccText (field dosage "route")), ("Site", ccText (field dosage "site")),
   ("Actual time", let actual := str r "effectiveDateTime"
     if actual != "" then actual else str (field r "effectivePeriod") "start"),
   ("Status", acuteAdministrationStatus r),
   ("Reason", "; ".intercalate ((arr r "statusReason").map ccText))]

/-- A lab value carries its recorded flag/range/time. No clinical threshold is
inferred here and unlike units are never joined into a computed trend. -/
def acuteLabRow (r : Json) : List (String × String) :=
  let (value, unit, _) := obsValue r
  let range := first r "referenceRange"
  let rangeText := str range "text"
  [("Test", ccText (field r "code")), ("Value", value), ("Unit", unit),
   ("Flag", ", ".intercalate ((arr r "interpretation").map firstCode)),
   ("Range", if rangeText != "" then rangeText else
      let low := qtyText (field range "low")
      let high := qtyText (field range "high")
      if low == "" && high == "" then "" else low ++ "–" ++ high),
   ("Recorded", obsWhen r), ("Status", str r "status")]

/-- Latest vital signs belong to the selected encounter. Conflicting records
at the same latest timestamp are retained together. -/
def acuteVitalRows (ctx : FactsContext) (rs : List Json) (patient : Json) : List (List (String × String)) :=
  match acuteEncounter ctx rs patient with
  | none => []
  | some encounter =>
    let vitals := (acutePatientResources rs patient).filter fun r => isVital r &&
      acuteRefersTo (field r "encounter") encounter
    let latest := vitals.filter fun r =>
      let sameCode := vitals.filter fun other => firstCode (field other "code") == firstCode (field r "code")
      (latestBy obsWhen sameCode).any fun newest => obsWhen r == obsWhen newest
    latest.map fun r =>
        let (value, unit, _) := obsValue r
        [("Vital sign", ccText (field r "code")), ("Value", value),
         ("Unit", unit), ("Recorded", obsWhen r)]

/-- Triage context and its dated vitals come from the selected encounter. -/
def acuteTriageRows (ctx : FactsContext) (rs : List Json) (patient : Json) : List (List (String × String)) :=
  match acuteEncounter ctx rs patient with
  | none => []
  | some encounter =>
    [[("Chief complaint", ccText (first encounter "reasonCode")),
      ("Acuity", ccText (field encounter "priority")),
      ("Arrival", str (field encounter "period") "start"),
      ("Arrival mode", ccText (field (field encounter "hospitalization") "admitSource")),
      ("Location", (encRow encounter).location)]] ++
    acuteVitalRows ctx rs patient

/-- Ordered details and prior actual administrations are separate rows. Timing
events are explicit source times, never an expansion of a frequency sentence. -/
def acuteDoseRows (ctx : FactsContext) (rs : List Json) (patient : Json) : List (List (String × String)) :=
  match acuteMedicationRequest ctx rs patient with
  | none => []
  | some order =>
    let instruction := first order "dosageInstruction"
    let dose := field (first instruction "doseAndRate") "doseQuantity"
    [[("Ordered medication", medName order), ("Ordered dose", qtyText dose),
      ("Unit", qtyUnitText dose), ("Route", ccText (field instruction "route")),
      ("Instructions", sigText order),
      ("Scheduled times (recorded local time)", "; ".intercalate ((arr (field instruction "timing") "event").filterMap fun j =>
        match j with | .str t => some (dayOf t ++ " " ++ sub t 11 5) | _ => none)),
      ("Order status", str order "status")]] ++
    ((ofType "MedicationAdministration" (acutePatientResources rs patient)).filter fun r =>
      str r "status" != "entered-in-error" && acuteRefersTo (field r "request") order).map acuteAdministrationRow

/-- A participant is assigned only from its explicit role coding. -/
def acuteParticipant (encounter : Json) (role : String) : String :=
  "; ".intercalate (((arr encounter "participant").filter fun participant =>
    (arr participant "type").any (hasCode · role)).map fun participant =>
      str (field participant "individual") "display")

/-- A supplied active ED encounter is one board row. Missing assignments, LOS
and disposition remain empty; no default acuity or progress is invented. -/
def acuteBoardRows (ctx : FactsContext) (rs : List Json) (patient : Json) : List (List (String × String)) :=
  let encounters := (ofType "Encounter" (acutePatientResources rs patient)).filter fun encounter =>
    str (field encounter "class") "code" == "EMER" &&
    ["arrived", "triaged", "in-progress", "onleave"].contains (str encounter "status")
  let selected := fun encounter => (acuteEncounter ctx rs patient).any
    (fun current => str encounter "id" == str current "id")
  -- The selected encounter is first for orientation. Opening remains attached
  -- to its separate exact-selector summary, never another encounter's board row.
  ((encounters.filter selected) ++ (encounters.filter fun encounter => !selected encounter)).map fun encounter =>
    let sources := (acutePatientResources rs patient).filter fun r =>
      acuteRefersTo (field r "encounter") encounter
    let imagingOrders := (ofType "ServiceRequest" sources).filter fun r =>
      (arr r "category").any (hasCode · "imaging")
    [("Room", (encRow encounter).location), ("Patient", displayName patient),
     ("Age/sex", (if str patient "birthDate" == "" then "Age not recorded"
       else toString (ageYears (str patient "birthDate") ctx.today)) ++ " / " ++ sexOf patient),
     ("Chief complaint", ccText (first encounter "reasonCode")),
     ("Acuity", ccText (field encounter "priority")), ("Arrival", str (field encounter "period") "start"),
     ("LOS", " ".intercalate ([qtyText (field encounter "length"), qtyUnitText (field encounter "length")].filter (· != ""))),
     ("RN", acuteParticipant encounter "RN"), ("Provider", acuteParticipant encounter "ATND"),
     ("Labs", if sources.any isLab then "Results available" else ""),
     ("Imaging", if imagingOrders.any (fun r => str r "status" == "active") then "Ordered" else ""),
     ("Disposition", ccText (field (field encounter "hospitalization") "dischargeDisposition")),
     ("Status", str encounter "status")]

/-- The worklist uses supplied Task dates and states, never an inferred task or
completion mark from visiting a screen. -/
def acuteWorklistRows (rs : List Json) (patient : Json) : List (List (String × String)) :=
  ((ofType "Task" (acutePatientResources rs patient)).filter fun task =>
    !["entered-in-error", "cancelled"].contains (str task "status")).map fun task =>
    [("Due", str (field (field task "restriction") "period") "end"),
     ("Patient", displayName patient),
     ("Task", let description := str task "description"
       if description != "" then description else ccText (field task "code")),
     ("Priority", str task "priority"), ("Status", str task "status"),
     ("Owner", str (field task "owner") "display")]

/-- Merge repeated columns without losing another observation at that timestamp. -/
def acuteMergeColumns (cells : List (String × String)) : List (String × String) :=
  cells.foldl (fun columns (key, value) =>
    if columns.any (·.1 == key) then columns.map fun (label, previous) =>
      (label, if label == key then previous ++ "; " ++ value else previous)
    else columns ++ [(key, value)]) []

/-- Display recorded wall-clock minutes with their supplied UTC offset. -/
def acuteTimeColumn (time : String) : String :=
  if time.length < 16 then if time == "" then "Time not recorded" else time else
  let offset := sub time (time.length - 6) 6
  let zone := if time.endsWith "Z" then " UTC"
    else if offset.startsWith "+" || offset.startsWith "-" then " " ++ offset else ""
  dayOf time ++ " " ++ sub time 11 5 ++ zone

/-- Recorded times are grouped into hour columns; this does not associate an
actual administration with a planned dose. The original minute remains in text. -/
def acuteHourColumn (time : String) : String :=
  let label := acuteTimeColumn time
  if time.length < 16 then label else sub label 0 13 ++ ":00" ++ sub label 16 label.length

/-- The MAR's selected calendar day is explicit in the supplied context. Unknown
times remain visible, rather than being assigned to an invented hour. -/
def acuteMarDay (ctx : FactsContext) (time : String) : Bool :=
  ctx.today == "" || time.length < 10 || dayOf time == ctx.today

/-- One actual record retains its exact minute, dose, route, site and reason. -/
def acuteAdminCell (ctx : FactsContext) (administration : Json) : Option (String × String) :=
  let values := acuteAdministrationRow administration
  let time := (values.lookup "Actual time").getD ""
  if str administration "status" == "entered-in-error" ||
      (!acuteMarDay ctx time && str administration "status" != "in-progress") then none else
  some (acuteHourColumn time,
    " · ".intercalate ([acuteAdministrationStatus administration,
      if time.length ≥ 16 then sub time 11 5 else "Time not recorded",
      " ".intercalate ([(values.lookup "Actual dose").getD "", (values.lookup "Unit").getD ""].filter (· != "")),
      (values.lookup "Route").getD "", (values.lookup "Site").getD "",
      (values.lookup "Reason").getD ""].filter (· != "")))

/-- An order has only explicit planned times and its referenced actual records. -/
def acuteMarCells (ctx : FactsContext) (sources : List Json) (order : Json) : List (String × String) :=
  let instruction := first order "dosageInstruction"
  acuteMergeColumns <|
    ((arr (field instruction "timing") "event").filterMap fun event => match event with
      | .str time => if acuteMarDay ctx time then
          some (acuteHourColumn time, "Scheduled · " ++ (if time.length ≥ 16 then sub time 11 5 else time))
        else none
      | _ => none) ++
    ((ofType "MedicationAdministration" sources).filter fun administration =>
      acuteRefersTo (field administration "request") order).filterMap (acuteAdminCell ctx)

/-- Empty hourly axis cells are layout, never scheduled doses. Separate supplied
offsets remain separate axes; this code performs no time-zone conversion. -/
def acuteMarAxis (cells : List (String × String)) : List String :=
  let labels := (cells.map (·.1)).eraseDups
  let timed := labels.filter fun label => label.length ≥ 16 && (sub label 11 2).toNat?.any (· < 24)
  let axes := (timed.map fun label => (sub label 0 10, sub label 16 label.length)).eraseDups
  let hours := axes.flatMap fun (day, zone) =>
    let values := (timed.filter fun label => sub label 0 10 == day && sub label 16 label.length == zone).filterMap
      (fun label => (sub label 11 2).toNat?)
    match values.head? with
    | none => []
    | some first =>
      let lo := min 23 (values.foldl min first)
      let hi := min 23 (values.foldl max first)
      (List.range (hi - lo + 1)).map fun n =>
        day ++ " " ++ (if lo + n < 10 then "0" else "") ++ toString (lo + n) ++ ":00" ++ zone
  (hours ++ labels.filter (fun label => !timed.contains label)).eraseDups.mergeSort (· ≤ ·)

/-- The selected day's MAR uses hourly columns with exact times inside cells.
Unmatched actual records stay separate when their context explicitly identifies
the selected encounter. No same-drug matching or frequency expansion occurs. -/
def acuteMarRows (ctx : FactsContext) (rs : List Json) (patient : Json) : List (List (String × String)) :=
  match acuteEncounter ctx rs patient with
  | none => []
  | some encounter =>
    let sources := acutePatientResources rs patient
    let orders := (ofType "MedicationRequest" sources).filter fun order =>
      str order "status" != "entered-in-error" && acuteRefersTo (field order "encounter") encounter
    let unmatched := (ofType "MedicationAdministration" sources).filter fun administration =>
      acuteRefersTo (field administration "context") encounter &&
      !orders.any (acuteRefersTo (field administration "request"))
    let orphanCells := unmatched.filterMap (acuteAdminCell ctx)
    let times := acuteMarAxis ((orders.flatMap (acuteMarCells ctx sources)) ++ orphanCells)
    (orders.map fun order =>
      let instruction := first order "dosageInstruction"
      let dose := field (first instruction "doseAndRate") "doseQuantity"
      let cells := acuteMarCells ctx sources order
      [("Medication", medName order), ("Dose", qtyText dose ++ " " ++ qtyUnitText dose),
       ("Route", ccText (field instruction "route")), ("Frequency", sigText order),
       ("Category", if field instruction "asNeededBoolean" == .bool true then "PRN"
         else if (arr (field instruction "timing") "event").isEmpty then "Not recorded" else "Scheduled"),
       ("Order status", str order "status")] ++ times.map fun time => (time, (cells.lookup time).getD "")) ++
    unmatched.filterMap fun administration => do
      let cell ← acuteAdminCell ctx administration
      let values := acuteAdministrationRow administration
      some ([("Medication", (values.lookup "Medication").getD ""),
        ("Dose", (values.lookup "Actual dose").getD "" ++ " " ++ (values.lookup "Unit").getD ""),
        ("Route", (values.lookup "Route").getD ""), ("Frequency", ""),
        ("Category", "Recorded administration"), ("Order status", "Order unavailable in this encounter")] ++
        times.map fun time => (time, if cell.1 == time then cell.2 else ""))

/-- Current-encounter flowsheet observations are grouped by measure and unit.
All values at a shared timestamp survive; blanks are never filled with zero. -/
def acuteFlowsheetRows (ctx : FactsContext) (rs : List Json) (patient : Json) : List (List (String × String)) :=
  match acuteEncounter ctx rs patient with
  | none => []
  | some encounter =>
    let observations := (acutePatientResources rs patient).filter fun r =>
      isVital r && acuteRefersTo (field r "encounter") encounter
    let measures := (observations.map fun r => (firstCode (field r "code"), (obsValue r).2.1)).eraseDups
    measures.map fun (code, unit) =>
      let readings := observations.filter fun r => hasCode (field r "code") code && (obsValue r).2.1 == unit
      [("Measure", ccText (field (readings.headD .null) "code")), ("Unit", unit)] ++
      ((readings.map obsWhen).eraseDups.mergeSort (· ≤ ·)).map fun time =>
        (dayOf time ++ " " ++ sub time 11 5,
          "; ".intercalate ((readings.filter (obsWhen · == time)).map fun r => (obsValue r).1))

/-- Supporting panels are sourced from this patient's chart. An absent source
produces no rows; absent clinical data does not become a normal result. -/
def acuteSupportingRows (ctx : FactsContext) (rs : List Json) (patient : Json) :
    List (InfoId × List (List (String × String))) :=
  let sources := acutePatientResources rs patient
  let labs := (sources.filter isLab).filter fun r =>
    (acuteEncounter ctx rs patient).any (acuteRefersTo (field r "encounter"))
  let acuteCare := (acuteEncounter ctx rs patient).any fun encounter =>
    ["EMER", "IMP"].contains (str (field encounter "class") "code")
  let labCodes := fun (codes : List String) => (labs.filter fun r => codes.any (hasCode (field r "code"))).map acuteLabRow
  let prnOrders := (ofType "MedicationRequest" sources).filter fun r =>
    field (first r "dosageInstruction") "asNeededBoolean" == .bool true
  let administrations := (ofType "MedicationAdministration" sources).filter fun r =>
    str r "status" != "entered-in-error" && prnOrders.any (acuteRefersTo (field r "request"))
  let handoffs := (ofType "DocumentReference" sources).filter fun r =>
    documentVisible r && (hasCode (field r "type") "51852-2" || hasCode (field r "type") "handoff")
  [("triageSummary", acuteTriageRows ctx rs patient),
   ("edTrackBoard", acuteBoardRows ctx rs patient),
   ("shiftWorklist", acuteWorklistRows rs patient),
   ("marSchedule", acuteMarRows ctx rs patient),
   ("flowsheetHistory", acuteFlowsheetRows ctx rs patient),
   ("labResults", if acuteCare then labs.map acuteLabRow else []),
   ("resultTrend", if acuteCare then (newestFirst obsWhen (sources.filter isLab)).map acuteLabRow else []),
   ("vitals", if acuteCare then acuteVitalRows ctx rs patient else []),
   ("marDoseDetails", acuteDoseRows ctx rs patient),
   ("glucoseTrend", labCodes ["2339-0", "2345-7", "41653-7", "14743-9"]),
   ("coagLabs", labCodes ["6301-6", "5902-2", "3173-2", "14979-9"]),
   ("prnHistory", administrations.map acuteAdministrationRow),
   ("handoffSummary", handoffs.map fun r =>
      let note := noteRow r
      [("Report", note.title), ("Author", note.author), ("Recorded", note.date),
       ("Text", note.text), ("Status", note.status)])]

/-- Bind supplied acute projections to this bundle's version digest. Current
results/vitals stay explicitly empty when absent, without historical fallback.
These read-only panels supply no temporal event evidence or human captures. -/
def acutePayloads (ctx : FactsContext) (rs : List Json) (patient : Json) : List InfoPayload :=
  let acuteCare := (acuteEncounter ctx rs patient).any fun encounter =>
    ["EMER", "IMP"].contains (str (field encounter "class") "code")
  ((acuteSupportingRows ctx rs patient).filter (fun (info, rows) =>
    !rows.isEmpty || (["labResults", "resultTrend", "vitals"].contains info && acuteCare))).map fun (info, rows) =>
    { info, patient := patientIdOf patient, artifactKey := "acute:" ++ info
      artifact := "acute-chart:" ++ patientIdOf patient, version := listVersion rs
      rows := rows.zipIdx.map fun (fields, slot) => { id := info ++ ":" ++ toString slot, slot, fields } }

/-- The facts the spec needs. -/
def factsOf (ctx : FactsContext) (rs : List Json) (p : Json) : Facts :=
  let age := ageYears (str p "birthDate") ctx.today
  let allergies := rs.filter isAllergy
  let meds := rs.filter isMedRequest
  let labs := labRows rs
  let visitDx := match latestEncounter rs with
    | some e => firstCode (first e "reasonCode")
    | none => ""
  let acute := acutePayloads ctx rs p
  { patientId := patientIdOf p
    identity := { initials := initials p, sex := sexOf p, ageYears := age }
    allergyVersion := listVersion allergies
    allergyClasses := ((allergies.filter allergyActive).flatMap allergyClassesOf).eraseDups
    notesVersion := notesVersionOf rs
    historyVersion := historyVersionOf rs
    medsVersion := listVersion meds
    currentMedClasses := ((meds.filter medActive).flatMap fun r => drugClasses (medDrug r)).eraseDups
    weightToday? := weightTodayOf ctx.today rs
    careGaps := careGapsOf ctx.today age rs
    abnormalResult := labs.any (·.abnormal)
    now := ctx.now
    medToGive? := ctx.medToGive?
    encounterKind? := ctx.encounterKind?
    receipts := ctx.receipts
    infoPayloads? := if acute.isEmpty then none else some acute
    artifactBindings? := if acute.isEmpty then none else some (acute.map fun payload =>
      { key := payload.artifactKey, artifact := payload.artifact, version := payload.version })
    record := (if visitDx != "" then [("visitDiagnosis", visitDx)] else []) ++ ctx.record }

/-- The display rows. -/
def displayOf (ctx : FactsContext) (rs : List Json) (p : Json) : Display :=
  let dob := str p "birthDate"
  { asOf := ctx.today
    banner := bannerOf ctx.today rs p
    allergies := allergyRows rs
    meds := medRows rs
    vitals := newestFirst (·.date) ((rs.filter isVital).map vitalRow)
    labs := labRows rs
    problems := newestFirst (·.onset)
      ((ofType "Condition" rs |>.filter (verificationStatus · != "entered-in-error")).map problemRow)
    immunizations := newestFirst (·.date) ((ofType "Immunization" rs).map immRow)
    encounters := newestFirst (·.start) ((ofType "Encounter" rs).map encRow)
    procedures := newestFirst (·.date) ((ofType "Procedure" rs).map procRow)
    growth := growthPoints dob rs
    notes := noteRows rs
    history := historyRows rs
    schedule := scheduleRows ctx.today rs, board := boardRows ctx.today rs
    marOrders := marOrderRows rs, administrations := administrationRows rs
    observations := observationRows rs, labFlags := labFlags rs }

/-- **Parse a FHIR bundle** into facts and display rows. Fails only if the
input is not a Bundle or has no Patient. -/
def parseBundle (ctx : FactsContext) (b : Json) : Except String (Facts × Display) :=
  if resourceType b != "Bundle" then .error "not a FHIR Bundle"
  else
    let rs := bundleResources b
    match rs.find? (resourceType · == "Patient") with
    | none => .error "bundle has no Patient"
    | some p => .ok (factsOf ctx rs p, displayOf ctx rs p)

/-! ## API record (needs `Lean.Json`) -/

/-- Input of `facts`: a FHIR bundle and the context. -/
structure FactsInput where
  bundle : Json
  context : FactsContext
  deriving Lean.ToJson, Lean.FromJson

/-- `facts` on a parsed input. -/
def runFacts (i : FactsInput) : Except String FactsOutput :=
  (parseBundle i.context i.bundle).map fun (f, d) => { facts := f, display := d }

end Ehr.Render.Fhir
