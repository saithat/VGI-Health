# Order-screen scrolling

## Diagnosis

The main cost was a simulator artifact. No vendor, reference or persona layout
was edited. Inputs were read only: day 1 of `runs/lean-10day`, and days 1–2 of
`runs/climb-modeltime-p2-p4-smoke` and `runs/climb-nomove-p2-p4-smoke`.
These are synthetic measurements, not observed clinician behavior.

The reported 1,254 P2 / 553 P1 / 400 P4 / 346 P5 counts are **native scroll
events** on the named order screens. Pixel accounting also counts automatic
reveals, including trips back after those events, so its count differs. Exact
per-event geometry reproduces P2's first task: 202,328 px across the task,
177,400 px on `w3Orders` alone.

`Policy.scrollTo` estimated scrolling from a component's ordinal: the first
12 components fit, followed by 10 per page. It repeated that estimate for every
entry, without considering the current offset or actual rows and columns.
`pointerTravel` executed these as page-downs, then automatically revealed the
target. For example, P2's first dose field is already visible at y=506; the
estimate scrolls down 744 px, then back 714 px to reveal it. The next visible
field repeats the round trip. Expert and bounded action paths share this policy.

The following attribution uses original traces and exact geometry. The
"target-only" diagnostic removes explicit ordinal scrolls, retaining the same
actions and archived reveal geometry. It is a decomposition, not a new
simulation or a clinically calibrated counterfactual.

| Retained day-1 screen | Ordinal forward px | Automatic reveal px | Total px | Target-only px | Excess px |
|---|---:|---:|---:|---:|---:|
| P2 `w3Orders` | 711,576 | 696,608 | 1,408,184 | 58,136 | 1,350,048 |
| P1 `w1Orders` | 281,662 | 248,014 | 529,676 | 32,192 | 497,484 |
| P4 `w5Orders` | 184,460 | 169,786 | 354,246 | 28,612 | 325,634 |
| P5 `w1Orders` | 159,808 | 153,882 | 313,690 | 6,954 | 306,736 |

P2's additive cause table:

| Cause | Pixels on `w3Orders`, day 1 | Real or artifact |
|---|---:|---|
| Repeated ordinal page-down before fields/buttons | 711,576 | Artifact: even visible controls trigger it. |
| Extra return/reveal travel caused by page-downs | 638,472 | Artifact: excess over the target-only route. |
| Reaching New line below composer/history | 25,296 | Mixed: access travel plus old centering; existing layouts can place it beside the composer. |
| Moving among fields and returning for another line | 23,216 | Mixed: access travel plus old centering. |
| Reaching the signing route | 7,896 | Mixed: access travel plus old centering; navigation can already be placed nearby. |
| Reaching a review control | 1,728 | Mixed: access travel plus old centering; preserve the review. |
| **Total** | **1,408,184** | |

The first task's order-screen excess is 167,864 px (177,400 → 9,536 in this
diagnostic); its task total also includes other screens.

Both newer smokes reproduce day 1 exactly for P2/P4. Day-2 P2 in the modeled-time
smoke has 736,754 order pixels, versus 33,392 target-only. The other smoke has
449,524 px but **zero** target-only order travel: its changed layout already
keeps the targets accessible. An additional layout primitive is unnecessary.

Long lists and growing order history contribute real distance to controls,
but do not explain the repeated round trips. These runs use paged lists
(normally 20 records per page). The dense reference uses explicit cell tracks
and row pitches; no Lean-versus-painted row-height mismatch was found. The
ordinal viewport disagreed with the geometry. Existing `Scroll` and `Absolute`
layouts express separate list regions and controls beside the composer.
Layout improvements remain the night agent's work. Its pixel/component
breakdowns expose the cost; no additional workspace README instruction is needed.

## Fix and timing specification

**New specification for owner review.** Geometry-backed agent simulations use
the rectangles and clip chains of the exact admitted Lean paint. Visible
controls incur no target-scroll charge. Each necessary container moves to the
nearest edge revealing the whole control when it fits; oversized panels use
their center. Inner containers precede outer containers. Offsets persist until
screen navigation. Fixed-shell clipping matters even inside the browser
viewport. Historical atlases without rectangles retain their older
center/reveal approximation; no retained file is rewritten.

Native simulation discovers a path without ordinal target scrolling. The host
supplies a plan binding task, non-scroll event ordinal, exact event and reveal
count. Native `emitPlanned` prepends scroll operators **before** the guarded
action, so KLM, receipt expiry, interruptions and workload clocks include them.
Simulation and admitted-geometry measurement repeat until that plan is identical.
The returned native trace must also contain exactly those paid scroll operators.
An oscillation or eight unsuccessful passes refuses measurement. Intermediate
passes cannot become returned measured results. The bounded clinician's
embedded expert gets its own independently converged plan.

This reuses `Ehr.Sim.scrollMs = 1100` and existing `klmFold`, including device
homing. No new timing coefficient or empirical calibration is claimed. One
changed container offset is one reveal gesture, consistent with the prior
pixel metric's counting. Existing text-reading and information-lookup scroll
assumptions remain separate. Standalone `ehr simulate` without a host plan
retains the historical ordinal mode; the offline wrapper below uses the
geometry-backed mode by default.

`emit` and `emit_blocks_unanswered` are unchanged. No theorem, clinical rule,
layout constraint or reference program is weakened or added. Attribution,
replay display and totals share one pixel state machine and exact trace aliases.
Reports retain clinical component IDs, grouping repeated fields. Geometry still
comes only from admitted paint; program, layout and runtime fingerprints remain.
Bounded discovery and all KLM prices remain uncalibrated assumptions.

## Verification and replay

