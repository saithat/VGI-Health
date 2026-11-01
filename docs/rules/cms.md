# CMS hospital rule catalog

**120 atomic rules: 120 verified, 0 unverified; 102 binding federal-regulation rows and 18 nonbinding CMS guidance rows.** Seven requirements have corresponding required v1 content; 113 are absent or only partially represented. This is a research catalog, not an assertion that v1 implements 120 requirements.

Researched 2026-10-31. Regulatory wording was checked against the official [eCFR API, Part 482](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-42.xml?part=482) and [Part 489](https://www.ecfr.gov/api/versioner/v1/full/2026-10-29/title-42.xml?part=489), as of 2026-10-29. Several human-readable eCFR pages returned access blocks; the official XML supplied complete text. CMS guidance was checked in [State Operations Manual Appendix A, revision 248, issued September 18, 2026](https://www.cms.gov/Regulations-and-Guidance/Guidance/Manuals/downloads/som107ap_a_hospitals.pdf), including rendered PDF pages 474, 486 and 490. Guidance rows identify their survey tags and PDF pages and remain `binding: false`.

Each JSON row contains an exact source excerpt of no more than 25 words. General hospital duties also apply to hospital outpatient services; W1/W2/W5/W7 assignments do not extend these CoPs automatically to independent offices. Workflow counts overlap.

| Workflow | Rules |
|---|---:|
| W1 — Adult visit | 4 |
| W2 — Results in-basket | 4 |
| W3 — ED | 79 |
| W4 — Inpatient MAR | 61 |
| W5 — Pediatric visit | 4 |
| W6 — Surgical day | 73 |
| W7 — Refill requests | 4 |

| Encoding | Rules |
|---|---:|
| entry | 69 |
| review | 1 |
| humanOnly | 12 |
| alert | 0 |
| design | 35 |
| not-encodable | 3 |

| Binding | Rules |
|---|---:|
| Federal regulation — true | 102 |
| CMS interpretive guidance — false | 18 |

`encoding` names the proposed primary encoding, not an implemented guarantee. No law here dictates an alert tier, so tiers are null and no popup-only reporting surrogate is proposed. `windowMin` is null because procedure-, admission-, restraint- and recovery-relative deadlines are not review-receipt windows. Timing appears in the proposed rule and `needsCoreFeature`.

`specMapping` uses existing v1 names only. Null element/info means a new field/artifact is needed. Natural-language `when` values describe proposed conditions where v1 has no predicate. Prefill/friction for mapped elements reproduce v1, even for optional or accidental fields. `existingInSpec: true` means corresponding content is already required at the mapped commit; it does not certify persistence, clinical truth, valid signatures or delivery. Null commits identify missing clinical boundaries rather than inventing v1 names. Anesthesia rows map to W6/P5 as the related perioperative workflow; v1 lacks a qualified anesthesia-provider role/persona.

Overlap with rounds 1–2 is retained only as atomic cited rows and identified in notes (notably R2-01/02/03/06/07/19/20/21). Earlier research proposals are not treated as implemented v1 requirements. The 30-day/24-hour H&P framework, eligible outpatient alternative, emergency exceptions, violent versus nonviolent restraint scope, and EMTALA transfer alternatives are preserved in the relevant rows.

## Ten demo-worthy rules

1. **Adult violent-restraint orders have a four-hour renewal limit, subject to stricter state law.** [42 CFR §482.13(e)(8)(i)(A)](https://www.ecfr.gov/current/title-42/section-482.13) — `cms-482.13-e8iA-adult-four-hours` (binding regulation).
2. **Violent restraint/seclusion triggers a qualified face-to-face evaluation within one hour.** [42 CFR §482.13(e)(12)](https://www.ecfr.gov/current/title-42/section-482.13) — `cms-482.13-e12-face-to-face-hour` (binding regulation).
3. **Orders without a stated time/dose count stop automatically under the medical-staff policy.** [42 CFR §482.25(b)(5)](https://www.ecfr.gov/current/title-42/section-482.25) — `cms-482.25-b5-automatic-stop` (binding regulation).
4. **A preadmission H&P needs the documented update within 24 hours after admission/registration and before surgery/anesthesia.** [42 CFR §482.24(c)(4)(i)(B)](https://www.ecfr.gov/current/title-42/section-482.24) — `cms-482.24-c4iB-hp-update-timing` (binding regulation).
5. **Signing the operative report requires a description of techniques; the procedure name alone is insufficient.** [42 CFR §482.51(b)(6)](https://www.ecfr.gov/current/title-42/section-482.51) — `cms-482.51-b6-techniques` (binding regulation).
6. **CMS guidance includes implanted devices/tissues; v1 has opImplants but never requires it.** [CMS SOM Appendix A, A-0959, PDF p. 474; 42 CFR §482.51(b)(6)](https://www.cms.gov/Regulations-and-Guidance/Guidance/Manuals/downloads/som107ap_a_hospitals.pdf) — `cms-482.51-b6-implants` (CMS guidance).
7. **A qualified anesthesia provider completes/documents the preanesthesia evaluation within the 48-hour preprocedure window.** [42 CFR §482.52(b)(1)](https://www.ecfr.gov/current/title-42/section-482.52) — `cms-482.52-b1-pre-48hours` (binding regulation).
8. **Post-discharge goals of care travel to the follow-up provider at discharge; a displayed summary does not prove transmission.** [42 CFR §482.43(b)](https://www.ecfr.gov/current/title-42/section-482.43) — `cms-482.43-b-send-goals` (binding regulation).
9. **Payment or insurance inquiries cannot delay emergency screening or required stabilizing care.** [42 CFR §489.24(d)(4)(i)](https://www.ecfr.gov/current/title-42/section-489.24) — `cms-489.24-d4i-no-payment-delay` (binding regulation).
10. **Pending transfer records are sent as soon as practicable afterward, without requiring every pending test before transfer.** [42 CFR §489.24(e)(2)(iii)](https://www.ecfr.gov/current/title-42/section-489.24) — `cms-489.24-e2iii-packet-late-records` (binding regulation).

## Validation

JSON parsing, exact required keys, field types/enums, 120 unique IDs, quote length, normalized-whitespace verbatim matching against retrieved official sources, and mapped v1 identifiers were checked. All seven `existingInSpec` rows were checked against v1 entry requirements. Source matching normalizes PDF line wrapping only; it does not paraphrase quote text. No Lean spec or runtime behavior was changed.
