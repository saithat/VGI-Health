Catalog-module rules are encoded; core keeps only denyRefill for W7 denial tasks.

# Rules catalog and classification

Generated from reviewed decisions in `scripts/rules/build_catalog.py`. Baseline: the checked-in `lean/Ehr/Specs/V1.lean` and `lean/Ehr/Core/Types.lean`, not pending content-lane work. Research input digests are pinned so a reorder/update cannot silently reuse the wrong indexed decision. The deliverable is a classification and implementation plan; it does not change the Lean spec.

Read 578 source rows; excluded 22 nonqualifying rows; retained 556 unique rules after citation + atomic-requirement de-duplication. Basis: 458 law, 98 entrenched. Distinct citations remain distinct legal rules even when their encodings can share a field. The two guidance-lane files are compatibility mirrors, not twice as many rules. `sourceIds` keeps every distinct source id, and `sourceLocations` keeps every file occurrence, including identical ids in mirrors.

The source `verified`, quotes, URLs, confidence and notes are preserved, not newly certified here. Research guesses are retained under `sourceAssessment`; only `fit`, `fitReason`, `existingSpecItems` and `proposedEncoding` are the audited classification. Source JSON basis omissions on binding rules are normalized to `law`. Nonbinding rows are accepted only with `basis: entrenched` and a concrete `entrenchedBecause`; accreditation, self-assessment and local checklist adoption are not relabeled law.

The dated/timed entry rules (`cms-482.24-c1-dated`, `cms-482.24-c1-timed`) now have trusted capture timestamps and persisted provenance. Historical clockless entries remain unstamped; see [entry-time implementation and proof scope](../design/chart-timing.md). Classification totals below retain their research categories.

## Totals

| Fit | Rules |
| --- | --- |
| existing | 29 |
| spec-data | 124 |
| core-feature | 264 |
| out-of-scope | 139 |

| Basis | existing | spec-data | core-feature | out-of-scope | Total |
| --- | --- | --- | --- | --- | --- |
| law | 22 | 120 | 199 | 117 | 458 |
| entrenched | 7 | 4 | 65 | 22 | 98 |

Workflow/persona tables count research applicability, with overlap: one rule may count in several rows. The implementation table counts exact proposed placements. Workflow or persona membership does not by itself make a legal obligation universal.

| workflows | existing | spec-data | core-feature | out-of-scope | Total |
| --- | --- | --- | --- | --- | --- |
| W1 | 13 | 42 | 91 | 61 | 207 |
| W2 | 0 | 4 | 37 | 24 | 65 |
| W3 | 16 | 86 | 173 | 110 | 385 |
| W4 | 7 | 45 | 84 | 56 | 192 |
| W5 | 16 | 47 | 91 | 68 | 222 |
| W6 | 19 | 67 | 189 | 104 | 379 |
| W7 | 10 | 36 | 75 | 51 | 172 |

| personas | existing | spec-data | core-feature | out-of-scope | Total |
| --- | --- | --- | --- | --- | --- |
| P1 | 13 | 43 | 117 | 67 | 240 |
| P2 | 16 | 86 | 173 | 110 | 385 |
| P3 | 7 | 45 | 84 | 56 | 192 |
| P4 | 16 | 47 | 92 | 70 | 225 |
| P5 | 19 | 67 | 189 | 105 | 380 |

### Spec-data implementation placements

| Workflow | Unique spec-data rules placed |
| --- | --- |
| W1 | 40 |
| W2 | 3 |
| W3 | 77 |
| W4 | 38 |
| W5 | 46 |
| W6 | 66 |
| W7 | 34 |

## Classification limits and encoding conventions

- `existing` means the abstract UI already enforces the named capture/action, not full legal, clinical, certification or backend compliance. Optional elements alone never qualify. All patient truth, authentic role membership and physical care still depend on trusted inputs.
- Open narrative captures use `.coded "nonempty-narrative"`: the existing coded parser accepts any non-empty string. This is deliberately an open string domain, not a claim of terminology validation. Existing `.text` accepts an empty string; even the existing finding/diagnosis mappings do not prove meaningful clinical content. A production non-empty text contract would belong in `value-validation`.
- A valueSet name alone never enforces a finite set. Every finite enum in this plan supplies `EntryReq.allowed`; quantities use unscaled human strings such as `"0"` (the parser converts to tenths). Required flags must be true; negative outcomes use allowed coded alternatives.
- New dedicated commits are ordinary `CommitSpec` data for a particular artifact, not invented `When` cases. Their guards only apply when that artifact is created. They do not prove every clinically required artifact was created or that any physical event occurred. Event deadlines, eligibility, recurring coverage and all-record completeness stay core features. The canonical program must route artifact creation exclusively through its named commit; backend effects must honor the same mapping. `workflowRoutes` explicitly maps broad source applicability to shared canonical screens; it is navigation data, not a new When.
- Required routes marked broader than law (for example all-discharge needs assessments or explicit none/not-applicable values) are proposed hospital UI policies. They must not fabricate findings or claim a new statutory requirement.
- New InfoSpec identifiers with concrete payload bindings are spec-data: implement their content through the existing named-panel renderer, then require shownOnCommit. A missing panel or display field alone is not a new language feature. Structured-display features are reserved for new semantic relations such as a signing-button label, per-list selection emphasis or workflow-phase scoping. Visibility of a placeholder panel never satisfies the intended content binding.
- All ordinary new captures use `.never` to avoid unsupported record sources. Existing `recordValue` can read arbitrary named record pairs, but versioned review receipts currently recognize only unversioned/allergy/medication versions. New reviews use unversioned InfoSpec plus shownOnCommit and no receipt; freshness comes from the live artifact binding, not an invented version fact. The plan does not invent a new receipt version, waiver, patient predicate or alert trigger. Null `windowMin`/`waivedBy` means no receipt/waiver is proposed.
- Schedule II zero-refill constraints use the existing `scheduleII` formulary tag. Incoming W7 requests do not automatically create order lines. The plan explicitly adds drug capture and a human schedule-eligibility gate; denying a request and authorizing a refill must have distinct backend effects.
- All new prescription issuance commits inherit the complete relevant `signOrders` entries/reviews/alerts and safety steps; new note/order specialty commits inherit analogous applicable base requirements. Adding a specialist commit must not create a route around the base contract. No proposed field alone certifies EPCS, external transmission, imported records or irreversible signatures.

