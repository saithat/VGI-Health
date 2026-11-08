# Realism wave 1 verification — 2026-11-07

Reviewed code: `b687d2ccd21c8054b292e21ffa567c05f933d937`. All final checks below passed. Work stayed on `main`; nothing was pushed.

## Changes

- `044dc294` — Merge lane/outcomes: typed MAR outcomes and linked follow-up.
- `77e3816c` — Merge lane/adt-swap: atomic exchanges and linked ADT cancellations.
- `593936a9` — fix(mar): refresh generated release labels for all outcomes.
- `b1821049` — fix(world): turn over dirty ADT beds before later admissions.
- `dbda52f1` — fix(mar): preserve distinct native outcomes in live history.
- `0e1a397b` — fix(mar): ignore notifications for an already adopted chart version.
- `b687d2cc` — build: bind combined MAR and ADT sources to refreshed WASM assets.

The documentation and refreshed-capture commit follows these code commits. Every commit has the required Codex co-author trailer. Protected clinical specifications, properties, statements and comparator declarations are unchanged.

## Build binding

- App SHA-256: `030fac6d782d07099213018114de92b4facd19952201e094b4c3890e7edfef60`.
- Native SHA-256: `3587624ca70e83c067cad035859f1e40b210b56158d7f7eb2a92d70969df5bc5`.
- WASM SHA-256: `38d0d047a34d67eceb2be34e40c7cbd0fadff214f726030c08196767c481a1a8`.
- Lean source manifest: `b5dc3c5ca84561a290979836676e1ce66136c8f234fa593944f73ac1b3f7598c`.

The ADT controls, distinct MAR outcome display and notification-version fix change the clinical app binding. One combined Lean/generated-types/WASM build was performed; the discovered MAR notification race required a subsequent app-only rebuild. No later production source change was made. Re-certification installed this final binding on all 33 retained revisions.

## Verification results

The final local CI commands passed, including 209 agent tests, 346 app tests, 107 world tests, five realism tests, ten commit units, 70 script/conformance units, two Python tests and 58 integration tests. Canonical conformance: 15 targets × 201 scenarios, 1,584 pass, zero fail and 1,431 inapplicable; certification: 15 valid acceptances and 23 invalid rejections.

All three Comparator challenges, the 18-scenario completion benchmark and the complete proof-map check passed. Axiom dependencies are limited to `propext`, `Classical.choice` and `Quot.sound`. Both bounded protocol/ADT explorations exhausted their declared graphs; unsafe controls were detected. The ADT checker exhausted 33,467 transaction states / 244,133 transitions across 27 scenarios (maximum shortest-path depth 56), plus 1,257 reducer boards / 11,728 accepted edges. The original checker exhausted 21,393 transaction states and 81 cache states. Standalone traces found Lean witnesses for 23 original protocol attempts, 328 administrative ADT attempts and eight mixed clinical/ADT attempts. These are transaction-linearized refinement tests, not a proof of TypeScript/SQL or physical transport.

Native/WASM differential checks passed all 324 bundles and 897 render variants, including canonical screen bytes and fingerprints. The all-screen port inventory covered 186 paths, 113 programs and 118 matching contexts, with 3,468 geometry/G9 checks and 7,944 structural probes. UI-library verification passed 21 native/font and seven browser tests; the painter differential compared 228 boxes, 153 text lines and 6,861 glyph advances with worst deviation 0 CSS px. The targeted longer MAR administration label passed nine trees and 81 physical measurements with zero findings.

### Final commands and timings

| Check | Exit | Wall seconds |
|---|---:|---:|
| final-setup | 0 | 1.098 |
| final-ci-inputs | 0 | 10.874 |
| final-ci-artifact-roundtrip | 0 | 0.429 |
| final-ci-lint-types | 0 | 9.103 |
| final-ci-agent | 0 | 117.202 |
| final-ci-app | 0 | 102.253 |
| final-ci-world | 0 | 25.953 |
| final-ci-realism | 0 | 5.935 |
| final-ci-commit | 0 | 1.407 |
| final-ci-scripts | 0 | 127.586 |
| final-ci-python | 0 | 0.038 |
| final-ci-conformance | 0 | 214.058 |
| final-ci-integration | 0 | 47.565 |
| proofs-final | 0 | 161.226 |
| native-wasm | 0 | 625.493 |
| ui-final | 0 | 175.610 |
| trace-adt | 0 | 14.100 |
| trace-clinical-adt | 0 | 1.280 |
| trace-protocol | 0 | 1.336 |
| targeted-mar-physical | 0 | 17.352 |
| semantic-fixtures | 0 | 291.942 |
| recertification | 0 | 11811.795 |
| live-load | 0 | 28.043 |
| neutral-screenshots | 0 | 18.740 |
| desktop | 0 | 620.247 |
| mar-adt | 0 | 20.496 |
| dashboard-shots | 0 | 9.322 |
| audit-templates | 0 | 1732.888 |
| audit-personas | 0 | 852.351 |
| final-readme-proof-map | 0 | 13.290 |
| final-integrity | 0 | 769.131 |
| cleanup-test-db | 0 | 0.441 |

### Retained recording

All 33 certificates were reinstalled and all 50 shifts remeasured from preserved inputs. Frozen program/spec/canonical/previous inputs, 45 model decisions, 50 schedules and all 252 files in frozen worlds 1/2 are preserved. Only the two independently identified legacy patient-refusal status entries change from `held` to `refused`; remeasurement updates derived costs, geometry, trajectories and digests. No model calls were made.

| Replay | Tasks | Events | Mismatches |
|---|---:|---:|---:|
| replay | 1284 | 72636 | 0 |
| regeneratedReplay | 1284 | 72636 | 0 |

