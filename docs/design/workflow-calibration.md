# Workflow calibration from public evidence

Evidence checked 2026-11-08 against `961ec966` on `lane/workflow-sources`.
Research and documentation only: no simulator, generator, application, clinical
rule or proof changes. Proposed implementation items remain **SPEC CHANGE — owner review**.
Benchmarks below are targets for future fitting, not fitted coefficients or
clinical validation. **No clinician review** is available.

## Evidence and chosen defaults

The register separates publication year from evidence year. `current` means a
2020+ evidence/version date; `older-retained` marks earlier cohorts or conservative
historical bounds, with a reason. A 2026 publication observing 2019 is older
evidence. Supersession links mean a replacement *reference selection* in the
specified role/task; they do not imply a longitudinal effect between populations.
The JSON retains exact prior rows for changed benchmarks.

The search is purposive, newest-first within matched endpoints, not systematic.
[research-audit.json](workflow-sources/research-audit.json) records queries,
candidates, decisions and coverage for every parameter and all ten priorities.
[sources.json](workflow-sources/sources.json) records bibliographic checks and
read levels; [literature-parameters.json](workflow-sources/literature-parameters.json)
retains units, denominators and locators. Null remains unknown, never zero.

Choose **US academic care, with separate role profiles**, rather than synthesizing
one clinician from incompatible means:

| Role/workflow | Target setting and period | Why / limit |
|---|---|---|
| Adult primary-care physician; W1/W2/W7 | UW Health academic family/general internal medicine, April 2022–March 2023 [N1][N1] | Most recent located public table jointly reporting schedule-normalized time, SDs and message categories. Newer national N13 studies visit-volume reduction using 2019–2022 data, not a newer matched baseline. |
| ED physician; W3 | Resident in US tertiary referral ED (N4 site 2), May–July 2023 [N4][N4] | Recent US full-operation-hour observations with 4h count quartiles and acuity strata. Attending sensitivity uses N10's newer publication but **older evidence (2019)**; resident/attending rates are separate. |
| RN; W4 | US academic adult ICU IV-pump work, 2024 project context [N5][N5] | Most recent located US direct task observations with duration SDs. This narrows the calibrated RN scope; general-ward passes, oral administration and handover remain scenario extensions. N5's retrospective pharmacy context is Feb–May 2024; exact prospective observation dates are not separately specified. |
| Pharmacy support | Australian clinical-pharmacist sensitivity, July–August 2024 [N8][N8] | Newer role-specific study, but no matched US duration distribution. No calibrated US pharmacy default. |
| Pediatric/surgical roles; W5/W6 | Scenario-only, no calibrated specialty default | Neither generic order tasks nor adult PCP/ICU studies identify caregiver/vaccine or operative-service distributions. |

This is a set of target profiles for a successor mode, not a claim that the
current W3/W4 generators already implement residents or ICU pump workflows.
No public study supplies the entire hospital. CHPL keys and credentialed
PhysioNet access are **optional future steps**; this plan works on public evidence.

### Usability sample and date checks

The task register has 43 rows: 40 selected certification tasks from six reports
and three rounds of one independent nursing task. Eight certification rows are
2020+ (six from U8/2021, two from U9/2022); 35 rows are older-retained, including
U5's 2023 publication of testing presented in 2018. U1–U4 remain historical
transfer/coverage comparators, not the preferred contemporary order-entry targets.

U8 reports ten physicians/nurse participants, task times conditional on success,
and observed/optimal path pairs. Its task script repeats unrelated demographic
boilerplate: use the task-specific optimal path and retain this ambiguity.
U9 reports eleven healthcare personnel; its medication path **5/8** is below one.
Preserve the printed pair, exclude it from path fitting, and use its time/SD only
with a reconstructed script. Reported completion does not identify unaided success
in either report. Neither measures a complete encounter or shift.

Three newer-looking combined files were screened: Q1's 2026/2025 addenda do not
remeasure its **2017** core order tasks; Q2's core tasks are **2019**; Q3's refill
cohort is **2018** despite its 2024 update. Newer DSI/demographic testing cannot
replace older refill or MAR evidence. No current CHPL listing/version join was
established. Public reports and their hashes suffice for this calibration sample;
the API guide/controller remain S1–S3, with an API key optional for a listing census.

## Current workflow inventory

The source of workflow commit selection is `lean/Ehr/Sim/Goals.lean:193`;
episode decomposition is at `lean/Ehr/Sim/Goals.lean:466`. Generated task choices
supply the clinical decisions before either navigation policy acts. Both policies
use the same guarded interpreter; task completion is not independent clinical
judgment or patient outcome.

