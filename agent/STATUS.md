# Agent code handoff

Owner/orchestrator stopped live runs. `runs/smoke-core` and
`runs/smoke-core-world1-blocked` were deleted as requested. No live LLM nights
or `run-days` commands have been run since that instruction. Historical
`runs/run1-P3` records, programs, certificates and transcripts are unchanged.

## Implemented

- Generated capabilities manual and active persona rule context, each hashed
  in decision records. Core lists only enforced base rules and the explicit
  denyRefill exception; catalog additions are labeled off. Formal docstrings,
  active spec labels/citations/conditions, design rules and examples are included.
- Composite source templates: `componentDefs` + `kind.use {name,args}`; finite,
  non-nested expansion with parameter substitution, isolated ids and closed
  parent references. The **entire expanded executable** goes through real
  `ehr check`, simulate, render and deploy. Native Lean Kind.use/Program.expand
  has not landed: this adapter is an explicit source compiler, not a new native
  semantic kind or a claim of a Lean compiler proof. Native checking covers
  exactly the executable delivered to the app and reporting tools.
- Editable `v<N>.source.json` is separate from certified `v<N>.json`; this keeps
  native trajectories/complexity compatible. Source and executable hashes bind
  the compilation result. Source edits cannot change owner, role or release
  metadata; the loop controls those fields.
- Sandboxed versioned presentation TSX under
  `app/src/ehr/ui/custom/<owner>/v<N>/<Name>.tsx`, with per-version manifests.
  A deliberately declarative subset lowers to a typed layout bundle: named
  Box/Stack/Group/Paper/Flex imports, literal layout props, exactly one unchanged
  UiNode subtree and its mapped callback. Arbitrary JS, hooks, globals, network,
  storage, timers, unsafe HTML, extra event handlers, spread props and import
  escapes are rejected. This supports layout/density changes, not arbitrary
  React logic. ESLint, compiler type/grammar validation, a typed TSX example,
  malicious-source tests and the real renderer harness enforce the boundary.
- The actual component bundle is painted in whole-version ARIA/visibility/
  legibility/no-cover checks before deploy. Its source + compiled layout hash,
  actual WASM bytes and emitted painter/app build bind the version sidecar.
  Live EHR, replay and trajectories load the certified component manifest.
- Program, source, certificate and components stage before one atomic per-user
  pointer update. Published versions are immutable. Failed bundle writes keep
  the previous pointer. Login rejects tampered source/program/bundle data.
- Real EHR command journals (including all simulated traces), successful and
  failed LLM request journals/transcripts, exact screen coverage receipts and
  resume are retained. Browser checks use one production-preview browser and
  both widths. Exact-tree receipts bind app, browser, assertions and font limit;
  known-bad controls run on every invocation.

## Release configuration and Codex options

`world/releases.json` is the one configuration for `ids` (base/feature/migration),
`leanModules`, `legacyIds` and the existing calendar. Agent runtime, fake fixtures,
release tests and prompts read it. **No release rename was performed.** Historical
ids are kept separately; the orchestrator's coming alias-map change still belongs
with the repo-wide rename. Resume refuses changed release identities.

CLI options `--service-tier fast --reasoning-effort high` produce exactly
`-c service_tier="fast" -c model_reasoning_effort="high"` in the Codex CLI.
`CODEX_SERVICE_TIER` / `CODEX_REASONING_EFFORT` are environment alternatives.
A stub-CLI test verifies this with zero API calls.

## Verification

Latest unit suites: 46 agent tests, 165 app tests; agent typecheck/lint and app
build/typecheck/lint pass. The native composite test certifies the expansion and
rejects a hidden required review. Replay/fake nightly tests cover all personas,
release modes, rejection, atomic failure, resume and train/holdout separation.

Zero-cost single-night integration command (output outside runs/, never commit it):

```sh
pnpm --filter app build
pnpm --filter agent dry-run --out /tmp/vgi-agent-FAKE-dry-run
```

The dry runner uses the unchanged Lean Tiny spec with a repaired, certifiable
teaching UI and one synthetic task. Its manifest says **FAKE**, uses a scripted
backend, costs zero LLM calls, and uses the real native EHR and production screen
checks. Its candidate combines a composite, a sandboxed presentation and a hotkey.
Dry-run result: pending final integration check.

## Future real commands — orchestrator only, after pending main merges

Prepare with no browser/dev server running:

```sh
(cd lean && (ulimit -v 8000000; LEAN_NUM_THREADS=6 LEAN_STACK_SIZE_KB=65536 lake build))
pnpm --filter agent manual
pnpm --filter agent typecheck && pnpm --filter agent test && pnpm --filter agent lint
pnpm --filter app build && pnpm --filter app test && pnpm --filter app lint
```

Single real smoke: all five personas, world 2, three work days = two nights:

```sh
EHR_SCREEN_WORKERS=1 LEAN_NUM_THREADS=6 pnpm --filter agent run-days \
  --days 3 --backend codex --service-tier fast --reasoning-effort high \
  --world runs/world/2 --personas P1,P2,P3,P4,P5 --run-id smoke-core \
  --fhir fixtures/synthea/Ashly_Rippin_149fcc1f.json
(ulimit -v 8000000; LEAN_NUM_THREADS=6 LEAN_STACK_SIZE_KB=65536 pnpm trajectories --run smoke-core)
(ulimit -v 8000000; LEAN_NUM_THREADS=6 LEAN_STACK_SIZE_KB=65536 pnpm complexity --run smoke-core)
pnpm --filter agent report --run runs/smoke-core
pnpm --filter app build
```

Full five-persona × ten-work-day run, with builds/checks/reports and Codex fast/high:

```sh
scripts/run-overnight.sh core-10day
# interrupted run, unchanged inputs/build:
scripts/run-overnight.sh core-10day --resume
```

Equivalent run invocation after preparation:

```sh
EHR_SCREEN_WORKERS=1 LEAN_NUM_THREADS=6 pnpm --filter agent run-days \
  --days 10 --backend codex --service-tier fast --reasoning-effort high \
  --world runs/world/2 --personas P1,P2,P3,P4,P5 --run-id core-10day \
  --fhir fixtures/synthea/Ashly_Rippin_149fcc1f.json
```

## Before the real run

Merge the forthcoming unit-aware doses, attending co-signature, release rename/
alias map and UI redesign; regenerate the manual/builds and rerun these checks.
Attending co-signatures remain human-only. No real smoke or full run is authorized
in this lane now. Native Lean composite syntax can later replace the explicit
source compiler; deploy must continue certifying the exact expanded executable.
