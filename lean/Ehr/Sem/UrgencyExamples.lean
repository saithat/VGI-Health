import Ehr.Sem.Urgency
import Ehr.Sem.Examples

namespace Ehr.Sem.UrgencyExamples
open Ehr.Sem.Examples

/-- Scrolling changes perception without changing complete clinical content. -/
def scrollAway : View → View → Prop := fun a b =>
  a.screen = good ∧ b.screen = good ∧ b.moment = dark

theorem initial_is_insufficient :
    UrgentVisible good exposed [urgent] ∧
    ¬ (∀ n target, Within scrollAway n ⟨good, exposed⟩ target →
        UrgentVisible target.screen target.moment [urgent]) := by
  refine ⟨urgent_good, ?_⟩
  intro h
  have reach : Within scrollAway 1 ⟨good, exposed⟩ ⟨good, dark⟩ :=
    .step ⟨rfl, rfl, rfl⟩ (.refl _)
  exact urgent_bad (h 1 _ reach)

#print axioms initial_is_insufficient
end Ehr.Sem.UrgencyExamples
