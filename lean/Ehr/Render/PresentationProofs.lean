import Ehr.Render.FhirProofs
import Ehr.Render.UiContracts

namespace Ehr.Render.Fhir
open Lean

/-- Every non-error Appointment remains in the chronological schedule. -/
theorem scheduleRows_complete (today : String) (rs : List Json) (r : Json)
    (hr : r ∈ rs) (ht : resourceType r = "Appointment")
    (hv : str r "status" ≠ "entered-in-error") :
    scheduleRow today rs r ∈ scheduleRows today rs := by
  simp only [scheduleRows, oldestFirst, List.mem_mergeSort, List.mem_map]
  exact ⟨r, List.mem_filter.mpr ⟨List.mem_filter.mpr ⟨hr, by simp [ht]⟩, by simp [hv]⟩, rfl⟩

/-- Every non-error Encounter remains on the supplied department board. -/
theorem boardRows_complete (today : String) (rs : List Json) (r : Json)
    (hr : r ∈ rs) (ht : resourceType r = "Encounter")
    (hv : str r "status" ≠ "entered-in-error") :
    boardRow today rs r ∈ boardRows today rs := by
  simp only [boardRows, oldestFirst, List.mem_mergeSort, List.mem_map]
  exact ⟨r, List.mem_filter.mpr ⟨List.mem_filter.mpr ⟨hr, by simp [ht]⟩, by simp [hv]⟩, rfl⟩

/-- Every non-error actual administration retains its dose, time and status. -/
theorem administrationRows_complete (rs : List Json) (r : Json) (hr : r ∈ rs)
    (ht : resourceType r = "MedicationAdministration")
    (hv : str r "status" ≠ "entered-in-error") :
    administrationRow rs r ∈ administrationRows rs := by
  simp only [administrationRows, oldestFirst, List.mem_mergeSort, List.mem_map]
  exact ⟨r, List.mem_filter.mpr ⟨List.mem_filter.mpr ⟨hr, by simp [ht]⟩, by simp [hv]⟩, rfl⟩

/-- Every valid Observation remains in its series, including repeated timestamps. -/
theorem observationRows_complete (rs : List Json) (r : Json) (hr : r ∈ rs)
    (hv : isObservation r = true) : observationRow r ∈ observationRows rs := by
  simp only [observationRows, oldestFirst, List.mem_mergeSort, List.mem_flatMap]
  exact ⟨r, List.mem_filter.mpr ⟨hr, hv⟩, by simp [observationRowsFor]⟩

/-- Every valid observation component survives the same display boundary. -/
theorem observationComponents_complete (rs : List Json) (r c : Json) (hr : r ∈ rs)
    (hv : isObservation r = true) (hc : c ∈ arr r "component") :
    observationComponentRow r c ∈ observationRows rs := by
  simp only [observationRows, oldestFirst, List.mem_mergeSort, List.mem_flatMap]
  exact ⟨r, List.mem_filter.mpr ⟨hr, hv⟩,
    List.mem_cons_of_mem _ (List.mem_map.mpr ⟨c, hc, rfl⟩)⟩

/-- Identical observations and their components retain their full cardinality. -/
theorem observationRows_length (rs : List Json) :
    (observationRows rs).length =
      ((rs.filter isObservation).map (fun r => 1 + (arr r "component").length)).sum := by
  have counts (xs : List Json) :
      (xs.flatMap observationRowsFor).length =
        (xs.map (fun r => 1 + (arr r "component").length)).sum := by
    induction xs with
    | nil => simp
    | cons r xs ih => simp [observationRowsFor, ih, Nat.add_comm, Nat.add_assoc]
  simpa only [observationRows, oldestFirst, List.length_mergeSort] using counts (rs.filter isObservation)

/-- Every valid laboratory observation retains its complete per-result display row. -/
theorem labResultRows_complete (rs : List Json) (r : Json) (hr : r ∈ rs)
    (hv : isLab r = true) : labResultRow r ∈ labResultRows rs := by
  simp only [labResultRows, newestFirst, List.mem_mergeSort, List.mem_flatMap]
  exact ⟨r, List.mem_filter.mpr ⟨hr, hv⟩, by simp [labResultRowsFor]⟩

/-- Every component of a valid laboratory report retains its own value and unit. -/
theorem labComponentRows_complete (rs : List Json) (r c : Json) (hr : r ∈ rs)
    (hv : isLab r = true) (hc : c ∈ arr r "component") :
    labComponentResultRow r c ∈ labResultRows rs := by
  simp only [labResultRows, newestFirst, List.mem_mergeSort, List.mem_flatMap]
  exact ⟨r, List.mem_filter.mpr ⟨hr, hv⟩, List.mem_cons_of_mem _ (List.mem_map.mpr ⟨c, hc, rfl⟩)⟩

/-- Result cardinality includes every report and component, even identical records. -/
theorem labResultRows_length (rs : List Json) :
    (labResultRows rs).length =
      ((rs.filter isLab).map (fun r => 1 + (arr r "component").length)).sum := by
  have counts (xs : List Json) :
      (xs.flatMap labResultRowsFor).length =
        (xs.map (fun r => 1 + (arr r "component").length)).sum := by
    induction xs with
    | nil => simp
    | cons r xs ih => simp [labResultRowsFor, ih, Nat.add_comm, Nat.add_assoc]
  simpa only [labResultRows, newestFirst, List.length_mergeSort] using counts (rs.filter isLab)

