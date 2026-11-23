# Nightly design discovery with Lean screens

[Overview](../../README.md) · [UI language and G1–G11](ui-library.md) ·
[Agent loop](agent-loop.md) · [Simulated clinicians](simulation.md) ·
[First local result and verification](../audits/lean-nightly-first-result.md) ·
[Layout-rule and prompt measurements](../audits/layout-rules-discovery.md)

New recordings use the Lean screen gate and hill climbing. Each persona has a separate program, history and layout design. Native Lean admits custom layout families and the dense reference. The clinical page paints them with Lean WASM. The measurements below document the original design study. See [hill climbing](hillclimb-night.md) for current commands.

## Design sidecars and admission

The Lean Program schema is unchanged. In this mode the candidate's existing
RFC 6902 patch also accepts `/layouts`, a separate array initially equal to
`[]`. The patch handler removes it before parsing or serializing the Program.
Two compatible entry forms are supported. Existing literal cases still use:

```text
{ screen: screenId, shape: nativeSlotShapeArray,
  layouts: [{viewport: {w, h}, tree: Node, components?: definitions}, ...] }
```

Rules avoid writing a tree for every shape and viewport:

```json
[{"screen":"w1Orders","rules":[
  {"kind":"firstViewport","target":{"id":"w1Orders.orderSearch"}},
  {"kind":"beside","target":{"id":"w1Orders.orderSearch"},"anchor":{"id":"w1Orders.orderList"}}
]}]
```

The example IDs must exist as native occurrences; consult the actual persona's
Program and traces. `screen` is an ID or `"*"`; optional `screens: [ids]`
restricts an entry to several named screens. Selectors combine `id`, native
`kind` and native `role` by AND. Entries and rules run in array order.

| Rule | Meaning |
|---|---|
| `firstViewport {target}` | Lift the selected subtree to the start of the body scroll, before navigation. |
| `region {target, region: "body" \| "side"}` | Lift a subtree into the body or the 158-pixel side column. |
| `columns {target, count, tracks?}` | Arrange a group's visible child subtrees in rows of `count` columns, optionally with positive relative track weights. |
| `order {targets: [selectors]}` | Put selected siblings first in the requested order; retain all remaining siblings. |
| `beside {target, anchor}` | Merge two disjoint subtrees into a two-column row at the anchor. |
| `pin {target}` | Reserve a fixed row above the commit bar, shortening the body viewport accordingly. |

Every transform starts with `layoutFor(shapeFor(nativeUI), viewport)` from the
shared dense generator. It preserves cards, sources, flags and safety text;
reflows complete occurrence subtrees; and sorts reading order deterministically.
This transform is **untrusted**. Native `family-check` checks every expanded
family at 1440×900, 1280×800 and 1920×1080 and the unchanged vendor limit.
Unknown targets, unsupported fixed/safety targets, conflicting literal/rule
cases, malformed tracks and unwitnessed screen scopes refuse explicitly.
A missing target in any applicable shape refuses that shape, so use appropriate
screen scopes. Unknown rule fields also refuse. A refused rule expansion retains
independently checked reference geometry, but its findings fail the candidate
and reach the repair loop; fallback never makes a refused proposal eligible.
Geometry replay expands and admits through this same screen gate.

Use `moveType: "layout"` only in this mode, with a patch to `/layouts`; a
candidate may include Program edits in the same patch. Collapsing a group stays
a Program edit because it changes semantics. Separate label/control placement
is not represented: the current native model exposes one field occurrence.
No Lean change is made to add that finer representation. Literal layouts retain
the existing Node/component language and exact native source/flag contract.
Removing sidecar entries restores reference geometry. Literal cases cannot share
a selected shape with rules, and must still include all three viewports.

### Evidence-first prompts

Only the opt-in wrapper changes prompt construction. It orders material as:

1. This persona's committed odd-day logs, target frequencies, recent traces and
   per-screen clicks, scroll counts/pixels and pointer travel, then train summary.
2. Current Program fragments for visited screens, current sidecar rules/cases,
   and one compact dense outline per visited screen: regions, column starts,
   first-viewport items and scroll containers. Other shapes still get their own
   independent transformation and admission.
