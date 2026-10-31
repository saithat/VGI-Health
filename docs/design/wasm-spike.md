# Lean 4.35 browser WASM spike

Measured 2026-10-31. Scope: BRIEF.md §2 option A and core-model.md §5,
with a synchronous string-based `step` export. This does not change the spec,
properties, or project data formats.

## Approach

- Pin Lean v4.35.0 (`eb6cafb7290e8bd5f2937522d8d804f58f02bafc`).
- Install Emscripten 6.0.13 in this worktree's ignored `.tools/emsdk`.
- Compile the matching C++ runtime and Lean-generated stdlib C for wasm32.
- Use Lean 4.35 `module` files and their `runtime_initialize_*` entry points.
  Modules importing Lean outside the `Lean` module-name prefix still call
  `lean_initialize` in 4.35, so the probes use `Lean.WasmSpike` and
  `Lean.WasmInitOnly`. Runtime initialization avoids the elaborator.
- Test the full `Lean.Data.Json` import plus an Init-only ABI control probe.

Prior art reviewed:
[xeus-lean runtime build](https://github.com/Verilean/xeus-lean/blob/55c16cfc949504146526e36907c8c686e998787b/cmake/LeanRtWasm.cmake),
[xeus-lean stdlib build](https://github.com/Verilean/xeus-lean/blob/55c16cfc949504146526e36907c8c686e998787b/cmake/LeanStage0Wasm.cmake), and
[lean2wasm driver](https://github.com/T-Brick/lean2wasm/blob/28620e1f33e0772e90b036db12ed099a734b4b19/Lean2Wasm.lean).
Borrow the runtime source list, `LEAN_EMSCRIPTEN`, dependency closure approach,
and modularized Emscripten linking. Unlike the xeus REPL, this spike does not
load host `.olean` files at runtime, so wasm32 and the non-GMP fallback are
appropriate. No third-party source code is copied into tracked files.

## Results and recommendation

**GO for option A.** The full `Lean.Data.Json` path runs synchronously in Node
22.23.1 and Chromium 156.0.8078.4, served by an ordinary static HTTP server.
No threads, shared memory, GMP, runtime `.olean` loading, or COOP/COEP headers.

Initial measurement (final reproducibility measurements to follow):

| Probe | WASM bytes | gzip bytes | Brotli bytes | Node mean / call (1,000 calls) |
|---|---:|---:|---:|---:|
| Init-only | 589,721 | 115,493 | 89,824 | 2.22 µs |
| Full JSON | 756,444 | 153,271 | 114,915 | 5.94 µs |

Chromium: 6.0 µs per JSON call (1,000 calls); 19.5 ms module load + initialization
on localhost. These are small-payload spike measurements, not interpreter latency
guarantees. The first JSON call took 2.8 ms before warming up.

The Node harness checks 2,006 byte-identical native/WASM outputs, including UTF-8,
malformed JSON, nested arrays/objects, counters above wasm32's small-Nat boundary,
and a 40-digit Nat. Live allocator bytes stay at 27,696 across 20,000 further JSON
calls (Init-only: 26,328). Both Lean objects and copied return buffers are freed.

The default build generates 654 modules for the Init-only root and 712 for the
JSON root, including each root; link-time section elimination keeps the artifacts
small. C is generated with the installed Lean 4.35 compiler, not bootstrap C.

## Problems resolved so far

- Runtime now requires C++20 (`bit_cast`, atomic wait/notify), unlike older prior
  art using C++17.
- Correct three upstream signatures in build-local copies: the Emscripten
  `lean_uv_os_get_group` stub needs its `uint64_t` argument; the two temp-file/dir
  functions must omit the erased IO world token. The pinned checkout is untouched.
- Lean's IO runtime still needs `uv.h` even in Emscripten mode. Pin libuv 1.52.1
  for headers; the only retained libuv function is error-text lookup, implemented
  using its public `UV_ERRNO_MAP` table. No networking/filesystem stubs are added.
- The native `leanc` sysroot lacks libc development headers. Compile the small
  POSIX line driver with host `cc -fPIC`, then link with `leanc` and its host libs.
- Git worktree index/ref writes require sandbox escalation because the metadata
  is under the main checkout. Only normal git metadata is touched there; all
  source changes and tooling remain inside this worktree. Push is working.
