# Six-lane integration verification

Verified source revision `89674a1f010973e129c8c774b544f07e94e9ba1d` on local `main`. Nothing pushed. Build hashes below identify the tested artifacts. Exact commands, exits, wall times and log digests are retained in [the JSON receipt](merge-six-verification-20261106.json).

Clinical app SHA-256: `a53258c9e848767016c2fa4e66ab73372a187773d43bc5049e87d908e3c18fb3`.
Native SHA-256: `326b80556c1c590dbf9771101c6c8aa54642bc3a0ef98690cce2d0f40647320b`.
WASM SHA-256: `eadbb1ff65a394fe341ec384625a455a60fd93487fda1d12946aa18313236a2d`.
Lean/WASM source binding: `b1dd19d4b33b6e83b2fb6fe2ed74219963e116c5acbc2da7a2f8baa68b6c1829`.

Fingerprint wiring and populated code-field reflow change the certified clinical app hash from `8d0fadf26732b5c9cc8a40c84f426b54aa4cd14eaf96c6264c983b1c35283e04`. All retained revisions receive new matching bindings. Protected specs/properties/statements/Comparator inputs are unchanged; no new axiom or unchecked proof escape was introduced.

| Commit | Change |
|---|---|
| `ef13b7c6` | Bind clinical commands to natively verified painted screens |
| `d3a79f08` | Model commit publication, cache safety and traced fingerprint rollback |
| `3076b77f` | Add typed clinical information needs and opt-in lookup simulation |
| `a5b993b6` | Add sound finite completion certificates and scoped scenario checks |
| `c24dac28` | Add verified layout families and the native painter research harness |
| `2074794d` | Guide nightly exploration with train-only structure and effect evidence |
| `5fe212c4` | Keep completion fault tests focused on the validation gate |
| `69fbba53` | Batch popup geometry through one native interpreter per bundle |
| `a316044d` | Preserve earlier shared refusals in fingerprint protocol traces |
| `2a73772c` | Remove redundant delays from settled screen measurements |
| `06e854ec` | Serve generated world artifacts through their manifest inventory |
| `a6ad5383` | Exercise partial comparison data through prefix-pinned index URLs |
| `89674a1f` | Let confirmed code fields wrap with enlarged clinical text |

**Verification results.**

| Check | Result |
|---|---|
| Lean + Comparator | Default build and all three challenges passed; 1952 printed closures use only the three permitted axioms. |
| Fast suites | Agent 204, app 342, world 99, realism/import 18, scripts 38, information-needs Python 2; all passed. |
| Static checks | Agent/app/world/service typecheck and configured lint passed. |
| Canonical conformance | 15 targets × 201 scenarios; 1584 pass, 0 fail, 1431 not applicable. |
| Certification matrix | 15 accepted / 23 rejected. |
| Native/WASM | All 324 FHIR bundles and 897 screen variants; density, clinical samples and wristband acceptance/refusal passed. Fingerprint native/WASM/host agreement passed on the same real-screen/constructor corpus. |
| Completion | 18 selected scenarios; 7 CLI regressions; general property 6 remains open. |
| UI library | 3,381/3,381 port checks, 76 families, 354 structural cases; 13 native tests and 4 browser tests. |
| Painter differential | 198 boxes / 111 lines; max 0 px box and 1/64 px line-width deviation. |
| Commit model | 21,393 host states + 81 cache states; five unsafe controls rejected. Nine trace tests, Lean witness for 23 HTTP attempts. |
| Service | 51 integration + 7 unit tests passed. |
| Cache regression | Real serial/parallel/cold/warm/uncached gates retained identical passes and deliberate failures. |
| Recording | 33 revisions installed, 50 shifts remeasured; 1,284 tasks / 72,636 events; initial saved-context WASM replay and freshly regenerated native/WASM strict replay passed with 0 mismatches. |
| Desktop | 182 passed; all 41 requested live/dashboard/selection tests passed. Optional skips are itemized in JSON; All three explicit MAR/ADT tests passed separately with no skips. |
| Screenshots | All 18 live-selection PNGs regenerated from the fresh authority, with local ignored semantic sidecars and matching digests; stale marking cleared. |
| Full templates audit | 1826/1826 states; 16434 physical measurements; 0 findings. |
| Full personas audit | 1296/1296 states; 11664 physical measurements; 0 findings. |

