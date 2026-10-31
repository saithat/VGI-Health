# Lean 4.35 → browser WASM

From the repository root:

```sh
wasm/setup.sh
wasm/build.sh
node wasm/test/node-test.mjs
node wasm/test/node-test.mjs --init
python3 -m http.server 8087 --bind 127.0.0.1
```

Open http://127.0.0.1:8087/wasm/test/index.html.

The build emits `dist/ehr.mjs`, `ehr.wasm`, and the `ehr.js` wrapper. Await
`loadEhr()` once; subsequent `ehr.step(jsonString)` calls return synchronously.
The Init-only comparison is `ehr-init.mjs` / `ehr-init.wasm`.

See [the spike report](../docs/design/wasm-spike.md) for exact pins, measured
sizes/latency, native equivalence tests, memory ownership, and the Lean 4.35
runtime-initializer constraint that the main interpreter must handle.

## Real interpreter integration

```sh
make wasm                         # real Ehr.Api → wasm/dist + app/public/ehr
node wasm/test/equivalence.mjs     # 2,048+ seeded native run-batch cases
node wasm/test/benchmark.mjs
```

Import `loadWasmInterp` from `app/src/core/wasmInterp.ts` to obtain the app's
synchronous `Interp` after asynchronous loading. Only this new adapter file is
owned by this lane; select it in app startup separately. For direct envelope use,
import `loadEhrInterp` from `wasm/dist/interp-loader.mjs`. It exposes `init`,
`step`, `view`, and `call(exportName, envelopeJson)`.

API roots and runtime dependencies are discovered automatically. Additional roots
can be selected with `wasm/build-ehr.sh --api-module Ehr.OtherApi`. Rebuild when
new one-string facts/render exports land; unavailable exports fail explicitly.
Canonical artifacts, when present at their standard paths, are automatically
included in equivalence tests and used for the benchmark. See the report's
**Integration** section for current results and outstanding upstream capabilities.
