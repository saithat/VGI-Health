# Merged-code verification — 2026-11-07

Reviewed code: `c27db794bceb2893ed4aa2a314613b0ae0d6ba43`. All work stayed on `main`; nothing was pushed. The README review marker names this final code commit.

Code commits:

- `a6e93550` — squash ADT transaction model, proofs and trace refinement; adapt JSON boundaries to strict service ESLint by validation/narrowing.
- `5c0b9932` — squash universal renderer coverage and multilingual research-layout certificates.
- `cbc1bc79` — rebuild WASM source binding and document the app binding.
- `b09f6788` — reserve space for late urgent alerts and preserve patient identity under a wrapped/scrolled strip; add the browser regression and consolidate README.
- `c27db794` — preserve the dark fullscreen metrics background and reserved transport space; dashboard-only CSS, certified hash unchanged.

All commits retain the Codex co-author trailer. Protected clinical statements and comparator declarations are unchanged. No proof holes, new axioms, casts or lint disables were introduced to bypass the service boundary checks.

## Build and proof evidence

Certified app SHA-256: `b78fef8c17c68d215ad91bf67a49ca2150f651d844cc8eb426449b24f05629e7`.
Native SHA-256: `f0f036ae502fc299590bc5485e9c3bc856c33c69baa81037fc75c192c139b75b`.
WASM SHA-256: `eadbb1ff65a394fe341ec384625a455a60fd93487fda1d12946aa18313236a2d`.
Lean source manifest: `fff84869bda9b3587550f98e0ce8919b9a1bd1e7f56e24e927aab4b175e2fb58`.

The CI lockfile change had already changed the app hash. The urgent-strip root fix changes clinical renderer sources and therefore changes it again. Every retained certificate was reinstalled and every shift remeasured against the final binding. Only `propext`, `Classical.choice` and `Quot.sound` occur in audited axiom dependencies. The UI audit includes 1,143 theorem/generated-helper declarations: 592 are axiom-free and 551 depend only on the permitted axioms. This is distinct from the lane’s 186 named headlines.

## Checks after the ADT squash

| Command | Result |
|---|---|
| `cd lean && lake build` | 517 jobs passed |
| `pnpm --filter app --filter agent --filter world --filter @vgi/commit lint` | All four packages passed |
| `pnpm --filter app --filter agent --filter world --filter @vgi/commit typecheck` | All four packages passed |
| `pnpm --filter @vgi/commit test` | 8 tests passed |
| `pnpm --filter @vgi/commit test:integration` | 53 tests passed |

These first five commands have content-hashed raw logs in the JSON receipt; their wall times were not captured. The repeated full verification below records elapsed times.

## Commands and results

Commands below are the actual local invocations; elapsed time includes child commands. `TMPDIR` was disk-backed, `CI=true`, `LEAN_NUM_THREADS=6`, screen workers 4 and desktop workers 1. Browser-heavy work held the shared `flock`; the two complete audits ran sequentially. PostgreSQL ports were isolated from unrelated services. Pinned dependencies and sandbox runtime were already installed; GitHub upload/download/cache actions and VM provisioning were represented by local artifacts rather than remote actions or shared-host OS changes.

### ui-lean

```sh
cd lean && lake build && lake build ui-layout ui-port-audit
```

Exit 0; 187.812 s. 517-job default build; 217 UI targets.
Log SHA-256: `cc809912e83514d6fb382caf4a4adf83d164f0c87ccf3ff311a7e3565b94c3bc`.

### ui-lint-types

```sh
pnpm --filter app --filter agent --filter world --filter @vgi/commit lint && pnpm --filter app --filter agent --filter world --filter @vgi/commit typecheck
```

Exit 0; 9.430 s. All four packages passed lint and typecheck.
Log SHA-256: `14e57cca24965be909f992264f6aea3a1bed01d8c68599697a614a21123702a8`.

### ui-targets

