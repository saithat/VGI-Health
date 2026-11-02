# Concurrency: commit authority and shared workflows

Status: design and isolated native prototypes, in progress (2026-11-02).
The browser still writes directly to Medplum. This work does not close G3 in
deployment. It defines the boundary needed to close it and proves two small
shared-workflow invariants independently of the per-session UI interpreter.

## Commit authority

Keep the per-session Lean interpreter in WASM for interaction and immediate
feedback. Introduce a small authenticated HTTP service wrapping native `ehr
commit-check`. Only that service's Medplum service client may write clinical
resources, review Provenance, workflow control resources, and audit records.
Remove equivalent write privileges from browser users, generic proxies, Bots,
imports and other integrations; route those writers through this boundary too.
The service acts for the authenticated clinician, with authorization scoped to
that clinician and patient. Its own broad credentials confer no clinical role.

The deployed API is `POST /commits`:

| Request field | Meaning and authority |
|---|---|
| `requestId` | Stable idempotency key, scoped to user and patient; bind to payload hash. |
| `user`, `patient`, `encounter` | Claimed identities; authenticate user and derive role/permissions on the server; verify chart/encounter access and subject. |
| `release` | Certified spec/program identity; load the immutable artifacts on the server. Never trust a caller's replacement spec. |
| `state`, `event`, `commit` | State immediately **before** the staged human commit event, the event, and its expected commit ID. Recompute the staged result. |
| `factsVersions` | Exact resource URL/version vector displayed to the clinician, plus patient revision and workflow keys. Reject stale evidence; never substitute these for fresh reads. |

An HTTP response distinguishes `persisted` (request ID, committed state,
transaction/resource versions and audit reference), `rejected` (guard or
authorization reason), `conflict` (refresh required), and `pending` (outcome
unknown; look up the same request ID). A pure checker `accept` response is only
internal to the service and is never a transferable permission to write later.

The native prototype has a narrower JSON interface described below. Network
authentication, role lookup, session attestation, locks, persistence and mapping
are responsibilities of the future wrapper. In particular, a JSON `byHuman`
flag, receipt, acknowledgment, screen or clock is not evidence of a human
action. The wrapper must reconstruct state from an authenticated server session
event log, use a server clock, and validate persisted review provenance against
exact versions. Validate same-user session/release/patient binding before using
the reconstructed state. Unsupported state/evidence must fail closed.

## Serialization and the write linearization point

1. Authenticate, authorize and resolve immutable release; reserve the request
   ID durably. Acquire the patient's lock **before** reading its current bundle.
2. Read all guard inputs, including complete paginated searches and trusted
   context (time, episode, receipts, selected medication). Re-project with the
   existing Lean FHIR adapter. Compare the exact version vector with the one
   the clinician reviewed. Refresh and repeat human review when it changed.
3. Re-run the human event on the before-state with current facts. Require
   exactly the requested new commit and re-check `commitGuard` there. Map only
   this reconstructed staged state to FHIR; ignore client-supplied FHIR effects.
4. Validate the shared-workflow transition against current persisted controls.
   Build one atomic FHIR **transaction**, including all effects, idempotency
   outcome, audit provenance, patient revision, and shared control updates.
5. Put `Bundle.entry.request.ifMatch = W/"<versionId>"` on every existing
   resource update, including controls. A missing version is an error. Hold
   the lock through the transaction response and durable outcome recording.

The lock covers the whole patient, across sessions and roles. A single process
can use keyed queues; production replicas require a shared durable lock with
fencing or a queue partitioned by patient. A process-local mutex alone is
insufficient. Lease loss invalidates the attempt. Patient revision CAS in the
same transaction fences overlapping attempts and makes a crashed lock holder's
old transaction fail. Re-read/recheck after conflicts; never retry old output.

Patient locks do not protect a bed shared by different patients. Acquire all
patient and shared workflow keys (bed, scheduled-dose, task, later claim) in a
canonical total order, or use shared control resource CAS as the authority.
Bed occupancy and encounter location must change together in one transaction.

