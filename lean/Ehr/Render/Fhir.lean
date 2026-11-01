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

/-- Keep server IDs and the Patient's declared bundle alias. Resources without
an ID use their fullUrl. The private alias stays inside the FHIR adapter. -/
def entryResource (e : Json) : Json :=
  let r := field e "resource"
  match r with
  | .obj _ =>
    let r := if str r "id" == "" then r.setObjVal! "id" (.str (str e "fullUrl")) else r
    if resourceType r == "Patient" && str e "fullUrl" != "" then
      r.setObjVal! "_bundleFullUrl" (.str (str e "fullUrl")) else r
  | _ => r

/-- **The resources of a bundle**: normalized `entry[i].resource`, in order. -/
def bundleResources (b : Json) : List Json :=
  (arr b "entry").map entryResource

/-- Only IDs and identifiers declared by this Patient are patient aliases. -/
def patientReferenceMatches (ref p : Json) : Bool :=
  let raw := str p "id"
  let id := if raw.startsWith "urn:uuid:" then sub raw 9 raw.length else raw
  let reference := str ref "reference"
  let base := ((reference.splitOn "/_history/").headD "")
  let identifier := field ref "identifier"
  let identifiers := (arr p "identifier").filter fun i =>
    str i "system" != "" && str i "value" != ""
  if reference != "" then
    (str p "_bundleFullUrl" != "" && reference == str p "_bundleFullUrl") ||
    (!id.isEmpty && (reference == raw || reference == "Patient/" ++ id ||
      reference == "urn:uuid:" ++ id || reference == "#" ++ id ||
      base == "Patient/" ++ id ||
      ((base.startsWith "https://" || base.startsWith "http://") &&
        base.endsWith ("/Patient/" ++ id)))) ||
    identifiers.any (fun i => reference == str i "system" ++ "|" ++ str i "value" ||
      reference == "Patient?identifier=" ++ str i "system" ++ "|" ++ str i "value")
  else identifiers.any fun i => str identifier "system" == str i "system" &&
    str identifier "value" == str i "value"

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
  if fam == "" && given == "" then str n "text"
  else if fam == "" then given else if given == "" then fam else fam ++ ", " ++ given

/-- A practitioner's supplied name text, else the official structured name. -/
def practitionerName (r : Json) : String :=
  let text := (str (officialName r) "text").trimAscii.toString
  if text != "" then text else (displayName r).trimAscii.toString

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
  | none =>
    -- The imported Synthetic Hospital converter declares this source identifier
    -- as its MRN in fixtures/synthetic-hospital/index.json (convert.mjs).
    (((arr p "identifier").find? (fun i => str i "system" == "http://hospital.smarthealthit.org")).map (str · "value")).getD ""

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

/-- Department display names for supplied standard LOINC labels. Recorded codes
and calculation methods are preserved; custom local names remain authoritative. -/
def labDisplayAliases : List (String × String × String) :=
  [("2160-0", "Creatinine [Mass/volume] in Serum or Plasma", "Creatinine"),
   ("4548-4", "Hemoglobin A1c/Hemoglobin.total in Blood", "Hemoglobin A1c"),
   ("718-7", "Hemoglobin [Mass/volume] in Blood", "Hemoglobin"),
   ("33914-3", "Glomerular filtration rate [Volume Rate/Area] in Serum or Plasma by Creatinine-based formula (MDRD)/1.73 sq M", "eGFR (MDRD)")]

