# Role calibration: frozen protocol

This protocol implements wave-3 decisions 1, 2 and 8, approved 2026-11-09.
It is predeclared before any fitting result. The pre-declaration commit is
the first commit adding this document and `role-calibration/protocol.json`;
its full hash will be recorded here in the implementation commit.
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
