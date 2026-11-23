# Code cleanup decisions

The script audit searched all tracked files, including hidden CI configuration,
package scripts, Makefile, documentation, Lean tools and generators. No executable
caller imports or launches any removed script. Some historical audit pages do
reference them; those pages retain their original evidence and now identify retired
reproduction commands. Data directories, dependency/build outputs and external
logs are not executable repository callers. Dynamic paths, directory enumeration,
JSON keys, native exports and WASM entry points were also inspected. None selects
the retired filenames. Removed scripts import only shared modules that remain in
use; no private helper became orphaned.

## Scripts

Paths below are relative to `scripts/`. Runtime probes used
`TMPDIR=/home/saithat/Projects/run-tmp` and `LEAN_NUM_THREADS=4`.
“Static imports linked” means Node's `vm.SourceTextModule.link` imported each
static dependency without evaluating the script body; this avoids historical
recordings or fixed output writes. It does not establish runtime success.

| File | Decision | Probe result | Reason |
|---|---|---|---|
| `acute-review-fixtures.mjs` | Keep | Ran successfully; exports two synthetic acute review bundles. | Reusable offline fixture exporter. |
| `check-chart-search.mjs` | Delete | Failed on first chart: shown chart search absent. | Obsolete initial-screen assumption and fixed 324-patient total. |
| `discovery/gate-benchmark.mjs` | Keep | Passed: reference accepted, five adversarial families refused. | Reusable native gate diagnostic; historical audit also references it. |
| `discovery/prompt-measure.mjs` | Delete | ENOENT: stopped recording llm directory absent. | Finished comparison tied to old prompt headings and archived shapes; historical audit reference only. |
| `discovery/rules-benchmark.mjs` | Keep | Passed: six accepted and two rejected synthetic rules. | Reusable screen-gate diagnostic; retain its rules-benchmark-run.mts helper. |
| `discovery/snapshot-density.mjs` | Delete | Failed: missing persona/release vendor reference. | One-time freezer for three named historical runs; frozen JSON remains unchanged. |
| `export-entry-time-screens.mjs` | Keep | Passed: late and boundary native exports. | Reusable offline timing-boundary exporter. |
| `layout-reference/board-report.mjs` | Keep | Imports passed with tsx; no-argument run requires before/after inputs. | Reusable paired-report reducer documented by dense-board audit; source reports required. |
| `layout-reference/nightly-benchmark.mjs` | Delete | Static imports linked; run.ts and scripted.ts imported successfully. | Finished one-day P3 benchmark with fixed world path; top-level run withheld to avoid launching recording/browser work. |
| `presentations/check-wasm.mjs` | Keep | Passed: 16 presentations and fictional FHIR projections agree. | Reusable targeted native/WASM comparison. |
| `presentations/check-world.py` | Delete | Ran: zero old-format schedules; fixed 50/1284 assertion failed. | Superseded frozen-cohort replay; no full simulation launched. |
| `presentations/seeded-review-resources.mjs` | Keep | Imports passed; run stopped at absent world manifest. | Parameterized offline seeder-resource exporter; needs restored world data. |
| `realism/ambulatory-fixtures.mjs` | Delete | Imports passed; run stopped at absent world-2 manifest. | Finished fixed-cohort clinic screenshot preparation. |
| `realism/content2-fixtures.mjs` | Delete | Static imports linked successfully, without top-level execution. | Finished before/after screenshot exporter with obsolete cached executable/release paths; avoids writing under app/. |
| `synthetic-hospital/verify-projection.mjs` | Delete | Static imports linked successfully, without top-level execution. | Finished migration check assumes old home chart/tabs and fixed screenshot destination; current FHIR/presentation tests cover projection. |
| `wave3-sim-smoke.mjs` | Delete | ENOENT: retained day-2 P1 source absent (source root set to this checkout). | Historical matched comparison requires a pre-change control binary and fixed old recordings; no replay launched. |
| `workload-clock-smoke.mjs` | Delete | ENOENT: fixed world-2 day-01 schedule absent. | Finished clock migration smoke tied to core-10day/world-2; maintained workload and context tests remain. |
| `audit-retained-checks.py` | Keep | python --help succeeds. | Manual read-only checker audit; never run over retained recordings for routine cleanup. |

