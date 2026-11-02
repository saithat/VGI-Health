# Exploration verification record

From the repository root, common environment:

```sh
export TMPDIR=/home/saithat/Projects/run-tmp
export EHR_BIN=/home/saithat/Projects/VGI-Health/lean/.lake/build/bin/ehr
export EHR_SCREEN_WORKERS=4 TAILSCALE_SERVE=0
```

The executed search, continuation and independent final recheck:

```sh
node --import ./agent/node_modules/tsx/dist/loader.mjs explore/cli.ts --out runs/explore-ed-first --backend codex --budget 4 --iterations 4 --days 1,2
node --import ./agent/node_modules/tsx/dist/loader.mjs explore/review.ts --run runs/explore-ed-first --add-layout document --backend codex --feedback 'The previous document attempt passed Lean but failed full source-cell fidelity for a historical prior-notes panel. The supplied seed now uses the supported noteSummary document on the provider screen. Preserve every historical record panel and its original tag/presentation. Keep document display limited to noteSummary. Propose a distinct coherent document-centered encounter workspace; do not relabel historical rows or silently drop content.'
node --import ./agent/node_modules/tsx/dist/loader.mjs explore/review.ts --run runs/explore-ed-first --repair candidate-005 --patch runs/explore-ed-first/operators/repair-005-budget.json
node --import ./agent/node_modules/tsx/dist/loader.mjs explore/review.ts --run runs/explore-ed-first --recheck
node --import ./agent/node_modules/tsx/dist/loader.mjs explore/baseline.ts runs/explore-ed-first
node --import ./agent/node_modules/tsx/dist/loader.mjs explore/screenshots.mjs runs/explore-ed-first
```

Use new run paths when regenerating; explicit review operations require a stopped
writer. The JSON repair is `[{'op':'remove','path':'/screens/[id=w3Provider]/components/[id=w3Provider.commit.signNote]/parent'}]`
(with JSON double quotes). Final checks:

```sh
EXPLORE_DECISION_ENDPOINT=http://127.0.0.1:8787/v1 make explore-test
pnpm --filter agent typecheck
pnpm --filter app build
sh -n explore/decision-server.sh
git diff --check
```

The harness has ten passing tests, including the live tiny CPU endpoint; app
build and agent typecheck pass. Screen/Lean rechecks pass for the four saved
winners, and each fresh simulation completes 40/40 tasks. The CPU server was
started with `make decision-server`; its optional fitted TabPFN endpoint used
`DECISION_ARGS='--port 8788 --tabpfn-training /home/saithat/Projects/VGI-explore/runs/explore-calibration-cpu/tabpfn-synthetic-training.json'`.
Calibration and plotting commands are in [the implementation notes](exploration-tools.md#calibration).

No Lean files, theorem statements, app source or hash-bound app configuration
were changed; no Lake build was needed. No push, deployment, GPU inference,
Microsoft-Decision-1 inference or Jev request was performed. The GPU driver was
unreachable; Microsoft's proposed Hugging Face weights/license were unavailable;
Jev has no configured key. No human or held-out department validation was claimed.
The next experiment needs a broader same-role clinician cohort, held-out cases
and release migrations, plus geometry-aware effort for exotic layouts.
