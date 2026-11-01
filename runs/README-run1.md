# Run 1 — real single-persona integration

Status: full Lean build and native preflight passed; real Codex run has completed Days 1–2 and is working through the nights.

Branch: `lane/run`. Merged checker `1cd621a` and simulator `231d5b5` sequentially after the requested octopus merge could not resolve conflicts. `Main.lean` match arms/imports were unioned; proof/change-request documents merged without dropping either lane's material.

## Persona selection

**P3 (inpatient RN)** is the first certified v1 projection. Both comparisons return `"ok"`: against `releases/v1/canonical.json` and against `releases/v1/personas/P3.json`, with the projection also supplied as `--prev`.

P1, P2, P4 and P5 fail `reviewsBeforeCommit` against both canonical choices:

> anticoagulantList is not shown on screen w1Sign when signOrders is clicked: it must be on the screen, not in a closed tab or collapsed group, and legible

Exact commands, exit codes, verdicts and counterexample events are in [`run1-preflight/results.json`](run1-preflight/results.json). No property or spec was changed to obtain certification.

## Native preflight

Re-run `node scripts/sanity-run1.mjs` and `node scripts/sanity-run1-commands.mjs` from the repository root after `cd lean && lake build ehr`.

- Persona checks: only P3 passes, as above.
- All 16 `programs/bad/*.json` programs return exit 1 with actual checker violations. Several first fail a shared canonical obligation rather than their named mutation; the raw verdicts are preserved without relabeling them.
- `ehr simulate`: P1 day 1 exits 0 (39/42 tasks complete); P3 day 1 exits 0. A successful CLI exit is not a claim that every task completed.
- `ehr min-clicks`: P3's first day-1 task returns 25 clicks; its per-episode search spaces, paths and exactness scope are retained in `P3-min-clicks.stdout`.
- `ehr render-screens`: 694 P3 page trees, with the actual RN user and the first scheduled patient's real Synthea bundle.
- Screen check: all 1,388 desktop/narrow checks passed in 183.8 seconds. Native deploy exited 0 and wrote a real certificate under `/tmp/vgi-run1-deploy/P3/`. Exact commands, exit codes and timings are in `run1-preflight/commands.json`; per-command stdout is preserved.
- Agent: 36/36 tests, typecheck and lint passed, including round trips of all real release specs and checkpoint/resume across releases.
- P3 vendor projections also certify against v1.1 and v2.
- Full `cd lean && lake build`: passed all 215 targets, including the expensive concrete negative proofs.

## Integration changes

Owned agent code: resolve version labels to native spec JSON paths; parse refused deployment Certificates; render with the actual user/role; preserve `drugClass` and constrained allowed values in spec JSON; use vendor persona projections at initial deployment and each release.

Minimal changes outside `agent/`:

- `lean/Main.lean`: union checker/simulator/renderer/export dispatch. Import runtime modules directly so `lake build ehr` can finish independently of the expensive aggregate proof tests; default `lake build` still builds the full `Ehr` target and its proof tests.
- `lean/Ehr/Cli/Sim.lean`: accept the exact stable Synthea `system|UUID` alias for a schedule's fixture UUID, preserving the stable identity in Facts and rejecting other mismatches.
- `app/scripts/runs-plugin.ts`: assess replayability against the run's declared personas so a one-persona run can be selected.
- `app/scripts/screen-check.mjs`: use an isolated free server port and run the screen visibility suite with four workers; all supplied pages still run at both desktop and narrow viewports.
- `app/scripts/verdicts.mjs`: supply the required persona canonical to the native checker.
- `app/src/dashboard/Dashboard.tsx`: expose recorded migration patches/checks in the release view.
- Rebuilt WASM from the integrated source and refreshed its manifest. No interpreter semantics were translated into TypeScript.

## Run and recordings

Queued real command (no `EHR_FAKE`):

```sh
EHR_SAMPLE_FHIR="$PWD/fixtures/synthea/Leanne_Harber_c61efda8.json" \
  pnpm --filter agent run-days --days 10 --personas P3 --backend codex \
  --world runs/world/1 --run-id run1-P3
```

