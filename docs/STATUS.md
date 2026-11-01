# Project status

Consolidated 2026-10-31. Content, Lean core and render are still active lanes:
[HANDOFF-content.md](../HANDOFF-content.md),
[HANDOFF-lean-core.md](../HANDOFF-lean-core.md) and
[HANDOFF-render.md](../HANDOFF-render.md) will be folded in when their lanes finish.

## Rule profile: core (temporary, owner decision 2026-10-31)

Core keeps the hand-written workflows: CURES (including the seven-day procedure
exemption), naloxone, EPCS details, Schedule II zero refills, VIS, the labeled
hospital policies, v1.1 prior auth, v2 antibiotic indication, and all base alerts
(A1–A4). It also keeps **`denyRefill`**, the one catalog commit needed by W7
refill-denial tasks, with its two Federal entry requirements and the existing
base decision/reason inputs. `coreCatalogCommits` and `CorePlacements.placements`
list this exception explicitly. No catalog review or alert binds to that commit.
The other CMS, Title 22, CA statutes, federal and entrenched catalog additions,
including feature strengthening, temporal evidence, value validation, order
expiry and pinned displays, are encoded and compiled but switched off.

| Release/profile | Elements | Commits | Entries | Reviews | Alerts |
|---|---:|---:|---:|---:|---:|
| v1 core | 123 | 11 | 82 | 21 | 15 |
| v1 full | 283 | 95 | 870 | 486 | 77 |
| v1.1 core | 126 | 11 | 82 | 21 | 15 |
| v1.1 full | 286 | 95 | 870 | 486 | 77 |
| v2 core | 127 | 11 | 93 | 22 | 15 |
| v2 full | 287 | 95 | 881 | 487 | 77 |

Restore by setting `ruleProfile := .full` in `lean/Ehr/Specs/Profile.lean`, then
running `cd lean && (ulimit -v 8000000; LEAN_NUM_THREADS=6 LEAN_STACK_SIZE_KB=65536 lake build EhrHeavy)`.
`EhrHeavy` parks all whole-program Seed/Bad kernel proofs and catalog-only
regressions. It is excluded from default targets; known unfinished modules are
listed in [TODO_PROOFS.md](../TODO_PROOFS.md). General checker/interpreter/deploy/
renderer proofs and three Tiny kernel rejection proofs remain in the default.
Full-profile persona/blueprint checks passed; the heavy proof suite is unfinished.

Default rebuild after the amended Specs/Canonical change: **32.95 s**, peak
process RSS **1.62 GiB**. The W7 denial proof covers every `TaskChoices` value
whose refill choice is `deny`, with only `propext` in its axiom audit.
`cd lean && (ulimit -v 8000000; LEAN_NUM_THREADS=6 LEAN_STACK_SIZE_KB=65536 lake exe profile-goals)`
compares the actual `taskCommits` results across core/full for all **1,284**
world-1 tasks: **zero differences**, including **20 denials among 115 W7 tasks**.
This comparison concerns goal commits; catalog entry/review obligations are separate.
The generated evidence is `lean/Ehr/Check/profile-goals-report.json`.
`lake comparator` passes with `COMPARATOR_BWRAP=../scripts/lean-bwrap.py`; the
wrapper retains its sandbox and supplies the six workers and 64 MiB stacks that
Comparator otherwise clears. `lake check` also passes with that wrapper.
Generated TS types were regenerated without a diff. `make wasm` rebuilt the
assets in 3.57 s using the warm cache; `make wasm-check` passes (the runtime asset bytes are unchanged,
and the regenerated manifest records the new Lean sources).

Certification is **12/15 personas and 0/3 shared templates**, including D5 checks.
P4 cannot certify: the universal completion domain includes pre-op, but the base
consent input permits only physicians/surgeons (`np_preop_obstruction`). Shared
templates declare physician role while retaining nurse-only writes. These are
reported in the native verdicts, not bypassed. All **16/16 core bad programs**
fail their expected property with valid navigation replays; 16 catalog seeds are
full-only. Seed 13 now removes all CURES routes; the old W1-only mutation had a
valid receipt escape. Run `python lean/Ehr/Check/certify.py --bad-only` for the
fast differential regression. The full command records all 18 canonicals,
previous-release comparisons, verdicts and the certification report, returning
nonzero while certification remains blocked.

Day-1 simulator smoke (world 1, seed 7), completed / incomplete:

| Release | P1 | P2 | P3 | P4 | P5 |
|---|---:|---:|---:|---:|---:|
| v1 | 39 / 3 | 22 / 0 | 38 / 0 | 22 / 0 | 14 / 4 |
| v1.1 | 42 / 0 | 22 / 0 | 38 / 0 | 22 / 0 | 18 / 0 |
| v2 | 42 / 0 | 22 / 0 | 38 / 0 | 22 / 0 | 18 / 0 |

The remaining simulator problems are recorded in
[changes-requests.md](design/changes-requests.md); `Sim/**` was not edited.
Details and hashes: `lean/Ehr/Check/{certification-report,sim-smoke-report}.json`.

