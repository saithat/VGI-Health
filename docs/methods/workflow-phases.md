# Workflow phases and release capabilities

Owner decisions 9–12 and the bounded increment of 15 were approved on
2026-11-09 in [wave 3](../design/wave3-decisions.md). These are simulator
protocols around the existing clinical UI episodes. They do not certify a
pharmacy interface, clinical appropriateness, message delivery or rich note
composition. No clinical specification or existing theorem was weakened.

## Phase execution

A task optionally carries `workflowPlan`. Both expert and bounded simulators
charge its preclinical phases, execute the real Lean interpreter episodes,
and append response/notification/closure phases only when every clinical goal
completed. `TaskMetrics.workflow` records the ordered phases, responsible owner,
clinical completion, closure, active milliseconds and passive waiting separately.
Phase service and waiting contribute to serial elapsed time; both are reported
separately from UI KLM effort. It is distinct
from UI events and interruption work; phase reports do not invent UI clicks.

Ownership is a named persona. Optional support delegation explicitly offers,
accepts, reviews and returns work to the responsible clinician; an unaccepted
offer leaves clinical work incomplete and the workflow unclosed. Delegation grants no signing authority. The
actual program user and all role/entry/review/alert guards still authorize each
clinical commit. Active sender/recipient coverage handover belongs to the
separate scheduling lane.

Refill tasks retain W7 and their focused contained prescription. Their sequence
is claim → optional delegated review → prescription/monitoring review → the
existing guarded approve, deny or change episode → pharmacy response → patient
notification → close. Schedule II renewals still require new prescriptions;
this protocol does not turn them into refill attestations. Pharmacy response and
notification here are declared scenario service, not external exchange receipts.
U1 (2018, retained older evidence) reports 52.12±20.66 UI seconds; N16 (2020–24
requests, publication 2026) concerns operational turnaround. Neither number is
used as an extra UI wait or a new measured phase duration.

Every non-UI phase uses **scenario** `phaseMs=5000`. Refill/pharmacy/prescription
response waiting uses **scenario** `responseWaitMs=60000`; other plans use zero.
S8–S13 specify workflow structure only, not these durations or delegation rates.
`world gen --workflows legacy` omits these plans, retains capped legacy inbox
bursts and uses the original dose timing generator. Existing schedules without
plans preserve their simulator behavior.

## Compound alerts

`world/src/workflows.ts:compoundAlert` creates one task for inspection and a
declared `inspect`, `cancel`, `alternative` or `override` resolution. Cancellation
removes the proposed order from the scenario; alternatives require an explicit
replacement. The original proposal and resolution remain in a synthetic
`DetectedIssue` keyed by task ID and patient; only that matching record supplies
the signed assessment/plan rationale. The replacement or
override uses the unchanged clinical interpreter, including every applicable
alert acknowledgment. There is no guard-bypass probability. Generated tasks
with allergy context receive the compound inspection/review protocol; explicit
cancel/alternative/override scenarios use the constructor. U8 (2021,
150±48 seconds) is a compound-task comparator, not a fitted timing target here.

## MAR timing

**Regulatory window input:** S14, CMS SOM revision 248 (2026), eligible scheduled
dose windows ±30/60/120 minutes. The inherited hospital classification selects
30 minutes for insulin/antibiotic/anticoagulant drugs, 120 for daily/q24h and
60 for other scheduled drugs. Criticality, clinical holds, refusals, retries and
escalation remain the existing scenario policies; PRN doses have no new scheduled
window. The early boundary saturates at midnight in these minute-of-day records.

New administration decisions carry `windowStartMin`, `administeredMin` only
for a given dose, and `chartedMin` for every outcome, alongside the existing
scheduled, attempted and window-end times. The additive Lean specification
checks the early boundary, inclusive late boundary for giving/delay, one of the
three symmetric widths, charting after the attempt, and absence of an
administration timestamp on non-administration. Invalid decisions create no
simulator episode. The MAR commit reducer checks a supplied timing record and
binds its outcome to the confirmed UI outcome; old callers can omit that record.
Its optional `chartedTime` timestamps the FHIR documentation note separately
from the existing bedside/outcome `time`.

