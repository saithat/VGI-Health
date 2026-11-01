## Physical interaction metrics — owner decision, 2026-11-01

Headlines, selection, reports and dashboard switches use clicks, scroll count,
scroll distance (px), and mouse travel (px). Keystrokes are secondary. Timing
estimates remain in raw native/decision logs only, marked **not used** by the
manifest interaction model; no time estimate enters the design prompt or report.
Archived run data is unchanged; absent pixel geometry displays unavailable.

The real screen gate captures Chromium component bounding-box centers and scroll
offsets at 1440×900 for each rendered screen/state, keyed by expanded program
SHA256, screen, state and component ID. Assertion-cache receipts include geometry;
app, browser, harness or presentation-bundle changes invalidate reuse. Every
candidate simulated for selection obtains geometry from that same gate. Canonical
and no-agent arms use the same provider. Atlases are saved under run/geometry/.

A pointer starts at viewport center once per complete day trace, persists between
tasks, and moves in straight lines between pointed/clicked/typed-into control
centers, without tremor, overshoot or an assumed human speed. Scroll offsets reset
on screen navigation. Offscreen targets use Chromium's measured centered reveal
position and ancestor offsets; an explicit scroll advances one scroller viewport,
clamped at its measured limit. Scroll count counts changed scroll containers,
including reveal movements; scroll pixels sum their Euclidean offset changes.
These are modeled interactions on real rendered geometry, not observed humans.
The lookup prefers a normal state containing the target, then an expanded or
popup state; exact control IDs precede semantic alert aliases. Representative
adult/pediatric/surgical gate bundles describe layout states, rather than
rerendering every task's changing clinical content. Missing geometry is null,
never inferred from tab order or silently replaced with zero.

Optimization requires complete validation, paired completed tasks, no click or
scroll-count regression, and at most 2% + 1px regression per pixel metric. At least
one headline dimension must strictly improve (pixel improvement must exceed 1px).
Completion and every clinical/presentation safety gate remain unchanged. The
click-search floor is still clicks; geometry on its replayed path is descriptive,
not a separately optimized travel minimum. Floor pixels are unavailable.

Zero-model verification commands (artifacts outside runs/, explicitly FAKE/REPLAY):

```sh
pnpm --filter agent exec tsx src/geometry-verify.ts fake-replay /tmp/vgi-geometry-check
pnpm --filter agent exec tsx src/geometry-verify.ts canonicals /tmp/vgi-canonical-geometry
```

# Agent run handoff — 2026-11-01

No live Codex/Claude nights were run after the orchestrator stopped them. The
untracked partial `smoke-core` and `smoke-core-world1-blocked` directories were
removed. Historical run1-P3 clinical records/programs/certificates/transcripts
were retained; main's historical display aliases remain authoritative.

## Second review follow-up

- Wrapper resume verifies the existing binary/WASM and emitted `appSha256`,
  excludes copied run JSON, and checks agent source plus screen-gate harness
  hashes. It does not build or regenerate the manual. A shell-wrapper regression
  uses REAL native/app/world/fixture fingerprinting and zero model calls. The
  fresh-run wrapper builds the production app before agent tests, which require
  those real build artifacts for this regression.
- Codex always passes explicit `-m` (CLI/env/config model); missing configuration
  fails closed. Served-model JSON metadata is recorded when the CLI supplies it.
  One authorized trivial live probe succeeded via the exact bwrap/read-only /
  fast/high invocation: configured `gpt-6.1-sol`, 11,143 input tokens (the CLI’s built-in context), 15 output tokens, zero reasoning
  output tokens, no tool events. CLI 0.166.0 emitted thread.started, turn.started,
  item.completed(agent_message), turn.completed. It did NOT expose served model;
  `servedBy` remains null, never inferred. Sanitized captured events live in
  `agent/test/fixtures/codex-isolated-probe.json`. todo_list and error metadata
  are accepted by the isolation audit; errors still fail the LLM request.
  An initial pre-inference Node TLS startup failure required read-only host
  crypto-policy files; no model request occurred in that failed launch. No
  simulation LLM runs were made. Official event reference:
  https://learn.chatgpt.com/docs/non-interactive-mode