The full template audit and then the full persona audit ran once, sequentially, under the shared lock. Cache entries were reused only for the exact current context. The warm recording gate reused the fully populated current-build cache (27,371 hits, zero misses), completing all 33 revisions in 176.37 seconds total before installation, replay and remeasurement. Initial saved-context replay retains its recorded native evidence and executes WASM anew; regenerated replay extracts and verifies fresh native contexts as well as WASM. The population pass was partially warm after seeding 819 exact current-context profile results; its wall time is not labeled a cold benchmark.

**Cold-revision investigation.**

| Phase | Before | After |
|---|---:|---:|
| Total | 847.23 s | 651.17 s |
| Native preparation | 82.15 s | 21.54 s |
| Browser gate | 763.33 s | 627.77 s |

Both cold runs used the same P1/v1 revision, three FHIR bundles, 981 inputs and 819 distinct trees. All 981 tree verdicts and geometry records and all 8,046 physical measurement records matched exactly. Batching popup renders removes repeated interpreter startup; capture settling removes an extra frame pair and fixed timer. The single-run command wall reduction was 23.14% (23.17% using in-process timing); native preparation fell 73.78%. This controlled pair is bound to renderer 98657b33, before the later populated-select reflow fix.

The read-only I/O probe took 487 ms to hash 981 trees, 228 ms to validate/read 819 warm results, and 5 ms for absent-cache lookups (OS filesystem cache warm). Buffered atomic writes to a fresh scratch destination took 191 ms for 819 results and 284 ms for 6,588 physical samples, with preloaded inputs and no fsync, matching the production cache sequence; these are not cold-disk throughput measurements. Browser launches totaled 6.63 s and geometry capture about 25.56 s of summed worker time. Summed worker times are not additive wall-clock components. Native validation workers overlapped the first two optimized batches and were then suspended; these are single observations, not a statistical estimate.

Standalone revision timing does not equal the average of a cross-revision-deduplicated batch. The historical approximately 90 s/revision serial baseline has no recorded cache temperature or fully pinned coverage, so an exact historical regression ratio cannot be established. The earlier 178 s/revision cold batch remains historical evidence, not a comparable current measurement.

**Final renderer cold run.**

After the populated code-field fix, a fresh cold cache on the final app hash took 632.73 s command wall time: 19.89 s native preparation and 610.87 s browser gate. Coverage: 981 trees, 894 clinical states, 8046 physical measurements and zero findings. No other heavy verification ran alongside this sample. It is a single observation; the earlier controlled before/after comparison used app hash 98657b33, whose geometry differs after reflow.

The controlled pre-fix browser sample spent 691.55 s of summed worker time rendering pages, 711.30 s applying physical policy, and 440.95 s waiting for pinned fonts and their required frame pair. The redundant second frame pair cost another 440.18 s, and fixed timers 368.63 s. Retained rendering and physical checks dominate the optimized sample; browser startup and cache I/O do not explain the regression. Worker scheduling was not isolated into a causal measurement, so no contention speedup is claimed.

**Final verification timings.**

| Command | Wall time |
|---|---:|
| `all-fast-reviewed` | 265.239 s |
| `canonical-final` | 3743.303 s |
| `recert-prime-final` | 3939.038 s |
| `recording-install-final` | 5549.994 s |
| `desktop-verified` | 625.880 s |
| `mar-adt-desktop` | 10.519 s |
| `audit-templates` | 1088.377 s |
| `audit-personas` | 505.742 s |
| `recording-digest` | 597.965 s |

**Commands and receipts.**

Commands are relative to the repository root unless they change directory. Shared environment: `TMPDIR=/home/saithat/Projects/run-tmp CI=true LEAN_NUM_THREADS=6 EHR_SCREEN_WORKERS=6`. Native readers use the immutable matching binary where indicated. Playwright workers never exceed six; full audits and recording browser work share `flock "$TMPDIR/vgi-browser-heavy.lock"`.