| Workflow | Current generated structure and endpoints | Code anchors | Evidence mapping/gaps |
|---|---|---|---|
| W1 adult clinic | Rooming/history/exam, note sections, zero or more medication/lab/imaging orders; sign orders/note. Chronic, new, wellness and follow-up visits; urgent-care coverage on day 5. | `world/src/flows/clinic.ts:227`; `world/src/flows/clinic.ts:311`; `lean/Ehr/Sim/Goals.lean:197` | CPOE/allergy/vitals subtasks U1–U3; patient discussion, diagnostic work and full note authoring absent from task-time calibration. |
| W2 results/messages | Result acknowledgment, optional follow-up orders; abnormal results generate note/message choices; first result task injects a critical result. Critical notification, documentation and resolution are separate guarded work in current system. | `world/src/flows/clinic.ts:451`; `lean/Ehr/Sim/Goals.lean:198` | SED sample lacks result routing/reply timing; E1 and S13 supply acknowledgment versus follow-through structure. `taskCommits` does not treat patient-message text as a separate successful communication endpoint. |
| W3 emergency | Board/patient selection, triage context, scenario orders, admit/discharge/consult, notes; admission generates regimens, labs and surgical referral. | `world/src/flows/ed.ts:486`; `world/src/flows/ed.ts:540`; `lean/Ehr/Sim/Goals.lean:199` | U3 order/alert subtasks; no measured registration, bedside assessment, provider queue or interrupted diagnostic work. |
| W4 inpatient RN | Census assessments/vitals, scheduled passes, dose outcomes/re-offers, PRN analgesia and reassessment, antiemetic/anxiety PRNs, end-shift handoff and separate notification documentation. | `world/src/flows/ward.ts:75`; `world/src/medication/outcomes.ts:15`; `lean/Ehr/Sim/Goals.lean:200` | U2 list review is partial; U5 covers hold/administer task. Pharmacy preparation, physical delivery, accepted handoff and patient response are missing. |
| W5 pediatric | Well/sick/recheck/flu-shot visits, weight-dependent orders, growth/vaccine context, record immunization, sign note/orders. | `world/src/flows/peds.ts:116`; `lean/Ehr/Sim/Goals.lean:203` | Generic order/vitals calibration only. Vaccine administration, caregiver discussion and growth interpretation need separate tasks. |
| W6 surgery | Consult/booking, pre-op/consent, operative documentation, post-op orders, follow-up and discharge; alternating clinic/OR days. | `world/src/flows/surgery.ts:106`; `world/src/flows/surgery.ts:311`; `world/src/flows/surgery.ts:428`; `lean/Ehr/Sim/Goals.lean:204` | Generic CPOE only. Operation duration is exogenous world service, not time typing an operative note. |
| W7 refills | Review contained prescription and older labs; approve, deny with reason/message, or modify/sign replacement; controlled prescriptions have extra choices. Commit applicability depends on generated choices and available spec. | `world/src/flows/clinic.ts:405`; `world/src/flows/clinic.ts:467`; `lean/Ehr/Sim/Goals.lean:209` | U1-21 directly relevant to electronic refill response; U4 electronic prescribing is a different task. Pharmacy change/cancel loops incomplete. |
| Shared workspace | Activity selection/search and patient selection before task episodes; chart history, reviews, alerts, additional order lines and clinical commits. | `lean/Ehr/Sim/Policy.lean:235`; `lean/Ehr/Sim/Interaction.lean:102` | Match source initial patient/screen and whether selection time is included; bounded directory selection remains fixed-policy. |
| Interrupting work | Pages, urgent results, colleague/family requests and pharmacy questions: identify → read → assess → reply/escalate → document; owned draft suspension/return. | `lean/Ehr/Sim/Resumption/Work.lean:9`; `lean/Ehr/Sim/Resumption/Arrivals.lean:44` | I1–I7 distinguish rates, beneficial work, task switches and duration. Communication completion never resolves the clinical result. |
| Administrative ADT | Admit/assign/transfer/swap/cancel/release/discharge/cleaning, with separate transport stream. | `world/src/adt.ts:46` | Not a separate W-number or bedside action; enterprise queues, transport staff and real cancellation incidence absent. |
| Information needs (opt-in) | Typed latest value, active allergies, SBP hold context, numeric trend/flags; lookups before episode actions with fidelity/recency checks. | `lean/Ehr/Sim/InformationNeeds.lean:180`; `lean/Ehr/Sim/Policy.lean:280` | Monitoring rationale does not establish fixed lookup windows, reading time or cognitive capacity. U3 vitals is a limited external interpretation task. |

### Inventory of numerical and structural assumptions

The exact implementation expressions, all family references and explicit-marker
coverage are in the machine-readable inventory. These are current values, not
recommendations. Source line anchors refer to the snapshot above.

