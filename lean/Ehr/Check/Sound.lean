import Ehr.Check.PartialSound
import Ehr.Check.BudgetSound
import Ehr.Check.SeveritySound
import Ehr.Check.WritesSound
import Ehr.Check.EnterOnceSound
import Ehr.Check.HumanEventsSound
import Ehr.Check.AlertSound
import Ehr.Check.NavigationSound
import Ehr.Check.ScalarCompletion
import Ehr.Check.FixedLineCompletion
import Ehr.Check.DoseCompletionObstruction

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
    Scalar.screen, Scalar.field, Scalar.button, Spec.commit?, commitRolePossible, roleOk, role, List.eraseDups_cons,
    presetScreen, Program.presetOwner]

/-- Acceptance certifies the two-fixed-line composer, including per-line
human entries, new-line advancement, reviews and finite alert discharge. -/
theorem satisfies_of_checked_fixed_lines (k : ValueKind) (r : Role) (m : ReviewMode)
    (a : AlertCond) (t : Tier) (nonDose : k ≠ .medicationDose) (prev : Option Program)
    (h : check (FixedLine.spec k r m a t) prev (FixedLine.program r) (FixedLine.program r) = .ok) :
    Satisfies (FixedLine.spec k r m a t) prev (FixedLine.program r) (FixedLine.program r) :=
  satisfies_of_checked_completable _ _ _ _ h (FixedLine.completable k r m a t nonDose)

/-- A checked nonempty order composer satisfies all thirteen properties;
its per-order-line requirement is a human assessment on each drug line. -/
theorem fixed_lines_satisfies :
    Satisfies (FixedLine.spec .flag .physician .shownOnCommit .drugAllergy .interruptive)
      none (FixedLine.program .physician) (FixedLine.program .physician) :=
  satisfies_of_checked_fixed_lines _ _ _ _ _ (by decide) none (by decide)

/-- Two actual drug lines can be pending at once, with neither assessment
entered. The completion theorem therefore repairs real per-line obligations. -/
theorem fixed_lines_pending_nonempty :
    let sp := FixedLine.spec .flag .physician .shownOnCommit .drugAllergy .interruptive
    let p := FixedLine.program .physician
    let s := runAll sp p Ehr.Examples.Tiny.facts Ehr.Examples.Tiny.user .human
      (init sp p Ehr.Examples.Tiny.facts Ehr.Examples.Tiny.user)
      [.enter (FixedLine.drugField 0).id (.code "amoxicillin"),
       .enter (FixedLine.drugField 1).id (.code "warfarin")]
    orderLines s = [(0, "amoxicillin"), (1, "warfarin")] ∧
      entriesOk sp Ehr.Examples.Tiny.facts Ehr.Examples.Tiny.user s "recordReview" = false := by
  decide

/-- Receipt-aware reviews stay met when valid receipts hide the panel and
when expiry reveals it again. Completion is proved for every reachable state. -/
theorem satisfies_of_checked_receipt_lines (k : ValueKind) (r : Role) (m : ReviewMode)
    (a : AlertCond) (t : Tier) (nonDose : k ≠ .medicationDose) (prev : Option Program)
    (h : check (FixedLine.spec k r m a t) prev
      (FixedLine.program r (some m)) (FixedLine.program r (some m)) = .ok) :
    Satisfies (FixedLine.spec k r m a t) prev
      (FixedLine.program r (some m)) (FixedLine.program r (some m)) :=
  satisfies_of_checked_completable _ _ _ _ h (FixedLine.completable k r m a t nonDose true)

/-- A real accepted receipt-aware program satisfies all thirteen properties. -/
theorem receipt_lines_satisfies :
    Satisfies (FixedLine.spec .flag .physician (.shownOrReceipt 720 [.physician, .rn]) .careGap .passive)
      none (FixedLine.program .physician (some (.shownOrReceipt 720 [.physician, .rn])))
      (FixedLine.program .physician (some (.shownOrReceipt 720 [.physician, .rn]))) :=
  satisfies_of_checked_receipt_lines _ _ _ _ _ (by decide) none (by decide)

