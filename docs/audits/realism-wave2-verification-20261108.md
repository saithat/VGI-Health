# Realism wave 2 verification — 2026-11-08

Reviewed code: `680199218f9e8e144bb6f4981b0dd9657e432c60`. Work stayed on `main`; nothing was pushed. The documentation/capture commit follows the code commits listed below.

## Changes

- `687224f9` — Add continuous clinician workload scheduling and measurements.
- `f7c6160e` — Add typed interrupting work and owned clinical resumption.
- `9bf43dff` — Integrate interruption service with the shared workload clock.
- `4aecb520` — Run host trace refinement through the shipped native binary.
- `2d77e20d` — Align interruption and workload headline measurement days.
- `3ffe60e7` — Bind offline remeasurements to their successor world and source recording.
- `88b523db` — Separate clinical documentation endpoints from closure work.
- `d30711a9` — Preserve readable review identity for offline measurement copies.
- `f7b10652` — Withhold copied day fences until offline remeasurement completes.
- `0f1914d4` — Describe workload time use accurately in trajectory evidence.
- `232a7913` — Hash retained evidence without duplicating canonical JSON.
- `3e497c1b` — Capture workspace activity geometry from its scheduled sample.
- `a9d27384` — Exercise recorded layouts within their frozen conformance contracts.
- `68019921` — Check recorded pixel deltas in trajectory comparison regressions.

Communication, clinical work and paid reorientation share one serial clinician clock. Source arrivals remain exogenous; actual owned suspension/return timestamps populate workload measurements. Clinical documentation endpoints precede unrelated closure communication, and passive waiting is excluded from active effort/overtime. All 19 theorem statements from the two source implementations are retained verbatim. Four additional scheduler lemmas preserve clock bounds, durations and annotations. Protected clinical definitions and statements are unchanged.

Simulation-only types now generate separately from the byte-identical clinical TypeScript module. All app source edits stay under `app/src/dashboard`; packaged WASM and its manifest are refreshed separately. The clinical app hash is unchanged.

## Build binding

- App SHA-256: `030fac6d782d07099213018114de92b4facd19952201e094b4c3890e7edfef60`.
- Native SHA-256: `750e9833da4f1ac8373455de911334f6afdb7802bce95822d657b454a9b430d0`.
- WASM SHA-256: `8243fe67892e6af89ab42ba53b8d1fcd5deed929e242a607f7a96a507cbf9a30`.
- Lean source manifest: `821d62993be8eb9af8594e68f965c51a92ccf3f6a7d73ae927b0955e2fd3eacb`.

## Verification

All executable local CI checks passed. The unit, conformance and commit-integration checks ran with Elan removed from `PATH`; the shipped native binary supplies protocol/ADT trace checking. Final counts: 216 agent tests, 349 app tests, 108 world tests plus two toolchain-only skips, five realism tests, ten commit units, 75 script/conformance units, two Python tests and 58 integration tests. The 14 Lean-bound world tests passed in the Lean environment. Canonical conformance: 15 targets × 201 scenarios, 1,584 pass, zero fail, 1,431 inapplicable. Certification: 15 acceptances, 23 intended rejections.

The default build, all three Comparator challenges, explicit axiom checks, proof-map `--check-readme`, completion benchmark and bounded protocol/ADT explorations passed. Only `propext`, `Classical.choice` and `Quot.sound` occur in audited theorem dependencies. No proof placeholder or new axiom was introduced. The existing isolated Comparator statement challenges retain their intentional placeholders; ordinary proof builds/audits exclude them.

The scheduling, combined-clock and resumption modules re-executed 106 explicit guards, including the 4,096-case scheduler envelope. The protocol checker exhausted 21,393 transaction states and 81 cache states. ADT exhausted 33,467 transaction states / 244,133 transitions across 27 scenarios, plus 1,257 reducer boards / 11,728 accepted edges. Unsafe controls were detected. Native trace witnesses cover 23 protocol, 331 ADT and eight mixed clinical/ADT attempts. These are bounded exploration and transaction-linearized refinement tests, not host/SQL/FHIR or liveness proofs.

Native/WASM differential verification passed all 897 render variants and the 324-bundle corpus, including canonical screen bytes and fingerprints. All-screen port audit: 186 paths, 113 programs, 118 contexts; 3,468/3,468 geometry/G9 checks and 7,944/7,944 structural probes. The 21 native/font and seven browser UI-library tests passed. Painter differential: 228 boxes, 153 text lines, 6,861 intrinsic glyph advances; worst deviation 0 CSS px. Browser cache equivalence/negative controls passed.

Fresh-stack integration independently passed 58/58 tests. Desktop, MAR/ADT, dashboard captures and full audits are recorded below and in the machine-readable receipt.

### Final commands and wall time

Browser command wall times include shared-lock waiting; inner audit receipts separately retain active elapsed time. Independent control trajectory verification and real-work measurement overlapped after the recording inputs were frozen. Each measurement run remained serial; browser work retained the shared lock. Read-only live tests against the finalized control also overlapped the remaining real-work replay; publication waited for both.

