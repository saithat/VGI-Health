# EHR UI sources and patterns

Public manuals and safety guidance inform the patterns below. They describe
particular systems and settings; the Lean spec defines this demo's requirements.

## Evidence and reuse boundary

These are pattern observations and original VGI design decisions, not replicas. No source images, vendor assets, proprietary icons, screen text blocks, or screen compositions are incorporated. All source descriptions below are paraphrases; there are no verbatim quotations. Public access to a manual or certification report does not put its vendor screenshots in the public domain. OpenEMR's GPL does not make its code unrestricted; these pattern notes import no code. US-government-authored CPRS material is a useful public-domain reference, subject to any separately credited material.

Evidence has different strengths: a hospital training guide establishes behavior in that installation/version, not every installation; a usability report establishes tested tasks, not comparative clinical effectiveness; safety guidance supports a convention, not a new law. **Observed** below identifies source-backed behavior. **Adopt** identifies our synthesis. Pixel values and counts proposed for VGI are design targets, not vendor measurements. Existing requirements remain governed by the repository's [regulations mapping](../regulations.md), [rule catalog](../rules/catalog.md), and Lean spec.

## 1. Patient header / banner

**Observed.** PowerChart training describes a persistent banner containing demographics, encounter/location, allergies, alerts, and dosing weight; code status is directly accessible. Pharmacy training describes allergy ordering by severity and distinguishes process, disease, and isolation indicators. These sources establish content, not a universal field order or color scheme. [CST Provider View](https://cstcernerhelp.healthcarebc.ca/Patient_Chart/Workflow_Pages/Provider_View/Overview_of_Provider_View.htm), [CST pharmacy workbook, printed p.12](https://cstcernerhelp.healthcarebc.ca/Workbooks_Manuals/Workbooks/W-N1_PharmNet%20-%20Pharmacist.pdf).

**Adopt.** Keep one banner, first on every patient screen. Reading order: photo placeholder; **name → DOB → MRN → age/sex**; encounter/date and room/bed; **allergies**; code status; isolation; **weight in kg with measurement date/time**. A second compact row carries language/interpreter, PCP/attending, coverage, care gaps, and critical flags. Never use room or age as one of the two identifiers. Label sex data precisely rather than inferring it from name or appearance.

Allergy badge: `Allergies: penicillin +2` with the reaction/severity available in the full list. Use muted red for recorded allergies, amber for `Not reviewed`/`Unknown`, and neutral text for an explicit `No known drug allergies`. An empty list says `No allergy records on file`, never NKDA. The full review table shows substance, reaction, severity, clinical status, and recorded date; no badge replaces it at a commit. Code status uses explicit text, including `Not documented`; do not infer a treatment-escalation plan from a code-status badge. That distinction is explicit in [Imperial NHS CPR guidance, p.21](https://library.imperial.nhs.uk/-/media/sharedlibrary/resident-doctors-pre-assessment/study-guides/cpr-and-treatment-escalation-decisions.pdf?rev=4143dfbc536f4aad926ce5d2943cda02&sc_lang=en).

## 2. Persistent left summary / storyboard

**Observed.** Duke describes Epic's Storyboard as a role/setting-sensitive left patient summary, with activities above the workspace. Medplum documents a Patient Summary sidebar with sections such as insurance, allergies, and problems. OpenEMR organizes its patient dashboard into editable information widgets. [Duke Storyboard transition](https://dhtsws01.duhs.duke.edu/research/research-support/research-support-offices/duke-office-clinical-research-docr/get-docr-0), [Medplum Patient Profile](https://www.medplum.com/docs/provider/patient-profile), [OpenEMR v7 patient dashboard](https://www.open-emr.org/wiki/index.php/HOWTO:_Create_a_New_Patient_Record_-_OpenEMR_v7).

**Adopt.** A narrow, stable clinical rail: active problems; current meds; latest vitals with dates; last visit / next appointment for clinic, open orders / pending results for hospital. Add a small alert list. Our rail uses ordinary section headers and restrained separators, without copying Storyboard's shapes, hover layers, or colors. No required information may exist only in the rail; duplicate it in the commit workspace. Use full dates and explicit empty states. Long lists may extend vertically; avoid fake one-line histories.

## 3. Chart navigation: activities and table of contents

**Observed.** SIU's Epic training uses top activity tabs and a separate navigator table of contents. The Health PEI PowerChart overview shows eight visible TOC entries in its cropped example and describes 12 view-only destinations plus nine data-entry categories; the menu can therefore be longer than the visible area. CPRS's shortcut list names nine standard destinations; its Cover Sheet screenshot also shows Surgery, making ten visible tabs in that example. Counts are example-specific, not recommended limits. [SIU training, pp.4–8](https://www.siumed.edu/sites/default/files/2021-08/EPIC%20Info-Inpatient%20Student%20Training%20Exercise%20Booklet.pdf), [Health PEI overview, p.1](https://src.healthpei.ca/sites/src.healthpei.ca/files/CIS/CIS%20-%20Nurse%20Training%20Materials/Chart%20Overview%20-%20May%202024.pdf), [CPRS GUI guide, printed pp.198, 595](https://www.va.gov/vdl/documents/Clinical/Comp_Patient_Recrd_Sys_%28CPRS%29/cprsguium.pdf).

**Adopt.** Distinguish chart destinations (`Results`, `Meds`, `Notes`) from task steps (`Rooming`, `Review & sign`). Show 6–10 frequent chart destinations; put others in labeled nav groups of at most 12, satisfying D5. Use text labels and an active indicator. Preserve Back and encounter context. BRIEF permits unbuilt destination labels for realism: show these as plain text marked `Unavailable in demo`, never working-looking buttons. Every actual screen still needs a genuine nav entry. Do not squeeze 17 activities into tiny tabs.

## 4. Workflow navigators / completion marks

**Observed.** SIU describes navigator sections opened from their heading or TOC. CST's reconciliation status changes to a check mark when reconciliation completes. [SIU admission navigator, pp.7–8](https://www.siumed.edu/sites/default/files/2021-08/EPIC%20Info-Inpatient%20Student%20Training%20Exercise%20Booklet.pdf), [CST fundamentals, activity 4.2](https://cstcernerhelp.healthcarebc.ca/Workbooks_Manuals/Workbooks/W-N230_Provider_PowerChart%20Foundations.pdf).

**Adopt.** Use a task `stepper` and ordered `section`s. Status words: `Not started`, `In progress`, `Complete`, `Needs review`. A check means the interpreter recorded the applicable capture/review/commit, never merely that a tab was visited. A changed data version can invalidate review status. Keep legal documentation inside its clinical section: consent in pre-op, prescription details in the composer, discharge planning in discharge. No separate generic compliance wizard.

## 5. Order search, sets, and detail composer

**Observed.** The MD-Reports SED report describes searching a medication, choosing a product, completing prescription details, then moving through review and transmission. OpenEMR's SED tasks include medication and laboratory ordering. CST PowerPlans group orders by activity, allow individual selection/modification, and may start with some rows selected. [MD-Reports v10 SED, printed pp.22–24](https://www.provationmedical.com/wp-content/uploads/2020/09/170.315.G.3%E2%80%93SAFETY-ENHANCED-DESIGN-R2.pdf), [OpenEMR 7.0.0 usability report, pp.21–24](https://www.open-emr.org/wiki/images/f/fc/OpenEMR_Usability_Report.pdf), [CST immediate PowerPlan](https://cstcernerhelp.healthcarebc.ca/Patient_Chart/Orders/Place_a_PowerPlan_for_Immediate_Action.htm).

**Adopt.** Search first, then catalog results, then a long form with an unsigned queue. Search rows distinguish generic name, strength, form, and route. Separate tabs for `Meds`, `Labs`, `Imaging`, `Procedures`; service orders have code/kind, never a fabricated drug binding. Preference lists fill draft values, not signatures.

Order-set rows: include checkbox, order sentence, dose/route/frequency, timing, and `Missing details` / `Needs confirmation`. Pre-checked means selected in the draft set, not clinically reviewed or signed. Detail form order: product; dose/unit/route/frequency/PRN; duration; quantity/refills; pharmacy; indication/diagnosis; directions; patient/prescriber details; conditional controlled-substance details; optional comment. A two-column form uses short related fields together and full-width long text. Missing requirements are named next to the action. Do not use a decorative checkbox in a read-only table to imply editable state.

## 6. Verification and signing

**Observed.** CPRS separates unsigned work from signing, supports signing selected orders, and collects unsigned orders/documents for review when changing patients. [CPRS GUI guide, printed pp.111–125](https://www.va.gov/vdl/documents/Clinical/Comp_Patient_Recrd_Sys_%28CPRS%29/cprsguium.pdf).

**Adopt.** Keep `Order verification` and `Sign orders` as separate baseline screens in W1. Review uses a table of every pending line: action, product/strength/form, dose/unit, route, frequency/PRN, duration/timing, quantity/refills, indication/diagnosis, pharmacy, confirmation status. Signing adds the full required review panels, dose check, exceptions, and attestation. A row number is a locator, not a patient identifier. No collapsed details for required controlled-prescription content.

Place patient-ID re-entry immediately above the sign action with the expected identifier type stated. This is **VGI hospital policy**, not a claim that all EHRs require typed identity at every signature. The banner still supplies name + DOB/MRN. Use `I reviewed these orders for this patient` as an original explanatory attestation, not an extra mandatory field unless the spec declares one. Render any prescribed legal signing notice from the spec verbatim; the research document does not substitute its own legal wording.

## 7. Alerts and overrides

**Observed.** AHRQ distinguishes retaining high-severity warnings from making low-severity warnings noninterruptive/removing them. ISMP Canada recommends displaying a numeric dose limit and capturing a reason for an override. Epic-specific BestPractice Advisories are one recognizable instance of clinical decision support, not a visual template to copy. [AHRQ alert fatigue](https://psnet.ahrq.gov/primer/alert-fatigue), [ISMP Canada electronic-prescribing bulletin, pp.1–2](https://ismpcanada.ca/wp-content/uploads/ISMPCSB2010-05-ElectronicPrescribingSystems-3.pdf).

**Adopt.** Passive reminders are inline within the relevant section. Interruptive warnings open one modal containing the trigger, implicated order/allergen, patient-specific evidence, consequence, and next action. Where the spec allows override: labeled reason choices plus comment for `Other`, then a human acknowledgment. A non-overridable hard stop gives a concrete correction and keeps commit disabled. `Close`/Escape does not acknowledge. Severity and interruption tier are separate: a serious finding need not always interrupt, and a removable nuisance may interrupt in the baseline. Do not color every popup red or repeatedly acknowledge the same alert key. Preserve the canonical's explicitly removable popup noise for the optimizer.

## 8. Results review

**Observed.** CPRS offers tabular and graphical laboratory views. SIU training directs users to results review and marks abnormal values. [CPRS GUI guide, Labs chapter](https://www.va.gov/vdl/documents/Clinical/Comp_Patient_Recrd_Sys_%28CPRS%29/cprsguium.pdf), [SIU results training, p.4](https://www.siumed.edu/sites/default/files/2021-08/EPIC%20Info-Inpatient%20Student%20Training%20Exercise%20Booklet.pdf).

**Adopt.** Table: test, result, unit, H/L/critical flag, reference range, collection time, result status. Show specimen and report context. A selected analyte has a dated trend with units and accessible point table; do not connect unlike units or label a missing value normal. Before `Acknowledge & done`, show the abnormal result and trend together in the workspace, plus action/follow-up. Messaging and ordering are separate actions from acknowledgment; viewing is not acknowledgment. Critical communication status must be explicit if supplied by the record.

## 9. In Basket / work queues

**Observed.** UVM's EpicCare Link training shows folders with unread counts, a sortable message list, and a lower preview report opened by selecting a row. This is a Link example, not proof that every Hyperspace inbox has identical placement. [UVM In Basket guide, p.1](https://d2ubrtwy6ww54e.cloudfront.net/www.uvmhealth.org/assets/2024-06/epiccare-link-view-in-basket-messages.pdf?VersionId=yWLpM2OCTAr.dQoRlbMo.Olj9B_LG9AW).

**Adopt.** Folder nav (`Results`, `Refills`, `Messages`, `Done`) plus list and preview. List columns: priority, unread/status, received, patient + identifier, subject, sender, owner. Preview has message/result context and explicit actions. Opening a message changes selection/read status only if supported; it must not complete the Task. Preserve queue selection when returning from a chart. Update the patient banner atomically with preview selection; never show the previous patient's rail with the next message.

## 10. Refill requests

**Observed.** athenahealth describes portal renewal requests arriving as patient cases in the Clinical Inbox, followed by a response to the patient. eClinicalWorks documents distinct new/change/cancel/refill transactions and medication-history/fill-status exchange. Neither source establishes the exact review layout or universal protocol thresholds. [athenaOne service description, Prescription Requests](https://www.athenahealth.com/sites/default/files/media_docs/athenaOne-Service-Description.pdf), [eClinicalWorks v11 disclosures, electronic prescribing](https://www.eclinicalworks.com/wp-content/uploads/2021/03/eCW-V11-Mandatory-Disclosures-March-2021.pdf).

**Adopt.** Queue → request/chart review → decision. Display requested versus current prescription, pharmacy, last visit, pertinent dated labs, and fill history with its source; fills are evidence, not proof of adherence. `Approve`, `Deny`, and `Modify` must have distinct outcomes. A modification needing a new prescription goes through the complete composer and sign screen; never approve a Schedule II refill by relabeling it. Keep baseline review tabs and the protocol checkbox, while duplicating all required information on the decision screen.

## 11. ED tracking board

**Observed.** CST ED LaunchPoint uses room, length of stay, acuity, patient details, assignments, complaint/diagnosis, vitals, order progress, and status columns. [CST ED LaunchPoint overview](https://cstcernerhelp.healthcarebc.ca/Applications/FirstNet/ED_LaunchPoint/ED_LaunchPoint_Overview.htm).

**Adopt.** A departmental table with one patient per row: room/bed, acuity, name/age and identifier, chief complaint, arrival/LOS, MD/RN, allergy/isolation labels, labs/imaging status, disposition. Sortable columns and explicit selected row; no billboard-sized patient cards. Use the scenario's ESI acuity, not the reference installation's CTAS. Our patient-scoped canonical retains its selected patient's banner even on the board; label the table `Department` so it cannot be mistaken for one chart. Opening a row must switch all patient state together. Waiting/overdue thresholds are configured, not inferred from colors.

## 12. Inpatient MAR and BCMA

**Observed.** CST's MAR organizes medication categories against date/time columns, differentiates future, scheduled, and overdue tasks, and records actual dose/time. Its example uses blue scheduled tasks, gray future tasks, and red overdue tasks; PRN response tasks follow certain administrations. Its scanning guide uses patient wristband followed by medication barcode and detail review. [CST MAR overview](https://cstcernerhelp.healthcarebc.ca/Patient_Chart/MAR/Medication_Administration_Record_%28MAR%29_Overview.htm), [CST scan oral medications](https://cstcernerhelp.healthcarebc.ca/Patient_Chart/Medication_Administration/Scan_Oral_Medications.htm).

**Adopt.** Medication name/dose/route/frequency at left; one column per scheduled time within a dated shift window. Separate `Scheduled`, `PRN`, `Infusions`, `Stopped` sections. Cells show `Due 09:00`, `Overdue 09:00`, `Given 09:12`, `Held`, or `Refused` with reason/details. Our colors are defined in the style guide; they are not a universal MAR code. A scan is a captured step, never the administration commit. Flow: select due task → verify patient → scan wristband → scan medication → review dose/allergies/relevant labs → different nurse check if required → status/reason/actual time → `Record administration`. PRN pain has a before-dose score and a later reassessment task. No automatic reuse of prior scans, no bypass invented for the demo.

## 13. Flowsheets

**Observed.** CST iView documents grouped assessments and vitals in time columns, with annotations tied to the time column. [CST iView chart annotations](https://cstcernerhelp.healthcarebc.ca/Patient_Chart/iView/Chart_Annotations.htm), [CST dietitian workbook, activity on time columns, p.63](https://cstcernerhelp.healthcarebc.ca/Workbooks_Manuals/Workbooks/W-N102_Dietitian.pdf).

**Adopt.** Rows are measures, columns are observation times; bands are `Vitals`, `Pain`, `Assessment`, `I&O`. Present prior values in an `info(table)` and today's labeled inputs as adjacent `field`s. This works within the current vocabulary without pretending the read-only table is an editable spreadsheet. Show units per row, actual observation time distinct from entry time, and copied-forward provenance. `File assessment` commits new entries. Do not infer a normal assessment from blank cells.

## 14. Pediatric growth and dosing

**Observed.** CDC describes growth charts as percentile curves for age-related measurements. Pediatric e-prescribing guidance calls for kg weight and explicit weight-based dosing support. ISMP's FAQ recommends metric-only weight documentation to reduce pound/kg errors. [CDC growth charts](https://www.cdc.gov/growth-chart-training/hcp/overview/what-are-clinical-growth-charts.html), [AAP pediatric prescribing statement](https://pmc.ncbi.nlm.nih.gov/articles/PMC8194477/), [ISMP weight FAQ](https://online.ecri.org/hubfs/ISMP/Resources/ISMP_TargetedMedicationSafetyBestPractices_Hospitals_FAQ.pdf).

**Adopt.** Dated weight/length/height/head circumference table plus age-appropriate growth trends with labeled reference curves and source. Use WHO birth–2 and CDC 2–20 references where applicable, following [CDC's reference transition guidance](https://www.cdc.gov/growth-chart-training/hcp/using-growth-charts/who-using.html); label age basis and never invent a percentile from a simple line graph. Current kg weight and timestamp sit beside every pediatric prescription. Display dosing basis (`mg/kg/dose` versus `mg/kg/day`), frequency, calculated mg per dose, total daily mg, configured range/max, and entered dose. For liquids also display concentration and mL when data supports it. Calculation and range are visible again at signing, with no receipt substitution. A stale weight cannot look like today's weight. These are display requirements, not clinical dosing recommendations.

## 15. Surgery and discharge

**Observed.** Surgical safety guidance separates preinduction checks, preincision time-out, and checks before leaving the OR. CST discharge guidance sequences order review, medication reconciliation, discharge orders/diagnosis, then documents and patient handout. [ACOG surgical safety](https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2010/09/patient-safety-in-the-surgical-environment), [CST discharge home workflow](https://cstcernerhelp.healthcarebc.ca/Workflows/Inpatient/Admission_Transfer_Discharge/Discharge_Patient_Home_%28Provider%29.htm).

**Adopt.** Pre-op: procedure/site, H&P update, consent document and human verification, NPO, anticoagulant holds, allergies, prophylaxis. `Consent on file` is not `Consent verified`, and neither means a team time-out occurred. Keep time-out as a separately timed section with team/procedure/site confirmation, never pre-checked or populated by signing a note. Brief op note: diagnoses, procedure, surgeons, anesthesia, findings/technique, tissue/specimens, EBL, drains/implants, complications, condition. Post-op sets group diet/activity, VTE, pain, antibiotics, labs, and nursing orders. Discharge navigator groups medication decisions, prescriptions, course/diagnosis, destination/services, follow-up, instructions/return precautions, and final review. Keep distinct clinical signatures even when sections share a screen.

## 16. Density and keyboard conventions

**Observed.** CPRS's Cover Sheet example has ten information panes in three rows; its keyboard appendix supports Tab/Shift navigation, list arrows, and menu accelerators. Health PEI's example places a TOC and several panels around a central workspace. These demonstrate compact, information-rich interfaces, not a pixel standard. [CPRS GUI guide, printed pp.198–200, 595–596](https://www.va.gov/vdl/documents/Clinical/Comp_Patient_Recrd_Sys_%28CPRS%29/cprsguium.pdf), [Health PEI overview](https://src.healthpei.ca/sites/src.healthpei.ca/files/CIS/CIS%20-%20Nurse%20Training%20Materials/Chart%20Overview%20-%20May%202024.pdf).

**VGI targets.** Body 13 px; tables/secondary labels 12 px; ordinary table row 28 px, wrapped medication row at least 40 px, controls 30–32 px. At 1440×900 with roughly 600 px of table area this yields about 20 ordinary rows, or 12–15 medication rows, after headers. Aim for 6–10 activity labels and 4–8 summary sections in the shell. Long composers legitimately scroll. Density must come from smaller gaps and aligned data, never truncated drug names, missing rows, or hidden safety panels.

Use Tab/Shift+Tab in reading order, arrows in selection widgets, Enter to accept a selected search result, and Space for focused choices. Show optional shortcuts beside actions. Browser-reserved shortcuts differ from desktop CPRS: do not steal Ctrl+L or Ctrl+R. Ctrl+Enter may invoke an already enabled commit only when declared; it cannot satisfy identity, scans, acknowledgment, cosign, consent, or signing by macro. Scanner Enter terminates scan capture, not the form. See [visual style](visual-style.md) for accessibility and viewport checks.

## Research limits and review priorities

The references cover open-source, public-sector, and hospital training examples; they do not establish a single industry layout or universal status palette. The OpenEMR and MD-Reports SED reports were read for task paths; screenshot composition was inspected in CPRS and Health PEI manuals, not inferred from SED task timings. No authenticated patient systems were accessed. Some alternate SED report URLs were inaccessible; no conclusions rely on them. Medplum's Provider docs currently defer some messaging/lab/medication documentation, so its sidebar is the supported reference here, not an assumed full inpatient UI. [Medplum Provider](https://www.medplum.com/docs/provider).

Before implementation acceptance, have a clinician walk P1's signing/refill, P2's lb-weight case, P3's overdue/high-alert/PRN medication, P4's stale weight, and P5's consent/time-out/discharge. Check terminology and information hierarchy; this research is not a clinical validation or a change to the hospital spec.

## Cosignature

Production cosign is a non-blocking In Basket follow-up; not modeled.
Owner decision 2026-11-01 supersedes the blocking prototype described below.
The links and earlier design notes are retained as research history.


Public Cerner training routes orders to the ordering provider's Message Centre
according to the communication type. Some verbal orders become active before
cosignature; proposed orders wait for provider signature. These are distinct
states, governed by site policy. [CST computerized order entry](https://cstcernerhelp.healthcarebc.ca/Patient_Chart/Orders/CPOE/Place_Computerized_Order_Entry_%28Nurse%29.htm).
Epic's public export specification separately records ordering and cosigning
users, providers and In Basket messages. This supports a pending order and a
separate attending response, rather than treating the NP as the attending.
[Epic ORDER_SIGNED_PROC](https://open.epic.com/EHITables/GetTable/ORDER_SIGNED_PROC.htm).
CMS hospital guidance requires medical-staff rules to describe countersignature
processes when state law or hospital policy requires them, and requires an
identifiable author and genuine authentication. It does not establish this
project's blanket NP pre-op restriction. Our rule
is hospital policy, owner decision 2026-10-31.
[CMS hospital survey guidance, §482.24](https://www.cms.gov/Regulations-and-Guidance/Guidance/Manuals/downloads/som107ap_a_hospitals.pdf).

We adopt the queue/response pattern, without copying screens. The NP reviews
the order summary and awaits an attending co-signature on the pre-op signing
screen. Orders remain pending until that response. The human-only, distinct-user
cosign attests only consentVerified, hpUpdate and medsToHold. Physicians and
surgeons enter those three fields directly. This is a small abstract model of
an attending queue response, not a complete messaging or identity service.

The simulator records the response with `actor: "simulated-attending"` and
`responseDelayMinutes`. It draws uniformly from integers 1–5 using the task's
seeded SplitMix stream. The delay adds to task wall-time, including receipt age,
but the response contributes no NP operators, clicks or keys. This distribution
is an explicit modeling assumption, not an observed clinical turnaround time.

FHIR writes a `Provenance` targeting each signed `MedicationRequest`, with the
attending as an `attester` agent. The NP remains requester/recorder.
`MedicationRequest.performer` describes the intended medication administrator,
so it is not used for the cosigner.
[FHIR Provenance](https://hl7.org/fhir/R4/provenance-definitions.html),
[FHIR attester participant](https://hl7.org/fhir/R4B/valueset-provenance-participant-type.html),
[FHIR MedicationRequest](https://hl7.org/fhir/R4/medicationrequest-definitions.html).

The dated implementation checkpoints are archived in the [hackathon journal](../hackathon/ui-research-log.md).

## Additional source references

- [creatinine](https://loinc.org/2160-0)
- [hemoglobin A1c](https://loinc.org/4548-4)
- [hemoglobin](https://loinc.org/718-7)
- [MDRD eGFR](https://loinc.org/33914-3)
- [Practitioner profile](https://hl7.org/fhir/R4/practitioner.html)
- [HumanName](https://hl7.org/fhir/R4/datatypes.html#HumanName)
- [FHIR R4 encounter-class value set](https://hl7.org/fhir/R4/v3/ActEncounterCode/vs.html)
- [CMS ICD-10-CM index](https://www.cms.gov/medicare/coding-billing/icd-10-codes)
- [FY2027 code descriptions](https://www.cms.gov/files/zip/2027-code-descriptions-tabular-order.zip)
- [surgeon workspace tip sheet, pp.1–5](https://www.salemhealth.org/docs/default-source/common-ground-docs-and-images/surgeon-buttons-tip-sheet.pdf?sfvrsn=5d1cc7e5_2)
- [Connect Care surgical procedures manual](https://manual.connect-care.ca/workflows/surgical-procedures)
- [ChartLink quick-start guide, pp.16–20](https://www.bmc.org/sites/default/files/2025-10/BMCHS%20EpicCare%20ChartLink%20Quick%20Start%20Guide.pdf)
- [resident handbook](https://www.mssurg.com/table-of-contents)
- [Perioperative Tracking guide](https://cstcernerhelp.healthcarebc.ca/Applications/PowerChart/Perioperative_Tracking/Navigate_to_Perioperative_Tracking.htm)
- [tracking-filter guide](https://cstcernerhelp.healthcarebc.ca/Applications/PowerChart/Perioperative_Tracking/Perioperative_Tracking_Filters_and_Rules.htm)
- [AHA medication classes](https://www.heart.org/en/health-topics/heart-attack/treatment-of-a-heart-attack/cardiac-medications)
- [MedlinePlus P2Y12 inhibitors](https://medlineplus.gov/ency/patientinstructions/000100.htm)
- [FHIR R4 encounter status](https://hl7.org/fhir/R4/valueset-encounter-status.html)
- [right-patient/right-encounter guide](https://cstcernerhelp.healthcarebc.ca/Applications/PowerChart/Patient_Overview/Find_Right_Patient_and_Right_Encounter.htm)
- [previous-visit guide](https://cstcernerhelp.healthcarebc.ca/Patient_Chart/Patient_Information/Locate_Previous_Visit_Information.htm)
- [Medplum Provider](https://www.medplum.com/docs/provider)
- [CST computerized order entry](https://cstcernerhelp.healthcarebc.ca/Patient_Chart/Orders/CPOE/Place_Computerized_Order_Entry_%28Nurse%29.htm)
- [Epic ORDER_SIGNED_PROC](https://open.epic.com/EHITables/GetTable/ORDER_SIGNED_PROC.htm)
- [CMS hospital survey guidance, §482.24](https://www.cms.gov/Regulations-and-Guidance/Guidance/Manuals/downloads/som107ap_a_hospitals.pdf)
- [FHIR Provenance](https://hl7.org/fhir/R4/provenance-definitions.html)
- [FHIR attester participant](https://hl7.org/fhir/R4B/valueset-provenance-participant-type.html)
- [FHIR MedicationRequest](https://hl7.org/fhir/R4/medicationrequest-definitions.html)
- [Rady Children's ASAP resident manual, June 2021](https://ucsdpeds.com/wp-content/uploads/2023/04/Epic-Manual-2021.pdf)
- [ED depart process](https://cstcernerhelp.healthcarebc.ca/Applications/FirstNet/ED_LaunchPoint/ED_Depart_Process.htm)
- [Riverside Adult Med Surg Nurse exercise booklet](https://otis3.riversidehealthcare.net/content/epic/inpatient/orientation%20materials/epic%20online%20exercise%20book.pdf)
- [Closed-loop medication administration](https://cstcernerhelp.healthcarebc.ca/Patient_Chart/MAR/Closed_Loop_Medication_Administration_Workflow.htm)
- [CST inpatient admission](https://cstcernerhelp.healthcarebc.ca/Workflows/Inpatient/Admission_Transfer_Discharge/Admission_Inpatient.htm)
- [R4 Task definition](https://hl7.org/fhir/R4/task-definitions.html#Task.restriction.period)
- [R4 MedicationAdministration](https://hl7.org/fhir/R4/medicationadministration-definitions.html)
- [CST Results Review for nurses](https://cstcernerhelp.healthcarebc.ca/Patient_Chart/Results/Results_Review_%28Non-Providers%29.htm)
- [Results Review settings](https://cstcernerhelp.healthcarebc.ca/Patient_Chart/Results/Navigate_Results_Review_-_Tips_and_Tricks.htm)
- [CST lab-view training](https://cstcernerhelp.healthcarebc.ca/Patient_Chart/Results/View_Lab_Results_for_Non-Providers.htm)
- [HL7 R4 Task encounter binding](https://hl7.org/fhir/R4/task-definitions.html#Task.encounter)
- [CST I&O training](https://cstcernerhelp.healthcarebc.ca/Patient_Chart/iView/Document_Intake_and_Output_%28I_and_O%29.htm)
- [LOINC 9000-1, measured oral intake](https://loinc.org/9000-1)
- [9187-6, urine output](https://loinc.org/9187-6)
- [9192-6](https://loinc.org/9192-6)
- [HL7 document ontology](https://terminology.hl7.org/en/ValueSet-v3-LoincDocumentOntologyInternational.html)
- [nursing hospital transfer summaries](https://loinc.org/68482-9)
- [CST CareCompass overview](https://cstcernerhelp.healthcarebc.ca/Applications/PowerChart/CareCompass/Care_Compass_Overview.htm)
- [Reviewing orders/tasks](https://cstcernerhelp.healthcarebc.ca/Applications/PowerChart/CareCompass/Review_Orders_and_Tasks_in_CareCompass.htm)
- [single-patient task-list guide](https://cstcernerhelp.healthcarebc.ca/Patient_Chart/Single_Patient_Task_List/Manage_Tasks_from_Single_Patient_Task_List_%28SPTL%29.htm)
- [FHIR R4 DiagnosticReport definition](https://hl7.org/fhir/R4/diagnosticreport.html)
- [ImagingStudy](https://hl7.org/fhir/R4/imagingstudy.html)
- [Bundle reference rules](https://hl7.org/fhir/R4/bundle.html#references)
- [LOINC portable-chest study code 30746-2](https://loinc.org/30746-2)
- [FHIR R4 blood pressure profile](https://hl7.org/fhir/R4/bp.html)
- [AHRQ TeamSTEPPS SBAR](https://www.ahrq.gov/teamstepps-program/curriculum/communication/tools/sbar.html)
- [FHIR R4 Dosage definition](https://hl7.org/fhir/R4/dosage-definitions.html)
- [FHIR R4 MedicationAdministration](https://hl7.org/fhir/R4/medicationadministration-definitions.html#MedicationAdministration.context)
- [Mount Sinai EHHOP student guide (2019), printed pp.9–12, 19–25](https://ehhapp.org/uploads/Student-Guide-to-Epic-for-EHHOP.pdf)
- [Washington Regional, WRMS Provider Musts, pp.2–3, 6–8, 11–12](https://www.wregional.com/Uploads/Public/Documents/MedStaff/Epic%20Resources/WRMS%20Provider%20Musts.pdf)
- [Iowa, Rooming / Check In–Check Out](https://epicsupport.sites.uiowa.edu/epic-resources/check-incheck-out)
- [Iowa, Growth Chart](https://epicsupport.sites.uiowa.edu/epic-resources/growth-chart)
- [Iowa, Immunizations](https://epicsupport.sites.uiowa.edu/epic-resources/immunizations)
- [Iowa, After Visit Summary](https://epicsupport.sites.uiowa.edu/epic-resources/after-visit-summary-avs)
- [Johns Hopkins, In Basket QuickActions](https://medicine-matters.blogs.hopkinsmedicine.org/2019/04/epic-tip-of-the-week-10/)
- [Epic public e-refill export definition](https://open.epic.com/EHITables/GetTable/RX_EREFILL_RQST.htm)
- [HL7 R4 MedicationDispense specification](https://hl7.org/fhir/R4/medicationdispense.html)
- [HL7 R4 ImmunizationRecommendation](https://hl7.org/fhir/R4/immunizationrecommendation.html)
- [CDC growth-chart recommendations](https://www.cdc.gov/growth-chart-training/hcp/overview/recommended.html)
- [CDC weight](https://www.cdc.gov/growthcharts/data/zscore/wtage.csv)
- [stature](https://www.cdc.gov/growthcharts/data/zscore/statage.csv)
- [weight-for-age](https://www.who.int/tools/child-growth-standards/standards/weight-for-age)
- [length/height-for-age](https://www.who.int/toolkits/child-growth-standards/standards/length-height-for-age)
- [HL7 US Core birth-sex extension](https://hl7.org/fhir/us/core/StructureDefinition-us-core-birthsex.html)
- [CMP](https://loinc.org/24323-8)
- [CBC with automated differential](https://loinc.org/57021-8)
- [HL7 R4 Patient](https://hl7.org/fhir/R4/patient.html)
- [NIST Handbook 44 Appendix C](https://www.nist.gov/document/2026-nist-handbook-44-appendix-c)
- [Tower Health In Basket Guide for Providers (2021), publicly hosted by General Pediatrics](https://www.genpeds.com/wp-content/uploads/2021/08/In-Basket-Guide-for-Providers-1.pdf)
- [UCSF-hosted medication refill standing order (2011/2012 historical document)](https://cepc.ucsf.edu/sites/g/files/tkssra17936/files/Standing%20Order%20-%20Med%20Refill.pdf)
- [Penn Medicine refill-protocol implementation study (2022)](https://pmc.ncbi.nlm.nih.gov/articles/PMC9646402/)
- [Weill Cornell eCOMP manual](https://practiceops.weillcornell.org/sites/default/files/weill_cornell_medicine_ecomp_manual_10-17.pdf)
- [Johns Hopkins May 31, 2019 Epic tip](https://medicine-matters.blogs.hopkinsmedicine.org/2019/05/epic-tip-of-the-week-may-31-2019/)
- [FHIR R4 Dosage](https://hl7.org/fhir/R4/dosage-definitions.html#Dosage.route)
- [Medication.form](https://hl7.org/fhir/R4/medication-definitions.html#Medication.form)
- [Vanderbilt's outpatient Epic exercise](https://www.vumc.org/vclic/intro-epic-and-build-capabilities)
- [Johns Hopkins' March 15, 2019 tip](https://medicine-matters.blogs.hopkinsmedicine.org/2019/03/epic-tip-of-the-week-5/)
- [SNOMED International's semantic-tag table](https://docs.snomed.org/snomed-ct-specifications/snomed-ct-editorial-guide/readme/authoring/general-naming-conventions/descriptions/fully-specified-name/index)
- [CST Cerner MAR overview](https://cstcernerhelp.healthcarebc.ca/Patient_Chart/MAR/Medication_Administration_Record_(MAR)
- [UHN MAR overview](https://www.uhnmodules.ca/For_Staff/computer_education/Robohelp/MAR_-_MAR_Overview.htm)
- [University of Iowa Brain training](https://epicsupport.sites.uiowa.edu/epic-resources/brain)
- [CST I&O documentation](https://cstcernerhelp.healthcarebc.ca/Patient_Chart/iView/Document_Intake_and_Output_(I_and_O)
- [Epic Track Board training, J. R. Gibson](https://sw-anesthesia.com/wp-content/uploads/2018/04/How-to-review-ED-Track-Board.pdf)
- [CST scheduling foundational workbook](https://cstcernerhelp.healthcarebc.ca/Workbooks_Manuals/Workbooks/W-N29_Scheduling%20Foundational.pdf)
- [UVM In Basket guide](https://www.uvmhealth.org/document/5878)
- [CST Spine Surgical Clinic provider workbook](https://cstcernerhelp.healthcarebc.ca/Workbooks_Manuals/Workflow_Review/Clinic/VGH/VGH%20Spine%20Surgical%20Clinic%20Provider%20Workbook.pdf)
- [CDC growth-chart guidance](https://www.cdc.gov/growthcharts/index.htm)
- [CST physician workbook, p.25](https://cstcernerhelp.healthcarebc.ca/Workbooks_Manuals/Workbooks/W-N153_Physician_Gynecologic_Oncologist_Inpatient_Systemic%20Therapy.pdf)
- [FHIR R4 Appointment](https://hl7.org/fhir/R4/appointment-definitions.html)
- [open.epic's FHIR interface guide](https://open.epic.com/Interface/FHIR)
- [HL7 R4 Observation](https://hl7.org/fhir/R4/observation-definitions.html)
- [FHIR quantity and sampled-data definitions](https://hl7.org/fhir/R4/datatypes-definitions.html)
- [LOINC culture entry](https://loinc.org/630-4)
- [LOINC urine-protein entry](https://loinc.org/2888-6)
- [CST documentation guide](https://cstcernerhelp.healthcarebc.ca/Patient_Chart/Notes/Dynamic_Documentation_%28Providers%29.htm)
- [FHIR R4 dateTime](https://hl7.org/fhir/R4/datatypes.html#dateTime)
- [FHIR Patient.generalPractitioner](https://hl7.org/fhir/R4/patient-definitions.html#Patient.generalPractitioner)
- [Encounter.participant.type](https://hl7.org/fhir/R4/encounter-definitions.html#Encounter.participant.type)
- [SAFER Test Results Reporting and Follow-Up guide, practices 2.6–2.7, pp.17–18](https://healthit.gov/wp-content/uploads/2025/06/SAFER-Guide-8.-Test-Results-Reporting-Final.pdf)
- [UTHealth's NCCD visibility guidance](https://sbmi.uth.edu/nccd/ehrusability/design/guidelines/Principles/visibility.htm)
- [MEDITECH's Expanse Point of Care support page](https://ehr.meditech.com/support/expanse-poc)
- [AHRQ patient photos research](https://digital.ahrq.gov/program-overview/research-stories/displaying-patient-photos-medical-records-reduces-errors-improves)
- [athenaOne EHR overview](https://www.athenahealth.com/solutions/athenaone/electronic-health-records)
- [open.epic](https://open.epic.com/)
- [Mass General Brigham's Storyboard workspace guide](https://clinicalhelp.mgb.org/phsviewer/PHSviewer_addTab.pdf)
- [Johns Hopkins' Storyboard transition note](https://medicine-matters.blogs.hopkinsmedicine.org/2020/06/epic-tip-of-the-week-june-26-2020/)
- [UI Health Care's Epic basics resource catalog](https://epicsupport.sites.uiowa.edu/epic-resources/hyperspace-epic-basics)
- [HL7 R4 Patient identifiers](https://hl7.org/fhir/R4/patient.html#ids)
- [HL7 R4 body-weight profile](https://hl7.org/fhir/R4/bodyweight.profile.xml.html)
- [SNOMED International's fully specified name guide](https://docs.snomed.org/snomed-ct-specifications/snomed-ct-editorial-guide/readme/authoring/general-naming-conventions/descriptions/fully-specified-name)
- [NLM's RxNorm overview](https://www.nlm.nih.gov/research/umls/rxnorm/overview.html)
- [Northwestern Medicine In Basket training](https://physicianforum.nm.org/uploads/1/1/9/4/119404942/viewing_and_replying_to_inbasket_messages.pdf)
- [Methodist ambulatory In Basket scenarios](https://www.methodistmd.org/files/epic/Day-in-the-Life/ambulatory/Ambulatory-InBasket_Workflows_Scenarios.pdf)
- [Epic's patient-list documentation](https://fhir.epic.com/Documentation?docId=rpmtutorial)
- [MAR statuses](https://cstcernerhelp.healthcarebc.ca/Patient_Chart/MAR/Statuses_on_the_MAR.htm)
- [MAR Summary](https://cstcernerhelp.healthcarebc.ca/Patient_Chart/Medications/MAR_Summary/MAR_Summary_Overview.htm)
- [Ink & Switch, Malleable Software](https://www.inkandswitch.com/essay/malleable-software/)
