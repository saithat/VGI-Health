# Wave-3 clocks, hospital time, ownership and interruption service

Decisions 3, 4, 5 and 7 in [the approved decision list](../design/wave3-decisions.md),
plus the owner's 2026-11-09 text-length addition. This is a simulator increment;
clinical specifications, guard predicates and clinical theorem statements are unchanged.
The [source register](../design/workflow-sources/sources.json) owns source IDs,
cohorts and links. No fitted profile or clinical validation is claimed.

## Separate time on one server

`Scheduling.Clocks` records UI, reading, bedside/clinical service, communication,
passive waiting, reorientation and queue delay in milliseconds. The first six
partition task wall service; queue delay is a separate endpoint and is not added
to service. `clock_partition` proves the partition when the recorded components
fit inside duration; executable tests check both real policy paths. Clinical
service runs atomically before UI work. Communication preempts only at UI event
boundaries; each communication protocol and each return remain atomic. Overlap
provides coverage, never an additional server. An outgoing actor finishes active
clinical work, including overtime. Passive fixed-exposure closure waits advance
the next dispatch but are excluded from active effort/overtime.

N1 (2022–23, published 2024) motivates retaining distinct EHR and inbox measures:
391.3±149.1 EHR minutes and 71.4 inbox minutes per eight scheduled clinic hours
are **not** extra waits. This increment does not add those totals to measured UI
work. UI documentation remains the clinical completion proxy; note text is still
a supplied scenario choice rather than a modeled clinical composition process.
`klmDeciSec` measures active EHR/reading/communication/return effort and excludes
bedside time. `clocks` also makes bedside time available without renaming it KLM.
Guarded workflow protocol phases ([workflow phases](workflow-phases.md)) are
excluded from `klmDeciSec` too; in `clocks` their active phase time is counted
as clinical service and their response wait as passive wait, so the partition
still sums to task duration (wave-3 merge decision).

| New parameter | Value | Evidence classification |
|---|---|---|
| Clinical service W1/W2/W3/W4/W5/W6/W7 | 5/0/10/2/5/6/0 min per task | Scenario, uncited; does not estimate observed bedside care |
| Section and exposed chart-note reading | 50 ms per character | Scenario, uncited; equivalent to 200 words/min with six characters/word |
| Text viewport | 1,800 characters; each additional viewport costs the existing 1.1 s scroll operator | Scenario, uncited; ordinal model rather than measured browser geometry |

`TaskChoices.noteTexts` comes from the data lane's Synthetic Hospital 2026
**synthetic-benchmark** sections. Section reading is charged once per section per
task, before the first field interaction. Existing chart notes are read once per
note ID per task only when a note panel is visible; hidden notes incur no reading
cost. Typing retains every source character. The twelve-component UI fold remains;
text pages add to its scrolls. Information-need item reading remains separately
charged. No relevance-judgment selection from deferred decision 16 is added.

## Continuous world and ED stages

`world gen --world-clock continuous` (CLI default) uses consecutive calendar days.
Library calls without options keep the historical weekday calendar, matching the
existing case-mix opt-out convention. Calendar mode uses a re-entrant scoped
context; nested or concurrent callers do not mutate a global setting. Each world
transition restores its mode from persisted state. Clinics close on Saturday and
Sunday; hospital ED arrivals, inpatient state and surgical hospital work continue.
The hospital source day spans 07:00 to the next 07:00, avoiding negative `Nat`
arrival times. Provider readiness may extend past that source-day boundary;
it is not capped at the next 07:00. FHIR timestamps roll into the next date rather than clipping to
23:59. The pharmacy and pediatric/surgical rates remain scenario-only.

| New world parameter | Value | Evidence classification |
|---|---|---|
| ED assigned-case count | Historical ten-hour count ×2.4 | Scenario extrapolation, not facility census or staffing calibration |
| Hour curve | Relative weight 2 at 10:00–21:59, 1 otherwise | Scenario; E4 (2006) motivates time-conditioned arrivals only |
| Weekday business-hours allocation | 0.437×7/5 at 08:00–16:59; weekends entirely after-hours | Scenario targeting S15 NHAMCS 2022's 56.3% after-hours reference under equal daily volume; actual volume varies |
| Provider readiness | Uniform integer 4–28 min after arrival, median 16 | Scenario distribution anchored to S15 (2022) median 16, not a fit of its wait distribution |
| Initial boarding | 75% 15–240, 22% 241–720, 3% 1,441–2,160 min | Scenario; N9 (2017–24) peak Jan-2022 40.1% >4 h/6.3% >24 h is a stress comparator, not these default weights |
| Bed capacity | Existing scenario ward cap: min(10, floor(adults×0.3)), at least 1 | Scenario; predicted discharge reservations can extend boarding |

Source-world ED records expose arrival, provider readiness, admit decision and
bed departure. A full ward extends departure instead of turning an admit decision
into discharge. Regimens and ward availability begin at departure; future ward
admissions remain excluded from the current ward census. `edCarry` retains visits
still in the ED at the next 07:00 boundary, including departures more than a day
away. `boardersAtShiftStart` counts admitted carry-over visits, not yesterday's
late admissions. Discharges still occupy the ED until their departure.

The source timeline is exogenous and shared between arms. It does not respond to
UI completion: `workload.timings.ed` separately records actual simulated provider
start, arrival-to-provider wait, documentation-proxy decision and subsequent
boarding/departure using the source boarding duration. Bed boarding is passive
patient time; it never occupies the clinician server after the decision. This is
not a fully coupled bed/clinician discrete-event model, and source versus actual
stage endpoints must not be combined into one observed stay.

