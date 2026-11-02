import Ehr.Render.Page

namespace Ehr.Render

/-- Every node with an id is allowed, and its actions agree with enabled. -/
def TreeSafe (allowed : String → Prop) (enabled : String → Bool) (h : Html) : Prop :=
  ∀ n, Within n h → ∀ id, n.HasCompId id →
    allowed id ∧ (n.HasEvent → (n.IsDisabled ↔ enabled id = false))


/-- An id is allowed exactly when it belongs to a shown interpreter item. -/
def Shown (cx : Ctx) (id : String) : Prop :=
  ∃ it ∈ cx.v.items, it.shown = true ∧ it.comp.id = id


end Ehr.Render