| Check | Exit | Seconds |
|---|---:|---:|
| ci-setup | 0 | 1.488 |
| compare-pixel-regressions | 0 | 60.245 |
| test-provenance-refresh | 0 | 1.633 |
| native-measurement-invariants | 0 | 5.033 |
| physical-measurement-coverage | 0 | 1.037 |
| real-work-prefix | 0 | 0.072 |
| geometry-cache-seeding | 0 | 0.857 |
| conformance-boundary-regressions | 0 | 144.777 |
| conformance-frozen-spec-regressions | 0 | 1.394 |
| conformance-retained-regressions | 0 | 34.114 |
| conformance-ci-scripts | 0 | 142.592 |
| conformance-ci-matrix | 0 | 241.824 |
| scheduler-resumption-cases | 0 | 1.700 |
| digest-regression | 0 | 9.250 |
| digest-ci-agent | 0 | 121.904 |
| digest-ci-scripts | 0 | 135.672 |
| successor-worlds | 0 | 27.770 |
| frozen-endpoint-smokes | 0 | 22.840 |
| interruption-smoke | 0 | 3.089 |
| trajectory-clock-label | 0 | 6.861 |
| frozen-build | 0 | 18.387 |
| frozen-proofs | 0 | 206.566 |
| frozen-ci-lint-types | 0 | 9.934 |
| frozen-ci-agent | 0 | 122.458 |
| frozen-ci-app | 0 | 109.156 |
| frozen-ci-world | 0 | 11.385 |
| frozen-ci-realism | 0 | 6.122 |
| frozen-ci-commit | 0 | 1.432 |
| publication-ci-scripts | 0 | 142.775 |
| frozen-ci-python | 0 | 0.043 |
| frozen-ci-conformance | 0 | 249.717 |
| frozen-ci-integration | 0 | 41.850 |
| fresh-stack-integration | 0 | 40.771 |
| frozen-native-wasm | 0 | 694.923 |
| frozen-legacy-all | 0 | 1024.233 |
| frozen-ui-native | 0 | 146.206 |
| frozen-ui-browser | 0 | 11062.757 |
| frozen-information-needs | 0 | 53.240 |
| frozen-information-pixels | 0 | 11023.855 |
| information-pixels-workspace | 0 | 46.889 |
| information-pixels-types | 0 | 1.990 |
| frozen-recertification | 0 | 664.757 |
| frozen-protected-inputs | 0 | 0.670 |
| core-conformance | 0 | 490.060 |
| core-report | 0 | 23.504 |
| core-derived | 0 | 641.056 |
| realism-wave2-workload-control-measure | 0 | 3143.137 |
| realism-wave2-workload-control-report | 0 | 23.554 |
| realism-wave2-workload-control-derived | 0 | 2348.582 |
| realism-wave2-real-work-measure | 0 | 2299.153 |
| realism-wave2-real-work-report | 0 | 23.862 |
| realism-wave2-real-work-derived | 0 | 2381.944 |
| measurement-invariants | 0 | 5.755 |
| live-load | 0 | 29.088 |
| neutral-screenshots | 0 | 18.906 |
| desktop | 0 | 688.795 |
| desktop-required | 0 | 0.022 |
| mar-adt | 0 | 20.238 |
| dashboard-shots | 0 | 16.498 |
| audit-templates | 0 | 1764.155 |
| audit-personas | 0 | 877.553 |
| final-readme-proof-map | 0 | 15.392 |
| final-integrity | 0 | 842.238 |
| cleanup-test-db | 0 | 0.891 |

The complete canonical plus retained-revision conformance matrix passed 48 targets × 201 scenarios: 5,088 pass, zero fail and 4,560 explicitly inapplicable.

## Measurements and controls

`runs/core-10day` retains frozen world 2 and the paired legacy-clock/fixed-cost protocol. All 33 layout bindings passed recertification; actual/canonical/no-agent plus train/validation outputs comprise 200 remeasurements. Both saved and regenerated replay have zero mismatches. No layout choices or model responses were regenerated.

Across all ten-day actual/canonical/no-agent native schedules, **150 outputs / 3852 task attempts** are byte-identical to the pre-merge binary with `--clock-mode legacy --interruptions fixedCost`. This compares complete native output bytes. Browser-derived geometry is refreshed evidence rather than an archived-byte claim. A separate comparison against the originally saved enriched measurements preserves all native fields in 146/150 files. Exactly four old canonical/no-agent captures (P3 days 2 and 10) change from held to refused, applying the pre-existing legacy patient-refusal decoding already present in the pre-merge binary. All other native fields, including costs and timestamps, are unchanged. Original enriched files remain backed up locally.

The recording gate took 107.37 minutes. The original complete recertification worker exited during final hashing after 198.21 minutes; corrected finalization took 11.08 minutes. The completed gate and replay checks were retained, not repeated. The original command, failed result and log digest are included in the recovery evidence.

The missing no-agent program sidecars were recovered by exact recorded `geometry.programHash` matches to historical tracked release templates, with recorded identity/version/spec restored and the existing terminology migration applied. No layout was guessed. The recovery hash/provenance inventory is in the JSON receipt. Frozen programs/spec/canonical/previous inputs, all 252 world 1/2 files, 50 schedules and 45 decision records are preserved; the latter three inventories are byte-checked against the prior verification snapshot.

New local-only ten-day worlds: `runs/world/realism-wave2-seed-1`, `-2`, `-3`. Each was generated twice with byte-identical files. Frozen worlds 1/2 were never regenerated in place.

The two successor experiments reuse recorded layout choices on the same seed-1 source tasks:

- `runs/realism-wave2-workload-control`: shared workload clock + fixed-cost interruptions.
- `runs/realism-wave2-real-work`: shared workload clock + typed interruption work, the new default.

Both are explicitly `OFFLINE`, source-digest-bound fixed-layout remeasurements, with zero model calls. Actual, canonical, no-agent, train and validation outputs use separate actor memories and the declared blind/calibration partitions. Summaries, trajectories and three same-task canonical controls per run were regenerated. The archived cohort and successor cohort differ; cross-cohort totals are not causal estimates of the clock change. The matched successor pair isolates the interruption-model difference under one source workload.

Headline partition: blind even days (2, 4, 6, 8, 10), all five clinicians, actual layout arm. Completion and incomplete tasks remain in the denominator. Legacy queue/shift and typed-service metrics are unavailable; absence is never reported as a measured zero.

| Recording | Completed/tasks | Mean queue delay (min) | Overdue doses | Active overtime (min) | Typed handled/offered | Reorientation (min) | Mean return delay (s) |
|---|---:|---:|---:|---:|---:|---:|---:|
| core-10day | 626/630 | Unavailable | Unavailable | Unavailable | Not modeled separately | Not modeled separately | Unavailable |
| realism-wave2-workload-control | 660/662 | 1.19 | 2 | 0.00 | Not modeled separately | Not modeled separately | Unavailable |
| realism-wave2-real-work | 660/662 | 1.73 | 2 | 0.00 | 661/661 | 15.22 | 73.31 |

