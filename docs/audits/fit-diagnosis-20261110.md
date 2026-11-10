# Wave-3 role-calibration failure diagnosis — 2026-11-10

This is a read-only diagnosis of the frozen fit, not a refit or a proposed
parameter setting. All profiles remain experimental. The dominant PCP error is
an unmatched chart-reading window; ED lacks necessary capabilities; ICU lacks a
pump endpoint. Navigation is unidentified, and nonnegative latency cannot
remove an already excessive fixed cost. Every full holdout gate fails, although
PCP completion and Monte Carlo precision subchecks pass.

## Evidence boundary

Code locators below are relative to **F =
`/home/saithat/Projects/VGI-w3-fit`**, inspected at
`0c32fffba94ac6dbd2fd32bfd85fc5f769f7eec2`. The aggregate is
`F/docs/methods/role-calibration/results.json` (not `F/role-calibration/results.json`).
The original run report is
`/home/saithat/Projects/lane-logs/post/wave3-fit-final.md`. No source worktree was
modified. Original pre-declaration:
`ba5655a2e0e3b17692ac8fcadff1f5295f879483`; rebased equivalent:
`450271861865d5ad45b4e0547a02a3dfab18ab21`.

I re-read all 150,000 archived holdout attempts (five executable scripts × three
arms × 10,000), checking completion counts, successful-time means and offered-work
digests against `F/runs/wave3-fit/report.json`. All matched. The generated input
hashes match `docs/methods/role-calibration/execution-inputs.json`; the archived
study binary SHA-256 is
`3c5dd54f3d013342403be1053ddbee0a7412070d716b30015ed8cd28a64b7c30`.
No native attempt or held-out evaluation was rerun.

## 1. PCP: 498.15 seconds of irrelevant-to-the-source-window reading

The fitted endpoint is the final UI trace timestamp, truncated to 100 ms;
closure clocks continue after that endpoint
(`lean/Ehr/Tools/RoleCalibration.lean:56`, `:58`;
`lean/Ehr/Sim/Policy.lean:554`, `:557`, `:584`). Consequently, summing the
archived full-closure clock columns does **not** reproduce task time.
For each archived attempt I clipped communication, return and idle intervals
at `taskMs`, kept the reading/UI components, and checked the sum; the only
residual is endpoint truncation (−0.05 s for U9-2, zero for U9-4).

All values below are seconds. Columns are fitted PCP-arm means over 10,000
successful attempts; the example columns are line 1 of the named JSONL files
under `F/runs/wave3-fit/attempts/<task>/`.

| Component inside measured endpoint | U9-2 mean | U9-2 example `9d48d5de34e48159.jsonl:1` | U9-4 mean | U9-4 example `0cde7306edf9f89d.jsonl:1` |
|---|---:|---:|---:|---:|
| UI KLM, excluding the one text-length page scroll | 112.07958 | 113.20 | 45.06862 | 44.95 |
| Chart text reading | 498.15000 | 498.15 | 498.15000 | 498.15 |
| Text-length page scroll (1 × 1.1 s) | 1.10000 | 1.10 | 1.10000 | 1.10 |
| Interruption communication before endpoint | 4.91625 | 45.00 | 4.51125 | 0 |
| Return/reorientation before endpoint | 0.38155 | 3.70 | 0.27970 | 0 |
| Clinical service | 0 | 0 | 0 | 0 |
| Passive waits / queue delay | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| Endpoint truncation | −0.05000 | −0.05 | 0 | 0 |
| **Task time** | **616.57738** | **661.10** | **549.10957** | **544.20** |
| Source mean ± SD | **77 ± 46** | | **78 ± 83** | |
| Mean excess | **539.57738** | | **471.10957** | |

