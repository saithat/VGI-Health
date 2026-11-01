import Ehr.Check.Sound
import Ehr.Specs.Extends

namespace Ehr.Check
open Ehr Ehr.Props

/-- A catalog-only release expansion, independent of any clinical workflow. -/
def vocabularyRelease : Spec :=
  { emptySpec with
    infos := [{ id := "status", label := "Status", version := "" }]
    design := { emptySpec.design with catalog := ["banner", "priorAuth"] } }

def vocabularyProgram : Program :=
  { emptyProgram with screens := emptyProgram.screens.map fun scr =>
      { scr with components := scr.components ++ [{ id := "status", kind := .priorAuth "status" }] } }

theorem vocabulary_extends : vocabularyRelease.Extends emptySpec := by decide

/-- Full Satisfies, including completability, holds for the later release.
There are no required commits, so this use of the assembly theorem does not
assume the unfinished general T1 or any hidden completion hypothesis. -/
theorem vocabulary_satisfies : Satisfies vocabularyRelease none emptyProgram vocabularyProgram :=
  satisfies_of_checked_completable _ _ _ _ (by decide) (by
    intro facts user _ _ s _ c hc
    simp [requiredCommits, commitButtons, vocabularyProgram, emptyProgram] at hc)

theorem vocabulary_not_old_satisfies : ¬ Satisfies emptySpec none emptyProgram vocabularyProgram := by
  intro h
  exact (by decide : ¬ CatalogOnly emptySpec vocabularyProgram) h.1.1

/-- A direct counterexample to unqualified full-Satisfies T8 under the
content lane's current Extends relation. It does not rely on general T1. -/
theorem T8_unqualified_false :
    ¬ (∀ (new old : Spec) (prev : Option Program) (can p : Program),
      new.Extends old → Satisfies new prev can p → Satisfies old prev can p) := by
  intro transport
  exact vocabulary_not_old_satisfies
    (transport _ _ _ _ _ vocabulary_extends vocabulary_satisfies)

#print axioms vocabulary_extends
#print axioms vocabulary_satisfies
#print axioms vocabulary_not_old_satisfies
#print axioms T8_unqualified_false
end Ehr.Check
