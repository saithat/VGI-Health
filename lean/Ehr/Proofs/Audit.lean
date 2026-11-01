import Lean
import Ehr.Proofs.Alerts
import Ehr.Proofs.T2
import Ehr.Proofs.T6

/-!
# Proof audit

For each main theorem: the axioms it uses (`#print axioms`), and the project
definitions its statement depends on (`#spec_surface`), which a reviewer must
read to know what the theorem means. Also the T3 examples (the hypotheses of
`T3_macro_run` are satisfiable, and `MacroSafe` rejects a bad step).

Allowed axioms: `propext`, `Classical.choice`, `Quot.sound`. No `sorry`
(`sorryAx`) and no `native_decide` (`Lean.ofReduceBool`).
-/

open Lean Elab Command

/-- Definitions a theorem's statement mentions, followed through their bodies
(not through proofs). -/
partial def specSurface (env : Environment) (thm : Name) : NameSet :=
  let rec go (todo : List Name) (seen : NameSet) : NameSet :=
    match todo with
    | [] => seen
    | c :: rest =>
      if seen.contains c then go rest seen else
      let next := match env.find? c with
        | some (.defnInfo d) => d.type.getUsedConstants.toList ++ d.value.getUsedConstants.toList
        | some ci => ci.type.getUsedConstants.toList
        | none => []
      go (next ++ rest) (seen.insert c)
  match env.find? thm with
  | some ci => go ci.type.getUsedConstants.toList {}
  | none => {}

/-- `#spec_surface thm`: the project's own definitions (namespace `Ehr`) that
the statement of `thm` depends on. -/
elab "#spec_surface " id:ident : command => do
  let env ← getEnv
  let thm ← liftCoreM <| realizeGlobalConstNoOverloadWithInfo id
  let own := (specSurface env thm).toList.filter fun c =>
    (`Ehr).isPrefixOf c && !c.isInternal && !Meta.isMatcherCore env c &&
      !env.isProjectionFn c && !isAuxRecursor env c && !isNoConfusion env c &&
      !(c.toString.endsWith ".ctorIdx") && !(decide ((c.toString.splitOn ".inst").length > 1)) &&
      match env.find? c with
      | some (.defnInfo d) => !(d.type == .sort 1)
      | _ => false
  logInfo m!"{(own.map toString).toArray.qsort (· < ·)}"

namespace Ehr.Proofs

open Ehr.Props

/-! ## Axioms -/

#print axioms T0_commit_needs_guard
#print axioms T0_entry_values
#print axioms commitGuard_iff
#print axioms entryMet_iff_values
#print axioms entryValueAllowed_iff
#print axioms capturedSatisfies_values
#print axioms commitGuard_iff_values
#print axioms T0_entry_values_allowed
#print axioms T0_entry_values_perLine
#print axioms T2_receipts_sound
#print axioms T2_shownOnCommit_shown
#print axioms T3_macro_step
#print axioms T3_macro_run
#print axioms T3_prefill_never_human_only
#print axioms T3_cosign_distinct
#print axioms T6_macro_is_fold
#print axioms runMacro_ok_iff
#print axioms T6_macro_run_safe
#print axioms A2_view_firing
#print axioms A2_view_shown
#print axioms A2_popup_holds
#print axioms A4_step
#print axioms A4_run
#print axioms A4_passive_never_popup

/-! ## Spec surface (definitions to review) -/

#spec_surface T0_commit_needs_guard
#spec_surface T2_receipts_sound
#spec_surface T3_macro_step
#spec_surface T6_macro_is_fold
#spec_surface A2_view_firing
#spec_surface A4_run

/-! ## T3 examples -/

section Examples
open Ehr Ehr.Examples.Tiny Ehr.Examples.TinyTests

/-- The hypotheses of `T3_macro_run` hold on the tiny example: on the order
screen, the "Amoxicillin 500 mg" button runs a macro, and no popup is open. -/
theorem tiny_macro_run_premises : clickedMacro? spec program facts atOrder "quickAmox" = some amoxMacro ∧
    atOrder.popup? = none := by
  decide

/-- …and the run does something: it moves to the sign screen and fills the order. -/
theorem tiny_macro_changes_screen_and_captures : (step spec program facts user .human atOrder (.click "quickAmox")).1.screen = "sign" ∧
    (step spec program facts user .human atOrder (.click "quickAmox")).1.captured.length >
      atOrder.captured.length := by
  decide

/-- `MacroSafe` rejects a bad step: a macro step that commits is not safe. -/
theorem macro_commit_is_unsafe : ¬ MacroSafe spec s0 { s0 with commits := ["signOrders"] } := by
  intro h
  have := h.commits
  revert this
  decide

/-- `MacroSafe` rejects a macro step that types the patient ID. -/
theorem macro_identity_capture_is_unsafe : ¬ MacroSafe spec atSign
    { atSign with captured := atSign.captured ++
        [{ element := "patientIdReentry", slot := 1, value := .text "JD/F/34"
           byHuman := false, confirmed := true }] } := by
  intro h
  have := h.humanOnly _ (List.mem_append_right _ (List.mem_singleton_self _)) (by decide)
  revert this
  decide

end Examples

end Ehr.Proofs
