# Alert occurrence regression verification

The severity mark now belongs to its alert's own display part. Three urgent
alerts plus an acknowledgment occupy four strip occurrences, where the earlier
separate severity parts made seven and exceeded the unchanged six-occurrence
capacity. The restored five-alert/one-acknowledgment and four-alert/two-acknowledgment
Lean guards pass, including the modal case.

**New specification for owner review:** the changed definitions and the geometry
contract are listed in [Alert severity within one occurrence](../methods/alert-occurrence.md).
Existing theorem statements remain intact. No protected clinical definition,
density limit, strip capacity or screen-state enumeration was changed.

## P5 reproduction

The retained reproduction is under
`/home/saithat/Projects/run-tmp/paging/p5repro/out/`. Both interaction popup
variants on each screen now have an admitted fixed-shell fallback:

| Screen states | Frozen limit | Dense maximum | Dense result | Fixed shell |
|---|---:|---:|---|---|
| `w2Result-popup-interactionOrder`, `w2Result-popup-interactionRefill` | 20 | 21 | G10 refusal | G1–G11 pass; four urgent occurrences |
| `w6Consult-popup-interactionOrder`, `w6Consult-popup-interactionRefill` | 25 | 31 | G10 refusal | G1–G11 pass; four urgent occurrences |

The dense G10 refusals are retained. The fix is the strip's occurrence count;
there is no relaxation of the density rule. The native results are retained in
`$TMPDIR/alert-mark/p5repro.json`.

## Build and test checks

Commands run from this worktree with:

```sh
export TMPDIR=/home/saithat/Projects/run-tmp LEAN_NUM_THREADS=2
export pnpm_config_verify_deps_before_run=false
```

| Commands | Result |
|---|---|
| `cd lean && lake build` | Passed, 659 jobs |
| `cd lean && lake build ui-layout` | Passed, 152 jobs |
| `cd lean && lake build Ehr.Layout.Strip` | Passed, 87 jobs, including restored guards |
| `cd lean && lake env lean "$TMPDIR/alert-mark/Axioms.lean"` | Nine explicit theorem checks; only `propext`, `Classical.choice`, `Quot.sound` (or no axioms) |
| `PATH="$HOME/.elan/toolchains/leanprover--lean4---v4.35.0/bin:$PATH" JOBS=2 make wasm` then `make wasm-check` | Passed |
| `node --test --test-concurrency=2 scripts/ui-library/*.test.mjs scripts/layout-reference/*.test.mjs` | 83 passed; native/WASM byte equality includes the six-occurrence strip |
| `pnpm --filter app typecheck` and `pnpm --filter app lint` | Passed |
| `pnpm --filter app test --maxWorkers=2` | 379 passed, two skipped, one fixture-count failure |
| `pnpm --filter agent typecheck` and `pnpm --filter agent lint` | Passed |
| `pnpm --filter agent test --maxWorkers=2` | 390 passed, two skipped |
| `pnpm --filter @vgi/commit typecheck` and `pnpm --filter @vgi/commit lint` | Passed |
| `pnpm --filter app build` and `node --test app/scripts/lean-bundle.test.mjs` | Passed; bundle check 1/1 |

The app unit failure is `tests/app.test.tsx`'s catalog-count assertion: the
restored local catalog has 324 patients (174 Synthea and 150 Synthetic Hospital),
where the test requires 1,442 (174 and 1,268). The missing 1,118 fixture records
were not invented, and the assertion was not changed.

The explicit axiom file checks `alert_one_part`, `ownPart_text`,
`wrap_line_width`, `scroll_line_width_inset`, `scroll_line_width`,
`alertSquare_inside`, `alertSquare_side`, `widgetBox_rect` and
`widgetBoxes_rects`. The proof-only adjustment to private `Range.leaf_plain`
is also axiom-audited by its module's existing print command.

## DOM verification

A disposable Postgres container was created for the real commit-service tests:

