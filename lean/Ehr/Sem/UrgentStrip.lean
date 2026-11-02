import Ehr.Sem.Urgency
import Ehr.Render.UrgentStrip

namespace Ehr.Sem
open Ehr Render

/-- Layered attention semantics: the pinned strip is active alongside any modal,
not part of the modal's inert background. Original screen semantics is intact. -/
def stripMeaning (ui : UiScreen) : Screen :=
  ⟨((ui.urgent?.getD []).map observe) ++ active (meaning ui), none⟩

/-- Layout model: the complete strip fits the viewport, remains legible and has
an unoccluded layer above unrelated dialogs, through all view transitions.
The workspace and dialog may change arbitrarily; the clinical strip is retained.
Arbitrary alert counts/zoom require this evidence, not a claim of infinite fit. -/
def StripLayout (ui : UiScreen) (edge : View → View → Prop) (initial : Moment) : Prop :=
  ∀ n target, Within edge n ⟨stripMeaning ui, initial⟩ target →
    ∃ background : UiScreen,
      target.screen = stripMeaning { background with urgent? := ui.urgent? } ∧
      ∀ f ∈ (ui.urgent?.getD []).map observe,
        target.moment.inViewport f ∧ target.moment.legible f ∧ target.moment.unoccluded f

 theorem active_urgent_in_strip (sp : Spec) (facts : Facts) (s : State) (rule : AlertSpec)
    (member : rule ∈ sp.alerts) (urgent : Specs.AlertUrgency.approvedTier rule.id = some .urgent)
    (clinical : ∃ key, key ∈ alertKeys facts s rule.cond) :
    .alert rule.id (uiLabel rule.label "Clinical alert")
      (match rule.tier with | .interruptive => "interruptive" | .passive => "passive" | .removable => "removable") ∈
        (urgentNodes sp facts s).map observe := by
  obtain ⟨key, keyMember⟩ := clinical
  have nonempty : (alertKeys facts s rule.cond).isEmpty = false := by
    cases h : alertKeys facts s rule.cond with
    | nil => simp [h] at keyMember
    | cons => rfl
  apply List.mem_map.mpr
  refine ⟨_, List.mem_map.mpr ⟨rule, ?_, rfl⟩, rfl⟩
  simp [urgentRules, member, urgent, nonempty]

 theorem strip_covers_all_active (sp facts user s base rule)
    (member : rule ∈ sp.alerts) (urgent : Specs.AlertUrgency.approvedTier rule.id = some .urgent)
    (clinical : ∃ key, key ∈ alertKeys facts s rule.cond) :
    .alert rule.id (uiLabel rule.label "Clinical alert")
      (match rule.tier with | .interruptive => "interruptive" | .passive => "passive" | .removable => "removable") ∈
      ((withUrgentStrip sp facts user s base).urgent?.getD []).map observe := by
  have h := active_urgent_in_strip sp facts s rule member urgent clinical
  have nonempty : (urgentNodes sp facts s).isEmpty = false := by
    cases eqNodes : urgentNodes sp facts s with
    | nil => simp [eqNodes] at h
    | cons => rfl
  simp only [withUrgentStrip, nonempty, Bool.false_and, Bool.false_eq_true,
    ↓reduceIte, Option.getD_some, List.map_append, List.mem_append]
  exact Or.inl h

/-- Simultaneous coverage: no choice of a foreground alert can suppress another
active urgent rule. Applies before/after acknowledgment and on every screen. -/
theorem strip_continuous_perceivability (sp facts user s base edge initial)
    (layout : StripLayout (withUrgentStrip sp facts user s base) edge initial) :
    ∀ n target, Within edge n ⟨stripMeaning (withUrgentStrip sp facts user s base), initial⟩ target →
      ∀ rule ∈ sp.alerts, Specs.AlertUrgency.approvedTier rule.id = some .urgent →
        (∃ key, key ∈ alertKeys facts s rule.cond) →
        AlertShown target.screen target.moment rule.id (uiLabel rule.label "Clinical alert")
          (match rule.tier with | .interruptive => "interruptive" | .passive => "passive" | .removable => "removable") := by
  intro n target reach rule member urgent clinical
  have present := strip_covers_all_active sp facts user s base rule member urgent clinical
  obtain ⟨background, same, geometry⟩ := layout n target reach
  refine ⟨?_, geometry _ present⟩
  rw [same]
  simp only [active, stripMeaning, Option.getD_none, List.mem_append]
  exact Or.inl present

/-- The pointwise strip theorem holds at every reachable interpreter state.
Layout is the only per-state premise; active-condition coverage is derived. -/
theorem reachable_strip_continuous (ep : Props.Episode) (disp : Display) (edge : View → View → Prop)
    (initial : State → Moment)
    (layout : ∀ s, Props.Reachable ep s → StripLayout
      (withUrgentStrip ep.spec ep.facts ep.user s (renderUi ep.spec ep.prog ep.facts disp ep.user s)) edge (initial s)) :
    ∀ s, Props.Reachable ep s → ∀ n target,
      Within edge n ⟨stripMeaning (withUrgentStrip ep.spec ep.facts ep.user s
        (renderUi ep.spec ep.prog ep.facts disp ep.user s)), initial s⟩ target →
      ∀ rule ∈ ep.spec.alerts, Specs.AlertUrgency.approvedTier rule.id = some .urgent →
        (∃ key, key ∈ alertKeys ep.facts s rule.cond) →
        AlertShown target.screen target.moment rule.id (uiLabel rule.label "Clinical alert")
          (match rule.tier with | .interruptive => "interruptive" | .passive => "passive" | .removable => "removable") := by
  intro s reachable
  exact strip_continuous_perceivability _ _ _ _ _ _ _ (layout s reachable)

#print axioms active_urgent_in_strip
#print axioms strip_covers_all_active
#print axioms strip_continuous_perceivability
#print axioms reachable_strip_continuous
end Ehr.Sem
