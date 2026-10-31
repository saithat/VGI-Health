#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .tools
if [[ ! -d .tools/emsdk/.git ]]; then
  git clone https://github.com/emscripten-core/emsdk.git .tools/emsdk
fi
git -C .tools/emsdk checkout d7b4130688bfa348392b921ab04015aa15c4f154
.tools/emsdk/emsdk install 6.0.13
.tools/emsdk/emsdk activate 6.0.13
if [[ ! -d .tools/lean4/.git ]]; then
  git clone --depth 1 --branch v4.35.0 https://github.com/leanprover/lean4.git .tools/lean4
fi
test "$(git -C .tools/lean4 rev-parse HEAD)" = eb6cafb7290e8bd5f2937522d8d804f58f02bafc
if [[ ! -d .tools/libuv/.git ]]; then
  git clone --depth 1 --branch v1.52.1 https://github.com/libuv/libuv.git .tools/libuv
fi
test "$(git -C .tools/libuv rev-parse HEAD)" = 1cfa32ff59c076ffb6ed735bbc8c18361558661f
echo 'Tooling ready. Run wasm/build.sh (no shell profile changes needed).'