3. The rule language and G1–G11 in plain words.
4. A screen/spec index, relevant hospital requirements, semantic/patch vocabulary,
   representative native shapes, and decision/repair context.

Repeated Program components are losslessly interned after substituting the local
screen prefix; declared default fields and template indexes expand back to the
original fragments. This reduces repetition without hiding patch targets.
Unvisited screens remain in a compact index. The full Program, full native
inventory, manual prose and recorded examples are not repeated by default.
Representative native paths support optional literal cases; they are examples,
not a design catalogue or a bound on which rules may be proposed. G1–G11 are the
only geometry admission rules; existing clinical and release rules govern
Program behavior. Both kinds of edits are explicitly in scope, aiming at fewer
clicks and scrolls for this persona.

Cost attribution uses the existing continuous pointer state machine and original
task-local scroll lookahead. Geometry is bound to the exact committed trace;
legacy flat Lean atlases are filtered by trace hash and their event aliases
rebuilt before attribution. Missing bound geometry produces explicit null pixels.
Validation, other personas and even-day traces never enter this prompt. The
most recent committed odd-day schedule supplies shared-workspace shapes, and
screen cache identity includes that workspace context. Default browser prompt
builders and their golden propose/choose/repair bytes are unchanged.

* Reference layouts first pass `program-check`, retaining the universal
  fixed-shell certificate and unchanged spec density default.
* Literal cases and expanded rule cases pass `family-check` at the applicable screen limit. Actual
  `family-paint` also checks source/target/banner/modal/commit linkage; arbitrary
  agent-provided source paths or flags cannot replace the native inventory.
* Every shape without a custom case uses the shared
  [dense reference](reference-layouts.md), in both arms. Lean checks it at all
  three viewports and the unchanged per-screen limit. A refused dense case uses
  a separately checked fixed-shell fallback at that same limit. Refusal of both
  fails the gate. A custom case that matches the shape must pass; its refusal
  does not silently select a reference. Missing viewports, duplicate cases and
  unwitnessed custom shapes still refuse admission.

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
changes; they never count as an acceptance. `family-paint`
paints dense, fallback and custom trace states. Standalone
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
boundary reveal test (not a complete nested-clip visibility test). Navigation
links and individual tab choices have their own target boxes. Tab events use
their index to select the exact target center. List contents in
safety text scroll independently; bounded interactive lists remain open. Exported
variants and observed trace replay are finite evidence, not a proof that a
custom family covers every reachable state. A new shape receives its own dense/fallback admission before it can be
counted as measured; a previously admitted shape never admits another shape.

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

The manifest records `referenceGeneratorVersion`, per-day/persona
`referenceUsage` (dense, checked fallback, custom and refused state counts), and
bounded-cache `referenceStats` (uncached shape admissions, hits and admission
milliseconds). Counts cover all geometry evaluations: agent, no-agent,
canonical, training and validation. They count repeated event states, not just
unique shapes. The generator source hash joins the Lean-only resume
fingerprints. Shape admission/geometry is cached independently of patient text;
the thousand-state regression requires only one family admission. Timing fields
remain excluded from content digests. See the
[default integration evidence](../audits/dense-reference-defaults.md) for the
real P3 day, scripted/replay runs and throughput measurements.

To test just the gallery (one worker, a bounded lock wait):

```sh
flock -w 120 "$TMPDIR/vgi-browser-heavy.lock" pnpm --filter app exec playwright test \
  --config src/browser/discovery/playwright.config.ts --workers 1
```

## What remains before deployment

The deployed path needs an interactive painter for real users; actual events
sent to Lean `step`; focus, keyboard and ARIA wiring to the proved keyboard
transitions; full visual fidelity to today's React screens;
bounded interactive lists; and an explicit coverage strategy for structural
state growth, including workspaces, panels, modalities and release changes.
The current screen fidelity, browser rendering and assistive-technology
assumptions also remain. This mode does not switch the deployed painter or
justify replacing those checks for real users.

Manual diagnostics: `node scripts/discovery/gate-benchmark.mjs "$TMPDIR/gate"` checks six native families; `node scripts/discovery/rules-benchmark.mjs "$TMPDIR/rules"` checks eight rules through the screen gate (requires built `ui-layout`).
