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
python3 wasm/build.py "$@"
