# Encoding plan for the content lane

Implement all 124 spec-data rules in `catalog.json`; core-feature and out-of-scope rows are not smuggled into checkbox claims. This plan changes spec/canonical content only. `scripts/rules/build_catalog.py` regenerates and validates all three outputs.

## Shared implementation contract

1. Add/reuse ElementSpec definitions in `lean/Ehr/Specs/V1.lean`, then append the entries/commits in each catalog `proposedEncoding`. Add no new When, ValueKind or AlertCond constructor in this lane. New commits are listed below; retain the existing role universe.
2. Reuse existing fields exactly where named (`postOpDiet`, `adminSite`, `arrivalMode`, `refills`, `refillRefills`). Add gates to formerly optional fields. Reuse `opTechnique`/`opTissuesRemovedAltered` across CMS/Title 22 citations, and one field/requirement per equivalent encoding. Keep distinct citation ids in the documentation map. Do not change existing chiefComplaint into coded: use `edArrivalComplaint` for the ED-specific non-empty capture.
3. New open narrative values use `.coded "nonempty-narrative"` (or the indicated named open string domain). In the current implementation every coded value must be non-empty, but domain membership is checked only with EntryReq.allowed. Render these open domains as labeled editable inputs; terminology widgets are optional UI presentation, not a guarantee. Dates/times are labeled ISO-8601 strings, without a claim of date validation. For dose-with-unit use one non-empty actual dose description; no mg-only assumption for insulin/volume doses.
4. All new fields are `.never` unless explicitly listed otherwise. No unsupported fromRecord source, clinical default, fabricated not-applicable finding or non-human safety check. A permitted default requires human confirmation. Coded allowed alternatives implement negative/exception outcomes; false required flags do not pass. Friction and humanOnly are explicit in JSON.
5. Existing screen names are listed per section; proposed screens must be added to that workflow module’s `screens` and navigator. Keep required captures reachable within design.maxDepth, one capture per element/order slot per path, and no required content in closed groups/unopened tabs. Where infos/reviews are specified, render exact displayContent via the existing named-panel binding (including all order/result rows), then pin a panel with that InfoSpec id beside the commit. No placeholders. All new reviews use shownOnCommit, version="", no receipt and no waiver; windowMin and waivedBy are null. No new alerts are proposed.
6. Dedicated artifact commits do not prove universal clinical coverage. Configure the canonical artifact action and backend mapping so the named commit exclusively creates that artifact. All prescription-issuance variants must inherit `orderSigningEntries`, `orderSigningReviews`, relevant preop requirements, interruptive alerts and human signing. `signScheduleIISeries` and `signEmergencyRxFollowup` are issuance variants; they must include all base prescription fields and shared new prescription-content constraints. New nursing/specialty-note commits inherit relevant patient/role/safety requirements. The catalog’s commits entries give allowed roles; they do not verify real licensure.
7. `fhirTarget` entries describe resource/section mapping intent, not a new untyped backend escape hatch. Use actual resource references for identity/DEA/address payloads in the backend; extension names are local mapping proposals. Add all new element ids to the content/export mapping and `docs/regulations.md`, preserving law versus entrenched labels. Implementing a section text field alone does not certify exported C-CDA, NCPDP SCRIPT, registry delivery or permanent retention.
8. Regenerate content exports with the repository’s existing content/export commands. Check canonical completeness plus the relevant guard rejection/acceptance paths; preserve existing seeded-bad behavior and all theorem/check contracts. No Types/properties weakening to make content pass.

## Special cases that prevent false compliance

- **Schedule II / W7:** `refills` has `allowed=["0"]`, `perOrderLine=true`, `.orderClass "scheduleII"` on signOrders and all issuance variants. On w7Decision, explicitly capture `drug` on the request slot and require human `refillScheduleEligibility` with `allowed=["notScheduleII"]` before approveRefill; add the conditional refillRefills zero constraint only after that slot exists. A Schedule II request routes to a fresh new-prescription composer, never to refill approval with zero repeats. Add a separate denyRefill record action so refusals remain possible. The human schedule judgment is not an automatic predicate. The core-language lane would need an explicit refill-request drug predicate for automatic checking.
- **Controlled Schedule V:** controlled-II-IV excludes V. Add `controlled-V` tags to the relevant formulary products and duplicate the indicated per-line content/readiness requirements with `.orderClass "controlled-V"`. Add `ghb` tagging for ghbMedicalNeed. Do not add fake classes to unknown drugs; document actual products supported by the finite demo formulary.
- **Naloxone education alternatives:** remove only the old naloxoneEducation entry gate from `orderSigningEntries`, replacing it with naloxoneEducationOutcome under `.naloxoneRisk`. Keep naloxoneOffer human-only. Provided/declined/educatedWithin24Months are human-reported truthful outcomes, not verified historical facts. Other overdose-risk and recipient branches remain core-feature rows.
- **Controlled signing panels:** implement the 13 named controlledSigning* payloads as live views of the selected prescription artifacts. One expanded signing-details group can contain all panels; keep it open and legible. Copy the shownOnCommit constraints to controlled Schedule V and every new issuance variant. Keep details and the legal notice visible throughout the modeled human signing action. Authentication duration and protocol correctness remain separate security/backend obligations. Missing source values must be visibly missing and resolved through the corresponding content gate; declaring an InfoSpec with a label is not payload implementation.
- **New series/emergency/specialty commits:** extra required fields are not a replacement for the base order/clinical guards. Compose requirements from existing functions and the new shared prescription content/reviews; do not maintain a less-protected parallel sign path. Dedicated series entries iterate actual orderLines; call newOrderLine and capture drug before per-line requirements can apply.
- **Record artifacts:** apply each new event/document commit to its own episode/artifact state. Do not repeatedly reuse one still-captured episode flag as proof of all administrations, all shifts or every later event. Cross-event evidence reset and historical completeness are explicitly core features. The event-specific spec-data rows capture one artifact’s content; they do not discharge those broader rules.

## Shared-screen routing

The research arrays often tag several workflows for one service artifact. Add a navigator link from each source workflow below to the shared screen, preserving patient/encounter and returning to the origin. Only the named permitted roles may execute its commit; other roles can view the record or hand it to the responsible service. A link alone is never evidence the artifact was created. ED discharge-planning fields additionally gate disposition directly; W7 new prescriptions have their own composer/sign screens and inherit all signOrders gates.

| Rule | From workflow | Shared screen / artifact gate |
| --- | --- | --- |
| cms-482.24-c4ii-admitting-diagnosis | W4 | w3Disposition / recordAdmission |
| cms-482.24-c4ii-admitting-diagnosis | W6 | w3Disposition / recordAdmission |
| ca-title22-70749-treatment-orders | W3 | w6PostOp / signTreatmentOrder |
| ca-title22-70749-treatment-orders | W4 | w6PostOp / signTreatmentOrder |
| ca-title22-70749-diet-orders | W4 | w6PostOp / signDietOrder |
| ca-title22-70749-working-diagnosis | W4 | w6Rounding / signProgressNote |
| ca-title22-70263-verbal-giver | W3 | w4VerbalOrder / recordVerbalOrder |
| ca-title22-70263-standing-circumstances | W3 | w6StandingOrders / signStandingOrder |
| ca-title22-70263-standing-circumstances | W4 | w6StandingOrders / signStandingOrder |
| ca-title22-70263-standing-conditions | W3 | w6StandingOrders / signStandingOrder |
| ca-title22-70263-standing-conditions | W4 | w6StandingOrders / signStandingOrder |
| ca-title22-70547-newborn-oxygen-target | W4 | w5OxygenOrder / signNewbornOxygenOrder |
| ca-title22-70707-consent-risks | W4 | w1Consent / documentTreatmentConsent |
| ca-title22-70707-consent-alternatives | W4 | w1Consent / documentTreatmentConsent |
| ca-statutes-hsc-11164-agent-name | W5 | w1Delegation / recordDelegatedControlledTransmission |
| ca-statutes-hsc-11164-agent-name | W7 | w1Delegation / recordDelegatedControlledTransmission |
| ca-statutes-bpc-2290-5-telehealth-document | W2 | w1Telehealth / recordTelehealthConsent |
| ca-statutes-bpc-2290-5-telehealth-document | W7 | w1Telehealth / recordTelehealthConsent |
| ca-statutes-hsc-123115-mental-record-denial-date | W1 | w2AccessReview / documentMentalHealthAccessDenial |
| ca-statutes-hsc-123115-mental-record-denial-date | W3 | w2AccessReview / documentMentalHealthAccessDenial |
| ca-statutes-hsc-123115-mental-record-denial-date | W5 | w2AccessReview / documentMentalHealthAccessDenial |
| ca-statutes-hsc-123115-mental-record-denial-consequences | W1 | w2AccessReview / documentMentalHealthAccessDenial |
| ca-statutes-hsc-123115-mental-record-denial-consequences | W3 | w2AccessReview / documentMentalHealthAccessDenial |
| ca-statutes-hsc-123115-mental-record-denial-consequences | W5 | w2AccessReview / documentMentalHealthAccessDenial |
| ca-statutes-fam-6924-mental-health-parent-contact | W1 | w5MinorConsent / documentMinorMentalHealthConsent |
| ca-statutes-fam-6924-mental-health-parent-contact | W3 | w5MinorConsent / documentMinorMentalHealthConsent |
| ca-statutes-fam-6929-substance-parent-contact | W1 | w5MinorConsent / documentMinorSubstanceCareConsent |
| ca-statutes-fam-6929-substance-parent-contact | W3 | w5MinorConsent / documentMinorSubstanceCareConsent |
| entrenched-ismp-mtx-teachback | W3 | w6Discharge / documentMethotrexateDischarge |
| entrenched-safer-result-abnormal-flag | W3 | w2Result / ackResult |
| entrenched-safer-result-abnormal-flag | W6 | w2Result / ackResult |

## Screen-by-screen changes

### W1 — 40 unique spec-data rules

#### `w1Consent` (new screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ca-title22-70707-consent-risks | consentRiskDisclosure | coded nonempty-narrative | physician,np,surgeon | never/compliance | documentTreatmentConsent | always; episode | null |
| ca-title22-70707-consent-alternatives | consentAlternativesDisclosure | coded nonempty-narrative | physician,np,surgeon | never/compliance | documentTreatmentConsent | always; episode | null |

- `ca-title22-70707-consent-risks`: Scoped treatment-consent documentation records medically significant risks discussed. It does not validate emergency exceptions, capacity, signatures or that disclosure was understood.

- `ca-title22-70707-consent-alternatives`: Add a required data capture using existing ElementSpec, CommitSpec and EntryReq; no new syntax or predicate is needed.

#### `w1Delegation` (new screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ca-statutes-hsc-11164-agent-name | controlledTransmissionAgentName | coded nonempty-narrative | physician,np,surgeon | never/compliance | recordDelegatedControlledTransmission | always; episode | null |

- `ca-statutes-hsc-11164-agent-name`: Dedicated prescriber-side delegated Schedule III–V transmission record captures agent name. It does not perform or prove transmission or the agent authorization.

#### `w1EmergencyRxFollowup` (new screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| federal-rx-1306-11-emergency-label | emergencyAuthorizationNotation | coded emergency-authorization-notation | physician,np,surgeon | never/compliance | signEmergencyRxFollowup | always; episode | ["Authorization for Emergency Dispensing"] |

- `federal-rx-1306-11-emergency-label`: Dedicated emergency-follow-up prescription artifact requires the exact notation via allowed values. It does not verify the seven-day deadline or send the artifact.

#### `w1Orders` (existing screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ca-statutes-bpc-4040-patient-name | prescriptionPatientName | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | always; perOrderLine | null |
| ca-statutes-bpc-4040-patient-address | prescriptionPatientAddress | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | always; perOrderLine | null |
| ca-statutes-bpc-4040-directions | prescriptionDirections | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | always; perOrderLine | null |
| ca-statutes-bpc-4040-license-classification | prescriberLicenseClassification | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | always; perOrderLine | null |
| ca-statutes-bpc-4040-federal-registry | prescriberFederalRegistration | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| ca-statutes-bpc-4040-federal-registry | prescriberFederalRegistration | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-04-medical-purpose | controlledMedicalPurpose | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-04-medical-purpose | controlledMedicalPurpose | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-patient-name | prescriptionPatientName | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-05-patient-name | prescriptionPatientName | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-patient-address | prescriptionPatientAddress | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-05-patient-address | prescriptionPatientAddress | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-strength | controlledProductStrength | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-05-strength | controlledProductStrength | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-dosage-form | controlledDosageForm | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-05-dosage-form | controlledDosageForm | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-directions | prescriptionDirections | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-05-directions | prescriptionDirections | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-prescriber-name | controlledPrescriberName | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-05-prescriber-name | controlledPrescriberName | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-prescriber-address | controlledPrescriberAddress | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-05-prescriber-address | controlledPrescriberAddress | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-prescriber-dea | prescriberFederalRegistration | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-05-prescriber-dea | prescriberFederalRegistration | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-ghb-need | ghbMedicalNeed | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | drugClass ghb; perOrderLine | null |
| federal-rx-1306-12-zero-refills | refills | quantity none | physician,np,surgeon | defaultConfirm/compliance | signOrders | orderClass scheduleII; perOrderLine | ["0"] |

- `ca-statutes-bpc-4040-patient-name`: Capture patient name on each prescription artifact; the chart banner does not write prescription content. Outbound serialization/delivery remains backend work.

- `ca-statutes-bpc-4040-patient-address`: Add a required data capture using existing ElementSpec, CommitSpec and EntryReq; no new syntax or predicate is needed.

- `ca-statutes-bpc-4040-directions`: Require a distinct non-empty complete sig on each prescription; dose/route/freq alone do not establish usable written directions. This gate prepares content; transmission is outside the checker.

- `ca-statutes-bpc-4040-license-classification`: Capture the license classification as prescription content; this does not verify license validity or scope.

- `ca-statutes-bpc-4040-federal-registry`: Capture registration content for controlled prescriptions. Schedule V needs its own existing drug-class data tag and duplicate EntryReq (added below); actual authority is a separate rule.

- `federal-rx-1306-04-medical-purpose`: Capture a non-empty legitimate-purpose statement on each controlled order, including Schedule V via the extra class-specific requirement below. This documents purpose; the checker does not decide medical legitimacy.

- `federal-rx-1306-05-patient-name`: Required prescription-content capture; add a parallel Schedule V requirement using the same existing orderClass constructor. Registration content does not validate legal authority; serialization/delivery is downstream.

- `federal-rx-1306-05-patient-address`: Required prescription-content capture; add a parallel Schedule V requirement using the same existing orderClass constructor. Registration content does not validate legal authority; serialization/delivery is downstream.

- `federal-rx-1306-05-strength`: Required prescription-content capture; add a parallel Schedule V requirement using the same existing orderClass constructor. Registration content does not validate legal authority; serialization/delivery is downstream.

- `federal-rx-1306-05-dosage-form`: Required prescription-content capture; add a parallel Schedule V requirement using the same existing orderClass constructor. Registration content does not validate legal authority; serialization/delivery is downstream.

- `federal-rx-1306-05-directions`: Required prescription-content capture; add a parallel Schedule V requirement using the same existing orderClass constructor. Registration content does not validate legal authority; serialization/delivery is downstream.

- `federal-rx-1306-05-prescriber-name`: Required prescription-content capture; add a parallel Schedule V requirement using the same existing orderClass constructor. Registration content does not validate legal authority; serialization/delivery is downstream.

- `federal-rx-1306-05-prescriber-address`: Required prescription-content capture; add a parallel Schedule V requirement using the same existing orderClass constructor. Registration content does not validate legal authority; serialization/delivery is downstream.

- `federal-rx-1306-05-prescriber-dea`: Required prescription-content capture; add a parallel Schedule V requirement using the same existing orderClass constructor. Registration content does not validate legal authority; serialization/delivery is downstream.

- `federal-rx-1306-05-ghb-need`: Add the ghb formulary class to relevant product entries (ordinary drug-class data), then require non-empty medical need on those lines. No new When is needed.

- `federal-rx-1306-12-zero-refills`: For new Schedule II prescriptions, require refills=0 per line under existing orderClass scheduleII. W7 has no current drug orderLines, so a conditional constraint alone is vacuous: require a human notScheduleII eligibility code on every refill decision, route Schedule II to signOrders as a new prescription, and bind a drug capture to its selected order slot when using the extra refillRefills constraint. This is an explicitly human-verified schedule gate, not automatic classification of the incoming Task.

