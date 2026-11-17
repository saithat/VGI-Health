# Plain DOM clinical painter

[Overview](../../README.md) · [Layout contracts](ui-library.md)

`/lean.html?persona=P1` is the live clinical page; `/`, `/ehr` and
`/?workflow=chart` open it, and the MAR dose list opens each dose on it. The
React encounter/login shell (`/?shell=encounter`), ADT, the dashboard and
replay entry points retain their renderers ([cut-over](../design/lean-ui-cutover.md)).
Lean supplies geometry, every displayed text and the role of every part; a
plain TypeScript painter patches native DOM controls into those rectangles and
formats nothing. This changes the certified application and
WASM hashes. Historical certificates must be rebound before deployment.

Use a supported desktop viewport: 1440×900, 1280×800 or 1920×1080 CSS pixels.
Other sizes refuse interaction until a supported size is restored. Sign in
through the same Keycloak account and use the same release, directory, live
session, screen journal and commit service as the existing page. Patient search,
chart loading, draft handling, receipts and signing remain in the existing
session/service code. The painter does not write FHIR or construct clinical
state. The optional authentication callback argument leaves existing callers'
URLs unchanged. The page sends the exact `/lean.html` callback and keeps its own
address, with its parameters, as the return URL; a host **Sign out** control in
the reserved bottom margin ends the identity session and returns to
`/lean.html`. Existing Keycloak installations need the exact `/lean.html`
callback URLs from `infra/keycloak/vgi-realm.json` provisioned before login
(`infra/keycloak/provision-adt.mjs` merges them); no live identity
configuration is changed by a build.

## WASM interface and layout families

`ehr_layout` accepts the same JSON request as native `ui-layout` and returns the
same compressed JSON bytes, including findings and admission. Native JSONL and
WASM call the shared `Ehr.Layout.dispatch`. `program-paint` binds the current
render input to the reference fixed shell. `family-paint` accepts an optional
array of `FamilyReference` values and revalidates the supplied descriptors.
Keyboard requests call the existing proved `Keyboard` functions. JSON errors,
uncovered custom shapes and refused viewports do not fall back to host layout.

`{"op":"inventory","screen":…}` (or `"render"`) returns every occurrence path
with its display part; `{"op":"format","name":…,"args":[…]}` calls one display
formatter by name, so native and WASM wording can be compared on any text.
The pinned Lean runtime ends the list built by `String.toList` with
`lean_box_uint32(0)`, which on 32-bit targets is an allocated object rather
than the empty list; compiled code that hands back a borrowed empty list then
frees it twice. In the WASM this crashed the existing wrapped and ellipsis
text layout on short strings and corrupted the heap in the display
formatters. `wasm/build.py` now compiles a build-local copy of
`runtime/object.cpp` that ends the list with `lean_box(0)`, as it already
patches `system.cpp` and `io.cpp`; the pinned checkout is unchanged. The WASM
test compares wrapped and ellipsis text, every formatter and the inventory of
eight P1/P3 screens with the native binary. The formatters also build their
character lists in Lean (`Format.listOf`).

Supply custom references with
`/lean.html?persona=P1&family=/runs/example/family.json`; the file is a JSON array
of `{screen, layouts?}` descriptors using the existing family protocol. Local
artifact paths retain the existing reader's same-origin allowlist. No data file
or generated family is committed. Missing shape coverage refuses the page.
The reference shell leaves a 16px bottom margin for host status feedback. The
host login/status surfaces and browser popup ink are outside layout admission;
custom families should reserve space for status feedback.
The default is the same plain JavaScript dense generator used by the Node
reports and Lean nightly mode. The page first asks Lean's `window` operation for the screen
as shown (bounded lists one page at a time), generates a content-free family
for that shape, checks all three supported viewports with WASM, then binds the
actual screen for painting. Admission is cached by augmented shape and screen
limit (256 entries). A refused dense family tries the fixed shell at the same
recorded screen limit; refusal of both makes the page inert. Transport/decoder
errors never count as successful fallback. Explicit custom families are checked
at the same limit and refuse when uncovered. `data-reference-layout` and
`data-reference-generator` retain read-only browser evidence of the selection.

