#!/usr/bin/env bash
# Regenerate the proof map from the compiled Lean build.
# usage: scripts/proof-map/build.sh [out-dir]   (run after `cd lean && lake build`)
# Writes <out-dir>/index.html and <out-dir>/data.json (default: lean/.lake/proof-map).
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
out="${1:-$root/lean/.lake/proof-map}"
mkdir -p "$out"
cd "$root/lean"
# Every compiled project module except executables' mains and the Comparator
# challenge modules, which restate headline theorems with `sorry` and would
# shadow the real proofs. Test-only modules (*Tests) are skipped too.
mapfile -t mods < <(cd .lake/build/lib/lean && find . -name '*.olean' | sed 's|^\./||; s|\.olean$||; s|/|.|g' \
  | grep -E '^(Ehr|CommitProtocol|Solution)(\.|$)' \
  | grep -vxE 'Ehr\..*Tests|Ehr\.Tools\.(GenTS|ExportContent|ProfileGoals|CompletionBench)|Ehr\.Sem\.ExoticMain|Ehr\.Layout\.(Main|Audit)|Ehr\.Check\.(ComparatorStatements|CompletionStatements)' \
  | sort | while read -r m; do [ -f "$root/lean/${m//.//}.lean" ] && echo "$m"; done)  # skip stale oleans
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
lake env lean --run "$root/scripts/proof-map/Extract.lean" "$tmp/full.json" "${mods[@]}"
python3 "$root/scripts/proof-map/shape.py" "$tmp/full.json" "$root" "$out"
cp "$root/scripts/proof-map/index.html" "$out/index.html"
