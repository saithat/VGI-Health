import Ehr.Sim.MinClicks

/-!
Joint task search. UI edges call Ehr.step; zero-cost reset edges are permitted
only when the current episode is complete. Receipts carry into the next episode,
while captures, commits, popups and acknowledgments reset through Ehr.init.
Search retains fixed time, as for single-episode minimums. Only history is
forgotten; the same equivalence is proved for both UI and reset edges.
-/
namespace Ehr.Sim
open Ehr

structure TaskState where
  index : Nat
  state : State
  episodeReceipts : List Receipt
  deriving DecidableEq, Inhabited

abbrev TaskEvent := Option Event

def taskNorm (s : TaskState) : TaskState := { s with state := forgetHistory s.state }
@[simp] theorem taskNorm_twice (s) : taskNorm (taskNorm s) = taskNorm s := rfl
@[simp] theorem taskNorm_index (s) : (taskNorm s).index = s.index := rfl
@[simp] theorem taskNorm_state (s) : (taskNorm s).state = forgetHistory s.state := rfl

/-- The episode's initial receipt context is part of the exact search state. -/
def taskContext? (contexts : List Context) (s : TaskState) : Option Context :=
  contexts[s.index]?.map fun ctx =>
    { ctx with facts := { ctx.facts with receipts := s.episodeReceipts } }
@[simp] theorem taskContext_norm (contexts s) : taskContext? contexts (taskNorm s) = taskContext? contexts s := rfl

def taskInitial (contexts : List Context) : TaskState :=
  match contexts.head? with
  | none => default
  | some ctx => {
    index := 0, state := init ctx.sp ctx.prog ctx.facts ctx.user,
    episodeReceipts := ctx.facts.receipts }

/-- A none event is the environment's episode reset, never a clinician click. -/
def taskStep (contexts : List Context) (s : TaskState) : TaskEvent → TaskState
  | some e => match taskContext? contexts s with
    | none => s
    | some ctx => { s with state := ctx.next s.state e }
  | none => match contexts[s.index + 1]? with
    | none => s
    | some ctx =>
      let receipts := ctx.facts.receipts ++ s.state.receipts
      let facts := { ctx.facts with receipts }
      { index := s.index + 1, state := init ctx.sp ctx.prog facts ctx.user, episodeReceipts := receipts }

def taskDone (contexts : List Context) (s : TaskState) : Bool :=
  s.index + 1 == contexts.length && (taskContext? contexts s).any (fun ctx => ctx.done s.state)
@[simp] theorem taskDone_norm (contexts s) : taskDone contexts (taskNorm s) = taskDone contexts s := by
  simp only [taskDone, taskNorm_index, taskContext_norm, taskNorm_state, forgetHistory, done_history]

def taskMoves (contexts : List Context) (space : SearchSpace) (s : TaskState) : List TaskEvent :=
  let s := taskNorm s
  match taskContext? contexts s with
  | none => []
  | some ctx =>
    if ctx.done s.state then
      if s.index + 1 < contexts.length then [none] else []
    else (searchMoves ctx space s.state).map some
@[simp] theorem taskMoves_norm (contexts space s) : taskMoves contexts space (taskNorm s) = taskMoves contexts space s := by
  simp only [taskMoves, taskNorm_twice]
  rfl

def taskWeight (contexts : List Context) (obj : Objective) (s : TaskState) : TaskEvent → Nat
  | none => 0
  | some e => (taskContext? contexts s).map (fun ctx => eventWeight ctx obj s.state e) |>.getD 0
@[simp] theorem taskWeight_norm (contexts obj s e) : taskWeight contexts obj (taskNorm s) e = taskWeight contexts obj s e := by
  cases e <;> simp only [taskWeight, taskContext_norm, taskNorm_state, forgetHistory, weight_history]
  all_goals rfl

 theorem task_ui_safe (contexts space s e ctx)
    (hc : taskContext? contexts s = some ctx) (he : some e ∈ taskMoves contexts space s) :
    safeEvent ctx s.state e = true := by
  simp only [taskMoves, taskContext_norm, hc, taskNorm_state, forgetHistory, done_history,
    searchMoves_history, taskNorm_index] at he
  by_cases hd : ctx.done s.state = true
  · by_cases hn : s.index + 1 < contexts.length <;> simp [hd, hn] at he
  · simp only [hd, ite_false] at he
    have h : e ∈ searchMoves ctx space s.state := by simpa using he
    exact searchMoves_safe ctx space s.state e h

