import Ehr.Render.Fhir
import Ehr.Render.FhirTests
import Ehr.Examples.Tiny

/-!
# T5 and T11: the FHIR abstraction preserves its evidence

An active allergy or medication in a successfully parsed bundle has its full
row in Display, even after date sorting. A weight reported as recorded today
comes from an actual non-error body-weight observation with that date, value
and unit. Versions are the declared digest of all resources of the type and
are invariant under permutation. Digest collision freedom is not claimed.
-/
namespace Ehr.Render.Fhir
open Lean

/-- The wasm32-safe reconstruction has exactly String.ofList semantics. -/
theorem stringOfChars_eq (cs : List Char) : stringOfChars cs = String.ofList cs := by
  have aux (xs : List Char) (s : String) : xs.foldl String.push s = s ++ String.ofList xs := by
    induction xs generalizing s with
    | nil => simp
    | cons c cs ih =>
      rw [List.foldl_cons, ih, String.ofList_cons, String.push_eq_append, String.append_assoc]
  simpa [stringOfChars] using aux cs ""

#print axioms stringOfChars_eq

theorem allergyRows_complete (rs : List Json) (r : Json) (hr : r ∈ rs)
    (ha : isAllergy r = true) (active : allergyActive r = true) :
    allergyRow r ∈ allergyRows rs := by
  have hv : verificationStatus r != "entered-in-error" := by
    simp only [allergyActive, Bool.and_eq_true] at active
    exact active.2
  simp only [allergyRows, newestFirst, List.mem_mergeSort, List.mem_map]
  exact ⟨r, List.mem_filter.mpr ⟨hr, by simp [ha, hv]⟩, rfl⟩

theorem medRows_complete (rs : List Json) (r : Json) (hr : r ∈ rs)
    (hm : isMedRequest r = true) (active : medActive r = true) :
    medRow r ∈ medRows rs := by
  have hc : medCurrent r = true := by simp_all [medActive, medCurrent]
  simp only [medRows, newestFirst, List.mem_mergeSort, List.mem_map]
  exact ⟨r, List.mem_filter.mpr ⟨hr, by simp [hm, hc]⟩, rfl⟩

/-- Recover the patient and the exact facts/display used by a successful parse. -/
theorem parseBundle_eq (ctx : FactsContext) (b : Json) (f : Facts) (d : Display)
    (h : parseBundle ctx b = .ok (f, d)) :
    ∃ p, f = factsOf ctx (chartResourcesOfBundle b) p ∧ d = displayOf ctx (chartResourcesOfBundle b) p := by
  unfold parseBundle at h
  split at h
  · contradiction
  · dsimp only at h
    split at h
    · contradiction
    · cases h; exact ⟨_, rfl, rfl⟩

/-- Read-only previews never attest identity, weight, review, medication class or code status. -/
theorem chart_previews_preserve_clinical_facts (ctx : FactsContext) (rs : List Json) (p : Json) :
    (factsOf ctx rs p).patientId = (baseFactsOf ctx rs p).patientId ∧
    (factsOf ctx rs p).sourcePatientId? = (baseFactsOf ctx rs p).sourcePatientId? ∧
    (factsOf ctx rs p).weightToday? = (baseFactsOf ctx rs p).weightToday? ∧
    (factsOf ctx rs p).allergyVersion = (baseFactsOf ctx rs p).allergyVersion ∧
    (factsOf ctx rs p).currentMedClasses = (baseFactsOf ctx rs p).currentMedClasses ∧
    (factsOf ctx rs p).receipts = (baseFactsOf ctx rs p).receipts ∧
    (factsOf ctx rs p).record = (baseFactsOf ctx rs p).record := by simp [factsOf]

#print axioms chart_previews_preserve_clinical_facts

/-- T11: every active allergy survives abstraction into Display. -/
theorem T11_allergy (ctx : FactsContext) (b : Json) (f : Facts) (d : Display)
    (h : parseBundle ctx b = .ok (f, d)) (r : Json) (hr : r ∈ chartResourcesOfBundle b)
    (ha : isAllergy r = true) (active : allergyActive r = true) : allergyRow r ∈ d.allergies := by
  obtain ⟨p, _, rfl⟩ := parseBundle_eq ctx b f d h
  exact allergyRows_complete _ r hr ha active