| Family | Current assumption | Primary code anchor |
|---|---|---|
| A01 KLM operators | K=200, P=1100, C=100, H=400, M=1350 milliseconds; homing inferred on device change | `lean/Ehr/Sim/Metrics.lean:14` |
| A02 Barcode scan | 1500 ms fixed; no typed characters or activation | `lean/Ehr/Sim/Metrics.lean:19` |
| A03 Cosign/help wait | 60000 ms fixed; cosign adds this wait and M; help adds wait+M plus typing/instructions/route | `lean/Ehr/Sim/Metrics.lean:20` |
| A04 Scrolling/viewport | 1100 ms/scroll; first 12 ordinal components then 10/page; directory/source rows 10/page | `lean/Ehr/Sim/Metrics.lean:21` |
| A05 Typing and synthetic notes | Code value min(length,4)+1 keystrokes; note text section + fixed phrase | `lean/Ehr/Sim/Metrics.lean:45` |
| A06 Persona action probabilities | P1-P5 keyboard percentages 80/20/10/50/30; backtrack per mille 60/30/90/40/20; removable-alert no-think rates 700/850/400/500/900; review/sidebar/search booleans differ | `world/src/personas.ts:5` |
| A07 Historical interruptions | Poisson means P1=.3 P2=.8 P3=1 P4=.4 P5=.6 per task, scaled, capped 6; placed among goal actions; each wait+think | `world/src/build.ts:121` |
| A08 Serial visual scan | 180 ms/unseen item, prefix includes target; repeated recognized labels use decisionMs | `lean/Ehr/Sim/Bounded.lean:186` |
| A09 Recall latency | 150 + 150*(floor(log2(items+1))+1) + 600/max(1,floor(sqrt(practice*100))) ms | `lean/Ehr/Sim/Bounded.lean:168` |
| A10 Memory strength | floor(sqrt(exposures*1000000/(1+ageDays))); confident >=1400; changed placement resets practice to 1 | `lean/Ehr/Sim/Bounded.lean:79` |
| A11 Visual cache/search state | Episode-scoped cache, stable labels not reread; local screen/tab/expanded key; no full cross-screen tab Cartesian key | `lean/Ehr/Sim/Bounded.lean:181` |
| A12 Miss/backtrack cognitive costs | 450 ms remembered-location miss plus attempted pointing/click; 300 ms backtrack plus real UI event | `lean/Ehr/Sim/Bounded.lean:476` |
| A13 Scent and intentions | Lexical token overlap plus hardcoded clinical vocabulary; first unmet intention; then unvisited views; stable tie breaking | `lean/Ehr/Sim/Bounded.lean:105` |
| A14 Help/fuel | Patience max(2,floor(log2(screens+1))); fuel 32*(1+component count)*(2+value goals+commits); help desk BFS route | `lean/Ehr/Sim/Discovery.lean:16` |
| A15 Ordinal travel and hidden taste | 400 screen-switch units+40*ordinal displacement; unknown directory position=0; optional weight 1..3 and sensitivity 100..900 per mille | `lean/Ehr/Sim/Bounded.lean:58` |
| A16 Information recency and thresholds | Glucose 120min; INR, potassium and renal 1440min; SBP 60min and <100 mmHg (1000 tenths); result trend/flags 10080min | `lean/Ehr/Sim/InformationNeeds.lean:194` |
| A17 Information lookup sequencing/cost | Needs off by default; all lookups before episode actions, catalog order, reading 1350ms/item, memory-carry source-items*screen transitions, reset each episode | `lean/Ehr/Sim/Goals.lean:376` |
| A18 External interruption rates | Ward 5.5/h; surgery 13/h; clinic 3/h; ED 6.9/h; pharmacy 10.6/h | `lean/Ehr/Sim/Resumption/Arrivals.lean:26` |
| A19 Interruption exposure | Fixed minutes W1/W5=15,W3=12,W4=6,W6=20,W2/W7=5; independent of actual task duration | `lean/Ehr/Sim/Resumption/Arrivals.lean:31` |
| A20 Interruption count/type/urgency | Bernoulli minute bins p=rateMilli/60000; at most 1/min; uniform jitter; five equal type branches; result urgent, page urgent 1/3 else time-sensitive, pharmacy time-sensitive, others routine | `lean/Ehr/Sim/Resumption/Arrivals.lean:42` |
| A21 Communication duration | Identify=3s, read=5s, assess=8/20/25s, reply=10/15/20s, escalate=30s, document=7s; five atomic steps | `lean/Ehr/Sim/Resumption/Work.lean:9` |
| A22 Interruption triage and closure | Urgent preempts event boundary; time-sensitive preempts RN/pharmacy only; routine waits for task closure; popups protect task; fixed exposure closure waits and on-call handover | `lean/Ehr/Sim/Resumption/Work.lean:78` |
| A23 Reorientation | 3000+700*captured entries+1000*unconfirmed entries ms; protocols/reorientation atomic | `lean/Ehr/Sim/Resumption/Work.lean:84` |
| A24 Draft/fact refresh | Owner+patient+task binding; fact change clears alert acknowledgments and confirmations; stock CLI identity refresh, current receipts filter stale evidence | `lean/Ehr/Sim/Resumption/Workspace.lean:1` |
| A25 Scheduling/dispatch | One serial server per persona; ready tasks priority then deadline then arrival; clinical tasks atomic, communication event-preemptive; missing timing uses planned start | `lean/Ehr/Sim/Scheduling/Clock.lean:8` |
| A26 Shifts/successors | Tours P1=660,P2=600,P3=720,P4=570,P5=660min; ED/ward 15min overlap,16 windows; clinic nine calendar days filtered to weekdays | `world/src/calendar.ts:16` |
| A27 Ready/priority/deadline | Ready=max(source planned,arrival); ESI <=2/3/>=4 deadlines+10/30/60min; urgency and abnormal-result priorities; combined results actionable at last issue time | `world/src/timing/arrivals.ts:26` |
| A28 Workload endpoints | Overdue MAR uses whole-task final documentation; completed-result response ends there; abandoned=service finish, carried=coverage horizon; distinct occurrences de-duplicated | `lean/Ehr/Sim/Scheduling/Clock.lean:113` |
| A29 Calendar/day volume | Weekdays only; Monday base1.22,Tue/Wed1,Thu.98,Fri.93; quiet*.8,flu*1.1; clipped normal day/persona noise; flu week2 p=.7; allergy.12-.4,lb.15-.4,interruptionFactor.6-1.5 | `world/src/calendar.ts:24` |
| A30 Adult visit volume/slots | Quiet16-17,busy19-20,normal17-19; no-show .10,follow-up .05; add-ons Monday2-4 else0-2 plus flu1-2; urgent-care18-22 | `world/src/flows/clinic.ts:227` |
| A31 Inbox/refill arrivals and service | Refills clamp Poisson(5*volume*Monday1.6) to2..12; early controlled requests .04; bursts at0/272/590min capacities6/6/10 or urgent-care630 cap5; normal-result message .6; labs at07:15 | `world/src/flows/clinic.ts:405` |
| A32 ED arrival/load/wait/stay | 12..22 tasks centered16*volume; hours7..16 weights1,2,3,4,4,4,4,3,3,1.5; minute uniform; source ready +U(5,25); admitted stay240..420,discharged90..240min | `world/src/flows/ed.ts:446` |
| A33 Nursing passes | 07:30,09:00,12:00,14:00,17:00,18:00; fixed regimen/pass mapping; census-order offset(idx%6)*3min; whole-census assignment | `world/src/flows/ward.ts:24` |
| A34 PRN/reassessment/handoff | PRN count<=4 Poisson(prnPerShift*busy1.1), time08:00..18:15,spacing>=200min; IV reassess30,other60min; nausea .35 surgery/.12 medicine,benzo .45; handoff18:30+idx*2 | `world/src/flows/ward.ts:120` |
| A35 Pediatric schedule | 12..22 centered16*volume;20min slots08-12/13-17;1..3 add-ons plus Monday1;no-show .08 recheck/.10 routine;flu vaccines2..4 | `world/src/flows/peds.ts:116` |
| A36 Surgery timing/load | Procedures50/70/85/95min plusU(-10,20);consult after ED U(60,120);clinic9..15 centered12*volume in25min slots;odd clinic/even OR;postop end+5 | `world/src/flows/surgery.ts:40` |
| A37 MAR criticality/windows | Insulin/systemic antibiotics/anticoagulants always critical; +30 critical,+120 daily,+60 others; cap18:59 | `world/src/medication/outcomes.ts:8` |
| A38 MAR clinical holds | NPO oral/lispro always held; lisinopril SBP .08; poor intake .08; warfarin high INR .05; heparin/enoxaparin low platelets .02 | `world/src/medication/outcomes.ts:26` |
| A39 MAR branch rates | Conditional order:absence,unavailable .02 (resolve .70),refusal SC.05/PO.025/other.005 (accept.60),expired .005,else given | `world/src/medication/outcomes.ts:33` |
| A40 MAR retry/escalation | One retry at+20min critical/+45 others or off-unit return; expiry/discharge/inactive order stops retry; recurrent refusal or critical nonadministration notification | `world/src/medication/outcomes.ts:35` |
| A41 ADT rates/capacity/delays | Transfer.03/patient-day,swap.05/board-day,error admission.01,transfer.02,discharge.002/patient-day;12 beds each unit;transportU(5,20),clean30min | `world/src/adt.ts:47` |
| A42 Lookup observation fabrication | Observation effective task time-5min, issued-4min; defaults glucose142,INR2.4,K3.2,creatinine1.1,SBP118; generated trend values | `world/src/information-needs.ts:29` |
| A43 Clinical scenario mix and transitions | Disease-specific acuity,admission,follow-up,complication,LOS,lab abnormality and result-lag draws; initial census and refill backlog; extracted callsites retain expressions | `world/src/flows/ed.ts:69` |
| A44 World exogeneity and actor handoff | Source clinical choices do not change with UI speed; later-day arrivals not merged into extended queue; successor has serial coverage but no independently learned actor memory | `world/src/timing/arrivals.ts:65` |
| A45 Goal placeholders and implicit patient choice | Synthetic note sections, fallback values, deterministic second actor; unspecified naloxone response defaults offered-declined | `lean/Ehr/Sim/Goals.lean:46` |
| A46 Planning bounds and expert floor | BFS max(128,64*screens); separate bounded fuel and policy episode bounds; per-episode reset; expert is goal-directed planning baseline | `lean/Ehr/Sim/Interaction.lean:139` |
| A47 Scripted releases and scenario days | Urgent care day5,releases4/7,appendicitis day1,flu week1or2; scenario clocks intentionally orchestrated | `world/src/context.ts:14` |

