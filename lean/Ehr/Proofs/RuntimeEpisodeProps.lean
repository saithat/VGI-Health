import Ehr.Proofs.RuntimeEpisodeRefinement
import Ehr.Proofs.RuntimeFromProofs
import Ehr.Proofs.RuntimeOrdinary

/-! The reachable-state and per-step clauses of the accepted properties, per
bound patient episode, for programs with patient selection run through the
deployed API. Each `Episode…` definition repeats the body of the `Fixed…`
definition of the same name (hence of the `Props` definition), with the states
of one episode for `FixedReachable` and the episode's API calls that are not
workspace navigation for all API calls. Each `episode_…` theorem derives it
from the `…From` form at the hydrated chart. Every definition and theorem here
is a new specification for owner review, outside Comparator. -/

namespace Ehr.Runtime
open Ehr Props

/-- New specification for owner review: property 1 per episode. `InfoShown`
reads the interpreter's view, which is the API view in every episode state
(`episode_runView`). -/
def EpisodeLandmarksShown (E : BoundEpisode) : Prop :=
  EpisodeAlways E fun s => ∀ l ∈ E.spec.design.landmarks, InfoShown E.toEpisode s l

/-- New specification for owner review: property 2's commit clause per episode. -/
def EpisodeCommitCapturesAll (E : BoundEpisode) : Prop :=
  EpisodeEveryStep E fun s _ s' => ∀ c, Commits s s' c →
    ∀ rq ∈ E.spec.entries, rq.commit = c → EntryMetIn E.toEpisode s rq

/-- New specification for owner review: property 2's retention clause per
episode. Workspace navigation, which moves the captures to the patient's
stored draft, is outside the episode. -/
def EpisodeEnteredOnce (E : BoundEpisode) : Prop :=
  EpisodeEveryStep E fun s e s' =>
    (∀ cid v, e ≠ .enter cid v) →
    (∀ cid, e = .click cid →
      clickedMacro? E.spec E.prog E.facts s cid = none ∨ s.popup?.isSome) →
    ∀ x ∈ s.captured, x.confirmed = true → x ∈ s'.captured

/-- New specification for owner review: property 3 per episode. -/
def EpisodeWritesAllowed (E : BoundEpisode) : Prop :=
  EpisodeAlways E fun s =>
    (∀ x ∈ s.captured, ∃ el, E.spec.element? x.element = some el ∧ E.user.role ∈ el.enteredBy) ∧
    (∀ c ∈ s.commits, ∃ cs, E.spec.commit? c = some cs ∧ E.user.role ∈ cs.roles) ∧
    (∀ r ∈ s.receipts, r ∈ E.facts.receipts ∨ (E.spec.info? r.info).isSome)

/-- New specification for owner review: property 4's commit clause per episode. -/
def EpisodeCommitReviewsMet (E : BoundEpisode) : Prop :=
  EpisodeEveryStep E fun s _ s' => ∀ c, Commits s s' c →
    ∀ rq ∈ E.spec.reviews, rq.commit = c → ReviewMetIn E.toEpisode s rq

/-- New specification for owner review: property 4's commit-screen clause per episode. -/
def EpisodeCommitScreenShowsReviews (E : BoundEpisode) : Prop :=
  EpisodeAlways E fun s => ∀ c, CommitButtonShown E.toEpisode s c →
    ∀ rq ∈ E.spec.reviews, rq.commit = c → rq.waivedBy? = none → ReviewMetIn E.toEpisode s rq

/-- New specification for owner review: property 5's human-entry clause per
episode. The first clause is about the hydrated chart instead of `runInit`.
Hydration prefills no human-required value, but it restores the patient's
stored draft: every human-required value in the hydrated chart is a confirmed
human entry from the draft stored for the selected patient
(`Ehr.Runtime.draft_origin` gives where stored entries come from). This
replaces the earlier clause "the hydrated chart holds no such value", which
restoring drafts makes false. Every API event is human. -/
def EpisodeHumanStepsByHuman (E : BoundEpisode) : Prop :=
  (E.Hydrates → ∀ x ∈ E.start.captured, ∀ el,
    E.spec.element? x.element = some el → HumanMustEnter el →
      x ∈ (pending E.opened).captured ∧ x.byHuman = true ∧ x.confirmed = true) ∧
  EpisodeEveryStep E fun s e s' => ∀ x ∈ s'.captured, x ∉ s.captured →
    ∀ el, E.spec.element? x.element = some el → HumanMustEnter el → ∃ cid v, e = .enter cid v

