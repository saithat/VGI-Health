import Ehr.Proofs.RuntimeRefinement
import Ehr.Check.Sound

/-! The reachable-state and per-step clauses of the accepted properties, for
ordinary programs (no patient selection) run through the deployed API with
fixed facts. Each `Fixed…` definition repeats the body of the `Props`
definition of the same name, with `FixedReachable` for `Props.Reachable` and
the API's returned state for `Episode.next`; API events are human, so `actor`
clauses are dropped. Each `ordinary_…` theorem derives the runtime form from
the core property through `ordinary_refines`. Every definition and theorem here
is a new specification for owner review, outside Comparator. -/

namespace Ehr.Runtime
open Ehr Props Proofs

/-- The core screen view does not read the critical fields. -/
@[simp] theorem screen_critical (ep : Episode) (s c d) :
    ep.screen (withCritical s c d) = ep.screen s := view_critical ..

/-- Shown info does not read the critical fields. -/
@[simp] theorem infoShownIn_critical (ep : Episode) (s c d i) :
    InfoShown ep (withCritical s c d) i = InfoShown ep s i := by
  simp only [InfoShown, ShowsSome, screen_critical]

/-- Shown commit buttons do not read the critical fields. -/
@[simp] theorem commitButtonShown_critical (ep : Episode) (s c d cm) :
    CommitButtonShown ep (withCritical s c d) cm = CommitButtonShown ep s cm := by
  simp only [CommitButtonShown, ShowsSome, screen_critical]

/-- Shown inline alerts do not read the critical fields. -/
@[simp] theorem alertShownInline_critical (ep : Episode) (s c d a) :
    AlertShownInline ep (withCritical s c d) a = AlertShownInline ep s a := by
  simp only [AlertShownInline, ShowsSome, screen_critical]

/-- Requirement applicability does not read the critical fields. -/
@[simp] theorem applies_critical (ep : Episode) (s c d w) :
    Applies ep (withCritical s c d) w = Applies ep s w := by
  simp only [Applies, whenHolds_critical]

/-- Met reviews do not read the critical fields. -/
@[simp] theorem reviewMetIn_critical (ep : Episode) (s c d rq) :
    ReviewMetIn ep (withCritical s c d) rq = ReviewMetIn ep s rq := by
  simp only [ReviewMetIn, applies_critical, infoShownIn_critical]
  rfl

/-- Met entries do not read the critical fields. -/
@[simp] theorem entryMetIn_critical (ep : Episode) (s c d rq) :
    EntryMetIn ep (withCritical s c d) rq = EntryMetIn ep s rq := by
  simp only [EntryMetIn, applies_critical, lineMatches_critical]
  rfl

