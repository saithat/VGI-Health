import Ehr.Props.Properties

/-! Core runs from an arbitrary start state. `Props.Reachable` starts at
`init`. A hydrated patient chart starts elsewhere: `Workspace.bind` goes
straight to the selected clinical screen. `ReachableFrom ep s₀` is the same
transition system (any actor, any event, waiting) started at `s₀`.

Each `…From` definition repeats the body of the `Props` definition of the same
name with `ReachableFrom ep s₀` for `Props.Reachable ep`. Each `…_start`
theorem shows that at `s₀ = ep.start` the two definitions are equivalent; the
proof is the reachability equivalence alone, so the kernel checks that the
bodies agree. Every definition and theorem here is a new specification for
owner review, outside Comparator. -/

namespace Ehr.Runtime
open Ehr Props

/-- New specification for owner review: the states the core interpreter
reaches from `s₀`, by any event from the human or from a macro, or by time
passing. `Props.Reachable ep` is the case `s₀ = ep.start`. -/
inductive ReachableFrom (ep : Episode) (s₀ : State) : State → Prop
  | start : ReachableFrom ep s₀ s₀
  | step {s : State} (actor : Actor) (e : Event) :
      ReachableFrom ep s₀ s → ReachableFrom ep s₀ (ep.next actor s e)
  | wait {s : State} (d : Nat) :
      ReachableFrom ep s₀ s → ReachableFrom ep s₀ { s with clock := s.clock + d }

/-- New specification for owner review: core runs from the core start are
exactly the core reachable states. -/
theorem reachableFrom_start (ep : Episode) (s : State) :
    ReachableFrom ep ep.start s ↔ Props.Reachable ep s := by
  constructor
  · intro h
    induction h with
    | start => exact .start
    | step actor e _ ih => exact .step actor e ih
    | wait d _ ih => exact .wait d ih
  · intro h
    induction h with
    | start => exact .start
    | step actor e _ ih => exact .step actor e ih
    | wait d _ ih => exact .wait d ih

/-- New specification for owner review: `Props.Always` for runs from `s₀`. -/
def AlwaysFrom (ep : Episode) (s₀ : State) (P : State → Prop) : Prop :=
  ∀ s, ReachableFrom ep s₀ s → P s

/-- New specification for owner review: `Props.EveryStep` for runs from `s₀`. -/
def EveryStepFrom (ep : Episode) (s₀ : State) (P : State → Actor → Event → Prop) : Prop :=
  ∀ s, ReachableFrom ep s₀ s → ∀ actor e, P s actor e

/-- New specification for owner review: at the core start, `AlwaysFrom` is `Props.Always`. -/
theorem alwaysFrom_start {ep : Episode} {P : State → Prop} :
    AlwaysFrom ep ep.start P ↔ Always ep P :=
  ⟨fun h s hs => h s ((reachableFrom_start ep s).mpr hs),
   fun h s hs => h s ((reachableFrom_start ep s).mp hs)⟩

/-- New specification for owner review: at the core start, `EveryStepFrom` is `Props.EveryStep`. -/
theorem everyStepFrom_start {ep : Episode} {P : State → Actor → Event → Prop} :
    EveryStepFrom ep ep.start P ↔ EveryStep ep P :=
  ⟨fun h s hs => h s ((reachableFrom_start ep s).mpr hs),
   fun h s hs => h s ((reachableFrom_start ep s).mp hs)⟩

/-- New specification for owner review: `Props.LandmarksShown` from `s₀` (property 1). -/
def LandmarksShownFrom (ep : Episode) (s₀ : State) : Prop :=
  AlwaysFrom ep s₀ fun s => ∀ l ∈ ep.spec.design.landmarks, InfoShown ep s l

