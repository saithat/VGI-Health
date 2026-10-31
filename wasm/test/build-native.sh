#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
prefix=$(lean --print-prefix)
# leanc's relocatable sysroot has Clang/Lean headers but no libc development
# headers. Compile the small POSIX line driver with the host compiler first.
cc -O2 -fPIC -I"$prefix/include" -c wasm/test/native-driver.c -o wasm/.build/native-driver.o
leanc -O2 -o wasm/.build/native-step \
  wasm/.build/c/Lean/WasmSpike.c wasm/.build/native-driver.o \
  -lLean -lStd
