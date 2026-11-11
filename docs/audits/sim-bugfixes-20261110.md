# Simulator review fixes — 2026-11-10

Base: `1d372721`, branch `lane/sim-bugfixes`. All four findings reproduce.
The changes are confined to simulator/CLI code, regressions and methods.
No theorem statement or proof changed; protected clinical sources, app, WASM,
services, release JSON and the certified app hash inputs are unchanged.

## Corrections and sibling search

1. `Cli.Sim.loadClinical` resolves `sourceDates` by `task.day`. A native
   regression uses a two-day weekend horizon with distinct weights, checks
   selected-day MAR columns, and runs `ehr simulate` to check the second day's
   entered weight. The task-local historical fallback date is also checked.
   The neighboring `contextPath` use of `schedule.day` is correct: it selects
   the shared directory's initial context file. The `directoryContext.today`
   use is also correct for that schedule-origin snapshot, paired with `now=0`.
   Neither is the per-task clinical context. The source-date lookup search
   found no other incorrect task-date lookup.
2. Planned W2 documentation preserves the choices record, clearing only
   acknowledgment and orders already assigned to the clinical episode. This
   retains supplied text, authoring metadata and other documentation inputs.
   Both policies now enter a supplied 2,000-character HPI while charging its
   100 copied edits and 100 seconds of reading. The kernel guards also check
   exact text/metadata retention. Other W4/W5 episode splits already use
   record updates and preserve these fields; no sibling reconstruction needed
   correction.
3. `minSchedule` uses `taskEpisodes`, as simulation and information minima
   already do. The native regression checks acknowledgment-plus-note and
   note-only plans, both click/keystroke episode lists, a signed note path,
   and refusal of a foreign workflow owner. A sibling regression checks a
   focused refill. `CompletionBench` still calls `episodes` appropriately:
   it constructs synthetic workflow/choice scenarios, without a `Task`, plan
   or task-resource resolution. Workload capability checking already shares
   `taskEpisodes`.
4. Both expert and bounded timing paths pass the workflow response-tail length
   to the shared overtime annotation. It subtracts only the tail's overlap
   with time after shift end. Wall finish, passive time and subsequent
   dispatch remain unchanged; active phase overrun remains overtime. Guards
   exercise shift end before, at, inside and after the tail under both policies.
   The sibling combined test retains active communication overtime when both
   interruption closure idle and workflow response idle occur. The remaining
   raw overtime calculation is the common wall-time constructor; its policy
   callers now both apply the passive exclusions. Aggregate reporting only
   sums those corrected rows.

**Pre-wave-3 `min-clicks` output can change.** Older W2 tasks without a plan
retain their old acknowledgment/order episodes. Older W7 approvals with empty
`choices.orders` and a valid contained prescription now resolve that prescription
and search its real approval/signing goals, replacing a zero-cost empty exact
certificate. Missing/ambiguous refill context and other task inputs rejected by
`taskEpisodes` now produce minimum-search errors instead of misleading exact
certificates. These are diagnostic minimum changes, not simulation or strict
trajectory replay changes. Source-date corrections require a horizon; note
corrections require planned inbox documentation; overtime corrections require
a workflow response wait.

## Verification

Environment for all commands:

```sh
export TMPDIR=/home/saithat/Projects/run-tmp CI=true LEAN_NUM_THREADS=6
```

The pre-fix executable was preserved locally as `$TMPDIR/simfix-before-ehr`
before the changed sources were linked. It is not a tracked artifact.

