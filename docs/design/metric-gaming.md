# Metric gaming and the design rules that block it

[Overview](../../README.md) · [Core model](core-model.md) · [Discovery and cadence](../methods/discovery-and-cadence.md)

Status: **all seven rules R1–R7 implemented** ([R3](#r3-copy-budget-implemented),
[R5](#r5-screen-action-density-g10-implemented)); the R7 regression exposed and fixed a
dangling-copy gap (new specification). R4 and R6 are new specifications. See the
[retained-decision replay](../methods/interaction-validation.md).
Rules marked *new specification* are new definitions and stay flagged in Lean.

## What the agent is rewarded for

A nightly change ships when all of these hold:

1. **Release score**: the change saves at least 5 clicks plus scrolls per train day
   in a replay of the *expert* simulated clinician (incomplete tasks cost their
   matched canonical effort plus a configurable 50% penalty), after subtracting the
   usage-weighted movement proxy (one click-equivalent per observed daily use of
   each displaced control) (`agent/src/structure-policy.ts`, `agent/src/night.ts`).
2. **Validation gate** on the pooled holdouts from all past odd calibration days: every task still completes, clicks
   and scrolls do not regress, scroll pixels and mouse travel stay within 2%
   plus 1px rounding slack, and at least one of the four improves
   (`interactionAcceptable`, `improved`). **R1 policy change:** keystrokes and
   modeled time (`klmDeciSec`) each stay within 2%, without the pixel slack.
   **R2 policy change:** a separate bounded replay from carried train-only memory
   must also complete fully; clicks/scrolls cannot increase and typing/time have
   the same 2% bounds. Popups, overrides, searches and backtracks are not separately gated.
3. **Formal checks**: properties 1–9 (`lean/Ehr/Props/Properties.lean`), D1–D6
   (`core-model.md`), the geometry rules G1–G11 (`docs/methods/ui-library.md`),
   `StabilityBudget`, the R3 copy budget, `AlertBudget` and the identity movement budget.
4. **Rendered screen gate**: the deployed React painter passes semantic fidelity,
   physical/urgency checks and R5's per-screen vendor-reference target limits at 1440×900.
   `CliScreenChecker` supplies this check before the sole nightly deployment path.

The release score still uses **clicks and scrolls made by a clinician who already
knows the layout perfectly**. R1 constrains typing and modeled time on validation; R2 independently constrains
bounded discovery/relearning costs. Other unmodeled costs remain outside the gate.
Reporting also shows completion, modeled time and action/time floor-gap capture.
Nightly evidence ranks train-only workflow gaps and their structural costs;
[reporting methods](../methods/agent-benefit-reporting.md) defines the cohorts and
reproduces the retained audit. These are reporting changes, not a new score.

## Existing guards

| Guard | Blocks |
|---|---|
| P2/P4/D2, `CommitScreenShowsReviews` | Hiding required review items, or moving them off the commit screen |
| P5, `NoAutomationAttempts` | Prefilling or macro-entering human-only steps; macro commits or acks |
| P6 completable (option D) | Removing the controls a feasible workflow needs |
| P8 `StabilityBudget`, movement proxy, identity budget | Large reshuffles; renaming tags to hide a move |
| P9, D4, `AlertBudget` | Suppressing alerts or turning interruptive alerts passive |
| D3, D5, D6 | Empty labels, fake primary buttons, orphan screens, nav groups with more than 12 entries; R6 also checks navigation label honesty and word count |
| R4 `ContextRetained` | Removing declared workflow context or moving it beyond `maxDepth` from a commit screen |
| G3, G4, G6 | Targets under 24 px, clipped or overlapping text, low contrast |
| G9 | Commit button scrolled off screen |
| Train/validation split | Using validation days to tune a change |

## Ways to game the metric that are still open

| # | Gaming move | Why it scores | Status |
|---|---|---|---|
| V1 | **Spray copies.** Add shortcut copies of frequent controls and links to many screens. | Copies are exempt from `StabilityBudget` and from the movement proxy. The expert clinician pays nothing for clutter. | Closed by R3 in the checker. The movement proxy still ignores copies. |
| V2 | **Mega-screens.** Merge workflow screens and flatten tabs into one dense screen. | Saves navigation clicks. Scanning time is not counted. Scrolling is gated, but G3/G4 allow dense packing at the 24 px floor. | Partly closed: separate R5 gates cover Lean geometry and the deployed React painter. Each existing React screen is bounded by that persona's no-agent reference on identical data; absent screen ids use the vendor-calibrated fallback of 57. New/merged screens and unmodeled scanning costs remain partly open; R1 and R2 constrain other costs. |
| V3 | **Drop context nobody is required to review.** Remove problem lists, history panels and non-required info from a workflow. | The expert clinician reads only what its goals require, so removal costs nothing and may cut scrolls. | R4 closes removal beyond the context bound and refuses missing policies after v3; deliberately empty policies remain possible, and the information-needs simulator is not connected to the score. |
| V4 | **Move cost into keystrokes or time.** Swap pick lists for typing, or swap clicks for hover menus or hotkeys. | Previously, keystrokes and time were not gated. | R1 implemented: each is capped at +2% on validation. |
| V5 | **Rely on perfect memory.** Put controls in unlabeled or unpredictable places. | The expert has no search cost. The expert has no discovery cost. | Closed by R2 on sampled past holdouts; the user model remains uncalibrated. |
| V6 | **Stuff labels with keywords.** Use long nav labels packed with rulebook terms. | Draws the bounded clinician's lexical scent. D3 only requires a non-empty label. | R6 bounds navigation labels and restricts them to titles or declared aliases. |
| V7 | **Two-night move.** Copy a control on night N, then delete the original on night N+1. | Previously a survivor still marked `copyOf` was ignored by `movedTags`. | R7 fixed: the movement proxy charges deletion; `StabilityBudget` counts the surviving tag's displacement with or without `copyOf`. Night N is also charged by R3 (an added copy counts against `stabilityBudget`). |
| V8 | **Default to the usual answer.** Set field defaults to the most common train value. | Saves keystrokes only, so the score does not move. It does create default-acceptance risk. | Low impact; `defaultConfirm` already requires a human confirm. |

## Proposed rules

Each rule targets one or more of the vectors above. Rules R1–R4 close the
high-impact ones; R5–R7 are smaller.

**R1. Full-cost validation gate** (gate change, no Lean change). On validation, add
keystrokes and `klmDeciSec` to the no-regression set, with the same 2% tolerance
used for pixels, with the absolute 1px allowance confined to pixels. Full task
completion was already required and has explicit regressions. Implemented in
`interactionAcceptable`; the strict improvement objective is unchanged.
Closes V4 and partly V2. *Policy change: flagged.* The read-only replay of 45
retained decisions (28 deployments, including 18 nightly changes) finds **zero
additional shipped-release refusals**. Details and the persona/night matrix are
in [interaction validation](../methods/interaction-validation.md); recorded bytes
are not rewritten.

**R2. Learnability gate** (implemented; gate change, no Lean change). Validation
also replays both layouts with the bounded clinician, each starting from a clone
of the actor's carried train-only memory. Full completion is required; bounded clicks,
scrolls, keystrokes and `klmDeciSec` each have a 2% tolerance (the learner's replay
is noisier than the expert's, whose clicks and scrolls keep 0%).
There is no bounded strict-improvement requirement or pixel gate. Each past odd
day's held-out partition is replayed separately, with matched seeds and the same
starting memory; rehearsal outputs never practice the actor. Decision files retain
both aggregates, dated sample sizes, the memory hash, penalty and refusal reasons.
Nightly, cadence, optional surfacing and mandatory migration/fallback paths apply
R2, including the final deploy guard. Closes V5 on these simulated workloads and
makes R6 meaningful. *Policy change: flagged.* The model is uncalibrated; no human
learnability claim follows. [Policy, sizes and retained replay](../methods/learnability-validation.md).
The retained replay finds 2 R2 refusals among 28 shipped decisions (P1 and P3,
night 1; P1's learner cost doubles) and 1 expert-gate refusal (P2, night 4);
9 pass validation, 14 have incomplete expert pixel evidence and 2 exceed solver
limits. These are independent counterfactuals; the recording remains unchanged.

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
1440×900, the number of active targets in the first viewport, and at each scroll
position the fixed targets together with the targets in the scroll window, is at
most `spec.design.maxTargetsPerViewport`. Set the default from the
largest count in the current release programs. This Lean fixed-shell default stays
15. The deployed React gate separately uses each screen's vendor-reference maximum
(no-agent arm or release layout) on identical data, with 57 only for absent screen ids. Partly closes V2 with R1 and R2.

**R6. Honest navigation labels** (*new specification*, extends D5). A nav link's
label equals its target screen's title or one of its declared aliases, and labels
have at most `maxLabelWords` words (default 4). Closes V6.

**R7. Two-night move test** (test only). Add a regression test for V7 that copies a
control on one night, deletes the original on the next, and expects the movement
proxy and `StabilityBudget` to charge it. The promoted-copy case passed, but
leaving the survivor's `copyOf` set exposed a Lean gap: the move list was empty
and even a zero stability budget passed. **New specification:** `placeOf`
prefers the original for a tag and otherwise uses its first surviving copy;
`movedTags` includes retained copy tags. The second-night move is now charged
with or without clearing `copyOf`; adding copies beside an original remains
free under this movement rule (R3 governs copy counts separately). This required
a narrowly scoped edit in `lean/Ehr/Props/Basics.lean` under the explicit
instruction to fix an uncharged R7 case; R3/R5 definitions and files were left
alone. The `StabilityBudget` statement itself is unchanged.

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
  viewport at zero scroll. Each scroll viewport is checked at every scroll offset,
  and its window is counted together with the fixed targets outside every
  scroll viewport, as the browser check does: `G10_window` proves that the
  finitely many checked windows (each starting on a target's last row) bound
  all offsets.
- The layout checker refuses with rule `G10`, metric `first-viewport-targets`,
  `fixed-targets` or `scroll-window-targets`, the count, the limit and the excess. This applies to
  layout requests, ported screens, custom families (`acceptFamilyDensity`) and
  `program-check` (`checkProgramDensity`).
- The fixed shell that paints every renderer output has a proved capacity of 15
  (`shell_density`): its 612 px body scroller meets at most 12 rows of 48 px on a
  56 px pitch, and the fixed commit and up to two pinned urgent-strip targets
  are counted with every window.
  `checkProgramDensity_sound` gives G10 at the spec's limit, with `Realizes`, for
  every patient, display, user and state.
- Bad layout: the native test adds 20 buttons to the reference template; it is
  refused at the default limit and accepted at 40. Lean regressions are in
  `lean/Ehr/Layout/Tests.lean`.

Measured counts on the fixed shell at 1440×900 (`ui-port-audit --all-screens
--all-variants`: every screen with initial, expanded-group, tab and alert-probe
states; one synthetic patient):

| Programs | First viewport | Densest scroll window with fixed targets |
|---|---|---|
| Release personas v1–v3 | 9–11 | 13–14 (12 rows and the commit, or with a strip target) |
| Release canonical v1–v3 | 10 | 15 |
| `runs/core-10day` shipped revisions | 8–11 | 13–15 (P5 `w6Schedule`) |
| W1 research port (`w1Sign`) | ≤ 10 | ≤ 10 |

The persona row was measured again after scroll windows began to include fixed
targets, the shell reserved its pinned urgent strip, and navigation links and
tabs became targets of their own; the other rows are the earlier window-only
measurements on the taller body.

The default is 15, the largest release count. **Finding:** 15 equals the fixed
shell's capacity, so no program can fail G10 at the default. Density on that
path is converted into scrolling, which the validation gate already counts. G10
binds custom agent layouts and any lower limit. Because `checkProgramDensity` is a
static decision, a limit below 15 refuses every program, including ones whose
screens are sparser. The deployed React painter uses a separate DOM-measured gate, described below;
its per-screen vendor-reference limits do not relax the Lean limit of 15.

### Deployed React painter

**New specification, implemented.** `app/e2e/action-density.ts` measures active
React DOM targets at 1440×900. For each screen id, the limit is the largest count
in the first viewport or any scroll window over **all exported states of the
same persona's vendor reference on the same data** (sample bundles plus any
workspace). The references are the no-agent arm's program at the candidate's release,
including its merged vendor migrations (the layout the clinician would have without
the agent), and the release's own persona layout (the certified migration fallback,
with release features surfaced); each screen takes the larger maximum. Both vendor
layouts therefore pass by construction. Sparse screens cannot
expand to another screen's maximum. A new/merged screen id absent from the reference
uses **57**, the global vendor-calibrated fallback in `docs/design/screen-density.json`.
Renaming/merging into a new id can still reach that fallback; scanning cost is not proved.

The nightly pipeline prepares the independent no-agent release checkpoint before
screen-gating candidates. Stand-alone checks without that checkpoint use the release's
persona/role vendor program. Reference DOM counts are cached by tree and painter/data
context; candidate thresholds are applied after raw tree-cache lookup, so changing
the reference cannot reuse a stale admission verdict. Refusals report screen, count
and limit in the decision and subsequent agent proposal feedback. This TypeScript deployment gate preserves Lean G10's
**unchanged 15-target fixed-shell specification** and capacity caveat; it is not a
Lean proof about React. [Measurement contract, limits, retained revisions and
verification](../methods/screen-validation.md#deployed-action-density-r5).

## High-alert medication notices: non-removable

**New specification.** `highAlertOrderNotice` is interruptive, including all
inherited medication-issuance notices. `highAlertAdmin` was already interruptive;
all declared `highAlertMed` alerts now have that tier (`highAlert_not_removable`).
A clinician cannot remove the runtime acknowledgment by editing a program.
The checker also refuses `highAlertNotices` if an applicable commit screen lacks
its always-shown inline notice, or tries to hide it in a collapsed group/tab.
`accepted_highAlertNotices` proves acceptance implies that retention check.
The generic notice's attention tier remains advisory: attention urgency and
removability/commit acknowledgment are independent policies.

The [ISMP High-Alert List (2024)](https://www.ismp.org/system/files/resources/2024-01/ISMP_HighAlert_AcuteCare_List_010924_MS5760.pdf)
supports CDS and other safeguards for medicines whose errors can cause severe
harm. [ISMP Targeted Best Practices (2026–2027), BP 19](https://online.ecri.org/hubfs/ISMP/Resources/ISMP_TargetedMedicationSafetyBestPractices_Hospitals.pdf)
supports safeguards across ordering, dispensing, administration and monitoring.
Retaining this exact interruptive ordering notice and inline component is hospital
policy, not a legal requirement or a claim that an alert replaces other safeguards.
The administration cosign still checks distinct users, not blinded independent work.

Vendor high-alert components now request no optional popup: the runtime opens
interruptive alerts only on a relevant commit when the condition fires, preserving
A2. Canonical construction supplies any missing inline notice (including pediatric
ordering). `lean/Ehr/Check/bad/42-removed-high-alert.json` deletes the order notice
and is refused as `highAlertNotices`; the certification matrix expects that refusal.

`scripts/replay-high-alert-policy.mjs` replays the 33 frozen bindings with only
`highAlertMed` tiers strengthened in scratch. It reports unchanged programs and,
separately, a mechanical migration of obsolete optional-popup declarations to
inline declarations. That second result distinguishes missing notices from the
new tier's A2 migration refusals. No retained file or historical certificate is
rewritten. Detailed results are in the screen-validation report below.

## R4: context retained (implemented)

*New specification.* `Spec.workflowContexts` declares workflow tags and info
sets; V1–V3 inherit the sourced hospital declaration in
`lean/Ehr/Specs/DesignPolicies.lean`:

| Workflows | Required context info IDs |
|---|---|
| All W1–W7 | `allergyList`, `problemList`, `vitals`, `currentMeds` |
| W1 primary care, W5 pediatrics | Also `priorNotes` |
| W2 results | Also `resultDetail` |
| W3 emergency | Also `triageSummary` |
| W4 medication administration/flowsheets | Also `marSchedule` |
| W6 surgery | Also `intraopRecord` |
| W7 refills | Also `refillRequest` |

The [2025 SAFER CPOE guide](https://www.healthit.gov/wp-content/uploads/2025/06/SAFER-Guide-3.-CPOE-Final.pdf)
(August 2024 text, practices 1.2 and 2.1–2.3) supports allergy and
patient-specific decision context. The
[2025 Clinician Communication guide](https://healthit.gov/wp-content/uploads/2025/06/SAFER-Guide-1.-Clinical-Communication-Final.pdf)
supports information exchange for results and care transitions. These motivate
retaining clinical background; **the particular sets and depth limit above are
local design policy**, not a clinical sufficiency finding or a legal mandate.

`Props.ContextRetained` quantifies over every commit button, including hidden
buttons and screens unreachable from home. Each context ID must resolve in the
spec. It must be shown on that commit screen or on a destination reached from
that screen within `spec.design.maxDepth` goto hops (8 in the releases), the
same navigation-depth measure used by `RequiredWithinDepth`. Unlike the latter,
the search starts at each commit screen, not the program start.

The executable `Check.contextRetained` searches fixed-visible goto links and
rechecks their paths. A destination provider and all its ancestors must be
legible and unconditionally visible; opening groups and selecting tabs may
reveal it. Group/tab reveal clicks are not included in this goto-depth measure.
The theorem `contextRetained_sound` proves the destination can show the info
for every patient's facts and every state by changing only group/tab layout
state; `accepted_contextRetained` lifts this to accepted programs. This is
structural access, with the same alert and patient-selection interaction limits
as the existing depth property; it does not guarantee reading, fresh payloads,
clinical completeness or human comprehension. Nonempty policies must declare
every commit screen's workflow; renaming it to an undeclared tag refuses.
Duplicate workflow declarations are unioned, so an empty earlier row cannot
shadow required items.

**New specification: missing-policy refusal.** For every non-historical spec,
the checker requires `workflowContexts` to be present, including programs with
no commit buttons. A missing list fails `contextRetained` with a message naming
the spec version and `workflowContexts`. V1–V3 still inherit hospital defaults.
An explicit `workflowContexts: []` remains a deliberate empty policy; this check
prevents omission, not inadequate policy authorship. `accepted_contextsDeclared`
proves acceptance requires an explicit declaration or historical defaults;
the existing `ContextRetained` statement and its access guarantee are unchanged.
The read-only `design-audit` applies the same declaration check.

Bad program 50 removes every `problemList` provider from the P1 release and
fails `contextRetained`. Fixture 53 pairs a minimal future spec missing its
context list with an otherwise acceptable, commit-free program and fails for
that omission. The certification matrix now expects 29 refusals and 15 accepted
personas, with native counterexample replays. `ContextTests.lean` covers local/remote context, exact
bounds, hidden/tiny/conditional controls, groups, tabs, missing info IDs,
stranded commit screens, duplicate declarations and undeclared workflows.
The existing completion-trap witness gains four read-only context panels; its
clinical transitions and public theorem statements are preserved.

## R6: honest navigation labels (implemented)

*New specification, extending D5.* `Render.NavigationLabelsHonest` checks both
overview/step labels and the goto links that can populate the interactive
navigation bar (navigation/workflow groups or a `nav` tag segment), including
currently hidden or disabled controls. Action buttons outside navigation keep
their action labels. Every checked label must **exactly** equal its target
screen title or an alias declared for that title in `Spec.navigationAliases`.
Aliases live in spec data, so changing a program cannot authorize new terms.
The short vendor vocabulary includes `Medications` for `Medication Review` and
`Summary` for `Chart Summary`. **New specification: remove the misleading
`Clinic Schedule` alias for `Rooming`.** P5's vendor landing link now says
`Rooming`, matching its destination, in all three exported releases. This changes
those vendor program hashes; retained programs and certificates are untouched.

P1/P4 keep `Schedule` as their landing activity name. Their encounter openers
render as `Open encounter` in a schedule row (`present.row|home.schedule|0`),
outside the navigation groups and without a `nav` tag segment, so R6 does not
check those action labels. Their Rooming overview labels match the target title.
Neither persona depends on a `Schedule` alias for Rooming; no such alias exists.
P5's opener stays in the workflow navigation group and is checked by R6.
All three encounter-opener labels fit the four-word bound. Other preset landing
labels already match their target titles; no other alias removal is needed.

Missing `navigationAliases` remains strict for non-historical specs: it admits
only exact titles. Requiring an alias list would add no honesty constraint, so
its absent-to-empty behavior is unchanged. Historical specs use the tightened
hospital vocabulary.

`spec.design.maxLabelWords` defaults to 4. Words are whitespace-separated tokens
containing an alphanumeric character; standalone `/` and `&` are punctuation,
so `Exam / Assessment & Plan` is three words. The limit applies to titles and
aliases alike. An explicit nondefault limit round-trips through JSON; malformed
values refuse decoding. `accepted_navigationLabels` proves the added rule and
`accepted_D5` conjoins it with the existing `NavigationSane` guarantee. All new
soundness theorems print only the three permitted axioms.

Bad programs 51 and 52 substitute a misleading short label and a keyword-stuffed
label. Both fail `navigation`; guards also isolate the word-limit failure for
an otherwise declared alias and title, wrong-target aliases, whitespace and
punctuation. Existing D5 group, uniqueness and coverage rules remain intact.

### Release and retained revision audit

Old frozen V1–V3 spec JSON omits these fields. The checker applies the **same
sourced context sets and declared alias vocabulary** when they are absent;
there is no empty-policy exemption for historical release specs. Newly exported
release specs include both policies explicitly. The exported P5 vendor programs
use the corrected Rooming label; recorded specs, programs, certificates and
decisions remain unchanged. Passing offline checks does not
rebind a historical certificate to the new native/WASM runtime.

```sh
export TMPDIR=/home/saithat/Projects/run-tmp CI=true LEAN_NUM_THREADS=4
python3 scripts/audit-context-navigation.py > "$TMPDIR/r4r6-matrix.json"
python3 lean/Ehr/Check/certify.py --no-write
```

The read-only `ehr design-audit --spec S --program P` reports R4 and R6
independently, even for mixed-role vendor references. The audit script checks
all 18 release programs and all 33 retained revision bindings and reports every
refusal before returning failure. Retained combined checks use the frozen
canonical and previous program; output binds inputs and native binary by SHA-256.
`certify.py --no-write` checks the full persona/bad-program matrix without
replacing existing verdict or report files.
With the tightened alias vocabulary, `audit-context-navigation.py` intentionally
exits 1 after reporting the five retained P5 refusals; this is the expected
result for the unchanged recording.

| Native audit | Result |
|---|---|
| Release programs (canonical plus P1–P5, V1–V3) | 18/18 pass R4 and R6 independently. |
| Retained revisions | 33/33 pass R4; 28/33 pass R6 and the combined checker with frozen canonical/previous inputs. |
| Additional refusals | P5 v0–v4 fail `navigation`: their frozen `Clinic Schedule` link targets `Rooming`. No historical exemption, recording rewrite or certificate replacement. |

The three mixed-role canonical references retain an **existing D5 refusal**:
their Schedule overview has 16 entries (limit 12). `design-audit` includes that
diagnostic in `findings` while reporting the new R4/R6 booleans independently.
They are reference layouts, not certified single-role deployments; their old
D5 failure is not waived. All 15 deployable release personas pass the ordinary
checker.

The required generated clinical TypeScript vocabulary is an input to the app
fingerprint because it also exports runtime enum tables. Regenerating it changes
that fingerprint input even though no app source or dependency files are edited.
The built app hash is `8e4fe28345d68d8a9ddca9524461f2614f8ce885ab663f633aa5e7aa8c4e0d79`,
which differs from all 33 retained current build bindings.
Native/WASM certificate bindings remain historical; this work does not rebuild
WASM or re-certify the recording.

Before the label and missing-policy corrections, verification included: default Lean build **647 jobs**; **204 types / 44 samples**
regenerated; proof map regenerated and freshness checked; verification audit
**91 theorems**, only permitted axioms. `certify.py --no-write` accepts **15/15**
personas and rejects **27/27** bad programs at the expected properties with valid
navigation replays. App/agent typechecks, **23 targeted agent tests**, and the app
build pass. Native canonical conformance: **15 targets × 201 scenarios**, 1,584
passes, **0 failures**, 1,431 not applicable. The full browser audit was outside
this implementation's scope.

The label and missing-policy corrections were verified with `cd lean && lake
build` (647 jobs), the proof-map extra modules (125 jobs), proof-map regeneration
and freshness checking, and `certify.py --no-write` (15/15 accepted, 29/29
expected refusals with valid replays). Explicit `#print axioms` checks for the
changed acceptance proof, new declaration theorem and affected proof examples
use only `propext`, `Classical.choice` and `Quot.sound`. A six-case native probe
checks both `check` and `design-audit`: omitted and null policies refuse;
explicitly empty policies and historical v1–v3 defaults pass. The three small
proof-example specs now declare their deliberately empty policies explicitly;
their theorem statements and clinical obligations are preserved. The 33 retained
program/spec/input hash triples are unchanged. App inputs and packaged WASM were
not changed; full browser verification remains separate from these native checks.

## Retained recording against R3 and R5

Every certified revision in `runs/core-10day/certifications` (33 bindings) was
re-checked offline with the native checker, using its recorded spec, canonical
and previous program. The recording was not changed.

| Rule | Revisions refused | Detail |
|---|---|---|
| R3 copy budget | 0 of 33 | At most one copy of any tag (default budget 2), never two on one screen. |
| R3 stability charge | 0 of 33 | Most copies added in one version: 4 (P3 v4), within the recorded `stabilityBudget` of 8 together with that version's moved tags. |
| R5 / G10 | 0 of 33 | Fixed-shell counts reach 11 (first viewport) and 15 (scroll window), equal to the default limit; `program-check` accepts all 51 release and recorded programs. |

No shipped revision was refused by those checks, so nothing was grandfathered. The R5
result follows from the shell capacity above, not from the recording's
restraint. The release certification matrix also still accepts all 15 personas
(with their previous release as `prev`).

## Retained recording against the combined rules

`scripts/replay-design-rules.mjs` combines the checks without changing any
recording files or issuing certificates. It reads all 33 retained revision
bindings and checks each with the current native checker against its frozen
spec, canonical program and previous program (R3 and R7). It also runs the
fixed-shell `program-check` density gate (R5/G10), then replays R1 over the
45 recorded decisions using their original validation metrics and release paths.
This historical combined replay does not apply R2 or the enlarged holdouts; the
separate [R2 replay](../methods/learnability-validation.md#retained-recording-replay) does.
The five initial revisions plus 28 subsequent deployments account for the
33 bindings; R1 applies to decisions, rather than the five initial layouts.
The following results predate the tightened R6 vocabulary. With the current
checker, this command stops at P5 v0's `navigation` refusal; the R4/R6 audit above
reports all five affected revisions. The independent R1/R3/R5/R7 measurements
below remain historical results.

| Combined check | Result |
|---|---|
| R1 frozen-metric replay | 45 decisions inspected; all 18 nightly and 10 mandatory vendor deployments still pass their applicable release paths. |
| R3 + R7 native checker | 33/33 revision bindings accepted with their frozen previous and canonical programs; zero additional refusals. |
| R5/G10 fixed-shell admission | 33/33 accepted at the default limit of 15 targets. The fixed-shell capacity caveat above still applies. |

```sh
export TMPDIR=/home/saithat/Projects/run-tmp CI=true LEAN_NUM_THREADS=6
node --import ./agent/node_modules/tsx/dist/loader.mjs scripts/replay-design-rules.mjs \
  > "$TMPDIR/rules-gate-combined-replay.json"
```

The output binds every checked spec, input bundle and program to its SHA-256,
and identifies both native executables by their hashes. A refusal or incomplete
retained matrix exits with an error. G10 admission here covers the fixed Lean
shell, whose capacity is 15; it does not establish a React density bound or
new clinical outcomes. The recorded certificates remain historical build
bindings, even if the layouts pass the current offline rules.

The combined Lean regression in `Ehr.Examples.TwoNightMoveTests` checks that
R3 charges the first-night copy, R7 charges the second-night displacement for
both promoted and dangling copies, and a retained copy is not charged as newly
added on the second night. Zero stability budget refuses each charged change;
a budget of one accepts it. No property or theorem statement changed during
integration.

An integration correction also removes the R3 component docstring's obsolete
claim that a copy can never count as a move. The generated TypeScript vocabulary
now describes R7's surviving-copy displacement, matching the interpreter and
manual. Both 35-context prompt snapshot sets are refreshed because their prompts
embed these live property docstrings and generated types; the recorded prompts
and decisions are not rewritten.

### Combined verification

Reproduction commands (disk-backed scratch, bounded workers, sequential tests):

```sh
export TMPDIR=/home/saithat/Projects/run-tmp CI=true LEAN_NUM_THREADS=6
export EHR_BIN="$PWD/lean/.lake/build/bin/ehr" EHR_SCREEN_WORKERS=2
export EHR_CONFORMANCE_TRANSPORT=serve
(cd lean && lake build && lake exe gents)
python3 lean/Ehr/Check/certify.py
(cd lean && xargs -r lake build < ../scripts/proof-map/extra-modules.txt)
(cd lean && lake build ui-layout ui-port-audit)
scripts/proof-map/build.sh --readme
make wasm JOBS=4
bash scripts/audit-verification.sh
pnpm --filter app build
pnpm --filter app --filter agent --filter world --filter @vgi/commit lint
pnpm --filter app --filter agent --filter world --filter @vgi/commit typecheck
pnpm --filter agent test --maxWorkers=2 --exclude test/workload-capabilities.test.ts
pnpm --filter app test --maxWorkers=2
pnpm --filter @vgi/commit test
(cd lean && lake env lean --run ../services/commit/test/Fixture.lean > "$TMPDIR/rules-gate-commit-fixture.json")
COMMIT_PG_PORT=55449 docker compose -p vgi-rules-gate-integration -f services/commit/compose.yml up -d --wait postgres
DATABASE_URL=postgres://vgi:vgi-dev-only@127.0.0.1:55449/vgi_commit COMMIT_FIXTURE="$TMPDIR/rules-gate-commit-fixture.json" pnpm --filter @vgi/commit test:integration
COMMIT_PG_PORT=55449 docker compose -p vgi-rules-gate-integration -f services/commit/compose.yml down -v
node conformance/index.mjs --canonical --jobs 2 --out "$TMPDIR/rules-gate-conformance-canonical.json"
node --test scripts/ui-library/program.test.mjs
node --import ./agent/node_modules/tsx/dist/loader.mjs scripts/replay-design-rules.mjs > "$TMPDIR/rules-gate-combined-replay.json"
node scripts/wasm-assets.mjs
scripts/proof-map/build.sh --check-readme
node scripts/audit-alert-policy.mjs "$TMPDIR/rules-gate-audit-templates"
node scripts/audit-alert-policy.mjs "$TMPDIR/rules-gate-audit-personas" --personas
```

| Check | Result |
|---|---|
| Lean default build; generated types | 635 jobs pass; 204 types and 44 samples generated. Only the corrected component docstring changes generated TypeScript. |
| Protected theorem audit | 84 theorems; only permitted axioms. R3 and G10 axiom prints also use only `propext`, `Classical.choice`, `Quot.sound`. |
| Certification matrix | Personas 15/15; bad programs 24/24, including copy spray and valid counterexample navigation replay. |
| Proof map | 10,406 declarations, 395 headline claims; regenerated map passes the CI freshness check. |
| Packaged WASM; app build; lint/typecheck | Rebuilt and current; all app/agent/world/service lint and typecheck commands pass. |
| Agent tests with available data | 298 pass, 16 prerequisite skips. Both refreshed 35-context prompt snapshot sets pass. |
| App tests | 343 pass, 15 prerequisite skips. |
| Service units; isolated Postgres integration | 10/10 and 67/67 pass. Dedicated container, volume and network removed. |
| Canonical conformance, CI `serve` transport | 15 targets × 201 scenarios: 1,584 pass, zero failures, 1,431 not applicable. |
| Native layout regressions | 4/4 pass, including default and tightened G10 limits. |
| Full template browser audit | 1,826 states; 16,434 physical measurements; zero findings. |
| Full persona browser audit | 1,296 states; 11,664 physical measurements; zero findings. |

The full browser pair ran once, sequentially under the shared lock, with two
workers and no timeout/crash retries. The persona audit reused 443 complete
results from the same current-build cache and checked the remaining 853 trees;
all 1,296 states retain their coverage and physical measurements. Known-bad
controls passed in both invocations. These audits do not re-certify the retained
recording.

The initial unfiltered agent suite had eight failures: two stale live-source
prompt snapshots, corrected above, and six workload-capability tests requiring
absent `runs/world/2` and `runs/world/2-original` schedules. The final command
excludes only that unavailable-data test file; those six tests were not made to
pass with substituted workloads. The bare `node conformance/index.mjs` invocation
exits 2 with usage because it requires a target; CI's explicit `--canonical`
invocation passes. No conformance target selection was changed.

The rebuilt app SHA-256 is
`8b190c8b5a36a552d967f77b65a7877ef8fcb8d9d88626b170ea911c0bd9a2a2`;
native checker `d1d4b75732fc4f5f74a3c5b19bf7e391bc8c1d90970fed31ac0bdf8ae551849e`;
packaged WASM `9fd0e8123f239fba6d029dab87591d6fed2c72d98e9a1c164b9b08027564c32f`.
Changing the packaged app assets and vocabulary changes the certified build
bindings. No retained certificate was rebound to these hashes.

A SHA-256 comparison before and after the archive-backed tests found all
**95,123 retained files byte-identical**, with no additions or removals. The
sorted path-to-content-hash map (compact JSON) hashes to
`423a4f39dd64eba8f280ba6c3e6b997546bf307300c6a62256ebafdd0566351c`.
Run data, patient fixtures, programs and generated verdict data are not included
in the commits.

## Remaining limits

All seven rules are implemented. R4 now rejects omitted policies after v3, but
explicitly empty context sets and clinical sufficiency remain policy-authoring
questions. Connecting information-needs costs to the release gate and calibrating
the simulated clinician remain open. R6 constrains declared navigation labels;
the equivalence of spec-owned aliases still needs human judgment, and ordinary
action labels such as a schedule row's encounter opener are outside its scope.

Each new rule must be checked against `runs/core-10day`'s retained releases before
it is enforced. A rule that would retroactively reject a shipped version is
reported, not silently grandfathered.

## Out of scope

- Safety layout risks that are not metric gaming, such as a commit button next to a
  frequently clicked nav link. G3 already separates active targets.
- Replacing the click-plus-scroll score with a time score. R1 and R2 add time as a
  constraint without changing the objective.
