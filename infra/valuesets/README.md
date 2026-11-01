# Workflow reference value sets

These files are small local catalogs for app selectors and spec choices. Each JSON has `name`,
`system`, `version`, `source`, `license`, and `codes: [{ code, label, ... }]`. Codes are **strings**;
preserve leading zeros in CVX (`03`, `08`) and punctuation in ICD-10-CM. Use `system` + `code` for
FHIR Coding, and `label` for display. The catalogs are not uploaded by `make seed`.

| File | Coverage | Source and license |
|---|---|---|
| [`icd10cm.json`](icd10cm.json) | Fixture diagnoses plus outpatient, pediatric, ED, inpatient and surgical conditions; diabetes, asthma, HF, AF, CKD and appendicitis families; other common symptoms, injuries, infections, procedures' indications and follow-up codes. | [CMS ICD-10 files](https://www.cms.gov/medicare/coding-billing/icd-10-codes), FY2027; US government ICD-10-CM release, public domain. |
| [`cpt.json`](cpt.json) | Office E/M 99202–99205 and 99211–99215; ED 99281–99285; hospital admission/follow-up/discharge, same-day stays, critical care; appendix/gallbladder/hernia/colon operations; imaging, labs, pediatric visits and vaccine administration. | Numeric references from the workflow requirements and [CMS physician fee-schedule resources](https://www.cms.gov/medicare/payment/fee-schedules/physician). **All short labels are independently written for VGI; no AMA descriptors are reproduced.** CPT is proprietary AMA content; see below. |
| [`loinc.json`](loinc.json) | All 12 world lab keys, fixture report panels, common chemistry/hematology/culture/coagulation orders; CT, ultrasound, MRI and radiographs; progress, outpatient, ED, consult, surgery, nursing, discharge, consent and other note types; weight, height, BP and pain. | Official long common names retrieved from the [US NLM Clinical Table Search Service](https://clinicaltables.nlm.nih.gov/apidoc/loinc/v3/doc.html). LOINC copyright and free-use terms apply; see below. |
| [`cvx.json`](cvx.json) | Every vaccine code in `world/src/flows/peds.ts`, plus useful combination and historical formulations. | [CDC CVX table](https://www2.cdc.gov/vaccines/iis/iisstandards/vaccines.asp?rpt=cvx); CDC-authored US government data, public domain. CDC status and last-updated fields are retained. |

Snapshot retrieved **2026-10-31**. Per-file provenance is embedded in each JSON. ICD-10-CM uses the
FY2027 release effective October 1, 2026–September 30, 2027, matching the simulation's November
2026 dates. The [CMS archive](https://www.cms.gov/files/zip/2027-code-descriptions-tabular-order.zip)
SHA-256 and internal filename are recorded in `source`; labels were read directly from
`icd10cm_codes_2027.txt`, with a dot added after the third code character. The `selection` metadata
records both full families and individually selected codes, so the subset can be reconstructed.
The catalogs contain **433 ICD-10-CM**, **68 CPT**, **63 LOINC**, and **26 CVX** entries.

The Synthea Conditions are SNOMED CT coded. The ICD subset provides diagnosis choices, **not a
validated SNOMED-to-ICD mapping**. Select specificity, laterality, encounter suffix and obstetric
details using the chart; do not silently replace fixture codes. Historical social findings such as
employment or education are not necessarily diagnoses. Note sections such as HPI are distinct
from whole-document types: `workflowKey` is a convenience key, while the official LOINC label
defines the meaning. The RUQ ultrasound choice uses the broader limited-abdominal ultrasound
term. CVX status reflects the source snapshot; inactive entries support historical records and
should not be offered as a current vaccine recommendation.

## CPT license note

CPT® is copyright American Medical Association. Project-authored labels do **not** put the CPT
code set in the public domain or provide an AMA license. Use of CPT in a product, including
software or a distributed catalog, may require a separate license from AMA or an authorized
distributor. See the [AMA licensing FAQ](https://www.ama-assn.org/practice-management/cpt/cpt-licensing-frequently-asked-questions-faqs).
This file conveys no AMA rights and is not an authoritative billing catalog. Labels are brief UI
text written by this project; code definitions, current-year validity, billing rules, times and
levels must come from the applicable licensed source when used for billing.

## LOINC notice

This material contains content from LOINC (http://loinc.org). LOINC is copyright © Regenstrief
Institute, Inc. and the Logical Observation Identifiers Names and Codes (LOINC) Committee and is
available at no cost under the license at http://loinc.org/license. LOINC® is a registered United
States trademark of Regenstrief Institute, Inc.

The notice is also supplied in [`LOINC_short_license.txt`](LOINC_short_license.txt) and the JSON.
The [LOINC license](https://loinc.org/license) governs use and redistribution. Official long common
names are retained alongside their codes; project-added `category` and `workflowKey` fields do
not alter the official term. If copying these catalogs into an app distribution, carry the notice
and license link into its license/terms page.
