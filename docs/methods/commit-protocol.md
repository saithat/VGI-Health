# Commit protocol methodology

[Overview](../../README.md) · [Methods and reproduction](../../README.md#documentation)

`lean/Ehr/Commit/Protocol/Model.lean` is an executable transition system;
`Proofs.lean` checks its safety theorems in Lean 4.35; `Cache.lean` models
version-bound journal caches separately. `AdtModel.lean`, `AdtProofs.lean` and
`AdtCheck.lean` extend this methodology to the implemented administrative board;
`LockOrder.lean` proves the ordered-prefix circular-wait exclusion lemma.
[Verification evidence](../audits/commit-model-20261106.md)
records exact commands, finite bounds and outcomes. These new statements are
not entries in the clinical Comparator catalog. The default `CommitProtocol`
library checks these proofs. The native executable includes the shared model
checkers for the protocol trace commands. They do not change clinical
specifications or claim verification of TypeScript/SQL.

The machine represents arbitrary finite client/request sets, actor-scoped request
IDs, immutable payload binding, duplicate attempts through independent hosts,
request locking, incremental read-set locking, locked version reads, session base
version/revision checks, native guard decisions, provisional append/projection,
atomic publication, lock release and response. A crash can abort at every phase;
a crash after publication loses the response but preserves the outcome. A client
timeout does not cancel a running transaction. Retry uses the original intent.
Requests that throw before publication leave no receipt. Returned command
refusals are durable; replay bypasses expired sessions but still requires host
authorization. No liveness, fairness or physical administration claim is made.

### Storage assumption

Assume Postgres primary READ COMMITTED behavior: a statement after acquiring a
row lock observes the committed predecessor; exclusive row/unique-key locks last
until transaction end; unique request and stream-version constraints hold;
COMMIT atomically and durably publishes every touched stream event, snapshot and
request outcome, or publishes none. Synchronous commit is enabled. An uncertain
COMMIT is either outcome, and retry resolves it by the unique request key. Initial
imports/provisioning must be consistent and the service the sole online writer.
Network partitions, failover configuration, database implementation, external
writers, authentication and corruption are outside the theorem.

Version zero abstracts each stream's imported baseline; versions count command
appends. `projection` is the shared reducer projection; `patientProjection` stores opaque
clinical successor hashes and is also proved equal to its event fold. Clinical
FHIR transformation functions and initial imports remain implementation tests. `keys` abstracts the
complete locked patient/shared/closed-board read set, including negative bed
reads. The existing `Ehr.Multi` reducer supplies the original model's bed/dose semantics.
The separate ADT machine uses `Ehr.Commit.Adt.commit` directly, including ready,
occupied, dirty and cleaning phases. Clinical FHIR materialization remains an
implementation test. The final CAS validates the captured read vector. The ADT
checker tests lock prefixes, mutual exclusion and absence of wait cycles; the
lock theorem excludes circular waits for strictly ordered acquisition prefixes
under the service hierarchy. The host's correspondence to that hierarchy is
tested/inspected, not proved. Native clinical semantics are a fresh guard-result oracle;
`HistoryCorrect` binds each accepted oracle result to its replaced version.

### Claims and limits

| Claim | Evidence |
|---|---|
| One effect per actor-scoped request ID; changed payload cannot write | Unbounded `no_duplicate_accepted`, `changed_payload_no_effect` |
| Every accepted receipt has an event, every event an accepted receipt | Unbounded `no_lost_accepted`, `no_phantom_effect` |
| Exact stable answer when retry finds a durable receipt | Unbounded `retry_stable`, `receipt_persistent`; thrown errors and later authorization changes excluded |
| Append satisfied the guard and expected versions of its exact log prefix | Unbounded `guards_on_replaced_versions` |
| Bed exclusivity and dose uniqueness | Unbounded `bed_exclusivity_and_dose_at_most_once`, using the existing Multi proofs |
| Refused/stale new commands have no clinical effect | Unbounded `refusal_no_effect` |
| Shared and opaque patient projections equal folds of accepted events | Unbounded `projections_equal_fold`, `patient_projections_equal_fold`, `machine_patient_projection` |
| Advisory cache cannot bypass a fresh guard refusal | Unbounded conditional `cache_cannot_bypass` |
| Cache state equals fresh replay under fixed version-bound replay inputs | Unbounded `Cache.reconstruct_fresh`, `Cache.interact_consistent`, `Cache.acceptance_equals_fresh`; host refinement remains conditional |
| Every fine-grained step preserves all durable safety properties | Unbounded `advance_publication`, `machine_invariant` |
| Bad interleavings, duplicate/retried requests and crashes | Executable bounded exploration in `Check.lean` |

`cacheVersion` records hit/miss eligibility; `cacheNative` deliberately carries
an arbitrary optimistic cache answer. Acceptance still requires the fresh oracle.
This is a contract, not a proof that `Store.reconstruct`'s cached state is equal
to fresh replay. Server session/event history, release and context binding,
resource/time-derived facts and cached reconstruction require implementation
refinement. The separate generic cache model includes revision-CAS session events and
projecting-commit invalidation. It assumes version-bound pure-fold replay;
changes to external directory/time/context inputs require invalidation or an
independent final guard. Session creation, consent expiry, role changes, and all
administrative ADT operations are outside the original fine-grained host machine;
the [separate ADT machine](adt.md) covers their implemented command protocol.
The model has explicit provisional staging but does not model SQL statements'
private MVCC versions individually: rollback isolation and all-stream atomicity
are the stated Postgres assumption.

For the native administrative reducer, cancellation policy and separate machine,
see [Administrative ADT](adt.md).

### Veil evaluation

Inspected upstream revision `57447722e7f25f06c75cff8735d10d41697afc14`
on 2026-11-06. Its `lean-toolchain` is exactly `leanprover/lean4:v4.35.0`, so
there is no version incompatibility. Its Lake manifest adds twelve packages
(including lean-smt/lean-cvc5, Loom, VerifiedHAMT, Lasso, Lentil, batteries,
aesop and ProofWidgets); the default library also needs an npm widget build.
For this small protocol we chose the permitted dependency-free explicit-state
checker and ordinary kernel proofs. We did not install/build Veil or claim a
runtime comparison. Sources: [toolchain](https://github.com/verse-lab/veil/blob/57447722e7f25f06c75cff8735d10d41697afc14/lean-toolchain),
[Lake configuration](https://github.com/verse-lab/veil/blob/57447722e7f25f06c75cff8735d10d41697afc14/lakefile.lean),
[manifest](https://github.com/verse-lab/veil/blob/57447722e7f25f06c75cff8735d10d41697afc14/lake-manifest.json).

### Reproduction

Use this checkout, no concurrent Lake processes, and disk-backed scratch:

```sh
export TMPDIR="${TMPDIR:?Set disk-backed TMPDIR}" CI=true LEAN_NUM_THREADS=6
cd lean
lake build
lake env lean Ehr/Commit/Protocol/Proofs.lean
lake env lean Ehr/Commit/Protocol/Cache.lean
lake env lean --run Ehr/Commit/Protocol/Check.lean
lake env lean Ehr/Commit/Protocol/AdtProofs.lean
lake env lean Ehr/Commit/Protocol/LockOrder.lean
lake env lean --run Ehr/Commit/Protocol/AdtCheck.lean
```

Every new theorem has a `#print axioms` check. The checker exhausts each finite
configuration rather than silently stopping at a depth limit; exceeding its
state budget fails the command. It retains shortest paths for counterexamples.
The host bounds are up to three simultaneous attempts/IDs, two patients, one
shared bed or scheduled dose, fixed expected versions/revisions (including
successor versions for bed release/reuse), and arbitrary retries,
crashes and timeouts within that finite state graph. This is not exhaustive
checking of all request contents or of the implementation.

The cache graph additionally checks up to three journal events and two version
advances, including writes by another session and projecting invalidation.
Unsafe negative controls must fail: duplicate effect, wrong projection, missing
receipt, missing accepted event and native refusal bypass. Fingerprint mismatches that reach enforcement abort before staging, remove the
request reservation and permit corrected same-ID retries. The machine blocks
acceptance with invalid screen evidence. Earlier version/shared refusals retain
their durable outcome and priority; preview caches remain advisory.

### Trace refinement test

`COMMIT_PROTOCOL_TRACE=/absolute/scratch/trace.jsonl` enables `Store.submit`
instrumentation; it is off by default. It records actor-scoped request/payload
hashes, hashed stream/session IDs, lock/read versions, cache eligibility, native
acceptance, provisional stream writes and snapshot hashes, staged result hashes, COMMIT intervals,
rollback/uncertainty and produced responses. It records no credentials, chart
values or native clinical states. The original adapter covers non-ADT commands
through `Store.submit`; encounter opening
and session-event transactions are not exported. `AdtStore.submit` and clinical
placement also export administrative board inputs/outputs with positional patient
aliases, hashed unit identifiers and numeric bed IDs. They contain no chart data,
credentials or clinical native states. `model/check-adt-trace.ts` requires one
explicit provisioned baseline before all writers, validates the complete lock
plan and UPDATE/INSERT pairs, and replays board contents and changed-stream
versions through `AdtModel.advance` in `AdtTrace.lean`. It accepts unchanged locked
streams. ADT integration tests exercise rollback, uncertain COMMIT and mixed
clinical/administrative writes. This remains a transaction-linearized test;
overlapping SQL lock timing and FHIR contents are not proved by the trace.

Use a new file for **one fresh test tenant**, with every command writer traced.
For the original adapter, patient imports have baseline version 1 and empty
shared streams version 0;
the adapter rejects changed/missing baselines and unsupported/no-op write sets.
The adapter checks the complete lock sequence before reads, native acceptance
before writes, before/after version agreement, complete staged writes before
COMMIT, and stable response hashes. Lean searches for a serial ordering that
respects nonoverlapping invocation/completion intervals and every locked read,
then executes **the same `Model.advance`** for each witness step. COMMIT errors
branch between rollback and commit-with-lost-reply. Budget exhaustion, incomplete
traces and mismatches fail. This serialization uses the declared database
assumption; it does not verify actual overlapping SQL lock timing or prove the
TypeScript/SQL-to-model refinement. Projection contents remain covered by the
existing integration replay tests, not by hashes in this trace test.

```sh
export TMPDIR="${TMPDIR:?Set disk-backed TMPDIR}" CI=true LEAN_NUM_THREADS=6
# Isolated 256 MB database for protocol tests; no shared database reset.
COMMIT_PG_PORT=55436 docker compose -p vgi-commit-model -f services/commit/compose.yml up -d --wait
(cd lean && lake env lean --run ../services/commit/test/Fixture.lean) > "$TMPDIR/commit-model-fixture.json"
export DATABASE_URL=postgres://vgi:vgi-dev-only@127.0.0.1:55436/vgi_commit
export COMMIT_FIXTURE="$TMPDIR/commit-model-fixture.json"
pnpm --filter @vgi/commit typecheck
pnpm --filter @vgi/commit test
pnpm --filter @vgi/commit test:protocol
pnpm --filter @vgi/commit test:adt-protocol
# Optional: retain the test's scratch trace (path printed in test diagnostics).
COMMIT_PROTOCOL_TRACE_KEEP=1 pnpm --filter @vgi/commit test:protocol
pnpm --filter @vgi/commit check:trace /absolute/scratch/trace.jsonl
# Retained administrative/clinical ADT traces use their separate adapter.
pnpm --filter @vgi/commit check:adt-trace /absolute/scratch/adt-trace.jsonl
```

The targeted test uses two actual hosts and Postgres. It compares cached/fresh
native decisions; races identical requests, doses and beds; checks a stale
session; forces native/SQL rollback; discards a real COMMIT reply and recovers
exactly one durable event. It independently folds each patient's imported
snapshot and durable command records for the exercised workflows. Tampered guard/version/partial-write traces must
fail, including a coherent false expected version rejected by Lean itself.
Scratch fixtures/traces remain outside Git.
