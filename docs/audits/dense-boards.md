# Dense clinical boards

`dense-reference-v12` keeps the live two-patient ED note in the dense family
through signing. On the same 36 workflow checkpoints, v11 selected dense 7
times and the checked fixed shell 29 times. V12 selected dense 36 times. The
second patient's chart version stayed at 1. This workflow has synthetic live
sessions and a real native commit service and database.

## Geometry and ownership

The checker found two separate problems when two patient sessions showed
the same retained ED track-board state. At 1440×900 v11 exposed 27 targets in one scroll window
at a limit of 15. At 1920×1080 both panes' buttons could be attached to the
first table because both patients used the same component ID. V12 admits that
board at all three viewports. At 1440×900 it shows 10 targets initially and at
most 14 per scroll window. Both selected layouts paint 619 boxes. The maximum
body scroll offset falls from 33,820 px (v11 fixed fallback) to 2,759.14 px
(v12 dense), a 91.8% reduction. This is the scrollable extent of a composed
screen, separate from the distances traversed by retained events.

Each pane lays out its own tables, record actions and structural gutter.
Narrow tables wrap a record across column tracks and keep its button beside
its first band. The pane caption provides the horizontal bounds for the
patient's pinned acknowledgment, commit and dialog. Board-wide demands retain
their Lean-supplied patient labels. The painter resolves grid cell clicks with
the patient and table identity and dispatches through the originating session.

The scrolling body remains a single region. Board navigation headings share
a row with their links. At the density-checked viewport, the generator
subtracts the pinned targets from the screen limit and examines ordinary
targets in vertical order when the body is active. With a modal open, G10
counts the urgent and modal targets. Where a window is too crowded,
it spreads the additional height across the affected rows, including their
labels and cells. The same untrusted geometry goes through native or WASM
family admission at every supported viewport. The frozen limits, semantic
paths, windowing, strip capacity and G1–G11 are unchanged. This change
introduces no Lean definitions, theorems or axioms.

## Retained traces

The comparison covers every retained no-agent event pre-state in
`core-10day` and `rules3-10day-invalid-simloop`. The board subset includes
the two named ED screen IDs, landing screens displaying the track-board
presentation, and screens containing a board or a patient pane. Both Lean
meters process the complete day and attribute the event delta to its
pre-state. Browser board costs come from the stored Chromium atlas and
task-conserving event attribution. Travel to a board target is charged to the
board event, including travel from another screen. Whole-day costs retain the
existing rounding. Board pixels are summed before rounding for each persona
and recording. All pixel columns use the recorded
1440×900 desktop. The traces predate list paging and contain no extra page
actions. These are geometry costs on synthetic traces.

Both versions admitted all **439 of 439 board states** at the frozen limits, with zero fixed fallbacks. P2 visited 410 named ED board states. P3 saw 29 embedded boards on landing screens. Both versions covered **132,843 of 132,843 pre-states** across 84 retained persona-days, with zero mismatches, missing targets or refusals of both families. Across all screens each version admitted 132,838 dense states and used fixed fallback for 5 non-board states.

Every cost cell is **scroll count / scroll px / pointer px**. The two admission
columns count dense / same-limit fixed fallback. The other persona/recording
pairs have zero board states and zero board cost.

| Recording | Persona | Board states | v11 admitted / fallback | v12 admitted / fallback | Fixed | Dense v11 | Dense v12 | Stored browser |
|---|---|---:|---:|---:|---|---|---|---|
| core-10day | P2 | 244 | 244 / 0 | 244 / 0 | 238 / 2,268,328 / 102,232 | 54 / 3,960 / 127,643 | 54 / 2,448 / 128,875 | 91 / 68,135 / 191,906 |
| core-10day | P3 | 17 | 17 / 0 | 17 / 0 | 0 / 0 / 1,020 | 0 / 0 / 7,477 | 0 / 0 / 8,168 | 0 / 0 / 4,620 |
| rules3-10day-invalid-simloop | P2 | 166 | 166 / 0 | 166 / 0 | 160 / 1,537,092 / 70,088 | 46 / 3,640 / 82,625 | 46 / 2,352 / 83,414 | 64 / 49,423 / 126,798 |
| rules3-10day-invalid-simloop | P3 | 12 | 12 / 0 | 12 / 0 | 0 / 0 / 720 | 0 / 0 / 5,314 | 0 / 0 / 5,806 | 0 / 0 / 1,699 |

