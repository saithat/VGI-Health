# EHR UI pattern research

Research date: 2026-10-31. Scope: BRIEF §§5, 5a, 6 and workflows W1–W7. Companion deliverables: [canonical blueprint](canonical-blueprint.md) and [visual style](visual-style.md).

## Evidence and reuse boundary

These are pattern observations and original VGI design decisions, not replicas. No source images, vendor assets, proprietary icons, screen text blocks, or screen compositions are incorporated. All source descriptions below are paraphrases; there are no verbatim quotations. Public access to a manual or certification report does not put its vendor screenshots in the public domain. OpenEMR's GPL does not make its code unrestricted; this docs-only work imports no code. US-government-authored CPRS material is a useful public-domain reference, subject to any separately credited material.

Evidence has different strengths: a hospital training guide establishes behavior in that installation/version, not every installation; a usability report establishes tested tasks, not comparative clinical effectiveness; safety guidance supports a convention, not a new law. **Observed** below identifies source-backed behavior. **Adopt** identifies our synthesis. Pixel values and counts proposed for VGI are design targets, not vendor measurements. Existing requirements remain governed by the repository's [regulations mapping](../regulations.md), [rule catalog](../rules/catalog.md), and Lean spec.

Read locally: [BRIEF](../../BRIEF.md), [semantic vocabulary §10](core-model.md#10-semantic-ui-tree--minimal-design-rules-owner-decision-oct-31-supersedes-the-raw-html-page-tree-for-ehr-screens), all seven `lean/Ehr/Canonical/W*.lean` modules, `Builders.lean`, `Program.lean`, `Rules.lean`, and `RulePlacements.lean`. The latter matters: it adds artifact screens beyond the workflow modules.

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

Place patient-ID re-entry immediately above the sign action with the expected identifier type stated. This is **VGI hospital policy**, not a claim that all EHRs require typed identity at every signature. Current canonical labels say initials/sex/age, while the renderer documentation identifies a synthetic patient identifier token; the implementation lane must reconcile the label and actual validation without weakening it. The banner still supplies name + DOB/MRN. Use `I reviewed these orders for this patient` as an original explanatory attestation, not an extra mandatory field unless the spec declares one. Render any prescribed legal signing notice from the spec verbatim; the research document does not substitute its own legal wording.

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

## Presentation lane: structured clinical widgets

Research and implementation: 2026-11-01, `lane/present`. The stable integration API is [presentation-contract.md](presentation-contract.md). These are original drawings of public interaction and information patterns. Vendor screenshots were inspected in temporary files outside the repository; no vendor image, icon, logo, or copied screen composition is shipped.

### Sources checked for this pass

- **Inpatient RN / MAR:** [CST Cerner MAR overview](https://cstcernerhelp.healthcarebc.ca/Patient_Chart/MAR/Medication_Administration_Record_(MAR)_Overview.htm) describes medication categories, order details at left and dated administration cells at right. Its scheduled, future and overdue task colors are blue, gray and red. Actual administration and pending task are different records. I inspected the category-navigation and task-cell screenshots. We adopt the medication-by-hour arrangement, explicit words beside color, and actual dose/time. Our order data never imply that a dose was given. [UHN MAR overview](https://www.uhnmodules.ca/For_Staff/computer_education/Robohelp/MAR_-_MAR_Overview.htm) independently confirms medication rows, time columns, last administration and distinct held/changed/scheduled indicators. Colors vary by installation; our palette remains the project's accessible palette.
- **RN / shift overview:** [University of Iowa Brain training](https://epicsupport.sites.uiowa.edu/epic-resources/brain) describes signed-in patients, required documentation and tasks together. We keep patient, due time, task, owner and status explicit in the worklist schema; a display row is not evidence that documentation or medication administration was completed.
- **RN / flowsheets:** [CST I&O documentation](https://cstcernerhelp.healthcarebc.ca/Patient_Chart/iView/Document_Intake_and_Output_(I_and_O).htm) uses categories down the left and hourly time columns, with totals identified separately. We adopt measure × time layout and visible units. We do not invent totals, device values or editable spreadsheet cells. New charting remains an ordinary Lean field/action beside the recorded observations.
- **ED physician:** [Epic Track Board training, J. R. Gibson](https://sw-anesthesia.com/wp-content/uploads/2018/04/How-to-review-ED-Track-Board.pdf) identifies a location-specific census and separate consult/all-patient views. [CST ED LaunchPoint overview](https://cstcernerhelp.healthcarebc.ca/Applications/FirstNet/ED_LaunchPoint/ED_LaunchPoint_Overview.htm) supports the dense room/patient/assignment/complaint/status pattern. We use a grid rather than patient cards. Missing acuity, assignments and pending results stay missing unless explicitly supplied; encounter priority is not automatically converted to ESI.
- **PCP / pediatric NP / schedule and inbox:** [CST scheduling foundational workbook](https://cstcernerhelp.healthcarebc.ca/Workbooks_Manuals/Workbooks/W-N29_Scheduling%20Foundational.pdf) shows patient, appointment type/location, scheduled time and status together. [UVM In Basket guide](https://www.uvmhealth.org/document/5878) describes a left folder list with unread counts, a message list, preview and explicit completion actions. We adopt counted folders and dense received/patient/subject/sender/status rows. Our read-only presentations do not manufacture sort, filter, reply or Done buttons.
- **Results:** [CST Spine Surgical Clinic provider workbook](https://cstcernerhelp.healthcarebc.ca/Workbooks_Manuals/Workflow_Review/Clinic/VGH/VGH%20Spine%20Surgical%20Clinic%20Provider%20Workbook.pdf) distinguishes low, high, abnormal and critical markers alongside color, with date/result-type grouping. We preserve explicit H/L/HH/LL/A flags, units, ranges and timestamps. Low uses blue, high amber and critical red. Lean reads source interpretations and performs the existing numeric-range policy; the painter never compares a result against its range.
- **Pediatrics / growth:** [CDC growth-chart guidance](https://www.cdc.gov/growthcharts/index.htm) defines age-related reference curves. The fixture uses actual published female CDC 2000 2–20 year reference points from [weight-for-age CSV](https://www.cdc.gov/growthcharts/data/zscore/wtage.csv) and [stature-for-age CSV](https://www.cdc.gov/growthcharts/data/zscore/statage.csv), sampled at six-month intervals over the example child's chart. Reference input and source URLs are committed in `lean/Ehr/Render/TestData/growth-reference.json`. These are reference curves, not computed patient percentiles. Weight and stature occupy separate plots with separate units. Absent reference data is stated explicitly.
- **Surgeon / OR and notes:** [CST perioperative tracking](https://cstcernerhelp.healthcarebc.ca/Applications/PowerChart/Perioperative_Tracking/Navigate_to_Perioperative_Tracking.htm) describes one patient per row, usually arranged by room, with a separate chart-opening action. The [CST physician workbook, p.25](https://cstcernerhelp.healthcarebc.ca/Workbooks_Manuals/Workbooks/W-N153_Physician_Gynecologic_Oncologist_Inpatient_Systemic%20Therapy.pdf) identifies a location-specific surgical slate whose statuses follow nursing documentation. These supplement the surgical research above on the room/time/procedure/patient/status columns and templated narrative. We apply the same dense tabular vocabulary to the OR schedule and use full-width note cards for narrative, with date, author, encounter and document status. Required signing controls remain the surgical lane's semantic components.
- **FHIR boundary:** [FHIR R4 Appointment](https://hl7.org/fhir/R4/appointment-definitions.html) separates a planned booking from the encounter; [FHIR R4 MedicationAdministration](https://hl7.org/fhir/R4/medicationadministration-definitions.html) records an actual administration, status/reason, dose, route, site and performer. [open.epic's FHIR interface guide](https://open.epic.com/Interface/FHIR) likewise directs upcoming appointments to Appointment rather than Encounter. The implementation follows these distinctions. It does not expand frequency into assumed dose times or expose unresolved resource references as patient/clinician names.

### Screen-by-screen visual review

All examples are generated by `Render/PresentationFixtures.lean` through the real `renderUi` function from fictional FHIR records and patient-bound payloads. The before view removes only the presentation wrapper, retaining the same rows; it is a controlled comparison of the old generic painter and the new drawing, not a claim that the old canonical already contained these new queues. Each pair is captured at **1440×900** in `app/shots/realism/present/<kind>{,-before}.png`, with full-page counterparts. The reviewed shell is the current shared painter; its styling is owned by SHELL.

| Screen / kind | Before | After and self-review |
| --- | --- | --- |
| Day schedule / `schedule` | Generic, uniformly weighted table. | Time and patient anchor each row; appointment type, complaint, location and explicit arrival/booking chips read together. No decorative workflow buttons. Date repetition is deliberate because the payload may span days. |
| ED board / `trackBoard` | No distinction between patient/room/status columns. | Dense room/patient/age/complaint grid with supplied ESI, RN/MD, pending lab/imaging and disposition text. The fixture supplies these facts explicitly. This remains a read-only board; encounter-opening controls must be real program buttons. |
| OR schedule / `orSchedule` | Generic column sizing obscured procedure names. | Wider procedure column; room/start/patient/surgeon/status remain in one row. Status tints follow supplied text. |
| Worklist / `worklist` | Unstructured task records. | Due time, task, owner and explicit due/overdue status align in a compact table. No invented urgency threshold or completion control. |
| MAR / `timeGrid` | Exact administration minutes created separate narrow columns; medication metadata spread across five columns. | Iteration 1 was still too tall and broke words. Iteration 2 groups medication, dose, route, frequency and order status at left, uses hourly columns and keeps exact administration times/details in the cells. Empty intervening hours are axis cells, not invented doses. Green/amber/blue cells retain Given/Held/Scheduled text. Full details remain visible rather than disappearing into hover content. |
| Flowsheet / `flowsheet` | A chronological list made comparison difficult. | Measurements and units form rows, recorded times form columns, and repeated same-time observations survive. It reads like an assessment/results grid. Values from different units never share a measure row. |
| In Basket folders / `folderList` | Generic table with repeated column labels. | Left-rail style counted rows, visible folder and unread counts, no fake selectable controls. |
| In Basket messages / `messages` | Generic list without an information hierarchy. | Received/patient/subject/from/priority/status columns; unread and review states remain explicit. Use adjacent semantic navigation/actions for selection and completion. |
| Results / `results` | A boolean abnormal value and generic table. | Human-facing H/L flags beside result/unit/range/time; all source trend records retained. No numeric clinical logic in React. |
| Result trends / `trend` | One sparkline could join unlike tests or units. | One labeled plot per test/unit, followed by its complete source table. Nonnumeric values remain in the table. Separate plotting avoids visually joining potassium, hemoglobin and creatinine. |
| Growth / `growth` | Generic mixed weight/height sparkline. | Separate age-axis kg/cm plots, explicit reference-percentile curves and source labels, plus complete measured/reference data. The initial plot labels were too small; the second pass enlarged them and removed excess SVG whitespace. Patient percentiles are not fabricated. |
| Notes / `notes` | Narrative squeezed into a wide table cell. | Full-width dated note cards preserve the complete text, author, encounter, document status and source metadata. No hidden overflow or collapse. |
| Medication review / `table` | Generic table styling. | Consistent compact headers, alternating rows, readable instructions and status words. Extra columns and duplicate keys are preserved. |

### Baseline efficiency

Measured with `LEAN_NUM_THREADS=4 LEAN_STACK_SIZE_KB=65536 pnpm complexity --release-root releases`; the command also invokes native `ehr min-clicks` for every case. These are certified minima within the reported search spaces; KLM is the estimate for the minimum-click replay, not a global KLM minimum. The initial unbounded-stack attempt failed to create a thread; the bounded-stack run completed.

| Workflow | v1/v2 clicks | v1/v2 KLM seconds | v3 clicks | v3 KLM seconds |
| --- | ---: | ---: | ---: | ---: |
| W1 | 39 | 143.2 | 39 | 143.2 |
| W2 | 7 | 21.45 | 7 | 21.45 |
| W3 | 57 | 198.45 | 57 | 198.45 |
| W4 | 25 | 129.95 | 25 | 129.95 |
| W5 | 48 | 175.45 | 49 | 179.8 |
| W6 | 52 | 178.3 | 53 | 182.65 |
| W7 | 12 | 27.5 | 12 | 27.5 |

Presentation adds no navigation or entry operators. The after run used the same command and release inputs. All seven workflow metrics (including clicks, keystrokes, KLM, screens, required fields and popups) are unchanged in all three releases. Native `ehr min-clicks` was rerun as part of both measurements. This presentation layer adds no navigation or entry operators.

### Validation of the presentation milestone

- Lean default build, kernel replay (`lake check`), the core Comparator and the render Comparator pass. All 43 pre-existing semantic UI theorem signatures are unchanged. The render audit also checks the new FHIR completeness theorems. Only `propext`, `Quot.sound` and `Classical.choice` are permitted. No new D-rule, spec rule, simulator policy or clinical guard was introduced.
- Certification: **15/15** persona projections across v1/v2/v3; **17/17** core bad programs rejected with their expected properties.
- World 2: **1,284/1,284** tasks complete across all 50 schedules, using the public native simulator. Reproduce with `python3 scripts/presentations/check-world.py`.
- `make wasm` and `make wasm-check` pass. All **13** presentation fixtures agree exactly between native and WASM, as do facts from all **324** Synthea/Synthetic Hospital bundles and all **652** current canonical HTML/semantic variants. Actual RN wristband acceptance/rejection is exercised.
- App build/lint and **166** app tests pass; **41** agent tests pass. The browser fidelity gate passes **45** checks for the 13 widget fixtures plus the five existing semantic screens at desktop/narrow widths; three duplicate wide-viewport probes are intentionally skipped in the narrow project. The gate checks exact role/name/disabled/ancestry, every supplied value, legibility, coverage, overflow, keyboard/scanner/modal behavior and status contrast.
- Archived `run1-P3`: **424** tasks / **14,658** events plus **3** baselines / **137** events, **0 mismatches**. Existing unwrapped info nodes keep their drawing. The new wrapper adds layouts without changing interpreter event semantics.
- Test-tool repairs: the old sample exporter tried to parse a native-unit medication dose without the state's selected unit; it now uses the actual unit and still enters through the interpreter. The differential test assumed navigator labels equaled screen titles; it now verifies exact screen IDs/order and nonempty labels, while still comparing complete native/WASM output. The actual semantic theorem statements and clinical rules are unchanged.

### First chart-polish increment and main integration

Merged main's same-slot dose/drug dependency rule at `66e6f49`; the generated merge conflicts were resolved by rebuilding WASM and rerunning certification. The combined branch certifies **15/15** personas and rejects **18/18** bad programs, including the new dependency regression. World 2 remains **1,284/1,284**, and the archived trajectory remains at **0 mismatches**. Kernel replay and both Comparator audits pass on the merged source.

Growth's first combined table mixed patient measurements with reference-point metadata and produced many empty cells. The revised drawing puts recorded date/age/weight/height in a clean clinical table, with the complete published reference data in a separate labeled table below. Both plots and the reference bands remain visible. Every original value remains in the same info panel; there is no collapse or truncation. New 1440×900 screenshots replace `growth.png` and `growth-full.png`.

Trend axes now label actual recorded points instead of interpolated dates. A single observation is centered and gets one label, and undated observations use an explicitly labeled sequence axis. Axis labels retain the supplied wall date/time; they are not converted through UTC. This fixes repeated overlapping labels and a possible following-day label on a late-evening observation. Regression tests cover both cases. Large series use a reduction for bounds, avoiding a spread-argument limit without imposing a row limit.

App build/lint and **168** tests pass; **41** agent tests pass. The 13-widget desktop/narrow fidelity run passes **35** checks (plus three intentionally skipped duplicate probes), and all **26** before/after screenshot checks pass. Screenshot review now also checks the actual rendered structured status tints for at least 4.5:1 text contrast. The semantic wire, clinical rules and click/KLM measurements are unchanged by this drawing-only increment.

### Semantic composition increment

The UVM guide explicitly puts folders in a left pane and the message list beside them, with a separate message-detail report and actions. The new `inBasket` example applies that folder/list pattern through a normal source group tagged `layout.columns`; Lean now emits the existing `UiNode.columns`. An ordinary group may also select a presentation around its normal children. There is no React-owned screen composition and no new D-rule. The per-item and nesting proofs still retain their original statements, including malformed-program cases.

The composed fixture supplies 14 Results messages, six unread, matching the explicit Results folder counts. Its before/after pair retains identical records and semantic columns; the wrapper changes their drawing. Folder entries are read-only until the workflow program supplies a real action. The example is a folder/list composition, not a claim to implement all message preview and completion behavior in the widget. MAR fixture events now agree with the stated every-six-hour/every-eight-hour/daily frequencies within the displayed day shift, and the RN worklist uses the same adult patient as the chart banner.

Visual review at 1440×900 found that a broader hourly MAR axis again broke long documentation across narrow cells. The new pass keeps supplied status/time/dose in the hourly grid and puts each complete original administration record in a labeled list directly below. Nothing is hidden in a tooltip or collapsed panel. The medication details and hours become scannable while route, site, performer and reason remain readable. The independent ARIA projection includes this additional documentation list. The old generic `timeGrid-before` fails the overflow gate at both widths; this is retained as comparison evidence, while the structured view must pass the unchanged gate.

This checkpoint passes the default Lean build, kernel replay and renderer Comparator with the original theorem statements. Certification is **15/15**, bad programs **18/18** rejected, and World 2 **1,284/1,284** complete. Native/WASM matches all **14** examples exactly; `make wasm-check`, app build/lint and **168** app tests pass. All **28** before/after screenshot checks pass, and the current 14 examples pass **37** desktop/narrow fidelity checks, with three intentionally skipped duplicate probes. In Basket now uses the intended narrow folder pane; the MAR's four medication rows fit the desktop viewport. Click paths and KLM are unchanged because the new tags select layout only.
