import Ehr.Core.Guard

/-!
The interpreter applies events to the current patient state.
Every new commit must pass the guard. Macros cannot perform human-only actions.
Prefills obey the element policy; an open popup blocks other actions.
The app and native command-line tool call these same functions.
-/

namespace Ehr

/-! ## Slots and captured values -/

/-- The order line a field is bound to now. -/
def resolveSlot (s : State) : Slot → Nat
  | .fixed n => n
  | .current => s.currentSlot

/-- Something is captured for this element on this slot. -/
def hasEntry (s : State) (e : ElementId) (n : Nat) : Bool :=
  s.captured.any fun x => x.element == e && x.slot == n

/-- Follow each dependency once, stopping when no new element is found. -/
def linkedClosure (l : List Captured) (ids : List ElementId) : Nat → List ElementId
  | 0 => ids
  | fuel + 1 =>
    let next := (ids ++ l.filterMap (fun y =>
      if ids.any (fun e => y.provenance? == some ("linked:" ++ e)) then some y.element else none)).eraseDups
    if next.length == ids.length then ids else linkedClosure l next fuel

/-- Captures linked directly or transitively to a source element. -/
def linkedDependents (l : List Captured) (source : ElementId) : List ElementId :=
  (linkedClosure l [source] l.length).filter (· != source)

@[simp] theorem linkedDependents_not_self (l : List Captured) (e : ElementId) :
    e ∉ linkedDependents l e := by simp [linkedDependents]

/-- Store a value and discard its superseded linked copies. A changed source
marks future copies as pending human confirmation. -/
def storedCapture (l : List Captured) (x : Captured) : Captured :=
  { x with provenance? :=
    -- New specification for owner review: re-entering a value on a line that
    -- awaits transfer reconciliation keeps it awaiting the explicit decision.
    if l.any (fun y => y.element == x.element && y.slot == x.slot && y.provenance? == some reconcileTag)
    then some reconcileTag else
    if (!(linkedDependents l x.element).isEmpty && l.any (fun y =>
      y.element == x.element && y.slot == x.slot && y.value != x.value)) ||
      l.any (fun y => y.element == x.element && y.slot == x.slot && y.provenance? == some "linked-source-changed")
    then some "linked-source-changed" else x.provenance? }

/-- Replace the capture at this element and slot, and discard linked values
whose source was changed. -/
def setCaptured (l : List Captured) (x : Captured) : List Captured :=
  let superseded := l.any (fun old => old.element == x.element &&
    (old.value != x.value || old.confirmed != x.confirmed))
  let dependents := if superseded then linkedDependents l x.element else []
  l.filter (fun y => !(y.element == x.element && y.slot == x.slot) &&
    !dependents.contains y.element) ++ [storedCapture l x]

/-! ## Prefill (on screen entry) -/

/-- The value a `linked` prefill copies: the source element on the same slot,
else on any slot. -/
def linkedSource? (s : State) (e : ElementId) (slot : Nat) : Option Captured :=
  match s.captured.find? (fun x => x.element == e && x.slot == slot) with
  | some x => some x
  | none => s.captured.find? (·.element == e)

/-- The captured value a field's prefill would create for element `e`
(spec `el`) on slot `n`. Prefilled values are never by a human and are
unconfirmed, except an `autoLinked` element copied from a confirmed value. -/
def prefillRecord (facts : Facts) (s : State) (e : ElementId) (el : ElementSpec) (n : Nat) :
    Prefill → Option Captured
  | .none => none
  | .fromRecord f =>
    if el.recordFact? != some f then none else
    (recordValue facts el.kind f).map fun v =>
      { element := e, slot := n, value := v, byHuman := false, confirmed := false
        provenance? := some ("record:" ++ f), enteredAt? := epochNow facts s }
  | .default d =>
    (parseElementValue s el n d).map fun v =>
      { element := e, slot := n, value := v, byHuman := false, confirmed := false
        provenance? := some "default", enteredAt? := epochNow facts s }
  | .linked src =>
    (linkedSource? s src n).map fun x =>
      { element := e, slot := n, value := x.value, byHuman := false
        confirmed := el.prefill == .autoLinked && x.confirmed && x.provenance? != some "linked-source-changed"
        provenance? := some ("linked:" ++ src), enteredAt? := epochNow facts s }

/-- Validate generated prefills, preserving the original policy/source rules. -/
def prefillValueValid (facts : Facts) (s : State) (el : ElementSpec) (n : Nat) (pf : Prefill) : Bool :=
  (el.defaultValue?.all (fun expected => pf == .default expected)) &&
    (prefillRecord facts s el.id el n pf).all (fun x => elementValueValid facts s el n x.value)

