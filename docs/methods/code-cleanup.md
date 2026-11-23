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
