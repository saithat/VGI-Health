# Browser geometry determinism

Date: 2026-11-02. Branch: `lane/geometry-determinism`, baseline `57f3597c`.
Owner-approved changes to measured pixels; no historical run is rebound.

## Implementation

The clinical renderer ships 33,048 bytes of WOFF2: Noto Sans normal variable
400–800 (including the existing 650/750 weights), Noto Sans Mono regular 400,
and a two-glyph Noto Sans Symbols 2 fallback for `◷` and `✓`. Sources are pinned
by upstream revision and SHA-256; OFL-1.1 notices accompany the assets. The
reviewed Latin repertoire, subset generator and tool version are tracked in
`scripts/fonts/`. Regeneration reproduced all three font hashes. No dependency,
lockfile, CDN, local-font source or additional language subset was introduced.
The theme, body, legacy hotkeys, code and laboratory use the bundled families;
the dashboard's explicit mono rule also names the bundled face first. The
legacy `.ehr-shell` font shorthand also uses the bundled sans family; a
synthetic legacy capture is included in the CI repeat/fontconfig test.

`capture-environment.ts` pins 1440×900 CSS pixels, deviceScaleFactor 1,
reduced motion, light scheme, en-US and America/Los_Angeles. Its stylesheet
disables animation, transitions, smooth scrolling and caret paint. Measurements
explicitly load/check all declared faces and await `document.fonts.ready` plus
two animation frames. Missing WOFF2 fails capture. Playwright regressions verify
the environment and reject blocked font requests.

The collector retains one browser but creates and closes a fresh context/page
for each captured active or modal-free state. The screen/WCAG gate uses the same
settings and font checks, retaining its per-test isolation and matrix resets.
The measured Chromium version is `156.0.8078.4`. The collector hashes the child executable exposed by `launchServer().process()`,
so headless-shell bytes are bound rather than the regular Chrome path returned
by `chromium.executablePath()`. Geometry contexts bind appSha256, exact font bytes, capture sources/manifest,
settings/stylesheet, Chromium version and executable hash. The app fingerprint
also binds binary font bytes explicitly. OS/fontconfig identities and scratch
paths are intentionally absent. Cache reads can be disabled for verification.
Filename/day identities are attached after cache lookup, so identical trees do
not inherit another file's identity. Semantic fixture detection uses `workspace`
rather than the optional `screen` property.

The native geometry verifier initially failed before measuring: its TypeScript
wire validator omitted the current Lean `minorInteraction` and `criticalResult`
constructors. The validator now accepts exactly those additional constructors;
existing release round-trip tests cover the repair. No Lean source, theorem,
specification, property, threshold or policy was changed.

## Isolation cost

Two alternating trials of 20 repeated orders-state captures, including local
font loading and context startup/teardown:

| Strategy | Trial 1 | Trial 2 | Mean per state |
|---|---:|---:|---:|
| Reused page | 2,032 ms | 2,063 ms | 102.4 ms |
| Fresh context/page | 6,999 ms | 7,037 ms | 350.9 ms |

The extra 248.5 ms/state (3.4× in this small local benchmark) buys isolation of
scroll, focus, React state, storage and transition lifecycle. Fresh contexts
were selected. This is a microbenchmark under concurrent verification load,
not a throughput guarantee. Raw timings and the executable benchmark remain
under `$TMPDIR/geometry-determinism/final/isolation-benchmark.{json,mjs}`.

## Build binding

Before: `2ea7dd29537cb687d2a437ac3860b5208ff1121f3e95f6482a4a28ebad1f042a`.
After: `3ff5ae052db057923df26e9c4c60f7110dbfe7f6103e24a471e4939b73931adf`.

The changed certified app hash invalidates recorded app certificates. Geometry
contexts also change. Lean/WASM assets are unchanged; `make wasm-check` passes
with source hash `d61dff3ec9ca465b5938193921234eec4de5a93b77ec08ff2304926192b3f739`.
No certificate or old run was rewritten or rebound, and nothing was pushed.
`CLAUDE.md` was absent; the owner's supplied rules and README were followed.
The absent ignored `runs/core-10day-live`, `runs/mock` and `runs/run1-P3`
were restored from the local `hackathon-final` tag to run archive-dependent tests.

## Measurement protocol

The native verifier uses the same world/2 inputs, fixture selection, release
days (v1/day 2, v2/day 4, v3/day 8), seeds and canonical programs before/after.
Task identities, completion, exact native traces, native binary and world hashes are compared by
`geometry-compare.mjs`. Mean/max are per task, not per screen or pointer event.
Signed delta is after minus before; maximum absolute delta is also retained in
the JSON so a decrease cannot disappear behind the largest positive delta.

