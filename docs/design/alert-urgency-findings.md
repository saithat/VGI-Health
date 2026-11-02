# Alert policy verification and canonical findings

Run date: 2026-11-02. Urgency classification: **pending owner review**.
The [policy](alert-urgency.md) documents source authority, exact constants,
proof assumptions and measured limits. No canonical program, clinical painter,
threshold or existing clinical specification was changed to obtain a pass.

## Inputs and scope

The audit uses the tracked `releases/v1`, `v2`, `v3` specs and canonical templates,
and the five role-specific candidates in each release. The templates contain
48 screens covering W1–W7; they are authoring sources, not role-safe deployments.
All 15 persona candidates pass the existing native checker against their release
canonical. Checking the all-workflow template directly as a physician instead
reports `writesOnly` for RN-only wristband fields, as expected from its documented
role as an authoring template.

Fixtures are the ignored Synthea index's first allergic adult
(`Arthur_Reynolds_a9b473ca.json`, also surgical) and first pediatric patient
(`Abdul_Sauer_d0fe99e5.json`), with the fixture reference date **2026-10-31**.
Templates use both patients. Persona candidates use the pediatric fixture for P4
and the allergic adult for P1/P2/P3/P5, with each candidate's declared user role.
This is representative data coverage, not exhaustive patient/clinical coverage.

Native `render-screens` exports initial, expanded, individual-group, tab
combination and condition-true interruptive popup variants. Popup probes directly
set `popup?`; the exporter does not prove that every popup is reachable by an
interpreter event trace on that particular screen. It does not enumerate all
possible clinical captures/events. Template audit: **4,806 exports, 1,820
unique trees**. Persona audit: **3,612 exports, 1,290 unique trees**.
Each physical matrix has five required desktop/tablet widths,
two reflow equivalents and two text-resize cases; forced modal-free background
probes are separately marked. Every exact export is mapped to its measured tree
in `exports.json`; byte-identical trees share measurements. No failed batch mints
passing screen-cache receipts.

## Results

The complete numerical results will be entered after both bounded browser batches finish.

## Verification commands

Commands run from the repository root unless the command changes into `lean`.
Environment for all runs:

```sh
export TMPDIR=/home/saithat/Projects/run-tmp LEAN_NUM_THREADS=4
```

| Command | Result |
|---|---|
| `(cd lean && lake build)` | Pass, 405 build jobs; existing repository lints are warnings. |
| `(cd lean && lake check)` | Pass: default kernel accepts the solution. |
| `(cd lean && lake comparator)` | Pass: default kernel accepts the solution; all original challenge statements unchanged. |
| `(cd lean && lake env lean --run Ehr/Sem/ExportPolicy.lean) > "$TMPDIR/policy-regenerated.json"` followed by `cmp docs/design/alert-urgency.json "$TMPDIR/policy-regenerated.json"` | Pass; checked-in policy is the exact Lean export. |
| `pnpm --filter app exec tsc --noEmit` | Pass. |
| `pnpm --filter app exec eslint e2e/ui-check.spec.ts scripts/screen-check.mjs` | Pass. |
| `pnpm --filter app build` | Pass. |
| `APP_TEST_PORT=4217 pnpm --filter app exec playwright test ui-check.spec.ts --project desktop --workers 2 --grep 'physical gate detects\|urgency gate rejects'` | 2 passed; malicious target dimensions, text/boundary contrast, viewport displacement and modal occlusion detected. |
| `pnpm --filter app test --maxWorkers=2 tests/screen-cache.test.js` | 1 passed; whole-batch/exact-context receipt behavior retained. |
| `make wasm` | Pass; rebuilt API roots `Ehr.Api`, `Ehr.Render.Api`. |
| `make wasm-check` | Pass; all-source manifest current. |
| `git diff --check` | Pass. |
| `lean/.lake/build/bin/ehr check --spec releases/v1/spec.json --program releases/v1/canonical.json --canonical releases/v1/canonical.json` | Expected authoring-template rejection: `writesOnly`, physician role cannot enter RN wristband fields. All 15 role projections pass as shown below. |

Native release candidate checks (15 passed):

```sh
for version in v1 v2 v3; do
  for persona in P1 P2 P3 P4 P5; do
    lean/.lake/build/bin/ehr check \
      --spec "releases/$version/spec.json" \
      --program "releases/$version/personas/$persona.json" \
      --canonical "releases/$version/canonical.json"
  done
done
```

New theorem axiom output from the build:

| Theorem | Axioms |
|---|---|
| `Specs.AlertUrgency.coverage` | `propext` |
| `Sem.pinned_perception` | none |
| `Sem.render_modal_continuous` | `propext`, `Classical.choice`, `Quot.sound` |
| `Sem.render_inline_continuous` | `propext`, `Classical.choice`, `Quot.sound` |
| `Sem.render_continuous_urgency` | `propext`, `Classical.choice`, `Quot.sound` |
| `Sem.continuous_initial` | `propext`, `Classical.choice`, `Quot.sound` |
| `Sem.UrgencyExamples.initial_is_insufficient` | `propext`, `Quot.sound` |

`#print axioms` is present next to each new theorem. No new axiom, `sorry`,
`admit` or `native_decide` was added. Existing Specs/Props/Statements definitions
and comparator configuration were preserved.

## Build binding and remaining work

The new policy/proof modules are outside the WASM API runtime dependency graph.
`make wasm` refreshed the all-Lean-source binding in `app/public/ehr/manifest.json`.
All four executable/loader WASM asset hashes are byte-identical to the pre-change
commit `765bdaee2a5f245d6fc2ce340f67a87b7399a844`.
The measured app build hash before and after is unchanged:
`e6a82b5e0a9d2d30d51859976efeac5103880dfe94f7d77942f9c66a6c0fd60a`.
The gate-source and policy cache fingerprints change. No recorded certificate
was rebound, and no release was published or pushed.

Full actual-browser continuous perception remains open: missing presentations,
post-acknowledgment active conditions, navigation, unrelated modal occlusion,
unsampled focus/zoom states and complex paint need further work. Fixed thresholds
and representative browser samples do not establish full WCAG conformance or
clinical/legal completeness. No UI repairs were made because this lane was asked
to report canonical violations. Live Medplum/conformance and unrelated app suites
were not rerun for native-only policy data and test-gate changes.

Owner review remains for all tier assignments, clinical resolution/escalation
semantics, the minor-interaction label/coarse-trigger mismatch, and whether to
add an actual critical-result alert with delivery/escalation obligations. A
`CLAUDE.md` was absent from this worktree; the supplied owner rules and README
were used instead.