Saved-context and freshly regenerated native/WASM evidence are distinguished by their verification mode/source in the JSON receipt. Re-certifying frozen inputs does not introduce new outcome scenarios into that recording.

### Successor validation worlds

These local-only ten-day worlds were each generated twice and all files compared byte-for-byte. Native ADT accepted their streams. They are validation inputs, not a new agent-performance experiment; no comparative performance claim or new model decision is reported.

| Seed | Local path | Files | Given / held / refused / delayed / not given | ADT events |
|---|---|---:|---|---:|
| 1 | `runs/world/realism-wave1-seed-1` | 132 | 282 / 10 / 19 / 7 / 6 | 149 |
| 2 | `runs/world/realism-wave1-seed-2` | 132 | 266 / 9 / 14 / 6 / 4 | 168 |
| 3 | `runs/world/realism-wave1-seed-3` | 132 | 205 / 11 / 9 / 4 / 6 | 148 |

### Browser evidence

Desktop: 183 passed, 21 opt-in skips, zero failures and zero flaky results. All 44 required live/dashboard cases executed and passed. Explicit MAR/ADT: three passed, zero skips. The new real-service flows exercise swap, A11/A12/A13, same-intent ambiguity recovery and all five MAR outcomes observed by two nurses.

Refreshed 86 neutral clinical captures, 18 actual live-selection PNG/model pairs and five dashboard/replay captures at 1440×900 against `core-10day`. Digests and capture sources are in the JSON receipt.

| Full audit | Trees | Exported occurrences | Physical measurements | Findings |
|---|---:|---:|---:|---:|
| templates | 1826 | 4813 | 16434 | 0 |
| personas | 1296 | 3619 | 11664 | 0 |

The complete audit pair ran once, templates then personas, sequentially under the shared browser lock. Negative controls passed. Templates used a fresh cache; personas reused 443 matching current-build template results and executed 853 uncached trees. Targeted checks during iteration are listed separately.

## Resolved attempts

- After each squash, the resume unit correctly rejected the stale source-bound WASM manifest. The single combined WASM rebuild resolved it; all 209 agent tests passed on the final binding.
- The ten-day seed-1 ADT generator exhausted a board with eight occupied and four dirty medical beds. Explicit native clean/ready turnover now precedes reuse with the existing 30-minute delay. A controlled regression also retains refusal for genuinely occupied capacity; seeds 1–3 generate deterministically.
- Six tracked canonical/nursing release templates had the old administration label. Native regeneration refreshed only those labels and preserved frozen recorded programs.
- The first expanded board browser test selected a patient while the ready action hid that control. Selecting the transfer action first fixed the test sequence.
- The longer MAR flow exposed delayed own-save notifications replacing a freshly reviewed session. The server refused the stale interaction without a partial write. Ignoring equal/older notices preserves the current journal; a focused unit and the complete real two-nurse flow passed.
- One early CI input-generation attempt was stopped after overlapping the first build. All retained checks ran through a checkout command lock; subsequent Lake work was serialized.

## Scope and omissions

No data under `runs/`, `fixtures/`, `programs/`, world output directories, or any `verdicts.json` was staged. No other branches/worktrees or unrelated containers were changed. Identified leftover VGI containers were stopped, and the session’s spare CI database was removed. Fresh live project `vgi-realism-wave1-20261107` remains available for owner review. Nothing was pushed; no hosted CI or Pages publication was triggered. GitHub artifact transfer was represented by the locally generated archive and verified restore. The pinned runtime, dependencies and sandbox tools were already installed, so shared-host OS provisioning/sysctl changes were unnecessary.

Live notification delivery, cross-shift dose ownership, reservations, physical transport safety, clinical calibration, host/SQL/FHIR refinement proofs and swap unit/service restrictions remain outside this implementation. The bounded checks and trace witnesses do not establish unbounded host execution, fairness or liveness.

## Owner questions

- Approve the provisional MAR rates, windows, escalation rules and 18:59 cutoff?
- Should follow-up work implement live notification delivery and cross-shift dose ownership?
- Approve latest-event-only ADT cancellation and the active, cleaned-origin requirement?
- Approve retaining clinical work linked to a cancelled encounter?
- Should swaps gain unit/service compatibility restrictions?
- Approve the provisional ADT simulation rates and separate administrative/transport boundary?

## Exact local invocations

Commands used disk-backed `TMPDIR`, `CI=true`, `LEAN_NUM_THREADS=6`, four screen workers and at most four Playwright workers. Desktop and research browser suites used one worker; browser-heavy jobs held the shared `flock`. Results below include intermediate attempts so deferred manifest failures and resolved root causes remain reviewable.

### outcomes-build

```sh
cd lean; lake build 2>&1 | tee "$TMPDIR/lean-build.log"; if rg "warning:.*(sorry|declaration uses)" "$TMPDIR/lean-build.log"; then exit 1; fi; lake build $(cat ../scripts/proof-map/extra-modules.txt); lake env lean Ehr/Commit/Mar.lean; cd ..; scripts/proof-map/build.sh --check-readme "$RUNNER_TEMP/outcomes-proof-map"
```

Exit 0; 212.169 s. Started 2026-11-08T02:11:45.557093+00:00. Log SHA-256: `1eedb3d5fe8a94bcf8af37aff406ebcf0cb6c7a041c0fdc0bd1a50721d3e042f`.

### outcomes-ci-inputs

```sh
cd lean
lake env lean --run Ehr/Tools/ExportContent.lean "$TMPDIR/ci-content"
lake env lean --run ../services/commit/test/Fixture.lean > "$TMPDIR/commit-fixture.json"
tar -czf "$TMPDIR/ehr-test-inputs.tar.gz" -C "$PWD/.lake/build/bin" ehr -C "$TMPDIR" ci-content/programs commit-fixture.json
cd ..
bash scripts/audit-verification.sh
```

