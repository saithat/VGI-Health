import Ehr.Render.UiData

/-! Vendor preference lists for ordinary coded fields. These are choices,
not clinical defaults, new validation rules, or a complete terminology service. -/
namespace Ehr.Render

/-- Common primary-care diagnoses, checked against CMS FY 2027 ICD-10-CM.
Source: https://www.cms.gov/files/zip/2027-code-descriptions-tabular-order.zip
Other codes remain enterable. This list is independent of simulation tasks. -/
def commonDiagnosisChoices : List UiCodeChoice :=
  [("I10", "Essential (primary) hypertension"),
   ("E11.9", "Type 2 diabetes mellitus without complications"),
   ("E78.5", "Hyperlipidemia, unspecified"),
   ("J06.9", "Acute upper respiratory infection, unspecified"),
   ("H66.90", "Otitis media, unspecified, unspecified ear"),
   ("J02.9", "Acute pharyngitis, unspecified"),
   ("Z00.00", "Encounter for general adult medical examination without abnormal findings"),
   ("Z00.129", "Encounter for routine child health examination without abnormal findings"),
   ("R05.9", "Cough, unspecified"), ("R50.9", "Fever, unspecified"),
   ("R10.9", "Unspecified abdominal pain"), ("M54.50", "Low back pain, unspecified"),
   ("F41.9", "Anxiety disorder, unspecified"), ("F32.A", "Depression, unspecified"),
   ("N39.0", "Urinary tract infection, site not specified"), ("R51.9", "Headache, unspecified"),
   ("J45.909", "Unspecified asthma, uncomplicated"),
   ("K21.9", "Gastro-esophageal reflux disease without esophagitis")].map fun (code, title) =>
    { code, label := code ++ " — " ++ title }

/-- A small laboratory preference list, not an inferred test or order.
Public term definitions: https://loinc.org/24323-8, /57021-8 and /4548-4. -/
def commonLabChoices : List UiCodeChoice :=
  [{ code := "24323-8", label := "Comprehensive metabolic panel — 24323-8" },
   { code := "57021-8", label := "CBC with automated differential — 57021-8" },
   { code := "4548-4", label := "Hemoglobin A1c — 4548-4" }]

/-- Presentation choices use the existing value-set names and exact entry codes.
An unlisted code is still allowed through the original interpreter and guards. -/
def uiValueSetChoices (name : String) : List UiCodeChoice :=
  let pairs : List (String × String) := match name with
    | "pain-0-10" => (List.range 11).map fun n => (toString n, toString n)
    | "phq2-score" => (List.range 7).map fun n => (toString n, toString n)
    | "yes-no" => [("yes", "Yes"), ("no", "No")]
    | "boolean" => [("true", "Yes"), ("false", "No")]
    | "tobacco-status" => [("never", "Never"), ("former", "Former"), ("current", "Current")]
    | "continue-stop-modify" => [("continue", "Continue"), ("stop", "Stop"), ("modify", "Modify")]
    | "approve-deny-modify" => [("approve", "Approve"), ("deny", "Deny"), ("modify", "Modify")]
    | "request-priority" => [("routine", "Routine"), ("urgent", "Urgent"), ("asap", "ASAP"), ("stat", "STAT")]
    | "route" => [("PO", "Oral (PO)"), ("IV", "Intravenous (IV)"),
        ("IM", "Intramuscular (IM)"), ("SC", "Subcutaneous (SC)")]
    | "frequency" => [("daily", "Daily"), ("bid", "Twice daily (BID)"),
        ("tid", "Three times daily (TID)"), ("qid", "Four times daily (QID)"),
        ("q4h", "Every 4 hours"), ("q6h", "Every 6 hours"),
        ("q8h", "Every 8 hours"), ("q12h", "Every 12 hours"), ("once", "Once")]
    | "duration" => [("1 dose", "One dose"), ("3 days", "3 days"), ("5 days", "5 days"),
        ("7 days", "7 days"), ("10 days", "10 days"), ("14 days", "14 days"),
        ("30 days", "30 days"), ("90 days", "90 days"), ("ongoing", "Ongoing")]
    | "follow-up-interval" => [("1 week", "1 week"), ("2 weeks", "2 weeks"),
        ("1 month", "1 month"), ("3 months", "3 months"), ("6 months", "6 months"),
        ("1 year", "1 year"), ("as needed", "As needed")]
    | "em-level" => [("99202", "99202 — New patient office visit"),
        ("99203", "99203 — New patient office visit"), ("99204", "99204 — New patient office visit"),
        ("99205", "99205 — New patient office visit"), ("99212", "99212 — Established patient office visit"),
        ("99213", "99213 — Established patient office visit"), ("99214", "99214 — Established patient office visit"),
        ("99215", "99215 — Established patient office visit")]
    | "result-action" => [("no action", "No further action"), ("repeat", "Repeat test"),
        ("refer", "Refer"), ("call", "Call patient")]
    | _ => []
  if name == "icd10" then commonDiagnosisChoices
  else if name == "loinc" then commonLabChoices
  else pairs.map fun (code, label) => { code, label }

/-- A value set contributes data around the unchanged ordinary field. -/
def uiWrapFieldChoices (cx : Ctx) (element : ElementId) (node : UiNode) : UiNode :=
  let choices := match (cx.sp.element? element).map (·.kind) with
    | some (.coded name) => uiValueSetChoices name
    | _ => []
  if choices.isEmpty then node else .valueSet choices true [node]

/-- The oral-route label sends the established PO code. -/
def oralRouteChoiceExample : Option UiCodeChoice :=
  (uiValueSetChoices "route").find? (·.code == "PO")
#guard oralRouteChoiceExample == some { code := "PO", label := "Oral (PO)" }

/-- Unknown value sets do not acquire invented choices. -/
def unknownChoicesExample : List UiCodeChoice := uiValueSetChoices "unknown-value-set"
#guard unknownChoicesExample.isEmpty

end Ehr.Render
