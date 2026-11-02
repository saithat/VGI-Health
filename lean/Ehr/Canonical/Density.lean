import Ehr.Canonical.Builders

/-! Read-only chart overview and context, separate from clinical entry obligations. -/
namespace Ehr.Canonical.Density

def reviewBlocks : List Block :=
  [(.table, "encounterHistory", "Encounters"), (.panel, "encounterNotes", "Notes"),
   (.table, "labResults", "Results"), (.table, "currentMeds", "Medications"),
   (.table, "problemList", "Problems"), (.panel, "allergyList", "Allergies"),
   (.table, "chartImagingAll", "Imaging"), (.table, "immunizationHistory", "Immunizations"),
   (.table, "importedHistory", "History"), (.table, "chartCarePlan", "Care Plan"), (.table, "chartOpenOrders", "Orders")]

def cards : List (String × String × String × String) :=
  [("chartQuickView", "Quick View", "table", ""),
   ("chartProblems", "Active Problems · latest 8", "table", ""),
   ("chartMeds", "Active Medications · latest 8", "table", ""),
   ("allergyList", "Allergies", "table", ""),
   ("chartRecentResults", "Recent Results · 72 hours, latest 15", "results", ""),
   ("chartVitals", "Vitals · recent observations", "trend", ""),
   ("chartCareGaps", "Care Gaps / Health Maintenance", "worklist", ""),
   ("chartImmunizations", "Recent Immunizations", "table", ""),
   ("chartNotes", "Recent Notes · latest 5 excerpts", "notes", ""),
   ("chartOrders", "Active Orders · latest 12", "table", ""),
   ("chartImaging", "Recent Imaging", "table", ""),
   ("chartSocial", "Social / SDOH", "table", ""),
   ("chartEncounters", "Recent Encounters", "table", ""),
   ("chartED", "ED Triage / Course", "table", "P2"),
   ("chartPendingResults", "Pending Results", "table", "P2"),
   ("chartMarDue", "MAR · near chart time", "worklist", "P3"),
   ("chartIO", "Intake / Output", "table", "P3"),
   ("chartLines", "Lines / Drains / Precautions", "table", "P3"),
   ("growthChart", "Growth Measurements / References", "growth", "P4"),
   ("immunizationHistory", "Immunization Forecast", "table", "P4"),
   ("doseCheck", "Weight-based Dosing", "table", "P4"),
   ("chartProcedure", "Procedure / Case / POD", "table", "P5"),
   ("consentDocument", "Pre-op Checklist Evidence", "table", "P5"),
   ("intraopRecord", "Operative Record / Drains / EBL", "table", "P5")]

def chartNav (s : ScreenId) : List Component :=
  [{ group s "chartWorkspace" "Chart workspace" (collapsible := false) with tag := "nav" }] ++
  ([ ("chartSummary", "Summary"), ("chartReview", "Chart Review") ].filter (·.1 != s)).map fun (target, label) =>
    goto s ("chartWorkspace." ++ target) target label (parent := some "chartWorkspace")

def summary : Screen :=
  let s := "chartSummary"
  { id := s, title := "Chart Summary", workflow := "chart", components :=
    [banner s, searchC s "chartSearch" "chart" "Search chart",
     { group s "chartIndex" "Index" (collapsible := false) with tag := "chartIndex.layout.columns" }] ++
    cards.flatMap (fun (info, label, kind, owner) =>
      let tag := if owner == "" then "density.common" else "density." ++ owner
      [{ group s ("card." ++ info) label (parent := some "chartIndex") (collapsible := false) with tag },
       { table s ("card." ++ info ++ ".data") info label (parent := some ("card." ++ info)) with tag := tag ++ ".present." ++ kind }]) ++
    [{ group s "patientCare" "Patient care" (collapsible := false) with tag := "nav" }] ++
    ([("w1Rooming", "Visit Navigator"), ("w2Inbasket", "Result Review"),
      ("w3Triage", "ED Navigator"), ("w4Mar", "MAR"), ("w5Rooming", "Child Health Navigator"),
      ("w6PreOp", "Surgical Navigator"), ("w6Rounding", "Rounding"), ("w7Queue", "Refill Review")].map fun (target, label) =>
        goto s ("patientCare." ++ target) target label (parent := some "patientCare")) }

