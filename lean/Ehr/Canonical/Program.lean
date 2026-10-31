import Ehr.Specs.V1
import Ehr.Canonical.W1Visit
import Ehr.Canonical.W2Results
import Ehr.Canonical.W3Ed
import Ehr.Canonical.W4Mar
import Ehr.Canonical.W5Peds
import Ehr.Canonical.W6Surgery
import Ehr.Canonical.W7Refills

/-!
# The canonical EHR program, version 1

The vendor's out-of-the-box UI program for spec v1. Every clinician starts with
it on day 1; the overnight agent then personalizes it. It covers workflows
W1–W7 (BRIEF section 5) on 43 screens, starting from the patient workspace.
-/

namespace Ehr.Canonical

/-- The patient workspace: the start screen. It has the banner, chart search,
the sidebar, a chart-review tab strip, and one button per workflow entry. -/
def home : Screen :=
  let s := "home"
  { id := s, title := "Patient workspace", workflow := "shell"
    components := [banner s, searchC s "chartSearch" "chart" "Search chart"] ++
      sidebar s clinicSidebar ++
      tabStrip s "chart" "Chart review"
        [(.table, "problemList", "Problem list"), (.table, "labResults", "Results"),
         (.panel, "priorNotes", "Notes"), (.table, "currentMeds", "Medications"),
         (.panel, "allergyList", "Allergies"), (.table, "encounterHistory", "Encounters"),
         (.panel, "coverage", "Coverage")] ++
      [group s "work" "Today's work" (collapsible := false)] ++
      ([("w1Rooming", "Clinic visit: start rooming"),
        ("w2Inbasket", "In-basket: results"),
        ("w7Queue", "In-basket: refill requests"),
        ("w3TrackBoard", "Emergency department: track board"),
        ("w4Worklist", "Ward: shift worklist and MAR"),
        ("w5Rooming", "Pediatric clinic: start rooming"),
        ("w6Consult", "Surgery: ED consult"),
        ("w6PreOp", "Surgery: pre-op"),
        ("w6OpNote", "Surgery: op note"),
        ("w6PostOp", "Surgery: post-op orders"),
        ("w6Rounding", "Surgery: rounding"),
        ("w6Discharge", "Surgery: discharge")].map fun (t, l) =>
          goto s ("work." ++ t) t l (parent := some "work")) }

/-- Workflow-scoped passive reminders remain inline on every targeted screen.
Existing local components retain their ids for regression patches. -/
def withWorkflowAlerts (s : Screen) : Screen :=
  let rules := if s.workflow == "W1" then
      [("careGapsInline", "Care gaps due"), ("duplicateTherapyInline", "Possible duplicate therapy")]
    else if s.workflow == "W5" then [("immunizationsDueInline", "Immunizations due")]
    else []
  { s with components := s.components ++ rules.filterMap fun (a, label) =>
      if s.components.any (fun c => match c.kind with | .alert b _ => a == b | _ => false)
      then none
      else some (alertC s.id ("workflowAlert." ++ a) a label false) }

/-- Honor every auto-linked declaration in the hospital spec. Copies remain
visible, but navigating does not ask the human to transcribe the source again. -/
def withRequiredLinks (s : Screen) : Screen :=
  { s with components := s.components.map fun c => match c.kind with
      | .field e slot _ =>
        match Specs.V1.specV1.elements.find? (·.id == e) with
        | some el => match el.linkedFrom? with
          | some src => if el.prefill == .autoLinked then
              { c with kind := .field e slot (.linked src) } else c
          | none => c
        | none => c
      | _ => c }

/-- **The canonical program, version 1** (spec "v1"). -/
def canonicalV1 : Program where
  id := "canonical"
  version := 1
  owner := "canonical"
  role := .physician
  specVersion := "v1"
  start := "home"
  screens := ([home] ++ W1.screens ++ W2.screens ++ W3.screens ++ W4.screens ++
    W5.screens ++ W6.screens ++ W7.screens).map (withRequiredLinks ∘ withWorkflowAlerts)
  macros := W1.macros ++ W2.macros ++ W3.macros ++ W4.macros ++ W5.macros ++
    W6.macros ++ W7.macros

end Ehr.Canonical
