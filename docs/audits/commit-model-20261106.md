# Lane verification, 2026-11-06

Base: `5d47ede3660e4fdb7aa0803e38678769cc9fc76a` (fetched main).
No clinical rule/Comparator input, app/hash input, recorded certificate or
tracked data was changed. No protocol counterexample was found in the bounded
instances; the service change is opt-in test instrumentation, not a behavior fix.

All commands ran in this worktree with disk-backed scratch. Commands below
are relative to the repository root unless a subshell changes directory.

```sh
export TMPDIR=/home/saithat/Projects/run-tmp CI=true LEAN_NUM_THREADS=6
(cd lean && lake build)
(cd lean && lake env lean Ehr/Commit/Protocol/Proofs.lean)
(cd lean && lake env lean Ehr/Commit/Protocol/Cache.lean)
(cd lean && lake env lean --run Ehr/Commit/Protocol/Check.lean)
```

Results: default build passed (468 jobs). The default `CommitProtocol` library
checks the new proofs separately from the clinical executable. All 26 printed
axiom checks use a subset of `propext`, `Classical.choice`, `Quot.sound`; no new
axioms or unchecked proof escapes. The exhaustive finite graphs were:

| Instance | States | Transitions | Maximum shortest-path depth |
|---|---:|---:|---:|
| Same patient / stale session | 488 | 2,698 | 26 |
| Duplicate request across replicas | 132 | 698 | 18 |
| Payload conflict | 187 | 990 | 18 |
| Bed / different patients | 518 | 2,868 | 28 |
| Same scheduled dose | 518 | 2,868 | 28 |
| Disjoint patients | 526 | 2,930 | 26 |
| Optimistic cache / fresh refusal | 477 | 2,645 | 26 |
| Session revision mismatch | 477 | 2,645 | 26 |
| Fresh successor version | 477 | 2,645 | 26 |
| Three requests / bed release and reuse | 17,486 | 145,753 | 42 |
| Total host graphs | 21,286 | 166,740 | |

The separate session-cache graph exhausted 81 states (three journal events,
two version advances). Five intentionally unsafe controls were rejected:
duplicate effect, wrong projection, missing receipt, missing accepted event,
and native refusal bypass. All actual graphs passed without a counterexample.
No state budget was reached.

```sh
COMMIT_PG_PORT=55436 docker compose -p vgi-commit-model -f services/commit/compose.yml up -d --wait
(cd lean && lake env lean --run ../services/commit/test/Fixture.lean) > "$TMPDIR/commit-model-fixture.json"
export DATABASE_URL=postgres://vgi:vgi-dev-only@127.0.0.1:55436/vgi_commit
export COMMIT_FIXTURE="$TMPDIR/commit-model-fixture.json"
pnpm --filter @vgi/commit typecheck
pnpm --filter @vgi/commit test
pnpm --filter @vgi/commit exec node --experimental-strip-types --test --test-concurrency=1 test/integration.test.ts test/protocol.integration.test.ts
pnpm --filter @vgi/commit exec node --experimental-strip-types --test --test-concurrency=1 test/workflows.integration.test.ts
COMMIT_PROTOCOL_TRACE_KEEP=1 pnpm --filter @vgi/commit test:protocol
```

Results: typecheck passed; unit tests 7/7; existing concurrency integration
suite 7/7 (including its 32-actor, two-host seeded dose/bed race); workflow
integration suite 15/15. The final protocol suite passed 8/8, with a Lean model
witness for 20 actual HTTP attempts. It covers returned refusal/retry, missing
and extraneous shared expected versions, cached/fresh native equivalence for
the exercised journal, stale sessions, duplicate IDs, changed payloads,
dose/bed races, native failure, SQL rollback after a snapshot update, a genuinely
committed transaction with its COMMIT reply discarded, and patient snapshot/log
fold agreement. Four trace mutations were rejected; the false expected-version
case reached Lean and failed with `NOT A MODEL TRACE`.

Local logs: `$TMPDIR/commit-model-{build,axioms,bounded,integration,workflows,protocol}.log`.
The final retained trace is outside Git at
`$TMPDIR/commit-model-trace-AvJim0/trace.jsonl`; it is test evidence only.
The test deletes only its random tenant; the dedicated Compose project is
removed after verification. No shared database was reset.

```sh
git diff --check
git diff origin/main -- lean/Ehr.lean lean/Ehr/Specs lean/Ehr/Props lean/Statements.lean lean/comparator.json app pnpm-lock.yaml
```

Both checks passed; the scoped diff was empty. The lane is rebased on fetched
main before handoff. Nothing was pushed.

The full audit pair, broad Playwright suites, Comparator runs, WASM rebuild and
retained-recording re-certification were intentionally deferred to the owner's
merged check. See [protocol methodology](../../README.md#commit-protocol-methodology).
Open owner-review points are the new specification statements, the explicit
Postgres/fresh-input assumptions, and whether the next refinement should cover
rich administrative ADT, dynamic directory/time facts or full FHIR projection
semantics first. These remain outside the claimed host proof.

## Integrated fingerprint protocol

The merged store retains native fingerprint reconstruction and the trace exporter.
`Request.screenValid` blocks an accepting machine guard transition on mismatched evidence;
the service throws at fingerprint enforcement before staging and rolls back the
reservation. Earlier version/shared refusals keep their durable conflict
outcome. A separate `screen-refused` trace row distinguishes enforcement from
a computed mismatch that an earlier refusal supersedes. The trace adapter requires valid screen
evidence before every write and rejects a mismatched-screen durable outcome.

Merged targeted checks: default `lake build` passed; bounded exploration added
107 states / 558 edges for fingerprint rollback and corrected intent (21,393
host states total, plus 81 cache states). Service typecheck and 7 unit tests
passed. The protocol suite passed 9 tests and Lean witnessed 22 HTTP attempts,
including screen mismatch, reservation rollback and a corrected same-ID attempt.
Both falsified and missing screen-check trace rows were rejected. The preexisting
fingerprint suite separately verifies successful corrected same-ID publication.

The integrated priority regression additionally exercises an already-consumed dose
with invalid screen evidence: the existing shared guard returns durable 409 before
fingerprint enforcement, without an append. The trace checker accepts that actual
priority while refusing any write with invalid or missing evidence. Nine protocol
tests passed, with a Lean model witness for 23 attempts.
