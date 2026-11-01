import Ehr.Canonical.Features

/-! Screen migration for the reviewed canonical blueprint. All artifact inputs,
reviews, roles and actions are retained with their original component IDs. Old
screen destinations resolve to their clinical hosts; there are no alias screens.
Visibility.when is not in the current core language (CR-17); sections are open
and guards keep the original When/clinical applicability, including unknowns. -/
namespace Ehr.Canonical.Blueprint

/-- Exhaustive relocation ledger. Every non-base artifact has one clinical host. -/
def relocations : List (ScreenId × ScreenId) :=
  [("w1Consent", "w1Rooming"),
   ("w1Telehealth", "w1Rooming"),
   ("w1Delegation", "w1Orders"),
   ("w1EmergencyRxFollowup", "w1Orders"),
   ("w1ScheduleIISeries", "w1Orders"),
   ("w2AccessReview", "w2Result"),
   ("w3Consent", "w3Provider"),
   ("w3Telehealth", "w3Provider"),
   ("w3MinorConsent", "w3Provider"),
   ("w3SuicideAssessment", "w3Provider"),
   ("w3Hold", "w3Provider"),
   ("w3Restraint", "w3Provider"),
   ("w3Delegation", "w3Orders"),
   ("w3DirectDispense", "w3Orders"),
   ("w3EmergencyRxFollowup", "w3Orders"),
   ("w3ScheduleIISeries", "w3Orders"),
   ("w4VerbalOrder", "w4Worklist"),
   ("w4SelfAdministration", "w4Worklist"),
   ("w4Restraint", "w4Flowsheet"),
   ("w4SuicideAssessment", "w4Flowsheet"),
   ("w5Consent", "w5Rooming"),
   ("w5Telehealth", "w5Rooming"),
   ("w5MinorConsent", "w5Rooming"),
   ("w5OxygenOrder", "w5Orders"),
   ("w5EmergencyRxFollowup", "w5Orders"),
   ("w5ScheduleIISeries", "w5Orders"),
   ("w6Consent", "w6PreOp"),
   ("w6Anesthesia", "w6PreOp"),
   ("w6Telehealth", "w6ConsultClose"),
   ("w6Delegation", "w6Orders"),
   ("w6DirectDispense", "w6Orders"),
   ("w6EmergencyRxFollowup", "w6Orders"),
   ("w6ScheduleIISeries", "w6Orders"),
   ("w6Recovery", "w6OpNote"),
   ("w6StandingOrders", "w6PostOp"),
   ("w7EmergencyRxFollowup", "w7Orders"),
   ("w7ScheduleIISeries", "w7Orders"),
   ("feature.authorizeHivTest", "w1Rooming"),
   ("feature.authorizeIndependentMinorCare", "w1Rooming"),
   ("feature.authorizeMinorMentalHealthCare", "w1Rooming"),
   ("feature.authorizeMinorMoud", "w1Rooming"),
   ("feature.authorizeMinorPsychotropic", "w1Rooming"),
   ("feature.authorizeMinorSubstanceCare", "w1Rooming"),
   ("feature.recordAdvanceCareDecision", "w1Rooming"),
   ("feature.recordHivDecision", "w1Rooming"),
   ("feature.updateDemographics", "w1Rooming"),
   ("feature.verifyCareIdentity", "w1Rooming"),
   ("feature.verifyEncounterWeight", "w1Rooming"),
   ("feature.recordDelegatedCuresReview", "w1Orders"),
   ("feature.recordTransmissionFailure", "w1Orders"),
   ("feature.signFormattedPrescription", "w1Orders"),
   ("feature.signOralLiquidPrescription", "w1Orders"),
   ("feature.signOralMethotrexate", "w1Orders"),
   ("feature.completeAccessResponse", "w2Result"),
   ("feature.provideRecordSummary", "w2Result"),
   ("feature.authorizeMinorAssaultCare", "w3Provider"),
   ("feature.authorizeSeclusion", "w3Provider"),
   ("feature.continue5150Hold", "w3Provider"),
   ("feature.continueViolentRestraint", "w3Provider"),
   ("feature.recordDetentionRelease", "w3Provider"),
   ("feature.recordRestraintEvaluation", "w3Provider"),
   ("feature.recordRestraintRelease", "w3Provider"),
   ("feature.recordRightsNotice", "w3Provider"),
   ("feature.recordTreatmentDecision", "w3Provider"),
   ("feature.authorizeEdBuprenorphineCuresExemption", "w3Orders"),
   ("feature.authorizeOudDirectDispensing", "w3Orders"),
   ("feature.dispenseUnusedEdPortion", "w3Orders"),
   ("feature.completeMedicalRecord", "w3Disposition"),
   ("feature.recordNursingTransition", "w3Disposition"),
   ("feature.recordPainResponse", "w4Admin"),
   ("feature.continueNewbornOxygen", "w4Worklist"),
   ("feature.recordOxygenStop", "w4Worklist"),
   ("feature.authorizePediatricBed", "w5Rooming"),
   ("feature.recordNewbornScreenDecision", "w5Rooming"),
   ("feature.calculatePediatricDose", "w5Orders"),
   ("feature.authorizeProcedureCuresExemption", "w6PreOp"),
   ("feature.authorizeSterilization", "w6PreOp"),
   ("feature.recordSterilizationConsent", "w6PreOp"),
   ("feature.verifyPreoperativeRecord", "w6PreOp"),
   ("feature.verifySurgicalTimeout", "w6PreOp"),
   ("feature.verifySurgicalChecklist", "w6OpNote"),
   ("feature.dispenseScheduleIIItoV", "w7Decision"),
   ("feature.recordPrescriptionExpiryDecision", "w7Decision"),
   ("feature.completeEmergencyScheduleIIPartial", "w7Orders"),
   ("feature.completeScheduleIIPatientPartial", "w7Orders"),
   ("feature.completeScheduleIIShortage", "w7Orders"),
   ("feature.partialFillScheduleIIItoV", "w7Orders")]

