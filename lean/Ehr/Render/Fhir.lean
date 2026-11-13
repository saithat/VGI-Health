import Lean.Data.Json
import Ehr.Render.Json
import Ehr.Formulary
import Ehr.Core.Basics
import Ehr.Render.Ui
import Ehr.Render.Dated

/-!
Read FHIR bundles into patient facts and clinical display rows.
Patient and encounter checks exclude records outside the selected chart.
Missing fields stay blank or absent; source records supply the clinical values.
FhirProofs proves the named allergy, medication, weight and version claims.
Versions use a 52-bit digest of sorted resource IDs and versions; collisions
are possible. Reference ranges and care-gap rules are demo data.
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

/-- Normalize identity: resources without an ID use their fullUrl. Every resource
keeps its exact Bundle fullUrl for local reference resolution, and the Patient also
keeps its declared bundle alias. These private keys are never display values. -/
def entryResource (e : Json) : Json :=
  let r := field e "resource"
  match r with
  | .obj _ =>
    let normalized := if str r "id" == "" then r.setObjVal! "id" (.str (str e "fullUrl")) else r
    let withUrl := if str e "fullUrl" == "" then normalized
      else normalized.setObjVal! "_vgiBundleFullUrl" (.str (str e "fullUrl"))
    if resourceType withUrl == "Patient" && str e "fullUrl" != "" then
      withUrl.setObjVal! "_bundleFullUrl" (.str (str e "fullUrl")) else withUrl
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

/-- Stable identity shared by fixture and imported Patient records. This is
also the wristband payload: the Synthea identifier search token when present,
else the normalized source id. Import sources assign unrelated server ids. -/
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
    if systolic == diastolic || qtyText s == "" || qtyText d == "" || qtyUnitText s == "" ||
        qtyUnitText s != qtyUnitText d || str s "code" != str d "code" then none
    else some (str s "comparator" ++ qtyText s ++ "/" ++ str d "comparator" ++ qtyText d, qtyUnitText s)