/-- Prefill one field, if allowed: the element is known, its policy is not
`never`, it is not human-only, and nothing is captured on that slot yet. -/
def prefillField (sp : Spec) (facts : Facts) (s : State) (c : Component) : State :=
  match c.kind with
  | .field e slot pf =>
    match sp.element? e with
    | none => s
    | some el =>
      let n := resolveSlot s slot
      if el.prefill == .never || needsHuman el || (hasEntry s e n || !prefillValueValid facts s el n pf) then s
      else
        match prefillRecord facts s e el n pf with
        | none => s
        | some x => { s with captured := s.captured ++ [x] }
  | _ => s

/-- Prefill every field of the current screen. -/
def prefillScreen (sp : Spec) (prog : Program) (facts : Facts) (s : State) : State :=
  (prog.compsOf s.screen).foldl (prefillField sp facts) s

/-! ## Navigation -/

/-- Go to a screen (pushing the current one on the history), then prefill. -/
def goTo (sp : Spec) (prog : Program) (facts : Facts) (s : State) (target : ScreenId) :
    State × StepResult :=
  match prog.screen? target with
  | none => (s, .ignored)
  | some _ =>
    (prefillScreen sp prog facts { s with screen := target, history := s.screen :: s.history }, .ok)

/-- Go back to the previous screen, then prefill. -/
def goBack (sp : Spec) (prog : Program) (facts : Facts) (s : State) : State × StepResult :=
  match s.history with
  | [] => (s, .ignored)
  | h :: t => (prefillScreen sp prog facts { s with screen := h, history := t }, .ok)

/-! ## Buttons -/

/-- Click a commit button (human only; see `clickCore`). Already done: ignored.
Guard items 1–3 fail: blocked with the reason. Otherwise, if an alert must pop
up first, it becomes the popup and the click is blocked. Otherwise, if every
interruptive alert is acknowledged, the commit is recorded. -/
def clickCommit (sp : Spec) (prog : Program) (facts : Facts) (user : User) (s : State)
    (c : CommitId) : State × StepResult :=
  if s.commits.contains c then (s, .ignored)
  else if guardBase sp prog facts user s c then
    match popupCandidates sp prog facts s c with
    | p :: _ => ({ s with popup? := some p }, .blocked "alert")
    | [] =>
      if alertsAcked sp facts s c then ({ s with commits := s.commits ++ [c] }, .ok)
      else (s, .blocked "alert")
  else (s, .blocked (guardReason sp prog facts user s c))

/-- Open the clicked alert's first pending popup candidate. Passive alerts,
unknown/nonfiring alerts and already-acknowledged keys do not open. This never
acknowledges anything; removable alerts still require the program's popup opt-in. -/
def clickAlert (sp : Spec) (prog : Program) (facts : Facts) (s : State)
    (a : AlertId) : State × StepResult :=
  match sp.alert? a with
  | none => (s, .ignored)
  | some al =>
    match (popupCandidates sp prog facts s al.commit).find? (·.1 == a) with
    | none => (s, .ignored)
    | some p => ({ s with popup? := some p }, .ok)

/-- Mark an info reviewed (human only): only while it is shown on the current
screen. Adds a receipt with the current data version, time, role, and user. -/
def markReviewed (sp : Spec) (prog : Program) (facts : Facts) (user : User) (s : State)
    (i : InfoId) : State × StepResult :=
  if !infoShown sp prog facts s i then (s, .blocked s!"review: {i} is not shown")
  else
    match infoVersion sp facts i with
    | none => (s, .blocked s!"review: unknown info {i}")
    | some v =>
      ({ s with receipts := s.receipts ++
          [{ info := i, dataVersion := v, time := nowMin facts s, role := user.role, user := user.id }] },
       .ok)

/-- A confirmed prior-auth capture on the current slot must never be replaced
by a request click (regardless of its value or provenance). -/
def priorAuthCaptured (s : State) : Bool :=
  s.captured.any fun x =>
    x.element == priorAuthElement && x.slot == s.currentSlot && x.confirmed