/-- Only a known system/code and its standard label (or a code-only label)
receive the department caption. Unknown codes and qualified names keep their text. -/
def labDisplayName (concept : Json) : String :=
  let source := ccText concept
  let coding := (codings concept).headD .null
  let code := str coding "code"
  if str coding "system" != "http://loinc.org" then source else
  ((labDisplayAliases.find? fun (knownCode, standardName, _) =>
    code == knownCode && (source == standardName || source == code)).map
      fun (_, _, label) => label).getD source

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
  { code, name := labDisplayName (field r "code"), value := v, unit := u, date := obsWhen r
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
      else if attachments.length == 1 && str (attachments.headD .null) "title" == "" then
        noteAttachmentText (attachments.headD .null)
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

/-- Reviewed SNOMED social, education, housing and care-planning findings.
These remain in Social History / SDOH, with their source code and dates. -/
def socialFindingCodes : List String :=
  ["105531004", "473461003", "314529007", "160904001", "73595000", "160903007",
   "422650009", "224299000", "73438004", "224295006", "266948004", "423315002",
   "706893006", "446654005", "266934004", "713458007"]

/-- Only the reviewed SNOMED codes move; similarly named clinical diagnoses stay. -/
def isSocialCondition (r : Json) : Bool :=
  resourceType r == "Condition" && (codings (field r "code")).any fun c =>
    str c "system" == "http://snomed.info/sct" && socialFindingCodes.contains (str c "code")

def isHistoryResource (r : Json) : Bool :=
  isSocialCondition r || ["MedicationStatement", "FamilyMemberHistory", "Procedure"].contains (resourceType r) ||
    (resourceType r == "Observation" && (categoryCodes r).contains "social-history")

def historyRows (rs : List Json) : List HistoryRow :=
  rs.flatMap fun r =>
    if str r "status" == "entered-in-error" then [] else
    match resourceType r with
    | "Condition" => if isSocialCondition r && verificationStatus r != "entered-in-error" then
        [{ id := str r "id", kind := "Social history", item := ccText (field r "code"),
           detail := "SNOMED CT " ++ firstCode (field r "code") ++ "; recorded: " ++ (problemRow r).onset,
           status := clinicalStatus r, source := "Condition (SDOH)", versionId := str (field r "meta") "versionId" }] else []
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
first. Each day uses the latest recorded reading, independent of bundle order. -/
def growthPoints (dob : String) (rs : List Json) : List GrowthPoint :=
  let rs := oldestFirst obsWhen (rs.filter fun r => isBodyWeight r ||
    (isObservation r && hasCode (field r "code") bodyHeightCode))
  let ws := (rs.filter isBodyWeight).filterMap fun r =>
    match weightReading r with
    | some (w, .kg) => some (dayOf (obsWhen r), w)
    | some (w, .lb) => some (dayOf (obsWhen r), w * 4536 / 10000)
    | some (w, .g) => some (dayOf (obsWhen r), w / 1000)
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

/-- Resolve a reference against the supplied bundle, without guessing a patient. -/
def referenced? (rs : List Json) (ref : Json) : Option Json :=
  let key := str ref "reference"
  if key == "" then none else rs.find? fun r =>
    let raw := str r "id"
    let id := if raw.startsWith "urn:uuid:" then sub raw 9 raw.length else raw
    !id.isEmpty && (key == raw || key == resourceType r ++ "/" ++ id || key == "urn:uuid:" ++ id)

/-- Human-readable reference text. Internal FHIR references are never displayed. -/
def humanRef (rs : List Json) (ref : Json) : String :=
  let display := str ref "display"
  if display != "" then display else
    match referenced? rs ref with
    | none => ""
    | some r => if resourceType r == "Patient" then displayName r
      else if resourceType r == "Practitioner" then practitionerName r else str r "name"

/-- The banner fields. -/
def bannerOf (today : String) (rs : List Json) (p : Json) : BannerInfo :=
  let enc := (latestEncounter rs).getD .null
  let encProvider := humanRef rs (field (first enc "participant") "individual")
  let gp := humanRef rs (first p "generalPractitioner")
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

/-- Preserve every source interpretation concept, preferring standard flag codes. -/
def labSourceFlags (r : Json) : String :=
  " · ".intercalate (((arr r "interpretation").map fun cc =>
    (((codings cc).map (str · "code")).find? (fun code => abnormalCodes.contains code || code == "N"))
      |>.getD (ccText cc)).filter (· != ""))

/-- A complex result keeps the comparator and unit alongside its recorded quantity. -/
def labQuantityText (q : Json) : String :=
  let value := qtyText q
  let unit := qtyUnitText q
  if value == "" then if unit == "" then "" else "Value not recorded (" ++ unit ++ ")"
  else str q "comparator" ++ value ++ (if unit == "" then "" else " " ++ unit)

/-- Retain sampled values and their supplied scale/timing as readable clinical data. -/
def labSampledValue (s : Json) : String :=
  let number := fun key => match field s key with | .num n => toString n | _ => ""
  let entry := fun label value => if value == "" then "" else label ++ ": " ++ value
  " · ".intercalate ([entry "Samples" (str s "data"), entry "Origin" (labQuantityText (field s "origin")),
    entry "Factor" (number "factor"), entry "Period (ms)" (number "period"),
    entry "Dimensions" (number "dimensions"), entry "Lower limit" (number "lowerLimit"),
    entry "Upper limit" (number "upperLimit")].filter (· != ""))

/-- Raw laboratory values retain comparators, signed values and qualitative results. -/
def labResultValue (r : Json) : String :=
  let quantity := field r "valueQuantity"
  if quantity != .null then str quantity "comparator" ++ qtyText quantity
  else if field r "valueCodeableConcept" != .null then ccText (field r "valueCodeableConcept")
  else if str r "valueString" != "" then str r "valueString" else
    match field r "valueInteger" with
    | .num n => toString n
    | _ => match field r "valueBoolean" with
      | .bool b => if b then "Yes" else "No"
      | _ =>
        let range := field r "valueRange"
        let ratio := field r "valueRatio"
        let period := field r "valuePeriod"
        let low := labQuantityText (field range "low")
        let high := labQuantityText (field range "high")
        if range != .null then
          if low != "" && high != "" then low ++ "–" ++ high
          else if low != "" then "Low: " ++ low else if high != "" then "High: " ++ high else "Range not recorded"
        else if ratio != .null then
          let numerator := labQuantityText (field ratio "numerator")
          let denominator := labQuantityText (field ratio "denominator")
          (if numerator == "" then "Numerator not recorded" else numerator) ++ " / " ++
            (if denominator == "" then "Denominator not recorded" else denominator)
        else if str r "valueDateTime" != "" then str r "valueDateTime"
        else if str r "valueTime" != "" then str r "valueTime"
        else if period != .null then str period "start" ++ " – " ++ str period "end"
        else if field r "valueSampledData" != .null then labSampledValue (field r "valueSampledData")
        else let reason := ccText (field r "dataAbsentReason")
          if reason != "" then "Not available · " ++ reason
          else if !(arr r "component").isEmpty then "See component results" else "Not recorded"

/-- Units of the existing demo intervals; no numeric interval or clinical fact changes. -/
def renderRefUnits : List (String × String) :=
  [("2339-0", "mg/dL"), ("4548-4", "%"), ("6298-4", "mmol/L"),
   ("2947-0", "mmol/L"), ("2069-3", "mmol/L"), ("2028-9", "mmol/L"),
   ("38483-4", "mg/dL"), ("6299-2", "mg/dL"), ("49765-1", "mg/dL"),
   ("2093-3", "mg/dL"), ("18262-6", "mg/dL"), ("2085-9", "mg/dL"),
   ("2571-8", "mg/dL"), ("718-7", "g/dL"), ("6690-2", "10*3/uL"),
   ("777-3", "10*3/uL"), ("33914-3", "mL/min/1.73m2")]

/-- A configured display interval is used only with its recorded matching unit. -/
def labDemoRangeCompatible (r : Json) : Bool :=
  let unit := qtyUnitText (field r "valueQuantity")
  unit != "" && renderRefUnits.lookup (firstCode (field r "code")) == some unit

/-- Keep source range text, bounds and population qualifiers together. -/
def labRangeText (unit : String) (rr : Json) : String :=
  let quantity := fun q =>
    if qtyText q == "" then
      if qtyUnitText q == "" then "" else "Not recorded " ++ qtyUnitText q
    else qtyText q ++ (if qtyUnitText q == "" || qtyUnitText q == unit then "" else " " ++ qtyUnitText q)
  let low := quantity (field rr "low")
  let high := quantity (field rr "high")
  let bounds := if low != "" && high != "" then low ++ "–" ++ high
    else if low != "" then "Low: " ++ low else if high != "" then "High: " ++ high else ""
  let age := field rr "age"
  let ageLow := quantity (field age "low")
  let ageHigh := quantity (field age "high")
  let ageText := if age == .null then "" else
    if ageLow != "" && ageHigh != "" then "Age " ++ ageLow ++ "–" ++ ageHigh
    else if ageLow != "" then "Age low: " ++ ageLow
    else if ageHigh != "" then "Age high: " ++ ageHigh else "Age not recorded"
  " · ".intercalate ([bounds, str rr "text", ccText (field rr "type"),
    ", ".intercalate ((arr rr "appliesTo").map ccText), ageText].filter (· != ""))

/-- Show each observation's own interval; incompatible demo units stay unknown. -/
def labResultRange (r : Json) : String :=
  let ranges := arr r "referenceRange"
  if !ranges.isEmpty then "; ".intercalate (ranges.map (labRangeText (qtyUnitText (field r "valueQuantity"))))
  else if labDemoRangeCompatible r then
    match (labPoint r).range? with
    | some (low, high) => fmtHundredths low ++ "–" ++ fmtHundredths high
    | none => ""
  else ""

/-- An inferred display flag needs an exact quantity and an unambiguous unit context. -/
def labResultFlag (r : Json) : String :=
  let source := labSourceFlags r
  if source != "" then source
  else if str (field r "valueQuantity") "comparator" != "" then ""
  else match arr r "referenceRange" with
  | [] => if labDemoRangeCompatible r then labFlag r else ""
  | [rr] =>
    let unit := qtyUnitText (field r "valueQuantity")
    let unitsMatch := fun q => qtyUnitText q == "" || qtyUnitText q == unit
    if (qtyScaled (field rr "low") 2).isSome && (qtyScaled (field rr "high") 2).isSome &&
        unitsMatch (field rr "low") && unitsMatch (field rr "high") &&
        (arr rr "appliesTo").isEmpty && field rr "age" == .null &&
        (field rr "type" == .null || firstCode (field rr "type") == "normal")
    then labFlag r else ""
  | _ => ""

/-- One result retains its own raw value and metadata, never the latest row's unit. -/
def labResultRow (r : Json) : LabResultRow :=
  { code := firstCode (field r "code"), name := labDisplayName (field r "code")
    value := labResultValue r, unit := qtyUnitText (field r "valueQuantity"), date := obsWhen r
    refRange := labResultRange r, flag := labResultFlag r, status := str r "status" }

/-- Component values keep their names and units and inherit the report's time/status. -/
def labComponentResultRow (parent component : Json) : LabResultRow :=
  let row := labResultRow component
  { row with name := labDisplayName (field parent "code") ++ " • " ++ row.name
             date := obsWhen parent, status := str parent "status" }

/-- Retain the report row and every component, without merging same-time records. -/
def labResultRowsFor (r : Json) : List LabResultRow :=
  labResultRow r :: (arr r "component").map (labComponentResultRow r)

/-- Full clinical result history. Latest-result aggregates remain a separate legacy API. -/
def labResultRows (rs : List Json) : List LabResultRow :=
  newestFirst (·.date) ((rs.filter isLab).flatMap labResultRowsFor)

/-- Only explicitly coded BP components can form a systolic/diastolic pair.
FHIR slices are unordered; a component's array position never supplies its meaning. -/
def observationBpValue? (r : Json) : Option (String × String) := do
  let loinc := fun cc code => (codings cc).any
    (fun c => str c "system" == "http://loinc.org" && str c "code" == code)
  let suppliedValue := ["valueQuantity", "valueCodeableConcept", "valueString", "valueBoolean",
    "valueInteger", "valueRange", "valueRatio", "valueSampledData", "valueTime", "valueDateTime", "valuePeriod"]
      |>.any (fun key => field r key != .null)
  if suppliedValue || !loinc (field r "code") "85354-9" then none else do
    let [systolic] := (arr r "component").filter (fun c => loinc (field c "code") "8480-6") | none
    let [diastolic] := (arr r "component").filter (fun c => loinc (field c "code") "8462-4") | none
    let s := field systolic "valueQuantity"
    let d := field diastolic "valueQuantity"
    if systolic == diastolic || qtyText s == "" || qtyText d == "" || qtyUnitText s == "" || qtyUnitText s != qtyUnitText d then none
    else some (str s "comparator" ++ qtyText s ++ "/" ++ str d "comparator" ++ qtyText d, qtyUnitText s)

/-- Source values include assessments, absent reasons and censored quantities. -/
def observationRow (r : Json) : ObservationRow :=
  let (value, unit) := (observationBpValue? r).getD
    (labResultValue r, qtyUnitText (field r "valueQuantity"))
  { measure := ccText (field r "code"), value, unit, time := obsWhen r,
    status := str r "status", categories := categoryCodes r }

/-- Ambulatory vitals use coded BP meaning and retain component labels/units.
Unpaired or ambiguous panels stay explicit instead of acquiring slash order. -/
def vitalRow (r : Json) : VitalRow :=
  let reading := observationRow r
  let components := arr r "component"
  let bp := observationBpValue? r
  let bpPart := fun c => (codings (field c "code")).any fun code =>
    str code "system" == "http://loinc.org" && ["8480-6", "8462-4"].contains (str code "code")
  let exactPair := bp.isSome && components.all (fun c => str (field c "valueQuantity") "comparator" == "")
  let details := if exactPair then components.filter (fun c => !bpPart c) else components
  let detailText := details.map fun c =>
    let name := ccText (field c "code")
    (if name == "" then "Component" else name) ++ ": " ++ labResultValue c ++
      (let unit := qtyUnitText (field c "valueQuantity")
       if unit == "" then "" else " " ++ unit)
  let primary := if reading.value == "See component results" then "" else
    reading.value ++ if reading.unit == "" then "" else " " ++ reading.unit
  let value := if components.isEmpty || exactPair && details.isEmpty then reading.value
    else " · ".intercalate ((if primary == "" || !exactPair && bp.isSome then [] else [primary]) ++ detailText)
  let unit := if components.isEmpty || exactPair && details.isEmpty then reading.unit else ""
  { id := str r "id", code := firstCode (field r "code"), name := reading.measure
    value, unit, date := reading.time
    hundredths? := if components.isEmpty && str (field r "valueQuantity") "comparator" == ""
      then qtyScaled (field r "valueQuantity") 2 else none }

/-- Every assessment component retains its own value/unit and report context. -/
def observationComponentRow (parent component : Json) : ObservationRow :=
  let row := observationRow component
  { row with
    measure := ccText (field parent "code") ++ " • " ++ row.measure
    time := obsWhen parent
    status := str parent "status"
    categories := categoryCodes parent }

/-- Parent and component records are all retained, including repeated timestamps. -/
def observationRowsFor (r : Json) : List ObservationRow :=
  observationRow r :: (arr r "component").map (observationComponentRow r)

/-- Each valid Observation retains its own time, category, value and components. -/
def observationRows (rs : List Json) : List ObservationRow :=
  oldestFirst (·.time) ((rs.filter isObservation).flatMap observationRowsFor)

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
  patientReferenceMatches (Json.mkObj [("reference", .str reference)]) p

/-- Select only tasks explicitly bound to the current chart. -/
def patientTasks (rs : List Json) (p : Json) : List Json :=
  newestFirst (str · "authoredOn") ((ofType "Task" rs).filter fun r =>
    patientReferenceMatches (field r "for") p &&
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
      patientReferenceMatches (field participant "actor") p).map fun r =>
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
      sender := humanRef rs (field r "requester"), priority := str r "priority"
      status := str r "status", folder := taskFolder r }

