# Dense reference defaults

The shared `dense-reference-v7` generator supplies default geometry to the
opt-in Lean nightly mode and the experimental `/lean.html` page. Missing custom
shape cases receive this default; matching custom cases must pass independently.
Dense refusal tries the fixed shell at the same unchanged vendor screen limit.
Neither a transport error nor refusal of both families becomes successful
fallback. No Lean source, rule, theorem, density limit or default was changed.
Application and agent source hashes changed; old certificates were not rebound.
The ordinary browser nightly mode retains its existing behavior.

The generator reconstructs navigation headings and individual link targets,
individual tab targets before selected content, and flagged urgent occurrences
outside all scrollers, clear of the banner, footer and modal. Node reports,
nightly admission/geometry and the browser bundle import the same plain
JavaScript module. Agent admission is bounded and cached by augmented shape and
limit; a thousand changing-value states require one family admission. The page
checks the family with WASM, then paints the actual semantic screen through WASM.

## Evidence scope

All patients and clinicians are synthetic. Local output is under
`/home/saithat/Projects/run-tmp/dense-v7/`; nothing there is tracked in git.
The Program corpus is all fifteen persona/release Programs with exported group,
tab and alert variants on the same Abdul Sauer fixture. The recorded-state
corpus is the retained native UiScreens for the same 84 persona-days from
`core-10day` and `rules3-10day-invalid-simloop`; sixteen absent persona-days
contribute no inferred data. Each retained compressed snapshot is checksummed
and its complete event sequence matched against the read-only recording before
current native layout admission. This is a current layout recheck of retained
screens, not a fresh clinical replay of all recordings.

Desktop density counts are first-viewport targets and the maximum fixed targets
plus one scroll window, compared to each exact screen limit in
`docs/methods/lean-screen-density.json` (existing vendor audit measurements for
other measured screens, otherwise 15). Refused geometry is retained for diagnosis.
The costs for any state where both families refuse are diagnostic, not an
admitted simulation result. The same traces retain original explicit scroll
operations. Stored browser geometry belongs to its historical build. None of
these comparisons estimates clinician benefit or an agent effect.

## Verification and reproduction

Use `TMPDIR=/home/saithat/Projects/run-tmp`, `LEAN_NUM_THREADS=2`, and
`pnpm_config_verify_deps_before_run=false` with the installed dependencies. The
latter avoids pnpm's dependency auto-check trying an unavailable local store;
no lockfile changed. Commands are from the repository root:

```sh
node --test scripts/layout-reference/reference.test.mjs scripts/ui-library/family.test.mjs
node --import ./agent/node_modules/tsx/dist/loader.mjs scripts/layout-reference/report.mjs --out "$TMPDIR/dense-v7"
node scripts/layout-reference/visited.mjs --out "$TMPDIR/dense-v7" \
  --frozen-snapshots "$TMPDIR/reference-layouts/native-screens"
node scripts/layout-reference/benchmark.mjs --out "$TMPDIR/dense-v7" --count 100
node scripts/layout-reference/summary.mjs --out "$TMPDIR/dense-v7"
node scripts/discovery/smoke.mjs "$TMPDIR/dense-v7/nightly-smoke-bound"
node scripts/layout-reference/nightly-benchmark.mjs "$TMPDIR/dense-v7/nightly-real-bound"
pnpm --filter app typecheck
pnpm --filter app lint
pnpm --filter app test --maxWorkers=2
pnpm --filter app build
node --test app/scripts/lean-bundle.test.mjs
pnpm --filter agent typecheck
pnpm --filter agent lint
pnpm --filter agent test --maxWorkers=2
```

For the two actual P1/P3 browser workflows and five screenshots:

```sh
docker run --rm -d --name vgi-dense-postgres \
  -e POSTGRES_PASSWORD=synthetic-painter-test -e POSTGRES_DB=painter \
  -p 127.0.0.1:55542:5432 --memory=512m postgres:16.15
DENSE_LAYOUT_SHOTS="$TMPDIR/dense-v7/page-visual" \
DATABASE_URL=postgres://postgres:synthetic-painter-test@127.0.0.1:55542/painter \
EHR_BIN="$PWD/lean/.lake/build/bin/ehr" pnpm --filter app exec playwright test \
  --config src/lean-ui/playwright.config.ts workflows.pw.ts --workers=1
docker stop vgi-dense-postgres
```

