# Handoff: checker lane (`lane/check`)

Worktree: `/home/saithat/Projects/VGI-check`, branch `lane/check` (pushed).
Merged up to `origin/main` at `f6fd803` (interpreter M2, API/CLI, California
rules, lane A proofs T0/T3/A2/A4). **Not yet merged:** `origin/lane/content`
(`9334554`, spec v1), and `origin/main` `3cdc6cc` (app lane).

## Build and test

```
cd lean
lake build                      # builds everything, incl. Props, Check, CLI, T4; must show no sorry
lake build Ehr.Props.Examples   # kernel-checked examples (decide) on the tiny spec
lake build Ehr.Proofs.CheckDeploy   # T4 + #print axioms
.lake/build/bin/ehr check  --spec S.json --program P.json [--prev P0.json] --canonical C.json
.lake/build/bin/ehr deploy --spec S.json --program P.json [--prev P0.json] --canonical C.json --out DIR [--time ISO]
```
Quick JSON fixtures: write `Ehr.Examples.Tiny.spec`, `Tiny.program` (bad) and
`Ehr.Props.Examples.goodProgram` (good) with `Lean.toJson … |>.pretty`
(a 6-line `lake env lean --run` script).
Expected: good → `"ok"`, exit 0; tiny → `noFalseAlarms` (its sign screen asks
the interruptive drug–allergy alert to pop up), exit 1.

## Done (commits)

| Commit | What |
|---|---|
| `769c740` | **Props**: properties 1–12 + `Satisfies` over the real interpreter (`lean/Ehr/Props/Basics.lean`, `Properties.lean`). Each docstring says "by construction" (interpreter, lane A) or "needs the checker". |
| `9b4a19c` | Props: structural clauses restated with bounded quantifiers + `Decidable` instances; named examples (`lean/Ehr/Props/Examples.lean`, all `decide` in the kernel, including runs of the real interpreter). |
| `bd68596` | `docs/design/changes-requests.md` (CR-1…CR-4, see pitfalls). |
| `09d5abd`, `48f5c48` | **Checker** (`lean/Ehr/Check/Graph.lean`, `Rules.lean`, `Check.lean`): ordered rule list, first violation, BFS counterexample replayed through `Ehr.step`. Props updated for `waivedBy` and `lineMatches`' new signature; `SpecIdsUnique` added. |
| `dd99888` | **CLI** `ehr check` / `ehr deploy` (`lean/Ehr/Cli/Check.lean`, two match arms in `lean/Main.lean`), `lean/Ehr/Check/Deploy.lean` (pure `deployPlan`, FNV-1a hashes, `Target` = version / versionCert / current / currentCert). **T4 proven** (`lean/Ehr/Proofs/CheckDeploy.lean`). |
| (this commit) | `#print axioms` for T4; my modules added to `lean/Ehr.lean`; `TODO_PROOFS.md` rows T1/T4; this note. |

Key design facts:
- `Episode` = spec, program, facts, user. `Reachable` = from `init`, any event by
  human or macro, plus `wait d` (clock advances). `Always`, `EveryStep`,
  `CommitHappens` (c ∉ before, c ∈ after).
- "Shown" = the interpreter's `view` (`item.shown`), per orchestrator.
- Every semantic part is quantified over all facts and users with
  `user.role = prog.role`. Required commits = commits on a button in the
  canonical or the candidate that the program's role may perform.
- Structural parts are decidable; the checker's rules for them are literally
  `decide (Prop)`, so their T1 lemmas are `of_decide_eq_true`.
- Checker-only rules (stronger than the text, sound by design): `reviewsPinned`,
  `landmarksPinned`, `passivePinned`, `passiveScreensKept`, `completeFor`,
  depth via `shortPathTo` (paths re-checked by `isGotoPath`), alert budget
  counts all candidate screens vs verified-reachable canonical screens.
- Rule order (first failure is reported): wellFormed (catalog, spec IDs,
  program IDs, references) → writesOnly → A4 → A3 → A2 → A1 (macro touches an
  alert) → humanOnlyKept → units → capturesAllOnce → reviewsBeforeCommit →
  completable → wellFormed (landmarks, depth) → A1 (passive inline) → budgets.
  Property strings: `wellFormed`, `writesOnly`, `alertsFire`, `noFalseAlarms`,
  `noRepeatInterruptions`, `severityTiers`, `humanOnlyKept`, `units`,
  `capturesAllOnce`, `reviewsBeforeCommit`, `completable`, `budgets`.

## Remaining tasks (none dropped)

