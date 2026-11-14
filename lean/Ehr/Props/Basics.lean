import Ehr.Core.View
import Ehr.Core.Navigation

/-!
Shared property terms for the actual interpreter: init, step and view.
An episode holds one spec, program, patient's facts and user.
Reachable states include arbitrary human and macro events and passing time.
Shown components obey screen, group, tab, visibility and size rules.
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
  (commitButtons { canonical with screens := canonical.screens.filter (presetScreen prog.presetOwner) } ++ commitButtons prog).eraseDups.filter fun c =>
    match spec.commit? c with
    | some cs => cs.roles.contains prog.role
    | none => false

/-- Required commits for this episode exclude commits this user's role may not perform. -/
def requiredCommitsFor (spec : Spec) (canonical prog : Program) (facts : Facts)
    (user : User) : List CommitId :=
  (requiredCommits spec canonical prog).filter (commitRoleOk spec facts user)

/-- New specification for owner review.
Canonical-free required commits derived solely from `spec`: every commit in
`spec.commits` whose `roles` list includes `role`. Because `CommitSpec`
carries role and optional encounter-role scopes (`roles`, `encounterRoles?`)
but no workflow or persona tag (`W1`–`W7`, `P1`–`P5`), this set includes every
task the spec allows `role` to perform across all workflows. -/
def specRequiredCommits (spec : Spec) (role : Role) : List CommitId :=
  (spec.commits.filter fun cs => cs.roles.contains role).map (·.id)

/-- New specification for owner review.
Canonical-free required commits for one episode: the commits in
`specRequiredCommits spec role` that pass `commitRoleOk spec facts user`. -/
def specRequiredCommitsFor (spec : Spec) (role : Role) (facts : Facts)
    (user : User) : List CommitId :=
  (specRequiredCommits spec role).filter (commitRoleOk spec facts user)

/-! ## Shown -/

/-- Some component the page shows in state `s` satisfies `p`. -/
def ShowsSome (ep : Episode) (s : State) (p : Component → Prop) : Prop :=
  ∃ item ∈ (ep.screen s).items, item.shown = true ∧ p item.comp

/-- Info `i` (e.g. the allergy list) is shown on the current screen: a shown
banner, panel, table, or trend displays it. -/
def InfoShown (ep : Episode) (s : State) (i : InfoId) : Prop :=
  ShowsSome ep s fun comp => showsInfo i comp.kind = true

instance (ep : Episode) (s : State) (i : InfoId) : Decidable (InfoShown ep s i) := by
  unfold InfoShown ShowsSome; infer_instance

/-- A button for commit `c` is shown on the current screen. -/
def CommitButtonShown (ep : Episode) (s : State) (c : CommitId) : Prop :=
  ShowsSome ep s fun comp => comp.kind = .button (.commit c)

instance (ep : Episode) (s : State) (c : CommitId) : Decidable (CommitButtonShown ep s c) := by
  unfold CommitButtonShown ShowsSome; infer_instance

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

/-- The review requirement's waiver element (if it has one, e.g. the reason
CURES was not consulted) was entered by a human in this episode, is
confirmed, and is not empty. -/
def Waived (s : State) (rq : ReviewReq) : Prop :=
  waived s rq.waivedBy? = true

/-- Review requirement `rq` is met in state `s`: it does not apply, or its
info is shown, or a valid receipt covers it, or a human entered its waiver. -/
def ReviewMetIn (ep : Episode) (s : State) (rq : ReviewReq) : Prop :=
  Applies ep s rq.when → InfoShown ep s rq.info ∨ ReceiptCovers ep s rq ∨ (Waived s rq ∧ waiverEligible ep.facts s rq.waivedBy? = true)

/-- A captured value counts for element `el`: it is for `el`, confirmed,
valid for the element's kind (the right unit, a checked flag, a matching
patient ID or scan, a second user for a cosign), and entered by a human if
only a human may enter `el`. -/
def CountsFor (ep : Episode) (el : ElementSpec) (x : Captured) : Prop :=
  x.element = el.id ∧ x.confirmed = true ∧
    valueSatisfies ep.facts ep.user el.kind x.value = true ∧
    (needsHuman el = true → x.byHuman = true)

/-- The same captured value meets the requirement's optional allowed-value
list. Strings are parsed using the element's kind, so quantity constraints
retain units (e.g. only zero refills). An empty list permits no value. -/
def AllowedEntryValue (rq : EntryReq) (el : ElementSpec) (x : Captured) : Prop :=
  match rq.allowed? with
  | none => True
  | some values => ∃ text ∈ values, parseValue el.kind text = some x.value

/-- Entry requirement `rq` is met in state `s`. A per-order-line requirement
needs a counting value on every matching order line; any other requirement
needs one counting value (if it applies). The same value must satisfy the
requirement's allowed-value list. -/
def EntryMetIn (ep : Episode) (s : State) (rq : EntryReq) : Prop :=
  ∃ el, ep.spec.element? rq.element = some el ∧
    if rq.perOrderLine then
      ∀ line ∈ orderLines s, lineMatches ep.facts s rq.when line.1 line.2 = true →
        ∃ x ∈ s.captured, x.slot = line.1 ∧ CountsFor ep el x ∧ AllowedEntryValue rq el x
    else
      Applies ep s rq.when → ∃ x ∈ s.captured, CountsFor ep el x ∧ AllowedEntryValue rq el x

/-- A human must enter this element: it is human-only (marked, or an
identity, scan, or cosign), or its prefill policy is `never`. -/
def HumanMustEnter (el : ElementSpec) : Prop :=
  needsHuman el = true ∨ el.prefill = .never

