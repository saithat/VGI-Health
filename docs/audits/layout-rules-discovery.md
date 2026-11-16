# Layout rules and evidence-first nightly prompts

This is a local software and synthetic-simulation check. It establishes no
clinical benefit, human usability improvement, or browser screen certification.
The Lean Program schema, G1–G11, reference generator and deployed painter are
unchanged. [Language and admission](../methods/design-discovery.md) describes
the six rule kinds and their limitations.

## Recorded prompt reconstruction

Source: read-only `runs/lean-10day-stopped-day3` in the original repository.
All ten recorded `propose-0.request.json` files were rebuilt from their recorded
Program, inventory, odd-day training results and retained native UI witnesses.
Native witnesses are matched to the archived current Program hash and native
shape, then outlined with the current dense generator. No later outcome or
new simulation is used. Night 3 contains directories but no proposal requests
for P1–P5, so there are no night-3 prompts to rebuild.

Characters count JavaScript string length of system + user prompt, excluding
JSON output schemas. Evidence counts the same original training-summary block
plus the respective logs/trace/cost JSON, excluding headings in both versions.
Legacy flat-atlas states and overwritten event aliases are selected/rebuilt by
the committed trace hash; no other trace contributes pixel attribution.
The complete prompt JSON and exact counts remain gitignored under
`runs/layout-rules-prompt-measure/`.

| Persona/night | Before characters | After characters | Evidence before | Evidence after |
|---|---:|---:|---:|---:|
| P1/1 | 504,056 | 264,582 | 5.38% | 11.01% |
| P2/1 | 366,710 | 172,729 | 7.03% | 15.48% |
| P3/1 | 270,479 | 144,133 | 8.86% | 17.33% |
| P4/1 | 463,229 | 175,224 | 5.66% | 15.54% |
| P5/1 | 751,586 | 240,615 | 3.63% | 11.93% |
| P1/2 | 505,605 | 266,404 | 5.36% | 10.94% |
| P2/2 | 366,917 | 173,228 | 7.03% | 15.43% |
| P3/2 | 270,967 | 145,050 | 8.85% | 17.22% |
| P4/2 | 463,830 | 178,400 | 5.65% | 15.26% |
| P5/2 | 751,463 | 240,740 | 3.63% | 11.92% |

The reduced transport uses lossless component templates, visited-screen
fragments, relevant spec rows, one dense outline and representative native shape
per visited screen, and compact indexes for omitted reference material. This
measurement shows prompt size and ordering, not that the model makes better
choices. The existing browser propose/choose/repair golden bytes match all 35
frozen contexts, both archived and current specs.

## Native rule gate

Eight synthetic families passed through the complete screen gate, including
Program check, deterministic transform, three-viewport family checks, paint,
refusal fallback and artifacts. Six were admitted, one for each rule kind.
An unknown target was refused explicitly; 100 columns produced G3/G4 refusals.
The aggregate refusal counts are `layout-rule: 2`, `G3: 1`, `G4: 1` (one
candidate can violate several rules).

Local throughput: **2.936 candidates/s**, 2725.25 ms total. This is one
small fixture, not throughput on a clinical workday or a model-generation rate.
The benchmark uses fake clinical/semantic inputs and the real `ui-layout` binary.

## Scripted two-day exercise

`runs/layout-rules-smoke-final/{recorded,replay}` uses P1, P3 and P5, a scripted model,
fake clinical checker/simulator, synthetic semantic states, and real native
layout admission. The fixture deliberately puts 40 text cards ahead of controls;
the rule lifts the existing button occurrences before those cards. Candidates
mix this rule with ordinary scripted Program edits. No model is called.
Both passes completed with zero model/infrastructure errors and identical
outcomes/metrics. P1 deployed. P3 failed bounded validation (11 → 12 clicks in its replay),
and P5 did not improve independent replay; both retained their previous designs.

| Persona, day 2 | Clicks before → after | Scrolls before → after | Scroll pixels before → after | Travel pixels before → after |
|---|---:|---:|---:|---:|
| P1 | 75 → 63 | 24 → 0 | 14,736 → 0 | 5,496 → 4,044 |
| P3 | 30 → 30 | 15 → 15 | 8,940 → 8,940 | 3,480 → 3,480 |
| P5 | 41 → 41 | 11 → 11 | 6,796 → 6,796 | 3,120 → 3,120 |

These are against the independent no-agent arm on the same fake tasks; they
combine Program and rule changes, and do not isolate either effect. The
integration test separately replays the saved day through its stored rule atlas
and reproduces every task's metrics, then swaps only reference geometry on the
same trace and confirms different scroll/travel values. Another scripted test
forces rule refusals, verifies their presence in the repair prompt, and ships
the repaired candidate. Unknown targets, unsupported native dimensions,
large column counts without large allocation, missing bindings, and all rule
kinds have direct tests.

## Real short-run attempts

The confined Codex backend probe succeeded. The requested P1/P3/P5 run refused
initialization before a model call: P1's unchanged `w2Result` baseline has 13
simultaneous targets against its recorded limit of 11. An independent P3/P5
attempt stops on P5's same screen (12 against 11). These are native G10
refusals; they are not sandbox failures. Limits and generator code were left
unchanged. P3 can initialize and was attempted independently.

