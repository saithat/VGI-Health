import Ehr.Core.Types
namespace Ehr

/-- Product design property.
An additive hospital release preserves every old declaration, requirement
and alert in order, and preserves the old design rules while extending only
the catalog. This deliberately strong relation forbids editing old rules or
shadowing an old lookup with a new declaration. It does not itself claim that
programs satisfy new obligations; v3 requires recertification. -/
def Spec.Extends (new old : Spec) : Prop :=
  new.elements.take old.elements.length = old.elements ∧
  new.infos.take old.infos.length = old.infos ∧
  new.commits = old.commits ∧
  new.entries.take old.entries.length = old.entries ∧
  new.reviews.take old.reviews.length = old.reviews ∧
  new.alerts = old.alerts ∧
  new.displays? = old.displays? ∧
  new.design.maxDepth = old.design.maxDepth ∧
  new.design.minTextSize = old.design.minTextSize ∧
  new.design.stabilityBudget = old.design.stabilityBudget ∧
  new.design.landmarks = old.design.landmarks ∧
  new.design.catalog.take old.design.catalog.length = old.design.catalog
  deriving Decidable

end Ehr
