# Cross-lane change requests

## Render → lean-core: generated TypeScript (2026-10-31)

Please add `Ehr.Render.Types`, `Ehr.Render.Json`, and `Ehr.Render.Fhir` to
`sourceModules` in `lean/Ehr/Tools/GenTS.lean`, then regenerate. Display,
PageNode, RenderInput, FactsInput/FactsOutput are now public wire types.
Render will test the generator in a temporary copy without editing your file.

## Render → wasm: external toolchain path (2026-10-31)

`wasm/build-ehr.sh` and `wasm/build.py` hardcode `.tools/{emsdk,lean4,libuv}`;
there is no supported environment override. Please add one (e.g.
`VGI_TOOLS_DIR`), including the Python paths. The available pinned toolchains
are in `/home/saithat/Projects/VGI-wasm/.tools`. For this lane's rebuild we
use local ignored symlinks under `.tools` pointing to those read-only inputs.

## Render → app / infra: patient identity and wristbands (2026-10-31)

`Facts.patientId` is the **identifier search token**
`https://github.com/synthetichealth/synthea|<identifier.value>` for Synthea
patients, on both fixture and Medplum records. Medplum's server id is only a
REST resource address; never put it in a Synthea wristband. The interpreter's
`scanMatches facts "wristband" code` requires exact equality to
`Facts.patientId`. Please encode this token in QR/barcode generation and pass
the decoded string unchanged as `Value.code`. The renderer's scan fields emit
`data-value-kind=code`; they do not prefill a human-only scan.
For patients without a Synthea identifier, the payload is resource.id (or
entry.fullUrl for an id-less fixture). Resource row IDs use resource.id, falling
back to the **entire** entry.fullUrl, including `urn:uuid:`.

## Render → lean-core: exact data versions (2026-10-31)

Consider String data versions rather than Nat: Medplum meta.versionId values
are UUIDs. Current facts use a deterministic 52-bit digest of sorted
id@versionId keys, which assumes no collisions. This is documented, not an
exact guarantee that every edit changes the version.

## Render → content: canonical JSON export (2026-10-31)

After merging origin/lane/content, programs/canonical/v1.json is absent.
Please export the compiled Ehr.Canonical.canonicalV1 there, plus spec v1 JSON.
The render CLI accepts --spec v1 --program canonical for the same compiled
values, and also accepts file paths for testing the exported wire values.
# Content lane requests and integration status

These requests preserve BRIEF 5a's scope and safety rules. Content does not edit Core.

- **CR-1 — earlier order lines: integrated (`2637308`).** Core blocks advancing
  an incomplete current drug line. Fixed rows 10+ still let humans confirm
  every order-set value. An explicit earlier-line selector would improve editing
  and recovery, but is not needed to complete the canonical paths.
- **CR-2 — `ElementSpec.recordFact? : Option String`: pending.** A
  `recordConfirm` prefill must use its declared fact. `weight` declares
  `weightToday`, never `weightYesterday`. Seed 6 otherwise accepts yesterday's
  kg value after confirm. Reject wrong sources generically at prefill and
  certification; do not special-case a seed. Core must retain unit checks.
- **CR-3 — `When.encounter "preop"`: pending.** Scope consent, H&P update,
  meds-to-hold and anticoagulant review to pre-op `signOrders`. The separate
  `signPreOpOrders` compatibility commit currently duplicates signing rules.
  Consent before pre-op orders is our stricter policy, not the legal deadline.
- **CR-4 — `When.weightBased`: pending.** Scope dose-check review to orders
  whose formulary drug has a mg/kg range. The current `.always` is a stricter
  temporary workaround. Do not weaken kg validation or dose checking.
- **CR-5 — alert click semantics: pending.** A human click should open a firing
  alert, never acknowledge it implicitly; a macro must not acknowledge or
  override. Seeds 4/9 cover unsafe macro attempts. Current alert clicks are ignored.
- **CR-6 — passive alert placement.** `AlertSpec.screens` names canonical screen
  IDs. Workflow-level placement would survive redesigns better; checker lane
  should preserve the declared placement until the model supports this.
- **CR-7 — enter-once scope.** Count an element once per workflow path, or
  ignore an already-captured value. The same `drug` binding across W1/W3/W5/W6
  is intentional; it is not a repeated prompt within one episode.
- **CR-8 — home shell.** `Screen.workflow = "shell"` on `home`; it is a shared
  navigator, not an eighth clinical workflow.

## Content representation correction

`prn` and `substitution` are required **decisions**, with both yes and no valid.
They now use `.coded "boolean"`. Core's `.flag` is a checked acknowledgment:
`valueSatisfies .flag (.flag false)` is false. Keeping these decisions as flags
made every scheduled order in the canonical sets unsignable. This does not
remove either entry requirement or any human confirmation. Consent, VIS,
protocol checks and education remain checked flags.

## Render → wasm: Lean 4.35 wasm32 string-list terminator (2026-10-31)

Valid ehr_facts crashed even on a Patient-only Bundle. Debug stack traces
identified lean_string_mk called by Fhir.sub. In the pinned runtime
src/runtime/object.cpp, string_to_list_core initializes its List.nil with
`lean_box_uint32(0)`; wasm32 lean_box_uint32 allocates a constructor, whereas
lean_string_mk traverses until lean_is_scalar. It therefore reads beyond the
nil object (OOB or bad_alloc). Native 64-bit boxes UInt32 as a scalar, masking
the bug. Please fix/validate the wasm32 runtime input upstream in your lane.
Render uses a structural List.foldl String.push reconstruction for sub/initials
instead of String.ofList; this preserves the source semantics and avoids the
mismatched runtime primitive. Other lanes using String.ofList after toList
should be regression-tested on valid data too.

## Render → app: generated WASM assets and lint (2026-10-31)

After the required wasm/install-into-app.sh, plain `pnpm --filter app lint`
scans gitignored generated public/ehr/ehr-interp.mjs and reports 88 vendor-code
errors (including Emscripten's fetch implementation). Please ignore
`public/ehr/**` in app/eslint.config.js, keeping all source/test boundary
checks unchanged. `pnpm --filter app lint --ignore-pattern 'public/ehr/**'`
passes; app build and all unit tests also pass. Render cannot edit app-owned
configuration. Installed assets are retained for actual runtime verification.
