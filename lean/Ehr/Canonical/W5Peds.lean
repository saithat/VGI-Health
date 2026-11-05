import Ehr.Canonical.Builders

/-!
W5: pediatric rooming, growth review, note, orders, vaccines and visit close.
The baseline separates growth review and repeats the billing diagnosis.
Prescribing retains today's kilogram weight and the sign-screen dose check.
Vaccination retains the required review and vaccine record fields.
-/

namespace Ehr.Canonical.W5

open Ehr.Canonical

/-- The pediatric encounter section list. -/
def nav : List (ScreenId × String) :=
  [("w5Rooming", "Rooming"), ("w5Growth", "Growth Charts"), ("w5Note", "Visit Note"),
   ("w5Orders", "Orders"),
   ("w5Immunizations", "Immunizations"), ("w5Close", "Sign Visit")]

/-- The chart-history tabs on W5 screens. -/
def chart : List Block :=
  [(.table, "encounterHistory", "Encounters"), (.panel, "priorNotes", "Notes"),
   (.table, "labResults", "Results"), (.table, "currentMeds", "Medications"),
   (.table, "problemList", "Problems"), (.table, "allergyList", "Allergies"),
   (.table, "imaging", "Imaging"), (.table, "immunizationHistory", "Immunizations")]

/-- The shell for a W5 screen. -/
def frame (s : ScreenId) : List Component := ambulatoryShell s nav chart

/-- Pediatric rooming: today's weight and growth measures, complaint, growth
chart, allergies, and medication reconciliation. -/
def rooming : Screen :=
  let s := "w5Rooming"
  { id := s, title := "Rooming", workflow := "W5"
    components := frame s ++ [
      clinicalSection s "reason" "Reason for visit",
      field s "chiefComplaint" "chiefComplaint" "Chief complaint" (parent := some "reason")
        (prefill := .fromRecord "appointmentReason"),
      clinicalSection s "measures" "Vitals and growth measurements",
      field s "weight" "weight" "Weight today (kg)" (parent := some "measures"),
      field s "height" "height" "Height (cm)" (parent := some "measures"),
      field s "headCircumference" "headCircumference" "Head circumference (cm)"
        (parent := some "measures"),
      field s "temperature" "temperature" "Temperature (°C)" (parent := some "measures"),
      field s "heartRate" "heartRate" "Pulse (beats/min)" (parent := some "measures"),
      field s "respRate" "respRate" "Respirations (/min)" (parent := some "measures"),
      clinicalSection s "allergyGroup" "Allergies",
      table s "allergies" "allergyList" "Allergy review" (parent := some "allergyGroup"),
      reviewBtn s "allergyList" "Mark allergies reviewed" (parent := some "allergyGroup") (feedback := true),
      clinicalSection s "medRec" "Medication review",
      table s "meds" "currentMeds" "Medications" (parent := some "medRec"),
      (let c := field s "decision0" "medRecDecision" "Medication 1: continue / stop / modify"
        (parent := some "medRec") (slot := .fixed 0)
       { c with tag := c.tag ++ ".context.currentMedication" }),
      (let c := field s "decision1" "medRecDecision" "Medication 2: continue / stop / modify"
        (parent := some "medRec") (slot := .fixed 1)
       { c with tag := c.tag ++ ".context.currentMedication" }),
      reviewBtn s "currentMeds" "Mark medications reviewed" (parent := some "medRec") (feedback := true),
      goto s "next" "w5Growth" "Review growth"
    ] }

/-- Growth review: the growth chart, percentiles, last visit. -/
def growth : Screen :=
  let s := "w5Growth"
  { id := s, title := "Growth Charts", workflow := "W5"
    components := frame s ++ [
      { trend s "growth" "growthChart" "Growth measurements over time" with tag := "present.growth" },
      panel s "lastVisit" "lastVisit" "Last visit",
      goto s "next" "w5Note" "Visit Note"
    ] }

