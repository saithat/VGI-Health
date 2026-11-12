import Ehr.Check.Sound
import Ehr.Check.CompletionAbstraction
import Ehr.Check.DisplayObstruction
import Ehr.Check.RejectionObstruction

/-!
Option D (feasibility form) of Property 6 (`CompletableWhereFeasible`), its
canonical-witness variant (`CompletableWhereCanonical`), its checker-accepted
witness variant (`CompletableWhereAcceptedFeasible`), its canonical-free
spec-derived required-commit variant (`CompletableWhereFeasibleSpec`), and the
implication chains carrying over the existing restricted-family completion
theorems (`Scalar`, `FixedLine`, and `CompletionModel`).
-/

namespace Ehr.Check
open Ehr Ehr.Props

/-! ## 1. Witness variants (Option B and checker-accepted Option D) -/

/-- New specification for owner review.
Option B witness premise from the design doc: the canonical program itself can
complete `c` from its initial state with `clock := clock`. -/
def CanonicalCanCommit (spec : Spec) (canonical : Program) (facts : Facts)
    (user : User) (clock : Nat) (c : CommitId) : Prop :=
  ∃ es : List Event,
    c ∈ (Episode.afterHuman ⟨spec, canonical, facts, user⟩
      { (⟨spec, canonical, facts, user⟩ : Episode).start with clock := clock } es).commits

/-- New specification for owner review.
From every reachable state `s`, each commit in `commits` not yet done that
`canonical` can complete at `s.clock` remains reachable in `ep.prog`. -/
def CommitsStayReachableWhereCanonical (ep : Episode) (canonical : Program)
    (commits : List CommitId) : Prop :=
  Always ep fun s => ∀ c ∈ commits, c ∉ s.commits →
    CanonicalCanCommit ep.spec canonical ep.facts ep.user s.clock c →
    ∃ es : List Event, c ∈ (ep.afterHuman s es).commits

/-- New specification for owner review.
**Property 6 (canonical-witness form, option B).** Implied by
`CompletableWhereFeasible` whenever `canonical.role = prog.role`. -/
def CompletableWhereCanonical (spec : Spec) (canonical prog : Program) : Prop :=
  ∀ facts user, user.role = prog.role → RecordAllowsScans spec facts →
    CommitsStayReachableWhereCanonical ⟨spec, prog, facts, user⟩ canonical
      (requiredCommitsFor spec canonical prog facts user)

/-- New specification for owner review.
Checker-accepted witness restriction of `CommitFeasible`: requires the witness
program `p` to be accepted by `check spec none p p = .ok`. Passing `p` as both
the reference and candidate program enforces all intrinsic checker rules
(catalog, unique IDs, references, landmarks, depth, linked prefills, declared
writes, review pinning, no automation of human steps, units, alerts, navigation,
and `completeFor` on `p`'s commit buttons, which must include `c` by
`OnlyHumanCommitsAndAcks`) without depending on an external `canonical`
program. -/
def AcceptedCommitFeasible (spec : Spec) (facts : Facts) (user : User)
    (clock : Nat) (c : CommitId) : Prop :=
  ∃ (p : Program) (es : List Event), p.role = user.role ∧
    check spec none p p = .ok ∧
    c ∈ (Episode.afterHuman ⟨spec, p, facts, user⟩
      { (⟨spec, p, facts, user⟩ : Episode).start with clock := clock } es).commits

/-- New specification for owner review.
From every reachable state `s`, each commit in `commits` not yet done that is
feasible via a checker-accepted witness program at `s.clock` remains reachable
in `ep.prog`. -/
def CommitsStayReachableWhereAcceptedFeasible (ep : Episode)
    (commits : List CommitId) : Prop :=
  Always ep fun s => ∀ c ∈ commits, c ∉ s.commits →
    AcceptedCommitFeasible ep.spec ep.facts ep.user s.clock c →
    ∃ es : List Event, c ∈ (ep.afterHuman s es).commits

/-- New specification for owner review.
**Property 6 (accepted-witness feasibility form).** Restricts the feasibility
witness in `CompletableWhereFeasible` to programs accepted by
`check spec none p p = .ok`, ruling out witness programs that complete a task
only by violating another accepted-program rule (such as `WritesOnly`). -/
def CompletableWhereAcceptedFeasible (spec : Spec) (canonical prog : Program) : Prop :=
  ∀ facts user, user.role = prog.role → RecordAllowsScans spec facts →
    CommitsStayReachableWhereAcceptedFeasible ⟨spec, prog, facts, user⟩
      (requiredCommitsFor spec canonical prog facts user)