Exit 0; 81.360 s. Started 2026-11-08T02:15:18.365994+00:00. Log SHA-256: `f3fa0ae7450de45597d943145897a7a4e41beef8ea139567875b14ffa5025283`.

### outcomes-ci-lint-types

```sh
pnpm --filter app --filter agent --filter world --filter @vgi/commit lint
pnpm --filter app --filter agent --filter world --filter @vgi/commit typecheck
```

Exit 0; 9.015 s. Started 2026-11-08T02:16:39.751082+00:00. Log SHA-256: `89d6df30d76e9a922be4b4786d51370c63c3671ae011e15ff1c23464af7ea550`.

### outcomes-ci-agent

```sh
pnpm --filter agent test --maxWorkers=2
```

Exit 1; 118.267 s. Started 2026-11-08T02:16:48.788020+00:00. Log SHA-256: `0c979a31ae8c851288c045d9ae3702c72c8148426002c92a481112f59ac78d09`.

### outcomes-ci-app

```sh
pnpm --filter app test --maxWorkers=2
```

Exit 0; 102.185 s. Started 2026-11-08T02:18:47.077402+00:00. Log SHA-256: `039649b5f00f71739051c1d80a4bbf56a5a5f069826f4b903e462300e4b762ba`.

### outcomes-ci-world

```sh
pnpm --filter world exec vitest run --maxWorkers=2
```

Exit 0; 25.846 s. Started 2026-11-08T02:20:29.285259+00:00. Log SHA-256: `363ffaaaeb8de6bb47deb1d4d2a092e0255e6a2f3a6dbe2bdea6d0dcc54b8d0d`.

### outcomes-ci-realism

```sh
node --test world/realism/*.test.mjs
```

Exit 0; 5.732 s. Started 2026-11-08T02:20:55.155094+00:00. Log SHA-256: `633de16d2612e337158844ad3e5ef59562ecab220dbdc01cb532c75f76167d04`.

### outcomes-ci-commit

```sh
pnpm --filter @vgi/commit test
```

Exit 0; 1.417 s. Started 2026-11-08T02:21:00.909320+00:00. Log SHA-256: `1de0bcec60e43fa78f976d8a44e25430cc322530fe0ea0fc07acec89c2ff5a11`.

### outcomes-ci-scripts

```sh
node conformance/cures-probe.mjs
mapfile -t tests < <(find scripts conformance -name '*.test.mjs' ! -name 'completion-check.test.mjs' ! -name 'screen-cache-browser.test.mjs' ! -path 'scripts/ui-library/*' | sort)
node --import ./agent/node_modules/tsx/dist/loader.mjs --test --test-concurrency=2 "${tests[@]}"
```

Exit 0; 132.499 s. Started 2026-11-08T02:21:02.349655+00:00. Log SHA-256: `a175c25b43fd24730b7097e80ee273046e095f02b060936805b4607535d98ab8`.

### outcomes-ci-python

```sh
python3 scripts/test-information-needs-compare.py
```

Exit 0; 0.044 s. Started 2026-11-08T02:23:14.872860+00:00. Log SHA-256: `fe008aab760eb03ccac7578e2b84665b1b50b0d7f855b17a0c7a8d039435b658`.

### outcomes-ci-conformance

```sh
cp -R "$TMPDIR/ci-content/programs/." programs/
EHR_CONFORMANCE_TRANSPORT=serve node conformance/index.mjs --canonical --jobs 2 --out "$TMPDIR/conformance.json"
node --test scripts/completion-check.test.mjs
python3 lean/Ehr/Check/certify.py
python3 - <<'CHECK'
import json,os,pathlib
c=json.loads((pathlib.Path(os.environ['TMPDIR'])/'conformance.json').read_text())['summary']
assert (c['targets'],c['scenarios'],c['failed'])==(15,201,0),c
r=json.loads(pathlib.Path('lean/Ehr/Check/certification-report.json').read_text())
assert (r['personaAccepted'],r['personaCount'],r['badRejected'],r['badCount'])==(15,15,23,23),r
print(c);print('15 accepted; 23 rejected')
CHECK
```

Exit 0; 218.664 s. Started 2026-11-08T02:23:14.939492+00:00. Log SHA-256: `33b7e5c274642d7bbf657f43979570a9a146549b7652ba36ea9de2348cd651bd`.

### outcomes-ci-integration

```sh
pnpm --filter @vgi/commit test:integration
```

Exit 0; 35.932 s. Started 2026-11-08T02:26:53.626398+00:00. Log SHA-256: `c840737feb365cc8ce991cb5cdc7e83f7b3f725d3b6cd2310631e8c09050fa18`.

### outcomes-targeted

```sh
pnpm --filter world exec vitest run test/administration-outcomes.test.ts --maxWorkers=2; pnpm --filter agent exec vitest run test/lean-types.test.ts --maxWorkers=2
```

Exit 0; 26.816 s. Started 2026-11-08T02:27:29.584292+00:00. Log SHA-256: `6911d0ee9f40e8cee055d3e7935d840d3b10e116f5deda4fed611461356fd34d`.

### adt-build

