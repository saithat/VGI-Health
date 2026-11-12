import Ehr.Props.Basics
import Ehr.Props.Navigation

/-!
Thirteen requirements for UI programs, stated about the actual interpreter.
Some hold for every program; others require checks on the program's structure.
Satisfies requires all thirteen for every patient's facts and user of the role.
Checker acceptance still needs a completion proof to establish all of Satisfies.
-/

namespace Ehr.Props

open Ehr

/-! ## 1. Well-formed -/

/-- Every component is of a kind in the spec's catalog. -/
def CatalogOnly (spec : Spec) (prog : Program) : Prop :=
  ∀ sc ∈ allComps prog, kindName sc.2.kind ∈ spec.design.catalog

instance (spec : Spec) (prog : Program) : Decidable (CatalogOnly spec prog) := by
  unfold CatalogOnly; infer_instance

/-- The spec names each element, info, commit, and alert rule once. -/
def SpecIdsUnique (spec : Spec) : Prop :=
  (spec.elements.map (·.id)).Nodup ∧ (spec.infos.map (·.id)).Nodup ∧
  (spec.commits.map (·.id)).Nodup ∧ (spec.alerts.map (·.id)).Nodup

instance (spec : Spec) : Decidable (SpecIdsUnique spec) := by
  unfold SpecIdsUnique; infer_instance

/-- Screen IDs are unique, and component IDs are unique on each screen. -/
def IdsUnique (prog : Program) : Prop :=
  (prog.screens.map (·.id)).Nodup ∧ ∀ scr ∈ prog.screens, (scr.components.map (·.id)).Nodup

instance (prog : Program) : Decidable (IdsUnique prog) := by
  unfold IdsUnique; infer_instance

/-- The program's references point at real things: the start screen exists;
every "go to" button and macro "go to" step names a screen of the program;
every macro button names a macro of the program; every alert component names
an alert of the spec; every parent is a group or tab container on the same
screen. -/
def ReferencesResolve (spec : Spec) (prog : Program) : Prop :=
  (prog.screen? prog.start).isSome ∧
  (∀ sc ∈ allComps prog, ∀ t ∈ gotoOf? sc.2.kind, (prog.screen? t).isSome) ∧
  (∀ m ∈ prog.macros, ∀ st ∈ m.steps, ∀ t ∈ gotoStep? st, (prog.screen? t).isSome) ∧
  (∀ sc ∈ allComps prog, ∀ m ∈ macroOf? sc.2.kind, (prog.macro? m).isSome) ∧
  (∀ sc ∈ allComps prog, ∀ a ∈ alertOf? sc.2.kind, (spec.alert? a.1).isSome) ∧
  (∀ sc ∈ allComps prog, ∀ pid ∈ sc.2.parent?,
    ∃ par ∈ sc.1.components, par.id = pid ∧ isContainer par.kind = true)

instance (spec : Spec) (prog : Program) : Decidable (ReferencesResolve spec prog) := by
  unfold ReferencesResolve; infer_instance

/-- On every screen the user can reach, every landmark (e.g. the patient
banner) is shown. -/
def LandmarksShown (ep : Episode) : Prop :=
  Always ep fun s => ∀ l ∈ ep.spec.design.landmarks, InfoShown ep s l

/-- Every relevant entry has a field within the depth bound. Entries scoped
only to encounters where this role cannot commit are not required. -/
def RequiredWithinDepth (spec : Spec) (canonical prog : Program) : Prop :=
  ∀ c ∈ requiredCommits spec canonical prog, ∀ rq ∈ spec.entries, rq.commit = c →
    entryRelevantForRole spec prog.role rq = true → ∃ sc ∈ allComps prog, (∃ f ∈ fieldOf? sc.2.kind, f.1 = rq.element) ∧
      WithinClicks prog spec.design.maxDepth sc.1.id

/-- **Property 1, well-formed.** Catalog components only, unique IDs (in the
spec and the program), references resolve, landmarks always shown, and every
required element within the depth bound. Needs the checker. -/
def WellFormed (spec : Spec) (canonical prog : Program) : Prop :=
  CatalogOnly spec prog ∧ SpecIdsUnique spec ∧ IdsUnique prog ∧ ReferencesResolve spec prog ∧
  RequiredWithinDepth spec canonical prog ∧
  ∀ facts user, user.role = prog.role → LandmarksShown ⟨spec, prog, facts, user⟩

