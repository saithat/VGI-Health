import Ehr.Sim.History
import Ehr.Sim.Certificate

/-!
Separate minimums for activations and typed characters at fixed time.
full omits Back, scroll and search; goalDirected fixes first-field entry;
navigationDirected also restricts routes to the next action.
Each certificate applies only to the reported search space and bounds.
Automatic search limits: full 12 values, goalDirected 15; both 20 screens.
-/
namespace Ehr.Sim
open Ehr

/-- The allowed moves for which a reported minimum is certified. -/
inductive SearchSpace | full | goalDirected | navigationDirected
  deriving DecidableEq, Repr, Inhabited, Lean.ToJson
/-- Optimize activations or typed characters separately. -/
inductive Objective | clicks | keystrokes
  deriving DecidableEq, Repr, Inhabited

/-- A scan is an entry whose spec kind is scan, on the actual shown field. -/
def isScanEvent (ctx : Context) (s : State) : Event → Bool
  | .enter c _ => ((shownComp? ctx.sp ctx.prog ctx.facts s c).bind fun c =>
      match c.kind with | .field e _ _ => ctx.sp.element? e | _ => none).any fun el =>
        match el.kind with | .scan _ => true | _ => false
  | _ => false

/-- Charge the selected objective for this event, treating scans separately. -/
def eventWeight (ctx : Context) (obj : Objective) (s : State) (e : Event) : Nat :=
  let ops := if isScanEvent ctx s e then [.scan] else []
  match obj with | .clicks => activation e ops | .keystrokes => typedKeys e ops

/-- Identical reviews at fixed search time add no information. -/
def newReview (ctx : Context) (s : State) (i : InfoId) : Bool :=
  infoShown ctx.sp ctx.prog ctx.facts s i &&
    !(s.receipts.any fun r => r.info == i &&
      infoVersion ctx.sp ctx.facts i == some r.dataVersion &&
      r.time == nowMin ctx.facts s && r.user == ctx.user.id && r.role == ctx.user.role)

/-- List bounded goal entries, commits, reviews, navigation, macros and alert acks;
keep only events allowed by the interpreter. -/
def fullMoves (ctx : Context) (s : State) : List Event :=
  let cs := shown ctx s
  let moves := cs.flatMap fun c => match c.kind with
    | .field e sl _ =>
      ((ctx.goals.values ++ ctx.goals.waivers).filter fun g => g.element == e &&
        (g.slot?.isNone || g.slot? == some (resolveSlot s sl))).flatMap fun g =>
          [.enter c.id (goalValue ctx.sp ctx.facts ctx.user g), .confirm c.id]
    | .button (.commit cm) =>
      if ctx.goals.commits.contains cm && !s.commits.contains cm &&
        commitValuesMet ctx.sp ctx.facts ctx.user ctx.goals s cm then [.click c.id] else []
    | .button (.markReviewed i) => if newReview ctx s i then [.click c.id] else []
    | .button (.goto _) => [.click c.id]
    | .group true _ | .macro _ => [.click c.id]
    | .button .newOrderLine => if canAdvance ctx s then [.click c.id] else []
    | .tabs => tabEvents (ctx.prog.compsOf s.screen) c
    | _ => []
  (moves ++ ctx.sp.alerts.map (fun a => Event.ack a.id)).filter (safeEvent ctx s)

/-- A bounded, goal-directed planning space. At a goal field it enters or
confirms the first field; otherwise it chooses an available goal action, or
the first event of the shortest BFS route to one. This deliberately restricts
navigation and macros, and is not a global minimum claim. -/
def directedMoves (ctx : Context) (s : State) : List Event :=
  match s.popup? with
  | some p => [.ack p.1]
  | none =>
    match (shown ctx s).findSome? (fieldAction ctx s) with
    | some e => [e]
    | none =>
      let ready := actions ctx s
      if !ready.isEmpty then ready else ((planNavigation ctx s).getD []).take 1

/-- Fixed first-field entry,
but all non-entry alternatives (navigation, reviews, commits, macros) remain. -/
def goalDirectedMoves (ctx : Context) (s : State) (all : List Event) : List Event :=
  match s.popup? with
  | some p => [.ack p.1]
  | none =>
    match (shown ctx s).findSome? (fieldAction ctx s) with
    | some e => [e]
    | none => all.filter fun e => match e with | .enter .. | .confirm _ => false | _ => true

