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
It runs at desktop and narrow widths with external requests blocked. Modal
backgrounds are inert; the dialog and its background (after dismissal) are
checked separately. It exits nonzero on any mismatch. This checks presentation
fidelity; it does not replace Lean's clinical or design proofs.

`shots` writes 1440×900 PNGs into gitignored `app/shots/` for rooming, orders,
sign, an interaction popup, and bad-program sign. Each has an initial viewport
(`*-load.png`) and a view focused on the clinical task.
It uses the same painter, theme and styles as the live route. The source fixtures
are actual Lean output, not retouched presentation data.

The initial semantic wire has contract gaps recorded in
`docs/design/changes-requests.md` (navigation lacks an Event, coded choices and
specialized kinds are not preserved, some content labels contain authoring
instructions). Workspace action buttons remain fully interactive by comp id;
nav destinations/stepper are an overview until that Event exists.