```sh
cd lean; lake build 2>&1 | tee "$TMPDIR/lean-build.log"; if rg "warning:.*(sorry|declaration uses)" "$TMPDIR/lean-build.log"; then exit 1; fi; lake build $(cat ../scripts/proof-map/extra-modules.txt); for file in Ehr/Commit/Adt.lean Ehr/Commit/Mar.lean Ehr/Commit/Protocol/AdtProofs.lean Ehr/Commit/Protocol/LockOrder.lean Ehr/Commit/Protocol/Proofs.lean Ehr/Commit/Protocol/Cache.lean; do lake env lean "$file"; done; cd ..; scripts/proof-map/build.sh --readme "$RUNNER_TEMP/combined-proof-map"; scripts/proof-map/build.sh --check-readme "$RUNNER_TEMP/combined-proof-map"
```

Exit 0; 31.755 s. Started 2026-11-08T02:28:56.778570+00:00. Log SHA-256: `b36b3a5b633949943e605a2d7f72a8e854442fb3ea2bc08bf26ceea198dd3fdd`.

### adt-ci-inputs

```sh
cd lean
lake env lean --run Ehr/Tools/ExportContent.lean "$TMPDIR/ci-content"
lake env lean --run ../services/commit/test/Fixture.lean > "$TMPDIR/commit-fixture.json"
tar -czf "$TMPDIR/ehr-test-inputs.tar.gz" -C "$PWD/.lake/build/bin" ehr -C "$TMPDIR" ci-content/programs commit-fixture.json
cd ..
bash scripts/audit-verification.sh
```

Exit 0; 11.114 s. Started 2026-11-08T02:29:29.345775+00:00. Log SHA-256: `e3be96710d51601d553f9701796e9c3697a32659d3ab109e279fde172ddc0ac1`.

### adt-ci-lint-types

```sh
pnpm --filter app --filter agent --filter world --filter @vgi/commit lint
pnpm --filter app --filter agent --filter world --filter @vgi/commit typecheck
```

Exit 0; 9.113 s. Started 2026-11-08T02:29:40.482111+00:00. Log SHA-256: `14e57cca24965be909f992264f6aea3a1bed01d8c68599697a614a21123702a8`.

### adt-ci-agent

```sh
pnpm --filter agent test --maxWorkers=2
```

Exit 1; 117.734 s. Started 2026-11-08T02:29:49.619735+00:00. Log SHA-256: `c2c21c0b0f0dcf5dc995de85b830396b7950efe5ac5a97353ccb022f01cfbc50`.

### adt-ci-app

```sh
pnpm --filter app test --maxWorkers=2
```

Exit 0; 102.135 s. Started 2026-11-08T02:31:47.376995+00:00. Log SHA-256: `fcea97a1629f41cfc6dbe10baad1298db5b2d19b8f91ff53593f97264b36bfe5`.

### fresh-stack

```sh
docker stop vgi-final-20261107-commit-1 vgi-final-20261107-postgres-1 vgi-final-20261107-keycloak-1 vgi-merge-verify-postgres-1; unset DATABASE_URL; export COMPOSE_PROJECT_NAME=vgi-realism-wave1-20261107; make setup; make infra-up; node infra/scripts/wait-healthy.mjs --identity; node infra/keycloak/provision-adt.mjs
```

Exit 0; 14.739 s. Started 2026-11-08T02:33:29.512974+00:00. Log SHA-256: `4d0048a8c8ecfed87d0f44908d6e4941b041d173060990abe07f62e412852cb4`.

### adt-ci-world

```sh
pnpm --filter world exec vitest run --maxWorkers=2
```

Exit 0; 25.648 s. Started 2026-11-08T02:33:44.252999+00:00. Log SHA-256: `a25450272303de7335c8efa64a44fa865a254e6d956e8110ad1419395762008b`.

### adt-ci-realism

```sh
node --test world/realism/*.test.mjs
```

Exit 0; 6.003 s. Started 2026-11-08T02:34:09.924325+00:00. Log SHA-256: `4008edc66f679e99284e283e556101021529337124e668c2728dd0688e1d1002`.

### adt-ci-commit

```sh
pnpm --filter @vgi/commit test
```

Exit 0; 1.400 s. Started 2026-11-08T02:34:15.950663+00:00. Log SHA-256: `6ad5020713e79f6ce35d23398f915b894fe24da99a0c8183c4d25cc6a5537dbb`.

### adt-ci-scripts

```sh
node conformance/cures-probe.mjs
mapfile -t tests < <(find scripts conformance -name '*.test.mjs' ! -name 'completion-check.test.mjs' ! -name 'screen-cache-browser.test.mjs' ! -path 'scripts/ui-library/*' | sort)
node --import ./agent/node_modules/tsx/dist/loader.mjs --test --test-concurrency=2 "${tests[@]}"
```

Exit 0; 127.626 s. Started 2026-11-08T02:34:17.374310+00:00. Log SHA-256: `c7c451ca0067c71d41e4bbef900a999fa150f420b9748c46d9e505fcd3b6be07`.

### successor-worlds

```sh
python3 "$RUNNER_TEMP/successor-worlds.py"
```

Exit 1; 1.782 s. Started 2026-11-08T02:36:25.001865+00:00. Log SHA-256: `3a513436e40744c06a9cef5f5b4415baab097d022cec050392ddc60f8e841cd5`.

### adt-ci-python

```sh
python3 scripts/test-information-needs-compare.py
```

Exit 0; 0.039 s. Started 2026-11-08T02:36:26.785660+00:00. Log SHA-256: `fe008aab760eb03ccac7578e2b84665b1b50b0d7f855b17a0c7a8d039435b658`.

### adt-ci-conformance

