# Recording storage and memory

`run-days` keeps completed geometry and training traces on disk. It retains only
in-flight geometry captures, two browser admission atlases, eight Lean admission
results/inventories and twelve world schedules. Nightly training and final
review use arrays backed by files with two decoded records cached. Locality
aggregation consumes one day's atlas at a time. Native placement boxes are shared
within a call when both the admitted shape and occurrence-to-control map match;
state ordering, labels, target aliases and measured coordinates are preserved.
Useful clinician memory, program versions and compact history/timeline metadata
still accumulate according to the simulation protocol. This is a bound on bulky
recording evidence, not a fixed RSS limit for arbitrary workloads.

## Geometry format 2

The core format is implemented, but four consumers still need the prepared
compatibility update: `scripts/trajectories/index.mjs`,
`scripts/complexity/compute.mjs`, `scripts/layout-reference/report.mjs` and
`app/scripts/geometry-slice.ts`. They currently expect schema 1. Apply their
coordinated update before using those readers on new recordings.

The manifest records `geometryStorageVersion: 2` and
`screenReportStorageVersion: 2`. `geometry/<program>.<components>.json` and the
shorter program alias are small pointers to the latest snapshot, rather than
merged historical atlases. Under the same directory:

- `objects/<sha256>.json` holds a geometry body without state/sample labels.
  Repeated bodies share a file; Lean event targets store references to existing
  component boxes. Readers verify body content hashes.
- `snapshots/<input-key>/index.json` binds atlas metadata and the chunk count.
  Numbered JSON chunks contain ordered state references, normally below 1 MiB.
  An individual body/reference record is limited to 8 MiB; serialization refuses
  a larger record before joining its output. No document is joined across days.
- `<program>.<components>/captures/<key>.json` reuses a completed provider call
  without retaining its Promise or atlas in memory.
- `results/<result-key>.json` below that program directory selects an exact
  simulated day/persona/clinical trace/observations. `days/<day>.json` selects the
  latest call for a calendar day when a reader has no result trace.

`loadGeometry(file, result)` selects exact evidence. With no result it reads the
latest snapshot. The portable `readStoredGeometry` adapter accepts either the
same result or a day selector. A schema-1 atlas remains a schema-1 atlas and is
read without migration. Historical source/build fingerprints remain strict;
this change does not authorize resuming an older build under changed sources.
Recertification's separate browser admission atlases remain schema 1.

Writes publish immutable snapshot indexes and mutable pointers through atomic
renames. Partial snapshots are not published. Geometry files are bounded by a
single state's record size or a reference chunk; work per simulation is
proportional to that call's states, without scanning prior days. Disk use grows
with recorded evaluations and unique bodies. The validation protocol can still
schedule more evaluations as past holdouts accumulate.

Lean reports retain all coverage counts, limits, refusals and admission verdicts.
A passing executable/design gets one gallery: the first representative per
screen plus custom shapes. The gallery retains actual text and glyph geometry
in `paint.boxes`; it omits the duplicate semantic UI, recursive paint tree and
unused line-width matrix. The small tree root remains for the existing reader
schema. JSON publication streams bounded buffers, preserving existing pretty
JSON bytes for ordinary result/verdict files.

## Reproduce without model calls

Use the committed fake day/night harness with a 1 GiB heap cap. It exercises the
normal orchestrator, training, validation, recording and nightly code. Lean mode
uses synthetic semantic states with the existing native layout executable;
browser mode uses synthetic geometry and starts no browser. Neither is evidence
of clinical performance or browser-process memory use.

```sh
export TMPDIR=/home/saithat/Projects/run-tmp
node --expose-gc --max-old-space-size=1024 \
  --import ./agent/node_modules/tsx/dist/loader.mjs \
  agent/test/recording-memory-harness.ts \
  --out "$TMPDIR/run-leak/example-lean" --mode lean --days 8 --snapshots
```