/-- Resolve a source artifact destination without changing patient or episode. -/
def host (id : ScreenId) : ScreenId :=
  ((relocations.find? (·.1 == id)).map (·.2)).getD id

/-- Relocated buttons retain their original component ID and real interpreter event. -/
def route (c : Component) : Component := match c.kind with
  | .button (.goto target) => { c with kind := .button (.goto (host target)) }
  | _ => c

/-- Remove only workspace shell copies. Render.Ui already supplies nav/stepper
and the clinical rail. Keep the banner component for landmark guard semantics;
it renders as clinical information, not a second banner landmark. Real nav
buttons stay addressable until core supplies shell navigation events (CR-17). -/
def isShellCopy (s : Screen) (c : Component) : Bool :=
  c.id == cid s.id "sidebar" || c.parent? == some (cid s.id "sidebar") ||
  c.id == cid s.id "nav"

/-- Every input remains attached to its existing container. Removing the old
navigator header makes its real interpreter buttons top-level actions. -/
def clean (s : Screen) : List Component :=
  (s.components.filter fun c => !isShellCopy s c).map fun c =>
    route (if c.parent? == some (cid s.id "nav") then { c with parent? := none } else c)

/-- Artifact shell/navigation is replaced by the host's shell. Clinical fields,
reviews, alerts and distinct commits stay in their original order and bindings. -/
def artifactSection (s : Screen) : List Component :=
  let content := s.components.filter fun c =>
    c.kind != .banner && c.id != cid s.id "chartSearch" &&
    !(isShellCopy s c) && !(match c.kind with
      | .button (.goto _) | .button .back => true | _ => false) &&
    c.id != cid s.id "legalNav" && c.id != cid s.id "featureNavigation"
  -- Payload pinning currently requires root infos. Put those reviews before
  -- the open documentation section; the actual fields/actions nest inside it.
  let pinned := content.filter fun c => c.parent?.isNone && match c.kind with
    | .panel _ | .table _ | .trend _ => true
    | .alert a _ => (Ehr.Specs.V1.specV1.alert? a).any (·.tier == .passive)
    | _ => false
  let body := content.filter fun c => !pinned.any (·.id == c.id)
  pinned.map route ++ [group s.id "section" s.title (collapsible := false)] ++
    body.map fun c => route (if c.parent?.isNone then
      { c with parent? := some (cid s.id "section") } else c)

