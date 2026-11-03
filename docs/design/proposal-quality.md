# Overnight proposal quality: diagnosis and experiment

Status: **2026-11-03; diagnosis measured, Fix 0 built, proposal-quality experiment not built.**
The owner chose to aim the query-tools idea from von Hippel's "Your software
should build itself" at proposal quality rather than speed. Section 6 lists the
decisions it needs. It changes no Specs, Props, Statements or Comparator files.
`core-10day-live` is read as frozen input only; it stays historical.

## 1. Summary

In `runs/core-10day-live`, 17 of the 35 nightly decisions produced nothing:
9 deployments were rejected at validation replay and 8 nights ended with no
change. Reading every decision record shows four causes. Only two of them are
about what the agent can see.

1. **A dead move.** 36 of 125 proposed candidates changed only component
   density (`size: compact`). All 36 measured exactly zero effect, because the
   UI that geometry is measured on has no density at all. This is a renderer
   fidelity bug. No prompt or tool fixes it.
2. **No memory of what was measured.** The agent's history lists only the
   candidates it chose. 25 candidates repeated an idea the same persona had
   already tried, and 23 of those had already measured zero or worse.
3. **No locality.** The agent sees per-workflow averages but not which screens
   or components the clicks, scrolls and pointer travel come from. That
   breakdown was dropped by accident when the objective changed from KLM time
   to physical interactions.
4. **Picks too small to measure.** In 7 of the 9 rejected nights, every chosen
   change saved at most 2 clicks and 5 scrolls per training day. At that size
   the training estimate does not predict the validation day. Three accepted
   deployments saved no clicks and no scrolls on the validation day either;
   they passed on pixels alone.

The proposal: fix cause 1 first (owner decision), then test causes 2 and 3 in
an offline experiment on the run's frozen night inputs, with three arms:
today's prompt; a prompt with a measured-ideas ledger and a locality digest;
and the same plus read-only query tools over training-day traces. The third
arm is the actual von Hippel claim: that letting the agent ask its own
questions beats a good fixed summary. Cause 4 is the acceptance rule, which is
the owner's to change; it is flagged here, not changed.

## 2. What the last run shows

Source: the 45 decision records in `runs/core-10day-live/decisions/` (35
nightly, 5 feature-surfacing, 5 migration). `core-10day` holds the same
decisions. Numbers below exclude the seeded unsafe candidate
(`seeded-allergy-hidden`), which is a seeded test candidate, not a proposal.

| Nightly outcome | Decisions |
|---|---|
| deployed (passed validation replay) | 18 |
| validation-rejected | 9 |
| no-change (agent found no candidate worth deploying) | 8 |

Effect of the 125 proposed candidates on training days (clicks, scrolls,
scroll pixels, pointer travel, keystrokes):

| Effect | Candidates |
|---|---|
| exactly zero on every metric | 56 |
| better on every metric | 26 |
| mixed | 30 |
| worse on every metric | 7 |
| not measured (migrations) | 6 |

The checker is not the problem: it passed 159 of 160 candidates, and no night
needed a repair round.

### 2.1 Historical cause 1: density was a no-op in the measured UI

* 36 candidates were patches whose every operation sets `/size` (normal →
  compact). All 36 measured exactly zero. 34 of them are labeled
  `composeTaskView` and 2 `reorder`.
The following diagnosis describes the frozen run before Fix 0 below.

* Geometry was captured in Chromium from the semantic UI tree (`renderScreens`
  with `ui: true`, `agent/src/browser-geometry.ts`). That export carried no
  density metadata (`lean/Ehr/Render/Types.lean`), so React never received
  `compact`. Only the older HTML renderer honored it
  (`lean/Ehr/Render/Page.lean:230`).
* The manual (`agent/src/manual.ts:83`) and the prompt's program format both
  advertised compact density as a supported change. The agent kept proposing
  a move that could not change any measurement.

### 2.2 Cause 2: no memory of measured ideas

* History is outcome-only (`HistoryItem` in `agent/src/prompts.ts`): night,
  outcome and the chosen candidates' id, summary and move type. Candidates
  that were measured but not chosen, and every training-day estimate, are
  dropped.
* 25 candidates reused an id that the same persona had proposed before. 23 of
  those had measured zero or worse the previous time. Example:
  `p1-compact-order-entry` was proposed on nights 1, 5, 7, 8 and 9 and measured
  zero every time.