/-- Enclosing Task context tolerates an absent legacy fragment subject, but an
explicitly different patient reference is never treated as the same person. -/
def refillPatientCompatible (left right : String) : Bool :=
  let normalize := fun (key : String) =>
    if key.startsWith "urn:uuid:" then sub key 9 key.length
    else if key.startsWith "Patient/" then sub key 8 key.length else key
  left == "" || right == "" || normalize left == normalize right

/-- Resolve the medication actually referenced by a refill request, including
contained MedicationRequests. Never substitute the first active medication. -/
def refillMedication (rs : List Json) (task : Json) : Option Json :=
  let reference := str (field task "focus") "reference"
  let candidate := if reference.startsWith "#" then
    (arr task "contained").find? fun r => resourceType r == "MedicationRequest" &&
      reference == "#" ++ str r "id"
  else (ofType "MedicationRequest" rs).find? fun r =>
    let raw := str r "id"
    let id := if raw.startsWith "urn:uuid:" then sub raw 9 raw.length else raw
    !id.isEmpty && (reference == raw || reference == "MedicationRequest/" ++ id ||
      reference == "urn:uuid:" ++ id)
  candidate.filter fun r =>
    let owner := str (field r "subject") "reference"
    let patient := str (field task "for") "reference"
    refillPatientCompatible owner patient

