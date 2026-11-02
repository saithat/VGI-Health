# Concurrency: Postgres commit authority and shared workflows

Status: native Lean authority and independent Postgres service implemented and
integration-tested (2026-11-02). Postgres is the chosen system of record. FHIR
is an exchange format; Medplum may be an asynchronous projection. The existing
browser live mode still writes to Medplum and is unchanged in this lane. G3
remains open for that deployed path until cutover.

## Boundary and implementation scope

`services/commit/` is a Node 22 HTTP host using `pg` and a supervised, long-running
`ehr serve` child. The child is stateless: JSON requests and responses, one per
line, with correlation IDs. It dispatches `init`, `step`, `facts`, `commit-check`
and `multi-step` to the existing executable Lean functions. A malformed line
gets an error response without poisoning the next request. There is no separate
TypeScript clinical guard or shared-workflow guard.

The host authenticates a bearer credential against an operator-supplied tenant
configuration. That configuration supplies user/role, permitted patients,
immutable spec/program releases, and workflow-to-commit/shared-resource bindings.
HTTP callers cannot supply those fields, a before-state, facts, context, or FHIR
effects. A session records authenticated interaction events in Postgres; the
host replays them through native Lean from `init`. A commit replays the session
and runs `Commit.check` on the chart read while holding the patient's row lock.
The actor's model ID and patient's model ID come from operator provisioning.

This is an executable command-journal foundation, with dose and bed controls.
The patient snapshot contains an imported, versioned FHIR collection and the
latest accepted command state; every accepted command and its guard input are
retained in the event log. **General clinical FHIR reduction is not implemented:**
commands do not automatically become MedicationRequest, MedicationAdministration,
Encounter, billing or other clinical-resource updates. Guard facts currently
project the imported chart; the shared dose/bed state is checked separately.
It is therefore unsuitable as a replacement live chart backend until those
reducers, source completeness and workflow bindings are validated. There is no
production identity provider, patient-directory API, release-certificate verifier,
co-sign consent protocol or physical scan attestation in this service. Static
credentials and the sample operator releases are for local synthetic-data work.
Trusting an authenticated event is not proof that a human performed the action.

The service fails closed on missing streams, changed releases, stale sessions,
version mismatch, native errors and shared rejection. There is no raw clinical
SQL/FHIR write endpoint and no online import into an existing patient stream.

## Schema and ownership

The initial schema is `services/commit/migrations/001.sql`; `002.sql` binds
stored outcomes to their patient for current access checks. Migrations run
transactionally under a database advisory lock; their names and SHA-256 content
hashes are retained in `commit_migrations`. Editing an applied migration is an
error. The local Compose project `vgi-commit`, database `vgi_commit`, port 55432
and volume `commit-postgres-data` are independent of `vgi-medplum` and its data.

All stream keys and request identities are tenant-scoped:

| Table/key | Meaning |
|---|---|
| `commit_streams (tenant,key)` | Kind, nonnegative integer `version`, JSONB snapshot. Patient keys are `patient:<FHIR-id>`. The imported chart is version 1; each accepted command advances exactly once. |
| `commit_events (tenant,stream,version)` | Append-only ordered stream history, transaction UUID, JSONB event and recording timestamp. Uniqueness prevents two events at one version. A shared commit appends one patient event and one shared event with the same transaction UUID. |
| `commit_requests (tenant,actor,request_id)` | Patient binding, canonical payload hash and durable HTTP status/body, reserved and completed in the same transaction as the command. Reusing a key with different intent is a conflict. |
| `commit_sessions (tenant,id)` | Actor, patient, release name/hash, workflow, base patient version, context, interaction log, revision and creation time. Session edits have revision checks; committed clinical events remain in `commit_events`. |
| `dose:<patient>:<order>:<occurrence>` | Provisioned shared stream; the immutable scheduled occurrence includes all three identifiers. Snapshot uses the existing Lean `Multi.State` administration log. |
| `bed:<bed-id>` | Provisioned shared stream; snapshot uses `Multi.State` placements. Assign/release and the corresponding patient event commit atomically. |

FHIR IDs and model IDs are distinct. Tenant-local patient model IDs and actor
model IDs are unique; natural-number order/occurrence/bed IDs are operator-owned.
A missing shared stream never means available. Provision streams before opening
sessions. Dose history remains after consumption; releasing a bed permits reuse.
The schema reserves a stream abstraction for other resources, such as appointment
slots. Slots would use a separate `slot:<schedule>:<occurrence>` namespace with
an atomic reserve/release transition and a proved exclusivity invariant; slot
commands are not implemented by relabeling beds in this release.