/-- New specification for owner review.
Certified program under `CompletableWhereAcceptedFeasible`. -/
def SatisfiesWhereAcceptedFeasible (spec : Spec) (prev : Option Program)
    (canonical prog : Program) : Prop :=
  WellFormed spec canonical prog ∧
  CapturesAllOnce spec prog ∧
  WritesOnly spec prog ∧
  ReviewsBeforeCommit spec prog ∧
  HumanOnlyKept spec prog ∧
  CompletableWhereAcceptedFeasible spec canonical prog ∧
  UnitsRight spec prog ∧
  WithinBudgets spec prev canonical prog ∧
  AlertsFire spec prog ∧
  NoFalseAlarms spec prog ∧
  NoRepeatInterruptions spec prog ∧
  SeverityTiers spec prog ∧
  NavigationSane prog

/-! ## 2. Implication chains -/

/-- New specification for owner review.
A canonical commit witness with matching role is an unconstrained feasibility
witness. -/
theorem canonicalCanCommit_imp_commitFeasible (sp : Spec) (can : Program)
    (facts : Facts) (user : User) (clock : Nat) (c : CommitId)
    (hrole : can.role = user.role)
    (h : CanonicalCanCommit sp can facts user clock c) :
    CommitFeasible sp facts user clock c := by
  obtain ⟨es, hc⟩ := h
  exact ⟨can, es, hrole, hc⟩

/-- New specification for owner review.
An accepted feasibility witness is an unconstrained feasibility witness. -/
theorem acceptedCommitFeasible_imp_commitFeasible (sp : Spec) (facts : Facts)
    (user : User) (clock : Nat) (c : CommitId)
    (h : AcceptedCommitFeasible sp facts user clock c) :
    CommitFeasible sp facts user clock c := by
  obtain ⟨p, es, hrole, _, hc⟩ := h
  exact ⟨p, es, hrole, hc⟩

/-- New specification for owner review.
`Completable` implies `CompletableWhereFeasible` (first link of the chain
`Completable → CompletableWhereFeasible → CompletableWhereCanonical`). -/
theorem completable_imp_completableWhereFeasible (sp : Spec) (can p : Program)
    (h : Completable sp can p) : CompletableWhereFeasible sp can p := by
  intro facts user hrole hscans s hs c hc hnot _
  exact h facts user hrole hscans s hs c hc hnot

/-- New specification for owner review.
`CompletableWhereFeasible` implies `CompletableWhereCanonical` when
`can.role = p.role` (second link of the chain). -/
theorem completableWhereFeasible_imp_completableWhereCanonical (sp : Spec)
    (can p : Program) (hroleCan : can.role = p.role)
    (h : CompletableWhereFeasible sp can p) :
    CompletableWhereCanonical sp can p := by
  intro facts user hrole hscans s hs c hc hnot hcan
  apply h facts user hrole hscans s hs c hc hnot
  exact canonicalCanCommit_imp_commitFeasible sp can facts user s.clock c
    (hroleCan.trans hrole.symm) hcan

/-- New specification for owner review.
`CompletableWhereFeasible` implies `CompletableWhereAcceptedFeasible`. -/
theorem completableWhereFeasible_imp_completableWhereAcceptedFeasible
    (sp : Spec) (can p : Program) (h : CompletableWhereFeasible sp can p) :
    CompletableWhereAcceptedFeasible sp can p := by
  intro facts user hrole hscans s hs c hc hnot hacc
  apply h facts user hrole hscans s hs c hc hnot
  exact acceptedCommitFeasible_imp_commitFeasible sp facts user s.clock c hacc

/-- New specification for owner review.
`Satisfies` implies `SatisfiesWhereFeasible`. -/
theorem satisfies_imp_satisfiesWhereFeasible (sp : Spec) (prev : Option Program)
    (can p : Program) (h : Satisfies sp prev can p) :
    SatisfiesWhereFeasible sp prev can p :=
  ⟨h.1, h.2.1, h.2.2.1, h.2.2.2.1, h.2.2.2.2.1,
   completable_imp_completableWhereFeasible sp can p h.2.2.2.2.2.1,
   h.2.2.2.2.2.2⟩