The canonical screen audit exports all 15 role-specific programs plus current
urgency probes: 3,619 exports represented by 1,296 exact distinct trees. All 1,296 current representatives are modal-free; the compact CI test separately
covers an active dialog, its background probe and legacy HTML. The
repeat/fontconfig check measures those representatives with cache reads disabled
and distinct browser processes/cache directories for each pass. Linux's generic
sans-serif/system-ui/monospace aliases are changed from the host Noto families
to installed Liberation Sans/Mono; `fc-match` must confirm the alternate families.
DejaVu is not installed on this Fedora host. This is the requested alternate
fontconfig experiment, not a second operating-system or browser-engine test.

For the full baseline WCAG comparison, tracked baseline source was extracted
with `git archive HEAD` into disk-backed scratch. Its rebuilt app hash matched
the original exactly. Only that scratch Playwright server command was changed
from `pnpm exec vite` to `node node_modules/vite/bin/vite.js`, avoiding pnpm's
workspace auto-install for the archive. Gate assertions and clinical source were
unchanged. Both gates consume the same exported tree bytes and enforce the
existing physical/urgency policy. All browser commands use at most two workers;
the baseline fixture gate used four. The post-change fixture gate uses one.

## Uncached repeat and fontconfig verification

All three final-build captures contain **1,296/1,296 states** and are
byte-identical, including their context digest. Input identities and 1440×900
viewport coverage were independently validated for every pass. No cache reads
were permitted; each pass starts its own Chromium process and cache directory.

| Pass | Font resolution | Elapsed |
|---|---|---:|
| First | Host Noto Sans / Noto Sans Mono | 473,825 ms |
| Repeat | Host Noto Sans / Noto Sans Mono | 393,614 ms |
| Alternate fontconfig | Liberation Sans / Liberation Mono | 386,870 ms |

Both `sans-serif` and `system-ui` resolve from Noto Sans to Liberation Sans;
`monospace` resolves from Noto Sans Mono to Liberation Mono. The driver rejects
an experiment where an alternate family resolves identically to the baseline.
The compact CI check also covers legacy HTML and active/background modal states;
it measures five states in three independent passes. Six separate Playwright
checks pass for the pinned environment, missing-font failure and legacy family
ordering across both projects.

Final geometry context:
`49671164d8bf0d50d47f1d784bbd23a4abac2daae60026cf155416ccde9b8eb7`.
Raw geometry JSON SHA-256:
`6c34774c4f3de9e708792f97b8ae18cd836009b06e39c4dab973b2978949aff3`.
Actual Headless Shell executable SHA-256:
`4fa61f0ba0b4f89b7bec242c32ca16d3bccf69dbfef0651924a9ba8fede5f9d6`.

## Canonical task geometry

All 15 canonical pairs complete the same **384/384 tasks**, with identical native
traces, task identities, binary hash and world hash. Every target is measured.
Values below are CSS pixels per task, rounded to two decimals. Δ is after minus
before; the last column is the largest absolute per-task delta, not the
difference between the two maxima. Full signed min/max and absolute-delta
statistics are retained in `final/deltas.json`.

Aggregate scroll changes from 20,421,137 to 18,633,613 px (−8.753%); mouse travel
changes from 5,106,331.56 to 5,098,570.33 px (−0.152%). These values
recalibrate the existing simulated traces.

### Scroll distance

