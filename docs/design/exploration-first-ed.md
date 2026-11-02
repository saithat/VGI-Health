# First ED × physician portfolio

Early research, 2026-11-02: **five Codex calls, six proposals, four accepted layout
niches**. All calls used `gpt-6.1-sol`, service tier `default`, and passed the
existing no-tools confinement audit. No deployment. The untracked report is
`runs/explore-ed-first/report.json`; final source hashes and recheck results are
in `finalRecheck`.

W3 was selected for triage, multi-order composition, documentation, review/signing
and disposition. Evaluation pooled all **40 world/2 W3 tasks on days 1 and 2**,
release v1, seeds `700 + day`. These are varied synthetic patient cases under the
single archived **P2 deterministic policy**, not a real department cohort.
Personalization is keyed by department × role; the backing program retains its
legacy P2 owner for this offline experiment. Publication remains a separate,
reviewed release on a slow cadence.

## Best accepted design per evaluated niche

All four use list navigation, mouse input, spec alerts, normal density and a
single-patient session. “Proved” denotes accepted Lean behavior and admitted Lean
layout; browser fidelity is checked separately. There is one accepted design per
niche, so these are representatives, not estimates of each paradigm's optimum.

| Layout / candidate | Tier | Completed | Activations | Native scroll estimate | Typed keys | Effort vs reference | Exported states checked |
|---|---|---:|---:|---:|---:|---:|---:|
| Stack / 001 | proved | 40/40 | 2,772 | 1,991 | 11,779 | −15.66% | 485 |
| Columns / 002 | proved | 40/40 | 2,772 | 3,009 | 11,779 | +0.38% | 521 |
| Timeline / 004 | proved | 40/40 | 2,812 | 2,945 | 11,779 | 0.00% | 503 |
| Document / 006 | proved | 40/40 | 2,812 | 2,946 | 11,779 | +0.02% | 503 |
| Fixed v1 P2 reference | checker accepted | 40/40 | 2,812 | 2,945 | 11,779 | reference | not rerendered for this measurement |

Effort is `activations + native scrolls + typed keys/20`; archive quality is its
negative mean, after completion. These are **native simulator estimates**, not
browser-measured movement or human time. The timeline's taller containers do not
change these native estimates; geometry enrichment is needed before usability
conclusions. More expensive columns/document designs remain in their niches:
the archive does not require global monotonic improvement.

Stack flattens nested order-set disclosures. Columns distributes clinical group
children and adjusts context disclosures. Timeline uses admitted ordered-child
containers; its longitudinal descriptor retains chart-history access but adds
**no dated temporal axis or chronological inference**. Document combines the
supported current-note document with structured authoring. Clinical field kinds,
review obligations and human commit authority remain unchanged.

Desktop samples (390px companions replace `1440` with `390`):

* Stack: `runs/explore-ed-first/screenshots/candidate-001-0-1440.png`
* Columns: `runs/explore-ed-first/screenshots/candidate-002-0-1440.png`
* Timeline: `runs/explore-ed-first/screenshots/candidate-004-0-1440.png`
* Document authoring: `runs/explore-ed-first/screenshots/candidate-006-1-1440.png`
* Document orders: `runs/explore-ed-first/screenshots/candidate-006-0-1440.png`

`runs/explore-ed-first/screenshots.json` binds all ten samples to exported states
and viewports. These are initial-state views of the synthetic Ashly Rippin
fixture, not all completed tasks. Independent gate coverage includes every
supplied exported state/popup probe at 1440×900 and 390×844. It does not establish
all-data or all-moments exposure; no new urgency policy was designated.

## Rejections and diagnostics

* **003:** Lean accepted; the screen gate rejected a complete-source-cell
  assertion on `w3Disposition-tabs-1.json` after historical records acquired
  document presentation. No simulation score or archive slot was assigned.
* **005:** the supported current-note document proposal moved nine original
  parents against budget eight. The independent identity check rejected it
  before Lean/browser evaluation.
* **006:** explicit JSON repair of the LLM-generated 005 leaves Sign in its
  original parent, retaining the other eight moves. All gates pass. Parent hash
  and patch are in `operators/candidate-006.json` under the run. No extra LLM call;
  both rejected parents remain recorded.

The initial four-call budget was extended explicitly by one stopped-run call,
within the owner's 60-call ceiling. New prompts include immutable task contracts
and movement/depth bounds. Initial calls target coverage niches; subsequent
search mutations can change dimensions and programs. This run used the
stand-in surrogate and lookahead one.

Frozen-model calibration artifacts are
`runs/explore-calibration-{stand-in,cpu}/calibration.{json,png}`. Stand-in ECE was
0.49375 on 160 verdicts and 0.51333 on 30 simulator clicks. Pinned Apache-2.0
SmolLM2-135M-Instruct CPU ECE was 0.29270 on eight verdicts and 0.43500 on eight
clicks (24 local decision HTTP requests). Choices are **simulator-generated, not
human**; the historical verdict set has only one negative and the CPU prefix has
none. These are smoke diagnostics, not calibrated clinical probabilities.
TabPFN v2 fit/predict and HTTP plumbing passed on 12 artificial rows only; no
surrogate was trained on evaluation labels.

[Implementation and licenses](exploration-tools.md) ·
[exact commands, validation and unexercised paths](exploration-validation.md).
The next experiment needs a broader same-role cohort, held-out cases, release
migrations and geometry-aware effort for exotic layouts.
