import Ehr.Proofs.T3
import Ehr.Examples.TinyTests

/-!
# T0: the hard stop

For every spec, program, facts, user, actor, state, and event: if a step adds
commit `c`, then the commit guard for `c` held in the state before the step.

The guard (`commitGuard`, see `Ehr/Core/Guard.lean`) says:
1. the user's role may perform `c`;
2. every entry requirement for `c` that applies is met by a captured value that
   is confirmed, valid (right unit, checked flag, matching identity, different
   cosigner, matching scan), and, for a human-only element, entered by a human;
3. every review requirement for `c` that applies is met: the info is shown on
   the current screen, or (only where allowed) a valid receipt covers it;
4. every interruptive alert concerning `c` is acknowledged for each key.

`commitGuard_iff` states these four items as plain logic.
-/

namespace Ehr.Proofs

open Ehr

/-- Every commit in `s'` was already in `s`, or its guard held in `s`. -/
def CommitsGuarded (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (s s' : State) : Prop :=
  ∀ c ∈ s'.commits, c ∈ s.commits ∨ commitGuard sp prog facts user s c = true

theorem CommitsGuarded.of_eq {sp : Spec} {prog : Program} {facts : Facts} {user : User}
    {s s' : State} (h : s'.commits = s.commits) : CommitsGuarded sp prog facts user s s' := by
  intro c hc; rw [h] at hc; exact Or.inl hc

theorem clickCommit_guarded (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (s : State) (cm : CommitId) :
    CommitsGuarded sp prog facts user s (clickCommit sp prog facts user s cm).1 := by
  unfold clickCommit
  split
  · exact CommitsGuarded.of_eq rfl
  · rename_i _
    split
    · rename_i hbase
      split
      · exact CommitsGuarded.of_eq rfl
      · split
        · rename_i hack
          intro c hc
          simp only [List.mem_append, List.mem_singleton] at hc
          rcases hc with hc | rfl
          · exact Or.inl hc
          · exact Or.inr (by simp [commitGuard, hbase, hack])
        · exact CommitsGuarded.of_eq rfl
    · exact CommitsGuarded.of_eq rfl

theorem markReviewed_commits (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (s : State) (i : InfoId) : (markReviewed sp prog facts user s i).1.commits = s.commits := by
  unfold markReviewed
  repeat' (first | rfl | split | (dsimp only; done) | dsimp only)

theorem clickCore_guarded (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (actor : Actor) (s : State) (c : Component) :
    CommitsGuarded sp prog facts user s (clickCore sp prog facts user actor s c).1 := by
  unfold clickCore
  split
  · exact CommitsGuarded.of_eq (goTo_safe ..).commits
  · exact CommitsGuarded.of_eq (goBack_safe ..).commits
  · cases actor
    · apply clickCommit_guarded
    · exact CommitsGuarded.of_eq rfl
  · cases actor
    · exact CommitsGuarded.of_eq (markReviewed_commits ..)
    · exact CommitsGuarded.of_eq rfl
  · exact CommitsGuarded.of_eq (prefillScreen_safe ..).commits
  · exact CommitsGuarded.of_eq rfl
  · cases actor <;> exact CommitsGuarded.of_eq rfl
  · exact CommitsGuarded.of_eq rfl

theorem enterCore_commits (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (actor : Actor) (s : State) (cid : CompId) (v : Value) :
    (enterCore sp prog facts user actor s cid v).1.commits = s.commits := by
  unfold enterCore
  repeat' (first | rfl | split | (dsimp only; done) | dsimp only)

theorem confirmCore_commits (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (actor : Actor) (s : State) (cid : CompId) :
    (confirmCore sp prog facts user actor s cid).1.commits = s.commits := by
  unfold confirmCore
  repeat' (first | rfl | split | (dsimp only; done) | dsimp only)

theorem ackCore_commits (actor : Actor) (s : State) (a : AlertId) :
    (ackCore actor s a).1.commits = s.commits := by
  unfold ackCore
  repeat' (first | rfl | split | (dsimp only; done) | dsimp only)

/-- One event without macros: new commits had their guard. -/
theorem stepCore_guarded (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (actor : Actor) (s : State) (e : Event) :
    CommitsGuarded sp prog facts user s (stepCore sp prog facts user actor s e).1 := by
  unfold stepCore
  split
  · exact CommitsGuarded.of_eq rfl
  · cases e with
    | click cid =>
      simp only [stepEvent]
      split
      · exact CommitsGuarded.of_eq rfl
      · apply clickCore_guarded
    | selectTab cid idx => exact CommitsGuarded.of_eq (selectTabCore_safe ..).commits
    | enter cid v => exact CommitsGuarded.of_eq (enterCore_commits ..)
    | confirm cid => exact CommitsGuarded.of_eq (confirmCore_commits ..)
    | ack a => exact CommitsGuarded.of_eq (ackCore_commits ..)
    | scroll scr =>
      simp only [stepEvent]
      split <;> exact CommitsGuarded.of_eq rfl
    | search q =>
      simp only [stepEvent]
      split <;> exact CommitsGuarded.of_eq rfl

/-- Any step: new commits had their guard. -/
theorem step_guarded (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (actor : Actor) (s : State) (e : Event) :
    CommitsGuarded sp prog facts user s (step sp prog facts user actor s e).1 := by
  unfold step
  split
  · split
    · exact CommitsGuarded.of_eq (runMacro_safe ..).commits
    · apply stepCore_guarded
  · apply stepCore_guarded

/-- **T0 (hard stop).** If a step adds commit `c`, the commit guard for `c`
held in the state before the step. This holds for every spec, program, facts,
user, actor, state, and event. -/
theorem T0_commit_needs_guard (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (actor : Actor) (s : State) (e : Event) (c : CommitId)
    (hnew : c ∉ s.commits) (hafter : c ∈ (step sp prog facts user actor s e).1.commits) :
    commitGuard sp prog facts user s c = true := by
  rcases step_guarded sp prog facts user actor s e c hafter with h | h
  · exact absurd h hnew
  · exact h

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
  simp only [commitGuard, guardBase, entriesOk, reviewsOk, alertsAcked, Bool.and_eq_true,
    List.all_eq_true, Bool.or_eq_true, bne_iff_ne, ne_eq, List.contains_iff_mem, and_assoc]
  constructor
  · rintro ⟨h1, h2, h3, h4⟩
    refine ⟨h1, ?_, ?_, ?_⟩
    · intro rq hrq hc; exact (h2 rq hrq).resolve_left (by simp [hc])
    · intro rq hrq hc; exact (h3 rq hrq).resolve_left (by simp [hc])
    · intro al hal hc ht k hk
      rcases h4 al hal with (h | h) | h
      · exact absurd hc h
      · exact absurd ht h
      · exact h k hk
  · rintro ⟨h1, h2, h3, h4⟩
    refine ⟨h1, ?_, ?_, ?_⟩
    · intro rq hrq
      by_cases hc : rq.commit = c
      · exact Or.inr (h2 rq hrq hc)
      · exact Or.inl hc
    · intro rq hrq
      by_cases hc : rq.commit = c
      · exact Or.inr (h3 rq hrq hc)
      · exact Or.inl hc
    · intro al hal
      by_cases hc : al.commit = c
      · by_cases ht : al.tier = .interruptive
        · exact Or.inr (h4 al hal hc ht)
        · exact Or.inl (Or.inr ht)
      · exact Or.inl (Or.inl hc)

/-- A met entry requirement that is not per order line and applies now has a
captured value that satisfies it. -/
theorem entryMet_witness (sp : Spec) (facts : Facts) (user : User) (s : State)
    (rq : EntryReq) (el : ElementSpec) (hel : sp.element? rq.element = some el)
    (hper : rq.perOrderLine = false) (hwhen : whenHolds facts s rq.when = true)
    (h : entryMet sp facts user s rq = true) :
    ∃ x ∈ s.captured, x.element = el.id ∧ capturedSatisfies facts user el x = true := by
  simp only [entryMet, hel, hper, hwhen] at h
  simp only [Bool.false_eq_true, ↓reduceIte, Bool.not_true, Bool.false_or, hasGoodEntry,
    List.any_eq_true, Bool.and_eq_true, beq_iff_eq] at h
  obtain ⟨x, hx, ⟨hxe, _⟩, hsat⟩ := h
  exact ⟨x, hx, hxe, hsat⟩

/-- A value that satisfies a `quantity u` requirement is in unit `u`. -/
theorem valueSatisfies_quantity (facts : Facts) (user : User) (u : UnitKind) (v : Value)
    (h : valueSatisfies facts user (.quantity u) v = true) : ∃ t, v = .qty t u := by
  cases v with
  | qty t u' =>
    simp only [valueSatisfies, valueAccepted, Bool.true_and, beq_iff_eq] at h
    exact ⟨t, by rw [h]⟩
  | _ => simp [valueSatisfies, valueAccepted] at h

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
  have hg := T0_commit_needs_guard sp prog facts user actor s e c hnew hafter
  have hent := ((commitGuard_iff sp prog facts user s c).1 hg).2.1 rq hrq hc
  obtain ⟨x, hx, hxe, hsat⟩ := entryMet_witness sp facts user s rq el hel hper hwhen hent
  simp only [capturedSatisfies, Bool.and_eq_true, Bool.or_eq_true, Bool.not_eq_true'] at hsat
  obtain ⟨⟨hconf, hval⟩, hhum⟩ := hsat
  refine ⟨x, hx, hxe, hconf, ?_, ?_⟩
  · intro hn; rcases hhum with h | h
    · rw [hn] at h; exact absurd h (by decide)
    · exact h
  · intro u hk; rw [hk] at hval; exact valueSatisfies_quantity facts user u x.value hval

/-- A value that satisfies a cosign requirement names a different user. -/
theorem valueSatisfies_cosign (facts : Facts) (user : User) (v : Value)
    (h : valueSatisfies facts user .cosign v = true) : ∃ u, v = .user u ∧ u ≠ user.id := by
  cases v with
  | user u =>
    simp only [valueSatisfies, valueAccepted, Bool.and_eq_true, Bool.not_eq_true',
      bne_iff_ne, ne_eq] at h
    exact ⟨u, rfl, h.1.2⟩
  | _ => simp [valueSatisfies, valueAccepted] at h

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
  have hg := T0_commit_needs_guard sp prog facts user actor s e c hnew hafter
  have hent := ((commitGuard_iff sp prog facts user s c).1 hg).2.1 rq hrq hc
  obtain ⟨x, hx, hxe, hsat⟩ := entryMet_witness sp facts user s rq el hel hper hwhen hent
  simp only [capturedSatisfies, Bool.and_eq_true, Bool.or_eq_true, Bool.not_eq_true'] at hsat
  obtain ⟨⟨_, hval⟩, hhum⟩ := hsat
  have hnh : needsHuman el = true := by simp [needsHuman, hk]
  refine ⟨x, hx, hxe, ?_, ?_⟩
  · rcases hhum with h | h
    · rw [hnh] at h; exact absurd h (by decide)
    · exact h
  · rw [hk] at hval; exact valueSatisfies_cosign facts user x.value hval

/-! ## The hypotheses are satisfiable

On the tiny example: at the sign screen with the allergy tab open, clicking
Sign adds `signOrders`. (Checked by the kernel with `decide`.) -/

section Examples
open Ehr.Examples.Tiny Ehr.Examples.TinyTests

example : "signOrders" ∉ atSignTab.commits ∧
    "signOrders" ∈ (step spec program facts user .human atSignTab (.click "signButton")).1.commits := by
  decide

example : commitGuard spec program facts user atSignTab "signOrders" = true :=
  T0_commit_needs_guard spec program facts user .human atSignTab (.click "signButton") "signOrders"
    (by decide) (by decide)

/-- The guard rejects bad states: with the allergy tab closed, or with the
weight in lb, the guard fails. -/
example : commitGuard spec program facts user atSign "signOrders" = false := by decide
example : commitGuard spec program facts user atSignLb "signOrders" = false := by decide

/-- `T3_cosign_distinct` hypotheses on the tiny example: a warfarin order
(high-alert) needs the cosigner, and the commit goes through with user u2. -/
example : let s := run atSignWarfarin [.enter "cosignField" (.user "u2")]
    "signOrders" ∉ s.commits ∧
    "signOrders" ∈ (step spec program facts user .human s (.click "signButton")).1.commits ∧
    whenHolds facts s When.highAlertMed = true := by
  decide

end Examples

end Ehr.Proofs
