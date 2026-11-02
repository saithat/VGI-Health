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
