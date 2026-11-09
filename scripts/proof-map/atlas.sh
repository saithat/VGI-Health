#!/usr/bin/env bash
# Optional public Lean Atlas view; never adds a dependency to lean/lakefile.toml.
# Run the normal map build first. --serve starts the upstream viewer on loopback.
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
: "${TMPDIR:?Set disk-backed TMPDIR}"
export LEAN_NUM_THREADS="${LEAN_NUM_THREADS:-4}"
revision=3a81e194db0e6c41a2a8c5286f9e1b4962c3866a
atlas="$root/lean/.lake/proof-map-tools/atlas"
if [[ ! -d "$atlas/.git" ]]; then
  mkdir -p "$(dirname "$atlas")"
  git clone --no-checkout https://github.com/NyxFoundation/lean-atlas.git "$atlas"
  git -C "$atlas" checkout --detach "$revision"
fi
[[ "$(git -C "$atlas" rev-parse HEAD)" == "$revision" ]] || { echo "Unexpected Lean Atlas revision in $atlas" >&2; exit 1; }
toolchain="$(cat "$root/lean/lean-toolchain")"
cd "$atlas"
lake +"$toolchain" build LeanAtlas.GraphData.Json
mapfile -t mods < <(printf '%s\n' Ehr CommitProtocol Main; grep -v '^\s*$' "$root/scripts/proof-map/extra-modules.txt")
heads="$(mktemp)"; trap 'rm -f "$heads"' EXIT
python3 - "$root/lean/.lake/proof-map/data.json" "$heads" <<'PY'
import json, pathlib, sys
rows = json.loads(pathlib.Path(sys.argv[1]).read_text())['decls']
pathlib.Path(sys.argv[2]).write_text('\n'.join(r[0] + '\t' + ','.join(r[10]) for r in rows if r[1] == 't' and r[8]))
PY
mkdir -p "$atlas/web/public/data"
export LEAN_PATH="$root/lean/.lake/build/lib/lean${LEAN_PATH:+:$LEAN_PATH}"
lake +"$toolchain" env lean --run "$root/scripts/proof-map/Atlas.lean" "$atlas/web/public/data/graph.json" "$heads" "${mods[@]}"
if [[ "${1:-}" == --serve ]]; then
  cd "$atlas/web"
  # This upstream viewer has its own lockfile and dependency tree.
  pnpm install --frozen-lockfile --ignore-scripts --store-dir "$TMPDIR/proof-map-atlas-pnpm-store"
  # The upstream review API can write annotations: point it at copied sources.
  mkdir -p "$atlas/source"
  python3 - "$root" "$atlas/source" <<'PY_COPY'
import json, pathlib, shutil, sys
root, target = map(pathlib.Path, sys.argv[1:])
for module, _ in json.loads((root / 'lean/.lake/proof-map/data.json').read_text())['modules']:
    relative = pathlib.Path(module.replace('.', '/') + '.lean')
    destination = target / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(root / 'lean' / relative, destination)
PY_COPY
  export LEAN_PROJECT_ROOT="$atlas/source"
  pnpm exec next dev --hostname 127.0.0.1 --port "${ATLAS_PORT:-5326}"
else
  echo "View with scripts/proof-map/atlas.sh --serve (http://127.0.0.1:5326)"
fi