/-- The value of an observation as text, its unit, and its value × 100.
Blood pressure (components) reads `"128/82"`. -/
def obsValue (r : Json) : String × String × Option Nat :=
  let q := field r "valueQuantity"
  if q != .null then (qtyText q, qtyUnitText q, qtyScaled q 2)
  else
    let comps := arr r "component"
    if !comps.isEmpty then
      match observationBpValue? r with
      | some (value, unit) => (value, unit, none)
      | none =>
        let values := comps.map fun component =>
          let quantity := field component "valueQuantity"
          let label := ccText (field component "code")
          let value := if quantity != .null then str quantity "comparator" ++ qtyText quantity
            else if field component "valueCodeableConcept" != .null then ccText (field component "valueCodeableConcept")
            else if str component "valueString" != "" then str component "valueString" else
              match field component "valueInteger", field component "valueBoolean" with
              | .num n, _ => toString n
              | _, .bool b => if b then "Yes" else "No"
              | _, _ => ""
          let unit := qtyUnitText quantity
          (if label == "" then "Component" else label) ++ ": " ++
            (if value == "" then "Not recorded" else value) ++ (if unit == "" then "" else " " ++ unit)
        ("; ".intercalate values, "", none)
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
in Chart History and the selected-analyte trend. -/
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
unrelated analytes remain in Chart History, not the selected-result report. -/
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
    [("inboxFolders", if tasks.isEmpty then [] else ["Results", "Rx Requests", "Patient Messages"].map fun folder =>
        [("Folder", folder), ("Count", toString (messages.filter (·.folder == folder)).length)]),
     ("scheduleTasks", (scheduleRows ctx rs p).map fun row =>
        [("time", row.time), ("patient", row.patient), ("Age / sex", row.ageSex),
         ("Visit type", row.visitType), ("status", row.status), ("Chief complaint", row.complaint),
         ("Provider", row.provider), ("Location", row.location)]),
     ("inboxItems", messages.map fun row =>
        [("received", row.received), ("patient", row.patient), ("subject", row.subject),
         ("sender", row.sender), ("priority", row.priority), ("status", row.status), ("Folder", row.folder)]),
     ("inboxResults", (messages.filter (·.folder == "Results")).map fun row =>
        [("received", row.received), ("patient", row.patient), ("subject", row.subject),
         ("sender", row.sender), ("priority", row.priority), ("status", row.status)]),
     ("inboxRxRequests", (messages.filter (·.folder == "Rx Requests")).map fun row =>
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

/-! ## Acute-care supporting information

These are read-only projections of supplied resources. Selection uses exact
resource references; no scan, signature, due time or clinical event is created.
The record adapter may supply selectedEncounterId and selectedMedicationRequestId.
They are selectors, never visible clinical columns or evidence of completion. -/

/-- Match a FHIR reference to the exact supplied resource, including fixture URNs. -/
def acuteRefersTo (reference resource : Json) : Bool :=
  let id := str resource "id"
  let ref := str reference "reference"
  id != "" && ref != "" && (ref == id || ref == resourceType resource ++ "/" ++ id ||
    ref == str resource "_vgiBundleFullUrl")

/-- Encounter links differ by resource: direct, administration context, or document context. -/
def acuteInEncounter (resource encounter : Json) : Bool :=
  acuteRefersTo (field resource "encounter") encounter ||
  acuteRefersTo (field resource "context") encounter ||
  (arr (field resource "context") "encounter").any (acuteRefersTo · encounter)

/-- An exact order link can supply missing administration context, but cannot
override an explicitly different or unresolved administration context. -/
def acuteAdministrationMatchesOrder (encounter order administration : Json) : Bool :=
  acuteRefersTo (field administration "request") order &&
    (field administration "context" == .null ||
      acuteRefersTo (field administration "context") encounter)

/-- Patient-scoped sources; another patient's records never enter these panels. -/
def acutePatientResources (rs : List Json) (patient : Json) : List Json :=
  rs.filter fun r => acuteRefersTo (field r "subject") patient ||
    acuteRefersTo (field r "patient") patient || acuteRefersTo (field r "for") patient

/-- Observation and short-stay bed encounters use the same acute chart context. -/
def acuteCareClass (code : String) : Bool :=
  ["EMER", "IMP", "ACUTE", "OBSENC", "SS", "emergency", "inpatient", "observation"].contains code

/-- A selected encounter or ongoing acute stay needs exact encounter resolution. -/
def acuteSelectionRequired (ctx : FactsContext) (rs : List Json) (patient : Json) : Bool :=
  ctx.encounterId?.isSome || (ctx.record.lookup "selectedEncounterId").isSome ||
    (ofType "Encounter" (acutePatientResources rs patient)).any (fun encounter =>
      str encounter "status" == "in-progress" && acuteCareClass (str (field encounter "class") "code"))

/-- An explicit encounter selector is authoritative. Otherwise use only an
ongoing acute encounter for this patient, never a historical clinic visit.
Ambiguous latest encounters require selection instead of depending on bundle order. -/
def acuteEncounter (ctx : FactsContext) (rs : List Json) (patient : Json) : Option Json :=
  let encounters := (ofType "Encounter" (acutePatientResources rs patient)).filter
    (fun encounter => str encounter "status" != "entered-in-error")
  match ctx.encounterId?.orElse (fun _ => ctx.record.lookup "selectedEncounterId") with
  | some id => encounters.find? (fun r => str r "id" == id)
  | none => do
    let ongoing := encounters.filter fun r => str r "status" == "in-progress" &&
      acuteCareClass (str (field r "class") "code")
    let newest ← latestBy (fun r => str (field r "period") "start") ongoing
    let [only] := ongoing.filter (fun r => str (field r "period") "start" == str (field newest "period") "start") | none
    some only

/-- An explicit or ongoing acute encounter determines chart context. Missing or
ambiguous acute selection cannot silently become a different historical visit. -/
def selectedChartEncounter (ctx : FactsContext) (rs : List Json) (patient : Json) : Option Json :=
  let patientRecords := acutePatientResources rs patient
  if acuteSelectionRequired ctx rs patient
  then acuteEncounter ctx rs patient
  else latestEncounter patientRecords

/-- The medication task must name its exact order. A same-drug order is not a
substitute, even if it is the only current order in the supplied chart. -/
def acuteMedicationRequest (ctx : FactsContext) (rs : List Json) (patient : Json) : Option Json := do
  let id ← ctx.record.lookup "selectedMedicationRequestId"
  let order ← (ofType "MedicationRequest" (acutePatientResources rs patient)).find?
    (fun r => str r "id" == id && str r "status" != "entered-in-error")
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
  | "on-hold" =>
    if ((arr r "statusReason").map firstCode).contains "delayed" then "Delayed" else "Held"
  | "in-progress" => "In progress"
  | other => other

/-- Recorded dose, route, site and time come only from MedicationAdministration.
Held/refused records do not imply that their documented dose was given. -/
def acuteAdministrationRow (r : Json) : List (String × String) :=
  let dosage := field r "dosage"
  [("Medication", ccText (field r "medicationCodeableConcept")),
   ("Recorded dose", qtyText (field dosage "dose")),
   ("Unit", qtyUnitText (field dosage "dose")),
   ("Route", ccText (field dosage "route")), ("Site", ccText (field dosage "site")),
   ("Recorded time", let actual := str r "effectiveDateTime"
     if actual != "" then actual else str (field r "effectivePeriod") "start"),
   ("Status", acuteAdministrationStatus r),
   ("Reason", "; ".intercalate ((arr r "statusReason").map ccText))]

/-- A lab value carries its recorded flag/range/time. No clinical threshold is
inferred here and unlike units are never joined into a computed trend. -/
def acuteLabRow (r : Json) : List (String × String) :=
  let unit := qtyUnitText (field r "valueQuantity")
  [("Test", ccText (field r "code")), ("Value", labResultValue r), ("Unit", unit),
   ("Flag", labSourceFlags r),
   ("Range", "; ".intercalate ((arr r "referenceRange").map (labRangeText unit))),
   ("Recorded", obsWhen r), ("Status", str r "status")]

/-- A component retains its own value, unit, range and interpretation and its report time. -/
def acuteLabComponentRow (report component : Json) : List (String × String) :=
  (acuteLabRow component).map fun (key, value) =>
    (key, if key == "Test" then ccText (field report "code") ++ " • " ++ value
      else if key == "Recorded" then obsWhen report
      else if key == "Status" then str report "status" else value)

/-- Full reports and their component results remain separate, complete rows. -/
def acuteLabRowsFor (report : Json) : List (List (String × String)) :=
  acuteLabRow report :: (arr report "component").map (acuteLabComponentRow report)

/-- Glucose/coagulation selection also recognizes a coded component of a report. -/
def acuteLabsByCodes (reports : List Json) (codes : List String) : List (List (String × String)) :=
  reports.flatMap fun report =>
    if codes.any (hasCode (field report "code")) then acuteLabRowsFor report else
      ((arr report "component").filter fun component => codes.any (hasCode (field component "code"))).map
        (acuteLabComponentRow report)

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
        [("Vital sign", (vitalRow r).name), ("Value", value),
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
      str r "status" != "entered-in-error" &&
      (acuteEncounter ctx rs patient).any (fun encounter =>
        acuteAdministrationMatchesOrder encounter order r)).map acuteAdministrationRow

/-- A participant is assigned only from its explicit role coding. -/
def acuteParticipant (encounter : Json) (role : String) : String :=
  "; ".intercalate (((arr encounter "participant").filter fun participant =>
    (arr participant "type").any (hasCode · role)).map fun participant =>
      str (field participant "individual") "display")

/-! ### Acute imaging reports and study availability -/

/-- Classification uses an explicit service category, never a test-name guess. -/
def acuteCategory (r : Json) (codes : List String) : Bool :=
  (arr r "category").any fun category =>
    codes.any (fun code => hasCode category code || (ccText category).toLower == code.toLower)

/-- An imaging order and a radiology report are different source resources. -/
def acuteImagingOrder (r : Json) : Bool :=
  resourceType r == "ServiceRequest" && acuteCategory r ["imaging", "RAD", "radiology"] &&
    !["entered-in-error", "revoked"].contains (str r "status")

/-- A report can identify its imaging service directly or through an exact order link. -/
def acuteImagingReport (sources : List Json) (r : Json) : Bool :=
  resourceType r == "DiagnosticReport" && !["entered-in-error", "cancelled"].contains (str r "status") &&
    (acuteCategory r ["RAD", "imaging", "radiology"] ||
      (!acuteCategory r ["LAB", "laboratory"] && (arr r "basedOn").any (fun reference => sources.any (fun order =>
        acuteImagingOrder order && acuteRefersTo reference order))))

/-- Images being available does not imply that a radiologist's report is final. -/
def acuteImagingStudy (r : Json) : Bool :=
  resourceType r == "ImagingStudy" && !["entered-in-error", "cancelled"].contains (str r "status")

/-- Use a supplied clinician/organization name, never a logical reference as a name. -/
def acuteReferenceName (sources : List Json) (reference : Json) : String :=
  let supplied := str reference "display"
  if supplied != "" then supplied else
  match sources.filter (acuteRefersTo reference) with
  | [resource] => if resourceType resource == "Organization" then str resource "name"
    else if resourceType resource == "Practitioner"
      then displayName resource else ""
  | _ => ""

/-- Only inline plain-text attachments are decoded. Other attachments remain
explicitly unavailable; no network fetch or fake viewer action is added. -/
def acuteReportAttachment (attachment : Json) : String :=
  let title := str attachment "title"
  let contentType := str attachment "contentType"
  let name := if title == "" then "Report attachment" else title
  if (((contentType.splitOn ";").headD "").trimAscii.toString.toLower) == "text/plain"
  then name ++ ": " ++ noteAttachmentText attachment
  else name ++ (if contentType == "" then "" else " (" ++ contentType ++ ")") ++ " — preview unavailable"

/-- A report retains its full conclusion, coded impressions, explicitly linked
patient observations and inline report text. No conclusion is inferred from images. -/
def acuteImagingText (sources : List Json) (report : Json) : String :=
  let findings := (arr report "result").flatMap fun reference =>
    (sources.filter fun resource => resourceType resource == "Observation" &&
      !["entered-in-error", "cancelled"].contains (str resource "status") && acuteRefersTo reference resource).flatMap fun result =>
        (labResultRowsFor result).map fun row =>
          row.name ++ ": " ++ row.value ++ (if row.unit == "" then "" else " " ++ row.unit)
  "\n".intercalate (([str report "conclusion"] ++ (arr report "conclusionCode").map ccText ++
    findings ++ (arr report "presentedForm").map acuteReportAttachment).filter (· != ""))

/-- Study details preserve acquisition status, modality and date separately from
the report status. A report may explicitly reference more than one study. -/
def acuteStudyFields (study : Json) : List (String × String) :=
  [("Study", str study "description"), ("Image status", str study "status"),
   ("Acquired", str study "started"),
   ("Modality", "; ".intercalate ((arr study "modality").map fun coding =>
      let label := str coding "display"; if label == "" then str coding "code" else label))]

/-- The chart contains full patient imaging history. Current encounter context is
identified by an exact link; unrelated patients and invalidated reports are excluded. -/
def acuteImagingRows (ctx : FactsContext) (rs : List Json) (patient : Json) : List (List (String × String)) :=
  let sources := acutePatientResources rs patient
  let reports := sources.filter (acuteImagingReport sources)
  let studies := sources.filter acuteImagingStudy
  let context := fun resource =>
    if field resource "encounter" == .null then "Encounter not recorded"
    else match selectedChartEncounter ctx rs patient with
      | none => "Encounter not selected"
      | some selected => if acuteInEncounter resource selected then "Selected encounter" else "Another encounter"
  let reportRows := reports.map fun report =>
    let interpreters := (arr report "resultsInterpreter").map (acuteReferenceName rs)
    let author := "; ".intercalate ((if interpreters.any (· != "") then interpreters
      else (arr report "performer").map (acuteReferenceName rs)).filter (· != ""))
    let linked := studies.filter fun study => (arr report "imagingStudy").any (acuteRefersTo · study)
    [("Title", let title := ccText (field report "code"); if title == "" then "Radiology report" else title),
     ("Type", "Radiology report"), ("Date", obsWhen report), ("Reported", str report "issued"),
     ("Author", author), ("Status", str report "status"), ("Encounter", context report),
     ("Text", acuteImagingText sources report)] ++ linked.flatMap acuteStudyFields
  let studyRows := (studies.filter fun study =>
    !reports.any (fun report => (arr report "imagingStudy").any (acuteRefersTo · study))).map fun study =>
      [("Title", let title := str study "description"; if title == "" then "Imaging study" else title),
       ("Type", "Imaging study"), ("Date", str study "started"),
       ("Author", "; ".intercalate (((arr study "interpreter").map (acuteReferenceName rs)).filter (· != ""))),
       ("Status", str study "status"), ("Encounter", context study)] ++ acuteStudyFields study
  newestFirst (fun row => (row.lookup "Date").getD "") (reportRows ++ studyRows)

/-- Board availability reports source milestones, not completion of every order. -/
def acuteImagingAvailability (sources : List Json) (lookupSources : List Json := sources) : String :=
  let reports := sources.filter (acuteImagingReport lookupSources)
  if reports.any (fun r => ["final", "amended", "corrected", "appended"].contains (str r "status"))
    then "Report available"
  else if reports.any (fun r => ["partial", "preliminary"].contains (str r "status")) then "Preliminary report"
  else if sources.any (fun r => acuteImagingStudy r && str r "status" == "available") then "Images available"
  else if sources.any (fun r => acuteImagingOrder r && str r "status" == "active") then "Ordered" else ""

/-- A supplied active ED encounter is one board row. Missing assignments, LOS
and disposition remain empty; no default acuity or progress is invented. -/
def acuteBoardRows (ctx : FactsContext) (rs : List Json) (patient : Json) : List (List (String × String)) :=
  let encounters := (ofType "Encounter" (acutePatientResources rs patient)).filter fun encounter =>
    ["EMER", "emergency"].contains (str (field encounter "class") "code") &&
    ["arrived", "triaged", "in-progress", "onleave"].contains (str encounter "status")
  let selected := fun encounter => (acuteEncounter ctx rs patient).any
    (fun current => str encounter "id" == str current "id")
  -- The selected encounter is first for orientation. Opening remains attached
  -- to its separate exact-selector summary, never another encounter's board row.
  ((encounters.filter selected) ++ (encounters.filter fun encounter => !selected encounter)).map fun encounter =>
    let sources := (acutePatientResources rs patient).filter fun r =>
      acuteRefersTo (field r "encounter") encounter
    [("Room", (encRow encounter).location), ("Patient", displayName patient),
     ("Age/sex", (if str patient "birthDate" == "" then "Age not recorded"
       else toString (ageYears (str patient "birthDate") ctx.today)) ++ " / " ++ sexOf patient),
     ("Chief complaint", ccText (first encounter "reasonCode")),
     ("Acuity", ccText (field encounter "priority")), ("Arrival", str (field encounter "period") "start"),
     ("LOS", " ".intercalate ([qtyText (field encounter "length"), qtyUnitText (field encounter "length")].filter (· != ""))),
     ("RN", acuteParticipant encounter "RN"), ("Provider", acuteParticipant encounter "ATND"),
     ("Labs", if sources.any isLab then "Results available" else ""),
     ("Imaging", acuteImagingAvailability sources (acutePatientResources rs patient)),
     ("Disposition", ccText (field (field encounter "hospitalization") "dischargeDisposition")),
     ("Status", str encounter "status")]

/-- A shift queue uses exact patient and encounter bindings, not a prior admission. -/
def acuteTasks (ctx : FactsContext) (rs : List Json) (patient : Json) : List Json :=
  match acuteEncounter ctx rs patient with
  | none => []
  | some encounter => (ofType "Task" (acutePatientResources rs patient)).filter fun task =>
      !["entered-in-error", "cancelled"].contains (str task "status") && acuteInEncounter task encounter

/-- A patient-list row is bound to the selected chart, not the first task.
The count includes only source tasks with an explicit open status. -/
def acuteCensusRows (ctx : FactsContext) (rs : List Json) (patient : Json) : List (List (String × String)) :=
  match acuteEncounter ctx rs patient with
  | none => []
  | some encounter =>
    let openTasks := (acuteTasks ctx rs patient).filter fun task =>
      ["draft", "requested", "received", "accepted", "ready", "in-progress", "on-hold"].contains (str task "status")
    [[("Room", (encRow encounter).location), ("Patient", displayName patient),
      ("Age/sex", (if str patient "birthDate" == "" then "Age not recorded"
        else toString (ageYears (str patient "birthDate") ctx.today)) ++ " / " ++ sexOf patient),
      ("RN", acuteParticipant encounter "RN"), ("Attending", acuteParticipant encounter "ATND"),
      ("Reason for visit", ccText (first encounter "reasonCode")),
      ("Open tasks", toString openTasks.length)]]

/-- The worklist uses supplied Task dates and states, never a completion mark
from visiting a screen. Business status remains distinct from record status. -/
def acuteWorklistRows (ctx : FactsContext) (rs : List Json) (patient : Json) : List (List (String × String)) :=
  (acuteTasks ctx rs patient).map fun task =>
    [("Due", str (field (field task "restriction") "period") "end"),
     ("Patient", displayName patient),
     ("Task", let description := str task "description"
       if description != "" then description else ccText (field task "code")),
     ("Priority", str task "priority"), ("Status", str task "status"),
     ("Owner", str (field task "owner") "display")] ++
    (let business := ccText (field task "businessStatus")
      if business == "" then [] else [("Task status", business)])

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
  let time := (values.lookup "Recorded time").getD ""
  if str administration "status" == "entered-in-error" ||
      (!acuteMarDay ctx time && str administration "status" != "in-progress") then none else
  some (acuteHourColumn time,
    " · ".intercalate ([acuteAdministrationStatus administration,
      if time.length ≥ 16 then sub time 11 5 else "Time not recorded",
      " ".intercalate ([(values.lookup "Recorded dose").getD "", (values.lookup "Unit").getD ""].filter (· != "")),
      (values.lookup "Route").getD "", (values.lookup "Site").getD "",
      (values.lookup "Reason").getD ""].filter (· != "")))

/-- An order-linked Task can supply a recorded due time/status. Task completion
is not an actual dose, and an execution start never substitutes for a due time. -/
def acuteMarTaskEvents (ctx : FactsContext) (sources : List Json) (order : Json) : List (String × String) :=
  let encounter := sources.find? fun resource => resourceType resource == "Encounter" &&
    acuteRefersTo (field order "encounter") resource
  ((ofType "Task" sources).filter fun task => str task "intent" == "order" &&
    !["cancelled", "entered-in-error"].contains (str task "status") &&
    acuteRefersTo (field task "focus") order && encounter.any (acuteInEncounter task)).filterMap fun task =>
      let due := str (field (field task "restriction") "period") "end"
      if !acuteMarDay ctx due || due.length < 16 then none else
        let business := ccText (field task "businessStatus")
        let label := if ["due", "overdue", "future", "scheduled"].contains business.toLower
          then business else "Task " ++ str task "status"
        some (due, label ++ " · " ++ sub due 11 5)

/-- An order has only explicit timing events, recorded due tasks and referenced
actual records. A Task status never becomes a Given administration. -/
def acuteMarCells (ctx : FactsContext) (sources : List Json) (order : Json) : List (String × String) :=
  let instruction := first order "dosageInstruction"
  let tasks := acuteMarTaskEvents ctx sources order
  let encounter := sources.find? fun resource => resourceType resource == "Encounter" &&
    acuteRefersTo (field order "encounter") resource
  ((arr (field instruction "timing") "event").filterMap fun event => match event with
      | .str time => if acuteMarDay ctx time && !tasks.any (·.1 == time) then
          some (acuteHourColumn time, "Scheduled · " ++ (if time.length ≥ 16 then sub time 11 5 else time))
        else none
      | _ => none) ++ tasks.map (fun (time, status) => (acuteHourColumn time, status)) ++
    ((ofType "MedicationAdministration" sources).filter fun administration =>
      encounter.any (fun current =>
        acuteAdministrationMatchesOrder current order administration)).filterMap (acuteAdminCell ctx)

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

/-- FHIR permits either a Boolean or a coded PRN condition. A supplied Boolean
keeps its explicit meaning when a malformed source contains both choices. -/
def acutePrnInstruction (instruction : Json) : Bool :=
  match field instruction "asNeededBoolean" with
  | .bool value => value
  | .null => match field instruction "asNeededCodeableConcept" with
    | .obj _ => true
    | _ => false
  | _ => false

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
       ("Route", ccText (field instruction "route")), ("Instructions", sigText order)] ++
       (let reason := ccText (field instruction "asNeededCodeableConcept")
        if acutePrnInstruction instruction && field instruction "asNeededBoolean" == .null && reason != ""
          then [("PRN indication", reason)] else []) ++
       [("Category", if acutePrnInstruction instruction then "PRN"
         else if (arr (field instruction "timing") "event").isEmpty then "Not recorded" else "Scheduled"),
       ("Order status", str order "status")] ++ times.flatMap fun time =>
         let records := cells.filter (·.1 == time)
         if records.isEmpty then [(time, "")] else records) ++
    unmatched.filterMap fun administration => do
      let cell ← acuteAdminCell ctx administration
      let values := acuteAdministrationRow administration
      some ([("Medication", (values.lookup "Medication").getD ""),
        ("Dose", (values.lookup "Recorded dose").getD "" ++ " " ++ (values.lookup "Unit").getD ""),
        ("Route", (values.lookup "Route").getD ""), ("Instructions", ""),
        ("Category", "Recorded administration"), ("Order status", "Order unavailable in this encounter")] ++
        times.map fun time => (time, if cell.1 == time then cell.2 else ""))