A06 also records every persona review/sidebar/search boolean in the JSON; A01 records the ideal-interface floor’s zero cost for already shown reviews. These are not observed behavior.

A48–A50 extend the inventory to the README’s explicitly provisional tailoring and pixel-measurement assumptions; no agent or application source is changed.

| Family | README-described tailoring/measurement assumption | Code anchors |
|---|---|---|
| A48 Release movement proxy | One extra click-equivalent per displaced observed use/day; not measured learning | `agent/src/cadence.ts:55` |
| A49 Relearning reference and pixel projection | Latest two matched train schedules; three practice blocks then a fourth warm reference; signed first-k excess. Ignored remembered clicks project an ordinal-slot reveal point, with no extra clinical event | `agent/src/bounded-tailoring.ts:38`; `app/src/dashboard/bounded-pointing.ts:9` |
| A50 Off-shift preferences and fallback time | Fallback 0.5min/move+0.25min/other change; seeded chooser click weight[.5,1.5),scroll[1,4),relearning[1,6),threshold[0,2); optional offline local allergy/dose preference weights and sensitivity1..3 | `agent/src/session.ts:295`; `agent/src/session-simulator.ts:9`; `agent/src/offline-preferences.ts:17` |

The remaining references on each JSON family row point to the consumers, not just
the declaration. A15 also includes the missing-placement penalty of 1000 ordinal
units and change disruption `1 + recent-use count` in
`lean/Ehr/Sim/Bounded.lean:726`. These are preference scores, not clinical seconds.
The legacy `overrideRate` removes a mental operator for a removable alert;
it is not a probability that a clinician rejects a recommendation or bypasses a
hard stop (`lean/Ehr/Sim/Policy.lean:152`).

## Parameter changes and ten implementation priorities

The table is both the top-ten implementation order and the old→new benchmark
record. All values are source-specific; retain historical modes and bind endpoint,
world and model versions into manifests. No fitting was executed in this lane.

