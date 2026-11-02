# Small human pilot: next-action calibration and interface effort

[Validation commands and known worktree issues](validation.md).

Status: preparation tooling; no human results, recruitment, ethics determination,
or clinical deployment. Protocol v1, 2026-11-02. Owner recruits participants and
acts as facilitator. Freeze this protocol, task manifest, model revision and
allocation before collecting human labels. Changes require a new study directory
and a documented protocol deviation; never silently combine versions.

## Aims and scope

Round two's decision model matched 1 of 24 simulator choices. That disagreement
motivates collecting human observations; neither model is ground truth. Estimate
(1) top-label calibration and top-1 agreement of each frozen next-action policy
against human choices at human-reached states, and (2) interface effort and
perceived workload/usability for stack, board, source-dated timeline and command
palette presentations. Human interface choices are observations, not a gold
standard for clinical correctness. This pilot does not validate treatment,
certification, patient safety, or a population-wide usability ranking.

The implementation fixes the P2 ordinary program and clinical task contracts.
Stack uses the existing ordinary screen painter; board, dated and command use
the existing sandbox ResearchWorkspace. All conditions use one assigned patient
per block, including board. Thus this compares single-patient presentations and
does **not** measure the round-two board's multi-patient throughput or interruption
management. Clinical source content and guarded interpreter transitions remain
unchanged. Different shells are part of the intervention, so differences cannot
be attributed solely to spatial arrangement.

The dated condition adds an explicitly labeled index of the 12 most recent
machine-readable source dates from Observation, DiagnosticReport, Condition and
Procedure resources; entries use their actual dates, UTC positions and source
labels. Complete clinical controls remain below. No date is guessed from a
formatted display row. This addresses the earlier lab's empty date index; it is
a study presentation addition, not an admitted Lean timeline extension.

## Participants, design and allocation

Recruit 5–10 adult clinicians with ED workflow familiarity; target 8 if feasible.
Record eligibility outside the software without adding identifiers to study
records. Participation is voluntary; avoid direct-supervisor recruitment and
individual performance reporting. No patient recruitment. Use one workstation,
input device, browser version, zoom and 1440×1000 CSS-pixel viewport where possible;
the export records actual dimensions and pixel ratio. Record deviations locally.

Within-subject design: each participant uses all four designs. Assign the next
allocation slot before arrival, not based on skill or observed performance.
Participant IDs P001–P999 are independent of the participant's name. Williams
orders balance period and first-order carryover over each four participants:

| Slot modulo 4 | Block 1 | Block 2 | Block 3 | Block 4 |
|---|---|---|---|---|
| 0 | stack | board | command | dated |
| 1 | board | dated | stack | command |
| 2 | dated | command | board | stack |
| 3 | command | stack | dated | board |

Measured case index = `(blockIndex + floor(slot / 4)) % 4`. Each person gets four
distinct patients, one per design. Across a complete set of four slots, every
design occurs once in each period and on each case. The additional case rotation
changes period/case pairing between groups of four. At 5–10 participants balance
is approximate; report actual design×case×period counts and attrition. Do not
replace an inconvenient observation or change allocation after inspecting it.

Allow 60–90 minutes: explanation/consent (~10), short practice in each design
(~15), four measured blocks with ratings (~40–60), breaks/debrief (~5). These are
planning estimates to revise after the facilitator rehearsal, not measured times.
Practice uses a fifth synthetic patient, repeats that same case across designs
in the assigned order, and is flagged/excluded from analysis. Teach opening a
patient, navigation, entry, review, acknowledgment, signing, stopping and palette
keys; standardize exposure to about three minutes/design. A practice block may
be stopped before completion. Do not coach next-action ordering during measured
blocks. No concurrent think-aloud during timed work; debrief afterward.

## Tasks and completion

