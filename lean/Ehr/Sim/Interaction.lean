import Ehr.Sim.Metrics
import Ehr.Core.View
import Std.Data.HashSet

namespace Ehr.Sim
open Ehr

/-- Fixed inputs for an episode; every transition uses the public interpreter. -/
structure Context where
  sp : Spec
  prog : Program
  facts : Facts
  user : User
  goals : Goals

def Context.next (ctx : Context) (s : State) (e : Event) : State :=
  (step ctx.sp ctx.prog ctx.facts ctx.user .human s e).1

def Context.done (ctx : Context) (s : State) : Bool :=
  goalsMet ctx.sp ctx.facts ctx.user ctx.goals s

def shown (ctx : Context) (s : State) : List Component :=
  let cs := ctx.prog.compsOf s.screen
  cs.filter (compShown ctx.sp ctx.facts s cs)

/-- A confirm is useful only if the pending value meets the goal once
confirmed, including human-only and chosen-value checks. -/
def fieldAction (ctx : Context) (s : State) (c : Component) : Option Event := do
  let .field e sl _ := c.kind | none
  let alternatives := ctx.goals.waivers.filter fun g => ctx.sp.reviews.any fun rq =>
    rq.waivedBy? == some g.element && rq.commit == g.commit &&
      whenHolds ctx.facts s rq.when && !reviewMet ctx.sp ctx.prog ctx.facts s rq
  let g ← (ctx.goals.values ++ alternatives).find? fun g =>
    g.element == e && (g.slot?.isNone || g.slot? == some (resolveSlot s sl)) &&
      !valueGoalMet ctx.sp ctx.facts ctx.user s g
  let el ← ctx.sp.element? e
  if !el.enteredBy.contains ctx.user.role then none else
  let pending := s.captured.any fun x =>
    x.element == e && x.slot == resolveSlot s sl && !x.confirmed &&
      capturedMeets ctx.facts ctx.user el g { x with confirmed := true }
  some (if pending then .confirm c.id else .enter c.id (goalValue ctx.sp ctx.facts ctx.user g))

def canAdvance (ctx : Context) (s : State) : Bool :=
  ctx.goals.values.any (fun g => g.slot?.isSome && g.slot?.getD 0 > s.currentSlot) &&
  ctx.goals.values.all (fun g => match g.slot? with
    | some n => n > s.currentSlot || valueGoalMet ctx.sp ctx.facts ctx.user s g
    | none => true)

/-- Tab indices that the program actually uses (no invented tab labels). -/
def tabEvents (cs : List Component) (c : Component) : List Event :=
  ((cs.filter (·.parent? == some c.id)).map (·.tab)).eraseDups.map (.selectTab c.id ·)


def usefulReview (ctx : Context) (s : State) (i : InfoId) : Bool :=
  ctx.goals.commits.any fun cm => !s.commits.contains cm &&
    ctx.sp.reviews.any (fun rq => rq.commit == cm && rq.info == i &&
      whenHolds ctx.facts s rq.when &&
      (match rq.mode with
       | .shownOnCommit => false
       | .shownOrReceipt w roles => !s.receipts.any
          (receiptValid ctx.sp ctx.facts (nowMin ctx.facts s) rq.info w roles)))

/-- A leaf that can reveal an unmet field, required review, or goal commit.
Goto/Back buttons are retained as possible transit routes. -/
def interestingLeaf (ctx : Context) (s : State) (c : Component) : Bool :=
  (fieldAction ctx s c).isSome ||
    (match c.kind with
    | .button (.goto _) | .button .back => true
    | .button .newOrderLine => canAdvance ctx s
    | .button (.markReviewed i) => usefulReview ctx s i
    | .button (.commit cm) => ctx.goals.commits.contains cm && !s.commits.contains cm
    | _ => ctx.sp.reviews.any fun rq => ctx.goals.commits.contains rq.commit &&
        !s.commits.contains rq.commit && showsInfo rq.info c.kind && whenHolds ctx.facts s rq.when)

def relevantAux (ctx : Context) (s : State) (cs : List Component) : Nat → Component → Bool
  | 0, _ => false
  | n + 1, c => interestingLeaf ctx s c || cs.any (fun child =>
      child.parent? == some c.id && relevantAux ctx s cs n child)

/-- Real BFS navigation. Closing a group cannot reveal a previously hidden
field/review, so only useful openings are explored. Tabs without any route to
an unmet goal/review are omitted. Full minimum search retains all toggles.
Search and scroll do not change state and are charged separately by policy. -/
def navigation (ctx : Context) (s : State) (allowBack := true) : List Event :=
  let cs := ctx.prog.compsOf s.screen
  let relevant := relevantAux ctx s cs (cs.length + 1)
  (shown ctx s).flatMap fun c => match c.kind with
    | .button (.goto _) => [.click c.id]
    | .button .back => if allowBack then [.click c.id] else []
    | .button .newOrderLine => if canAdvance ctx s then [.click c.id] else []
    | .group true _ => if !s.expanded.contains c.id && relevant c then [.click c.id] else []
    | .tabs => ((cs.filter (fun child => child.parent? == some c.id && relevant child)).map (·.tab)).eraseDups.map (.selectTab c.id ·)
    | _ => []

/-- A field, a currently possible goal commit, or a needed review receipt. -/
def actions (ctx : Context) (s : State) : List Event :=
  (shown ctx s).filterMap fun c =>
    match fieldAction ctx s c with
    | some e => some e
    | none => match c.kind with
      | .button (.commit cm) =>
        if ctx.goals.commits.contains cm && !s.commits.contains cm &&
          commitValuesMet ctx.sp ctx.facts ctx.user ctx.goals s cm &&
          guardBase ctx.sp ctx.prog ctx.facts ctx.user s cm then some (.click c.id) else none
      | .button (.markReviewed i) =>
        if usefulReview ctx s i && infoShown ctx.sp ctx.prog ctx.facts s i
          then some (.click c.id) else none
      | _ => none

/-- Structural insertion sort, so small certificate examples reduce in kernel. -/
def insertString (x : String) : List String → List String
  | [] => [x]
  | y :: ys => if x ≤ y then x :: y :: ys else y :: insertString x ys

def sortStrings (xs : List String) : List String := xs.foldr insertString []

def navKey (s : State) : String :=
  encodeJson (s.screen, sortStrings s.expanded, sortStrings (s.tabSel.map encodeJson), s.currentSlot)

/-- BFS uses real steps and replans after each event. Its key deliberately
forgets history, and normalizes the order of expansion/tab selections. -/
def bfsNav (ctx : Context) : Nat → List (State × List Event) → Std.HashSet String → Option (List Event)
  | 0, _, _ => none
  | _ + 1, [], _ => none
  | fuel + 1, (s, rev) :: queue, seen =>
    if !(actions ctx s).isEmpty then some rev.reverse else
    let (queue', seen') := (navigation ctx s).foldl (fun (q, v) e =>
      let t := ctx.next s e
      let k := navKey t
      if v.contains k then (q, v) else (q ++ [(t, e :: rev)], v.insert k)) (queue, seen)
    bfsNav ctx fuel queue' seen'

def planNavigation (ctx : Context) (s : State) : Option (List Event) :=
  bfsNav ctx (max 128 (ctx.prog.screens.length * 64)) [(s, [])] (({} : Std.HashSet String).insert (navKey s))

end Ehr.Sim