```sh
set -e; cd lean; lake env lean "$TMPDIR/merge-two-20261107/ui-axioms.lean"; cd ..; node --test scripts/ui-library/native.test.mjs scripts/ui-library/family.test.mjs scripts/ui-library/structural.test.mjs scripts/ui-library/program.test.mjs scripts/ui-library/fonts.test.mjs; node scripts/ui-library/port-audit.mjs --all-screens; flock "$TMPDIR/vgi-browser-heavy.lock" pnpm --filter app exec playwright test --config src/browser/ui-library/playwright.config.ts; pnpm --filter @vgi/commit test:integration
```

Exit 0; 174.770 s. 1,143 UI theorem/helper declarations (592 axiom-free, 551 with permitted axioms); 21 native/font tests; 7 browser tests; 7,944 class probes and 3,468 geometry/G9 checks; 53 service integration tests. Painter deviation 0 px across 228 boxes, 153 lines and 6,861 glyph advances.
Log SHA-256: `7cc3afbb84b9b08306c374cfdf82c80231a5cc6761227dc119a271f4e88c6b70`.

### adt-axioms

```sh
cd lean && for module in Proofs Cache AdtProofs LockOrder; do lake env lean "Ehr/Commit/Protocol/$module.lean" || exit; done
```

Exit 0; 2.400 s. 46 axiom outputs across protocol, cache, ADT and lock-order modules: one axiom-free and 45 with only permitted axioms.
Log SHA-256: `5d42e8dd13cab84a07d152c4e5b205e3287a109c448e5bb2fd29bd2216e9684a`.

### rebuilt-assets

```sh
set -e; cd lean; lake build; cd ..; JOBS=6 EM_CACHE="$TMPDIR/fingerprint-em-cache" make wasm; node scripts/wasm-assets.mjs; pnpm --filter app build; cat app/dist/build.json
```

Exit 0; 15.272 s. Lean, actual WASM rebuild, source manifest and app build passed. WASM bytes unchanged; source manifest refreshed.
Log SHA-256: `dfc3778bceba2c51681fbf03496a30264f97e6fd069ce3aa410d11bf3c29c48a`.

### proofs-final

```sh
set -e; bash scripts/audit-verification.sh; make verify; cd lean; lake env lean --run Ehr/Tools/ExportContent.lean "$TMPDIR/ci-content"; lake env lean --run ../services/commit/test/Fixture.lean > "$TMPDIR/commit-fixture.json"; tar -czf "$TMPDIR/ehr-test-inputs.tar.gz" -C "$PWD/.lake/build/bin" ehr -C "$TMPDIR" ci-content/programs commit-fixture.json; lake env lean --run Ehr/Commit/Protocol/Check.lean; lake env lean --run Ehr/Commit/Protocol/AdtCheck.lean; lake build completion-bench; lake env lean --run Ehr/Render/ExportTests.lean "$TMPDIR/merge-two-20261107/wasm-api"; cd ..; lean/.lake/build/bin/completion-bench "$PWD" "$TMPDIR/merge-two-20261107/completion-bench"
```

Exit 0; 145.846 s. 84 headline theorems/86 surfaces; three Comparator challenges; 21,393 protocol + 81 cache bounded states; 26,812 ADT transaction states + 62 reducer boards; all five protocol and six ADT unsafe controls detected; 18 completion benchmark scenarios.
Log SHA-256: `7bb0d6afd347a3ba32a49f6efa550a4abc62941511f7f8b675fa103b041005f2`.

### ci-lean-build

```sh
set -e; cd lean; lake build 2>&1 | tee "$TMPDIR/lean-build.log"; if grep -E "warning:.*(sorry|declaration uses)" "$TMPDIR/lean-build.log"; then exit 1; fi
```

Exit 0; 0.158 s. 517 jobs; proof-placeholder warning scan clean.
Log SHA-256: `8c0db32e47e792dd8e27832b132c6b217b24849687c9a7fea54fb236e3afc3e1`.

### ci-fast-final

