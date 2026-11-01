import Ehr.Check.StructuralWitness
import Ehr.Canonical.BadPrograms

set_option maxRecDepth 16384
namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1

-- Each closed lookup gets its own lemma. No theorem elaboration has to solve
-- metavariables by normalizing the role-projected canonical program.
private theorem consentWitnessScreenBound : 33 < forgedConsent.screens.length := by decide +kernel
private theorem consentWitnessCompBound : 26 < (forgedConsent.screens[33]'consentWitnessScreenBound).components.length := by decide +kernel
private def consentWitness : Screen × Component :=
  indexedComp forgedConsent 33 consentWitnessScreenBound 26 consentWitnessCompBound
private theorem consentWitness_mem : consentWitness ∈ allComps forgedConsent :=
  indexedComp_mem forgedConsent 33 consentWitnessScreenBound 26 consentWitnessCompBound
private theorem consentWitness_id : consentWitness.2.id = "w6PreOp.consentVerified" := by decide +kernel
private theorem consentWitness_kind : fieldOf? consentWitness.2.kind =
    some ("consentVerified", .fixed 0, .none) := by decide +kernel
private def consentMacro : Macro := {
  id := "badConsent", label := "Pre-op ready"
  steps := [.goto "w6PreOp", .setValue "w6PreOp.consentVerified" "true"] }
private theorem consentMacro_mem : consentMacro ∈ forgedConsent.macros := by
  change consentMacro ∈ (base 8).macros ++ [consentMacro]
  exact List.mem_append_right (base 8).macros (List.mem_singleton_self consentMacro)
private theorem consentMacro_step :
    MacroStep.setValue "w6PreOp.consentVerified" "true" ∈ consentMacro.steps := by decide
private theorem consentSpec : specV1.element? "consentVerified" = some consentVerified := by decide +kernel
private theorem consentHuman : HumanMustEnter consentVerified := by decide

/-- The forged consent violates its own macro/field pair, with no whole-program
property decision and no unrelated canonical defect. -/
theorem bad08_not_satisfies : ¬ Satisfies specV1 none canonicalV1 forgedConsent := by
  intro h
  exact macroSet_violation specV1 forgedConsent consentMacro consentWitness
    "w6PreOp.consentVerified" "true" "consentVerified" consentMacro_mem consentMacro_step
    consentWitness_mem consentWitness_id (.fixed 0) .none consentWitness_kind
    consentVerified consentSpec consentHuman h.2.2.2.2.1.1

private theorem quickSignWitnessScreenBound : 8 < hiddenAllergyAlert.screens.length := by decide +kernel
private theorem quickSignWitnessCompBound : 56 < (hiddenAllergyAlert.screens[8]'quickSignWitnessScreenBound).components.length := by decide +kernel
private def quickSignWitness : Screen × Component :=
  indexedComp hiddenAllergyAlert 8 quickSignWitnessScreenBound 56 quickSignWitnessCompBound
private theorem quickSignWitness_mem : quickSignWitness ∈ allComps hiddenAllergyAlert :=
  indexedComp_mem hiddenAllergyAlert 8 quickSignWitnessScreenBound 56 quickSignWitnessCompBound
private theorem quickSignWitness_id : quickSignWitness.2.id = "w1Sign.commit.signOrders" := by decide +kernel
private theorem quickSignWitness_kind : commitOf? quickSignWitness.2.kind = some "signOrders" := by decide +kernel
private def quickSignMacro : Macro := {
  id := "badQuickAmox", label := "Quick sign amoxicillin"
  steps := [.setValue "w1Orders.drug" "amoxicillin", .setValue "w1Orders.dose" "1000",
    .goto "w1Sign", .click "w1Sign.commit.signOrders"] }
private theorem quickSignMacro_mem : quickSignMacro ∈ hiddenAllergyAlert.macros := by
  change quickSignMacro ∈ (base 9).macros ++ [quickSignMacro]
  exact List.mem_append_right (base 9).macros (List.mem_singleton_self quickSignMacro)
private theorem quickSignMacro_step :
    MacroStep.click "w1Sign.commit.signOrders" ∈ quickSignMacro.steps := by decide

/-- The quick-sign macro explicitly targets a commit button. -/
theorem bad09_not_satisfies : ¬ Satisfies specV1 none canonicalV1 hiddenAllergyAlert := by
  intro h
  exact macroClick_violation specV1 hiddenAllergyAlert quickSignMacro quickSignWitness
    "w1Sign.commit.signOrders" "signOrders" quickSignMacro_mem quickSignMacro_step
    quickSignWitness_mem quickSignWitness_id quickSignWitness_kind h.2.2.2.2.1.1

#print axioms bad08_not_satisfies
#print axioms bad09_not_satisfies
end Ehr.Check
