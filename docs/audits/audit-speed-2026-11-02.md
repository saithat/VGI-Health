# Screen audit execution, 2026-11-02–03

Branch `lane/audit-speed`. `1305383c` merges main `61d96666` after the initial
orchestration commits `7d7cd2a3` and `16fc078a`. Own edits remain in the two audit
scripts, helper modules, tests and documentation. Renderer, Lean, WASM and UI
assertion changes were imported from main; none was authored for audit speed.

The rebuilt certified app hash is
`78be0fe61fa181a1ce2d43635d4d69061f082ff89d007b050d9857399592f4b7`, matching main.
It changed from the lane's pre-merge
`db816b1831ed94c4e0eacafc79060c6457ad588614a1dfe5b500b1a9cbf105a8` through that
merge. Historical certificates were not rebound. Physical measurement context:
`6e1d76cc406ce780e527831324b3fc8fb0b753a700aa251efb74c14e2deca1ae`.

## Execution contract

Full policy audits and standalone UI screen checks take the Linux `flock` at
`$TMPDIR/vgi-browser-heavy.lock`. Owner metadata contains PID, command, start
time and an inherited random token. The inode is retained; kernel release makes
dead-owner metadata harmless, including across PID namespaces. Nested checks
verify the token and active kernel lock. `EHR_BROWSER_LOCK=off` opts out;
`EHR_BROWSER_LOCK_PATH` overrides the path. Export-only audits do not lock.
The existing private `screens-*/gate-result.json` agent protocol remains exempt;
`agent/src/screencheck.ts` and its worker selection are unchanged.

The measured default is six workers, with a hard owner ceiling of six.
`EHR_SCREEN_WORKERS` selects a target and `EHR_SCREEN_MAX_WORKERS` can lower the
maximum. Linux `MemAvailable` and an 8 GiB planning budget further bound the
count: 2 GiB reserved for controllers/Vite plus 500 MiB per worker. Measurement
runs additionally monitored all descendants, including Chromium's separate
process groups, at one-second intervals. RSS sums shared pages repeatedly; PSS
charges them proportionally. The guard stops this lane's child groups at 7.5 GB
PSS, leaving headroom below the owner's 8 GB physical-memory cap.

Only timeout/crash-only batches without assertions or physical findings retry.
Exact failed project/title pairs run at half and then one quarter of the initial
workers, rounded down with a minimum of one, at most twice. Successful results
are retained; partial timed-out attempts cannot supply physical measurements.
Missing reports, omitted retry targets and exhausted retries remain `error`.
Both reports record each retry's batch, selected tests/projects, attempt and
workers. Assertions, test timeouts and policy thresholds are unchanged.

Dedupe binds exact tree bytes, presentation bundle and measurement context;
synthetic geometry probes remain distinct from clinical states. Physical
measurements/findings expand to every supplied filename in input order. The
canonical audit retains its original hash representatives and `exports.json`
mapping. Full audits disable whole-tree pass receipts, so all supplied trees
retain physical coverage. Independent regression controls run once per
invocation; each representative gets desktop/narrow fidelity and the full
physical matrix in sequential 64-tree batches.

Physical samples default to the shared content-addressed directory
`$TMPDIR/vgi-screen-check-cache/physical/<context>/<sample>.json`.
`EHR_PHYSICAL_SAMPLE_CACHE=0` disables reads/writes; `EHR_SCREEN_DEDUPE=0` disables
run dedupe. Existing schema validation and atomic rename publication in
`ui-check.spec.ts` are retained. No UI-check plumbing or assertion was edited by
this lane. The sample context now also hashes main's extracted
`e2e/physical-policy.ts`; changes to that collector cannot reuse old samples.

## Measurement conditions and sweep

Commands use `TMPDIR=/home/saithat/Projects/run-tmp`. One heavy job held the lock;
all phases ran sequentially. No non-exempt audit overlap was recorded in the
accepted runs. Up to one exempt one-worker nightly check remained active; these
were low-load locked measurements, not a claim that every other browser process
was absent. PID-level overlap events are retained in the accepted metrics.

The same frozen 256-state subset is evenly spaced across the template audit's
1,826 original representatives. Dedupe, physical sample cache and whole-tree
receipts are disabled for every sweep entry. Both fidelity projects, all nine
physical samples per state and independent controls run. Wall time includes
preview/controller startup and report writing. The subset content digest is
recorded in `subset.json` under the artifact directory below.

| Workers | Wall time | States/min | Timeouts | Test retries | Peak RSS MiB | Peak PSS MiB |
|---:|---:|---:|---:|---:|---:|---:|
| 3 | 6m 51.124s | 37.36 | 0 | 0 | 3,960 | 2,369 |
| 4 | 5m 17.902s | 48.32 | 0 | 0 | 4,940 | 2,841 |
| 6 | 3m 45.180s | 68.21 | 0 | 0 | 6,852 | 3,825 |

