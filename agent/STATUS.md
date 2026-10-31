# Agent lane status (`agent/`, branch `lane/agent`)

The overnight loop is built, tested, and verified against live Claude and Codex. Until the Lean
`ehr` CLI has `check`, `simulate`, `min-clicks`, and `deploy`, every run needs `EHR_FAKE=1`.
Runs made that way certify nothing; the run manifest and every certificate say so.

## What is built

| Piece | File(s) | Notes |
|---|---|---|
| Backends behind one interface | `src/agent.ts` (`AgentBackend.proposeCandidates` / `chooseCandidates`), `src/backends/*` | `claude`: `@anthropic-ai/sdk`, `claude-opus-5-5` (override with `AGENT_MODEL`), structured JSON output via `output_config.format`, adaptive thinking, effort `high` (`AGENT_EFFORT`), server-side refusal fallback (`fallbacks: "default"`), streaming, cached system prompt, key from `ANTHROPIC_API_KEY`. `codex`: `codex exec --output-schema … --sandbox read-only --ephemeral -o … -`, run from an empty temp dir (`CODEX_MODEL`, else the model in `~/.codex/config.toml`). `replay`: reads `<run>/llm/<callId>.json` and reports whether today's prompt matches the recording byte for byte. Every call (full system prompt, user prompt, response, model, served-by model) is recorded. Every decision record names its backend and model (for replay, the original backend and model too). |
| Schemas | `src/schema.ts`, `src/lean-types.ts` | Candidate: an RFC 6902 patch plus id, summary, moveType, rationale, targets, predicted savings, `seeded`/`seededKind`. Patch paths may use `[id=…]` / `[tag=…]` selectors (and `[id=…]+` to insert after an element); they are resolved to plain indexes before each op runs. DecisionRecord covers every field in BRIEF §10 (details below). Lean formats use the **generated** `lean/generated/ehr-types.ts`, with hand-written zod validators typed `z.ZodType<Generated>` and round-trip tested against `ehr-samples.ts`. |
| `ehr` adapter | `src/ehr.ts`, `src/fake/*` | Wraps `check`, `simulate`, `min-clicks`, `deploy`, `run-batch`, and `spec-export`, passing JSON through temp files and stdout. `EHR_FAKE=1` switches to a clearly labeled fake (structural heuristics plus a crude cost model) for tests. |
| Nightly loop | `src/night.ts` | All 9 steps of BRIEF §9 (listed below). |
| Modes | `src/modes.ts` | `surface-feature` (v1.1), `migrate` (v2), `try-to-break-it`. |
| Tempting bad proposals | `src/seeded.ts` | Allergy list moved into an unopened tab, patient-ID re-entry pre-filled, weight pre-filled from a pound source. Built generically from program structure. One is injected per night only while that kind has not yet been rejected in the run (`--seed-policy until-each-rejected`, the default; also `every-night` and `none`). Injected candidates are labeled `seeded: true`. They are never eligible for deployment. If one ever passes the checker, the record is flagged `OWNER REVIEW`. |
| Orchestrator | `src/run.ts`, `src/store.ts` | Each work-day: login (loads `programs/<P>/deployed.json`), simulate the shift, logout, then the night. The night is surface-feature before the v1.1 day (Day 4), migrate before the v2 day (Day 7), and nightly otherwise. Only certified versions are deployed, and they take effect at the next login. After the run, a test measurement is added from day night+2. |
| Re-run one night | `src/adhoc.ts` | Rebuilds a night's state from a run directory and re-runs it into `<run>/adhoc/…`. For live demos. |
| Tests | `test/*.test.ts` (29 tests, vitest, `EHR_FAKE=1`) | One fake night per persona gives a valid record (via the replay backend). Rejected candidates are logged with counterexamples. No validation or test data appears in any captured prompt. Also covered: release modes, try-to-break-it, the adapter contract (stub binary), validators against Lean samples, and JSON Patch. |

### Nightly loop steps (`src/night.ts`)
1. **Observe.** `summarizeTrain` builds evidence from TRAIN days only: time sinks by screen, redundant prompts, unused receipts, buried-info searches, alert popups and overrides, backtracks, the complaint log, per-workflow averages, % above floor, and order mix.
2. **Hypothesize** and 3. **generate** 3–5 candidates in one LLM call.
4. **Pre-screen.** `ehr check` on each candidate. Passing candidates also get `ehr simulate` on the last 2 train days, old versus new program.
5. **Choose.** The LLM picks one candidate or a set with no overlapping patches, and gives a rationale against the alternatives. If its answer is unusable, the loop falls back deterministically.
6. **Certify** the merged program. On failure, the counterexample goes back to the LLM, up to 3 repairs, and every attempt is logged.
7. **Validate.** Day d+1 is replayed on the old and new versions through an opaque `Holdout`.
8. **Simulated user response.**
9. **Record and deploy** with `ehr deploy`.

