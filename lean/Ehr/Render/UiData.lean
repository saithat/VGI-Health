import Ehr.Render.Page

/-! Human-readable clinical values. The source captures and interpreter guards
are untouched; order rows always use this episode's State, never medication history. -/
namespace Ehr.Render

/-- Include explicitly named antithrombotics in chart review even when they
are outside the small order-entry formulary. This display filter never assigns
a dose, hold plan or drug-interaction class. Generic names are matched at the
start of the recorded medication name, on a word boundary.
Sources: AHA Types of Heart Medications; MedlinePlus P2Y12 inhibitors. -/
def uiAntithrombotic (r : MedRow) : Bool :=
  let name := r.name.toLower
  inClass r.drug "anticoagulant" || inClass r.drug "antiplatelet" ||
    ["aspirin", "clopidogrel", "prasugrel", "ticagrelor", "ticlopidine", "cangrelor",
     "dabigatran", "rivaroxaban"].any (fun generic =>
       name == generic || name.startsWith (generic ++ " "))

def uiChars (cs : List Char) : String := cs.foldl String.push ""

/-- Public clinical headings for structured adapter fields. Unrecognized
headings remain intact, so this presentation step never discards source data. -/
def uiClinicalHeading (key : String) : String :=
  (([("time", "Time"), ("patient", "Patient"), ("task", "Visit type"),
     ("status", "Status"), ("received", "Received"), ("subject", "Subject"),
     ("sender", "From"), ("owner", "Owner"), ("priority", "Priority"),
     ("context", "Context"), ("test", "Test"), ("value", "Value"), ("unit", "Unit"),
     ("flag", "Flag"), ("referenceRange", "Range"), ("collectedAt", "Collected"),
     ("resultedAt", "Resulted"), ("hpi", "HPI"), ("ros", "ROS"),
     ("detail", "Detail"), ("requested", "Requested"), ("current", "On file"),
     ("proposed", "Proposed"), ("source", "Source"),
     ("exam", "Exam"), ("plan", "Assessment & Plan")] : List (String × String)).lookup key).getD key