/-- A successfully parsed bundle retains every non-error appointment in Display. -/
theorem T11_schedule (ctx : FactsContext) (b : Json) (f : Facts) (d : Display)
    (hp : parseBundle ctx b = .ok (f, d)) (r : Json) (hr : r ∈ bundleResources b)
    (ht : resourceType r = "Appointment") (hv : str r "status" ≠ "entered-in-error") :
    scheduleRow ctx.today (bundleResources b) r ∈ d.schedule := by
  obtain ⟨p, _, rfl⟩ := parseBundle_eq ctx b f d hp
  exact scheduleRows_complete ctx.today _ r hr ht hv

/-- A successfully parsed bundle retains every non-error encounter on its board. -/
theorem T11_board (ctx : FactsContext) (b : Json) (f : Facts) (d : Display)
    (hp : parseBundle ctx b = .ok (f, d)) (r : Json) (hr : r ∈ bundleResources b)
    (ht : resourceType r = "Encounter") (hv : str r "status" ≠ "entered-in-error") :
    boardRow ctx.today (bundleResources b) r ∈ d.board := by
  obtain ⟨p, _, rfl⟩ := parseBundle_eq ctx b f d hp
  exact boardRows_complete ctx.today _ r hr ht hv

/-- Actual administrations are never lost during FHIR abstraction. -/
theorem T11_administration (ctx : FactsContext) (b : Json) (f : Facts) (d : Display)
    (hp : parseBundle ctx b = .ok (f, d)) (r : Json) (hr : r ∈ bundleResources b)
    (ht : resourceType r = "MedicationAdministration") (hv : str r "status" ≠ "entered-in-error") :
    administrationRow (bundleResources b) r ∈ d.administrations := by
  obtain ⟨p, _, rfl⟩ := parseBundle_eq ctx b f d hp
  exact administrationRows_complete _ r hr ht hv

/-- Every valid Observation in a parsed bundle reaches its display series. -/
theorem T11_observation (ctx : FactsContext) (b : Json) (f : Facts) (d : Display)
    (hp : parseBundle ctx b = .ok (f, d)) (r : Json) (hr : r ∈ bundleResources b)
    (hv : isObservation r = true) : observationRow r ∈ d.observations := by
  obtain ⟨p, _, rfl⟩ := parseBundle_eq ctx b f d hp
  exact observationRows_complete _ r hr hv

/-- Assessment components survive parsing with their own values and parent context. -/
theorem T11_observation_component (ctx : FactsContext) (b : Json) (f : Facts) (d : Display)
    (hp : parseBundle ctx b = .ok (f, d)) (r c : Json) (hr : r ∈ bundleResources b)
    (hv : isObservation r = true) (hc : c ∈ arr r "component") :
    observationComponentRow r c ∈ d.observations := by
  obtain ⟨p, _, rfl⟩ := parseBundle_eq ctx b f d hp
  exact observationComponents_complete _ r c hr hv hc

/-- Every valid laboratory observation reaches Display without substituting a later unit. -/
theorem T11_lab_result (ctx : FactsContext) (b : Json) (f : Facts) (d : Display)
    (hp : parseBundle ctx b = .ok (f, d)) (r : Json) (hr : r ∈ bundleResources b)
    (hv : isLab r = true) : labResultRow r ∈ d.labResults := by
  obtain ⟨p, _, rfl⟩ := parseBundle_eq ctx b f d hp
  exact labResultRows_complete _ r hr hv

/-- Component results survive the same parsed-bundle boundary as their report. -/
theorem T11_lab_component (ctx : FactsContext) (b : Json) (f : Facts) (d : Display)
    (hp : parseBundle ctx b = .ok (f, d)) (r c : Json) (hr : r ∈ bundleResources b)
    (hv : isLab r = true) (hc : c ∈ arr r "component") :
    labComponentResultRow r c ∈ d.labResults := by
  obtain ⟨p, _, rfl⟩ := parseBundle_eq ctx b f d hp
  exact labComponentRows_complete _ r c hr hv hc

/-- A concrete Appointment satisfies the schedule-completeness hypotheses. -/
def appointmentExample : Json := Json.mkObj [("resourceType", .str "Appointment"), ("status", .str "booked")]
theorem appointment_complete_example :
    scheduleRow "2026-11-01" [appointmentExample] appointmentExample ∈ scheduleRows "2026-11-01" [appointmentExample] :=
  scheduleRows_complete _ _ _ (by simp) rfl (by decide)

/-- A concrete actual dose satisfies the administration-completeness hypotheses. -/
def administrationExample : Json := Json.mkObj [("resourceType", .str "MedicationAdministration"), ("status", .str "completed")]
theorem administration_complete_example :
    administrationRow [administrationExample] administrationExample ∈ administrationRows [administrationExample] :=
  administrationRows_complete _ _ (by simp) rfl (by decide)

#print axioms T11_schedule
#print axioms T11_board
#print axioms T11_administration
#print axioms T11_observation
#print axioms T11_lab_result
#print axioms T11_lab_component
end Ehr.Render.Fhir
