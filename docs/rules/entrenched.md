# Entrenched requirements for Certified Adaptive Clinical Interfaces

Research checked **2026-10-31** against `lean/Ehr/Specs/V1.lean`, BRIEF §§5–5a and the five personas. **98 atomic rules**, all `basis: entrenched`, all `binding: false`, all `verified: true`; **27 accreditation / 71 guidance**. Ten official source documents/pages were opened. Confidence: **85 high / 13 medium**; medium identifies conditional WHO adoption and high-alert selection applicability, not an unread source.

`entrenched.json` is the canonical lane catalog. `guidance.json` is an identical compatibility deliverable requested in the task; **count/load only one**, not both. This summary is likewise supplied as both `entrenched.md` and `guidance.md`.

## Counts

Workflow tags overlap, so their counts do not sum to 98.

| Workflow | Rules |
|---|---:|
| W1 — Adult visit | 39 |
| W2 — Results in-basket | 15 |
| W3 — ED | 66 |
| W4 — Inpatient MAR | 42 |
| W5 — Pediatric visit | 44 |
| W6 — Surgical day | 81 |
| W7 — Refills | 29 |

| Encoding | Rules |
|---|---:|
| entry | 11 |
| review | 5 |
| humanOnly | 23 |
| alert | 12 |
| design | 43 |
| not-encodable | 4 |

| Binding classification | Rules |
|---|---:|
| Nonbinding accreditation | 27 |
| Nonbinding guidance | 71 |
| Binding law/regulation | 0 |

## Ten demo candidates

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

## Interpretation and exclusions

**Four rules have narrow existing v1 implementations:** kg weight, human patient-ID re-entry, patient wristband scan and medication scan. The other 94 are not fully implemented as stated. Existing element/info names are mapped where useful, including partial mappings; neither a panel name nor a text field proves clinical content, delivery, timing, physical actions or arithmetic. New conditions written in `specMapping.when` describe proposals and are not claimed to be existing Lean constructors. `needsCoreFeature` identifies missing state, validation or integration.

Previously documented rules are retained only as baseline context or atomic decompositions, with round-1/round-2 relationships identified in notes. In particular, R2-10 abbreviation controls and R2-15 time-out subjects are not claimed as newly discovered requirements. `existingInSpec` refers to executable v1 content, not whether an earlier research note mentioned a proposal.

**SAFER:** the CMS hook is mandatory annual self-assessment, not mandatory implementation of every recommendation. The [CMS FY2026 final-rule fact sheet](https://www.cms.gov/newsroom/fact-sheets/fy-2026-hospital-inpatient-prospective-payment-system-ipps-long-term-care-hospital-prospective-0) confirms all eight 2025 guides from CY2026. The current ONC landing page still links older measure language; the final CMS statement controls this date claim. The 2025 guide PDFs retain August 2024 worksheet footers.

**Leapfrog:** thresholds measure institutional performance: CPOE 85%, serious-error test detection 60% for adult/general hospitals, bedside BCMA in all applicable units, and scanning compliance at least 95%. These are purchaser standards, not a claim that every hospital has the same payer contract. Four aggregate rules are explicitly not statically encodable.

**Clinical scope:** suicide screening is not a blanket screen of every ED patient; WHO details apply only within an adopted checklist. Leapfrog verifies the adapted WHO checklist hook for designated complex procedures, not every detail of the original WHO form. No universal pain reassessment minute limit or critical-result deadline is invented. ISMP recommends selecting high-risk double checks, not applying them indiscriminately to every high-alert drug.

Removed from the earlier partial catalog: generic ACIP/growth-chart recommendations, general ASA preparation recommendations, broad high-alert catalog membership presented as an alert requirement, and CDC stewardship/vaccine suggestions without a lane-specific entrenched basis. CDC opioid recommendations were excluded because a particular payer/state adoption of those thresholds was not independently verified here; the earlier R2-16 proposal remains in regulations.md. No CURES/naloxone statutes or other law were reclassified as entrenched.

## Source audit

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