```sh
docker run --rm -d --name vgi-alert-mark-postgres \
  -e POSTGRES_PASSWORD=synthetic-painter-test -e POSTGRES_DB=painter \
  -p 127.0.0.1:55543:5432 --memory=512m postgres:16.15
export DATABASE_URL=postgres://postgres:synthetic-painter-test@127.0.0.1:55543/painter
export EHR_BIN="$PWD/lean/.lake/build/bin/ehr"
export DENSE_LAYOUT_SHOTS="$TMPDIR/alert-mark/screenshots"
flock "$TMPDIR/vgi-browser-heavy.lock" pnpm --filter app exec playwright test \
  --config src/lean-ui/playwright.config.ts --workers=1
LEAN_PAINTER_TEST_ALERT=1 flock "$TMPDIR/vgi-browser-heavy.lock" \
  pnpm --filter app exec playwright test --config src/lean-ui/playwright.config.ts \
  --workers=1 --grep 'P1: complete clinical'
docker stop vgi-alert-mark-postgres
```

All five standard workflows passed after the final painter change. The added
P1 allergy workflow passed as well, including the native popup states. Rectangle,
text-line-width and vector-stroke deviations were zero; intrinsic glyph rounding
was at most 1/64 px. The extra strip fixture paints five severity icons and one
acknowledgment in six occurrences at all three supported desktop sizes.

The allergy test exposed a retained scroll translation of 150 px after the
browser reset the actual scroller to zero during modal opening. The painter now
reconciles actual offsets after each patch. The final checks retain the original
1/64 px tolerance and require no added timing delay. Screenshots are under
`$TMPDIR/alert-mark/screenshots`, `$TMPDIR/painter-parity/`, and
`$TMPDIR/lean-alert-*.png`.

## One-day Lean replay

Fresh replays use the copied world and replay backend, with no model call:

```sh
export NODE_OPTIONS=--max-old-space-size=6144
for persona in P5 P1; do
  pnpm --filter agent run-days --screens lean --backend replay \
    --replay-from "$PWD/runs/lean-night-2day-p135-recorded-limits" \
    --days 1 --personas "$persona" --world "$PWD/runs/paging-world" \
    --runs-root "$TMPDIR/alert-mark/runs" \
    --run-id "alert-occurrence-$persona" --seed-policy none
done
```

| Persona | Exported screen corpora, each passing G1–G11 | Tasks completed, each arm | Events, each arm | Screen failures / infrastructure errors |
|---|---|---:|---:|---:|
| P1 | 375 at initialization; 380 and 379 with day context | 42/42 | 2,377 | 0 / 0 |
| P5 | 547 at initialization; 565 and 560 with day context | 18/18 | 1,309 | 0 / 0 |

Both the no-agent and agent arms complete each persona's day with no missing
target bindings. Dense layouts retain the G10 refusals above and select the same-limit
fixed shell. The run manifest reports `screenGate: lean`, generator v11 and
`browserCertified: false`; this is native layout evidence, not a browser
certificate. Per-state values reuse admissions only for the same bound shape,
layout trees, executable and limit.

Two earlier combined-persona attempts exhausted Node's default 2 GB heap after
initial screen admission. The separate final runs use the bounded 6 GB heap
above; this is a resource setting, not a change to layout rules or their inputs.
Final run artifacts are under `$TMPDIR/alert-mark/runs/alert-occurrence-P5/`
and `$TMPDIR/alert-mark/runs/alert-occurrence-P1/`.

## Retained P1/P5 geometry

The v11 generator output changed, so all 34 retained P1/P5 persona-days were
rechecked: 50,896 event pre-states from `core-10day` and
`rules3-10day-invalid-simloop`, with zero missing targets, zero replay mismatches
and zero states without an admitted layout. Every compressed snapshot was
checksummed and its complete event sequence matched to the retained recording.
Other personas' v10 retained-state figures were not regenerated.

