# Learnability and incomplete-task validation

[Overview](../../README.md) · [Discovery and cadence](discovery-and-cadence.md) · [Metric gaming](../design/metric-gaming.md)

**Policy change: R2 is now a release gate.** These are simulated-clinician
acceptance rules, with uncalibrated learning and cost parameters. They do not
establish human learnability or clinical performance. No Lean statements,
geometry rules or certified clinical app sources change.

## Train and validation split

On each odd calibration day, tasks at zero-based positions 0, 3, 6, … form the
validation partition. All remaining tasks form the proposal-training partition.
This deterministic split is unchanged. Every validation-eligible task from
**every past odd day** now participates at each night; even days remain blind
measurement and never enter proposals or validation. Training estimates still
use the latest two train partitions; prompts may see all past train partitions.
Validation aggregates, traces and rehearsal memory never feed the proposal prompt.

Schedules retain their dates, cases, choices, ordering and independent validation
seed namespace. Each partition is simulated as a separate dated workload; metrics
are summed across partitions. The release effect floor uses the exact aggregate
click-plus-scroll difference divided by the number of calibration days, before
subtracting daily switch cost. Rounded display savings cannot satisfy the floor.

For the retained 10-day world (`runs/world/2`), tasks per persona and night are:

| Night | P1 | P2 | P3 | P4 | P5 | Total |
|---|---:|---:|---:|---:|---:|---:|
| 1 | 14 | 8 | 13 | 8 | 6 | 49 |
| 2 | 14 | 8 | 13 | 8 | 6 | 49 |
| 3 | 26 | 14 | 28 | 15 | 13 | 96 |
| 4 | 26 | 14 | 28 | 15 | 13 | 96 |
| 5 | 34 | 21 | 41 | 22 | 19 | 137 |
| 6 | 34 | 21 | 41 | 22 | 19 | 137 |
| 7 | 48 | 27 | 59 | 28 | 24 | 186 |
| 8 | 48 | 27 | 59 | 28 | 24 | 186 |
| 9 | 61 | 31 | 74 | 32 | 28 | 226 |

There is no release night after the final day. New worlds may have different
sizes. `validation.replay.days` and `taskCounts` retain the actual sample in each
decision; the manifest identifies measurement protocol version 2.

## Bounded replay and memory

The normal shift policy may remain expert. Independently, all runs simulate each
odd **train partition** with `policy: bounded`, starting from the preceding train
checkpoint. These snapshots live under `bounded-training/day-N/Px.json`; resume
loads them in chronological order. The stream never consumes a full calibration
shift, validation partition or blind even shift. Single-night and frozen readers
reconstruct the same bounded stream from original train layouts when needed.

Validation replays both baseline and candidate with explicit expert policy, and
again with bounded policy. Each bounded arm and each dated validation schedule
starts from an independent clone of the same latest carried train snapshot.
Rehearsal output is discarded, including memory; no candidate gets extra practice.
The paired seed and clinical tasks are identical. Missing bounded support,
foreign memory or substituted/omitted task identities fails closed.

Both expert and bounded candidates must complete every scheduled task. R2 permits
at most 2% increase in bounded clicks, scrolls, keystrokes and `klmDeciSec`, with
no absolute rounding allowance. The bounded learner's replay is noisier than the
expert's, so single-action changes do not refuse a release; the expert replay keeps
R1's zero click/scroll tolerance. Zero baselines
permit zero cost; nonfinite metrics refuse. R2 requires no strict bounded saving
and imposes no additional pixel constraint. Expert R1's pixel/count/time rules
and strict physical improvement still govern discretionary releases.

`validation.replay.bounded` records before/after costs, daily savings, memory
SHA-256, train-only provenance, acceptance and refusal reasons. The enclosing
replay records dated sizes and scoring policy. These fields survive decision
schema parsing and storage. The same gate applies to ordinary nights, cadence
bundles, optional feature surfacing and mandatory recertification/migration,
including canonical fallbacks. Mandatory paths retain their expert completion-only
exception to discretionary improvement; they do not bypass R2. Initial day-1
bootstrap has no prior training or validation and retains its certification path.

## Incomplete-task cost

`RunOptions.incompletePenalty` and `run-days --incomplete-penalty` set a positive,
finite fraction, default **0.5**. An incomplete task costs **150% of its matched
canonical task's cost**, in each compared arm independently. Charged costs round
up per task and metric. This applies to clicks, scrolls, typing, modeled time and
the other recorded effort measures; unavailable pixels remain unavailable.
Completed tasks retain their actual costs even if the opposite arm failed.
Completion counts remain actual; penalization never converts failure into success.

