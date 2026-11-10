import Ehr.Check.PatchWitness
import Ehr.Canonical.BadPrograms

set_option maxRecDepth 16384
-- Kernel-check the local source facts one at a time instead of retaining six
-- independent reductions concurrently inside a single Lean process.
set_option Elab.async false
namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1

-- Only the source component's prefix is inspected. Persona and patch
-- membership below is structural; unrelated macro bodies are never reduced.
@[irreducible] private def consentSourceScreen := canonicalSource[36]?.getD default
@[irreducible] private def consentComponent := consentSourceScreen.components[35]?.getD default
private theorem consentSourcePresent : canonicalSource[36]?.isSome = true := by decide +kernel
-- The blueprint folds this one expanded clinical screen. Keep the budget local.
private theorem consentBinding : (consentSourceScreen.components[35]?).any (fun c =>
    c.id == "w6PreOp.consentVerified" && c.kind == .field "consentVerified" (.fixed 0) .none) = true := by decide +kernel
private theorem consentComponentPresent : consentSourceScreen.components[35]?.isSome = true :=
  Option.isSome_of_any consentBinding
private theorem consentComponentFacts : consentComponent.id = "w6PreOp.consentVerified" ∧
    consentComponent.kind = .field "consentVerified" (.fixed 0) .none := by
  unfold consentComponent
  exact componentAt_facts _ _ _ _ consentBinding
private theorem consentComponentId : consentComponent.id = "w6PreOp.consentVerified" := consentComponentFacts.1
private theorem consentComponentKind : consentComponent.kind = .field "consentVerified" (.fixed 0) .none := consentComponentFacts.2
private theorem consentSpec : specV1.element? "consentVerified" = some consentVerified := by decide +kernel
private theorem consentSource : HasComponent canonicalV1 consentComponent := by
  apply canonical_keeps_plain_field consentComponent
    (blueprint_keeps_field canonicalSource consentSourceScreen consentComponent
      (by unfold consentSourceScreen; exact getD_mem canonicalSource 36 consentSourcePresent) (by decide +kernel)
      (by unfold consentComponent; exact getD_mem consentSourceScreen.components 35 consentComponentPresent) "consentVerified" (.fixed 0) .none
      consentComponentKind (by decide +kernel) (by decide +kernel)
      (by decide +kernel) (by decide +kernel) (by decide +kernel))
    "consentVerified" (.fixed 0) .none consentComponentKind consentVerified consentSpec rfl rfl
private def consentMacro : Macro := {
  id := "badConsent", label := "Pre-op ready"
  steps := [.goto "w6PreOp", .setValue "w6PreOp.consentVerified" "true"] }
private theorem consentMacro_mem : consentMacro ∈ forgedConsent.macros := by
  change consentMacro ∈ (base 8).macros ++ [consentMacro]
  exact List.mem_append_right (base 8).macros (List.mem_singleton_self consentMacro)
private theorem consentMacro_step :
    MacroStep.setValue "w6PreOp.consentVerified" "true" ∈ consentMacro.steps := by decide
private theorem consentHuman : HumanMustEnter consentVerified := by decide

private theorem consentComponentMember : HasComponent forgedConsent consentComponent := by
  have hb : HasComponent (base 8) consentComponent :=
    hasComponent_forPersona specV1 canonicalV1 "seed8" .surgeon consentComponent consentSource
      (by simp [roleComponentAllowed, consentComponentKind, consentSpec]; decide)
      (by simp [consentComponentKind, macroOf?])
  let p1 := (base 8).addMacro consentMacro
  let pre := fun scr : Screen => scr.insertAfter "w6PreOp.banner"
    [macroBtn scr.id "autoConsent" "badConsent" "Pre-op ready"]
  let p2 := p1.updateScreen "w6PreOp" pre
  let post := fun scr : Screen => scr.dropComp "w6Sign.anticoagulants"
  let p3 := p2.updateScreen "w6Sign" post
  have h1 := hasComponent_addMacro (base 8) consentMacro consentComponent hb
  have h2 := hasComponent_updateScreen p1 "w6PreOp" pre consentComponent h1
    (fun scr hc => insertAfter_keeps scr _ _ consentComponent hc)
  have h3 := hasComponent_updateScreen p2 "w6Sign" post consentComponent h2
    (fun scr hc => dropComp_keeps scr _ consentComponent hc (by rw [consentComponentId]; decide))
  exact hasComponent_seed 8 p3 consentComponent h3

/-- The forged consent violates its own macro/field pair, with no whole-program
property decision and no unrelated canonical defect. -/
theorem bad08_not_satisfies : ¬ Satisfies specV1 none canonicalV1 forgedConsent := by
  intro h
  obtain ⟨sc, member, component⟩ := hasComponent_pair consentComponentMember
  exact macroSet_violation specV1 forgedConsent consentMacro sc
    "w6PreOp.consentVerified" "true" "consentVerified" consentMacro_mem consentMacro_step
    member (by rw [component, consentComponentId]) (.fixed 0) .none
    (by rw [component, consentComponentKind]; rfl)
    consentVerified consentSpec consentHuman h.2.2.2.2.1.1

