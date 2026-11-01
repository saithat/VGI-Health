# Rules catalog and classification

Generated from reviewed decisions in `scripts/rules/build_catalog.py`. Baseline: the checked-in `lean/Ehr/Specs/V1.lean` and `lean/Ehr/Core/Types.lean`, not pending content-lane work. Research input digests are pinned so a reorder/update cannot silently reuse the wrong indexed decision. The deliverable is a classification and implementation plan; it does not change the Lean spec.

Read 676 source rows; excluded 22 nonqualifying rows; retained 556 unique rules after citation + atomic-requirement de-duplication. Basis: 458 law, 98 entrenched. Distinct citations remain distinct legal rules even when their encodings can share a field. The two guidance-lane files are compatibility mirrors, not twice as many rules. `sourceIds` keeps every distinct source id, and `sourceLocations` keeps every file occurrence, including identical ids in mirrors.

The source `verified`, quotes, URLs, confidence and notes are preserved, not newly certified here. Research guesses are retained under `sourceAssessment`; only `fit`, `fitReason`, `existingSpecItems` and `proposedEncoding` are the audited classification. Source JSON basis omissions on binding rules are normalized to `law`. Nonbinding rows are accepted only with `basis: entrenched` and a concrete `entrenchedBecause`; accreditation, self-assessment and local checklist adoption are not relabeled law.

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

## Input audit

| File | Rows | SHA-256 |
| --- | --- | --- |
| docs/rules/cms.json | 120 | bd621fbb14c7aa83b6d6df105a2eff268bc8113bee456d1dbd95f0510e99b051 |
| docs/rules/ca-title22.json | 120 | bd75a74dcdd160deb98fa9c675019c4ad5771a72b55dc8308fd83d98b0f29dd1 |
| docs/rules/ca-statutes.json | 120 | a5fadcf8fbacb9b83c6d75d71ef53d6ce16c94ff6ec8761ae1462af90c77883d |
| docs/rules/federal-rx.json | 120 | 2c8c9e8362737e72a149566f337b548a8f7cd021fefa96938f3f67f13e55327b |
| docs/rules/entrenched.json | 98 | 6369ee63d926b74653496e4cf44683b6c9705d002539881daaee75841d52d8ec |
| docs/rules/guidance.json | 98 | 6369ee63d926b74653496e4cf44683b6c9705d002539881daaee75841d52d8ec |

| Encoding baseline | SHA-256 |
| --- | --- |
| lean/Ehr/Core/Types.lean | 4dfcb842a8f6c9a77b7798bb69b9dc7bb884d961734a1f650ebc7f7ab69a9ced |
| lean/Ehr/Specs/V1.lean | 669a52a1a937ed80d20650f949874c78d4d5a2b4ae2e8ce33ff6aadf7023e322 |
| docs/design/core-model.md | 4f0f794e08a284c41f1fc909a0c4695a8e00c278717a2eb6dac6306336ea1153 |
| BRIEF.md | 0137909b3f52e6e7d316f53e8ff280305dc7183671024389e04dd69f4259688a |

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
