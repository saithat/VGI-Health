# Structured clinical presentations

Lean emits a `presentation` node containing ordinary semantic children. The context selects the drawing of each info child; controls still dispatch their original Lean events. See [the stable contract](../../../../../docs/design/presentation-contract.md).

Tables preserve every column, duplicate cell and record. The MAR groups order metadata at left and uses Lean-projected hourly columns. Charts separate measures and units and use supplied values only for geometry; reference curves come from the payload. All chart data remain in the source table. Status tints decorate explicit supplied words and flags.

The composed In Basket fixture uses a source group tagged `layout.columns`, with separate folder/list info children. Lean emits the columns; the painter gives that existing container a narrow folder rail and wide message pane. A regular group can also carry `present.<kind>` when a view needs both info and ordinary semantic controls.

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