| Canonical | Tasks | Mean before → after | Max before → after | Mean Δ | Largest absolute Δ |
|---|---:|---:|---:|---:|---:|
| v1/P1 | 40 | 42,457.70 → 35,965.43 | 156,804.00 → 133,895.00 | -6,492.27 | 34,872.00 |
| v1/P2 | 18 | 135,549.67 → 133,074.50 | 282,542.00 → 278,952.00 | -2,475.17 | 7,117.00 |
| v1/P3 | 51 | 15,175.39 → 15,067.10 | 34,692.00 → 34,692.00 | -108.29 | 5,523.00 |
| v1/P4 | 20 | 46,862.65 → 39,769.80 | 88,436.00 → 75,185.00 | -7,092.85 | 16,267.00 |
| v1/P5 | 14 | 84,191.29 → 73,261.14 | 204,500.00 → 171,972.00 | -10,930.14 | 32,528.00 |
| v2/P1 | 40 | 46,245.93 → 38,640.47 | 123,681.00 → 101,606.00 | -7,605.45 | 32,928.00 |
| v2/P2 | 13 | 158,959.31 → 156,498.38 | 255,869.00 → 250,537.00 | -2,460.92 | 5,332.00 |
| v2/P3 | 41 | 16,295.39 → 16,295.39 | 29,946.00 → 29,946.00 | +0.00 | 0.00 |
| v2/P4 | 17 | 34,467.12 → 29,004.47 | 60,359.00 → 43,707.00 | -5,462.65 | 16,652.00 |
| v2/P5 | 11 | 78,575.55 → 65,865.82 | 207,482.00 → 179,107.00 | -12,709.73 | 28,375.00 |
| v3/P1 | 39 | 46,888.56 → 39,394.90 | 112,931.00 → 88,077.00 | -7,493.67 | 31,975.00 |
| v3/P2 | 15 | 215,776.87 → 212,516.07 | 486,269.00 → 482,651.00 | -3,260.80 | 8,888.00 |
| v3/P3 | 38 | 15,474.08 → 15,038.05 | 29,643.00 → 29,643.00 | -436.03 | 5,523.00 |
| v3/P4 | 15 | 48,869.27 → 41,797.13 | 88,174.00 → 71,481.00 | -7,072.13 | 16,693.00 |
| v3/P5 | 12 | 81,000.58 → 68,485.58 | 213,803.00 → 176,292.00 | -12,515.00 | 37,511.00 |

### Mouse travel

| Canonical | Tasks | Mean before → after | Max before → after | Mean Δ | Largest absolute Δ |
|---|---:|---:|---:|---:|---:|
| v1/P1 | 40 | 8,579.14 → 8,565.36 | 18,579.63 → 18,567.90 | -13.78 | 209.33 |
| v1/P2 | 18 | 26,386.77 → 26,384.70 | 56,424.35 → 56,417.50 | -2.07 | 6.85 |
| v1/P3 | 51 | 7,123.85 → 7,124.08 | 19,105.91 → 19,101.47 | +0.23 | 8.11 |
| v1/P4 | 20 | 16,550.45 → 16,521.72 | 34,126.68 → 34,103.69 | -28.73 | 246.07 |
| v1/P5 | 14 | 23,389.03 → 23,254.27 | 55,658.74 → 55,658.60 | -134.77 | 695.85 |
| v2/P1 | 40 | 9,151.54 → 9,136.54 | 19,358.34 → 19,341.69 | -15.01 | 165.92 |
| v2/P2 | 13 | 30,658.29 → 30,658.48 | 47,236.98 → 47,237.04 | +0.19 | 1.79 |
| v2/P3 | 41 | 7,330.93 → 7,330.53 | 16,137.17 → 16,132.22 | -0.39 | 5.57 |
| v2/P4 | 17 | 10,769.72 → 10,743.42 | 15,467.26 → 15,333.43 | -26.29 | 133.83 |
| v2/P5 | 11 | 19,761.44 → 19,633.95 | 52,541.85 → 52,537.56 | -127.49 | 698.52 |
| v3/P1 | 39 | 9,385.38 → 9,367.84 | 23,678.57 → 23,668.99 | -17.54 | 165.93 |
| v3/P2 | 15 | 45,383.63 → 45,383.31 | 107,062.81 → 107,067.78 | -0.32 | 4.97 |
| v3/P3 | 38 | 6,672.71 → 6,674.19 | 15,219.64 → 15,216.45 | +1.48 | 9.75 |
| v3/P4 | 15 | 14,541.88 → 14,509.60 | 23,340.93 → 23,263.02 | -32.28 | 77.91 |
| v3/P5 | 12 | 23,525.68 → 23,430.46 | 61,716.02 → 61,713.80 | -95.22 | 603.91 |

## Complete canonical WCAG comparison

Both original and final builds cover all **1,296 distinct trees** from the
3,619 exports and all **11,664 required matrix measurements**. Independent
validation matched every input SHA-256 and all nine width/text/phase cases per
tree. All 21 batches completed without infrastructure errors.

| Result | Original build | Final build |
|---|---:|---:|
| SC 1.4.10 finding occurrences | 3 | 3 |
| All other WCAG physical findings | 0 | 0 |
| Urgency findings | 0 | 0 |
| CLI gate | Fail | Fail |
| Wall time | 56m 26.7s | 56m 21.7s |

No finding identities or conditions were added or removed. All three retained
findings are in `critical-documented.json`, target
`critical.action:panic-1/input`, active phase. Their reported horizontal
rectangles change with the font:

