import Ehr.Canonical.RulePlacements
import Ehr.Core.Basics

/-!
Shared builders for legal-content fields, reviews and actions.
Required review panels occupy open sections beside their commit controls.
-/
namespace Ehr.Canonical.Rules
open Ehr.Specs.V1

/-- Does the screen already contain this input? Reuse existing optional fields. -/
def hasField (s : Screen) (e : ElementId) : Bool := s.components.any fun c =>
  match c.kind with | .field id .. => id == e | _ => false

/-- Preserve an existing action, rather than adding duplicate signing buttons. -/
def hasCommit (s : Screen) (k : CommitId) : Bool := s.components.any fun c =>
  c.kind == .button (.commit k)

/-- A field groupKey per artifact keeps the expanded documentation organized. -/
def artifactFields (s : Screen) : List Component :=
  let declared := (fields.filter (·.1 == s.id)).map fun (_, _, e, perLine, groupKey) =>
    (e, perLine, groupKey)
  let commits := (actions.filter (·.1 == s.id)).map (·.2.2)
  let inherited := commits.flatMap fun k =>
    if issuanceCommits.contains k || specialtyCommits.contains k || (k == "signOrders" && s.id == "w7Sign") then
      ((specV1.entries.filter (fun r => r.commit == k && !r.perOrderLine)).map fun r =>
        (r.element, false, k))
    else []
  let wanted := (declared ++ inherited).filter fun (e, perLine, _) => !hasField s e && !(perLine && hasField s "drug" && s.id != "w7Decision")
  -- A single capture may serve several citations or actions on this screen.
  let unique := wanted.foldl (fun seen x =>
    if seen.any (fun y => y.1 == x.1) then seen else seen ++ [x]) []
  let dependencies : List ElementId := ["dispenseQuantity", "dispenseDose", "dispenseFrequency", "liquidFormulation", "weight"]
  let unique := unique.filter (fun x => dependencies.contains x.1) ++
    unique.filter (fun x => !dependencies.contains x.1)
  (unique.map (·.2.2)).eraseDups.flatMap fun groupKey =>
    let groupId := "legal." ++ groupKey
    [group s.id groupId ((specV1.commit? groupKey).map (·.label) |>.getD groupKey)
      (collapsible := false)] ++
    (unique.filter (·.2.2 == groupKey)).map fun (e, perLine, _) =>
      field s.id ("legal." ++ e) e ((specV1.element? e).map (·.label) |>.getD e)
        (parent := some groupId) (slot := if perLine then .current else .fixed 0)

/-- Every displayed review is pinned, including inherited pre-op and CURES reviews. -/
def artifactPanels (s : Screen) : List Component :=
  let commits := (actions.filter (·.1 == s.id)).map (·.2.2)
  let wanted := ((panels.filter (·.1 == s.id)).map (·.2) ++
    (commits.flatMap fun k => if issuanceCommits.contains k || specialtyCommits.contains k || (k == "signOrders" && s.id == "w7Sign") then
      (specV1.reviews.filter (·.commit == k)).map (·.info) else [])).eraseDups
  let absent := wanted.filter fun i => !s.components.any fun c =>
    c.kind == .panel i || c.kind == .table i || c.kind == .trend i
  if absent.isEmpty then [] else
    group s.id "legalReview" "Review" (collapsible := false) ::
    absent.map fun i => panel s.id ("legal." ++ i) i
      ((specV1.info? i).map (·.label) |>.getD i) (parent := some "legalReview")

/-- Per-line statutory prescription content next to each actual drug binding,
including fixed order-set rows. No copied patient/DEA value is fabricated. -/
def prescriptionFields (s : ScreenId) (pre : String) (slot : Slot) : List Component :=
  let wanted := (ruleEntries.filter (fun r => r.commit == "signOrders" && r.perOrderLine)
    |>.map (·.element)).eraseDups.filter fun e => !orderLineElements.any (·.id == e)
  let sections : List (String × String × List String) :=
    [("patient", "Prescription patient and prescriber", ["prescriptionPatientName", "prescriptionPatientAddress", "prescriberLicenseClassification"]),
     ("sig", "Directions and medical purpose", ["prescriptionDirections", "controlledMedicalPurpose", "ghbMedicalNeed"]),
     ("controlled", "Controlled prescription details", ["prescriberFederalRegistration", "controlledProductStrength", "controlledDosageForm", "controlledPrescriberName", "controlledPrescriberAddress"]),
     ("ready", "Select controlled prescriptions for signing", ["controlledReadyToSign"])]
  sections.flatMap fun (id, label, es) =>
    let g := pre ++ "legal." ++ id
    group s g label (collapsible := false) ::
    (wanted.filter es.contains).map (fun e => field s (pre ++ "legal." ++ e) e
      ((specV1.element? e).map (·.label) |>.getD e) (parent := some g) (slot := slot))