```sh
cp -R "$TMPDIR/ci-content/programs/." programs/
EHR_CONFORMANCE_TRANSPORT=serve node conformance/index.mjs --canonical --jobs 2 --out "$TMPDIR/conformance.json"
node --test scripts/completion-check.test.mjs
python3 lean/Ehr/Check/certify.py
python3 - <<'CHECK'
import json,os,pathlib
c=json.loads((pathlib.Path(os.environ['TMPDIR'])/'conformance.json').read_text())['summary']
assert (c['targets'],c['scenarios'],c['failed'])==(15,201,0),c
r=json.loads(pathlib.Path('lean/Ehr/Check/certification-report.json').read_text())
assert (r['personaAccepted'],r['personaCount'],r['badRejected'],r['badCount'])==(15,15,23,23),r
print(c);print('15 accepted; 23 rejected')
CHECK
```

Exit 0; 215.630 s. Started 2026-11-08T02:36:26.847067+00:00. Log SHA-256: `86ea3b7a0fce11aeaadcbe44ff809da9a03b5e702feec0e6d2acd7ffa77862a6`.

### adt-ci-integration

```sh
pnpm --filter @vgi/commit test:integration
```

Exit 0; 45.420 s. Started 2026-11-08T02:40:02.502176+00:00. Log SHA-256: `bf43abe1b458fad7aa1d95924a8410177e20adbe3f47b8bfdb1e0f6400925dde`.

### adt-targeted

```sh
pnpm --filter app exec vitest run tests/adt.test.tsx --maxWorkers=2; pnpm --filter world exec vitest run test/adt.test.ts test/cli.test.ts --maxWorkers=2; cd lean; lake env lean --run Ehr/Commit/Protocol/AdtCheck.lean; lake env lean --run Ehr/Commit/Protocol/Check.lean
```

Exit 0; 96.404 s. Started 2026-11-08T02:40:47.948514+00:00. Log SHA-256: `7b44cd8069e331065666bf44c4943c9c018273318d60d4fc60a5d80a2d4674e0`.

### release-template-check

```sh
python3 - <<'CHECK'
import pathlib,json
source=pathlib.Path("/home/saithat/Projects/run-tmp/ci-content/releases")
for p in source.rglob("*.json"):assert json.loads(p.read_text())==json.loads((pathlib.Path("releases")/p.relative_to(source)).read_text()),str(p)
print("All 21 release templates/specifications match native exports; six MAR labels refreshed.")
CHECK
python3 lean/Ehr/Check/certify.py
```

Exit 0; 45.324 s. Started 2026-11-08T02:43:04.481948+00:00. Log SHA-256: `56c23cb8c344f2d8be2e787ac0e434b740abf8df27311ca8106a3d93fecf2543`.

### turnover-targeted

```sh
pnpm --filter world lint; pnpm --filter world typecheck; pnpm --filter world exec vitest run test/adt.test.ts test/cli.test.ts --maxWorkers=2
```

Exit 0; 13.973 s. Started 2026-11-08T02:44:23.642574+00:00. Log SHA-256: `61f7c8f5d563637aca4584db4bddaa45b5962fdf2bc6a7d019463cbfe2da072b`.

### successor-worlds-fixed

```sh
python3 "$RUNNER_TEMP/successor-worlds.py"
```

Exit 0; 26.588 s. Started 2026-11-08T02:44:44.650164+00:00. Log SHA-256: `cf681b3b178b3fe73dc6c890078d02a851dc4f6ab89807c9087e5d6b7647a63a`.

### mar-ui-lint-types

```sh
pnpm --filter app lint; pnpm --filter app typecheck; pnpm --filter app exec vitest run tests/mar-session.test.ts tests/adt.test.tsx --maxWorkers=2
```

Exit 0; 11.623 s. Started 2026-11-08T02:45:31.968042+00:00. Log SHA-256: `b186e346ccb9208917f57f074db6f87f22d571e90ee749f06768227aa3ae617f`.

### rebuilt-assets

```sh
cd lean; lake build 2>&1 | tee "$TMPDIR/lean-build.log"; if rg "warning:.*(sorry|declaration uses)" "$TMPDIR/lean-build.log"; then exit 1; fi; lake exe gents; cd ..; JOBS=6 EM_CACHE="$TMPDIR/fingerprint-em-cache" make wasm; node scripts/wasm-assets.mjs; pnpm --filter app build; cat app/dist/build.json
```

Exit 0; 22.169 s. Started 2026-11-08T02:46:00.751033+00:00. Log SHA-256: `66a321c4baf1fc5698e47971126eea777b9f32b270042d7b4cee834ae8a6f980`.

### mar-adt-preflight

```sh
PLAYWRIGHT_JSON_OUTPUT_NAME="$RUNNER_TEMP/mar-adt-preflight-playwright.json" DATABASE_URL=postgres://vgi:vgi-dev-only@127.0.0.1:55532/vgi_commit COMMIT_INTERNAL_URL=http://127.0.0.1:8091 MAR_E2E=1 ADT_E2E=1 APP_TEST_PREVIEW=1 flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off pnpm --filter app exec playwright test mar-service.spec.ts adt-service.spec.ts --project=desktop --workers=1 --reporter=list,json
```

Exit 1; 188.877 s. Started 2026-11-08T02:46:23.286966+00:00. Log SHA-256: `781958386b60108da0abc9659e9dea9bfd39c6aad6b67efcadc102841cd3b221`.

### mar-notification-regression

```sh
pnpm --filter app lint; pnpm --filter app typecheck; pnpm --filter app exec vitest run tests/mar-session.test.ts --maxWorkers=2; pnpm --filter app build; node scripts/wasm-assets.mjs; cat app/dist/build.json
```

Exit 0; 20.454 s. Started 2026-11-08T02:50:46.142945+00:00. Log SHA-256: `1f0bc78f173f2949878ed0e2bbba9e931b8e95043c4930eca803cb4e8f37d61a`.

### mar-adt-preflight-fixed

