# Semantic EHR painter

`UiScreenView` paints the generated Lean `UiScreen`/`UiNode` union. The exhaustive
switch in `nodes.tsx` must be extended when Lean adds a constructor. The painter
has no clinical state or FHIR interpretation. Mantine supplies the controls and
layout; Medplum resource widgets are unsuitable for these already projected
string rows and would require reconstructing FHIR resources.

All inputs remain controlled by Lean. Numeric entries preserve tenths and units;
code/flag/user/text use the corresponding Lean Value constructor. Search,
selectTab, confirm, toggle and ack preserve their original event semantics.
An explicit sibling confirm button supplies the field's confirmation affordance.
Only the app's `/ehr` route exposes the collapsible inspector drawer.

Run from the repository root:

```sh
pnpm --filter app build
pnpm --filter app lint
pnpm --filter app test
pnpm --filter app screen-check --ui app/src/fixtures/ui/*.json
pnpm --filter app shots
```

The fidelity gate compares the ordered role/name/disabled/ancestry projection of an
actual Chromium ARIA snapshot with an independently generated expectation. It
also checks all supplied record values, 12px minimum rendered type, horizontal
overflow, hidden content, and hit-testing of every control and record cell.
It runs at desktop and narrow widths with external requests blocked. Additional
checks cover 1280×800, 720px desktop reflow (equivalent layout width at 200% zoom),
24 complete medication/list records, local date rollover, keyboard focus,
scanner Enter, modal containment/return, and rendered status/alert text contrast. Modal
backgrounds are inert; the dialog and its background (after dismissal) are
checked separately. It exits nonzero on any mismatch. This checks presentation
fidelity; it does not replace Lean's clinical or design proofs.

`shots` writes 1440×900 PNGs into gitignored `app/shots/` for rooming, orders,
sign, an interaction popup, and bad-program sign. Each has an initial viewport
(`*-load.png`) and a view focused on the clinical task.
It uses the same painter, theme and styles as the live route. The source fixtures
are actual Lean output, not retouched presentation data.

The painter uses Lean's control IDs, labels and declared actions.
See the [presentation contract](../../../../docs/design/presentation-contract.md)
and [verification scope](../../../../docs/VERIFICATION.md) for its requirements.

Visual tokens live in `theme.ts`, following `docs/design/visual-style.md` and
`docs/design/ehr-ui-research.md`. The shell and portaled modal share those tokens;
icons are original generic SVG line drawings. The clinical summary is the left
rail and comes before the workspace in DOM order. Banner, history, and review
content grow in normal document flow without fixed-height record scroll traps.
List records use a primary value and muted inline metadata. ISO dates/timestamps
receive a short local display date; date-only DOBs keep their calendar date,
invalid values survive unchanged, and `<time datetime>` retains the raw value.
Input values and clinical event payloads are never reformatted.

Only explicitly supplied MAR status text gets the documented status tint.
Unknown statuses retain their text without a success tone. The current wire's
`severity` string can contain a tier (`interruptive`, `passive`, `removable`);
those render with informational styling until the renderer supplies independent
clinical severity. A step index indicates position only, never completed review.

Navigation follow-up: `origin/lane/render` at `97f1b38` still exports
`nav: [string, [string, string][]][]`, without click component metadata. Do not
send destination screen IDs as component clicks. Once that contract lands,
render metadata-bearing entries as keyboard-operable buttons, dispatch exactly
`{ click: { comp } }`, and extend `types.ts`/`fidelity.ts` and event tests together.

The opt-in `timeline` constructor paints a labeled ordered list of complete
children. Its Lean admission proof is `Ehr/Sem/Timeline.lean`; the independent
ARIA projection is in `fidelity.ts`. It preserves source order without deriving
timestamps, clinical state or new events. An expanded group tagged
`layout.timeline` (or a namespaced suffix) enters the
constructor through ordinary native/WASM `renderUi`; `renderTimelineUi` also
provides a whole-workspace wrapper. The canonical browser fixture is exported
by `lake env lean --run Ehr/Sem/ExportTimeline.lean`; `program-screen` selects
the accepted program's actual signing screen.

`UiScreen.urgent` is supplied by Lean independently of workspace/modal contents.
`UrgentStrip` draws it in a fixed layer outside the inert chart shell and above
dialogs, with no local dismissal or clinical classification. An urgent popup's
acknowledgment remains the original Lean event in the strip. An unrelated dialog
keeps the chart inert while allowing the strip to remain perceivable; its focus
trap and `aria-modal` declaration account for this separate active layer. The
screen gate rejects any strip warning outside the viewport or under another
surface. Finite capacity/zoom are measured, not inferred from CSS or tree presence.

The screen gate also enforces the owner-selected WCAG 2.2 AA matrix by default:
24×24 CSS px enabled targets, 4.5:1 text, 3:1 control/state/chart paint, 320px
reflow and 200% text resize. Text line boxes, badges, button labels and inputs
grow with type while preserving compact baseline spacing. Checkbox inputs are
24px themselves. A browser regression checks short navigation labels inside
card columns at desktop and narrow widths. Solid chrome and contrasting chart strokes permit numerical
contrast measurement; reference intervals retain outlines and labeled curves.
See the [repair report](../../../../docs/audits/wcag-2026-11-02.md) for sampled
coverage and the separately owned urgent-alert/integration findings.

Clinical typography is bundled from OFL-1.1 Noto fonts: normal Noto Sans
400–800, regular Noto Sans Mono for hotkeys/code, and a two-glyph Symbols 2
fallback. `fonts/fonts.css` uses private family names with no `local()` lookup;
`fonts/manifest.json` names every face/weight required before measurement.
The Latin repertoire and pinned generation inputs are documented in
[scripts/fonts](../../../../scripts/fonts/README.md). Add font coverage when
introducing new scripts or symbols. Binary bytes enter the certified app hash.

The collector gives every active/background state a fresh BrowserContext/page
at 1440×900, DPR 1, reduced motion, light scheme, en-US and
America/Los_Angeles. The screen/WCAG gate shares these settings and checks each
font after `document.fonts.ready`; a missing font fails capture. Both disable
animation, transitions, smooth scrolling and caret paint during measurement.
`pnpm --filter app test:geometry-determinism` performs independent uncached
repeat/alternate-fontconfig captures of representative fixtures. The full
canonical check and before/after measurements are recorded in the
[geometry report](../../../../docs/audits/geometry-determinism-2026-11-02.md).
Changing these fonts invalidates historical app bindings and geometry caches;
this lane does not rebind recordings.

Plain `text` fields use a one-row `textarea` with native `field-sizing: content`,
soft wrapping and no row cap. Long prose and unbroken values remain visible as
field width, font metrics or text size changes. The complete value, label,
component ID, textbox role and Lean enter/confirmation events are unchanged;
short values retain the dense one-row footprint. Search, scanner, identity,
user/cosign and coded kinds retain their existing widgets. Browser regressions
check both scroll axes, exact values and semantic ARIA fidelity at 320px and at
200% text size. See the [merge follow-up](../../../../docs/audits/wcag-merge-followup-2026-11-02.md).
