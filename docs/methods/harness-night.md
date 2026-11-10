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
  own CLI refresh it with one trivial call. Auto-memory is off: the private
  home's `settings.json` sets `autoMemoryEnabled: false` and the launch sets
  `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` (since the follow-ups below; the pilot and
  full study above ran with it on, and every attempt was denied). The same file
  sets `bashOutputMaxChars: 128000`, so Bash output up to that size stays inline
  (since the 2026-11-10 follow-ups below).

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

A CLI usage or rate-limit refusal is not a budget event; see
[Usage limits pause the run](#usage-limits-pause-the-run).

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

## Follow-ups (owner decisions, 2026-11-09)

### Auto-memory off

The sandboxed Claude Code now runs with auto-memory disabled (settings and env,
above). The audit is unchanged and still fails a launch on any tool input that
names `/home/agent`, so a memory write that slipped through would still be
flagged. A unit test checks the generated settings file and env.

### Usage limits pause the run

`agent/src/usage-limit.ts` recognizes the CLIs' own refusals:

- Claude Code: a `rate_limit_event` with status `rejected`, or an API-error
  message or result with HTTP 429, `usage_limit_reached`, `rate_limit_error`
  or `error: "rate_limit"`;
- Codex: an `error` or `turn.failed` event, or a stderr line, saying "hit your
  usage limit", `usage_limit_reached`, `usage_not_included`, "rate limit exceeded"
  or "429 Too Many Requests".

Tool output and the agent's own text are never matched. Run over every
recorded H transcript (201 launches), the detector flags exactly the 114
launches of the 57 limit-hit samples and nothing else.

If an H launch ends with such a refusal and without a successful submit, the
sample throws `UsageLimitError`, an `InfrastructureExhaustedError`. It is not
retried, gets no continuation launch, and `runNight` rethrows it, so no
`llm-error` record is written. The Codex JSON backend (B, C, E and R), the direct
`claude` SDK backend (since 2026-11-10, below) and R's sub-calls raise the same error. The run stops at the next sample boundary, and
`manifest.json` gets `status: "paused"` and a `pause` object with the CLI, its
message, the reset time when the CLI reports one, and the samples still
pending. Running the same command again with `--resume` after the reset keeps
every sample that has a `record.json`. It moves each other sample directory
to `<sample>.partial-N` for audit and reruns only those. A test drives a fake
CLI that prints each CLI's recorded refusal events, and a fake `codex` binary
for the JSON backend.

### Pre-declaration: H-claude+node (committed before any pilot result)

**Variant.** H-claude+node is H-claude with Claude Code allowed to run Node
scripts in the workspace. Everything else is unchanged: bwrap, the egress
allowlist, `dontAsk`, the denied tools, the budget defaults and the default
Claude Code model. It differs in exactly three places. It is selected with
`--harness claude --harness-interpreter node`.

1. `--allowedTools` gets one more entry, `Bash(node /work/*)`. Claude Code
   matches it on the command text, and `node /work/../x.js` also matches (checked
   with the installed CLI, 2.1.322). Path scoping is therefore enforced by item 2.
2. `/run/harness/bin/node` (read-only, first on `PATH`) is a shim. It runs only a
   regular file whose resolved path is under `/work`. The file runs under
   Node's permission model: `--permission --allow-fs-read=/work
   --allow-fs-read=/tmp --allow-fs-write=/work --allow-fs-write=/tmp`, so it
   cannot read the private home and cannot start child processes, workers or
   addons. `NODE_OPTIONS` and `NODE_PATH` are cleared. Anything else (`node -e`,
   a relative path, a symlink or `..` out of `/work`, a directory) exits 126.
   Network stays confined by the sandbox: loopback plus the
   `api.anthropic.com` CONNECT allowlist.
3. The workspace README gains a short "Scripts (node)" section. Every other
   workspace file is byte-identical to H-claude's.

Auto-memory is now off for every Claude launch (owner decision 1). The variant
therefore also differs from the earlier H-claude pilot in this respect. That
pilot's memory attempts were all denied, so the effect should be at most a
few turns. Tests: the extra allowlist entry and shim exist only in the
variant, and the workspace differs only in the README section. Inside the
real sandbox, the shim runs a `/work` script and refuses `-e`, `..`, symlink
and directory escapes. A script cannot read `/home/agent` even with
`NODE_OPTIONS` set, and cannot spawn a process.

**Pilot.** The seven decisions night-01/P1, night-02/P2, night-04/P3,
night-05/P4, night-07/P5, night-08/P1 and night-09/P2, one sample each,
`--workers 1`. The inputs are exactly those of the H-claude pilot
(`runs/quality-BH-pilot-claude-20261109`):

- frozen source `quality-BR-source-20261109` and sanity ledger `quality-BR-sanity-20261109`;
- native binary sha256 `750e9833…`, the pre-wave-3 build, not rebuilt;
- app build `030fac6d…`.

The run stops before any sample if a frozen-input binding differs from that
pilot's `inputs/binding.json`. Only the agent-source hash and options may
differ. It runs under the browser lock and systemd-run with `MemoryMax=12G`.
A usage limit pauses it, and it resumes as above.

**Comparators.**

- **B**: the same as for H, the B arm of `runs/quality-BR-20261109` (two samples
  per decision). On the seven decisions it averages 4.5 accepted and 17.5 + 281.5 = 299
  validation clicks plus scrolls saved.
- **H-claude**: the H-claude pilot, 5/7 accepted and 22 + 480 = 502 clicks plus scrolls saved.

**Continuation rule.** This is the H-claude rule, unchanged. The variant
qualifies for a full study if it accepts at least B's count minus one (≥ 3.5,
so at least 4 of 7) and saves at least B's validation clicks plus scrolls
(≥ 299). The comparison with the H-claude pilot is descriptive, decision by
decision: Δ accepted, Δ clicks plus scrolls, tokens, wall time, night commands,
permission denials and how often node was used. With one sample per decision
it cannot separate the two harnesses. If the rule qualifies the variant, the
full study would be the H-claude design: 35 decisions × 2 samples, B reused
from `quality-BR-20261109`, `--workers 4`, and the same decision-unit paired
bootstrap (10,000 iterations, seed 20261103). The owner has said not to run it
in this lane, so this lane only reports what the rule says.

### H-claude+node pilot, 2026-11-09

The pre-declared pilot ran as declared (`runs/quality-BH-pilot-claudenode-20261109`).
Every frozen-input binding matched the H-claude pilot's. `worldSha256` is not one of
those bindings: it hashes the copied world, whose manifest names the run's own
`inputs/fixtures` path. The seven per-decision query files are byte-identical to the
H-claude pilot's. All 7 samples completed in one pass, with no usage limit, budget
hit, continuation or repair. `claude-opus-5-5` served every sample.

| Arm | Accepted | Validation clicks saved | Validation scrolls saved | Input tokens / decision | Cached input / decision | Output tokens / decision | Seconds / decision | Night commands / decision | Turns / decision | Denied calls (total) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| B (B/R study, 2 samples) | 4.5/7 | 17.5 | 281.5 | 207,275 | 4,562 | 5,271 | 336.8 | – | – | – |
| H-claude (pilot) | 5/7 | 22 | 480 | 2,067,912 | 1,971,467 | 14,050 | 524.8 | 11.7 | 43.9 | 21 |
| H-claude+node | 6/7 | 8 | 285 | 1,986,783 | 1,899,506 | 14,136 | 505.6 | 12.4 | 50.0 | 18 |

| Decision | B (accepted, clicks/scrolls, mean of 2) | H-claude | H-claude+node | node runs |
|---|---|---|---|---:|
| night-01/P1 | 1, 9.5/72.5 | 16/6 | 0/78 | 0 |
| night-02/P2 | 1, 8/39 | 0/408 | 2/70 | 21 |
| night-04/P3 | 0 | rejected (−1, 78) | 0/78 | 0 |
| night-05/P4 | 1, 0/133.5 | 0/0 | 0/19 | 5 |
| night-07/P5 | 1, 0/28.5 | 0/20 | 0/10 | 14 |
| night-08/P1 | 0 | rejected (−1, 60) | rejected (0, 55) | 8 |
| night-09/P2 | 0.5, 0/8 | 6/46 | 6/30 | 8 |

**Rule.** H-claude+node accepted 6 decisions, which meets the floor of 3.5. It saved
8 + 285 = 293 clicks plus scrolls, 6 short of B's 299, so **the rule does not qualify
it for a full study**. No full study was run, as the owner instructed.

**Against H-claude** (descriptive only; one sample per decision): +1 accepted
(night-04/P3 now passes validation), −201 clicks plus scrolls. Nearly all of
that difference is night-02/P2, where H-claude's single sample collapsed the
order-favorites group for 408 scrolls and this sample found a smaller change
(2/70). Excluding that decision, the variant saves 223 against H-claude's 116
(B: 252). Token use, wall time and night commands are within about 5%.

**What node changed.** Claude Code ran 56 node scripts in 5 of the 7 decisions.
They were helpers that grouped geometry states, listed step targets, or
generated patch and submission files (`geo.mjs`, `mknav.mjs`, `rules.js`).
Denied calls fell only from 21 to 18. Most remaining denials are `cd /work; …`
compounds, `node -e` one-liners and shell loops, which the variant does not
allow. Egress went only to `api.anthropic.com`.

**Audit.** With auto-memory off, there were no memory-write attempts. Three
samples are still flagged: in each, Claude Code tried to read its own
spilled tool-result file under `/home/agent/.claude/projects/…/tool-results/`.
Two were Grep calls, which the permission rules denied. The third passed that
path to a `/work` node script, and Node's permission model refused the read
(`ERR_ACCESS_DENIED`). Every attempt failed, and the audit stays strict, so
those samples remain flagged.

## Follow-ups (owner decisions, 2026-11-10)

### Raised output-spill threshold

Claude Code keeps a successful Bash command's output inline up to a character
limit. Past it, the CLI saves the output to
`/home/agent/.claude/projects/…/tool-results/` and returns a 2 KB preview and
the path. The sandbox denies reading that path. In the H-claude+node pilot, 3
of 7 samples were flagged because the agent tried to read such a file.

The limit is the user setting `bashOutputMaxChars`. Its source is the settings
schema compiled into the installed CLI (2.1.322,
`~/.local/share/claude/versions/2.1.322`). The schema describes it as: "How
many characters of a successful Bash or PowerShell command's output Claude
receives inline (default 30000; values clamp to 4000-128000). Output past this
is saved to a file and Claude receives a short preview plus the path. When set,
this also replaces BASH_MAX_OUTPUT_LENGTH." In the same binary, the Bash tool's
`maxResultSizeChars` getter returns the clamped setting, defaulting to 30000.
The clamp bounds are the constants 4000 and 128000.

The private `settings.json` now sets `bashOutputMaxChars: 128000`, the
ceiling. It is read because launches use `--setting-sources user`. Nothing else
changes:

- The night CLI's own output limits are unchanged (`query --limit`, default
  100 rows). Claude Code still caps inline output at 128,000 characters, about
  32K tokens, so one command's context cost stays bounded.
- The audit is unchanged. Any tool input naming `/home/agent` still fails the
  launch.
- A unit test checks the generated setting and that a spilled-file read still
  fails the audit.

Coverage: across every recorded H-claude transcript (the pilot, the
H-claude+node pilot and the full study), 12 Bash outputs spilled. Eleven were
35,954–49,796 characters and now stay inline. One was a 741,204-character
`night render w3Orders`, which still spills. The full rendering is already in
the workspace as `renders/w3Orders.json`.

**Smoke.** One H-claude+node launch on night-02/P2
(`runs/quality-BH-smoke-claudenode-spill-20261110`). It used the pilot's frozen
inputs; every binding matched the H-claude pilot's. It ran under the browser
lock and `MemoryMax=12G`. Result: validation accepted (8 clicks and 420 scrolls
saved). The audit passed with no findings: no tool input named `/home/agent`
and no output spilled. There was 1 denied call, against 4 for this decision in
the pilot. The launch used 1.75M input tokens (1.67M cached), 10.5K output
tokens, 42 turns, 9 night commands and 319 s. Egress went only to
`api.anthropic.com`, and `claude-opus-5-5` served it. This sample ran no node
scripts, and its largest Bash output was 14,796 characters. The smoke
therefore shows no regression and a clean audit, but it never exceeded the old
30,000 limit. The raised threshold itself is checked only by the unit test and
the CLI source above.

### No further node variant

The owner declined a variant that would also allow `cd /work; …` compounds or
`node -e`. H-claude+node stays as pre-declared, and no new variant was added.

### Direct `claude` backend rate limits pause the run

The SDK `claude` backend (`--backend claude`) retries a
429 four times inside the Anthropic SDK. A `RateLimitError` that is still
thrown after those retries now becomes `UsageLimitError` with `cli:
"claude-api"`, on both the JSON path and the tool-session path. It no longer
becomes `llm-error`. The reset time comes from `retry-after` (seconds or an
HTTP date), or else the latest `anthropic-ratelimit-*-reset` header. From
there it follows the CLI path: no outer retry, a `paused` manifest, and a
`--resume` that reruns only the unfinished samples. Other API errors keep
their meaning, including 529 overloaded. A test injects the SDK's own
`RateLimitError` into the backend client. It checks that the request is made
once and that exactly one attempt error is recorded with no response record.
It also checks the tool-session path and that a 500 error is not treated as a
usage limit.

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

- **Spool symlink fix (2026-11-10).** Until this fix, the host-side spool server followed symlinks the agent could plant in the agent-writable spool: a planted `<id>.res.tmp` link made the host write its JSON reply to any host-writable file, and a linked `<id>.req.json` made it read one. The host now opens requests with `O_NOFOLLOW` (regular files only) and creates replies with `O_EXCL | O_NOFOLLOW` (`agent/test/harness-spool.test.ts`). Earlier H runs predate the fix, and their spools were not checked for planted links.

- Replay re-verifies the recorded commands and the outcome, not the model's transcript (see above).
- Claude Code's `dontAsk` allowlist denies interpreters; Codex's sandbox allows them. The two harnesses therefore get different shell freedom. The opt-in H-claude+node variant narrows the gap: it allows `node /work/<script>` only, not `-e` one-liners or compound `cd …;` commands.
- Claude Code writes Bash output longer than `bashOutputMaxChars` to a file under its private home and sometimes tries to read it back. The rules deny that, and the strict audit flags it. The threshold is now the CLI's ceiling, 128,000 characters; larger outputs (for example `night render w3Orders`, about 741,000) still spill.
- The Codex credential copy includes its refresh token, as the existing Codex backend's does. A refresh inside the sandbox could rotate it.
- The workspace inputs are 0444, but the agent may delete or replace them inside `/work`. Every check, estimate and submission is evaluated by the host against its own copy, so this can only mislead the agent itself.
- Codex exec has no turn limit; wall time and the command quota bound it.