```sh
PLAYWRIGHT_JSON_OUTPUT_NAME="$RUNNER_TEMP/mar-adt-preflight-fixed-playwright.json" DATABASE_URL=postgres://vgi:vgi-dev-only@127.0.0.1:55532/vgi_commit COMMIT_INTERNAL_URL=http://127.0.0.1:8091 MAR_E2E=1 ADT_E2E=1 APP_TEST_PREVIEW=1 flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off pnpm --filter app exec playwright test mar-service.spec.ts adt-service.spec.ts --project=desktop --workers=1 --reporter=list,json
```

Exit 0; 20.642 s. Started 2026-11-08T02:51:17.728998+00:00. Log SHA-256: `128604afb8a1d71cb008a1865ed7cb0457e62a901d8808a7f828b2e75ed7acf5`.

### final-setup

```sh
node --version; pnpm --version; /usr/bin/node --version; command -v bwrap; lean --version; "$HOME/.elan/bin/elan" toolchain install "$(cat lean/lean-toolchain)"; pnpm install --frozen-lockfile
```

Exit 0; 1.098 s. Started 2026-11-08T02:53:18.791026+00:00. Log SHA-256: `bab58e2002f1653d994d3fe33611a891743e385dc45f7426520ea887ca1bb4ce`.

### final-ci-inputs

```sh
cd lean
lake env lean --run Ehr/Tools/ExportContent.lean "$TMPDIR/ci-content"
lake env lean --run ../services/commit/test/Fixture.lean > "$TMPDIR/commit-fixture.json"
tar -czf "$TMPDIR/ehr-test-inputs.tar.gz" -C "$PWD/.lake/build/bin" ehr -C "$TMPDIR" ci-content/programs commit-fixture.json
cd ..
bash scripts/audit-verification.sh
```

Exit 0; 10.874 s. Started 2026-11-08T02:53:19.927720+00:00. Log SHA-256: `e3be96710d51601d553f9701796e9c3697a32659d3ab109e279fde172ddc0ac1`.

### final-ci-artifact-roundtrip

```sh
tar -xzf "$TMPDIR/ehr-test-inputs.tar.gz" -C "$TMPDIR"; cmp "$TMPDIR/ehr" lean/.lake/build/bin/ehr; install -D -m 755 "$TMPDIR/ehr" lean/.lake/build/bin/ehr; mkdir -p runs
```

Exit 0; 0.429 s. Started 2026-11-08T02:53:30.824863+00:00. Log SHA-256: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.

### final-ci-lint-types

```sh
pnpm --filter app --filter agent --filter world --filter @vgi/commit lint
pnpm --filter app --filter agent --filter world --filter @vgi/commit typecheck
```

Exit 0; 9.103 s. Started 2026-11-08T02:53:31.276680+00:00. Log SHA-256: `14e57cca24965be909f992264f6aea3a1bed01d8c68599697a614a21123702a8`.

### final-ci-agent

```sh
pnpm --filter agent test --maxWorkers=2
```

Exit 0; 117.202 s. Started 2026-11-08T02:53:40.401328+00:00. Log SHA-256: `5d85fbcc526f3a26087c1258fe232e70e48c49c755da13dec3e87f376607e2b4`.

### final-ci-app

```sh
pnpm --filter app test --maxWorkers=2
```

Exit 0; 102.253 s. Started 2026-11-08T02:55:37.625213+00:00. Log SHA-256: `53540a1dbf0f13bf3a80a243b51b571bfdeb4214788aad2c5663cf3be3b826fa`.

### final-ci-world

```sh
pnpm --filter world exec vitest run --maxWorkers=2
```

Exit 0; 25.953 s. Started 2026-11-08T02:57:19.901805+00:00. Log SHA-256: `a4583fac88bd367206721cccb92d0f4be4768904bec0b63d6a97a114cba94617`.

### final-ci-realism

```sh
node --test world/realism/*.test.mjs
```

Exit 0; 5.935 s. Started 2026-11-08T02:57:45.878153+00:00. Log SHA-256: `f8a19287ebedf392216a152d43ff6db50b8113836098fb4a31db147084902b39`.

### final-ci-commit

```sh
pnpm --filter @vgi/commit test
```

Exit 0; 1.407 s. Started 2026-11-08T02:57:51.836150+00:00. Log SHA-256: `8c1d258d779297d44e241edb57276c1f93d1f11e5c912ca0d80211d003806ba4`.

### final-ci-scripts

```sh
node conformance/cures-probe.mjs
mapfile -t tests < <(find scripts conformance -name '*.test.mjs' ! -name 'completion-check.test.mjs' ! -name 'screen-cache-browser.test.mjs' ! -path 'scripts/ui-library/*' | sort)
node --import ./agent/node_modules/tsx/dist/loader.mjs --test --test-concurrency=2 "${tests[@]}"
```

Exit 0; 127.586 s. Started 2026-11-08T02:57:53.265887+00:00. Log SHA-256: `8a41b6147bedfa87a5f8c446d8b40a7786c5ae87bd2b82dcb4c345b494cf8ba4`.

### final-ci-python

```sh
python3 scripts/test-information-needs-compare.py
```

Exit 0; 0.038 s. Started 2026-11-08T03:00:00.873689+00:00. Log SHA-256: `fe008aab760eb03ccac7578e2b84665b1b50b0d7f855b17a0c7a8d039435b658`.

### final-ci-conformance

