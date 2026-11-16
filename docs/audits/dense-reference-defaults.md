# Dense reference defaults

The shared `dense-reference-v8` generator supplies default geometry to the
opt-in Lean nightly mode and the experimental `/lean.html` page. Missing custom
shape cases receive this default; matching custom cases must pass independently.
Dense refusal tries the fixed shell at the same unchanged vendor screen limit.
Neither a transport error nor refusal of both families becomes successful
fallback. No rule, theorem statement, density limit or default was changed; v8
follows the display-part inventory (one occurrence per field label, control,
annotation, table cell, tab and button reason) and the faster G3/G4 decision
procedures of the layout checker.
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
`/home/saithat/Projects/run-tmp/display-lane/dense-v8b/` (v7:
`/home/saithat/Projects/run-tmp/dense-v7/`); nothing there is tracked in git.
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
node --import ./agent/node_modules/tsx/dist/loader.mjs scripts/layout-reference/report.mjs --out "$TMPDIR/dense-v8"
node scripts/layout-reference/visited.mjs --out "$TMPDIR/dense-v8" \
  --frozen-snapshots "$TMPDIR/reference-layouts/native-screens"
node scripts/layout-reference/benchmark.mjs --out "$TMPDIR/dense-v8" --count 100
node scripts/layout-reference/summary.mjs --out "$TMPDIR/dense-v8"
node scripts/discovery/smoke.mjs "$TMPDIR/dense-v8/nightly-smoke-bound"
node scripts/layout-reference/nightly-benchmark.mjs "$TMPDIR/dense-v8/nightly-real-bound"
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
DENSE_LAYOUT_SHOTS="$TMPDIR/dense-v8/page-visual" \
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

Fields are laid out as label, control and annotations, tables as caption,
header row and value cells in column tracks, tabs in one row and button
reasons inline ([reference layouts](../methods/reference-layouts.md)). The
banner is still one part; row actions are not attached to their table rows;
column tracks are equal width; cells are one-line safety scrollers; records
merged on one line by today's application stay separate rows. Charts, icons,
clinical chrome, complete ARIA relationships and broader assistive technology
behavior remain different from today's application. See the detailed
[widget inventory](../methods/lean-painter.md).

## Program coverage and timing results

With display parts (v8) the Program/variant corpus admits **4,086/4,371 dense
cases (93.48%)**; v7 admitted 4,146 (94.85%). All **285 dense refusals are
G10**, and **every** one is recovered by the same-limit fixed shell: zero cases
refuse both (v7: 81, the `w2Result` variants at limit 11). Each release has the
same counts: P1 311/339, P2 164/173, P3 118/127, P4 295/323, P5 474/495.

The cold benchmark checks 100 distinct families from 175 states in **33.2 s,
3.07 shape admissions/s** (v7: 7.98 s, 12.88/s). A screen now has three to
five times as many occurrences, and the checker's cost grows with the square
of the number of boxes: on the largest retained screen (`w2Result`, 10,930
parts, two long result tables) one native `family-check` takes 92 s and one
single-viewport check 33 s, after the G3/G4 procedures stopped being cubic
(a 1,000-part screen went from 10.5 s to 1.1 s per family paint). The WASM page
was not measured on such a screen; it would be slower than native.

The nightly-mode timings, manifest counts and two-day scripted/replay runs of
v7 were **not** measured again for v8.

The P1/P3 browser workflows pass with v8 (2/2, one worker); all five page
selections (`P1-landing`, `P1-document`, `P1-orders`, `P1-sign`,
`P3-assessment`) used the dense layout. Screenshots are under
`/home/saithat/Projects/run-tmp/display-lane/page-visual/`.

## Retained-state coverage and three-way costs

v8 rechecked **131,308 of the 132,843** retained event pre-states (83 of 84
persona-days). `core-10day` P1 day 10 (1,535 states) was **not** rechecked: its
long `w2Result` tables made each day take up to two hours and the run was
stopped. Of the rechecked states **125,143 (95.30%)** are admitted dense (v7:
96.66% of all 132,843). All **6,165** refusals are **G10**, all recover with the
fixed shell at the same limit, and there are zero missing target bindings,
zero mismatches and zero states refusing both. The per-persona recheck ran in
separate processes (one output directory per persona and recording) with the
native call timeout raised to 30 minutes (`REFERENCE_NATIVE_TIMEOUT_MS`).

Columns are **scroll count / scroll pixels / pointer-travel pixels** on the
same retained traces; "Stored browser" is the historical browser atlas, as in
v7. For `core-10day` P1 all three columns cover the same nine days.

| Recording | Persona | Days | Dense / states | Both refused | Fixed | Dense/fallback | Stored browser |
|---|---|---:|---:|---:|---|---|---|
| core-10day | P1 | 9 | 12781/14218 | 0 | 12076 / 52734252 / 809662 | 9562 / 22225732 / 2991469 | 9038 / 9072317 / 3184800 |
| core-10day | P2 | 10 | 26478/26779 | 0 | 21943 / 38650212 / 3224100 | 21563 / 18057810 / 6081656 | 23739 / 21103992 / 5768934 |
| core-10day | P3 | 10 | 9946/10410 | 0 | 7198 / 24695656 / 1122508 | 5254 / 4013646 / 3170071 | 6730 / 6689826 / 3046256 |
| core-10day | P4 | 10 | 10904/11216 | 0 | 9746 / 20390192 / 908120 | 7530 / 6726096 / 2312241 | 8075 / 7673840 / 2544165 |
| core-10day | P5 | 10 | 12926/13122 | 0 | 11841 / 22404276 / 629848 | 10385 / 9637464 / 2165024 | 10602 / 9826197 / 2059013 |
| rules3-10day-invalid-simloop | P1 | 7 | 11079/12183 | 0 | 10434 / 38263080 / 674714 | 8104 / 15147608 / 2410428 | 8684 / 13082999 / 2576979 |
| rules3-10day-invalid-simloop | P2 | 6 | 15086/17039 | 0 | 13872 / 24212984 / 2169484 | 13829 / 17005268 / 3551437 | 15550 / 18267105 / 3442477 |
| rules3-10day-invalid-simloop | P3 | 7 | 7901/7901 | 0 | 5569 / 18124212 / 938542 | 4637 / 3662556 / 2401804 | 5690 / 5811207 / 2382515 |
| rules3-10day-invalid-simloop | P4 | 7 | 8346/8602 | 0 | 7435 / 15735440 / 643914 | 5962 / 5191202 / 1834723 | 6270 / 6397272 / 1855322 |
| rules3-10day-invalid-simloop | P5 | 7 | 9696/9838 | 0 | 8862 / 16654224 / 460918 | 7537 / 6794934 / 1576032 | 6407 / 6147927 / 1516005 |

On `core-10day` dense pointer travel is **16.72M px against 16.60M** for the
stored browser atlas on the same days (v7: 17.1M against 17.0M over ten days).
Dense scroll distance is close to the browser's for P2–P5 (P3 4.0M against
6.7M, P5 9.6M against 9.8M) but **2.4 times** the browser's for P1 (22.2M
against 9.1M): each result row is now one row of cells, so long result tables
are as long as in today's application, while the stored browser atlas was
measured with an earlier build. The fixed shell, at one 56px row per part, now
scrolls three to six times further than before.