The production storage role must be the only online writer to stream/session/
request tables. Readers and projection workers get read privileges, never a
bypass that updates clinical snapshots. Migration/import maintenance is privileged.
The development `vgi` database owner is deliberately not a production role setup.
History must not be edited, truncated, or reset while clients hold versions.

## STORAGE CONTRACT assumed when connecting the proofs to persistence

The Lean proofs concern pure values and atomic executable transitions. They do
not contain an axiom about Postgres, or prove that SQL implements these conditions.
The following are explicit integration obligations, checked in part by tests:

1. **Linearizable per-stream order.** For each `(tenant,key)`, completed accepted
   writes form one sequence `S₀ --e₁--> S₁ ... --eₙ--> Sₙ`. Event versions are
   consecutive and unique; snapshot/version agree with that sequence. Every
   operation takes effect at one point between invocation and completion. A
   write completed before another operation begins precedes it in that stream.
   Failed/rejected attempts do not advance clinical streams.
2. **Optimistic concurrency at the checked version.** A command declares the
   expected version of every stream it touches. Acceptance reads the complete
   current snapshots at those exact versions and checks both the per-session
   guard and any shared transition. Persistence succeeds only if those versions
   still identify the checked snapshots; every touched stream advances once.
   No prepared Lean acceptance can be applied later to another version. An
   expected-version conflict requires fresh evidence/session reconstruction;
   automatic replay of old accepted output is forbidden.
3. **Atomic multi-stream publication.** Patient event, all shared events,
   snapshots, versions and durable idempotency outcome commit together or none
   do. A crash cannot leave a bed reservation without its patient command, or a
   request result without its effects. A reader of one stream sees a committed
   prefix. Reading several streams consistently requires one database snapshot
   or locking their complete key set; unrelated HTTP reads are not a global
   snapshot. A single-stream read does not promise cross-stream simultaneity.
4. **Read-your-writes and durable recovery.** An acknowledged success is durable
   under the configured database durability assumptions. A subsequent primary
   read returns at least that version and the same request key returns its
   recorded result, even from another service replica. Use the primary, not a
   lagging replica. After an ambiguous response the client queries/retries the
   same request identity and payload before proposing another effect.
5. **Complete authority and inputs.** Every change affecting guard inputs is
   mediated by these versioned transactions or comes from an immutable pinned
   input. Imported charts are complete assembled collections with exact resource
   versions and chart/encounter binding. Role/release/context and evidence are
   authenticated service input. A projection must faithfully reduce every
   relevant earlier event before it can be used as current clinical facts.

`Commit.accepted_current_guard` gives the existing guard on the projection
returned by `Commit.prepare`, together with the exact resource preconditions
and recomputed human-step state. It does not establish condition 5. The current
service records the exact check and protects its imported chart version, but
has not implemented the full clinical reducer needed for general EHR operation.
The `Multi` proofs give uniqueness when the persisted shared transition equals
`Multi.step` and starts safe. SQL/JSON correspondence is tested, not proved.

## Transactions, isolation and locking

The implementation uses **READ COMMITTED plus explicit row locks**, with every
statement in a transaction issued through the same checked-out `pg` client:

1. Authenticate and parse intent. Insert/lock the actor-scoped idempotency row.
   Concurrent duplicates wait on its unique key. Return an already recorded
   result without executing the clinical operation again; reject changed payloads.
2. Lock the session and verify actor, patient scope, lifetime (five minutes),
   release hash and revision. Derive touched keys from the operator workflow,
   never from arbitrary caller-supplied stream names.
3. Lock **all** patient and shared stream rows using `SELECT ... FOR UPDATE`,
   one at a time in the same sorted total key order on every replica. Read
   snapshots only after acquiring their locks. Check caller versions and the
   session's base patient version. Session-event writes follow the same
   session-before-stream lock hierarchy. Commands currently touch at most one
   patient plus one shared stream; the lock algorithm supports a closed key set.
4. Reconstruct state from the logged events on that chart. Project the locked
   bundle and run native `commit-check`. Use service UTC time for the current
   check; the interaction replay uses its captured session context. Run the
   actual `Multi.step` on the locked shared snapshot and require a change.
5. Update snapshots with an additional `WHERE version = expected` predicate;
   append every stream event, save the response, and issue `pg_notify` in the
   same transaction. The **database COMMIT is the write linearization point**.
   Only after COMMIT resolves does the host report `persisted`.

