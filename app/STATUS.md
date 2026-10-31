# App lane status

Implementation in progress: renderer, chart shell, W1 fixtures, and tests.

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

Owner review: this lane adds the explicitly requested temporary data-format
mirrors; no Lean specs, properties, or Comparator statements are changed.
