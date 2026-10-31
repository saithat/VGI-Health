# Lean 4.35 browser WASM spike

Measured 2026-10-31. Scope: BRIEF.md §2 option A and core-model.md §5,
with a synchronous string-based `step` export. This does not change the spec,
properties, or project data formats.

**Decision: GO for option A.** The full JSON path works in the browser. The main
interpreter needs the runtime-initializer handling described below; this is a
toolchain/ABI proof, not yet a build of the EHR interpreter.

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

Final measurements after rebuilding from empty C/object caches:

| Probe | WASM bytes | gzip bytes | Brotli bytes | Node mean / call (1,000 calls) |
|---|---:|---:|---:|---:|
| Init-only | 589,721 | 115,493 | 89,824 | 2.20 µs |
| Full JSON | 756,444 | 153,271 | 114,915 | 5.98 µs |

Chromium averaged **6.0–13.1 µs** per JSON call in two 1,000-call runs. The final
run loaded/initialized in 27.5 ms on localhost; its first, unwarmed call took
2.5 ms. The browser fetched the loader and WASM with HTTP 200 and reported
`crossOriginIsolated === false`. Both JSON and Init-only were exercised there.

Node JSON p50/p95: 4.63/8.58 µs; Init-only: 1.65/2.68 µs. Module instantiation
plus Lean initialization took 20.88 ms for JSON and 19.43 ms for Init-only, with
the WASM already read into a buffer. The ES loaders are respectively 59,289 and
59,299 bytes; the shared wrapper is 860 bytes. Timings include string conversion,
Lean JSON work, allocation/copy/free, and Node instrumentation/return-type checks.
They are small-payload spike measurements, not interpreter latency guarantees.

Machine: Linux x86_64, AMD Ryzen 9 7950X3D, 32 logical CPUs; 8 compiler jobs.
Node v22.23.1; Playwright 1.64.1 / headless Chromium 156.0.8078.4.

The Node harness checks 2,006 byte-identical native/WASM outputs, including UTF-8,
malformed JSON, nested arrays/objects, counters above wasm32's small-Nat boundary,
and a 40-digit Nat. Live allocator bytes stay at 27,696 across 20,000 further JSON
calls (Init-only: 26,328). Both Lean objects and copied return buffers are freed.

The default build generates 654 modules for the Init-only root and 712 for the
JSON root, including each root; link-time section elimination keeps the artifacts
small. C is generated with the installed Lean 4.35 compiler, not bootstrap C.
This includes the full `Lean.Data.Json` umbrella and its runtime import closure,
not just selected parser/printer imports. Metadata-only initializers are discarded.

A clean C/object build of both probes took **90.85 seconds** after SDK setup;
an incremental rebuild took about 2.7 seconds. Independently rebuilt WASM files
were byte-identical:

```text
ehr.wasm       fbdce407107f6eec90148bfa2e7c0ed45ebbd891fb2b7fa49f900b7d39e6cee6
ehr-init.wasm  e96865298f80f9d8b3a0d01f12abda96ac10ed3af6aa4b53095d9b74e9507ea3
```

Raw final measurements and hashes are captured in
[`wasm/test/results.json`](../../wasm/test/results.json).

## Exact reproduction steps

Prerequisites: git, Python 3, Node 22+, host `cc`, and elan with
`leanprover/lean4:v4.35.0`. Run from the repository root:

```sh
wasm/setup.sh
wasm/build.sh
node wasm/test/node-test.mjs
node wasm/test/node-test.mjs --init
python3 -m http.server 8087 --bind 127.0.0.1
```

Open **http://127.0.0.1:8087/wasm/test/index.html**. The static server is currently
running in the Rex tab **WASM demo**. Edit the JSON and click the button; the page
prints Lean's result and the synchronous call time.

Setup pins the emsdk manager at `d7b4130688bfa348392b921ab04015aa15c4f154`, SDK
6.0.13 (release `eb132757325583b787fe9414b09afea9442b72ad`, compiler
`e13ee988ce3d87a738dd8f3661d02223308c412a`), Lean at the hash above, and libuv
1.52.1 at `1cfa32ff59c076ffb6ed735bbc8c18361558661f`. No shell profile changes
or global SDK installation are needed. Downloads happen in setup; builds and
the static demo subsequently need no network access.