/-- Pediatric documentation precedes prescribing. History remains sourced from
the chart; templates fill drafts and never attest that an exam was performed. -/
def note : Screen :=
  let s := "w5Note"
  { id := s, title := "Visit Note", workflow := "W5"
    components := frame s ++ [
      macroBtn s "wellChild" "w5WellChildTemplate" "Well-child note template",
      clinicalSection s "hpiSection" "History of present illness",
      field s "hpi" "hpi" "History from patient / caregiver" (parent := some "hpiSection"),
      clinicalSection s "rosSection" "Review of systems",
      field s "ros" "ros" "ROS" (parent := some "rosSection"),
      clinicalSection s "examSection" "Physical exam",
      field s "exam" "exam" "Exam findings" (parent := some "examSection"),
      clinicalSection s "assessmentSection" "Assessment & Plan",
      field s "visitDiagnosis" "visitDiagnosis" "Encounter diagnosis (ICD-10-CM)" (parent := some "assessmentSection"),
      field s "assessmentPlan" "assessmentPlan" "Problem-based assessment and plan" (parent := some "assessmentSection"),
      field s "anticipatoryGuidance" "anticipatoryGuidance" "Anticipatory guidance" (parent := some "assessmentSection")] ++
      tabStrip s "historyTabs" "Patient history"
        [(.table, "problemList", "Medical history"), (.table, "surgicalHistory", "Surgical history"),
         (.panel, "familyHistory", "Family history"), (.panel, "socialHistory", "Social history")] ++ [
      goto s "next" "w5Orders" "Place orders"
    ] }

/-- The pediatric composer: mg/kg dosing with a dose-check preview. -/
def orders : Screen :=
  let s := "w5Orders"
  { id := s, title := "Orders", workflow := "W5"
    components := frame s ++ orderComposer s {
      prefs := [("prefAmoxicillin", "w5PrefAmoxicillin", "Amoxicillin 45 mg/kg/dose BID × 10 days"),
                ("prefIbuprofen", "w5PrefIbuprofen", "Ibuprofen 10 mg/kg q6h PRN"),
                ("prefAcetaminophen", "w5PrefAcetaminophen", "Acetaminophen 15 mg/kg q6h PRN"),
                ("prefAzithromycin", "w5PrefAzithromycin", "Azithromycin 10 mg/kg daily × 3 days"),
                ("prefAlbuterol", "w5PrefAlbuterol", "Albuterol 0.1 mg/kg q4h PRN")]
      weightBased := true
      pharmacyPrefill := .fromRecord "preferredPharmacy"
      signScreen := "w5Sign" } }

/-- Sign orders (pediatrics). -/
def sign : Screen :=
  let s := "w5Sign"
  { id := s, title := "Sign Orders", workflow := "W5"
    components := frame s ++ [
      table s "orders" "orderSummary" "Orders to sign",
      table s "doseCheck" "doseCheck" "Weight-based dose check (kg / mg per dose)",
      panel s "allergies" "allergyList" "Allergies",
      table s "meds" "currentMeds" "Current medications",
      panel s "cures" "curesReport" "CURES report",
      alertC s "alert.drugAllergy" "drugAllergyOrder" "Drug–allergy match" (popup := false),
      alertC s "alert.interaction" "interactionOrder" "Severe interaction" (popup := false),
      alertC s "alert.doseRange" "doseRangeOrder" "Dose out of range" (popup := false),
      alertC s "alert.weightLb" "weightInLb" "Weight entered in pounds" (popup := false),
      field s "patientIdReentry" "patientIdReentry" "Re-enter patient ID (initials/sex/age)",
      commitBtn s "signOrders" "Sign orders",
      goto s "next" "w5Immunizations" "Immunizations",
      goto s "edit" "w5Orders" "Edit orders"
    ] }

/-- Immunizations: history and forecast, vaccines due (inline), allergies; the
vaccine record; Record. -/
def immunizations : Screen :=
  let s := "w5Immunizations"
  { id := s, title := "Immunizations", workflow := "W5"
    components := frame s ++ [
      { table s "history" "immunizationHistory" "Immunization history and forecast" with tag := "present.table" },
      alertC s "due" "immunizationsDueInline" "Immunizations due" (popup := false),
      panel s "allergies" "allergyList" "Allergies",
      macroBtn s "fluVaccine" "w5FluVaccine" "Influenza vaccine (from inventory)",
      clinicalSection s "record" "Administration details",
      field s "vaccine" "vaccine" "Vaccine" (parent := some "record"),
      field s "vaccineLot" "vaccineLot" "Lot number" (parent := some "record"),
      field s "vaccineManufacturer" "vaccineManufacturer" "Manufacturer" (parent := some "record"),
      field s "vaccineProvider" "vaccineProvider" "Administering provider" (parent := some "record"),
      field s "vaccineSite" "vaccineSite" "Site" (parent := some "record"),
      field s "vaccineRoute" "vaccineRoute" "Route" (parent := some "record"),
      clinicalSection s "education" "Vaccine Information Statement",
      field s "visGiven" "visGiven" "VIS given to patient / guardian before vaccination" (parent := some "education"),
      field s "visEditionDate" "visEditionDate" "VIS edition date" (parent := some "education"),
      commitBtn s "recordImmunization" "Record immunization",
      goto s "next" "w5Close" "Sign Visit"
    ] }

