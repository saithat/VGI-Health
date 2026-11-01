import Lean.Data.Json
import Ehr.Render.Json
import Ehr.Formulary
import Ehr.Core.Basics

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

/-- Growth references require explicit birth-sex coding, not administrative
gender. Missing, unknown or conflicting source values remain unavailable. -/
def growthReferenceSex (p : Json) : Option String :=
  let codes := ((arr p "extension").filter fun extension =>
    str extension "url" == "http://hl7.org/fhir/us/core/StructureDefinition/us-core-birthsex").map
      (str · "valueCode") |>.eraseDups
  match codes with
  | ["M"] => some "M"
  | ["F"] => some "F"
  | _ => none

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

/-- Normalize an explicitly supplied height unit for a centimeter growth axis.
Unknown units stay unavailable; an unlabelled number is never assumed to be cm. -/
def heightCmTenths (quantity : Json) : Option Nat :=
  let code := str quantity "code"
  let unit := (if code == "" then str quantity "unit" else code).toLower
  match unit with
  | "cm" => qtyScaled quantity 1
  | "m" => qtyScaled quantity 3
  | "[in_i]" | "in" => (qtyScaled quantity 3).map (fun n => n * 254 / 10000)
  | _ => none

/-- Growth points: body weights (kg) and heights (cm), joined by day, oldest
first. -/
def growthPoints (dob : String) (rs : List Json) : List GrowthPoint :=
  let ws := (rs.filter isBodyWeight).filterMap fun r =>
    match weightReading r with
    | some (w, .kg) => some (dayOf (obsWhen r), w)
    | some (w, .lb) => some (dayOf (obsWhen r), w * 4536 / 10000)
    | _ => none
  let hs := (rs.filter fun r => isObservation r && hasCode (field r "code") bodyHeightCode).filterMap
    fun r => (heightCmTenths (field r "valueQuantity")).map (dayOf (obsWhen r), ·)
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
    pcp := if gp != "" then gp else encProvider
    coverage := coverageOf rs
    encounterClass := str (field enc "class") "code"
    attending := encProvider
    location := (encRow enc).location
    weight? := bannerWeightOf today rs }

/-! ## Ambulatory supporting views

These are display projections of supplied FHIR records. They do not infer
protocol eligibility, delivery, adherence, percentiles or vaccine due dates.
The ordinary InfoPayload boundary keeps patient/version binding intact. -/

namespace Ambulatory

/-- A typed appointment row; opening its encounter remains an ordinary UI goto. -/
structure AmbulatoryScheduleRow where
  time : String
  patient : String
  ageSex : String
  visitType : String
  status : String
  complaint : String
  provider : String
  location : String
  deriving Inhabited

/-- A typed message row, preserving the Task's actual status and received time. -/
structure AmbulatoryMessageRow where
  received : String
  patient : String
  subject : String
  sender : String
  priority : String
  status : String
  folder : String
  deriving Inhabited

/-- References are used only for matching; internal resource IDs are never cells. -/
def referenceMatches (reference : String) (p : Json) : Bool :=
  let raw := str p "id"
  let id := if raw.startsWith "urn:uuid:" then sub raw 9 raw.length else raw
  !id.isEmpty && (reference == raw || reference == "Patient/" ++ id || reference == "urn:uuid:" ++ id)

/-- Select only tasks explicitly bound to the current chart. -/
def patientTasks (rs : List Json) (p : Json) : List Json :=
  newestFirst (str · "authoredOn") ((ofType "Task" rs).filter fun r =>
    referenceMatches (str (field r "for") "reference") p &&
    !["entered-in-error", "cancelled", "completed", "failed"].contains (str r "status"))

/-- Folder names describe the supplied message type, not a made-up workflow. -/
def taskFolder (r : Json) : String :=
  let code := (ccText (field r "code") ++ " " ++ str r "description").toLower
  if (code.splitOn "refill").length > 1 || (code.splitOn "rx request").length > 1 then "Rx Requests"
  else if (code.splitOn "result").length > 1 then "Results" else "Patient Messages"

/-- Project every current-chart appointment on the requested day. -/
def scheduleRows (ctx : FactsContext) (rs : List Json) (p : Json) : List AmbulatoryScheduleRow :=
  ((ofType "Appointment" rs).filter fun r =>
    dayOf (str r "start") == ctx.today && (arr r "participant").any fun participant =>
      referenceMatches (str (field participant "actor") "reference") p).map fun r =>
    let participants := (arr r "participant").map (field · "actor")
    let displayFor := fun referenceType =>
      ", ".intercalate ((participants.filter (fun actor => (str actor "reference").startsWith referenceType)).map (str · "display"))
    { time := str r "start", patient := displayName p
      ageSex := s!"{ageYears (str p "birthDate") ctx.today} / {sexOf p}"
      visitType := ccText (field r "appointmentType"), status := str r "status"
      complaint := let reason := "; ".intercalate ((arr r "reasonCode").map ccText)
        if reason == "" then str r "description" else reason
      provider := displayFor "Practitioner/", location := displayFor "Location/" }

