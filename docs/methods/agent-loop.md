# Arm E: tool-driven frozen nights

E is opt-in (`proposal-quality --arms B,E`). Production discovery and the A/B/C/D
prompt/choice policies retain their existing behavior. Only the owner decides
whether E should become the default after reviewing a completed paired comparison.

`agent/src/agent-loop.ts` supplies a compact task/persona/night identity, allowed
moves, selector patch addressing, thirteen safety-property summaries, movement
budget, decision budgets and tool descriptions. The starting prompt contains no
program, exported spec, recorded examples, full manual or outcome history. The
unit fixture checks the entire starting prompt plus tool schemas below 15,000
UTF-8 bytes, a conservative bound below the requested 15K tokens. Program values
arrive only in tool results. Patch tools and submit use the existing wire patch
format (`op`, `path`, `from`, `valueJson`); selector segments address IDs or tags.
Each candidate applies independently to the frozen current program.

## Capabilities

| Tool | Arguments and result |
|---|---|
| `list_screens` | No arguments; start screen, IDs, titles, workflows and counts. |
| `get_screen` | `id`; that source screen, referenced component definitions and macros. |
| `get_component` | `screenId`, `id`; one source component by ID or tag. |
| `render_screen` | `id`; at most three actual measured states from the exact current-program training atlas, with total/truncation metadata. Missing geometry is explicit. No PNG transport in this version. |
| `screens`, `targets` | Optional day/task/screen/target/limit filters; completed-task physical aggregates. Targets also accepts interactions/travel sorting. |
| `steps` | Required task, optional day/screen; ordered train steps, including incomplete tasks. |
| `scroll_past` | Required target; optional physical filters; measured components crossed during reveal. The C CLI spelling remains `scroll-past`. |
| `sequences` | Optional limit; repeated sequences across completed training tasks. |
| `ledger` | Optional target/limit; earlier candidates and bound, recomputed train savings. |
| `spec_rules` | `screenId`; exported entries/reviews/alerts and definitions for commits represented in that screen's workflow (including macros), for the current role, plus design limits and safety-property summaries. |
| `check_patch` | `patch`; native verdict, property, message and counterexample. |
| `estimate_patch` | `patch`; native check followed by the ordinary `TrainEstimator` on its last-two-train-days window. Never validates against held-out tasks. |
| `complain` | `text` (at most 4,000 characters); recorded verbatim, independent of proposal acceptance. |
| `submit` | Existing proposal fields plus existing choice fields; validates candidates/IDs/patch decoding and ends that conversation. |

The C CLI and E tools use the same pure query engine. Trace bundles are constructed
from train schedules, replayed train results, matching geometry and the measured
ledger. Bundle construction rejects future/even days, non-training tasks and
trace/atlas binding mismatches. Day-specific atlas workspace states are filtered.
The model receives no world/repository paths, other personas, holdout schedules,
validation scores, blind measurement days or history outside the ledger.
The typed spec is public rule data; it is never changed by these tools.

## Transport, recording and limits

`runToolTurns` is the one host loop for Claude API `tool_use` and compatible
Chat Completions `tool_calls`. Tools are not passed through the structured JSON
completion path. Function replies are validated locally; finish truncation,
missing usage and completion without `submit` fail. Tests use a fake loopback
HTTP server, never an external compatible model or OpenAI API key.