/-! ## 2. Captures all, once -/

/-- When a commit happens, every entry requirement for it is met: each
required element is captured, confirmed, valid, in the right unit, and entered
by a human if only a human may enter it. By construction (T0). -/
def CommitCapturesAll (ep : Episode) : Prop :=
  EveryStep ep fun s actor e => ∀ c, CommitHappens ep s actor e c →
    ∀ rq ∈ ep.spec.entries, rq.commit = c → EntryMetIn ep s rq

/-- Confirmed captures are retained by non-entry events. A human macro-button
click without an open popup is excluded because it may run entry steps.
This clause preserves stored values and permits deliberate re-entry. -/
def EnteredOnce (ep : Episode) : Prop :=
  EveryStep ep fun s actor e =>
    (∀ cid v, e ≠ .enter cid v) →
    (actor = .human → ∀ cid, e = .click cid →
      clickedMacro? ep.spec ep.prog ep.facts s cid = none ∨ s.popup?.isSome) →
    ∀ x ∈ s.captured, x.confirmed = true → x ∈ (ep.next actor s e).captured

/-- Every field for an auto-linked element declares a linked prefill from
that element's named source (e.g. an order diagnosis from the visit diagnosis).
Needs the checker. -/
def LinkedNotRetyped (spec : Spec) (prog : Program) : Prop :=
  ∀ sc ∈ allComps prog, ∀ f ∈ fieldOf? sc.2.kind, ∀ el ∈ spec.element? f.1,
    el.prefill = .autoLinked → ∃ src ∈ el.linkedFrom?, f.2.2 = .linked src

instance (spec : Spec) (prog : Program) : Decidable (LinkedNotRetyped spec prog) := by
  unfold LinkedNotRetyped; infer_instance

/-- **Property 2, captures all, once.** Every commit captures each required
element (by construction), confirmed captures survive the specified
non-entry events (by construction), and auto-linked fields declare their
source prefill (checker). Units are in property 7. -/
def CapturesAllOnce (spec : Spec) (prog : Program) : Prop :=
  LinkedNotRetyped spec prog ∧
  ∀ facts user, user.role = prog.role →
    CommitCapturesAll ⟨spec, prog, facts, user⟩ ∧ EnteredOnce ⟨spec, prog, facts, user⟩

/-! ## 3. Writes only -/

/-- Every field is for an element of the spec that the program's role may
enter; every commit button is for a commit of the spec that the role may
perform; every "mark reviewed" button is for an info of the spec. Needs the
checker. -/
def DeclaredWritesInSpec (spec : Spec) (prog : Program) : Prop :=
  (∀ sc ∈ allComps prog, ∀ f ∈ fieldOf? sc.2.kind, ∃ el ∈ spec.element? f.1, prog.role ∈ el.enteredBy) ∧
  (∀ sc ∈ allComps prog, ∀ c ∈ commitOf? sc.2.kind, ∃ cs ∈ spec.commit? c, prog.role ∈ cs.roles) ∧
  (∀ sc ∈ allComps prog, ∀ i ∈ reviewOf? sc.2.kind, (spec.info? i).isSome)

instance (spec : Spec) (prog : Program) : Decidable (DeclaredWritesInSpec spec prog) := by
  unfold DeclaredWritesInSpec; infer_instance

/-- In every reachable state, everything the episode would write is allowed:
each captured value is for a spec element the user's role may enter; each
commit is a spec commit the role may perform; each new receipt is for a spec
info. -/
def WritesAllowed (ep : Episode) : Prop :=
  Always ep fun s =>
    (∀ x ∈ s.captured, ∃ el, ep.spec.element? x.element = some el ∧ ep.user.role ∈ el.enteredBy) ∧
    (∀ c ∈ s.commits, ∃ cs, ep.spec.commit? c = some cs ∧ ep.user.role ∈ cs.roles) ∧
    (∀ r ∈ s.receipts, r ∈ ep.facts.receipts ∨ (ep.spec.info? r.info).isSome)

/-- **Property 3, writes only.** The UI cannot write anything outside the
spec, and the role writes only what it may. -/
def WritesOnly (spec : Spec) (prog : Program) : Prop :=
  DeclaredWritesInSpec spec prog ∧
  ∀ facts user, user.role = prog.role → WritesAllowed ⟨spec, prog, facts, user⟩

/-! ## 4. Reviews before commit -/

