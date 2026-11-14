# Reproduction and CI

[Overview](../README.md) · [Methods and reproduction](../README.md#documentation)

## Continuous integration

[CI](../.github/workflows/ci.yml) runs on every push and pull request, on all
branches. Six Ubuntu jobs build the pinned Lean default targets and audit
headline theorem axioms; lint and typecheck app, agent, world and commit;
run fast unit suites and the information-needs Python test; run all 201
canonical conformance scenarios and the 15-accepted/24-rejected certification
matrix; and run commit integration/protocol traces against Postgres. Native
checks share the current run's `ehr` artifact. Protocol and ADT host trace checks
invoke `ehr protocol-trace` and `ehr adt-protocol-trace`; neither requires a Lean
toolchain at test runtime. Their standalone Lean entrypoints share those same
compiled checkers. The `lean` job also runs the world-to-Lean MAR
boundary test (`world/test/administration-outcomes.test.ts`) and the archived
Synthea schedule/formulary contract (`world/test/synthea.test.ts`), which need the
Lean build; these probes skip when Lean is absent. The Synthea archive probe also
requires local archived data, while its remaining archive assertions run in the unit job
when that data is present. Conformance uses its stateless
`serve` transport to avoid one process startup per event; `EHR_CONFORMANCE_TRANSPORT=cli`
retains the one-shot comparison path. Both dispatch to the same native
functions. pnpm, elan/toolchain and source-keyed Lake outputs are cached. The commit service enforces the same
TypeScript bans as agent: no explicit `any`, non-null assertions, casts except
`as const`, or TypeScript suppression comments. Opaque JSON is narrowed before
host use; mapper inputs and clinical/ADT protocol traces have runtime codecs.
ADT test instrumentation validates administrative boards and version vectors;
lost-COMMIT probes preserve the database driver overloads through proxies. The unit
runner enables unprivileged user namespaces on its ephemeral VM, installs
bubblewrap and exposes the pinned Node executable at `/usr/bin/node` for
confined queries.

No archived data or API credentials are needed. CI generates bad programs and
the commit fixture from tracked Lean inputs, and reruns the CURES-removal
checker probe against the current binary before checking its evidence bindings. Archive-backed tests skip when
recordings, worlds or patient fixtures are absent; the unit job creates an empty
`runs/` directory for output-path guard tests. Browser cache integration and
opt-in UI-library research suites stay local. CI tests the checked-in WASM
canonical-byte corpus but does not rebuild WASM. Default builds and the proof
audit reject proof placeholders; the three deliberate Comparator challenge
modules are outside these targets. Full Comparator verification remains
`make verify`.

A parallel `proof-map` job builds the default targets plus the proof modules
outside them (`scripts/proof-map/extra-modules.txt`, e.g. the UI-library range
theorems) and regenerates the proof map from the compiled environment. It fails
if any theorem depends on an axiom other than the standard three (including
`sorryAx`) or if the [proof map charts](proof-map.md#proof-map) in `docs/proof-map.md` are out of
date. It also uploads an interactive version as the `proof-map` artifact
(download, then serve the folder, e.g. `python3 -m http.server`); the opt-in
`proof-map-pages` job publishes that to GitHub Pages on pushes to `main` once the
repository variable `PROOF_MAP_PAGES` is `true`. After changing Lean proofs,
refresh the generated charts with `(cd lean && lake build && lake build $(cat
../scripts/proof-map/extra-modules.txt)) && scripts/proof-map/build.sh --readme`.

Heavy checks require matching local fixtures/recordings and, for live browser
checks, the [fresh local stack](methods/live-validation.md#local-setup-and-live-validation). Run locally:

```sh
export TMPDIR="${TMPDIR:?Set disk-backed TMPDIR}" CI=true LEAN_NUM_THREADS=6
make wasm
node scripts/migrate-neutral-terms.mjs --recertify-only --runs core-10day
node scripts/audit-alert-policy.mjs "$TMPDIR/audit-templates"
node scripts/audit-alert-policy.mjs "$TMPDIR/audit-personas" --personas
APP_TEST_PREVIEW=1 pnpm --filter app exec playwright test live --project=desktop --project=narrow --workers=2
COMMIT_INTERNAL_URL=http://127.0.0.1:8091 MAR_E2E=1 ADT_E2E=1 APP_TEST_PREVIEW=1 pnpm --filter app exec playwright test mar-service.spec.ts adt-service.spec.ts --project=desktop --project=narrow --workers=2
pnpm --filter app shots
```

Keep the audit pair sequential under the shared browser lock (acquired by the
audit script); wrap other heavy browser commands in
`flock "$TMPDIR/vgi-browser-heavy.lock"` as in the
[live validation commands](methods/live-validation.md). Re-certification, full WCAG/screen
audits, the live e2e/MAR/ADT stack, WASM builds and screenshots are manual checks.

`scripts/clean-clone-test.sh` validates an offline build and recorded browser
flows in a scratch clone; it needs no live stack or credentials.

The service browser suites apply the selected viewport to every actor context
and run on desktop and narrow screens. They create and clean up their own tenant
and listener; they use the fresh stack's Postgres and Keycloak and never substitute mocked
clinical responses. Native/Postgres workflow tests exercise stale-version and
guard refusal for every workflow family, plus persisted-review recovery,
author isolation, date expiry and target-version invalidation.