/-- New specification for owner review.
Assemble `SatisfiesWhereFeasible` from checker acceptance and
`CompletableWhereFeasible`. -/
theorem satisfiesWhereFeasible_of_checked_completableWhereFeasible (sp : Spec)
    (prev : Option Program) (can p : Program) (h : check sp prev can p = .ok)
    (hc : CompletableWhereFeasible sp can p) :
    SatisfiesWhereFeasible sp prev can p :=
  ⟨accepted_wellFormed _ _ _ _ h,
   accepted_capturesAllOnce _ _ _ _ h,
   accepted_writesOnly _ _ _ _ h,
   accepted_reviewsBeforeCommit _ _ _ _ h,
   accepted_humanOnlyKept _ _ _ _ h,
   hc,
   accepted_units _ _ _ _ h,
   accepted_budgets _ _ _ _ h,
   accepted_alertsFire _ _ _ _ h,
   accepted_noFalseAlarms _ _ _ _ h,
   accepted_noRepeatInterruptions _ _ _ _ h,
   accepted_severityTiers _ _ _ _ h,
   accepted_navigation _ _ _ _ h⟩

/-- New specification for owner review.
Assemble `SatisfiesWhereAcceptedFeasible` from checker acceptance and
`CompletableWhereAcceptedFeasible`. -/
theorem satisfiesWhereAcceptedFeasible_of_checked (sp : Spec)
    (prev : Option Program) (can p : Program) (h : check sp prev can p = .ok)
    (hc : CompletableWhereAcceptedFeasible sp can p) :
    SatisfiesWhereAcceptedFeasible sp prev can p :=
  ⟨accepted_wellFormed _ _ _ _ h,
   accepted_capturesAllOnce _ _ _ _ h,
   accepted_writesOnly _ _ _ _ h,
   accepted_reviewsBeforeCommit _ _ _ _ h,
   accepted_humanOnlyKept _ _ _ _ h,
   hc,
   accepted_units _ _ _ _ h,
   accepted_budgets _ _ _ _ h,
   accepted_alertsFire _ _ _ _ h,
   accepted_noFalseAlarms _ _ _ _ h,
   accepted_noRepeatInterruptions _ _ _ _ h,
   accepted_severityTiers _ _ _ _ h,
   accepted_navigation _ _ _ _ h⟩

/-- New specification for owner review.
Missing payload also excludes `AcceptedCommitFeasible`. -/
theorem missing_payload_not_acceptedCommitFeasible (sp : Spec) (facts : Facts)
    (user : User) (clock : Nat) (c : CommitId) (rq : DisplayReq)
    (member : rq ∈ sp.displays?.getD []) (missing : infoPayload facts rq.info = none)
    (active : ∀ s c, displayActive facts s (some c) rq = true) :
    ¬ AcceptedCommitFeasible sp facts user clock c :=
  fun h => missing_payload_not_commitFeasible sp facts user clock c rq member missing active
    (acceptedCommitFeasible_imp_commitFeasible sp facts user clock c h)

/-! ## 3. Canonical-free required-commit set from `Spec` -/

/-- New specification for owner review.
Every commit in `requiredCommits sp can p` is declared in
`specRequiredCommits sp p.role`. -/
theorem requiredCommits_sub_specRequiredCommits (sp : Spec) (can p : Program)
    {c : CommitId} (h : c ∈ requiredCommits sp can p) :
    c ∈ specRequiredCommits sp p.role := by
  have hrole := (List.mem_filter.mp h).2
  unfold Spec.commit? at hrole
  cases hfind : sp.commits.find? (·.id == c) with
  | none => simp [hfind] at hrole
  | some cs =>
    simp only [hfind] at hrole
    have hmem : cs ∈ sp.commits := List.mem_of_find?_eq_some hfind
    have hbeq : (cs.id == c) = true := List.find?_some (p := fun (x : CommitSpec) => x.id == c) hfind
    have hid : cs.id = c := beq_iff_eq.mp hbeq
    exact List.mem_map.mpr ⟨cs, List.mem_filter.mpr ⟨hmem, hrole⟩, hid⟩

/-- New specification for owner review.
Every commit in `requiredCommitsFor sp can p facts user` is in the canonical-
free set `specRequiredCommitsFor sp p.role facts user`. -/
theorem requiredCommitsFor_sub_specRequiredCommitsFor (sp : Spec)
    (can p : Program) (facts : Facts) (user : User) {c : CommitId}
    (h : c ∈ requiredCommitsFor sp can p facts user) :
    c ∈ specRequiredCommitsFor sp p.role facts user := by
  obtain ⟨hreq, hok⟩ := List.mem_filter.mp h
  exact List.mem_filter.mpr ⟨requiredCommits_sub_specRequiredCommits sp can p hreq, hok⟩

/-- New specification for owner review.
The canonical-free property `CompletableWhereFeasibleSpec sp p` implies
`CompletableWhereFeasible sp can p` for every reference program `can`. -/
theorem completableWhereFeasibleSpec_imp_completableWhereFeasible (sp : Spec)
    (can p : Program) (h : CompletableWhereFeasibleSpec sp p) :
    CompletableWhereFeasible sp can p := by
  intro facts user hrole hscans s hs c hc hnot hfeas
  exact h facts user hrole hscans s hs c
    (requiredCommitsFor_sub_specRequiredCommitsFor sp can p facts user hc) hnot hfeas

