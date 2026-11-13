# Metric gaming and the design rules that block it

[Overview](../../README.md) · [Core model](core-model.md) · [Discovery and cadence](../methods/discovery-and-cadence.md)

Status: **proposal for owner review.** Every rule marked *new specification* below
is a new definition and needs approval before it is implemented.

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
   (`core-model.md`), the geometry rules G1–G9 (`docs/methods/ui-library.md`),
   `StabilityBudget`, `AlertBudget` and the identity movement budget.

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
| V1 | **Spray copies.** Add shortcut copies of frequent controls and links to many screens. | Copies are exempt from `StabilityBudget` and from the movement proxy. The expert clinician pays nothing for clutter. | Open |
| V2 | **Mega-screens.** Merge workflow screens and flatten tabs into one dense screen. | Saves navigation clicks. Scanning time is not counted. Scrolling is gated, but G3/G4 allow dense packing at the 24 px floor. | Open |
| V3 | **Drop context nobody is required to review.** Remove problem lists, history panels and non-required info from a workflow. | The expert clinician reads only what its goals require, so removal costs nothing and may cut scrolls. | Open: the information-needs simulator exists but is not connected to the score. |
| V4 | **Move cost into keystrokes or time.** Swap pick lists for typing, or swap clicks for hover menus or hotkeys. | Keystrokes and time are not gated. | Open |
| V5 | **Rely on perfect memory.** Put controls in unlabeled or unpredictable places. | The expert has no search cost. The bounded (learning) clinician exists but only feeds the opt-in switch-cost model. | Open |
| V6 | **Stuff labels with keywords.** Use long nav labels packed with rulebook terms. | Draws the bounded clinician's lexical scent. D3 only requires a non-empty label. | Open but low impact today (the score uses the expert). It matters once V5 is closed. |
| V7 | **Two-night move.** Copy a control on night N, then delete the original on night N+1. | It may slip past the movement proxy. | Probably guarded (`movedTags` counts a promoted copy as a move). Needs a regression test. |
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

## Suggested order

1. R7 (test) and R1 (gate). Small, and they settle whether V7 is open.
2. R3 and R5 in one Lean lane. Both are counting rules over existing structures.
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
