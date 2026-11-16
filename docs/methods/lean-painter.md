# Plain DOM clinical painter

[Overview](../../README.md) · [Layout contracts](ui-library.md)

`/lean.html?persona=P1` is a separate, experimental live clinical page. The
existing application, dashboard and replay entry points retain their renderers.
Lean supplies geometry and safety text; a plain TypeScript painter patches native
DOM controls into those rectangles. This changes the certified application and
WASM hashes. Historical certificates must be rebound before deployment; this
page does not claim that the deployed application has switched.

Use a supported desktop viewport: 1440×900, 1280×800 or 1920×1080 CSS pixels.
Other sizes refuse interaction until a supported size is restored. Sign in
through the same Keycloak account and use the same release, directory, live
session, screen journal and commit service as the existing page. Patient search,
chart loading, draft handling, receipts and signing remain in the existing
session/service code. The painter does not write FHIR or construct clinical
state. The optional authentication callback argument leaves existing callers'
URLs unchanged. Existing Keycloak installations need the additional exact
`/lean.html` callback URLs from `infra/keycloak/vgi-realm.json` provisioned before
login; no live identity configuration is changed by a build.

## WASM interface and layout families

`ehr_layout` accepts the same JSON request as native `ui-layout` and returns the
same compressed JSON bytes, including findings and admission. Native JSONL and
WASM call the shared `Ehr.Layout.dispatch`. `program-paint` binds the current
render input to the reference fixed shell. `family-paint` accepts an optional
array of `FamilyReference` values and revalidates the supplied descriptors.
Keyboard requests call the existing proved `Keyboard` functions. JSON errors,
uncovered custom shapes and refused viewports do not fall back to host layout.

Supply custom references with
`/lean.html?persona=P1&family=/runs/example/family.json`; the file is a JSON array
of `{screen, layouts?}` descriptors using the existing family protocol. Local
artifact paths retain the existing reader's same-origin allowlist. No data file
or generated family is committed. Missing shape coverage refuses the page.
The reference shell leaves a 16px bottom margin for host status feedback. The
host login/status surfaces and browser popup ink are outside layout admission;
custom families should reserve space for status feedback.
The default is the same plain JavaScript dense generator used by the Node
reports and Lean nightly mode. The page generates a content-free family for its
current shape, checks all three supported viewports with WASM, then binds the
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
Introducing the painter changed no rule, specification, theorem statement,
proof body or clinical definition. The layout rules were strengthened
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

Occurrence paths reproduce `Semantic.screenNodes`, including wrappers and the
patient-pane child/modal concatenation. They join each placed box to the exact
`UiNode` and inherited choice metadata. DOM keys use component identity plus
occurrence ordinal within a screen, so inserting a preceding text card does not
replace an editing control. Focus, caret, text selection, local in-flight text,
control scroll, text scroll and native region scroll survive patches. New
clinical screens reset the region scroll offsets. Text-only changes replace
only the prebroken text layer. Scroll events translate/intersect the existing
Lean rectangles and clips; they never measure a new layout. Keyboard focus
reveals controls within those clips.

Native controls emit the same `enter`, `click`, `confirm`, `ack` and `selectTab`
events as the current renderer, using its `entryEvent` conversion for units and
tenths. Events are serialized through the live session to preserve rapid
keystrokes and asynchronous command order. Composition dispatches only its
completed value. Guard refusals and service feedback appear in a live status
region. Painting must succeed before a screen enters the command journal;
layout refusal makes the root inert and blocks queued interactions.

Each tab is its own Lean target box and its own button with role `tab`:
clicking it sends `selectTab` with its index; arrows/Home/End move focus among
the sibling tabs through `Keyboard.tabs`, and Enter/Space activate the focused
tab. Tab panels are not yet related to their tabs by ARIA. Each navigation
link is likewise its own target box and button. Native selects
use `Keyboard.listbox` for Up/Down/Home/End and retain native popup/type-ahead
behavior. Interruptive alert dialogs use `Keyboard.alertDialog`: Tab/Shift+Tab
stay inside, ordinary controls are blocked, and the invoking focus is restored
when Lean removes the alert. Escape is sent to the same profile, which ignores
it (`alertDialog_stays_open`); the painter swallows the key and there is no
dismiss event, so acknowledgment cannot be bypassed. `Keyboard.dialog`, which
closes on Escape, remains for ordinary dismissible dialogs and is not used for
interruptive boxes. A proper per-cell grid is missing: its cells have no
separate Lean rectangles. The WASM keyboard API nevertheless exposes and tests
all five profiles without reimplementing their transitions in TypeScript.

