import Ehr.Api
import Ehr.Check.PriorAuth

/-! Shared proof-carrying search for both conformance catalogs. A trial's
relation describes its endpoints independently of the bounded layout search. -/
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
@[macro_inline] def require (ok : Bool) (msg : String) : Trial Unit :=
  ⟨fun s _ t => ok = true ∧ t = s, fun s =>
    if h : ok then .ok ⟨((),s), h, rfl⟩ else .error msg⟩

/-- New specification for owner review. Try an alternative from a legitimate
prefix, then continue the main scenario from that very prefix. -/
def fork (a : Trial Unit) : Trial Unit :=
  ⟨fun s _ t => (∃ u, a.holds s () u) ∧ t = s, fun s => do
    let ⟨((),u), h⟩ ← a.search s
    return ⟨((),s), ⟨u,h⟩, rfl⟩⟩

/-- New specification for owner review. Native inputs and lazily cached
navigation routes. Only search forces the per-screen caches. -/
structure Scene extends InitInput where
  paths : List (ScreenId × Thunk (List (ScreenId × List Hop)))

/-- New specification for owner review. Each event is dispatched exactly as in the CLI. -/
def dispatch (i : InitInput) (s : State) (e : Event) : StepOutput :=
  runStep ⟨i.spec, i.program, i.facts, i.user, s, e⟩

/-- New specification for owner review. Observe both the real step result and state. -/
def act (i : InitInput) (e : Event) : Trial StepResult :=
  ⟨fun s r t => dispatch i s e = ⟨t,r⟩, fun s =>
    let out := dispatch i s e
    .ok ⟨(out.result,out.state), rfl⟩⟩

/-- New specification for owner review. Require a successful native human action. -/
def applyOk (i : InitInput) (e : Event) : Trial Unit :=
  ⟨fun s _ t => (dispatch i s e).result = .ok ∧ t = (dispatch i s e).state, fun s =>
    let out := dispatch i s e
    if h : out.result = .ok then .ok ⟨((),out.state),h,rfl⟩
    else .error s!"{repr e} returned {repr out.result}"⟩

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

/-- New specification for owner review. Run an already checked native operation;
its successful equation is the relation, independently of route search. -/
def checked (f : State → Except String State) : Trial Unit :=
  ⟨fun s _ t => f s = .ok t, fun s => match f s with
    | .ok t => .ok ⟨((),t),rfl⟩ | .error msg => .error msg⟩

/-- New specification for owner review. Execute a trial, erasing only its proof. -/
def execute (task : Trial α) (s : State) : Except String (α × State) :=
  (task.search s).map Subtype.val

/-- New specification for owner review. A successful native event, for checked
state-transforming observations as well as monadic scripts. -/
def advance (i : InitInput) (s : State) (e : Event) : Except String State :=
  (execute (applyOk i e) s).map (·.2)