FHIR version conditions protect updated resources, not arbitrary read sets or
the absence of a new allergy. Every writer must increment a patient revision
control in the same transaction, including creates/deletes and imports. Read
the revision before and after assembling the bundle under the lock; require
equality. CAS it on persistence. Shared role/catalog inputs need equivalent
revision controls or immutability. Where writer mediation cannot be enforced,
use a server-side operation with transactional read validation; ordinary FHIR
search plus `If-Match` on just the output cannot support the claimed guarantee.
Do not simulate read assertions with transaction GETs or no-op PUTs of every
clinical input. A GET does not make that assertion, and no-op PUTs cause
unwanted versions and still miss phantoms.

The existing mapper already uses `ifMatch` on updates **when** versions are
available. That prevents some lost updates, but does not cover absent versions,
the guard read set or creates. Deterministic scheduled-dose keys must include
patient, order and scheduled occurrence (not medication name or administration
time alone). Create a uniquely keyed control ahead of time and CAS its unused
state to administered alongside the MedicationAdministration. Bed control
holds an optional patient; task control holds an optional owner. Provisioning
must enforce unique controls. Conditional create (`ifNoneExist` on a unique
identifier) can help with idempotency, but a matching existing resource is a
successful no-op: it must not authorize unrelated duplicate effects. A request
ID result must be bound to its full payload and committed atomically.

