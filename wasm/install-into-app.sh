#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p app/public/ehr
for asset in ehr-interp.mjs ehr-interp.wasm interp-loader.mjs interp-loader.d.mts; do
  test -f "wasm/dist/$asset" || { echo 'Run wasm/build-ehr.sh first.' >&2; exit 1; }
  cp "wasm/dist/$asset" "app/public/ehr/$asset"
done
