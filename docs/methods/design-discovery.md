# Nightly design discovery with Lean screens

[Overview](../../README.md) · [UI language and G1–G11](ui-library.md) ·
[Agent loop](agent-loop.md) · [Simulated clinicians](simulation.md) ·
[First local result and verification](../audits/lean-nightly-first-result.md)

`run-days --screens lean` is an opt-in research mode of the existing nightly
loop. The agent reads one simulated persona's training evidence and proposes
Program edits and optional free layouts together. The objective is clicks plus
scrolls saved on that persona's traces. Completion, clinical admission,
learnability and physical-interaction validation still gate each release.
There is no pointer-travel ranking, fixed Program, placement catalogue or layout
search separate from the nightly agent. P1–P5 have separate programs, histories,
memories and designs. Without the flag, the existing browser mode is unchanged.

**No browser runs in this mode.** Layout admission and the geometry used for
scroll counts, scroll pixels and mouse travel come from the existing native
`ui-layout` executable. The deployed application still paints with React. Lean
reference/custom geometry is not a measurement of that application's screens;
a successful research run has no browser screen certificate and establishes no
clinical benefit. All clinicians and patients here are simulated/synthetic.

## Run and inspect

Run from the repository root with the copied, gitignored fixtures/world and
installed dependencies. No Lean source changes or new executable targets are
needed. Keep one build process per checkout.

```sh
export TMPDIR=/home/saithat/Projects/run-tmp LEAN_NUM_THREADS=2 CI=true
(cd lean && lake build ehr ui-layout ui-port-audit)
pnpm --filter agent run-days --screens lean --days 2 --personas P1,P3,P5 \
  --backend codex --model gpt-6.1-sol --world runs/world/2 \
  --run-id lean-2day --seed-policy none
node scripts/discovery/report.mjs runs/lean-2day
node scripts/discovery/serve.mjs --run runs/lean-2day --port 5190
```

If pnpm's dependency auto-check attempts an unavailable store in this environment,
add `--config.verify-deps-before-run=false` before `--filter`; dependencies must
already be installed. Model calls use the existing confined backend. A failed
call is recorded; no fake answer is substituted. Use a new run ID after changing
code, native binaries, density snapshots or inputs. `--resume` requires the same
screen mode and fingerprints. The archive/cadence protocol and injected screen
or geometry overrides are rejected in this mode. Tests may inject explicit
semantic fixtures; live backends cannot override the native runner, states or
vendor limits.

A reproducible two-day, three-persona fake/replay exercise uses the existing
scripted and replay backends and the real `ui-layout` executable:

```sh
node scripts/discovery/smoke.mjs runs/lean-smoke
node scripts/discovery/report.mjs runs/lean-smoke/recorded
node scripts/discovery/report.mjs runs/lean-smoke/replay
node scripts/discovery/gate-benchmark.mjs runs/lean-gate-benchmark
pnpm --filter agent test --maxWorkers 2
pnpm --filter agent typecheck
```

Its clinical checker, simulator and semantic screen fixtures are fakes. It tests
plumbing and determinism, and certifies nothing. It cannot measure clinical or
human usability gains.

## Design sidecars and admission

The Lean Program schema is unchanged. In this mode the candidate's existing
RFC 6902 patch also accepts `/layouts`, a separate array initially equal to
`[]`. The patch handler removes it before parsing or serializing the Program.
Each entry has:

```text
{ screen: screenId,
  shape: nativeSlotShapeArray,
  layouts: [ {viewport: {w, h}, tree: Node, components?: definitions}, ... ] }
```

The prompt supplies every native shape and occurrence path in a lossless
dictionary encoding (shared rows, component IDs and region names). This avoids
repeating large per-state JSON and fits the measured persona requests below
Codex’s transport character limit without filtering the design space. Each case must supply
1440×900, 1280×800 and 1920×1080 in integer 1/64-pixel units. Nodes support
frames, stacks, wrapping rows, weighted/fixed grids, absolute positions, scroll
viewports, component expansion and arbitrary opaque colors and marks. G1–G11
are the only layout restrictions. Existing clinical rules still constrain
Program semantics. The prompt explains every rule and tells the agent to work
from this persona's logs/traces to reduce clicks and scrolls. Training-only
target frequencies, navigation transitions and recent trace events accompany the
ordinary nightly evidence and decision history. Validation and even-day traces never enter the prompt. Admission and prompt
exports use the most recent committed odd-day training schedule for the shared
workspace, so patient-selection and selected-chart shapes are available to the
designer; screen caches include that workspace context. Resume rebuilds this
context in day order from the committed training partitions.

* Reference layouts first pass `program-check`, retaining the universal
  fixed-shell certificate and unchanged spec density default.
* Custom cases pass `family-check` at the applicable screen limit. Actual
  `family-paint` also checks source/target/banner/modal/commit linkage; arbitrary
  agent-provided source paths or flags cannot replace the native inventory.
* Where a screen has no custom cases, the fixed-shell reference applies.
  Missing viewport cases, duplicate cases, a customized screen's uncovered shape or an unwitnessed
  custom shape refuse admission. There is no silent reference fallback for a
  mismatched custom shape.
* Reference screens with limits below 15 are checked with `family-check` over
  layout-language trees that reproduce the exact Lean shell boxes and scroll
  region. This is necessary because `program-check` uses the spec's limit and
  its static capacity decision cannot express a smaller per-screen limit.
  Neither the spec nor its default is modified.

Refusals retain Lean's findings (rule, node/peer, metric, actual, required and
signed deficit where supplied) inside the existing screen-failure message.
Candidate/merged refusals enter the existing repair flow, up to three repairs;
state-coverage refusals during training estimates can also be repaired. A
refusal on independent validation states rejects the release. Runtime/transport
failures remain errors. A deterministic layout refusal is not retried as
infrastructure failure.