Lean changes are API/export routing and narrower runtime imports only. The
layout types/fonts/keyboard files use `Lean.Data.Json` (and `Std` for keyboard
proof tactics) instead of the full `Lean` compiler umbrella so Emscripten links
only runtime dependencies. The font generator emits the same narrower import.
Introducing the painter changed no clinical rule or theorem statement. Rich
displays add new specifications and proof-preserving display/layout plumbing;
[details and validation](painter-parity.md). The layout rules were strengthened
afterwards (12 px text, 4.5:1 contrast, fixed targets in the density count,
the pinned urgent strip, one target per navigation link and tab); the
[UI library](ui-library.md) page states them. The checked API and certificate
dependencies use only `propext`, `Classical.choice` and `Quot.sound`.

## Painting and interaction boundary

Every clinical source rectangle, scroll viewport, clip, color, shape, prebroken line and
scalar advance comes from Lean in 1/64 CSS pixel units. Pinned font faces,
disabled shaping/kerning and isolated Hebrew runs follow the research painter.
There is no flex/grid/flow layout for clinical widgets. Browser-native controls
and their popups remain browser behavior. Static text is drawn in absolute
scalar cells; the full original source string is the accessible name. Focused
editors display the native editing surface in the same rectangle; blurring
restores the complete Lean text card.

Each painted box is one display part of Lean's semantic inventory
([display parts](ui-library.md)): a field's label, its control, its unit, a
table cell, a button, its blocked reason. Lean sends the part of every box
with the layout (`parts`, in box order): its role, the text already measured
and wrapped, and its state (target, component, kind, tone, selected, enabled,
row and column, the options of a select, the value kind and unit of an entry,
the placeholder). The painter draws the box from that part alone. It does not
read the `UiScreen` to find text, compose labels with values, format dates,
units or names, or choose a control kind: a `control` part becomes the native
control named by its kind, sized to its box, showing Lean's text until it is
edited; a `button`, `tab` or unconfirmed `pending` part becomes a native
button; every other part is text. The recorded datum, where a formatter
reworded it, is the box's `title`. Role and state are exposed as `data-role`,
`data-kind`, `data-tone`, `data-selected`, `data-disabled`, `data-row` and
`data-col`; the style sheet adds only inset edges by role and tone, so no
glyph cell moves and the colours Lean checked stay as they are. The banner's
runs (name, identity, badges, details, clinician) are tagged per glyph cell
from Lean's cell counts (`data-run`). `app/src/lean-ui/sources.ts` mirrors the
inventory's paths, roles and components for the agent's geometry and for
tests; the painter does not use it. DOM keys use the part's role and component
plus occurrence ordinal within a screen, so inserting a preceding part does
not replace an editing control. Focus, caret, text selection, local in-flight text,
control scroll, text scroll and native region scroll survive patches. New
clinical screens reset the region scroll offsets. Text-only changes replace
only the prebroken text layer. Scroll events translate/intersect the existing
Lean rectangles and clips; they never measure a new layout. Keyboard focus
reveals controls within those clips.

Native controls emit the same `enter`, `click`, `confirm`, `ack` and `selectTab`
events as the current renderer, using its `entryEvent` conversion for units and
tenths on the component, value kind and unit of Lean's control part. A control
is labelled by its field's label box and described by the field's other part
boxes (`aria-labelledby`, `aria-describedby`); a button is described by its
reason and hotkey boxes. No accessible name is composed in TypeScript. Events are serialized through the live session to preserve rapid
keystrokes and asynchronous command order. Composition dispatches only its
completed value. Guard refusals and service feedback appear in a live status
region. Painting must succeed before a screen enters the command journal;
layout refusal makes the root inert and blocks queued interactions.

