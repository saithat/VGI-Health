import Ehr.Proofs.T0

/-!
T2: a required review that is hidden at commit has an allowed, current
receipt or a confirmed, nonempty human waiver (CA H&S Code §11165.4).
Without a permitted receipt or waiver, the information must be shown.
-/

namespace Ehr.Proofs

open Ehr Ehr.Props

/-- A met review requirement that applies, with its info not shown, has a valid
receipt or a human waiver. -/
theorem reviewMet_sound (sp : Spec) (prog : Program) (facts : Facts) (s : State)
    (rq : ReviewReq) (hmet : reviewMet sp prog facts s rq = true)
    (hwhen : whenHolds facts s rq.when = true)
    (hhidden : infoShown sp prog facts s rq.info = false) :
    ValidReceiptFor sp facts s rq ∨ HumanWaiverFor s rq := by
  simp only [reviewMet, hwhen, hhidden, Bool.not_true, Bool.false_or, Bool.or_eq_true] at hmet
  rcases hmet with hrec | hwaive
  · left
    split at hrec
    · exact absurd hrec (by decide)
    · rename_i w roles hmode
      simp only [List.any_eq_true, receiptValid, Bool.and_eq_true, beq_iff_eq,
        decide_eq_true_eq, List.contains_iff_mem] at hrec
      obtain ⟨r, hr, ⟨⟨⟨⟨hi, hv⟩, ht⟩, hw⟩, hrole⟩⟩ := hrec
      exact ⟨w, roles, hmode, r, hr, hi, hv, ht, hw, hrole⟩
  · right
    have hwaive : waived s rq.waivedBy? = true := by
      simpa only [Bool.and_eq_true] using (show waived s rq.waivedBy? = true ∧ waiverEligible facts s rq.waivedBy? = true by simpa only [Bool.and_eq_true] using hwaive).1
    unfold waived at hwaive
    split at hwaive
    · rename_i e he
      simp only [List.any_eq_true, Bool.and_eq_true, beq_iff_eq] at hwaive
      obtain ⟨x, hx, ⟨⟨⟨hxe, hh⟩, hc⟩, hne⟩⟩ := hwaive
      exact ⟨e, he, x, hx, hxe, hh, hc, hne⟩
    · exact absurd hwaive (by decide)

/-- **T2 (receipts are sound).** If a step adds commit `c`, then every review
requirement of `c` that applies and whose info was not shown on the screen
was covered by a valid receipt (same data version, inside the time window,
from an allowed role) or by a human-entered waiver. -/
theorem T2_receipts_sound (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (actor : Actor) (s : State) (e : Event) (c : CommitId)
    (hnew : c ∉ s.commits) (hafter : c ∈ (step sp prog facts user actor s e).1.commits)
    (rq : ReviewReq) (hrq : rq ∈ sp.reviews) (hc : rq.commit = c)
    (hwhen : whenHolds facts s rq.when = true)
    (hhidden : infoShown sp prog facts s rq.info = false) :
    ValidReceiptFor sp facts s rq ∨ HumanWaiverFor s rq := by
  have hg := T0_commit_needs_guard sp prog facts user actor s e c hnew hafter
  have hmet := ((commitGuard_iff sp prog facts user s c).1 hg).2.2.1 rq hrq hc
  exact reviewMet_sound sp prog facts s rq hmet hwhen hhidden

/-- **T2 (no receipt allowed).** If a step adds commit `c`, every applicable
`shownOnCommit` review requirement of `c` without a waiver had its info shown
on the screen. -/
theorem T2_shownOnCommit_shown (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (actor : Actor) (s : State) (e : Event) (c : CommitId)
    (hnew : c ∉ s.commits) (hafter : c ∈ (step sp prog facts user actor s e).1.commits)
    (rq : ReviewReq) (hrq : rq ∈ sp.reviews) (hc : rq.commit = c)
    (hwhen : whenHolds facts s rq.when = true)
    (hmode : rq.mode = .shownOnCommit) (hnowaiver : rq.waivedBy? = none) :
    infoShown sp prog facts s rq.info = true := by
  cases hshown : infoShown sp prog facts s rq.info
  · rcases T2_receipts_sound sp prog facts user actor s e c hnew hafter rq hrq hc hwhen hshown with
      ⟨w, roles, hm, _⟩ | ⟨e', he, _⟩
    · rw [hmode] at hm; cases hm
    · rw [hnowaiver] at he; cases he
  · rfl

/-! ## The hypotheses are satisfiable -/

section Examples
open Ehr.Examples.Tiny Ehr.Examples.TinyTests

/-- On the tiny example with a prior allergy receipt at the current version:
the allergy tab is closed (not shown) and Sign still commits. -/
theorem tiny_current_receipt_commits : let f := factsWithReceipt 3
    let s := atSignWith f
    "signOrders" ∉ s.commits ∧
    "signOrders" ∈ (step spec program f user .human s (.click "signButton")).1.commits ∧
    infoShown spec program f s "allergyList" = false ∧
    whenHolds f s When.always = true := by
  decide

/-- With a stale receipt (version 2), the same click does not commit. -/
theorem tiny_stale_receipt_blocks : let f := factsWithReceipt 2
    "signOrders" ∉ (step spec program f user .human (atSignWith f) (.click "signButton")).1.commits := by
  decide

/-- `T2_shownOnCommit_shown` applies to the tiny dose check: it is a
`shownOnCommit` requirement with no waiver. -/
theorem tiny_dose_review_declared : { commit := "signOrders", info := "doseCheck", mode := .shownOnCommit : ReviewReq } ∈
    spec.reviews := by
  decide

end Examples

end Ehr.Proofs
