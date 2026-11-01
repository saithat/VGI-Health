import Ehr.Check.PartialSound
import Ehr.Check.BudgetSound
import Ehr.Check.SeveritySound
import Ehr.Check.WritesSound
import Ehr.Check.EnterOnceSound
import Ehr.Check.HumanEventsSound
import Ehr.Check.AlertSound
import Ehr.Check.NavigationSound

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

example : Satisfies emptySpec none emptyProgram emptyProgram :=
  satisfies_of_checked_completable _ _ _ _ (by decide) (by
    intro facts user _ _ s _ c hc
    simp [requiredCommitsFor, requiredCommits, presetScreen, Program.presetOwner, commitButtons, emptyProgram] at hc)

#print axioms satisfies_of_checked_completable
end Ehr.Check