/-- When a commit happens, every review requirement for it is met on that
screen: the info is shown, or a valid receipt covers it, or a human entered
its waiver. By construction (T0). -/
def CommitReviewsMet (ep : Episode) : Prop :=
  EveryStep ep fun s actor e => ∀ c, CommitHappens ep s actor e c →
    ∀ rq ∈ ep.spec.reviews, rq.commit = c → ReviewMetIn ep s rq

/-- Whenever a button for a commit is shown, every review requirement for
that commit without a waiver is already met on that screen: the info is
shown, or a valid receipt covers it. So the user is never sent hunting for
hidden information (in a closed tab or a collapsed group) at the moment of
signing. (A requirement with a waiver may instead be met by entering the
waiver; property 6 makes sure the user can.) Needs the checker. -/
def CommitScreenShowsReviews (ep : Episode) : Prop :=
  Always ep fun s => ∀ c, CommitButtonShown ep s c →
    ∀ rq ∈ ep.spec.reviews, rq.commit = c → rq.waivedBy? = none → ReviewMetIn ep s rq

/-- **Property 4, reviews before commit.** -/
def ReviewsBeforeCommit (spec : Spec) (prog : Program) : Prop :=
  ∀ facts user, user.role = prog.role →
    CommitReviewsMet ⟨spec, prog, facts, user⟩ ∧ CommitScreenShowsReviews ⟨spec, prog, facts, user⟩

/-! ## 5. Human-only kept -/

