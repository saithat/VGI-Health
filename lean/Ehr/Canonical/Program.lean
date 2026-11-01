import Ehr.Specs.V1
import Ehr.Canonical.Rules
import Ehr.Canonical.CorePlacements
import Ehr.Canonical.Blueprint
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
W1–W7 (BRIEF section 5) on 46 screens, starting from the patient workspace.
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
         (.panel, "encounterNotes", "Notes"), (.table, "currentMeds", "Medications"),
         (.panel, "allergyList", "Allergies"), (.table, "encounterHistory", "Encounters"),
         (.panel, "coverage", "Coverage"), (.table, "importedHistory", "History")] ++
      [{ table s "schedule" "scheduleTasks" "Today's schedule" with tag := "present.schedule" },
       table s "openOrders" "openOrders" "Open orders",
       group s "work" "Activities" (collapsible := false)] ++
      ([("w1Rooming", "Schedule"),
        ("w2Inbasket", "In Basket: Results"),
        ("w7Queue", "In Basket: Rx Requests"),
        ("w3TrackBoard", "ED Track Board"),
        ("w4Worklist", "Unit Census & MAR"),
        ("w5Rooming", "Child Health"),
        ("w6Schedule", "OR Schedule"),
        ("w6Consults", "Consults"),
        ("w6Consult", "Consult note"),
        ("w6PreOp", "OR Schedule"),
        ("w6OpNote", "Op Note"),
        ("w6PostOp", "Post-op"),
        ("w6Rounding", "Rounding"),
        ("w6Discharge", "Discharge")].map fun (t, l) =>
          goto s ("work." ++ t) t l (parent := some "work")) }

/-- Workflow-scoped passive reminders remain inline on every targeted screen.
Existing local components retain their ids for regression patches. -/
def withWorkflowAlerts (s : Screen) : Screen :=
  let rules := (Specs.V1.specV1.alerts.filter fun a =>
    a.tier == .passive && a.screens.contains s.workflow).map fun a => (a.id, a.label)
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
          | none => match el.recordFact? with
            | some fact => if el.prefill == .recordConfirm then
                { c with kind := .field e slot (.fromRecord fact) } else c
            | none => c
        | none => c
      | _ => c }

/-- Keep every required review visible before its commit, including reviews
that apply only to another encounter type. The guard still checks applicability. -/
def withRequiredReviews (s : Screen) : Screen :=
  let missing := s.components.zipIdx.flatMap fun (c, n) => match c.kind with
    | .button (.commit k) => (Specs.V1.specV1.reviews.filter fun r => r.commit == k &&
        !((s.components.take n).any fun c => showsInfo r.info c.kind &&
          c.parent?.isNone && c.visibility == .always && c.size != .tiny)).map (·.info)
    | _ => []
  let panels := missing.eraseDups.map fun id =>
    panel s.id ("requiredReview." ++ id) id
      ((Specs.V1.specV1.info? id).map (·.label) |>.getD id)
  { s with components := s.components.take 1 ++ panels ++ s.components.drop 1 }

/-- **The canonical program, version 1** (spec "v1"). -/
def canonicalV1 : Program where
  patientSelection? := some true
  id := "canonical"
  version := 1
  owner := "canonical"
  role := .physician
  specVersion := "v1"
  start := "home"
  screens := (Blueprint.screens (let base := [home] ++ W1.screens ++ W2.screens ++ W3.screens ++ W4.screens ++
    W5.screens ++ W6.screens ++ W7.screens
    if Specs.ruleProfile == .full then Features.screens (Rules.screens base) else base.map CorePlacements.augment)).map
      (withRequiredLinks ∘ withWorkflowAlerts ∘ withRequiredReviews)
  macros := Blueprint.macros (W1.macros ++ W2.macros ++ W3.macros ++ W4.macros ++ W5.macros ++
    W6.macros ++ W7.macros)

end Ehr.Canonical