| Rank / change | Prior reference or current simplification → preferred evidence | Implementation and limits |
|---|---|---|
| 1. Separate UI, clinical service and queue time | L1 **355 min/FTE weekday**, inbox **85 min** → N1 **391.3±149.1 total EHR**, **71.4±32.4 inbox**, per **8 scheduled clinic hours** (2022–2023). Review **62.6±30.2**, notes **127.5±78.5**, orders **62.4±25.2 min**. | Define bedside, UI, communication, waiting and documentation endpoints first. These are different denominators, not measured increases from 355 to 391.3. Do not append component means as extra waits. L3's 974 s/encounter remains **older evidence (2018)** for its unmatched national encounter estimand. [N1][N1] |
| 2. Fit bounded behavior on matched tasks | U3 medication entry **25±7 s** (2018) → U8 medication **90±40.2 s** (2021), U9 prescription entry **77±46 s** (2022). | Different scripts/settings: reconstruct each, fit navigation before latency, hold out U9. Preserve expert and uncalibrated modes; no universal novice multiplier. [U8][U8], [U9][U9] |
| 3. Model refill as a distinct workflow | Retain U1 refill **52.12±20.66 s**, **older evidence (2018)**; no newer equivalent UI task established. Q3's apparently recent refill task is also 2018. | Claim/delegate → review → approve/deny/change → pharmacy response → notify/close. N16 (2026; 2020–2024 requests) measures operational turnaround with/without embedded pharmacists, which includes waiting and cannot replace UI seconds. U8 e-prescribing **180±53.6 s** is a different task. [U1][U1], [U8][U8], [Q3][Q3], [N16][N16] |
| 4. Model alert inspection and amendment | U3 allergy/interaction **42±14 / 33±13 s** (2018) → U8 compound alert-management task **150±48.37 s**, path **13/12** (2021). | Task includes cancel, alternative order, inspection and documented override. Do not replace two simple task means with one multiplier; no guard bypass probability. Device alarms in N5 are separate. [U8][U8] |
| 5. Stratify interruptions by role/activity | Flat ED **6.9/h**, proposed older attending **7.9/h** → N4 site-2 resident **27 [24,35] interruptions/4h**, 2023. N5 ICU other interruptions affect **44/100 IV-pump activities**. | Use common absolute-time offered events, actor assignment and activity exposure. N4's **36.9%** during ordering is a share of interruptions, not **9.4/h prescribing**; retain I2 only for that older conditional endpoint. No newer comparable ward/surgical shift rate found. [N4][N4], [N5][N5], [I2][I2] |
| 6. Fit interruption service separately from recovery | Fixed five-step durations → N5 other-interruption **28±21.9 s**, pump alert **17.9±13.9 s**; older I7 dispensing mean/SD **80.4/85.8 s** retained for its distinct role. N8 clinical pharmacists **34 interruptions/day** (2024). | Channel-specific service; neither duration is reorientation. N11 (2023, 2019–2020 simulation) excludes interrupting time when comparing task duration; N12 (2022) tests recovery performance, not lag seconds. Per-draft recovery slopes remain unidentified. [N5][N5], [N8][N8], [N11][N11], [N12][N12] |
| 7. Represent scheduled doses across shifts | Late-only windows/shift expiry → S14 eligible scheduled-dose **±30/60/120 min** windows, subject to hospital classification and exclusions. | Generate from order intervals, retain early sign and accepted successor ownership. Do not change drug criticality, clinical holds, monitoring cutoffs or retry policy based on usability data. No reviewer-dependent policy change is required for this plan. [S14][S14] |
| 8. Separate administered, omitted and documented doses | Older E8 **12.2% early-or-late** → N6 signed lateness **mean25/SD79, median15 [−11,59] min**, 2021–2023 post-cesarean analgesics. N7 documented/observed discrepancy **median6 [2,16] min**. | Record actual administration, charting and terminal nonadministration separately; no universal Bernoulli lateness/refusal draw. N6 excludes omitted doses and is a postpartum comparator, not a general ICU target. N15 UK ward-stock supply omissions **0.08%→0.18%** of prescribed doses (2022→2023; p=0.1655) add a subtype comparator; no benefit inferred. E5–E8 remain older contrasts. [N6][N6], [N7][N7], [N15][N15] |
| 9. Add contemporary inbox streams | L4 **33.8 all messages/clinician-day**, patient **1.06** (2019 mixed specialties) → N1 patient advice **15.3±7.6**, prescriptions **14.3±8.5**, results **12.3±5.1**, calls **23.5±9.6**, consults **0.31±0.3**, per **8 scheduled clinic hours**, 2022–2023. N2 quarterly advice volume **340→695**, 2019→2021. | Replace capped results/refill bursts with arrivals, ownership, delegation and downstream work. Categories are not a complete census; do not sum against 33.8 or infer dispersion from means. N3 secure messages **9 [0,51] sent+received/day** are a separate inpatient physician/APP channel, not RN or portal arrivals. [N1][N1], [N2][N2], [N3][N3] |
| 10. Make ED demand 24h/7d and model boarding | Weekday daytime weights, **U(5,25)** readiness → S15/2022 national **56.3% after business hours**, provider wait **median16/mean38.1 min**; N9/2017–2024 national boarding: January-2022 peak **40.1% >4h**, **6.3% >24h**. | Separate facility arrivals, assigned patients, provider queues, admission decision and bed departure. Peak boarding is a stress profile, not a current mean. Retain E4's hour×weekday shape as **older evidence (2005–2006)** only: newer N17/Karpman/2021 still observes 2009–2019. Do not extrapolate selected Monday bins as a full post-pandemic curve. [S15][S15], [N9][N9], [E4][E4], [N17][N17] |

