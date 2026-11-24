# Trusted-base review reduction

Spec review now defaults to the trusted base computed by Lean. It retains the
source flags and provides separate counts and filters for proven lemmas and
uncovered code. The page also opens without a recording. The committed catalog
is generated, and the proof-map CI job rejects stale output. [Generation and
class definitions](../methods/spec-review.md).

| Measure | Before | After |
|---|---:|---:|
| Flagged items | 1,477 | 1,461 |
| Trusted-base declarations, including compiler declarations | 5,066 | 5,046 |
| Flagged trusted-base items | 216 | 204 |
| Flagged trusted-base source lines, excluding theorem proofs | 1,593 | 1,629 |
| Proven lemmas outside the closure | 637 | 633 |
| Uncovered code or types | 624 | 624 |
| Canonical audited/Comparator roots | 99 | 101 |

Both columns use the same traversal, including roots, definition bodies and
constructor field types. The final audit also covers the existing
`accepted_actionableEntries` and `accepted_clinicalScenarios` headline guarantees;
these are added to the existing canonical audit, rather than a separate root
list. Counts include generated constructors, projections and helpers, which
are traversed even when they have no independent source item. Before counts
were captured against the original sources before removing the adapter.

The default list is 204 items instead of the original undifferentiated 1,477
items, a reduction of 86.2%. The declaration closure shrinks by 20 even with two
additional roots. The flagged review text grows by 36 lines: direct monadic
scripts make the shared state and native operations explicit. This is a
reduction in declarations and review items, not in every line metric. The union
of full physical declaration spans is 19,277 before and 19,295 after; that
broader measure includes comments and theorem proofs, unlike the flagged
review-text metric above.

## Statement preservation

Only `Ehr.Check.ReviewTrace.accepted_clinicalScenarios` changes its written
headline conclusion. Both versions have the identical parameters and premise:

```lean
theorem accepted_clinicalScenarios (sp prev canonical p)
    (accepted : check sp prev canonical p = .ok) :
```

| Old conclusion | New conclusion |
|---|---|
| `∀ c ∈ clinicalCases sp canonical p, Scenario c.input c.steps` | `∀ c ∈ clinicalCases sp canonical p, Realized c.input.toInitInput c.task` |

The new statement implies the old contract because each direct task sequences
the same checked opening and concrete native control equations through the same
intermediate states, retaining every observation, alternative execution and
original-state preservation condition.

A scratch Lean translation of the deleted adapter proves `control_same`,
`sequence_same` and `initialized_same`: a direct `control` has the old
checkpoint relation, sequencing preserves it, and initialized direct execution
is equivalent to the old `Scenario`. This is a general adapter equivalence,
not a claimed kernel proof equating the two complete catalog-generating
functions. The case migration preserves fixture values, applicability,
observation order, backtracking, diagnostic labels and signing bounds; canonical
conformance, the certification matrix and exact retained verdict comparisons
provide executable regression evidence for that migration.

`#print axioms accepted_clinicalScenarios` reports only `propext`,
`Classical.choice` and `Quot.sound`. The three scratch equivalence theorems have
the same allowed axiom set. The regression audit's two small example theorems
have no axioms. Comparator statements, specifications and properties are
unchanged.

## Removed vocabulary

`lean/Ehr/Check/ReviewTrace.lean` is deleted: 117 lines, including `Checkpoint`,
`performAt`, `perform`, `checkpoint`, `steps`, `scene`, `steps_policy`,
`continueAt`, `beginEncounter`, `encounter`, `Scenario`, `steps_cons_iff` and
`scenario_iff`. Clinical builders now produce `Trial Unit` scripts directly.
The duplicate `ClinicalCase` container and `encounterInput` fixture wrapper are
removed in favor of `EntryWitness.Case` and the existing scene builder.
`prefixBefore`, `withAlternative` and `forkBefore` are replaced by direct
prefix preparation and checked alternatives at the reached control.

