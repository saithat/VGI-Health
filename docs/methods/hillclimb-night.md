# Hill-climbing nights on Lean screens

Hill climbing is the default and only discretionary night mode. Vendor release and migration nights retain their validation gates. One-day runs measure the starting program and finish before the first night.

A fresh overnight recording uses one confined Codex CLI session per persona on each discretionary night. For a direct invocation, select the mode explicitly.

```sh
pnpm --filter agent run-days --screens lean --night-mode hillclimb \
  --backend codex --days 10 --world runs/world/2 --run-id <id>
pnpm final-eval --run <id>
node scripts/report-agent-benefit.mjs runs/<id>
```

The manifest binds the measurement policy as `all-past-hillclimb-v1`. `run-days --night-search first|climb` selects how discretionary nights end; the default is `first`. On the start page, **Night search** beside the night-agent options offers **Stop at first improvement** or **Keep climbing**. The manifest records the choice as `hillclimb.search`. Resume and recorded replay inherit it and refuse an explicit mismatch. Older manifests without the field read as `first`. A fresh `scripts/run-overnight.sh <id>` selects hill climbing and runs final evaluation before conformance. A conformance failure still fails the script. Vendor feature and migration nights continue to use their release, validation and fallback procedures. Their historical calibration partitions and bounded memory are maintained independently.

## Local model server

On the start page, open **Record**, keep **Backend** on **Codex**, and choose **Local model server** under **Night agent**. Enter the HTTP base URL, model alias and context window in tokens. This command records one discretionary night for P4.

```sh
pnpm --filter agent run-days --backend codex --world runs/world/2 --personas P4 \
  --days 2 --run-id inkling-p4-first-night --night-provider local \
  --night-base-url http://127.0.0.1:8080/v1 --night-model inkling-2-mini \
  --night-context-window 131072
```

Use a fresh run ID. Two days exercise one night. The example shows the local defaults. Hosted Codex remains the default provider. The night provider applies only to discretionary nights. Vendor-release calls use the configured backend and its model (`--model`).

Codex sends Responses API requests through a private Unix socket to one host loopback port. The URL accepts `127.0.0.1`, `localhost` (IPv4) or `[::1]` and must be free of credentials, query and fragment. Local sessions have an empty internet egress allowlist and receive no hosted credential or service tier. Codex keeps the selected reasoning effort and starts auto-compaction at 80% of the specified context window.

The manifest records the night provider and model. Local runs also record the host and port, context window and a digest for a custom URL path. Resume and replay check these settings. Re-enter a custom base URL when resuming. Replay uses recorded commands offline. Each launch logs bridge connections with the destination address and port.

## What the agent can see