- Each run now records a deterministic no-agent fork under `no-agent/`: v0,
  no optional surfacing or LLM changes, recheck/recertify at releases, exact
  canonical fallback on any gate failure, abort if fallback fails. It uses the
  same schedules/seeds and actual certified deployment/browser gates. Reports
  show canonical comparisons AND agent-only savings versus this arm, paired on
  tasks completed in both arms. A no-change fake/replay designer has zero
  agent-only saving across days 4 and 7 even when vendor canonical cost drifts.
- Native/build/publication exceptions produce `infrastructure-error`; genuine
  screen infrastructure produces nightly `error`, distinct from an assertion
  `screen-check-failed`. Manifest status preserves infrastructure errors even
  with zero accepted changes; the CLI exits nonzero on recorded infrastructure errors. Error records retain the failing deployment stage.
- Resume removes unpublished staged versions/artifacts after recovering any
  durable decision. Dashboard version enumeration excludes unpublished staging.

Even nights get no new calibration data; they reuse the preceding odd day.
Under the standard calendar a night-2 accepted version is superseded by night-3
release recertification before blind day 4. Its independent test is shown as
UNMEASURED, not zero or a validation-derived saving. Night 9 uses day 10.
P5 blind days have only 9–14 tasks (days 2/4/6/8/10: 14/11/11/12/9); reports list exact day/task/completion counts,
loads and unmeasured/superseded notes. These are descriptive samples, with no
claim of equal sample size, statistical significance or ten independent tests.

## Code ready

- Generated `docs/agent/CAPABILITIES.md` and active persona rule context appear
  in every design/choice/repair/release prompt; decision records bind both hashes.
  Core lists enforced obligations only, with an explicit catalog-off line and
  main's retained denyRefill exception. One canonical EHR serves everyone; v0
  applies role permissions and a preset view. The agent evolves each persona's
  FORK; vendor releases enter every fork and are re-certified.
- Composites compile finite, non-nested `componentDefs`/`kind.use` into existing
  native kinds, namespaced IDs and closed parents. The complete executable is
  checked, simulated, rendered and deployed. Source and executable are separate
  bound artifacts. This is a source compiler, not a new Lean semantic kind/proof.
- Versioned presentation TSX compiles a deliberately declarative subset to a
  typed layout bundle. Only allowed Mantine layout wrappers around exactly one
  unchanged UiNode/callback are accepted. No arbitrary JS, hooks, network,
  storage, DOM, timers, unsafe HTML, spread props or extra handlers. Compiler,
  ESLint, type harness, malicious-source tests and the actual renderer gates
  enforce this boundary; bundle/source hashes bind the accepted version.
- Day simulation requires an ok certificate for the active spec and the exact
  program hash (independent native FNV implementation tested on all 15 role /
  release canonicals). Validation/prescreen simulations recheck their inputs.
- Every nightly deploy path requires full validation completion and
  `after.completed >= before.completed`. Costs/savings use only tasks completed
  in both arms; unfinished-task effort never becomes a saving. A failed release
  deploy, including screen infrastructure errors, falls back to the exact
  certified role canonical. Failure of that fallback aborts the run loudly.
- Screen/ARIA/visibility/legibility/no-cover gates render adult, pediatric and
  surgical bundles at desktop and narrow widths, one browser at a time. Missing
  render/startup/browser infrastructure is `error`; assertion failures are `fail`.
  Exact-tree cache receipts bind the current app/browser/assertions/component
  bundle; known-bad controls still run. Environment bundle paths are absolute.
- Program, source, components, native certificate, frozen spec/prev/canonical,
  and build sidecar stage first; the complete decision is durable BEFORE the
  atomic deploy pointer moves. Resume recovers a durable pending publication.
- Manifest fingerprints bind the native EHR binary, all release specs, world,
  emitted app hash, WASM, agent source, screen-gate scripts/tests/config and referenced patient fixtures. Run JSON copied into dist is excluded. Resume refuses changed fingerprints, identity/calendar,
  backend/model/personas or seed policy. Rebind never rewrites resume provenance.
- Codex uses a bwrap filesystem containing only read-only runtime directories,
  TLS/DNS files, and its private request directory, with a private CODEX_HOME
  containing auth only. No repository, world, release or user-home mount. Shell
  tools/web search are disabled; recorded tool events reject the response. The
  manifest audits recorded transcripts (including failed calls). An OS probe
  and a confined stub CLI test verify isolation and fast/high flags without API
  calls. No unconfined fallback exists. Live backends refuse fake EHR/worlds.