/-- A pharmacy display is shown only when the prescription actually supplies it. -/
def prescriptionPharmacy (rs : List Json) (r : Json) : String :=
  humanRef rs (field (field r "dispenseRequest") "performer")

/-- Latest dated observations per coded analyte, retaining same-time records,
components and records whose date or identity is unknown. Full history remains
in Chart Review and the selected-analyte trend. -/
def latestResultSources (rs : List Json) : List Json :=
  let labs := rs.filter isLab
  let key := fun r =>
    let coding := (codings (field r "code")).headD .null
    let code := str coding "code"
    if code == "" then ("", ccText (field r "code")) else (str coding "system", code)
  let latest := (labs.map key).eraseDups.map fun code =>
    (code, ((latestBy obsWhen (labs.filter (fun r => key r == code))).map obsWhen).getD "")
  labs.filter fun r => key r == ("", "") || obsWhen r == "" || latest.lookup (key r) == some (obsWhen r)

/-- An active focused prescription, or its explicitly linked active predecessor.
The first medication with a similar name is never substituted. -/
def currentRefillPrescription (rs : List Json) (task requested : Json) : Option Json :=
  if str requested "status" == "active" || str requested "status" == "on-hold" then some requested
  else (referenced? rs (field requested "priorPrescription")).filter fun r =>
    resourceType r == "MedicationRequest" && (str r "status" == "active" || str r "status" == "on-hold") &&
      refillPatientCompatible (str (field r "subject") "reference") (str (field requested "subject") "reference") &&
      refillPatientCompatible (str (field r "subject") "reference") (str (field task "for") "reference")

/-- Prescription detail is source text; a missing unit never becomes mg. -/
def refillPrescriptionDetail (rs : List Json) (r : Json) (detail : String) : String :=
  let value := match detail with
    | "Dose" =>
      let q := field (first (first r "dosageInstruction") "doseAndRate") "doseQuantity"
      if qtyText q == "" then "" else
        qtyText q ++ if qtyUnitText q == "" then " (unit not recorded)" else " " ++ qtyUnitText q
    | "Dispense quantity" =>
      let q := field (field r "dispenseRequest") "quantity"
      qtyText q ++ if qtyUnitText q == "" then "" else " " ++ qtyUnitText q
    | "Refills" => match field (field r "dispenseRequest") "numberOfRepeatsAllowed" with
      | .num n => toString n
      | _ => ""
    | "Pharmacy" => prescriptionPharmacy rs r
    | _ => ""
  if value == "" then "Not recorded" else value

/-- The response column is added later from the interpreter's actual captures.
No proposed prescription or protocol pass is inferred from chart data. -/
def refillComparisonRows (rs : List Json) (task : Json) : List (List (String × String)) :=
  match refillMedication rs task with
  | none => []
  | some requested =>
    let current := (currentRefillPrescription rs task requested).getD .null
    ["Dose", "Dispense quantity", "Refills", "Pharmacy"].map fun detail =>
      [("detail", detail), ("requested", refillPrescriptionDetail rs requested detail),
       ("current", refillPrescriptionDetail rs current detail),
       ("proposed", "Awaiting clinician entry"), ("source", "Referenced prescription")]

/-- A last-fill date needs a completed dispensing record for this prescription
or the same explicit medication code/system, not a reported medication statement. -/
def refillLastFill (rs : List Json) (task requested : Json) : String :=
  let coding := (codings (field requested "medicationCodeableConcept")).headD .null
  let code := str coding "code"
  let system := str coding "system"
  let eligibleFill := fun r =>
    let linked := (arr r "authorizingPrescription").any fun ref =>
      (referenced? rs ref).any (fun rx => resourceType rx == "MedicationRequest" &&
        str rx "id" != "" && str rx "id" == str requested "id")
    let sameCode := code != "" && system != "" &&
      (codings (field r "medicationCodeableConcept")).any fun c =>
        str c "code" == code && str c "system" == system
    str r "status" == "completed" && str r "whenHandedOver" != "" && (linked || sameCode) &&
      refillPatientCompatible (str (field r "subject") "reference") (str (field task "for") "reference")
  ((latestBy (str · "whenHandedOver") ((ofType "MedicationDispense" (rs ++ arr task "contained")).filter eligibleFill)).map
    (str · "whenHandedOver")).getD "Not recorded"