```sh
cp -R "$TMPDIR/ci-content/programs/." programs/
EHR_CONFORMANCE_TRANSPORT=serve node conformance/index.mjs --canonical --jobs 2 --out "$TMPDIR/conformance.json"
node --test scripts/completion-check.test.mjs
python3 lean/Ehr/Check/certify.py
python3 - <<'CHECK'
import json,os,pathlib
c=json.loads((pathlib.Path(os.environ['TMPDIR'])/'conformance.json').read_text())['summary']
assert (c['targets'],c['scenarios'],c['failed'])==(15,201,0),c
r=json.loads(pathlib.Path('lean/Ehr/Check/certification-report.json').read_text())
assert (r['personaAccepted'],r['personaCount'],r['badRejected'],r['badCount'])==(15,15,23,23),r
print(c);print('15 accepted; 23 rejected')
CHECK
```

Exit 0; 214.058 s. Started 2026-11-08T03:00:00.933594+00:00. Log SHA-256: `c7d48d8898a7f0d3c47f323b9b63bff4cdd7de1ba4740a9a9587c887ba3e2925`.

### semantic-fixtures

```sh
node scripts/refresh-clinical-fixtures.mjs; git diff HEAD --exit-code -- app/src/fixtures
```

Exit 0; 291.942 s. Started 2026-11-08T03:03:34.993865+00:00. Log SHA-256: `8002feb32f6ccbc22c5ace56dc274f3a06eaa2be22f2ae1c669faf60a096360b`.

### final-ci-integration

```sh
DATABASE_URL=postgres://vgi:vgi-dev-only@127.0.0.1:55532/vgi_commit COMMIT_PROTOCOL_TRACE_KEEP=1 pnpm --filter @vgi/commit test:integration
```

Exit 0; 47.565 s. Started 2026-11-08T03:08:26.937327+00:00. Log SHA-256: `c8fef4d23231724ee4040a3592d8e08149edfa53a5470b06580747f2aa7a0803`.

### proofs-final

```sh
bash scripts/audit-verification.sh
make verify
cd lean
lake build
lake build $(cat ../scripts/proof-map/extra-modules.txt)
for file in Ehr/Commit/Mar.lean Ehr/Commit/Adt.lean Ehr/Commit/Protocol/Proofs.lean Ehr/Commit/Protocol/Cache.lean Ehr/Commit/Protocol/AdtProofs.lean Ehr/Commit/Protocol/LockOrder.lean; do lake env lean "$file"; done
lake env lean "$RUNNER_TEMP/ui-axioms.lean"
lake env lean --run Ehr/Commit/Protocol/Check.lean
lake env lean --run Ehr/Commit/Protocol/AdtCheck.lean
lake build completion-bench ui-layout ui-port-audit
lake env lean --run Ehr/Render/ExportTests.lean "$RUNNER_TEMP/wasm-api"
cd ..
scripts/proof-map/build.sh --check-readme "$RUNNER_TEMP/final-proof-map"
lean/.lake/build/bin/completion-bench "$PWD" "$RUNNER_TEMP/completion-bench"
```

Exit 0; 161.226 s. Started 2026-11-08T03:09:14.530342+00:00. Log SHA-256: `b0eae281e855edebe8d2272ff7035e3866e2325dc4eac717a6c8f8025a1d94d4`.

### trace-adt

```sh
pnpm --filter @vgi/commit check:adt-trace /home/saithat/Projects/run-tmp/adt-model-trace-YUEDjx/trace.jsonl
```

Exit 0; 14.100 s. Started 2026-11-08T03:11:55.759984+00:00. Log SHA-256: `ee660c777c96221c9b8f3295dc63ae8dc5ddad766a63e21d894d8016d2d3d286`.

### targeted-mar-physical

```sh
python3 "$RUNNER_TEMP/targeted-mar.py"
```

Exit 0; 17.352 s. Started 2026-11-08T03:12:09.861218+00:00. Log SHA-256: `c41002ef70a67a4dadbecf2ba46ccdd331f4f6735928e79af4389a43acfd7d3e`.

### native-wasm

```sh
flock "$TMPDIR/vgi-browser-heavy.lock" python3 "$RUNNER_TEMP/wasm-shards.py"
```

Exit 0; 625.493 s. Started 2026-11-08T03:12:27.214496+00:00. Log SHA-256: `0363fcfa6aeb7bda36e0fe288c43c6968e7d7eb203a1ebe0599cfe51b06ef280`.

### trace-clinical-adt

```sh
pnpm --filter @vgi/commit check:adt-trace /home/saithat/Projects/run-tmp/clinical-adt-trace-4OpPJs/trace.jsonl
```

Exit 0; 1.280 s. Started 2026-11-08T03:22:52.709006+00:00. Log SHA-256: `d4f55fdaf06be235f96a33b663006d7d0d828e34ddb391134963ba71bba9cc0f`.

### ui-final

```sh
node --test scripts/ui-library/native.test.mjs scripts/ui-library/family.test.mjs scripts/ui-library/structural.test.mjs scripts/ui-library/program.test.mjs scripts/ui-library/fonts.test.mjs
node scripts/ui-library/port-audit.mjs --all-screens
flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off pnpm --filter app exec playwright test --config src/browser/ui-library/playwright.config.ts
flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off node --test scripts/screen-cache-browser.test.mjs
```

Exit 0; 175.610 s. Started 2026-11-08T03:22:53.990064+00:00. Log SHA-256: `5c2017a60d3ee688682d5cf68301f489b373181149982b5adb988755a680a0bd`.

### trace-protocol

```sh
pnpm --filter @vgi/commit check:trace /home/saithat/Projects/run-tmp/commit-model-trace-x7VAS9/trace.jsonl
```

Exit 0; 1.336 s. Started 2026-11-08T03:25:49.601249+00:00. Log SHA-256: `6b125938923198ab213ca58c058a044221017a7245b8947aa035193425989862`.

### recertification

