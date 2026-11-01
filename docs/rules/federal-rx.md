# Federal prescriptions and records rules

**Research date: 2026-10-31.** The [catalog](federal-rx.json) contains **120 atomic rules: 120 verified, 0 unverified**. Of these, **116 are binding law/regulation for the stated addressee** (109 federal-regulation rows, 7 federal-statute rows); 4 are guidance. Confidence is high for 119 and medium for 1 explicitly identified USCDI element-level inference. Four requirements are already enforced in V1; 116 are not fully represented there. This is a research catalog, not a claim that the demo meets these regulations.

| Workflow | Rules |
|---|---:|
| W1 — Adult visit | 92 |
| W2 — Results in-basket | 18 |
| W3 — ED encounter | 92 |
| W4 — Inpatient MAR | 13 |
| W5 — Pediatric visit | 95 |
| W6 — Surgical day / discharge | 102 |
| W7 — Refill requests | 92 |

Workflow counts overlap: one requirement can affect several workflows. Pharmacy partial-fill rows apply only when the hospital operates the dispensing pharmacy; their W6/W7 tags identify discharge/refill consequences.

| Encoding | Rules |
|---|---:|
| entry | 25 |
| review | 13 |
| humanOnly | 8 |
| alert | 2 |
| design | 71 |
| not-encodable | 1 |

| Binding classification | Rules |
|---|---:|
| Binding, subject to the stated applicability | 116 |
| Nonbinding guidance | 4 |

The binding rows address prescribers, hospital providers/credentialing/workforce operations, or EPCS/ONC technology developers. ONC criteria bind modules seeking or maintaining the relevant certification; they do not require every hospital to capture every element at every visit. `commit: null` denotes a capability or operational requirement rather than an invented V1 commit. `specMapping.when` is descriptive applicability, not new Lean code.

The four existing V1 requirements are `drug`, `quantity`, `vaccineLot`, and the ordering drug–allergy alert. In particular, `refills` being required does not enforce zero refills for Schedule II; `visGiven` before recording does not prove delivery before administration; and declaring `orderSummary` does not require its continuous display during EPCS signing. The JSON preserves partial mappings and names the missing capability.

## Ten demo candidates