#### `w1Rooming` (existing screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ca-statutes-hsc-1259-primary-language | primaryLanguage | coded primary-language | physician,np,surgeon,rn | never/compliance | recordCommunicationNeeds | always; episode | null |
| ca-statutes-hsc-1259-dialect | patientDialect | coded nonempty-narrative | physician,np,surgeon,rn | never/compliance | recordCommunicationNeeds | always; episode | null |

- `ca-statutes-hsc-1259-primary-language`: Capture once in a dedicated chart-update artifact, not a redundant each-visit interpreter checkbox. Reuse the recorded value in patientBanner; unknown/declined are explicit allowed local codes.

- `ca-statutes-hsc-1259-dialect`: Add a required data capture using existing ElementSpec, CommitSpec and EntryReq; no new syntax or predicate is needed.

#### `w1ScheduleIISeries` (new screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| federal-rx-1306-12-earliest-fill | earliestFillDate | coded nonempty-narrative | physician,np,surgeon | never/compliance | signScheduleIISeries | orderClass scheduleII; perOrderLine | null |
| federal-rx-1306-12-diversion-risk | seriesDiversionRiskAssessed | flag | physician,np,surgeon | never/safety/humanOnly | signScheduleIISeries | always; episode | null |

- `federal-rx-1306-12-earliest-fill`: A dedicated multiple-Schedule-II prescription artifact requires an earliest-fill date on every series line (including the first, a disclosed stricter policy). Date is a non-empty ISO-8601 string; interpreting or enforcing pharmacy fill eligibility is separate.

- `federal-rx-1306-12-diversion-risk`: Dedicated series-issuance commit requires a human prescriber conclusion that the series does not create undue diversion/abuse risk. It documents the judgment, not automated assessment of risk.

#### `w1Sign` (existing screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ca-statutes-bpc-741-education-exceptions | naloxoneEducationOutcome | coded naloxone-education-outcome | physician,np,surgeon | never/compliance/humanOnly | signOrders | naloxoneRisk; episode | ["provided", "declined", "educatedWithin24Months"] |
| federal-rx-1311-140-ready-selection | controlledReadyToSign | flag | physician,np,surgeon | never/safety/humanOnly | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1311-140-ready-selection | controlledReadyToSign | flag | physician,np,surgeon | never/safety/humanOnly | signOrders | orderClass controlled-V; perOrderLine | null |

| Rule | Info | Commit | When | Mode | Exact content binding |
| --- | --- | --- | --- | --- | --- |
| federal-rx-1311-120-display-issue-date | controlledSigningIssueDate | signOrders | orderClass controlled-II-IV | shownOnCommit | Actual issue date of every selected controlled prescription; sourced from the order artifact, never the future earliest-fill date. |
| federal-rx-1311-120-display-issue-date | controlledSigningIssueDate | signOrders | orderClass controlled-V | shownOnCommit | Actual issue date of every selected controlled prescription; sourced from the order artifact, never the future earliest-fill date. |
| federal-rx-1311-120-display-patient-name | controlledSigningPatientName | signOrders | orderClass controlled-II-IV | shownOnCommit | Patient full name on every selected controlled prescription; do not substitute initials/sex/age. |
| federal-rx-1311-120-display-patient-name | controlledSigningPatientName | signOrders | orderClass controlled-V | shownOnCommit | Patient full name on every selected controlled prescription; do not substitute initials/sex/age. |
| federal-rx-1311-120-display-drug-name | controlledSigningDrugName | signOrders | orderClass controlled-II-IV | shownOnCommit | Drug name for every selected controlled prescription line. |
| federal-rx-1311-120-display-drug-name | controlledSigningDrugName | signOrders | orderClass controlled-V | shownOnCommit | Drug name for every selected controlled prescription line. |
| federal-rx-1311-120-display-strength | controlledSigningStrength | signOrders | orderClass controlled-II-IV | shownOnCommit | Product strength for every selected controlled prescription line, distinct from dose. |
| federal-rx-1311-120-display-strength | controlledSigningStrength | signOrders | orderClass controlled-V | shownOnCommit | Product strength for every selected controlled prescription line, distinct from dose. |
| federal-rx-1311-120-display-form | controlledSigningDosageForm | signOrders | orderClass controlled-II-IV | shownOnCommit | Dosage form for every selected controlled prescription line. |
| federal-rx-1311-120-display-form | controlledSigningDosageForm | signOrders | orderClass controlled-V | shownOnCommit | Dosage form for every selected controlled prescription line. |
| federal-rx-1311-120-display-quantity | controlledSigningQuantity | signOrders | orderClass controlled-II-IV | shownOnCommit | Prescribed quantity for every selected controlled prescription line. |
| federal-rx-1311-120-display-quantity | controlledSigningQuantity | signOrders | orderClass controlled-V | shownOnCommit | Prescribed quantity for every selected controlled prescription line. |
| federal-rx-1311-120-display-directions | controlledSigningDirections | signOrders | orderClass controlled-II-IV | shownOnCommit | Complete directions for use for every selected controlled prescription line. |
| federal-rx-1311-120-display-directions | controlledSigningDirections | signOrders | orderClass controlled-V | shownOnCommit | Complete directions for use for every selected controlled prescription line. |
| federal-rx-1311-120-display-refills | controlledSigningRefills | signOrders | orderClass controlled-II-IV | shownOnCommit | Authorized repeat count for every selected Schedule III–V prescription; showing zero for Schedule II as well is a stricter display policy. |
| federal-rx-1311-120-display-refills | controlledSigningRefills | signOrders | orderClass controlled-V | shownOnCommit | Authorized repeat count for every selected Schedule III–V prescription; showing zero for Schedule II as well is a stricter display policy. |
| federal-rx-1311-120-display-earliest-fill | controlledSigningEarliestFill | signOrders | orderClass controlled-II-IV | shownOnCommit | Earliest fill date for every later Schedule II series member; show not applicable on other selected orders. |
| federal-rx-1311-120-display-earliest-fill | controlledSigningEarliestFill | signOrders | orderClass controlled-V | shownOnCommit | Earliest fill date for every later Schedule II series member; show not applicable on other selected orders. |
| federal-rx-1311-120-display-prescriber-name | controlledSigningPrescriberName | signOrders | orderClass controlled-II-IV | shownOnCommit | Prescriber full name for every selected controlled prescription. |
| federal-rx-1311-120-display-prescriber-name | controlledSigningPrescriberName | signOrders | orderClass controlled-V | shownOnCommit | Prescriber full name for every selected controlled prescription. |
| federal-rx-1311-120-display-prescriber-address | controlledSigningPrescriberAddress | signOrders | orderClass controlled-II-IV | shownOnCommit | Prescriber address for every selected controlled prescription. |
| federal-rx-1311-120-display-prescriber-address | controlledSigningPrescriberAddress | signOrders | orderClass controlled-V | shownOnCommit | Prescriber address for every selected controlled prescription. |
| federal-rx-1311-120-display-prescriber-dea | controlledSigningDea | signOrders | orderClass controlled-II-IV | shownOnCommit | Prescriber DEA registration or lawful institutional/government identification for every selected controlled prescription. |
| federal-rx-1311-120-display-prescriber-dea | controlledSigningDea | signOrders | orderClass controlled-V | shownOnCommit | Prescriber DEA registration or lawful institutional/government identification for every selected controlled prescription. |
| federal-rx-1311-140-signing-notice | controlledSigningLegalNotice | signOrders | orderClass controlled-II-IV | shownOnCommit | Display the exact legal attestation in 21 CFR 1311.140(a)(3) immediately above the Sign button; use the source text verbatim in the renderer, not this label as placeholder content. |
| federal-rx-1311-140-signing-notice | controlledSigningLegalNotice | signOrders | orderClass controlled-V | shownOnCommit | Display the exact legal attestation in 21 CFR 1311.140(a)(3) immediately above the Sign button; use the source text verbatim in the renderer, not this label as placeholder content. |

- `ca-statutes-bpc-741-education-exceptions`: Replace the old naloxoneEducation EntryReq with this coded truthful outcome under existing naloxoneRisk. The 24-month exception is a human-reported outcome, not an automatically validated historical clock; other risk eligibility remains a separate core rule.

- `federal-rx-1311-140-ready-selection`: Require an explicit human ready-for-signature selection per controlled prescription; Schedule V is added below. Edit-triggered invalidation is the separate next rule; this classification covers selection only.

- `federal-rx-1311-120-display-issue-date`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-patient-name`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-drug-name`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-strength`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-form`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-quantity`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-directions`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-refills`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-earliest-fill`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-prescriber-name`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-prescriber-address`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-prescriber-dea`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-140-signing-notice`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

#### `w1Telehealth` (new screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ca-statutes-bpc-2290-5-telehealth-document | telehealthConsentRecord | coded telehealth-consent-mode | physician,np,surgeon | never/compliance | recordTelehealthConsent | always; episode | ["verbal", "written"] |

- `ca-statutes-bpc-2290-5-telehealth-document`: Dedicated service-linked telehealth consent documentation with truthful verbal/written modes. Actual pre-care sequence remains the separate event-time rules.

### W2 — 3 unique spec-data rules

#### `w2AccessReview` (new screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ca-statutes-hsc-123115-mental-record-denial-date | mentalHealthAccessRequestDate | coded nonempty-narrative | physician,np,surgeon | never/compliance | documentMentalHealthAccessDenial | always; episode | null |
| ca-statutes-hsc-123115-mental-record-denial-consequences | mentalHealthAccessDenialConsequences | coded nonempty-narrative | physician,np,surgeon | never/compliance | documentMentalHealthAccessDenial | always; episode | null |

- `ca-statutes-hsc-123115-mental-record-denial-date`: Dedicated denial artifact captures the request date as a non-empty date string; neither deadline calculation nor denial eligibility is implied.

- `ca-statutes-hsc-123115-mental-record-denial-consequences`: Require patient-specific anticipated consequences on the denial artifact; this documents professional judgment without machine validation of the judgment.

#### `w2Result` (existing screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |

| Rule | Info | Commit | When | Mode | Exact content binding |
| --- | --- | --- | --- | --- | --- |
| entrenched-safer-result-abnormal-flag | resultAbnormalFlags | ackResult | always | shownOnCommit | Every component of the selected result with reference range and explicit abnormal flag (or normal status); retain existing resultDetail/trend reviews. |

- `entrenched-safer-result-abnormal-flag`: Add a resultAbnormalFlags InfoSpec with explicit per-result content binding and a no-receipt ackResult review. The existing abstract abnormalResult flag alone does not show that content, but a new named info is supported without a new language feature.

### W3 — 77 unique spec-data rules

#### `w3Consent` (new screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ca-title22-70707-consent-risks | consentRiskDisclosure | coded nonempty-narrative | physician,np,surgeon | never/compliance | documentTreatmentConsent | always; episode | null |
| ca-title22-70707-consent-alternatives | consentAlternativesDisclosure | coded nonempty-narrative | physician,np,surgeon | never/compliance | documentTreatmentConsent | always; episode | null |

- `ca-title22-70707-consent-risks`: Scoped treatment-consent documentation records medically significant risks discussed. It does not validate emergency exceptions, capacity, signatures or that disclosure was understood.

- `ca-title22-70707-consent-alternatives`: Add a required data capture using existing ElementSpec, CommitSpec and EntryReq; no new syntax or predicate is needed.

#### `w3Delegation` (new screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ca-statutes-hsc-11164-agent-name | controlledTransmissionAgentName | coded nonempty-narrative | physician,np,surgeon | never/compliance | recordDelegatedControlledTransmission | always; episode | null |

- `ca-statutes-hsc-11164-agent-name`: Dedicated prescriber-side delegated Schedule III–V transmission record captures agent name. It does not perform or prove transmission or the agent authorization.

#### `w3DirectDispense` (new screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ca-statutes-hsc-11158-no-more-expected | noFurtherControlledNeedExpected | flag | physician,np,surgeon | never/safety/humanOnly | authorizeDirectDispensing | always; episode | null |

- `ca-statutes-hsc-11158-no-more-expected`: Prescriber human attestation of the specific no-further-need judgment on the direct-dispensing artifact; the separate 72-hour supply limit still requires value validation.

#### `w3Disposition` (existing screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| cms-482.24-c4ii-admitting-diagnosis | admittingDiagnosis | coded icd10 | physician,np,surgeon | never/compliance | recordAdmission | always; episode | null |
| cms-482.43-a2-posthospital-needs | postHospitalNeeds | coded nonempty-narrative | physician,np,surgeon | never/compliance | disposition | always; episode | null |
| cms-482.43-a2-service-availability | postHospitalServiceAvailability | coded nonempty-narrative | physician,np,surgeon | never/compliance | disposition | always; episode | null |
| cms-482.43-a2-service-access | postHospitalServiceAccess | coded nonempty-narrative | physician,np,surgeon | never/compliance | disposition | always; episode | null |
| cms-482.43-a3-evaluation-record | dischargePlanningEvaluation | coded nonempty-narrative | physician,np,surgeon | never/compliance | disposition | always; episode | null |
| cms-482.43-a3-evaluation-discussion | dischargeEvaluationDiscussion | coded nonempty-narrative | physician,np,surgeon | never/compliance | disposition | always; episode | null |
| ca-title22-70749-discharge-course | hospitalCourse | coded nonempty-narrative | physician,np,surgeon | never/compliance | disposition | always; episode | null |
| ca-title22-70749-discharge-recommendations | futureCareRecommendations | coded nonempty-narrative | physician,np,surgeon | never/compliance | disposition | always; episode | null |
| ca-title22-70749-discharge-arrangements | futureCareArrangements | coded nonempty-narrative | physician,np,surgeon | never/compliance | disposition | always; episode | null |
| ca-title22-70413-ed-departure-time | edDepartureTime | coded nonempty-narrative | physician,np,surgeon | never/compliance | disposition | always; episode | null |
| ca-title22-70707-discharge-information | continuingCareInformationGiven | flag | physician,np,surgeon | never/compliance/humanOnly | disposition | always; episode | null |

- `cms-482.24-c4ii-admitting-diagnosis`: Add a required data capture using existing ElementSpec, CommitSpec and EntryReq; no new syntax or predicate is needed.

- `cms-482.43-a2-posthospital-needs`: Require a documented assessment or explicit no-needs/not-indicated finding on every discharge (a disclosed stricter hospital UI choice). This avoids inventing a discharge-planning When and does not prove service delivery. On the ED disposition path, duplicate this gate at disposition with truthful not-applicable findings for other dispositions (a stricter hospital UI policy).

- `cms-482.43-a2-service-availability`: Require a documented assessment or explicit no-needs/not-indicated finding on every discharge (a disclosed stricter hospital UI choice). This avoids inventing a discharge-planning When and does not prove service delivery. On the ED disposition path, duplicate this gate at disposition with truthful not-applicable findings for other dispositions (a stricter hospital UI policy).

- `cms-482.43-a2-service-access`: Require a documented assessment or explicit no-needs/not-indicated finding on every discharge (a disclosed stricter hospital UI choice). This avoids inventing a discharge-planning When and does not prove service delivery. On the ED disposition path, duplicate this gate at disposition with truthful not-applicable findings for other dispositions (a stricter hospital UI policy).

- `cms-482.43-a3-evaluation-record`: Require a documented assessment or explicit no-needs/not-indicated finding on every discharge (a disclosed stricter hospital UI choice). This avoids inventing a discharge-planning When and does not prove service delivery. On the ED disposition path, duplicate this gate at disposition with truthful not-applicable findings for other dispositions (a stricter hospital UI policy).

- `cms-482.43-a3-evaluation-discussion`: Require a documented assessment or explicit no-needs/not-indicated finding on every discharge (a disclosed stricter hospital UI choice). This avoids inventing a discharge-planning When and does not prove service delivery. On the ED disposition path, duplicate this gate at disposition with truthful not-applicable findings for other dispositions (a stricter hospital UI policy).

- `ca-title22-70749-discharge-course`: Add a required data capture using existing ElementSpec, CommitSpec and EntryReq; no new syntax or predicate is needed. On the ED disposition path, duplicate this gate at disposition with truthful not-applicable findings for other dispositions (a stricter hospital UI policy).

- `ca-title22-70749-discharge-recommendations`: Require a distinct recommendation narrative; a coded follow-up interval and generic instruction text alone do not identify all recommendations. On the ED disposition path, duplicate this gate at disposition with truthful not-applicable findings for other dispositions (a stricter hospital UI policy).

- `ca-title22-70749-discharge-arrangements`: Add a required data capture using existing ElementSpec, CommitSpec and EntryReq; no new syntax or predicate is needed. On the ED disposition path, duplicate this gate at disposition with truthful not-applicable findings for other dispositions (a stricter hospital UI policy).