@[irreducible] private def quickSignSourceScreen := canonicalV1.screens[8]?.getD default
@[irreducible] private def quickSignComponent := quickSignSourceScreen.components[53]?.getD default
private theorem quickSignSourcePresent : canonicalV1.screens[8]?.isSome = true := by decide +kernel
private theorem quickSignBinding : (quickSignSourceScreen.components[53]?).any (fun c =>
    c.id == "w1Sign.commit.signOrders" && c.kind == .button (.commit "signOrders")) = true := by decide +kernel
private theorem quickSignComponentPresent : quickSignSourceScreen.components[53]?.isSome = true :=
  Option.isSome_of_any quickSignBinding
private theorem quickSignComponentFacts : quickSignComponent.id = "w1Sign.commit.signOrders" ∧
    quickSignComponent.kind = .button (.commit "signOrders") := by
  unfold quickSignComponent
  exact componentAt_facts _ _ _ _ quickSignBinding
private theorem quickSignComponentId : quickSignComponent.id = "w1Sign.commit.signOrders" := quickSignComponentFacts.1
private theorem quickSignComponentKind : quickSignComponent.kind = .button (.commit "signOrders") := quickSignComponentFacts.2
private theorem quickSignSource : HasComponent canonicalV1 quickSignComponent :=
  ⟨quickSignSourceScreen,
    by unfold quickSignSourceScreen; exact getD_mem canonicalV1.screens 8 quickSignSourcePresent,
    by unfold quickSignComponent; exact getD_mem quickSignSourceScreen.components 53 quickSignComponentPresent⟩
private def quickSignMacro : Macro := {
  id := "badQuickAmox", label := "Quick sign amoxicillin"
  steps := [.setValue "w1Orders.drug" "amoxicillin", .setValue "w1Orders.dose" "1000",
    .goto "w1Sign", .click "w1Sign.commit.signOrders"] }
private theorem quickSignMacro_mem : quickSignMacro ∈ hiddenAllergyAlert.macros := by
  change quickSignMacro ∈ (base 9).macros ++ [quickSignMacro]
  exact List.mem_append_right (base 9).macros (List.mem_singleton_self quickSignMacro)
private theorem quickSignMacro_step :
    MacroStep.click "w1Sign.commit.signOrders" ∈ quickSignMacro.steps := by decide

private theorem quickSignComponentMember : HasComponent hiddenAllergyAlert quickSignComponent := by
  have hb : HasComponent (base 9) quickSignComponent :=
    hasComponent_forPersona specV1 canonicalV1 "seed9" .physician quickSignComponent quickSignSource
      (by simp [roleComponentAllowed, quickSignComponentKind]; decide)
      (by simp [quickSignComponentKind, macroOf?])
  let p1 := (base 9).addMacro quickSignMacro
  let pre := fun scr : Screen => scr.dropComp "w1Sign.alert.drugAllergy"
  let p2 := p1.updateScreen "w1Sign" pre
  let post := fun scr : Screen => scr.insertAfter "w1Orders.banner"
    [macroBtn scr.id "quickAmox" "badQuickAmox" "Quick sign amoxicillin"]
  let p3 := p2.updateScreen "w1Orders" post
  have h1 := hasComponent_addMacro (base 9) quickSignMacro quickSignComponent hb
  have h2 := hasComponent_updateScreen p1 "w1Sign" pre quickSignComponent h1
    (fun scr hc => dropComp_keeps scr _ quickSignComponent hc (by rw [quickSignComponentId]; decide))
  have h3 := hasComponent_updateScreen p2 "w1Orders" post quickSignComponent h2
    (fun scr hc => insertAfter_keeps scr _ _ quickSignComponent hc)
  exact hasComponent_seed 9 p3 quickSignComponent h3

/-- The quick-sign macro explicitly targets a commit button. -/
theorem bad09_not_satisfies : ¬ Satisfies specV1 none canonicalV1 hiddenAllergyAlert := by
  intro h
  obtain ⟨sc, member, component⟩ := hasComponent_pair quickSignComponentMember
  exact macroClick_violation specV1 hiddenAllergyAlert quickSignMacro sc
    "w1Sign.commit.signOrders" "signOrders" quickSignMacro_mem quickSignMacro_step
    member (by rw [component, quickSignComponentId])
    (by rw [component, quickSignComponentKind]; rfl) h.2.2.2.2.1.1

#print axioms bad08_not_satisfies
#print axioms bad09_not_satisfies
#print axioms consentSourcePresent
#print axioms consentBinding
#print axioms consentComponentPresent
#print axioms consentComponentFacts
#print axioms consentComponentId
#print axioms consentComponentKind
#print axioms consentSpec
#print axioms consentSource
#print axioms consentMacro_mem
#print axioms consentMacro_step
#print axioms consentHuman
#print axioms consentComponentMember
#print axioms quickSignSourcePresent
#print axioms quickSignBinding
#print axioms quickSignComponentPresent
#print axioms quickSignComponentFacts
#print axioms quickSignComponentId
#print axioms quickSignComponentKind
#print axioms quickSignSource
#print axioms quickSignMacro_mem
#print axioms quickSignMacro_step
#print axioms quickSignComponentMember

end Ehr.Check