The train release estimator and validation comparisons both use this policy.
The canonical is the active release's persona-specific program, simulated on the
same dated schedule, seed and policy (with the same train snapshot for bounded
validation). If the canonical also fails the task, the charge is the larger of the
two partial costs plus the penalty, so the score never falls below either arm and
the night does not abort. The configured
penalty is manifest-bound and resume refuses a change; each validation replay
also records it. Historical descriptive reports using common completed tasks
remain labeled historical and are not release scores.

Failed train tasks appear first in the agent's evidence, with day, task ID,
workflow completion goal, task-specific simulator complaints and blocked guard
reasons. The simulator does not export a per-field residual goal state; the list
therefore identifies the unmet workflow goal and available diagnostics without
claiming every requested field remains unmet. This is the only prompt change in
this implementation; both 35-context prompt-hash fixture sets are refreshed.

## Retained recording replay

`agent/src/replay-r2-gate.ts` independently evaluates each shipped decision using
frozen certified layouts/specs, retained Chromium atlases, reconstructed train-only
bounded memory and the recording's simulation modes. It uses the relocated world
named by the manifest, not the seed as a directory name. The 17 nonshipping
decisions are inventoried without inventing a deployed candidate. It makes no
model calls, deploys nothing and issues no certificates. Checkpoints and detailed
metrics are written to a separate scratch directory; the recording is read-only.
This is a set of independent counterfactuals, not an alternate history propagated
from the first refusal. It does not reconstruct the structural train effect floor.

```sh
export TMPDIR=/home/saithat/Projects/run-tmp LEAN_NUM_THREADS=4 EHR_SCREEN_WORKERS=2
node --max-old-space-size=4096 --import ./agent/node_modules/tsx/dist/loader.mjs agent/src/replay-r2-gate.ts \
  runs/core-10day "$TMPDIR/r2-retained-replay-world2"
```

The CLI starts one fresh process per shipped decision and reuses existing dated
train and decision checkpoints. A final `--summary` argument rebuilds only the
report; `night-06/P2` selects one shipped decision. New native calls have a 7 GiB
address-space cap and a two-minute timeout, with infrastructure retries disabled
by default for this offline replay. Resource failures are unavailable evidence,
never passes. Node's heap cap alone does not constrain the native solver.

All 45 decisions are inventoried, including **28 shipped releases** and 17
nonshipping decisions. Of the shipped releases, **2 have measured R2 refusals**
and 1 more is refused by the expert gate, 9 pass the reconstructed validation
gates, 14 pass R2 but lack sufficient frozen expert pixel evidence for a full
verdict, and 2 are unavailable under the solver limits. Missing evidence is never counted as a pass. Historical certificates and
recorded outcome files are unchanged.

| Night | P1 | P2 | P3 | P4 | P5 |
|---|---|---|---|---|---|
| 1 | Refuse | Partial | Refuse | Partial | Partial |
| 2 | Partial | Partial | — | Partial | — |
| 3 | Pass | Pass | Pass | Pass | Pass |
| 4 | Partial | Refuse (expert scrolls) | — | — | — |
| 5 | — | Partial | — | Partial | — |
| 6 | Pass | Unavailable | Pass | Pass | Pass |
| 7 | — | — | — | Partial | — |
| 8 | — | — | — | Partial | Partial |
| 9 | — | Unavailable | Partial | Partial | — |

“Pass” covers the applicable expert and bounded validation gates, not a complete
new release decision: the structural train effect floor is not reconstructed.
“Partial” means R2 passes but frozen expert pixel metrics are unavailable; it is
inconclusive, not approval. “—” means no shipped release. These remain independent
comparisons against recorded layouts and memory histories, even after an earlier
release would have been refused.

The measured bounded regressions are:

| Shipped decision | Bounded cost before → after | Verdict at 2% bounded tolerance |
|---|---|---|
| Night 1, P1 | Clicks 430 → 825; scrolls 557 → 1,348; keystrokes 1,700 → 2,511; `klmDeciSec` 33,263 → 73,665 | R2 refuses: all four bounds |
| Night 1, P3 | Clicks 186 → 195 (+4.8%) | R2 refuses: clicks |
| Night 1, P4 | Clicks 286 → 289 (+1.0%) | Within tolerance |
| Night 2, P4 | Clicks 289 → 291 (+0.7%) | Within tolerance |
| Night 4, P2 | Scrolls 3,870 → 3,871 | Within tolerance; refused by the expert gate (scrolls 2,010 → 2,013) |

