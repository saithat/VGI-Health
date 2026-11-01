# Render lane handoff

Worktree `/home/saithat/Projects/VGI-render`, branch `lane/render`.
Merged `origin/main` at `cd60f62` before implementing section 10. Integrated the
app owner's `f810f92` afterward, without editing app implementation or tests.

## Completed and pushed

- `0cfefc2`: Init-only UiNode/UiScreen exactly as section 10, JSON instances,
  generated TypeScript types, renderUi/ehr_render_ui, native render-ui,
  render-screens --ui, decidable NavSane, and real adult P1 JSON samples.
- `1c8c35d`: D1/D2/D3/D4/D6 and semantic T10/T11, FHIR-to-UiScreen completeness,
  satisfiable examples, axiom audits, Comparator registration, complete missing
  required reviews, and latest-vitals sidebar.
- `74a8457`: rebuilt/installed WASM and semantic differential/fidelity checks.
- `8d20481`: merged the app owner's semantic painter, ARIA gate, and catalog fix.
- `a40d97d`: preserves specialized field kinds/formulary options and emits
  allergy/code-status banner fields; rebuilds assets and refreshes P1 samples.

No Core/Specs/Canonical/Props/Check code was edited. The explicitly allowed
minimal GenTS change adds Render.Json/Fhir source modules and fail-fast checks
for UiNode/UiScreen/FactsInput; regenerated output has 141 types and 40 samples. Main.lean
only gains the additional renderer CLI match arm. Changes to data formats are
exactly the owner-requested UiNode/UiScreen additions. All additional render
conventions are recorded in docs/design/changes.md and render.md.

The interpreter owns visibility, flags, and enabled actions. Every shown item
survives nesting, including duplicates, malformed orphans/order/cycles. Missing
applicable review info on a shown commit screen is appended read-only with all
rows; interpreter state and guards never change. The side column has actual
allergies, current meds, problems, and latest vitals. Workspace info has all rows.
No serialized payload/debug/transport objects are displayed by the semantic API.

Contract details:
- One banner field, first in AppShell, contains name/DOB/MRN and clinical fields.
  Missing identifiers stay empty; the renderer cannot invent source identifiers.
  JSON key order is not layout. Code status comes from Facts.record's codeStatus
  value, otherwise explicit Not recorded; full code is never assumed.
- Read-only side/safety info uses empty comp IDs and dispatches no events.
  Hidden-id T10 applies to nonempty component IDs. The component forest itself
  has an exact shown-item/node equivalence for every input.
- Group-toggle role uses Event.click (Core toggles clicked group headers).
  Confirm/ack roles use Event.confirm/Event.ack. There is no Event.toggle.
- Field kind strings preserve identity/scan/cosign; code:<choice>|<choice>...
  carries the existing Lean formulary. No new UiNode fields were introduced.
- Tab labels retain actual indexes; only selected tab bodies are emitted.

## Verification

- `cd lean && lake build`: pass, 153 jobs, all examples/guards included.
- `cd lean && lake check`: pass, only propext, Quot.sound, Classical.choice.
- `python3 lean/Ehr/Render/check-proofs.py`: pass, **33** main theorems, including
  **18** semantic theorems. Challenge holes exist only in ignored temporary
  Comparator inputs. Finished render sources have no sorry/admit/new axioms or
  native_decide.
- Standard `wasm/build-ehr.sh && wasm/install-into-app.sh`: pass with the existing
  .tools SDK links. No build-script or runtime edit needed. Final WASM is
  **1,993,306 bytes**, with ehr_render_ui and all previous exports.
- `node scripts/wasm-assets.mjs --write && make wasm-check`: pass.
- A complete sequential native/WASM run passed **174** Synthea bundles and
  **2,046** canonical HTML + semantic variants, including exact component
  multiplicity, flags, confirmations, navigation, summaries, error envelopes,
  and actual canonical RN wristband acceptance/rejection.
