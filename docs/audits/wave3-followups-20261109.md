# Wave-3 follow-ups, 2026-11-09

Implementation: `ea5f03a5`; final rebase base `08431b76`. [Authoring method and verified N18 figures](../methods/note-authoring.md);
[inpatient scenario and snapshot contract](../methods/workflow-phases.md#inpatient-imaging).
Source facts were verified with `paperclip skill`, `paperclip lookup doi
10.1001/jamanetworkopen.2021.15334`, and `paperclip cat --lines 15-60` /
`--lines 60-69 /papers/PMC8290305/content.lines`, plus `meta.json`.
No clinical spec, property, statement or theorem was weakened or edited.

## Matched note comparison

Seed 1, ten consecutive days, restored Synthea fixtures (174 patients), realistic
workflows, continuous world/queue clocks, expert policy and canonical releases
v1/v2/v3 (days 1–3/4–6/7–10). All three arms share case mix and clinical tasks.
Their directory contexts were frozen before the W2 message-presentation fix;
corrected contexts are verified on regenerated library worlds separately.

| Persona | Keystrokes: phrases → full → template | Native KLM minutes: phrases → full → template |
|---|---:|---:|
| P1 | 72,677 → 155,857 → 76,972 | 6,198.5 → 6,690.9 → 6,449.6 |
| P2 | 123,214 → 305,287 → 164,489 | 6,457.4 → 7,232.9 → 6,778.3 |
| P4 | 26,142 → 90,775 → 36,575 | 1,059.5 → 1,336.7 → 1,162.2 |
| P5 | 20,248 → 44,450 → 25,336 | 1,291.5 → 1,396.1 → 1,334.9 |

A direct input comparison passed for all 50 persona-days: clinical tasks and
context bytes are identical across arms, and full/template section text is
identical. Every arm completes 1,947/1,947 tasks. P3 is unchanged. Full/template scroll counts
match. Minutes are the wave3 native `klmDeciSec` aggregate, including length-based
reading and interruption/return service; they are not pure operator sums or
observed clinical performance. See [methods](../methods/note-authoring.md) for
provenance and interpretation. [JSON](wave3-followups-20261109.json) records all
five roles, input hashes and origin assignment totals.

The 4,523 supplied dataset sections contain 846,825 characters: 472,326 template,
126,649 copied and 247,850 free text. These are **scheduled section inputs**;
only sections actually entered incur authoring operators. Section draws use the
pooled calibrated probabilities in expectation; section assignment, operator
counts, 5% copy editing and setting extrapolation remain declared scenarios.

Generation and measurement commands (run sequentially for each `arm`):

```sh
# phrase: note_mode=legacy, authoring_mode=full
# full: note_mode=synthetic-hospital, authoring_mode=full
# template: note_mode=synthetic-hospital, authoring_mode=template
pnpm --config.verify-deps-before-run=false --filter world gen --seed 1 --days 10 \
  --case-mix synthetic-hospital --note-text "$note_mode" --note-authoring "$authoring_mode" \
  --out "/home/saithat/Projects/VGI-w3-followups/runs/world/w3follow-$arm" --adt off --quiet
node scripts/synthetic-hospital/check-world.mjs --world runs/world/w3follow-full \
  --baseline runs/world/w3follow-phrase --simulate --jobs 2
node scripts/synthetic-hospital/check-world.mjs \
  --world /home/saithat/Projects/VGI-w3-followups/runs/world/w3follow-template --simulate --jobs 2
```

The independent template measurement overlapped the phrase arm (four native
workers total). A redundant automatic template invocation was stopped after the
full/phrase report completed. This did not interrupt either retained measurement.

## Verification

```sh
export TMPDIR=/home/saithat/Projects/run-tmp CI=true LEAN_NUM_THREADS=4
export VGI_LEAN_SLOT=/home/saithat/Projects/lane-logs/post/lean-slot.sh
# The slot was held around native build and type generation; contract tests use it too.
$VGI_LEAN_SLOT acquire w3follow
(cd lean && lake build && lake exe gents)
$VGI_LEAN_SLOT release w3follow
pnpm --config.verify-deps-before-run=false -r lint
pnpm --config.verify-deps-before-run=false -r typecheck
pnpm --config.verify-deps-before-run=false --filter world exec vitest run --maxWorkers=1
pnpm --config.verify-deps-before-run=false --filter agent exec vitest run test/lean-types.test.ts test/simulation-modes.test.ts test/workflow-protocol.test.ts test/note-authoring.test.ts --maxWorkers=1
node --test world/realism/*.test.mjs

```

- Lean build: passed, 557 jobs; generator: 201 types / 42 samples. New effort
  definitions print only `propext`, `Classical.choice`, `Quot.sound`; no theorem
  was edited. Earlier build warnings are pre-existing unused-simp warnings.
- World: 148 passed. After subsequent targeted changes, decoder/authoring
  suites (20 then 12 tests) and snapshot/routing suites (5 tests) passed.
- Agent: all four targeted files passed **29 tests after the final rebase**,
  including expert/bounded authoring, both imaging modalities with stat priority
  under v2/v3, codecs, simulation modes and workflow protocols. Agent lint and
  typecheck also passed on the rebased branch.
- Realism: 5 passed, no skips, including 1,442 charts and byte regeneration.
- All-package lint/typecheck passed; later changed-package checks also passed.
- `node scripts/synthetic-hospital/mix.mjs --check` passed against the pinned DB.
  Pinned source hashes were checked during restoration/conversion.
- `git diff --check` passed. Library legacy reproduction also matches pinned
  SHA-256 digests, retaining the original release-era files separately.

Additional advisory check: `python scripts/verify-workflow-sources.py` fails
262 frozen assumption-inventory hash/line checks. An exported `36cd547e` source
copy fails 243 of those checks already. N18's metadata/dated-retention checks
pass; the additional drift concerns changed simulator file hashes/line positions.
Refreshing that historical inventory is outside this lane.

No app source, lockfile, Vite config or HTML changed, so the certified app source
hash is unchanged. Native Lean changed. Browser audit pair was skipped because
this lane changed no app code; conformance was skipped because specs/programs
were unchanged. Packaged WASM rebuilding, certificate re-issuance, full merge
verification and Later decisions remain with their designated lanes. No data
was tracked and nothing was pushed.

Owner question: should the fitting lane refresh the frozen assumption inventory
against current wave-3 source locations and hashes?
