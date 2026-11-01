import Ehr.Check.Rules
import Ehr.Props.Navigation
import Ehr.Check.PopupRequests
import Ehr.Check.ReplayContext

/-!
# The checker

`check spec prev canonical prog` certifies a candidate UI program before it is
deployed. It runs a fixed list of rules, in order. Each rule is fast and
structural: it reads the program's lists, and searches the screen graph
breadth-first. The verdict is `ok` only if every rule passes (the completed safety implications and the remaining completeness obligation
are assembled in `Ehr.Check.Sound`).

If a rule fails, the verdict names the property, says what is wrong in plain
words, and gives a **counterexample**: a click path from the start screen to
the screen that shows the problem, then the click that triggers it (for
example "Sign"). The path is replayed through the real interpreter before it
is returned; a path that does not replay is cut at the first step that fails.

Property names in verdicts: `wellFormed`, `writesOnly`, `alertsFire` (A1),
`noFalseAlarms` (A2), `noRepeatInterruptions` (A3), `severityTiers` (A4),
`humanOnlyKept`, `units`, `capturesAllOnce`, `reviewsBeforeCommit`,
`completable`, `budgets`.
-/

namespace Ehr.Check

open Ehr Ehr.Props

/-- The checker's version, written into certificates. -/
def checkerVersion : String := "check-1"

/-! ## Findings -/

/-- What a failing rule reports: the property, a message, and where to show
it (a screen, and optionally a component on it to click last). -/
structure Finding where
  property : String
  message : String
  screen? : Option ScreenId := none
  click? : Option CompId := none
  deriving Repr, Inhabited

/-- One rule of the checker: whether it passes, and how to explain a failure. -/
structure Rule where
  property : String
  passes : Bool
  explain : Unit → Option Finding

/-- Explain D5 using exactly the renderer's navigation groups and labels. -/
def navigationFinding (p : Program) : Option Finding :=
  let nav := Render.uiOverviewNav p
  if ¬ (nav.map (·.1)).Nodup then
    some { property := "navigation", message := "D5: navigation group labels are not unique" }
  else if 12 < nav.length then
    some { property := "navigation", message := s!"D5: navigation has {nav.length} groups (maximum 12)" }
  else match nav.find? (fun g => decide (¬ (g.2.map (·.2)).Nodup ∨ 12 < g.2.length)) with
    | some g => some { property := "navigation", message :=
        s!"D5: navigation group {g.1} has duplicate labels or {g.2.length} entries (maximum 12)" }
    | none =>
      (p.screens.find? fun sc => !nav.any (fun g => g.2.any (·.1 == sc.id))).map fun sc =>
        { property := "navigation", message := s!"D5: screen {sc.id} is absent from navigation", screen? := some sc.id }

/-- The first component (in screen order) for which `bad` gives a message. -/
def findComp (prog : Program) (bad : Screen → Component → Option String) :
    Option (Screen × Component × String) :=
  prog.screens.findSome? fun scr =>
    scr.components.findSome? fun c => (bad scr c).map fun m => (scr, c, m)

/-- A finding at the first bad component. -/
def compFinding (property : String) (prog : Program) (click : Bool)
    (bad : Screen → Component → Option String) : Option Finding :=
  (findComp prog bad).map fun (scr, c, m) =>
    { property, message := m, screen? := some scr.id, click? := if click then some c.id else none }

/-- A screen with a button for macro `m`, and that button. -/
def macroButton (prog : Program) (m : MacroId) : Option (ScreenId × CompId) :=
  prog.screens.findSome? fun scr =>
    (scr.components.find? fun c => macroOf? c.kind == some m).map fun c => (scr.id, c.id)

/-- A finding for a bad macro step: shown by clicking the macro's button. -/
def macroFinding (property : String) (prog : Program)
    (bad : Macro → MacroStep → Option String) : Option Finding :=
  prog.macros.findSome? fun m =>
    m.steps.findSome? fun st => (bad m st).map fun msg =>
      match macroButton prog m.id with
      | some (scr, cid) => { property, message := msg, screen? := some scr, click? := some cid }
      | none => { property, message := msg }