- `ca-title22-70413-ed-departure-time`: Record actual departure timestamp as a non-empty ISO-8601 string; scheduled or intended departure time is not the requested value.

- `ca-title22-70707-discharge-information`: Human records continuing-care information was given before completing discharge. This is a documentation gate, not proof of patient comprehension or delivery by external systems. On the ED disposition path, duplicate this gate at disposition with truthful not-applicable findings for other dispositions (a stricter hospital UI policy).

#### `w3EmergencyRxFollowup` (new screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| federal-rx-1306-11-emergency-label | emergencyAuthorizationNotation | coded emergency-authorization-notation | physician,np,surgeon | never/compliance | signEmergencyRxFollowup | always; episode | ["Authorization for Emergency Dispensing"] |

- `federal-rx-1306-11-emergency-label`: Dedicated emergency-follow-up prescription artifact requires the exact notation via allowed values. It does not verify the seven-day deadline or send the artifact.

#### `w3Hold` (new screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ca-statutes-wic-5150-application-circumstances | holdApplicationCircumstances | coded nonempty-narrative | physician,np,surgeon | never/compliance | documentHoldApplication | always; episode | null |
| ca-statutes-wic-5150-application-probable-cause | holdApplicationProbableCause | coded nonempty-narrative | physician,np,surgeon | never/compliance | documentHoldApplication | always; episode | null |
| ca-statutes-wic-5150-application-history | holdHistoryConsidered | coded yes-no | physician,np,surgeon | never/compliance | documentHoldApplication | always; episode | ["yes", "no"] |
| ca-statutes-wic-5150-advisement-performer | holdAdvisementPerformer | coded nonempty-narrative | physician,np,surgeon | never/compliance | recordHoldAdvisement | always; episode | null |
| ca-statutes-wic-5150-advisement-date | holdAdvisementDate | coded nonempty-narrative | physician,np,surgeon | never/compliance | recordHoldAdvisement | always; episode | null |
| ca-statutes-wic-5150-advisement-completion | holdAdvisementCompletion | coded completed-not-completed | physician,np,surgeon | never/compliance | recordHoldAdvisement | always; episode | ["completed", "notCompleted"] |
| ca-statutes-wic-5150-advisement-language | holdAdvisementLanguage | coded nonempty-narrative | physician,np,surgeon | never/compliance | recordHoldAdvisement | always; episode | null |

- `ca-statutes-wic-5150-application-circumstances`: New dedicated 5150 application/advisement artifact captures this atomic record item; this does not authorize detention, establish actor qualification, or enforce the detention clock.

- `ca-statutes-wic-5150-application-probable-cause`: New dedicated 5150 application/advisement artifact captures this atomic record item; this does not authorize detention, establish actor qualification, or enforce the detention clock.

- `ca-statutes-wic-5150-application-history`: New dedicated 5150 application/advisement artifact captures this atomic record item; this does not authorize detention, establish actor qualification, or enforce the detention clock.

- `ca-statutes-wic-5150-advisement-performer`: New dedicated 5150 application/advisement artifact captures this atomic record item; this does not authorize detention, establish actor qualification, or enforce the detention clock.

- `ca-statutes-wic-5150-advisement-date`: New dedicated 5150 application/advisement artifact captures this atomic record item; this does not authorize detention, establish actor qualification, or enforce the detention clock.

- `ca-statutes-wic-5150-advisement-completion`: New dedicated 5150 application/advisement artifact captures this atomic record item; this does not authorize detention, establish actor qualification, or enforce the detention clock.

- `ca-statutes-wic-5150-advisement-language`: New dedicated 5150 application/advisement artifact captures this atomic record item; this does not authorize detention, establish actor qualification, or enforce the detention clock.

#### `w3MinorConsent` (new screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ca-statutes-fam-6928-assault-parent-contact | minorAssaultParentContactTime | coded nonempty-narrative | physician,np,surgeon | never/compliance | documentMinorAssaultCareConsent | always; episode | null |

- `ca-statutes-fam-6928-assault-parent-contact`: Capture the statutory parental-contact/involvement record on this dedicated service-consent artifact, including actual contact date/time or the documented decision/reason as appropriate. Minor/service eligibility and actual consent authority remain separate core-feature rules.

#### `w3Orders` (existing screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ca-statutes-bpc-4040-patient-name | prescriptionPatientName | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | always; perOrderLine | null |
| ca-statutes-bpc-4040-patient-address | prescriptionPatientAddress | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | always; perOrderLine | null |
| ca-statutes-bpc-4040-directions | prescriptionDirections | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | always; perOrderLine | null |
| ca-statutes-bpc-4040-license-classification | prescriberLicenseClassification | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | always; perOrderLine | null |
| ca-statutes-bpc-4040-federal-registry | prescriberFederalRegistration | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| ca-statutes-bpc-4040-federal-registry | prescriberFederalRegistration | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-04-medical-purpose | controlledMedicalPurpose | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-04-medical-purpose | controlledMedicalPurpose | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-patient-name | prescriptionPatientName | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-05-patient-name | prescriptionPatientName | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-patient-address | prescriptionPatientAddress | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-05-patient-address | prescriptionPatientAddress | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-strength | controlledProductStrength | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-05-strength | controlledProductStrength | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-dosage-form | controlledDosageForm | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-05-dosage-form | controlledDosageForm | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-directions | prescriptionDirections | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-05-directions | prescriptionDirections | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-prescriber-name | controlledPrescriberName | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-05-prescriber-name | controlledPrescriberName | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-prescriber-address | controlledPrescriberAddress | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-05-prescriber-address | controlledPrescriberAddress | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-prescriber-dea | prescriberFederalRegistration | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-05-prescriber-dea | prescriberFederalRegistration | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-ghb-need | ghbMedicalNeed | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | drugClass ghb; perOrderLine | null |
| federal-rx-1306-12-zero-refills | refills | quantity none | physician,np,surgeon | defaultConfirm/compliance | signOrders | orderClass scheduleII; perOrderLine | ["0"] |

- `ca-statutes-bpc-4040-patient-name`: Capture patient name on each prescription artifact; the chart banner does not write prescription content. Outbound serialization/delivery remains backend work.

- `ca-statutes-bpc-4040-patient-address`: Add a required data capture using existing ElementSpec, CommitSpec and EntryReq; no new syntax or predicate is needed.

- `ca-statutes-bpc-4040-directions`: Require a distinct non-empty complete sig on each prescription; dose/route/freq alone do not establish usable written directions. This gate prepares content; transmission is outside the checker.

- `ca-statutes-bpc-4040-license-classification`: Capture the license classification as prescription content; this does not verify license validity or scope.

- `ca-statutes-bpc-4040-federal-registry`: Capture registration content for controlled prescriptions. Schedule V needs its own existing drug-class data tag and duplicate EntryReq (added below); actual authority is a separate rule.

- `federal-rx-1306-04-medical-purpose`: Capture a non-empty legitimate-purpose statement on each controlled order, including Schedule V via the extra class-specific requirement below. This documents purpose; the checker does not decide medical legitimacy.

- `federal-rx-1306-05-patient-name`: Required prescription-content capture; add a parallel Schedule V requirement using the same existing orderClass constructor. Registration content does not validate legal authority; serialization/delivery is downstream.

- `federal-rx-1306-05-patient-address`: Required prescription-content capture; add a parallel Schedule V requirement using the same existing orderClass constructor. Registration content does not validate legal authority; serialization/delivery is downstream.

- `federal-rx-1306-05-strength`: Required prescription-content capture; add a parallel Schedule V requirement using the same existing orderClass constructor. Registration content does not validate legal authority; serialization/delivery is downstream.

- `federal-rx-1306-05-dosage-form`: Required prescription-content capture; add a parallel Schedule V requirement using the same existing orderClass constructor. Registration content does not validate legal authority; serialization/delivery is downstream.

- `federal-rx-1306-05-directions`: Required prescription-content capture; add a parallel Schedule V requirement using the same existing orderClass constructor. Registration content does not validate legal authority; serialization/delivery is downstream.

- `federal-rx-1306-05-prescriber-name`: Required prescription-content capture; add a parallel Schedule V requirement using the same existing orderClass constructor. Registration content does not validate legal authority; serialization/delivery is downstream.

- `federal-rx-1306-05-prescriber-address`: Required prescription-content capture; add a parallel Schedule V requirement using the same existing orderClass constructor. Registration content does not validate legal authority; serialization/delivery is downstream.

- `federal-rx-1306-05-prescriber-dea`: Required prescription-content capture; add a parallel Schedule V requirement using the same existing orderClass constructor. Registration content does not validate legal authority; serialization/delivery is downstream.

- `federal-rx-1306-05-ghb-need`: Add the ghb formulary class to relevant product entries (ordinary drug-class data), then require non-empty medical need on those lines. No new When is needed.

- `federal-rx-1306-12-zero-refills`: For new Schedule II prescriptions, require refills=0 per line under existing orderClass scheduleII. W7 has no current drug orderLines, so a conditional constraint alone is vacuous: require a human notScheduleII eligibility code on every refill decision, route Schedule II to signOrders as a new prescription, and bind a drug capture to its selected order slot when using the extra refillRefills constraint. This is an explicitly human-verified schedule gate, not automatic classification of the incoming Task.

#### `w3Restraint` (new screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| cms-482.13-e4i-care-plan | restraintCarePlanChange | coded nonempty-narrative | physician,np,surgeon | never/compliance | signRestraintOrder | always; episode | null |
| cms-482.13-e6-no-standing | restraintOrderMode | coded restraint-order-mode | physician,np,surgeon | never/compliance | signRestraintOrder | always; episode | ["oneTime"] |
| cms-482.13-e6-no-prn | restraintPrn | coded no-prn | physician,np,surgeon | never/compliance | signRestraintOrder | always; episode | ["notPrn"] |
| cms-482.13-e16ii-document-behavior | restraintBehavior | coded nonempty-narrative | physician,np,surgeon,rn | never/compliance | chartRestraintEpisode | always; episode | null |
| cms-482.13-e16ii-document-intervention | restraintIntervention | coded nonempty-narrative | physician,np,surgeon,rn | never/compliance | chartRestraintEpisode | always; episode | null |
| cms-482.13-e16iii-document-alternatives | restraintAlternatives | coded nonempty-narrative | physician,np,surgeon,rn | never/compliance | chartRestraintEpisode | always; episode | null |
| cms-482.13-e16iv-document-condition | restraintCondition | coded nonempty-narrative | physician,np,surgeon,rn | never/compliance | chartRestraintEpisode | always; episode | null |
| cms-482.13-e16v-document-response | restraintResponse | coded nonempty-narrative | physician,np,surgeon,rn | never/compliance | chartRestraintEpisode | always; episode | null |
| cms-482.13-e16v-document-continuation | restraintContinuationReason | coded nonempty-narrative | physician,np,surgeon,rn | never/compliance | chartRestraintEpisode | always; episode | null |
| ca-title22-70749-restraint-type | restraintType | coded restraint-type | physician,np,surgeon,rn | never/compliance | chartRestraintEpisode | always; episode | null |
| ca-title22-70749-restraint-start | restraintApplicationTime | coded nonempty-narrative | physician,np,surgeon,rn | never/compliance | recordRestraintStart | always; episode | null |
| ca-title22-70749-restraint-end | restraintRemovalTime | coded nonempty-narrative | physician,np,surgeon,rn | never/compliance | recordRestraintEnd | always; episode | null |

- `cms-482.13-e4i-care-plan`: New scoped restraint-order commit requires the written care-plan change; .always applies to this artifact, not to every medication order.

- `cms-482.13-e6-no-standing`: Require oneTime on the dedicated restraint-order artifact. The new commit must be the only canonical issuer of restraint orders; ordinary medication signOrders never emits them.

- `cms-482.13-e6-no-prn`: Require notPrn on the dedicated restraint-order artifact, using an explicit allowed code. A false flag is invalid for a required entry, so this is not a flag default.

- `cms-482.13-e16ii-document-behavior`: Dedicated restraint episode documentation captures this non-empty item; it does not certify the one-hour evaluation deadline or clinical appropriateness.

- `cms-482.13-e16ii-document-intervention`: Dedicated restraint episode documentation captures this non-empty item; it does not certify the one-hour evaluation deadline or clinical appropriateness.

- `cms-482.13-e16iii-document-alternatives`: Dedicated restraint episode documentation captures this non-empty item; it does not certify the one-hour evaluation deadline or clinical appropriateness.

- `cms-482.13-e16iv-document-condition`: Dedicated restraint episode documentation captures this non-empty item; it does not certify the one-hour evaluation deadline or clinical appropriateness.

- `cms-482.13-e16v-document-response`: Dedicated restraint episode documentation captures this non-empty item; it does not certify the one-hour evaluation deadline or clinical appropriateness.

- `cms-482.13-e16v-document-continuation`: Dedicated restraint episode documentation captures this non-empty item; it does not certify the one-hour evaluation deadline or clinical appropriateness.

- `ca-title22-70749-restraint-type`: Add a required data capture using existing ElementSpec, CommitSpec and EntryReq; no new syntax or predicate is needed.

- `ca-title22-70749-restraint-start`: Capture actual timestamp as a non-empty ISO-8601 string on the dedicated start/end record. Collect even for soft support ties as a stricter policy; no timing comparison or order-expiry guarantee is claimed.

- `ca-title22-70749-restraint-end`: Capture actual timestamp as a non-empty ISO-8601 string on the dedicated start/end record. Collect even for soft support ties as a stricter policy; no timing comparison or order-expiry guarantee is claimed.

#### `w3ScheduleIISeries` (new screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| federal-rx-1306-12-earliest-fill | earliestFillDate | coded nonempty-narrative | physician,np,surgeon | never/compliance | signScheduleIISeries | orderClass scheduleII; perOrderLine | null |
| federal-rx-1306-12-diversion-risk | seriesDiversionRiskAssessed | flag | physician,np,surgeon | never/safety/humanOnly | signScheduleIISeries | always; episode | null |

- `federal-rx-1306-12-earliest-fill`: A dedicated multiple-Schedule-II prescription artifact requires an earliest-fill date on every series line (including the first, a disclosed stricter policy). Date is a non-empty ISO-8601 string; interpreting or enforcing pharmacy fill eligibility is separate.

- `federal-rx-1306-12-diversion-risk`: Dedicated series-issuance commit requires a human prescriber conclusion that the series does not create undue diversion/abuse risk. It documents the judgment, not automated assessment of risk.

#### `w3Sign` (existing screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ca-statutes-bpc-741-education-exceptions | naloxoneEducationOutcome | coded naloxone-education-outcome | physician,np,surgeon | never/compliance/humanOnly | signOrders | naloxoneRisk; episode | ["provided", "declined", "educatedWithin24Months"] |
| federal-rx-1311-140-ready-selection | controlledReadyToSign | flag | physician,np,surgeon | never/safety/humanOnly | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1311-140-ready-selection | controlledReadyToSign | flag | physician,np,surgeon | never/safety/humanOnly | signOrders | orderClass controlled-V; perOrderLine | null |

