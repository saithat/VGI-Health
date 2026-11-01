import Ehr.Check.Catalog
import Ehr.Props.Examples
import Ehr.Specs.Extends

namespace Ehr.Check
open Ehr Ehr.Props Ehr.Examples.Tiny Ehr.Props.Examples

/-- Every original requirement survives an additive release. -/
theorem extends_entries {new old : Spec} (h : new.Extends old) :
    old.entries ⊆ new.entries := by
  intro rq hrq
  exact List.mem_of_mem_take (h.2.2.2.1 ▸ hrq)

/-- Every original catalog kind remains available in an additive release. -/
theorem extends_catalog {new old : Spec} (h : new.Extends old) :
    old.design.catalog ⊆ new.design.catalog := by
  intro kind hk
  have ht := h.2.2.2.2.2.2.2.2.2.2.2
  exact List.mem_of_mem_take (ht ▸ hk)

/-- A concrete vocabulary expansion, with no extra clinical obligations. -/
def expandedSpec : Spec :=
  { spec with infos := spec.infos ++ [{ id := "newStatus", label := "New status", version := "" }]
              design := { spec.design with catalog := spec.design.catalog ++ ["priorAuth"] } }

def expandedProgram : Program :=
  { goodProgram with screens := goodProgram.screens.map fun scr =>
      if scr.id == "order" then
        { scr with components := scr.components ++ [{ id := "newStatus", kind := .priorAuth "newStatus" }] }
      else scr }

theorem expanded_extends : expandedSpec.Extends spec := by decide
theorem expanded_accepted : check expandedSpec none goodProgram expandedProgram = .ok := by decide

/-- The older catalog intentionally rejects a newly introduced component kind. -/
theorem expanded_not_old_satisfies : ¬ Satisfies spec none goodProgram expandedProgram := by
  intro h
  exact (by decide : ¬ CatalogOnly spec expandedProgram) h.1.1

/-- A sound checker and unqualified backwards transport of full `Satisfies`
are incompatible with catalog-extending releases. T8 needs an old-vocabulary
compatibility condition or an old-obligations projection. -/
theorem soundness_transport_obstruction :
    ¬ ((check expandedSpec none goodProgram expandedProgram = .ok →
          Satisfies expandedSpec none goodProgram expandedProgram) ∧
       (∀ p, Satisfies expandedSpec none goodProgram p → Satisfies spec none goodProgram p)) := by
  rintro ⟨hsound, htransport⟩
  exact expanded_not_old_satisfies (htransport _ (hsound expanded_accepted))

#print axioms extends_entries
#print axioms extends_catalog
#print axioms expanded_extends
#print axioms expanded_accepted
#print axioms soundness_transport_obstruction
end Ehr.Check