/-- New specification for owner review: `Props.CommitCapturesAll` from `s₀` (property 2). -/
def CommitCapturesAllFrom (ep : Episode) (s₀ : State) : Prop :=
  EveryStepFrom ep s₀ fun s actor e => ∀ c, CommitHappens ep s actor e c →
    ∀ rq ∈ ep.spec.entries, rq.commit = c → EntryMetIn ep s rq

/-- New specification for owner review: `Props.EnteredOnce` from `s₀` (property 2). -/
def EnteredOnceFrom (ep : Episode) (s₀ : State) : Prop :=
  EveryStepFrom ep s₀ fun s actor e =>
    (∀ cid v, e ≠ .enter cid v) →
    (actor = .human → ∀ cid, e = .click cid →
      clickedMacro? ep.spec ep.prog ep.facts s cid = none ∨ s.popup?.isSome) →
    ∀ x ∈ s.captured, x.confirmed = true → x ∈ (ep.next actor s e).captured

/-- New specification for owner review: `Props.WritesAllowed` from `s₀` (property 3). -/
def WritesAllowedFrom (ep : Episode) (s₀ : State) : Prop :=
  AlwaysFrom ep s₀ fun s =>
    (∀ x ∈ s.captured, ∃ el, ep.spec.element? x.element = some el ∧ ep.user.role ∈ el.enteredBy) ∧
    (∀ c ∈ s.commits, ∃ cs, ep.spec.commit? c = some cs ∧ ep.user.role ∈ cs.roles) ∧
    (∀ r ∈ s.receipts, r ∈ ep.facts.receipts ∨ (ep.spec.info? r.info).isSome)

/-- New specification for owner review: `Props.CommitReviewsMet` from `s₀` (property 4). -/
def CommitReviewsMetFrom (ep : Episode) (s₀ : State) : Prop :=
  EveryStepFrom ep s₀ fun s actor e => ∀ c, CommitHappens ep s actor e c →
    ∀ rq ∈ ep.spec.reviews, rq.commit = c → ReviewMetIn ep s rq

/-- New specification for owner review: `Props.CommitScreenShowsReviews` from `s₀` (property 4). -/
def CommitScreenShowsReviewsFrom (ep : Episode) (s₀ : State) : Prop :=
  AlwaysFrom ep s₀ fun s => ∀ c, CommitButtonShown ep s c →
    ∀ rq ∈ ep.spec.reviews, rq.commit = c → rq.waivedBy? = none → ReviewMetIn ep s rq

/-- New specification for owner review: `Props.HumanStepsByHuman` from `s₀`
(property 5). The first clause is about the captures already present at `s₀`. -/
def HumanStepsByHumanFrom (ep : Episode) (s₀ : State) : Prop :=
  (∀ x ∈ s₀.captured, ∀ el, ep.spec.element? x.element = some el → ¬ HumanMustEnter el) ∧
  EveryStepFrom ep s₀ fun s actor e => ∀ x ∈ (ep.next actor s e).captured, x ∉ s.captured →
    ∀ el, ep.spec.element? x.element = some el → HumanMustEnter el →
      actor = .human ∧ ∃ cid v, e = .enter cid v

/-- New specification for owner review: `Props.OnlyHumanCommitsAndAcks` from `s₀` (property 5). -/
def OnlyHumanCommitsAndAcksFrom (ep : Episode) (s₀ : State) : Prop :=
  EveryStepFrom ep s₀ fun s actor e =>
    (∀ c, CommitHappens ep s actor e c →
      actor = .human ∧ ∃ cid, e = .click cid ∧
        ∃ comp ∈ ep.prog.compsOf s.screen, comp.id = cid ∧ comp.kind = .button (.commit c)) ∧
    ((ep.next actor s e).acked ≠ s.acked → actor = .human ∧ ∃ a, e = .ack a)