**merged-proofs** — exit 0; 92.054 s.

```sh
make verify && cd lean && lake env lean Ehr/Commit/Protocol/Proofs.lean && lake env lean Ehr/Commit/Protocol/Cache.lean && lake env lean Ehr/Sim/InformationNeedsTests.lean && lake env lean Ehr/Sim/InformationMinimum.lean && lake env lean Ehr/Check/CompletionAudit.lean && for module in Engine Contrast Check Keyboard Json Semantic Family Examples; do lake env lean "Ehr/Layout/$module.lean" || exit; done
```

**final-assets-build** — exit 0; 26.430 s.

```sh
JOBS=6 EM_CACHE="$TMPDIR/fingerprint-em-cache" make wasm && node scripts/wasm-assets.mjs && pnpm --filter app typecheck && pnpm --filter app lint && pnpm --filter app build && cat app/dist/build.json
```

**agent-fast-fixed** — exit 0; 131.482 s.

```sh
pnpm --filter agent test --maxWorkers=2
```

**native-batch-verified** — exit 0; 10.326 s.

```sh
pnpm --filter agent typecheck && pnpm --filter agent lint && pnpm --filter agent exec vitest run test/native-batch.test.ts test/native-timeout.test.ts test/geometry.test.ts --maxWorkers=2
```

**app-fast** — exit 0; 111.088 s.

```sh
pnpm --filter app exec vitest run --maxWorkers=2 --testTimeout=30000
```

**world-fast** — exit 0; 15.332 s.

```sh
pnpm --filter world exec vitest run --maxWorkers=2 && node --test infra/scripts/seed-world.test.mjs scripts/synthetic-hospital/convert.test.mjs world/realism/*.test.mjs
```

**scripts-fast** — exit 0; 11.978 s.

```sh
node --import ./agent/node_modules/tsx/dist/loader.mjs --test --test-concurrency=2 scripts/historical-releases.test.mjs scripts/recertify-runs.test.mjs scripts/compare-screen-results.test.mjs scripts/geometry-history.test.mjs scripts/migrate-neutral-terms.test.mjs scripts/run-prefix.test.mjs scripts/rename-run.test.mjs scripts/fictional-identities.test.mjs scripts/trajectories/*.test.mjs scripts/complexity/*.test.mjs app/scripts/*.test.mjs
```

**conformance-unit-fixed** — exit 0; 144.890 s.

```sh
pnpm test:conformance
```

**explore-fast** — exit 0; 17.724 s.

```sh
pnpm --filter agent exec tsc -p ../explore/tsconfig.json --noEmit && node --import ./agent/node_modules/tsx/dist/loader.mjs --test --test-concurrency=2 explore/*.test.ts
```

**canonical-final** — exit 0; 3743.303 s.

```sh
node conformance/index.mjs --canonical --binary "$TMPDIR/merge-six-20261106/ehr-pinned" --jobs 6
```

**native-wasm-pinned** — exit 0; 1286.765 s.

```sh
python3 "$TMPDIR/merge-six-20261106/wasm-shards.py"
```

**completion-ui-merged** — exit 0; 45.333 s.

```sh
lean/.lake/build/bin/completion-bench "$PWD" "$TMPDIR/merge-six-20261106/completion-bench" && node --test scripts/completion-check.test.mjs scripts/ui-library/native.test.mjs scripts/ui-library/family.test.mjs && node scripts/ui-library/port-audit.mjs --baseline "$TMPDIR/ui-library-port-before-scope.jsonl"
```

**protocol-priority** — exit 0; 38.529 s.

```sh
cd lean && lake build && lake env lean Ehr/Commit/Protocol/Proofs.lean && lake env lean --run Ehr/Commit/Protocol/Check.lean && cd .. && pnpm --filter @vgi/commit typecheck && COMMIT_PROTOCOL_TRACE_KEEP=1 pnpm --filter @vgi/commit test:protocol
```