/-- A reset can occur only after completing the preceding clinical goals. -/
theorem task_reset_requires_goal (contexts space s)
    (h : none ∈ taskMoves contexts space s) :
    ∃ ctx, taskContext? contexts s = some ctx ∧ ctx.done s.state = true ∧ s.index + 1 < contexts.length := by
  simp only [taskMoves, taskContext_norm, taskNorm_state, taskNorm_index, forgetHistory, done_history] at h
  cases hc : taskContext? contexts s with
  | none => simp [hc] at h
  | some ctx =>
    simp only [hc] at h
    by_cases hd : ctx.done s.state = true
    · by_cases hn : s.index + 1 < contexts.length
      · exact ⟨ctx, rfl, hd, hn⟩
      · simp [hd, hn] at h
    · simp [hd] at h

 theorem taskStep_norm (contexts space s e) (he : e ∈ taskMoves contexts space s) :
    taskNorm (taskStep contexts (taskNorm s) e) = taskNorm (taskStep contexts s e) := by
  cases e with
  | none =>
    simp only [taskStep, taskNorm_index]
    split <;> rfl
  | some e =>
    simp only [taskStep, taskContext_norm]
    cases hc : taskContext? contexts s with
    | none => rfl
    | some ctx =>
      have hh := congrArg Prod.fst (step_history ctx s.state e [] (task_ui_safe contexts space s e ctx hc he))
      change { index := s.index, state := forgetHistory (ctx.next (forgetHistory s.state) e), episodeReceipts := s.episodeReceipts : TaskState } =
        { index := s.index, state := forgetHistory (ctx.next s.state e), episodeReceipts := s.episodeReceipts }
      exact congrArg (fun st => { index := s.index, state := st, episodeReceipts := s.episodeReceipts : TaskState }) hh

/-- The real task protocol: public Core UI transitions and guarded resets. -/
def realTaskGraph (contexts : List Context) (space : SearchSpace) (obj : Objective) : Certificate.Graph TaskState TaskEvent :=
  { next := taskStep contexts, moves := taskMoves contexts space, goal := taskDone contexts,
    weight := taskWeight contexts obj, hash := fun s => mix s.index (stateHash s.state) }

def taskGraph (contexts : List Context) (space : SearchSpace) (obj : Objective) : Certificate.Graph TaskState TaskEvent :=
  { next := fun s e => taskNorm (taskStep contexts (taskNorm s) e)
    moves := taskMoves contexts space, goal := taskDone contexts, weight := taskWeight contexts obj
    hash := fun s => mix s.index (mix (stateHash s.state) s.episodeReceipts.length) }

/-- The accepted path is a least-cost actual task run, including receipt effects
across episodes. Every reset in that run satisfies task_reset_requires_goal. -/
theorem T9_taskSearch (contexts space obj bound c)
    (h : Certificate.search (taskGraph contexts space obj) (taskNorm (taskInitial contexts)) bound = some c) :
    (∃ t, Certificate.Run (realTaskGraph contexts space obj) (taskInitial contexts) c.path t c.cost ∧ taskDone contexts t = true) ∧
    (∀ es t n, Certificate.Run (realTaskGraph contexts space obj) (taskInitial contexts) es t n → taskDone contexts t = true → c.cost ≤ n) := by
  have hm : ∀ s e, e ∈ (realTaskGraph contexts space obj).moves s ↔ e ∈ (taskGraph contexts space obj).moves (taskNorm s) := by
    intro s e; simp only [realTaskGraph, taskGraph, taskMoves_norm]
  have hn : ∀ s e, e ∈ (realTaskGraph contexts space obj).moves s →
      (taskGraph contexts space obj).next (taskNorm s) e = taskNorm ((realTaskGraph contexts space obj).next s e) := by
    intro s e he
    simp only [taskGraph, realTaskGraph, taskNorm_twice]
    exact taskStep_norm contexts space s e he
  have hw : ∀ s e, (taskGraph contexts space obj).weight (taskNorm s) e = (realTaskGraph contexts space obj).weight s e := by
    intro s e; exact taskWeight_norm contexts obj s e
  obtain ⟨⟨t, hr, hg⟩, lower⟩ := Certificate.search_sound h
  obtain ⟨u, hu, heq⟩ := Certificate.lift_run taskNorm (fun s e he => (hm s e).mpr he) hn hw
    c.path (taskInitial contexts) t c.cost hr
  constructor
  · refine ⟨u, hu, ?_⟩
    rw [← heq] at hg
    simpa only [taskGraph, taskDone_norm] using hg
  · intro es v n run goal
    apply lower es (taskNorm v) n (Certificate.map_run taskNorm (fun s e he => (hm s e).mp he) hn hw run)
    simpa only [taskGraph, taskDone_norm] using goal

