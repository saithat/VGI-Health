# Native rule-conformance evaluation — 2026-11-01

195 scenarios were evaluated against all 15 current role canonicals and every
deployed revision in archived `run1-P3` (P3 rev 0–7).

| Inputs | Pass | Fail | Not applicable |
|---|---:|---:|---:|
| 15 current canonicals | 1,428 | 72 | 1,425 |
| 8 archived P3 revisions | 339 | 8 | 1,213 |
| All 23 inputs | **1,767** | **80** | **2,638** |

The [JSON](../runs/run1-P3/conformance.json) and
[scenario × revision table](../runs/run1-P3/conformance.md) contain every outcome.
The [canonical subset](results/canonical.json) comes from the same evaluations;
it is not a separate rerun. [Verification](results/verification.json) confirms
195 unique results per input, unchanged input hashes, and matching source values
for every result on an unmodified program.

The 80 failed cells represent five gap families, written up precisely in
[changes-requests.md](../docs/design/changes-requests.md):

| Gap | Failed cells | Evidence boundary |
|---|---:|---|
| CURES unknown exemption / over-seven-day surgical exemption | 18 | Runtime panel-suppression probes; the P1 v3 probe also passes the separate checker audit |
| Linked dosing weight confirmation / superseded source | 21 | Original accepted programs; signed 20 kg source with a confirmed 70 kg dependent copy |
| Mixed-patient FHIR allergy projection | 23 | Adapter probe; does not establish that the live loader supplies a mixed bundle |
| Empty medication episode can be signed | 12 | Original programs; stronger workflow expectation than the encoded vacuous per-line contract; no unsafe medication write established |
| Deny decision through the approval action omits denial reason | 6 | Original P1/P4 programs; actual mapper has a deny branch for this action |

Every `positive.*` scenario completed. Identity/scan/cosign, unit refusals,
naloxone, ordinary required entries/reviews, interruptive/passive alert handling,
human-only automation protections and release scenarios passed outside the
explicit failures above. The archived RN revisions all share the same adapter
probe failure, also present in the current RN canonicals; this evaluation found
no additional revision-specific failure family in those eight revisions.

The separate real [checker audit](results/certifications.json) accepted 15/15
canonicals. It was never an oracle for behavioral outcomes. Both original FNV
bindings match all eight archived certificates. Original archive specs/labels
(`v1.1` prior-auth, `v2` antibiotic release) were preserved and evaluated by the
current native executable, not substituted with today's releases.

The saved result retains the full 194-scenario batch and a disjoint, one-scenario
refill-bypass batch on identical program/spec/binary hashes. Every earlier
outcome was retained. Both batches are recorded in `evidenceBatches`; the current
CLI registers all 195 for subsequent single-command runs.

Validation: 16 suite/integrity/isolation tests and 16 dashboard/data tests passed;
agent/app TypeScript checks and the modified TypeScript lint checks passed. The
real dashboard HTTP summary advertises `conformance.json`, and its production
schema parses all 23 targets and all eight per-revision failure badges. No
browser was used for workflow evaluation. Patient-selection wiring, persistence
and browser painting remain separate integration boundaries. Reporting is
read-only and never gates deployment.
