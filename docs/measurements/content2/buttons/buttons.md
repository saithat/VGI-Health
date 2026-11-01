# Button audit

Generated 2026-11-01T15:36:38.763Z. Preview build; one Chromium worker.

| Scope | Works | Disabled with reason | Dead | Error |
|---|---:|---:|---:|---:|
| App baseline | 0 | 0 | 0 | 0 |
| App final | 18 | 0 | 0 | 0 |
| Lean final | 573 | 9 | 0 | 0 |

App coverage includes additional worklist and drawer controls after the baseline. A complete pre-fix Lean census was not retained; see README.md.

Each sampled enabled control is clicked from an observed checkpoint. A changed input echo alone does not certify a Lean search. Selected navigation and reset controls must provide feedback or a disabled reason. Disabled commits are recorded with Lean's actual reason; the audit never fabricates safety evidence to enable a write.

| Route / persona / program | Screen | Label | Comp id | Kind / owner | Status | Observed effect |
|---|---|---|---|---|---|---|
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Search chart | home.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | In Basket: Results | home.work.w2Inbasket | click / {"button":{"action":{"goto":{"screen":"w2Inbasket"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | In Basket: Rx Requests | home.work.w7Queue | click / {"button":{"action":{"goto":{"screen":"w7Queue"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Open encounter | home.work.w1Rooming | click / {"button":{"action":{"goto":{"screen":"w1Rooming"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w2Inbasket | Search chart | w2Inbasket.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w2Inbasket | Search In Basket | w2Inbasket.basketSearch | enter / {"search":{"scope":"inbasket"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w2Inbasket | Review result | w2Inbasket.openResult | click / {"button":{"action":{"goto":{"screen":"w2Result"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w2Inbasket | Expand section | w2Inbasket.chart.includeResolved | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w2Inbasket | Encounters | w2Inbasket.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w2Inbasket | Notes | w2Inbasket.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w2Inbasket | Results | w2Inbasket.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w2Inbasket | Medications | w2Inbasket.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w2Inbasket | Problems | w2Inbasket.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w2Inbasket | Allergies | w2Inbasket.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w2Inbasket | Imaging | w2Inbasket.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w2Inbasket | Back | w2Inbasket.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w2Inbasket | Patient workspace | w2Inbasket.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w7Queue | Search chart | w7Queue.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w7Queue | Review request | w7Queue.open | click / {"button":{"action":{"goto":{"screen":"w7Review"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w7Queue | Expand section | w7Queue.chart.includeResolved | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w7Queue | Encounters | w7Queue.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w7Queue | Notes | w7Queue.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w7Queue | Results | w7Queue.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w7Queue | Medications | w7Queue.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w7Queue | Problems | w7Queue.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w7Queue | Allergies | w7Queue.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w7Queue | Imaging | w7Queue.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w7Queue | Back | w7Queue.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | Medications | w1Rooming.nav.w1MedRec | click / {"button":{"action":{"goto":{"screen":"w1MedRec"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | History / ROS | w1Rooming.nav.w1Hpi | click / {"button":{"action":{"goto":{"screen":"w1Hpi"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | Exam / Assessment & Plan | w1Rooming.nav.w1Exam | click / {"button":{"action":{"goto":{"screen":"w1Exam"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | Orders | w1Rooming.nav.w1Orders | click / {"button":{"action":{"goto":{"screen":"w1Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | Lab Orders | w1Rooming.nav.w1Labs | click / {"button":{"action":{"goto":{"screen":"w1Labs"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | Sign Visit | w1Rooming.nav.w1Close | click / {"button":{"action":{"goto":{"screen":"w1Close"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | Search chart | w1Rooming.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | Expand section | w1Rooming.chart.includeResolved | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | Confirm prefilled value | w1Rooming.weight | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":{"fromRecord":{"fact":"weightToday"}},"element":"weight"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | Pain (0–10) | w1Rooming.painScore | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"painScore"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | Mark allergies reviewed | w1Rooming.review.allergyList | click / {"button":{"action":{"markReviewed":{"info":"allergyList"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | View saved record 1 | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | Tobacco use | w1Rooming.tobaccoUse | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"tobaccoUse"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | Fall in the past year? | w1Rooming.fallRiskScreen | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"fallRiskScreen"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | Travel in the past 30 days? | w1Rooming.travelScreen | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"travelScreen"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | Advance directive discussed | w1Rooming.advanceDirectiveAsked | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"advanceDirectiveAsked"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | Interpreter needed? | w1Rooming.interpreterNeeded | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"interpreterNeeded"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | Preferred pharmacy confirmed | w1Rooming.pharmacyConfirmedRooming | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"pharmacyConfirmedRooming"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | PHQ-2 score | w1Rooming.depressionScreen | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"depressionScreen"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | Encounters | w1Rooming.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | Notes | w1Rooming.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | Results | w1Rooming.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | Medications | w1Rooming.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | Problems | w1Rooming.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | Allergies | w1Rooming.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | Imaging | w1Rooming.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | Back | w1Rooming.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w2Result | Search chart | w2Result.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w2Result | Expand section | w2Result.chart.includeResolved | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w2Result | Clinical action | w2Result.resultAction | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"resultAction"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w2Result | Follow-up test (LOINC) | w2Result.resultFollowUpOrder | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"resultFollowUpOrder"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w2Result | Result Note / Message to patient | w2Result.message | click / {"button":{"action":{"goto":{"screen":"w2Message"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w2Result | Reviewed / Done | w2Result.commit.ackResult | click / {"button":{"action":{"commit":{"commit":"ackResult"}}}} / lean | disabled-with-reason | entry required: Result action |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w2Result | Encounters | w2Result.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w2Result | Notes | w2Result.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w2Result | Results | w2Result.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w2Result | Medications | w2Result.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w2Result | Problems | w2Result.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w2Result | Allergies | w2Result.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w2Result | Imaging | w2Result.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w2Result | Back | w2Result.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w7Review | Search chart | w7Review.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w7Review | Expand section | w7Review.chart.includeResolved | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w7Review | Last visit | w7Review.refillTabs | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w7Review | Labs | w7Review.refillTabs | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w7Review | Fill history | w7Review.refillTabs | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w7Review | Medications | w7Review.refillTabs | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w7Review | Last note | w7Review.refillTabs | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w7Review | Mark last visit reviewed | w7Review.review.lastVisit | click / {"button":{"action":{"markReviewed":{"info":"lastVisit"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w7Review | View saved record 1 | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w7Review | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w7Review | Encounters | w7Review.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w7Review | Notes | w7Review.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w7Review | Results | w7Review.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w7Review | Medications | w7Review.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w7Review | Problems | w7Review.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w7Review | Allergies | w7Review.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w7Review | Imaging | w7Review.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w7Review | Respond to request | w7Review.decide | click / {"button":{"action":{"goto":{"screen":"w7Decision"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w7Review | Back | w7Review.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1MedRec | Search chart | w1MedRec.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1MedRec | Expand section | w1MedRec.chart.includeResolved | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1MedRec | Mark medications reviewed | w1MedRec.review.currentMeds | click / {"button":{"action":{"markReviewed":{"info":"currentMeds"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1MedRec | View saved record 1 | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1MedRec | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1MedRec | Medication 1: continue / stop / modify — albuterol | w1MedRec.decision0 | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"medRecDecision"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1MedRec | Medication 2: continue / stop / modify — azithromycin | w1MedRec.decision1 | enter / {"field":{"slot":{"fixed":{"n":1}},"prefill":"none","element":"medRecDecision"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1MedRec | Medication 3: continue / stop / modify — lisinopril | w1MedRec.decision2 | enter / {"field":{"slot":{"fixed":{"n":2}},"prefill":"none","element":"medRecDecision"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1MedRec | Medication 4: continue / stop / modify — enoxaparin | w1MedRec.decision3 | enter / {"field":{"slot":{"fixed":{"n":3}},"prefill":"none","element":"medRecDecision"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1MedRec | Last plan | w1MedRec.medTabs | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1MedRec | Fill history | w1MedRec.medTabs | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1MedRec | Encounters | w1MedRec.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1MedRec | Notes | w1MedRec.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1MedRec | Results | w1MedRec.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1MedRec | Medications | w1MedRec.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1MedRec | Problems | w1MedRec.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1MedRec | Allergies | w1MedRec.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1MedRec | Imaging | w1MedRec.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1MedRec | Back | w1MedRec.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Hpi | Search chart | w1Hpi.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Hpi | Expand section | w1Hpi.chart.includeResolved | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Hpi | Copy previous note | w1Hpi.copyForward | click / {"macro":{"id":"w1CopyForward"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Hpi | Normal ROS template | w1Hpi.rosTemplate | click / {"macro":{"id":"w1RosTemplate"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Hpi | Expand section | w1Hpi.lastNote | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Hpi | HPI | w1Hpi.hpi | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"hpi"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Hpi | ROS | w1Hpi.ros | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"ros"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Hpi | Medical history | w1Hpi.historyTabs | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Hpi | Surgical history | w1Hpi.historyTabs | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Hpi | Family history | w1Hpi.historyTabs | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Hpi | Social history | w1Hpi.historyTabs | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Hpi | Expand section | w1Hpi.historyTabs.includeResolved | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Hpi | Encounters | w1Hpi.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Hpi | Notes | w1Hpi.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Hpi | Results | w1Hpi.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Hpi | Medications | w1Hpi.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Hpi | Problems | w1Hpi.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Hpi | Allergies | w1Hpi.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Hpi | Imaging | w1Hpi.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Hpi | Back | w1Hpi.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | home | Search chart | home.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | home | ED Track Board | home.work.w3TrackBoard | click / {"button":{"action":{"goto":{"screen":"w3TrackBoard"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3TrackBoard | Triage | w3TrackBoard.nav.w3Triage | click / {"button":{"action":{"goto":{"screen":"w3Triage"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3TrackBoard | Provider note | w3TrackBoard.nav.w3Provider | click / {"button":{"action":{"goto":{"screen":"w3Provider"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3TrackBoard | Order sets | w3TrackBoard.nav.w3OrderSets | click / {"button":{"action":{"goto":{"screen":"w3OrderSets"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3TrackBoard | Orders | w3TrackBoard.nav.w3Orders | click / {"button":{"action":{"goto":{"screen":"w3Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3TrackBoard | Disposition | w3TrackBoard.nav.w3Disposition | click / {"button":{"action":{"goto":{"screen":"w3Disposition"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3TrackBoard | Search chart | w3TrackBoard.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3TrackBoard | Back | w3TrackBoard.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3TrackBoard | Patient workspace | w3TrackBoard.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3TrackBoard | Results | w3TrackBoard.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3TrackBoard | Imaging | w3TrackBoard.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3TrackBoard | Notes | w3TrackBoard.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3TrackBoard | Encounters | w3TrackBoard.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Search chart | w3Triage.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Collapse section | w3Triage.vitalsGroup | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Pain (0–10) | w3Triage.painScore | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"painScore"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Acuity (ESI) | w3Triage.triageAcuity | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"triageAcuity"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Arrival mode | w3Triage.arrivalMode | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"arrivalMode"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Isolation screen | w3Triage.isolationScreen | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"isolationScreen"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Collapse section | w3Triage.allergyGroup | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Mark allergies reviewed | w3Triage.review.allergyList | click / {"button":{"action":{"markReviewed":{"info":"allergyList"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | View saved record 1 | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Back | w3Triage.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Results | w3Triage.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Imaging | w3Triage.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Notes | w3Triage.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Encounters | w3Triage.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Provider | Search chart | w3Provider.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Provider | History of present illness | w3Provider.hpi | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"hpi"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Provider | Review of systems | w3Provider.ros | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"ros"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Provider | Medication reconciliation decision | w3Provider.medRecDecision | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"medRecDecision"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Provider | Billing diagnosis (ICD-10) | w3Provider.claimDiagnosis | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":{"linked":{"element":"visitDiagnosis"}},"element":"claimDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Provider | Level of service | w3Provider.levelOfService | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"levelOfService"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Provider | Physical exam | w3Provider.exam | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"exam"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Provider | Medical decision making | w3Provider.assessmentPlan | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"assessmentPlan"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Provider | Sign ED note | w3Provider.commit.signNote | click / {"button":{"action":{"commit":{"commit":"signNote"}}}} / lean | disabled-with-reason | entry required: Chief complaint |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Provider | Back | w3Provider.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Provider | Results | w3Provider.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Provider | Imaging | w3Provider.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Provider | Notes | w3Provider.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Provider | Encounters | w3Provider.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Search chart | w3OrderSets.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Collapse section | w3OrderSets.sets | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Sepsis (adult) | w3OrderSets.sepsis | click / {"macro":{"id":"w3SepsisSet"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Abdominal pain | w3OrderSets.abdominal | click / {"macro":{"id":"w3AbdominalPainSet"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Cellulitis | w3OrderSets.cellulitis | click / {"macro":{"id":"w3CellulitisSet"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Collapse section | w3OrderSets.row10 | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Collapse section | w3OrderSets.row10.medication | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Enter Medication | w3OrderSets.row10.drug | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Antibiotic indication (required for antibiotics) | w3OrderSets.row10.abxIndication | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"abxIndication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Dose unit | w3OrderSets.row10.doseUnit | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"doseUnit"}} / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Route | w3OrderSets.row10.route | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Frequency | w3OrderSets.row10.freq | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | As needed (PRN) | w3OrderSets.row10.prn | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"prn"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Collapse section | w3OrderSets.row10.dispense | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Duration | w3OrderSets.row10.duration | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Generic substitution allowed | w3OrderSets.row10.substitution | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"substitution"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Collapse section | w3OrderSets.row10.dx | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Pharmacy | w3OrderSets.row10.pharmacy | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":{"fromRecord":{"fact":"preferredPharmacy"}},"element":"pharmacy"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Associated diagnosis (ICD-10) | w3OrderSets.row10.orderDiagnosis | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":{"linked":{"element":"visitDiagnosis"}},"element":"orderDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Collapse section | w3OrderSets.row11 | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Collapse section | w3OrderSets.row11.medication | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Enter Medication | w3OrderSets.row11.drug | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Antibiotic indication (required for antibiotics) | w3OrderSets.row11.abxIndication | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"abxIndication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Dose unit | w3OrderSets.row11.doseUnit | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"doseUnit"}} / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Route | w3OrderSets.row11.route | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Frequency | w3OrderSets.row11.freq | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | As needed (PRN) | w3OrderSets.row11.prn | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"prn"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Collapse section | w3OrderSets.row11.dispense | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Duration | w3OrderSets.row11.duration | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Generic substitution allowed | w3OrderSets.row11.substitution | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"substitution"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Collapse section | w3OrderSets.row11.dx | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Pharmacy | w3OrderSets.row11.pharmacy | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":{"fromRecord":{"fact":"preferredPharmacy"}},"element":"pharmacy"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Associated diagnosis (ICD-10) | w3OrderSets.row11.orderDiagnosis | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":{"linked":{"element":"visitDiagnosis"}},"element":"orderDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Back | w3OrderSets.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Results | w3OrderSets.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Imaging | w3OrderSets.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Notes | w3OrderSets.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Encounters | w3OrderSets.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Review and sign | w3OrderSets.toSign | click / {"button":{"action":{"goto":{"screen":"w3Sign"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Search chart | w3Orders.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Find orders | w3Orders.orderSearch | enter / {"search":{"scope":"formulary"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Collapse section | w3Orders.prefList | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Acetaminophen 1 g PO | w3Orders.prefAcetaminophen | click / {"macro":{"id":"w3PrefAcetaminophen"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Ibuprofen 600 mg PO | w3Orders.prefIbuprofen | click / {"macro":{"id":"w3PrefIbuprofen"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Ondansetron 8 mg IV | w3Orders.prefOndansetron | click / {"macro":{"id":"w3PrefOndansetron"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Ceftriaxone 2 g IV | w3Orders.prefCeftriaxone | click / {"macro":{"id":"w3PrefCeftriaxone"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Morphine 10 mg IV q4h PRN | w3Orders.prefMorphine | click / {"macro":{"id":"w3PrefMorphine"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Collapse section | w3Orders.dosing | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Collapse section | w3Orders.medication | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Enter Medication | w3Orders.drug | enter / {"field":{"slot":"current","prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Antibiotic indication (required for antibiotics) | w3Orders.abxIndication | enter / {"field":{"slot":"current","prefill":"none","element":"abxIndication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Dose unit | w3Orders.doseUnit | enter / {"field":{"slot":"current","prefill":"none","element":"doseUnit"}} / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Route | w3Orders.route | enter / {"field":{"slot":"current","prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Frequency | w3Orders.freq | enter / {"field":{"slot":"current","prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | As needed (PRN) | w3Orders.prn | enter / {"field":{"slot":"current","prefill":"none","element":"prn"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Collapse section | w3Orders.dispense | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Duration | w3Orders.duration | enter / {"field":{"slot":"current","prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Generic substitution allowed | w3Orders.substitution | enter / {"field":{"slot":"current","prefill":"none","element":"substitution"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Collapse section | w3Orders.dx | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Pharmacy | w3Orders.pharmacy | enter / {"field":{"slot":"current","prefill":{"fromRecord":{"fact":"preferredPharmacy"}},"element":"pharmacy"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Associated diagnosis (ICD-10) | w3Orders.orderDiagnosis | enter / {"field":{"slot":"current","prefill":{"linked":{"element":"visitDiagnosis"}},"element":"orderDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Expand section | w3Orders.more | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Current meds | w3Orders.orderInfo | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | CURES report | w3Orders.orderInfo | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Recent labs | w3Orders.orderInfo | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Request authorization (human entry) | w3Orders.priorAuthRequest | enter / {"field":{"slot":"current","prefill":"none","element":"priorAuthRequest"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Request prior authorization | w3Orders.requestPriorAuth | click / {"button":{"action":"requestPriorAuth"}} / lean | disabled-with-reason | no order on this line |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Accept and add another order | w3Orders.newLine | click / {"button":{"action":"newOrderLine"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Back | w3Orders.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Results | w3Orders.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Imaging | w3Orders.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Notes | w3Orders.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Encounters | w3Orders.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Disposition | Search chart | w3Disposition.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Disposition | Disposition | w3Disposition.dispositionChoice | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"dispositionChoice"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Disposition | ED diagnosis (ICD-10) | w3Disposition.visitDiagnosis | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"visitDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Disposition | Condition | w3Disposition.dispositionCondition | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"dispositionCondition"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Disposition | Collapse section | w3Disposition.admitGroup | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Disposition | Admitting service | w3Disposition.admitService | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"admitService"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Disposition | Level of care | w3Disposition.admitLevelOfCare | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"admitLevelOfCare"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Disposition | Expand section | w3Disposition.dischargeGroup | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Disposition | Set disposition | w3Disposition.commit.disposition | click / {"button":{"action":{"commit":{"commit":"disposition"}}}} / lean | disabled-with-reason | entry required: Disposition |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Disposition | Back | w3Disposition.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Disposition | Results | w3Disposition.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Disposition | Imaging | w3Disposition.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Disposition | Notes | w3Disposition.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Disposition | Encounters | w3Disposition.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row10.drug | confirm / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row10.abxIndication | confirm / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"abxIndication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row10.dose | confirm / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"dose"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row10.doseUnit | confirm / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"doseUnit"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row10.route | confirm / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row10.freq | confirm / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row10.prn | confirm / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"prn"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row10.duration | confirm / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row10.quantity | confirm / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"quantity"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row10.refills | confirm / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"refills"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row10.substitution | confirm / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"substitution"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row10.pharmacy | confirm / {"field":{"slot":{"fixed":{"n":10}},"prefill":{"fromRecord":{"fact":"preferredPharmacy"}},"element":"pharmacy"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row10.indication | confirm / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"indication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row10.orderDiagnosis | confirm / {"field":{"slot":{"fixed":{"n":10}},"prefill":{"linked":{"element":"visitDiagnosis"}},"element":"orderDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row11.drug | confirm / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row11.abxIndication | confirm / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"abxIndication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row11.dose | confirm / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"dose"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row11.doseUnit | confirm / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"doseUnit"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row11.route | confirm / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row11.freq | confirm / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row11.prn | confirm / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"prn"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row11.duration | confirm / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row11.quantity | confirm / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"quantity"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row11.refills | confirm / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"refills"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row11.substitution | confirm / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"substitution"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row11.pharmacy | confirm / {"field":{"slot":{"fixed":{"n":11}},"prefill":{"fromRecord":{"fact":"preferredPharmacy"}},"element":"pharmacy"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row11.indication | confirm / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"indication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row11.orderDiagnosis | confirm / {"field":{"slot":{"fixed":{"n":11}},"prefill":{"linked":{"element":"visitDiagnosis"}},"element":"orderDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | home | Search chart | home.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | home | Unit Census & MAR | home.work.w4Worklist | click / {"button":{"action":{"goto":{"screen":"w4Worklist"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Worklist | MAR | w4Worklist.nav.w4Mar | click / {"button":{"action":{"goto":{"screen":"w4Mar"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Worklist | Flowsheet | w4Worklist.nav.w4Flowsheet | click / {"button":{"action":{"goto":{"screen":"w4Flowsheet"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Worklist | Handoff | w4Worklist.nav.w4Handoff | click / {"button":{"action":{"goto":{"screen":"w4Handoff"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Worklist | Search chart | w4Worklist.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Worklist | Expand section | w4Worklist.unitContext | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Worklist | Collapse section | w4Worklist.allergyGroup | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Worklist | Mark allergies reviewed (start of shift) | w4Worklist.review.allergyList | click / {"button":{"action":{"markReviewed":{"info":"allergyList"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Worklist | View saved record 1 | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Worklist | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Worklist | Back | w4Worklist.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Worklist | Patient workspace | w4Worklist.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Worklist | New orders | w4Worklist.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Worklist | Results | w4Worklist.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Worklist | Notes | w4Worklist.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Worklist | Encounters | w4Worklist.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Mar | Search chart | w4Mar.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Mar | PRN history | w4Mar.marTabs | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Mar | Glucose | w4Mar.marTabs | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Mar | Coagulation labs | w4Mar.marTabs | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Mar | Back | w4Mar.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Mar | New orders | w4Mar.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Mar | Results | w4Mar.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Mar | Notes | w4Mar.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Mar | Encounters | w4Mar.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Mar | Open due medication | w4Mar.openDue | click / {"button":{"action":{"goto":{"screen":"w4Admin"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Flowsheet | Search chart | w4Flowsheet.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Flowsheet | Collapse section | w4Flowsheet.vitalsGroup | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Flowsheet | Pain reassessment (0–10) | w4Flowsheet.painReassessment | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"painReassessment"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Flowsheet | Copy forward last assessment | w4Flowsheet.copyAssessment | click / {"macro":{"id":"w4CopyAssessment"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Flowsheet | File assessment | w4Flowsheet.commit.chartAssessment | click / {"button":{"action":{"commit":{"commit":"chartAssessment"}}}} / lean | disabled-with-reason | entry required: BP systolic (mmHg) |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Flowsheet | Back | w4Flowsheet.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Flowsheet | New orders | w4Flowsheet.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Flowsheet | Results | w4Flowsheet.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Flowsheet | Notes | w4Flowsheet.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Flowsheet | Encounters | w4Flowsheet.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Handoff | Search chart | w4Handoff.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Handoff | SBAR template | w4Handoff.template | click / {"macro":{"id":"w4HandoffTemplate"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Handoff | Back | w4Handoff.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Handoff | New orders | w4Handoff.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Handoff | Results | w4Handoff.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Handoff | Notes | w4Handoff.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Handoff | Encounters | w4Handoff.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Admin | Search chart | w4Admin.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Admin | Collapse section | w4Admin.fiveRights | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Admin | Pain score before dose (0–10) | w4Admin.painScore | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"painScore"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Admin | Collapse section | w4Admin.documentation | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Admin | Given / held / refused | w4Admin.adminStatus | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"adminStatus"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Admin | Reason / comment | w4Admin.adminReason | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"adminReason"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Admin | Site | w4Admin.adminSite | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"adminSite"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Admin | Document held: NPO | w4Admin.heldNpo | click / {"macro":{"id":"w4HeldNpo"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Admin | Record administration | w4Admin.commit.administerMed | click / {"button":{"action":{"commit":{"commit":"administerMed"}}}} / lean | disabled-with-reason | entry required: Scan patient wristband |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Admin | Back | w4Admin.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Admin | New orders | w4Admin.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Admin | Results | w4Admin.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Admin | Notes | w4Admin.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Admin | Encounters | w4Admin.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Flowsheet | Confirm prefilled value | w4Flowsheet.nursingAssessment | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"nursingAssessment"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Handoff | Confirm prefilled value | w4Handoff.handoffSituation | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"handoffSituation"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Handoff | Confirm prefilled value | w4Handoff.handoffBackground | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"handoffBackground"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Handoff | Confirm prefilled value | w4Handoff.handoffAssessment | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"handoffAssessment"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Handoff | Confirm prefilled value | w4Handoff.handoffRecommendation | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"handoffRecommendation"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Search chart | home.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | In Basket: Results | home.work.w2Inbasket | click / {"button":{"action":{"goto":{"screen":"w2Inbasket"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | In Basket: Rx Requests | home.work.w7Queue | click / {"button":{"action":{"goto":{"screen":"w7Queue"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Open encounter | home.work.w5Rooming | click / {"button":{"action":{"goto":{"screen":"w5Rooming"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w2Inbasket | Search chart | w2Inbasket.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w2Inbasket | Search In Basket | w2Inbasket.basketSearch | enter / {"search":{"scope":"inbasket"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w2Inbasket | Review result | w2Inbasket.openResult | click / {"button":{"action":{"goto":{"screen":"w2Result"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w2Inbasket | Expand section | w2Inbasket.chart.includeResolved | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w2Inbasket | Encounters | w2Inbasket.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w2Inbasket | Notes | w2Inbasket.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w2Inbasket | Results | w2Inbasket.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w2Inbasket | Medications | w2Inbasket.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w2Inbasket | Problems | w2Inbasket.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w2Inbasket | Allergies | w2Inbasket.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w2Inbasket | Imaging | w2Inbasket.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w2Inbasket | Back | w2Inbasket.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w2Inbasket | Patient workspace | w2Inbasket.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w7Queue | Search chart | w7Queue.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w7Queue | Review request | w7Queue.open | click / {"button":{"action":{"goto":{"screen":"w7Review"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w7Queue | Expand section | w7Queue.chart.includeResolved | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w7Queue | Encounters | w7Queue.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w7Queue | Notes | w7Queue.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w7Queue | Results | w7Queue.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w7Queue | Medications | w7Queue.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w7Queue | Problems | w7Queue.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w7Queue | Allergies | w7Queue.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w7Queue | Imaging | w7Queue.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w7Queue | Back | w7Queue.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Rooming | Growth Charts | w5Rooming.nav.w5Growth | click / {"button":{"action":{"goto":{"screen":"w5Growth"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Rooming | Visit Note | w5Rooming.nav.w5Note | click / {"button":{"action":{"goto":{"screen":"w5Note"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Rooming | Orders | w5Rooming.nav.w5Orders | click / {"button":{"action":{"goto":{"screen":"w5Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Rooming | Immunizations | w5Rooming.nav.w5Immunizations | click / {"button":{"action":{"goto":{"screen":"w5Immunizations"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Rooming | Sign Visit | w5Rooming.nav.w5Close | click / {"button":{"action":{"goto":{"screen":"w5Close"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Rooming | Search chart | w5Rooming.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Rooming | Expand section | w5Rooming.chart.includeResolved | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Rooming | Mark allergies reviewed | w5Rooming.review.allergyList | click / {"button":{"action":{"markReviewed":{"info":"allergyList"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Rooming | View saved record 1 | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Rooming | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Rooming | Medication 1: continue / stop / modify | w5Rooming.decision0 | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"medRecDecision"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Rooming | Medication 2: continue / stop / modify | w5Rooming.decision1 | enter / {"field":{"slot":{"fixed":{"n":1}},"prefill":"none","element":"medRecDecision"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Rooming | Mark medications reviewed | w5Rooming.review.currentMeds | click / {"button":{"action":{"markReviewed":{"info":"currentMeds"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Rooming | View saved record 1 | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Rooming | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Rooming | Encounters | w5Rooming.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Rooming | Notes | w5Rooming.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Rooming | Results | w5Rooming.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Rooming | Medications | w5Rooming.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Rooming | Problems | w5Rooming.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Rooming | Allergies | w5Rooming.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Rooming | Imaging | w5Rooming.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Rooming | Immunizations | w5Rooming.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Rooming | Back | w5Rooming.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w2Result | Search chart | w2Result.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w2Result | Expand section | w2Result.chart.includeResolved | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w2Result | Clinical action | w2Result.resultAction | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"resultAction"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w2Result | Follow-up test (LOINC) | w2Result.resultFollowUpOrder | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"resultFollowUpOrder"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w2Result | Result Note / Message to patient | w2Result.message | click / {"button":{"action":{"goto":{"screen":"w2Message"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w2Result | Reviewed / Done | w2Result.commit.ackResult | click / {"button":{"action":{"commit":{"commit":"ackResult"}}}} / lean | disabled-with-reason | entry required: Result action |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w2Result | Encounters | w2Result.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w2Result | Notes | w2Result.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w2Result | Results | w2Result.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w2Result | Medications | w2Result.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w2Result | Problems | w2Result.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w2Result | Allergies | w2Result.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w2Result | Imaging | w2Result.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w2Result | Back | w2Result.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w7Review | Search chart | w7Review.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w7Review | Expand section | w7Review.chart.includeResolved | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w7Review | Last visit | w7Review.refillTabs | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w7Review | Labs | w7Review.refillTabs | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w7Review | Fill history | w7Review.refillTabs | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w7Review | Medications | w7Review.refillTabs | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w7Review | Last note | w7Review.refillTabs | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w7Review | Mark last visit reviewed | w7Review.review.lastVisit | click / {"button":{"action":{"markReviewed":{"info":"lastVisit"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w7Review | View saved record 1 | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w7Review | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w7Review | Encounters | w7Review.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w7Review | Notes | w7Review.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w7Review | Results | w7Review.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w7Review | Medications | w7Review.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w7Review | Problems | w7Review.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w7Review | Allergies | w7Review.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w7Review | Imaging | w7Review.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w7Review | Respond to request | w7Review.decide | click / {"button":{"action":{"goto":{"screen":"w7Decision"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w7Review | Back | w7Review.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Growth | Search chart | w5Growth.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Growth | Expand section | w5Growth.chart.includeResolved | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Growth | Encounters | w5Growth.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Growth | Notes | w5Growth.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Growth | Results | w5Growth.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Growth | Medications | w5Growth.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Growth | Problems | w5Growth.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Growth | Allergies | w5Growth.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Growth | Imaging | w5Growth.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Growth | Immunizations | w5Growth.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Growth | Back | w5Growth.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Note | Search chart | w5Note.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Note | Expand section | w5Note.chart.includeResolved | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Note | Well-child note template | w5Note.wellChild | click / {"macro":{"id":"w5WellChildTemplate"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Note | History from patient / caregiver | w5Note.hpi | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"hpi"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Note | ROS | w5Note.ros | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"ros"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Note | Exam findings | w5Note.exam | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"exam"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Note | Encounter diagnosis (ICD-10-CM) | w5Note.visitDiagnosis | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"visitDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Note | Problem-based assessment and plan | w5Note.assessmentPlan | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"assessmentPlan"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Note | Anticipatory guidance | w5Note.anticipatoryGuidance | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"anticipatoryGuidance"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Note | Medical history | w5Note.historyTabs | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Note | Surgical history | w5Note.historyTabs | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Note | Family history | w5Note.historyTabs | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Note | Social history | w5Note.historyTabs | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Note | Expand section | w5Note.historyTabs.includeResolved | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Note | Encounters | w5Note.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Note | Notes | w5Note.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Note | Results | w5Note.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Note | Medications | w5Note.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Note | Problems | w5Note.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Note | Allergies | w5Note.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Note | Imaging | w5Note.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Note | Immunizations | w5Note.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Note | Back | w5Note.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | OR Schedule | home.work.w6Schedule | click / {"button":{"action":{"goto":{"screen":"w6Schedule"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Consults | home.work.w6Consults | click / {"button":{"action":{"goto":{"screen":"w6Consults"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Clinic Schedule | home.work.w1Rooming | click / {"button":{"action":{"goto":{"screen":"w1Rooming"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | In Basket: Results | home.work.w2Inbasket | click / {"button":{"action":{"goto":{"screen":"w2Inbasket"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Search chart | home.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open selected case | home.openSelectedCase | click / {"button":{"action":{"goto":{"screen":"w6PreOp"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Schedule | Consult note | w6Schedule.nav.w6Consult | click / {"button":{"action":{"goto":{"screen":"w6Consult"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Schedule | Sign Consult | w6Schedule.nav.w6ConsultClose | click / {"button":{"action":{"goto":{"screen":"w6ConsultClose"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Schedule | Orders | w6Schedule.nav.w6Orders | click / {"button":{"action":{"goto":{"screen":"w6Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Schedule | Sign Orders | w6Schedule.nav.w6Sign | click / {"button":{"action":{"goto":{"screen":"w6Sign"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Schedule | Brief Op Note | w6Schedule.nav.w6OpNote | click / {"button":{"action":{"goto":{"screen":"w6OpNote"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Schedule | Postprocedure Orders | w6Schedule.nav.w6PostOp | click / {"button":{"action":{"goto":{"screen":"w6PostOp"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Schedule | Rounding | w6Schedule.nav.w6Rounding | click / {"button":{"action":{"goto":{"screen":"w6Rounding"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Schedule | Discharge | w6Schedule.nav.w6Discharge | click / {"button":{"action":{"goto":{"screen":"w6Discharge"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Schedule | Search chart | w6Schedule.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Schedule | Expand section | w6Schedule.chart.includeResolved | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Schedule | Back | w6Schedule.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Schedule | Patient workspace | w6Schedule.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Schedule | Encounters | w6Schedule.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Schedule | Notes | w6Schedule.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Schedule | Results | w6Schedule.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Schedule | Medications | w6Schedule.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Schedule | Problems | w6Schedule.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Schedule | Allergies | w6Schedule.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Schedule | Imaging | w6Schedule.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Schedule | Surgical history | w6Schedule.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consults | Search chart | w6Consults.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consults | Expand section | w6Consults.chart.includeResolved | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consults | Back | w6Consults.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consults | Encounters | w6Consults.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consults | Notes | w6Consults.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consults | Results | w6Consults.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consults | Medications | w6Consults.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consults | Problems | w6Consults.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consults | Allergies | w6Consults.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consults | Imaging | w6Consults.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consults | Surgical history | w6Consults.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | Medications | w1Rooming.nav.w1MedRec | click / {"button":{"action":{"goto":{"screen":"w1MedRec"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | History / ROS | w1Rooming.nav.w1Hpi | click / {"button":{"action":{"goto":{"screen":"w1Hpi"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | Exam / Assessment & Plan | w1Rooming.nav.w1Exam | click / {"button":{"action":{"goto":{"screen":"w1Exam"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | Orders | w1Rooming.nav.w1Orders | click / {"button":{"action":{"goto":{"screen":"w1Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | Lab Orders | w1Rooming.nav.w1Labs | click / {"button":{"action":{"goto":{"screen":"w1Labs"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | Sign Visit | w1Rooming.nav.w1Close | click / {"button":{"action":{"goto":{"screen":"w1Close"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | Search chart | w1Rooming.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | Expand section | w1Rooming.chart.includeResolved | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | Pain (0–10) | w1Rooming.painScore | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"painScore"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | Mark allergies reviewed | w1Rooming.review.allergyList | click / {"button":{"action":{"markReviewed":{"info":"allergyList"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | View saved record 1 | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | Tobacco use | w1Rooming.tobaccoUse | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"tobaccoUse"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | Fall in the past year? | w1Rooming.fallRiskScreen | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"fallRiskScreen"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | Travel in the past 30 days? | w1Rooming.travelScreen | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"travelScreen"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | Advance directive discussed | w1Rooming.advanceDirectiveAsked | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"advanceDirectiveAsked"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | Interpreter needed? | w1Rooming.interpreterNeeded | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"interpreterNeeded"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | Preferred pharmacy confirmed | w1Rooming.pharmacyConfirmedRooming | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"pharmacyConfirmedRooming"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | PHQ-2 score | w1Rooming.depressionScreen | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"depressionScreen"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | Encounters | w1Rooming.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | Notes | w1Rooming.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | Results | w1Rooming.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | Medications | w1Rooming.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | Problems | w1Rooming.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | Allergies | w1Rooming.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | Imaging | w1Rooming.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | Surgical history | w1Rooming.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | Back | w1Rooming.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w2Inbasket | Search chart | w2Inbasket.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w2Inbasket | Search In Basket | w2Inbasket.basketSearch | enter / {"search":{"scope":"inbasket"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w2Inbasket | Review result | w2Inbasket.openResult | click / {"button":{"action":{"goto":{"screen":"w2Result"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w2Inbasket | Expand section | w2Inbasket.chart.includeResolved | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w2Inbasket | Encounters | w2Inbasket.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w2Inbasket | Notes | w2Inbasket.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w2Inbasket | Results | w2Inbasket.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w2Inbasket | Medications | w2Inbasket.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w2Inbasket | Problems | w2Inbasket.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w2Inbasket | Allergies | w2Inbasket.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w2Inbasket | Imaging | w2Inbasket.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w2Inbasket | Back | w2Inbasket.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Add imaging / procedure order | w6PreOp.newServiceOrder | click / {"button":{"action":"newOrderLine"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Kind: imaging / procedure | w6PreOp.orderKind | enter / {"field":{"slot":"current","prefill":"none","element":"orderKind"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Service code | w6PreOp.orderCode | enter / {"field":{"slot":"current","prefill":"none","element":"orderCode"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Request authorization (human entry) | w6PreOp.priorAuthRequest | enter / {"field":{"slot":"current","prefill":"none","element":"priorAuthRequest"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Request service prior authorization | w6PreOp.requestServicePriorAuth | click / {"button":{"action":"requestPriorAuth"}} / lean | disabled-with-reason | no order on this line |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Search chart | w6PreOp.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Expand section | w6PreOp.chart.includeResolved | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Interval history and physical | w6PreOp.hpUpdate | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"hpUpdate"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Signed consent matches procedure and site | w6PreOp.consentVerified | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"consentVerified"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Medication hold / restart plan | w6PreOp.medsToHold | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"medsToHold"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Back | w6PreOp.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Encounters | w6PreOp.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Notes | w6PreOp.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Results | w6PreOp.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Medications | w6PreOp.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Problems | w6PreOp.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Allergies | w6PreOp.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Imaging | w6PreOp.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Surgical history | w6PreOp.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consult | Search chart | w6Consult.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consult | Expand section | w6Consult.chart.includeResolved | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consult | HPI | w6Consult.hpi | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"hpi"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consult | Review of systems | w6Consult.ros | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"ros"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consult | Physical examination | w6Consult.exam | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"exam"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consult | Assessment and plan | w6Consult.assessmentPlan | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"assessmentPlan"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consult | Diagnosis (ICD-10-CM) | w6Consult.visitDiagnosis | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"visitDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consult | Surgical decision | w6Consult.surgeryDecision | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"surgeryDecision"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consult | Collapse section | w6Consult.homeMeds | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consult | Medication 1: continue / stop / modify | w6Consult.decision0 | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"medRecDecision"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consult | Medication 2: continue / stop / modify | w6Consult.decision1 | enter / {"field":{"slot":{"fixed":{"n":1}},"prefill":"none","element":"medRecDecision"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consult | Back | w6Consult.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consult | Encounters | w6Consult.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consult | Notes | w6Consult.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consult | Results | w6Consult.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consult | Medications | w6Consult.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consult | Problems | w6Consult.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consult | Allergies | w6Consult.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consult | Imaging | w6Consult.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consult | Surgical history | w6Consult.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6ConsultClose | Search chart | w6ConsultClose.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6ConsultClose | Expand section | w6ConsultClose.chart.includeResolved | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6ConsultClose | Billing diagnosis (ICD-10-CM) | w6ConsultClose.claimDiagnosis | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":{"linked":{"element":"visitDiagnosis"}},"element":"claimDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6ConsultClose | Level of service | w6ConsultClose.levelOfService | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"levelOfService"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6ConsultClose | Follow-up | w6ConsultClose.followUp | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"followUp"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6ConsultClose | Instructions / NPO plan | w6ConsultClose.patientInstructions | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"patientInstructions"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6ConsultClose | Sign consult note | w6ConsultClose.commit.signNote | click / {"button":{"action":{"commit":{"commit":"signNote"}}}} / lean | disabled-with-reason | entry required: Chief complaint |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6ConsultClose | Back | w6ConsultClose.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6ConsultClose | Encounters | w6ConsultClose.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6ConsultClose | Notes | w6ConsultClose.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6ConsultClose | Results | w6ConsultClose.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6ConsultClose | Medications | w6ConsultClose.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6ConsultClose | Problems | w6ConsultClose.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6ConsultClose | Allergies | w6ConsultClose.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6ConsultClose | Imaging | w6ConsultClose.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6ConsultClose | Surgical history | w6ConsultClose.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
