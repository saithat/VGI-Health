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
