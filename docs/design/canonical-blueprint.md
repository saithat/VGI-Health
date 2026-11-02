# Canonical EHR screen blueprint

Design proposal, 2026-10-31. Docs only: this does not change Lean, the spec, the renderer, bindings, or role permissions. Grounding: [research](ehr-ui-research.md), [style guide](visual-style.md), [BRIEF §§5–6](../../BRIEF.md), and [core model §10](core-model.md#10-semantic-ui-tree--minimal-design-rules-owner-decision-oct-31-supersedes-the-raw-html-page-tree-for-ehr-screens).

## Scope and reading key

The seven workflow modules contain **42 workflow screens**, plus `home`. `Rules.screens` adds **39 artifact screens** through `RulePlacements`; the assembled source therefore describes 82 distinct screen IDs. The stale “43 screens” comment in `Program.lean` counts the base only. This blueprint keeps the 42 base workflow screens, retains the two additional W7 prescription screens, and folds the other 37 artifact screens into clinical sections: **44 workflow screens plus home**. It does not silently cut workflows to BRIEF's approximate 25–30-screen target. Legal artifacts are branches/sections within a step, not extra stepper steps. Each workflow below has at most nine principal steps.

Every section's fields, conditions, allowed values, review requirements, role checks, and commits remain bound to the existing spec elements/actions. Moving an artifact does not combine its signature with another signature or eliminate its human-entry requirement. Conditional sections are emitted by Lean when applicable. A programmer must re-run the checker after folding screens; this proposal itself is not certification.

Notation in the screen tables:

- An arrow means **section reading order**, from top to bottom. Named editable items are `field` nodes; named read-only content explicitly uses `info(list/table/trend/summary)`.
- `columns(left; right)` is a layout hint inside `workspace`; no new component kind is implied. Fields retain visible labels above their values, units, provenance, pending-confirm affordance, and human-only marker.
- `side=Clinic`, `Hospital`, `Peds`, or `Surgery` selects the explicit summary defined below. It always remains supplementary.
- `Sign` means the shared sign-screen template below, including order summary, attestation, identity entry, and the real `signOrders` action. A screen without a listed commit has only secondary/nav/macro buttons and **no patient-ID re-entry**, unless its applicable artifact spec requires identity.
- Every listed commit sits at the **end of its own section**, below required review information and any human-only fields. Use `button(role=primary)` only for that commit, with Lean's enabled value and blocked reason. Navigation such as `Next`, `Review & sign`, `Edit orders`, and `Back` has role `nav`; templates have role `macro`; review/confirmation actions have role `secondary`.
- Each screen inherits the shell, including nav, workflow stepper, patient banner, applicable inline alerts, and clinical side summary. Tables can wrap rows; all relevant safety rows remain present. No ellipsis hides a dose, reaction, or required legal detail.

## Shared shell and semantic templates

### Shell

`banner` comes first, exactly once: name, DOB, MRN, age/sex; encounter/date; allergies; code status; isolation; weight kg + measured date/time. Include photo placeholder and second-line language/interpreter, PCP/attending, coverage, care gaps, critical flags. Hospital adds room/bed. All identifiers and facts come from the current patient/encounter. Unknown values are labeled, never guessed. Patient changes replace banner, workspace, side, pending drafts, scans, and receipts in one interpreter-governed context transition. On a department or multi-patient queue screen the banner identifies the selected chart, not every row.

`nav` has groups `Workflows`, `Chart`, and role-specific destinations. Show chart activities above the workspace and task navigation alongside it; do not label every step an activity. `Chart` can show `Chart review`, `Results`, `Imaging`, `Meds`, `Allergies`, `Notes`, `Orders`, `Encounters`; additional implemented destinations belong in a second uniquely named group (`Nursing`, `Pediatrics`, `Surgery`). Each group has ≤12 entries, with unique labels and no duplicate group labels. Every deployed screen, including review/sign screens, appears in one genuine nav group. Old artifact IDs remain reachable in grouped nav until a certified migration rewrites their destinations and removes the old screens; aliases must not create orphan screens. Unbuilt activity labels are plain `text` marked unavailable, never dead navigation.

For the proposed 45-screen program, the complete screen-nav inventory is `Clinic visit` (W1: 9), `Results inbox` (W2: 3), `Emergency` (W3: 7), `Nursing` (W4: 5), `Pediatric visit` (W5: 6), `Surgical case` (W6: 9), `Refills` (W7: 5), and `Workspace` (home: 1): eight uniquely named groups, each within D5. The screen rows below provide every ID/label. Chart activity tabs are a separate workspace `tabs` view where they show info rather than navigate to a screen; do not invent duplicate screen destinations for those views. Role-specific exports can expose the applicable subset and shared service targets while retaining every screen actually in that export.

`workspace` starts with title, then `stepper`, then sections below. A `stepper` has the exact screen ID/short label pairs in that workflow's step list; it does not imply a guard, force a sequence, or count revisiting a reusable composer as another step. The current vocabulary has no completion-status member: put interpreter-derived `text` such as `Allergies — reviewed 09:14` beside a section heading, rather than inventing state in React. A `tabs` body contains only its selected content. Required information at a commit is outside all optional tabs/collapsed sections.

`side` is painted as the **left clinical summary rail**; task TOC may sit beside or below it. The rail's profiles are:

| Profile | Sections in order, with info display |
| --- | --- |
| Clinic | `Problems` list → `Current meds` list → `Vitals` summary with dates → `Last visit` summary → `Next visits` table → `Open orders` list → `Alerts` list |
| Hospital | `Problems` list → `Current meds` list → `Vitals` summary with dates → `Open orders` table → `Pending results` table → `Alerts` list |
| Peds | Clinic, with age in months when appropriate, latest weight/height/head measurement dates, and last growth percentile **only if available from a named reference** |
| Surgery | Hospital, followed by `Case` summary (procedure, site, phase, surgeon), `Anticoagulants` list (last dose/hold plan), and `Consent` summary (document date and verification state separately) |

Summary lists may be compact but may not silently discard records to fit a fixed card. Their presence never satisfies D2 by itself. Required information is repeated in the main workspace at commits even when the rail already contains it.

### Composer (W1, W3, W5, W6, W7 new prescription)

Sections in order:

1. `Find orders`: labeled search `field` and `info(table)` catalog results (name, strength, form, route, formulary status); tabs `Meds`, `Labs`, `Imaging`, `Procedures` where implemented. Search behavior/events stay in Lean, not a new React search engine.
2. `Favorites`: generic drug/order sentences as macro buttons; nearby `info(summary)` selected product. Choosing a favorite fills a draft and shows confirmation/provenance as declared.
3. `Dosing`: weight kg with source/date; for W5, mg/kg basis and `info(summary)` calculation/range. `columns(Dose, unit, route; Frequency, PRN, duration)`. Do not label a quantity field `mg` when its actual unit differs.
4. `Prescription`: `columns(Quantity, refills, substitution; Pharmacy, indication, diagnosis)`; directions are full width. Include patient name/address and prescriber classification, and the spec's other prescription fields in their appropriate named sections. Copy linked diagnosis with its provenance rather than asking for a forbidden retranscription.
5. `Controlled Rx` when applicable: CURES review and exemption reason; medical purpose, product strength/form, prescriber name/address/registration; naloxone offer/education/outcome; per-line ready-to-sign selection; earliest fill / series assessment when relevant. Display legal details in readable rows, not a wall of internal element IDs. Schedule II refills must be zero. No UI-only exception can waive a guard.
6. `Additional`: comment to pharmacy and baseline allergy reconfirmation. Keep the canonical's extra allergy checkbox here; if a required field lives in this section, open it when the workflow needs it.
7. `Chart review`: optional `tabs(Current meds table; CURES summary; Recent labs table)`. CURES and required labs are also visible on the eventual commit screen; this optional tab is not their sole source.
8. `Pending orders`: full `info(table)` using the summary schema below; `Add order` (secondary, guarded new-line action), `Review & sign` (nav), `Back` (nav). No primary commit in the composer.

Use `columns` for paired short controls, not a third narrow column of prescription text. The long composer deliberately scrolls. Keep each order's fields bound to the correct current/fixed slot. The baseline's “finish this order line first” guard remains; selecting an earlier row for editing must use a real interpreter action if added, never mutate a hidden React draft.

### Order-set selection

`Choose set` → grouped `section`s such as `Labs`, `Meds`, `Care` → `Pending orders`. An `info(table)` shows the set rows, but editable inclusion is a labeled flag `field` per line with a corresponding order-details section. Some rows may start selected with `Default — needs confirmation`. Selected does not mean reviewed. Include missing-detail labels; show the count of selected unsigned lines. Do not implement clickable checkboxes inside read-only `info` rows without a semantic field binding. Existing macros fill fixed slots 10 onward; selection/deselection needs real declared interpreter events and is a proposal where the current macro cannot remove a line. Confirmations remain per field in the baseline.

### Order summary table

One row per pending order, including each order-set line; no hard-coded row count. Columns in this order: `#`, `Action` (new/change/stop), `Order` (generic name + strength/form or service name/code), `Dose` + unit, `Route`, `Frequency / PRN`, `Timing / duration`, `Qty / refills`, `Indication / Dx`, `Pharmacy / destination`, `Status` (unsigned, missing details, needs confirmation). Wrap compound values into labeled sublines; do not force 11 tiny columns at 1280 px. Services show priority/specimen/site/timing as applicable and `—` for medication-only data. Post-op care orders include diet, activity, VTE mechanical, labs, vital frequency, and nursing orders; they must not disappear from review because they are not MedicationRequests.

Controlled prescriptions additionally show issue date, patient name, drug, strength/form, quantity, full directions, refills, earliest fill, prescriber name/address/DEA, and the spec's signing notice, as full `info(table/summary)` content adjacent to this table. A summary column cannot replace any of these no-receipt panels. W5 adds weight/date, dosing basis, mg per dose, frequency/daily total, and configured range/max in the adjacent dose-check table. W7 comparison shows requested/current/proposed values. W4 uses a dose-administration table instead; W2 has no medication summary unless a follow-up order was actually composed.

### Sign screen (shared template)

`Orders to sign` table → `columns(Allergies table; Current meds table)` → `Dose check` table/summary → any workflow-specific required reviews → `Controlled Rx review` and CURES → applicable inline alerts → `Signature` section.

`Signature`: original explanatory `text` **“I reviewed these orders for this patient.”**; prescribed signing notice `info(summary)` when applicable; per-line `field` **“Ready to sign”** for controlled orders as required; human-only `field` **“Re-enter patient ID”** with the validator's actual identifier type in its label/help; `button` **“Sign orders”**; `Edit orders` nav. The identity field is immediately above signing and is never defaulted, linked, autofilled, or satisfied by a macro. It is a VGI hospital-policy step. Current labels saying initials/sex/age conflict with the renderer's documented identity token: resolve that implementation mismatch explicitly; do not change validation to match an unsafe label. Banner identity remains name + DOB/MRN.

All required panels are in workspace, expanded, all relevant rows. Weight-based dose check and abnormal-result trend never use a review receipt. Keep allergy/current-med panels visible even if a receipt exists in the baseline; the optimizer can use only the receipt policies the spec permits. The modal may intercept the attempted commit for a pending interruptive alert, but the button's enabled state and blocked reason always come from the interpreter. Acknowledgment is human-only and keyed to the actual alert/order.

### Artifact sections (shared layout contract)

An artifact section contains `info(summary/table)` existing document/evidence first, then `columns(Short structured fields; Context / rationale fields)`, then long narrative fields, then its own required review panels and identity/cosign/attestation fields immediately before **its own commit**. Keep these controls out of the unrelated sign-note footer. The fields/conditions/roles are the union for that action from `RulePlacements` and inherited requirements in `Rules.artifactFields`; moving only the explicitly listed fields would lose inherited requirements. Preserve declared human-only/never/confirmation policy. Section titles are clinical, e.g. `Consent`, `Safety plan`, `Discharge planning`, not `Required artifact review` or statute numbers.

For an artifact with a prescription issuance action (series, emergency follow-up, direct dispensing), include the complete Composer and Sign templates, order summary and applicable dose/review requirements **inside the host screen's section**. These are alternate signing contexts, not shortcuts around `signOrders`. For documentation artifacts with no order, show `info(summary)` the document being signed and `info(table)` any required evidence; an order summary is not applicable. No new legal rule or new field requirement is created by this design.

## W1 — Adult clinic visit, P1

Real patterns: [OpenEMR encounter workflow](https://www.open-emr.org/wiki/index.php/A_Generic_Medical_Encounter_Workflow_in_OpenEMR_6.1), activity/navigator separation, search-first prescribing, unsigned-order review. P1 is keyboard heavy and has repeated patients/review receipts. **Steps (9):** Rooming → Med rec → HPI / ROS → Exam / A&P → Orders → Labs → Verify orders → Sign orders → Close visit. Labs is a branch; all nine screens have nav entries.

| Screen ID / title | Workspace section order and columns | Side / commit and identity placement |
| --- | --- | --- |
| `w1Rooming` — Rooming | `Reason for visit` chief complaint → `Vitals` columns(weight kg, height cm, BP; pulse, respirations, temperature, SpO₂, pain) → `Intake` tobacco, falls, travel, advance directive discussion, interpreter, preferred pharmacy → `Communication` language/dialect → `PHQ-2` score → `Allergies` table + `Mark reviewed` → passive `Care gaps` alert/list. Consent/telehealth artifacts live in Intake when applicable. | Clinic. `Save communication needs` at Communication's end; consent actions at their own section end. No visit-wide commit or extra identity at Next. |
| `w1MedRec` — Med rec | `Current meds` table(name, strength, sig, status, source) → matching per-med `Continue / Stop / Modify` fields aligned below/alongside rows → `Mark meds reviewed` → `tabs(Fill history table; Prior notes summary)`. | Clinic. Review is secondary, not a primary signature. No order summary until changes are composed. |
| `w1Hpi` — HPI / ROS | `Templates` macro buttons → `Prior note` optional summary section → `columns(HPI narrative; ROS narrative)` → `Copied text` provenance next to affected fields. | Clinic. No commit; Next leads to Exam. |
| `w1Exam` — Exam / A&P | `Exam` template and narrative → `columns(Assessment / plan; Problem list info(table))` → `Visit diagnosis` field. | Clinic. No commit or identity. |
| `w1Orders` — Orders | Full Composer template; pending order summary table; duplicate-therapy alert inline. `Transmission` branch records delegated agent; `Emergency Rx follow-up` / `Schedule II series` are issuance sections with full review/signing. | Clinic. Main composer has no commit. Each issuance section retains its own signing guard and identity immediately before its commit. |
| `w1Labs` — Lab orders | `Find tests` search + catalog table → `Lab order` columns(test, priority; diagnosis, fasting) → `Recent results` table → `Pending orders` summary table. | Clinic. `Review & sign` nav → Verify. No primary commit/identity. |
| `w1Verify` — Verify orders | `Orders to sign` summary table → `Allergies` table → `Allergies rechecked` flag → `Continue to sign` / `Edit orders`. | Clinic. No commit and no patient-ID entry here; its placement is on Sign. Keep this redundant verification step. |
| `w1Sign` — Sign orders | Shared Sign template. Controlled legal details/signing notice fully expanded. | Clinic. Identity then `Sign orders` at Signature end; `Close visit` is nav. |
| `w1Close` — Close visit | `Note review` info(summary) assembled HPI/ROS/exam/A&P → `Billing` columns(linked diagnosis; level of service) → `Follow-up` → `Instructions` template + narrative → `Care gaps` table/inline reminder → `Sign note`. | Clinic. Sign note footer; no added patient-ID requirement unless its spec requires it. The canonical removable health-maintenance popup remains conditional. |

**Keep friction:** allergy review during rooming, reconfirmation in composer, extra Verify screen; optional fill history/CURES tabs; long copied notes; long composer. Display linked diagnosis/weight copies and their provenance; do **not** require retyping an auto-linked element against §5a. **Never optimize away:** patient identity, severe-alert human acknowledgment, signing. Patterns apply D1–D6 through shell, Sign, and artifact templates.

## W2 — Results inbox, P1

Real patterns: [list plus preview](https://d2ubrtwy6ww54e.cloudfront.net/www.uvmhealth.org/assets/2024-06/epiccare-link-view-in-basket-messages.pdf?VersionId=yWLpM2OCTAr.dQoRlbMo.Olj9B_LG9AW), result table plus trend, explicit completion. **Steps (3):** In Basket → Review result → Message patient → return to Review result for acknowledgment. The return is navigation, not a fourth screen.

| Screen ID / title | Workspace section order and columns | Side / commit and identity placement |
| --- | --- | --- |
| `w2Inbasket` — In Basket | Folder navigation with counts → `Search` → `columns(Messages info(table); Selected message info(summary))`. Table: priority, status/unread, received, patient + identifier, subject, sender, owner. Preview contains abnormal-result context and `Open result`; Refills links W7. | Clinic for selected patient. No commit/identity or order summary. Selection must match banner/rail. |
| `w2Result` — Review result | `Result` info(table) with values, units, H/L/critical flags, reference ranges, collection/result times/status → `Trend` info(trend) + dated values table → `Action` field → `Follow-up test` field and any actual pending follow-up service info(table) → `Patient contact` message summary → `Acknowledge & done`. Conditional `Record access review` artifact below result context, with request date and documented consequences/rationale fields and its own commit. | Clinic. Acknowledge at end of result section, with result + abnormal trend still in workspace. No invented identity re-entry. Access-review identity only if its own spec requires it. |
| `w2Message` — Message patient | `Result` summary → `Message` columns(recipient/channel/context summary; template choices) → message body field → message/delivery state summary → `Return to result`. Relevant consent for a telehealth contact stays in a Contact section. | Clinic. No order summary. Current module has a message body and Return, not a send commit: do not show `Sent` on mere navigation. A real Send action/delivery receipt requires an authorized semantic action and writer binding; otherwise label the existing draft honestly. |

**Keep friction:** separate message composer and return trip to acknowledge; older results/notes behind chart tabs. **Preserve:** visible abnormal trend at acknowledge, all abnormal flags, distinction between read/acknowledged/contacted/done. D1/D5 shell; D2 trend and result; D3 distinct actions; D4 severity alerts; D6 action/message fields.

## W3 — ED encounter, P2

Real patterns: [ED tracking table](https://cstcernerhelp.healthcarebc.ca/Applications/FirstNet/ED_LaunchPoint/ED_LaunchPoint_Overview.htm), grouped order sets, triage/evaluation split. P2 uses mouse/set selection, no assumed review receipts. **Steps (7):** Track board → Triage → ED note → Order sets → Orders → Sign orders → Disposition. Sets and single orders are alternate/revisitable paths.

| Screen ID / title | Workspace section order and columns | Side / commit and identity placement |
| --- | --- | --- |
| `w3TrackBoard` — ED track board | `Department` info(table): room, ESI, patient + identifier, complaint, arrival, LOS, MD/RN, allergy/isolation, labs/imaging status, disposition → selected patient `info(summary)` → `Open patient`. | Hospital for selected patient. No commit/identity or medication order summary. |
| `w3Triage` — Triage | `Arrival` columns(time, mode; complaint, ESI) → `Vitals` columns(weight kg, BP, pulse; respirations, temperature, SpO₂, pain) → `Isolation` field → `Communication` language/dialect → `Allergies` table + Mark reviewed. | Hospital. `Record arrival` and `Save communication needs` at respective section ends. Keep invalid lb input visible as rejected with `Enter measured weight in kg`; no silently accepted conversion. |
| `w3Provider` — ED note | `Triage` summary → `columns(HPI + exam + MDM fields; Results table + Imaging table)` → applicable `Consent`, `Safety assessment`, `Hold / advisement`, `Restraint` artifact sections. Safety fields cover risk/mitigation, behavior/alternatives/intervention/response; hold fields cover circumstances/probable cause/history, performer/date/language/advisement. | Hospital. Each artifact has its own commit, timing/identity requirements and evidence in that section. `Order sets` and `Orders` are nav. Do not auto-complete a safety plan from a template. |
| `w3OrderSets` — ED order sets | `Choose set` generic options → Order-set template grouped Labs/Imaging/Meds/Care → per-line details and confirmations → pending order summary table. | Hospital. `Review & sign` nav; no signature/identity here. No product/clinical dose recommendation is implied by illustrative set names. |
| `w3Orders` — Orders | Full Composer template, retaining dispense/refills/pharmacy fields even for ED doses → delegated transmission / direct dispense / emergency follow-up / series branches when applicable. | Hospital. Main flow signs on `w3Sign`; issuance branches use their own complete signing sections. |
| `w3Sign` — Sign orders | `Orders to sign` table → `Dosing weight` linked source/date field → Shared Sign template with full dose check and controlled details. | Hospital. Identity immediately before Sign; severe allergy/interaction/dose and lb-related guards remain. |
| `w3Disposition` — Disposition | `Latest vitals` table/summary → `Orders this visit` summary table → `Disposition` columns(choice, ED Dx, condition; admitting service, level of care, admitting Dx) → `Discharge planning` needs/services/access/evaluation/discussion → `Course / follow-up` recommendations/arrangements/instructions/continuing-care information → departure time and document summary. | Hospital. Admission: `Record admission`; discharge: `Discharge patient`; disposition: `Set disposition`, each at its applicable section's end and using its own guard. Identity only as required per action. Admit creates inpatient orders handed to P3, not an RN administration. |

**Keep friction:** triage/provider split, all set-field confirmations, ED dispense/refill/pharmacy fields. **Preserve:** kg-only entry, dated dose check on Sign, allergy-critical prescribing, human alert acknowledgment and identity, latest vitals at disposition. D1–D6 shared templates; D2 disposition vitals; D3 separate admit/discharge outcomes.

## W4 — Medication pass / nursing, P3

Real patterns: [MAR time grid](https://cstcernerhelp.healthcarebc.ca/Patient_Chart/MAR/Medication_Administration_Record_%28MAR%29_Overview.htm), [BCMA](https://cstcernerhelp.healthcarebc.ca/Patient_Chart/Medication_Administration/Scan_Oral_Medications.htm), grouped flowsheets and SBAR. P3 uses a scanner and interrupted workstation-on-wheels workflow. **Steps (5):** Worklist → MAR → Give med → Flowsheet → Handoff. Repeat MAR/Give med per due task; reassessment returns to Flowsheet.

| Screen ID / title | Workspace section order and columns | Side / commit and identity placement |
| --- | --- | --- |
| `w4Worklist` — Shift worklist | `Due / overdue` info(table) with patient, time, drug/task, status → `New orders` table → `Last handoff` summary → `Allergies` full table + `Mark reviewed — shift start` → optional `Verbal order` and `Patient-managed meds` artifact sections. Verbal order records giver, required read-back/authentication content; patient-managed section records authorization, capacity, teaching, security, patient-owned drug identity/integrity, bedside order. | Hospital. Artifact commits remain separate and role gated. Prescriber-only authorization cannot become an RN action merely because it is on this screen; render the allowed handoff/link and state. No wristband scan until administration. |
| `w4Mar` — MAR | Date/shift window summary + status legend → `Scheduled` info(table) with medication details column and 06:00/09:00/12:00/etc. scheduled-time columns → PRN/infusion/stopped sections → `tabs(PRN history table; Glucose trend; Coag labs table)` → `Open due dose`. | Hospital. Status text plus muted color: due blue, overdue red, given green, held amber, refused violet, future gray. Actual times remain distinct. No medication summary or commit; opening dose is nav. |
| `w4Admin` — Give med | `Dose` info(table): drug/product, ordered dose/unit, route, schedule, last given, actual dose/time/route/site → `Allergies` table → `columns(Glucose trend + Coag labs table; PRN history table)` when applicable → inline warnings → `Verify / scan` fields in order wristband then med → `Independent check` second different nurse → `Pain before dose` → `Document` status, dose, actual time, actual route, site, reason/comment → `Record administration`. | Hospital. No typed prescriber ID replaces the human-only scans. Scans and different-nurse check appear just before documentation/commit; a scan is never “Given.” Show matched identity/product plus failed-scan reason. Held/refused use their true state/reason, not green success. |
| `w4Flowsheet` — Flowsheet | `Recent observations` info(table) measures × timestamp, units at row labels → `Vitals now` columns(BP, pulse, respirations; temperature, SpO₂, observed time) → `Pain` PRN history table + reassessment score/time → `Assessment` care/observations/incidents/interpretation/Dx/plan/intervention/evaluation and narrative → `Communication` language/dialect → applicable Restraint episode / Safety plan sections. | Hospital. `File assessment` under Assessment, `Save communication needs` under Communication; restraint start/end/episode and risk-assessment commits under their own sections. No medication order-summary table. |
| `w4Handoff` — Handoff | `Last handoff` summary → `SBAR` template → columns(Situation + Background; Assessment + Recommendation) → `Shift summary` info(table/list): administrations, held/refused/reasons, pending tasks/results, reassessment due, safety status. | Hospital. No new primary commit in the current module; distinguish persisted draft from a signed handoff. No patient-ID field. |

**Keep friction:** separate worklist/MAR, chart tabs for optional prior glucose/coagulation/PRN history, explicit status/reason prompts, removable minor-interaction popup. Required labs and allergies are repeated on Give med. **Preserve:** fresh scans per administration, distinct nurse, human acknowledgment, before-dose pain and later reassessment. D1/D5 shell; D2 dose/allergies/labs; D3 true administration states; D4 warning modal; D6 scan/cosign provenance.

## W5 — Pediatric visit, P4

Real patterns: [growth percentile charts](https://www.cdc.gov/growth-chart-training/hcp/overview/what-are-clinical-growth-charts.html), current kg weight beside dosing, immunization history + structured vaccine record. **Steps (6):** Rooming → Growth → Orders → Sign orders → Immunizations → Close visit.

| Screen ID / title | Workspace section order and columns | Side / commit and identity placement |
| --- | --- | --- |
| `w5Rooming` — Peds rooming | `Measurements` columns(weight today kg + time, height/length cm, head cm; temperature, pulse, respirations, reason for visit) → `Growth` info(trend) → `Allergies` table + Mark reviewed → `Med rec` table and per-med decisions → `Communication` language/dialect → applicable Consent / minor consent / telehealth sections. | Peds. Communication/consent documentation commits at section ends. Minor consent records parent contact/involvement decisions and times as declared; do not expose sensitive material in a generic rail. |
| `w5Growth` — Growth | `Reference` info(summary) chart source, age range, sex/age basis → `columns(Weight/length/height trend; Head circumference or BMI trend as appropriate)` → `Measurements / percentiles` info(table) with dates/source → `Last visit` summary. | Peds. No signature/identity or order summary. No fictional percentiles if only raw measurements are available. |
| `w5Orders` — Weight-based orders | Composer template with `Weight today` source/time → mg/kg **basis** + frequency → `Calculated dose / range` info(table/summary) → clinician-entered mg dose → remaining Prescription details → pending order table. Applicable newborn oxygen section has target and its own full required authorization fields/reviews; emergency/series branches follow issuance template. | Peds. Main commit is on Sign. Independent entry of actual mg remains baseline friction; derived dose is displayed, not silently accepted. Oxygen authorization has its own commit/role, not a medication macro. |
| `w5Sign` — Sign orders | Order summary → `Dose check` table per prescription: today's kg/time, mg/kg/dose or day basis, entered mg/dose, daily total, configured range/max, concentration/mL if supplied → Shared Sign template. | Peds. Identity directly above Sign. Stale/yesterday's weight is visibly stale and does not satisfy today's-weight requirement. |
| `w5Immunizations` — Immunizations | `History / forecast` info(table) → due inline alert → `Allergies` table → `Vaccine given` columns(vaccine/product, manufacturer, lot, dose if declared; site, route, administration date/time) → `VIS` given-before flag + edition date → `Administered by` provider/title/address → record summary. | Peds. `Record immunization` below all record/VIS fields; human policy as spec declares. Vaccine summary table shows vaccine, manufacturer/lot, site/route, date, provider, VIS edition/given state, not a pharmacy refill row. |
| `w5Close` — Close visit | Note template → HPI/ROS/exam/A&P fields → `Guidance` narrative → `Billing` linked visit/claim diagnosis + level of service → `Follow-up / family instructions` → note review info(summary) → `Sign note`. | Peds. No extra order-ID check unless spec requires it. Keep vaccine and note signatures distinct. |

**Keep friction:** separate Growth step, linked weight displayed again, clinician enters mg after mg/kg, lengthy visit note/billing fields. **Preserve:** today's kg weight, dose check at every prescription signing, complete vaccine/VIS record, human signatures. D1–D6 common; D2 growth/dose/vaccine evidence; D6 explicit units, dates, provenance.

## W6 — Surgical day, P5

Real patterns: phase-based surgical chart, consent/pre-op checklist, brief op note, grouped post-op orders, [discharge navigator](https://cstcernerhelp.healthcarebc.ca/Workflows/Inpatient/Admission_Transfer_Discharge/Discharge_Patient_Home_%28Provider%29.htm). **Steps (9):** Consult → Close consult → Pre-op → Orders → Sign orders → Op note → Post-op orders → Rounding → Discharge. Orders/Sign are reused for pre-op, post-op, rounding and discharge prescriptions; they keep return-phase context. Post-op clinic uses W1; the light inbox uses W2/W7.

| Screen ID / title | Workspace section order and columns | Side / commit and identity placement |
| --- | --- | --- |
| `w6Consult` — Surgical consult | `Consult request` summary → `columns(Imaging table + Labs table; Vitals summary)` → `Consult note` reason, HPI, ROS, exam, A&P, Dx → `Surgical decision` field → `Home meds` table with per-med continue/stop/change → `Communication` language/dialect. | Surgery. Communication commit in its section; `Close consult` nav. No medication order summary yet. |
| `w6ConsultClose` — Close consult | `Consult review` info(summary) → `Billing` linked diagnosis/level → `Plan / follow-up` → instructions/NPO field → `Sign consult note`. Telehealth artifact belongs with contact context if applicable. | Surgery. Note signature footer; identity only if declared for that action. |
| `w6PreOp` — Pre-op | `Case` procedure/site summary → `Consent` document summary + risk/alternatives disclosures + **human Verified** field and its documentation action → `H&P update` → `Anticoagulants / holds` table + hold plan → `NPO` field → `Allergies` table + current meds table → `Prophylaxis checklist` evidence → `Anesthesia` artifact section → `Time-out` timed team/procedure/site confirmation section. | Surgery. Consent and anesthesia commits stay in their own sections with required identity/roles. `Pre-op orders` nav to Composer. Time-out is a separate event before incision, not satisfied by this nav or consent verification. |
| `w6Orders` — Orders | Full Composer with phase label (`Pre-op`, `Post-op`, `Rounding`, `Discharge Rx`) → pending summary table. Controlled transmission, direct dispensing, emergency follow-up, series issuance sections when applicable. | Surgery. Main flow Sign uses shared screen; artifact issuance has its own review/identity/signature section. |
| `w6Sign` — Sign orders | Order summary table → `Weights` today's kg/time and linked dosing weight/source → Shared Sign template plus `Anticoagulants / holds` table and `Consent verified` state/document evidence for pre-op. | Surgery. Identity immediately before Sign; severe warnings modal. `Return to case phase` nav uses saved phase, not an assumed next operation. |
| `w6OpNote` — Brief op note | `Intra-op record` info(summary/table) → template → `Procedure` columns(pre/post-op Dx, procedure, surgeon/assistants; anesthesia, EBL mL) → `Findings / technique` full-width narratives → `Tissues / specimens` → `Drains / implants` → `Complications / condition` → note review summary. `Recovery` section carries post-anesthesia complications and its own note review/signature. | Surgery. `Sign op note` after intra-op evidence and all note fields. `Sign recovery note` in Recovery; do not grant P5 an anesthetist role through layout. No medication summary; show procedure/note summary. |
| `w6PostOp` — Post-op orders | `Choose set` → `Diet / activity` → `VTE prophylaxis` mechanical and medication rows → `Pain / nausea` meds → `Antibiotics` → `Labs / monitoring` → `Nursing care` / treatment order → `Standing order authorization` circumstances/conditions and review → pending order summary table covering care + meds. | Surgery. Diet/treatment/standing-order actions retain their separate commits and role guards in their sections. `Review & sign meds` nav to Sign, with post-op phase retained. Prechecked rows still need confirmation. |
| `w6Rounding` — Rounding | `Overnight events` info(table) → `columns(Vitals 24 h info(table); Labs info(table))` → `Progress note` + working Dx → note summary → `Modify orders` nav / `Discharge` nav. | Surgery. `Sign progress note` after note/evidence. No ID re-entry unless its own spec requires it. Existing/current orders table may be shown, labeled signed, distinct from unsigned queue. |
| `w6Discharge` — Discharge | `Medication reconciliation` current/home/inpatient meds info(table) + per-med continue/stop/change/new fields → `Discharge Rx` signed/pending order summary + nav through Composer/Sign → `Course / outcome` hospitalization outcome, course, Dx, condition → `Planning` needs, evaluation/discussion, service availability/access → `Follow-up` appointment, future recommendations/arrangements → `Instructions` patient handout, continuing-care information, methotrexate teach-back when applicable → `Destination` → final discharge summary. | Surgery. Required current meds/allergies stay in workspace. `Document teach-back` in its own section when applicable. `Discharge patient` / `Set disposition` each below its evidence and guard; neither auto-signs pending prescriptions. |

**Keep friction:** separate consult close; long post-op set with per-field confirmation; inpatient quantity/refills/pharmacy; displayed weight + linked dosing-weight copies. **Preserve:** surgeon's human consent verification, actual timed time-out, anticoagulant review, dose checks, identity, separate note/order/discharge signatures. D1–D6 common; D2 intra-op evidence, consent and discharge meds; D3 truthful distinct phase actions; D6 independent human confirmations.

Time-out is requested realism, but the base W6 module lacks a dedicated capture. It is a proposed clinical section whose event/binding must be modeled by the implementation/spec owner before it can display `Complete`. Likewise this is not a claim to verify OR events, consent validity, or anesthetist qualification merely by putting them on screen.

## W7 — Refill requests, P1

Real patterns: inbox request → chart review → authorized response; separate new Rx when needed. **Steps (5):** Refill requests → Chart review → Refill decision → New prescription → Sign prescription. Last two are conditional for modification/new issuance; approval/denial can finish on Decision.

| Screen ID / title | Workspace section order and columns | Side / commit and identity placement |
| --- | --- | --- |
| `w7Queue` — Refill requests | `columns(Requests info(table); Selected request info(summary))`. Queue: received, patient+identifier, drug/strength, requested qty/refills, pharmacy, status/owner. Preview: original Rx/request dates, requested sig, requester, pharmacy. | Clinic. `Open request` nav; no commit or identity. |
| `w7Review` — Refill: chart review | Request summary → `tabs(Last visit summary; Relevant labs table; Fill history table; Current meds table; Last note summary)` with review buttons in their matching body → `Go to decision`. | Clinic. Separate review receipts for last visit/fill history; no signature. No pending order table yet. |
| `w7Decision` — Refill decision | Request/current/proposed Rx comparison info(table) → `Relevant labs` table with dates/units/ranges → `Last visit` summary → `Fill history` table → required allergy/medication reviews if applicable → `Decision` columns(approve/deny/modify, requested drug, schedule eligibility; dose mg, qty, refills, pharmacy/source) → protocol flag, denial reason, pharmacy note → decision summary → relevant alerts. | Clinic. `Approve refill` for approval, `Deny refill` for denial, each reflecting its actual commit/allowed decision. Modify routes to new Rx/sign and cannot falsely approve first. Identity only if the applicable approval spec declares it; the new-prescription Sign screen has human identity. |
| `w7Orders` — New prescription | Complete Composer template seeded from the request with provenance/confirmation, current weight and linked dosing weight, all per-line prescription details → pending order summary table. Emergency follow-up and Schedule II series branches use full issuance template. | Clinic. `Review & sign` nav, no primary main-flow commit. Never carry a Schedule II request into a refill approval; a new prescription remains a distinct action. |
| `w7Sign` — Sign prescription | Shared Sign template with full allergies/current meds/dose check/CURES and controlled details as applicable → request/proposed comparison → Signature. | Clinic. Identity directly above `Sign prescription` bound to `signOrders`. Label states it creates/signs a new Rx; completion updates request state only through the supported writer action. |

**Keep friction:** five review tabs, separate decision, explicit protocol checkbox, removable active-Rx/care-gap popups when their conditions hold. **Preserve:** pertinent labs, last visit/fill evidence, allergy/interaction requirements, correct deny/approve outcomes and full new-Rx signature. D1–D6 templates; D2 decision evidence; D3 decision-specific labels/guards; D6 pharmacy provenance.

## Home — Patient workspace

`home`: banner → `Today` `info(table)` schedule/tasks → `Workflows` grouped nav → `Chart review` tabs with problems/results/notes/meds/allergies/encounters/coverage → `Open orders` info(table). `side=Clinic` or setting profile. No commit, order-ID re-entry, or implied review receipt. Split the current 12 workflow-entry buttons into readable clinical groups; every actual target remains reachable. All required information still reappears in the appropriate commit workspace. P1 sees clinic/inbox work, P2 ED, P3 nursing, P4 pediatrics, P5 surgery according to real role declarations, not merely client-side hiding.

## Artifact relocation map: all 39 additional IDs

This is traceability, not permission to drop the old IDs without a certified migration. A section may be shared by several workflows; retain each original action's role, patient/episode, and Back context. The artifact template above specifies review/fields/columns/commit placement for every row. The `Rules` augmentations already on base screens (e.g. communication, VIS fields, controlled signing panels, discharge planning) stay in the named sections in the screen tables.

| Existing artifact screen ID(s) | Proposed host screen / section, in clinical order |
| --- | --- |
| `w1Consent`, `w1Telehealth` | `w1Rooming` Intake → Consent / Telehealth consent; disclosures/record then separate documentation action |
| `w1Delegation` | `w1Orders` Prescription → Transmission; agent name and required record |
| `w1EmergencyRxFollowup`, `w1ScheduleIISeries` | `w1Orders` after Controlled Rx → Emergency Rx follow-up / Series; issuance template |
| `w2AccessReview` | `w2Result` after result/contact context → Record access review; request date, consequences/rationale and required review |
| `w3Consent`, `w3Telehealth`, `w3MinorConsent` | `w3Provider` after ED note → Consent / Contact / Minor consent; required disclosures/contact times |
| `w3SuicideAssessment`, `w3Hold`, `w3Restraint` | `w3Provider` after assessment → Safety plan / Hold and advisement / Restraint; each retains its own events, dates, reviews and signatures |
| `w3Delegation`, `w3DirectDispense` | `w3Orders` Prescription → Transmission / Direct dispense; dispense uses issuance template including stated no-further-need field |
| `w3EmergencyRxFollowup`, `w3ScheduleIISeries` | `w3Orders` after Controlled Rx → Emergency follow-up / Series; issuance template |
| `w4VerbalOrder`, `w4SelfAdministration` | `w4Worklist` New orders → Verbal order / Patient-managed meds; required giver/authorization/capacity/teaching/security/identity-integrity and separate role-gated actions |
| `w4Restraint`, `w4SuicideAssessment` | `w4Flowsheet` Assessment → Restraint episode / Safety plan; time of start/end remains an actual capture |
| `w5Consent`, `w5Telehealth`, `w5MinorConsent` | `w5Rooming` after Communication → Consent / Contact / Minor consent; record parent contact/involvement decisions and times, preserve access policy |
| `w5OxygenOrder` | `w5Orders` Dosing → Newborn oxygen; target and complete authorization evidence/fields/commit |
| `w5EmergencyRxFollowup`, `w5ScheduleIISeries` | `w5Orders` after Controlled Rx → Emergency follow-up / Series; issuance template |
| `w6Consent`, `w6Anesthesia` | `w6PreOp` Consent / Anesthesia; anesthesia diagnosis/rationale, blood amount/duration and separate actions as applicable |
| `w6Telehealth` | `w6ConsultClose` Plan → Telehealth consent, when contact mode requires it |
| `w6Delegation`, `w6DirectDispense` | `w6Orders` Prescription → Transmission / Direct dispense; issuance template for dispensing |
| `w6EmergencyRxFollowup`, `w6ScheduleIISeries` | `w6Orders` after Controlled Rx → Emergency follow-up / Series; issuance template |
| `w6Recovery` | `w6OpNote` after brief op note → Recovery; post-anesthesia complications, required note/identity review, distinct signature |
| `w6StandingOrders` | `w6PostOp` after Nursing care → Standing orders; circumstances, conditions, complete authorization and distinct commit |
| `w7Orders`, `w7Sign` | Retained as the two conditional W7 screens specified above; full Composer and Sign, not folded into an approval click |
| `w7EmergencyRxFollowup`, `w7ScheduleIISeries` | `w7Orders` after Controlled Rx → Emergency follow-up / Series; issuance template |

Cross-service links in `Rules.routes` still resolve to their clinical section/retained screen. Shared access review, minor consent, telehealth, verbal orders, oxygen, admission/discharge, standing orders, and result review do not gain new permissions through a host workflow. If a section's action is not allowed for the current persona, provide the truthful allowed handoff/navigation; never offer a fake enabled commit.

## Design-rule coverage and retained friction

| Pattern | D1–D6 satisfied by its concrete placement |
| --- | --- |
| Persistent patient banner | D1 exactly one, first, ≥2 identifiers; D6 applies to any associated editable identification field |
| Clinical summary rail | D2 supported by repeating required data in workspace; rail alone never qualifies; D1 identity remains separate |
| Activity groups + task stepper | D5 unique labels/groups, ≤12 each, no orphan screens; D3 honest navigation labels |
| Ordered sections / completion text | D5 reachable sections/screens; D6 labeled capture; completion from actual interpreter state, not visited styling |
| Composer and preselected sets | D6 units/provenance/confirm/human-only markers; D3 Add/Review are not primary commits; D5 bounded groups |
| Summary and Sign templates | D2 all relevant required rows expanded in workspace; D3 real guard/blocked reason; D6 human identity/attestation fields; D1 inherited |
| Alerts | D4 interruptive in modal, passive inline only; D3 truthful actions; D6 override reason/acknowledgment capture |
| Result table + trend + acknowledge | D2 abnormal trend visible at acknowledge; D3 acknowledge distinct from reading/messaging; D6 clear action fields |
| Inbox/refill list + preview | D1 selected patient consistent; D3 open/read/done/approve/deny distinct; D5 folders; D2 decision evidence |
| ED table and disposition | D1 selected chart banner; D2 vitals/evidence at commit; D3 correct admission/discharge state; D6 kg/arrival units and times |
| MAR + scan/detail form | D2 dose/allergy/required labs visible; D6 fresh human scans and different-nurse field; D3 actual administration status; D4 modal warnings |
| Flowsheet | D6 time/units/provenance; D2 evidence next to File; D3 correct commit versus draft |
| Growth and dose check | D2 dated weight/dose calculation at signing; D6 dosing basis/units and source; D3 no fake percentile or auto-confirm |
| Surgery/discharge sections | D2 consent/intra-op/med-reconciliation evidence; D3 separate real actions; D6 human consent/time-out/signature; D5 folded section navigation |

**Safety friction stays:** fresh patient-ID entry when required, wristband+drug scans, different nurse check, severe-alert human acknowledgment, consent verification, actual signing. **Compliance friction is optimizable only within declared policy:** record-prefill confirmations, same-version review receipts, linked diagnosis/weight copies, required artifact documentation. **Accidental friction remains in the starting canonical:** extra verification screens, optional history buried in tabs, long composers/notes, repeated allergy reconfirmation, per-field default confirmations, removable conditional popups. Do not fabricate unconditional alerts or require retyping fields declared auto-linked merely to inflate a baseline.

## Implementation handoff / review gates

This is a concrete target for the content/React lanes, not a claim that these displays already exist. Known gaps are exposed rather than filled with invented data:

- Map existing flat component groups to `section/columns/tabs`; preserve component IDs and element/commit bindings. The semantic vocabulary has no standalone search, editable table, row-selection, completion-status, or toolbar node. Use fields/buttons/text/sections and supported events; a new behavior requires a real interpreter capability, never hidden React logic.
- Audit **all** inherited artifact entries/reviews, including per-line controlled content. `info` rows come from real bindings; unknown info IDs must display honest empty/unavailable states, never fabricated content. Current generic dose/growth panels are not evidence that all proposed derived values exist.
- Resolve the identity label/token mismatch, set selection/deselection, MAR time-column data, pediatric calculation/percentile data, message Send/delivery state, and time-out capture. These are implementation/owner-model decisions; this lane changes no spec or field type.
- Validate each role/persona separately. The all-workflow source template does not itself prove RN/prescriber/anesthesia permissions.
- After implementation: check D1–D6 plus all existing properties with the actual program; compare semantic and DOM accessibility trees; inspect desktop and zoomed/narrow views for required information, all relevant rows, legibility, and uncovered controls. Walk the five edge cases listed in the research doc. This docs-only change requires no application test run and does not certify future code.
