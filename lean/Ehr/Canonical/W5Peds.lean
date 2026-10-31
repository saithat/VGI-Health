import Ehr.Canonical.Builders

/-!
# W5: pediatric visit (P4, pediatric NP)

Rooming (today's weight in kg, growth chart, allergies, medication
reconciliation) → growth review → weight-based (mg/kg) orders with a dose
check → sign orders → immunizations → visit close with anticipatory guidance
(sign note).

Deliberate friction: the dosing weight is displayed again in the composer (linked from weight); the
dose is typed in mg after the mg/kg (the composer shows the calculation but
does not fill it); the growth chart is reviewed on its own screen; the visit
diagnosis is typed again for billing.
Kept: today's weight in kg; the dose check on the sign screen; the allergy list
and immunization history on the immunization screen (or a receipt); vaccine,
lot, site, route, and VIS recorded every time.
-/

namespace Ehr.Canonical.W5

open Ehr.Canonical

/-- The W5 navigator (the sign screen is reached from the composer). -/
def nav : List (ScreenId × String) :=
  [("w5Rooming", "Rooming"), ("w5Growth", "Growth"), ("w5Orders", "Orders"),
   ("w5Immunizations", "Immunizations"), ("w5Close", "Visit close")]

/-- The chart-review tabs on W5 screens. -/
def chart : List Block :=
  [(.trend, "growthChart", "Growth chart"), (.table, "immunizationHistory", "Immunizations"),
   (.table, "labResults", "Results"), (.panel, "priorNotes", "Notes"),
   (.panel, "familyHistory", "Family history"), (.table, "careGapList", "Care gaps")]

/-- The shell for a W5 screen. -/
def frame (s : ScreenId) : List Component := shell s nav clinicSidebar chart

/-- Pediatric rooming: today's weight and growth measures, complaint, growth
chart, allergies, and medication reconciliation. -/
def rooming : Screen :=
  let s := "w5Rooming"
  { id := s, title := "Pediatric rooming", workflow := "W5"
    components := frame s ++ [
      group s "measures" "Measurements",
      field s "weight" "weight" "Weight today (kg)" (parent := some "measures"),
      field s "height" "height" "Height (cm)" (parent := some "measures"),
      field s "headCircumference" "headCircumference" "Head circumference (cm)"
        (parent := some "measures"),
      field s "temperature" "temperature" "Temperature" (parent := some "measures"),
      field s "heartRate" "heartRate" "Heart rate" (parent := some "measures"),
      field s "respRate" "respRate" "Respiratory rate" (parent := some "measures"),
      field s "chiefComplaint" "chiefComplaint" "Reason for visit",
      trend s "growth" "growthChart" "Growth chart",
      group s "allergyGroup" "Allergies",
      panel s "allergies" "allergyList" "Allergies" (parent := some "allergyGroup"),
      reviewBtn s "allergyList" "Mark allergies reviewed" (parent := some "allergyGroup"),
      group s "medRec" "Medication reconciliation",
      table s "meds" "currentMeds" "Medications" (parent := some "medRec"),
      field s "decision0" "medRecDecision" "Medication 1: continue / stop / modify"
        (parent := some "medRec") (slot := .fixed 0),
      field s "decision1" "medRecDecision" "Medication 2: continue / stop / modify"
        (parent := some "medRec") (slot := .fixed 1),
      goto s "next" "w5Growth" "Next: growth review"
    ] }

/-- Growth review: the growth chart, percentiles, last visit. -/
def growth : Screen :=
  let s := "w5Growth"
  { id := s, title := "Growth review", workflow := "W5"
    components := frame s ++ [
      trend s "growth" "growthChart" "Growth chart (weight, height, head)",
      table s "percentiles" "growthChart" "Percentiles",
      panel s "lastVisit" "lastVisit" "Last visit",
      goto s "next" "w5Orders" "Next: orders"
    ] }

/-- The pediatric composer: mg/kg dosing with a dose-check preview. -/
def orders : Screen :=
  let s := "w5Orders"
  { id := s, title := "Orders (weight-based)", workflow := "W5"
    components := frame s ++ orderComposer s {
      prefs := [("prefAmoxicillin", "w5PrefAmoxicillin", "Amoxicillin 45 mg/kg/dose BID × 10 days"),
                ("prefIbuprofen", "w5PrefIbuprofen", "Ibuprofen 10 mg/kg q6h PRN"),
                ("prefAcetaminophen", "w5PrefAcetaminophen", "Acetaminophen 15 mg/kg q6h PRN"),
                ("prefAzithromycin", "w5PrefAzithromycin", "Azithromycin 10 mg/kg daily × 3 days"),
                ("prefAlbuterol", "w5PrefAlbuterol", "Albuterol 0.1 mg/kg q4h PRN")]
      weightBased := true
      signScreen := "w5Sign" } }