Repeat with `--mode browser` and a fresh output directory. `--replay-from
<prior-run-directory>` uses recorded fake responses and refuses prompt drift.
`--states N` controls the synthetic atlas size. Each day/night prints
`process.memoryUsage()`, geometry/report bytes, largest file and elapsed time;
`memory.json` stores the measurements. `--snapshots` writes heaps after days 1
and 8. Delete snapshots after analyzing them; they can be much larger than the
live heap. The regression test uses a separate Node process with forced GC and
a 256 MiB cap, requiring less than 4 MiB additional retained heap from days 2–7.

## Measurements

Measured against the source at the start of this change, using eight fake days,
one persona, 200 synthetic states per call and no model calls. Memory is MiB;
disk sizes are decimal MB. The browser column measures the recording process
with fake geometry, not a long browser recording. Concurrent browser audits on
the shared machine make wall times approximate.

| Mode | Retained heap day 1 → 8, before / after | RSS day 1 → 8, before / after | Geometry at day 8, before / after | Reports at day 8, before / after |
|---|---|---|---|---|
| Lean | 56.60 → 80.99 / 54.25 → 58.06 | 257.05 → 285.95 / 249.88 → 260.31 | 53.55 / 2.38 | 56.89 / 1.25 |
| Browser geometry fake | 55.51 → 72.45 / 53.88 → 56.25 | 234.12 → 268.35 / 237.43 → 258.12 | 17.95 / 1.93 | 0 / 0 |

Average retained-heap growth was 3.48 → 0.55 MiB/day in Lean and
2.42 → 0.34 MiB/day in the browser fake. Geometry growth was
7.30 → 0.32 MB/day and 2.46 → 0.26 MB/day, respectively; Lean report growth
was 7.59 → 0.15 MB/day. Largest geometry files fell from 9.84 MB to 27.1 KB
in Lean and 2.88 MB to 20.3 KB in the browser fake. Lean day phases after
startup took 1.81–2.84 s before and 1.34–2.24 s after. Browser fake day phases
took 0.24–0.41 s before and 0.46–0.76 s after: additional atomic small-file
writes cost time on these tiny representative atlases. Median day plus night,
excluding startup and the final day without a night, was 6.53 → 6.44 s in Lean
and 1.53 → 2.73 s in the browser fake. Night work intentionally includes all
past training evidence and the required holdout evaluations.

A separate controlled geometry stress test used two calls/day, 200 states/call
and 50 controls/state. Heap snapshots and a graph reachability comparison
identified the closure edges named `cache` and `collected` in `geometryEhr`.
Together they exclusively retained 5.08 MB after day 1 and 40.58 MB after day 8
in both modes. Their replacement, `pendingCaptures`, retained 184 bytes at both
checkpoints. This is a combined retained-size measurement: the old Maps share
boxes, so adding their separate retained sizes would undercount them. Time per
pair grew to roughly 7.8 s before; after warm-up it stayed near 0.3–0.4 s.
The smaller forced-GC regression retained 10.26 MB on the old implementation
and 0.23 MB on the new implementation, exceeding/passing the 4 MiB bound.

Eight-day fake recordings replayed through both modes with zero prompt drift.
Across the pair, 146 day/baseline/control/training/program/certificate JSON
artifacts were byte-identical. Decision content matched after excluding
recording timestamps and replay-backend provenance. A literal identical
manifest is incompatible with recording a new format version and changed source
fingerprints: manifests also differ in timestamps, paths, content digests and
cache performance counters. Clinical results, native verdicts and certificates
were not normalized to obtain the byte comparison.

## Ten-day projection and limits

The stopped three-day, five-persona Lean recording contains 10,808,214,348 bytes
of geometry and 29,109,708,364 bytes of reports; its largest atlas is
496,181,007 bytes. Linear extrapolation alone gives at least 36.03 GB geometry
and 97.03 GB reports at ten days, with an atlas around 1.65 GB. That atlas
cannot be serialized as a single V8 string. The observed 6.6 GB RSS after day 3
would extrapolate to approximately 22 GB, before allowing for nonlinear peaks.

