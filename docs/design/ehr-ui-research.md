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

## Canonical realism: P1 PCP and P4 pediatric NP (ambulatory)

Research and implementation pass: 2026-11-01, AMB lane. This is one vendor
baseline with role projections, not a separate pediatric product. No vendor
assets or screenshot pixels are included. The public guides describe particular
installations; the layouts below are our synthesis. The hospital rulebook and
all human entry, review, alert and signature requirements remain authoritative.

### References inspected

- [Mount Sinai EHHOP student guide (2019), printed pp.9–12, 19–25](https://ehhapp.org/uploads/Student-Guide-to-Epic-for-EHHOP.pdf): schedule selection opens the visit navigator; reason for visit, vitals, allergies, medication review, history, orders and patient instructions have distinct sections. The navigator screenshot on printed p.12 was visually inspected. Adopt its separation of chart activities from encounter sections, with our own visual design.
- [Washington Regional, WRMS Provider Musts, pp.2–3, 6–8, 11–12](https://www.wregional.com/Uploads/Public/Documents/MedStaff/Epic%20Resources/WRMS%20Provider%20Musts.pdf): folder list, message list and preview/action pane are separate. Request handling supports approval, rejection and editing, with recent-visit, medication and lab reports nearby. The general-layout and request-context screenshots were visually inspected. Retain a review-to-response path and explicit signing, without copying its artwork.
- [Iowa, Rooming / Check In–Check Out](https://epicsupport.sites.uiowa.edu/epic-resources/check-incheck-out): rooming status is a schedule operation; merely opening a visit must not change a booked appointment to roomed.
- [Iowa, Growth Chart](https://epicsupport.sites.uiowa.edu/epic-resources/growth-chart): growth is a chart activity with age/measure-specific CDC or WHO reference datasets. A raw measurement series is not a percentile calculation.
- [Iowa, Immunizations](https://epicsupport.sites.uiowa.edu/epic-resources/immunizations): history reconciliation and determining vaccines due are distinct tasks; outside registry information matters. Only supplied `ImmunizationRecommendation` data is called a forecast here.
- [Iowa, After Visit Summary](https://epicsupport.sites.uiowa.edu/epic-resources/after-visit-summary-avs): patient instructions contribute to the AVS at visit completion. Keep instructions, follow-up, charges and signing as separately named sections.
- [Johns Hopkins, In Basket QuickActions](https://medicine-matters.blogs.hopkinsmedicine.org/2019/04/epic-tip-of-the-week-10/): result-note actions and refill approval/denial are message-type-specific; personalized shortcuts can reduce clicks. This supports retaining ordinary multi-step baseline paths for the overnight agent to improve.
- [Epic public e-refill export definition](https://open.epic.com/EHITables/GetTable/RX_EREFILL_RQST.htm): a refill request has its own medication, follow-up status and pharmacy-comment context. Request and current prescription must be distinguishable.
- [AHRQ alert fatigue](https://psnet.ahrq.gov/primer/alert-fatigue): preserve clinically consequential warnings while distinguishing passive reminders. No alert tier or clinical guard changes are made in this pass.

### Target layouts and clinical paths

| Screen | Target layout and terminology | Initial review / intended change |
| --- | --- | --- |
| P1/P4 Schedule (`home`) | Day-list table: time, patient, age/sex, visit type, source status, chief complaint, provider/location; normal adjacent encounter action. In Basket remains an activity, not a labeled clinical workflow. | The former “Today's work” panel was empty on ordinary chart fixtures. Use supplied Appointment rows and the `present.schedule` contract. A chart-scoped bundle is explicitly only that chart's appointments. |
| `w1Rooming` | Reason for visit, compact metric vitals with units, allergy table + Mark reviewed, screenings/pharmacy, PHQ-2, health maintenance. | Before: vitals came before the complaint; collapse controls competed with form inputs. Open clinical sections and an actual left visit navigator establish the normal rooming order. |
| `w1MedRec` | Medication table, reconciliation decisions, Mark reviewed, optional fill-history/prior-plan reports. | Before: abbreviated “Med rec” and generic reconciliation grouping. Use Medication Review and preserve each existing capture/receipt. |
| `w1Hpi` | Medical/surgical/family/social history, prior-note tools, HPI, ROS. | Before: “History” meant only an HPI/ROS form. Put real history context here and name the note sections explicitly. |
| `w1Exam` | Exam/template, problem list, encounter diagnoses, problem-based Assessment & Plan. | Before: ungrouped exam and plan fields. Keep distinct clinical sections, with the diagnosis as the source of linked order/claim diagnoses. |
| `w1Orders` | Search/catalog, preference list, dosing, medication/dispense/pharmacy/diagnosis, pending orders, Review and sign. | Preserve the long baseline composer and per-field confirmations; no quick-sign macro. |
| `w1Labs` | Test search, order details/associated diagnosis, recent results, pended orders. | Clarify Lab Orders and keep the diagnosis linked rather than retranscribed. |
| `w1Verify` | Pended order table, allergies, baseline reconfirmation, then Sign Orders. | Keep the extra Order Review step as documented baseline friction. |
| `w1Sign` | Full order summary and required chart reviews, dose check, applicable alerts, human identity directly before signature. | Preserve all required reviews outside optional tabs and the exact signing guard. |
| `w1Close` | Note review, Level of Service, Follow-up, Patient Instructions / AVS, health maintenance, Sign Visit. | Before: a single closing form. Named sections match the visit navigator and retain billing/instruction captures. |
| `w2Inbasket` | Folder counts, searchable result list, selected-message context, Review result; Rx Requests is a genuine destination. | Before: generic “Messages” with no meaningful message-type hierarchy. Use actual Task rows and `present.folderList` / `present.messages`. Counts are chart-scoped unless an explicit department payload is supplied. |
| `w2Result` | Result values, units, flags and reference ranges; dated trend; clinical action/follow-up test; Result Note; Reviewed / Done. | Before: result detail was an empty fallback despite available lab data. Project the real result rows; preserve result and abnormal trend at acknowledgment. |
| `w2Message` | Result context, result-note templates, patient communication draft, return to review. | Before: generic message screen. Use Result Note terminology. Return uses the entered message; it does not independently claim delivery. The acknowledgment writer persists the communication. |
| `w5Rooming` | Complaint, dated metric growth measurements, allergies and medications with review actions. | Before: growth chart duplicated the dedicated Growth screen and the complaint followed measurements. Keep rooming focused and retain the separate Growth activity. |
| `w5Growth` | Dated measurements/series, available source percentiles, last visit. | Before: a raw measurement table was labeled “Percentiles.” Never imply a percentile or normal curve without a named reference. |
| `w5Note` (new) | History context, HPI, ROS, exam, encounter diagnoses, Assessment & Plan, anticipatory guidance. | Previously all documentation first appeared during visit close. A dedicated Visit Note section precedes prescribing; the same required captures and template confirmations remain. |
| `w5Orders` | Current kg dosing weight, mg/kg basis, calculated check, entered mg dose, prescription details and pending orders. | Keep the separate mg entry and explicit pharmacy confirmation. Do not replace clinician-entered dose with an automatic acceptance. |
| `w5Sign` | Every order, current kg weight/dose check, allergies/medications and other required reviews, identity, Sign Orders. | Preserve stale-weight, lb and range guards; weight-based review has no receipt substitute. |
| `w5Immunizations` | History and supplied forecast, allergies, product/manufacturer/lot/site/route/provider, separate VIS section, Record immunization. | Before: vaccine and VIS fields were mixed in one group. The new grouping preserves every required field and the separate vaccine signature. |
| `w5Close` | Note review, Level of Service, Follow-up, family AVS instructions, Edit visit note, Sign Visit. | The clinical note is now composed before orders and reviewed here; no duplicate human entry is added. |
| `w7Queue` | Rx Request folder counts, message list and selected prescription request, Review request. | Before: a generic refill table without source context. Retain actual request status and medication identity. |
| `w7Review` | Request, last visit/labs/fills/meds/prior-note reports, review receipts, Respond to request. | Keep the baseline's optional report tabs and separate response step. Fills are sourced from MedicationDispense; an active prescription does not prove a fill or adherence. |
| `w7Decision` | Requested/current/proposed comparison, relevant labs, last visit and fill history, protocol check, response fields, Approve / Sign Rx and the existing separate denial action. | Required reviews stay expanded on the response screen. Modification uses the existing semantic prescription path; no label may turn a Schedule II refill into a valid renewal. |

### Data and presentation integration

The presentation lane's [contract](presentation-contract.md) is selected by
`present.schedule`, `present.messages`, `present.folderList`, `present.growth`
and `present.table` tags. Worklists are read-only; adjacent real goto controls
open the selected encounter. An “Open” string in a table is never a fake control.

The separated `Fhir.Ambulatory` projections add source Appointment rows, Task
rows/counts, actual refill-focus resolution (including contained resources),
result details/ranges/flags, prior visits, MedicationDispense fill history and
supplied immunization forecasts. Result Task inputs/report references select
the current report; its trend includes historical observations of those same
analytes, without pulling unrelated tests into the selected report. Relative and
transaction-bundle UUID references are matched without exposing IDs as cells.
Missing records stay absent. The three new optional info declarations are
`inBasketFolders`, `inBasketResults` and `inBasketRxRequests`; they add no entry, review,
permission, alert or D rule. `V1.lean`, properties and trusted statements are
unchanged. The live adapter combines these Lean projections with explicit
version-bound context, giving an explicit payload precedence for the same info.

Review inputs use the existing world-2 seeder and Synthea cohort via
`scripts/realism/ambulatory-fixtures.mjs`, without a backend or new clinical
choices. Screenshots are 1440×900 in `app/shots/realism/amb/`.

### Baseline effort before this pass

Measured with `ehr min-clicks` through `pnpm complexity --release-root releases`
on the existing fixed benchmark cases, before ambulatory program changes.
These are certified minima **within the reported directed search spaces**, not
global UI optima. KLM estimates effort on the minimum-click path, not elapsed
clinical time or a separate time minimum. Keystrokes are minimized separately.

| Release | Workflow | Clicks | Keystrokes | KLM seconds |
| --- | --- | ---: | ---: | ---: |
| v1/v2 | W1 | 39 | 202 | 143.20 |
| v1/v2 | W2 | 7 | 40 | 21.45 |
| v1/v2 | W5 | 48 | 245 | 175.45 |
| v1/v2 | W7 | 12 | 12 | 27.50 |
| v3 | W1 | 39 | 202 | 143.20 |
| v3 | W2 | 7 | 40 | 21.45 |
| v3 | W5 | 49 | 250 | 179.80 |
| v3 | W7 | 12 | 12 | 27.50 |

The measurement adapter now explicitly uses `lean -j4`; its 8 GB address-space
limit also needs `LEAN_STACK_SIZE_KB=8192` in this environment. This corrects a
thread-creation failure without changing the search, choices or KLM model.
After metrics, visual findings and gate results are recorded below as completed.

The FHIR distinction between prescription, dispensing and administration is
also checked against the [HL7 R4 MedicationDispense specification](https://hl7.org/fhir/R4/medicationdispense.html).
Forecast fields follow [HL7 R4 ImmunizationRecommendation](https://hl7.org/fhir/R4/immunizationrecommendation.html),
including its point-in-time status and recommendation authority. No forecasting
algorithm or clinical protocol thresholds are added by this UI work.

### After effort measurement

The final `ehr min-clicks` / `pnpm complexity` run preserves every ambulatory
baseline metric above: clicks, independently minimized keystrokes, KLM, visited
screens, required fields and popup counts. The full per-release comparison and
binary/suite/report hashes are in [amb-realism-metrics.json](amb-realism-metrics.json).
The full after report is [canonical-complexity.json](../../programs/benchmarks/canonical-complexity.json).

An intermediate version exposed Sign Orders as a navigator destination and
reduced W1/W5 minima by two clicks. Visual and effort review rejected that
shortcut. The final left navigator lists clinical sections; Order Review and
Sign Orders remain actions reached through the composer. In Basket navigation
lists folders rather than processing stages. This preserves the baseline's
ordinary extra review step, separate result-note return trip and refill response
step. The new pediatric note activity relocates existing captures and templates;
it does not add a second clinical note or automate a signature.

| Release | Workflow | Before → after clicks | Before → after KLM seconds |
| --- | --- | ---: | ---: |
| v1/v2/v3 | W1 | 39 → 39 | 143.20 → 143.20 |
| v1/v2/v3 | W2 | 7 → 7 | 21.45 → 21.45 |
| v1/v2 | W5 | 48 → 48 | 175.45 → 175.45 |
| v3 | W5 | 49 → 49 | 179.80 → 179.80 |
| v1/v2/v3 | W7 | 12 → 12 | 27.50 → 27.50 |

### Screen-by-screen visual review

Every pair uses native Lean output and the same production painter at 1440×900.
The before program is `add0d2e`; both phases receive the same existing world-2
task/cohort sources, including actual seeded Appointment/Task/result records.
The files follow `app/shots/realism/amb/{before,after}-<persona>-<screen>.png`.
There is no before image for the new `w5Note`; its source fields previously lived
on `w5Close`. Additional signature views show the safety footer on long screens.

| Screen | Observed before → reviewed after |
| --- | --- |
| P1/P4 `home` | Empty day-list fallback → supplied, dated appointments with booked status preserved. The adjacent activity opens the chart encounter; rows are read-only under the shared contract. |
| `w1Rooming` | Repeated workspace navigation and an intake form dominated by vitals → real section rail, complaint first, metric vitals, allergy review, screenings/pharmacy and health maintenance. |
| `w1MedRec` | Generic Med rec → Medication Review, complete medication rows and explicit reconciliation/review actions; optional reports remain tabbed. |
| `w1Hpi` | Short single-line note fields → separate multiline HPI and ROS editors, note tools and optional history tabs after the editors. An initial full history table above the editor was rejected because it displaced documentation. |
| `w1Exam` | Undifferentiated exam/plan form → physical-exam and Assessment & Plan sections, diagnosis and a full-width narrative plan; optional problems can be expanded. |
| `w1Orders` | Navigation mixed with composer actions → section rail and a focused full-width composer, retaining the preference list, dose entry, pharmacy confirmation, pending orders and separate review path. |
| `w1Labs` | Loose ordering fields → named order details with diagnosis association, recent results and pending orders; return/sign actions remain real interpreter controls. |
| `w1Verify` | Generic verification → Order Review with pending orders, allergy evidence and the baseline reconfirmation before Sign Orders. |
| `w1Sign` | Crowded shell → full-width clinical review and a separate signature footer. Required orders, allergies, medications, dose check, CURES and applicable alerts remain before the human signature. |
| `w1Close` | One closing form → note review, Level of Service, Follow-up and multiline Patient Instructions / AVS, then Sign Visit. |
| `w2Inbasket` | Empty generic message view → actual folder counts, received/patient/subject/priority/status list, selected-message preview and Review result. UUID reference normalization fixed an initially empty supplied queue. |
| `w2Result` | Empty detail fallback and unrelated analytes in a generic chart → the selected report's result, original range/flag/status/timestamps, and only the selected analyte's dated history; follow-up and Result Note actions stay adjacent. |
| `w2Message` | Generic message input → Result Note templates and multiline patient communication, with an honest return-to-result action. |
| `w5Rooming` | Duplicate growth chart above intake → complaint, kg weight and growth measurements, allergy review and medication reconciliation; Growth Charts remains its own activity. |
| `w5Growth` | A raw series called Percentiles → dated growth measurements, separately named available percentiles, and last-visit context. No CDC/WHO curve or patient percentile is invented. |
| `w5Note` | Documentation first appeared at visit close → a dedicated pre-order Visit Note with multiline HPI, ROS, exam, plan and anticipatory guidance. History reports follow the editors. |
| `w5Orders` | Generic dose preview → current kg weight and its measurement provenance, mg/kg/dose basis, calculated mg preview, separately entered dose, frequency/day amount and configured checks. No preview accepts the dose for the clinician. |
| `w5Sign` | Generic weight-only dose check → the same explicit kg/dose calculation at signing, full required reviews, alerts and human identity/signature. |
| `w5Immunizations` | Vaccine and VIS fields mixed → complete history plus supplied forecast, administration details, a separately labeled VIS section, then Record immunization. |
| `w5Close` | Clinical note mixed with charges → review of the previously composed note, Level of Service, Follow-up, multiline family instructions, Edit visit note and Sign Visit. |
| `w7Queue` | Empty generic refill fallback → counted Rx Requests and the actual referenced prescription/sig/request date/status; no first-medication substitution. |
| `w7Review` | Generic chart-review labels → request-specific context, last visit/labs/fill history/medication/note tabs, review receipts and Respond to request. |
| `w7Decision` | Sparse context → requested/current/proposed comparison, actual request, labs/last visit/fills, protocol attestation, response fields and separate guarded approval/denial. Required reports stay expanded. |

The review removed an optional duplicate full-chart rail in encounter workspaces.
The program's `layout.focusedWorkspace` tag suppresses only synthesized default
summaries in Lean; explicit side content, reported home medications and all
required commit reviews remain. React draws the resulting tree. Narrative editor
kinds also come from Lean; all entered text, newlines and confirmations use the
existing interpreter events.

The shared shell still needs its role/weight/isolation banner and activity-tab
polish, and the tagged structured widgets will replace the generic drawing when
the presentation lane is integrated. Those integration points are recorded in
[changes-requests.md](changes-requests.md#amb-realism-integration-2026-11-01).

### Verified ambulatory milestone

The reproducible commands, source/runtime fingerprints and all 50 world-2 day
totals are recorded in [amb-realism-validation.json](amb-realism-validation.json).
The final baseline passes:

- Lean default build, default-kernel `lake check`, core Comparator, and D1–D6
  regression/proof builds, with only the existing three permitted axioms.
- **15/15** persona certifications across all three releases, **18/18** core
  bad programs rejected, and **1,284/1,284** world-2 tasks completed. No simulator
  policy changed; the replay uses v1 on days 1–3, v2 on days 4–6 and v3 thereafter.
- **226** native button controls audited (**218** enabled controls change actual
  interpreter state; the other eight carry explicit blocking reasons). The
  browser dispatch audit checks the exact declared events on all 24 screens.
- **24** after screenshots, **23** before screenshots and two signature-footer
  views. Desktop/narrow fidelity, record completeness, legibility, coverage,
  overflow, keyboard/scanner/modal behavior and contrast: **57** browser checks
  pass; three duplicate wide-viewport cases are intentionally skipped in the
  narrow project. Signature capture waits for the identity control to be fully
  in view so a scrolling frame cannot crop away the safety footer.
- Regenerated WASM and `make wasm-check`; archived `run1-P3` **424** tasks /
  **14,658** events plus **3** baselines / **137** events, **0 mismatches**. The
  archived programs remain unchanged. Painter navigation and multiline editors
  emit the same interpreter events and Value constructors.
- App build/lint and **165** tests; agent typecheck/lint and **41**
  tests; **7** seeder tests.

The live-boundary review also removed resource/cohort IDs from displayed result
group labels and MRNs. Actual accession/report names or source test codes identify
result groups; artifact IDs remain in version bindings only. Fill-history review
receipts bind to MedicationDispense records. An empty-chart review uses the
versioned patient anchor, as the existing empty medication/allergy review does;
it makes no claim of a fill or medication adherence, and does not answer the
separate human protocol attestation.

### Structured presentation integration

The presentation milestone (`eb6703e`) is integrated into AMB. The existing
before images remain the original comparison; after images are refreshed with
the shared widget painter, so this second comparison includes its drawing
changes as well as the ambulatory Lean layout/content changes. Folder counts
are now clear list rows, result flags have explicit supplied-value tints, result
trends have dated axes, and growth has separate kg/cm plots with complete data
tables. The duplicated second Growth widget was removed; the single widget
retains every measurement row. Patient percentiles remain uncomputed, and the
current supplied-data view explicitly says when reference curves are absent.

The integration retains the detailed dose check and supplied vaccine forecasts.
Daily dose previews preserve the captured mg/mcg/units; a valid insulin dose is
no longer called incomplete because it is not in mg. Missing numeric limits are
identified as unsupplied, rather than described as an unlimited dose. No clinical
guard changes. A result Task whose references cannot be resolved now supplies an
explicit empty result/trend view; unrelated historical labs cannot replace it.
Relative/UUID references also resolve correctly for external refill orders.

The combined default build, default kernel, core Comparator and **43** frozen
render theorem statements pass. The statement text is unchanged and is compiled
against the current implementation for the comparison; layout definitions are
intentionally different. All **13** widget fixtures agree native-to-WASM.
Certification remains **15/15**, all **18** bad programs are rejected, world 2
remains **1,284/1,284**, all **226** native button controls pass, all **24** browser
screens dispatch correctly, and browser fidelity remains **57** passes / three
intentional viewport skips. The archived trajectory still has **0 mismatches**.
App tests are now **171**. Effort metrics remain identical to the before pass.

The visual review identified a follow-up: the single-series result plot expands
too far vertically in the full-width workspace. It should be more compact so
the follow-up controls remain near the result. The supplied growth measurements
look clearer, but a production baseline also needs properly sourced reference
curves and ordinary coded-field choices, rather than empty pickers.

### Shared shell integration and result density

Integrated the shared clinical shell and the main branch's certified run controls. The shell now supplies a blue application bar, role context, patient identifiers, actual recorded weight and isolation status. Empty navigator groups have no empty heading/list; ordinary navigator links remain real Lean-dispatched buttons. Chart and queue search use the shared Lean query state and source rows rather than inert search decoration.

The Result Review graph previously expanded to roughly 420 pixels high in a full-width panel, with oversized axis labels. It now retains its 700-by-246 drawing scale at desktop widths, with legible ticks and all dated values in the same panel. Removed the second, identical dated-values table from W2; the trend panel itself already retains every source row. Clinical follow-up, patient communication and Reviewed / Done remain separate actions. The workspace badge says Patient chart because an In Basket result is not necessarily an active encounter.

The shell integration retains the required fields, shown-on-commit reviews, human confirmation and modal/passive alert distinctions. The archived trajectory verifier now uses four Lean workers, matching the shared-machine limit. No clinical rule or theorem statement changed. All twelve ambulatory benchmark rows remain identical to the recorded before values. Revalidated 15/15 persona certificates, 18/18 bad rejections, 1,284/1,284 world-2 tasks, 226 native button checks, the default kernel and core Comparator, 43 frozen render theorem statements, 13 native/WASM presentation fixtures, 199 app tests, 84 agent tests and seven seeder tests. The archived run1-P3 verification remains at zero mismatches.

### Row actions, clinical pickers and published growth references

Further primary sources inspected for this increment:

- [CDC growth-chart recommendations](https://www.cdc.gov/growth-chart-training/hcp/overview/recommended.html): WHO standards below age two and CDC charts from age two. Used the published [CDC weight](https://www.cdc.gov/growthcharts/data/zscore/wtage.csv) and [stature](https://www.cdc.gov/growthcharts/data/zscore/statage.csv) percentile samples, not drawn approximations.
- WHO [weight-for-age](https://www.who.int/tools/child-growth-standards/standards/weight-for-age) and [length/height-for-age](https://www.who.int/toolkits/child-growth-standards/standards/length-height-for-age) tables: extracted the 0–24-month 5th/50th/95th samples for both published populations. `generate-growth-reference.py` records all six source URLs/hashes in the generated Lean module. Raw spreadsheets remain outside the repository.
- [HL7 US Core birth-sex extension](https://hl7.org/fhir/us/core/StructureDefinition-us-core-birthsex.html): use an explicit source code to select the reference population. Administrative gender is not substituted for a missing or conflicting code.
- [CMS FY 2027 ICD-10-CM descriptions](https://www.cms.gov/medicare/coding-billing/icd-10-codes) and its linked code-description ZIP: verified the 18 common diagnosis preferences against the published descriptions. This is a preference list with explicit unlisted-code entry, not a complete terminology service. No simulation choices were used to build it.
- Public LOINC definitions for [CMP](https://loinc.org/24323-8), [CBC with automated differential](https://loinc.org/57021-8) and [HbA1c](https://loinc.org/4548-4): verified the code/label mapping for the small lab preference list. Search now reads that order catalog rather than presenting historical lab results as orders.

The production reference pattern is a folder pane beside messages with a separate selected-message report. W2 and W7 now express that composition as Lean columns. Existing folder goto controls live beside their supplied counts; existing Review buttons live in the selected source row. Schedule presets similarly put Open encounter in the appointment row, with In Basket as a separate activity. These actions open the already selected chart's navigator: a displayed patient name never creates an inferred patient switch. Original action IDs and destinations remain stable. The duplicate Rx Requests shortcut and empty, unbacked Catalog results panel were removed; actual search results and order-entry controls remain.

Coded fields now receive typed Lean code/label choices. This includes diagnoses, order routes/frequencies/duration, lab priority, review decisions, screening scores, level of service and follow-up. The original field, human-only/provenance/pending-confirm metadata, Value.code entry, validation and commit requirements remain unchanged. Typing in a picker does not create evidence; selecting a term sends its exact code. An unlisted code requires explicit selection. Closed formulary and dose-unit controls retain their existing behavior. Confirmation buttons stay single and functional through the metadata wrapper.

Growth now has 24 published reference curves with 2,916 samples in the vendor catalog. Lean selects the recorded population, supplied measures and applicable age range. WHO length and CDC stature are labeled distinctly, retain their source age boundaries, and never join into one curve. Reference curves and patient measurements remain separate semantic data; all patient rows stay in the ordinary info table. The browser calculates coordinates only. It does not estimate a patient's percentile. Unknown population data supplies no curve; missing dates do not become newborn age zero. Explicit meter/inch heights convert in Lean before rounding; an unlabelled height is not assumed to be centimeters. Clinical weight confirmation and dose checks are unchanged.

The allergy banner now summarizes substances and non-active status instead of repeating lengthy reactions in the header. Complete reactions/status remain in allergy lists and required reviews. This reduces the pediatric header's height without concealing the allergy list or changing alerts.

| Screen | Further before → after review |
| --- | --- |
| P1/P4 Schedule | Separate Schedule button → the original encounter opener in the actual appointment row; separate In Basket activity controls. |
| W1 Rooming / Medications | Bare coded entry → labeled screening/reconciliation choices; source human confirmations retained. |
| W1 Exam / Assessment & Plan | Empty diagnosis selector → searchable common ICD-10 preferences and explicit unlisted-code entry. |
| W1 Orders | Empty catalog panel → actual source search results; labeled route/frequency/duration choices around unchanged order fields. |
| W1 Lab Orders | Historical-result search → LOINC order preferences, with the same required diagnosis and priority fields. |
| W1 Sign Visit | Bare charge/follow-up codes → labeled choices; all required reviews and identity/signature inputs retained. |
| W2 In Basket / W7 Rx Requests | Stacked folder/list panels and detached open buttons → Lean columns and original row actions. |
| W2 Result Review | Bare action/test selectors → labeled follow-up choices; Reviewed / Done and separate Result Note path retained. |
| W7 Rx Response | Bare decision code → Approve/Deny/Modify choices; the separate guarded denial and signing actions remain. |
| W5 Growth Charts | Patient-only plots → published, sourced reference bands alongside the unchanged measurement table. |
| W5 Rooming / Visit Note | Long allergy reactions in the header and bare diagnosis code → compact substance/status header and labeled diagnosis choices; full allergy review remains. |
| W5 Orders / Immunizations / Sign Visit | Shared compact header and coded preferences improve reading; measured kg weight, dose preview, VIS and signature safeguards retain their source controls. |

No new design rule was introduced. The 107 pre-existing render theorem headers are byte-identical to the integrated source; the frozen Comparator audit covers the prior 43 statements plus the presentation lane's two row/column retention statements. The new metadata wrappers have explicit all-child-retention proofs. Native and WASM agree on 26 current ambulatory renders, 39 pickers and 12 selected reference curves, including actual navigation and the unknown-population case. Final visual/gate totals are recorded in `amb-realism-validation.json`. Final self-review caught a too-wide nested folder pane and a collapsed action column: the folder-column selector now follows the actual nested semantic structure, six-column message widths reserve room for Actions, and prescription previews with additional fields retain all columns. Explicit urgent/requested statuses use the shared red/blue tints, with the original words retained. All 24 screen/event checks pass at 1440×900, including two signature views and two open diagnosis-picker views; the independent desktop/narrow fidelity gate passes 57 checks with three intentional duplicate-probe skips. The combined source passes the default build, kernel, both Comparators, certification 15/15, bad rejection 18/18, World 2 1,284/1,284, 237 native button checks, 215 app tests and 84 agent tests. Archived run1-P3 still has zero mismatches. All twelve ambulatory click/keystroke/KLM rows remain identical to the original before values.

### Persistent clinical frame refinement (M05)

The numbered progress strip resembled a sequential wizard above a production-style section navigator. Ambulatory source banners now explicitly request `layout.clinicalActivity`; Lean omits only the read-only progress overview. Every real navigator destination and clinical control remains in the semantic tree. A stable optional screen identity lets the painter reset scrolling when destinations share the same title, without rendering internal IDs. Screens with no navigator entries no longer draw an empty navigation panel.

The existing EHHOP navigator and WRMS In Basket references support keeping chart identity and activity navigation beside long documentation. At desktop width the banner and navigator now stay visible while scrolling; the painter measures geometry only. Small viewports or unusually tall banners use ordinary page flow so patient context cannot cover the editor. Scroll padding keeps focused controls below the pinned banner. The screenshot review includes long growth review, refill decision, and clinician signature views.

Banner self-review also found that a historical encounter clinician could be shown as an assigned PCP. The projection now requires `Patient.generalPractitioner` evidence, resolving its human-readable reference if present; an unassigned PCP remains explicitly unrecorded. Latest-record context is labeled “Last encounter”, “Last provider”, and “Last location” instead of claiming an active visit or attending assignment. This follows [HL7 R4 Patient](https://hl7.org/fhir/R4/patient.html). Recorded pounds are additionally displayed in kg using the exact 0.45359237 conversion from [NIST Handbook 44 Appendix C](https://www.nist.gov/document/2026-nist-handbook-44-appendix-c), rounded to one decimal, with source pounds and date retained. This display conversion neither changes the clinical weight fact nor supplies human confirmation for pediatric dosing.


The shared per-observation laboratory projection is also used by ambulatory selected-result detail/trends. Same-analyte records at the same time remain distinct; components, comparator text (such as `<5`), source units, reference text, flags, and status survive. Task references still constrain the selected report. Named regressions cover duplicate records, mixed units and a censored component. In Basket self-review removed a repeated synthetic folder “Status” caption and flattened nested card borders; all folder names/counts, message data and actions remain visible.


M05 verification at combined source `2e6cef0`: default build, kernel replay, root Comparator and **48** frozen renderer statements pass; **116** earlier named theorem headers remain unchanged. Certification is **15/15**, bad programs **18/18** rejected, World 2 **1,284/1,284** complete, native buttons **237** checked (**229** enabled / **8** explicitly blocked), and actual native/WASM navigation agrees on **26** views with **39** coded pickers and **12** selected reference curves. App build/lint and **216** tests, **84** agent tests with typecheck/lint, all **7** seed tests, **24** screen/event checks and **57** fidelity checks pass (three duplicate narrow probes intentionally skipped). Archived replay retains **0** mismatches. All **12** ambulatory release/workflow effort measurements still equal the original baseline. Captures now total **53**: 23 before, 24 after, two signature views, two open diagnosis pickers and two scrolled-context views at 1440×900.

The M05 refill review identified the empty optional comparison and the need to distinguish its latest lab evidence from full chart history. Both are addressed by M06 below.


### Refill evidence and response refinement (M06)

Additional references reviewed:

- [Tower Health In Basket Guide for Providers (2021), publicly hosted by General Pediatrics](https://www.genpeds.com/wp-content/uploads/2021/08/In-Basket-Guide-for-Providers-1.pdf), pp. 2 and 8–9: folder/message/body hierarchy, prescription details, editing before signing, and a separate refusal reason. These are deployment-specific patterns; no logos, screenshots or text assets are copied into the repository.
- [UCSF-hosted medication refill standing order (2011/2012 historical document)](https://cepc.ucsf.edu/sites/g/files/tkssra17936/files/Standing%20Order%20-%20Med%20Refill.pdf), pp. 1–2: review of prescription, visits and monitoring evidence, with explicit routing exceptions. This is a historical layout/content reference, not a current clinical protocol or new rule for the experiment.
- [Penn Medicine refill-protocol implementation study (2022)](https://pmc.ncbi.nlm.nih.gov/articles/PMC9646402/): separates temporal evidence from measurement criteria and describes local protocol governance. The UI displays evidence and keeps the existing human protocol check; it does not infer that a medication-specific protocol passes.

The Rx response now leads with the actual request, then a four-row comparison for dose, quantity, refills and pharmacy, followed by the response editor. Chart evidence and both original approval/denial paths remain on the screen. The comparison uses the Task's focused prescription; an active linked prior prescription is used only when explicitly supplied. A similarly named medication is not substituted. Explicit patient conflicts are rejected. Missing units and quantities remain unknown, zero refills remain zero, and a pharmacy reference resolves only to supplied human-readable data.

The response column reads the interpreter's actual captures. It never copies requested values into the response, confirms a prefill, records a review or signs an order. Unconfirmed captures remain labeled. A supplied draft proposal survives alongside the entered response; the new `uiRefillComparison_preservesSource` theorem protects every clinical source cell, including duplicate keys. The existing `refillComparison` payload schema is satisfied without changing the spec. Its empty-entry marker is presentation metadata, not a proposed prescription.

A last-fill date requires a completed MedicationDispense with a handed-over date and an explicit prescription link or matching medication code/system. A newer fill for another drug, an in-progress dispense or a MedicationStatement cannot supply it. Request details also show the last recorded encounter; the detailed encounter panel includes its setting so an emergency visit is distinguishable from ambulatory care.

Visual review exposed an overly long refill evidence panel after full result-history integration. “Latest available labs” now selects the latest dated source records per coded analyte, retaining ties, components and unknown dates/identities. Full history remains in Chart Review and selected-result trends. This restores the intended evidence summary without truncating its rows or weakening any review requirement. The layout has no new shortcut or automatic capture.

Coverage now includes P4's Results and Rx Request activities as well as its actual pediatric schedule. World 2 assigns P4 only W5 on these sampled days; the extra cases are explicit NP permission/render probes using unchanged P1 source records, not claims of NP-assigned world tasks or a pediatric clinical scenario. `review-cases.json` records that distinction. Native navigation follows goto targets in both presets.


M06 screenshot review: `w7Queue` now names prescription status, last fill and last encounter explicitly; absent pharmacy/fill data stay unrecorded. `w7Review` retains its separate review tabs and receipts. `w7Decision` places the request, comparison and response fields in the first viewport, with latest lab evidence, encounter setting, fill history, alerts and signing/denial actions below. The P4 Results/Rx views use the same canonical sections under NP permissions. No new shortcut is introduced. The denial-reason required marker is still action-scoped by the interpreter; improving its conditional presentation remains a visual follow-up, not a change to approval or denial requirements.

Every before capture was reconstructed again from `add0d2e` using the current shared painter and the same raw FHIR inputs as its after view. This controls the painter for the final layout comparison. Earlier historical before images, including their original gray styling, remain in Git at `b9f4465`. There are 29 reconstructed before screens and 30 after screens; the new Visit Note has no prior standalone screen.


M06 verification at combined source `598c7b2`: default build, kernel replay, root Comparator and **51** frozen renderer statements pass. All **123** previously named render theorem headers remain unchanged. Certification is **15/15**, bad programs **18/18** rejected, and World 2 completes **1,284/1,284**. Native button checks cover **277** interactions (**266** enabled / **11** blocked with reasons). Native/WASM agrees on **34** views, **42** coded pickers and two actual dose-entry/response checks, plus all **15** shared structured examples and legacy decoding. App build/lint and **217** tests, **84** agent tests with typecheck/lint, **30** after-screen/event audits, **29** reconstructed before views and **69** fidelity checks pass (three duplicate narrow probes skipped). All **12** ambulatory effort records remain identical to the original baseline, and archived replay has **0 mismatches**. The **66** captures include three scrolled-context views. A reproducible comparison against the original binary finds **0** primitive-clinical-fact mismatches across all **324** Synthea/synthetic-hospital bundles; supporting payloads/bindings and record version aliases are explicitly outside that comparison and are covered by the separate runtime/checker tests.


### Main integration and ambulatory vital-value consistency (M07)

Main's grouped semantic navigation is integrated while retaining the ambulatory frame's measured sticky header, optional screen identity and absence of empty navigation. Navigation sections now carry their actual group names in the accessibility tree, with decorative clinical icons; every link still sends its original component ID. The shared accessible label is “Clinical navigation”.

A direct comparison exposed a display inconsistency: the same explicitly coded diastolic-first BP appeared as `76/128` in ambulatory vitals and `128/76` in typed observation rows. The [HL7 R4 BP profile](https://hl7.org/fhir/R4/bp.html) defines coded, unordered components. Ambulatory vitals now use that coded interpretation. Ambiguous panels and mixed units retain individual names, values and units; censored and absent-reason values stay explicit. Extra components remain visible. This changes display projection only, not clinical guard facts or captured vitals.

The existing synthetic clinical fixture had an uncoded component array while asserting a known systolic/diastolic reading. Its intended values remain 128 and 82; explicit component codes now supply their meaning, and the original `128/82` assertion is unchanged. Separate adversarial examples ensure uncoded, reordered and mixed-unit records cannot acquire a false slash-pair meaning. Native/WASM also exercises a reversed-component input.

The refill denial field now reads “Reason for denial (if denying)”, clarifying which action requires it while preserving the field, required marker and both commit paths. The current model does not provide a general captured-value visibility condition; no new core visibility rule or relaxed requirement was introduced for this wording change.


M07 verification (source `1fbcd8d`): default Lean build, kernel checking, root Comparator and all 51 frozen renderer theorem statements pass; 127 existing theorem headers remain unchanged. Certification is 15/15 with all 18 bad programs rejected; all 1,284 world-2 tasks complete. The native button audit covers 277 controls (266 enabled transitions and 11 disabled with reasons), native/WASM parity covers 34 screens plus the reversed-component BP regression, all 15 structured fixtures pass, and browser fidelity passes 69 tests with three intended viewport skips. Thirty current screen captures were refreshed at 1440×900. App tests pass 217/217, agent tests 84/84, archive verification has zero mismatches, and all 324 primitive clinical fact projections match the original baseline. All twelve AMB effort records remain identical to the recorded before values. The optional shared-shell screenshot test was skipped because its opt-in capture flag was not set; the AMB screen and fidelity suites ran fully.

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

### Source row actions and main's personalized presentations

Merged main's versioned presentation support at `7a478ac`. Its declarative wrappers and tests coexist with the structured clinical renderer; neither replaces the other's semantic controls. The combined app passed **183** tests and the agent **73**, and archived `run1-P3` remained at **0 mismatches** before this increment.

The CST perioperative-tracking guide separates a row's patient information from the chart-opening arrow. The new additive row-action contract follows that distinction: an existing source button explicitly identifies its info component and source-row index, and Lean emits a transparent `rowAction` wrapper. React places the original button in that row. The worklist example opens MAR, assessment and vitals screens, each with a real return control. No patient switch or new event is inferred from the displayed patient name. Missing targets, invalid/out-of-range rows and unsupported chart/note views retain the action inline. Multiple controls retain their source order. Unit tests cover exact-once dispatch through nested presentations and all three fallback cases; the native/WASM comparison checks all three actual transitions. The browser audit independently clicks all three row buttons and their return buttons at both widths and checks each resulting semantic screen.

All **89** pre-existing named render theorem headers are byte-identical to the initial lane base. The Comparator audit additionally includes the column-retention and row-wrapper-retention helpers. No specification, clinical guard, D-rule or simulator policy is changed. The third efficiency run, including native `ehr min-clicks`, matches all **21** release/workflow metric records exactly; the frozen historical benchmark artifact was restored after collecting the new measurement in `/tmp`.

This increment passes the default build, `lake check`, root Comparator and all **45** renderer Comparator statements. Certification remains **15/15**, bad programs **18/18** rejected, World 2 **1,284/1,284**, and the rebuilt WASM passes its manifest check. The native/WASM corpus matches all **15** presentations and row transitions, **324** fact bundles and **652** canonical render variants, including RN scanning. The shared default `/tmp/vgi-render-api` contained stale P1 golden files; the full comparison was rerun against the lane-local corpus with the exact current app goldens and passed without changing an assertion.

App build/lint and **186** app tests pass; all **73** agent tests pass. The 15 new examples plus five original screens pass **49** desktop/narrow fidelity checks, with three intentionally skipped duplicate probes. All **30** before/after screenshot checks pass at 1440×900, and both browser row-action audits pass. The screenshot shows the three original actions once each in their intended task rows, with the original labels and due/overdue/scheduled text. Archived `run1-P3` still verifies **424** tasks / **14,658** events plus **3** baselines / **137** events with **0 mismatches**.

### MAR date headers and row-tag transport

The next MAR review replaces the repeated full date in every hour header with one date band above its supplied hours, following the public MAR references. It preserves source order across multiple dates and leaves undated columns explicitly labeled. A regression example covers two dates and an undated administration. The new 1440×900 `timeGrid.png` shows all four medication rows and the beginning of the complete administration documentation in the first viewport.

Lean now declines row tags beyond JavaScript's exact integer range and emits the original button instead. This is transport handling, not a clinical or design rule. Native/WASM tests exercise both the first unsafe integer and a 512-digit index, retaining `Open MAR` as an ordinary working control. All previous semantic theorem statements remain unchanged.

Default build, kernel replay, both Comparators, certification **15/15**, bad-program rejection **18/18**, World 2 **1,284/1,284**, all **324** native/WASM fact bundles and **652** canonical variants, and archived replay **0 mismatches** pass again. App build/lint and **187** tests, **73** agent tests, both browser action audits, all **30** screenshot checks and **49** desktop/narrow fidelity checks pass. There are three intentionally skipped duplicate narrow probes. The painter still uses the shared clinical CSS variables, including semantic status inks/tints; there are no new controls or click-path changes.

### Per-result units and complete report history

Source review found that the legacy lab trend kept only a date and numeric value, then labeled every historical point with the latest result's unit. The aggregate also omitted qualitative historical values and repeated the latest numeric result in the table. The new typed `LabResultRow` projection retains one row per valid observation plus its components, with each result's own value, unit, interval, interpretation, status and time. Legacy aggregates remain available, and the clinical `Facts` objects were compared before/after across all **324** bundles: they are unchanged.

This follows [HL7 R4 Observation](https://hl7.org/fhir/R4/observation-definitions.html), which ties values, interpretations and reference intervals to each observation and gives components their own values/ranges within report context. [FHIR quantity and sampled-data definitions](https://hl7.org/fhir/R4/datatypes-definitions.html) support preserving comparison operators and supplied scale/timing rather than presenting a censored/complex result as an exact scalar. Source interpretations stay authoritative; display-only inference declines incompatible units, censored values and ambiguous/population-specific or non-normal intervals. No clinical guard or Facts calculation is changed.

The fictional visual record now includes hemoglobin in g/L in an older report and g/dL in recent reports, a `No growth` urine culture and a `<5` urine-protein result. The codes were checked against the primary [LOINC culture entry](https://loinc.org/630-4) and [LOINC urine-protein entry](https://loinc.org/2888-6). The trend must show separate hemoglobin plots; neither qualitative nor censored values may become numeric points. Results use wider test names and compact flag/unit columns, retaining every source field and any ordinary row actions.

The RN flowsheet fixture is now scoped to vitals and I&O, includes blood pressure and kg weight, and uses human temperature/score units. Ordinary final charting does not repeat the technical word `final` in every value cell; corrected/nonfinal status stays visible. Lab report status remains explicit. Nurse widgets use an RN input, growth uses an NP input and surgical examples use a surgeon input. The ED banner now selects the active patient's own encounter while the supplied department board retains all its rows. All fixtures are still generated through Lean.

The result and flowsheet before/after screenshots at 1440×900 now show the complete mixed-unit history and a clean nine-row nursing grid. Review also identified the next polish tasks: department boards need more workspace width, and the single-result trend axis needs distinct numeric ticks and its full recorded date. These are recorded here rather than treating a passing overflow check as sufficient visual quality.

Validation passes the default build, kernel replay, root Comparator and all **48** renderer Comparator statements. All **89** original named render theorem headers remain byte-identical. Certification is **15/15**, bad programs **18/18** rejected and World 2 **1,284/1,284** complete. Native/WASM matches all **15** layouts, their legacy-Display defaults and actual row transitions, **324** fact bundles and **652** canonical variants. All **21** release/workflow click and KLM records remain unchanged. App build/lint and **187** tests, **73** agent tests, both browser action audits, all **30** screenshot checks and **49** desktop/narrow fidelity checks pass; three duplicate narrow probes are intentionally skipped. `make wasm-check` confirms the rebuilt assets.

The archived `run1-P3` verification also completes with **0 mismatches** across **424** tasks / **14,658** events and **3** baselines / **137** events.

### Overview width and chart axes

The [CST ED LaunchPoint overview](https://cstcernerhelp.healthcarebc.ca/Applications/FirstNet/ED_LaunchPoint/ED_LaunchPoint_Overview.htm) describes a unit-wide landing list and explicitly recommends maximizing its viewing area. Its board separates patient demographics, chief complaint, assignment, order progress and disposition/status. The prior widget had those columns but squeezed them beside automatic single-patient summaries, breaking words such as `Complete` across lines. The new optional Lean `layout.overview` hint leaves that automatic summary space to the department list. Explicit source panels/controls and required reviews still appear; a named commit-review example and the original proofs cover that distinction. The CST reference uses CTAS, while this fictional payload explicitly supplies ESI; the renderer preserves the supplied acuity system.

The same opt-in applies to the Schedule, OR Schedule and message-list examples. The composed In Basket retains its semantic folder pane and message list, following the UVM reference, but gains the chart-summary width. Chart-oriented MAR, flowsheet, growth, Results, Notes and patient worklist examples keep their patient summaries. Previous drawings are retained locally as `*-pre-overview.png` alongside the new 1440×900 screenshots.

The trend screenshot exposed duplicate rounded numeric ticks around a single `120 g/L` observation and a clock-only label that concealed its older date. The drawing now uses distinct readable numeric intervals and retains the complete date/time for a single result. Growth age labels select supplied measurement ages instead of invented fractional ages between them. These are geometry/label changes only; neither source values nor clinical reference intervals change, and every source/reference row stays in its table.

| Screen | Previous drawing | Reviewed drawing at 1440×900 |
| --- | --- | --- |
| Schedule | Eight columns shared the workspace with automatic chart summaries. | The six appointments use the full overview width; visit type, complaint and location remain readable together. |
| ED board | Thirteen columns broke chief complaints and status words. | All thirteen columns are readable in one compact grid; room, acuity, assignments and order status remain distinct. |
| OR schedule | Procedure rows had unnecessary chart-summary competition. | The six supplied columns have full overview width, retaining complete procedure names and status words. |
| Message list | Single-patient summaries consumed queue width. | All six message columns retain their supplied detail in the overview workspace. |
| Composed In Basket | Status wrapping pushed the fourteen-message list below the first viewport. | The folder pane and all fourteen supplied messages fit the viewport; counts and unread values remain supplied data. |
| Result trends | A single point had repeated rounded Y labels and only a clock on X. | Numeric ticks are distinct, and the older result displays its full recorded date/time beside separate unit-specific series. |
| Growth | Interpolated fractional-month labels were awkward to scan. | Six recorded ages label the curves; weight/height plots, reference bands and all measurement/reference tables remain present. |

After merging main's overnight-run fixes, the default build, `lake check`, root Comparator and **48** renderer statements pass. All **89** original theorem headers remain unchanged. Certification is **15/15**, bad programs **18/18** rejected, World 2 **1,284/1,284**, and archived `run1-P3` has **0 mismatches**. Rebuilt native/WASM agrees across **15** examples, **324** fact bundles and **652** canonical variants. App build/lint and **188** tests, **82** agent tests, both row-action browser audits, all **30** screenshot checks and **49** desktop/narrow fidelity checks pass, with the same three intentionally skipped duplicate probes. All **27** benchmark task metric records and full native minimum-click paths are unchanged across **21** release/workflow groups. The historical benchmark artifact is retained unchanged.

### Whole-chart flowsheets and note detail

The [FHIR Observation definition](https://hl7.org/fhir/R4/observation-definitions.html) explicitly identifies category as a way to select displayed observation collections and requires component code/value pairs to retain their meaning. The [R4 blood-pressure profile](https://hl7.org/fhir/R4/bp.html) defines its systolic and diastolic slices as unordered. The old generic reader joined any component array with slashes; it could reverse a BP pair or turn an assessment into an unlabeled sequence. The new display projection uses coded BP meanings, retains every component with its own label/unit, and preserves boolean, qualitative, censored and absent-reason assessment values. Ambiguous, incomplete or mismatched-unit pairs stay as component detail. No clinical Facts calculation changes.

The nursing fixture now supplies the whole adult chart, including laboratory observations, rather than filtering those observations before rendering. Source categories keep laboratory-only values in Results and nursing/vital values in the default flowsheet. All valid observations and components still survive into Display, with new component/cardinality theorems; legacy JSON rows with no category keep their previous inclusion. Explicit payloads continue to show their full supplied rows.

The [CST documentation guide](https://cstcernerhelp.healthcarebc.ca/Patient_Chart/Notes/Dynamic_Documentation_%28Providers%29.htm) emphasizes note title, date, type, authorship and clinical sections for scanning and reading. Our note card instead appended empty import metadata and prefixed a single untitled body with an artificial attachment heading. The revised semantic rows omit only absent optional metadata; actual original-date/shift values and all titled/multiple attachment boundaries remain. The complete note body is retained.

Time-series geometry now sorts supplied coordinates before drawing a line. This prevents unordered source rows from drawing an artificial backtracking path. The source table order and every value remain unchanged; a regression example checks both behaviors.

| Screen | Previous drawing | Reviewed drawing at 1440×900 |
| --- | --- | --- |
| Flowsheet | A prefiltered nine-row fixture masked how a whole chart would mix labs into nursing data and omit assessment-component detail. | Whole-chart input produces eleven nursing rows, including the explicit systolic/diastolic components, across the same three times; all fit the viewport. Laboratory records remain in Display and Results. |
| Notes | A generated Attachment 1 line and empty Source date/Unknown Shift days footer surrounded the clinical text. | The complete SOAP body, author, date, encounter, title and status remain; absent optional import fields add no clutter. |
| Trend and growth | The supplied fixtures were already ordered, so their traces looked correct, but arbitrary row order could backtrack. | The current traces and all source/reference tables remain visually consistent. An unordered three-date regression now verifies chronological geometry and unchanged source-table order. |

This increment passes the default build, kernel replay, root Comparator and all **50** renderer statements, including component completeness and observation cardinality. The original **89** theorem headers remain unchanged, and all **324** clinical Facts objects match their saved pre-change values exactly. Certification is **15/15**, bad programs **18/18** rejected, World 2 **1,284/1,284**, and archived replay has **0 mismatches**. Rebuilt native/WASM matches **15** presentations, legacy category/Display decoding, **324** fact bundles and **652** canonical variants. App build/lint and **189** tests, **82** agent tests, both row-action audits, all **30** screenshot checks and **49** desktop/narrow fidelity checks pass, with three intentionally skipped duplicate probes. All **27** benchmark task metrics and full native minimum-click paths remain unchanged across **21** release/workflow groups.

## Shared shell, visual system and UI browser

Lane: `lane/app`, 1 Nov 2026. The shared painter remains a projection of Lean's `UiScreen`. The new indigo application bar, blue activity strips, tinted patient banner, role colors and green signing actions are original VGI choices; no source assets are included.

References inspected:

- [CST Provider View](https://cstcernerhelp.healthcarebc.ca/Patient_Chart/Workflow_Pages/Provider_View/Overview_of_Provider_View.htm), including its linked public screenshots: distinct application toolbar, persistent encounter banner, left chart menu, activity tabs and local component list. Adopt the separation between chart navigation and encounter sections for all roles. This is evidence about one PowerChart installation, not a universal Epic layout.
- [SIU Epic inpatient training](https://www.siumed.edu/sites/default/files/2021-08/EPIC%20Info-Inpatient%20Student%20Training%20Exercise%20Booklet.pdf): the public search extract and existing project research describe activity tabs, navigator sections, results review and order entry. The full PDF returned 403 during this pass; no additional screenshot claims rely on it.
- [CST PowerChart foundations](https://cstcernerhelp.healthcarebc.ca/Workbooks_Manuals/Workbooks/W-N230_Provider_PowerChart%20Foundations.pdf): banner content includes patient identifiers, encounter, allergies, dosing weight, code status, location and attending. Preserve supplied values and explicit missing states. Nursing and ED use the same shell with role-specific destinations.
- [AHRQ patient photos research](https://digital.ahrq.gov/program-overview/research-stories/displaying-patient-photos-medical-records-reduces-errors-improves): patient identification can remain a passive persistent banner. VGI uses an original generic avatar because fixtures do not supply photographs; the avatar is not an identifier.
- [athenaOne EHR overview](https://www.athenahealth.com/solutions/athenaone/electronic-health-records): reviewed the vendor's patient-record examples as a secondary reference for chart grouping. No marketing claim is used as a safety or efficiency result.
- [open.epic](https://open.epic.com/) is an interoperability reference, not a source for visual styling or proof of this project's clinical behavior.

Persona application: P1/P4 ambulatory views emphasize the encounter banner and visit activity strip; P2 retains encounter/location alongside triage activities; P3 uses the same frame with administration and flowsheet destinations; P5 uses surgical activities. React does not add destinations absent from Lean. Empty semantic navigators occupy a compact chart strip rather than a wasted 224 px column. When Lean supplies navigation groups, the left navigator renders those groups with decorative icons and exact event IDs.

The UI browser is an experiment navigation surface, separate from clinical EHR controls. It leads with a vendor reference trunk and five clinician forks. Only recorded deployments create personalized revision nodes. Other branches show certified role baselines at release days with “no run yet”. Day labels refer to the end-of-day deployment after that night's decision; workload deltas are recorded workflow means versus rev 0, and missing measurements remain explicit. The release grid shows v1/v2/v3 in order and treats the mixed-role vendor master as a reference. Paths appear in tooltips and replay URLs, not in clinical labels.

Before captures (re-captured from detached pre-redesign commit `75282d1`, with loaded dashboard data): `app/shots/realism/shell/before/` at 1440×900 for browser, dashboard, orders, triage and MAR, plus a narrow browser capture. Before review: the old browser is an unstructured link catalog; the EHR has a gray application bar and an empty left column on programs with no navigator; the dashboard lacks a consistent colored activity frame. After captures are in `app/shots/realism/shell/after/`; the review below describes the final shared painter.

Self-review after the first visual milestone:

| Screen | Before → after | Reference comparison / follow-up |
| --- | --- | --- |
| UI browser | Unstyled links and raw paths → indigo header, release trunk, role-colored branches, selected-revision card, patient cards and release grid. | Hierarchy is now closer to the distinct menu/activity/workspace layers in the CST reference; the timeline is specific to this experiment. No run is invented for empty branches. |
| UI browser, narrow | Dense native selectors → vertical branch/day layout and stacked patient/program panels. | Keep the graph readable without squeezing 11 days into a phone viewport. |
| Orders | Gray bar and empty left column → indigo bar, blue patient context, tinted progress strip, one storyboard rail, accented section headings. | More readable and denser clinical workspace; existing navigator entries alone determine the left menu. |
| ED triage | Same flat framing → shared colors, highlighted section structure, retained encounter/location context. | ED fields and acuity behavior remain supplied by Lean. |
| MAR | Same flat framing → shared frame and explicit status colors; medication evidence remains intact. | No status or due time is calculated in CSS or React. |
| Dashboard | Gray framing → matching indigo header, activity strip, section accents and shared status tokens. | Forks say “rev N”; historical release labels use the single alias module. |
| Imported chart history | Repeated Item/Detail/Source/Unknown strings → compact home-medication lines and note cards with full narrative text. | Original row metadata remains in accessible names and native tooltips. A per-note expansion button cannot be added until the semantic tree supplies an event; existing semantic section controls remain the expansion mechanism. |

Source-projection review: the Lean banner now exports weight and isolation as well as demographics, encounter, allergies and code status. Weight is the latest nonfuture, typed body-weight Observation with its recorded unit and date; it never substitutes for human-confirmed dosing evidence. Isolation uses an explicit record value or “Not recorded”, with unknown/none states styled neutrally. Missing business MRNs no longer fall back to a logical resource UUID. Synthetic Hospital fixture indexes have a human MRN even where Patient.identifier lacks one, so those charts honestly show “Not recorded” until their FHIR data is enriched. The note's imported source-date/shift explanation is moved from the visible title into its existing accessible row/tooltip; note narrative dates remain verbatim from the source.

Validation at the first milestone: app build/lint; 171 app unit tests and 43 agent tests; public-reference palette review; automated visible-text contrast on browser and dashboard; semantic ARIA/visibility checks; role-baseline live login; archived run1-P3 verification (424 tasks, 14,658 events plus three baseline replays, zero mismatches); certification 15/15 and core rejection 17/17. The remaining full button traversal and native checks are recorded with the later verification milestone.

Further Epic-specific cross-check (1 Nov): [Mass General Brigham's Storyboard workspace guide](https://clinicalhelp.mgb.org/phsviewer/PHSviewer_addTab.pdf), pp.1–2, explicitly ties default activity tabs to the user's role and illustrates a compact tab strip separate from patient context. [Johns Hopkins' Storyboard transition note](https://medicine-matters.blogs.hopkinsmedicine.org/2020/06/epic-tip-of-the-week-june-26-2020/) describes role/encounter-specific context at the left with activities across the top. [UI Health Care's Epic basics resource catalog](https://epicsupport.sites.uiowa.edu/epic-resources/hyperspace-epic-basics) likewise treats workspace navigation, chart search, chart review and menu personalization as common platform tools. These support one shared shell with role presets; they do not support separate branded applications per persona or generic buttons labeled with study workflow IDs. VGI retains the explicitly requested top patient banner plus a left summary rail, rather than claiming a pixel-exact reproduction of the 2020 Storyboard layout.


Interpreter-level baseline measurement, before → after the painter refinement (`pnpm complexity --release-root releases`, including native `ehr min-clicks` for each fixed task). All 21 workflow/release combinations are identical; evidence is `docs/audits/shell-complexity.json`. Minima are exact within the reported `navigationDirected` space, not a global UI optimum. KLM replays the minimum-click path at a fixed clock and is not itself optimized. These estimates do not measure human visual search.

| Workflow | v1 / v2 clicks | v1 / v2 KLM (s) | v3 clicks | v3 KLM (s) | Change |
| --- | ---: | ---: | ---: | ---: | --- |
| W1 | 39 | 143.2 | 39 | 143.2 | 0 clicks / 0 s |
| W2 | 7 | 21.45 | 7 | 21.45 | 0 clicks / 0 s |
| W3 | 57 | 198.45 | 57 | 198.45 | 0 clicks / 0 s |
| W4 | 25 | 129.95 | 25 | 129.95 | 0 clicks / 0 s |
| W5 | 48 | 175.45 | 49 | 179.8 | 0 clicks / 0 s |
| W6 | 52 | 178.3 | 53 | 182.65 | 0 clicks / 0 s |
| W7 | 12 | 27.5 | 12 | 27.5 | 0 clicks / 0 s |

The post-merge replay smoke now checks the active core profile directly: signing stays disabled until human identity re-entry, the valid baseline signs through the interpreter, and the bad allergy-tab program remains blocked specifically by the missing allergy review. The removed full-profile legal-field selectors were stale test inputs, not removed UI requirements. That test correction changed no checker rule, spec or theorem statement.

Final shared-painter review: section collapse controls are compact chevrons in their supplied section headings, with unchanged component IDs, event types, accessible names and disabled reasons. The application activity bar is shared by browser and dashboard. Clinical blocking dialogs now have a red frame; an explicit removable/passive alert tone can override that frame. The legacy modal fixture carries a section and acknowledgment button rather than an alert-tier field, so red denotes its blocking presentation, not a new clinical severity label. `interruptive-alert.png` records that review. Background patient context remains visible, Escape does not bypass acknowledgment, and the initial focus stays on the dialog body.

Integrated verification before the final control census: 15/15 persona certifications and 18/18 core negative examples rejected; default Lean build, `lake check`, all three Comparator configurations and D1–D6 compiled; current WASM assets verified; world-2 1,284/1,284 tasks across 50 schedules with no floor/interruption violations and deterministic day-1 repeats; frozen run1-P3 replay has zero mismatches. App 171 unit tests, agent 43 tests and six live mapper tests pass. Desktop smoke has 30 passing tests and narrow coverage has 15; the alert refinement passed 17 further fidelity/contrast/visual checks. Browser/dashboard and orders/triage/MAR visible-text contrast meet WCAG AA.

The native checker integration changes the executable hash, while fixed task inputs, program inputs and all 21 baseline workflow metrics remain identical (`docs/audits/shell-complexity.json`). The min-click scope and KLM limits above still apply. The full sampled control census and browser performance report are published with their own build identities; they are not exhaustive clinical-state exploration.

Search defect found by the strict control audit: the old global `Event.search` counted effort but returned unchanged state, so chart/catalog/in-basket inputs could not show a result. The owner's later instruction to use Lean where it helps supersedes the earlier shell brief's “Don't edit lean/” for this shared semantic correction. Shown search fields now use existing component-addressed `Event.enter` with text and an optional per-component query in `State`. Lean returns typed chart/catalog rows or an explicit “No matching records” supplement. Required review panels remain full; search never selects medication or creates captured evidence, receipts or commits. The existing search event and search-free JSON remain unchanged for frozen recordings. No checker rule, spec requirement, theorem statement or design constraint is weakened; existing proofs cover the extra state-update case. Native guards cover case-insensitive catalog matching, empty results, clearing, hidden controls, clinical-state preservation, legacy search and JSON round-tripping.

Additional projection references: [HL7 R4 Patient identifiers](https://hl7.org/fhir/R4/patient.html#ids) distinguishes human business identifiers from logical resource IDs; the banner now respects that distinction. [HL7 R4 body-weight profile](https://hl7.org/fhir/R4/bodyweight.profile.xml.html) identifies the coded Observation and recorded UCUM unit. The banner retains that source unit/date, and the original “weight recorded today” clinical fact is unchanged. Search self-review found the full-note result list too dense and exposed encounter references; Lean now emits concise labeled metadata and a 200-character excerpt around the match, with ellipses. Full chart notes and required reviews remain complete in their existing panels.

Final visual check at 1440×900 covers ambulatory orders, ED triage, nursing MAR, pediatric growth review, surgical pre-op, chart search, notes, reported home medications, the interruptive dialog, browser and dashboard. The narrow browser is 390×844. P4/P5 use the same application/patient frame, with their actual role presets and destinations; their added captures are `w5Growth.png` and `w6PreOp.png`. Weight stays readable with its recorded date in each role. Search metadata now fits compact rows and matching excerpts, with no encounter UUID or converter fields visible. The banner's missing isolation value is neutral. Browser/dashboard activity strips and section headers share the clinical palette.

After the latest run integration: 188 app unit tests, 84 agent tests, six live mapper tests, 31 desktop and 16 narrow browser checks pass. Lazy summaries retain paired canonical/control metrics without day traces; opening a persona hydrates that persona's original source program as well as its compiled version. The recorded run still has zero state mismatches. The final control/performance results are recorded separately in `docs/audits/`.

Large-chart regression: a live search on the larger Terrance Abshire fixture raised a WASM rendering exception while the smaller Aaron fixture worked. Search now uses direct lab summary rows rather than repeating historical trend series, string slices for excerpts, and a first-25 result list with an explicit refine-search message. Matching ignores converter fields and opaque encounter references. Full source panels and mandatory reviews remain unchanged. A real-WASM regression runs a nonempty search against all 324 committed patient bundles; both small and larger live charts also have browser coverage, including observed-checkpoint restoration. The audit now selects the intended representative patient instead of querying a name prefix such as “Mr.”, and treats unexpected WASM/runtime errors as errors.

Frozen shared-shell milestone (`a462b19`, main `251d9a0`, Lean hash `afec57a5…`): 189 app unit tests, 84 agent tests, six live mapper tests, 33 desktop checks and 18 narrow checks pass. Certification accepts 15/15 persona projections and rejects 18/18 core bad programs. The default Lean build, kernel replay, three Comparator configurations, D1–D6, WASM freshness, 1,284/1,284 world-2 tasks and archived run1-P3 replay are green. `docs/audits/shell-verification.json` records this build identity and the exact scopes. The full bounded button audit records 2,746 working interactions and 115 disabled controls with reasons, with zero dead controls or errors across app surfaces and six clinical personas. It also exercised a real agent request to remove allergy review, which the checker rejected; its counterexample replay worked.

Preview performance now transfers 266–291 KB for a cold dashboard versus about 3.16 MB before; round trips preserve the document and issue no WASM requests. These are loopback measurements with localhost and a synthetic non-localhost Host, not slow-link results. The local audit server disables Tailscale service setup, avoiding interference between its synthetic hostname and the production exact-host allowlist. The product allowlist is unchanged. Current screenshots include all five clinical roles, chart search/history, browser and dashboard.

Navigator follow-up: current role baselines mark their flat goto components with a `nav` segment in the semantic tag, without a parent navigator group. Lean now recognizes that existing placement metadata as well as explicit groups. The exact same shown, enabled, ordinary-click controls move into `UiScreen.nav`; commits, controls with hotkeys and disabled controls retain their complete workspace representation. The public IDs, labels, goto targets and interpreter actions are unchanged. Named native examples check relocation without duplication and the original event's destination; all existing D-rule proofs compile unchanged. This restores a real section sidebar for all five canonical role presets rather than adding painter-only shortcuts.

The navigator self-review also removed an inherited React accordion that could hide supplied navigation links without a Lean event. Group labels are now static headings in labeled regions, with the same decorative icons and all supplied links present. The independent ARIA projection no longer expects that unsupported group button; its exact extra/missing-control comparison remains in place. The real five-role capture test now compares each canonical screen's browser accessibility tree directly with its live Lean `UiScreen`, in addition to checking the fixture gallery. The interrupted intermediate audit is not presented as a completed gate; a fresh pass follows this correction.

Final navigator milestone, frozen source `5559068` (main `251d9a0`, Lean hash `412471a4…`): app build/lint/typecheck and 189 unit tests; agent lint/typecheck and 84 tests; six live mapper tests; 35 desktop and 20 narrow checks all pass. Five live canonical role screens now have direct accessibility-tree equality checks against their Lean `UiScreen`. All seven main surfaces pass rendered-text contrast at both tested widths. The full bounded control audit records 2,666 working interactions, 114 explained disabled states, zero dead controls and zero errors. Its six persona samples cover 197 configurations, with eight queued checkpoints outside the 48-configuration budget for each of P3 and RN2. A real Claude attempt to remove allergy review was rejected for `reviewsBeforeCommit`, and its counterexample replay worked. The fast regression and performance gates also pass. Exact build identity, scope, counts and screenshot hashes are in `docs/audits/shell-verification.json`.

Native validation remains green: default Lean build, kernel replay and all three Comparator configurations; D1–D6; fresh WASM; 15/15 persona certifications and 18/18 core rejections; 1,284/1,284 world-2 tasks. The archived run1-P3 still verifies 14,658 recorded events plus 137 baseline events with zero mismatches. The painter changes replay appearance, while the frozen programs, events, state sequence and effort measurements remain unchanged. A fresh complexity run confirms that all 21 workflow metric payloads and every fixed task payload equal the pre-redesign baseline.

Final before/after additions were captured from the actual pre-redesign `75282d1` checkout, not by recoloring the new renderer. All clinical images are 1440×900; browser narrow images are 390×844. The temporary checkout, browser and preview were stopped and removed after capture.

| Screen | Before → after | Final review |
| --- | --- | --- |
| Pediatric growth review | Gray application frame and empty navigator → indigo role bar, dated weight/isolation context, real section links and tinted progress/table framing. | The full source growth series and point table remain readable; the shell does not calculate percentiles. |
| Surgical pre-op | Gray frame and empty navigator → shared role/patient frame, visible perioperative destinations and consistent field/section accents. | Consent, medication hold and H&P entry retain their semantic required/human-only states. |
| Chart search | Input with no returned result → semantic results with concise metadata and bounded matching excerpts. | Original chart panels remain complete. Missing MRN stays explicit rather than displaying a resource UUID. |

The final orders, ED, nursing, pediatric and surgical captures use static navigator group headings; every supplied goto stays visible. No clinical records were added to make an empty panel look populated. Per-note disclosure remains a semantic-content handoff: full readable note bodies and the existing semantic section controls are retained.

The interruptive alert now also has a matched pre-redesign capture using the unchanged semantic fixture. Its old neutral modal frame becomes the explicit red blocking frame, with the same acknowledgment event and retained patient context. The final set contains 12 before and 12 after images with dimensions and hashes recorded in the verification report.
