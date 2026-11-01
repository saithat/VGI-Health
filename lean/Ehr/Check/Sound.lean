import Ehr.Check.PartialSound
import Ehr.Check.BudgetSound
import Ehr.Check.SeveritySound
import Ehr.Check.WritesSound
import Ehr.Check.EnterOnceSound
import Ehr.Check.HumanEventsSound
import Ehr.Check.AlertSound
import Ehr.Check.NavigationSound
import Ehr.Check.ScalarCompletion

namespace Ehr.Check
open Ehr Ehr.Props

/-- Assemble all thirteen properties from acceptance and the outstanding
completability obligation. General T1 remains open until that obligation is
proved from `completeFor`; no clinical domain assumption is added here. -/
theorem satisfies_of_checked_completable (sp : Spec) (prev : Option Program) (can p : Program)
    (h : check sp prev can p = .ok) (hc : Completable sp can p) : Satisfies sp prev can p :=
  ⟨accepted_wellFormed _ _ _ _ h,
   accepted_capturesAllOnce _ _ _ _ h,
   accepted_writesOnly _ _ _ _ h,
   accepted_reviewsBeforeCommit _ _ _ _ h,
   accepted_humanOnlyKept _ _ _ _ h,
   hc,
   accepted_units _ _ _ _ h,
   accepted_budgets _ _ _ _ h,
   accepted_alertsFire _ _ _ _ h,
   accepted_noFalseAlarms _ _ _ _ h,
   accepted_noRepeatInterruptions _ _ _ _ h,
   accepted_severityTiers _ _ _ _ h,
   accepted_navigation _ _ _ _ h⟩

/-- Acceptance proves all thirteen properties for the scalar clinical fragment,
without assuming completion. See `Scalar.completable` for its exact scope. -/
theorem satisfies_of_checked_scalar (k : ValueKind) (r : Role) (m : ReviewMode)
    (a : AlertCond) (t : Tier) (nonDose : k ≠ .medicationDose)
    (prev : Option Program)
    (h : check (Scalar.spec k r m a t) prev (Scalar.program r) (Scalar.program r) = .ok) :
    Satisfies (Scalar.spec k r m a t) prev (Scalar.program r) (Scalar.program r) :=
  satisfies_of_checked_completable _ _ _ _ h (Scalar.completable k r m a t nonDose)

/-- A nonempty clinical program is certified for every record and reachable
state: human patient-identity entry, shown allergy review, interruptive allergy
alerts. Its canonical and candidate programs are the same reviewed program. -/
theorem scalar_identity_satisfies :
    Satisfies (Scalar.spec .identity .physician .shownOnCommit .drugAllergy .interruptive)
      none (Scalar.program .physician) (Scalar.program .physician) :=
  satisfies_of_checked_scalar _ _ _ _ _ (by decide) none (by decide)

/-- The clinical witness has a required commit for every physician episode;
its completion proof cannot be discharged by an empty task family. -/
theorem scalar_identity_required (facts : Facts) (user : User) (role : user.role = .physician) :
    requiredCommitsFor (Scalar.spec .identity .physician .shownOnCommit .drugAllergy .interruptive)
      (Scalar.program .physician) (Scalar.program .physician) facts user = ["recordReview"] := by
  simp [requiredCommitsFor, requiredCommits, commitButtons, Scalar.spec, Scalar.program,
    Scalar.screen, Scalar.field, Scalar.button, presetScreen, Program.presetOwner,
    Spec.commit?, commitRoleOk, encounterRolesOk, CommitSpec.encounterRoleAllowed, roleOk, role, List.eraseDups_cons]

/-- A finite empty task family makes both assembly hypotheses satisfiable. -/
def emptySpec : Spec where
  version := "proof-empty"
  elements := []
  infos := []
  commits := []
  entries := []
  reviews := []
  alerts := []
  design := { maxDepth := 0, minTextSize := 12, stabilityBudget := 0,
              landmarks := ["patientBanner"], catalog := ["banner"] }

/-- A banner-only program for the empty-task assembly witness. -/
def emptyProgram : Program where
  id := "proof-empty"
  version := 1
  owner := "proof-user"
  role := .physician
  specVersion := "proof-empty"
  start := "home"
  screens := [{ id := "home", title := "Home", workflow := "shell",
                components := [{ id := "banner", kind := .banner }] }]
  macros := []

/-- An empty task family satisfies all properties; the nonempty witness is scalar_identity_satisfies. -/
theorem empty_program_satisfies : Satisfies emptySpec none emptyProgram emptyProgram :=
  satisfies_of_checked_completable _ _ _ _ (by decide) (by
    intro facts user _ _ s _ c hc
    simp [requiredCommitsFor, requiredCommits, presetScreen, Program.presetOwner, commitButtons, emptyProgram] at hc)

#print axioms satisfies_of_checked_completable
#print axioms satisfies_of_checked_scalar
#print axioms scalar_identity_satisfies
end Ehr.Check
