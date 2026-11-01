# Content realism measurements

`complexity-before.json` and `complexity-after.json` use the existing benchmark suite, the actual interpreter and its certified minimum search. The before input is the vendor reference at the lane's starting revision; the after input is regenerated from this lane's Lean source. These files do not replace the frozen historical benchmark or any recorded run.

Reproduce the after measurement:

    LEAN_NUM_THREADS=8 pnpm complexity --release-root releases --out docs/measurements/content2/complexity-after.json

The command also records the native `ehr min-clicks` result and replayable click/keystroke paths. Bounds and search-space qualifications remain the ones reported by the existing measurement tool.
