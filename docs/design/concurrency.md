# Concurrency: Postgres commit authority and shared workflows

Status: W4 medication administration is the first live workflow on the Postgres
commit authority (2026-11-02). Identity for this path is Keycloak OIDC. FHIR is
import/export; Medplum may be an asynchronous projection. Administrative ADT now uses the same authority with a native reducer, multi-stream
transactions and snapshot SSE. Other workflows still
use the client-side guard and Medplum transaction path. G3 remains open there.

## Boundary and implementation scope

`services/commit/` is a Node 22 HTTP host using `pg`, `jose` JWKS verification and
a supervised, long-running `ehr serve` child. JSONL dispatch includes `init`,
`step`, `facts`, `commit-check`, `multi-step`, `mar-context`, `mar-import-context`, `mar-commit` and `adt-commit`.
No TypeScript copy of the clinical guard or MAR reducer exists.

`/?workflow=mar` and the P3/RN2 login buttons use Keycloak Authorization Code +
S256 PKCE. The public client has no secret and password grants are disabled.
Access/refresh tokens stay in browser memory; only redirect state/verifier use
session storage. The host pins issuer/JWKS URL, audience, RS256 algorithm and
client, requires subject/expiry/issued-at, and refuses ID tokens. Lean `user.id`
is the verified `sub`; exactly one recognized clinical realm role supplies Lean's role.
Administrative-only identities use the separate ADT roles and cannot open clinical sessions.
Operator provisioning binds that subject to model ID and patient scope. Those
fields, spec/program releases and scheduled occurrences cannot come from HTTP
bodies. Static credentials remain only for the earlier isolated service demo;
a configuration containing MAR bindings requires OIDC and forbids static tokens.
The dev realm includes P1/P2 physicians, P3/RN2 nurses, P4 NP and P5 surgeon.
Setup, secret creation and exact commands are in the
[service README](../../services/commit/README.md#w4-mar-and-keycloak) and
[infra README](../../infra/README.md#keycloak-for-w4).

A session pins an operator-owned spec/program and patient version. The host
reconstructs its authenticated interactions from `init`; every accepted session command
runs `Commit.check` against the locked current collection. W4 additionally runs
`Commit.Mar.commit`: patient-stream MAR state reduces barcode-scanned,
double-check-cosign, administered, held and refused events. A single command
contains its evidence events plus its clinical outcome; they publish in one
patient-stream version, not as partially visible clinical changes. Given consumes
the dose through the same `Multi.step` used in the multi-actor proof. Held/refused
retain reason and create `not-done` records without consuming the dose. A later
given is permitted after fresh review. Held/refused advance the locked dose
stream with an explicit `shared-noop` event and unchanged shared state; given
advances it through `Multi.step`. The reducer checks the complete guard
again and records the exact read/written versions.

`mar-context` resolves the exact active MedicationRequest, patient, encounter,
formulary drug and explicit scheduled time in Lean. The clinical reducer emits
an R4 MedicationAdministration with a transaction UUID as stable identity,
patient/order/encounter links, authenticated performer, recording time and source
evidence. It retains actual dose/route/site only when captured; the active core
profile does not require all catalog fields, and scheduled quantities are never
invented as actual quantities. The patient snapshot appends that resource before
subsequent facts projection. The event retains the complete input, decision,
read versions and reducer output for independent replay. SQL persists patient,
shared-dose, resource and durable outcome atomically.

A high-alert cosign also requires consent from a separately authenticated RN,
for the same patient, workflow, release hash and exact patient version, expiring
in five minutes. A typed name alone is insufficient. This authenticates an
attestation; it does not prove a physical scan, double-check or administration.
SSE uses a bearer header, terminates at token expiry, and reconnects with refreshed
identity and a durable cursor. A remote update discards stale interaction evidence,
opens a fresh service session and displays the current MAR. Version conflicts
also refresh; uncertain clinical saves reconcile the same request identity.
The legacy `liveSession` Medplum `administerMed` save fails closed.

This is a **development W4 cutover on pre-provisioned scheduled doses**, not a
general clinical backend. General reducers, existing-patient reconciliation,
release-certificate verification, production patient-access policy, exact-version
review provenance, physical evidence, TLS/operations and complete catalog review
remain deployment work. Other workflows retain their existing Medplum behavior.
The host fails closed on missing streams, changed releases, stale sessions,
version mismatch, native errors and shared rejection. There is no raw clinical
SQL/FHIR write endpoint or online import into an existing patient stream.

## Schema and ownership

The initial schema is `services/commit/migrations/001.sql`; `002.sql` binds
stored outcomes to their patient for current access checks; `003`/`004` add
version-scoped, release-bound independent-nurse consent. Migrations run
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
| `commit_mar_cosigns` | Authenticated RN consent scoped to patient, workflow, release hash, patient version and five-minute expiry; the clinical event retains the resulting cosign evidence. |
| `bed:<bed-id>` | In ADT tenants, `{id,unit,phase,occupant}` from the native ADT reducer. The patient snapshot holds `adt:{id,admitted,bed}`. Older isolated shared-bed tests use `Multi.State`; combined ADT/legacy-bed configurations are forbidden. |

FHIR IDs and model IDs are distinct. Tenant-local patient model IDs and actor
model IDs are unique; natural-number order/occurrence/bed IDs are operator-owned. MAR import pins the dose-to-order/explicit-time binding in the
patient genesis snapshot; configuration aliases/reassignment are rejected.
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
service records the exact check and protects its imported chart version, and
W4 additionally reduces its MAR resources before the next guard. General EHR
clinical reduction remains incomplete.
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
   session-before-stream lock hierarchy. Legacy/MAR commands touch at most one
   patient plus one shared stream. ADT locks its complete configured patient/bed
   read set, then writes only changed streams (three for a transfer).
4. Reconstruct state from the logged events on that chart. Project the locked
   bundle and run native `commit-check`. Use service UTC time for the current
   check; the interaction replay uses its captured session context. For W4 run `mar-commit` and check version-bound cosign consent. Run the
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
was accepted by the clinical guard. `mar-import-context` conservatively rejects
any completed administration already linked to a selected MAR order; operators
must reconcile that baseline rather than import an empty consumption log. Duplicate patient/model IDs fail; import
never overwrites an occupied bed or consumed dose. Corrections/delta imports
into existing streams need an explicit expected-version import command and
clinical/evidence reconciliation; that endpoint is intentionally absent.

`GET /patients/:id/fhir` exports the imported R4 resources plus lossless VGI
`Basic` command records (`urn:vgi:profile:accepted-command`). Each Basic includes
the transaction ID, stream version, commit code, Patient reference and exact
journal event. W4 snapshots additionally contain the reducer-produced
MedicationAdministration resources. The exporter fixes an upper patient version so concurrent writes
do not mix export boundaries. Basic resources remain journal records, not an Encounter/general clinical mapper
or a standardized VGI profile.
Their contained audit data needs the same access controls as the chart.

Each subsequent workflow reducer must map accepted command captures to clinical facts and
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
| `Commit.Mar.applyEvent_invariant`, `reduce_invariant`, `commit_invariant` | MAR reduction preserves the existing `Multi.Invariant`, including dose-once, for arbitrary actors/interleavings from a safe state. |
| `Commit.Mar.accepted_guard_at_written_version` | Every accepted MAR write passed `commitGuard` on its prepared bundle; its recorded read version equals the expected version and its write is that version plus one. SQL supplies the locked snapshot and persists exactly that result; this correspondence is tested, not proved. |
| `Multi.step_invariant`, `Multi.run_invariant`, `Multi.reachable_invariant` | Dose-key uniqueness and bed-key uniqueness over the executable shared model's finite interleavings. Each persisted shared stream uses that same function. The host partitions independent dose/bed keys and tests their histories against Lean; no SQL refinement theorem is claimed. |

The older `Multi` model does not prove physical administration, one bed per patient, appropriate
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

1. W4 now uses Keycloak, a pinned operator release and the native MAR reducer.
   Provision a new patient stream and immutable dose bindings, validate chart
   completeness and compare source/version projections before clinical use.
2. Build reducers and invariant/guard proofs for assessments, orders, results,
   clinical disposition, referrals, refills and remaining workflows. Preserve
   exact resource versions, source events and patient/encounter identity. Existing
   shared-bed tests remain separate from the new administrative ADT reducer.
3. Shadow each workflow against Postgres and reconcile existing patient baselines.
   Validate production identity/access, review provenance and release certificates.
   Agreement is necessary but does not mediate writes.
4. Switch each `liveSession` path and its authoritative writer privileges together.
   Remove browser/integration direct writes for migrated resources; generic
   Medplum credentials can still change that separate database today, but cannot
   change W4's authoritative Postgres patient/dose streams. Do not feed those
   unmediated Medplum changes back into current W4 guards.
5. Retire Medplum or implement the optional read-only projection with deterministic
   IDs and source-version checkpoints. Exercise backup, failover, ambiguous-save
   recovery and projection lag before deployment.

This cutover changes certified app sources and the app hash. Existing recorded
certificates are not rebound. Native Lean additions also change the broad source
fingerprint used by WASM freshness checks. Protected Specs/Props/Statements and
comparator definitions remain untouched.


## Administrative ADT authority and 4 West rollout

`Commit.Adt` defines a complete board as patient records with a single optional
bed and bed records with a single optional occupant. `valid` requires unique
patient/bed identifiers, admission before occupancy, referential integrity in
both directions and occupied status exactly when a bed has an occupant.
`guard` additionally checks role and command-specific state: admit starts from
not-admitted/unplaced, assign starts admitted/unplaced, transfer owns its distinct
source and targets a ready empty bed, release owns the bed, discharge requires
admission, cleaning starts dirty/empty, and ready follows cleaning/empty.
Released beds become dirty. Release retains admission; discharge ends it.

`commit` validates the exact read vector, administrative guard and complete
postcondition before returning one successor. Preservation is proved through
this executable postcondition check; this is not a theorem that arbitrary calls
to the unchecked `apply` function preserve safety. `commit_invariant`,
`bed_exclusivity`, `bed_one_patient`, `patient_one_bed` and `reachable_invariant`
establish the safety properties of accepted transitions. `transfer_atomic`
identifies the full simultaneous move; `transfer_holds_target` establishes that
the transferred patient's successor holds the destination. All printed theorem
axioms are within propext/Classical.choice/Quot.sound. There are no new axioms,
no changes to protected specs, and no connection to physical bed occupancy.
Clinical authorization/orders/discharge planning remain separate obligations.

`AdtStore` reads and locks the **whole configured board**, including negative
placement reads, one row at a time in sorted order. The closed set is capped at
64 patients and 64 beds. Every client submits the full displayed version vector;
a missing, duplicate, reordered, extra or stale entry conflicts. The native input
contains only these locked snapshots plus server-authenticated role. All changed
streams advance exactly once using an additional SQL expected-version predicate.
The transaction appends the native input/output and actor/request identity to
each changed stream, records the durable outcome and notifies subscribers. A
transfer writes exactly patient/source/target, sharing one transaction UUID.
No automatic retry or rebase of clinical intent occurs. The coarse lock/vector
scope is deliberately conservative; a future sharded implementation needs a
proof/lock contract covering patients moving between boards. Operators must not
run replicas with different board definitions or legacy bed writers in that tenant.

`GET /adt/board` reads all configured streams in **one SQL statement**.
`GET /adt/events` sends complete `event: board` snapshots with a SHA-256 digest
of the ordered version vector as its opaque ID. `Last-Event-ID` overrides `after`.
The listener registers before catch-up; notifications and a two-second poll read
durable snapshots. A reconnect with an old digest gets the current complete board.
This is snapshot synchronization, not a replay of every historical board state;
the underlying ordered event journals remain durable. Token expiry closes SSE.
Separate patient/bed HTTP requests cannot promise a cross-stream snapshot; clients
must use the board endpoint for transfer-consistent reads.

Keycloak `bed-manager` and `charge-nurse` permit all ADT operations;
`admitting-clerk` permits admit/assign only. A charge nurse can also hold `rn`.
Administrative roles are distinct from clinical Lean roles; generic clinical
sessions reject an administrative-only identity. Signed unit claims intersect
provisioned unit scope. Every board patient and unit must be authorized before
GET, commands or SSE. Patient-scoped readers without complete administrative
board access receive only their own ADT patient result/command in history/SSE
and FHIR Basic exports; the full native replay context stays in the audit journal.
There is no broad board-data leak through a routine patient-history endpoint.

`units[unit].marOnService` and each MAR binding's `unit` provide the per-unit
cutover gate. When units are configured, all MAR bindings must declare one.
Unknown units fail configuration parsing; disabled/out-of-scope units have no
directory items and cannot open sessions, append session evidence, cosign or
write, including sessions opened before disablement. Durable existing outcomes
remain reconcilable. Legacy unit-less isolated test configurations are supported;
the 4 West rollout uses explicit unit bindings. Scheduled binding unit changes
require baseline reconciliation rather than silently repointing a dose.

The additive realm migrator provisions 4 West RN membership, admin-managed unit
attributes/claims and ADT redirects without resetting the realm or old passwords.
It captures actual subjects because the administrative user-creation API may
allocate IDs different from an import file. Operator/service config and synthetic
charts are generated in disk scratch. See [rollout](adt-rollout.md) for exact
commands, deployment limitations and rollback. No Medplum data is touched.

`adt.integration.test.ts` uses independent hosts/pools/native children and signed
JWKS tokens, 12 seeded same-bed admission races and 12 transfer/discharge races.
It asserts both safety invariants on concurrent board reads, tests late SQL
rollback/idempotency, rejects stale/incomplete vectors and unauthorized scopes,
checks patient audit redaction, resumes SSE, independently replays every accepted
ADT transition and verifies gap-free versions/transaction pairing. The new
`adt-service.spec.ts` exercises all seven operations, two roles receiving board
updates and a provisioned 4 West RN opening service MAR on desktop and narrow
screens against real Keycloak/Postgres/Lean. A second browser case drops a
success response after persistence and verifies identical-payload reconciliation
before further commands. `mar-unit.integration.test.ts`
checks the unit flag on directory/session/cosign and a prepared final command.
Integration files run serially to fit the existing database connection budget.