**Admission limitation.** The semantic inventory now has one target occurrence
per navigation link, per tab and per section toggle, so the size, separation
and density rules see every one of them. An implicit pending-field confirmation
still reuses the field's target rectangle rather than inventing another
target, and grid cells have no rectangles of their own. Geometry/text
agreement does not prove control fidelity or accessibility. Separate cell
rectangles, nested pane modalities and richer widget geometry remain cut-over
blockers, not grounds for weakening G1–G11.

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
| `tabs` | Works, simpler look | One button per tab in its own Lean target box sends `selectTab` with its index; roles and `aria-selected` are set and arrow keys call Lean. The wrapper card shows all labels and the selection. Panel relationships are still required for APG parity. |
| `stepper` | Simpler look | Complete steps/current index as Lean semantic text. No invented navigation; current renderer also treats this as a read-only overview. |
| `field`: text and textarea | Works, simpler look | Native textarea in the field box; typing/composition emits `enter`; full semantic label/value/provenance returns on blur. No auto-growing editor. |
| `field`: number/quantity/qty and unit | Works, simpler look | Native nonnegative number input, step 0.1; existing unit/tenths conversion. Unit and source remain in the full semantic text. |
| `field`: flag | Works, simpler look | Native checkbox sends the same boolean constructor. Semantic text includes current value. |
| `field`: fixed code/coded choices | Works, simpler look | Native select from field metadata, inherited `valueSet` or kind suffix; underlying codes are sent. Lean listbox keys; browser-native popup. |
| `field`: custom code, scan, identity, user/cosign | Simpler look | Native text entry sends the existing code/text/user constructors. Free-entry code suggestions are missing; manual barcode entry works. The stock UiNode field renderer also has no camera acquisition surface. The live service still validates identity/cosign authority. |
| `field`: search | Works, simpler look | Native search input emits `enter`; Lean owns filtering and patient selection. |
| `field`: observation-time | Works, simpler look | Native local datetime input converts to the same epoch-minute string. No changed timing policy. |
| `field`: provenance, required/human-only, pending confirmation | Simpler look | Lean's complete semantic string and required accessibility state retained. An explicit confirm button uses its own box; otherwise the pending field box becomes a confirm button until confirmed. Editing an implicit pending field before confirmation and styled source hints need additional control geometry. |
| `info`: table/list/summary/document/status/entryTimes | Simpler look | Every row/value retained in the unbounded safety-text scroller, including dates/source metadata. No formatted table columns, medication cards, document sections or localized time presentation. |
| `info`: structured row actions / keyboard grid | Simpler look; grid missing | Existing action child buttons remain separate Lean cards and retain events. Clicking an entire displayed table row is missing; no cell geometry exists for `Keyboard.grid` DOM focus. |
| `alert` | Simpler look | Full text/severity and alert role; modal sources receive fixed interruptive placement and inert ordinary controls. No CSS severity icon. |
| `button`: navigation, primary commit, macro, review, toggle, add/remove, reconciliation | Works, simpler look | Native button; `click` unchanged. Enabled state and complete blocked reason come from Lean. Lean step owns every action, including macro confirmations and group visibility. |
| `button`: acknowledgment / explicit confirmation | Works, simpler look | `ack {alert: comp}` or `confirm {comp}` exactly as the current renderer. No automatic acknowledgment or confirmation. |
| `button`: hotkey badge | Simpler look | Original hotkey text is retained. Global shortcut activation is not added (the stock button renderer displays the badge). |
| `text` | Works | Complete source and pinned prebroken visual spelling; missing scalars use Lean's escapes. |
| `presentation` | Simpler look; rich surfaces missing | All wrapper/child occurrences painted. React presentation overrides are ignored. Structured tables, MAR time grids, note cards and growth/trend charts need native presentations and appropriate Lean mark/row geometry before visual parity. |
| `valueSet` | Works, simpler look | Options/custom permission inherited by child fields; metadata itself remains as semantic text. |
| `chartReferences` | Simpler look | All reference metadata/points preserved; no overlaid percentile/reference curves. Needs a native plotted presentation and checked mark geometry. |
| `rowAction` | Simpler look | Child controls retain their events and separate source boxes; embedding controls into displayed table rows requires row geometry. |
| `timeline` | Simpler look | Heading and ordered children preserved as read-only cards; no styled event list. |
| `datedTimeline` | Simpler look | Exact dated/undated metadata and children retained; no graphical UTC-aligned axis. |
| `board` | Missing multi-patient interaction | Urgency metadata and all pane occurrences are readable. No patient-scoped board session/dispatch host is connected; pane controls are disabled to prevent unscoped events. |
| `patientPane` | Missing interaction | Banner, metadata, ordinary/modal children retained by source path. Needs patient-scoped event transport, per-pane choice metadata, modal ownership and board shell geometry; disabled here. |
| `UiScreen.banner`, title and side nodes | Simpler look | Supplied fixed banner, title and child cards; original labels preserved. No recreated clinical chrome or patient avatar. |
| `UiScreen.urgent` nodes | Works, simpler look | Lean pins them in a fixed strip (rule G11): outside every scroller, in the viewport and clear of every other box. The painter keeps strip boxes operable while a modal is open and blocks everything else. A state with more urgent nodes than the layout can pin is refused, not painted. |
| `UiScreen.nav` | Works, simpler look | A heading card per group and one button per link, each in its own Lean target box, sends the existing `click` IDs. The dense layout places group headings and wrapping button bars before the workspace in the shared body scroller; the fixed-shell fallback places navigation after it. |
| Interruptive dialog focus | Works for fixed-shell single-patient alerts | Lean `alertDialog` Tab transitions, inert ordinary controls, initial focus and restoration. Escape is ignored by the Lean profile and swallowed by the painter. Board modality remains missing. |
| Review/sign persistence and draft restoration | Existing live path | Same `createLiveSession`, native screen comparison, guarded command endpoint and database. No alternate save implementation. |

