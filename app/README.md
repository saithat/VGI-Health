# Clinician workspace

```sh
pnpm install
pnpm --filter app dev
pnpm --filter app build
pnpm --filter app lint
pnpm --filter app test
```

`make run` serves the LIVE Medplum login at `/`. Start the local backend with
`make infra-up && make setup && make load`; use a seeded persona button or the
Medplum sign-in form. Quick-login reads the shared password only through a
loopback-only server endpoint; it is never included in built assets. The live
home queries actual worklists, patient search and full charts. Select an encounter
and optional Task, MAR order or admission bed before opening the canonical v2 EHR.

The visible **Demo / replay** switch opens the offline clinical UI browser and
recorded dashboard. These need no Docker or Medplum. Open `/browse` for
all releases, persona projections, bad programs and recorded run versions; select
one of the 174 committed Synthea patients by name or flags.

`/?mode=replay&persona=P1` through P5 open v1 persona projections with workflow defaults.
Add `&run=mock` (or a real recorded run id) to open its deployed program instead.
P2 selects a fixture with a latest ED encounter, P3 an inpatient encounter, P4 a
child and P5 a surgical history. These are historical synthetic records; the app
opens a local episode with the committed reference date (2026-10-31). P5 supplies
`preop` encounter context to Lean. Reset or switching programs/patients starts a
fresh episode; no clinical writes occur.

Explicit replay links use `/ehr?mode=replay&release=v1&program=releases/v1/personas/P1.json&persona=P1&patient=<fixture-id>`.
Every EHR, including a mock-authored recorded program, executes **real Lean WASM**.
Only the labeled mock dashboard replay uses the mock interpreter. `/dashboard`
retains recorded run selection (`VGI_RUN=mock make run` overrides its default).
Medplum remains optional infrastructure via `make infra-up`, `make setup` and
`make load`; it is not consulted by the offline EHR route.

The browser build copies committed JSON under `/releases`, `/programs`, `/runs`
and `/fixtures` into `app/dist`; the Vite dev server serves the same artifacts.
The catalog discovers programs by their actual screen/start structure and
records deployed pointers separately from historical versions.

The EHR calls `ehr_facts` with `{bundle, context}` once, then passes its facts to
`init`/`step`/`view` and both facts and display to `render`. The existing generic
painter draws only Lean's page tree and forwards annotated events. The collapsible
inspector reads Lean's state and view for actions, blockers, provenance, pending
confirms, receipts, alerts and commits. It does not control clinical behavior.

Generate checker verdicts with `pnpm --filter app verdicts`. The script discovers
every program and writes `app/public/verdicts.json`, including source hashes. If
the native `ehr` advertises `check`, it runs
`ehr check --spec <release-spec> --program <program>` for each program. Until that
CLI lands, the inspector says **verdict not computed**. It never treats authored
mock certificates as checker results. Re-run the script after changing programs.

Verify assets with `make wasm-check`; rebuild stale ones with `make wasm` before
committing. `pnpm --filter app test:live` runs real Medplum integration tests,
skipping only when the server is down. P1 runs a full visit through real WASM,
then queries the stored note, vitals, diagnoses, prescription/refills and CPT
links. Other tests cover admission/bed occupancy, administration, discharge,
results/messages, refills, immunization, op notes, consents and atomic rollback.
Only P1 and rollback currently have full WASM click-path coverage.

`pnpm --filter app test:replay` runs fixture browser episodes with external
network requests denied. Historical fixtures without structured phase/evidence
context stay blocked at signing; no evidence or successful write is fabricated.
`pnpm --filter app exec playwright test live-login.spec.ts` verifies live sign-in,
session restoration, patient search and chart opening on desktop and narrow views.
The unit suite additionally projects all 174 bundles and renders every catalog
program through the committed WASM.

All Medplum calls remain in `src/data/medplum.ts`. `commitMapper.ts` is a pure,
typed, unit-tested transaction builder. `liveSession.ts` previews each event in
Lean and publishes commits only after the transaction succeeds; failed writes
retain inputs. Success refetches and reprojects the full chart, and exposes
resource links in the toast and **Live encounter** panel. Review receipts target
exact FHIR `_history` versions. Explicit caller context and outstanding spec
bindings are documented in [changes-requests.md](../docs/design/changes-requests.md).
Rooming vitals save with `signNote`; file the note first if ordering needs a
persisted weight. Unmapped regulatory commits fail explicitly. See the root
README for workflow limits and the CPT code-system license note.

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

This lane changes no Lean specs, properties or statements. See [project status](../docs/STATUS.md)
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

`ReplayApp` loads the WASM adapter and wires real recordings into the route:

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