The matched real-work arm adds 0.541 minutes (32.45 seconds) of mean queue delay, with unchanged overdue doses, active overtime and carried tasks. It handles 661/661 offered interruptions (181 deferred), taking 510.75 active communication minutes and 999.06 passive waiting minutes. Its 93 returns cost 15.22 minutes of reorientation; mean suspension-to-return delay is 73.31 seconds.

Successor geometry measurement reused completed cache entries only when browser executable/version, renderer/capture sources, fonts, app hash, UI-tree bytes and compiled presentations matched the existing cache keys. Missing entries still captured in Chromium. The cache-seeding receipt records 5,609 atomically copied entries, 1,517 existing entries retained and zero differing existing entries; native simulation outputs and run modes were recomputed.

All 600 measurement files retain physical geometry for every task attempt (13,742 across full-day, train and validation arms): zero missing pointer targets and zero unavailable pointer/scroll measurements. Queue/typed-service metadata remains explicitly unavailable in the legacy control.

Incomplete fixed-layout attempts remain in the denominator and are inventoried in the JSON receipt. For example, in the successor fixed-cost control, day 5 P5 actual/no-agent complete 13/17 tasks versus canonical 17/17: the recorded revision lacks the optional imaging/procedure controls needed by four source tasks. No historical layout choice or goal was rewritten to erase these gaps.

The fixed-cost model embeds wait/think operators and has no separate typed return-cost measurement. The real-work model reports communication and reorientation explicitly. Passive fixed-exposure waits advance the queue but do not count as active overtime or KLM work. Overdue-dose counts use documentation/window endpoints, including held/refused outcomes; they are not observed bedside administration times. Rate/exposure/triage/closure assumptions remain uncalibrated. Per-persona values, all-day totals, paired deltas, completion and frame accounting are retained in the JSON receipt.

## Browser evidence

Desktop: 183 passed, 21 opt-in skips, 0 failed and 0 flaky. All 44 required live/dashboard cases passed. Explicit MAR/ADT ran against real Postgres/Keycloak without mocked clinical responses. Dashboard captures use 1440×900 and include legacy unavailable labels plus real queue, overdue-dose, overtime, interruption and resumption metrics; rendered workload cells are checked against blind-day raw measurements.

| Full audit | Trees | Physical measurements | Findings |
|---|---:|---:|---:|
| templates | 1826 | 16434 | 0 |
| personas | 1296 | 11664 | 0 |

The full pair ran once, templates then personas, sequentially under the shared browser lock, with a fresh cache root. Controls passed. Earlier targeted gates and the required recording recertification are separate from this pair.

## Resolved issues and scope

- Shared-clock integration fixes source-arrival drift, service-boundary urgency, fractional starts, actual suspension timestamps, passive overtime accounting, documentation endpoints and future-arrival handover chronology.
- Type generation initially changed runtime clinical enum bytes; separating simulator augmentation preserves the certified app hash.
- Retained evidence hashing exhausted the default Node heap after the complete recording gate/replay. Incremental canonical hashing preserves the exact byte protocol; finalization recovered completed evidence from disk and the original execution log, without repeating the gate.
- Host trace adapters required a Lean toolchain at runtime; both now invoke the shipped native model checkers. The archive-only world boundary probe runs in the Lean CI job and skips explicitly without a toolchain.
- Offline copies now validate successor seed/day/clinician coverage, refresh fingerprints, use repository-relative paths and carry truthful offline/source labels. Copied decision review IDs are rebound while source identity and historical evidence remain intact.
- Retained-revision conformance revealed seven colocated link fixtures requiring a real screen revisit, 20 frozen specs without the later critical-result alert and eight absent optional service surfaces. The runner now records frozen-spec provenance separately from release-name aliases. Current alert obligations, exact link assertions and negative controls for incomplete features remain enforced.
- Targeted information-needs capture selected a clinical-home variant for an unselected workspace activity. Native schedule-day variants now supply workspace geometry; all 30 paired tasks complete, 150 screen-state occurrences are captured and no target is missing.
- Fresh saved controls acquired complete geometry; a browser test still hard-coded pixel scrolling as unavailable. It now compares both pixel metrics with persisted entries and checks unavailable values through an explicit missing-metadata fixture. Only `fingerprints.screenTests` changed after measurement; native/runtime/world/fixture/release fingerprints were asserted unchanged. Prior manifests and digest inventories are retained locally, successor `sourceContentDigest` values retain the historical source identity, and final integrity independently recomputes every recording file and outer digest.
- Both dashboard realism summaries use the same blind even-day partition.
- Early recertification attempts were stopped when source fixes required rebuilding; their incomplete/pending evidence is not counted as final success. One conformance attempt overlapped native relinking and was rerun after the build froze. An extra retained-revision matrix was stopped after its first target because it lacked CI’s persistent native transport, then restarted with EHR_CONFORMANCE_TRANSPORT=serve. One proof audit overlapped a commit and was rerun with a stable HEAD. An explicit MAR/ADT attempt stopped in setup because COMMIT_FIXTURE was omitted; the rerun used the already generated native fixture. All final receipts are distinguished by name.

Generated public verdicts remain refreshed local data and are intentionally uncommitted; the tracked checker report and CURES receipt are refreshed verification records. No data in `runs/`, `fixtures/`, `programs/`, generated world outputs or any `verdicts.json` was staged. No push, hosted CI or Pages deployment was triggered. Existing pinned runtimes and sandbox tools were verified; host OS package/sysctl changes were unnecessary. GitHub artifact transfer was represented by an archive/extract/byte-compare/install round trip. CI Postgres used a spare host port; an independent fresh live stack used its normal port. Only identified previous VGI containers were stopped; unrelated services were left alone.

Independent night/weekend case arrivals, merging following days into extended queues, successor actor knowledge, live handoff acceptance, concurrent chart updates in the stock snapshot CLI, clinical calibration and general scheduler fairness/liveness remain outside this implementation. Existing MAR/ADT clinical policy decisions remain in the single README owner-review table.

## Owner questions

