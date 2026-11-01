# California Title 22 rules

**120 atomic rules across 17 cited sections.** All 120 are `ca-regulation`, binding on the applicable California hospital/service. Six requirements are already represented in spec v1; 114 are absent or only partly represented. This lane changes research artifacts only. Existing round-1/round-2 discussions are cross-referenced in row notes; their broad requirements are decomposed rather than presented as new discoveries.

**Sources and currency.** Text opened on **2026-10-31** from Cornell LII reproductions of CCR Title 22, Division 5, Chapter 1. Every quote is verbatim after whitespace normalization and at most 25 words. All 120 rows are `verified: true` for opened, matched text; all have **medium confidence** because LII advertises quarterly updates without a displayed through-date and official Westlaw currentness could not be confirmed. Verification does not assert that the mirror is current. Each row repeats that currency note.

**Scope.** W1/W5/W7 mappings apply when those activities belong to the regulated hospital/service; these citations do not impose general requirements on independent physician offices. W3 includes admission/transfer paths. Pediatric-bed and neonatal/perinatal rows are service-specific workflow extensions. Surgical/anesthesia staff, equipment and space sections (§§70225–70235), nursing policies (§70213), and pediatric neighbors were reviewed without inventing patient-entry requirements from physical staffing or equipment duties. Cornell’s §70217 repeal heading conflicts with [Westlaw’s indexed staffing text](https://govt.westlaw.com/calregs/Document/IB0822FCB5B6111EC9451000D3A7C4BC3?viewType=FullText); full Westlaw access failed, so no staffing-ratio rule or repeal conclusion is included.

## Counts

Workflow counts are overlapping memberships, not additive totals.

| Workflow | Rules |
|---|---:|
| W1 | 16 |
| W2 | 7 |
| W3 | 51 |
| W4 | 61 |
| W5 | 24 |
| W6 | 75 |
| W7 | 13 |

| Encoding | Rules |
|---|---:|
| `entry` | 54 |
| `review` | 8 |
| `humanOnly` | 25 |
| `alert` | 4 |
| `design` | 16 |
| `not-encodable` | 13 |

| Binding | Rules |
|---|---:|
| `true` — California regulation | 120 |
| `false` | 0 |

`specMapping` uses only actual v1 names where a useful match exists. A related panel/optional field does not make a rule existing. Existing means the corresponding entry requirement is present, not that every accepted value establishes legal compliance. Null commits denote duties without a faithful v1 commit. New conditions are described in words and flagged as missing core support. Proposed alerts and no-prefill attestations are implementation choices; the law does not prescribe their tiers or keyboard interaction. Record retention, actual delivery, licensure and bedside acts require evidence beyond UI structure. The core currently accepts empty text and any nonempty coded value, so substantive narrative/allowed-value checks need validation beyond field presence. Adding a simple field itself is content work; `needsCoreFeature` identifies extra semantics or infrastructure when needed.

## Ten demo candidates

1. **22 CCR §70223(d)(2), (e)** — Pre-op screening tests must be appropriate to the patient and accomplished and recorded within 72 hours; preserve the dire-emergency exception. [Source](https://www.law.cornell.edu/regulations/california/22-CCR-70223) (`ca-title22-70223-screening-72-hours`).
2. **22 CCR §70215(a)(1)** — Receiving-unit RN assessment is required on transfer arrival; an assessment in the sending unit does not discharge the new obligation. [Source](https://www.law.cornell.edu/regulations/california/22-CCR-70215) (`ca-title22-70215-transfer-assessment`).
3. **22 CCR §70263(g)** — A verbal medication order needs prescriber/furnisher countersignature within 48 hours; demonstrate a deadline queue tied to the actual order. [Source](https://www.law.cornell.edu/regulations/california/22-CCR-70263) (`ca-title22-70263-verbal-countersign-48h`).
4. **22 CCR §70749(a)(6)(D)** — Capture restraint removal time, alongside application time and type; preserve the narrow soft-tie support/protection timestamp exception. [Source](https://www.law.cornell.edu/regulations/california/22-CCR-70749) (`ca-title22-70749-restraint-end`).
5. **22 CCR §70263(m)(3)** — Patient-brought medicines need physician/pharmacist examination and positive identification after arrival; an RN barcode scan cannot substitute. [Source](https://www.law.cornell.edu/regulations/california/22-CCR-70263) (`ca-title22-70263-home-drug-identify`).
6. **22 CCR §70233(a)(4)** — Record the amount of blood or blood fractions administered during anesthesia; estimated blood loss is a different datum. [Source](https://www.law.cornell.edu/regulations/california/22-CCR-70233) (`ca-title22-70233-blood-amount`).
7. **22 CCR §70547(i)** — Newborn oxygen orders need review, modification or discontinuation after 24 hours; the source does not prescribe automatic cessation at exactly 24 hours. [Source](https://www.law.cornell.edu/regulations/california/22-CCR-70547) (`ca-title22-70547-newborn-oxygen-24h`).
8. **22 CCR §70537(d)** — Pediatric-bed placement above age 13 needs pediatrician approval in unusual circumstances and a documented reason; this is not an outpatient age limit. [Source](https://www.law.cornell.edu/regulations/california/22-CCR-70537) (`ca-title22-70537-pediatric-over13`).
9. **22 CCR §70707.1(a)(4)** — Ordinary sterilization consent has a 30–180-day interval; demonstrate exception-specific facts rather than a generic emergency bypass. [Source](https://www.law.cornell.edu/regulations/california/22-CCR-70707.1) (`ca-title22-70707-1-sterilization-minimum-wait`).
10. **22 CCR §70707.6(a)(3)** — Medi-Cal sterilization cannot use the elective voluntary shorter-wait request available to non-Medi-Cal patients; preserve separately qualified medical exceptions. [Source](https://www.law.cornell.edu/regulations/california/22-CCR-70707.6) (`ca-title22-70707-6-medi-cal-no-elective-short-wait`).

## Validation

JSON parsing, exact required keys, unique IDs, all seven mapping keys, allowed classifications/workflow/persona IDs, and all element/info/commit names were checked against `lean/Ehr/Specs/V1.lean`. Every quote was matched against its opened source text and checked for the 25-word ceiling. The six `existingInSpec` rows were checked against the actual required-entry lists.

```sh
node -e 'const r=JSON.parse(require("fs").readFileSync("docs/rules/ca-title22.json")); if(new Set(r.map(x=>x.id)).size!==r.length) process.exit(1); console.log(r.length, "unique rules")'
```
