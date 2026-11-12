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

## Commit replay

The service previously reconstructed one patient's journal from `init` and
refused visits to a different patient. Keeping a multi-patient journal without
binding each visit's facts would replay earlier work against the wrong record.
Instead:

1. Before leaving, the host flushes unsent interactions to the outgoing service
   session, then keeps the native navigation result locally. A continuation
   contains that session ID, exact revision and leave event.
2. The next chart open authorizes destination and source, locks the source
   session, checks release/revision/expiry, then locks both patient streams in
   sorted order. The source version must still match.
3. Fresh native replay bypasses the preview cache and reconstructs the source
   journal. Applying the leave event must yield an unselected state; a refused
   departure under a popup is rejected. No client-supplied state is accepted.
4. This server-derived directory state becomes immutable `workspaceState` in
   the destination session's context. The next journal starts there and records
   new directory interactions and selection/hydration. Other patients' drafts
   stay in the store and cannot satisfy this chart's guard.
5. Commit reconstruction starts from that same context and replays the journal.
   Every ready screen in the new interval must match painted evidence. The
   fresh guard, version checks and interaction-endpoint prohibition on commits
   and new reviews remain unchanged.

A failed outgoing synchronization retains the visible chart and draft. Existing
five-minute service-session expiry and version/release conflicts fail closed;
continuation does not bypass them. Drafts last for the signed-in browser
session, not across reload or sign-out. A stale source requires reopening rather
than accepting unchecked carried evidence.

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
export pnpm_config_verify_deps_before_run=false
(cd lean && LEAN_NUM_THREADS=4 systemd-run --user --scope -q -p MemoryMax=12G -p MemorySwapMax=0 lake build)
LEAN_NUM_THREADS=4 systemd-run --user --scope -q -p MemoryMax=12G -p MemorySwapMax=0 bash scripts/audit-verification.sh
(cd app && node_modules/.bin/tsc --noEmit)
(cd services/commit && node_modules/.bin/tsc --noEmit)
(cd app && node_modules/.bin/vite build)
(cd app && node_modules/.bin/vitest run tests/live-drafts.test.ts tests/live-projection.test.ts tests/mar-session.test.ts tests/screen-fingerprint.test.tsx tests/patientDirectory.test.ts)
(cd services/commit && node --experimental-strip-types --test --test-concurrency=1 test/unit.test.ts test/drafts.integration.test.ts)
(cd app && APP_TEST_PREVIEW=0 APP_TEST_PORT=4189 node_modules/.bin/playwright test --grep 'live drafts A/B/A' --workers=1)
EHR_CONFORMANCE_TRANSPORT=serve node conformance/index.mjs --canonical --jobs 4 --out "$TMPDIR/live-drafts-conformance.json"
node --test conformance/workspace.test.mjs
```

The default Lean build passes all 611 jobs, including the new executable guards.
New and edited theorem axiom printouts use only `propext`, `Classical.choice` and
`Quot.sound`. Targeted app tests pass 14 tests; service unit/draft tests pass 11;
workspace conformance-driver tests pass 4. Canonical conformance remains at
1,584 passed, zero failed (15 targets, 201 scenarios); no expectations or
selection wording changed. The existing workflow and screen-fingerprint
integration suites pass 18 tests. The targeted Playwright regression passes on
both desktop and narrow screens (2 tests). App/service typechecks, the production
app build and targeted ESLint checks pass. The draft tests cover distinct A/B
drafts, restored acknowledgments, signing with complete screen evidence,
signed-entry exclusion, and refusals for missing screens, another actor's
session, stale revision, client-injected state and navigation under a popup.

The existing service regression and lint commands were:

```sh
(cd services/commit && COMMIT_FIXTURE="$TMPDIR/commit-service-fixture.json" node --experimental-strip-types --test --test-concurrency=1 test/workflows.integration.test.ts test/screen-fingerprint.integration.test.ts)
(cd app && node_modules/.bin/eslint src/core/liveSession.ts src/data/commitService.ts tests/live-drafts.test.ts tests/live-drafts-support.ts e2e/live-drafts.spec.ts e2e/live-drafts.harness.tsx --max-warnings 0)
(cd services/commit && node_modules/.bin/eslint src/store.ts src/types.ts test/drafts-fixture.ts test/drafts.integration.test.ts test/drafts-host.ts test/native-interp.ts --max-warnings 0)
```

Both full audit commands were attempted once, sequentially; each stopped before
browser work because the gitignored `fixtures/synthea/index.json` is absent:

```sh
node scripts/audit-alert-policy.mjs "$TMPDIR/live-drafts-audit-templates"
node scripts/audit-alert-policy.mjs "$TMPDIR/live-drafts-audit-personas" --personas
```

No dependency installation, WASM rebuild, proof-map regeneration or recording
recertification is part of this change. The core host and service-client source
changes intentionally change the certified app hash. Existing recordings need
recertification against the rebuilt app and WASM.
