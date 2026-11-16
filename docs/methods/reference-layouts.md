# Dense reference layouts

[Overview](../../README.md) · [Layout language](ui-library.md) · [Screen validation](screen-validation.md)

`scripts/layout-reference/` generates untrusted vendor reference layouts for the
research painter. Native `ui-layout family-check` admits each structural case at
1440×900, 1280×800 and 1920×1080. This does not change the deployed painter,
clinical rules, certified app hash, Lean definitions or proofs.

The generator follows the current compact shell: a 96px patient-banner reserve,
horizontal navigation, heading, optional 158px summary pane with an 8px gutter,
compact safety-text cards, wrapping control rows and width-dependent columns.
The summary and content columns share one vertical scrolling body, matching
the vendor document's coupled scrolling rather than introducing independent panes.
Collapse controls share their section's heading row; choice wrappers occupy
field columns. Table reserves grow by 24px per row plus a 22px heading, with a
36px minimum, rather than capping long tables at a constant height.
`columns` uses its available width, with two tracks from 768px and three from
1200px, capped by child count. A current-task commit stays fixed at the bottom;
modal occurrences use a higher fixed layer. Each safety-text slot preserves
unlimited content through its own wrapping text scroller. No clinical text is
truncated to achieve admission. The typography uses the research painter's
pinned 12px/18px metrics, with 14px/22px headings.

## API and admission

```js
import {layoutFor, shapeFor, viewports} from '../../scripts/layout-reference/generator.mjs';
import {ReferenceLayouts} from '../../scripts/layout-reference/admission.mjs';

const shape = shapeFor(screen);
const tree = layoutFor(shape, viewports[0]); // authoring only; not admitted
const cache = new ReferenceLayouts({cacheDir: process.env.TMPDIR + '/reference-cache'});
const result = cache.get(screen, {maxTargetsPerViewport: measuredLimit});
const painted = cache.paint(result, screen, viewports[0]);
```

Viewport dimensions are in **1/64 CSS pixels**: 1440×900 is `{w:92160,h:57600}`.
`layoutFor(nativeShape, viewport)` also accepts the bare `SlotShape[]` returned
by `family-check`; that loses the widget hints used to reconstruct columns.
`shapeFor(screen)` adds content-free widget kinds, narrative-field classification
and table row counts to the native slots. It never retains labels, patient
values or control IDs. Every semantic occurrence, including section, column and
tab-body wrappers, gets exactly one linked source. Leaf order is sorted by the
resulting row and column positions for G8. Lean independently derives the
authoritative semantic shape and checks flags, completeness and G1–G10.

The native semantic shape erases table row counts. The augmented reference
shape includes them, so different row counts can receive different geometry.
Order-line controls already introduce different native occurrence paths.
Unbounded text inside an unchanged row count keeps the same geometry and
scrolls within its safety slot. Geometry does not depend on character counts.

The cache key binds the generator version, actual generated trees, native
shape, density limit, and SHA-256 of the native checker binary. Equal native
shapes and equal geometry can share admission even when authoring hints differ.
Admission references erase patient strings; their authoritative native shape
is unchanged, and actual content is bound only for painting. Receipts contain
no reference patient payload. Writes are atomic and checksummed; incomplete or
corrupt receipts miss. Accepted and refused dense proposals are both retained.
In-memory admission and painting caches are bounded to 256 entries; persistent
receipts retain shapes evicted from memory.
On a dense refusal, `family-paint` supplies G1–G9 findings in addition to G10;
semantic linkage failures are recorded separately. Transport failures never
become admission or fallback success.

A refused dense case uses the serialized `fixed-shell-v2` geometry: 48px rows
on a 56px pitch, a fixed banner and commit, and fixed modal occurrences. The
fallback also goes through `family-check` with the **same** screen limit. The
universal fixed-shell density theorem guarantees capacity 15; it does not
guarantee arbitrary limits below 15. If a supplied lower measured limit refuses
both layouts, `get` throws with both sets of findings, writes a refusal record
under `cache/refusals`, and returns no layout. No limit is raised automatically.

## Density references