/-- New specification for owner review.
On `Scalar.spec`, the canonical-free required-commit set is identical to
`requiredCommitsFor`. -/
theorem Scalar.specRequiredCommitsFor_eq (k : ValueKind) (r : Role)
    (m : ReviewMode) (a : AlertCond) (t : Tier) (facts : Facts) (user : User) :
    specRequiredCommitsFor (Scalar.spec k r m a t) r facts user =
      requiredCommitsFor (Scalar.spec k r m a t) (Scalar.program r) (Scalar.program r) facts user := by
  simp [specRequiredCommitsFor, specRequiredCommits, requiredCommitsFor, requiredCommits,
    commitButtons, Scalar.spec, Scalar.program, Scalar.screen, Scalar.field, Scalar.button,
    presetScreen, Program.presetOwner, Spec.commit?, List.eraseDups_cons]

/-- New specification for owner review.
On `FixedLine.spec`, the canonical-free required-commit set is identical to
`requiredCommitsFor`. -/
theorem FixedLine.specRequiredCommitsFor_eq (k : ValueKind) (r : Role)
    (m : ReviewMode) (a : AlertCond) (t : Tier) (moreAlerts : List AlertSpec)
    (allowMacro : Bool) (panelMode? : Option ReviewMode) (preset : Prefill)
    (automation : Option (List MacroStep)) (facts : Facts) (user : User) :
    specRequiredCommitsFor (FixedLine.spec k r m a t moreAlerts allowMacro) r facts user =
      requiredCommitsFor (FixedLine.spec k r m a t moreAlerts allowMacro)
        (FixedLine.program r panelMode? preset automation)
        (FixedLine.program r panelMode? preset automation) facts user := by
  cases panelMode? <;> cases automation <;>
    simp [specRequiredCommitsFor, specRequiredCommits, requiredCommitsFor, requiredCommits,
      commitButtons, FixedLine.spec, FixedLine.program, FixedLine.screen, FixedLine.drugField,
      FixedLine.assessmentField, FixedLine.macroButton, Scalar.spec, Scalar.program,
      Scalar.screen, Scalar.button, presetScreen, Program.presetOwner, Spec.commit?,
      List.eraseDups_cons]

/-! ## 4. Carry-over of restricted-family completion theorems -/

/-- New specification for owner review.
`Scalar.program` satisfies `CompletableWhereFeasible` and the canonical-free
`CompletableWhereFeasibleSpec`. -/
theorem Scalar.completableWhereFeasibleSpec (k : ValueKind) (r : Role)
    (m : ReviewMode) (a : AlertCond) (t : Tier) (nonDose : k ≠ .medicationDose) :
    CompletableWhereFeasibleSpec (Scalar.spec k r m a t) (Scalar.program r) := by
  intro facts user hrole hscans s hs c hc hnot _
  change c ∈ specRequiredCommitsFor (Scalar.spec k r m a t) r facts user at hc
  rw [Scalar.specRequiredCommitsFor_eq] at hc
  exact Scalar.completable k r m a t nonDose facts user hrole hscans s hs c hc hnot

/-- New specification for owner review.
`Scalar.program` satisfies `CompletableWhereFeasible`. -/
theorem Scalar.completableWhereFeasible (k : ValueKind) (r : Role)
    (m : ReviewMode) (a : AlertCond) (t : Tier) (nonDose : k ≠ .medicationDose) :
    CompletableWhereFeasible (Scalar.spec k r m a t) (Scalar.program r) (Scalar.program r) :=
  completable_imp_completableWhereFeasible _ _ _ (Scalar.completable k r m a t nonDose)

/-- New specification for owner review.
`FixedLine.program` satisfies the canonical-free `CompletableWhereFeasibleSpec`. -/
theorem FixedLine.completableWhereFeasibleSpec_many_alerts (k : ValueKind)
    (r : Role) (m : ReviewMode) (a : AlertCond) (t : Tier)
    (nonDose : k ≠ .medicationDose) (moreAlerts : List AlertSpec)
    (uniqueAlerts : (((FixedLine.spec k r m a t moreAlerts).alerts).map (·.id)).Nodup)
    (receiptAware : Bool := false) (preset : Prefill := .none)
    (automation : Option (List MacroStep) := none) :
    CompletableWhereFeasibleSpec
      (FixedLine.spec k r m a t moreAlerts automation.isSome)
      (FixedLine.program r (if receiptAware then some m else none) preset automation) := by
  intro facts user hrole hscans s hs c hc hnot _
  change c ∈ specRequiredCommitsFor (FixedLine.spec k r m a t moreAlerts automation.isSome) r facts user at hc
  rw [FixedLine.specRequiredCommitsFor_eq k r m a t moreAlerts automation.isSome
    (if receiptAware then some m else none) preset automation] at hc
  exact FixedLine.completable_many_alerts k r m a t nonDose moreAlerts uniqueAlerts
    receiptAware preset automation facts user hrole hscans s hs c hc hnot

