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
