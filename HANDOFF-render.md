# Render lane handoff

Worktree `/home/saithat/Projects/VGI-render`, branch `lane/render`.
All render-owned implementation and proof tasks in the previous handoff are
complete. Cross-lane integration requests still outstanding are listed below;
none are silently treated as implemented.

## Completed and pushed

- `92fdc77`: preserve complete fixture entry.fullUrl (`urn:uuid:...`) as missing
  resource ids; use the Synthea identifier search token as stable Facts.patientId
  on both fixture and Medplum records. Add three handmade bundles, FHIR guards,
  inactive/error allergy and active/stopped/on-hold medication coverage,
  kg/lb/yesterday weights, BP components, ranges/interpretation and Display JSON
  round trips. Document the exact wristband payload and identity distinction.
- `8fd1388`: Init-only complete page renderer; all component kinds, field
  provenance/confirm/human-only/unit warnings, full allergy/medication rows,
  all requested info IDs and known canonical aliases, trends/growth SVGs,
  guard-driven buttons, groups/tabs, flow modal. Export ehr_render/ehr_facts and
  native ehr render / ehr facts / ehr render-screens. CLI writes PageNode JSON,
  HTML previews and fixed stylesheet, initial goTo/prefills, groups, complete
  tab combinations, and firing interruptive alert samples.
- `4329b13`: merge current lean-core record-source and episode-context support.
- `d804a79`: merge current content tests/spec corrections and preserve both
  lanes' change requests. Main and the content/core branches were fetched and
  merged; content still has no programs/canonical/v1.json.
- `b49ecbd`: T5, T10 and T11 proofs, nonvacuous Tiny/FHIR examples, #print axioms,
  proof-contract/audit tooling, native/WASM differential tests. Fix a real
  Lean 4.35 wasm32 runtime string/list mismatch using a structurally folded
  string reconstruction, proved equal to String.ofList. Rebuild/install WASM.

Proofs are in lean/Ehr/Render to respect ownership. No committed Render Lean
source has sorry, admit, new axioms or native_decide. TODO_PROOFS.md is updated.
The renderer draws the interpreter's shown items in its declared flat order;
view resolves ancestor/group/tab visibility once. Each item has a literal
label wrapper. Shell, info rows and modal acknowledgments have no comp id.
See docs/design/render.md for wire format, info IDs, trusted surface, digest
collision assumption, and the fixed stylesheet/DOM boundary.

## Verification

- `cd lean && lake build`: pass, 113 jobs including all proofs and guards.
- `cd lean && lake check`: pass; only propext, Quot.sound, Classical.choice.
- `python3 lean/Ehr/Render/check-proofs.py`: Comparator accepts all 15 main
  theorems. It generates a temporary proof-hole challenge in ignored .tools,
  with Contracts imported independently of the solution proofs. No holes are
  written into finished proof sources.
- Native/WASM differential test: all **174** Synthea bundles and **694**
  canonical page variants match, including stable patient/row ids and error
  envelopes. A canonical RN wristband scan also accepts exactly Facts.patientId
  and rejects an unrelated Medplum server id.
- Full canonical browser screen-check: **1,390 passed**, all 694 page variants
  at desktop and 390px, including the checker's concealment regression tests.
  Input came from JSON exports of the content lane's exact compiled spec/program
  under /tmp/vgi-render-api; the CLI file-path form was tested.
- **114 further browser checks passed**, covering Tiny's 13 variants plus all 43 expanded canonical
  screens for Alva Schmitt (active warfarin), including the final medication
  option/value and anticoagulant alias changes.
- App build passes; 78 app, 31 agent, 52 world unit tests pass. Agent/world
  typecheck and lint pass. App source/test lint passes with
  `pnpm --filter app lint --ignore-pattern 'public/ehr/**'`.
- Extended GenTS tested in a temporary copy of the core-owned generator:
  99 types / 19 samples, including Display/PageNode/FactsInput; generated TS
  type-checks. Rebuild `lake build gents` after core changes before this check,
  to avoid loading a stale Samples olean.

Repeatable commands:

```sh
cd lean
lake build
lake env lean --run Ehr/Render/ExportTests.lean /tmp/vgi-render-api
cd ..
node lean/Ehr/Render/test-wasm.mjs /tmp/vgi-render-api
python3 lean/Ehr/Render/check-proofs.py
lean/.lake/build/bin/ehr render-screens --spec v1 --program canonical \
  --fhir fixtures/synthea/Aaron_Ankunding_4966bd28.json --out /tmp/fresh-pages
PLAYWRIGHT_BROWSERS_PATH=/tmp/vgi-render-browser pnpm --filter app screen-check /tmp/fresh-pages/*.json
```

Today comes from fixtures/synthea/index.json or --today / --context. File
spec/program inputs work too. Use a fresh output directory. HTML previews
copy ehr.css when invoked from the repo root or lean directory.

WASM assets are built and installed in the gitignored app/public/ehr. The
available pinned SDK is linked read-only into local ignored .tools. Original
wasm/build-ehr.sh was run but has no tool-root override and clears EM_CACHE
while sourcing the SDK, then fails writing its read-only shared cache. The
successful equivalent build uses the same Python driver after sourcing the
SDK and setting EM_CACHE to the local copied writable cache:

```sh
source .tools/emsdk/emsdk_env.sh
export EM_CACHE="$PWD/.tools/emscripten-cache"
python3 wasm/build_ehr.py
wasm/install-into-app.sh
```

Logs/artifacts: /tmp/vgi-render-lean-build.log, /tmp/vgi-render-lake-check.log,
/tmp/vgi-render-comparator.log, /tmp/vgi-render-equivalence.log,
/tmp/vgi-render-final-screen-check.log, /tmp/vgi-render-targeted-screen-check.log,
/tmp/vgi-render-{app,agent,world}-tests.log; previews/page trees are in
/tmp/vgi-render-final-canonical, /tmp/vgi-render-anticoag, and
/tmp/vgi-render-final-tiny. Temporary type exports: /tmp/vgi-render-types.

## Exactly what is left

No render-owned implementation or unfinished proof remains. The following
other-lane requests are in docs/design/changes-requests.md:

1. **App lint integration (required):** plain pnpm --filter app lint currently
   scans installed, gitignored Emscripten public/ehr/ehr-interp.mjs and fails
   with 88 generated-code lint errors. App must ignore public/ehr/** while
   retaining all source/test boundary rules. Render did not edit app config.
2. **lean-core TS integration:** add Render.Types/Json/Fhir to the official
   GenTS sourceModules and regenerate published types. The extended generator
   was validated locally; the core-owned generator was not modified.
3. **Content artifact export:** publish programs/canonical/v1.json and spec
   JSON. They are still absent after merging content. The compiled canonical
   values and temporary exact JSON exports have been fully exercised.
4. **App/infra barcode integration:** when creating/decoding wristband barcodes,
   encode/pass the exact Synthea token `https://github.com/synthetichealth/synthea|<id>`
   from Facts.patientId, never Medplum's unrelated REST resource id. Rendered
   scan metadata and actual canonical RN interpreter acceptance are verified.
5. **Wasm toolchain/runtime integration:** support an external tools root and
   writable cache; fix/validate upstream wasm32 string_to_list_core's nil
   construction. Render's equivalent fold already avoids that runtime defect.
6. **Optional future exactness:** replace Nat digest data versions with exact
   String versions if the core owner chooses. Current collision assumption is
   explicit; this is not an unfinished T5 proof.
