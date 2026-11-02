# Trajectory dashboard measurements

Measured 2026-11-02 against `runs/core-10day-live`: 1,284 tasks, five personas,
10 days, 11 incomplete tasks. Chromium 156.0.8078.4, viewport 1440×900,
localhost preview on port 5194, persona P1, one sequential page, no throttling.
Before is the lane's original code; after is the implementation in this commit.

The server was restarted before each recorded sweep, and the browser HTTP cache
was cleared before Evolution. The after sweep also started without derived
geometry slices. Later actions retain server, HTTP and application caches.
These are single sweeps on a shared machine, not percentiles or isolated CPU
benchmarks. The baseline overlapped a bounded unit-test run; wall times also
include server compression work. Earlier exploratory warm-server measurements
were discarded in favor of these recorded cold sweeps.

The script waits for the visible area or loaded replay frames, then allows a
fixed 500 ms settling window and two animation frames. That window is included
in every wall measurement. `mainThreadMs` is the Chromium renderer's CDP
`TaskDuration` delta (CPU time, including parsing/rendering; not Node server
CPU). `bytes` is CDP `Network.loadingFinished.encodedDataLength`, including
headers and compressed payloads. `decodedBodyBytes` sums CDP
`Network.dataReceived.dataLength`; HTTP cache reuse can still deliver decoded
bodies to a new iframe. A zero transfer is consequently different from zero
main-thread work.

The initial trajectory is `d01-P1-W2-021`; the next selected task is
`d01-P1-W2-022`. Compare resolves the same W2 day-1/day-10 pair in both sweeps
(right: `d10-P1-W2-018`). The new UI retains the single player's selection when
returning from Compare. Original code reset that selection on remount.

| Action | Wall ms before → after | Wire bytes before → after | Decoded body bytes before → after | Main-thread ms before → after |
|---|---:|---:|---:|---:|
| first Evolution | 6,982 → 1,404 | 432,310 → 515,140 | 6,940,226 → 6,940,900 | 289 → 240 |
| Evolution → Trajectories (default task) | 14,048 → 1,898 | 888,220 → 715,502 | 36,094,760 → 7,027,093 | 621 → 379 |
| open another trajectory | 1,866 → 966 | 41,180 → 74,462 | 2,440,259 → 2,404,457 | 450 → 392 |
| Trajectories → Compare (pair) | 12,583 → 1,384 | 389,172 → 209,542 | 39,285,014 → 5,379,821 | 866 → 545 |
| Compare → Releases | 566 → 568 | 0 → 0 | 0 → 0 | 17 → 17 |
| Releases → Compare | 1,099 → 580 | 6,006 → 0 | 5,478,280 → 0 | 541 → 49 |
| Compare → Trajectories | 799 → 566 | 3,135 → 0 | 3,592,021 → 0 | 244 → 39 |
| Trajectories → Evolution | 566 → 567 | 0 → 0 | 0 → 0 | 17 → 19 |

Raw request URLs and transfer sizes are in
[before](dashboard-performance.before.json) and
[after](dashboard-performance.after.json). The script also records script CPU
time and per-action request counts.

The largest costs were full-atlas parsing and quality-11 on-demand Brotli
compression. Per-task geometry slices and quality 4 remove those stalls.
First-trajectory decoded body volume falls by 80.5%; Compare falls by 86.3%.
Fresh Evolution transfers more bytes with the faster compression setting, and
opening a second task transfers a new small slice instead of reusing the entire
previous atlas. These are deliberate wire-size/latency tradeoffs. Returning to
Compare and Trajectories makes zero requests in the warm sweep; their main-thread
costs fall from 541/244 ms to 49/39 ms by keeping visited players mounted.

Both heavy views were already lazy-loaded. They stay lazy-loaded. Lists use
40-task pages instead of rendering all matches. JSON parse remains on the main
thread for the smaller responses; a worker was unnecessary for the measured
bottleneck. The server retains at most one validated atlas, while disk slices
are disposable and keyed by the source atlas/task file stamps. Slices preserve
all matching states, their order, scrollers and relevant target aliases;
program/components metadata is checked on the server and again by the client.
Existing build-binding verification remains in place and its mutable evidence
bypasses the query cache. Geometry remains optional for historical runs.

The no-agent arm is shown as recorded same-task outcomes in both replay views.
This run has no exported no-agent trajectory contexts in its index, so new
control replays were not synthesized or simulated. Incomplete tasks remain
inspectable but do not appear as Compare suggestions or generate savings.
Cross-day comparisons are workflow-matched, with both tasks completed; they do
not imply a causal agent estimate. Only saved same-task baselines can drive
paired replay.

To rerun, use separate terminals from the repository root:

```sh
export TMPDIR=/home/saithat/Projects/run-tmp
make run APP_PORT=5194
# In the second terminal, with TMPDIR set:
node app/scripts/dashboard-benchmark.mjs http://127.0.0.1:5194 output.json
```

Restart the preview server for a cold server-cache measurement. To measure cold
slice creation again, move the disposable `runs/core-10day-live/.cache/geometry/`
directory aside before starting the server. Do not remove original atlases.
For a warm disk-cache comparison, retain it and record that choice.

Validation (all commands from repository root):

```sh
export TMPDIR=/home/saithat/Projects/run-tmp
# This sandbox needed a writable pnpm store and version-manager bypass:
export npm_config_manage_package_manager_versions=false
pnpm install --frozen-lockfile --store-dir /home/saithat/Projects/run-tmp/dashboard-pnpm-store
pnpm --filter app build
pnpm --filter app lint
pnpm --filter app exec vitest run --maxWorkers=2 --exclude tests/recheck-revision.test.ts
APP_TEST_PREVIEW=1 APP_TEST_PORT=5195 pnpm --filter app exec playwright test dashboard-performance.spec.ts trajectories.spec.ts compare.spec.ts --workers=1
node scripts/wasm-assets.mjs
git diff --check
```

Build and lint pass. Vitest: **309 tests passed in 36 files**. Playwright:
**18 tests passed**, desktop and narrow, one worker. Browser coverage includes
paging/filter/bookmark round trips, incomplete-task exclusion, no-agent outcomes,
per-task geometry requests, ETag 304s, hidden playback pause/keyboard isolation,
existing paired/cross-day comparisons, fullscreen and semantic WASM replay.
The slice differential test compares every prefix of three representative
recorded tasks (including an incomplete one) with the full atlas. Cache tests
cover coalescing, TTL, bounded eviction, retry after failure, disk reuse,
source changes, path traversal and incorrect geometry identity.

The unrestricted Vitest run was attempted. Its native recheck test cannot run
because `lean/.lake/build/bin/ehr` is absent (`ENOENT`). Its cache-related
build-binding failures were fixed and all three build-binding tests now pass.
The final run excludes only that native recheck file. No Lean source was edited,
so no Lean rebuild or theorem axiom audit was required. No data was staged,
no ignore rules changed, and no push was made. Browser-generated tracked
screenshots were restored; review screenshots were visually inspected from
ignored test output.

The certified app hash is unchanged:
`5cc9d8abd629fe5e78b12f5162e9e25378195e8b027fdd16f543582f96252991`.
Changes are confined to dashboard/browser sources, app scripts and related tests,
plus the required README update.