| Command | Result |
|---|---|
| `cd lean && lake env lean Ehr/Sim/Workflow/Tests.lean` before the fix | Expected failure: supplied HPI text and metadata guards both false. |
| `cd lean && lake env lean Ehr/Sim/Scheduling/Wave3Tests.lean` before the fix | Expected failure: passive response overlap counted as overtime. |
| `cd lean && EHR_BIN="$TMPDIR/simfix-before-ehr" lake env lean --run ../scripts/test-sim-cli.lean horizon` | Expected failure: native horizon did not enter day 2's weight. |
| `cd lean && lake env lean --run ../scripts/test-sim-cli.lean minimum` against the original executable | Expected failure: planned W2 exact minimum omitted documentation. |
| `cd lean && lake build` | Passed, 571 jobs; includes the existing default legacy/regression guards and the added note/wait guards. No `EhrHeavy` target. |
| `cd lean && EHR_CONTROL_BIN="$TMPDIR/simfix-before-ehr" lake env lean --run ../scripts/test-sim-cli.lean` | Passed all four groups: horizon/MAR/fallback, minima, note entry/effort/reading, legacy controls. Four complete W1/W2 expert/bounded legacy JSON outputs match the pre-fix executable byte-for-byte. |
| `bash scripts/audit-verification.sh` | Passed after final Lean changes: 84 theorems, no unexpected axioms. |
| `git diff --check` | Passed. |
| `CI=true pnpm --filter agent exec vitest run test/workflow-protocol.test.ts test/note-authoring.test.ts test/workload-capabilities.test.ts` | Not run: `agent/node_modules` is absent. No package installation attempted. |
| `node scripts/audit-alert-policy.mjs "$TMPDIR/simfix-audit-templates"` | Attempted once; stopped before browser work: missing `fixtures/synthea/index.json`. |
| `node scripts/audit-alert-policy.mjs "$TMPDIR/simfix-audit-personas" --personas` | Attempted once, sequentially after templates; same missing-fixture failure. `EHR_SCREEN_WORKERS=4` for both. |

The rebuilt modules' existing `#print axioms` checks report only permitted
axioms: `interruption_timing_preserves_finish` has none; `clock_partition` uses
`propext, Quot.sound`; `emit_blocks_unanswered` uses
`propext, Classical.choice, Quot.sound`. No proof escape was added.
Logs are `$TMPDIR/simfix-{lake-build-final,cli-final,audit-verification-final,audit-templates,audit-personas}.log`;
the failing kernel guards are in `simfix-{note,wait}-before.log`.

No frozen output change was observed in the available tests. Preserved library
snapshot regeneration and retained strict recording replay could not be run:
this lane has no worlds, fixtures or recordings and no JS dependencies. The
four byte comparisons above are synthetic controls, not archive replay evidence.
README contains no newly false descriptive sentence; its historical measured
numbers are deliberately unchanged, as requested. No push, other worktree or
branch modification, WASM rebuild, proof-map refresh, data commit, certificate
reissue or measurement refresh was performed. The merge session owns those
data-backed reruns and binding refreshes. Open owner questions: none.

## Measurements to refresh in the merge session

The following are historical values, not corrected measurements. Their source
artifacts are left untouched. Regenerate against the same frozen source inputs
before replacing any README/audit number; do not silently substitute a freshly
generated cohort.

### Simulator smoke and README smoke row

`README.md` quotes 158/158 completion, 12.58 minutes mean queue, and the
267.69-active-minute/56-scroll length increment. Its 1.73-minute comparator is
the unchanged older cohort. In `wave3-sim-20261109.md` and its JSON, recheck all
three wave-3 aggregates, including these recorded values:

| Metric | Day 2, legacy text | Day 2, length text | Seven-day horizon |
|---|---:|---:|---:|
| Completed / tasks | 158/158 | 158/158 | 940/943 |
| Started | 158 | 158 | 943 |
| Mean queue minutes | 10.18 | 12.58 | 34.77 |
| Overdue doses | 4 | 4 | 24 |
| Active overtime minutes | 5.04 | 10.33 | 64.98 |
| Active effort minutes | 715.43 | 983.12 | 5,999.04 |
| Native scrolls | 6,374 | 6,430 | 35,838 |
| Communication minutes | 90.30 | 90.30 | 498.6833 |
| Reorientation minutes | 2.6333 | 2.6217 | 13.215 |
| Reading minutes | 0 | 266.67 | 1,554.7717 |
| Clinical minutes | 757 | 757 | 4,919 |
| Unserved tasks | 0 | 0 | 0 |
| Accepted handovers | 5 | 5 | 18 |
| Coverage actors | 7 | 7 | 47 |