- `llm-error` is explicit, including release recertification after a model error.
  Three consecutive error nights for a persona abort with a manifest reason.
  Unsafe-rejected counts include only clinical checker `fail` verdicts; screen assertion failures have a separate `screenFailures` list. Invalid patches
  and screen infrastructure errors have separate report fields. Seed/LLM unsafe
  categories require the exact property AND exact element/info identifier from a documented checker message slot. Unknown formats remain unclassified; antibiotic-review or other human-only failures cannot suppress an allergy/identity seed.
- Current IDs are v1/v2/v3. `scripts/release-config.mjs` owns current identities and Lean-module mapping
  (re-exported by the agent and used by replay export); `world/releases.json` owns the shared calendar:
  v2 prior authorization on day 4, v3 antibiotic policy on day 7. Archived IDs
  are handled only by the historical alias map. Main's dose/completion fixes
  were merged. Attending co-signatures remain human-only.

## Measurement protocol (explicit change from the old future-day validation)

Ten calendar workdays still run for all five personas. Odd days 1/3/5/7/9 are
CALIBRATION ONLY; headline results use blind even days 2/4/6/8/10. Even schedules,
traces and complaints never enter selection prompts, including ad-hoc reruns.
Training uses the non-validation tasks of past odd days. Every third task of the
most recent past odd day is held out for validation, with an independent seed
namespace; those tasks/complaints do not enter training. Repeated validation can
influence later selections, so validation metrics are never headline results.
This provides five independent measured workdays, not ten independent samples.

Each day's baseline is that release's certified canonical persona program on
that exact schedule and seed. Reports, dashboard workload and trajectories
`--baseline` use it, with paired completion. Dashboard shows the matched canonical
beside actual workload; vendor release cost is separate from agent saving.
Frozen certification specs and daily canonical programs are retained for replay.
World directory identity is preserved: world/2 deliberately retains seed 1 and
must never be substituted with world/1 merely because the seeds match.

Post-run decision tests use the next blind even day on which that accepted
version was actually measured, against that day's canonical. Superseded or
unmeasured versions are explicitly flagged. Night 9 is tested on day 10; there
is no silent request for absent day 11. A short run may have no independent test
for its final accepted version, and reports say so.

## Rebind, without models or program changes

`pnpm --filter agent rebind --run <id>` (`make rebind RUN=<id>`) enumerates all
published versions, not orphan staging files. It uses the recorded spec, prev
and canonical, rechecks with the current real EHR binary, and reruns the current
production screen gates. It verifies original input/certificate/component hashes
and that the current source compiler reproduces the recorded executable.
Native-binary, app, WASM, components, source, executable, certificate and frozen
certification-input hashes are bound.

Old sidecars become immutable `vN.build.0.json`; subsequent bindings are
`vN.build.K.json`, selected by atomic `vN.build.json` pointers. A failed version
gets a rejected pointer, remains refused by the app, emits a loud error and a
nonzero command exit. Other versions are still checked. `rebind/log.jsonl`
records old/new hashes, time and results; native journals and screen receipts
remain. A successful receipt for identical inputs/build is resumable. A dead
process lock is reclaimed; a live lock prevents concurrent writers. No checks
are weakened. Old runs without frozen certification inputs cannot be rebound
by guessing their old contracts.

After editing app/WASM code: stop browsers/servers, build, rebind, then build
again to copy the new run JSON into static hosting. The second copy-only build
keeps the emitted renderer hash stable. Timeline, replay and live fork loading
follow binding pointers and use recorded specs. Rebind does not authorize
resuming an interrupted run with changed input fingerprints.

## Verification (zero LLM cost)

- Agent: 82 tests pass; includes a FAKE and REPLAY eight-day / five-persona run
  crossing releases on days 4 and 7, certification tampering, completion gating
  on all three deploy modes, fallback/abort, transcript isolation, resume hashes,
  durable-decision crash recovery, rebind success/cache/refusal and no edits.
- App: 176 tests pass; includes matched canonical/blind-day workload and binding
  pointer/refusal loading. World: 95 tests pass. Agent/app/world lint and
  typechecks pass. Production app build passes. Default Lean build passes,
  341 jobs, six workers, 8 GB virtual-memory ceiling.