## Simulator: world revision 2 (2026-10-31)

`runs/world/2` uses seed **1**, ten days and the same 174 Synthea fixtures as
world 1. Service orders are omitted before the v1.1 release on day 4. A regression
compares every task and world state with world 1: only those early service choices
change; random draws, task IDs, timings, counts and all states remain identical.
`world/releases.json` supplies release-day defaults to generator and agent.
New generator outputs, agent `run-days` without `--world`, and `make seed` select
world 2. Explicit world arguments still work. `make live` continues generating its
separate `runs/world/live` input. Recorded `run1-P3` and its trajectories continue
to refer to world 1; no world-1 artifact was edited.

Dose fidelity exposed a spec obstruction: `dose` only accepts tenths of mg;
heparin/insulin choices use units, and albuterol 180 mcg needs more precision.
The simulator now preserves incompatible choices instead of substituting an
arbitrary accepted dose. Core/content changes are requested under
`SIM-WORLD2-DOSE-2026-10-31` in [changes-requests.md](design/changes-requests.md).
The full active-release validation table will be recorded here and in
`lean/Ehr/Sim/validation-world2.json`.

## Current state

### Agent loop

`agent/` implements the nine-step overnight loop, release surfacing/migration,
try-to-break-it, replay/recording, seeded bad proposals and offline screen checks
before deploy. Claude and Codex were exercised with the fake EHR; the replay
matched prompts byte for byte without an API key. The 31-test suite is offline.
Real `check`, `simulate`, `min-clicks` and `deploy` commands are still absent
from `lean/Main.lean`; fake runs (`EHR_FAKE=1`) certify nothing and label their
manifests/certificates FAKE. `render-screens` now exists, but its adapter contract
still needs real integration verification. There is no recorded real certified
10-day × 5-persona demo run.

### World generator

Requested world work is complete. `runs/world/1/` contains a deterministic,
agent-loadable ten-day replay: all 174 Synthea patients, 1,284 tasks, 118 files,
5,476,411 bytes. All 25 formulary entries match Lean. Supply/CURES exemptions,
holds/refusals, pain, W6 steps and refill reasons use typed core fields;
remaining clinical metadata uses structured FHIR observations. P1/P5 have
imaging and procedure orders after v1.1. The albuterol 5 mg absolute cap and
Schedule II correspondence are resolved by `0454841`, superseding the earlier
external follow-up. Last lane checks: Lean build (125 jobs), world build/lint
and 92 tests, plus agent typecheck/lint and 31 tests, passed.

### App

The EHR route uses real Lean WASM through `app/src/core/wasmInterp.ts` and the
generic painter: `Interp.render(spec, program, bundle, user, state) → Html → paint`.
The app now selects `loadWasmInterp`; the earlier WASM-spike-only blocker is
resolved (see [WASM integration](design/wasm.md)). The fixed EHR stylesheet,
offline browser screen check and dashboard are implemented. Dashboard views
cover all six decision-transparency views, costs and recorded try-to-break-it.
`runs/mock/` remains explicitly authored MOCK data, not evidence of certification,
simulation, clinical writes or model calls. Live authenticated Medplum remains
unverified in this lane. Prior app validation passed build/lint, 87 Vitest tests,
desktop/mobile dashboard smoke and a production static/offline smoke.

## OPEN items

### Agent loop

1. **Screen-check failure fallbacks.** If migration passes `ehr check` but fails
   screen-check, continue to canonical-plus-customizations fallback. If a
   surfaced feature fails screen-check, recertify the unchanged program.
2. **Optional repair policy (owner).** Decide whether failing screens should
   feed back into the repair loop like checker counterexamples; this was not
   requested or implemented.
3. **Real CLI integration.** Adapt `agent/src/ehr.ts` and its pinned
   `agent/test/ehr-adapter.test.ts` contract to real `check`, `simulate`,
   `min-clicks`, `deploy` and `render-screens` commands. Confirm spec argument
   formats with their owning lanes; the assumed adapter uses module versions.
4. **Generated types/validators.** Replace the remaining `MinClicksResult`,
   v1.1 `FutureKind`/prior-auth and any needed Html mirrors when matching Lean
   exports are available; replace handwritten zod validators if Lean emits
   them. Check the generated kind shape rather than assuming the fake's
   `{priorAuthStatus: {scope: …}}` is authoritative.
5. **Real world/content integration.** World now exports the assumed native
   layout and tests the actual agent loader, and releases/specs/canonicals are
   published. Complete an end-to-end agent run using them; the old notes that
   these outputs do not exist are superseded. Confirm release paths and
   formats in the operational reference below.
6. **Record the demo.** Commit a real 10-day × 5-persona Claude or Codex run
   under `runs/<run-id>/`, against the real checker, simulator, world and
   canonicals. Pre-record try-to-break-it for the exact demo request text:
   replay keys use persona + request hash. The fake world lacks imaging and
   specialty orders, so it cannot demonstrate the P1 v1.1 surfacing story.