Locks are held across the native check until COMMIT/ROLLBACK. Postgres row locks
coordinate independent processes and replicas; there is no process-local mutex
acting as authority. The native supervisor's FIFO only protects its stdio framing.
A competing command waits and then reads the updated locked row, producing a
version conflict. Per-patient locks cover new/removed inputs as well as updates,
provided every writer participates. Shared bed locks protect competing patients.
A bed choice validated under only a patient lock would be unsafe.

This isolation choice is sufficient for the implemented **closed, pre-provisioned
read/write sets**. New predicate reads across patients, catalogs or schedules need
additional revision/stream locks, or a SERIALIZABLE transaction with handling of
SQLSTATE `40001`. SERIALIZABLE alone does not authenticate evidence or make a
lagging projection current. Neither serialization failures nor deadlocks retry a
cached acceptance: roll back the whole attempt and retry the same request through
reconstruction/checking. The current service returns 503 for database/native
failures and does not automatically retry them. It uses bounded lock/statement/
idle-transaction timeouts and a six-connection pool per host.

Use primary reads and `synchronous_commit=on`. Failover durability beyond one
Postgres instance needs an explicitly configured synchronous replication policy;
asynchronous promotion can violate acknowledged-write durability. Backups,
restores, retention and disaster recovery are operational requirements. Restoring
an old database under existing clients requires a new authority epoch.