- Final follow-up differential run: **pass**. All four shards completed; their
  reports cover all **2,046** case indexes exactly once with no overlap and one
  current WASM hash. Each also passed all **174** facts projections and the
  actual RN scan/error regressions. Coverage audit: /tmp/render-final-coverage.log.
- `render-screens --ui` emits **2,046** actual P1 release variants. The committed
  rooming/orders/sign samples for adult Aaron Ankunding match final WASM exactly.
  Supplied code status and a real Synthea allergy banner also pass.
- App build/lint and **124** unit tests pass on the final WASM. The earlier
  16-vs-24 catalog failure is resolved by the app owner's source fix.
- **8** desktop/narrow ARIA/visibility/legibility/hit-testing checks pass on the
  final three P1 samples, including regression checks that detect bad painting.
- Generated **141** types plus all **40** generated JSON samples pass strict tsc.
  The final GenTS-only rebuild preserves the exact tested WASM bytes; its source
  manifest is refreshed and make wasm-check passes.
- Agent typecheck/lint and **31** tests pass. World build/lint and **92** tests pass.

Final logs: `/tmp/render-final-{build,lake-check,comparator,wasm-build}.log`,
`/tmp/render-final-shard-{0,1,2,3}.log`, `/tmp/render-ui-aria-final.log`,
`/tmp/render-app-{build,lint,tests}-complete.log`. API inputs are in
`/tmp/render-ui-api`; current P1 variants are in `/tmp/render-ui-p1-complete`.

Repeatable commands (never overlap Lake processes):

```sh
cd lean
lake build
lake env lean --run Ehr/Render/ExportTests.lean /tmp/render-ui-api
cd ..
node lean/Ehr/Render/test-wasm.mjs /tmp/render-ui-api
python3 lean/Ehr/Render/check-proofs.py
make wasm-check
PLAYWRIGHT_BROWSERS_PATH=/tmp/vgi-render-browser pnpm --filter app screen-check --ui app/src/fixtures/ui/w1*.json
```

For faster differential runs, invoke the same Node script with
EHR_RENDER_SHARD_COUNT=4 and EHR_RENDER_SHARD_INDEX=0,1,2,3 in four processes,
with a distinct EHR_RENDER_SHARD_REPORT=/tmp/<name>.json. Each shard checks all
174 facts projections, its exact partition of screen cases, and the RN scan/error
regressions. Aggregate stateIndices and assert they cover every index exactly
once and all reports have the same wasmSha256. No shard runs Lake.

## Exactly what is left

No render-owned implementation or unfinished proof remains. Cross-lane requests
remain explicitly tracked in docs/design/changes-requests.md:

1. **Checker/content:** wire NavSane into certification and address P1's genuine
   D5 failure: W1 has 14 entries, W3 17, W6 18, versus a limit of 12 per group.
   All labels are unique. The actual release JSON #eval reports false. No screen
   is truncated and no rule is weakened.
2. **Lean-core/app:** supply an interpreter navigation Event/envelope for nav
   and stepper destination screen IDs. App currently shows an overview and uses
   actual workspace goto-component buttons for navigation. Renderer must not
   invent component IDs or interpreter transitions.
3. **Content:** replace legal source-authoring instructions in component labels
   with intended clinician-facing text. Render preserves what the interpreter
   says and must not fabricate regulatory text or modify content-owned specs.
4. **App/infra:** the previous wristband request remains: encode/pass the exact
   Facts.patientId Synthea search token, not a Medplum REST resource ID. Actual
   native/WASM interpreter acceptance and rejection are verified.

Previous handoff items now resolved: generated-code app lint exclusion, official
Render GenTS export, committed spec/program artifacts, standard WASM build,
catalog test count, generated UI types in the painter, read-only empty info IDs,
and explicit confirm/ack handling. The existing structural string fold still
avoids the documented upstream wasm32 issue and is proved equal to String.ofList.
Exact-string data versions remain an optional future core decision, not an
unfinished render proof.
