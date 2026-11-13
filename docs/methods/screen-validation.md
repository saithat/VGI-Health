# Screen validation and recertification

[Overview](../../README.md) · [Methods and reproduction](../../README.md#documentation)

`ColumnsNode` uses the group's container width: two columns from 48em and three
from 75em, each capped by its child count. Narrow-region regressions cover
768–1920px and doubled text alongside the physical screen matrix. Recheck an
offline candidate with `pnpm --filter agent exec tsx src/offline-columns-check.ts
--comparison <comparison-directory> --out <scratch>`.

## Cache and execution

Screen gates share `$TMPDIR/vgi-screen-check-cache`: `physical/` retains the
existing atomic physical samples and `results/` holds checksummed per-tree
pass/fail results, geometry and physical findings. `EHR_SCREEN_CACHE_DIR`
overrides that one root. Keys hash canonical JSON (object key order and whitespace
are irrelevant; array order is preserved), the certified app build, served
WASM/asset manifest and asset bytes, font manifest and font bytes, capture settings,
Chromium/Playwright/runtime pins, fidelity viewports, the complete physical-policy
matrix/version, assertion sources and the presentation bundle. Synthetic geometry
probes have a separate key. Run, persona, revision and path are absent from the
key. Corrupt or incomplete results miss; infrastructure errors are never cached.
Cached failures remain failures and known-bad controls run on every invocation.
Endpoint capture disables animations and transitions, loads the pinned fonts and
waits two animation frames after painting. It avoids a redundant second frame
pair and fixed timer; fidelity, geometry and physical assertions are unchanged.
`EHR_SCREEN_CACHE=0` bypasses both result and physical-sample reads/writes for an
independent comparison. Every input state retains its own result/geometry mapping.

The default pool is four workers; `EHR_SCREEN_WORKERS=1` selects serial execution,
and values above six are capped at six (browser workers also respect the existing
memory budget). Parallel `run-days` divides the default four-worker budget
across persona checkers and limits explicitly requested workers to six in total.
Distinct uncached trees run through this bounded Playwright pool.
`scripts/recertify-runs.mjs --runs core-10day --out <scratch>` concurrently
runs native deploy/export checks with isolated output directories, then batches
all revisions by presentation bundle through the same browser gate. A file
manifest avoids command-line size limits. Reports preserve persona/revision/tree
order; failed siblings retain their own refusals. Frozen spec, canonical and
previous inputs are mandatory and are never rewritten by this command. It stages
native certificates and `recertification.json` in scratch; it does not replace
recorded certificates, measurements, run metadata or replay. The migration command
below consumes this batch gate when `--recertify-only` is selected and retains its
existing certificate installation, remeasurement and strict replay checks.
Native popup geometry uses one EOF-terminated JSON-lines batch per FHIR bundle,
through the existing stateless `ehr serve` renderer. Every response must match
its request index; partial, reordered or errored batches fail before supplying
geometry. This avoids starting an interpreter for each popup. A three-bundle
P1 revision comparison preserved all 87 popup files byte-for-byte.
`core-10day` is the retained historical recording; separately labeled successor
measurements preserve its layout choices and identify their source lineage.

## Current certified build and measurements

The current certified app SHA-256 is
`be573a351df139200aff4dbf0b48d24a2805c09294b4b28f00b69c3e587aafd9`
(checker `dcc80a8f…`, WASM `e1403682…`). The 2026-11-13 re-certification, after
the [chart timing and reconciliation](../design/chart-timing.md) changes,
re-certifies all 33 retained revision bindings and refreshes 200 measurements
across 50 source shifts in its local `runs/core-10day` copy; task completion is
unchanged in all 1,548 run files that record it. It follows the procedure of the
[2026-11-10 integration](../audits/w3b-merge-20261110.md). Native and WASM strict
replay verifies 1,284 tasks and 72,636 events with zero mismatches, plus three
preserved same-task controls. All fresh geometry binds this app hash; model calls
are zero. The frozen programs, rule inputs, decisions and model responses remain
byte-identical. The 2026-11-11 re-certification (app `060f6126…`) is superseded.
The original shared recording remains historical at app hash
`030fac6d782d07099213018114de92b4facd19952201e094b4c3890e7edfef60`.

The generated Lean contract module participates in the app source hash, so the
new authoring fields change that binding despite no painter edit. The rebuilt
WASM and native binaries also receive fresh bindings; their exact hashes and
verification commands are in the integration audit.

Changes to the bound clinical sources require a new app hash and matching
recording certificates, geometry measurements and strict replay evidence. The
board controls are included in that boundary. `pnpm-lock.yaml` also participates
in the hash. Source-bound WASM assets and their manifest must match the current
Lean sources before an app build and recording re-certification.

Code-choice fields and their confirmation wrappers reserve a text-relative
minimum width inside wrapping sections. Increasing text size expands the track
instead of clipping the selected label.

Urgent alerts appearing after mount reserve their measured height immediately. The
pinned patient banner includes that height in its scroll offset;
resizing a wrapped strip updates the scroll reveal padding. The transition
regression covers appearance, document scrolling, wrapping and removal.

Renderer changes require matching certificate bindings and fresh geometry
measurements.

Cold profiling found repeated native interpreter startup and redundant browser
settling waits. Batching popups and removing those waits cut a cold P1/v1 sample
(three FHIR bundles, 981 inputs, 819 distinct trees) from 847.23s to 651.17s,
with identical verdicts, geometry and 8,046 measurement records. Measurements at
earlier app hashes are kept in [docs/audits/](../audits).

The earlier re-certification at app hash `030fac6d…` covered 33 bindings and 200
measurement outputs across 50 source shifts. That re-certification took 209.29
minutes, including a 107.37-minute batch gate. Saved and freshly regenerated
native/WASM strict replay verified 1,284 tasks and
72,636 events with zero mismatches, preserving three
same-task controls. Frozen programs/specification inputs, model decisions,
schedules and worlds 1/2 are preserved. Four stale canonical/no-agent refusal
captures on P3 days 2 and 10 now use the legacy refusal decoding already present
in the pre-change binary; every other native field in the 150 saved day outputs
is unchanged. Original enriched files are retained locally. Independently,
all 150 pre-change versus paired-opt-out native outputs are byte-identical.

That earlier full template and persona audit pair ran once, sequentially, checking
1,826 and 1,296 distinct trees with zero findings. The
[earlier verified-build report](../audits/realism-wave2-verification-20261108.md)
records commands, bindings, coverage, captures and timings. The
[prior verification report](../audits/realism-wave1-verification-20261107.md)
retains the earlier evidence and measurements.

## Reproduction

Compare cold and warm certification with one shared lock, sequential commands
and a fresh cache root for each cold experiment:

```sh
export TMPDIR="${TMPDIR:?Set disk-backed TMPDIR}" CI=true EHR_SCREEN_WORKERS=4
export EHR_SCREEN_CACHE_DIR="$TMPDIR/screen-recert-cache"
flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off \
  node scripts/recertify-runs.mjs --runs core-10day --out "$TMPDIR/screen-recert-cold"
flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off \
  node scripts/recertify-runs.mjs --runs core-10day --out "$TMPDIR/screen-recert-warm"
node scripts/compare-screen-results.mjs \
  "$TMPDIR/screen-recert-cold/recertification.json" \
  "$TMPDIR/screen-recert-warm/recertification.json"
flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off \
  node --test scripts/screen-cache-browser.test.mjs
```

The browser integration test compares real serial, four-worker, cold, warm and
cache-disabled per-tree verdicts and physical samples, including a deliberately
disabled urgent acknowledgment. For full audits, select a separate fresh cache
root, run templates then `--personas` sequentially, then repeat with that same
root for warm reports. Compare each output's `result.json` with
`scripts/compare-screen-results.mjs`; `elapsedMs`, cache hits/misses and physical
coverage are retained in reports. Compare a cache-disabled recording report too;
optionally rebuild after one small painter change, confirm misses, and restore
and rebuild before certificate installation.

`node scripts/migrate-neutral-terms.mjs --recertify-only --runs
core-10day` skips terminology/identity rewrites and selects only
those recordings. It retains frozen spec/canonical/previous inputs, applies
native and whole-version screen gates, updates build bindings, remeasures the
preserved schedules, regenerates trajectories (including existing same-task
baseline controls), and verifies strict WASM replay. Results are written to
`runs/recertification-report.json`; model choices remain recorded inputs.
Before remeasurement, incompatible atlas generations are renamed intact into
`migration/geometry-history/`, with byte-hash receipts; current measurements
use a new active `geometry/` namespace. The adapter still refuses mismatched
program/component/build bindings. Status remains pending until measurement and
regenerated replay verification finish.
The final status is written before computing the run digest, so the digest covers
the passed manifest as well as the remeasured files. Canonical hashing emits
sorted JSON incrementally, preserving the digest protocol without duplicating
large retained screen exports into another tree and full serialized string.
Rejected recertifications cannot supply conformance targets.
