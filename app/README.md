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

## Recorded-run demo dashboard

Open **`/dashboard?run=mock`** after starting `pnpm --filter app dev`. The run
selector discovers directories under repository `runs/`; no API keys, Medplum,
LLM or checker service is needed to play a recorded run. The six requested
views, cost curves and recorded break attempt work offline after the app is
served locally. Built output includes `dist/runs/` and `dist/dashboard/index.html`
for static hosting. The fixed EHR painter/styles are reused on every screen.

```sh
pnpm --filter app mock-run       # regenerate ONLY runs/mock (authored examples)
pnpm --filter app test:smoke     # Chromium must already be installed
# Optional when another lane has the default test port in use:
APP_TEST_PORT=4187 pnpm --filter app test:smoke
```

`mock` is not a real agent run: all decisions, checker verdicts, certificates and
savings are authored examples. The three injected unsafe candidates are labeled
`seeded`. P3's failed v2 migration is a repair proposal, not a seeded attack.
The break panel shows the recorded request beside its verdict and explicitly
distinguishes it from text entered by an audience member. It never claims to
have checked arbitrary text. Real recorded attempts in `break/*.json` use the
agent's DecisionRecord schema too.

The loader reads the agent's existing directory layout:

```
runs/<id>/manifest.json
          programs/<P>/v<N>.json
          certs/<P>/v<N>.json
          decisions/night-<NN>/<P>.json
          days/day-<NN>/<P>.json
          llm/<call-id>.json
          break/<record>.json                 (optional)
          replay.json                         (app replay inputs)
```

The Vite plugin creates `/runs/index.json` from these directories. During build
it copies the run files to static output. Rebuild after adding a recorded run to
a static deployment. Metadata views work from agent files alone. EHR replay
also needs opaque interpreter inputs, which the agent's decision records do not
contain. Supply the app-only `replay.json` alongside them:

```json
{
  "mode": "wasm",
  "contexts": [
    {"persona": "P1", "version": 0, "specVersion": "v1", "spec": {}, "bundle": {}, "user": {}}
  ],
  "tasks": [
    {
      "persona": "P1", "id": "same-patient-same-task", "title": "Repeat prescription",
      "before": {"version": 0, "trace": [{"event": {"click": {"comp": "openOrders"}}, "ops": ["point", "click"], "klmDeciSec": 12}]},
      "after": {"version": 5, "trace": [{"event": {"click": {"comp": "review"}}, "ops": ["point", "click"], "klmDeciSec": 12}]}
    }
  ]
}
```

Replace `{}` with real spec, synthetic FHIR bundle and user JSON. Supply a
context for each required persona/version/spec combination; `version` and
`specVersion` can be omitted for a shared context. Counterexamples use the
decision's spec (including v2 rechecking an older program). Candidate JSON
patches are applied to the recorded `versionBefore` using the agent's own patch
engine; migration screens replay the checker path up to the commit. Pair both
task traces with the **same task and patient inputs**. Each side's
`klmDeciSec` is cumulative KLM cost since task start, exported from the recording,
not the agent trace's absolute shift timestamp `t`. Counters count recorded
operators separately. No wall-clock or clinical cost model is inferred by the UI.

When the WASM lane's adapter is ready, wire its Interp in the route:

```tsx
<Dashboard interpFactory={() => wasmInterp} />
```

The factory can also select an adapter by its Program argument. It must implement
the existing string-based `Interp` interface. Real runs require this injection;
an absent adapter produces a visible error and never selects a mock. The mock
adapter's legacy Option normalization and fixture ScreenViews are confined to
`src/mock/replay.ts`. Opaque real state, bundle and output are forwarded directly.

Cost points come from each decision's independent `measured.test` replay, using
the tested version's `after` metrics and recorded workload. They are not general
shift metrics or training curves; missing holdout/floor data stays unavailable.
Raw validation/test before-and-after metrics, minimum-click comparisons and
certificate hashes are available in Why. The trusted-base note is visible in the
dashboard footer.
