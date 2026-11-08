#!/usr/bin/env bash
# Regenerate the proof map from the compiled Lean build.
# usage: scripts/proof-map/build.sh [--readme | --check-readme] [out-dir]
# Run after `cd lean && lake build` (CI also builds extra-modules.txt).
# Writes <out-dir>/index.html and <out-dir>/data.json (default: lean/.lake/proof-map).
# --readme rewrites docs/proof-map.md; --check-readme fails if its generated
# section is out of date. The flag names remain compatible with existing callers.
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
readme=""
case "${1:-}" in --readme) readme=write; shift ;; --check-readme) readme=check; shift ;; esac
out="${1:-$root/lean/.lake/proof-map}"
mkdir -p "$out"
cd "$root/lean"
# Map exactly the default build targets (lakefile defaultTargets: libraries Ehr
# and CommitProtocol, executable root Main) plus the proof modules listed in
# extra-modules.txt, with everything they import. A fixed root set keeps the
# output identical on every machine, whatever else is compiled locally. The
# Comparator challenge modules (headline statements with `sorry`) are not
# reachable from these roots; shape.py fails if any `sorry` slips in.
mapfile -t mods < <(printf '%s\n' Ehr CommitProtocol Main; grep -v '^\s*$' "$root/scripts/proof-map/extra-modules.txt")
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
lake env lean --run "$root/scripts/proof-map/Extract.lean" "$tmp/full.json" "${mods[@]}"
python3 "$root/scripts/proof-map/shape.py" "$tmp/full.json" "$root" "$out"
cp "$root/scripts/proof-map/index.html" "$out/index.html"
case "$readme" in
  write) python3 "$root/scripts/proof-map/readme.py" "$out/data.json" "$root/docs/proof-map.md" ;;
  check) python3 "$root/scripts/proof-map/readme.py" "$out/data.json" "$root/docs/proof-map.md" --check ;;
esac
