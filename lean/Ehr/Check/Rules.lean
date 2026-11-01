import Ehr.Check.Graph
import Ehr.Props.Properties

/-!
# Checker rules that go beyond the property text

Some properties quantify over every reachable state (for example "whenever the
sign button is shown, the allergy list is shown too"). The checker cannot run
every state, so it tests a simple fact about the program text that is enough:
the information is *pinned* on the screen, meaning no click can hide it. T1
proves that each such rule implies its property.

- `fixedShown`: a component no click can hide: not tiny, always visible, and
  every ancestor a non-collapsible group with the same property.
- `pinnedForReview`: a component that keeps a review requirement met on its
  screen: it displays the info, is not tiny, every ancestor is a
  non-collapsible group that is fixed-shown, and it is either always visible,
  or hidden only by a receipt that also counts for this requirement.
-/

namespace Ehr.Check

open Ehr Ehr.Props

/-- A non-collapsible group: it is always open. -/
def isOpenGroup : Kind → Bool
  | .group false _ => true
  | _ => false

/-- A component no click can hide (with the interpreter's step bound). -/
def fixedShownAux (comps : List Component) : Nat → Component → Bool
  | 0, _ => false
  | fuel + 1, c =>
    c.size != .tiny && c.visibility == .always &&
      match c.parent? with
      | none => true
      | some pid =>
        match comps.find? (·.id == pid) with
        | none => false
        | some p => isOpenGroup p.kind && fixedShownAux comps fuel p

/-- A component no click can hide. -/
def fixedShown (comps : List Component) (c : Component) : Bool :=
  fixedShownAux comps (comps.length + 1) c

/-- Every ancestor of `c` is a non-collapsible group that no click can hide. -/
def parentsFixed (comps : List Component) (c : Component) : Bool :=
  match c.parent? with
  | none => true
  | some pid =>
    match comps.find? (·.id == pid) with
    | none => false
    | some p => isOpenGroup p.kind && fixedShownAux comps comps.length p

/-- A receipt that hides info `rq.info` (valid for *some* receipt-accepting
requirement on that info) also counts for `rq`: `rq` accepts receipts, and
every receipt-accepting requirement on the same info has a window no longer
and roles no wider than `rq`'s. -/
def receiptHideSafe (spec : Spec) (rq : ReviewReq) : Bool :=
  match rq.mode with
  | .shownOnCommit => false
  | .shownOrReceipt w roles =>
    spec.reviews.all fun rq' =>
      rq'.info != rq.info ||
        match rq'.mode with
        | .shownOnCommit => true
        | .shownOrReceipt w' roles' => decide (w' ≤ w) && roles'.all (roles.contains ·)

/-- The component keeps review requirement `rq` met on its screen. -/
def pinnedForReview (spec : Spec) (comps : List Component) (rq : ReviewReq) (c : Component) : Bool :=
  showsInfo rq.info c.kind && c.size != .tiny && parentsFixed comps c &&
    match c.visibility with
    | .always => true
    | .unlessReceipt i => i == rq.info && receiptHideSafe spec rq

/-- Every review requirement for commit `c` without a waiver has a pinned
component on `scr`. -/
def reviewsPinnedOn (spec : Spec) (scr : Screen) (c : CommitId) : Bool :=
  spec.reviews.all fun rq =>
    rq.commit != c || rq.waivedBy?.isSome || scr.components.any (pinnedForReview spec scr.components rq)

/-- Rule for property 4: every screen with a commit button pins every review
requirement of that commit. -/
def reviewsPinned (spec : Spec) (prog : Program) : Bool :=
  prog.screens.all fun scr =>
    scr.components.all fun comp =>
      match commitOf? comp.kind with
      | some c => reviewsPinnedOn spec scr c
      | none => true

/-- Rule for landmarks: every screen has a fixed-shown component for each
landmark. -/
def landmarksPinned (spec : Spec) (prog : Program) : Bool :=
  prog.screens.all fun scr =>
    spec.design.landmarks.all fun l =>
      scr.components.any fun c => showsInfo l c.kind && fixedShown scr.components c

/-- Every candidate screen of a targeted workflow pins the passive alert. -/
def passivePinned (spec : Spec) (prog : Program) : Bool :=
  spec.alerts.all fun al =>
    al.tier != .passive || prog.screens.all fun scr =>
      !al.targetsScreen scr || scr.components.any fun c =>
        (match alertOf? c.kind with
         | some a => a.1 == al.id
         | none => false) && fixedShown scr.components c

/-- A targeted canonical workflow cannot disappear by renaming its screens. -/
def passiveScreensKept (spec : Spec) (canonical prog : Program) : Bool :=
  spec.alerts.all fun al =>
    al.tier != .passive || canonical.screens.all fun scr =>
      !al.targetsScreen scr || prog.screens.any (·.workflow == scr.workflow)

/-- Every record prefill names the source declared by that spec element. -/
def recordSourcesDeclared (spec : Spec) (prog : Program) : Bool :=
  (allComps prog).all fun sc =>
    match fieldOf? sc.2.kind with
    | some (e, _, .fromRecord fact) =>
      (spec.element? e).any (fun el => el.recordFact? == some fact)
    | _ => true

/-- Linked prefill copies a value without conversion, so its source must be
known and have the same kind (including the quantity unit). This also rules
out ill-typed prefilled state being stranded on an archived order line. -/
def linkedSourcesTyped (spec : Spec) (prog : Program) : Bool :=
  (allComps prog).all fun sc =>
    match fieldOf? sc.2.kind with
    | some (e, _, .linked source) =>
      match spec.element? e, spec.element? source with
      | some target, some src => target.kind == src.kind
      | _, _ => false
    | _ => true

/-! ## Completability rules -/

/-- Screens with a commit button for `c` that can always be made shown. -/
def commitScreens (prog : Program) (c : CommitId) : List ScreenId :=
  prog.screens.filterMap fun scr =>
    if scr.components.any (fun comp => commitOf? comp.kind == some c && revealable scr.components comp)
    then some scr.id else none

/-- Screens reachable from `a` by "go to" buttons that can always be made shown
(including `a`). -/
def openReach (prog : Program) (a : ScreenId) : List ScreenId :=
  (bfs prog (openGotoEdges prog) a).map (·.1)

/-- The program has an "add order line" button. -/
def hasNewLine (prog : Program) : Bool :=
  (allComps prog).any fun sc => sc.2.kind == .button .newOrderLine

/-- The order-line slot a field binds to when there is no "add order line"
button (`current` is then always 0). -/
def fixedSlot : Slot → Nat
  | .fixed n => n
  | .current => 0

/-- Slots that can receive a drug, including dynamically selected current slots. -/
def drugSlots (prog : Program) : List Slot :=
  ((allComps prog).filterMap fun sc =>
    match fieldOf? sc.2.kind with
    | some f => if f.1 == drugElement then some f.2.1 else none
    | none => none).eraseDups

/-- A fixed-slot field can still edit an archived line after the current
slot advances. Such writes must not strand a per-line requirement (including
one newly triggered by changing a naloxone-risk dose/frequency). Current-slot
fields alone cannot repair that archived line. -/
def repairSlots (spec : Spec) (prog : Program) (c : CommitId) : List Slot :=
  let reqs := spec.entries.filter fun rq => rq.commit == c && rq.perOrderLine
  let fixed : List Slot := (allComps prog).filterMap fun sc =>
    match fieldOf? sc.2.kind with
    | some (e, .fixed n, _) =>
      if reqs.any (fun rq => rq.element == e ||
          (rq.when == .naloxoneRisk && (e == doseElement || e == freqElement)))
      then some (.fixed n) else none
    | _ => none
  (drugSlots prog ++ fixed).eraseDups

/-- A field can repair the drug field's slot. With add-line navigation,
current fields repair only the current line; fixed fields repair their own
line. Without it, current is always slot zero. -/
def repairsSlot (prog : Program) (drug field : Slot) : Bool :=
  if hasNewLine prog then drug == field else fixedSlot drug == fixedSlot field

/-- A field for element `e` that can always be made shown, on one of
`screens`, bound to a slot accepted by `slotOk`. -/
def openFieldOn (prog : Program) (screens : List ScreenId) (e : ElementId)
    (slotOk : Slot → Bool) : Bool :=
  prog.screens.any fun scr =>
    screens.contains scr.id &&
      scr.components.any fun c =>
        match fieldOf? c.kind with
        | some f => f.1 == e && slotOk f.2.1 && revealable scr.components c
        | none => false

/-- A waiver must admit a nonempty value for every record in the property
 domain. A wristband/medication target may be the empty code; its scan would
 then be valid but would not count as a nonempty waiver. Other kinds always
 have a nonempty human-enterable witness. -/
def waiverHasNonemptyValue (spec : Spec) (e : ElementId) : Bool :=
  (spec.element? e).any fun el =>
    match el.kind with
    | .scan target => target != "wristband" && target != "medication"
    | _ => true

/-- Why commit `c` might not stay reachable, or `none` if the program passes
the completability rules for `c` with commit screen `s`:
- every screen reaches `s` by buttons the user can always show;
- each entry requirement of `c` has a field reachable from `s`;
- each review requirement of `c` with a waiver has its info pinned on `s`, or
  a field for the waiver element reachable from `s`;
- per-order-line requirements: every drug slot has a matching reachable field
  for each per-line element. CR-1 prevents leaving an unfinished current line. -/
def completeVia (spec : Spec) (prog : Program) (c : CommitId) (s : ScreenId) : Option (ScreenId × String) :=
  match prog.screens.find? (fun x => !(openReach prog x.id).contains s) with
  | some x => some (x.id, s!"commit {c}: from screen {x.id} the user cannot get back to the {c} button on screen {s}")
  | none =>
    let fromS := openReach prog s
    let reqs := spec.entries.filter (·.commit == c)
    match reqs.find? (fun rq => !rq.perOrderLine && !openFieldOn prog fromS rq.element (fun _ => true)) with
    | some rq => some (s, s!"commit {c}: no field the user can reach for required element {rq.element}")
    | none =>
    let scrComps := prog.compsOf s
    let waivable := spec.reviews.filter fun rq => rq.commit == c && rq.waivedBy?.isSome
    match waivable.find? (fun rq =>
        !scrComps.any (pinnedForReview spec scrComps rq) &&
        !(match rq.waivedBy? with
          | some w => waiverHasNonemptyValue spec w && openFieldOn prog fromS w (fun _ => true)
          | none => false)) with
    | some rq => some (s, s!"commit {c}: {rq.info} is not shown on screen {s} and the user cannot reach " ++
        s!"a field to enter its waiver")
    | none =>
      let perLine := reqs.filter (·.perOrderLine)
      match (repairSlots spec prog c).findSome? (fun slot =>
          (perLine.find? fun rq => !openFieldOn prog fromS rq.element (repairsSlot prog slot)).map (slot, ·)) with
      | some (slot, rq) => some (s, s!"commit {c}: order slot {repr slot} has no field the user can reach for {rq.element}")
      | none => none

/-- A parsed scalar value that satisfies its kind for every patient and user.
Identity, targeted scans and cosigns depend on that context and cannot use a
fixed allowed list as a universal completion witness. -/
def universallyValid : ValueKind → Value → Bool
  | .quantity unit, .qty _ actual => actual == unit
  | .coded _, .code code => !code.isEmpty
  | .text, .text _ => true
  | .flag, .flag checked => checked
  | _, _ => false

/-- Allowed-value constraints for one element share a valid completion value.
A sole waiver must also be nonempty. Checking intersections prevents two
requirements on the same capture from demanding incompatible values. -/
def entryValuesPossible (spec : Spec) (c : CommitId) : Bool :=
  let reqs := spec.entries.filter (·.commit == c)
  reqs.all fun rq =>
    match spec.element? rq.element with
    | none => false
    | some el =>
      match reqs.findSome? (fun other => if other.element == rq.element then other.allowed? else none) with
      | none => true
      | some values => values.any fun text =>
        match parseValue el.kind text with
        | none => false
        | some value =>
          universallyValid el.kind value &&
          (!(spec.reviews.any fun review => review.commit == c && review.waivedBy? == some rq.element) || value.nonEmpty) &&
          reqs.all (fun other => other.element != rq.element || entryValueAllowed el other.allowed? value)

/-- The completability rules for commit `c`: some commit screen passes
`completeVia`. Returns the first failure if none does. -/
def completeFor (spec : Spec) (prog : Program) (c : CommitId) : Option (Option ScreenId × String) :=
  if !entryValuesPossible spec c then
    some (none, s!"commit {c}: allowed entry values have no common context-independent completion value")
  else match commitScreens prog c with
  | [] => some (none, s!"commit {c}: no button for it that the user can always see")
  | s :: rest =>
    if (s :: rest).any (fun x => (completeVia spec prog c x).isNone) then none
    else (completeVia spec prog c s).map fun p => (some p.1, p.2)

end Ehr.Check
