import Ehr.Specs.V1_1
namespace Ehr.Specs.V2
open V1 V1_1

/-- Confirmed coded indication for each antibiotic order. Stewardship programs
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

/-- Coded stewardship indications offered by the canonical picker. The core
currently validates nonempty codes; terminology membership is not proven. -/
def abxIndicationCodes : List String :=
  ["respiratory-infection", "urinary-infection", "skin-infection", "sepsis", "surgical-prophylaxis", "other-infection"]

/-- The active antibiotic's indication beside the MAR dose. Showing it before
administration, with no receipt, is our own additional policy (no source found
requiring it); docs/regulations.md §3.2 R7 and §5.1. -/
def abxIndicationInfo : InfoSpec :=
  { id := "abxIndication", label := "Antibiotic indication", version := "" }

/-- R2-1/R2-4: every antibiotic line needs its own confirmed indication on
ordinary signing, including pre-op encounters. -/
def antibioticEntries : List EntryReq :=
  [requiresPerLine signOrders abxIndication (.orderClass "antibiotic")]

/-- R2-3: nurses see the antibiotic indication while administering. A prior
receipt cannot replace its display. This is hospital policy, not law. -/
def antibioticReviews : List ReviewReq :=
  [mustShow administerMed abxIndicationInfo (.medClass "antibiotic")]

/-- Release v2 preserves all v1.1 rules and adds stewardship obligations. -/
def specV2 : Spec :=
  { specV1_1 with
    version := "v2"
    elements := specV1_1.elements ++ [abxIndication]
    infos := specV1_1.infos ++ [abxIndicationInfo]
    entries := specV1_1.entries ++ antibioticEntries
    reviews := specV1_1.reviews ++ antibioticReviews }

/-- Every v1.1 rule remains unchanged in v2. New obligations still need checking. -/
theorem specV2_extends_specV1_1 : specV2.Extends specV1_1 := by decide
#print axioms specV2_extends_specV1_1
example : specV2.Extends specV1_1 := specV2_extends_specV1_1
#guard allDistinct (specV2.elements.map (·.id))
#guard allDistinct (specV2.infos.map (·.id))
end Ehr.Specs.V2