1. **Merge `origin/main` and `origin/lane/content`** (spec v1 `lean/Ehr/Specs/V1.lean`;
   canonical program and bad programs 1–14 when they land under
   `lean/Ehr/Canonical/`). Then:
   - **Tests** (`lean/Ehr/Check/Tests.lean`, `#guard`): checker accepts the
     corrected tiny program (done ad hoc, make it a `#guard`) and canonical v1;
     rejects each bad program 1–14 with the expected property, and its
     counterexample replays (`counterexample … = (_, _, true)`). Expected:
     1 reviewsBeforeCommit, 2 humanOnlyKept, 3 units, 4 humanOnlyKept,
     5 humanOnlyKept, 6 units, 7 completable, 8 humanOnlyKept,
     9 alertsFire, 10 noFalseAlarms, 11 noRepeatInterruptions,
     12 severityTiers, 13 completable, 14 humanOnlyKept. If content encodes a
     bad program differently, adjust rule order/messages, **not** the props.
   - Each bad program also needs a `¬ Satisfies` lemma: prove the failing
     structural clause false by `decide`, or (bad 1, 7, 13) exhibit a
     reachable state (`Reachable.step …` chain) where the semantic clause fails.
   - Register `v1` in `specRegistry` (Main.lean is lane A's) if not done.
2. **Canonical acceptance risks** (check as soon as canonical lands):
   - CR-1: the checker rejects any program with an "add order line" button
     when a required commit has a per-order-line requirement (real stuck
     state: an unfinished line can't be reopened). Needs lane A to block
     `newOrderLine` while the current line is unfinished; then relax
     `completeVia` (allow `hasNewLine` when that guard exists).
   - Completability uses only "go to" buttons the user can always show; a
     Back button is not an edge. If the canonical relies on Back to return to
     rooming, it will be rejected (this is a real stuck state when an
     intermediate screen has no way back; see the tiny example). Either the
     canonical adds navigation, or add sound Back reasoning (Back from S lands
     on *some* predecessor of S: usable only if every predecessor reaches the
     target).
   - Unique component IDs are required **per screen** (Tiny repeats `banner`
     across screens). Lane A asked for "unique component IDs per program";
     confirm which their proofs need (A4 needs unique **alert** IDs, which
     `SpecIdsUnique` enforces).
3. **Catalog gating for the new `priorAuth` kind** (lane A, coming): add the
   constructor to `Ehr.Props.kindName` (`"priorAuth"`) and to the Option
   helpers if it has fields; `CatalogOnly` then rejects it unless the spec's
   `design.catalog` lists it. Also review every `match c.kind` in
   `Rules.lean`/`Check.lean`.
4. **T1** (`lean/Ehr/Proofs/CheckSound.lean`, skeleton with `sorry`s listed in
   `TODO_PROOFS.md`, then prove): `check spec prev canonical prog = .ok →
   Satisfies spec prev canonical prog`. Steps:
   - `check = .ok ↔ ∀ r ∈ rules …, r.passes` (from `firstFinding`; `rules` is
     an explicit list, so `simp [rules]` gives one Bool per rule).
   - Structural clauses: `of_decide_eq_true` (catalog, IDs, references,
     writes, A2/A3/A4/A1-macro, human-only, units, linked, stability).
   - By-construction clauses from lane A: `CommitCapturesAll`,
     `CommitReviewsMet`, `InterruptiveHandled`, `CommitUnitsRight`,
     `CosignIsSecondUser` from `T0_commit_needs_guard` + `commitGuard_iff`
     (my `EntryMetIn`/`ReviewMetIn`/`CountsFor` are the Prop forms of
     `entryMet`/`reviewMet`/`capturedSatisfies`). `AlertsOnlyWhenTrue` from
     `A2_popup_holds`/`A2_view_shown`; `PassiveNeverPopsUp` from `A4_*`;
     `OnlyHumanCommitsAndAcks`, part of `HumanStepsByHuman` from `T3_*`
     (note: `HumanMustEnter` also covers `prefill = never`, which T3's
     `isHumanOnly` does not; prove that part by induction on `Reachable`:
     prefill skips `never`, macro `enter` refuses `never`).
     `EnteredOnce`, `InterruptsOnce`: induction on `Reachable` over the
     interpreter (popup is modal; `ackCore` appends; `setCaptured` only on
     `enter`; prefill only where nothing is captured; `confirmCore` maps).
   - Checker-rule clauses: (a) screen invariant by induction on `Reachable`:
     `s.screen` and every history entry name a program screen (start exists;
     `goTo` checks; `goBack` pops history); (b) `fixedShownAux → layoutShownAux`
     for every state (same recursion and fuel); then `reviewsPinned →
     CommitScreenShowsReviews` (the `unlessReceipt` case uses
     `receiptHideSafe`: a receipt valid for any receipt-accepting requirement
     is valid for this one), `landmarksPinned → LandmarksShown`,
     `passivePinned → PassiveShownInline` (alert `shown` = layout && holds);
     (c) depth from `shortPathTo_sound`; alert budget from
     `verifiedReachable_sound` + monotonicity of `popupRequestCount` in its
     screen list; (d) `WritesAllowed` by induction (enter checks the role;
     prefill only from fields, whose elements/roles `DeclaredWritesInSpec`
     checks; commits need `roleOk`; receipts need a known info).
   - Hardest: `Completable` from `completeFor` (construct the human event list:
     ack popup, navigate by open gotos with reveal events, enter each required
     value — identity text, scan code, other user, kg quantity, checked flag —
     confirm, go to the commit screen, click, ack each interruptive popup,
     click again). Safety-relevant order per brief: reviews/completability,
     human-only, units, A1, A4 first.
   - Run `#print axioms` on finished theorems; no `sorry` in finished ones.
5. **T7-lite** is implemented (counterexamples replayed; message notes a cut
   path). Stretch: prove the replayed path is a real run (it is computed by
   `step`, so mostly by definition).
6. **T9 is not ours** (moved to lane/sim).

## Known pitfalls

- `lean/Ehr.lean` and `lean/Main.lean` are lane A's; I added only imports and
  two match arms. Expect merge conflicts there.
- `Ehr.Props.Examples.goodProgram` needed a "Rooming" button on the sign
  screen: without it the checker correctly finds a stuck state.
- `lineMatches` now takes `(facts s w slot d)`; `ReviewReq.waivedBy?` exists:
  `ReviewMetIn` includes `Waived`, and `CommitScreenShowsReviews` skips
  requirements with a waiver (completability then needs the info pinned **or**
  a reachable waiver field; implemented in `completeVia`).
- `view` enables a commit button when role + entries + reviews pass; the
  interruptive popup comes on click (lane A note). Completability must account
  for acks (the plan above does).
- Kernel `decide` on whole interpreter runs is fast here; avoid
  `native_decide` (extra axiom).
- `AlertSpec.screens` are screen IDs (CR-3); `passiveScreensKept` closes the
  rename loophole against the canonical.