Across the changed clinical Lean sources, the diff removes 317 lines and adds
261, a net reduction of 56 lines. No source flags were removed just to reclassify
an item. The clinical namespace and public headline name remain stable.

## Verification

All commands used `TMPDIR=/home/saithat/Projects/run-tmp`. Lean builds used
`LEAN_NUM_THREADS=4`; native conformance used two Lean threads per process.

| Command | Result |
|---|---|
| `cd lean && lake build && lake build ui-layout Ehr.Check.ContextTests && lake build $(cat ../scripts/proof-map/extra-modules.txt)` | Passed. |
| `bash scripts/audit-verification.sh` | 91 theorems; no unexpected axioms. |
| `EHR_CONFORMANCE_TRANSPORT=serve LEAN_NUM_THREADS=2 node conformance/index.mjs --canonical --jobs 4 --out "$TMPDIR/review-surface/conformance.json"` | 15 targets, 202 scenarios; 1,592 passed, 0 failed, 1,438 inapplicable. |
| `python3 lean/Ehr/Check/certify.py --no-write` | Before and after: 15/15 personas accepted, 37/37 bad programs rejected. |
| `python3 scripts/audit-retained-checks.py runs/lean-10day runs/core-10day runs/hillclimb-3day` | Before and after: 75 verdict lines, byte-for-byte identical. |
| `python3 scripts/audit-retained-checks.py --vendors runs/lean-10day runs/core-10day runs/hillclimb-3day` | Before and after: 115 verdict lines, byte-for-byte identical. |
| `scripts/proof-map/build.sh --readme` and `scripts/proof-map/build.sh --check-readme` | Regenerated map; both generated artifacts fresh. Traversal regression tests passed; altered generated JSON was rejected by the negative freshness check. |
| `cd lean && lake env lean "$TMPDIR/review-surface/StatementBridge.lean"` | Three general adapter-equivalence theorems checked; allowed axioms only. |
| `pnpm --filter app exec vitest run tests/spec-review.test.ts --maxWorkers=4` | 6 tests passed, including class filters, counts, inline rules, private/anonymous declarations and a name collision across source files. |
| `pnpm --filter app typecheck`, `pnpm --filter app exec tsc -b --noEmit --pretty false`, `pnpm --filter app lint` | Passed. |
| `APP_TEST_PREVIEW=0 APP_TEST_PORT=4187 pnpm --filter app exec playwright test dashboard.spec.ts --project=desktop --workers=1` | 4 passed, 1 skipped; 1440×900, class switching, empty-recording access and existing dashboard refresh checks. The skipped check requires `VGI_RUN`. |
| `node scripts/proof-map/lint.mjs` and `git diff --check` | Passed. |

The initial CLI-transport conformance attempt was stopped for startup overhead;
the successful persistent-transport run used the same binary, inputs, four
workers and full scope. No conformance failure caused that restart.

The broader app-suite invocation, `pnpm --filter app test --
tests/spec-review.test.ts`, ran all app unit files: 230 tests passed, two skipped,
and the existing all-patient chart-search test timed out at 240 seconds while
rendering 1,442 fixture charts. The six targeted spec-review tests and the desktop
page checks passed separately. No timeout limit or unrelated test was changed.

## Boundaries and follow-up

The required app server and test changes outside the dashboard/browser source
folders change the certified app hash. Historical certificates were not rebound
and WASM was not rebuilt. Retained inputs were read without modification.
No containers, live stack, new recording, full retained-run conformance or
retained-run recertification were used. Nothing was pushed.

One possible further split is `Ehr.Check.ReviewTrace.prescriptionDisplay`: its
single fixed synthetic display invokes `Fhir.runFacts`, pulling the general FHIR
projection into the clinical statement closure. Should the fixed clinical
observation fixture and adapter-conformance obligation be separated, while
preserving both guarantees? Its body is unchanged here.
