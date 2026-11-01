#!/usr/bin/env bash
# Prepare and run the owner-authorized all-persona 10-day loop. Never invoked by the smoke task.
set -euo pipefail
cd "$(dirname "$0")/.."
run_id="${1:?Usage: scripts/run-overnight.sh <run-id> [--resume]}"
shift
if [[ ! "$run_id" =~ ^[A-Za-z0-9_-]+$ ]]; then echo 'Invalid run id' >&2; exit 2; fi
if [[ ! -f runs/world/2/world.json ]]; then echo 'World 2 must land before the full run.' >&2; exit 1; fi
export EHR_FAKE=0 LEAN_NUM_THREADS=6 LEAN_STACK_SIZE_KB=65536 EHR_SCREEN_WORKERS=1 CODEX_REASONING_EFFORT=high
# Lean compiler invocations (including indexing helpers) enforce the 8 GB ceiling locally.
# Keep Node/browser outside that virtual-address ceiling; V8 reserves WASM address space.
(cd lean && (ulimit -v 8000000; lake build))
pnpm --filter agent manual
pnpm --filter agent typecheck
pnpm --filter agent test
pnpm --filter agent lint
pnpm --filter app build
pnpm --filter app test
pnpm --filter app lint
mkdir -p "runs/$run_id/logs"
pnpm --filter agent run-days --days 10 --backend codex --service-tier "${CODEX_SERVICE_TIER:-fast}" --reasoning-effort "${CODEX_REASONING_EFFORT:-high}" --world runs/world/2 \
  --personas P1,P2,P3,P4,P5 --run-id "$run_id" \
  --fhir "${EHR_SAMPLE_FHIR:-fixtures/synthea/Ashly_Rippin_149fcc1f.json}" "$@" \
  2>&1 | tee -a "runs/$run_id/logs/console.txt"
pnpm trajectories --run "$run_id"
pnpm complexity --run "$run_id"
# Copy the finished artifacts into the static dashboard. Source/code hashes stay the same.
pnpm --filter app build