/-- The supplied Task list, without guessed unread or completion flags. -/
def messageRows (rs : List Json) (p : Json) : List AmbulatoryMessageRow :=
  (patientTasks rs p).map fun r =>
    { received := str r "authoredOn", patient := displayName p
      subject := let description := str r "description"
        if description == "" then ccText (field r "code") else description
      sender := str (field r "requester") "display", priority := str r "priority"
      status := str r "status", folder := taskFolder r }

/-- Resolve the medication actually referenced by a refill request, including
contained MedicationRequests. Never substitute the first active medication. -/
def refillMedication (rs : List Json) (task : Json) : Option Json :=
  let reference := str (field task "focus") "reference"
  if reference.startsWith "#" then
    (arr task "contained").find? fun r => resourceType r == "MedicationRequest" &&
      reference == "#" ++ str r "id"
  else (ofType "MedicationRequest" rs).find? fun r =>
    let raw := str r "id"
    let id := if raw.startsWith "urn:uuid:" then sub raw 9 raw.length else raw
    !id.isEmpty && (reference == raw || reference == "MedicationRequest/" ++ id ||
      reference == "urn:uuid:" ++ id)

/-- A pharmacy display is shown only when the prescription actually supplies it. -/
def prescriptionPharmacy (r : Json) : String :=
  str (field (field r "dispenseRequest") "performer") "display"

/-- Complete raw result rows, with the original reference ranges and flags. -/
def resultRows (rs : List Json) : List (List (String × String)) :=
  (labRows rs).map fun lab =>
    let source := ((rs.filter isLab).find? fun r =>
      firstCode (field r "code") == lab.code && obsWhen r == lab.date).getD .null
    [("test", lab.name), ("value", lab.value), ("unit", lab.unit),
     ("flag", "; ".intercalate ((arr source "interpretation").map ccText)),
     ("referenceRange", lab.refRange), ("collectedAt", lab.date),
     ("resultedAt", str source "issued"), ("status", str source "status")]

/-- Match relative or transaction-bundle references without showing them. -/
def resolveReference (rs : List Json) (reference : String) : Option Json :=
  if reference.isEmpty then none else rs.find? fun r =>
    let raw := str r "id"
    let id := if raw.startsWith "urn:uuid:" then sub raw 9 raw.length else raw
    !id.isEmpty && (reference == raw || reference == resourceType r ++ "/" ++ id ||
      reference == "urn:uuid:" ++ id)

/-- The selected result Task owns its report/Observation references. Older
unrelated analytes remain in Chart Review, not the selected-result report. -/
def selectedResultSources (rs : List Json) (p : Json) : List Json :=
  match (patientTasks rs p).find? (fun task => taskFolder task == "Results") with
  | none => rs.filter isLab
  | some task =>
    let inputs := (arr task "input").filterMap fun input =>
      resolveReference rs (str (field input "valueReference") "reference")
    let focus := resolveReference rs (str (field task "focus") "reference")
    let fromReport := focus.toList.flatMap fun report =>
      if resourceType report == "Observation" then [report]
      else (arr report "result").filterMap fun reference => resolveReference rs (str reference "reference")
    (inputs ++ fromReport).filter isLab |>.eraseDups

/-- All dated observations of the selected analytes, with units kept separate
by the presentation contract. No current-value row is duplicated. -/
def selectedTrendRows (rs selected : List Json) : List (List (String × String)) :=
  let codes := selected.map fun r => firstCode (field r "code")
  (oldestFirst obsWhen ((rs.filter isLab).filter fun r => codes.contains (firstCode (field r "code")))).map fun r =>
    let (value, unit, _) := obsValue r
    [("Test", ccText (field r "code")), ("Recorded", obsWhen r),
     ("Value", value), ("Unit", unit)]

/-- Forecast rows are read from ImmunizationRecommendation, never calculated
from age or an incomplete immunization history. -/
def forecastRows (rs : List Json) : List (List (String × String)) :=
  (ofType "ImmunizationRecommendation" rs).flatMap fun r =>
    (arr r "recommendation").map fun recommendation =>
      [("Vaccine", "; ".intercalate ((arr recommendation "vaccineCode").map ccText)),
       ("Status", ccText (field recommendation "forecastStatus")),
       ("Forecast date", str r "date"),
       ("Due dates", "; ".intercalate ((arr recommendation "dateCriterion").map fun date =>
         ccText (field date "code") ++ ": " ++ str date "value")),
       ("Source", str (field r "authority") "display")]

/-- Add a view only when source records exist. Empty data stays visibly absent. -/
def payload (p : Json) (rs : List Json) (info : InfoId)
    (rows : List (List (String × String))) (allowEmpty : Bool := false) : Option InfoPayload :=
  if rows.isEmpty && !allowEmpty then none else
  let version := listVersion rs
  some {
    info := info
    patient := patientIdOf p
    artifactKey := "ambulatory:" ++ info
    artifact := "FHIR bundle projection:" ++ toString version
    version := version
    rows := rows.zipIdx.map fun (fields, slot) => { id := toString slot, slot, fields } }