/-- New specification for owner review.
`FixedLine.program` satisfies `CompletableWhereFeasible`. -/
theorem FixedLine.completableWhereFeasible_many_alerts (k : ValueKind)
    (r : Role) (m : ReviewMode) (a : AlertCond) (t : Tier)
    (nonDose : k ≠ .medicationDose) (moreAlerts : List AlertSpec)
    (uniqueAlerts : (((FixedLine.spec k r m a t moreAlerts).alerts).map (·.id)).Nodup)
    (receiptAware : Bool := false) (preset : Prefill := .none)
    (automation : Option (List MacroStep) := none) :
    CompletableWhereFeasible
      (FixedLine.spec k r m a t moreAlerts automation.isSome)
      (FixedLine.program r (if receiptAware then some m else none) preset automation)
      (FixedLine.program r (if receiptAware then some m else none) preset automation) :=
  completable_imp_completableWhereFeasible _ _ _
    (FixedLine.completable_many_alerts k r m a t nonDose moreAlerts uniqueAlerts
      receiptAware preset automation)

/-- New specification for owner review.
Under `CompletableWhereFeasible`, the AG EF abstraction adapter in
`CompletionModel` only needs to cover episodes `(facts, user, c)` where `c` is
feasible at some clock. -/
theorem CompletionModel.accepted_completableWhereFeasible [DecidableEq α]
    (sp : Spec) (can p : Program)
    (model : Facts → User → CommitId → Ehr.Sim.Certificate.Graph α ε)
    (abstraction : ∀ facts user, user.role = p.role → RecordAllowsScans sp facts →
      ∀ c ∈ requiredCommitsFor sp can p facts user,
        (∃ clock, CommitFeasible sp facts user clock c) →
        CompletionModel.EpisodeAbstraction ⟨sp, p, facts, user⟩ c (model facts user c))
    (certificates : ∀ facts user, user.role = p.role → RecordAllowsScans sp facts →
      ∀ c, c ∈ requiredCommitsFor sp can p facts user →
        (∃ clock, CommitFeasible sp facts user clock c) → CompletionModel.Candidate α)
    (accepted : ∀ facts user role scans c required feasible,
      CompletionModel.accept (model facts user c)
        ((abstraction facts user role scans c required feasible).project
          (Episode.start ⟨sp, p, facts, user⟩))
        (certificates facts user role scans c required feasible) = true) :
    CompletableWhereFeasible sp can p := by
  intro facts user role scans s reach c required _ hfeas
  exact CompletionModel.accepted_episode_complete
    (abstraction facts user role scans c required ⟨s.clock, hfeas⟩)
    (accepted facts user role scans c required ⟨s.clock, hfeas⟩) s reach

#print axioms canonicalCanCommit_imp_commitFeasible
#print axioms acceptedCommitFeasible_imp_commitFeasible
#print axioms completable_imp_completableWhereFeasible
#print axioms completableWhereFeasible_imp_completableWhereCanonical
#print axioms completableWhereFeasible_imp_completableWhereAcceptedFeasible
#print axioms satisfies_imp_satisfiesWhereFeasible
#print axioms satisfiesWhereFeasible_of_checked_completableWhereFeasible
#print axioms satisfiesWhereAcceptedFeasible_of_checked
#print axioms missing_payload_not_acceptedCommitFeasible
#print axioms requiredCommits_sub_specRequiredCommits
#print axioms requiredCommitsFor_sub_specRequiredCommitsFor
#print axioms completableWhereFeasibleSpec_imp_completableWhereFeasible
#print axioms Scalar.specRequiredCommitsFor_eq
#print axioms FixedLine.specRequiredCommitsFor_eq
#print axioms Scalar.completableWhereFeasibleSpec
#print axioms Scalar.completableWhereFeasible
#print axioms FixedLine.completableWhereFeasibleSpec_many_alerts
#print axioms FixedLine.completableWhereFeasible_many_alerts
#print axioms CompletionModel.accepted_completableWhereFeasible

end Ehr.Check