/-- New specification for owner review: property 5's commit/acknowledgment
clause per episode. The acknowledgment-change clause is the original one:
inside an episode the list changes only by an `ack` event. -/
def EpisodeOnlyHumanCommitsAndAcks (E : BoundEpisode) : Prop :=
  EpisodeEveryStep E fun s e s' =>
    (∀ c, Commits s s' c → ∃ cid, e = .click cid ∧
      ∃ comp ∈ E.prog.compsOf s.screen, comp.id = cid ∧ comp.kind = .button (.commit c)) ∧
    (s'.acked ≠ s.acked → ∃ a, e = .ack a)

/-- New specification for owner review: property 5's cosign clause per episode. -/
def EpisodeCosignIsSecondUser (E : BoundEpisode) : Prop :=
  EpisodeEveryStep E fun s _ s' => ∀ c, Commits s s' c →
    ∀ rq ∈ E.spec.entries, rq.commit = c → ∀ el, E.spec.element? rq.element = some el →
      el.kind = .cosign → Applies E.toEpisode s rq.when → ¬ rq.perOrderLine →
        ∃ x ∈ s.captured, x.element = el.id ∧ x.byHuman = true ∧
          ∃ u, x.value = .user u ∧ u ≠ E.user.id

/-- New specification for owner review: property 7's commit clause per episode. -/
def EpisodeCommitUnitsRight (E : BoundEpisode) : Prop :=
  EpisodeEveryStep E fun s _ s' => ∀ c, Commits s s' c →
    ∀ rq ∈ E.spec.entries, rq.commit = c → ∀ el u, E.spec.element? rq.element = some el →
      el.kind = .quantity u → Applies E.toEpisode s rq.when → ¬ rq.perOrderLine →
        ∃ x ∈ s.captured, x.element = el.id ∧ x.confirmed = true ∧ ∃ t, x.value = .qty t u

/-- New specification for owner review: property 9's commit clause per episode. -/
def EpisodeInterruptiveHandled (E : BoundEpisode) : Prop :=
  EpisodeEveryStep E fun s _ s' => ∀ c, Commits s s' c →
    ∀ al ∈ E.spec.alerts, al.commit = c → al.tier = .interruptive →
      ∀ k ∈ alertKeys E.facts s al.cond, (al.id, k) ∈ s.acked

/-- New specification for owner review: property 9's passive-inline clause
per episode. The unselected landing view is in no episode. -/
def EpisodePassiveShownInline (E : BoundEpisode) : Prop :=
  EpisodeAlways E fun s => ∀ al ∈ E.spec.alerts, al.tier = .passive →
    (E.prog.screen? s.screen).any al.targetsScreen = true →
    alertHolds E.spec E.facts s al.id = true → AlertShownInline E.toEpisode s al.id

/-- New specification for owner review: property 10 per episode. -/
def EpisodeAlertsOnlyWhenTrue (E : BoundEpisode) : Prop :=
  EpisodeAlways E fun s =>
    (∀ a k, s.popup? = some (a, k) →
      ∃ al ∈ E.spec.alerts, al.id = a ∧ k ∈ alertKeys E.facts s al.cond) ∧
    (∀ a, AlertShownInline E.toEpisode s a → alertHolds E.spec E.facts s a = true)

/-- New specification for owner review: property 11 per episode.
Acknowledgments persist until the clinician leaves the chart. -/
def EpisodeInterruptsOnce (E : BoundEpisode) : Prop :=
  EpisodeEveryStep E (fun s _ s' =>
    (∀ p ∈ s.acked, p ∈ s'.acked) ∧
    (∀ p, s.popup? = some p → s'.popup? = some p ∨ p ∈ s'.acked)) ∧
  EpisodeAlways E fun s => ∀ p, s.popup? = some p → p ∉ s.acked

variable (E : BoundEpisode)

/-- New specification for owner review: property 1 per episode. -/
theorem episode_landmarksShown (h : E.Hydrates → LandmarksShownFrom E.toEpisode E.start) :
    EpisodeLandmarksShown E :=
  episode_always E (fun s hs => by simpa only [forgetCritical, infoShownIn_critical] using hs) h

/-- New specification for owner review: property 2's commit clause per episode. -/
theorem episode_commitCapturesAll (h : E.Hydrates → CommitCapturesAllFrom E.toEpisode E.start) :
    EpisodeCommitCapturesAll E :=
  episode_everyStep E
    (fun s e s' hq => by
      simpa only [forgetCritical, Commits, withCritical_commits, entryMetIn_critical] using hq)
    (fun _ _ _ hc => absurd hc.2 hc.1) (fun hyd s hs e => h hyd s hs .human e)

/-- New specification for owner review: property 2's retention clause per episode. -/
theorem episode_enteredOnce (h : E.Hydrates → EnteredOnceFrom E.toEpisode E.start) :
    EpisodeEnteredOnce E :=
  episode_everyStep E
    (fun s e s' hq => by
      simpa only [forgetCritical, clickedMacro_critical, withCritical_popup,
        withCritical_captured] using hq)
    (fun _ _ _ _ _ hx _ => hx) (fun hyd s hs e hn hm => h hyd s hs .human e hn (fun _ => hm))

/-- New specification for owner review: property 3 per episode. -/
theorem episode_writesAllowed (h : E.Hydrates → WritesAllowedFrom E.toEpisode E.start) :
    EpisodeWritesAllowed E :=
  episode_always E (fun _ hs => hs) h

/-- New specification for owner review: property 4's commit clause per episode. -/
theorem episode_commitReviewsMet (h : E.Hydrates → CommitReviewsMetFrom E.toEpisode E.start) :
    EpisodeCommitReviewsMet E :=
  episode_everyStep E
    (fun s e s' hq => by
      simpa only [forgetCritical, Commits, withCritical_commits, reviewMetIn_critical] using hq)
    (fun _ _ _ hc => absurd hc.2 hc.1) (fun hyd s hs e => h hyd s hs .human e)

/-- New specification for owner review: property 4's commit-screen clause per episode. -/
theorem episode_commitScreenShowsReviews
    (h : E.Hydrates → CommitScreenShowsReviewsFrom E.toEpisode E.start) :
    EpisodeCommitScreenShowsReviews E :=
  episode_always E (fun s hs => by
    simpa only [forgetCritical, commitButtonShown_critical, reviewMetIn_critical] using hs) h

/-- New specification for owner review: property 5's human-entry clause per
episode, from the restored-draft clause for the hydrated chart and the
per-step clause of core runs from it. -/
theorem episode_humanStepsByHuman
    (hstart : E.Hydrates → ∀ x ∈ E.start.captured, ∀ el,
      E.spec.element? x.element = some el → HumanMustEnter el →
        x ∈ (pending E.opened).captured ∧ x.byHuman = true ∧ x.confirmed = true)
    (h : E.Hydrates → HumanEntriesFrom E.toEpisode E.start) :
    EpisodeHumanStepsByHuman E :=
  ⟨hstart, episode_everyStep E (fun _ _ _ hq => hq)
    (fun _ _ _ hx hn => absurd hx hn)
    (fun hyd s hs e x hx hn el hel hm => (h hyd s hs .human e x hx hn el hel hm).2)⟩

/-- New specification for owner review: property 5's commit/acknowledgment clause per episode. -/
theorem episode_onlyHumanCommitsAndAcks
    (h : E.Hydrates → OnlyHumanCommitsAndAcksFrom E.toEpisode E.start) :
    EpisodeOnlyHumanCommitsAndAcks E :=
  episode_everyStep E (fun _ _ _ hq => hq)
    (fun _ _ => ⟨fun _ hc => absurd hc.2 hc.1, fun hn => absurd rfl hn⟩)
    (fun hyd s hs e =>
      ⟨fun c hc => ((h hyd s hs .human e).1 c hc).2, fun ha => ((h hyd s hs .human e).2 ha).2⟩)

/-- New specification for owner review: property 5's cosign clause per episode. -/
theorem episode_cosignIsSecondUser (h : E.Hydrates → CosignIsSecondUserFrom E.toEpisode E.start) :
    EpisodeCosignIsSecondUser E :=
  episode_everyStep E
    (fun s e s' hq => by
      simpa only [forgetCritical, Commits, withCritical_commits, applies_critical,
        withCritical_captured] using hq)
    (fun _ _ _ hc => absurd hc.2 hc.1) (fun hyd s hs e => h hyd s hs .human e)

/-- New specification for owner review: property 7's commit clause per episode. -/
theorem episode_commitUnitsRight (h : E.Hydrates → CommitUnitsRightFrom E.toEpisode E.start) :
    EpisodeCommitUnitsRight E :=
  episode_everyStep E
    (fun s e s' hq => by
      simpa only [forgetCritical, Commits, withCritical_commits, applies_critical,
        withCritical_captured] using hq)
    (fun _ _ _ hc => absurd hc.2 hc.1) (fun hyd s hs e => h hyd s hs .human e)

/-- New specification for owner review: property 9's commit clause per episode. -/
theorem episode_interruptiveHandled (h : E.Hydrates → InterruptiveHandledFrom E.toEpisode E.start) :
    EpisodeInterruptiveHandled E :=
  episode_everyStep E
    (fun s e s' hq => by
      simpa only [forgetCritical, Commits, withCritical_commits, alertKeys_critical,
        withCritical_acked] using hq)
    (fun _ _ _ hc => absurd hc.2 hc.1) (fun hyd s hs e => h hyd s hs .human e)

/-- New specification for owner review: property 9's passive-inline clause per episode. -/
theorem episode_passiveShownInline (h : E.Hydrates → PassiveShownInlineFrom E.toEpisode E.start) :
    EpisodePassiveShownInline E :=
  episode_always E (fun s hs => by
    simpa only [forgetCritical, withCritical_screen, alertHolds_critical,
      alertShownInline_critical] using hs) h

/-- New specification for owner review: property 10 per episode. -/
theorem episode_alertsOnlyWhenTrue (h : E.Hydrates → AlertsOnlyWhenTrueFrom E.toEpisode E.start) :
    EpisodeAlertsOnlyWhenTrue E :=
  episode_always E (fun s hs => by
    simpa only [forgetCritical, withCritical_popup, alertKeys_critical, alertHolds_critical,
      alertShownInline_critical] using hs) h

/-- New specification for owner review: property 11 per episode. -/
theorem episode_interruptsOnce (h : E.Hydrates → InterruptsOnceFrom E.toEpisode E.start) :
    EpisodeInterruptsOnce E :=
  ⟨episode_everyStep E (fun _ _ _ hq => hq)
    (fun _ _ => ⟨fun _ hp => hp, fun _ hp => Or.inl hp⟩) (fun hyd s hs e => (h hyd).1 s hs .human e),
   episode_always E (fun _ hs => hs) (fun hyd => (h hyd).2)⟩

#print axioms episode_landmarksShown
#print axioms episode_commitCapturesAll
#print axioms episode_enteredOnce
#print axioms episode_writesAllowed
#print axioms episode_commitReviewsMet
#print axioms episode_commitScreenShowsReviews
#print axioms episode_humanStepsByHuman
#print axioms episode_onlyHumanCommitsAndAcks
#print axioms episode_cosignIsSecondUser
#print axioms episode_commitUnitsRight
#print axioms episode_interruptiveHandled
#print axioms episode_passiveShownInline
#print axioms episode_alertsOnlyWhenTrue
#print axioms episode_interruptsOnce
end Ehr.Runtime
