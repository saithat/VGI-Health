# Clinician workspace

```sh
pnpm install
pnpm --filter app dev
pnpm --filter app build
pnpm --filter app lint
pnpm --filter app test
```

The default app uses an explicitly labeled, uncertified **MOCK** W1 outpatient
interpreter. It supports rooming, documentation, medication/lab ordering, review
and sign navigation, plus eight chart activities. All P1–P5 development personas
currently open this W1 fixture. The mock can navigate, select tabs, expand groups
and retain values. Signing, receipts, confirmations, clinical alert evaluation
and macros await Lean WASM. No clinical writes occur.

The entire EHR, including its shell and every panel row, arrives as a page tree.
`src/ehr/painter.tsx` maps whitelisted tags/attributes/classes to React and DOM
interactions to generated Lean Event JSON. Only nodes annotated with `data-event`
produce events; `toggle` maps to Lean `click`. Scroll surfaces carry the screen id
in `data-comp-id`. Quantities are encoded in tenths; flags use input checked state.
Lean owns inclusion, enabled actions, state, alerts, content and layout. The
painter has no component-kind rendering. `src/ehr.css` is the fixed §9.1 vocabulary;
its parsed lint test reads the design document directly. Responsive layout wraps
content; nothing is hidden. The old Mantine EHR path is removed.

`src/core/session.ts` calls `init`, then `render`, and on an event calls `step`
then `render`. It forwards opaque JSON without runtime certification or tree
validation. `Interp.render` takes the same five string inputs as `view`; the
third is a FHIR bundle (or facts for the legacy mock), allowing Lean to derive
both facts and display. `facts(bundleJson)` supplies the facts-only export.
The app selects the mock explicitly, never on interpreter failure. Replace this
selection with the real Interp when all WASM exports arrive.

Temporary `Html` JSON uses Lean's derived encoding:

```json
{"node":{"tag":"button","attrs":[{"name":"class","value":"ehr-button ehr-button-primary"},{"name":"data-comp-id","value":"sign"},{"name":"data-event","value":"click"}],"children":[{"text":{"s":"Sign orders"}}]}}
```

`src/ehr/html.ts` contains an offline zod validator and a temporary type mirror.
It will use generated Html/Tag/Attr when the render lane publishes them. Generated
Event/Value/StepOutput are already used. Legacy `src/core/types.ts` and ScreenView
are private mock fixture formats, not decoders for real Lean output.

## Offline release screen check

Install Chromium once while preparing the build environment. The check itself
uses only localhost and supplied JSON files; it needs no Medplum or API service.

```sh
pnpm --filter app exec playwright install chromium
pnpm --filter app screen-check /absolute/path/candidate-1.json /absolute/path/candidate-2.json
```

Paths may also be relative to the directory invoking pnpm. Missing inputs, invalid
JSON/vocabulary, browser errors or invisible required components return nonzero.
Screenshots and diagnostics are written under `app/test-results` on failure.
The harness uses the production painter and identical stylesheet imports.

For each file the check compares every emitted `data-comp-id` with the painted
DOM, including order and duplicate occurrences, at desktop and narrow widths.
Every emitted component must have a nonzero box, fit within the document and
page width, be hit-testable at its center, have positive opacity through its
ancestors, and have fonts at least 12px (including descendants). Long pages scroll
vertically to inspect each center; below-fold content is supported. Increase the
minimum with `EHR_MIN_FONT_PX` when the spec requires a larger size. Regression
tests exercise hiding, off-page positioning, opacity, small fonts and occlusion.

Export and check the mock's twelve screens plus history/expansion states:

```sh
pnpm --filter app export-mock-pages /tmp/vgi-pages
pnpm --filter app screen-check /tmp/vgi-pages/*.json
```

The deployment pipeline must supply **all** candidate screens/states/patients;
this script checks exactly its supplied trees. It does not enumerate Lean state
space or certify clinical policy. Keep this gate entirely offline before deploy.

## Medplum

Copy `.env.example` to `.env.local`, configure the local OAuth client and
synthetic patient ID, and use **Sign in**. The server defaults to
`http://localhost:8103/`. The client's redirect origin must match the Vite URL.
The data module owns all SDK calls, pagination, offline reads and future writes.
The mock's FHIR display projections are development stand-ins; Lean will own
facts and display in production. `packageExtensions` repairs Medplum's undeclared
`react-router` dependency.

## Owner review checklist

1. Do the seeded bad programs fail with replayable counterexamples?
2. Approve any spec, property, data-format or Comparator statement diffs.
3. Are `lake check`, Comparator and the axiom audit clean?
4. Do decision records include alternatives and predicted/measured savings?
5. Does each rendered commit screen match Lean's banner, review and dose-check requirements?

This lane changes no Lean specs, properties or statements. See [STATUS.md](STATUS.md)
for integration dependencies and test coverage.
