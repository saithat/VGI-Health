# Clinician workspace

```sh
pnpm install
pnpm --filter app dev
```

The default view is an offline, synthetic W1 outpatient encounter. It includes
rooming, documentation, a medication/lab composer, review/sign, and eight chart
activities. Use the development persona selector to switch P1–P5; all personas
currently open the same W1 preview. Use the activity strip to open results,
medications, problems, allergies, immunizations, vitals, growth, and encounters.
Other activities are labels only, as permitted by the brief.

The preview can navigate, select tabs, expand/collapse groups, and retain entered
values. Confirm dispatches an event but deliberately remains pending. Signing,
review receipts, and macros are unavailable until the Lean interpreter arrives.
Nothing writes to the FHIR server. This is an uncertified development shell.

For a local Medplum chart, copy `.env.example` to `.env.local`, set the OAuth
client and synthetic patient ID, and use **Sign in**. The base URL defaults to
`http://localhost:8103/`. Configure the Medplum client's allowed redirect origin
for your Vite URL. With no authentication or an unavailable backend the app
shows a separately identified sample patient. Invalid live FHIR is reported
instead of silently substituted. All searches follow the server's next links.

```sh
pnpm --filter app build
pnpm --filter app lint
pnpm --filter app test
```

The renderer is stateless. `ScreenView.items[].shown` controls inclusion;
`enabled`, `blocked`, and `popup` come directly from the interpreter. The renderer
preserves item order and attaches one `data-comp-id` per shown item. The component
`tag` prefix `activity-` is a presentation hint for compact navigation styling.
Layout grouping never changes inclusion or order. The spec supplies field-kind
metadata and value sets supply display labels.

`src/core/session.ts` validates every JSON response and holds interpreter state
as an opaque JSON string outside React. To connect WASM, supply an `Interp` with
the same four string-based methods and pass generated spec/program/facts/user
inputs to `createSession`. The mock is selected explicitly in `App.tsx`; it is
never a fallback for interpreter errors. See [STATUS.md](STATUS.md) for the Lean
integration seams and validation limits.

All direct SDK use and future writes belong in `src/data/medplum.ts`. The
Medplum provider and SignInForm use that client; rendering modules never load
data or write it. FHIR validators check the R4 projection consumed by this app,
not the entire FHIR specification. `packageExtensions` repairs the undeclared
`react-router` import in `@medplum/react@5.2.13`.

## Owner review checklist

1. Do the seeded bad programs still fail with replayable counterexamples?
2. Approve any spec, property, data-format, or Comparator statement diffs.
3. Are `lake check`, Comparator, and the axiom audit clean?
4. Do decision records include alternatives and predicted/measured savings?
5. Does each rendered commit screen match Lean's banner, review and dose-check
   requirements?

This lane adds temporary data-format mirrors at the owner's request. It changes
no Lean specs, properties, or Comparator statements; proof checks belong to the
Lean lane. The mock is not evidence that a program satisfies clinical policy.