`limitFor` selects the exact persona/release/screen measurement in
`docs/audits/r5-per-screen.json`, supplemented by the vendor-reference limits in
recorded `screen-policy.json` files when supplied. It takes the maximum across
those vendor measurements for the same persona, release and screen, as the
screen policy takes a maximum across reference states. It never takes a
candidate's measured count as its limit. Each report retains the limit and its
source paths. Screens without any measurement use Lean's unchanged **15**,
not the deployed painter's absent-id fallback of 57.

The recorded references matter for populated workspaces. For example, the
three-bundle P1 `home` measurement is 6, while recorded vendor workspaces contain
additional patient controls. Applying that empty-workspace measurement to a
populated workspace can refuse even the fixed shell. The report includes
workspace reference measurements instead of borrowing density from another
screen or changing G10. These aggregate historical measurements are a practical
reference, not a fresh measurement on every exact replayed payload.

## Family-file interface

```sh
export TMPDIR=/home/saithat/Projects/run-tmp LEAN_NUM_THREADS=2
node scripts/layout-reference/cli.mjs \
  --program releases/v1/personas/P1.json \
  --states "$TMPDIR/reference-layouts/pilot" \
  --density-run /home/saithat/Projects/VGI-Health/runs/rules3-10day-invalid-simloop \
  --cache "$TMPDIR/reference-layouts/cache" \
  --out "$TMPDIR/reference-layouts/P1-family.json"
```

`--states` accepts a UiScreen, an array of UiScreens, or a directory of UiScreen
JSON files. Each state must name a screen in the Program. The output is a
manifest of per-screen limits and individually selectable variants. Select the
variant by `shapeFor(actualScreen)`; each variant's `references` is a standard
Lean family descriptor. Pass it to `family-check` or `family-paint` alongside
the containing screen's `maxTargetsPerViewport`. Variants with different table
row counts stay separate descriptors: combining them into one native family
would select the first matching native shape and lose the row-count distinction.
The manifest binds the supplied Program's SHA-256 but is not a clinical
certificate or a universal coverage proof.

## Reproduction and outputs

```sh
export TMPDIR=/home/saithat/Projects/run-tmp LEAN_NUM_THREADS=2
(cd lean && lake build ehr ui-layout ui-port-audit)
node --test scripts/layout-reference/reference.test.mjs scripts/ui-library/family.test.mjs
node scripts/layout-reference/report.mjs --out "$TMPDIR/reference-layouts"
node scripts/layout-reference/benchmark.mjs --out "$TMPDIR/reference-layouts" --count 100
node scripts/layout-reference/visited.mjs --out "$TMPDIR/reference-layouts"
```

The read-only recording root defaults to `/home/saithat/Projects/VGI-Health`;
override it with `--recordings-root`. Both reports default to `core-10day` and
`rules3-10day-invalid-simloop`; `--runs` accepts a comma-separated subset.
`visited.mjs --days 1` is a small diagnostic. All data stays under the output
directory. The report tools reuse existing TypeScript/native adapters; local
workspace dependencies and the copied Lean cache must be available.

`report.json` covers all fifteen release/persona Programs, exported group/tab
variants and synthetic alert-geometry probes on the Abdul Sauer fixture. It
also maps the no-agent day traces to the same target-sensitive representative
variants used by the stored browser atlas. `days.md` contains every recorded
persona/day's fixed, dense/fallback and stored-browser scroll count, scroll
distance and pointer travel. It reports missing states and missing targets
explicitly. These representative probes do not establish exact state coverage.

`visited.json` supplies that separate empirical coverage check. The existing
`scripts/trajectories/Contexts.lean` reconstructs each no-agent task's clinical
episodes and seeds with the recorded Program and frozen spec. A serial native
`ehr serve` process replays transitions and renders each actual event pre-state.
The display projection merges each task's synthetic FHIR resources in schedule
order; the episode Facts and clinical transitions come from Lean. Both native
context and event-result mismatches are reported. `visited-days.md` gives the
three-way comparison for those states; repeated pre-states count in the state
share, and distinct augmented/native shape counts are reported separately.
Absent persona-day files in a partial archive are listed in `absentDays`;
they contribute no inferred states or measurements.