* Training-day estimates are computed on training days only, so showing them
  stays within the prompt integrity boundary (`prompts.ts` header: train-only
  inputs; validation and test metrics never reach a prompt).

### 2.3 Cause 3: no locality

* The prompt hides every key matching `klm|wallTime|timeSinksByScreen`
  (`prompts.ts`, the `json` replacer). This came in with commit 986b1152,
  which replaced timing objectives with clicks, scrolls and pointer travel.
* Hiding KLM time was the point. But `timeSinksByScreen` also carries the
  per-screen event counts and shares, and those went too. Its `klmSec` field is
  now 0 in every record, so the list is ranked on stale data anyway.
* What the agent sees now: per-workflow averages, backtracks per screen,
  buried searches, alert overrides, unused receipts, order mix and totals. It
  cannot see which screen or component the scrolls and pointer travel come
  from, which components the user scrolled past to reach a target, or which
  steps repeat across tasks.

### 2.4 Cause 4: picks below the noise

* The 11 changes chosen in the 9 rejected nights mostly had tiny training
  savings: in 7 of the 9 nights, every chosen change saved at most 2 clicks and
  5 scrolls per training day. One exception had a large training estimate
  (`p1-sign-orders-from-visit-navigator`: 10 clicks, 11 scrolls) and still
  failed validation.
* On the accepted side, three deployments (night 5 P2, nights 7 and 8 P4)
  saved no clicks and no scrolls on the validation day. They passed on scroll
  or pointer pixels alone.
* The acceptance rule has no minimum effect size, so at this scale acceptance
  is weak evidence either way. Changing that rule is a measurement decision for
  the owner (section 6), not part of this experiment.

### 2.5 Diminishing returns

Validation-day savings of accepted nightly deployments fall quickly: night 1
saved 103 clicks and 185 scrolls across five personas; nights 5 to 9 together
saved 18 clicks and 51 scrolls. Part of this is the easy wins being used up,
which no prompt change can undo. The experiment measures per-decision quality
on the same inputs, so it is not fooled by this trend; a full run would be.

## 3. Design

### 3.1 Fix 0: render component density

**Approved by the owner and built, 2026-11-03.** `UiScreen.compact?` and
`UiPaneMetadata.compact?` carry the IDs of shown compact components. Empty tables
are omitted. Native and WASM use the same derived JSON export. This is a side
table, rather than the wrapper originally proposed here: footer placement, row
actions and the urgent strip inspect the existing tree, which remains exact.
React scopes the table to each screen/patient pane, marks existing containers
with `data-density="compact"`, and cascades less vertical padding, smaller gaps
and tighter table/field rows through compact sections and tabs. Ordinary,
composed-board and research painters share the markers and CSS. Fonts and colors
are unchanged; text retains the 12px floor, interactive targets retain 24×24px,
and wrapping/overflow remain with the audited painter. Agent manual and program
format text describe the measurable spacing effect and the unchanged floors;
other nightly prompt content is unchanged.

`DensityProofs.lean` kernel-checks invariance of visibility (including parent
traversal), the ordered shown-ID list in the actual interpreter view, and
`meaning` under changes to the side table alone. Every new theorem's printed
axioms are within `propext`, `Classical.choice`, `Quot.sound`. The full universal
statement equating `renderUi` workspace/side/nav/banner/modal across size-only
program changes remains open in [TODO_PROOFS.md](../../TODO_PROOFS.md), with the
missing renderer/guard congruence lemmas described there. Exact native fixture
and native/WASM differential regressions compare complete semantic screens after
removing only the `compact` key. No existing proof or protected rule changed.

Geometry regression (`app/e2e/density.spec.ts`), built production painter:

| Operative-note fixture | Normal scroll height | Compact components | Compact sections |
|---|---:|---:|---:|
| 1440×900 | 1,190px | 1,126px | 1,154px |
| 390×844 | 2,525px | 2,250px | 2,471px |

The same source fixture's automatic side rail is removed in both arms to isolate
the long form: at desktop its taller review rail otherwise determines the page
height. All 40 rendered component entries and their font sizes are identical.
A separate native table fixture keeps every cell while reducing padding and
height. All six browser cases pass their physical-policy checks.