/-- New specification for owner review: the API call performs commit `c`
(runtime form of `Props.CommitHappens`). -/
def Commits (s s' : State) (c : CommitId) : Prop := c ∉ s.commits ∧ c ∈ s'.commits

/-- New specification for owner review: runtime form of `Props.LandmarksShown` (property 1). -/
def FixedLandmarksShown (ep : Episode) : Prop :=
  FixedAlways ep fun s => ∀ l ∈ ep.spec.design.landmarks, InfoShown ep s l

/-- New specification for owner review: runtime form of `Props.CommitCapturesAll` (property 2). -/
def FixedCommitCapturesAll (ep : Episode) : Prop :=
  FixedEveryStep ep fun s _ s' => ∀ c, Commits s s' c →
    ∀ rq ∈ ep.spec.entries, rq.commit = c → EntryMetIn ep s rq

/-- New specification for owner review: runtime form of `Props.EnteredOnce` (property 2). -/
def FixedEnteredOnce (ep : Episode) : Prop :=
  FixedEveryStep ep fun s e s' =>
    (∀ cid v, e ≠ .enter cid v) →
    (∀ cid, e = .click cid →
      clickedMacro? ep.spec ep.prog ep.facts s cid = none ∨ s.popup?.isSome) →
    ∀ x ∈ s.captured, x.confirmed = true → x ∈ s'.captured

/-- New specification for owner review: runtime form of `Props.WritesAllowed` (property 3). -/
def FixedWritesAllowed (ep : Episode) : Prop :=
  FixedAlways ep fun s =>
    (∀ x ∈ s.captured, ∃ el, ep.spec.element? x.element = some el ∧ ep.user.role ∈ el.enteredBy) ∧
    (∀ c ∈ s.commits, ∃ cs, ep.spec.commit? c = some cs ∧ ep.user.role ∈ cs.roles) ∧
    (∀ r ∈ s.receipts, r ∈ ep.facts.receipts ∨ (ep.spec.info? r.info).isSome)

/-- New specification for owner review: runtime form of `Props.CommitReviewsMet` (property 4). -/
def FixedCommitReviewsMet (ep : Episode) : Prop :=
  FixedEveryStep ep fun s _ s' => ∀ c, Commits s s' c →
    ∀ rq ∈ ep.spec.reviews, rq.commit = c → ReviewMetIn ep s rq

/-- New specification for owner review: runtime form of
`Props.CommitScreenShowsReviews` (property 4). -/
def FixedCommitScreenShowsReviews (ep : Episode) : Prop :=
  FixedAlways ep fun s => ∀ c, CommitButtonShown ep s c →
    ∀ rq ∈ ep.spec.reviews, rq.commit = c → rq.waivedBy? = none → ReviewMetIn ep s rq

/-- New specification for owner review: runtime form of `Props.HumanStepsByHuman`
(property 5). Every API event is a human event; a new human-only value needs an entry. -/
def FixedHumanStepsByHuman (ep : Episode) : Prop :=
  (∀ x ∈ (runInit ⟨ep.spec, ep.prog, ep.facts, ep.user⟩).captured, ∀ el,
    ep.spec.element? x.element = some el → ¬ HumanMustEnter el) ∧
  FixedEveryStep ep fun s e s' => ∀ x ∈ s'.captured, x ∉ s.captured →
    ∀ el, ep.spec.element? x.element = some el → HumanMustEnter el → ∃ cid v, e = .enter cid v

/-- New specification for owner review: runtime form of
`Props.OnlyHumanCommitsAndAcks` (property 5). -/
def FixedOnlyHumanCommitsAndAcks (ep : Episode) : Prop :=
  FixedEveryStep ep fun s e s' =>
    (∀ c, Commits s s' c → ∃ cid, e = .click cid ∧
      ∃ comp ∈ ep.prog.compsOf s.screen, comp.id = cid ∧ comp.kind = .button (.commit c)) ∧
    (s'.acked ≠ s.acked → ∃ a, e = .ack a)

/-- New specification for owner review: runtime form of `Props.CosignIsSecondUser` (property 5). -/
def FixedCosignIsSecondUser (ep : Episode) : Prop :=
  FixedEveryStep ep fun s _ s' => ∀ c, Commits s s' c →
    ∀ rq ∈ ep.spec.entries, rq.commit = c → ∀ el, ep.spec.element? rq.element = some el →
      el.kind = .cosign → Applies ep s rq.when → ¬ rq.perOrderLine →
        ∃ x ∈ s.captured, x.element = el.id ∧ x.byHuman = true ∧
          ∃ u, x.value = .user u ∧ u ≠ ep.user.id

/-- New specification for owner review: runtime form of `Props.CommitUnitsRight` (property 7). -/
def FixedCommitUnitsRight (ep : Episode) : Prop :=
  FixedEveryStep ep fun s _ s' => ∀ c, Commits s s' c →
    ∀ rq ∈ ep.spec.entries, rq.commit = c → ∀ el u, ep.spec.element? rq.element = some el →
      el.kind = .quantity u → Applies ep s rq.when → ¬ rq.perOrderLine →
        ∃ x ∈ s.captured, x.element = el.id ∧ x.confirmed = true ∧ ∃ t, x.value = .qty t u

/-- New specification for owner review: runtime form of `Props.InterruptiveHandled` (property 9). -/
def FixedInterruptiveHandled (ep : Episode) : Prop :=
  FixedEveryStep ep fun s _ s' => ∀ c, Commits s s' c →
    ∀ al ∈ ep.spec.alerts, al.commit = c → al.tier = .interruptive →
      ∀ k ∈ alertKeys ep.facts s al.cond, (al.id, k) ∈ s.acked

/-- New specification for owner review: runtime form of `Props.PassiveShownInline` (property 9). -/
def FixedPassiveShownInline (ep : Episode) : Prop :=
  FixedAlways ep fun s => ∀ al ∈ ep.spec.alerts, al.tier = .passive →
    (ep.prog.screen? s.screen).any al.targetsScreen = true →
    alertHolds ep.spec ep.facts s al.id = true → AlertShownInline ep s al.id

/-- New specification for owner review: runtime form of `Props.AlertsOnlyWhenTrue` (property 10). -/
def FixedAlertsOnlyWhenTrue (ep : Episode) : Prop :=
  FixedAlways ep fun s =>
    (∀ a k, s.popup? = some (a, k) →
      ∃ al ∈ ep.spec.alerts, al.id = a ∧ k ∈ alertKeys ep.facts s al.cond) ∧
    (∀ a, AlertShownInline ep s a → alertHolds ep.spec ep.facts s a = true)

/-- New specification for owner review: runtime form of `Props.InterruptsOnce` (property 11). -/
def FixedInterruptsOnce (ep : Episode) : Prop :=
  FixedEveryStep ep (fun s _ s' =>
    (∀ p ∈ s.acked, p ∈ s'.acked) ∧
    (∀ p, s.popup? = some p → s'.popup? = some p ∨ p ∈ s'.acked)) ∧
  FixedAlways ep fun s => ∀ p, s.popup? = some p → p ∉ s.acked

variable (ep : Episode) (hord : Workspace.enabled ep.prog = false)
include hord

/-- New specification for owner review: property 1's reachable-state clause at runtime. -/
theorem ordinary_landmarksShown (h : LandmarksShown ep) : FixedLandmarksShown ep :=
  ordinary_always ep hord (fun s hs => by simpa only [forgetCritical, infoShownIn_critical] using hs) h

/-- New specification for owner review: property 2's commit clause at runtime. -/
theorem ordinary_commitCapturesAll (h : CommitCapturesAll ep) : FixedCommitCapturesAll ep :=
  ordinary_everyStep ep hord
    (fun s e s' hq => by
      simpa only [forgetCritical, Commits, withCritical_commits, entryMetIn_critical] using hq)
    (fun _ _ _ hc => absurd hc.2 hc.1) (fun s hs e => h s hs .human e)

/-- New specification for owner review: property 2's retention clause at runtime. -/
theorem ordinary_enteredOnce (h : EnteredOnce ep) : FixedEnteredOnce ep :=
  ordinary_everyStep ep hord
    (fun s e s' hq => by
      simpa only [forgetCritical, clickedMacro_critical, withCritical_popup,
        withCritical_captured] using hq)
    (fun _ _ _ _ _ hx _ => hx) (fun s hs e hn hm => h s hs .human e hn (fun _ => hm))

/-- New specification for owner review: **property 3 at runtime.** Every
capture, commit and receipt of an ordinary fixed-facts API run is allowed. -/
theorem ordinary_writesAllowed (h : WritesAllowed ep) : FixedWritesAllowed ep :=
  ordinary_always ep hord (fun _ hs => hs) h

/-- New specification for owner review: property 4's commit clause at runtime. -/
theorem ordinary_commitReviewsMet (h : CommitReviewsMet ep) : FixedCommitReviewsMet ep :=
  ordinary_everyStep ep hord
    (fun s e s' hq => by
      simpa only [forgetCritical, Commits, withCritical_commits, reviewMetIn_critical] using hq)
    (fun _ _ _ hc => absurd hc.2 hc.1) (fun s hs e => h s hs .human e)

/-- New specification for owner review: property 4's commit-screen clause at runtime. -/
theorem ordinary_commitScreenShowsReviews (h : CommitScreenShowsReviews ep) :
    FixedCommitScreenShowsReviews ep :=
  ordinary_always ep hord (fun s hs => by
    simpa only [forgetCritical, commitButtonShown_critical, reviewMetIn_critical] using hs) h

/-- New specification for owner review: property 5's human-entry clause at runtime. -/
theorem ordinary_humanStepsByHuman (h : HumanStepsByHuman ep) : FixedHumanStepsByHuman ep := by
  refine ⟨?_, ordinary_everyStep ep hord (fun _ _ _ hq => hq)
    (fun _ _ _ hx hn => absurd hx hn)
    (fun s hs e x hx hn el hel hm => (h.2 s hs .human e x hx hn el hel hm).2)⟩
  simpa only [runInit, hord, Bool.false_eq_true, ↓reduceIte, Episode.start] using h.1

/-- New specification for owner review: property 5's commit/acknowledgment clause at runtime. -/
theorem ordinary_onlyHumanCommitsAndAcks (h : OnlyHumanCommitsAndAcks ep) :
    FixedOnlyHumanCommitsAndAcks ep :=
  ordinary_everyStep ep hord (fun _ _ _ hq => hq)
    (fun _ _ => ⟨fun _ hc => absurd hc.2 hc.1, fun hn => absurd rfl hn⟩)
    (fun s hs e => ⟨fun c hc => ((h s hs .human e).1 c hc).2, fun ha => ((h s hs .human e).2 ha).2⟩)

/-- New specification for owner review: property 5's cosign clause at runtime. -/
theorem ordinary_cosignIsSecondUser (h : CosignIsSecondUser ep) : FixedCosignIsSecondUser ep :=
  ordinary_everyStep ep hord
    (fun s e s' hq => by
      simpa only [forgetCritical, Commits, withCritical_commits, applies_critical,
        withCritical_captured] using hq)
    (fun _ _ _ hc => absurd hc.2 hc.1) (fun s hs e => h s hs .human e)

/-- New specification for owner review: property 7's commit clause at runtime. -/
theorem ordinary_commitUnitsRight (h : CommitUnitsRight ep) : FixedCommitUnitsRight ep :=
  ordinary_everyStep ep hord
    (fun s e s' hq => by
      simpa only [forgetCritical, Commits, withCritical_commits, applies_critical,
        withCritical_captured] using hq)
    (fun _ _ _ hc => absurd hc.2 hc.1) (fun s hs e => h s hs .human e)

/-- New specification for owner review: property 9's commit clause at runtime. -/
theorem ordinary_interruptiveHandled (h : InterruptiveHandled ep) : FixedInterruptiveHandled ep :=
  ordinary_everyStep ep hord
    (fun s e s' hq => by
      simpa only [forgetCritical, Commits, withCritical_commits, alertKeys_critical,
        withCritical_acked] using hq)
    (fun _ _ _ hc => absurd hc.2 hc.1) (fun s hs e => h s hs .human e)

/-- New specification for owner review: property 9's passive-inline clause at runtime. -/
theorem ordinary_passiveShownInline (h : PassiveShownInline ep) : FixedPassiveShownInline ep :=
  ordinary_always ep hord (fun s hs => by
    simpa only [forgetCritical, withCritical_screen, alertHolds_critical,
      alertShownInline_critical] using hs) h

/-- New specification for owner review: **property 10 at runtime.** In an
ordinary fixed-facts API run an open popup's key still fires, and an inline
alert is shown only while its condition holds. -/
theorem ordinary_alertsOnlyWhenTrue (h : AlertsOnlyWhenTrue ep) : FixedAlertsOnlyWhenTrue ep :=
  ordinary_always ep hord (fun s hs => by
    simpa only [forgetCritical, withCritical_popup, alertKeys_critical, alertHolds_critical,
      alertShownInline_critical] using hs) h

/-- New specification for owner review: property 11's clauses at runtime. -/
theorem ordinary_interruptsOnce (h : InterruptsOnce ep) : FixedInterruptsOnce ep :=
  ⟨ordinary_everyStep ep hord (fun _ _ _ hq => hq)
    (fun _ _ => ⟨fun _ hp => hp, fun _ hp => Or.inl hp⟩) (fun s hs e => h.1 s hs .human e),
   ordinary_always ep hord (fun _ hs => hs) h.2⟩

omit hord

/-- New specification for owner review: the reachable-state and per-step
clauses of accepted properties 1, 2, 3, 4, 5, 7, 9, 10 and 11, in runtime form
for one episode. Properties 8 and 13 are static, and property 12 is
`accepted_severityTiers`. -/
structure FixedAccepted (ep : Episode) : Prop where
  landmarksShown : FixedLandmarksShown ep
  commitCapturesAll : FixedCommitCapturesAll ep
  enteredOnce : FixedEnteredOnce ep
  writesAllowed : FixedWritesAllowed ep
  commitReviewsMet : FixedCommitReviewsMet ep
  commitScreenShowsReviews : FixedCommitScreenShowsReviews ep
  humanStepsByHuman : FixedHumanStepsByHuman ep
  onlyHumanCommitsAndAcks : FixedOnlyHumanCommitsAndAcks ep
  cosignIsSecondUser : FixedCosignIsSecondUser ep
  commitUnitsRight : FixedCommitUnitsRight ep
  interruptiveHandled : FixedInterruptiveHandled ep
  passiveShownInline : FixedPassiveShownInline ep
  alertsOnlyWhenTrue : FixedAlertsOnlyWhenTrue ep
  interruptsOnce : FixedInterruptsOnce ep

/-- New specification for owner review: **accepted ordinary programs at
runtime.** If the checker accepts a program without patient selection, every
fixed-facts API run by a user of the program's role satisfies the runtime form
of each reachable-state and per-step clause of the accepted properties. -/
theorem accepted_ordinary (sp prev can p) (h : Check.check sp prev can p = .ok)
    (hord : Workspace.enabled p = false) (facts : Facts) (user : User)
    (hrole : user.role = p.role) : FixedAccepted ⟨sp, p, facts, user⟩ := by
  obtain ⟨_, _, _, _, _, landmarks⟩ := Check.accepted_wellFormed sp prev can p h
  obtain ⟨_, captures⟩ := Check.accepted_capturesAllOnce sp prev can p h
  obtain ⟨_, writes⟩ := Check.accepted_writesOnly sp prev can p h
  obtain ⟨reviewsMet, reviewsShown⟩ := Check.accepted_reviewsBeforeCommit sp prev can p h facts user hrole
  obtain ⟨_, human⟩ := Check.accepted_humanOnlyKept sp prev can p h
  obtain ⟨_, units⟩ := Check.accepted_units sp prev can p h
  obtain ⟨_, alerts⟩ := Check.accepted_alertsFire sp prev can p h
  obtain ⟨_, alarms⟩ := Check.accepted_noFalseAlarms sp prev can p h
  obtain ⟨_, repeats⟩ := Check.accepted_noRepeatInterruptions sp prev can p h
  obtain ⟨capturesAll, enteredOnce⟩ := captures facts user hrole
  obtain ⟨humanSteps, humanCommits, cosign⟩ := human facts user hrole
  obtain ⟨interruptive, passive⟩ := alerts facts user hrole
  exact {
    landmarksShown := ordinary_landmarksShown _ hord (landmarks facts user hrole)
    commitCapturesAll := ordinary_commitCapturesAll _ hord capturesAll
    enteredOnce := ordinary_enteredOnce _ hord enteredOnce
    writesAllowed := ordinary_writesAllowed _ hord (writes facts user hrole)
    commitReviewsMet := ordinary_commitReviewsMet _ hord reviewsMet
    commitScreenShowsReviews := ordinary_commitScreenShowsReviews _ hord reviewsShown
    humanStepsByHuman := ordinary_humanStepsByHuman _ hord humanSteps
    onlyHumanCommitsAndAcks := ordinary_onlyHumanCommitsAndAcks _ hord humanCommits
    cosignIsSecondUser := ordinary_cosignIsSecondUser _ hord cosign
    commitUnitsRight := ordinary_commitUnitsRight _ hord (units facts user hrole)
    interruptiveHandled := ordinary_interruptiveHandled _ hord interruptive
    passiveShownInline := ordinary_passiveShownInline _ hord passive
    alertsOnlyWhenTrue := ordinary_alertsOnlyWhenTrue _ hord (alarms facts user hrole)
    interruptsOnce := ordinary_interruptsOnce _ hord (repeats facts user hrole) }

#print axioms screen_critical
#print axioms infoShownIn_critical
#print axioms commitButtonShown_critical
#print axioms alertShownInline_critical
#print axioms applies_critical
#print axioms reviewMetIn_critical
#print axioms entryMetIn_critical
#print axioms ordinary_landmarksShown
#print axioms ordinary_commitCapturesAll
#print axioms ordinary_enteredOnce
#print axioms ordinary_writesAllowed
#print axioms ordinary_commitReviewsMet
#print axioms ordinary_commitScreenShowsReviews
#print axioms ordinary_humanStepsByHuman
#print axioms ordinary_onlyHumanCommitsAndAcks
#print axioms ordinary_cosignIsSecondUser
#print axioms ordinary_commitUnitsRight
#print axioms ordinary_interruptiveHandled
#print axioms ordinary_passiveShownInline
#print axioms ordinary_alertsOnlyWhenTrue
#print axioms ordinary_interruptsOnce
#print axioms accepted_ordinary
end Ehr.Runtime
