import Ehr.Check.RuleSound
import Ehr.Check.PinSound

namespace Ehr.Check
open Ehr Ehr.Props Ehr.Proofs

/-- Popup severity is invariant under events and time passing. -/
theorem reachable_popupNotPassive (ep : Episode) : Always ep (PopupNotPassive ep.spec) := by
  intro s hs
  induction hs with
  | start =>
    intro a k hp
    have hn : ep.start.popup? = none := prefillScreen_popup _ _ _ _
    rw [hn] at hp
    contradiction
  | step actor e _ ih => exact A4_step _ _ _ _ actor _ e ih
  | wait d _ ih => exact ih

/-- Passive alerts never pop up in any reachable state, including timed runs. -/
theorem passiveNeverPopsUp (ep : Episode) : PassiveNeverPopsUp ep := by
  intro s hs a k al hp hal
  obtain ⟨al', hal', ht⟩ := reachable_popupNotPassive ep s hs a k hp
  rw [hal] at hal'
  cases hal'
  exact ht

/-- Accepted programs request no passive popups, and the interpreter never
opens one (property 12 / A4). -/
theorem accepted_severityTiers (sp prev can p) (h : check sp prev can p = .ok) :
    SeverityTiers sp p := by
  have ht := accepted_structural sp prev can p h
  exact ⟨ht.2.2.2.2.2.1, fun facts user _ => passiveNeverPopsUp ⟨sp, p, facts, user⟩⟩

#print axioms reachable_popupNotPassive
#print axioms passiveNeverPopsUp
#print axioms accepted_severityTiers
end Ehr.Check