## Lean declarations

All 79 supplied candidates were checked against declarations, `#guard`/`#eval`,
all `lake exe` roots, GenTS and generated bindings, native/JSON API dispatch,
FFI exports, WASM wrappers, string construction and documentation. The elaborated
unused list excludes test/tool roots, so many candidates are actively used there.
For deleted candidates the only executable occurrences were their own declarations
(and, for generated placement lists, their generator emission). Identically named
constructors/fields were distinguished by namespace and type. No theorem body,
statement, specification, policy constant or structure accessor was changed.
The placement generator emits the same remaining manifest entries. No deleted
name is inspected by GenTS, Tools.Samples or a wire/FFI dispatcher.

| Name | Decision | Reason |
|---|---|---|
| `Ehr.runBatchCase` | Keep | Main batch CLI and Examples.ApiTests #guards. |
| `Ehr.projectName` | Delete | Unused project-title leftover; Basic stays as an import-compatible empty module. |
| `Ehr.Canonical.Bad.coreExpectedProperties` | Keep | Tools.ExportContent names/properties export. |
| `Ehr.Canonical.Bad.corePrograms` | Keep | Tools.ExportContent and Check.SeedTests #guard. |
| `Ehr.Canonical.activityWorkflowExample` | Keep | Two Builders #guard regressions. |
| `Ehr.Canonical.rowAction` | Delete | Unused component-tag builder; UiNode.rowAction is a different, retained constructor. |
| `Ehr.Canonical.FeatureExamples.forCommit` | Keep | Canonical.FeatureTests and LegalTests fixture records. |
| `Ehr.Canonical.Features.phaseInfos` | Delete | Unused generated placement list; remove its emission without changing any specification. |
| `Ehr.Canonical.Features.samples` | Delete | Unused generated sample list; active FeatureExamples and Tools.Samples remain intact; remove only this emission. |
| `Ehr.Canonical.roleProjectionValid` | Keep | Personas #guards for all three releases. |
| `Ehr.Canonical.commitReviewsPinned` | Keep | Sanity and BlueprintTests #guards. |
| `Ehr.Canonical.commitsPresent` | Keep | Sanity #guard. |
| `Ehr.Canonical.linkedPrefillsValid` | Keep | Sanity #guard. |
| `Ehr.Canonical.reachable` | Keep | Sanity #guards for both navigation directions. |
| `Ehr.Canonical.Urgency.releases` | Keep | Urgency role-projection checker #guard. |
| `Ehr.Check.tierName` | Keep | In protected Check.lean; left untouched as requested. |
| `Ehr.Check.npUser` | Delete | Unused concrete example user; np_preop_never_signs remains fully general and unchanged. |
| `Ehr.Check.preopFacts` | Keep | AdditionalBadProofs.noCuresPreopEp uses the concrete witness. |
| `Ehr.Check.DoseCompletionObstruction.archivedMismatch` | Keep | DoseCompletionObstruction #guard checks archived-line refusal. |
| `Ehr.Check.«commandComp_witness_,_:=_[_][_]»` | Keep | Syntax macro invoked as comp_witness in Check.Seed10Proof. |
| `Ehr.Check.completeVia` | Keep | Check.ValueTests #guard; retained old helper exercises a regression. |
| `Ehr.Commit.Protocol.AdtModel.lockSafe` | Keep | AdtCheck executable audit. |
| `Ehr.Commit.Protocol.Invariant` | Keep | Reader-facing protocol safety Prop; never delete specifications. |
| `Ehr.Commit.Protocol.PatientProjectionCorrect` | Keep | Protocol.Proofs projection theorems and specification Prop. |
| `Ehr.OrderChoice.isPriorAuthService` | Keep | Core.Tests #guards. |
| `Ehr.Deficiencies.AdtStamp.ofPatient` | Keep | Explicitly marked new specification for owner review. |
| `Ehr.roundTrips` | Keep | Core/Commit/Examples and runtime JSON #guards. |
| `Ehr.Examples.Tiny.sampleCertificate` | Keep | Tools.Samples bindings input and Tiny #guard. |
| `Ehr.Layout.densityCounts` | Keep | Layout.Audit lake executable and Layout.Tests #guards. |
| `Ehr.Layout.Format.clinicalTime` | Keep | Layout.Api string operation clinicalTime and Format #guards. |
| `Ehr.Layout.drawnGlyphWidths` | Delete | Unused glyph-width accessor; API continues to return its existing lineWidths. |
| `Ehr.Layout.runRequest` | Keep | Layout.Api request dispatch. |
| `Ehr.Layout.Keyboard.table` | Delete | Unused transition-table builder; real JSON keyboard dispatcher uses profile functions directly. Its private-purpose keys list is also removed. |
| `Ehr.Layout.boxPartsJson` | Keep | Layout.Api and FamilyJson wire outputs. |
| `Ehr.Layout.inventoryJson` | Keep | Layout.Api inventory operation. |
| `Ehr.Layout.semanticPaintTree` | Keep | Layout.Api structural-paint output. |
| `Ehr.Layout.widgetShape` | Keep | Layout.Api inventory and FamilyJson shape matching. |
| `Ehr.Layout.Window.askPage` | Keep | WindowProofs paging reachability statements and proofs. |
| `Ehr.Layout.Window.windowOnce` | Keep | Layout.Api windowing operation. |
| `Ehr.Multi.Critical.minute` | Delete | Unused fold/advance convenience wrapper; advance, step, FairService and all lifecycle theorems remain unchanged. |
| `«command#spec_surface_»` | Keep | Command elaborator used by Proofs.Audit and opt-in Audit.SpecSurface. |
| `Ehr.Runtime.Witness.chartA` | Keep | RuntimeDraftWitness JSON and draft-preservation #guards. |
| `Ehr.Runtime.Record.acked` | Keep | Structure field accessor; retained unconditionally. |
| `Ehr.Runtime.Record.captured` | Keep | Structure field accessor; retained unconditionally. |
| `Ehr.Runtime.Record.commits` | Keep | Structure field accessor; retained unconditionally. |
| `Ehr.Runtime.Record.popup?` | Keep | Structure field accessor; retained unconditionally. |
| `Ehr.Runtime.Record.receipts` | Keep | Structure field accessor; retained unconditionally. |
| `Ehr.Render.oralRouteChoiceExample` | Keep | CodeChoices #guard. |
| `Ehr.Render.unknownChoicesExample` | Keep | CodeChoices #guard. |
| `Ehr.Render.Fhir.Ambulatory.referenceMatches` | Keep | FhirTests alias-resolution #guards. |
| `Ehr.Render.missingGrowthReferenceExample` | Keep | GrowthStandards #guard. |
| `Ehr.Render.newbornWeightReferenceExample` | Keep | GrowthStandards #guard. |
| `Ehr.Render.Html.toHtmlString` | Keep | Render.Cli HTML exports and PageTests #guards. |
| `Ehr.Render.allCls` | Keep | Html stylesheet completeness/uniqueness #guards. |
| `Ehr.Render.attrWhitelist` | Keep | Named wire-attribute policy constant for readers (section 9.1). |
| `Ehr.Render.reportReleaseNav` | Keep | Canonical.NavExports #eval entry point. |
| `Ehr.Render.tinyWeightItem` | Keep | PrefillProofs theorem/example witness. |
| `Ehr.Render.scheduleTagExample` | Keep | Presentations #guard. |
| `Ehr.Render.stylesheetClasses` | Keep | Html stylesheet #guards. |
| `Ehr.Sem.Board.eventResult` | Keep | Sem.ExoticApi result dispatch through lake exe exotic-api. |
| `Ehr.Sem.Board.meaningOf` | Delete | Unused mapping convenience wrapper; paneMeaning and all board observations/proofs remain. |
| `Ehr.Sem.DatedTimeline.fullAdmission` | Keep | Reader-facing full indexed-admission certificate; preserves the stronger full observation contract. |
| `Ehr.Sem.IndexedMeaning.clinical` | Keep | Structure field accessor; retained unconditionally. |
| `Ehr.Sim.Bounded.ratePrograms` | Keep | Main preference CLI and BoundedTests. |
| `Ehr.Sim.Bounded.relearningCost` | Keep | BoundedTests #guards. |
| `Ehr.Sim.Bounded.seededPreferences` | Keep | Main preference CLI default and BoundedTests #guard. |
| `Ehr.Sim.Information.window` | Delete | Unused question-window projection; relevant matches each question and applies its window directly. |
| `Ehr.Sim.Resumption.discardFrame` | Keep | Resumption.Tests #guards. |
| `Ehr.Sim.Resumption.handOver` | Keep | Resumption.Tests #guards. |
| `Ehr.Specs.CriticalResults.ReportedWithinBound` | Keep | Protected reader-facing specification/policy; retained regardless of executable reachability. |
| `Ehr.Specs.CriticalResults.Resolved` | Keep | Protected reader-facing specification/policy; retained regardless of executable reachability. |
| `Ehr.Specs.CriticalResults.ValidRoute` | Keep | Protected reader-facing specification/policy; retained regardless of executable reachability. |
| `Ehr.Specs.CriticalResults.escalationMinutes` | Keep | Protected reader-facing specification/policy; retained regardless of executable reachability. |
| `Ehr.Specs.PhysicalBounds.reflowCssPx` | Keep | Protected reader-facing specification/policy; retained regardless of executable reachability. |
| `Ehr.Specs.PhysicalBounds.targetCssPx` | Keep | Protected reader-facing specification/policy; retained regardless of executable reachability. |
| `Ehr.Specs.PhysicalBounds.textResizePercent` | Keep | Protected reader-facing specification/policy; retained regardless of executable reachability. |
| `Ehr.Specs.PhysicalBounds.viewportWidths` | Keep | Protected reader-facing specification/policy; retained regardless of executable reachability. |
| `Ehr.Specs.V1.allDistinct` | Keep | Protected reader-facing specification/policy; retained regardless of executable reachability. |
| `Ehr.Specs.V3.abxIndicationCodes` | Keep | Protected reader-facing specification/policy; retained regardless of executable reachability. |

