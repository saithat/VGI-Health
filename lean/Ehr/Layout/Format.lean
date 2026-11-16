import Lean.Data.Json

/-! # Clinical text formatting

New specification for owner review. The wording a clinical screen displays is
decided here, before layout, so the measured string is the displayed string.
Every function is pure and total, reads only its arguments, and uses no host
locale or clock. A part keeps the unformatted datum as `Part.raw`. -/
namespace Ehr.Layout.Format

/-- `pattern` occurs in `s`. -/
def hasSub (s pattern : String) : Bool := (s.splitOn pattern).length > 1

def chars (cs : List Char) : String := cs.foldl String.push ""

/-- The characters of a string, built in Lean. `String.toList` is not used: on
32-bit targets (the WASM build) the runtime ends its list with an allocated
object instead of the empty list, and compiled code that returns a borrowed
empty list then frees that object twice. -/
def listOf (s : String) : List Char := s.foldr (fun c cs => c :: cs) []

/-- The words of a string: maximal runs of letters and digits. -/
def words (s : String) : List String :=
  (((listOf s).map fun c => if c.isAlphanum then c else ' ').foldl String.push "").splitOn " " |>.filter (· != "")

def pad2 (n : Nat) : String := (if n < 10 then "0" else "") ++ toString n

/-- Fixed-point tenths and hundredths, as recorded. -/
def tenths (n : Nat) : String := toString (n / 10) ++ "." ++ toString (n % 10)
def hundredths (n : Nat) : String := toString (n / 100) ++ "." ++ pad2 (n % 100)

/-! ## Instants in UTC -/