/-- A value for an element a human must enter (patient-ID re-entry, scans,
the second nurse's cosign, `never`-prefill elements) appears only when the
human types or scans it: never at the start, never from a prefill, and never
from a macro. By construction (T3). -/
def HumanStepsByHuman (ep : Episode) : Prop :=
  (∀ x ∈ ep.start.captured, ∀ el, ep.spec.element? x.element = some el → ¬ HumanMustEnter el) ∧
  EveryStep ep fun s actor e => ∀ x ∈ (ep.next actor s e).captured, x ∉ s.captured →
    ∀ el, ep.spec.element? x.element = some el → HumanMustEnter el →
      actor = .human ∧ ∃ cid v, e = .enter cid v

/-- Commits and acknowledgments are done only by the human's own click: a
commit only by clicking a shown button for that commit; an acknowledgment only
by the human's `ack`. Never by a macro. By construction (T3). -/
def OnlyHumanCommitsAndAcks (ep : Episode) : Prop :=
  EveryStep ep fun s actor e =>
    (∀ c, CommitHappens ep s actor e c →
      actor = .human ∧ ∃ cid, e = .click cid ∧
        ∃ comp ∈ ep.prog.compsOf s.screen, comp.id = cid ∧ comp.kind = .button (.commit c)) ∧
    ((ep.next actor s e).acked ≠ s.acked → actor = .human ∧ ∃ a, e = .ack a)

/-- At commit, every applicable whole-episode cosign requirement has a
human-entered capture naming a user other than the signed-in user. T0. -/
def CosignIsSecondUser (ep : Episode) : Prop :=
  EveryStep ep fun s actor e => ∀ c, CommitHappens ep s actor e c →
    ∀ rq ∈ ep.spec.entries, rq.commit = c → ∀ el, ep.spec.element? rq.element = some el →
      el.kind = .cosign → Applies ep s rq.when → ¬ rq.perOrderLine →
        ∃ x ∈ s.captured, x.element = el.id ∧ x.byHuman = true ∧
          ∃ u, x.value = .user u ∧ u ≠ ep.user.id

/-- The program never tries to automate a human step: no field prefills an
element a human must enter; no macro step types into such a field, clicks a
commit, review, macro button, or a request action for a human-required
element. Needs the checker. -/
def NoAutomationAttempts (spec : Spec) (prog : Program) : Prop :=
  (∀ sc ∈ allComps prog, ∀ f ∈ fieldOf? sc.2.kind, ∀ el ∈ spec.element? f.1,
    HumanMustEnter el → f.2.2 = .none) ∧
  (∀ m ∈ prog.macros, ∀ st ∈ m.steps, ∀ sc ∈ allComps prog,
    (setTarget? st = some sc.2.id →
      ∀ f ∈ fieldOf? sc.2.kind, ∀ el ∈ spec.element? f.1, ¬ HumanMustEnter el) ∧
    (clickTarget? st = some sc.2.id →
      commitOf? sc.2.kind = none ∧ reviewOf? sc.2.kind = none ∧ macroOf? sc.2.kind = none ∧
      NoHumanRequest spec sc.2.kind))

instance (spec : Spec) (prog : Program) : Decidable (NoAutomationAttempts spec prog) := by
  unfold NoAutomationAttempts; infer_instance

/-- **Property 5, human-only kept.** Re-entry, scans, double checks, and
acknowledgments are never prefilled, skipped, or automated by a macro, and a
double check needs a second user. -/
def HumanOnlyKept (spec : Spec) (prog : Program) : Prop :=
  NoAutomationAttempts spec prog ∧
  ∀ facts user, user.role = prog.role →
    HumanStepsByHuman ⟨spec, prog, facts, user⟩ ∧ OnlyHumanCommitsAndAcks ⟨spec, prog, facts, user⟩ ∧
    CosignIsSecondUser ⟨spec, prog, facts, user⟩

/-! ## 6. Completable -/

/-- The patient record makes a commit possible at all: a medication scan
needs a medication to give. -/
def RecordAllowsScans (spec : Spec) (facts : Facts) : Prop :=
  (∃ el ∈ spec.elements, el.kind = .scan "medication") → facts.medToGive?.isSome

/-- From every reachable state, each required commit not yet done can still
be done by the human, with some list of events. The hard stop never leaves
the user stuck. -/
def CommitsStayReachable (ep : Episode) (commits : List CommitId) : Prop :=
  Always ep fun s => ∀ c ∈ commits, c ∉ s.commits →
    ∃ es : List Event, c ∈ (ep.afterHuman s es).commits

/-- **Property 6, completable.** For each patient record and user allowed to
perform the commit in that encounter, the commit stays reachable from
every reachable state: the user can always enter what is required, see what
must be reviewed (or enter its waiver), and acknowledge alerts. Needs the
checker. -/
def Completable (spec : Spec) (canonical prog : Program) : Prop :=
  ∀ facts user, user.role = prog.role → RecordAllowsScans spec facts →
    CommitsStayReachable ⟨spec, prog, facts, user⟩ (requiredCommitsFor spec canonical prog facts user)

/-- New specification for owner review.
Commit `c` is feasible under `spec` for `(facts, user)` at `clock`: some
program `p` for `user.role` lets the human perform `c` from `p`'s initial state
with the clock set to `clock`. Sub-choice defaults: fresh-session premise from
`start` with `clock := clock`, `RecordAllowsScans` retained on the outer
property, and an unconstrained witness program `p` (see
`AcceptedCommitFeasible` in `Ehr.Check` for the checker-accepted witness
restriction). -/
def CommitFeasible (spec : Spec) (facts : Facts) (user : User) (clock : Nat)
    (c : CommitId) : Prop :=
  ∃ (p : Program) (es : List Event), p.role = user.role ∧
    c ∈ (Episode.afterHuman ⟨spec, p, facts, user⟩
      { (⟨spec, p, facts, user⟩ : Episode).start with clock := clock } es).commits

/-- New specification for owner review.
From every reachable state `s`, each commit in `commits` not yet done that is
feasible under `ep.spec` for `(ep.facts, ep.user)` at `s.clock` can still be
done by the human in `ep.prog`. -/
def CommitsStayReachableWhereFeasible (ep : Episode) (commits : List CommitId) : Prop :=
  Always ep fun s => ∀ c ∈ commits, c ∉ s.commits →
    CommitFeasible ep.spec ep.facts ep.user s.clock c →
    ∃ es : List Event, c ∈ (ep.afterHuman s es).commits

/-- New specification for owner review.
**Property 6 (feasibility form, option D).** For each patient record and user
allowed to perform the commit in that encounter, whenever the commit is
feasible under `spec` at the current clock, it stays reachable from every
reachable state of `prog`. Sub-choice defaults: fresh-session feasibility
premise from `start` with `clock := s.clock`, `RecordAllowsScans` retained, and
an unconstrained witness program in `CommitFeasible` (restricted to checker-
accepted witnesses in `CompletableWhereAcceptedFeasible`). Keeps the canonical
required-commit set `requiredCommitsFor spec canonical prog facts user` with a
note because `CommitSpec` has no workflow or persona scope (`W1`–`W7`,
`P1`–`P5`) to distinguish persona projections from full-role programs; see
`CompletableWhereFeasibleSpec` for the canonical-free spec-derived variant. -/
def CompletableWhereFeasible (spec : Spec) (canonical prog : Program) : Prop :=
  ∀ facts user, user.role = prog.role → RecordAllowsScans spec facts →
    CommitsStayReachableWhereFeasible ⟨spec, prog, facts, user⟩
      (requiredCommitsFor spec canonical prog facts user)

/-- New specification for owner review.
Canonical-free variant of `CompletableWhereFeasible`: derives the required
commits solely from `spec` (`specRequiredCommitsFor spec prog.role facts user`)
without referencing `canonical`. Implies `CompletableWhereFeasible` for every
`canonical`, and coincides with it on single-workflow specs (`Scalar.spec`,
`FixedLine.spec`), but is strictly stronger when `spec` declares role-permitted
commits for workflows outside a persona program's scope. -/
def CompletableWhereFeasibleSpec (spec : Spec) (prog : Program) : Prop :=
  ∀ facts user, user.role = prog.role → RecordAllowsScans spec facts →
    CommitsStayReachableWhereFeasible ⟨spec, prog, facts, user⟩
      (specRequiredCommitsFor spec prog.role facts user)

/-! ## 7. Units -/

/-- At commit, each applicable whole-episode quantity requirement has a
confirmed capture in the element's declared unit. A weight in lb cannot
satisfy a requirement declared in kg. By construction (T0). -/
def CommitUnitsRight (ep : Episode) : Prop :=
  EveryStep ep fun s actor e => ∀ c, CommitHappens ep s actor e c →
    ∀ rq ∈ ep.spec.entries, rq.commit = c → ∀ el u, ep.spec.element? rq.element = some el →
      el.kind = .quantity u → Applies ep s rq.when → ¬ rq.perOrderLine →
        ∃ x ∈ s.captured, x.element = el.id ∧ x.confirmed = true ∧ ∃ t, x.value = .qty t u

/-- A quantity field's named record prefill source must be `weightToday`.
The interpreter preserves that record's unit; the commit checks the required
unit separately. Needs the checker. -/
def QuantityPrefillsKeepUnits (spec : Spec) (prog : Program) : Prop :=
  ∀ sc ∈ allComps prog, ∀ f ∈ fieldOf? sc.2.kind, ∀ el ∈ spec.element? f.1,
    isQuantity el.kind = true → ∀ fact ∈ recordFactOf? f.2.2, fact = "weightToday"

instance (spec : Spec) (prog : Program) : Decidable (QuantityPrefillsKeepUnits spec prog) := by
  unfold QuantityPrefillsKeepUnits; infer_instance

/-- **Property 7, units.** Whole-episode quantity requirements use their
declared units at commit, and quantity record prefills use `weightToday`.
Native medication-dose compatibility has its separate interpreter theorem
`committed_dose_native`. -/
def UnitsRight (spec : Spec) (prog : Program) : Prop :=
  QuantityPrefillsKeepUnits spec prog ∧
  ∀ facts user, user.role = prog.role → CommitUnitsRight ⟨spec, prog, facts, user⟩

/-! ## 8. Budgets -/

/-- The program asks for no more popups, on screens reachable from its start,
than the canonical program does. Needs the checker. -/
def AlertBudget (canonical prog : Program) : Prop :=
  ∀ rc rp : List ScreenId,
    (∀ z, z ∈ rc ↔ ReachableScreen canonical z ∧ (canonical.screen? z).isSome) →
    (∀ z, z ∈ rp ↔ ReachableScreen prog z ∧ (prog.screen? z).isSome) →
    popupRequestCount prog rp.eraseDups ≤ popupRequestCount canonical rc.eraseDups

/-- At most `stabilityBudget` components moved since the previous version
(moved: same tag, different screen or parent; copies do not count). Needs the
checker. -/
def StabilityBudget (spec : Spec) (prev : Option Program) (prog : Program) : Prop :=
  ∀ p, prev = some p → (movedTags p prog).length ≤ spec.design.stabilityBudget

instance (spec : Spec) (prev : Option Program) (prog : Program) : Decidable (StabilityBudget spec prev prog) := by
  unfold StabilityBudget; infer_instance

/-- **Property 8, budgets.** -/
def WithinBudgets (spec : Spec) (prev : Option Program) (canonical prog : Program) : Prop :=
  AlertBudget canonical prog ∧ StabilityBudget spec prev prog

/-! ## Alerts: shown when they matter, and no fatigue -/

/-- When a commit happens, every interruptive alert about it was acknowledged
for each thing it fires for (it popped up and the human handled it). By
construction (T0). -/
def InterruptiveHandled (ep : Episode) : Prop :=
  EveryStep ep fun s actor e => ∀ c, CommitHappens ep s actor e c →
    ∀ al ∈ ep.spec.alerts, al.commit = c → al.tier = .interruptive →
      ∀ k ∈ alertKeys ep.facts s al.cond, (al.id, k) ∈ s.acked

/-- In every reachable state whose screen has a workflow targeted by a passive
alert, if its condition holds, the alert is shown inline. Needs the checker.
`targetsScreen` is the interpreter's workflow-tag matching rule. -/
def PassiveShownInline (ep : Episode) : Prop :=
  Always ep fun s => ∀ al ∈ ep.spec.alerts, al.tier = .passive →
    (ep.prog.screen? s.screen).any al.targetsScreen = true →
    alertHolds ep.spec ep.facts s al.id = true → AlertShownInline ep s al.id

/-- No macro step clicks or types into an alert component. Needs the checker. -/
def NoAlertSuppression (prog : Program) : Prop :=
  ∀ m ∈ prog.macros, ∀ st ∈ m.steps, ∀ sc ∈ allComps prog,
    (alertOf? sc.2.kind).isSome → stepTarget? st ≠ some sc.2.id

instance (prog : Program) : Decidable (NoAlertSuppression prog) := by
  unfold NoAlertSuppression; infer_instance

/-- **Property 9 (A1), alerts fire when they should.** -/
def AlertsFire (spec : Spec) (prog : Program) : Prop :=
  NoAlertSuppression prog ∧
  ∀ facts user, user.role = prog.role →
    InterruptiveHandled ⟨spec, prog, facts, user⟩ ∧ PassiveShownInline ⟨spec, prog, facts, user⟩

/-- An alert appears only when its condition holds: a popup only for an alert
of the spec whose condition holds for that key, and an alert component is
shown only while its condition holds. By construction. -/
def AlertsOnlyWhenTrue (ep : Episode) : Prop :=
  Always ep fun s =>
    (∀ a k, s.popup? = some (a, k) →
      ∃ al ∈ ep.spec.alerts, al.id = a ∧ k ∈ alertKeys ep.facts s al.cond) ∧
    (∀ a, AlertShownInline ep s a → alertHolds ep.spec ep.facts s a = true)

/-- The program never asks an interruptive alert to pop up by itself.
Interruptive alerts pop up from the spec, when their condition holds, at their
commit; a popup placed by the program would not be tied to that. (Passive
alerts are property 12.) Needs the checker. -/
def NoInterruptivePopupRequests (spec : Spec) (prog : Program) : Prop :=
  ∀ sc ∈ allComps prog, ∀ a ∈ alertOf? sc.2.kind, a.2 = true →
    ∀ al ∈ spec.alert? a.1, al.tier ≠ .interruptive

instance (spec : Spec) (prog : Program) : Decidable (NoInterruptivePopupRequests spec prog) := by
  unfold NoInterruptivePopupRequests; infer_instance

/-- **Property 10 (A2), no false alarms.** -/
def NoFalseAlarms (spec : Spec) (prog : Program) : Prop :=
  NoInterruptivePopupRequests spec prog ∧
  ∀ facts user, user.role = prog.role → AlertsOnlyWhenTrue ⟨spec, prog, facts, user⟩

/-- An interruptive alert interrupts at most once per episode for the same
key (alert, drug, data version): acknowledgments are never lost, a popup
stays until it is acknowledged, and an acknowledged popup never comes back.
By construction. -/
def InterruptsOnce (ep : Episode) : Prop :=
  EveryStep ep (fun s actor e =>
    (∀ p ∈ s.acked, p ∈ (ep.next actor s e).acked) ∧
    (∀ p, s.popup? = some p → (ep.next actor s e).popup? = some p ∨ p ∈ (ep.next actor s e).acked)) ∧
  Always ep fun s => ∀ p, s.popup? = some p → p ∉ s.acked

/-- The program never asks the same interruptive alert to pop up on two
different screens. Needs the checker. -/
def PopupRequestedOnce (spec : Spec) (prog : Program) : Prop :=
  ∀ s1 ∈ allComps prog, ∀ s2 ∈ allComps prog, ∀ a1 ∈ alertOf? s1.2.kind, ∀ a2 ∈ alertOf? s2.2.kind,
    a1.2 = true → a2.2 = true → a1.1 = a2.1 →
    (∀ al ∈ spec.alert? a1.1, al.tier = .interruptive) → s1.1.id = s2.1.id

instance (spec : Spec) (prog : Program) : Decidable (PopupRequestedOnce spec prog) := by
  unfold PopupRequestedOnce; infer_instance

/-- **Property 11 (A3), no repeat interruptions.** -/
def NoRepeatInterruptions (spec : Spec) (prog : Program) : Prop :=
  PopupRequestedOnce spec prog ∧
  ∀ facts user, user.role = prog.role → InterruptsOnce ⟨spec, prog, facts, user⟩

/-- Passive alerts never pop up. By construction. -/
def PassiveNeverPopsUp (ep : Episode) : Prop :=
  Always ep fun s => ∀ a k al, s.popup? = some (a, k) → ep.spec.alert? a = some al →
    al.tier ≠ .passive

/-- The program never asks a passive alert to pop up. Needs the checker. -/
def NoPassivePopupRequests (spec : Spec) (prog : Program) : Prop :=
  ∀ sc ∈ allComps prog, ∀ a ∈ alertOf? sc.2.kind, a.2 = true →
    ∀ al ∈ spec.alert? a.1, al.tier ≠ .passive

instance (spec : Spec) (prog : Program) : Decidable (NoPassivePopupRequests spec prog) := by
  unfold NoPassivePopupRequests; infer_instance

/-- **Property 12 (A4), severity tiers.** Passive alerts never pop up; only
interruptive and removable ones may. -/
def SeverityTiers (spec : Spec) (prog : Program) : Prop :=
  NoPassivePopupRequests spec prog ∧
  ∀ facts user, user.role = prog.role → PassiveNeverPopsUp ⟨spec, prog, facts, user⟩

/-! ## 13. Sane navigation

`NavigationSane` uses `Render.NavSane` over the actual
navigation tree. D1–D4 and D6 hold for every program by renderer theorems in
`Ehr.Render.UiProofs`; they do not need additional checker rules.
-/

/-! ## All together -/

/-- **A certified program.** `prog` satisfies properties 1–13 against `spec`,
given the previous deployed version `prev` (if any) and the vendor's
`canonical` program. -/
def Satisfies (spec : Spec) (prev : Option Program) (canonical prog : Program) : Prop :=
  WellFormed spec canonical prog ∧        -- 1
  CapturesAllOnce spec prog ∧             -- 2
  WritesOnly spec prog ∧                  -- 3
  ReviewsBeforeCommit spec prog ∧         -- 4
  HumanOnlyKept spec prog ∧               -- 5
  Completable spec canonical prog ∧       -- 6
  UnitsRight spec prog ∧                  -- 7
  WithinBudgets spec prev canonical prog ∧ -- 8
  AlertsFire spec prog ∧                  -- 9  (A1)
  NoFalseAlarms spec prog ∧               -- 10 (A2)
  NoRepeatInterruptions spec prog ∧       -- 11 (A3)
  SeverityTiers spec prog ∧               -- 12 (A4)
  NavigationSane prog                    -- 13 (D5)

/-- New specification for owner review.
**A certified program under the feasibility form of property 6 (option D).**
Same thirteen conjuncts as `Satisfies`, with `CompletableWhereFeasible` in
place of `Completable`. -/
def SatisfiesWhereFeasible (spec : Spec) (prev : Option Program) (canonical prog : Program) : Prop :=
  WellFormed spec canonical prog ∧        -- 1
  CapturesAllOnce spec prog ∧             -- 2
  WritesOnly spec prog ∧                  -- 3
  ReviewsBeforeCommit spec prog ∧         -- 4
  HumanOnlyKept spec prog ∧               -- 5
  CompletableWhereFeasible spec canonical prog ∧ -- 6 (option D)
  UnitsRight spec prog ∧                  -- 7
  WithinBudgets spec prev canonical prog ∧ -- 8
  AlertsFire spec prog ∧                  -- 9  (A1)
  NoFalseAlarms spec prog ∧               -- 10 (A2)
  NoRepeatInterruptions spec prog ∧       -- 11 (A3)
  SeverityTiers spec prog ∧               -- 12 (A4)
  NavigationSane prog                    -- 13 (D5)

end Ehr.Props
