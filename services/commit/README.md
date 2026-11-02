# Lean commit service

Node 22.18+ and Postgres, with the native Lean binary as the commit authority.
This is an independent command-journal service; the browser's existing live mode
still uses Medplum. See [concurrency and the storage contract](../../docs/design/concurrency.md)
for proof scope, trust assumptions and the remaining clinical reducer/cutover work.

The package has its own npm lockfile. Installing it does not modify the root
pnpm lock or the app's certified build inputs. Run package commands from this
directory; the default `EHR_BIN` is `../../lean/.lake/build/bin/ehr`.

```sh
export TMPDIR=/home/saithat/Projects/run-tmp LEAN_NUM_THREADS=4
(cd ../../lean && lake build)
npm ci --cache "$TMPDIR/npm-cache" --ignore-scripts
# New Compose project, volume and port; leaves the Medplum stack untouched.
docker compose up -d --wait
export DATABASE_URL=postgres://vgi:vgi-dev-only@127.0.0.1:55432/vgi_commit
npm run migrate
```

`COMMIT_PG_PORT` overrides the Compose host port; update `DATABASE_URL` to match.
Compose binds Postgres to loopback, caps its container at 256 MB, and uses 64 MB
shared buffers and 24 connections. Each host uses at most six pool connections
plus one LISTEN connection; the tests run two hosts. Stop with `docker compose
stop`; ordinary teardown must retain the named data volume.

## Synthetic operator configuration

The Lean fixture exports Tiny and the unchanged V1 spec with small programs made
from canonical nursing/disposition screens. These test programs are not certified
production releases. Generate local config/chart files with development tokens:

```sh
(cd ../../lean && lake env lean --run ../services/commit/test/Fixture.lean) > "$TMPDIR/commit-service-fixture.json"
export COMMIT_FIXTURE="$TMPDIR/commit-service-fixture.json"
node --experimental-strip-types test/demo.ts "$TMPDIR/commit-demo"
export COMMIT_CONFIG="$TMPDIR/commit-demo/commit-config.json"
npm run import -- "$TMPDIR/commit-demo/commit-patient.json"
npm start
# From a second shell in this directory, with the service still running:
# npm run smoke -- http://127.0.0.1:8090
```

Default HTTP address: `127.0.0.1:8090`. `HOST`, `PORT` and an absolute `EHR_BIN`
may override defaults. `COMMIT_CONFIG` is a private operator JSON file containing:

- `tenant`: tenant identifier;
- `actors`: `{token,user:{id,role},modelId,patients:[FHIR-id,...]}`; token length
  at least 24, unique actor identities/model IDs, roles resolved by the operator;
- `releases`: a dictionary of `{spec,program,workflows}`. A workflow contains
  `commit` and optionally `shared:{kind:"dose",order,occurrence}` or
  `shared:{kind:"assignBed"|"releaseBed",bed}`. These trusted bindings define the
  complete shared read/write set and must match the clinical meaning of the commit.

Import files contain `{patient,modelId,bundle,context}` with a versioned complete
FHIR `collection` Bundle and Lean FactsContext. Import creates a new patient
stream at version 1 and empty shared streams if absent; importing an existing
patient fails. It is privileged baseline ingestion, not a clinical guard bypass
for corrections. Retain the config unchanged across replicas; its release hashes
pin existing sessions. Use a validated native binary and operator-approved rules.
No automatic release certificate verification is implemented.

The demo patient has an amoxicillin administration context. Nurse credentials
are `synthetic-only-actor-token-000` through `...-019`; physician credentials are
`...-020` through `...-031`. They are synthetic test credentials. Runtime tokens
are never placed in command events or notifications. Production authentication,
TLS/access policy, credential lifecycle and SQL role provisioning are deployment
work; the default listener is local.

## HTTP contract

Every endpoint requires `Authorization: Bearer <token>` and patient scope.
JSON request bodies are bounded to 64 KiB. Identifiers/versions and unknown
request fields are validated. User/role, chart, rules and before-state cannot be
supplied by HTTP clients.