The old Bernoulli expiry draw is disabled in the new generator. A **scenario**
signed Normal(15,35²)-minute offset supplies the planned attempt (early values
clamp to the early boundary); attempts beyond the late boundary become not-given.
A **scenario** lognormal charting lag, log-location ln(6) and log-SD 0.8, supplies
the planned charting timestamp. These are exogenous plans; simulator queueing and
UI documentation endpoints are separately realized workload measurements.
New MAR tasks become chartable at `chartedMin` and can enter successor coverage.
Their overdue-dose classification uses the explicit bedside outcome, so late
charting alone does not turn a timely administration into a late dose. Terminal
window-expiry omissions remain overdue; legacy records retain the documentation
proxy. The original records still distinguish held/refused/delayed/not-given.
Admission/order availability, absence from the ward and NPO are checked before
an early administration. Re-offers retain their existing 20/45-minute policy
and 18:59 monitoring cutoff; the CMS window itself is no longer truncated by
shift end. Cross-shift acceptance/coverage remains the scheduler's responsibility.

N6 (2021–23 post-cesarean analgesics; publication 2024) signed lateness median
15 minutes and N7 (2021 publication) charting discrepancy median 6 minutes remain
comparators. Their populations and measurements do not justify fitting a general
ward distribution. N15 (2022–23 UK stock-related omissions) is likewise a
subtype comparator; it is not substituted for all omissions.

## Inbox streams

**Calibrated mean inputs, N1 (2022–23 US academic primary care; publication
2024), per eight scheduled clinic hours:** patient advice 15.3, prescription
14.3, results 12.3, calls 23.5, consults 0.31. **Scenario** Poisson counts,
uniform arrivals over the first 480 shift minutes, and support delegation for
calls and noncontrolled refill review supply the temporal/routing model. Dispersion, timing shape, patient
selection and delegation are not calibrated.

All locally produced results and inherited backlog are preserved. Additional
external-result scenarios supplement the reference result stream; due controlled
prescription requests are preserved and routine refills fill the prescription
target subject to eligible patients/medications. These constraints mean realized
counts need not equal the reference means. Advice/call/consult tasks require
signed clinical notes, not fabricated result acknowledgments. Results retain
actual result acknowledgment and downstream orders/notes. Every task has an
owner; call review has an explicit accepted support delegate and return.

There is no burst handling cap. The generator's historical `handled` counter
now means dispatched to a clinical task; it does not claim successful service.
Queue delay, incomplete work and coverage carry-over come from simulator output,
not a second generator service model.

## Release capabilities

The additive `Ehr.Check.Workload.KeepsFields` contract requires a reachable,
revealable field for each declared dependency. `fields` derives dependencies
from the workload's clinical/note episodes, specification entries, captured
predicate inputs, explicit choice fields and declared waivers, preserves explicit
imaging/procedure `orderKind`/`orderCode`, and respects typed surgical encounter
stages. Other conditional entries are conservatively retained, including fields required
by other signing artifacts when advancing a batch of orders. Orphans, cycles,
tiny controls and unreachable screens do not count. This is a necessary field
capability check, not a proof that all workload tasks can complete.

Native `check` and `deploy` accept `--workload tasks.json`. Missing fields return
`workloadCapabilities`; deploy writes no publication. The agent supplies its
full declared workload on optional-feature/migration checks, canonical fallback
and subsequent release checks/deploys. Field declarations are separate from
agent prompts and sampled holdout performance; future patient choices are never
included in prompts. The baseline v1 nightly gate retains its historical scope;
service-order capabilities are introduced by v2. Direct native callers must
supply `--workload` to request this extra contract.

The regression uses the seven task IDs in the
[wave-2 investigation](../audits/wave2-investigation-20261109.md), the actual
retained P1 revision 5 and its frozen spec. Ordinary certification passes;
capability certification and deployment fail; restoring only the two reachable
fields passes; restoring them beneath a missing parent still fails. Historical
programs, outcomes, choices and certificates remain unchanged.

## Scenario scope

Chart synthesis/note preparation and result follow-through now have explicit
phase execution around their existing guarded note/order/result episodes.
The protocol also provides tested phase plans for pharmacy clarification,
dispensing, external reconciliation, prescription amendment/cancellation and
coordination, but these plans alone are not complete new clinical workflows.

Remaining item-15 work: complete pharmacy message/dispensing exchange, explicit
external-record merge decisions, longitudinal amend/cancel acknowledgments,
interleaved ED work-up episodes, caregiver-specific consent/communication,
vaccine scheduling/caregiver exchange and peri-operative team coordination.
Rich note composition beyond current guarded fields is also incomplete. No
calibrated rates or synthetic-benchmark timing claims are made for these phases.

## Verification and exact additions

The lane's [verification report and exact specification additions](../audits/wave3-workflows-20261109.md)
records commands, results, theorem axioms and the release regression.