/-- The program components with this ID (any screen). -/
def compsWithId (prog : Program) (cid : CompId) : List Component :=
  (allComps prog).filterMap fun sc => if sc.2.id == cid then some sc.2 else none

/-! ## Rule messages -/

/-- Name of a tier, for messages. -/
def tierName : Tier → String
  | .interruptive => "interruptive" | .passive => "passive" | .removable => "removable"

/-- Why a component breaks a reference rule, if it does. -/
def badReference (spec : Spec) (prog : Program) (scr : Screen) (c : Component) : Option String :=
  match gotoOf? c.kind with
  | some t => if (prog.screen? t).isNone then some s!"button {c.id} on screen {scr.id} goes to missing screen {t}" else none
  | none =>
  match macroOf? c.kind with
  | some m => if (prog.macro? m).isNone then some s!"macro button {c.id} on screen {scr.id} runs missing macro {m}" else none
  | none =>
  match alertOf? c.kind with
  | some a => if (spec.alert? a.1).isNone then some s!"alert {c.id} on screen {scr.id} names alert {a.1}, which the spec does not have" else none
  | none =>
  match c.parent? with
  | some pid =>
    if scr.components.any (fun p => p.id == pid && isContainer p.kind) then none
    else some s!"component {c.id} on screen {scr.id} has parent {pid}, which is not a group or tab container on that screen"
  | none => none

/-- Why a component breaks the "writes only" rule, if it does. -/
def badWrite (spec : Spec) (prog : Program) (scr : Screen) (c : Component) : Option String :=
  match fieldOf? c.kind with
  | some f =>
    match spec.element? f.1 with
    | none => some s!"field {c.id} on screen {scr.id} writes element {f.1}, which is not in the spec"
    | some el => if el.enteredBy.contains prog.role then none
                 else some s!"field {c.id} on screen {scr.id} writes {f.1}, which role {prog.role.name} may not enter"
  | none =>
  match commitOf? c.kind with
  | some cm =>
    match spec.commit? cm with
    | none => some s!"button {c.id} on screen {scr.id} performs commit {cm}, which is not in the spec"
    | some cs => if cs.roles.contains prog.role then none
                 else some s!"button {c.id} on screen {scr.id} performs {cm}, which role {prog.role.name} may not do"
  | none =>
  match reviewOf? c.kind with
  | some i => if (spec.info? i).isNone then some s!"button {c.id} on screen {scr.id} reviews info {i}, which is not in the spec" else none
  | none => none

/-- The tier of a program popup request, if the component is one. -/
def popupTier (spec : Spec) (c : Component) : Option (AlertId × Tier) :=
  match alertOf? c.kind with
  | some (a, true) => (spec.alert? a).map fun al => (a, al.tier)
  | _ => none

/-- Why a field breaks a human-only rule (a prefill on an element a human
must enter), if it does. -/
def badHumanPrefill (spec : Spec) (scr : Screen) (c : Component) : Option String :=
  match fieldOf? c.kind with
  | some (e, _, pf) =>
    match spec.element? e with
    | some el => if decide (HumanMustEnter el) && pf != .none then
        some s!"field {c.id} on screen {scr.id} prefills {e}, which a human must enter every time"
      else none
    | none => none
  | none => none

