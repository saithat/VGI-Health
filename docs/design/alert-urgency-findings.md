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
unique trees**. Persona audit: **3,612 exports, 1,290 unique trees**. Across both batches, 437 trees are shared: **2,673 distinct
trees** cover **8,418 exports** and **32,094 matrix cases**.
Each physical matrix has five required desktop/tablet widths,
two reflow equivalents and two text-resize cases; forced modal-free background
probes are separately marked. Every exact export is mapped to its measured tree
in `exports.json`; byte-identical trees share measurements. No failed batch mints
passing screen-cache receipts.

## Results

Both complete browser batches **fail the proposed physical/urgency gate**. These
are findings against the unchanged canonical UI; no thresholds were waived.

| Batch | Gate result | Unique trees covered | Matrix samples | Gate findings |
|---|---|---:|---:|---:|
| All-workflow templates | fail | 1,820 | 18,720 | 452,595 |
| Role-specific candidates | fail | 1,290 | 13,374 | 369,454 |

All 50 bounded batches returned policy `fail`, with no infrastructure errors.
Input SHA-256 sets and every required width/resize/phase combination were
independently validated; all records include the final SVG-text measurement epoch.

Counts below are finding occurrences across unique trees, viewport/resize cases
and active/background phases. They are not counts of independent clinical defects.

| Criterion | Template occurrences | Persona occurrences | Template trees affected | Persona trees affected |
|---|---:|---:|---:|---:|
| 2.5.8 | 14,256 | 9,666 | 834 | 547 |
| 1.4.3 | 0 | 0 | 0 | 0 |
| 1.4.11 | 55,260 | 73,017 | 878 | 599 |
| 1.4.4/1.4.10 | 33,024 | 22,036 | 1,820 | 1,290 |
| 1.4.10 | 0 | 0 | 0 | 0 |
| urgency | 900 | 540 | 20 | 12 |
| contrast-review | 349,155 | 264,195 | 1,820 | 1,290 |

At the five required widths with 100% text, target-size occurrences are
7,920 (templates) / 5,370 (personas), and non-text-contrast occurrences are
30,700 / 40,565. Zero recorded SC 1.4.3 failures applies only to supported solid
surfaces; the unresolved paint findings prevent a text-contrast compliance claim.

Representative exact element findings (full per-state IDs and measured values
remain in the durable JSON reports):

| Criterion | Element ID / DOM path | Width / text / phase | Measurement |
|---|---|---|---|
| 2.5.8 | `w1Labs.labFasting/input` | 768px / 100% / active | 16.00×16.00 CSS px < 24×24 |
| 2.5.8 | `w1Orders.naloxoneEducation/input` | 768px / 100% / active | 16.00×16.00 CSS px < 24×24 |
| 1.4.11 | `chartSummary.card.chartVitals.data/div:nth-of-type(1)/figure:nth-of-type(1)/svg:nth-of-type(1)/g:nth-of-type(1)/line:nth-of-type(1)` | 768px / 100% / active | graphic 1.4870:1 < 3:1 |
| 1.4.11 | `chartSummary.card.chartVitals.data/div:nth-of-type(1)/figure:nth-of-type(1)/svg:nth-of-type(1)/g:nth-of-type(2)/line:nth-of-type(1)` | 768px / 100% / active | graphic 1.4870:1 < 3:1 |
| 1.4.4/1.4.10 | `html:nth-of-type(1)/body:nth-of-type(1)/div:nth-of-type(1)/div:nth-of-type(1)/div:nth-of-type(1)/header:nth-of-type(1)/div:nth-of-type(2)/div:nth-of-type(3)/div:nth-of-type(1)/span:nth-of-type(1)` | 1280px / 200% / active | text clipped by html:nth-of-type(1)/body:nth-of-type(1)/div:nth-of-type(1)/div:nth-of-type(1)/div:nth-of-type(1)/header:nth-of-type(1)/div:nth-of-type(2)/div:nth-of-type(3)/div:nth-of-type(1)/span:nth-of-type(1): Allergies: Allergic disposition; Bee venom; Mold; House dust |
| 1.4.4/1.4.10 | `doseRangeOrder/span:nth-of-type(1)/span:nth-of-type(1)` | 1280px / 200% / active | text clipped by doseRangeOrder/span:nth-of-type(1)/span:nth-of-type(1): Acknowledge |
| urgency | `Urgent alert doseRangeOrder` | 768px / 100% / active | initial: Urgent alert doseRangeOrder: not perceived at the current moment |
| urgency | `Urgent alert highAlertAdmin` | 768px / 100% / active | initial: Urgent alert highAlertAdmin: not perceived at the current moment |
| contrast-review | `chartReview.chartWorkspace.chartSummary/button` | 768px / 100% / active | Unsupported image/opacity/filter/blend needs pixel review |
| contrast-review | `html:nth-of-type(1)/body:nth-of-type(1)/div:nth-of-type(1)/div:nth-of-type(1)/div:nth-of-type(1)/main:nth-of-type(1)/div:nth-of-type(1)` | 768px / 100% / active | Unsupported image/opacity/filter/blend needs pixel review |

