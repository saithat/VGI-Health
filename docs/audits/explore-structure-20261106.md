# Structural nightly exploration, 2026-11-06

Lane: `lane/explore-structure`. No Lean theorem/spec changes, data commits,
certificate replacements or pushes. Review evidence is isolated under
`app/src/dashboard`; the final app hash is
`8d0fadf26732b5c9cc8a40c84f426b54aa4cd14eaf96c6264c983b1c35283e04`.

The default net effect floor is 5 click-plus-scroll interactions per train day,
with a positive net effect required even when configured to zero. It also applies
to the validation partition's per-day saving. This is a provisional policy, not
a calibrated clinical threshold. From the frozen ABC report's B candidate data:
244 measured candidates, 179 with positive train click+scroll saving, minimum 1,
lower quartile 23, median 40; 20 positive candidates fall below 5 before switching
cost. No new model calls were used to choose this floor.

The lossless columnar projection across all 35 retained nightly contexts reduces
the program dump from 7,446,134 to 5,842,091 characters (21.54%; individual reductions
20.58–21.86%). This measures characters, not tokenization or total prompt size.

## Verification

Environment for all pnpm commands:

```sh
export CI=true TMPDIR=/home/saithat/Projects/run-tmp
export npm_config_manage_package_manager_versions=false
```

Dependency setup (this worktree initially had no node_modules):

```sh
pnpm install --frozen-lockfile --store-dir /home/saithat/Projects/run-tmp/vgi-explore-pnpm-store
```

Passed:

```sh
pnpm --filter agent typecheck
pnpm --filter agent lint
pnpm --filter app typecheck
pnpm --filter app lint
pnpm --filter app build
pnpm --filter agent exec vitest run test/structure.test.ts test/offline-structure.test.ts test/cadence.test.ts test/night.test.ts test/quality.test.ts test/quality-golden.test.ts test/resume.test.ts test/parallel.test.ts --maxWorkers=2
# 8 files, 66 tests passed. Frozen arm A hashes match all 35 contexts.
pnpm --filter agent exec vitest run test/structure.test.ts test/offline-structure.test.ts --maxWorkers=2
# 2 files, 12 tests passed after adding the native offline-adapter assertions.
git diff --check
```

The app build has two nonfatal Rollup annotation warnings from the pinned zod
package. The initial plain pnpm invocation could not access its global SQLite
store; the worktree-local install above resolved setup without changing the
lockfile or shared dependencies.

## Frozen B/D pilot

Predeclared subset: `night-01/P1`, one sample per arm, unchanged frozen decision,
world, spec and baseline. Its earlier ledger is empty, so no historical measured
values are imported. All train metrics and locality are recomputed with the
current native binary and renderer. This small pilot tests behavior and cannot
establish a population-level accepted-change advantage. It skips screen gates,
user acceptance and deployment; accepted changes are hypothetical releases.

```sh
EHR_BIN=/home/saithat/Projects/VGI-Health/lean/.lake/build/bin/ehr EHR_SCREEN_WORKERS=2 \
flock "$TMPDIR/vgi-browser-heavy.lock" \
pnpm --filter agent proposal-quality --run runs/core-10day \
  --out runs/quality-structure-BD-20261106 --world runs/world/2 \
  --arms B,D --decisions night-01/P1 --samples 1 --backend codex \
  --workers 1 --service-tier default --reasoning-effort high
```

The run completed both planned samples with three live completions total, model
`gpt-6.1-sol`, high reasoning, default service tier, zero tool/query executions and
no infrastructure retries. Source implementation: `e6a1e940`; later integrity
fixes did not change its prompt, threshold or distance metric. All seven generated
programs were checked after those fixes against the independent identity budget;
all three D portfolio/hotspot/structural claims also passed. That check made zero
model/native calls (`posthoc-static.json`). Raw inputs, transcripts, native
evidence and reports remain gitignored under `runs/quality-structure-BD-20261106`.

| Metric | B | D |
|---|---:|---:|
| Accepted changes / samples | 1/1 (100%) | 0/1 (0%) |
| Nonseeded proposals | 4 | 3 |
| Native checker rejections | 0/4 (0%) | 0/3 (0%) |
| Selected train saving, clicks + scrolls/day | 154 | 106 |
| Selected net train saving after movement proxy | 121 | 73 |
| Selected validation saving, clicks + scrolls | 69 | 47 |
| Accepted validation saving | 69 | 0 |
| Selected structural distance | 0.0047169811 | 0.0047169811 |
| Accepted-change structural distance | 0.0047169811 | unavailable |
| Actual shipped changes | 0 (offline) | 0 (offline) |
| Backend completions | 2 | 1 |
| Input tokens, all completions | 220,725 | 102,520 |
| Charged seconds, including shared preparation | 572.7 | 438.0 |

