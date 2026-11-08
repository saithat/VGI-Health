Continuous workload lane, 2026-11-08

This lane changes the default native expert and bounded measurement semantics to
`continuous-workload-v1`. Historical task-local clocks remain selectable with
`ehr simulate --clock-mode legacy` or schedule `clockMode: "legacy"`.

Commits:

- `9e8a1429` — continuous clinician clock, priority queue, shift carry-over and
  explicit outcome accounting; initial README contract.
- `9685320c` — source-world arrival projection, review-only measurement parsing,
  dashboard/report output, actual-start trajectory reconstruction, bounded tests.
- The final verification commit contains generated TypeScript types and this receipt.

The scheduler chooses among eligible work at the next covered time. Its stable
ordering is ascending priority, deadline (finite before absent), then arrival.
Urgent tasks overtake routine tasks at task boundaries. Starts are bounded below
by previous finish, arrival, ready time and the covering shift start. Active work
finishes nonpreemptively; overtime counts only active milliseconds beyond that
assigned shift. Waiting work crosses into successor coverage, with one serial
server even during overlap. At an exhausted horizon, full source tasks remain
addressable by pending IDs and `--carry-out` exports an unchanged-task schedule.
The recipient must replace coverage using the same time origin. Incomplete
clinical attempts are explicitly abandoned with a reason, retaining incomplete
metrics. Pending tasks also retain incomplete metrics/floor rows.

Every dispatched task retains its own RNG seed; queueing does not redraw source
clinical choices or arrivals. The world timing projector has no UI/policy input.
ED timing uses source arrival clocks and acuity; clinic timing uses source slots;
result timing uses source Observation release/effective timestamps, with backlog
age retained before the nonnegative origin; MAR timing uses source occurrence,
scheduled time, attempt readiness and window end. The same source schedule must
be supplied to every arm. Actual clocks, queue order and clinical outcomes may
differ because navigation costs and temporal guards differ.

Measurements include total/per-task queue delay, distinct overdue scheduled dose
occurrences, completed-result response time, active overtime and tasks handed
over. Queue delay excludes arrival-to-ready prerequisites. MAR lateness uses task
documentation finish against the existing window (or an elapsed window at the
final horizon); it includes held/refused documentation and is not bedside delivery
time. Result response ends at complete task documentation. Dashboard aggregates
blind measurement days when the manifest uses that protocol; missing historical
timing stays unavailable. The report retains actual, canonical and no-agent
workload envelopes. Simulator metadata passes through review-only schemas rather
than changing the clinical wire schema source. Trajectories reconstruct recorded
dispatch order and the actual fractional-minute start.

Kernel theorem statements (`Ehr.Sim.Scheduling`):

- `start_bounds previousFinish t`: `previousFinish ≤ startAt previousFinish t`,
  `(arrival t).arrivalMs ≤ startAt previousFinish t`, and
  `(arrival t).readyMs ≤ startAt previousFinish t` (where `arrival t` is the source
  metadata extraction, and `startAt = max previousFinish (max arrival ready)`).
- `clock_monotone previousFinish t duration`:
  `previousFinish ≤ finishAt previousFinish t duration`, with finish equal to
  that start plus duration.
- `erase_conservation pending i (i < pending.length)`:
  `(pending.eraseIdx i).length + 1 = pending.length`.
- `timing_accounted`: a finalized policy attempt is `finished` or is `abandoned`
  with a present reason.
- `exogenous_arm_independent a b tasks`:
  `arrivalsForArm a tasks = arrivalsForArm b tasks`.

The full dispatch/coverage loop is bounded-checked rather than generally proved.
The regression enumerates 512 three-task arrival/ready/priority combinations,
four coverage configurations (overlap, short horizon, off-duty gap, empty), and
two service durations: 4,096 cases. It checks the output partition, task count,
unique source identity conservation, monotone starts/finishes and prerequisite
bounds. Integration checks exercise both actual policies, urgency, trace order,
finite-horizon pending work, overtime and legacy mode. This is not a liveness or
fair-service theorem and does not prove the world generator's clinical validity.

Assumptions flagged for owner review:

- One serial clinician/coverage chain; active tasks are nonpreemptive.
- Existing tour lengths; 15-minute hospital overlap; finite successor coverage.
- Hospital carry queues can run at night/weekends; clinic coverage skips weekends.
- The source world still supplies weekday daytime cases. No independent
  night/weekend clinical demand was fabricated, and following-day new arrivals
  are not merged into an extended single-day simulation's queue.
- ESI queue deadlines are 10/30/60 minutes for ESI ≤2/3/≥4.
- Documentation completion proxies for MAR lateness and result response, the
  existing provisional MAR windows, and fallback planned-ready arrivals when
  historical source timing is absent.
