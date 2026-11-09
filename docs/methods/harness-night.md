# Arm H: harness-native night agent

H is opt-in (`proposal-quality --arms B,H --harness codex|claude`). The default
arm and production discovery are unchanged.

Arms E and R used a model as a stateless JSON function inside our own loop. The
Codex and Claude Code CLIs are post-trained in their own harnesses: a persistent
session with compaction, files and shell commands, and an edit → test → fix
loop. H runs the real CLI agent in a per-decision workspace and lets it work
natively. The night's independent certification, final-gate repairs and held-out
validation run unchanged after it submits.

## Workspace

`agent/src/harness/workspace.ts` is the partition boundary. It reads only the
current program, the current release spec, the night/persona identity and the
same train-only `QueryBundle` that E and R receive. The holdout closure, decision
history, earlier programs, raw `NightInput.train`, world paths and validation
scores are never read. A unit test seeds those with sentinel strings and checks
that no workspace file contains them. A second test runs inside the real sandbox
and greps `/work`, the private home, `/run/harness` and `/tmp` for them.

Each decision gets a private temp root holding three directories:

| In the sandbox | Contents | Access |
|---|---|---|
| `/work` | `README.md` (goal, rules, file layout, CLI usage, budget), `AGENTS.md`/`CLAUDE.md` (one-line pointers to README), `meta.json`, `program.json`, `spec.json`, `screens.json`, `screens/<id>.json` (screen + referenced component definitions and macros), `spec-rules/<id>.json` (E's `spec_rules` projection), `renders/<id>.json` (every exact current-program training Chromium state), `train/{traces,attribution,geometry,ledger,locality}.json`, `queries/{screens,targets,targets-travel,sequences,ledger}.json` (precomputed training queries), `schema/submission.schema.json`, `examples/` | read-write; inputs are mode 0444 |
| `/home/agent` | the CLI's private state and credential copy | read-write for the CLI; denied to its tools (below) |
| `/run/harness` | `bin/night`, `entry.mjs`, `night.sock`, `egress.sock` | read-only |

## The night CLI

`night check <patch.json>`, `estimate <patch.json>`, `render <screen>`,
`query <name> [filters]`, `complain <text>`, `submit <submission.json>` or
`submit --no-change "<hypothesis>"`, and `status`. The CLI
(`agent/src/harness/night-cli.mjs`) has no logic. It sends its argv, plus the
named file's text for check/estimate/submit, as one JSON line over
`/run/harness/night.sock`, prints the one-line JSON reply and exits 0 (ok),
1 (command error), 2 (budget exhausted or already submitted) or 3 (usage).

`HarnessHost` (`agent/src/harness/host.ts`) serves the socket. It serializes
requests and uses E/R's code paths: `wirePatch`, `checkPatch` with the night's
gate, `TrainEstimator`, `queryTraining`, `currentRenderSamples` and
`validateSubmission`. Quotas match E and R: 12 checks and 8 estimates. There are
120 commands in total; `submit` and `status` are always served, so an agent can
always finish. One submit ends the loop. A final-gate rejection writes
`REPAIR.md` into the workspace and launches the CLI again in the same workspace.

## Sandbox and egress

`agent/src/harness/sandbox.ts` starts one bwrap sandbox per CLI launch:
`--unshare-all` (network, PID, IPC, UTS, user, cgroup), `--clearenv`, read-only
`/usr`, `/bin`, `/lib*`, `/sbin` and the TLS/user files from `/etc`, private
`/proc`, `/dev` and `/tmp`, and only the three directories above. The host's home,
repository and run store are not mounted.

The sandbox network namespace has only loopback. `entry.mjs` listens on
`127.0.0.1:18443` inside it, forwards each connection to the bind-mounted
`egress.sock`, sets `HTTPS_PROXY`, and runs the CLI. On the host,
`agent/src/harness/egress.ts` accepts only `CONNECT <host>:443` for an exact
allowlist (Codex: `chatgpt.com`, `api.openai.com`; Claude Code:
`api.anthropic.com`) and logs every attempt. Everything else gets a 403. TLS is
end-to-end; the proxy sees host names only. Tests check that writes to
`/run/harness`, `/usr` and an unmounted host path fail, that direct network
fails, and that a proxied CONNECT to a host not on the list returns 403.

The two CLIs are configured inside that boundary as follows.

- **Codex**: `codex exec --json -s workspace-write -c
  sandbox_workspace_write.network_access=false -c approval_policy="never" -c
  web_search="disabled" -c mcp_servers={} --ephemeral -C /work -m <model> -o
  /home/agent/final-N.txt -`, with apps, plugins, browser use and multi-agent
  disabled, and the default service tier. Codex's own sandbox therefore also
  confines each shell command (writable `/work` and `/tmp`, no network). A
  managed `/etc/codex/requirements.toml` denies tool reads of
  `/home/agent/.codex/auth.json`. Codex exec has no turn limit; wall time and
  the command quota bound it.
- **Claude Code**: `claude -p --output-format stream-json --verbose
  --max-turns <n> --tools Bash,Read,Glob,Grep,Edit,Write --permission-mode
  dontAsk --setting-sources user --strict-mcp-config --no-session-persistence
  --disable-slash-commands`. `--allowedTools` is `Read(//work/**)`,
  `Edit(//work/**)`, `Write(//work/**)`, `Glob`, `Grep` and
  `Bash(night|ls|cat|jq|head|wc|grep:*)`. `--disallowedTools` denies reads and
  writes under `/home/agent`, writes to `/work/.claude`, WebFetch, WebSearch and
  subagents. In `dontAsk` mode anything not pre-approved is refused, including
  compound or path-escaping shell commands. No permission bypass flag is used
  anywhere. The sandbox gets the host's OAuth access token only, with no refresh
  token, so it cannot rotate the host's credentials. If the token would expire
  during the launch, the harness waits until it nears expiry and lets the host's
  own CLI refresh it with one trivial call.

## Budget

Per decision: 20 minutes of wall time shared by every launch, 120 night commands,
12 checks, 8 estimates, one submit, `--max-turns 150` per Claude launch, and at
most 2 launches. A second launch happens only if the agent ends without
submitting; it is a fresh session told to finish from its notes. Wall time
stops the CLI (SIGTERM, then SIGKILL) and ends the decision with
`HarnessBudgetError`, recorded as `llm-error` like R's budget errors. Flags:
`--harness-wall-ms`, `--harness-max-commands`, `--harness-max-turns`,
`--harness-max-launches`; `--tool-max-checks` and `--tool-max-estimates` apply to
E, R and H. Tokens are taken from each CLI's own usage output: Codex
`turn.completed` usage (input, cached input, output) and the Claude Code
`result` event (input + cache read + cache creation, cache read, output).

## Recording, replay and audit

Each sample records:

- every night command (`harness/events/NNN.json`): its request (argv and file text), exit code and exact output;
- each launch's full CLI transcript (`harness/launch-N.jsonl`) and metadata (`harness/launch-N.json`): arguments, exit, usage, egress log, audit, stderr tail and the CLI's last message;
- the files the agent created or changed (`harness/workspace/`);
- the summary `llm/<callId>.json` with the submission, the command slice for that loop and the workspace hash.

The audit fails a launch on any tool family outside the declared set (Codex:
MCP, web search and the like; Claude Code: anything but the six tools) and on
any command or tool input that names the CLI's private home, credential files,
`/proc` or the egress socket, even if the attempt was denied.

**The replay guarantee is weaker than R's.** A CLI agent's model calls cannot
be replayed exactly. `--backend replay --tool-replay-from <run>` instead checks
that the workspace bytes are identical (SHA-256 over every file), re-executes
every recorded night command in order against a fresh host, and requires every
exit code and output to match byte for byte. It also requires the same
submission. The submission then passes again through the same independent final
gate and held-out validation. This proves the recorded checks and estimates and
the decision outcome. It does not prove that the model would produce the same
transcript again.

## Pre-declaration (owner approved 2026-11-09)

Committed while the pilot was running, before any H pilot result had been read.
The H smokes on night-01/P1 (one per harness) had already finished.

**Pilot.** The seven decisions are night-01/P1, night-02/P2, night-04/P3, night-05/P4,
night-07/P5, night-08/P1 and night-09/P2. Each harness runs one sample per decision.
Codex uses `gpt-6.1-sol` with high reasoning and the default tier. Claude Code uses
its default model. The budgets are the defaults above.

**Comparator.** B is the B arm of the full paired B/R study
`runs/quality-BR-20261109`, which has two samples per decision. It used the same
build, the same frozen source (`quality-BR-source-20261109`) and the same sanity
ledger. It was not run at the same time as H. The pilot's own codex run also
contains fresh B samples, which started before this rule was declared. They are
reported for reference only and do not enter the rule. On the seven decisions,
B's sample-averaged totals are 4.5 accepted decisions and 17.5 + 281.5 = 299
validation clicks plus scrolls saved.

**Continuation rule, applied to each harness separately.** A harness continues if:

- H's accepted decisions are at least B's minus one decision (≥ 3.5, so at least 4 of 7); and
- H's validation clicks plus scrolls saved are at least B's (≥ 299).

A qualifying harness then runs the full 35-decision × 2-sample study
automatically, without waiting for review. It uses `--workers 4`, the browser
lock, systemd-run with `MemoryMax=16G`, and B reused from
`quality-BR-20261109` (see `--reuse-arm-from`). If both harnesses qualify, their
studies run one after the other, never at the same time. The full study uses
the same decision rule as the B/R study: a decision-unit paired bootstrap with
10,000 iterations and seed 20261103. If neither harness qualifies, the work
stops after the pilot and is reported.

## Smokes

There was one smoke on night-01/P1 per harness. The first Codex smoke showed
that Codex's own workspace-write sandbox refuses socket connections from shell
commands, so every `night` call failed with EPERM and the agent could not
submit. The CLI transport was changed from a Unix socket to the file spool
before any recorded result. The second Codex smoke and the Claude Code smoke
were both accepted: 12 clicks and 20 scrolls saved for Codex, 0 and 11 for
Claude. A replay of the second Codex smoke (`--backend replay
--tool-replay-from`) made no CLI launch. It re-executed all 12 night commands
identically, and its outcome, candidates, certification, validation and choice
equal the recording.

## Pilot, 2026-11-09

The seven pre-declared decisions were run with one sample per harness and the
default budget. The comparator is B from the full B/R study, averaged over
its two samples per decision. The B column of the pilot's own Codex run was
started before the rule was declared; it is for reference only.

| Arm | Accepted | Validation clicks saved | Validation scrolls saved | Input tokens / decision | Cached input / decision | Output tokens / decision | Seconds / decision | Night commands / decision |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| B (B/R study, 2 samples) | 4.5/7 | 17.5 | 281.5 | 207,275 | 4,562 | 5,271 | 336.8 | – |
| B (fresh, reference) | 6/7 | 33 | 270 | 207,299 | 7,863 | 5,953 | 364.8 | – |
| H-codex (`gpt-6.1-sol`, high) | 5/7 | 20 | 126 | 1,523,356 | 1,456,494 | 8,239 | 357.4 | 14.6 |
| H-claude (Claude Code default, `claude-opus-5-5`) | 5/7 | 22 | 480 | 2,067,912 | 1,971,467 | 14,050 | 524.8 | 11.7 |

Per decision, validation clicks/scrolls:

| Decision | H-codex | H-claude |
|---|---|---|
| night-01/P1 | rejected (−1 click, 103 scrolls) | 16/6 |
| night-02/P2 | 8/39 | 0/408 |
| night-04/P3 | 0/0 (pixels only) | rejected (−1, 78) |
| night-05/P4 | 0/56 | 0/0 (pixels only) |
| night-07/P5 | 12/11 | 0/20 |
| night-08/P1 | no change | rejected (−1, 60) |
| night-09/P2 | 0/20 | 6/46 |

**Rule.** H-codex accepted 5 decisions, which meets the floor of 3.5. It saved
146 clicks plus scrolls, short of B's 299, so it does not qualify. H-claude
accepted 5 decisions and saved 502 clicks plus scrolls, at least 299, so it
qualifies. 408 of those 502 came from a single decision, night-02/P2, which
collapsed the order-favorites group. The paired comparison against the fresh B
(report.json, 10,000 iterations) for H-codex is: Δ accepted −14.3%, 95%
interval −42.9% to 0, Δ clicks −13 and Δ scrolls −144. Only the H-claude study
ran, as the rule required.

**Mechanism.** Every sample submitted within one launch. No sample needed a
continuation, a final-gate repair, or came near the wall-time limit. The
largest run took 789 s against a 1,200 s limit. Checks per decision were 0–7 of 12,
and estimates 3–8 of 8. One Claude decision used all 8 estimates. Codex averaged 33 shell commands per decision, 88 of the
231 in total ran Python, and it emitted about 40 items per decision. Claude
Code averaged 44 turns, 16 Bash calls, 10 Read, 9 Grep and 8 Write. Its
`dontAsk` allowlist denied 21 calls. Most were Python one-liners or shell
loops, so it fell back to one `night` call per Bash call and to the Read and
Grep tools. Codex's inner sandbox allows Python, so the two harnesses did not
have equal shell freedom. Input was 95–96% cached for both CLIs. Codex used
7.3× B's input tokens and Claude Code 10×, though most of it was cached. The
egress proxy allowed only the model API. It denied 36 Codex connections to
`ab.chatgpt.com`, a telemetry host. The Codex audit passed. Two Claude
samples are flagged by the audit: Claude Code tried to write its auto-memory
files and to grep its own tool-result file under `/home/agent`, and both
attempts were denied by the permission rules. The per-decision private home
is deleted after each decision, so nothing carries over between decisions.

**What the agents did.** Both read README.md first. Then they read the
precomputed queries, screens and renders. Both wrote three to five patch files,
ran `night check` and `night estimate` on each, wrote a submission file and
submitted it. Codex wrote Python helper scripts (`build_submission.py`) that
generated the patches and the submission. Claude Code wrote each patch with
Write and chained `night estimate` calls. On night-08/P1, H-codex measured that
every alternative left 2 of 41 training tasks incomplete and submitted no
change. It also filed the pilot's only complaint, asking for per-task replay
outcomes and the unmet completion requirements. H-claude submitted changes there
that validation rejected. This matches R and B on that decision.

## Full H-claude study, 2026-11-09

H-claude met the pre-declared rule, so it ran automatically on all 35 decisions
with 2 samples each. The run used `--workers 4`, the browser lock and
systemd-run with `MemoryMax=16G`. B (70 samples) was reused from
`runs/quality-BR-20261109` through `--reuse-arm-from … --reuse-arm B`. The
reuse check found every frozen input binding, the native binary, the app build,
the sanity ledger and the B model options identical. `reused-arm.json` records
both agent source hashes; they differ because this branch adds H. B was not run
at the same time as H. The full H-Codex study did not run.

**Usage-limit incident.** The first pass ran at 08:45–11:15 PST. After 13 H
samples the Claude subscription's 5-hour usage limit returned HTTP 429
`usage_limit_reached` (overage disabled). The remaining 57 H samples ended
within seconds as `llm-error` ("agent ended without night submit"). Every one of
the 57 transcripts contains `usage_limit_reached`, and no other sample does.
After the reset these 57 sample directories were moved aside to
`<sample>.limit-1`, with the first pass's records, manifest and report kept as
`*.limit-attempt-1.json` and the list in `limit-resume-1.json`. The manifest was
marked aborted, and the same command was resumed with `--resume` from
identical agent sources. It reran exactly those 57 samples under a watchdog
that would stop the run at the next `usage_limit_reached`. It did not trigger.
The 13 first-pass samples, all accepted, were kept.

| Arm | Accepted | Validation clicks saved | Validation scrolls saved | Input tokens / decision | Cached input / decision | Output tokens / decision | Seconds / decision |
|---|---:|---:|---:|---:|---:|---:|---:|
| B (reused) | 58/70 (82.9%) | 123.5 | 1,747.5 | 209,523 | 5,102 | 5,259 | 338.1 |
| H-claude | 60/70 (85.7%) | 88.5 | 2,783 | 1,754,774 | 1,670,935 | 13,666 | 479.9 |
| R (B/R study, reference) | 57/70 (81.4%) | 46 | 1,698 | 389,967 | 167,375 | 6,931 | 484.6 |

H−B, using the paired decision bootstrap (10,000 iterations, seed 20261103):
Δ accepted +2.9%, 95% interval −7.1% to +14.3%; Δ clicks −35; Δ scrolls
+1,035.5. **Under the declared decision rule H does not beat B**: the rule needs a
gain of at least 10 points, a lower bound above 0, and no loss in clicks. The
scroll gain is concentrated in persona P2. night-02/P2 (+421.5) and night-01/P2
(+394) account for 816 of the 1,035.5. H accepted more often than B on 4
decisions and less often on 3. H's outcomes were 60 accepted, 9 rejected and 1
no change. B's were 58 accepted and 12 rejected.

**Mechanism.** All 70 H samples submitted in one launch. None hit a budget limit
or needed a final-gate repair. The longest took 767 s of the 1,200 s limit.
Samples averaged 10.9 night commands and 41.7 Claude turns. There were 92 checks
and 411 estimates in total, and 11 samples used all 8 estimates. Every
proposed candidate passed the native checker. Every sample was served by
`claude-opus-5-5`. Egress went only to `api.anthropic.com`. The `dontAsk`
allowlist denied 164 calls, mostly Python and shell loops. The audit flags 8
samples. In all 13 flagged attempts, Claude Code tried to write its auto-memory
or read its own tool-result file under `/home/agent`, and every attempt was
denied. H used 8.4× B's input tokens, 95% of them cached, 2.6× its output and
1.42× its wall time. There were no complaints.

## Recommendation

Do not make H the default, and do not run the full H-Codex study as declared:
H-Codex failed the continuation rule. H-claude is the first arm to match or
exceed B's acceptance rate in a full study (60/70 against 58/70), and it saved
about 60% more validation scrolls. Most of that gain comes from two P2
decisions, it saves fewer clicks, and it does not meet the declared rule. It
costs about 8× B's input tokens (mostly cached) and about 1.4× B's wall time on
a subscription that hit its 5-hour limit after 13 samples at 4 workers. Keep H
opt-in. Two changes would make a better-powered follow-up worth running:

- give Claude Code a narrow allowlisted interpreter (for example `node` on workspace scripts), so both harnesses have equal shell freedom;
- run at least 3 samples per decision, so P2's concentration can be separated from noise.

## Commands

```sh
export TMPDIR=/home/saithat/Projects/run-tmp CI=true EHR_SCREEN_WORKERS=2 LEAN_NUM_THREADS=4
export EHR_BIN=/home/saithat/Projects/VGI-Health/lean/.lake/build/bin/ehr
DATA=/home/saithat/Projects/VGI-Health/runs
SOURCE=$DATA/quality-BR-source-20261109 SANITY=$DATA/quality-BR-sanity-20261109
D=night-01/P1,night-02/P2,night-04/P3,night-05/P4,night-07/P5,night-08/P1,night-09/P2
cd agent
lock() { systemd-run --user --scope -q -p MemoryMax=12G -p MemorySwapMax=0 flock "$TMPDIR/vgi-browser-heavy.lock" "$@"; }
lock ./node_modules/.bin/tsx src/cli.ts proposal-quality --run $SOURCE --ledger-from $SANITY --samples 1 --workers 1 \
  --out ../runs/quality-BH-pilot-codex-20261109 --arms B,H --harness codex --decisions $D \
  --backend codex --model gpt-6.1-sol --reasoning-effort high --service-tier default
lock ./node_modules/.bin/tsx src/cli.ts proposal-quality --run $SOURCE --ledger-from $SANITY --samples 1 --workers 1 \
  --out ../runs/quality-BH-pilot-claude-20261109 --arms H --harness claude --decisions $D --backend claude
# Re-verification of a recorded H sample (no model calls):
lock ./node_modules/.bin/tsx src/cli.ts proposal-quality --run $SOURCE --ledger-from $SANITY --samples 1 --workers 1 \
  --out ../runs/quality-BH-smoke-codex2-replay-20261109 --arms H --decisions night-01/P1 \
  --backend replay --tool-replay-from ../runs/quality-BH-smoke-codex2-20261109
# Full study (add --resume to continue an interrupted run):
systemd-run --user --scope -q -p MemoryMax=16G -p MemorySwapMax=0 flock "$TMPDIR/vgi-browser-heavy.lock" \
  ./node_modules/.bin/tsx src/cli.ts proposal-quality --run $SOURCE --ledger-from $SANITY \
  --out ../runs/quality-BH-full-claude-20261109 --arms B,H --harness claude \
  --reuse-arm-from $DATA/quality-BR-20261109 --reuse-arm B --samples 2 --workers 4 \
  --backend codex --model gpt-6.1-sol --reasoning-effort high --service-tier default
```

For a Claude H run, `--backend codex --model …` names B's settings only; the
reuse check compares them. Data stays untracked under the worktree's `runs/`.

## Limitations

- Replay re-verifies the recorded commands and the outcome, not the model's transcript (see above).
- Claude Code's `dontAsk` allowlist denies interpreters; Codex's sandbox allows them. The two harnesses therefore get different shell freedom.
- The Codex credential copy includes its refresh token, as the existing Codex backend's does. A refresh inside the sandbox could rotate it.
- The workspace inputs are 0444, but the agent may delete or replace them inside `/work`. Every check, estimate and submission is evaluated by the host against its own copy, so this can only mislead the agent itself.
- Codex exec has no turn limit; wall time and the command quota bound it.