/-- Nursing flowsheets include vitals, examinations, assessments and I&O.
Laboratory data remains in Results, not silently relabeled as a bedside assessment. -/
def acuteFlowsheetObservation (r : Json) : Bool :=
  isObservation r && !isLab r &&
    (categoryCodes r).any (["vital-signs", "exam", "survey"].contains ·)

/-- Typed bedside values preserve raw text, units, comparators and report components. -/
def acuteFlowsheetReadings (report : Json) : List (String × ObservationRow) :=
  let reading := fun (source : Json) (name : String) =>
    let point : ObservationRow :=
      { measure := name
        value := labResultValue source
        unit := qtyUnitText (field source "valueQuantity")
        time := obsWhen report
        status := str report "status" }
    (firstCode (field source "code"), point)
  let components := arr report "component"
  let ownValue := (["valueQuantity", "valueString", "valueCodeableConcept", "valueBoolean",
    "valueInteger", "valueRange", "valueRatio", "valueDateTime", "valueTime", "valuePeriod",
    "valueSampledData", "dataAbsentReason"] : List String).any (fun key => field report key != .null)
  (if components.isEmpty || ownValue then [reading report (ccText (field report "code"))] else []) ++
    components.map fun component => reading component
      (ccText (field report "code") ++ " • " ++ ccText (field component "code"))