- Should extended queues merge subsequent days’ arrivals next?
- Should independent night/weekend cases and successor actor knowledge be the next increment?
- Approve the overlap, serial/nonpreemptive clinical service and documentation-time proxy assumptions?
- Approve the documented ownership, reconfirmation, discard and responsibility-handover rules?
- Approve the provisional role/setting profiles, protected-popup triage and fixed-exposure closure policy?

The requested retained legacy control plus separately labeled real-work run resolves the source interruption report’s control-selection question.

## Exact local invocations

All commands use disk-backed `TMPDIR`, `CI=true`, `LEAN_NUM_THREADS=6` and at most four browser workers; desktop/research suites use one worker. `RUNNER_TEMP` identifies this session’s evidence directory. The JSON receipt embeds the verification harness source and all development command receipts, including unsuccessful attempts; the final passing set is listed above.

### ci-setup

```sh
node --version; pnpm --version; /usr/bin/node --version; command -v bwrap; lean --version; "$HOME/.elan/bin/elan" toolchain install "$(cat lean/lean-toolchain)"; pnpm install --frozen-lockfile; tar -xzf "$TMPDIR/ehr-test-inputs.tar.gz" -C "$TMPDIR"; cmp "$TMPDIR/ehr" lean/.lake/build/bin/ehr; install -D -m 755 "$TMPDIR/ehr" lean/.lake/build/bin/ehr; mkdir -p runs
```

Exit 0; 1.488 s. Started 2026-11-08T09:08:03.917007+00:00. Elan removed from PATH: False. Log SHA-256: `1520763417a4afb1c913daf91f80d978a6aee49162a2c0c6a755061549bac992`.

### successor-worlds

```sh
python3 "$RUNNER_TEMP/successor-worlds.py"
```

Exit 0; 27.770 s. Started 2026-11-08T09:10:25.171791+00:00. Elan removed from PATH: False. Log SHA-256: `86cbb57c749fd8ea9e921bcefa6fce08cadf3687359b0120be23bd1df90b89ca`.

### frozen-build

```sh
cd lean; lake build 2>&1 | tee "$TMPDIR/lean-build.log"; if rg "warning:.*(sorry|declaration uses)" "$TMPDIR/lean-build.log"; then exit 1; fi; lake exe gents; cd ..; git show 75d26d4f:lean/generated/ehr-types.ts > "$RUNNER_TEMP/clinical-types-before.ts"; cmp "$RUNNER_TEMP/clinical-types-before.ts" lean/generated/ehr-types.ts; JOBS=6 EM_CACHE="$TMPDIR/fingerprint-em-cache" make wasm; node scripts/wasm-assets.mjs; pnpm --filter app build; node conformance/cures-probe.mjs; cat app/dist/build.json; git diff --check
```

Exit 0; 18.387 s. Started 2026-11-08T09:58:16.006675+00:00. Elan removed from PATH: False. Log SHA-256: `9428eb136372ac2736244fa8f2ed34a396d6272f41e7efcfdb0f55780e45d167`.

### interruption-smoke

```sh
python3 "$RUNNER_TEMP/interruption-smoke.py"
```

Exit 0; 3.089 s. Started 2026-11-08T09:59:07.032052+00:00. Elan removed from PATH: False. Log SHA-256: `35ce184b7d12ae88cfb9919551b36fbd02ff6c34c3efa30ce73f24dcee5e066d`.

### frozen-ci-lint-types

```sh
if command -v lean; then echo "Unexpected Lean on PATH"; exit 1; fi
pnpm --filter app --filter agent --filter world --filter @vgi/commit lint
pnpm --filter app --filter agent --filter world --filter @vgi/commit typecheck
```

Exit 0; 9.934 s. Started 2026-11-08T10:05:36.183770+00:00. Elan removed from PATH: True. Log SHA-256: `663a25b7bd1a21de83c0ba891364a070c2bb03fa0f9fcfd50fbc4e2596bb9aa9`.

### frozen-ci-agent

```sh
if command -v lean; then echo "Unexpected Lean on PATH"; exit 1; fi
pnpm --filter agent test --maxWorkers=2
```

Exit 0; 122.458 s. Started 2026-11-08T10:05:46.143001+00:00. Elan removed from PATH: True. Log SHA-256: `7c7c765e94962f23123c576f237dea282b52ee1aa368f93b3aabc21786df2615`.

### frozen-proofs

```sh
bash "$RUNNER_TEMP/frozen-proofs.sh"
```

Exit 0; 206.566 s. Started 2026-11-08T10:06:22.127261+00:00. Elan removed from PATH: False. Log SHA-256: `284f02d7927f6c8bef25ba963347cecdb6ac85fe7baa90f097da198adcb59392`.

### frozen-ci-app

```sh
if command -v lean; then echo "Unexpected Lean on PATH"; exit 1; fi
pnpm --filter app test --maxWorkers=2
```

Exit 0; 109.156 s. Started 2026-11-08T10:07:48.624377+00:00. Elan removed from PATH: True. Log SHA-256: `f2184c7172c810ab779e9e40ac184c28822a0a1a35e1aa6759ef88dd22acfce3`.

### frozen-legacy-all

```sh
python3 "$RUNNER_TEMP/legacy-all.py"
```

Exit 0; 1024.233 s. Started 2026-11-08T10:07:57.319563+00:00. Elan removed from PATH: False. Log SHA-256: `66b1a39c04ba99a1a743c9fb3e943aa79a09b348255a0b3ba008bc9565f52f2c`.

### frozen-ci-world

```sh
if command -v lean; then echo "Unexpected Lean on PATH"; exit 1; fi
pnpm --filter world exec vitest run --maxWorkers=2
```

Exit 0; 11.385 s. Started 2026-11-08T10:09:37.803352+00:00. Elan removed from PATH: True. Log SHA-256: `6e80755a533584ebf2432744a6a26b64ce27270360e34f4ca57523c4df21692d`.

### frozen-ci-realism

```sh
if command -v lean; then echo "Unexpected Lean on PATH"; exit 1; fi
node --test world/realism/*.test.mjs
```

