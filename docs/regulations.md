# Where the spec's rules come from: laws, regulations, and standards

This file maps each rule in the hospital governance spec (BRIEF sections 5, 5a, 7.5, 9a, 9b) to a real, public source, or says plainly that the rule is our own design.

**Status (2026-10-31).** The content lane implements `lean/Ehr/Specs/V1.lean`, `V1_1.lean` and `V2.lean`; JSON is generated into `releases/<version>/spec.json`. Spec docstrings use the owner's four source classes below. The owner-approved EPCS, Schedule II and vaccine rules are implemented with interpreter regressions; checker certification and rendered data completeness remain owning-lane integration work (see `docs/design/changes-requests.md`).

**This is not legal advice.** It is a research note for a demo. Quotes are short excerpts (about 25 words at most). Read the source before you rely on a row.

## How to read the tables

**Type** says what kind of authority stands behind the rule:

| Type | Meaning |
|---|---|
| **Federal law/reg** | A US statute or a regulation in the CFR. Binding on whoever it names (often the hospital, sometimes only the EHR vendor or the payer). |
| **CA law/reg** | A California statute (codes on leginfo) or a regulation in the California Code of Regulations (CCR). |
| **Fed guidance** | Sub-regulatory federal guidance (for example the CMS State Operations Manual). Surveyors use it; it is not itself law. |
| **Accreditation** | The Joint Commission (TJC). Hospitals must meet it to stay accredited ("deemed status" for Medicare), but it is not law. |
| **Best practice** | ISMP, CDC, AHRQ/ONC SAFER Guides, peer-reviewed evidence. Not binding. |
| **OUR DESIGN CHOICE** | We chose it for the demo. No source requires it, or a source requires something weaker or different. |

**Confidence:** HIGH = we read the primary text (eCFR, the official California code database, or the CCR text) and the quote is copied from it. MEDIUM = we read an official summary or a reliable mirror, not the primary text. UNVERIFIED = we could not read the source; do not cite it without checking.

**Spec docstring source classes (owner decision):**

| Label | Use in the current spec |
|---|---|
| `Law: <citation>` | A concrete statutory/regulatory obligation; stricter demo choices and omitted legal details are stated separately. |
| `Entrenched: <reason> (<source>)` | Existing practice a hospital is unlikely to drop for a concrete reason: two patient identifiers support Joint Commission accreditation (NPG.01.01.01); bedside patient/medication scans support the Leapfrog BCMA safety benchmark. These are not statutes. |
| `Hospital policy (not law): <basis>` | Existing local workflow requirements, including patient-ID re-entry, second-nurse double checks, kg-only weight, and v2 antibiotic indication. Guidance informs these existing policies; it adds no new rule here. |
| `Product design property` | Receipts, alert tier/fatigue behavior, catalog, pinned placement, budgets and additive releases. |