The five directories are `P1-landing`, `P1-document`, `P1-orders`, `P1-sign`
and `P3-assessment`. Each contains `dense.png`, `vendor.png`, the exact shared
`screen.json` and `evidence.json`, at 1440×900. All five page selections used
the dense layout. The workflows include real guarded receipts, drafts, signing,
native/WASM agreement, focus/caret preservation, viewport refusal/recovery and
rectangle/line/glyph agreement within 1/64 px. The disposable database was stopped.

CI excludes `scripts/layout-reference/*` exactly alongside `scripts/ui-library/*`
from the generic script-discovery command and runs the reference tests in the
Lean job after building `ui-layout`. It also packages/restores `ui-layout` for
the agent's existing native integration tests. Local verification used the
already rebuilt binaries; no Lean build was needed. Full WCAG/screen audits,
full Playwright suites, live model calls, pushes, other worktrees and the running
recording were outside this task and were not used.

## Remaining fidelity gaps

Navigation and tabs now have real, individually measured targets, and urgent
content is checked under G11 even with a modal. The page still shows safety
text cards in the Lean rectangles. Fields do not have separately placed label,
control and annotation parts; pending confirmation still shares one semantic
field box. Tables retain all data in local text scrollers rather than checked
cell geometry and attached row actions. Charts, icons, clinical chrome,
content-measured row heights, complete ARIA relationships and broader assistive
technology behavior remain different from today's application. This change
adds no certification of those missing behaviors. See the detailed
[widget inventory](../methods/lean-painter.md).

## Program coverage and timing results

The Program/variant corpus admits **4,146/4,371 dense cases (94.85%)**.
All **225 dense refusals are G10**; no other rule refuses a dense case in this
corpus. Same-limit fixed-shell admission recovers 144; **81 cases refuse both**.
Per release, P1/P4/P5 each have 19 dense refusals (nine also refuse fixed),
while P2/P3 each have nine dense refusals (all recover with fixed).
`report.json` retains each case and the exact limit; `density.md` gives desktop
maxima for every release/persona/screen across both corpora. Limits stay unchanged.

The cold benchmark checks 100 distinct families from 175 states in **7.98 s**,
with **12.88 shape admissions/s** (7.77 s spent in admission), zero fallback in
that sample, and a fresh memory-only cache. This includes native startup and
all three viewport checks; it is not kernel throughput.

The final real P3 day phase takes **152.08 s (2.53 min)** and completes **38/38**
tasks in both arms, with 482 clicks and 578 modeled scrolls in each. The earlier
fixed-shell pilot's P3 day 1 took 161.12 s; its persona-day range was about
2–6 minutes. These are local observations on a shared machine, with changed
layout rules/source and concurrent coverage work, not a matched speed test.
The phase includes training, bounded training, canonical and no-agent controls;
initial certification and final digest are outside the phase time.

The manifest records **2,265 dense, zero fallback, zero custom and zero refused**
geometry states for P3 day 1 across those evaluations. There are **230 uncached
shape admissions in 18.42 s (12.49/s)** and 196 shape-cache hits. Three complete
Program gates, including native screen export, actual gallery text binding and
family/geometry work, all pass in 53.18 summed seconds (**0.0564 gates/s**).
The earlier pilot reported 0.0354 whole-Program gates/s across its different
three-persona/two-day workload. Those rates measure different amounts of work.
Generator source SHA-256 is `e3e3884b45898b9ae6a52092bef0af67c3089e38c8bc1abd7639155877560b49`;
native layout executable SHA-256 is `488bc0a036a3178e3fa8ff9849c40b849afab0c98c0dacaccf451ba746cec98f`.

The final two-day, three-persona scripted and replay runs each pass **30/30**
Program gates with matching decisions and daily counts. Scripted persona-day
phases take 0.74–1.43 s; replay takes 0.78–1.47 s. Gate rates are 2.089/s and
2.045/s respectively. Their clinical checker, simulator and semantic fixtures
are fakes; native layout admission is real. Manifest counts match in both runs:

| Persona | Day | Dense states | Checked fallback | Custom | Refused |
|---|---:|---:|---:|---:|---:|
| P1 | 1 | 96 | 0 | 0 | 0 |
| P3 | 1 | 126 | 0 | 0 | 0 |
| P5 | 1 | 144 | 0 | 0 | 0 |
| P1 | 2 | 32 | 0 | 0 | 0 |
| P3 | 2 | 16 | 0 | 0 | 0 |
| P5 | 2 | 16 | 0 | 0 | 0 |