/-- Select the reported move set after forgetting Back history. -/
def searchMoves (ctx : Context) (space : SearchSpace) (s : State) : List Event :=
  let s := forgetHistory s
  let all := fullMoves ctx s
  match space with
  | .full => all
  | .goalDirected => (goalDirectedMoves ctx s all).filter (all.contains ·)
  | .navigationDirected => (directedMoves ctx s).filter (all.contains ·)

/-- A small structural FNV-style Nat hash. Hash collisions remain in equality
checked buckets; neither derived Hashable nor opaque machine hash is trusted. -/
def hashString (s : String) : Nat :=
  s.toList.foldl (fun h c => (h * 1099511628211 + c.toNat) % 18446744073709551616) 14695981039346656037

/-- Combine two hash parts within a 64-bit range. -/
def mix (a b : Nat) : Nat := (a * 1099511628211 + b) % 18446744073709551616

/-- Hash a value together with its kind and unit. -/
def hashValue : Value → Nat
  | .qty n u => mix n (hashString u.name)
  | .text s => mix 1 (hashString s)
  | .code s => mix 2 (hashString s)
  | .user s => mix 3 (hashString s)
  | .flag b => if b then 5 else 4

/-- Add strings to a hash in list order. -/
def hashStrings (seed : Nat) (xs : List String) : Nat :=
  xs.foldl (fun h s => mix h (hashString s)) seed

/-- Hash the search state; full state equality still resolves collisions. -/
def stateHash (s : State) : Nat := Id.run do
  let mut h := mix (hashString s.screen) (mix s.currentSlot s.clock)
  for x in s.captured do
    h := mix h (mix (hashString x.element) (mix x.slot (hashValue x.value)))
    h := mix h (if x.confirmed then 1 else 0)
    h := mix h (if x.byHuman then 1 else 0)
    h := mix h (hashString (x.provenance?.getD ""))
  for r in s.receipts do
    h := mix h (mix (hashString r.info) (mix r.dataVersion r.time))
    h := mix h (mix (hashString r.user) (hashString r.role.name))
  for (a, k) in s.acked do h := mix h (mix (hashString a) (hashString k))
  h := hashStrings (hashStrings h s.commits) s.expanded
  for (c, n) in s.tabSel do h := mix h (mix (hashString c) n)
  if let some (a, k) := s.popup? then h := mix h (mix (hashString a) (hashString k))
  return h

/-- Normalized transitions still call the public interpreter once. -/
def searchGraph (ctx : Context) (space : SearchSpace) (obj : Objective) : Certificate.Graph State Event :=
  { next := fun s e => forgetHistory (ctx.next (forgetHistory s) e)
    moves := searchMoves ctx space
    goal := ctx.done
    weight := eventWeight ctx obj
    hash := stateHash }

/-- A state, its cost from the start and the reversed event path. -/
structure SearchNode where
  state : State
  cost : Nat
  revPath : List Event

/-- Search nodes grouped in increasing cost order. -/
abbrev SearchQueue := List (Nat × List SearchNode)

/-- Replace this state's recorded distance without removing other states in its hash bucket. -/
def putDistance (v : Certificate.Table State) (s : State) (n : Nat) : Certificate.Table State :=
  let hash := stateHash s
  let bucket := (v[hash]?).getD []
  v.insert hash ((s, n) :: bucket.filter (fun x => x.1 != s))

/-- Insert a node into its cost bucket, preserving cost order. -/
def insertBucket (n : SearchNode) : SearchQueue → SearchQueue
  | [] => [(n.cost, [n])]
  | (cost, bucket) :: rest =>
    if n.cost == cost then (cost, n :: bucket) :: rest
    else if n.cost < cost then (n.cost, [n]) :: (cost, bucket) :: rest
    else (cost, bucket) :: insertBucket n rest

/-- Add a node to the search queue by cost. -/
def enqueue (q : SearchQueue) (n : SearchNode) : SearchQueue := insertBucket n q

/-- Search found a candidate, hit its bound, or exhausted the allowed states. -/
inductive SearchOutcome
  | found (candidate : Certificate.Candidate State Event)
  | bounded
  | unreachable

