# Conformance evidence

[Overview](../../README.md) · [Methods and reproduction](../../README.md#documentation)

The held-out suite includes explicit source-labelled minor interaction evidence
(`CriticalResults.followThrough`, `Core.Alerts.keys`): a current-medication class
alone does not establish a minor interaction.
The fixture selects class-interaction evidence for frozen specs using
`V1.minorInteractionPopupAlert` (`cond = interaction`) and minor-only evidence
for the successor. `Core.Alerts.keys` suppresses minor alerts under severe
interaction evidence. Both contracts retain the same firing and completion
assertions, without rewriting frozen rules or changing scenario applicability;
native unit fixtures exercise both conditions. Native tests default to the
checkout's built `ehr` before the optional cached binary.

The critical-result case checks
available/unresolved urgency, non-resolution by UI acknowledgment or inbox
signing, and the separate receive/document/resolve path. Immutable recorded
specifications predating that alert are explicitly inapplicable; current rules
still require the case. Optional service prior-auth cases require a surfaced
service control; a partially missing surface remains a failure. Declared-link
cases revisit through real navigation when source and destination share a screen,
so screen-entry prefills are tested without injecting captures. Target metadata
distinguishes frozen specification evidence from historical release-name aliases.
The shared `chart`
scope is part of every persona's workflow contract. The CURES-removal audit is
bound to the current program/spec/binary and must fail `completable` when neither
the report nor a reachable waiver is available; stored checker evidence never
supplies behavioral expectations. Saved reports retain source-digested refresh
provenance for the complete critical-result path and version-bound nursing
fixture, alongside the independently rerun full-suite evidence.


The high-alert order notice now has an interruptive conformance case, raising the
catalog to 202 scenarios. The earlier removable-notice case applies only to a
specification that still declares it removable, preserving frozen recordings;
current specifications must exercise acknowledgment and modal bypass refusal.

## Prior authorization in the service composer

**New specification for owner review.** When a release declares
`priorAuthRequest`, exposing either `orderKind` or `orderCode` on a screen
requires a route to a `requestPriorAuth` button and, from there, to a
human-entry `priorAuthRequest` field on the current line. Both endpoints
must carry the composer’s workflow tag. Intermediate navigation can use
shared screens. A
clinician may omit authorization for an individual order. The feature may
also be omitted entirely. Payer and service determine whether authorization
is needed. For example, some commercial plans require it for outpatient CT
and MRI. Medicare also requires it for selected hospital outpatient
procedures. [UnitedHealthcare radiology protocol](https://www.uhcprovider.com/content/dam/provider/docs/public/prior-auth/radiology/COMM-Exchange-Radiology-Prior-Auth-FAQ.pdf) · [CMS outpatient procedures](https://www.cms.gov/data-research/monitoring-programs/medicare-fee-service-compliance-programs/prior-authorization-pre-claim-review-initiatives/prior-authorization-certain-hospital-outpatient-department-opd-services).

Each route starts where the preceding action leaves the clinician. It uses
the existing workflow-context depth bound, always-visible navigation and
patient-independent reveal through groups and tabs. Both controls may be on
the composer, on a separate authorization screen, or on successive screens.
A refusal names the composer, its workflow and the required controls.
`accepted_servicePriorAuth` proves two consecutive runs of successful human
interpreter events from any modal-free composer state. Both end in the
specified workflow with the corresponding control returned by `shownComp?`
and marked shown in the semantic view. [Rule](../../lean/Ehr/Check/PriorAuth.lean) · [Proof](../../lean/Ehr/Check/PriorAuthSound.lean).

The independent runner still exercises rejected recordings. Its result and
the current checker verdict answer different questions. The [scenario-by-scenario
audit](../audits/conformance-formal-coverage.md) gives both results and the
remaining guarantees to formalize.

**New specification for owner review.** A request button or request field also
opts its workflow into the service composer when the release declares the
service bundle. In v2 and v3 the current-line fields are `orderKind`,
`orderCode`, `imagingPriority` and `priorAuthRequest`. The request button
precedes human entry, followed by the declared `priorAuthStatus` display.
Acceptance supplies this ordered route from the surface and from chart entry.
Entering the initial screens or following the route cannot introduce a drug
capture, including a default on a hidden field. The native service scenarios
exercise a route without drug prefills and check the resulting captures. The
ED and pediatric layouts now provide the service fields alongside the
authorization controls they already advertised. This models access to a
service request as a distinct clinical task. CMS describes its 2024 prior
authorization rule for medical items and services and explicitly excludes
drugs from the rule's prior authorization provisions. [Release bundle](../../lean/Ehr/Specs/V2.lean) · [Service route proof](../../lean/Ehr/Check/WorkflowSound.lean) · [CMS final rule fact sheet (2024)](https://www.cms.gov/newsroom/fact-sheets/cms-interoperability-prior-authorization-final-rule-cms-0057-f)

## Patient identification, medication lines and critical results

- **New specification for owner review. Patient switches.** From a selected
  chart, the clinician can reach human identity re-entry and order signing, or
  wristband scanning and administration, in the same workflow. The allergy
  list is already visible at each medication commit. Opening another patient
  clears active reviews. Binding reloads that patient's receipts and can
  restore that patient's own unsigned work. A successful commit checks the
  identity text or wristband against the currently bound facts. This addresses
  wrong-chart orders and makes allergy information available at the decision.
  The 2025 SAFER guides recommend verifying patient identity during care and
  maintaining structured allergy information for order entry.
  [Patient identification](https://healthit.gov/resources/2025-safer-guide-patient-identification/) · [Computerized provider order entry](https://healthit.gov/wp-content/uploads/2025/06/SAFER-Guide-3.-CPOE-Final.pdf)
- **New specification for owner review. Dose correction.** A medication
  signing workflow offers current-line drug selection and dose entry on both
  sides of its add-line action. The checker rejects linked dose prefills
  because the interpreter's linked lookup can fall back to another slot.
  Editing a dose preserves other lines' doses. Advancing a selected drug line
  checks its own applicable requirements, and signing checks every matching
  line with its own confirmed values. This lets clinicians correct an order
  while retaining unit, weight and prescribing safeguards on later orders.
  The 2025 SAFER CPOE guide recommends checking dosing ranges, units and
  patient-specific parameters when prescribing. [Computerized provider order entry](https://healthit.gov/wp-content/uploads/2025/06/SAFER-Guide-3.-CPOE-Final.pdf)
- **New specification for owner review. Critical results.** A workflow that
  surfaces a critical-result alert must offer a reachable result action in
  that workflow. The urgent strip also shows a result-specific clinical
  action field while an available ticket is unresolved. The responsible
  clinician can enter the action on the bound chart. Inbox signing and UI
  acknowledgement preserve the obligation. Clinical resolution requires
  receipt and a documented action. The 2025 SAFER guide recommends assigning
  follow-up responsibility and tracking action on abnormal results.
  [Test results reporting and follow-up](https://healthit.gov/resources/2025-safer-guide-test-results-reporting-and-follow-up/) · [Critical-result lifecycle](../../lean/Ehr/Multi/Critical.lean)

The checker reports the screen, workflow and missing capability. The Lean
proofs connect these checks to shown native controls, patient binding, line
guards and ticket actions. [Workflow rules](../../lean/Ehr/Check/PriorAuth.lean) · [Soundness theorems](../../lean/Ehr/Check/WorkflowSound.lean)

## Entry and medication witnesses

For the v1–v3 persona contracts, checker acceptance now implies that the clinician has a trace satisfying each applicable entry fixture. The scope is the five declared workloads, the suite's specified records and the program submitted for checking. A persona canonical determines its workload independently of the candidate's controls. The mixed vendor reference uses the candidate's persona, with the suite's role fallback when the persona is unknown. Existing mathematical examples with a custom reference retain their own contracts. [Fixture and workload definitions](../../lean/Ehr/Check/EntryCases.lean)

Each witness begins at native initialization. With patient selection enabled it clicks a supplied row, verifies the selected patient and hydrates the chart. Intermediate navigation consists of successful native goto, expand and tab events. The search proposes shortest goto routes with at most one visit per screen, bounds ancestor traversal by the number of components plus one, and replays events through the CLI's `runStep`. A signature allows at most 20 commit attempts with distinct intervening popup keys and human acknowledgments. Search failure names the fixture and failed observation. A layout may have additional routes outside these bounds. [Witness relation](../../lean/Ehr/Check/EntryWitness.lean)

The 76 core entry scenarios share 11 ordered prefixes. At each ordinary omission the checker tries the commit on a fork, verifies the first unmet guard entry and the full native refusal, and verifies that the commit was absent. From the shared prefix it enters the sample and verifies the confirmed human value on the active line. A manual linked-field variant checks the refusal. Its automatic counterpart checks the expected value and exact source provenance. Medication edits additionally require an empty code to leave the existing drug intact. The complete path signs. The two-line fixtures advance a completed first line, preserve its confirmed value, elicit a named refusal on the second line and sign after correcting that line. The weight fixtures use the suite's lb and kg inputs, dated FHIR bundles and changed linked source. [Core assertions](../../lean/Ehr/Check/EntryCases.lean) · [Medication assertions](../../lean/Ehr/Check/EntryMedication.lean)

For each declared, surfaced human-only field, the checker reproduces the suite's change to the first matching field. One copy receives a default, the other a macro and button sharing the field's parent and tab. From fresh initialization on each copy the witness observes the absence of any capture, then enters and confirms the human sample. The macro case also clicks the shown probe and checks the human-only refusal. The acceptance theorem establishes that the injection exists for every applicable field. [Probe transformations](../../lean/Ehr/Check/EntryHumanOnly.lean) · [Soundness theorems](../../lean/Ehr/Check/EntryFamilySound.lean)

These statements formalize existing scenario requirements. They certify the existence of a conforming native execution for each fixture. The JavaScript driver's route choice, arbitrary records and progress from every reachable state remain separate questions. The matrix includes a metformin prefill that masks the empty-order refusal and a pre-op-only control that hides the human exemption input in the probe encounter. Both previously passed. The matrix now has 15 accepted personas and 36 rejected bad programs. [Certification matrix](../../lean/Ehr/Check/certification-report.json)

### Checker wall time

Each cell gives the previous and updated native `ehr check` wall times in milliseconds on the same machine. The comparison alternated binary order for seven pairs per input and took each binary's median. Arguments matched the certification matrix, including the previous release persona for v2 and v3. The mixed-role canonicals kept their existing role refusal.

| Release | Mixed canonical | P1 | P2 | P3 | P4 | P5 |
|---|---:|---:|---:|---:|---:|---:|
| v1 | 900 → 948 | 742 → 770 | 758 → 779 | 779 → 777 | 764 → 789 | 783 → 822 |
| v2 | 935 → 984 | 744 → 776 | 739 → 772 | 726 → 752 | 730 → 783 | 812 → 855 |
| v3 | 929 → 985 | 746 → 776 | 739 → 778 | 746 → 771 | 747 → 784 | 826 → 868 |

Across the 15 deployable personas, the sum of medians increased from 11.381 s to 11.851 s (4.1%). The largest individual increase was 7.1%, for v2/P4. The 25% budget held for all 18 inputs.

As a separate check on the night path, the five initial `ehr.check` calls in hillclimb-3day's `lean-timings.jsonl` took 837, 852, 760, 771 and 915 ms in P1–P5 order. Replaying their recorded program, previous program, frozen specification and persona canonical with the updated CLI took 796, 777, 765, 780 and 837 ms (five-run medians). The recorded times include the host wrapper. [Preflight measurement](../../agent/src/run.ts)