```sh
flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off node scripts/migrate-neutral-terms.mjs --recertify-only --runs core-10day
```

Exit 0; 11811.795 s. Started 2026-11-08T03:26:22.789261+00:00. Log SHA-256: `569e68b65b9d3b411acddc757181d3f1d59872eab3eab7fb20342b8e8045323e`.

### preserved-inputs-after-recert

```sh
python3 "$RUNNER_TEMP/integrity.py" after
```

Exit 0; 0.760 s. Started 2026-11-08T06:43:16.359407+00:00. Log SHA-256: `b508897ee3d7fa0d84a7b3dd228e9bcfd05b09a40be9564cabd563b2fcdf7f96`.

### live-load

```sh
unset DATABASE_URL
export COMPOSE_PROJECT_NAME=vgi-realism-wave1-20261107
make load SYNTHETIC_HOSPITAL=1
docker compose --env-file .env -f infra/docker-compose.yml --profile app up -d commit
node infra/scripts/wait-healthy.mjs
```

Exit 0; 28.043 s. Started 2026-11-08T06:43:17.159848+00:00. Log SHA-256: `f69120765a4aff4c4c489609616a3137da4aadf92facd66423a622424bc146d7`.

### neutral-screenshots

```sh
PLAYWRIGHT_JSON_OUTPUT_NAME="$RUNNER_TEMP/neutral-playwright.json" NEUTRAL_SHOTS=1 APP_TEST_PREVIEW=1 flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off pnpm --filter app exec playwright test neutral-shots.spec.ts --grep 'regenerate neutral clinical screenshots' --project=desktop --workers=1 --reporter=list,json
```

Exit 0; 18.740 s. Started 2026-11-08T06:43:45.227145+00:00. Log SHA-256: `cf13ddf789076827c2d70d3f72f3d1eb157d7f0fbfaad979be78e9ab73f99310`.

### desktop

```sh
unset DATABASE_URL
PLAYWRIGHT_JSON_OUTPUT_NAME="$RUNNER_TEMP/desktop-playwright.json" APP_TEST_PREVIEW=1 AUDIT_RUN=core-10day flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off pnpm --filter app exec playwright test --project=desktop --workers=1 --reporter=list,json
python3 "$RUNNER_TEMP/check-desktop.py"
```

Exit 0; 620.247 s. Started 2026-11-08T06:44:03.991319+00:00. Log SHA-256: `0da57e5cb3c95b62dd99f51cc00f4b67f0d41384d7c85e5f3c9b87dc72f311ce`.

### mar-adt

```sh
PLAYWRIGHT_JSON_OUTPUT_NAME="$RUNNER_TEMP/mar-adt-playwright.json" DATABASE_URL=postgres://vgi:vgi-dev-only@127.0.0.1:55532/vgi_commit COMMIT_INTERNAL_URL=http://127.0.0.1:8091 MAR_E2E=1 ADT_E2E=1 APP_TEST_PREVIEW=1 flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off pnpm --filter app exec playwright test mar-service.spec.ts adt-service.spec.ts --project=desktop --workers=1 --reporter=list,json
```

Exit 0; 20.496 s. Started 2026-11-08T06:54:24.263026+00:00. Log SHA-256: `678010feb08b15a042d475e6a9d9b5f206bb9ccccfd553837e08e0cf937430d5`.

### dashboard-shots

```sh
flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off node "$RUNNER_TEMP/refresh-dashboard.mjs"
```

Exit 0; 9.322 s. Started 2026-11-08T06:54:44.783586+00:00. Log SHA-256: `0087b09f48493cade1d64981217744029fe1902412fa62229073aed766517be8`.

### audit-templates

```sh
export EHR_SCREEN_CACHE_DIR="$RUNNER_TEMP/full-audit-cache"
flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off node scripts/audit-alert-policy.mjs "$RUNNER_TEMP/audit-templates"
```

Exit 0; 1732.888 s. Started 2026-11-08T06:55:30.282833+00:00. Log SHA-256: `cccbdeaeb50be2a4f5ec1edfb59a6162384b1bae7d0170c93491c244f3533d5d`.

### audit-personas

```sh
export EHR_SCREEN_CACHE_DIR="$RUNNER_TEMP/full-audit-cache"
flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off node scripts/audit-alert-policy.mjs "$RUNNER_TEMP/audit-personas" --personas
```

Exit 0; 852.351 s. Started 2026-11-08T07:24:23.199566+00:00. Log SHA-256: `27f57c50156b602254996736f2fc938e096c06a8a88d6d46daf5d1d6b23bd520`.

### final-readme-proof-map

```sh
scripts/proof-map/build.sh --check-readme "$RUNNER_TEMP/readme-proof-map"
```

Exit 0; 13.290 s. Started 2026-11-08T07:39:12.154593+00:00. Log SHA-256: `59bb67028a3332678a656c08041995aef1ab730393a3ced51c90673e401d21bf`.

### final-integrity

```sh
bash "$RUNNER_TEMP/final-integrity.sh"
```

Exit 0; 769.131 s. Started 2026-11-08T07:39:41.408378+00:00. Log SHA-256: `401c68051db9360aacdd481ae193d7cc7e255682d54d1c2970732fd027c241ee`.

### cleanup-test-db

```sh
docker rm -f vgi-realism-wave1-postgres-20261107
```

Exit 0; 0.441 s. Started 2026-11-08T07:52:30.541269+00:00. Log SHA-256: `b4a3ea7e1003309b53852ed63276944bfc8cfa5ea656a760d0447f723716f504`.

[Machine-readable receipts, hashes, bounded/replay evidence and verification harness sources](realism-wave1-verification-20261107.json).
