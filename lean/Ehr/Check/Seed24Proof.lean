import Ehr.Check.PatchWitness
import Ehr.Canonical.BadPrograms

set_option Elab.async false
namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1
set_option maxRecDepth 16384

-- Lookup the unmodified canonical field, then transport its occurrence through
-- the persona projection and patch. No whole-program length bound or macro scan.
@[irreducible] private def sourceScreen : Screen := canonicalV1.screens[45]?.getD default
private theorem screenPresent : canonicalV1.screens[45]?.isSome = true := by decide +kernel
private theorem compPresent : sourceScreen.components[21]?.isSome = true := by decide +kernel
@[irreducible] private def sourceComponent : Component := sourceScreen.components[21]?.getD default
private theorem screenId : sourceScreen.id = "w7Decision" := by decide +kernel
private theorem sourceId : sourceComponent.id = "w7Decision.legal.refillScheduleEligibility" := by decide +kernel
private theorem sourceKind : sourceComponent.kind = .field "refillScheduleEligibility" (.fixed 0) .none := by decide +kernel
private def patched : Component :=
  { sourceComponent with kind := .field "refillScheduleEligibility" (.fixed 0) (.default "notScheduleII") }
private theorem patchedMember : HasComponent defaultRefillEligibility patched := by
  obtain ⟨s, hs, sid, hc⟩ := component_forPersona_on specV1 canonicalV1 "seed24" .physician
    sourceScreen sourceComponent
    (by unfold sourceScreen; exact getD_mem canonicalV1.screens 45 screenPresent)
    (by unfold sourceComponent; exact getD_mem sourceScreen.components 21 compPresent)
    (by simp [roleComponentAllowed, sourceKind]; decide)
    (by simp [sourceKind, macroOf?])
  change HasComponent ((base 24).updateScreen "w7Decision" fun s =>
    s.updateComp "w7Decision.legal.refillScheduleEligibility" fun c =>
      { c with kind := .field "refillScheduleEligibility" (.fixed 0) (.default "notScheduleII") }) patched
  refine ⟨_, List.mem_map.mpr ⟨s, hs, rfl⟩, ?_⟩
  have id : s.id = "w7Decision" := sid.trans screenId
  have host : Blueprint.host "w7Decision" = "w7Decision" := by decide +kernel
  simp only [id, host, beq_self_eq_true, ite_true]
  apply List.mem_map.mpr
  exact ⟨sourceComponent, hc, by simp [patched, sourceId]⟩
private def element := (specV1.element? "refillScheduleEligibility").getD default
private theorem lookup : specV1.element? "refillScheduleEligibility" = some element := by decide +kernel
private theorem human : HumanMustEnter element := by decide +kernel

/-- Seed 24 attempts to default the human schedule-eligibility attestation. -/
theorem bad24_not_satisfies : ¬ Satisfies specV1 none canonicalV1 defaultRefillEligibility := by
  intro hs
  obtain ⟨pair, member, component⟩ := hasComponent_pair patchedMember
  exact humanPrefill_violation specV1 defaultRefillEligibility pair member
    "refillScheduleEligibility" (.fixed 0) (.default "notScheduleII")
    (by rw [component]; rfl) element lookup human (by decide) hs.2.2.2.2.1.1

#print axioms bad24_not_satisfies
#print axioms screenPresent
#print axioms compPresent
#print axioms screenId
#print axioms sourceId
#print axioms sourceKind
#print axioms patchedMember
#print axioms lookup
#print axioms human
end Ehr.Check
