import Ehr.Props.Basics

/-!
# The screen graph

Screens are nodes; a "go to" button is an edge. The checker searches this
graph breadth-first, so each path it finds is a shortest one. A path found by
the search is not trusted: `isGotoPath` re-checks it hop by hop, and
`isGotoPath_sound` proves that a re-checked path is a real `GotoPath`.

Two edge sets are used:
- `allGotoEdges`: every "go to" button whose target exists (for the depth
  bound and the alert budget, as in the properties);
- `openGotoEdges`: only buttons the user can always make shown by opening
  groups and tabs: not tiny, visibility `always`, and every ancestor a group
  or tab container that is itself not tiny and always visible (for
  completability and counterexamples).
-/

namespace Ehr.Check

open Ehr Ehr.Props

/-- A hop: the "go to" button clicked, and the screen it leads to. -/
abbrev Hop := CompId × ScreenId

/-- A component the user can always make shown with clicks alone: it is not
tiny, it is always visible, and each ancestor (found like the interpreter
finds it) is a group or tab container with the same property. -/
def revealableAux (comps : List Component) : Nat → Component → Bool
  | 0, _ => false
  | fuel + 1, c =>
    c.size != .tiny && c.visibility == .always &&
      match c.parent? with
      | none => true
      | some pid =>
        match comps.find? (·.id == pid) with
        | none => false
        | some p => isContainer p.kind && revealableAux comps fuel p

/-- `revealableAux` with the interpreter's step bound. -/
def revealable (comps : List Component) (c : Component) : Bool :=
  revealableAux comps (comps.length + 1) c

/-- Edges out of screen `a`: every "go to" button whose target screen exists. -/
def allGotoEdges (p : Program) (a : ScreenId) : List Hop :=
  (p.compsOf a).filterMap fun c =>
    match gotoOf? c.kind with
    | some t => if (p.screen? t).isSome then some (c.id, t) else none
    | none => none

/-- Edges out of screen `a`: "go to" buttons that can always be made shown. -/
def openGotoEdges (p : Program) (a : ScreenId) : List Hop :=
  let comps := p.compsOf a
  (comps.filterMap fun c =>
    match gotoOf? c.kind with
    | some t => if (p.screen? t).isSome && revealable comps c then some (c.id, t) else none
    | none => none)

/-- One round of breadth-first search: extend each frontier path by one hop
to a screen not seen yet (first path wins). -/
def bfsRound (edges : ScreenId → List Hop) (seen : List (ScreenId × List Hop))
    (frontier : List (ScreenId × List Hop)) : List (ScreenId × List Hop) :=
  frontier.foldl (fun acc sp =>
    (edges sp.1).foldl (fun acc h =>
      if seen.any (·.1 == h.2) || acc.any (·.1 == h.2) then acc
      else acc ++ [(h.2, sp.2 ++ [h])]) acc) []

/-- Breadth-first search with a round bound. -/
def bfsAux (edges : ScreenId → List Hop) :
    Nat → List (ScreenId × List Hop) → List (ScreenId × List Hop) → List (ScreenId × List Hop)
  | 0, seen, _ => seen
  | fuel + 1, seen, frontier =>
    match bfsRound edges seen frontier with
    | [] => seen
    | next => bfsAux edges fuel (seen ++ next) next

/-- Every screen reachable from `a`, each with a shortest path of hops. -/
def bfs (p : Program) (edges : ScreenId → List Hop) (a : ScreenId) : List (ScreenId × List Hop) :=
  bfsAux edges (p.screens.length + 1) [(a, [])] [(a, [])]

/-- The shortest path found from `a` to `z`, if any. -/
def pathTo (p : Program) (edges : ScreenId → List Hop) (a z : ScreenId) : Option (List Hop) :=
  ((bfs p edges a).find? (·.1 == z)).map (·.2)

/-- Re-check a path: each hop's button is a "go to" button on the current
screen leading to the hop's screen, and the last screen is `z`. -/
def isGotoPath (p : Program) : ScreenId → List Hop → ScreenId → Bool
  | a, [], z => a == z
  | a, h :: rest, z =>
    (p.screens.any fun scr => scr.id == a &&
      scr.components.any fun c => c.kind == .button (.goto h.2)) &&
    isGotoPath p h.2 rest z

/-- A re-checked path is a real path of "go to" clicks. -/
theorem isGotoPath_sound (p : Program) :
    ∀ (a : ScreenId) (hops : List Hop) (z : ScreenId),
      isGotoPath p a hops z = true → GotoPath p a (hops.map (·.2)) z := by
  intro a hops
  induction hops generalizing a with
  | nil =>
    intro z h
    simp only [isGotoPath, beq_iff_eq] at h
    subst h
    exact .here a
  | cons h rest ih =>
    intro z hp
    simp only [isGotoPath, Bool.and_eq_true, List.any_eq_true, beq_iff_eq] at hp
    obtain ⟨⟨scr, hscr, hid, c, hc, hk⟩, hrest⟩ := hp
    exact .hop ⟨scr, hscr, hid, c, hc, hk⟩ (ih h.2 z hrest)

/-- A verified path of at most `n` hops to `z`, found by search. -/
def shortPathTo (p : Program) (n : Nat) (z : ScreenId) : Option (List Hop) :=
  match pathTo p (allGotoEdges p) p.start z with
  | some hops => if isGotoPath p p.start hops z && decide (hops.length ≤ n) then some hops else none
  | none => none

theorem shortPathTo_sound (p : Program) (n : Nat) (z : ScreenId) (hops : List Hop)
    (h : shortPathTo p n z = some hops) : WithinClicks p n z := by
  unfold shortPathTo at h
  split at h
  · split at h
    · rename_i hc
      simp only [Option.some.injEq] at h
      subst h
      simp only [Bool.and_eq_true, decide_eq_true_eq] at hc
      exact ⟨_, isGotoPath_sound p _ _ _ hc.1, by simpa using hc.2⟩
    · simp at h
  · simp at h

/-- Screens reachable from the start (all "go to" edges), each with a path
that re-checks. -/
def verifiedReachable (p : Program) : List ScreenId :=
  ((bfs p (allGotoEdges p) p.start).filter fun sp =>
    isGotoPath p p.start sp.2 sp.1 && (p.screen? sp.1).isSome).map (·.1)

theorem verifiedReachable_sound (p : Program) (z : ScreenId) (h : z ∈ verifiedReachable p) :
    ReachableScreen p z ∧ (p.screen? z).isSome := by
  unfold verifiedReachable at h
  simp only [List.mem_map, List.mem_filter, Bool.and_eq_true] at h
  obtain ⟨sp, ⟨_, hpath, hscr⟩, rfl⟩ := h
  exact ⟨⟨_, isGotoPath_sound p _ _ _ hpath⟩, hscr⟩

end Ehr.Check
