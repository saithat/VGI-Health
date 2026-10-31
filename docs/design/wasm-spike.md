# Lean 4.35 browser WASM spike

Work in progress (2026-10-31). Scope: BRIEF.md §2 option A and core-model.md §5,
with a synchronous string-based `step` export. This does not change the spec,
properties, or project data formats.

## Approach

- Pin Lean v4.35.0 (`eb6cafb7290e8bd5f2937522d8d804f58f02bafc`).
- Install Emscripten 6.0.13 in this worktree's ignored `.tools/emsdk`.
- Compile the matching C++ runtime and Lean-generated stdlib C for wasm32.
- Use Lean 4.35 `module` files and their `runtime_initialize_*` entry points.
  Legacy module initialization calls `lean_initialize`, which initializes the
  elaborator and whole Lean library. Runtime-only initialization avoids that.
- Test the full `Lean.Data.Json` import plus an Init-only ABI control probe.

Prior art reviewed:
[xeus-lean runtime build](https://github.com/Verilean/xeus-lean/blob/55c16cfc949504146526e36907c8c686e998787b/cmake/LeanRtWasm.cmake),
[xeus-lean stdlib build](https://github.com/Verilean/xeus-lean/blob/55c16cfc949504146526e36907c8c686e998787b/cmake/LeanStage0Wasm.cmake), and
[lean2wasm driver](https://github.com/T-Brick/lean2wasm/blob/28620e1f33e0772e90b036db12ed099a734b4b19/Lean2Wasm.lean).
Borrow the runtime source list, `LEAN_EMSCRIPTEN`, dependency closure approach,
and modularized Emscripten linking. Unlike the xeus REPL, this spike does not
load host `.olean` files at runtime, so wasm32 and the non-GMP fallback are
appropriate candidates. No third-party source code is copied into tracked files.

## Results and recommendation

Pending build and benchmarks; no option B fallback decision has been made.
