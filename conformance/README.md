# Held-out rule conformance

This is owner-side behavioral evaluation. The overnight designer does not receive
these scenarios, fixtures, transcripts, results, or this directory. It is separate
from the static checker and is **never a deployment gate**.

```sh
pnpm conformance --program releases/v3/personas/P1.json --spec releases/v3/spec.json
pnpm conformance --run run1-P3
pnpm conformance --canonical
pnpm test:conformance
```

Set `EHR_BIN` (or `--binary`) to a native `ehr` executable. Default locations are
`lean/.lake/build/bin/ehr` and the untracked `.cache/conformance/ehr`. If building
Lean, use `LEAN_NUM_THREADS=8`. The suite never calls a model, launches a browser,
deploys, changes a certificate, or uses a checker verdict as its oracle. Node 22+
is sufficient for the runner; isolation tests import the real TypeScript bwrap
builder and use the installed agent dependencies.

`--run` evaluates every numbered deployed executable for every persona in that
run, plus the 15 current role canonicals. It requires recorded certificates and
uses frozen certification inputs, then archived trajectory specs, then archived
replay contexts. Ambiguous/missing historical specs are errors. In `run1-P3`,
the original `v1.1` means the prior-auth feature and original `v2` means the
antibiotic release. The actual historical specs and labels are retained; current
specs are not substituted for them.
The archive is evaluated using the current native interpreter with its original
programs/specs; this is not a recreation of its historical executable. A separate
test checks both FNV certificate bindings for all eight archived revisions.

The command writes `runs/<id>/conformance.json` atomically and an adjacent Markdown
matrix. It also prints the matrix and observed failures. JSON contains the
expected outcome, observed outcome, applicability, source paths/hashes, native
binary hash, exact patient facts and concrete event trace for failures. Canonical
and standalone results default to `conformance/results/`. Exit codes: 0 all
applicable cases pass, 1 conformance failures, 2 runner/input errors. This exit
code is not connected to certification or deployment. `--jobs 1` runs serially;
the default is two independent native workers. `--scenario <substring>` runs a
diagnostic subset and writes `conformance.partial.json`, never the full run badge
artifact. Comma-separated substrings and `--out <file>` are supported.

## What is tested

`clinical.mjs` contains hand-written obligations, synthetic patient facts and
legitimate values. `scenarios.mjs` registers 200 scenarios (including the five
patient-selection scenarios in `selection.mjs`). They do not derive
expected requirements, alert triggers or allowed roles from checker decisions.
The coverage test compares this independently maintained list with the exported
core entries, reviews and alerts, so a newly introduced rule requires a test.
Optional fields and removable alerts are not invented signing obligations.

| Contract | Scenarios |
|---|---|
| Every core required entry and each legitimate commit | `entry.<commit>.<element>`, `positive.<commit>` |
| Required reviews, including allergy/medication, glucose/coagulation, abnormal results and anticoagulants | `review.*`, `receipt.*`, `positive.preop` |
| CURES, surgical seven-day exception, over-limit and invented exceptions | `cures.*` |
| Naloxone offer and education for high MME and concurrent benzodiazepine | `naloxone.*` |
| EPCS display and no receipt replacement | `review.signOrders.orderSummary`, `epcs.*` |
| Schedule II zero refills independently on two order lines | `scheduleII.*` |
| Immunization/VIS/edition/manufacturer/provider | `entry.recordImmunization.*`, `positive.recordImmunization` |
| Patient ID, wristband, medication scan and different-user check | `identity.*`, `scan.*`, `cosign.*`, corresponding entry cases |
| Kg-only/current weight and native dose units | `weight.*`, `dose.*` |
| Pre-op consent/H&P/medication holds and NP signing restriction | `preop.*`, `positive.preop` |
| V3 antibiotic indications on each order and MAR display | `v3.*` |
| V2 optional imaging/procedure prior-auth request, no drug-line pollution, no overwrite | `v2.*` |
| Refill denial and reason across both action routes | `entry.denyRefill.*`, `positive.denyRefill`, `refill.denial-via-approval-action` |
| Every interruptive/passive/removable alert, acknowledgement, repeated/changed keys and false alarms | `alert.*`, `alerts.*`, `weight.lb` |
| Human-only/never-prefill inputs, commits and review receipts | `human-only.*`, `automation.*` |
| Incomplete line cannot strand the workflow | `orders.incomplete-line-cannot-advance` |
| Patient reset and mixed-patient FHIR scoping | `patient-switch.*` |
| Empty landing, list-row opening, lookup by name/MRN, A→B reset and stale-source refusal | `selection.*` |
| Patient banner/identifiers on reachable screens | `design.*` |

