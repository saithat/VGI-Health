# Role calibration: frozen protocol

This protocol implements wave-3 decisions 1, 2 and 8, approved 2026-11-09.
It is predeclared before any fitting result. The pre-declaration commit is
the first commit adding this document and `role-calibration/protocol.json`;
its full hash is `ba5655a2e0e3b17692ac8fcadff1f5295f879483`.
Agreement means statistical adequacy only. No clinician review exists.

## Frozen split and gate

Train: U8-2/3/5. Historical refill sensitivity: U1-21, fitted separately and
never pooled with contemporary order tasks. Development: U8-6/7/9. Holdout:
U9-2/4 and all nine U3 rows (11 time holdouts). No holdout influences fitting,
model selection or script revision after evaluation. A redesign retires the
holdout and needs new evidence. The source-register values remain unchanged.

Every time holdout must have absolute mean error at most one source SD and
predicted/source SD ratio in [0.5, 2]. Completion must lie in the source-count
Wilson 95% interval (z=1.959964). Use 10,000 attempts per holdout, successful
attempt times only; mean Monte Carlo SE must be at most 0.05 source SD.
Interpretable path ratios must be within 0.20 absolute; U9-2 and unspecified
aggregation denominators are excluded, explicitly, never counted as passes.
The fitted arm must beat frozen KLM-only macro-mean absolute held-out time
error on identical scripts. Missing evidence and unsupported scripts prevent
promotion; they never count as zero or success. No tolerance can be loosened.

PCP W1/W2/W7 uses N1 (2022–2023) with inbox/review/note/order and message
moments as training targets. Total EHR8 391.3±149.1 and TOSH8 84.3±58.8 minutes
are additional untouched holdouts with the same mean and SD-ratio checks.
ED resident W3 uses N4 (2023); ICU RN scope is IV-pump work W4, N5 (2024).
Each profile needs at least two independent, non-overlapping matched task
families with SD/CI before promotion. N4 quartiles and N5 interruption service
are external sensitivity evidence, not substitutes for missing families.
N8 (2024, Australian pharmacists) is sensitivity only. Pediatrics, surgery and
US pharmacy remain scenario-only. No blended clinician is constructed.

## Frozen execution policy

Reconstruct source-equivalent scripts, initial/final state, participant scope,
patient/screen selection, typing, alerts, assistance and timing endpoints before
fitting. Preserve U8's inconsistent demographic boilerplate and U9's printed
5/8 path as source ambiguities. Semantic source steps are not clicks. Missing
clinical capabilities or unmatched endpoints must be reported explicitly.

Use the merged wave-3 simulator: continuous serial clock, length-based text
costs, role/activity real-work interruptions and common absolute 24/7 offered
events/chart updates. Actor memory and behavioral RNG streams are independent.
Fit navigation/completion first using train aggregates, then nonnegative latency
terms conditional on the frozen traces. Keep expert and uncalibrated modes;
never introduce a universal novice multiplier. Do not fit the deferred learning,
recovery or preference coefficients. Aggregate moments do not identify subjects.

Freeze fitting and evaluation seeds, parameter search and KLM-only controls in
the script manifest before the first fit. Any stochastic moment approximation
is a declared scenario, not an observed distribution. Keep all task/fixture/run
data gitignored; only code, protocol and public aggregate results are tracked.
Fitted parameters are **experimental** unless their complete scoped profile
passes every applicable gate. A passing label must say
`calibrated (source ID, evidence year)`; synthetic-benchmark inputs never receive
that label. Existing regression/guard/completion requirements still apply.

Source register and full policy: [workflow calibration](../design/workflow-calibration.md#statistical-acceptance-without-a-clinician-reviewer).

## Script freeze before fitting

[`scripts.json`](role-calibration/scripts.json) freezes source-specific semantic
tasks, timing boundaries, native transfer limitations and the numerical search.
U8 imaging is one chest order; U8 laboratory is **CBC plus blood culture**;
medication is ceftriaxone. U9 medication is atorvastatin 20 mg orally daily,
quantity 30, with Save/Quit; its lab is PSA via a prior encounter. The generic
native routes retain all hospital signing requirements. They are explicitly
transfer reconstructions, with source UI fidelity unestablished, so numeric
agreement alone cannot promote them. Absent editing, incorporation, developer
inspection and verbal-response endpoints stay unsupported. No easier surrogate
is substituted for these outcomes. Source-specific initial patient records are
not available; the fixed imported synthetic patient is a declared scenario.

Navigation fits first on train completion with deterministic minimum-detour
tie-breaking. All selected source path denominators are unknown: path fitting
is unidentified and no path pass is claimed. Latency then searches nonnegative
additional service per mental operator using only U8 train mean/SD moments;
motor constants, text lengths, interruptions and deferred recovery stay fixed.
The per-attempt lognormal choice-latency law is a scenario assumption. ED uses
its own uncalibrated parameters, never PCP coefficients. ICU pump work lacks a
matched native task endpoint. N1 normalization also includes unscheduled days;
ordinary simulation overtime is not TOSH8. Such missing endpoints fail the
promotion gate, without inventing a shift-duration conversion.

## Native fitting harness

`scripts/fit-role-profiles.py` runs the native `role-calibration` executable on
the merged wave-3 model, with one fresh actor/task per attempt. The input freeze
[`execution-inputs.json`](role-calibration/execution-inputs.json) pins the actual
generated local input hashes. Programs/specs are release v2 with the chart
already open. Required entries, confirmations, review receipts and alerts remain
the actual interpreter requirements. The U8 unspecified ceftriaxone dose is a
declared 1000 mg IV daily scenario. Source-native menu layouts are not recreated.
Before the first fit, the script manifest was clarified to preserve role-specific
source keyboard/detour settings (PCP 80%/60 per mille; ED 20%/30 per mille).
The frozen split, gate and search grids did not change.

`simulate --choice-latency-ms N --arrival-seed N` exposes the same opt-in timing
and independent offered-work controls. Omitted latency is zero; omitted arrival
seed retains the existing seed behavior. Both expert and bounded policies charge
choice latency before interpreter guards evaluate elapsed time. Reading uses
the unchanged wave-3 length costs. Common offered work continues through fixed
exposure closure; successful-task timing stops at its final UI event, and full
closure clocks remain reported separately. No clinician-error/assistance model
is inferred from completion percentages.

```sh
export TMPDIR=/home/saithat/Projects/run-tmp CI=true LEAN_NUM_THREADS=4
# Before each lake command acquire w3fit, and release it after completion.
cd lean && lake build && lake build role-calibration
cd ..
python3 scripts/fit-role-profiles.py --prepare-only
python3 scripts/fit-role-profiles.py
python3 -m unittest discover -s scripts -p test_role_calibration.py -v
pnpm --filter agent lint
pnpm --filter agent typecheck
pnpm --filter agent exec vitest run test/ehr-adapter.test.ts test/simulation-modes.test.ts
```

The default source root is `/home/saithat/Projects/VGI-Health` (read-only);
fixture paths referenced by its world manifest must exist locally. All native
input files and attempt JSONL stay below `runs/wave3-fit`. Existing frozen-model
or acceptance output refuses an implicit rerun. Development is reported only
after parameter freezing and never used to revise the model.