/-- New specification for owner review: `Props.CosignIsSecondUser` from `s₀` (property 5). -/
def CosignIsSecondUserFrom (ep : Episode) (s₀ : State) : Prop :=
  EveryStepFrom ep s₀ fun s actor e => ∀ c, CommitHappens ep s actor e c →
    ∀ rq ∈ ep.spec.entries, rq.commit = c → ∀ el, ep.spec.element? rq.element = some el →
      el.kind = .cosign → Applies ep s rq.when → ¬ rq.perOrderLine →
        ∃ x ∈ s.captured, x.element = el.id ∧ x.byHuman = true ∧
          ∃ u, x.value = .user u ∧ u ≠ ep.user.id

/-- New specification for owner review: `Props.CommitUnitsRight` from `s₀` (property 7). -/
def CommitUnitsRightFrom (ep : Episode) (s₀ : State) : Prop :=
  EveryStepFrom ep s₀ fun s actor e => ∀ c, CommitHappens ep s actor e c →
    ∀ rq ∈ ep.spec.entries, rq.commit = c → ∀ el u, ep.spec.element? rq.element = some el →
      el.kind = .quantity u → Applies ep s rq.when → ¬ rq.perOrderLine →
        ∃ x ∈ s.captured, x.element = el.id ∧ x.confirmed = true ∧ ∃ t, x.value = .qty t u

/-- New specification for owner review: `Props.InterruptiveHandled` from `s₀` (property 9). -/
def InterruptiveHandledFrom (ep : Episode) (s₀ : State) : Prop :=
  EveryStepFrom ep s₀ fun s actor e => ∀ c, CommitHappens ep s actor e c →
    ∀ al ∈ ep.spec.alerts, al.commit = c → al.tier = .interruptive →
      ∀ k ∈ alertKeys ep.facts s al.cond, (al.id, k) ∈ s.acked

/-- New specification for owner review: `Props.PassiveShownInline` from `s₀` (property 9). -/
def PassiveShownInlineFrom (ep : Episode) (s₀ : State) : Prop :=
  AlwaysFrom ep s₀ fun s => ∀ al ∈ ep.spec.alerts, al.tier = .passive →
    (ep.prog.screen? s.screen).any al.targetsScreen = true →
    alertHolds ep.spec ep.facts s al.id = true → AlertShownInline ep s al.id

/-- New specification for owner review: `Props.AlertsOnlyWhenTrue` from `s₀` (property 10). -/
def AlertsOnlyWhenTrueFrom (ep : Episode) (s₀ : State) : Prop :=
  AlwaysFrom ep s₀ fun s =>
    (∀ a k, s.popup? = some (a, k) →
      ∃ al ∈ ep.spec.alerts, al.id = a ∧ k ∈ alertKeys ep.facts s al.cond) ∧
    (∀ a, AlertShownInline ep s a → alertHolds ep.spec ep.facts s a = true)

/-- New specification for owner review: `Props.InterruptsOnce` from `s₀` (property 11). -/
def InterruptsOnceFrom (ep : Episode) (s₀ : State) : Prop :=
  EveryStepFrom ep s₀ (fun s actor e =>
    (∀ p ∈ s.acked, p ∈ (ep.next actor s e).acked) ∧
    (∀ p, s.popup? = some p → (ep.next actor s e).popup? = some p ∨ p ∈ (ep.next actor s e).acked)) ∧
  AlwaysFrom ep s₀ fun s => ∀ p, s.popup? = some p → p ∉ s.acked

section Agreement
variable (ep : Episode)

/-- New specification for owner review: at the core start this is `Props.LandmarksShown`. -/
theorem landmarksShownFrom_start : LandmarksShownFrom ep ep.start ↔ LandmarksShown ep :=
  alwaysFrom_start
/-- New specification for owner review: at the core start this is `Props.CommitCapturesAll`. -/
theorem commitCapturesAllFrom_start : CommitCapturesAllFrom ep ep.start ↔ CommitCapturesAll ep :=
  everyStepFrom_start
/-- New specification for owner review: at the core start this is `Props.EnteredOnce`. -/
theorem enteredOnceFrom_start : EnteredOnceFrom ep ep.start ↔ EnteredOnce ep :=
  everyStepFrom_start
