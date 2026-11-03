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

def admission (sources : List UiSourceDate) : PresentationExtension := ⟨transform sources, preserves sources⟩

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
def sources (i : RenderInput) : List UiSourceDate :=
  if Workspace.enabled i.program && !Workspace.bound i.facts i.state then []
  else i.display.timelineSources?.getD []

/-- The single-patient dated workspace uses the same board-wide active rail.
The underlying ordinary clinical interpreter and complete screen are unchanged. -/
def node (i : RenderInput) : UiNode :=
  let patient := i.facts.sourcePatientId?.getD i.facts.patientId
  let session : Board.Session := { patient, input := i }
  let ui := transform (sources i) (runRenderUi i)
  .board (Board.demands session) [Board.encodeScreen patient ui]

theorem node_meaning (i : RenderInput) :
    Board.decodeBoard (node i) =
      [(i.facts.sourcePatientId?.getD i.facts.patientId, meaning (runRenderUi i))] := by
  simp [node, Board.decodeBoard, Board.encodeScreen_meaning]

/-- Ordinary programs opt in on any shown component. The unchanged checker and
all D-theorems still apply; the original ordered timeline remains available. -/
def program : Program :=
  { timelineProgram with screens := timelineProgram.screens.map fun sc =>
      { sc with components := sc.components.map fun c =>
          if c.id == "eventAxis" then { c with tag := "layout.datedTimeline" } else c } }

theorem checked : Check.check Ehr.Examples.Tiny.spec none Props.Examples.goodProgram program = .ok := by decide

/-- Every supplied effectiveDateTime is retained verbatim from its FHIR resource. -/
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

/-- Complete FHIR-source preservation through UTC normalization and sorting,
including invalid/ambiguous values in the explicit unpositioned region. -/
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