| Method/path | JSON request / result |
|---|---|
| `POST /sessions` | `{patient,release,workflow}` → `{sessionId,revision,version,state,facts,shared?}`. Shared includes its key, expected version and native state. |
| `POST /sessions/:id/events` | `{revision,event}` → new revision, recomputed state/result. Record each interaction; events adding commits must use `/commands`. |
| `POST /commands` | `{requestId,sessionId,revision,expectedVersion,expectedSharedVersion?,event}` → durable persisted/rejected/conflict result. Shared version is mandatory for a shared workflow. |
| `GET /requests/:requestId` | This actor's durable `{status,body}` outcome; 404 if absent. |
| `GET /patients/:id?after=N` | Current `{version,snapshot,events}` and up to 128 ordered events, each with version, transactionId and event. Continue from the last event for more. |
| `GET /patients/:id/events?after=N` | SSE `event: commit`, `id: <stream-version>`, JSON event. `Last-Event-ID` takes precedence over `after`; reconnect with the last received ID. |
| `GET /patients/:id/fhir` | R4 collection of imported resources plus lossless VGI Basic command records at a fixed stream version. This is not a general clinical-resource mapper. |

A command is the final human interpreter event, e.g.
`{"click":{"comp":"w4Admin.commit.administerMed"}}`. Earlier interactions are
Lean Event JSON, e.g. `{"enter":{"comp":"w4Admin.medScan","value":{"code":{"c":"amoxicillin"}}}}`.
The nursing workflow is `release:"nurse", workflow:"dose"`; the signing example
is `release:"tiny", workflow:"sign"`. Start at the returned state and use the
program's actual controls; the integration tests contain complete event traces.

`201`/`outcome:"persisted"` includes transactionId, new patient/shared versions
and recomputed staged state. `422`/`rejected` includes the clinical guard reason;
`409`/`conflict` requires fresh state/review. An occupied shared resource is a
conflict even when expected versions are current. HTTP 400/401/403/404 identify
invalid input, missing credentials, scope denial and missing objects. Session
revision conflict/expiry and changed releases also return 409 with an error code.
Native codec/transport and SQL failures return 503 and roll back the attempt.

Reuse the **identical** command and requestId after a timeout/503, or query its
outcome. The request key is tenant/actor scoped across all patients, bound to the
canonical full payload and retained indefinitely. Successes, guard rejections
and version/shared conflicts are recorded atomically. A key with changed payload
returns 409. Duplicate responses retain their original status/body. Request keys
are not a license to reuse an old acceptance at another version.

Sessions expire after five minutes or become stale when the patient version
changes. Start a new session and repeat review after a conflict; there is no
silent acknowledgment rebase. Event requests use session revisions, not clinical
idempotency keys: after an uncertain event append, start a new session rather
than automatically appending it again. A session has at most 256 recorded events.

The supervisor limits its queue to 128, uses one two-thread native child per host,
limits frames, kills timed-out/corrupt children and respawns on the next call.
It never automatically retries the host transaction. Shutdown drains HTTP work,
closes subscriptions/listener, terminates the child and releases the pool.

## Verification

Build once and generate the fixture before tests. No test starts a Lake process;
only the explicit fixture-generation command does. Integration tests require a
real Postgres instance and fail if `DATABASE_URL`/`COMMIT_FIXTURE` is absent.
They allocate and delete one random tenant and never truncate shared tables.

```sh
export TMPDIR=/home/saithat/Projects/run-tmp LEAN_NUM_THREADS=4
(cd ../../lean && lake build)
(cd ../../lean && lake env lean --run ../services/commit/test/Fixture.lean) > "$TMPDIR/commit-service-fixture.json"
export COMMIT_FIXTURE="$TMPDIR/commit-service-fixture.json"
python3 ../../scripts/test-ehr-serve.py "$COMMIT_FIXTURE"
python3 ../../scripts/test-commit-check.py
npm run typecheck
npm test
DATABASE_URL=postgres://vgi:vgi-dev-only@127.0.0.1:55432/vgi_commit npm run test:integration
CONCURRENCY_SEED=42 DATABASE_URL=postgres://vgi:vgi-dev-only@127.0.0.1:55432/vgi_commit npm run test:integration
```

The deterministic generator fixes actor intents and submission order from the
seed; actual winners may vary under Postgres scheduling. The race suite uses
32 actors across two independent hosts/native processes, 224 concurrent
command attempts, same-dose nurses, cross-patient bed competition, stale writes,
shared release ownership and reuse. Every accepted clinical event is independently
rechecked by native Lean against the prior persisted chart version; shared
histories are replayed with `Multi.step` and checked for uniqueness. SQL failure
after a first-stream write and native failure after clinical acceptance must
roll back all streams and the request outcome. Other tests cover authentication,
intent injection, stable duplicates, host restart, SSE replay and FHIR journal
export. This is tested SQL/Lean correspondence, not a new refinement theorem.