/-- New specification for owner review: at the core start this is `Props.WritesAllowed`. -/
theorem writesAllowedFrom_start : WritesAllowedFrom ep ep.start ↔ WritesAllowed ep :=
  alwaysFrom_start
/-- New specification for owner review: at the core start this is `Props.CommitReviewsMet`. -/
theorem commitReviewsMetFrom_start : CommitReviewsMetFrom ep ep.start ↔ CommitReviewsMet ep :=
  everyStepFrom_start
/-- New specification for owner review: at the core start this is `Props.CommitScreenShowsReviews`. -/
theorem commitScreenShowsReviewsFrom_start :
    CommitScreenShowsReviewsFrom ep ep.start ↔ CommitScreenShowsReviews ep := alwaysFrom_start
/-- New specification for owner review: at the core start this is `Props.HumanStepsByHuman`. -/
theorem humanStepsByHumanFrom_start : HumanStepsByHumanFrom ep ep.start ↔ HumanStepsByHuman ep :=
  and_congr Iff.rfl everyStepFrom_start
/-- New specification for owner review: at the core start this is `Props.OnlyHumanCommitsAndAcks`. -/
theorem onlyHumanCommitsAndAcksFrom_start :
    OnlyHumanCommitsAndAcksFrom ep ep.start ↔ OnlyHumanCommitsAndAcks ep := everyStepFrom_start
/-- New specification for owner review: at the core start this is `Props.CosignIsSecondUser`. -/
theorem cosignIsSecondUserFrom_start : CosignIsSecondUserFrom ep ep.start ↔ CosignIsSecondUser ep :=
  everyStepFrom_start
/-- New specification for owner review: at the core start this is `Props.CommitUnitsRight`. -/
theorem commitUnitsRightFrom_start : CommitUnitsRightFrom ep ep.start ↔ CommitUnitsRight ep :=
  everyStepFrom_start
/-- New specification for owner review: at the core start this is `Props.InterruptiveHandled`. -/
theorem interruptiveHandledFrom_start : InterruptiveHandledFrom ep ep.start ↔ InterruptiveHandled ep :=
  everyStepFrom_start
/-- New specification for owner review: at the core start this is `Props.PassiveShownInline`. -/
theorem passiveShownInlineFrom_start : PassiveShownInlineFrom ep ep.start ↔ PassiveShownInline ep :=
  alwaysFrom_start
/-- New specification for owner review: at the core start this is `Props.AlertsOnlyWhenTrue`. -/
theorem alertsOnlyWhenTrueFrom_start : AlertsOnlyWhenTrueFrom ep ep.start ↔ AlertsOnlyWhenTrue ep :=
  alwaysFrom_start
/-- New specification for owner review: at the core start this is `Props.InterruptsOnce`. -/
theorem interruptsOnceFrom_start : InterruptsOnceFrom ep ep.start ↔ InterruptsOnce ep :=
  and_congr everyStepFrom_start alwaysFrom_start

end Agreement

#print axioms reachableFrom_start
#print axioms alwaysFrom_start
#print axioms everyStepFrom_start
#print axioms landmarksShownFrom_start
#print axioms commitCapturesAllFrom_start
#print axioms enteredOnceFrom_start
#print axioms writesAllowedFrom_start
#print axioms commitReviewsMetFrom_start
#print axioms commitScreenShowsReviewsFrom_start
#print axioms humanStepsByHumanFrom_start
#print axioms onlyHumanCommitsAndAcksFrom_start
#print axioms cosignIsSecondUserFrom_start
#print axioms commitUnitsRightFrom_start
#print axioms interruptiveHandledFrom_start
#print axioms passiveShownInlineFrom_start
#print axioms alertsOnlyWhenTrueFrom_start
#print axioms interruptsOnceFrom_start
end Ehr.Runtime
