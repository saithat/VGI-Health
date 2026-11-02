#!/usr/bin/env bash
# Build the exact exported runtime APIs without importing the aggregate test root.
# Run with no other Lake process active. Production lakefile/Main are untouched.
set -euo pipefail
cd "$(dirname "$0")/../../.."
mkdir -p .tools/render-native
cp lean/lean-toolchain .tools/render-native/lean-toolchain
cp lean/Ehr/Render/ExportTests.lean .tools/render-native/ExportTests.lean
cat > .tools/render-native/lakefile.toml <<'TOML'
name = "render_native"
version = "0.1.0"
[[require]]
name = "ehr"
path = "../../lean"
[[lean_exe]]
name = "render-native"
root = "Main"
[[lean_exe]]
name = "render-export"
root = "ExportTests"
TOML
cat > .tools/render-native/Main.lean <<'LEAN'
import Ehr.Render.Api

-- Native build of the exact functions exported to WASM. No clinical logic here.
def main (args : List String) : IO UInt32 := do
  let stdin ← IO.getStdin
  let mut input := ""
  repeat
    let line ← stdin.getLine
    if line.isEmpty then break
    input := input ++ line
  let result := match args with
    | ["facts"] => Ehr.Render.apiFacts input
    | ["render"] => Ehr.Render.apiRender input
    | ["render-ui"] => Ehr.Render.apiRenderUi input
    | ["init"] => Ehr.apiInitEnvelope input
    | ["view"] => Ehr.apiViewEnvelope input
    | ["step"] => Ehr.apiStepEnvelope input
    | _ => Ehr.errorJson "unknown API command"
  IO.println result
  return 0
LEAN
LEAN_NUM_THREADS="${LEAN_NUM_THREADS:-1}" lake -d .tools/render-native build render-native render-export
