# Content handoff

The previous handoff and BRIEF 9a/9b content are complete. A later upstream
BRIEF revision added three rules: EPCS display and expanded vaccine records
are implemented; Schedule II zero-refill enforcement remains dependent on core.
There are no unfinished content proofs. The two concrete `Spec.Extends` proofs
use `decide`; `#print axioms` reports no axioms. Do not treat them as a proof of
the check lane's general T8 theorem.

## Exactly what remains

- **New Schedule II rule / seed 16: core constraint required, then content integration.**
  Add a generic per-line zero-quantity value constraint and actual
  `controlled-II` formulary tags. Content must then attach it to refills under
  `orderClass controlled-II`, add the blocked-runtime test for seed 16, and
  regenerate exports. `programs/bad/16-schedule-ii-refills.json` is exported
  now; it is not yet a demonstrated hard stop. Do not claim otherwise.

All requests, evidence and owners are in `docs/design/changes-requests.md`:

- **World albuterol reference:** one world consistency test fails because core
  now caps albuterol at 5 mg but world FORMULARY still says unspecified (0).
  Update the world reference to 50 tenths; keep the test and core cap intact.
- **World/app/sim vaccine data:** provide manufacturer, administering provider
  and VIS edition date for the new required vaccine entries.
- **CR-10, render/app/world:** populate the new `abxIndication` sign-summary
  and MAR panels with actual per-order/FHIR values. Content declares the
  fields and visible panels; an empty panel heading is not data fidelity.
- **CR-11, core/check:** generic terminology membership validation. Current
  coded values are checked for nonemptiness, not membership in the content
  lists (`abxIndicationCodes`, `curesExemptionCodes`).
- **CR-12, agent:** accept `requestPriorAuth` in its action schema. Actual
  exported v1.1/v2 programs currently fail agent parsing at the request
  buttons, despite all existing agent tests passing.
- **CR-13, world/app/sim:** supply `encounterKind: "preop"` for pre-op
  ordering. The temporary separate pre-op commit was replaced by ordinary
  `signOrders` with encounter-scoped safety requirements. Callers must provide
  the true episode kind. Core plumbing and positive/negative content tests pass.
- **Agent persona loading:** use `releases/<version>/personas/P1.json` …
  `P5.json` for deployment. `canonical.json` is the all-workflows source template;
  its mixed-role declarations are intentionally not a single-role certificate.
- **Check lane integration:** certify the real releases and reject all 16
  seeds (seed 16 awaits the constraint) using the production checker, preserving workflow-scoped passive
  targets, per-workflow enter-once, record-source constraints and v2's new
  requirements. Content's structural test predicates are regression oracles,
  not a soundness theorem for the checker.

## Validation / regeneration

`cd lean && lake build` passes all canonical, bad-program and release guards.
`lake exe export-content` exports all specs, canonical programs, seeds and
statistics; decoding round-trips every exported object. Regenerating to a fresh
root produces byte-identical artifacts. `ehr spec-export` registers v1/v1.1/v2.

App build/lint/tests pass (90 tests); agent typecheck/lint/tests pass (31).
World typecheck/lint pass; tests are 91/92, with the albuterol reference mismatch
below. For this worktree's writable pnpm store,
use `pnpm --config.store-dir=/tmp/vgi-content-pnpm-store --filter <pkg> run <script>`.

Comparator passes its 18 trusted core statements. `lake check` passes with only
`propext`, `Quot.sound`, and `Classical.choice`. Never run two Lake processes
concurrently.

Service-only prior auth (CR-9) is complete, with an imaging-only regression.
The release exports include fifteen role-specific canonicals, and the sixteen
seeds mutate role-authorized bases. All auto-linked copies use their exact
declared source.

Main content commits: `8b63640` (workflows/seeds/citations), `6a47bbe`
(releases/exports/scoping), `b366a59` (service prior auth, links, role exports).
Core merges: `febb477`, `8c7b3fe`, `30f8ee8`.

Core resolved Checker CR-6: content exposes the never-policy request field,
uses human entry, and verifies convenience clicks preserve it. New tests also
cover the EPCS no-receipt display rule and expanded vaccine record.
