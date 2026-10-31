# Content handoff

## Content-owned work remaining

**Nothing left.** The owner's CURES correction is complete in `58aac6f`: the
shared value set now uses `surgery-7-day`, replacing `surgery-5-day`, and the docstrings
state the nonrefillable seven-day limit and qualifying facility/procedure.
The other descriptions were checked against `docs/rules/ca-statutes.json`
and its cited official §11165.4(c) bulk text. Facility administration, the
general acute care hospital ED, terminally ill hospice patients and the
timely-access exception now have precise statutory conditions. The separate
ED buprenorphine branch and other unmodeled cases remain explicitly outside
the documented subset. No guard or safety property was weakened.

Human composer-event regressions cover the corrected code in all three
releases. `ehr cures-exemptions-export` generates the actual shared list at
`releases/cures-exemptions.json`; existing spec exports contain only its
value-set name. Membership and exemption eligibility are still core/check
work in CR-11, not guarantees supplied by these content exports.

Main `95c7c21` was fetched and merged first. It includes the earlier Schedule
II/source-label work (`ec31352`) and world's matching Schedule II class tags.

- `scheduleIIRefillsEntry signOrders` adds a per-line `refills` requirement
  under `.drugClass "scheduleII"`, with `allowed? := some ["0"]`. No prior
  requirement was removed. v1.1/v2 inherit it unchanged. Core's actual class
  spelling is `scheduleII`, not the earlier requested `controlled-II`.
- Seed 16 confirms its default of three on an otherwise complete controlled
  order. The guard blocks signing. Its sign screen has no correction route;
  tests check the absent navigation and ignored out-of-screen entry. Restoring
  canonical navigation permits a human correction to zero. Mixed-line,
  new-line-stop, Schedule III/IV exclusion and release-inheritance tests pass.
- EPCS remains a `shownOnCommit` review with no receipt or waiver, factored as
  `controlledRxReview`. Seed 15 blocks even after an actual interpreter-created
  order-summary receipt. Expanding the sign-screen details repairs the display.
  Interpreter macro-signing prohibition and its T3/T6 basis are cited.
- Vaccine manufacturer, lot, administering provider, VIS-given attestation and
  VIS edition date are required before recording. Omission/false-VIS tests
  block. The edition date is now correctly classified as compliance, not an
  optional accidental prompt. VIS labels specify before vaccination.
- All 250 spec docstrings have the owner's source-class labels. Existing scans
  are Entrenched (Leapfrog BCMA); two identifiers are Entrenched (Joint
  Commission NPG.01.01.01). Re-entry, second-nurse checks, kg-only weight and
  v2 indication remain hospital policy. No new guidance/accreditation rules.
- Citations, release notes, generated statistics, all release/persona exports
  and permanent seeds are current. No unfinished content proofs. Both concrete
  `Spec.Extends` proofs still use `decide`; `#print axioms` reports no axioms.
  They are not the check lane's general T8 theorem.

## Exactly what remains in other lanes

Requests and evidence are in `docs/design/changes-requests.md`.

- **Agent:** accept `When.drugClass`, preserve `EntryReq.allowed`, and accept
  `Action.requestPriorAuth` (CR-12). Current exported specs fail parsing at
  `entries[16].when`; v1.1/v2 programs fail on request buttons, despite all
  existing agent tests passing. Round-trip actual release/persona exports.
- **Render/app:** populate `orderSummary` with actual patient, drug, dose,
  quantity, directions and refills (CR-14). Merged renderer currently falls
  back to an empty-content message. Also populate actual per-order/FHIR
  `abxIndication` sign/MAR data (CR-10). Visibility alone is not data fidelity.
- **World/app/sim:** supply vaccine inventory manufacturer, provider and VIS
  edition date, and complete statutory dates/provider details in FHIR writes.
  The captured flag is an attestation, not proof of actual VIS delivery timing.
  Manual provider entry is supported; no unsupported auto-link was invented.
- **World/app/sim:** pass true `encounterKind: "preop"` for pre-op episodes
  (CR-13), so ordinary `signOrders` enforces consent, H&P and anticoagulants.
- **Core/check:** terminology membership and statutory exemption eligibility
  (CR-11); nonempty codes alone do not prove membership in `abxIndicationCodes`
  or `curesExemptionCodes`. Validate procedure/facility, directed supply, no
  refills, terminal illness and alternate-user availability where applicable.
  The shared CURES export is content data, not a validated waiver predicate.
- **Check:** certify the fifteen real persona canonicals and reject all sixteen
  seeds with replayable counterexamples/required semantic lemmas, preserving
  workflow-scoped passive targets, enter-once, record-source constraints and
  allowed values. No production checker exists in this merged worktree.
  Content regression predicates are not a checker soundness theorem.
- **WASM/app:** rebuild the interpreter assets with the allowed-value guard;
  test native/WASM and rendered hard stops for nonzero and mixed-line refills.
- **Controlled refill adapter boundary:** W7's separate `approveRefill`
  decision uses `refillRefills` and `medToGive`, not signing order lines. The
  new per-line rule does not certify that separate decision. An adapter that
  creates a modified controlled prescription must route through `signOrders`
  or request an explicit equivalent rule; do not claim full refill compliance.

Deployment uses `releases/<version>/personas/P1.json` … `P5.json`, matching the
role; `canonical.json` is an all-workflows authoring template, not a certificate.

## Validation

- `cd lean && lake build`: passes canonical, all sixteen seed, and release guards.
- `lake check`: passes; permitted axioms only (`propext`, `Quot.sound`,
  `Classical.choice`), rerun after the CURES correction.
- `lake comparator`: passes all eighteen frozen statements.
- `lake exe export-content`: every object round-trips in Lean. A fresh export
  root produces 39 byte-identical files. Native `ehr spec-export` matches all
  three saved specs and their exact zero-refill constraint. The separate shared
  CURES code export matches native output byte for byte and contains the five
  corrected codes. Its CLI rejects extra arguments.
- Source-label audit: all 250 spec docstrings labeled; `git diff --check` clean.
- App build/lint/tests: pass (90 tests).
- Agent typecheck/lint/tests: pass (31 tests); actual-export schema gaps above.
- World build/lint/tests: pass (92 tests); main resolved the prior missing
  Schedule II class tags and full-formulary equality failure.

For the writable pnpm store use
`pnpm --config.store-dir=/tmp/vgi-content-pnpm-store --filter <pkg> run <script>`.
Never run two Lake processes at once. Do not weaken rules/tests to fix an
owning-lane integration mismatch.