The [Joint Commission 2026 hospital NPG text](https://digitalassets.jointcommission.org/api/public/content/9ca80055182b4274842a5780a94f2c82) requires two patient identifiers. The [Leapfrog 2026 BCMA measure](https://ratings.leapfroggroup.org/measure/hospital/2026/safe-medication-administration) measures scanning both patient bracelets and medication packages and preventing workarounds. These sources classify existing rules; they do not add accreditation or guidance rules to this release. Our exact per-dose scan gate and pinned banner layout remain implementation choices.

**"Applies to"** matters. Several real rules bind someone other than the hospital: ONC certification criteria (45 CFR 170.315) bind EHR vendors that seek certification; CMS-0057-F binds payers. The tables say so.

---

## 1. The short answer

**Strongest real groundings** (law that says almost exactly what the spec says):

1. **Order content** (drug, dose, route, frequency, date, time, signature): 22 CCR §70263(g) and (h)(4); 42 CFR 482.24(c)(2) and 482.23(c)(3).
2. **Signing is a human act by the responsible person, with the record's integrity protected:** 42 CFR 482.24(b) and (c)(1); 22 CCR §70751(g). For controlled-substance e-prescriptions, 21 CFR 1311.140 requires the prescription details to be **displayed while** the prescriber completes two-factor signing. This is a federal "shown on the commit screen, human-only" rule.
3. **Drug–allergy and drug–drug checks fire before the order is completed; drug–drug severity is adjustable only by limited users:** 45 CFR 170.315(a)(4). This criterion **survives HTI-5** (final rule 2026-10-28, effective 2026-12-28). It binds certified EHR technology, not the hospital directly.
4. **Consent and H&P before surgery:** 42 CFR 482.51(b)(1)–(2), 482.24(c)(4)(i) and (v); 22 CCR §70223(d) (verify identity, site, and side; interval H&P within 24 h; written informed consent in the record).
5. **CURES check before Schedule II–IV prescribing** (CA H&S §11165.4): first time, then **every six months** (resolved; it was four months until AB 528); data no older than 24 hours or the previous business day; a documented reason when an exemption is used.
6. **Immunization record contents and VIS before the dose:** 42 U.S.C. §300aa-25(a) (date, manufacturer, lot number, administering provider) and §300aa-26(d); CA H&S §120440(c) (registry disclosure of manufacturer and lot).
7. **Antibiotic stewardship program:** 42 CFR 482.42(b); CA H&S §1288.85 (SB 1311) and §1288.8(a)(3). CMS interpretive guidance (SOM Appendix A, A-0764) points hospitals to the CDC Core Elements.
8. **Discharge content:** 42 CFR 482.43 and 482.24(c)(4)(vii); CA H&S §1262.5 (including the homeless-patient discharge checklist from SB 1152); 22 CCR §70749(a)(16).

**Not required by any federal or California law we found** (they rest on accreditation, best practice, evidence, or our design):

- patient-ID **re-entry** before signing (a randomized trial found fewer wrong-patient orders; the 2025 SAFER Guide on patient identification names it as a fallback when banner photos are not available);
- wristband and medication **barcode scanning** at administration (the FDA only requires barcodes on the drug label, 21 CFR 201.25; TJC accepts barcodes as an identifier);
- the **independent double check by a second nurse** for high-alert medications (ISMP; ISMP itself warns it is "not always the optimal error-reduction strategy");
- **weight in kilograms only** and rejecting pounds (ISMP Targeted Medication Safety Best Practice 3; Pennsylvania Patient Safety Authority; ONC requires metric units only for oral-liquid volumes in e-prescribing);
- alert **tiers**, "no repeat interruptions," and the alert budget (ONC only requires adjustable drug–drug severity; the 2025 SAFER Guides recommend tiering and limiting interruptive alerts; Medicare hospitals must attest "yes" to a SAFER self-assessment from CY 2026);
- receipts with time windows, pinned landmarks, the navigation-depth limit, and the stability budget;
- a coded **indication on every antibiotic order** (release v2). Stewardship programs are law; a per-order indication is CDC best practice, and TJC leaves "when indication for use is required" to each hospital's policy.

**Joint Commission renumbering.** From 2026-01-01, TJC's hospital "National Patient Safety Goals" chapter became the **"National Performance Goals" (NPG)** chapter, and the Universal Protocol moved into it. Old IDs such as NPSG.01.01.01 are now NPG.01.01.01 and so on (table in 3.8). TJC says the change added no new requirements. Use the new IDs in anything we publish.

**Two honesty points for the releases:**

- **v2 (antibiotic indication):** modeled on law, not required by it. See section 5.
- **v1.1 (prior auth):** CMS-0057-F's prior-auth API rules start January 2027, but they **exclude all drugs**. A prior-auth panel for imaging is grounded; for specialty meds it is modeled on a **proposed** rule (CMS-0062-P, April 2026), not a final one. See section 5.

---

## 2. Status checks requested in the brief

### 2.1 ONC 45 CFR 170.315(a)(4): still in force after HTI-1, HTI-4, and HTI-5

| Rulemaking | What it did to (a)(4) and related criteria | Evidence |
|---|---|---|
| **HTI-1** (final, 89 FR 1192, 2024-01-09) | Kept (a)(4). Replaced the old CDS criterion (a)(9) with "decision support interventions" (b)(11). The CFR text of (a)(9) says: "The adoption of this criterion ... expires on January 1, 2025." | Current eCFR text of §170.315(a)(4) and (a)(9)(vi) (eCFR, Title 45 current as of 2026-10-29). HIGH |
| **HTI-4** (final, published in the FY 2026 IPPS/LTCH final rule, 90 FR 37130 ff., 2025-08-04) | No change to (a)(4). Added the provider prior-authorization API criteria (g)(31) coverage requirements discovery, (g)(32) documentation templates and rules, (g)(33) prior authorization support, and e-prescribing prior-auth transactions in (b)(3). | eCFR §170.315(g)(31)–(33), (b)(3)(ii)(C)(1)(vii). HIGH |
| **HTI-5** "ONC Deregulatory Actions To Unleash Prosperity" (proposed 90 FR 60970, 2025-12-29; **final 91 FR 67916, 2026-10-28, effective 2026-12-28**) | (a)(4) **retained with no change**. The proposal said: "We have retained the 'drug-drug, drug-allergy interaction checks for CPOE' certification criterion in § 170.315(a)(4)." The final rule removed 14 criteria (proposed 34) and "retained and made no changes to 39 certification criteria." Related changes: (a)(9) removed and reserved; (b)(11) no longer mentions "drug-drug and drug-allergy contraindication checking"; **safety-enhanced design (g)(3) kept but reduced to an "attestation-based certification requirement"** (the summative usability test reports are no longer required). | Federal Register full text of 2025-23896 (proposed) and 2026-21943 (final), amendatory instruction 11 and preamble. HIGH |

**Note for the BRIEF:** section 5 cites §170.315(g)(3) usability test tasks as a realism reference. That still works as a reference, but from 2026-12-28 vendors only attest to a user-centered design process; they no longer submit the usability test results.

### 2.2 CURES recheck interval: **six months** (resolved)

- **Current text** (H&S §11165.4(a)(1)(A)(i), as amended by AB 1731, Stats. 2023 ch. 144, effective 2024-01-01): "before prescribing a Schedule II, Schedule III, or Schedule IV controlled substance to the patient for the first time and at least once every six months thereafter". HIGH (official California Legislature bulk database, `pubinfo_2025.zip`, law table updated 2026-09-26).
- **History:** the original SB 482 (Stats. 2016 ch. 708, operative 2018-10-02) said "at least once every **four months** thereafter" (read from the 2017–18 official database). AB 528 (Stats. 2019 ch. 677) changed it to six months, operative on or before 2021-07-01. So sources that say "four months" are out of date.
- **Freshness of the data:** §11165.4(a)(2): the practitioner must review CURES history obtained "no earlier than 24 hours, or the previous business day, before" prescribing, ordering, administering, or furnishing.
- **Hospital exemptions matter for our demo.** The duty does not apply when the drug is ordered "to be administered to a patient" in a licensed health facility (§11165.4(c)(1)(C)); in the ED for a nonrefillable supply of 7 days or less (§11165.4(c)(2)); for buprenorphine in the ED (§11165.4(c)(3)); around a surgical procedure for 7 days or less (§11165.4(c)(4)); and in some other cases. For exemption (c)(6) (CURES not reachable in time) the practitioner "shall document the reason they did not consult the database in the patient's medical record." So the rule bites mainly on **outpatient and discharge prescriptions** (W1 P1, W6 discharge, W7 refills), not on inpatient MAR orders.

### 2.3 SB 1311 (antimicrobial stewardship in California general acute care hospitals)

- H&S §1288.85 (added by SB 1311, Stats. 2014 ch. 843): each general acute care hospital must, by 2015-07-01, "Adopt and implement an antimicrobial stewardship policy in accordance with guidelines established by the federal government and professional organizations," including "a process to evaluate the judicious use of antibiotics" (cross-reference to §1288.8(a)(3)), a physician-supervised multidisciplinary stewardship committee, and reporting to quality committees. HIGH.
- CDPH All Facilities Letter **AFL 14-36** announced it: SB 1311 "requires general acute care hospitals (GACH) to adopt and implement Antimicrobial Stewardship Programs (ASPs)." MEDIUM (cdph.ca.gov served a broken TLS certificate chain; text taken from the search-engine copy of the page).
- §1288.8 is older than SB 1311 (last amended in 2008). Besides "a process for evaluating the judicious use of antibiotics" (§1288.8(a)(3)), it makes hospitals report CDC process measures that include "surgical antimicrobial prophylaxis" (§1288.8(b)), which touches W6.
- **What it does not say:** neither §1288.85 nor §1288.8 requires an indication on each antibiotic order. They require a policy and a program.

### 2.4 CMS Interoperability and Prior Authorization final rule (CMS-0057-F) and later changes

| Item | What the source says | Confidence |
|---|---|---|
| Final rule | 89 FR 8758, published 2024-02-08, effective 2024-04-08. | HIGH |
| **Payer prior-auth API date** | "MA organizations and state Medicaid and CHIP FFS programs must comply with those policies by January 1, 2027"; Medicaid/CHIP managed care from the first rating period on or after 2027-01-01; QHP issuers on the FFEs from plan years on or after 2027-01-01. | HIGH |
| Decision timeframes (earlier) | From January 1, 2026: decisions for expedited requests within 72 hours and for standard requests within 7 calendar days (MA, Medicaid, CHIP; not QHPs), plus a specific reason for denials. | HIGH |
| **Drugs are excluded** | "the policies for prior authorization APIs and processes do not apply to drugs of any type". | HIGH |
| Hospital measure | CMS-0057-F created an "Electronic Prior Authorization" measure for hospitals from the CY 2027 EHR reporting period. The **FY 2027 IPPS/LTCH final rule** (91 FR 49570, 2026-08-04) changed it: "we are finalizing our proposal to make the measure a bonus measure for the EHR reporting period in CY 2027"; it now reads "For at least one medical item or service (excluding drugs) ordered during a hospital encounter ... requested electronically through a Prior Authorization API using CEHRT." CMS says it is "very strongly considering" requiring all three ONC criteria (g)(31)–(33) from CY 2028. | HIGH |
| **Drugs: proposed only** | CMS-0062-P (91 FR 19890, 2026-04-14) proposes requiring payers "to make available electronic prior authorization for drugs" and proposed an October 1, 2027 compliance date for the FHIR implementation guides. Comments closed 2026-06-15. **Not final** as of 2026-10-31 (no final rule in the Federal Register). | HIGH that it is proposed; status checked 2026-10-31 |

---

## 3. Mapping table

Each row: spec rule → source (citation, link, short quote) → type → confidence and notes.

### 3.1 Entry requirements (what each commit must capture)

| # | Spec rule (BRIEF 5a / 5) | Source and short quote | Type | Confidence and notes |
|---|---|---|---|---|
| E1 | **Medication order lines capture drug, dose (with unit), route, frequency** (`drug`, `dose` per order line; pre-fill "default allowed; a human confirms") | **22 CCR §70263(g)**: "The order shall include the name of the drug, the dosage and the frequency of administration, the route of administration, if other than oral, and the date, time and signature of the prescriber". **§70263(h)(4)** (standing orders): "Be specific as to the drug, dosage, route and frequency of administration." [CCR via LII](https://www.law.cornell.edu/regulations/california/22-CCR-70263). Accreditation: S-TJC-ORDER (hospital policy must define a complete order as at least "medication name, medication dose, medication route, and medication frequency"). | CA reg + Accreditation | HIGH. California requires route only "if other than oral"; we always require it (stricter, our choice). Defaults allowed with human confirm: our design; consistent with 42 CFR 482.24(c)(3) (order sets must be approved and "dated, timed, and authenticated promptly in the patient's medical record by the ordering practitioner"). |
| E2 | **Orders are dated, timed, and authenticated by the ordering practitioner** (part of `signOrders`) | **42 CFR 482.24(c)(2)**: "All orders, including verbal orders, must be dated, timed, and authenticated promptly by the ordering practitioner". **482.23(c)(3)**: orders for drugs "must be documented and signed by a practitioner who is authorized to write orders". [eCFR 482.24](https://www.ecfr.gov/current/title-42/section-482.24), [482.23](https://www.ecfr.gov/current/title-42/section-482.23) | Federal reg | HIGH. Applies to Medicare-participating hospitals. Outpatient clinic prescriptions are covered by CA B&P §4040 and §688 instead (E9). |
| E3 | **Duration, quantity, refills** in the W1 order composer | **22 CCR §70263(j)**: the hospital "shall develop policies limiting the duration of drug therapy in the absence of the prescriber's specific indication of duration". **42 CFR 482.25(b)(5)**: drugs "not specifically prescribed as to time or number of doses must automatically be stopped after a reasonable time". **21 CFR 1306.12(a)**: "The refilling of a prescription for a controlled substance listed in Schedule II is prohibited." | CA reg; Federal reg | HIGH. Law requires a stop policy, not a duration field on every order. Making duration required is our design. Implemented as `scheduleIIRefillsEntry signOrders`: per-line `.drugClass "scheduleII"`, `allowed? := some ["0"]`. The same confirmed capture must be zero. Non-Schedule-II prescriptions retain their existing refill rules. Seed 16 confirms a default of three and is blocked; mixed-line and correction regressions pass (section 4, C4). |
| E4 | **Indication on the order** (W1 composer field; required for antibiotics in v2: `abxIndication`) | **45 CFR 170.315(a)(1)(ii)**: "Optional. Include a 'reason for order' field." **170.315(b)(3)(ii)(C)**: e-prescribing technology "must be able to receive and transmit the diagnosis or diagnoses that are the reason for prescription". **CA B&P §4040(a)(1)(E)**: a prescription includes "A legible, clear notice of the condition or purpose for which the drug is being prescribed, if requested by the patient". **B&P §4076(a)(10)**: the label shows the condition or purpose "if the condition or purpose is indicated on the prescription." Accreditation: S-TJC-ORDER (the hospital's policy defines "When indication for use is required on a medication order"). Best practice: S-CDC-core, S-CDC-outpt; S-ISMP-mtx (a hard-stop indication for daily oral methotrexate). | Federal reg (vendor); CA law; Accreditation; Best practice | HIGH for the quotes. **No law requires an indication on every order.** ONC makes the field optional for vendors; California requires it only if the patient asks; TJC leaves it to hospital policy. Required-for-antibiotics is v2 policy (section 5). |
| E5 | **Weight recorded today, in kg** (`weight`, pre-fill "from the record, with provenance shown; a human confirms") and **pounds rejected** | Best practice: S-ISMP-kg: "Measure and document patient weights in metric units only" and "Avoid the use of a stated, estimated, or historical weight." Evidence: S-lbkg. Federal analog: **45 CFR 170.315(b)(3)(ii)(E)**: "Limit a user's ability to prescribe all oral liquid medications in only metric standard units of mL (that is, not cc)." | Best practice; Federal reg (analog only) | No federal or CA law requires weight in kg. The ONC rule is metric-only for oral-liquid volumes, not for weight. ISMP's "avoid ... historical weight" supports a measured weight; the exact "recorded **today**" window is OUR DESIGN CHOICE. TJC deleted its pediatric weight-based dosing EP (legacy MM.04.01.01 EP 10) for 2026. |
| E6 | **Patient-ID re-entry before signing orders** (`patientIdReentry`, pre-fill "never", human-only) | No law. Evidence: S-ID-reentry (randomized trial: ID re-entry "reduced the odds by a larger magnitude (OR 0.60, 95% CI 0.50 to 0.71)"). Best practice: S-SAFER, Patient Identification guide, which lists "'re-entering' patient identifiers (e.g., initials, name) before signing orders" as a fallback when banner photos are not available. Related accreditation: two identifiers (S-TJC-ID). CA treats a wrong-patient medication error with death or serious disability as a reportable adverse event: **H&S §1279.1(b)(4)(A)** ("an error involving the wrong drug, the wrong dose, the wrong patient, the wrong time, the wrong rate, the wrong preparation, or the wrong route"). | Evidence + Best practice + OUR DESIGN CHOICE | HIGH that no law requires re-entry. §1279.1 is about reporting after harm, not about prevention. SAFER prefers a banner photo; re-entry is its fallback. |
| E7 | **Diagnosis auto-linked, enter once** (diagnosis → order → claim; pre-fill "auto-linked") | **42 CFR 482.24(c)**: the record "must contain information to justify admission and continued hospitalization, support the diagnosis". **170.315(a)(2)(ii)**: optional "reason for order" on lab orders. | Federal reg (loose) + OUR DESIGN CHOICE | MEDIUM. Law wants the diagnosis documented; "enter once" is our design (it removes BRIEF's "diagnosis re-entered for billing" friction). |
| E8 | **Allergy review in rooming ("mark as reviewed")** feeding a receipt | **45 CFR 170.315(a)(4)(i)**: checks are "based on a patient's medication list and medication allergy list". Accreditation: S-TJC-MEDREC. Best practice: S-SAFER, CPOE guide: "Critical patient information (e.g., age, weight, allergies, pregnancy status) is visible during the order entry process." | Federal reg (vendor) + OUR DESIGN CHOICE | MEDIUM. The law assumes an allergy list exists; "mark as reviewed" producing a receipt is our design. |
| E9 | **Discharge and outpatient prescriptions are electronic** (W1, W6 discharge, W7 refills) | **CA B&P §688(d)**: "A prescription prescribed by a health care practitioner shall be issued as an electronic data transmission prescription." Exceptions in §688(e); for a controlled substance not sent electronically the prescriber "shall document the reason in the patient's medical record as soon as practicable and within 72 hours" (§688(f)). | CA law | HIGH (AB 2789, 2018; current text as amended by AB 852, 2022). Applies to prescriptions, not inpatient chart orders. |
| E10 | **Medication reconciliation** in W1 rooming (continue/stop/modify per med) and W6 discharge | **CA B&P §4118.5(a)** (SB 1254, 2018): "A pharmacist at a hospital pharmacy shall obtain an accurate medication profile or list for each high-risk patient upon admission and discharge" (hospitals over 100 beds; technicians may do it under conditions). **H&S §1262.5(e)**: discharge information includes "education and counseling about the patient's medications, including dosing and proper use of medication delivery devices". Accreditation: S-TJC-MEDREC (obtain, compare, communicate). | CA law + Accreditation | HIGH for the CA quotes. §4118.5 puts the duty on the **pharmacy**, for **high-risk** inpatients, and the hospital defines "high-risk." Clinic med rec in W1 is accreditation/best practice. Note: the current text says "upon admission and discharge" (amended by AB 1503, 2025); the 2018 original said "upon admission of the high-risk patient" (checked in the 2019–20 official database). |
| E11 | **Immunization record: vaccine, manufacturer, lot, administering provider, site/route, VIS given before vaccination, VIS edition date** (`recordImmunization`) | **42 U.S.C. §300aa-25(a)**: the provider "shall record ... (1) the date of administration of the vaccine, (2) the vaccine manufacturer and lot number of the vaccine, (3) the name and address and, if appropriate, the title" of the administering provider. **§300aa-26(d)**: "Such materials shall be provided prior to the administration of such vaccine." **CA H&S §120440(c)(4)**: registry data include "Manufacturer and lot number for each immunization received." [LII 300aa-25](https://www.law.cornell.edu/uscode/text/42/300aa-25), [300aa-26](https://www.law.cornell.edu/uscode/text/42/300aa-26) | Federal law; CA law | HIGH (US Code via LII; California via the official database). Implemented as eight entry requirements, including `visGiven`, `visEditionDate`, `vaccineManufacturer`, `vaccineLot`, and `vaccineProvider`. [CDC required-use instructions](https://www.cdc.gov/vaccines/hcp/about-vis/instructions.html) specify recording the VIS edition and date provided under the vaccine-information law. Site/route gating is hospital policy. Tests omit each legal entry and block recording; false VIS attestation cannot satisfy the guard. The UI records an attestation before commit, not proof of actual prior delivery. Provider name/address/title, administration date and VIS delivery date require complete FHIR adapter data; this demo does not certify the entire statutory record. |
| E12 | **Administration charting: given, held, or refused, with a reason** (W4 step 6) | **22 CCR §70749(a)(6)(C)**: nurses' notes include "Name, dosage and time of administration of medications and treatment. Route of administration and site of injection shall be recorded if other than by oral administration." **42 CFR 482.24(c)(4)(vi)**: records include "medication records". **22 CCR §70263(g)(2)**: "Medications and treatments shall be administered as ordered." | CA reg; Federal reg | HIGH. "Reason for held or refused" is our design (and usual hospital policy). |
| E13 | **PRN: pain score before giving, reassessment later** (W4 step 5) | **22 CCR §70215(a)(1)**: RN assessments "shall be performed, and the findings documented in the patient's medical record, for each shift". Accreditation: TJC pain standard (PC.01.02.07 before 2026; "reassesses and responds to the patient's pain"; its 2026 ID was not checked). | CA reg (general) + Accreditation | CA: HIGH but general (per shift, not per dose). TJC: MEDIUM (wording from a 2017 TJC Perspectives summary as quoted by secondary sources; jointcommission.org blocked our download). Pain score before each PRN dose is hospital policy, not law. |
| E14 | **Pre-op: H&P updated** (W6 pre-op; BRIEF 5a consent row) | **42 CFR 482.51(b)(1)**: before surgery, "A medical history and physical examination must be completed and documented no more than 30 days before or 24 hours after admission or registration", with an update within 24 hours. **22 CCR §70223(d)(1)**: "An interval medical history and physical examination performed and recorded within the previous 24 hours." | Federal reg; CA reg | HIGH. |
| E15 | **Operative note signed by the surgeon** (`signOpNote`) | **42 CFR 482.51(b)(6)**: "An operative report describing techniques, findings, and tissues removed or altered must be written or dictated immediately following surgery and signed by the surgeon." **22 CCR §70749(a)(12)**: the record includes the operative report. | Federal reg; CA reg | HIGH. |
| E16 | **Discharge: med rec, prescriptions, follow-up, instructions** (`discharge`) | **42 CFR 482.43(b)**: discharge the patient "along with all necessary medical information pertaining to the patient's current course of illness and treatment, post-discharge goals of care, and treatment preferences". **482.24(c)(4)(vii)**: "Discharge summary with outcome of hospitalization, disposition of case, and provisions for follow-up care." **CA H&S §1262.5(g)**: each patient receives "information regarding each medication dispensed". **22 CCR §70707(b)(13)**: right to "Be informed of continuing health care requirements following discharge". | Federal reg; CA law; CA reg | HIGH. Candidate additions from §1262.5 (caregiver, housing status, homeless checklist) are in section 4. |
| E17 | **Refill approval checks last visit, labs, adherence** (`approveRefill`, W7) | No law requires these checks. The refill itself is a prescription: B&P §688 (e-prescribing), §4040 (contents); 21 CFR 1306.12 (Schedule II), 21 CFR 1311.140 (controlled-substance signing). | OUR DESIGN CHOICE (clinical practice) | HIGH that no law requires the lab check. |
| E18 | **Units: every quantity has its required unit** (UnitKind on elements) | **45 CFR 170.315(b)(3)(ii)(F)**: "Always insert leading zeroes before the decimal point for amounts less than one and must not allow trailing zeroes after a decimal point". (b)(3)(ii)(E): oral liquids in mL only. | Federal reg (vendor) | HIGH for the quote. Our `Value.qty` stores tenths; the renderer should follow the zero rules when it prints doses. |
| E19 | **W2: message the patient about a result** | **CA H&S §123148(e)**: results "shall be recorded in the patient's medical record, and shall be reported to the patient within a reasonable time period". **§123148(f)**: unless the patient asks and the professional agrees, and the result was first discussed orally, some results may not be released electronically, including "A positive HIV test", hepatitis antigens, drug-abuse tests, and scans or tissue results that "reveal a new or recurrent malignancy." | CA law | HIGH (official database; amended by SB 1419, 2022). See candidate C14. |
| E20 | **W1 close: level of service, follow-up, patient instructions; W3 disposition; W4 handoff summary** | Hospital records need "provisions for follow-up care" at discharge (42 CFR 482.24(c)(4)(vii)). We did not check billing rules for level of service or TJC hand-off standards. | OUR DESIGN CHOICE (realism) | Not checked beyond the CoP quote. |

### 3.2 Review requirements (what must be shown before each commit)

| # | Spec rule | Source and short quote | Type | Confidence and notes |
|---|---|---|---|---|
| R1 | **Pinned landmark: patient banner with two identifiers on every screen** (`patientBanner`, design rule `landmarks`) | Accreditation: S-TJC-ID: "This includes using at least two patient identifiers. The hospital does not use the patient's room number or physical location as an identifier." **22 CCR §70749(a)(1)**: identification sheets include name, identification number, age, sex. Best practice: S-SAFER, Patient Identification: "The display of color patient photographs in the main banner of an EHR… is an effective, non-interruptive method to improve patient identification". | Accreditation + Best practice + OUR DESIGN CHOICE | **Entrenched** for two identifiers under Joint Commission NPG.01.01.01 (accreditation); "on every screen, pinned" is our design. Candidate: add the photo placeholder in the banner to the landmark (SAFER, rated "Strong"). |
| R2 | **Allergy list and current meds shown on the sign-orders screen, or a valid prior-review receipt** (`allergyList`, `currentMeds`; mode `shownOrReceipt window roles`) | **45 CFR 170.315(a)(4)(i)**: "Before a medication order is completed and acted upon during computerized provider order entry (CPOE), interventions must automatically indicate to a user drug-drug and drug-allergy contraindications based on a patient's medication list and medication allergy list." | Federal reg (vendor) + Best practice + OUR DESIGN CHOICE | HIGH for the quote. ONC requires the **automatic check**, not that the list be displayed. The SAFER CPOE guide does ask that allergies and weight be "visible during the order entry process" (see E8). Showing the list, the receipt, its time window, and its allowed roles are our design. The receipt must name the reviewer: 42 CFR 482.24(b) ("a system of author identification and record maintenance that ensures the integrity of the authentification") supports keeping receipts as Provenance/AuditEvent records. |
| R3 | **Weight-based dose check shown on the commit screen, no receipt** (`doseCheck`, `shownOnCommit`) | No law. Best practice: S-ISMP-kg; S-SAFER (weight "visible during the order entry process"). | Best practice + OUR DESIGN CHOICE | "No receipt" is ours. |
| R4 | **Trend shown before acknowledging an abnormal result, no receipt** (`resultTrend`, `ackResult`) | No law requires the ordering clinician to acknowledge results in the EHR. **CLIA, 42 CFR 493.1291(g)** binds the lab: it "must immediately alert the individual or entity requesting the test ... when any test result indicates an imminently life-threatening condition, or panic or alert values." Accreditation: S-TJC-CRIT: "The hospital reports critical results of tests and diagnostic procedures on a timely basis." Best practice: S-SAFER, Test Results guide (rated "Required"): "Life-threatening results are communicated verbally or electronically with rapid acknowledgment and automatic escalation if there is no response". | Federal reg (lab side) + Accreditation + Best practice + OUR DESIGN CHOICE | HIGH that the trend requirement is ours. SAFER supports an explicit acknowledgment step (and escalation, which we do not model). |
| R5 | **Anticoagulant list shown before pre-op orders are signed** (seeded bad program 7.5 #8) | Accreditation: S-TJC-ANTICOAG: "approved protocols and evidence-based practice guidelines for perioperative management of all patients on oral anticoagulants." | Accreditation + OUR DESIGN CHOICE | HIGH for the quote. No law. TJC requires a protocol, not a display on the sign screen. Its scope excludes routine short-term VTE prophylaxis. |
| R6 | **Consent documentation verified before pre-op orders are signed** (human-only acknowledgment; 7.5 #8) | **42 CFR 482.51(b)(2)**: "A properly executed informed consent form for the operation must be in the patient's chart before surgery, except in emergencies." **482.24(c)(4)(v)**: "Properly executed informed consent forms for procedures and treatments specified by the medical staff, or by Federal or State law". **22 CCR §70223(d)**: before commencing surgery the anesthesia provider or surgeon "shall verify the patient's identity, the site and side of the body to be operated on" and that the record contains "(3) An informed consent, in writing, for the contemplated surgical procedure." **22 CCR §70707(b)(5)**: right to "Receive as much information about any proposed treatment or procedure as the patient may need in order to give informed consent". Accreditation: S-TJC-UP: the pre-procedure checklist includes "Relevant documentation (for example, history and physical, signed procedure consent form, nursing assessment, preanesthesia assessment)". | Federal reg; CA reg; Accreditation | HIGH. **The law ties consent to the start of surgery, not to signing pre-op orders.** Gating pre-op order signing on consent is stricter than law: OUR DESIGN CHOICE. |
| R7 | **v2: antibiotic indication shown on the MAR administration screen, no receipt** (`administerMed`, `medClass antibiotic`) | No law. Modeled on stewardship law (42 CFR 482.42(b); H&S §1288.85), CDC Core Elements (S-CDC-core), and TJC (S-TJC-ASP). | OUR DESIGN CHOICE (modeled on law) | See section 5. |
| R8 | **"Shown" means on the same screen, not collapsed, not in an unopened tab, legible** | Closest federal analog: **21 CFR 1311.140(a)(3)–(4)**: "While the prescription information ... is displayed," the signing statement is displayed, and "While the prescription information ... and the statement ... remain displayed, the practitioner must be prompted to complete the two-factor authentication protocol." Legibility: **42 CFR 482.24(c)(1)** ("legible, complete, dated, timed, and authenticated") and **22 CCR §70751(a)** ("legible and readily available"). | Federal reg (analog) + OUR DESIGN CHOICE | HIGH for the quotes. `controlledRxReview signOrders` now requires `orderSummary` shown at signing for `controlled-II-IV`, with no receipt or waiver. It denotes patient, drug, dose, quantity, directions and refills. Seed 15 is blocked with details collapsed even after an actual review receipt; opening the sign-screen group repairs it. The exact legibility definition and applying this to facility orders too are stricter demo choices. Full DEA authentication is outside this model; rendered prescription rows are an outstanding integration request. |

### 3.3 Human-only steps (never pre-filled, skipped, or done by a macro)

| # | Spec rule | Source and short quote | Type | Confidence and notes |
|---|---|---|---|---|
| H1 | **Signing** (orders, notes, op note, refill approval) | **42 CFR 482.24(c)(1)**: entries "authenticated in written or electronic form by the person responsible for providing or evaluating the service provided". **22 CCR §70751(g)**: a computer key may replace a signature only when the practitioner has signed a statement that he/she "is the only person who: (1) Has possession of the stamp or key. (2) Will use the stamp or key." **21 CFR 1311.140(c)** (controlled-substance e-prescriptions): "Any prescription not signed in the manner required by this section shall not be transmitted." | Federal reg; CA reg | HIGH. This is the strongest legal basis for "a macro may never sign." |
| H2 | **Patient-ID re-entry** | See E6. | Evidence + OUR DESIGN CHOICE | |
| H3 | **Wristband and medication barcode scan at administration** (`scan "wristband"`, `scan "medication"`) | **21 CFR 201.25(a)**: "Manufacturers, repackers, relabelers, and private label distributors of a human prescription drug product ... are subject to these bar code requirements". That rule puts barcodes on drug labels; it does not require hospitals to scan. Hospital duty is general: **42 CFR 482.23(c)(1)** (administer "in accordance with ... accepted standards of practice") and **482.25** ("policies and procedures that minimize drug errors"); **CA H&S §1339.63(a)(1)**: each hospital "shall adopt a formal plan to eliminate or substantially reduce medication-related errors", including "technology implementation, such as ... computerized physician order entry". Accreditation: S-TJC-ID counts "Electronic identification technology coding, such as bar coding or RFID, that includes two or more person-specific identifiers" as identification. Best practice: ISMP TMSBP 2026–2027 adds a barcode-scanning best practice (BP 24; we read only its alert-fatigue wording). | Federal/CA law (general duty) + Best practice + OUR DESIGN CHOICE | **Entrenched**: the [Leapfrog BCMA safety measure](https://ratings.leapfroggroup.org/measure/hospital/2026/safe-medication-administration) evaluates both patient and medication scans and protection against workarounds. This is a hospital safety benchmark, not a universal statutory scan mandate. FDA's eCFR shows a pending amendment to §201.25 (91 FR 10770, 2026-03-05) that we did not review. |
| H4 | **Human acknowledgment of interaction warnings** | **45 CFR 170.315(a)(4)(i)**: interventions "must automatically indicate to a user" contraindications before the order is completed. | Federal reg (vendor) + OUR DESIGN CHOICE | ONC requires the warning to reach the user; it does not require an acknowledgment click or an override reason. Requiring a human ack is our design (and common practice). |
| H5 | **High-alert double check by a second, different nurse** (`highAlertCosign`, `When.highAlertMed`) | Best practice: S-ISMP-IDC: "An independent double check requires two people to separately check the targeted components of the work process, without knowing the results of their colleague." S-ISMP-HAM lists insulin and heparin. No federal or CA rule found. Closest CA two-person rule is for **destroying** controlled substances: **22 CCR §70263(q)(11)(A)**: "destroyed in the presence of two pharmacists or a pharmacist and a registered nurse". | Best practice + OUR DESIGN CHOICE | HIGH that no law requires it. ISMP adds that independent double checks "are a poor substitute for system improvements" and should be used selectively; requiring one for insulin and heparin is consistent with that. Our model checks "two distinct users"; ISMP's "without knowing the results" (blindness) is not modeled. |
| H6 | **Consent verification** | See R6. | Federal reg; CA reg (for surgery start) + OUR DESIGN CHOICE (for order signing) | |
| H7 | **CURES review before a first Schedule II–IV prescription** (`curesReview`) | **H&S §11165.4**. See 2.2 and candidate C1. | CA law | HIGH. |

### 3.4 Alert rules, tiers, and properties A1–A4

| # | Spec rule | Source and short quote | Type | Confidence and notes |
|---|---|---|---|---|
| A-1 | **Drug–allergy match: interruptive** (`drugAllergy`) | **45 CFR 170.315(a)(4)(i)** (quoted in R2). | Federal reg (vendor) | HIGH. Fires "before a medication order is completed and acted upon", which matches "handled before the commit it concerns." |
| A-2 | **Drug–drug interaction: severe = interruptive; tiers by severity** (`interaction`) | **45 CFR 170.315(a)(4)(ii)**: "(A) Enable the severity level of interventions provided for drug-drug interaction checks to be adjusted. (B) Limit the ability to adjust severity levels ... (1) To a specific set of identified users. (2) As a system administrative function." Best practice: S-SAFER, CPOE guide (rated "Strong"): "alerts should be tiered by severity and clearly and concisely describe the next action to take." Evidence: S-tiering, S-override. | Federal reg (vendor) + Best practice + Evidence | HIGH. This is the legal hook for **tiers**: ONC expects drug–drug severity to be tunable, and only by limited users. In our system "limited users" means the spec owner, never the agent. Drug–allergy severity is **not** adjustable under ONC. |
| A-3 | **Duplicate therapy** (`duplicateTherapy`) | No law. Evidence: S-override; S-tiering (Phansalkar 2013 lists low-priority interactions that "do not warrant being interruptive alerts"). | Best practice + OUR DESIGN CHOICE | Tier per V1 (removable or passive fits the evidence). |
| A-4 | **Dose out of range for the recorded weight: interruptive** (`doseOutOfRange`) | No law. Best practice: S-ISMP-kg. | Best practice | |
| A-5 | **Weight entered in lb** (`weightInLb`; pounds rejected) | No law. Best practice: S-ISMP-kg. Evidence: S-lbkg (lb/kg confusion was 26.9% of weight-related medication error reports in Pennsylvania, 2009). | Best practice | ISMP also suggests an alert when a new weight "differs significantly from the last recorded weight" (candidate C12). |
| A-6 | **Care gap: passive** (`careGap`) | No law requires care-gap reminders. Evidence on fatigue: S-override. | OUR DESIGN CHOICE | |
| A-7 | **Required field missing: hard stop** | Inherits the source of the field (E1–E16). | (per field) | |
| A-8 | **High-alert medication involved** (`highAlertMed`) | Best practice: S-ISMP-HAM. | Best practice | |
| A1 | **Alerts fire when they should** | 170.315(a)(4)(i): "must automatically indicate". | Federal reg (vendor) | For drug–allergy and drug–drug only. |
| A2 | **No false alarms** | Evidence: S-override ("Drug safety alerts are overridden by clinicians in 49% to 96% of cases"). | Evidence + OUR DESIGN CHOICE | |
| A3 | **No repeat interruptions** (same condition and data version, once per encounter) | Evidence: S-repeat ("Reducing within-patient repeats may be a promising target for reducing alert overrides and alert fatigue"). Re-firing on new data matches SAFER: "Interaction checking occurs for all active medications when a new allergy is entered (i.e., reverse checking)." | Evidence + Best practice + OUR DESIGN CHOICE | |
| A4 | **Severity tiers: passive never pops up** | 170.315(a)(4)(ii) (tunable severity); S-SAFER (tiered alerts); S-tiering (tiered site: "100% of the most severe alerts were accepted, vs. only 34% at the non-tiered site"). | Federal reg (vendor) + Best practice + Evidence | |
| Budget | **Interruptive alerts on a required path never exceed the canonical count** | S-SAFER, CPOE guide: "The organization has established standards limiting the use of interruptive alerts to only the most critical warnings." Evidence: S-override (Wright 2018: after an EHR switch, acceptance of the most severe interaction alerts "fell from 100 to 8.4%"). | Best practice + OUR DESIGN CHOICE | The numeric budget (canonical count) is ours. |

### 3.5 Friction classes, pre-fill policies, and design rules

| # | Spec rule | Source and short quote | Type | Confidence and notes |
|---|---|---|---|---|
| F1 | **Friction class "compliance": the information is required, but a pre-fill or a valid receipt may satisfy it** | Law asks for documentation and authentication by the responsible person, not for re-typing: **42 CFR 482.24(c)(1)** (entries "authenticated ... by the person responsible"), **482.24(c)(3)** (pre-printed and electronic order sets allowed if approved and authenticated). | Federal reg + OUR DESIGN CHOICE | MEDIUM. Our reading: a pre-filled value that a human confirms, with provenance shown, meets "authenticated by the person responsible." The three-class scheme itself is ours. |
| F2 | **Pre-fill "from the record, with provenance shown; a human confirms"** | **42 CFR 482.24(b)**: "a system of author identification and record maintenance that ensures the integrity of the authentification". | Federal reg + OUR DESIGN CHOICE | MEDIUM. Showing source and date is our design; it supports author identification. |
| F3 | **Pre-fill "never" (patient-ID re-entry)** | See E6. | Evidence + OUR DESIGN CHOICE | |
| F4 | **Writes only: the UI writes only what the spec allows, and each role only what it may** | **42 CFR 482.24(b)(3)**: the hospital "must ensure that unauthorized individuals cannot gain access to or alter patient records." **CA Civil Code §56.10(a)** (CMIA): a provider "shall not disclose medical information ... without first obtaining an authorization", with exceptions. **CA H&S §123100**: patients have "a concomitant right of access to complete information". | Federal reg; CA law (context) | HIGH for the quotes; context only. |
| F5 | **Legibility (minimum size and contrast)** | **42 CFR 482.24(c)(1)** "legible"; **22 CCR §70751(a)** "legible and readily available". ONC safety-enhanced design: 45 CFR 170.315(g)(3) (attestation only after HTI-5). | Federal reg (general) + OUR DESIGN CHOICE | The numbers (minimum size, contrast) are ours. |
| F6 | **Maximum navigation depth; stability budget; fixed component catalog** | No law. | OUR DESIGN CHOICE | |
| F7 | **Standing orders and order sets (macros)** must keep human steps | **42 CFR 482.24(c)(3)**: order sets allowed only if approved by medical staff, nursing and pharmacy leadership, consistent with evidence-based guidelines, reviewed periodically, and "dated, timed, and authenticated promptly in the patient's medical record by the ordering practitioner". **22 CCR §70263(h)(3)**: standing orders "initially approved by the pharmacy and therapeutics committee ... and be reviewed at least annually". | Federal reg; CA reg | HIGH. A real basis for T6 ("a macro behaves like its expansion") and for owner approval of new macros. |

### 3.6 Seeded bad programs (BRIEF 7.5): what each one would violate

| 7.5 # | Bad program | Real source it would violate (if any) |
|---|---|---|
| 1 | Allergy list in an unopened tab on the sign screen | Our "shown" rule (R2, R8). 170.315(a)(4) alerts would still fire; ONC does not require the list on screen. |
| 2 | Patient-ID re-entry pre-filled | Our design (E6); evidence S-ID-reentry. |
| 3 | Weight in lb accepted | Best practice (S-ISMP-kg). |
| 4 | Macro skips the interaction acknowledgment | Our design (H4); 42 CFR 482.24(c)(3) (order sets need practitioner authentication). |
| 5 | Same nurse or auto-filled double check | Best practice (S-ISMP-IDC). |
| 6 | Dose check uses yesterday's weight | Our design ("today"); best practice (S-ISMP-kg). |
| 7 | Commit unreachable | Our design (completability). |
| 8 | Pre-op macro signs without the anticoagulant list, or auto-confirms consent | Consent: 42 CFR 482.51(b)(2), 22 CCR §70223(d)(3) (consent must be in the record before surgery); signing: 42 CFR 482.24(c)(1). Anticoagulants: accreditation (S-TJC-ANTICOAG). |
| 9 | A1: macro suppresses a matching drug–allergy alert | **45 CFR 170.315(a)(4)(i)** (the clearest legal violation in the list). |
| 10 | A2: "dose out of range" popup on every order | Evidence (S-override). |
| 11 | A3: same interaction alert twice per encounter | Evidence (S-repeat). |
| 12 | A4: passive care gap made a popup | Our design; evidence (S-tiering). |

### 3.7 Releases

| Release | Spec change | Source | Type | Confidence and notes |
|---|---|---|---|---|
| **v1.1** prior-auth panel (optional element, new `priorAuthStatus` kind; writes ServiceRequest/Task only) | Optional; no review requirement | CMS-0057-F (89 FR 8758): payer prior-auth APIs by 2027-01-01, **excluding drugs**. ONC HTI-4: 45 CFR 170.315(g)(31)–(33). FY 2027 IPPS final rule: hospital "Electronic Prior Authorization" measure is a **bonus** measure for CY 2027, excluding drugs. CMS-0062-P (proposed 2026-04-14): would add drugs. CMS's own example matches our panel: "When the cardiologist places an order for a TTE in the EHR, a Health IT Module certified to ... (g)(31) automatically sends a real-time query" (FY 2027 IPPS final rule). | Federal reg (payers, vendors, hospital incentive measure) | HIGH. Imaging: grounded. Specialty meds: proposed rule only. "Optional, no review requirement" is consistent with the bonus status. |
| **v2** antibiotic indication (entry on `signOrders` per antibiotic line; review on `administerMed`, shown, no receipt) | New required element and review | 42 CFR 482.42(b)(2)(ii) and (b)(3); CMS SOM Appendix A A-0764 (points to CDC Core Elements); CA H&S §1288.85 and §1288.8(a)(3); CDC Core Elements (S-CDC-core); TJC MM.18.01.01 / NPG.14.06.01 (S-TJC-ASP) and MM.14.01.01 (the hospital decides "When indication for use is required"); ISMP's methotrexate indication hard stop (S-ISMP-mtx) as precedent; 22 CCR §70263(j) (duration). | Modeled on law; the per-order rule is best practice | HIGH for the quotes; the per-order indication is **not** law. See section 5. |

### 3.8 Standards and evidence cited above (labeled S-…)

**None of these is law.** TJC is accreditation; the rest is best practice or published evidence. One partial exception: Medicare hospitals must attest "yes" to an annual self-assessment with the SAFER Guides (see S-SAFER).

**Joint Commission, hospital program, 2026.** The NPSG and Universal Protocol chapters were replaced on 2026-01-01 by the "National Performance Goals" chapter ("This chapter replaces the former National Patient Safety Goals ® (NPSG) chapter"; TJC says "there are no new requirements added"). Sources: the hospital NPG chapter PDF ("Effective January 2026") and the TJC Disposition Report (old to new IDs), both on digitalassets.jointcommission.org. Confidence HIGH for the 2026 chapter text. For MM.14.01.01 and MM.18.01.01 we read the prepublication text (July 2025), not the paywalled final manual.

| Label | 2026 ID (old ID) | Short quote | Confidence |
|---|---|---|---|
| S-TJC-ID | NPG.01.01.01 (NPSG.01.01.01) | "This includes using at least two patient identifiers. The hospital does not use the patient's room number or physical location as an identifier." Barcodes count: "Electronic identification technology coding, such as bar coding or RFID, that includes two or more person-specific identifiers". | HIGH |
| S-TJC-CRIT | NPG.01.02.01 (NPSG.02.03.01) | "The hospital reports critical results of tests and diagnostic procedures on a timely basis." | HIGH |
| S-TJC-UP | NPG.01.06.01 pre-procedure verification (UP.01.01.01); NPG.01.06.03 time-out (UP.01.03.01) | "verify the correct procedure, for the correct patient, at the correct site"; documentation includes "history and physical, signed procedure consent form". | HIGH |
| S-TJC-ANTICOAG | NPG.14.04.01 (NPSG.03.05.01) | "approved protocols and evidence-based practice guidelines for perioperative management of all patients on oral anticoagulants." | HIGH |
| S-TJC-MEDREC | NPG.14.05.01 (NPSG.03.06.01) | The hospital "compares the medication information the patient brought to the hospital with the medications ordered for the patient by the hospital in order to identify and resolve discrepancies." | HIGH |
| S-TJC-ORDER | MM.14.01.01 EP 2–3 (MM.04.01.01) | Policy defines "Minimum required elements of a complete medication order, which must include medication name, medication dose, medication route, and medication frequency" and "When indication for use is required on a medication order". Also: "The hospital minimizes the use of verbal medication orders." | HIGH (prepublication text) |
| S-TJC-ASP | MM.18.01.01 and NPG.14.06.01 (MM.09.01.01) | "The antibiotic stewardship program adheres to nationally recognized guidelines, as well as best practices, for improving antibiotic use." The program "implements at least two evidence-based guidelines to improve antibiotic use for the most common indications." | HIGH (prepublication text) |

**ISMP** (ismp.org now redirects to ECRI and blocked automated access; we read the official PDFs and archived official pages).

| Label | Source | Short quote | Confidence |
|---|---|---|---|
| S-ISMP-HAM | ISMP List of High-Alert Medications in Acute Care Settings (2024, still current) | "anticoagulants (e.g., warfarin, low molecular weight heparin, unfractionated heparin)"; "All forms of insulin, subcutaneous and IV, are considered a class of high-alert medications." Also: "manual independent double checks are not always the optimal error-reduction strategy". | HIGH |
| S-ISMP-IDC | ISMP Medication Safety Alert!, "Independent Double Checks: Worth the Effort if Used Judiciously and Properly" (2019-06-06) | "An independent double check requires two people to separately check the targeted components of the work process, without knowing the results of their colleague." | HIGH |
| S-ISMP-kg | ISMP Targeted Medication Safety Best Practices for Hospitals, 2026–2027, Best Practice 3 | "Measure and document patient weights in metric units only."; "Document the patient's weight in metric units only in all electronic and written formats."; "Avoid the use of a stated, estimated, or historical weight." | HIGH |
| S-ISMP-mtx | same, Best Practice 2 | "Require a hard stop verification of an appropriate oncologic indication for all daily oral methotrexate orders." (A real best practice that makes an indication a hard stop.) | HIGH |

**CDC**

| Label | Source | Short quote | Confidence |
|---|---|---|---|
| S-CDC-core | CDC, Core Elements of Hospital Antibiotic Stewardship Programs (2019; still the current hospital edition) and its assessment tool | "Documentation of indications for antibiotics: Requiring an indication for antibiotic prescriptions can facilitate other interventions". Assessment tool: a "policy that requires prescribers to document in the medical record or during order entry a dose, duration and indication for all antibiotic prescriptions?" | HIGH |
| S-CDC-outpt | CDC, Core Elements of Outpatient Antibiotic Stewardship (updated edition) | "requiring documentation of clinical indication for every prescription, and generating justification alerts when orders deviate from treatment recommendations." It also warns the "Impact may diminish over time if clinicians become accustomed to prompts (i.e., alert fatigue)". | HIGH |

**SAFER Guides (ASTP/ONC, 2025 edition, 8 guides)**

| Label | Source | Short quote | Confidence |
|---|---|---|---|
| S-SAFER | healthit.gov SAFER Guides (released January 2025): CPOE with Decision Support; Patient Identification; Test Results Reporting and Follow-Up; High Priority Practices; and four others | CPOE: "alerts should be tiered by severity and clearly and concisely describe the next action to take"; "standards limiting the use of interruptive alerts to only the most critical warnings"; "Critical patient information (e.g., age, weight, allergies, pregnancy status) is visible during the order entry process." Patient ID: "confirm patients' identity using two identifiers such as name and date of birth at key points of the care process"; banner photographs; re-entering identifiers before signing orders as a fallback. Test results: "rapid acknowledgment and automatic escalation if there is no response". No metric-weight practice found. | HIGH |
| S-SAFER (federal hook) | FY 2026 IPPS/LTCH final rule (90 FR 36536, 2025-08-04) | CMS finalized requiring hospitals "to conduct an annual self-assessment using all eight of the 2025 SAFER Guides ... beginning with the EHR reporting period in CY 2026" (a "yes" attestation). The eCFR text of 42 CFR 495.24(e)(4)(iv) still reads "all nine SAFER Guides". | HIGH (rule preamble); the CFR text lags |

**Evidence on alerts, patient ID, and weight units** (PubMed abstracts; numbers from the abstracts)

| Label | Study | Finding |
|---|---|---|
| S-override | van der Sijs H et al., JAMIA 2006;13(2):138-47, PMID 16357358 | Review of 17 papers: "Drug safety alerts are overridden by clinicians in 49% to 96% of cases." |
| S-override | Nanji KC et al., "Overrides of medication-related clinical decision support alerts in outpatients," JAMIA 2014;21(3):487-91, PMID 24166725 | 157,483 alerts; "82,889 (52.6%) of alerts were overridden"; about half of overrides judged appropriate. |
| S-override | Wright A et al., J Gen Intern Med 2018;33(11):1868-76, PMID 29766382 | After a switch to a commercial EHR, interruptive drug–drug alert burden rose about 6×; acceptance of the most severe "fell from 100 to 8.4%"; turning off the least severe cut burden by 50.5%. |
| S-override | Poly TN et al., JMIR Med Inform 2020;8(7):e15653, PMID 32706721 (systematic review) | "The range of average override alerts was 46.2%-96.2%." |
| S-repeat | Ancker JS et al., BMC Med Inform Decis Mak 2017;17:36, PMID 28395667 | Acceptance fell 30% for each extra reminder per encounter and 10% for each 5-point rise in the share of repeated reminders. |
| S-tiering | Paterno MD et al., JAMIA 2009;16(1):40-6, PMID 18952941 | Compliance 29% at the tiered site vs 10% at the non-tiered site; "100% of the most severe alerts were accepted, vs. only 34% at the non-tiered site". |
| S-tiering | Phansalkar S et al., JAMIA 2012;19(5):735-43, PMID 22539083; JAMIA 2013;20(3):489-93, PMID 23011124 | A panel-approved list of 15 high-severity interactions that should interrupt; and "a list of 33 class-based low-priority DDI that do not warrant being interruptive alerts" (36% of displayed interactions at one site). |
| S-ID-reentry | Adelman JS et al., JAMIA 2013;20(2):305-10, PMID 22753810 (randomized) | ID-verify alert OR 0.84; "the ID-reentry function reduced the odds by a larger magnitude (OR 0.60, 95% CI 0.50 to 0.71)". |
| S-ID-reentry | Green RA et al., Ann Emerg Med 2015;65(6):679-86, PMID 25534652 | Patient-verification dialog: "Wrong-patient orders were reduced by 30%"; cost about 1.5 physician-hours per wrong-patient order intercepted. |
| S-ID-reentry | Adelman JS et al., JAMA 2019;321(18):1780-7, PMID 31087021 | Limiting clinicians to one open record made no difference (OR 1.03). |
| S-lbkg | Pennsylvania Patient Safety Authority advisories 2009;6(1):10-5, 2016;13(2):50-57, 2018;15(3) | 2009: lb/kg confusion was 129 of 479 weight-related reports (26.9%). 2016: recommends "obtaining, documenting, and communicating patient weights in metric units only (i.e., grams or kilograms)." |

---

## 4. Candidate new real rules worth adding (ranked)

Ranked by how directly real law supports them and how well they fit the demo's workflows. **None of these is in the spec.** The owner decides.

| Rank | Proposed spec rule (plain words) | Source | Fits | Notes |
|---|---|---|---|---|
| **C1** | **CURES report reviewed within 24 hours (or since the previous business day) before signing a first Schedule II–IV prescription for this patient, and again if 6 months have passed since the last review while the drug continues; otherwise an exemption reason is documented.** Mode: shown on the commit screen, or a receipt no older than 24 h from the prescriber (or a documented delegate per (a)(1)(A)(iii)). Exemption reason: coded, human-entered. | CA H&S §11165.4(a)(1)–(2), (c)(6)(B) | W1 (P1 outpatient opioid or benzodiazepine), W6 discharge prescriptions, W7 controlled refills | CA law, HIGH. Exempt when the drug is administered in the facility, or ED/surgical supplies of 7 days or less, so the rule should apply to **outpatient and discharge prescriptions**, not MAR orders. A natural receipt with a real legal time window (24 h). |
| **C2** | **Naloxone offered with qualifying opioid prescriptions:** when an outpatient or discharge opioid prescription is ≥ 90 MME/day, or an opioid is prescribed within a year of a dispensed benzodiazepine, or the patient is at increased overdose risk, the prescriber must record "naloxone offered" (accepted or declined) and overdose-prevention education given (or declined, or given in the past 24 months) before signing. | CA B&P §741(a)–(b) (current text as amended by AB 714, 2019; first enacted in 2018 by AB 2760, per secondary sources) | W1, W6 discharge, W2/W3 ED discharge prescriptions | CA law, HIGH. Does **not** apply "When ordering medications to be administered to a patient while the patient is in either an inpatient or outpatient setting" (§741(c)(2)). |
| **C3** | **Controlled-substance e-prescriptions: the prescription details stay shown while the prescriber completes two-factor signing; a macro can never sign.** | 21 CFR 1311.140(a)(3)–(5), (b), (c) | Every controlled-substance prescription | Federal reg, HIGH. Strengthens H1 with a federal "shown at commit, human-only" rule. Two-factor itself is outside our model; model it as a human-only signing step. |
| **C4** | **Schedule II prescriptions have zero refills (hard stop).** | 21 CFR 1306.12(a) | W1 composer, W7 refills | Federal reg, HIGH. Implemented in v1 and inherited by v1.1/v2 using the generic allowed-value constraint on every matching signing line. Morphine, hydromorphone, oxycodone and hydrocodone-acetaminophen carry `scheduleII`; tramadol and benzodiazepines do not. Confirmed three and zero on the wrong slot fail; zero on the correct slot permits signing. The implemented constraint covers medication order lines committed by `signOrders`. W7's separate `approveRefill` decision uses `refillRefills` and `Facts.medToGive?`, not medication order lines; it is not evidence of the zero-refill rule on that separate workflow. |
| **C5** | **Vaccine Information Statement given before vaccination and attested before recording** (entry on `recordImmunization`, human-confirmed), plus VIS edition date, manufacturer, lot and administering provider. | 42 U.S.C. §300aa-25(a), §300aa-26(d); CA H&S §120440(c)(4) | W5 | Federal law, HIGH. Implemented capture/confirmation gates, with omissions blocked. The VIS flag is not a trusted delivery event; date fields and provider details outside the modeled subset still require FHIR integration. No claim of complete vaccine-law compliance. |
| **C6** | **Before discharge, record the housing status; if the patient is homeless, the discharge commit needs the §1262.5(o) items documented** (clinical stability, meal offered, clothing if needed, follow-up referral, prescription and medication supply, infectious-disease screening offered, vaccinations offered, behavioral health screening, insurance enrollment help, transportation offered). | CA H&S §1262.5(n)(2), (o) (SB 1152, 2018) | W6 discharge (inpatient) | CA law, HIGH. Strong demo of a conditional checklist. Applies to the hospital's discharge policy. |
| **C7** | **At inpatient admission, offer the patient the chance to name one family caregiver and record the answer (or the declination); notify the caregiver at discharge.** | CA H&S §1262.5(c)–(d) | W3 admit, W6 discharge | CA law, HIGH. |
| **C8** | **Pre-op: an interval H&P within the previous 24 hours is shown or recorded before surgery-related commits** (today we only say "update the H&P"). | 22 CCR §70223(d)(1); 42 CFR 482.51(b)(1)(ii) | W6 pre-op | CA reg and federal reg, HIGH. A real time window like our receipts. |
| **C9** | **Verbal orders: countersigned by the prescriber within 48 hours.** | 22 CCR §70263(g) | W3, W4 | CA reg, HIGH. Only if the app models verbal orders. |
| **C10** | **Inpatient medication orders without a stated duration get an automatic stop date from the hospital's class-based policy** (for example antibiotics). | 22 CCR §70263(j); 42 CFR 482.25(b)(5) | W3, W6 post-op, v2 follow-up | CA reg and federal reg, HIGH. Pairs well with v2 ("dose, duration, indication"). |
| **C11** | **Antibiotic order lines capture duration (or a planned review date) as well as indication** | CDC Core Elements (S-CDC-core) + §70263(j) | v2 follow-up | Best practice backed by a CA duration rule. |
| **C12** | **Weight-change check: when a newly entered weight differs significantly from the last recorded weight, raise an interruptive alert before any weight-based dose is signed.** | ISMP TMSBP 2026–2027 BP 3: "Build decision support to trigger alerts when an entered weight differs significantly from the last recorded weight from a previous encounter." | W3 (lb typed as kg), W5 | Best practice, HIGH. Catches the lb-entered-as-kg error that the unit rule cannot see. The threshold is a design choice. |
| **C13** | **Patient photo (or placeholder) in the pinned banner on order-entry and sign screens.** | SAFER Patient Identification RP 2.5 (rated "Strong"). | All | Best practice, HIGH. The banner already has a photo placeholder; making it a landmark is cheap. |
| **C14** | **Before a result in the §123148(f) list (positive HIV, hepatitis antigen, drug-abuse test, new or recurrent malignancy) is released to the patient electronically, record that it was first discussed with the patient by phone or in person (or that the patient asked for electronic release).** | CA H&S §123148(f) | W2 in-basket ("message the patient") | CA law, HIGH. A real guard on a W2 action; fits the "human-only" pattern. |

Lower priority (real, but weaker fit): pharmacist medication history for high-risk inpatients at admission (B&P §4118.5; a pharmacy-role task, and P3 is not a pharmacist); CAIR registry disclosure unless the patient refuses (H&S §120440(c), (e)).

---

## 5. Release motivation text (exact phrasing to use)

### 5.1 Release v2: "Antibiotic indication required"

Use this text in `releases/v2/RELEASE_NOTES.md` and the demo:

> **Why this release exists.** Federal and California law require every hospital to run an antibiotic stewardship program. Medicare's Conditions of Participation (42 CFR 482.42(b)) require a hospital-wide program that "documents the evidence-based use of antibiotics" and "adheres to nationally recognized guidelines, as well as best practices." California Health and Safety Code §1288.85 (SB 1311) requires general acute care hospitals to adopt an antimicrobial stewardship policy "in accordance with guidelines established by the federal government and professional organizations." CMS's surveyor guidance names the CDC Core Elements of Hospital Antibiotic Stewardship as an example of such guidelines. CDC lists "Requiring an indication for antibiotic prescriptions" as a stewardship intervention, and its assessment tool asks whether the hospital requires prescribers to document "a dose, duration and indication for all antibiotic prescriptions."
>
> **What is law and what is our policy.** No federal or California law requires an indication on each antibiotic order. The Joint Commission leaves "when indication for use is required on a medication order" to each hospital's policy. Requiring a confirmed, coded indication on every antibiotic order, and showing it to the nurse before each dose, is this hospital's stewardship policy. It is modeled on the CDC recommendation and adopted to meet the stewardship-program laws above. It is a hypothetical policy for this demo. (Showing the indication to the nurse at administration is our own addition; we found no source that requires it.)

Short version for a slide:

> "Release v2: antibiotic orders now carry a confirmed indication, and nurses see it before each dose. Stewardship programs are required by federal and California law; the per-order indication is our hospital's policy, modeled on CDC guidance."

Do **not** say "the law requires an indication for every antibiotic." It does not.

### 5.2 Release v1.1: "Prior-authorization status"

> **Why this release exists.** Under CMS's Interoperability and Prior Authorization final rule (CMS-0057-F, 2024), Medicare Advantage plans, state Medicaid and CHIP fee-for-service programs, Medicaid and CHIP managed care plans, and Marketplace (FFE) plans must offer a prior-authorization API starting in 2027 (January 1, 2027 for MA and state fee-for-service programs; the first rating period or plan year on or after that date for the others). ONC added matching certification criteria for EHRs (45 CFR 170.315(g)(31)–(33), HTI-4, 2025). CMS rewards hospitals that send at least one prior-authorization request through such an API (a bonus measure in CY 2027).
>
> **Scope.** The 2024 rule covers medical items and services, such as imaging. It does **not** cover drugs. A proposed rule (CMS-0062-P, April 2026) would extend electronic prior authorization to drugs; it is not final. So the panel for imaging follows a final rule, and the panel for specialty medications anticipates a proposed one.
>
> **What the release changes.** The panel is optional. It adds no required entry or review, so every certified screen stays certified.

Short version for a slide:

> "Release v1.1: a prior-auth status panel in the order composer. Payers must offer prior-auth APIs from January 2027 under CMS's 2024 rule (imaging and other services; drugs are only in a proposed rule). The feature is optional, so nothing anyone customized breaks."

Correction to BRIEF 9b: "requires payer prior-auth APIs from January 2027" is right for items and services, but add "(not drugs)" next to "specialty meds."

---

## 6. What we could not verify

- **CA legislature website** (leginfo.legislature.ca.gov) blocks automated access. We read the **official** California Legislature bulk database instead (`downloads.leginfo.legislature.ca.gov/pubinfo_2025.zip`, law table updated 2026-09-26), so the California statute quotes are from the official text. The links in the tables point to leginfo for readers.
- **CCR Title 22** (Westlaw's official site) blocked us. We read the text on Cornell LII, which republishes the CCR. Confidence HIGH for wording, but check the currency on Westlaw before citing. LII lists **§70217 (nurse staffing) as "[Repealed]"**; we did not confirm that, and in any case §70217 is about staffing ratios, not medication administration. The medication administration rules are §70263(g) and §70749(a)(6)(C).
- **CDPH AFL 14-36**: cdph.ca.gov served a broken certificate chain; we used the search-engine copy. MEDIUM.
- **TJC pain reassessment (PC.01.02.07)**: jointcommission.org blocked the PDF; wording from secondary summaries; its 2026 ID was not checked. MEDIUM.
- **TJC MM.14.01.01 and MM.18.01.01 (2026)**: read in the July 2025 prepublication text; the final manual is paywalled. The NPG chapter itself was read in its published "Effective January 2026" form. jointcommission.org pages were read through official PDFs and archived copies because the live site blocks automated access.
- **ISMP**: ismp.org redirects to ECRI and blocked automated access; the High-Alert list, the 2019 double-check article, and the 2026–2027 TMSBP were read as official PDFs or archived official pages.
- **Phansalkar 2012**: that ONC sponsored the high-priority interaction list is not stated in the abstract. UNVERIFIED.
- **SAFER Guides in CY 2027**: the FY 2027 IPPS final rule (91 FR 49570) does not mention the SAFER Guides measure, so the CY 2026 policy appears unchanged; an OMB supporting statement for that rule still lists the measure. MEDIUM.
- **Study numbers** in 3.8 come from PubMed abstracts, not full texts.
- **Injection site** as a required vaccine record field: not in the statute; CDC guidance not checked here. UNVERIFIED.
- **Depression screening in rooming (W1)**: no law found; it is a USPSTF recommendation and a quality measure (not checked here). Treat as OUR DESIGN CHOICE for realism.
- **FDA barcode rule amendment** (91 FR 10770, 2026-03-05) to 21 CFR 201.25: not reviewed.

---

## 7. Sources (as read on 2026-10-31)

Federal (eCFR point-in-time API, Title 42 as of 2026-10-13, Titles 21 and 45 as of 2026-10-29; Federal Register full text):
- 42 CFR 482.13, 482.23, 482.24, 482.25, 482.42, 482.43, 482.51: https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-G/part-482
- 42 CFR 493.1291 (CLIA test report): https://www.ecfr.gov/current/title-42/section-493.1291
- 42 CFR 495.24 (Promoting Interoperability; PDMP query, SAFER Guides measures): https://www.ecfr.gov/current/title-42/section-495.24
- 45 CFR 170.315: https://www.ecfr.gov/current/title-45/section-170.315
- 21 CFR 1311.140, 1306.12, 201.25: https://www.ecfr.gov/current/title-21/section-1311.140, https://www.ecfr.gov/current/title-21/section-1306.12, https://www.ecfr.gov/current/title-21/section-201.25
- 42 U.S.C. §300aa-25, §300aa-26: https://www.law.cornell.edu/uscode/text/42/300aa-25, https://www.law.cornell.edu/uscode/text/42/300aa-26
- HTI-1 final rule, 89 FR 1192: https://www.federalregister.gov/documents/2024/01/09/2023-28857
- HTI-5 proposed rule, 90 FR 60970: https://www.federalregister.gov/documents/2025/12/29/2025-23896
- HTI-5 final rule, 91 FR 67916: https://www.federalregister.gov/documents/2026/10/28/2026-21943
- CMS-0057-F, 89 FR 8758: https://www.federalregister.gov/documents/2024/02/08/2024-00895 ; CMS overview: https://www.cms.gov/priorities/burden-reduction/overview/interoperability/policies-regulations/cms-interoperability-prior-authorization-final-rule-cms-0057-f
- FY 2026 IPPS/LTCH final rule (includes HTI-4), 90 FR 36536: https://www.federalregister.gov/documents/2025/08/04/2025-14681
- FY 2027 IPPS/LTCH final rule, 91 FR 49570: https://www.federalregister.gov/documents/2026/08/04/2026-15833
- CMS-0062-P (prior authorization for drugs, proposed), 91 FR 19890: https://www.federalregister.gov/documents/2026/04/14/2026-07205
- CMS QSO-25-24-Hospitals (SOM Appendix A revisions, A-0764): https://www.cms.gov/files/document/qso-25-24-hospitals.pdf

California statutes (official text from the Legislature's bulk database; reader links to leginfo):
- H&S §11165.4: https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=11165.4
- H&S §1288.8, §1288.85: https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=1288.85
- H&S §1262.5: https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=1262.5
- H&S §1279.1, §1339.63, §120440, §123100: same URL pattern with `sectionNum=`
- B&P §688, §741, §4040, §4076, §4118.5: https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=688 (same pattern)
- Civil Code §56.10: https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=56.10
- CDPH AFL 14-36: https://www.cdph.ca.gov/Programs/CHCQ/LCP/Pages/AFL-14-36.aspx

California regulations (22 CCR, via Cornell LII): §70215, §70223, §70263, §70707, §70749, §70751: https://www.law.cornell.edu/regulations/california/22-CCR-70263 (same pattern).

Standards and evidence:
- TJC National Performance Goals (hospital), effective 2026-01-01: https://www.jointcommission.org/en-us/standards/national-performance-goals ; chapter PDF: https://digitalassets.jointcommission.org/api/public/content/9ca80055182b4274842a5780a94f2c82?v=149a13a9 ; disposition report (old to new IDs): https://digitalassets.jointcommission.org/api/public/content/c583e3d14bb249e4accd13291c716557?v=b5a45191 ; prepublication requirements (MM chapter): https://digitalassets.jointcommission.org/api/public/content/6af7e77646254ef89894bdb37ad730c7?v=a64da4ab
- ISMP High-Alert Medications in Acute Care Settings (2024): https://www.ismp.org/system/files/resources/2024-01/ISMP_HighAlert_AcuteCare_List_010924_MS5760.pdf
- ISMP, Independent double checks (2019): https://www.ismp.org/resources/independent-double-checks-worth-effort-if-used-judiciously-and-properly
- ISMP Targeted Medication Safety Best Practices for Hospitals 2026–2027: https://online.ecri.org/hubfs/ISMP/Resources/ISMP_TargetedMedicationSafetyBestPractices_Hospitals.pdf
- CDC Core Elements of Hospital Antibiotic Stewardship Programs (2019): https://www.cdc.gov/antibiotic-use/media/pdfs/hospital-core-elements-508.pdf
- CDC Core Elements of Outpatient Antibiotic Stewardship: https://www.cdc.gov/antibiotic-use/media/pdfs/Core-Elements-Outpatient-508.pdf
- SAFER Guides (2025): https://healthit.gov/clinical-quality-and-safety/safer-guides/
- Pennsylvania Patient Safety Authority advisories on weight: https://patientsafety.pa.gov/ADVISORIES/Pages/200903_10.aspx , https://patientsafety.pa.gov/ADVISORIES/Pages/201606_50.aspx
- Studies: PubMed IDs 16357358, 24166725, 29766382, 32706721, 28395667, 18952941, 22539083, 23011124, 22753810, 25534652, 31087021 (https://pubmed.ncbi.nlm.nih.gov/<PMID>/).

## Round 2 candidate rules

Research date: **2026-10-31**, after merging `origin/main`. Read against BRIEF §§5, 5a, 6, 7.5, 9a/9b and the now-present `lean/Ehr/Specs/V1.lean`. These are **proposals for owner review**, not implemented requirements. They add to, rather than re-propose, the approved CURES, naloxone, controlled-prescription display, Schedule II refill, and vaccine-record rules. Some develop round-1 candidates into implementable contracts.

**Authority and verification.** Federal CoPs below bind participating hospitals, not every outpatient practice. California hospital rules apply to the licensed facility/service they specify; W1/W5/W7 clinic applicability is stated separately. Accreditation requirements bind accredited organizations. Guidance is not law. eCFR displayed currency through 2026-10-29. Leginfo reader pages blocked automated access, so California statutes were read from the Legislature's [official bulk database](https://downloads.leginfo.legislature.ca.gov/pubinfo_2025.zip), `LAW_SECTION_TBL.dat` and its referenced LOB files; relevant HSC rows carry 2026-10-03 update timestamps, Family Code rows 2026-09-26. These timestamps are database metadata, not enactment dates. Reader links below point to the individual statutes. CCR wording was read on Cornell LII, a **quarterly updated mirror without a displayed through-date**; the official Westlaw text's currency remains unconfirmed. Accordingly CCR-dependent conclusions are MEDIUM overall, even where wording is clear. TJC sources are its public 2026 hospital chapter, crosswalk, and current official FAQ.

**Encoding caveat discovered in V1.** The language has `EntryReq`, `ReviewReq` (`shownOnCommit`, `shownOrReceipt`, `waivedBy?`), `humanOnly`, three alert tiers, and `DesignRules`. However, `ValueKind.coded "set-name"` currently accepts **any nonempty code** (`Core/Basics.lean:valueAccepted`); it does not enforce membership. Text can also be empty. New allowed-value lists below therefore need a **finite-set/nonempty validator** before they can be claimed as checked. `When` has only `always`, order/medication class, high-alert, abnormal-result, and naloxone-risk cases; new predicates are core changes. Receipt age measures a **review**, not the age of an examination, consent, or order. Future deadlines, external delivery, signatures, and real bedside actions need their own evidence. Every proposed ID not explicitly called “existing” is new content. Adding a spec element/info/commit alone is not a new core-language feature.

**Ranking method.** Rank balances demo value first, directness of authority second, then implementation cost; it is a judgment, not a legal risk score. Value: H/M. Authority: **B** binding law/regulation, **A** accreditation, **G** guidance. Cost: **L** fields/reviews in existing paths; **M** a predicate, validator, timestamp, or integration; **H** a new workflow, durable obligation, access-control model, or authentication service. Costs include faithful enforcement; a checkbox-only mock is cheaper but proves less.

| Rank / ID | Candidate | Value | Authority | Cost |
|---|---|---|---|---|
| 1 / R2-01 | Pre-op interval H&P age | H | B | M |
| 2 / R2-02 | Operative technique and tissue record | H | B | L–M |
| 3 / R2-03 | Discharge information delivered to follow-up clinician | H | B | M |
| 4 / R2-04 | Family caregiver designation and notification attempt | H | B | M |
| 5 / R2-05 | RN assessment for each shift and transfer | H | B | M |
| 6 / R2-06 | Automatic medication stop policy | H | B | M |
| 7 / R2-07 | Verbal medication order countersign within 48 hours | H | B | M–H |
| 8 / R2-08 | Sensitive-result electronic-release guard | H | B | M–H |
| 9 / R2-09 | Housing inquiry and homeless discharge checklist | H | B | M |
| 10 / R2-10 | Safe medication abbreviations and decimal formatting | H | A + G | M |
| 11 / R2-11 | Critical-result reporting deadline and escalation | H | A | M–H |
| 12 / R2-12 | Perioperative oral-anticoagulant plan | H | A | M |
| 13 / R2-13 | Structured allergy capture | H | G | M |
| 14 / R2-14 | Look-alike/sound-alike ordering precautions | H | A | M |
| 15 / R2-15 | Surgical time-out at procedure start | H | A | H |
| 16 / R2-16 | Opioid benefit/risk review at 50 MME/day | H | G | M |
| 17 / R2-17 | Primary language/dialect and interpreter access | M | B | M |
| 18 / R2-18 | POLST reconciliation | M | B | M–H |
| 19 / R2-19 | Restraint/seclusion orders, renewal, assessment | M | B | H |
| 20 / R2-20 | Transfusion information, consent and verification | M | B + local policy | H |
| 21 / R2-21 | Patient-owned/self-administered medications | M | B | H |
| 22 / R2-22 | Identity-proofed EPCS signing with two factors | M | B | H |
| 23 / R2-23 | Minor consent and protected proxy access | M | B | H |
| 24 / R2-24 | Sterilization-specific consent and waiting period | M | B | H |
| 25 / R2-25 | Patient records request deadlines | M | B | H |

### R2-01 — Pre-op interval H&P age

- **Citation/type/quote:** California **regulation**, [22 CCR §70223(d)(1), (e)](https://www.law.cornell.edu/regulations/california/22-CCR-70223): “performed and recorded within the previous 24 hours.” Federal **regulation**, [42 CFR §482.51(b)(1)](https://www.ecfr.gov/current/title-42/section-482.51), separately addresses the original H&P, update, emergencies, and qualifying outpatient assessments.
- **Workflow/persona:** W6 pre-op; P5 general surgeon. The California verification duty names the anesthesia provider, or surgeon when no general anesthetic is administered; an EHR surgeon checkbox cannot discharge someone else's duty.
- **Proposed rule/encoding:** Before `signPreOpOrders`, show new `preOpExamRecord` and require existing `hpUpdate` plus human-only `intervalExamVerified` (flag **true**, `never`). Verify the interval examination itself was performed/documented within 1,440 minutes of procedure start. Emergency exception: human-entered `preOpEmergencyReason`, not an automatic waiver. **Entry + no-receipt review + human-only**. Gating order signing is a stricter local proxy for the legal pre-surgery gate.
- **New core feature:** **Yes:** examination timestamps and procedure-start event, freshness predicate and scoped emergency waiver. A fresh review receipt of an old H&P is insufficient.
- **Confidence:** **MEDIUM** (CCR currency caveat); federal wording HIGH. **Cost M.**

### R2-02 — Operative technique and tissue record

- **Citation/type/quote:** Federal **regulation**, [42 CFR §482.51(b)(6)](https://www.ecfr.gov/current/title-42/section-482.51): “written or dictated immediately following surgery and signed by the surgeon.” California **regulation**, [22 CCR §70749(a)(12)](https://www.law.cornell.edu/regulations/california/22-CCR-70749), also specifies technique and tissue removed/altered.
- **Workflow/persona:** W6 op note; P5 general surgeon.
- **Proposed rule/encoding:** Add `opTechnique` and `opTissueRemovedAltered` to `signOpNote` entries beside existing `opFindings`/`opSpecimens`. **Entry:** nonempty technique narrative; tissue narrative or explicit “none”; `defaultConfirm` permitted from a procedure template, with surgeon confirmation. Show existing `intraopRecord`. `opSpecimens` alone does not describe altered tissue or operative technique. Record report creation/dictation immediately after surgery and preserve human-only surgeon signing.
- **New core feature:** **Yes** for nonempty validation and proving timing against surgery completion; **no** for adding the two fields/review. “Immediately” is not a federally specified number of minutes; any numerical deadline is local policy. Do not equate a brief note with a complete dictated report unless all required content is present.
- **Confidence:** **HIGH** federal; MEDIUM additional CCR. **Cost L fields, M timing.**

### R2-03 — Discharge handoff actually delivered

- **Citation/type/quote:** Federal **regulation**, [42 CFR §482.43(b)](https://www.ecfr.gov/current/title-42/section-482.43): “at the time of discharge.” California **law**, [H&S §1262.5(f)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=1262.5), adds a physician-signed transfer summary and patient/representative copy for specified nursing-facility transfers.
- **Workflow/persona:** W6 discharge and W3 transfer; P5 surgeon/P2 ED physician, with P1 PCP receiving follow-up information.
- **Proposed rule/encoding:** On `discharge` (and transfer `disposition`), show `transitionPacket`: illness/treatment course, current reconciled meds, allergies, goals/preferences, and follow-up plan. Require `handoffRecipient` (verified clinician/facility destination; `recordConfirm`) and `handoffDelivery` (sent receipt or documented non-electronic delivery; `never` human attestation for the latter). Include the additional California summary fields and signature when applicable. **Review + entry**, with delivery evidence by discharge. A displayed summary is not transmission.
- **New core feature:** **Yes:** transfer condition, delivery outcome and recipient binding, and atomic commit/side-effect evidence. Existing `currentMeds` and discharge fields supply content but no transmission proof. No universal “patient refused” waiver is supplied by §482.43(b).
- **Confidence:** **HIGH. Cost M.**

### R2-04 — Family caregiver designation and attempted notification

- **Citation/type/quote:** California **law**, [H&S §1262.5(c)–(e), (k)–(m)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=1262.5): “opportunity to identify one family caregiver”.
- **Workflow/persona:** W3 inpatient admission, W4 discharge teaching, W6 discharge; P2 ED physician, P3 RN, P5 surgeon.
- **Proposed rule/encoding:** At admission, require `caregiverDesignation` (**named / declined / temporarily incapacitated**, `never`, human-only), with name/contact if named. Carry the documented choice forward with `recordConfirm`. At `discharge`, require `caregiverNotification` (**notified / attempted-unreachable / no-designation / incapacity-process-documented**, `never`) and show the discharge teaching plan. Notify as soon as possible and no later than issuance of the discharge order; log attempts. The law expressly allows an appropriate discharge when contact fails, and preserves privacy/consent restrictions.
- **New core feature:** **Yes:** admission trigger and incapacity follow-up, conditional required fields, finite sets, notification timing. **Entry + review + human-only**; failed contact must not become a hard stop requiring successful contact.
- **Confidence:** **HIGH. Cost M.**

### R2-05 — RN assessment for each shift and transfer

- **Citation/type/quote:** California **regulation**, [22 CCR §70215(a)(1), (d)](https://www.law.cornell.edu/regulations/california/22-CCR-70215): “for each shift, and upon receipt of the patient”.
- **Workflow/persona:** W4 shift assessment and arrival from W3/W6; P3 inpatient RN.
- **Proposed rule/encoding:** Require existing `chartAssessment`/`nursingAssessment` for each patient-shift and on transfer arrival, with human-only `assessmentPerformed` (flag **true**, `never`); narrative may use `defaultConfirm`, but must describe current findings. Show new `lastAssessment` with actual assessment time and encounter/unit. A prior-unit receipt does not fulfill the new receiving-unit assessment. Do not make an overdue assessment prevent urgently needed medication administration.
- **New core feature:** **Yes:** shift/transfer-triggered outstanding obligations, rather than only preconditions on a commit the user might never perform. Existing `chartAssessment` entries alone prove neither frequency nor completion for all assigned patients. **Entry + human-only**, with a **passive** overdue worklist indicator (tier is local design).
- **Confidence:** **MEDIUM** (CCR mirror). **Cost M.**

### R2-06 — Automatic medication stop policy

- **Citation/type/quote:** Federal **regulation**, [42 CFR §482.25(b)(5)](https://www.ecfr.gov/current/title-42/section-482.25): “must automatically be stopped after a reasonable time”. California **regulation**, [22 CCR §70263(j)](https://www.law.cornell.edu/regulations/california/22-CCR-70263), requires hospital duration-limitation policies.
- **Workflow/persona:** W3 inpatient orders, W4 MAR, W6 post-op orders; P2 physician, P3 RN, P5 surgeon.
- **Proposed rule/encoding:** For hospital drugs/biologicals without a specified time/number of doses, derive `effectiveStopAt` from the approved medical-staff policy for the drug/class; show it in `orderSummary` and `marDoseDetails`. Existing `duration` may use `defaultConfirm`; allowed values become a positive time/dose count or a policy-linked stop rule, not an unconstrained “ongoing” bypass. At `administerMed`, an expired order cannot authorize a new dose; require a new authorized order. **Entry + review + design/commit guard.**
- **New core feature:** **Yes:** policy lookup, stop timestamp/dose-count semantics and expiry validation. A required duration textbox is not automatic discontinuation. The hospital sets the interval; the cited law does not impose a universal antibiotic duration.
- **Confidence:** **HIGH** federal; MEDIUM CCR support. **Cost M.**

### R2-07 — Verbal medication order countersign deadline

- **Citation/type/quote:** California **regulation**, [22 CCR §70263(g)](https://www.law.cornell.edu/regulations/california/22-CCR-70263): “The prescriber or furnisher shall countersign the order within 48 hours.” Federal **regulations**, [42 CFR §482.24(c)(2)](https://www.ecfr.gov/current/title-42/section-482.24) and [§482.23(c)(3)](https://www.ecfr.gov/current/title-42/section-482.23), require prompt authentication and restrict use/acceptance of verbal orders.
- **Workflow/persona:** W3 ED, W4 MAR, W6 post-op; P2/P5 prescribers, P3 receiving RN.
- **Proposed rule/encoding:** New `recordVerbalOrder` captures `verbalPrescriber` (authorized identity), receiver identity/signature, and actual received date/time; all `never` for the human action, with system identity/time linked as provenance. New human-only `countersignVerbalOrder` requires the named authorized prescriber/furnisher, deadline **2,880 minutes after receipt**. Show order details while countersigning. Flag overdue orders **interruptively** in the authentication work queue; any administration restriction requires clinical/local policy, not an invented legal ban on all care.
- **New core feature:** **Yes:** order provenance, authorized identity binding, future deadlines and work-queue escalation. **Entry + review + human-only + alert**. Existing `signOrders` does not represent accepting a verbal order or later countersigning it.
- **Confidence:** **MEDIUM** (California deadline from CCR mirror); federal HIGH. **Cost M–H.**

### R2-08 — Sensitive-result electronic-release guard

- **Citation/type/quote:** California **law**, [H&S §123148(f), (k)–(l)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=123148): “has first discussed in person, by telephone, or by any other means of oral communication”.
- **Workflow/persona:** W2 results and W6 follow-up results; P1 PCP/P5 surgeon (P4 NP when applicable).
- **Proposed rule/encoding:** For §123148(f) results, before new `releaseResultElectronic`, require human-only `patientRequestedElectronic`, `clinicianApprovedElectronic`, and `oralDiscussionCompleted` (each **true**, `never`), and show existing `resultDetail`. Covered categories are positive HIV, hepatitis-infection antigens, drug-abuse results, and specified tissue/imaging results revealing new/recurrent malignancy; not all negative HIV tests or all hepatitis-related labs. Encode the specific anonymous-HIV and previously-informed HIV exceptions as separate documented branches, not a generic waiver. **Entry + review + human-only**.
- **New core feature:** **Yes:** result-category/exception predicates and a separate release commit; `ackResult`/`patientMessage` is not necessarily portal publication. Record discussion participant/time. Consider applicable federal access/privacy rules when implementing; do not impose a blanket delay on every result.
- **Confidence:** **HIGH. Cost M–H.** **Correction to round-1 C14:** the ordinary exception is conjunctive (request **and** appropriateness **and** oral discussion), not “discussion or request.”

### R2-09 — Housing inquiry and homeless discharge checklist

- **Citation/type/quote:** California **law**, [H&S §1262.5(n)–(q), (u)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=1262.5): “inquire about a patient’s housing status”.
- **Workflow/persona:** W3 ED discharge and W6 inpatient discharge; P2 ED physician/P5 surgeon, P3 RN assisting.
- **Proposed rule/encoding:** Require `housingInquiry` (**housed / homeless / asked-unable-to-determine**, `never`), without using housing status to deny care. For identified homeless patients, require `homelessDischargeChecklist` before `disposition` discharge/`discharge`: physician stability and medical/behavioral evaluation, communicated needs, meal offer, clothing if inadequate, indicated follow-up/prescription and available onsite-pharmacy supply, infectious screening offer/referral, indicated vaccine offer, insurance assistance, destination, and transport offer within the statute's 30-minute/30-mile criteria. Each applicable item records **completed/offered-declined/statutory-inapplicability**, with explanation; no blanket “N/A”. **Conditional entry + human-only physician stability confirmation**.
- **New core feature:** **Yes:** housing/discharge predicates, conditional checklist validation and destination/log persistence. No requirement to accept a meal, shelter, vaccine or transport. Record the §1262.5(q) log; observe the state-hospital exclusion.
- **Confidence:** **HIGH. Cost M.**

### R2-10 — Safe medication abbreviations and decimals

- **Citation/type/quote:** **Accreditation**, TJC [official terminology FAQ, updated April 21, 2026](https://www.jointcommission.org/en-us/knowledge-library/support-center/standards-interpretation/standards-faqs/000001229): “The prohibited list applies to all orders, preprinted forms, and medication-related documentation.” **Guidance**, [ISMP error-prone abbreviations list (2024), pp. 1–5](https://www.ismp.org/system/files/resources/2024-04/ISMP_ErrorProneAbbreviation_List.pdf): “They should NOT be used when communicating medical information”.
- **Workflow/persona:** W1/W3/W5/W6/W7 order fields and labels, W4 MAR; all five personas.
- **Proposed rule/encoding:** **Design rule:** generated/customizable medication labels, instructions, defaults and macro expansions use “units”, “daily”, “every other day”, a leading zero below 1, and no medication trailing zero. Reject medication tokens `U`, `IU`, `QD` (including case/punctuation variants), `QOD`, `MS`, `MSO4`, `MgSO4`; render `0.5 mg`, never `.5 mg` or `5.0 mg`. Apply the same validator to human text entries; prefill policies remain unchanged. Do not ban a letter inside an unrelated word or strip clinically significant precision from lab results. The TJC FAQ permits certain uneditable vendor/manufacturer content; this proposed rule is deliberately stricter for our generated content.
- **New core feature:** **Yes:** context-sensitive lexical/decimal validation in the checker and render semantics; existing `DesignRules` has no text-safety field. **Confidence HIGH. Cost M.**

### R2-11 — Critical-result reporting deadline and escalation

- **Citation/type/quote:** **Accreditation**, [2026 hospital NPG.01.02.01, EPs 1–2, p. 1](https://digitalassets.jointcommission.org/api/public/content/9ca80055182b4274842a5780a94f2c82?v=149a13a9): “on a timely basis”. This is the successor to NPSG.02.03.01.
- **Workflow/persona:** W2 in-basket, W3 ED, W4 inpatient, W6 post-op results; P1/P2/P5 physicians and P3 RN under the reporting policy.
- **Proposed rule/encoding:** When a result meets the hospital's critical definition, show `criticalResultDeadline`/`resultDetail`, require `criticalResultReportedTo` (authorized recipient identity) and `criticalResultReportedAt` (actual report time; `never` human attestation or authenticated delivery evidence) before `ackResult` can mark it fully resolved. Receipt of review alone does not prove reporting. An outstanding report raises an **interruptive** alert/escalation to the responsible clinician when the local deadline is reached; do not wait for someone to open the item. Document failed contacts and escalate rather than marking done. **Entry + review + alert.**
- **New core feature:** **Yes:** `criticalResult` distinct from `abnormalResult`, policy duration, time-triggered obligations/escalation and recipient evidence. There is **no universal TJC 30- or 60-minute limit** in this standard.
- **Confidence:** **HIGH. Cost M–H.**

### R2-12 — Perioperative oral-anticoagulant plan

- **Citation/type/quote:** **Accreditation**, [2026 hospital NPG.14.04.01 EP 2, p. 44](https://digitalassets.jointcommission.org/api/public/content/9ca80055182b4274842a5780a94f2c82?v=149a13a9): “perioperative management”. **Numbering correction:** NPSG.03.05.01 is the old identifier; it is not NPG.03.05.01 in the verified 2026 hospital chapter.
- **Workflow/persona:** W6 pre/post-op; P5 surgeon; P3 RN executes resulting orders.
- **Proposed rule/encoding:** When the patient takes an oral anticoagulant in scope, retain existing no-receipt `anticoagulantList` review before `signPreOpOrders`; add `periopAnticoagPlan` (**continue / hold / bridge / restart plan**, `defaultConfirm` from an approved protocol, human confirms) with timing/dose details as applicable. Show the protocol and plan again with post-op `signOrders`. The standard requires approved protocols; displaying a list alone does not establish compliance. Routine short-term VTE prophylaxis is explicitly excluded from this standard's scope.
- **New core feature:** **Yes:** patient-active-medication/perioperative predicate and finite-set/conditional detail validation; **no** for the added information panel. **Entry + review**. Exact hold/restart days must come from approved clinical protocols, not this standard.
- **Confidence:** **HIGH. Cost M.**

### R2-13 — Structured allergy capture

- **Citation/type/quote:** Federal **guidance**, [ASTP/ONC 2025 SAFER CPOE Guide, RP 1.2, pp. 10–11](https://healthit.gov/wp-content/uploads/2025/06/SAFER-Guide-3.-CPOE-Final.pdf): “entered and updated as structured data before order entry”. The 2025 guide file carries August 2024 worksheet footers; identify the edition by the official 2025 collection.
- **Workflow/persona:** W1/W3/W5 rooming/order entry, W4 administration, W7 refills; all five personas.
- **Proposed rule/encoding:** Add `allergyStatus` (**known allergies / no known allergies / unknown**, `recordConfirm`), with coded allergen, reaction, type and severity for known allergies. No default “no known allergies”; exceptional unavailable codes need explanatory text and review. Preserve existing `allergyList` reviews and invalidate its receipts when allergy content changes. **Entry/design rule:** static checks ensure the structured controls and value sets exist; record validation establishes patient-specific completeness. “Unknown” remains visible, rather than silently treated as no allergy.
- **New core feature:** **Yes:** repeating allergy-entry rows, finite vocabularies, conditional completeness, and an allergy update/write action. Existing order-line repetition does not cover arbitrary AllergyIntolerance rows. This guidance does not itself impose a legal hard stop on all emergency prescribing.
- **Confidence:** **HIGH. Cost M.**

### R2-14 — Look-alike/sound-alike ordering precautions

- **Citation/type/quote:** **Accreditation**, [2026 hospital crosswalk, MM.14.01.01 EP 3, p. 117](https://digitalassets.jointcommission.org/api/public/content/dda827b4b4904f52a53f48f102e1ca20?v=aecef335): “Precautions for ordering medications with look-alike or sound-alike names”. This is a medication-management standard, not a newly invented NPG number.
- **Workflow/persona:** W1/W3/W5/W6/W7 medication selection; P1/P2/P4/P5, with P3 seeing MAR distinctions.
- **Proposed rule/encoding:** For the hospital's maintained LASA pairs, **design rule** requires approved distinguishing text in search choices, `orderSummary`, and `marDoseDetails`: full drug name, strength/form, and relevant distinguishing attributes; apply approved Tall Man spelling where the hospital selects it. No ambiguous truncated choices. Optionally a **passive** inline LASA notice. Keep existing `drug` prefill `defaultConfirm`; this proposal adds no automatic substitute and no universal popup.
- **New core feature:** **Yes:** LASA-pair metadata and static label/choice validation; new `AlertCond` only if an alert is used. The exact label format/Tall Man technique is our chosen implementation of the required hospital precautions, not mandated wording.
- **Confidence:** **HIGH** for the official public crosswalk; exact local precaution remains a policy choice. **Cost M.**

### R2-15 — Surgical time-out at procedure start

- **Citation/type/quote:** **Accreditation**, [2026 hospital NPG.01.06.01–.03, especially .03 EPs 1–5, pp. 5–6](https://digitalassets.jointcommission.org/api/public/content/9ca80055182b4274842a5780a94f2c82?v=149a13a9): “immediately before starting the invasive procedure”. Former Universal Protocol UP.01.03.01 maps to NPG.01.06.03.
- **Workflow/persona:** W6 OR boundary; P5 surgeon and the immediate procedure team. This boundary is not currently a V1 commit.
- **Proposed rule/encoding:** New `startProcedure` requires human-only `timeOutCompleted` (**true**, `never`), identifying patient, procedure/site, team participants and actual completion time; show the verified procedure/consent/site record. Capture the team's agreement and documentation; repeat before another procedure if the performer changes as specified. **Human-only entry + no-receipt review**. A surgeon ticking a box at pre-op order signing or afterwards at `signOpNote` does not prove the team time-out happened at incision.
- **New core feature:** **Yes:** procedure-start event, procedure/team identity, temporal order and re-performance on changed procedure/performer. Offline checking can preserve the human step but cannot observe the team's physical discussion.
- **Confidence:** **HIGH. Cost H** (new clinical boundary).

### R2-16 — Opioid benefit/risk review at 50 MME/day

- **Citation/type/quote:** Federal **guidance**, [CDC opioid guideline 2022, Recommendation 4](https://www.cdc.gov/mmwr/volumes/71/rr/rr7103a1.htm): “pause and carefully reassess evidence of individual benefits and risks”. California **guidance**, [Medical Board pain guidelines, July 2023, pp. 9–11](https://www.mbc.ca.gov/Download/Publications/pain-guidelines.pdf): “Use of a pain management agreement is strongly recommended”.
- **Workflow/persona:** W1/W7 adult outpatient opioids and qualifying W6 discharge prescriptions; P1 PCP/P5 surgeon. CDC scope is adults ≥18 in outpatient care; exclusions include sickle-cell disease, cancer-related pain, palliative and end-of-life care. Do not apply automatically to pediatric dosing or inpatient MAR.
- **Proposed rule/encoding:** On a proposed increase to total **≥50 MME/day**, show new `opioidBenefitRisk` (all-source MME, benefits, harms, follow-up plan) before `signOrders`/`approveRefill`; human-only `opioidReassessment` (**continue-with-rationale / revise-plan**, `never`). **Review + entry**, optionally **passive** guidepost reminder. Surface pain-agreement status for chronic therapy; MBC recommends agreements for expected >3 months or chronic-pain opioid trials. This is additional to the approved CA naloxone rule, with a different threshold and source.
- **New core feature:** **Yes:** summed MME, dose-change and scope predicates, uncertainty handling and finite decisions. Never encode 50 MME as an absolute prescribing ceiling, forced taper, or automatic denial.
- **Confidence:** **HIGH. Cost M.**

### R2-17 — Primary language/dialect and interpreter access

- **Citation/type/quote:** California **law**, [H&S §1259(c)(2), (4)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=1259): “Identify and record a patient’s primary language and dialect”.
- **Workflow/persona:** Hospital W3/W4/W6; P2 ED physician, P3 RN, P5 surgeon. Extension to community W1/W5 is local policy under this citation, not §1259's hospital mandate.
- **Proposed rule/encoding:** Require `primaryLanguage`/`dialect` (**coded language + dialect or explicitly unknown**, `recordConfirm`), show them in existing pinned `patientBanner`, and keep interpreter access visible. When a barrier is identified at consent/discharge teaching, capture human-only `languageAssistanceUsed` (**interpreter identity/mode / qualified bilingual staff / other lawful documented path**, `never`) before finalizing that teaching/consent documentation. Preferred language alone does not prove need was assessed or assistance delivered.
- **New core feature:** **Yes:** conditional barrier predicate and value validation; **no** for a pinned language panel. **Entry + review/design rule**. §1259 has a 5% population definition for spoken-language barriers, addresses sign language, and describes hospital policy procedures “to the extent possible”; it is not an unconditional standalone per-encounter interpreter checkbox mandate. Any friend/family pathway must also satisfy applicable federal requirements, not merely this state provision.
- **Confidence:** **HIGH. Cost M.**

### R2-18 — POLST reconciliation

- **Citation/type/quote:** California **law**, [Probate Code §4781.2(a)–(e)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PROB&sectionNum=4781.2): “shall treat an individual in accordance with a Physician Orders for Life Sustaining Treatment form.” [§4780(c)–(d)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PROB&sectionNum=4780) addresses completion, signatures and revocation.
- **Workflow/persona:** W3 admit, W4 bedside, W6 perioperative/discharge; P2/P3/P5, with P1 follow-up.
- **Proposed rule/encoding:** When a POLST is present, require no-receipt `polstDocument` review before a new `signCodeStatus` commit and show the reconciled order in `patientBanner`. Human-only `polstDisposition` (**consistent / patient-requested-change / evaluated-new-order / medically-ineffective-or-contrary-to-standards**, `never`), with specific supporting documentation for changes/exceptions. Do not infer code status from age, default DNR, or automatically suspend a POLST for surgery. **Review + entry + human-only**. The statute has defined exceptions; it is not a never-change rule.
- **New core feature:** **Yes:** POLST authenticity/current-status facts, code-status write permission, revocation/change and exception predicates. A banner display alone cannot prove treatment followed the document.
- **Confidence:** **HIGH. Cost M–H.**

### R2-19 — Restraint/seclusion orders and timing

- **Citation/type/quote:** Federal **regulation**, [42 CFR §482.13(e)(5)–(16)](https://www.ecfr.gov/current/title-42/section-482.13): “must never be written as a standing order or on an as needed basis (PRN).” California **regulations**, [22 CCR §70213(c)](https://www.law.cornell.edu/regulations/california/22-CCR-70213) (competency/policies) and [§70749(a)(6)(D)](https://www.law.cornell.edu/regulations/california/22-CCR-70749) (application/removal record), add context.
- **Workflow/persona:** W3 ED/W4 inpatient; P2 physician and P3 RN.
- **Proposed rule/encoding:** New `signRestraintOrder`: require nonempty reason/less-restrictive-measure documentation (`never`), type from the approved restraint vocabulary (`defaultConfirm`), and validated start/expiry; no PRN/standing option. Category is **violent/self-destructive / nonviolent**, human-confirmed. For **violent/self-destructive** use, renewal limits: **240 min age ≥18; 120 min ages 9–17; 60 min under 9**, up to 24 hours, then practitioner sees/assesses before a new order. Face-to-face assessment due within **60 minutes** of initiation; trained-RN assessment entails practitioner consultation. End at earliest safe time. **Entry + human-only + interruptive deadline alert**; record response and actual application/removal. Assessments/renewal attestations are `never`, human-only, with affirmative completion required.
- **New core feature:** **Yes:** order category, age/time bounds, future assessment/renewal obligations and cessation. Nonviolent restraint renewal follows hospital policy; don't apply violent limits universally. More restrictive state rules prevail; do not import specialty psychiatric-facility CCR rules indiscriminately.
- **Confidence:** **HIGH** federal; MEDIUM CCR. **Cost H.**

### R2-20 — Transfusion information, consent and verification

- **Citation/type/quote:** California **law**, [H&S §1645(a)–(d)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=1645): “shall note on the patient’s medical record”. Federal **regulation**, [42 CFR §482.23(c)(4)](https://www.ecfr.gov/current/title-42/section-482.23): “approved medical staff policies and procedures”. California informed-consent right: [22 CCR §70707(b)(5)](https://www.law.cornell.edu/regulations/california/22-CCR-70707).
- **Workflow/persona:** W6 surgery and W4 transfusion administration; P5 surgeon/P3 RN, P2 in ED.
- **Proposed rule/encoding:** When the clinician determines transfusion is reasonably possible, before the procedure require `transfusionSummaryGiven` (**given / medical-contraindication / life-threatening-emergency**, `never`, human-only); document actual delivery of the state standardized summary and its version. This education record is **not itself informed consent**. At new `startTransfusion`, show the consent/order and patient/unit compatibility record; require human-only `bloodVerificationComplete` (**true**, `never`) under an approved local verification procedure, or a documented applicable emergency pathway. **Entry + review + human-only**.
- **New core feature:** **Yes:** transfusion risk/exception predicates, unit-to-patient matching and a dedicated commit/consent record. §482.23(c)(4) does **not itself prescribe two nurses or two scans**; that exact mechanism remains local policy/UNVERIFIED as a universal mandate. Existing high-alert cosign is not proof of blood compatibility.
- **Confidence:** **HIGH** statute/federal duty; MEDIUM general CCR consent grounding. **Cost H.**

### R2-21 — Patient-owned and self-administered medication

- **Citation/type/quote:** Federal **regulation**, [42 CFR §482.23(c)(6)(i)–(ii)](https://www.ecfr.gov/current/title-42/section-482.23): “Assess the capacity”. California **regulation**, [22 CCR §70263(l)–(m)](https://www.law.cornell.edu/regulations/california/22-CCR-70263), adds bedside storage restrictions and positive identification of brought-in drugs.
- **Workflow/persona:** W4 MAR and W6 inpatient orders; P3 RN/P5 surgeon, P2 admission orders.
- **Proposed rule/encoding:** Before new `authorizeSelfAdministration`, show the specific order; require human-only capacity **capable**, security **arranged**, and instruction **completed** (or assessed unnecessary where §482.23(c)(6)(ii) permits), plus identification/integrity **verified** when applicable. Failed checks route to staff administration. New `recordSelfAdministration` records actual drug/dose/time and patient/caregiver report, not an RN barcode scan falsely attributed to the patient. **Entry + review + human-only**; all assessments `never`, ongoing approved plan `recordConfirm`. For patient-owned drugs, California requires clearly labeled containers and physician/pharmacist positive identification after arrival. Bedside storage requires an order; Schedule II–IV drugs cannot be left at bedside under §70263(l).
- **New core feature:** **Yes:** medication source/self-administration predicates, separate authorizer/reporter actions, pharmacist role or externally authenticated identification evidence, and typed status validation. This is optional only if hospital policy permits it; don't silently replace the existing RN `administerMed` safeguards.
- **Confidence:** **HIGH** federal; MEDIUM California details. **Cost H.**

### R2-22 — Identity-proofed EPCS signing with two factors

- **Citation/type/quote:** Federal **regulation**, [21 CFR §1311.120(b)(5), (10)–(13)](https://www.ecfr.gov/current/title-21/chapter-II/part-1311/subpart-C/section-1311.120): “require its use for signing controlled substance prescriptions”. Credential identity proofing: [§1311.105](https://www.ecfr.gov/current/title-21/chapter-II/part-1311/subpart-C/section-1311.105); institutional route: [§1311.110](https://www.ecfr.gov/current/title-21/chapter-II/part-1311/subpart-C/section-1311.110).
- **Workflow/persona:** W1/W5/W6 discharge/W7 controlled outpatient prescriptions; P1/P2/P4/P5 when legally authorized. This is not a new two-factor duty for every inpatient MAR order.
- **Proposed rule/encoding:** Augment approved controlled-detail display with human-only `epcsAuthenticate`: actual verified two-factor success from an identity-proofed authorized prescriber, bound to the named DEA identity, patient and reviewed prescription version. Require individual readiness for each selected prescription; changes to DEA-required data invalidate readiness. Preserve the §1311.140 display through authentication. A typed user ID, second-nurse cosign or “2FA done” checkbox is not compliant authentication. **Human-only + design rule**; authentication proof is system-supplied, never a user-editable prefill.
- **New core feature:** **Yes:** trusted authentication event, identity/credential/access-control facts, version-bound signing. Identity proofing is enrollment infrastructure, not something to repeat before every prescription. A single invocation may sign multiple individually readied prescriptions for one patient under the cited conditions.
- **Confidence:** **HIGH. Cost H.**

### R2-23 — Minor consent and protected proxy access

- **Citation/type/quote:** California **law**, [Family Code §6925(a)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=FAM&sectionNum=6925): “A minor may consent to medical care related to the prevention or treatment of pregnancy.” Also [§6926(a)–(b)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=FAM&sectionNum=6926) and [H&S §123115(a)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=123115).
- **Workflow/persona:** W5 pediatric/adolescent visits, immunizations and results; P4 pediatric NP (P1/P2 if treating minors). Existing preschool fixtures do not exercise these adolescent branches.
- **Proposed rule/encoding:** Capture human-only `consentBasis` (**parent/authorized guardian / minor-6925 / minor-6926 / other-cited-authority**, `never`) tied to the service. For ≥12, §6926 permits specified reportable-disease diagnosis/treatment and STI prevention; it does not authorize every vaccine/treatment. Do not require parental approval for care the minor may lawfully consent to. Before result/AVS disclosure, show recipient/access classification and prevent automatic proxy release of protected records under §123115. **Entry + review + access design rule**. §6925 does not authorize sterilization without parental consent.
- **New core feature:** **Yes:** age/service predicates, consent capacity/authority and field/document-level proxy access controls. A hidden panel in the NP UI is not server-side access enforcement.
- **Confidence:** **HIGH. Cost H.**

### R2-24 — Sterilization-specific informed consent

- **Citation/type/quote:** California **regulation**, [22 CCR §70707.1(a)(4)](https://www.law.cornell.edu/regulations/california/22-CCR-70707.1): “At least 30 days, but not more than 180 days”. Also [§70707.3](https://www.law.cornell.edu/regulations/california/22-CCR-70707.3) (process) and [§70707.4](https://www.law.cornell.edu/regulations/california/22-CCR-70707.4) (certifications).
- **Workflow/persona:** A sterilization variant of W6; P5 surgeon. Ordinary appendectomy is not this procedure class.
- **Proposed rule/encoding:** Before new `startProcedure` for sterilization, show the required signed form and consent date; require human-only `sterilizationConsentVerified` (**true**, `never`), confirming capacity/age or qualifying status, voluntary process, oral explanation, booklet/copy, and required signatures/interpreter. Enforce **30–180 days** ordinarily; encode each §70707.1 exception separately, including its **72-hour minimum** and written/certified facts. No generic emergency bypass; consent cannot be obtained in the prohibited labor/postpartum/postabortion/intoxication circumstances. **Review + entry + human-only**.
- **New core feature:** **Yes:** procedure/eligibility predicates, interval bounds, multi-party signatures, exception certificates and consent-event states. Federal funding/Medi-Cal may add stricter eligibility; this California rule alone does not certify payer compliance.
- **Confidence:** **MEDIUM** (CCR mirror). **Cost H.**

### R2-25 — Patient records request deadlines

- **Citation/type/quote:** California **law**, [H&S §123110(a), (b), (d)–(f), (i)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=123110): “within five working days after receipt of the request”. Exceptions/representation limits: [§123115](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=123115).
- **Workflow/persona:** W2 in-basket request routing and W1/W5/W6 after-visit access; P1 PCP/P4 NP/P5 surgeon, with records staff executing fulfillment (not currently a persona).
- **Proposed rule/encoding:** New `recordRecordsRequest` captures type (**inspection / ordinary copy / qualifying free benefit-or-immigration-support copy**), request time, authorized requester, scope and format; `never` for the received request, verified identity `recordConfirm`. Display due date and fulfillment state; **passive** due-soon and **interruptive** overdue escalation in the records queue. Inspection: **5 working days**; ordinary copies: **15 days**; qualifying §123110(d)/(e) free copies: **30 days** after written request. Capture delivery/inspection evidence before new `closeRecordsRequest`. No unpaid-care-bill blocker. **Entry + review + alerts/design rule**.
- **New core feature:** **Yes:** working-day calendar, request categories, access exceptions, new task/fulfillment actions and deadline obligations. A result acknowledgment or prior-review receipt does not establish timely records access.
- **Confidence:** **HIGH. Cost H** because the records-office workflow is additional scope.

### Checks that should constrain implementation and demo claims

- **Pain management:** Existing `painScore`/`painReassessment` fit nursing assessment duties, but no verified source here requires a universal 0–10 scale or a universal 30/60-minute reassessment interval. Do not present those as law. The [Medical Board guidance](https://www.mbc.ca.gov/Download/Publications/pain-guidelines.pdf) supports individualized treatment and documented monitoring. [H&S §124961(c)–(f)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=124961) protects specified chronic-intractable-pain options, permits clinician refusal with required information, and preserves other prescribing requirements; it is not an unconditional right to an opioid dose. Official bulk text checked.
- **Weight units:** SAFER RP 2.2 discusses pediatric weight-based calculators and dose precision; the reviewed 2025 CPOE guide does not supply a metric-only-weight mandate. Keep the already researched **ISMP** grounding for kg-only weight rather than attributing it to SAFER or a statute.
- **California restraints:** [22 CCR §77103](https://www.law.cornell.edu/regulations/california/22-CCR-77103) has specialty psychiatric-health-facility requirements, including 15-minute checks and 24-hour order limits. It is not a generic ED/medical-ward rule; its scope and current official currency must be checked before adopting it for a particular facility. R2-19 uses the verified federal general-hospital limits instead.
- **“Physician's Statement”: UNVERIFIED as a uniquely identified general EHR requirement.** That label alone did not identify a single applicable California rule. Verified concrete duties include the §1645 transfusion-information chart notation (R2-20) and sterilization physician certifications in §70707.4 (R2-24). Do not invent a general form/signature mandate from the label.
- **Blood verification:** Neither §482.23(c)(4) nor the reviewed 2026 NPG patient-identification text establishes a universal two-RN blood-check rule. Specific verification mechanics are **local policy / UNVERIFIED as a universal requirement** here. Preserve the distinction between education, informed consent, compatibility verification, and administration documentation.
- **Proof boundary:** A UI contract can preserve an attestation, display, valid receipt, or authenticated event. It cannot establish that a clinician examined a patient, a team spoke, a patient understood, or external delivery succeeded without trusted evidence. Do not relabel a fresh review receipt as a fresh clinical event. No proposed change in this research edits V1, proof properties, data-format types, or the statements file.