All entries pass 256 states / 2,304 measurements with zero findings. Selection
uses the fastest successful setting, preferring fewer workers within 5% of the
best throughput. Six is well outside that tie range and fits the memory budget;
workers above six were not launched and remain disabled pending owner approval.

## Full audit pair

| Audit | Exported files | Distinct trees | Ratio | Reported measurements | Wall time | Findings | Retries |
|---|---:|---:|---:|---:|---:|---:|---:|
| Templates | 4,813 | 1,826 | 37.94% | 16,434 | 26m 23.025s | 0 | 0 |
| Personas | 3,619 | 1,296 | 35.81% | 11,664 | 15m 28.834s | 0 | 0 |

The accepted template run starts with an empty default cache context, documented
in `cache-start-verified.json`. Only this lane's newly created context from the
excluded timing trial was cleared; other cache contexts were untouched.
The persona run follows it and can reuse 443 exact template tree hashes while
still running fidelity and reporting every state. Passing whole-tree receipts
are disabled in both full audits.

Against the owner's historical 47-minute template reference at three workers,
the cold six-worker template run saves **about 20m 37s**, **43.9%** of wall time
(**1.78×** throughput). That reference used an earlier build/load; this is an
observed end-to-end comparison, not an isolated attribution of every second to
one code change. The two full audit command times sum to **41m 52s**.

Accepted full-run peak RSS/PSS: templates **7,322/4,148 MiB**, personas
**7,094/4,060 MiB**. Neither memory guard fired. Both reports contain `retries: []`;
no timeout, assertion or physical finding was hidden through retry.

## Exact equivalence

V1 includes both template patients and the seven urgency-workflow exports.
The persona set is P5/v1. References are cold with sample cache, run dedupe and
whole-tree receipts disabled. Optimized runs use dedupe and the shared warm
sample cache from the full pair; whole-tree receipts remain disabled.

| Set | Files reported by both | Distinct trees | Ratio | Measurements in both | Cold reference | Optimized | Physical arrays / coverage |
|---|---:|---:|---:|---:|---:|---:|---|
| V1 templates + urgency | 1,609 | 1,248 | 77.56% | 14,481 | 21m 46.946s | 6m 44.847s | Identical |
| P5/v1 | 412 | 316 | 76.70% | 3,708 | 6m 21.716s | 1m 52.769s | Identical |

The combined dedupe/warm-cache path saves 15m 02s (69.0%) for the v1 set and
4m 29s (70.5%) for P5. These comparisons use the same six workers and the same
input files. They measure the combined optimization, including warm sample
reuse, rather than attributing savings separately to dedupe and caching.

The complete per-state physical arrays are **byte-identical**, including every
original filename, viewport/text-size/phase, count and finding. Timing and batch
scheduling fields are execution metadata. `policyStatus`, `expectedStates`, total
measurement count and total findings also match. Both paths pass semantic
fidelity in both projects. Digests of the captured physical JSON arrays:

| Set | Reference SHA-256 = optimized SHA-256 |
|---|---|
| V1 | `524e4ac3e4ef6e171599f380e3085a41a2f918141dcb00d11929580fad7bbb6c` |
| P5 | `59eec7d9aac812b6fb7ba86fbc18fa1757bc211f277fe7f8595d2dc1c31ab087` |

A separate exact comparison of viewport, component centers/reveal points,
scroll chains/offsets and scrollers also matches across all 1,609 / 412 geometry
frames. Source screen/state IDs are provenance and excluded from that secondary
geometry-value comparison. The frozen 256-state subset is unchanged at the end;
its content digest (compact JSON array of input SHA-256s) is
`969584028a782a948a640cb8e30ab41dfd7486c940678f20f64e516432d479f7`.

The shared context contains **24,111 complete sample files**, matching the union
of 2,679 distinct template/persona trees × nine samples; no partial `.tmp` files
remain. Every sample parses with finite numeric counts and a findings array.
The context digest and current app, UI test, extracted collector and policy
bindings all validate after the final app build. No passing receipt was taken
from a different measurement context.

All three accepted sweep entries and all six accepted full/reference/optimized
phases have zero findings, timeouts and test retries. Every accepted report's
`retries` array is empty; no retry event is omitted from this record.

## Excluded measurement attempts

All evidence is preserved; these attempts are not used for the accepted timing
comparison or memory table:

- The initial 3/4/6 sweep passed all tests, but its RSS monitor counted only the
  controller group and omitted Chromium's detached groups. The complete sweep
  above repeats it with all-descendant RSS/PSS accounting.
- An initial full template audit passed all 1,826 states / 16,434 measurements
  with zero findings and no test retries in 26m 17.316s. Its harness reported an
  unattributed overlap flag, so its timing was excluded. The detector was fixed
  to classify actual primary scripts, distinguish controller-free nightly
  handoffs and record conflicting PIDs/commands. The accepted cold repeat above
  reports no non-exempt overlap.