Reading alone accounts for **92.32%** of the medication excess and **105.74%**
of the lab excess. Removing that term arithmetically leaves 118.42738 s and
50.95957 s; this is attribution, **not** a counterfactual rerun, since a shorter
window would change interruption overlap. Text-page scrolling adds just 1.1 s;
it does not explain hundreds of seconds. UI totals including all scrolls are
113.17958 s and 46.16862 s. There are 33 and 15 scrolls respectively; the other
32/14 are structural scrolling. Scroll operators cost 1.1 s, with any device
homing retained in UI KLM (`lean/Ehr/Sim/Metrics.lean:14`, `:21`, `:33`;
`lean/Ehr/Sim/Policy.lean:314`).

The causal path is explicit:

- `scripts/fit-role-profiles.py:109` selects the first day-2 W1 synthetic patient,
  retains its actual chart lengths, starts at `chartSummary`, and removes the
  patient-selection step. `:127` sets no note-writing choices, no added resources
  and zero clinical service. The native harness supplies the parsed chart display
  without initial review receipts (`lean/Ehr/Tools/RoleCalibration.lean:34`).
- `lean/Ehr/Sim/Policy.lean:278` charges **50 ms per character**, with 1,800
  characters per viewport. At `:289` a visible `priorNotes` or `encounterNotes`
  provider triggers reading **every note in `chartDisplay.notes` once**, without
  task relevance selection. It is whole note-inventory reading, not reading every
  chart field. `:295` emits length-dependent scrolls; `:297` charges reading.
- The imported Synthea fixture
  `/home/saithat/Projects/VGI-Health/fixtures/synthea/Allyson_Veum_50d2c695.json`
  has six note texts of **1,553, 1,553, 2,316, 1,553, 1,518 and 1,470 characters**:
  **9,963 × 50 ms = 498,150 ms**. Five references are superseded and one current;
  the parser excludes entered-in-error documents, not superseded documents
  (`lean/Ehr/Render/Fhir.lean:676`, `:728`, `:751`). Exactly one note exceeds a
  viewport. These are imported chart texts; no generated task note is being typed.

The reported full-closure communication means are 32.52735/32.81445 s, and
closure waits 27.3367202/43.5114952 s. Only 4.91625/4.51125 s of communication
falls before the measured endpoint. In the U9-4 example, a 54 s family request
is serviced **after** the 544.20 s final UI event; `activeMs` is 598.20 s.
Those later costs must not be attributed to the holdout time. Clock accounting
is defined at `lean/Ehr/Sim/Scheduling/Clock.lean:190`; work/idle/return intervals
are recorded at `lean/Ehr/Sim/Resumption/Work.lean:129`, `:153`, `:158`.

### Source-task mismatch and the control