## Lean validation

Commands ran with `TMPDIR=/home/saithat/Projects/run-tmp` and
`LEAN_NUM_THREADS=4`; the Lake commands below ran in `lean/`, sequentially.

| Command | Result |
|---|---|
| `lake build` | Passed, 697 jobs. |
| `lake build ui-layout` | Passed, 154 jobs. |
| `lake env lean Ehr/Check/ContextTests.lean` | Passed all context guards. |
| `node --test scripts/trajectories/context-cache.test.mjs` (repository root) | 1 passed, 0 failed. |
| `lake exe gents` | 205 types, 44 samples; `git diff --exit-code -- generated` passed. |
| `lake build Ehr.Layout.Range Ehr.Layout.Structural Ehr.Layout.Shell Ehr.Layout.FamilyJson Ehr.Sem.ExoticApi Solution` | Passed, 146 jobs. |
| `lake env lean "$TMPDIR/code-cleanup/AxiomAudit.lean"` | 73 public theorem reports across changed modules; only `propext`, `Classical.choice`, `Quot.sound` or no axioms. No theorem was edited. |
| `scripts/proof-map/build.sh --check-readme` (repository root) | Regenerated interactive artifacts; the documentation's generated section is current, so `docs/proof-map.md` is unchanged. |

A write-intercepted execution of `feature_encode.py` compared all three generated
outputs byte-for-byte with the checkout: `Specs/Rules/Features.lean`, the remaining
`Canonical/FeaturePlacements.lean`, and `docs/rules/catalog.json` all matched.
The scratch axiom audit imports each changed module containing theorems and runs
`#print axioms` on every public theorem in those modules, including board examples.

The full canonical suite passed with the CI transport:

```sh
TMPDIR=/home/saithat/Projects/run-tmp LEAN_NUM_THREADS=4 \
  EHR_CONFORMANCE_TRANSPORT=serve node conformance/index.mjs --canonical --jobs 4
```

Result: **1,592 passed, 0 failed, 1,438 not applicable**, covering all 202
scenarios across 15 release/persona targets. The initial invocation without the
transport environment variable used one-shot CLI process startup and was
interrupted after v1/P3 passed (46 pass, 0 fail). The full server-transport run
replaced it without reducing scope. `node --import
./agent/node_modules/tsx/dist/loader.mjs --test conformance/native.test.mjs`
passed its native wire-value and scenario-evidence parity test (1 pass, 0 fail).
Generated canonical reports are retained in disk-backed scratch; historical
checked-in report files were restored rather than rewritten by this cleanup.