## Core-feature proposals

Primary groups partition the rules for counting. Some rules require more than one extension (for example age-specific restraint expiration); the prose names dependencies. Costs include Types/JSON/semantics/guard/checker/render and focused proof/check updates: S = isolated data-sized change (<1 engineer-day), M = roughly 2–4 engineer-days, L = roughly 1–2+ engineer-weeks. Estimates are planning judgments, not hackathon delivery promises, and exclude production clinical/security/backend integrations.

| Group | Rules | Cost |
| --- | --- | --- |
| event-time-window | 67 | M |
| order-expiry-clock | 11 | M |
| patient-predicate | 59 | M |
| qualified-authorization | 35 | L |
| record-level-completeness | 38 | L |
| release-access-policy | 10 | L |
| structured-display | 10 | M |
| value-validation | 34 | M |

### `event-time-window` — 67 rules, M

Add EventId and timestamped EventEvidence (patient, episode, actor, artifact/version) plus TemporalReq with subject event, anchor event, before/after bounds and an explicit obligation deadline. Use integer timestamps rather than receipt age; retain separate completion and filing events and a business-day calendar where law requires it. The checker verifies each affected commit reaches its evidence collection/exception path; the guard compares trusted event times, rejects stale evidence and opens overdue obligations. Evidence identity and clinical execution remain trusted inputs. Qualified actors and applicability compose with the separate groups below.

### `order-expiry-clock` — 11 rules, M

Add durable OrderInstanceId, original issue/start/first-fill anchors and ExpiryReq keyed to an order or detention instance, with duration/calendar-month policy and renewal/reassessment evidence. Keep anchors through transfers and episodes. The checker requires renewal/stop/exception routes; the guard rejects expired actions, prevents resetting the original clock, and generates an expiry/overdue state. A scheduler/backend must perform real auto-stop or release; a proof of guard blocking is not proof the scheduler ran. Compose age-specific policies with ClinicalPredicate.

### `patient-predicate` — 59 rules, M

Extend When with a closed typed ClinicalPredicate AST: patient age bands, service/payer/setting, homelessness, clinical risk/test-result categories, capacity/consent status and captured coded-value equality, with and/or/not. Add only named Facts fields with FHIR provenance and an explicit unknown policy (no silent false). Reuse the same evaluator for EntryReq, ReviewReq and a new AlertCond predicate case. The checker covers true/false/unknown branches and preserves refusal/exception routes; the guard evaluates actual patient/episode facts. Encounter strings must retain encounter meaning, never encode age or homelessness as invented encounter kinds.

### `qualified-authorization` — 35 rules, L

Retain the four demo roles, adding CapabilityReq and AuthEvidence keyed to user, patient relationship, artifact/version and action. Capabilities cover current license/scope, privileges, designated responsible operator, protected policy administrator and signer/party roles; signature evidence must come from an identity provider, not a typed cosign string. The checker prevents bypass of capability/evidence checks and the guard validates their trusted status and bindings at commit. Hospitals/security services still supply proofing, credentials and revocation; the language cannot independently prove those external facts.

### `record-level-completeness` — 38 rules, L

Add typed ArtifactId/version and RecordSetReq over a named finite set (orders, administrations, reports, implants, medication lists), with per-member required fields/provenance, linkage, freshness/invalidation, and bounded aggregates such as refill count or total supply. Include automatic date/time metadata contracts on artifact-producing commits. The checker verifies every writer binds values to the right artifact/member and preserves source/version relationships; the guard quantifies over trusted record members and rejects missing, stale or over-limit items. This extends the present perOrderLine iterator, not backend storage durability or retention.

### `release-access-policy` — 10 rules, L

Add ReadReleaseReq for data category, patient/service context, recipient/relationship/jurisdiction, purpose, consent/hold status and review-right route. Introduce release/access intents distinct from ackResult and versioned revocation evidence. The checker ensures all modeled read/export/release paths consult policy and offer required review/revocation actions; the guard authorizes the exact requested scope and prevents stale consent reuse. Token issuance, physical export, encryption and delivery remain backend duties; this group expresses eligibility and UI policy, not successful transmission.

### `structured-display` — 10 rules, M

Extend InfoSpec with a typed payload contract (required fields, identifier categories, per-row fields/grouping and conditional available content) and add a scoped DisplayReq for commit or named workflow phase, plus a semantic label contract on critical actions. Avoid a free-form HTML contract. The checker verifies visibility, grouping and label requirements for each applicable phase; the renderer produces the contracted payload and the guard rejects missing signing fields. Keep EPCS details/notice continuously pinned during the modeled signing phase; the authenticated signing service remains separate.

### `value-validation` — 34 rules, M

Add a small closed Validation AST to element/artifact constraints: validated code-system membership, dates, lexical numeric/token formatting, typed formulation/unit and weight-category compatibility, product/UDI parsing, default-value requirements and explicitly named bounded arithmetic functions for supply/dose calculations. Apply validation at input and generated output; preserve lexical input where formatting matters. The checker validates supported constraints/defaults and the guard rejects invalid values/relations before commit. Clinically validated calculator tables and standards codecs remain trusted, versioned data; do not add arbitrary executable predicates.

No `external-transmission` or `audit-log` feature group is proposed: actual delivery and durable/immutable audit obligations are classified out-of-scope under the requested UI-checker boundary.

## Top 30 demo-worthy spec-data rules

Ranked for visible hard stops, reusable fields and persona coverage. Same encoding under different citations is still a separate legal rule; technique/tissue duplicates can be demonstrated once. These rankings do not convert proposed policy into law.

