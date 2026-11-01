# Run 1 — real single-persona integration

Status: full Lean build passed (215 targets); native preflight and screen-gated Codex run in progress.

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
- Screen check and temp-dir deploy: pending; outputs will be recorded in `run1-preflight/commands.json` and per-command files.
- Agent: 32/32 tests, typecheck and lint passed, including round trips of all real release specs.
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

Completed: `docs/recordings/05-bad-program.mp4` — 74.7 s, 1.60 MB; real WASM signing screen, allergy list absent, Sign blocked on `allergyList`. Other recordings pending the run.
