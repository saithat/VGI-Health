# Structured clinical presentations

Lean emits a `presentation` node containing ordinary semantic children. The context selects the drawing of each info child; controls still dispatch their original Lean events. See [the stable contract](../../../../../docs/design/presentation-contract.md).

Tables preserve every column, duplicate cell and record. The MAR groups order metadata at left and uses Lean-projected hourly columns. Charts separate measures and units and use supplied values only for geometry; reference curves come from the payload. All chart data remain in the source table. Status tints decorate explicit supplied words and flags.

New FHIR lab views use the complete per-observation `Display.labResults` projection, preserving each value's own unit and metadata. Legacy Display inputs remain readable. Censored and qualitative values remain in the table and are not turned into numeric points. Panel components retain their own rows; no raw FHIR identifiers are shown.

The flowsheet example supplies the whole patient chart. Lean uses source observation categories to select nursing rows, retaining labs in Results and all components in Display. JSON rows from before the category addition remain readable. Note cards retain supplied import metadata but do not add empty optional metadata fields. Time-series point ordering changes only chart geometry; source table order remains intact.

The composed In Basket fixture uses a source group tagged `layout.columns`, with separate folder/list info children. Lean emits the columns; the painter gives that existing container a narrow folder rail and wide message pane. A regular group can also carry `present.<kind>` when a view needs both info and ordinary semantic controls.

For row actions, a regular source button uses `present.row|<info component ID>|<row index>` under a presentation group. Lean wraps that unchanged control in a semantic `rowAction`. The painter binds explicit targets to existing rows and leaves unmatched controls inline. The independent fidelity projection checks the resulting button ancestry and enabled state. `presentation-actions.spec.ts` clicks every example row action and return button through the real native interpreter; `check-wasm.mjs` checks those transitions against WASM.

Reproduce the fixtures from the repository root:

```sh
python3 scripts/presentations/fixtures.py
cd lean
LEAN_NUM_THREADS=4 LEAN_STACK_SIZE_KB=65536 lake env lean --run Ehr/Render/PresentationFixtures.lean
```

Then, from `app/`, with no build running:

```sh
EHR_PRESENT_SHOTS=1 APP_TEST_PORT=4387 pnpm exec playwright test presentation-review.spec.ts --project=desktop --workers=1
```

The source fixture generator is offline unless `--refresh-reference` is explicitly supplied or the committed CDC reference file is missing. Screenshots are local review artifacts in `app/shots/realism/present/`.

Use a lane-local output directory for the broader differential corpus; the shared `/tmp/vgi-render-api` default may contain another checkout's generated samples:

```sh
# From lean/:
LEAN_NUM_THREADS=4 LEAN_STACK_SIZE_KB=65536 lake env lean --run Ehr/Render/ExportTests.lean /tmp/vgi-present-render-api
# From the repository root, after make wasm:
node lean/Ehr/Render/test-wasm.mjs /tmp/vgi-present-render-api
node scripts/presentations/check-wasm.mjs
```

Review constrained desktop panels with `EHR_PRESENT_WIDTH=1024` or `1280` on the screenshot command; the default remains 1440×900. The review also rejects status words split across lines. Dense widgets respond to their actual container width, including when a chart sidebar consumes space.

For a wider real-world-data gate, run `python3 scripts/presentations/export-persona-matrix.py --check` from the repository root, after building the app and with no build running. It exports every native screen/tab/group/alert variant for all 15 certified persona/release combinations using representative World 2 task data. Byte-identical trees are checked once, then the unchanged gate validates coverage for every original file through its exact-tree/context cache. All output and receipts stay in `/tmp`.
