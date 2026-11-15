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

## Deployed action density (R5)

**New specification.** The screen gate measures active targets in real React
screens at **1440×900**, normal text, using pinned fonts. It checks both an active
modal (background targets excluded) and the modal-free background probe.
The first viewport counts every enabled target with positive area after document
and ancestor clipping. Hidden, inert, disabled, zero-area and transparent controls
do not count; distinct DOM targets count separately, including confirmation buttons,
links, tabs, searches and native form controls. Labels and display-only cards do
not count. The target selector matches the physical gate's controls and includes
focusable controls with `tabindex="0"`.

For scrolling, each document/nested vertical viewport is checked independently,
as in Lean G10. A target belongs to its nearest scrolling ancestor. The checker
sweeps the open visibility intervals induced by rendered target rectangles at all
boundary offsets and between adjacent boundaries (including fractional CSS pixels).
It therefore includes partial first/last rows, rather than just sampling a page at
0%, 50% and 100%. Nested regions use their own height, capped at 900 px.
Horizontal/outer clipping and paint occlusion are ignored for these scroll counts,
which is conservative. This is a per-region capacity bound, not an exhaustive
Cartesian product of simultaneous scroll offsets in all independent panes.

**Fixed-target decision:** fixed/sticky active targets outside a scrolling ancestor
reserve one slot in **every** scroll window, including the document. They count
once in the first viewport if actually visible. Contents of a fixed but internally
scrolling pane belong to that pane instead of becoming permanently fixed targets.
Sticky targets conservatively reserve their slots throughout scrolling, even before
reaching their sticky position. This keeps pinned actions from becoming free density.

**Per-screen limits are a new specification.** A candidate screen id is limited
to the maximum of these counts over every exported state of that id in its
persona's **vendor reference**, rendered with exactly the candidate's sample
bundles and optional workspace schedule/world. The vendor reference is the
no-agent arm's layout for that release, including its accepted vendor migrations.
The vendor passes its own limits by construction; a sparse existing screen cannot
borrow capacity from a dense one. A screen id absent from the reference (including
a new/merged id) uses the global vendor-calibrated **57** in
`docs/design/screen-density.json`. That fallback leaves a residual incentive to
rename/merge screens. **Lean G10's fixed-shell limit stays 15**, unchanged.

`run-days` reads `no-agent/days/day-N/<persona>.program.json`. On release nights
it prepares tomorrow's independent no-agent checkpoint before evaluating candidates;
this uses the same past validation partition and does not add control outcomes to
agent prompts. The next day's control simulation reuses that checkpoint. No-agent
release admission uses the proposed control itself as the density reference.
Nightly and archive candidates, ad-hoc reruns, rebind and batch recertification
use the corresponding actual no-agent program when available. Historical tools
bound the snapshot search to the candidate's release night. If no matching snapshot
exists at a stand-alone/offline call site, `CliScreenChecker` selects the release
vendor by persona id/owner, then role; frozen batch recertification uses its recorded
vendor canonical. An unreadable available snapshot fails closed. Program-free UI
fixtures and synthetic probes have no release reference and retain the fallback.

Every nightly deployment uses `CliScreenChecker` → `screen-check.mjs` →
`ui-check.spec.ts`. The desktop semantic check collects R5 independently of the
optional physical-policy switch. `screen-check.mjs` compares the counts **after**
expanding cached raw tree results, so a pass or failure under one reference never
becomes a verdict under another. Missing measurements are infrastructure errors.
Failures name screen id, measured count, limit and phase; `screenCheckRejection`
records that message; the next nightly prompt includes the public refusal and failed patch so the agent can repair its next proposal. The existing immediate native-check repair loop is unchanged. `screen-policy.json` retains the
reference limits, program hash/source, content/context key, cache hits/misses,
reference export/collection timings, detailed first/scroll measurements and failures. Synthetic popup geometry
probes remain excluded from admission.

Reference collection uses only the density browser pass, not the fidelity/physical
matrix. `$EHR_SCREEN_CACHE_DIR/density` (default `$TMPDIR/vgi-screen-check-cache/density`)
atomically stores checksummed per-tree counts bound to the painter build, assets,
fonts, browser/runtime, presentation bundle, capture and measurement/assertion sources.
Tree hashes bind the rendered data; changed workspace rows cause misses. Matching
ordinary gate measurements are reusable too. Each screen limit is recomputed from
all reference states, including active-modal and background phases. Corrupt/incomplete
cache records miss; `EHR_SCREEN_CACHE=0` bypasses both measurement caches. Only the
candidate runs the full screen matrix. Geometry receipts may be reused independently;
offline whole-version admission receipts are re-evaluated against today's reference.

```sh
export TMPDIR=/home/saithat/Projects/run-tmp CI=true LEAN_NUM_THREADS=4
export pnpm_config_verify_deps_before_run=false EHR_SCREEN_WORKERS=4
node scripts/audit-action-density.mjs "$TMPDIR/r5-per-screen-density"
node --import ./agent/node_modules/tsx/dist/loader.mjs scripts/check-r5-p2.mts \
  --out "$TMPDIR/r5-p2-final"
node scripts/audit-alert-policy.mjs "$TMPDIR/r5-per-screen-templates"
node scripts/audit-alert-policy.mjs "$TMPDIR/r5-per-screen-personas" --personas
```

The density collector reads every current vendor/release, retained revision and
release-matched no-agent state on adult-allergic, pediatric and surgical sample
bundles. It issues no certificates and does not modify recordings. Its tables and
current full-audit results are recorded in [the per-screen R5 report](../audits/r5-per-screen.md).
The previous single-limit result (0/33 above 57, vendor maximum 57) remains historical
in [the original report](../audits/alerts-r5-20261114.md#per-screen-counts).
The workspace regression uses the unchanged P2 v0 and day-1 workspace that previously
measured `w3OrderSets` at **61 > 57**, including order rows 10–11; it requires the
current whole-version gate to pass at its own reference limit **61** and requires
zero new reference DOM measurements on the repeat check. See the report for measured
added time and exact build bindings.

### Retained high-alert policy replay

The 33 frozen bindings are not rewritten. Hardening only their `highAlertMed`
tiers in scratch refuses **25/33** unchanged programs:

| Persona | Unchanged revisions refused | Still refused after only popup declarations migrate to inline |
|---|---|---|
| P1 | v0–v5 | v1–v5 |
| P2 | v0–v7 | v2–v7 |
| P3 | none | none |
| P4 | v0–v8 | v0–v8 |
| P5 | v0, v3 | none |

The second column includes A2 refusals for obsolete `popup: true` declarations:
the runtime now supplies the interruptive popup. The last column identifies
**20/33** revisions still refused for missing inline high-alert notices. P1's
night-1 deletion persists in v1–v5; P2 also removed its order notice from v2 onward.
P4's pediatric order screen lacked the generic notice even in v0; the new
specification adds it to current vendor baselines. These counts describe
specification compatibility, not new clinical outcome measurements. Historical
frozen-spec checks and certificates do not claim this stronger policy.

## Retained certified build and measurements

The retained recording's certified app SHA-256 is
`be573a351df139200aff4dbf0b48d24a2805c09294b4b28f00b69c3e587aafd9`
(checker `dcc80a8f…`, WASM `e1403682…`). It predates the R1/R3/R5/R7 rule
changes and the subsequent packaged runtime rebuild; the recording has not
been re-certified against that rebuild. [Combined offline rule checks](../design/metric-gaming.md#retained-recording-against-the-combined-rules)
do not replace its historical build bindings. The 2026-11-13 re-certification, after
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
