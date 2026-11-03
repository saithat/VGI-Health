import Ehr.Render.Dated
import Ehr.Render.Atoms

/-! Source eligibility is a real information-row witness. Full index observation
retains every dated/undated payload; it is distinct from the clinical projection. -/
namespace Ehr.Render.DateIndex

def backs (nodes : List UiNode) (b : UiDateBacking) : Bool :=
  (uiAtomsList nodes).any fun n => match n with
    | .info _ _ info _ rows => info == b.info && rows.contains b.row
    | _ => false

/-- Filter original occurrences: alternative backing rows never duplicate a source. -/
def select (candidates : List UiSourceDate) (backings : List UiDateBacking)
    (nodes : List UiNode) : List UiSourceDate :=
  (candidates.zipIdx.filter fun (source, occurrence) => backings.any fun b =>
    b.source == source && b.occurrence == occurrence && backs nodes b).map Prod.fst

/-- Permission is attached to the original occurrence, including identical DTOs. -/
theorem selected_occurrence (candidates bs nodes source) (h : source ∈ select candidates bs nodes) :
    ∃ occurrence, (source, occurrence) ∈ candidates.zipIdx ∧
      ∃ b ∈ bs, b.source = source ∧ b.occurrence = occurrence ∧ ∃ comp title style rows,
        UiNode.info comp title b.info style rows ∈ uiAtomsList nodes ∧ b.row ∈ rows := by
  obtain ⟨⟨src, occurrence⟩, hf, he⟩ := List.mem_map.mp h
  cases he
  obtain ⟨hc, hb⟩ := List.mem_filter.mp hf
  obtain ⟨b, hb, hs⟩ := List.any_eq_true.mp hb
  simp only [Bool.and_eq_true, beq_iff_eq] at hs
  obtain ⟨⟨hs, hi⟩, hv⟩ := hs
  obtain ⟨n, hn, hv⟩ := List.any_eq_true.mp hv
  cases n <;> simp [backs] at hv
  next comp title info style rows =>
    obtain ⟨he, hr⟩ := hv
    subst info
    exact ⟨occurrence, hc, b, hb, hs, hi, comp, title, style, rows, hn, by simpa using hr⟩

theorem selected_source (candidates bs nodes source) (h : source ∈ select candidates bs nodes) :
    source ∈ candidates ∧ ∃ b ∈ bs, b.source = source ∧ ∃ comp title style rows,
      UiNode.info comp title b.info style rows ∈ uiAtomsList nodes ∧ b.row ∈ rows := by
  obtain ⟨_, hc, b, hb, hs, _, witness⟩ := selected_occurrence _ _ _ _ h
  exact ⟨List.fst_mem_of_mem_zipIdx hc, b, hb, hs, witness⟩

/- Identical DTOs retain separate permissions: the second hidden occurrence is withheld. -/
#guard select [⟨"Observation/a", "issued", "2026-11-02T08:30:00Z"⟩,
    ⟨"Observation/a", "issued", "2026-11-02T08:30:00Z"⟩]
  [{ source := ⟨"Observation/a", "issued", "2026-11-02T08:30:00Z"⟩, occurrence := 0,
     info := "labs", row := [("Value", "shown")] },
   { source := ⟨"Observation/a", "issued", "2026-11-02T08:30:00Z"⟩, occurrence := 1,
     info := "labs", row := [("Value", "hidden")] }]
  [.info "labPanel" "Labs" "labs" "table" [[("Value", "shown")]]] ==
    [⟨"Observation/a", "issued", "2026-11-02T08:30:00Z"⟩]

#print axioms selected_occurrence

mutual
/-- Observe payloads from the emitted tree, including nested panes and modals. -/
def observe : UiNode → List UiNode
  | .datedTimeline title dated undated children =>
      .datedTimeline title dated undated [] :: observeList children
  | .patientPane patient banner metadata children modal =>
      [.patientPane patient banner metadata (observeList children) (observeList modal)]
  | .board _ children | .timeline _ children | .presentation _ children
  | .valueSet _ _ children | .chartReferences _ children | .rowAction _ _ children
  | .section _ _ children | .columns children => observeList children
  | .tabs _ _ _ children => observeList children
  | _ => []
termination_by n => sizeOf n

def observeList : List UiNode → List UiNode
  | [] => []
  | n :: rest => observe n ++ observeList rest
termination_by ns => sizeOf ns
end

@[simp] theorem observeList_append (a b) : observeList (a ++ b) = observeList a ++ observeList b := by
  induction a with
  | nil => simp [observeList]
  | cons n rest ih => simp [observeList, ih, List.append_assoc]

/-- Neither reordering, dropping nor changing an index payload is erased. -/
theorem payload_injective (title : String) (a b : List UiDatedItem) (u v : List UiSourceDate) :
    observe (.datedTimeline title a u []) = observe (.datedTimeline title b v []) ↔ a = b ∧ u = v := by
  simp [observe, observeList]

#print axioms selected_source
#print axioms observeList_append
#print axioms payload_injective
end Ehr.Render.DateIndex
