# EHR UI pattern research

## Canonical realism: P5 general surgeon (perioperative)

Research and implementation review: 2026-11-01, SURG lane. This is the shared vendor canonical with a surgeon's permissions and activity preset. The baseline retains the separate consult signature, order review, per-field order-set confirmations, kg-weight confirmation, human consent verification, and independent note/order/discharge commits. No clinical rule is changed.

### Evidence and target layouts


Results summaries now use short department captions for four supplied standard
labels, checked against the official definitions for
[creatinine](https://loinc.org/2160-0),
[hemoglobin A1c](https://loinc.org/4548-4),
[hemoglobin](https://loinc.org/718-7), and
[MDRD eGFR](https://loinc.org/33914-3). The MDRD method stays explicit. Lean
requires the exact LOINC system/code and its standard supplied label, or a
code-only label; custom local wording and unknown systems/codes retain their
original text. Historical codes are not remapped, and no value or calculation
is changed. Detailed explicit result payloads retain their supplied labels.
The goal is a readable clinical test column beside the existing value, unit,
reference range, date and flag, rather than a terminology description spanning
several lines in each row.



The signed-in clinician name is read from the authenticated FHIR
[Practitioner profile](https://hl7.org/fhir/R4/practitioner.html), using its
[HumanName](https://hl7.org/fhir/R4/datatypes.html#HumanName) text or official
structured name. Lean requires a unique match to the permission-bearing user's
ID before adding that name to the role label. Missing names, foreign identities
and duplicate matches leave the role alone; no resource ID is substituted.
The live adapter passes the intact authenticated profile, and Lean supplies the
existing `UiScreen.viewer` text. This display metadata does not enter or confirm
the human-only patient identity field. Supplied Practitioner references can also
resolve their recorded human name rather than a transport path.


The live clinic now uses the selected encounter's recorded setting. The
[FHIR R4 encounter-class value set](https://hl7.org/fhir/R4/v3/ActEncounterCode/vs.html)
defines ambulatory, emergency and inpatient classes independently of the
clinician's role. Lean reads a recognized class from the selected patient's
encounter when no explicit episode kind was supplied. Explicit pre-op task
scope keeps priority. Selecting an older clinic encounter therefore retains that
clinic's banner and diagnosis while preserving the newer ward encounter in
Chart Review. Missing/foreign selections stay unknown. This corrects the prior
live-adapter assumption that every surgeon encounter was pre-op.

Live save receipts previously exposed commit IDs and FHIR resource paths, and
the encounter picker printed transport IDs. They now use the spec's readable
labels and numbered saved-record actions, with the original bindings retained.
The save notification sits below the banner. Normal clinical sessions show the
readable confirmation; saved-record actions, the encounter drawer and Inspector
require explicit `inspect=1` debug mode when opened manually. Save-error
recovery remains available in normal sessions. The technical viewer still opens the
actual saved record. Two P5 clinic walks record genuine allergy reviews, check
the persisted Provenance in debug mode, and verify the selected ambulatory
context, unobscured banner and absence of technical controls in normal mode.
The existing return-to-worklist action remains available as `Close chart` in
normal sessions; it does not change encounter status or discard saved records.

Code entry follows the same department-preference pattern: search a readable
term, select its code, then retain the clinical code with its description. The
surgeon preset supplies 15 diagnosis quick picks and the three procedure codes
already present in the project's surgical case feed. Diagnosis codes were
checked against the [CMS ICD-10-CM index](https://www.cms.gov/medicare/coding-billing/icd-10-codes)
and its [FY2027 code descriptions](https://www.cms.gov/files/zip/2027-code-descriptions-tabular-order.zip)
(effective October 1, 2026); labels are concise original paraphrases. Procedure
names reuse the project's existing case terminology. This is a small department
preference list, with manual codes retained, rather than a full terminology
catalog. Nothing chooses a diagnosis or fills a blank operative note. Local
anesthesia, diet, activity and yes/no choices display readable labels while
retaining their existing raw values. Lean supplies the choices; React only
filters and paints them. Browser checks cover term selection, an unlisted manual
code, untouched blank fields after filtering, and persistence across navigation.

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

The fixed React `Active encounter` badge was removed: a status must come from the clinical source. In particular, FHIR distinguishes a finished encounter from an encounter in progress. [FHIR R4 encounter status](https://hl7.org/fhir/R4/valueset-encounter-status.html). The OR request supplies a planned room and surgeon, but the seeded world does not supply an active perioperative Encounter. For the explicit pre-op episode, Lean therefore shows **Preoperative chart review / Planned OR / Surgeon**, rather than the previous ambulatory encounter's class, attending and clinic location. These values use the ordinary selected-patient/version-bound request reader; missing data stays `Not recorded`. No admission or current physical location is inferred.

CST's [right-patient/right-encounter guide](https://cstcernerhelp.healthcarebc.ca/Applications/PowerChart/Patient_Overview/Find_Right_Patient_and_Right_Encounter.htm) distinguishes opening a patient's chart from choosing the encounter used for documentation. Its [previous-visit guide](https://cstcernerhelp.healthcarebc.ca/Patient_Chart/Patient_Information/Locate_Previous_Visit_Information.htm) reinforces that distinction. This supports keeping planned surgical context separate from historical encounter metadata. The consult queue's request timestamp is now **Received**: FHIR `authoredOn` supplies creation time, not a due deadline. The header's signed-in role is also supplied by Lean's permission-bearing `User`; no user ID is displayed as a name.

The second case review adds the request's indication to Home and OR Schedule, and keeps labeled procedure, indication, surgeon and request status in every surgical summary rail. Consult rails likewise preserve the request's labels. Previously those values formed a single bold line, without an indication. The supplied feed's five surgical terminology labels receive readable spacing/capitalization in Lean; other source text is preserved. This display change adds no default, confirmation or navigation step. At milestone `c05d292`, the regenerated canonical JSON was byte-identical. The subsequent row-action grouping is measured again against the same frozen baseline.

Screenshots are captured at 1440×900 under `app/shots/realism/surg/`, with load and task-focused views. The capture script is `lean/Ehr/Canonical/review_surgery.mjs`; its input is actual native `ehr render-screens --ui` output. `review_surgery_data.mjs` builds the inputs from committed World 2, day 2, through the actual FHIR seeder and Synthea import normalization. The OR case is Destiny Mitchell's laparoscopic cholecystectomy; the consult is Dina West's appendicitis request. These are synthetic records. No clinical outcomes are manufactured for the pictures.

The integrated shared shell adds the indigo signed-in role bar, blue chart strips, explicit recorded weight/date and isolation status. On desktop, the banner and navigator remain visible while the workspace scrolls; opening a section returns that workspace to its heading. This fixes the earlier task-focused screenshots where patient identity scrolled away. The only current-section marker is on the actual Lean navigation button. The final 1440×900 review covers all surgical and clinic screens below, with the pre-op banner's planned context and the consult queue's Received column explicitly checked.

The before programs and painter are frozen at `add0d2e`, using the same review inputs. The original painter runs from a temporary archive through `EHR_REVIEW_APP_ROOT`; the after images use the integrated presentation renderer. There are 44 before and 49 after images, including an additional pounds-weight signing view with sections expanded, two real-browser code-choice views, and live clinic selection/review views. The three live before images use the already-pushed `82f7c4d` app; the clinician-header before image is the real landing capture from `73192de`. The focused laboratory before image uses the pushed `da22847` painter and native screen. The extra named-clinician view is a native/WASM identity fixture; the ordinary workflow and live views use their supplied clinician profiles. The two new queue screens have no before counterpart. Source images from vendors remain outside the repository.

### Screen-by-screen visual review

Compared with Salem's navigator and brief-note examples, the improvement is primarily information hierarchy and a stable section list. Teal surgical section headings make phase/document groups easy to scan. The common VGI shell remains an original design. All records remain in their tables/lists; the long perioperative results and vitals reports use local scroll panes, and the desktop navigator stays in view. The ARIA/visibility gate checks rows after scrolling them into view.

| Screen | Before → after observation | After image |
| --- | --- | --- |
| Clinician identity | A role-only bar → the recorded clinician name and role, matched to the same signed-in user. The P5 source fixture resolves to Whitaker, James. A separate named Practitioner fixture checks identity binding without assuming the persona ID; missing or duplicate matches retain the role alone. | [Role-only before](../../app/shots/realism/surg/before/clinician-header-load.png), [source P5 after](../../app/shots/realism/surg/after/home-load.png), [identity fixture](../../app/shots/realism/surg/after/clinician-header-load.png) |
| Surgeon landing | Generic schedule and a bank of activity links → actual dated OR request row with indication, real case-opening button and the surgeon's ordered activity preset. The first row-action review wrapped the label onto three lines; the final action column gives it enough width. | [OR landing](../../app/shots/realism/surg/after/home-load.png) |
| OR Schedule | New dedicated activity. Room/start/procedure/indication/patient/surgeon/request status are visible in one row. Its opening control is the original Lean goto, placed in the Actions cell; clinical cells remain read-only. | [Case list](../../app/shots/realism/surg/after/w6Schedule-load.png) |
| Consults | New request queue with its original opening button in the Actions cell. Requesting clinician, reason, urgency, owner and location are supplied records. The side panel shows consult context rather than an empty today's-OR card. | [Consult list](../../app/shots/realism/surg/after/w6Consults-load.png) |
| Consult note | Undifferentiated small text fields after long reports → named History and Examination/surgical-plan sections with full-width narratives. Results/vitals remain accessible in bounded report panes. | [Consult note](../../app/shots/realism/surg/after/w6Consult-task.png) |
| Sign Consult | Flat billing/follow-up fields → diagnosis/charges and follow-up/instructions groups. The independent consult signature remains. | [Consult signature](../../app/shots/realism/surg/after/w6ConsultClose-task.png) |
| Preprocedure | Loose checklist/fields and little case context → H&P update, actual consent-on-file evidence, separate unchecked human verification, antithrombotic review and hold/fasting sections. No completed time-out is implied. | [Preprocedure](../../app/shots/realism/surg/after/w6PreOp-task.png) |
| Orders | Existing search, preferences and complete prescription composer retained. A surgical navigator and case context replace the numbered progress strip and footer navigation bank. | [Order composer](../../app/shots/realism/surg/after/w6Orders-task.png) |
| Sign Orders | Required review tables stay in the workspace. Dosing weight is open, its source labels are readable, and identity remains immediately above signing. | [Signing](../../app/shots/realism/surg/after/w6Sign-task.png) |
| Pounds signing review | A kg-labeled field showed/submitted the recorded pounds unit → separate recorded-value guidance and blank kg entries. The original alert and confirmation requirements remain. | [Pounds review](../../app/shots/realism/surg/after/w6Sign-pounds-task.png) |
| Brief Op Note | One dense mixed grid with single-line findings → diagnoses/procedure/team, anesthesia/EBL, findings, specimens/devices and outcome sections. Narratives have room to document. Diagnosis/procedure fields now search Lean-supplied terms, retain raw codes, and show descriptions below aligned inputs. The first open-dropdown review exposed dark text on a dark highlight; the final painter inherits the option's contrasting foreground, with a browser contrast assertion. | [Brief Op Note](../../app/shots/realism/surg/after/w6OpNote-task.png), [code search](../../app/shots/realism/surg/after/w6OpNote-code-search.png), [explicit draft selections](../../app/shots/realism/surg/after/w6OpNote-code-selected.png) |
| Postprocedure Orders | Generic numbered medication rows → diet/activity, VTE, monitoring, nursing, scheduled/PRN pain, prophylaxis and nausea groups. Draft set values still require their original confirmations. | [Postprocedure](../../app/shots/realism/surg/after/w6PostOp-task.png) |
| Laboratory summary labels | Multi-line standard terminology names → short clinical captions for the four verified tests, with MDRD retained. Local qualified names remain intact. Values, units, reference ranges, dates, flags, codes and trend points stay identical to the previous real-WASM projections. | [Before](../../app/shots/realism/surg/before/lab-results-load.png), [after](../../app/shots/realism/surg/after/lab-results-load.png) |
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


| Live encounter selection | The encounter picker printed transport IDs → patient names, recorded date, class and status. Actual selected references remain bound in the adapter. | [Encounter picker](../../app/shots/realism/surg/after/live-encounter-picker.png) |
| Live review confirmation | A save toast covered the patient banner and printed review/resource IDs → readable allergy-review confirmation below the banner. Normal sessions omit record-viewer controls. | [Normal clinic](../../app/shots/realism/surg/after/live-review-save-normal.png), [debug save](../../app/shots/realism/surg/after/live-review-save.png) |
| Live technical encounter details | The always-visible technical drawer printed encounter/resource paths → explicit debug-only context with the patient's name and numbered saved-record actions. Opening the action still verifies the actual saved Provenance. | [Debug context](../../app/shots/realism/surg/after/live-encounter-details.png) |

### Efficiency and validation evidence

Machine-readable before/after measurements: [surg-realism-metrics.json](surg-realism-metrics.json). Control probes: [surg-controls.json](../audits/surg-controls.json). The measurement script uses the existing certified `Measure.lean` adapter and `ehr min-clicks` on the actual P5 presets, plus all ten World-2 P5 schedules. Both programs run under the same native interpreter. The stock `pnpm complexity --release-root releases` union benchmark is retained separately in `programs/benchmarks/canonical-complexity.json`; its workflow totals are not the P5 preset totals.

Clicks and keys are optimized independently within the reported search space. These P5 measurements use `navigationDirected`; they do not establish a global minimum over all interpreter moves. KLM replays the minimum-click path at a fixed clock and is an estimate, not a KLM minimum or a clinician timing study. World-2 replay uses the actual release day transitions and seed 7, including the simulated interruptions/detours. Layout changes can alter its policy path and random draws; fewer clicks need not imply a lower total KLM estimate.

The code-choice increment retains those measurements: the model counts the
interpreter's raw-code entry, rather than timing a clinician's terminology
search. It therefore makes no estimated time-saving claim for the new quick picks.

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

Shared-shell integration through `a462b19` preserves the semantic navigator, multiline fields, entry hints and row actions. The role now comes from Lean's permission-bearing user, and pre-op context no longer displays the unrelated historical clinic as a current location. The desktop banner/section-scroll behavior has a real-browser regression. App build/lint/206 tests, agent 84 tests/typecheck/lint, the full proof and certification gates, 1,284 simulated tasks, the 45-state browser gate and archived replay all pass. Both surgical native/WASM FHIR projections match; min-click/KLM evidence and all after screenshots are refreshed. [Current validation](../audits/surg-realism-validation.json).

The surgical code-choice milestone passes the same full proof, certification,
simulation and archived-replay gates, with 209 app tests and 84 agent tests.
All 120 coded-field instances with supplied choices across the 72 release/screens
bind to visible semantic fields and retain manual entry. The real-WASM browser
walk verifies code selection, no capture during filtering, persistence, and
keyboard-highlight contrast of at least 4.5:1. The keyboard walk keeps the pointer outside the dropdown and waits for each declared highlight before the next key. The 45-state desktop/narrow gate
passes again without cache reuse (99 pass, three fixture-dependent skips).
The 82-image set includes the two additional draft code-choice views. Min-click
and KLM measurements are regenerated and unchanged by this increment.

Main integration through `924425f` retains the surgeon's active-section IDs,
field choices and persistent desktop banner while adopting the shared semantic
navigation regions. Existing enabled navigation-tagged gotos move into the shell
with their original component IDs and events; hotkey/blocked controls retain
their metadata in the workspace. Archived run1-P3 still has zero mismatches.
All proof/certification/simulation gates pass. The shared visual/search/contrast
walk passes 13 tests across the role palettes, and the 45-state desktop/narrow
gate passes 99 tests with three fixture-dependent skips. Surgical screenshots
are refreshed. The broader [app/EHR control audit](../audits/surg-browser-controls.json)
records 2,704 working controls, 113 explained disabled states, and no dead/error
controls across six roles. This is bounded configuration coverage (up to 48 per
role), supplemented by complete world-2 task replay and the 72-screen P5 probe.
Its report and regression gate support an isolated output directory, preserving
the shared lane's separate live-agent evidence.


The selected-encounter increment integrates main through `062a4ef`, preserving
structured tables, source row actions, code quick picks and multiline fields
while adopting its display cleanup and explicit-debug Inspector. The live P5
adapter now passes the selected encounter to Lean instead of treating a
surgeon's clinic visit as pre-op. Native and WASM agree on both real surgical
projections and three selected-encounter fixtures; named Lean examples also
cover unknown/foreign references, explicit pre-op priority and unknown code
systems. The complete encounter history stays available in Chart Review.
The live browser checks a real persisted allergy-review Provenance and the
normal clinic's absence of technical controls. Its readable receipt stays below
the patient banner; closing the chart returns to the worklist through the existing
shell action, without changing the clinical encounter status. The initial notification-offset review exposed empty toast
containers covering controls; the final CSS targets only the bottom-right
container, and the full live click path passes.

App build/lint and 226 tests pass, along with agent typecheck/lint and 84 tests.
The 17 clinical/search/contrast/live browser tests and all 45 semantic screen
states pass (99 checks, three fixture-dependent skips, no cache reuse).
The shared display test distinguishes structured source-cell formatting from
the legacy medication-card formatting while retaining exact ARIA equality and
checking every supplied row value. All proof/certification/simulation gates and
archived replay pass again. Min-click/KLM measurements are regenerated and
unchanged. The current [validation manifest](../audits/surg-realism-validation.json)
binds the selected-encounter increment, artifact hashes and all 89 images. The refreshed shared control audit records 2,704 working controls, 113 explained disabled states, zero dead controls and zero errors; its fast regression gate passes. Coverage is bounded to 48 configurations per role, with per-role remaining checkpoints retained in the report.


The clinician-identity increment adds a typed optional Practitioner projection,
with exact native/WASM UI agreement for matched, foreign and duplicate profile
fixtures. Named Lean examples also reject missing names, empty identities and
Patient resources used as practitioner names. The source P5 fixture shows
`Whitaker, James · General surgeon`; the authenticated live profile supplies
`Dr. James Whitaker, MD, FACS · General surgeon`. No display name is hardcoded in
the painter. All 91 before/after images are refreshed or retained with their
baseline revisions recorded; the narrow identity fixture was also inspected.
The source caption remains fully visible after wrapping onto its own line.

The same proof, certification, full-world simulation and archived replay gates
pass. App build/lint/226 tests and agent typecheck/lint/84 tests pass. The semantic
viewer-caption assertion now checks Lean's exact supplied string; 46 states pass
101 desktop/narrow checks with three fixture-dependent skips, without cache
reuse. The 17 clinical/live/search/contrast tests pass, including actual saved
Provenance binding and normal close-chart behavior. Click/KLM measurements are
regenerated and unchanged. The refreshed six-role control audit and regression gate pass with 2,704 working controls, 113 explained disabled states, zero dead controls and zero errors; the report retains the bounded configuration coverage and remaining checkpoints. [Current artifact-bound validation](../audits/surg-realism-validation.json).


The laboratory-caption increment keeps the results table and every row intact.
The focused native before/after view shows standard test names on a single line,
leaving more trend rows visible beside the original values, units, dates, ranges
and flags. The live clinic's `eGFR (MDRD)` caption has a positive browser assertion.
The 93-image set includes this focused comparison. The real-WASM projection
comparison records four renamed tests in the case and one in the consult; all
other facts and display fields are exactly equal to the previous green build.
The supplied codes and MDRD method are preserved, including historical codes.

Default build, kernel checking and the 18/21/43 Comparator suites pass; 15/15
projections certify, 18/18 bad programs reject, 1,284/1,284 tasks complete, and
archived replay has zero mismatches. App build/lint/226 tests and agent
typecheck/lint/84 tests pass. The 46-state semantic gate passes 101 checks with
three fixture-dependent skips, and the 17 clinical/live/search/contrast tests
pass. The refreshed six-role control audit and regression pass: 2,704 working controls, 113 explained disabled states, no dead controls and no errors. Bounded coverage and remaining checkpoints are retained in the report. Regenerated min-click/KLM results are unchanged by this increment.
[Current validation](../audits/surg-realism-validation.json) and
[projection evidence](../audits/surg-controls.json) retain the source/artifact
bindings and exact caption changes.


The final app-shell wording pass renames the existing patient-search action to
`Search patients`, uses `Searching patients` while pending, and correctly says
`1 patient found` for a single result. Its search callback, permissions and clinical
context are unchanged. The live picker/save screenshots are refreshed. The
20-test clinical/live-login/search/contrast walk passes, along with app
build/lint/226 tests and agent typecheck/lint/84 tests. Native proof, certification,
simulation and measurement evidence is reused only for the identical Lean/WASM
fingerprint `82f2f766`; `wasm-check` confirms it remains current. The final 46-state browser gate passes 101 checks with three fixture-dependent skips. The six-role control audit and regression pass with 2,704 working controls, 113 explained disabled states, zero dead controls and zero errors. A shared temporary-filesystem quota interrupted the first audit before completion; completed SURG proof scratch was removed and a fresh audit/regression passed against the identical app artifact. The report preserves bounded coverage and remaining checkpoints.

### Ambulatory/SURG integration of main `e4d10c5` (2026-11-01)

Both research sections and the earlier image evidence are retained. The shared
semantic vocabulary has one presentation enum and transparent value-set,
reference-curve and row-action wrappers. One painter path accepts the shared
value sets and field-specific surgical favorites, preserving code entry,
filtering without capture, explicit confirmation, human-only markers and public
source captions. The existing UiProofs theorem statements from both parents
remain unchanged; no spec or property definition changes.

The two FHIR supporting-view collections now produce one bound `scheduleTasks`
payload: the pre-op setting uses surgical cases, the ambulatory setting uses
appointments, and a dated surgical request can supply the queue when no setting
is available. Other source views coexist. Complete per-observation lab results
retain their values/components and use SURG's conservative standard-name
captions. The shell uses main's responsive sticky banner/navigation, with Lean's
active navigator identity and screen-based scroll reset. Both Encounter options
and direct Close chart remain available; the ordinary encounter panel uses the
patient's readable name, while saved-record inspection retains its real binding.
The surgical live lab check follows Chart Review → Results.

At 1440×900, visual review of the four requested screens confirms:

| Screen | Integration review |
| --- | --- |
| [P1 home](../../app/shots/realism/surg/integration/p1-home.png) | The ambulatory appointment row, status, encounter-opening action and In Basket activities remain intact; no perioperative columns leak into the schedule. |
| [P4 growth](../../app/shots/realism/surg/integration/p4-growth.png) | Measured weight/height points, the separately sourced WHO/CDC curves, reference labels and complete measurement table remain present. The red allergy banner wraps while retaining patient identity. |
| [P5 OR Schedule](../../app/shots/realism/surg/integration/p5-or-schedule.png) | The source case's room, start, procedure, indication, patient, surgeon, status and real row control remain intact. Historical encounter labels remain distinct from the planned OR context. |
| [P5 op note](../../app/shots/realism/surg/integration/p5-op-note.png) | The surgical navigator's active section, case summary, coded diagnoses/procedure, team, anesthesia, EBL and narrative groups remain intact. Findings remain empty until actual entry or an explicitly chosen template. |

The integrated milestone passes the 359-job default build, kernel replay,
root/checker/renderer Comparators, D1–D6, 15/15 persona certifications and 18/18
core negative cases. World 2 completes 1,284/1,284 tasks and the archived P3
replay has zero mismatches. Native/WASM agrees across 72 surgical release
screens, 34 ambulatory screens and 16 structured fixtures. App build/lint/255
tests, agent typecheck/lint/84 tests, 213 semantic browser checks (three intended
viewport skips) and 59 realism/live-flow cases pass. The bounded six-role census
records 2,792 working controls, 113 explained disabled states, zero dead controls
and zero errors; its regression passes. Remaining checkpoints outside the
48-configuration limit are recorded explicitly for the nursing roles. All 93
prior SURG screenshot checksums remain unchanged.

Current build-bound verification is recorded in
[the integration report](../audits/surg-ambulatory-integration.json) and
[the bounded control census](../audits/surg-integrated-browser-controls.json).
Artifacts were regenerated through content export, gents, WASM, certification
and the canonical complexity benchmark; generated conflicts were not hand-merged.

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

## Canonical realism: P2 ED physician and P3 inpatient RN (acute care)

Research and implementation lane: `lane/acute`, 2026-11-01. Public training materials establish patterns, not a universal installation. Vendor images were inspected outside the repository; no vendor screenshots, logos, or assets are included. The canonical keeps its hospital policies, role permissions, review requirements, and human actions.

### Acute reference review

- **Epic ED:** [Rady Children's ASAP resident manual, June 2021](https://ucsdpeds.com/wp-content/uploads/2023/04/Epic-Manual-2021.pdf), printed pp.2–5 and discharge sections. The inspected p.3 shows a compact patient table with bed, complaint, acuity, team, new results, lab and imaging progress; its selected chart has triage, home meds, allergies, prior visits and vitals alongside it. This supports a departmental table plus selected-chart summary, rather than large encounter cards. The manual distinguishes department filters, patient selection, provider note, orders, and disposition. We use original terminology and layouts; the synthetic ESI field remains ESI, not a CTAS conversion.
- **Cerner ED:** [CST ED LaunchPoint overview](https://cstcernerhelp.healthcarebc.ca/Applications/FirstNet/ED_LaunchPoint/ED_LaunchPoint_Overview.htm) documents a multi-patient landing view with room, LOS, acuity, assignment, complaint, vitals and order progress. [ED depart process](https://cstcernerhelp.healthcarebc.ca/Applications/FirstNet/ED_LaunchPoint/ED_Depart_Process.htm) separates the clinical discharge/admission page, discharge documents and final encounter departure. A disposition decision must not imply that a patient physically left the department, a bed was assigned, or unsigned orders were transmitted.
- **Epic inpatient:** [Riverside Adult Med Surg Nurse exercise booklet](https://otis3.riversidehealthcare.net/content/epic/inpatient/orientation%20materials/epic%20online%20exercise%20book.pdf), printed pp.3–7, 9–12. Brain tasks lead to chart activities; Summary/SBAR supports receiving report. Flowsheets use time columns and distinguish pending documentation from filed values. MAR training selects a due dose before documenting action, date/time and dose, with Given subsequently visible in the MAR. The workbook explicitly describes scan bypasses for its training environment; these are not adopted. Our actual wristband/medication scans and different-nurse check remain human-only.
- **Cerner inpatient:** [MAR overview](https://cstcernerhelp.healthcarebc.ca/Patient_Chart/MAR/Medication_Administration_Record_%28MAR%29_Overview.htm) separates scheduled, unscheduled, PRN, continuous and discontinued medications, with order detail beside administration-time cells. Its reverse chronological default differs from some Epic views; our grid is labeled by supplied date/time, without claiming a universal direction. [Closed-loop medication administration](https://cstcernerhelp.healthcarebc.ca/Patient_Chart/MAR/Closed_Loop_Medication_Administration_Workflow.htm) documents wristband first, then medication, clinical parameters, witness where required and actual documentation; PRN response is later documentation. [CST inpatient admission](https://cstcernerhelp.healthcarebc.ca/Workflows/Inpatient/Admission_Transfer_Discharge/Admission_Inpatient.htm) also distinguishes admission orders, bed coordination, RN assignment and receiving-nurse tasks. Merely visiting an activity does not complete its task.

### Target layouts and semantic contract

All screens retain the same shared EHR and persona pre-set view. The clinical navigator uses actual destination names. Chart Review exposes Encounters, Notes, Results, Meds, Problems, Allergies and Imaging. Every action is an existing Lean button/field/tab event. The [presentation contract](presentation-contract.md) selects read-only layouts with `.present.<kind>` tag suffixes; clinical rows never contain file paths, component IDs, or fake Open controls.

| Screen | Target reading order and original presentation |
| --- | --- |
| ED Track Board | Department table: room, patient, age/sex, complaint, ESI, arrival/LOS, RN/provider, lab/imaging progress and disposition; selected encounter triage summary; explicit Open selected encounter. `present.trackBoard`. |
| Triage summary | Arrival/complaint/ESI; kg weight and complete vitals with units; isolation screening; allergy list and Mark reviewed. Provider reads triage before documenting its note. |
| ED Provider Note | Triage context; HPI/ROS; exam; laboratory results and imaging; MDM/differential/ED course/plan; medication reconciliation; linked billing diagnosis and level of service; actual note signature. `present.results` and `present.table`. |
| ED order sets | Named set choices, each draft medication line with its existing confirmations, then unsigned orders and Review and sign. No decorative inclusion checkboxes. |
| ED Orders | Search, preference list, complete dose/prescription details, optional chart data, pending orders and Review and sign. Preserve real baseline composer length and existing new-line guard. |
| ED Sign orders | Full order summary, allergies, current meds, kg dose check, CURES and controlled details, human identity immediately above signature, modal severe warnings. |
| Disposition | Vital signs visible at commit; orders this visit; choice/diagnosis/condition; admission service/level for bed request; discharge instructions/follow-up. Set disposition records the actual modeled decision. |
| Unit Census & MAR | Patient/shift-task worklist; orders requiring review; selected patient handoff; shift-start allergy review; Open selected patient's MAR. `present.worklist`. |
| MAR | Medication, dose/unit, route, frequency and explicit date/time task cells; selected medication task; optional PRN/glucose/coagulation tabs; Document selected dose. `present.timeGrid`. No frequency-expanded invented times or active-order-to-Given inference. |
| Medication administration | Ordered dose, allergies, relevant glucose/coagulation and PRN history in workspace; wristband then medication scan; independent check; pre-dose pain; action/site/reason; Record administration. Scanning never files a dose. |
| Flowsheets | Prior observations by measure/unit/time; newly charted vital signs; PRN history and later pain reassessment; systems assessment; File assessment. `present.flowsheet`. Blank cells remain missing. |
| Handoff / SBAR | Last report; explicit template producing drafts requiring review; Situation, Background, Assessment, Recommendation; outstanding tasks. No invented handoff-signature or claim of backend persistence from navigation. |

The initial implementation deliberately retains the separate worklist/MAR/administration activities and all signing screens. Open groups do not add mandatory collapse/expand clicks. The existing identity validator expects initials/sex/age; wristband scanner tokens are separate. No spec, property, permission, temporal rule or clinical default is weakened.

### Measurement and visual review

Before/after evidence and screen-specific self-review are recorded with the acute screenshots and measurement report. Baseline P2/P3 simulation: all 20 world-2 schedules completed with zero incomplete tasks. Baseline complexity uses the current `releases/` explicitly, rather than archived run1 programs. The helper's default 8 GB virtual-memory ceiling fails to create a Lean worker on this host; `EHR_LEAN_MEMORY_KB=16000000 LEAN_NUM_THREADS=4 pnpm complexity --release-root releases` preserves the same search and metrics with a larger virtual address limit. This is not a change to KLM constants or the minimum-click search.

First native checkpoint: 15/15 persona projections certify, all 17 active bad programs reject, all 1,284 world-2 tasks complete. W3 remains 57 clicks / 226 keys / 198.45 KLM seconds; W4 remains 25 clicks / 39 keys / 129.95 seconds in v1/v2/v3. Full evidence: [acute-complexity.json](acute-complexity.json). KLM is an estimate for the minimum-click replay, not an independently minimized time.

Initial 1440×900 comparison (same Synthea chart, actual P2 physician/P3 RN roles):

| Screen | Before → first checkpoint; honest remaining work |
| --- | --- |
| ED Track Board | Generic Department table and Open patient → explicitly departmental view and selected-encounter summary/action. Empty rows in this historical fixture are still inadequate; needs supplied department encounters and structured projection. |
| Triage | Vitals before complaint/acuity → presenting complaint/arrival/ESI first, then unit-labeled vitals and infection/allergy review. Compact field alignment survives. |
| ED Provider Note | Flat mixed clinical/billing fields → History, Exam, Results/Imaging, MDM, Med Rec, Billing in clinical order. No fabricated completed note. |
| ED order sets | Generic set heading → ED preference sets; all existing draft rows and confirmations retained. Long per-field composers remain baseline friction. |
| ED Orders | Same production-length search/composer path. No optimizer shortcuts or new mandatory prompts. |
| ED Sign orders | Same full review/signature path; identity and severe-alert handling preserved. Required details remain readable and expanded. |
| Disposition | Unstructured decision fields → decision, admission/bed request and discharge instruction sections with vitals visible. No claim that bed request allocates a bed. |
| Unit Census & MAR | Generic due/overdue block → My patients shift tasks, orders requiring review, selected handoff and shift allergy review. Historical fixture still lacks a populated task census. |
| MAR | Empty generic table → tagged time-grid plus selected medication detail and explicit Document selected dose. True grid/dated rows await presentation integration. |
| Medication administration | Five rights plus loose fields → ordered wristband/medication scanning, independent check, pre-dose pain and administration documentation. Separate one-field sections are too tall in the first screenshot; compact them in the next pass. |
| Flowsheets | Generic observations and loose reassessment → tagged time-oriented history, vitals with units, PRN history, pain response and systems assessment. Actual observed times must come from data. |
| Handoff / SBAR | Loose SBAR fields → report section with the same template/confirmation semantics and outstanding-task context. No invented filing action. |

Images and exact native semantic inputs: `app/shots/realism/acute/before/` and `after/`; reproducer: `scripts/acute-review.mjs`. The first fixture is a historical outpatient Synthea chart, so it does not substantiate acute encounter content or dose-task selection. A populated acute fixture and the shared presentation/shell integration remain necessary before calling the visual milestone complete.

Second pass adds actual supporting data: selected-encounter triage and exact selected-order dose detail, with prior administrations separate from ordered values. Glucose/coagulation carry supplied flags, ranges and times; PRN history uses recorded administrations; handoff uses supplied clinical documents. The new reader rejects a missing order selector or an order from another encounter. Source fixtures for visual review are reproducible with `node scripts/acute-review-fixtures.mjs /tmp/acute-review-fixtures`; the additional acute resources are an original synthetic review scenario on the committed Synthea history. They are not world-task outcomes. Independent check and pre-dose pain now share one compact section, correcting the overly tall first pass.

The populated review exposed three concrete issues, now corrected in Lean: heterogeneous ordered/actual dose rows made a 14-column table, so dose detail returns to a labeled clinical list; scan fields move directly after the dose/allergy review; and current acute glucose/coagulation panels select observations from the chosen encounter, rather than showing years of old glucose values. Triage shows the most recent timestamp per measure. Disposition's required `vitals` panel likewise uses the latest reading per measure, retaining **all** conflicting records tied at that latest timestamp. The history remains available in chart/flowsheet views. A named renderer regression preserves those tied values. The PCP banner also no longer guesses that the current ED attending is the patient's PCP.

The archived run1-P3 check passed: 424 tasks / 14,658 events plus 3 baselines / 137 events, zero mismatches. These are historical saved-context interpreter trajectories, not new canonical simulation or a claim that old screenshots changed.

FHIR mapping was checked against the primary [R4 Task definition](https://hl7.org/fhir/R4/task-definitions.html#Task.restriction.period): the fulfillment period's end is a due-by time, distinct from actual task execution. [R4 MedicationAdministration](https://hl7.org/fhir/R4/medicationadministration-definitions.html) keeps the authorizing request, actual effective time, status and actual dosage separate. The MAR uses those distinctions; it does not match an actual dose to the nearest scheduled time or expand a sig into invented times. The native fallback now renders real supplied Encounter/Task/MedicationRequest/MedicationAdministration/Observation rows for the board, worklist, MAR and flowsheet through the existing payload contract. A patient-scoped input is not represented as a complete department census.

Populated fallback checkpoint: all 15 projections certify; 17/17 active bad programs reject; 1,284/1,284 world-2 tasks complete; default build, kernel replay and root Comparator pass; current WASM manifest passes; app lint/build and 160 app / 41 agent tests pass. [Acute control audit](../audits/acute-buttons.json) exercises 366 enabled native buttons and 228 inactive tabs across 36 acute screen/release combinations, with 17 disabled actions carrying reasons. Its scope is native declared controls; browser ARIA/visibility and generic painter event-mapping are separate checks. No claims are made about changing patients by clicking a read-only grid row.

Populated fallback screenshots now show actual board, shift-task, MAR and flowsheet rows; desktop/narrow ARIA, visibility and legibility checks pass (33 tests, 3 optional screenshot tests skipped). The self-review still identifies presentation work: MAR actual-time headers need the same readable time formatting as scheduled columns; the board is correctly scoped to its supplied patient; provenance currently exposes an internal record key; shared search lacks query state/results in Core. These are explicitly tracked in change requests. The source-backed grid is a substantial improvement over empty panels, but this is not yet the final production-realism milestone.


Third pass follows the documented role landing patterns: P2 opens the ED Track Board and P3 opens the unit worklist; custom starts remain unchanged. The shared vendor program still starts in its neutral workspace. W3/W4 now retain their real Lean navigator groups, and the generic painter draws each destination as its declared click event. The previous client-only accordion headings are replaced with static region headings. Exact ARIA checks now cover the real destination buttons. This is semantic navigation, not a parallel React workflow menu.

Clinical narrative fields (HPI/ROS/exam/MDM, nursing assessment and SBAR) carry a Lean narrative tag and render as multiline inputs. The same text entry and separate human confirmation events remain in force. Chart-prefill badges display “From chart” without leaking the internal record key; source metadata remains unchanged in the semantic tree. MAR date/time headers use the same supplied date, minute and offset for planned and actual entries, retain duplicate records, and share sorted columns across orders. ED results use current-encounter bound rows with supplied ranges and flags; an empty current result payload does not silently substitute old outpatient labs. The W3 composer no longer draws an empty Dosing group.


Third-pass visual review covered all twelve acute screens at 1440×900. The left navigator is populated, HPI/ROS/exam/MDM and SBAR have usable note areas, and current ED labs show their supplied H/L flags. Review found the migration footer had buried selected-item actions after the long chart-history tab body. A Lean `primaryNavigation` tag now keeps Open selected encounter immediately after the board, Open selected patient's MAR after the shift allergy review, and Document selected dose after the selected medication details. This changes placement, not the event or its guard. All twelve desktop/narrow ARIA/visibility/contrast checks passed, followed by a second check of those three corrected action screens. Fresh native audit: 357 enabled buttons, 228 inactive tabs, 23 reason-bearing disabled actions across 36 screen/release combinations. The archived run remains at zero mismatches; no old saved programs were rewritten. The remaining conspicuous visual limitation is dense fallback grid columns; structured presentation integration is the next pass.

Acute/presentation integration keeps the new transparent `presentation` wrapper and its original info children. Wide board/worklist/MAR/flowsheet components carry a Lean `wideWorkspace` tag. It omits only automatic summary-rail supplements, retaining authored side components, the complete storyboard, chart tabs and required workspace reviews. This recovers horizontal space for the department and time grids without hiding a medication-safety panel. The generic MAR includes Category with its order metadata rather than treating it as a time column.

Current encounter vitals now use the same bound-source precedence as current results. In a selected acute encounter, absent current vitals stay empty instead of substituting last spring's BP. Latest same-time conflicting records remain visible. Named reader/renderer regressions exercise the wrong encounter, older reading, tied current readings and empty-current fallback cases. The review fixture now includes separate recorded systolic/diastolic observations, rather than relying on a historical blood-pressure panel.

The additional [role-projected native measurement](acute-persona-min-clicks.json) isolates role landing starts on the same representative tasks: P2 57→56 clicks and P3 21→19; keystrokes unchanged. The union-canonical benchmark remains 57/25 clicks, since its neutral shared start remains home. These are different program projections; they are not substituted for one another. The direct role measurement is clicks/keystrokes only; KLM estimates remain in the fixed-value union benchmark.



The MAR density review now uses the supplied context day, with an hourly axis between recorded times. Empty hours are blank layout cells, never scheduled doses. Planned cells come only from explicit timing events; actual cells retain their exact minute, dose, route, site and reason. Earlier completed administrations remain in the selected-order history panel. Explicit in-progress administrations remain visible even when their recorded start precedes the selected day. A current-encounter administration without a supplied matching order stays in a separate row, rather than being attached by drug name. Regressions cover unmatched same-drug records, exact minutes, the selected date, ongoing records and invalid source-hour retention. Medication metadata now wraps into compact labeled lines. The already-selected medication task and its real Document selected dose action precede the overview grid, so its action stays in the task context and does not depend on scrolling through chart history. The MAR remains a separate activity; scans and administration documentation stay on the administration screen. The nurse worklist and ED lab-availability statuses receive the same read-only informational tint as other supplied pending/ordered states.


Structured acute checkpoint: 15/15 projections certify and 18/18 bad programs reject; all 1,284 world-2 tasks complete. Native control audit remains 357 enabled buttons, 228 inactive tabs and 23 reason-bearing disabled actions across 36 screen/release combinations. The current painter passes all twelve desktop/narrow semantic ARIA, visibility and contrast checks (33 pass, 3 optional image tests skipped). Manual 1440×900 review corrected narrow MAR status wrapping and retained readable hourly labels at the 12px minimum. App lint/build, 185 app tests and 73 agent tests pass. The current WASM replay verifies 14,658 recorded events plus 137 baseline events with zero mismatches. Union W3/W4 click/key/KLM metrics remain unchanged. The historical archive is untouched. Fresh kernel replay accepts the default build with only propext, Quot.sound and Classical.choice; root Comparator passes, and all fifteen exported persona files pass the renderer’s D5 diagnostic. The shared Core search gap remains explicitly open; this checkpoint does not claim its search fields are functional.


Shared shell integration resolves the search gap through Lean: shown search components accept ordinary text entry into optional query metadata, without capturing clinical evidence. The query and its matching source records are emitted in `UiScreen`; chart/commit review panels remain complete. The acute native audit now checks all 39 search inputs as well as buttons/tabs, including unchanged captures, receipts, commits and order slot. The shell's actual browser search test also passes. Dated chart weight, explicit missing identifiers, code status and isolation join the colored shared storyboard. Acute keeps static navigator headings and the real declared destination buttons, with no extra client-only accordion controls. The screenshot harness supplies the same role caption as the application while preserving the exact native clinical tree. This integration passes 15/15 certifications, 18/18 negative programs, 1,284/1,284 tasks and archived replay with zero mismatches. App build/lint, 198 app tests and 84 agent tests pass. All twelve acute desktop/narrow ARIA, visibility and contrast checks pass (33 checks); the shared-shell visual review reaches all five personas and checks the semantic Notes list and its complete narrative. The native control audit covers 36 screen/release combinations, 357 buttons, 228 tabs, 39 searches and 23 explained disabled actions. Kernel replay, root Comparator and current WASM identity checks pass. Click/key/KLM measurements remain unchanged from the structured checkpoint.


Fourth-pass research cross-check: [CST Results Review for nurses](https://cstcernerhelp.healthcarebc.ca/Patient_Chart/Results/Results_Review_%28Non-Providers%29.htm) distinguishes recent results from broader chart history, and [Results Review settings](https://cstcernerhelp.healthcarebc.ca/Patient_Chart/Results/Navigate_Results_Review_-_Tips_and_Tricks.htm) uses actual recorded timestamps and reverse chronology. The acute Chart Review Results tab now retains every patient-scoped historical laboratory Observation, in addition to the separate current-encounter decision panel. Raw values, units, flags, reference ranges and status survive; chart search includes that longitudinal source. No old result is substituted into an empty current-encounter review. Named source/renderer regressions cover current-versus-historical data and another patient's same-code lab.

The [CST lab-view training](https://cstcernerhelp.healthcarebc.ca/Patient_Chart/Results/View_Lab_Results_for_Non-Providers.htm) treats graphs as a separate view and explicitly declines a one-point trend. The administration screen now uses a compact glucose result table beside the other medication-safety information, rather than a large single-point graph. The MAR retains its separate glucose detail activity. [HL7's R4 encounter classes](https://hl7.org/fhir/R4/v3/ActEncounterCode/vs.html) supply the readable Emergency/Inpatient/Observation labels; the raw codes remain unchanged in the source. Missing birth dates display an explicit unknown age, rather than a zero-year-old patient.

The row-action contract retains ordinary Lean goto controls, their identities and guards. Open selected encounter sits in its exact-selector summary section, rather than an arbitrary department-board row. Open selected patient's MAR is in the patient-scoped shift-task table; Document selected dose sits beside the selected order in its detail section. An absent worklist source row keeps its action inline through the contract's fallback. This does not switch to another patient, infer a medication task from a drug name or add an action to an unselected board encounter. The supplied chart remains patient-scoped, not a complete departmental census. The current selected encounter is listed first on the board for orientation; all other supplied active ED encounters remain visible. Screenshot self-review rejected a table-row layout for the heterogeneous triage summary and ordered-versus-actual dose history: it produced wide, mostly empty grids with broken action labels. The two rejected 1440×900 captures remain in `app/shots/realism/acute/reviewed-rejected/`. Their corrected screens use compact complete detail lists with adjacent real actions; the uniform nursing worklist retains its real row action. The browser checks allow ordinary, unconfirmed chart prefill on entering triage while requiring unchanged human-confirmed evidence and commits.

Fourth-pass validation: 15/15 persona projections certify, all 18 core bad programs reject, and all 1,284 world-2 tasks finish across all fifty schedules. Archived `run1-P3` remains at zero mismatches. All eight desktop/narrow clinical-action browser tests pass, including actual goto dispatch from the selected context, preserved patient banner, and compact glucose/range/flag review beside scanner controls. All twelve acute screen trees pass the unchanged ARIA, visibility and contrast gate (33 checks, three optional duplicate image probes skipped). Fresh app build/lint, 205 app tests, 84 agent tests and WASM asset verification pass. The native audit covers 357 buttons, 228 tabs, 39 searches and 23 explained disabled actions across 36 acute screen/release combinations. W3/W4 union click/key/KLM metrics remain unchanged in all releases, and the measurement digest matches the current native CLI. Kernel replay and root Comparator pass; all fifteen persona exports pass D5. No spec, clinical guard or theorem statement was weakened. The renderer Comparator also passes, retaining all existing theorem signatures. Native/WASM agrees on all fifteen structured examples. Additional Results-tab screenshots for ED and nursing show the restored dated history; both variants pass thirteen further desktop/narrow checks (three optional duplicate image probes skipped).


### Acute source context and persistent desktop patient identification

The long-form screenshots exposed a shell problem: patient identity scrolled out of view while signing or documenting administration. The desktop patient banner now stays at the top of the viewport. Its complete supplied content remains available in a scrollable header capped at 40% of the viewport, so an unusually long allergy list cannot cover the working area. Narrow layouts retain normal document flow. The clinical role caption no longer contains replay revision/release identifiers; those remain in the experiment controls. The generic “Active encounter” caption is now “Patient chart”; the painter cannot assert an encounter's status from the mere presence of an open chart. This uses the persistent patient-context pattern in the Rady and Riverside references above and the shared Storyboard research, with no new clinical control or React clinical decision.

Source selection now extends to the banner and visit-diagnosis prefill. An exact selected encounter determines location, class and attending, even when another visit has a newer date. The attending must have an explicit ATND participant role; an RN or PCP is not substituted. Explicit adapter diagnosis values take precedence over a chart suggestion. A missing or ambiguous acute selection produces empty current result/vital panels, rather than historical fallback. Longitudinal chart history remains separate. Observation and short-stay bed encounters are supported, including the existing dataset's legacy class aliases. Projection versions include selected encounter/order and displayed day, so switching tasks against the same FHIR bundle changes the binding version.

The [HL7 R4 Task encounter binding](https://hl7.org/fhir/R4/task-definitions.html#Task.encounter) and its [fulfillment period](https://hl7.org/fhir/R4/task-definitions.html#Task.restriction.period) support a current-encounter worklist. Worklists, PRN history and handoff reports now reject other admissions for the same patient. Exact order-linked Tasks may provide a due time and explicit due/overdue status to the MAR. Execution start is not a due time, date-only tasks do not invent a clock time, and Task completion never becomes a Given medication. Given/Held/Refused still come from MedicationAdministration. Its columns now say Recorded dose/time, so a held record does not imply delivery. The review record includes explicit held and given administrations and an overdue task; these are original synthetic inputs, not simulator outcomes.

[CST I&O training](https://cstcernerhelp.healthcarebc.ca/Patient_Chart/iView/Document_Intake_and_Output_%28I_and_O%29.htm) uses bedside time columns for measurements and explains separate documentation/totals. The acute flowsheet now includes supplied exam/survey observations alongside vitals: I&O, narrative assessments and blood-pressure components. It preserves each unit and conflicting same-time readings on one shared time axis. Missing cells stay blank; no fluid balance is inferred. The fixture uses [LOINC 9000-1, measured oral intake](https://loinc.org/9000-1) and [9187-6, urine output](https://loinc.org/9187-6), both point volumes. The shared fictional widget fixture's oral-intake/urine codes were corrected too: 9187-6 is not oral intake, and [9192-6](https://loinc.org/9192-6) is a 24-hour rate rather than a point volume. Blood-pressure UCUM codes use `mm[Hg]` with a human `mmHg` label.

The earlier acute fixture mislabeled SBAR with 51852-2. The [HL7 document ontology](https://terminology.hl7.org/en/ValueSet-v3-LoincDocumentOntologyInternational.html) identifies it as a generic Letter. That code no longer selects a handoff. The fixture now uses an explicit local handoff code; the reader also recognizes coded [nursing hospital transfer summaries](https://loinc.org/68482-9) and provider transfer summaries with the correct encounter binding. Single-attachment reports display their full original text/title without the injected “Attachment 1” transport heading. Ordinary Notes retain their complete source representation.

Acute results reuse the shared complete-value readers while retaining source-only flags and ranges. Censored/qualitative values and every report component remain visible; a glucose component of a larger panel can populate the medication-safety review with its own unit/range and the report's actual date/status. Named direct-FHIR examples cover those cases, earlier admissions, wrong patients, duplicated readings, mixed units, completed Tasks, ambiguous encounters, explicit diagnosis precedence and invalid-selection fallback. The standard `layout.overview` hint now replaces the acute-only wide-workspace tag on new programs; the earlier hint remains supported for compatibility. No spec, guard or D-rule changes.

MAR self-review caught that combining planned and recorded events into one hour-cell string made its first status color cover a later Given/Held record. Acute rows now retain separate values under the same hour key, matching the presentation contract and shared MAR reader. Each record keeps its own supplied status tint and exact minute; planned and actual records are not matched by nearest time or silently collapsed. A direct-FHIR repeated-hour regression and actual browser checks of overdue/given/held tints cover the correction. The native/WASM audit also had a stale assertion that automatic side summaries always exist. It now derives the overview request from shown source tags, asserts that automatic summaries are absent only in that case, and keeps the independent every-authored-component/exact-native-WASM checks unchanged.

Source-context checkpoint (1 November, 10:19 UTC): certification **15/15**, bad programs **18/18** rejected, world-2 **1,284/1,284**, default build, kernel replay, root/renderer Comparators and D1–D6 pass. Original render theorem statements remain unchanged. Rebuilt WASM hash is `52a584e9…`; native/WASM agrees on **324** fact bundles, **690** canonical render variants, all **15** structured examples and actual RN scan probes. A repeatable `node scripts/check-chart-search.mjs` additionally searches all **324** patient charts through real WASM, compares each result to native rendering, and checks bounded summaries with unchanged clinical captures/receipts/commits. Three stale P1 painter goldens were regenerated through the documented Lean exporter, preserving the complete program and populated prescription.

App build/lint, **206** app tests and **84** agent tests pass. Acute browser actions, search and persistent-identity checks pass **16** tests; two narrow-only identity probes are intentionally skipped because that layout retains document flow. All fourteen refreshed acute semantic inputs pass **37** desktop/narrow ARIA, visibility and contrast checks, with three optional duplicate probes skipped. Native acute census remains **357** buttons / **228** tabs / **39** searches, with **23** reason-bearing disabled actions. Archived `run1-P3` remains **0 mismatches**. All six acute union-workflow before/after metric records are unchanged: W3 **57 clicks / 198.45 s**, W4 **25 / 129.95 s**. These are the fixed-value union benchmark and retain its declared search/KLM limits. The screenshots still show room for density improvement around the selected MAR task and redundant progress strip; passing the gates is not treated as sufficient visual review.

### Nursing patient list, activity navigation and MAR density

The [CST CareCompass overview](https://cstcernerhelp.healthcarebc.ca/Applications/PowerChart/CareCompass/Care_Compass_Overview.htm) separates assigned patients from their activities and a timed task summary. [Reviewing orders/tasks](https://cstcernerhelp.healthcarebc.ca/Applications/PowerChart/CareCompass/Review_Orders_and_Tasks_in_CareCompass.htm) distinguishes opening a patient's activities from reviewing orders, and directs medication documentation to the MAR. The [single-patient task-list guide](https://cstcernerhelp.healthcarebc.ca/Patient_Chart/Single_Patient_Task_List/Manage_Tasks_from_Single_Patient_Task_List_%28SPTL%29.htm) likewise distinguishes the queue from the documentation it opens. This supports a patient row with room, demographics, RN/attending, visit reason and supplied open-task count, followed by the selected patient's task rows. The source chart remains patient-scoped; the table is not represented as a full unit assignment list.

The RN landing now follows that separation. `acuteCensusRows` supplies one exact-selected-encounter row, and the existing MAR button is attached to that patient row rather than the arbitrary first task. Reordering task resources cannot change the patient/action binding. Open-task counts include only explicit open Task statuses; completed/other-admission tasks do not inflate the count. `unitCensus` is a single additive read-only `InfoSpec` catalog declaration, required for a properly declared source component. No existing spec definition, entry/review/alert/commit requirement or D-rule changes. The earlier MAR task's technical record status remains available in the full task list; its hour cell now shows only its supplied due/overdue wording and time. A Task still cannot become a Given dose.

W3/W4 navigator groups opt into `layout.activities.nav`. Lean omits the additional numbered progress strip only when that source group is shown and has a usable navigator destination. All actual authored controls, fields and full review panels remain. Empty navigation retains the original progress overview. This is a semantic layout choice, not a React-only omission. Native examples compare the exact remaining atoms and real navigation events, including an empty-group case. The existing T10/T11/D1–D6 statements are retained; the new read-only-progress helper is added to the Comparator audit.

Visual review corrected a missing presentation wrapper around the patient-row action: the final `Patient list` includes its existing MAR button in that patient's row. The patient and tasks are now distinct readable tables, and the MAR no longer devotes a tall hour cell to the technical Task record state. The twelve activities plus two longitudinal-Results variants were re-photographed at 1440×900. The initial default browser port was occupied; verification used a separate port without stopping the existing service.

Layout checkpoint (10:42 UTC): **15/15** certifications, **18/18** rejected bad programs, **1,284/1,284** world tasks, **207** app tests and **84** agent tests pass. Default build, fresh kernel replay, root Comparator, **51** renderer Comparator statements, D1–D6 and current WASM (`c3b834e3…`) pass. Comparator's new helper initially lacked its predicate in the challenge imports; the identical `UiReadOnly` definition now lives in `UiContracts`, with its original body and theorem signatures preserved. Native/WASM agrees on **324** fact bundles, **690** render variants, **15** structured layouts and all **324** actual chart searches. Frozen replay has **0 mismatches**. Sixteen acute browser checks, five live-role ARIA comparisons and the fourteen-view **37-test** ARIA/legibility gate pass; the two narrow identity and three optional duplicate probes remain intentional skips. The **357-button / 228-tab / 39-search** native audit and all six acute click/KLM records remain unchanged. [Frozen gate identities and spec-catalog comparison](../audits/acute-verification-census.json) records the exact scope, build hashes and screenshot hashes. Existing v1/v2/v3 spec JSON is identical after removing only the new read-only census catalog item.

### Imaging reports and visible patient identity

The [FHIR R4 DiagnosticReport definition](https://hl7.org/fhir/R4/diagnosticreport.html) distinguishes a diagnostic report's status, text, result observations, author and explicit study/order links. [ImagingStudy](https://hl7.org/fhir/R4/imagingstudy.html) separately describes image acquisition and availability. The [Bundle reference rules](https://hl7.org/fhir/R4/bundle.html#references) support exact `fullUrl` references, including URNs; matching an arbitrary URL suffix would lose that identity. The original fictional review now supplies a report, study and linked findings, using the verified [LOINC portable-chest study code 30746-2](https://loinc.org/30746-2). Its logical snapshot clock is 10:00, consistent with its supplied 165-minute ED LOS and recorded 09:05/09:12 administrations.

The same provided input produced **zero imaging rows before the reader and one complete report card afterward**. The before capture is retained as `reviewed-rejected/w3Provider-imaging-source-before.png`; it comes from the previous built painter and native semantic output, not a recolored after image. The new Lean reader preserves the full conclusion and linked findings, interpreter, report time/status and the separate linked study's modality/acquisition status. Unlinked studies remain study records and cannot become final reports. Source milestones distinguish Ordered, Images available, Preliminary report and Report available without declaring every order complete. Explicit lab reports, other patients and invalidated reports are excluded. Missing names never become reference IDs; ambiguous unnamed actor references stay unnamed. Inline text is preserved, while non-text attachments say that a preview is unavailable; no fake PACS or download action is drawn.

The ED provider pane and the acute Chart Review Imaging tabs use the existing semantic notes-card presentation. The full patient imaging history retains its encounter context. Search includes those source rows, while required medication-safety reviews remain complete. Bundle normalization retains a private exact full-URL alias even when a resource already has a logical id; that alias is not a clinical row. Named source examples cover URNs, a different host with the same id suffix, wrong patients, cancelled/error reports, preliminary reports, images without reports, linked findings and attachment handling. No spec or clinical-rule change is needed for this increment.

Deep-scroll self-review exposed a limitation in the previous identity test: the name's rectangle was inside the viewport while the navigator painted over it. The before imaging capture records that defect too. The banner now stacks above the navigator and below clinical dialogs. Browser tests check the actual element at the name's center during order signing, administration, provider review and flowsheet charting. Narrow layouts retain ordinary document flow. This also corrects archived replay appearance; saved programs, clinical events, states and effort measurements remain unchanged.

The focused after capture also exposed a pre-existing blood pressure display defect: the legacy sidebar joined components in source-array order and showed diastolic before systolic on a Synthea record. The [FHIR R4 blood pressure profile](https://hl7.org/fhir/R4/bp.html) defines unordered components by their LOINC codes. Both legacy and structured readers now use those codes to show systolic/diastolic; an uncoded or mixed-unit panel keeps individually labeled component values instead of guessing. Tests retain the original 128/82 clinical-fixture expectation after supplying its missing component codes, and cover reversed ordering, mixed units, duplicate components and explicit parent values. This correction changes source display only, with no rule or numeric clinical-fact change.

Three anonymous fixture examples and their named verification counterparts previously compared entire computed item payloads using `decide`. The richer source payloads exposed that brittle reduction. Their assertions and all existing theorem signatures are unchanged; their membership witnesses now follow the interpreter's actual source-component map. The full default build checks these examples alongside the unchanged D1–D6/T10/T11 statements.

Imaging checkpoint (11:31 UTC): **15/15** persona certifications, **18/18** bad-program rejections, **1,284/1,284** world tasks, **209** app tests and **84** agent tests pass. The default build, kernel replay, all Comparator configurations, D1–D6 and current WASM (`3e2591b7…`) are green. Native/WASM agrees on **324** fact bundles, **690** render variants, **16** presentation fixtures, all **324** chart searches, and the two acute supplied-source bundles across **14** reachable screens plus two Imaging tabs. The **20** focused browser tests, five live-role ARIA comparisons and sixteen-view **41-test** ARIA/legibility gate pass; four narrow sticky-only and three optional duplicate probes are intentional skips. The **357-button / 228-tab / 39-search** native audit is green. All **21** union workflow metric payloads are unchanged, including W3/W4 in every release. The frozen trajectory verifies **14,658 + 137** events with **0 mismatches** after bounding its verifier to four workers. [Exact gate identities and screenshot hashes](../audits/acute-verification-imaging.json) distinguish this checkpoint from the earlier census checkpoint. No existing spec data or theorem statement changed.

### Nursing outlines and retained navigation

[AHRQ TeamSTEPPS SBAR](https://www.ahrq.gov/teamstepps-program/curriculum/communication/tools/sbar.html) describes a framework for the current situation, relevant background, clinician assessment and a requested action or plan. It does not supply a patient’s findings. Self-review found that the old “Copy forward last assessment” button inserted a fixed normal assessment, while the old SBAR template asserted “Stable overnight” and an ED admission regardless of source history. The action now says “Insert assessment outline”; the SBAR action says “Insert SBAR outline.” Both insert explicit editable prompts as unconfirmed drafts, using the same macro IDs and existing confirmation rules. Native-driven browser checks exercise each actual button, verify no attestation or commit, and check that a clinician’s edit becomes human entry. Before captures use the actual `dac1094` WASM, program and built painter, with the same supplied nursing chart: `reviewed-rejected/w4Flowsheet-fixed-assessment-before.png` and `w4Handoff-fixed-status-before.png`.

The desktop navigator’s original destination links now remain beside long forms. A layout-only observer measures the supplied banner’s wrapped height, so the links and focused fields clear the real banner rather than assuming a fixed height. Long navigation lists can scroll within their own region; the clinical form and required reviews retain normal document flow. Small and narrow layouts retain their original flow. This creates no new action or clinical state in React. The first retained-navigation screenshot exposed its decorative footer sliding over the links; that rejected image is retained as `reviewed-rejected/w4Handoff-outline-nav-footer-overlap.png`. The footer is removed. A handoff scroll case now checks each link’s actual center hit target as well as its rectangle, then opens its declared activity. Adjacent fields and their existing source confirmation buttons share a plain layout wrapper, preventing interleaving; it persists when confirmation clears so typing focus is retained. Browser tests click a retained link after deep provider/flowsheet scrolling and continue to compare the full ARIA tree with Lean.

Imaging-linked finding components now retain every named value, unit, comparator and missing-result explanation in the report text. A source guard covers both a censored measurement and a nonvisualized measurement. The original report conclusion and plain-text finding remain complete.

Nursing checkpoint (12:00 UTC), including main `062a4ef`: **15/15** persona certifications, **18/18** bad-program rejections, **1,284/1,284** world tasks, **226** app tests, **84** agent tests and **6** live Medplum tests pass. The live admission test had a stale Home click; it now asserts the actual P2 Track Board start and selects Disposition by its shown goto target, retaining the original admission/bed-allocation assertions. Default build, kernel replay, all Comparator configurations, D1–D6 and current WASM (`1d2c98c6…`) are green. Native/WASM agrees on **324** bundles, **690** render variants, **16** presentation fixtures, **324** searches and both actual nursing draft actions. The final API corpus has a lane-specific directory and recorded hashes matching the current compiled canonical/spec, preventing cross-lane `/tmp` overwrites. **27** focused browser tests, five live-role ARIA comparisons and **45** eighteen-view ARIA/legibility checks pass; five narrow desktop-only and two opt-in polish probes, plus three duplicate ARIA probes, are intentional skips. Thirty-six 1440×900 acute photographs and the role gallery record the final painter. The **357-button / 228-tab / 39-search** native audit, all **21** workflow metric payloads and the **0-mismatch** frozen replay remain green. [Exact verification identities](../audits/acute-verification-outlines.json) includes before-runtime hashes and the current corpus. No existing spec data or original theorem statement changed.

### MAR instructions and coded PRN conditions

The [FHIR R4 Dosage definition](https://hl7.org/fhir/R4/dosage-definitions.html) distinguishes free-text dosage instructions (`text`, the SIG) from the administration timing, and supports `asNeededCodeableConcept` as an alternative to `asNeededBoolean`. A populated coded condition explicitly means PRN; its condition is meaningful source information. The old acute MAR placed the full SIG under Frequency and recognized only Boolean PRN orders. The same supplied coded-condition review chart therefore lost its actual acetaminophen administration from PRN history. The before image, `reviewed-rejected/w4Mar-sig-prn-before.png`, uses native/WASM source `7c8b4a9` and the same patient input as the corrected reader.

The acute projection now labels the SIG Instructions, preserves the stated PRN indication, and includes actual administrations linked to either valid PRN form. An explicit Boolean retains its own meaning if malformed input supplies both choices. Source encounter/order boundaries, actual dose/time/status and independent scheduled-versus-administered records are unchanged. The additive Instructions/PRN indication presentation keys stay in the left medication-detail cell; older Frequency rows remain supported. Long instructions cannot become a time-axis column or an administration-detail record. The original review medication now uses the coded condition Pain, with the same source 650 mg administration at 07:30; it is a fictional review input, not an edited world task.

MAR source checkpoint (12:19 UTC): **15/15** persona certifications, **18/18** bad-program rejections, **1,284/1,284** world tasks, **226** app tests, **84** agent tests and **6** live Medplum tests pass. The default build, kernel replay, all Comparator configurations, D1–D6 and current WASM (`a6ad6b52…`) pass. The isolated current-canonical API corpus agrees across **324** fact bundles and **690** render variants; all **16** structured fixtures and **324** chart searches pass. Native/WASM also agrees on the supplied coded PRN order, its actual 650 mg administration and both nursing drafts. **27** focused browser tests, five role ARIA comparisons and **45** eighteen-view ARIA/legibility checks pass, with the same documented intentional skips. The **357-button / 228-tab / 39-search** native audit, all **21** workflow metric payloads and the **0-mismatch** frozen replay are green. The same input changes PRN history from **0 to 1** rows; the source time, dose, route and status are retained. [Verification, before identities and reader comparison](../audits/acute-verification-mar.json) records the exact build and screenshot hashes. Existing spec data, clinical rules and original theorem statements are unchanged.

Broad control checkpoint (12:35 UTC), committed code `a6acb3b`: the full app/clinical audit records **2,677 working interactions**, **115 explained disabled states**, **0 dead controls** and **0 errors**. It samples **198** configurations across six active live profiles; P3 and RN2 each retain eight queued checkpoints outside their 48-configuration budget. Those two use saved program lineage, while the current canonical acute projections have their separate three-release native audit and current-role browser/ARIA checks. A live Claude attempt to remove allergy review was rejected for **reviewsBeforeCommit**, and its counterexample replay passed. The fast regression and loopback/synthetic-Host performance checks pass; dashboard round trips keep the same document and request no WASM. [Bounded scope, build identity, exact counts and artifact hashes](../audits/acute-broad-verification-mar.json) distinguish these findings from exhaustive task replay and earlier frozen checkpoints.

Shared painter changes also affect the appearance of archived replay: retained navigation, grouped confirmation controls, clearer labels and quiet empty states. Its archived programs, events, clinical state sequence and effort measurements remain fixed and still verify with zero mismatches.

### Source-defined ESI and pain choices

Final form review found that the acute ESI and pain selectors opened empty menus even though their spec kinds explicitly identify `esi` (1–5) and `pain-0-10` (0–10). The Lean field-kind projection now supplies those exact numeric choices using the same existing option payload as the formulary and dose-unit selectors. No score is selected by default; there is no clinical recommendation or severity-color inference. The original event remains ordinary human code entry. Other, unenumerated code systems retain their previous free-entry behavior.

Native/WASM guards and native-driven browser interactions check the complete choice sets, initially empty input/capture, explicit selection and confirmed human capture without receipts or commits. Before screens come from the committed `0883043` runtime with the same review inputs; the unchanged painter draws that original empty-choice metadata. The before/after menu photographs show the actual empty menu versus the supplied numeric options at 1440×900. This changes no spec rule, human-only requirement, field identity or clinical default.

Verification checkpoint (12:54 UTC): the rebuilt default Lean program, kernel replay, all Comparators and D1–D6 pass; certification accepts **15/15** and rejects **18/18** bad programs; all **1,284** world-2 tasks complete, and the archived run still has **0 mismatches**. Native/WASM agrees on **324** chart bundles, **690** render variants, **16** widget fixtures and both manually entered numeric scales. App build/lint/typecheck, **226** app tests, **84** agent tests and **6** live mapper tests pass. Focused browser checks pass **31** with seven intentional skips; the gallery passes **45** ARIA checks and five live canonical role comparisons. All **21** effort payloads remain unchanged. [Selector checkpoint verification](../audits/acute-verification-choices.json) records identities and image hashes.

The 1440×900 before captures use the actual `0883043` WASM renderer with the same supplied chart inputs. The ESI menu changes from no options to five visible numeric choices; pain changes from no options to eleven choices in the existing scrollable menu. Both remain blank until an actual selection. The persistent patient context and section labels stay readable, and no painter code changes in this increment. Captures: `acute/reviewed-rejected/*-menu-before.png` and `acute/details/*-menu-after.png`.

### Administration encounter consistency

A final read-only projection review found that an exact medication-request link could override an administration's explicitly different context. [FHIR R4 MedicationAdministration](https://hl7.org/fhir/R4/medicationadministration-definitions.html#MedicationAdministration.context) defines the administration context as the visit/admission during which the event occurred; its optional request reference identifies the authorizing order. The selected chart now excludes linked administrations whose supplied context differs or cannot resolve to the selected encounter. An absent optional context retains the existing exact-order linkage. An unmatched record still requires its own selected-encounter reference and stays a separate row. No same-drug matching, source rewriting or inferred administration is introduced.

The same rule feeds selected dose detail, MAR cells and PRN history. Named examples cover wrong encounter, exact encounter, absent context and unresolved context. A native/WASM adverse-source case changes only the administration context while retaining its actual request and dose, and checks that none of its actual doses enter the selected chart. The interrupted pre-correction broad audit is not reported as a gate. A fresh committed-build audit follows the complete native/browser checks.

Encounter-consistency checkpoint (13:16 UTC): default build, kernel replay, root/renderer Comparators and D1–D6 pass; certification **15/15**, bad programs **18/18**, world tasks **1,284/1,284**, archived replay **0 mismatches**, app tests **226**, agent tests **84**, live mapper tests **6**, app/agent lint/typecheck/build and fresh WASM (`0e135be1…`) pass. The kernel export first stalled under the outer tool sandbox quota; rerunning the identical command outside that outer sandbox passed with Lean's own proof sandbox retained. All **324** fact bundles, **690** renders, **16** widgets, **324** searches, the **357-button / 228-tab / 39-search** acute audit and all **21** effort payloads remain green.

All **18** normal-chart semantic trees equal their photographed/certified `363db50` trees exactly, and the painter source is unchanged. Their prior browser checks and 36 photographs are retained by explicit identity, rather than described as new runs. The three affected adverse-context views have **six fresh 1440×900 before/after captures** and **15 fresh ARIA/visibility/contrast/focus checks**, with three intentional narrow duplicate skips. The before runtime is actual `363db50`; only the administrations' context references differ in the adverse source. Before → after: MAR retains all four orders and their scheduled tasks while three wrong-context Given/Held cells disappear; selected-dose detail retains the order while its conflicting prior-administration row disappears; PRN history changes from one wrong-context row to an empty source result. No “not given” event is inferred.

Visual self-review: the hourly MAR remains compact and the patient banner stays readable; dose/allergy/scan/result groups keep their existing hierarchy. The empty PRN administration panel still has a generic Record header in the presentation fallback, which could be compacted later; this is a display limitation, not a fabricated administration. [Current scoped identities and exact-tree reuse](../audits/acute-verification.json) bind this checkpoint; the selector checkpoint remains frozen separately.

Hard-stop handoff (13:30 UTC / 06:30 PDT): code `8aa9a20` is pushed with all scoped acute gates passing. The complete prior broad audit stays frozen at `0883043`; the current six-profile rerun was stopped before RN2 completion to finish the handoff within the owner’s cutoff and is not represented as a new complete pass. The current broad receipt records its completed profile summaries and the current scoped evidence separately. `acute-clinical-browser.json` retains the complete current P2/P3 samples and their observed controls with zero dead controls or errors. Partial raw reports were restored to the last complete set; the local partial rows/log remain available in `/tmp`.

Final short checks completed during the stop handoff: fast regression **1 pass**, loopback/synthetic-Host performance **1 pass**, with zero WASM requests on dashboard round trips. All lane preview ports are closed. The interrupted RN2/global clinical rerun remains explicitly incomplete.

### Integration with the shared presentation lane

Main `f59ed3a` brings the thirteen closed Lean presentation kinds, ambulatory value-set/reference wrappers, surgical field favorites and shared clinical drawings. Acute keeps its stable component/info IDs and source bindings, selecting the shared trackBoard, table, worklist, timeGrid, flowsheet, results and notes kinds through ordinary tags. There is one structured painter per concept; generic historical tables/notes/trends use that same module. `presentation` is a compatibility alias for the shared `presented` builder, and acute narrative fields use the shared multiline builder. Legacy narrative tags still render their ordinary text fields. No clinical guard, required field, human-only constraint or theorem statement is relaxed.

The merge retains P2 Track Board/P3 census starts, numeric ESI/pain choices, editable unconfirmed SBAR/assessment outlines and exact encounter/order-bound supporting panels. Acute payloads take precedence only for the same info ID; surgical and ambulatory supporting views retain their own IDs and bindings. The new explicit encounter selector is authoritative, with the older record selector retained for saved inputs. The responsive shared header supplies the single measured pinning implementation; adjacent supplied field/confirmation controls keep their stable layout. Public source captions take precedence, with the human-readable legacy provenance fallback retained. Audit traversal includes both new transparent wrappers.


Integrated visual review at 1440×900 uses the same supplied acute charts as the earlier captures. The public Epic ASAP, Riverside nursing and CST MAR references above remain the comparison patterns; no vendor assets were added.

| Screen | Before → integrated review |
| --- | --- |
| P2 Track Board | Acute-specific table drawing → shared trackBoard drawing. Room, ESI, elapsed time, team and lab/imaging states remain visible together; the selected encounter still opens through its real Lean action. |
| P2 Triage | Independent field spacing → shared form geometry with adjacent provenance/confirmation. The full numeric ESI and pain choice sets remain human-entered; the kg weight remains visibly unconfirmed. |
| P2 Disposition | Acute review panels → shared table drawing, retaining full vital-sign review above the admission/discharge controls. The taller review and required sign path remain deliberate baseline steps. |
| P3 Census | Separate acute worklist drawing → shared table/worklist drawing with the existing patient-row action. Tasks retain their source statuses; overdue task status remains distinct from administration history. |
| P3 MAR | Separate acute hourly drawing → shared timeGrid drawing. Instructions, PRN indication, scheduled tasks and actual given/held administrations remain separate and legible across dated hour columns. |
| P3 Flowsheets | Separate acute grid → shared flowsheet drawing. Measures, units, source times and missing cells remain intact, with new documentation beneath prior observations. |
| P3 Handoff | Acute narrative field drawing → shared multiline drawing. The previous signed report remains separate from four blank/editable SBAR fields and the explicit outline action. |

The single-chart reader still shows the supplied patient rather than fabricating a department-wide census. Date/time offsets and long source instructions remain explicit; wide grids scroll where necessary. The pinned banner and navigation do not overlap the patient identity or controls in the desktop hit-testing checks. Eighteen semantic views and thirty-six top/task photographs are in `app/shots/realism/acute/after/`.

The regenerated acute effort measurements are unchanged across v1/v2/v3: W3 **57 clicks / 226 keystrokes / 198.45 estimated KLM seconds**; W4 **25 / 39 / 129.95**. These are the existing certified search spaces and minimum-click path estimates, not a claim of globally minimal clinical effort. See [acute-complexity.json](acute-complexity.json).

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

### Review action feedback and growth-unit integration (M08)

The public [Weill Cornell eCOMP manual](https://practiceops.weillcornell.org/sites/default/files/weill_cornell_medicine_ecomp_manual_10-17.pdf), printed page 7 (PDF page 8), shows a medication list with its review action and nearby last-review indicator. The [Johns Hopkins May 31, 2019 Epic tip](https://medicine-matters.blogs.hopkinsmedicine.org/2019/05/epic-tip-of-the-week-may-31-2019/) distinguishes qualified review from medication-reconciliation completion. We adopt the visible acknowledgement pattern. We do not infer a reviewer name or wall-clock timestamp from the synthetic minute clock, or claim that the broader reconciliation task is complete.

The canonical source explicitly opts six review actions into receipt feedback. Lean supplies a `status` info node only when the existing core receipt predicate accepts the current version, age and reviewer role. The original review action remains available. A missing, stale, future-dated, wrong-version or disallowed-role receipt cannot show this status. Two new renderer theorems cover validity and read-only identity; every existing rule and theorem statement is retained.

| Screen | Before | After |
| --- | --- | --- |
| W1 Rooming | Clicking the allergy review action changed state without visible feedback. | A compact green “Review recorded” status appears beside the same action after a valid receipt. |
| W1 Medication Review | No visible acknowledgement distinguished an acted-on list. | The receipt status sits below the complete medication list; medication decisions remain separate. |
| W5 Rooming | Allergy and medication review actions had no visible acknowledgement. | Each action receives its own receipt status; growth, dosing weight and reconciliation fields retain their independent requirements. |
| W7 Review, PCP and NP | Last-visit and fill-history review actions silently created receipts. | Each tab shows the current receipt status after its own review; changing tabs still uses the original semantic tab action. |

Presentation integration `da01a57` also preserves growth readings in grams/metres as their supplied source values with an explicit normalized plot coordinate, retains timestamps for ordering same-day readings, and corrects chart-axis/source-table consistency. These typed projection changes come from the presentation lane; all AMB source clinical facts are rechecked against the original baseline.

M08 screenshot review: the compact status sits beside or directly below its original review action, wraps within its available space, and uses a green border, check icon and explicit words. W1 medication review and P4 rooming retain all medication rows and the separate reconciliation decisions; the receipt does not mark those decisions complete. The two Rx Request review views retain their original tabs and complete chart history. The 77 images include 30 initial after screens, 29 reconstructed before screens, five reviewed-state views, six receipt detail captures, and seven existing signature/picker/scrolled-context captures. All are retained in the repository, including the supplemental captures omitted by the broad screenshot ignore rule in earlier commits.

M08 verification (source `5fe0598`): default build **357** jobs, kernel checking, root Comparator and **53** independently frozen renderer statements pass; **137** prior theorem headers are unchanged. Certification remains **15/15**, bad programs **18/18** rejected, and World 2 **1,284/1,284** complete. Native/WASM agrees on **34** ambulatory views, **8** actual review clicks, **38** invalid-receipt probes and **16** structured examples. A disallowed-role probe is used only where the actual source requirements exclude a modeled role; all four roles can review allergies under at least one existing requirement. The button audit remains **277** (**266** enabled, **11** blocked). All **220** app tests, **84** agent tests and **7** seed tests pass, along with builds/lint/typecheck, **79** desktop/narrow fidelity tests (three intended viewport skips), **35** after-state and **29** before-state screen checks. Archived replay has **0** mismatches; all **324** primitive clinical fact projections match the original binary. All twelve AMB min-click/key/KLM records remain exactly unchanged.

### Medication context and source footer order (M09)

The Cornell medication-review screenshot above places a named medication beside its own status choices. The AMB captures instead had numbered reconciliation decisions separated from the full list. The canonical now explicitly tags these existing slots for medication context. Lean appends the corresponding name from the current-medication display list to each original caption. Empty names, missing rows, unrelated elements and untagged programs keep their original captions. The field ID, slot, captured code, human-entry state and required marker remain the same. The static model still declares the same decision slots; this presentation does not create additional medication write-back bindings or assert that all imported medications have been reconciled.

Main integration `062a4ef` contributes clinical text/sig formatting, quiet unstructured empty states, contextual placeholders and denser framing. Typed pickers, source row placement, growth references, explicit confirmation and receipt feedback remain. Medication-direction formatting is applied consistently to legacy and structured medication tables, with complete original text retained in accessible labels/tooltips.

The shared painter requested source footer order in `changes-requests.md`. Lean now places the original Back / Patient workspace controls after the optional Chart Review tabs for AMB screens. The semantic renderer partitions its source nodes for drawing and proves that every node and semantic atom remains present. Program component order stays stable, preserving directed search and KLM paths. Every original action and component remains. The left navigator remains available while reading the chart.

| Screen | Before | After |
| --- | --- | --- |
| W1 Medication Review | Four numbered choices required referring back to the medication list. | Each existing choice keeps its caption and adds the corresponding supplied medication name. |
| W5 Rooming | Two numbered choices sat below the list without medication context. | The two declared slots show their corresponding chart names; review receipts and decisions remain separate. |
| All W1/W2/W5/W7 clinical screens | Back / Patient workspace interrupted the clinical content before Chart Review. | The same source controls follow Chart Review in a compact navigation bar. No patient switch or new shortcut is introduced. |

The incoming medication formatter was tightened during integration: product-name “oral tablet/capsule” no longer supplies `PO` or a missing count unit to the sig. [FHIR R4 Dosage](https://hl7.org/fhir/R4/dosage-definitions.html#Dosage.route) carries route separately, while [Medication.form](https://hl7.org/fhir/R4/medication-definitions.html#Medication.form) describes product form. For example, `10 mg, 1x per 1 d` remains `10 mg daily`; it cannot acquire `PO` or become a tablet count. A supplied `1 tab PO daily` remains intact, as do unfamiliar directions and PEG instructions. Product wording stays with the medication name. No clinical fact or captured dose is rewritten, and the structured and legacy painters use the same display function.

Narrative note bodies also bypass terminology/sig cleanup: their `Text` cell is drawn verbatim in both ordinary and structured note views. A regression includes ontology-like wording, a quoted sig and line breaks. The record-completeness browser gate checks these cells against their original text, while compact concept names retain the shared display formatting.

M09 visual review: the first pass repeated the full long medication caption inside its empty selector and left input rows uneven. The final painter retains the full source caption, uses a short generic prompt for a long caption, and aligns the input row. Medication lists, note text, review indicators and all controls remain. The same current painter was used for all 29 reconstructed before views and all 35 current/receipt-state views, with 77 captures refreshed at 1440×900.

M09 verification (source `4442757` with the final prompt/alignment polish): default build **357** jobs, kernel, root Comparator and **56** frozen renderer statements pass. All **154** prior theorem headers in Render/PatchWitness remain unchanged. Certification is **15/15**, bad programs **18/18** rejected, World 2 **1,284/1,284**, native button audit **277** (**266** enabled / **11** explained disabled), native/WASM **34** screens plus **6** actual medication-context entries, **8** review clicks / **38** invalid receipt probes, and **16** shared structured fixtures. App build/lint and **238** tests, **84** agent tests with typecheck/lint, **7** seed tests, **79** browser fidelity checks (three intended viewport skips), **35** current-state and **29** before-state screenshot/event checks pass. All **324** primitive fact projections match, and archived replay has **0** mismatches. All **21** workflow effort groups match the prior green milestone exactly, including the twelve AMB before/after records. Footer placement is performed in the semantic UI while program component order stays stable; the measured directed search paths and KLM estimates are unchanged. These estimates exclude reading and scrolling.

### Current visit note review (M10)

A native reproduction entered a physician HPI through the public event seam, then projected the closing screen. The human-confirmed entry existed in State, but `noteSummary.rows` was empty. The closing panel was therefore an empty chart placeholder rather than a view of the current note.

[Vanderbilt's outpatient Epic exercise](https://www.vumc.org/vclic/intro-epic-and-build-capabilities) describes documenting the visit throughout the encounter and checking completeness before signing, with structured diagnoses/orders kept distinct from the coherent note. [Johns Hopkins' March 15, 2019 tip](https://medicine-matters.blogs.hopkinsmedicine.org/2019/03/epic-tip-of-the-week-5/) confirms note-preview panes as an ordinary configurable part of the notes activity. The public text was reviewed; the VUMC network-only videos were not accessed.

The source `noteSummary` now projects the actual current note captures, preserving each value, paragraph break and confirmation state across all captured slots. A document layout comes from an explicit canonical `layout.document` tag. It shows one read-only paper with clinical section headings in a keyboard-scrollable pane. It does not infer an author, signature, completed review or clinical fact. Historical notes and supplied supporting records remain separate. No required entry, clinical guard, human-only rule or commit is changed.

| Screen | Before | After |
| --- | --- | --- |
| W1 Sign Visit | Note review remained empty after HPI entry. | Current entered history, ROS, examination, plan and other note sections are shown verbatim, with pending confirmation explicit. |
| W5 Sign Visit | The closing note panel did not reflect the pediatric Visit Note editor. | The current pediatric note, including documented anticipatory guidance, appears in the same read-only document layout. |

M10 visual review: the initial empty state now explicitly identifies an unstarted note. After actual native entry, the PCP and NP closing screens show the entered sections and their confirmation state in one document pane, while billing/follow-up/instructions remain separate. The keyboard test reaches the end of the pane and resets it to the top before capture; waiting for the completed scroll prevents an animated intermediate position from clipping the first heading in the evidence image. The body retains every source row and line break. The six new comparison/detail images bring the AMB gallery to **83** captures.

M10 verification (source `6da7318` with the capture-timing correction): default **357**-job build, kernel, root Comparator and **58** frozen renderer statements pass. All **157** previous Render/PatchWitness theorem headers remain unchanged. Certification remains **15/15**, bad programs **18/18** rejected, World 2 **1,284/1,284**, and the native button audit **277** (**266** enabled / **11** explained disabled). Native/WASM matches **34** initial ambulatory views plus the actual-entry/confirmation probes: **9** human note entries, **2** closing note views and **2** pending-confirmation cases. The saved before binary reproduces the empty panel for the same entries. All **16** structured fixtures, **240** app tests, **84** agent tests with typecheck/lint, **7** seed tests, **83** desktop/narrow fidelity checks (three intended viewport skips), **37** current-state and **31** before-state screen checks pass. The two note-detail views additionally verify complete keyboard scrolling. Primitive fact comparison remains **324** bundles / **0** differences; archived replay remains **0** mismatches, and all **21** workflow effort groups remain exactly unchanged. No new D-rule or clinical spec change was introduced.


### Live host feedback and explicit canonical census (M11–M12)

The connected host still displayed a technical save toast with `/medplum/fhir/R4/Provenance/...` and a drawer headed “Live Medplum encounter” containing the Encounter resource ID. The normal host now says “Saved” and “Your changes have been saved”, with “Encounter options” retaining the return-to-worklist action. Diagnostic write links, raw errors and JSON inspection require the same explicit `inspect=1` flag as the replay inspector. A typed refresh-required result keeps the orange warning and tells the clinician to reopen the chart after a successful write whose refresh failed; it is not presented as an ordinary complete save. The existing pending state, staged atomic writes, clinical actions and modal alerts remain unchanged.

The encounter-selection panel keeps DOB, encounter date/class/status, the selected request and medication, while removing logical resource IDs. New encounter selection now uses the actual server-created Encounter through the existing selection path. A real browser test with a future-dated chart exposed why assuming that the new encounter sorts first was wrong. Neither an existing future encounter nor the oldest selected encounter can substitute for the explicitly created encounter.

Before/after review at 1440×900: P1 and P4 save feedback changes from resource paths to concise clinical feedback; encounter options changes from a diagnostic resource drawer to the existing worklist return control. Inspection mode still opens the saved Provenance JSON and its close control. No vendor assets are used. The evidence lives in `app/shots/realism/amb/{before,after}-P{1,4}-live-*.png`.

The browser control census now traverses transparent presentation/value-set/reference/row-action wrappers and includes narrative textareas. It supports an explicit canonical-baseline mode that selects the baseline role and compares the entire active program against its current v3 release JSON. This is necessary because ordinary quick-login can load an older deployed fork bearing the same program ID. Report output can be isolated to avoid replacing unrelated audit evidence. The completed deployed-context regression records **2,371** working interactions, **40** explained disabled states, **0** dead controls and **0** errors across all six profiles. It sampled 198 configurations; P3 and RN2 each had eight queued checkpoints outside the 48-configuration bound. This is bounded EHR control coverage, not an exhaustive state search or a fresh run of the separate app-shell/live-agent tests; its full evidence is `amb-live-button-audit-deployed.json`.


M11–M12 verification: the explicit five-role canonical census and app-shell audit passed **1,652** working interactions / **109** explained disabled states / **0** dead / **0** errors. The five clinical samples covered **111** configurations with no queued checkpoints remaining inside the observed exploration. This is still bounded coverage, not exhaustive clinical-state enumeration. The separate live-agent request test was not run. Full build identity, controls and scope are recorded in `amb-live-button-audit-baseline.json`.

Host checks pass **240** app tests, **84** agent tests, **6** real local Medplum transaction tests, app build/lint, agent typecheck/lint, **2** matched before cases and **5** current host/search browser checks. The picker regression waits for the loaded option set, identifies the actual newly created ID, and verifies that it is selected even with a future-dated existing encounter. Before/after saves use distinct test-clock review minutes so both represent real new persisted human reviews rather than an idempotent repeat. The **14** host captures include both selection panels, both save toasts, both encounter-option panels and the explicit inspection path; the full gallery now has **97** images. `amb-live-host-validation.json` records dimensions and hashes. Native clinical programs, fields, action paths and M10's core verification are unchanged in this host pass.


### Public prefill captions without changing evidence (M13)

Live Rooming self-review exposed `record:weightToday` beneath an imported weight. The canonical now supplies optional `UiScreen.fieldSources` captions from Lean. A record caption identifies its declared chart/refill source and the chart snapshot date; a linked caption reads the source element's public spec label. The date is not invented as the observation's measurement time. The field still contains its exact raw provenance, value/unit, pending-confirmation flag, human-only flag and control ID. The original D6 statement/proof and the legacy HTML renderer's provenance contract remain unchanged. This is an additive display contract, not a new D-rule.

| Screen/context | Before → after | Self-review |
| --- | --- | --- |
| PCP/pediatric Rooming when a same-day weight exists | Internal record key → “Source: Chart weight recorded today” with the chart snapshot date. | The two-line caption fits its existing pending field; confirmation remains beside it. Older chart weights remain in the banner and do not prefill today's field. |
| Orders/refill fields with configured or linked sources | Internal default/linked key → declared source category or the linked element's public label. | The metadata creates no prefill. Missing source data, exact units and original controls remain. |
| Human-only entries throughout the ambulatory navigator | “Human entry only” → “Clinician entry required”. | A wording change from the same Lean flag; scan, identity, note and cosign events/guards are unchanged. |

The painter uses the supplied caption and links it to the field's accessible description. Its input library initially overwrote a direct description attribute; using the library's documented input-attribute path fixed this, and both the unit test and real browser now check the accessible description. Native/WASM probes confirm that confirmation retains the source caption, while an actual new human weight entry removes the prior source. Neither event is fabricated by the painter. The 30 unique ambulatory semantic trees match M10 exactly after excluding only the new optional caption metadata. All **159** previous Render/PatchWitness theorem headers remain unchanged; the new shown-source caption theorem joins the **59** frozen renderer Comparator checks.


M13 verification (source `035a88c` plus the public-caption change): default **357**-job build, default kernel, root Comparator and **59** frozen renderer statements pass. Certification **15/15**, bad programs **18/18**, World 2 **1,284/1,284**, **277** native button checks, **34** native/WASM initial views, all actual-entry/receipt probes, **16** structured fixtures and **324** primitive clinical fact comparisons pass. App build/lint and **241** tests, **84** agent tests with typecheck/lint, **6** live transaction tests, **7** seed tests, **83** fidelity checks (three intended viewport skips), **37** current / **31** before screenshot/event cases and **5** live-host/search browser cases pass. The refreshed full browser census again records **1,652** working / **109** explained disabled / **0** dead / **0** errors across **111** canonical configurations with no queued checkpoints remaining in the observed sample. Its exact scope/build is `amb-live-button-audit-current.json`; the separate live-agent request test is excluded. Archived replay has **0** mismatches; all **21** effort groups and all fixed task payloads remain identical. The **105**-image manifest includes eight new live-host views under `m13-after-*`, leaving all 14 M12 host comparisons and their hashes intact.


### Allergy terminology self-review (M14)

The pediatric banner and allergy table still exposed repeated “(organism)” and “(substance)” suffixes, crowding the persistent patient context. [SNOMED International's semantic-tag table](https://docs.snomed.org/snomed-ct-specifications/snomed-ct-editorial-guide/readme/authoring/general-naming-conventions/descriptions/fully-specified-name/index) identifies these as FSN domain annotations. The existing closed-list display fallback now recognizes them at term boundaries, including delimited summaries and a following parenthetical status. It retains unfamiliar qualifiers and recognized words embedded in running prose. This does not retrieve a preferred term or rename a clinical concept: original source strings, codes, row accessibility labels and native tooltips remain.

Public prefill captions are rendered verbatim rather than passing through clinical-term cleanup. A source element label containing a parenthetical is therefore retained in both the visible caption and accessible description. Existing note/document rendering already keeps entered text verbatim; its regression now also includes organism/substance wording. No Lean program, field, flag, FHIR projection, clinical guard or effort path changes in this pass.

The matched terminology baseline is the actual green M13 painter: **52** canonical/detail captures are preserved as `before-terms-*` before the change. Current captures are refreshed from the same semantic fixtures at 1440×900. This allows an honest comparison of the shorter allergy banner, table labels and retained patient context without substituting another source chart.


M14 final verification (source `b409cda` plus the display-only pass): app build/lint and **246** tests, **84** agent tests with typecheck/lint, **6** live transaction tests, **37** current screenshot/event cases, **5** live-host/search cases and **83** fidelity checks (three intended viewport skips) pass. The complete clean browser census records **1,652** working interactions / **109** explained disabled states / **0** dead / **0** errors, with the same **111** canonical configurations and no remaining observed checkpoints. App-shell inventory reflects the currently available run data; exact rows/build/scope are in `amb-live-button-audit-current.json`. The quota-interrupted attempt is excluded. Scratch cleanup removed only obsolete reproducible AMB outputs, retaining the original baseline and current fixtures/reports. All **165** gallery files fully decode as 1440×900 PNGs; M12's 14 frozen host hashes remain intact, and current host images use `m14-after-*`.

Lean source, native binary, WASM assets, specs and clinical programs are byte-identical to the green M13 model. Its default build/kernel/Comparator and **59** frozen renderer statements, **15/15** certifications, **18/18** rejected bad programs, **1,284/1,284** World-2 tasks, **277** native controls, **34** native/WASM views, **16** structured fixtures, **324** unchanged primitive fact projections, zero-mismatch archived replay and unchanged **21** effort groups therefore remain the verified model baseline. `make wasm-check` confirms freshness. M14 changes presentation only and adds no design rule.


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

### Available-width review

The next review tested the same semantic widgets at 1024 and 1280px, beyond the required 1440×900 screenshots. A word-level browser probe found that `Scheduled` in MAR and `Complete`, `Pending` and `Ordered` on the ED board could split between lines even though the overflow gate passed. The pre-fix screenshots remain as `*-1024-before-container.png` and `trackBoard-1280-before-columns.png`.

CSS container queries now use the actual widget width. Constrained grids become complete labeled records; medium-width ED records use two columns. The 1280px ED view keeps its grid with slightly wider lab/imaging/disposition columns. The 1440px board and MAR retain their dense grid layout. All source fields and row controls remain present, and the exact ARIA model is unchanged. All **90** before/after screenshot checks pass across 1024, 1280 and 1440px, including the new unsplit-status-word assertion.

Final self-review: the 1024px MAR with an automatic chart sidebar becomes a long vertical record, because even empty supplied hour cells remain explicit. It preserves the data but is less compact than the primary grid. The existing Lean `layout.overview` hint gives a primary MAR or department board the available workspace while retaining the banner, explicit panels, required reviews and alerts. The acute lane's MAR source uses that hint through `wideWorkspace`; this is an integration observation, not a new test of that lane's unmerged program. The committed 1440×900 fixture retains the dense four-medication grid.

Geometry review also found that large finite axis bounds could overflow, and that an unrepresentable numeric string could make the independent ARIA model expect a plot the painter could not draw. Both cases now preserve their full original table text; finite source values get finite coordinates, and unrepresentable values do not acquire a fabricated point. The ARIA model now matches that existing finite-number drawing contract. The source-value and control assertions are retained.

The first broad persona matrix exported **2,877** native group/tab/alert variants across all **15** certified persona/release combinations, using the first appropriate World 2 task and patient for each role. It contained **1,099** byte-distinct semantic trees. The unchanged browser gate passed **2,207** checks at desktop/narrow widths, then validated coverage receipts for every original file under the same exact-tree/build context. The second call also reran its standard/known-bad probes (**19** checks). Each call intentionally skipped the three duplicate narrow probes. A visible-text scan of banners, labels, data rows and field values found no UUID, repository-path, FHIR transport-reference or W1–W7 label patterns in these variants. This is a textual diagnostic in addition to the exact browser gate, not a general proof about arbitrary note text.

### Growth measurement fidelity

A native reproduction found that gram weights vanished from growth history, and an out-of-order FHIR bundle could choose an older same-day weight while clinical Facts correctly selected the later one. The mixed-unit fixture also demonstrated a meter height labeled as centimeters. The projection now includes grams on its kg axis, uses the ambulatory lane's identical explicit-unit height reader, and orders readings by timestamp before selecting each day's point. Missing/invalid birth or measurement dates keep the row and display `Not recorded` for age; they do not become a plotted newborn age. Valid newborn age zero remains valid. The existing display precision is tenths of kg/cm. No clinical Facts or dosing calculation changes.

`growthUnits-before.png` is a true pre-fix semantic snapshot from `10517bcc2233bf201fe6aa2777481c1a347b2488` (native binary SHA-256 `84dcdd677dc15bf93a2b4382be55427e52d27bf5819f1e2c8437f309d4981781`), rather than an unstyled current projection. It shows a missing 22.2 kg point, 1.232 m mislabeled as 1.2 cm, and the older 29.9 kg reading despite a newer 30.4 kg reading. The corrected screenshot shows 22.2 kg, 123.2 cm and 30.4 kg. The original observations/units remain available in the complete source display. The archived pre-fix JSON is kept only as comparison evidence.

The 1280px ED review also found a split Provider header after status columns had been widened. The final thirteen explicit widths total 100%; provider/RN names, LOS, headers and status words now fit. The screenshot probe now checks column-header words as well as status words. All **96** before/after screenshot checks pass at 1024, 1280 and 1440px for the **16** examples. Every original data field and control remains present.

The growth and constrained-width checkpoint passes the default build, `lake check`, root Comparator and all **50** renderer statements. The original **89** theorem headers and all **324** clinical Facts remain unchanged. Certification is **15/15**, bad programs **18/18** rejected, World 2 **1,284/1,284**, and archived replay has **0 mismatches**. Native/WASM agrees across **16** examples, **324** fact bundles and **652** canonical variants. App build/lint and **191** tests, **82** agent tests, both row-action audits, **96** screenshot checks and **51** desktop/narrow fidelity checks pass, with three intentionally skipped duplicate probes. All **27** benchmark task metrics and full native minimum-click paths remain unchanged across **21** release/workflow groups. The broader persona matrix above was run before this final growth increment and will be repeated after shared-shell integration.

### Shared-shell integration and committed review pairs

Merged main's shared role shell, semantic navigator/search and recorded banner weight at `daee7a1`. The presentation painter retains row-action placement and complete structured records alongside those controls. The default build, kernel replay, core Comparator and all **50** renderer statements pass; all **89** original theorem headers remain unchanged. Certification is **15/15**, bad programs **18/18** rejected, World 2 **1,284/1,284**, archived replay **0 mismatches**, and native/WASM still agrees across **16** examples, **324** fact bundles and **652** variants. All **27** task metrics/native paths and **21** workflow metric groups remain unchanged.

The merged app passes build/lint and **204** unit tests; agent lint and **84** tests pass. The full app browser suite passes **67** checks; its **79** skips are opt-in screenshot captures and duplicate narrow probes. One narrow replay check needed to scroll its actual heading inside the iframe, because the complete navigator made the heading lower than the iframe's first viewport. The viewport assertion remains intact. The visual capture now selects note records by their semantic info ID instead of the shell lane's old CSS class. No clinical state or gate assertion changes.

All **96** widget screenshot checks pass at the three widths, and the five-role shared-shell capture passes with exact live accessibility-tree checks. Every one of the sixteen new 1440×900 views was inspected again in the shared palette. The dense board, schedule, OR and In Basket keep their columns; Results retains flags and per-record units; flowsheets retain all eleven nursing rows; note cards retain their complete narrative; trends and growth retain their distinct plots and source tables. The taller shared banner initially clipped the fourth MAR row at 900px. Putting its existing Medication label and name on one line, without dropping either, now fits all four rows and the start of administration documentation. The thirty-two before/after viewport images are committed, with dimensions, source-tree hashes and image hashes in `docs/audits/presentation-screenshots.json`; wider/full-page review images remain local.

The frozen `da01a57` build completes the full bounded control audit: **2,666** working interactions, **114** explained disabled states, **0** dead controls and **0** errors across P1–P5 and RN2. The real unsafe allergy-removal proposal is rejected for `reviewsBeforeCommit`, and its counterexample replay passes. The fast control regression and **51** widget/standard-screen ARIA checks pass, with three duplicate narrow probes skipped. A fresh comparison also confirms all **324** original clinical Facts objects remain unchanged after shell integration. `docs/audits/presentation-verification-first.json` records this exact source/build and scope. The subsequent broad matrix was deliberately interrupted to integrate main's newer display polish; it is not counted as a completed matrix for this checkpoint.

### Display-polish integration and complete note/timestamp text

Integrated main `062a4ef` with the structured painter. Medication-review tables use the shared explicit-direction grammar and retain their raw values in accessible labels/tooltips. Empty structured info retains its named notice and any unmatched original action inline. Existing native fields, captures, event IDs and clinically required reviews are unchanged.

The imported-note review exposed converter provenance dominating the title. The new drawing retains every character while styling that suffix in 12px secondary text. Both legacy and structured note bodies and titles bypass terminology cleanup; a regression includes paragraph breaks, indentation and `(finding)`/`(procedure)` text. Legacy cards also retain extra supplied metadata visibly. The actual imported chart is now checked for exact ARIA equality and byte-for-byte body text against its captured Lean screen. `notes-import{,-before}.png` is a true chart comparison, and `notes-import.ui.json` preserves the after tree.

ISO payload timestamps formerly became a local date without their clock. The formatter now retains their supplied wall date, full clock, precision and offset; entered/captured fields are unchanged. [FHIR R4 dateTime](https://hl7.org/fhir/R4/datatypes.html#dateTime) distinguishes partial dates from timed values with zones. Preserving the supplied clock/offset is this project's display choice, consistent with its Lean labels; this is not a claim that FHIR requires a particular visual date format. Unit and browser assertions now require the full timestamp, including a fractional-second/offset example. Invalid calendar/time/offset strings still remain unchanged.

This source passes build/lint, **226** app tests, **84** agent tests, **69** desktop/narrow app checks, **96** widget screenshot checks and the six direct canonical/Notes ARIA captures. The **81** default-suite skips are opt-in captures and duplicate narrow probes. Lean source and its **89** original theorem headers are unchanged from the prior fully audited checkpoint; `make wasm-check` confirms the same `dc8197ca…` hash. Certification was regenerated and remains **15/15**, with **18/18** bad programs rejected. The updated thirty-four viewport images, captured Notes tree and [review gallery](presentation-gallery.md) are committed. The final control and whole-persona browser passes follow on the frozen merged build.

### Shared-banner data handoff

The actual canonical chart review identified a provider-provenance issue outside the widget scope: the Synthea adult sample has no nominated care-provider reference, but `bannerOf` uses its first encounter participant as both PCP fallback and Attending. [FHIR Patient.generalPractitioner](https://hl7.org/fhir/R4/patient-definitions.html#Patient.generalPractitioner) and [Encounter.participant.type](https://hl7.org/fhir/R4/encounter-definitions.html#Encounter.participant.type) distinguish those associations. The evidence and a conservative source-mapping request are recorded in `changes-requests.md` for shared-shell ownership. The frozen presentation build leaves that mapping unchanged. The final long-note capture also shows the patient banner/application bar above the viewport after scrolling into the note. A second Shell handoff links that exact capture and asks to retain patient context while chart content scrolls. The native banner remains in the tree and the note text remains complete; the final presentation build keeps the tested shared-shell layout.

### Frozen polished-build control gate

The `e09bfbb` build passes the complete bounded audit again: **2,666** working interactions, **114** explained disabled states, **0** dead controls and **0** errors. The actual unsafe-allergy proposal is rejected and its counterexample replay passes. The fast control regression and **51** widget/standard ARIA checks also pass, with three duplicate narrow probes skipped. `docs/audits/presentation-verification.json` binds this source to the actual emitted app-code hash and native proof/build identity. The broader fifteen-case matrix also completes: all **2,877** exported variants, representing **1,099** byte-distinct trees, pass desktop/narrow semantic fidelity (**2,207** checks, three duplicate narrow probes skipped). Whole-version coverage then accounts for all 2,877 files under that identical context and reruns the deliberate failure probes (**19** checks). This is screen-state coverage for the selected World 2 task/patient per role and release, not an exhaustive clinical state-space claim.

### Final OR spacing and fictional timestamp cleanup

The public [CST perioperative tracking guide](https://cstcernerhelp.healthcarebc.ca/Applications/PowerChart/Perioperative_Tracking/Navigate_to_Perioperative_Tracking.htm), including its linked board image, uses short room/time columns with more space for procedure and patient information. The final OR drawing now assigns 6% to Room, 8% to Start and 36% to Procedure; remaining space accommodates patient, surgeon, status and any supplied actions. The 1440×900 comparison retains every field and avoids spending large blank columns on short times. No vendor image is stored in the repository.

The fictional resource generator now declares America/Los_Angeles as its source clock and emits the date-appropriate explicit offset for 93 timed occurrences. This corrects the fixture timestamps against the [FHIR R4 dateTime requirement](https://hl7.org/fhir/R4/datatypes.html#dateTime); date-only values stay date-only. It does not infer any real patient's time zone or claim full FHIR profile validation. Regenerating through Lean produces all 32 before/after semantic fixture trees byte-identically, and all 16 native/WASM presentation cases pass again. The final spacing passes all 96 captures at 1024/1280/1440 widths, the 69 standard browser checks, and the live five-role/Notes fidelity check. Build/lint, 226 app tests and 84 agent tests also pass. The source is frozen for the final bounded control and whole-persona matrix runs. On frozen build `cfad9e9`, the bounded control audit completes with **2,664** working interactions, **114** explained disabled states, **0** dead controls and **0** errors. The actual unsafe proposal is rejected and its replay passes. The fast regression and **51** widget/standard ARIA checks pass, with three duplicate narrow probes skipped. The final fifteen-case matrix also passes: **2,877** exported variants / **1,099** byte-distinct trees, **2,207** desktop/narrow checks, then **19** complete-coverage and deliberate failure-probe checks. Three duplicate narrow probes are skipped in each pass. The receipt context, receipt hashes, input-manifest hash and all fifteen source-program hashes are retained in `docs/audits/presentation-verification.json`. The native binary and Lean hash remain unchanged; no clinical rule, theorem statement or click path changed in this last increment.

The final source also passes the separate checker Comparator challenge (**21** statements) and completion-fragment challenge (**5** statements), in addition to the root (**18**) and renderer (**50**) challenges. Only the three permitted axioms are accepted. These checks do not expand the proved scope of general completion described in `docs/VERIFICATION.md`. A final artifact check confirms the app/native build identities, all fifteen current program hashes, exact generated button counts/report hash and all thirty-four screenshot dimensions/source hashes agree; subsequent commits contain documentation and audit records only.

### Final external review of information distinctions

The [SAFER Test Results Reporting and Follow-Up guide, practices 2.6–2.7, pp.17–18](https://healthit.gov/wp-content/uploads/2025/06/SAFER-Guide-8.-Test-Results-Reporting-Final.pdf) recommends redundant abnormal-result cues, distinguishes missing flags from normality, and favors recent results first with enough room to read their details. The reviewed Results view retains explicit H/L/N values, leaves unflagged results as a dash, and preserves each record's unit, range, clock and qualitative/censored text. Its complete history is newest first. This is a review against published guidance; the browser checks are not a clinician usability study.

[UTHealth's NCCD visibility guidance](https://sbmi.uth.edu/nccd/ehrusability/design/guidelines/Principles/visibility.htm) distinguishes actionable elements from ordinary text and calls for readable chart axes and clear medication-event timing/status. We checked these against the actual row-action buttons, ordinary read-only rows, growth/trend axes and separate Scheduled/Given/Held MAR text. Complete administration details remain below the grid.

[MEDITECH's Expanse Point of Care support page](https://ehr.meditech.com/support/expanse-poc) separately identifies patient lists, MAR data, scanning, review, administration and co-signing. This supports retaining the existing Lean-owned nursing controls beside the data surfaces; a colored administration cell does not acquire an action. These additional references change no schema, clinical rule or application source, and no vendor assets were copied.

### Presentation integration with ambulatory and surgical realism

Merged main `81691fb` into the presentation lane. One `UiPresentationKind` enum and the existing `presentation`/`rowAction` tree now serve all workflow callers. Legacy ordinary table, historical-note and trend nodes use the same `StructuredInfo`/`ClinicalChart` drawings; the duplicate generic table, note-card and sparkline implementations were removed. Current-visit documents share the structured information module while retaining their source-declared document region and exact text. Compact chart-side summaries remain summaries.

Kept typed growth references, department code choices, public field-source captions, explicit confirmations, document/status notices and surgical queue mappings. One status-tone function supplies both compact and structured views, including timestamped statuses and H/L/critical flags. Source note/title strings and ISO clocks retain their complete content. The merged medication formatter preserves explicit source directions without inferring an absent dose unit or route from product form. A regression separates different vital signs with the same unit in the shared legacy trend path.

The kernel sandbox cannot read external release JSON during a module's compile-time `#eval`. The navigation report invocation moved to the existing `Canonical.NavExports` runtime audit. Its `NavSane` predicate is unchanged, the fifteen actual-canonical guards remain, and the exported-artifact audit still rejects any navigation failure. This does not relax D5 or another rule. Generated releases, types, WASM, verdicts, certification and complexity are regenerated for the integration.

The role review exporter now preserves transaction `fullUrl` identities and reuses the authoritative world seeder, including patient-bound resources and shared location metadata. Earlier review exports discarded identity and omitted the seeded appointments; they were valid empty-state tests but poor realism examples. The refreshed P1 view contains its supplied appointment. P5 uses the actual day-two surgical request rather than day-one postoperative rounding. These are input-harness corrections, with no added renderer controls or clinical inference. The live signing test now explicitly selects the offered Yes/No/ICD-10 choices, matching the integrated terminology picker; identity and hidden-review rejection assertions remain unchanged.

The [integration gallery](presentation-gallery.md) records all five requested role views and their limits. P2's department payload and P3's MAR payload are still absent in the pre-ACUTE source; their empty-state captures and separate populated native widget examples are both retained. P4's real measurement series remains complete. With transaction identity retained, its explicit birth-sex evidence selects the supplied WHO/CDC reference bands; administrative sex is never substituted. The scrolled imported Notes capture now retains the shared patient banner and role bar while keeping every source note character. Compared with the public schedule, board and perioperative references above, the shared drawings now provide consistent column hierarchy and status treatment; the acute source integration remains responsible for supplying its department and administration rows.

The integration's fresh complexity benchmark has identical task metrics and native minimum-click paths to main `81691fb`. KLM remains the estimate replayed along the minimum-click path, rather than a separately minimized KLM claim. The final actual-role self-review also found two remaining density limits: the long “Operating room 1” caption wraps inside a word at the narrow room column when both sidebars are present, and WHO/CDC curve endpoint labels can sit near the patient series at the age boundary. Source values remain complete and the separate full-width widget examples stay readable. These are recorded for the next small display increment; this integration retains its frozen, fully audited painter. The exact integrated build, regenerated artifacts and validation scopes are recorded in [presentation-integration.json](../audits/presentation-integration.json).

Final integration evidence: default Lean build, kernel replay, all four Comparator configurations, unchanged D1–D6 and fifteen navigation audits pass. Certification is **15/15**, core bad rejections **18/18**, World 2 **1,284/1,284** and archived run1-P3 **0 mismatches**. Fresh WASM and sixteen native/WASM examples agree. App build/lint, **261** app tests, **84** agent tests, **75** default browser checks, **30** native ambulatory reviews, **4** explicit live/surgical checks and the fast button regression pass. The final populated-source screen gate checks **111** byte-distinct trees covering **226** supplied base-role/widget trees, with **231** browser checks and **19** receipt-reuse checks passing; duplicate narrow probes are skipped. This does not claim every one of the **3,555** exported tab/group/alert variants. The completed bounded control audit records **2,806** working interactions, **114** explained disabled states, **0** dead controls and **0** errors across **199** configurations. Temporary quota interrupted RN2; the supported resume path verified the same build identity, retained complete P1–P5 checkpoints and reran RN2. The real unsafe allergy-removal proposal was rejected for `reviewsBeforeCommit`, with a passing counterexample replay. All **39** committed image/source bindings are verified.


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

The UI browser is an experiment navigation surface, separate from clinical EHR controls. It leads with a vendor reference trunk and five clinician forks. Only recorded deployments create personalized revision nodes. Other branches show certified role baselines at release days with “no run yet”. Day labels refer to the end-of-day deployment after that night's decision; workload deltas are recorded workflow means versus rev 0, and missing measurements remain explicit. The release grid shows v1/v2/v3 in order and treats the mixed-role vendor reference as a reference. Paths appear in tooltips and replay URLs, not in clinical labels.

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

### Shared painter realism polish — 1 Nov, orchestrator follow-up

Source before: main `924425f`. Captures: `app/shots/realism/shell-polish/{before,after}/`, all at 1440×900. This pass changes shared display/chrome only; canonical clinical content, Lean programs, captured values and FHIR writes are unchanged.

Terminology cross-check: [SNOMED International's fully specified name guide](https://docs.snomed.org/snomed-ct-specifications/snomed-ct-editorial-guide/readme/authoring/general-naming-conventions/descriptions/fully-specified-name) distinguishes an unambiguous FSN from a clinician-friendly preferred term. Our closed-list tag cleanup is a display fallback, not a terminology-service lookup or a claim to retrieve the preferred term. It removes the supplied semantic suffixes while retaining meaningful qualifiers such as `(type 1)` and `(left arm)`. [NLM's RxNorm overview](https://www.nlm.nih.gov/research/umls/rxnorm/overview.html) describes names in terms of ingredient, strength, dose form and optional brand. The formatter retains those elements and all numbers. It reformats explicit quantity/frequency grammar and re-expresses the oral wording in a tablet/capsule product name only for recognized directions; it does not infer a missing dose, choose a drug, convert units or reschedule a medication. Original row text/codes remain in accessible row labels and native tooltips. Tests also verify that a cleaned Select label emits its original code unchanged.

| Screen | Before → after | Review against the existing shell research |
| --- | --- | --- |
| P1 Orders | Repeated semantic tags and `1, 1x per 1 d`, generic code placeholders, empty Record table → readable medication directions, context placeholders and “Search to add orders”. | Persistent clinical context and local preference/entry groups stay distinct. Denser four-column entry still has persistent labels, units and readable 12 px minimum text. |
| P3 MAR | Empty table frames and scattered bare navigation links → short empty lines and bordered navigation action bars. | No administrations are invented for an empty source chart. The typed MAR widget remains the presentation lane's scope. Footer placement needs the semantic content request recorded in `changes-requests.md`. |
| P2 Triage | Verbose problem labels and excess section padding → clean names, compact section framing and sentence-case fields. | Source acuity, measurements, human-only states and reviews stay intact; no clinical values are inferred in React. |
| P4 Rooming | Repeated terminology tags and generic field prompts → cleaner clinical context and compact measurement entry beside the full growth series. | The source growth table remains complete. Narrative and numeric clinical values are not rounded or rewritten. |
| P5 Brief Op Note | Generic selects, repeated prompts and loose spacing → contextual procedure/diagnosis selectors, concise headings and dense template fields. | Op-note content and required fields are unchanged. The sign action retains its actual blocked reason. |

The floating Inspector is absent by default and available only with `inspect=1`. URL canonicalization preserves this explicit flag, along with the separate audit opt-in. Empty semantic info stays present as an exact named accessibility `note`; only the fabricated empty table/header is removed. Navigation wrappers group adjacent supplied controls without changing their order, IDs, names or events. Section captions use Title Case; field captions use sentence case while accessible control names remain bound to the original Lean labels. Ordinary free text has no repetitive “Enter value” placeholder. Scanner/identity prompts remain explicit.

Initial self-review at 1440×900 led to shorter indication/PRN placeholders, consistent medication-direction formatting across list/table/summary views, and removal of the duplicate “Allergies: Allergies not on file” wording. An empty allergy list remains “Allergies not on file”; only explicit negative-allergy text can become “No Known Allergies” or “No Known Drug Allergies”. The raw source finding and status remain available.

The final sig review tightened the conservative fallback: route composition is restricted to the recognized quantity/frequency grammar or the explicit interval phrases covered by tests. Unfamiliar taper, feeding-tube or other free-text directions retain their source wording and product dose form, with no added route. Explicit mg quantities remain mg quantities; they are never converted to tablet counts. This correction changes only display text, and its raw-code/event checks remain in place.

Final shared-painter polish verification, source `715cff7` / main `924425f`: 206 app tests, 84 agent tests, six live mapper tests, 37 desktop and 21 narrow checks pass. Lint/typecheck/build, direct canonical ARIA equality, rendered contrast, focus and reflow checks are green. The full bounded audit records 2,666 working interactions, 114 explained disabled states, zero dead controls and zero errors. Native build/kernel/Comparator/D1–D6, fresh WASM, 15/15 certifications, 18/18 core rejections, 1,284/1,284 world-2 tasks and the zero-mismatch frozen replay remain green. All 21 effort measurements are unchanged. `docs/audits/shell-polish-verification.json` binds the exact build and five requested before/after pairs; the broader gallery is in `app/shots/realism/shell/polish-latest/`. The footer-placement request remains with the workflow content lanes; shared rendering preserves source order and every control.
