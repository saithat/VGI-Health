import Lean
import Solution
import Ehr.Check.Sound
import Ehr.Proofs.CheckDeploy
import Ehr.Render.UiProofs
import Ehr.Check.TinyRejections
import Ehr.Proofs.HypothesisExamples
import Ehr.Proofs.RenderExamples

/-! Opt-in reviewer audit. Follows statement types and definition bodies, never
proof bodies, for the surface; follows proofs separately for the axiom audit.
Based on CLAUDE.md's appendix. Run scripts/audit-verification.sh from the root.
Do not import the Comparator challenge modules: their sorry bodies are deliberate. -/

namespace VerificationAudit
open Lean Elab Command

/-- All constants reached from a statement, following definitions transitively. -/
partial def specSurface (env : Environment) (decl : Name) : NameSet :=
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
  match env.find? decl with
  | some ci => go ci.type.getUsedConstants.toList {}
  | none => {}

/-- Keep project definitions, types and opaque declarations, excluding generated
instances, projections and recursors. Traversal happens BEFORE this filter. -/
def ownDefinition (env : Environment) (c : Name) : Bool :=
  let ownModule := match env.getModuleIdxFor? c with
    | some idx => (`Ehr).isPrefixOf env.header.moduleNames[idx.toNat]!
    | none => false
  ownModule && !c.isInternal && !Meta.isMatcherCore env c &&
    !env.isProjectionFn c && !isAuxRecursor env c && !isNoConfusion env c &&
    !c.toString.endsWith ".ctorIdx" && !(decide ((c.toString.splitOn ".inst").length > 1)) &&
    match env.find? c with
    | some (.defnInfo _) | some (.opaqueInfo _) | some (.inductInfo _) => true
    | _ => false

/-- Emit a machine-readable list and size for each statement's project surface. -/
elab "#spec_surface " id:ident : command => do
  let env ← getEnv
  let decl ← liftCoreM <| realizeGlobalConstNoOverloadWithInfo id
  let names := ((specSurface env decl).toList.filter (ownDefinition env)).map toString
  let names := names.toArray.qsort (· < ·)
  let sourceModule := match env.getModuleIdxFor? decl with
    | some idx => env.header.moduleNames[idx.toNat]!.toString
    | none => "Audit.SpecSurface"
  logInfo m!"AUDIT_JSON {Json.compress <| Json.mkObj [("kind", toJson ("surface" : String)), ("name", toJson decl.toString), ("module", toJson sourceModule), ("items", toJson names)]}"

/-- Emit proof axioms and fail on anything outside the three allowed axioms. -/
elab "#audit_axioms " id:ident : command => do
  let decl ← liftCoreM <| realizeGlobalConstNoOverloadWithInfo id
  let axioms ← liftCoreM <| collectAxioms decl
  let names := (axioms.toList.map toString).toArray.qsort (· < ·)
  logInfo m!"AUDIT_JSON {Json.compress <| Json.mkObj [("kind", toJson ("axioms" : String)), ("name", toJson decl.toString), ("items", toJson names)]}"
  for ax in axioms.toList do
    unless [``propext, ``Classical.choice, ``Quot.sound].contains ax do
      throwError "Unexpected axiom in {decl}: {ax}"
end VerificationAudit

#spec_surface Ehr.Proofs.T0_commit_needs_guard
#audit_axioms Ehr.Proofs.T0_commit_needs_guard
#spec_surface Ehr.Proofs.commitGuard_iff
#audit_axioms Ehr.Proofs.commitGuard_iff
#spec_surface Ehr.Proofs.T0_entry_values
#audit_axioms Ehr.Proofs.T0_entry_values
#spec_surface Ehr.Proofs.T3_cosign_distinct
#audit_axioms Ehr.Proofs.T3_cosign_distinct
#spec_surface Ehr.Proofs.T2_receipts_sound
#audit_axioms Ehr.Proofs.T2_receipts_sound
#spec_surface Ehr.Proofs.T2_shownOnCommit_shown
#audit_axioms Ehr.Proofs.T2_shownOnCommit_shown
#spec_surface Ehr.Proofs.T3_macro_step
#audit_axioms Ehr.Proofs.T3_macro_step
#spec_surface Ehr.Proofs.T3_macro_run
#audit_axioms Ehr.Proofs.T3_macro_run
#spec_surface Ehr.Proofs.T3_prefill_never_human_only
#audit_axioms Ehr.Proofs.T3_prefill_never_human_only
#spec_surface Ehr.Proofs.T6_macro_is_fold
#audit_axioms Ehr.Proofs.T6_macro_is_fold
#spec_surface Ehr.Proofs.runMacro_ok_iff
#audit_axioms Ehr.Proofs.runMacro_ok_iff
#spec_surface Ehr.Proofs.T6_macro_run_safe
#audit_axioms Ehr.Proofs.T6_macro_run_safe
#spec_surface Ehr.Proofs.A2_view_firing
#audit_axioms Ehr.Proofs.A2_view_firing
#spec_surface Ehr.Proofs.A2_view_shown
#audit_axioms Ehr.Proofs.A2_view_shown
#spec_surface Ehr.Proofs.A2_popup_holds
#audit_axioms Ehr.Proofs.A2_popup_holds
#spec_surface Ehr.Proofs.A4_step
#audit_axioms Ehr.Proofs.A4_step
#spec_surface Ehr.Proofs.A4_run
#audit_axioms Ehr.Proofs.A4_run
#spec_surface Ehr.Proofs.A4_passive_never_popup
#audit_axioms Ehr.Proofs.A4_passive_never_popup
#spec_surface Ehr.Check.accepted_wellFormed
#audit_axioms Ehr.Check.accepted_wellFormed
#spec_surface Ehr.Check.accepted_capturesAllOnce
#audit_axioms Ehr.Check.accepted_capturesAllOnce
#spec_surface Ehr.Check.accepted_writesOnly
#audit_axioms Ehr.Check.accepted_writesOnly
#spec_surface Ehr.Check.accepted_reviewsBeforeCommit
#audit_axioms Ehr.Check.accepted_reviewsBeforeCommit
#spec_surface Ehr.Check.accepted_humanOnlyKept
#audit_axioms Ehr.Check.accepted_humanOnlyKept
#spec_surface Ehr.Check.accepted_units
#audit_axioms Ehr.Check.accepted_units
#spec_surface Ehr.Check.accepted_budgets
#audit_axioms Ehr.Check.accepted_budgets
#spec_surface Ehr.Check.accepted_alertsFire
#audit_axioms Ehr.Check.accepted_alertsFire
#spec_surface Ehr.Check.accepted_noFalseAlarms
#audit_axioms Ehr.Check.accepted_noFalseAlarms
#spec_surface Ehr.Check.accepted_noRepeatInterruptions
#audit_axioms Ehr.Check.accepted_noRepeatInterruptions
#spec_surface Ehr.Check.accepted_severityTiers
#audit_axioms Ehr.Check.accepted_severityTiers
#spec_surface Ehr.Check.accepted_navigation
#audit_axioms Ehr.Check.accepted_navigation
#spec_surface Ehr.Check.satisfies_of_checked_completable
#audit_axioms Ehr.Check.satisfies_of_checked_completable
#spec_surface Ehr.Render.D1_landmark
#audit_axioms Ehr.Render.D1_landmark
#spec_surface Ehr.Render.D2_workspace_required
#audit_axioms Ehr.Render.D2_workspace_required
#spec_surface Ehr.Render.D2_required_info
#audit_axioms Ehr.Render.D2_required_info
#spec_surface Ehr.Render.D2_commit_review
#audit_axioms Ehr.Render.D2_commit_review
#spec_surface Ehr.Render.D3_honest_actions
#audit_axioms Ehr.Render.D3_honest_actions
#spec_surface Ehr.Render.D3_all_buttons
#audit_axioms Ehr.Render.D3_all_buttons
#spec_surface Ehr.Render.D4_interruptive_modal
#audit_axioms Ehr.Render.D4_interruptive_modal
#spec_surface Ehr.Render.D4_passive_no_modal
#audit_axioms Ehr.Render.D4_passive_no_modal
#spec_surface Ehr.Render.D4_passive_inline
#audit_axioms Ehr.Render.D4_passive_inline
#spec_surface Ehr.Render.D6_clear_fields
#audit_axioms Ehr.Render.D6_clear_fields
#spec_surface Ehr.Render.D6_field_labels
#audit_axioms Ehr.Render.D6_field_labels
#spec_surface Ehr.Proofs.T4_publish_only_if_ok
#audit_axioms Ehr.Proofs.T4_publish_only_if_ok
#spec_surface Ehr.Proofs.T4_rejected_not_published
#audit_axioms Ehr.Proofs.T4_rejected_not_published
#spec_surface Ehr.Proofs.T4_published_certificate
#audit_axioms Ehr.Proofs.T4_published_certificate
#spec_surface Ehr.Check.tiny_bad_catalog
#audit_axioms Ehr.Check.tiny_bad_catalog
#spec_surface Ehr.Check.tiny_bad_role
#audit_axioms Ehr.Check.tiny_bad_role
#spec_surface Ehr.Check.tiny_bad_automation
#audit_axioms Ehr.Check.tiny_bad_automation

-- Property 6 has no acceptance theorem. Audit its definition explicitly.
#spec_surface Ehr.Props.Completable
#spec_surface Ehr.Props.Satisfies

#spec_surface Ehr.Check.human_finish_ready
#audit_axioms Ehr.Check.human_finish_ready
#spec_surface Ehr.Check.Scalar.completable
#audit_axioms Ehr.Check.Scalar.completable
#spec_surface Ehr.Check.satisfies_of_checked_scalar
#audit_axioms Ehr.Check.satisfies_of_checked_scalar
#spec_surface Ehr.Check.scalar_identity_satisfies
#audit_axioms Ehr.Check.scalar_identity_satisfies

#spec_surface Ehr.Proofs.HypothesisExamples.cosign_distinct_instance
#audit_axioms Ehr.Proofs.HypothesisExamples.cosign_distinct_instance
#spec_surface Ehr.Proofs.HypothesisExamples.receipt_sound_instance
#audit_axioms Ehr.Proofs.HypothesisExamples.receipt_sound_instance
#spec_surface Ehr.Proofs.HypothesisExamples.shown_review_instance
#audit_axioms Ehr.Proofs.HypothesisExamples.shown_review_instance
#spec_surface Ehr.Proofs.HypothesisExamples.shown_alert_instance
#audit_axioms Ehr.Proofs.HypothesisExamples.shown_alert_instance
#spec_surface Ehr.Proofs.HypothesisExamples.popup_step_instance
#audit_axioms Ehr.Proofs.HypothesisExamples.popup_step_instance
#spec_surface Ehr.Proofs.HypothesisExamples.sign_button_honest_instance
#audit_axioms Ehr.Proofs.HypothesisExamples.sign_button_honest_instance
#spec_surface Ehr.Proofs.HypothesisExamples.all_buttons_instance
#audit_axioms Ehr.Proofs.HypothesisExamples.all_buttons_instance
#spec_surface Ehr.Proofs.HypothesisExamples.weight_label_instance
#audit_axioms Ehr.Proofs.HypothesisExamples.weight_label_instance
#spec_surface Ehr.Proofs.HypothesisExamples.publish_ok_instance
#audit_axioms Ehr.Proofs.HypothesisExamples.publish_ok_instance
#spec_surface Ehr.Proofs.HypothesisExamples.published_certificate_instance
#audit_axioms Ehr.Proofs.HypothesisExamples.published_certificate_instance
#spec_surface Ehr.Proofs.HypothesisExamples.rejected_not_published_instance
#audit_axioms Ehr.Proofs.HypothesisExamples.rejected_not_published_instance

#spec_surface Ehr.Check.reachable_drugSlots
#audit_axioms Ehr.Check.reachable_drugSlots
#spec_surface Ehr.Check.FixedLine.completable
#audit_axioms Ehr.Check.FixedLine.completable
#spec_surface Ehr.Check.satisfies_of_checked_fixed_lines
#audit_axioms Ehr.Check.satisfies_of_checked_fixed_lines
#spec_surface Ehr.Check.fixed_lines_satisfies
#audit_axioms Ehr.Check.fixed_lines_satisfies
#spec_surface Ehr.Check.fixed_lines_pending_nonempty
#audit_axioms Ehr.Check.fixed_lines_pending_nonempty