7. **Verify seeded bad moves.** Confirm the `triageWeightLb` prefill is rejected
   as `UnitsRight`; preferably derive all three seeded patches by diffing the
   published bad programs against canonical. A passing seeded proposal must
   stay undeployed and flagged `OWNER REVIEW`.
8. **Replay entrypoints (infra coordination).** `make run`/`make install` now
   exist; finish wiring the recorded real run as the keyless demo default.
   Current dashboard selection falls back to labeled mock examples.
9. **Owner design review.** Review release-only nights; acceptance thresholds;
   the 50% predicted-saving threshold; night+2 test measurement; user-revert
   probability/timing; and min-clicks aggregation (exact policies below).
10. **Integrity and scale follow-ups.** Codex's read-only empty-directory
    sandbox can still read guessed absolute paths; train-only prompts are the
    enforced integrity boundary. Reassess prompt size with real canonicals:
    fake propose calls used ~16k input / 5k output tokens; real programs have
    25–30 screens and 150+ fields. Dependency additions across lanes can
    conflict in the shared lockfile; resolve against main and reinstall.

### World generator

No outstanding requested world work or unfinished world proof remains. The
previous unspecified-albuterol-cap request is resolved; retain the contract
and determinism checks below when upstream types or formulary values change.

### App

1. **Generated Html adoption.** Replace the explicitly temporary mirror in
   `app/src/ehr/html.ts` with compatible generated Html/Tag/Attr. The generated
   types now exist; review their shape and painter compatibility. Event/Value
   and session StepOutput already use generated types.
2. **Real replay integration.** WASM init/step/view/render/facts and deployed
   inputs are wired on the EHR route. Finish exercising real recorded-run
   dashboard contexts through the injectable Interp seam; the mock must never
   become an automatic fallback for real runs.
3. **Deploy screen coverage.** The agent invokes the browser gate before
   deploy; verify that the real pipeline exports every candidate screen/state
   and sample-patient tree. Keep failures blocking publication. Browser setup
   and reproducible samples are in `app/README.md`.
4. **Authenticated Medplum.** Exercise with local credentials. Existing tests
   cover pagination and the offline data boundary, not a live authenticated run.
5. **Owner review.** Confirm adoption/removal of the task-authorized temporary
   app-local Html mirror. The app work changed no Lean specs, properties,
   data-format declarations or Comparator statements.

## Agent operational reference

`src/`, `test/` and bare agent filenames in this section are relative to
`agent/`; other project paths are relative to the repository root.

### Implemented pieces

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
| Tests | `test/*.test.ts` (31 tests, vitest, `EHR_FAKE=1`) | One fake night per persona gives a valid record (via the replay backend). Rejected candidates are logged with counterexamples. No validation or test data appears in any captured prompt. Also covered: release modes, try-to-break-it, the adapter contract (stub binary), validators against Lean samples, and JSON Patch. |

#### Nightly loop steps (`src/night.ts`)
1. **Observe.** `summarizeTrain` builds evidence from TRAIN days only: time sinks by screen, redundant prompts, unused receipts, buried-info searches, alert popups and overrides, backtracks, the complaint log, per-workflow averages, % above floor, and order mix.
2. **Hypothesize** and 3. **generate** 3–5 candidates in one LLM call.
4. **Pre-screen.** `ehr check` on each candidate. Passing candidates also get `ehr simulate` on the last 2 train days, old versus new program.
5. **Choose.** The LLM picks one candidate or a set with no overlapping patches, and gives a rationale against the alternatives. If its answer is unusable, the loop falls back deterministically.
6. **Certify** the merged program. On failure, the counterexample goes back to the LLM, up to 3 repairs, and every attempt is logged.
7. **Validate.** Day d+1 is replayed on the old and new versions through an opaque `Holdout`.
8. **Simulated user response.**
9. **Record and deploy** with `ehr deploy`.

#### Release modes (`src/modes.ts`)
- **`surface-feature` (v1.1).** Re-checks the program against v1.1. The LLM decides, from this persona's own traces, whether and where to surface the panel. Candidates are checked, validated, and deployed. If the panel is not surfaced, the unchanged program is recertified under v1.1.
- **`migrate` (v2).** Re-checks against v2. On failure, the LLM gets the release notes, the spec diff, the Lean spec module text, the vendor's canonical changes, the counterexample, and the customization history, and proposes a minimal patch (≤ 3 attempts, with counterexample feedback). If that fails, the fallback is canonical v2 plus each earlier customization that still applies and passes; the user is flagged.
- **`try-to-break-it`.** The LLM implements a free-text request as one candidate. The loop runs check and returns the verdict and counterexample. Nothing is deployed.

#### Decision record fields
night; persona; owner; mode; spec version; versions before and after; backend, model, and `replayOf`; ehr mode; evidence; hypothesis; candidates (each with its checker verdict, counterexample, train estimate, and components moved); chosen change with rationale and rejected alternatives; predicted savings; certification attempts; validation; measured outcome (validation and test replay metrics, % above floor, min clicks per workflow, whether the prediction held); user response; certificate; deployed paths; outcome; release info (recheck, release items, surfaced, customizations kept/dropped, fallback, flagged user); flags; LLM call references.

