import Ehr.Check.Check

/-! Counterexample navigation is validated by the public interpreter. The
last click may be blocked: it is included to display the hard stop. -/
namespace Ehr.Check
open Ehr Ehr.Props

/-- A sequence of human events, each accepted by the real interpreter. -/
inductive OkRun (sp : Spec) (p : Program) (f : Facts) (u : User) :
    State → List Event → State → Prop
  | nil (s) : OkRun sp p f u s [] s
  | cons {s t z e es} : step sp p f u .human s e = (t, .ok) →
      OkRun sp p f u t es z → OkRun sp p f u s (e :: es) z

theorem OkRun.append {sp p f u s t z xs ys}
    (h : OkRun sp p f u s xs t) (h' : OkRun sp p f u t ys z) :
    OkRun sp p f u s (xs ++ ys) z := by
  induction h with
  | nil => exact h'
  | cons he _ ih => exact .cons he (ih h')

/-- Replaying never invents an accepted event, even when it cuts a path. -/
theorem replayOk_sound (sp p f u) (es : List Event) (s : State) :
    OkRun sp p f u s (replayOk sp p f u s es).1 (replayOk sp p f u s es).2.1 := by
  induction es generalizing s with
  | nil => exact .nil s
  | cons e es ih =>
    unfold replayOk
    split
    · rename_i t he
      exact .cons he (ih t)
    · exact .nil s

/-- Every navigation/reveal event returned by the graph search succeeds. -/
theorem followHops_sound (sp p f u) (hops : List Hop) (s : State) :
    OkRun sp p f u s (followHops sp p f u s hops).1
      (followHops sp p f u s hops).2.2.1 := by
  induction hops generalizing s with
  | nil => exact .nil s
  | cons hop hops ih =>
    simp only [followHops]
    generalize hr : replayOk sp p f u s (revealAndClick s p hop.1) = result
    obtain ⟨es, t, ok⟩ := result
    have hok := replayOk_sound sp p f u (revealAndClick s p hop.1) s
    rw [hr] at hok
    split
    · simpa only [] using hok.append (ih t)
    · exact hok

/-- All events before an optional final click were accepted. The final click
is evaluated by `step` too; it may intentionally show a blocked commit. -/
def ValidCounterexample (sp : Spec) (p : Program) (es : List Event) : Prop :=
  ∃ pre s tail, es = pre ++ tail ∧
    OkRun sp p replayFacts (replayUser p) (init sp p replayFacts (replayUser p)) pre s ∧
    (tail = [] ∨ ∃ cid, tail = [.click cid])

/-- **T7 (replay).** The checker only emits successfully replayed navigation,
followed by at most one triggering click. This includes cut paths. -/
theorem T7_counterexample_replays (sp : Spec) (p : Program) (finding : Finding) :
    ValidCounterexample sp p (counterexample sp p finding).1 := by
  unfold counterexample
  try dsimp only
  split
  · exact ⟨[], _, [], rfl, .nil _, Or.inl rfl⟩
  · try dsimp only
    split
    · exact ⟨[], _, [], rfl, .nil _, Or.inl rfl⟩
    · try dsimp only
      split
      · exact ⟨_, _, [], by simp only [List.append_nil]; rfl, followHops_sound sp p _ _ _ _, Or.inl rfl⟩
      · split
        · exact ⟨_, _, [], by simp only [List.append_nil]; rfl, followHops_sound sp p _ _ _ _, Or.inl rfl⟩
        · split
          · exact ⟨_, _, _, rfl,
              (followHops_sound sp p _ _ _ _).append (replayOk_sound sp p _ _ _ _),
              Or.inr ⟨_, rfl⟩⟩
          · exact ⟨_, _, [], by simp only [List.append_nil]; rfl,
              (followHops_sound sp p _ _ _ _).append (replayOk_sound sp p _ _ _ _),
              Or.inl rfl⟩

/-- Accepted events lead to the same final state as `runAll`. -/
theorem OkRun.runAll_eq {sp p f u s es t} (h : OkRun sp p f u s es t) :
    runAll sp p f u .human s es = t := by
  induction h with
  | nil => rfl
  | cons he _ ih => simpa [runAll, List.foldl_cons, he] using ih

/-- Every returned prefix leads to a genuinely reachable interpreter state. -/
theorem OkRun.reachable {ep : Episode} {s es t}
    (h : OkRun ep.spec ep.prog ep.facts ep.user s es t) (hs : Reachable ep s) :
    Reachable ep t := by
  induction h with
  | nil => exact hs
  | @cons s t z e es he _ ih =>
    apply ih
    have ht := Reachable.step .human e hs
    simpa [Episode.next, he] using ht

#print axioms replayOk_sound
#print axioms followHops_sound
#print axioms T7_counterexample_replays
#print axioms OkRun.reachable
end Ehr.Check
