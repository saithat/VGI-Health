# Project status

Consolidated 2026-11-01. Active releases are v1/v2/v3; v1.1 appears only in archived runs. The rule profile is **core**. Clinicians use role-based pre-set views, landing patient lists and **Open chart** for in-UI patient selection. Only the AI agent modifies UI programs. New runs use **world/2**. Metrics are clicks, scroll count/distance and mouse travel; keystrokes are secondary and time is not an optimization metric.

The realism lanes cover chart notes, patient context, signing and rendered interactions. Pre-op signing uses encounter-role privileges: NPs cannot sign pre-op orders; route them to the surgeon. There is no attending-cosign route. The held-out `conformance/` suite is report-only: 195+ scenarios exposed five gap families subsequently closed; see [results](../conformance/RESULTS.md).

## Physical interaction baselines — 2026-11-01

Owner decision: report clicks, scroll count/distance and mouse travel; keystrokes
are secondary. Timing estimates are retained only in raw logs, **not used**.
The agent objective uses these dimensions, no count regression, at most 2% + 1px
pixel regression, strict improvement in at least one dimension, and unchanged
full-completion and safety gates. The dashboard offers the same metric switches.

All 15 certified persona canonicals were measured with the real native checker
and simulator on world/2, seed 1, at 1440×900. The schedule is day 2 for v1, day 4
for v2 and day 8 for v3; these have different workloads and are not paired vendor
comparisons. Every task completed; every target has real Chromium geometry.
The reference bundles are Ashly for P1/P2/P3, Abdul (pediatric) for P4, and Albert
(surgical) for P5. This is a zero-model geometry reference, not an overnight run.
[Machine-readable numbers and build/program hashes](audits/interaction-baselines.json).

| Release | Persona | Day | Complete | Clicks | Scroll count | Scroll px | Mouse px | Keys (secondary) |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| v1 | P1 | 2 | 40/40 | 786 | 826 | 1,620,330 | 292,346.71 | 3746 |
| v1 | P2 | 2 | 18/18 | 1131 | 1471 | 1,572,427 | 468,114.43 | 4743 |
| v1 | P3 | 2 | 51/51 | 684 | 528 | 1,047,333 | 310,735.44 | 1167 |
| v1 | P4 | 2 | 20/20 | 745 | 949 | 845,248 | 310,398.23 | 3998 |
| v1 | P5 | 2 | 14/14 | 728 | 1200 | 1,022,169 | 271,412.25 | 2467 |
| v2 | P1 | 4 | 40/40 | 844 | 925 | 1,733,066 | 305,263.88 | 3765 |
| v2 | P2 | 4 | 13/13 | 941 | 1293 | 1,408,617 | 387,059.03 | 3701 |
| v2 | P3 | 4 | 41/41 | 557 | 445 | 856,076 | 252,865.52 | 978 |
| v2 | P4 | 4 | 17/17 | 408 | 552 | 492,660 | 172,091.71 | 2401 |
| v2 | P5 | 4 | 11/11 | 488 | 927 | 785,914 | 181,759.24 | 1671 |
| v3 | P1 | 8 | 39/39 | 795 | 860 | 1,712,625 | 300,905.40 | 3464 |
| v3 | P2 | 8 | 15/15 | 1484 | 2249 | 2,438,885 | 596,142.56 | 5553 |
| v3 | P3 | 8 | 38/38 | 506 | 420 | 715,809 | 206,098.55 | 857 |
| v3 | P4 | 8 | 15/15 | 483 | 763 | 676,639 | 218,998.64 | 2663 |
| v3 | P5 | 8 | 12/12 | 556 | 1031 | 853,294 | 233,801.81 | 1901 |

Geometry uses actual rendered component centers and ancestor scroll offsets,
including expanded/tab and alert/acknowledged-background states. A pointer starts
at viewport center once per day trace and travels in straight lines, with no
tremor or overshoot. Offscreen targets use measured centered reveal offsets;
explicit scroll events advance a measured container viewport. Scroll count
includes reveal movements, and scroll pixels sum actual container-offset changes.
This models interactions on representative screen content; it does not estimate
human time or rerender changing content for every task. Missing geometry remains
unavailable. The click floor stays clicks; travel on a minimum-click path is
reported where available and is not a movement optimum. See
[agent protocol and exact commands](../agent/STATUS.md).

## Synthetic Hospital data lane (Phase 1)

Pinned upstream `911f34c4ac65a508543c4b3b90c373a0cd16534d`; SHA256-checked
JSONL/SQLite downloads and deterministic Node/Python conversion live under
`scripts/synthetic-hospital/`. The committed cohort is **150 patients, 637
encounters/notes, 4,383 resources**, 6.68 MB uncompressed. Conditions: 718 coded
with upstream ICD-10-CM and 356 text-only; 383 home MedicationStatements use
RxNorm only for exact project-formulary names. The DB has diagnosis codes but
no terminology tables. Source tags and per-patient Provenance cite the commit.

All 150 are loaded and searchable in local Medplum. Thirty distinct primary
selections per P1–P5; overlapping persona fits: **P1 95, P2 120, P3 51, P4 34,
P5 90**. The full source includes 248 children. Opt in with
`make seed SYNTHETIC_HOSPITAL=1` / `make install SYNTHETIC_HOSPITAL=1`, or
`make load-synthetic-hospital`. Conditional creates use <=8-entry transactions
and resolved cross-chunk references; a full rerun created **zero** resources.
Historical encounters remain finished; active queues still come from the world.

Validation: 12 Node import tests; app build/lint and all 152 tests pass, including
real WASM projection of all 324 fixture patients. One Chromium browser signed in
with each persona, found an imported patient, opened every chart, and verified
the offline source filter/replay without browser errors. Screenshot:
`app/shots/final (supersedes earlier captures)`; browser evidence is alongside it.
No Lean build, Lean source change, simulation world change or shared-stack reset.
The precise Notes/history rendering plan is [docs/STATUS.md](STATUS.md).
A later world may select from this cohort's index/flags/persona fits after its
loader supports these FHIR types and text-only codes; do not modify world 2 or
infer active orders/admissions from historical narrative.

## Role pre-set views (owner decision 2026-10-31)

The vendor reference keeps all screens. `Core/Navigation.lean` defines each persona's
pre-set workflows and public activity/navigator names; `forPersona` removes other
screens, broken links and unusable macros, then applies role permissions.
P1 has Schedule, Results and Rx Requests (16 screens); P2 ED Track Board (8);
P3 Unit Census & MAR (6); P4 Schedule, Results and Rx Requests (13); P5 OR Schedule,
Consults and Results (22). P4 keeps results and refill work because the NP role
has those commits and both are routine pediatric follow-up activities. Its actual
world-2 tasks remain W5. P5 Consults opens the surgical-clinic encounter (W1);
the OR navigator also reaches the inpatient consult section (W6).

Internal W1–W7 IDs remain unchanged. D5 groups the overview by public activity,
with unique navigator sections, the same twelve-item limits, and no orphans.
The actual sidebar stays the open encounter's navigator. A default Lean test
rejects workflow display names in all fifteen projections' visible labels.

Completion and passive-alert preservation compare against the owner's fixed
pre-set view of the vendor reference, never a scope inferred from candidate
screens. Removing an expected activity still fails certification. All safety
rules remain active. Physician pre-op attestations remain available, conditionally,
on the retained signing screen; the NP is refused in pre-op encounters.
The three shared vendor references remain references; all fifteen role views certify.

Default build after merging the chart-note lane: 44.36 seconds. The fifteen
world-2 simulations on days 1, 4 and 7 complete all 407 tasks; the smoke script
also verifies each task belongs to its persona's pre-set view. Evidence:
`lean/Ehr/Check/preset-sim-report.json`. No simulation policy uses the activity labels.

## Integer release names (owner decision 2026-10-31)

The active releases are **v1**, **v2** (prior authorization, day 4), and **v3**
(antibiotic indication, day 7). Lean modules, exports, clients and release-day
configuration use these names. All fifteen role views certify; the three shared
vendor references remain vendor references. All seventeen core bad programs are rejected.

`scripts/historical-releases.mjs` maps legacy IDs only at archive readers:
`v1.1` becomes `v2`, and legacy `v2` becomes `v3`. Current `v2` is never remapped.
The run1 recordings, world 1, frozen benchmark releases and full-profile clinical
fixture retain their original contents. Recorded program/spec paths and UI
iteration numbers stay intact. Replay verification checks all 424 tasks, 14,658
events and three baselines with zero mismatches. The complexity report changes
release labels and provenance while preserving its measurements.

World 2 was regenerated with the new release-event names. Its seed calculation
normalizes those metadata names to their original spelling, preserving every
clinical task byte. All 1,284 tasks across fifty schedules complete; the day
1/4/7 subset completes 407/407. Every task's internal workflow belongs to its
persona's pre-set view.

Fresh agent runs and release fallbacks load the certified persona view, using
the shared vendor reference as the checker reference. The persona ID preserves that view
when its owner is an authenticated user UUID; candidate patches cannot change
ID, owner or role. The real check/deploy/render adapter passes spec file paths.

Verification: default build, `lake check`, Comparator and all 63 audited theorems
pass. App tests: 161; agent tests: 41; world tests: 93. App build/lint and agent/
world typecheck/lint pass. Eight desktop/narrow browser checks and both
trajectory-index tests pass. WASM was rebuilt and `make wasm-check` is clean.
The final warm default build takes 0.12 seconds (the pre-set-view rebuild took
44.36 seconds).

## Rule profile: core (temporary, owner decision 2026-10-31)

Core keeps the hand-written workflows: CURES (including the seven-day procedure
exemption), naloxone, EPCS details, Schedule II zero refills, VIS, the labeled
hospital policies, v2 prior auth, v3 antibiotic indication, and all base alerts
(A1–A4). It also keeps **`denyRefill`**, the one catalog commit needed by W7
refill-denial tasks, with its two Federal entry requirements and the existing
base decision/reason inputs. `coreCatalogCommits` and `CorePlacements.placements`
list this exception explicitly. No catalog review or alert binds to that commit.
The other CMS, Title 22, CA statutes, federal and entrenched catalog additions,
including feature strengthening, temporal evidence, value validation, order
expiry and pinned displays, are encoded and compiled but switched off.

| Release/profile | Elements | Commits | Entries | Reviews | Alerts |
|---|---:|---:|---:|---:|---:|
| v1 core | 123 | 11 | 82 | 21 | 15 |
| v1 full | 283 | 95 | 870 | 486 | 77 |
| v2 core | 126 | 11 | 82 | 21 | 15 |
| v2 full | 286 | 95 | 870 | 486 | 77 |
| v3 core | 127 | 11 | 93 | 22 | 15 |
| v3 full | 287 | 95 | 881 | 487 | 77 |

Restore by setting `ruleProfile := .full` in `lean/Ehr/Specs/Profile.lean`, then
running `cd lean && (ulimit -v 8000000; LEAN_NUM_THREADS=6 LEAN_STACK_SIZE_KB=65536 lake build EhrHeavy)`.
`EhrHeavy` parks all whole-program Seed/Bad kernel proofs and catalog-only
regressions. It is excluded from default targets; known unfinished modules are
listed in [TODO_PROOFS.md](../TODO_PROOFS.md). General checker/interpreter/deploy/
renderer proofs and three Tiny kernel rejection proofs remain in the default.
Full-profile persona/blueprint checks passed; the heavy proof suite is unfinished.

Default rebuild after the native-unit dose spec/guard change: **37.24 s**, peak
process RSS **1.63 GiB**; the final incremental follow-up build took **9.43 s**. The W7 denial proof covers every `TaskChoices` value
whose refill choice is `deny`, with only `propext` in its axiom audit.
`cd lean && (ulimit -v 8000000; LEAN_NUM_THREADS=6 LEAN_STACK_SIZE_KB=65536 lake exe profile-goals)`
compares the actual `taskCommits` results across core/full for all **1,284**
world-1 tasks: **zero differences**, including **20 denials among 115 W7 tasks**.
This comparison concerns goal commits; catalog entry/review obligations are separate.
The generated evidence is `lean/Ehr/Check/profile-goals-report.json`.
`lake comparator` passes with `COMPARATOR_BWRAP=../scripts/lean-bwrap.py`; the
wrapper retains its sandbox and supplies the six workers and 64 MiB stacks that
Comparator otherwise clears. `lake check` also passes with that wrapper.
Generated TS types include `EncounterRoleRule` and optional `encounterRoles`.
`make wasm` rebuilt the assets in **7.10 s** using the warm cache;
`make wasm-check` passes. The runtime includes the new guard and merged renderer.
App tests pass **160/160**; agent tests pass **41/41**. The pnpm 11 automatic
pre-run install was disabled with `pnpm_config_verify_deps_before_run=false`
to use the existing dependencies. The real native/WASM refusal and semantic
button reason match in all three releases; rerun
`node lean/Ehr/Check/check-encounter-wasm.mjs` for that integration check.

Certification is **15/15 persona baselines**, including D5. The three shared
`canonical.json` files are vendor references used as `--canonical` references;
they mix clinician roles and are recorded as **reference**, not deployable
single-role programs. Verdicts mark the persona projections **certified**.