Both reports record admission cache hits/misses, time spent on uncached
admission and layouts per second. That throughput includes process startup,
all three viewport checks, diagnostics and fallback admission when required;
it is not a benchmark of the Lean kernel or a warm-cache throughput claim.
`benchmark.json` separately times 100 distinct cases using a fresh memory-only
admission cache, independent of coverage-run cache reuse.

`native-screens/*.jsonl.gz` preserves native event pre-state screens separately
from layout measurements. Those snapshots bind the native executable, extraction
adapter, frozen inputs and recorded world/fixture fingerprints; checksummed
receipts detect incomplete or corrupt snapshots. Changing the layout generator
therefore reuses native rendering while still requiring fresh geometry admission.
Completed persona-day measurements also have checksummed checkpoints. All these
files remain untracked under the output directory.

For a small serial visual comparison, start a dev server in another terminal:

```sh
TMPDIR=/home/saithat/Projects/run-tmp pnpm_config_verify_deps_before_run=false \
  pnpm --filter app exec vite --host 127.0.0.1 --port 4197 --strictPort
node scripts/layout-reference/screenshots.mjs \
  --out "$TMPDIR/reference-layouts" --url http://127.0.0.1:4197
```

`visual/<persona>-<screen>/vendor.png` and `dense.png` show exactly the same
UiScreen at 1440×900, with original content bound for painting. The screenshots
use the current stock React painter and the isolated research painter, one
browser page at a time. `screenshots.json` records the selections and page
errors. The full WCAG/screen audit pair and full Playwright suites are not
needed for this isolated research generator.

## Fidelity and metric limits

Admission establishes the unchanged layout predicates; it does not establish
visual equivalence or that a text card is a working clinical widget. The
following adapter/language gaps prevent full vendor fidelity without Lean work:

- Navigation is one noninteractive semantic text slot. Individual navigation
  button identities, labels and action targets are absent from the inventory.
- A tabs node exposes the combined tab caption and selected body, not each tab
  choice as a target. The geometry reports explicitly mark navigation and tab
  centers as proxies; their missing targets are not silently invented for G10.
- A field is one target/text slot. Input, unit, source, confirmation button,
  checkbox and code-choice targets are not separately represented. Disabled
  fields/buttons still have `semanticTarget = true`, unlike enabled DOM counts.
- A table is one unlimited safety-text slot. Cell geometry, column headings,
  row-action attachment, variable-height rows and conditional presentation
  structure are absent from its native shape. Row-count hints reserve space but
  cannot reproduce HTML table layout or content-dependent heights universally.
- The fixed-shell fallback and dense safety cards expose local text scrollers;
  the vendor generally uses a longer document. The metric model does not charge
  reading through the complete contents of every local text scroller.
- The language can position rectangles and grids, but the semantic bridge does
  not expose the vendor's icons, chart glyphs, labels/values in separate cells,
  content-measured sticky header heights, or widget keyboard
  dispatch. Adding nonsemantic decorative shapes cannot repair those omissions.

Absolute placement can express static icons and masonry arrangements. This
generator does not yet reproduce those decorations or the vendor's balanced
read-only card columns; those are authoring omissions. The separate semantic
binding gaps above, and content-measured row/parent heights under an otherwise
content-independent geometry contract, require adapter or language work for
full fidelity across arbitrary payloads.

Pointer travel starts at viewport center once per day. Scroll positions reset
on screen navigation; explicit scroll events page down the first available
region, and off-screen targets reveal using native clip geometry. The visited
metric also checks the enclosing clip bounds, while the existing stored browser
metric's reveal decision checks the page bounds. Retained browser measurements
belong to their recorded app build and representative geometry atlas. The fixed,
dense and browser totals therefore describe different geometry models on the
same recorded event trace; they are not fresh simulations with recalibrated
scroll decisions. Original scroll events are retained even when a denser layout
would allow a new simulator policy to omit them. No savings from these tables
should be attributed to a layout agent until these residual differences are
accounted for.