These are measurement-harness repetitions, separately retained from the
Playwright timeout retry records. No assertion failure was retried.

## Verification and artifacts

Rebuilt merged Lean: `lake build` (453 jobs) and `lake build exotic-api`
(184 jobs), sequentially with `LEAN_NUM_THREADS=2`. The inherited axiom audit
requests 97 distinct declarations and reports only `propext`, `Classical.choice`
and `Quot.sound` (or none). Protected Lean files, renderer source and
`ui-check.spec.ts` match incoming main byte for byte.

The seven focused lock/execution tests pass, covering reentrancy, contention,
stale metadata, killed owners, opt-out, timeout/assertion classification, exact
retry selection, exhaustion, dedupe mapping and memory/owner bounds. Final app
lint, typecheck and build pass. The full unit suite passes **303 tests**, with
**28 existing skips** (39 passing files, four skipped); this lane adds no skips.
`make wasm-check` passes with Lean source binding
`629fa342ded40d2f6aa7a27026601e236461ce65d5ff3663189a4716b4e87db6`.
The final rebuilt app retains the main app hash above.

Accepted raw evidence:
`/home/saithat/Projects/run-tmp/auditspeed-main61d96666/`.
This contains `metrics.json`, `verification-metrics.json`, the frozen subset,
per-phase logs and the full audit `exports.json`, `physical.json`, `result.json`.
Initial sweep evidence is under `sweep-initial-controller-only/`; excluded full
results remain in `full-templates/` with `verification-metrics-initial-overlap.json`.
The accepted full template destination is `full-templates-verified/`.

```sh
export TMPDIR=/home/saithat/Projects/run-tmp
# Guarded harnesses use structured argv and run one browser job at a time.
node "$TMPDIR/auditspeed-benchmark.mjs"
node "$TMPDIR/auditspeed-verification.mjs"
```

Exact completed commands (all exit 0 unless explicitly classified as an excluded
measurement attempt above):

```sh
export TMPDIR=/home/saithat/Projects/run-tmp
# Merge commit 1305383c; actual commit message includes the required co-author.
git merge main -m "Merge main 61d96666 into lane/audit-speed" \
  -m "Co-Authored-By: Codex <noreply@openai.com>"
pnpm --filter app build
(cd lean && LEAN_NUM_THREADS=2 lake build)
(cd lean && LEAN_NUM_THREADS=2 lake build exotic-api)
(cd lean && LEAN_NUM_THREADS=2 lake env lean \
  "$TMPDIR/promote-merge-rescue-20261102/runs/promote-merge-v5/axioms.lean")
node scripts/audit-alert-policy.mjs "$TMPDIR/auditspeed-export-templates" --export-only
node scripts/audit-alert-policy.mjs "$TMPDIR/auditspeed-export-personas" --personas --export-only
node "$TMPDIR/auditspeed-benchmark.mjs"
node "$TMPDIR/auditspeed-verification.mjs"
pnpm --filter app lint
pnpm --filter app exec tsc --noEmit
pnpm --filter app test --maxWorkers=2
pnpm --filter app test --maxWorkers=2 tests/audit-execution.test.js tests/browser-heavy-lock.test.js
pnpm --filter app build
make wasm-check
```

The verification harness invokes these full audits with the worker override
unset, the default shared cache, enforced physical policy and inherited lock:

```sh
node scripts/audit-alert-policy.mjs "$TMPDIR/auditspeed-main61d96666/full-templates-verified"
node scripts/audit-alert-policy.mjs "$TMPDIR/auditspeed-main61d96666/full-personas" --personas
```

For the equivalence calls it supplies the saved `v1-templates-inputs.json` and
`v1-P5-inputs.json` arrays as structured argv to `screen-check.mjs --ui`.
References set `EHR_SCREEN_CACHE=0 EHR_SCREEN_DEDUPE=0 EHR_PHYSICAL_SAMPLE_CACHE=0`;
optimized calls retain `EHR_SCREEN_CACHE=0` and use the default dedupe/sample cache.
The scratch harnesses are preserved measurement evidence; the verification
harness includes the one-time owned-cache reset described above.

Additional retained checks: `geometry-equivalence.json`, `cache-validation.json`
and `context-validation.json`. Each reports success. Final `git diff --check`
passes; the worktree's protected Lean, renderer, UI assertions, policy and
certified build inputs match main byte for byte.

## Remaining scope and owner questions

Workers 8/10/12 remain unmeasured and disabled under the explicit six-worker
owner limit. The unrelated full browser/live integration suite was not rerun;
this change runs the complete requested exported-state matrix and controls.
No browser-calibration or equivalence item remains pending. No blocking owner
question remains for this six-worker task.

No push, deployment, certificate rebinding or data staging is authorized or
performed. `CLAUDE.md` remains absent from this worktree.
