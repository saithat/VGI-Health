import Ehr.Core.Types

/-! New specifications R4 and R6. Hospital design policy, not a legal mandate.
The 2025 SAFER CPOE guide (August 2024 text), practices 1.2 and 2.1–2.3, supports
structured clinical context including problems, allergies, medications and
patient measurements. The 2025 Clinician Communication guide supports context
for results, transitions and referrals. The particular sets and depth bound are
local policy, not an empirically established clinical sufficiency threshold.
https://www.healthit.gov/wp-content/uploads/2025/06/SAFER-Guide-3.-CPOE-Final.pdf
https://healthit.gov/wp-content/uploads/2025/06/SAFER-Guide-1.-Clinical-Communication-Final.pdf
-/
namespace Ehr.Specs.DesignPolicies

/-- New specification R4: context retained at each workflow's commit screens.
All workflows retain allergies, active problems, recent vitals and medications;
the additional item preserves the workflow-specific clinical background.
See docs/design/metric-gaming.md for source mapping and limits. -/
def workflowContexts : List (String × List InfoId) :=
  [("W1", ["allergyList", "problemList", "vitals", "currentMeds", "priorNotes"]),
   ("W2", ["allergyList", "problemList", "vitals", "currentMeds", "resultDetail"]),
   ("W3", ["allergyList", "problemList", "vitals", "currentMeds", "triageSummary"]),
   ("W4", ["allergyList", "problemList", "vitals", "currentMeds", "marSchedule"]),
   ("W5", ["allergyList", "problemList", "vitals", "currentMeds", "priorNotes"]),
   ("W6", ["allergyList", "problemList", "vitals", "currentMeds", "intraopRecord"]),
   ("W7", ["allergyList", "problemList", "vitals", "currentMeds", "refillRequest"])]

/-- New specification R6: explicit vendor terminology, keyed by target title.
Only equivalent short navigation terms are admitted; this is spec-owned data. -/
def navigationAliases : List (String × List String) :=
  [("Chart Summary", ["Summary"]), ("Medication Review", ["Medications"]), ("Consults", ["Consult list"]),
   ("ED order sets", ["Order sets"]), ("Inbox: Results", ["Results", "Result Review"]),
   ("Inbox: Rx Requests", ["Rx Requests", "Refill Review"]), ("OR Schedule", ["Case list"]),
   ("Sign orders", ["Sign Orders"]),
   ("Rooming", ["Visit workflow", "Pediatric workflow", "Clinic Schedule"]),
   ("Triage summary", ["ED workflow"]), ("Preprocedure", ["Surgical workflow"]), ("Surgical consult", ["Consult note"])]

/-- Historical release specs omit the new fields. They receive the same
hospital policies as newly exported specs, without rewriting the recording. -/
def hospitalRelease (sp : Spec) : Bool := ["v1", "v2", "v3"].contains sp.version

def contexts (sp : Spec) : List (String × List InfoId) :=
  sp.workflowContexts?.getD (if hospitalRelease sp then workflowContexts else [])

def aliases (sp : Spec) : List (String × List String) :=
  sp.navigationAliases?.getD (if hospitalRelease sp then navigationAliases else [])

/-- Union all declarations for a workflow; duplicate keys cannot hide items. -/
def contextFor (sp : Spec) (workflow : String) : List InfoId :=
  ((contexts sp).filter (·.1 == workflow)).flatMap (·.2)

end Ehr.Specs.DesignPolicies