**screen-cache-merged** — exit 0; 39.791 s.

```sh
flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off node --test scripts/screen-cache-browser.test.mjs
```

**cold-profile-after** — exit 0; 651.169 s.

```sh
VGI_PROFILE_DIR="$TMPDIR/merge-six-20261106/profile-after" EHR_SCREEN_CACHE_DIR="$TMPDIR/merge-six-20261106/profile-after/cache" NODE_OPTIONS="--import=$TMPDIR/merge-six-20261106/profile-loader.mjs" flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off pnpm --filter agent exec tsx "$TMPDIR/merge-six-20261106/profile-revision.mts"
```

**cold-profile-compare** — exit 0; 6.556 s.

```sh
node scripts/compare-screen-results.mjs "$TMPDIR/merge-six-20261106/profile-before/result/recertification.json" "$TMPDIR/merge-six-20261106/profile-after/result/recertification.json" && python3 "$TMPDIR/merge-six-20261106/profile-summary.py" before after
```

**recert-prime-final** — exit 0; 3939.038 s.

```sh
set -e
flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off node scripts/recertify-runs.mjs --runs core-10day --out "$TMPDIR/merge-six-20261106/recert-prime-final"
```

**recording-install-final** — exit 0; 5549.994 s.

```sh
set -e
flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off node scripts/migrate-neutral-terms.mjs --recertify-only --runs core-10day
```

**recording-after-final** — exit 0; 0.784 s.

```sh
set -e
python3 "$TMPDIR/merge-six-20261106/integrity.py" after && python3 - <<'PY'
import json
r=json.load(open("runs/recertification-report.json"));x=next(x for x in r["runs"] if x["run"]=="core-10day")
assert "error" not in x,x.get("error")
assert len(x["certificates"])==33 and all(c["status"]=="certified" for c in x["certificates"])
assert len(x["measurements"])==50
for key in ["replay","regeneratedReplay"]:
 p=x[key];assert p["status"]=="passed" and not p["mismatches"],p
 assert (p["tasks"],p["events"])==(1284,72636)
 assert p["nativeEventsVerified"]==p["events"]==p["wasmEventsVerified"]
batch=json.load(open("runs/core-10day/migration/batch-screen-check/recertification.json"))
assert len(batch["certificates"])==33
assert all(b["cache"]["misses"]==0 for b in batch["batches"]),[b["cache"] for b in batch["batches"]]
print(json.dumps({"certificates":33,"measurements":50,"tasks":1284,"events":72636,"mismatches":0,"warmCache":[b["cache"] for b in batch["batches"]]}))
PY
python3 - <<'PY'
import json
r=json.load(open("runs/recertification-report.json"));assert r["build"]["appSha256"]=="a53258c9e848767016c2fa4e66ab73372a187773d43bc5049e87d908e3c18fb3"
print("Final renderer binding matches recertification report")
PY
```

**service-current** — exit 0; 36.919 s.

```sh
set -e
DATABASE_URL=postgres://vgi:vgi-dev-only@127.0.0.1:55532/vgi_commit COMMIT_PROTOCOL_TRACE_KEEP=1 pnpm --filter @vgi/commit test:integration && pnpm --filter @vgi/commit test && pnpm --filter @vgi/commit typecheck
```

**mar-adt-desktop** — exit 0; 10.519 s.

```sh
set -e
DATABASE_URL=postgres://vgi:vgi-dev-only@127.0.0.1:55532/vgi_commit COMMIT_INTERNAL_URL=http://127.0.0.1:8091 MAR_E2E=1 ADT_E2E=1 APP_TEST_PREVIEW=1 flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off pnpm --filter app exec playwright test mar-service.spec.ts adt-service.spec.ts --project=desktop --workers=1 --reporter=list,json
```

**desktop-verified** — exit 0; 625.880 s.

```sh
set -e
APP_TEST_PREVIEW=1 AUDIT_RUN=core-10day flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off pnpm --filter app exec playwright test --project=desktop --workers=1 --reporter=list,json
```

**desktop-required** — exit 0; 0.021 s.

