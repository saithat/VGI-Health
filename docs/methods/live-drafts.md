# Unsigned drafts across live charts

Leaving a hydrated chart retains its unsigned captures and alert acknowledgments
in `State.patientDrafts`. Reopening restores only that patient's confirmed human
entries that the signed-in role may enter. Reviews are reloaded from current
facts, and commits and popups are never restored.

A capture belongs to signed work when its element is named by any entry
requirement whose commit is in the chart's `commits`. `Workspace.signedEntry`
and `unsigned` remove all captures for those elements when saving, across all
order slots and including conditional requirements. Shared elements are excluded
even when another unsigned commit also requires them; the clinician must enter
those again. Unrelated entries remain. This conservative rule needs no stale
facts or attempt to reconstruct which capture satisfied a conditional
requirement. Fresh record prefills can still appear and are separate from
restored entries.

`Ehr.Runtime.signed_leave_reopen` proves no restored saved capture has an element
required by a signed commit. `signed_not_restored` exercises an actual
sign/leave/reopen sequence. All existing runtime theorem names remain proved;
`save_self`, `draft_call`, `session_leave`, `session_captures` and the runtime
`SessionEnteredOnce` definition now express unsigned retention and signed-entry
removal. Original episode properties, protected specifications and Comparator
catalogs are unchanged.

The live host keeps Lean's navigation state. Isolation relies on
`Ehr.Runtime.bind_hydrates` and `Hydrated.eq`: a fresh chart is initialized and
only the selected patient's draft is added. `hydrating_refuses` prevents a
commit or acknowledgment on the loading call.

## ADT stamps and reconciliation

Each checkpoint also records, per stored draft, the patient's ADT stamp from
the chart it was saved from (`draft_adt`, migration
`009-deficiencies-reconciliation.sql`). When a chart is opened from a
checkpoint, native Lean reconciles that patient's draft for the ADT movement
since then before the session starts: after a transfer, order lines are tagged
and must be kept, changed or discontinued before signing; after a discharge,
they are not restored and are kept in `commit_discarded_drafts`. The immutable
checkpoint is unchanged. See [chart timing](../design/chart-timing.md) for the
rules and proofs; the same draft data feeds the deficiency work list.

## Commit replay

The service previously reconstructed one patient's journal from `init` and
refused visits to a different patient. Keeping a multi-patient journal without
binding each visit's facts would replay earlier work against the wrong record.
Instead:

1. Before saving a changed draft, the host flushes unsent interactions to a
   fresh command session. `POST /draft-checkpoints` references that session,
   exact revision and leave event. The service checks the actor/login, release
   and current source version under lock, bypasses preview caches to replay the
   journal, then applies the leave event. A still-selected state, including a
   refused departure under a popup, is rejected.
2. Migration `007-draft-checkpoints.sql` stores the resulting directory state
   in an immutable checkpoint. Duplicate requests return the same ID, including
   recovery after the source later expires or changes. Checkpoints bind tenant,
   actor, verified OIDC `sid` and release hash; static-token deployments bind
   the credential hash. Token refresh preserves `sid`; another login cannot
   use the checkpoint. Rows are retained as provenance; accessibility follows
   the authenticated login, not a five-minute timer. There is no new purge job.
3. The next chart supplies the checkpoint ID. Opening B reads only B's locked
   version and the immutable checkpoint. It never rereads A's later version or
   command-session expiry. Native workspace navigation supplies the directory
   activity; browser-provided clinical states remain forbidden.
4. The session stores that same directory state in `workspaceState`. Native
   reconstruction replays its new journal; every ready screen must still match
   painted evidence, followed by the unchanged fresh guard and version checks.
5. Before synchronizing an existing chart, `POST /sessions/:id/renew` creates a
   fresh session from its server-owned journal after actor/login, release,
   exact revision and locked current-patient version checks. It copies
   `screen_start` as well as the journal, so renewal cannot reset or omit the
   required painted interval. Original expired sessions still reject commands
   and interactions. Renewal adds no clinical effect and accepts no browser
   state. This also handles a chart left open for more than five minutes.

Departure makes no service request when the resulting native draft store is
identical to the stored checkpoint's, including an empty visit between charts
with existing drafts. Changing directory activity needs no new checkpoint:
native navigation initializes that activity before the next journal starts.
A checkpoint is still required when native state actually changes, including
removal of a now-signed stored draft. Lean currently saves raw prefills as well
as human captures; a prefill-only departure that adds such a raw draft also
needs a checkpoint to reproduce that exact state. Hydration continues to drop
nonrestorable prefills. This host fix does not change Lean's draft definition.

