# Screen audit execution, 2026-11-02

Branch `lane/audit-speed`, baseline `11354642`. Scope: audit orchestration,
helpers, tests and documentation. No Lean, renderer, assertion or policy change.
`ui-check.spec.ts` is unchanged, including its cache publication plumbing.

## Execution contract

Full audits and standalone UI screen checks take the shared Linux `flock` at
`$TMPDIR/vgi-browser-heavy.lock`. An owner record contains PID, command, start
time and a random inherited token. The lock inode is never replaced or removed;
kernel release on process death makes stale PID metadata harmless, including
across PID namespaces. Nested audit checks verify the inherited token against
the owner record and active kernel lock. `EHR_BROWSER_LOCK=off` opts out;
`EHR_BROWSER_LOCK_PATH` changes the lock location. Export-only audits do not
lock. The existing agent's private `screens-*/gate-result.json` convention is
exempt; `agent/src/screencheck.ts` is unchanged.

Retry selection uses final Playwright results keyed by project and exact test
title. Only a timeout/crash-only batch without physical findings qualifies.
Assertion evidence takes precedence even when an assertion mentions a timeout.
Attempts use half and one quarter of the original workers, rounded down with a
minimum of one. Successful tests are retained; partial timed-out results never
supply physical measurements. A missing retry report or omitted selected test
fails closed. Both reports contain `retries` with batch, tests, attempt and
workers. Retries do not alter assertions or timeouts.

Dedupe binds exact tree bytes, measurement context and presentation bundle.
Synthetic geometry probes are separated from clinical states. The runner expands
physical results to every supplied filename, in input order. The audit retains
its existing hash representatives and `exports.json` mapping. The physical
sample default is shared across worktrees at
`$TMPDIR/vgi-screen-check-cache/physical/<context>/<sample>.json`. Existing
schema validation and atomic rename publication in `ui-check.spec.ts` remain
unchanged. `EHR_SCREEN_DEDUPE=0` and `EHR_PHYSICAL_SAMPLE_CACHE=0` provide the
reference execution. Full audits continue disabling whole-tree pass receipts.

## Verification record

Local commands use `TMPDIR=/home/saithat/Projects/run-tmp`.

- `pnpm --filter app lint`: passed.
- `pnpm --filter app exec tsc --noEmit`: passed.
- `pnpm --filter app build`: passed. Certified app SHA-256 remained
  `db816b1831ed94c4e0eacafc79060c6457ad588614a1dfe5b500b1a9cbf105a8`.
- Focused lock/execution unit tests: 7 passed, covering reentrancy, contention,
  stale metadata, killed owners, opt-out, timeout/assertion classification,
  exact retry selection, exhaustion, mapping and memory bounds.
- Full app tests: initially blocked by absent ignored `core-10day-live` data.
  Copied the existing recording into this worktree; no data was staged.
  Final run passed 300 tests, with 28 skipped (38 passing files, four skipped).

`CLAUDE.md` was absent from this worktree and its primary checkout. README.md
and the owner's supplied rules were read; no Lean files were changed.

## Measurement protocol

The host PID namespace is inspected with `pgrep` before measurement. The
benchmark acquires the shared lock, then waits for legacy checks that do not yet
participate in that lock. An asynchronous process-group monitor samples RSS
every three seconds, flags overlap with other audit/screen processes, and stops
this lane's job if its measured RSS exceeds 8 GiB. No other lane is stopped.

A frozen 256-state subset is evenly spaced over the template audit's existing
1,826 representative paths. Every sweep uses identical inputs at 3, 6, 8, 10 and
12 workers with physical sample cache and dedupe disabled, whole-tree receipts
disabled, unchanged assertions, both fidelity projects, the complete physical
matrix and the independent controls. Wall time includes controller/preview
startup and report serialization. Artifacts are under
`/home/saithat/Projects/run-tmp/auditspeed-measurements/`.

Measured results and the selected default are pending the quiet window; no
throughput or equivalence result is claimed yet. The provisional target remains
three workers, matching the owner’s current operating setting. The queued sweep
is additionally guarded before exceeding six workers: the ground rule caps
Playwright at six, while the task requests measurements at eight, ten and
twelve. The owner has been asked which limit applies.

Native export inventory:

| Set | Exported files | Distinct tree bytes | Ratio |
|---|---:|---:|---:|
| All templates, including urgency probes | 4,813 | 1,826 | 37.94% |
| All personas, including urgency probes | 3,619 | 1,296 | 35.81% |

The owner's pre-change template reference is 47 minutes at three workers on the
previously shared machine. It is a historical reference, separate from the
quiet-machine measurements.
