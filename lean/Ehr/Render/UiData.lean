import Ehr.Render.Page

/-! Human-readable clinical values. The source captures and interpreter guards
are untouched; order rows always use this episode's State, never medication history. -/
namespace Ehr.Render

def uiChars (cs : List Char) : String := cs.foldl String.push ""

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