/-- Bucket-queue Dijkstra. Its output is untrusted until `Certificate.accept`.
Zero-weight edges are supported for scans and the keystroke objective. -/
def dijkstra (g : Certificate.Graph State Event) :
    Nat → SearchQueue → Certificate.Table State → SearchOutcome
  | 0, _, _ => .bounded
  | fuel + 1, q, v =>
    match q with
    | [] => .unreachable
    | (_, []) :: tail => dijkstra g fuel tail v
    | (cost, node :: rest) :: tail =>
      let q := if rest.isEmpty then tail else (cost, rest) :: tail
      if Certificate.lookup g v node.state != some cost then dijkstra g fuel q v
      else if g.goal node.state then .found { path := node.revPath.reverse, cost, visited := v }
      else
        let (q, v) := (g.moves node.state).foldl (fun (q, v) e =>
          let t := g.next node.state e
          let n := cost + g.weight node.state e
          match Certificate.lookup g v t with
          | some old => if old ≤ n then (q, v) else
              (enqueue q { state := t, cost := n, revPath := e :: node.revPath }, putDistance v t n)
          | none => (enqueue q { state := t, cost := n, revPath := e :: node.revPath }, putDistance v t n)) (q, v)
        dijkstra g fuel q v

/-- Search failure returns no answer; a state bound is never called a minimum. -/
def certifiedSearch (ctx : Context) (space : SearchSpace) (obj : Objective) (start : State)
    (bound : Nat) : Option (Certificate.Candidate State Event) :=
  let g := searchGraph ctx space obj
  let start := forgetHistory start
  let q := enqueue [] { state := start, cost := 0, revPath := [] }
  match dijkstra g bound q (putDistance {} start 0) with
  | .found c => if Certificate.accept g start c then some c else none
  | _ => none

/-- A certified cost and event path in the reported search space. -/
structure Minimum where
  cost : Nat
  path : List Event
  space : SearchSpace
  /-- Exact in `space`, after both replay and lower-bound checks. -/
  exact : Bool := true
  deriving Lean.ToJson

/-- Full first; bounded full searches are retried in the documented smaller
space. No uncertified upper bound is returned as a minimum. -/
def minimum (ctx : Context) (obj : Objective) (start : State) (bound := 20000)
    (space? : Option SearchSpace := none) : Option Minimum :=
  let fullBudget := if ctx.goals.values.length > 12 || ctx.prog.screens.length > 20 then 0 else bound
  let goalBudget := if ctx.goals.values.length > 15 || ctx.prog.screens.length > 20 then 0 else bound
  match space? with
  | some space => (certifiedSearch ctx space obj start bound).map fun c =>
      { cost := c.cost, path := c.path, space }
  | none =>
    match certifiedSearch ctx .full obj start fullBudget with
    | some c => some { cost := c.cost, path := c.path, space := .full }
    | none =>
      match certifiedSearch ctx .goalDirected obj start goalBudget with
      | some c => some { cost := c.cost, path := c.path, space := .goalDirected }
      | none => (certifiedSearch ctx .navigationDirected obj start bound).map fun c =>
          { cost := c.cost, path := c.path, space := .navigationDirected }

/-- Every `certifiedSearch` answer has an allowed replay at its cost, and no
cheaper run in the selected graph reaches the task goals. -/
theorem T9_certifiedSearch (ctx space obj start bound c)
    (h : certifiedSearch ctx space obj start bound = some c) :
    (∃ t, Certificate.Run (searchGraph ctx space obj) (forgetHistory start) c.path t c.cost ∧ ctx.done t = true) ∧
    (∀ es t n, Certificate.Run (searchGraph ctx space obj) (forgetHistory start) es t n →
      ctx.done t = true → c.cost ≤ n) := by
  unfold certifiedSearch at h
  dsimp only at h
  split at h
  next c' he =>
    split at h
    next ha =>
      cases h
      exact Certificate.exact_of_accept ha
    next => simp at h
  next => simp at h


 theorem fullMoves_safe (ctx s e) (h : e ∈ fullMoves ctx s) : safeEvent ctx s e = true := by
  exact (List.mem_filter.mp h).2

 theorem searchMoves_subset (ctx space s e) (h : e ∈ searchMoves ctx space s) :
    e ∈ fullMoves ctx (forgetHistory s) := by
  cases space with
  | full => exact h
  | goalDirected => simpa using (List.mem_filter.mp h).2
  | navigationDirected => simpa using (List.mem_filter.mp h).2

 theorem searchMoves_safe (ctx space s e) (h : e ∈ searchMoves ctx space s) :
    safeEvent ctx s e = true := by
  have hs := fullMoves_safe ctx (forgetHistory s) e (searchMoves_subset ctx space s e h)
  simpa only [forgetHistory, safeEvent_history] using hs