```sh
set -e; pnpm --filter agent test --maxWorkers=2; pnpm --filter app test --maxWorkers=2; pnpm --filter world exec vitest run --maxWorkers=2; node --test world/realism/*.test.mjs; pnpm --filter @vgi/commit test; python3 scripts/test-information-needs-compare.py
```

Exit 0; 250.096 s. Agent 204; app 342; world 99; realism 5; commit 8; Python 2 tests passed.
Log SHA-256: `9d7859db2b0098e7d51dff3e0473f9e336330b872f68910a334e39e4b9325402`.

### ci-script-units

```sh
set -e; node conformance/cures-probe.mjs; mapfile -t tests < <(find scripts conformance -name "*.test.mjs" ! -name "completion-check.test.mjs" ! -name "screen-cache-browser.test.mjs" ! -path "scripts/ui-library/*" | sort); node --import ./agent/node_modules/tsx/dist/loader.mjs --test --test-concurrency=2 "${tests[@]}"
```

Exit 0; 146.358 s. 70 script/conformance tests passed.
Log SHA-256: `86cbaad71ae21d06eda265f61393e0e09c5ba8bb61ab602d8a3673c3c77e0cbe`.

### ci-conformance

```sh
set -e; cp -R "$TMPDIR/ci-content/programs/." programs/; EHR_CONFORMANCE_TRANSPORT=serve node conformance/index.mjs --canonical --jobs 2 --out "$TMPDIR/conformance.json"; node --test scripts/completion-check.test.mjs; python3 lean/Ehr/Check/certify.py; python3 -c 'import json,os; from pathlib import Path; c=json.loads((Path(os.environ["TMPDIR"])/"conformance.json").read_text())["summary"]; assert (c["targets"],c["scenarios"],c["failed"])==(15,201,0),c; r=json.loads(Path("lean/Ehr/Check/certification-report.json").read_text()); assert (r["personaAccepted"],r["personaCount"],r["badRejected"],r["badCount"])==(15,15,23,23),r; print(c); print("certification matrix: 15 accepted; 23 rejected")'
```

Exit 0; 254.083 s. 15 targets × 201 scenarios: 1,584 pass, 0 fail, 1,431 inapplicable; matrix 15/15 accepted and 23/23 invalid programs rejected; 7 completion CLI tests passed.
Log SHA-256: `3fd98a1c60c51b62c8e3c77b3663af6b8b56c73816f0bfec40db2a7d3627696f`.

### fresh-integration

```sh
DATABASE_URL=postgres://vgi:vgi-dev-only@127.0.0.1:55532/vgi_commit pnpm --filter @vgi/commit test:integration
```

Exit 0; 40.537 s. 53 tests passed on the first fresh authority stack, including native/WASM/host screen fingerprints.
Log SHA-256: `40d0d8f1002c00e44cf70fa7c2aac0d6ff2a76dac20b87db3dfee3213f521f9e`.

### targeted-trace-commands

```sh
set -e; pnpm --filter @vgi/commit test:protocol; pnpm --filter @vgi/commit test:adt-protocol; pnpm --filter @vgi/commit check:trace "$TMPDIR/commit-model-trace-q5ypsF/trace.jsonl"; pnpm --filter @vgi/commit check:adt-trace "$TMPDIR/adt-model-trace-5Laqo3/trace.jsonl"; pnpm --filter @vgi/commit check:adt-trace "$TMPDIR/clinical-adt-trace-3pbsLI/trace.jsonl"
```

Exit 0; 23.351 s. Protocol 9 tests and ADT protocol 11 tests passed; 23 protocol, 181 administrative ADT and five mixed attempts refined against Lean.
Log SHA-256: `5402efe4915747d8073dae44be41503427ca9be0bd95ef275a88914efaf29085`.

### native-wasm

```sh
python3 "$TMPDIR/merge-two-20261107/wasm-shards.py"
```