| Rule | Info | Commit | When | Mode | Exact content binding |
| --- | --- | --- | --- | --- | --- |
| federal-rx-1311-120-display-issue-date | controlledSigningIssueDate | signOrders | orderClass controlled-II-IV | shownOnCommit | Actual issue date of every selected controlled prescription; sourced from the order artifact, never the future earliest-fill date. |
| federal-rx-1311-120-display-issue-date | controlledSigningIssueDate | signOrders | orderClass controlled-V | shownOnCommit | Actual issue date of every selected controlled prescription; sourced from the order artifact, never the future earliest-fill date. |
| federal-rx-1311-120-display-patient-name | controlledSigningPatientName | signOrders | orderClass controlled-II-IV | shownOnCommit | Patient full name on every selected controlled prescription; do not substitute initials/sex/age. |
| federal-rx-1311-120-display-patient-name | controlledSigningPatientName | signOrders | orderClass controlled-V | shownOnCommit | Patient full name on every selected controlled prescription; do not substitute initials/sex/age. |
| federal-rx-1311-120-display-drug-name | controlledSigningDrugName | signOrders | orderClass controlled-II-IV | shownOnCommit | Drug name for every selected controlled prescription line. |
| federal-rx-1311-120-display-drug-name | controlledSigningDrugName | signOrders | orderClass controlled-V | shownOnCommit | Drug name for every selected controlled prescription line. |
| federal-rx-1311-120-display-strength | controlledSigningStrength | signOrders | orderClass controlled-II-IV | shownOnCommit | Product strength for every selected controlled prescription line, distinct from dose. |
| federal-rx-1311-120-display-strength | controlledSigningStrength | signOrders | orderClass controlled-V | shownOnCommit | Product strength for every selected controlled prescription line, distinct from dose. |
| federal-rx-1311-120-display-form | controlledSigningDosageForm | signOrders | orderClass controlled-II-IV | shownOnCommit | Dosage form for every selected controlled prescription line. |
| federal-rx-1311-120-display-form | controlledSigningDosageForm | signOrders | orderClass controlled-V | shownOnCommit | Dosage form for every selected controlled prescription line. |
| federal-rx-1311-120-display-quantity | controlledSigningQuantity | signOrders | orderClass controlled-II-IV | shownOnCommit | Prescribed quantity for every selected controlled prescription line. |
| federal-rx-1311-120-display-quantity | controlledSigningQuantity | signOrders | orderClass controlled-V | shownOnCommit | Prescribed quantity for every selected controlled prescription line. |
| federal-rx-1311-120-display-directions | controlledSigningDirections | signOrders | orderClass controlled-II-IV | shownOnCommit | Complete directions for use for every selected controlled prescription line. |
| federal-rx-1311-120-display-directions | controlledSigningDirections | signOrders | orderClass controlled-V | shownOnCommit | Complete directions for use for every selected controlled prescription line. |
| federal-rx-1311-120-display-refills | controlledSigningRefills | signOrders | orderClass controlled-II-IV | shownOnCommit | Authorized repeat count for every selected Schedule III–V prescription; showing zero for Schedule II as well is a stricter display policy. |
| federal-rx-1311-120-display-refills | controlledSigningRefills | signOrders | orderClass controlled-V | shownOnCommit | Authorized repeat count for every selected Schedule III–V prescription; showing zero for Schedule II as well is a stricter display policy. |
| federal-rx-1311-120-display-earliest-fill | controlledSigningEarliestFill | signOrders | orderClass controlled-II-IV | shownOnCommit | Earliest fill date for every later Schedule II series member; show not applicable on other selected orders. |
| federal-rx-1311-120-display-earliest-fill | controlledSigningEarliestFill | signOrders | orderClass controlled-V | shownOnCommit | Earliest fill date for every later Schedule II series member; show not applicable on other selected orders. |
| federal-rx-1311-120-display-prescriber-name | controlledSigningPrescriberName | signOrders | orderClass controlled-II-IV | shownOnCommit | Prescriber full name for every selected controlled prescription. |
| federal-rx-1311-120-display-prescriber-name | controlledSigningPrescriberName | signOrders | orderClass controlled-V | shownOnCommit | Prescriber full name for every selected controlled prescription. |
| federal-rx-1311-120-display-prescriber-address | controlledSigningPrescriberAddress | signOrders | orderClass controlled-II-IV | shownOnCommit | Prescriber address for every selected controlled prescription. |
| federal-rx-1311-120-display-prescriber-address | controlledSigningPrescriberAddress | signOrders | orderClass controlled-V | shownOnCommit | Prescriber address for every selected controlled prescription. |
| federal-rx-1311-120-display-prescriber-dea | controlledSigningDea | signOrders | orderClass controlled-II-IV | shownOnCommit | Prescriber DEA registration or lawful institutional/government identification for every selected controlled prescription. |
| federal-rx-1311-120-display-prescriber-dea | controlledSigningDea | signOrders | orderClass controlled-V | shownOnCommit | Prescriber DEA registration or lawful institutional/government identification for every selected controlled prescription. |
| federal-rx-1311-140-signing-notice | controlledSigningLegalNotice | signOrders | orderClass controlled-II-IV | shownOnCommit | Display the exact legal attestation in 21 CFR 1311.140(a)(3) immediately above the Sign button; use the source text verbatim in the renderer, not this label as placeholder content. |
| federal-rx-1311-140-signing-notice | controlledSigningLegalNotice | signOrders | orderClass controlled-V | shownOnCommit | Display the exact legal attestation in 21 CFR 1311.140(a)(3) immediately above the Sign button; use the source text verbatim in the renderer, not this label as placeholder content. |

- `ca-statutes-bpc-741-education-exceptions`: Replace the old naloxoneEducation EntryReq with this coded truthful outcome under existing naloxoneRisk. The 24-month exception is a human-reported outcome, not an automatically validated historical clock; other risk eligibility remains a separate core rule.

- `federal-rx-1311-140-ready-selection`: Require an explicit human ready-for-signature selection per controlled prescription; Schedule V is added below. Edit-triggered invalidation is the separate next rule; this classification covers selection only.

- `federal-rx-1311-120-display-issue-date`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-patient-name`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-drug-name`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-strength`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-form`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-quantity`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-directions`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-refills`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-earliest-fill`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-prescriber-name`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-prescriber-address`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-prescriber-dea`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-140-signing-notice`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

#### `w3SuicideAssessment` (new screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| entrenched-npg-suicide-risk-level | suicideRiskLevel | coded nonempty-narrative | physician,np,surgeon,rn | never/compliance | signSuicideRiskAssessment | always; episode | null |
| entrenched-npg-suicide-mitigation | suicideMitigationPlan | coded nonempty-narrative | physician,np,surgeon,rn | never/compliance | signSuicideRiskAssessment | always; episode | null |

- `entrenched-npg-suicide-risk-level`: Required content on the dedicated suicide-risk assessment artifact. Screening eligibility, positive-screen branching and actual protective measures are separate rules; adding a risk/plan element needs no language extension.

- `entrenched-npg-suicide-mitigation`: Required content on the dedicated suicide-risk assessment artifact. Screening eligibility, positive-screen branching and actual protective measures are separate rules; adding a risk/plan element needs no language extension.

#### `w3Telehealth` (new screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ca-statutes-bpc-2290-5-telehealth-document | telehealthConsentRecord | coded telehealth-consent-mode | physician,np,surgeon | never/compliance | recordTelehealthConsent | always; episode | ["verbal", "written"] |

- `ca-statutes-bpc-2290-5-telehealth-document`: Dedicated service-linked telehealth consent documentation with truthful verbal/written modes. Actual pre-care sequence remains the separate event-time rules.

#### `w3Triage` (existing screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ca-title22-70413-ed-arrival-time | edArrivalTime | coded nonempty-narrative | physician,np,surgeon,rn | never/compliance | recordEdArrival | always; episode | null |
| ca-title22-70413-ed-arrival-means | arrivalMode | coded arrival-mode | physician,np,surgeon,rn | recordConfirm/compliance | recordEdArrival | always; episode | null |
| ca-title22-70413-ed-complaint | edArrivalComplaint | coded nonempty-narrative | physician,np,surgeon,rn | never/compliance | recordEdArrival | always; episode | null |
| ca-statutes-hsc-1259-primary-language | primaryLanguage | coded primary-language | physician,np,surgeon,rn | never/compliance | recordCommunicationNeeds | always; episode | null |
| ca-statutes-hsc-1259-dialect | patientDialect | coded nonempty-narrative | physician,np,surgeon,rn | never/compliance | recordCommunicationNeeds | always; episode | null |

- `ca-title22-70413-ed-arrival-time`: Record actual arrival timestamp as a non-empty ISO-8601 string; no automatic clock comparison is claimed.

- `ca-title22-70413-ed-arrival-means`: Reuse optional arrivalMode and require it on the new ED arrival-log commit, not on medication signing.

- `ca-title22-70413-ed-complaint`: Existing chiefComplaint is only gated at signNote; require non-empty ED arrival-log complaint using a new edArrivalComplaint element to avoid altering the existing text element.

- `ca-statutes-hsc-1259-primary-language`: Capture once in a dedicated chart-update artifact, not a redundant each-visit interpreter checkbox. Reuse the recorded value in patientBanner; unknown/declined are explicit allowed local codes.

- `ca-statutes-hsc-1259-dialect`: Add a required data capture using existing ElementSpec, CommitSpec and EntryReq; no new syntax or predicate is needed.

### W4 — 38 unique spec-data rules

#### `w4Admin` (existing screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ca-title22-70749-mar-drug | administeredDrug | coded nonempty-narrative | rn | never/compliance | administerMed | always; episode | null |
| ca-title22-70749-mar-dose | administeredDose | coded dose-with-unit | rn | never/compliance | administerMed | always; episode | null |
| ca-title22-70749-mar-time | actualAdministrationTime | coded nonempty-narrative | rn | never/compliance | administerMed | always; episode | null |
| ca-title22-70749-mar-route | actualAdministrationRoute | coded route | rn | never/compliance | administerMed | always; episode | null |
| ca-title22-70749-mar-site | adminSite | coded body-site | rn | defaultConfirm/compliance | administerMed | always; episode | null |

- `ca-title22-70749-mar-drug`: Capture the actual administered value, not merely the scheduled order. Time is an entered ISO-8601 string; this capture does not validate a clock relation.

- `ca-title22-70749-mar-dose`: Capture the actual administered value, not merely the scheduled order. Time is an entered ISO-8601 string; this capture does not validate a clock relation.

- `ca-title22-70749-mar-time`: Capture the actual administered value, not merely the scheduled order. Time is an entered ISO-8601 string; this capture does not validate a clock relation.

- `ca-title22-70749-mar-route`: Capture the actual administered value, not merely the scheduled order. Route/site required for all records with explicit not-applicable where appropriate (stricter policy).

- `ca-title22-70749-mar-site`: Capture the actual administered value, not merely the scheduled order. Route/site required for all records with explicit not-applicable where appropriate (stricter policy).

#### `w4Flowsheet` (existing screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ca-title22-70749-nursing-care | nursingCareProvided | coded nonempty-narrative | rn | never/compliance | chartAssessment | always; episode | null |
| ca-title22-70749-nursing-observations | nursingObservations | coded nonempty-narrative | rn | never/compliance | chartAssessment | always; episode | null |
| ca-title22-70749-nursing-incidents | nursingIncidents | coded nonempty-narrative | rn | never/compliance | chartAssessment | always; episode | null |
| ca-title22-70749-nursing-interpretation | nursingInterpretation | coded nonempty-narrative | rn | never/compliance | chartAssessment | always; episode | null |
| ca-title22-70215-nursing-diagnosis | nursingDiagnosis | coded nonempty-narrative | rn | never/compliance | chartAssessment | always; episode | null |
| ca-title22-70215-nursing-plan | nursingPlan | coded nonempty-narrative | rn | never/compliance | chartAssessment | always; episode | null |
| ca-title22-70215-nursing-intervention | nursingIntervention | coded nonempty-narrative | rn | never/compliance | chartAssessment | always; episode | null |
| ca-title22-70215-nursing-evaluation | nursingEvaluation | coded nonempty-narrative | rn | never/compliance | chartAssessment | always; episode | null |
| ca-statutes-hsc-1259-primary-language | primaryLanguage | coded primary-language | physician,np,surgeon,rn | never/compliance | recordCommunicationNeeds | always; episode | null |
| ca-statutes-hsc-1259-dialect | patientDialect | coded nonempty-narrative | physician,np,surgeon,rn | never/compliance | recordCommunicationNeeds | always; episode | null |

- `ca-title22-70749-nursing-care`: Required explicit narrative or none/not-applicable finding in each filed nursing note; stronger UI documentation policy, not an assertion that every patient has an incident.

- `ca-title22-70749-nursing-observations`: Required explicit narrative or none/not-applicable finding in each filed nursing note; stronger UI documentation policy, not an assertion that every patient has an incident.

- `ca-title22-70749-nursing-incidents`: Required explicit narrative or none/not-applicable finding in each filed nursing note; stronger UI documentation policy, not an assertion that every patient has an incident.

- `ca-title22-70749-nursing-interpretation`: Required explicit narrative or none/not-applicable finding in each filed nursing note; stronger UI documentation policy, not an assertion that every patient has an incident.

- `ca-title22-70215-nursing-diagnosis`: Required nursing-documentation content routed to the permanent record; durability itself remains a backend assumption.

- `ca-title22-70215-nursing-plan`: Required nursing-documentation content routed to the permanent record; durability itself remains a backend assumption.

- `ca-title22-70215-nursing-intervention`: Required nursing-documentation content routed to the permanent record; durability itself remains a backend assumption.

- `ca-title22-70215-nursing-evaluation`: Required nursing-documentation content routed to the permanent record; durability itself remains a backend assumption.

- `ca-statutes-hsc-1259-primary-language`: Capture once in a dedicated chart-update artifact, not a redundant each-visit interpreter checkbox. Reuse the recorded value in patientBanner; unknown/declined are explicit allowed local codes.

- `ca-statutes-hsc-1259-dialect`: Add a required data capture using existing ElementSpec, CommitSpec and EntryReq; no new syntax or predicate is needed.

#### `w4Restraint` (new screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| cms-482.13-e4i-care-plan | restraintCarePlanChange | coded nonempty-narrative | physician,np,surgeon | never/compliance | signRestraintOrder | always; episode | null |
| cms-482.13-e6-no-standing | restraintOrderMode | coded restraint-order-mode | physician,np,surgeon | never/compliance | signRestraintOrder | always; episode | ["oneTime"] |
| cms-482.13-e6-no-prn | restraintPrn | coded no-prn | physician,np,surgeon | never/compliance | signRestraintOrder | always; episode | ["notPrn"] |
| cms-482.13-e16ii-document-behavior | restraintBehavior | coded nonempty-narrative | physician,np,surgeon,rn | never/compliance | chartRestraintEpisode | always; episode | null |
| cms-482.13-e16ii-document-intervention | restraintIntervention | coded nonempty-narrative | physician,np,surgeon,rn | never/compliance | chartRestraintEpisode | always; episode | null |
| cms-482.13-e16iii-document-alternatives | restraintAlternatives | coded nonempty-narrative | physician,np,surgeon,rn | never/compliance | chartRestraintEpisode | always; episode | null |
| cms-482.13-e16iv-document-condition | restraintCondition | coded nonempty-narrative | physician,np,surgeon,rn | never/compliance | chartRestraintEpisode | always; episode | null |
| cms-482.13-e16v-document-response | restraintResponse | coded nonempty-narrative | physician,np,surgeon,rn | never/compliance | chartRestraintEpisode | always; episode | null |
| cms-482.13-e16v-document-continuation | restraintContinuationReason | coded nonempty-narrative | physician,np,surgeon,rn | never/compliance | chartRestraintEpisode | always; episode | null |
| ca-title22-70749-restraint-type | restraintType | coded restraint-type | physician,np,surgeon,rn | never/compliance | chartRestraintEpisode | always; episode | null |
| ca-title22-70749-restraint-start | restraintApplicationTime | coded nonempty-narrative | physician,np,surgeon,rn | never/compliance | recordRestraintStart | always; episode | null |
| ca-title22-70749-restraint-end | restraintRemovalTime | coded nonempty-narrative | physician,np,surgeon,rn | never/compliance | recordRestraintEnd | always; episode | null |

- `cms-482.13-e4i-care-plan`: New scoped restraint-order commit requires the written care-plan change; .always applies to this artifact, not to every medication order.

- `cms-482.13-e6-no-standing`: Require oneTime on the dedicated restraint-order artifact. The new commit must be the only canonical issuer of restraint orders; ordinary medication signOrders never emits them.

- `cms-482.13-e6-no-prn`: Require notPrn on the dedicated restraint-order artifact, using an explicit allowed code. A false flag is invalid for a required entry, so this is not a flag default.

- `cms-482.13-e16ii-document-behavior`: Dedicated restraint episode documentation captures this non-empty item; it does not certify the one-hour evaluation deadline or clinical appropriateness.

- `cms-482.13-e16ii-document-intervention`: Dedicated restraint episode documentation captures this non-empty item; it does not certify the one-hour evaluation deadline or clinical appropriateness.

- `cms-482.13-e16iii-document-alternatives`: Dedicated restraint episode documentation captures this non-empty item; it does not certify the one-hour evaluation deadline or clinical appropriateness.

- `cms-482.13-e16iv-document-condition`: Dedicated restraint episode documentation captures this non-empty item; it does not certify the one-hour evaluation deadline or clinical appropriateness.

- `cms-482.13-e16v-document-response`: Dedicated restraint episode documentation captures this non-empty item; it does not certify the one-hour evaluation deadline or clinical appropriateness.

- `cms-482.13-e16v-document-continuation`: Dedicated restraint episode documentation captures this non-empty item; it does not certify the one-hour evaluation deadline or clinical appropriateness.

- `ca-title22-70749-restraint-type`: Add a required data capture using existing ElementSpec, CommitSpec and EntryReq; no new syntax or predicate is needed.

- `ca-title22-70749-restraint-start`: Capture actual timestamp as a non-empty ISO-8601 string on the dedicated start/end record. Collect even for soft support ties as a stricter policy; no timing comparison or order-expiry guarantee is claimed.

