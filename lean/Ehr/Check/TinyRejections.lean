import Ehr.Check.Check
import Ehr.Props.Examples

namespace Ehr.Check
open Ehr Ehr.Props Ehr.Examples.Tiny Ehr.Props.Examples

/-- A vocabulary with no fields cannot accept the order composer. -/
theorem tiny_bad_catalog : ¬ Satisfies
    { spec with design := { spec.design with catalog := ["banner"] } }
    none goodProgram goodProgram := by
  intro h
  exact (by decide : ¬ CatalogOnly
    { spec with design := { spec.design with catalog := ["banner"] } } goodProgram) h.1.1

/-- A nurse cannot use a program that declares physician-only writes. -/
theorem tiny_bad_role : ¬ Satisfies spec none goodProgram { goodProgram with role := .rn } := by
  intro h
  exact (by decide : ¬ DeclaredWritesInSpec spec { goodProgram with role := .rn }) h.2.2.1.1

/-- The original tiny macro attempts a human-only action. -/
theorem tiny_bad_automation : ¬ Satisfies spec none goodProgram program := by
  intro h
  exact (by decide : ¬ NoAutomationAttempts spec program) h.2.2.2.2.1.1

#print axioms tiny_bad_catalog
#print axioms tiny_bad_role
#print axioms tiny_bad_automation
end Ehr.Check
