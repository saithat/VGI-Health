# EHR UI pattern research

## Canonical realism: P5 general surgeon (perioperative)

Research and implementation review: 2026-11-01, SURG lane. This is the shared vendor canonical with a surgeon's permissions and activity preset. The baseline retains the separate consult signature, order review, per-field order-set confirmations, kg-weight confirmation, human consent verification, and independent note/order/discharge commits. No clinical rule is changed.

### Evidence and target layouts

Public hospital training, rather than promotional artwork, is the primary reference. Salem Health's [surgeon workspace tip sheet, pp.1–5](https://www.salemhealth.org/docs/default-source/common-ground-docs-and-images/surgeon-buttons-tip-sheet.pdf?sfvrsn=5d1cc7e5_2) was read and its preprocedure, postprocedure and brief-note screenshots inspected. It shows schedule/status-board entry, a preprocedure navigator with H&P update, consent and orders, and postprocedure floor/discharge sections with a brief-note template. VGI adopts these information groups and phase terminology, with original composition and styling. No vendor screenshots or assets are stored in this repository.

Alberta Health Services' [Connect Care surgical procedures manual](https://manual.connect-care.ca/workflows/surgical-procedures) distinguishes phases of care and active orders from work saved in a queue and orders signed for later release. VGI only offers its implemented active-sign action: it must not label a normal signature “Sign & Hold”. A pending-order list is draft information; navigating to the next phase cannot activate it.

Boston Medical Center's [ChartLink quick-start guide, pp.16–20](https://www.bmc.org/sites/default/files/2025-10/BMCHS%20EpicCare%20ChartLink%20Quick%20Start%20Guide.pdf) separates selecting order preferences from associating a patient's diagnoses. Its surgical case entry includes diagnosis alongside date, location/provider and procedure, with a separate action to open a listed case. VGI therefore shows the supplied surgical request's **Indication** beside its procedure. This is request evidence, not a confirmed postoperative diagnosis or automatic order association. Generic medication preferences leave association for the clinician; only the explicitly named appendectomy set carries its procedure-specific diagnosis. An unused appendicitis value in the generic preference input helper was removed without changing any macro's emitted steps.