Each tab is its own Lean target box and its own button with role `tab`:
clicking it sends `selectTab` with its index; arrows/Home/End move focus among
the sibling tabs through `Keyboard.tabs`, and Enter/Space activate the focused
tab. The tabs wrapper box holds two accessibility-only children without
geometry or text: a `tablist` owning the tab buttons and a `tabpanel`
labelled by the selected tab and owning the boxes of the shown body
(`aria-owns`, `aria-controls`, `aria-labelledby`); only the selected tab is in
the Tab order. Each navigation link is likewise its own target box and button. Native selects
use `Keyboard.listbox` for Up/Down/Home/End and retain native popup/type-ahead
behavior. Interruptive alert dialogs use `Keyboard.alertDialog`: Tab/Shift+Tab
stay inside, ordinary controls are blocked, and the invoking focus is restored
when Lean removes the alert. Escape is sent to the same profile, which ignores
it (`alertDialog_stays_open`); the painter swallows the key and there is no
dismiss event, so acknowledgment cannot be bypassed. `Keyboard.dialog`, which
closes on Escape, remains for ordinary dismissible dialogs and is not used for
interruptive boxes. Rich medication cells have checked rectangles and supplied action
controls. Table cells are grid cells: arrows, Home/End, Control+Home/End and
Page Up/Down call `Keyboard.grid` with the table's rows and columns and move a
roving focus between the cell boxes (`app/src/lean-ui/grid.ts`); Page Up/Down
keep the column and go to the first/last row shown. In a bounded list, Page
Up/Down at that edge send the list's own previous/next page event. The WASM
keyboard API exposes and tests all five profiles without reimplementing their
transitions in TypeScript.

**Admission boundary.** The semantic inventory has one target occurrence
per navigation link, per tab, per section toggle, per field control and per
unconfirmed prefill without an explicit confirmation button, so the size,
separation and density rules see every one of them; the pending field no
longer turns into a confirmation button. Table cells are occurrences with
rectangles, rows and columns of their own, laid out in shared column tracks,
and `Keyboard.grid` moves focus among them; grid ARIA ownership (rows inside a
grid element) is not built, since the boxes are flat. Geometry/text agreement
does not prove control fidelity or accessibility. Rich board modalities and widget marks use checked family geometry, with no
weakening of G1–G11.

## Widget inventory

“Works” means event behavior is supported by the DOM painter; “Simpler look”
means the semantic content/events are available in the reference text-card
layout; “Missing” identifies behavior that cannot support cut-over yet. The
inventory is exhaustive over `UiNode` constructors and separately names
important field/host interactions. Presentation-specific rich surfaces are
covered by the presentation row; their underlying child controls remain present.

