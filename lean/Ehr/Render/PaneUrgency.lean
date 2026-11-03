import Ehr.Render.UrgentStrip

namespace Ehr.Render

@[simp] theorem strip_alerts_exact (sp facts s) :
    ((urgentNodes sp facts s).filterMap stripAtom?).map UiStripAtom.toNode = urgentNodes sp facts s := by
  simp [urgentNodes, List.filterMap_map, List.map_map, Function.comp_def, stripAtom?, UiStripAtom.toNode]

/-- Pane metadata retains every actual production strip node, including the exact
acknowledgment event, enablement and reason. No clinical statement is changed. -/
theorem pane_strip_exact (sp facts user s base) :
    (((withUrgentStrip sp facts user s base).urgent?.getD []).filterMap stripAtom?).map
      UiStripAtom.toNode = (withUrgentStrip sp facts user s base).urgent?.getD [] := by
  cases hp : s.popup? with
  | none =>
    simp only [withUrgentStrip, hp]
    split <;> simp_all [List.filterMap_append, List.map_append]
  | some pair =>
    rcases pair with ⟨id, key⟩
    cases hu : Specs.AlertUrgency.approvedTier id == some .urgent <;>
      simp only [withUrgentStrip, hp, hu] <;>
      split <;> simp_all [List.filterMap_append, List.map_append, stripAtom?, UiStripAtom.toNode] <;>
      split <;> simp_all [List.filterMap_append, List.map_append, stripAtom?, UiStripAtom.toNode]

#print axioms strip_alerts_exact
#print axioms pane_strip_exact
end Ehr.Render