/-- New specification for owner review. Replay one finite goto prefix, retaining
its native navigation proof for every control tried at the destination. -/
def travel (i : InitInput) (s : State) (hops : List Hop) : Except String {t // Path i s t} := do
  let mut pos : {t // Path i s t} := ⟨s, .nil s⟩
  for hop in hops do
    let cs := i.program.compsOf pos.val.screen
    let some c := cs.find? (·.id == hop.1) | throw s!"Missing {hop.1} on {pos.val.screen}"
    unless gotoOf? c.kind == some hop.2 do throw s!"Invalid route through {c.id}"
    let some next := walk pos (reveal pos.val cs (cs.length + 1) c ++ [.click c.id])
      | throw s!"Reveal and follow {c.id} on {pos.val.screen}"
    unless next.val.screen == hop.2 do throw s!"Route missed {hop.2}"
    pos := next
  return pos

/-- New specification for owner review. Reveal a control from a certified
prefix. Failed alternatives always start again at that same prefix state. -/
def revealAt (i : InitInput) {s : State} (pos : {t // Path i s t}) (cid : CompId) :
    Except String {out : Component × State // Path i s out.2 ∧
      shownComp? i.spec i.program i.facts out.2 out.1.id = some out.1} := do
  let cs := i.program.compsOf pos.val.screen
  let some c := cs.find? (·.id == cid) | throw s!"Missing {cid} on {pos.val.screen}"
  let some ⟨t,path⟩ := walk pos (reveal pos.val cs (cs.length + 1) c)
    | throw s!"Reveal {cid} on {pos.val.screen}"
  match h : shownComp? i.spec i.program i.facts t cid with
  | none => throw s!"Reveal {cid} on {t.screen}"
  | some shown =>
    have id : shown.id = cid := by
      have found := List.find?_some h
      exact beq_iff_eq.mp (Bool.and_eq_true_iff.mp found).1
    return ⟨(shown,t),path,by simpa [id] using h⟩

/-- New specification for owner review. Cache finite shortest routes. Service
encounters exclude destinations with medication-producing controls. -/
def routes (p : Program) (service := false) (workflow := "") :
    List (ScreenId × Thunk (List (ScreenId × List Hop))) :=
  let adj := p.screens.map fun sc => (sc.id, (openGotoEdges p sc.id).filter
    (fun h => !service || (p.compsOf h.2).all drugNeutral))
  p.screens.map fun sc => (sc.id, Thunk.mk fun _ =>
    let paths := bfs p (fun a => (adj.lookup a).getD []) sc.id
    if workflow.isEmpty then paths else
      paths.filter (fun r => (p.screen? r.1).any (·.workflow == workflow)) ++
      paths.filter (fun r => !(p.screen? r.1).any (·.workflow == workflow)))

/-- New specification for owner review. One bounded choice operator for both
catalogs. The goal never mentions search success. Each candidate receives the actual
native prefix and its replay equation.
A failed candidate leaves the original state available for the next attempt. -/
def choose (i : Scene) (label : String) (fits : State → Component → Bool)
    (goal : State → α → State → Prop)
    (attempt : (s : State) → (path : List Hop) → (pos : {t // Path i.toInitInput s t}) →
      travel i.toInitInput s path = .ok pos → CompId →
      Except String {out : α × State // goal s out.1 out.2}) : Trial α where
  holds := goal
  search s := Id.run do
    let paths := ((i.paths.lookup s.screen).map Thunk.get).getD []
    let mut reason := s!"Provide a reachable {label} from {s.screen}"
    for (dest, path) in paths do
      let arrival := Thunk.mk fun _ => travel i.toInitInput s path
      for c in i.program.compsOf dest do
        if fits s c then
          match reached : arrival.get with
          | .error msg => reason := msg
          | .ok pos =>
            match attempt s path pos reached c.id with
            | .ok out => return .ok out
            | .error msg => reason := msg
    return .error reason

/-- New specification for owner review. Find a reachable shown control on the
bound chart. Only successful native navigation can establish its state. -/
def visit (i : Scene) (label : String) (fits : State → Component → Bool) : Trial Component :=
  choose i label fits (fun s c t => Path i.toInitInput s t ∧ fits t c ∧
      shownComp? i.spec i.program i.facts t c.id = some c ∧
      (Workspace.enabled i.program → Workspace.bound i.facts t)) fun _ _ pos _ cid => do
    let ⟨(c,t),nav,shown⟩ ← revealAt i.toInitInput pos cid
    if h : fits t c ∧ (Workspace.enabled i.program → Workspace.bound i.facts t) then
      return ⟨(c,t),nav,h.1,shown,h.2⟩
    else throw s!"Provide a reachable shown {label} on the bound chart at {t.screen}"

/-- New specification for owner review. Start exactly at native init. The
selection fixture opens a supplied directory row and hydrates the selected chart. -/
def openChart (i : InitInput) : Trial Unit := do
  if Workspace.enabled i.program then
    let s ← current
    let some row := (Workspace.openControls i.program i.facts s).find? (fun c =>
      match c.action with | .openPatient patient _ => patient == i.facts.patientId | _ => false)
      | require false "Provide a clinical destination for the scheduled patient"
    applyOk i (.click row.id)
    let selected ← current
    require ((selected.patientContext?.bind (·.patient?)) == some i.facts.patientId)
      "The scheduled row must open the fixture patient"
    let _ ← act i (.scroll selected.screen)
    require (Workspace.bound i.facts (← current)) "Bind the selected chart to the fixture source"

/-- New specification for owner review. A whole native scenario starts at native init. -/
def Realized (i : InitInput) (task : Trial Unit) : Prop :=
  ∃ t, task.holds (runInit i) () t

/-- New specification for owner review. Return the first missing witness for a scene. -/
def diagnose (i : InitInput) (task : Trial Unit) : Option String :=
  match task.search (runInit i) with
  | .ok _ => none
  | .error why => some why

/-- New specification for owner review. Successful bounded search realizes the script from native initialization. -/
theorem diagnose_sound {i task} (pass : diagnose i task = none) : Realized i task := by
  unfold diagnose at pass
  split at pass
  next out _ => exact ⟨out.val.2, out.property⟩
  next => contradiction

#print axioms diagnose_sound
end Ehr.Check.EntryWitness

namespace Ehr.Check
/-- New specification for owner review. Shared ancestor events for native
scenario navigation and checker counterexamples. -/
abbrev revealEvents := EntryWitness.reveal
end Ehr.Check