`contrast-review` is an unresolved paint measurement, not an asserted numerical
contrast failure. Authored gradients/opacity/filter/blend require pixel/manual
evidence. SVG paint findings conservatively include non-hidden chart grid/axis
strokes; review which are necessary to understand the graphic before making a
WCAG-conformance judgment. Small checkbox-input findings use the strict hospital
24px baseline; no spacing/equivalent-control exception was applied. Clipped
banner and acknowledgment text must be assessed alongside accessible alternatives.
A failed resize screenshot was visually inspected and confirms banner overlap.
Urgency counts use the existing per-emitted-presentation check. Some failures
are hidden duplicate inline warnings under their own matching modal; this is
stricter than the condition-level UrgentDemand disjunction and needs adapter
review before counting as a true condition-level urgency violation.

The raw reports preserve all files, widths, phases, element IDs, dimensions,
contrast ratios and urgency moment labels. Exact complete coverage was checked
by matching report input SHA-256 sets to every export manifest:

- Template exports and reports: `/home/saithat/Projects/run-tmp/policy-canonical-verified/{exports,physical,result}.json`.
- Persona exports and reports: `/home/saithat/Projects/run-tmp/policy-personas-verified/{exports,physical,result}.json`.
- Build/proof/gate logs: `/home/saithat/Projects/run-tmp/policy-*.log`.

Reproduction commands (first uses four browser workers, second two; combined
concurrency never exceeds six):

```sh
EHR_PHYSICAL_SAMPLE_CACHE="$TMPDIR/policy-verified-samples" EHR_SCREEN_WORKERS=4 node scripts/audit-alert-policy.mjs "$TMPDIR/policy-canonical-verified"
EHR_PHYSICAL_SAMPLE_CACHE="$TMPDIR/policy-verified-samples" EHR_SCREEN_WORKERS=2 node scripts/audit-alert-policy.mjs "$TMPDIR/policy-personas-verified" --personas
```

The template run originally hit the process environment-size limit before any
browser launch. The runner now supplies a file manifest; the complete rerun is
the evidence above. The first unbounded run exhausted the report controller's
2GB Node heap. Sequential bounded controllers and structured aggregation resolve
that failure. Final runs use fresh measurement contexts including the expanded
SVG-text and shape checks; earlier diagnostic/recovery data is not final evidence.

## Verification commands

Commands run from the repository root unless the command changes into `lean`.
Scratch space was fixed for all runs; Lean used at most four threads, with
two threads/jobs for the final proof and WASM checks:

```sh
export TMPDIR=/home/saithat/Projects/run-tmp LEAN_NUM_THREADS=2 JOBS=2
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
| `APP_TEST_PORT=4217 pnpm --filter app exec playwright test ui-check.spec.ts --project desktop --workers 2 --grep 'physical gate detects\|urgency gate rejects'` | 2 passed; malicious target dimensions, DOM/SVG text and shape/boundary contrast, viewport displacement and modal occlusion detected. |
| `pnpm --filter app test --maxWorkers=2 tests/screen-cache.test.js` | 1 passed; whole-batch/exact-context receipt behavior retained. |
| `make wasm` | Pass; rebuilt API roots `Ehr.Api`, `Ehr.Render.Api`. |
| `make wasm-check` | Pass; all-source manifest current. |
| `git diff --check` | Pass. |
| `lean/.lake/build/bin/ehr check --spec releases/v1/spec.json --program releases/v1/canonical.json --canonical releases/v1/canonical.json` | Expected authoring-template rejection: `writesOnly`, physician role cannot enter RN wristband fields. All 15 role projections pass as shown below. |

The bounded-aggregation regression also ran the following command, followed by
JSON assertions that both child collectors exited 0 but the CLI verdict was
`fail`, with 2 states and all 18 matrix samples retained:

```sh
EHR_SCREEN_CACHE=0 EHR_SCREEN_WORKERS=2 EHR_SCREEN_BATCH_SIZE=1 \
EHR_PHYSICAL_SAMPLE_CACHE="$TMPDIR/policy-verified-samples" \
EHR_PHYSICAL_REPORT="$TMPDIR/policy-batch-check.json" \
EHR_SCREEN_RESULT="$TMPDIR/policy-batch-result.json" \
node app/scripts/screen-check.mjs --ui \
  "$TMPDIR/policy-canonical-verified/v1/canonical/adult-allergic/chartReview-expanded.json" \
  "$TMPDIR/policy-canonical-verified/v1/canonical/adult-allergic/home.json"
```

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
| `Sem.other_alert_blocked_by_modal` | `propext`, `Classical.choice`, `Quot.sound` |
| `Sem.urgencyAt_obstructed_by_modal` | `propext`, `Classical.choice`, `Quot.sound` |
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

Owner review remains for all tier assignments, workflow applicability and
clinical resolution/escalation semantics, the single-modal obstruction to
simultaneous urgent demands, duplicate-presentation browser refinement, the
minor-interaction label/coarse-trigger mismatch, and whether to add an actual critical-result alert with delivery/escalation obligations. A
`CLAUDE.md` was absent from this worktree; the supplied owner rules and README
were used instead.
