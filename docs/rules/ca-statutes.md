# California statutes lane

Research checked **2026-10-31** against `SCHEMA.md`, regulations rounds 1–2, BRIEF §§5/5a and the checked-in `lean/Ehr/Specs/V1.lean`.

**120 atomic rules across 37 statutory sections:** 120 verified, 0 unverified; all are `ca-statute`, CA jurisdiction, and `binding: true`. Binding identifies the authority as law; some rows implement the boundaries of a statutory permission or exception rather than a duty to perform the optional activity. Proposed UI gates are implementation choices, not claims that the statute names a particular screen.

**V1 coverage:** 3 existing requirements (drug, quantity and patient-requested purpose, which V1 requires more broadly); 117 not fully enforced. Existing field names are used only where they represent relevant content. Having a field is not proof of transmission, actual counseling, pharmacist participation, consent validity or access control. Rows needing these capabilities identify them in `needsCoreFeature`. This lane changes research artifacts only.

Previously cataloged subjects are identified in row notes as references or atomic expansions, not new discoveries: notably R2-08, R2-09, R2-17, R2-18 and R2-23. The full six-month CURES review rule, ordinary records-request deadlines, pregnancy/STI minor-consent rules and general POLST-treatment rule remain in `docs/regulations.md`; they are not re-proposed here.

| Workflow | Rules tagged |
|---|---:|
| W1 Adult visit | 57 |
| W2 Results | 23 |
| W3 ED | 98 |
| W4 Inpatient MAR | 16 |
| W5 Pediatric visit | 58 |
| W6 Surgical day/discharge | 67 |
| W7 Refills | 35 |

Workflow counts overlap. Hospital-only requirements apply to hospital encounters, not automatically to independent clinics; newborn screening is an extension of W5.

| Encoding | Count |
|---|---:|
| entry | 51 |
| review | 0 |
| humanOnly | 3 |
| alert | 0 |
| design | 65 |
| not-encodable | 1 |

| Binding | Count |
|---|---:|
| true — California statutes | 120 |
| false — guidance/accreditation | 0 |

Most external delivery, recipient access, clock, signature and prescription-payload requirements are classified `design`: V1 cannot certify them merely by adding a checkbox. Stewardship policy/process governance is `not-encodable`; §1288.85 does not itself mandate an indication on every antibiotic order.

## Ten demo candidates

1. **Correct the CURES surgical exemption:** qualifying procedure prescriptions can be nonrefillable **seven-day** supplies; V1 still names `surgery-5-day`. [HSC §11165.4(c)(4)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=11165.4), `ca-statutes-hsc-11165-4-procedure-seven-day`.
2. **Suppress excluded CURES reporting:** testosterone and mifepristone must not enter the reporting feed, operative January 2026. This is distinct from consultation. [HSC §11165(k)(1)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=11165), `ca-statutes-hsc-11165-excluded-drugs-reporting`.
3. **Validate unused ED take-home medication:** the new 2026 pathway excludes controlled drugs and has five conjunctive conditions, each separately cataloged. [BPC §4068(b)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=4068), `ca-statutes-bpc-4068-unused-ed-noncontrolled` and four companion rows.
4. **Keep minor demographics out of CAIR:** never export paragraph-13 SOGISC/sex-assigned-at-birth data for an under-18 patient; adult answers are voluntary. [HSC §120440(c)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=120440), `ca-statutes-hsc-120440-no-minor-sogisc`.
5. **Preserve every EHR edit/deletion:** automatic audit evidence includes the actor, access time and actual change. [Civil Code §56.101(b)(1)(B)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=56.101), `ca-statutes-civ-56-101-preserve-edits` and three companion rows.
6. **Keep the 5150 clock across transfers:** calculate from first detention, not receiving-facility arrival. [WIC §5150(a)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=WIC&sectionNum=5150), `ca-statutes-wic-5150-hold-start`.
7. **Respect the psychotropic consent boundary:** §6924 outpatient mental-health self-consent alone does not authorize psychotropic medication without parent/guardian consent. [Family Code §6924(f)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=FAM&sectionNum=6924), `ca-statutes-fam-6924-psychotropic-exclusion`.
8. **Document homeless-discharge transportation offers:** the destination qualifies within 30 minutes **or** 30 miles; acceptance is not mandatory. [HSC §1262.5(o)(10)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=1262.5), `ca-statutes-hsc-1262-5-homeless-transport`.
9. **Obtain telehealth consent before care:** verbal or written consent is allowed and must be documented. [BPC §2290.5(b)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=2290.5), `ca-statutes-bpc-2290-5-telehealth-consent` and companion documentation row.
10. **Keep patient corrections with exports:** disclosure of a disputed record portion includes its qualifying patient addendum. [HSC §123111(b)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=123111), `ca-statutes-hsc-123111-disclose-addendum`.

## Verification and currency

Leginfo reader URLs returned HTTP 403. The actual text opened was the Legislature’s [official bulk database](https://downloads.leginfo.legislature.ca.gov/pubinfo_2025.zip), listed as updated **2026-10-25** on the [official download index](https://downloads.leginfo.legislature.ca.gov/). Each row records the exact `LAW_SECTION_TBL.dat` entry’s referenced LOB filename, update metadata and amendment/effective/operative history. The canonical reader URL is retained for convenient human access. Quotes are literal substrings after whitespace normalization; their maximum length is **19 words**. These are public statutory texts, not quotes invented from summaries.

Recent operative changes include AB 665/AB 816 (2024 minor consent), AB 2115 (2024 direct dispensing), AB 3281 (2025 CMIA text), SB 957 (2026 CAIR), AB 447 (2026 ED dispensing), AB 1503 (2026 pharmacy/prescription text), SB 402 (2026 telehealth section) and the current SB 497 chaptering of §11165 (operative 2026). Metadata timestamps are not enactment dates. This is a dated source snapshot, not an exhaustive survey of every 2026 enactment or future effective provision.

Validation passed: JSON parsing, exact schema keys/enums, 120 unique IDs, allowed workflow/persona values, all nonnull mapping names against V1, and every quote’s source substring and word limit. No Lean spec, property, data format or statements file changed.
