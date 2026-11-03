import Ehr.Specs.V3

/-! Proposed source-labelled attention policy, pending owner review.
Additive data: does not change AlertSpec.tier, triggers, guards or release specs.
See docs/design/alert-urgency.md for source scope and the legal/policy distinction. -/
namespace Ehr.Specs.AlertUrgency
open Ehr

inductive Urgency where
  | urgent
  | workflow
  | advisory
  deriving DecidableEq, Repr

inductive Authority where
  | regulation
  | accreditation
  | guidance
  | hospitalPolicy
  deriving DecidableEq, Repr

structure Source where
  authority : Authority
  citation : String
  url : String
  deriving DecidableEq, Repr

structure Assignment where
  id : AlertId
  urgency : Urgency
  /-- Continuous visibility is the hospital's proposal, not a legal attribution. -/
  decision : Source
  context : List Source
  pendingOwnerReview : Bool := true
  deriving DecidableEq, Repr

def localPolicy : Source := ⟨.hospitalPolicy,
  "Hospital policy (not law): proposed attention tiers, 2026-11-02; pending owner review",
  "docs/design/alert-urgency.md"⟩
def onc : Source := ⟨.regulation, "45 CFR 170.315(a)(4)(i): CPOE contraindication indication before completion",
  "https://www.ecfr.gov/current/title-45/section-170.315#p-170.315(a)(4)"⟩
def cms : Source := ⟨.regulation, "42 CFR 482.23(c)(1), 482.25(b): administration standards and medication-error policies",
  "https://www.ecfr.gov/current/title-42/section-482.23#p-482.23(c)(1)"⟩
def safer : Source := ⟨.guidance, "ASTP/ONC SAFER CPOE, recommended practice 2.1: contextual, tiered alerts",
  "https://www.healthit.gov/wp-content/uploads/2025/06/SAFER-Guide-3.-CPOE-Final.pdf"⟩
def ismp : Source := ⟨.guidance, "ISMP 2026-2027 Targeted Medication Safety Best Practices, BP 3 and 19",
  "https://online.ecri.org/hubfs/ISMP/Resources/ISMP_TargetedMedicationSafetyBestPractices_Hospitals.pdf"⟩

def assign (id : AlertId) (urgency : Urgency) (context : List Source) : Assignment :=
  ⟨id, urgency, localPolicy, context, true⟩

/-- All 17 declared kinds; passive/removable severity is deliberately independent. -/
def base : List Assignment :=
  [assign "drugAllergyOrder" .urgent [onc, safer],
   assign "drugAllergyAdmin" .urgent [cms, safer],
   assign "interactionOrder" .urgent [onc, safer],
   assign "interactionRefill" .urgent [onc, safer],
   assign "doseRangeOrder" .urgent [ismp, safer],
   assign "weightInLb" .urgent [ismp],
   assign "highAlertAdmin" .urgent [cms, ismp],
   assign "careGapsInline" .workflow [safer],
   assign "duplicateTherapyInline" .workflow [safer],
   assign "immunizationsDueInline" .workflow [safer],
   assign "healthMaintenancePopup" .advisory [safer],
   assign "highAlertOrderNotice" .advisory [ismp, safer],
   assign "activeRxPopup" .advisory [safer],
   assign "refillCareGapPopup" .advisory [safer],
   assign "minorInteractionPopup" .advisory [safer],
   assign "pediatricGrowthCurveOutlier" .urgent [ismp],
   assign "significantWeightChange" .urgent [ismp]]

/-- Match the exact inheritance rule; no suffix heuristic or unknown-id fallback. -/
def inherited : List Assignment :=
  V1.issuanceCommits.flatMap fun c =>
    (V1.alerts.filter (·.commit == "signOrders")).filterMap fun a =>
      (base.find? (·.id == a.id)).map fun p => { p with id := p.id ++ "." ++ c }

def assignments : List Assignment := base ++ inherited

def lookup (id : AlertId) : Option Assignment := assignments.find? (·.id == id)
def tier (id : AlertId) : Option Urgency := (lookup id).map (·.urgency)

/-- Includes opt-in full-profile alerts, even when absent from released core JSON. -/
def declaredAlerts : List AlertSpec :=
  V1.alerts ++ V1.inheritedAlerts ++ Rules.Cms.alerts ++ Rules.Title22.alerts ++
  Rules.CaStatutes.alerts ++ Rules.Federal.alerts ++ Rules.Entrenched.alerts ++ Rules.Features.alerts

#guard assignments.length == 77
#guard (assignments.map (·.id)).Nodup
#guard declaredAlerts.all fun a => (lookup a.id).isSome
#guard assignments.all fun p => declaredAlerts.any (·.id == p.id)
#guard [V1.specV1, V2.specV2, V3.specV3].all fun sp => sp.alerts.all fun a => (lookup a.id).isSome
#guard assignments.all (·.pendingOwnerReview)

set_option maxRecDepth 16384 in
set_option maxHeartbeats 2000000 in
/-- Kernel-checked coverage without a catch-all classifier. -/
theorem coverage : ∀ a ∈ declaredAlerts, ∃ p ∈ assignments, p.id = a.id := by decide

#print axioms coverage
end Ehr.Specs.AlertUrgency

/-! Owner-approved successor policy. The original proposal above is retained
verbatim as the source reviewed on 2026-11-02. Production/export use this layer. -/
namespace Ehr.Specs.AlertUrgency

def approvedPolicy : Source := ⟨.hospitalPolicy,
  "Hospital policy (not law): APPROVED by the owner on 2026-11-02",
  "docs/design/alert-urgency.md"⟩
def jointCommission : Source := ⟨.accreditation,
  "Joint Commission NPG.01.02.01 EPs 1-2 (January 2026; succeeds NPSG.02.03.01): critical-result reporting and timeliness",
  "https://digitalassets.jointcommission.org/api/public/content/9ca80055182b4274842a5780a94f2c82?v=149a13a9"⟩
def clia : Source := ⟨.regulation,
  "42 CFR 493.1291(g): immediate notification of life-threatening or panic results",
  "https://www.ecfr.gov/current/title-42/section-493.1291#p-493.1291(g)"⟩
def approvedAssignments : List Assignment :=
  (assignments.map fun p => { p with decision := approvedPolicy, pendingOwnerReview := false }) ++
  [⟨"criticalResult", .urgent, approvedPolicy, [jointCommission, clia], false⟩]
def approvedTier (id : AlertId) : Option Urgency :=
  ((approvedAssignments.find? (·.id == id)).map (·.urgency))
#guard approvedAssignments.length == 78
#guard approvedAssignments.all (! ·.pendingOwnerReview)
#guard (approvedAssignments.map (·.id)).Nodup
end Ehr.Specs.AlertUrgency
