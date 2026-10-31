import Ehr.Core.View
import Ehr.Props.Defs

/-!
# Comparator challenge: statements of the main theorems (DRAFT)

**Draft for owner review; not final.** Each theorem below is stated exactly
as proved in `lean/Ehr/Proofs/*.lean` (extracted from those files), with its
proof replaced by `sorry`. `lake comparator` (config: `comparator.json`)
checks that the solution module `Solution` proves these same statements, with
only the permitted axioms, and that the kernel accepts the proofs.

The statements depend on the interpreter (`lean/Ehr/Core/*.lean`), the
formulary, and the property definitions in `lean/Ehr/Props/Defs.lean`. Those
are the trusted surface a reviewer must read (`#spec_surface` in
`lean/Ehr/Proofs/Audit.lean` lists them).

Theorems: T0 (hard stop), T2 (receipts), T3 (human-only steps), T6 (macros),
A2 (no false alarms), A4 (severity tiers).
-/

namespace Ehr.Proofs

open Ehr Ehr.Props

/-- **T0 (hard stop).** If a step adds commit `c`, the commit guard for `c`
held in the state before the step. This holds for every spec, program, facts,
user, actor, state, and event. -/
theorem T0_commit_needs_guard (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (actor : Actor) (s : State) (e : Event) (c : CommitId)
    (hnew : c ∉ s.commits) (hafter : c ∈ (step sp prog facts user actor s e).1.commits) :
    commitGuard sp prog facts user s c = true := by
  sorry

/-- The guard in plain logic: the role may commit; every applicable entry
requirement is met; every applicable review requirement is met; and every
interruptive alert for the commit is acknowledged for each key it fires for. -/
theorem commitGuard_iff (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (s : State) (c : CommitId) :
    commitGuard sp prog facts user s c = true ↔
      roleOk sp user c = true ∧
      (∀ rq ∈ sp.entries, rq.commit = c → entryMet sp facts user s rq = true) ∧
      (∀ rq ∈ sp.reviews, rq.commit = c → reviewMet sp prog facts s rq = true) ∧
      (∀ al ∈ sp.alerts, al.commit = c → al.tier = .interruptive →
        ∀ k ∈ alertKeys facts s al.cond, (al.id, k) ∈ s.acked) := by
  sorry

/-- **T0 (units and human-only steps).** If a step adds commit `c`, then for
every entry requirement of `c` that is not per order line and applies, some
captured value for its element is confirmed; is entered by a human if the
element is human-only; and, if the element is a quantity in unit `u`, is in
unit `u` (so a weight in lb never satisfies a kg requirement). -/
theorem T0_entry_values (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (actor : Actor) (s : State) (e : Event) (c : CommitId)
    (hnew : c ∉ s.commits) (hafter : c ∈ (step sp prog facts user actor s e).1.commits)
    (rq : EntryReq) (hrq : rq ∈ sp.entries) (hc : rq.commit = c)
    (hper : rq.perOrderLine = false) (hwhen : whenHolds facts s rq.when = true)
    (el : ElementSpec) (hel : sp.element? rq.element = some el) :
    ∃ x ∈ s.captured, x.element = el.id ∧ x.confirmed = true ∧
      (needsHuman el = true → x.byHuman = true) ∧
      (∀ u, el.kind = .quantity u → ∃ t, x.value = .qty t u) := by
  sorry

/-- **T3 (double check).** If a step adds commit `c`, then for every entry
requirement of `c` on a cosign element that is not per order line and applies,
some captured value was entered by a human and names a user different from the
signed-in user. -/
theorem T3_cosign_distinct (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (actor : Actor) (s : State) (e : Event) (c : CommitId)
    (hnew : c ∉ s.commits) (hafter : c ∈ (step sp prog facts user actor s e).1.commits)
    (rq : EntryReq) (hrq : rq ∈ sp.entries) (hc : rq.commit = c)
    (hper : rq.perOrderLine = false) (hwhen : whenHolds facts s rq.when = true)
    (el : ElementSpec) (hel : sp.element? rq.element = some el) (hk : el.kind = .cosign) :
    ∃ x ∈ s.captured, x.element = el.id ∧ x.byHuman = true ∧
      ∃ u, x.value = .user u ∧ u ≠ user.id := by
  sorry

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
  sorry

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
  sorry

/-- **T3 (one macro step).** Any event sent as `Actor.macro`: commits, acks,
and receipts stay the same, and every captured value of a human-only element
afterwards was already captured before. -/
theorem T3_macro_step (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (s : State) (e : Event) :
    let s' := (step sp prog facts user .«macro» s e).1
    s'.commits = s.commits ∧ s'.acked = s.acked ∧ s'.receipts = s.receipts ∧
    (∀ x ∈ s'.captured, sp.isHumanOnly x.element = true → x ∈ s.captured) := by
  sorry

/-- **T3 (a macro run).** A human clicks a macro button, and the macro runs.
The same four facts hold for the whole run. -/
theorem T3_macro_run (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (s : State) (cid : CompId) (mac : Macro)
    (hmac : clickedMacro? sp prog facts s cid = some mac) (hpop : s.popup? = none) :
    let s' := (step sp prog facts user .human s (.click cid)).1
    s'.commits = s.commits ∧ s'.acked = s.acked ∧ s'.receipts = s.receipts ∧
    (∀ x ∈ s'.captured, sp.isHumanOnly x.element = true → x ∈ s.captured) := by
  sorry

/-- **T3 (prefill).** Prefilling a screen (done on every screen entry, by a
human or a macro) never captures a value for a human-only element. -/
theorem T3_prefill_never_human_only (sp : Spec) (prog : Program) (facts : Facts) (s : State) :
    ∀ x ∈ (prefillScreen sp prog facts s).captured, sp.isHumanOnly x.element = true →
      x ∈ s.captured := by
  sorry

/-- **T6 (macros are their expansion).** Running a macro's steps gives the
same state as the reference fold; its result is `ok` exactly when the fold does
not stop; and when the fold stops at step `j` with result `r`, the macro's
result is `blocked (macroStopReason j r)`. -/
theorem T6_macro_is_fold (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (steps : List MacroStep) : ∀ (i : Nat) (s : State),
    (runMacro sp prog facts user i s steps).1 = (foldMacro sp prog facts user i s steps).1 ∧
    ((foldMacro sp prog facts user i s steps).2 = none →
      (runMacro sp prog facts user i s steps).2 = .ok) ∧
    (∀ j r, (foldMacro sp prog facts user i s steps).2 = some (j, r) →
      (runMacro sp prog facts user i s steps).2 = .blocked (macroStopReason j r)) := by
  sorry

/-- The macro's result is `ok` only if the fold does not stop. -/
theorem runMacro_ok_iff (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (steps : List MacroStep) (i : Nat) (s : State) :
    (runMacro sp prog facts user i s steps).2 = .ok ↔
      (foldMacro sp prog facts user i s steps).2 = none := by
  sorry

/-- **T6 (safety).** A macro run, started by a human click on a macro button,
ends with the same commits, acknowledged alerts, and receipts as before, and
with no newly captured value for a human-only element. Proved from T6 and T3. -/
theorem T6_macro_run_safe (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (s : State) (cid : CompId) (mac : Macro)
    (hmac : clickedMacro? sp prog facts s cid = some mac) (hpop : s.popup? = none) :
    let s' := (step sp prog facts user .human s (.click cid)).1
    s'.commits = s.commits ∧ s'.acked = s.acked ∧ s'.receipts = s.receipts ∧
    (∀ x ∈ s'.captured, sp.isHumanOnly x.element = true → x ∈ s.captured) := by
  sorry

/-- **A2 (view, firing).** If the view marks an item as firing, the item is an
alert component and its alert's condition holds. -/
theorem A2_view_firing (sp : Spec) (prog : Program) (facts : Facts) (user : User) (s : State)
    (item : ItemView) (hi : item ∈ (view sp prog facts user s).items) (hf : item.firing = true) :
    ∃ a p, item.comp.kind = .alert a p ∧ alertHolds sp facts s a = true := by
  sorry

/-- **A2 (view, shown).** If the view shows an alert component, its alert's
condition holds. -/
theorem A2_view_shown (sp : Spec) (prog : Program) (facts : Facts) (user : User) (s : State)
    (item : ItemView) (hi : item ∈ (view sp prog facts user s).items) (hs : item.shown = true)
    (a : AlertId) (p : Bool) (hk : item.comp.kind = .alert a p) :
    alertHolds sp facts s a = true := by
  sorry

/-- **A2 (popups).** If a step opens a popup `(a, k)` that was not open before,
then some alert rule with ID `a` fires for key `k` in the state before the
step, and `(a, k)` had not been acknowledged (A3). -/
theorem A2_popup_holds (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (actor : Actor) (s : State) (e : Event) (a : AlertId) (k : String)
    (hnew : s.popup? ≠ some (a, k))
    (hpop : (step sp prog facts user actor s e).1.popup? = some (a, k)) :
    ∃ al ∈ sp.alerts, al.id = a ∧ k ∈ alertKeys facts s al.cond ∧ (a, k) ∉ s.acked := by
  sorry

/-- **A4 (one step).** If the popup before a step is not passive, neither is
the popup after it. -/
theorem A4_step (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (actor : Actor) (s : State) (e : Event) (h : PopupNotPassive sp s) :
    PopupNotPassive sp (step sp prog facts user actor s e).1 := by
  sorry

/-- **A4 (every run).** After any list of events from the initial state, the
open popup (if any) belongs to an alert rule that is not passive. -/
theorem A4_run (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (actor : Actor) (es : List Event) :
    PopupNotPassive sp (runAll sp prog facts user actor (init sp prog facts user) es) := by
  sorry

/-- **A4 (plain form).** A passive alert rule never pops up in any run from the
initial state. (`sp.alert? al.id = some al` says `al` is the rule its ID names.) -/
theorem A4_passive_never_popup (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (actor : Actor) (es : List Event) (al : AlertSpec) (hid : sp.alert? al.id = some al)
    (hpas : al.tier = .passive) (k : String) :
    (runAll sp prog facts user actor (init sp prog facts user) es).popup? ≠ some (al.id, k) := by
  sorry

end Ehr.Proofs