/-- Why a macro step automates a human step, if it does. -/
def badMacroStep (spec : Spec) (prog : Program) (m : Macro) (st : MacroStep) : Option String :=
  let targets := match stepTarget? st with
    | some cid => compsWithId prog cid
    | none => []
  targets.findSome? fun c =>
    match st with
    | .setValue _ _ =>
      match fieldOf? c.kind with
      | some (e, _, _) =>
        match spec.element? e with
        | some el => if decide (HumanMustEnter el) then
            some s!"macro {m.id} types into {c.id} ({e}), which only a human may enter"
          else none
        | none => none
      | none => none
    | .click _ =>
      match commitOf? c.kind, reviewOf? c.kind, macroOf? c.kind with
      | some cm, _, _ => some s!"macro {m.id} clicks {c.id}, which performs commit {cm}; only a human may commit"
      | _, some i, _ => some s!"macro {m.id} clicks {c.id}, which marks {i} reviewed; only a human may review"
      | _, _, some m' => some s!"macro {m.id} clicks {c.id}, which runs macro {m'}"
      | _, _, _ =>
        if c.kind == .button .requestPriorAuth then
          match spec.element? priorAuthElement with
          | some el => if decide (HumanMustEnter el) then
              some s!"macro {m.id} clicks request {c.id}, which requires a human field entry"
            else none
          | none => none
        else none
    | .goto _ => none

/-! ## The rules, in order -/

/-- A finding with no location. -/
def plain (property message : String) : Option Finding := some { property, message }

