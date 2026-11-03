import Ehr.Sem.Indexed
import Ehr.Sem.TimelineProgram
import Ehr.Sem.Board
import Ehr.Render.Dated
import Ehr.Render.Fhir

namespace Ehr.Sem.DatedTimeline
open Ehr Render

def transform (sources : List UiSourceDate) (s : UiScreen) : UiScreen :=
  { s with workspace := [.datedTimeline "Dated clinical timeline (UTC)"
    (Dated.dated sources) (Dated.undated sources) s.workspace] }

@[simp] theorem preserves (sources s) : meaning (transform sources s) = meaning s := by
  simp [transform, meaning, baseAtoms, uiAtoms, uiAtomsList, uiBannerAtom]

/-- Compatibility projection for clinical predicates only. Dated admission also
requires fullAdmission and production sources_shown/sources_bound. -/
def admission (sources : List UiSourceDate) : PresentationExtension := ⟨transform sources, preserves sources⟩

/-- Full observation retains the normalized index, including every raw source
and nanosecond, and every inherited index. Clinical equality alone is insufficient. -/
theorem full_preserves (sources s) :
    indexedMeaning (transform sources s) =
      { clinical := meaning s,
        indexes := [.datedTimeline "Dated clinical timeline (UTC)"
          (Dated.dated sources) (Dated.undated sources) []] ++ (indexedMeaning s).indexes } := by
  simp [indexedMeaning, transform, meaning, baseAtoms, uiAtoms, uiAtomsList, uiBannerAtom, DateIndex.observeList, DateIndex.observe,
    DateIndex.observeList_append, List.append_assoc]

def fullAdmission (sources : List UiSourceDate) : IndexedExtension sources :=
  ⟨admission sources, full_preserves sources⟩

#print axioms full_preserves

theorem predicates (sources s) (P : Screen → Prop) :
    P (meaning (transform sources s)) ↔ P (meaning s) := by rw [preserves]

/-- Scroll/focus edges and exposure are transported without changing their bounds.
No new view transition is introduced by the read-only index. -/
theorem view_trace (sources s edge bound moment target) :
    Within edge bound (View.mk (meaning (transform sources s)) moment) target ↔
      Within edge bound (View.mk (meaning s) moment) target := by rw [preserves]

theorem perception (sources s moment fact) :
    Perceives (meaning (transform sources s)) moment fact ↔
      Perceives (meaning s) moment fact := by rw [preserves]

theorem reachability (sources s edge bound moment id) :
    ActionWithin (meaning (transform sources s)) edge bound moment id ↔
      ActionWithin (meaning s) edge bound moment id := by rw [preserves]

theorem urgency (sources s moment urgent) :
    UrgentVisible (meaning (transform sources s)) moment urgent ↔
      UrgentVisible (meaning s) moment urgent := by rw [preserves]

/-- Source-date detail belongs to the bound chart; directory lookup retains its
ordinary picker and the board-wide urgent rail, with no source index yet. -/
def context (i : RenderInput) : Ctx :=
  { sp := i.spec, prog := i.program, facts := i.facts, disp := i.display, user := i.user, s := i.state }

def sourcesFor (i : RenderInput) (screen : UiScreen) : List UiSourceDate :=
  uiDateSourcesAt (context i) (screen.workspace ++ screen.side)

def sources (i : RenderInput) : List UiSourceDate := sourcesFor i (runRenderUi i)

def render (i : RenderInput) : UiScreen :=
  if uiDateBound (context i) then transform (sources i) (runRenderUi i) else runRenderUi i

/-- Every production index source has a real shown full-row witness and is a
candidate in the declared three-field scope. This covers both positioned and
unpositioned entries; the witness is never inferred from an erased index. -/
theorem sources_shown (i : RenderInput) (source : UiSourceDate) (h : source ∈ sources i) :
    source ∈ i.display.timelineSources?.getD [] ∧
      ∃ b ∈ i.display.timelineBackings?.getD [], b.source = source ∧
        (infoPayload i.facts b.info).isNone = true ∧ ∃ comp title style rows,
          UiNode.info comp title b.info style rows ∈
            uiAtomsList ((runRenderUi i).workspace ++ (runRenderUi i).side) ∧ b.row ∈ rows :=
  uiDateSourcesAt_shown (context i) _ source h

theorem sources_bound (i : RenderInput) (source : UiSourceDate) (h : source ∈ sources i) :
    (Workspace.enabled i.program = false ∨ Workspace.bound i.facts i.state = true) ∧
      i.facts.sourcePatientId?.isSome = true ∧ i.facts.sourcePatientId? = i.display.sourcePatientId? :=
  uiDateSourcesAt_bound (context i) _ source h

/-- An observed production dated row is normalized, bounded and backed by a
shown row. No hidden candidate is authorized merely by existing in the bundle. -/
theorem dated_shown (i : RenderInput) (item : UiDatedItem) (h : item ∈ Dated.dated (sources i)) :
    item.source ∈ sources i ∧ item.nanosecond.val < 1000000000 ∧
      Dated.parse item.source.timestamp = some (item.utcSecond, (item.nanosecond : Nat)) := by
  obtain ⟨hs, ht⟩ := Dated.source_exact _ _ h
  exact ⟨hs, item.nanosecond.isLt, ht⟩

theorem undated_shown (i : RenderInput) (source : UiSourceDate)
    (h : source ∈ Dated.undated (sources i)) : source ∈ sources i :=
  (List.mem_filter.mp h).1