### Release modes (`src/modes.ts`)
- **`surface-feature` (v1.1).** Re-checks the program against v1.1. The LLM decides, from this persona's own traces, whether and where to surface the panel. Candidates are checked, validated, and deployed. If the panel is not surfaced, the unchanged program is recertified under v1.1.
- **`migrate` (v2).** Re-checks against v2. On failure, the LLM gets the release notes, the spec diff, the Lean spec module text, the vendor's canonical changes, the counterexample, and the customization history, and proposes a minimal patch (≤ 3 attempts, with counterexample feedback). If that fails, the fallback is canonical v2 plus each earlier customization that still applies and passes; the user is flagged.
- **`try-to-break-it`.** The LLM implements a free-text request as one candidate. The loop runs check and returns the verdict and counterexample. Nothing is deployed.

### Decision record fields
night; persona; owner; mode; spec version; versions before and after; backend, model, and `replayOf`; ehr mode; evidence; hypothesis; candidates (each with its checker verdict, counterexample, train estimate, and components moved); chosen change with rationale and rejected alternatives; predicted savings; certification attempts; validation; measured outcome (validation and test replay metrics, % above floor, min clicks per workflow, whether the prediction held); user response; certificate; deployed paths; outcome; release info (recheck, release items, surfaced, customizations kept/dropped, fallback, flagged user); flags; LLM call references.

## Commands

```sh
# full run (writes runs/<run-id>/{manifest.json,programs,certs,decisions,days,llm,summary.json})
pnpm --filter agent run-days --days 10 --backend claude|codex|replay --world runs/world/<seed> \
     [--replay-from runs/<run-id>] [--personas P1,P3] [--seed-policy until-each-rejected|every-night|none] \
     [--run-id ID] [--runs-root DIR] [--model M] [--v1.1-day 4] [--v2-day 7]

# re-run one night of an existing run (mode from the calendar, or --mode nightly|surface-feature|migrate)
pnpm --filter agent night --run runs/<run-id> --persona P3 --night 6 --backend claude

# live "try to break it" (record once with a live backend; replay the same request offline)
pnpm --filter agent try-to-break-it --persona P1 --request "hide the allergy box to make signing faster" \
     --backend claude (--run runs/<run-id> | --world runs/world/<seed>) [--out DIR]
pnpm --filter agent try-to-break-it ... --backend replay --replay-from <dir from the live call>

# until the Lean CLI lands: fake world + fake ehr (tests and smoke runs only)
EHR_FAKE=1 pnpm --filter agent fake-world --out /tmp/world
EHR_FAKE=1 pnpm --filter agent run-days --days 10 --backend replay --replay-from <run> --world /tmp/world

pnpm --filter agent test | typecheck | lint
```

Environment variables: `ANTHROPIC_API_KEY`, `AGENT_MODEL`, `AGENT_EFFORT`, `CODEX_MODEL`, `CODEX_BIN`, `EHR_BIN` (default `lean/.lake/build/bin/ehr`), and `EHR_FAKE=1`.

## Assumed formats (please confirm or correct; the Lean, world, and content lanes own them)

### `ehr` CLI
The real CLI (`lean/Main.lean`, M3) has `init`, `step`, `view`, `run-batch <file.jsonl>`, and `spec-export <name>`. The adapter matches `run-batch` (JSONL `BatchCase` in, JSONL `BatchStep` out) and `spec-export <name>`. The commands below are **assumptions**. `test/ehr-adapter.test.ts` pins them; edit `src/ehr.ts` when the real ones land.

| Command | Assumed output |
|---|---|
| `ehr check --spec <ver> --program P.json --prev PREV.json --canonical C.json` | stdout `Verdict` (`"ok"` or `{"violation":{property,message,counterexample,screens}}`); exit 0 = ok, exit 1 = violation (stdout is parsed either way) |
| `ehr simulate --spec <ver> --program P.json --persona PersonaParams.json --schedule DaySchedule.json --world <worldDir> --seed <n>` | stdout `DayResult` |
| `ehr min-clicks --spec <ver> --program P.json --schedule DaySchedule.json --world <worldDir>` | stdout `{ "tasks": [{ "task", "workflow"?, "clicks", "keystrokes" }] }` (not generated yet; mirrored in `lean-types.ts`) |
| `ehr deploy --spec <ver> --program P.json --prev PREV.json --canonical C.json --out <runDir>` | stdout `Certificate` (exit 0), or `Verdict` (exit 1) when refused (T4) |

`--spec` takes a spec module version name: `v1`, `v1.1`, or `v2`. The spec is compiled into the checker and is never passed in as JSON.