- `ca-title22-70749-restraint-end`: Capture actual timestamp as a non-empty ISO-8601 string on the dedicated start/end record. Collect even for soft support ties as a stricter policy; no timing comparison or order-expiry guarantee is claimed.

#### `w4SelfAdministration` (new screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| cms-482.23-c6iA-self-order | selfAdministrationOrder | flag | physician,np,surgeon | never/safety/humanOnly | authorizeSelfAdministration | always; episode | null |
| cms-482.23-c6iB-self-capacity | selfAdministrationCapacity | coded nonempty-narrative | physician,np,surgeon,rn | never/compliance | documentSelfAdministration | always; episode | null |
| cms-482.23-c6iC-self-instruction | selfAdministrationTeaching | coded nonempty-narrative | physician,np,surgeon,rn | never/compliance | documentSelfAdministration | always; episode | null |
| cms-482.23-c6iD-self-security | selfAdministrationSecurity | coded nonempty-narrative | physician,np,surgeon,rn | never/compliance | documentSelfAdministration | always; episode | null |
| cms-482.23-c6iiC-own-med-identify | patientOwnedMedicationIdentity | coded nonempty-narrative | physician,np,surgeon,rn | never/compliance | documentSelfAdministration | always; episode | null |
| cms-482.23-c6iiC-own-med-integrity | patientOwnedMedicationIntegrity | coded nonempty-narrative | physician,np,surgeon,rn | never/compliance | documentSelfAdministration | always; episode | null |
| ca-title22-70263-bedside-order | bedsideMedicationOrder | flag | physician,np,surgeon | never/safety/humanOnly | authorizeBedsideMedication | always; episode | null |
| ca-title22-70263-home-drug-order | patientOwnedMedicationOrder | flag | physician,np,surgeon | never/safety/humanOnly | authorizePatientOwnedMedication | always; episode | null |

- `cms-482.23-c6iA-self-order`: Prescriber-only dedicated self-administration authorization artifact; this gate records authorization, not the subsequent physical dosing.

- `cms-482.23-c6iB-self-capacity`: Add a required data capture using existing ElementSpec, CommitSpec and EntryReq; no new syntax or predicate is needed.

- `cms-482.23-c6iC-self-instruction`: Add a required data capture using existing ElementSpec, CommitSpec and EntryReq; no new syntax or predicate is needed.

- `cms-482.23-c6iD-self-security`: Add a required data capture using existing ElementSpec, CommitSpec and EntryReq; no new syntax or predicate is needed.

- `cms-482.23-c6iiC-own-med-identify`: Add a required data capture using existing ElementSpec, CommitSpec and EntryReq; no new syntax or predicate is needed.

- `cms-482.23-c6iiC-own-med-integrity`: Add a required data capture using existing ElementSpec, CommitSpec and EntryReq; no new syntax or predicate is needed.

- `ca-title22-70263-bedside-order`: Dedicated prescriber authorization record before bedside storage. Actual bedside handling remains outside the UI claim.

- `ca-title22-70263-home-drug-order`: New prescriber-only order artifact for patient-owned medication; downstream delivery of medication remains trusted.

#### `w4SuicideAssessment` (new screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| entrenched-npg-suicide-risk-level | suicideRiskLevel | coded nonempty-narrative | physician,np,surgeon,rn | never/compliance | signSuicideRiskAssessment | always; episode | null |
| entrenched-npg-suicide-mitigation | suicideMitigationPlan | coded nonempty-narrative | physician,np,surgeon,rn | never/compliance | signSuicideRiskAssessment | always; episode | null |

- `entrenched-npg-suicide-risk-level`: Required content on the dedicated suicide-risk assessment artifact. Screening eligibility, positive-screen branching and actual protective measures are separate rules; adding a risk/plan element needs no language extension.

- `entrenched-npg-suicide-mitigation`: Required content on the dedicated suicide-risk assessment artifact. Screening eligibility, positive-screen branching and actual protective measures are separate rules; adding a risk/plan element needs no language extension.

#### `w4VerbalOrder` (new screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ca-title22-70263-verbal-giver | verbalOrderGiver | coded nonempty-narrative | rn,physician,np | never/compliance | recordVerbalOrder | always; episode | null |

- `ca-title22-70263-verbal-giver`: Capture giver identity on a dedicated verbal-order record; this does not verify state scope of the receiver or prescriber countersignature.

### W5 — 46 unique spec-data rules

#### `w5Consent` (new screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ca-title22-70707-consent-risks | consentRiskDisclosure | coded nonempty-narrative | physician,np,surgeon | never/compliance | documentTreatmentConsent | always; episode | null |
| ca-title22-70707-consent-alternatives | consentAlternativesDisclosure | coded nonempty-narrative | physician,np,surgeon | never/compliance | documentTreatmentConsent | always; episode | null |

- `ca-title22-70707-consent-risks`: Scoped treatment-consent documentation records medically significant risks discussed. It does not validate emergency exceptions, capacity, signatures or that disclosure was understood.

- `ca-title22-70707-consent-alternatives`: Add a required data capture using existing ElementSpec, CommitSpec and EntryReq; no new syntax or predicate is needed.

#### `w5EmergencyRxFollowup` (new screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| federal-rx-1306-11-emergency-label | emergencyAuthorizationNotation | coded emergency-authorization-notation | physician,np,surgeon | never/compliance | signEmergencyRxFollowup | always; episode | ["Authorization for Emergency Dispensing"] |

- `federal-rx-1306-11-emergency-label`: Dedicated emergency-follow-up prescription artifact requires the exact notation via allowed values. It does not verify the seven-day deadline or send the artifact.

#### `w5Immunizations` (existing screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| federal-rx-300aa-25-date | vaccineAdministrationDate | coded nonempty-narrative | np,physician,rn | never/compliance | recordImmunization | always; episode | null |
| federal-rx-300aa-25-provider-address | vaccineProviderAddress | coded nonempty-narrative | np,physician,rn | never/compliance | recordImmunization | always; episode | null |
| federal-rx-300aa-25-provider-title | vaccineProviderTitle | coded nonempty-narrative | np,physician,rn | never/compliance | recordImmunization | always; episode | null |

- `federal-rx-300aa-25-date`: Capture actual vaccination date as a non-empty ISO-8601 date string; this does not infer the date from note creation or prove permanent retention.

- `federal-rx-300aa-25-provider-address`: Add a required data capture using existing ElementSpec, CommitSpec and EntryReq; no new syntax or predicate is needed.

- `federal-rx-300aa-25-provider-title`: Require title or explicit not-applicable on every vaccination record as a disclosed stricter data policy, avoiding a fictional title-appropriate When.

#### `w5MinorConsent` (new screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ca-statutes-fam-6924-mental-health-parent-contact | minorMentalHealthParentContactDecision | coded nonempty-narrative | physician,np,surgeon | never/compliance | documentMinorMentalHealthConsent | always; episode | null |
| ca-statutes-fam-6928-assault-parent-contact | minorAssaultParentContactTime | coded nonempty-narrative | physician,np,surgeon | never/compliance | documentMinorAssaultCareConsent | always; episode | null |
| ca-statutes-fam-6929-substance-parent-contact | minorSubstanceParentInvolvementDecision | coded nonempty-narrative | physician,np,surgeon | never/compliance | documentMinorSubstanceCareConsent | always; episode | null |

- `ca-statutes-fam-6924-mental-health-parent-contact`: Capture the statutory parental-contact/involvement record on this dedicated service-consent artifact, including actual contact date/time or the documented decision/reason as appropriate. Minor/service eligibility and actual consent authority remain separate core-feature rules.

- `ca-statutes-fam-6928-assault-parent-contact`: Capture the statutory parental-contact/involvement record on this dedicated service-consent artifact, including actual contact date/time or the documented decision/reason as appropriate. Minor/service eligibility and actual consent authority remain separate core-feature rules.

- `ca-statutes-fam-6929-substance-parent-contact`: Capture the statutory parental-contact/involvement record on this dedicated service-consent artifact, including actual contact date/time or the documented decision/reason as appropriate. Minor/service eligibility and actual consent authority remain separate core-feature rules.

#### `w5Orders` (existing screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ca-statutes-bpc-4040-patient-name | prescriptionPatientName | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | always; perOrderLine | null |
| ca-statutes-bpc-4040-patient-address | prescriptionPatientAddress | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | always; perOrderLine | null |
| ca-statutes-bpc-4040-directions | prescriptionDirections | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | always; perOrderLine | null |
| ca-statutes-bpc-4040-license-classification | prescriberLicenseClassification | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | always; perOrderLine | null |
| ca-statutes-bpc-4040-federal-registry | prescriberFederalRegistration | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| ca-statutes-bpc-4040-federal-registry | prescriberFederalRegistration | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-04-medical-purpose | controlledMedicalPurpose | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-04-medical-purpose | controlledMedicalPurpose | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-patient-name | prescriptionPatientName | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-05-patient-name | prescriptionPatientName | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-patient-address | prescriptionPatientAddress | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-05-patient-address | prescriptionPatientAddress | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-strength | controlledProductStrength | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-05-strength | controlledProductStrength | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-dosage-form | controlledDosageForm | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-05-dosage-form | controlledDosageForm | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-directions | prescriptionDirections | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-05-directions | prescriptionDirections | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-prescriber-name | controlledPrescriberName | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-05-prescriber-name | controlledPrescriberName | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-prescriber-address | controlledPrescriberAddress | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-05-prescriber-address | controlledPrescriberAddress | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-prescriber-dea | prescriberFederalRegistration | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-05-prescriber-dea | prescriberFederalRegistration | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-ghb-need | ghbMedicalNeed | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | drugClass ghb; perOrderLine | null |
| federal-rx-1306-12-zero-refills | refills | quantity none | physician,np,surgeon | defaultConfirm/compliance | signOrders | orderClass scheduleII; perOrderLine | ["0"] |

- `ca-statutes-bpc-4040-patient-name`: Capture patient name on each prescription artifact; the chart banner does not write prescription content. Outbound serialization/delivery remains backend work.

- `ca-statutes-bpc-4040-patient-address`: Add a required data capture using existing ElementSpec, CommitSpec and EntryReq; no new syntax or predicate is needed.

- `ca-statutes-bpc-4040-directions`: Require a distinct non-empty complete sig on each prescription; dose/route/freq alone do not establish usable written directions. This gate prepares content; transmission is outside the checker.

- `ca-statutes-bpc-4040-license-classification`: Capture the license classification as prescription content; this does not verify license validity or scope.

- `ca-statutes-bpc-4040-federal-registry`: Capture registration content for controlled prescriptions. Schedule V needs its own existing drug-class data tag and duplicate EntryReq (added below); actual authority is a separate rule.

- `federal-rx-1306-04-medical-purpose`: Capture a non-empty legitimate-purpose statement on each controlled order, including Schedule V via the extra class-specific requirement below. This documents purpose; the checker does not decide medical legitimacy.

- `federal-rx-1306-05-patient-name`: Required prescription-content capture; add a parallel Schedule V requirement using the same existing orderClass constructor. Registration content does not validate legal authority; serialization/delivery is downstream.

- `federal-rx-1306-05-patient-address`: Required prescription-content capture; add a parallel Schedule V requirement using the same existing orderClass constructor. Registration content does not validate legal authority; serialization/delivery is downstream.

- `federal-rx-1306-05-strength`: Required prescription-content capture; add a parallel Schedule V requirement using the same existing orderClass constructor. Registration content does not validate legal authority; serialization/delivery is downstream.

- `federal-rx-1306-05-dosage-form`: Required prescription-content capture; add a parallel Schedule V requirement using the same existing orderClass constructor. Registration content does not validate legal authority; serialization/delivery is downstream.

- `federal-rx-1306-05-directions`: Required prescription-content capture; add a parallel Schedule V requirement using the same existing orderClass constructor. Registration content does not validate legal authority; serialization/delivery is downstream.

- `federal-rx-1306-05-prescriber-name`: Required prescription-content capture; add a parallel Schedule V requirement using the same existing orderClass constructor. Registration content does not validate legal authority; serialization/delivery is downstream.

- `federal-rx-1306-05-prescriber-address`: Required prescription-content capture; add a parallel Schedule V requirement using the same existing orderClass constructor. Registration content does not validate legal authority; serialization/delivery is downstream.

- `federal-rx-1306-05-prescriber-dea`: Required prescription-content capture; add a parallel Schedule V requirement using the same existing orderClass constructor. Registration content does not validate legal authority; serialization/delivery is downstream.

- `federal-rx-1306-05-ghb-need`: Add the ghb formulary class to relevant product entries (ordinary drug-class data), then require non-empty medical need on those lines. No new When is needed.

- `federal-rx-1306-12-zero-refills`: For new Schedule II prescriptions, require refills=0 per line under existing orderClass scheduleII. W7 has no current drug orderLines, so a conditional constraint alone is vacuous: require a human notScheduleII eligibility code on every refill decision, route Schedule II to signOrders as a new prescription, and bind a drug capture to its selected order slot when using the extra refillRefills constraint. This is an explicitly human-verified schedule gate, not automatic classification of the incoming Task.

#### `w5OxygenOrder` (new screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ca-title22-70547-newborn-oxygen-target | newbornOxygenTarget | coded nonempty-narrative | physician | never/compliance | signNewbornOxygenOrder | always; episode | null |

- `ca-title22-70547-newborn-oxygen-target`: New physician oxygen-order artifact requires a non-empty concentration or desired arterial oxygen partial-pressure description; this is content capture, not numeric clinical validation or newborn eligibility.

#### `w5Rooming` (existing screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ca-statutes-hsc-1259-primary-language | primaryLanguage | coded primary-language | physician,np,surgeon,rn | never/compliance | recordCommunicationNeeds | always; episode | null |
| ca-statutes-hsc-1259-dialect | patientDialect | coded nonempty-narrative | physician,np,surgeon,rn | never/compliance | recordCommunicationNeeds | always; episode | null |

- `ca-statutes-hsc-1259-primary-language`: Capture once in a dedicated chart-update artifact, not a redundant each-visit interpreter checkbox. Reuse the recorded value in patientBanner; unknown/declined are explicit allowed local codes.

- `ca-statutes-hsc-1259-dialect`: Add a required data capture using existing ElementSpec, CommitSpec and EntryReq; no new syntax or predicate is needed.

#### `w5ScheduleIISeries` (new screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| federal-rx-1306-12-earliest-fill | earliestFillDate | coded nonempty-narrative | physician,np,surgeon | never/compliance | signScheduleIISeries | orderClass scheduleII; perOrderLine | null |
| federal-rx-1306-12-diversion-risk | seriesDiversionRiskAssessed | flag | physician,np,surgeon | never/safety/humanOnly | signScheduleIISeries | always; episode | null |

- `federal-rx-1306-12-earliest-fill`: A dedicated multiple-Schedule-II prescription artifact requires an earliest-fill date on every series line (including the first, a disclosed stricter policy). Date is a non-empty ISO-8601 string; interpreting or enforcing pharmacy fill eligibility is separate.

- `federal-rx-1306-12-diversion-risk`: Dedicated series-issuance commit requires a human prescriber conclusion that the series does not create undue diversion/abuse risk. It documents the judgment, not automated assessment of risk.

#### `w5Sign` (existing screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ca-statutes-bpc-741-education-exceptions | naloxoneEducationOutcome | coded naloxone-education-outcome | physician,np,surgeon | never/compliance/humanOnly | signOrders | naloxoneRisk; episode | ["provided", "declined", "educatedWithin24Months"] |
| federal-rx-1311-140-ready-selection | controlledReadyToSign | flag | physician,np,surgeon | never/safety/humanOnly | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1311-140-ready-selection | controlledReadyToSign | flag | physician,np,surgeon | never/safety/humanOnly | signOrders | orderClass controlled-V; perOrderLine | null |