```sh
set -e
python3 "$TMPDIR/merge-six-20261106/check-desktop.py"
```

**shots-final** — exit 0; 0.021 s.

```sh
set -e
python3 - <<'PY'
import json,pathlib,hashlib
root=pathlib.Path("app");m=json.load(open(root/"shots/final/neutral-manifest.json"));c=[x for x in m["captures"] if x["path"].startswith("shots/realism/live-select/")]
assert len(c)==18
assert not any(x.get("mode")=="stale-live" for x in m["captures"])
for x in c:
 assert x["mode"]=="live"
 assert hashlib.sha256((root/x["path"]).read_bytes()).hexdigest()==x["sha256"]
 assert (root/x["source"]).is_file()
print("18 fresh live-selection PNGs with semantic sidecars and matching digests; no stale markings")
PY
```

**audit-templates** — exit 0; 1088.377 s.

```sh
flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off node scripts/audit-alert-policy.mjs "$TMPDIR/merge-six-20261106/audit-templates"
```

**audit-personas** — exit 0; 505.742 s.

```sh
flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off node scripts/audit-alert-policy.mjs "$TMPDIR/merge-six-20261106/audit-personas" --personas
```

**fingerprint-axioms** — exit 0; 0.633 s.

```sh
cd lean && lake env lean "$TMPDIR/merge-six-20261106/fingerprint-axioms.lean"
```

**source-integrity** — exit 0; 0.324 s.

```sh
git diff 5d47ede3 --check && git diff --exit-code 5d47ede3 -- lean/Ehr/Specs lean/Ehr/Props lean/Statements.lean lean/comparator.json && node scripts/wasm-assets.mjs && sha256sum lean/.lake/build/bin/ehr "$TMPDIR/merge-six-20261106/ehr-pinned" && git log 5d47ede3..HEAD --format="%h %s%n%b"
```

**profile-sample-agreement** — exit 0; 0.892 s.

```sh
python3 "$TMPDIR/merge-six-20261106/compare-profile-samples.py"
```

**all-fast-reviewed** — exit 0; 265.239 s.

```sh
set -e
pnpm --filter agent test --maxWorkers=2 && pnpm --filter app exec vitest run --maxWorkers=2 --testTimeout=30000 && pnpm --filter world exec vitest run --maxWorkers=2 && node --test infra/scripts/seed-world.test.mjs scripts/synthetic-hospital/convert.test.mjs world/realism/*.test.mjs && node --import ./agent/node_modules/tsx/dist/loader.mjs --test --test-concurrency=2 scripts/historical-releases.test.mjs scripts/recertify-runs.test.mjs scripts/compare-screen-results.test.mjs scripts/geometry-history.test.mjs scripts/migrate-neutral-terms.test.mjs scripts/run-prefix.test.mjs scripts/rename-run.test.mjs scripts/fictional-identities.test.mjs scripts/trajectories/*.test.mjs scripts/complexity/*.test.mjs app/scripts/*.test.mjs && python3 scripts/test-information-needs-compare.py && pnpm --filter agent exec tsc -p ../scripts/tsconfig.information-needs.json && pnpm --filter @vgi/commit typecheck && pnpm --filter agent typecheck && pnpm --filter world typecheck && pnpm --filter app typecheck && pnpm --filter app lint && pnpm --filter agent lint && pnpm --filter world lint
```

**live-release-bindings** — exit 0; 0.045 s.

```sh
python3 - <<'PY'
import json
c=json.load(open(".cache/commit/config.json"))
v={p:c["releases"][p]["program"]["version"] for p in ["P1","P2","P3","P4","P5"]}
assert v=={"P1":5,"P2":7,"P3":4,"P4":8,"P5":4},v
print(json.dumps(v))
PY
```

**recording-digest** — exit 0; 597.965 s.

```sh
pnpm --filter agent exec tsx "$TMPDIR/merge-six-20261106/verify-run-digest.mts"
```

**cache-write-profile-complete** — exit 0; 1.109 s.

```sh
node "$TMPDIR/merge-six-20261106/cache-write-profile.mjs"
```

