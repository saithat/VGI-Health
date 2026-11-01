# Overnight run lane

`lane/run` merged main at `3b5aa9b`, then world 2 and the encounter-role
certification update at `f705828`. Historical `runs/run1-P3` is unchanged;
it was certified under the full profile in force at that time.

The current run profile is **core**. Catalog additions are off except the
explicit `denyRefill` exception; all hand-written rules and safety/design
properties remain enforced. Main now certifies all 15 persona/release
baselines. Its current policy allows only physicians/surgeons to sign pre-op
orders. An attending co-signature must never be treated as automatable.

## Implemented and checked

- Real native `ehr check`, `simulate`, `min-clicks`, `render-screens`, `deploy`;
  fake mode is restricted to unit tests. Native deploy outputs are retained
  under `native/<persona>/v<N>/`; the app publishes through one per-persona
  `deployed.json` pointer.
- Codex explicitly requests **high** reasoning. Full prompts/responses, raw
  Codex JSONL, request journals and failed calls live under `llm/`. Resume
  reuses exact completed calls and refuses changed prompts.
- `pnpm --filter agent manual` generates `docs/agent/CAPABILITIES.md` from
  formal property docstrings, design rules, generated program vocabulary and
  real accepted/rejected historical examples. Every design/repair/choice
  prompt gets that manual and persona-specific active entry/review/alert/
  encounter-role rules with policy labels/citations. Decisions record both
  hashes. Context reads no holdout data.
- Every native operation is journaled in compressed `ehr/*.json.gz`, indexed
  with content hashes in `ehr/index.jsonl`. This preserves candidate, train,
  validation and test simulations, refusals and command failures.
- All five canonicals are checked before browser/model work; failures are
  written to `preflight/`, surfaced in the dashboard and block startup.
- Compatible candidates are merged and checked as one program. The entire
  final version passes production semantic UiScreen ARIA fidelity plus
  visibility/legibility/no-cover checks before real deployment. One browser
  worker covers desktop and narrow widths. Identical tree hashes retain
  coverage for every exported state; full gate output is saved under
  `reports/screens/<owner>/v<N>/`.
- Build sidecars bind actual WASM bytes, the emitted app/painter build, the
  component bundle, the program and its native certificate. New bound runs
  refuse mismatched builds in live EHR, replay EHR and trajectory playback.
  Historical unbound recordings retain their original provenance.
- Program, certificate and binding are written before one atomic pointer
  replacement. A failed artifact write keeps the prior login version.
- The shared release calendar comes from `world/releases.json`; new CLI runs
  default to world 2. Test measurements use the independent night+2 schedule
  whenever available in the world, even outside a short smoke's work days.
- Unknown/duplicate requested personas and accidental run overwrites fail.
  LLM errors leave journals/decision flags and make the CLI report failure.

After the world-2 merge: **Lean default build 315 jobs**, **40 agent tests**,
**154 app tests**, agent typecheck/lint and app build/lint passed. Build-binding
mismatch and atomic-publication failure/tampering have regression tests.

## Smoke and full run

The initial world-1 all-five preflight and interrupted four-persona diagnostic
are archived under `runs/smoke-core-world1-blocked/`; they provide no deployed
smoke evidence. The latter was stopped when main's fixes/world 2 arrived.
The replacement `smoke-core` uses world 2, all five personas, three work days
(**two nights**), real EHR and Codex/high. Its final report is recorded with
the run. No 10-day run has been started.

Prepared full-run entrypoint (not invoked):

```sh
scripts/run-overnight.sh core-10day
# after interruption, with the same build/inputs:
scripts/run-overnight.sh core-10day --resume
```

The entrypoint requires world 2, performs builds/checks, runs all personas,
then trajectories and complexity. Every Lean/lake process inherits an 8 GB
virtual-memory ceiling and six workers; builds precede browser gates.

## Remaining Step 2 component work

- `componentDefs` survives validation, patches and prompts. Main declares
  `ComponentDef`/`Program.componentDefs`, but **Kind.use/Program.expand and
  certified structural expansion are absent**. The protected-core request is
  in `docs/design/changes-requests.md`. The agent must not invent an unchecked
  semantic kind. Composite deployment remains unavailable until it lands.
- Per-version sandboxed TSX proposals/manifests, static import/global/event
  allowlist enforcement, component harness and atomic non-empty component
  bundle deployment are unfinished. The manual explicitly reports that
  limitation. No presentation component can enter a deployed version; the
  empty component bundle is hashed explicitly. This is outstanding owner
  scope, not completed component support.

Whole-version browser receipts now memoize **exact** rendered-tree inputs under
one fingerprint of the emitted app build, Chromium executable, Playwright/Node,
font minimum, viewport configuration and assertion/helper source bytes. Every
version still exports and accounts for every state. Only completely passing
batches at both widths mint receipts; known-bad detector controls run on every
invocation, including fully reused batches. Coverage and receipts live under
`runs/screen-check-cache/` and are referenced by per-version gate output. Any
relevant input/build/assertion change invalidates reuse. This avoids repeatedly
painting identical states across forks and unchanged screens without changing
any safety or fidelity obligation. Cache invalidation/failure/viewport coverage
has a regression test (app suite now 155 tests).
