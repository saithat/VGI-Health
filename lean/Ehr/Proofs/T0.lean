import Ehr.Proofs.T3
import Ehr.Examples.TinyTests
import Ehr.Core.Tests

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

theorem clickAlert_commits (sp : Spec) (prog : Program) (facts : Facts)
    (s : State) (a : AlertId) : (clickAlert sp prog facts s a).1.commits = s.commits := by
  unfold clickAlert
  repeat' (first | rfl | split | dsimp only)

theorem markReviewed_commits (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (s : State) (i : InfoId) : (markReviewed sp prog facts user s i).1.commits = s.commits := by
  unfold markReviewed
  repeat' (first | rfl | split | (dsimp only; done) | dsimp only)

theorem requestPriorAuth_commits (sp : Spec) (user : User) (actor : Actor) (s : State) :
    (requestPriorAuth sp user actor s).1.commits = s.commits := by
  unfold requestPriorAuth
  repeat' (first | rfl | split | (dsimp only; done) | dsimp only)

theorem clickCore_guarded (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (actor : Actor) (s : State) (c : Component) :
    CommitsGuarded sp prog facts user s (clickCore sp prog facts user actor s c).1 := by
  unfold clickCore
  split
  · cases actor
    · exact CommitsGuarded.of_eq (clickAlert_commits ..)
    · exact CommitsGuarded.of_eq rfl
  · exact CommitsGuarded.of_eq (goTo_safe ..).commits
  · exact CommitsGuarded.of_eq (goBack_safe ..).commits
  · cases actor
    · apply clickCommit_guarded
    · exact CommitsGuarded.of_eq rfl
  · cases actor
    · exact CommitsGuarded.of_eq (markReviewed_commits ..)
    · exact CommitsGuarded.of_eq rfl
  · split
    · exact CommitsGuarded.of_eq (prefillScreen_safe ..).commits
    · exact CommitsGuarded.of_eq rfl
  · exact CommitsGuarded.of_eq (requestPriorAuth_commits ..)
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
      commitRoleOk sp facts user s c = true ∧
      (∀ rq ∈ sp.entries, rq.commit = c → entryMet sp facts user s rq = true) ∧
      (∀ rq ∈ sp.reviews, rq.commit = c → reviewMet sp prog facts s rq = true) ∧
      (∀ al ∈ sp.alerts, al.commit = c → al.tier = .interruptive →
        ∀ k ∈ alertKeys facts s al.cond, (al.id, k) ∈ s.acked) ∧
      extraGuard sp prog facts s c = true := by
  simp only [commitGuard, guardBase, entriesOk, reviewsOk, alertsAcked, Bool.and_eq_true,
    List.all_eq_true, Bool.or_eq_true, bne_iff_ne, ne_eq, List.contains_iff_mem, and_assoc]
  constructor
  · rintro ⟨h1, h2, h3, hextra, h4⟩
    refine ⟨h1, ?_, ?_, ?_, hextra⟩
    · intro rq hrq hc; exact (h2 rq hrq).resolve_left (by simp [hc])
    · intro rq hrq hc; exact (h3 rq hrq).resolve_left (by simp [hc])
    · intro al hal hc ht k hk
      rcases h4 al hal with (h | h) | h
      · exact absurd hc h
      · exact absurd ht h
      · exact h k hk
  · rintro ⟨h1, h2, h3, h4, hextra⟩
    refine ⟨h1, ?_, ?_, hextra, ?_⟩
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

/-- Plain-logic entry requirements, including the allowed-value check on the
same confirmed capture. Per-line requirements use that medication line's slot. -/
def EntryDirectValuesMet (sp : Spec) (facts : Facts) (user : User) (s : State)
    (rq : EntryReq) : Prop :=
  match sp.element? rq.element with
  | none => False
  | some el =>
    if rq.perOrderLine then
      ∀ p ∈ orderLines s, lineMatches facts s rq.when p.1 p.2 = true →
        ∃ x ∈ s.captured, x.element = el.id ∧ x.slot = p.1 ∧
          capturedSatisfies facts user el x = true ∧ entryValueAllowed el rq.allowed? x.value = true
    else
      whenHolds facts s rq.when = true →
        ∃ x ∈ s.captured, x.element = el.id ∧
          capturedSatisfies facts user el x = true ∧ entryValueAllowed el rq.allowed? x.value = true

/-- The executable entry guard is exactly its value-constrained logical form. -/
theorem entryDirectMet_iff_values (sp : Spec) (facts : Facts) (user : User) (s : State)
    (rq : EntryReq) : entryDirectMet sp facts user s rq = true ↔ EntryDirectValuesMet sp facts user s rq := by
  cases hel : sp.element? rq.element with
  | none => simp [entryDirectMet, EntryDirectValuesMet, hel]
  | some el =>
    simp only [entryDirectMet, EntryDirectValuesMet, hel]
    split
    · simp only [List.all_eq_true, Bool.or_eq_true, Bool.not_eq_true', hasGoodEntry,
        List.any_eq_true, Bool.and_eq_true, beq_iff_eq]
      constructor
      · intro h p hp hm
        rcases h p hp with h | ⟨x, hx, ⟨⟨he, hs⟩, hv⟩, ha⟩
        · simp [hm] at h
        · exact ⟨x, hx, he, hs, hv, ha⟩
      · intro h p hp
        cases hm : lineMatches facts s rq.when p.1 p.2
        · exact Or.inl rfl
        · obtain ⟨x, hx, he, hs, hv, ha⟩ := h p hp hm
          exact Or.inr ⟨x, hx, ⟨⟨he, hs⟩, hv⟩, ha⟩
    · simp only [Bool.or_eq_true, Bool.not_eq_true', hasGoodEntry,
        List.any_eq_true, Bool.and_eq_true, beq_iff_eq, and_true]
      constructor
      · intro h hw
        rcases h with h | ⟨x, hx, ⟨he, hv⟩, ha⟩
        · simp [hw] at h
        · exact ⟨x, hx, he, hv, ha⟩
      · intro h
        cases hw : whenHolds facts s rq.when
        · exact Or.inl rfl
        · obtain ⟨x, hx, he, hv, ha⟩ := h hw
          exact Or.inr ⟨x, hx, ⟨he, hv⟩, ha⟩

/-- A direct capture or an authorized human attestation meets the entry. -/
def EntryValuesMet (sp : Spec) (facts : Facts) (user : User) (s : State)
    (rq : EntryReq) : Prop :=
  entryWaiver sp facts user s rq = true ∨ EntryDirectValuesMet sp facts user s rq

theorem entryMet_iff_values (sp : Spec) (facts : Facts) (user : User) (s : State)
    (rq : EntryReq) : entryMet sp facts user s rq = true ↔ EntryValuesMet sp facts user s rq := by
  simp [entryMet, EntryValuesMet, Bool.or_eq_true, entryDirectMet_iff_values]

/-- Stronger plain-logic T0 guard equivalence: allowed values are checked on
all applicable entries, including every matching medication order line.
The original Comparator statement remains available as commitGuard_iff. -/
theorem commitGuard_iff_values (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (s : State) (c : CommitId) :
    commitGuard sp prog facts user s c = true ↔
      commitRoleOk sp facts user s c = true ∧
      (∀ rq ∈ sp.entries, rq.commit = c → EntryValuesMet sp facts user s rq) ∧
      (∀ rq ∈ sp.reviews, rq.commit = c → reviewMet sp prog facts s rq = true) ∧
      (∀ al ∈ sp.alerts, al.commit = c → al.tier = .interruptive →
        ∀ k ∈ alertKeys facts s al.cond, (al.id, k) ∈ s.acked) ∧
      extraGuard sp prog facts s c = true := by
  simpa only [entryMet_iff_values] using commitGuard_iff sp prog facts user s c

/-- A met entry requirement that is not per order line and applies now has a
captured value that satisfies it. -/
theorem entryMet_witness (sp : Spec) (facts : Facts) (user : User) (s : State)
    (rq : EntryReq) (el : ElementSpec) (hel : sp.element? rq.element = some el)
    (hper : rq.perOrderLine = false) (hwhen : whenHolds facts s rq.when = true)
    (h : entryMet sp facts user s rq = true)
    (hnot : entryWaiver sp facts user s rq = false) :
    ∃ x ∈ s.captured, x.element = el.id ∧ capturedSatisfies facts user el x = true := by
  simp only [entryMet, hnot, Bool.false_or, entryDirectMet, hel, hper, hwhen] at h
  simp only [Bool.false_eq_true, ↓reduceIte, Bool.not_true, Bool.false_or, hasGoodEntry,
    List.any_eq_true, Bool.and_eq_true, beq_iff_eq] at h
  obtain ⟨x, hx, ⟨⟨hxe, _⟩, hsat⟩, _⟩ := h
  exact ⟨x, hx, hxe, hsat⟩

/-- A value that satisfies a `quantity u` requirement is in unit `u`. -/
theorem valueSatisfies_quantity (facts : Facts) (user : User) (u : UnitKind) (v : Value)
    (h : valueSatisfies facts user (.quantity u) v = true) : ∃ t, v = .qty t u := by
  cases v with
  | qty t u' =>
    simp only [valueSatisfies, valueAccepted, Bool.true_and, beq_iff_eq] at h
    exact ⟨t, by rw [h]⟩
  | _ => simp [valueSatisfies, valueAccepted] at h

/-- The allowed-value check means a listed string parses to this exact value. -/
theorem entryValueAllowed_iff (el : ElementSpec) (allowed : Option (List String)) (v : Value) :
    entryValueAllowed el allowed v = true ↔
      ∀ values, allowed = some values → ∃ a ∈ values, parseValue el.kind a = some v := by
  cases allowed <;> simp [entryValueAllowed, List.any_eq_true, beq_iff_eq]

/-- All T0 value guarantees hold on one capture, including membership in the
allowed values when constrained. No confirmation, human, or unit check is lost. -/
def EntryCaptureValid (el : ElementSpec) (rq : EntryReq) (x : Captured) : Prop :=
  x.confirmed = true ∧
  (needsHuman el = true → x.byHuman = true) ∧
  (∀ u, el.kind = .quantity u → ∃ t, x.value = .qty t u) ∧
  (∀ values, rq.allowed? = some values → ∃ a ∈ values, parseValue el.kind a = some x.value)

theorem capturedSatisfies_values (facts : Facts) (user : User) (el : ElementSpec)
    (rq : EntryReq) (x : Captured) (hsat : capturedSatisfies facts user el x = true)
    (ha : entryValueAllowed el rq.allowed? x.value = true) : EntryCaptureValid el rq x := by
  simp only [capturedSatisfies, Bool.and_eq_true, Bool.or_eq_true, Bool.not_eq_true'] at hsat
  obtain ⟨⟨hconf, hval⟩, hhum⟩ := hsat
  refine ⟨hconf, ?_, ?_, (entryValueAllowed_iff el rq.allowed? x.value).1 ha⟩
  · intro hn; rcases hhum with h | h
    · rw [hn] at h; exact absurd h (by decide)
    · exact h
  · intro u hk; rw [hk] at hval; exact valueSatisfies_quantity facts user u x.value hval

/-- **T0, extended with allowed values.** A new commit has a single capture
meeting confirmation, human-entry, units, and the requirement's value constraint.
The original T0_entry_values follows by forgetting only the added guarantee. -/
theorem T0_entry_values_allowed (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (actor : Actor) (s : State) (e : Event) (c : CommitId)
    (hnew : c ∉ s.commits) (hafter : c ∈ (step sp prog facts user actor s e).1.commits)
    (rq : EntryReq) (hrq : rq ∈ sp.entries) (hc : rq.commit = c)
    (hper : rq.perOrderLine = false) (hwhen : whenHolds facts s rq.when = true)
    (el : ElementSpec) (hel : sp.element? rq.element = some el)
    (hnot : entryWaiver sp facts user s rq = false) :
    ∃ x ∈ s.captured, x.element = el.id ∧ EntryCaptureValid el rq x := by
  have hg := T0_commit_needs_guard sp prog facts user actor s e c hnew hafter
  have he := ((commitGuard_iff_values sp prog facts user s c).1 hg).2.1 rq hrq hc
  have hd : EntryDirectValuesMet sp facts user s rq :=
    he.resolve_left (by simp [hnot])
  simp only [EntryDirectValuesMet, hel, hper, Bool.false_eq_true, ↓reduceIte] at hd
  obtain ⟨x, hx, hxe, hsat, ha⟩ := hd hwhen
  exact ⟨x, hx, hxe, capturedSatisfies_values facts user el rq x hsat ha⟩

/-- **T0, per order line.** Every matching medication line has its own capture
meeting every value guarantee, including the allowed-value constraint. A zero
on another slot cannot satisfy a Schedule II line's zero-refills requirement. -/
theorem T0_entry_values_perLine (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (actor : Actor) (s : State) (e : Event) (c : CommitId)
    (hnew : c ∉ s.commits) (hafter : c ∈ (step sp prog facts user actor s e).1.commits)
    (rq : EntryReq) (hrq : rq ∈ sp.entries) (hc : rq.commit = c)
    (hper : rq.perOrderLine = true) (slot : Nat) (d : String)
    (hline : (slot, d) ∈ orderLines s) (hmatch : lineMatches facts s rq.when slot d = true)
    (el : ElementSpec) (hel : sp.element? rq.element = some el) :
    ∃ x ∈ s.captured, x.element = el.id ∧ x.slot = slot ∧ EntryCaptureValid el rq x := by
  have hg := T0_commit_needs_guard sp prog facts user actor s e c hnew hafter
  have he := ((commitGuard_iff_values sp prog facts user s c).1 hg).2.1 rq hrq hc
  have hd : EntryDirectValuesMet sp facts user s rq :=
    he.resolve_left (by simp [entryWaiver, hper])
  simp only [EntryDirectValuesMet, hel, hper, ↓reduceIte] at hd
  obtain ⟨x, hx, hxe, hs, hsat, ha⟩ := hd (slot, d) hline hmatch
  exact ⟨x, hx, hxe, hs, capturedSatisfies_values facts user el rq x hsat ha⟩

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
    (el : ElementSpec) (hel : sp.element? rq.element = some el)
    (hnot : entryWaiver sp facts user s rq = false) :
    ∃ x ∈ s.captured, x.element = el.id ∧ x.confirmed = true ∧
      (needsHuman el = true → x.byHuman = true) ∧
      (∀ u, el.kind = .quantity u → ∃ t, x.value = .qty t u) := by
  obtain ⟨x, hx, he, hconf, hhum, hunit, _⟩ :=
    T0_entry_values_allowed sp prog facts user actor s e c hnew hafter rq hrq hc hper hwhen el hel hnot
  exact ⟨x, hx, he, hconf, hhum, hunit⟩

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
  obtain ⟨x, hx, hxe, hsat⟩ := entryMet_witness sp facts user s rq el hel hper hwhen hent (by simp [entryWaiver, hel, hk])
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

/-- The extended per-line theorem has a real completing witness: a Schedule II
order with zero refills commits, and its zero is on that order's own slot. -/
example : ∃ x ∈ CoreTests.ScheduleII.good.captured, x.element = "refills" ∧ x.slot = 0 ∧
    EntryCaptureValid CoreTests.ScheduleII.refills CoreTests.ScheduleII.zeroRefills x :=
  T0_entry_values_perLine CoreTests.ScheduleII.constrainedSpec CoreTests.ScheduleII.constrainedProgram
    facts user .human CoreTests.ScheduleII.good (.click "sign") "signOrders"
    (by decide) (by decide) CoreTests.ScheduleII.zeroRefills (by decide) rfl rfl
    0 "hydromorphone" (by decide) (by decide) CoreTests.ScheduleII.refills (by decide)

/-- The whole-episode extension is also nonvacuous on the same public step. -/
example : let rq := { CoreTests.ScheduleII.zeroRefills with perOrderLine := false }
    ∃ x ∈ CoreTests.ScheduleII.good.captured, x.element = "refills" ∧
      EntryCaptureValid CoreTests.ScheduleII.refills rq x := by
  let rq := { CoreTests.ScheduleII.zeroRefills with perOrderLine := false }
  exact T0_entry_values_allowed { CoreTests.ScheduleII.constrainedSpec with entries := [rq] }
    CoreTests.ScheduleII.constrainedProgram facts user .human CoreTests.ScheduleII.good
    (.click "sign") "signOrders" (by decide) (by decide) rq (by decide) rfl rfl
    (by decide) CoreTests.ScheduleII.refills (by decide) (by decide)

/-- A confirmed default of three remains blocked for a Schedule II line. -/
example : commitGuard CoreTests.ScheduleII.constrainedSpec CoreTests.ScheduleII.constrainedProgram
    facts user CoreTests.ScheduleII.bad "signOrders" = false := by decide

end Examples

/-- A new commit satisfies its additional temporal/expiry/display contracts. -/
theorem T0_extra_contract (sp : Spec) (prog : Program) (facts : Facts) (user : User)
    (actor : Actor) (s : State) (e : Event) (c : CommitId)
    (hnew : c ∉ s.commits) (hafter : c ∈ (step sp prog facts user actor s e).1.commits) :
    extraGuard sp prog facts s c = true :=
  ((commitGuard_iff sp prog facts user s c).1
    (T0_commit_needs_guard sp prog facts user actor s e c hnew hafter)).2.2.2.2

#print axioms T0_extra_contract

end Ehr.Proofs