/-- Sign orders (pediatrics). -/
def sign : Screen :=
  let s := "w5Sign"
  { id := s, title := "Sign orders", workflow := "W5"
    components := frame s ++ [
      table s "orders" "orderSummary" "Orders to sign",
      panel s "doseCheck" "doseCheck" "Dose check (mg/kg)",
      panel s "allergies" "allergyList" "Allergies",
      table s "meds" "currentMeds" "Current medications",
      panel s "cures" "curesReport" "CURES report",
      alertC s "alert.drugAllergy" "drugAllergyOrder" "Drug–allergy match" (popup := false),
      alertC s "alert.interaction" "interactionOrder" "Severe interaction" (popup := false),
      alertC s "alert.doseRange" "doseRangeOrder" "Dose out of range" (popup := false),
      alertC s "alert.weightLb" "weightInLb" "Weight entered in pounds" (popup := false),
      field s "patientIdReentry" "patientIdReentry" "Re-enter patient ID (initials/sex/age)",
      commitBtn s "signOrders" "Sign orders",
      goto s "next" "w5Immunizations" "Next: immunizations",
      goto s "edit" "w5Orders" "Edit orders"
    ] }

/-- Immunizations: history and forecast, vaccines due (inline), allergies; the
vaccine record; Record. -/
def immunizations : Screen :=
  let s := "w5Immunizations"
  { id := s, title := "Immunizations", workflow := "W5"
    components := frame s ++ [
      table s "history" "immunizationHistory" "Immunization history and forecast",
      alertC s "due" "immunizationsDueInline" "Immunizations due" (popup := false),
      panel s "allergies" "allergyList" "Allergies",
      macroBtn s "fluVaccine" "w5FluVaccine" "Influenza vaccine (from inventory)",
      group s "record" "Vaccine given",
      field s "vaccine" "vaccine" "Vaccine" (parent := some "record"),
      field s "vaccineLot" "vaccineLot" "Lot number" (parent := some "record"),
      field s "vaccineManufacturer" "vaccineManufacturer" "Manufacturer" (parent := some "record"),
      field s "vaccineProvider" "vaccineProvider" "Administering provider" (parent := some "record"),
      field s "vaccineSite" "vaccineSite" "Site" (parent := some "record"),
      field s "vaccineRoute" "vaccineRoute" "Route" (parent := some "record"),
      field s "visGiven" "visGiven" "VIS given" (parent := some "record"),
      field s "visEditionDate" "visEditionDate" "VIS edition date" (parent := some "record"),
      commitBtn s "recordImmunization" "Record immunization",
      goto s "next" "w5Close" "Next: visit close"
    ] }

/-- Visit close: the note, diagnosis (twice), level of service, follow-up,
instructions, and anticipatory guidance; Sign note. -/
def close : Screen :=
  let s := "w5Close"
  { id := s, title := "Visit close", workflow := "W5"
    components := frame s ++ [
      macroBtn s "wellChild" "w5WellChildTemplate" "Well-child template (age 6)",
      field s "hpi" "hpi" "History",
      field s "ros" "ros" "Review of systems",
      field s "exam" "exam" "Physical exam",
      field s "assessmentPlan" "assessmentPlan" "Assessment and plan",
      field s "visitDiagnosis" "visitDiagnosis" "Visit diagnosis (ICD-10)",
      field s "claimDiagnosis" "claimDiagnosis" "Billing diagnosis (ICD-10)",
      field s "levelOfService" "levelOfService" "Level of service",
      field s "followUp" "followUp" "Follow-up",
      field s "patientInstructions" "patientInstructions" "Instructions for family",
      field s "anticipatoryGuidance" "anticipatoryGuidance" "Anticipatory guidance",
      commitBtn s "signNote" "Sign note"
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
    [(cid "w5Close" "hpi", "Here for a well-child visit. No concerns from parent. Eating well, sleeping well, doing well in school."),
     (cid "w5Close" "ros", "Negative in all systems per parent."),
     (cid "w5Close" "exam", "Well appearing, growing along curves. HEENT normal. Heart regular, no murmur. Lungs clear. Abdomen soft. Skin clear."),
     (cid "w5Close" "anticipatoryGuidance", "Booster seat, helmet use, water safety, screen time, dental care, healthy diet and activity.")]
]

/-- The W5 screens. -/
def screens : List Screen := [rooming, growth, orders, sign, immunizations, close]

end Ehr.Canonical.W5