P2, world 2 day 1, unchanged v1 vendor program, seed 1, paged lists, no recording
or night agent. Native baseline (historical ordinal mode):

```sh
export TMPDIR=/home/saithat/Projects/run-tmp
lean/.lake/build/bin/ehr simulate --spec v1 \
  --program releases/v1/personas/P2.json \
  --persona runs/world/2/personas/P2.json \
  --schedule runs/world/2/day-1-P2.json --world runs/world/2 \
  --seed 1 --lists paged > "$TMPDIR/order-scroll/before-native.json"
```

Baseline pixels used the original `pointerTravel` implementation with the
baseline native trace's admitted paint. Geometry-backed replay:

```sh
TMPDIR=/home/saithat/Projects/run-tmp EHR_MEASURE_WORKERS=2 \
  agent/node_modules/.bin/tsx scripts/measure-replay/order-scroll.mts \
  /home/saithat/Projects/run-tmp/order-scroll/after
```

| P2 vendor replay | Before | After |
|---|---:|---:|
| Completed tasks | 22/22 | 22/22 |
| Order-screen scroll pixels | 1,408,304 | 8,696 |
| Order-screen measured scroll gestures | 2,105 | 81 |
| Whole-day modeled time, seconds | 9,883.9 | 8,071.4 |

A same-path decomposition of the fresh baseline separates the second artifact
without changing the clinical actions or their recorded times. Removing
ordinal scroll events with the original geometry policy leaves 61,936 px;
using full clip rectangles and nearest-edge reveal on that same filtered trace
leaves exactly 8,696 px (81 gestures), matching the final native replay.
The retained target-only categories above therefore include an old-reveal
approximation, rather than all being unavoidable human travel.

| Fresh-baseline cause | Order-screen pixels | Classification |
|---|---:|---|
| Ordinal page-downs and their induced return trips | 1,346,368 | Artifact |
| Centered/full-viewport reveal approximation | 53,240 | Artifact |
| Target access using exact clips and nearest edges | 8,696 | Real layout opportunity under the modeled reveal policy |
| **Total** | **1,408,304** | |

The after figures include native scroll pricing, not a post-hoc time discount.
Target scrolling is recorded as paid operators on the original target event:
81 order-screen operators, rather than 1,254 standalone order-scroll events.
`rawScrolls` now counts paid native scroll operators; measured `scrolls` counts
actual changed offsets. The semantic clinical journal is unchanged in form.
The pixel reduction is 99.4%; whole-day modeled time falls 18.3%. These results
measure this one day and program, not a calibrated clinician performance gain.

Read-only retained-trace reproduction:

```sh
TMPDIR=/home/saithat/Projects/run-tmp agent/node_modules/.bin/tsx \
  scripts/measure-replay/order-scroll-diagnosis.mts runs/lean-10day P2 1
```

The same command accepts either smoke directory, P2/P4, and day 1 or 2.
Building the existing adapters with `cd scripts/measure-replay && lake build`
avoids the slower interpreted trace fallback. Keep Lake builds serial.

Verification commands (all with `TMPDIR=/home/saithat/Projects/run-tmp`):

- `cd lean && lake build && lake build ui-layout`: successful; native policy and
  bounded tests include reveal pricing, actual clock advancement, event/task
  binding, independent expert plans and shortcut accounting. The existing
  `#print axioms emit_blocks_unanswered` reports only `propext`,
  `Classical.choice`, `Quot.sound`; its statement and proof were not edited.
- `pnpm --filter agent exec vitest run test/geometry.test.ts test/lean-screens.test.ts test/simulation-modes.test.ts test/lean-trace-compact.test.ts --maxWorkers=2`:
  32 passed.
- `pnpm --filter agent exec vitest run test/floor-evidence.test.ts --maxWorkers=2`:
  3 passed.
- `pnpm --filter app exec vitest run tests/dashboard-performance.test.ts tests/lean-painter.test.ts --maxWorkers=2`:
  23 passed, 3 archive-dependent tests skipped.
- `pnpm --filter agent typecheck`, targeted ESLint for changed TypeScript files,
  and `pnpm --filter app build`: successful.
- `EHR_CONFORMANCE_TRANSPORT=serve node conformance/index.mjs --canonical --jobs 4`:
  1,592 passed, 0 failures, 1,438 not applicable (15 programs, 202 scenarios).
  `node --test conformance/native.test.mjs` also passed the CLI/serve parity test.
  The initial slower CLI-transport invocation was stopped and replaced by this
  equivalent persistent transport.

The targeted lint commands were:

```sh
pnpm --filter agent exec eslint src/ehr.ts src/floor-evidence.ts src/geometry.ts \
  src/lean-layout-geometry.ts src/locality.ts src/run.ts test/floor-evidence.test.ts \
  test/geometry.test.ts test/lean-screens.test.ts --max-warnings 0
pnpm --filter app exec eslint src/metrics/geometry.ts \
  src/dashboard/trajectories-data.ts tests/dashboard-performance.test.ts --max-warnings 0
```

An initial broad unit invocation ran while Lean was rebuilding: it reported
an unavailable object file and an obsolete centering assertion. The affected
files passed in the scoped rerun after compilation and updating that assertion.
No full recording, retained-run conformance, recertification or browser/WCAG
audit was run; no live-stack check is needed.

Changing `app/src/metrics/geometry.ts` changes the certified app hash and
invalidates historical app bindings. The rebuilt app hash is
`49a19420f08ec847cda37648485f55e241c7eba4d79277ac4b974b43286db64e`; retained certificates
are not rebound. Lean layout and the clinical interpreter are unchanged, so a
layout WASM rebuild is unnecessary. No live stack or Docker command is needed.