[U9's primary report](https://www.open-emr.org/wiki/images/f/fc/OpenEMR_Usability_Report.pdf),
PDF pp. 11, 20, 22, times successful tasks from the moderator's start cue to
participant completion. Task 2 enters Lipitor 20 mg orally daily, quantity 30,
then saves and quits; task 4 orders PSA through a past encounter. Neither
script directs a six-note chart read. Inference: the simulator's mandatory
note scan expands the timed work beyond these source instructions; source
chart size and incidental reading remain unknown.

Generic guarded signing also differs from the source routes. Quantity 30 is
present in the frozen manifest (`docs/methods/role-calibration/scripts.json:267`)
but absent from `OrderChoice` (`lean/Ehr/Core/Types.lean:1109`), and
`orderValue` has no quantity mapping (`lean/Ehr/Sim/Goals.lean:66`). The required
quantity field therefore cannot encode this source choice through that mapping.
Save/Quit and prior-encounter selection are explicitly unmatched
(`docs/methods/role-calibration/scripts.json:256`, `:290`). Guarded hospital
completion is not source-equivalent completion or observed unaided performance.

“KLM-only” means **zero added choice latency and zero detours**, retaining
wave-3 reading and real-work interruptions
(`docs/methods/role-calibration/scripts.json:37`). The fitted PCP candidate has
exactly those same parameters and 80% keyboard share. Its means differ from
KLM-only by only +0.00252 s / −0.00042 s because behavioral streams are independent
(`scripts/fit-role-profiles.py:142`, `:240`). This is not an independent
reading-free baseline. SD ratios are **0.4076** and **0.2114**, both below 0.5;
a fixed patient and fixed reading burden do not reproduce the source variation.
The available-case macro errors are 505.343475 s (profile) versus 505.342425 s
(KLM-only), across only 2/11 rows; the required all-row comparison is missing.

## 2. ED: obstructions, not slow successful tasks

All three arms have **0/10,000** completions for U3-2, U3-4 and U3-6. The other
six rows are **not executed**, not 10,000 failed attempts. The source asks for
short, specific operations, including an existing-order change and a verbal
vitals interpretation ([U3 primary report](https://slicompliance.com/wp-content/uploads/2018/06/Wellsoft-Usability-Report_a1-9-2.pdf),
Appendix C, PDF pp. 21–32). The obstruction list is:

| Holdout | Concrete obstruction and evidence in F |
|---|---|
| U3-2, simvastatin 20 mg | The literal drug is frozen at `docs/methods/role-calibration/scripts.json:305`. It is absent from the 25-drug formulary (`lean/Ehr/Formulary.lean:14`); unknown drugs have **no permitted dose units** (`:123`). `lean/Ehr/Core/Basics.lean:525` / `:529` require a permitted unit on that drug's own line. Archived complaints are `entry required: dose` and `no reachable unmet goal; incomplete`; aggregate obstruction: `docs/methods/role-calibration/results.json:163`. This is a data/capability failure, not an RNG or speed failure. |
| U3-4, cholesterol in HDL; U3-6, CT head without contrast | Retained P2 layouts **v1, v2 and v3 have zero fields for `orderKind` or `orderCode`**. The frozen v2 order composer supplies drug/dose/route/frequency fields (`releases/v2/personas/P2.json:1674`) and a sign button (`:3200`), but no service selectors. The spec already declares both capabilities (`releases/v2/spec.json:1773`, `:1781`); service goals request them (`lean/Ehr/Sim/Goals.lean:426`). A service needs kind and code on one slot (`lean/Ehr/Core/Basics.lean:669`) and both confirmed to sign (`:879`). The preserved guard reports `entry required: drug or complete service order` (`lean/Ehr/Core/Guard.lean:241`); the policy then reports no reachable unmet goal (`lean/Ehr/Sim/Policy.lean:417`). See aggregate obstructions at `docs/methods/role-calibration/results.json:244`, `:297`. A medication favorite or free-text indication cannot create this service line. |
| U3-3 | Existing-order edit/replacement endpoint absent; a new atorvastatin order would not modify the simvastatin order. Frozen unsupported declaration: `docs/methods/role-calibration/scripts.json:336`, `:345`. The action/event vocabulary supplies new lines and commits, not an existing-order edit operation (`lean/Ehr/Core/Types.lean:614`, `:940`). |
| U3-8 | Bactrim allergy-interaction **developer-information inspection** endpoint absent (`docs/methods/role-calibration/scripts.json:414`, `:423`). Acknowledging an alert does not establish inspection. Bactrim/trimethoprim-sulfamethoxazole is also absent from `lean/Ehr/Formulary.lean:14`; that is an additional prospective dependency, not an observed executed failure. |
| U3-9 | Losartan interaction developer-information endpoint absent (`docs/methods/role-calibration/scripts.json:436`, `:445`). Losartan is also absent from `lean/Ehr/Formulary.lean:14`; no executed failure time exists for this row. |
| U3-10 | No durable problem-list addition reducer/endpoint for atrial fibrillation (`docs/methods/role-calibration/scripts.json:458`, `:467`); signing a note is not adding the problem. |
| U3-12 | No durable allergy-list addition reducer/endpoint for codeine (`docs/methods/role-calibration/scripts.json:480`, `:489`); reviewing allergies is not adding an allergy. |
| U3-13 | No scored verbal abnormal-vitals interpretation outcome (`docs/methods/role-calibration/scripts.json:502`, `:511`); displaying vitals or recording a review receipt does not measure interpretation. |

The six unsupported declarations are consistent with the native generic
UI-event vocabulary (`lean/Ehr/Core/Types.lean:940`); a new named commit would
still need its durable workflow semantics or measurement outcome. They are not
all fixable by adding a button. Further patient-specific guards may emerge once
these first obstructions are repaired; this diagnosis does not claim sufficiency
from hypothetical fixes. In particular, adding the two service fields need not
weaken any signing rule, and the current service-order structural check does not
require a new drug-formulary entry (`lean/Ehr/Core/Basics.lean:669`).

## 3. ICU pump: a different activity and denominator

W4 ends at `administerMed` or `chartAssessment`
(`lean/Ehr/Sim/Goals.lean:207`); its episodes are per-medication administration,
follow-up nursing assessment and assessment (`:478`). There is no pump
programming, rate/volume entry, device start/stop, or pump-alarm response endpoint
in this fit. The N5 targets **28 ± 21.9 s** and **17.9 ± 13.9 s** are respectively
other-interruption service and device alert/alarm service, not two independent
pump-programming task families. Their registered denominators are 54
interruptions and 34 device alerts/alarms across observed pump activities
(`docs/design/workflow-sources/literature-parameters.json:1056`, `:1078`).

The simulator's ward-nurse IV-route branch uses 28 s as a base communication
service assumption (`lean/Ehr/Sim/Resumption/Arrivals.lean:51`), but its work
kinds are page/result/question/family/pharmacy, with no device alarm
(`lean/Ehr/Sim/Resumption/Types.lean:9`). Using a literature mean inside this
branch is not a matched measured endpoint or independent validation. MAR
signing and EHR alert acknowledgments cannot stand in for physical pump work.
The aggregate correctly reports zero matched families and missing simulated
values (`docs/methods/role-calibration/results.json:488`).

## 4. Why navigation is unidentified and latency is zero

The four detour candidates **0/60/120/240 per mille** each complete **200/200**
attempts on **each** U8 training task: all completion losses are **0**. The
objective uses completion likelihood and chooses the smallest detour on a tie
(`scripts/fit-role-profiles.py:196`). Unknown source path aggregation denominators
supply no usable additional loss (`docs/methods/role-calibration/scripts.json:13`).
The expert planner recovers from these detours; the completion statistic cannot
distinguish them. Zero is a deterministic tie-break, not evidence of error-free
navigation. U9-2's printed 5/8 path remains ambiguous and excluded.

The frozen latency search only adds **nonnegative milliseconds per mental
operator**; base KLM, chart lengths and reading coefficients stay fixed
(`lean/Ehr/Sim/Policy.lean:163`;
`docs/methods/role-calibration/scripts.json:14`). Zero latency already predicts
U8-2/3/5 means **548.482 / 558.436 / 625.9055 s**, against registered
**84 / 84 / 90 s** (`docs/design/workflow-sources/usability-tasks.json:1466`,
`:1505`, `:1544`). Reading alone is 498.15 s in all three. Extra latency cannot
subtract that cost. The normalized mean-plus-SD objective
(`scripts/fit-role-profiles.py:207`) selects **0 ms, CV 0**, loss **471.930861**;
the next-best candidate (500 ms, CV 0.5) has loss **481.119020**. At zero mean,
nonzero CV is skipped, so CV zero is not an estimated absence of human
variability. Adding a negative latency or fitting reading speed to an unknown
source chart would conceal the endpoint mismatch.

Separately, PCP N1 function/shift fitting was never performed: no matched
scheduled/unscheduled-day normalization or outside-scheduled-hours EHR denominator
exists; active simulation overtime is not TOSH8
(`scripts/fit-role-profiles.py:253`; `docs/methods/role-calibration.md:178`).
ED N4 supplies quartiles, not the required two independent task families with
SD/CI (`scripts/fit-role-profiles.py:258`). These missing gates remain failures
even if the short-order timing problems are resolved.

## 5. Smallest future changes for owner decision — none implemented

**Every changed fit below requires a new pre-declaration and new untouched
holdouts.** The current U9/U3 outcomes have been inspected; changing fixtures,
windows, layouts, endpoints, losses or coefficients and reusing them for promotion
would invalidate the frozen split. This follows the original protocol
(`docs/methods/role-calibration.md:14`), not a proposed relaxation. “Lean spec”
below means an additive contract may be needed for a new clinical capability;
no existing protected rule needs weakening.

| Cause | Smallest useful future change | Type | New pre-declaration? |
|---|---|---|---|
| PCP reading outside the source operation | Declare the exact timed order window; perform any clinically required chart review beforehand through legal actions, with valid receipts/state. Charge only source-matched exposure inside the window. If actual source reading is unknown, obtain matched chart-exposure evidence first. | sim + workflow + data | Yes: initial state/window/fixture changes. |
| Reading volume/speed confounded; SD too small | Freeze source-equivalent note content/length and participant/task sampling; obtain independent reading/variation evidence before estimating a reading coefficient. Retain full-chart workload experiments separately. | data + sim | Yes: new evidence/model assumptions. |
| Quantity / Save-Quit / past-encounter route unmatched | Carry explicit quantity through task choice → goal → entry; implement or select a genuinely matching prescription/lab workflow with declared completion event and encounter context. Quantity entry already exists; no signing-rule relaxation is needed. | sim + workflow + app/layout + data | Yes: semantic task/endpoint changes. |
| U3-2 unknown simvastatin | Add a reviewed native simvastatin reference entry with the source's permitted dose unit and drug metadata; preserve validation. | data (Lean formulary) | Yes for a new fit; no protected Lean-spec weakening required. |
| U3-4/6 cannot enter service lines | Expose reachable kind/code fields and confirmations on the ED order route, using the existing spec capabilities; certify the resulting program. | app/layout (release Program) | Yes: frozen layout changes. |
| U3-3 cannot modify an existing order | Add identified-order edit/replacement semantics and matching starting order; otherwise choose new evidence for a supported operation. | workflow + data + app/layout; additive Lean spec/reducer if implemented | Yes: new endpoint/contract. |
| U3-8/9 developer inspection absent | Add source-relevant interaction/developer-detail content and an observable inspection endpoint; add the missing literal drugs/interaction facts rather than substituting available drugs. | workflow + app/layout + data + sim; additive Lean spec if clinically guarded | Yes: capability and measurement changes. |
| U3-10/12 durable list additions absent | Add guarded problem/allergy additions with durable updates and matching initial records; otherwise obtain new supported-task evidence. | workflow + app/layout + data + additive Lean spec/reducer | Yes: new clinical capability. |
| U3-13 verbal interpretation unmeasured | Add a scored source-matched answer/outcome to the simulation task, or obtain evidence for a supported review endpoint. | sim + data; app/layout only if exposing an answer UI | Yes: new outcome definition. |
| ICU pump endpoint absent | Either implement and instrument the relevant device activity with separate alarm/service exposure, or explicitly leave pump calibration unsupported and obtain two matched native-MAR task families for a separately scoped profile. | workflow + sim + data; app/layout + additive Lean spec only if device capability is built | Yes: new scope/evidence/endpoints. |
| Detour loss cannot distinguish candidates | Obtain absolute path denominators or event-level navigation/error evidence and predeclare an identifying navigation objective. Do not reinterpret tie-breaking as fitting. | data + sim | Yes: new training evidence/loss. |
| Latency constrained against an oversized baseline | Fix task equivalence first, then preregister residual latency estimation; zero remains an admissible result. Do not introduce a compensating negative term. | sim + workflow + data | Yes: redesigned fit. |
| N1/N4 profile gates unavailable | Implement N1's actual normalized scheduled/unscheduled exposure and functional categories; obtain two independent matched ED task families with SD/CI. Keep shift and short-task endpoints distinct. | data + sim | Yes: new denominators/evidence. |

None of these choices can establish clinical validity from aggregate agreement
alone. Capability feasibility, task equivalence and identifiable measurements
must precede a new fit.

## Verification and exclusions

Scratch analysis and audit artifacts are under
`/home/saithat/Projects/run-tmp/fit-diagnosis-20261110/`. Environment:
`TMPDIR=/home/saithat/Projects/run-tmp`, `CI=true`.

| Exact command/check | Result |
|---|---|
| `python3 /home/saithat/Projects/run-tmp/fit-diagnosis-20261110/diagnose.py > /home/saithat/Projects/run-tmp/fit-diagnosis-20261110/diagnosis.json` | Passed; 150,000 recorded rows, all successful-time means/completion counts/offered digests match; endpoint decompositions agree within 0–99 ms truncation; frozen input hashes and binary digest match. |
| `git -C /home/saithat/Projects/VGI-w3-fit show ba5655a2e0e3b17692ac8fcadff1f5295f879483:docs/methods/role-calibration/protocol.json \| cmp - /home/saithat/Projects/VGI-w3-fit/docs/methods/role-calibration/protocol.json` | Passed; all 1,284 protocol bytes identical. |
| `git diff --check` | Passed. |
| `systemd-run --user --scope -p MemoryMax=8G -p MemorySwapMax=0 env TMPDIR=/home/saithat/Projects/run-tmp CI=true EHR_SCREEN_WORKERS=4 EHR_BIN=/home/saithat/Projects/VGI-w3-fit/lean/.lake/build/bin/ehr python3 /home/saithat/Projects/run-tmp/fit-diagnosis-20261110/audit-pair.py` | Passed, sequential full pair: templates 1,826/1,826 states, 16,434 measurements, zero findings, exit 0 (62.61 s); personas 1,296/1,296 states, 11,664 measurements, zero findings, exit 0 (55.61 s). |

The full audit pair runs from an unchanged scratch copy of the existing F
scripts/app, with F's native `ehr` and read-only dependencies, and the existing
`VGI-Health/app/dist` (app source, tests and scripts compared equal to F).
Each pair is confined to `systemd-run --user --scope -p MemoryMax=8G -p MemorySwapMax=0`;
workers are four, and the shared browser lock serializes execution. Initial
startup attempts failed because the scratch copy lacked the `agent` import
paths; adding read-only dependency links fixed that setup without modifying a
worktree. Cached measurements are retained by the existing audit policy: 1,788 template and 1,267 persona trees reused, with remaining trees and known-bad controls checked now. The short elapsed time is cache reuse, not a reduced audit selection.
The driver runs `node scripts/audit-alert-policy.mjs /home/saithat/Projects/run-tmp/fit-diagnosis-20261110/audit-templates`, then the same command with output `audit-personas` and `--personas`, with cwd `/home/saithat/Projects/run-tmp/fit-diagnosis-20261110/audit-snapshot`. This verifies screen policy, not source-task completion or calibration.

No behavior, parameters, frozen protocol, specs, Lean proofs, releases, app/hash
inputs or recorded data were changed. No fitting, new native attempts, lake
processes, Comparator run, WASM build, certificate re-issuance, deployment or push
was performed: this lane is documentation-only and another lane holds Lean.
The README gains only a diagnosis link/status clarification, as required by the
owner's same-commit documentation rule. Raw data and scratch analysis are not
staged.

## Owner questions

- Should the next PCP fit measure isolated order entry after valid review, or broader chart synthesis with new matching evidence?
- Which source-equivalent charts and untouched holdout tasks should replace the now-inspected U9/U3 evidence?
- Who owns the ED service controls, missing drug metadata and durable edit/list/developer-detail capabilities?
- Should ICU remain explicitly unsupported, target native MAR evidence, or fund a separate pump-device workflow?
- Which navigation/path and N1 normalized-shift data can support identifiable role fitting?