`prepare.mjs` selects the first five distinct-patient P2/W3 day-one trajectory
entries matched by task ID and patient ID to `runs/world/2/schedules/day-01/P2.json`.
The first is practice; the remaining four are measured. These are synthetic ED
cases with the world's note sections, medication instructions and disposition.
The manifest contains the exact instructions and original task objects. Have a
clinician review their plausibility before recruitment. Do not change clinical
instructions on the fly; this is interface execution of specified synthetic
plans, not independent diagnosis or prescribing.

Episode facts come from archived production `taskEpisodes` contexts. Preparation
uses worktree trajectories when available, otherwise reads those specific files
from `hackathon-final` with `git show`; it records origin and SHA-256 for every
input. It copies no historical next-action labels. Synthetic fixture projections
supply the display. Program, task inputs, full episode facts, source-date index,
WASM digest and source commit are frozen into ignored `manifest.json`.

The participant must find/open the assigned patient using the native picker;
hydration is a host action and is not counted as a clinician action. Every
clinical event goes through the existing WASM interpreter. Episode completion
uses the existing goal predicate. All episodes must finish before the completion
button enables; a Stop task option records an incomplete block. The UI never
shows simulator goal-action suggestions. Clock updates follow measured elapsed
time in interpreter deciseconds. Across episode resets, patient context and
receipts carry forward; task instances reset between designs.

The default cases contain both admission and discharge workflows. There is no
live Medplum/commit-service connection, clinical save, or deployment path. These
custom views remain sandbox, regardless of the backing program's certificates.

## Measures and operational definitions

Clinical dialogs render inside the measured task viewport; surrounding study
controls remain accessible so withdrawal is available during an alert.
Capture only during the task viewport; onboarding, task instructions, ratings,
export controls and breaks are outside the effort counters.

| Measure | Recorded definition / limitation |
|---|---|
| Clicks | Pointer-generated DOM click activations (`detail > 0`); keyboard activations count through keys. Not raw pointer-downs. |
| Keys | Keydown events, including modifiers and repeats, within the task viewport. No individual key values stored. Paste/IME are not reconstructed as typed characters. |
| Scrolls / distance | Nonzero DOM scroll notifications and summed Euclidean CSS-pixel offset deltas, by scroll element including the task viewport. Browser event coalescing affects counts; programmatic reveal also counts. |
| Mouse travel | Sum of sampled mouse pointer segments in CSS pixels; reset after leaving the task viewport or hiding the tab; no invented start distance. Touch is not modeled. |
| Time | Monotonic start-to-stop wall time in milliseconds; includes interpretation and rendering latency; separate hidden-tab duration retained, not subtracted. No automatic idle-time correction. |
| Errors | Interpreter-blocked events, attempted wrong-patient route, completion/give-up. These are interface proxies, not adjudicated clinical error rates. |
| Short NASA-TLX | Six integer ratings 0–100 after each measured block: mental, physical, temporal, performance, effort, frustration; unweighted mean (Raw TLX). Performance anchors run successful→unsuccessful. No pairwise weighting. |
| SUS | Standard ten items with 1–5 responses after each measured design. Sum odd-item `(response−1)` and even-item `(5−response)`, then multiply by 2.5. Score is 0–100, not a percent success rate. |

