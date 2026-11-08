# Run data and live review

[Overview](../../README.md) · [Methods and reproduction](../../README.md#documentation)

`runs/<id>` is the single recording for a run, during execution and after it
stops. The dashboard, UI browser and trajectory player read that directory
through the local Vite dev/preview data layer. Serving a run needs no second
recording or copy step. `core-10day` is the retained historical recording;
explicit offline remeasurement creates a new labeled experiment directory.
Fullscreen playback retains its dark metrics background and reserved transport
space; the recorded EHR keeps its fixed 1440×900 logical viewport.
Catalog discovery ignores unrelated research manifests under `runs/` and validates
recordings before exposing their completed prefixes. The authored `mock` fixture
uses the same day/night fences; conformance evidence loads separately from the summary.
Its sparse scripted proposals retain their original measured examples; idle nights
carry the current layout with no proposal or measurement and complete the calendar.

New manifests declare `completionProtocol: atomic-prefix-v1`. After every
clinician's shift, canonical baseline, no-agent control and calibration output
are durable, the writer atomically commits `days/day-NN/digest.json`.
After all clinicians' nightly decisions and deployment pointers commit, it
atomically commits `completion/night-NN.json`. The shared writer uses a
same-directory temporary file, fsync, rename and directory fsync. Readers
advance through consecutive day/night fences; a later day cannot pass an
unfinished preceding night. Unmarked day/night files and staged revisions
are excluded from summaries, catalogs and direct artifact URLs. Readers do
not infer completion from directory existence or run status. A stopped run
retains its last completed prefix.

The completed prefix determines a cache key. Detail/evidence requests carry
that key so a refresh cannot mix two completed prefixes. Existing replay, trajectory,
complexity and conformance evidence is reused only when it covers that prefix,
and is filtered to its committed days/revisions. Missing derived evidence is
computed lazily in `runs/<id>/.cache/completed/<key>/`; this contains derived
views and an input file list, never copied source days, decisions, programs
or certificates. Native derivation is serialized under
`$TMPDIR/vgi-derived.lock`. Lazy native derivation requires a built native
checker and matching Lean modules (`EHR_BIN` and `EHR_LEAN_DIR` may select
an existing build); it never builds or re-certifies the EHR. Failures are
retryable and never create a ready receipt. Trajectory contexts retain native/WASM replay validation and frozen
certification specs. The run already writes build bindings at deployment;
review does not rebind or re-certify recordings. Rebind after a certified
renderer change remains an explicit separate operation.

Generated-world JSON under `/runs/world/<id>/` uses its own manifest inventory.
It has no recording completion marker and does not enter the recorded-run index.
The preview/dev server serves its manifest and listed artifacts while refusing
unlisted files and parent traversal. Recorded runs retain their completed-prefix
boundary.

The partial-index browser regression intercepts both direct and prefix-pinned
trajectory indices, confirms fixture injection, and checks that missing saved
controls select an available cross-day comparison.
Compare regressions check pixel deltas against the persisted trajectory entries
and explicitly remove geometry metadata to verify unavailable values.

Summary reads show completed days immediately; expensive derived evidence
loads separately. Active runs refresh every 30 seconds, without page reload
or resetting the selected view. Trajectory/Compare indices refresh when the
completed-prefix key changes. Terminal runs do not poll. The UI browser
refreshes its catalog with the selected active run. Missing derived evidence
is shown as unavailable/loading until it arrives; recorded clinical state is
never synthesized by the review layer.

Rename a stopped local recording with
`node scripts/rename-run.mjs <old> <new>`.
It refuses an existing destination, active status, unsafe IDs and symlinks;
it renames in place, rewrites embedded identity/path references (including
compressed JSON and journals), updates transitive byte/semantic SHA-256
bindings, and recomputes day/night and whole-run content digests. Clinical
results and certificate semantics are preserved. On a rewrite failure the
reported destination is retained for recovery. Test the operation on a copy
before using it on a retained recording.

Stopped recordings made before the marker protocol need one explicit in-place
upgrade after renaming: `node
scripts/mark-completed-run.mjs <id> <completed-days> <completed-nights>`.
It validates all requested clinician day/decision records and committed
pointers before installing fences. For the retained ten-day recording the
counts are `10 9`. Data and these caches remain gitignored.

Targeted checks for this path:

```sh
export TMPDIR="${TMPDIR:?Set disk-backed TMPDIR}" CI=true
node --import ./agent/node_modules/tsx/dist/loader.mjs --test scripts/run-prefix.test.mjs scripts/rename-run.test.mjs
pnpm --filter app exec vitest run tests/live-run-http.test.ts tests/run-refresh.test.ts tests/lazy-run.test.ts tests/run-selection.test.ts --maxWorkers=2
APP_TEST_PREVIEW=1 flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off pnpm --filter app exec playwright test live-dashboard.spec.ts dashboard-performance.spec.ts --project=desktop --workers=1
```