| Recording | Persona | Dense / states (v11) | v10 scrolls / scroll px / travel px | v11 scrolls / scroll px / travel px |
|---|---|---:|---|---|
| core-10day | P1 | 15,753/15,753 | 9,894 / 7,261,388 / 4,040,414 | 9,901 / 7,313,140 / 4,049,937 |
| core-10day | P5 | 13,119/13,122 | 10,435 / 8,242,534 / 2,250,692 | 10,412 / 8,305,780 / 2,262,997 |
| rules3-10day-invalid-simloop | P1 | 12,183/12,183 | 7,687 / 5,753,130 / 2,879,611 | 7,686 / 5,792,770 / 2,886,752 |
| rules3-10day-invalid-simloop | P5 | 9,836/9,838 | 7,618 / 5,963,434 / 1,635,106 | 7,598 / 5,983,894 / 1,641,064 |

Across both recordings, P1 changes by **+6 scrolls / +91,392 scroll px /
+16,664 travel px**; P5 by **−43 scrolls / +83,706 scroll px / +18,263 travel px**.
These are measured geometry tradeoffs, not an improvement claim.

All 27,936 P1 states remain dense-admitted. For P5, three core day-10 `w1Close`
states have a dense scroll-window count of 35 against the frozen limit 31;
two rules3 day-6 `w6Sign` states have 35 against 34. All five recover with the
same-limit fixed shell. A shorter urgent strip can expose more body targets to
G10; the density rule is retained. No state set or threshold was changed to
remove these refusals.

The v10 costs are the retained bounded-list figures already reported in
[dense reference defaults](dense-reference-defaults.md#bounded-lists-dense-reference-v10).
Their probe-limit-999 geometry had no fallback; all 10,987 baseline density
records were separately checked against today's unchanged frozen policy and
fit it. The v11 measurements use the frozen policy directly, including actual
fallback costs. Receipts bind the executable, generated trees and threshold;
verified matching receipts are reused across value states and recordings.

Reproduce from the repository root (each output directory is independent):

```sh
for run in core-10day rules3-10day-invalid-simloop; do
  for persona in P1 P5; do
    node scripts/layout-reference/visited.mjs \
      --out "$TMPDIR/alert-mark/evidence/$run-$persona" \
      --runs "$run" --personas "$persona" \
      --frozen-snapshots "$TMPDIR/reference-layouts/native-screens"
  done
done
```

The same old traces supply both cost columns. They predate paging and add no
page actions; these are retained-screen re-layouts, not fresh clinical replays
of the historical days or evidence of clinician benefit. Complete current
`visited.json` files and comparison totals remain under
`$TMPDIR/alert-mark/evidence/` and `$TMPDIR/alert-mark/cost-comparison.json`.

## Full browser audit pair

The full pair ran once, sequentially under the shared browser lock, after the
final painter build and single-worker Lean UI workflows:

```sh
node scripts/audit-alert-policy.mjs "$TMPDIR/alert-mark/audit-templates"
node scripts/audit-alert-policy.mjs "$TMPDIR/alert-mark/audit-personas" --personas
```

| Audit | Expected / covered states | Physical measurements | Findings | Screen / controls / density |
|---|---:|---:|---:|---|
| Templates | 1,956 / 1,956 | 18,774 | 0 | Pass / pass / no failures |
| Personas | 1,394 / 1,394 | 13,428 | 0 | Pass / pass / no failures |

The physical phases took 1,821,417 ms and 873,456 ms respectively. Both
`result.json` files report `status: pass` and `controlsStatus: pass`, with no
density failures. Their complete reports remain in the two audit directories.
An earlier prerequisite-only attempt stopped because `app/dist/build.json`
had not yet been generated; it ran no browser audit. Targeted allergy-workflow
iterations preceded the final successful five-workflow and allergy runs.

## Build bindings and scope

The app build hash changed to
`192a4936601ec4de80cd81e92661f5a2bee44ccca0dcfa1072f17f99c9d7c83f`.
The packaged WASM manifest binds Lean sources at
`7aec9deb986290444147ac418d57b5236ca008c6d8cd7670bcb39e3e5fba50b1`;
the interpreter is 5,443,402 bytes. Historical certificates were not rebound.
The changed app source is within the requested Lean painter work.

All patients, workloads and service writes in these checks are synthetic.
No live model was called. No push or change to another branch or worktree was
made. The pre-existing `app/public/verdicts.json` worktree change was left
untouched and excluded from the commit. Run data, fixtures and Programs remain
untracked.
