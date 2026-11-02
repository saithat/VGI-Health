import Ehr.Sem.Screen

/-! A deliberately strong admission interface for presentation-only extensions.
Richer primitives that change view state need an explicit refinement of this
interface, with transition/exposure obligations reviewed alongside the spec. -/
namespace Ehr.Sem
open Ehr.Render

/-- The public extension path requires a kernel proof before it can render.
Physical exposure is supplied separately by the measured view adapter. -/
structure PresentationExtension where
  transform : UiScreen → UiScreen
  preserves : ∀ screen, meaning (transform screen) = meaning screen

namespace PresentationExtension

theorem property (extension : PresentationExtension) (P : Screen → Prop) (screen : UiScreen) :
    P (meaning (extension.transform screen)) ↔ P (meaning screen) := by
  rw [extension.preserves]

#print axioms property
end PresentationExtension
end Ehr.Sem