The stock presentation kinds are fully enumerated below. None introduces a
new clinical event constructor; row actions use their existing child controls.
The painter retains every underlying row and action, while these visual
encodings remain to be reproduced.

| Presentation kinds | Current surface and interaction | New painter status / need |
|---|---|---|
| `table`, `schedule`, `trackBoard`, `orSchedule`, `worklist`, `flowsheet`, `messages`, `results` | Structured record columns/status styling; supplied row controls; an enabled single navigation row can proxy its button click | Simpler text cards + separate action controls. Whole-row click proxy and column/status presentation missing; needs row/cell geometry. |
| `timeGrid` | MAR day/hour columns, medication rows, due/status cells and supplied action controls | All data/actions retained as cards; time-grid visual encoding missing. Needs checked hour/cell/row placements. |
| `folderList` | Folder names/counts/details and supplied child row controls | Simpler complete text and separate child controls; folder list styling missing. |
| `notes` | Note metadata/cards and provenance-aware title/body text | Complete unbounded text; note card typography/grouping missing. |
| `trend`, `growth` | Read-only numeric/time charts and tabular records; growth reference percentiles from context | Complete values/reference metadata retained; curves, axes, point labels and plotted reference bands missing. Needs Lean mark geometry. |

`PresentationBundle` overrides in the current renderer add `Box`, `Stack`,
`Group`, `Paper` and `Flex` wrappers around the original node. They are ignored
by this page in favor of the chosen Lean layout family. The separate offline
command/spatial/dated research host in `Exotic.tsx` is not a live clinical entry;
this change does not alter that tool. A native command palette or spatial host
would be additional work if chosen for a future clinical cut-over.

## Validation and measurements

Run from the repository root with restored local synthetic fixtures, dependencies,
the pinned Lean/Emscripten toolchain and a disposable Postgres database. Browser
tests use one worker under the existing shared lock. They substitute only the
authentication transport and run the production `/lean.html`, packaged WASM,
full v3 P1/P3 programs, native service replay, screen comparison and real
Postgres writes. The patient is generated in the service process; no patient,
run or certificate data is added to git. Keycloak itself is outside these tests.

