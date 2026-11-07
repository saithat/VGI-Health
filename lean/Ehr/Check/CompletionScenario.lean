import Ehr.Check.CompletionSearch
import Ehr.Sim.MinClicks

/-!
Exact fixed-record, fixed-clock scenario checking through the public step
semantics. History erasure is proved sound for the permitted moves. A finite
alphabet restricts entries to its explicit values; the planning spaces restrict
them further. Neither is a proved abstraction of arbitrary clinical data.
-/
namespace Ehr.Check.CompletionModel
open Ehr Ehr.Sim Ehr.Sim.Certificate

structure Moves (ctx : Context) where
  events : State → List Event
  history : ∀ s h, events (withHistory s h) = events s
  safe : ∀ s e, e ∈ events s → safeEvent ctx s e = true

/-- Use an existing, explicitly named minimum-click planning space. -/
def planningMoves (ctx : Context) (space : SearchSpace) : Moves ctx :=
  ⟨searchMoves ctx space, searchMoves_history ctx space, searchMoves_safe ctx space⟩

/-- All interleavings of this finite event alphabet, including blocked and
ignored events. Back and macros that can invoke Back are excluded explicitly. -/
def alphabetMoves (ctx : Context) (alphabet : List Event) : Moves ctx where
  events := fun s => alphabet.filter (safeEvent ctx s)
  history := by
    intro s h
    change alphabet.filter (fun e => safeEvent ctx (withHistory s h) e) = _
    simp only [safeEvent_history]
  safe := by intros s e he; exact (List.mem_filter.mp he).2

def scenarioReal (ctx : Context) (moves : Moves ctx) : Graph State Event :=
  { next := ctx.next, moves := moves.events, goal := ctx.done,
    weight := fun _ _ => 1, hash := stateHash }

def scenarioGraph (ctx : Context) (moves : Moves ctx) : Graph State Event :=
  { next := fun s e => forgetHistory (ctx.next (forgetHistory s) e),
    moves := fun s => moves.events (forgetHistory s), goal := ctx.done,
    weight := fun _ _ => 1, hash := stateHash }

theorem scenario_next (ctx : Context) (moves : Moves ctx) (s : State) (e : Event)
    (he : e ∈ (scenarioReal ctx moves).moves s) :
    (scenarioGraph ctx moves).next (forgetHistory s) e =
      forgetHistory ((scenarioReal ctx moves).next s e) := by
  have hh := congrArg Prod.fst (step_history ctx s e [] (moves.safe s e he))
  simpa only [scenarioGraph, scenarioReal, Context.next, forgetOutput,
    forgetHistory, withHistory_twice] using hh

theorem scenario_map (ctx : Context) (moves : Moves ctx) {s es t n}
    (run : Run (scenarioReal ctx moves) s es t n) :
    Run (scenarioGraph ctx moves) (forgetHistory s) es (forgetHistory t) n :=
  map_run forgetHistory (by intro s e he; simpa only [scenarioReal, scenarioGraph, forgetHistory, moves.history] using he)
    (scenario_next ctx moves) (by intros; rfl) run

theorem scenario_lift (ctx : Context) (moves : Moves ctx) (es : List Event) :
    ∀ s t n, Run (scenarioGraph ctx moves) (forgetHistory s) es t n →
      ∃ u, Run (scenarioReal ctx moves) s es u n ∧ forgetHistory u = t :=
  lift_run forgetHistory (by intro s e he; simpa only [scenarioReal, scenarioGraph, forgetHistory, moves.history] using he)
    (scenario_next ctx moves) (by intros; rfl) es

theorem scenario_replays (ctx : Context) (moves : Moves ctx) {s es t n}
    (run : Run (scenarioReal ctx moves) s es t n) :
    runAll ctx.sp ctx.prog ctx.facts ctx.user .human s es = t := by
  induction run with
  | nil => rfl
  | cons _ _ ih => exact ih

/-- NEW, scenario-relative result for owner review: every reachable state in
the declared move space has a completing *real interpreter* continuation.
Time is fixed; facts/user/goals are fixed; only history is abstracted.
This theorem does not assert `Props.Completable` or arbitrary-value coverage. -/
theorem accepted_scenario (ctx : Context) (moves : Moves ctx) {start v}
    (h : accept (scenarioGraph ctx moves) (forgetHistory start) v = true)
    {es s n} (reach : Run (scenarioReal ctx moves) start es s n) :
    ∃ repair t cost, Run (scenarioReal ctx moves) s repair t cost ∧
      ctx.done (runAll ctx.sp ctx.prog ctx.facts ctx.user .human s repair) = true := by
  obtain ⟨repair, t, cost, run, goal⟩ := accepted_AG_EF h (scenario_map ctx moves reach)
  obtain ⟨u, path, same⟩ := scenario_lift ctx moves repair s t cost run
  refine ⟨repair, u, cost, path, ?_⟩
  rw [scenario_replays ctx moves path]
  rw [← same] at goal
  simpa only [scenarioGraph, forgetHistory, done_history] using goal

/-- A reported trap prefix also replays in the real interpreter. No allowed
scenario continuation from its final state completes the task. -/
theorem rejected_scenario (ctx : Context) (moves : Moves ctx) {start stem bad}
    (h : reject (scenarioGraph ctx moves) (forgetHistory start) stem bad = true) :
    ∃ s n, Run (scenarioReal ctx moves) start stem s n ∧
      ∀ es t cost, Run (scenarioReal ctx moves) s es t cost → ctx.done t = false := by
  obtain ⟨s, n, path, trapped⟩ := rejected_trap h
  obtain ⟨u, run, same⟩ := scenario_lift ctx moves stem start s n path
  refine ⟨u, n, run, ?_⟩
  intro es t cost continuation
  have mapped := scenario_map ctx moves continuation
  rw [same] at mapped
  have ng := trapped _ _ _ mapped
  simpa only [scenarioGraph, forgetHistory, done_history] using ng

#print axioms accepted_scenario
#print axioms rejected_scenario
end Ehr.Check.CompletionModel