/-- Patient-ID re-entry stays human-only and immediately precedes its own
commit. Reviews/payloads remain root components before this signature footer. -/
def signature (s : Screen) : Screen :=
  let ids := s.components.filter fun c => match c.kind with
    | .field "patientIdReentry" _ _ => true | _ => false
  if ids.isEmpty then s else
  let body := s.components.filter fun c => !ids.any (·.id == c.id)
  let (_, result) := body.foldl (fun (used, out) c => match c.kind with
    | .button (.commit k) =>
      if Ehr.Specs.V1.specV1.entries.any (fun r => r.commit == k && r.element == "patientIdReentry") then
        let identity := ids.head!
        let identity := if used then { identity with id := identity.id ++ "." ++ k } else identity
        (true, out ++ [group s.id ("signature." ++ k) "Signature" (collapsible := false),
          { identity with parent? := some (cid s.id ("signature." ++ k)) },
          { c with parent? := some (cid s.id ("signature." ++ k)) }])
      else (used, out ++ [c])
    | _ => (used, out ++ [c])) (false, [])
  { s with components := result }

/-- Optional chart tabs and real navigation live after the clinical task.
Search-first composers therefore begin with the actual order search/results. -/
def footer (s : Screen) (c : Component) : Bool :=
  c.id == cid s.id "chart" || c.parent? == some (cid s.id "chart") ||
  c.id == cid s.id "legalNav" || c.id == cid s.id "featureNavigation" ||
  match c.kind with | .button (.goto _) | .button .back => true | _ => false

/-- Folded artifact links navigate to honest clinical host labels. Duplicate
host links are omitted only from generated related-care menus, never from the
clinical controls or original walkthrough navigation buttons. -/
def relatedLinks (source : List Screen) (s : Screen) (cs : List Component) : List Component :=
  let (_, result) := cs.foldl (fun (targets, kept) c =>
    let generated := c.id.startsWith (cid s.id "legalNav.") ||
      c.id.startsWith (cid s.id "featureNav.")
    match c.kind with
    | .button (.goto target) =>
      if generated then
        if target == s.id || targets.contains target then (targets, kept) else
          (target :: targets, kept ++ [{ c with label :=
            ((source.find? (·.id == target)).map (·.title)).getD c.label }])
      else (targets, kept ++ [c])
    | _ => (targets, kept ++ [c])) ([], [])
  result.filter fun c =>
    if c.id == cid s.id "legalNav" || c.id == cid s.id "featureNavigation" then
      result.any (·.parent? == some c.id) else true

/-- Fold every artifact into its reviewed workflow step; preserve every action
and every clinical entry/review binding. The W7 composer and sign remain screens. -/
def screens (source : List Screen) : List Screen :=
  (source.filter fun s => host s.id == s.id).map fun s =>
    let cs := relatedLinks source s (clean (signature s))
    { s with components := (cs.filter fun c => !footer s c) ++
        ((source.filter fun a => a.id != s.id && host a.id == s.id).flatMap (artifactSection ∘ signature)) ++
        cs.filter (footer s) }

/-- Macro navigation follows the same relocation ledger as ordinary buttons. -/
def macros (ms : List Macro) : List Macro := ms.map fun m =>
  { m with steps := m.steps.map fun st => match st with
      | .goto target => .goto (host target) | _ => st }
end Ehr.Canonical.Blueprint