/-- Request prior authorization for the current order line (release v2).
It writes only the `"priorAuthRequest"` element, on the current slot, under the
same rules as entering a value: the element must be in the spec and the role
must be allowed; a macro may not do it if the element is human-only or
`never`-prefill, and a macro's request waits for a human confirm. Ignored if
the current slot has no order or already has a confirmed capture. Human-only
and never-policy elements must be captured through a human field entry, not
this convenience action. -/
def requestPriorAuth (sp : Spec) (user : User) (actor : Actor) (s : State) (time : Option Int := none) : State × StepResult :=
  match sp.element? priorAuthElement with
  | none => (s, .blocked s!"unknown element {priorAuthElement}")
  | some el =>
    if !el.enteredBy.contains user.role then
      (s, .blocked s!"role: {user.role.name} may not enter {priorAuthElement}")
    else if !hasOrderAt s s.currentSlot then (s, .ignored)
    else if priorAuthCaptured s then (s, .ignored)
    else if !(linkedDependents s.captured priorAuthElement).isEmpty then
      (s, .blocked "linked confirmation must be updated through a human field")
    else
      match actor with
      | .«macro» =>
        if needsHuman el || el.prefill == .never then (s, .blocked s!"human only: {priorAuthElement}")
        else
          let x : Captured :=
            { element := priorAuthElement, slot := s.currentSlot, value := .flag true
              byHuman := false, confirmed := false, provenance? := some "macro", enteredAt? := time }
          ({ s with captured := setCaptured s.captured x }, .ok)
      | .human =>
        if needsHuman el || el.prefill == .never then
          (s, .blocked s!"human entry required: {priorAuthElement}")
        else
          let x : Captured :=
            { element := priorAuthElement, slot := s.currentSlot, value := .flag true
              byHuman := true, confirmed := true, provenance? := none, enteredAt? := time }
          ({ s with captured := setCaptured s.captured x }, .ok)

/-- The current drug line meets every applicable per-line requirement in the
spec. Checks all signing commits, so moving forward cannot strand a line. -/
def currentLineComplete (sp : Spec) (facts : Facts) (user : User) (s : State) : Bool :=
  (s.captured.all fun x => x.slot != s.currentSlot ||
    (sp.element? x.element).all (fun el => elementValueValid facts s el x.slot x.value)) &&
  (orderLines s).all fun p => p.1 != s.currentSlot ||
    sp.entries.all fun rq => !rq.perOrderLine || !lineMatches facts s rq.when p.1 p.2 ||
      match sp.element? rq.element with
      | none => false
      | some el => hasGoodEntry facts user s el (some p.1) rq.allowed?

/-- Open a closed group, or close an open one. -/
def toggle (l : List CompId) (x : CompId) : List CompId :=
  if l.contains x then l.filter (· != x) else l ++ [x]

/-- Click a shown component. Macro buttons are run by `step`, not here: a macro
may not start another macro. -/
def clickCore (sp : Spec) (prog : Program) (facts : Facts) (user : User) (actor : Actor)
    (s : State) (c : Component) : State × StepResult :=
  match c.kind with
  -- Opening an alert never acknowledges it.
  | .alert a _ =>
    match actor with
    | .human => clickAlert sp prog facts s a
    | .«macro» => (s, .blocked "human only: acknowledge")
  | .button (.goto t) => goTo sp prog facts s t
  | .button .back => goBack sp prog facts s
  | .button (.commit cm) =>
    match actor with
    | .human => clickCommit sp prog facts user s cm
    | .«macro» => (s, .blocked "human only: commit")
  | .button (.markReviewed i) =>
    match actor with
    | .human => markReviewed sp prog facts user s i
    | .«macro» => (s, .blocked "human only: review")
  | .button .newOrderLine =>
    if currentLineComplete sp facts user s then
      (prefillScreen sp prog facts { s with currentSlot := s.currentSlot + 1 }, .ok)
    else (s, .blocked "finish this order line first")
  | .button .requestPriorAuth => requestPriorAuth sp user actor s (epochNow facts s)
  | .group true _ => ({ s with expanded := toggle s.expanded c.id }, .ok)
  | .«macro» _ =>
    match actor with
    | .human => (s, .ignored)
    | .«macro» => (s, .blocked "macros cannot run macros")
  | _ => (s, .ignored)

/-! ## Transfer reconciliation -/

/-- New specification for owner review: the runtime owns every component ID
with the reconciliation prefix, including future or malformed controls. -/
def reconcileReservedId (cid : CompId) : Bool :=
  "reconcile.line|".toList.isPrefixOf cid.toList

/-- New specification for owner review: the control that records the per-line
transfer reconciliation decision for order line `slot`. -/
def reconcileComp (slot : Nat) : CompId := "reconcile.line|" ++ toString slot

/-- New specification for owner review: order lines that still await a transfer
reconciliation decision, in capture order. -/
def reconcileSlots (s : State) : List Nat :=
  (s.captured.filterMap fun x => if x.provenance? == some reconcileTag then some x.slot else none).eraseDups

/-- New specification for owner review: a capture of line `n` that awaits the decision. -/
def reconcileTagged (n : Nat) (x : Captured) : Bool :=
  x.slot == n && x.provenance? == some reconcileTag