/-- Complete raw result rows, with the original reference ranges and flags. -/
def resultRows (rs : List Json) : List (List (String × String)) :=
  (newestFirst obsWhen (rs.filter isLab)).flatMap fun source =>
    (labResultRowsFor source).map fun lab =>
      [("test", lab.name), ("value", lab.value), ("unit", lab.unit),
       ("flag", lab.flag), ("referenceRange", lab.refRange),
       ("collectedAt", lab.date), ("resultedAt", str source "issued"),
       ("status", lab.status)]

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
  (oldestFirst obsWhen ((rs.filter isLab).filter fun r => codes.contains (firstCode (field r "code")))).flatMap fun r =>
    (labResultRowsFor r).map fun lab =>
      [("Test", lab.name), ("Recorded", lab.date), ("Value", lab.value),
       ("Unit", lab.unit), ("Range", lab.refRange), ("Flag", lab.flag), ("Status", lab.status)]

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
  let priorVisit := latestBy (fun r => str (field r "period") "start")
    ((ofType "Encounter" rs).filter fun r =>
      let date := str (field r "period") "start"
      date != "" && dayOf date < ctx.today && str r "status" != "entered-in-error")
  let requestRows := refill.toList.map fun task =>
    let rx := (refillMedication rs task).getD .null
    [("Medication", medName rx), ("Sig", sigText rx),
     ("Prescription status", let status := str rx "status"
       if status == "" then "Not recorded" else status),
     ("Requested by", str (field task "requester") "display"),
     ("Received", str task "authoredOn"), ("Prescription date", str rx "authoredOn"),
     ("Pharmacy", let name := prescriptionPharmacy rs rx
       if name == "" then "Not recorded" else name),
     ("Quantity", quantityLabel (field (field rx "dispenseRequest") "quantity")),
     ("Days supply", quantityLabel (field (field rx "dispenseRequest") "expectedSupplyDuration")),
     ("Last fill", refillLastFill rs task rx),
     ("Last encounter", (priorVisit.map (fun r => str (field r "period") "start")).getD "Not recorded"),
     ("Request", str task "description"), ("Status", str task "status")]
  let views : List (InfoId × List (List (String × String))) :=
    [("inBasketFolders", if tasks.isEmpty then [] else ["Results", "Rx Requests", "Patient Messages"].map fun folder =>
        [("Folder", folder), ("Count", toString (messages.filter (·.folder == folder)).length)]),
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
     ("refillComparison", refill.toList.flatMap (refillComparisonRows rs)),
     ("resultDetail", resultRows selectedResults), ("resultTrend", selectedTrendRows rs selectedResults),
     ("relevantLabs", resultRows (latestResultSources rs)),
     ("lastVisit", priorVisit.toList.map fun r =>
        let row := encRow r
        [("Date", row.start), ("Visit type", row.encType), ("Setting", row.encClass), ("Reason", row.reason),
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

/-! ## Facts and display -/

/-! ## Perioperative chart projections

These views read supplied FHIR resources for the selected patient. They do not
invent OR times, rooms, consent verification, time-outs or postoperative events.
The surgical and consultation codes are also used by infra/seed-world.mjs.
-/

/-- Clinical reference text, resolving a supplied resource without displaying
an internal FHIR reference when its human-readable name is absent. -/
def periopReferenceName (rs : List Json) (ref : Json) : String :=
  let label := str ref "display"
  if label != "" then label else
  match rs.find? (fun r => str r "id" != "" &&
    (resourceType r ++ "/" ++ str r "id" == str ref "reference" ||
      str r "id" == str ref "reference")) with
  | none => "Not recorded"
  | some r =>
    let name := if resourceType r == "Location" || resourceType r == "Organization"
      then str r "name" else if resourceType r == "Practitioner"
        then practitionerName r else displayName r
    if name == "" then "Not recorded" else name

/-- Relative server references and normalized transaction fullUrls identify the
same selected resource. Missing identities never match each other. -/
def periopReferenceMatches (target ref : Json) : Bool :=
  let id := str target "id"
  if resourceType target == "Patient" then patientReferenceMatches ref target
  else id != "" && (str ref "reference" == id ||
    str ref "reference" == resourceType target ++ "/" ++ id)

/-- A resource belongs to the selected chart only through its explicit subject. -/
def periopSubject (p r : Json) : Bool :=
  periopReferenceMatches p (field r "subject")

/-- Expand the supplied surgical terminology labels used by the case feed.
Other source text and codes are retained; this assigns no new diagnosis. -/
def periopIndicationText (cc : Json) : String :=
  match ccText cc with
  | "appendicitis" => "Appendicitis"
  | "acute-cholecystitis" => "Acute cholecystitis"
  | "symptomatic-cholelithiasis" => "Symptomatic cholelithiasis"
  | "inguinal-hernia" => "Inguinal hernia"
  | "umbilical-hernia" => "Umbilical hernia"
  | text => text

/-- One surgical request on its actual planned date. Status is the request's
status; this does not assert that a patient is roomed or a procedure completed. -/
structure SurgicalCaseRow where
  room : String
  start : String
  procedure : String
  indication : String
  patient : String
  surgeon : String
  status : String
  deriving Repr, Inhabited

/-- The surgical worklist comes from dated surgical ServiceRequests, including
date-only requests. A date-only request never acquires an invented start time. -/
def surgicalCaseRows (today : String) (rs : List Json) (p : Json) : List SurgicalCaseRow :=
  (rs.filter fun r => resourceType r == "ServiceRequest" && periopSubject p r &&
    (arr r "category").any (hasCode · "387713003") &&
    !["entered-in-error", "revoked"].contains (str r "status") &&
    ((str r "occurrenceDateTime").startsWith today ||
      (str (field r "occurrencePeriod") "start").startsWith today)).map fun r =>
    { room := periopReferenceName rs (first r "locationReference")
      start := let exact := str r "occurrenceDateTime"
        if exact != "" then exact else str (field r "occurrencePeriod") "start"
      procedure := knownText (ccText (field r "code"))
      indication := knownText ("; ".intercalate ((arr r "reasonCode").map periopIndicationText))
      patient := displayName p
      surgeon := periopReferenceName rs (first r "performer")
      status := knownText (str r "status") }

/-- The OR-schedule contract retains the supplied indication as an extra column.
It is the request's reason, not a confirmed operative diagnosis. -/
def SurgicalCaseRow.cells (r : SurgicalCaseRow) : List (String × String) :=
  [("Room", r.room), ("Start", r.start), ("Procedure", r.procedure),
   ("Indication", r.indication), ("Patient", r.patient), ("Surgeon", r.surgeon), ("Status", r.status)]

/-- Open consultation requests retain their request time, indication and owner. -/
def surgicalConsultRows (rs : List Json) (p : Json) : List (List (String × String)) :=
  (rs.filter fun r => resourceType r == "ServiceRequest" && periopSubject p r &&
    hasCode (field r "code") "11429006" &&
    !["entered-in-error", "revoked", "completed"].contains (str r "status")).map fun r =>
    [("Received", str r "authoredOn"), ("Patient", displayName p),
     ("Task", knownText (ccText (field r "code"))),
     ("Reason", "; ".intercalate ((arr r "reasonCode").map periopIndicationText)),
     ("Priority", knownText (str r "priority")), ("Status", knownText (str r "status")),
     ("Requested by", periopReferenceName rs (field r "requester")),
     ("Owner", periopReferenceName rs (first r "performer")),
     ("Location", periopReferenceName rs (first r "locationReference"))]

/-- Consent documents remain evidence on file, independent of the surgeon's
human verification field and of the team's surgical time-out. -/
def surgicalConsentRows (rs : List Json) (p : Json) : List (List (String × String)) :=
  (rs.filter fun r => resourceType r == "Consent" &&
    periopReferenceMatches p (field r "patient") &&
    str r "status" != "entered-in-error").map fun r =>
    [("Document status", knownText (str r "status")), ("Recorded", str r "dateTime"),
     ("Scope", ccText (field r "scope")),
     ("Procedure / consent terms", "; ".intercalate ((arr (field r "provision") "code").map ccText)),
     ("Verification", "Verify the signed document against the planned procedure and site")]

/-- Today's recorded procedures supply operative evidence. Historical procedures
cannot masquerade as today's intra-operative record. No completion is inferred. -/
def surgicalRecordRows (today : String) (rs : List Json) (p : Json) : List (List (String × String)) :=
  (rs.filter fun r => resourceType r == "Procedure" && periopSubject p r &&
    !["entered-in-error", "not-done"].contains (str r "status") &&
    ((str r "performedDateTime").startsWith today ||
      (str (field r "performedPeriod") "start").startsWith today)).map fun r =>
    [("Procedure", ccText (field r "code")), ("Status", str r "status"),
     ("Start", let exact := str r "performedDateTime"
       if exact != "" then exact else str (field r "performedPeriod") "start"),
     ("End", str (field r "performedPeriod") "end"),
     ("Location", periopReferenceName rs (field r "location")),
     ("Team", "; ".intercalate ((arr r "performer").map fun performer =>
       periopReferenceName rs (field performer "actor"))),
     ("Recorded findings", "; ".intercalate ((arr r "note").map (str · "text")))]

/-- Optional read-only payloads are versioned by the supplied resource set.
They satisfy no physical-event attestation and introduce no new clinical guard. -/
def surgicalPayloads (today : String) (rs : List Json) (p : Json) : List InfoPayload :=
  let views := [("scheduleTasks", (surgicalCaseRows today rs p).map SurgicalCaseRow.cells),
    ("consultRequest", surgicalConsultRows rs p), ("consentDocument", surgicalConsentRows rs p),
    ("intraopRecord", surgicalRecordRows today rs p),
    ("anticoagulantList", (ofType "CarePlan" rs |>.filter (fun r => periopSubject p r && str r "status" == "active" && str r "title" == "Perioperative antiplatelet plan")).flatMap fun r =>
      [("Plan", str r "description")] :: (arr r "activity").map (fun activity =>
        [("Medication review", ccText (field (field activity "detail") "code")), ("Plan", str (field activity "detail") "description")]))]
  views.map fun (info, rows) =>
    { info, patient := patientIdOf p, artifactKey := "render.periop." ++ info
      artifact := "FHIR/perioperative/" ++ info, version := listVersion rs
      rows := rows.zipIdx.map fun (fields, slot) =>
        { id := info ++ "." ++ toString slot, slot, fields } }

/-- Matching bindings let the existing payload reader enforce version identity. -/
def surgicalBindings (payloads : List InfoPayload) : List ArtifactBinding :=
  payloads.map fun p => { key := p.artifactKey, artifact := p.artifact, version := p.version }

/-! ## Practitioner display identity -/

/-- Only named Practitioner records can label the signed-in clinician. No
resource ID, patient name or specialty is substituted for a missing name. -/
def clinicianRows (rs : List Json) : List ClinicianRow :=
  (ofType "Practitioner" rs).filterMap fun r =>
    let id := str r "id"
    let name := practitionerName r
    if id == "" || name == "" then none else some { id, name }

/-! ## Selected encounter context -/

/-- Keep the selected encounter for contextual fields, while retaining all
other record types. An unknown or foreign selection never becomes another visit. -/
def encounterRecords (ctx : FactsContext) (rs : List Json) (p : Json) : List Json :=
  match ctx.encounterId? with
  | none => rs
  | some id => rs.filter fun r => resourceType r != "Encounter" ||
      (id != "" && str r "id" == id && periopSubject p r)

/-- Explicit episode scope has priority. Otherwise a selected encounter's
standard class supplies its setting. A clinical role never implies pre-op. -/
def encounterKindOf (ctx : FactsContext) (rs : List Json) (p : Json) : Option String :=
  match ctx.encounterKind? with
  | some kind => some kind
  | none =>
    if ctx.encounterId?.isNone then none else
    (latestEncounter (encounterRecords ctx rs p)).bind fun enc =>
      let coding := field enc "class"
      if str coding "system" != "http://terminology.hl7.org/CodeSystem/v3-ActCode" then none else
      match str coding "code" with
      | "AMB" => some "ambulatory"
      | "EMER" => some "emergency"
      | "IMP" | "ACUTE" | "NONAC" => some "inpatient"
      | "SS" => if (ccText (first enc "type")).startsWith "Preoperative" then some "preop" else none
      | _ => none

/-- The facts the spec needs. -/
def factsOf (ctx : FactsContext) (rs : List Json) (p : Json) : Facts :=
  let age := ageYears (str p "birthDate") ctx.today
  let allergies := rs.filter isAllergy
  let meds := rs.filter isMedRequest
  let labs := labRows rs
  let visitDx := match latestEncounter (encounterRecords ctx rs p) with
    | some e => firstCode (first e "reasonCode")
    | none => ""
  let surgical := surgicalPayloads ctx.today rs p
  let ambulatory := Ambulatory.payloads ctx rs p
  let setting := encounterKindOf ctx rs p
  let preop := setting == some "preop" ||
    (setting.isNone && !(surgicalCaseRows ctx.today rs p).isEmpty)
  let supporting := (surgical.filter fun payload => payload.info != "scheduleTasks" || preop) ++
    (ambulatory.filter fun payload => payload.info != "scheduleTasks" || !preop)
  { patientId := patientIdOf p
    sourcePatientId? := some (str p "id")
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
    encounterKind? := encounterKindOf ctx rs p
    receipts := ctx.receipts
    infoPayloads? := some supporting
    artifactBindings? := some (supporting.map fun payload =>
      { key := payload.artifactKey, artifact := payload.artifact, version := payload.version })
    record := (if visitDx != "" then [("visitDiagnosis", visitDx)] else []) ++
      (let enc := (latestEncounter (encounterRecords ctx rs p)).getD .null
       let orders := (ofType "ServiceRequest" rs).filter fun r => str r "status" == "active" &&
         periopSubject p r && (referenced? rs (field r "encounter")).any (fun e => str e "id" == str enc "id")
       [("codeStatus", "; ".intercalate ((orders.filter fun r => hasCode (field r "code") "full-code" || hasCode (field r "code") "dnr").map (fun r => ccText (field r "code")))),
        ("isolation", "; ".intercalate ((orders.filter fun r => ["no-isolation", "contact-precautions", "droplet-precautions"].contains (firstCode (field r "code"))).map (fun r => ccText (field r "code")))),
        ("encounterName", ccText (first enc "type")), ("department", ccText (field enc "serviceType")),
        ("postoperativeDay", ((arr enc "extension").find? (fun e => str e "url" == "https://vgi-health.example/fhir/StructureDefinition/postoperative-day")).map (fun e => qtyText (Json.mkObj [("value", field e "valueInteger")])) |>.getD "")]).filter (fun pair => pair.2 != "") ++ ctx.record }

/-- The display rows. -/
def displayOf (ctx : FactsContext) (rs : List Json) (p : Json) : Display :=
  let dob := str p "birthDate"
  { asOf := ctx.today
    banner := bannerOf ctx.today (encounterRecords ctx rs p) p
    allergies := allergyRows rs
    meds := medRows rs
    vitals := newestFirst (·.date) ((rs.filter isVital).map vitalRow)
    labs := labRows rs
    problems := newestFirst (·.onset)
      ((ofType "Condition" rs |>.filter (fun r => verificationStatus r != "entered-in-error" && !isSocialCondition r)).map problemRow)
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
    observations := observationRows rs, labFlags := labFlags rs, labResults := labResultRows rs
    clinicians? := match clinicianRows rs with | [] => none | rows => some rows }

/-- Clinical chart rows must explicitly belong to the open patient. Shared
reference resources remain available for resolving chart authors and locations. -/
def chartResources (rs : List Json) (p : Json) : List Json :=
  rs.filter fun r =>
    if resourceType r == "Patient" then str r "id" == str p "id"
    else if ["Practitioner", "Organization", "Location", "Medication", "PractitionerRole"].contains (resourceType r) then true
    else [field r "subject", field r "patient", field r "for", field r "beneficiary"].any
      (fun ref => patientReferenceMatches ref p) ||
      (resourceType r == "Appointment" && (arr r "participant").any
        (fun a => patientReferenceMatches (field a "actor") p))

/-- The selected patient's chart resources, excluding unrelated patients and lists. -/
def chartResourcesOfBundle (b : Json) : List Json :=
  match (bundleResources b).find? (resourceType · == "Patient") with
  | none => []
  | some p => chartResources (bundleResources b) p

/-- A scoped chart row always comes from the supplied bundle. -/
theorem chartResource_mem {b r : Json} (h : r ∈ chartResourcesOfBundle b) : r ∈ bundleResources b := by
  unfold chartResourcesOfBundle at h
  split at h
  · contradiction
  · exact (List.mem_filter.mp h).1

/-- **Parse a FHIR bundle** into facts and display rows. Fails only if the
input is not a Bundle or has no Patient. -/
def parseBundle (ctx : FactsContext) (b : Json) : Except String (Facts × Display) :=
  if resourceType b != "Bundle" then .error "not a FHIR Bundle"
  else
    let rs := bundleResources b
    match rs.find? (resourceType · == "Patient") with
    | none => .error "bundle has no Patient"
    | some p => .ok (factsOf ctx (chartResourcesOfBundle b) p, displayOf ctx (chartResourcesOfBundle b) p)

/-! ## API record (needs `Lean.Json`) -/

/-- Select a dated persona List, then resolve exactly its membership. -/
def worldList (ctx : FactsContext) (rs : List Json) (code : String) : Option (List Json) :=
  let persona := (ctx.record.lookup "viewerPersona").getD ""
  ((ofType "List" rs).find? fun r => str r "status" == "current" &&
    dayOf (str r "date") == ctx.today && hasCode (field r "code") code &&
    (arr (field r "meta") "tag").any (fun t => str t "system" == "urn:vgi:world:realism" && str t "code" == persona)).map fun list =>
      (arr list "entry").filterMap fun entry => referenced? rs (field entry "item")

/-- Public extension text is source evidence, never a derived clinical status. -/
def worldExtension (r : Json) (key : String) : String :=
  ((arr r "extension").find? (fun e => str e "url" == "https://vgi-health.example/fhir/StructureDefinition/" ++ key)).map (str · "valueString") |>.getD ""

/-- Source patient references identify a chart row independently of name formatting. -/
def worldRowMatches (p r : Json) : Bool :=
  periopSubject p r || patientReferenceMatches (field r "for") p ||
    (arr r "participant").any (fun a => patientReferenceMatches (field a "actor") p)

/-- Pin the current chart's source rows while retaining the other source rows. -/
def selectedFirst (p : Json) (rows : List Json) : List Json :=
  rows.filter (worldRowMatches p) ++ rows.filter (fun r => !worldRowMatches p r)

/-- Explicit List membership supplies department queues independently of chart facts. -/
def worldQueuePayloads (ctx : FactsContext) (rs : List Json) (p : Json) : List InfoPayload :=
  let clinic := worldList ctx rs "clinic-schedule"
  let ed := worldList ctx rs "ed-census"
  let mine := worldList ctx rs "my-patients"
  let unit := worldList ctx rs "unit-census"
  let cases := worldList ctx rs "or-schedule"
  let consults := worldList ctx rs "consults"
  let basket := worldList ctx rs "inbasket"
  let scheduleCells := fun r =>
    let row := scheduleRow ctx.today rs r
    [("Time", row.time), ("Patient", row.patient), ("Age/sex", row.ageSex),
     ("Visit type", row.visitType), ("Status", row.status),
     ("Chief complaint", let reason := ccText (first r "reasonCode"); if reason == "" then str r "description" else reason),
     ("Provider", row.provider), ("Location", row.location)]
  let boardCells := fun r =>
    let row := boardRow ctx.today rs r
    [("Room", row.room), ("Patient", row.patient), ("Age/sex", row.ageSex),
     ("Chief complaint", row.complaint), ("Acuity", row.acuity), ("Arrival", row.arrival),
     ("RN", encounterParticipant rs r "PPRF"), ("Provider", row.provider),
     ("Labs", worldExtension r "pending-labs"), ("Imaging", worldExtension r "pending-imaging"),
     ("Disposition", worldExtension r "disposition"), ("Status", row.status)]
  let censusCells := fun r =>
    let row := boardRow ctx.today rs r
    [("Room", row.room), ("Patient", row.patient), ("Age/sex", row.ageSex),
     ("Diagnosis", row.complaint), ("Admitted", row.arrival),
     ("RN", encounterParticipant rs r "PPRF"), ("Attending", row.provider),
     ("Assignment", worldExtension r "nursing-assignment"), ("Status", row.status)]
  let caseCells := fun r =>
    [("Room", humanRef rs (first r "locationReference")), ("Start", str (field r "occurrencePeriod") "start"),
     ("Procedure", ccText (field r "code")), ("Patient", humanRef rs (field r "subject")),
     ("Surgeon", humanRef rs (first r "performer")), ("Status", "; ".intercalate ((arr r "note").map (str · "text")))]
  let messageCells := fun r =>
    [("Received", if resourceType r == "Communication" then str r "sent" else str r "authoredOn"),
     ("Patient", humanRef rs (field r (if resourceType r == "Communication" then "subject" else "for"))),
     ("Subject", if resourceType r == "Communication" then "; ".intercalate ((arr r "payload").map (str · "contentString")) else str r "description"),
     ("From", humanRef rs (field r (if resourceType r == "Communication" then "sender" else "requester"))),
     ("Priority", str r "priority"), ("Status", str r "status"),
     ("Folder", if resourceType r == "Communication" then "Patient Messages" else Ambulatory.taskFolder r)]
  let messages := selectedFirst p (basket.getD [])
  let results := messages.filter (fun r => resourceType r == "Task" && Ambulatory.taskFolder r == "Results")
  let refills := messages.filter (fun r => resourceType r == "Task" && Ambulatory.taskFolder r == "Rx Requests")
  let views : List (InfoId × Option (List (List (String × String)))) :=
    [("scheduleTasks", clinic.map (fun rows => (selectedFirst p rows).map scheduleCells)),
     ("orSchedule", cases.map (fun rows => (selectedFirst p rows).map caseCells)),
     ("edTrackBoard", ed.map (fun rows => (selectedFirst p rows).map boardCells)),
     ("shiftWorklist", mine.map (fun rows => (selectedFirst p rows).map censusCells)),
     ("unitCensus", unit.map (fun rows => (selectedFirst p rows).map censusCells)),
     ("consultList", consults.map (fun rows => (selectedFirst p rows).map fun r =>
       [("Received", str r "authoredOn"), ("Patient", humanRef rs (field r "subject")),
        ("Reason", ccText (first r "reasonCode")), ("Priority", str r "priority"),
        ("Requester", humanRef rs (field r "requester")), ("Location", humanRef rs (first r "locationReference")), ("Status", str r "status")])),
     ("inBasketFolders", basket.map fun _ => ["Results", "Rx Requests", "Patient Messages"].map fun folder =>
       [("Folder", folder), ("Count", toString ((messages.map messageCells).filter (fun cells => cells.lookup "Folder" == some folder)).length)]),
     ("inbasketItems", basket.map fun _ => messages.map messageCells),
     ("inBasketMessages", basket.map fun _ => (messages.filter (fun r => resourceType r == "Communication")).map messageCells),
     ("inBasketResults", basket.map fun _ => results.map messageCells),
     ("inBasketRxRequests", basket.map fun _ => refills.map messageCells)]
  let sources := [("scheduleTasks", clinic.getD []), ("orSchedule", cases.getD []),
    ("edTrackBoard", ed.getD []), ("shiftWorklist", mine.getD []), ("unitCensus", unit.getD []),
    ("consultList", consults.getD []), ("inBasketResults", results), ("inBasketRxRequests", refills)]
  views.filterMap fun (info, rows) => rows.bind fun rows => do
    let payload ← Ambulatory.payload p rs info rows true
    let hasSelected := ((sources.lookup info).getD []).any (worldRowMatches p)
    pure { payload with
      artifactKey := "world:" ++ info
      rows := payload.rows.zipIdx.map fun (row, index) =>
        if index == 0 && hasSelected then { row with id := "selected-chart" } else row }

/-- The directory contains identities and dated department rows, never chart captures. -/
def patientDirectory (ctx : FactsContext) (rs : List Json) (extra : List PatientChoice := []) : PatientDirectory :=
  let patients := (ofType "Patient" rs).map fun p =>
    { id := str p "id", name := displayName p, mrn := mrnOf p : PatientChoice }
  let patients := patients.map fun p =>
    { p with mrn := if p.mrn == "" then ((extra.find? (·.id == p.id)).map (·.mrn)).getD "" else p.mrn }
  let patients := patients ++ extra.filter (fun p => !patients.any (·.id == p.id))
  let payloads := worldQueuePayloads ctx rs (Json.mkObj [("id", .str "")])
  let sources : List (String × List Json) :=
    [("scheduleTasks", (worldList ctx rs "clinic-schedule").getD []),
     ("edTrackBoard", (worldList ctx rs "ed-census").getD []),
     ("shiftWorklist", (worldList ctx rs "my-patients").getD []),
     ("unitCensus", (worldList ctx rs "unit-census").getD []),
     ("orSchedule", (worldList ctx rs "or-schedule").getD []),
     ("consultList", (worldList ctx rs "consults").getD []),
     ("inBasketResults", ((worldList ctx rs "inbasket").getD []).filter (fun r => resourceType r == "Task" && Ambulatory.taskFolder r == "Results")),
     ("inBasketMessages", ((worldList ctx rs "inbasket").getD []).filter (fun r => resourceType r == "Communication")),
     ("inBasketRxRequests", ((worldList ctx rs "inbasket").getD []).filter (fun r => resourceType r == "Task" && Ambulatory.taskFolder r == "Rx Requests"))]
  let titles := [("scheduleTasks", "Schedule"), ("edTrackBoard", "Track Board"),
    ("shiftWorklist", "My Patients / MAR"), ("unitCensus", "Unit Census"),
    ("orSchedule", "OR Schedule"), ("consultList", "Consults"),
    ("inBasketMessages", "In Basket · Patient Messages"), ("inBasketResults", "In Basket · Results"), ("inBasketRxRequests", "In Basket · Rx Requests")]
  let activities := sources.filterMap fun (key, source) => do
    let payload ← payloads.find? (·.info == key)
    let rows := (source.zip payload.rows).map fun (r, row) =>
      let patient := ((patients.find? fun p => worldRowMatches (Json.mkObj [("resourceType", .str "Patient"), ("id", .str p.id)]) r).map (·.id)).getD ""
      { patient := patient, fields := row.fields, source? := some (resourceType r ++ "/" ++ str r "id") : PatientListRow }
    pure ({ info := key, title := (titles.lookup key).getD key, rows := rows } : PatientActivity)
  { patients := patients, activities := activities }

/-- Input of `facts`: a FHIR bundle and the context. -/
structure FactsInput where
  bundle : Json
  context : FactsContext
  /-- Shared dated list graph; chart parsing remains patient scoped. -/
  worldContext? : Option Json := none
  directoryOnly? : Option Bool := none
  extraPatients? : Option (List PatientChoice) := none
  deriving Lean.ToJson, Lean.FromJson

/-- `facts` on a parsed input. -/
def runFacts (i : FactsInput) : Except String FactsOutput :=
  if i.directoryOnly? == some true then .ok {
    facts := { (default : Facts) with patientDirectory? := some (patientDirectory i.context
      (bundleResources (i.worldContext?.getD i.bundle)) (i.extraPatients?.getD [])) }, display := Display.empty }
  else match i.worldContext? with
  | none => (parseBundle i.context i.bundle).map fun (f, d) => { facts := f, display := d }
  | some graph => do
    let p ← match (bundleResources i.bundle).find? (resourceType · == "Patient") with
      | some p => pure p
      | none => throw "bundle has no Patient"
    let all := bundleResources graph
    let selected := all.filter fun r =>
      let refs := [field r "subject", field r "patient", field r "for", field r "beneficiary"]
      refs.any (fun ref => patientReferenceMatches ref p) && resourceType r != "List"
    let support := all.filter fun r => ["Practitioner", "Organization", "Location"].contains (resourceType r)
    let original := bundleResources i.bundle
    let sameIdentity := fun a b => resourceType a == resourceType b && str a "id" == str b "id"
    let versioned := original.filter (fun r => str (field r "meta") "versionId" != "")
    let additions := (selected ++ support).filter (fun r => !versioned.any (sameIdentity r))
    let rs := (original.filter fun r => !additions.any (sameIdentity r)) ++ additions
    let positiveAllergy := rs.any fun r => isAllergy r && allergyActive r && !hasCode (field r "code") "716186003"
    let rs := if positiveAllergy then rs.filter (fun r => !isAllergy r || !hasCode (field r "code") "716186003") else rs
    let chart := Json.mkObj [("resourceType", .str "Bundle"), ("entry", .arr (rs.map (fun r => Json.mkObj [("resource", r)])).toArray)]
    let enc := latestEncounter (selected.filter (resourceType · == "Encounter"))
    let ctx := if i.context.encounterId?.isSome then i.context else { i.context with encounterId? := enc.map (str · "id") }
    let (f, d) ← parseBundle ctx chart
    let queues := worldQueuePayloads ctx all p
    let oldPayloads := (f.infoPayloads?.getD []).filter fun q => !queues.any (fun x => x.info == q.info)
    let enriched := { f with
      patientDirectory? := some (patientDirectory ctx all (i.extraPatients?.getD []))
      infoPayloads? := some (queues ++ oldPayloads)
      artifactBindings? := some (surgicalBindings queues ++ (f.artifactBindings?.getD []).filter (fun b => !queues.any (fun q => q.artifactKey == b.key))) }
    pure { facts := enriched, display := d }

end Ehr.Render.Fhir