/-- Current-encounter flowsheet observations share a recorded time axis.
All values at a shared timestamp survive; blanks are never filled with zero. -/
def acuteFlowsheetRows (ctx : FactsContext) (rs : List Json) (patient : Json) : List (List (String × String)) :=
  match acuteEncounter ctx rs patient with
  | none => []
  | some encounter =>
    let observations := ((acutePatientResources rs patient).filter fun r =>
      acuteFlowsheetObservation r && acuteInEncounter r encounter).flatMap acuteFlowsheetReadings
    let measures := (observations.map fun (code, reading) => (code, reading.measure, reading.unit)).eraseDups
    let times := ((observations.map fun (_, reading) => reading.time).eraseDups).mergeSort (· ≤ ·)
    measures.map fun (code, measure, unit) =>
      let readings := observations.filter fun (otherCode, reading) =>
        code == otherCode && measure == reading.measure && unit == reading.unit
      [("Measure", measure), ("Unit", unit)] ++ times.map fun time =>
        (acuteTimeColumn time, "; ".intercalate ((readings.filter (fun (_, reading) => reading.time == time)).map fun (_, reading) =>
          reading.value ++ (if reading.status == "" || reading.status == "final" then "" else " · " ++ reading.status)))

/-- A generic letter is not a nursing handoff. Local handoff codes and explicit
nursing/provider transfer summaries are recognized without inspecting prose. -/
def acuteHandoffDocument (r : Json) : Bool :=
  documentVisible r && (hasCode (field r "type") "handoff" ||
    (codings (field r "type")).any fun coding => str coding "system" == "http://loinc.org" &&
      ["68482-9", "18761-7"].contains (str coding "code"))

/-- A single report needs no transport heading; all attachment text/titles survive. -/
def acuteHandoffText (r : Json) : String :=
  match arr r "content" with
  | [content] =>
    let attachment := field content "attachment"
    let title := str attachment "title"
    (if title == "" then "" else title ++ "\n") ++ noteAttachmentText attachment
  | _ => (noteRow r).text

/-- Supporting panels are sourced from this patient's chart. An absent source
produces no rows; absent clinical data does not become a normal result. -/
def acuteSupportingRows (ctx : FactsContext) (rs : List Json) (patient : Json) :
    List (InfoId × List (List (String × String))) :=
  let sources := acutePatientResources rs patient
  let labs := (sources.filter isLab).filter fun r =>
    (acuteEncounter ctx rs patient).any (acuteRefersTo (field r "encounter"))
  let acuteCare := (acuteEncounter ctx rs patient).any fun encounter =>
    acuteCareClass (str (field encounter "class") "code")
  let unresolved := acuteSelectionRequired ctx rs patient && (acuteEncounter ctx rs patient).isNone
  let labCodes := acuteLabsByCodes labs
  let prnOrders := (ofType "MedicationRequest" sources).filter fun r =>
    str r "status" != "entered-in-error" &&
    (acuteEncounter ctx rs patient).any (acuteInEncounter r) &&
    acutePrnInstruction (first r "dosageInstruction")
  let administrations := (ofType "MedicationAdministration" sources).filter fun r =>
    str r "status" != "entered-in-error" &&
    (acuteEncounter ctx rs patient).any (fun encounter =>
      prnOrders.any (fun order => acuteAdministrationMatchesOrder encounter order r))
  let handoffs := (ofType "DocumentReference" sources).filter fun r =>
    acuteHandoffDocument r && (acuteEncounter ctx rs patient).any (acuteInEncounter r)
  [("triageSummary", acuteTriageRows ctx rs patient),
   ("edTrackBoard", acuteBoardRows ctx rs patient),
   ("unitCensus", acuteCensusRows ctx rs patient),
   ("imaging", acuteImagingRows ctx rs patient),
   ("shiftWorklist", acuteCensusRows ctx rs patient),
   ("shiftTasks", acuteWorklistRows ctx rs patient),
   ("marSchedule", acuteMarRows ctx rs patient),
   ("flowsheetHistory", acuteFlowsheetRows ctx rs patient),
   ("labResults", if acuteCare then labs.flatMap acuteLabRowsFor else []),
   ("resultTrend", if acuteCare || unresolved then (newestFirst obsWhen (sources.filter isLab)).flatMap acuteLabRowsFor else []),
   ("vitals", if acuteCare then acuteVitalRows ctx rs patient else []),
   ("marDoseDetails", acuteDoseRows ctx rs patient),
   ("glucoseTrend", labCodes ["2339-0", "2345-7", "41653-7", "14743-9"]),
   ("coagLabs", labCodes ["6301-6", "5902-2", "3173-2", "14979-9"]),
   ("prnHistory", administrations.map acuteAdministrationRow),
   ("handoffSummary", handoffs.map fun r =>
      let note := noteRow r
      [("Report", note.title), ("Author", note.author), ("Recorded", note.date),
       ("Text", acuteHandoffText r), ("Status", note.status)])]

/-- Selection and displayed day are part of a projection's data version. A
different task/encounter cannot reuse an identical-bundle projection version. -/
def acuteProjectionVersion (ctx : FactsContext) (rs : List Json) : Nat :=
  let selection := fun key => key ++ ":" ++ match ctx.record.lookup key with
    | none => "absent" | some value => "selected:" ++ value
  versionDigest (((rs.map (fun resource => versionKey resource ++ "|" ++ str resource "_vgiBundleFullUrl")) ++
    ["acute-projection:v7", "day:" ++ ctx.today,
    selection "selectedEncounterId", selection "selectedMedicationRequestId",
    "encounter:" ++ ctx.encounterId?.getD "absent"]).mergeSort (· ≤ ·))

/-- Banner encounter/location/attending follow the selected chart, not whichever
resource happens to have the latest date. A primary nurse is not an attending. -/
def bannerFor (ctx : FactsContext) (rs : List Json) (patient : Json) : BannerInfo :=
  let base := bannerOf ctx.today rs patient
  let encounter := (selectedChartEncounter ctx rs patient).getD .null
  { base with encounterClass := str (field encounter "class") "code"
              attending := acuteParticipant encounter "ATND"
              location := (encRow encounter).location }

/-- Bind supplied acute projections to this bundle and selection's digest. Current
results/vitals stay explicitly empty when absent, without historical fallback.
These read-only panels supply no temporal event evidence or human captures. -/
def acutePayloads (ctx : FactsContext) (rs : List Json) (patient : Json) : List InfoPayload :=
  let acuteCare := (acuteEncounter ctx rs patient).any fun encounter =>
    acuteCareClass (str (field encounter "class") "code")
  let invalidSelection := acuteSelectionRequired ctx rs patient &&
    (acuteEncounter ctx rs patient).isNone
  ((acuteSupportingRows ctx rs patient).filter (fun (info, rows) =>
    !rows.isEmpty || (["labResults", "resultTrend", "vitals"].contains info && (acuteCare || invalidSelection)))).map fun (info, rows) =>
    { info, patient := patientIdOf patient, artifactKey := "acute:" ++ info
      artifact := "acute-chart:" ++ patientIdOf patient, version := acuteProjectionVersion ctx rs
      rows := rows.zipIdx.map fun (fields, slot) => { id := info ++ ":" ++ toString slot, slot, fields } }

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