**All retained event pre-states, including the board subset**

| Recording | Persona | States | Fixed | Dense v11 | Dense v12 | Stored browser |
|---|---|---:|---|---|---|---|
| core-10day | P1 | 15,753 | 13,389 / 41,493,044 / 883,512 | 9,901 / 7,313,140 / 4,049,937 | 9,901 / 7,313,140 / 4,049,937 | 10,029 / 10,140,457 / 3,538,181 |
| core-10day | P2 | 26,779 | 21,943 / 31,673,788 / 3,224,100 | 21,432 / 15,253,598 / 6,279,366 | 21,432 / 15,252,086 / 6,279,988 | 23,739 / 21,103,992 / 5,768,934 |
| core-10day | P3 | 10,410 | 7,198 / 22,121,560 / 1,122,508 | 5,680 / 4,633,170 / 3,315,333 | 5,680 / 4,633,170 / 3,316,011 | 6,730 / 6,689,826 / 3,046,256 |
| core-10day | P4 | 11,216 | 9,746 / 20,479,680 / 908,120 | 7,413 / 5,489,062 / 2,470,541 | 7,413 / 5,489,062 / 2,470,541 | 8,075 / 7,673,840 / 2,544,165 |
| core-10day | P5 | 13,122 | 11,841 / 20,090,076 / 629,848 | 10,412 / 8,305,780 / 2,262,997 | 10,412 / 8,305,780 / 2,262,997 | 10,602 / 9,826,197 / 2,059,013 |
| rules3-10day-invalid-simloop | P1 | 12,183 | 10,436 / 29,692,348 / 674,130 | 7,686 / 5,792,770 / 2,886,752 | 7,686 / 5,792,770 / 2,886,752 | 8,684 / 13,082,999 / 2,576,979 |
| rules3-10day-invalid-simloop | P2 | 17,039 | 13,872 / 20,207,752 / 2,169,484 | 13,506 / 9,492,364 / 3,834,985 | 13,506 / 9,491,076 / 3,835,442 | 15,550 / 18,267,105 / 3,442,477 |
| rules3-10day-invalid-simloop | P3 | 7,901 | 5,569 / 16,229,564 / 938,542 | 4,934 / 4,074,468 / 2,562,203 | 4,934 / 4,074,468 / 2,562,694 | 5,690 / 5,811,207 / 2,382,515 |
| rules3-10day-invalid-simloop | P4 | 8,602 | 7,435 / 15,780,184 / 643,914 | 5,873 / 4,237,356 / 1,951,941 | 5,873 / 4,237,356 / 1,951,941 | 6,270 / 6,397,272 / 1,855,322 |
| rules3-10day-invalid-simloop | P5 | 9,838 | 8,862 / 14,975,176 / 460,918 | 7,598 / 5,983,894 / 1,641,064 | 7,598 / 5,983,894 / 1,641,064 | 6,407 / 6,147,927 / 1,516,005 |

Across both recordings, the 439 board events took 100 scrolls in either dense
version. V12 reduced board scroll distance from 7,600 to 4,800 px (36.8%)
and increased pointer travel from 223,059 to 226,264 px (1.4%). The fixed
shell took 398 scrolls and 3,805,420 scroll px. The stored browser took 155
scrolls and 117,558 scroll px. Across all pre-states the dense scroll count
was 94,435 in both versions, scroll distance fell by the same 2,800 px, and
pointer travel rose by 2,248 px. Travel to the next event on another screen
also depends on the board target's position. P1, P4 and P5 costs were equal
between versions in both recordings.

There are no composed `board` or `patientPane` nodes in either retained
recording. The live note above supplies separate session-level evidence.
A synthetic size check composed 1, 2, 3, 4 and 6 patient screens with
identical table and action IDs. Each patient had 20 rows, 10 columns, a
primary action, an alert and an acknowledgment. V11 refused dense for all
five boards. V12 admitted all five at the default limit of 15. The two-patient
regression checks the first, middle and last row in both panes, including
the variant with a modal in the second pane. Shape admission is per case.

