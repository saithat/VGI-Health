# Handoff: simulation lane (`lane/sim`, worktree `/home/saithat/Projects/VGI-sim`)

Written by the Claude session at the orchestrator's request (Codex continues this lane).

## 1. State of the branch

| Commit | What |
|---|---|
| `2145612` | Merge of `origin/lane/lean-core` M3 (api + cli: `Ehr/Api.lean`, `Main.lean` with `init/step/view/run-batch/spec-export`). Merged so the sim lane can add `simulate` / `min-clicks` arms to that `Main.lean`. |
| `03c2416` | Merge of `origin/main` (BRIEF: CURES review and naloxone offer rules). |
| `ce1e487` | **Step 1 done:** `lean/Ehr/Sim/Goals.lean` + `lean/Ehr/Sim/GoalsTests.lean` (registered in `lean/Ehr.lean`). |

`lake build` is clean (37 jobs). No `sorry` anywhere in the sim files.

### What `Ehr.Sim.Goals` provides
- `ValueGoal {element, slot?, value?, commit}`: `slot? = none` means any slot, `value? = none` means any accepted value.
- `Goals {commits, values, expectedAcks, problems}`.
- `deriveGoals sp facts user wf choices orders med?`: goal commits (`taskCommits`, by workflow, kept only if the spec defines them), the required values (entry requirements of goal commits that apply with the chosen orders in place: order elements get one goal per chosen order line; task elements get one goal), the interruptive alerts expected to fire (`alertKeys` on a hypothetical state with the goal values), and problems (choices that don't fit the element kind fall back to "any value", with a message).
- `episodes facts wf choices`: W4 makes one episode per administered med, with `facts.medToGive? := some drug`. Every other workflow has one episode.
- `goalsMet`, `valueGoalMet`, `commitValuesMet`, `capturedMeets`, `goalValue` (uses `placeholder` for "any value" goals), `secondUser` (`user.id ++ "-second"`, for cosigns), `tenthsText`, `weightKgGoal` (converts lb to kg: the clinician converts).
- Naming conventions are in the module docstring: order elements `drug, dose, doseUnit|unit, route, freq|frequency, indication|abxIndication`; task elements `weight, refillDecision, disposition`, note sections (element ID = section name), and `vaccine|immunization|cvx` (one slot per immunization). Commit IDs follow core-model: `signOrders, signNote, ackResult, administerMed, recordImmunization, signOpNote, discharge, approveRefill`, plus `disposition` for W3. **The content lane hasn't written spec v1 yet.** When it does, check these names against `lean/Ehr/Specs/V1.lean` and adjust `orderElements`, `taskValue`, and `taskCommits` (or ask content to rename).

## 2. In progress

Nothing is half-written. Steps 2–6 below have not been started.

## 3. Remaining tasks (from the original brief and later messages; nothing dropped)

1. **Persona policy** `lean/Ehr/Sim/Policy.lean`. It plays an episode through `Ehr.step` on a program. It must be deterministic and seeded, with a small PRNG written in Lean (SplitMix64 on `UInt64`, plus an FNV-1a string hash for seeds).
   - **Navigation:** shortest path by BFS over screens and components to the nearest actionable unmet goal. Moves: shown goto/back buttons, tab selection, collapsible group toggles. Use real `step` for transitions and dedupe on (screen, sorted expanded, sorted tabSel, currentSlot). Replan after every navigation event. Allow `newOrderLine` only when every goal with slot ≤ `currentSlot` is met, because `.current` fields can't go back to an earlier slot.
   - **Entering values:** enter values, confirm prefills (when the pending value equals the goal value), and ack popups. Read interruptive popups: `[think, point, click]`. For removable popups, override with probability `overrideRate`‰: `[point, click]` with no think. When `reviewsAllergiesEarly`, click a shown `markReviewed i` button for a reviewed info. Use component hotkeys with probability `keyboardShare`%.
   - **Detours:** when `searchWhenBuried` and the BFS path is ≥ 3 moves, do a `search` event if a search component is shown (otherwise scroll), plus a scroll. With probability `backtrackRate`‰ per screen arrival, make a wrong turn (a random shown goto). For scrolling, find the target's index among the shown components; if it is past a fold (for example 12), emit `scroll` events at about 10 components per page.
   - **Interruptions:** `task.interruptions` become `[wait, think]` ops attached to goal actions. Draw their positions from the number of goal actions (values + commits), before any UI-dependent draw, so the interruptions are the same under every UI version. Don't drop interruptions in a faster UI.
   - **Termination:** structural recursion on fuel, for example `4 × (#values + #commits + 2) × (#screens + 4) + 50` iterations. Report incomplete tasks; never loop. Count failed commit attempts and give up after a few.
   - **Complaints:** when a commit is blocked with `review required: i …` while the state holds a receipt for `i` that isn't valid, record why: data version, age vs window, role, or `shownOnCommit` (no receipt allowed). Also record goal `problems` and stuck tasks.
   - **CURES waivable reviews (orchestrator message):** lane A is adding `ReviewReq.waivedBy` (a human-entered exemption element can waive a review) and `When.naloxoneRisk`. **Merge `origin/lane/lean-core` when it lands** (it hadn't as of `03c2416`). By default the policy shows the CURES report (`curesReport`): on the commit screen, or as a receipt within 1,440 min. If the scenario says it's exempt (for example an ED ≤7-day supply), the policy enters the exemption reason in the `waivedBy` element instead. `TaskChoices` has no exemption field yet. Request one in `docs/design/changes-requests.md` (for example `curesExemption? : Option String`, filled by the world lane), or agree on a convention. **The floor counts whichever legally valid path is cheaper.** Showing the report on the commit screen costs 0 in the ideal UI, so the waiver is not a floor item. In min-clicks, include waiver-entry events only when the scenario is exempt. The naloxone offer is an ordinary entry requirement under `naloxoneRisk`: `deriveGoals` picks it up through `whenHolds`/`lineMatches` once Core has it, but check what value it needs (probably a flag or code).
   - **Facts:** call `deriveGoals` per episode, with `facts.now := task start minute` and `state.clock` advanced by the KLM time of each event (`changes.md`: the caller advances the clock). Carry receipts made earlier in the day forward to later tasks for the same patient.
2. **Metrics** `lean/Ehr/Sim/Metrics.lean`.
   - **KLM constants in one place, in ms:** keystroke 200, point 1100, click 100, home 400, mental 1350 (Card, Moran & Newell 1980). Our labeled assumptions: scan 1500, wait (second nurse, and an interruption) 60000, scroll 1100.
   - **Homing:** `Op` has no `home`, so infer H whenever the op stream switches between mouse ops (point/click/scroll) and `key`. Optionally request `Op.home`.
   - **Metrics are a pure function of the trace.** clicks = activations (click/selectTab/confirm/ack = 1; enter = 1 unless its ops contain `scan`; search = 1). A hotkey press counts as one activation (a click) and costs `key` in KLM, so hotkeys save time, not clicks; document this. This "activation" model is what makes the floor and min-clicks consistent. keystrokes = typed characters: `typedLen v` for enter (qty: decimal text length; code: `min len 4 + 1` for type-ahead; text/user: length; flag: 0; scan: 0) plus the query length for search. scrolls = scroll events. popups = ack events. overrides = acks without `think`. searches = search events. backtracks = screen reversals A→B→A in the trace. klmDeciSec = KLM over the ops with inferred homing.
   - **Floor (per episode, summed per task):**
     - each value goal: 1 click unless it is a scan or `autoLinked`. Keys = `typedLen` only if the element must be typed (`prefill = never` or human-only, not a scan).
     - each commit: 1 click.
     - each expected interruptive ack: 1 click + 1 popup.
     - KLM: M per goal action. The cheapest activation is one `key` (0.2 s). Add the scan op for scans, a wait for cosigns, and M+P+C per ack.
     - no navigation, scrolls, searches, backtracks, or overrides.
     
     This is ≤ actual by construction *if* the policy charges `think` before every goal action and every interruptive popup.
3. **min-clicks** `lean/Ehr/Sim/MinClicks.lean` and **T9**. See section 4: the design matters.
4. **CLI** `lean/Ehr/Cli/Sim.lean`, with minimal match arms in `lean/Main.lean` (the orchestrator resolves conflicts):
   - `ehr simulate --spec <spec.json> --program <p.json> --persona <params.json> --schedule <day.json> --fhir <dir-or-bundles> [--seed N]` → `DayResult` JSON. `programVersion` = `program.version`; `floor` = per-task floor metrics; `complaints` = strings.
   - `ehr min-clicks --spec … --program … --task <task.json> [--fhir …]` → `{clicks, keystrokes, path}`. Also add `space`, `exact`, and `keystrokePath`.
   - **Facts source:** the render lane (`lean/Ehr/Render/Fhir.lean`) will parse FHIR bundles into `Facts`. It isn't on any branch yet. Until then, accept precomputed `Facts` JSON files in `--fhir <dir>` (keyed by `patientId`), and merge each task's `todayResources` into the bundle once the parser exists.
   - **User:** `{id := program.owner, role := params.role}`.
   - **Seeding:** one RNG stream per task, derived from `(seed, task.id)`, so validation replays on old and new versions are paired.
5. **Persona params** `programs/personas/P1.json` … `P5.json` (`PersonaParams` JSON; every field is required, see changes.md M1 #9). Suggested distinct values, from BRIEF §6:
   - P1 (PCP, keyboard heavy, many receipts): `keyboardShare 70, reviewsAllergiesEarly true, scansSidebar true, backtrackRate 40, searchWhenBuried true, overrideRate 300`.
   - P2 (ED, mouse, time pressure): `15, false, false, 80, false, 700`.
   - P3 (RN, scanner, interrupted): `20, true, true, 60, true, 200`.
   - P4 (peds NP, mixed): `45, true, true, 50, true, 250`.
   - P5 (surgeon, fast, order sets): `35, false, false, 30, false, 600`.
   
   Roles: physician, physician, rn, np, surgeon.
6. **Tests:**
   - determinism: same seed → identical `DayResult`;
   - floor ≤ actual for every metric of every *completed* task;
   - on the canonical program, P1's W1 task completes (needs content's `lean/Ehr/Canonical/` + `Specs/V1.lean`; merge `lane/content` when it lands);
   - removing a redundant prompt reduces clicks: e.g. a tiny-spec variant with a removable alert and `alert a (popup := true)` on the sign screen, vs the same program without it. Check this with both simulate and min-clicks.
   
   Until content lands, test on `Ehr.Examples.Tiny` (W1-like: rooming → order → sign) and small hand-made schedules.
7. Keep `TODO_PROOFS.md` updated: T9 row, owner lane D/sim. Every temporary `sorry` must be listed there; the final file must have none.

## 4. Design notes for min-clicks / T9 (important; worked out, not yet coded)

**Use a certificate check, not a proof of the search loop.** Write a generic shortest-path search over states, with state-dependent allowed moves `moves s`, integer weights `w s e` (clicks = activation weight, keystrokes = typed chars; both via a bucket-queue Dijkstra, since scan entries have 0-click weight), and a visited map. Then run a separate check on its output, and return a result only if the check passes:
- `V : Std.TreeMap Nat (List (State × Nat))`. The key is a hash `Nat` of a canonical serialization; buckets hold (representative state, distance).
- (C1) the start state is in `V` with distance 0.
- (C2) for every entry `(a, d)` with `d < D` (D = the answer): `goal a = false`, and for every `e ∈ moves a` there is an entry `(a', d')` in the bucket of `step a e` with `abs a' = abs (step a e)` (checked with `DecidableEq`) and `d' ≤ d + w a e`.

From (C1)/(C2), induction on runs proves: every allowed run from the start with total weight `< D` ends in a non-goal state. That is the lower bound. The path half (a real run reaching the goal with weight D) is a replay check through the real `step`. Theorem: `minClicks … = some r →` (path replays from `init`, every event is allowed, it ends in `goalsMet`, its weight = `r.clicks`) ∧ (every allowed run reaching `goalsMet` has weight ≥ `r.clicks`). The lemmas needed: `Std.TreeMap.mem_toList_iff_getElem?_eq_some` (needs `TransCmp`/`LawfulEqCmp`, which `Nat`/`String`/`List Nat` have), and `List.find?`/`List.all` lemmas. Hash collisions only make the check fail; they never make the theorem false.

**The abstraction (state it in the docstring, in plain words):**
1. **Moves (goal-relevant events):**
   - clicks on goto buttons, `newOrderLine`, `markReviewed`, collapsible groups, macro buttons, and *goal* commit buttons;
   - `selectTab c i` for each tab index used by `c`'s children;
   - `enter c v` for fields whose element has a goal (v = `goalValue`), and `confirm c`;
   - `ack a` for each spec alert;
   - waiver entries, only when the scenario is exempt.
   
   **Leave out:**
   - `back`: it reads `history`, which the abstraction forgets;
   - any `click cid` where *some* component with that ID is a back button;
   - macros with a click step on such an ID: `runMacro` → `clickCore` → `goBack` reads history;
   - scroll and search: prove they never change the state;
   - clicking a commit `c` before `commitValuesMet … c` (commit with the chosen values).
2. **State key `abs s`:** everything except `history`, with `captured` grouped per element: `(sorted dedup element list).map (fun e => (e, s.captured.filter (·.element == e)))`. Write your own structural insertion sort: `List.mergeSort` is well-founded recursion and blocks kernel `decide`. **Keep `clock`.** It is constant 0 here, but `nowMin` reads it.
3. **Exactness theorem (congruence):** `abs s = abs t →` `goal s = goal t`, `moves s = moves t`, equal weights, and `abs (step s e).1 = abs (step t e).1` for allowed `e`. Define a relation `SameFuture`: all fields equal except history, and `∀ e, filter (element == e)` equal. I checked by reading the code that **every read of `captured` in Core goes through a per-element filter**: `hasEntry`, `linkedSource?`, `orderLines`, `capturedWeightKg?`, `doseMgTenths?`, `hasGoodEntry`, `entryReason`, `isLbWeight`, the `confirmCore` any/map, `setCaptured`, and the prefill append. So `SameFuture` is a congruence. Proof technique: generic lemmas `any/find?/findSome?/filterMap` over a list equal those over its element-filter when the predicate implies `x.element = e`; `setCaptured`/append/element-preserving `map` keep filter-equality. For functions that never read `captured`/`history` (`layoutShownAux`, `ownVisible`, `parentOpen`, `hasValidReceipt`, `markReviewed`, …), `f {s with captured := c, history := h} = f s` should hold by `rfl` or by induction on fuel + `rfl`. **Any Core change, such as `waivedBy`, has to keep this per-element property. Re-check after merging lean-core.**
4. **Satisfiable example:** kernel `decide` *does* evaluate `Ehr.step` on the tiny example (tested), and `Std.TreeMap` reduces. **`Std.HashMap` does not reduce** (opaque hashing / `USize`), and neither does derived `Hashable` (`mixHash` is opaque). So use TreeMap with a hand-written `Nat` hash (FNV over chars with `Nat` arithmetic mod 2^64), and structural recursion only. Instantiate T9 on a micro program (2 screens, 1 field) with `by decide` (no `native_decide`). Also add `¬`-lemmas showing the spec rejects a wrong answer.

**Feasibility, which forces two search spaces.**
- **"full":** the moves above. It is exact over goal-relevant runs, but its states grow like 2^(#value goals): a BFS must explore every subset of entered goals below the optimum. That is fine up to about 12–15 goals (W7, W2, W4) and infeasible for W1 (~30).
- **"goal-directed":** if a popup is open, the only move is its ack. Otherwise, if a shown field for an unmet goal exists, the only move is that entry (the first such component in screen order: confirm if the pending value equals the goal, else enter). Otherwise, the non-entry moves. It is small, and it is exact *among goal-directed runs*.

Run "full" with a state bound (for example 20k). If it exceeds the bound, use "goal-directed" and report `space: "goalDirected"`. The same generic certified theorem covers both. Don't claim global optimality for goal-directed. Greedy entering is *not* always optimal: a later `linked` prefill can save a click, and an earlier drug entry can add popups at an earlier commit. In tests, check that the two spaces agree on small tasks.

## 5. Known pitfalls
- **Fields with defaults are required in JSON:** `label`, `tab`, `visibility`, `size`, and `tag` on components; `receipts` and `record` on facts; `todayResources` and `interruptions` on tasks. Optional fields end in `?` in Lean, and their JSON names drop the `?`.
- **Popups are modal:** every non-ack event is `blocked` while `popup?` is set.
- **A macro's values are unconfirmed:** a human must confirm each one. A macro can't enter human-only or `never` elements, so it stops there.
- **Commit and slot rules:**
  - an already-done commit is ignored, and a commit can happen only once per episode, so W4 needs one episode per med;
  - prefill never overwrites;
  - `.current` fields bind to `currentSlot`, which only `newOrderLine` increments;
  - a default-prefilled `drug` field creates an order line, which triggers per-line requirements.
- **Removable alerts** pop up only if the current screen has `alert a (popup := true)`.
- **Time:** receipts use minutes. `nowMin = facts.now + clock/600`, and the clock is in deciseconds.
- **Lean syntax:** `section` is a keyword (don't use it as a variable name). Recursion that filters the tail isn't structural; use a fold.
- **Builds:** never run two `lake` processes in this checkout. Build one module per edit: `cd lean && lake build Ehr.Sim.GoalsTests`.

## 6. Build and test
```
cd /home/saithat/Projects/VGI-sim/lean
lake build                      # everything (~10 s incremental)
lake build Ehr.Sim.GoalsTests   # goal tests (#guard: the build fails if one is false)
```
Merge regularly: `git fetch origin && git merge origin/main`, and `origin/lane/lean-core` (for `waivedBy`/`naloxoneRisk`). Merge `lane/content`, `lane/world`, and `lane/render` when they have Specs/V1 + Canonical, schedules under `runs/world/<seed>/`, and `Render/Fhir.lean`. Commit messages end with `Co-Authored-By: …` per repo convention. Push with `git push -u origin lane/sim`.
