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