D's selected early workflow copies saved 50 validation scrolls but added three
clicks; the existing count-nonregression gate refused the release. Its net
validation effect still exceeded the new floor (47 minus 33 = 14), so the floor
was not the cause. The other D alternatives had net train effects −174 and −25,
so neither qualified. B combined a toolbar with inline removable reminders,
saving 13 clicks and 56 scrolls in validation. Neither arm tested the native
checker boundary. D supplied all requested scales, but its radical label did not
produce greater measured structural distance. This pilot provides no evidence
that D improves accepted-change rate or structural exploration over B. Its
single-decision bootstrap interval is degenerate and has no population-level
interpretation. The production safeguards remain intact; no threshold, safety
rule or measurement was changed to obtain acceptance.

The first-night pilot cannot test the benefit of ledger memory. Existing
train-only ledger/geometry tests cover integrity, while the earlier 35-decision
ABC result remains the evidence for promoting B's context. A larger, exactly
bound B/D comparison after integration is still needed.

Additional checks:

```sh
pnpm --filter agent exec vitest run test/structure.test.ts test/offline-structure.test.ts test/quality.test.ts --maxWorkers=2
# 3 files, 30 tests passed after the final guards and archive-import test.
pnpm --filter agent exec tsx /home/saithat/Projects/run-tmp/vgi-structure-posthoc.mts
# 7/7 identity checks and 3/3 D portfolio checks passed; zero model/native calls.
APP_TEST_PREVIEW=1 APP_TEST_PORT=4187 \
flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off \
pnpm --filter app exec playwright test dashboard.spec.ts --project=desktop \
  --grep 'mock is explicitly selected' --workers=1
# 1 test passed (2.7s); no full audit or broad browser suite.
```

The dashboard server logs existing `Invalid run manifest` messages when it
encounters offline quality outputs in the run inventory; those outputs are not
live run manifests. The smoke assertion passed. The final merged check should
retain the distinction when inspecting the logs.

Final compatibility checks:

```sh
pnpm --filter agent exec vitest run test/cadence.test.ts test/quality-golden.test.ts --maxWorkers=2
# 2 files, 16 tests passed after the final evidence guards.
pnpm --filter agent exec vitest run test/modes.test.ts test/native-timeout.test.ts test/bounded-tailoring.test.ts test/geometry.test.ts --maxWorkers=2
# Modes (7), native-timeout (2) and geometry (12) passed. Bounded-tailoring
# initially failed two missing-binary prerequisites and one historical fixture.
mkdir -p lean/.lake/build/bin
ln -s /home/saithat/Projects/VGI-Health/lean/.lake/build/bin/ehr lean/.lake/build/bin/ehr
pnpm --filter agent exec vitest run test/bounded-tailoring.test.ts --maxWorkers=2
# 11/11 passed, including native practiced-memory relearning (16.9s).
pnpm --filter agent exec vitest run test/review-followup.test.ts -t 'records .* infrastructure' --maxWorkers=2
# 3 selected infrastructure-fault tests passed; 3 unselected tests skipped.
pnpm --filter agent typecheck
pnpm --filter agent lint
git diff --check
```

The native symlink is gitignored and points to the same prebuilt binary used by
the pilot; no build or other worktree write occurred. The historical session and
fault-injection fixtures now explicitly select `structurePolicy: false` so their
existing deployment/failure assertions continue to exercise the intended stages.
No assertion was weakened. The initial fault-filter command used unsupported
Vitest `--grep`; it ran no tests and was corrected to `-t` as shown above.

The character-count and final static checks used the local scripts
`/home/saithat/Projects/run-tmp/vgi-structure-sizes.mts` and
`/home/saithat/Projects/run-tmp/vgi-structure-posthoc.mts`; the latter's results
are retained in the gitignored pilot output. No model call was made by either.

## Final merged checks

Per the owner's 2026-11-06 instruction, this lane does not run full audits,
full re-certification, broad Playwright suites or a multi-day live experiment.
The merge session must run the template audit and then `--personas` sequentially
under the shared browser lock, plus the combined agent/app tests and recorded-run
certification/replay verification required by the other lanes. From the merged
checkout, with its current native binary and freshly built app:

```sh
export EHR_BIN="$PWD/lean/.lake/build/bin/ehr"
flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off \
  node scripts/audit-alert-policy.mjs "$TMPDIR/merged-audit-templates"
flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off \
  node scripts/audit-alert-policy.mjs "$TMPDIR/merged-audit-personas" --personas
flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off \
  node scripts/recertify-runs.mjs --runs core-10day --out "$TMPDIR/merged-recording-recertification"
```

Use the README's recorded-run migration/strict-replay workflow if merged clinical
changes require installing new bindings and measurements. No lake build or
axiom audit is required by this lane because Lean sources are unchanged.

The information-needs adapter is defined but not connected: lookup-detour and
memory-carry evidence must come from completed train tasks in that lane. The
five-interaction floor and structural-distance bins remain provisional choices
for a larger frozen comparison after integration. No owner decision blocks this
implementation.