| UiNode / interaction in the current renderer | Status | DOM behavior, limitation and remaining need |
|---|---|---|
| `section` and collapsible groups | Simpler look | Full heading card; the existing `toggle` child button sends `click`. Lean decides which children remain visible. No host collapse state. |
| `columns` | Simpler look | Wrapper source and all children retained in Lean's order; no CSS columns. |
| `tabs` | Works, simpler look | One button per tab in its own Lean target box sends `selectTab` with its index; roles and `aria-selected` follow Lean's `selected` flag and arrow keys call Lean. The wrapper prints nothing; an accessibility-only tablist and tabpanel relate the tabs to the shown body, and only the selected tab is in the Tab order. |
| `stepper` | Simpler look | One numbered part per step from Lean; the current step is flagged (`aria-current`). No invented navigation; current renderer also treats this as a read-only overview. |
| `field`: text and textarea | Works, simpler look | Lean's label part above Lean's control part; a native textarea in the control box; typing/composition emits `enter`; the value text returns on blur. No auto-growing editor. |
| `field`: number/quantity/qty and unit | Works, simpler look | Native nonnegative number input, step 0.1, in the control box; existing unit/tenths conversion on the unit Lean sends with the control. The unit is its own part. |
| `field`: flag | Works, simpler look | Native checkbox over Lean's text (Yes/No) sends the same boolean constructor. |
| `field`: fixed code/coded choices | Works, simpler look | Native select; options, the empty choice's caption and the selected option's label are Lean's (field choices, inherited `valueSet` or kind suffix); underlying codes are sent. Lean listbox keys; browser-native popup. |
| `field`: custom code, scan, identity, user/cosign | Simpler look | Native text entry sends the existing code/text/user constructors. Free-entry code suggestions are missing; manual barcode entry works. The stock UiNode field renderer also has no camera acquisition surface. The live service still validates identity/cosign authority. |
| `field`: search | Works, simpler look | Native search input emits `enter`; Lean owns filtering and patient selection. |
| `field`: observation-time | Works, simpler look | Lean displays the recorded instant in UTC, labelled UTC (it has no display time zone). The native local datetime editor still converts to the same epoch-minute string in the browser's zone. No changed timing policy. |
| `field`: provenance, required/human-only, pending confirmation | Works, simpler look | Source caption, required marker, human-entry marker and entry hint are parts of their own from Lean. A pending value has a `pending` part: text when an explicit confirm button exists, otherwise a button of its own that sends `confirm`; the field stays editable. |
| `info`: table/list/summary/document/status/entryTimes | Works, simpler look | Lean's caption and one part per cell with row and column, value text formatted in Lean; state cells and result flags carry a tone; an empty table says so. Uniform tables are a header row and value rows in shared column tracks; cells are grid cells (`role=gridcell`, row and column indexes). No medication cards or document sections. Late-entry times read in UTC. |
| `info`: bounded lists (pager) | Works | A paged list shows one page (Lean's window): its position ("Records 21–40 of 705") and flagged count are text parts; previous, next and next-flagged are native buttons and the page selector a native select over Lean's page options; each sends `selectTab` with the page Lean gives it. A target that cannot move is disabled. |
| `info`: structured row actions / keyboard grid | Works, simpler look | Action child buttons stay separate Lean target boxes; the dense layout puts a record's single-button actions in its row. A click, Enter or Space on any cell of a row whose record has one navigation action sends that action's own `click` (no extra target or geometry). Arrow, Home/End, Control+Home/End and Page Up/Down move a roving focus through `Keyboard.grid` over the cell boxes; in a paged list Page Up/Down at the page edge turn the page. Rows with several actions keep their buttons. |
| `alert` | Works, simpler look | Lean label, severity tone and a checked geometric severity mark; interruptive placement and inert ordinary controls remain. |
| `button`: navigation, primary commit, macro, review, toggle, add/remove, reconciliation | Works, simpler look | Native button; `click` unchanged. Enabled state comes from Lean; the complete blocked reason is its own part. Lean step owns every action, including macro confirmations and group visibility. |
| `button`: acknowledgment / explicit confirmation | Works, simpler look | `ack {alert: comp}` or `confirm {comp}` exactly as the current renderer. No automatic acknowledgment or confirmation. |
| `button`: hotkey badge | Works | A displayed hotkey activates a unique enabled button; editors, modal ownership and patient scope are respected. Ambiguous shortcuts require focus in a pane. |
| `text` | Works | Complete source and pinned prebroken visual spelling; missing scalars use Lean's escapes. |
| `presentation` | Works for rich displays; tables remain simpler | Dedicated time-grid, note/folder card and plotted trend/growth parts; complete original info/actions remain available. Tables are grids and long lists are paged (rows above). |
| `valueSet` | Works, simpler look | The wrapper prints nothing; Lean passes its options to the controls inside. |
| `chartReferences` | Works | Every reference sample/source stays readable; matching growth series overlay Lean-placed dashed reference curves. |
| `rowAction` | Works, simpler look | Child controls retain their events and separate source boxes; the wrapper names the table and row; single-button actions sit in their record's row and the row forwards a click to a single navigation action. A list named by a row action is not paged. |
| `timeline` | Works, simpler look | Lean-placed source-order axis plus the complete ordered children; no dates are inferred. |
| `datedTimeline` | Works | Lean-placed proportional UTC axis, exact timestamp/source labels, explicit undated entries and complete children. |
| `board` | Works; large boards have a simpler look | Opt-in patient-scoped live sessions, a pinned urgent rail, pane shell geometry and global modal ownership. A pane explicitly selects its named patient; other-patient selection is refused. Large clinical boards can use the checked fixed-shell fallback when the dense candidate exceeds the existing limits. |
| `patientPane` | Works, simpler look | Text/composition, controls, tabs and acknowledgment use the enclosing patient binding; repeated component IDs retain separate DOM/geometry identity. The active modal blocks foreign pane controls, including their urgent actions. |
| `UiScreen.banner`, title and side nodes | Works, simpler look | Name, identity, badge, detail and clinician runs are decorated inside the one fixed G1 banner box. No avatar; glyph metrics and Lean colours remain pinned. |
| `UiScreen.urgent` nodes | Works, simpler look | Lean pins them in a fixed strip (rule G11): outside every scroller, in the viewport and clear of every other box. The painter keeps strip boxes operable while a modal is open and blocks everything else. A state with more urgent nodes than the layout can pin is refused, not painted. |
| `UiScreen.nav` | Works, simpler look | A heading per group and one button per link, each in its own Lean target box, sends the existing `click` IDs; the active link is flagged by Lean. The dense layout places group headings and wrapping button bars before the workspace in the shared body scroller; the fixed-shell fallback places navigation after it. |
| Interruptive dialog focus | Works | Lean alert-dialog transitions trap focus; Escape cannot dismiss. Pane modal ownership is rechecked at dispatch; focus follows modal changes and returns to its invoker. |
| Review/sign persistence and draft restoration | Existing live path | Same `createLiveSession`, native screen comparison, guarded command endpoint and database. No alternate save implementation. |

The stock presentation kinds are fully enumerated below. None introduces a
new clinical event constructor; row actions use their existing child controls.
The painter retains every underlying row and action; the rows below distinguish
implemented rich encodings from the remaining table/list work.

| Presentation kinds | Current surface and interaction | New painter status / need |
|---|---|---|
| `table`, `schedule`, `trackBoard`, `orSchedule`, `worklist`, `flowsheet`, `messages`, `results` | Structured record columns/status styling; supplied row controls; an enabled single navigation row can proxy its button click | Works, simpler look: uniform records are grids in shared column tracks with state/flag tones, in-row single-button actions and whole-row navigation (rows above); long lists are paged. |
| `timeGrid` | MAR day/hour columns, medication rows, due/status cells and supplied action controls | Works: checked row/hour/cell rectangles; supplied controls retain events. Long axes wrap into blocks; complete original values remain available. |
| `folderList` | Folder names/counts/details and supplied child row controls | Works, simpler look: folder cards retain names/counts/details; supplied controls remain separate. |
| `notes` | Note metadata/cards and provenance-aware title/body text | Works, simpler look: grouped cards retain complete metadata/body/provenance, with internal text scrolling. |
| `trend`, `growth` | Read-only numeric/time charts and tabular records; growth reference percentiles from context | Works: Lean-placed paths/points, axes, endpoint and point labels, and matching reference curves; complete tables retained. Unsupported numeric/date strings stay unplotted. |

`PresentationBundle` overrides in the current renderer add `Box`, `Stack`,
`Group`, `Paper` and `Flex` wrappers around the original node. They are ignored
by this page in favor of the chosen Lean layout family. The separate offline
command/spatial/dated research host in `Exotic.tsx` is not a live clinical entry;
this change does not alter that tool. A native command palette or spatial host
would be additional work if chosen for a future clinical cut-over.

## Validation and measurements

Run from the repository root with restored local synthetic fixtures, dependencies,
the pinned Lean/Emscripten toolchain and a disposable Postgres database. Browser
tests use one worker under the existing shared lock. They use synthetic OIDC
authentication and the production `/lean.html`, packaged WASM, full v3
P1/P2/P3 programs, native service replay, screen comparison and real Postgres
writes. The scheduled-dose test substitutes notification streaming. The patient is generated in the service process; no patient,
run or certificate data is added to git. Keycloak itself is outside these tests.

```sh
export TMPDIR=/home/saithat/Projects/run-tmp CI=true LEAN_NUM_THREADS=4 JOBS=4
export ELAN_TOOLCHAIN=leanprover/lean4:v4.35.0
# On worktrees with an already restored dependency tree:
export pnpm_config_verify_deps_before_run=false
(cd lean && lake build && lake build ui-layout)
make wasm
make wasm-check
node --test scripts/ui-library/wasm.test.mjs
pnpm --filter app typecheck
pnpm --filter app lint
pnpm --filter app test --maxWorkers=4
pnpm --filter app build
node --test app/scripts/lean-bundle.test.mjs
# DATABASE_URL must identify a disposable Postgres instance.
flock "$TMPDIR/vgi-browser-heavy.lock" pnpm --filter app exec playwright test \
  --config src/lean-ui/playwright.config.ts
```

The bundle audit traverses every static and dynamic emitted chunk and checks
both module identities and chunk text. The report is emitted as
`app/dist/lean-bundle-report.json`. Byte totals exclude CSS, font files, HTML and
the shared separately loaded WASM/runtime loader; font faces load on demand.
The complete pinned research font set is 5.52 MiB; an ordinary 400-weight Latin
page requests its 60,004-byte face. WASM layout timing includes JSON encoding,
parsing and the boundary call; it is sampled, not a responsiveness guarantee.

The earlier v8 measurement below covered six P1/P3 screens at all three viewports,
including program and family painting (36 byte comparisons), all 65
profile/key combinations, and error paths. The browser differential checks
outer DOM rectangles after clip translations, Lean text line widths and
independent intrinsic browser glyph advances on the workflow screens. Focused
native editor glyphs/popups are outside the static-text differential.

Measured results for this implementation, with display parts and the dense
reference layout (v8) on the page:

| Check | Result |
|---|---|
| Native/WASM layout, keyboard, formatters, inventory, runtime lists | 6 tests passed; 36 byte-identical paint requests, 65 keyboard comparisons, 1,365 formatter comparisons, 2,319 parts on eight P1/P3 screens, wrapped/ellipsis text on twenty strings |
| Native layout regressions | 34 tests passed; reference generator 21 tests passed |
| App unit tests | 343 passed; 32 existing opt-in/data-dependent skips |
| Browser workflows | P1 note + prescription signed; P3 nursing assessment filed; 2 tests passed, one worker; all five page selections used the dense layout |
| Browser differential | 10 snapshots, 1,718 boxes, 1,922 lines, 26,425 intrinsic glyph advances; rectangle/line worst deviation 0px, glyph worst deviation 1/64px (at the tolerance) |
| Layout in Chromium (family check on a new shape, then paint) | Landing 30 ms; P1 documentation 62 ms, orders 188 ms, signing 171 ms; P3 assessment 121 ms; other sizes 96–126 ms |
| Lean entry bundle audit | Passed: no React/Mantine modules or chunk markers |
| Shared WASM asset | 5,303,396 bytes |

The JavaScript byte sizes were not measured again. Timings are single
samples. Layout cost grows with the square of the number of boxes; screens
with very long tables (thousands of parts) were not measured in the browser
and would take seconds or more. The unsupported-viewport test checks inert
refusal and recovery. The P1 task includes real sequential typing and caret
preservation during re-layout. Full React accessibility/screen audits and the
full Playwright suite were deliberately not run for this separate renderer.
Those earlier measurements did not exercise Keycloak provisioning/login or
multi-patient board interaction. Current rich-widget results are documented in
[the parity validation record](painter-parity.md). Native service replay and durable command writes are exercised.

## Cut-over

The [cut-over checklist](../design/lean-ui-cutover.md) records what was
validated for the default-route switch, the removed obligations and their
replacements, and the remaining encounter-shell, ADT, deployment and
certificate work. [Rich display methods](painter-parity.md) describe the patient board,
scheduled-dose route, new display parts, checked marks and targeted evidence.

## Dense default verification

The targeted P1/P3 workflows can also save five 1440×900 comparisons with the
stock application on exactly the same state:

```sh
export TMPDIR=/home/saithat/Projects/run-tmp
DENSE_LAYOUT_SHOTS="$TMPDIR/dense-page-shots" \
DATABASE_URL=postgres://postgres:synthetic-painter-test@127.0.0.1:55542/painter \
EHR_BIN="$PWD/lean/.lake/build/bin/ehr" pnpm_config_verify_deps_before_run=false \
pnpm --filter app exec playwright test --config src/lean-ui/playwright.config.ts \
  workflows.pw.ts --workers=1
```

The optional capture writes `dense.png`, `vendor.png`, `screen.json` and
`evidence.json` for P1 landing, documentation, orders and signing, plus P3
assessment. It reads the actual session screen and creates no dispatch hook.
[Results and remaining fidelity gaps](../audits/dense-reference-defaults.md)
include the bundle audit and exact command outcomes. No full browser audit is
claimed by this targeted workflow.
