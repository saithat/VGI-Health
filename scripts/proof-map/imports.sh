#!/usr/bin/env bash
# Independent Lake package: consumes certified oleans without requiring Ehr.
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
out="$(realpath "${1:-$root/lean/.lake/proof-map}")"
: "${TMPDIR:?Set disk-backed TMPDIR}"
export LEAN_NUM_THREADS="${LEAN_NUM_THREADS:-4}"
mapfile -t mods < <(printf '%s\n' Ehr CommitProtocol Main; grep -v '^\s*$' "$root/scripts/proof-map/extra-modules.txt")
targets="$(IFS=,; echo "${mods[*]}")"
cd "$root/scripts/proof-map/import-graph"
# Lake adds this package's dependencies to the existing project search path.
export LEAN_PATH="$root/lean/.lake/build/lib/lean${LEAN_PATH:+:$LEAN_PATH}"
lake exe graph --to "$targets" --include-lean --show-transitive "$out/imports.dot"