```sh
export TMPDIR=/home/saithat/Projects/run-tmp CI=true LEAN_NUM_THREADS=4 JOBS=4
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

Native/WASM paint agreement covers six P1/P3 screens at all three viewports,
including program and family painting (36 byte comparisons), all 65
profile/key combinations, and error paths. The browser differential checks
outer DOM rectangles after clip translations, Lean text line widths and
independent intrinsic browser glyph advances on the workflow screens. Focused
native editor glyphs/popups are outside the static-text differential.

Measured results for this implementation:

| Check | Result |
|---|---|
| Native/WASM layout and keyboard | 3 tests passed; 36 byte-identical paint requests and 65 keyboard comparisons (five profiles) |
| Existing native layout regressions | 30 tests passed |
| App unit tests | 337 passed; 32 existing opt-in/data-dependent skips |
| Browser workflows | P1 note + prescription signed; P3 nursing assessment filed; 2 tests passed, one worker |
| Browser differential | 10 snapshots, 500 boxes, 586 lines, 32,737 intrinsic glyph advances; rectangle/line worst deviation 0px, glyph worst deviation 0.00005px (tolerance 1/64px) |
| WASM layout in Chromium | Landing P1 13.5ms / P3 8.9ms; P1 documentation 15.8ms, orders 26.0ms, signing 14.9ms; P3 assessment 13.5ms; other supported-size samples 14.7–18.6ms |
| WASM layout in Node | Program paint samples 14.25–61.37ms across six screens and three sizes |
| New entry transitive JavaScript | 184,682 bytes raw / 61,143 bytes gzip, with no React/Mantine modules or chunk markers |
| Existing app, including its lazy routes | 919,978 bytes raw / 305,482 bytes gzip; same emitted build, no duplicate shared chunk counting |
| Shared WASM asset | 5,061,591 bytes with the strengthened layout rules; 5,027,703 when the layout API was first exported, versus 4,401,917 before it |

The browser rows (workflows, differential, Chromium timing) and the JavaScript
sizes were measured before navigation links and tabs became separate controls
and before the urgent strip was pinned; they were not measured again.
Browser timing includes the render/layout API JSON boundary; ten samples are
not a benchmark distribution. The unsupported-viewport test checks inert
refusal and recovery. The P1 task includes real sequential typing and caret
preservation during re-layout. Full React accessibility/screen audits and the
full Playwright suite were deliberately not run for this separate renderer.
Keycloak provisioning/login and multi-patient board interaction remain untested
here. Native service replay and durable command writes are exercised.

## Cut-over checklist

1. Navigation links and tab labels have their own semantic targets and checked
   rectangles. Give tab panels, grid cells and any additional native control
   theirs. Keep G1–G11 unchanged and prove/check the corresponding layout
   families.
2. Complete the missing inventory rows: patient-scoped board sessions and
   modality, custom code suggestions, rich clinical presentations, implicit
   pending-field editing and structured row/grid interaction. Verify every
   presentation-specific interaction before removing its React implementation.
3. Connect APG tablist, listbox, dialog and grid roles/relationships to the
   proved transitions; retain clinical guards for all close/activation paths.
   Audit keyboard-only and assistive-technology behavior on supported desktops.
4. Run complete workflow, draft recovery, alert, multi-patient, concurrency and
   persistence regressions on the new page, with real identity-provider login.
   Validate custom family coverage and all three viewports, and repeat pixel,
   glyph, clipping, focus, caret, scroll and dependency differentials.
5. Establish reviewed font/WASM/application bindings for the new clinical
   bundle; regenerate certificates and run native/WASM conformance and strict
   replay. Keep recorded source data untouched and report incompatibilities.
6. Change the default clinical entry only after the inventory has behavioral
   parity. Keep dashboard and replay React dependencies isolated; remove the
   React clinical renderer and Mantine from the clinical bundle, then assert
   the resulting default entry's transitive dependency graph is framework-free.
7. Replace renderer-specific screen checks with the validated new painter
   checks only when their covered risks have replacements. Run the appropriate
   accessibility/screen audits for that renderer, update setup/architecture
   documentation and retain a tested rollback path.

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