| Width / text | Original left, right | Final left, right |
|---|---:|---:|
| 1280px / 100% | 884.9, 1105.1 | 882.0, 1105.0 |
| 1280px / 200% | 754.8, 1270.0 | 761.0, 1270.0 |
| 768px / 200% | 10.0, 442.3 | 10.0, 443.0 |

These are ancestor/viewport overflow or clipping findings; the coordinates alone
do not imply the input exceeds the viewport. The thresholds and findings remain
enforced. Neither failed gate produces a passing whole-version receipt. Raw
comparisons are in `final/wcag-comparison.json`; full coverage evidence is in
`final/wcag-coverage.json`.

## Fixture gate comparison

The seven tracked UI fixtures produce 72 physical matrix measurements both
before and after. Both enforce the policy and return failure: zero WCAG
physical findings and 90 urgency findings in `p1-alert.json`. Every finding's
file, width, text-resize percentage, phase, criterion, ID and detail matches
exactly; there are no added or removed findings. The negative target/contrast,
fidelity and urgency controls remain enforced and pass. These fixture results
do not substitute for the full persona audit below.

Durable evidence is rooted at
`/home/saithat/Projects/run-tmp/geometry-determinism/`. It contains uncached pass
JSON, fontconfig, cache contexts, native command journals/atlases, per-task
results, matrix reports, logs, benchmark source/results and desktop/narrow
orders screenshots. Generated patient/program/run data and browser artifacts
remain outside git.

## Verification commands

Commands were run from this worktree with disk-backed scratch. The final build
was emitted separately from the running preview, then its app fingerprint was
compared with the measured build; they match exactly. This avoids disrupting
ongoing captures when verifying the build.

```sh
export TMPDIR=/home/saithat/Projects/run-tmp LEAN_NUM_THREADS=2
pnpm --filter app build --outDir "$TMPDIR/geometry-determinism/final/build-verification"
pnpm --filter app typecheck
pnpm --filter app lint
LEAN_NUM_THREADS=2 pnpm --filter app test --maxWorkers=2 --testTimeout=30000
pnpm --filter agent typecheck
pnpm --filter agent exec vitest run test/lean-types.test.ts --maxWorkers=2
make wasm-check
pnpm --filter app test:geometry-determinism
APP_TEST_PREVIEW=1 APP_TEST_PORT=4296 pnpm --filter app exec playwright test geometry-environment.spec.ts --workers=1
APP_TEST_PREVIEW=1 APP_TEST_PORT=4297 LEAN_NUM_THREADS=2 pnpm --filter app exec playwright test --workers=2
python3 "$TMPDIR/geometry-determinism/final/audit-archives.py"

node scripts/audit-alert-policy.mjs "$TMPDIR/geometry-determinism/canonicals" --personas --export-only
node app/scripts/geometry-determinism.mjs "$TMPDIR/geometry-determinism/final/independence" "$TMPDIR/geometry-determinism/canonicals/exports.json"
LEAN_NUM_THREADS=2 node --import ./agent/node_modules/tsx/dist/loader.mjs agent/src/geometry-verify.ts canonicals "$TMPDIR/geometry-determinism/final/canonicals"
node app/scripts/geometry-compare.mjs "$TMPDIR/geometry-determinism/before" "$TMPDIR/geometry-determinism/final/canonicals" "$TMPDIR/geometry-determinism/final/deltas.json"

EHR_SCREEN_WORKERS=1 EHR_PHYSICAL_REPORT="$TMPDIR/geometry-determinism/final/wcag-fixtures.json" pnpm --filter app screen-check --ui app/src/fixtures/ui/*.json
EHR_SCREEN_WORKERS=2 EHR_SCREEN_BATCH_SIZE=64 EHR_PHYSICAL_SAMPLE_CACHE="$TMPDIR/geometry-determinism/final/physical-samples" node scripts/audit-alert-policy.mjs "$TMPDIR/geometry-determinism/final/persona-gate" --personas
```

The original `pnpm --filter app build` produced the baseline binding, followed by:

```sh
node --import ./agent/node_modules/tsx/dist/loader.mjs agent/src/geometry-verify.ts canonicals "$TMPDIR/geometry-determinism/before"
EHR_SCREEN_WORKERS=4 EHR_PHYSICAL_REPORT="$TMPDIR/geometry-determinism/wcag-before.json" pnpm --filter app screen-check --ui app/src/fixtures/ui/*.json
```

