# What is proved

[Overview](../README.md) · [Methods and reproduction](../README.md#documentation)

"Proved" means a Lean theorem checked by the kernel using only the standard
axioms (`propext`, `Classical.choice`, `Quot.sound`). The clinical statements are
cross-checked by Lean's Comparator (`make verify`). The protocol and experimental
UI-library theorems are kernel checked and are not yet in Comparator.

| Guarantee | Scope |
|---|---|
| No sign without its guard: required entries confirmed and human-entered where required, in the declared unit (lb never satisfies kg); reviews shown or covered by a valid receipt; interruptive alerts acknowledged; role allowed (`T0`, `T2`). | Every program, record and event sequence. |
| Macros and prefills never sign, acknowledge, create receipts or enter human-only values; a cosign names a second human (`T3`, `T6`). | Every program. |
| Alerts appear only when their condition holds; passive alerts never pop up (`A2`, `A4`). | Every program. |
| Checker acceptance implies 12 of 13 screen properties for every patient and reachable state (`accepted_*`). | Every accepted program. |
| Every required task stays completable (property 6). | Proved for restricted families; a kernel-proved finite-model certificate checker is available, but general program abstraction coverage remains open. For the V1–V3 rule sets the property is false as defined: `v1_payload_domain_not_satisfies` (and its V2/V3 forms, in the opt-in `EhrHeavy` target) refutes `Satisfies` for every program with a required commit, because completion ranges over records with no trusted payload. A [record-domain premise](design/property6-record-domain.md) awaits owner review. |
| The screen tree keeps the patient banner, required review content, honest buttons and modal interruptive alerts (`D1`–`D6`). | Every program and record. |
| Bed assignments are exclusive; scheduled doses are given at most once; critical results are resolved or escalated by a deadline. | Lean reducers and multi-actor models. |

The [commit protocol model](methods/commit-protocol.md#commit-protocol-methodology) adds new specifications
for owner review, outside the clinical Comparator catalog. Its executable
fine-grained transition system has unbounded kernel proofs for request effect
uniqueness, stable durable retries, guarded expected-version replacement,
refused-command isolation, shared bed/dose safety and shared/opaque-patient
projection agreement with the event log. A bounded explicit-state checker explores duplicate requests,
conflicting patients/resources, crashes, uncertain responses and retries.
These claims assume Postgres primary READ COMMITTED row/unique-key locking,
consistent initial imports, sole-writer access and atomic durable publication
of all touched events, projections and request outcomes. Cache safety is
conditional on the final native guard using the fresh locked snapshot;
a separate generic fold theorem proves cache/fresh agreement for fixed
version-bound inputs and consistent journals. Actual cached reconstruction,
external directory/time facts and clinical FHIR projections remain unproved.
Administrative ADT now has a separate executable protocol model using the actual
native reducer, with unbounded bed exclusivity, one-bed-per-patient, multi-stream
idempotency and event-fold proofs. Its new specifications need owner review;
[ADT evidence](audits/adt-model-20261107.md) distinguishes these proofs from
bounded lock checks and transaction-linearized host tests.
`COMMIT_PROTOCOL_TRACE` enables a structured test exporter for `Store.submit`;
`pnpm --filter @vgi/commit test:protocol` checks real Postgres traces against the
Lean machine, including rollback and a lost COMMIT reply. This is a
transaction-linearized refinement test, not a proof of the host implementation.
[Protocol evidence](audits/commit-model-20261106.md) records exact commands,
bounds and outcomes.

Not proved: host ADT/SQL/FHIR refinement, dynamic cache inputs, physical transport,
clinical completeness of the rules (including swap/cancellation), or the React painter,
browser, FHIR import mapping and storage projections (tested); the Node/SQL
wrapper, Postgres and authentication (integration-tested); the Lean compiler
and native clang (trusted); SHA-256 collision resistance (assumed); serialization
injectivity and native/WASM/host agreement (tested). WASM/Emscripten are untrusted
for displayed tree content: discrepancies refuse the next command. This does
not prove DOM pixels, CSS, browser behavior, what a person perceived, or clinical
actions outside a command. The AI agent is untrusted; only accepted programs deploy.

`UiScreen.canonical` (`lean/Ehr/Render/Json.lean`) defines `vgi-screen-v1:`:
null/booleans have single-byte tags; numbers end with `;`; strings carry UTF-8
byte lengths; arrays and objects carry entry counts, with object keys ordered
by Unicode scalar value. The derived `UiScreen` writer includes every painter
field, including the banner, modal, urgent strip and review content. The WASM
`ehr_screen_canonical` export serializes a supplied screen without re-rendering.
Native `ehr serve` exposes `screen-canonical` and `render-screen`; the latter
returns the native screen and its canonical bytes. SHA-256 belongs to the host.
Serialization injectivity is tested rather than proved.

Screen verification changes the certified clinical app and WASM/source bindings.
Certificates must bind the current native binary, app and packaged WASM;
recertification installs matching bindings and verifies strict replay.
[Screen-fingerprint evidence](audits/screen-fingerprint-20261106.md)
records the canonical corpus, request/retry tests and a short added-latency sample.