instance (el : ElementSpec) : Decidable (HumanMustEnter el) := by
  unfold HumanMustEnter; infer_instance

/-- A convenience request action is not automated when its element requires
an explicit human entry. Other component kinds impose no extra condition. -/
def NoHumanRequest (spec : Spec) (kind : Kind) : Prop :=
  kind = .button .requestPriorAuth →
    ∀ el ∈ spec.element? priorAuthElement, ¬ HumanMustEnter el

instance (spec : Spec) (kind : Kind) : Decidable (NoHumanRequest spec kind) := by
  unfold NoHumanRequest; infer_instance

/-! ## Program structure helpers -/

/-- The kind name used in the spec's component catalog. -/
def kindName : Kind → String := Kind.catalogTag

/-- The element, slot, and prefill of a field component. -/
def fieldOf? : Kind → Option (ElementId × Slot × Prefill)
  | .field e slot pf => some (e, slot, pf)
  | _ => none

/-- The target screen of a "go to" button. -/
def gotoOf? : Kind → Option ScreenId
  | .button (.goto t) => some t
  | _ => none

/-- The commit of a commit button. -/
def commitOf? : Kind → Option CommitId
  | .button (.commit c) => some c
  | _ => none

/-- The info of a "mark reviewed" button. -/
def reviewOf? : Kind → Option InfoId
  | .button (.markReviewed i) => some i
  | _ => none

/-- The macro of a macro button. -/
def macroOf? : Kind → Option MacroId
  | .«macro» m => some m
  | _ => none

/-- The alert of an alert component, and whether it asks to pop up. -/
def alertOf? : Kind → Option (AlertId × Bool)
  | .alert a popup => some (a, popup)
  | _ => none

/-- The component a macro step types into or clicks. -/
def stepTarget? : MacroStep → Option CompId
  | .setValue cid _ => some cid
  | .click cid => some cid
  | .goto _ => none

/-- The component a macro step types into. -/
def setTarget? : MacroStep → Option CompId
  | .setValue cid _ => some cid
  | _ => none

/-- The component a macro step clicks. -/
def clickTarget? : MacroStep → Option CompId
  | .click cid => some cid
  | _ => none

/-- The screen a macro "go to" step goes to. -/
def gotoStep? : MacroStep → Option ScreenId
  | .goto t => some t
  | _ => none

/-- The record fact a prefill copies from. -/
def recordFactOf? : Prefill → Option String
  | .fromRecord f => some f
  | _ => none

/-- A group or a tab container. -/
def isContainer : Kind → Bool
  | .group .. | .tabs => true
  | _ => false

/-- A quantity (a number with a unit). -/
def isQuantity : ValueKind → Bool
  | .quantity _ => true
  | _ => false

/-- All components of a program, with the screen each is on. -/
def allComps (p : Program) : List (Screen × Component) :=
  p.screens.flatMap fun scr => scr.components.map (scr, ·)

/-- One click on a "go to" button of screen `a` leads to screen `b`. -/
def GotoEdge (p : Program) (a b : ScreenId) : Prop :=
  ∃ scr ∈ p.screens, scr.id = a ∧ ∃ comp ∈ scr.components, comp.kind = .button (.goto b)

instance (p : Program) (a b : ScreenId) : Decidable (GotoEdge p a b) := by
  unfold GotoEdge; infer_instance

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

/-- New specification for owner review (R3): the original a copy refers to, the
first non-copy component with that ID in screen order. -/
def copySource? (p : Program) (cid : CompId) : Option Component :=
  ((allComps p).find? fun sc => sc.2.id == cid && sc.2.copyOf?.isNone).map (·.2)

/-- New specification for owner review (R3): the tag a copy counts against. It is
the original's tag, or the copied component ID when the original is missing or
untagged. A component that is not a copy has none. The copy's own tag is
ignored, so renaming a copy cannot open a new budget. -/
def copyTag (p : Program) (c : Component) : Option String :=
  c.copyOf?.map fun cid =>
    match copySource? p cid with
    | some o => if o.tag != "" then o.tag else cid
    | none => cid

/-- New specification for owner review (R3): copies on `scr` counted against tag `t`. -/
def screenCopies (p : Program) (scr : Screen) (t : String) : Nat :=
  (scr.components.filter fun c => copyTag p c == some t).length

/-- New specification for owner review (R3): copies in the program counted against tag `t`. -/
def programCopies (p : Program) (t : String) : Nat :=
  ((allComps p).filter fun sc => copyTag p sc.2 == some t).length

/-- New specification for owner review (R3): copies in `prog` (by screen and
component ID) that were not copies on that screen in `prev`. -/
def addedCopies (prev prog : Program) : List (ScreenId × CompId) :=
  ((allComps prog).filterMap fun sc =>
      if sc.2.copyOf?.isSome then some (sc.1.id, sc.2.id) else none).eraseDups.filter fun k =>
    !(allComps prev).any fun sc => sc.2.copyOf?.isSome && sc.1.id == k.1 && sc.2.id == k.2

/-- The number of popup requests (alert components with `popup := true`) on
screens reachable from the start screen. -/
def popupRequestCount (p : Program) (reachable : List ScreenId) : Nat :=
  ((p.screens.filter fun scr => reachable.contains scr.id).flatMap fun scr =>
    scr.components.filter fun comp =>
      match comp.kind with
      | .alert _ true => true
      | _ => false).length

end Ehr.Props