Zero-model reruns of the three preselected historical candidates, using the real
`TrainEstimator`, frozen programs/patches/specs, original seeds and training
partitions only (savings per training day; positive means less travel):

| Candidate | Night; training days | Clicks saved | Scrolls saved | Scroll px saved | Pointer px saved |
|---|---|---:|---:|---:|---:|
| `p1-compact-order-entry` | 1; 1 | 0 | 0 | 44 | 14.33 |
| `p5-compact-postoperative-editor` | 4; 1, 3 | 0 | 0 | 0 | 0 |
| `p3-compact-administration` | 2; 1 | 0 | 0 | −861 | −6.82 |

Both arms complete every paired task: P1 28/28, P5 24/24 across its two days,
and P3 25/25. Keystroke savings are zero. P5's emitted postoperative fields move
up, but its training traces never visit `w6PostOp`; its zero estimate is retained.
P3's negative savings mean **more** travel, despite smaller spacing. Compact is
now measurable; it does not guarantee an objective improvement. No acceptance
rule changed. Geometry totals also differ from the historical run because these
pairs use the current painter/capture environment; the within-build difference
isolates the density candidate.

The restored world's SHA-256 exactly matches the run's recorded fingerprint:
`7f4f9dabc4ad609422fb5be4598e54a30a285bb9f4022b72b078bc074dc3e26d`.
Historical specs are necessary: today's successor alert spec rejects the old
P1 program for lacking its critical-result component. The harness does not
substitute or weaken those rules. It retains spec/program/build hashes, complete
geometry atlases, replay results, original and recomputed estimates under
`$TMPDIR/density-estimates-final/`. No model, validation or blind-day evaluation
runs. Historical run files and certificates stay unchanged. Both the certified
app hash and Lean/WASM binding change.

The retained replay rerun reproduces all three estimates exactly. All eight
before/after day results have empty `geometry.missingTargets`; the retained P5
traces confirm zero postoperative-screen events in both versions.

Verification commands (repository root; disk-backed scratch throughout):

```sh
export TMPDIR=/home/saithat/Projects/run-tmp LEAN_NUM_THREADS=6
(cd lean && lake build && lake exe gents)
JOBS=4 EM_CACHE="$TMPDIR/density-emcache" make wasm
make wasm-check
pnpm --filter app build
pnpm --filter app lint
pnpm --filter app test --maxWorkers=2
pnpm --filter agent lint
pnpm --filter agent typecheck
pnpm --filter agent test --maxWorkers=2
pnpm --filter agent exec tsc --noEmit --target ES2022 --module ESNext --moduleResolution Bundler --strict --exactOptionalPropertyTypes --noUncheckedIndexedAccess --skipLibCheck --jsx react-jsx ../app/scripts/density-estimates.ts
APP_TEST_PREVIEW=1 APP_TEST_PORT=4291 pnpm --filter app exec playwright test 'e2e/density.spec.ts' --workers=2
node --import ./agent/node_modules/tsx/dist/loader.mjs app/scripts/density-estimates.ts "$TMPDIR/density-estimates-final"
EHR_SCREEN_WORKERS=5 EHR_SCREEN_MAX_WORKERS=5 APP_TEST_PORT=4293 node scripts/audit-alert-policy.mjs "$TMPDIR/density-audit-templates"
EHR_SCREEN_WORKERS=6 APP_TEST_PORT=4293 node scripts/audit-alert-policy.mjs "$TMPDIR/density-audit-personas" --personas
EHR_SCREEN_WORKERS=6 APP_TEST_PORT=4294 node app/scripts/density-screen-check.mjs "$TMPDIR/density-estimates-final"
```

Lean builds (455 jobs), generated types, WASM freshness, production app build,
lint and type checks pass. App unit tests: 304 pass / 28 skip. Agent unit tests:
68 pass / 50 skip. Archive-dependent skips reflect the additional historical
runs absent from this worktree. All six density browser tests pass. The full
normal-density audit pair is serialized on the machine-wide lock; the separate
compact gate selects all 98 emitted native compact states plus three cascading
form/table fixture controls. It uses the unchanged complete physical matrix and
fidelity assertions, with passing-tree receipts disabled.