## New specification for owner review

- `spaceBoardRows` defines the spacing of crowded board rows. `layoutFor`
  receives the caller's existing target limit. Its pane-local `arrange`,
  `paneTrack` and `pinnedRows` place dense pane bodies and pinned controls.
  A `trackBoard` structural hint selects board geometry for the ED presentation.
- The grid's `tableKey` pairs the patient namespace with its table component.
  The occurrence mirror assigns the pane namespace and component/alert IDs
  to urgent geometry. The Lean interpreter owns clinical dispatch.
- `showsTrackBoard` and the `board` subtotals in `visited.mjs` define the
  retained measurement subset and its event indices. `board-report.mjs`
  joins days by `dayKey`, checks complete equal denominators and target
  coverage in `readDays` and the comparison loop, and sums costs with
  `accumulate`. The `--world` argument selects the worktree copy of the
  recorded schedules. These are measurement definitions.
- `boardPatients` and its button constructor define the repeated-ID test
  fixture. Its test helper `boxOf` selects the painted box by source path.
  The live workflow's `boardReady` checks dense selection after the
  initial load and the interactions under test.

## Reproduction

Run from the worktree root. All output and caches below are local and
untracked. The baseline uses the earlier generator and its own admission
module with the same reporting code and frozen policy.

```sh
export TMPDIR=/home/saithat/Projects/run-tmp
export PATH="$HOME/.elan/toolchains/leanprover--lean4---v4.35.0/bin:$PATH"
export LEAN_NUM_THREADS=2 pnpm_config_verify_deps_before_run=false
out="$TMPDIR/board-v12"
mkdir -p "$out/v11"
cp scripts/layout-reference/*.mjs "$out/v11/"
for module in generator admission; do
  git show "4a83dfee:scripts/layout-reference/$module.mjs" > "$out/v11/$module.mjs"
done
for version in v11 v12; do
  runner=scripts/layout-reference/visited.mjs
  if [ "$version" = v11 ]; then runner="$out/v11/visited.mjs"; fi
  for persona in P1 P2 P3 P4 P5; do
    node --max-old-space-size=2500 "$runner" --recordings-root "$PWD" \
      --world runs/world/2 --personas "$persona" --out "$out/$version-$persona" \
      --frozen-snapshots "$TMPDIR/reference-layouts/native-screens"
  done
done
before=$(printf '%s,' "$out"/v11-P*/visited.json)
after=$(printf '%s,' "$out"/v12-P*/visited.json)
node --import ./agent/node_modules/tsx/dist/loader.mjs scripts/layout-reference/board-report.mjs \
  --before "${before%,}" --after "${after%,}" > "$out/comparison.json"
```

The composed example uses the first screen record in snapshot
`7096e293916b9338827e83981e75238cb22799ac57b866eacf726a7f37f7c79b`
(task `d01-P2-W3-001`). To reproduce its maximum body offset:

```sh
python3 - "$TMPDIR/reference-layouts/native-screens/7096e293916b9338827e83981e75238cb22799ac57b866eacf726a7f37f7c79b.jsonl.gz" "$out/ed.json" <<'PYTHON'
import gzip, json, sys
with gzip.open(sys.argv[1], 'rt') as stream, open(sys.argv[2], 'w') as target:
    json.dump(next(r['screen'] for r in map(json.loads, stream) if r['kind']=='screen'), target)
PYTHON
node --input-type=module - "$out" <<'JS'
import {readFileSync} from 'node:fs';
import {native} from './scripts/layout-reference/admission.mjs';
const out = process.argv[2], screen = JSON.parse(readFileSync(out + '/ed.json'));
const board = native({op:'board-screen', panes:['Ada','Blair'].map(patient => ({patient, screen}))});
for (const dir of [out+'/v11', process.cwd()+'/scripts/layout-reference']) {
  const {ReferenceLayouts} = await import(dir+'/admission.mjs');
  const {geometryFor} = await import(dir+'/geometry.mjs');
  const cache = new ReferenceLayouts(), result = cache.get(board, {maxTargetsPerViewport:15});
  const paint = cache.paint(result, board);
  console.log(result.denseAccepted, paint.boxes.length, geometryFor(board, paint).scrollers);
}
JS
```