structure JointMinimum where
  cost : Nat
  path : List TaskEvent
  space : SearchSpace

def jointMinimum (contexts : List Context) (obj : Objective) (bound : Nat := 20000)
    (space? : Option SearchSpace := none) : Option JointMinimum :=
  let values := contexts.foldl (fun n ctx => n + ctx.goals.values.length) 0
  let screens := contexts.foldl (fun n ctx => max n ctx.prog.screens.length) 0
  let trySpace := fun space budget =>
    (Certificate.search (taskGraph contexts space obj) (taskNorm (taskInitial contexts)) budget).map fun c =>
      { cost := c.cost, path := c.path, space : JointMinimum }
  match space? with
  | some space => trySpace space bound
  | none =>
    (trySpace .full (if values > 12 || screens > 20 then 0 else bound)).or
      ((trySpace .goalDirected (if values > 15 || screens > 20 then 0 else bound)).or
        (trySpace .navigationDirected bound))

def JointCorrect (contexts : List Context) (obj : Objective) (r : JointMinimum) : Prop :=
  (∃ t, Certificate.Run (realTaskGraph contexts r.space obj) (taskInitial contexts) r.path t r.cost ∧ taskDone contexts t = true) ∧
  (∀ es t n, Certificate.Run (realTaskGraph contexts r.space obj) (taskInitial contexts) es t n → taskDone contexts t = true → r.cost ≤ n)

/-- Public joint-task minimum, including every automatic fallback branch. -/
theorem T9_jointMinimum (contexts obj bound space? r)
    (h : jointMinimum contexts obj bound space? = some r) : JointCorrect contexts obj r := by
  cases space? with
  | some space =>
    simp only [jointMinimum] at h
    cases hc : Certificate.search (taskGraph contexts space obj) (taskNorm (taskInitial contexts)) bound with
    | none => simp [hc] at h
    | some c =>
      simp only [hc, Option.map_some, Option.some.injEq] at h
      cases h
      exact T9_taskSearch contexts space obj bound c hc
  | none =>
    simp only [jointMinimum] at h
    let values := contexts.foldl (fun n ctx => n + ctx.goals.values.length) 0
    let screens := contexts.foldl (fun n ctx => max n ctx.prog.screens.length) 0
    let fullBound := if values > 12 || screens > 20 then 0 else bound
    let goalBound := if values > 15 || screens > 20 then 0 else bound
    change ((Certificate.search (taskGraph contexts .full obj) (taskNorm (taskInitial contexts)) fullBound).map
      (fun c => { cost := c.cost, path := c.path, space := .full : JointMinimum })).or
      (((Certificate.search (taskGraph contexts .goalDirected obj) (taskNorm (taskInitial contexts)) goalBound).map
        (fun c => { cost := c.cost, path := c.path, space := .goalDirected : JointMinimum })).or
        ((Certificate.search (taskGraph contexts .navigationDirected obj) (taskNorm (taskInitial contexts)) bound).map
          (fun c => { cost := c.cost, path := c.path, space := .navigationDirected : JointMinimum }))) = some r at h
    cases hf : Certificate.search (taskGraph contexts .full obj) (taskNorm (taskInitial contexts)) fullBound with
    | some c =>
      simp only [hf, Option.map, Option.or, Option.some.injEq] at h
      cases h
      exact T9_taskSearch contexts .full obj fullBound c hf
    | none =>
      simp only [hf, Option.map, Option.or] at h
      cases hg : Certificate.search (taskGraph contexts .goalDirected obj) (taskNorm (taskInitial contexts)) goalBound with
      | some c =>
        simp only [hg, Option.map, Option.or, Option.some.injEq] at h
        cases h
        exact T9_taskSearch contexts .goalDirected obj goalBound c hg
      | none =>
        simp only [hg, Option.map, Option.or] at h
        cases hn : Certificate.search (taskGraph contexts .navigationDirected obj) (taskNorm (taskInitial contexts)) bound with
        | none => simp [hn] at h
        | some c =>
          simp only [hn, Option.map, Option.some.injEq] at h
          cases h
          exact T9_taskSearch contexts .navigationDirected obj bound c hn

/-- UI-only segments, delimited by certified zero-cost resets. -/
def episodePaths (events : List TaskEvent) : List (List Event) :=
  let (finished, current) := events.foldl (fun (done, current) e =>
    match e with | some e => (done, current ++ [e]) | none => (done ++ [current], [])) ([], [])
  finished ++ [current]

#print axioms T9_taskSearch
#print axioms T9_jointMinimum
end Ehr.Sim
