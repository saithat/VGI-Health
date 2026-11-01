# Held-out rule conformance — patient-selection follow-up, 2026-11-01

Both full commands completed against all 200 scenarios per input:

```sh
pnpm conformance --canonical --jobs 15
pnpm conformance --run run1-P3 --jobs 16
node conformance/verify.mjs run1-P3
```

| Inputs | Pass | Fail | Not applicable |
|---|---:|---:|---:|
| 15 current canonicals | 1,575 | **0** | 1,425 |
| 8 archived P3 revisions | 347 | **0** | 1,253 |
| Combined run artifact | **1,922** | **0** | **2,678** |

The imported-patient alias repair was rechecked with the regenerated native
binary. Its own/foreign-note Lean examples and Patient Lookup browser regression
also pass; the focused five-family rerun has 93 applicable passes and no failures.

The [canonical JSON](results/canonical.json) and [matrix](results/canonical.md)
are an independent full execution. The [run JSON](../runs/run1-P3/conformance.json)
and [scenario × revision matrix](../runs/run1-P3/conformance.md) include those 15
canonicals and every archived deployed revision, P3 v0–7. The independent
canonical executions agree on every outcome, observation, step count and tested
program hash. [Verification](results/verification.json) confirms 200 unique cases
per input, all original program/spec bindings, and the native binary hash.

Current programs open the scenario patient through an actual semantic list-row
action, falling back to Patient Lookup, before clinical steps begin. Selection
and host source-binding steps are counted separately. Five selection scenarios
check empty landing privacy and clinical entry refusal, opening the correct row,
lookup by name, lookup by MRN, and switching A→B. The switch establishes a real A
capture and visible private allergy, verifies reset and stale-A-source refusal,
then checks B facts/UI against a mixed-patient bundle. All 75 canonical selection
checks pass. The archived programs predate selection, retain their original
start state and are explicitly labeled `legacy-preselected`; their 40 selection
checks are not applicable. Original archived release labels/specs are preserved.

The five previously reported gap families remain at **zero failures**: their
seven regression scenarios have 83 applicable passes across these 23 inputs.
They cover CURES exemption eligibility, linked/current dosing weight, defensive
FHIR patient scoping, empty medication signing and denial through the approval
action. All legitimate positive workflows complete. No new gap was found in
this evaluation. The seven regression scenarios retain the repaired cases.

Validation: 20 suite/integrity/isolation tests and 16 dashboard/data tests pass.
The isolation tests execute the actual overnight bwrap configuration and inspect
prompt/manual builder dependencies. The production dashboard schema accepts all
23 targets and all eight deployed revision badges have zero failures. The layout
regression includes patient opening after complete clinical ID renaming and
component reordering; a separate clinical transcript reproduces with `run-batch`.

This is native interpreter/FHIR/semantic-UI evidence, using a pinned executable
hash. It does not exercise host networking, browser painting, persistence or real
clinical services. Reporting is read-only and never gates deployment. No agent,
prompt, manual or dashboard implementation changes were needed for this follow-up.
