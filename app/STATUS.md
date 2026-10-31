# App lane status

Implemented: strict Vite/React 18 workspace; flat ESLint restrictions and a
tested network boundary; Medplum sign-in; P1–P5 development persona selector;
temporary Lean-shaped JSON types/validators and the `Interp` seam; navigation-only
mock; all catalog/field renderers; dense chart shell; all eight InfoId adapters;
multi-year synthetic chart and W1 rooming/documentation/orders/sign fixtures.

Validation includes randomized ScreenView inclusion/order fidelity, catalog
exhaustiveness, every field/InfoId kind, full-shell interactions, modal ack,
blocked-button tooltips, JSON rejection, paginated Medplum loading, and offline
fallback. Run build, lint, and tests with the commands in README.md.

Integration dependencies (explicitly outside this temporary shell):

- Replace `src/core/types.ts` with Lean-generated types and validators. The
  design note does not name ItemView binding fields; reconcile `bound`,
  `pendingConfirm`, and `alertActive` with the first generated export.
- Replace `createMockInterp` with Lean WASM. The mock only navigates, expands,
  selects tabs, and stores values. It never confirms, signs, writes FHIR,
  evaluates alerts/guards, issues receipts, or executes macros.
- Real deployed programs/certificates and workflow specs arrive from the other
  lanes. This app labels the fixture as an uncertified development preview.
- Medplum authentication needs a local OAuth client and synthetic patient ID;
  the default chart works offline without either.

Verification limits:

- Browser screenshot review was unavailable because the browser access host
  could not be reached. DOM interaction tests pass; visual review remains.
- Live authenticated Medplum has not been exercised with server credentials in
  this worktree. Data-boundary tests cover pagination, queries, invalid data,
  and backend failure with a mocked SDK.
- Growth renders recorded height/weight series; no percentile reference data
  has been supplied. Connected-chart code status, isolation and care-gap/flag
  metadata remain explicitly unknown; the offline sample includes these labels.

Owner review: this lane adds the explicitly requested temporary data-format
mirrors; no Lean specs, properties, or Comparator statements are changed.