- Trajectory schema and real-WASM archived determinism tests pass (424 task
  coverage; historical run files were not regenerated). Daily-canonical baseline
  regression and complexity/historical-alias tests pass.
- `/tmp/vgi-review-FAKE-native-dry`: uncommitted FAKE one-night fixture, real
  native EHR, scripted backend, zero model calls. Composite + sandboxed
  presentation + hotkey deploy v1; both v0/v1 gates pass over 27 exported states
  each (9 distinct adult/pediatric/surgical trees, two widths). Real tasks finish
  before and after. Rebind against the updated native binary/current app passes
  both versions and retains original sidecars; repeating it returns two cached
  receipts with no additional native/browser work. An initial environment-path
  infrastructure error was refused and logged, then fixed and retried.
- Reproduce the standalone fixture outside runs/: `pnpm --filter agent dry-run`.
  This tiny teaching spec is wiring evidence, not five-persona clinical metrics.
  The all-persona eight-day evidence uses fake EHR/recorded backends and is also
  outside the repo. No dry-run data or cache is committed.

## Exact future commands — orchestrator only

No real smoke/full run has been started. Prepare without a browser/dev server:

```sh
(cd lean && (ulimit -v 8000000; LEAN_NUM_THREADS=6 LEAN_STACK_SIZE_KB=65536 lake build))
pnpm --filter agent manual
pnpm --filter agent typecheck && pnpm --filter agent lint
pnpm --filter app build
pnpm --filter agent test && pnpm --filter app test && pnpm --filter app lint
```

(a) ONE real smoke night: two workdays, all five personas, world/2:

```sh
EHR_FAKE=0 LEAN_NUM_THREADS=6 LEAN_STACK_SIZE_KB=65536 EHR_SCREEN_WORKERS=1 \
pnpm --filter agent run-days --days 2 --backend codex \
  --service-tier fast --reasoning-effort high --world runs/world/2 \
  --personas P1,P2,P3,P4,P5 --run-id smoke-core \
  --fhir fixtures/synthea/Ashly_Rippin_149fcc1f.json
```

(b) Full TEN workdays × five personas, world/2 (nine overnight adaptations):

```sh
EHR_FAKE=0 LEAN_NUM_THREADS=6 LEAN_STACK_SIZE_KB=65536 EHR_SCREEN_WORKERS=1 \
pnpm --filter agent run-days --days 10 --backend codex \
  --service-tier fast --reasoning-effort high --world runs/world/2 \
  --personas P1,P2,P3,P4,P5 --run-id core-10day \
  --fhir fixtures/synthea/Ashly_Rippin_149fcc1f.json
```

These options emit `-c service_tier="fast" -c model_reasoning_effort="high"` to
the confined Codex CLI. Resume only unchanged inputs with the same command plus
`--resume`. The wrapper performs `verify-resume` and never rebuilds on this path,
including its final static-copy stage; copy run data into static hosting separately. Prepared full-run wrapper: `scripts/run-overnight.sh core-10day`
(or `scripts/run-overnight.sh core-10day --resume`).

(c) Rebind after building current app/WASM (no browser/server during builds):

```sh
pnpm --filter app build
LEAN_NUM_THREADS=6 LEAN_STACK_SIZE_KB=65536 pnpm --filter agent rebind --run core-10day
# equivalent: make rebind RUN=core-10day
pnpm --filter app build
```

(d) Post-run indexing (substitute smoke-core or another run ID):

```sh
LEAN_NUM_THREADS=6 LEAN_STACK_SIZE_KB=65536 pnpm trajectories --run core-10day
LEAN_NUM_THREADS=6 LEAN_STACK_SIZE_KB=65536 pnpm complexity --run core-10day
pnpm --filter agent report --run runs/core-10day
pnpm --filter app build
```

Indexers enforce `ulimit -v 8000000;` locally on each Lean/lake helper. Do not
apply that virtual-address cap to the whole Node/Chromium runner: V8/WASM needs
large reserved address space. One lake and one browser at a time; never build
while a browser/server is running.

## Left for the orchestrator

Run the single real smoke, inspect its completion/report, then start the full
run. Later UI changes require the current build plus rebind. No requested code
item is intentionally deferred; clinical-performance claims await those real
runs. The presentation language intentionally remains declarative and composites
remain source-compiled until native syntax/proofs land.
