import Ehr.Check.PatchWitness
import Ehr.Check.MacroBadProofs

set_option Elab.async false
namespace Ehr.Check
open Ehr Ehr.Props Ehr.Canonical Ehr.Canonical.Bad Ehr.Specs.V1
set_option maxRecDepth 16384

private theorem rejects_human (p : Program) (h : ¬ NoAutomationAttempts specV1 p) :
    ¬ Satisfies specV1 none canonicalV1 p := fun hs => h hs.2.2.2.2.1.1

@[irreducible] private def static2Screen : Screen := prefilledIdentity.screens[8]?.getD default
private theorem static2ScreenPresent : prefilledIdentity.screens[8]?.isSome = true := by decide +kernel
private theorem static2CompPresent : static2Screen.components[52]?.isSome = true := by decide +kernel
@[irreducible] private def static2Witness : Screen × Component :=
  (static2Screen, static2Screen.components[52]?.getD default)
private theorem static2Member : static2Witness ∈ allComps prefilledIdentity := by
  unfold static2Witness
  exact List.mem_flatMap.mpr ⟨static2Screen,
    (by unfold static2Screen; exact getD_mem prefilledIdentity.screens 8 static2ScreenPresent),
    List.mem_map.mpr ⟨_, getD_mem static2Screen.components 52 static2CompPresent, rfl⟩⟩

private theorem static2Kind : fieldOf? static2Witness.2.kind = some ("patientIdReentry", .fixed 0, (.fromRecord "patientIdentity")) := by decide +kernel
private theorem static2Lookup : specV1.element? "patientIdReentry" = some patientIdReentry := by decide +kernel
private theorem static2Human : HumanMustEnter patientIdReentry := by decide

theorem bad02_not_satisfies : ¬ Satisfies specV1 none canonicalV1 prefilledIdentity :=
  rejects_human prefilledIdentity (humanPrefill_violation specV1 prefilledIdentity static2Witness static2Member
    "patientIdReentry" (.fixed 0) (.fromRecord "patientIdentity") static2Kind patientIdReentry static2Lookup static2Human (by decide))
#print axioms bad02_not_satisfies


#print axioms rejects_human
#print axioms static2ScreenPresent
#print axioms static2CompPresent
#print axioms static2Member
#print axioms static2Kind
#print axioms static2Lookup
#print axioms static2Human

end Ehr.Check