@[simp] theorem searchMoves_history (ctx space s h) :
    searchMoves ctx space (withHistory s h) = searchMoves ctx space s := by
  simp only [searchMoves, forget_withHistory]

@[simp] theorem done_history (ctx : Context) (s h) : ctx.done (withHistory s h) = ctx.done s := by
  simp only [Context.done, goalsMet, valueGoalMet_history]
  rfl

@[simp] theorem weight_history (ctx obj s e h) :
    eventWeight ctx obj (withHistory s h) e = eventWeight ctx obj s e := by
  cases e <;> simp only [eventWeight, isScanEvent, shownComp_history] <;> rfl

 theorem next_forget (ctx space obj s e) (h : e ∈ searchMoves ctx space s) :
    (searchGraph ctx space obj).next (forgetHistory s) e = forgetHistory (ctx.next s e) := by
  have hh := congrArg Prod.fst (step_history ctx s e [] (searchMoves_safe ctx space s e h))
  simpa only [searchGraph, Context.next, forgetOutput, forgetHistory, withHistory_twice] using hh

/-- This graph uses the public interpreter without resetting its history. -/
def realGraph (ctx : Context) (space : SearchSpace) (obj : Objective) : Certificate.Graph State Event :=
  { next := ctx.next, moves := searchMoves ctx space, goal := ctx.done,
    weight := eventWeight ctx obj, hash := stateHash }

 theorem abstract_run (ctx space obj) {s es t n}
    (run : Certificate.Run (realGraph ctx space obj) s es t n) :
    Certificate.Run (searchGraph ctx space obj) (forgetHistory s) es (forgetHistory t) n := by
  induction run with
  | nil s => exact .nil _
  | @cons s e es t n he hr ih =>
    have he' : e ∈ (searchGraph ctx space obj).moves (forgetHistory s) := by
      simpa only [searchGraph, realGraph, forgetHistory, searchMoves_history] using he
    have hn := next_forget ctx space obj s e he
    have hw : (searchGraph ctx space obj).weight (forgetHistory s) e =
      (realGraph ctx space obj).weight s e := by simp only [searchGraph, realGraph, forgetHistory, weight_history]
    rw [← hw]
    apply Certificate.Run.cons he'
    simpa only [realGraph, hn] using ih

 theorem real_run (ctx space obj) (es : List Event) : ∀ s t n,
    Certificate.Run (searchGraph ctx space obj) (forgetHistory s) es t n →
    ∃ u, Certificate.Run (realGraph ctx space obj) s es u n ∧ forgetHistory u = t := by
  induction es with
  | nil =>
    intro s t n hr
    cases hr
    exact ⟨s, .nil s, rfl⟩
  | cons e es ih =>
    intro s t n hr
    cases hr with
    | @cons _ _ _ _ cost he tail =>
      have he' : e ∈ (realGraph ctx space obj).moves s := by
        simpa only [searchGraph, realGraph, forgetHistory, searchMoves_history] using he
      have hn := next_forget ctx space obj s e he'
      rw [hn] at tail
      obtain ⟨u, hu, heq⟩ := ih (ctx.next s e) t cost tail
      refine ⟨u, ?_, heq⟩
      have hw : (searchGraph ctx space obj).weight (forgetHistory s) e =
        (realGraph ctx space obj).weight s e := by simp only [searchGraph, realGraph, forgetHistory, weight_history]
      rw [hw]
      exact .cons he' hu

 theorem real_run_replays (ctx space obj) {s es t n}
    (run : Certificate.Run (realGraph ctx space obj) s es t n) :
    runAll ctx.sp ctx.prog ctx.facts ctx.user .human s es = t := by
  induction run with
  | nil => rfl
  | cons _ _ ih => exact ih