Recheck derived claims too: +267.69 active minutes (+37.42%), +56 scrolls,
+2.40 mean queue minutes, 266.67 reading minutes, matched-arm dose equality and
offered-arrival equality, and the explanation of the three incomplete P5 tasks.
Task denominators and exogenous source-world counts are fixed inputs; the table
lists them to preserve cohort identity, not to predict changed counts.

Exact regeneration command from the repository root with the environment above:

```sh
VGI_SOURCE_ROOT=/home/saithat/Projects/VGI-Health node scripts/wave3-sim-smoke.mjs
```

Prerequisites: restore the **existing** `runs/world/wave3-sim-smoke`, the retained
`runs/realism-wave2-real-work` and `runs/world/realism-wave2-seed-1` under
`VGI_SOURCE_ROOT`, plus the actual pre-wave-3 control executable at
`$TMPDIR/w3-audit-ehr` (the harness's fixed control path). This writes
`runs/wave3-sim-smoke/report.json`, with both daily arms and horizons. The original
source-world creation command, if a separate regeneration check is wanted, is
`pnpm --filter world gen --seed 1 --days 7 --out ../runs/world/wave3-sim-smoke --adt off --quiet`;
current generator defaults may differ from those of that historical cohort.

### Matched note-authoring follow-up

`wave3-followups-20261109.md` / `.json` and the copied table in
`methods/note-authoring.md` also predate these corrections. Their P1 planned W2
notes can change typing, activations, effort and queueing; refill response waits
can change P1 overtime even in the phrase arm. Recheck these P1 values:

| Metric | Phrases | Full | Template |
|---|---:|---:|---:|
| Completed / tasks | 708/708 | 708/708 | 708/708 |
| Keystrokes | 72,677 | 155,857 | 76,972 |
| Native scrolls | 13,446 | 13,453 | 13,453 |
| Clicks | 15,565 | 15,561 | 17,086 |
| KLM minutes | 6,198.5 | 6,690.9 | 6,449.6 |
| Total queue-delay minutes | 373,911.1 | 424,019.4 | 403,011.7 |
| Active overtime minutes | 58.1 | 61.9 | 48.9 |
| Overdue doses | 0 | 0 | 0 |

Also recheck the aggregate 1,947/1,947-complete and equal-full/template-scroll
claims. The other personas' daily source dates, note episode splitting and
zero-response-wait plans are unaffected by these fixes; retaining the full
five-role comparison checks that expectation. Scheduled section counts,
character origins and source-study coefficients are input data, not bug-affected
simulator measurements.

Exact remeasurement commands against the restored frozen comparison worlds:

```sh
node scripts/synthetic-hospital/check-world.mjs --world runs/world/w3follow-full \
  --baseline runs/world/w3follow-phrase --simulate --jobs 2
node scripts/synthetic-hospital/check-world.mjs --world runs/world/w3follow-template \
  --simulate --jobs 2
```

Run these sequentially; preserve the pre-presentation-fix directory inputs
identified in the follow-up audit. No frozen role-fit task declares a workflow
plan or multi-day horizon, so the fit/diagnosis timing tables are not affected.
The pre-wave-3 workload and historical data-only text comparisons likewise lack
the affected plans/horizons and remain historical controls. Browser state counts
and findings measure rendering, not these simulator clocks or episode minima.
No published exact-minimum numeric table was found that needs remeasurement;
existing `min-clicks` consumers should rerun their original commands where they
use planned W2 notes or focused W7 approvals.
