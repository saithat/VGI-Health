# Overnight proposal quality: diagnosis and experiment

Status: **phases 1–2 implemented, 2026-11-03; replay verification in progress.**
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
Pixel rounding conserves task totals in hundredths. Screen share is the fraction
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
null. Wall time per sample includes frozen evidence preparation, charged once
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
