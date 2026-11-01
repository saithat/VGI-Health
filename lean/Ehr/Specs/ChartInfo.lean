import Ehr.Core.Types

/-! Optional, read-only chart views. These add no entry, review, alert or commit rule. -/
namespace Ehr.Specs.ChartInfo

def infos : List InfoSpec :=
  ([("chartMarSchedule", "Complete MAR schedule"), ("chartPendingResults", "Active orders without linked final results"),
    ("chartOpenOrders", "Complete active orders"), ("chartImagingAll", "Complete imaging history"), ("chartStatus", "Workspace status"),
    ("chartMarDue", "MAR near chart time"),
    ("chartPRN", "PRN administrations"),
    ("chartQuickView", "Quick View"),
    ("chartProblems", "Recent active problems"),
    ("chartMeds", "Current medication preview"),
    ("chartRecentResults", "Results within 72 hours"),
    ("chartVitals", "Recent vital observations"),
    ("chartCareGaps", "Health maintenance reminders"),
    ("chartImmunizations", "Recent immunizations"),
    ("chartNotes", "Recent note excerpts"),
    ("chartOrders", "Active order preview"),
    ("chartImaging", "Recent imaging"),
    ("chartSocial", "Social history / SDOH"),
    ("chartEncounters", "Recent encounters"),
    ("chartCarePlan", "Care plans"),
    ("chartED", "ED encounter course"),
    ("chartIO", "Intake / output observations"),
    ("chartLines", "Lines and devices"),
    ("chartProcedure", "Surgical case and postoperative context"),
    ("storyIdentity", "Patient identifiers"),
    ("storyPrecautions", "Code status and precautions"),
    ("storyTeam", "Care team"),
    ("storyEncounter", "Encounter and length of stay"),
    ("storyWeight", "Measured weight"),
    ("storyMedCount", "Active medication count"),
    ("storyLastNote", "Latest note excerpt"),
    ("storyPharmacy", "Recorded pharmacy"),
    ("chartReports", "Department reports")] : List (String × String)).map fun (id, label) => { id, label, version := "" }

end Ehr.Specs.ChartInfo