52 active literature rows now comprise **24 current / 28 older-retained**;
six exact prior rows are archived separately (all older). This conservative count
uses cohort/report dates and explicitly marked publication bounds, not publication alone. L7 ends in January 2020 and supplies little pandemic-period exposure. N7 is current by its 2021 publication bound; the accessible abstract does not date its observations, so it is not counted as confirmed contemporary patient data. Among the original 38 parameter IDs,
five now use current replacements, one uses a newer publication with older data,
four already have current evidence (fragmentation, timing review and two 2022 national ED rows),
and the medication-window guidance is current: **10 current / 28 older**. Fourteen
new current rows supply the missing channels/endpoints. By publication/report
year alone, more rows are recent; that is not a count of post-pandemic data.

### Retained assumptions and missing work

The [50-family inventory](workflow-sources/code-assumptions.json) remains unchanged,
including 29 explicit markers and 267 world callsites. No unsupported number is
promoted to a calibrated default:

| Families | Treatment / remaining evidence gap |
|---|---|
| A01–A05, A08–A15, A48–A50 | KLM/menu models K1/K2 remain older conceptual baselines. SED aggregate tasks do not isolate barcode scans, typing, help/cosign waits, day-scale forgetting, memory capacity, per-entry recovery, movement tastes or review-session costs. Fit identifiable combinations; retain ranges for the rest. |
| A06/A07/A18–A23 | Fit role/channel/task exposure, not equal five-way interruption types, unsupported clinic 3/h, per-task Poisson or fixed closure waits. L7's **1.4±0.6 switches/min** and N3's **79 [35,147] patient switches/day** have different endpoints. Preserve useful interruptions and deferral. |
| A16/A17/A42 | Decision-linked lookups may be interleaved and stale/missing/conflicting. No public usability source establishes universal recency windows, SBP/INR thresholds, 1.35s/item reading or item×screen cognitive load. Keep clinical definitions and illustrative scenarios intact. |
| A24–A28/A44 | Preserve actor/patient/task binding and current guard revalidation. Add independently timed chart updates, accepted handover and censored pending work. FHIR Task/Workflow/PlanDefinition (S8–S10), CDS Hooks (S11), and 2025 SAFER (S13) support structure, not rates. |
| A29/A30/A32/A35/A43 | Visit counts, no-shows, weekday/flu factors, clinical mix and lengths of stay remain local scenarios. M1's historical ESI counts/outcomes are fixed benchmark comparators, not national current draws. |
| A31/A33/A34/A37–A40 | Order-relative administration, physical supply, PRN response and handover need separate phases. Old E1 report→ack medians **18.1h lab / 42h imaging**, E2 RN transition **15/13min**, E6 reason percentages and E7 **3.49/1.66%** omissions have no newer equivalent matched estimator here. They are sensitivity references, not default response targets. |
| A36/A41/A45–A47 | Operation durations, portering/cleaning/ADT rates, special challenge days and computation limits remain named scenarios. No measured replacement is established. Bound exhaustion is not clinical failure. |

Priority missing phases follow the ten changes: chart synthesis and note authoring;
team inbox and pharmacy clarification; physical preparation/dispensing/administration;
longitudinal result responsibility and follow-through; interleaved ED investigations;
active sender/recipient handover; external reconciliation; prescription amend/cancel;
decision-linked information needs; caregiver/vaccine/perioperative coordination.
Standards S8–S13 supply dependencies/ownership, never timing constants. Existing
critical-result communication does not itself resolve the clinical result.

## Statistical acceptance without a clinician reviewer

This is a predeclared engineering adequacy rule, not a source-authored clinical
standard. No claim of clinical validation is permitted. Implementation must freeze
source-equivalent scripts, initial/final states, participant role, screen/patient
selection, typing, alerts, success conditioning and timing boundaries before fit.
Semantic source steps are not clicks. Keep UI, bedside, communication, passive
wait, queueing and reorientation clocks separate; preserve errors, assistance,
refusals, abandonment and computational exhaustion as distinct outcomes.

1. **Partition before fitting.** Train on U8-2/3/5 and U1-21 (the last explicitly
   historical refill sensitivity). Use U8-6/7/9 for development. Freeze U9-2/4
   as contemporary cross-report holdouts and all nine U3 rows as older ED-family
   transfer holdouts. U5's three repeated-participant rounds are one external
   nursing task family, not three independent tasks. Never tune on a holdout;
   redesign retires it and requires new held-out evidence.
2. **Fit identifiable quantities.** Fit navigation/completion/path first, then
   nonnegative reading/choice/typing/service terms conditional on those traces.
   Use aggregate success likelihood and successful-time moments; do not fabricate
   individual subjects. A lognormal initialization from mean/SD is a modeling
   choice, not an observed distribution. Ratios without absolute times (U4) cannot
   pass a timing gate. Missing SD/CI stays missing.
3. **Execute once with frozen seeds.** For each eligible holdout, run 10,000
   synthetic attempts, conditional-time summaries restricted to successes; require
   Monte Carlo SE of the mean ≤0.05 times the source SD (increase sample count
   before inspecting fit if necessary). All **11 time holdouts** must satisfy
   `abs(predicted_mean − source_mean) ≤ source_SD`. For U9 these intervals are
   **31–123 s** (medication) and **0–161 s** (lab; lower bound clipped at zero).
   These are one-SD adequacy bands, not confidence intervals for a population mean.
4. **Require completion and distribution checks.** Each held-out completion
   probability must lie in the source-count Wilson 95% binomial interval using
   z=1.959964 (11/11 gives approximately **0.741–1**). All time-holdout predicted
   SD/source-SD ratios must be **0.5–2**; these ratio bounds are declared policy.
   Path ratios must be within **0.20 absolute** where aggregation is interpretable;
   U9-2 and rows with unknown path denominators are excluded and reported as such.
   No invented error-count, assistance or path pass is allowed for missing data.