The short NASA-TLX implementation retains all six dimensions and omits weighting;
see [NASA's instrument](https://www.nasa.gov/human-systems-integration-division/nasa-task-load-index-tlx/).
SUS attribution: John Brooke (1996), *SUS: A “quick and dirty” usability scale*,
Usability Evaluation in Industry, pp. 189–194
([original chapter](https://hci-studies.org/methods-and-measures/downloads/SUS_Brooke1996.pdf)).
The app presents the standard ten statements and requires all ratings to finish
a session. A participant may decline any response by stopping participation;
missing questionnaires are never imputed.

Semantic traces reuse the generated Event schema, RenderInput/state/step seam
and task/time/screen/event/result trajectory fields. They include native absolute-decisecond `t`, separate millisecond `elapsedMs`,
episode index, pre-event state, replay segments and final state, and a reference to the frozen manifest's clinical context.
Physical measures use the existing geometry Point convention; live sampled
movement replaces the historical straight-line target-distance proxy. Do not
compare those distances as though they had the same measurement method.

For calibration, snapshot **task-viewport-intersecting, enabled, non-inert button
choices before the action**, deduplicating palette/native duplicates by semantic
event. Include navigation, acknowledgment and confirmation with their true
Event mapping. Do not append the observed choice, truncate offers to fit a model,
or substitute goal-oracle actions. This is a bounded button-choice observation:
a hit-test at the visible intersection center excludes occluded targets, but this
is not demonstrated attention or full legibility.
Entries, nonbutton actions, offscreen actions, empty/singleton sets and sets over
ten options are excluded with reasons. The latter is the local scorer's input
limit. Report eligible/total counts and per-design exclusions; low coverage can
make the calibration comparison inconclusive.

## Pilot size and analysis plan

Five to ten clinicians is feasible for discovering workflow failures, exercising
counterbalancing, estimating within-person variability and identifying gross
model disagreement. It is not a power calculation or a claim that five people
find all usability problems. There are only 5–10 independent people even if
hundreds of actions are collected. Confidence intervals will be unstable; use
observed variation and failure rates to plan a larger study.

Freeze the local decision-model weights/revision, endpoint configuration,
profile seed (20261103), model identity and software manifest before labels are
examined. The scorer queries the model with the pre-action title, slot, design,
episode and full observed offer set, never the human label, subsequent event or
outcome. It reuses `LocalDecision` and the 24 frozen round-two `PhysicianDecision`
profiles; average their distributions after applying the existing search-order
and lapse mixture. Experience equals measured block position, not observed
success. This adapter scores all exposed buttons, whereas round two used a
**goal-filtered** choice set. These predictions are explicitly a new observation
adapter, not a reproduction of round-two 1/24. No behavioral parameters are fitted
in this pilot; the scores diagnose where later calibration is needed.

Score both policies at the **same human-reached states** to avoid comparing
incompatible independent trajectories. `predictions.json` preserves input hashes,
probabilities, model ID, profiles and exclusions. Keep the exact model revision
in the local study record; a model name alone is insufficient provenance. A
uniform stand-in is allowed only for simulated dry runs, and cannot silently
stand in for human-data model scoring.

Primary descriptive outputs:

- Top-1 agreement per policy; ties resolve by frozen option order, independent
  of the human label. Five equal-width top-confidence reliability bins including
  confidence 1 in the final bin; frequency is whether the top prediction matches
  the human action. ECE = `sum(n_bin / N × abs(mean_confidence − agreement))`.
  Report bin counts, ECE and top-1 agreement overall and per design. Empty
  estimates are null, never zero. These are top-label curves, not classwise or
  clinical-outcome calibration.
- Mean effort, completion proportion, Raw TLX and SUS per design; retain every
  stopped block in a completed session. Paired differences from stack use only
  participants with both observations. Report raw counts and elapsed time for
  incomplete blocks alongside completion; do not reward rapid failure as efficient
  completion. Examine individual records by case and period before interpretation.
- Deterministic 2,000-replicate percentile bootstrap 95% intervals. Resample
  participants, retaining all their decisions for calibration, and pair
  within-person design differences. Fewer than two contributing people yields
  no interval. No event-level pseudo-replication, significance fishing, or
  population superiority claim. SVG curves are descriptive; inspect JSON bin
  counts, especially with tiny samples.

Analysis uses the latest immutable export per participant/session; complete
sessions form the primary paired set. Withdrawn and unfinished sessions are
listed as excluded. Review stopped/unfinished cases separately as feasibility
findings; do not silently delete them. Missing model predictions have no invented
probability. Do not pool simulated dry runs and human sessions. A later fitting
round must split by participant, evaluate on untouched participants, and report
all tuning; this small pilot cannot support a credible flexible calibration
train/test split. No model retraining or UI selection occurs automatically.

## Ethics and data handling

**Institutional determination is unresolved.** Whether this pilot requires IRB
review depends on the institution, jurisdiction, funding and purpose, including
intent to publish/generalize. Synthetic patients remove patient-data exposure,
but clinicians are still people being studied. Ask the responsible institutional
HRPP/IRB for its determination before recruiting; do not self-declare exemption
because the activity is small or called usability testing. Publication intent
alone does not decide research status; OHRP distinguishes improvement activities
from investigations designed to contribute generalizable knowledge
([OHRP FAQ](https://www.hhs.gov/ohrp/regulations-and-policy/guidance/faq/quality-improvement-activities/index.html)).
The documentation and checkbox are neither ethics approval nor a legal finding.

Adapt [consent-template.txt](consent-template.txt) with institution, contacts,
review/determination reference, compensation, retention, withdrawal cutoff and
publication plan. Give the participant a copy and answer questions before the
checkbox. Confirm that the institution accepts this electronic consent procedure;
if a signed institutional form is required, store that separately. The server
requires an adapted consent file for human mode and refuses unresolved uppercase
placeholders. This is a setup check, not a substitute for institutional review.

No PHI is intended or needed. Use only bundled synthetic patients. Do not collect
real names, employer details, emails or demographic free text in the app. Entry
values are retained as clinical events, so explicitly instruct participants not
to enter real information. No audio, video or screen recording. Do not collect
additional observation notes containing identities. A separate recruitment/contact
list, if necessary, stays outside this repo/data directory with restricted access.
Treat pseudonymous traces as sensitive: timestamps and a small clinician cohort
can permit identification.

Store all exports under ignored `runs/study-<date>/` on an access-controlled local
computer. The dedicated server binds 127.0.0.1, has no live clinical proxy, rejects
cross-origin writes, blocks direct Vite access to ignored run files, and serves
only explicit study APIs. It does not upload results or call external AI services;
model scoring is explicit and loopback-only. The development server is not a
multi-user hosted service. Do not expose it through a tunnel or Tailscale.
These protections apply to the dedicated study server. The ordinary dashboard
server can serve files under `runs/`; do not expose that general dev/preview server
while participant exports are present.
Session files use mode 0600 and study directories 0700 on creation; verify inherited
ACLs, local disk encryption and backup access under institutional policy.

The app saves consent immediately, snapshots every 15 seconds during work, and
exports at each block/rating and on demand. JSON writes are immutable, with local
server receipts. Refreshing does not resume; recover the latest checkpoint for
feasibility review and assign a new pseudonym if repeating. Do not discard a
failed-save indicator: keep the page open and retry Export before closing. No
browser localStorage or participant-data cache is used; request responses use
`no-store`. The active page keeps the current session in memory.

Withdraw stops capture and flags the session; it does not erase older snapshots.
For a deletion request, remove **every** file with that participant ID in the
study's sessions directory, remove predictions and derived reports that include
them, regenerate summaries, and apply the same deletion to authorized backups.
Honor the stated withdrawal cutoff; aggregated published data may be irreversible.
Adopt a finite retention period before recruitment (proposed default: delete raw
traces 12 months after study close, subject to institutional requirements).
Designate an owner for access, deletion, incident response and retention review.
Only aggregate results leave the workstation after disclosure review; individual
traces need a separate review/consent basis. Never commit participant data or add
ignore exceptions. Avoid including raw paths/participant details in public issues.

Risks include fatigue, frustration, social pressure, inadvertent sensitive entry,
small-cohort identification, learning/carryover, task difficulty confounding,
instrumentation loss, and model observation mismatch. Mitigate with voluntary
recruitment, breaks/stopping, synthetic-only instructions, fixed task plans,
counterbalancing, local access control, save verification, explicit coverage and
wide descriptive intervals. Neither formal proofs nor this pilot establish
clinical correctness of the synthetic plans.

## Operator commands and artifacts

Run from the repository root. Install dependencies with the frozen lockfile; do
not edit the lockfile. Use disk-backed scratch space. Chromium must be available;
if needed install it with the app's existing Playwright command.

```sh
export TMPDIR=/home/saithat/Projects/run-tmp
pnpm install --frozen-lockfile --store-dir "$TMPDIR/pnpm-study-store"
pnpm --filter app exec playwright install chromium
python3 -m venv "$TMPDIR/study-plot-venv"
"$TMPDIR/study-plot-venv/bin/python" -m pip install --cache-dir "$TMPDIR/study-pip-cache" -r scripts/study/requirements-plot.txt
export STUDY_PYTHON="$TMPDIR/study-plot-venv/bin/python"
node --import ./agent/node_modules/tsx/dist/loader.mjs --test scripts/study/*.test.mjs
node --import ./agent/node_modules/tsx/dist/loader.mjs scripts/study/dry-run.mjs --out runs/study-dry-rehearsal --participants 4
```

Dry-run uses one browser page at a time. Four simulated participants exercise all
Williams orders, real UI onboarding, practice, measured tasks, questionnaires,
local JSON export, independent dashboard trajectory replay (including final-state
equality), stand-in model/profile scoring, CIs, CSV and SVG. The test driver
alone uses goal actions. Its movement, timing, choices and ratings are artificial;
`dry-run-verification.json` is pipeline evidence, not human calibration. Use a fresh
output directory for each rehearsal; source manifest/predictions are immutable.

For human preparation and operation, adapt consent into an ignored local file,
complete the institutional process, then:

```sh
node --import ./agent/node_modules/tsx/dist/loader.mjs scripts/study/prepare.mjs --out runs/study-2026-11-XX
# Put adapted consent at runs/study-2026-11-XX/consent.txt before launch.
node --import ./agent/node_modules/tsx/dist/loader.mjs scripts/study/server.mjs --out runs/study-2026-11-XX --consent runs/study-2026-11-XX/consent.txt --port 5197
# Open http://127.0.0.1:5197/study on the local study workstation.
# After collecting labels, independently verify the recorded interpreter traces:
node --import ./agent/node_modules/tsx/dist/loader.mjs scripts/study/verify-trajectories.mjs --out runs/study-2026-11-XX
# With the frozen local model server already running:
node --import ./agent/node_modules/tsx/dist/loader.mjs scripts/study/score.mjs --out runs/study-2026-11-XX --endpoint http://127.0.0.1:8788/v1 --model Mapika/decider-0.8b
node --import ./agent/node_modules/tsx/dist/loader.mjs scripts/study/analysis.mjs --out runs/study-2026-11-XX
```

The output-directory name accepts letters/digits/hyphens/underscores after
`study-`; choose an actual date/run ID. Before each participant, assign a fresh
ID and allocation slot, verify consent and display geometry, and verify the
local Saved indicator before closing. Recruitment linkage, model revision,
institutional determination and any deviations belong in restricted local study
records. `check-binding.mjs --out <study-directory>` compares the current production
`app/dist/build.json` with a clean HEAD archive built in TMPDIR using the same
dependencies; build the app first. It writes the comparison and baseline build
log under the study directory without touching another branch or worktree.

No changes to Lean, certified painter sources, app entry/build config
or dependency lockfile are needed. The standalone entry lives under
`app/src/dashboard/study`; normal production routing/build remains unchanged.

Artifacts: `manifest.json`, `study-settings.json` (frozen mode/consent digest), `sessions/Pnnn--<session-id>--<timestamp>.json`,
`trajectory-verification.json`, `predictions.json`, `analysis/report.json`, `analysis/effort.csv`,
`analysis/reliability.svg` and `analysis/reliability.png` (Matplotlib); dry runs add verification JSON and final-screen PNGs.
Analysis may regenerate derived files; retain source snapshots. `--stand-in` is
only for dry-run scoring. Never use it to make a claim about the real model.
