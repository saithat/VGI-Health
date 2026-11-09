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

## Pilot, 2026-11-09

(pending)