FHIR R4 specifies version-aware updates, 412 on a version mismatch, and atomic
transaction processing; conditional operations and their supported behavior
must be checked on the deployed Medplum version. These are integration
obligations, not Lean theorems. See [R4 HTTP](https://hl7.org/fhir/R4/http.html)
and [Bundle request conditions](https://hl7.org/fhir/R4/bundle-definitions.html#Bundle.entry.request.ifMatch).

## What T0 becomes

Existing T0: every new commit in a per-session interpreter step passed the
guard on that step's facts and before-state. Its statement stays unchanged.

Deployment target: **no commit is persisted unless the guard holds on the
record version it is written against**. Compose native acceptance soundness
with trusted authenticated state, complete current projection, mediation of
all writers, version/fencing checks, faithful mapping and atomic transaction
semantics. Acceptance alone does not prove persistence or record currency.
Clinical correctness, compiler correctness, Medplum behavior and FHIR mapping
remain trusted. The current adapter's 52-bit review version digest can collide;
exact vectors do not by themselves change receipt semantics. Production review
evidence must bind the exact vector in addition to the existing receipt checks.

| Failure | Required behavior |
|---|---|
| Guard fails or event adds no/different/multiple commits | Reject with a guard/event reason; no write. |
| Stale display, missing versions, incomplete/paginated read | Refuse acceptance; refresh rather than silently reuse acknowledgment. |
| Cross-patient state/encounter or forged identity/role | Reject before clinical checking. |
| Version conflict, competing dose/bed/task | Atomic rollback, refresh and recheck; no partial publication. |
| Timeout/crash after sending | Outcome unknown; reconcile by durable request ID before retrying. |
| Success followed by failed refresh | Report saved, retain outcome; request chart reload. |
| Lease loss or replica restart | Fence old attempt; reconstruct from durable state. |
| Unsupported Medplum conditional/transaction behavior | Disable writes for the workflow; do not drop preconditions. |

## Shared workflow model

One atomic action represents the successful service transaction linearization
point. Actor IDs are distinct from the UI's human/macro classification. Actors
can issue actions in any order; rejection is a stuttering step. No fairness,
bounded actor population or fixed schedule is assumed by the safety proof.

The initial executable prototype uses natural-number actor/patient/bed IDs and
scheduled dose keys `(patient, order, occurrence)`. State contains an append-only
administration log (dose key, actor) and active bed placements (bed, patient).
Actions administer a dose, assign an empty bed, or release a bed for its current
patient. The executable `step` checks the **shared current state** atomically.
Reachability is the inductive closure of this same executable function, so its
theorems range over all finite interleavings, including rejected actions.

Invariants: administration log dose keys have no duplicates (each scheduled
dose is administered at most once); active bed placements have no duplicate
bed keys (a bed holds at most one patient). Release permits later reuse; it
cannot remove a different patient's placement. These do not express physical
administration, one bed per patient, dose correctness, authorization or liveness.
A separate deliberately broken read/prepare/write schedule demonstrates two
actors seeing an unused dose and both appending without a final shared check;
its resulting state provably violates the dose invariant. A bed collision is
also rejected by the invariant's concrete examples.

Next extensions (designed, not implemented/proved):

| Workflow | State/actions | Safety invariant |
|---|---|---|
| Co-sign/routing | Order records orderer, route, status and role directory revision; request/route/co-sign/cancel | Every final co-sign has a signer distinct from the orderer with the required role at acceptance, on the same order version. Typing a colleague's ID is not their consent. |
| Task claiming | Task status, optional owner, revision; claim/release/complete/transfer | A claimed task has exactly one owner; only that owner can complete it; transfers are atomic. |
| Billing claims (later) | Encounter/account, charge versions, claim lines, submission key/status; assemble/submit/void/replace | A charge version is included in at most one active submitted claim; replacements reference and retire the prior claim atomically. |

Per-session UI checks and shared checks are conjunctive: each session may stage
a valid administration or bed choice, but only the shared action can reserve
the dose/bed. The multi-actor prototype does not yet refine FHIR transactions or
call the commit checker. That correspondence needs a mapping/refinement proof
or differential integration checks before claiming these invariants for Medplum.

## Plain Lean versus Veil

Inspected [Veil revision `0a9f0730a81db1397c91b77541aa61db8f8b7d15`](https://github.com/verse-lab/veil/tree/0a9f0730a81db1397c91b77541aa61db8f8b7d15)
on 2026-11-02. Its [toolchain](https://github.com/verse-lab/veil/blob/0a9f0730a81db1397c91b77541aa61db8f8b7d15/lean-toolchain)
pins **Lean 4.32.0**, versus this project's **4.35.0**. It cannot be imported
into this Lake project as pinned. Its [README](https://github.com/verse-lab/veil/blob/0a9f0730a81db1397c91b77541aa61db8f8b7d15/README.md)
describes a 2.0 pre-release with concrete/symbolic model checking and automated
and interactive safety proofs; its [Lake configuration](https://github.com/verse-lab/veil/blob/0a9f0730a81db1397c91b77541aa61db8f8b7d15/lakefile.lean)
adds SMT, Loom, HAMT, Batteries, Aesop and widget dependencies and disables SMT
trust for its test library. A future evaluation must retain checked proof
reconstruction (`veil.smt.trust false`) and audit theorem axioms.

Recommend **plain Lean inductive reachability over an executable step** now:
the two uniqueness invariants have short inductive proofs, use the certified
toolchain, share ordinary Lean data, and need no solver/dependency changes.
Veil offers stronger invariant-discovery and counterexample tooling as routing
and claims grow. Evaluate it in a separate pinned Lake project then; exchange
test traces through JSON and maintain an explicit correspondence. Proofs in a
different model/toolchain do not automatically transfer to this implementation.

## Delivery and migration

1. Land this design; document the unchanged production boundary in README.
2. Add `Ehr.Multi` executable model, universal preservation/reachability proofs,
   concrete successful schedules and known-bad schedule examples to default build.
3. Add `ehr commit-check`: JSON stdin, one JSON accept/reject stdout. It takes
   trusted `spec`, `program`, `user`, `patient`, before-`state`, `event`, `commit`,
   exact `factsVersions`, `currentBundle`, and trusted FHIR `context`. It projects
   the bundle with `parseBundle` (no directory/world merging), rejects ambiguous
   patients, invalid/duplicate/missing versions, stale vectors and chart binding
   mismatches, checks guard and event, and returns recomputed state and URL/ETag
   pairs for the current read set. A malformed JSON input exits 1; a clinical
   rejection is a normal JSON response with exit 0. No HTTP or Medplum write.
4. Build wrapper, authenticated session log, revision controls, idempotency,
   shared-key serialization and server-owned mapper. Run shadow checks first;
   shadow agreement is not protection while the browser retains write access.
5. Verify conflicts against deployed Medplum: stale guard inputs, newly created
   allergy, concurrent identical doses, two patients taking one bed, lease loss,
   duplicate request, timeout/recovery and save/refetch failure. Revoke direct
   writers and switch liveSession to the service atomically at cutover.

The CLI read-set preconditions are a plan for a future wrapper, not transaction
entries: it must CAS the revision controls and attach ETags to actual updates.
It cannot protect phantoms or prove that a caller supplied a current complete
bundle. Do not enable service writes until those deployment obligations hold.