5. **Test shift profiles independently.** Hold out N1 total EHR8 **391.3±149.1**
   and TOSH8 **84.3±58.8** from fitting; use inbox/review/note/order and message
   moments as train targets, matching exact normalization. The two holdout means
   must fall within one reported SD and their SD ratios within 0.5–2. For N4/N5
   and other role profiles, preselect at least two non-overlapping, source-matched
   task families with reported SD/CI before promoting that role to a calibrated
   default. Current evidence does **not** meet that breadth for RN, pediatric,
   surgical or pharmacy defaults. N4 quartiles, N6 lateness, N9 peak tails and
   older result/handover/omission values are reported external sensitivity checks,
   not a fictitious all-role pass.
6. **Preserve safety and paired experiments.** The fitted model must pass existing
   completion/guard/regression requirements and have lower macro-mean absolute
   held-out time error than frozen KLM-only on identical scripts. Common exogenous
   arrivals/chart updates are generated once on an absolute 24h/7d clock for both
   arms, with independent actor memories/RNG streams. Do not generate exposure
   from clicks or drop future offered work when one arm finishes. Report each
   failure; no averaging away a failing task or refitting tolerances after results.

Only a passing, explicitly scoped profile may become a successor default;
otherwise keep it experimental. **No fitting, synthetic acceptance run or
acceptance result is claimed here. No clinician review** remains a limitation,
as do small convenience cohorts, assistance ambiguity, aggregate-only uncertainty,
uncertain taxonomy transfer and absent repeated-layout observations. Statistical
agreement with task times does not establish diagnostic judgment, patient safety,
clinical outcomes or population realism.

## Public-only workload plan and optional access

Use the published aggregates above now. National 2022 NHAMCS waiting/after-hours
figures remain the latest located final NHAMCS ED tables; the CDC reports that
collection ended in 2022. No unshifted modern complete hour×weekday ED curve was
established. Do not fit an entire arrival law from four old bins or two tail
probabilities. Use declared scenario curves and sensitivity profiles until a
matched public aggregate table is available.

If later authorized, pin S4 MIMIC-IV 3.1 and S5 ED 2.2 (or recheck another release).
The optional extraction design is:

| Tables | Candidate statistic | Limits |
|---|---|---|
| `hosp.emar`, `emar_detail`, pharmacy/orders | Actual versus scheduled dose, separate storage lag, occurrence-level outcomes | Validate event types and order versions; missing schedule is unknown. Multiple ingredient rows must not multiply dose counts. “Not Given” is not universally refusal. |
| `ed.edstays`, `triage`, vitals/reconciliation/dispensing | Within-patient stay intervals, acuity and activity occurrences | No independent provider-first-seen timestamp; dispensing is not administration. |
| Labs/microbiology/orders; admissions/transfers/services | Result availability and within-patient transition/next-dose gaps | Not result acknowledgment, accepted handover, transport completion or bed cleaning. |

Subject-specific date shifts prevent reconstruction of contemporaneous hospital
occupancy, real weekday demand or provider workload. These datasets do not supply
click/search/reading/resumption time. Do not infer timing from proxy endpoints.
No patient-level or demo rows were accessed or downloaded. If pursued, each
collaborator must independently meet the project's credentials/training/DUA
requirements. Keep queries, data and derived outputs in an authorized local
environment under the applicable agreement; commit no rows, identifiers, dates,
free text or credentialed fitted outputs. Public sources alone remain sufficient
for the plan's evidence and acceptance design.

## Verification and remaining gaps

`TMPDIR=/home/saithat/Projects/run-tmp CI=true python3 scripts/verify-workflow-sources.py --online`
checks JSON types, unique IDs, source/locator coverage, reciprocal supersession,
evidence-year labels, search coverage, current-task partition, bibliography
resolution/metadata and unchanged inventory hashes. Online access failures are
reported separately from identifier mismatches; neither becomes a silent pass.
It performs no Lean, app, browser, Docker or patient-data work.

Remaining gaps: matched contemporary refill seconds; general-ward/specialty task
breadth; whole-shift ward/surgery/US-pharmacy interruption taxonomy; post-pandemic
hour×weekday arrivals; result-view/ack/action chains; active handover; omitted-dose
reasons; learned navigation/recovery coefficients. Keys and clinician recruitment
are not prerequisites. Unsupported clinical-policy values remain explicit
scenarios, and no clinical validation is claimed.

## References and read levels

Full bibliographic metadata, original report hashes, evidence dates and limitations
are in the source register. Short source IDs above link directly to public pages.

