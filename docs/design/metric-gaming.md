# Metric gaming and the design rules that block it

[Overview](../../README.md) · [Core model](core-model.md) · [Discovery and cadence](../methods/discovery-and-cadence.md)

Status: **R1–R7 approved (2026-11-13), in implementation in the suggested order.
R3 and R5 are implemented** ([R3](#r3-copy-budget-implemented), [R5](#r5-screen-action-density-g10-implemented)).
Rules marked *new specification* are new definitions and stay flagged in Lean.

## What the agent is rewarded for

A nightly change ships when all of these hold:

1. **Release score**: the change saves at least 5 clicks plus scrolls per train day
   in a replay of the *expert* simulated clinician, after subtracting the
   usage-weighted movement proxy (one click-equivalent per observed daily use of
   each displaced control) (`agent/src/structure-policy.ts`, `agent/src/night.ts`).
2. **Validation gate** on a held-out past day: every task still completes, clicks
   and scrolls do not regress, scroll pixels and mouse travel stay within 2%, and at
   least one of the four improves (`interactionAcceptable`, `improved`).
   Keystrokes are reported only as a secondary figure. Time (`klmDeciSec`),
   popups, overrides, searches and backtracks are not gated.
3. **Formal checks**: properties 1–9 (`lean/Ehr/Props/Properties.lean`), D1–D6
   (`core-model.md`), the geometry rules G1–G10 (`docs/methods/ui-library.md`),
   `StabilityBudget`, the R3 copy budget, `AlertBudget` and the identity movement budget.

So the optimizer sees **clicks and scrolls made by a clinician who already knows
the layout perfectly**. Any cost outside that count is free to the agent.

## Existing guards

| Guard | Blocks |
|---|---|
| P2/P4/D2, `CommitScreenShowsReviews` | Hiding required review items, or moving them off the commit screen |
| P5, `NoAutomationAttempts` | Prefilling or macro-entering human-only steps; macro commits or acks |
| P6 completable (option D) | Removing the controls a feasible workflow needs |
| P8 `StabilityBudget`, movement proxy, identity budget | Large reshuffles; renaming tags to hide a move |
| P9, D4, `AlertBudget` | Suppressing alerts or turning interruptive alerts passive |
| D3, D5, D6 | Empty labels, fake primary buttons, orphan screens, nav groups with more than 12 entries |
| G3, G4, G6 | Targets under 24 px, clipped or overlapping text, low contrast |
| G9 | Commit button scrolled off screen |
| Train/validation split | Using validation days to tune a change |

## Ways to game the metric that are still open

| # | Gaming move | Why it scores | Status |
|---|---|---|---|
| V1 | **Spray copies.** Add shortcut copies of frequent controls and links to many screens. | Copies are exempt from `StabilityBudget` and from the movement proxy. The expert clinician pays nothing for clutter. | Closed by R3 in the checker. The movement proxy still ignores copies. |
| V2 | **Mega-screens.** Merge workflow screens and flatten tabs into one dense screen. | Saves navigation clicks. Scanning time is not counted. Scrolling is gated, but G3/G4 allow dense packing at the 24 px floor. | Partly closed: R5 (G10) bounds Lean-computed geometry. The deployed React painter has no Lean geometry, so R1 and R2 remain the guard there. |
| V3 | **Drop context nobody is required to review.** Remove problem lists, history panels and non-required info from a workflow. | The expert clinician reads only what its goals require, so removal costs nothing and may cut scrolls. | Open: the information-needs simulator exists but is not connected to the score. |
| V4 | **Move cost into keystrokes or time.** Swap pick lists for typing, or swap clicks for hover menus or hotkeys. | Keystrokes and time are not gated. | Open |
| V5 | **Rely on perfect memory.** Put controls in unlabeled or unpredictable places. | The expert has no search cost. The bounded (learning) clinician exists but only feeds the opt-in switch-cost model. | Open |
| V6 | **Stuff labels with keywords.** Use long nav labels packed with rulebook terms. | Draws the bounded clinician's lexical scent. D3 only requires a non-empty label. | Open but low impact today (the score uses the expert). It matters once V5 is closed. |
| V7 | **Two-night move.** Copy a control on night N, then delete the original on night N+1. | It may slip past the movement proxy. | Night N is now charged by R3 (an added copy counts against `stabilityBudget`). Night N+1 is probably guarded (`movedTags` counts a promoted copy as a move); R7's test is pending. |
| V8 | **Default to the usual answer.** Set field defaults to the most common train value. | Saves keystrokes only, so the score does not move. It does create default-acceptance risk. | Low impact; `defaultConfirm` already requires a human confirm. |

## Proposed rules

Each rule targets one or more of the vectors above. Rules R1–R4 close the
high-impact ones; R5–R7 are smaller.

**R1. Full-cost validation gate** (gate change, no Lean change). On validation, add
keystrokes and `klmDeciSec` to the no-regression set, with the same 2% tolerance
used for pixels. Closes V4 and partly V2. *Policy change: flagged.*

**R2. Learnability gate** (gate change). Also replay validation with the bounded
clinician, starting from the actor's carried train memory. Completion must not
drop, and clicks, scrolls and time must not regress beyond tolerance. A new
layout must stay usable for someone still learning it. Closes V5 and makes R6
meaningful. *Policy change: flagged.* Costs one more replay per candidate.

**R3. Copy budget** (*new specification*, Lean `Props`). For every tag: at most one
copy per screen, and at most `spec.design.copyBudget` copies per program. Copies
added since the previous version count against `stabilityBudget`. Closes V1 and V7.
Default proposal: `copyBudget = 2`, to be checked against the copy counts already in
the retained programs.

**R4. Context retained** (*new specification*, spec data plus Lean `Props`). Each
workflow declares a context set of info items (for example allergies, active
problems, recent vitals, and the reason for visit), sourced like the other spec
entries. On every screen with a commit button for that workflow, each context info
is shown or reachable within `RequiredWithinDepth`'s depth bound. Like
`CommitScreenShowsReviews`, but reachability is enough. Closes V3. Connecting the
existing information-needs simulator (lookup detours, memory carry) to R2's replay
measures the remaining cost.

**R5. Screen action density** (*new specification*, geometry rule G10). At
1440×900, the number of active targets in the first viewport and in each scroll
viewport is at most `spec.design.maxTargetsPerViewport`. Set the default from the
largest count in the current release programs, so no existing design fails. Closes
V2 together with R1 and R2.

**R6. Honest navigation labels** (*new specification*, extends D5). A nav link's
label equals its target screen's title or one of its declared aliases, and labels
have at most `maxLabelWords` words (default 4). Closes V6.

**R7. Two-night move test** (test only). Add a regression test for V7 that copies a
control on one night, deletes the original on the next, and expects the movement
proxy and `StabilityBudget` to charge it.

## R3: copy budget (implemented)

*New specification.* Lean: `copyTag`, `screenCopies`, `programCopies`,
`addedCopies` (`lean/Ehr/Props/Basics.lean`); `CopyBudget`, `CopyBudgetChecked`,
`CopyStability` (`lean/Ehr/Props/Properties.lean`); `spec.design.copyBudget`
(default 2, omitted from spec JSON at the default).

- A copy counts against its **original's tag**: `copyOf` names a component ID, and
  the first non-copy component with that ID supplies the tag. If the original is
  missing or untagged, the copied ID is the key. The copy's own tag is ignored, so
  renaming copies does not open a new budget. In every retained program the copy's
  tag differs from the original's, so keying by the copy's tag would count nothing.
- The checker refuses with property `copyBudget` when a screen holds two copies of
  one tag, when a program holds more than `copyBudget` copies of one tag, or when
  moved tags plus added copies exceed `stabilityBudget`. An added copy is a copy
  (by screen and component ID) that was not a copy on that screen in the previous
  version. Messages name the screen, tag, counts and budget.
- Theorems: `copyBudget_of_checked` (the executable check implies the bound for
  every tag string), `copyStability_stability` (R3 implies the existing
  `StabilityBudget`), `accepted_copyBudget` and `accepted_copyBudget_tag`
  (checker acceptance implies both parts). Axioms: `propext`, `Classical.choice`,
  `Quot.sound`. `StabilityBudget` is unchanged; R3 is an extra rule.
- Bad-program suite: `lean/Ehr/Check/bad/41-copy-spray.json` copies the P1 "Review
  and sign" button onto three screens and fails `copyBudget`. Lean regressions in
  `lean/Ehr/Check/CopyTests.lean` cover the per-screen, per-program, renamed-copy
  and stability cases.

Measured copy counts (copies per program; largest count for one tag):

| Programs | Copies | Most copies of one tag | Most on one screen |
|---|---|---|---|
| `releases/v1`–`v3`, canonical and P1–P5 (18 programs) | 0 | 0 | 0 |
| `runs/core-10day` P1 v0–v5 | 0–1 | 1 | 1 |
| P2 v0–v7 | 0–5 | 1 | 1 |
| P3 v0–v4 | 0–5 | 1 | 1 |
| P4 v0–v8 | 0–4 | 1 | 1 |
| P5 v0–v4 | 0 | 0 | 0 |

No retained program has more than one copy of any tag, so the default
`copyBudget = 2` refuses none of them by itself. The stability part is reported
below.

## R5: screen action density, G10 (implemented)

*New specification.* Lean: `G10`, `firstViewportTargets`, `windowTargets`,
`densityFindings` (`lean/Ehr/Layout/Check.lean`); `shell_density`,
`render_density`, `checkProgramDensity`, `acceptFamilyDensity`
(`lean/Ehr/Layout/Density.lean`); `spec.design.maxTargetsPerViewport` (default 15).

- At 1440×900, G10 counts **active targets** (modal-aware, as in G3). The first
  viewport is every target with area inside the page and every enclosing scroll
  viewport at zero scroll. Each scroll viewport is checked at every scroll offset:
  `G10_window` proves that the finitely many checked windows (each starting on a
  target's last row) bound all offsets.
- The layout checker refuses with rule `G10`, metric `first-viewport-targets` or
  `scroll-window-targets`, the count, the limit and the excess. This applies to
  layout requests, ported screens, custom families (`acceptFamilyDensity`) and
  `program-check` (`checkProgramDensity`).
- The fixed shell that paints every renderer output has a proved capacity of 15
  (`shell_density`): its 756 px body scroller meets at most 15 rows of 48 px on a
  56 px pitch, and the first viewport shows 14 rows plus the commit.
  `checkProgramDensity_sound` gives G10 at the spec's limit, with `Realizes`, for
  every patient, display, user and state.
- Bad layout: the native test adds 20 buttons to the reference template; it is
  refused at the default limit and accepted at 40. Lean regressions are in
  `lean/Ehr/Layout/Tests.lean`.

Measured counts on the fixed shell at 1440×900 (`ui-port-audit --all-screens
--all-variants`: every screen with initial, expanded-group, tab and alert-probe
states; one synthetic patient):

| Programs | First viewport | Densest scroll window |
|---|---|---|
| Release personas v1–v3 | 10–11 | 13–15 (P1 and P5 `w1Rooming`) |
| Release canonical v1–v3 | 10 | 15 |
| `runs/core-10day` shipped revisions | 8–11 | 13–15 (P5 `w6Schedule`) |
| W1 research port (`w1Sign`) | ≤ 10 | ≤ 10 |

The default is 15, the largest release count. **Finding:** 15 equals the fixed
shell's capacity, so no program can fail G10 at the default. Density on that
path is converted into scrolling, which the validation gate already counts. G10
binds custom agent layouts and any lower limit. Because `checkProgramDensity` is a
static decision, a limit below 15 refuses every program, including ones whose
screens are sparser. The deployed React painter has no Lean geometry, so R5 does
not constrain it.

## Retained recording against R3 and R5

Every certified revision in `runs/core-10day/certifications` (33 bindings) was
re-checked offline with the native checker, using its recorded spec, canonical
and previous program. The recording was not changed.

| Rule | Revisions refused | Detail |
|---|---|---|
| R3 copy budget | 0 of 33 | At most one copy of any tag (default budget 2), never two on one screen. |
| R3 stability charge | 0 of 33 | Most copies added in one version: 4 (P3 v4), within the recorded `stabilityBudget` of 8 together with that version's moved tags. |
| R5 / G10 | 0 of 33 | Fixed-shell counts reach 11 (first viewport) and 15 (scroll window), equal to the default limit; `program-check` accepts all 51 release and recorded programs. |

No shipped revision would now be refused, so nothing is grandfathered. The R5
result follows from the shell capacity above, not from the recording's
restraint. The release certification matrix also still accepts all 15 personas
(with their previous release as `prev`).

## Suggested order

1. R7 (test) and R1 (gate). Small, and they settle whether V7 is open.
2. R3 and R5 in one Lean lane. Both are counting rules over existing structures. *Done.*
3. R2. Needs replay plumbing, plus a check of how many retained releases still pass.
4. R4 and R6. Both need new spec data (context sets, screen aliases), and R4 needs
   cited sources for each workflow's context set.

Each new rule must be checked against `runs/core-10day`'s retained releases before
it is enforced. A rule that would retroactively reject a shipped version is
reported, not silently grandfathered.

## Out of scope

- Safety layout risks that are not metric gaming, such as a commit button next to a
  frequently clicked nav link. G3 already separates active targets.
- Replacing the click-plus-scroll score with a time score. R1 and R2 add time as a
  constraint without changing the objective.
