import Ehr.Sem.Admission
import Ehr.Render.DateIndex

/-! Full dated-presentation observation. The old meaning/UiPresent observers stay
unchanged clinical projections; this observation also retains index payloads. -/
namespace Ehr.Sem
open Ehr Render

structure IndexedMeaning where
  clinical : Screen
  indexes : List UiNode

def indexedMeaning (screen : UiScreen) : IndexedMeaning :=
  ⟨meaning screen, DateIndex.observeList (screen.workspace ++ screen.side ++ screen.modal.toList)⟩

/-- Dated admission must account for the complete new index and inherited indexes,
not merely equality after erasing the new payload. -/
structure IndexedExtension (sources : List UiSourceDate) where
  clinical : PresentationExtension
  full : ∀ screen, indexedMeaning (clinical.transform screen) =
    { clinical := meaning screen,
      indexes := [.datedTimeline "Dated clinical timeline (UTC)"
        (Dated.dated sources) (Dated.undated sources) []] ++ (indexedMeaning screen).indexes }

end Ehr.Sem
