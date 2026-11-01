import Ehr.Specs.V2
/-!
Release v3 adds hospital antibiotic-indication requirements.
It preserves v2 rules and requires new checks for the added duties.
-/

namespace Ehr.Specs.V3
open V1 V2

/-- Hospital policy (not law): local antibiotic indication policy modeled on CDC stewardship guidance; 42 CFR 482.42(b) and CA H&S 1288.85 require stewardship programs, not these per-order fields.
Confirmed coded indication for each antibiotic order. Stewardship programs
are required by 42 CFR 482.42(b) and CA H&S 1288.85. A per-order indication
is this hospital's hypothetical policy, modeled on CDC Core Elements (2019),
not a statutory per-order mandate. Surgeons prescribe prophylaxis too.
See docs/regulations.md §5.1. -/
def abxIndication : ElementSpec where
  id := "abxIndication"
  label := "Antibiotic indication"
  kind := .coded "abx-indications"
  enteredBy := prescribers
  prefill := .defaultConfirm
  friction := .compliance
  fhirTarget := "MedicationRequest.reasonCode"

/-- Hospital policy (not law): local antibiotic indication policy modeled on CDC stewardship guidance; 42 CFR 482.42(b) and CA H&S 1288.85 require stewardship programs, not these per-order fields.
Coded stewardship indications offered by the canonical picker. The core
currently validates nonempty codes; terminology membership is not proven. -/
def abxIndicationCodes : List String :=
  ["respiratory-infection", "urinary-infection", "skin-infection", "sepsis", "surgical-prophylaxis", "other-infection"]

/-- Hospital policy (not law): local antibiotic indication policy modeled on CDC stewardship guidance; 42 CFR 482.42(b) and CA H&S 1288.85 require stewardship programs, not these per-order fields.
The active antibiotic's indication beside the MAR dose. Showing it before
administration, with no receipt, is our own additional policy (no source found
requiring it); docs/regulations.md §3.2 R7 and §5.1. -/
def abxIndicationInfo : InfoSpec :=
  { id := "abxIndication", label := "Antibiotic indication", version := "" }

/-- Hospital policy (not law): local antibiotic indication policy modeled on CDC stewardship guidance; 42 CFR 482.42(b) and CA H&S 1288.85 require stewardship programs, not these per-order fields.
R2-1/R2-4: every antibiotic line needs its own confirmed indication on
ordinary signing, including pre-op encounters. -/
def antibioticEntries : List EntryReq :=
  [requiresPerLine signOrders abxIndication (.orderClass "antibiotic")] ++
  issuanceCommits.map (fun c =>
    { commit := c, element := "abxIndication", when := .orderClass "antibiotic", perOrderLine := true })

/-- Hospital policy (not law): local antibiotic indication policy modeled on CDC stewardship guidance; 42 CFR 482.42(b) and CA H&S 1288.85 require stewardship programs, not these per-order fields.
R2-3: nurses see the antibiotic indication while administering. A prior
receipt cannot replace its display. This is hospital policy, not law. -/
def antibioticReviews : List ReviewReq :=
  [mustShow administerMed abxIndicationInfo (.medClass "antibiotic")]

/-- Release v3 preserves all v2 rules and adds stewardship obligations. -/
def specV3 : Spec :=
  { specV2 with
    version := "v3"
    elements := specV2.elements ++ [abxIndication]
    infos := specV2.infos ++ [abxIndicationInfo]
    entries := specV2.entries ++ antibioticEntries
    reviews := specV2.reviews ++ antibioticReviews }

-- The finite prefix check traverses the hospital element declarations and needs more
-- elaborator recursion depth; the proof still uses kernel-checked decide.
-- The complete catalog adds inherited artifact contracts to this finite check.
set_option maxRecDepth 16384 in
set_option maxHeartbeats 2000000 in
/-- Every v2 rule remains unchanged in v3. New obligations still need checking. -/
theorem specV3_extends_specV2 : specV3.Extends specV2 := by decide
#print axioms specV3_extends_specV2
example : specV3.Extends specV2 := specV3_extends_specV2
#guard allDistinct (specV3.elements.map (·.id))
#guard allDistinct (specV3.infos.map (·.id))
end Ehr.Specs.V3