/-- The checker's rules, in the order they are reported. -/
def rules (spec : Spec) (prev : Option Program) (canonical prog : Program) : List Rule :=
  let required := requiredCommits spec canonical prog
  let reachTable := openReachTable prog
  let completion := fun c => completeForWithReach spec prog c (tableReach prog reachTable)
  [ -- 1. well-formed: catalog, unique IDs, references
    { property := "wellFormed", passes := prog.inCatalog spec
      explain := fun _ => compFinding "wellFormed" prog false fun scr c =>
        if spec.design.catalog.contains (kindName c.kind) then none
        else some s!"component {c.id} on screen {scr.id} is a {kindName c.kind}, which is not in the spec's catalog" },
    { property := "wellFormed", passes := decide (SpecIdsUnique spec)
      explain := fun _ => plain "wellFormed" "the spec names an element, info, commit, or alert rule twice" },
    { property := "wellFormed", passes := decide (IdsUnique prog)
      explain := fun _ =>
        match prog.screens.find? (fun scr => !(scr.components.map (·.id)).Nodup) with
        | some scr => some { property := "wellFormed", message := s!"two components on screen {scr.id} have the same ID"
                             screen? := some scr.id }
        | none => plain "wellFormed" "two screens have the same ID" },
    { property := "wellFormed", passes := decide (ReferencesResolve spec prog)
      explain := fun _ =>
        if (prog.screen? prog.start).isNone then plain "wellFormed" s!"the start screen {prog.start} does not exist"
        else match compFinding "wellFormed" prog false (badReference spec prog) with
          | some f => some f
          | none => macroFinding "wellFormed" prog fun m st =>
              match gotoStep? st with
              | some t => if (prog.screen? t).isNone then some s!"macro {m.id} goes to missing screen {t}" else none
              | none => none },
    -- 3. writes only
    { property := "writesOnly", passes := decide (DeclaredWritesInSpec spec prog)
      explain := fun _ => compFinding "writesOnly" prog false (badWrite spec prog) },
    -- 12. A4: passive alerts never pop up
    { property := "severityTiers", passes := decide (NoPassivePopupRequests spec prog)
      explain := fun _ => compFinding "severityTiers" prog false fun scr c =>
        match popupTier spec c with
        | some (a, .passive) => some s!"A4: alert {c.id} on screen {scr.id} makes the passive alert {a} pop up; passive alerts are shown inline only"
        | _ => none },
    -- 11. A3: no repeat interruptions
    { property := "noRepeatInterruptions", passes := decide (FilteredPopupRequests spec prog)
      explain := fun _ => compFinding "noRepeatInterruptions" prog false fun scr c =>
        match popupTier spec c with
        | some (a, .interruptive) =>
          match (allComps prog).find? (fun sc => sc.1.id != scr.id && popupTier spec sc.2 == some (a, .interruptive)) with
          | some sc => some s!"A3: the interruptive alert {a} is made to pop up on screen {scr.id} and again on screen {sc.1.id}"
          | none => none
        | _ => none },
    -- 10. A2: no false alarms
    { property := "noFalseAlarms", passes := decide (NoInterruptivePopupRequests spec prog)
      explain := fun _ => compFinding "noFalseAlarms" prog false fun scr c =>
        match popupTier spec c with
        | some (a, .interruptive) => some s!"A2: alert {c.id} on screen {scr.id} makes the interruptive alert {a} pop up on its own; it must pop up only when its condition holds, at its commit"
        | _ => none },
    -- 5. human-only kept
    { property := "humanOnlyKept", passes := decide (NoAutomationAttempts spec prog)
      explain := fun _ =>
        match compFinding "humanOnlyKept" prog false fun scr c => badHumanPrefill spec scr c with
        | some f => some f
        | none => macroFinding "humanOnlyKept" prog (badMacroStep spec prog) },
    -- 9. A1: no macro suppresses an alert
    { property := "alertsFire", passes := decide (NoAlertSuppression prog)
      explain := fun _ => macroFinding "alertsFire" prog fun m st =>
        match stepTarget? st with
        | some cid => if (compsWithId prog cid).any (fun c => (alertOf? c.kind).isSome) then
            some s!"A1: macro {m.id} clicks or types into alert {cid}, which would dismiss it without the human"
          else none
        | none => none },
    -- 7. units
    { property := "units", passes := decide (QuantityPrefillsKeepUnits spec prog)
      explain := fun _ => compFinding "units" prog false fun scr c =>
        match fieldOf? c.kind with
        | some (e, _, .fromRecord f) =>
          match spec.element? e with
          | some el => if isQuantity el.kind && f != "weightToday" then
              some s!"field {c.id} on screen {scr.id} fills {e} from record value {f}, a bare number with no unit or date; only weightToday keeps its unit"
            else none
          | none => none
        | _ => none },
    { property := "capturesAllOnce", passes := recordSourcesDeclared spec prog && linkedSourcesTyped spec prog
      explain := fun _ => compFinding "capturesAllOnce" prog false fun scr c =>
        match fieldOf? c.kind with
        | some (e, _, .fromRecord fact) =>
          if (spec.element? e).any (fun el => el.recordFact? == some fact) then none
          else some s!"field {c.id} on {scr.id} uses undeclared record source {fact} for {e}"
        | some (e, _, .linked source) =>
          match spec.element? e, spec.element? source with
          | some target, some src => if target.kind == src.kind then none
              else some s!"field {c.id} on {scr.id} links {source} to {e} with a different kind or unit"
          | _, _ => some s!"field {c.id} on {scr.id} has an unknown linked source or target"
        | _ => none },
    -- 2. captures all, once (auto-linked elements)
    { property := "capturesAllOnce", passes := decide (LinkedNotRetyped spec prog)
      explain := fun _ => compFinding "capturesAllOnce" prog false fun scr c =>
        match fieldOf? c.kind with
        | some (e, _, pf) =>
          match spec.element? e with
          | some el => if el.prefill == .autoLinked && (el.linkedFrom?.map Prefill.linked) != some pf then
              some s!"field {c.id} on screen {scr.id} asks for {e}, which is linked from {el.linkedFrom?.getD "?"} and must not be typed again"
            else none
          | none => none
        | none => none },
    -- 4. reviews before commit
    { property := "reviewsBeforeCommit", passes := reviewsPinned spec prog
      explain := fun _ => compFinding "reviewsBeforeCommit" prog true fun scr c =>
        match commitOf? c.kind with
        | some cm =>
          match spec.reviews.find? (fun rq => rq.commit == cm && rq.waivedBy?.isNone &&
              !scr.components.any (pinnedForReview spec scr.components rq)) with
          | some rq => some s!"{rq.info} is not shown on screen {scr.id} when {cm} is clicked: it must be on the screen, not in a closed tab or collapsed group, and legible"
          | none => none
        | none => none },
    -- 6. completable
    { property := "completable", passes := required.all fun c => (completion c).isNone
      explain := fun _ => required.findSome? fun c =>
        (completion c).map fun (scr, msg) =>
          { property := "completable", message := msg, screen? := scr
            click? := scr.bind fun z => ((prog.compsOf z).find? fun comp => commitOf? comp.kind == some c).map (·.id) } },
    -- 1. well-formed: landmarks and depth
    { property := "wellFormed", passes := landmarksPinned spec prog
      explain := fun _ =>
        (prog.screens.findSome? fun scr =>
          (spec.design.landmarks.find? fun l =>
            !scr.components.any fun c => showsInfo l c.kind && fixedShown scr.components c).map fun l =>
              { property := "wellFormed", message := s!"landmark {l} is not always shown on screen {scr.id}"
                screen? := some scr.id }) },
    { property := "wellFormed"
      passes := required.all fun c => spec.entries.all fun rq =>
        rq.commit != c || !entryRelevantForRole spec prog.role rq || (allComps prog).any fun sc =>
          (fieldOf? sc.2.kind).any (·.1 == rq.element) && (shortPathTo prog spec.design.maxDepth sc.1.id).isSome
      explain := fun _ => required.findSome? fun c =>
        (spec.entries.find? fun rq => rq.commit == c && entryRelevantForRole spec prog.role rq && !(allComps prog).any fun sc =>
          (fieldOf? sc.2.kind).any (·.1 == rq.element) && (shortPathTo prog spec.design.maxDepth sc.1.id).isSome).map fun rq =>
            { property := "wellFormed"
              message := s!"required element {rq.element} (for {c}) has no field within {spec.design.maxDepth} clicks of the start screen"
              screen? := ((allComps prog).find? fun sc => (fieldOf? sc.2.kind).any (·.1 == rq.element)).map (·.1.id) } },
    -- 9. A1: passive alerts shown inline
    { property := "alertsFire", passes := passivePinned spec prog && passiveScreensKept spec canonical prog
      explain := fun _ =>
        spec.alerts.findSome? fun al =>
          if al.tier != .passive then none
          else
            match prog.screens.findSome? (fun scr =>
                if !al.targetsScreen scr || scr.components.any (fun c =>
                    (alertOf? c.kind).any (·.1 == al.id) && fixedShown scr.components c) then none
                else some { property := "alertsFire"
                            message := s!"A1: passive alert {al.id} is not always shown inline on {scr.id} (workflow {scr.workflow})"
                            screen? := some scr.id }) with
            | some finding => some finding
            | none => canonical.screens.findSome? fun scr =>
                if presetScreen prog.owner scr && al.targetsScreen scr && !prog.screens.any (·.workflow == scr.workflow) then
                  some { property := "alertsFire"
                         message := s!"A1: passive alert {al.id}'s workflow {scr.workflow} was removed" }
                else none },
    -- 8. budgets
    { property := "budgets"
      passes := decide (popupRequestCount prog (prog.screens.map (·.id)) ≤
                        popupRequestCount canonical (verifiedReachable canonical))
      explain := fun _ =>
        let n := popupRequestCount prog (prog.screens.map (·.id))
        let m := popupRequestCount canonical (verifiedReachable canonical)
        some { property := "budgets", message := s!"the program asks for {n} popups; the canonical program has {m}"
               screen? := ((allComps prog).find? fun sc => match sc.2.kind with | .alert _ true => true | _ => false).map (·.1.id) } },
    { property := "budgets", passes := decide (StabilityBudget spec prev prog)
      explain := fun _ =>
        match prev with
        | some p =>
          let moved := movedTags p prog
          some { property := "budgets"
                 message := s!"{moved.length} components moved since the previous version (budget {spec.design.stabilityBudget}): {", ".intercalate moved}" }
        | none => none },
    { property := "navigation", passes := decide (NavigationSane prog)
      explain := fun _ => navigationFinding prog }
  ]