Every shipped `programs/P*/vN.json` has a neighboring `vN.layouts.json` and
`vN.layout-binding.json`. The binding hashes the source Program and layouts;
loading or attempting to overwrite a version with different layouts refuses.
The clinical certificate still binds the Program only. The manifest separately
identifies `screenGate: lean`, `browserCertified: false`, the layout binary,
density inputs and geometry source. Layout identity also participates in atlas
cache keys, preventing two layouts of one Program from sharing measurements.
Research presentation output stays inside the run directory.

## Density provenance

The rule is the vendor's maximum simultaneous active targets **for that
screen**, at zero and every scroll offset; missing measurements use Lean's
unchanged 15. Candidate counts never set a limit.

[Recorded density snapshots](lean-screen-density.json) freeze existing vendor
reference measurements for all 15 persona/release combinations. Each identifies
the exact release persona Program hash and the source report, report SHA-256 and
painter context contributing each screen’s maximum. The loader verifies the current release Program's identity. These
recorded reports include the shared patient workspace, which the older
[`r5-per-screen.json`](../audits/r5-per-screen.json) persona measurements omit.
For example P1/v1 `home` is 23 in the matching recorded vendor report, versus 6
in the earlier audit; this is an existing vendor measurement, not a relaxed
candidate threshold. The exact recorded limit takes precedence, then the
matching audit vendor entry, then 15. Every admission/coverage report records
the limit and source used for each screen. No browser density measurement is
performed at night, and no rule or default is changed.

## Geometry and coverage

`geometryEhr` receives the original native simulation result. The existing
`scripts/trajectories/Contexts.lean` adapter reconstructs episode facts and initial
states; every event is replayed through the native interpreter, with result,
screen and event-count comparisons. Workspace binding uses the existing native
step. Context extraction is serialized across personas, so two `lake` processes
never run together here. It executes the existing adapter; it changes no Lean
source or target.

Native `render-ui` supplies actual visited screens. Empty-family diagnostics
retrieve their exact native erased shapes without repeated admission for value
changes; they never count as an acceptance. `program-paint`
paints reference trace states; `family-paint` paints custom cases. Standalone
admission exports use `structural-paint` after `program-check`, the same shell
box compiler. Admission checks all supplied custom viewport cases, while physical
metrics use 1440×900. Geometry is reused only after comparing native erased
shapes; labels, values and row counts do not influence those boxes. Gallery
snapshots bind a fixed real synthetic FHIR patient at admission, so before and
after views are comparable. The geometry atlas retains the observed state's
component identities and scroll chains.

The atlas schema and downstream metric code are unchanged. To stay inside the
certified-source boundary, its existing `recorded-fixture` discriminant carries
this research geometry, with an explicit `lean-layout:<binary hash>` build
identifier and source detail; the manifest and gallery identify it as Lean.
It is never labeled Chromium geometry. Private per-event target aliases select
an exact observed state's boxes without rewriting the native command trace.
Bounded remembered-location misses retain the existing measured-slot proxy and
its explicit simulation assumption; missing targets remain unavailable. The
bounded memory model still tracks Program slots rather than free coordinates;
this mode adds no new spatial relearning model.

Limitations inherited from the current physical metric include its viewport
boundary reveal test (not a complete nested-clip visibility test) and the
reference compiler's single aggregate navigation text card. List contents in
safety text scroll independently; bounded interactive lists remain open. Exported
variants and observed trace replay are finite evidence, not a proof that a
custom family covers every reachable state. A new shape refuses rather than
being counted as measured.

## Read-only gallery and timing

The loopback server serves the page under `app/src/browser/discovery`, with no
rating or mutation API. Per persona it shows a plain-language description,
daily clicks/scrolls and completion against the independent no-agent arm, then
every shipped version's changed screens, before and after, with the agent's
stated reason. Thumbnails and full-size views paint retained Lean boxes at
1440×900 using the existing painter. Missing retained views are labeled explicitly.
Added and removed screens keep the available side of the comparison.
The server indexes small headers only, checks each paint against the shipped
Program/layout hashes, and streams the selected files instead of loading the
candidate corpus into memory. Fake runs are labeled in the page header. No model or browser admission runs
when opening the overview.

`lean-timings.jsonl` records wall seconds per persona/day and persona/night,
including controls and validation; nightly totals include model calls. Wall
timings are declared provenance exclusions in the content digest; admission
findings remain content, with telemetry rows sorted independently of worker order. The
report command also gives admission checks per second and unique designs and refusals by
rule. These are local wall measurements, not clinician time. The comparison
browser recording supplied with this task took 15–20 hours for ten days, almost
all screen checks, with model calls taking about 2–4 minutes per persona/night.
A short fake run is not a matched speed comparison to that recording.

To test just the gallery (one worker, a bounded lock wait):

```sh
flock -w 120 "$TMPDIR/vgi-browser-heavy.lock" pnpm --filter app exec playwright test \
  --config src/browser/discovery/playwright.config.ts --workers 1
```

## What remains before deployment

The deployed path needs an interactive painter for real users; actual events
sent to Lean `step`; focus, keyboard and ARIA wiring to the proved keyboard
transitions; a Lean reference layout matching today's dense React screens;
bounded interactive lists; and an explicit coverage strategy for structural
state growth, including workspaces, panels, modalities and release changes.
The current screen fidelity, browser rendering and assistive-technology
assumptions also remain. This mode does not switch the deployed painter or
justify replacing those checks for real users.