/-- New specification for owner review: a per-line transfer reconciliation decision. -/
inductive ReconcileDecision
  | keep | change | discontinue
  deriving DecidableEq, Repr, Inhabited

/-- New specification for owner review: the decision an entered value names,
as the codes `keep`, `change` and `discontinue`. -/
def ReconcileDecision.ofValue? : Value → Option ReconcileDecision
  | .code "keep" => some .keep
  | .code "change" => some .change
  | .code "discontinue" => some .discontinue
  | _ => none

/-- New specification for owner review: the explicit per-line decision for an
unsigned order line restored after the patient's transfer. Only a human can make
it, and only for a line that awaits it and whose restored elements the signed-in
role may enter. `keep` keeps the line; `change` keeps it and selects it for
editing; `discontinue` removes the line's order captures. The decision never
adds a capture, a commit, a receipt or an acknowledgment. Any other control is
not a reconciliation and is ignored, as before. -/
def reconcileCore (sp : Spec) (user : User) (actor : Actor) (s : State) (cid : CompId)
    (v : Value) : State × StepResult :=
  match (reconcileSlots s).find? (fun n => cid == reconcileComp n) with
  | none => (s, .ignored)
  | some n =>
    match actor with
    | .«macro» => (s, .blocked "human only: order reconciliation")
    | .human =>
      if !s.captured.all (fun x => !reconcileTagged n x ||
          (sp.element? x.element).any (·.enteredBy.contains user.role)) then
        (s, .blocked s!"role: {user.role.name} may not reconcile this order line")
      else
        match ReconcileDecision.ofValue? v with
        | none => (s, .blocked "order reconciliation: choose keep, change or discontinue")
        | some .keep =>
          ({ s with captured := s.captured.map fun x =>
              if reconcileTagged n x then { x with provenance? := some "reconciled:keep" } else x }, .ok)
        | some .change =>
          let kept := s.captured.map fun x =>
            if reconcileTagged n x then { x with provenance? := some "reconciled:change" } else x
          ({ s with captured := kept, currentSlot := n }, .ok)
        | some .discontinue =>
          ({ s with captured := s.captured.filter fun x =>
              !(reconcileTagged n x || (x.slot == n && isOrderLineElement sp x.element)) }, .ok)

/-- New specification for owner review: a macro's reconciliation attempt changes nothing. -/
@[simp] theorem reconcileCore_macro (sp : Spec) (user : User) (s : State) (cid : CompId) (v : Value) :
    (reconcileCore sp user .«macro» s cid v).1 = s := by
  unfold reconcileCore
  split <;> rfl

/-- New specification for owner review: a reconciliation step keeps every
field except the captures and the current order line. -/
theorem reconcileCore_frame (sp : Spec) (user : User) (actor : Actor) (s : State)
    (cid : CompId) (v : Value) :
    let t := (reconcileCore sp user actor s cid v).1
    t.commits = s.commits ∧ t.receipts = s.receipts ∧ t.acked = s.acked ∧
      t.popup? = s.popup? ∧ t.screen = s.screen ∧ t.history = s.history ∧
      t.patientContext? = s.patientContext? ∧ t.patientDrafts? = s.patientDrafts? ∧
      t.criticalResults? = s.criticalResults? ∧ t.criticalDrafts? = s.criticalDrafts? ∧
      t.expanded = s.expanded ∧ t.tabSel = s.tabSel ∧ t.searchQueries? = s.searchQueries? ∧
      t.clock = s.clock := by
  unfold reconcileCore
  split
  · exact ⟨rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl⟩
  · cases actor
    · dsimp only
      split
      · exact ⟨rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl⟩
      · cases ReconcileDecision.ofValue? v with
        | none => exact ⟨rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl⟩
        | some d => cases d <;> exact ⟨rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl⟩
    · exact ⟨rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl⟩

/-! New specification for owner review: frame lemmas of `reconcileCore`. -/
@[simp] theorem reconcileCore_commits (sp user actor s cid v) :
    (reconcileCore sp user actor s cid v).1.commits = s.commits := (reconcileCore_frame sp user actor s cid v).1
@[simp] theorem reconcileCore_receipts (sp user actor s cid v) :
    (reconcileCore sp user actor s cid v).1.receipts = s.receipts := (reconcileCore_frame sp user actor s cid v).2.1
@[simp] theorem reconcileCore_acked (sp user actor s cid v) :
    (reconcileCore sp user actor s cid v).1.acked = s.acked := (reconcileCore_frame sp user actor s cid v).2.2.1
@[simp] theorem reconcileCore_popup (sp user actor s cid v) :
    (reconcileCore sp user actor s cid v).1.popup? = s.popup? := (reconcileCore_frame sp user actor s cid v).2.2.2.1