/-- T11: every active medication survives abstraction into Display. -/
theorem T11_med (ctx : FactsContext) (b : Json) (f : Facts) (d : Display)
    (h : parseBundle ctx b = .ok (f, d)) (r : Json) (hr : r ∈ chartResourcesOfBundle b)
    (hm : isMedRequest r = true) (active : medActive r = true) : medRow r ∈ d.meds := by
  obtain ⟨p, _, rfl⟩ := parseBundle_eq ctx b f d h
  exact medRows_complete _ r hr hm active

/-- The latest reader returns a member of its input, never a synthetic reading. -/
theorem latestBy_mem {α : Type} (key : α → String) (rs : List α) (x : α)
    (h : latestBy key rs = some x) : x ∈ rs := by
  induction rs with
  | nil => simp [latestBy] at h
  | cons a rs ih =>
    simp only [latestBy] at h
    split at h
    · cases h; simp
    · split at h
      · cases h; exact List.mem_cons_of_mem _ (ih ‹_›)
      · cases h; simp

/-- A reported today's weight is witnessed by the exact source observation. -/
theorem weightToday_witness (today : String) (rs : List Json) (w : Nat) (u : UnitKind)
    (h : weightTodayOf today rs = some (w, u)) :
    ∃ r ∈ rs, isBodyWeight r = true ∧ dayOf (obsWhen r) = today ∧
      unitOf (field r "valueQuantity") = some u ∧ qtyScaled (field r "valueQuantity") 1 = some w := by
  unfold weightTodayOf at h
  obtain ⟨reading, hl, he⟩ := Option.map_eq_some_iff.mp h
  have hm := latestBy_mem (·.1) _ reading hl
  obtain ⟨r, hr, hread⟩ := List.mem_filterMap.mp hm
  obtain ⟨hr, hf⟩ := List.mem_filter.mp hr
  simp only [Bool.and_eq_true] at hf
  obtain ⟨hb, ht⟩ := hf
  obtain ⟨wu, hw, eqr⟩ := Option.map_eq_some_iff.mp hread
  have hwu : wu = (w, u) := by simpa [← eqr] using he
  subst wu
  refine ⟨r, hr, hb, by simpa using ht, ?_⟩
  unfold weightReading at hw
  dsimp only at hw
  split at hw <;> simp_all

/-- T5: the public parser's recorded-today weight has source evidence. -/
theorem T5_weight (ctx : FactsContext) (b : Json) (f : Facts) (d : Display)
    (h : parseBundle ctx b = .ok (f, d)) (w : Nat) (u : UnitKind)
    (hw : f.weightToday? = some (w, u)) :
    ∃ r ∈ bundleResources b, isBodyWeight r = true ∧ dayOf (obsWhen r) = ctx.today ∧
      unitOf (field r "valueQuantity") = some u ∧ qtyScaled (field r "valueQuantity") 1 = some w := by
  obtain ⟨p, rfl, _⟩ := parseBundle_eq ctx b f d h
  obtain ⟨r, hr, hrest⟩ := weightToday_witness _ _ w u hw
  exact ⟨r, chartResource_mem hr, hrest⟩

/-- T5: allergy versions cover precisely all bundle allergy resources. -/
theorem T5_allergyVersion (ctx : FactsContext) (b : Json) (f : Facts) (d : Display)
    (h : parseBundle ctx b = .ok (f, d)) :
    f.allergyVersion = listVersion ((chartResourcesOfBundle b).filter isAllergy) := by
  obtain ⟨p, rfl, _⟩ := parseBundle_eq ctx b f d h
  rfl

/-- Sorting a permutation gives exactly the same keys, including duplicates. -/
theorem sorted_keys_perm (xs ys : List String) (h : xs.Perm ys) :
    xs.mergeSort (fun a b => decide (a ≤ b)) = ys.mergeSort (fun a b => decide (a ≤ b)) := by
  apply List.Perm.eq_of_pairwise (le := fun a b => decide (a ≤ b))
  · intro a b _ _ hab hba
    exact String.le_antisymm (by simpa using hab) (by simpa using hba)
  · apply List.pairwise_mergeSort
    · intro a b c hab hbc; simpa using String.le_trans (of_decide_eq_true hab) (of_decide_eq_true hbc)
    · intro a b; simp [String.le_total a b]
  · apply List.pairwise_mergeSort
    · intro a b c hab hbc; simpa using String.le_trans (of_decide_eq_true hab) (of_decide_eq_true hbc)
    · intro a b; simp [String.le_total a b]
  · exact (List.mergeSort_perm _ _).trans (h.trans (List.mergeSort_perm _ _).symm)