**final-integrity** — exit 0; 1.086 s.

```sh
bash "$TMPDIR/merge-six-20261106/final-integrity.sh"
```

**recording-clinical-integrity** — exit 0; 0.684 s.

```sh
python3 "$TMPDIR/merge-six-20261106/integrity.py" verify
```

**world-route-fix-static** — exit 0; 20.576 s.

```sh
pnpm --filter app exec vitest run tests/live-run-http.test.ts tests/run-selection.test.ts --maxWorkers=2 && pnpm --filter app typecheck && pnpm --filter app lint && pnpm --filter app build
```

**world-route-targeted** — exit 0; 120.846 s.

```sh
pnpm --filter app exec vitest run --maxWorkers=2 --testTimeout=30000 && APP_TEST_PREVIEW=1 AUDIT_RUN=core-10day flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off pnpm --filter app exec playwright test acute-banner.spec.ts --project=desktop --workers=1 --reporter=list,json
```

**compare-fixture-fix** — exit 0; 18.182 s.

```sh
pnpm --filter app typecheck && pnpm --filter app lint && APP_TEST_PREVIEW=1 flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off pnpm --filter app exec playwright test compare.spec.ts --grep "partial index" --project=desktop --workers=1 --reporter=list,json
```

**select-reflow-paired** — exit 0; 14.986 s.

```sh
pnpm --filter app build && EHR_UI_FILES='["/home/saithat/Projects/VGI-Health/app/src/fixtures/ui/w1Orders.json"]' APP_TEST_PREVIEW=1 flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off pnpm --filter app exec playwright test ui-check.spec.ts --grep "physical policy:" --project=desktop --workers=1 --reporter=list,json
```

**select-reflow-defaults** — exit 0; 15.724 s.

```sh
APP_TEST_PREVIEW=1 flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off pnpm --filter app exec playwright test ui-check.spec.ts --project=desktop --workers=4 --reporter=list,json
```

**cold-profile-final** — exit 0; 632.728 s.

```sh
set -e
VGI_PROFILE_DIR="$TMPDIR/merge-six-20261106/profile-final" EHR_SCREEN_CACHE_DIR="$TMPDIR/merge-six-20261106/profile-final/cache" NODE_OPTIONS="--import=$TMPDIR/merge-six-20261106/profile-loader.mjs" flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off pnpm --filter agent exec tsx "$TMPDIR/merge-six-20261106/profile-revision.mts"
```

**profile-final-summary** — exit 0; 2.928 s.

```sh
set -e
python3 "$TMPDIR/merge-six-20261106/profile-summary.py" final
```

**screen-cache-final** — exit 0; 37.414 s.

```sh
set -e
flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off node --test scripts/screen-cache-browser.test.mjs
```

**ui-library-final** — exit 0; 5.864 s.

```sh
set -e
flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off pnpm --filter app exec playwright test --config src/browser/ui-library/playwright.config.ts
```

**live-verified-import** — exit 0; 27.857 s.

```sh
set -e
DATABASE_URL=postgres://vgi:vgi-dev-only@127.0.0.1:55532/vgi_commit COMPOSE_PROJECT_NAME=vgi-merge-live-20261106 COMMIT_TENANT=merge-verified make load SYNTHETIC_HOSPITAL=1 && docker compose --env-file .env -f infra/docker-compose.yml -p vgi-merge-live-20261106 restart commit && node infra/scripts/wait-healthy.mjs
```

**live-verified-bindings** — exit 0; 0.046 s.

```sh
set -e
python3 - <<'PY'
import json
c=json.load(open(".cache/commit/config.json"))
v={p:c["releases"][p]["program"]["version"] for p in ["P1","P2","P3","P4","P5"]}
assert v=={"P1":5,"P2":7,"P3":4,"P4":8,"P5":4},v
print(json.dumps(v))
PY
```

**select-reflow-layout** — exit 0; 35.908 s.

```sh
APP_TEST_PREVIEW=1 flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off pnpm --filter app exec playwright test canonical-density.spec.ts acute-banner.spec.ts columns.spec.ts --project=desktop --workers=1 --reporter=list,json
```