Exit 0; 677.406 s. 324 patient bundles and 897 UI/render variants agreed, including screen fingerprints, density, clinical samples and wristbands.
Log SHA-256: `0e5cf0dd6857a56e0138c0c8d05619285a1edf4985851ae52ea56d3b1d6cfb71`.

### recertification

```sh
flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off node scripts/migrate-neutral-terms.mjs --recertify-only --runs core-10day
```

Exit 0; 11813.414 s. 33/33 certificate bindings installed; 50 shifts remeasured; fresh native/WASM replay: 1,284 tasks, 72,636 events, zero strict mismatches. Frozen inputs, model choices and clinical task/event content preserved.
Log SHA-256: `d70e102adfda23564acc9bf24067e78075ef7f97c6bbedbec6cd5d25f2449183`.

### screen-cache

```sh
flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off node --test scripts/screen-cache-browser.test.mjs
```

Exit 0; 37.514 s. Serial/parallel and cold/warm/uncached evidence agreed; intentional invalid screens stayed rejected.
Log SHA-256: `1c2345bd10dded67aff140378682b108bf2fcd0628d6342e17b7834cce34ab5b`.

### live-load

```sh
set -e; unset DATABASE_URL; export COMPOSE_PROJECT_NAME=vgi-final-20261107; make load SYNTHETIC_HOSPITAL=1; docker compose --env-file .env -f infra/docker-compose.yml --profile app up -d commit; node infra/scripts/wait-healthy.mjs
```

Exit 0; 28.759 s. Fresh isolated stack loaded and healthy; releases P1 v5, P2 v7, P3 v4, P4 v8, P5 v4.
Log SHA-256: `d4440856836da4eb571cdd6589e22f9f290db5633cd942eaea3d1c78eb49ae33`.

### desktop

```sh
PLAYWRIGHT_JSON_OUTPUT_NAME="/home/saithat/Projects/run-tmp/merge-two-20261107/desktop-playwright.json" APP_TEST_PREVIEW=1 AUDIT_RUN=core-10day flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off pnpm --filter app exec playwright test --project=desktop --workers=1 --reporter=list,json
```

Exit 0; 622.893 s. Full desktop suite passed; all 44 required live/dashboard tests executed. Optional suites are enumerated in the JSON report.
Log SHA-256: `5065ad5d71d217a295fd1ec4db58903a605ed136e6e43cb9ead142edb7e8409c`.

### mar-adt

```sh
PLAYWRIGHT_JSON_OUTPUT_NAME="/home/saithat/Projects/run-tmp/merge-two-20261107/mar-adt-playwright.json" DATABASE_URL=postgres://vgi:vgi-dev-only@127.0.0.1:55532/vgi_commit COMMIT_INTERNAL_URL=http://127.0.0.1:8091 MAR_E2E=1 ADT_E2E=1 APP_TEST_PREVIEW=1 flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off pnpm --filter app exec playwright test mar-service.spec.ts adt-service.spec.ts --project=desktop --workers=1 --reporter=list,json
```

Exit 0; 10.808 s. Three explicit MAR/ADT tests passed, zero skips.
Log SHA-256: `90144c2fd7797245fb9a95773284555a51c8ce4f3e15931c61c2e93d3e422560`.

### dashboard-shots

```sh
flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off node "$TMPDIR/merge-two-20261107/refresh-dashboard.mjs"
```

Exit 0; 9.309 s. Five review PNGs refreshed/validated at 1440×900 against core-10day; 18 live-selection PNG/model pairs refreshed by the desktop suite.
Log SHA-256: `509c7eb0c5c99aabd08f09741c0838c90a0567f34e9c16fb5cb1009749f33b9c`.

### audit-templates

```sh
flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off node scripts/audit-alert-policy.mjs "$TMPDIR/merge-two-20261107/audit-templates"
```

Exit 0; 1506.796 s. Full template audit passed: 1,826 distinct trees, all controls passed, zero physical findings.
Log SHA-256: `f839e0f87e926ea13f5c3068092d3e778815f9fdb7eb9124237b7116614e435d`.