theorem sources_unbound (i : RenderInput) (enabled : Workspace.enabled i.program = true)
    (unbound : Workspace.bound i.facts i.state = false) : sources i = [] :=
  uiDateSourcesAt_unbound (context i) _ enabled unbound

/-- The actual outer index, when present, is completely observed. Unbound output
adds no clinical date index. Inherited indexes retain their own full observation. -/
theorem render_full (i : RenderInput) :
    indexedMeaning (render i) =
      if uiDateBound (context i) then
        { clinical := meaning (runRenderUi i),
          indexes := [.datedTimeline "Dated clinical timeline (UTC)"
            (Dated.dated (sources i)) (Dated.undated (sources i)) []] ++
              (indexedMeaning (runRenderUi i)).indexes }
      else indexedMeaning (runRenderUi i) := by
  unfold render
  split <;> simp_all [full_preserves]

#print axioms sources_shown
#print axioms sources_bound
#print axioms dated_shown
#print axioms undated_shown
#print axioms sources_unbound
#print axioms render_full

/-- The single-patient dated workspace uses the same board-wide active rail.
The underlying ordinary clinical interpreter and complete screen are unchanged. -/
def node (i : RenderInput) : UiNode :=
  let patient := i.facts.sourcePatientId?.getD i.facts.patientId
  let session : Board.Session := { patient, input := i }
  let ui := render i
  .board (Board.demands session) [Board.encodeScreen patient ui]

theorem node_meaning (i : RenderInput) :
    Board.decodeBoard (node i) =
      [(i.facts.sourcePatientId?.getD i.facts.patientId, meaning (runRenderUi i))] := by
  unfold node render
  split <;> simp [Board.decodeBoard, Board.encodeScreen_meaning]

/-- Full native observation retains the patient namespace, modal separation and
all actual index bytes. The API exports this observation for the independent gate. -/
theorem node_observation (i : RenderInput) :
    DateIndex.observe (node i) =
      [.patientPane (i.facts.sourcePatientId?.getD i.facts.patientId) (render i).banner
        (Board.metadata (render i))
        (DateIndex.observeList ((render i).workspace ++ (render i).side ++ uiNavAtoms (render i).nav))
        (DateIndex.observeList (render i).modal.toList)] := by
  simp [node, Board.encodeScreen, DateIndex.observe, DateIndex.observeList]

#print axioms node_observation

/-- Ordinary programs opt in on any shown component. The unchanged checker and
all D-theorems still apply; the original ordered timeline remains available. -/
def program : Program :=
  { timelineProgram with screens := timelineProgram.screens.map fun sc =>
      { sc with components := sc.components.map fun c =>
          if c.id == "eventAxis" then { c with tag := "layout.datedTimeline" } else c } }

theorem checked : Check.check Ehr.Examples.Tiny.spec none Props.Examples.goodProgram program = .ok := by decide

/-- Candidate extraction retains effectiveDateTime. Emission additionally requires a
shown backing row and binding; this is not a statement about every FHIR time field. -/
theorem effective_source (rs : List Lean.Json) (r : Lean.Json) (hr : r ∈ rs)
    (present : Fhir.str r "effectiveDateTime" ≠ "") :
    ({ resource := Fhir.resourceType r ++ "/" ++ Fhir.str r "id",
       field := "effectiveDateTime", timestamp := Fhir.str r "effectiveDateTime" } : UiSourceDate) ∈
      Fhir.timelineSources rs := by
  apply List.mem_flatMap.mpr
  refine ⟨r, hr, ?_⟩
  simp [present]

/-- Issued and effective times are separate entries; one never overwrites the other. -/
theorem issued_source (rs : List Lean.Json) (r : Lean.Json) (hr : r ∈ rs)
    (present : Fhir.str r "issued" ≠ "") :
    ({ resource := Fhir.resourceType r ++ "/" ++ Fhir.str r "id",
       field := "issued", timestamp := Fhir.str r "issued" } : UiSourceDate) ∈
      Fhir.timelineSources rs := by
  apply List.mem_flatMap.mpr
  refine ⟨r, hr, ?_⟩
  exact List.mem_append_right _ (by simp [present])

/-- For the three candidate fields only, the pure normalization partition retains
source occurrences. This lemma does not authorize emitting unshown candidates. -/
theorem fhir_source_complete (rs : List Lean.Json) (source : UiSourceDate)
    (h : source ∈ Fhir.timelineSources rs) :
    source ∈ (Dated.dated (Fhir.timelineSources rs)).map (·.source) ++
      Dated.undated (Fhir.timelineSources rs) :=
  (Dated.no_source_drop _).mem_iff.mpr h

/- An invalid source cannot be repaired by silently treating local time as UTC. -/
#guard Dated.project ⟨"Observation/local", "effectiveDateTime", "2026-11-02T01:30:00"⟩ == none
#guard (Dated.dated [⟨"Observation/a", "issued", "2026-11-02T01:30:00-08:00"⟩,
  ⟨"Observation/b", "effectiveDateTime", "2026-11-02T01:30:00-07:00"⟩]).map (·.source.resource) ==
    ["Observation/b", "Observation/a"]

#print axioms node_meaning
#print axioms effective_source
#print axioms issued_source
#print axioms fhir_source_complete
#print axioms preserves
#print axioms predicates
#print axioms view_trace
#print axioms perception
#print axioms reachability
#print axioms urgency
#print axioms checked
end Ehr.Sem.DatedTimeline