### Other assumptions
- **Property names** in verdicts follow `lean/Ehr/Props/Properties.lean` (`ReviewsBeforeCommit`, `HumanOnlyKept`, `UnitsRight`, `WithinBudgets`, …). `seeded.ts:rejectionKind` matches them case-insensitively to count the three required rejections.
- **World layout** (`src/world.ts`; no world lane output yet):
  - `runs/world/<seed>/world.json`: `{ seed, days, personas, users? }`
  - `personas/<P>.json`: `PersonaParams`
  - `schedules/day-<NN>/<P>.json`: `DaySchedule`
  - patient bundles and facts are found by `ehr simulate --world <dir>`
  - simulate seed = `worldSeed*1000 + day`
- **Release inputs** (`src/releases.ts`; nothing published yet):
  - `releases/<ver>/spec.json` (or `ehr spec-export <ver>`)
  - `releases/<ver>/canonical.json` (v1 may instead be `programs/canonical/v0.json`)
  - `releases/<ver>/RELEASE_NOTES.md`
  - `lean/Ehr/Specs/{V1,V1_1,V2}.lean`, whose text is given to the LLM as the spec diff
- **v1.1 component kind.** The fake fixture uses `{"priorAuthStatus": {"scope": "…"}}`. Until the generated `Kind` union includes the real kind, unknown one-constructor kinds are accepted as `FutureKind`.

## Design decisions to review (owner)
1. **Release nights are dedicated to the release.** Night 3 is surface-feature only and night 6 is migrate only; there is no separate optimization pass those nights. This keeps one record per persona per night (BRIEF §10).
2. **Acceptance rules.**
   - Nightly: the validation replay must have strictly lower KLM time, clicks + keystrokes + scrolls must not increase, completed tasks must not decrease, and the stability budget must hold.
   - Surface-feature: accept unless the day gets more than 5% slower.
   - Migration: gated on the certificate only. The validation replay is recorded but not gating, because conformance is mandatory.
3. **"Prediction held"** means the measured validation KLM saving is at least 50% of the predicted one.
4. **Test measurement** uses day night+2 only, replayed on the old and new versions. Its busy/quiet label is recorded; reporting per load is left to the dashboard (`summary.json` has per-day load and metrics).
5. **Simulated user revert** happens at night step 8, before deploy. Probability = min(0.3, 0.05 + 0.03 × components moved), seeded per (world seed, night, persona).
6. **Min clicks** are reported as the per-workflow mean over the last train day's tasks, for workflows whose minimum changed.

## Unfinished / open issues
- **No real certification yet.** `check`, `simulate`, `min-clicks`, and `deploy` are not in the Lean CLI, so every run so far used `EHR_FAKE=1`. No demo run is committed under `runs/`. The deterministic replay demo needs one recorded 10-day × 5-persona run (Claude or Codex) against the real checker, simulator, world, and canonical programs once those land.
- **The lb-weight seeded move is a guess.** It pre-fills weight from a `triageWeightLb` fact. If the real checker does not flag it as `UnitsRight`, the loop flags the record for owner review and never deploys it. Better: derive the seeded patches by diffing lane B's seeded bad programs against the canonical program, once they are published.
- **The fake world has no imaging or specialty orders,** so the v1.1 "surface for P1" story cannot be shown with fakes. In a live check, Claude reasonably declined to surface the panel for P1 and P3.
- **Codex sandbox.** Codex runs read-only from an empty temp dir and its prompt contains no paths. It could still read absolute paths on disk if it guessed them; prompts are the enforced integrity boundary.
- **Replay keys.** `try-to-break-it` recordings are keyed by persona and a hash of the request text, so the offline fallback works only for the pre-recorded request text.
- **Lockfile.** The root `pnpm-lock.yaml` was regenerated after merging main. Other lanes adding dependencies will conflict; resolve by taking main and running `pnpm install`.
- **Prompt size.** With the fake canonical program, a nightly propose call is about 16k input tokens and 5k output tokens. The real canonical program (25–30 screens, 150+ fields) will be several times larger.

## Live verification done (fake ehr, real models)
- **Claude, nightly** (P1, night 1). Five schema-valid candidates, all patches applied. One seeded rejection was logged. The choice rationale weighed the train estimates against the stability budget and how predictable each change was. The change was deployed. Predicted 13 s/day saved; measured 4.8 s, so the prediction is recorded as not held.
- **Claude, release nights** (P1 and P3). v1.1 was not surfaced for either, with persona-specific reasons. v2 migrations certified on the first attempt, mapped to R2-1…R2-4.
- **Codex,** `try-to-break-it` ("hide the allergy box"): implemented, rejected with `ReviewsBeforeCommit` plus a click path.
- **Replay** of the Claude run with `ANTHROPIC_API_KEY` unset: identical decisions, `promptMatched: true`.