### audit-personas

```sh
flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off node scripts/audit-alert-policy.mjs "$TMPDIR/merge-two-20261107/audit-personas" --personas
```

Exit 0; 699.210 s. Full persona audit passed after templates: 1,296 distinct trees, all controls passed, zero physical findings.
Log SHA-256: `c450a5b4c1845939c22119544a3ef9b2e746f9b9d1b751dfa081e91ef92231d9`.

### final-integrity

```sh
bash "/home/saithat/Projects/run-tmp/merge-two-20261107/final-integrity.sh"
```

Exit 0; 666.124 s. Bindings, content digests, clinical-input snapshots, protected statements, README links/review marker and whitespace passed.
Log SHA-256: `62a6e7f8673d21c367a631692a510daee44e66e76b5cf6889662b801ecb081e3`.

### urgent-lint

```sh
pnpm --filter app --filter agent --filter world --filter @vgi/commit lint && pnpm --filter app --filter agent --filter world --filter @vgi/commit typecheck
```

Exit 0; 9.267 s. All four packages passed lint and typecheck after the renderer fix.
Log SHA-256: `14e57cca24965be909f992264f6aea3a1bed01d8c68599697a614a21123702a8`.

### urgent-app-unit

```sh
pnpm --filter app test --maxWorkers=2
```

Exit 0; 103.325 s. 342 app tests passed after the renderer fix.
Log SHA-256: `c4a64275494ed4a71ce084f47eb4d4e99901b484b6c81bd3f704a1f1ebee2743`.

### urgent-transition

```sh
flock "$TMPDIR/vgi-browser-heavy.lock" env APP_TEST_PREVIEW=1 pnpm --filter app exec playwright test urgent-transition.spec.ts --project desktop
```

Exit 0; 3.595 s. Late appearance, scroll, wrapped resize and removal regression passed.
Log SHA-256: `2bea6200e646299b385047d3f26a703adb5945836a3e10913e2e84184a0af70a`.

### urgent-controls

```sh
flock "$TMPDIR/vgi-browser-heavy.lock" env APP_TEST_PREVIEW=1 EHR_UI_FILES="[]" pnpm --filter app exec playwright test ui-check.spec.ts urgent-transition.spec.ts --project desktop --grep "urgent|patient identity"
```

Exit 0; 3.841 s. Existing concurrent-alert control and the new transition regression passed.
Log SHA-256: `08e1c173d42aad2e45bc6a971a1c6bb890dfe031d057e846705a4128bd5cd401`.

### urgent-rebuild

```sh
pnpm --filter app build && node scripts/wasm-assets.mjs
```

Exit 0; 9.623 s. Final app rebuilt and WASM source/assets manifest checked.
Log SHA-256: `1d1120032eb5377ce801332e1b7e5aa129da1f3be823eacfa98ce6ef271d895d`.

### final-fresh-integration

```sh
DATABASE_URL=postgres://vgi:vgi-dev-only@127.0.0.1:55532/vgi_commit pnpm --filter @vgi/commit test:integration
```

Exit 0; 34.296 s. 53 integration tests passed again on a newly created final stack before loading.
Log SHA-256: `e98722a842d35b3fe17cd3634d330462d83abb64bf13fcb2778719dafd8ce3a6`.

### final-proof-audit

```sh
set -e; cd lean; lake build 2>&1 | tee "$TMPDIR/lean-build.log"; if grep -E "warning:.*(sorry|declaration uses)" "$TMPDIR/lean-build.log"; then exit 1; fi; cd ..; bash scripts/audit-verification.sh
```

Exit 0; 5.136 s. After the clinical renderer fix: 517-job build and 84-headline axiom audit passed.
Log SHA-256: `fcf2dfddd61a62ff27a98f46ecb92f3cd02d32cb8beffd963729e21645cbbdec`.

### fresh-stack

