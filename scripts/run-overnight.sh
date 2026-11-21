#!/usr/bin/env bash
# Prepare and run the owner-authorized all-persona 10-day loop. Never invoked by the smoke task.
set -euo pipefail
cd "$(dirname "$0")/.."
run_id="${1:?Usage: scripts/run-overnight.sh <run-id> [--resume]}"
shift
resume=false
for argument in "$@"; do [[ "$argument" != "--resume" ]] || resume=true; done
if [[ ! "$run_id" =~ ^[A-Za-z0-9_-]+$ ]]; then echo 'Invalid run id' >&2; exit 2; fi
if [[ "${VGI_LOCAL_RECORD:-0}" != 1 && ! -f runs/world/2/world.json ]]; then echo 'World 2 must land before the full run.' >&2; exit 1; fi
export EHR_FAKE=0 LEAN_STACK_SIZE_KB=65536 CODEX_REASONING_EFFORT=high
# A default in the environment lets resume and replay inherit the recorded night tier.
export CODEX_SERVICE_TIER="${CODEX_SERVICE_TIER:-default}"
defaults=(--parallel --days 10 --backend codex --world runs/world/2 --personas P1,P2,P3,P4,P5 --reasoning-effort "${CODEX_REASONING_EFFORT}")
if [[ "${VGI_LOCAL_RECORD:-0}" == 1 ]]; then
  defaults=()
  export EHR_CONFORMANCE_TRANSPORT="${EHR_CONFORMANCE_TRANSPORT:-serve}"
else
  export LEAN_NUM_THREADS=6
fi
# Run this wrapper in the orchestrator systemd memory scope. No RLIMIT_AS:
# Lean thread reservation can exceed that virtual-address limit on this host.
if [[ "${VGI_LOCAL_RECORD:-0}" == 1 ]]; then
  # The local launcher uses the same recording and reporting pipeline. Its
  # incremental build provides current native and browser assets; run-days
  # validates the resume against its recorded fingerprints.
  if command -v flock >/dev/null; then
    mkdir -p .cache/one-command
    exec 9>>.cache/one-command/recording.lock
    flock -n 9 || { echo 'Another recording is active in this checkout.' >&2; exit 1; }
  fi
  node scripts/local-build.mjs
elif $resume; then
  make wasm-check
else
(cd lean && lake build)
make wasm-check
(cd lean && lake -d ../scripts/measure-replay build)
pnpm --filter agent manual
pnpm --filter agent typecheck
pnpm --filter agent lint
pnpm --filter app build
pnpm --filter agent test
pnpm --filter app test
pnpm --filter app lint
fi
mkdir -p "runs/$run_id/logs"
# All persona workers share this Node heap inside the recording memory scope.
NODE_OPTIONS="--max-old-space-size=8192 ${NODE_OPTIONS:-}" pnpm --filter agent run-days "${defaults[@]}" \
  --run-id "$run_id" \
  --fhir "${EHR_SAMPLE_FHIR:-fixtures/synthea/Ashly_Rippin_149fcc1f.json}" "$@" \
  2>&1 | tee -a "runs/$run_id/logs/console.txt"
pnpm trajectories --run "$run_id"
if ! pnpm complexity --run "$run_id"; then
  echo "Post-run floor report unavailable; completed run measurements are retained." >&2
fi
pnpm final-eval --run "$run_id"
pnpm conformance --run "$run_id" --run-only --jobs 5
# Copy the finished artifacts into the static dashboard. Source/code hashes stay the same.
if ! $resume && [[ "${VGI_LOCAL_RECORD:-0}" != 1 ]]; then pnpm --filter app build; fi