| Rank | Rule / source | Field(s) / info(s) | Gate / placement |
| --- | --- | --- | --- |
| 1 | Schedule II prescription cannot have refills (`federal-rx-1306-12-zero-refills`) | refills, refillScheduleEligibility, refillRefills, drug, refillDecision, refillDenyReason | signOrders, approveRefill, denyRefill / w1Orders, w3Orders, w5Orders, w6Orders, w7Decision |
| 2 | Describe operative techniques (`cms-482.51-b6-techniques`) | opTechnique | signOpNote / w6OpNote |
| 3 | Describe tissues removed or altered (`cms-482.51-b6-tissues`) | opTissuesRemovedAltered | signOpNote / w6OpNote |
| 4 | Vaccine record includes administration date (`federal-rx-300aa-25-date`) | vaccineAdministrationDate | recordImmunization / w5Immunizations |
| 5 | Vaccine record includes provider address (`federal-rx-300aa-25-provider-address`) | vaccineProviderAddress | recordImmunization / w5Immunizations |
| 6 | Vaccine record includes provider title when appropriate (`federal-rx-300aa-25-provider-title`) | vaccineProviderTitle | recordImmunization / w5Immunizations |
| 7 | MAR records the drug actually administered (`ca-title22-70749-mar-drug`) | administeredDrug | administerMed / w4Admin |
| 8 | MAR records the dose actually administered (`ca-title22-70749-mar-dose`) | administeredDose | administerMed / w4Admin |
| 9 | MAR records administration time (`ca-title22-70749-mar-time`) | actualAdministrationTime | administerMed / w4Admin |
| 10 | Record nonoral administration route (`ca-title22-70749-mar-route`) | actualAdministrationRoute | administerMed / w4Admin |
| 11 | Record injection site (`ca-title22-70749-mar-site`) | adminSite | administerMed / w4Admin |
| 12 | ED log includes means of arrival (`ca-title22-70413-ed-arrival-means`) | arrivalMode | recordEdArrival / w3Triage |
| 13 | ED log includes nature of complaint (`ca-title22-70413-ed-complaint`) | edArrivalComplaint | recordEdArrival / w3Triage |
| 14 | ED log includes arrival time (`ca-title22-70413-ed-arrival-time`) | edArrivalTime | recordEdArrival / w3Triage |
| 15 | ED log includes departure time (`ca-title22-70413-ed-departure-time`) | edDepartureTime | disposition / w3Disposition |
| 16 | Progress notes include the working diagnosis (`ca-title22-70749-working-diagnosis`) | progressWorkingDiagnosis | signProgressNote / w6Rounding |
| 17 | Discharge summary recapitulates the hospital course (`ca-title22-70749-discharge-course`) | hospitalCourse | discharge, disposition / w6Discharge, w3Disposition |
| 18 | Discharge summary describes hospitalization outcome (`cms-482.24-c4vii-summary-outcome`) | hospitalizationOutcome | discharge / w6Discharge |
| 19 | Evaluate likely post-hospital service needs (`cms-482.43-a2-posthospital-needs`) | postHospitalNeeds | discharge, disposition / w6Discharge, w3Disposition |
| 20 | Determine availability of needed post-hospital services (`cms-482.43-a2-service-availability`) | postHospitalServiceAvailability | discharge, disposition / w6Discharge, w3Disposition |
| 21 | Determine patient access to needed services (`cms-482.43-a2-service-access`) | postHospitalServiceAccess | discharge, disposition / w6Discharge, w3Disposition |
| 22 | Include discharge evaluation in the record (`cms-482.43-a3-evaluation-record`) | dischargePlanningEvaluation | discharge, disposition / w6Discharge, w3Disposition |
| 23 | Discuss discharge evaluation with the patient (`cms-482.43-a3-evaluation-discussion`) | dischargeEvaluationDiscussion | discharge, disposition / w6Discharge, w3Disposition |
| 24 | Education may be declined or recently completed (`ca-statutes-bpc-741-education-exceptions`) | naloxoneEducationOutcome | signOrders / w1Sign, w3Sign, w5Sign, w6Sign, w7Sign |
| 25 | Prescriber identifies prescriptions ready for signing (`federal-rx-1311-140-ready-selection`) | controlledReadyToSign | signOrders / w1Sign, w3Sign, w5Sign, w6Sign, w7Sign |
| 26 | Hospital records primary language (`ca-statutes-hsc-1259-primary-language`) | primaryLanguage | recordCommunicationNeeds / w1Rooming, w3Triage, w4Flowsheet, w5Rooming, w6Consult |
| 27 | Hospital records patient dialect (`ca-statutes-hsc-1259-dialect`) | patientDialect | recordCommunicationNeeds / w1Rooming, w3Triage, w4Flowsheet, w5Rooming, w6Consult |
| 28 | Confirm methotrexate teach-back (`entrenched-ismp-mtx-teachback`) | methotrexateTeachBack | documentMethotrexateDischarge / w6Discharge |
| 29 | Display legal signing notice with controlled Rx (`federal-rx-1311-140-signing-notice`) | controlledSigningLegalNotice | signOrders / w1Sign, w3Sign, w5Sign, w6Sign, w7Sign |
| 30 | Show product strength for controlled Rx signing (`federal-rx-1311-120-display-strength`) | controlledSigningStrength | signOrders / w1Sign, w3Sign, w5Sign, w6Sign, w7Sign |

## Most demo-worthy rules

The top-30 table above focuses on spec-data. These additional source-research candidates include existing, core-feature and out-of-scope obligations; a suggested demonstration is not a claim that the current checker implements it. Descriptions reflect the 2026-10-31 research baseline; current implementation is recorded by each rule's `encodedIn`. CMS implanted-device guidance remains an excluded nonbinding row in `cms.json`, retained here as research context.