/-- Civil date of a day count since 1970-01-01 (proleptic Gregorian). -/
def civil (days : Int) : Int × Nat × Nat :=
  let z := days + 719468
  let era := Int.fdiv z 146097
  let doe := (z - era * 146097).toNat
  let yoe := (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365
  let doy := doe - (365 * yoe + yoe / 4 - yoe / 100)
  let mp := (5 * doy + 2) / 153
  let d := doy - (153 * mp + 2) / 5 + 1
  let m := if mp < 10 then mp + 3 else mp - 9
  ((yoe : Int) + era * 400 + (if m ≤ 2 then 1 else 0), m, d)

/-- New specification for owner review: an instant given as UTC seconds and
nanoseconds, written in UTC and labelled as UTC. Deterministic; no zone other
than UTC is assumed. Nanoseconds are written only when they are not zero. -/
def utcInstant (second : Int) (nanosecond : Nat) : String :=
  let (y,m,d) := civil (Int.fdiv second 86400)
  let s := (Int.fmod second 86400).toNat
  toString y ++ "-" ++ pad2 m ++ "-" ++ pad2 d ++ " " ++ pad2 (s / 3600) ++ ":" ++ pad2 (s % 3600 / 60) ++ ":" ++
    pad2 (s % 60) ++
    (if nanosecond == 0 then "" else "." ++ chars (List.replicate (9 - (toString nanosecond).length) '0') ++
      toString nanosecond) ++ " UTC"

/-! ## Tones -/

/-- The leading state word of a value: up to the first `·` or line break,
trimmed, lower-cased, with `_` and `-` read as spaces. -/
def statusWord (value : String) : String :=
  let head := chars ((listOf value).takeWhile fun c => c != '·' && c != '\n')
  chars ((listOf head.trimAscii.toString.toLower).map fun c => if c == '_' || c == '-' then ' ' else c)

def leads (s : String) (options : List String) : Bool :=
  options.any fun w => s == w || s.startsWith (w ++ " ") || s.startsWith (w ++ "\t")

/-- New specification for owner review: the colour class of an explicit state
text. Only supplied wording is classified; nothing is inferred from time or
workflow. Unknown wording has no tone. -/
def statusTone (value : String) : String :=
  let s := statusWord value
  if s == "l" || s == "low" then "blue"
  else if s == "h" || s == "high" then "red"
  else if s == "hh" || s == "ll" || s == "a" || s == "abnormal" then "red"
  else if leads s ["critical","urgent","stat","overdue","rejected"] then "red"
  else if leads s ["signed","final","certified","reviewed","complete","completed","given","done",
      "result available","results available","report available"] then "green"
  else if leads s ["due","due soon","unsigned","pending","needs review","needs confirmation","needs action",
      "missing details","awaiting confirmation","held","on hold","roomed","arrived"] then "yellow"
  else if leads s ["in progress","preliminary","partial","booked","ordered","requested"] then "blue"
  else if leads s ["inbox","cosign","cosign required","awaiting cosign","unread","refused","declined"] then "violet"
  else if leads s ["draft","future","scheduled","stopped","discontinued","cancelled","canceled","not given",
      "not done","not due","not charted","not documented"] then "gray"
  else ""

/-- New specification for owner review: the class of a result flag. -/
def resultTone (flag : String) : String :=
  let word := flag.trimAscii.toString.toLower
  if word == "hh" || word == "ll" || word == "critical" then "critical"
  else if word == "h" || word == "high" then "high"
  else if word == "l" || word == "low" then "low"
  else ""

/-- A caption that starts with a clock time, `7:00` or `07:00`. -/
def clockCaption (key : String) : Bool :=
  match (listOf key) with
  | a :: ':' :: b :: c :: _ => a.isDigit && b.isDigit && c.isDigit
  | a :: a' :: ':' :: b :: c :: _ => a.isDigit && a'.isDigit && b.isDigit && c.isDigit
  | _ => false

/-- New specification for owner review: the columns whose cells are states. -/
def statusColumn (key : String) : Bool :=
  let k := key.toLower
  hasSub k "status" || hasSub k "confirmation" || hasSub k "review state" || hasSub k "scheduled" ||
    hasSub k "administration" || clockCaption key

/-- New specification for owner review: the accent of a caption, by the kind
of section it names. It describes the section, never a clinical finding. -/
def sectionTone (label : String) : String :=
  let k := label.toLower
  let any (patterns : List String) := patterns.any (hasSub k)
  if any ["precaution","isolation","fall risk"] then "orange"
  else if any ["allerg","critical","alert"] then "red"
  else if any ["inbox","message","cosign","note","history","instruction","education"] then "violet"
  else if any ["medication","pharmacy","immuniz","census","worklist","flowsheet","ward"] || (words k).contains "mar"
    then "green"
  else if any ["result","lab","imaging","triage","acuity","track board","emergency"] then "orange"
  else if any ["order","assessment","plan","disposition","procedure","surg","operative","or schedule"] then "yellow"
  else "blue"

/-! ## Text scanning

Small total scanners over characters. White space is ASCII white space; a word
character is an ASCII letter, digit or underscore. -/

def isWord (c : Char) : Bool := c.isAlphanum || c == '_'

def trimList (cs : List Char) : List Char :=
  ((cs.dropWhile Char.isWhitespace).reverse.dropWhile Char.isWhitespace).reverse

/-- The rest after `pattern` (given in lower case), ignoring case. -/
def dropPrefixCI : List Char → List Char → Option (List Char)
  | [], cs => some cs
  | _ :: _, [] => none
  | p :: ps, c :: cs => if c.toLower == p then dropPrefixCI ps cs else none

/-- The rest after `pattern`, exactly. -/
def dropPrefix : List Char → List Char → Option (List Char)
  | [], cs => some cs
  | _ :: _, [] => none
  | p :: ps, c :: cs => if c == p then dropPrefix ps cs else none

def equalsCI (s : String) (pattern : String) : Bool := s.toLower == pattern

/-- Remove every occurrence of one of `tags` (lower case; case is ignored),
with the white space before it, where `follows` accepts the text after it. -/
def dropTagged (tags : List (List Char)) (follows : List Char → Bool) : Nat → List Char → List Char
  | 0, cs => cs
  | _, [] => []
  | n+1, c :: cs =>
    let rest := (c :: cs).dropWhile Char.isWhitespace
    match tags.findSome? fun tag => (dropPrefixCI tag rest).filter follows with
    | some after => dropTagged tags follows n after
    | none => c :: dropTagged tags follows n cs

/-- Maximal runs of word characters and of other characters, in order. -/
def segments (cs : List Char) : List (Bool × List Char) :=
  ((cs.foldl (fun acc c => match acc with
    | (w,run) :: rest => if w == isWord c then (w,c :: run) :: rest else (isWord c,[c]) :: (w,run) :: rest
    | [] => [(isWord c,[c])]) []).reverse).map fun (w,run) => (w,run.reverse)

def mapWordsFrom (f : Bool → List Char → List Char) : Bool → List (Bool × List Char) → List Char
  | _, [] => []
  | first, (w,run) :: rest => (if w then f first run else run) ++ mapWordsFrom f false rest

/-- Rewrite each word; `f` is told whether the word starts the text. -/
def mapWords (f : Bool → List Char → List Char) (cs : List Char) : List Char :=
  mapWordsFrom f true (segments cs)

def natOf (cs : List Char) : Option Nat :=
  if cs.isEmpty || !cs.all Char.isDigit then none else some (cs.foldl (fun n c => n * 10 + (c.toNat - 48)) 0)

/-! ## Terminology -/

private def codeSystems : List (List Char) := ["(loinc)","(icd-10-cm)","(icd-10)","(cpt)"].map listOf

private def snomedTags : List (List Char) :=
  ["(finding)","(disorder)","(situation)","(procedure)","(qualifier value)","(observable entity)",
   "(organism)","(substance)"].map listOf

/-- A terminology tag is removed only at the end of a term: before the end of
the text, a separator or another parenthesis. -/
private def endsTerm (after : List Char) : Bool :=
  match after.dropWhile Char.isWhitespace with
  | [] => true
  | c :: _ => [';',':',',','·','|','—','('].contains c

/-- `5MG` and `5 MG` read `5 mg`: a digit, optional space, then an upper-case
unit that ends a word. -/
private def spaceUnits : Nat → List Char → List Char
  | 0, cs => cs
  | _, [] => []
  | n+1, c :: cs =>
    if c.isDigit then
      let rest := cs.dropWhile Char.isWhitespace
      match ["MG","MCG","ML","KG","CM"].findSome? fun unit =>
          ((dropPrefix (listOf unit) rest).filter fun after => !(after.head?.any isWord)).map fun after => (unit,after) with
      | some (unit,after) => c :: ' ' :: (listOf (if unit == "ML" then "mL" else unit.toLower)) ++ spaceUnits n after
      | none => c :: spaceUnits n cs
    else c :: spaceUnits n cs

/-- `Oral Tablet` and the other product forms are written in lower case. -/
private def oralForms : Nat → Bool → List Char → List Char
  | 0, _, cs => cs
  | _, _, [] => []
  | n+1, afterWord, c :: cs =>
    let found := if afterWord then none else
      ["Tablet","Capsule","Solution","Suspension"].findSome? fun form =>
        ((dropPrefix (listOf ("Oral " ++ form)) (c :: cs)).filter fun after => !(after.head?.any isWord)).map
          fun after => (form,after)
    match found with
    | some (form,after) => (listOf ("oral " ++ form.toLower)) ++ oralForms n true after
    | none => c :: oralForms n (isWord c) cs

/-- Two or more white-space characters read as one space. -/
private def collapse (cs : List Char) : List Char :=
  let flush (out ws : List Char) : List Char := if ws.length ≥ 2 then ' ' :: out else ws ++ out
  let (out,ws) := cs.foldl (fun (out,ws) c =>
    if c.isWhitespace then (out,c :: ws) else (c :: flush out ws,[])) (([] : List Char),([] : List Char))
  (flush out ws).reverse

/-- New specification for owner review: display-only cleanup of coded terms.
Terminology tags such as `(disorder)` at the end of a term are dropped, upper
case dose units after a number and product forms are written in lower case,
and repeated white space is collapsed. Other wording is untouched. -/
def cleanClinicalText (raw : String) : String :=
  let cs := (listOf raw)
  let n := cs.length + 1
  chars (trimList (collapse (oralForms n false (spaceUnits n (dropTagged snomedTags endsTerm n cs)))))

private def chemistry : List String :=
  ["Glucose","Urea nitrogen","Creatinine","Calcium","Sodium","Potassium","Chloride","Carbon dioxide, total"]

private def nameAliases : List (String × String) :=
  [("hemoglobin [mass/volume] in blood","Hemoglobin"),
   ("leukocytes [#/volume] in blood by automated count","WBC"),
   ("erythrocytes [#/volume] in blood by automated count","RBC"),
   ("hematocrit [volume fraction] of blood by automated count","Hematocrit"),
   ("mcv [entitic volume] in red blood cells by automated count","MCV"),
   ("mch [entitic mass] by automated count","MCH"),
   ("mchc [mass/volume] in red blood cells by automated count","MCHC"),
   ("erythrocyte [distwidth] in blood by automated count","RDW"),
   ("platelets [#/volume] in blood by automated count","Platelets"),
   ("body height","Height"),("body weight","Weight"),("body mass index (bmi) [ratio]","BMI"),
   ("blood pressure panel with all children optional","BP"),
   ("pain severity [score]","Pain score"),("pain severity [score] - reported","Pain score"),
   ("pain severity - 0-10 verbal numeric rating [score]","Pain score"),
   ("pain severity - 0-10 verbal numeric rating [score] - reported","Pain score")]

/-- New specification for owner review: the short clinical name of a coded
observation. Only the listed laboratory and vital-sign names are shortened;
every other name, and all narrative, keeps its wording. -/
def clinicalName (raw : String) : String :=
  let text := cleanClinicalText raw
  let low := text.toLower
  let analyte := chemistry.find? fun name =>
    ["mass","moles"].any fun kind => ["blood","serum or plasma","serum","plasma"].any fun specimen =>
      low == name.toLower ++ " [" ++ kind ++ "/volume] in " ++ specimen
  match analyte with
  | some name => chars ((listOf text).take name.length)
  | none =>
    let peptide := "natriuretic peptide.b prohormone n-terminal"
    if low == peptide || (low.startsWith (peptide ++ " [") &&
        ["] in serum","] in serum or plasma","] in blood"].any fun tail => low.endsWith tail) then "NT-proBNP"
    else (nameAliases.lookup low).getD text

/-- New specification for owner review: units as clinicians write them. -/
def clinicalUnit (raw : String) : String :=
  ([("mm[Hg]","mmHg"),("{score}","score"),("Cel","°C"),("[degF]","°F"),("kg/m2","kg/m²")].lookup raw).getD raw

/-- New specification for owner review: the unit of a field. -/
def unit (raw : String) : String := if raw == "mgPerKg" then "mg/kg" else clinicalUnit raw

/-- New specification for owner review: a recorded observation with three or
more decimals and magnitude at least one is rounded to two decimals, half
away from zero, on the recorded decimal digits (no floating point); trailing
zeros are dropped. Doses, inputs, censored results (`<5`) and every other
value are shown as recorded. -/
def observationValue (raw : String) : String :=
  let (negative,body) := match (listOf raw) with
    | '-' :: rest => (true,rest)
    | cs => (false,cs)
  match body.span Char.isDigit with
  | (whole,'.' :: fraction) =>
    match natOf whole, natOf fraction with
    | some w, some _ =>
      if fraction.length < 3 || w == 0 || w > 9007199254740991 then raw else
      let hundredths := w * 100 + (natOf (fraction.take 2)).getD 0 +
        (if ((fraction.drop 2).head?.map fun c => c.toNat - 48).getD 0 ≥ 5 then 1 else 0)
      let cents := hundredths % 100
      (if negative then "-" else "") ++ toString (hundredths / 100) ++
        (if cents == 0 then "" else if cents % 10 == 0 then "." ++ toString (cents / 10) else "." ++ pad2 cents)
    | _, _ => raw
  | _ => raw

/-- New specification for owner review: workflow states as displayed. -/
def clinicalStatus (raw : String) : String :=
  ([("booked","Scheduled"),("scheduled","Scheduled"),("arrived","Arrived"),("roomed","Roomed"),("active","Active"),
    ("requested","Pending"),("in-progress","In progress"),("in progress","In progress"),("final","Final"),
    ("preliminary","Prelim"),("pending","Pending"),("overdue","Overdue"),("given","Given"),("held","Held"),
    ("completed","Completed"),("cancelled","Cancelled"),("unread","Unread")].lookup raw.toLower).getD raw

/-- New specification for owner review: encounter class codes as displayed. -/
def encounterClass (raw : String) : String :=
  ([("AMB","Office Visit"),("EMER","Emergency"),("IMP","Inpatient")].lookup raw).getD raw

/-- New specification for owner review: `83 / F` reads `83 y.o. F`. -/
def ageSex (raw : String) : String :=
  match (listOf raw).span Char.isDigit with
  | (age,rest) =>
    match rest.dropWhile Char.isWhitespace with
    | '/' :: after =>
      match after.dropWhile Char.isWhitespace with
      | [sex] => if !age.isEmpty && (sex.toLower == 'm' || sex.toLower == 'f') then chars age ++ " y.o. " ++ chars [sex] else raw
      | _ => raw
    | _ => raw

/-- New specification for owner review: `165 min` reads `2h 45m`. -/
def clinicalDuration (raw : String) : String :=
  match (listOf raw).span Char.isDigit with
  | (number,[' ','m','i','n']) =>
    match natOf number with
    | some minutes =>
      if minutes < 60 then toString minutes ++ "m"
      else toString (minutes / 60) ++ "h" ++ (if minutes % 60 == 0 then "" else " " ++ toString (minutes % 60) ++ "m")
    | none => raw
  | _ => raw

/-! ## Dates and times

New specification for owner review. A recorded date or date-time is shown by
its own recorded wall-time digits: no zone conversion, no host locale, no
clock. A recorded offset is checked but not applied. An instant stored as an
epoch minute has no recorded wall time; it is written in UTC and labelled UTC
(`utcMinute`), because no display time zone is part of the data Lean has. -/

def leapYear (y : Nat) : Bool := y % 4 == 0 && (y % 100 != 0 || y % 400 == 0)

def validDate (y m d : Nat) : Bool :=
  1 ≤ m && m ≤ 12 && 1 ≤ d &&
    d ≤ (if m == 2 then (if leapYear y then 29 else 28) else if m == 4 || m == 6 || m == 9 || m == 11 then 30 else 31)

/-- Nothing, `Z`, or `±HH:MM` after optional white space. -/
private def zoneOk (cs : List Char) : Bool :=
  cs.isEmpty || match cs.dropWhile Char.isWhitespace with
    | ['Z'] => true
    | [sign,h1,h2,':',m1,m2] =>
      (sign == '+' || sign == '-') && ((natOf [h1,h2]).any (· ≤ 23)) && ((natOf [m1,m2]).any (· ≤ 59))
    | _ => false

/-- A recorded ISO date or date-time: year, month, day and, when present, hour
and minute as written. Seconds, a fraction and a zone may follow. -/
def parseStamp (cs : List Char) : Option (List Char × List Char × List Char × Option (List Char × List Char)) :=
  match cs with
  | y1 :: y2 :: y3 :: y4 :: '-' :: m1 :: m2 :: '-' :: d1 :: d2 :: rest =>
    match natOf [y1,y2,y3,y4], natOf [m1,m2], natOf [d1,d2] with
    | some y, some m, some d =>
      if !validDate y m d then none else
      match rest with
      | sep :: h1 :: h2 :: ':' :: n1 :: n2 :: tail =>
        if (sep == 'T' || sep == ' ') && [h1,h2,n1,n2].all Char.isDigit then
          if !((natOf [h1,h2]).any (· ≤ 23) && (natOf [n1,n2]).any (· ≤ 59)) then none else
          let zone := match tail with
            | ':' :: s1 :: s2 :: more =>
              if (natOf [s1,s2]).any (· ≤ 59) then
                match more with
                | '.' :: fraction =>
                  let digits := fraction.takeWhile Char.isDigit
                  if digits.isEmpty then none else some (fraction.dropWhile Char.isDigit)
                | _ => some more
              else none
            | more => some more
          match zone with
          | some z => if zoneOk z then some ([y1,y2,y3,y4],[m1,m2],[d1,d2],some ([h1,h2],[n1,n2])) else none
          | none => none
        else if zoneOk rest then some ([y1,y2,y3,y4],[m1,m2],[d1,d2],none) else none
      | _ => if zoneOk rest then some ([y1,y2,y3,y4],[m1,m2],[d1,d2],none) else none
    | _, _, _ => none
  | _ => none

private def monthNames : List String := ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

/-- `Nov 2, 2026 06:00`, the renderer's date-time form, as an ISO stamp. -/
private def humanStamp (cs : List Char) : Option (List Char) :=
  match cs with
  | a :: b :: c :: ' ' :: rest =>
    match monthNames.idxOf? (chars [a,b,c]), rest.span Char.isDigit with
    | some month, (day,',' :: ' ' :: y1 :: y2 :: y3 :: y4 :: ' ' :: h1 :: h2 :: ':' :: n1 :: n2 :: []) =>
      if (day.length == 1 || day.length == 2) && [y1,y2,y3,y4,h1,h2,n1,n2].all Char.isDigit then
        some ([y1,y2,y3,y4] ++ ['-'] ++ (listOf (pad2 (month+1))) ++ ['-'] ++
          (if day.length == 1 then '0' :: day else day) ++ ['T',h1,h2,':',n1,n2])
      else none
    | _, _ => none
  | _ => none

private def shortStamp (cs : List Char) : Option String :=
  (parseStamp cs).map fun (_,m,d,time) =>
    chars m ++ "/" ++ chars d ++ match time with
      | some (h,n) => " " ++ chars h ++ chars n
      | none => ""

/-- New specification for owner review: a recorded date-time as `MM/DD HHMM`
and a recorded ISO date as `MM/DD`, for shift grids. Anything else, and any
impossible date or time, is shown as recorded. -/
def clinicalTime (raw : String) : String :=
  match humanStamp (listOf raw) with
  | some iso => (shortStamp iso).getD raw
  | none => (shortStamp (listOf raw)).getD raw

/-- New specification for owner review: chart history keeps the year:
`MM/DD/YYYY HHMM`. -/
def clinicalTimestamp (raw : String) : String :=
  let stamp := (humanStamp (listOf raw)).getD (listOf raw)
  match parseStamp stamp with
  | some (y,m,d,time) =>
    chars m ++ "/" ++ chars d ++ "/" ++ chars y ++ match time with
      | some (h,n) => " " ++ chars h ++ chars n
      | none => ""
  | none => raw

/-- New specification for owner review: an epoch minute in UTC, labelled UTC, in the form of the work lists
(`Deficiencies.utcText`). Not a number: shown as recorded. -/
def utcMinute (raw : String) : String :=
  match raw.toInt? with
  | some minute =>
    let (y,m,d) := civil (Int.fdiv minute 1440)
    let t := (Int.fmod minute 1440).toNat
    toString y ++ "-" ++ pad2 m ++ "-" ++ pad2 d ++ " " ++ pad2 (t / 60) ++ ":" ++ pad2 (t % 60) ++ " UTC"
  | none => raw

/-! ## Medication directions and allergies -/

private def sigIntervals : List (String × String) :=
  [("every four to six hours","every 4–6 h"),("every four hours","every 4 h"),("every six hours","every 6 h"),
   ("every eight hours","every 8 h"),("every twelve hours","every 12 h"),("once a day","daily"),("once daily","daily"),
   ("twice a day","BID"),("three times a day","TID"),("four times a day","QID")]

/-- A number: digits, optionally a point and more digits; then the rest. -/
private def number (cs : List Char) : Option (List Char × List Char) :=
  match cs.span Char.isDigit with
  | ([],_) => none
  | (whole,'.' :: rest) =>
    match rest.span Char.isDigit with
    | ([],_) => some (whole,'.' :: rest)
    | (fraction,after) => some (whole ++ '.' :: fraction,after)
  | (whole,rest) => some (whole,rest)

/-- `amount [unit], Nx per P (d|h|wk|mo)`: the structured form of generated
prescriptions. -/
private def structuredSig (cs : List Char) : Option String := do
  let (amount,rest) ← number cs
  let (supplied,rest) := match rest.span Char.isWhitespace with
    | (ws,after) =>
      match after.span Char.isAlpha with
      | (word,tail) => if !ws.isEmpty && !word.isEmpty then (some word,tail) else (none,rest)
  let rest ← dropPrefix [','] rest
  let (frequency,rest) ← (some ((rest.dropWhile Char.isWhitespace).span Char.isDigit)).filter (!·.1.isEmpty)
  let rest ← dropPrefix (listOf "x per ") rest
  let (period,rest) ← number rest
  let per := chars (rest.dropWhile Char.isWhitespace)
  guard (["d","h","wk","mo"].contains per.toLower)
  let times := chars frequency
  let timing := if chars period == "1" && per.toLower == "d" then
      (([("1","daily"),("2","BID"),("3","TID"),("4","QID")] : List (String × String)).lookup times).getD
        (times ++ " times daily")
    else times ++ (if times == "1" then " time" else " times") ++ " every " ++ chars period ++ " " ++ per
  some (" ".intercalate ([chars amount] ++ (supplied.map chars).toList ++ [timing]))

/-- New specification for owner review: medication directions. The structured
quantity and frequency form and the listed interval phrases are rephrased;
they are never rescheduled, and any other direction keeps its wording. -/
def formatSig (raw : String) : String :=
  let text := cleanClinicalText raw
  match structuredSig (listOf text) with
  | some sig => sig
  | none => (sigIntervals.lookup text.toLower).getD text

/-- New specification for owner review: a medication with its directions. -/
def formatMedicationLine (name sig : String) : String :=
  let directions := formatSig sig
  if directions == "" then cleanClinicalText name else cleanClinicalText name ++ ": " ++ directions

private def allergyStates : List String :=
  ["(active)","(inactive)","(resolved)","(unconfirmed)","(confirmed)","(refuted)","(entered-in-error)"]

/-- An explicit negative allergy statement: its wording and state suffix. -/
private def negativeAllergy (text : String) : Option String :=
  ["no known drug allergy","no known drug allergies","no known allergy","no known allergies","nkda","nka"].findSome?
    fun phrase =>
      match dropPrefixCI (listOf phrase) (listOf text) with
      | some rest =>
        let display := if hasSub phrase "drug" || phrase == "nkda" then "No Known Drug Allergies" else "No Known Allergies"
        if rest.isEmpty then some display
        else if rest.head?.any Char.isWhitespace &&
            allergyStates.contains (chars ((rest.dropWhile Char.isWhitespace).map Char.toLower)) then
          some (display ++ chars rest)
        else none
      | none => none

/-- New specification for owner review: the allergy summary. Only an explicit
negative statement reads "No Known Allergies"; an absent record never does. -/
def allergyDisplay (raw : String) : String :=
  let text := cleanClinicalText raw
  match negativeAllergy text with
  | some display => display
  | none =>
    if text == "" || ["no allergy records on file","not recorded","not documented","unknown",
        "allergies not on file"].contains text.toLower then "Allergies not on file"
    else text

/-- New specification for owner review: a compact summary line: a negative
allergy, a medication with directions after ` — `, or directions. -/
def formatClinicalRecord (raw : String) : String :=
  if (negativeAllergy (cleanClinicalText raw)).isSome then allergyDisplay raw else
  match raw.splitOn " — " with
  | name :: first :: more =>
    let low := name.toLower
    if name != "" && ((words low).zip ((words low).drop 1)).any (fun (a,b) => a == "oral" && (b == "tablet" || b == "capsule"))
    then formatMedicationLine name (" — ".intercalate (first :: more))
    else formatSig raw
  | _ => formatSig raw

/-! ## Vital-sign summary lines -/

private def vitalAliases : List (String × String) :=
  [("Heart rate","P"),("Respiratory rate","RR"),("Body temperature","T"),("Temperature","T"),("SpO2","SpO2"),
   ("Oxygen saturation in Arterial blood","SpO2"),("Oxygen saturation in Arterial blood by Pulse oximetry","SpO2"),
   ("Body Weight","Wt"),("Body Height","Ht"),("Weight","Wt"),("Height","Ht"),("BP","BP")]

/-- New specification for owner review: one vital sign as a short line:
abbreviated name, value, unit and, when given, the recorded time. Only the
listed vital signs are abbreviated; any other measure has no short line. -/
def vitalCaption (name value unitText recorded : String) : Option String :=
  let short := match vitalAliases.lookup name with
    | some alias => some alias
    | none =>
      let clinical := clinicalName name
      if ["bp","systolic bp","diastolic bp","pain score","bmi"].contains clinical.toLower then some clinical else none
  short.map fun label =>
    let u := clinicalUnit unitText
    let suffix := if u == "score" && label.toLower.endsWith "score" then "" else if u == "%" then "%"
      else if u == "" then "" else " " ++ u
    label ++ " " ++ observationValue value ++ suffix ++
      (if recorded == "" then "" else " · " ++ clinicalTimestamp recorded)

private def legacyVitalNames : List String :=
  ["Body Height","Body Weight","Weight","Height","Systolic BP","Diastolic BP","BP","Temperature","SpO2","Pain score",
   "Body mass index (BMI) [Ratio]","Pain severity - 0-10 verbal numeric rating [Score] - Reported",
   "Blood pressure panel with all children optional","Heart rate","Respiratory rate","Body temperature",
   "Oxygen saturation in Arterial blood by Pulse oximetry","Oxygen saturation in Arterial blood"]

private def plainNumber (cs : List Char) : Bool :=
  match number cs with
  | some (digits,[]) => digits.getLast? != some '.'
  | _ => false

/-- A value `120`, `98.6`, `-1.5` or a pair `120/80`. -/
private def vitalValue (cs : List Char) : Bool :=
  let body := match cs with
    | '-' :: rest => rest
    | _ => cs
  match body.span (· != '/') with
  | (first,[]) => plainNumber first
  | (first,_ :: second) => plainNumber first && plainNumber second

/-- New specification for owner review: the renderer's one-line vital summary
`Name value unit (recorded)` as a short line. Only the listed vital signs. -/
def compactVitalRecord (raw : String) : Option String :=
  legacyVitalNames.findSome? fun name =>
    match dropPrefix (listOf (name ++ " ")) (listOf raw) with
    | some rest =>
      match rest.span (· != ' ') with
      | (value,' ' :: afterValue) =>
        match afterValue.span (· != ' ') with
        | (unitText,' ' :: '(' :: tail) =>
          match tail.reverse with
          | ')' :: recorded =>
            if vitalValue value && !unitText.isEmpty && !recorded.isEmpty &&
                recorded.all (fun c => c != '(' && c != ')') then
              vitalCaption name (chars value) (chars unitText) (chars recorded.reverse)
            else none
          | _ => none
        | _ => none
      | _ => none
    | none => none

/-! ## Captions and values -/

/-- New specification for owner review: what an empty table says. -/
def emptyInfo (infoId : String) : String :=
  if infoId == "orderCatalog" then "Search to add orders"
  else if infoId == "allergyList" then "Allergies not on file"
  else "No records on file"

private def smallWords : List String := ["and","or","of","to","for","in","with","the","a","an"]
private def unitWords : List String := ["kg","mg","mcg","mL","cm","mmHg"]

/-- New specification for owner review: a section or table caption in title
case. Code-system tags such as `(LOINC)` are dropped; units, acronyms and
mixed-case words keep their spelling; small words inside the caption are
lower case. -/
def sectionCaption (raw : String) : String :=
  let cs := (listOf raw)
  chars (mapWords (fun first word =>
    if word.length < 2 || !word.all Char.isAlpha then word
    else if unitWords.contains (chars word) || (word.filter Char.isUpper).length ≥ 2 then word
    else if !first && smallWords.contains (chars word).toLower then word.map Char.toLower
    else match word with
      | c :: rest => c.toUpper :: rest
      | [] => []) (dropTagged codeSystems (fun _ => true) (cs.length + 1) cs))

/-- New specification for owner review: a field label in sentence case.
Code-system tags are dropped; a capitalised word after the first is written in
lower case; acronyms keep their spelling. -/
def fieldCaption (raw : String) : String :=
  if equalsCI raw "enter medication" then "Medication" else
  let cs := (listOf raw)
  chars (mapWords (fun first word =>
    match word with
    | c :: rest => if c.isUpper && !rest.isEmpty && rest.all Char.isLower && !first then c.toLower :: rest else word
    | [] => []) (dropTagged codeSystems (fun _ => true) (cs.length + 1) cs))

/-- New specification for owner review: a button label without workflow
annotations. -/
def controlCaption (raw : String) : String :=
  if raw.startsWith "Open chart:" then "Open chart" else
  let cs := (listOf raw)
  let trimmed := ["(human entry)","(human entry only)"].findSome? fun tag =>
    if (chars (cs.drop (cs.length - tag.length))).toLower == tag then
      some (((cs.take (cs.length - tag.length)).reverse.dropWhile Char.isWhitespace).reverse)
    else none
  let s := chars (trimmed.getD cs)
  let s := if equalsCI s "confirm prefilled value" then "Confirm" else s
  match dropPrefixCI (listOf "template:") (listOf s) with
  | some rest => chars (rest.dropWhile Char.isWhitespace)
  | none => s

/-- New specification for owner review: column captions as displayed. -/
def columnCaption (raw : String) : String :=
  if raw == "Entered response" then "Response" else if raw == "Referenced prescription" then "Prescription" else raw

/-- New specification for owner review: a source text that names an internal
binding rather than a clinical source. -/
def internalSource (raw : String) : Bool :=
  let low := raw.toLower
  ["record:","capture:","macro:","context:","template:"].any (fun head => low.startsWith head) ||
    ["human entry only","clinician entry required","referenced prescription","entered response"].contains low

/-- New specification for owner review: a prefill source without a caption of
its own. -/
def provenance (source : String) : String :=
  if source.startsWith "record:" then "From chart" else if source.startsWith "linked:" then "Linked value"
  else if source == "default" then "Default value" else if source == "macro" then "Template draft" else source

/-- New specification for owner review: the displayed form of a recorded
value in a table, list or banner. A one-line vital summary is shortened; an
ISO date reads `05 Jan 2024`; otherwise medication lines, coded names, units,
states, encounter classes, age and sex, durations and date-times are put in
their clinical form, and any other text is shown as recorded. -/
def displayValue (value : String) : String :=
  match compactVitalRecord value with
  | some caption => caption
  | none =>
    match (listOf value) with
    | [y1,y2,y3,y4,'-',m1,m2,'-',d1,d2] =>
      match natOf [y1,y2,y3,y4], natOf [m1,m2], natOf [d1,d2] with
      | some y, some m, some d =>
        if validDate y m d then chars [d1,d2] ++ " " ++ (monthNames[m-1]?).getD "" ++ " " ++ chars [y1,y2,y3,y4] else value
      | _, _, _ => value
    | _ => clinicalTimestamp (clinicalDuration (ageSex (encounterClass (clinicalStatus (clinicalUnit (clinicalName
        (formatClinicalRecord value)))))))

/-- New specification for owner review: the text of a table cell. Narrative
(`Text`, `Title`) is never reworded; an internal source reads "Source
details"; medication instructions are directions; a `Value` or `Result` is a
rounded observation; the times of a late-entry line are UTC instants. -/
def cellText (infoId : String) (row : List (String × String)) (key raw : String) : String :=
  if key == "Text" || key == "Title" then raw
  else if key == "Source" && internalSource raw then
    (if columnCaption raw == raw then "Source details" else columnCaption raw)
  else if infoId == "entryTimes" && (key == "Observed" || key == "Signed") then utcMinute raw
  else if key == "Instructions" && infoId == "currentMeds" && (row.lookup "Medication").isSome then
    displayValue (formatSig raw)
  else if key.toLower == "value" || key.toLower == "result" then displayValue (observationValue raw)
  else displayValue raw

/-- New specification for owner review: the displayed value of a field. A flag
reads Yes or No; an observation time is a UTC instant; a coded value without
an option is cleaned; every other value is shown as recorded. -/
def fieldValue (kind raw : String) : String :=
  let base := (kind.splitOn ":").headD ""
  if base == "flag" then (if raw == "true" then "Yes" else if raw == "false" then "No" else raw)
  else if base == "observation-time" then utcMinute raw
  else if base == "code" || base == "coded" then cleanClinicalText raw
  else raw

/-- New specification for owner review: what an empty control shows. -/
def fieldPlaceholder (label kind : String) : String :=
  let low := label.toLower
  if kind == "search" then label
  else if kind != "select" then ""
  else if low == "medication" || low == "enter medication" || low == "drug" then "Search medications"
  else if hasSub low "route" then "Select route"
  else if hasSub low "frequency" || low == "freq" then "Select frequency"
  else if hasSub low "dose unit" then "Select dose unit"
  else if hasSub low "diagnos" || hasSub label "ICD" || hasSub low "icd" then "Search diagnoses"
  else if hasSub low "antibiotic indication" then "Select indication"
  else if low.startsWith "as needed" then "Select PRN status"
  else if hasSub low "substitution" then "Select substitution"
  else
    -- The caption without its parenthesised remarks, in lower case.
    let plain := ((listOf (fieldCaption label)).foldl (fun (state : List Char × Bool) c =>
      if state.2 then (state.1,c != ')')
      else if c == '(' then (state.1.dropWhile Char.isWhitespace,true)
      else (c :: state.1,false)) (([] : List Char),false)).1.reverse
    let subject := (chars (trimList plain)).toLower
    if subject.length > 32 then "Select an option" else "Select " ++ subject

/-- New specification for owner review: one banner field. Identity fields
keep their caption; age and sex read `83 y.o. F`; an empty value reads "Not
recorded"; allergies read through `allergyDisplay`, and a negative or absent
allergy statement stands without its caption. -/
def bannerField (key value : String) : String :=
  let low := key.toLower
  if hasSub low "allerg" then
    let shown := allergyDisplay value
    if shown == "Allergies not on file" || shown.startsWith "No Known " then shown else key ++ ": " ++ shown
  else if low.startsWith "age" && low.endsWith "sex" then key ++ ": " ++ displayValue (ageSex value)
  else key ++ ": " ++ (if value.trimAscii.toString == "" then "Not recorded" else displayValue (encounterClass value))

#guard utcInstant 0 0 == "1970-01-01 00:00:00 UTC"
#guard utcInstant 951782400 0 == "2000-02-29 00:00:00 UTC"
#guard utcInstant 1794787199 5 == "2026-11-15 23:59:59.000000005 UTC"
#guard utcInstant (-1) 0 == "1969-12-31 23:59:59 UTC"
#guard utcInstant 1709251200 0 == "2024-03-01 00:00:00 UTC"
#guard statusTone "Completed · 10:00" == "green" && statusTone "due-soon" == "yellow" && statusTone "H" == "red"
#guard statusTone "Done" == "green" && statusTone "donepezil" == "" && statusTone "not_given" == "gray"
#guard resultTone " HH " == "critical" && resultTone "L" == "low" && resultTone "" == ""
#guard statusColumn "Order status" && statusColumn "08:00" && statusColumn "8:00" && !statusColumn "Value"
#guard sectionTone "MAR" == "green" && sectionTone "Summary" == "blue" && sectionTone "Allergies" == "red"
#guard hundredths 405 == "4.05" && tenths 35 == "3.5"
-- The cases of the application's formatter tests.
#guard [("Gingivitis (disorder)","Gingivitis"),("Social isolation (finding) (active)","Social isolation (active)"),
  ("Medication review due (situation)","Medication review due"),("Every six hours (qualifier value)","Every six hours"),
  ("Mold (organism); Animal dander (substance)","Mold; Animal dander"),
  ("The label (substance) is literal","The label (substance) is literal"),("Diabetes (type 1)","Diabetes (type 1)"),
  ("Amoxicillin 250 MG Oral Capsule","Amoxicillin 250 mg oral capsule"),
  ("Naloxone 4 MG/0.1 ML nasal spray","Naloxone 4 mg/0.1 mL nasal spray"),("Albuterol 180 MCG","Albuterol 180 mcg"),
  ("MG antibodies","MG antibodies")].all fun (raw,shown) => cleanClinicalText raw == shown