1. **Reject a Schedule II refill: the permitted refill count is zero.** [21 CFR §1306.12(a)](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-21.xml?part=1306) — `federal-rx-1306-12-zero-refills`.
2. **Reject a refill on an original Schedule III–IV prescription older than six months.** [21 CFR §1306.22(a)](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-21.xml?part=1306) — `federal-rx-1306-22-six-months`.
3. **Reject a controlled-Rx signing screen that hides the prescribed quantity during two-factor signing.** [21 CFR §1311.120(b)(9)(iv)](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-21.xml?part=1311) — `federal-rx-1311-120-display-quantity`.
4. **Require two distinct authentication-factor categories for controlled e-prescribing.** [21 CFR §1311.115(a)](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-21.xml?part=1311) — `federal-rx-1311-115-two-factors`.
5. **Editing a ready controlled prescription invalidates its prior readiness and requires another review.** [21 CFR §1311.120(b)(10)](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-21.xml?part=1311) — `federal-rx-1311-120-edit-review`.
6. **Immediately revoke hospital EPCS signing access after notice of a compromised authentication factor.** [21 CFR §1311.130(d)(1)](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-21.xml?part=1311) — `federal-rx-1311-130-compromised-factor`.
7. **Require VIS delivery before administration of a covered vaccine.** [42 U.S.C. §300aa-26(d)](https://www.govinfo.gov/content/pkg/USCODE-2024-title42/pdf/USCODE-2024-title42-chap6A-subchapXIX-part2-subpartc-sec300aa-26.pdf) — `federal-rx-300aa-26-vis-before-dose`.
8. **Keep the vaccine lot number required when recording the covered dose; V1 already does this.** [42 U.S.C. §300aa-25(a)(2)](https://www.govinfo.gov/content/pkg/USCODE-2024-title42/pdf/USCODE-2024-title42-chap6A-subchapXIX-part2-subpartc-sec300aa-25.pdf) — `federal-rx-300aa-25-lot`.
9. **Reject oral-liquid prescribing units other than mL in the certified eRx module.** [45 CFR §170.315(b)(3)(ii)(E)](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-45.xml?part=170) — `federal-rx-170-315-oral-liquids-ml`.
10. **Remove a routine lab-result embargo whose sole purpose is waiting for clinician review (ONC guidance; case-specific).** [ONC FAQ IB.FAQ22.1.2021MAR (2025-09-12); 45 CFR §171.103](https://healthit.gov/faq/when-would-delay-fulfilling-request-access-exchange-or-use-ehi-be-considered-interference-under/) — `federal-rx-onc-results-no-routine-delay`.

## Currency and boundaries

CFR quotes were checked against official eCFR point-in-time XML for **2026-10-29**, read on October 31: [DEA prescriptions](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-21.xml?part=1306), [EPCS](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-21.xml?part=1311), [ONC](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-45.xml?part=170), [information blocking](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-45.xml?part=171), and [HIPAA](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-45.xml?part=164). Catalog CFR URLs link to the exact dated part XML opened for verification; the citation identifies the section and paragraph. HTML reader pages served automated-access challenges and additional section-API requests were rate-limited; neither was treated as verification. Quotes were verified against the successfully retrieved official part XML. Vaccine statute quotations come from the official 2024 U.S. Code PDFs linked in the rows, corroborated against current LII text; their listed amendment histories end in 1987 and 1993. CDC VIS-documentation rows remain classified as guidance.

**HTI-1:** use DSI §170.315(b)(11), not expired CDS (a)(9). Standalone problem/medication/allergy criteria (a)(6)–(8) are reserved; current reconciliation duties are in (b)(2). **HTI-4:** revised eRx transactions permit the adopted SCRIPT alternatives through 2027, then require the newer standard from 2028; this does not make CMS-0057-F drug prior authorization mandatory for hospitals. [Official HTI-4 dates](https://healthit.gov/resources/hti-4-overview-and-key-dates-for-certification-program/).

**HTI-5:** the [final rule and amendatory instructions](https://www.federalregister.gov/documents/full_text/xml/2026/10/28/2026-21943.xml) were opened. Most changes take effect **2026-12-28**; instructions 7, 10 and 12 take effect **2027-01-01**. CPOE, drug-interaction checks, demographics and implantable-device criteria remain. DSI source-attribute/risk-management paragraphs (b)(11)(iv)–(vi) are removed in December; the citation-attribute row is explicitly time-limited. Feedback survives under a new paragraph number. Transition-summary creation remains through 2029, expiring January 2030. Patient VDT remains. Do not apply proposed removals as final law.

**USCDI:** [§170.213](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-45.xml?part=170) adopts v3, with v1 expired January 2026. The official [2022-2 bulletin](https://healthit.gov/standards-onc-technology/onc-standards-bulletin/onc-standards-bulletin-2022-2/) verifies medication-dose membership; the patient-view application is labeled medium-confidence inference. V4 is a voluntary SVAP option, verified in the [official 2024 SVAP announcement](https://healthit.gov/blog/health-it/advancements-in-health-it-oncs-approved-svap-standards-for-2024/) and [current VDT instructions](https://healthit.gov/test-method/view-download-and-transmit-to-3rd-party/), not a universal hospital capture mandate. Raw archived v3/v4 PDFs returned 403, so no v4-only element obligation is asserted. [Current enforcement discretion](https://healthit.gov/certification-health-it/enforcement-discretion-notices/) qualifies specified demographic requirements; the catalog does not assert those as unconditional duties.

**Access:** HIPAA minimum necessary has exceptions, including treatment disclosures/requests and access by the individual. Its 30-day request-response limit is not permission to delay portal results. Information blocking requires case-specific assessment, legally required restrictions, and applicable exceptions; a blanket clinician-review embargo is only described as likely interference in ONC guidance.

**FDA:** [§201.25, official XML](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-21.xml?part=201) was opened. Its barcode-label duty addresses manufacturers, repackers, relabelers and distributors; it does not impose hospital wristband/medication scanning. No such hospital mandate is manufactured here. Drug-specific REMS duties are not generalized without a verified applicable program. DEA central-fill/retail-transfer provisions (§§1306.14–.15, .24–.27) were not promoted into general prescriber or bedside requirements.

**Validation:** JSON parsing, exact schema keys, enum/type checks, unique IDs, quotes of at most 25 words, source-quote substring matches, and every referenced V1 element/info/commit name were checked. `git diff --check` passed.

```sh
node -e 'const r=JSON.parse(require("fs").readFileSync("docs/rules/federal-rx.json")); if(new Set(r.map(x=>x.id)).size!==r.length)throw Error("duplicate ids"); console.log(r.length,"rules; unique ids")'
```