The driver takes the runtime source list from the pinned Lean CMake file and
generates stdlib C using `lean -j1 -R ROOT -c OUTPUT SOURCE`. It discovers the
closure from emitted runtime initializer calls, preserving the generated C
unchanged. Compile with `emcc`/`em++`, `-O2`, C++20, `LEAN_EMSCRIPTEN`,
`LEAN_EXPORTING`, `NDEBUG`, and `-fwasm-exceptions`. The generated config leaves
`LEAN_USE_GMP`, `LEAN_MIMALLOC`, and `LEAN_MULTI_THREAD` undefined. Link with
`--no-entry`, `MODULARIZE`, `EXPORT_ES6`, `ENVIRONMENT=web,node`, explicit exports,
and undefined-symbol errors enabled. Linear memory starts at 32 MiB, with an
8 MiB stack and growth enabled. No host archive is linked into WASM.

Outputs are ignored by git and generated locally:

- `wasm/dist/ehr.mjs` + `ehr.wasm`: full JSON ES module.
- `wasm/dist/ehr-init.mjs` + `ehr-init.wasm`: Init-only control.
- `wasm/dist/ehr.js` + `ehr.d.ts`: ergonomic wrapper and TypeScript interface.
- `wasm/.build/`: C, objects, patches, dependency manifests, native comparator,
  measurements, and browser screenshot.

Use `JOBS=4 wasm/build.sh` on a smaller machine; default is 8. Options
`--variant json` and `--variant init` select one probe. To force a cold build,
remove the generated `wasm/.build` and `wasm/dist` directories first.

Optional automated browser validation, with the server above running:

```sh
npm install --prefix .tools/browser --cache .tools/npm-cache --no-save playwright@1.64.1
PLAYWRIGHT_BROWSERS_PATH="$PWD/.tools/browser/browsers" \
  .tools/browser/node_modules/.bin/playwright install chromium
PLAYWRIGHT_BROWSERS_PATH="$PWD/.tools/browser/browsers" \
  node wasm/test/browser-test.mjs
node wasm/test/record-results.mjs
```

These QA dependencies stay in ignored `.tools`. Existing workspace lockfiles and
package dependencies were not changed. The browser test checks the first call,
a Unicode button click, 1,000 calls, both module variants, asset loading, page
errors, and operation without isolation headers.

## Export and memory contract

`Lean/WasmSpike.lean` has `@[export ehr_step] def step : String → String`.
It parses JSON, requires a natural-number `counter`, increments it, constructs
a three-element list, echoes the parsed input, and renders compact JSON. Invalid
JSON/counter input produces an `error` string in a JSON object. Example:

```text
in:  {"counter":41}
out: {"counter":42,"input":{"counter":41},"items":[41,42,43]}
```

The Init-only probe appends `" (Lean Init/WASM)"`; it deliberately does not claim
to parse JSON. Both probes have executable Lean `#guard` checks.

`bridge.cpp` initializes once per module instance, in this order:

1. `lean_initialize_runtime_module()`.
2. `runtime_initialize_Lean_WasmSpike(1)` (or the Init-only root), checking its IO
   result; generated initializers recursively initialize the runtime imports.
3. Release the result and call `lean_io_mark_end_initialization()`.

The bridge creates a Lean String and transfers ownership to `ehr_step`, copies
the result into a caller-owned UTF-8 buffer, and decrements the Lean output
reference. The wrapper frees the copied buffer in `finally`. JSON `\u0000`
escapes round-trip; literal NUL in the boundary string is rejected because the
C ABI uses NUL-terminated UTF-8. Measured live heap excludes reserved linear
memory capacity.

After loading the built wrapper beside its `.mjs`/`.wasm` assets, React can keep
the returned object and use it in click handlers:

```js
import { loadEhr } from './ehr.js';
const ehr = await loadEhr();               // Once, asynchronously.
const output = ehr.step('{"counter":41}'); // Immediately returns a string.
const nextState = JSON.parse(output);
```