Codex runs inside the existing bwrap private-directory confinement, with a private
configuration exposing only a required `night` stdio MCP server. Shell, apps,
plugins, browser, code mode, multi-agent tools and web search are disabled.
The model has no shell, filesystem, arbitrary endpoint or network capability.
The trusted Codex client retains model connectivity/authentication. The small
MCP adapter imports no filesystem API and connects only to its launch-time Unix
socket. A host dispatcher owns the frozen objects, native checker and estimator;
it exposes no arbitrary native commands. MCP resources/prompts and unknown methods
are refused. Transcript auditing rejects foreign MCP and unknown tool families.
The Codex output JSON must equal the server-side submitted JSON.
Configuration follows the [official Codex MCP documentation](https://developers.openai.com/codex/mcp/).

Default limits per decision, including final-certification repair conversations:
60 tool calls, 12 `check_patch` calls, 8 `estimate_patch` calls, 900,000 ms and
120,000 input-plus-output tokens. The CLI exposes `--tool-max-calls`,
`--tool-max-checks`, `--tool-max-estimates`, `--tool-wall-ms`, `--tool-max-tokens`.
Invalid tool attempts consume the call budget. Estimates include their own native
certification; post-submit gate checks are independent of tool quotas.
Visible text is conservatively charged by UTF-8 bytes, and API usage is charged
at every model turn. APIs cap output to the remaining budget. Codex reports usage
only when its turn completes: its total-token ceiling is an acceptance ceiling,
not a guaranteed billing cap; an over-budget turn is rejected. Its wall timer
terminates the CLI. Native operations retain their existing subprocess timeouts;
a checker/estimator already in flight may finish after the decision deadline, but
cannot authorize an expired submission. No partially executed E conversation is
automatically retried; an interrupted sample restarts under the existing resume
protocol, retaining partial journals separately.

Every attempted tool call is persisted in `samples/<decision>/E/<sample>/tools/`:
ordered index, tool, arguments, complete result, result byte count and prior
usage accounting. LLM recordings retain API turns or Codex transcript, tool
events, usage and budget statistics. Tool errors redact host paths.
`--backend replay --arms E --tool-replay-from <completed-E-output>` re-executes
recorded calls against the frozen capability inputs, verifies every result and
byte count, then verifies the exact submitted proposal/choice. Completed and budget-rejected E conversations have replayable tool journals; failed conversations replay their recorded refusal. E rejects prompt
drift even though historical A/B/C/D replay can allow it. Replay token totals are
recorded references; replay wall time is newly measured. No model is called.

## Gates and reports

`ToolNightAgent` plugs into `runNight` through a prompt hook and a submitted choice.
Candidate pre-screening, combination compatibility, whole-program certification,
up to three counterexample repairs, held-out replay, movement and interaction
acceptance rules are unchanged. Repair conversations use a minimal prompt with the
actual failed patch/verdict and share the original decision budget.
No candidate check/estimate tool result substitutes for a final gate.

The existing **frozen quality harness** calls `runNight(..., {offline:true})`:
it records hypothetical validation acceptance, skips the screen gate and simulated
user offer, and never deploys. That limitation applies equally to A/B/C/D/E and
remains explicit in report labels. Screen checks and simulated user response still
apply in an ordinary non-offline night. Consequently this harness cannot establish
that a proposal would pass all shipping gates. This lane does not claim otherwise.

Reports retain the original columns and decision-level paired bootstrap: average
two samples within each decision, resample decisions 10,000 times, seed 20261103;
E beats B only for at least 10 percentage points greater acceptance, a strictly
positive lower 95% bound, and nonnegative validation click and scroll differences.
No acceptance threshold or interval rule changes for E.
Additional fields report tool tallies, direct checker/estimate requests, final-gate
repairs, complaints and daily train-minus-validation click+scroll gap per arm.
The gap uses samples with both measures and different task partitions; the sample
count is reported. It is a diagnostic, not a fitted selection rule.
“Repairs avoided proxy” counts pre-submit native failures in validation-accepted
samples with zero final-gate repairs. It is an operational count, not a causal
counterfactual estimate.

`query-cache-report.json` ranks exact tool+argument queries by frequency, with
distinct decisions, result variants and total result bytes. It includes verbatim,
deduplicated complaints. `cached-starting-digest.json` proposes the top eight
read-only queries and observed results in separate persona/night/sample scopes,
capped at 24K bytes each. Checks, estimates, complaints and submissions do not
enter this digest. Neither file is automatically supplied to a future agent.

## Experiment status, 2026-11-08

The requested 35-decision / two-sample E-versus-B comparison is blocked by inputs
and this lane's browser restriction, before making model calls:

* `/home/saithat/Projects/VGI-Health/runs/core-10day-live` is absent.
  The original snapshot survives in `quality-live-ABC-20261103/inputs`, with all
  35 selected decision IDs in its binding. Its `source-manifest.json` is retained;
  this is not a ready replacement source directory with `manifest.json`.
* The recorded A/B/C native binding is
  `c89cd5066752ab2d1f11805fd57b47207cb2d8fcd22ea876fe3af3b7bb1b188e`;
  the supplied current native checker hashes to
  `750e9833da4f1ac8373455de911334f6afdb7802bce95822d657b454a9b430d0`.
* The recorded app binding is
  `b9c38d84ddbccd8ebf91d8900c1b22c4263aa6d5054ede0b327f12ecff8cee0a`;
  the available build is
  `030fac6d782d07099213018114de92b4facd19952201e094b4c3890e7edfef60`.
  The old measured ledger therefore cannot supply current-build B/E evidence.
* New E patches require matching renderer geometry for estimates/validation.
  This lane prohibits browser audits and Playwright. `--geometry-from <directory>`
  reads only matching precomputed Chromium atlases; it fails closed on a new
  program or build, without launching a browser or inventing coordinates.

No E acceptance rate, paired interval, experimental complaints or empirical cache
digest is available. Fake-server and scripted transport tests are plumbing checks,
not proposal-quality measurements. Historical B's 91.4% acceptance is not a fresh
paired reference. The attempted command and input binding evidence are retained
outside git in `runs/quality-E-20261108/`; verification is listed below.

To complete the experiment in a permitted lane, restore a provenance-checked
original source from the surviving snapshot, recompute the bound sanity ledger
under the chosen native/app build, then run B and E together. A full set of matching
precomputed atlases may replace live geometry; arbitrary new E designs will normally
need new browser captures. Do not reuse a mismatched historical ledger or relax
physical gates to produce a table.

```sh
export TMPDIR=/home/saithat/Projects/run-tmp CI=true
export EHR_BIN=/home/saithat/Projects/VGI-Health/lean/.lake/build/bin/ehr
# SOURCE and SANITY must first be restored/recomputed in a permitted lane.
pnpm --filter agent proposal-quality --run "$SOURCE" --ledger-from "$SANITY" \
  --out "$TMPDIR/quality-E-paired" --arms B,E --samples 2 --workers 2 \
  --backend codex --model gpt-6.1-sol --reasoning-effort high --service-tier default
# Copy completed output into this worktree's runs/; never stage that directory.
```

Output may be a new direct child of this worktree's `runs/` or `$TMPDIR`.
`--app-build <build.json>` permits reading a certified build descriptor in an
adjacent checkout without writing there. `--geometry-from` has no browser fallback.

## Targeted verification

All commands ran in `/home/saithat/Projects/VGI-agent-loop` with:

```sh
export TMPDIR=/home/saithat/Projects/run-tmp CI=true
export EHR_BIN=/home/saithat/Projects/VGI-Health/lean/.lake/build/bin/ehr
pnpm install --offline --store-dir /home/saithat/Projects/run-tmp/vgi-pnpm-store
pnpm --filter agent lint
pnpm --filter agent typecheck
PATH="$HOME/.elan/bin:$PATH" pnpm --filter agent exec vitest run test/agent-loop.test.ts test/codex-options.test.ts test/quality.test.ts test/quality-queries.test.ts test/quality-golden.test.ts test/quality-locality-corpus.test.ts test/openai-compat.test.ts test/model-compare.test.ts test/resume.test.ts test/recording-ehr.test.ts test/night.test.ts --maxWorkers=2
PATH=/usr/local/bin:/usr/bin:/bin pnpm --filter agent exec vitest run test/agent-loop.test.ts test/codex-options.test.ts test/quality.test.ts test/quality-queries.test.ts test/quality-golden.test.ts test/quality-locality-corpus.test.ts test/openai-compat.test.ts test/model-compare.test.ts test/resume.test.ts test/recording-ehr.test.ts test/night.test.ts --maxWorkers=2
git diff --check
```

| Check | Result |
|---|---|
| Offline install using the disk-backed store | Dependencies installed; lockfile unchanged. Initial default store was unwritable. |
| Agent lint / typecheck | Passed / passed. |
| Targeted tests with elan on PATH | 74 passed, 19 archive-dependent skips. |
| Same tests without elan on PATH | 74 passed, same 19 skips. |
| Native checker test | Supplied binary checks pass/refusal twice each with identical verdicts; no Lean build. |
| Compatible-backend smoke | Fake local HTTP server, three tool turns, normalized usage 300 input / 30 output tokens; exact replay and tamper rejection pass. No external compatible model or keys. |
| Claude transport | SDK stream stub, shared two-turn tool loop passes; no external model. |
| Codex transport | Fake executable, real bwrap/stdio MCP/Unix socket, recorded exact replay passes; missing submit and foreign tools refused. |
| Whitespace check | Passed. |

The skipped tests require this worktree's missing `runs/core-10day` archive: 15
night tests, two golden-context tests, one locality corpus test and one resume
test. No archive was staged or copied merely to make these skips disappear.
The new tool suite's native checker test explicitly disables the test runner's
usual fake-EHR default, so both PATH runs exercise the supplied native executable.

Exact blocked experiment command (exit 1, missing source; zero model calls):

```sh
pnpm --filter agent proposal-quality --run /home/saithat/Projects/VGI-Health/runs/core-10day-live --out "$TMPDIR/quality-E-20261108" --arms B,E --samples 2 --workers 2 --backend codex --model gpt-6.1-sol --reasoning-effort high --service-tier default --ledger-from /home/saithat/Projects/VGI-Health/runs/quality-sanity-density-20261103 --geometry-from /home/saithat/Projects/VGI-Health/runs/quality-live-ABC-20261103 --app-build /home/saithat/Projects/VGI-Health/app/dist/build.json
```

No Lean/WASM/app builds, browser audits, Playwright, heavy lock, Docker changes,
production deployment, push or writes to the main checkout occurred. Certified
app sources, lockfile and Lean specifications/properties are unchanged. Full
verification and the measured experiment remain for the later permitted lane.

Owner questions:

* Use the surviving A/B/C frozen snapshot as the restored original source?
* Which permitted geometry lane/build should recompute sanity and run paired B/E?
* After measured results exist, should E remain opt-in or become the default?

## Live Codex transport smoke (separate from the experiment)

A confined smoke used the requested `gpt-6.1-sol`, high reasoning and default
service tier, with the real P1 source program and no training data. Its prompt
required `list_screens`, one complaint and `submit(noChange)`, prohibiting edits.
It did not call the checker, estimator, holdout, browser or shipping gates.

```sh
pnpm --filter agent exec tsx "$TMPDIR/agent-loop-codex-smoke.mts"
pnpm --filter agent exec tsx "$TMPDIR/agent-loop-codex-smoke.mts" --replay
```

The script and journals are retained under `runs/quality-E-20261108/`, outside git.
Two live attempts occurred: a deliberately smaller 60,000-token acceptance ceiling
refused a 64,025-input/350-output turn after three tools; the 120,000-token repeat
passed with 64,006 input, 286 output and 50,304 cached input tokens in 14.2 seconds.
Both used exactly one `list_screens`, one `complain` and one `submit` call.
The passing transcript audit found zero forbidden tool events. Replaying that
real recording re-executed all three tool results exactly, preserved its submitted
JSON and token accounting, and made no model call. Budget-failure recording/replay
is also covered by a targeted regression test.

Deduplicated smoke complaint (verbatim; this is not an experimental complaint):

> Transport smoke has no training evidence; quality comparison not evaluated.

The only cacheable smoke query was `list_screens({})` (once per attempt). Its
proposed digest is limited to that observed screen inventory and marked
transport-only; it provides no empirical cross-decision caching conclusion.
No digest was promoted. This smoke cannot establish E's proposal quality or
shipping acceptance; the 35-decision paired experiment remains unrun.