| Rule | Info | Commit | When | Mode | Exact content binding |
| --- | --- | --- | --- | --- | --- |
| federal-rx-1311-120-display-issue-date | controlledSigningIssueDate | signOrders | orderClass controlled-II-IV | shownOnCommit | Actual issue date of every selected controlled prescription; sourced from the order artifact, never the future earliest-fill date. |
| federal-rx-1311-120-display-issue-date | controlledSigningIssueDate | signOrders | orderClass controlled-V | shownOnCommit | Actual issue date of every selected controlled prescription; sourced from the order artifact, never the future earliest-fill date. |
| federal-rx-1311-120-display-patient-name | controlledSigningPatientName | signOrders | orderClass controlled-II-IV | shownOnCommit | Patient full name on every selected controlled prescription; do not substitute initials/sex/age. |
| federal-rx-1311-120-display-patient-name | controlledSigningPatientName | signOrders | orderClass controlled-V | shownOnCommit | Patient full name on every selected controlled prescription; do not substitute initials/sex/age. |
| federal-rx-1311-120-display-drug-name | controlledSigningDrugName | signOrders | orderClass controlled-II-IV | shownOnCommit | Drug name for every selected controlled prescription line. |
| federal-rx-1311-120-display-drug-name | controlledSigningDrugName | signOrders | orderClass controlled-V | shownOnCommit | Drug name for every selected controlled prescription line. |
| federal-rx-1311-120-display-strength | controlledSigningStrength | signOrders | orderClass controlled-II-IV | shownOnCommit | Product strength for every selected controlled prescription line, distinct from dose. |
| federal-rx-1311-120-display-strength | controlledSigningStrength | signOrders | orderClass controlled-V | shownOnCommit | Product strength for every selected controlled prescription line, distinct from dose. |
| federal-rx-1311-120-display-form | controlledSigningDosageForm | signOrders | orderClass controlled-II-IV | shownOnCommit | Dosage form for every selected controlled prescription line. |
| federal-rx-1311-120-display-form | controlledSigningDosageForm | signOrders | orderClass controlled-V | shownOnCommit | Dosage form for every selected controlled prescription line. |
| federal-rx-1311-120-display-quantity | controlledSigningQuantity | signOrders | orderClass controlled-II-IV | shownOnCommit | Prescribed quantity for every selected controlled prescription line. |
| federal-rx-1311-120-display-quantity | controlledSigningQuantity | signOrders | orderClass controlled-V | shownOnCommit | Prescribed quantity for every selected controlled prescription line. |
| federal-rx-1311-120-display-directions | controlledSigningDirections | signOrders | orderClass controlled-II-IV | shownOnCommit | Complete directions for use for every selected controlled prescription line. |
| federal-rx-1311-120-display-directions | controlledSigningDirections | signOrders | orderClass controlled-V | shownOnCommit | Complete directions for use for every selected controlled prescription line. |
| federal-rx-1311-120-display-refills | controlledSigningRefills | signOrders | orderClass controlled-II-IV | shownOnCommit | Authorized repeat count for every selected Schedule III–V prescription; showing zero for Schedule II as well is a stricter display policy. |
| federal-rx-1311-120-display-refills | controlledSigningRefills | signOrders | orderClass controlled-V | shownOnCommit | Authorized repeat count for every selected Schedule III–V prescription; showing zero for Schedule II as well is a stricter display policy. |
| federal-rx-1311-120-display-earliest-fill | controlledSigningEarliestFill | signOrders | orderClass controlled-II-IV | shownOnCommit | Earliest fill date for every later Schedule II series member; show not applicable on other selected orders. |
| federal-rx-1311-120-display-earliest-fill | controlledSigningEarliestFill | signOrders | orderClass controlled-V | shownOnCommit | Earliest fill date for every later Schedule II series member; show not applicable on other selected orders. |
| federal-rx-1311-120-display-prescriber-name | controlledSigningPrescriberName | signOrders | orderClass controlled-II-IV | shownOnCommit | Prescriber full name for every selected controlled prescription. |
| federal-rx-1311-120-display-prescriber-name | controlledSigningPrescriberName | signOrders | orderClass controlled-V | shownOnCommit | Prescriber full name for every selected controlled prescription. |
| federal-rx-1311-120-display-prescriber-address | controlledSigningPrescriberAddress | signOrders | orderClass controlled-II-IV | shownOnCommit | Prescriber address for every selected controlled prescription. |
| federal-rx-1311-120-display-prescriber-address | controlledSigningPrescriberAddress | signOrders | orderClass controlled-V | shownOnCommit | Prescriber address for every selected controlled prescription. |
| federal-rx-1311-120-display-prescriber-dea | controlledSigningDea | signOrders | orderClass controlled-II-IV | shownOnCommit | Prescriber DEA registration or lawful institutional/government identification for every selected controlled prescription. |
| federal-rx-1311-120-display-prescriber-dea | controlledSigningDea | signOrders | orderClass controlled-V | shownOnCommit | Prescriber DEA registration or lawful institutional/government identification for every selected controlled prescription. |
| federal-rx-1311-140-signing-notice | controlledSigningLegalNotice | signOrders | orderClass controlled-II-IV | shownOnCommit | Display the exact legal attestation in 21 CFR 1311.140(a)(3) immediately above the Sign button; use the source text verbatim in the renderer, not this label as placeholder content. |
| federal-rx-1311-140-signing-notice | controlledSigningLegalNotice | signOrders | orderClass controlled-V | shownOnCommit | Display the exact legal attestation in 21 CFR 1311.140(a)(3) immediately above the Sign button; use the source text verbatim in the renderer, not this label as placeholder content. |

- `ca-statutes-bpc-741-education-exceptions`: Replace the old naloxoneEducation EntryReq with this coded truthful outcome under existing naloxoneRisk. The 24-month exception is a human-reported outcome, not an automatically validated historical clock; other risk eligibility remains a separate core rule.

- `federal-rx-1311-140-ready-selection`: Require an explicit human ready-for-signature selection per controlled prescription; Schedule V is added below. Edit-triggered invalidation is the separate next rule; this classification covers selection only.

- `federal-rx-1311-120-display-issue-date`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-patient-name`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-drug-name`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-strength`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-form`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-quantity`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-directions`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-refills`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-earliest-fill`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-prescriber-name`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-prescriber-address`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-prescriber-dea`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-140-signing-notice`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

#### `w5Telehealth` (new screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ca-statutes-bpc-2290-5-telehealth-document | telehealthConsentRecord | coded telehealth-consent-mode | physician,np,surgeon | never/compliance | recordTelehealthConsent | always; episode | ["verbal", "written"] |

- `ca-statutes-bpc-2290-5-telehealth-document`: Dedicated service-linked telehealth consent documentation with truthful verbal/written modes. Actual pre-care sequence remains the separate event-time rules.

### W6 — 66 unique spec-data rules

#### `w6Anesthesia` (new screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ca-title22-70749-anesthesia-preop-diagnosis | anesthesiaPreopDiagnosis | coded icd10 | physician | never/compliance | signAnesthesiaRecord | always; episode | null |
| ca-title22-70233-preanesthesia-documentation | anesthesiaChoiceRationale | coded nonempty-narrative | physician | never/compliance | signAnesthesiaRecord | always; episode | null |
| ca-title22-70233-blood-amount | anesthesiaBloodAmount | quantity mL | physician | never/compliance | recordAnesthesiaBloodAdministration | always; episode | null |
| ca-title22-70233-blood-duration | anesthesiaBloodDuration | quantity none | physician | never/compliance | recordAnesthesiaBloodAdministration | always; episode | null |

- `ca-title22-70749-anesthesia-preop-diagnosis`: Required diagnosis content on a new physician-authored anesthesia record. Qualified-anesthetist authorization is a separate core-feature rule, not implied by this content gate.

- `ca-title22-70233-preanesthesia-documentation`: Add required non-empty rationale for anesthesia choice and anticipated procedure; qualification and timing are separate unresolved rules.

- `ca-title22-70233-blood-amount`: New per-administration record commit; amount is mL and duration is labeled minutes (UnitKind.none; no min constructor). This captures one blood-administration artifact; event-stream completeness is separately unresolved.

- `ca-title22-70233-blood-duration`: New per-administration record commit; amount is mL and duration is labeled minutes (UnitKind.none; no min constructor). This captures one blood-administration artifact; event-stream completeness is separately unresolved.

#### `w6Consent` (new screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ca-title22-70707-consent-risks | consentRiskDisclosure | coded nonempty-narrative | physician,np,surgeon | never/compliance | documentTreatmentConsent | always; episode | null |
| ca-title22-70707-consent-alternatives | consentAlternativesDisclosure | coded nonempty-narrative | physician,np,surgeon | never/compliance | documentTreatmentConsent | always; episode | null |

- `ca-title22-70707-consent-risks`: Scoped treatment-consent documentation records medically significant risks discussed. It does not validate emergency exceptions, capacity, signatures or that disclosure was understood.

- `ca-title22-70707-consent-alternatives`: Add a required data capture using existing ElementSpec, CommitSpec and EntryReq; no new syntax or predicate is needed.

#### `w6Consult` (existing screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ca-statutes-hsc-1259-primary-language | primaryLanguage | coded primary-language | physician,np,surgeon,rn | never/compliance | recordCommunicationNeeds | always; episode | null |
| ca-statutes-hsc-1259-dialect | patientDialect | coded nonempty-narrative | physician,np,surgeon,rn | never/compliance | recordCommunicationNeeds | always; episode | null |

- `ca-statutes-hsc-1259-primary-language`: Capture once in a dedicated chart-update artifact, not a redundant each-visit interpreter checkbox. Reuse the recorded value in patientBanner; unknown/declined are explicit allowed local codes.

- `ca-statutes-hsc-1259-dialect`: Add a required data capture using existing ElementSpec, CommitSpec and EntryReq; no new syntax or predicate is needed.

#### `w6Delegation` (new screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ca-statutes-hsc-11164-agent-name | controlledTransmissionAgentName | coded nonempty-narrative | physician,np,surgeon | never/compliance | recordDelegatedControlledTransmission | always; episode | null |

- `ca-statutes-hsc-11164-agent-name`: Dedicated prescriber-side delegated Schedule III–V transmission record captures agent name. It does not perform or prove transmission or the agent authorization.

#### `w6DirectDispense` (new screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ca-statutes-hsc-11158-no-more-expected | noFurtherControlledNeedExpected | flag | physician,np,surgeon | never/safety/humanOnly | authorizeDirectDispensing | always; episode | null |

- `ca-statutes-hsc-11158-no-more-expected`: Prescriber human attestation of the specific no-further-need judgment on the direct-dispensing artifact; the separate 72-hour supply limit still requires value validation.

#### `w6Discharge` (existing screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| cms-482.24-c4vii-summary-outcome | hospitalizationOutcome | coded nonempty-narrative | physician,np,surgeon | never/compliance | discharge | always; episode | null |
| cms-482.43-a2-posthospital-needs | postHospitalNeeds | coded nonempty-narrative | physician,np,surgeon | never/compliance | discharge | always; episode | null |
| cms-482.43-a2-service-availability | postHospitalServiceAvailability | coded nonempty-narrative | physician,np,surgeon | never/compliance | discharge | always; episode | null |
| cms-482.43-a2-service-access | postHospitalServiceAccess | coded nonempty-narrative | physician,np,surgeon | never/compliance | discharge | always; episode | null |
| cms-482.43-a3-evaluation-record | dischargePlanningEvaluation | coded nonempty-narrative | physician,np,surgeon | never/compliance | discharge | always; episode | null |
| cms-482.43-a3-evaluation-discussion | dischargeEvaluationDiscussion | coded nonempty-narrative | physician,np,surgeon | never/compliance | discharge | always; episode | null |
| ca-title22-70749-discharge-course | hospitalCourse | coded nonempty-narrative | physician,np,surgeon | never/compliance | discharge | always; episode | null |
| ca-title22-70749-discharge-recommendations | futureCareRecommendations | coded nonempty-narrative | physician,np,surgeon | never/compliance | discharge | always; episode | null |
| ca-title22-70749-discharge-arrangements | futureCareArrangements | coded nonempty-narrative | physician,np,surgeon | never/compliance | discharge | always; episode | null |
| ca-title22-70707-discharge-information | continuingCareInformationGiven | flag | physician,np,surgeon | never/compliance/humanOnly | discharge | always; episode | null |
| entrenched-ismp-mtx-teachback | methotrexateTeachBack | flag | physician,np,surgeon | never/safety/humanOnly | documentMethotrexateDischarge | always; episode | null |

- `cms-482.24-c4vii-summary-outcome`: Add distinct hospitalization outcome text; dischargeCondition is only the condition at departure, not the course/outcome of hospitalization.

- `cms-482.43-a2-posthospital-needs`: Require a documented assessment or explicit no-needs/not-indicated finding on every discharge (a disclosed stricter hospital UI choice). This avoids inventing a discharge-planning When and does not prove service delivery. On the ED disposition path, duplicate this gate at disposition with truthful not-applicable findings for other dispositions (a stricter hospital UI policy).

- `cms-482.43-a2-service-availability`: Require a documented assessment or explicit no-needs/not-indicated finding on every discharge (a disclosed stricter hospital UI choice). This avoids inventing a discharge-planning When and does not prove service delivery. On the ED disposition path, duplicate this gate at disposition with truthful not-applicable findings for other dispositions (a stricter hospital UI policy).

- `cms-482.43-a2-service-access`: Require a documented assessment or explicit no-needs/not-indicated finding on every discharge (a disclosed stricter hospital UI choice). This avoids inventing a discharge-planning When and does not prove service delivery. On the ED disposition path, duplicate this gate at disposition with truthful not-applicable findings for other dispositions (a stricter hospital UI policy).

- `cms-482.43-a3-evaluation-record`: Require a documented assessment or explicit no-needs/not-indicated finding on every discharge (a disclosed stricter hospital UI choice). This avoids inventing a discharge-planning When and does not prove service delivery. On the ED disposition path, duplicate this gate at disposition with truthful not-applicable findings for other dispositions (a stricter hospital UI policy).

- `cms-482.43-a3-evaluation-discussion`: Require a documented assessment or explicit no-needs/not-indicated finding on every discharge (a disclosed stricter hospital UI choice). This avoids inventing a discharge-planning When and does not prove service delivery. On the ED disposition path, duplicate this gate at disposition with truthful not-applicable findings for other dispositions (a stricter hospital UI policy).

- `ca-title22-70749-discharge-course`: Add a required data capture using existing ElementSpec, CommitSpec and EntryReq; no new syntax or predicate is needed. On the ED disposition path, duplicate this gate at disposition with truthful not-applicable findings for other dispositions (a stricter hospital UI policy).

- `ca-title22-70749-discharge-recommendations`: Require a distinct recommendation narrative; a coded follow-up interval and generic instruction text alone do not identify all recommendations. On the ED disposition path, duplicate this gate at disposition with truthful not-applicable findings for other dispositions (a stricter hospital UI policy).

- `ca-title22-70749-discharge-arrangements`: Add a required data capture using existing ElementSpec, CommitSpec and EntryReq; no new syntax or predicate is needed. On the ED disposition path, duplicate this gate at disposition with truthful not-applicable findings for other dispositions (a stricter hospital UI policy).

- `ca-title22-70707-discharge-information`: Human records continuing-care information was given before completing discharge. This is a documentation gate, not proof of patient comprehension or delivery by external systems. On the ED disposition path, duplicate this gate at disposition with truthful not-applicable findings for other dispositions (a stricter hospital UI policy).

- `entrenched-ismp-mtx-teachback`: Dedicated methotrexate-discharge teaching artifact records that the clinician elicited repeat-back. This is accountable human evidence, not proof of patient comprehension or an automated drug predicate.

#### `w6EmergencyRxFollowup` (new screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| federal-rx-1306-11-emergency-label | emergencyAuthorizationNotation | coded emergency-authorization-notation | physician,np,surgeon | never/compliance | signEmergencyRxFollowup | always; episode | ["Authorization for Emergency Dispensing"] |

- `federal-rx-1306-11-emergency-label`: Dedicated emergency-follow-up prescription artifact requires the exact notation via allowed values. It does not verify the seven-day deadline or send the artifact.

#### `w6OpNote` (existing screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| cms-482.51-b6-techniques | opTechnique | coded nonempty-narrative | surgeon | never/compliance | signOpNote | always; episode | null |
| cms-482.51-b6-tissues | opTissuesRemovedAltered | coded nonempty-narrative | surgeon | never/compliance | signOpNote | always; episode | null |
| ca-title22-70749-op-technique | opTechnique | coded nonempty-narrative | surgeon | never/compliance | signOpNote | always; episode | null |
| ca-title22-70749-op-tissue | opTissuesRemovedAltered | coded nonempty-narrative | surgeon | never/compliance | signOpNote | always; episode | null |

- `cms-482.51-b6-techniques`: Add a required data capture using existing ElementSpec, CommitSpec and EntryReq; no new syntax or predicate is needed.

- `cms-482.51-b6-tissues`: opSpecimens covers sent specimens, not every removed or altered tissue; add a distinct required description, permitting an explicit none finding.

- `ca-title22-70749-op-technique`: Add a required data capture using existing ElementSpec, CommitSpec and EntryReq; no new syntax or predicate is needed.

- `ca-title22-70749-op-tissue`: Add a required data capture using existing ElementSpec, CommitSpec and EntryReq; no new syntax or predicate is needed.

