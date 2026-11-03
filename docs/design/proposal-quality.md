# Overnight proposal quality: diagnosis and experiment

Status: **phases 1–2 implemented and replay-verified, 2026-11-03; live experiment not run.**
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
| not measured (5 migrations, 1 checker rejection) | 6 |

The checker is not the problem: it passed 159 of 160 candidates, and no night
needed a repair round.

### 2.1 Cause 1: density is a no-op in the measured UI

* 36 candidates were patches whose every operation sets `/size` (normal →
  compact). All 36 measured exactly zero. 34 of them are labeled
  `composeTaskView` and 2 `reorder`.
* Geometry is captured in Chromium from the semantic UI tree (`renderScreens`
  with `ui: true`, `agent/src/browser-geometry.ts`). That tree, `UiNode`
  (`lean/Ehr/Render/Types.lean`), has no density field, so the React renderer
  never sees `compact`. Only the older HTML renderer honors it
  (`lean/Ehr/Render/Page.lean:230`).
* The manual (`agent/src/manual.ts:83`) and the prompt's program format both
  advertise compact density as a supported change. So the agent keeps
  proposing a move that cannot change any measurement.

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

### 3.1 Fix 0: make density real, or stop offering it

Two options; the owner picks (section 6):

* **Render density (recommended).** Real EHRs use dense layouts, and density
  changes scroll distance, so leaving it out lowers simulation fidelity. Add a
  density layout hint to the semantic UI tree, as a presentation wrapper like
  the existing ones ("a layout hint around ordinary semantic nodes; never a
  visibility filter"), so `meaning` is unchanged by construction and existing
  presentation proofs carry over. The WCAG floor (24×24 px targets, 4.5:1
  contrast) still applies to compact controls; the screen check enforces it.
* **Remove compact from the agent's vocabulary.** Cheaper, but it removes a
  real design lever, so it is a scope cut and needs the owner's approval.

Either way, the experiment runs after this lands, so no arm spends candidates
on a move that cannot be measured.

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

Original planning estimate (measured phase 1 costs are in §8): about 420 model
calls (210 propose, 210 choose), roughly 40M input tokens at
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

1. **Density (cause 1):** render compact density in the measured UI
   (recommended), or remove it from the agent's vocabulary (a scope cut).
2. **Query tools (arm C):** allow the designer to run read-only commands inside
   the existing confinement, for the experiment only.
3. **Acceptance rule (cause 4):** keep validation acceptance without a minimum
   effect size for now (recommended, so the experiment compares like with
   like), or add one. Adding one changes what "accepted" means in every later
   run.


## 7. Phase 1–2 implementation (2026-11-03)

`agent/src/quality.ts` and the `proposal-quality` CLI reuse `runNight` with an
explicit offline stop after validation. They never call the screen gate,
`ehr deploy`, publication or the simulated user-offer step. Native checker
certification remains the existing merged-patch/repair path; no deployment
certificate is minted. Arm B appends the same train-only ledger/digest to
proposal, choice and repair. Defaults and all original prompt builders are
unchanged. The outcome `validation-accepted` denotes offline acceptance without
deployment; every offline record has `offline: true`, `screenCheck: "skipped"`,
arm/sample, call/token accounting and wall time.

A fresh output is required directly under `runs/`. Its `inputs/` snapshot holds
source programs, days, historical decisions/responses, certification inputs,
world and fixture bytes.
The original world/fixture fingerprints must match; only the copied world's
fixture-index location is relocated. `inputs/binding.json` records source and
current evaluator hashes, the selected decisions and backend settings.
`frozen/night-NN/P/input.json` stores each historical `versionBefore`, train
schedules/results/programs and outcome history once, independently of arm output.
Training evidence is resimulated on the historical day's program; candidate
estimates retain the existing two-most-recent-training-days rule. Validation
keeps the original past-calibration partition and independent seed namespace.

`locality.ts` attributes the existing pointer state machine's costs to event
screens and destination targets, including lookahead attribution for explicit
scrolls, alert aliases, workspace-day states and missing-geometry nulls. It
checks per-task costs against `pointerTravel` and native click/keystroke totals.
Persisted atlases are namespaced per frozen decision, and the digest is built
before any sample validation; prior decisions or samples cannot contribute
validation-only states through accumulated atlas coverage.
Pixel rounding conserves task totals in hundredths, including displayed
aggregate totals (no floating-point accumulation tails). Screen share is the fraction
of activations, visits count task/screen arrivals, and scroll-past means component
reveal offsets traversed within the same container (a geometric proxy, not
measured visual attention). Reveal offsets share the scroll container
coordinate frame; viewport centers do not, particularly with nested scrollers.
Top 15 targets retain an aggregate remainder. Ranking uses activations plus
reveal-scroll counts, then pointer travel, with keystrokes secondary. Repeated 2–4-step sequences count
distinct tasks. Only completed training tasks contribute to aggregate costs.
KLM stays hidden through the existing prompt replacer; no app geometry source
is edited. The ledger lists every earlier candidate for this persona, including
unchosen/seeded candidates with an explicit seeded flag, with physical training
savings only. Unknown effects stay unknown. Schema projections strip additional
fields from the new context before any prompt serialization.

`quality-report.ts` writes Markdown and JSON, including per-sample decision
metrics. Samples are averaged within each decision; accepted-change rates weight
decisions equally, and validation totals sum decision means. Seeded candidates
are excluded from candidate-quality rates. Zero effect requires all five
physical metrics to be measured and zero; its denominator is all nonseeded
candidates, with the measured count also reported. A repeated measured-bad idea
means the same id **or** the same move type and nonempty sorted target set,
previously nonpositive on every measured physical dimension. The bootstrap uses
10,000 decision resamples with seed 20261103 and applies §4.4 unchanged. C−B is
reported as not evaluated until C records exist; no query tools are implemented.
Replay token counts are labeled historical references; unavailable usage remains
null. Calls count backend attempts, including transport failures; if failed
attempt usage is unavailable, token totals remain null (successful-call usage
is retained separately). Wall time per sample includes frozen evidence preparation, charged once
to each sample for comparability; geometry is reused by exact content. These
are evaluator timings, not a model latency guarantee.

The sanity arm writes `candidate-diffs.json` for every decision. It stops on
unexplained click/keystroke deltas or missing formerly measured candidates and
suppresses the aggregate quality report. Pixel and geometry-derived scroll
changes must be interpreted against known renderer/capture changes; recorded
estimates are never overwritten. Replay smoke is plumbing verification, not
an arm-quality result. No density change, query relaxation, live experiment,
Lean change or certified app-source change belongs to this implementation.


### Frozen specification binding

The first native sanity attempt stopped before producing estimates: main's v1
spec now requires passive `criticalResult` inline on W2 (`86aab52d`), while the
frozen P1 program was certified against the original v1. The evaluator therefore
freezes the original spec and role canonical from each version's archived
`certifications/P/vN/{spec,inputs}.json`, as well as the program/world inputs.
Every native check, render and simulation resolves its logical release id to
that immutable archived spec; program ids and prompt release ids remain intact.
The current native interpreter and current browser painter still recompute the
results. Conflicting archived specs under one logical release id fail closed.
No current spec, definition, property or gate is edited or weakened. Replaying
the historical workload under today's clinical rules would be a different
experiment, rather than a proposal-quality comparison.

The orchestrator waived this lane's full WCAG/screen audit pair after the
model-capacity interruption on 2026-11-03: source changes are confined to agent/
and documentation, and lane/density needs the serialized browser-audit slot.
The interrupted template audit is not claimed as a completed verification.


## 8. Offline verification (2026-11-03)

All results here are **offline, screen check skipped, simulator only**. No live
Codex/Claude request was made, and no experimental version was deployed.

### Sanity: all 35 nightly decisions

Output: `runs/quality-sanity-frozen-spec-20261103/`. All 120 nonseeded historical
nightly candidates were recovered; all 119 originally measured candidates were
measured again. The one checker rejection remains a rejection. All checker
statuses, training-day selections, task counts, completion, clicks and
keystrokes match. There are no unexplained native-count differences.
The 35 seeded test candidates are outside proposal-quality comparisons; the
five migration proposals and five feature-surfacing decisions are outside the
nightly selection. This also clarifies §2's six unmeasured proposals: five
migrations plus the checker-rejected nightly proposal.

`sanity.md` summarizes the full per-decision `candidate-diffs.json` files;
`sanity-diffs.json` aggregates them. Changes among the 119 measured candidates:

| Recomputed − recorded | Before totals changed | After totals changed | Largest absolute before / after delta |
|---|---:|---:|---:|
| Clicks | 0 | 0 | 0 / 0 |
| Keystrokes | 0 | 0 | 0 / 0 |
| Geometry-derived scroll count | 93 | 89 | 54 / 64 |
| Scroll pixels | 119 | 119 | 283,762 / 283,762 |
| Pointer-travel pixels | 119 | 119 | 27,463.59 / 27,797.42 |

Daily-saving differences occur in 31 scroll-count estimates, 53 scroll-pixel
estimates and 59 pointer-travel estimates; click/keystroke savings all match.
The largest absolute changes in those saving estimates are 44 scrolls,
93,882 scroll pixels and 3,261.82 pointer pixels.

These are the known changes explaining the difference classes:

- `3a02feda` (WCAG physical repairs) changes target floors, wrapping, line boxes
  and layout; `bd43fa1a` adds growing, wrapping plain-text editors. Both change
  component centers, content heights and the reveal offsets used to count
  scrolls and pixels. A geometry-derived scroll count is not the native trace's
  raw scroll-event count.
- `b0148234` bundles Noto fonts, pins the capture environment and isolates each
  captured state. Font metrics and removal of state carry-over change measured
  coordinates and reveal offsets. This is the capture/font class of pixel
  differences, independently of unchanged native activations.
- `86aab52d` adds the pinned urgent strip and its layout, and adds the clinical
  `criticalResult` requirement that caused the initial frozen-program check
  refusal. Archived spec/canonical binding resolves that clinical-input drift;
  the current strip/painter still participates in geometry.

These commits establish concrete renderer/capture changes, not a per-commit
counterfactual ablation. The final comparison uses one current native binary
and painter throughout. The recorded app hash is
`71e844bfb3cb5120aa86e5bb06cde0c9985e84ef944125b4ea6670d387a65e2e`;
the evaluator's app hash is
`9f83c2951a4b7398f131db5d952a4487106571347e1a389e890ec622070c3456`.
This lane changes neither app sources nor Lean sources and does not rebind
historical certificates. Every sample records prompt matches; all 70 sanity
calls drift from the historical prompts (current evidence/manual and omission
of seeded test proposals), and replay serves them without failing.

Sanity used the frozen-spec evaluator at `5d5ce110`. Subsequent changes isolate
and format B's context and improve retry cost accounting; the native checker,
simulator, geometry collector and train/validation metric functions are
unchanged. Input bindings retain the exact evaluator hash for each run.

### A/B smoke and checks

Output: `runs/quality-smoke-20261103/`, decisions `night-02/P2` and `night-05/P1`,
one sample per arm per decision. These later nights exercise populated ledgers
and multiple training days. All four records complete the loop; P2 passes
validation and P1 reaches validation and is rejected in both arms. Candidate
train estimates on both decisions are identical in sanity, A and B. Sanity and
smoke have identical native/app, world, fixture, source-decision, program and
certification-input hashes. The smoke binding matches the final agent source
hash. Every sample says **offline, screen check skipped, simulator only**.

| Arm | Accepted | Validation clicks saved | Validation scrolls saved | Zero-effect candidates | Repeated measured-bad ideas | No-change rate | Checker pass rate |
|---|---:|---:|---:|---:|---:|---:|---:|
| A | 50% | 8 | 7 | 62.5% | 25% | 0% | 100% |
| B | 50% | 8 | 7 | 62.5% | 25% | 0% | 100% |

Both arms reference 176,101 historical input tokens and 5,161.5 output tokens
per decision, with two replay backend calls per decision. These are not new
model usage or B-token estimates. Charged mean wall time is 339.5 seconds for A
and 98.0 for B; shared capture/cache order makes this unsuitable as a prompt
speed comparison. All eight prompts mismatch the historical recording, as
expected, and none contains validation/test aggregate keys or KLM/wall-time
metric keys. Unit tests additionally poison contexts with held-out data and
check explicit projections and train-atlas isolation.

B−A is 0 acceptance points with decision-paired 95% interval [0, 0], zero click
and scroll saving difference, and therefore does not meet §4.4's decision rule.
C−B is not evaluated. Replay confirms plumbing and cannot establish proposal
quality; the live comparison remains the orchestrator's work.

Commands run from the repository root:

```sh
export TMPDIR=/home/saithat/Projects/run-tmp LEAN_NUM_THREADS=2
pnpm --filter agent typecheck
pnpm --filter agent lint
pnpm --filter agent test --maxWorkers=1
pnpm --filter agent proposal-quality --run runs/core-10day-live \
  --arms sanity --backend replay --workers 2 \
  --out runs/quality-sanity-frozen-spec-20261103
pnpm --filter agent proposal-quality --run runs/core-10day-live \
  --decisions night-02/P2,night-05/P1 --arms A,B --samples 1 \
  --backend replay --workers 2 --out runs/quality-smoke-20261103
pnpm --filter agent proposal-quality-report --run runs/quality-smoke-20261103
```

Typecheck and lint pass. The final suite has 132 passes and two skips (the
archive-dependent role-hash and wrapper-resume cases need local `runs/world/2`).
This includes all 105 pre-change prompt hashes and conservation on 142 recorded
day-1 tasks across all five personas, plus missing geometry, multiple tasks,
container-local horizontal/vertical scroll-past, aggregate precision, hidden
holdout fields, frozen version/history, transport cost accounting and the paired
decision rule. A CLI negative check with `--workers 3` exits 1 before creating
its output. `pnpm --filter app build` and `pnpm --filter app exec tsc --noEmit`
also pass. No Lean build was needed: the provided prebuilt binary is used and
no Lean source changes. `CLAUDE.md` was absent. Post-resume cgroup peak memory
was about 4.52 GiB with no OOM event; native/Chromium evaluation uses two workers.

The full WCAG/screen pair is waived by the orchestrator (see above); the
interrupted audit is not a pass. No density change, query tools, live model
experiment, push, source-run rewrite or certificate rebind was performed.

### Orchestrator command and time budget

After the selected painter/density work is built, from the experiment checkout:

```sh
export TMPDIR=/home/saithat/Projects/run-tmp LEAN_NUM_THREADS=2
pnpm --filter agent proposal-quality --run runs/core-10day-live \
  --arms A,B --samples 2 --backend codex --workers 2 \
  --model gpt-6.1-sol --reasoning-effort high --service-tier fast \
  --out runs/quality-live-AB-20261103
```

The output name must be new. This command is for the orchestrator; it was not
run here. It schedules 140 samples and about 280 model requests before repairs,
with original clinical spec/canonical inputs and fixed historical histories.

The 35 sanity samples took 129.4 minutes at two workers. Charged sample times
sum to 250.7 minutes: mean 429.9 seconds, median 378.9, range 124.0–872.3.
Scaling those sample times to 140 samples at two workers gives 8.4 hours of
evaluation. Accounting for the CLI sharing frozen-evidence preparation across
four samples per decision gives about 6.6 hours (preparation/pipeline split
inferred from record start and artifact completion timestamps). Budget roughly
**7–9 hours of evaluator time, plus live Codex latency**. No live latency was
measured here; cache warmth, candidate count/layout and repairs can change the
estimate. Replay tokens are historical references, not new usage.