/-- The first failing rule's finding (a rule that cannot locate its failure
reports a generic message). -/
def firstFinding (rs : List Rule) : Option Finding :=
  (rs.find? (!·.passes)).map fun r =>
    (r.explain ()).getD { property := r.property, message := s!"{r.property}: rule failed" }

/-! ## Counterexamples, replayed through the interpreter -/

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

/-- Replay events one at a time; stop at the first one that is not `ok`.
Returns the events that replayed, the final state, and whether all did. -/
def replayOk (spec : Spec) (prog : Program) (facts : Facts) (user : User) :
    State → List Event → List Event × State × Bool
  | s, [] => ([], s, true)
  | s, e :: rest =>
    match step spec prog facts user .human s e with
    | (s', .ok) =>
      let (es, s'', ok) := replayOk spec prog facts user s' rest
      (e :: es, s'', ok)
    | _ => ([], s, false)

/-- Reveal component `cid` on the current screen and click it. -/
def revealAndClick (s : State) (prog : Program) (cid : CompId) : List Event :=
  let comps := prog.compsOf s.screen
  match comps.find? (·.id == cid) with
  | some c => revealEvents s comps (comps.length + 1) c ++ [.click cid]
  | none => [.click cid]

/-- Follow a path of "go to" hops, revealing each button first. Returns the
events, the screens visited, the final state, and whether every step
replayed. -/
def followHops (spec : Spec) (prog : Program) (facts : Facts) (user : User) :
    State → List Hop → List Event × List ScreenId × State × Bool
  | s, [] => ([], [], s, true)
  | s, h :: rest =>
    let (es, s', ok) := replayOk spec prog facts user s (revealAndClick s prog h.1)
    if ok && s'.screen == h.2 then
      let (es', scrs, s'', ok') := followHops spec prog facts user s' rest
      (es ++ es', h.2 :: scrs, s'', ok')
    else (es, [], s', false)

/-- Build a counterexample for a finding: a shortest click path from the
start screen to the finding's screen, then the triggering click. Every event
is replayed through the interpreter; the path is cut where replay fails.
Returns the events, the screens visited, and whether it replayed fully. -/
def counterexample (spec : Spec) (prog : Program) (f : Finding) : List Event × List ScreenId × Bool :=
  let facts := replayFacts
  let user := replayUser prog
  let s0 := init spec prog facts user
  match f.screen? with
  | none => ([], [s0.screen], true)
  | some z =>
    let hops := (pathTo prog (openGotoEdges prog) prog.start z).orElse fun _ =>
      pathTo prog (allGotoEdges prog) prog.start z
    match hops with
    | none => ([], [s0.screen], false)
    | some hops =>
      let (es, scrs, s, ok) := followHops spec prog facts user s0 hops
      if !ok then (es, s0.screen :: scrs, false)
      else
        match f.click? with
        | none => (es, s0.screen :: scrs, true)
        | some cid =>
          let trig := revealAndClick s prog cid
          -- every reveal event must replay; the final click may be blocked
          let (rs, _, rok) := replayOk spec prog facts user s trig.dropLast
          (es ++ rs ++ (if rok then [.click cid] else []), s0.screen :: scrs, rok)

/-! ## The verdict -/

/-- **The checker.** `ok`, or the first violated property with a message and a
replayed counterexample path. -/
def check (spec : Spec) (prev : Option Program) (canonical prog : Program) : Verdict :=
  match firstFinding (rules spec prev canonical prog) with
  | none => .ok
  | some f =>
    let (es, scrs, ok) := counterexample spec prog f
    .violation f.property (if ok then f.message else f.message ++ " (counterexample path cut where it stopped replaying)") es scrs

end Ehr.Check