#### `w6Orders` (existing screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ca-statutes-bpc-4040-patient-name | prescriptionPatientName | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | always; perOrderLine | null |
| ca-statutes-bpc-4040-patient-address | prescriptionPatientAddress | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | always; perOrderLine | null |
| ca-statutes-bpc-4040-directions | prescriptionDirections | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | always; perOrderLine | null |
| ca-statutes-bpc-4040-license-classification | prescriberLicenseClassification | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | always; perOrderLine | null |
| ca-statutes-bpc-4040-federal-registry | prescriberFederalRegistration | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| ca-statutes-bpc-4040-federal-registry | prescriberFederalRegistration | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-04-medical-purpose | controlledMedicalPurpose | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-04-medical-purpose | controlledMedicalPurpose | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-patient-name | prescriptionPatientName | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-05-patient-name | prescriptionPatientName | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-patient-address | prescriptionPatientAddress | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-05-patient-address | prescriptionPatientAddress | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-strength | controlledProductStrength | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-05-strength | controlledProductStrength | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-dosage-form | controlledDosageForm | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-05-dosage-form | controlledDosageForm | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-directions | prescriptionDirections | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-05-directions | prescriptionDirections | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-prescriber-name | controlledPrescriberName | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-05-prescriber-name | controlledPrescriberName | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-prescriber-address | controlledPrescriberAddress | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-05-prescriber-address | controlledPrescriberAddress | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-prescriber-dea | prescriberFederalRegistration | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-05-prescriber-dea | prescriberFederalRegistration | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-ghb-need | ghbMedicalNeed | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | drugClass ghb; perOrderLine | null |
| federal-rx-1306-12-zero-refills | refills | quantity none | physician,np,surgeon | defaultConfirm/compliance | signOrders | orderClass scheduleII; perOrderLine | ["0"] |

- `ca-statutes-bpc-4040-patient-name`: Capture patient name on each prescription artifact; the chart banner does not write prescription content. Outbound serialization/delivery remains backend work.

- `ca-statutes-bpc-4040-patient-address`: Add a required data capture using existing ElementSpec, CommitSpec and EntryReq; no new syntax or predicate is needed.

- `ca-statutes-bpc-4040-directions`: Require a distinct non-empty complete sig on each prescription; dose/route/freq alone do not establish usable written directions. This gate prepares content; transmission is outside the checker.

- `ca-statutes-bpc-4040-license-classification`: Capture the license classification as prescription content; this does not verify license validity or scope.

- `ca-statutes-bpc-4040-federal-registry`: Capture registration content for controlled prescriptions. Schedule V needs its own existing drug-class data tag and duplicate EntryReq (added below); actual authority is a separate rule.

- `federal-rx-1306-04-medical-purpose`: Capture a non-empty legitimate-purpose statement on each controlled order, including Schedule V via the extra class-specific requirement below. This documents purpose; the checker does not decide medical legitimacy.

- `federal-rx-1306-05-patient-name`: Required prescription-content capture; add a parallel Schedule V requirement using the same existing orderClass constructor. Registration content does not validate legal authority; serialization/delivery is downstream.

- `federal-rx-1306-05-patient-address`: Required prescription-content capture; add a parallel Schedule V requirement using the same existing orderClass constructor. Registration content does not validate legal authority; serialization/delivery is downstream.

- `federal-rx-1306-05-strength`: Required prescription-content capture; add a parallel Schedule V requirement using the same existing orderClass constructor. Registration content does not validate legal authority; serialization/delivery is downstream.

- `federal-rx-1306-05-dosage-form`: Required prescription-content capture; add a parallel Schedule V requirement using the same existing orderClass constructor. Registration content does not validate legal authority; serialization/delivery is downstream.

- `federal-rx-1306-05-directions`: Required prescription-content capture; add a parallel Schedule V requirement using the same existing orderClass constructor. Registration content does not validate legal authority; serialization/delivery is downstream.

- `federal-rx-1306-05-prescriber-name`: Required prescription-content capture; add a parallel Schedule V requirement using the same existing orderClass constructor. Registration content does not validate legal authority; serialization/delivery is downstream.

- `federal-rx-1306-05-prescriber-address`: Required prescription-content capture; add a parallel Schedule V requirement using the same existing orderClass constructor. Registration content does not validate legal authority; serialization/delivery is downstream.

- `federal-rx-1306-05-prescriber-dea`: Required prescription-content capture; add a parallel Schedule V requirement using the same existing orderClass constructor. Registration content does not validate legal authority; serialization/delivery is downstream.

- `federal-rx-1306-05-ghb-need`: Add the ghb formulary class to relevant product entries (ordinary drug-class data), then require non-empty medical need on those lines. No new When is needed.

- `federal-rx-1306-12-zero-refills`: For new Schedule II prescriptions, require refills=0 per line under existing orderClass scheduleII. W7 has no current drug orderLines, so a conditional constraint alone is vacuous: require a human notScheduleII eligibility code on every refill decision, route Schedule II to signOrders as a new prescription, and bind a drug capture to its selected order slot when using the extra refillRefills constraint. This is an explicitly human-verified schedule gate, not automatic classification of the incoming Task.

#### `w6PostOp` (existing screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ca-title22-70749-treatment-orders | treatmentOrder | coded nonempty-narrative | physician,np,surgeon | never/compliance | signTreatmentOrder | always; episode | null |
| ca-title22-70749-diet-orders | postOpDiet | coded diet | physician,np,surgeon | defaultConfirm/compliance | signDietOrder | always; episode | null |

- `ca-title22-70749-treatment-orders`: Dedicated nonmedication treatment-order artifact; new commit is existing CommitSpec data, with a non-empty treatment description.

- `ca-title22-70749-diet-orders`: Reuse optional postOpDiet but require it on a dedicated signDietOrder commit; signing medication orders does not sign a diet order.

#### `w6Recovery` (new screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ca-title22-70233-postanesthesia-complications | postAnesthesiaComplications | coded anesthesia-complication-status | physician | never/compliance | signPostAnesthesiaNote | always; episode | ["none", "present"] |

- `ca-title22-70233-postanesthesia-complications`: Dedicated postanesthetic note requires presence/absence as a finite allowed set; clinical details may be added but are not claimed by this atomic rule.

#### `w6Rounding` (existing screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ca-title22-70749-working-diagnosis | progressWorkingDiagnosis | coded icd10 | physician,np,surgeon | never/compliance | signProgressNote | always; episode | null |

- `ca-title22-70749-working-diagnosis`: New progress-note commit requires current working diagnosis; optional progressNote is insufficient.

#### `w6ScheduleIISeries` (new screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| federal-rx-1306-12-earliest-fill | earliestFillDate | coded nonempty-narrative | physician,np,surgeon | never/compliance | signScheduleIISeries | orderClass scheduleII; perOrderLine | null |
| federal-rx-1306-12-diversion-risk | seriesDiversionRiskAssessed | flag | physician,np,surgeon | never/safety/humanOnly | signScheduleIISeries | always; episode | null |

- `federal-rx-1306-12-earliest-fill`: A dedicated multiple-Schedule-II prescription artifact requires an earliest-fill date on every series line (including the first, a disclosed stricter policy). Date is a non-empty ISO-8601 string; interpreting or enforcing pharmacy fill eligibility is separate.

- `federal-rx-1306-12-diversion-risk`: Dedicated series-issuance commit requires a human prescriber conclusion that the series does not create undue diversion/abuse risk. It documents the judgment, not automated assessment of risk.

#### `w6Sign` (existing screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ca-statutes-bpc-741-education-exceptions | naloxoneEducationOutcome | coded naloxone-education-outcome | physician,np,surgeon | never/compliance/humanOnly | signOrders | naloxoneRisk; episode | ["provided", "declined", "educatedWithin24Months"] |
| federal-rx-1311-140-ready-selection | controlledReadyToSign | flag | physician,np,surgeon | never/safety/humanOnly | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1311-140-ready-selection | controlledReadyToSign | flag | physician,np,surgeon | never/safety/humanOnly | signOrders | orderClass controlled-V; perOrderLine | null |

| Rule | Info | Commit | When | Mode | Exact content binding |
| --- | --- | --- | --- | --- | --- |
| federal-rx-1311-120-display-issue-date | controlledSigningIssueDate | signOrders | orderClass controlled-II-IV | shownOnCommit | Actual issue date of every selected controlled prescription; sourced from the order artifact, never the future earliest-fill date. |
| federal-rx-1311-120-display-issue-date | controlledSigningIssueDate | signOrders | orderClass controlled-V | shownOnCommit | Actual issue date of every selected controlled prescription; sourced from the order artifact, never the future earliest-fill date. |
| federal-rx-1311-120-display-patient-name | controlledSigningPatientName | signOrders | orderClass controlled-II-IV | shownOnCommit | Patient full name on every selected controlled prescription; do not substitute initials/sex/age. |
| federal-rx-1311-120-display-patient-name | controlledSigningPatientName | signOrders | orderClass controlled-V | shownOnCommit | Patient full name on every selected controlled prescription; do not substitute initials/sex/age. |
| federal-rx-1311-120-display-drug-name | controlledSigningDrugName | signOrders | orderClass controlled-II-IV | shownOnCommit | Drug name for every selected controlled prescription line. |
| federal-rx-1311-120-display-drug-name | controlledSigningDrugName | signOrders | orderClass controlled-V | shownOnCommit | Drug name for every selected controlled prescription line. |
| federal-rx-1311-120-display-strength | controlledSigningStrength | signOrders | orderClass controlled-II-IV | shownOnCommit | Product strength for every selected controlled prescription line, distinct from dose. |
| federal-rx-1311-120-display-strength | controlledSigningStrength | signOrders | orderClass controlled-V | shownOnCommit | Product strength for every selected controlled prescription line, distinct from dose. |
| federal-rx-1311-120-display-form | controlledSigningDosageForm | signOrders | orderClass controlled-II-IV | shownOnCommit | Dosage form for every selected controlled prescription line. |
| federal-rx-1311-120-display-form | controlledSigningDosageForm | signOrders | orderClass controlled-V | shownOnCommit | Dosage form for every selected controlled prescription line. |
| federal-rx-1311-120-display-quantity | controlledSigningQuantity | signOrders | orderClass controlled-II-IV | shownOnCommit | Prescribed quantity for every selected controlled prescription line. |
| federal-rx-1311-120-display-quantity | controlledSigningQuantity | signOrders | orderClass controlled-V | shownOnCommit | Prescribed quantity for every selected controlled prescription line. |
| federal-rx-1311-120-display-directions | controlledSigningDirections | signOrders | orderClass controlled-II-IV | shownOnCommit | Complete directions for use for every selected controlled prescription line. |
| federal-rx-1311-120-display-directions | controlledSigningDirections | signOrders | orderClass controlled-V | shownOnCommit | Complete directions for use for every selected controlled prescription line. |
| federal-rx-1311-120-display-refills | controlledSigningRefills | signOrders | orderClass controlled-II-IV | shownOnCommit | Authorized repeat count for every selected Schedule III–V prescription; showing zero for Schedule II as well is a stricter display policy. |
| federal-rx-1311-120-display-refills | controlledSigningRefills | signOrders | orderClass controlled-V | shownOnCommit | Authorized repeat count for every selected Schedule III–V prescription; showing zero for Schedule II as well is a stricter display policy. |
| federal-rx-1311-120-display-earliest-fill | controlledSigningEarliestFill | signOrders | orderClass controlled-II-IV | shownOnCommit | Earliest fill date for every later Schedule II series member; show not applicable on other selected orders. |
| federal-rx-1311-120-display-earliest-fill | controlledSigningEarliestFill | signOrders | orderClass controlled-V | shownOnCommit | Earliest fill date for every later Schedule II series member; show not applicable on other selected orders. |
| federal-rx-1311-120-display-prescriber-name | controlledSigningPrescriberName | signOrders | orderClass controlled-II-IV | shownOnCommit | Prescriber full name for every selected controlled prescription. |
| federal-rx-1311-120-display-prescriber-name | controlledSigningPrescriberName | signOrders | orderClass controlled-V | shownOnCommit | Prescriber full name for every selected controlled prescription. |
| federal-rx-1311-120-display-prescriber-address | controlledSigningPrescriberAddress | signOrders | orderClass controlled-II-IV | shownOnCommit | Prescriber address for every selected controlled prescription. |
| federal-rx-1311-120-display-prescriber-address | controlledSigningPrescriberAddress | signOrders | orderClass controlled-V | shownOnCommit | Prescriber address for every selected controlled prescription. |
| federal-rx-1311-120-display-prescriber-dea | controlledSigningDea | signOrders | orderClass controlled-II-IV | shownOnCommit | Prescriber DEA registration or lawful institutional/government identification for every selected controlled prescription. |
| federal-rx-1311-120-display-prescriber-dea | controlledSigningDea | signOrders | orderClass controlled-V | shownOnCommit | Prescriber DEA registration or lawful institutional/government identification for every selected controlled prescription. |
| federal-rx-1311-140-signing-notice | controlledSigningLegalNotice | signOrders | orderClass controlled-II-IV | shownOnCommit | Display the exact legal attestation in 21 CFR 1311.140(a)(3) immediately above the Sign button; use the source text verbatim in the renderer, not this label as placeholder content. |
| federal-rx-1311-140-signing-notice | controlledSigningLegalNotice | signOrders | orderClass controlled-V | shownOnCommit | Display the exact legal attestation in 21 CFR 1311.140(a)(3) immediately above the Sign button; use the source text verbatim in the renderer, not this label as placeholder content. |

- `ca-statutes-bpc-741-education-exceptions`: Replace the old naloxoneEducation EntryReq with this coded truthful outcome under existing naloxoneRisk. The 24-month exception is a human-reported outcome, not an automatically validated historical clock; other risk eligibility remains a separate core rule.

- `federal-rx-1311-140-ready-selection`: Require an explicit human ready-for-signature selection per controlled prescription; Schedule V is added below. Edit-triggered invalidation is the separate next rule; this classification covers selection only.

- `federal-rx-1311-120-display-issue-date`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-patient-name`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-drug-name`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-strength`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-form`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-quantity`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-directions`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-refills`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-earliest-fill`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-prescriber-name`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-prescriber-address`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-prescriber-dea`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-140-signing-notice`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

#### `w6StandingOrders` (new screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ca-title22-70263-standing-circumstances | standingOrderCircumstances | coded nonempty-narrative | physician,np,surgeon | never/compliance | signStandingOrder | always; episode | null |
| ca-title22-70263-standing-conditions | standingOrderConditions | coded nonempty-narrative | physician,np,surgeon | never/compliance | signStandingOrder | always; episode | null |

- `ca-title22-70263-standing-circumstances`: Add a required data capture using existing ElementSpec, CommitSpec and EntryReq; no new syntax or predicate is needed.

- `ca-title22-70263-standing-conditions`: Add a required data capture using existing ElementSpec, CommitSpec and EntryReq; no new syntax or predicate is needed.

#### `w6Telehealth` (new screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ca-statutes-bpc-2290-5-telehealth-document | telehealthConsentRecord | coded telehealth-consent-mode | physician,np,surgeon | never/compliance | recordTelehealthConsent | always; episode | ["verbal", "written"] |

- `ca-statutes-bpc-2290-5-telehealth-document`: Dedicated service-linked telehealth consent documentation with truthful verbal/written modes. Actual pre-care sequence remains the separate event-time rules.

### W7 — 34 unique spec-data rules

#### `w7Decision` (existing screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| federal-rx-1306-12-zero-refills | refillScheduleEligibility | coded refill-schedule-eligibility | physician,np | never/compliance/humanOnly | approveRefill | always; episode | ["notScheduleII"] |
| federal-rx-1306-12-zero-refills | refillRefills | quantity none | physician,np | defaultConfirm/compliance | approveRefill | orderClass scheduleII; episode | ["0"] |
| federal-rx-1306-12-zero-refills | drug | coded formulary | physician,np,surgeon | defaultConfirm/safety | approveRefill | always; episode | null |
| federal-rx-1306-12-zero-refills | refillDecision | coded approve-deny-modify | physician,np | defaultConfirm/safety | approveRefill | always; episode | ["approve", "modify"] |
| federal-rx-1306-12-zero-refills | refillDecision | coded approve-deny-modify | physician,np | defaultConfirm/safety | denyRefill | always; episode | ["deny"] |
| federal-rx-1306-12-zero-refills | refillDenyReason | coded refill-deny-reason | physician,np | defaultConfirm/compliance | denyRefill | always; episode | null |

