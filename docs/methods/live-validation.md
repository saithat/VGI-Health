# Local setup and live validation

[Overview](../../README.md) · [Methods and reproduction](../../README.md#documentation)

## Start the workspace

Run `pnpm start` (or `make start`) from the repository root. Install Node ≥22.18,
pnpm 11.8.0, curl, tar and Lean 4.35.0 via Elan. Docker with Compose enables live EHR sign-in.
The command installs missing dependencies, checks the packaged WASM, builds
stale native and app assets, prepares the local stack and prints
`http://127.0.0.1:5173/`. It uses `.cache/tmp` for disk-backed scratch by default.
A missing or stopped Docker daemon leaves the dashboard and offline task
replays available. The start page shows how to enable live sign-in.

The first start verifies the release archives against both the published `SHA256SUMS` and the [pinned hashes](../../data/release.json). Data is unpacked under `.cache/one-command` and installed after verification. An incomplete dataset stops startup and identifies missing paths. Restore the missing files or move the existing dataset aside before retrying. Other recordings can coexist with the restored world. An older dataset without a source marker appears as “existing local data”.

If the release cannot be downloaded, startup uses Make, Python 3, Java 17+ and the upstream Synthetic Hospital and Synthea downloads. It converts the full hospital cohort, trims Synthea, generates ten days of world 2 with clinical overlays, and exports core Lean programs and P1 review screens. The regenerated live EHR opens on day two because day one exceeds the bounded ADT board. All ten days remain available for recording. The start page uses the live database’s clinical date. Frozen benchmark inputs, historical personas, full-profile feature replays and the sample recording come from the release. The page labels locally generated data “regenerated locally; recordings may not match”. To use a mirror, set `VGI_DATA_RELEASE_URL` to a directory URL serving the same archives and checksum file. A checksum mismatch stops installation.

**Download sample recording** installs the optional ten-day dashboard recording. It requires tar with `--zstd` and the zstd executable. Subsequent requests reuse the installed recording.

Ctrl-C closes the app server. `pnpm stop` stops the `vgi-local` containers
and preserves their volumes. Startup reuses a provisioned database and its
clinical history. When another checkout already hosts the project, use
that checkout's `.env` for the existing sign-in credentials. A different
patient baseline belongs in a new database.

The start page offers the recorded-run dashboard, task replays, trajectory
comparison, the EHR screen browser, clinician sign-in, MAR, ADT and the encounter
shell. The recording form defaults to ten days, P1–P5, Lean screens, Codex with
high reasoning effort and world 2. Choose a run to resume and check the displayed
settings against the original invocation. The runner validates the resume
against the recorded fingerprints and settings. View and recording preferences
are saved in this browser.

The recording form runs the overnight pipeline against local data. Codex uses
its existing CLI authentication and model configuration, and other model
backends use their standard credentials. Conformance reports reuse a native
Lean process through the existing stateless server transport. **Generator only**
uses the existing model-free cadence mode with browser screening and the real Lean simulator.
Its browser gate needs Chromium (`pnpm --filter app exec playwright install chromium`).
The progress panel follows the recording manifest and log. Stop terminates the
recording and keeps its completed artifacts. The app server also stops its
active recording when it closes. Recording uses a 24 GB memory limit when
a systemd user scope is available and displays the memory mode in the form.
The launcher is available from Vite dev and preview bound to `127.0.0.1` and is
absent from static build output. [Recording data](run-data.md)

The targeted workspace tests use an already running isolated app. Set
`VGI_START_TEST_URL` to the printed URL and run
`pnpm --filter app exec playwright test --config e2e/one-command.config.ts --workers=1`.
Set `VGI_START_TEST_MODE=live` for Keycloak sign-in and a one-day replay-backend
recording, or `VGI_START_TEST_MODE=offline` for the dashboard, task replays and
trajectory comparison with Docker unavailable. For a smaller recording test,
set `VGI_START_TEST_WORLD` to a local copy of world 2 with a shortened P1 day-one
schedule. `VGI_START_TEST_RESUME` selects an existing smoke run with matching
recording inputs. The smoke run and its results stay under `runs/`.

## Manual setup and testing

Legacy commands remain available for CI and isolated development. For those
commands, use disk-backed scratch. FHIR is an initial import format only.
The loader composes `fixtures/clinical/overrides.json`, dated world resources
and `runs/world/2/context/day-01.json`, validates fixture hashes, normalizes
resource IDs and references, and refuses a changed patient baseline.

```sh
export TMPDIR="${TMPDIR:?Set disk-backed TMPDIR}" CI=true
COMPOSE_PROJECT_NAME=vgi-local make install SYNTHETIC_HOSPITAL=1
make run APP_PORT=5173
```

`make install` builds native Lean, installs the workspace dependencies, checks
the packaged WASM manifest, generates untracked Keycloak credentials, starts
Postgres/Keycloak, provisions local accounts, imports patient baselines and starts
the commit service. Rebuild changed Lean sources with `make wasm` before
installation; `wasm/setup.sh` installs the pinned Emscripten toolchain when needed.
`make load` and `make seed` use the same immutable baseline loader. The legacy
world-seed entrypoints load `.env` and resolve paths from the checkout root;
`SYNTHETIC_HOSPITAL=0` selects a Synthea-only baseline.
`SEED_ARGS='--world runs/world/2 --day 1'` chooses its dated inputs.
Include `SYNTHETIC_HOSPITAL=1` on reruns of a cohort imported with hospital data.
A different baseline belongs in a new tenant/database, never over live history.

Default host ports are commit **18090**, Postgres **55532**, and Keycloak
**18180**; the app proxies `/commit` to the authority. Login uses Keycloak's
Authorization Code flow with S256 PKCE. Tokens remain in memory; a reload uses
the identity provider's existing session. Local persona passwords are in the
untracked `.env`; the browser never receives a password from the app server.
The authority loads a recorded persona deployment from `core-10day` only
when its program/certificate and current app, WASM and native build bindings
match; otherwise it uses the certified canonical role preset. Set
`COMMIT_RECORDED_RUN` to select another local recording. Baseline login always
uses the canonical preset. After an approved deployment or rebind, run `make load`
and restart the selected project's commit container to pin the new release;
already-open sessions refuse a changed release. The five persona buttons open
the clinical workspace; RN2 uses the P3 layout with its own authenticated identity
and review receipts. `/?workflow=mar` opens the
scheduled-dose authority and `/?workflow=adt` opens bed management. Clinical ED
admission selects a bed under Encounter options and commits with the board read
vector. The local ED persona has the signed admitting-clerk role; the surgeon
has the signed bed-manager role for discharge. Additional 4 West/operator
accounts are provisioned additively, with their separate local password. Their
subject bindings are local to `.cache/commit/keycloak-subjects.json` (or
`KEYCLOAK_SUBJECTS`); isolated checkouts do not share a scratch-file identity map.

The default deployment bounds its administrative board to 64 patients and 64
beds; a larger imported world must be partitioned explicitly. Initial occupancy
comes from active imported inpatient encounters. Patient facts and worklists
come from Postgres projections, and directory filtering happens in SQL before
JSON decoding. The service accepts no caller-supplied state, facts, role, mapper
effects or raw transactions. Dimensionless numeric entries use Lean’s `none`
unit when the optional display unit is absent, so flowsheet vitals and refill
quantities reach the interpreter. Nursing assessments project to their declared Observation targets, including narrative
assessment and pain reassessment.
Local structural R4 types live in
`app/src/data/fhir-r4.ts`; the pure mapper is called by the authority after
native acceptance. Worklist selections retain their source encounter; a name/MRN
lookup prefers the role’s care setting before date and status. Admission bed
selection is retained across field edits and is bound into the typed command.
Discharge closes inpatient episodes and removes them from the scheduled-dose
picker; already-open MAR sessions still require current patient versions and
the native active-order/encounter guard. Administrative state comparisons are
canonical across JSONB/native key order, so another patient’s placement cannot
rewrite an unchanged inpatient episode or advance its chart version. Scoped
journal reads redact full-board evidence from both clinical and administrative
ADT events.

For an isolated one-command stack, choose a separate project and available ports.
For example, use `COMPOSE_PROJECT_NAME=vgi-onecmd APP_PORT=4186
COMMIT_PG_PORT=55586 COMMIT_PORT=28090 KEYCLOAK_PORT=28180 pnpm start`.
Use `COMPOSE_PROJECT_NAME=vgi-onecmd pnpm stop` for that project. The app port
must be registered as a redirect URI and web origin on the Keycloak client.

`COMPOSE_PROJECT_NAME` selects isolated volumes. `COMMIT_PG_PORT`,
`COMMIT_PORT`, `KEYCLOAK_PORT` and `KEYCLOAK_BASE_URL` change bindings. Set
`KEYCLOAK_URL` to the same base for identity provisioning, and set the
corresponding `DATABASE_URL`, `COMMIT_BASE_URL`, `COMMIT_INTERNAL_URL`,
`KEYCLOAK_ISSUER` and `VITE_KEYCLOAK_ISSUER` consistently. The realm permits app
callbacks on ports 4173, 4179, 4186 and 5173. `make infra-down` preserves volumes;
`make infra-reset` removes only the selected project's volumes. Do not select
another deployment's project name for either command.

Integration/browser commands against a fresh local stack:

```sh
export TMPDIR="${TMPDIR:?Set disk-backed TMPDIR}" CI=true
cd lean && lake env lean --run ../services/commit/test/Fixture.lean > "$TMPDIR/commit-fixture.json"
cd ..
export DATABASE_URL=postgres://vgi:vgi-dev-only@127.0.0.1:55532/vgi_commit
export COMMIT_FIXTURE="$TMPDIR/commit-fixture.json"
pnpm --filter @vgi/commit test
pnpm --filter @vgi/commit test:integration
pnpm --filter app build
APP_TEST_PREVIEW=1 flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off pnpm --filter app exec playwright test live --project=desktop --project=narrow
COMMIT_INTERNAL_URL=http://127.0.0.1:8091 MAR_E2E=1 ADT_E2E=1 APP_TEST_PREVIEW=1 flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off pnpm --filter app exec playwright test mar-service.spec.ts adt-service.spec.ts --project=desktop --project=narrow
```

For the full `EhrHeavy` profile, `scripts/build-ehrheavy.py [--target MODULE]`
builds serially with about 8.3 GiB peak memory. The weekly workflow audits the
24 seeded-defect axioms. CI builds Lean, audits axioms, runs workspace checks
and validates packaged WASM. `make verify` runs Comparator.
[Reproduction and CI](../reproduction.md)