A read-only streaming inventory of that recording found 216,237 stored states
but only 1,241 distinct geometry bodies after removing event-alias duplication:
9.24 MB of bodies and 30.76 MB of state references. Allowing two reference sets
for captured and enriched snapshots gives approximately 70.75 MB for three
days, plus small indexes. Applying the report projection retains 1,114 samples
across 70 exact designs and approximately 233.28 MB of reports. At the same
recorded evaluation/design rate, ten days project to **0.24 GB geometry and
0.78 GB reports**, about **1.02 GB combined**, plus journals and other run data.
These are storage-format projections over old evidence, not a new ten-day
recording or a claim that new dense layouts have identical geometry.

The dominant retained-atlas slope is removed. Five persona wrappers plus the
coordinator would retain approximately 1.1 KB in empty capture Maps after calls
complete, independent of a ten-day horizon; current-call state/paint payloads
remain proportional to concurrent workload. A defensible real five-persona
RSS or total runtime forecast still needs a new replay at that workload: the
current tests bound evidence retention, while peak semantic screens, native
child buffers, clinical memory and allocator high-water marks depend on the
actual workload. The full browser audit is a separate renderer check; it does
not measure multi-day browser recording memory.

## Verification

Baseline source was `da9156c2`. Commands ran with
`TMPDIR=/home/saithat/Projects/run-tmp`; the source archive, runs, logs and
analysis scripts are under `$TMPDIR/run-leak`, outside git.

```sh
pnpm --config.verify-deps-before-run=false --filter agent test --maxWorkers=2
pnpm --config.verify-deps-before-run=false --filter agent typecheck
pnpm --config.verify-deps-before-run=false --filter agent lint
```

Results: 300 tests passed, 64 data-dependent tests skipped; typecheck and lint
passed. The focused `vitest run test/recording-growth.test.ts --maxWorkers=1`
also passed all six tests. The unavailable archive-dependent tests were not
replaced with weaker fixtures.

The final committed-core replay commands were:

```sh
node --expose-gc --max-old-space-size=1024 --import ./agent/node_modules/tsx/dist/loader.mjs agent/test/recording-memory-harness.ts --out "$TMPDIR/run-leak/final-commit-replay-lean" --mode lean --days 8 --replay-from "$TMPDIR/run-leak/final-before-lean/run"
node --expose-gc --max-old-space-size=1024 --import ./agent/node_modules/tsx/dist/loader.mjs agent/test/recording-memory-harness.ts --out "$TMPDIR/run-leak/final-commit-replay-browser" --mode browser --days 8 --replay-from "$TMPDIR/run-leak/final-before-browser/run"
python "$TMPDIR/run-leak/compare-commit.py"
```

Both completed with zero drift and no clinical artifact differences. The
comparison JSON is `$TMPDIR/run-leak/comparison-commit.json`. The atomic gallery
publication follow-up changes directory visibility, not paint or result bytes.

The required full browser pair ran serially, with four workers:

```sh
```

Templates: 1,956 states, 18,774 measurements, zero findings (1,810 s).
Personas: 1,394 states, 13,428 measurements, zero findings (891 s). Audit
subprocesses used a local `pnpm` wrapper that adds
`--config.verify-deps-before-run=false`; dependencies and app sources were not
changed. An existing app build was prepared with
`pnpm --config.verify-deps-before-run=false --filter app build` because this
worktree initially had no `app/dist/build.json`.

A staged-only compatibility check passed schema-1 loading, exact schema-2
lookup, concurrent dashboard-slice coalescing and pointer/scroll parity. Those
four consumer files are still unchanged in the worktree. The browser audits
check the renderer; they do not establish format-2 integration in those readers.
No Lean source was changed, no model backend was called, and no recorded run
or certificate was rewritten. Snapshots created for this analysis were deleted.
