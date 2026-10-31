# Content handoff

Content-lane work requested in the previous handoff and BRIEF 9a/9b is complete.
There are no unfinished content proofs. The two concrete `Spec.Extends` proofs
use `decide`; `#print axioms` reports no axioms. Do not treat them as a proof of
the check lane's general T8 theorem.

## Exactly what remains (other lanes)

All requests, evidence and owners are in `docs/design/changes-requests.md`:

- **CR-9, core:** support a medical-service-only prior-auth slot. The present
  action requires a drug on the current slot; the medication demonstration
  anticipates a proposed drug rule, not CMS-0057-F's final services rule.
- **CR-10, render/app/world:** populate the new `abxIndication` sign-summary
  and MAR panels with actual per-order/FHIR values. Content declares the
  fields and visible panels; an empty panel heading is not data fidelity.
- **CR-11, core/check:** generic terminology membership validation. Current
  coded values are checked for nonemptiness, not membership in the content
  lists (`abxIndicationCodes`, `curesExemptionCodes`).
- **CR-12, agent:** accept `requestPriorAuth` in its action schema. Actual
  exported v1.1/v2 programs currently fail agent parsing at the four request
  buttons, despite all existing agent tests passing.
- **CR-13, world/app/sim:** supply `encounterKind: "preop"` for pre-op
  ordering. The temporary separate pre-op commit was replaced by ordinary
  `signOrders` with encounter-scoped safety requirements. Callers must provide
  the true episode kind. Core plumbing and positive/negative content tests pass.
- **Check lane integration:** certify the real releases and reject all 14
  seeds using the production checker, preserving workflow-scoped passive
  targets, per-workflow enter-once, record-source constraints and v2's new
  requirements. Content's structural test predicates are regression oracles,
  not a soundness theorem for the checker.

## Validation / regeneration

`cd lean && lake build` passes all canonical, bad-program and release guards.
`lake exe export-content` exports all specs, canonical programs, seeds and
statistics; decoding round-trips every exported object. Regenerating to a fresh
root produces byte-identical artifacts. `ehr spec-export` registers v1/v1.1/v2.

App build/lint/tests pass (78 tests); agent typecheck/lint/tests pass (31);
world typecheck/lint/tests pass (52). For this worktree's writable pnpm store,
use `pnpm --config.store-dir=/tmp/vgi-content-pnpm-store --filter <pkg> run <script>`.

Comparator passes its 18 trusted core statements. `lake check` passes with only
`propext`, `Quot.sound`, and `Classical.choice`. Never run two Lake processes
concurrently. One mistaken overlap during verification is recorded in the
conversation; both checks completed successfully.

Main content commits: `8b63640` (workflows/seeds/citations), `6a47bbe`
(releases/exports/scoping). Core merges: `febb477`, `8c7b3fe`.