/-- T5: permuting a bundle cannot change its allergy/medication digest. -/
theorem T5_version_order_independent (rs ss : List Json) (h : rs.Perm ss) :
    listVersion rs = listVersion ss := by
  unfold listVersion
  rw [sorted_keys_perm _ _ (h.map versionKey)]

/- A small FHIR representation of Tiny's patient and 20 kg weight. Missing
 allergy status deliberately exercises the conservative active reading. -/
def tinyPatient : Json := Json.mkObj [("resourceType", .str "Patient"), ("id", .str "pt-1")]
def tinyAllergy : Json := Json.mkObj [("resourceType", .str "AllergyIntolerance"), ("id", .str "a-1"), ("patient", Json.mkObj [("reference", .str "Patient/pt-1")])]
def tinyMed : Json := Json.mkObj [("resourceType", .str "MedicationRequest"), ("id", .str "m-1"), ("status", .str "active"), ("subject", Json.mkObj [("reference", .str "Patient/pt-1")])]
def tinyWeight : Json := Json.mkObj [("resourceType", .str "Observation"), ("id", .str "w-1"),
  ("status", .str "final"), ("subject", Json.mkObj [("reference", .str "Patient/pt-1")]), ("effectiveDateTime", .str "2026-10-31"),
  ("code", Json.mkObj [("coding", .arr #[Json.mkObj [("code", .str "29463-7")]])]),
  ("valueQuantity", Json.mkObj [("value", toJson (20 : Nat)), ("code", .str "kg")])]
def tinyBundle : Json := Json.mkObj [("resourceType", .str "Bundle"),
  ("entry", .arr (([tinyPatient, tinyAllergy, tinyMed, tinyWeight].map fun r => Json.mkObj [("resource", r)])).toArray)]
def tinyFacts := factsOf Tests.context (bundleResources tinyBundle) tinyPatient
def tinyDisplay := displayOf Tests.context (bundleResources tinyBundle) tinyPatient

theorem tiny_parse : parseBundle Tests.context tinyBundle = .ok (tinyFacts, tinyDisplay) := by rfl

example : tinyFacts.patientId = Ehr.Examples.Tiny.facts.patientId := by rfl
example : ∃ r ∈ bundleResources tinyBundle, isBodyWeight r = true ∧ dayOf (obsWhen r) = Tests.context.today ∧
    unitOf (field r "valueQuantity") = some .kg ∧ qtyScaled (field r "valueQuantity") 1 = some 200 :=
  T5_weight _ _ _ _ tiny_parse 200 .kg (by rfl)
example : allergyRow tinyAllergy ∈ tinyDisplay.allergies :=
  T11_allergy _ _ _ _ tiny_parse tinyAllergy (by change tinyAllergy ∈ [tinyPatient, tinyAllergy, tinyMed, tinyWeight]; simp) (by decide) (by decide)
example : medRow tinyMed ∈ tinyDisplay.meds :=
  T11_med _ _ _ _ tiny_parse tinyMed (by change tinyMed ∈ [tinyPatient, tinyAllergy, tinyMed, tinyWeight]; simp) (by decide) (by decide)
example : tinyFacts.allergyVersion = listVersion ((bundleResources tinyBundle).filter isAllergy) :=
  T5_allergyVersion _ _ _ _ tiny_parse
example : listVersion (bundleResources tinyBundle) = listVersion (bundleResources tinyBundle).reverse :=
  T5_version_order_independent _ _ (List.reverse_perm _).symm

#print axioms T11_allergy
#print axioms T11_med
#print axioms T5_weight
#print axioms T5_allergyVersion
#print axioms T5_version_order_independent
theorem noteRows_complete (rs : List Json) (r : Json) (hr : r ∈ rs)
    (hn : isDocumentReference r = true) (hv : documentVisible r = true) :
    noteRow r ∈ noteRows rs := by
  simp only [noteRows, newestFirst, List.mem_mergeSort, List.mem_map]
  exact ⟨r, List.mem_filter.mpr ⟨hr, by simp [hn, hv]⟩, rfl⟩

theorem T11_note (ctx : FactsContext) (b : Json) (f : Facts) (d : Display)
    (h : parseBundle ctx b = .ok (f, d)) (r : Json) (hr : r ∈ chartResourcesOfBundle b)
    (hn : isDocumentReference r = true) (hv : documentVisible r = true) : noteRow r ∈ d.notes := by
  obtain ⟨p, _, rfl⟩ := parseBundle_eq ctx b f d h
  exact noteRows_complete _ r hr hn hv

#print axioms T11_note

end Ehr.Render.Fhir
