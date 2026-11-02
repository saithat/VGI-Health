import Ehr.Check.StructuralWitness
import Ehr.Canonical.BadPrograms

namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1

/-- Filtering out an element removes every field for it, regardless of the
size, roles or navigation of the original program. -/
theorem withoutElement_no_field (p : Program) (eid : ElementId)
    (sc : Screen × Component) (hc : sc ∈ allComps (withoutElement p eid))
    (slot : Slot) (pf : Prefill) : fieldOf? sc.2.kind ≠ some (eid, slot, pf) := by
  simp only [allComps, List.mem_flatMap, List.mem_map] at hc
  obtain ⟨scr, hscr, c, hc, rfl⟩ := hc
  simp only [withoutElement, List.mem_map] at hscr
  obtain ⟨original, horiginal, rfl⟩ := hscr
  have kept := (List.mem_filter.mp hc).2
  cases hk : c.kind <;> simp_all [fieldOf?, withoutElement]

/-- An actual commit component witnesses membership in the required task family. -/
theorem required_of_component (sp : Spec) (can p : Program) (sc : Screen × Component)
    (hc : sc ∈ allComps p) (cm : CommitId) (hk : sc.2.kind = .button (.commit cm))
    (cs : CommitSpec) (hcs : sp.commit? cm = some cs) (hr : p.role ∈ cs.roles) :
    cm ∈ requiredCommits sp can p := by
  simp only [allComps, List.mem_flatMap, List.mem_map] at hc
  obtain ⟨scr, hscr, c, hc, rfl⟩ := hc
  change c.kind = .button (.commit cm) at hk
  apply List.mem_filter.mpr
  refine ⟨List.mem_eraseDups.mpr (List.mem_append_right _ ?_), ?_⟩
  · exact List.mem_flatMap.mpr ⟨scr, hscr,
      List.mem_filterMap.mpr ⟨c, hc, by simp [hk]⟩⟩
  · simpa [hcs] using hr

/-- A missing required field violates property 1 independently of execution
samples or any unrelated pre-op/review defect in the canonical. -/
theorem missing_required_not_satisfies (sp : Spec) (can p : Program) (cm : CommitId)
    (hcm : cm ∈ requiredCommits sp can p) (rq : EntryReq)
    (hrq : rq ∈ sp.entries) (same : rq.commit = cm)
    (relevant : entryRelevantForRole sp p.role rq = true)
    (absent : ∀ sc ∈ allComps p, ∀ slot pf, fieldOf? sc.2.kind ≠ some (rq.element, slot, pf)) :
    ¬ Satisfies sp none can p := by
  intro h
  obtain ⟨sc, hc, ⟨f, hf, he⟩, _⟩ := h.1.2.2.2.2.1 cm hcm rq hrq same relevant
  have hf' : fieldOf? sc.2.kind = some f := by simpa using hf
  rcases f with ⟨e, slot, pf⟩
  change e = rq.element at he
  subst e
  exact absent sc hc slot pf hf'

#print axioms withoutElement_no_field
#print axioms required_of_component
#print axioms missing_required_not_satisfies
end Ehr.Check
