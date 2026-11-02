# ADT and 4 West MAR development rollout

This lane provisions synthetic development accounts/charts on the existing
`vgi-keycloak` and `vgi-commit` services. It never resets a volume, restarts
Medplum or writes its resources. The native ADT reducer governs administrative
placement only. Clinical admission/discharge orders, current real-patient
baseline reconciliation, production access policy/operations and FHIR Encounter
projection need separate review before clinical use.

## Identity and operator bindings

From the repository root, using the existing dev containers:

```sh
export TMPDIR=/home/saithat/Projects/run-tmp LEAN_NUM_THREADS=2
export npm_config_cache="$TMPDIR/npm-cache"
export DATABASE_URL=postgres://vgi:vgi-dev-only@127.0.0.1:55432/vgi_commit
export EHR_BIN="$PWD/lean/.lake/build/bin/ehr"
export KEYCLOAK_SUBJECTS="$TMPDIR/4west-subjects.json"
(cd lean && lake build)
(cd lean && lake env lean --run ../services/commit/test/Fixture.lean) > "$TMPDIR/commit-service-fixture.json"
export COMMIT_FIXTURE="$TMPDIR/commit-service-fixture.json"
node infra/keycloak/provision-adt.mjs --running-dev
node --experimental-strip-types services/commit/test/adt-dev.ts "$TMPDIR/adt-4west-dev"
```

The migrator reads the existing local Keycloak container's bootstrap credential
in memory with `--running-dev`. Alternatively omit that option and supply
`KEYCLOAK_ADMIN_PASSWORD` through environment or the untracked root `.env`.
It creates a random `KEYCLOAK_4WEST_PASSWORD` in that `.env` (mode 0600) if absent;
new synthetic users share this local development password. Existing account
passwords are retained. The script is idempotent; it adds roles, group membership,
redirects and a unit claim mapper, preserving unrelated attributes/roles/client
settings. The `units` profile attribute is editable only by administrators, so
users cannot assign their own unit scope. Subject bindings are saved at the path
above. Treat that file as operator-owned input; validate subjects after identity
migration rather than assuming exported IDs equal API-created IDs.

For an empty dev installation, first run `node infra/keycloak/setup.mjs`, then
`docker compose --env-file .env -f infra/keycloak/compose.yml up -d` and
`docker compose -f services/commit/compose.yml up -d --wait`. Run the additive
migrator afterward as above even on a fresh import; it installs the managed
unit-profile declaration. Ordinary use reuses the existing containers.

| Username | Effective roles | Unit/group |
|---|---|---|
| `4west-rn1`, `4west-rn2` | `rn` from group | `4-west-rn`, signed unit `4-west` |
| `charge-4west` | `rn`, `charge-nurse` | `4-west-rn`, signed unit `4-west` |
| `bed-manager` | `bed-manager` | signed unit `4-west` |
| `admitting-clerk` | `admitting-clerk` | signed unit `4-west` |

The generated config retains the earlier persona identities but enables MAR for
the new unit-scoped RNs; earlier persona accounts without unit assignments do
not acquire 4 West access. `4-west` is enabled, `5-east` is disabled. Every MAR
workflow has an explicit unit and an immutable patient/order/occurrence binding.
The development ADT board has two patients and beds 401/402. Administrative
provisioning starts these new synthetic records unadmitted with ready empty beds;
this does not reconcile a real hospital census or infer placement from FHIR.

## Provision streams and serve

Install the service dependencies if needed:
`(cd services/commit && npm ci --cache "$TMPDIR/npm-cache" --ignore-scripts)`.
With the environment above, from the repository root:

```sh
export COMMIT_CONFIG="$TMPDIR/adt-4west-dev/adt-config.json"
node --experimental-strip-types services/commit/src/manage.ts migrate
node --experimental-strip-types services/commit/src/manage.ts import "$TMPDIR/adt-4west-dev/mar-patient.json"
node --experimental-strip-types services/commit/src/manage.ts import "$TMPDIR/adt-4west-dev/adt-patient.json"
node --experimental-strip-types services/commit/src/manage.ts provision-adt
node --experimental-strip-types services/commit/src/main.ts
```

Imports/provisioning are **initial-only**: an existing patient or bed causes a
transaction rollback, never a reset. Do not repeat import/provision commands for
a tenant already initialized. Reuse its streams and generated config. Different
synthetic experiments can set `ADT_TENANT` before generation. Never change a live
board's patient/bed set or run divergent replica configs. The closed-board lock
scope is capped at 64 patients/64 beds; smaller per-unit boards are intended.

The service defaults to port 8090. Build/serve the app through its existing Vite
commands with `COMMIT_INTERNAL_URL=http://127.0.0.1:8090`, then open
`http://127.0.0.1:5173/?workflow=adt` (bed manager/charge/clerk) or
`http://127.0.0.1:5173/?workflow=mar` (4 West RN). The realm allowlist also covers
127.0.0.1:4179 and localhost:5173/4173. Additional origins require an explicit
client allowlist change. Production TLS, separate credentials and limited SQL
writer privileges remain deployment work.

Admit assigns a ready bed. Transfer atomically clears/marks the source dirty and
assigns the destination. Release leaves admission active and the bed dirty;
assign can then place that admitted patient. Discharge ends admission and releases
the bed. Dirty → cleaning → ready is explicit. These statuses attest an operator's
command; the proof cannot verify physical cleaning, presence or clinical fitness.
The new ADT snapshot is stored under `patient.snapshot.adt`; standard imported
Encounter resources are retained unchanged, and no clinical order is generated.