### Commands

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

# until real certification/simulation commands land: fake world + fake ehr (tests and smoke runs only)
EHR_FAKE=1 pnpm --filter agent fake-world --out /tmp/world
EHR_FAKE=1 pnpm --filter agent run-days --days 10 --backend replay --replay-from <run> --world /tmp/world

pnpm --filter agent test | typecheck | lint
```

Environment variables: `ANTHROPIC_API_KEY`, `AGENT_MODEL`, `AGENT_EFFORT`, `CODEX_MODEL`, `CODEX_BIN`, `EHR_BIN` (default `lean/.lake/build/bin/ehr`), and `EHR_FAKE=1`.

### Adapter contracts (confirm with owning lanes)

#### `ehr` CLI
The real CLI (`lean/Main.lean`) has `init`, `step`, `view`, `run-batch <file.jsonl>`, and `spec-export <name>`. The adapter matches `run-batch` (JSONL `BatchCase` in, JSONL `BatchStep` out) and `spec-export <name>`. The commands below remain **assumptions**. `render-screens` is also implemented; the agent contract expects `--spec <ver> --program P.json --fhir <bundle.json> --out <dir>`, producing `<screenId>.json` or `<screenId>__<state>.json` for offline checking. `test/ehr-adapter.test.ts` pins them; edit `src/ehr.ts` when the real ones land.

| Command | Assumed output |
|---|---|
| `ehr check --spec <ver> --program P.json --prev PREV.json --canonical C.json` | stdout `Verdict` (`"ok"` or `{"violation":{property,message,counterexample,screens}}`); exit 0 = ok, exit 1 = violation (stdout is parsed either way) |
| `ehr simulate --spec <ver> --program P.json --persona PersonaParams.json --schedule DaySchedule.json --world <worldDir> --seed <n>` | stdout `DayResult` |
| `ehr min-clicks --spec <ver> --program P.json --schedule DaySchedule.json --world <worldDir>` | stdout `{ "tasks": [{ "task", "workflow"?, "clicks", "keystrokes" }] }` (not generated yet; mirrored in `lean-types.ts`) |
| `ehr deploy --spec <ver> --program P.json --prev PREV.json --canonical C.json --out <runDir>` | stdout `Certificate` (exit 0), or `Verdict` (exit 1) when refused (T4) |

`--spec` takes a spec module version name: `v1`, `v1.1`, or `v2`. The spec is compiled into the checker and is never passed in as JSON.

#### World and release inputs
- **Property names** in verdicts follow `lean/Ehr/Props/Properties.lean` (`ReviewsBeforeCommit`, `HumanOnlyKept`, `UnitsRight`, `WithinBudgets`, …). `seeded.ts:rejectionKind` matches them case-insensitively to count the three required rejections.
- **World layout** (`src/world.ts`; now exported and loader-tested by world):
  - `runs/world/<seed>/world.json`: `{ seed, days, personas, users? }`
  - `personas/<P>.json`: `PersonaParams`
  - `schedules/day-<NN>/<P>.json`: `DaySchedule`
  - patient bundles and facts are found by `ehr simulate --world <dir>`
  - simulate seed = `worldSeed*1000 + day`
- **Release inputs** (`src/releases.ts`; confirm against published content):
  - `releases/<ver>/spec.json` (or `ehr spec-export <ver>`)
  - `releases/<ver>/canonical.json` (v1 may instead be `programs/canonical/v0.json`)
  - `releases/<ver>/RELEASE_NOTES.md`
  - `lean/Ehr/Specs/{V1,V1_1,V2}.lean`, whose text is given to the LLM as the spec diff
- **v1.1 component kind.** The fake fixture uses `{"priorAuthStatus": {"scope": "…"}}`. Until the generated `Kind` union includes the real kind, unknown one-constructor kinds are accepted as `FutureKind`.

Sample bundles for the screen check come from run-days `--fhir a.json,b.json`
or `EHR_SAMPLE_FHIR`. With no samples, real screen checking fails closed,
including day-1 canonical deployment, and aborts with a clear error. Gate order
is `ehr check`, `ehr render-screens` + `pnpm --filter app screen-check`, then
`ehr deploy`. The decision stores `screenCheck` beside `certificate`; failures
record source `screen-check`, property `ScreenCheck`, failing screens and
outcome `screen-check-failed`.

### Policies pending owner review

1. **Release nights are dedicated to the release.** Night 3 is surface-feature only and night 6 is migrate only; there is no separate optimization pass those nights. This keeps one record per persona per night (BRIEF §10).
2. **Acceptance rules.**
   - Nightly: the validation replay must have strictly lower KLM time, clicks + keystrokes + scrolls must not increase, completed tasks must not decrease, and the stability budget must hold.
   - Surface-feature: accept unless the day gets more than 5% slower.
   - Migration: gated on the certificate only. The validation replay is recorded but not gating, because conformance is mandatory.
3. **"Prediction held"** means the measured validation KLM saving is at least 50% of the predicted one.
4. **Test measurement** uses day night+2 only, replayed on the old and new versions. Its busy/quiet label is recorded; reporting per load is left to the dashboard (`summary.json` has per-day load and metrics).
5. **Simulated user revert** happens at night step 8, before deploy. Probability = min(0.3, 0.05 + 0.03 × components moved), seeded per (world seed, night, persona).
6. **Min clicks** are reported as the per-workflow mean over the last train day's tasks, for workflows whose minimum changed.

### Integration pitfalls

- **Lean `Option` fields are omitted keys** (`parent?`, `hotkey?`, `copyOf?`, `linkedFrom?`, `waivedBy?`, …), never `null` in output. A JSON-Patch `replace` on an absent key fails, as RFC 6902 requires. Use `add`. The system prompt tells the LLM this.
- **Patch selectors** `[id=…]` / `[tag=…]` (and `+` for "after") resolve just before each op. The stored patch keeps selectors, so it stays portable across versions; migration fallback re-applies history patches onto the new canonical program.
- **Integrity.** Prompts are built only in `src/prompts.ts`, from train-only inputs. Day d+1 is reachable only through `Holdout.validate`, which returns aggregates to the loop. Do not pass DayResults of later days, or validation/test metrics, into history or prompts. The test in `test/night.test.ts` injects `LEAKCHECK-day-N` markers and will catch it.
- **Determinism.** Seeds derive from the world seed (simulate: `seed*1000+day`; user revert: hash of world seed, night, persona), not the run id, so replay runs reproduce decisions exactly. Recorded prompts are compared byte for byte (`promptMatched`). Do not put timestamps or run ids in prompts.
- **Claude.** Opus 5.5 cannot disable thinking and rejects forced `tool_choice`. The backend uses `output_config.format` (JSON schema), `thinking: {type:'adaptive'}`, effort `high`, and `fallbacks:'default'` with beta `server-side-fallback-2026-07-01`, via `client.beta.messages.stream(...).finalMessage()`. Patch values travel as `valueJson` strings, because strict schemas cannot express arbitrary JSON.
- **Codex** runs from an empty temp dir with `--sandbox read-only --ephemeral`, so it does not start inside the repo, where later days' traces live.
- **Lockfile.** Merges with other lanes conflict on `pnpm-lock.yaml`. Take main's (`git checkout --theirs pnpm-lock.yaml`), run `pnpm install`, and commit.
- **TS config.** The agent uses `moduleResolution: Bundler` so the generated `lean/generated/ehr-types.ts` (no `"type":"module"` above it) type-checks under `verbatimModuleSyntax`.
- **The fake ehr is a crude stand-in.** Its "checker" is a set of structural heuristics, not the verified checker. Never present `EHR_FAKE=1` runs as certified. The manifest and certificates say FAKE.

### Prior live verification (fake EHR, real models)

- **Claude, nightly** (P1, night 1). Five schema-valid candidates, all patches applied. One seeded rejection was logged. The choice rationale weighed the train estimates against the stability budget and how predictable each change was. The change was deployed. Predicted 13 s/day saved; measured 4.8 s, so the prediction is recorded as not held.
- **Claude, release nights** (P1 and P3). v1.1 was not surfaced for either, with persona-specific reasons. v2 migrations certified on the first attempt, mapped to R2-1…R2-4.
- **Codex,** `try-to-break-it` ("hide the allergy box"): implemented, rejected with `ReviewsBeforeCommit` plus a click path.
- **Replay** of the Claude run with `ANTHROPIC_API_KEY` unset: identical decisions, `promptMatched: true`.

Agent milestones: `3f5ad14` scaffold, `a804953` contracts/integrity tests,
`bcbc197` generated Lean types, `bb2bec0` ad-hoc night and property names,
`d2610e4` screen-check deploy gate. The lane stopped with no half-written work.

## World operational reference

### Run and consumer layout

`runs/world/1/` is generated from `fixtures/synthea/index.json`: 174 patients,
124 adults, 50 pediatric, 17 penicillin-allergic; seed 1, ten workdays starting
2026-11-02. It contains 1,284 tasks in 118 files, 5,476,411 bytes (< 15 MB):

- `world.json`: `{seed, days, personas}` for `agent/src/world.ts`.
- `personas/P1.json` … `P5.json`: PersonaParams matching the agent defaults
  and BRIEF section 6. Behavior parameters do not change clinical choices.
- `schedules/day-01/P1.json` … `day-10/P5.json`: agent-compatible DaySchedule.
- `day-1-P1.json` … `day-10-P5.json`: identical flat schedule aliases.
- `state-day-0.json` … `state-day-10.json`: world-owned carry-over state.
- `manifest.json`: fixtures/source, patient counts, per-day loads and all files.

Fixture paths in the manifest are relative to the repository root. No patient
bundles are copied into the run (the committed source fixtures are reused).
Every committed state and both schedule layouts are checked against fresh
output, and every schedule round-trips through the actual Lean JSON decoder
and encoder. TS enum values come from generated Lean TS. No Lean proof or
mirrored executable safety logic was added by world.

Volumes: P1 clinic days 17–20 W1 visits; ED 12–22 arrivals; P4 12–22 visits,
including flu shots; OR days 2–4 cases. P3 shift census averages 9.1 (7–11,
with one urgent surgical surge above the routine cap of 10). Excess pediatric
rechecks roll forward explicitly; flu-shot visits reserve capacity.

After the day-4 v1.1 release, the replay has 8 P1 imaging + 8 P1 procedure
orders, and 7 P5 imaging + 5 P5 procedure orders. Service codes are internal
demo catalog slugs (not claimed to be CPT codes). P1 covers MRI/therapy and
screening referrals; P5 covers surgical imaging and booked procedures.

### Typed conventions

- Medication `drug` is the lowercase generic formulary name. `doseTenths` is
  in `unit`; hydrocodone–acetaminophen uses the hydrocodone component's dose.
- Imaging/procedures use `kind`, a nonempty `code` and an indication, with
  empty `drug`, zero dose, unit `none`, empty route/frequency, and `prn=false`.
  Services never appear in `administer` or active ward regimens.
- `OrderChoice.supplyDays` and `curesExemptReason` carry outpatient controlled
  Rx facts. Short ED/postoperative supplies (<=7 days) have setting-specific
  exemption slugs. Chronic prescriptions do not receive that exemption.
- `holdReason` applies per order. `patient-refused` distinguishes refusal;
  other slugs describe holds. Held admission orders are emitted in the task,
  excluded from the active regimen; held/refused ward doses stay in the task's
  `administer` decisions with their reason, not as actual given doses.
- `TaskChoices.painScore` carries pre-dose and reassessment scores; the latter
  also has the genuine note-section ID `painReassessment`. `w6Step` is
  consult/preop/postop/rounding/discharge. `refillReason` carries deny/modify
  reasons. Approval renews the contained FHIR prescription (with 30-day supply
  for controlled refills); modification supplies a replacement typed order.
- Clinical metadata with no dedicated core field uses `Observation` resources
  in `todayResources`, coding system `urn:vgi:world:clinical`:
  `naloxoneOffer` (coded accepted/declined), `prnReason` (coded nausea/anxiety),
  `sedationScore` (integer). IDs are task-derived and timestamps use task time.
  No clinical facts remain encoded in colon-delimited note-section strings.
- Defaulted JSON fields are always emitted; absent Option fields are omitted.
  The strict world schemas reject mixed drug/service representations.

### Validation and commands

Run Lean first, then world tests: the contract suite starts exactly one lake
process. Never run it alongside another Lean build.

```sh
cd lean && lake build
# return to repository root
pnpm --filter world build
pnpm --filter world lint
pnpm --filter world test
pnpm --filter world gen --seed 1 --days 10
```

Last checks: Lean build passes (125 jobs, its existing axiom audit reports only
propext/Classical.choice/Quot.sound); world build/lint and all 92 tests pass.
The actual agent world loader is exercised by the CLI integration test.
Agent typecheck/lint and all 31 tests pass with the typed core contract.

Sandbox pnpm note: its default store is outside writable roots. Installed with
`CI=true pnpm install --frozen-lockfile --store-dir /tmp/vgi-world-pnpm-store`;
used `pnpm --config.verify-deps-before-run=false --filter ...` for scripts to
avoid an automatic reinstall into the inaccessible default store. No root
pnpm files were directly modified.

Determinism: each day hashes seed/day/previous state. Use independent RNG
streams, never Math.random or wall-clock dates. Regenerate the committed run
whenever generator output changes. Existing tests also cover admissions to
P3, discharge follow-ups, pending results, surgical flow and pediatric growth.

World milestones: `c207c90` formulary/Synthea alignment, `d2cd527` native
loader layout, `d5303af` clinical/determinism checks, `b6d3bf7` initial replay,
`ab800c2` typed-core migration and clinical observations, `0454841` final
albuterol cap/Schedule II sync. Regenerating seed 1 after the last change left
all 118 files unchanged. Lean's audit reported only `propext`,
`Classical.choice`, `Quot.sound`; release-extension theorems used no axioms.

## App operational reference

`src/` paths in this section are relative to `app/`.

`/dashboard?run=mock` implements all six decision-transparency views, plus cost
curves and a recorded try-to-break-it panel. Evolution nodes link to full Why
records; failed proposals and release rechecks link to event-by-event
counterexamples. Screens in counterexamples, paired task replay, divergence and
migration reports all use `Interp.init/step/render` and the existing painter.
The fixed EHR stylesheet and generic painter are unchanged by this dashboard.
Dashboard styles are scoped away from EHR controls and table contents.

The app imports `DecisionRecord`, `Candidate`, Program, DayResult, certificate
and event validators directly from `agent/src/schema.ts`. A Vite plugin serves
`runs/` and indexes agent directories; production builds copy their JSON plus a
static dashboard directory index. Run and view selections are in the URL.
Read-only static run requests have a dedicated, path-constrained data boundary;
all Medplum access remains in its original data module.

`runs/mock/` is an authored, prominently labeled MOCK run with five workflows,
three seeded bad proposals, both vendor releases, five distinct migrations,
P3's rejected collapsed drawer then repaired MAR, and a recorded break attempt.
Every certificate, decision and saving is illustrative; no checker, simulator,
LLM or clinical write occurred. Regenerate with `pnpm --filter app mock-run`.

The replay seam is injectable through `<Dashboard interpFactory={...} />`.
The explicit mock adapter lives in `src/mock/replay.ts`; a real run never falls
back to it. `replay.json` supplies opaque spec/bundle/user contexts and paired
same-task traces; version/spec-specific contexts are supported. Its cumulative
`klmDeciSec` is distinct from agent trace `t` (shift clock). Input contract and
WASM wiring example are in `app/README.md`. Real WASM can use this seam without changing views, agent schemas, or the painter; verify real-run replay contexts as tracked above.

Cost charts use only `measured.test`, never evidence or validation values.
Clicks, keys, scrolls and KLM, their separate percentages above floor, and
popups/task are directly labeled in persona colors, with busy/quiet day labels
and a complete accessible data table. The break panel is explicitly recorded
replay: audience text is never misrepresented as a fresh checker result.

Validation: required app build/lint/test pass (87 Vitest tests). The dashboard
Playwright smoke passes at desktop and 390px widths, opens every view, steps a
counterexample and paired trace, checks five final UIs and ten migration
screens, and displays the recorded break verdict. Evolution, paired replay and
cost charts have also been rendered for visual review. No agent/, lean/, or
wasm/ files were edited by the dashboard implementation.

Production smoke: served `app/dist/` with a plain Python static server, opened
`/dashboard/` with all external requests blocked, and rendered the release view's
ten EHR screens successfully. The build has no dashboard CSS syntax warnings;
remaining warnings concern dependency annotations and the existing bundle size.

### EHR painter integration

Implemented owner decision (Oct 31): the EHR route is now
`Interp.render(spec, program, bundle, user, state) → Html JSON → paint`.
The 82-line generic painter uses the exact §9 tag/attribute/class vocabulary,
constructor-keyed Lean JSON, generated Event/Value types, and no clinical or
component-kind logic. It drops unsupported vocabulary with development reports.
The session forwards opaque state and bundles; no runtime tree validator,
certification check, guard, or clinical decision is introduced in the real seam.
The zod tree validator runs in the offline release check and tests.

The single `src/ehr.css` defines exactly the 58 §9.1 classes, with a dense banner,
sidebar, navigation, forms, record tables, trend, alert and action styles. A parsed
CSS policy test compares directly with the design document and rejects hiding,
clipping, zero sizes, negative offsets, positioned overlays and other concealment.
Modal styling stays in document flow. The old Mantine EHR renderer, info adapters,
chart shell, stylesheet and renderer tests are removed. Mantine/Medplum components
remain for sign-in and the development persona picker.

The explicitly selected **MOCK** interpreter emits complete W1 page trees with
all panel rows and trend points. Its component interpretation lives only in
`src/mock/page.ts`; its legacy ScreenView/spec/state fixtures remain private to
the mock. It supports navigation, editing, tabs and group expansion. Signing,
receipts, confirmation, clinical alert evaluation and macros still require the
real Lean interpreter; the mock labels itself uncertified and does no writes.

Validation:
- `pnpm --filter app build`, `lint`, and `test` pass.
- Random tree fidelity (250 cases), all tags, every event/value kind, whitelist
  dropping, CSS policy, session forwarding, W1 navigation, and data boundary tests.
- `screen-check` passed 15 W1 trees at 1440px and 390px widths, including history,
  collapsed reconciliation and expanded laboratory orders (30 screens).
- Browser regression tests detect zero bounds, off-page content, transparency,
  subminimum fonts and occlusion. A required hidden-input fixture returns exit 1.
- Main-route Chromium screenshot reviewed locally. Every check uses the same
  painter and stylesheet imports as the main route.

## Workflow complexity lane

`pnpm complexity --run <id>` builds `runs/<id>/complexity.json` and the frozen
canonical union report at `programs/benchmarks/canonical-complexity.json`.
`pnpm complexity` computes canonical only; `--no-canonical` computes just a run.
Build the real native `ehr` first. `EHR_LEAN_DIR` / `EHR_BIN` can select a matching
external build; this lane built in `/tmp` without modifying Lean sources.
The measurement adapter under `scripts/complexity/` imports Lean's existing
certified search, goal derivation, interpreter, operator model and floor.

The benchmark freezes one representative case per W1–W7, including three surgical
steps on one patient. See [benchmark README](../programs/benchmarks/README.md).
The immutable release assets under `programs/benchmarks/releases/` are copied
from the merged run branch, with its full revision recorded in suite.json.
Main's newer release contracts have additional clinical obligations, so using
them would change historical run semantics. Never silently substitute them for
the release that certified the recorded iteration. Benchmark clinical choices
missing from stock TaskChoices (diagnosis, service level, refill count) are
pinned as existing Goals by the adapter; stock `ehr min-clicks` outputs remain
verbatim beside the pinned paths. Directed search is exact only in its reported
space; neither JSON nor chart claims a global optimum. KLM is minimum-click-path
effort, not independently minimum time. Fields/screens/popups are replay-derived.

The `run-days` CLI now computes the run report after completing a real run,
without repeating the canonical calculation. Use `--no-complexity` to skip this
postprocessing explicitly. A failed benchmark propagates an error after the
run's clinical artifacts have been saved; no partial report is published.
Five-persona manifests and both recorded program/certificate layouts are
supported. Authoritative roles, not daily schedule volume, determine projection.

Dashboard: `/dashboard?run=run1-P3&view=Workflow+complexity` has all six metric
switches, directly labeled workflow stacks, floors, vendor/rejection markers,
shared-scale persona panels and exact tables with v0 deltas. It uses existing
persona colors and the read-only dashboard JSON boundary. Files are new except
for the Dashboard import/tab/render registration. Screenshot:
`app/shots/complexity.png` (desktop); Playwright also checks the 390px viewport.

P3 W4 union, for its fixed insulin/assessment case: v0 = 25 clicks, 39 keys,
129.95 KLM seconds; v1–v7 = 23 clicks, 39 keys, 127.55 seconds. The floor is
14 clicks, 20 keys, 92.3 seconds, two screen visits, 13 required fields and one
popup. No daily task-count denominator is used. The current outputs report
`navigationDirected` for the native and pinned minima.

Verification: app build/lint and 132 unit tests; agent typecheck/lint and 36
unit tests; benchmark's three audit tests; desktop and narrow Playwright
complexity smoke. The merge exposed the agent's schema dropping newer release
metadata and not accepting clinical predicates; the adapter now validates those
predicate forms and preserves opaque optional metadata for Lean to validate.

Future release revisions: if a run's v0 canonical shape differs from the frozen
run1 release assets, the command automatically uses current `releases/`.
`--release-root <directory>` overrides this selection for another archived
contract. The output records the chosen directory. Cases with missing clinical
evidence fail closed; they must be updated deliberately for a new contract.

## All task trajectories

After each real `run-days` run, run this one-line postprocessing step from the
repository root (replace the id): `pnpm trajectories --run run1-P3`.
The indexer stays separate from `run-days` because it needs a matching native
Lean build in addition to the simulator binary. Build only with
`cd lean; ulimit -v 8000000; LEAN_NUM_THREADS=4 lake build ehr`.
`EHR_LEAN_DIR` and `EHR_BIN` can select an existing matching build.

`runs/<id>/trajectories/index.json` contains every task, metrics and recorded
ideal-interface floor, completion, patient/fixture identity, program/spec paths,
user and schedule resources. Compact `tasks/<id>.json` files hold each exact
event slice and clinical episode contexts: facts input plus `init`/clock seeds.
The dashboard fetches the index only after opening Trajectories and task files
only on selection. Persona controls, day, and task search choose the replay.
Play/pause/step/scrub drive the real WASM interpreter and semantic UI painter;
gold outlines show the next event's component and counters accumulate trace ops.

Reconstruction calls production `loadFacts`, `taskEpisodes`, goal derivation,
`init` and `step` through `scripts/trajectories/Contexts.lean`, outside `lean/`.
It materializes Synthea fullUrl UUIDs, merges resources cumulatively per patient
within the day, carries receipts between tasks/episodes, and preserves episode
resets. Each event restores the simulator's pre-step clock from its timestamp.
Historical specs are snapshotted from archived `replay.json` contexts, when
available, instead of silently substituting subsequently revised releases.
Every event's pre-step screen and result are compared in native Lean and WASM;
`verification.json` records counts, first divergent events, reconstruction and
artifact hashes. A mismatch makes the command fail and remains visible in the UI.

Generate optional v0 comparisons with `pnpm trajectories --run run1-P3 --baseline
d01-P3-W4-001,d04-P3-W4-001,d07-P3-W4-001` (keep the command on one line).
`--baseline all` selects every task. This calls `ehr simulate` with v0's release
and the original day schedule, persona and RNG seed; the full day is simulated
to preserve prior receipts/resources, then selected task slices are exported
and verified. Regenerating without `--baseline` removes comparisons from the index.

To recheck committed contexts using only Node and WASM, run
`pnpm trajectories --run run1-P3 --verify-only`. This also checks baselines and
updates `verification.json`; its mode explicitly identifies the prior native
verification as saved evidence rather than a newly executed native check.
The native rebuild attempted on resume failed with a thread-creation error
under the required virtual-memory limit; the fresh all-task check uses WASM.

The committed run1-P3 index covers 424 tasks across ten days, 14,658 recorded
events, and three optional v0 trajectories. Schema validation and differential
tests cover three releases, episode resets, baselines and deliberately corrupted
screens/results. Run `pnpm test:trajectories` for these checks and one desktop
Chromium smoke test (`--workers=1`). Screenshot: `app/shots/trajectories.png`.
Never run a build alongside a browser/dev server on the memory-limited machine.