```sh
set -e; export COMPOSE_PROJECT_NAME=vgi-merged-20261107; unset DATABASE_URL; make setup; make infra-up; node infra/scripts/wait-healthy.mjs --identity
```

Exit 0; 14.267 s. Configured isolated PostgreSQL and Keycloak services and passed the identity health check.
Log SHA-256: `a35445d8a4d4127a462c0f4eb106941b866c44aec97b81ce5fa7e47970cc9c8a`.

### viewer-build

```sh
pnpm --filter app build && node -e 'const fs=require("node:fs"); const b=JSON.parse(fs.readFileSync("app/dist/build.json")); if(b.appSha256!=="b78fef8c17c68d215ad91bf67a49ca2150f651d844cc8eb426449b24f05629e7") throw Error(JSON.stringify(b)); console.log("Certified app hash unchanged:", b.appSha256)'
```

Exit 0; 9.553 s. Dashboard-only change rebuilt; certified app hash unchanged.
Log SHA-256: `0d9e0a61b031ecbb7aa9f875a7896f08abcd22ddb85425bf75d7e79f93c26b8b`.

### viewer-final-build

```sh
pnpm --filter app build && node scripts/wasm-assets.mjs && node -e 'const fs=require("node:fs"); const b=JSON.parse(fs.readFileSync("app/dist/build.json")); if(b.appSha256!=="b78fef8c17c68d215ad91bf67a49ca2150f651d844cc8eb426449b24f05629e7") throw Error(JSON.stringify(b)); console.log("Certified app hash unchanged:", b.appSha256)'
```

Exit 0; 9.701 s. Final code commit rebuilt; certified app hash and WASM manifest unchanged.
Log SHA-256: `2b8dc20fefbff9ab2dbfbbd9082938b809dfc1f36b2f10e3079eec5f3750f98d`.

### viewer-lint

```sh
pnpm --filter app --filter agent --filter world --filter @vgi/commit lint && pnpm --filter app --filter agent --filter world --filter @vgi/commit typecheck
```

Exit 0; 9.459 s. All four packages passed lint and typecheck after the dashboard fix.
Log SHA-256: `89d6df30d76e9a922be4b4786d51370c63c3671ae011e15ff1c23464af7ea550`.

### viewer-app-unit

```sh
pnpm --filter app test --maxWorkers=2
```

Exit 0; 105.086 s. 342 app tests passed after the dashboard fix.
Log SHA-256: `a2ea850d185e76ceb11fdaa6666ee79d5330c954363d36688123ceaa1dc687b2`.

### viewer-contrast-after

```sh
flock "$TMPDIR/vgi-browser-heavy.lock" node "$TMPDIR/merge-two-20261107/fullscreen-contrast.mjs" "$TMPDIR/merge-two-20261107/viewer-contrast-observation-after.json"
```

Exit 0; 5.394 s. Fullscreen metrics contrast 14.70:1 and reserved transport padding 76 px.
Log SHA-256: `b5029cda1f462b17a1b743bfdc49fa79b1386b7e0722ac8abdf0c135877af2ab`.

### viewer-targets

```sh
flock "$TMPDIR/vgi-browser-heavy.lock" env APP_TEST_PREVIEW=1 pnpm --filter app exec playwright test trajectories.spec.ts compare.spec.ts --project desktop --workers=1
```

Exit 0; 75.983 s. Seven playback/compare browser tests passed; fixed 1440×900 logical viewports preserved.
Log SHA-256: `062a7b29b91327ca57bcd681280df15c964c10f09526a27a1c6f95bc1ccbd911`.

### viewer-proof-audit

```sh
bash scripts/audit-verification.sh
```

Exit 0; 4.930 s. 84 headline theorems audited at final code commit; only permitted axioms.
Log SHA-256: `10947ec852ab950417405d837d67daa27a2250cc50f283d1a6d5ebe813929001`.

## Retained recording and browser evidence

