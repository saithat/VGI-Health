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