Under a zero bounded click/scroll tolerance, all five would be refused. All are
discretionary nightly releases. The five night-3 vendor updates
pass; four night-6 migrations pass. P2's night-6 canonical bounded comparison
times out at two minutes. P2's night-9 replay cannot reconstruct the required
day-7 train memory within the same limit, so no gate verdict is asserted.
This is simulated-model evidence, not evidence of human difficulty.

The complete output is `$TMPDIR/r2-retained-replay-world2/report.json`, with
per-decision aggregates, dated sizes, memory hashes and refusal reasons.
Its decision-tree SHA-256 is
`df2a8fd2f478ccf4fcaf969ea39583d20086764f29f7351eedbdc017e5b7c5ce`;
native SHA-256 is
`d1d4b75732fc4f5f74a3c5b19bf7e391bc8c1d90970fed31ac0bdf8ae551849e`.
The report also fingerprints the world, programs and certification inputs.
The two resumed sequential batches report maximum process RSS of 4,446,980 and
4,632,996 KiB (about 4.24 and 4.42 GiB) via `/usr/bin/time -v`; no browser is started.
The first batch stopped on the day-7 P2 train timeout; the checkpointed
continuation completed the matrix and recorded that decision as unavailable.
A final summary-only invocation succeeds with all 28 checkpoints and recomputes
no simulations. The 9-night sample sizes match the table above.

## Targeted verification

The targeted tests cover canonical penalties in both arms and the live estimator,
all four R2 metrics and full completion, unavailable bounded output, task identity,
pooled sizes and train/holdout disjointness, memory cloning, failed-task prompt
ordering, live nightly refusal, mandatory release fallback and resume binding.
Existing cadence, release-mode, safety and frozen-prompt regressions also run.
The full browser audit pair is deferred until integration as requested; no
browser-facing or Lean code changes require a new certified app build here.

With disk-backed `TMPDIR` as above, these commands passed (run test/lint commands
from `agent/`; the typecheck command runs from the repository root):

```sh
node agent/node_modules/typescript/bin/tsc --noEmit -p agent/tsconfig.json
node node_modules/eslint/bin/eslint.js . --max-warnings 0
node node_modules/vitest/vitest.mjs run test/r2-gate.test.ts test/cadence.test.ts test/modes.test.ts test/safety.test.ts test/bounded-tailoring.test.ts test/structure.test.ts --maxWorkers=2
node node_modules/vitest/vitest.mjs run test/quality-golden.test.ts test/quality.test.ts test/night.test.ts test/review-safety.test.ts --maxWorkers=2
node node_modules/vitest/vitest.mjs run test/replay-r2-gate.test.ts test/replay-interaction-gate.test.ts --maxWorkers=2
```

The three test invocations pass 55, 50 and 6 tests respectively; there is no
`test/safety.test.ts` file, so the first invocation selects five existing files.
The direct installed binaries avoid pnpm's attempted dependency-store refresh,
which failed here with `unable to open database file`; no dependency install or
lockfile change was needed. A two-day, one-persona synthetic smoke under
`runs/smoke-r2-20261114` deployed night 1 through R2 (3/3 validation tasks complete,
bounded accepted, penalty 0.5). It uses the fake checker/geometry and scripted
model, certifies nothing and makes no model calls; the targeted bounded-tailoring
tests separately exercise the native bounded clinician.

The smoke command, from the repository root, was:

```sh
TMPDIR=/home/saithat/Projects/run-tmp NODE_ENV=test node --max-old-space-size=4096 --import ./agent/node_modules/tsx/dist/loader.mjs --input-type=module <<'JS'
import { runDays } from './agent/src/run.ts';
import { fakeWorld, markingEhr } from './agent/test/helpers.ts';
import { ScriptedLlm } from './agent/test/scripted.ts';
import { RunStore } from './agent/src/store.ts';
const summary=await runDays({days:2,worldDir:await fakeWorld(2),runsRoot:'runs',runId:'smoke-r2-20261114',personas:['P1'],releaseDays:{v2:99,v3:99},ehr:markingEhr(),llm:new ScriptedLlm(),structurePolicy:false});
const r=await new RunStore(summary.dir).readDecision(1,'P1');
console.log(JSON.stringify({dir:summary.dir,outcome:r.outcome,bounded:r.validation.replay?.bounded?.accepted,tasks:r.validation.replay?.after.tasks,days:r.validation.replay?.days,scoring:r.validation.replay?.scoring}));
if(!r.deployed||!r.validation.replay?.bounded?.accepted)throw Error('Smoke did not deploy through R2');
JS
```