Exit 0; 6.122 s. Started 2026-11-08T10:09:49.211066+00:00. Elan removed from PATH: True. Log SHA-256: `0805b3dede4d67f82df55f68fef33f9787358c4a150f7d71fe160158b80c39bb`.

### frozen-ci-commit

```sh
if command -v lean; then echo "Unexpected Lean on PATH"; exit 1; fi
pnpm --filter @vgi/commit test
```

Exit 0; 1.432 s. Started 2026-11-08T10:09:55.357219+00:00. Elan removed from PATH: True. Log SHA-256: `c87115c09c15a791948f3f7a723b82bfd16f8baa6f69f6d28cd0357afca369ba`.

### frozen-ci-python

```sh
if command -v lean; then echo "Unexpected Lean on PATH"; exit 1; fi
python3 scripts/test-information-needs-compare.py
```

Exit 0; 0.043 s. Started 2026-11-08T10:12:17.496408+00:00. Elan removed from PATH: True. Log SHA-256: `fe008aab760eb03ccac7578e2b84665b1b50b0d7f855b17a0c7a8d039435b658`.

### frozen-ci-conformance

```sh
if command -v lean; then echo "Unexpected Lean on PATH"; exit 1; fi
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

Exit 0; 249.717 s. Started 2026-11-08T10:12:17.562965+00:00. Elan removed from PATH: True. Log SHA-256: `9be750796ed5fb128596cf6f4495c00cf070f90ae74ed963a91b5287868b6bb3`.

### frozen-native-wasm

```sh
python3 "$RUNNER_TEMP/wasm-shards.py"
```

Exit 0; 694.923 s. Started 2026-11-08T10:20:14.212760+00:00. Elan removed from PATH: False. Log SHA-256: `9ae226496c5462d6c1785d8b9d50aee9da9c1c852b68b5cebb122fca899977c2`.

### frozen-ci-integration

```sh
if command -v lean; then exit 1; fi; DATABASE_URL=postgres://vgi:ci-only-password@127.0.0.1:55533/vgi_commit COMMIT_FIXTURE="$TMPDIR/commit-fixture.json" COMMIT_PROTOCOL_TRACE_KEEP=1 pnpm --filter @vgi/commit test:integration
```

Exit 0; 41.850 s. Started 2026-11-08T10:20:19.485520+00:00. Elan removed from PATH: True. Log SHA-256: `1d5058675f7df3963594103767d30330d25faba79105bdcdd5bc59f0d47211d2`.

### frozen-information-needs

```sh
python3 scripts/information-needs-compare.py --world "$RUNNER_TEMP/info-needs-world" --out "$RUNNER_TEMP/info-needs-real-work" && pnpm --filter agent exec tsc -p ../scripts/tsconfig.information-needs.json && python3 scripts/test-information-needs-compare.py
```

Exit 0; 53.240 s. Started 2026-11-08T10:20:20.685922+00:00. Elan removed from PATH: False. Log SHA-256: `b300f0f5e00912517a4f5c70acad10b9297bf3669c42d4da8b0fe544e36b2e2c`.

### frozen-ui-native

```sh
node --test scripts/ui-library/native.test.mjs scripts/ui-library/family.test.mjs scripts/ui-library/structural.test.mjs scripts/ui-library/program.test.mjs scripts/ui-library/fonts.test.mjs && node scripts/ui-library/port-audit.mjs --all-screens
```

Exit 0; 146.206 s. Started 2026-11-08T10:22:21.359330+00:00. Elan removed from PATH: False. Log SHA-256: `bcf7e1038f63da40ca449f8cc8490c3a1c221887c7cc880b4c0cb73285610bfe`.

### frozen-ui-browser

```sh
flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off pnpm --filter app exec playwright test --config src/browser/ui-library/playwright.config.ts && flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off node --test scripts/screen-cache-browser.test.mjs
```

Exit 0; 11062.757 s. Started 2026-11-08T10:22:50.716372+00:00. Elan removed from PATH: False. Log SHA-256: `cb3048b0e0c53466cf1157bca7a42ff38a0638d4c1082f1eb90d6fd7adb52dc7`.

### frozen-information-pixels

```sh
flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off pnpm --filter agent exec tsx ../scripts/information-needs-pixels.mts "$RUNNER_TEMP/info-needs-real-work/summary.json"
```

Exit 0; 11023.855 s. Started 2026-11-08T10:22:51.884521+00:00. Elan removed from PATH: False. Log SHA-256: `ecdc8b075d2360a48b043388ad74f28a7d6632d17bd079806b56a135a2a52614`.

### fresh-stack-integration

```sh
if command -v lean; then exit 1; fi; DATABASE_URL=postgres://vgi:vgi-dev-only@127.0.0.1:55532/vgi_commit COMMIT_FIXTURE="$TMPDIR/commit-fixture.json" pnpm --filter @vgi/commit test:integration
```

Exit 0; 40.771 s. Started 2026-11-08T10:27:35.616177+00:00. Elan removed from PATH: True. Log SHA-256: `1f2b00ff7e5134ac87af268316c324dfdb7a409d31ec6b287d74c3a34d55616d`.

### publication-ci-scripts

```sh
if command -v lean; then echo "Unexpected Lean on PATH"; exit 1; fi
node conformance/cures-probe.mjs
mapfile -t tests < <(find scripts conformance -name '*.test.mjs' ! -name 'completion-check.test.mjs' ! -name 'screen-cache-browser.test.mjs' ! -path 'scripts/ui-library/*' | sort)
node --import ./agent/node_modules/tsx/dist/loader.mjs --test --test-concurrency=2 "${tests[@]}"
```

Exit 0; 142.775 s. Started 2026-11-08T11:07:06.394798+00:00. Elan removed from PATH: True. Log SHA-256: `b0036cc95aae87e60f3167db014775b5b73e4f894d43921350ee3c5bb1b6c673`.

### frozen-endpoint-smokes

```sh
node scripts/workload-clock-smoke.mjs; python3 "$RUNNER_TEMP/legacy-compare.py"; pnpm --filter agent exec vitest run test/workload.test.ts test/ehr-adapter.test.ts --maxWorkers=2
```

Exit 0; 22.840 s. Started 2026-11-08T11:22:45.433580+00:00. Elan removed from PATH: False. Log SHA-256: `4b15b16785dd14c8927aac5d476f9a8c339498e6005ba3392eb39b915678ae63`.

### trajectory-clock-label

```sh
node --import ./agent/node_modules/tsx/dist/loader.mjs --test scripts/trajectories/index.test.mjs && git diff --check
```

Exit 0; 6.861 s. Started 2026-11-08T11:41:25.721466+00:00. Elan removed from PATH: True. Log SHA-256: `bc996d2e64578f9a36976b30e7b8c740575a5ff8cef1c0382df7a0d7e953fb86`.

### digest-regression

```sh
pnpm --filter agent exec vitest run test/determinism.test.ts --maxWorkers=2 && pnpm --filter agent lint && pnpm --filter agent typecheck
```

Exit 0; 9.250 s. Started 2026-11-08T13:27:06.263495+00:00. Elan removed from PATH: True. Log SHA-256: `fdc77ff2911294559da2b08abbdbfe1ab00210776c2575d8383eae3cf951b192`.

### frozen-recertification

```sh
node "$RUNNER_TEMP/recover-recertification.mjs"
```

Exit 0; 664.757 s. Started 2026-11-08T13:28:44.665503+00:00. Elan removed from PATH: False. Log SHA-256: `589430c5379742436d8be0487712ee74bdb6bdc0c4b667d135909ca913e7ace0`.

### digest-ci-agent

```sh
if command -v lean; then exit 1; fi; pnpm --filter agent test --maxWorkers=2
```

Exit 0; 121.904 s. Started 2026-11-08T13:28:55.157769+00:00. Elan removed from PATH: True. Log SHA-256: `2ae4492fe4aaebe55267057735986ac676e3bc15032912e4a0b5c49cf742863a`.

### information-pixels-workspace

```sh
flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off pnpm --filter agent exec tsx ../scripts/information-needs-pixels.mts "$RUNNER_TEMP/info-needs-real-work/summary.json"
```

Exit 0; 46.889 s. Started 2026-11-08T13:30:29.261410+00:00. Elan removed from PATH: False. Log SHA-256: `d15a434d0e011c392e6b48c39a054cb54df092f95577efd8df65d5029b8c6437`.

### digest-ci-scripts

```sh
if command -v lean; then exit 1; fi
node conformance/cures-probe.mjs
mapfile -t tests < <(find scripts conformance -name '*.test.mjs' ! -name 'completion-check.test.mjs' ! -name 'screen-cache-browser.test.mjs' ! -path 'scripts/ui-library/*' | sort)
node --import ./agent/node_modules/tsx/dist/loader.mjs --test --test-concurrency=2 "${tests[@]}"
```

Exit 0; 135.672 s. Started 2026-11-08T13:30:57.084522+00:00. Elan removed from PATH: True. Log SHA-256: `92181d0591b5ba3ec6c27ecce01c60e159cdad88d3d50703d02d9909074ceb37`.

### information-pixels-types

```sh
pnpm --filter agent exec tsc -p ../scripts/tsconfig.information-needs.json
```

Exit 0; 1.990 s. Started 2026-11-08T13:32:26.227079+00:00. Elan removed from PATH: False. Log SHA-256: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.

### audit-templates

```sh
EHR_SCREEN_WORKERS=4 EHR_SCREEN_CACHE_DIR="$RUNNER_TEMP/full-audit-cache" flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off node scripts/audit-alert-policy.mjs "$RUNNER_TEMP/audit-templates"
```

Exit 0; 1764.155 s. Started 2026-11-08T13:33:13.342192+00:00. Elan removed from PATH: False. Log SHA-256: `7ca066813d3671642bfa5c1d614375e140cb92a611c556a07c27bd6f8b258e92`.

### scheduler-resumption-cases

```sh
cd lean
lake env lean Ehr/Sim/Scheduling/Tests.lean
lake env lean Ehr/Sim/Scheduling/CombinedTests.lean
lake env lean Ehr/Sim/Resumption/Tests.lean
```

Exit 0; 1.700 s. Started 2026-11-08T13:55:00.922028+00:00. Elan removed from PATH: False. Log SHA-256: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.

### audit-personas

```sh
EHR_SCREEN_WORKERS=4 EHR_SCREEN_CACHE_DIR="$RUNNER_TEMP/full-audit-cache" flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off node scripts/audit-alert-policy.mjs "$RUNNER_TEMP/audit-personas" --personas
```

Exit 0; 877.553 s. Started 2026-11-08T14:02:37.970486+00:00. Elan removed from PATH: False. Log SHA-256: `fece2f5e77089044edda72593f901471586e2223d1b26d85360cb5ec9fe353b8`.

### conformance-boundary-regressions

```sh
node --test conformance/coverage.test.mjs conformance/driver.test.mjs
```

Exit 0; 144.777 s. Started 2026-11-08T14:13:50.708049+00:00. Elan removed from PATH: True. Log SHA-256: `b5cc124198a825067b0a9020166e71bf068853815bbfb99574951b38dedc06a3`.

### conformance-retained-regressions

```sh
EHR_CONFORMANCE_TRANSPORT=serve node conformance/index.mjs --run core-10day --jobs 2 --scenario entry.signNote.claimDiagnosis,alert.passive.criticalResult,v2.prior-auth --out "$RUNNER_TEMP/conformance-retained-regressions-output.json"
```

Exit 0; 34.114 s. Started 2026-11-08T14:16:43.001334+00:00. Elan removed from PATH: True. Log SHA-256: `4f877ef96dac3408dab51e553dffcff81321b0f519110ecf53de029940823429`.

### conformance-frozen-spec-regressions

```sh
node --test conformance/coverage.test.mjs conformance/targets.test.mjs
```

Exit 0; 1.394 s. Started 2026-11-08T14:17:20.164029+00:00. Elan removed from PATH: True. Log SHA-256: `de219784497bab59e54c105855030bc0f7ba70ae968fe8078c4377001fa7ba63`.

### frozen-protected-inputs

```sh
python3 "$RUNNER_TEMP/integrity.py" after
```

Exit 0; 0.670 s. Started 2026-11-08T14:19:11.597304+00:00. Elan removed from PATH: False. Log SHA-256: `dcc905839d16f27fbdd7c4fe4c07bec6c73a12efeb08d259600c9978ca9bc638`.

### core-conformance

```sh
EHR_CONFORMANCE_TRANSPORT=serve node conformance/index.mjs --run core-10day --jobs 2 --out runs/core-10day/conformance.json
```

Exit 0; 490.060 s. Started 2026-11-08T14:19:12.289857+00:00. Elan removed from PATH: False. Log SHA-256: `ba9d4fb257b9dde12b9a087ad44d15ba5072cf8ad57fc877c05344d696a41d33`.

### conformance-ci-matrix

```sh
bash "$RUNNER_TEMP/conformance-ci-conformance.sh"
```

Exit 0; 241.824 s. Started 2026-11-08T14:19:12.725800+00:00. Elan removed from PATH: True. Log SHA-256: `d28372aaf382e191331d0af48eef1197caebd42fe137c772ed48f793ef041fdb`.

### conformance-ci-scripts

```sh
bash "$RUNNER_TEMP/conformance-ci-scripts.sh"
```

Exit 0; 142.592 s. Started 2026-11-08T14:19:12.726898+00:00. Elan removed from PATH: True. Log SHA-256: `4a42485c922b662c1d7190daf81aa9eb97cd7a3c2381cdb540d9dacad62d407c`.

### core-report

```sh
pnpm --filter agent report --run "$PWD/runs/core-10day"
```

Exit 0; 23.504 s. Started 2026-11-08T14:27:22.373443+00:00. Elan removed from PATH: False. Log SHA-256: `9771337e2d348459d2d32d31a32520871965e6cc40e3dc3621bf2e2428152a45`.

### core-derived

```sh
node "$RUNNER_TEMP/finalize-run.mjs" core-10day
```

Exit 0; 641.056 s. Started 2026-11-08T14:27:45.899838+00:00. Elan removed from PATH: False. Log SHA-256: `18e3b28124b3615242e56eff7e8c61764d40c50751aaf9b6d26639bc1cbad9e4`.

### realism-wave2-workload-control-measure

```sh
EHR_SCREEN_WORKERS=4 flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off pnpm --filter agent exec tsx src/remeasure-cli.ts --source runs/core-10day --out runs/realism-wave2-workload-control --world runs/world/realism-wave2-seed-1 --clock-mode continuous --interruptions fixedCost
```

Exit 0; 3143.137 s. Started 2026-11-08T14:38:26.980856+00:00. Elan removed from PATH: False. Log SHA-256: `e4311ded1f2f33570596e1c241b0fc82d483741a2af3b78a1cce7aa35003d21a`.

### geometry-cache-seeding

```sh
python3 "$RUNNER_TEMP/seed-current-geometry-cache.py"
```

Exit 0; 0.857 s. Started 2026-11-08T14:48:02.192670+00:00. Elan removed from PATH: False. Log SHA-256: `5c207d5be32d60324e722813984e21cdebdff808b8ec8e15532766cc82717f52`.

### realism-wave2-workload-control-report

```sh
pnpm --filter agent report --run "$PWD/runs/realism-wave2-workload-control"
```

Exit 0; 23.554 s. Started 2026-11-08T15:30:50.142363+00:00. Elan removed from PATH: False. Log SHA-256: `4f5f31c22e97e4953bad0881cd8cedbd9bc074d4131b9b6b2c63ebb02bf117e0`.

### realism-wave2-workload-control-derived

```sh
node "$RUNNER_TEMP/finalize-run.mjs" realism-wave2-workload-control
```

Exit 0; 2348.582 s. Started 2026-11-08T15:31:13.719508+00:00. Elan removed from PATH: False. Log SHA-256: `413114757db47f1f4497c0b19036ffd9e3d0b3e975cf39cf19f5d82d8e564632`.

### realism-wave2-real-work-measure

```sh
EHR_SCREEN_WORKERS=4 flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off pnpm --filter agent exec tsx src/remeasure-cli.ts --source runs/core-10day --out runs/realism-wave2-real-work --world runs/world/realism-wave2-seed-1 --clock-mode continuous --interruptions realWork
```

Exit 0; 2299.153 s. Started 2026-11-08T15:42:03.376879+00:00. Elan removed from PATH: False. Log SHA-256: `9b2d7a00049e220d1f29aee5a6392efb2461a644bb153b38c2617f066421ea6a`.

### real-work-prefix

```sh
python3 "$RUNNER_TEMP/check-real-work-prefix.py"
```

Exit 0; 0.072 s. Started 2026-11-08T15:46:12.459087+00:00. Elan removed from PATH: False. Log SHA-256: `b879078ef3a35ad843387fe609c8618c7aa1846b1ba3479b6c1ed0746ea28310`.

### realism-wave2-real-work-report

```sh
pnpm --filter agent report --run "$PWD/runs/realism-wave2-real-work"
```

Exit 0; 23.862 s. Started 2026-11-08T16:20:22.552494+00:00. Elan removed from PATH: False. Log SHA-256: `d055877300af36e3b02a78e962cbaae7ee772b4bc5e48e1d550d5a2a56812b20`.

### native-measurement-invariants

```sh
python3 "$RUNNER_TEMP/check-measurements.py" --native-only
```

Exit 0; 5.033 s. Started 2026-11-08T16:20:29.062337+00:00. Elan removed from PATH: False. Log SHA-256: `2ac77bc7195613e9b917f9420811f920b0220ab4732cbe23b825383bc1d93c18`.

### realism-wave2-real-work-derived

```sh
node "$RUNNER_TEMP/finalize-run.mjs" realism-wave2-real-work
```

Exit 0; 2381.944 s. Started 2026-11-08T16:20:46.437897+00:00. Elan removed from PATH: False. Log SHA-256: `f0bd1bff56f9e4ae01d1683e7cfa8e7a410b8bafbafa0e545435fd018ff12bb1`.

### physical-measurement-coverage

```sh
python3 "$RUNNER_TEMP/check-physical-coverage.py"
```

Exit 0; 1.037 s. Started 2026-11-08T16:22:49.907087+00:00. Elan removed from PATH: False. Log SHA-256: `a1557f57d49754d6c0b6104f08e574ecfc4f8bbf258be0562eec38fced1b15fa`.

### live-load

```sh
unset DATABASE_URL; export COMPOSE_PROJECT_NAME=vgi-realism-wave2-20261108; make load SYNTHETIC_HOSPITAL=1; docker compose --env-file .env -f infra/docker-compose.yml --profile app up -d commit; node infra/scripts/wait-healthy.mjs
```

Exit 0; 29.088 s. Started 2026-11-08T16:29:08.179951+00:00. Elan removed from PATH: False. Log SHA-256: `ffb8de1c1a3f8be42575a03e412e4e4ef80664e56a914ef24adb79409311db03`.

### neutral-screenshots

```sh
APP_TEST_PREVIEW=1 NEUTRAL_SHOTS=1 flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off pnpm --filter app exec playwright test neutral-shots.spec.ts --project=desktop --workers=1 --grep "regenerate neutral clinical screenshots"
```

Exit 0; 18.906 s. Started 2026-11-08T16:29:37.292342+00:00. Elan removed from PATH: False. Log SHA-256: `b20e1eba0777f98b6152e8256ffd9261dee86c8d5d42c1938b823091d60c8340`.

### compare-pixel-regressions

```sh
APP_TEST_PREVIEW=1 AUDIT_RUN=core-10day flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off pnpm --filter app exec playwright test compare.spec.ts --project=desktop --workers=1 && pnpm --filter app lint && pnpm --filter app typecheck
```

Exit 0; 60.245 s. Started 2026-11-08T16:46:28.809942+00:00. Elan removed from PATH: True. Log SHA-256: `b976a136c32b94da95c779a91976e1ade1e9b36cde60111027bda87fb8ac6efc`.

### desktop

```sh
PLAYWRIGHT_JSON_OUTPUT_NAME="$RUNNER_TEMP/desktop-playwright.json" APP_TEST_PREVIEW=1 AUDIT_RUN=core-10day flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off pnpm --filter app exec playwright test --project=desktop --workers=1 --reporter=list,json
```

Exit 0; 688.795 s. Started 2026-11-08T16:52:38.410669+00:00. Elan removed from PATH: False. Log SHA-256: `50d2b2182d8c02f58cc7475489cf0d90661ed32806ca24caed24b124ff317d2d`.

### measurement-invariants

```sh
python3 "$RUNNER_TEMP/check-measurements.py" && python3 "$RUNNER_TEMP/summarize-measurements.py"
```

Exit 0; 5.755 s. Started 2026-11-08T17:00:33.225365+00:00. Elan removed from PATH: False. Log SHA-256: `ef88577a5096ebc469e111bf948fabeb9816dbd7a4dbac3d6eec3d4216f15c51`.

### desktop-required

```sh
python3 "$RUNNER_TEMP/check-desktop.py"
```

Exit 0; 0.022 s. Started 2026-11-08T17:04:07.229269+00:00. Elan removed from PATH: False. Log SHA-256: `b7abd55fa49790c588c8c60fc464692a4772d19122abf51c1fda2b7f139ae5d6`.

### mar-adt

```sh
COMMIT_FIXTURE="$TMPDIR/commit-fixture.json" DATABASE_URL=postgres://vgi:vgi-dev-only@127.0.0.1:55532/vgi_commit COMMIT_INTERNAL_URL=http://127.0.0.1:8091 MAR_E2E=1 ADT_E2E=1 APP_TEST_PREVIEW=1 flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off pnpm --filter app exec playwright test mar-service.spec.ts adt-service.spec.ts --project=desktop --workers=1
```

Exit 0; 20.238 s. Started 2026-11-08T17:06:35.701427+00:00. Elan removed from PATH: False. Log SHA-256: `ef355be52fa02c7ff646d4de7da00fb3de7ab2d753dc547bc3e78b6706d1428c`.

### test-provenance-refresh

```sh
node "$RUNNER_TEMP/refresh-test-provenance.mjs"
```

Exit 0; 1.633 s. Started 2026-11-08T17:06:55.962679+00:00. Elan removed from PATH: False. Log SHA-256: `b304f61fe0f0fcbc5afb91adfa38f02a525b3d8e8131af0f053a36e76bdfd18f`.

### dashboard-shots

```sh
flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off node "$RUNNER_TEMP/refresh-dashboard.mjs"
```

Exit 0; 16.498 s. Started 2026-11-08T17:07:01.748332+00:00. Elan removed from PATH: False. Log SHA-256: `0769ef27bfe1fa90a1e7a81a44c218f9cf6af621429ca6f202d0c1d792da7335`.

### final-readme-proof-map

```sh
scripts/proof-map/build.sh --check-readme "$RUNNER_TEMP/final-proof-map"
```

Exit 0; 15.392 s. Started 2026-11-08T17:13:08.554578+00:00. Elan removed from PATH: False. Log SHA-256: `56dd6c59f5f32eb5ee49f604a75a6aa8a1d050198bf9d0c2e90a35f1d56eaed9`.

### final-integrity

```sh
bash "$RUNNER_TEMP/final-integrity.sh"
```

Exit 0; 842.238 s. Started 2026-11-08T17:13:26.158048+00:00. Elan removed from PATH: False. Log SHA-256: `7b3c9a6f574e591045da96f3d2763d1e3a33364ba04bd28ad769828f04b814e0`.

### cleanup-test-db

```sh
docker rm -f -v vgi-wave2-ci-postgres-20261108
```

Exit 0; 0.891 s. Started 2026-11-08T17:27:28.421593+00:00. Elan removed from PATH: False. Log SHA-256: `a399bcc3d9cf8fa4d3bee40e9879886fc49998fd227ed6d3b090966643672bd1`.
