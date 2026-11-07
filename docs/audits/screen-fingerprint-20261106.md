# Screen fingerprint lane verification — 2026-11-06

Branch: `lane/screen-fingerprint`. No pushes, certificate regeneration or data
changes. `CLAUDE.md` and applicable `AGENTS.md` were absent from this worktree.

The canonical encoding is defined once in Lean, exported to WASM and `ehr serve`.
An independent host implementation checks the serialization of the exact painter
object before SHA-256 hashing. The command request ID binds the ordered evidence.
Native comparison runs before any append. Existing version-conflict refusals
retain priority; a reordered journal receives a screen fault even if its altered
state also fails the native guard. The native guard and CAS acceptance conditions
are unchanged. A mismatch or missing
frame rolls back the entire transaction, including the request reservation, with
422 `screen_fingerprint_mismatch`; corrected evidence may reuse the ID.
Accepted event envelopes retain the verified evidence. Logs contain request ID,
step, browser/native hashes, patient version, and release name/hash.

Every ready position since the patient session's last successful command is
required. Intermediate loading frames are checked if actually painted. Field
edits are retained individually. Returning to the directory resets clinical state
and journal together at native init. Uncertain saves block new interactions.
Interaction previews may use version-bound native caches; fingerprint comparison
always reconstructs independently. Post-command chart and directory reads use
the writing transaction's current snapshot. Hydration/post-command screens use native
projections to avoid browser-only recomputation of the display.

## Commands and results

All commands ran in this worktree. Shared shell setup:

```sh
export TMPDIR=/home/saithat/Projects/run-tmp CI=true LEAN_NUM_THREADS=4
```

Dependencies:

```sh
pnpm install --frozen-lockfile --store-dir "$TMPDIR/pnpm-store"
```

Passed. The default pnpm store was unavailable in the sandbox; the disk-backed
writable store resolved that setup failure. No lockfile change.

Lean:

```sh
(cd lean && lake build)
(cd lean && lake env lean "$TMPDIR/fingerprint-axioms.lean")
```

Both passed. The axiom input was:

```lean
import Ehr.Render.Api
import Ehr.Cli.Serve
#print axioms Ehr.Render.UiScreen.canonical
#print axioms Ehr.Render.apiScreenCanonical
#print axioms Ehr.Cli.Serve.dispatch
```

Each reports only `propext`, `Classical.choice`, `Quot.sound`. No theorem statement,
spec, property or definition in the protected directories was edited; no theorem
was added or changed. Serialization injectivity is tested through an independent
wire decoder, rather than proved.

WASM (read-only toolchain source links under this worktree's ignored `.tools/`):

```sh
export JOBS=4 EMSDK_QUIET=1
source .tools/emsdk/emsdk_env.sh
export EM_CACHE="$TMPDIR/fingerprint-em-cache"
python3 wasm/build_ehr.py
bash wasm/install-into-app.sh
node scripts/wasm-assets.mjs --write
node scripts/wasm-assets.mjs
```

Passed, including export `ehr_screen_canonical`. Emscripten's default shared
cache was read-only; a writable copy of its existing cache resolved the initial
link failure. Packaged WASM: 4,208,831 bytes. Source manifest:
`19a8eda8875547daa2f924cf40e4b4b26f66a78632813d4bbe05b31584b49e98`.
This manifest is a source/asset binding, not a certificate.

Typechecking, lint and app build:

```sh
pnpm --filter app typecheck
pnpm --filter @vgi/commit typecheck
pnpm --filter app lint
pnpm --filter app build
```

All passed. The clinical app hash and native/WASM release bindings changed.
Existing recorded certificates were intentionally left unchanged. The final local
app build hash is
`98657b3382d3a810c1ee7bcfb075f5ae653f86b18faf383538c65c8b7929a5c3`.

Targeted app tests:

```sh
pnpm --filter app exec vitest run \
  tests/screen-fingerprint.test.tsx tests/mar-session.test.ts \
  tests/ui-painter.test.tsx tests/live-projection.test.ts --maxWorkers=2
```

79/79 passed across four files. Includes the actual React painter callback
receiving the exact tampered object (removed interruptive alert), synchronous
capture before later object mutation, every intermediate edit/loading frame,
faulty/missing WASM serializer refusal, 1,000 randomized independent-decoder
round trips, Unicode/delimiter/array-order checks, and existing MAR publication,
reconciliation and painter regressions.

Targeted native/Postgres integration:

```sh
(cd lean && lake env lean --run ../services/commit/test/Fixture.lean \
  > "$TMPDIR/fingerprint-fixture.json")
export DATABASE_URL=postgres://vgi:vgi-dev-only@127.0.0.1:55536/vgi_commit
export COMMIT_FIXTURE="$TMPDIR/fingerprint-fixture.json"
pnpm --filter @vgi/commit exec node --experimental-strip-types --test \
  --test-concurrency=1 test/unit.test.ts test/workflows.integration.test.ts \
  test/mar-unit.integration.test.ts test/screen-fingerprint.integration.test.ts \
  test/clinical-adt.integration.test.ts
```

27/27 passed. Used a dedicated `vgi-fingerprint-postgres` container with 320 MB
memory limit, Postgres 16.15, 64 MB shared buffers and 32 connections. It was
removed after verification. No shared database was modified.

Checks cover matching, tampered, missing, wrongly bound and reordered evidence;
reordered stored journals despite same-version poisoned caches; no clinical
append or request reservation on refusal; corrected same-ID retry; durable
idempotency; continued checks after a successful command resets the interval;
existing workflow guard, role/unit and version checks, including unchanged ADT
stale-board 409 precedence. Native/WASM/host agreement
covers five real fixture screens and a corpus with every UiNode constructor and
UiScreen metadata field, including board/pane alerts and bounded nanoseconds.

## Short latency sample

One warm, idle, seven-step synthetic order-entry journal produced eight ready
screen comparisons. The added server verification phase measured **9.61 ms**
(from the first reconstruction call to the native guard call), of which **9.34 ms**
was native projection/init/replay/render calls. The phase includes host SHA-256 and ordered comparison. The complete HTTP command took **22.12 ms**. The previous
version-valid cache fast path skipped that reconstruction phase. This is a single
representative short sample, not a load test, long-journal estimate or percentile.
No broad timing campaign was run.

## Deferred merged checks

The owner's lane-specific “check all at once at the end” instruction supersedes
running full audits here. No full screen audit pair, recording recertification,
broad Playwright suite or long timing measurement ran. No Playwright smoke ran;
the browser boundary was exercised by React painter tests and real WASM codec
agreement. DOM/pixel and complete live-browser behavior remain merged checks.

The final merged check must:

1. Build Lean, WASM and app from the merged sources; verify the WASM manifest and
   inspect axioms for any theorem edited by the other lanes.
2. Run the complete commit/native integration and live chart/MAR/ADT browser
   regressions, especially repeated edits, selection/hydration, patient-session
   resets, command retries and several commands in one session.
3. Under `flock "$TMPDIR/vgi-browser-heavy.lock"`, run
   `scripts/audit-alert-policy.mjs` for templates, then `--personas`, sequentially.
4. Run retained-recording recertification, install the new app/WASM/native build
   bindings, remeasure as required, regenerate replay and verify strict WASM
   replay. Existing certificates cannot certify this changed app build.

No owner decision is needed to merge this implementation. Serialization
injectivity, hashing, host protocol and painter behavior remain tested assumptions;
Lean compilation and native clang remain trusted. Verification catches divergent
screen trees at command time; it does not prove pixels, human perception or
clinical actions outside a command.