`loadEhr({ locateFile })` can override the WASM asset URL. Only loading is async;
there is no Asyncify, worker request, or backend call. All JSON and computation
run in Lean; C and JS only handle the string boundary and memory.

## Problems hit and fixes

- The critical Lean 4.35 initialization behavior is in the
  [C emitter](https://github.com/leanprover/lean4/blob/eb6cafb7290e8bd5f2937522d8d804f58f02bafc/src/Lean/Compiler/LCNF/EmitC.lean#L1019-L1030).
  New `module` files split runtime and meta initializers, but runtime modules
  using Lean still call full `lean_initialize()` unless their **module name**
  starts with `Lean`. Full initialization pulls in the kernel, elaborator, and
  whole Lean library. Naming these modules `Lean.WasmSpike`/`Lean.WasmInitOnly`
  lets the unmodified compiler emit the runtime-only call. A namespace alone is
  insufficient. The build explicitly rejects selected runtime initializers that
  still call full initialization. No fake `lean_initialize` is supplied.

- Runtime now requires C++20 (`bit_cast`, atomic wait/notify), unlike older prior
  art using C++17.
- Correct three upstream signatures in build-local copies: the Emscripten
  `lean_uv_os_get_group` stub needs its `uint64_t` argument; the two temp-file/dir
  functions must omit the erased IO world token. The pinned checkout is untouched.
  These three functions are stripped from the final build; no computational
  implementation is replaced. The script verifies exact source text before
  creating its patched copies.
- Lean's IO runtime still needs `uv.h` even in Emscripten mode. Pin libuv 1.52.1
  for headers; the only retained libuv function is error-text lookup, implemented
  using its public `UV_ERRNO_MAP` table. No networking/filesystem stubs are added.
- The native `leanc` sysroot lacks libc development headers. Compile the small
  POSIX line driver with host `cc -fPIC`, then link with `leanc` and its host libs.
- Git worktree index/ref writes require sandbox escalation because the metadata
  is under the main checkout. Only normal git metadata is touched there; all
  source changes and tooling remain inside this worktree. Push is working.
- npm's default cache is outside the writable worktree; the optional browser
  setup therefore uses `.tools/npm-cache`.

## What the main interpreter needs

The working runtime and JSON closure are reusable. Keep online executable
dependencies to Init, `Lean.Data.Json`, and pure EHR modules, without Mathlib,
source elaboration, filesystem/network calls, async tasks, or runtime `.olean`
loading.

1. Use Lean 4.35 `module` files for the runtime graph and separate metaprogramming
   imports. Handle the module-name constraint for **every** runtime module that
   uses Lean: either module paths under `Lean.Ehr.*` (definitions may remain in
   namespace `Ehr`), or a reviewed, targeted compiler/build change to emit
   runtime-only initialization for existing `Ehr.*` paths. A `Lean.*` wrapper
   cannot fix an imported `Ehr.*` initializer. This spike does not move the main
   project's files or patch that compiler behavior.
2. Generate matching C for the actual interpreter modules and their imports.
   Extend this driver's source map with project modules, or consume Lake's
   `.lake/build/ir` C and package-aware initializer names. The current driver
   targets the two standalone probes plus the stdlib; it is not yet a general
   Lake project builder. Generated definitions are still the native semantics.
3. Export tiny adapters to the same definitions used by the native CLI.
   `init`, `step`, `view`, and `facts` can each take a JSON envelope and return
   one JSON string. Preserve Lean's generated encoders/decoders; React paints
   the answer. The C bridge only gains corresponding declarations/exports.
4. Reuse this runtime configuration, ownership, and initialization order. Keep
   one initialized module per app instance and copy the built assets into the
   app's static files during build/install.
5. Expand native/WASM differential tests to thousands of real programs/click
   sequences, FHIR bundles, and safety regressions. Measure realistic payloads
   and first-click latency on target browsers. The 2,006-case spike comparison
   does not establish full interpreter equivalence or performance.

No spec, property, data-format type, or Comparator statement file was touched.
There are no spike proofs claiming more than the executable checks. As in the
brief, Lean's compiler, the C compiler, WASM engine, and boundary code are tested
parts of the trusted execution path. No option B fallback was needed.