/-- Explicit critical source flag and route; ordinary abnormal values do not
invent recipients. The route clock uses the episode's simulation-minute scale.
Production laboratories must supply their authenticated delivery record. -/
def criticalTickets (rs : List Json) (p : Json) : List Multi.Critical.Ticket :=
  rs.filterMap fun r => do
    if resourceType r != "Observation" || !["final", "amended", "corrected"].contains (str r "status") then none else do
    if !(arr r "interpretation").any (fun i => (arr i "coding").any
        (fun c => ["HH", "LL", "AA"].contains (str c "code"))) then none else do
    let route := ((arr r "extension").find? (fun e => str e "url" == "https://vgi.health/fhir/StructureDefinition/critical-result-route")).getD Json.null
    let entries := arr route "extension"
    let value := fun key => (entries.find? (fun e => str e "url" == key)).getD Json.null
    let responsible := str (value "responsible") "valueString"
    let covering := str (value "covering") "valueString"
    if str r "id" == "" then none else
    some { result := {
      id := str r "id", patient := patientIdOf p,
      label := "Critical result: " ++ ccText (field r "code") ++ " · " ++
        (if str r "valueString" != "" then str r "valueString" else qtyText (field r "valueQuantity")),
      responsible, covering, source? := some r.compress,
      availableAt := ((field (value "availableAt") "valueInteger").getNat?).toOption.getD 0,
      limit := ((field (value "limit") "valueInteger").getNat?).toOption.getD 30 } }

/-- The facts the spec needs. -/
def baseFactsOf (ctx : FactsContext) (rs : List Json) (p : Json) : Facts :=
  let age := ageYears (str p "birthDate") ctx.today
  let allergies := rs.filter isAllergy
  let meds := rs.filter isMedRequest
  let labs := labRows rs
  let visitDx := match selectedChartEncounter ctx rs p with
    | some e => firstCode (first e "reasonCode")
    | none => ""
  let acute := acutePayloads ctx rs p

  let surgical := surgicalPayloads ctx.today rs p
  let ambulatory := Ambulatory.payloads ctx rs p
  let setting := encounterKindOf ctx rs p
  let preop := setting == some "preop" ||
    (setting.isNone && !(surgicalCaseRows ctx.today rs p).isEmpty)
  let supporting := acute ++
    (((surgical.filter fun payload => payload.info != "scheduleTasks" || preop) ++
      (ambulatory.filter fun payload => payload.info != "scheduleTasks" || !preop)).filter
        fun payload => !acute.any (fun other => other.info == payload.info))

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
    criticalResults? := some (criticalTickets rs p)
    abnormalResult := labs.any (·.abnormal)
    now := ctx.now
    medToGive? := ctx.medToGive?
    encounterKind? := encounterKindOf ctx rs p
    receipts := ctx.receipts
    infoPayloads? := some supporting
    artifactBindings? := some (supporting.map fun payload =>
      { key := payload.artifactKey, artifact := payload.artifact, version := payload.version })
    record := ctx.record ++ (if visitDx != "" then [("visitDiagnosis", visitDx)] else []) ++
      (let enc := (latestEncounter (encounterRecords ctx rs p)).getD .null
       let orders := (ofType "ServiceRequest" rs).filter fun r => str r "status" == "active" &&
         periopSubject p r && (referenced? rs (field r "encounter")).any (fun e => str e "id" == str enc "id")
       [("codeStatus", "; ".intercalate ((orders.filter fun r => hasCode (field r "code") "full-code" || hasCode (field r "code") "dnr").map (fun r => ccText (field r "code")))),
        ("isolation", "; ".intercalate ((orders.filter fun r => ["no-isolation", "contact-precautions", "droplet-precautions"].contains (firstCode (field r "code"))).map (fun r => ccText (field r "code")))),
        ("encounterName", ccText (first enc "type")), ("department", ccText (field enc "serviceType")),
        ("postoperativeDay", ((arr enc "extension").find? (fun e => str e "url" == "https://vgi-health.example/fhir/StructureDefinition/postoperative-day")).map (fun e => qtyText (Json.mkObj [("value", field e "valueInteger")])) |>.getD "")]).filter (fun pair => pair.2 != "") }

/-- Candidate extraction for exactly effectiveDateTime, otherwise effectivePeriod.start,
plus issued (separately). Other FHIR date/time fields are outside this contract.
Duplicates and ambiguous strings are retained; this list is not permission to display them. -/
def timelineSources (rs : List Json) : List UiSourceDate :=
  rs.flatMap fun r =>
    let resource := resourceType r ++ "/" ++ str r "id"
    let effective := str r "effectiveDateTime"
    let period := str (field r "effectivePeriod") "start"
    (if effective != "" then [{ resource, field := "effectiveDateTime", timestamp := effective }]
     else if period != "" then [{ resource, field := "effectivePeriod.start", timestamp := period }] else []) ++
    (let issued := str r "issued"
     if issued == "" then [] else [{ resource, field := "issued", timestamp := issued }])

/-- Supported source backings. Latest vital rows use the same code/time selection
as uiRows; full laboratory histories use the same label and cell projection.
Other record families and payload overrides have no inferred source permission. -/
def timestampTargets (d : Display) (r : Json) : List (InfoId × List (String × String)) :=
  (if isVital r && (uiLatestVitals d).any (fun latest =>
      latest.code == (vitalRow r).code && latest.date == (vitalRow r).date)
    then [("vitals", vitalCells (vitalRow r))] else []) ++
  (if isLab r then
    let labels := (d.labResults.map (fun row => (row.name, row.code))).eraseDups
    (labResultRowsFor r).flatMap fun row =>
      ["labs", "labResults", "resultTrend"].map fun info => (info, labResultCells labels row)
    else [])

def timelineEntries (rs : List Json) (d : Display) :
    List (UiSourceDate × List (InfoId × List (String × String))) :=
  rs.flatMap fun r => (timelineSources [r]).map fun source => (source, timestampTargets d r)

def timelineBackings (rs : List Json) (d : Display) : List UiDateBacking :=
  (timelineEntries rs d).zipIdx.flatMap fun ((source, targets), occurrence) =>
    targets.map fun (info, row) => { source, occurrence, info, row }

/-- Every backing is an exact supported row projection and a candidate field of
that very resource. This does not claim coverage of other FHIR timestamp fields. -/
theorem timeline_backing_provenance (rs : List Json) (d : Display) (b : UiDateBacking)
    (h : b ∈ timelineBackings rs d) :
    ∃ r ∈ rs, b.source ∈ timelineSources [r] ∧ (b.info, b.row) ∈ timestampTargets d r := by
  obtain ⟨⟨⟨source, targets⟩, occurrence⟩, he, hm⟩ := List.mem_flatMap.mp h
  obtain ⟨⟨info, row⟩, ht, eq⟩ := List.mem_map.mp hm
  cases eq
  have he := List.fst_mem_of_mem_zipIdx he
  obtain ⟨r, hr, hm⟩ := List.mem_flatMap.mp he
  obtain ⟨src, hs, eq⟩ := List.mem_map.mp hm
  cases eq
  exact ⟨r, hr, hs, ht⟩

/-- Candidate enumeration and backing occurrence numbers share exactly one order. -/
theorem timeline_entries_sources (rs : List Json) (d : Display) :
    (timelineEntries rs d).map Prod.fst = timelineSources rs := by
  simp [timelineEntries, timelineSources, List.map_flatMap, List.map_map, Function.comp_def]

/-- No equal-looking hidden occurrence can borrow a shown occurrence's permission. -/
theorem timeline_backing_occurrence (rs : List Json) (d : Display) (b : UiDateBacking)
    (h : b ∈ timelineBackings rs d) :
    (timelineSources rs)[b.occurrence]? = some b.source := by
  obtain ⟨⟨⟨source, targets⟩, occurrence⟩, he, hm⟩ := List.mem_flatMap.mp h
  obtain ⟨⟨info, row⟩, _, eq⟩ := List.mem_map.mp hm
  cases eq
  have hAt := List.mem_zipIdx_iff_getElem?.mp he
  rw [← timeline_entries_sources rs d]
  simp [List.getElem?_map, hAt]

#print axioms timeline_backing_occurrence
#print axioms timeline_backing_provenance
#print axioms timeline_entries_sources