**recording-clinical-final** — exit 0; 0.705 s.

```sh
python3 "$TMPDIR/merge-six-20261106/integrity.py" verify
```

**cleanup-owned-stacks** — exit 0; 2.158 s.

```sh
set -e
 docker compose --env-file .env -f infra/docker-compose.yml -p vgi-merge-live-20261106 --profile app down -v
 COMMIT_PG_PORT=55438 docker compose -f services/commit/compose.yml -p vgi-merge-six down -v
```

**Preliminary attempts and limits.**

- generated-world HTTP routing: Stopped the initial broad desktop run after four banner timeouts exposed the server treating /runs/world/<id>/ as a completed recording. Added manifest-inventoried world reads and an HTTP regression retaining recorded-run fences and rejecting traversal/unlisted files. Full app unit suite and affected banner tests rerun, followed by a fresh complete desktop run. Certified clinical app hash remains unchanged by this server-only fix.
- early Lake overlap: An early bounded check and trace test overlapped. Added a per-checkout lock for every Lake-invoking verification command and reran required checks sequentially.
- native import isolation: No startup improvement (~0.75 seconds); entirely reverted. Diagnostic rebuild interrupted original unpinned readers with ENOENT. Those attempts discarded and rerun against an immutable matching binary.
- canonical profiling suspension: Suspending its process expired 30-second native-call deadlines. Discarded the entire attempt and restarted the full six-worker suite uninterrupted; no result stitching or weakened assertions.
- native-startup-fix receipt: Initial diagnostic command masked a build failure in its final shell status. Not counted as a pass; corrected build and complete restoration verified separately.
- initial source integrations: Merged MAR fixture required the event return to expose state explicitly; completion goal codec lacked information-needs serializers; baseline audit paths referenced a lane checkout; validation fixture stopped at new effect floor; stored CURES probe bound prior binary; new native-batch parser required narrowing rather than a cast. Fixed causes and reran relevant checks.
- comparison fixture and populated-select reflow: The second complete desktop run passed 180 tests, skipped 21 opt-in cases, and found two failures. The partial-index fixture missed prefix-pinned requests; fixed its route and asserted interception, retaining every fallback/day/frame expectation. A real populated frequency label clipped at 1280px/200% text. DOM inspection identified the confirmation wrapper; text-relative minimum tracks now include direct and confirmed code fields. All 47 default fidelity/physical/control checks pass. No assertion, field value or policy threshold was weakened. Renderer hash changed to the final binding, so cache population and warm recording installation/replay were repeated.

All required final checks passed. Interrupted attempts are retained as failed/preliminary receipts and are not counted as passes. No result stitching, weakened clinical expectation or suppressed finding was used. Recording integrity checks preserved 132 frozen program/spec/input entries, 45 decisions, 50 clinical-day traces and 50 schedules.

- Connect opt-in information-needs effort to the agent train ledger: The delivered simulator and numeric adapter remain separate; wiring them is outside this integration task.
- Push, alter another branch/worktree, or add ignored recordings/fixtures/programs/world data: Owner instruction.
- Close universal completion/layout coverage or prove TypeScript/SQL/FHIR refinement: Outside the delivered lane scopes; explicit remaining proof obligations retained.
- Run new model experiments or the opt-in CPU decision-server endpoint: Not requested; historical model choices preserved and the optional endpoint is outside the verification stack.

**Open owner questions.**

- Approve the commit-model specifications, Postgres/fresh-input assumptions, and priority of administrative ADT versus dynamic facts versus FHIR refinement?
- Approve the information-needs catalog, recency windows, fixed staging, fictional BP policy and source-item carry model?
- Retain the dormant potassium information-needs cases?
- Accept the scoped completion theorem/gate and interruptive-alert/Back specifications as interim results?
- Close W1 layout coverage first or introduce parameterized structural certificates?
- Accept visible Unicode code-point escapes pending broader pinned font coverage?
- How should the provisional floor of 5 net interactions/day be calibrated and broader structural exploration measured after integration?