/-- T9 for actual EHR runs: the answer replays through `Ehr.step`, reaches the
chosen goals, and is least among all allowed runs in the reported search
space. Clock is fixed, and Back/search/scroll are outside that space. -/
theorem T9_minimum_real (ctx space obj start bound c)
    (h : certifiedSearch ctx space obj start bound = some c) :
    ctx.done (runAll ctx.sp ctx.prog ctx.facts ctx.user .human start c.path) = true ∧
    (∃ t, Certificate.Run (realGraph ctx space obj) start c.path t c.cost) ∧
    (∀ es t n, Certificate.Run (realGraph ctx space obj) start es t n → ctx.done t = true → c.cost ≤ n) := by
  obtain ⟨⟨t, hr, hg⟩, lower⟩ := T9_certifiedSearch ctx space obj start bound c h
  obtain ⟨u, hu, heq⟩ := real_run ctx space obj c.path start t c.cost hr
  have goal : ctx.done u = true := by
    rw [← heq] at hg
    simpa only [forgetHistory, done_history] using hg
  refine ⟨?_, ⟨u, hu⟩, ?_⟩
  · rw [real_run_replays ctx space obj hu]; exact goal
  · intro es v n run gv
    apply lower es (forgetHistory v) n (abstract_run ctx space obj run)
    simpa only [forgetHistory, done_history] using gv


/-- Public result contract: actual replay, its exact weight, and a lower bound
for all real interpreter runs allowed by the result's declared search space. -/
def MinimumCorrect (ctx : Context) (obj : Objective) (start : State) (r : Minimum) : Prop :=
  ctx.done (runAll ctx.sp ctx.prog ctx.facts ctx.user .human start r.path) = true ∧
  (∃ t, Certificate.Run (realGraph ctx r.space obj) start r.path t r.cost) ∧
  (∀ es t n, Certificate.Run (realGraph ctx r.space obj) start es t n → ctx.done t = true → r.cost ≤ n)

/-- T9 for the function used by the CLI, including full-to-directed fallback.
No result escapes the certificate checks in either branch. -/
theorem T9_minimum (ctx obj start bound space? r)
    (h : minimum ctx obj start bound space? = some r) : MinimumCorrect ctx obj start r := by
  cases space? with
  | some space =>
    simp only [minimum] at h
    cases hc : certifiedSearch ctx space obj start bound with
    | none => simp [hc] at h
    | some c =>
      simp only [hc, Option.map_some, Option.some.injEq] at h
      cases h
      exact T9_minimum_real ctx space obj start bound c hc
  | none =>
    simp only [minimum] at h
    let fullBudget := if ctx.goals.values.length > 12 || ctx.prog.screens.length > 20 then 0 else bound
    cases hf : certifiedSearch ctx .full obj start fullBudget with
    | some c =>
      simp only [show (if ctx.goals.values.length > 12 || ctx.prog.screens.length > 20 then 0 else bound) = fullBudget from rfl, hf, Option.some.injEq] at h
      cases h
      exact T9_minimum_real ctx .full obj start fullBudget c hf
    | none =>
      simp only [show (if ctx.goals.values.length > 12 || ctx.prog.screens.length > 20 then 0 else bound) = fullBudget from rfl, hf] at h
      let goalBudget := if ctx.goals.values.length > 15 || ctx.prog.screens.length > 20 then 0 else bound
      cases hd : certifiedSearch ctx .goalDirected obj start goalBudget with
      | some c =>
        simp only [show (if ctx.goals.values.length > 15 || ctx.prog.screens.length > 20 then 0 else bound) = goalBudget from rfl, hd, Option.some.injEq] at h
        cases h
        exact T9_minimum_real ctx .goalDirected obj start goalBudget c hd
      | none =>
        simp only [show (if ctx.goals.values.length > 15 || ctx.prog.screens.length > 20 then 0 else bound) = goalBudget from rfl, hd] at h
        cases hn : certifiedSearch ctx .navigationDirected obj start bound with
        | none => simp [hn] at h
        | some c =>
          simp only [hn, Option.map_some, Option.some.injEq] at h
          cases h
          exact T9_minimum_real ctx .navigationDirected obj start bound c hn

#print axioms T9_certifiedSearch
#print axioms T9_minimum_real
#print axioms T9_minimum
end Ehr.Sim