- **Adult violent-restraint orders have a four-hour renewal limit, subject to stricter state law.** [42 CFR §482.13(e)(8)(i)(A)](https://www.ecfr.gov/current/title-42/section-482.13) — `cms-482.13-e8iA-adult-four-hours` (binding regulation).
- **Violent restraint/seclusion triggers a qualified face-to-face evaluation within one hour.** [42 CFR §482.13(e)(12)](https://www.ecfr.gov/current/title-42/section-482.13) — `cms-482.13-e12-face-to-face-hour` (binding regulation).
- **Orders without a stated time/dose count stop automatically under the medical-staff policy.** [42 CFR §482.25(b)(5)](https://www.ecfr.gov/current/title-42/section-482.25) — `cms-482.25-b5-automatic-stop` (binding regulation).
- **A preadmission H&P needs the documented update within 24 hours after admission/registration and before surgery/anesthesia.** [42 CFR §482.24(c)(4)(i)(B)](https://www.ecfr.gov/current/title-42/section-482.24) — `cms-482.24-c4iB-hp-update-timing` (binding regulation).
- **A qualified anesthesia provider completes/documents the preanesthesia evaluation within the 48-hour preprocedure window.** [42 CFR §482.52(b)(1)](https://www.ecfr.gov/current/title-42/section-482.52) — `cms-482.52-b1-pre-48hours` (binding regulation).
- **Post-discharge goals of care travel to the follow-up provider at discharge; a displayed summary does not prove transmission.** [42 CFR §482.43(b)](https://www.ecfr.gov/current/title-42/section-482.43) — `cms-482.43-b-send-goals` (binding regulation).
- **Payment or insurance inquiries cannot delay emergency screening or required stabilizing care.** [42 CFR §489.24(d)(4)(i)](https://www.ecfr.gov/current/title-42/section-489.24) — `cms-489.24-d4i-no-payment-delay` (binding regulation).
- **Pending transfer records are sent as soon as practicable afterward, without requiring every pending test before transfer.** [42 CFR §489.24(e)(2)(iii)](https://www.ecfr.gov/current/title-42/section-489.24) — `cms-489.24-e2iii-packet-late-records` (binding regulation).
- **22 CCR §70223(d)(2), (e)** — Pre-op screening tests must be appropriate to the patient and accomplished and recorded within 72 hours; preserve the dire-emergency exception. [Source](https://www.law.cornell.edu/regulations/california/22-CCR-70223) (`ca-title22-70223-screening-72-hours`).
- **22 CCR §70215(a)(1)** — Receiving-unit RN assessment is required on transfer arrival; an assessment in the sending unit does not discharge the new obligation. [Source](https://www.law.cornell.edu/regulations/california/22-CCR-70215) (`ca-title22-70215-transfer-assessment`).
- **22 CCR §70263(g)** — A verbal medication order needs prescriber/furnisher countersignature within 48 hours; demonstrate a deadline queue tied to the actual order. [Source](https://www.law.cornell.edu/regulations/california/22-CCR-70263) (`ca-title22-70263-verbal-countersign-48h`).
- **22 CCR §70749(a)(6)(D)** — Capture restraint removal time, alongside application time and type; preserve the narrow soft-tie support/protection timestamp exception. [Source](https://www.law.cornell.edu/regulations/california/22-CCR-70749) (`ca-title22-70749-restraint-end`).
- **22 CCR §70263(m)(3)** — Patient-brought medicines need physician/pharmacist examination and positive identification after arrival; an RN barcode scan cannot substitute. [Source](https://www.law.cornell.edu/regulations/california/22-CCR-70263) (`ca-title22-70263-home-drug-identify`).
- **22 CCR §70233(a)(4)** — Record the amount of blood or blood fractions administered during anesthesia; estimated blood loss is a different datum. [Source](https://www.law.cornell.edu/regulations/california/22-CCR-70233) (`ca-title22-70233-blood-amount`).
- **22 CCR §70547(i)** — Newborn oxygen orders need review, modification or discontinuation after 24 hours; the source does not prescribe automatic cessation at exactly 24 hours. [Source](https://www.law.cornell.edu/regulations/california/22-CCR-70547) (`ca-title22-70547-newborn-oxygen-24h`).
- **22 CCR §70537(d)** — Pediatric-bed placement above age 13 needs pediatrician approval in unusual circumstances and a documented reason; this is not an outpatient age limit. [Source](https://www.law.cornell.edu/regulations/california/22-CCR-70537) (`ca-title22-70537-pediatric-over13`).
- **22 CCR §70707.1(a)(4)** — Ordinary sterilization consent has a 30–180-day interval; demonstrate exception-specific facts rather than a generic emergency bypass. [Source](https://www.law.cornell.edu/regulations/california/22-CCR-70707.1) (`ca-title22-70707-1-sterilization-minimum-wait`).
- **22 CCR §70707.6(a)(3)** — Medi-Cal sterilization cannot use the elective voluntary shorter-wait request available to non-Medi-Cal patients; preserve separately qualified medical exceptions. [Source](https://www.law.cornell.edu/regulations/california/22-CCR-70707.6) (`ca-title22-70707-6-medi-cal-no-elective-short-wait`).
- **Correct the CURES surgical exemption:** qualifying procedure prescriptions can be nonrefillable **seven-day** supplies; V1 still names `surgery-5-day`. [HSC §11165.4(c)(4)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=11165.4), `ca-statutes-hsc-11165-4-procedure-seven-day`.
- **Suppress excluded CURES reporting:** testosterone and mifepristone must not enter the reporting feed, operative January 2026. This is distinct from consultation. [HSC §11165(k)(1)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=11165), `ca-statutes-hsc-11165-excluded-drugs-reporting`.
- **Validate unused ED take-home medication:** the new 2026 pathway excludes controlled drugs and has five conjunctive conditions, each separately cataloged. [BPC §4068(b)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=4068), `ca-statutes-bpc-4068-unused-ed-noncontrolled` and four companion rows.
- **Keep minor demographics out of CAIR:** never export paragraph-13 SOGISC/sex-assigned-at-birth data for an under-18 patient; adult answers are voluntary. [HSC §120440(c)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=120440), `ca-statutes-hsc-120440-no-minor-sogisc`.
- **Preserve every EHR edit/deletion:** automatic audit evidence includes the actor, access time and actual change. [Civil Code §56.101(b)(1)(B)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=56.101), `ca-statutes-civ-56-101-preserve-edits` and three companion rows.
- **Keep the 5150 clock across transfers:** calculate from first detention, not receiving-facility arrival. [WIC §5150(a)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=WIC&sectionNum=5150), `ca-statutes-wic-5150-hold-start`.
- **Respect the psychotropic consent boundary:** §6924 outpatient mental-health self-consent alone does not authorize psychotropic medication without parent/guardian consent. [Family Code §6924(f)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=FAM&sectionNum=6924), `ca-statutes-fam-6924-psychotropic-exclusion`.
- **Document homeless-discharge transportation offers:** the destination qualifies within 30 minutes **or** 30 miles; acceptance is not mandatory. [HSC §1262.5(o)(10)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=1262.5), `ca-statutes-hsc-1262-5-homeless-transport`.
- **Obtain telehealth consent before care:** verbal or written consent is allowed and must be documented. [BPC §2290.5(b)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=2290.5), `ca-statutes-bpc-2290-5-telehealth-consent` and companion documentation row.
- **Keep patient corrections with exports:** disclosure of a disputed record portion includes its qualifying patient addendum. [HSC §123111(b)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=123111), `ca-statutes-hsc-123111-disclose-addendum`.
- **Reject a refill on an original Schedule III–IV prescription older than six months.** [21 CFR §1306.22(a)](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-21.xml?part=1306) — `federal-rx-1306-22-six-months`.
- **Reject a controlled-Rx signing screen that hides the prescribed quantity during two-factor signing.** [21 CFR §1311.120(b)(9)(iv)](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-21.xml?part=1311) — `federal-rx-1311-120-display-quantity`.
- **Require two distinct authentication-factor categories for controlled e-prescribing.** [21 CFR §1311.115(a)](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-21.xml?part=1311) — `federal-rx-1311-115-two-factors`.
- **Editing a ready controlled prescription invalidates its prior readiness and requires another review.** [21 CFR §1311.120(b)(10)](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-21.xml?part=1311) — `federal-rx-1311-120-edit-review`.
- **Immediately revoke hospital EPCS signing access after notice of a compromised authentication factor.** [21 CFR §1311.130(d)(1)](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-21.xml?part=1311) — `federal-rx-1311-130-compromised-factor`.
- **Require VIS delivery before administration of a covered vaccine.** [42 U.S.C. §300aa-26(d)](https://www.govinfo.gov/content/pkg/USCODE-2024-title42/pdf/USCODE-2024-title42-chap6A-subchapXIX-part2-subpartc-sec300aa-26.pdf) — `federal-rx-300aa-26-vis-before-dose`.
- **Keep the vaccine lot number required when recording the covered dose; V1 already does this.** [42 U.S.C. §300aa-25(a)(2)](https://www.govinfo.gov/content/pkg/USCODE-2024-title42/pdf/USCODE-2024-title42-chap6A-subchapXIX-part2-subpartc-sec300aa-25.pdf) — `federal-rx-300aa-25-lot`.
- **Reject oral-liquid prescribing units other than mL in the certified eRx module.** [45 CFR §170.315(b)(3)(ii)(E)](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-45.xml?part=170) — `federal-rx-170-315-oral-liquids-ml`.
- **`entrenched-ismp-weight-metric`** — Reject pounds as the clinical dosing-weight unit; v1 already enforces kg.
- **`entrenched-npg-two-identifiers`** — Preserve two-person-specific-identifier verification; a pinned banner alone is insufficient.
- **`entrenched-ismp-mtx-daily-indication`** — Require oncologic-indication verification for daily oral methotrexate orders.
- **`entrenched-safer-maximum-daily-dose`** — Check cumulative daily medication dose before dispensing submission.
- **`entrenched-safer-result-escalation`** — Escalate unacknowledged life-threatening results automatically, even with no open inbox.
- **`entrenched-npg-suicide-screen`** — Use a validated suicide screen for eligible behavioral-health ED patients aged 12 or older.
- **`entrenched-leapfrog-bcma-wrong-patient`** — Validate bedside barcode-to-patient matching; a scan field alone does not establish a match.
- **`entrenched-ismp-select-doublechecks`** — Preserve independent checks for selected highest-risk medications; distinct cosigners alone do not prove independence.
- **`entrenched-npg-timeout-performer-change`** — Repeat the time-out when another procedure on the same patient has a different performer.
- **`entrenched-npg-pain-intervention-response`** — Link pain reassessment to the intervention and document the response.

The first-pass spec-data plan has been executed; `catalog.json` records `encodedIn` per rule. `lean/Ehr/Specs/Rules/feature_data.py` is the executable second-pass mapping. The following contracts remain relevant when extending or auditing the implementation; the recorded encodings do not establish full backend or clinical compliance.

## Encoding scope and backend limits

1. Add/reuse ElementSpec definitions in `lean/Ehr/Specs/V1.lean`, then append the entries/commits in each catalog `proposedEncoding`. Add no new When, ValueKind or AlertCond constructor in this lane. New commits are listed in each rule’s `proposedEncoding`; retain the existing role universe.
2. Reuse existing fields exactly where named (`postOpDiet`, `adminSite`, `arrivalMode`, `refills`, `refillRefills`). Add gates to formerly optional fields. Reuse `opTechnique`/`opTissuesRemovedAltered` across CMS/Title 22 citations, and one field/requirement per equivalent encoding. Keep distinct citation ids in the documentation map. Do not change existing chiefComplaint into coded: use `edArrivalComplaint` for the ED-specific non-empty capture.
3. New open narrative values use `.coded "nonempty-narrative"` (or the indicated named open string domain). In the current implementation every coded value must be non-empty, but domain membership is checked only with EntryReq.allowed. Render these open domains as labeled editable inputs; terminology widgets are optional UI presentation, not a guarantee. Dates/times are labeled ISO-8601 strings, without a claim of date validation. For dose-with-unit use one non-empty actual dose description; no mg-only assumption for insulin/volume doses.
4. All new fields are `.never` unless explicitly listed otherwise. No unsupported fromRecord source, clinical default, fabricated not-applicable finding or non-human safety check. A permitted default requires human confirmation. Coded allowed alternatives implement negative/exception outcomes; false required flags do not pass. Friction and humanOnly are explicit in JSON.
5. Screen names are listed in each rule’s `proposedEncoding.placement`; proposed screens must be added to that workflow module’s `screens` and workflow. Keep required captures reachable within design.maxDepth, one capture per element/order slot per path, and no required content in closed groups/unopened tabs. Where infos/reviews are specified, render exact displayContent via the existing named-panel binding (including all order/result rows), then pin a panel with that InfoSpec id beside the commit. No placeholders. All new reviews use shownOnCommit, version="", no receipt and no waiver; windowMin and waivedBy are null. No new alerts are proposed.
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


### Artifact routing and verification

`proposedEncoding.workflowRoutes` records shared-screen routes: preserve patient/encounter and return to the originating workflow. Only the named roles may commit; other roles may view or hand off. A navigation link does not prove artifact creation. ED discharge-planning fields gate disposition directly; W7 new-prescription screens inherit every `signOrders` gate. Per-line captures bind to `.current` or the selected order slot, never an unbound episode slot.

New commits need a resource-producing backend action, a human-only button and a canonical workflow route; `CommitSpec` alone is not an adapter. No new commit may broaden access to a protected action. Validate the JSON with `python -m json.tool docs/rules/catalog.json`; run the content checks in `docs/STATUS.md`, including missing-field and wrong-role rejections, confirmations, negative coded outcomes and mixed Schedule II/non-II lines. The research builder's `--check` also checks generated-file drift, but rebuilding the research baseline overwrites content encoding metadata: rerun `lean/Ehr/Specs/Rules/encode.py` and the second-pass content mapping afterward. Timing, vocabulary validation, recurrent-event coverage and actual delivery require their own implemented features and evidence.

## Research provenance and scope

These are dated research notes, inherited from the source lanes rather than a new verification. The JSON source rows retain quotes, URLs, confidence, notes and partial mappings. Counts and coverage classifications above supersede the source-lane baseline summaries. Hospital-only duties apply to hospital services, including their outpatient activities, and do not automatically extend to independent offices. Proposed alerts, gates and friction are UI choices; no source mandates their exact interaction.

### CMS

Researched 2026-10-31. Regulatory wording was checked against the official [eCFR API, Part 482](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-42.xml?part=482) and [Part 489](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-42.xml?part=489), as of 2026-10-29. Several human-readable eCFR pages returned access blocks; the official XML supplied complete text. CMS guidance was checked in [State Operations Manual Appendix A, revision 248, issued September 18, 2026](https://www.cms.gov/Regulations-and-Guidance/Guidance/Manuals/downloads/som107ap_a_hospitals.pdf), including rendered PDF pages 474, 486 and 490. Guidance rows identify their survey tags and PDF pages and remain `binding: false`.

Each JSON row contains an exact source excerpt of no more than 25 words. General hospital duties also apply to hospital outpatient services; W1/W2/W5/W7 assignments do not extend these CoPs automatically to independent offices. Workflow counts overlap.

CMS source mappings used existing v1 names; null commits identify missing clinical boundaries. Anesthesia rows relate to W6/P5, but the baseline lacked a qualified anesthesia-provider persona. Admission/procedure/restraint/recovery deadlines are not review-receipt windows. The source notes preserve emergency exceptions, outpatient H&P alternatives, violent/nonviolent restraint scope and EMTALA transfer alternatives. Source quote checks normalized PDF whitespace only.

### California Title 22

**Sources and currency.** Text opened on **2026-10-31** from Cornell LII reproductions of CCR Title 22, Division 5, Chapter 1. Every quote is verbatim after whitespace normalization and at most 25 words. All 120 rows are `verified: true` for opened, matched text; all have **medium confidence** because LII advertises quarterly updates without a displayed through-date and official Westlaw currentness could not be confirmed. Verification does not assert that the mirror is current. Each row repeats that currency note.

**Scope.** W1/W5/W7 mappings apply when those activities belong to the regulated hospital/service; these citations do not impose general requirements on independent physician offices. W3 includes admission/transfer paths. Pediatric-bed and neonatal/perinatal rows are service-specific workflow extensions. Surgical/anesthesia staff, equipment and space sections (§§70225–70235), nursing policies (§70213), and pediatric neighbors were reviewed without inventing patient-entry requirements from physical staffing or equipment duties. Cornell’s §70217 repeal heading conflicts with [Westlaw’s indexed staffing text](https://govt.westlaw.com/calregs/Document/IB0822FCB5B6111EC9451000D3A7C4BC3?viewType=FullText); full Westlaw access failed, so no staffing-ratio rule or repeal conclusion is included.

### California statutes

Previously cataloged subjects are identified in row notes as references or atomic expansions, not new discoveries: notably R2-08, R2-09, R2-17, R2-18 and R2-23. The full six-month CURES review rule, ordinary records-request deadlines, pregnancy/STI minor-consent rules and general POLST-treatment rule remain in `docs/regulations.md`; they are not re-proposed here.

Leginfo reader URLs returned HTTP 403. The actual text opened was the Legislature’s [official bulk database](https://downloads.leginfo.legislature.ca.gov/pubinfo_2025.zip), listed as updated **2026-10-25** on the [official download index](https://downloads.leginfo.legislature.ca.gov/). Each row records the exact `LAW_SECTION_TBL.dat` entry’s referenced LOB filename, update metadata and amendment/effective/operative history. The canonical reader URL is retained for convenient human access. Quotes are literal substrings after whitespace normalization; their maximum length is **19 words**. These are public statutory texts, not quotes invented from summaries.

Recent operative changes include AB 665/AB 816 (2024 minor consent), AB 2115 (2024 direct dispensing), AB 3281 (2025 CMIA text), SB 957 (2026 CAIR), AB 447 (2026 ED dispensing), AB 1503 (2026 pharmacy/prescription text), SB 402 (2026 telehealth section) and the current SB 497 chaptering of §11165 (operative 2026). Metadata timestamps are not enactment dates. This is a dated source snapshot, not an exhaustive survey of every 2026 enactment or future effective provision.

### Federal prescriptions and health IT

CFR quotes were checked against official eCFR point-in-time XML for **2026-10-29**, read on October 31: [DEA prescriptions](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-21.xml?part=1306), [EPCS](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-21.xml?part=1311), [ONC](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-45.xml?part=170), [information blocking](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-45.xml?part=171), and [HIPAA](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-45.xml?part=164). Catalog CFR URLs link to the exact dated part XML opened for verification; the citation identifies the section and paragraph. HTML reader pages served automated-access challenges and additional section-API requests were rate-limited; neither was treated as verification. Quotes were verified against the successfully retrieved official part XML. Vaccine statute quotations come from the official 2024 U.S. Code PDFs linked in the rows, corroborated against current LII text; their listed amendment histories end in 1987 and 1993. CDC VIS-documentation rows remain classified as guidance.

**HTI-1:** use DSI §170.315(b)(11), not expired CDS (a)(9). Standalone problem/medication/allergy criteria (a)(6)–(8) are reserved; current reconciliation duties are in (b)(2). **HTI-4:** revised eRx transactions permit the adopted SCRIPT alternatives through 2027, then require the newer standard from 2028; this does not make CMS-0057-F drug prior authorization mandatory for hospitals. [Official HTI-4 dates](https://healthit.gov/resources/hti-4-overview-and-key-dates-for-certification-program/).

**HTI-5:** the [final rule and amendatory instructions](https://www.federalregister.gov/documents/full_text/xml/2026/10/28/2026-21943.xml) were opened. Most changes take effect **2026-12-28**; instructions 7, 10 and 12 take effect **2027-01-01**. CPOE, drug-interaction checks, demographics and implantable-device criteria remain. DSI source-attribute/risk-management paragraphs (b)(11)(iv)–(vi) are removed in December; the citation-attribute row is explicitly time-limited. Feedback survives under a new paragraph number. Transition-summary creation remains through 2029, expiring January 2030. Patient VDT remains. Do not apply proposed removals as final law.

**USCDI:** [§170.213](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-45.xml?part=170) adopts v3, with v1 expired January 2026. The official [2022-2 bulletin](https://healthit.gov/standards-onc-technology/onc-standards-bulletin/onc-standards-bulletin-2022-2/) verifies medication-dose membership; the patient-view application is labeled medium-confidence inference. V4 is a voluntary SVAP option, verified in the [official 2024 SVAP announcement](https://healthit.gov/blog/health-it/advancements-in-health-it-oncs-approved-svap-standards-for-2024/) and [current VDT instructions](https://healthit.gov/test-method/view-download-and-transmit-to-3rd-party/), not a universal hospital capture mandate. Raw archived v3/v4 PDFs returned 403, so no v4-only element obligation is asserted. [Current enforcement discretion](https://healthit.gov/certification-health-it/enforcement-discretion-notices/) qualifies specified demographic requirements; the catalog does not assert those as unconditional duties.

**Access:** HIPAA minimum necessary has exceptions, including treatment disclosures/requests and access by the individual. Its 30-day request-response limit is not permission to delay portal results. Information blocking requires case-specific assessment, legally required restrictions, and applicable exceptions; a blanket clinician-review embargo is only described as likely interference in ONC guidance.

**FDA:** [§201.25, official XML](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-21.xml?part=201) was opened. Its barcode-label duty addresses manufacturers, repackers, relabelers and distributors; it does not impose hospital wristband/medication scanning. No such hospital mandate is manufactured here. Drug-specific REMS duties are not generalized without a verified applicable program. DEA central-fill/retail-transfer provisions (§§1306.14–.15, .24–.27) were not promoted into general prescriber or bedside requirements.

### Entrenched practice

Previously documented rules are retained only as baseline context or atomic decompositions, with round-1/round-2 relationships identified in notes. In particular, R2-10 abbreviation controls and R2-15 time-out subjects are not claimed as newly discovered requirements. `existingInSpec` refers to executable v1 content, not whether an earlier research note mentioned a proposal.

**SAFER:** the CMS hook is mandatory annual self-assessment, not mandatory implementation of every recommendation. The [CMS FY2026 final-rule fact sheet](https://www.cms.gov/newsroom/fact-sheets/fy-2026-hospital-inpatient-prospective-payment-system-ipps-long-term-care-hospital-prospective-0) confirms all eight 2025 guides from CY2026. The current ONC landing page still links older measure language; the final CMS statement controls this date claim. The 2025 guide PDFs retain August 2024 worksheet footers.

**Leapfrog:** thresholds measure institutional performance: CPOE 85%, serious-error test detection 60% for adult/general hospitals, bedside BCMA in all applicable units, and scanning compliance at least 95%. These are purchaser standards, not a claim that every hospital has the same payer contract. Four aggregate rules are explicitly not statically encodable.

**Clinical scope:** suicide screening is not a blanket screen of every ED patient; WHO details apply only within an adopted checklist. Leapfrog verifies the adapted WHO checklist hook for designated complex procedures, not every detail of the original WHO form. No universal pain reassessment minute limit or critical-result deadline is invented. ISMP recommends selecting high-risk double checks, not applying them indiscriminately to every high-alert drug.

Removed from the earlier partial catalog: generic ACIP/growth-chart recommendations, general ASA preparation recommendations, broad high-alert catalog membership presented as an alert requirement, and CDC stewardship/vaccine suggestions without a lane-specific entrenched basis. CDC opioid recommendations were excluded because a particular payer/state adoption of those thresholds was not independently verified here; the earlier R2-16 proposal remains in `docs/regulations.md`. No CURES/naloxone statutes or other law were reclassified as entrenched.

#### Source audit

Quotes are brief verbatim excerpts with exact EP/RP locators; the proposed rule paraphrases the atomic practice. No inaccessible source was retained as verified. Page numbers are from the cited edition, including the October Leapfrog revision.

| Opened official source | Catalog use |
|---|---|
| [Joint Commission 2026 Hospital NPG chapter](https://digitalassets.jointcommission.org/api/public/content/9ca80055182b4274842a5780a94f2c82?v=149a13a9) | NPG.01.01.01, .01.02.01, .01.06.02–.03; NPG.06.02.01; NPG.08.01.01; NPG.14.03.01–.14.05.01 |
| [Joint Commission terminology FAQ 000001229](https://www.jointcommission.org/en-us/knowledge-library/support-center/standards-interpretation/standards-faqs/000001229) | Public prohibited-list policy; updated April 21, 2026 |
| [Joint Commission hospital pain FAQ 000001329](https://www.jointcommission.org/en-us/knowledge-library/support-center/standards-interpretation/standards-faqs/000001329) | Patient-appropriate reassessment criteria/tools and high-risk opioid monitoring; current NPG framing |
| [ISMP 2026–2027 hospital best practices](https://online.ecri.org/hubfs/ISMP/Resources/ISMP_TargetedMedicationSafetyBestPractices_Hospitals.pdf) | BP 2, p. 4; BP 3, p. 5; BP 19, p. 18 |
| [ISMP error-prone abbreviations, 2024](https://online.ecri.org/hubfs/ISMP/Resources/ISMP_ErrorProneAbbreviation_List.pdf) | Dose units, frequency/directions, drug names and decimals |
| [2025 SAFER CPOE](https://healthit.gov/wp-content/uploads/2025/06/SAFER-Guide-3.-CPOE-Final.pdf) | RP 1.2, 2.1, 2.2, 2.3 |
| [2025 SAFER Test Results](https://healthit.gov/wp-content/uploads/2025/06/SAFER-Guide-8.-Test-Results-Reporting-Final.pdf) | RP 2.2, 2.3, 2.5–2.8, 3.4 |
| [2025 SAFER Patient Identification](https://healthit.gov/wp-content/uploads/2025/01/Safer-Guide-6.-Patient-Identification-Final.pdf) | RP 1.2, 1.4, 1.6, 2.5 |
| [Leapfrog 2026 Hospital Survey, version 2, October 20](https://www.leapfroggroup.org/sites/default/files/Files/2026%20HospitalSurvey_20261020_v9.2%20(version%202).pdf) | Section 2, p. 58; Section 3B adopted checklist and measurement specifications |
| [WHO Surgical Safety Checklist, 2009](https://healthcluster.who.int/docs/librariesprovider16/meeting-reports/quality-toolkit/h.-surgical-safety-checklist.pdf?download=true&sfvrsn=6a8b581d_5) | Adopted sign-in, time-out and sign-out items; conditional scope |

Validation passed: JSON parsing of both deliverables; exact schema keys/enums; 98 unique IDs and distinct proposed rules per file; all mapped elements/info/commits exist in v1; all quotes at most 25 words; 94 PDF excerpts matched downloaded official text and page locators, with four FAQ excerpts checked against the opened official pages. The JSON copies are byte-identical.

## Input audit

| File | Rows | SHA-256 |
| --- | --- | --- |
| docs/rules/cms.json | 120 | bd621fbb14c7aa83b6d6df105a2eff268bc8113bee456d1dbd95f0510e99b051 |
| docs/rules/ca-title22.json | 120 | fa7ff56c349b51183c78a524db0e8253464a188be1858538ec4b95801c737d68 |
| docs/rules/ca-statutes.json | 120 | a5fadcf8fbacb9b83c6d75d71ef53d6ce16c94ff6ec8761ae1462af90c77883d |
| docs/rules/federal-rx.json | 120 | 2c8c9e8362737e72a149566f337b548a8f7cd021fefa96938f3f67f13e55327b |
| docs/rules/entrenched.json | 98 | 79e56947040c139efc5ea257954b86af359f2f172e5a23f6073edad895e1c6e5 |

| Encoding baseline | SHA-256 |
| --- | --- |
| lean/Ehr/Core/Types.lean | 1cd0d191b001a2d35ed022925702721668ad521cd885510f6d09a29a64b17b47 |
| lean/Ehr/Specs/V1.lean | 45accb4ab8f29d1af64efab5ee3b1ce423843627f9f2ed036c2cc4f92dcaf961 |
| docs/design/core-model.md | aa347f5f0be7eeb651bbf50dbda4261104fdd46dbba8df62aab6a58e5f90074f |

### Excluded source rows

| File | ID | Reason |
| --- | --- | --- |
| docs/rules/cms.json | cms-482.51-b6-preop-diagnosis | Not binding and no entrenched basis with a concrete reason. |
| docs/rules/cms.json | cms-482.51-b6-postop-diagnosis | Not binding and no entrenched basis with a concrete reason. |
| docs/rules/cms.json | cms-482.51-b6-procedure | Not binding and no entrenched basis with a concrete reason. |
| docs/rules/cms.json | cms-482.51-b6-other-practitioner-tasks | Not binding and no entrenched basis with a concrete reason. |
| docs/rules/cms.json | cms-482.51-b6-implants | Not binding and no entrenched basis with a concrete reason. |
| docs/rules/cms.json | cms-482.52-b1-pre-history | Not binding and no entrenched basis with a concrete reason. |
| docs/rules/cms.json | cms-482.52-b1-pre-interview-exam | Not binding and no entrenched basis with a concrete reason. |
| docs/rules/cms.json | cms-482.52-b1-pre-risk | Not binding and no entrenched basis with a concrete reason. |
| docs/rules/cms.json | cms-482.52-b1-pre-problems | Not binding and no entrenched basis with a concrete reason. |
| docs/rules/cms.json | cms-482.52-b1-pre-additional-data | Not binding and no entrenched basis with a concrete reason. |
| docs/rules/cms.json | cms-482.52-b1-pre-plan | Not binding and no entrenched basis with a concrete reason. |
| docs/rules/cms.json | cms-482.52-b3-post-respiratory | Not binding and no entrenched basis with a concrete reason. |
| docs/rules/cms.json | cms-482.52-b3-post-cardiovascular | Not binding and no entrenched basis with a concrete reason. |
| docs/rules/cms.json | cms-482.52-b3-post-mental | Not binding and no entrenched basis with a concrete reason. |
| docs/rules/cms.json | cms-482.52-b3-post-temperature | Not binding and no entrenched basis with a concrete reason. |
| docs/rules/cms.json | cms-482.52-b3-post-pain | Not binding and no entrenched basis with a concrete reason. |
| docs/rules/cms.json | cms-482.52-b3-post-nausea | Not binding and no entrenched basis with a concrete reason. |
| docs/rules/cms.json | cms-482.52-b3-post-hydration | Not binding and no entrenched basis with a concrete reason. |
| docs/rules/federal-rx.json | federal-rx-cdc-vis-edition | Not binding and no entrenched basis with a concrete reason. |
| docs/rules/federal-rx.json | federal-rx-cdc-vis-delivery-date | Not binding and no entrenched basis with a concrete reason. |
| docs/rules/federal-rx.json | federal-rx-uscdi-v4-elected-validation | Not binding and no entrenched basis with a concrete reason. |
| docs/rules/federal-rx.json | federal-rx-onc-results-no-routine-delay | Not binding and no entrenched basis with a concrete reason. |

### Spot-checked primary sources

The source-law research is inherited. Two decisive classification points were spot-checked against current official text: the [Schedule II no-refill rule](https://www.ecfr.gov/current/title-21/chapter-II/part-1306/section-1306.12) and the distinction between operative content and actual surgical timing in [CMS surgical services](https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-G/part-482/subpart-D/section-482.51). No blanket legal completeness or currency verification is claimed.