The full template audit passes: 1,826 states / 16,434 physical measurements,
zero findings and zero retries (5 workers; gate elapsed 31m 20s). The full persona
audit also passes: 1,296 states / 11,664 physical measurements, zero findings and
zero retries (6 workers; gate elapsed 14m 59s). The pair ran once, sequentially.
The compact-state gate passes all 101 inputs / 70 distinct trees: 90 emitted
native clinical states plus three form/table controls supply 837 physical
measurements across 93 states, with zero findings and zero retries. Eight
additional synthetic popup-geometry probes retain the stock gate's existing
coverage rules. Browser batches total 1m 44s, excluding the shared-lock wait.
All physical and fidelity assertions are unchanged. Artifacts:
`$TMPDIR/density-audit-templates/{result,physical}.json`,
`$TMPDIR/density-audit-personas/{result,physical}.json`, and
`$TMPDIR/density-estimates-final/compact-{screen-result,physical}.json`.

Evidence bindings: app `0d6235a922b48ced45c620887a2b3e97a87d68aff999882c26049fc3285e91bc`,
WASM `1138574dedc474f885fb37f969f94706f11b8af74e5d3a833bf84edd8cbb43d0`,
native `c89cd5066752ab2d1f11805fd57b47207cb2d8fcd22ea876fe3af3b7bb1b188e`.
Historical certificates are not rebound or deployed.

The standalone density contract passes both actual interpreter fixtures,
normal/compact native/WASM JSON equality, exact shown compact IDs, and complete
semantic-screen equality after removing only the `compact` key:

```sh
(cd lean && lake env lean --run Ehr/Render/ExportTests.lean "$TMPDIR/density-render-api")
node lean/Ehr/Render/density-contract.mjs "$TMPDIR/density-render-api"
```

The broader `node lean/Ehr/Render/test-wasm.mjs` run also matches all 324 patient
bundle projections, 897 clinical HTML/semantic render variants, and the density
cases, then exits on the existing P1 tracked-snapshot comparison: current native
and WASM output includes the Reports panel, while `app/src/fixtures/ui` omits it.
Those snapshot assertions remain exact. Its default all-workspace input also
hits an existing clinical-banner assumption at unbound home. To reach all
clinical variants, the broader run used an explicit scratch copy of the current
canonical with `patientSelection: false` (no other program changes):

```sh
(cd lean && lake env lean --run Ehr/Render/ExportTests.lean "$TMPDIR/density-render-clinical" ../fixtures/synthea/Aaron_Ankunding_4966bd28.json ../releases/v1/spec.json "$TMPDIR/density-contract-program.json")
node lean/Ehr/Render/test-wasm.mjs "$TMPDIR/density-render-clinical"
```

The stored fixtures and patient-workspace implementation are unchanged by this
lane. Their broader contract repair is outside the density change; no assertion
was loosened to obtain a passing result. The standalone density contract is also
called by the broader script.


### 3.2 Measured-ideas ledger (train-only)

Add to the nightly prompt, for this persona, every earlier candidate: night,
id, move type, targets, summary, training-day saving, whether it was chosen,
and the night's outcome. Validation and test metrics stay out, as today. The
prompt adds one rule: do not re-propose an idea that measured zero or worse
unless the program or the evidence has changed in a way you name.

### 3.3 Locality digest (train-only, deterministic)

Replace the dropped per-screen list with physical units computed from the
training-day traces and the geometry atlas:

* per screen: clicks, scrolls, scroll pixels, pointer travel, visits, share of
  the day;
* per component (top N): clicks and keystrokes on it, pointer travel to reach
  it, scrolls spent revealing it;
* scroll-past: for the top targets, which components the user scrolled past to
  reach them;
* repeated step sequences across tasks (candidates for shortcuts and merges).

KLM time stays hidden, as decided in 986b1152.

### 3.4 Query tools (experimental arm only)

The agent gets the persona's training-day traces and atlas as files in its
confined request directory, plus a small read-only query CLI (screens, steps,
targets, scroll-past, sequences, the ledger). It can ask its own questions
instead of reading a fixed digest.

This relaxes one integrity rule. Today the designer may not execute anything:
the Codex shell tool is off and any tool event fails the transcript audit
(`agent/src/backends/isolation.ts`). The query arm turns the shell on inside
the same bubblewrap confinement (no repository, no home directory, only the
runtime and the request directory, which holds training-day files only) and in
Codex's read-only sandbox. The audit changes from "no tool events" to "every
command ran inside the request directory and wrote nothing", and every command
is recorded in the transcript. Production runs keep the current rule unless
the experiment justifies a change and the owner approves it.