Failed synchronization leaves the visible chart and draft intact. Current
patient version/release conflicts still fail closed. A later write to A cannot
block B through the checkpoint; reopening A loads A's new facts and `restore`
filters its own draft again. Draft references live in the signed-in browser
session and are not recovered across reload or sign-out.

## Validation

Tests use unique tenants in the existing local Postgres stack and remove only
their own rows. The browser harness substitutes authentication and synchronous
interpreter transport. It uses the production live host and painter, current
native Lean, real HTTP, Postgres, replay, screen comparison and projection. It
does not test a rebuilt WASM artifact or Keycloak login.

```sh
export TMPDIR=/home/saithat/Projects/run-tmp
export EHR_BIN="$PWD/lean/.lake/build/bin/ehr"
export DATABASE_URL=postgres://vgi:vgi-dev-only@127.0.0.1:55532/vgi_commit
export COMMIT_FIXTURE="$TMPDIR/commit-service-fixture.json"
export pnpm_config_verify_deps_before_run=false
(cd lean && LEAN_NUM_THREADS=4 systemd-run --user --scope -q -p MemoryMax=12G -p MemorySwapMax=0 lake build)
LEAN_NUM_THREADS=4 systemd-run --user --scope -q -p MemoryMax=12G -p MemorySwapMax=0 bash scripts/audit-verification.sh
(cd app && node_modules/.bin/tsc --noEmit)
(cd services/commit && node_modules/.bin/tsc --noEmit)
(cd app && node_modules/.bin/vite build)
(cd app && node_modules/.bin/vitest run tests/live-drafts.test.ts tests/live-projection.test.ts tests/mar-session.test.ts tests/screen-fingerprint.test.tsx tests/patientDirectory.test.ts)
(cd services/commit && node --experimental-strip-types --test --test-concurrency=1 test/unit.test.ts test/drafts.integration.test.ts test/workflows.integration.test.ts test/screen-fingerprint.integration.test.ts)
(cd app && APP_TEST_PREVIEW=0 APP_TEST_PORT=4189 node_modules/.bin/playwright test --grep 'live drafts A/B/A' --workers=1)
EHR_CONFORMANCE_TRANSPORT=serve node conformance/index.mjs --canonical --jobs 4 --out "$TMPDIR/live-drafts-review-conformance.json"
node --test conformance/workspace.test.mjs
```

The unchanged Lean build passes all 611 jobs. The targeted Vitest suite passes
14 tests. Service unit, draft, workflow and fingerprint suites pass 33 tests.
New integration regressions use an injected clock to advance six minutes and a
scoped source-stream version change. Both failed before the fix with
`session_expired` and `version_conflict` when opening B. They now pass through
B's accepted sign. Additional tests keep expired command refusal, reject stale
current-patient renewal, preserve the painted interval after signing, recover
duplicate checkpoints, and reject another login or changed release.

The app regression verifies a zero-request empty departure, then advances the
service clock by six minutes and changes A before signing B and reopening A.
The browser regression exercises the same delayed B sign through the production
host and painter; desktop and narrow both pass (2 tests). Canonical conformance
is unchanged at 1,584 passed, zero failed (15 targets, 201 scenarios). The
workspace-driver tests pass 4 tests. Typechecks, targeted ESLint and the
production app build pass. Canonical expectations and selection wording are unchanged.

The existing service regression and lint commands were:

```sh
(cd services/commit && COMMIT_FIXTURE="$TMPDIR/commit-service-fixture.json" node --experimental-strip-types --test --test-concurrency=1 test/workflows.integration.test.ts test/screen-fingerprint.integration.test.ts)
(cd app && node_modules/.bin/eslint src/core/liveSession.ts src/data/commitService.ts tests/live-drafts.test.ts tests/live-drafts-support.ts e2e/live-drafts.spec.ts e2e/live-drafts.harness.tsx --max-warnings 0)
(cd services/commit && node_modules/.bin/eslint src/store.ts src/types.ts src/auth.ts src/http.ts test/helpers.ts test/drafts-fixture.ts test/drafts.integration.test.ts test/drafts-host.ts test/native-interp.ts --max-warnings 0)
```

Both full audit commands were attempted once, sequentially; each stopped before
browser work because the gitignored `fixtures/synthea/index.json` is absent:

```sh
node scripts/audit-alert-policy.mjs "$TMPDIR/live-drafts-review-audit-templates"
node scripts/audit-alert-policy.mjs "$TMPDIR/live-drafts-review-audit-personas" --personas
```

No Lean definitions, generated types, conformance expectations or protected
specifications change in this fix. No dependency installation, WASM rebuild,
proof-map regeneration or recording recertification is part of this change. The core host and service-client source
changes intentionally change the certified app hash. Existing recordings need
recertification against the rebuilt app and WASM.
