# Agent benefit in actions and modeled time

[Overview](../../README.md) · [Retained audit](../audits/agent-benefit-20261113.md) · [Discovery](discovery-and-cadence.md)

The release objective remains clicks plus scrolls. Reporting adds modeled effort
(`klmDeciSec`, tenths of a second), completion and the fraction of the idealized
floor gap captured. Neither simulated time nor the floor is observed clinician
performance. The floor permits ideal prefills and has no navigation or scrolling;
it is a reference for headroom, not a fully reachable layout.

## Comparison cohorts

`app/src/dashboard/benefit-metrics.mjs` pairs tasks by exact ID within the same persona and
day. Costs and savings include only tasks completed by **both** vendor/no-agent
and agent arms. Completion counts and failure lists include every task, including
partial failures whose lower effort must not count as improvement. Missing task
IDs are listed separately. Comparisons use the vendor arm's `floor` records on
the same paired cohort. No floor is borrowed from another day, workflow or arm.

For either actions (clicks + scrolls) or modeled time:

```text
savings = vendor cost − agent cost
gap captured (%) = 100 × savings / (vendor cost − floor cost)
```

Negative capture means regression. Capture is unavailable when headroom is
nonpositive, no tasks pair, or any paired task lacks a completed floor record.
Floor coverage (`floorTasks` / `paired`) is explicit. Aggregate percentages use
summed costs on the paired cohort, not averages of daily percentages. All costs
remain exact in JSON; tables round only for display (600 deciseconds per minute).

`agent/src/run.ts` emits daily timeline time/completion and paired comparisons
against both the role canonical and the deterministic no-agent arm. Its daily
raw effort includes partial attempts and is labeled with completion; savings
are in the separate paired comparisons. `agent/src/report.ts` retains modeled
time in `metrics/smoke-summary.json`, includes daily and persona comparisons,
and prints time/completion/gap columns beside its action report. The dashboard
uses the same comparison function on published summary task/floor records, so
completed days appear before a recording finishes; no day traces are needed.
Evolution shows persona totals and daily comparisons, and task comparison shows
modeled seconds and completion. Blind-protocol headline views use even days only.

## Train-only structural evidence

`agent/src/floor-evidence.ts`, called by `summarizeTrain`, uses only the supplied
past odd-day **train partitions** and their recorded floors. It opens no files,
queries no simulator and receives no holdout. Task IDs must occur in the supplied
train schedule; even days and mismatched day/persona inputs are excluded.
Existing nightly input checks continue to enforce the past-day boundary.
Validation, future schedules and blind tasks do not enter this table.

`workflowFloorGaps` reports each workflow's task/completion/paired counts and total
actual, floor and gap costs (clicks, scrolls, modeled time). It ranks descending
by action gap, then time gap, with workflow ID as the stable tie break. Incomplete
tasks and missing-floor costs are excluded from this paired cost table; counts
make the coverage visible. With no matched floors the gap is unavailable.
Existing per-workflow averages now show completion and divide completed effort
by completed tasks, so failed attempts do not lower those means.

The compact breakdown uses the program version bound to each train result:

- Navigation: screen links, Back, workspace selection, searches and tabs.
- Scrolling: recorded physical scroll counts, with trace scroll-operator time.
- Alert acknowledgments: explicit acknowledgment events and their operators.
- Entry steps: entry, confirmation, review, commit and other identified controls.
- Unattributed: unknown controls and the signed residual between recorded task
  totals and trace-derived costs. Missing historical program definitions are not
  replaced with a different version's component meanings.

Trace time follows `lean/Ehr/Sim/Metrics.lean`'s K/P/C/H/M, scan, wait and scroll
operator costs, including device homing across event boundaries. It does not
subtract trace timestamps, which may include scheduling/clinical delays. Required
floor acknowledgments cost M+P+C (25.5 deciseconds each); remaining recorded floor
time and activations belong to entry steps. All navigation/scrolling floor costs
are zero. Active interruption service, physical scroll expansion and subsecond
rounding can make task metrics differ from trace operators: measured scroll
counts stay in scrolling, while time and other residuals stay unattributed.
Breakdown gaps therefore reconcile to the recorded total without inventing an
attribution for unsupported costs. This is diagnostic evidence, not a guarantee
that each category's excess can be removed independently.

The prompt exposes modeled-time fields alongside actions and explains units,
coverage and the unchanged objective. The timing model is provisional. The
existing physical hotspot ranking, candidate scoring and validation rules are
unchanged by this reporting work. Prompt golden hashes bind the new prompt text;
retained run bytes are not rewritten.

## Reproduce an audit or report a new run

```sh
export TMPDIR=/home/saithat/Projects/run-tmp
node scripts/report-agent-benefit.mjs runs/core-10day --days 2-10
node scripts/report-agent-benefit.mjs runs/core-10day --days 2-10 --json
node scripts/report-agent-benefit.mjs runs/core-10day
node --test scripts/report-agent-benefit.test.mjs
```

The explicit days 2–10 cohort reproduces the retained audit: action savings
10.7/8.2/5.6/6.3/1.9%, action gap capture 14/11/8/9/2%, time gap capture
8/8/2/2/2%, and 18 deployments, 9 validation refusals, 8 no-change decisions,
5 declined release features and 5 migrations. Seven additional P1 failures
remain visible. Five rejected proposals save zero net actions; four have all
count/time savings zero, while P2 night 7 exchanges one click for one scroll.

For any complete run directory, omit `--days` to use blind even days when its
manifest declares a measurement protocol, or all recorded days otherwise.
`--days 2,4,6` and inclusive ranges select an explicit alternative cohort. Night
outcomes always cover all recorded decisions, independently of the chosen day
cohort. The script reads records only and prints Markdown or JSON to stdout;
missing required day/control files fail explicitly. The test checks the audit's
rounded tables plus exact P4 action totals and P1 failure scope. No new recording,
model call, certificate rebinding or browser audit is performed by the reporter.