## 4. Experiment: offline comparison on frozen night inputs

### 4.1 Inputs

The 35 nightly decisions of `core-10day-live`. For each decision, freeze: the
persona's program version before the night, its training days, the world, and
the history (built from the historical records of earlier nights, not from an
arm's own outputs, so each decision is independent). Feature-surfacing and
migration decisions are excluded; they answer different questions.

Everything downstream is recomputed by the current evaluator for every arm:
evidence, training estimates, certification and validation replay. All arms
are measured the same way, even though the evaluator has changed since the run
(geometry determinism, WCAG, density).

### 4.2 Arms

| Arm | Prompt |
|---|---|
| A | today's nightly prompt |
| B | A plus the ledger (3.2) and the locality digest (3.3) |
| C | B plus query tools (3.4) |

A sanity arm re-evaluates the historical candidates themselves (no new model
calls). It must reproduce the recorded training-day estimates, apart from
changes the evaluator is known to have made. If it does not, the harness is
wrong and nothing else is reported.

Each arm runs 2 samples per decision (model sampling varies): 35 × 3 × 2 = 210
propose-and-choose pairs. Same model and reasoning effort as the run.

### 4.3 Pipeline per sample

propose → native check (with repair, as in the loop) → training estimate →
choose → certification → validation replay. The 981-page screen check is
skipped: it is a deployment gate, it failed nothing in the run, and it is the
slowest step. Results are labeled "offline, screen check skipped".

### 4.4 Metrics (declared before any run)

* **Primary:** accepted-change rate, the share of decisions whose chosen
  change passes validation replay.
* **Co-primary:** total validation-day saving of accepted changes, in clicks
  and in scrolls.
* **Secondary:** share of candidates with zero training effect; share that
  repeat an idea already measured zero or worse; no-change rate; checker pass
  rate; input tokens, calls and wall time per decision; for arm C, queries per
  decision and which ones.

**Decision rule.** Comparisons are paired by decision. B beats A if its
accepted-change rate is at least 10 points higher, its total saving is no
lower in clicks or in scrolls, and a paired bootstrap over decisions puts the
rate difference above zero at 95%. C beats B on the same rule. If C does not
beat B, the fixed digest is enough and the integrity relaxation is not worth
it.

### 4.5 What it cannot show

* It measures one night at a time. Compounding over nights, and the agent
  learning from its own ledger, need a full run; that belongs to phase 4 of
  the shared-world simulation (`shared-world-sim.md` §8).
* 35 decisions is a small sample. With 2 samples per arm, a difference much
  smaller than about 15 points in accepted-change rate will not be
  distinguishable.
* Simulator only: the users, traces and acceptance are simulated.

### 4.6 Cost and time

About 420 model calls (210 propose, 210 choose), roughly 40M input tokens at
today's prompt size; arm C uses more. Evaluation dominates wall time: at about
3 to 4 minutes per decision-sample, roughly 12 to 14 hours serially, or 6 to 7
hours with two workers (the memory budget allows at most two Lean-heavy
workers). The speed items in `shared-world-sim.md` §10 would cut this.

## 5. Phases

| Phase | Scope | Done when |
|---|---|---|
| 0 | Fix 0 (density), per the owner's choice | compact measurably changes scroll pixels on a fixture screen, or compact is gone from the manual and prompt |
| 1 | Freeze inputs from a run directory; offline evaluator; sanity arm | sanity arm reproduces the recorded training estimates |
| 2 | Ledger and locality digest; arm B | unit tests show no validation or test data in the prompt |
| 3 | Query CLI, confined shell, new audit; arm C | audit fails on any read or write outside the request directory |
| 4 | Run A, B, C; report | report with the metrics of 4.4 |

If B or C wins, adopt it in the agent loop of the shared-world simulation
(`shared-world-sim.md` §7) and propose it for production runs.

## 6. Owner decisions

1. **Density (cause 1): approved 2026-11-03.** Render compact density in the measured UI; implemented in section 3.1.
2. **Query tools (arm C):** allow the designer to run read-only commands inside
   the existing confinement, for the experiment only.
3. **Acceptance rule (cause 4):** keep validation acceptance without a minimum
   effect size for now (recommended, so the experiment compares like with
   like), or add one. Adding one changes what "accepted" means in every later
   run.
