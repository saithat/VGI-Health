import Ehr.Render.Proofs
import Ehr.Render.FhirProofs

/-!
# T11: every safety row reaches the page

The parser completeness theorems are composed with occurrence in the actual
info tree and T10's guard-to-page theorem. These statements do not assume
that a panel is empty or that its rows fit on one viewport.
-/
namespace Ehr.Render
open Lean

theorem row_in_table (heads : List String) (rows : List Ro) (empty : String) (r : Ro)
    (hr : r ∈ rows) : Within r.toHtml (table heads rows empty).toHtml := by
  have hn : rows.isEmpty = false := List.isEmpty_eq_false_iff.mpr (List.ne_nil_of_mem hr)
  simp only [table, hn, Bool.false_eq_true, ↓reduceIte, Ro.toHtml_el]
  apply Within.child (c := (.el .tbody [] [] rows : Ro).toHtml) (by simp)
  apply Within.of_mem
  simpa [Ro.toHtmlList_eq] using (List.mem_map.mpr ⟨r, hr, rfl⟩ : r.toHtml ∈ rows.map Ro.toHtml)

theorem allergy_row_in_info (cx : Ctx) (r : AllergyRow) (hr : r ∈ cx.disp.allergies) :
    Within (allergyTr r).toHtml (infoContent cx "allergyList").toHtml := by
  exact row_in_table _ _ _ _ (List.mem_map.mpr ⟨r, hr, rfl⟩)

theorem med_row_in_info (cx : Ctx) (r : MedRow) (hr : r ∈ cx.disp.meds) :
    Within (medTr r).toHtml (infoContent cx "currentMeds").toHtml := by
  exact row_in_table _ _ _ _ (List.mem_map.mpr ⟨r, hr, rfl⟩)

/-- Every allergy row in Display is inside the shown allergy component. -/
theorem T11_allergy_panel (cx : Ctx) (r : AllergyRow) (hr : r ∈ cx.disp.allergies)
    (hi : infoShown cx.sp cx.prog cx.facts cx.s "allergyList" = true) :
    ∃ n, Within n (page cx) ∧ (∃ id, n.HasCompId id) ∧ Within (allergyTr r).toHtml n := by
  obtain ⟨it, _, _, hw, hid, hc⟩ := T10_info cx "allergyList" hi
  exact ⟨_, hw, ⟨_, hid⟩, (allergy_row_in_info cx r hr).trans hc⟩

/-- Every current medication row in Display is inside the shown meds component. -/
theorem T11_med_panel (cx : Ctx) (r : MedRow) (hr : r ∈ cx.disp.meds)
    (hi : infoShown cx.sp cx.prog cx.facts cx.s "currentMeds" = true) :
    ∃ n, Within n (page cx) ∧ (∃ id, n.HasCompId id) ∧ Within (medTr r).toHtml n := by
  obtain ⟨it, _, _, hw, hid, hc⟩ := T10_info cx "currentMeds" hi
  exact ⟨_, hw, ⟨_, hid⟩, (med_row_in_info cx r hr).trans hc⟩

/-- T11 end to end: every active bundle allergy is in its shown component. -/
theorem T11_allergy_fhir_page (cx : Ctx) (ctx : FactsContext) (b r : Json)
    (hp : Fhir.parseBundle ctx b = .ok (cx.facts, cx.disp))
    (hr : r ∈ Fhir.bundleResources b) (ha : Fhir.isAllergy r = true) (active : Fhir.allergyActive r = true)
    (hi : infoShown cx.sp cx.prog cx.facts cx.s "allergyList" = true) :
    ∃ n, Within n (page cx) ∧ (∃ id, n.HasCompId id) ∧ Within (allergyTr (Fhir.allergyRow r)).toHtml n :=
  T11_allergy_panel cx _ (Fhir.T11_allergy ctx b _ _ hp r hr ha active) hi

/-- T11 end to end: every active bundle medication is in its shown component. -/
theorem T11_med_fhir_page (cx : Ctx) (ctx : FactsContext) (b r : Json)
    (hp : Fhir.parseBundle ctx b = .ok (cx.facts, cx.disp))
    (hr : r ∈ Fhir.bundleResources b) (hm : Fhir.isMedRequest r = true) (active : Fhir.medActive r = true)
    (hi : infoShown cx.sp cx.prog cx.facts cx.s "currentMeds" = true) :
    ∃ n, Within n (page cx) ∧ (∃ id, n.HasCompId id) ∧ Within (medTr (Fhir.medRow r)).toHtml n :=
  T11_med_panel cx _ (Fhir.T11_med ctx b _ _ hp r hr hm active) hi

/-- Tiny's rooming allergy panel with a real parsed, nonempty record. -/
def tinyFhirCtx : Ctx :=
  { tinyCtx with
    facts := Fhir.tinyFacts
    disp := Fhir.tinyDisplay
    s := init tinyCtx.sp tinyCtx.prog Fhir.tinyFacts tinyCtx.user }

example : ∃ n, Within n (page tinyFhirCtx) ∧ (∃ id, n.HasCompId id) ∧
    Within (allergyTr (Fhir.allergyRow Fhir.tinyAllergy)).toHtml n := by
  apply T11_allergy_fhir_page tinyFhirCtx Tests.context Fhir.tinyBundle Fhir.tinyAllergy
  · exact Fhir.tiny_parse
  · change Fhir.tinyAllergy ∈ [Fhir.tinyPatient, Fhir.tinyAllergy, Fhir.tinyMed, Fhir.tinyWeight]; simp
  · decide
  · decide
  · decide

example : ∃ n, Within n (page { tinyFhirCtx with s := { tinyFhirCtx.s with screen := "sign" } }) ∧
    (∃ id, n.HasCompId id) ∧ Within (medTr (Fhir.medRow Fhir.tinyMed)).toHtml n := by
  apply T11_med_fhir_page { tinyFhirCtx with s := { tinyFhirCtx.s with screen := "sign" } }
    Tests.context Fhir.tinyBundle Fhir.tinyMed
  · exact Fhir.tiny_parse
  · change Fhir.tinyMed ∈ [Fhir.tinyPatient, Fhir.tinyAllergy, Fhir.tinyMed, Fhir.tinyWeight]; simp
  · decide
  · decide
  · decide

#print axioms T11_allergy_fhir_page
#print axioms T11_med_fhir_page
end Ehr.Render