/-- Format complete ISO dates/date-times for display, preserving the recorded
wall time. No timezone conversion or invented timestamp is performed. -/
def uiDate (s : String) : String :=
  let cs := s.toList
  let date := uiChars (cs.take 10)
  let isTime := cs.length ≥ 16 && cs[10]? == some 'T' && cs[13]? == some ':' &&
    (cs.drop 11 |>.all (fun c => c.isDigit || c == ':' || c == '.' || c == '+' || c == '-' || c == 'Z')) &&
    ((uiChars (cs.drop 11 |>.take 2)).toNat?.map (fun n => decide (n < 24))).getD false &&
    ((uiChars (cs.drop 14 |>.take 2)).toNat?.map (fun n => decide (n < 60))).getD false
  if isoDateValid date && (cs.length == 10 || isTime) then
    let y := uiChars (cs.take 4)
    let m := (uiChars (cs.drop 5 |>.take 2)).toNat!
    let d := (uiChars (cs.drop 8 |>.take 2)).toNat!
    let month := (["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]?).getD ""
    s!"{month} {d}, {y}" ++
      (if cs[10]? == some 'T' && cs.length ≥ 16 then " " ++ uiChars (cs.drop 11 |>.take 5) else "")
  else s

def uiCaptureText (x : Captured) : String :=
  match x.value with
  | .qty _ u => valueText x.value ++ if u == .none then "" else " " ++ unitName u
  | v => uiDate (valueText v)

/-- Refill response previews read the same captures as the ordinary fields.
The request projection supplies the finite detail headings; no value is copied
into the response and an unconfirmed prefill remains visibly unconfirmed. -/
def uiRefillComparisonRows (cx : Ctx) (rows : List (List (String × String))) :
    List (List (String × String)) :=
  rows.map fun row =>
    let element := ([("Dose", "refillDose"), ("Dispense quantity", "refillQuantity"),
      ("Refills", "refillRefills"), ("Pharmacy", "refillPharmacy")] : List (String × ElementId)).lookup
        ((row.lookup "Detail").getD "")
    let value := element.bind (capturedAt? cx.s · 0)
    let entered := match value with
      | none => "Not entered"
      | some x => uiCaptureText x ++ if x.confirmed then "" else " (unconfirmed)"
    if row.lookup "Proposed" == some "Awaiting clinician entry" then
      row.map fun (key, text) =>
        if key == "Proposed" && text == "Awaiting clinician entry" then ("Entered response", entered) else (key, text)
    else row ++ [("Entered response", entered)]

/-- Clinical columns captured on a medication-order line. Optional values are
omitted when absent; a global prescriber capture may be shared across lines. -/
def uiOrderRows (cx : Ctx) : List (List (String × String)) :=
  (orderLines cx.s).map fun (slot, drug) =>
    [("Line", toString (slot + 1)), ("Drug", drug)] ++
    ([ ("dose", "Dose"), ("route", "Route"), ("freq", "Frequency"),
       ("duration", "Duration"), ("quantity", "Quantity"), ("refills", "Refills"),
       ("prescriptionDirections", "Directions"), ("abxIndication", "Indication"),
       ("indication", "Indication"), ("controlledProductStrength", "Strength"),
       ("controlledDosageForm", "Dosage form"), ("earliestFillDate", "Earliest fill"),
       ("controlledPrescriberName", "Prescriber"), ("controlledPrescriberAddress", "Prescriber address"),
       ("prescriberFederalRegistration", "Registration"), ("institutionDeaInternalCode", "Institutional DEA / internal code")
      ] : List (String × String)).filterMap fun (element, label) =>
        let cap := capturedAt? cx.s element slot
        let cap := if element == "controlledPrescriberName" || element == "controlledPrescriberAddress" ||
            element == "prescriberFederalRegistration" || element == "institutionDeaInternalCode"
          then cap.orElse (fun _ => capturedAt? cx.s element 0) else cap
        cap.map fun x => (label, uiCaptureText x)

def uiOrderInfo (i : InfoId) : Bool :=
  i == "orderSummary" ||
    (["controlledSigningIssueDate", "controlledSigningPatientName", "controlledSigningDrugName",
      "controlledSigningStrength", "controlledSigningDosageForm", "controlledSigningQuantity",
      "controlledSigningDirections", "controlledSigningRefills", "controlledSigningEarliestFill",
      "controlledSigningPrescriberName", "controlledSigningPrescriberAddress", "controlledSigningDea"] : List String).contains i

/-- Format the interpreter's fixed-point values without changing their units. -/
def uiTenths (n : Nat) : String := s!"{n / 10}.{n % 10}"

/-- Display the same current weight, dose, frequency and range used by the
guard. Calculations remain previews; this function never captures a dose. -/
def uiDoseRows (cx : Ctx) : List (List (String × String)) :=
  let weight := weightKgTenths? cx.facts cx.s
  let recorded := ((cx.disp.vitals.filter (fun row => row.code == "29463-7" && row.unit == "kg" &&
    row.hundredths? == weight.map (· * 10))).head?).map (·.date)
  let humanWeight := (capturedAt? cx.s "weight" 0).any (fun value => value.byHuman && value.provenance?.isNone)
  let summary := [("Weight (kg)", weight.map uiTenths |>.getD "No confirmed kg weight"),
    ("Measured", if humanWeight then "Entered this encounter; measurement time not supplied"
      else recorded.map uiDate |>.getD "Measurement time not supplied")]
  summary :: (orderLines cx.s).map fun (slot, drug) =>
    let capture := fun element => capturedAt? cx.s element slot
    let enteredDose := (capture "dose").bind fun value => match value.value with
      | .qty amount unit => some (amount, unit) | _ => none
    let mgPerKg := (capture "doseMgPerKg").bind fun value => match value.value with
      | .qty n .mgPerKg => some n | _ => none
    let reference := lookupDrug drug
    let nativeRange := enteredDose.bind fun (_, unit) =>
      (drugDoseUnits drug).find? (fun rule => rule.unit == unit)
    let hasMgBasis := mgPerKg.isSome || enteredDose.any (fun (_, unit) => unit == .mg)
    [("Medication", drug)] ++ summary ++
    [("Basis", mgPerKg.map (fun value => uiTenths value ++ " mg/kg/dose") |>.getD "Entered dose"),
     ("Entered dose", (capture "dose").map uiCaptureText |>.getD "Not entered"),
     ("Frequency", (capture "freq").map uiCaptureText |>.getD "Not entered"),
     ("At entered frequency", (enteredDose.bind fun (dose, unit) =>
       (lineFreqPerDay? cx.s slot).map fun frequency => uiTenths (dose * frequency) ++ " " ++ unitName unit ++ "/day").getD "Not available"),
     ("Dose range", nativeRange.map (fun rule =>
       if rule.minTenths == 0 && rule.maxTenths == 0 then "No numeric limits supplied" else
       "Minimum: " ++ (if rule.minTenths == 0 then "not supplied" else uiTenths rule.minTenths) ++
       "; maximum: " ++ (if rule.maxTenths == 0 then "not supplied" else uiTenths rule.maxTenths) ++ " " ++ rule.unit.name)
       |>.getD "Select medication and dose unit")] ++
    (if !hasMgBasis then [] else [
     ("Calculated dose (mg)", (mgPerKg.bind fun basis => weight.map fun kg => uiTenths (basis * kg / 10)).getD "No mg/kg basis entered"),
     ("Weight-based range", reference.map (fun d => if d.minMgPerKgTenths == 0 && d.maxMgPerKgTenths == 0
       then "No weight-based range configured" else uiTenths d.minMgPerKgTenths ++ "–" ++ uiTenths d.maxMgPerKgTenths ++ " mg/kg/dose") |>.getD "Not configured"),
     ("Maximum per dose", reference.bind (fun d => if d.maxDoseMgTenths == 0 then none else some (uiTenths d.maxDoseMgTenths ++ " mg")) |>.getD "Not configured")]) ++ [
     ("Dose check", if doseOutOfRange cx.facts cx.s slot drug then "OUT OF RANGE" else
       if enteredDose.isNone || weight.isNone then "Incomplete — enter dose and current kg weight" else "No out-of-range flag")]

/-- Replace internal identifiers using the spec's own clinical labels. Keep the
reason's constraints (units, allowed values, receipt windows) intact. -/
def uiReasonText (cx : Ctx) (reason : String) : String :=
  let reason := if reason == "entry required: patientIdReentry" || reason == "human entry required: patientIdReentry"
    then "Re-enter patient ID (initials / sex / age) to sign" else reason
  let bindings := cx.sp.elements.map (fun e => (e.id, e.label)) ++
    cx.sp.infos.map (fun i => (i.id, i.label)) ++ cx.sp.commits.map (fun c => (c.id, c.label))
  let lookup := fun token =>
    match bindings.find? (fun (id, label) => id == token && label != "") with
    | some (_, label) => label
    | none => token
  let (out, token) := reason.toList.foldl (fun (out, token) c =>
    if c.isAlphanum || c == '_' || c == '.' then (out, token.push c)
    else ((out ++ lookup token).push c, "")) ("", "")
  out ++ lookup token

end Ehr.Render