[L1]: https://pubmed.ncbi.nlm.nih.gov/28893811/
[L2]: https://pubmed.ncbi.nlm.nih.gov/27595430/
[L3]: https://pubmed.ncbi.nlm.nih.gov/31931523/
[L4]: https://pubmed.ncbi.nlm.nih.gov/33315048/
[L5]: https://pubmed.ncbi.nlm.nih.gov/31750912/
[L6]: https://pubmed.ncbi.nlm.nih.gov/33434273/
[L7]: https://pubmed.ncbi.nlm.nih.gov/33936464/
[L8]: https://pubmed.ncbi.nlm.nih.gov/24060331/
[I1]: https://pubmed.ncbi.nlm.nih.gov/20421552/
[I2]: https://pubmed.ncbi.nlm.nih.gov/29317463/
[I4]: https://pubmed.ncbi.nlm.nih.gov/28871511/
[I5]: https://pubmed.ncbi.nlm.nih.gov/28697685/
[I6]: https://pubmed.ncbi.nlm.nih.gov/11073472/
[I7]: https://pubmed.ncbi.nlm.nih.gov/32308866/
[E1]: https://pubmed.ncbi.nlm.nih.gov/24598829/
[E2]: https://pubmed.ncbi.nlm.nih.gov/24553442/
[E3]: https://pubmed.ncbi.nlm.nih.gov/36332227/
[E4]: https://pubmed.ncbi.nlm.nih.gov/18370987/
[E5]: https://pubmed.ncbi.nlm.nih.gov/29523536/
[E6]: https://pubmed.ncbi.nlm.nih.gov/25650191/
[E7]: https://pubmed.ncbi.nlm.nih.gov/25856373/
[E8]: https://pubmed.ncbi.nlm.nih.gov/20445181/
[M1]: https://pubmed.ncbi.nlm.nih.gov/36302776/
[M2]: https://pubmed.ncbi.nlm.nih.gov/36596836/
[U5]: https://pubmed.ncbi.nlm.nih.gov/37798581/
[K1]: https://doi.org/10.1145/358886.358895
[K2]: https://doi.org/10.1145/1240624.1240723
[U1]: https://slicompliance.com/wp-content/uploads/2024/12/2018-and-2024-Combined-EHR-Usability-Test-Report_12_9_2024_Version-2.pdf
[U2]: https://www.slicompliance.com/wp-content/uploads/2018/06/G3-Sisoft-Healthcare-Information-Systems-EHRUT.pdf
[U3]: https://slicompliance.com/wp-content/uploads/2018/06/Wellsoft-Usability-Report_a1-9-2.pdf
[U4]: https://slicompliance.com/wp-content/uploads/2020/04/Full-Usability-Report-IPClinical.pdf
[I3]: https://gregtrafton.com/papers/task_interruption.pdf
[S1]: https://www.healthit.gov/wp-content/uploads/2024/03/chpl_public_user_guide.pdf
[S2]: https://healthit.gov/test-method/safety-enhanced-design
[S3]: https://github.com/chpladmin/chpl-api/blob/staging/chpl/chpl-api/src/main/java/gov/healthit/chpl/web/controller/SearchController.java
[S4]: https://physionet.org/content/mimiciv/3.1/
[S5]: https://physionet.org/content/mimic-iv-ed/2.2/
[S6]: https://github.com/MIT-LCP/mimic-iv-website/blob/3d77603f76583162f0526573197d9f19f6d6f139/content/hosp/emar.md
[S7]: https://github.com/MIT-LCP/mimic-iv-website/blob/3d77603f76583162f0526573197d9f19f6d6f139/content/hosp/emar_detail.md
[S8]: https://hl7.org/fhir/R4/workflow.html
[S9]: https://hl7.org/fhir/R4/task.html
[S10]: https://hl7.org/fhir/R4/plandefinition.html
[S11]: https://cds-hooks.hl7.org/2.0/
[S12]: https://www.ihe.net/uploadedFiles/Documents/Pharmacy/IHE_Pharmacy_Suppl_HMW.pdf
[S13]: https://healthit.gov/wp-content/uploads/2025/06/SAFER-Guide-8.-Test-Results-Reporting-Final.pdf
[S14]: https://www.cms.gov/Regulations-and-Guidance/Guidance/Manuals/Downloads/som107ap_a_hospitals.pdf
[S15]: https://www.cdc.gov/nchs/data/nhamcs/web_tables/2022-nhamcs-ed-web-tables.pdf
[N1]: https://pubmed.ncbi.nlm.nih.gov/38253499/
[N2]: https://pubmed.ncbi.nlm.nih.gov/38129617/
[N3]: https://pubmed.ncbi.nlm.nih.gov/40085321/
[N4]: https://pubmed.ncbi.nlm.nih.gov/40552315/
[N5]: https://pubmed.ncbi.nlm.nih.gov/41140292/
[N6]: https://pubmed.ncbi.nlm.nih.gov/38947679/
[N7]: https://pubmed.ncbi.nlm.nih.gov/34392956/
[N8]: https://pubmed.ncbi.nlm.nih.gov/40257690/
[N9]: https://pubmed.ncbi.nlm.nih.gov/40456033/
[N10]: https://pubmed.ncbi.nlm.nih.gov/42496179/
[N11]: https://pubmed.ncbi.nlm.nih.gov/37070669/
[N12]: https://pubmed.ncbi.nlm.nih.gov/35933839/
[N13]: https://pubmed.ncbi.nlm.nih.gov/41628375/
[N14]: https://pubmed.ncbi.nlm.nih.gov/39832825/
[U8]: https://slicompliance.com/wp-content/uploads/2021/12/Strateq_EHR_UsabilityReport_08Dec2021.pdf
[U9]: https://www.open-emr.org/wiki/images/f/fc/OpenEMR_Usability_Report.pdf
[Q1]: https://slicompliance.com/wp-content/uploads/2026/02/ezEMRx_Usability_Study_with-a5.pdf
[Q2]: https://slicompliance.com/wp-content/uploads/2024/12/Simplify-EMR-SED_updated.pdf
[Q3]: https://slicompliance.com/wp-content/uploads/2024/12/EHR-Usability-Test-Report_Updated-12_18_2024-Emedsys-v8.pdf
[N15]: https://pubmed.ncbi.nlm.nih.gov/40103606/
[N16]: https://doi.org/10.1016/j.japhpi.2025.100085
[N17]: https://pubmed.ncbi.nlm.nih.gov/33954967/