The independent two-day P3 run completed with zero model/infrastructure errors,
one deployment, and three confined model calls (propose, repair, choose); every
transcript passed the no-tool audit. Two initial candidates used layout rules:

* `assessment-entry-first`: first-viewport vital entry, an explicit field order,
  and six columns. Native G10 refused 40–41 visible targets against 30.
* `direct-patient-task-route`: layout rules plus Program navigation edits.
  The clinical/navigation checker refused its destination label before layout
  admission. The third initial candidate was a Program-only edit, refused for
  hiding required allergy information.

The repair `normal-density-entry-and-mar` used rules only: put
`w4Flowsheet.vitalsGroup` first, give it two columns, and bring
`chartSummary.patientCare.w4Mar` forward. Native layout admission, independent
validation, and bounded learnability validation passed, and the rule sidecar
shipped as P3 version 1. Training estimated 20 fewer scrolls, 15,840 fewer scroll
pixels and 32,213.50 fewer travel pixels per train day, with unchanged clicks.
Independent validation completed 13/13 tasks in both arms: 212 → 200 scrolls,
166,478 → 157,486 scroll pixels, and 97,478.93 → 74,977.91 travel pixels;
clicks stayed 174. Bounded validation also passed, with 226 → 212 scrolls and
unchanged clicks/completion.

| P3 day 2, independent no-agent → deployed rules | Before | After |
|---|---:|---:|
| Completed tasks | 51/51 | 51/51 |
| Clicks | 689 | 689 |
| Keystrokes | 1,383 | 1,383 |
| Scrolls | 783 | 746 |
| Scroll pixels | 609,784 | 583,516 |
| Travel pixels | 409,977.01 | 334,389.30 |

This single persona/day comparison is finite synthetic evidence. It does not
estimate clinician effects or establish a general benefit. The larger requested
P1/P3/P5 run still needs a fresh run after the unrelated baseline G10 issue is
resolved; its refusal is not counted as a model result.

## Reproduce

From the repository root, with existing dependencies and restored ignored inputs:

```sh
export TMPDIR=/home/saithat/Projects/run-tmp LEAN_NUM_THREADS=2 CI=true
(cd lean && lake build ehr ui-layout ui-port-audit)
pnpm --config.verify-deps-before-run=false --filter agent typecheck
pnpm --config.verify-deps-before-run=false --filter agent lint
pnpm --config.verify-deps-before-run=false --filter agent test --maxWorkers 2
node scripts/discovery/prompt-measure.mjs \
  /home/saithat/Projects/VGI-Health/runs/lean-10day-stopped-day3 \
  runs/layout-rules-prompt-measure
node scripts/discovery/rules-benchmark.mjs runs/layout-rules-benchmark-final
node scripts/discovery/rules-smoke.mjs runs/layout-rules-smoke-final
EHR_FAKE=0 pnpm --config.verify-deps-before-run=false --filter agent run-days \
  --screens lean --backend codex --model gpt-6.1-sol --days 2 \
  --personas P1,P3,P5 --world runs/layout-rules-world \
  --run-id layout-rules-real-p135 --seed-policy none
```

Use fresh run IDs for reruns. `runs/layout-rules-world` is a local ignored copy
of the existing recorded world; the source run is never written. The independent
attempts use `--personas P3,P5 --run-id layout-rules-real-p35` and
`--personas P3 --run-id layout-rules-real-p3` with the same other options.
The existing full browser audits and Playwright are deliberately not run in
this browser-free check. No Lean source or theorem statement was changed, and
only the existing `ehr`, `ui-layout` and `ui-port-audit` targets were built.
No certified-app source hash inputs were changed.

## Verification results

With `TMPDIR=/home/saithat/Projects/run-tmp` throughout:

* `(cd lean && LEAN_NUM_THREADS=2 lake build ehr ui-layout ui-port-audit)`:
  success, 660 existing build jobs; existing replayed warnings only.
* `pnpm --config.verify-deps-before-run=false --filter agent test --maxWorkers 2`:
  356 passed, 25 skipped because their ignored archive/workflow inputs are absent.
  This includes the 35-context archived/current prompt goldens. An initial run
  exposed missing ignored `app/dist/build.json`; restoring the existing metadata
  made the native-timeout regression pass without building or changing the app.
* Final focused regression over `test/layout-rules.test.ts`,
  `test/layout-rules-run.test.ts`, `test/lean-screens.test.ts`, and
  `test/quality-golden.test.ts`: 34 passed. The two new rule suites were then
  rerun after formatting; all 17 tests passed.
* `pnpm --config.verify-deps-before-run=false --filter agent typecheck` and
  `pnpm --config.verify-deps-before-run=false --filter agent lint`: success.
* `git diff --check`: success. Run data, world copies, fixture data and restored
  build metadata remain ignored; no data files are part of the commit.

No Lean change is needed for the implemented rules. Separate label/control
placement would require a richer native occurrence model and is not claimed.
The remaining question is baseline reference admission for P1/P5 before repeating
the combined real run; no limit has been raised to work around it.