/-- Visit close: the note, diagnosis (twice), level of service, follow-up,
instructions, and anticipatory guidance; Sign note. -/
def close : Screen :=
  let s := "w5Close"
  { id := s, title := "Sign Visit", workflow := "W5"
    components := frame s ++ [
      { panel s "noteReview" "noteSummary" "Visit note review" with tag := "layout.document" },
      clinicalSection s "billing" "Level of Service",
      field s "claimDiagnosis" "claimDiagnosis" "Billing diagnosis (ICD-10-CM)" (parent := some "billing"),
      field s "levelOfService" "levelOfService" "E/M service level" (parent := some "billing"),
      clinicalSection s "followup" "Follow-up",
      field s "followUp" "followUp" "Return in" (parent := some "followup"),
      clinicalSection s "avs" "Patient Instructions / AVS",
      field s "patientInstructions" "patientInstructions" "Instructions for patient / family" (parent := some "avs"),
      goto s "editNote" "w5Note" "Edit visit note",
      commitBtn s "signNote" "Sign Visit"
    ] }

/-- A pediatric preference: fills the drug, mg/kg dose, unit, route,
frequency, duration, quantity, and refills of the current line. The dose in mg
is left for the clinician. -/
def pedsPreference (id : MacroId) (label : String) (drug mgPerKg route freq duration quantity : String) :
    Macro :=
  let c := cid "w5Orders"
  { id, label,
    steps := [.setValue (c "drug") drug, .setValue (c "doseMgPerKg") mgPerKg,
              .setValue (c "doseUnit") "mg", .setValue (c "route") route,
              .setValue (c "freq") freq, .setValue (c "duration") duration,
              .setValue (c "quantity") quantity, .setValue (c "refills") "0"] }

/-- The W5 macros. -/
def macros : List Macro := [
  pedsPreference "w5PrefAmoxicillin" "Amoxicillin 45 mg/kg/dose BID × 10 days"
    "amoxicillin" "45" "PO" "bid" "10 days" "200",
  pedsPreference "w5PrefIbuprofen" "Ibuprofen 10 mg/kg q6h PRN"
    "ibuprofen" "10" "PO" "q6h" "5 days" "100",
  pedsPreference "w5PrefAcetaminophen" "Acetaminophen 15 mg/kg q6h PRN"
    "acetaminophen" "15" "PO" "q6h" "5 days" "120",
  pedsPreference "w5PrefAzithromycin" "Azithromycin 10 mg/kg daily × 3 days"
    "azithromycin" "10" "PO" "daily" "3 days" "15",
  pedsPreference "w5PrefAlbuterol" "Albuterol 0.1 mg/kg q4h PRN"
    "albuterol" "0.1" "inhaled" "q4h" "30 days" "1",
  textMacro "w5FluVaccine" "Influenza vaccine (from inventory)"
    [(cid "w5Immunizations" "vaccine", "150"),
     (cid "w5Immunizations" "vaccineLot", "FLU24-0931"),
     (cid "w5Immunizations" "vaccineRoute", "IM")],
  textMacro "w5WellChildTemplate" "Well-child template (age 6)"
    [(cid "w5Note" "hpi", "Here for a well-child visit. No concerns from parent. Eating well, sleeping well, doing well in school."),
     (cid "w5Note" "ros", "Negative in all systems per parent."),
     (cid "w5Note" "exam", "Well appearing, growing along curves. HEENT normal. Heart regular, no murmur. Lungs clear. Abdomen soft. Skin clear."),
     (cid "w5Note" "anticipatoryGuidance", "Booster seat, helmet use, water safety, screen time, dental care, healthy diet and activity.")]
]

/-- The W5 screens. -/
def screens : List Screen := [rooming, growth, note, orders, sign, immunizations, close]

end Ehr.Canonical.W5
