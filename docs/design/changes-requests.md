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
