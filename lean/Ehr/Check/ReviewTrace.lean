import Ehr.Check.PriorAuth
import Ehr.Api

namespace Ehr.Check
open Ehr Ehr.Props

/-- Events that open every closed group and unselected tab above `c`, in the
current state. -/
def revealEvents (s : State) (comps : List Component) : Nat → Component → List Event
  | 0, _ => []
  | fuel + 1, c =>
    match c.parent? with
    | none => []
    | some pid =>
      match comps.find? (·.id == pid) with
      | none => []
      | some p =>
        revealEvents s comps fuel p ++
          match p.kind with
          | .group true _ => if s.expanded.contains p.id then [] else [.click p.id]
          | .tabs => if s.tabOf p.id == c.tab then [] else [.selectTab p.id c.tab]
          | _ => []

end Ehr.Check

namespace Ehr.Check.ReviewTrace
open Ehr Ehr.Props

/-- New specification for owner review. Advance only through the deployed event handler. -/
def fire (i : InitInput) (s : State) (event : Event) : StepOutput :=
  runStep ⟨i.spec, i.program, i.facts, i.user, s, event⟩

/-- New specification for owner review. A refused or ignored required action cannot advance a witness. -/
def applyOk (i : InitInput) (s : State) (event : Event) : Except String State :=
  let r := fire i s event
  if r.result == .ok then .ok r.state else .error s!"{repr event}: {repr r.result}"

/-- New specification for owner review. The encounter starts at native init. For
selection layouts, click the supplied patient row and hydrate by a real scroll. -/
def beginEncounter (i : InitInput) : Except String State := do
  let s := runInit i
  unless Workspace.enabled i.program do return s
  let some row := (Workspace.openControls i.program i.facts s).find? (fun c =>
    match c.action with | .openPatient patient _ => patient == i.facts.patientId | _ => false)
    | throw "Provide a landing row that opens the encounter."
  let opened ← applyOk i s (.click row.id)
  let bound := (fire i opened (.scroll opened.screen)).state
  unless Workspace.bound i.facts bound do throw "Bind the selected chart before clinical entry."
  return bound

/-- New specification for owner review. A checkpoint specifies which control is
needed, what the human does there and what must be observed on this execution. -/
structure Checkpoint where
  label : String
  accepts : Component → Bool
  act : InitInput → State → Component → Except String State
  preserves : State → State → Bool := fun _ _ => true

/-- New specification for owner review. Reveal ancestors through native clicks
and tab selection, then look up the shown control on that very screen. -/
def reveal (i : InitInput) (s : State) (cid : CompId) : Except String (State × Component) := do
  let cs := i.program.compsOf s.screen
  let some c := cs.find? (·.id == cid) | throw s!"Missing {cid} on {s.screen}"
  let t ← (revealEvents s cs (cs.length + 1) c).foldlM (applyOk i) s
  let some shown := shownComp? i.spec i.program i.facts t cid | throw s!"Reveal {cid} on {s.screen}"
  return (t, shown)

/-- New specification for owner review. Interpret a proposed goto path and
checkpoint, checking the binding at every click. A path cannot smuggle a
commit, macro or review click into a navigation prefix. -/
def perform (i : InitInput) (g : Checkpoint) (s : State) (path : List Hop) (cid : CompId) :
    Except String State := do
  let t ← path.foldlM (init := s) fun t hop => do
    let (r, c) ← reveal i t hop.1
    unless gotoOf? c.kind == some hop.2 do throw s!"Invalid route through {c.id}"
    let z ← applyOk i r (.click c.id)
    unless z.screen == hop.2 do throw s!"Route missed {hop.2}"
    return z
  let (t, c) ← reveal i t cid
  unless g.accepts c do throw s!"Provide {g.label} on {t.screen}"
  let after ← g.act i t c
  unless g.preserves s after do throw s!"{g.label} changed saved evidence"
  return after

/-- New specification for owner review. Every checkpoint has a concrete native
navigation and action witness from the state left by its predecessor. -/
def Realizes (i : InitInput) : State → List Checkpoint → Prop
  | _, [] => True
  | s, g :: gs => ∃ path cid t, perform i g s path cid = .ok t ∧ Realizes i t gs

/-- New specification for owner review. Bounded candidate routes, shortest first.
Cache the adjacency list since reveals and BFS consult it for many fields. -/
def routes (p : Program) (service : Bool) : ScreenId → List (ScreenId × List Hop) :=
  let adj := p.screens.map fun sc => (sc.id, (openGotoEdges p sc.id).filter
    (fun h => !service || (p.compsOf h.2).all drugNeutral))
  fun a => bfs p (fun z => ((adj.lookup z).getD [])) a

/-- New specification for owner review. Search only the supplied finite routes
and controls. Every returned destination carries the native validation. -/
def seek (i : InitInput) (g : Checkpoint) (s : State) (paths : List (ScreenId × List Hop)) :
    Except String {t : State // ∃ path cid, perform i g s path cid = .ok t} := do
  let mut reason := s!"Provide a reachable {g.label} from {s.screen}"
  for (dest, path) in paths do
    for c in i.program.compsOf dest do
      if g.accepts c then
        match h : perform i g s path c.id with
        | .ok t => return ⟨t, path, c.id, h⟩
        | .error msg => reason := msg
  throw reason

/-- New specification for owner review. Search one finite trace without
backtracking across successful checkpoints. Failures identify the checkpoint. -/
def search (i : InitInput) (paths : ScreenId → List (ScreenId × List Hop)) :
    (s : State) → (gs : List Checkpoint) → Except String (PLift (Realizes i s gs))
  | _, [] => .ok ⟨True.intro⟩
  | s, g :: gs => do
    let ⟨t, h⟩ ← seek i g s (paths s.screen) |>.mapError (fun msg => g.label ++ ": " ++ msg)
    let tail ← search i paths t gs
    return ⟨by obtain ⟨path, cid, ok⟩ := h; exact ⟨path, cid, t, ok, tail.down⟩⟩

/-- New specification for owner review. Successful opening and the whole clinical
script on the same chart, including any specified probe layout changes. -/
def Scenario (i : InitInput) (gs : List Checkpoint) : Prop :=
  ∃ s, beginEncounter i = .ok s ∧ Realizes i s gs

/-- New specification for owner review. Check a single native encounter. -/
def witness (i : InitInput) (gs : List Checkpoint) (service : Bool) :
    Except String (PLift (Scenario i gs)) :=
  match h : beginEncounter i with
  | .error msg => .error msg
  | .ok s => (search i (routes i.program service) s gs).map fun ok => ⟨⟨s, h, ok.down⟩⟩

end Ehr.Check.ReviewTrace
