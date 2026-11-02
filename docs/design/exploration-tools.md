# Exploration implementation and local decision models

Status: early research, 2026-11-02. The implementation is under `explore/`.
No deployment command exists in this harness. Run data, candidates, trajectories,
certification verdicts and screenshots belong under ignored `runs/`.

## Outer-loop evaluation

Inspected the current primary repositories and their license files:

| Tool | Inspected revision | Fit and integration cost |
|---|---|---|
| [OpenEvolve](https://github.com/algorithmicsuperintelligence/openevolve/tree/73448d715968b3578d8458b16295e827edd2b6bf), formerly codelion/openevolve | `73448d715968b3578d8458b16295e827edd2b6bf` | Apache-2.0; maintained MAP-Elites/island search. Its [provider documentation](https://github.com/algorithmicsuperintelligence/openevolve/blob/73448d715968b3578d8458b16295e827edd2b6bf/docs/llm-providers.md) supports Codex app-server, Claude Code CLI and OpenAI-compatible endpoints. Feasible outer loop: wrap our JSON evaluator and supply categorical feature bins; replace its provider with our `JsonLlm` boundary to retain transcript audits and the explicit `default` tier. |
| [ShinkaEvolve](https://github.com/SakanaAI/ShinkaEvolve/tree/8adc053a2ce4511ad2ac310e004c530a73fb974a) | `8adc053a2ce4511ad2ac310e004c530a73fb974a` | Apache-2.0; active program-evolution system. The README supports Headless Codex/Claude mutation, and [local-model documentation](https://github.com/SakanaAI/ShinkaEvolve/blob/8adc053a2ce4511ad2ac310e004c530a73fb974a/docs/support_local_models.md) describes OpenAI-compatible routing. Feasible evaluator wrapper; requires adapting its program/database feature representation and CLI isolation/service-tier configuration. |

Both are viable and growing; neither is rejected as stale or incapable of CLI
generation. This first implementation uses a small **TypeScript MAP-Elites
archive** to reuse the repo's isolated `JsonLlm`, generated program types,
native checker, browser gate and simulator directly. This avoids a Python↔TS
provider bridge, a second candidate database, and assumptions about a numeric
feature grid. Python is confined to local ML serving and plotting. The archive
can later become an evaluator/provider adapter contributed upstream; no upstream
code was vendored or modified. This is a scope/integration choice, not a speed
or quality comparison: neither framework was installed or benchmarked.

`LlmOperator` accepts a complete design point and an optional full program or
unbounded-count JSON patch. It recompiles the point, validates the program, and
retains the independent identity-movement budget. Codex is instantiated with
`serviceTier: 'default'`; Claude reuses the repo's existing API backend. Failed
attempts consume the call budget. A fresh run directory is claimed exclusively,
so rerunning cannot silently reset that ledger. Reports checkpoint after each
evaluation. Fresh search directories are exclusive; explicit `review.ts`
continuations acquire their own lock, share the recorded 60-call ceiling and
retain rejected candidates. Automatic recovery of an interrupted LLM request is
not implemented; its attempt stays in the ledger.

MAP-Elites preserves per-niche elites and samples parents across occupied niches.
`--lookahead 2` lets the surrogate prioritize a batch; every candidate still traverses the hard gates. The default lookahead is one, which records predictions without changing evaluation order.
Completion fraction precedes effort in comparison. The scalar effort objective
is `-(clicks + scrolls + keystrokes/20)/tasks`; raw totals remain available.
The initial metric is the **native deterministic simulator estimate**, without
Chromium pointer geometry enrichment. Screen geometry is checked separately;
the run makes no measured mouse-travel or human time claim.

The evaluation sequence is static constraints → Lean check against the fixed
baseline → existing independent screen gate → fixed department × role schedule.
Even proved layouts receive browser checks here. The checked-renderer hook must
provide separate evidence for a custom renderer; passing the Lean renderer is
insufficient. `explore/renderer.ts` exports `externalRendererGate`: a trusted
operator-selected Node script receives input/output manifest paths and must
return a renderer hash plus independent accessibility and geometry assertions
for every exported state hash × viewport. Missing coverage fails closed.
`--renderer-gate /absolute/gate.mjs --renderer-bundles bundle1.json,bundle2.json`
selects it in the CLI. The script implements the assertions for its renderer;
this is a plug-in contract, not a claim to have checked an unimplemented renderer. Sandbox metrics describe only the backing interpreter program
until a custom interaction simulator exists. Sandbox candidates never deploy.

## Reproduce the search

After the normal frozen pnpm installation and app build:

```sh
export TMPDIR=/home/saithat/Projects/run-tmp
export EHR_BIN=/home/saithat/Projects/VGI-Health/lean/.lake/build/bin/ehr
EHR_SCREEN_WORKERS=4 node --import ./agent/node_modules/tsx/dist/loader.mjs explore/cli.ts \
  --out runs/explore-ed-new --backend codex --budget 4 --iterations 4 --days 1,2
```

`--backend none --budget 0` exercises deterministic design seeds without LLM
mutation. `--backend claude` uses the existing Anthropic credentials and backend.
Each output directory must be new. After its writer has stopped, explicitly add
another niche attempt or recheck saved accepted programs without new LLM calls:

```sh
node --import ./agent/node_modules/tsx/dist/loader.mjs explore/review.ts \
  --run runs/explore-ed-new --add-layout document --backend codex
node --import ./agent/node_modules/tsx/dist/loader.mjs explore/review.ts \
  --run runs/explore-ed-new --recheck
node --import ./agent/node_modules/tsx/dist/loader.mjs explore/screenshots.mjs runs/explore-ed-new
```

Final rechecks record harness/agent source hashes and the git commit. Screen
coverage is scoped to states enumerated by the native exporter plus popup probes,
not every possible continuous data value or viewport. Initial and all-moments
urgency remain distinct obligations as described in the semantic UI design. The CLI currently chooses ED × physician,
W3, v1, P2 and days 1–3; it refuses later days rather than silently evaluating
v1 against a changed release. Programmatic callers can supply other workflow
sets, releases, workloads and trusted renderer gates.

## Decision interface and licenses

`DecisionModel.choice` returns probabilities keyed by visible action identity;
`screen` returns pass/improvement probabilities. The deterministic implementation
is uniform/constant. The local endpoint validates complete normalized
distributions. The vLLM transport uses one-token digit choices with constrained
decoding and requires all option logprobs; missing options fail closed. This
supports at most ten options. The CPU transport returns normalized conditional
option-sequence likelihoods from an actual tiny instruct model. Neither means
probability of clinical truth, nor does either authorize a commit.

The optional TabPFN adapter screens one-hot design features plus declared numeric
program features using a local `/screen` endpoint. Training input must contain
only `split: "train"` rows, each `{features: number[], pass: 0|1,
improvement: 0|1, split: "train"}`; both targets need both classes. Keep feature
width/order identical at training and inference, and partition by department,
role, release and workload. The Jev class is an unconfigured stub that throws
without making requests or searching for a key.

License checks and exact model revisions are recorded in
[`explore/models.json`](../../explore/models.json). The Hugging Face cards for
[Decider 0.8B](https://huggingface.co/Mapika/decider-0.8b) and
[Laya typed-decisions](https://huggingface.co/convaiinnovations/laya-typed-decisions)
declare Apache-2.0. Their specialized readouts need model-specific adapters;
the generic chat scorer does not pretend to load them. Microsoft's documented
[Decision-1](https://learn.microsoft.com/azure/foundry/foundry-models/how-to/use-foundry-models-microsoft-decision)
is a decision scorer, but the proposed Hugging Face model/API returned 401;
its weight license remains unverified, so it was not used.

The CPU fallback [SmolLM2-135M-Instruct](https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct)
is Apache-2.0. The launch preflight checks the selected revision's Hugging Face
license before loading, allows Apache-2.0/MIT only and disables remote model code.

[TabPFN code](https://github.com/PriorLabs/TabPFN#license) is Apache-2.0;
its current default weights are non-commercial. We explicitly request **v2**.
The [v2 classifier weights](https://huggingface.co/Prior-Labs/TabPFN-v2-clf/blob/main/LICENSE.txt)
use Prior Labs License 1.1, an Apache-derived license with enhanced attribution:
downstream redistribution must retain the license/notice and required attribution;
products containing the material must prominently display “Built with PriorLabs-TabPFN”.
Do not describe all TabPFN weights as Apache-2.0 or silently upgrade the model
version. **Built with PriorLabs-TabPFN** (optional screening backend). This research harness attributes the model to Prior Labs; any future
product/weight redistribution needs to carry the applicable terms and notice.

## Local CPU server and host GPU server

The sandbox's `nvidia-smi` could not communicate with the NVIDIA driver. A real
CPU-run tiny model therefore tests the HTTP/backend boundary. ML packages and
caches stay outside the repo:

```sh
export TMPDIR=/home/saithat/Projects/run-tmp
export UV_CACHE_DIR="$TMPDIR/uv-cache"
~/.local/bin/uv venv "$TMPDIR/explore-venv" --python 3.12
~/.local/bin/uv pip install --python "$TMPDIR/explore-venv/bin/python" 'torch==2.15.0+cpu' --index-url https://download.pytorch.org/whl/cpu
~/.local/bin/uv pip install --python "$TMPDIR/explore-venv/bin/python" -r explore/requirements-cpu.lock
make decision-server
```

The server binds loopback on port 8787, uses two CPU threads and one worker.
`DECISION_ARGS='--port 8788 --tabpfn-training /absolute/train.json'` enables
another port and the fitted TabPFN endpoint. The initial archive has too few
negative outcomes to train a credible surrogate; synthetic fit tests validate
plumbing only. No TabPFN model is trained on the calibration rows automatically.

Outside the sandbox, verify the host driver sees the RTX 3090. Install a current
vLLM build compatible with the host driver/runtime **in the same external venv**
(this replaces the CPU torch build; do not install GPU libraries in the repo):

```sh
export TMPDIR=/home/saithat/Projects/run-tmp UV_CACHE_DIR=/home/saithat/Projects/run-tmp/uv-cache
~/.local/bin/uv pip install --python "$TMPDIR/explore-venv/bin/python" --upgrade vllm
DECISION_ENGINE=vllm make decision-server
```

This starts the tiny permissively licensed instruct model with a 2048-token
context, four sequences and 65% GPU-memory cap. Replace `DECISION_MODEL` and
`DECISION_REVISION` together only after license/architecture review for a larger
open instruct checkpoint. CUDA 13.1 on the machine does not itself establish
wheel/driver compatibility; the host GPU launch was not exercised here. Use the
vLLM protocol with the documented
[choice-constrained structured outputs](https://docs.vllm.ai/en/latest/features/structured_outputs/):

```sh
node --import ./agent/node_modules/tsx/dist/loader.mjs explore/cli.ts \
  --out runs/explore-ed-gpu --backend codex --budget 4 --iterations 4 \
  --decision-endpoint http://127.0.0.1:8787/v1 \
  --decision-protocol token-logprobs
```

## Calibration

```sh
node --import ./agent/node_modules/tsx/dist/loader.mjs explore/calibration.mjs \
  --out runs/explore-calibration-stand-in --limit 200
node --import ./agent/node_modules/tsx/dist/loader.mjs explore/calibration.mjs \
  --out runs/explore-calibration-cpu --endpoint http://127.0.0.1:8787/v1 --limit 8
MPLCONFIGDIR="$TMPDIR/matplotlib" "$TMPDIR/explore-venv/bin/python" \
  explore/plot_calibration.py runs/explore-calibration-cpu/calibration.json
```

Reliability curves use ten equal-width bins; `ECE = Σ_b n_b/N |confidence_b −
frequency_b|`. Screen reliability uses predicted pass probability versus Lean
verdict; Choice uses top-choice confidence versus agreement with the recorded
simulator click. Binary Brier scores are also recorded (Choice Brier here is
top-confidence correctness, not multiclass Brier). Empty bins have zero weight.
Calibration input never contains the outcome it predicts.

Verdict rows come from `runs/core-10day-live/decisions`; they include planted
candidates and are highly imbalanced. There are more rows than unique agent
proposals. Choice rows reconstruct states with the recorded WASM interpreter,
retain only visible enabled click actions, and take at most one choice per W3
trajectory. These are **simulator-generated labels, not human observations**;
typing/tab/acknowledgment decisions are outside this first dataset.

Frozen models are evaluated without temperature fitting. Group IDs (night/day)
are retained for later disjoint train/calibration/test splits. The tiny-model
smoke uses a chronological prefix with no negative verdicts, so its ECE cannot
establish discrimination or deployment readiness. The curves are diagnostics,
not evidence to relax the Lean gate. Decision Choice currently runs offline
against trajectories; it does not replace the Lean simulator's clinician policy.