- Queue handover is simulator scheduling; live clinical handoff acceptance,
  actor-specific successor knowledge and cross-shift dose responsibility remain
  outside this change. Suspend/resume fields are hooks for the interruptions lane.

Verification uses `TMPDIR=/home/saithat/Projects/run-tmp`, `CI=true` for pnpm and
`LEAN_NUM_THREADS=6` for Lean. No two lake commands overlap.

Completed checks:

- `pnpm --filter world exec vitest run test/timing.test.ts test/determinism.test.ts test/schema.test.ts --maxWorkers=2`
  — 3 files, 40 tests passed.
- `pnpm --filter agent exec vitest run test/workload.test.ts --maxWorkers=2`
  — 1 file, 4 tests passed.
- `pnpm --filter world exec eslint src/timing src/schema.ts src/cli.ts test/timing.test.ts`
  — exit 0.
- `pnpm --filter agent exec eslint src/adhoc.ts src/determinism-fixture.ts src/ehr.ts src/no-agent.ts src/offline-columns-check.ts src/offline-tailoring-compare.ts src/quality-queries.ts src/report.ts src/session-cli.ts src/world.ts test/workload.test.ts`
  — exit 0.
- `pnpm --filter app exec eslint src/dashboard/WorkloadClock.tsx src/dashboard/measurement-schema.ts src/dashboard/agent-evidence.ts src/dashboard/Dashboard.tsx --max-warnings 0`
  — exit 0.

- `(cd lean && lake build)` — all 523 jobs passed, including the scheduler's
  4,096 bounded cases and expert/bounded policy integration guards.
- `(cd lean && lake exe gents)` — 183 types and 42 samples generated; only the
  TypeScript types changed (83 added lines).
- `(cd lean && lake env lean Ehr/Sim/Scheduling/Axioms.lean)` — all five scheduler
  lemmas and `Ehr.Sim.emit_blocks_unanswered` use only `propext`,
  `Classical.choice`, `Quot.sound`.
- `pnpm --filter world typecheck`, `pnpm --filter agent typecheck`,
  `pnpm --filter app typecheck` — all exit 0.
- `pnpm --filter world exec vitest run test/cli.test.ts --maxWorkers=1` — 1 test
  passed, including repeated default generation and agent schedule loading.
- `pnpm --filter agent exec tsx --test ../scripts/trajectories/index.test.mjs`
  — 3 tests passed; the local historical index covers 1,284 tasks. This does not
  re-certify/re-generate the recording or establish fresh WASM parity.
- `node scripts/workload-clock-smoke.mjs` — passed real native expert/bounded
  ordering, completed clinical tasks, monotone traces, explicit legacy mode,
  full source-task carry export, recipient replay and zero native trajectory
  context mismatches. This uses local gitignored world/program inputs and cleans
  its disk-backed scratch directory.
- `pnpm --filter world exec vitest run test/timing.test.ts --maxWorkers=2`
  — final source-preservation assertion rerun: 3 tests passed.
- `git diff --check` — exit 0.

A final build command was first invoked from the repository root, then rerun
successfully from `lean/`; no project-root build was claimed.
The initial Lean build found the reserved local identifier `at` in the new module;
it was corrected and the failed build was interrupted before restarting. The
initial app Vitest invocation found no tests because its configuration only scans
`tests/`; the schema regression now lives in `agent/test/workload.test.ts` and
passes there. The native trajectory-context smoke found a missing `State` type
annotation in the new initial clock seed; that annotation was corrected and the
whole native smoke passed. These were development failures, not passing
verification claims.

No Specs/Props/Statements/comparator statement was weakened; no proof placeholder,
new axiom, or forbidden decision tactic was introduced. Headline clinical claims
and proof-map structure did not change. App edits are restricted to dashboard
sources; clinical wire schema and pinned app build inputs were left unchanged.
This lane does not rebuild/bind WASM or certify the installed clinical app build.

The merge must regenerate successor world schedules and all `core-10day`
actual/canonical/no-agent/training measurements, timing summaries, trajectories
and same-task controls using matched clock modes. Frozen recorded worlds and
measurements were not rewritten. Rebuild native/WASM source bindings before
recertification/replay. Full recertification, live-stack work and the browser
audit pair were intentionally deferred to the merge, per the lane instructions.
Nothing was pushed and no other branch/worktree was edited.

Owner questions:

Should extended queues merge subsequent days' new arrivals before claiming a
continuous multi-day hospital workload?
Should night/weekend source-world clinical cases and successor actor knowledge
be the next realism increment?
Are the 15-minute overlap, nonpreemption and documentation-time proxies acceptable
for this version, or should they be replaced with specified local parameters?