Baseline P1 and P5 reused matching checksummed native receipts from
`$TMPDIR/alert-mark/evidence`. The checks bind the binary, layout trees and
limit. Both versions matched the checksummed compressed snapshots against
each day's complete recorded event sequence. Shorter first passes with the
named ED screens alone were superseded by the inclusive landing-screen count.

```sh
node scripts/wasm-assets.mjs
node --test --test-concurrency=1 scripts/layout-reference/*.test.mjs scripts/ui-library/*.test.mjs
pnpm --filter app typecheck
pnpm --filter app lint
pnpm --filter app test --maxWorkers=1
pnpm --filter app exec vitest run tests/lean-painter.test.ts tests/lean-board.test.ts tests/lean-reference.test.ts --maxWorkers=1
pnpm --filter agent typecheck
pnpm --filter agent lint
pnpm --filter agent test --maxWorkers=1
pnpm --filter app build
node --test app/scripts/lean-bundle.test.mjs
docker run --rm -d --name vgi-board-v12-dom -e POSTGRES_PASSWORD=synthetic-painter-test \
  -e POSTGRES_DB=painter -p 127.0.0.1:55549:5432 --memory=512m postgres:16.15
export DATABASE_URL=postgres://postgres:synthetic-painter-test@127.0.0.1:55549/painter
export EHR_BIN="$PWD/lean/.lake/build/bin/ehr"
flock "$TMPDIR/vgi-browser-heavy.lock" pnpm --filter app exec playwright test \
  --config src/lean-ui/playwright.config.ts workflows.pw.ts --workers=1
docker stop vgi-board-v12-dom
export EHR_SCREEN_WORKERS=1 EHR_SCREEN_MAX_WORKERS=1
node scripts/audit-alert-policy.mjs "$out/audit-templates"
node scripts/audit-alert-policy.mjs "$out/audit-personas" --personas
```

**Native and browser tests.** All 86 reference and UI-library tests passed.
The WASM tests compare the JSON bytes for the composed board and for family
admission and painting at each viewport. The standalone patient-pane regression
also passed with repeated table IDs. The packaged WASM manifest verified the
unchanged Lean source hash `7aec9deb986290444147ac418d57b5236ca008c6d8cd7670bcb39e3e5fba50b1`.

Both packages passed typecheck and lint. The agent unit suite passed 390 tests
with two skips. The three painter, board and reference app unit files passed
23/23. The full app suite passed 380 with two skips and one failure in
`tests/app.test.tsx:125`. Its catalog expects 1,442 patients. The supplied
indices contain 150 Synthetic Hospital patients and 174 Synthea patients,
so the catalog contains 324. The same 1,118-patient shortfall was [recorded
previously](alert-occurrence.md). The application build and the built Lean
entry's dependency test passed.

The final Playwright run passed all five live/widget workflows. All 46 measured
DOM snapshots had **0 px rectangle deviation**. Maximum text-line and vector
deviation were also zero. Intrinsic glyph widths differed by at most 1/64 px.
The live P2 note had 375 boxes at each of 1280×800, 1440×900 and 1920×1080.
The differential now asserts exact rectangle equality. The initial baseline
used the same P2 workflow with its dense/fixed selection logged at every
checkpoint. The two disposable Postgres containers were stopped.

The two full screen audits ran sequentially under the shared browser lock with one worker.

| Audit | Status | Controls | Physical states | Measurements | Physical findings | Density failures | Retries |
|---|---|---|---:|---:|---:|---:|---:|
| Templates | pass | pass | 1,956 | 18,774 | 0 | 0 | 0 |
| Personas | pass | pass | 1,394 | 13,428 | 0 | 0 | 0 |

The template audit measured all 1,956 states afresh. The persona audit
measured 920 states afresh and reused the audit cache for 474 matching trees.

The certified app hash changed from
`192a4936601ec4de80cd81e92661f5a2bee44ccca0dcfa1072f17f99c9d7c83f` to
`efbad213b192ecf1856e6f1208803b93c011a66fb05350ce9337494808af39f9`.
Historical certificates retain their original bindings.