/-- A current receipt genuinely hides the panel while meeting the review;
after time passes beyond its window, the panel is shown and still meets it. -/
theorem receipt_review_transition :
    let mode := ReviewMode.shownOrReceipt 720 [.physician, .rn]
    let sp := FixedLine.spec .flag .physician mode .careGap .passive
    let p := FixedLine.program .physician (some mode)
    let f := Ehr.Examples.TinyTests.factsWithReceipt 3
    let s := init sp p f Ehr.Examples.Tiny.user
    infoShown sp p f s "allergyList" = false ∧ reviewMet sp p f s (Scalar.review mode) = true ∧
      infoShown sp p f { s with clock := s.clock + 1440 * 600 } "allergyList" = true ∧
      reviewMet sp p f { s with clock := s.clock + 1440 * 600 } (Scalar.review mode) = true := by
  decide

/-- Any finite unique-ID alert family can be handled after line repair.
The ID premise is extracted from acceptance, rather than assumed separately. -/
theorem satisfies_of_checked_many_alerts (k : ValueKind) (r : Role) (m : ReviewMode)
    (a : AlertCond) (t : Tier) (moreAlerts : List AlertSpec) (receiptAware : Bool)
    (nonDose : k ≠ .medicationDose) (prev : Option Program)
    (h : check (FixedLine.spec k r m a t moreAlerts) prev
      (FixedLine.program r (if receiptAware then some m else none))
      (FixedLine.program r (if receiptAware then some m else none)) = .ok) :
    Satisfies (FixedLine.spec k r m a t moreAlerts) prev
      (FixedLine.program r (if receiptAware then some m else none))
      (FixedLine.program r (if receiptAware then some m else none)) := by
  apply satisfies_of_checked_completable _ _ _ _ h
  apply FixedLine.completable_many_alerts k r m a t nonDose moreAlerts _ receiptAware
  exact (accepted_wellFormed _ _ _ _ h).2.1.2.2.2

/-- A second interruptive safety rule, with its own ID and acknowledgment. -/
def secondSafetyAlert : AlertSpec :=
  { id := "secondSafety", label := "Second safety check", cond := .careGap,
    tier := .interruptive, commit := "recordReview" }

/-- The generalized accepted fragment has a concrete two-interruption instance. -/
theorem many_alerts_satisfies :
    Satisfies (FixedLine.spec .flag .physician (.shownOrReceipt 720 [.physician, .rn])
      .careGap .interruptive [secondSafetyAlert]) none
      (FixedLine.program .physician (some (.shownOrReceipt 720 [.physician, .rn])))
      (FixedLine.program .physician (some (.shownOrReceipt 720 [.physician, .rn]))) :=
  satisfies_of_checked_many_alerts _ _ _ _ _ _ true (by decide) none (by decide)

/-- Two real drug lines complete only after the human handles two distinct
interruptive rules; both acknowledgments appear in the final state. -/
theorem many_alerts_two_acknowledgments :
    let sp := FixedLine.spec .flag .physician .shownOnCommit .careGap .interruptive [secondSafetyAlert]
    let p := FixedLine.program .physician
    let f := Ehr.Examples.Tiny.facts
    let u := Ehr.Examples.Tiny.user
    let s := runAll sp p f u .human (init sp p f u)
      [.enter (FixedLine.drugField 0).id (.code "amoxicillin"),
       .enter (FixedLine.drugField 1).id (.code "warfarin"),
       .enter (FixedLine.assessmentField 0).id (.flag true),
       .enter (FixedLine.assessmentField 1).id (.flag true),
       .click Scalar.button.id, .ack "clinicalAlert", .click Scalar.button.id,
       .ack "secondSafety", .click Scalar.button.id]
    "recordReview" ∈ s.commits ∧ s.acked.length = 2 := by decide

/-- The current checker has an accepted, non-completable program: the
unrestricted completion implication needs a checker repair before proof. -/
theorem completion_acceptance_counterexample :
    ∃ (sp : Spec) (p : Program), check sp none p p = .ok ∧ ¬ Completable sp p p :=
  ⟨DoseCompletionObstruction.spec, DoseCompletionObstruction.program,
    DoseCompletionObstruction.accepted, DoseCompletionObstruction.not_completable⟩

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
#print axioms satisfies_of_checked_fixed_lines
#print axioms fixed_lines_satisfies
#print axioms satisfies_of_checked_receipt_lines
#print axioms receipt_lines_satisfies
#print axioms satisfies_of_checked_many_alerts
#print axioms many_alerts_satisfies
end Ehr.Check