Hospital policy (not law), owner decision 2026-11-01: pre-op orders are signed
only by physicians or surgeons. `encounterRoles?` is our stand-in for production
security-class order privileges. The guard uses the same encounter matcher as
entry requirements and shows “Pre-op orders are signed by a physician or surgeon”.
`np_preop_never_signs` proves refusal for every program, event and state. The
three pre-op entries keep their original permissions and cannot be waived.
The blocking attending route, element, entry waivers and simulated response
were removed; high-alert nurse double checks and CURES review waivers remain.
See [cosignature research](design/ehr-ui-research.md#cosignature).

One canonical EHR serves everyone. Each persona's v0 is the canonical with that
role's permissions and pre-set view (`forPersona`). The overnight agent edits
only that persona's fork. Vendor releases merge into every fork and are
re-certified. “The canonical is certified” means every role's view passes.

`commitRoleOk` no longer depends on state. `T0_entry_values` again has its
original unconditional entry guarantee, with no no-attestation hypothesis.
The literal comparison with `264e161` removes the state argument and the waiver
hypothesis, because that revision already contains the cosign prototype. The
pre-cosign T0 entry statement is restored exactly; the guard comment describes
ordinary role permission and encounter restrictions without a cosign route.

All **17/17 core bad programs** fail their expected property with valid
navigation replays, including the NP pre-op macro; the attending-prefill seed
was removed. Sixteen catalog
seeds remain full-only. Run `python lean/Ehr/Check/certify.py --bad-only` for the
fast differential regression. The full command records the 15 persona checks,
previous-release comparisons and three vendor-reference records. Seed 13 still
removes all CURES routes; the old W1-only mutation had a valid receipt escape.

Current world-2 day-1 smoke: P1 **42/0**, P2 **22/0**, P3 **38/0**,
P4 **22/0**, P5 **18/0** completed/incomplete. See the ten-day table below.

Earlier day-1 simulator smoke (world 1, seed 7), completed / incomplete:

| Release | P1 | P2 | P3 | P4 | P5 |
|---|---:|---:|---:|---:|---:|
| v1 | 39 / 3 | 22 / 0 | 38 / 0 | 22 / 0 | 14 / 4 |
| v2 | 42 / 0 | 22 / 0 | 38 / 0 | 22 / 0 | 18 / 0 |
| v3 | 42 / 0 | 22 / 0 | 38 / 0 | 22 / 0 | 18 / 0 |

World 1 contains **15 pre-op tasks, all P5**, and none on day 1; P4 has none.
The world-1 release mismatch and dose issues are recorded with their resolutions
in [changes-requests.md](design/changes-requests.md).
Details and hashes: `lean/Ehr/Check/{certification-report,sim-smoke-report}.json`.

## Realism notes

Owner decision 2026-11-01 removes the blocking attending prototype. All fifteen
role views certify and all seventeen core bad programs fail their expected
property. The full fifty-schedule validation completes 1,284/1,284 tasks with
no incomplete tasks, floor violations or interruption-count errors. App tests:
160; agent tests: 41; world tests: 95. Native/WASM checks agree on both the
pre-op refusal reason and unit-aware doses in all three releases. The default
incremental build passes in 6.13 seconds. `lake check`, Comparator and the
63-theorem audit pass with no unexpected axioms. WASM was rebuilt and its
source manifest is current.

Pre-op/surgical-day work is routed only to the surgical team (P5) in both
committed worlds. A routing regression checks every task across all ten days
and all five personas in world 1 and world 2. Clinic NPs have no pre-op order
privilege. Production cosign is a non-blocking In Basket follow-up; not modeled.

`consentVerified` is MD-entered in our spec. This is stricter than production,
where the pre-op RN verifies the signed form in the checklist. Left for later;
the element's entry permissions are unchanged.

## Simulator: world revision 2 (2026-10-31)

`runs/world/2` uses seed **1**, ten days and the same 174 Synthea fixtures as
world 1. Service orders are omitted before the v2 release on day 4. A regression
compares every task and world state with world 1: only those early service choices
change; random draws, task IDs, timings, counts and all states remain identical.
`world/releases.json` supplies release-day defaults to generator and agent.
New generator outputs, agent `run-days` without `--world`, and `make seed` select
world 2. `make run-live` also defaults to world 2 and only generates a selected
world if absent, so it does not overwrite the committed replay. Explicit world
arguments still work. Recorded `run1-P3` and its trajectories continue
to refer to world 1; no world-1 artifact was edited.

Medication doses now retain their native unit with tenths precision.
`ValueKind.medicationDose` checks the selected drug on the same order slot;
`Ehr/Formulary.lean` supplies every allowed unit and native-unit range. Insulin
and heparin accept units; albuterol accepts mg or mcg. Unknown drugs and wrong
units are refused. The separate unit selector must agree with the captured dose.
Changing drug or unit invalidates stale values and requires explicit re-entry;
Add order also refuses to leave a line with a stale dose.
No numeric value is converted to mg. Existing mg/kg ranges, kg-only weight,
absolute mg caps, MME checks and the mg-based pediatric calculator are preserved.
The albuterol inhaler has its existing absolute cap stated directly in mcg;
its nebulizer's mg/kg range is not applied to the inhaler. No new clinical range
is invented for insulin/heparin, whose existing formulary range is unspecified.

The composer obtains its unit and unit choices from Lean's formulary. FHIR writes
`doseQuantity` in mg, `ug` for mcg, or `[iU]` for insulin/heparin units; the number
is unchanged. These are UCUM codes, not a mass conversion.
[FHIR Dosage](https://www.hl7.org/fhir/R4/dosage.html),
[FDA UCUM unit table](https://www.fda.gov/industry/structured-product-labeling-resources/units-measure).
`node lean/Ehr/Check/check-dose-wasm.mjs` checks the real native/WASM guard,
composer units and explicit re-entry in all three releases.
`committed_dose_native` proves that commits recheck every captured medication
dose, including after its drug/selector changes. General T0/T2/T3/T6, A1–A4,
T4 and D1–D6 remain in the default build. This dose change adds no
`Statements.lean` diff beyond the encounter-role change described above.

Active-release validation (simulator seed **7**; completed / incomplete):

| Day | Release | P1 | P2 | P3 | P4 | P5 |
|---|---|---:|---:|---:|---:|---:|
| 1 | v1 | 42/0 | 22/0 | 38/0 | 22/0 | 18/0 |
| 2 | v1 | 40/0 | 18/0 | 51/0 | 20/0 | 14/0 |
| 3 | v1 | 35/0 | 18/0 | 44/0 | 19/0 | 19/0 |
| 4 | v2 | 40/0 | 13/0 | 41/0 | 17/0 | 11/0 |
| 5 | v2 | 23/0 | 20/0 | 37/0 | 19/0 | 17/0 |
| 6 | v2 | 41/0 | 21/0 | 32/0 | 18/0 | 11/0 |
| 7 | v3 | 40/0 | 18/0 | 54/0 | 17/0 | 14/0 |
| 8 | v3 | 39/0 | 15/0 | 38/0 | 15/0 | 12/0 |
| 9 | v3 | 39/0 | 12/0 | 44/0 | 12/0 | 11/0 |
| 10 | v3 | 39/0 | 14/0 | 45/0 | 16/0 | 9/0 |

**1,284 / 1,284 complete; zero incomplete**, across all **50 schedules**.
No task was dropped or rewritten. Day-1 determinism, effort floors and interruption
counts pass. P4 has zero pre-op tasks; all 15 pre-op tasks belong to P5 and
complete with the three direct attestations. The NP pre-op guard test proves
refusal. Exact task IDs, input/binary hashes and complaints
are in [`validation-world2.json`](../lean/Ehr/Sim/validation-world2.json).

The agent boundary uses the generated Lean types and preserves `drugClass`,
`allowed`, encounter roles and medication-dose kinds.
It round-trips every active release spec exactly, including payload contracts.
App tests pass **160/160**, agent tests **41/41**, and both TypeScript checks pass.

Simulator fixes also bind `refillDose` to the focused prescription instead of a
placeholder, attribute goal complaints to task IDs, and report impossible
explicit values before searching unrelated screens. The catalog integration
regressions retain their original Federal rules in an explicit test fixture,
so they still run while the production profile is temporarily core.

Validation: day-1 deterministic replay; **zero floor violations** and **zero
interruption violations** across all 50 schedules. Default Lean build and all
simulator test modules pass; world **93 tests**, build/typecheck and lint pass;
agent **31 tests**, typecheck and lint pass; seed script **7 tests** pass.
Reproduce with `python3 lean/Ehr/Sim/cli_smoke.py --days 10 --jobs 2 --report
lean/Ehr/Sim/validation-world2.json` (native processes inherit the 8,000,000 KiB
virtual memory cap). `--require-complete` intentionally fails until the dose
obstruction is resolved.

A separate agent-lane blocker remains before actual overnight runs:
`agent/src/lean-types.ts` rejects the active spec's Schedule II `drugClass`
condition (`entries[16].when`). See `SIM-WORLD2-AGENT-SCHEMA-2026-10-31` in
[changes-requests.md](design/changes-requests.md). Native simulation is unaffected.

## Current state

### Agent loop

`agent/` implements the nine-step overnight loop, release surfacing/migration,
try-to-break-it, replay/recording, seeded bad proposals and offline screen checks
before deploy. Claude and Codex were exercised with the fake EHR; the replay
matched prompts byte for byte without an API key. The 31-test suite is offline.
Real `check`, `simulate`, `min-clicks` and `deploy` commands are still absent
from `lean/Main.lean`; fake runs (`EHR_FAKE=1`) certify nothing and label their
manifests/certificates FAKE. `render-screens` now exists, but its adapter contract
still needs real integration verification. There is no recorded real certified
10-day × 5-persona demo run.

### World generator

Requested world work is complete. `runs/world/1/` contains a deterministic,
agent-loadable ten-day replay: all 174 Synthea patients, 1,284 tasks, 118 files,
5,476,411 bytes. All 25 formulary entries match Lean. Supply/CURES exemptions,
holds/refusals, pain, W6 steps and refill reasons use typed core fields;
remaining clinical metadata uses structured FHIR observations. P1/P5 have
imaging and procedure orders after v2. The albuterol 5 mg absolute cap and
Schedule II correspondence are resolved by `0454841`, superseding the earlier
external follow-up. Last lane checks: Lean build (125 jobs), world build/lint
and 92 tests, plus agent typecheck/lint and 31 tests, passed.

### App

The EHR route uses real Lean WASM through `app/src/core/wasmInterp.ts` and the
generic painter: `Interp.render(spec, program, bundle, user, state) → Html → paint`.
The app now selects `loadWasmInterp`; the earlier WASM-spike-only blocker is
resolved (see [WASM integration](design/wasm.md)). The fixed EHR stylesheet,
offline browser screen check and dashboard are implemented. Dashboard views
cover all six decision-transparency views, costs and recorded try-to-break-it.
`runs/mock/` remains explicitly authored MOCK data, not evidence of certification,
simulation, clinical writes or model calls. Live authenticated Medplum remains
unverified in this lane. Prior app validation passed build/lint, 87 Vitest tests,
desktop/mobile dashboard smoke and a production static/offline smoke.

## OPEN items

### Agent loop

Requested code is implemented and tested; the detailed current handoff and exact
commands are in [agent/STATUS.md](../agent/STATUS.md). Remaining operational work
belongs to the orchestrator: one real smoke night, then the full world/2 run.
No simulation nights with a live backend were run during the review fixes.

Real native check/simulate/min-clicks/deploy/render, source-compiled composites,
sandboxed presentations, build binding/rebind, exact-tree screen caching,
certified-only simulation, completion gates and canonical fallback are wired.
Migration or feature deployment failure falls back to the exact certified
persona canonical; failure of that fallback aborts. Codex is confined with bwrap,
explicit model selection and transcript auditing. A single authorized tiny live
probe verified the invocation; all simulation verification uses fake/replay.

Headline evaluation uses blind even days and both a canonical arm and a no-agent
fork carried through recertify/fallback. Even nights reuse old calibration data;
unmeasured/superseded versions stay unavailable. Per-day sample/completion counts
remain visible. Wrapper resume verifies existing builds plus source/harness/world
fingerprints and never rebuilds; copied run JSON is excluded from app identity.

Future optional work includes native composite syntax/proofs and deciding
whether visual assertion failures should enter a model repair loop. Neither is
needed for the current declarative compiler and fail-closed screen gates.

### World generator

No outstanding requested world work or unfinished world proof remains. The
previous unspecified-albuterol-cap request is resolved; retain the contract
and determinism checks below when upstream types or formulary values change.

### App

1. **Generated Html adoption.** Replace the explicitly temporary mirror in
   `app/src/ehr/html.ts` with compatible generated Html/Tag/Attr. The generated
   types now exist; review their shape and painter compatibility. Event/Value
   and session StepOutput already use generated types.
2. **Real replay integration.** WASM init/step/view/render/facts and deployed
   inputs are wired on the EHR route. Finish exercising real recorded-run
   dashboard contexts through the injectable Interp seam; the mock must never
   become an automatic fallback for real runs.
3. **Deploy screen coverage.** The agent invokes the browser gate before
   deploy; verify that the real pipeline exports every candidate screen/state
   and sample-patient tree. Keep failures blocking publication. Browser setup
   and reproducible samples are in `app/README.md`.
4. **Authenticated Medplum.** Exercise with local credentials. Existing tests
   cover pagination and the offline data boundary, not a live authenticated run.
5. **Owner review.** Confirm adoption/removal of the task-authorized temporary
   app-local Html mirror. The app work changed no Lean specs, properties,
   data-format declarations or Comparator statements.

## Agent operational reference

`src/`, `test/` and bare agent filenames in this section are relative to
`agent/`; other project paths are relative to the repository root.

### Implemented pieces

| Piece | File(s) | Notes |
|---|---|---|
| Backends behind one interface | `src/agent.ts` (`AgentBackend.proposeCandidates` / `chooseCandidates`), `src/backends/*` | `claude`: `@anthropic-ai/sdk`, `claude-opus-5-5` (override with `AGENT_MODEL`), structured JSON output via `output_config.format`, adaptive thinking, effort `high` (`AGENT_EFFORT`), server-side refusal fallback (`fallbacks: "default"`), streaming, cached system prompt, key from `ANTHROPIC_API_KEY`. `codex`: isolated `codex exec --json -m <resolved-model> --output-schema … --sandbox read-only --ephemeral -o … -` under bwrap, exposing only runtime/TLS files and its private request directory. The resolved CLI/env/config model is always explicit; served model is recorded only when JSON events expose it. `replay`: reads `<run>/llm/<callId>.json` and reports whether today's prompt matches the recording byte for byte. Every call (full system prompt, user prompt, response, model, served-by model) is recorded. Every decision record names its backend and model (for replay, the original backend and model too). |
| Schemas | `src/schema.ts`, `src/lean-types.ts` | Candidate: an RFC 6902 patch plus id, summary, moveType, rationale, targets, predicted savings, `seeded`/`seededKind`. Patch paths may use `[id=…]` / `[tag=…]` selectors (and `[id=…]+` to insert after an element); they are resolved to plain indexes before each op runs. DecisionRecord covers every field in BRIEF §10 (details below). Lean formats use the **generated** `lean/generated/ehr-types.ts`, with hand-written zod validators typed `z.ZodType<Generated>` and round-trip tested against `ehr-samples.ts`. |
| `ehr` adapter | `src/ehr.ts`, `src/fake/*` | Wraps `check`, `simulate`, `min-clicks`, `deploy`, `run-batch`, and `spec-export`, passing JSON through temp files and stdout. `EHR_FAKE=1` switches to a clearly labeled fake (structural heuristics plus a crude cost model) for tests. |
| Nightly loop | `src/night.ts` | All 9 steps of BRIEF §9 (listed below). |
| Modes | `src/modes.ts` | `surface-feature` (v2), `migrate` (v3), `try-to-break-it`. |
| Tempting bad proposals | `src/seeded.ts` | Allergy list moved into an unopened tab, patient-ID re-entry pre-filled, weight pre-filled from a pound source. Built generically from program structure. One is injected per night only while that kind has not yet been rejected in the run (`--seed-policy until-each-rejected`, the default; also `every-night` and `none`). Injected candidates are labeled `seeded: true`. They are never eligible for deployment. If one ever passes the checker, the record is flagged `OWNER REVIEW`. |
| Orchestrator | `src/run.ts`, `src/store.ts` | Each work-day: login (loads `programs/<P>/deployed.json`), simulate the shift, logout, then the night. The night is surface-feature before the v2 day (Day 4), migrate before the v3 day (Day 7), and nightly otherwise. Only certified versions are deployed, and they take effect at the next login. After the run, accepted versions are matched to their next actual blind even-day measurement; superseded versions remain explicitly unmeasured. |
| Re-run one night | `src/adhoc.ts` | Rebuilds a night's state from a run directory and re-runs it into `<run>/adhoc/…`. For live demos. |
| Tests | `test/*.test.ts` (82 tests, vitest, fake/replay simulation backends plus native certificate and real-fingerprint regressions) | One fake night per persona gives a valid record (via the replay backend). Rejected candidates are logged with counterexamples. No validation or test data appears in any captured prompt. Also covered: release modes, try-to-break-it, the adapter contract (stub binary), validators against Lean samples, and JSON Patch. |

#### Nightly loop steps (`src/night.ts`)
1. **Observe.** `summarizeTrain` builds evidence from TRAIN days only: interaction counts by screen, redundant prompts, unused receipts, buried-info searches, alert popups and overrides, backtracks, the complaint log, per-workflow averages, % above floor, and order mix.
2. **Hypothesize** and 3. **generate** 3–5 candidates in one LLM call.
4. **Pre-screen.** `ehr check` on each candidate. Passing candidates also get `ehr simulate` on the last 2 train days, old versus new program.
5. **Choose.** The LLM picks one candidate or a set with no overlapping patches, and gives a rationale against the alternatives. If its answer is unusable, the loop falls back deterministically.
6. **Certify** the merged program. On failure, the counterexample goes back to the LLM, up to 3 repairs, and every attempt is logged.
7. **Validate.** Replay a held-out task partition of the most recent PAST odd calibration day with an independent seed through `Holdout`. Odd days 1/3/5/7/9 calibrate; even days 2/4/6/8/10 are blind headline measurements and never select changes. Require full validation completion and no completion regression.
8. **Simulated user response.**
9. **Record and deploy** with `ehr deploy`.

#### Release modes (`src/modes.ts`)
- **`surface-feature` (v2).** Re-checks the program against v2. The LLM decides, from this persona's own traces, whether and where to surface the panel. Candidates are checked, validated, and deployed. If the panel is not surfaced, the unchanged program is recertified under v2.
- **`migrate` (v3).** Re-checks against v3. On failure, the LLM gets the release notes, the spec diff, the Lean spec module text, the vendor's canonical changes, the counterexample, and the customization history, and proposes a minimal patch (≤ 3 attempts, with counterexample feedback). If that fails, the fallback is the exact certified v3 persona canonical; the user is flagged. This also applies when deployment or screen infrastructure fails. If canonical check/validation/screen/deploy fails, abort loudly.
- **`try-to-break-it`.** The LLM implements a free-text request as one candidate. The loop runs check and returns the verdict and counterexample. Nothing is deployed.

#### Decision record fields
night; persona; owner; mode; spec version; versions before and after; backend, model, and `replayOf`; ehr mode; evidence; hypothesis; candidates (each with its checker verdict, counterexample, train estimate, and components moved); chosen change with rationale and rejected alternatives; predicted savings; certification attempts; validation; measured outcome (validation and test replay metrics, % above floor, min clicks per workflow, whether the prediction held); user response; certificate; deployed paths; outcome; release info (recheck, release items, surfaced, customizations kept/dropped, fallback, flagged user); flags; LLM call references.

### Commands

```sh
# full run (writes runs/<run-id>/{manifest.json,programs,certs,decisions,days,llm,summary.json})
pnpm --filter agent run-days --days 10 --backend claude|codex|replay --world runs/world/<seed> \
     [--replay-from runs/<run-id>] [--personas P1,P3] [--seed-policy until-each-rejected|every-night|none] \
     [--run-id ID] [--runs-root DIR] [--model M] [--v2-day 4] [--v2-day 7]

# re-run one night of an existing run (mode from the calendar, or --mode nightly|surface-feature|migrate)
pnpm --filter agent night --run runs/<run-id> --persona P3 --night 6 --backend claude

# live "try to break it" (record once with a live backend; replay the same request offline)
pnpm --filter agent try-to-break-it --persona P1 --request "hide the allergy box to make signing faster" \
     --backend claude (--run runs/<run-id> | --world runs/world/<seed>) [--out DIR]
pnpm --filter agent try-to-break-it ... --backend replay --replay-from <dir from the live call>

# until real certification/simulation commands land: fake world + fake ehr (tests and smoke runs only)
EHR_FAKE=1 pnpm --filter agent fake-world --out /tmp/world
EHR_FAKE=1 pnpm --filter agent run-days --days 10 --backend replay --replay-from <run> --world /tmp/world

pnpm --filter agent test | typecheck | lint
```

Environment variables: `ANTHROPIC_API_KEY`, `AGENT_MODEL`, `AGENT_EFFORT`, `CODEX_MODEL`, `CODEX_BIN`, `EHR_BIN` (default `lean/.lake/build/bin/ehr`), and `EHR_FAKE=1`.

### Adapter contracts (confirm with owning lanes)

#### `ehr` CLI
The real CLI (`lean/Main.lean`) has `init`, `step`, `view`, `run-batch <file.jsonl>`, and `spec-export <name>`. The adapter matches `run-batch` (JSONL `BatchCase` in, JSONL `BatchStep` out) and `spec-export <name>`. The commands below remain **assumptions**. `render-screens` is also implemented; the agent contract expects `--spec <ver> --program P.json --fhir <bundle.json> --out <dir>`, producing `<screenId>.json` or `<screenId>__<state>.json` for offline checking. `test/ehr-adapter.test.ts` pins them; edit `src/ehr.ts` when the real ones land.

| Command | Assumed output |
|---|---|
| `ehr check --spec <ver> --program P.json --prev PREV.json --canonical C.json` | stdout `Verdict` (`"ok"` or `{"violation":{property,message,counterexample,screens}}`); exit 0 = ok, exit 1 = violation (stdout is parsed either way) |
| `ehr simulate --spec <ver> --program P.json --persona PersonaParams.json --schedule DaySchedule.json --world <worldDir> --seed <n>` | stdout `DayResult` |
| `ehr min-clicks --spec <ver> --program P.json --schedule DaySchedule.json --world <worldDir>` | stdout `{ "tasks": [{ "task", "workflow"?, "clicks", "keystrokes" }] }` (not generated yet; mirrored in `lean-types.ts`) |
| `ehr deploy --spec <ver> --program P.json --prev PREV.json --canonical C.json --out <runDir>` | stdout `Certificate` (exit 0), or `Verdict` (exit 1) when refused (T4) |

`--spec` takes a spec module version name: `v1`, `v2`, or `v3`. The spec is compiled into the checker and is never passed in as JSON.

#### World and release inputs
- **Property names** in verdicts follow `lean/Ehr/Props/Properties.lean` (`ReviewsBeforeCommit`, `HumanOnlyKept`, `UnitsRight`, `WithinBudgets`, …). `seeded.ts:rejectionKind` matches them case-insensitively to count the three required rejections.
- **World layout** (`src/world.ts`; now exported and loader-tested by world):
  - `runs/world/<seed>/world.json`: `{ seed, days, personas, users? }`
  - `personas/<P>.json`: `PersonaParams`
  - `schedules/day-<NN>/<P>.json`: `DaySchedule`
  - patient bundles and facts are found by `ehr simulate --world <dir>`
  - simulate seed = `worldSeed*1000 + day`
- **Release inputs** (`src/releases.ts`; confirm against published content):
  - `releases/<ver>/spec.json` (or `ehr spec-export <ver>`)
  - `releases/<ver>/canonical.json` (v1 may instead be `programs/canonical/v0.json`)
  - `releases/<ver>/RELEASE_NOTES.md`
  - `lean/Ehr/Specs/{V1,V2,V3}.lean`, whose text is given to the LLM as the spec diff
- **v2 component kind.** The fake fixture uses `{"priorAuthStatus": {"scope": "…"}}`. Until the generated `Kind` union includes the real kind, unknown one-constructor kinds are accepted as `FutureKind`.

Sample bundles for the screen check come from run-days `--fhir a.json,b.json`
or `EHR_SAMPLE_FHIR`. With no samples, real screen checking fails closed,
including day-1 canonical deployment, and aborts with a clear error. Gate order
is `ehr check`, `ehr render-screens` + `pnpm --filter app screen-check`, then
`ehr deploy`. The decision stores `screenCheck` beside `certificate`; failures
record source `screen-check`, property `ScreenCheck`, failing screens and
outcome `screen-check-failed`.

### Policies pending owner review

1. **Release nights are dedicated to the release.** Night 3 is surface-feature only and night 6 is migrate only; there is no separate optimization pass those nights. This keeps one record per persona per night (BRIEF §10).
2. **Acceptance rules.**
   - Nightly: the validation replay improves at least one of clicks, scroll count, scroll pixels or mouse-travel pixels. Counts cannot regress; pixel metrics allow 2% + 1px tolerance. Every validation task completes, completion cannot regress, and the stability budget holds. Keystrokes are secondary; timing estimates are not used.
   - Surface-feature: require full completion, no completion regression, and the same physical-interaction non-regression tolerances.
   - Migration: require check, full validation completion/no regression and current whole-version screen gates. Compare against the certified release canonical; fall back to that exact canonical on any deployment failure, and abort if it cannot pass.
3. **"Prediction held"** compares measured physical-interaction savings with predicted savings (50% threshold for positive predictions); timing is not used.
4. **Test measurement** uses the next actual blind even day on which the accepted version was measured. Superseded/out-of-window versions are explicitly unmeasured; night 9 is measured on day 10. Reports show each day’s task/completion count and compare both the active-release persona canonical and the deterministic no-agent recertify/fallback fork, with identical schedules and seeds. Agent-only savings use the no-agent arm; canonical differences include vendor/fork drift.
5. **Simulated user revert** happens at night step 8, before deploy. Probability = min(0.3, 0.05 + 0.03 × components moved), seeded per (world seed, night, persona).
6. **Min clicks** are reported as the per-workflow mean over the last train day's tasks, for workflows whose minimum changed.

### Integration pitfalls

- **Lean `Option` fields are omitted keys** (`parent?`, `hotkey?`, `copyOf?`, `linkedFrom?`, `waivedBy?`, …), never `null` in output. A JSON-Patch `replace` on an absent key fails, as RFC 6902 requires. Use `add`. The system prompt tells the LLM this.
- **Patch selectors** `[id=…]` / `[tag=…]` (and `+` for "after") resolve just before each op. The stored patch keeps selectors, so it stays portable across versions; migration fallback uses the exact new certified persona canonical without replaying customization patches.
- **Integrity.** Prompts are built only in `src/prompts.ts`, from train-only inputs. The held-out partition of past odd days is reachable only through `Holdout.validate`; even-day schedules/results never enter selection prompts. Do not pass DayResults of later days, or validation/test metrics, into history or prompts. The test in `test/night.test.ts` injects `LEAKCHECK-day-N` markers and will catch it.
- **Determinism.** Seeds derive from the world seed (simulate: `seed*1000+day`; user revert: hash of world seed, night, persona), not the run id, so replay runs reproduce decisions exactly. Recorded prompts are compared byte for byte (`promptMatched`). Do not put timestamps or run ids in prompts.
- **Claude.** Opus 5.5 cannot disable thinking and rejects forced `tool_choice`. The backend uses `output_config.format` (JSON schema), `thinking: {type:'adaptive'}`, effort `high`, and `fallbacks:'default'` with beta `server-side-fallback-2026-07-01`, via `client.beta.messages.stream(...).finalMessage()`. Patch values travel as `valueJson` strings, because strict schemas cannot express arbitrary JSON.
- **Codex** runs under a bwrap filesystem with a private request directory and auth-only CODEX_HOME. Repository, home, world and release files are unavailable. Shell/web tools are disabled; filesystem/tool events reject the response, while todo/error metadata is recognized.
- **Lockfile.** Merges with other lanes conflict on `pnpm-lock.yaml`. Take main's (`git checkout --theirs pnpm-lock.yaml`), run `pnpm install`, and commit.
- **TS config.** The agent uses `moduleResolution: Bundler` so the generated `lean/generated/ehr-types.ts` (no `"type":"module"` above it) type-checks under `verbatimModuleSyntax`.
- **The fake ehr is a crude stand-in.** Its "checker" is a set of structural heuristics, not the verified checker. Never present `EHR_FAKE=1` runs as certified. The manifest and certificates say FAKE.

### Prior live verification (fake EHR, real models)

- **Claude, nightly** (P1, night 1). Five schema-valid candidates, all patches applied. One seeded rejection was logged. The choice rationale weighed the train estimates against the stability budget and how predictable each change was. The change was deployed. Predicted 13 s/day saved; measured 4.8 s, so the prediction is recorded as not held.
- **Claude, release nights** (P1 and P3). v2 was not surfaced for either, with persona-specific reasons. v3 migrations certified on the first attempt, mapped to R2-1…R2-4.
- **Codex,** `try-to-break-it` ("hide the allergy box"): implemented, rejected with `ReviewsBeforeCommit` plus a click path.
- **Replay** of the Claude run with `ANTHROPIC_API_KEY` unset: identical decisions, `promptMatched: true`.

Agent milestones: `3f5ad14` scaffold, `a804953` contracts/integrity tests,
`bcbc197` generated Lean types, `bb2bec0` ad-hoc night and property names,
`d2610e4` screen-check deploy gate. The lane stopped with no half-written work.

## World operational reference

### Run and consumer layout

`runs/world/1/` is generated from `fixtures/synthea/index.json`: 174 patients,
124 adults, 50 pediatric, 17 penicillin-allergic; seed 1, ten workdays starting
2026-11-02. It contains 1,284 tasks in 118 files, 5,476,411 bytes (< 15 MB):

- `world.json`: `{seed, days, personas}` for `agent/src/world.ts`.
- `personas/P1.json` … `P5.json`: PersonaParams matching the agent defaults
  and BRIEF section 6. Behavior parameters do not change clinical choices.
- `schedules/day-01/P1.json` … `day-10/P5.json`: agent-compatible DaySchedule.
- `day-1-P1.json` … `day-10-P5.json`: identical flat schedule aliases.
- `state-day-0.json` … `state-day-10.json`: world-owned carry-over state.
- `manifest.json`: fixtures/source, patient counts, per-day loads and all files.

Fixture paths in the manifest are relative to the repository root. No patient
bundles are copied into the run (the committed source fixtures are reused).
Every committed state and both schedule layouts are checked against fresh
output, and every schedule round-trips through the actual Lean JSON decoder
and encoder. TS enum values come from generated Lean TS. No Lean proof or
mirrored executable safety logic was added by world.

Volumes: P1 clinic days 17–20 W1 visits; ED 12–22 arrivals; P4 12–22 visits,
including flu shots; OR days 2–4 cases. P3 shift census averages 9.1 (7–11,
with one urgent surgical surge above the routine cap of 10). Excess pediatric
rechecks roll forward explicitly; flu-shot visits reserve capacity.

After the day-4 v2 release, the replay has 8 P1 imaging + 8 P1 procedure
orders, and 7 P5 imaging + 5 P5 procedure orders. Service codes are internal
demo catalog slugs (not claimed to be CPT codes). P1 covers MRI/therapy and
screening referrals; P5 covers surgical imaging and booked procedures.

### Typed conventions

- Medication `drug` is the lowercase generic formulary name. `doseTenths` is
  in `unit`; hydrocodone–acetaminophen uses the hydrocodone component's dose.
- Imaging/procedures use `kind`, a nonempty `code` and an indication, with
  empty `drug`, zero dose, unit `none`, empty route/frequency, and `prn=false`.
  Services never appear in `administer` or active ward regimens.
- `OrderChoice.supplyDays` and `curesExemptReason` carry outpatient controlled
  Rx facts. Short ED/postoperative supplies (<=7 days) have setting-specific
  exemption slugs. Chronic prescriptions do not receive that exemption.
- `holdReason` applies per order. `patient-refused` distinguishes refusal;
  other slugs describe holds. Held admission orders are emitted in the task,
  excluded from the active regimen; held/refused ward doses stay in the task's
  `administer` decisions with their reason, not as actual given doses.
- `TaskChoices.painScore` carries pre-dose and reassessment scores; the latter
  also has the genuine note-section ID `painReassessment`. `w6Step` is
  consult/preop/postop/rounding/discharge. `refillReason` carries deny/modify
  reasons. Approval renews the contained FHIR prescription (with 30-day supply
  for controlled refills); modification supplies a replacement typed order.
- Clinical metadata with no dedicated core field uses `Observation` resources
  in `todayResources`, coding system `urn:vgi:world:clinical`:
  `naloxoneOffer` (coded accepted/declined), `prnReason` (coded nausea/anxiety),
  `sedationScore` (integer). IDs are task-derived and timestamps use task time.
  No clinical facts remain encoded in colon-delimited note-section strings.
- Defaulted JSON fields are always emitted; absent Option fields are omitted.
  The strict world schemas reject mixed drug/service representations.

### Validation and commands

Run Lean first, then world tests: the contract suite starts exactly one lake
process. Never run it alongside another Lean build.

```sh
cd lean && lake build
# return to repository root
pnpm --filter world build
pnpm --filter world lint
pnpm --filter world test
pnpm --filter world gen --seed 1 --days 10
```

Last checks: Lean build passes (125 jobs, its existing axiom audit reports only
propext/Classical.choice/Quot.sound); world build/lint and all 92 tests pass.
The actual agent world loader is exercised by the CLI integration test.
Agent typecheck/lint and all 31 tests pass with the typed core contract.

Sandbox pnpm note: its default store is outside writable roots. Installed with
`CI=true pnpm install --frozen-lockfile --store-dir /tmp/vgi-world-pnpm-store`;
used `pnpm --config.verify-deps-before-run=false --filter ...` for scripts to
avoid an automatic reinstall into the inaccessible default store. No root
pnpm files were directly modified.

Determinism: each day hashes seed/day/previous state. Use independent RNG
streams, never Math.random or wall-clock dates. Regenerate the committed run
whenever generator output changes. Existing tests also cover admissions to
P3, discharge follow-ups, pending results, surgical flow and pediatric growth.

World milestones: `c207c90` formulary/Synthea alignment, `d2cd527` native
loader layout, `d5303af` clinical/determinism checks, `b6d3bf7` initial replay,
`ab800c2` typed-core migration and clinical observations, `0454841` final
albuterol cap/Schedule II sync. Regenerating seed 1 after the last change left
all 118 files unchanged. Lean's audit reported only `propext`,
`Classical.choice`, `Quot.sound`; release-extension theorems used no axioms.

## App operational reference

`src/` paths in this section are relative to `app/`.

`/dashboard?run=mock` implements all six decision-transparency views, plus cost
curves and a recorded try-to-break-it panel. Evolution nodes link to full Why
records; failed proposals and release rechecks link to event-by-event
counterexamples. Screens in counterexamples, paired task replay, divergence and
migration reports all use `Interp.init/step/render` and the existing painter.
The fixed EHR stylesheet and generic painter are unchanged by this dashboard.
Dashboard styles are scoped away from EHR controls and table contents.

The app imports `DecisionRecord`, `Candidate`, Program, DayResult, certificate
and event validators directly from `agent/src/schema.ts`. A Vite plugin serves
`runs/` and indexes agent directories; production builds copy their JSON plus a
static dashboard directory index. Run and view selections are in the URL.
Read-only static run requests have a dedicated, path-constrained data boundary;
all Medplum access remains in its original data module.

`runs/mock/` is an authored, prominently labeled MOCK run with five workflows,
three seeded bad proposals, both vendor releases, five distinct migrations,
P3's rejected collapsed drawer then repaired MAR, and a recorded break attempt.
Every certificate, decision and saving is illustrative; no checker, simulator,
LLM or clinical write occurred. Regenerate with `pnpm --filter app mock-run`.

The replay seam is injectable through `<Dashboard interpFactory={...} />`.
The explicit mock adapter lives in `src/mock/replay.ts`; a real run never falls
back to it. `replay.json` supplies opaque spec/bundle/user contexts and paired
same-task traces; version/spec-specific contexts are supported. Its cumulative
`klmDeciSec` is distinct from agent trace `t` (shift clock). Input contract and
WASM wiring example are in `app/README.md`. Real WASM can use this seam without changing views, agent schemas, or the painter; verify real-run replay contexts as tracked above.

Cost charts use only `measured.test`, never evidence or validation values.
Clicks, scroll count/distance and mouse travel (keys secondary), available click floors, and
popups/task are directly labeled in persona colors, with busy/quiet day labels
and a complete accessible data table. The break panel is explicitly recorded
replay: audience text is never misrepresented as a fresh checker result.

Validation: required app build/lint/test pass (87 Vitest tests). The dashboard
Playwright smoke passes at desktop and 390px widths, opens every view, steps a
counterexample and paired trace, checks five final UIs and ten migration
screens, and displays the recorded break verdict. Evolution, paired replay and
cost charts have also been rendered for visual review. No agent/, lean/, or
wasm/ files were edited by the dashboard implementation.

Production smoke: served `app/dist/` with a plain Python static server, opened
`/dashboard/` with all external requests blocked, and rendered the release view's
ten EHR screens successfully. The build has no dashboard CSS syntax warnings;
remaining warnings concern dependency annotations and the existing bundle size.

### EHR painter integration

Implemented owner decision (Oct 31): the EHR route is now
`Interp.render(spec, program, bundle, user, state) → Html JSON → paint`.
The 82-line generic painter uses the exact §9 tag/attribute/class vocabulary,
constructor-keyed Lean JSON, generated Event/Value types, and no clinical or
component-kind logic. It drops unsupported vocabulary with development reports.
The session forwards opaque state and bundles; no runtime tree validator,
certification check, guard, or clinical decision is introduced in the real seam.
The zod tree validator runs in the offline release check and tests.

The single `src/ehr.css` defines exactly the 58 §9.1 classes, with a dense banner,
sidebar, navigation, forms, record tables, trend, alert and action styles. A parsed
CSS policy test compares directly with the design document and rejects hiding,
clipping, zero sizes, negative offsets, positioned overlays and other concealment.
Modal styling stays in document flow. The old Mantine EHR renderer, info adapters,
chart shell, stylesheet and renderer tests are removed. Mantine/Medplum components
remain for sign-in and the development persona picker.

The explicitly selected **MOCK** interpreter emits complete W1 page trees with
all panel rows and trend points. Its component interpretation lives only in
`src/mock/page.ts`; its legacy ScreenView/spec/state fixtures remain private to
the mock. It supports navigation, editing, tabs and group expansion. Signing,
receipts, confirmation, clinical alert evaluation and macros still require the
real Lean interpreter; the mock labels itself uncertified and does no writes.

Validation:
- `pnpm --filter app build`, `lint`, and `test` pass.
- Random tree fidelity (250 cases), all tags, every event/value kind, whitelist
  dropping, CSS policy, session forwarding, W1 navigation, and data boundary tests.
- `screen-check` passed 15 W1 trees at 1440px and 390px widths, including history,
  collapsed reconciliation and expanded laboratory orders (30 screens).
- Browser regression tests detect zero bounds, off-page content, transparency,
  subminimum fonts and occlusion. A required hidden-input fixture returns exit 1.
- Main-route Chromium screenshot reviewed locally. Every check uses the same
  painter and stylesheet imports as the main route.

## Workflow complexity lane

`pnpm complexity --run <id>` builds `runs/<id>/complexity.json` and the frozen
canonical union report at `programs/benchmarks/canonical-complexity.json`.
`pnpm complexity` computes canonical only; `--no-canonical` computes just a run.
Build the real native `ehr` first. `EHR_LEAN_DIR` / `EHR_BIN` can select a matching
external build; this lane built in `/tmp` without modifying Lean sources.
The measurement adapter under `scripts/complexity/` imports Lean's existing
certified search, goal derivation, interpreter, operator model and floor.

The benchmark freezes one representative case per W1–W7, including three surgical
steps on one patient. See [benchmark README](../programs/benchmarks/README.md).
The immutable release assets under `programs/benchmarks/releases/` are copied
from the merged run branch, with its full revision recorded in suite.json.
Main's newer release contracts have additional clinical obligations, so using
them would change historical run semantics. Never silently substitute them for
the release that certified the recorded iteration. Benchmark clinical choices
missing from stock TaskChoices (diagnosis, service level, refill count) are
pinned as existing Goals by the adapter; stock `ehr min-clicks` outputs remain
verbatim beside the pinned paths. Directed search is exact only in its reported
space; neither JSON nor chart claims a global optimum. Geometry describes the minimum-click path when a matching Chromium atlas exists; missing geometry is unavailable. Fields/screens/popups are replay-derived. Raw historical timing fields remain archived and are not used.

The `run-days` CLI now computes the run report after completing a real run,
without repeating the canonical calculation. Use `--no-complexity` to skip this
postprocessing explicitly. A failed benchmark propagates an error after the
run's clinical artifacts have been saved; no partial report is published.
Five-persona manifests and both recorded program/certificate layouts are
supported. Authoritative roles, not daily schedule volume, determine projection.

Dashboard: `/dashboard?run=run1-P3&view=Workflow+complexity` has physical-interaction metric
switches, directly labeled workflow stacks, floors, vendor/rejection markers,
shared-scale persona panels and exact tables with v0 deltas. It uses existing
persona colors and the read-only dashboard JSON boundary. Files are new except
for the Dashboard import/tab/render registration. Screenshot:
`app/shots/final (supersedes earlier captures)` (desktop); Playwright also checks the 390px viewport.

P3 W4 union, for its fixed insulin/assessment case: v0 = 25 clicks, 39 keys;
v1–v7 = 23 clicks, 39 keys. Historical timing estimates are archived and not used. The floor is
14 clicks, 20 keys, two screen visits, 13 required fields and one
popup. No daily task-count denominator is used. The current outputs report
`navigationDirected` for the native and pinned minima.

Verification: app build/lint and 132 unit tests; agent typecheck/lint and 36
unit tests; benchmark's three audit tests; desktop and narrow Playwright
complexity smoke. The merge exposed the agent's schema dropping newer release
metadata and not accepting clinical predicates; the adapter now validates those
predicate forms and preserves opaque optional metadata for Lean to validate.

Future release revisions: if a run's v0 canonical shape differs from the frozen
run1 release assets, the command automatically uses current `releases/`.
`--release-root <directory>` overrides this selection for another archived
contract. The output records the chosen directory. Cases with missing clinical
evidence fail closed; they must be updated deliberately for a new contract.

## All task trajectories

After each real `run-days` run, run this one-line postprocessing step from the
repository root (replace the id): `pnpm trajectories --run run1-P3`.
The indexer stays separate from `run-days` because it needs a matching native
Lean build in addition to the simulator binary. Build only with
`cd lean; ulimit -v 8000000; LEAN_NUM_THREADS=6 lake build ehr`.
`EHR_LEAN_DIR` and `EHR_BIN` can select an existing matching build.

`runs/<id>/trajectories/index.json` contains every task, metrics and recorded
ideal-interface floor, completion, patient/fixture identity, program/spec paths,
user and schedule resources. Compact `tasks/<id>.json` files hold each exact
event slice and clinical episode contexts: facts input plus `init`/clock seeds.
The dashboard fetches the index only after opening Trajectories and task files
only on selection. Persona controls, day, and task search choose the replay.
Play/pause/step/scrub drive the real WASM interpreter and semantic UI painter;
gold outlines show the next event's component and counters accumulate trace ops.

Reconstruction calls production `loadFacts`, `taskEpisodes`, goal derivation,
`init` and `step` through `scripts/trajectories/Contexts.lean`, outside `lean/`.
It materializes Synthea fullUrl UUIDs, merges resources cumulatively per patient
within the day, carries receipts between tasks/episodes, and preserves episode
resets. Each event restores the simulator's pre-step clock from its timestamp.
Historical specs are snapshotted from archived `replay.json` contexts, when
available, instead of silently substituting subsequently revised releases.
Every event's pre-step screen and result are compared in native Lean and WASM;
`verification.json` records counts, first divergent events, reconstruction and
artifact hashes. A mismatch makes the command fail and remains visible in the UI.

Generate optional v0 comparisons with `pnpm trajectories --run run1-P3 --baseline
d01-P3-W4-001,d04-P3-W4-001,d07-P3-W4-001` (keep the command on one line).
`--baseline all` selects every task. This calls `ehr simulate` with v0's release
and the original day schedule, persona and RNG seed; the full day is simulated
to preserve prior receipts/resources, then selected task slices are exported
and verified. Regenerating without `--baseline` removes comparisons from the index.

To recheck committed contexts using only Node and WASM, run
`pnpm trajectories --run run1-P3 --verify-only`. This also checks baselines without writing the archive. Its output identifies
the prior native verification as saved evidence rather than a newly executed
native check.
The native rebuild attempted on resume failed with a thread-creation error
under the required virtual-memory limit; the fresh all-task check uses WASM.

The committed run1-P3 index covers 424 tasks across ten days, 14,658 recorded
events, and three optional v0 trajectories. Schema validation and differential
tests cover three releases, episode resets, baselines and deliberately corrupted
screens/results. Run `pnpm test:trajectories` for these checks and one desktop
Chromium smoke test (`--workers=1`). Screenshot: `app/shots/final (supersedes earlier captures)`.
Never run a build alongside a browser/dev server on the memory-limited machine.

## Consolidated lane handoffs (historical evidence)

The following snapshots preserve lane findings and reproduction details. Earlier blockers and test counts describe their recorded revision; the current decisions above take precedence.

### Archived HANDOFF-check

# Check lane handoff — remaining work

Worktree `/home/saithat/Projects/VGI-check`, branch `lane/check`.

The requested task is **not complete**. No property, spec or safety rule was
weakened. Main's expanded legal catalog, all 24 seeds and five core language
features have been merged; main was fetched again after those features landed.

## Remaining work

1. **All 15 persona certifications (content).** The actual CLI rejects every
   P1–P5 candidate in v1, v2 and v3. `docs/design/changes-requests.md` section
   CHECK-2026-10-31 enumerates all 33 missing screen/commit/review pins per
   release. First failures: anticoagulantList on w1Sign for P1/P2/P4/P5;
   currentMeds on w3SuicideAssessment for P3. The NP pre-op consent permission
   obstruction also remains. Only content may repair these placements/model
   issues. The formerly passing P3 regression now requires rejection of the
   actually defective expanded canonical, explicitly linked to the request.

2. **General T1 completion (check).** Safety clauses 1–5 and 7–12, expanded
   commit contracts, scalar value witnesses and successful human entry steps
   are proved. `satisfies_of_checked_completable` is still CONDITIONAL.
   Prove arbitrary accepted-program completion from `completeFor`: navigation
   and ancestor reveal; initialization/prefill and archived-line invariants;
   fixed/current slot repairs; common allowed values and waivers; final
   reviews; finite alert acknowledgment and commit. Then assemble T1 and add
   its actual statement to Comparator. Do not claim a conditional theorem is T1.

3. **New-feature completion/phase coverage.** `CommitContracts` and
   `commitContracts` cover all five new guard families for real interpreter
   executions. The checker conservatively refuses unsupported universal
   completion claims involving external temporal evidence, missing/expired
   clocks, absent structured payloads, validators/relational dependencies, and
   capture-dependent per-line clinical predicates. `additionalCompletionIssue`
   explains why; exact action labels/default declarations are checked too.
   See CHECK-CORE-CONTRACT-DOMAIN: arbitrary records in `Completable` only
   assume medication scans are possible. UI actions cannot fabricate trusted
   evidence. Coordinate total lawful completion/refusal goals and evidence
   domain/route contracts; do not weaken guards or assume sample success is
   universal completion. Record-only clinical conditions retain conservative
   true/false/unknown coverage. Phase-wide display coverage needs integration.
   Before display contracts are adopted, extend `Spec.Extends` to preserve its
   new `displays` field and extend T8 to the five extraGuard contract families;
   current T8 covers the requested original entry/review/human/unit/alert
   projection. The concrete v1/v2/v3 specs have no display contracts.
   See CHECK-EXTENDS-DISPLAYS.

4. **Full T7 requires a contract decision.** The existing replay and failed-rule
   theorems remain proved, but full semantic rejection soundness is false for
   the conservative checker. `RejectionObstruction.T7_semantic_rejection_false`
   gives a fully Satisfies candidate rejected only because an unused reference
   workflow was removed. Keep the safety rule. Distinguish conservative
   certification failures from demonstrated semantic violations, or obtain
   owner approval for the missing trusted workflow-retention property.
   Public counterexamples still lack patient/user witnesses; a normal replay
   record does not demonstrate a pre-op-conditioned review failure. Cut paths
   also need actual violation evidence. See CHECK-T7 and CHECK-REPLAY.

5. **Intended seed-13 and seed-16 completion proofs.** Seed 13 still has the
   real cross-workflow CURES receipt escape (`Seed13Escape.lean`, retaining the
   original controlled drug). Its negative theorem uses the unrelated pre-op
   review defect and is labeled accordingly. Seed 16 is rejected and replay
   tested but still needs the intended semantic stranded-refills proof.
   All eight new legal seeds have mutation-specific negative implementations.

6. **App verdict generation (app ownership).** The app's
   `pnpm --filter app verdicts` script omits required `--canonical`; it also
   incorrectly labels exit-1 violation JSON as a checker failure. The exact
   minimal patch is in changes-requests.md. The async ownership-exception
   question remains pending; do not assume silence is approval. The stale
   16→24 assertion was fixed upstream and all 129 updated app tests now pass.
   The unchanged app verdict file remains a placeholder. The script's 70
   invocation failures were saved in `/tmp/vgi-check-script-failure-verdicts.json`
   and were not published as verdicts. Regenerate through the corrected real
   script after approval/owning-lane repair.

7. **D5 canonical navigation fixes (content/render).** The checker integration
   is now complete: `NavigationSane` and `accepted_navigation` inspect the real
   `Render.uiNav`, with a strict rule for unique labels, twelve-group/item
   limits and no orphan screens. Current canonical groups W1/W3/W6 contain
   14/17/18 screens respectively. Fix grouping/presentation without relaxing D5.
   New main also supplies optional source-only component definitions; runtime
   `use`/expansion integration is still a core pending patch, not something
   check claims to support before its owning API lands.

## Completed in this continuation

- T8 old-obligations projection, directly from actual checker acceptance:
  `T8_checked_old_obligations`, `T8_v1_to_v2`, `T8_v2_to_v3`.
  Does not assume unfinished T1. Includes the actual old static human/unit/alert
  predicates, using a proved old-element lookup preservation lemma.
  `T8_unqualified_false` is retained.
- D5 acceptance soundness over the actual semantic renderer navigation.
- Completion reachability is cached once per check. `cached_completion_eq`
  proves exact equality with the original algorithm for every program.
  Popup pair checks filter request components first; `filteredPopupRequests_iff`
  proves exact equivalence with the original safety property.
- Core guard/clinical-alert safety proof compatibility and expanded contract
  safety, plus actual human-entry construction lemmas.
- Seeds 8/9 timeout fix: closed local component/macro witnesses compile in
  10 seconds; no heartbeat increase or native_decide. Other static seed proofs
  have also been split into small, closed structural witnesses.
- Full current validation and final commit hashes: to be filled after the
  running serialized Lean build, Comparator and kernel checks finish.

## Working rules

Edit only Props/Check (plus explicitly authorized root notes and generated app
verdict output). Content, core, app and render requests go in changes-requests.md.
Use `pnpm --config.verify-deps-before-run=false`. Never overlap Lake processes;
world tests invoke one Lake process. Commit with the required Codex coauthor
footer and push each meaningful step to `origin lane/check`.


### Archived HANDOFF-content

# Content handoff

## Completed

Merged `origin/main` (`db48c49`) first. Checkpoint `792607f` is pushed; final
implementation/export checkpoint: `a0fa74c`. Branch: `lane/content`.

The canonical follows the reviewed blueprint on **45 screens**: home and W1–W7
with **9 / 3 / 7 / 5 / 6 / 9 / 5** steps. All **87** artifact-only screens are
relocated to clinical sections; the two W7 prescription screens remain. The
exhaustive ledger is `Canonical/Blueprint.lean`. Original clinical field and
commit component IDs, element/slot bindings, roles, allowed values, guards,
reviews, alerts, event windows, durable clocks and separate release/stop/refusal
routes remain. Source controls are checked against the assembled program.
Runtime goto destinations/macros use actual host IDs; no alias/orphan screens.
Content's patch/walk helpers resolve old artifact IDs through the same ledger.

- Artifact fields, human identity and independent actions are real children of
  open sections. Mandatory infos stay pinned at the root before each section,
  as current core pinning requires. No pinning or visibility rule was relaxed.
- Signature sections contain the required human-only, never-prefilled identity
  field immediately above their own Sign control. Initials/sex/age is the actual
  `identityText` validator; it was not changed to match renderer documentation.
- Search-first composers include catalog results and unsigned-order tables;
  issuance variants/W7 use the full composer. Order-set macros retain per-field
  unconfirmed defaults. The extra W1 Verify step, allergy reconfirmations, long
  composers/copied notes, history tabs and removable popups remain.
- Blueprint views include result tables/trends/flags/ranges, inbox list+preview,
  ED board, MAR scheduled-time schema/BCMA fields, flowsheet history, growth/dose
  schemas, prescription comparison, and surgical/discharge phase checklists.
  `Specs/ClinicalTables.lean` declares real adapter contracts; absent data is not
  manufactured. These declarations do not claim complete adapter implementation.
- Legal descriptions/citations remain in docstrings and catalog. Human labels
  are short. Unrestricted narratives are validated nonempty **text**, not coded
  pickers. Patient/prescriber and related identity facts use named `recordFact?`
  sources, record-confirm text and provenance; humans confirm them. Enumerations
  retain coded domains and all original allowed-value/clinical validation.
- Render already owns nav/stepper/clinical rail. Duplicate workspace navigator
  and sidebar groups are removed. Real goto buttons remain until core supports
  shell navigation events. The safety landmark remains; renderer projection of
  its extra workspace card is CR-17, not a deleted safety component.
- v3 antibiotic controls/defaults preserve distinct artifact composer bindings
  after folding. Seed 7 now removes every route to refill decision, including
  relocated host links, preserving its original unreachable-decision failure.
  All **32** permanent seeds remain. Eight replay manifests use actual exported
  programs/specs, trusted test evidence and human events.

All **308** catalog rules previously represented remain represented (29 original,
124 first pass, 155 feature pass). The **26** exact feature gaps below, **83**
L-group policy/completeness rows and **139** out-of-scope rows remain documented.
No source rule is weakened, dropped or replaced by a substitute checkbox.

## Validation

- Full `lake build`, all W1–W7 walkthroughs, every original/new artifact walk,
  all bad-program regressions and v2/v3 paths pass.
- `lake check` and Comparator pass all 18 statements. Kernel axioms are only
  propext / Quot.sound / Classical.choice; both Extends `#print axioms` audits
  report only propext. No content proof has sorry, admit, new axioms or native_decide.
  Comparator's trusted Statements sorry warnings are expected, not content proofs.
- The renderer's actual **NavSane** passes on **all 15 saved persona programs**
  (P1–P5 for v1/v2/v3), not just a parallel navigation model. Source checks
  also cover identity adjacency, retained clinical controls and pinned reviews.
- All eight native and installed-WASM feature failures replay with the intended
  hard stop and no commits. This tests runtime behavior, not manifest freshness.
- App **129**, agent **31**, world **92** tests pass. Workspace build/lint and
  agent typecheck pass. The old app seed-count failure was already fixed on main.
- P1 rooming/orders/sign inputs from an adult Synthea record pass all **8**
  desktop/narrow ARIA, visibility, legibility and fidelity tests. Nine actual
  painter PNGs and three native semantic JSON files are under
  `programs/canonical/review/P1/`; see the review README. Screens intentionally
  show missing adapter data and disabled signing rather than synthetic evidence.
- Final source generator reproduces ten artifacts byte-for-byte. Fresh native
  export reproduces **54** spec/program JSON artifacts byte-for-byte. Catalog
  audit verifies all 279 added representations, release inheritance and 32 seeds.
  `git diff --check` passes. No Core/Render/Props/Check or other lane source changed.

## Reproduction

From root (never run simultaneous Lake processes, including world contract tests):

```sh
python -B lean/Ehr/Specs/Rules/encode.py
cd lean
lake build
lake check
lake comparator
lake exe export-content
lake env lean --run Ehr/Canonical/FeatureReplays.lean ../programs/replays
lake env lean --run Ehr/Canonical/NavExports.lean
lake env lean --run Ehr/Canonical/ReviewScreens.lean ../fixtures/synthea/Aaron_Ankunding_4966bd28.json ../programs/canonical/review/P1
cd ..
python -B lean/Ehr/Canonical/export_rules.py
python -B lean/Ehr/Canonical/replay_features.py
node lean/Ehr/Canonical/replay_features_wasm.mjs
node lean/Ehr/Canonical/review_screens.mjs
```

Use `pnpm --config.store-dir=/tmp/vgi-content-pnpm-store --filter <pkg> run <script>`.
World's test suite invokes Lake internally: run it after all other Lake work.
`export-content`'s console still says 16 seeds; the actual loop exports all 32.
That owning-tools diagnostic is already requested in CR-16; no seed was removed.

## Exactly what remains

**Content-owned implementation expressible with the merged runtime: nothing left.**
The following project requirements remain real cross-lane dependencies, consolidated
in **CR-16 / CR-17** in `docs/design/changes-requests.md`:

1. **Core/render — conditional sections.** `Visibility` has only always and
   unlessReceipt, not When/clinical predicates. Sections therefore stay open,
   while original applicability guards fail closed. Add shared conditional
   visibility with unknown handling; do not invent React-only hiding.
2. **Core/render — literal attestation.** InfoSpec has no literal text field and
   Kind has no static text node. Add it and wire the exact controlled-prescription
   notice plus the hospital explanation. CR-17 provides verbatim 21 CFR
   1311.140(a)(3) text and its verified eCFR link. A short label is not the notice.
3. **Render/app — shell and section support.** Project the component banner into
   the one real banner, place the clinical rail on the left, and support actual
   interpreter events/IDs for shell nav/stepper. Preserve root pinning until
   always-open ancestor visibility is supported with the same safety guarantee.
4. **World/render/app — actual data/behavior.** Supply record-confirm identity
   sources, current clinical/phase/event/version evidence, calendars, clocks and
   InfoPayloads; populate search results, complete draft/service-order summaries,
   per-slot selection, results, inbox previews, ED status, MAR time columns,
   flowsheets, growth/reference/dose calculations and phase checklists. Real
   select/deselect, messaging/delivery and backend effects require actual events.
   Do not substitute fixture evidence or fake normal/completion states.
5. **Core/check — coverage and certification.** Enforce source row/slot completeness
   and certify actual migrated programs. No T1/T4/general-T8, deployment, external
   evidence-truth or physical-care certificate is claimed by these content tests.
6. **WASM — refresh build assets/manifest.** Installed runtime passes new external
   programs and all eight failure replays, but its source manifest predates this
   content change. The owning lane must rebuild/refresh it. Content has not
   edited app/wasm-owned artifacts to conceal stale source hashes.
7. **Adapters/authorization/effects — CR-16.** Persist the distinct artifact and
   completion/filing/release effects with current patient/episode/artifact version;
   preserve original durable anchors across navigation/transfer. Practitioner
   qualification, proxy/release policy, actual controlled-V/GHB formulary support,
   source-row completeness and the 83 L-group policies remain owning-lane work.

The original **26** precise unsupported feature rows remain:

- `cms-482.25-b5-automatic-stop`: ExpiryReq blocks actions for a known durable order, but cannot choose policy-dependent defaults when duration/dose-count is absent or run an automatic-stop scheduler. A fixed expiry on a new manual action would not implement this source rule. Needs default-policy selection plus backend auto-stop scheduling.

- `ca-statutes-fam-6929-parent-initiated-disclosure`: Clinical predicates can scope UI requirements but cannot enforce requester identity, disclosure destinations or independently applicable federal confidentiality law. Requires release-access-policy; a disclosure checkbox would not enforce it.

- `ca-statutes-hsc-123115-protected-minor-proxy`: ClinicalPredicate can identify age/service/capacity but cannot filter record resources returned to a proxy or authorize that proxy. Requires release-access-policy over resource and requester identities.

- `ca-statutes-civ-56-11-authorization-expiration`: TemporalReq compares two event timestamps, but cannot authorize a future release up to a civil-year expiration/date-or-event, evaluate revocation, or enforce requested-later/research exceptions. A deadline on documenting authorization would not enforce release access. Needs release-access-policy and civil-year/event expiry.

- `federal-rx-1306-11-emergency-quantity`: supplyDaysCeil computes days supplied, but Validation has no comparison to a patient-specific emergency-period duration. An arbitrary fixed ceiling would misstate the emergency rule. Needs bounded relational comparison to trusted emergency-period evidence.

- `federal-rx-170-315-implant-lot`, `federal-rx-170-315-implant-serial`, `federal-rx-170-315-implant-expiry`: udiGs1 validates a supported UDI string but exposes no parser output/extraction into lot, serial or expiration fields. Other issuer formats need trusted product tables. Accepting a valid UDI is not the required production-identifier parsing capability; needs a typed parser/projection and persistence binding.

- `entrenched-ismp-dosing-weight-category`: The AST can restrict kg ranges but cannot select wet/dry/dosing weight by indication, fluid status and precedence or attest the selected source. A category enum would not define the required selection rules.

- `entrenched-leapfrog-bcma-wrong-dose`: Validation has no scanned-product-strength times administered-count comparison against the active administration order. drug-name scan matching is not dose matching. Requires product identity/strength relational validation.

- `entrenched-tjc-prohibited-list`, `entrenched-ismp-abbrev-iu`, `entrenched-ismp-abbrev-qd`, `entrenched-ismp-abbrev-qod`, `entrenched-ismp-abbrev-cc`, `entrenched-ismp-abbrev-microgram`, `entrenched-ismp-abbrev-dc`, `entrenched-ismp-abbrev-units`, `entrenched-ismp-abbrev-ms`, `entrenched-ismp-abbrev-mso4`, `entrenched-ismp-abbrev-mgso4`: Validation.token constrains a whole-string alphabet/length, not forbidden tokens, case/punctuation variants or context-sensitive abbreviation replacement across narratives and rendered medication communication. A vocabulary on an additional field would leave existing text unprotected; needs token-aware text/output validation.

- `entrenched-safer-allergy-synonyms`, `entrenched-safer-environmental-allergy`: codeMember validates exact membership but cannot normalize synonym aliases or route environmental allergens into Condition rather than AllergyIntolerance. Needs terminology normalization and category-specific record routing.

- `entrenched-safer-pediatric-dose-rounding`: Fixed tenths and decimal lexical validation cannot implement weight-dependent rounding precision below 0.1 units.

- `entrenched-safer-pediatric-concentration`: No validated concentration-to-volume relation or available-product selection exists; membership alone does not calculate a safe volume.

- `entrenched-safer-maximum-daily-dose`: doseByWeight caps one dose, not the sum of dose times frequency across all active/new administrations. Requires daily aggregate arithmetic with product/unit normalization.

The **83 L-group** record-level-completeness, qualified-authorization and
release-access-policy rows retain their individual unencoded reasons; the
139 out-of-scope rows remain documented. No remaining catalog row is silently
omitted or relabeled as complete.


### Archived HANDOFF-data

# Data lane: Synthetic Hospital

Phase 1 imports historical charts. Phase 2 is implemented; see the completion
record below. Phase 1 did not modify Lean or WASM; Phase 2 rebuilds both.
Build with `LEAN_NUM_THREADS=6`, one Lake invocation at a time. No world files
were changed.

## Phase 1 artifacts and operating commands

- Immutable source manifest: `scripts/synthetic-hospital/source.json`, upstream
  commit `911f34c4ac65a508543c4b3b90c373a0cd16534d`, SHA256 for both downloads.
- `make synthetic-hospital`: fetch cached upstream files and convert with Node
  and Python3 only. Tests: `make test-synthetic-hospital`.
- 150 committed FHIR transaction bundles plus index in
  `fixtures/synthetic-hospital/`, under 10 MB uncompressed. The complete source
  has 1,268 patients, including 248 under 18. Primary selections are 30 each
  for P1–P5; overlapping fit counts are P1 95, P2 120, P3 51, P4 34, P5 90.
- `make load-synthetic-hospital` loads that exact committed cohort using the
  existing infra credentials. `make seed SYNTHETIC_HOSPITAL=1` and
  `make install SYNTHETIC_HOSPITAL=1` opt in; ordinary seed/install retain the
  existing default. No download is needed to load committed fixtures.
- `node infra/scripts/load-synthetic-hospital.mjs --verify-only` checks tagged
  resource counts and unique upstream identifiers. A full rerun exercises
  conditional creates; no resets, deletes, or clinical writes are needed.
- Medplum 5.2.13 permits at most eight entries in a transaction with conditional
  creates. `infra/scripts/synthetic-hospital-batches.mjs` chunks in dependency
  order and rewrites cross-chunk references using response locations. Each
  chunk is atomic; the whole patient import is resumable, not one atomic write.
  Provenance is last, after all of its referenced resources. Patient identifier
  is exactly `urn:vgi:synthetic-hospital|<patient_id>`. Condition search keys are
  hashed: punctuation in diagnosis names must never become FHIR token operators.
- The live app already searches all Medplum Patients and retrieves notes,
  MedicationStatements, procedures and social observations. It now also loads
  FamilyMemberHistory in the patient bundle. Imported historical encounters
  stay finished; use patient search from any persona to open their charts.
  Active work queues remain generated from world schedules, not invented from
  historical notes. Phase 1 adds no fake admissions, orders or administrations.
- Offline catalog entries carry `source` and a validated `bundlePath` for both
  cohorts. `/browse` has a Synthetic Hospital source filter; production copies
  both fixture directories. Existing Synthea defaults remain first in the list.
- Live smoke: start `pnpm --filter app exec vite --port 5195 --strictPort`, then
  `node scripts/synthetic-hospital/verify-live.mjs`. It uses one Chromium browser,
  sequentially signs in with P1–P5 persona buttons, searches for a primary-fit
  patient, opens the real chart, verifies the offline source filter and replay,
  and saves `app/shots/final (supersedes earlier captures)`. It does no clinical writes.

Source/code caveats, timestamp handling, mapping rules, commands and citation:
`scripts/synthetic-hospital/README.md`. Integer source ages are approximate at
our reference date; candidate timelines before approximate DOB are excluded.
Original note text is verbatim, including unshifted source dates. Structured
Encounter/DocumentReference dates are shifted; each note discloses that shift.
Codes are upstream assertions, not independently clinically validated codes.

## Phase 2: Notes and imported history in the certified chart

Current seam: `loadPatientBundle` includes DocumentReference and history records;
`Ehr.Render.Fhir.displayOf` currently ignores DocumentReference,
MedicationStatement, FamilyMemberHistory and social observations. The existing
`priorNotes` info and Notes tab exist in V1/canonicals, but have no note rows.
`currentMeds` currently projects MedicationRequest only. Do not fabricate orders
from home medications to make them visible. The semantic renderer is
`Ehr.Render.renderUi`; `Page.render` also remains a supported HTML output.
The plan must update both and rebuild WASM before UI validation.

1. **Display schema** (`lean/Ehr/Specs/ClinicalTables.lean`, namespace
   `Ehr.Specs.ClinicalTables`): add exactly these optional `InfoSpec` definitions,
   then include them once in `infos`:

   ```lean
   def encounterNotes : InfoSpec :=
     { id := "encounterNotes", label := "Notes", version := "notesVersion"
       payload? := some { rowFields := ["date", "type", "author", "encounter",
         "title", "text", "status", "sourceDate", "shiftDays"] } }
   def importedHistory : InfoSpec :=
     { id := "importedHistory", label := "History", version := "historyVersion"
       payload? := some { rowFields := ["kind", "item", "detail", "status", "source"]
         groupBy? := some "kind" } }
   ```

   Preserve `priorNotes`, `noteSummary` and all mandatory review contracts.
   Do not add a second `InfoSpec` with the existing `priorNotes` ID. Supply its
   missing row schema through `columns`/`withSchema` and render it as an alias of
   `encounterNotes`; new optional schema metadata must not manufacture receipts.

2. **Typed display rows** (`lean/Ehr/Render/Types.lean`, namespace `Ehr.Render`):
   add `structure NoteRow` with String fields `id`, `date`, `noteType`, `author`,
   `encounter`, `title`, `text`, `status`, `sourceDate`, `shiftDays`, `versionId`.
   Add `structure HistoryRow` with String fields `id`, `kind`, `item`, `detail`,
   `status`, `source`, `versionId`. Add `Display.notes : List NoteRow` and
   `Display.history : List HistoryRow` and initialize both to `[]` in
   `Display.empty`. Extend derived JSON instances in `Render/Json.lean` and every
   explicit Display literal; regenerate TS types/validators using the existing
   exporter, never hand-edit generated contracts. These are display records,
   not new clinical evidence or new Facts guards.

3. **Total FHIR projection** (`lean/Ehr/Render/Fhir.lean`, namespace
   `Ehr.Render.Fhir`): add the following exact definitions:

   - `isDocumentReference (r : Json) : Bool`
   - `documentVisible (r : Json) : Bool` (exclude entered-in-error; retain
     superseded/amended notes and display their status)
   - `decodeBase64Utf8 (s : String) : Option String` (pure, total, computable;
     use the existing Lean library implementation if available; otherwise add
     bounded structural byte decoding and strict UTF-8 validation)
   - `noteAttachmentText (a : Json) : String` (inline text/plain data only;
     decode failures, missing data and URL-only attachments get explicit text
     such as “Note body unavailable”; never fetch a URL or interpret HTML)
   - `noteRow (r : Json) : NoteRow` (all attachments retained in source order;
     concatenate their labeled text, join author displays and encounter refs;
     date = DocumentReference.date, else context.period.start, else creation;
     read original-date/shift extensions when supplied, without inferring them)
   - `noteRows (rs : List Json) : List NoteRow` (one row for every visible
     DocumentReference, newest date first; missing dates sort last)
   - `medicationStatementHistoryRow (r : Json) : HistoryRow`
   - `familyHistoryRows (r : Json) : List HistoryRow` (one row per condition;
     retain a row even when conditions are absent)
   - `socialHistoryRow (r : Json) : HistoryRow` (social-history category,
     generic CodeableConcept label and value; no source-specific patient logic)
   - `procedureHistoryRow (r : Json) : HistoryRow`
   - `historyRows (rs : List Json) : List HistoryRow` (reported home medications,
     family, social and surgical history; include unknown/text-only values;
     explicitly label MedicationStatement as reported history, not an order)
   - `notesVersionOf (rs : List Json) : Nat` and
     `historyVersionOf (rs : List Json) : Nat`, using the existing sorted
     `id@versionId` digest convention. Add default-zero `notesVersion : Nat`
     and `historyVersion : Nat` fields to `Ehr.Facts` in `Core/Types.lean`;
     extend `Ehr.factVersion` in `Core/Basics.lean` with those two named cases.
     Update `factsOf` to populate them and `displayOf`'s two new fields.
     This is a future core/data-format change; coordinate it with the core lane
     and regenerate Core JSON/TS defaults and round-trip fixtures. Do not let display versions create review
     receipts or trusted clinical facts.

   Also render the already-imported Conditions through existing problem rows
   and Coverage through the banner; keep absent dates visibly unknown.

4. **Rendering** (`lean/Ehr/Render/Ui.lean`, namespace `Ehr.Render`): add
   `noteCells (r : NoteRow) : List (String × String)` and
   `historyCells (r : HistoryRow) : List (String × String)`; extend `uiRows` for
   `"encounterNotes" | "priorNotes"` and `"importedHistory"`. Extend existing
   familyHistory/socialHistory/surgicalHistory views from the generic history
   projection, so W1/W5 history tabs also show imported data. In `Page.lean`
   extend `infoContent` with matching read-only tables. Retain this existing definition and do not introduce a second rendering path.
   Text must remain escaped through existing `.text` nodes. Preserve paragraphs
   with existing allowed text/row elements, without HTML injection or content
   clipping. No React clinical adapters or custom note renderer.

5. **Chart review navigation**: update `Ehr.Canonical.home` in
   `lean/Ehr/Canonical/Program.lean`: bind the existing Notes tab to
   `encounterNotes`, and add a History tab bound to `importedHistory` using the
   existing `tabStrip`. Keep workflow-local `priorNotes` routes as aliases.
   Verify D5 group limits and re-project P1–P5. Update corresponding blueprint
   placements only where the blueprint supplies this chart-review shell.
   Do not rewrite historical recorded programs/certificates; aliases let those
   programs show the new data on their existing note/history components.

6. **Proofs and tests**: add `noteRows_complete` and `T11_note` beside the
   existing FHIR row-coverage proofs; add `uiNotes_complete` in UiProofs and
   `T11_notes_rendered` in PanelProofs, with hypotheses for a shown Notes info
   component. Cover UTF-8/base64, missing attachment data, URL-only and wrong
   MIME types, all statuses, multiple authors/attachments, equal/missing dates,
   shifted source dates, text-only codes and every history resource kind.
   Re-run native/WASM equivalence, painter/tree and ARIA fidelity, and render
   one imported P1 and one P4 chart with notes/history. Assert count equality
   with the bundle and that text-only drugs remain visible as reported history.
   Keep all clinical guards, seeded-bad rejections and axiom audits intact.

7. **Build/deploy only after the heavy lanes finish**: coordinate the build
   slot, build Lean with the documented memory/thread limits, export releases
   and generated types, rebuild/install WASM, regenerate its asset manifest,
   re-certify affected current programs, run app build/lint/test and screen
   checks, then repeat the single-browser live smoke and save a Notes screenshot.

## A later simulation world

Leave world 2 to the sim lane. A future world generator can take the committed
index as an optional second population source, using `sourceId`, `identifier`,
`bundlePath` (or directory + file), age, flags and overlapping persona fits.
First extend the world's loader to consume these FHIR types, approximate DOB
metadata, shifted encounter dates and text-only terminology honestly. Generate
new schedules/clinical choices independently: historical narrative text is not
an order, a current admission, a verified dose, or a measured vital sign. Preserve
source tags/provenance and keep this cohort separate from held-out evaluation.
No existing world manifest, schedule or state should be modified implicitly.

## Orchestrator addition
- Imported home medications are MedicationStatement resources, but the chart's "Active medications" reads MedicationRequest, so imported patients show "No records on file". Phase 2 must surface MedicationStatement as home medications (Render/Fhir facts), labeled as home/reported meds.

## Phase 2 completion record

- Implemented `encounterNotes` / `importedHistory`, typed `NoteRow` /
  `HistoryRow`, total FHIR projection, and both certified renderers. Inline
  plain-text notes retain attachment order, author/encounter information,
  paragraphs, status, and explicitly supplied original-date/shift extensions.
  Malformed base64/UTF-8, missing data, external URLs, and other MIME types
  produce explicit unavailable-body text. Entered-in-error notes are excluded;
  superseded/amended notes remain visible. Unknown dates stay visibly unknown.
- Home medications remain MedicationStatement history. They appear under
  **Home medications (reported)** and in History; `currentMeds`, active-order
  rows, and medication guard evidence still come from MedicationRequest.
  Family, social, and procedure history use generic FHIR readers. Conditions
  and Coverage use the existing problems/banner projections.
- Core edits are exactly the two default-zero Facts fields and the two
  `factVersion` cases. `Ehr/JsonCompat.lean` supplies missing JSON version fields
  outside Core, since Lean's derived readers do not honor structure defaults.
  Malformed supplied versions still fail. Old display JSON defaults only the
  two absent row lists. No review receipts or clinical facts are manufactured.
- Added and audited note row/UI/Page completeness proofs; extended the existing
  renderer Comparator audit. Edge tests cover decoding, statuses, attachments,
  authors, dates, source extensions, text-only drugs, and all history kinds.
- Regenerated contracts with `gents`, current release canonicals and all fifteen
  persona projections, and certification/verdict artifacts. The sample exporter
  now skips full-profile fields absent from the default core profile; its three
  generated P1 UI fixtures were refreshed from the current release.
- `git fetch origin && git merge origin/main` ran before the final build;
  origin/main was already included. Lean default build, `lake check`, repository
  Comparator, `make wasm`, `make wasm-check`, all 15 persona checks and all 17
  seeded-bad rejections passed. App build/lint and all 153 tests passed; all 12
  Synthetic Hospital import tests passed.
- `verify-projection.mjs` checks imported P1/P4 chart counts, full note bodies,
  separate reported medications, and native/WASM equality for both Page and
  semantic UI. P1: 8 notes, 2 home medications, 8 history rows. P4: 3 notes,
  0 home medications, 6 history rows. Desktop/narrow imported-chart UI visibility
  and ARIA checks passed (17 tests; 3 standard duplicate-project skips), as did
  all 8 Page visibility checks.
- The live script passed P1–P5 using Vite on 5195, with no browser errors or
  clinical writes. Screenshot: `app/shots/final (supersedes earlier captures)`.
- `pnpm trajectories --run run1-P3 --verify-only`: 424 tasks / 14,658 events,
  plus 3 baselines / 137 events, **0 mismatches**. Only the verification report's
  WASM provenance hash changed. Historical programs, certificates, contexts,
  traces, and world data were not rewritten. Existing `priorNotes`,
  `socialHistory`, and `surgicalHistory` components now display their FHIR rows;
  the reported-medication group appears only when MedicationStatements exist.
  Screen IDs, selected tabs, transitions, and interpreter results are unchanged.
- Full renderer differential suite passed: 324 Synthea + Synthetic Hospital
  bundles and all 652 canonical HTML/semantic UI variants, including actual RN
  wristband acceptance/rejection and error envelopes. Both the repository
  Comparator and the extended renderer Comparator accepted the implementation
  using only `propext`, `Quot.sound`, and `Classical.choice`.
- Final WASM SHA256:
  `ca6e5a828edc038c54f583ef9f47e7b723368307d157269d470730b288027720`.
  Its rebuilt source manifest is current, and its hash matches the fresh
  trajectory verification report. Generated TypeScript samples typecheck.
- World 2 remains deferred to the simulation lane, as requested.


### Archived HANDOFF-lean-core

# Handoff: lean-core

Worktree: `/home/saithat/Projects/VGI-lean`; branch `lane/lean-core`.
Read this first. This continuation fetched and fast-forwarded main to `fe475fa`.
The optional composite-format checkpoint is `133e364` (pushed).

## Delivered in this continuation

- Init-only `ComponentDef { name, params, body }` and
  `Program.componentDefs : List ComponentDef := []`.
- Custom Program JSON preserves SOURCE definitions, accepts omission of the new
  field, and omits empty definitions. Existing generated JSON samples are
  unchanged, preserving legacy source/hash encodings. Malformed definitions
  remain parse errors. No new clinical/backend behavior is active yet.
- GenTS exports 138 types/42 real JSON samples, with optional `componentDefs`.
  Core guards cover definition/source round trips, legacy omission and malformed
  field rejection. The feature corpus now includes an unused-definition case.
- Rebuilt and installed WASM assets with the supplied `.tools` symlink to
  `/home/saithat/Projects/VGI-wasm/.tools`; binary is 1,924,963 bytes.
- The proposed constructor/expansion implementation is preserved in
  `lean/Ehr/Core/composites-pending.patch`. `git apply --check` passes. Applying
  the patch and running `cd lean && lake build Ehr.Core.Tests` passes. It includes
  `Kind.use`, total Init-only `Program.expand`, checked load helpers, a
  `wellFormed` error verdict helper, six candidate theorem/axiom audits, and
  Tiny vitals-strip guards and a satisfiable expanded witness. There are no
  `sorry`, `admit`, new axioms or `native_decide` in this patch.

**The expansion patch is NOT active in this checkpoint. Composite execution is
unfinished.** It was kept as a concrete reviewable patch so the pushed branch
continues to build while respecting the explicit prohibition on editing Render.

## Integration blocker and scope

Activating `Kind.use` makes `lean/Ehr/Render/Page.lean:157` fail its exhaustive
Kind match. The owner explicitly said not to edit `lean/Ehr/Render/**`, so no
Render source was edited. The exact dependency and presentation-key request are
in `docs/design/changes-requests.md`.

This main checkout also has no checker/deploy or simulation implementation/CLI
commands; those still exist on the owning branches. They were not merged or
edited without authorization. Scope questions about API/integration files and
owning-lane merges were sent to the user; no answer had arrived at this checkpoint.
The explicit GenTS and generated-WASM instructions were carried out.

## Verification of the buildable checkpoint

- `cd lean && lake build`: pass (143 jobs).
- `lake check`: pass, including the final repeat; default kernel accepts,
  using only `propext`, `Quot.sound`, and `Classical.choice`.
- `lake comparator`: pass, all 18 original statements, including final repeat.
- T0, T2, T3, T6, A2 and A4 remain proven, with unchanged statements and only
  permitted axioms. The earlier strengthened `commitGuard_iff` remains DRAFT
  for owner review, as in the previous handoff.
- `lake exe gents` and strict generated-sample TypeScript check: pass.
- Workspace build/lint and agent typecheck: pass.
- Agent tests: 31/31. World tests: 92/92. App: 89/90.
- App's existing main-branch failure: `tests/app.test.tsx:25` expects 16 bad
  programs, while the merged content catalog contains 24. The real-WASM fixture
  projection test passes. An owning-app change is requested; the test was not
  weakened or edited here.
- `make wasm` and `make wasm-check`: pass.
- `node lean/Ehr/Core/test-wasm-features.mjs`: pass, 255 native/WASM comparisons
  across all 85 cases (the previous 84 cases were retained).

The pending expansion patch has only targeted build/guard/axiom verification;
it has NOT passed a full build, `lake check`, Comparator, or WASM execution with
expansion enabled. Its proof integration is tracked in `TODO_PROOFS.md`.

## Exactly what's left

1. Render owner supplies the new Kind compatibility arm, or the user explicitly
   authorizes that edit. Coordinate it with applying
   `lean/Ehr/Core/composites-pending.patch` so the full build stays valid.
2. Wire source expansion into **all** API/native/WASM init/step/view/batch paths.
   Core's pending `Composite.loadInit/loadStep/loadView` fail closed and use the
   existing interpreter on expansion. Existing `Ehr.Api` entry points are still
   unchanged and do not yet call these helpers.
3. Check/deploy owners expand candidate, previous and canonical programs before
   evaluating properties, reject expansion failures as `wellFormed`, and hash
   and store the SOURCE program (including definitions). Integrate the actual
   checker `Satisfies` with expansion and finish its proof bridge. The pending
   generic property lift is not a claim of checker certification.
4. Sim owner expands before simulate/min-clicks, including policy/state-space
   inspection. Render owner expands before render/render-screens and propagates
   `composite:<name>` into UiNode as a presentation key. Do not edit Render
   without the requested authorization.
5. Once active, add the vitals-strip source/use/expanded examples to GenTS's
   samples and regenerate; verify agent/app schemas preserve definitions/args.
6. Run the full build, kernel check, Comparator and audits with expansion active;
   retain T0/T2/T3/T6/A2/A4 and every existing safety rule. Rebuild WASM again and
   add native/WASM coverage for successful uses and expansion failures. Current
   installed assets cover only the optional-format checkpoint.
7. App owner fixes the catalog-count baseline assertion and reruns all TS tests.
8. Update this handoff to the resulting exact remaining work, and push each
   meaningful step with the required Codex co-author line.

The previous handoff's five M rule groups, interpreter/API, date-parser fix and
prior proof milestones remain intact. The original L-group implementations are
still intentionally unrequested; their designs and all earlier owning-lane
integration requests remain in `docs/design/changes-requests.md`.


### Archived HANDOFF-render

# Render lane handoff

Worktree `/home/saithat/Projects/VGI-render`, branch `lane/render`.

## Completed and pushed

- Reviewed saved WIP `f58a24e`; retained the earlier shell, clinical summary,
  captured-order, human-date and full-panel proof work.
- `bc457f2`: merged main's content blueprint (45 canonical screens).
- `d7ed156`: finished saved navigator regression, removed identical nested
  section headings, and preserved the historical corpus in the exporter.
- `dadb423`: compute the interpreter view once per render, with dependent
  equality witnesses `Ctx.v_exact` and `Ctx.rebuild`. Every registered theorem
  statement is unchanged. Native orders rendering improved from 40.06 s to
  0.05 s with identical JSON. Rebuilt WASM and populated P1 samples.
- `670a748`: merged main's live app/dashboard work; resolved its generated
  manifest conflict by rebuilding WASM.
- `1108805`: bounded differential-worker memory and added coverage/hash audits.
- `1f3ebe0`: merged main's final visible-control acceptance criterion.
- `badeb5c`: committed the complete verification receipt and exact owner blockers.
- `f313bab`: merged main checkpoint `1123612` (dashboard trajectories). No Lean,
  WASM or corpus input changed; app build/lint/152 tests, trajectory tests and the
  15 P1 browser checks passed again.
- Final verification is recorded in `lean/Ehr/Render/validation.json`.

No Core/Specs/Canonical/Props/Check/Sim/app implementation was edited. App
changes authored here are generated WASM assets, P1 semantic samples and their
README, as requested. All other-lane source changes arrived through main merges.

## Preserved contracts

- One shell banner; program banners are excluded from workspace/side. Nav-tagged
  non-collapsible groups contribute real shown, enabled goto component IDs to
  nav. Blocked/hotkey controls keep their complete workspace button metadata.
- Tagged sidebar components render in side. Compact list rows preserve every
  allergy/current medication, unresolved problem, and latest vital per code.
  Full workspace panels retain full records, including resolved problems.
- D2 requires complete review rows in workspace, even when Core counts a compact
  sidebar as shown. T11 preserves each full panel's exact source ID and rows.
- Signing tables use this episode's captured medication lines, with dose/unit,
  route, frequency, duration, quantity, refills, directions, indication and
  captured prescriber details. Supplied artifact rows remain intact.
- Read-only dates are human formatted; editable values retain exact interpreter
  spelling. Reasons use spec labels. Repeated direct parent/child headings use
  a neutral inner label without losing source IDs or children.
- Cache witnesses require the exact current interpreter output. State/program
  fixture updates rebuild the cache; stale caches do not typecheck. No property,
  guard, spec rule, or theorem statement was weakened.

## Final verification

- `LEAN_NUM_THREADS=1 lake build Ehr.Render`: **passed**, 32 jobs.
- Render Comparator: **35 contracts passed**; all 35 statement signatures match
  saved WIP `f58a24e`. Kernel check of the complete render export passed.
  Axiom audits use only propext, Quot.sound and Classical.choice. Finished render
  modules contain no sorry, admit, new axioms or native_decide.
- `make wasm` and `make wasm-check`: **passed** with the authorized SDK symlinks.
  Tested WASM SHA-256:
  `7a67c34a907a7a30724eb99e51e7c011fc137de01db31b3c92a17ebf1be083bc`.
- **14,225 native/WASM variants passed**: all 9,843 variants of the 45-screen
  current canonical plus all 4,382 variants of the 132-screen historical
  canonical. Four shards per corpus; all original state bodies/indexes, every
  expanded scan probe, disjoint coverage, and one WASM/native hash audited.
  All 174 Synthea bundles match; RN wristband acceptance/rejection is exercised.
- App build/lint/**152 tests**, agent typecheck/lint/**31 tests**, world
  build/lint/**92 tests**, infra **7 tests**, generated-sample strict tsc: passed.
- Dashboard trajectory replay also passes 2 node tests and 1 browser smoke test
  on main checkpoint `1123612` (all 424 saved tasks remain available). Its test
  screenshot is preserved at `/tmp/render-final-trajectories.png`; the app-owned
  tracked image was restored after the test.
- The three populated P1 samples pass **15 browser checks** (3 intentional skips)
  and **3 screenshot checks** (6 PNGs). Rooming/orders/sign images were reviewed,
  including the populated signing table. Screenshots are under `app/shots/`.
- **Full project Lean build fails** the unchanged canonical task-completion and
  floor assertions at `Ehr/Sim/PolicyTests.lean:31–32`. The initial render failure
  during iteration was fixed and all render modules subsequently rebuilt. The
  whole-project kernel check remains blocked by that owning-lane build failure;
  the successful render-export kernel check is not a whole-project claim.

No render build/test process remains running. All eight differential shards and
both auditors finished successfully. Logs and reports are `/tmp/render-*`.

## Reproduction notes

The aggregate CLI imports the failing Sim test. The differential tests therefore
use a runtime-only native driver calling the **exact exported Core/Render API
functions**, with no replacement clinical logic. Build it with
`lean/Ehr/Render/build-native-test.sh` (one Lake process at a time). The tracked
script's driver source matches the tested source byte for byte.

Set `EHR_RENDER_NATIVE="$PWD/.tools/render-native/.lake/build/bin/render-native"`.
`prepare-shards.py` creates the four memory-bounded inputs from each complete
`states.json`; `test-wasm.mjs` accepts EHR_RENDER_SHARD_COUNT/INDEX/INPUT/REPORT;
`audit-shards.py <corpus-dir> <four-reports>` checks the exact original bodies,
scan probes, complete disjoint indexes and current binary hashes. Both the
current and historical native/WASM inputs remain in `/tmp/render-{final,legacy}-api`.
The historical spec/program are from `f58a24e`. Current P1 samples come from the
complete current release and actual checked human enter events.

For pnpm 11 in this sandbox, set
`pnpm_config_store_dir="$PWD/.tools/pnpm-store"`; its default external SQLite
store is read-only. Shared SDK links remain under this worktree's `.tools`.

## Exactly what is left

1. **Sim/content:** repair `PolicyTests.lean:31–32`, then pass the full Lean build
   and whole-project kernel check. Compiled replay of the unchanged fixture
   reports missing `ca-title22-70223-hp-24-hours:temporal026` / `:temporal027`,
   followed by the structured-display/action-label hard stop and an unreachable
   goal. Actual popups are 0 versus floor 1. Supply truthful episode context and
   required data; never fabricate completed H&P evidence or weaken assertions.
2. **App:** paint nav pairs as buttons dispatching `Event.click(compId)`, open
   available groups by default, and observe their real entries/events in fidelity.
   The current painter still treats component IDs like screen IDs and uses text.
3. **Core/content, then render:** add literal InfoSpec text, supply the exact
   21 CFR 1311.140(a)(3) notice, and render its body verbatim. The reviewed quote
   is in changes-requests.md, but the compiled spec still has no text member.
4. **Checker/content:** certify D5 against the real interactive projection. The
   45-screen workflow overview diagnostic passes; it does not certify that nav.
5. **App/infra:** complete the exact Facts.patientId Synthea wristband-token
   integration. Native/WASM acceptance/rejection is verified; this is an app/data
   integration request, not a new validator or permissive token fallback.
6. **New main requirement (render/app):** define/prove Lean `aria : UiScreen →
   AriaNode` and have app fidelity consume it (BRIEF `f60a795`). Existing proofs
   cover UiScreen and expected ARIA remains TypeScript. This new work is marked
   not started in TODO_PROOFS.md; no unfinished proof declaration is hidden.
7. **New main requirement (app/core/content):** implement `audit:buttons`,
   `docs/audits/buttons.md` and the regression gate from BRIEF `2710777`. The
   package script does not exist yet. Keep shown components and D3/T10 semantics
   intact while implementing real actions or removing them in the owning source.

All cross-lane requests and the concrete simulator diagnosis are in
`docs/design/changes-requests.md`. The requested render visual-fix verification,
WASM rebuild, sample regeneration and both complete corpus audits are finished.


### Archived HANDOFF-sim

# Handoff: sim lane

Worktree `/home/saithat/Projects/VGI-sim`, branch `lane/sim`.

## Integrated snapshot

Initially merged main `fe475fa` in `f3a4d4d`. Main advanced during validation;
merged again at `b26f772` in `bfaa352` and pushed it. The final verification below
uses that pinned revision, including its app inventory fix and semantic renderer.
`fbe18d0` fixes history proofs for the five new Core feature groups;
`9ee5345` adopts those contracts in Goals/Policy; `f82f846` adds independent
native validation workers (`--jobs`, serial by default). `85c04e8` records the
first verified checkpoint. `54489d4` fixes the exact-slot clinical dependency
edge case: an any-slot entry is fulfilled by the condition's exact binding,
so a different visible field cannot leave its predicate unknown. Every commit
has the required Codex co-author line.
Local edits are limited to sim-owned files, this handoff and the permitted
change-request document; main merges bring their owners' changes.

`guardReason_history` is **true as stated**. `State.history` is only the Back
screen list. External event times, artifact versions, calendars, clinical
sources, durable clocks and payloads are fixed Facts inputs; captures and clock
are preserved by the quotient. The new recursive clinical/validation ASTs made
whole-guard reduction expensive and prevented several old rfl proofs from
closing. Explicit helper lemmas now prove invariance for those ASTs, temporal
and expiry statuses, value goals, payload contracts, alerts and the guard.
No theorem was weakened and no heartbeat limit was raised. Every named
simulator theorem is axiom-audited, including the new helpers.

## Simulator adoption

- Patient predicates use Core's three-valued clinical evaluation. Unknown/stale
  sources conservatively apply requirements. A scenario-supplied captured-code
  discriminator used by entries, reviews, time windows, expiry, displays or
  alerts becomes a real UI capture goal, even if it is otherwise optional.
- Unspecified constrained goals can choose allowed/default/declared-record,
  trusted terminology, bounded quantity and relational candidates; every
  candidate is checked by Core. Explicit conflicting choices remain goals and
  are reported. This remains a finite candidate policy, not a universal solver.
- Entry planning defers relational values until their sources are captured and
  can confirm valid prefills. Goal completion rechecks Core's current validator.
- Temporal and durable-clock failures report named missing/invalid/overdue
  obligations. KLM time and interruptions advance the actual interpreter clock
  before each action. Sim never creates external evidence or renews an order.
- Structured-display panels are navigation goals independently of ReviewReqs;
  neither receipts nor a visible placeholder bypasses Core's payload contract.
- `FeatureTests.lean` adds 52 executable checks covering completing/rejected
  cases across all five groups, current/stale/missing sources, real predicate
  inputs, valid prefills, relational ordering, conditional time obligations,
  interruption expiry, exact-slot predicate captures and certified temporal
  minimum search.

T9's original single/joint contracts and real-interpreter replay remain intact.
Exactness is within the reported full, goalDirected or navigationDirected
space, per joint task. Search time stays fixed; there is no global/day-wide
optimality or missing-external-event scheduling claim. See `lean/Ehr/Sim/README.md`.

## Verification

- Full `cd lean && lake build`: passes, 189 jobs.
- `lake check`: passes; only propext, Quot.sound, Classical.choice.
- `lake comparator`: passes all 18 trusted core statements.
- `python3 lean/Ehr/Sim/verify_proofs.py`: passes the explicit single/joint T9
  contracts. Proof holes occur only in Comparator reference challenges.
- Fresh native ten-day sweep with `--jobs 10 --timeout-seconds 240`:
  50 schedules, all 1284 tasks retained, 1271 complete. Exactly the same 13 baseline service tasks remain
  incomplete. Zero violations across all eight floor metrics for completed
  tasks; zero interruption-retention violations. All five day-one replays are
  byte-identical at seed 123 and match the serial reports, including complaints.
  All 50 reports also match the earlier full sweep exactly. The report pins the
  actual merged-main commit; it never uses the moving origin/main reference.
  Compact results and refreshed minimum examples: `lean/Ehr/Sim/validation.json`.
  Reproduce: `python3 lean/Ehr/Sim/cli_smoke.py --days 10 --jobs 10 --timeout-seconds 240 --report /tmp/sim.json`.
  `09008cb` adds the optional per-process wall budget (serial default stays
  120 seconds). Twenty workers exceeded that budget on a busy RN schedule;
  the final ten-worker run passed with an explicit 240-second process budget.
  Clinical clocks, deadlines, goals and validation checks were unchanged.
  Workers never invoke Lake or write the shared report. `--require-complete`
  remains an intentional failure until the 13 baseline service scenarios work.
- World build/lint/tests pass (92 tests); agent typecheck/lint/tests pass (31).
- App build/lint and all 129 tests pass after the second main merge, including
  inventory, real-WASM rendering and the new semantic painter. The app owner's
  16-to-24 inventory fix is integrated; this handoff item is resolved.
- Fresh native minimum examples: day-one P1 W1-001 is 44 clicks / 223 keys;
  P3 W4-001 is 38 / 104 over two receipt-carry episodes. Both report certified
  navigationDirected exactness for each objective.
- Fresh unchanged-renewal CLI minimum `d01-P1-W7-022` still fails safely with
  no completion, reproducing the owner integration request below.

## Exactly what remains

1. **The original 13 baseline service scenarios remain incomplete:** v1 still
   lacks orderKind/orderCode declarations and composers. Content/world must provide the applicable UI or
   align release timing while retaining all requested service work. Optional
   declarations/composers exist in v2/v3; sim retains the unmet goals.
2. **CLI owner integration:** in `lean/Ehr/Cli/Sim.lean:minSchedule`, replace
   `let eps := episodes facts task.workflow task.choices` with
   `let eps := taskEpisodes facts task`. It is already imported through Policy.
   Persona simulation uses focused request context; minimum search still needs
   this adoption for unchanged renewals whose choices.orders is empty.

The app inventory item from the original handoff is resolved by main `b26f772`.
The two remaining owning-lane changes are requested in `docs/design/changes-requests.md`,
including the section "Sim revalidation after five-feature Core merge".
Production rule/FHIR-source adoption for the new language remains under Core's
existing owning-lane requests; sim's typed Facts path and all five feature
fixtures are integrated. No production spec or safety rule was changed here.

No unfinished simulator proofs remain. Do not call the project all-green while
the owning-lane items above remain.


## Archived run1 findings

Run `run1-P3` completed 424/424 tasks over ten days with a real Codex agent, ending at certified v7 after five optimization deployments. Nineteen candidate checks passed and thirteen were rejected. Its early preflight exposed missing anticoagulant review placement in other personas; the current fifteen persona views certify. The obsolete preflight outputs and duplicate sanity scripts were removed. The immutable run retains original release labels and machine paths. Timing in its raw logs is historical evidence, not the current objective.

## Cleanup verification — 2026-11-01

Removed 463 stale files (66,849,966 bytes): obsolete screenshots, old UI videos, preflight outputs, six handoffs after consolidation, duplicate scripts and duplicate audit. Kept the realism/present evidence. Twelve curated replay captures and an integrated-build walkthrough now appear in DEMO.

Fresh default Lean build: 365 jobs passed. WASM source manifest current. Certification: 15/15 personas; 23/23 bad programs rejected. Verification audit: 84 theorems, no unexpected axioms. World: 95 tests passed. Agent: 95 tests passed after building native/app artifacts. Trajectories: 424 tasks, 14,658 events plus three baselines, zero mismatches. Terminology gate leaves only the SQLite system-table name.

Clean-clone make install passed in 81.440 seconds with fresh dependencies/build and the existing Medplum stack; make run/browser verification was still running at this snapshot. Standalone smoke fails because its Inspector control expectation predates the landing-list integration. App suite, lake check and Comparator results were still pending at this snapshot. The app/src/browser/data.ts preflight ID remains for its owning lane under the source exclusion. A full-run recording and final-run re-include remain pending until the full run is chosen.