The CLI emits `horizon-P1.json` through `horizon-P5.json` in addition to daily
schedules. These merge every source task, original ID/day/choices and shifted
release/deadline/dose timestamps into one queue and time origin. `sourceDates`
binds the calendar; coverage widens with the horizon. Run a horizon schedule to
measure next-day queue carry-over alongside new arrivals. Independent daily
simulations reset queues and do not measure that endpoint. The native CLI accepts
explicit multi-day source dates and exports complete unserved tasks with
`--carry-out`. No fixture/run data is tracked.

## Ownership and acceptance

Existing owner/patient/task/source binding, changed-fact reconfirmation,
current-version receipt checks and reasoned unsent-draft discard remain in force.
`offerHandover` and `acceptHandover` are separate transitions: the sender retains
responsibility until the named recipient accepts at or after the offer. Blank,
self-addressed, foreign-recipient, duplicate and time-reversed acceptances are
refused. `offered_owner` and `accepted_owner` prove the ownership endpoints.
FHIR Task/Workflow S8–S10 and SAFER S13 (2025) support this structure, **not** an
acceptance probability or service-time coefficient.

A queued task is initially owned by its source coverage actor; dispatch into a
later coverage window records an offer and explicit scenario-receiver acceptance
before service. This default receiver accepts immediately (scenario, uncited).
There is no claim of live human acceptance. A task arriving for the first time
on a night tour starts with that tour's actor and needs no predecessor handover.
A horizon-exhausted task stays pending until a recipient/coverage is supplied.
Protected-popup communication closure also records acceptance by a named
simulated on-call recipient. Communication notification never resolves the
underlying clinical result or creates a clinical receipt.

Coverage actors have distinct IDs. Both policies clear predecessor receipt caches
on actor change and filter source-snapshot receipts to the current actor. The bounded policy stores independent `actorMemories`; a new
successor starts empty, and the usual `memory` output remains the initial actor's
memory for existing callers. No predecessor drafts, acknowledgments, receipts or
layout knowledge are passed to a successor. The stock CLI still supplies immutable
source snapshots; external chart mutation continues to require `refreshFacts`.

## Role/activity interruptions and opt-outs

| Input | Wave-3 behavior | Classification/source |
|---|---|---|
| ED resident target | 6.75 offered interruptions/hour, fixed exposure | N4 2023 (published 2025), median 27/4 h reference; transfer to minute bins is scenario, not a fitted count model |
| Clinic | 2/h for W2/W7, 3/h otherwise | Scenario, uncited |
| Surgery | 8/h W6, 4/h otherwise | Scenario, uncited |
| Ward RN | 5.8/h IV tasks, 4/h otherwise | Scenario, uncited; N5's 44% ICU pump activities is **not** converted into a ward hourly rate |
| Pharmacy sensitivity | 4.25/h | Scenario eight-hour conversion of N8 2024 Australian clinical pharmacists' 34/day; not a US dispensing estimate |
| Channel service base | ED 35 s, clinic 45 s, ward 30 s, surgery 40 s, pharmacy 50 s | Scenario, uncited |
| IV-task service base | 28 s | Scenario transfer anchored to N5 ICU pump interruptions 2024 (published 2026): 28±21.9 s; not ward calibration |
| Channel multipliers | Page 1, urgent result 1.5, colleague 0.7, family 1.2, pharmacy 1.3 | Scenario, uncited; channel-specific durations and mixes are not fitted |

Page/urgent/pharmacy shares depend on role and workflow; the remainder separates
colleague and family requests. All weights are declared scenarios in
`Resumption.Arrivals.channelKind`. N11 (2020 cohort, published 2023) motivates
conditioning medication work on activity rather than imposing a universal
interruption penalty. Offered identities/times use the original source task and
an independent stream; arms cannot redraw arrivals by becoming slower. Fixed
exposure, at most one arrival per minute, popup protection, immediate versus
queued urgency triage, and closure after all offers remain provisional rules.
Each communication retains its ordered patient/read/assess/reply-or-escalate/
document protocol, but `serviceMs` drives its duration instead of five fixed step
costs. Recovery coefficients remain unchanged and unfitted (decision 19).

Historical controls remain explicit:

```sh
world gen --world-clock legacy --case-mix legacy --note-text legacy --clock-mode legacy
# Native simulator (independent switches):
ehr simulate ... --sim-model legacy --text-cost legacy --clock-mode legacy --interruptions fixedCost
# Same source text/typing with only the old reading/scroll model:
ehr simulate ... --text-cost legacy
```

`--sim-model legacy` retains old arrival rates, equal channel selection, step
service times and actor-memory behavior, and disables added bedside/text costs.
`--text-cost legacy` independently restores per-item reading and ordinal scrolls.
`--clock-mode legacy` retains task-local clocks; `--interruptions fixedCost`
retains historical action-position waits. The agent native adapter exposes
`simModel` and `textCost`; new run/remeasure CLIs record both switches. Retained
manifests without these keys resolve to the pre-wave-3 model, and resume
comparisons normalize historical defaults. Trajectory/replay exports preserve
that interpretation. Review schemas retain new clocks, ED stages, handoffs
and channel durations while accepting historical absence. The handoff list is
optional in both the Lean JSON wire and the review codec; older recordings
remain readable without turning an unmeasured handoff count into zero.
