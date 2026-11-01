# Publish a completed partial run

Run from the checkout serving the app after installing this change:

```sh
pnpm publish-partial --run core-10day --into core-10day-live
pnpm publish-partial --run core-10day --into core-10day-live --watch
```

When the publisher code is in a separate checkout, select the serving checkout
explicitly (the source and output run directories belong to that checkout):

```sh
pnpm publish-partial --repo-root /home/saithat/Projects/VGI-Health \
  --run core-10day --into core-10day-live
```

The live source stays read-only. Publication includes the contiguous prefix of
complete persona phases, not whichever persona is furthest ahead. A complete day
requires all scheduled task records and certified programs for every persona.
Night N requires every persona's complete decision, recorded certification inputs,
program/certificate, and committed deploy pointer. Day N+1 may be published after
night N even while night N+1 is still running. The destination pointers are rebuilt
from included decisions; staged future programs never appear in the app.

JSON is parsed only after two identical reads; a final content fence detects
changes during capture. Completed decision calls retain their embedded transcripts.
Content-addressed geometry is limited to published programs and their baselines.
The manifest records `status: "partial"`, completed days/nights, planned length,
source identity/status, a content signature and `stopped/partial: N of 10 days`.
The word "stopped" in that note does not imply the source is stopped: `sourceStatus`
remains explicit. Selection/measurement protocols and original safety certificates
are preserved. Copied decisions use the destination run ID for app loading and
retain their original identity as `sourceRunId`; program/certificate bytes are
unchanged. The publisher never invokes a model or changes a program.

Replay contexts reuse the shared export and agent native/world/schema functions.
Trajectory indexing runs real native context extraction and WASM verification;
Lean is launched directly with six threads, without `ulimit -v`. The machine's
systemd scope supplies the memory limit. TMPDIR is set to
`/home/saithat/Projects/run-tmp`. Complexity runs only after extraction, with a
1-second total task deadline and 1,000-node search bound by default. Bounds are
reported as unavailable, never zero. Override with `--task-timeout-ms` and
`--search-bound`. A failed safety/determinism check prevents publication.

Artifacts are generated in a private directory in run-tmp, outside the app catalog
scanner, then the complete directory
replaces the previous snapshot. A rollback restores the old directory if that
rename fails. TMPDIR and the destination must share a filesystem for atomic renames.
Existing readers may briefly retry during replacement; no partial
JSON files are exposed. Identical completed prefixes are skipped. `--watch` polls
every 15 seconds (`--poll-ms`), reuses content-addressed native contexts bound to the binary, modules, adapter,
world/fixture fingerprints and exact schedule/spec/program/recording bytes,
never overlaps its own extraction, and stops on
SIGINT/SIGTERM after finishing an active publication. A per-destination PID lock
prevents concurrent replacement; inspect its PID before removing a stale lock.

After the orchestrator has STOPPED the source writer, finalize in place:

```sh
pnpm publish-partial --run core-10day --in-place
```

`--in-place` is the caller's assertion that the writer has stopped. It cannot be
combined with `--watch`. The full original directory, including any unfinished
work, is retained in run-tmp (its path is logged and recorded as `originalArchive`); the app-facing run
contains only the complete prefix. The original manifest and resume checkpoints
remain in that backup. In-place finalization additionally runs all applicable
conformance scenarios for every deployed revision (`pnpm conformance --run <id>
--run-only --jobs 5`) and the existing real checker/screen-gate rebind command
(`pnpm --filter agent rebind --run <id>`) against the current build, without
rebuilding. Refusals remain refusals and return nonzero; rebind receipts resume on
retry. Nothing is silently rebound. Do not use in-place publication while the
writer is live; use `--into` for live previews.

Verification:

```sh
pnpm test:publish-partial
pnpm trajectories --run core-10day-live --verify-only
curl -fsS http://127.0.0.1:5180/runs/index.json
# Open /browse?run=core-10day-live and inspect all five day-2 rev-1 branches.
```

The current preview server memoizes its browser catalog. Restart that preview
process after the first publication (and after a newly published program revision)
so `/catalog.json` includes it; do not rebuild the app. The `/runs/index.json` and
summary endpoints read the current run directory on each request. Existing
trajectories remain independently verifiable.

No run artifacts are committed by this command.

## Verification on 2026-11-01

Published the live main-checkout source read-only as `core-10day-live`: two
completed days, one completed night, ten certified programs (rev 0/1 × five
personas), 285 tasks and 17,525 trace events. Native extraction and the exact
`pnpm trajectories --run core-10day-live --verify-only` command both reported zero
mismatches. `/runs/index.json` lists it as replayable. One headless Chromium check
found all five day-2 timeline branches at certified rev 1, with no page errors.
The preview process on 5180 was restarted to refresh its memoized catalog, without
a build. A second publication skipped the unchanged prefix. Complexity completed
with explicit bounded/unavailable tasks. The live source was not finalized in
place and no model calls were made.

Targeted verification: 10 publisher tests, 1 native-context-cache test, 7 complexity
tests, and 3 trajectory regression tests pass. Broader checks in this worktree
reported agent 104/105 and app 301/302: the remaining checks correctly refused the
worktree's stale post-merge dist WASM/native checker. They were not bypassed or
rebuilt during the live run. The served snapshot was verified against the live
checkout's matching native/WASM build. In-place command wiring/refusal propagation
and original-data preservation/rename rollback are covered by unit tests; the
still-running source was left untouched.

The existing app timeline draws retained revisions into future day columns even
for a partial run. The snapshot contains only its stated completed days/nights;
those extra visual slots do not represent measured shifts or new decisions. This
app behavior was not changed because app source is outside this task's allowed
edit scope. Use the manifest's completed counts and actual task/day records.

A fresh FAKE-labeled fixture using each persona's actual recorded first task also
passed the final publisher pipeline with staging outside the catalog: five tasks,
546 events, zero native/WASM mismatches, bounded complexity output, and a second
idempotent skip. It used the live checkout's read-only build assets in a separate
run-tmp fixture. Reporting tasks without data were explicitly unavailable, and
no fixture or run data was committed.