See [Postgres row locks](https://www.postgresql.org/docs/16/explicit-locking.html),
[transaction isolation](https://www.postgresql.org/docs/16/transaction-iso.html),
[node-postgres transactions](https://node-postgres.com/features/transactions) and
[LISTEN startup ordering](https://www.postgresql.org/docs/16/sql-listen.html).

## API, idempotency and subscriptions

The runnable contract and operator commands are in
[`services/commit/README.md`](../../services/commit/README.md).

- `POST /sessions` binds an authenticated actor, patient, release and workflow to
  a current patient version. It returns native initial state/facts and the shared
  stream's current version when applicable.
- `POST /sessions/:id/events` records one human interaction with an expected
  session revision. The host recomputes state; an event that adds a clinical commit
  must use the command endpoint. An uncertain event result requires a new session
  and review, because event appends do not have clinical idempotency keys.
- `POST /commands` takes `requestId`, `sessionId`, `revision`, `expectedVersion`,
  `expectedSharedVersion` when required, and the final event. It never accepts
  raw state, replacement rules, user identity or FHIR effects.
- `GET /requests/:requestId` returns this actor's durable HTTP outcome; another
  actor cannot query it. The key scope is tenant/actor, across patients, so a key
  cannot accidentally authorize a second patient's effect.
- `GET /patients/:id?after=N` returns a primary snapshot/version and up to 128
  ordered durable events after N, bounded by that snapshot's version. Continue
  from the last returned event to read subsequent batches.
- `GET /patients/:id/events?after=N` is SSE; `Last-Event-ID` overrides N. Subscribe
  before a catch-up read, fetch events in version order, and resume after the
  last delivered version. Postgres `LISTEN/NOTIFY` wakes readers across replicas;
  a two-second durable catch-up also covers disconnects/coalesced notifications.
  Notifications carry no chart data and are not a durable queue. Slow readers
  disconnect and resume by cursor. Listener failures reconnect independently.

Successful responses are `201 persisted`; clinical rejection is `422 rejected`;
version/shared conflicts are `409 conflict`. Those outcomes are retained with
the request atomically. Invalid intent, authorization/session errors and failed
transactions do not reserve a durable outcome. A transport timeout/503 is
**ambiguous**, because COMMIT may already have succeeded; reconcile the same key.
Recorded outcomes take precedence over a later session expiry or changed chart,
but still require current patient access.
Idempotency is retained indefinitely in this prototype; production retention
must exceed the maximum retry horizon and never silently re-enable an old key.

## FHIR import/export and optional Medplum projection

Initial import is a privileged CLI transaction into a **new** patient stream.
It validates one Patient, complete `collection` Bundle structure, usable unique
resource versions and native projection, then writes a labeled import event and
provisions shared streams. It does not pretend an imported historical record
was accepted by the clinical guard. Duplicate patient/model IDs fail; import
never overwrites an occupied bed or consumed dose. Corrections/delta imports
into existing streams need an explicit expected-version import command and
clinical/evidence reconciliation; that endpoint is intentionally absent.

`GET /patients/:id/fhir` exports the imported R4 resources plus lossless VGI
`Basic` command records (`urn:vgi:profile:accepted-command`). Each Basic includes
the transaction ID, stream version, commit code, Patient reference and exact
journal event. The exporter fixes an upper patient version so concurrent writes
do not mix export boundaries. These are journal records, **not** a completed
clinical MedicationAdministration/Encounter mapper or a standardized VGI profile.
Their contained audit data needs the same access controls as the chart.

The next reducer must map accepted command captures to clinical facts and
standard FHIR resources under the same patient/shared transaction; version its
mapping and retain the source event IDs. Subsequent guards must read that
current reduction. Do not round-trip through Medplum to establish guard currency.
A Medplum consumer can then apply deterministic resource IDs and source-version
checkpoints in order, using idempotent FHIR transactions. Retries must not create
additional administrations. Projection lag/failure cannot roll back or duplicate
an authoritative accepted command. Rebuild the optional projection from Postgres
history; projection clients cannot write authoritative state or feed their own
unmediated changes back into the guard path. No such Medplum consumer is shipped
in this lane, and the existing Medplum database is untouched.

## Proof surface, time and tests

Existing theorem statements and hospital rules are unchanged:

| Theorem | Meaning and remaining correspondence |
|---|---|
| `Commit.accepted_current_guard` | Accepted input passed `commitGuard` on `prepare`'s exact supplied FHIR projection; authentic session state, freshness, clinical reduction and SQL are trusted integration obligations. |
| `Multi.step_invariant`, `Multi.run_invariant`, `Multi.reachable_invariant` | Dose-key uniqueness and bed-key uniqueness over the executable shared model's finite interleavings. Each persisted shared stream uses that same function. The host partitions independent dose/bed keys and tests their histories against Lean; no SQL refinement theorem is claimed. |

The model does not prove physical administration, one bed per patient, appropriate
doses, authorization, co-sign consent, fairness or liveness. Releasing another
patient's bed stutters. The deliberately unsafe stale-read schedule in
`Multi/Tests.lean` still demonstrates why preparation is insufficient.

The host's time boundary is the supplied context at the native check. Session
replay does not manufacture browser clocks; session lifetime is server-enforced.
The current event API never increments the interpreter's synthetic clock.
Rules needing validity at the later database COMMIT instant require a deadline
check tied to persistence; this implementation makes no such wall-clock theorem.
The existing 52-bit review-version digest may collide. Production review evidence
must additionally bind exact resource and patient-stream versions; imported
receipts, scanned values and external evidence need provenance validation.

Unit tests cover payload binding, version-vector validation, intent boundaries
and supervisor failure recovery. Native JSONL tests cover malformed-line recovery,
correlation, flushing, EOF and one-shot parity. Real-Postgres HTTP integration tests
use two independent hosts/pools/native processes, exercise durable duplicate
requests, process restart, guard refusal, SSE resume, SQL/native failures and
multi-stream rollback. The seeded workload uses 32 actors, simultaneous nurses
for the same scheduled occurrences, admissions to one bed, stale versions,
release ownership and reuse. It re-runs **every accepted event** through native
`commit-check` on its preceding persisted chart version, replays shared histories
through `Multi.step`, and checks gap-free stream versions and transaction pairing.
Seeded request order is reproducible; the winning actor is deliberately allowed
to vary with database scheduling. Correctness assertions hold for every winner.

Plain Lean inductive reachability remains appropriate for these two invariants.
The previously inspected Veil revision
[`0a9f0730a81db1397c91b77541aa61db8f8b7d15`](https://github.com/verse-lab/veil/tree/0a9f0730a81db1397c91b77541aa61db8f8b7d15)
pins Lean 4.32 rather than this project's 4.35; any later evaluation belongs in
a separate pinned project with checked proof reconstruction and axiom auditing.
No solver or trusted axiom was added here.

## Migration to the live app

1. Use the independent service and synthetic data; retain the browser's current
   WASM/Medplum mode. Freeze and validate certified server release artifacts.
2. Implement and validate clinical command reducers, existing-patient imports,
   production identity/access checks, exact-version review provenance, consent
   and source reconciliation. Test all deployed workflows against current charts.
3. Import/reconcile a baseline and shadow the app's commits against Postgres;
   measure guard/reducer agreement. Shadow agreement alone is not mediation.
4. Change `liveSession` to submit authenticated session events/expected versions
   and accept only durable service results. Switch authoritative writer privileges
   in the same cutover: browser, generic proxies, imports and integrations lose
   their direct clinical writes. All authoritative changes go through Postgres.
5. Retire Medplum, or run the optional read-only FHIR projection. Exercise backup,
   failover, ambiguous outcomes and projection recovery before deployment.

No app sources, dependency lock or browser artifacts are changed in this lane;
recorded certificates are not rebound. Native-only Lean additions still change
the repository's broad Lean source fingerprint used by the WASM freshness check.