The full original-build gate was run through
`node "$TMPDIR/geometry-determinism/run-baseline-gate.mjs"`. That retained
helper reads the exact export manifest, deduplicates by `checkedAs`, and calls
the archived original `screen-check.mjs --ui` on all 1,296 files. It sets
`APP_TEST_PREVIEW=1`, two workers, a separate cache, and
`EHR_PHYSICAL_REPORT=$TMPDIR/geometry-determinism/wcag-canonical-before.json`.
The archived build used the existing dependency links, native source snapshot
`git archive HEAD`, and the original plugin with `GIT_DIR` pointing read-only
at this worktree's Git metadata for build-info generation.

| Check | Final result |
|---|---|
| Standard app build and independent fingerprint comparison | Pass; final `3ff5ae05…931adf` binding reproduced. |
| App typecheck and lint | Pass. |
| App unit tests, two workers and 30 s timeout | **40 files / 320 tests passed**, no skips. |
| Agent typecheck and Lean-wire round trips | Pass; **9 tests passed**. |
| WASM source binding | Pass; no Lean/WASM changes. |
| Compact repeat/fontconfig check | Pass; five states per pass, complete identity coverage. |
| Environment/font regressions | **6 passed**. |
| Complete canonical repeat/fontconfig check | Pass; 1,296 states × three uncached processes, identical JSON. |
| Native canonical geometry and aligned comparison | Pass; 15 pairs, 384/384 tasks, identical traces, no missing targets. |
| Complete original/final persona screen/WCAG gates | Both fail on the same three SC 1.4.10 findings; 1,296 trees / 11,664 cases each; rectangle changes listed above. |
| Seven-fixture screen/WCAG gate | Fail on the same 90 urgency findings; zero WCAG physical findings, no changes. |
| Full Playwright suite, both projects, two workers | **240 passed / 67 skipped / 43 failed**, 13m 12s. See failure scope below. |
| Historical archive source integrity | **2,618 files match** the local archive tag; no missing or modified source artifacts. |

The restored archive-backed native-check test exceeded its original five-second
budget under concurrent verification load. The final unit command uses a
30-second command-line timeout; no test assertion or implementation was relaxed.


## Full browser failure scope and retained artifacts

The full suite is not green. Its 43 failures comprise:

- 32 live/login/search/selection/surgical cases. Snapshots show the missing local
  persona-login setup message or Keycloak's `Invalid parameter: redirect_uri`
  response for the isolated test origin. No shared authentication configuration
  or credentials were changed.
- Eight historical dashboard/trajectory cases: the saved-revision EHR pair or
  trajectory player remains loading/disabled. Saved build bindings are stale;
  inspected `core-10day-live` P1/v0 still binds app
  `5cc9d8abd629fe5e78b12f5162e9e25378195e8b027fdd16f543582f96252991`,
  which differs from the final build. These playback cases remain unverified.
- Three retained `p1-alert.json` urgency failures: desktop/narrow semantic
  fidelity and the desktop physical-policy test. The CLI fixture gate shows
  the same 90 urgency finding occurrences before and after.

No test was skipped or assertion weakened to conceal these results. The
existing 67 explicit browser skips remain in the complete log. The new
environment/font tests pass in both projects.

All 2,618 archived source files in the restored `core-10day-live`, `mock` and
`run1-P3` directories were compared against their Git blob identities at
`hackathon-final`; every file matches. Derived caches are separate from those
recorded source artifacts. Three tracked review PNGs generated by browser tests
were preserved under `final/generated-tracked-shots/` and restored to HEAD;
historical review images are not updated by this lane.


## Scope retained and owner decisions

No Lean source, theorem or protected specification was changed, so no Lake
build or edited-theorem axiom audit was needed. The existing native binary and
WASM were verified unchanged. No historical certificate was rebound, no
recorded source artifact was rewritten, no ignored data was staged, and nothing
was pushed or deployed.

The existing critical-action overflow, stale fixture urgency, live authentication
setup and historical playback failures were reported with enforcement intact.
This lane does not repair those separate workflows or modify shared services.
The host experiment uses Linux fontconfig and the selected Chromium build;
an actual second operating-system capture was not run. New scripts or symbols
outside the reviewed font repertoire require renewed font coverage and checks.

Owner decisions remain:

- Which historical recordings should receive fresh validation/rebinding under
  the new app hash, once their relevant gates pass?
- Which local `.env` path and registered callback origin should be used for a
  fully configured live browser verification?

There is no outstanding implementation question for the geometry changes.