- `federal-rx-1306-12-zero-refills`: For new Schedule II prescriptions, require refills=0 per line under existing orderClass scheduleII. W7 has no current drug orderLines, so a conditional constraint alone is vacuous: require a human notScheduleII eligibility code on every refill decision, route Schedule II to signOrders as a new prescription, and bind a drug capture to its selected order slot when using the extra refillRefills constraint. This is an explicitly human-verified schedule gate, not automatic classification of the incoming Task.

#### `w7EmergencyRxFollowup` (new screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| federal-rx-1306-11-emergency-label | emergencyAuthorizationNotation | coded emergency-authorization-notation | physician,np,surgeon | never/compliance | signEmergencyRxFollowup | always; episode | ["Authorization for Emergency Dispensing"] |

- `federal-rx-1306-11-emergency-label`: Dedicated emergency-follow-up prescription artifact requires the exact notation via allowed values. It does not verify the seven-day deadline or send the artifact.

#### `w7Orders` (new screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ca-statutes-bpc-4040-patient-name | prescriptionPatientName | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | always; perOrderLine | null |
| ca-statutes-bpc-4040-patient-address | prescriptionPatientAddress | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | always; perOrderLine | null |
| ca-statutes-bpc-4040-directions | prescriptionDirections | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | always; perOrderLine | null |
| ca-statutes-bpc-4040-license-classification | prescriberLicenseClassification | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | always; perOrderLine | null |
| ca-statutes-bpc-4040-federal-registry | prescriberFederalRegistration | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| ca-statutes-bpc-4040-federal-registry | prescriberFederalRegistration | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-04-medical-purpose | controlledMedicalPurpose | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-04-medical-purpose | controlledMedicalPurpose | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-patient-name | prescriptionPatientName | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-05-patient-name | prescriptionPatientName | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-patient-address | prescriptionPatientAddress | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-05-patient-address | prescriptionPatientAddress | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-strength | controlledProductStrength | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-05-strength | controlledProductStrength | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-dosage-form | controlledDosageForm | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-05-dosage-form | controlledDosageForm | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-directions | prescriptionDirections | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-05-directions | prescriptionDirections | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-prescriber-name | controlledPrescriberName | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-05-prescriber-name | controlledPrescriberName | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-prescriber-address | controlledPrescriberAddress | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-05-prescriber-address | controlledPrescriberAddress | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-prescriber-dea | prescriberFederalRegistration | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1306-05-prescriber-dea | prescriberFederalRegistration | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | orderClass controlled-V; perOrderLine | null |
| federal-rx-1306-05-ghb-need | ghbMedicalNeed | coded nonempty-narrative | physician,np,surgeon | never/compliance | signOrders | drugClass ghb; perOrderLine | null |

- `ca-statutes-bpc-4040-patient-name`: Capture patient name on each prescription artifact; the chart banner does not write prescription content. Outbound serialization/delivery remains backend work.

- `ca-statutes-bpc-4040-patient-address`: Add a required data capture using existing ElementSpec, CommitSpec and EntryReq; no new syntax or predicate is needed.

- `ca-statutes-bpc-4040-directions`: Require a distinct non-empty complete sig on each prescription; dose/route/freq alone do not establish usable written directions. This gate prepares content; transmission is outside the checker.

- `ca-statutes-bpc-4040-license-classification`: Capture the license classification as prescription content; this does not verify license validity or scope.

- `ca-statutes-bpc-4040-federal-registry`: Capture registration content for controlled prescriptions. Schedule V needs its own existing drug-class data tag and duplicate EntryReq (added below); actual authority is a separate rule.

- `federal-rx-1306-04-medical-purpose`: Capture a non-empty legitimate-purpose statement on each controlled order, including Schedule V via the extra class-specific requirement below. This documents purpose; the checker does not decide medical legitimacy.

- `federal-rx-1306-05-patient-name`: Required prescription-content capture; add a parallel Schedule V requirement using the same existing orderClass constructor. Registration content does not validate legal authority; serialization/delivery is downstream.

- `federal-rx-1306-05-patient-address`: Required prescription-content capture; add a parallel Schedule V requirement using the same existing orderClass constructor. Registration content does not validate legal authority; serialization/delivery is downstream.

- `federal-rx-1306-05-strength`: Required prescription-content capture; add a parallel Schedule V requirement using the same existing orderClass constructor. Registration content does not validate legal authority; serialization/delivery is downstream.

- `federal-rx-1306-05-dosage-form`: Required prescription-content capture; add a parallel Schedule V requirement using the same existing orderClass constructor. Registration content does not validate legal authority; serialization/delivery is downstream.

- `federal-rx-1306-05-directions`: Required prescription-content capture; add a parallel Schedule V requirement using the same existing orderClass constructor. Registration content does not validate legal authority; serialization/delivery is downstream.

- `federal-rx-1306-05-prescriber-name`: Required prescription-content capture; add a parallel Schedule V requirement using the same existing orderClass constructor. Registration content does not validate legal authority; serialization/delivery is downstream.

- `federal-rx-1306-05-prescriber-address`: Required prescription-content capture; add a parallel Schedule V requirement using the same existing orderClass constructor. Registration content does not validate legal authority; serialization/delivery is downstream.

- `federal-rx-1306-05-prescriber-dea`: Required prescription-content capture; add a parallel Schedule V requirement using the same existing orderClass constructor. Registration content does not validate legal authority; serialization/delivery is downstream.

- `federal-rx-1306-05-ghb-need`: Add the ghb formulary class to relevant product entries (ordinary drug-class data), then require non-empty medical need on those lines. No new When is needed.

#### `w7ScheduleIISeries` (new screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| federal-rx-1306-12-earliest-fill | earliestFillDate | coded nonempty-narrative | physician,np,surgeon | never/compliance | signScheduleIISeries | orderClass scheduleII; perOrderLine | null |
| federal-rx-1306-12-diversion-risk | seriesDiversionRiskAssessed | flag | physician,np,surgeon | never/safety/humanOnly | signScheduleIISeries | always; episode | null |

- `federal-rx-1306-12-earliest-fill`: A dedicated multiple-Schedule-II prescription artifact requires an earliest-fill date on every series line (including the first, a disclosed stricter policy). Date is a non-empty ISO-8601 string; interpreting or enforcing pharmacy fill eligibility is separate.

- `federal-rx-1306-12-diversion-risk`: Dedicated series-issuance commit requires a human prescriber conclusion that the series does not create undue diversion/abuse risk. It documents the judgment, not automated assessment of risk.

#### `w7Sign` (new screen)

Place the following fields in an expanded section adjacent to their action; order-line fields use `.current` (or the explicitly selected slot), not a shared unbound episode slot.

| Rule | Element | Kind / unit / valueSet | Roles | Prefill / friction / human | Commit | When / scope | allowed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ca-statutes-bpc-741-education-exceptions | naloxoneEducationOutcome | coded naloxone-education-outcome | physician,np,surgeon | never/compliance/humanOnly | signOrders | naloxoneRisk; episode | ["provided", "declined", "educatedWithin24Months"] |
| federal-rx-1311-140-ready-selection | controlledReadyToSign | flag | physician,np,surgeon | never/safety/humanOnly | signOrders | orderClass controlled-II-IV; perOrderLine | null |
| federal-rx-1311-140-ready-selection | controlledReadyToSign | flag | physician,np,surgeon | never/safety/humanOnly | signOrders | orderClass controlled-V; perOrderLine | null |

| Rule | Info | Commit | When | Mode | Exact content binding |
| --- | --- | --- | --- | --- | --- |
| federal-rx-1311-120-display-issue-date | controlledSigningIssueDate | signOrders | orderClass controlled-II-IV | shownOnCommit | Actual issue date of every selected controlled prescription; sourced from the order artifact, never the future earliest-fill date. |
| federal-rx-1311-120-display-issue-date | controlledSigningIssueDate | signOrders | orderClass controlled-V | shownOnCommit | Actual issue date of every selected controlled prescription; sourced from the order artifact, never the future earliest-fill date. |
| federal-rx-1311-120-display-patient-name | controlledSigningPatientName | signOrders | orderClass controlled-II-IV | shownOnCommit | Patient full name on every selected controlled prescription; do not substitute initials/sex/age. |
| federal-rx-1311-120-display-patient-name | controlledSigningPatientName | signOrders | orderClass controlled-V | shownOnCommit | Patient full name on every selected controlled prescription; do not substitute initials/sex/age. |
| federal-rx-1311-120-display-drug-name | controlledSigningDrugName | signOrders | orderClass controlled-II-IV | shownOnCommit | Drug name for every selected controlled prescription line. |
| federal-rx-1311-120-display-drug-name | controlledSigningDrugName | signOrders | orderClass controlled-V | shownOnCommit | Drug name for every selected controlled prescription line. |
| federal-rx-1311-120-display-strength | controlledSigningStrength | signOrders | orderClass controlled-II-IV | shownOnCommit | Product strength for every selected controlled prescription line, distinct from dose. |
| federal-rx-1311-120-display-strength | controlledSigningStrength | signOrders | orderClass controlled-V | shownOnCommit | Product strength for every selected controlled prescription line, distinct from dose. |
| federal-rx-1311-120-display-form | controlledSigningDosageForm | signOrders | orderClass controlled-II-IV | shownOnCommit | Dosage form for every selected controlled prescription line. |
| federal-rx-1311-120-display-form | controlledSigningDosageForm | signOrders | orderClass controlled-V | shownOnCommit | Dosage form for every selected controlled prescription line. |
| federal-rx-1311-120-display-quantity | controlledSigningQuantity | signOrders | orderClass controlled-II-IV | shownOnCommit | Prescribed quantity for every selected controlled prescription line. |
| federal-rx-1311-120-display-quantity | controlledSigningQuantity | signOrders | orderClass controlled-V | shownOnCommit | Prescribed quantity for every selected controlled prescription line. |
| federal-rx-1311-120-display-directions | controlledSigningDirections | signOrders | orderClass controlled-II-IV | shownOnCommit | Complete directions for use for every selected controlled prescription line. |
| federal-rx-1311-120-display-directions | controlledSigningDirections | signOrders | orderClass controlled-V | shownOnCommit | Complete directions for use for every selected controlled prescription line. |
| federal-rx-1311-120-display-refills | controlledSigningRefills | signOrders | orderClass controlled-II-IV | shownOnCommit | Authorized repeat count for every selected Schedule III–V prescription; showing zero for Schedule II as well is a stricter display policy. |
| federal-rx-1311-120-display-refills | controlledSigningRefills | signOrders | orderClass controlled-V | shownOnCommit | Authorized repeat count for every selected Schedule III–V prescription; showing zero for Schedule II as well is a stricter display policy. |
| federal-rx-1311-120-display-earliest-fill | controlledSigningEarliestFill | signOrders | orderClass controlled-II-IV | shownOnCommit | Earliest fill date for every later Schedule II series member; show not applicable on other selected orders. |
| federal-rx-1311-120-display-earliest-fill | controlledSigningEarliestFill | signOrders | orderClass controlled-V | shownOnCommit | Earliest fill date for every later Schedule II series member; show not applicable on other selected orders. |
| federal-rx-1311-120-display-prescriber-name | controlledSigningPrescriberName | signOrders | orderClass controlled-II-IV | shownOnCommit | Prescriber full name for every selected controlled prescription. |
| federal-rx-1311-120-display-prescriber-name | controlledSigningPrescriberName | signOrders | orderClass controlled-V | shownOnCommit | Prescriber full name for every selected controlled prescription. |
| federal-rx-1311-120-display-prescriber-address | controlledSigningPrescriberAddress | signOrders | orderClass controlled-II-IV | shownOnCommit | Prescriber address for every selected controlled prescription. |
| federal-rx-1311-120-display-prescriber-address | controlledSigningPrescriberAddress | signOrders | orderClass controlled-V | shownOnCommit | Prescriber address for every selected controlled prescription. |
| federal-rx-1311-120-display-prescriber-dea | controlledSigningDea | signOrders | orderClass controlled-II-IV | shownOnCommit | Prescriber DEA registration or lawful institutional/government identification for every selected controlled prescription. |
| federal-rx-1311-120-display-prescriber-dea | controlledSigningDea | signOrders | orderClass controlled-V | shownOnCommit | Prescriber DEA registration or lawful institutional/government identification for every selected controlled prescription. |
| federal-rx-1311-140-signing-notice | controlledSigningLegalNotice | signOrders | orderClass controlled-II-IV | shownOnCommit | Display the exact legal attestation in 21 CFR 1311.140(a)(3) immediately above the Sign button; use the source text verbatim in the renderer, not this label as placeholder content. |
| federal-rx-1311-140-signing-notice | controlledSigningLegalNotice | signOrders | orderClass controlled-V | shownOnCommit | Display the exact legal attestation in 21 CFR 1311.140(a)(3) immediately above the Sign button; use the source text verbatim in the renderer, not this label as placeholder content. |

- `ca-statutes-bpc-741-education-exceptions`: Replace the old naloxoneEducation EntryReq with this coded truthful outcome under existing naloxoneRisk. The 24-month exception is a human-reported outcome, not an automatically validated historical clock; other risk eligibility remains a separate core rule.

- `federal-rx-1311-140-ready-selection`: Require an explicit human ready-for-signature selection per controlled prescription; Schedule V is added below. Edit-triggered invalidation is the separate next rule; this classification covers selection only.

- `federal-rx-1311-120-display-issue-date`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-patient-name`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-drug-name`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-strength`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-form`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-quantity`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-directions`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-refills`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-earliest-fill`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-prescriber-name`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-prescriber-address`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-120-display-prescriber-dea`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

- `federal-rx-1311-140-signing-notice`: Add a named InfoSpec and shownOnCommit ReviewReq with an exact renderer payload binding. A new named panel is supported today; no generic mandatory-subfield language extension is necessary for this atomic display item. This proves visible content within the modeled signing boundary, not authenticated EPCS transaction duration or correctness of upstream values.

## New commit registry

| Commit | Roles |
| --- | --- |
| authorizeBedsideMedication | physician, np, surgeon |
| authorizeDirectDispensing | physician, np, surgeon |
| authorizePatientOwnedMedication | physician, np, surgeon |
| authorizeSelfAdministration | physician, np, surgeon |
| chartRestraintEpisode | physician, np, surgeon, rn |
| denyRefill | physician, np |
| documentHoldApplication | physician, np, surgeon |
| documentMentalHealthAccessDenial | physician, np, surgeon |
| documentMethotrexateDischarge | physician, np, surgeon |
| documentMinorAssaultCareConsent | physician, np, surgeon |
| documentMinorMentalHealthConsent | physician, np, surgeon |
| documentMinorSubstanceCareConsent | physician, np, surgeon |
| documentSelfAdministration | physician, np, surgeon, rn |
| documentTreatmentConsent | physician, np, surgeon |
| recordAdmission | physician, np, surgeon |
| recordAnesthesiaBloodAdministration | physician |
| recordCommunicationNeeds | physician, np, surgeon, rn |
| recordDelegatedControlledTransmission | physician, np, surgeon |
| recordEdArrival | physician, np, surgeon, rn |
| recordHoldAdvisement | physician, np, surgeon |
| recordRestraintEnd | physician, np, surgeon, rn |
| recordRestraintStart | physician, np, surgeon, rn |
| recordTelehealthConsent | physician, np, surgeon |
| recordVerbalOrder | rn, physician, np |
| signAnesthesiaRecord | physician |
| signDietOrder | physician, np, surgeon |
| signEmergencyRxFollowup | physician, np, surgeon |
| signNewbornOxygenOrder | physician |
| signPostAnesthesiaNote | physician |
| signProgressNote | physician, np, surgeon |
| signRestraintOrder | physician, np, surgeon |
| signScheduleIISeries | physician, np, surgeon |
| signStandingOrder | physician, np, surgeon |
| signSuicideRiskAssessment | physician, np, surgeon, rn |
| signTreatmentOrder | physician, np, surgeon |

Each new commit needs the appropriate resource-producing backend action, a human-only commit button and a canonical navigator route; CommitSpec itself does not implement a resource adapter. No new commit may make a previously protected action available to a broader role.

## Verification handoff

Validate `catalog.json` with `python -m json.tool docs/rules/catalog.json`. Re-run `python scripts/rules/build_catalog.py --check` to enforce complete source coverage, de-duplication, fit/group validity, encoding shape, supported constructors, consistent reused elements, allowed enums, workflow placements and generated-file drift. For the content implementation, run the repository content/Lean checks and demonstrate missing-field rejection, confirmation, wrong-role rejection, negative coded outcomes and mixed Schedule II/non-II lines. Date timing, arbitrary vocabulary membership, recurrent event coverage and actual delivery must continue to be reported as limitations until their features exist.