/-- The display rows. -/
def displayOf (ctx : FactsContext) (rs : List Json) (p : Json) : Display :=
  let dob := str p "birthDate"
  let d : Display :=
    { asOf := ctx.today
      sourcePatientId? := some (str p "id")
      timelineSources? := some (timelineSources rs)
      banner := bannerFor ctx rs p

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
  { d with timelineBackings? := some (timelineBackings rs d) }

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

/-! Compact chart previews are separate, explicitly bounded views. Full records remain
in their existing info IDs. These payloads never create receipts or clinical captures. -/

/-- Parse a source clock for display windows, preserving an explicit numeric offset. -/
def chartMinute (date : String) (fallback : Nat := 0) : Option Int := do
  let (year, month, day) ← ymd date
  let hour := ((sub date 11 2).toNat?).getD (fallback / 60)
  let minute := ((sub date 14 2).toNat?).getD (fallback % 60)
  let suffix := sub date (date.length - 6) 6
  let offset := if date.length ≥ 25 && sub suffix 3 1 == ":" && (suffix.startsWith "+" || suffix.startsWith "-") then
    let n := ((sub suffix 1 2).toNat?.getD 0) * 60 + ((sub suffix 4 2).toNat?.getD 0)
    if suffix.startsWith "-" then -(Int.ofNat n) else Int.ofNat n
    else 0
  stampMinute {
    time := 0, year, month, day, minuteOfDay := hour * 60 + minute,
    utcOffsetMinutes := offset, zone := "source" }

/-- A strict, non-future 72-hour source result window. Unknown dates stay in full Results. -/
def chartRecent (ctx : FactsContext) (date : String) : Bool :=
  match chartMinute ctx.today (ctx.now % 1440), chartMinute date with
  | some now, some recorded => recorded ≤ now && now - recorded ≤ 4320
  | _, _ => false

#guard chartRecent { today := "2026-11-02", now := 540 } "2026-10-30T09:00:00Z"
#guard !chartRecent { today := "2026-11-02", now := 540 } "2026-10-30T08:59:00Z"
#guard !chartRecent { today := "2026-11-02", now := 540 } "2026-11-02T09:01:00Z"
#guard chartRecent { today := "2026-11-02", now := 540 } "2026-11-02T14:30:00+05:30"

/-- Labeled source summaries and role context for the chart Index and patientSidebar. -/
def chartPayloads (ctx : FactsContext) (rs : List Json) (p : Json) (f : Facts) (d : Display) : List InfoPayload :=
  let enc := (latestEncounter (encounterRecords ctx rs p)).getD .null
  let present := fun value => if value == "" then "Not recorded" else value
  let pair := fun label value => [("Detail", label), ("Value", present value)]
  let encounter := encRow enc
  let los := match (if encounter.stop == "" then chartMinute ctx.today (ctx.now % 1440) else chartMinute encounter.stop), chartMinute encounter.start with
    | some stop, some start => if start ≤ stop then
        toString ((stop - start) / 1440) ++ "d " ++ toString (((stop - start) % 1440) / 60) ++ "h " ++
        (if encounter.stop == "" then "(snapshot)" else "(recorded stay)") else "Not recorded"
    | _, _ => "Not recorded"
  let weight := (bannerWeightOf ctx.today rs).map (fun (n, unit, date) =>
    let kg := match unit with | .kg => some n | .g => some (n / 1000) | .lb => some ((n * 45359237 + 50000000) / 100000000) | _ => none
    (kg.map (fun n => toString (n / 10) ++ "." ++ toString (n % 10) ++ " kg · " ++ date)).getD "Not recorded") |>.getD "Not recorded"
  let identity := [pair "Name" d.banner.name, pair "Age / sex" (if isoDateValid d.banner.dob then toString d.banner.ageYears ++ " / " ++ d.banner.sex else "Not recorded"),
    pair "MRN" d.banner.mrn, pair "DOB" d.banner.dob]
  let team := [pair "PCP" d.banner.pcp, pair "Attending" d.banner.attending] ++
    (arr enc "participant").map (fun r => pair (ccText (first r "type")) (humanRef rs (field r "individual"))) ++
    (ofType "CareTeam" rs).flatMap (fun r => (arr r "participant").map fun part =>
      pair (ccText (first part "role")) (humanRef rs (field part "member")))
  let encounterRows := [pair "Encounter" (ccText (first enc "type")), pair "Department" (ccText (field enc "serviceType")),
    pair "Location" encounter.location, pair "Admitted / start" encounter.start, pair "LOS" los, pair "Status" (str enc "status")]
  let notes := (newestFirst (·.date) d.notes).take 5 |>.map fun r =>
    [("Date", r.date), ("Type", r.noteType), ("Author", r.author), ("Title", r.title),
     ("Text", sub r.text 0 280 ++ if r.text.length > 280 then "… (excerpt; full note in Chart History)" else ""), ("Status", r.status)]
  let meds := d.meds.take 8 |>.map fun r => [("Medication", r.name), ("Directions", r.sig), ("Status", r.status), ("Prescriber", r.prescriber)]
  let problems := (d.problems.filter fun r => r.status != "resolved" && r.status != "inactive" && r.abatement == "").take 8 |>.map fun r =>
    [("Problem", r.name), ("Onset", r.onset), ("Status", r.status)]
  let recent := d.labResults.filter (fun r => chartRecent ctx r.date) |>.take 15 |>.map fun r =>
    [("Test", r.name), ("Value", r.value), ("Unit", r.unit), ("Flag", r.flag), ("Range", r.refRange), ("Recorded", r.date), ("Status", r.status)]
  let activeOrders := (newestFirst (str · "authoredOn") (rs.filter fun r => ["MedicationRequest", "ServiceRequest"].contains (resourceType r) &&
    ["active", "on-hold", "draft"].contains (str r "status"))).map fun r =>
      [("Order", if resourceType r == "MedicationRequest" then medName r else ccText (field r "code")),
       ("Directions", if resourceType r == "MedicationRequest" then sigText r else str r "occurrenceDateTime"),
       ("Status", str r "status"), ("Ordered", str r "authoredOn")]
  let carePlan := (ofType "CarePlan" rs).flatMap fun r =>
    [("Plan", str r "title"), ("Detail", str r "description"), ("Status", str r "status")] ::
    (arr r "activity").map (fun a => [("Plan", ccText (field (field a "detail") "code")),
      ("Detail", str (field a "detail") "description"), ("Status", str (field a "detail") "status")])
  let imaging := (rs.filter fun r => resourceType r == "ImagingStudy" ||
    (resourceType r == "DiagnosticReport" && (arr r "category").any (fun c => hasCode c "RAD"))).map fun r =>
      [("Study", ccText (field r "code")), ("Date", let date := str r "effectiveDateTime"; if date == "" then str r "started" else date),
       ("Conclusion", str r "conclusion"), ("Status", str r "status")]
  let observations := d.observations.filter fun r => r.categories.contains "intake-output" ||
    (r.measure.toLower.splitOn "intake").length > 1 || (r.measure.toLower.splitOn "output").length > 1
  let lines := (ofType "DeviceUseStatement" rs).map fun r =>
    [("Device", humanRef rs (field r "device")), ("Status", str r "status"), ("Recorded", str r "recordedOn")]
  let pharmacy := (rs.filter isMedRequest).filterMap fun r =>
    let name := Ambulatory.prescriptionPharmacy rs r
    if name == "" then none else some (pair "Pharmacy" name)
  let careGaps := f.careGaps.map fun gap =>
    [("Task", (([("influenzaVaccine", "Influenza vaccination review"), ("colorectalScreening", "Colorectal screening review"),
      ("hba1cMonitoring", "HbA1c monitoring review")] : List (String × String)).lookup gap).getD gap),
     ("Status", "Chart reminder"), ("Due", "Verify source / eligibility")]
  let completed := (rs.filter fun r => ["Observation", "DiagnosticReport"].contains (resourceType r) &&
    ["final", "amended", "corrected"].contains (str r "status")).flatMap (fun r => (arr r "basedOn").map (str · "reference"))
  let pending := (ofType "ServiceRequest" rs).filter (fun r => str r "status" == "active" &&
    !["full-code", "dnr", "no-isolation", "contact-precautions", "droplet-precautions"].contains (firstCode (field r "code")) &&
    !completed.contains ("ServiceRequest/" ++ str r "id")) |>.map fun r =>
      [("Order", ccText (field r "code")), ("Requested", str r "authoredOn"), ("Priority", str r "priority"),
       ("Status", "Active order; no linked final result in supplied chart")]
  let schedule := d.marOrders.map fun r => [("Medication", r.medication), ("Dose", r.dose), ("Route", r.route),
    ("Frequency", r.frequency), ("Scheduled", "; ".intercalate r.scheduled), ("Status", r.status)]
  let due := d.marOrders.flatMap fun r => (r.scheduled.filter fun time =>
    match chartMinute ctx.today (ctx.now % 1440), chartMinute time with
    | some now, some scheduled => now - 60 ≤ scheduled && scheduled ≤ now + 60
    | _, _ => false).map fun time =>
      [("Due", time), ("Medication", r.medication), ("Dose", r.dose), ("Route", r.route), ("Status", r.status)]
  let prnOrders := (rs.filter isMedRequest).filter fun r => (arr r "dosageInstruction").any fun di =>
    field di "asNeededBoolean" == Json.bool true || field di "asNeededCodeableConcept" != Json.null
  let prn := (d.administrations.filter fun r => prnOrders.any fun order =>
    r.orderId == "MedicationRequest/" ++ str order "id" || r.orderId == str order "id").map fun r =>
      [("Medication", r.medication), ("Dose", r.dose), ("Route", r.route), ("Time", r.time), ("Status", r.status), ("Reason", r.reason)]
  let views : List (InfoId × List (List (String × String))) :=
    [("chartMarSchedule", schedule), ("chartPendingResults", pending), ("chartStatus", [pair "Chart snapshot" ctx.today, pair "Encounter" (ccText (first enc "type")),
       pair "Department" (ccText (field enc "serviceType")), pair "Status" (str enc "status")]), ("chartMarDue", due), ("chartPRN", prn), ("chartQuickView", identity ++ encounterRows ++ team), ("chartProblems", problems), ("chartMeds", meds),
     ("chartRecentResults", recent), ("chartVitals", ((newestFirst (·.time) (d.observations.filter (fun r => r.categories.contains "vital-signs"))).take 15).reverse.map fun r =>
       [("Measure", r.measure), ("Value", r.value), ("Unit", r.unit), ("Recorded", r.time)]),
     ("chartCareGaps", careGaps ++ Ambulatory.forecastRows rs),
     ("chartImmunizations", (d.immunizations.take 8).map fun r => [("Vaccine", r.vaccine), ("Date", r.date), ("Status", r.status)]),
     ("chartNotes", notes), ("chartOrders", activeOrders.take 12), ("chartOpenOrders", activeOrders), ("chartImaging", imaging.take 8), ("chartImagingAll", imaging),
     ("chartSocial", (d.history.filter (fun r => r.kind == "Social history")).take 8 |>.map fun r =>
       [("Finding", r.item), ("Detail", r.detail), ("Status", r.status)]),
     ("chartEncounters", (d.encounters.take 8).map fun r => [("Encounter", r.encType), ("Date", r.start), ("Reason", r.reason), ("Provider", r.provider)]),
     ("chartCarePlan", carePlan ++
       (if field enc "hospitalization" == Json.null then [] else
         [pair "Admission source" (ccText (field (field enc "hospitalization") "admitSource")),
          pair "Disposition" (ccText (field (field enc "hospitalization") "dischargeDisposition")),
          pair "Destination" (humanRef rs (field (field enc "hospitalization") "destination"))])), ("chartED", encounterRows ++ [pair "Chief complaint" encounter.reason] ++
       (arr enc "statusHistory").map (fun r => [("Status", str r "status"), ("Start", str (field r "period") "start"), ("End", str (field r "period") "end")])),
     ("chartIO", (observations.take 15).map fun r => [("Measure", r.measure), ("Value", r.value), ("Unit", r.unit), ("Recorded", r.time)]),
     ("chartLines", lines ++ [pair "Isolation" ((f.record.lookup "isolation").getD "")] ++
       ((ofType "ServiceRequest" rs).filter (fun r => str r "status" == "active" &&
         ((ccText (field r "code")).toLower.splitOn "precaution").length > 1)).map (fun r => pair "Precaution" (ccText (field r "code")))),
     ("chartProcedure", (surgicalCaseRows ctx.today rs p).map SurgicalCaseRow.cells ++
       ((d.procedures.take 3).map fun r => [("Procedure", r.name), ("Recorded", r.date), ("Status", r.status)]) ++
       [pair "Postoperative day" ((f.record.lookup "postoperativeDay").getD "")]),
     ("storyIdentity", identity), ("storyPrecautions", [pair "Code status" ((f.record.lookup "codeStatus").getD ""), pair "Isolation" ((f.record.lookup "isolation").getD "")] ++
       ((ofType "ServiceRequest" rs).filter (fun r => str r "status" == "active" &&
         ((ccText (field r "code")).toLower.splitOn "precaution").length > 1)).map (fun r => pair "Precaution" (ccText (field r "code")))),
     ("storyTeam", team), ("storyEncounter", encounterRows), ("storyWeight", [pair "Measured weight" weight]),
     ("storyMedCount", [pair "Active/on-hold orders" (toString d.meds.length)]),
     ("storyLastNote", notes.take 1), ("storyPharmacy", pharmacy.eraseDups),
     ("chartReports", [[("Reports", "Department reports are informational in this offline demonstration."), ("Chart date", ctx.today)]])]
  let version := listVersion rs
  views.map fun (info, rows) => {
    info, patient := patientIdOf p, artifactKey := "chart:" ++ info,
    artifact := "FHIR chart preview:" ++ info, version,
    rows := rows.zipIdx.map fun (fields, slot) => { id := info ++ "." ++ toString slot, slot, fields } }

/-! New specification for owner review: record-derived temporal evidence.
No interaction state or UI event enters this projection. Unsupported events stay absent. -/
namespace Temporal

/-- New specification for owner review: require a single current version of a
resource identity; missing versions and bundles containing history fail closed. -/
def current (rs : List Json) (r : Json) : Bool :=
  str r "id" != "" && str (field r "meta") "versionId" != "" &&
  ((rs.filter fun x => resourceType x == resourceType r && str x "id" == str r "id").length == 1)

/-- New specification for owner review: only a unique, patient-bound selected
encounter may establish the temporal episode. Historical clinic visits are not
implicitly selected when two encounters share the latest start. -/
def encounter? (ctx : FactsContext) (rs : List Json) (p : Json) : Option Json := do
  let e ← selectedChartEncounter ctx rs p
  if !current rs e || !patientReferenceMatches (field e "subject") p ||
      !["in-progress", "onleave", "finished"].contains (str e "status") then none else
  if ctx.encounterId?.isNone && (ctx.record.lookup "selectedEncounterId").isNone &&
      ((ofType "Encounter" (acutePatientResources rs p)).filter fun other =>
        str (field other "period") "start" == str (field e "period") "start").length != 1 then none
  else some e

/-- New specification for owner review: UTC minutes from a strict offset-bearing
FHIR instant; partial dates, malformed dates and local times supply no evidence. -/
def minute? (raw : String) : Option Int := (Dated.parse raw).map (fun t => t.1 / 60)

/-- New specification for owner review: source point before binding to its
current chart snapshot. An administrative source actor identifies the record,
not a human admission/discharge performer. -/
structure Point where
  event : EventId
  actor : String
  time : Int

/-- New specification for owner review: actual inpatient admission/discharge
and encounter start. Planned encounters and unfinished discharges are excluded. -/
def encounterPoints (e : Json) (key : String) : List Point :=
  let point := fun event raw => (minute? raw).toList.map fun time =>
    { event, actor := "fhir-record:Encounter/" ++ str e "id", time : Point }
  let inpatient := ["IMP", "inpatient"].contains (str (field e "class") "code")
  if key == "completeMedicalRecord" then
    if inpatient && str e "status" == "finished" then point "discharge" (str (field e "period") "end") else []
  else if key == "verifyPreoperativeRecord" || key == "recordNursingTransition" then
    if inpatient then point "admission" (str (field e "period") "start") else []
  else if key == "verifyEncounterWeight" then point "encounter.start" (str (field e "period") "start")
  else []

/-- New specification for owner review: explicit document types, never narrative
keyword inference. The completion certificate concerns the entire encounter
record; an ordinary final note or discharge summary is insufficient. -/
def documentRules : List (String × String × List EventId) :=
  [("completeMedicalRecord", "medical-record-completion", ["record.completed", "record.authenticated"]),
   ("verifyPreoperativeRecord", "history-physical", ["hp.completed"]),
   ("signPostAnesthesiaNote", "postanesthesia-evaluation", ["postanesthesia.documented"]),
   ("chartAssessment", "nursing-assessment", ["nursing.assessmentDocumented"])]

/-- New specification for owner review: one current, final Composition of the
explicit type, for this patient and encounter, with one dated professional/legal
attester. A replacement or an ambiguous set supplies no evidence. Attestation
is document completion/authentication time, never the time care was performed. -/
def documentPoint? (rs : List Json) (p e : Json) (code : String) : Option (String × Int) := do
  let docs := (ofType "Composition" rs).filter fun d =>
    patientReferenceMatches (field d "subject") p && acuteInEncounter d e &&
    (codings (field d "type")).any (fun c =>
      str c "system" == "urn:vgi:document-type" && str c "code" == code)
  let [d] := docs | none
  if !current rs d || !["final", "amended"].contains (str d "status") ||
      rs.any (fun other => (arr other "relatesTo").any fun rel =>
        str rel "code" == "replaces" && acuteRefersTo (field rel "targetReference") d) then none else do
  let [a] := (arr d "attester").filter fun a =>
    (arr a "mode").any (fun mode => mode == Json.str "professional" || mode == Json.str "legal") | none
  let actor := str (field a "party") "reference"
  if !actor.startsWith "Practitioner/" || actor == "Practitioner/" then none else do
  let time ← minute? (str a "time")
  pure (actor, time)

/-- New specification for owner review: signed document points for a single
rule artifact; no filing, dictation or clinical performance time is guessed. -/
def documentPoints (rs : List Json) (p e : Json) (key : String) : List Point :=
  documentRules.flatMap fun (k, code, events) =>
    if k != key then [] else
    (documentPoint? rs p e code).toList.flatMap fun (actor, time) =>
      events.map fun event => { event, actor, time }

/-- New specification for owner review: exact encounter observations with a
single recorded performer. Weight uses measurement time; a nursing assessment
uses its final publication time. Multiple candidates require an explicit future
selector rather than choosing whichever resource happens to appear last. -/
def observationPoints (rs : List Json) (p e : Json) (key : String) : List Point :=
  let candidates := (ofType "Observation" rs).filter fun r =>
    patientReferenceMatches (field r "subject") p && acuteInEncounter r e &&
    (if key == "verifyEncounterWeight" then
      (codings (field r "code")).any (fun c => str c "system" == "http://loinc.org" && str c "code" == bodyWeightCode) else
      key == "chartAssessment" && (codings (field r "code")).any (fun c =>
        str c "system" == "https://vgi-health.example/fhir/CodeSystem/observation" &&
        str c "code" == "nursing-assessment"))
  (do
    let [r] := candidates | none
    if !current rs r || !["final", "amended", "corrected"].contains (str r "status") then none else do
    let [performer] := arr r "performer" | none
    let actor := str performer "reference"
    if !actor.startsWith "Practitioner/" || actor == "Practitioner/" then none else do
    let time ← minute? (str r (if key == "verifyEncounterWeight" then "effectiveDateTime" else "issued"))
    let event := if key == "verifyEncounterWeight" then "weight.measured" else "nursing.assessmentDocumented"
    pure ({ event := event, actor := actor, time := time } : Point)).toList

/-- New specification for owner review: the supported temporal artifact keys. -/
def keys : List String :=
  ["completeMedicalRecord", "verifyPreoperativeRecord", "recordNursingTransition",
   "verifyEncounterWeight", "signPostAnesthesiaNote", "chartAssessment"]

/-- New specification for owner review: bind all points of a rule to the same
patient/encounter snapshot, including resource types, identities and versions.
Digest collision resistance remains the existing FHIR adapter trust boundary. -/
def binding (rs : List Json) (p e : Json) (key : String) : ArtifactBinding :=
  { key, artifact := "FHIR temporal:" ++ patientIdOf p ++ ":Encounter/" ++ str e "id" ++ ":" ++ key
    version := versionDigest ((rs.map fun r => resourceType r ++ "/" ++ versionKey r).mergeSort (fun a b => decide (a ≤ b))) }

/-- New specification for owner review: every point is an actual, current-chart
record event, bound to its snapshot and exact episode, with its recorded actor. -/
def evidence (p e : Json) (b : ArtifactBinding) (points : List Point) : List EventEvidence :=
  points.map fun point =>
    { event := point.event, patient := patientIdOf p, episode := str e "id", actor := point.actor
      artifact := b.artifact, version := b.version, time := point.time, planned := false }

/-- New specification for owner review: paired bindings and evidence; a missing
or ambiguous encounter yields neither. eventTime still refuses future actual
points, absent trusted clocks, duplicates and stale versions. -/
def projection (ctx : FactsContext) (rs : List Json) (p : Json) : List (ArtifactBinding × List EventEvidence) :=
  (encounter? ctx rs p).toList.flatMap fun e => keys.map fun key =>
    let b := binding rs p e key
    (b, evidence p e b (encounterPoints e key ++ documentPoints rs p e key ++ observationPoints rs p e key))

/-- New specification for owner review: every projected point has the exact
patient, encounter and artifact version, and never claims a planned event. -/
theorem evidence_bound (p e : Json) (b : ArtifactBinding) (points : List Point)
    (ev : EventEvidence) (h : ev ∈ evidence p e b points) :
    ev.patient = patientIdOf p ∧ ev.episode = str e "id" ∧
    ev.artifact = b.artifact ∧ ev.version = b.version ∧ ev.planned = false := by
  obtain ⟨point, _, rfl⟩ := List.mem_map.mp h
  exact ⟨rfl, rfl, rfl, rfl, rfl⟩

#print axioms evidence_bound
end Temporal

/-- Full patient facts with optional version-bound, read-only chart previews. -/
def factsOf (ctx : FactsContext) (rs : List Json) (p : Json) : Facts :=
  let f := baseFactsOf ctx rs p
  let previews := chartPayloads ctx rs p f (displayOf ctx rs p)
  let temporal := Temporal.projection ctx rs p
  { f with
    epochMinute? := chartMinute ctx.today (ctx.now % 1440)
    episodeId? := (Temporal.encounter? ctx rs p).map (str · "id")
    eventEvidence? := some (temporal.flatMap (·.2))
    encounterStart? := (selectedChartEncounter ctx rs p).bind (fun e => chartMinute (str (field e "period") "start"))
    infoPayloads? := some ((f.infoPayloads?.getD []) ++ previews),
    artifactBindings? := some ((f.artifactBindings?.getD []) ++ surgicalBindings previews ++ temporal.map (·.1)) }

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
  let basket := worldList ctx rs "inbox"
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
     ("inboxFolders", basket.map fun _ => ["Results", "Rx Requests", "Patient Messages"].map fun folder =>
       [("Folder", folder), ("Count", toString ((messages.map messageCells).filter (fun cells => cells.lookup "Folder" == some folder)).length)]),
     ("inboxItems", basket.map fun _ => messages.map messageCells),
     ("inboxMessages", basket.map fun _ => (messages.filter (fun r => resourceType r == "Communication")).map messageCells),
     ("inboxResults", basket.map fun _ => results.map messageCells),
     ("inboxRxRequests", basket.map fun _ => refills.map messageCells)]
  let sources := [("scheduleTasks", clinic.getD []), ("orSchedule", cases.getD []),
    ("edTrackBoard", ed.getD []), ("shiftWorklist", mine.getD []), ("unitCensus", unit.getD []),
    ("consultList", consults.getD []), ("inboxResults", results), ("inboxRxRequests", refills)]
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
     ("inboxResults", ((worldList ctx rs "inbox").getD []).filter (fun r => resourceType r == "Task" && Ambulatory.taskFolder r == "Results")),
     ("inboxMessages", ((worldList ctx rs "inbox").getD []).filter (fun r => resourceType r == "Communication")),
     ("inboxRxRequests", ((worldList ctx rs "inbox").getD []).filter (fun r => resourceType r == "Task" && Ambulatory.taskFolder r == "Rx Requests"))]
  let titles := [("scheduleTasks", "Schedule"), ("edTrackBoard", "Track Board"),
    ("shiftWorklist", "My Patients / MAR"), ("unitCensus", "Unit Census"),
    ("orSchedule", "OR Schedule"), ("consultList", "Consults"),
    ("inboxMessages", "Inbox · Patient Messages"), ("inboxResults", "Inbox · Results"), ("inboxRxRequests", "Inbox · Rx Requests")]
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
  /-- Server-computed activities added after the dated lists, such as the
  signed-in clinician's deficiency list. They carry rows, never captures. -/
  extraActivities? : Option (List PatientActivity) := none
  deriving Lean.ToJson, Lean.FromJson

/-- New specification for owner review: the directory with the supplied extra
activities appended. -/
def withExtraActivities (d : PatientDirectory) (extra : Option (List PatientActivity)) : PatientDirectory :=
  { d with activities := d.activities ++ extra.getD [] }

/-- `facts` on a parsed input. -/
def runFacts (i : FactsInput) : Except String FactsOutput :=
  if i.directoryOnly? == some true then .ok {
    facts := { (default : Facts) with patientDirectory? := some (withExtraActivities (patientDirectory i.context
      (bundleResources (i.worldContext?.getD i.bundle)) (i.extraPatients?.getD [])) i.extraActivities?) }, display := Display.empty }
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
      patientDirectory? := some (withExtraActivities (patientDirectory ctx all (i.extraPatients?.getD [])) i.extraActivities?)
      infoPayloads? := some (queues ++ oldPayloads)
      artifactBindings? := some (surgicalBindings queues ++ (f.artifactBindings?.getD []).filter (fun b => !queues.any (fun q => q.artifactKey == b.key))) }
    pure { facts := enriched, display := d }

end Ehr.Render.Fhir