def review : Screen :=
  let s := "chartReview"
  { id := s, title := "Chart Review", workflow := "chart", components :=
    [banner s, searchC s "chartSearch" "chart" "Search chart"] ++
    tabStrip s "recordTabs" "Chart Review records" reviewBlocks }

def storyboard (s : ScreenId) : List Component :=
  [{ group s "storyboard" "Patient Storyboard" (collapsible := false) with tag := "layout.overview.storyboard.sidebar" }] ++
  ([ ("storyIdentity", "Patient"), ("storyPrecautions", "Code Status / Precautions"),
     ("allergyList", "Allergies"), ("storyTeam", "PCP / Attending / Care Team"),
     ("storyEncounter", "Encounter / Location / LOS"), ("storyWeight", "Weight (kg)"),
     ("vitals", "Recent Vitals"), ("storyMedCount", "Active Medications"),
     ("problemList", "Active Problems"), ("storyLastNote", "Last Note"),
     ("storyPharmacy", "Pharmacy"), ("chartReports", "Reports") ] : List (String × String)).map fun (info, label) =>
      panel s ("storyboard." ++ info) info label (parent := some "storyboard")

def contextBlocks (s : Screen) : List (String × String) :=
  if s.id == "chartSummary" || s.id == "chartReview" || s.id == "home" then [] else
  if s.id.endsWith "Orders" || s.id.endsWith "Labs" || s.id.endsWith "Sign" then
    [("chartOrders", "Active Orders"), ("chartRecentResults", "Recent Results"),
     ("allergyList", "Allergies"), ("storyWeight", "Measured Weight")]
  else if s.id.endsWith "Close" then
    [("chartQuickView", "Visit Summary / LOS"), ("problemList", "Diagnoses"),
     ("chartOrders", "Orders"), ("chartCarePlan", "Follow-up / Care Plan")]
  else if s.workflow == "W4" then
    [("chartMarSchedule", "MAR Schedule"), ("chartPRN", "PRN History"),
     ("relevantLabs", "Lab Triggers"), ("chartIO", "Intake / Output")]
  else if s.id == "w3Disposition" then
    [("chartED", "ED Course"), ("chartPendingResults", "Pending Results"), ("chartCarePlan", "Disposition / Bed Request")]
  else [("chartRecentResults", "Recent Results"), ("chartCareGaps", "Health Maintenance"), ("storyLastNote", "Last Note")]

def augment (s : Screen) : Screen :=
  let blocks := contextBlocks s
  { s with components := s.components ++ chartNav s.id ++ storyboard s.id ++
    [{ panel s.id "workspaceStatus" "chartStatus" "Workspace status" with tag := "layout.statusBar" }] ++
    (if blocks.isEmpty then [] else
      [{ group s.id "contextPanels" "Clinical Context" (collapsible := false) with tag := "contextPanels.layout.columns" }] ++
      blocks.flatMap fun (info, label) =>
        [group s.id ("contextPanels.card." ++ info) label (parent := some "contextPanels") (collapsible := false),
         { table s.id ("contextPanels.data." ++ info) info label (parent := some ("contextPanels.card." ++ info)) with tag := "present.table" }]) }

/-- Context and storyboard additions retain every original clinical component. -/
theorem augment_keeps (s : Screen) (c : Component) (h : c ∈ s.components) :
    c ∈ (augment s).components := by simp [augment, h]

def screens (source : List Screen) : List Screen := (source ++ [summary, review]).map augment

/-- Persona-specific cards are read-only, and their complete source tabs remain available. -/
def forOwner (owner : String) (s : Screen) : Screen :=
  { s with components := s.components.filter fun c =>
    !c.tag.startsWith "density.P" || (c.tag.splitOn ".")[1]? == some owner }

end Ehr.Canonical.Density