/-- The series earliest-fill field is also available on composers: the current
core's new-line stop checks all per-line requirements across artifact commits. -/
def withPrescriptionFields (s : Screen) : Screen :=
  if s.id == "w7Decision" then s else
  { s with components := s.components.flatMap fun c => match c.kind with
      | .field "drug" slot _ =>
        let pre := match slot with | .fixed n => rowPrefix n | .current => ""
        c :: (prescriptionFields s.id pre slot ++
          [field s.id (pre ++ "legal.earliestFillDate") "earliestFillDate"
            "Earliest fill date" (slot := slot)])
      | _ => [c] }

/-- Add legal outcomes where controlled substance questions already occur. -/
def withEducationOutcome (s : Screen) : Screen :=
  if !hasField s "naloxoneEducation" || hasField s "naloxoneEducationOutcome" then s else
  { s with components := s.components ++
    [field s.id "legal.naloxoneEducationOutcome" "naloxoneEducationOutcome"
      "Naloxone education outcome"] }

/-- Add reviewed artifact content and actions, preserving every existing component. -/
def augment (s : Screen) : Screen :=
  let additions := artifactFields s ++ artifactPanels s ++
    ((actions.filter (·.1 == s.id)).filterMap fun (_, _, k) =>
      if hasCommit s k then none else some (commitBtn s.id k
        ((specV1.commit? k).map (·.label) |>.getD k)))
  let inheritedAlerts := ((actions.filter (·.1 == s.id)).flatMap fun (_, _, k) =>
    (specV1.alerts.filter (·.commit == k)).filterMap fun a =>
      if s.components.any (fun c => match c.kind with | .alert id _ => id == a.id | _ => false)
      then none else some (alertC s.id ("legal.alert." ++ a.id) a.id a.label false))
  let before := s.components.takeWhile fun c => match c.kind with
    | .button (.commit _) => false | _ => true
  let after := s.components.drop before.length
  withEducationOutcome { s with components := before ++ additions ++ inheritedAlerts ++ after }

/-- Clinician-facing names never expose internal screen identifiers. -/
def screenTitle (id : ScreenId) : String :=
  if id == "w7Orders" then "New prescription"
  else if id == "w7Sign" then "Sign prescription"
  else if id == "w3Restraint" || id == "w4Restraint" then "Restraint order and episode"
  else if id == "w4SelfAdministration" then "Patient-managed and bedside medications"
  else if id == "w6Anesthesia" then "Anesthesia record"
  else
    let k := ((actions.find? (·.1 == id)).map (·.2.2)).getD ""
    ((specV1.commit? k).map (·.label)).getD "Clinical documentation"

/-- A dedicated medication authorization has the entire ordinary composer and
its pre-op fields; specialty notes receive the inherited identity field. -/
def newScreen (id workflow : String) : Screen :=
  let ks := (actions.filter (·.1 == id)).map (·.2.2)
  let issues := ks.any issuanceCommits.contains || id == "w7Orders"
  { id, workflow, title := screenTitle id
    components := shell id [] hospitalSidebar [] ++
      (if issues then orderComposer id { signScreen := if id == "w7Orders" then "w7Sign" else id, askWeight := true } else []) ++
      (if id == "w7Sign" then
         [goto id "toOrders" "w7Orders" "Edit new prescription"] else []) }

/-- New artifacts and cross-service links are reachable from the original
workflow. Ordinary same-workflow navigation is preserved, including W7's
single chart-review-to-decision route used by the permanent bad seed. Back
returns to the originating workflow without changing the patient/episode. -/
def screens (base : List Screen) : List Screen :=
  let ids : List (ScreenId × String) := ((Rules.actions.map (fun x => (x.1, x.2.1))) ++
    (Rules.fields.map (fun x => (x.1, x.2.1)))).eraseDups
  let extra := ids.filter (fun (id, _) => !base.any (·.id == id))
    |>.map fun (id, workflow) => newScreen id workflow
  (base ++ extra).map fun raw =>
    let s := withPrescriptionFields (augment raw)
    let targets := (routes ++ extra.map (fun s => (s.workflow, s.id))).eraseDups.filter fun (workflow, target) =>
      workflow == s.workflow && target != s.id &&
      (extra.any (·.id == target) || !(base.find? (·.id == target)).any (·.workflow == workflow))
    { s with components := s.components ++ (if targets.isEmpty then [] else
      group s.id "legalNav" "Related clinical documentation" (collapsible := false) ::
        targets.map fun (_, target) => goto s.id ("legalNav." ++ target) target (screenTitle target)
          (parent := some "legalNav")) }

end Ehr.Canonical.Rules