## Unit cutover, rollback and verification

For an approved rollout, reconcile the unit's patient/order/bed baseline,
provision exact identities/scopes, validate the pinned release and compare source
projections before enabling its `marOnService` flag. Deploy identical operator
configuration to every replica. A configuration change requires a service restart;
it is not a browser flag or a runtime HTTP write. The browser's Keycloak tokens
stay in memory; administrative roles/units come from verified claims, with unit
scope further restricted by operator provisioning.

To stop new 4 West MAR writes, set `units["4-west"].marOnService` to `false` in the
private config and restart all replicas together. Existing sessions/evidence and
cosigns cannot bypass the final gate. Keep the service available for durable
outcome reconciliation/export. Never fall back to a direct Medplum MAR writer,
reset dose history, or delete outcomes. ADT commands remain independent of the
MAR flag; suspend ADT by withdrawing its roles/scopes or stopping its writer.
Previously issued tokens retain their roles until expiry (five minutes), so
urgent withdrawal also requires stopping writes/revoking sessions operationally.

```sh
# Repository root; environment from above.
(cd services/commit && npm run typecheck && npm test && npm run test:integration)
pnpm --filter app build
# The real browser suite owns an isolated random tenant and service on 8091.
COMMIT_INTERNAL_URL=http://127.0.0.1:8091 ADT_E2E=1 APP_TEST_PREVIEW=1 \
  pnpm --filter app exec playwright test adt-service.spec.ts --workers=1
```

The browser suite covers desktop/narrow viewports, all ADT operations, charge-nurse
SSE refresh, real 4 West RN MAR opening and identical-intent recovery after an
ambiguous response; the workflow case aborts any Medplum call. Its tenant
and processes are cleaned up without deleting the enduring development tenant.
Integration files run serially to fit the shared Postgres connection budget.

App routing/data/screens change the certified app hash. Native-only Lean changes
also invalidate the broad WASM source manifest even though the existing browser
interpreter semantics are reused. Historical certificates were not rebound.
Rebuild WASM and revalidate/rebind recordings in a separate certification pass
before offering historical replay on this build.

Owner review before clinical rollout: administrative role/guard policy, units
and bed inventory, real RN identities and patient-access scopes, baseline census
reconciliation, mapping to clinical Encounter/order/discharge records, cleaning
attestation policy and production operations. The shipped synthetic provisioning
is not evidence that a real 4 West RN has been onboarded.

## Lane verification on 2026-11-02

Commands ran from the repository root with the environment above. The database
was the existing loopback `vgi_commit`; integration/browser tenants were isolated
and cleaned up. The enduring `adt-4west-dev` tenant retains the two imported
synthetic patients and initially ready beds. No persistent service process is
left running; use the startup command above.

| Exact command | Result |
|---|---|
| `(cd lean && lake build)` | Pass, 417 jobs. Fourteen concrete ADT proof examples included. |
| `(cd lean && lake env lean Ehr/Commit/Adt.lean)` | Eight printed theorem axiom sets, all subsets of propext/Classical.choice/Quot.sound. |
| `python3 scripts/test-commit-check.py` | 15 cases pass. |
| `python3 scripts/test-ehr-serve.py "$COMMIT_FIXTURE"` | JSONL recovery, correlation, flushing, EOF and native parity pass. |
| `npm --prefix services/commit run typecheck` | Pass. |
| `npm --prefix services/commit test` | 6 tests pass. |
| `npm --prefix services/commit run test:integration` | 23 tests pass; no skips. Includes both new suites and existing MAR/shared-stream regression suites. |
| `pnpm --filter app exec tsc --noEmit` | Pass. |
| `pnpm --filter app exec eslint src/AdtApp.tsx src/data/adtService.ts src/data/commitService.ts src/navigation.tsx src/MarApp.tsx e2e/adt-service.spec.ts` | Pass. The response-loss test has one documented narrow rule suppression for Playwright's real `route.fetch`; production data boundaries are unchanged. |
| `pnpm --filter app build` | Pass. |
| `COMMIT_INTERNAL_URL=http://127.0.0.1:8091 ADT_E2E=1 APP_TEST_PREVIEW=1 pnpm --filter app exec playwright test adt-service.spec.ts --workers=1` | 4 cases pass: two tests at desktop and narrow widths. Successful board screenshots inspected. |
| `pnpm --filter app test --maxWorkers=4` | 315 tests pass in 39 files; one additional file fails collection because `runs/core-10day-live/trajectories/index.json` is absent. Historical data was not reconstructed. |
| `pnpm --filter app lint` | Fails solely on the existing cast at `app/tests/ui-painter.test.tsx:1662`; that line matches starting HEAD and is untouched. |
| `make wasm-check` | Fails the broad source/asset freshness binding after native additions. WASM assets and historical certificates were not rebuilt/rebound in this lane. |
| `node infra/keycloak/provision-adt.mjs --running-dev` | Pass, including repeated additive runs. Actual subjects captured; managed unit claims verified through real browser code flow. |
| `git diff --check` | Pass. Protected Lean paths, root dependency lock and gitignore unchanged; no ignored data staged. |

`CLAUDE.md` was absent in this worktree; no applicable `AGENTS.md` was found.
The implementation uses the owner's instructions and README. Broad historical
browser/conformance suites and real-patient rollout were not attempted: this lane
invalidates recorded app bindings and does not supply a reconciled clinical census.