Each entry case forks a reachable prefix just before that entry and attempts the
commit. It checks that the refusal names the intended missing entry. A refusal
for some unrelated missing prerequisite does not count as success. Separate
positive workflows complete through real controls and acknowledge actual alerts.
A configured enter-once link is checked against its declared source; the separate
manual dosing-weight input explicitly permitted by V1 remains a required entry.

The driver binds **semantic intents** (`element=weight`, `commit=signOrders`,
`info=allergyList`, `alert=drugAllergyOrder`) to the revision's actual controls.
It traverses goto controls, tries alternatives to hidden shortcuts, supports
navigation macros/back history, opens ancestor groups and selects tabs, then relies
on native `view` for visibility and native `step` for outcomes. No scenario names
a canonical component or screen ID. A missing/hidden/unreachable control needed
for a legitimate workflow fails with “Workflow impossible”. Layout/id mutation
tests and a native `run-batch` clinical-projection replay verify this behavior. Required workflows
are fixed per persona independently of the tested layout, so deleting the last
button cannot silently make a mandatory workflow “not applicable”.
Passive care-gap/duplicate-therapy rules explicitly target W1, and immunization
reminders target W5. They do not become ED W3 obligations merely because an ED
program also has a sign-note action. Workflow applicability is fixed separately
from control discovery and checked against all 15 reviewed baselines.

## Evidence boundaries

`exact-program` cases use the original executable unchanged. `runtime-probe`
cases make a clearly labeled copy to inject a malicious macro/default or remove
a panel to observe waiver/receipt behavior. These probe modifications are not
claimed to carry the original certificate. The separate CURES probe checker
audit records whether that specific modified program is accepted.
`programSha256` hashes source file bytes; `testedProgramSha256` hashes compact
parsed JSON. Normalize the source JSON before comparing those representations.
`adapter-probe` supplies a mixed-patient FHIR bundle to test defensive scoping.
An additional empty-medication workflow case deliberately demands more than the
encoded per-line rule: its failure is a spec/workflow gap, not evidence that an
unsafe MedicationRequest was written.

Before each clinical scenario, opt-in programs start with no open patient. The
driver finds the scenario patient's native list-row action or searches Patient
Lookup, clicks the actual supplied control, then binds matching source facts
through public `step`. These setup events have separate `selectionSteps` and
`hydrationSteps`; `steps` counts only the clinical scenario. Missing selection
paths report `could-not-open-patient`. An unselected or loading chart is distinct
from `missing-control` / “Workflow impossible”. Programs that predate the opt-in
flag keep their original start state and are labeled `legacy-preselected`.

Patient switching tests the native workspace selection/reset/binding boundary,
the native `init` episode boundary and the native FHIR projection. It does not
establish correct host networking/race handling, React
painting, database writes, EPCS authentication, actual VIS delivery, or a real
payer API. Those require separate integration evidence. The per-revision badge
is read-only evidence and does not replace any existing deployment gate.

The bwrap test calls the actual `agent/src/backends/isolation.ts` argument builder
and proves the request input is readable while the held-out directory and run
result are inaccessible. A dependency-graph assertion checks the real prompt,
manual and backend builders for references to these files. Reporting reads only
the already-written result; no agent prompt/manual gains access to the suite.

The pound-weight case observes an invalid stored unit and a signing hard stop;
that hard stop preempts a commit-time interruption. It does not claim that an
unsafe pound-weight state can reach a successful acknowledgement/sign sequence.

Historical evidence combined the original 194-scenario batch with the additional
refill-route regression evaluated against all 23 identical inputs. `merge.mjs`
checks binary/program/spec hashes and disjoint scenario IDs, retains every
existing outcome, and records both batches. It refuses overlapping scenarios;
it cannot select a later passing result over an earlier failure. A fresh
`pnpm conformance --run <id>` now runs all 200 together.
