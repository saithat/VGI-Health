import Ehr.Core.View

/-!
# Property basics: episodes, reachable states, and what "shown" means

The properties in `Ehr.Props.Properties` talk about the real interpreter
(`Ehr.init`, `Ehr.step`, `Ehr.view`), the same code the app runs. This file
names the few ideas they share.

- An **episode** is one task: a spec, a UI program, one patient's facts, and
  the signed-in user.
- A state is **reachable** if some sequence of events gets there from the
  start of the episode. Events may come from the human or from a macro, and
  may be anything at all (a click on any ID, any typed value). Time may also
  pass between events. This is more than any real user could do, so a
  property that holds in every reachable state holds in every real one.
- A component is **shown** when the interpreter's screen view says so. That
  view is what the page is drawn from. It counts a component as shown only if
  it is on the current screen, every group above it is open, every tab
  container above it is on its tab, its visibility condition holds, and it is
  not tiny (see `Ehr.compShown`).
-/

namespace Ehr.Props

open Ehr

/-! ## Episodes -/

/-- One episode: a spec, a UI program, one patient's facts, and the user. -/
structure Episode where
  spec : Spec
  prog : Program
  facts : Facts
  user : User

namespace Episode

/-- The state at the start of the episode. -/
def start (ep : Episode) : State :=
  init ep.spec ep.prog ep.facts ep.user

/-- The state after one event by `actor`. -/
def next (ep : Episode) (actor : Actor) (s : State) (e : Event) : State :=
  (step ep.spec ep.prog ep.facts ep.user actor s e).1

/-- The state after the human performs a list of events, in order. -/
def afterHuman (ep : Episode) (s : State) (es : List Event) : State :=
  runAll ep.spec ep.prog ep.facts ep.user .human s es

