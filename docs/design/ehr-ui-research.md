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