The [CST PowerChart provider discharge guide](https://cstcernerhelp.healthcarebc.ca/Workflows/Inpatient/Admission_Transfer_Discharge/Discharge_Patient_Home_%28Provider%29.htm) supports chart review, medication reconciliation, discharge orders and documentation as separate parts of discharge. Mount Sinai General Surgery's [resident handbook](https://www.mssurg.com/table-of-contents), sections 3 and 7, supports a compact daily note focused on overnight symptoms, diet/bowel function, wound exam, I&O, labs and plans, and a structured brief operative report. These are workflow examples, not new legal requirements.

| Screen | Target reading order and production pattern |
| --- | --- |
| OR Schedule | Room, start, procedure, indication, patient, surgeon, status in a compact schedule table; ordinary `Open selected case` action in the selected chart's row. Keep the department queue distinct from its patient's preprocedure navigator. Missing room or case timing remains unknown. |
| Consults | Consult request list with patient, requesting service, reason, priority and status; `Open selected consult` enters the note. Surgical clinic remains the ordinary ambulatory visit navigator, with surgical history accessible in chart review. |
| Surgical consult | Request and relevant imaging/results first; then reason, HPI/ROS, exam, assessment/diagnosis and surgical decision in named sections; home-medication reconciliation. `Review consult` opens billing/follow-up and its separate note signature. |
| Sign Consult | Billing diagnosis/level of service, plan and patient instructions; sign consult note. It does not sign orders or advance the physical surgical phase. |
| Preprocedure | Case/checklist and H&P review; interval H&P update; consent document plus human verification; anticoagulants/hold plan; NPO; allergies/current medications; prophylaxis orders. A consent document is never presented as a completed team time-out. |
| Orders | Search/catalog, preference list, medication dosing, prescription details, pending orders and review/sign. The same composer is available during pre-op, floor care, rounds and discharge. No invented phase-dependent signature or “Sign & Hold”. |
| Sign Orders | Pending orders and visible allergy/medication/anticoagulant/dose evidence; weight and linked dosing weight; controlled-prescription review; human identity immediately above its sign button. |
| Brief Op Note | Intra-op evidence, optional procedure template; diagnoses/procedure/team, anesthesia/EBL, findings, specimens/drains/implants, complications/condition; sign note. Narrative findings have their own section rather than sharing a dense row with numeric EBL. |
| Postprocedure Orders | Choose procedure set; diet/activity, VTE prevention, monitoring/labs and nursing care; separate medication sections for analgesia, VTE and nausea; pending orders; review/sign. The selected set fills drafts and still requires confirmations. |
| Rounding | Overnight events, dated recorded vitals, supplied I&O, results and active orders; SOAP progress note; modify orders or discharge. No fabricated output totals or postoperative-day counter. |
| Discharge | Current medications/allergies; reconciliation decisions; discharge prescriptions; diagnosis/condition/destination; follow-up; instructions and return precautions; final discharge action. Medication signing remains a separate route. |

The [structured presentation contract](presentation-contract.md) uses `present.orSchedule`, `present.worklist`, `present.table`, `present.results` and `present.notes`. Clinical cells remain read-only. The Home/OR Schedule and Consults row actions are the original Lean goto buttons, placed with `present.row` tags inside a noncollapsible presentation group; an Open text column is not a control. Missing source rows retain the same button inline. This placement neither switches patients nor adds a new clinical event. All safety information remains in the workspace at its required signature. Additional chart summaries never replace it.

P5's shared-workspace preset starts with today's OR cases and `Open selected case`; the OR Schedule activity retains the dedicated case-list view. This preserves the normal single chart-opening action from a schedule instead of forcing a detour through a clinic rooming screen. Activities follow the P5 preset order: OR Schedule, Consults, Clinic Schedule, In Basket: Results. The clinic navigator reuses W1's section order on every screen. The simulator follows the existing goto graph; no task-specific navigation policy or label matching is added.

CST's [Perioperative Tracking guide](https://cstcernerhelp.healthcarebc.ca/Applications/PowerChart/Perioperative_Tracking/Navigate_to_Perioperative_Tracking.htm) confirms a room-organized slate with one patient per row and a separate chart-opening action. Its [tracking-filter guide](https://cstcernerhelp.healthcarebc.ca/Applications/PowerChart/Perioperative_Tracking/Perioperative_Tracking_Filters_and_Rules.htm) distinguishes today's cases from other dates and phase-specific views. VGI's dated surgical-request projection therefore filters to its supplied date; a day-only request stays a date, without an invented time. An `active` request remains an order status, never a claimed `Roomed` or `Complete` status. The surgical summary rail brings the case before the shared chart summaries; consent and anticoagulant reviews remain in the workspace.

### Visual review and measurement

The first case review also exposed antiplatelets missing from the filtered hold-review list: their generic names were present in the chart, but outside the small prescribing formulary. The display now includes explicitly named aspirin, clopidogrel, prasugrel, ticagrelor, ticlopidine and cangrelor, plus named dabigatran/rivaroxaban, alongside the existing formulary anticoagulants. Names are matched at a word boundary; no hold interval, dosing rule or interaction class is inferred. Sources: [AHA medication classes](https://www.heart.org/en/health-topics/heart-attack/treatment-of-a-heart-attack/cardiac-medications), [MedlinePlus P2Y12 inhibitors](https://medlineplus.gov/ency/patientinstructions/000100.htm). The complete medication list remains visible at signing and reconciliation.

The signing review exposed two additional presentation defects. Raw provenance keys were visible, and a pounds prefill could make the numeric input keep submitting pounds. Lean now supplies readable `sourceLabels` and `entryHints`. The original provenance, human-only and pending-confirm flags remain identical for D6. A metric weight input stays in kg, leaves an incompatible recorded value out of the editable number, and displays that original value/unit in its hint. No conversion or confirmation happens automatically. A real-WASM probe uses the seeded pounds consult, checks the blank kg input and recorded-value hint, then verifies a human kg entry. The numeric DOM event also has a painter regression test.

The fixed React `Active encounter` badge was removed: a status must come from the clinical source. In particular, FHIR distinguishes a finished encounter from an encounter in progress. [FHIR R4 encounter status](https://hl7.org/fhir/R4/valueset-encounter-status.html). The OR request supplies a planned room and surgeon, but the seeded world does not supply an active perioperative Encounter; the selected-encounter banner integration is recorded in [change requests](changes-requests.md). Historical chart metadata is not evidence of a current admission.

The second case review adds the request's indication to Home and OR Schedule, and keeps labeled procedure, indication, surgeon and request status in every surgical summary rail. Consult rails likewise preserve the request's labels. Previously those values formed a single bold line, without an indication. The supplied feed's five surgical terminology labels receive readable spacing/capitalization in Lean; other source text is preserved. This display change adds no default, confirmation or navigation step. At milestone `c05d292`, the regenerated canonical JSON was byte-identical. The subsequent row-action grouping is measured again against the same frozen baseline.

Screenshots are captured at 1440×900 under `app/shots/realism/surg/`, with load and task-focused views. The capture script is `lean/Ehr/Canonical/review_surgery.mjs`; its input is actual native `ehr render-screens --ui` output. `review_surgery_data.mjs` builds the inputs from committed World 2, day 2, through the actual FHIR seeder and Synthea import normalization. The OR case is Destiny Mitchell's laparoscopic cholecystectomy; the consult is Dina West's appendicitis request. These are synthetic records. No clinical outcomes are manufactured for the pictures.

The before programs and painter are frozen at `add0d2e`, using the same review inputs. The original painter runs from a temporary archive through `EHR_REVIEW_APP_ROOT`; the after images use the integrated presentation renderer. There are 39 before and 41 after images, including an additional pounds-weight signing view with sections expanded. The two new queue screens have no before counterpart. Source images from vendors remain outside the repository.

### Screen-by-screen visual review

Compared with Salem's navigator and brief-note examples, the improvement is primarily information hierarchy and a stable section list. Teal surgical section headings make phase/document groups easy to scan. The common VGI shell remains an original design. All records remain in their tables/lists; the long perioperative results and vitals reports use local scroll panes, and the desktop navigator stays in view. The ARIA/visibility gate checks rows after scrolling them into view.

| Screen | Before → after observation | After image |
| --- | --- | --- |
| Surgeon landing | Generic schedule and a bank of activity links → actual dated OR request row with indication, real case-opening button and the surgeon's ordered activity preset. The first row-action review wrapped the label onto three lines; the final action column gives it enough width. | [OR landing](../../app/shots/realism/surg/after/home-load.png) |
| OR Schedule | New dedicated activity. Room/start/procedure/indication/patient/surgeon/request status are visible in one row. Its opening control is the original Lean goto, placed in the Actions cell; clinical cells remain read-only. | [Case list](../../app/shots/realism/surg/after/w6Schedule-load.png) |
| Consults | New request queue with its original opening button in the Actions cell. Requesting clinician, reason, urgency, owner and location are supplied records. The side panel shows consult context rather than an empty today's-OR card. | [Consult list](../../app/shots/realism/surg/after/w6Consults-load.png) |
| Consult note | Undifferentiated small text fields after long reports → named History and Examination/surgical-plan sections with full-width narratives. Results/vitals remain accessible in bounded report panes. | [Consult note](../../app/shots/realism/surg/after/w6Consult-task.png) |
| Sign Consult | Flat billing/follow-up fields → diagnosis/charges and follow-up/instructions groups. The independent consult signature remains. | [Consult signature](../../app/shots/realism/surg/after/w6ConsultClose-task.png) |
| Preprocedure | Loose checklist/fields and little case context → H&P update, actual consent-on-file evidence, separate unchecked human verification, antithrombotic review and hold/fasting sections. No completed time-out is implied. | [Preprocedure](../../app/shots/realism/surg/after/w6PreOp-task.png) |
| Orders | Existing search, preferences and complete prescription composer retained. A surgical navigator and case context replace the numbered progress strip and footer navigation bank. | [Order composer](../../app/shots/realism/surg/after/w6Orders-task.png) |
| Sign Orders | Required review tables stay in the workspace. Dosing weight is open, its source labels are readable, and identity remains immediately above signing. | [Signing](../../app/shots/realism/surg/after/w6Sign-task.png) |
| Pounds signing review | A kg-labeled field showed/submitted the recorded pounds unit → separate recorded-value guidance and blank kg entries. The original alert and confirmation requirements remain. | [Pounds review](../../app/shots/realism/surg/after/w6Sign-pounds-task.png) |
| Brief Op Note | One dense mixed grid with single-line findings → diagnoses/procedure/team, anesthesia/EBL, findings, specimens/devices and outcome sections. Narrative fields now have room to document. | [Brief Op Note](../../app/shots/realism/surg/after/w6OpNote-task.png) |
| Postprocedure Orders | Generic numbered medication rows → diet/activity, VTE, monitoring, nursing, scheduled/PRN pain, prophylaxis and nausea groups. Draft set values still require their original confirmations. | [Postprocedure](../../app/shots/realism/surg/after/w6PostOp-task.png) |
| Rounding | Single-line progress field below an unbounded historical lab report → SOAP narrative with adjacent active-order review and scrollable reports. The vitals label no longer claims a 24-hour restriction. | [Rounding](../../app/shots/realism/surg/after/w6Rounding-task.png) |
| Discharge | Flat fields → medication reconciliation, diagnosis/disposition, and follow-up/AVS sections. Prescriptions, note/order signatures and discharge remain distinct. | [Discharge](../../app/shots/realism/surg/after/w6Discharge-task.png) |
| Clinic rooming | Generic visit prompt → postoperative/surgical reason prompt and a stable Visit navigator. Existing vitals, screenings and allergy review remain. | [Rooming](../../app/shots/realism/surg/after/w1Rooming-task.png) |
| Clinic medication reconciliation | Existing complete medication review and modeled decision slots retained; navigation is now in the left list and Surgical history is available in chart review. | [Medication reconciliation](../../app/shots/realism/surg/after/w1MedRec-task.png) |
| Clinic history | One-line HPI/ROS → two full-width narratives. Current section stays in its normal navigator position. | [History](../../app/shots/realism/surg/after/w1Hpi-task.png) |
| Clinic examination/A&P | One-line documentation → examination/surgical-site and assessment/surgical-plan narratives, followed by the existing problem list. | [Exam and plan](../../app/shots/realism/surg/after/w1Exam-task.png) |
| Clinic visit close | Existing diagnosis, service level, follow-up and signature preserved; instructions become a narrative field and the visit section remains selectable. | [Visit close](../../app/shots/realism/surg/after/w1Close-task.png) |
| Clinic medication orders | Complete shared composer retained; the visit navigator and surgical-history tab supply the surgical context. No extra surgical workflow button is added to the composer. | [Clinic orders](../../app/shots/realism/surg/after/w1Orders-task.png) |
| Clinic laboratory orders | Existing laboratory ordering and signing route retained; the same Visit navigator and chart history are available. | [Laboratory orders](../../app/shots/realism/surg/after/w1Labs-task.png) |
| Clinic verification | Required allergy/dose verification remains in the workspace. The change is navigation/context, with no hidden review substituted. | [Verification](../../app/shots/realism/surg/after/w1Verify-task.png) |
| Clinic order signature | The independent order signature and human identity remain. Readable sources and kg-entry guidance use the same generic painter as surgery. | [Clinic signing](../../app/shots/realism/surg/after/w1Sign-task.png) |

### Efficiency and validation evidence

Machine-readable before/after measurements: [surg-realism-metrics.json](surg-realism-metrics.json). Control probes: [surg-controls.json](../audits/surg-controls.json). The measurement script uses the existing certified `Measure.lean` adapter and `ehr min-clicks` on the actual P5 presets, plus all ten World-2 P5 schedules. Both programs run under the same native interpreter. The stock `pnpm complexity --release-root releases` union benchmark is retained separately in `programs/benchmarks/canonical-complexity.json`; its workflow totals are not the P5 preset totals.

Clicks and keys are optimized independently within the reported search space. These P5 measurements use `navigationDirected`; they do not establish a global minimum over all interpreter moves. KLM replays the minimum-click path at a fixed clock and is an estimate, not a KLM minimum or a clinician timing study. World-2 replay uses the actual release day transitions and seed 7, including the simulated interruptions/detours. Layout changes can alter its policy path and random draws; fewer clicks need not imply a lower total KLM estimate.

| P5 benchmark | Releases | Minimum clicks before → after | KLM seconds before → after |
| --- | --- | --- | --- |
| W1 surgical clinic | v1/v2/v3 | 39 → 39 | 141.60 → 141.60 |
| W6 pre-op episode | v1/v2 | 30 → 25 | 96.55 → 92.90 |
| W6 pre-op episode | v3 | 31 → 26 | 100.90 → 97.25 |
| W6 op-note episode | v1/v2/v3 | 12 → 12 | 43.50 → 43.50 |
| W6 discharge episode | v1/v2/v3 | 12 → 12 | 40.65 → 40.65 |
| W6 benchmark sum | v1/v2 | 54 → 49 | 180.70 → 177.05 |
| W6 benchmark sum | v3 | 55 → 50 | 185.05 → 181.40 |

The W6 sum covers three independent benchmark episodes; the op-note/discharge benchmark choices contain no additional prescriptions. Actual postprocedure sets, consults, rounding and varying prescription loads are exercised by the World-2 replay. That replay completes all 136 P5 tasks in both programs: **4,780 → 4,698 clicks**, with estimated KLM **26,449.5 → 28,847.9 seconds** (+9.1%). The row-action grouping retains the same click paths; its section structure adds 15.4 estimated seconds across the replay compared with `c05d292`. This mixed result is retained, rather than adjusting the simulator or simplifying clinical content to improve the score. The baseline still has the required identity, reviews and confirmation work; the realistic selected-case entry removes a clinic detour from the directed pre-op benchmark.

Validation for the structured-renderer milestone: **15/15** persona projections certified, **18/18** bad programs rejected, **1,284/1,284** World-2 tasks complete, and archived run1-P3 **0 mismatches** (14,658 recorded events plus 137 baseline events). Lean default build and kernel replay pass with only the permitted axioms; root/checker/render Comparators pass 18/21/43 theorems. The browser checks 45 actual P5 screen states at desktop and narrow widths: 99 tests pass, with three fixture-dependent skips. The control probe covers 72 release/screens, 1,030 enabled buttons, 29 explained disabled buttons and 537 alternate tabs, with no failures. App build/lint/170 tests and agent 41 tests/typecheck/lint pass. The [validation manifest](../audits/surg-realism-validation.json) ties these results and all 80 pictures to source/program hashes.

The renderer adds readable metadata and transparent structured layouts to archived programs, including a hint for any recorded non-kg weight. It does not change the archived interpreter events or state transitions. The real-WASM trajectory verification was rerun after these changes; no archived program was rewritten.

Main integration through `251d9a0` preserves both the structured widgets and the runner's versioned presentation wrapper. Both independent presentation test suites are retained. With the built app in place, app build/lint/186 tests and agent 82 tests/typecheck/lint pass. The 45-state browser gate passes again with cache reuse disabled (99 pass, three fixture-dependent skips), the clinical walk passes, and the updated trajectory verifier reports zero mismatches. Lean source and the WASM fingerprint are unchanged by this merge. [Integration evidence](../audits/surg-main-integration.json).

Presentation integration through `6062379` adds source-row placement for the existing Home/OR Schedule and Consults goto buttons. The first visual pass exposed wrapping and a fixed-table action-column sizing issue; the final review keeps the full action label visible and preserves readable procedure/indication columns. The independent custom-presentation and structured-widget suites remain, with 192 app tests. Kernel checking, all three Comparator suites, 15/15 certification, 18/18 bad-program rejection, 1,284/1,284 simulated tasks, 1,030 enabled control probes, 15 structured native/WASM comparisons, both clinical/row-action browser walks, and the 45-state browser gate pass; archived replay has zero mismatches. The P5 and stock complexity measurements are regenerated. [Current validation](../audits/surg-realism-validation.json).

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
