# Arm R: recursive-language-model night agent

R is opt-in (`proposal-quality --arms B,R`). The default arm and production
discovery are unchanged. R follows the Recursive Language Models design (Zhang &
Khattab, 2025): the root model never receives the large context in its prompt.
It writes code for a persistent REPL in which the context is a set of variables,
sees only truncated output, and may call a sub-model on slices it chooses.

Arm E sent every tool result back in a growing conversation. In the paired run
all 70 E samples hit the 120,000-token cumulative ceiling before submitting
([arm E results](agent-loop.md#paired-current-build-experiment-2026-11-08)).
R keeps large results in the REPL; the root sees bounded text only.

## Loop

`agent/src/rlm/loop.ts` implements `RlmNightAgent`, an ordinary `AgentBackend`,
so the night's independent certification, final-gate repairs and held-out
validation run unchanged. Each root turn is one structured `JsonLlm.complete`
call. It works with every backend: Claude, Codex, OpenAI-compatible and replay.
The reply schema is `{thought, code, final}`; `final` is `null` or a submission
matching E's `SUBMIT_SCHEMA`. Code can also end the decision with
`await FINAL(submission)`. Both paths use E's own submission validator
(`validateSubmission`). Invalid submissions are returned to the root as errors.

The root prompt is fixed instructions and a REPL API description (about 7 KB),
the night identity, a bounded train-only hotspot digest on the first request,
and the REPL history, followed by a short status line
(remaining turns, checks, estimates and sub-calls). History lists the newest turns
verbatim (thought, code, output), then one-line summaries of older turns, then a
count of omitted turns. **Every root request is at most `maxRootPromptBytes`
(default 48,000 UTF-8 bytes, about 12K tokens), however long the decision runs.**
Verbatim turns use at most 75% of the history room. Cell output shown to the root
is at most 3,000 bytes per turn; code is at most 8,000 bytes per cell. The prompt
tells the root to keep notes and candidate patches in REPL globals.

## REPL contents and partition

`rlmReplData` (`agent/src/rlm/context.ts`) is the partition boundary. It reads
only the current program, the current release spec, the night/persona identity,
and the same train-only `QueryBundle` that arm E and arm C use. Bundle
construction already rejects future or measurement days, non-training tasks and
trace/atlas mismatches. The holdout closure, decision history, earlier
programs, raw `NightInput.train`, world paths and validation scores are never
read. A unit test seeds those with sentinel strings. It checks that the
serialized REPL data, every recorded root request and the REPL's global names
contain none of them.

Preloaded globals (deep-frozen): `meta`, `program` (the whole frozen current
program), `screens`, `specRules[screenId]` (E's `spec_rules` projection for
every screen), `render[screenId]` (all exact current-program training Chromium
states; E returns at most three), `train.{traces, attribution, geometry, ledger,
locality}`, `SAFETY_PROPERTIES`, `MOVE_TYPES` and `SUBMIT_SCHEMA`. `query(name,
filters)` runs E's pure query engine synchronously inside the REPL.

Effectful functions are sent back to the harness one at a time, in order:
`check_patch`, `estimate_patch` (E's native checker and `TrainEstimator`),
`complain` and `llm_query(prompt, data)`. A sub-call is a separate structured
call (`{answer}`) with a fixed system prompt. It sees only the prompt and data
the root sent, and has no functions. Its model and reasoning effort can be set
separately (`--rlm-sub-model`, `--rlm-sub-reasoning-effort`). By default it uses
the root's model and effort.

## Sandbox

`agent/src/rlm/sandbox.ts` starts one REPL process per decision. It is shared
by the propose loop and every final-gate repair, so repairs keep the globals.
There are three layers:

1. **bwrap**: `--unshare-all` (network, PID, IPC, UTS, user), `--clearenv`,
   read-only `/usr`, `/bin` and `/lib*`, the two REPL scripts read-only at `/rlm`,
   a private `/tmp`, and no home or repository mount.
2. **Node permission model**: `--permission`, reads allowed only for the two
   scripts, no writes, child processes or workers;
   `--disallow-code-generation-from-strings`; `--max-old-space-size=768`.
3. **`vm` context** with string and WASM code generation disabled. The context
   gets strings and in-context functions only. Host functions are captured in
   a closure and removed from the global scope. There is no `require`,
   `process`, `import()`, timers or `fetch`. `Date` and `Math.random` are
   deterministic.

Limits are 10 s synchronous CPU per cell (vm timeout) and 60 s of REPL time per
cell; time spent in harness calls such as estimates is excluded. A cell that
exceeds this, or a process that dies (for example out of memory), restarts the
REPL. The root is told that its globals were reset; the preloaded data remains.
Tests cover escape attempts (constructor-chain `Function`, `eval`, `import()`,
host-function constructors, frozen data, timeouts). A separate test runs a probe
under the exact production arguments: file writes, reads outside `/rlm`,
process spawning, network and code generation are all denied.

## Budget

Each decision has its own limits; there is no cumulative conversation token
ceiling. The defaults are: 30 root turns, shared by propose and repairs; 12
sub-calls; 12 checks and 8 estimates, the same quotas as E; 48,000 bytes per
root request; 64,000 bytes per sub-call request; 3,000 bytes of output per
turn; 8,000 bytes of code per cell; and 60 minutes of wall time. An over-quota
check, estimate or sub-call returns an error to the REPL. Running out of root
turns or wall time ends the decision with `RlmBudgetError`. The night records
this as `llm-error`, and the transcript is saved as `<callId>.error.json`.
CLI flags are `--rlm-max-turns`, `--rlm-max-sub-calls` and `--rlm-wall-ms`.
`--tool-max-checks` and `--tool-max-estimates` apply to both E and R.

Each sample record has `rlmLoop`. It holds root turns, sub-calls, checks,
estimates, the host-call/query tally, cell errors, restarts, the largest and
total root request bytes, output bytes, complaints, and the input, cached and
output tokens reported for root calls and sub-calls separately. The record's
`tokens` field sums the root and any separate sub-model meter.

## Recording, replay and audit

Every root call is recorded as `llm/<callId>/root-NN.json` and every sub-call
as `llm/<callId>/sub-NNN.json`, with full request text. The summary
`llm/<callId>.json` holds every turn's thought, code, output and error, and
every host call with its arguments and result. Durations are kept out of the
compared transcript. `--backend replay --tool-replay-from <run>` replays R with
no prompt drift allowed. Root and sub-call replies come from the recordings.
Cells, queries, checks and estimates run again, and the turn list, host results
and submission must equal the recorded summary byte for byte. Any difference is
a `ToolReplayDivergedError`. Each recorded Codex transcript is audited with the
no-tool audit: the root and sub-models have no shell, MCP or web tools.

## Pilot, 2026-11-08

A pilot, not the full study. Seven frozen decisions, declared before the run:
nights 1, 2, 4, 5, 7, 8 and 9, paired with personas P1–P5 in turn (night-01/P1,
night-02/P2, night-04/P3, night-05/P4, night-07/P5, night-08/P1, night-09/P2).
Each arm ran one sample per decision. The frozen source was
`runs/quality-BE-source-20261108`, and the measured ledger came from the
completed `runs/quality-BE-sanity-20261108`; both were copied from the main
checkout without editing. Root and sub-calls used Codex `gpt-6.1-sol` with high
reasoning and the default service tier. No cheaper sub-model was clearly
available, so sub-calls used the same model. The budget was the default above.
One harness worker ran under the browser lock, B before R within each decision.
The run took 1 h 27 min (22:56:58Z–00:24:04Z).

| Arm | Accepted | Validation clicks saved | Validation scrolls saved | Input tokens / decision | Cached input / decision | Output tokens / decision | Model calls / decision | Seconds / decision |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| B | 6/7 | 31 | 251 | 207,270 | 9,179 | 5,089 | 2 | 312.6 |
| R | 6/7 | 20 | 283 | 450,565 | 137,490 | 7,748 | 22.4 | 466.1 |

R−B: no change in the acceptance rate (both 6/7; the paired interval is
degenerate at this size). There were 11 fewer validation clicks and 32 more
validation scrolls saved. Under the declared decision rule R does not beat B.
B's night-08/P1 change was rejected at validation. R submitted no change for
that decision, because its own estimates showed that each of three measured
alternatives completed only 39 of 41 training tasks. Validation savings by
decision (clicks/scrolls, B vs R): 11/80 vs 0/79, 8/39 vs 8/33, 12/58 vs
0/104, 0/28 vs 0/56, 0/30 vs 12/11, 0/0 vs 0/0, and 0/16 vs 0/0. In the
night-09/P2 change R accepted, saved pixels were the only improvement.
No final-gate repair was needed in either arm.

**Mechanism.** No R sample came near a budget limit. Root turns were 19–28 of
30, and checks and estimates 3–5 of 12/8. The largest root request was 42,412
bytes, under the 48,000-byte bound. There were no REPL restarts, three cell
errors in total, and no complaints. Input tokens per root call averaged about
20K, and the 31% cache rate came from Codex's own prefix caching. R used
2.2× B's input tokens and 1.5× its wall time. All 156 root transcripts, the one
sub-call transcript and the 14 B transcripts passed the no-tool audit.

**What the root did.** Each decision followed a similar pattern. It ran `query`
calls first (`targets`, `screens`, `ledger`, sometimes `sequences`; 7–13 per
decision). It then spent 8–15 turns printing compact projections of
`program`, `specRules` and `train` (component lists, rule keys, design limits,
order-field sequences). After that it built three to five patches in code and
stored them in globals. It ran `check_patch` and then `estimate_patch` on each,
and called `FINAL` from code. The root rarely used `llm_query`: one decision
made two requests. The first was refused for size (74,982 bytes against the
64,000 limit). The second compared unfinished-task traces with the signing
rules and concluded the stopping cause was unproven. The root then chose no
change. 102 of 156 cell outputs reached the 3,000-byte limit and were cut.
The root tended to print as much as it was allowed and then narrow down in the
next turn. Cell errors were an unsupported `sequences` filter, the oversized
sub-call, and one `FINAL` rejected because `rejected` did not list every
candidate; the next turn fixed it. A one-decision R smoke run on night-01/P1
(accepted, 19 turns) was replayed with `--backend replay`. The decision record
(outcome, choice, candidates, certification, validation) matched exactly.
The pilot's night-08/P1 R sample (27 turns, one sub-call, no change) was
also replayed exactly: all root and sub-call prompts matched, and so did the summary
transcript and decision record. It took 171 s, with no new model usage.

**Pilot recommendation (before the approved follow-up).** Do not run the full
35×2 paired study as configured. R
fixes E's failure mode: every R sample submitted within budget. On these seven
decisions it does not beat B, and it uses about twice the tokens. With one
sample each, the pilot cannot show a 10-point acceptance difference in either
direction. The full study would take about 15 hours of wall time with one worker, or about 7.5 with two.
It would make sense after two cheap changes: guide the root to print less
(more than half of its turns hit the output cap), and give it a starting digest
of hotspots so the opening exploration takes fewer turns. Both are prompt-only
changes that should be declared before the study.

## Paired B/R follow-up, pre-declaration 2026-11-09

The owner approved the full follow-up on 2026-11-08. Before any live study call,
R receives exactly two prompt changes: compact-output guidance (aim for at most
1,000 UTF-8 bytes per cell, well below the unchanged 3,000-byte stdout cap), and
an opening hotspot digest capped at **4,000 UTF-8 bytes of valid JSON**. The
first root request alone includes up to five screens ranked by train clicks +
scrolls, four repeated sequences ranked by completed-task frequency, and four
ledger-head entries in the supplied order. Whole rows are removed if necessary
to meet the byte cap; totals and truncation remain explicit. The digest uses the
same pure train queries as the REPL. It omits geometry, raw context, validation,
world paths and historical outcomes. A partition test makes reads of holdout,
raw train input, history and earlier programs throw, and checks both recorded
root requests. The existing recording/replay test re-executes the new opening.

All budgets, quotas, candidate/gate/validation rules and production defaults
remain unchanged. The primary comparison is 35 decisions × two samples × B/R,
two harness workers, Codex `gpt-6.1-sol`, high reasoning, default service tier.
Samples are averaged within decision; the paired bootstrap uses 10,000
iterations and seed 20261103. R beats B only with at least 10 percentage points
greater acceptance, a strictly positive lower 95% bound, and nonnegative
validation click and scroll differences. Offline screen checks and simulated
user offers remain skipped, so acceptance is a hypothetical release.

The prompt pre-declaration commit is `db57833a4d69be79e525f1f67d69c18add194eda`.
It was committed before any live follow-up call.
A one-decision R smoke and its exact replay precede the full study. A cheaper
model, if available through existing credentials, is tested on the pilot's seven
decisions, one sample: first for sub-calls only, then for root and sub-calls.
The default arm remains the owner's decision.

### Source rebase and sanity

The new source is
`/home/saithat/Projects/VGI-Health/runs/quality-BR-source-20261109`.
Only `manifest.json`'s world path and world fingerprint, and
`world/manifest.json`'s fixture-index path changed from the surviving BE source.
All other 639 copied files have identical SHA-256 hashes. Programs,
certifications/specs, decisions, days, model recordings, fixtures and schedules
also pass tree-hash equality. `rebase-BR-receipt.json` retains every file hash.
The rebased world fingerprint is
`69ec67455f08956339c529ab0998e18b8936982de7c5684fc9d328becd02d257`.
Original provenance receipts remain unchanged, including earlier archive-binding
mismatches described in [the BE methods](agent-loop.md#frozen-source-and-build-binding).

The new sanity replay completed in 2,455.17 seconds, before any live study call.
All 35 decisions and 120 nonseeded candidates match the BE sanity run exactly
on outcome, chosen candidates, candidate checks/estimates, certification,
validation and training evidence: **17 accepted / 10 rejected / 8 no change**.
`sanity-diffs.json` also matches by decision; concurrent completion order varies.
`sanity-comparison.json` retains the comparison, with full metadata differences
in `sanity-metadata-differences.json`. There are 315 metadata differences: run
IDs, timestamps, wall time, replay-source paths and the documented manual hash
and prompt-size difference. No evaluation difference occurred. The new sanity
`records.json` SHA-256 is
`e0cdc5b12210b7a394f1458c4b4883bcf0f523a9008739146f867f5b87153eab`. The app hash stays
`030fac6d782d07099213018114de92b4facd19952201e094b4c3890e7edfef60`;
the read-only native executable stays
`750e9833da4f1ac8373455de911334f6afdb7802bce95822d657b454a9b430d0`.
No Lean build or edit is involved. The production-argument bwrap confinement
probe passed before the follow-up; live R never uses unconfined execution.

### Commands

Run from this lane worktree, whose local `runs` symlink points to
`/home/saithat/Projects/VGI-Health/runs`. This satisfies the harness's local
output-directory guard while storing only new BR directories in the main run
store. Existing run directories are read-only. The generated B manual reads
optional `runs/core-10day` examples. The pilot worktree had none; exposing the
main run store would add two examples (2,559 characters) and change its hash
from `78e74920576598291b46ffcdde18de65ed9e93abf5583ef2c0a8901809146c06`
to `de95d3924e6dd717a78beaa779d4eb23ebee0dff8108a1f5d0d146ed7f56b4f6`.
Live and smoke-replay commands therefore use a private mount view that hides
that optional directory, restoring the exact pilot manual hash without editing
any files. The sanity replay started before this was detected: its generated
prompt metadata differs, but replay uses frozen model outputs. Candidate,
certification, validation and outcome equality are checked separately. The source/sanity paths below
replace the removed-worktree workaround; the old symlink is retained until the
study has completed and been verified.

```sh
export TMPDIR=/home/saithat/Projects/run-tmp CI=true EHR_SCREEN_WORKERS=2 LEAN_NUM_THREADS=4
export EHR_BIN=/home/saithat/Projects/VGI-Health/lean/.lake/build/bin/ehr
DATA=/home/saithat/Projects/VGI-Health/runs
SOURCE="$DATA/quality-BR-source-20261109"
SANITY="$DATA/quality-BR-sanity-20261109"
OUT="$PWD/runs"
cd agent
# Preserve the pilot's absent optional examples; the real directory is untouched.
mkdir -p "$TMPDIR/BR-empty-core"
study() {
  bwrap --die-with-parent --bind / / --dev-bind /dev /dev \
    --ro-bind "$TMPDIR/BR-empty-core" "$DATA/core-10day" -- "$@"
}
flock "$TMPDIR/vgi-browser-heavy.lock" ./node_modules/.bin/tsx src/cli.ts proposal-quality \
  --run "$SOURCE" --out "$OUT/quality-BR-sanity-20261109" --arms sanity --samples 1 --workers 2 \
  --backend replay --model gpt-6.1-sol --reasoning-effort high --service-tier default
study flock "$TMPDIR/vgi-browser-heavy.lock" ./node_modules/.bin/tsx src/cli.ts proposal-quality \
  --run "$SOURCE" --out "$OUT/quality-BR-smoke-20261109" --arms R --samples 1 --workers 1 \
  --decisions night-01/P1 --backend codex --model gpt-6.1-sol --reasoning-effort high \
  --service-tier default --ledger-from "$SANITY"
study flock "$TMPDIR/vgi-browser-heavy.lock" ./node_modules/.bin/tsx src/cli.ts proposal-quality \
  --run "$SOURCE" --out "$OUT/quality-BR-smoke-replay-20261109" --arms R --samples 1 --workers 1 \
  --decisions night-01/P1 --backend replay --model gpt-6.1-sol --reasoning-effort high \
  --service-tier default --ledger-from "$SANITY" --tool-replay-from "$DATA/quality-BR-smoke-20261109"
study flock "$TMPDIR/vgi-browser-heavy.lock" ./node_modules/.bin/tsx src/cli.ts proposal-quality \
  --run "$SOURCE" --out "$OUT/quality-BR-20261109" --arms B,R --samples 2 --workers 2 \
  --backend codex --model gpt-6.1-sol --reasoning-effort high --service-tier default --ledger-from "$SANITY"
# Continue the same full command with --resume after interruption; never restart it.
```

Data and execution receipts stay untracked. No full browser audits run in this
lane because no app source changes. Agent lint, typecheck and targeted unit tests
are the lane checks; CI runs the remaining suite after merge.

## Limitations

- The root sees only what it prints, so it often prints things more than once.
  Turn count is the main cost driver; the pilot shows how many turns the root
  actually used.
- Each Codex root turn is a fresh `codex exec` in a new private directory. The
  CLI's own system prompt (about 11.8K tokens) is resent each turn; about 31% of pilot
  input was cached. A persistent session would lower the cost but would mean a new
  Codex transport.
- A cell that hits the REPL time limit restarts the REPL. That depends on timing,
  so a decision whose cell only just hits the limit may not replay identically.
- The node permission model and `vm` are defence in depth; bwrap is the OS
  boundary. On hosts without bwrap the harness can still run with
  `confinement: 'none'`, but only unit tests use that.