@[simp] theorem reconcileCore_screen (sp user actor s cid v) :
    (reconcileCore sp user actor s cid v).1.screen = s.screen := (reconcileCore_frame sp user actor s cid v).2.2.2.2.1
@[simp] theorem reconcileCore_history_eq (sp user actor s cid v) :
    (reconcileCore sp user actor s cid v).1.history = s.history := (reconcileCore_frame sp user actor s cid v).2.2.2.2.2.1
@[simp] theorem reconcileCore_patientContext (sp user actor s cid v) :
    (reconcileCore sp user actor s cid v).1.patientContext? = s.patientContext? :=
  (reconcileCore_frame sp user actor s cid v).2.2.2.2.2.2.1
@[simp] theorem reconcileCore_patientDrafts (sp user actor s cid v) :
    (reconcileCore sp user actor s cid v).1.patientDrafts? = s.patientDrafts? :=
  (reconcileCore_frame sp user actor s cid v).2.2.2.2.2.2.2.1

/-- New specification for owner review: without a line awaiting a decision, a
reconciliation control does nothing. -/
theorem reconcileCore_idle (sp : Spec) (user : User) (actor : Actor) (s : State)
    (cid : CompId) (v : Value) (h : ∀ x ∈ s.captured, x.provenance? ≠ some reconcileTag) :
    reconcileCore sp user actor s cid v = (s, .ignored) := by
  have hf : (s.captured.filterMap fun x =>
      if x.provenance? == some reconcileTag then some x.slot else none) = [] := by
    rw [List.filterMap_eq_nil_iff]
    intro x hx
    simp [h x hx]
  have hn : reconcileSlots s = [] := by
    simp only [reconcileSlots, hf]
    rfl
  unfold reconcileCore
  rw [hn]
  rfl

/-- New specification for owner review: every capture after a reconciliation
step is a capture of the input with
only its provenance possibly changed: same element, line, value, author and
confirmation. -/
theorem reconcileCore_captured (sp : Spec) (user : User) (actor : Actor) (s : State)
    (cid : CompId) (v : Value) :
    ∀ x ∈ (reconcileCore sp user actor s cid v).1.captured, ∃ y ∈ s.captured,
      x.element = y.element ∧ x.slot = y.slot ∧ x.value = y.value ∧
      x.byHuman = y.byHuman ∧ x.confirmed = y.confirmed := by
  have mapped : ∀ (n : Nat) (lbl : String) x,
      x ∈ s.captured.map (fun x => if reconcileTagged n x then { x with provenance? := some lbl } else x) →
      ∃ y ∈ s.captured, x.element = y.element ∧ x.slot = y.slot ∧ x.value = y.value ∧
        x.byHuman = y.byHuman ∧ x.confirmed = y.confirmed := by
    intro n lbl x hx
    obtain ⟨y, hy, rfl⟩ := List.mem_map.mp hx
    refine ⟨y, hy, ?_⟩
    split <;> exact ⟨rfl, rfl, rfl, rfl, rfl⟩
  have same : ∀ x ∈ s.captured, ∃ y ∈ s.captured, x.element = y.element ∧ x.slot = y.slot ∧
      x.value = y.value ∧ x.byHuman = y.byHuman ∧ x.confirmed = y.confirmed :=
    fun x hx => ⟨x, hx, rfl, rfl, rfl, rfl, rfl⟩
  unfold reconcileCore
  split
  · exact same
  · rename_i n _
    cases actor
    · dsimp only
      split
      · exact same
      · cases ReconcileDecision.ofValue? v with
        | none => exact same
        | some d =>
          cases d
          · exact mapped n _
          · exact mapped n _
          · intro x hx
            exact ⟨x, (List.mem_filter.mp hx).1, rfl, rfl, rfl, rfl, rfl⟩
    · exact same