Final local checks: **23/23** reference/family tests, **339** app unit tests
passed (32 conditional skips), **294** agent unit tests passed (64 conditional
skips), both typechecks and lints passed, app build passed, **2/2** targeted
browser workflows passed (24.7 s), and the transitive bundle test passed.
The Lean page's emitted graph is 405,708 bytes / 77,193 gzip bytes, with no
React or Mantine dependency; the comparison app graph remains 920,067 bytes.
The cache regression also verifies that gallery artifacts bind actual source
text independently of cached content-free geometry.

## Retained-state coverage and three-way costs

All **132,843/132,843** retained event pre-states across **84 persona-days**
were covered. Dense admission is **128,405/132,843 (96.66%)**. All **4,438**
dense refusals are **G10**, and all recover with admitted fixed-shell geometry
at the same screen limit. There are **zero** missing target bindings, zero
retained replay-mismatch days and zero unrendered states. Sixteen absent
persona-days remain excluded. The Program-only cases refusing both families
are `w2Result` variants for P1/P4/P5 at limit 11; none of those double-refused
variants occurs in this retained-state corpus.

`density.md` reports first-viewport and fixed-plus-scroll-window desktop maxima
against the unchanged limit for all **260** release/persona/screen combinations.
**26** combinations have at least one over-limit dense proposal, which is
refused. Examples: `v1/P1/chartSummary` is 11/11 against 11;
`v1/P1/w1Exam` is 29/29 against 29; `v3/P1/w2Result` reaches 22/22 against 11
and therefore needs fallback. These are maxima over variants, not a claim that
refused boxes were painted by the live page. Full case counts and findings are
in `report.json`, `visited.json` and the checksummed admission receipts.

Columns below are **scroll count / scroll pixels / pointer-travel pixels**.
All retained-state costs use admitted dense/fallback geometry. Explicit original
scroll events remain in the trace, and the stored browser atlas is historical.
P2 requires more scrolls than the fixed shell in both recordings; pointer travel
also reflects the real separate navigation/tab targets and wider horizontal
arrangements. These results do not establish uniform savings or an agent effect.

| Recording | Persona | Days | Dense / states | Both refused | Fixed | Dense/fallback | Stored browser |
|---|---|---:|---:|---:|---|---|---|
| core-10day | P1 | 10 | 14702/15753 | 0 | 10870 / 9062084 / 1475980 | 10283 / 7911138 / 3435694 | 10029 / 10140457 / 3538181 |
| core-10day | P2 | 10 | 26748/26779 | 0 | 20456 / 15543596 / 4062676 | 21889 / 17360246 / 6096142 | 23739 / 21103992 / 5768934 |
| core-10day | P3 | 10 | 10410/10410 | 0 | 5578 / 4298096 / 1463948 | 5447 / 4281078 / 3117460 | 6730 / 6689826 / 3046256 |
| core-10day | P4 | 10 | 11216/11216 | 0 | 8145 / 5803356 / 1331984 | 7679 / 5851798 / 2276329 | 8075 / 7673840 / 2544165 |
| core-10day | P5 | 10 | 13064/13122 | 0 | 11746 / 10204372 / 646456 | 10555 / 9026526 / 2199639 | 10602 / 9826197 / 2059013 |
| rules3-10day-invalid-simloop | P1 | 7 | 11477/12183 | 0 | 8765 / 7226492 / 1078254 | 7878 / 5987924 / 2455471 | 8684 / 13082999 / 2576979 |
| rules3-10day-invalid-simloop | P2 | 6 | 15247/17039 | 0 | 12811 / 9672136 / 2718348 | 13824 / 10355332 / 3626737 | 15550 / 18267105 / 3442477 |
| rules3-10day-invalid-simloop | P3 | 7 | 7901/7901 | 0 | 4853 / 3634884 / 1165942 | 4763 / 3828844 / 2423031 | 5690 / 5811207 / 2382515 |
| rules3-10day-invalid-simloop | P4 | 7 | 7854/8602 | 0 | 6291 / 4571356 / 961310 | 5901 / 4511662 / 1642975 | 6270 / 6397272 / 1855322 |
| rules3-10day-invalid-simloop | P5 | 7 | 9786/9838 | 0 | 8792 / 7745360 / 483638 | 7701 / 6434282 / 1604389 | 6407 / 6147927 / 1516005 |
