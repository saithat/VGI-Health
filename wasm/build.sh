#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ ! -f .tools/emsdk/emsdk_env.sh || ! -d .tools/lean4/src/runtime || ! -d .tools/libuv/include ]]; then
  echo 'Run wasm/setup.sh first.' >&2
  exit 1
fi
export EMSDK_QUIET=1
source .tools/emsdk/emsdk_env.sh
test "$(lean --short-version)" = 4.35.0
test "$(lean --githash)" = eb6cafb7290e8bd5f2937522d8d804f58f02bafc
[[ "$(emcc --version)" == *" 6.0.13 "* ]]
python3 wasm/build.py "$@"