The [arm H sandbox](harness-night.md#sandbox-and-egress) provides a private workspace, file-spool commands and model-only egress. For night N the workspace contains this persona’s program, active spec, profile, traces and task costs for days 1 through N, and the program and layouts for each version actually used. The host checks day, actor, task and program identities before writing the workspace. The no-agent control, future schedules, other clinicians’ records and paths to the run store stay on the host. The release capability checker still receives its trusted workload declaration.

The CLI receives the following 60-byte prompt on each launch.

```text
Read README.md in /work. Continue until night done succeeds.
```

The workspace README substitutes the clinician’s ID and role. In `first` mode its bytes remain unchanged. P1 sees the following instructions.

```text
You are redesigning the EHR for P1, a simulated physician. Reduce daily clicks plus scrolls while preserving completion, learnability, typing effort and modeled time. The checker enforces the clinical and screen rules.

persona.json describes this clinician. days/N.json contains their recorded tasks and trace on the program in versions/V.json. program.json is your working copy of the deployed program, including its layouts. spec.json is the active rulebook.

Edit the working copy and run `node patch.mjs > patch.json`, or write an RFC 6902 patch against the deployed version directly. Run `night measure patch.json` to certify it and replay all past days with the expert and bounded clinicians. Inspect the verdict, totals and breakdowns. Iterate as often as needed. Savings must reach five actions per day. Both clinicians must finish every task, with at most 2% more keys and modeled time. Bounded clicks and scrolls must each hold.

Use `night measure --days 1,3 patch.json` for an estimate. Shipping requires every past day.

Finish with `night done patch.json "summary"`. Say what you changed and why in a few sentences. A refusal gives the reason so you can keep working. To retain the current version, use `night done --no-change "reason"`.
```

In `climb` mode the README inserts this paragraph just before “Finish with”. Everything else, including the 60-byte launch prompt, stays the same.

```text
A passing measure is a step, not the finish. Keep the passing patch as your new working base and look for the next improvement on top of it. Re-measure the combined patch against the deployed version. Once further changes stop helping, finish with `night done` on the best combined patch.
```

Keep edits in `program.json`; `patch.mjs` continues to generate the combined patch against the original deployed version, so each replay covers the whole change. Passing a measure does not deploy it. Full `night measure` replies identify the best passing patch so far with `best.isBest`, its `best.net` saving in actions per day, and `best.patch` (`best.json`). The host saves that RFC 6902 patch in the workspace and in the persona-night record directory. A tie keeps the earlier patch; a weaker or refused measure leaves it intact. `night done` still gates and ships exactly the supplied patch, even if a different measured patch saved more.

## Measurement and completion

Both commands invoke the same gate against the host’s deployed bytes. A working copy cannot change the base program, rulebook, traces, memory or gate. A failed `done` returns the refusal and leaves the session open. A successful patch goes through the ordinary screen check, native deployment and durable publication path. An explicit no-change token records the reason. Acceptance seals the decision immediately. The CLI can finish its final turn and report token usage within the remaining wall time. A normal CLI exit without a token relaunches in the same workspace.

The Lean checker enforces the program properties and budgets. Lean-painted screens must pass program and family admission including G1–G11. For a certified candidate the replay runs each observed schedule at the candidate’s active spec, twice per layout, using the original day seed. The expert starts with its layout knowledge. Each bounded rehearsal starts from the same clone of memory earned on all preceding observed shifts, including the shift that just ended. Rehearsals never train the actor. The current layout’s paired results can be reused within a night.

* Both candidate policies must complete every scheduled task. The historical canonical charge for incomplete work applies when scoring a partial baseline.
* Gross daily effect is the expert’s total clicks and scrolls saved divided by observed days. Net equals gross: it must reach five actions per day. There is no movement charge or displacement limit.
* Expert and bounded keystrokes and modeled time may each increase by at most 2%. Bounded clicks and bounded scrolls must each hold or decrease. Expert clicks and scrolls enter the combined score. Pixel travel remains diagnostic.
* Replies include expert and bounded totals and savings, raw paired task costs, and per-screen click/key operators and scroll counts. Modeled time is in deciseconds. Command records store elapsed milliseconds separately from the deterministic verdict.

This replaces train estimates, a withheld release sample, blind even days, predicted savings and the simulated discretionary offer with a directly measured release decision. There is no repair, command, launch or measure count limit. `--night-wall-ms` defaults to 7,200,000 per persona-night. On expiry, `first` keeps the current program and records `backstop`. In `climb`, the host ships the best passing patch from a completed full `night measure`, using its full verdict and the ordinary deployment checks. If there is no such patch, it keeps the current program. Estimates, refused measures and measures interrupted by the deadline cannot supply this fallback. The decision and session record distinguish `backstop-best` (deployed) from `backstop-current` (retained) in `hillclimb.completion` and `completion`, respectively. An accepted `done`, including explicit no-change, always takes precedence. Model-service and infrastructure failures interrupt the run so it can be resumed. Session records under `hillclimb/night-NN/<persona>/` include the completion summary, search choice, wall time, command and measure counts, passing full measure count (`passingMeasures`), best net daily saving (`bestNet`, or null), per-launch usage, audit and transcripts. Passing measures count repeated passing full `measure` commands; estimates and `done` are excluded. Decisions retain these statistics under `hillclimb`. The run summary includes them for each persona-night and counts both backstop outcomes. The benefit report also lists passing measures, best net daily saving and completion for each night.

New manifests bind `hillclimb.objective = "gross-actions-v1"`; session replies use version 3. Historical manifests without this objective require their original source revision for resume or command replay. Existing recorded metrics, prompts and certificates remain readable and unchanged. `net` and `bestNet` retain their JSON names and now contain gross daily saving. The legacy `design.stabilityBudget` field is serialized unchanged to preserve frozen spec hashes, but no checker or host gate uses it. `componentsMoved` and `stabilityOk` remain legacy decision metadata, not release constraints. R3 still caps copies per tag and screen; the alert budget is unchanged.

[Layout change policy](layout-change-policy.md) lists the removed rules, compatibility surface and verification evidence.

## Measuring faster

`night measure --days 1,3 patch.json` uses the same certification, seed and all-past clinician memory as a full measure. It reports the selected days with `estimate: true` and omits the ship decision. Each completed day and policy can be reused in the full measure. Submitting a patch with `done` always scores every observed day.

`EHR_MEASURE_WORKERS` controls each persona’s native worker budget (default 4, serial 1). Up to two day/policy pairs share those slots. Clinical simulation preserves task order and earned receipts within a day. After reconstructing episode boundaries, independent workers render each task and check its recorded transitions. The host folds results in recorded order. Each persona-night keeps its deployed and canonical replay rows and the eight most recent candidate programs, including their layout designs. Exact native layout requests, reference families, gallery verdicts, schedule-independent popup exports and trace placements share byte-bounded caches. Native task workers use one Lean thread each, including when `EHR_BIN` selects an external interpreter. The overnight wrapper gives the shared Node host an 8 GiB old-generation heap. A caller can override it via `NODE_OPTIONS`; the memory scope covers native children as well.

To benchmark P1, build the adapters once and run the harness from the repository root. Use `1` for the first night or `9` for nine days. The harness reads historical schedules and programs from the retained world and `runs/lean-10day`, reconstructs memory, and writes the workspace, verdicts and geometry under a fresh `TMPDIR` directory. It times an empty patch, a component reorder and the identical reorder again. For a capacity check, add `--capacity` to measure the unchanged layouts for all five clinicians concurrently in one Node host. Use `--contended` to time P1’s new patch while P2–P5 start cold measures in the same host. The peer measurements stop when P1’s patch finishes. Set `NODE_OPTIONS=--max-old-space-size=8192` for either concurrency mode to match the overnight wrapper. The stage timings include overlapping workers and nested calls. The wall time measures the complete verdict after workspace preparation.

```sh
export TMPDIR=/home/saithat/Projects/run-tmp
(cd lean && lake -d ../scripts/measure-replay build)
(cd agent && EHR_MEASURE_WORKERS=4 node --import tsx src/bench-hillclimb.ts 9)
```

### Historical P1 benchmark

These are wall seconds for three consecutive full P1 measures on the shared host. Each session first measures the unchanged program, then moves one home-screen component, then repeats the same patch. Night 1 contains 42 tasks. Night 9 contains 339 tasks on days 1–9, with v6 deployed. The original implementation is commit `2b9d90c2`. The updated implementation uses four workers per persona.

| Night and starting geometry | Implementation | Unchanged | New reorder | Repeat |
| --- | --- | ---: | ---: | ---: |
| 1, empty | Original | 1,417.1 | 411.1 | 21.3 |
| 1, empty | Updated | 263.8 | 49.4 | 0.014 |
| 9, empty | Original | Timed out at 7,200 | — | — |
| 9, empty | Updated | 1,639.6 | 372.3 | 0.015 |
| 9, populated | Original | 393.9 | 197.1 | 101.8 |
| 9, populated | Updated | 170.5 | 69.9 | 0.016 |

The original cold nine-day measure reached day 6 when stopped at the two-hour production backstop. All 21 completed atlas result pointers and their 2,443 geometry objects matched the updated run byte for byte. The populated-store runs started from independent copies of the same on-disk geometry with empty in-memory caches. Each replayed both clinical policies. All three original verdict files matched the updated files byte for byte on both nights. The updated nine-day results also matched across empty and populated stores.

On the original cold night 1, geometry took 1,188 of the 1,417 wall seconds. The first screen gate took 163 seconds, expert and bounded simulation took 16 and 20, and the program check took under one. On updated cold night 9, geometry accumulated 2,835 worker-seconds, including trace reconstruction, export and viewport placement. Native layout took 2,491 worker-seconds across the gate and geometry, including 1,300 for 3,432 reference family admissions. Expert and bounded simulation took 81 and 99 worker-seconds. Atlas storage and attachment took 128. For the next patch, geometry fell to 582 worker-seconds with 21 new reference admissions. These nested worker times overlap.

With all five personas active in one host, P1’s new full reorder took 72.5 seconds on night 1 and 1,226.3 seconds on night 9. On night 9, P2–P5 each started a cold measure alongside P1 and all four were still working when P1 finished. The combined process tree peaked at 5.80 GiB sampled once per second. Repeating P1’s patch took 0.019 seconds. The five-persona night-1 capacity check ran every unchanged measure to completion and peaked at 5.12 GiB. These runs exercised the measurement host and native children without model clients.

The ten-minute goal was met for a fresh reorder with four workers allocated to P1 alone. The same reorder took 20m26s under five-persona load. Geometry rose to 2,107 worker-seconds, including native viewport work and contention in the shared host. The initial screen gate took 44 wall seconds, expert and bounded simulation took 62 and 76 worker-seconds, and atlas storage and attachment took 110 worker-seconds. CPU time sampled over this interval averaged 0.86 cores in the shared Node process and 3.55 cores across its entire process tree.

## End-of-run evaluation

`pnpm final-eval --run <id>` replays the expert on every recorded schedule and seed for each deployed version, from v0 through intermediate releases to the final layout. Each version uses its own spec and the personalized vendor canonical recorded for that spec. Replaying an older version on later tasks can expose missing capabilities. A vendor release alone therefore produces zero agent delta when the deployed and canonical layouts match.

`final-eval/<persona>.json` contains exact per-day values, the same-spec canonical, and totals for all days, days through the build night and subsequent days. V0 has zero seen days. The table at `final-eval/final-eval.txt` reports task counts, completion, clicks, scrolls, keys, scroll pixels and modeled deciseconds. Delta is deployed minus canonical. Attempted work on incomplete tasks counts here and completion is explicit. The [benefit report](agent-benefit-reporting.md) uses paired completed work on actual next-day deployments, covering days 2–10 of a ten-day run. The seen/subsequent comparison is descriptive.

## Two-day climbing smoke

The retained `hillclimb-3day` manifest uses world `runs/world/2`. From the repository root, the orchestrator can exercise one discretionary night each for P2 and P4 with a fresh run ID:

```sh
TMPDIR=/home/saithat/Projects/run-tmp EHR_MEASURE_WORKERS=4 NODE_OPTIONS=--max-old-space-size=8192 \
  pnpm --filter agent run-days --screens lean --night-mode hillclimb --night-search climb \
  --backend codex --model gpt-6.1-sol --days 2 --personas P2,P4 --parallel \
  --world runs/world/2 --run-id hillclimb-climb-p2-p4-smoke
```

The default wall-clock budget remains 7,200,000 milliseconds per persona-night. Inspect each `session.json`, saved `best.json`, decision, and the summary’s `hillclimb.results` for passing measures and best net saving. This is an offline recording command; it does not require a Compose project or live-stack ports.