#guard formatMedicationLine "lisinopril 10 MG Oral Tablet" "1, 1x per 1 d" == "lisinopril 10 mg oral tablet: 1 daily"
#guard formatClinicalRecord "lisinopril 10 MG Oral Tablet — 1, 1x per 1 d" == "lisinopril 10 mg oral tablet: 1 daily"
#guard formatMedicationLine "Amoxicillin 250 MG Oral Capsule" "2, 3x per 1 d" == "Amoxicillin 250 mg oral capsule: 2 TID"
#guard formatMedicationLine "lisinopril 10 MG Oral Tablet" "10 mg, 1x per 1 d" == "lisinopril 10 mg oral tablet: 10 mg daily"
#guard formatMedicationLine "lisinopril 10 MG Oral Tablet" "1 tab PO daily" == "lisinopril 10 mg oral tablet: 1 tab PO daily"
#guard formatSig "2 mg, 1x per 2 d" == "2 mg 1 time every 2 d" && formatSig "1, 2x per 6 h" == "1 2 times every 6 h"
#guard formatSig "Use according to the taper schedule" == "Use according to the taper schedule"
#guard formatSig "Twice a day" == "BID" && formatSig "1, 5x per 1 d" == "1 5 times daily"
#guard allergyDisplay "No allergy records on file" == "Allergies not on file" && allergyDisplay "" == "Allergies not on file"
#guard allergyDisplay "No known allergy (situation)" == "No Known Allergies"
#guard allergyDisplay "No known allergy (situation) (active)" == "No Known Allergies (active)"
#guard allergyDisplay "NKDA" == "No Known Drug Allergies" && allergyDisplay "Penicillin — anaphylaxis" == "Penicillin — anaphylaxis"
#guard fieldCaption "Enter Medication" == "Medication" && fieldCaption "BP Systolic" == "BP systolic"
#guard fieldCaption "As Needed (PRN)" == "As needed (PRN)" && fieldCaption "Diagnosis (ICD-10-CM)" == "Diagnosis"
#guard fieldCaption "Test (LOINC)" == "Test" && fieldCaption "Chief Complaint" == "Chief complaint"
#guard sectionCaption "H&P update (day of surgery)" == "H&P Update (Day of Surgery)"
#guard sectionCaption "Dosing weight (kg)" == "Dosing Weight (kg)" && sectionCaption "Review of systems" == "Review of Systems"
#guard fieldPlaceholder "Enter Medication" "select" == "Search medications" && fieldPlaceholder "Route" "select" == "Select route"
#guard fieldPlaceholder "Frequency" "select" == "Select frequency" && fieldPlaceholder "Visit Type (CPT)" "select" == "Select visit type"
#guard clinicalName "Hemoglobin [Mass/volume] in Blood" == "Hemoglobin"
#guard clinicalName "Natriuretic peptide.B prohormone N-Terminal [Mass/volume] in Serum or Plasma" == "NT-proBNP"
#guard clinicalName "Pain severity - 0-10 verbal numeric rating [Score] - Reported" == "Pain score"
#guard clinicalName "Hemoglobin A1c/Hemoglobin.total in Blood" == "Hemoglobin A1c/Hemoglobin.total in Blood"
#guard clinicalName "Glucose [Mass/volume] in Serum or Plasma" == "Glucose"
#guard clinicalName "Hemoglobin [Mass/volume] in Blood was discussed" == "Hemoglobin [Mass/volume] in Blood was discussed"
#guard clinicalStatus "booked" == "Scheduled" && clinicalStatus "preliminary" == "Prelim" && clinicalStatus "Not yet final" == "Not yet final"
#guard encounterClass "AMB" == "Office Visit" && encounterClass "OBSENC" == "OBSENC"
#guard ageSex "83 / F" == "83 y.o. F" && ageSex "Unknown / F" == "Unknown / F"
#guard clinicalTime "2026-11-02T06:00:18-08:00" == "11/02 0600" && clinicalTime "2026-11-02 -08:00" == "11/02"
#guard clinicalTime "2026-11-02 06:00 -08:00" == "11/02 0600" && clinicalTime "2026-11-01T01:30:00-07:00" == "11/01 0130"
#guard clinicalTime "Nov 2, 2026 06:00" == "11/02 0600" && clinicalTime "Feb 29, 2026 06:00" == "Feb 29, 2026 06:00"
#guard clinicalTime "2026-11-02T06:00:99-08:00" == "2026-11-02T06:00:99-08:00" && clinicalTime "2026-13-02" == "2026-13-02"
#guard clinicalTime "2026-11-02T24:00" == "2026-11-02T24:00" && clinicalTime "2026-11-02T06:00+24:00" == "2026-11-02T06:00+24:00"
#guard clinicalTimestamp "2026-11-02T06:00:18-08:00" == "11/02/2026 0600" && clinicalTimestamp "Nov 2, 2026 06:00" == "11/02/2026 0600"
#guard clinicalTimestamp "Nov 2, 2026" == "Nov 2, 2026" && clinicalTimestamp "2024-02-29" == "02/29/2024"
#guard clinicalDuration "165 min" == "2h 45m" && clinicalDuration "120 min" == "2h" && clinicalDuration "15 min" == "15m"
#guard clinicalDuration "every 165 min" == "every 165 min"
#guard clinicalUnit "mm[Hg]" == "mmHg" && clinicalUnit "{score}" == "score" && unit "mgPerKg" == "mg/kg"
#guard observationValue "13.777" == "13.78" && observationValue "1.005" == "1.01" && observationValue "0.0123" == "0.0123"
#guard observationValue "12.999" == "13" && observationValue "-2.5049" == "-2.5" && observationValue "<5.123" == "<5.123"
#guard observationValue "7.25" == "7.25" && observationValue "120" == "120" && observationValue "99.996" == "100"
#guard controlCaption "Request authorization (human entry)" == "Request authorization"
#guard controlCaption "Confirm prefilled value" == "Confirm" && controlCaption "Template: Brief op note" == "Brief op note"
#guard controlCaption "Open chart: Ada Synthetic" == "Open chart" && controlCaption "Sign" == "Sign"
#guard internalSource "Referenced prescription" && !internalSource "Patient-reported medication history"
#guard compactVitalRecord "Body Weight 70.5 kg (Nov 2, 2026 06:00)" == some "Wt 70.5 kg · 11/02/2026 0600"
#guard compactVitalRecord "BP 136/82 mm[Hg] (Nov 2, 2026)" == some "BP 136/82 mmHg · Nov 2, 2026"
#guard compactVitalRecord "SpO2 98 % (today)" == some "SpO2 98% · today" && compactVitalRecord "Glucose 98 mg/dL (today)" == none
#guard displayValue "2024-01-05" == "05 Jan 2024" && displayValue "2024-02-30" == "2024-02-30" && displayValue "active" == "Active"
#guard displayValue "Jan 5, 2024 10:30" == "01/05/2024 1030" && displayValue "Jan 5, 2024" == "Jan 5, 2024"
#guard displayValue "Take with food" == "Take with food" && displayValue "AMB" == "Office Visit"
#guard cellText "currentMeds" [("Medication","x"),("Instructions","1, 2x per 1 d")] "Instructions" "1, 2x per 1 d" == "1 BID"
#guard cellText "notes" [] "Text" "active (disorder)" == "active (disorder)" && cellText "labs" [] "Value" "13.777" == "13.78"
#guard cellText "entryTimes" [] "Observed" "29385581" == "2025-11-14 15:41 UTC" && utcMinute "0" == "1970-01-01 00:00 UTC"
#guard fieldValue "flag" "true" == "Yes" && fieldValue "observation-time" "29385581" == "2025-11-14 15:41 UTC"
#guard fieldValue "text" "active" == "active" && fieldValue "qty" "5.0" == "5.0"
#guard bannerField "Age / sex" "83 / F" == "Age / sex: 83 y.o. F" && bannerField "Language" "" == "Language: Not recorded"
#guard bannerField "Allergies" "No allergy records on file" == "Allergies not on file"
#guard bannerField "Allergies" "Penicillin — hives (severe)" == "Allergies: Penicillin — hives (severe)"
#guard bannerField "Last encounter" "AMB" == "Last encounter: Office Visit" && bannerField "DOB" "Jan 5, 1970" == "DOB: Jan 5, 1970"
end Ehr.Layout.Format