/-- Supporting clinic/inbox data, kept separate from all clinical guard logic. -/
def payloads (ctx : FactsContext) (rs : List Json) (p : Json) : List InfoPayload :=
  if !(rs.any fun r => ["Appointment", "Task", "Encounter", "MedicationDispense",
      "ImmunizationRecommendation"].contains (resourceType r) || isLab r) then [] else
  let messages := messageRows rs p
  let tasks := patientTasks rs p
  let selectedResults := selectedResultSources rs p
  let refill := tasks.find? (fun r => taskFolder r == "Rx Requests")
  let requestRows := refill.toList.map fun task =>
    let rx := (refillMedication rs task).getD .null
    [("Medication", medName rx), ("Sig", sigText rx),
     ("Requested by", str (field task "requester") "display"),
     ("Received", str task "authoredOn"), ("Prescription date", str rx "authoredOn"),
     ("Pharmacy", prescriptionPharmacy rx),
     ("Request", str task "description"), ("Status", str task "status")]
  let priorVisit := latestBy (fun r => str (field r "period") "start")
    ((ofType "Encounter" rs).filter fun r =>
      let date := str (field r "period") "start"
      date != "" && dayOf date < ctx.today && str r "status" != "entered-in-error")
  let views : List (InfoId × List (List (String × String))) :=
    [("inBasketFolders", if tasks.isEmpty then [] else ["Results", "Rx Requests", "Patient Messages"].map fun folder =>
        [("Folder", folder), ("Count", toString (messages.filter (·.folder == folder)).length),
         ("Status", "Open tasks in this chart")]),
     ("scheduleTasks", (scheduleRows ctx rs p).map fun row =>
        [("time", row.time), ("patient", row.patient), ("Age / sex", row.ageSex),
         ("Visit type", row.visitType), ("status", row.status), ("Chief complaint", row.complaint),
         ("Provider", row.provider), ("Location", row.location)]),
     ("inbasketItems", messages.map fun row =>
        [("received", row.received), ("patient", row.patient), ("subject", row.subject),
         ("sender", row.sender), ("priority", row.priority), ("status", row.status), ("Folder", row.folder)]),
     ("inBasketResults", (messages.filter (·.folder == "Results")).map fun row =>
        [("received", row.received), ("patient", row.patient), ("subject", row.subject),
         ("sender", row.sender), ("priority", row.priority), ("status", row.status)]),
     ("inBasketRxRequests", (messages.filter (·.folder == "Rx Requests")).map fun row =>
        [("received", row.received), ("patient", row.patient), ("subject", row.subject),
         ("sender", row.sender), ("priority", row.priority), ("status", row.status)]),
     ("messagePreview", (messages.filter (·.folder == "Results")).take 1 |>.map fun row =>
        [("subject", row.subject), ("context", row.folder ++ " — " ++ row.sender), ("received", row.received)]),
     ("refillRequest", requestRows),
     ("resultDetail", resultRows selectedResults), ("resultTrend", selectedTrendRows rs selectedResults),
     ("relevantLabs", resultRows rs),
     ("lastVisit", priorVisit.toList.map fun r =>
        let row := encRow r
        [("Date", row.start), ("Visit type", row.encType), ("Reason", row.reason),
         ("Provider", row.provider), ("Location", row.location)]),
     ("adherence", ((ofType "MedicationDispense" rs).filter (fun r => str r "status" != "entered-in-error")).map fun r =>
        [("Medication", medName r), ("Last fill", str r "whenHandedOver"),
         ("Quantity", qtyText (field r "quantity")), ("Days supply", qtyText (field r "daysSupply")),
         ("Status", str r "status"), ("Source", "Dispensing record")]),
     ("immunizationHistory", forecastRows rs)]
  -- A selected Task with unresolved references is an explicitly empty report,
  -- not permission to substitute unrelated historical analytes.
  views.filterMap fun (info, rows) => payload p rs info rows
    (tasks.any (fun task => taskFolder task == "Results") &&
      ["resultDetail", "resultTrend"].contains info)

end Ambulatory
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

/-- The facts the spec needs. -/
def factsOf (ctx : FactsContext) (rs : List Json) (p : Json) : Facts :=
  let age := ageYears (str p "birthDate") ctx.today
  let allergies := rs.filter isAllergy
  let meds := rs.filter isMedRequest
  let labs := labRows rs
  let visitDx := match latestEncounter rs with
    | some e => firstCode (first e "reasonCode")
    | none => ""
  let supporting := Ambulatory.payloads ctx rs p
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
    infoPayloads? := some supporting
    artifactBindings? := some (supporting.map fun payload =>
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
    growthReferenceSex? := if isoDateValid dob && isoDateValid ctx.today && dob ≤ ctx.today
      then growthReferenceSex p else none
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
