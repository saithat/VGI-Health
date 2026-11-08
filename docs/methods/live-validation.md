# Local setup and live validation

[Overview](../../README.md) · [Methods and reproduction](../../README.md#documentation)

Requires Node ≥22.18, pnpm 11.8, Docker Compose and the pinned Lean 4.35
(`lean/lean-toolchain`). Set `TMPDIR` to disk-backed scratch outside the repository
before using the commands below. Fixture/world/recording data is local and gitignored;
restore it before importing or running archive tests. FHIR is an initial import
format only. `fixtures/clinical/overrides.json`, dated world resources and
`runs/world/2/context/day-01.json` are composed before the immutable import;
Synthea and Synthetic Hospital identities and references are preserved. The
loader verifies fixture hashes, normalizes resource IDs/references (including
stable content-derived IDs for anonymous resources), imports each
patient exactly once and refuses a changed baseline. Rerunning an identical
import preserves every later event. There is no online import/reset API.

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