/-- What the page shows in state `s` (the interpreter's screen view). -/
def screen (ep : Episode) (s : State) : ScreenView :=
  view ep.spec ep.prog ep.facts ep.user s

end Episode

/-! ## Reachable states -/

/-- The states an episode can reach from its start: by any event from the
human or from a macro, or by time passing. -/
inductive Reachable (ep : Episode) : State → Prop
  /-- The start of the episode. -/
  | start : Reachable ep ep.start
  /-- One more event, by the human or by a macro. -/
  | step {s : State} (actor : Actor) (e : Event) :
      Reachable ep s → Reachable ep (ep.next actor s e)
  /-- Time passes (the app advances the clock; receipts may expire). -/
  | wait {s : State} (d : Nat) :
      Reachable ep s → Reachable ep { s with clock := s.clock + d }

/-- A property that holds in every reachable state of the episode. -/
def Always (ep : Episode) (P : State → Prop) : Prop :=
  ∀ s, Reachable ep s → P s

/-- A property of every event taken from a reachable state: `P s actor e`
relates a reachable state `s` to the event `e` performed in it. -/
def EveryStep (ep : Episode) (P : State → Actor → Event → Prop) : Prop :=
  ∀ s, Reachable ep s → ∀ actor e, P s actor e

/-! ## Commits -/

/-- The event performs commit `c`: `c` was not done before and is done after. -/
def CommitHappens (ep : Episode) (s : State) (actor : Actor) (e : Event) (c : CommitId) : Prop :=
  c ∉ s.commits ∧ c ∈ (ep.next actor s e).commits

/-- The commits listed on commit buttons of a program. -/
def commitButtons (p : Program) : List CommitId :=
  p.screens.flatMap fun scr => scr.components.filterMap fun comp =>
    match comp.kind with
    | .button (.commit c) => some c
    | _ => none

/-- The commits a program must let its user complete: those on a commit
button of the canonical program or of the program itself, that the spec
lets the program's role perform. -/
def requiredCommits (spec : Spec) (canonical prog : Program) : List CommitId :=
  (commitButtons canonical ++ commitButtons prog).eraseDups.filter fun c =>
    match spec.commit? c with
    | some cs => cs.roles.contains prog.role
    | none => false

/-! ## Shown -/

/-- Some component the page shows in state `s` satisfies `p`. -/
def ShowsSome (ep : Episode) (s : State) (p : Component → Prop) : Prop :=
  ∃ item ∈ (ep.screen s).items, item.shown = true ∧ p item.comp

/-- Info `i` (e.g. the allergy list) is shown on the current screen: a shown
banner, panel, table, or trend displays it. -/
def InfoShown (ep : Episode) (s : State) (i : InfoId) : Prop :=
  ShowsSome ep s fun comp => showsInfo i comp.kind = true

/-- A button for commit `c` is shown on the current screen. -/
def CommitButtonShown (ep : Episode) (s : State) (c : CommitId) : Prop :=
  ShowsSome ep s fun comp => comp.kind = .button (.commit c)

/-- An alert component for alert `a` is shown on the current screen. -/
def AlertShownInline (ep : Episode) (s : State) (a : AlertId) : Prop :=
  ShowsSome ep s fun comp => ∃ popup, comp.kind = .alert a popup

/-! ## Requirements that apply in a state -/

/-- The condition `w` of a requirement holds in state `s` (e.g. "some order
line is an antibiotic"). -/
def Applies (ep : Episode) (s : State) (w : When) : Prop :=
  whenHolds ep.facts s w = true

/-- A valid receipt covers review requirement `rq` in state `s`: the mode
allows receipts, and a receipt is for the same info and data version, not
older than the window, and from an allowed role. -/
def ReceiptCovers (ep : Episode) (s : State) (rq : ReviewReq) : Prop :=
  match rq.mode with
  | .shownOnCommit => False
  | .shownOrReceipt window roles =>
    ∃ r ∈ s.receipts, receiptValid ep.spec ep.facts (nowMin ep.facts s) rq.info window roles r = true

/-- Review requirement `rq` is met in state `s`: it does not apply, or its
info is shown, or a valid receipt covers it. -/
def ReviewMetIn (ep : Episode) (s : State) (rq : ReviewReq) : Prop :=
  Applies ep s rq.when → InfoShown ep s rq.info ∨ ReceiptCovers ep s rq

/-- A captured value counts for element `el`: it is for `el`, confirmed,
valid for the element's kind (the right unit, a checked flag, a matching
patient ID or scan, a second user for a cosign), and entered by a human if
only a human may enter `el`. -/
def CountsFor (ep : Episode) (el : ElementSpec) (x : Captured) : Prop :=
  x.element = el.id ∧ x.confirmed = true ∧
    valueSatisfies ep.facts ep.user el.kind x.value = true ∧
    (needsHuman el = true → x.byHuman = true)

/-- Entry requirement `rq` is met in state `s`. A per-order-line requirement
needs a counting value on every matching order line; any other requirement
needs one counting value (if it applies). -/
def EntryMetIn (ep : Episode) (s : State) (rq : EntryReq) : Prop :=
  ∃ el, ep.spec.element? rq.element = some el ∧
    if rq.perOrderLine then
      ∀ line ∈ orderLines s, lineMatches ep.facts rq.when line.2 = true →
        ∃ x ∈ s.captured, x.slot = line.1 ∧ CountsFor ep el x
    else
      Applies ep s rq.when → ∃ x ∈ s.captured, CountsFor ep el x

/-- A human must enter this element: it is human-only (marked, or an
identity, scan, or cosign), or its prefill policy is `never`. -/
def HumanMustEnter (el : ElementSpec) : Prop :=
  needsHuman el = true ∨ el.prefill = .never

/-! ## Program structure helpers -/

/-- The kind name used in the spec's component catalog. -/
def kindName : Kind → String
  | .banner => "banner"
  | .field .. => "field"
  | .panel _ => "panel"
  | .table _ => "table"
  | .trend _ => "trend"
  | .alert .. => "alert"
  | .button _ => "button"
  | .group .. => "group"
  | .tabs => "tabs"
  | .«macro» _ => "macro"
  | .search _ => "search"

/-- All components of a program, with the screen each is on. -/
def allComps (p : Program) : List (Screen × Component) :=
  p.screens.flatMap fun scr => scr.components.map (scr, ·)

/-- One click on a "go to" button of screen `a` leads to screen `b`. -/
def GotoEdge (p : Program) (a b : ScreenId) : Prop :=
  ∃ scr ∈ p.screens, scr.id = a ∧ ∃ comp ∈ scr.components, comp.kind = .button (.goto b)

/-- A path of "go to" clicks: `GotoPath p a hops z` says that following the
screens in `hops` one click at a time leads from `a` to `z`. -/
inductive GotoPath (p : Program) : ScreenId → List ScreenId → ScreenId → Prop
  | here (a : ScreenId) : GotoPath p a [] a
  | hop {a b z : ScreenId} {rest : List ScreenId} :
      GotoEdge p a b → GotoPath p b rest z → GotoPath p a (b :: rest) z

/-- Screen `z` can be reached from the program's start screen with at most
`n` "go to" clicks. -/
def WithinClicks (p : Program) (n : Nat) (z : ScreenId) : Prop :=
  ∃ hops, GotoPath p p.start hops z ∧ hops.length ≤ n

/-- The screens reachable from the start screen by "go to" clicks. -/
def ReachableScreen (p : Program) (z : ScreenId) : Prop :=
  ∃ hops, GotoPath p p.start hops z

/-- Where the original (non-copy) component with tag `t` sits: its screen and
its parent. -/
def placeOf (p : Program) (t : String) : Option (ScreenId × Option CompId) :=
  p.screens.findSome? fun scr =>
    (scr.components.find? fun c => c.tag == t && c.copyOf?.isNone).map fun c => (scr.id, c.parent?)

/-- The tags whose original component moved between `prev` and `prog`: same
tag, different screen or parent. Copies are ignored; empty tags never count. -/
def movedTags (prev prog : Program) : List String :=
  ((allComps prog).filterMap fun sc =>
      if sc.2.tag != "" && sc.2.copyOf?.isNone then some sc.2.tag else none).eraseDups.filter fun t =>
    match placeOf prev t, placeOf prog t with
    | some a, some b => a != b
    | _, _ => false

/-- The program asks alert `a` to pop up on screen `scr`. -/
def PopupRequested (scr : Screen) (a : AlertId) : Prop :=
  ∃ comp ∈ scr.components, comp.kind = .alert a true

/-- The number of popup requests (alert components with `popup := true`) on
screens reachable from the start screen. -/
def popupRequestCount (p : Program) (reachable : List ScreenId) : Nat :=
  ((p.screens.filter fun scr => reachable.contains scr.id).flatMap fun scr =>
    scr.components.filter fun comp =>
      match comp.kind with
      | .alert _ true => true
      | _ => false).length

end Ehr.Props