/-- New specification for owner review: an accepted decision is for one line
`n` awaiting reconciliation, named by its control. Afterwards no capture of that
line awaits a decision, every capture of another line is kept, and no commit,
receipt, acknowledgment or popup changes. -/
theorem reconcileCore_ok (sp : Spec) (user : User) (actor : Actor) (s t : State)
    (cid : CompId) (v : Value) (h : reconcileCore sp user actor s cid v = (t, .ok)) :
    ∃ n, n ∈ reconcileSlots s ∧ cid = reconcileComp n ∧ actor = .human ∧
      (∀ x ∈ t.captured, reconcileTagged n x = false) ∧
      (∀ x ∈ s.captured, x.slot ≠ n → x ∈ t.captured) ∧
      t.commits = s.commits ∧ t.receipts = s.receipts ∧ t.acked = s.acked ∧ t.popup? = s.popup? := by
  unfold reconcileCore at h
  split at h
  · simp at h
  · rename_i n hn
    have hmem := List.mem_of_find?_eq_some hn
    have hcid : cid = reconcileComp n := by simpa using List.find?_some hn
    cases actor
    · dsimp only at h
      split at h
      · simp at h
      · have tagged_kept : ∀ (lbl : String), lbl ≠ reconcileTag →
            (∀ x ∈ s.captured.map (fun x => if reconcileTagged n x then { x with provenance? := some lbl } else x),
              reconcileTagged n x = false) ∧
            (∀ x ∈ s.captured, x.slot ≠ n →
              x ∈ s.captured.map (fun x => if reconcileTagged n x then { x with provenance? := some lbl } else x)) := by
          intro lbl hl
          refine ⟨?_, ?_⟩
          · intro x hx
            obtain ⟨y, -, rfl⟩ := List.mem_map.mp hx
            by_cases hy : reconcileTagged n y = true
            · simp only [hy, ↓reduceIte]
              simp only [reconcileTagged, Bool.and_eq_false_iff]
              right
              simpa using hl
            · simp [hy]
          · intro x hx hs
            have hnt : reconcileTagged n x = false := by simp [reconcileTagged, hs]
            exact List.mem_map.mpr ⟨x, hx, by simp [hnt]⟩
        cases hd : ReconcileDecision.ofValue? v with
        | none => rw [hd] at h; simp at h
        | some d =>
          cases d
          · rw [hd] at h
            simp only [Prod.mk.injEq] at h
            obtain ⟨rfl, -⟩ := h
            have k := tagged_kept "reconciled:keep" (by simp [reconcileTag])
            exact ⟨n, hmem, hcid, rfl, k.1, k.2, rfl, rfl, rfl, rfl⟩
          · rw [hd] at h
            simp only [Prod.mk.injEq] at h
            obtain ⟨rfl, -⟩ := h
            have k := tagged_kept "reconciled:change" (by simp [reconcileTag])
            exact ⟨n, hmem, hcid, rfl, k.1, k.2, rfl, rfl, rfl, rfl⟩
          · rw [hd] at h
            simp only [Prod.mk.injEq] at h
            obtain ⟨rfl, -⟩ := h
            refine ⟨n, hmem, hcid, rfl, ?_, ?_, rfl, rfl, rfl, rfl⟩
            · intro x hx
              have := (List.mem_filter.mp hx).2
              simp only [Bool.not_eq_true', Bool.or_eq_false_iff] at this
              exact this.1
            · intro x hx hs
              exact List.mem_filter.mpr ⟨hx, by simp [reconcileTagged, hs]⟩
    · simp at h

/-! ## Entering and confirming values -/

/-- Why an entered value is refused, in words. -/
def rejectReason (el : ElementSpec) (v : Value) : String :=
  match el.kind, v with
  | .medicationDose, _ | .coded "dose-unit", _ => "dose unit must match the selected formulary drug"
  | .identity, .text _ => s!"identity mismatch: {el.id}"
  | .cosign, .user _ => s!"cosign must be a different user: {el.id}"
  | .scan t, .code _ => s!"scan does not match {t}: {el.id}"
  | _, _ => s!"invalid value for {el.id}"

/-- Enter a value into a shown field. Refused if the role may not enter the
element; if a macro tries a human-only or `never`-prefill element; or if the
value is not accepted. A human's value is confirmed; a macro's value waits for
a human confirm. -/
def enterCore (sp : Spec) (prog : Program) (facts : Facts) (user : User) (actor : Actor)
    (s : State) (cid : CompId) (v : Value) : State × StepResult :=
  match shownComp? sp prog facts s cid with
  | none => (s, .ignored)
  | some c =>
    match c.kind with
    | .field e slot _ =>
      match sp.element? e with
      | none => (s, .blocked s!"unknown element {e}")
      | some el =>
        if !el.enteredBy.contains user.role then (s, .blocked s!"role: {user.role.name} may not enter {e}")
        else
          match actor with
          | .«macro» =>
            if needsHuman el || el.prefill == .never then (s, .blocked s!"human only: {e}")
            else if (!valueAccepted facts user el.kind v ||
                !elementValueValid facts s el (resolveSlot s slot) v) then (s, .blocked (rejectReason el v))
            else
              let x : Captured :=
                { element := e, slot := resolveSlot s slot, value := v, byHuman := false
                  confirmed := false, provenance? := (el.linkedFrom?.map ("linked:" ++ ·)).or (some "macro"), enteredAt? := epochNow facts s }
              ({ s with captured := setCaptured s.captured x }, .ok)
          | .human =>
            if (!valueAccepted facts user el.kind v ||
                !elementValueValid facts s el (resolveSlot s slot) v) then (s, .blocked (rejectReason el v))
            else
              let x : Captured :=
                { element := e, slot := resolveSlot s slot, value := v, byHuman := true
                  confirmed := true, provenance? := (if ".observedAt".toList.isSuffixOf e.toList then el.observationOf?.or el.linkedFrom? else el.linkedFrom?).map ("linked:" ++ ·), enteredAt? := epochNow facts s }
              ({ s with captured := setCaptured s.captured x }, .ok)
    | .search _ =>
      match v with
      | .text query =>
        let prior := (s.searchQueries?.getD []).filter (fun pair => pair.1 != cid)
        let queries := if query == "" then prior else prior ++ [(cid, query)]
        ({ s with searchQueries? := if queries.isEmpty then none else some queries }, .ok)
      | _ => (s, .ignored)
    | _ => (s, .ignored)

/-- Confirm a prefilled value in a shown field (human only). Ignored if there
is no unconfirmed value. Confirming does not make a value "entered by a human",
so it never satisfies a human-only requirement. -/
def confirmCore (sp : Spec) (prog : Program) (facts : Facts) (user : User) (actor : Actor)
    (s : State) (cid : CompId) : State × StepResult :=
  match actor with
  | .«macro» => (s, .blocked "human only: confirm")
  | .human =>
    match shownComp? sp prog facts s cid with
    | none => (s, .ignored)
    | some c =>
      match c.kind with
      | .field e slot _ =>
        match sp.element? e with
        | none => (s, .blocked s!"unknown element {e}")
        | some el =>
          if !el.enteredBy.contains user.role then (s, .blocked s!"role: {user.role.name} may not enter {e}")
          else
            let n := resolveSlot s slot
            if s.captured.any (fun x => x.element == e && x.slot == n && !x.confirmed) then
              ({ s with captured := s.captured.map fun x =>
                  if x.element == e && x.slot == n then { x with confirmed := true } else x }, .ok)
            else (s, .ignored)
      | _ => (s, .ignored)

/-! ## Alerts, tabs, scrolling, search -/

/-- Acknowledge the open popup (human only). Records `(alert, key)` as handled
and closes the popup. -/
def ackCore (actor : Actor) (s : State) (a : AlertId) : State × StepResult :=
  match actor with
  | .«macro» => (s, .blocked "human only: acknowledge")
  | .human =>
    match s.popup? with
    | some p => if p.1 == a then ({ s with acked := s.acked ++ [p], popup? := none }, .ok)
                else (s, .ignored)
    | none => (s, .ignored)

/-- Select a tab of a shown tabs component. -/
def selectTabCore (sp : Spec) (prog : Program) (facts : Facts) (s : State) (cid : CompId)
    (idx : Nat) : State × StepResult :=
  match shownComp? sp prog facts s cid with
  | some c =>
    match c.kind with
    | .tabs => ({ s with tabSel := (cid, idx) :: s.tabSel.filter (·.1 != cid) }, .ok)
    | _ => (s, .ignored)
  | none => (s, .ignored)

/-- A search component is shown on the current screen. -/
def searchShown (sp : Spec) (prog : Program) (facts : Facts) (s : State) : Bool :=
  let comps := prog.compsOf s.screen
  comps.any fun c =>
    (match c.kind with | .search _ => true | _ => false) && compShown sp facts s comps c

/-! ## One step -/

/-- Apply one event, without running macros. -/
def stepEvent (sp : Spec) (prog : Program) (facts : Facts) (user : User) (actor : Actor)
    (s : State) : Event → State × StepResult
  | .click cid =>
    match shownComp? sp prog facts s cid with
    | none => (s, .ignored)
    | some c => clickCore sp prog facts user actor s c
  | .selectTab cid idx => selectTabCore sp prog facts s cid idx
  | .enter cid v =>
    -- New specification for owner review: decisions edit provenance, not values;
    -- dispatch separately so ordinary value-creation timing guarantees still hold.
    match shownComp? sp prog facts s cid with
    | none => reconcileCore sp user actor s cid v
    | some _ => enterCore sp prog facts user actor s cid v
  | .confirm cid => confirmCore sp prog facts user actor s cid
  | .ack a => ackCore actor s a
  | .scroll scr => if scr == s.screen then (s, .ok) else (s, .ignored)
  | .search _ => if searchShown sp prog facts s then (s, .ok) else (s, .ignored)

/-- The event is an acknowledgment. -/
def Event.isAck : Event → Bool
  | .ack _ => true
  | _ => false

/-- Apply one event without running macros. While a popup is open, only an
acknowledgment is accepted. -/
def stepCore (sp : Spec) (prog : Program) (facts : Facts) (user : User) (actor : Actor)
    (s : State) (e : Event) : State × StepResult :=
  if s.popup?.isSome && !e.isAck then (s, .blocked "popup: acknowledge the alert first")
  else stepEvent sp prog facts user actor s e

/-! ## Macros -/

/-- The value a macro's `setValue` enters: the string parsed by the field's
element kind (as text if that fails; the field then refuses it). -/
def macroValue (sp : Spec) (prog : Program) (facts : Facts) (s : State) (cid : CompId)
    (str : String) : Value :=
  match shownComp? sp prog facts s cid with
  | some c =>
    match c.kind with
    | .field e slot _ =>
      match sp.element? e with
      | some el => (parseElementValue s el (resolveSlot s slot) str).getD (.text str)
      | none => .text str
    | _ => .text str
  | none => .text str

/-- Run one macro step as `Actor.macro`. -/
def macroStep (sp : Spec) (prog : Program) (facts : Facts) (user : User) (s : State) :
    MacroStep → State × StepResult
  | .setValue cid str => stepCore sp prog facts user .«macro» s (.enter cid (macroValue sp prog facts s cid str))
  | .click cid => stepCore sp prog facts user .«macro» s (.click cid)
  | .goto t => if s.popup?.isSome then (s, .blocked "popup: acknowledge the alert first")
               else goTo sp prog facts s t

/-- The message when a macro stops at step `i` with result `r`. -/
def macroStopReason (i : Nat) : StepResult → String
  | .blocked why => s!"macro stopped at step {i}: {why}"
  | _ => s!"macro stopped at step {i}: step did not apply"

/-- Run macro steps in order, stopping at the first step that is not `ok`.
`i` is the index of the first step (for messages). -/
def runMacro (sp : Spec) (prog : Program) (facts : Facts) (user : User) :
    Nat → State → List MacroStep → State × StepResult
  | _, s, [] => (s, .ok)
  | i, s, st :: rest =>
    match macroStep sp prog facts user s st with
    | (s', .ok) => runMacro sp prog facts user (i + 1) s' rest
    | (s', r) => (s', .blocked (macroStopReason i r))

/-- The macro a click on `cid` would run (a shown macro button whose macro exists). -/
def clickedMacro? (sp : Spec) (prog : Program) (facts : Facts) (s : State) (cid : CompId) :
    Option Macro :=
  match shownComp? sp prog facts s cid with
  | some c =>
    match c.kind with
    | .«macro» m => prog.macro? m
    | _ => none
  | none => none

/-- **The interpreter step.** A human click on a macro button runs the macro's
steps as `Actor.macro` (when no popup is open). Every other event is applied by
`stepCore`. -/
def step (sp : Spec) (prog : Program) (facts : Facts) (user : User) (actor : Actor)
    (s : State) (e : Event) : State × StepResult :=
  match actor, e with
  | .human, .click cid =>
    match s.popup?, clickedMacro? sp prog facts s cid with
    | none, some mac => runMacro sp prog facts user 0 s mac.steps
    | _, _ => stepCore sp prog facts user .human s e
  | _, _ => stepCore sp prog facts user actor s e

/-- Run a list of events (all as the same actor), collecting each result. -/
def runEvents (sp : Spec) (prog : Program) (facts : Facts) (user : User) (actor : Actor) :
    State → List Event → List (State × StepResult)
  | _, [] => []
  | s, e :: rest =>
    let r := step sp prog facts user actor s e
    r :: runEvents sp prog facts user actor r.1 rest

/-- The state after a list of events. -/
def runAll (sp : Spec) (prog : Program) (facts : Facts) (user : User) (actor : Actor)
    (s : State) (es : List Event) : State :=
  es.foldl (fun s e => (step sp prog facts user actor s e).1) s

/-! ## Initial state -/

/-- Groups that start open: every group not marked `startCollapsed`. -/
def startExpanded (prog : Program) : List CompId :=
  prog.screens.flatMap fun sc =>
    sc.components.filterMap fun c =>
      match c.kind with
      | .group _ false => some c.id
      | _ => none

/-- The initial state of an episode: on the start screen, nothing captured,
prior receipts from the facts, then the start screen is prefilled. -/
def init (sp : Spec) (prog : Program) (facts : Facts) (_user : User) : State :=
  prefillScreen sp prog facts
    { screen := prog.start, history := [], captured := [], receipts := facts.receipts
      acked := [], commits := [], expanded := startExpanded prog, tabSel := []
      popup? := none, currentSlot := 0, clock := 0 }

#print axioms reconcileCore_ok

end Ehr
