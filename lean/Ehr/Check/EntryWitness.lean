import Ehr.Api
import Ehr.Check.Graph

/-! Small, proof-carrying search for the entry scenarios. The logical relation
of a trial describes its endpoints independently of the layout search. -/
namespace Ehr.Check.EntryWitness
open Ehr Ehr.Props

/-- New specification for owner review. A successful search supplies evidence
of the stated relation between the initial state, observation and final state. -/
structure Trial (α : Type) where
  holds : State → α → State → Prop
  search : (s : State) → Except String { out : α × State // holds s out.1 out.2 }

/-- New specification for owner review. Composition shares the *same* intermediate state. -/
instance : Monad Trial where
  pure x := ⟨fun s a t => a = x ∧ t = s, fun s => .ok ⟨(x, s), rfl, rfl⟩⟩
  bind a b := ⟨fun s y t => ∃ x m, a.holds s x m ∧ (b x).holds m y t, fun s => do
    let ⟨(x, m), first⟩ ← a.search s
    let ⟨out, rest⟩ ← (b x).search m
    return ⟨out, x, m, first, rest⟩⟩

/-- New specification for owner review. Read the actual intermediate state. -/
def current : Trial State := ⟨fun s a t => a = s ∧ t = s, fun s => .ok ⟨(s,s), rfl, rfl⟩⟩

/-- New specification for owner review. Failed observations explain the missing witness. -/
def require (ok : Bool) (msg : String) : Trial Unit :=
  ⟨fun s _ t => ok = true ∧ t = s, fun s =>
    if h : ok then .ok ⟨((),s), h, rfl⟩ else .error msg⟩

/-- New specification for owner review. Try an alternative from a legitimate
prefix, then continue the main scenario from that very prefix. -/
def fork (a : Trial Unit) : Trial Unit :=
  ⟨fun s _ t => (∃ u, a.holds s () u) ∧ t = s, fun s => do
    let ⟨((),u), h⟩ ← a.search s
    return ⟨((),s), ⟨u,h⟩, rfl⟩⟩

/-- New specification for owner review. Native inputs and a cached navigation
graph. Only the search uses the graph. -/
structure Scene extends InitInput where
  edges : List (ScreenId × List Hop)
  workflow : String

/-- New specification for owner review. Each event is dispatched exactly as in the CLI. -/
def dispatch (i : InitInput) (s : State) (e : Event) : StepOutput :=
  runStep ⟨i.spec, i.program, i.facts, i.user, s, e⟩

/-- New specification for owner review. Observe both the real step result and state. -/
def act (i : InitInput) (e : Event) : Trial StepResult :=
  ⟨fun s r t => dispatch i s e = ⟨t,r⟩, fun s =>
    let out := dispatch i s e
    .ok ⟨(out.result,out.state), rfl⟩⟩

/-- New specification for owner review. Require a successful native human action. -/
def applyOk (i : InitInput) (e : Event) : Trial Unit := do
  let r ← act i e
  require (r == .ok) s!"{repr e} returned {repr r}"

/-- New specification for owner review. An interim navigation event must be a
successful shown goto, group toggle or tab selection. -/
def navigation (i : InitInput) (s : State) (e : Event) : Bool :=
  let shown := shownComp? i.spec i.program i.facts s
  match e with
  | .click id => (shown id).any fun c => match c.kind with
      | .button (.goto _) | .group true _ => true | _ => false
  | .selectTab id _ => (shown id).any (·.kind == .tabs)
  | _ => false

/-- New specification for owner review. Paths contain only successful native navigation. -/
inductive Path (i : InitInput) : State → State → Prop
  | nil (s) : Path i s s
  | snoc {s m} (e) (path : Path i s m) (nav : navigation i m e)
      (ok : (dispatch i m e).result = .ok) : Path i s (dispatch i m e).state

/-- New specification for owner review. Reveal ancestors in containment order. -/
def reveal (s : State) (cs : List Component) : Nat → Component → List Event
  | 0, _ => []
  | n+1, c => (do
      let pid ← c.parent?
      let parent ← cs.find? (fun (p : Component) => p.id == pid)
      return reveal s cs n parent ++ (match parent.kind with
        | .group true _ => if s.expanded.contains pid then [] else [Event.click pid]
        | .tabs => if s.tabOf pid == c.tab then [] else [Event.selectTab pid c.tab]
        | _ => [])).getD []

/-- New specification for owner review. Replay navigation, retaining a proof
even when a candidate route was proposed by a heuristic. -/
def walk {i : InitInput} {s : State} (start : {t // Path i s t}) (es : List Event) :
    Option {t // Path i s t} := es.foldlM (fun ⟨m,h⟩ e =>
  if nav : navigation i m e then
    if ok : (dispatch i m e).result = .ok then
      some ⟨_, .snoc e h nav ok⟩ else none
  else none) start

/-- New specification for owner review. Find a reachable, shown control on the
bound chart. Failed candidate routes cannot supply a clinical state. -/
def visit (i : Scene) (label : String) (fits : State → Component → Bool) : Trial Component where
  holds s c t := Path i.toInitInput s t ∧ fits t c ∧
    shownComp? i.spec i.program i.facts t c.id = some c ∧
    (Workspace.enabled i.program → Workspace.bound i.facts t)
  search s := Id.run do
    let routes := bfs i.program (fun a => (i.edges.lookup a).getD []) s.screen
    let routes := routes.filter (fun r => (i.program.screen? r.1).any (·.workflow == i.workflow)) ++
      routes.filter (fun r => !(i.program.screen? r.1).any (·.workflow == i.workflow))
    for (z, hops) in routes do
      let cs := i.program.compsOf z
      let candidates := cs.filter (fits s)
      if candidates.isEmpty then continue
      let arrived := hops.foldlM (m := Option) (init := (⟨s, Path.nil s⟩ : {t // Path i.toInitInput s t}))
        fun pos hop => do
          let localCs := i.program.compsOf pos.val.screen
          let c ← localCs.find? (·.id == hop.1)
          walk pos (reveal pos.val localCs (localCs.length + 1) c ++ [.click c.id])
      if let some pos := arrived then
        for c in candidates do
          if let some ⟨t, path⟩ := walk pos (reveal pos.val cs (cs.length + 1) c) then
            if h : fits t c ∧ shownComp? i.spec i.program i.facts t c.id = some c ∧
                (Workspace.enabled i.program → Workspace.bound i.facts t) then
              return .ok ⟨(c,t), path,h⟩
    return .error s!"From {s.screen}, provide a reachable shown {label}"

/-- New specification for owner review. Start exactly at native init. The
selection fixture opens a supplied directory row and hydrates the selected chart. -/
def openChart (i : InitInput) : Trial Unit := do
  if Workspace.enabled i.program then
    let s ← current
    let some row := (Workspace.openControls i.program i.facts s).head?
      | require false "Provide a clinical destination for the scheduled patient"
    applyOk i (.click row.id)
    let selected ← current
    require ((selected.patientContext?.bind (·.patient?)) == some i.facts.patientId)
      "The scheduled row must open the fixture patient"
    let _ ← act i (.scroll selected.screen)
    require (Workspace.bound i.facts (← current)) "Bind the selected chart to the fixture source"

end Ehr.Check.EntryWitness