Run artifacts will be in `runs/run1-P3/`. `scripts/export-replay.mjs run1-P3` exports native first-episode Facts and real same-task simulations for the dashboard.

Record with `node scripts/record-demo.mjs --run run1-P3 --persona P3 --base http://localhost:5193`. Playwright records 1440×900 at human pace; ffmpeg converts to H.264 MP4 using OpenH264 (this host's ffmpeg lacks libx264).

Completed: `docs/recordings/05-bad-program.mp4` — 74.7 s, 1.60 MB; real WASM signing screen, allergy list absent, Sign blocked on `allergyList`. `docs/recordings/03-counterexample.mp4` — 23.1 s, 0.26 MB; seeded hidden-allergy rejection stepped on real WASM screens. Other recordings pending the run.

## Integration recovery during the run

Night 1's four natural candidates all added `popup=true` to certified interruptive alert components; the real checker rejected them under `noFalseAlarms`. The seeded hidden-allergy candidate was rejected under `reviewsBeforeCommit`. These original proposals and verdicts remain in the run.

The old agent prompt misleadingly said interruptive alerts should keep popping up. It now explains the actual semantics: condition-triggered interruption occurs automatically at commit; `popup=true` requests an unsolicited screen popup. No checker rule was changed. The process was stopped after Day 2, during an unfinished Night 2 call, and resumed with `--resume`; completed days, Night 1's decision and its LLM call were reused. A test verifies that resume neither re-simulates recorded days nor repeats completed LLM calls. Resume timestamps are in the manifest; all later calls record the corrected prompt.

The dashboard default endpoint resolves to `run1-P3` after native replay export. App validation: all 90 unit tests and lint passed; the migration-detail addition also passed its 9 dashboard tests.

Night 2 deployed v1 after all 696 page states passed at both viewports. Its held-out Day 3 comparison completed 44/44 tasks on both programs and saved **28 clicks, 90 scrolls, and 163.8 s KLM** (no keystroke change). Day 3 ran on v1. Loading v1.1 then exposed the missing native `requestPriorAuth` action in the adapter validator. The validator now includes that action and the native `priorAuth` kind; the round-trip test covers all 18 vendor canonical/projection programs across v1/v1.1/v2. The same run resumed again before Night 3, retaining all earlier evidence.

Day 4 completed under release v1.1 on numeric program version 2. Codex declined the optional prior-authorization surface for the RN, citing 133 W4 tasks and no ordering work; the customized UI was recertified under the new spec. The real app's demo URLs now list the run's declared personas, avoiding links to absent recorded programs.

Day 5 completed on certified numeric v3. Night 4 deployed the early-allergy-review layout; validation day 5: 33s saved, 0 clicks, 0 keystrokes, 30 scrolls. All three seeded unsafe categories have now been rejected (hidden allergy information, prefilled identity re-entry, pound-sourced kilogram weight).

Day 6 completed on certified v4. Night 5 deployed the task-first administration layout; validation day 6: 388.3s saved, 0 clicks, 0 keystrokes, 353 scrolls.

The first v2 migration proposal passed the checker, but the old-program min-clicks comparison failed: it searched the pre-migration UI under new v2 requirements that the old UI intentionally does not satisfy. Minima now compare each version under its own spec; no certificate gate or spec changed. Resume retains the exact completed Codex migration response when its prompt/backend/model match byte-for-byte, preserving the original response file and provenance. Future calls still use live Codex. Tests cover this recovery and cross-spec minimum comparisons.

Day 7 completed on certified numeric v5 under v2. Recheck of v4 failed `reviewsBeforeCommit`: `abxIndication` was not shown on `w4Admin` before `administerMed`. The real Codex migration inserted one always-visible `abxIndication` panel after dose details. It certified on its first candidate, kept all three earlier customization decisions, used no fallback, and passed all 696 page states at both viewports. The original completed migration call was reused with `promptMatched: true` and is explicitly attributed in the decision record.
