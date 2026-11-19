# Hill-climbing nights on Lean screens

A fresh overnight recording uses one confined Codex CLI session per persona on each discretionary night. For a direct invocation, select the mode explicitly.

```sh
pnpm --filter agent run-days --screens lean --night-mode hillclimb \
  --backend codex --days 10 --world runs/world/2 --run-id <id>
pnpm final-eval --run <id>
node scripts/report-agent-benefit.mjs runs/<id>
```

The manifest binds the measurement policy as `all-past-hillclimb-v1`. Direct `run-days` retains its previous default. Resume and recorded replay read the policy from the manifest. A fresh `scripts/run-overnight.sh <id>` selects hill climbing and ends with final evaluation. Vendor feature and migration nights continue to use their release, validation and fallback procedures. Their historical calibration partitions and bounded memory are maintained independently.

## What the agent can see

The [arm H sandbox](harness-night.md#sandbox-and-egress) provides a private workspace, file-spool commands and model-only egress. For night N the workspace contains this persona’s program, active spec, profile, traces and task costs for days 1 through N, and the program and layouts for each version actually used. The host checks day, actor, task and program identities before writing the workspace. The no-agent control, future schedules, other clinicians’ records and paths to the run store stay on the host. The release capability checker still receives its trusted workload declaration.

The CLI receives the following 60-byte prompt on each launch.

```text
Read README.md in /work. Continue until night done succeeds.
```

For P1, the workspace README is 1,187 UTF-8 bytes. P3 uses `P3` and `rn` in the first sentence, giving 1,180 bytes. Neither string has a trailing newline.

```text
You are redesigning the EHR for P1, a simulated physician. Reduce daily clicks plus scrolls while preserving completion, learnability, typing effort and modeled time. The checker enforces the clinical, screen and movement rules.

persona.json describes this clinician. days/N.json contains their recorded tasks and trace on the program in versions/V.json. program.json is your working copy of the deployed program, including its layouts. spec.json is the active rulebook.

Edit the working copy and run `node patch.mjs > patch.json`, or write an RFC 6902 patch against the deployed version directly. Run `night measure patch.json` to certify it and replay all past days with the expert and bounded clinicians. Inspect the verdict, totals and breakdowns. Iterate as often as needed. Savings must cover movement and reach five actions per day. Both clinicians must finish every task, with at most 2% more keys and modeled time. Bounded clicks and scrolls must each hold.

Finish with `night done patch.json "summary"`. Say what you changed and why in a few sentences. A refusal gives the reason so you can keep working. To retain the current version, use `night done --no-change "reason"`.
```

## Measurement and completion

Both commands invoke the same gate against the host’s deployed bytes. A working copy cannot change the base program, rulebook, traces, memory or gate. A failed `done` returns the refusal and leaves the session open. A successful patch goes through the ordinary screen check, native deployment and durable publication path. An explicit no-change token records the reason. A normal CLI exit without a token relaunches in the same workspace.

The Lean checker enforces the program properties and budgets. Lean-painted screens must pass program and family admission including G1–G11. The host checks the identity movement budget. For a certified candidate the replay runs each observed schedule at the candidate’s active spec, twice per layout, using the original day seed. The expert starts with its layout knowledge. Each bounded rehearsal starts from the same clone of memory earned on all preceding observed shifts, including the shift that just ended. Rehearsals never train the actor. The current layout’s paired results can be reused within a night.

* Both candidate policies must complete every scheduled task. The historical canonical charge for incomplete work applies when scoring a partial baseline.
* Gross daily effect is the expert’s total clicks and scrolls saved divided by observed days. Subtract the existing usage-weighted movement charge on those days. Net effect must reach five actions per day.
* Expert and bounded keystrokes and modeled time may each increase by at most 2%. Bounded clicks and bounded scrolls must each hold or decrease. Expert clicks and scrolls enter the combined score. Pixel travel remains diagnostic.
* Replies include expert and bounded totals and savings, raw paired task costs, and per-screen click/key operators and scroll counts. Modeled time is in deciseconds. Command records store elapsed milliseconds separately from the deterministic verdict.

This replaces train estimates, a withheld release sample, blind even days, predicted savings and the simulated discretionary offer with a directly measured release decision. There is no repair, command, launch or measure count limit. `--night-wall-ms` defaults to 7,200,000 per persona-night. On expiry the current program stays deployed and the decision records `backstop`. Model-service and infrastructure failures interrupt the run so it can be resumed. Session records under `hillclimb/night-NN/<persona>/` include the completion summary, wall time, command and measure counts, per-launch usage, audit and transcripts. The run summary reports backstops over hill-climbing nights.

## End-of-run evaluation

`pnpm final-eval --run <id>` replays the expert on every recorded schedule and seed for each deployed version, from v0 through intermediate releases to the final layout. Each version uses its own spec and the personalized vendor canonical recorded for that spec. Replaying an older version on later tasks can expose missing capabilities. A vendor release alone therefore produces zero agent delta when the deployed and canonical layouts match.

`final-eval/<persona>.json` contains exact per-day values, the same-spec canonical, and totals for all days, days through the build night and subsequent days. V0 has zero seen days. The table at `final-eval/final-eval.txt` reports task counts, completion, clicks, scrolls, keys, scroll pixels and modeled deciseconds. Delta is deployed minus canonical. Attempted work on incomplete tasks counts here and completion is explicit. The [benefit report](agent-benefit-reporting.md) uses paired completed work on actual next-day deployments, covering days 2–10 of a ten-day run. The seen/subsequent comparison is descriptive.
