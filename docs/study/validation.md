# Study tooling validation — 2026-11-02

All commands below ran from this worktree on `lane/study`, with
`TMPDIR=/home/saithat/Projects/run-tmp`. No Lean sources, certified app hash inputs,
dependency lockfile or tracked data changed. The Python 3.14 plotting virtual environment
was installed with `python3 -m venv "$TMPDIR/study-plot-venv"` and
`"$STUDY_PYTHON" -m pip install --cache-dir "$TMPDIR/study-pip-cache" -r scripts/study/requirements-plot.txt`. `CLAUDE.md` was absent from this
worktree; README guidance and the owner's lane instructions were followed.

```sh
export TMPDIR=/home/saithat/Projects/run-tmp
export STUDY_PYTHON="$TMPDIR/study-plot-venv/bin/python"
pnpm install --frozen-lockfile --store-dir "$TMPDIR/pnpm-study-store"
pnpm --filter app exec tsc --noEmit
pnpm --filter app exec eslint src/dashboard/study src/dashboard/data.ts
node --import ./agent/node_modules/tsx/dist/loader.mjs --test scripts/study/*.test.mjs
pnpm --filter app test --maxWorkers=4 tests/dashboard.test.tsx tests/build-binding.test.ts tests/trajectory-compare.test.ts
pnpm --filter app build
node --import ./agent/node_modules/tsx/dist/loader.mjs scripts/study/dry-run.mjs --out runs/study-dry-verified --participants 4
node --import ./agent/node_modules/tsx/dist/loader.mjs scripts/study/verify-trajectories.mjs --out runs/study-dry-verified
node --import ./agent/node_modules/tsx/dist/loader.mjs scripts/study/analysis.mjs --out runs/study-dry-verified
node --import ./agent/node_modules/tsx/dist/loader.mjs scripts/study/check-binding.mjs --out runs/study-dry-verified
git diff --check
```

Installation, type checking, targeted lint, the five study tests, the 17 existing
regression assertions, production build and whitespace checks passed. Study tests
cover Williams allocation/carryover balance, known-value ECE and tie handling,
paired effort/CIs and questionnaire scoring, pseudonym/schema validation, adapted
consent requirements, participant collision rejection, withdrawal exclusion,
immutable atomic exports and loopback/origin controls.

The production binding matches a clean archive of pre-lane HEAD
`2c1d7af5072affb12804abcd23bc1c1077ed5e84`, built with the same dependencies and
local build environment in disk-backed scratch space. Both app SHA-256 values:
`fe455e50996b1e36e1f81565b2e75fd51580c788d318843d261358dee2a70af0`.
No certificate was rebound. The comparison, baseline log, task snapshots,
reliability SVG/JSON, effort CSV, screenshots and browser verification remain in
ignored `runs/study-dry-verified/`. No other branch/worktree was modified.

The browser rehearsal uses four simulated participants covering all four Williams
orders. All 16 measured tasks complete; 1520 events replay with zero mismatches
and all final states match. Both policies score 57 eligible observations;
practice and questionnaire responses are artificial. It exercises real DOM key, click, pointer and scroll counters, plus
semantic goal-driver actions. The existing dashboard replayer independently
checks event results and final interpreter states. The frozen decision-model
stand-in is uniform; the simulator score uses the existing seeded profile layer.
These are pipeline checks, not human calibration or measured clinician effort.
Exact row/event counts are in `dry-run-verification.json` and
`trajectory-verification.json`; coverage exclusions are retained in predictions
and analysis JSON. Earlier development rehearsals remain in separate ignored
study directories and are not pooled.

Two broader checks expose existing worktree issues:

```sh
pnpm --filter app lint
pnpm --filter app test --maxWorkers=4 tests/dashboard.test.tsx tests/dashboard-performance.test.ts tests/build-binding.test.ts tests/trajectory-compare.test.ts
```

Full lint fails at `app/tests/ui-painter.test.tsx:1662` on an existing forbidden
`as HTMLButtonElement` assertion. The broader test command has 17 passing
assertions and one suite-load failure: `dashboard-performance.test.ts` requires
absent `runs/core-10day-live/trajectories/index.json`. Those unrelated files were
not changed. Study preparation reads its selected historical contexts directly
from `hackathon-final` when the local copies are absent and records that origin.

No Lake build or axiom audit was run because there are no Lean changes. No human
recruitment, scoring on human labels, institutional ethics determination,
deployment or push was performed. Before recruitment the owner must finalize institutional review/determination, consent/retention and
compensation terms, clinician task review and frozen model revision. Confirm that
the explicitly single-patient board comparison matches the intended pilot scope.
