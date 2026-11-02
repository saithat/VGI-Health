import Ehr.Core.Alerts

namespace Ehr
/-- Every emitted advisory key has actual minor evidence in this snapshot. -/
theorem advisory_requires_minor (facts : Facts) (s : State) (key : String)
    (fires : key ∈ alertKeys facts s .minorInteraction) :
    ∃ evidence ∈ facts.interactions?.getD [], evidence.severity = .minor ∧ evidence.key = key := by
  simp only [alertKeys] at fires
  split at fires
  · simp at fires
  · obtain ⟨e, member, equal⟩ := List.mem_map.mp fires
    exact ⟨e, (List.mem_filter.mp member).1,
      by simpa using (List.mem_filter.mp member).2, equal⟩

theorem severe_never_advisory (facts : Facts) (s : State)
    (severe : (facts.interactions?.getD []).any (·.severity == .severe) = true) :
    alertKeys facts s .minorInteraction = [] := by simp [alertKeys, severe]

theorem formulary_hazard_never_advisory (facts : Facts) (s : State)
    (severe : (drugsInPlay facts s).any (fun d => interacts facts ((drugsInPlay facts s).erase d) d) = true) :
    alertKeys facts s .minorInteraction = [] := by simp [alertKeys, severe]

theorem severe_evidence_triggers_interaction (facts : Facts) (s : State) (e : InteractionEvidence)
    (member : e ∈ facts.interactions?.getD []) (severe : e.severity = .severe) :
    e.key ∈ alertKeys facts s .interaction := by
  apply List.mem_append_right
  exact List.mem_map.mpr ⟨e, List.mem_filter.mpr ⟨member, by simp [severe]⟩, rfl⟩

#print axioms severe_evidence_triggers_interaction
#print axioms advisory_requires_minor
#print axioms severe_never_advisory
#print axioms formulary_hazard_never_advisory
end Ehr