The final recording contains 33 certified revisions and 50 remeasured shifts. Saved and regenerated replay both verified 1,284 tasks and 72,636 events with zero mismatches; the saved-context pass also checked three baselines (79 events). The saved-context pass reran WASM and used recorded native context-extraction evidence. Fresh regenerated replay independently executed native and WASM for all 72,636 events.

132 frozen inputs, 45 model decisions, 50 schedules and 50 clinical-day task/event streams are byte/semantic-digest preserved. Re-certification updates derived geometry, timings, certificates, indexes and replay evidence; it makes no model calls.

Recording screen gate: 24,353 clinical states and 219,177 physical measurements, zero findings. Artificial geometry probes are excluded from physical-policy coverage.

- templates: 1,826 distinct checked trees; 4,813 exported occurrences; 16,434 physical measurements; zero findings; controls passed.
- personas: 1,296 distinct checked trees; 3,619 exported occurrences; 11,664 physical measurements; zero findings; controls passed.

Desktop: 183 passed, 21 optional skips, zero unexpected failures or flaky tests; all 44 required live/dashboard tests executed and passed. Explicit MAR/ADT: three passed, zero skipped. All five review screenshots and 18 live-selection captures have current digest receipts.

Review captures: [dashboard](../../app/shots/final/dashboard.png), [ui-browser-timeline](../../app/shots/final/ui-browser-timeline.png), [compare](../../app/shots/final/compare.png), [trajectory-playback](../../app/shots/final/trajectory-playback.png), [trajectory-playback-fullscreen](../../app/shots/final/trajectory-playback-fullscreen.png).

Verified run content digest: `18d4337f018705bd711120dc190c30d9de2f8e3bec0304f35951fa0cbce493a9` across 73,181 files.

## Resolved attempts and limits

The incoming ADT lane initially failed the new strict ESLint/typecheck boundaries. Runtime Zod validation, narrowed values and overload-preserving test hooks resolved those failures; the complete lint/typecheck and integration commands then passed after each squash. The initial fast unit pass exposed the stale WASM source manifest; an actual WASM rebuild resolved it. A proof-audit attempt crossed a commit change and was rejected by its own snapshot guard; it passed with a stable code commit.

The first complete re-certification passed on the preceding renderer binding. Visual review of a refreshed fullscreen trajectory then exposed a late-alert overlap: the strip was 64 px tall while the patient banner remained at y=0. A targeted regression failed on that build. `b09f6788` fixes the mount dependency and pinned offsets; its regression and all 342 app tests pass. The partial template audit was stopped before the full pair completed, and its evidence was archived. The final binding received a new complete re-certification, fresh stack and desktop/MAR checks. Further screenshot review exposed a separate dashboard cascade defect: normal panel styling overrode the dark fullscreen backdrop and reserved transport space, yielding 1.09:1 metrics contrast. `c27db794` restricts that styling to non-fullscreen playback; the browser measurement is now 14.70:1 with 76 px reserved padding. The certified app hash remained unchanged. All 342 app tests and seven playback/compare tests passed after this review-only fix. The complete sequential audit pair ran after both fixes. Earlier successful receipts are superseded where they depend on the clinical renderer hash.

No files under `runs/`, `fixtures/`, `programs/` or world output directories, and no `verdicts.json`, were staged. Generated verdict/matrix files were restored to their tracked versions after retaining fresh check receipts. No other branches/worktrees, external clinical authority or unrelated containers were changed. Nothing was pushed and no hosted CI was triggered. No new clinical rules, swap/cancellation API or dynamic-cache semantics were invented. The bounded checks and trace witnesses do not prove arbitrary TypeScript/SQL behavior or actual overlapping lock acquisition; circular-wait exclusion remains conditional on the documented ordered lock plan.

## Owner questions

- Are the new ADT specifications and the documented ordered-lock correspondence assumptions accepted?
- Should swap/cancellation commands and dynamic-cache inputs become a separate follow-up scope?

[Machine-readable receipts, exact commands, source probes and screenshot digests](merge-two-verification-20261107.json).
