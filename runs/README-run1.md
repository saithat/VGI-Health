# Run 1 — completed real single-persona run

**P3, inpatient RN · 10 days · final certified program v7 · 424/424 tasks complete.**

The run took **45.0 minutes wall time**, including recovery pauses. Backend: authenticated **Codex CLI / gpt-6.1-sol**. Checker, simulator, minima, renderer and deploy all used the real native Lean executable. `EHR_FAKE` was disabled; it is now rejected outside unit-test environments.

Artifacts: [`run1-P3/`](run1-P3/) — 10 day results, 9 decision records, 15 completed real LLM call recordings, 8 program versions and certificates, deployment pointers, summary, metrics, certificate audit and native WASM replay inputs.

- Candidate checks: **19 pass / 13 reject**, including all three seeded unsafe categories. Passing candidates include alternatives that were not selected.
- Outcomes: **5 optimization deployments**, **1 v2 migration**, **1 v1.1 recertification without surfacing the optional feature**, one night with no passing candidate, and one no-change night.
- Vendor releases took effect before **Day 4 (v1.1)** and **Day 7 (v2)**.
- Every deployed version passed native certification and its complete desktop/narrow browser screen gate. All 8 recorded certificate program/spec hashes match fresh native redeploys to a temporary directory.

## Persona selection and merged sources

Merged checker `1cd621a` and simulator `231d5b5` into `lane/run`. The requested octopus merge could not resolve conflicts, so the lanes were merged sequentially. `Main.lean` imports/match arms were unioned; proof/change-request documents retained both lanes' content. No merge to main was made.

**P3 is the first certified v1 projection.** Both checker comparisons return `"ok"`: against `releases/v1/canonical.json` and against `releases/v1/personas/P3.json`, supplying the projection as `--prev`.

P1, P2, P4 and P5 fail `reviewsBeforeCommit` against either canonical choice:

> anticoagulantList is not shown on screen w1Sign when signOrders is clicked: it must be on the screen, not in a closed tab or collapsed group, and legible

Exact commands, exit codes, verdicts and counterexample events: [`run1-preflight/results.json`](run1-preflight/results.json). **No property or spec was weakened.** P3's vendor v1.1 and v2 projections also certify.

## Native CLI sanity checks

Reproduce from the repository root after building Lean:

```sh
(cd lean && lake build)
node scripts/sanity-run1.mjs
node scripts/sanity-run1-commands.mjs
```

| Check | Actual result |
|---|---|
| Full `lake build` | Passed all 215 targets, including concrete negative proofs |
| P1–P5 v1 certification | Only P3 passes; exact violations above |
| `programs/bad/*.json` | All 16 rejected, exit 1; raw first findings retained |
| P1 day-1 simulation | Exit 0; 39/42 tasks complete |
| P3 day-1 simulation | Exit 0; 38/38 tasks complete |
| P3 first-task `min-clicks` | 25 clicks / 39 keys; certified per-episode within reported navigation-directed spaces, not a joint global task optimum |
| P3 `render-screens` | 694 page states from the actual RN user and scheduled Synthea fixture |
| Browser `screen-check` | All 1,388 desktop/narrow checks passed, 183.8 s |
| Native temp deploy | Exit 0, real certificate and `/tmp/vgi-run1-deploy/P3/current.json` |
| Agent validation | 36 tests, typecheck and lint passed |
| App validation | 90 tests and lint passed; production build and WASM freshness passed |

Per-command output/timings: [`run1-preflight/commands.json`](run1-preflight/commands.json) and adjacent `.stdout` files. Some bad programs first fail a shared canonical obligation rather than their named mutation; these findings were not relabeled. A successful simulator exit does not claim every P1 task completed.

## Metrics and held-out tests

KLM is modeled time, in seconds below. The floor is the simulator's semantic floor, not a claim of global UI optimality. Raw metrics: [`run1-P3/metrics.json`](run1-P3/metrics.json).

| Shift | Tasks | Program | Clicks / floor | Keys / floor | KLM seconds / floor | Scrolls |
|---|---:|---:|---:|---:|---:|---:|
| Day 1 | 38 | v0 | 565 / 304 | 820 / 341 | 6,606.7 / 1,434.4 | 877 |
| Day 10, last test day | 45 | v7 | 725 / 393 | 1,071 / 478 | 5,771.3 / 2,121.4 | 528 |

Above-floor percentages, Day 1 → Day 10: **clicks 85.9% → 84.5%; keys 140.5% → 124.1%; KLM 360.6% → 172.1%**. These are different shifts; use the paired test measurements for causal comparisons.

- **Largest paired test gain:** Night 5's task-first administration layout, tested on Day 7: **356 fewer scrolls and 391.6 s KLM saved**, with the same 768 clicks, 1,146 keys and 54/54 completed tasks. The “why” recording selects this decision.
- **Last paired test:** Night 8, tested on Day 10, v6 → v7: **732 → 725 clicks; 1,071 → 1,071 keys; 531 → 528 scrolls; 5,791.7 → 5,771.3 s KLM**. All 45 tasks completed on both versions.
- Test measurements use day `night + 2` only after selection is finished. Test inputs/results never enter optimization prompts.

## Releases and recovery provenance

**v1.1:** Codex declined the optional prior-authorization surface for the RN, citing 133 W4 tasks and no ordering work. The customization was recertified under v1.1 before Day 4.

**v2:** The v4 UI failed `reviewsBeforeCommit`: `abxIndication` was absent from `w4Admin` before `administerMed`. Codex inserted one always-visible antibiotic-indication panel after dose details. The first candidate certified, preserved all three earlier customization decisions, used no fallback, and passed all 696 rendered states at both viewports before Day 7.

Completed days, decisions and original LLM responses were preserved across three resumes:

1. After Day 2, the prompt's outdated alert wording was corrected. Night 1's original four natural proposals requested unsolicited interruptive popups and were correctly rejected under `noFalseAlarms`; its seeded hidden-allergy proposal was rejected under `reviewsBeforeCommit`. All original evidence remains.
2. After Day 3, loading v1.1 exposed missing native `requestPriorAuth` action validation. The real-program round-trip test now covers all 18 vendor canonical/projection programs across v1/v1.1/v2.
3. During migration, minimum search incorrectly tried the old UI under new requirements it intentionally could not meet. Minima now compare each version under its own spec; new-spec deployment certification remains mandatory. The already-completed real Codex migration response was reused only after an exact prompt/backend/model match, with explicit provenance in the decision record. Future calls remained live Codex.

Migration comparisons that run an old UI against the new spec may have different completion counts; they demonstrate restored conformance rather than a like-for-like cost saving.

## Integration fixes

Owned `agent/` changes: real spec-file flags; refused-deploy Certificate parsing; actual render user/role; vendor persona projections at initial deploy and releases; full native spec/action/kind validation; interpreter-accurate alert prompting; checkpoint/resume with immutable completed-call reuse; old-spec minimum comparisons; test-only fake mode.

Minimal fixes outside `agent/`:

- `lean/Main.lean`: union command dispatch/imports; import runtime modules directly so CLI builds can finish independently while the full default `Ehr` target still checks all proofs/tests.
- `lean/Ehr/Cli/Sim.lean`: match fixture UUIDs to the exact stable Synthea `system|UUID` alias, preserving stable identity in Facts and rejecting other mismatches.
- `app/scripts/runs-plugin.ts`: assess replayability against declared personas, enabling single-persona run selection.
- `app/scripts/screen-check.mjs` and its test: isolated free ports/artifact directories and four workers; every supplied page still runs at both viewport sizes with unchanged visibility rules.
- `app/scripts/verdicts.mjs`: required persona canonical argument and accurate rejection status.
- `app/src/dashboard/Dashboard.tsx`: expose recorded migration patches/checks; honor persona URLs and default to a persona actually present in a single-persona run.
- `scripts/demo-urls.mjs`: print links only for the selected run's personas.
- Rebuilt browser WASM and refreshed its source manifest. Runtime asset bytes matched the prior build; the integrated source manifest is current.

## Reproduce and view

Original run command, with real screen-check fixture:

```sh
EHR_SAMPLE_FHIR="$PWD/fixtures/synthea/Leanne_Harber_c61efda8.json" \
  pnpm --filter agent run-days --days 10 --personas P3 --backend codex \
  --world runs/world/1 --run-id run1-P3
# Add --resume to continue an interrupted run without replacing completed work.
```

Do not rerun the original command over this committed run without `--resume`; use a new run id for a new experiment.

```sh
node scripts/export-replay.mjs run1-P3
make run APP_PORT=5195
node scripts/record-demo.mjs --run run1-P3 --persona P3 --base http://localhost:5195
```

`make run` automatically selects **run1-P3**. EHR: `/?persona=P3&run=run1-P3`; dashboard: `/dashboard?run=run1-P3&persona=P3`; browser: `/browse`.

The recorder uses Playwright `recordVideo` at **1440×900**, human-paced actions, then ffmpeg H.264 conversion (OpenH264 on this host). It supports another run id/persona for the later full-persona run, and `--only 01` through `--only 05` for individual clips. Native replay export supplies real first-episode Facts, display data, per-version specs and same-task traces. All videos are checked to stay under 20 MiB.

Recording inventory and durations: [`../docs/recordings/recordings-run1-P3.json`](../docs/recordings/recordings-run1-P3.json). All five final videos were captured from the production preview and visually checked.

| Recording | Duration | Size (MB) |
|---|---:|---:|
| [01-ehr-day1-vs-final.mp4](../docs/recordings/01-ehr-day1-vs-final.mp4) | 50.7 s | 1.55 |
| [02-dashboard-timeline-why.mp4](../docs/recordings/02-dashboard-timeline-why.mp4) | 11.3 s | 0.64 |
| [03-counterexample.mp4](../docs/recordings/03-counterexample.mp4) | 15.9 s | 0.24 |
| [04-release-v2-migration.mp4](../docs/recordings/04-release-v2-migration.mp4) | 15.9 s | 1.01 |
| [05-bad-program.mp4](../docs/recordings/05-bad-program.mp4) | 49.5 s | 1.32 |

Production browser smoke audit: Evolution, Why, Counterexamples, Day replay, Releases, Cost curves and the final EHR passed with zero page errors and zero external requests. Day replay defaults to P3 and renders both real WASM screens. See `run1-P3/ui-audit.json`.
