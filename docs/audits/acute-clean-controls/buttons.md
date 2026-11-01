# Button audit

Generated 2026-11-01T18:27:54.538Z. Preview build; one Chromium worker.

| Scope | Works | Disabled with reason | Dead | Error |
|---|---:|---:|---:|---:|
| App baseline | 0 | 0 | 0 | 0 |
| App final | 32 | 0 | 0 | 0 |
| Lean final | 2191 | 27 | 0 | 0 |

App coverage includes additional worklist and drawer controls after the baseline. A complete pre-fix Lean census was not retained; see README.md.

Each sampled enabled control is clicked from an observed checkpoint. A changed input echo alone does not certify a Lean search. Selected navigation and reset controls must provide feedback or a disabled reason. Disabled commits are recorded with Lean's actual reason; the audit never fabricates safety evidence to enable a write.

| Route / persona / program | Screen | Label | Comp id | Kind / owner | Status | Observed effect |
|---|---|---|---|---|---|---|
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | In Basket · Results (7) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | In Basket · Rx Requests (21) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Patient search by name or MRN | workspace.search | enter / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Open chart: Schmitt, Alva Greg (MRN 82246729) | workspace.open\|6e0f5788-87f2-4580-a892-95000b823484\|0\|scheduleTasks | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Open chart: Fahey, Andrew (MRN 67424011) | workspace.open\|5b5b7681-19bd-401d-a6e6-e36f5e1eeec6\|8\|scheduleTasks | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Open chart: O'Keefe, Dylan Casey (MRN 94585295) | workspace.open\|6acc67c1-10ee-40d0-a039-f89ab1edb72b\|15\|scheduleTasks | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | Schedule | workspace.activity\|scheduleTasks | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | In Basket · Results (7) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | In Basket · Rx Requests (21) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | Return to Schedule | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | Medications | w1Rooming.nav.w1MedRec | click / {"button":{"action":{"goto":{"screen":"w1MedRec"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | History / ROS | w1Rooming.nav.w1Hpi | click / {"button":{"action":{"goto":{"screen":"w1Hpi"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | Exam / Assessment & Plan | w1Rooming.nav.w1Exam | click / {"button":{"action":{"goto":{"screen":"w1Exam"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | Orders | w1Rooming.nav.w1Orders | click / {"button":{"action":{"goto":{"screen":"w1Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | Lab Orders | w1Rooming.nav.w1Labs | click / {"button":{"action":{"goto":{"screen":"w1Labs"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | Sign Visit | w1Rooming.nav.w1Close | click / {"button":{"action":{"goto":{"screen":"w1Close"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | Search chart | w1Rooming.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | Confirm prefilled value | w1Rooming.weight | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":{"fromRecord":{"fact":"weightToday"}},"element":"weight"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | Pain (0–10) | w1Rooming.painScore | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"painScore"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | Mark allergies reviewed | w1Rooming.review.allergyList | click / {"button":{"action":{"markReviewed":{"info":"allergyList"}}}} / lean | works | Lean state changed; result "ok" |
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
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | Patient workspace | w1Rooming.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Schedule | workspace.activity\|scheduleTasks | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Open chart: Reed, Casey (MRN SH00001814) | workspace.open\|2f3d47c5-8d86-4199-9366-5d886f4954a2\|0\|inBasketResults | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Open chart: Luettgen, Walter Dwight (MRN 63573053) | workspace.open\|5684f55e-93cb-40e7-a1bc-89d433d432e8\|3\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Open chart: Bennett, Riley (MRN SH00002623) | workspace.open\|333ff1c6-9cc3-4afc-a849-e9a755fdfcd4\|6\|inBasketResults | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Open chart: Foster, Rowan (MRN SH00001883) | workspace.open\|f43c4446-1b57-4964-9834-57199b2f3f20\|0\|inBasketMessages | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Open chart: Armstrong, Ronda Kayce (MRN 32681357) | workspace.open\|36f9fa72-8a38-420c-bcca-b3d58286ded8\|1\|inBasketMessages | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Open chart: Foster, Jordan (MRN SH00001811) | workspace.open\|189c9403-03c5-4a08-ab37-f10424413848\|0\|inBasketRxRequests | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Open chart: Zemlak, Victor Lisandra (MRN 37774752) | workspace.open\|7d1d5973-3ca6-41a5-b6f3-27237f986ac1\|10\|inBasketRxRequests | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Open chart: Rippin, Silvia Ardelia (MRN 75726058) | workspace.open\|f8bfe5aa-3e41-4995-a01d-af30e805d36f\|20\|inBasketRxRequests | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Open chart: Batz, Malissa Lin (MRN 22725311) | workspace.open\|44252521-d61a-4c6f-9f95-fdc9ebba3809\|0\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Open chart: Reed, Drew (MRN SH00001772) | workspace.open\|c6762e08-36a3-408a-a662-eca2379af47e\|9\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Open chart: Wolff, Providencia Karena (MRN 93017203) | workspace.open\|9a769021-7983-40bf-b7ed-748f440537dc\|18\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1MedRec | Schedule | workspace.activity\|scheduleTasks | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1MedRec | In Basket · Results (7) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1MedRec | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1MedRec | In Basket · Rx Requests (21) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1MedRec | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1MedRec | Return to Schedule | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1MedRec | Rooming | w1MedRec.nav.w1Rooming | click / {"button":{"action":{"goto":{"screen":"w1Rooming"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1MedRec | Search chart | w1MedRec.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
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
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Hpi | Schedule | workspace.activity\|scheduleTasks | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Hpi | In Basket · Results (7) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Hpi | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Hpi | In Basket · Rx Requests (21) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Hpi | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Hpi | Return to Schedule | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Hpi | Search chart | w1Hpi.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
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
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Exam | Schedule | workspace.activity\|scheduleTasks | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Exam | In Basket · Results (7) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Exam | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Exam | In Basket · Rx Requests (21) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Exam | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Exam | Return to Schedule | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Exam | Search chart | w1Exam.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Exam | Normal exam template | w1Exam.examTemplate | click / {"macro":{"id":"w1ExamTemplate"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Exam | Exam findings | w1Exam.exam | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"exam"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Exam | Encounter diagnosis (ICD-10-CM) | w1Exam.visitDiagnosis | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"visitDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Exam | Problem-based assessment and plan | w1Exam.assessmentPlan | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"assessmentPlan"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Exam | Expand section | w1Exam.problemReview | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Exam | Encounters | w1Exam.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Exam | Notes | w1Exam.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Exam | Results | w1Exam.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Exam | Medications | w1Exam.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Exam | Problems | w1Exam.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Exam | Allergies | w1Exam.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Exam | Imaging | w1Exam.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Exam | Back | w1Exam.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Schedule | workspace.activity\|scheduleTasks | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | In Basket · Results (7) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | In Basket · Rx Requests (21) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Return to Schedule | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Search chart | w1Orders.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Find orders | w1Orders.orderSearch | enter / {"search":{"scope":"formulary"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Collapse section | w1Orders.prefList | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Lisinopril 10 mg daily | w1Orders.prefLisinopril | click / {"macro":{"id":"w1PrefLisinopril"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Atorvastatin 40 mg daily | w1Orders.prefAtorvastatin | click / {"macro":{"id":"w1PrefAtorvastatin"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Metformin 500 mg BID | w1Orders.prefMetformin | click / {"macro":{"id":"w1PrefMetformin"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Amoxicillin 1 g TID × 10 days | w1Orders.prefAmoxicillin | click / {"macro":{"id":"w1PrefAmoxicillin"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Azithromycin 500 mg daily × 5 days | w1Orders.prefAzithromycin | click / {"macro":{"id":"w1PrefAzithromycin"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Ibuprofen 600 mg TID | w1Orders.prefIbuprofen | click / {"macro":{"id":"w1PrefIbuprofen"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Oxycodone 10 mg q6h PRN × 5 days | w1Orders.prefOxycodone | click / {"macro":{"id":"w1PrefOxycodone"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Collapse section | w1Orders.dosing | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Confirm prefilled value | w1Orders.dosingWeight | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":{"linked":{"element":"weight"}},"element":"dosingWeight"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Collapse section | w1Orders.medication | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Enter Medication | w1Orders.drug | enter / {"field":{"slot":"current","prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Antibiotic indication (required for antibiotics) | w1Orders.abxIndication | enter / {"field":{"slot":"current","prefill":"none","element":"abxIndication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Dose unit | w1Orders.doseUnit | enter / {"field":{"slot":"current","prefill":"none","element":"doseUnit"}} / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Route | w1Orders.route | enter / {"field":{"slot":"current","prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Frequency | w1Orders.freq | enter / {"field":{"slot":"current","prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | As needed (PRN) | w1Orders.prn | enter / {"field":{"slot":"current","prefill":"none","element":"prn"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Collapse section | w1Orders.dispense | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Duration | w1Orders.duration | enter / {"field":{"slot":"current","prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Generic substitution allowed | w1Orders.substitution | enter / {"field":{"slot":"current","prefill":"none","element":"substitution"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Collapse section | w1Orders.dx | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Pharmacy | w1Orders.pharmacy | enter / {"field":{"slot":"current","prefill":{"fromRecord":{"fact":"preferredPharmacy"}},"element":"pharmacy"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Associated diagnosis (ICD-10) | w1Orders.orderDiagnosis | enter / {"field":{"slot":"current","prefill":{"linked":{"element":"visitDiagnosis"}},"element":"orderDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Collapse section | w1Orders.controlled | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | CURES not checked: exemption | w1Orders.curesExemptionReason | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"curesExemptionReason"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Naloxone offered | w1Orders.naloxoneOffer | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"naloxoneOffer"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Overdose and naloxone education given | w1Orders.naloxoneEducation | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"naloxoneEducation"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Expand section | w1Orders.more | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Current meds | w1Orders.orderInfo | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | CURES report | w1Orders.orderInfo | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Recent labs | w1Orders.orderInfo | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Request authorization (human entry) | w1Orders.priorAuthRequest | enter / {"field":{"slot":"current","prefill":"none","element":"priorAuthRequest"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Request prior authorization | w1Orders.requestPriorAuth | click / {"button":{"action":"requestPriorAuth"}} / lean | disabled-with-reason | no order on this line |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Accept and add another order | w1Orders.newLine | click / {"button":{"action":"newOrderLine"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Encounters | w1Orders.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Notes | w1Orders.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Results | w1Orders.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Medications | w1Orders.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Problems | w1Orders.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Allergies | w1Orders.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Imaging | w1Orders.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Review and sign | w1Orders.toSign | click / {"button":{"action":{"goto":{"screen":"w1Verify"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Back | w1Orders.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Labs | Schedule | workspace.activity\|scheduleTasks | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Labs | In Basket · Results (7) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Labs | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Labs | In Basket · Rx Requests (21) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Labs | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Labs | Return to Schedule | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Labs | Add imaging / procedure order | w1Labs.newServiceOrder | click / {"button":{"action":"newOrderLine"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Labs | Kind: imaging / procedure | w1Labs.orderKind | enter / {"field":{"slot":"current","prefill":"none","element":"orderKind"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Labs | Service code | w1Labs.orderCode | enter / {"field":{"slot":"current","prefill":"none","element":"orderCode"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Labs | Request authorization (human entry) | w1Labs.priorAuthRequest | enter / {"field":{"slot":"current","prefill":"none","element":"priorAuthRequest"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Labs | Request service prior authorization | w1Labs.requestServicePriorAuth | click / {"button":{"action":"requestPriorAuth"}} / lean | disabled-with-reason | no order on this line |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Labs | Search chart | w1Labs.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Labs | Search lab tests | w1Labs.labSearch | enter / {"search":{"scope":"loinc"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Labs | Test | w1Labs.labTest | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"labTest"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Labs | Diagnosis (ICD-10) | w1Labs.labDiagnosis | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":{"linked":{"element":"visitDiagnosis"}},"element":"labDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Labs | Priority | w1Labs.labPriority | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"labPriority"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Labs | Fasting required | w1Labs.labFasting | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"labFasting"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Labs | Encounters | w1Labs.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Labs | Notes | w1Labs.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Labs | Results | w1Labs.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Labs | Medications | w1Labs.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Labs | Problems | w1Labs.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Labs | Allergies | w1Labs.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Labs | Imaging | w1Labs.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Labs | Back | w1Labs.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Close | Schedule | workspace.activity\|scheduleTasks | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Close | In Basket · Results (7) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Close | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Close | In Basket · Rx Requests (21) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Close | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Close | Return to Schedule | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Close | Search chart | w1Close.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Close | Billing diagnosis (ICD-10-CM) | w1Close.claimDiagnosis | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":{"linked":{"element":"visitDiagnosis"}},"element":"claimDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Close | E/M service level | w1Close.levelOfService | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"levelOfService"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Close | Return in | w1Close.followUp | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"followUp"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Close | Insert instructions | w1Close.avsTemplate | click / {"macro":{"id":"w1AvsTemplate"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Close | After-visit instructions | w1Close.patientInstructions | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"patientInstructions"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Close | Sign Visit | w1Close.commit.signNote | click / {"button":{"action":{"commit":{"commit":"signNote"}}}} / lean | disabled-with-reason | entry required: Chief complaint |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Close | Encounters | w1Close.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Close | Notes | w1Close.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Close | Results | w1Close.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Close | Medications | w1Close.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Close | Problems | w1Close.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Close | Allergies | w1Close.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Close | Imaging | w1Close.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Close | Back | w1Close.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | Expand section | w1Rooming.chart.includeResolved | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Return to Schedule | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Search chart | home.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | In Basket: Results | home.work.w2Inbasket | click / {"button":{"action":{"goto":{"screen":"w2Inbasket"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | In Basket: Rx Requests | home.work.w7Queue | click / {"button":{"action":{"goto":{"screen":"w7Queue"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w2Result | Schedule | workspace.activity\|scheduleTasks | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w2Result | In Basket · Results (7) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w2Result | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w2Result | In Basket · Rx Requests (21) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w2Result | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w2Result | Return to Schedule | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w2Result | Search chart | w2Result.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
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
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w7Review | Schedule | workspace.activity\|scheduleTasks | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w7Review | In Basket · Results (7) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w7Review | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w7Review | In Basket · Rx Requests (21) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w7Review | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w7Review | Return to Schedule | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w7Review | Search chart | w7Review.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
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
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1MedRec | Expand section | w1MedRec.chart.includeResolved | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Exam | Confirm prefilled value | w1Exam.exam | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"exam"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Exam | Confirm prefilled value | w1Exam.assessmentPlan | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"assessmentPlan"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Hpi | Confirm prefilled value | w1Hpi.ros | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"ros"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Hpi | Expand section | w1Hpi.chart.includeResolved | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Exam | Expand section | w1Exam.chart.includeResolved | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Confirm prefilled value | w1Orders.drug | confirm / {"field":{"slot":"current","prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Confirm prefilled value | w1Orders.dose | confirm / {"field":{"slot":"current","prefill":"none","element":"dose"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Confirm prefilled value | w1Orders.doseUnit | confirm / {"field":{"slot":"current","prefill":"none","element":"doseUnit"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Confirm prefilled value | w1Orders.route | confirm / {"field":{"slot":"current","prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Confirm prefilled value | w1Orders.freq | confirm / {"field":{"slot":"current","prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Confirm prefilled value | w1Orders.duration | confirm / {"field":{"slot":"current","prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Confirm prefilled value | w1Orders.quantity | confirm / {"field":{"slot":"current","prefill":"none","element":"quantity"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Confirm prefilled value | w1Orders.refills | confirm / {"field":{"slot":"current","prefill":"none","element":"refills"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Accept and add another order | w1Orders.newLine | click / {"button":{"action":"newOrderLine"}} / lean | disabled-with-reason | finish this order line first |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Orders | Confirm prefilled value | w1Orders.abxIndication | confirm / {"field":{"slot":"current","prefill":"none","element":"abxIndication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3TrackBoard | In Basket · Results (0) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3TrackBoard | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3TrackBoard | In Basket · Rx Requests (0) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3TrackBoard | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3TrackBoard | Patient search by name or MRN | workspace.search | enter / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3TrackBoard | Open chart: Towne, Trinidad (MRN 37888344) | workspace.open\|71b358bb-643e-4264-9943-0540682900b5\|0\|edTrackBoard | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3TrackBoard | Open chart: Abshire, Dorthea (MRN 23215949) | workspace.open\|1a702184-16da-4747-93a9-6e23e9d83689\|52\|edTrackBoard | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3TrackBoard | Open chart: Rogahn, Anisha Lavelle (MRN 12426178) | workspace.open\|62182a24-63f4-4026-9243-f77478d9ee9e\|103\|edTrackBoard | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Track Board | workspace.activity\|edTrackBoard | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | In Basket · Results (0) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | In Basket · Rx Requests (0) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Return to Track Board | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | ED Track Board | w3Triage.nav.w3TrackBoard | click / {"button":{"action":{"goto":{"screen":"w3TrackBoard"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | ED Provider Note | w3Triage.nav.w3Provider | click / {"button":{"action":{"goto":{"screen":"w3Provider"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Orders | w3Triage.nav.w3Orders | click / {"button":{"action":{"goto":{"screen":"w3Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Order sets | w3Triage.nav.w3OrderSets | click / {"button":{"action":{"goto":{"screen":"w3OrderSets"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Disposition | w3Triage.nav.w3Disposition | click / {"button":{"action":{"goto":{"screen":"w3Disposition"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Search chart | w3Triage.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | ESI acuity (1–5) | w3Triage.triageAcuity | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"triageAcuity"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Arrival mode | w3Triage.arrivalMode | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"arrivalMode"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Pain (0–10) | w3Triage.painScore | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"painScore"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Isolation screening | w3Triage.isolationScreen | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"isolationScreen"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Mark allergies reviewed | w3Triage.review.allergyList | click / {"button":{"action":{"markReviewed":{"info":"allergyList"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | View saved record 1 | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Back | w3Triage.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Patient workspace | w3Triage.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Encounters | w3Triage.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Notes | w3Triage.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Results | w3Triage.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Meds | w3Triage.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Problems | w3Triage.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Allergies | w3Triage.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Imaging | w3Triage.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3TrackBoard | Track Board | workspace.activity\|edTrackBoard | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3TrackBoard | Open chart: Gutkowski, Alva (MRN 46914471) | workspace.open\|51db5da1-2f5d-4f8c-aa74-f9993251c6b3\|0\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3TrackBoard | Open chart: Mayert, Arnold Bill (MRN 83398361) | workspace.open\|ed52e04e-9d4d-40d4-84b6-f641fa3cbec0\|1\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3TrackBoard | Open chart: Batz, Malissa Lin (MRN 22725311) | workspace.open\|44252521-d61a-4c6f-9f95-fdc9ebba3809\|0\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3TrackBoard | Open chart: Reed, Drew (MRN SH00001772) | workspace.open\|c6762e08-36a3-408a-a662-eca2379af47e\|9\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3TrackBoard | Open chart: Wolff, Providencia Karena (MRN 93017203) | workspace.open\|9a769021-7983-40bf-b7ed-748f440537dc\|18\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3TrackBoard | Return to Track Board | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3TrackBoard | Triage summary | w3TrackBoard.nav.w3Triage | click / {"button":{"action":{"goto":{"screen":"w3Triage"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3TrackBoard | Search chart | w3TrackBoard.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3TrackBoard | Back | w3TrackBoard.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3TrackBoard | Encounters | w3TrackBoard.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3TrackBoard | Notes | w3TrackBoard.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3TrackBoard | Results | w3TrackBoard.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3TrackBoard | Meds | w3TrackBoard.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3TrackBoard | Problems | w3TrackBoard.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3TrackBoard | Allergies | w3TrackBoard.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3TrackBoard | Imaging | w3TrackBoard.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Provider | Track Board | workspace.activity\|edTrackBoard | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Provider | In Basket · Results (0) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Provider | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Provider | In Basket · Rx Requests (0) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Provider | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Provider | Return to Track Board | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Provider | Search chart | w3Provider.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Provider | History of present illness | w3Provider.hpi | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"hpi"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Provider | Review of systems | w3Provider.ros | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"ros"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Provider | Exam findings | w3Provider.exam | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"exam"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Provider | Differential, ED course and plan | w3Provider.assessmentPlan | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"assessmentPlan"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Provider | Medication reconciliation decision | w3Provider.medRecDecision | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"medRecDecision"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Provider | Encounter diagnosis (linked ICD-10) | w3Provider.claimDiagnosis | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":{"linked":{"element":"visitDiagnosis"}},"element":"claimDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Provider | Level of service | w3Provider.levelOfService | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"levelOfService"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Provider | Sign ED note | w3Provider.commit.signNote | click / {"button":{"action":{"commit":{"commit":"signNote"}}}} / lean | disabled-with-reason | entry required: Chief complaint |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Provider | Back | w3Provider.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Provider | Encounters | w3Provider.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Provider | Notes | w3Provider.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Provider | Results | w3Provider.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Provider | Meds | w3Provider.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Provider | Problems | w3Provider.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Provider | Allergies | w3Provider.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Provider | Imaging | w3Provider.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Track Board | workspace.activity\|edTrackBoard | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | In Basket · Results (0) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | In Basket · Rx Requests (0) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Return to Track Board | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Search chart | w3Orders.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Find orders | w3Orders.orderSearch | enter / {"search":{"scope":"formulary"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Collapse section | w3Orders.prefList | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Acetaminophen 1 g PO | w3Orders.prefAcetaminophen | click / {"macro":{"id":"w3PrefAcetaminophen"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Ibuprofen 600 mg PO | w3Orders.prefIbuprofen | click / {"macro":{"id":"w3PrefIbuprofen"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Ondansetron 8 mg IV | w3Orders.prefOndansetron | click / {"macro":{"id":"w3PrefOndansetron"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Ceftriaxone 2 g IV | w3Orders.prefCeftriaxone | click / {"macro":{"id":"w3PrefCeftriaxone"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Morphine 10 mg IV q4h PRN | w3Orders.prefMorphine | click / {"macro":{"id":"w3PrefMorphine"}} / lean | works | Lean state changed; result "ok" |
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
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Review and sign | w3Orders.toSign | click / {"button":{"action":{"goto":{"screen":"w3Sign"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Back | w3Orders.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Encounters | w3Orders.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Notes | w3Orders.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Results | w3Orders.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Meds | w3Orders.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Problems | w3Orders.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Allergies | w3Orders.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Imaging | w3Orders.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Track Board | workspace.activity\|edTrackBoard | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | In Basket · Results (0) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | In Basket · Rx Requests (0) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Return to Track Board | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Search chart | w3OrderSets.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
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
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Encounters | w3OrderSets.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Notes | w3OrderSets.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Results | w3OrderSets.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Meds | w3OrderSets.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Problems | w3OrderSets.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Allergies | w3OrderSets.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Imaging | w3OrderSets.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Disposition | Track Board | workspace.activity\|edTrackBoard | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Disposition | In Basket · Results (0) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Disposition | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Disposition | In Basket · Rx Requests (0) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Disposition | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Disposition | Return to Track Board | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Disposition | Search chart | w3Disposition.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Disposition | Admit / discharge / transfer / observe / consult | w3Disposition.dispositionChoice | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"dispositionChoice"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Disposition | ED diagnosis (ICD-10) | w3Disposition.visitDiagnosis | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"visitDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Disposition | Condition at disposition | w3Disposition.dispositionCondition | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"dispositionCondition"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Disposition | Admitting service | w3Disposition.admitService | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"admitService"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Disposition | Level of care | w3Disposition.admitLevelOfCare | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"admitLevelOfCare"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Disposition | Expand section | w3Disposition.dischargeGroup | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Disposition | Set disposition | w3Disposition.commit.disposition | click / {"button":{"action":{"commit":{"commit":"disposition"}}}} / lean | disabled-with-reason | entry required: Disposition |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Disposition | Back | w3Disposition.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Disposition | Encounters | w3Disposition.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Disposition | Notes | w3Disposition.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Disposition | Results | w3Disposition.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Disposition | Meds | w3Disposition.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Disposition | Problems | w3Disposition.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Disposition | Allergies | w3Disposition.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Disposition | Imaging | w3Disposition.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3TrackBoard | Back | w3TrackBoard.back | click / {"button":{"action":"back"}} / lean | disabled-with-reason | no previous screen |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | home | Track Board | workspace.activity\|edTrackBoard | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | home | In Basket · Results (0) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | home | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | home | In Basket · Rx Requests (0) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | home | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | home | Return to Track Board | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | home | Search chart | home.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Expand section | w3Triage.chart.includeResolved | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3TrackBoard | Expand section | w3TrackBoard.chart.includeResolved | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Provider | Expand section | w3Provider.chart.includeResolved | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Confirm prefilled value | w3Orders.drug | confirm / {"field":{"slot":"current","prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Confirm prefilled value | w3Orders.dose | confirm / {"field":{"slot":"current","prefill":"none","element":"dose"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Confirm prefilled value | w3Orders.doseUnit | confirm / {"field":{"slot":"current","prefill":"none","element":"doseUnit"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Confirm prefilled value | w3Orders.route | confirm / {"field":{"slot":"current","prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Confirm prefilled value | w3Orders.freq | confirm / {"field":{"slot":"current","prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Confirm prefilled value | w3Orders.duration | confirm / {"field":{"slot":"current","prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Confirm prefilled value | w3Orders.quantity | confirm / {"field":{"slot":"current","prefill":"none","element":"quantity"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Confirm prefilled value | w3Orders.refills | confirm / {"field":{"slot":"current","prefill":"none","element":"refills"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Accept and add another order | w3Orders.newLine | click / {"button":{"action":"newOrderLine"}} / lean | disabled-with-reason | finish this order line first |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Confirm prefilled value | w3Orders.abxIndication | confirm / {"field":{"slot":"current","prefill":"none","element":"abxIndication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | I have reviewed the patient's allergies | w3Orders.allergyReconfirmOrdering | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"allergyReconfirmOrdering"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Mark CURES report reviewed | w3Orders.review.curesReport | click / {"button":{"action":{"markReviewed":{"info":"curesReport"}}}} / lean | works | DOM changed; validation drawer: No versioned source record is available for this review. Refresh the chart or obtain the report before retrying. Your inputs are retained. Close this panel, correct the issue, and retry the action. |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Sign | Track Board | workspace.activity\|edTrackBoard | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Sign | In Basket · Results (0) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Sign | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Sign | In Basket · Rx Requests (0) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Sign | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Sign | Return to Track Board | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Sign | Search chart | w3Sign.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Sign | Collapse section | w3Sign.controlled | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Sign | CURES not checked: exemption | w3Sign.curesExemptionReason | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"curesExemptionReason"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Sign | Naloxone offered | w3Sign.naloxoneOffer | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"naloxoneOffer"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Sign | Overdose and naloxone education given | w3Sign.naloxoneEducation | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"naloxoneEducation"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Sign | Sign orders | w3Sign.commit.signOrders | click / {"button":{"action":{"commit":{"commit":"signOrders"}}}} / lean | disabled-with-reason | Re-enter patient ID (initials / sex / age) to sign |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Sign | Back | w3Sign.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Sign | Encounters | w3Sign.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Sign | Notes | w3Sign.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Sign | Results | w3Sign.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Sign | Meds | w3Sign.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Sign | Problems | w3Sign.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Sign | Allergies | w3Sign.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Sign | Imaging | w3Sign.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Orders | Expand section | w3Orders.chart.includeResolved | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
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
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3OrderSets | Expand section | w3OrderSets.chart.includeResolved | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | home | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | home | In Basket · Results (0) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | home | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | home | In Basket · Rx Requests (0) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | home | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | home | Patient search by name or MRN | workspace.search | enter / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | home | Open chart: Wolff, Providencia Karena (MRN 93017203) | workspace.open\|9a769021-7983-40bf-b7ed-748f440537dc\|0\|shiftWorklist | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · P3 | home | Open chart: Abshire, Dorthea (MRN 23215949) | workspace.open\|1a702184-16da-4747-93a9-6e23e9d83689\|80\|shiftWorklist | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · P3 | home | Open chart: Veum, Allyson Leonila (MRN 46013516) | workspace.open\|d159d2f2-b046-4b53-998b-989862f35812\|160\|shiftWorklist | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Mar | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Mar | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Mar | In Basket · Results (0) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Mar | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Mar | In Basket · Rx Requests (0) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Mar | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Mar | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Mar | Worklist | w4Mar.nav.w4Worklist | click / {"button":{"action":{"goto":{"screen":"w4Worklist"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Mar | Flowsheet | w4Mar.nav.w4Flowsheet | click / {"button":{"action":{"goto":{"screen":"w4Flowsheet"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Mar | Handoff | w4Mar.nav.w4Handoff | click / {"button":{"action":{"goto":{"screen":"w4Handoff"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Mar | Collapse section | w4Mar.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Mar | Open due medication | w4Mar.toolbar.openDue | click / {"button":{"action":{"goto":{"screen":"w4Admin"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Mar | Search chart | w4Mar.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Mar | Back | w4Mar.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Mar | Patient workspace | w4Mar.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Mar | New orders | w4Mar.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Mar | Results | w4Mar.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Mar | Notes | w4Mar.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Mar | Encounters | w4Mar.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Mar | PRN history | w4Mar.marTabs | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Mar | Glucose | w4Mar.marTabs | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Mar | Coagulation labs | w4Mar.marTabs | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | home | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | home | Open chart: Wolff, Providencia Karena (MRN 93017203) | workspace.open\|9a769021-7983-40bf-b7ed-748f440537dc\|0\|unitCensus | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · P3 | home | Open chart: Abshire, Dorthea (MRN 23215949) | workspace.open\|1a702184-16da-4747-93a9-6e23e9d83689\|80\|unitCensus | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · P3 | home | Open chart: Veum, Allyson Leonila (MRN 46013516) | workspace.open\|d159d2f2-b046-4b53-998b-989862f35812\|160\|unitCensus | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · P3 | home | Open chart: Ellis, Casey (MRN SH00002540) | workspace.open\|3600e945-2726-45de-9085-82c51190316c\|0\|inBasketMessages | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · P3 | home | Open chart: Hayes, Cameron (MRN SH00002546) | workspace.open\|f4e37369-8588-4232-8709-73fb5a59166a\|1\|inBasketMessages | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · P3 | home | Open chart: Batz, Malissa Lin (MRN 22725311) | workspace.open\|44252521-d61a-4c6f-9f95-fdc9ebba3809\|0\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · P3 | home | Open chart: Reed, Drew (MRN SH00001772) | workspace.open\|c6762e08-36a3-408a-a662-eca2379af47e\|9\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · P3 | home | Open chart: Wolff, Providencia Karena (MRN 93017203) | workspace.open\|9a769021-7983-40bf-b7ed-748f440537dc\|18\|lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Worklist | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Worklist | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Worklist | In Basket · Results (0) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Worklist | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Worklist | In Basket · Rx Requests (0) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Worklist | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Worklist | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Worklist | MAR | w4Worklist.nav.w4Mar | click / {"button":{"action":{"goto":{"screen":"w4Mar"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Worklist | Collapse section | w4Worklist.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Worklist | Collapse section | w4Worklist.allergyGroup | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Worklist | Mark allergies reviewed (start of shift) | w4Worklist.review.allergyList | click / {"button":{"action":{"markReviewed":{"info":"allergyList"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Worklist | View saved record 1 | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Worklist | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Worklist | Search chart | w4Worklist.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Worklist | Back | w4Worklist.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Worklist | New orders | w4Worklist.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Worklist | Results | w4Worklist.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Worklist | Notes | w4Worklist.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Worklist | Encounters | w4Worklist.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Flowsheet | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Flowsheet | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Flowsheet | In Basket · Results (0) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Flowsheet | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Flowsheet | In Basket · Rx Requests (0) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Flowsheet | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Flowsheet | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Flowsheet | Collapse section | w4Flowsheet.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Flowsheet | Collapse section | w4Flowsheet.vitalsGroup | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Flowsheet | Pain reassessment (0–10) | w4Flowsheet.painReassessment | enter / {"field":{"element":"painReassessment","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Flowsheet | Copy forward last assessment | w4Flowsheet.copyAssessment | click / {"macro":{"id":"w4CopyAssessment"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Flowsheet | File assessment | w4Flowsheet.commit.chartAssessment | click / {"button":{"action":{"commit":{"commit":"chartAssessment"}}}} / lean | disabled-with-reason | entry required: BP systolic (mmHg) |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Flowsheet | Search chart | w4Flowsheet.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Flowsheet | Back | w4Flowsheet.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Flowsheet | Expand section | w4Flowsheet.optionalChart | click / {"group":{"collapsible":true,"startCollapsed":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Handoff | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Handoff | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Handoff | In Basket · Results (0) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Handoff | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Handoff | In Basket · Rx Requests (0) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Handoff | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Handoff | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Handoff | Collapse section | w4Handoff.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Handoff | Search chart | w4Handoff.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Handoff | Back | w4Handoff.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Handoff | New orders | w4Handoff.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Handoff | Results | w4Handoff.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Handoff | Notes | w4Handoff.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Handoff | Encounters | w4Handoff.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Handoff | SBAR template | w4Handoff.template | click / {"macro":{"id":"w4HandoffTemplate"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Admin | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Admin | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Admin | In Basket · Results (0) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Admin | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Admin | In Basket · Rx Requests (0) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Admin | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Admin | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Admin | Collapse section | w4Admin.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Admin | Collapse section | w4Admin.fiveRights | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Admin | Pain score before dose (0–10) | w4Admin.painScore | enter / {"field":{"element":"painScore","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Admin | Collapse section | w4Admin.documentation | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Admin | Given / held / refused | w4Admin.adminStatus | enter / {"field":{"element":"adminStatus","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Admin | Reason / comment | w4Admin.adminReason | enter / {"field":{"element":"adminReason","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Admin | Site | w4Admin.adminSite | enter / {"field":{"element":"adminSite","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Admin | Document held: NPO | w4Admin.heldNpo | click / {"macro":{"id":"w4HeldNpo"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Admin | Administer | w4Admin.commit.administerMed | click / {"button":{"action":{"commit":{"commit":"administerMed"}}}} / lean | disabled-with-reason | entry required: Scan patient wristband |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Admin | Search chart | w4Admin.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Admin | Back | w4Admin.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Admin | Expand section | w4Admin.optionalChart | click / {"group":{"collapsible":true,"startCollapsed":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | home | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | home | Collapse section | home.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | home | Search chart | home.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | home | Problem list | home.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | home | Results | home.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | home | Notes | home.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | home | Medications | home.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | home | Allergies | home.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | home | Encounters | home.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | home | Coverage | home.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | home | Clinic visit: start rooming | home.work.w1Rooming | click / {"button":{"action":{"goto":{"screen":"w1Rooming"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | home | In-basket: results | home.work.w2Inbasket | click / {"button":{"action":{"goto":{"screen":"w2Inbasket"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | home | In-basket: refill requests | home.work.w7Queue | click / {"button":{"action":{"goto":{"screen":"w7Queue"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | home | Emergency department: track board | home.work.w3TrackBoard | click / {"button":{"action":{"goto":{"screen":"w3TrackBoard"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | home | Pediatric clinic: start rooming | home.work.w5Rooming | click / {"button":{"action":{"goto":{"screen":"w5Rooming"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | home | Surgery: ED consult | home.work.w6Consult | click / {"button":{"action":{"goto":{"screen":"w6Consult"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | home | Surgery: pre-op | home.work.w6PreOp | click / {"button":{"action":{"goto":{"screen":"w6PreOp"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | home | Surgery: op note | home.work.w6OpNote | click / {"button":{"action":{"goto":{"screen":"w6OpNote"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | home | Surgery: post-op orders | home.work.w6PostOp | click / {"button":{"action":{"goto":{"screen":"w6PostOp"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | home | Surgery: rounding | home.work.w6Rounding | click / {"button":{"action":{"goto":{"screen":"w6Rounding"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | home | Surgery: discharge | home.work.w6Discharge | click / {"button":{"action":{"goto":{"screen":"w6Discharge"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w1Rooming | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w1Rooming | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w1Rooming | In Basket · Results (0) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w1Rooming | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w1Rooming | In Basket · Rx Requests (0) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w1Rooming | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w1Rooming | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w1Rooming | Med rec | w1Rooming.nav.w1MedRec | click / {"button":{"action":{"goto":{"screen":"w1MedRec"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w1Rooming | HPI / ROS | w1Rooming.nav.w1Hpi | click / {"button":{"action":{"goto":{"screen":"w1Hpi"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w1Rooming | Exam / A&P | w1Rooming.nav.w1Exam | click / {"button":{"action":{"goto":{"screen":"w1Exam"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w1Rooming | Orders | w1Rooming.nav.w1Orders | click / {"button":{"action":{"goto":{"screen":"w1Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w1Rooming | Labs | w1Rooming.nav.w1Labs | click / {"button":{"action":{"goto":{"screen":"w1Labs"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w1Rooming | Visit close | w1Rooming.nav.w1Close | click / {"button":{"action":{"goto":{"screen":"w1Close"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w1Rooming | Collapse section | w1Rooming.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w1Rooming | Search chart | w1Rooming.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w1Rooming | Back | w1Rooming.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w1Rooming | Results | w1Rooming.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w1Rooming | Imaging | w1Rooming.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w1Rooming | Notes | w1Rooming.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w1Rooming | Encounters | w1Rooming.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w1Rooming | Social history | w1Rooming.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w1Rooming | Family history | w1Rooming.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w1Rooming | Care gaps | w1Rooming.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w1Rooming | Immunizations | w1Rooming.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w1Rooming | Coverage | w1Rooming.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w1Rooming | Collapse section | w1Rooming.vitalsGroup | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w1Rooming | Pain (0–10) | w1Rooming.painScore | enter / {"field":{"element":"painScore","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w1Rooming | Collapse section | w1Rooming.intake | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w1Rooming | Tobacco use | w1Rooming.tobaccoUse | enter / {"field":{"element":"tobaccoUse","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w1Rooming | Fall in the past year? | w1Rooming.fallRiskScreen | enter / {"field":{"element":"fallRiskScreen","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w1Rooming | Travel in the past 30 days? | w1Rooming.travelScreen | enter / {"field":{"element":"travelScreen","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w1Rooming | Advance directive discussed | w1Rooming.advanceDirectiveAsked | enter / {"field":{"element":"advanceDirectiveAsked","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w1Rooming | Interpreter needed? | w1Rooming.interpreterNeeded | enter / {"field":{"element":"interpreterNeeded","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w1Rooming | Preferred pharmacy confirmed | w1Rooming.pharmacyConfirmedRooming | enter / {"field":{"element":"pharmacyConfirmedRooming","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w1Rooming | Collapse section | w1Rooming.phq | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w1Rooming | PHQ-2 score | w1Rooming.depressionScreen | enter / {"field":{"element":"depressionScreen","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w1Rooming | Collapse section | w1Rooming.allergyGroup | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w1Rooming | Mark allergies reviewed | w1Rooming.review.allergyList | click / {"button":{"action":{"markReviewed":{"info":"allergyList"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons&inspect=1 · P3 · P3 | w1Rooming | View saved record 1 | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · P3 | w1Rooming | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Flowsheet | Confirm prefilled value | w4Flowsheet.nursingAssessment | confirm / {"field":{"element":"nursingAssessment","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Flowsheet | New orders | w4Flowsheet.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Flowsheet | Results | w4Flowsheet.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Flowsheet | Notes | w4Flowsheet.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Flowsheet | Encounters | w4Flowsheet.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Handoff | Confirm prefilled value | w4Handoff.handoffSituation | confirm / {"field":{"element":"handoffSituation","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Handoff | Confirm prefilled value | w4Handoff.handoffBackground | confirm / {"field":{"element":"handoffBackground","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Handoff | Confirm prefilled value | w4Handoff.handoffAssessment | confirm / {"field":{"element":"handoffAssessment","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Handoff | Confirm prefilled value | w4Handoff.handoffRecommendation | confirm / {"field":{"element":"handoffRecommendation","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Admin | Confirm prefilled value | w4Admin.adminStatus | confirm / {"field":{"element":"adminStatus","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Admin | Confirm prefilled value | w4Admin.adminReason | confirm / {"field":{"element":"adminReason","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Admin | New orders | w4Admin.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Admin | Results | w4Admin.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Admin | Notes | w4Admin.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w4Admin | Encounters | w4Admin.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w2Inbasket | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w2Inbasket | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w2Inbasket | In Basket · Results (0) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w2Inbasket | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w2Inbasket | In Basket · Rx Requests (0) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w2Inbasket | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w2Inbasket | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w2Inbasket | Result | w2Inbasket.nav.w2Result | click / {"button":{"action":{"goto":{"screen":"w2Result"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w2Inbasket | Message patient | w2Inbasket.nav.w2Message | click / {"button":{"action":{"goto":{"screen":"w2Message"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w2Inbasket | Collapse section | w2Inbasket.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w2Inbasket | Search chart | w2Inbasket.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w2Inbasket | Back | w2Inbasket.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w2Inbasket | All results | w2Inbasket.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w2Inbasket | Notes | w2Inbasket.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w2Inbasket | Encounters | w2Inbasket.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w2Inbasket | Imaging | w2Inbasket.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w2Inbasket | Search in-basket | w2Inbasket.basketSearch | enter / {"search":{"scope":"inbasket"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w7Queue | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w7Queue | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w7Queue | In Basket · Results (0) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w7Queue | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w7Queue | In Basket · Rx Requests (0) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w7Queue | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w7Queue | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w7Queue | Chart review | w7Queue.nav.w7Review | click / {"button":{"action":{"goto":{"screen":"w7Review"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w7Queue | Collapse section | w7Queue.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w7Queue | Search chart | w7Queue.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w7Queue | Back | w7Queue.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w7Queue | Encounters | w7Queue.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w7Queue | Imaging | w7Queue.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w7Queue | Care gaps | w7Queue.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w3TrackBoard | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w3TrackBoard | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w3TrackBoard | In Basket · Results (0) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w3TrackBoard | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w3TrackBoard | In Basket · Rx Requests (0) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w3TrackBoard | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w3TrackBoard | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w3TrackBoard | Triage | w3TrackBoard.nav.w3Triage | click / {"button":{"action":{"goto":{"screen":"w3Triage"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w3TrackBoard | Provider note | w3TrackBoard.nav.w3Provider | click / {"button":{"action":{"goto":{"screen":"w3Provider"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w3TrackBoard | Order sets | w3TrackBoard.nav.w3OrderSets | click / {"button":{"action":{"goto":{"screen":"w3OrderSets"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w3TrackBoard | Orders | w3TrackBoard.nav.w3Orders | click / {"button":{"action":{"goto":{"screen":"w3Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w3TrackBoard | Disposition | w3TrackBoard.nav.w3Disposition | click / {"button":{"action":{"goto":{"screen":"w3Disposition"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w3TrackBoard | Collapse section | w3TrackBoard.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w3TrackBoard | Search chart | w3TrackBoard.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w3TrackBoard | Back | w3TrackBoard.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w3TrackBoard | Results | w3TrackBoard.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w3TrackBoard | Imaging | w3TrackBoard.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w3TrackBoard | Notes | w3TrackBoard.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w3TrackBoard | Encounters | w3TrackBoard.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w5Rooming | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w5Rooming | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w5Rooming | In Basket · Results (0) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w5Rooming | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w5Rooming | In Basket · Rx Requests (0) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w5Rooming | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w5Rooming | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w5Rooming | Growth | w5Rooming.nav.w5Growth | click / {"button":{"action":{"goto":{"screen":"w5Growth"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w5Rooming | Orders | w5Rooming.nav.w5Orders | click / {"button":{"action":{"goto":{"screen":"w5Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w5Rooming | Immunizations | w5Rooming.nav.w5Immunizations | click / {"button":{"action":{"goto":{"screen":"w5Immunizations"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w5Rooming | Visit close | w5Rooming.nav.w5Close | click / {"button":{"action":{"goto":{"screen":"w5Close"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w5Rooming | Collapse section | w5Rooming.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w5Rooming | Search chart | w5Rooming.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w5Rooming | Back | w5Rooming.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w5Rooming | Growth chart | w5Rooming.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w5Rooming | Immunizations | w5Rooming.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w5Rooming | Results | w5Rooming.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w5Rooming | Notes | w5Rooming.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w5Rooming | Family history | w5Rooming.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w5Rooming | Care gaps | w5Rooming.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w5Rooming | Collapse section | w5Rooming.measures | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w5Rooming | Collapse section | w5Rooming.allergyGroup | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w5Rooming | Mark allergies reviewed | w5Rooming.review.allergyList | click / {"button":{"action":{"markReviewed":{"info":"allergyList"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons&inspect=1 · P3 · P3 | w5Rooming | View saved record 1 | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · P3 | w5Rooming | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · P3 | w5Rooming | Collapse section | w5Rooming.medRec | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w5Rooming | Medication 1: continue / stop / modify | w5Rooming.decision0 | enter / {"field":{"element":"medRecDecision","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w5Rooming | Medication 2: continue / stop / modify | w5Rooming.decision1 | enter / {"field":{"element":"medRecDecision","slot":{"fixed":{"n":1}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6Consult | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6Consult | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6Consult | In Basket · Results (0) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6Consult | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6Consult | In Basket · Rx Requests (0) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6Consult | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6Consult | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6Consult | Consult close | w6Consult.nav.w6ConsultClose | click / {"button":{"action":{"goto":{"screen":"w6ConsultClose"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6Consult | Orders | w6Consult.nav.w6Orders | click / {"button":{"action":{"goto":{"screen":"w6Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6Consult | Collapse section | w6Consult.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6Consult | Search chart | w6Consult.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6Consult | Back | w6Consult.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6Consult | Imaging | w6Consult.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6Consult | Results | w6Consult.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6Consult | Notes | w6Consult.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6Consult | Surgical history | w6Consult.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6Consult | Encounters | w6Consult.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6Consult | Collapse section | w6Consult.homeMeds | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6Consult | Medication 1: continue / stop / modify | w6Consult.decision0 | enter / {"field":{"element":"medRecDecision","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6Consult | Medication 2: continue / stop / modify | w6Consult.decision1 | enter / {"field":{"element":"medRecDecision","slot":{"fixed":{"n":1}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6PreOp | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6PreOp | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6PreOp | In Basket · Results (0) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6PreOp | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6PreOp | In Basket · Rx Requests (0) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6PreOp | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6PreOp | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6PreOp | Collapse section | w6PreOp.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6PreOp | Search chart | w6PreOp.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6PreOp | Back | w6PreOp.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6PreOp | Imaging | w6PreOp.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6PreOp | Results | w6PreOp.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6PreOp | Notes | w6PreOp.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6PreOp | Surgical history | w6PreOp.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6PreOp | Encounters | w6PreOp.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6OpNote | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6OpNote | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6OpNote | In Basket · Results (0) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6OpNote | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6OpNote | In Basket · Rx Requests (0) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6OpNote | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6OpNote | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6OpNote | Collapse section | w6OpNote.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6OpNote | Search chart | w6OpNote.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6OpNote | Back | w6OpNote.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6OpNote | Imaging | w6OpNote.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6OpNote | Results | w6OpNote.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6OpNote | Notes | w6OpNote.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6OpNote | Surgical history | w6OpNote.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6OpNote | Encounters | w6OpNote.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · P3 | w6OpNote | Collapse section | w6OpNote.note | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | In Basket · Results (2) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | In Basket · Rx Requests (2) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Patient search by name or MRN | workspace.search | enter / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Open chart: Denesik, Edwardo Pablo (MRN 27834798) | workspace.open\|b249cda6-abaf-4706-9107-c9141d554ea5\|0\|scheduleTasks | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Open chart: Pfeffer, Thanh Michael (MRN 36792169) | workspace.open\|80b7272b-1686-4773-8535-162b27e9f8c2\|9\|scheduleTasks | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Open chart: Lehner, Zachariah Dylan (MRN 14483567) | workspace.open\|4caea025-0a31-4289-a339-d3996b506e3b\|17\|scheduleTasks | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Rooming | Schedule | workspace.activity\|scheduleTasks | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Rooming | In Basket · Results (2) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Rooming | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Rooming | In Basket · Rx Requests (2) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Rooming | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Rooming | Return to Schedule | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Rooming | Growth Charts | w5Rooming.nav.w5Growth | click / {"button":{"action":{"goto":{"screen":"w5Growth"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Rooming | Visit Note | w5Rooming.nav.w5Note | click / {"button":{"action":{"goto":{"screen":"w5Note"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Rooming | Orders | w5Rooming.nav.w5Orders | click / {"button":{"action":{"goto":{"screen":"w5Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Rooming | Immunizations | w5Rooming.nav.w5Immunizations | click / {"button":{"action":{"goto":{"screen":"w5Immunizations"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Rooming | Sign Visit | w5Rooming.nav.w5Close | click / {"button":{"action":{"goto":{"screen":"w5Close"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Rooming | Search chart | w5Rooming.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
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
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Rooming | Patient workspace | w5Rooming.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Schedule | workspace.activity\|scheduleTasks | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Open chart: Brooks, Jamie (MRN SH00002880) | workspace.open\|6f16eaeb-4926-4c0d-8fa7-6edf1d0911ad\|0\|inBasketResults | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Open chart: Shaw, Robin (MRN SH00002388) | workspace.open\|5a7c8894-e131-4810-ab3b-65be83c97f8b\|1\|inBasketResults | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Open chart: Patel, Drew (MRN SH00002503) | workspace.open\|ad3ba796-3910-4e99-94e4-9de9e425e696\|0\|inBasketMessages | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Open chart: Lynch, Shirely Lashaun (MRN 53254234) | workspace.open\|d34669aa-e717-4b1b-bb98-59c0d1b157ec\|1\|inBasketMessages | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Open chart: Ellis, Morgan (MRN SH00002426) | workspace.open\|e7b92576-d3d2-4d8d-91e9-cb610ca1564e\|0\|inBasketRxRequests | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Open chart: Cortés, Claudio Luis Miguel (MRN 87776036) | workspace.open\|7abbfc20-6e29-430c-a5a7-67984aea5257\|1\|inBasketRxRequests | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Open chart: Batz, Malissa Lin (MRN 22725311) | workspace.open\|44252521-d61a-4c6f-9f95-fdc9ebba3809\|0\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Open chart: Reed, Drew (MRN SH00001772) | workspace.open\|c6762e08-36a3-408a-a662-eca2379af47e\|9\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Open chart: Wolff, Providencia Karena (MRN 93017203) | workspace.open\|9a769021-7983-40bf-b7ed-748f440537dc\|18\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Growth | Schedule | workspace.activity\|scheduleTasks | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Growth | In Basket · Results (2) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Growth | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Growth | In Basket · Rx Requests (2) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Growth | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Growth | Return to Schedule | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Growth | Rooming | w5Growth.nav.w5Rooming | click / {"button":{"action":{"goto":{"screen":"w5Rooming"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Growth | Search chart | w5Growth.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Growth | Encounters | w5Growth.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Growth | Notes | w5Growth.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Growth | Results | w5Growth.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Growth | Medications | w5Growth.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Growth | Problems | w5Growth.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Growth | Allergies | w5Growth.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Growth | Imaging | w5Growth.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Growth | Immunizations | w5Growth.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Growth | Back | w5Growth.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Note | Schedule | workspace.activity\|scheduleTasks | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Note | In Basket · Results (2) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Note | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Note | In Basket · Rx Requests (2) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Note | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Note | Return to Schedule | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Note | Search chart | w5Note.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
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
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Schedule | workspace.activity\|scheduleTasks | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | In Basket · Results (2) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | In Basket · Rx Requests (2) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Return to Schedule | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Search chart | w5Orders.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Find orders | w5Orders.orderSearch | enter / {"search":{"scope":"formulary"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Collapse section | w5Orders.prefList | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Amoxicillin 45 mg/kg/dose BID × 10 days | w5Orders.prefAmoxicillin | click / {"macro":{"id":"w5PrefAmoxicillin"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Ibuprofen 10 mg/kg q6h PRN | w5Orders.prefIbuprofen | click / {"macro":{"id":"w5PrefIbuprofen"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Acetaminophen 15 mg/kg q6h PRN | w5Orders.prefAcetaminophen | click / {"macro":{"id":"w5PrefAcetaminophen"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Azithromycin 10 mg/kg daily × 3 days | w5Orders.prefAzithromycin | click / {"macro":{"id":"w5PrefAzithromycin"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Albuterol 0.1 mg/kg q4h PRN | w5Orders.prefAlbuterol | click / {"macro":{"id":"w5PrefAlbuterol"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Collapse section | w5Orders.dosing | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Collapse section | w5Orders.medication | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Enter Medication | w5Orders.drug | enter / {"field":{"slot":"current","prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Antibiotic indication (required for antibiotics) | w5Orders.abxIndication | enter / {"field":{"slot":"current","prefill":"none","element":"abxIndication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Dose unit | w5Orders.doseUnit | enter / {"field":{"slot":"current","prefill":"none","element":"doseUnit"}} / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Route | w5Orders.route | enter / {"field":{"slot":"current","prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Frequency | w5Orders.freq | enter / {"field":{"slot":"current","prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | As needed (PRN) | w5Orders.prn | enter / {"field":{"slot":"current","prefill":"none","element":"prn"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Collapse section | w5Orders.dispense | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Duration | w5Orders.duration | enter / {"field":{"slot":"current","prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Generic substitution allowed | w5Orders.substitution | enter / {"field":{"slot":"current","prefill":"none","element":"substitution"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Collapse section | w5Orders.dx | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Pharmacy | w5Orders.pharmacy | enter / {"field":{"slot":"current","prefill":{"fromRecord":{"fact":"preferredPharmacy"}},"element":"pharmacy"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Associated diagnosis (ICD-10) | w5Orders.orderDiagnosis | enter / {"field":{"slot":"current","prefill":{"linked":{"element":"visitDiagnosis"}},"element":"orderDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Collapse section | w5Orders.controlled | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | CURES not checked: exemption | w5Orders.curesExemptionReason | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"curesExemptionReason"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Naloxone offered | w5Orders.naloxoneOffer | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"naloxoneOffer"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Overdose and naloxone education given | w5Orders.naloxoneEducation | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"naloxoneEducation"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Expand section | w5Orders.more | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Current meds | w5Orders.orderInfo | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | CURES report | w5Orders.orderInfo | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Recent labs | w5Orders.orderInfo | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Request authorization (human entry) | w5Orders.priorAuthRequest | enter / {"field":{"slot":"current","prefill":"none","element":"priorAuthRequest"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Request prior authorization | w5Orders.requestPriorAuth | click / {"button":{"action":"requestPriorAuth"}} / lean | disabled-with-reason | no order on this line |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Accept and add another order | w5Orders.newLine | click / {"button":{"action":"newOrderLine"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Encounters | w5Orders.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Notes | w5Orders.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Results | w5Orders.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Medications | w5Orders.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Problems | w5Orders.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Allergies | w5Orders.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Imaging | w5Orders.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Immunizations | w5Orders.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Review and sign | w5Orders.toSign | click / {"button":{"action":{"goto":{"screen":"w5Sign"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Back | w5Orders.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Immunizations | Schedule | workspace.activity\|scheduleTasks | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Immunizations | In Basket · Results (2) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Immunizations | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Immunizations | In Basket · Rx Requests (2) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Immunizations | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Immunizations | Return to Schedule | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Immunizations | Search chart | w5Immunizations.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Immunizations | Influenza vaccine (from inventory) | w5Immunizations.fluVaccine | click / {"macro":{"id":"w5FluVaccine"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Immunizations | Vaccine | w5Immunizations.vaccine | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"vaccine"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Immunizations | Site | w5Immunizations.vaccineSite | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"vaccineSite"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Immunizations | Route | w5Immunizations.vaccineRoute | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"vaccineRoute"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Immunizations | VIS given to patient / guardian before vaccination | w5Immunizations.visGiven | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"visGiven"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Immunizations | Record immunization | w5Immunizations.commit.recordImmunization | click / {"button":{"action":{"commit":{"commit":"recordImmunization"}}}} / lean | disabled-with-reason | entry required: Vaccine |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Immunizations | Encounters | w5Immunizations.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Immunizations | Notes | w5Immunizations.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Immunizations | Results | w5Immunizations.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Immunizations | Medications | w5Immunizations.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Immunizations | Problems | w5Immunizations.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Immunizations | Allergies | w5Immunizations.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Immunizations | Imaging | w5Immunizations.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Immunizations | Immunizations | w5Immunizations.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Immunizations | Back | w5Immunizations.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Close | Schedule | workspace.activity\|scheduleTasks | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Close | In Basket · Results (2) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Close | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Close | In Basket · Rx Requests (2) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Close | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Close | Return to Schedule | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Close | Search chart | w5Close.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Close | Billing diagnosis (ICD-10-CM) | w5Close.claimDiagnosis | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":{"linked":{"element":"visitDiagnosis"}},"element":"claimDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Close | E/M service level | w5Close.levelOfService | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"levelOfService"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Close | Return in | w5Close.followUp | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"followUp"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Close | Instructions for patient / family | w5Close.patientInstructions | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"patientInstructions"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Close | Sign Visit | w5Close.commit.signNote | click / {"button":{"action":{"commit":{"commit":"signNote"}}}} / lean | disabled-with-reason | entry required: Chief complaint |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Close | Encounters | w5Close.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Close | Notes | w5Close.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Close | Results | w5Close.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Close | Medications | w5Close.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Close | Problems | w5Close.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Close | Allergies | w5Close.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Close | Imaging | w5Close.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Close | Immunizations | w5Close.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Close | Back | w5Close.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Rooming | Expand section | w5Rooming.chart.includeResolved | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Return to Schedule | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Search chart | home.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | In Basket: Results | home.work.w2Inbasket | click / {"button":{"action":{"goto":{"screen":"w2Inbasket"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | In Basket: Rx Requests | home.work.w7Queue | click / {"button":{"action":{"goto":{"screen":"w7Queue"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w2Result | Schedule | workspace.activity\|scheduleTasks | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w2Result | In Basket · Results (2) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w2Result | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w2Result | In Basket · Rx Requests (2) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w2Result | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w2Result | Return to Schedule | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w2Result | Search chart | w2Result.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
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
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w7Review | Schedule | workspace.activity\|scheduleTasks | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w7Review | In Basket · Results (2) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w7Review | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w7Review | In Basket · Rx Requests (2) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w7Review | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w7Review | Return to Schedule | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w7Review | Search chart | w7Review.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
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
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Growth | Expand section | w5Growth.chart.includeResolved | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Note | Confirm prefilled value | w5Note.hpi | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"hpi"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Note | Confirm prefilled value | w5Note.ros | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"ros"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Note | Confirm prefilled value | w5Note.exam | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"exam"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Note | Confirm prefilled value | w5Note.anticipatoryGuidance | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"anticipatoryGuidance"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Note | Expand section | w5Note.chart.includeResolved | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Confirm prefilled value | w5Orders.doseMgPerKg | confirm / {"field":{"slot":"current","prefill":"none","element":"doseMgPerKg"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Confirm prefilled value | w5Orders.drug | confirm / {"field":{"slot":"current","prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Confirm prefilled value | w5Orders.abxIndication | confirm / {"field":{"slot":"current","prefill":"none","element":"abxIndication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Confirm prefilled value | w5Orders.doseUnit | confirm / {"field":{"slot":"current","prefill":"none","element":"doseUnit"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Confirm prefilled value | w5Orders.route | confirm / {"field":{"slot":"current","prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Confirm prefilled value | w5Orders.freq | confirm / {"field":{"slot":"current","prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Confirm prefilled value | w5Orders.duration | confirm / {"field":{"slot":"current","prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Confirm prefilled value | w5Orders.quantity | confirm / {"field":{"slot":"current","prefill":"none","element":"quantity"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Confirm prefilled value | w5Orders.refills | confirm / {"field":{"slot":"current","prefill":"none","element":"refills"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Accept and add another order | w5Orders.newLine | click / {"button":{"action":"newOrderLine"}} / lean | disabled-with-reason | finish this order line first |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | I have reviewed the patient's allergies | w5Orders.allergyReconfirmOrdering | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"allergyReconfirmOrdering"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Mark CURES report reviewed | w5Orders.review.curesReport | click / {"button":{"action":{"markReviewed":{"info":"curesReport"}}}} / lean | works | DOM changed; validation drawer: No versioned source record is available for this review. Refresh the chart or obtain the report before retrying. Your inputs are retained. Close this panel, correct the issue, and retry the action. |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Orders | Expand section | w5Orders.chart.includeResolved | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Schedule | workspace.activity\|scheduleTasks | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Consults | workspace.activity\|consultList | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | In Basket · Results (2) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | In Basket · Rx Requests (2) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Patient search by name or MRN | workspace.search | enter / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Mitchell, Destiny Wendolyn (MRN 38529840) | workspace.open\|edf07476-05b3-4fff-8e03-a95af2f67f69\|0\|orSchedule | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Grimes, Yuette Bethany (MRN 52168180) | workspace.open\|dc903e54-fa8f-4cb5-aca8-dfc730fefe18\|4\|orSchedule | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Eichmann, Teresita Soledad (MRN 74920675) | workspace.open\|7c9c111d-59b7-493a-a0cd-ad267ab9265f\|8\|orSchedule | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Schedule | workspace.activity\|scheduleTasks | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | OR Schedule | workspace.activity\|orSchedule | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Consults | workspace.activity\|consultList | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | In Basket · Results (2) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | In Basket · Rx Requests (2) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Return to OR Schedule | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Case list | w6PreOp.nav.w6Schedule | click / {"button":{"action":{"goto":{"screen":"w6Schedule"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Consult list | w6PreOp.nav.w6Consults | click / {"button":{"action":{"goto":{"screen":"w6Consults"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Consult note | w6PreOp.nav.w6Consult | click / {"button":{"action":{"goto":{"screen":"w6Consult"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Sign Consult | w6PreOp.nav.w6ConsultClose | click / {"button":{"action":{"goto":{"screen":"w6ConsultClose"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Preprocedure | w6PreOp.nav.w6PreOp | click / {"button":{"action":{"goto":{"screen":"w6PreOp"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Orders | w6PreOp.nav.w6Orders | click / {"button":{"action":{"goto":{"screen":"w6Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Sign Orders | w6PreOp.nav.w6Sign | click / {"button":{"action":{"goto":{"screen":"w6Sign"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Brief Op Note | w6PreOp.nav.w6OpNote | click / {"button":{"action":{"goto":{"screen":"w6OpNote"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Postprocedure Orders | w6PreOp.nav.w6PostOp | click / {"button":{"action":{"goto":{"screen":"w6PostOp"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Rounding | w6PreOp.nav.w6Rounding | click / {"button":{"action":{"goto":{"screen":"w6Rounding"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Discharge | w6PreOp.nav.w6Discharge | click / {"button":{"action":{"goto":{"screen":"w6Discharge"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Add imaging / procedure order | w6PreOp.newServiceOrder | click / {"button":{"action":"newOrderLine"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Kind: imaging / procedure | w6PreOp.orderKind | enter / {"field":{"slot":"current","prefill":"none","element":"orderKind"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Service code | w6PreOp.orderCode | enter / {"field":{"slot":"current","prefill":"none","element":"orderCode"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Request authorization (human entry) | w6PreOp.priorAuthRequest | enter / {"field":{"slot":"current","prefill":"none","element":"priorAuthRequest"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Request service prior authorization | w6PreOp.requestServicePriorAuth | click / {"button":{"action":"requestPriorAuth"}} / lean | disabled-with-reason | no order on this line |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Search chart | w6PreOp.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Interval history and physical | w6PreOp.hpUpdate | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"hpUpdate"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Signed consent matches procedure and site | w6PreOp.consentVerified | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"consentVerified"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Medication hold / restart plan | w6PreOp.medsToHold | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"medsToHold"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Back | w6PreOp.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Patient workspace | w6PreOp.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Encounters | w6PreOp.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Notes | w6PreOp.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Results | w6PreOp.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Medications | w6PreOp.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Problems | w6PreOp.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Allergies | w6PreOp.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Imaging | w6PreOp.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Surgical history | w6PreOp.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | OR Schedule | workspace.activity\|orSchedule | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Hickle, Manual Rodney (MRN 33984677) | workspace.open\|14a8a6f3-69eb-46aa-b1b0-13b8b094ab38\|0\|scheduleTasks | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Bartoletti, Drew Tracee (MRN 94690711) | workspace.open\|d0fb573d-4457-4240-b50d-2fed7514f7a5\|7\|scheduleTasks | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Schiller, Ahmad Fredrick (MRN 87733192) | workspace.open\|db4fd161-9488-413d-bb6b-ef28e807ce12\|14\|scheduleTasks | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Wolff, Providencia Karena (MRN 93017203) | workspace.open\|9a769021-7983-40bf-b7ed-748f440537dc\|0\|shiftWorklist | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Runte, Sol Jerrold (MRN 84974903) | workspace.open\|404d684b-5c15-4118-95b9-883161c1d288\|1\|shiftWorklist | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Wolff, Providencia Karena (MRN 93017203) | workspace.open\|9a769021-7983-40bf-b7ed-748f440537dc\|0\|unitCensus | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Runte, Sol Jerrold (MRN 84974903) | workspace.open\|404d684b-5c15-4118-95b9-883161c1d288\|1\|unitCensus | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Wolff, Providencia Karena (MRN 93017203) | workspace.open\|9a769021-7983-40bf-b7ed-748f440537dc\|0\|consultList | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Barton, Tracie (MRN 69683126) | workspace.open\|72983851-0373-452e-88f8-8c451972ce91\|2\|consultList | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Wolff, Providencia Karena (MRN 93017203) | workspace.open\|9a769021-7983-40bf-b7ed-748f440537dc\|3\|consultList | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Park, Quinn (MRN SH00002856) | workspace.open\|355b8940-8946-4125-a9ae-41c874e406bd\|0\|inBasketResults | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Bennett, Jamie (MRN SH00002271) | workspace.open\|ef0a8fe3-c6b1-44db-a0a0-7e33fc50af7c\|1\|inBasketResults | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Reed, Jamie (MRN SH00002075) | workspace.open\|c13711d9-b136-42ad-8ee4-be22508a28d6\|0\|inBasketMessages | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Hayes, Morgan (MRN SH00002853) | workspace.open\|7e02db69-d592-4792-9170-7535c8c348ec\|1\|inBasketMessages | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Hayes, Reese (MRN SH00001962) | workspace.open\|b5d3f9ed-b640-4f34-b389-d424dfe5896f\|0\|inBasketRxRequests | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Brooks, Sage (MRN SH00002676) | workspace.open\|cc38f87a-504b-403c-b168-c64a09e8a4b4\|1\|inBasketRxRequests | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Batz, Malissa Lin (MRN 22725311) | workspace.open\|44252521-d61a-4c6f-9f95-fdc9ebba3809\|0\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Reed, Drew (MRN SH00001772) | workspace.open\|c6762e08-36a3-408a-a662-eca2379af47e\|9\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Wolff, Providencia Karena (MRN 93017203) | workspace.open\|9a769021-7983-40bf-b7ed-748f440537dc\|18\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Schedule | Schedule | workspace.activity\|scheduleTasks | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Schedule | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Schedule | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Schedule | OR Schedule | workspace.activity\|orSchedule | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Schedule | Consults | workspace.activity\|consultList | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Schedule | In Basket · Results (2) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Schedule | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Schedule | In Basket · Rx Requests (2) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Schedule | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Schedule | Return to OR Schedule | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Schedule | Search chart | w6Schedule.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Schedule | Back | w6Schedule.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Schedule | Encounters | w6Schedule.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Schedule | Notes | w6Schedule.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Schedule | Results | w6Schedule.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Schedule | Medications | w6Schedule.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Schedule | Problems | w6Schedule.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Schedule | Allergies | w6Schedule.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Schedule | Imaging | w6Schedule.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Schedule | Surgical history | w6Schedule.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Schedule | Surgical clinic | w6Schedule.clinic | click / {"button":{"action":{"goto":{"screen":"w1Rooming"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Schedule | In Basket: Results | w6Schedule.results | click / {"button":{"action":{"goto":{"screen":"w2Inbasket"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consults | Schedule | workspace.activity\|scheduleTasks | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consults | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consults | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consults | OR Schedule | workspace.activity\|orSchedule | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consults | Consults | workspace.activity\|consultList | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consults | In Basket · Results (2) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consults | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consults | In Basket · Rx Requests (2) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consults | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consults | Return to OR Schedule | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consults | Search chart | w6Consults.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consults | Back | w6Consults.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consults | Encounters | w6Consults.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consults | Notes | w6Consults.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consults | Results | w6Consults.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consults | Medications | w6Consults.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consults | Problems | w6Consults.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consults | Allergies | w6Consults.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consults | Imaging | w6Consults.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consults | Surgical history | w6Consults.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consult | Schedule | workspace.activity\|scheduleTasks | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consult | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consult | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consult | OR Schedule | workspace.activity\|orSchedule | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consult | Consults | workspace.activity\|consultList | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consult | In Basket · Results (2) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consult | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consult | In Basket · Rx Requests (2) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consult | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consult | Return to OR Schedule | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Consult | Search chart | w6Consult.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
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
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6ConsultClose | Schedule | workspace.activity\|scheduleTasks | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6ConsultClose | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6ConsultClose | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6ConsultClose | OR Schedule | workspace.activity\|orSchedule | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6ConsultClose | Consults | workspace.activity\|consultList | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6ConsultClose | In Basket · Results (2) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6ConsultClose | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6ConsultClose | In Basket · Rx Requests (2) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6ConsultClose | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6ConsultClose | Return to OR Schedule | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6ConsultClose | Search chart | w6ConsultClose.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
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
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | Schedule | workspace.activity\|scheduleTasks | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | OR Schedule | workspace.activity\|orSchedule | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | Consults | workspace.activity\|consultList | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | In Basket · Results (2) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | In Basket · Rx Requests (2) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | Return to OR Schedule | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | Search chart | w6Orders.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | Find orders | w6Orders.orderSearch | enter / {"search":{"scope":"formulary"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | Collapse section | w6Orders.prefList | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | Cefazolin 2 g IV (surgical prophylaxis) | w6Orders.prefCefazolin | click / {"macro":{"id":"w6PrefCefazolin"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | Acetaminophen 1 g q6h | w6Orders.prefAcetaminophen | click / {"macro":{"id":"w6PrefAcetaminophen"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | Oxycodone 10 mg q6h PRN | w6Orders.prefOxycodone | click / {"macro":{"id":"w6PrefOxycodone"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | Enoxaparin 40 mg SC daily | w6Orders.prefEnoxaparin | click / {"macro":{"id":"w6PrefEnoxaparin"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | Ondansetron 8 mg IV q8h PRN | w6Orders.prefOndansetron | click / {"macro":{"id":"w6PrefOndansetron"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | Collapse section | w6Orders.medication | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | Enter Medication | w6Orders.drug | enter / {"field":{"slot":"current","prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | Antibiotic indication (required for antibiotics) | w6Orders.abxIndication | enter / {"field":{"slot":"current","prefill":"none","element":"abxIndication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | Dose unit | w6Orders.doseUnit | enter / {"field":{"slot":"current","prefill":"none","element":"doseUnit"}} / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | Route | w6Orders.route | enter / {"field":{"slot":"current","prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | Frequency | w6Orders.freq | enter / {"field":{"slot":"current","prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | As needed (PRN) | w6Orders.prn | enter / {"field":{"slot":"current","prefill":"none","element":"prn"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | Collapse section | w6Orders.dispense | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | Duration | w6Orders.duration | enter / {"field":{"slot":"current","prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | Generic substitution allowed | w6Orders.substitution | enter / {"field":{"slot":"current","prefill":"none","element":"substitution"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | Collapse section | w6Orders.dx | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | Pharmacy | w6Orders.pharmacy | enter / {"field":{"slot":"current","prefill":{"fromRecord":{"fact":"preferredPharmacy"}},"element":"pharmacy"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | Associated diagnosis (ICD-10) | w6Orders.orderDiagnosis | enter / {"field":{"slot":"current","prefill":{"linked":{"element":"visitDiagnosis"}},"element":"orderDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | Expand section | w6Orders.more | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | Current meds | w6Orders.orderInfo | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | CURES report | w6Orders.orderInfo | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | Recent labs | w6Orders.orderInfo | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | Request authorization (human entry) | w6Orders.priorAuthRequest | enter / {"field":{"slot":"current","prefill":"none","element":"priorAuthRequest"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | Request prior authorization | w6Orders.requestPriorAuth | click / {"button":{"action":"requestPriorAuth"}} / lean | disabled-with-reason | no order on this line |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | Accept and add another order | w6Orders.newLine | click / {"button":{"action":"newOrderLine"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | Back | w6Orders.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | Encounters | w6Orders.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | Notes | w6Orders.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | Results | w6Orders.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | Medications | w6Orders.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | Problems | w6Orders.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | Allergies | w6Orders.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | Imaging | w6Orders.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Orders | Surgical history | w6Orders.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Sign | Schedule | workspace.activity\|scheduleTasks | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Sign | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Sign | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Sign | OR Schedule | workspace.activity\|orSchedule | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Sign | Consults | workspace.activity\|consultList | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Sign | In Basket · Results (2) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Sign | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Sign | In Basket · Rx Requests (2) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Sign | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Sign | Return to OR Schedule | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Sign | Search chart | w6Sign.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Sign | Collapse section | w6Sign.controlled | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Sign | CURES not checked: exemption | w6Sign.curesExemptionReason | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"curesExemptionReason"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Sign | Naloxone offered | w6Sign.naloxoneOffer | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"naloxoneOffer"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Sign | Overdose and naloxone education given | w6Sign.naloxoneEducation | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"naloxoneEducation"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Sign | Sign orders | w6Sign.commit.signOrders | click / {"button":{"action":{"commit":{"commit":"signOrders"}}}} / lean | disabled-with-reason | Re-enter patient ID (initials / sex / age) to sign |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Sign | Back | w6Sign.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Sign | Encounters | w6Sign.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Sign | Notes | w6Sign.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Sign | Results | w6Sign.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Sign | Medications | w6Sign.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Sign | Problems | w6Sign.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Sign | Allergies | w6Sign.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Sign | Imaging | w6Sign.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Sign | Surgical history | w6Sign.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6OpNote | Schedule | workspace.activity\|scheduleTasks | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6OpNote | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6OpNote | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6OpNote | OR Schedule | workspace.activity\|orSchedule | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6OpNote | Consults | workspace.activity\|consultList | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6OpNote | In Basket · Results (2) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6OpNote | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6OpNote | In Basket · Rx Requests (2) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6OpNote | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6OpNote | Return to OR Schedule | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6OpNote | Search chart | w6OpNote.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6OpNote | Brief operative note | w6OpNote.template | click / {"macro":{"id":"w6OpNoteTemplate"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6OpNote | Pre-op diagnosis (ICD-10-CM) | w6OpNote.opPreopDiagnosis | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"opPreopDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6OpNote | Post-op diagnosis (ICD-10-CM) | w6OpNote.opPostopDiagnosis | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"opPostopDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6OpNote | Procedure (CPT) | w6OpNote.opProcedure | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"opProcedure"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6OpNote | Anesthesia | w6OpNote.opAnesthesia | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"opAnesthesia"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6OpNote | Findings / operative details | w6OpNote.opFindings | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"opFindings"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6OpNote | Specimens to pathology | w6OpNote.opSpecimens | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"opSpecimens"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6OpNote | Complications | w6OpNote.opComplications | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"opComplications"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6OpNote | Condition on transfer | w6OpNote.opCondition | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"opCondition"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6OpNote | Sign op note | w6OpNote.commit.signOpNote | click / {"button":{"action":{"commit":{"commit":"signOpNote"}}}} / lean | disabled-with-reason | entry required: Pre-op diagnosis |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6OpNote | Back | w6OpNote.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6OpNote | Encounters | w6OpNote.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6OpNote | Notes | w6OpNote.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6OpNote | Results | w6OpNote.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6OpNote | Medications | w6OpNote.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6OpNote | Problems | w6OpNote.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6OpNote | Allergies | w6OpNote.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6OpNote | Imaging | w6OpNote.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6OpNote | Surgical history | w6OpNote.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Schedule | workspace.activity\|scheduleTasks | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | OR Schedule | workspace.activity\|orSchedule | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Consults | workspace.activity\|consultList | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | In Basket · Results (2) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | In Basket · Rx Requests (2) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Return to OR Schedule | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Search chart | w6PostOp.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | General surgery — postoperative | w6PostOp.appendectomySet | click / {"macro":{"id":"w6AppendectomySet"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Diet | w6PostOp.postOpDiet | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"postOpDiet"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Activity | w6PostOp.postOpActivity | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"postOpActivity"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Mechanical prophylaxis | w6PostOp.vteMechanical | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"vteMechanical"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Morning labs | w6PostOp.postOpLabs | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"postOpLabs"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Vital signs | w6PostOp.postOpVitalsFreq | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"postOpVitalsFreq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Wound care, pulmonary hygiene and I&O | w6PostOp.nursingOrders | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"nursingOrders"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Collapse section | w6PostOp.row10.medication | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Enter Medication | w6PostOp.row10.drug | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Antibiotic indication (required for antibiotics) | w6PostOp.row10.abxIndication | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"abxIndication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Dose unit | w6PostOp.row10.doseUnit | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"doseUnit"}} / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Route | w6PostOp.row10.route | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Frequency | w6PostOp.row10.freq | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | As needed (PRN) | w6PostOp.row10.prn | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"prn"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Collapse section | w6PostOp.row10.dispense | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Duration | w6PostOp.row10.duration | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Generic substitution allowed | w6PostOp.row10.substitution | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"substitution"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Collapse section | w6PostOp.row10.dx | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Pharmacy | w6PostOp.row10.pharmacy | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":{"fromRecord":{"fact":"preferredPharmacy"}},"element":"pharmacy"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Associated diagnosis (ICD-10) | w6PostOp.row10.orderDiagnosis | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":{"linked":{"element":"visitDiagnosis"}},"element":"orderDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Collapse section | w6PostOp.row11.medication | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Enter Medication | w6PostOp.row11.drug | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Antibiotic indication (required for antibiotics) | w6PostOp.row11.abxIndication | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"abxIndication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Dose unit | w6PostOp.row11.doseUnit | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"doseUnit"}} / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Route | w6PostOp.row11.route | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Frequency | w6PostOp.row11.freq | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | As needed (PRN) | w6PostOp.row11.prn | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"prn"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Collapse section | w6PostOp.row11.dispense | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Duration | w6PostOp.row11.duration | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Generic substitution allowed | w6PostOp.row11.substitution | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"substitution"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Collapse section | w6PostOp.row11.dx | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Pharmacy | w6PostOp.row11.pharmacy | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":{"fromRecord":{"fact":"preferredPharmacy"}},"element":"pharmacy"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Associated diagnosis (ICD-10) | w6PostOp.row11.orderDiagnosis | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":{"linked":{"element":"visitDiagnosis"}},"element":"orderDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Collapse section | w6PostOp.row12.medication | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Enter Medication | w6PostOp.row12.drug | enter / {"field":{"slot":{"fixed":{"n":12}},"prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Antibiotic indication (required for antibiotics) | w6PostOp.row12.abxIndication | enter / {"field":{"slot":{"fixed":{"n":12}},"prefill":"none","element":"abxIndication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Dose unit | w6PostOp.row12.doseUnit | enter / {"field":{"slot":{"fixed":{"n":12}},"prefill":"none","element":"doseUnit"}} / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Route | w6PostOp.row12.route | enter / {"field":{"slot":{"fixed":{"n":12}},"prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Frequency | w6PostOp.row12.freq | enter / {"field":{"slot":{"fixed":{"n":12}},"prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | As needed (PRN) | w6PostOp.row12.prn | enter / {"field":{"slot":{"fixed":{"n":12}},"prefill":"none","element":"prn"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Collapse section | w6PostOp.row12.dispense | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Duration | w6PostOp.row12.duration | enter / {"field":{"slot":{"fixed":{"n":12}},"prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Generic substitution allowed | w6PostOp.row12.substitution | enter / {"field":{"slot":{"fixed":{"n":12}},"prefill":"none","element":"substitution"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Collapse section | w6PostOp.row12.dx | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Pharmacy | w6PostOp.row12.pharmacy | enter / {"field":{"slot":{"fixed":{"n":12}},"prefill":{"fromRecord":{"fact":"preferredPharmacy"}},"element":"pharmacy"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Associated diagnosis (ICD-10) | w6PostOp.row12.orderDiagnosis | enter / {"field":{"slot":{"fixed":{"n":12}},"prefill":{"linked":{"element":"visitDiagnosis"}},"element":"orderDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Collapse section | w6PostOp.row13.medication | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Enter Medication | w6PostOp.row13.drug | enter / {"field":{"slot":{"fixed":{"n":13}},"prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Antibiotic indication (required for antibiotics) | w6PostOp.row13.abxIndication | enter / {"field":{"slot":{"fixed":{"n":13}},"prefill":"none","element":"abxIndication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Dose unit | w6PostOp.row13.doseUnit | enter / {"field":{"slot":{"fixed":{"n":13}},"prefill":"none","element":"doseUnit"}} / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Route | w6PostOp.row13.route | enter / {"field":{"slot":{"fixed":{"n":13}},"prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Frequency | w6PostOp.row13.freq | enter / {"field":{"slot":{"fixed":{"n":13}},"prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | As needed (PRN) | w6PostOp.row13.prn | enter / {"field":{"slot":{"fixed":{"n":13}},"prefill":"none","element":"prn"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Collapse section | w6PostOp.row13.dispense | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Duration | w6PostOp.row13.duration | enter / {"field":{"slot":{"fixed":{"n":13}},"prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Generic substitution allowed | w6PostOp.row13.substitution | enter / {"field":{"slot":{"fixed":{"n":13}},"prefill":"none","element":"substitution"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Collapse section | w6PostOp.row13.dx | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Pharmacy | w6PostOp.row13.pharmacy | enter / {"field":{"slot":{"fixed":{"n":13}},"prefill":{"fromRecord":{"fact":"preferredPharmacy"}},"element":"pharmacy"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Associated diagnosis (ICD-10) | w6PostOp.row13.orderDiagnosis | enter / {"field":{"slot":{"fixed":{"n":13}},"prefill":{"linked":{"element":"visitDiagnosis"}},"element":"orderDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Back | w6PostOp.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Encounters | w6PostOp.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Notes | w6PostOp.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Results | w6PostOp.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Medications | w6PostOp.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Problems | w6PostOp.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Allergies | w6PostOp.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Imaging | w6PostOp.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PostOp | Surgical history | w6PostOp.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Rounding | Schedule | workspace.activity\|scheduleTasks | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Rounding | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Rounding | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Rounding | OR Schedule | workspace.activity\|orSchedule | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Rounding | Consults | workspace.activity\|consultList | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Rounding | In Basket · Results (2) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Rounding | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Rounding | In Basket · Rx Requests (2) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Rounding | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Rounding | Return to OR Schedule | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Rounding | Search chart | w6Rounding.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Rounding | Subjective, objective, assessment and plan | w6Rounding.progressNote | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"progressNote"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Rounding | Back | w6Rounding.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Rounding | Encounters | w6Rounding.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Rounding | Notes | w6Rounding.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Rounding | Results | w6Rounding.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Rounding | Medications | w6Rounding.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Rounding | Problems | w6Rounding.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Rounding | Allergies | w6Rounding.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Rounding | Imaging | w6Rounding.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Rounding | Surgical history | w6Rounding.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Discharge | Schedule | workspace.activity\|scheduleTasks | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Discharge | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Discharge | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Discharge | OR Schedule | workspace.activity\|orSchedule | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Discharge | Consults | workspace.activity\|consultList | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Discharge | In Basket · Results (2) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Discharge | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Discharge | In Basket · Rx Requests (2) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Discharge | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Discharge | Return to OR Schedule | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Discharge | Search chart | w6Discharge.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Discharge | Collapse section | w6Discharge.medRec | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Discharge | Medication 1: continue / stop / change / new | w6Discharge.decision0 | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"dischargeMedRec"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Discharge | Medication 2: continue / stop / change / new | w6Discharge.decision1 | enter / {"field":{"slot":{"fixed":{"n":1}},"prefill":"none","element":"dischargeMedRec"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Discharge | Medication 3: continue / stop / change / new | w6Discharge.decision2 | enter / {"field":{"slot":{"fixed":{"n":2}},"prefill":"none","element":"dischargeMedRec"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Discharge | Medication 4: continue / stop / change / new | w6Discharge.decision3 | enter / {"field":{"slot":{"fixed":{"n":3}},"prefill":"none","element":"dischargeMedRec"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Discharge | Discharge diagnosis (ICD-10-CM) | w6Discharge.dischargeDiagnosis | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"dischargeDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Discharge | Condition at discharge | w6Discharge.dischargeCondition | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"dischargeCondition"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Discharge | Discharge to | w6Discharge.dischargeDestination | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"dischargeDestination"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Discharge | Surgery follow-up | w6Discharge.dischargeFollowUp | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"dischargeFollowUp"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Discharge | Appendectomy discharge instructions | w6Discharge.instructionsTemplate | click / {"macro":{"id":"w6DischargeTemplate"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Discharge | Wound care, activity and return precautions | w6Discharge.dischargeInstructions | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"dischargeInstructions"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Discharge | Discharge patient | w6Discharge.commit.discharge | click / {"button":{"action":{"commit":{"commit":"discharge"}}}} / lean | disabled-with-reason | entry required: Discharge medication decision |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Discharge | Back | w6Discharge.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Discharge | Encounters | w6Discharge.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Discharge | Notes | w6Discharge.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Discharge | Results | w6Discharge.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Discharge | Medications | w6Discharge.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Discharge | Problems | w6Discharge.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Discharge | Allergies | w6Discharge.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Discharge | Imaging | w6Discharge.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6Discharge | Surgical history | w6Discharge.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Return to OR Schedule | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Search chart | home.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Expand section | w6PreOp.chart.includeResolved | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | Schedule | workspace.activity\|scheduleTasks | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | OR Schedule | workspace.activity\|orSchedule | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | Consults | workspace.activity\|consultList | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | In Basket · Results (2) | workspace.activity\|inBasketResults | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | In Basket · Patient Messages (2) | workspace.activity\|inBasketMessages | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | In Basket · Rx Requests (2) | workspace.activity\|inBasketRxRequests | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | Return to OR Schedule | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | Medications | w1Rooming.nav.w1MedRec | click / {"button":{"action":{"goto":{"screen":"w1MedRec"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | History / ROS | w1Rooming.nav.w1Hpi | click / {"button":{"action":{"goto":{"screen":"w1Hpi"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | Exam / Assessment & Plan | w1Rooming.nav.w1Exam | click / {"button":{"action":{"goto":{"screen":"w1Exam"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | Orders | w1Rooming.nav.w1Orders | click / {"button":{"action":{"goto":{"screen":"w1Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | Lab Orders | w1Rooming.nav.w1Labs | click / {"button":{"action":{"goto":{"screen":"w1Labs"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | Sign Visit | w1Rooming.nav.w1Close | click / {"button":{"action":{"goto":{"screen":"w1Close"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w1Rooming | Search chart | w1Rooming.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
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
| /?audit=buttons&inspect=1 · RN2 · P3 | home | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | home | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | home | Patient search by name or MRN | workspace.search | enter / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | home | Open chart: Wolff, Providencia Karena (MRN 93017203) | workspace.open\|9a769021-7983-40bf-b7ed-748f440537dc\|0\|shiftWorklist | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · RN2 · P3 | home | Open chart: Abshire, Dorthea (MRN 23215949) | workspace.open\|1a702184-16da-4747-93a9-6e23e9d83689\|80\|shiftWorklist | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · RN2 · P3 | home | Open chart: Veum, Allyson Leonila (MRN 46013516) | workspace.open\|d159d2f2-b046-4b53-998b-989862f35812\|160\|shiftWorklist | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Mar | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Mar | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Mar | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Mar | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Mar | Worklist | w4Mar.nav.w4Worklist | click / {"button":{"action":{"goto":{"screen":"w4Worklist"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Mar | Flowsheet | w4Mar.nav.w4Flowsheet | click / {"button":{"action":{"goto":{"screen":"w4Flowsheet"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Mar | Handoff | w4Mar.nav.w4Handoff | click / {"button":{"action":{"goto":{"screen":"w4Handoff"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Mar | Collapse section | w4Mar.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Mar | Open due medication | w4Mar.toolbar.openDue | click / {"button":{"action":{"goto":{"screen":"w4Admin"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Mar | Search chart | w4Mar.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Mar | Back | w4Mar.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Mar | Patient workspace | w4Mar.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Mar | New orders | w4Mar.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Mar | Results | w4Mar.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Mar | Notes | w4Mar.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Mar | Encounters | w4Mar.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Mar | PRN history | w4Mar.marTabs | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Mar | Glucose | w4Mar.marTabs | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Mar | Coagulation labs | w4Mar.marTabs | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | home | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | home | Open chart: Wolff, Providencia Karena (MRN 93017203) | workspace.open\|9a769021-7983-40bf-b7ed-748f440537dc\|0\|unitCensus | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · RN2 · P3 | home | Open chart: Abshire, Dorthea (MRN 23215949) | workspace.open\|1a702184-16da-4747-93a9-6e23e9d83689\|80\|unitCensus | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · RN2 · P3 | home | Open chart: Veum, Allyson Leonila (MRN 46013516) | workspace.open\|d159d2f2-b046-4b53-998b-989862f35812\|160\|unitCensus | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · RN2 · P3 | home | Open chart: Batz, Malissa Lin (MRN 22725311) | workspace.open\|44252521-d61a-4c6f-9f95-fdc9ebba3809\|0\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · RN2 · P3 | home | Open chart: Reed, Drew (MRN SH00001772) | workspace.open\|c6762e08-36a3-408a-a662-eca2379af47e\|9\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · RN2 · P3 | home | Open chart: Wolff, Providencia Karena (MRN 93017203) | workspace.open\|9a769021-7983-40bf-b7ed-748f440537dc\|18\|lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Worklist | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Worklist | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Worklist | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Worklist | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Worklist | MAR | w4Worklist.nav.w4Mar | click / {"button":{"action":{"goto":{"screen":"w4Mar"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Worklist | Collapse section | w4Worklist.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Worklist | Collapse section | w4Worklist.allergyGroup | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Worklist | Mark allergies reviewed (start of shift) | w4Worklist.review.allergyList | click / {"button":{"action":{"markReviewed":{"info":"allergyList"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Worklist | View saved record 1 | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Worklist | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Worklist | Search chart | w4Worklist.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Worklist | Back | w4Worklist.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Worklist | New orders | w4Worklist.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Worklist | Results | w4Worklist.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Worklist | Notes | w4Worklist.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Worklist | Encounters | w4Worklist.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Flowsheet | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Flowsheet | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Flowsheet | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Flowsheet | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Flowsheet | Collapse section | w4Flowsheet.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Flowsheet | Collapse section | w4Flowsheet.vitalsGroup | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Flowsheet | Pain reassessment (0–10) | w4Flowsheet.painReassessment | enter / {"field":{"element":"painReassessment","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Flowsheet | Copy forward last assessment | w4Flowsheet.copyAssessment | click / {"macro":{"id":"w4CopyAssessment"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Flowsheet | File assessment | w4Flowsheet.commit.chartAssessment | click / {"button":{"action":{"commit":{"commit":"chartAssessment"}}}} / lean | disabled-with-reason | entry required: BP systolic (mmHg) |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Flowsheet | Search chart | w4Flowsheet.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Flowsheet | Back | w4Flowsheet.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Flowsheet | Expand section | w4Flowsheet.optionalChart | click / {"group":{"collapsible":true,"startCollapsed":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Handoff | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Handoff | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Handoff | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Handoff | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Handoff | Collapse section | w4Handoff.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Handoff | Search chart | w4Handoff.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Handoff | Back | w4Handoff.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Handoff | New orders | w4Handoff.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Handoff | Results | w4Handoff.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Handoff | Notes | w4Handoff.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Handoff | Encounters | w4Handoff.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Handoff | SBAR template | w4Handoff.template | click / {"macro":{"id":"w4HandoffTemplate"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Admin | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Admin | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Admin | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Admin | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Admin | Collapse section | w4Admin.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Admin | Collapse section | w4Admin.fiveRights | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Admin | Pain score before dose (0–10) | w4Admin.painScore | enter / {"field":{"element":"painScore","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Admin | Collapse section | w4Admin.documentation | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Admin | Given / held / refused | w4Admin.adminStatus | enter / {"field":{"element":"adminStatus","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Admin | Reason / comment | w4Admin.adminReason | enter / {"field":{"element":"adminReason","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Admin | Site | w4Admin.adminSite | enter / {"field":{"element":"adminSite","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Admin | Document held: NPO | w4Admin.heldNpo | click / {"macro":{"id":"w4HeldNpo"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Admin | Administer | w4Admin.commit.administerMed | click / {"button":{"action":{"commit":{"commit":"administerMed"}}}} / lean | disabled-with-reason | entry required: Scan patient wristband |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Admin | Search chart | w4Admin.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Admin | Back | w4Admin.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Admin | Expand section | w4Admin.optionalChart | click / {"group":{"collapsible":true,"startCollapsed":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | home | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | home | Collapse section | home.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | home | Search chart | home.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | home | Problem list | home.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | home | Results | home.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | home | Notes | home.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | home | Medications | home.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | home | Allergies | home.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | home | Encounters | home.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | home | Coverage | home.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | home | Clinic visit: start rooming | home.work.w1Rooming | click / {"button":{"action":{"goto":{"screen":"w1Rooming"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | home | In-basket: results | home.work.w2Inbasket | click / {"button":{"action":{"goto":{"screen":"w2Inbasket"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | home | In-basket: refill requests | home.work.w7Queue | click / {"button":{"action":{"goto":{"screen":"w7Queue"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | home | Emergency department: track board | home.work.w3TrackBoard | click / {"button":{"action":{"goto":{"screen":"w3TrackBoard"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | home | Pediatric clinic: start rooming | home.work.w5Rooming | click / {"button":{"action":{"goto":{"screen":"w5Rooming"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | home | Surgery: ED consult | home.work.w6Consult | click / {"button":{"action":{"goto":{"screen":"w6Consult"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | home | Surgery: pre-op | home.work.w6PreOp | click / {"button":{"action":{"goto":{"screen":"w6PreOp"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | home | Surgery: op note | home.work.w6OpNote | click / {"button":{"action":{"goto":{"screen":"w6OpNote"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | home | Surgery: post-op orders | home.work.w6PostOp | click / {"button":{"action":{"goto":{"screen":"w6PostOp"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | home | Surgery: rounding | home.work.w6Rounding | click / {"button":{"action":{"goto":{"screen":"w6Rounding"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | home | Surgery: discharge | home.work.w6Discharge | click / {"button":{"action":{"goto":{"screen":"w6Discharge"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Flowsheet | Confirm prefilled value | w4Flowsheet.nursingAssessment | confirm / {"field":{"element":"nursingAssessment","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Flowsheet | New orders | w4Flowsheet.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Flowsheet | Results | w4Flowsheet.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Flowsheet | Notes | w4Flowsheet.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Flowsheet | Encounters | w4Flowsheet.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Handoff | Confirm prefilled value | w4Handoff.handoffSituation | confirm / {"field":{"element":"handoffSituation","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Handoff | Confirm prefilled value | w4Handoff.handoffBackground | confirm / {"field":{"element":"handoffBackground","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Handoff | Confirm prefilled value | w4Handoff.handoffAssessment | confirm / {"field":{"element":"handoffAssessment","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Handoff | Confirm prefilled value | w4Handoff.handoffRecommendation | confirm / {"field":{"element":"handoffRecommendation","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Admin | Confirm prefilled value | w4Admin.adminStatus | confirm / {"field":{"element":"adminStatus","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Admin | Confirm prefilled value | w4Admin.adminReason | confirm / {"field":{"element":"adminReason","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Admin | New orders | w4Admin.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Admin | Results | w4Admin.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Admin | Notes | w4Admin.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w4Admin | Encounters | w4Admin.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Rooming | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Rooming | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Rooming | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Rooming | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Rooming | Med rec | w1Rooming.nav.w1MedRec | click / {"button":{"action":{"goto":{"screen":"w1MedRec"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Rooming | HPI / ROS | w1Rooming.nav.w1Hpi | click / {"button":{"action":{"goto":{"screen":"w1Hpi"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Rooming | Exam / A&P | w1Rooming.nav.w1Exam | click / {"button":{"action":{"goto":{"screen":"w1Exam"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Rooming | Orders | w1Rooming.nav.w1Orders | click / {"button":{"action":{"goto":{"screen":"w1Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Rooming | Labs | w1Rooming.nav.w1Labs | click / {"button":{"action":{"goto":{"screen":"w1Labs"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Rooming | Visit close | w1Rooming.nav.w1Close | click / {"button":{"action":{"goto":{"screen":"w1Close"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Rooming | Collapse section | w1Rooming.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Rooming | Search chart | w1Rooming.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Rooming | Back | w1Rooming.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Rooming | Results | w1Rooming.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Rooming | Imaging | w1Rooming.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Rooming | Notes | w1Rooming.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Rooming | Encounters | w1Rooming.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Rooming | Social history | w1Rooming.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Rooming | Family history | w1Rooming.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Rooming | Care gaps | w1Rooming.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Rooming | Immunizations | w1Rooming.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Rooming | Coverage | w1Rooming.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Rooming | Collapse section | w1Rooming.vitalsGroup | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Rooming | Pain (0–10) | w1Rooming.painScore | enter / {"field":{"element":"painScore","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Rooming | Collapse section | w1Rooming.intake | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Rooming | Tobacco use | w1Rooming.tobaccoUse | enter / {"field":{"element":"tobaccoUse","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Rooming | Fall in the past year? | w1Rooming.fallRiskScreen | enter / {"field":{"element":"fallRiskScreen","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Rooming | Travel in the past 30 days? | w1Rooming.travelScreen | enter / {"field":{"element":"travelScreen","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Rooming | Advance directive discussed | w1Rooming.advanceDirectiveAsked | enter / {"field":{"element":"advanceDirectiveAsked","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Rooming | Interpreter needed? | w1Rooming.interpreterNeeded | enter / {"field":{"element":"interpreterNeeded","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Rooming | Preferred pharmacy confirmed | w1Rooming.pharmacyConfirmedRooming | enter / {"field":{"element":"pharmacyConfirmedRooming","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Rooming | Collapse section | w1Rooming.phq | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Rooming | PHQ-2 score | w1Rooming.depressionScreen | enter / {"field":{"element":"depressionScreen","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Rooming | Collapse section | w1Rooming.allergyGroup | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Rooming | Mark allergies reviewed | w1Rooming.review.allergyList | click / {"button":{"action":{"markReviewed":{"info":"allergyList"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Rooming | View saved record 1 | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Rooming | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · RN2 · P3 | w2Inbasket | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w2Inbasket | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w2Inbasket | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w2Inbasket | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w2Inbasket | Result | w2Inbasket.nav.w2Result | click / {"button":{"action":{"goto":{"screen":"w2Result"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w2Inbasket | Message patient | w2Inbasket.nav.w2Message | click / {"button":{"action":{"goto":{"screen":"w2Message"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w2Inbasket | Collapse section | w2Inbasket.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w2Inbasket | Search chart | w2Inbasket.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w2Inbasket | Back | w2Inbasket.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w2Inbasket | All results | w2Inbasket.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w2Inbasket | Notes | w2Inbasket.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w2Inbasket | Encounters | w2Inbasket.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w2Inbasket | Imaging | w2Inbasket.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w2Inbasket | Search in-basket | w2Inbasket.basketSearch | enter / {"search":{"scope":"inbasket"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w7Queue | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w7Queue | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w7Queue | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w7Queue | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w7Queue | Chart review | w7Queue.nav.w7Review | click / {"button":{"action":{"goto":{"screen":"w7Review"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w7Queue | Collapse section | w7Queue.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w7Queue | Search chart | w7Queue.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w7Queue | Back | w7Queue.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w7Queue | Encounters | w7Queue.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w7Queue | Imaging | w7Queue.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w7Queue | Care gaps | w7Queue.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3TrackBoard | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3TrackBoard | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3TrackBoard | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3TrackBoard | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3TrackBoard | Triage | w3TrackBoard.nav.w3Triage | click / {"button":{"action":{"goto":{"screen":"w3Triage"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3TrackBoard | Provider note | w3TrackBoard.nav.w3Provider | click / {"button":{"action":{"goto":{"screen":"w3Provider"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3TrackBoard | Order sets | w3TrackBoard.nav.w3OrderSets | click / {"button":{"action":{"goto":{"screen":"w3OrderSets"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3TrackBoard | Orders | w3TrackBoard.nav.w3Orders | click / {"button":{"action":{"goto":{"screen":"w3Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3TrackBoard | Disposition | w3TrackBoard.nav.w3Disposition | click / {"button":{"action":{"goto":{"screen":"w3Disposition"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3TrackBoard | Collapse section | w3TrackBoard.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3TrackBoard | Search chart | w3TrackBoard.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3TrackBoard | Back | w3TrackBoard.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3TrackBoard | Results | w3TrackBoard.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3TrackBoard | Imaging | w3TrackBoard.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3TrackBoard | Notes | w3TrackBoard.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3TrackBoard | Encounters | w3TrackBoard.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Rooming | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Rooming | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Rooming | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Rooming | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Rooming | Growth | w5Rooming.nav.w5Growth | click / {"button":{"action":{"goto":{"screen":"w5Growth"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Rooming | Orders | w5Rooming.nav.w5Orders | click / {"button":{"action":{"goto":{"screen":"w5Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Rooming | Immunizations | w5Rooming.nav.w5Immunizations | click / {"button":{"action":{"goto":{"screen":"w5Immunizations"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Rooming | Visit close | w5Rooming.nav.w5Close | click / {"button":{"action":{"goto":{"screen":"w5Close"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Rooming | Collapse section | w5Rooming.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Rooming | Search chart | w5Rooming.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Rooming | Back | w5Rooming.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Rooming | Growth chart | w5Rooming.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Rooming | Immunizations | w5Rooming.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Rooming | Results | w5Rooming.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Rooming | Notes | w5Rooming.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Rooming | Family history | w5Rooming.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Rooming | Care gaps | w5Rooming.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Rooming | Collapse section | w5Rooming.measures | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Rooming | Collapse section | w5Rooming.allergyGroup | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Rooming | Mark allergies reviewed | w5Rooming.review.allergyList | click / {"button":{"action":{"markReviewed":{"info":"allergyList"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Rooming | View saved record 1 | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Rooming | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Rooming | Collapse section | w5Rooming.medRec | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Rooming | Medication 1: continue / stop / modify | w5Rooming.decision0 | enter / {"field":{"element":"medRecDecision","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Rooming | Medication 2: continue / stop / modify | w5Rooming.decision1 | enter / {"field":{"element":"medRecDecision","slot":{"fixed":{"n":1}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Consult | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Consult | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Consult | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Consult | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Consult | Consult close | w6Consult.nav.w6ConsultClose | click / {"button":{"action":{"goto":{"screen":"w6ConsultClose"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Consult | Orders | w6Consult.nav.w6Orders | click / {"button":{"action":{"goto":{"screen":"w6Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Consult | Collapse section | w6Consult.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Consult | Search chart | w6Consult.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Consult | Back | w6Consult.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Consult | Imaging | w6Consult.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Consult | Results | w6Consult.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Consult | Notes | w6Consult.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Consult | Surgical history | w6Consult.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Consult | Encounters | w6Consult.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Consult | Collapse section | w6Consult.homeMeds | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Consult | Medication 1: continue / stop / modify | w6Consult.decision0 | enter / {"field":{"element":"medRecDecision","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Consult | Medication 2: continue / stop / modify | w6Consult.decision1 | enter / {"field":{"element":"medRecDecision","slot":{"fixed":{"n":1}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6PreOp | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6PreOp | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6PreOp | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6PreOp | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6PreOp | Collapse section | w6PreOp.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6PreOp | Search chart | w6PreOp.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6PreOp | Back | w6PreOp.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6PreOp | Imaging | w6PreOp.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6PreOp | Results | w6PreOp.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6PreOp | Notes | w6PreOp.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6PreOp | Surgical history | w6PreOp.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6PreOp | Encounters | w6PreOp.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6OpNote | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6OpNote | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6OpNote | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6OpNote | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6OpNote | Collapse section | w6OpNote.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6OpNote | Search chart | w6OpNote.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6OpNote | Back | w6OpNote.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6OpNote | Imaging | w6OpNote.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6OpNote | Results | w6OpNote.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6OpNote | Notes | w6OpNote.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6OpNote | Surgical history | w6OpNote.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6OpNote | Encounters | w6OpNote.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6OpNote | Collapse section | w6OpNote.note | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6PostOp | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6PostOp | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6PostOp | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6PostOp | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6PostOp | Collapse section | w6PostOp.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6PostOp | Search chart | w6PostOp.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6PostOp | Back | w6PostOp.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6PostOp | Imaging | w6PostOp.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6PostOp | Results | w6PostOp.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6PostOp | Notes | w6PostOp.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6PostOp | Surgical history | w6PostOp.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6PostOp | Encounters | w6PostOp.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6PostOp | Collapse section | w6PostOp.care | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6PostOp | Collapse section | w6PostOp.row10 | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6PostOp | Collapse section | w6PostOp.row10.medication | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6PostOp | Collapse section | w6PostOp.row10.dispense | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6PostOp | Collapse section | w6PostOp.row10.dx | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6PostOp | Collapse section | w6PostOp.row11 | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6PostOp | Collapse section | w6PostOp.row11.medication | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6PostOp | Collapse section | w6PostOp.row11.dispense | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6PostOp | Collapse section | w6PostOp.row11.dx | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6PostOp | Collapse section | w6PostOp.row12 | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6PostOp | Collapse section | w6PostOp.row12.medication | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6PostOp | Collapse section | w6PostOp.row12.dispense | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6PostOp | Collapse section | w6PostOp.row12.dx | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6PostOp | Collapse section | w6PostOp.row13 | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6PostOp | Collapse section | w6PostOp.row13.medication | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6PostOp | Collapse section | w6PostOp.row13.dispense | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6PostOp | Collapse section | w6PostOp.row13.dx | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6PostOp | Review and sign | w6PostOp.toSign | click / {"button":{"action":{"goto":{"screen":"w6Sign"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Rounding | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Rounding | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Rounding | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Rounding | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Rounding | Collapse section | w6Rounding.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Rounding | Search chart | w6Rounding.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Rounding | Back | w6Rounding.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Rounding | Imaging | w6Rounding.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Rounding | Results | w6Rounding.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Rounding | Notes | w6Rounding.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Rounding | Surgical history | w6Rounding.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Rounding | Encounters | w6Rounding.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Discharge | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Discharge | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Discharge | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Discharge | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Discharge | Collapse section | w6Discharge.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Discharge | Search chart | w6Discharge.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Discharge | Back | w6Discharge.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Discharge | Imaging | w6Discharge.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Discharge | Results | w6Discharge.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Discharge | Notes | w6Discharge.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Discharge | Surgical history | w6Discharge.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Discharge | Encounters | w6Discharge.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Discharge | Collapse section | w6Discharge.medRec | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1MedRec | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1MedRec | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1MedRec | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1MedRec | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1MedRec | Collapse section | w1MedRec.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1MedRec | Search chart | w1MedRec.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1MedRec | Back | w1MedRec.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1MedRec | Results | w1MedRec.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1MedRec | Imaging | w1MedRec.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1MedRec | Notes | w1MedRec.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1MedRec | Encounters | w1MedRec.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1MedRec | Social history | w1MedRec.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1MedRec | Family history | w1MedRec.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1MedRec | Care gaps | w1MedRec.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1MedRec | Immunizations | w1MedRec.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1MedRec | Coverage | w1MedRec.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1MedRec | Mark medications reviewed | w1MedRec.review.currentMeds | click / {"button":{"action":{"markReviewed":{"info":"currentMeds"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1MedRec | View saved record 1 | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1MedRec | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1MedRec | Collapse section | w1MedRec.rows | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1MedRec | Medication 1: continue / stop / modify | w1MedRec.decision0 | enter / {"field":{"element":"medRecDecision","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1MedRec | Medication 2: continue / stop / modify | w1MedRec.decision1 | enter / {"field":{"element":"medRecDecision","slot":{"fixed":{"n":1}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1MedRec | Medication 3: continue / stop / modify | w1MedRec.decision2 | enter / {"field":{"element":"medRecDecision","slot":{"fixed":{"n":2}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1MedRec | Medication 4: continue / stop / modify | w1MedRec.decision3 | enter / {"field":{"element":"medRecDecision","slot":{"fixed":{"n":3}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1MedRec | Last plan | w1MedRec.medTabs | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1MedRec | Fill history | w1MedRec.medTabs | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Hpi | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Hpi | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Hpi | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Hpi | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Hpi | Collapse section | w1Hpi.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Hpi | Search chart | w1Hpi.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Hpi | Back | w1Hpi.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Hpi | Results | w1Hpi.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Hpi | Imaging | w1Hpi.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Hpi | Notes | w1Hpi.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Hpi | Encounters | w1Hpi.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Hpi | Social history | w1Hpi.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Hpi | Family history | w1Hpi.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Hpi | Care gaps | w1Hpi.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Hpi | Immunizations | w1Hpi.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Hpi | Coverage | w1Hpi.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Hpi | Expand section | w1Hpi.lastNote | click / {"group":{"collapsible":true,"startCollapsed":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Exam | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Exam | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Exam | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Exam | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Exam | Collapse section | w1Exam.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Exam | Search chart | w1Exam.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Exam | Back | w1Exam.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Exam | Results | w1Exam.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Exam | Imaging | w1Exam.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Exam | Notes | w1Exam.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Exam | Encounters | w1Exam.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Exam | Social history | w1Exam.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Exam | Family history | w1Exam.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Exam | Care gaps | w1Exam.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Exam | Immunizations | w1Exam.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Exam | Coverage | w1Exam.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Orders | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Orders | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Orders | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Orders | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Orders | Collapse section | w1Orders.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Orders | Search chart | w1Orders.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Orders | Back | w1Orders.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Orders | Results | w1Orders.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Orders | Imaging | w1Orders.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Orders | Notes | w1Orders.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Orders | Encounters | w1Orders.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Orders | Social history | w1Orders.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Orders | Family history | w1Orders.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Orders | Care gaps | w1Orders.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Orders | Immunizations | w1Orders.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Orders | Coverage | w1Orders.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Orders | Search medications | w1Orders.orderSearch | enter / {"search":{"scope":"formulary"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Orders | Collapse section | w1Orders.prefList | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Orders | Collapse section | w1Orders.dosing | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Orders | Collapse section | w1Orders.medication | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Orders | Collapse section | w1Orders.dispense | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Orders | Collapse section | w1Orders.dx | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Orders | Collapse section | w1Orders.controlled | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Orders | Expand section | w1Orders.more | click / {"group":{"collapsible":true,"startCollapsed":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Orders | Current meds | w1Orders.orderInfo | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Orders | CURES report | w1Orders.orderInfo | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Orders | Recent labs | w1Orders.orderInfo | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Orders | Accept and add another order | w1Orders.newLine | click / {"button":{"action":"newOrderLine"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Orders | Review and sign | w1Orders.toSign | click / {"button":{"action":{"goto":{"screen":"w1Verify"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Labs | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Labs | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Labs | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Labs | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Labs | Collapse section | w1Labs.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Labs | Search chart | w1Labs.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Labs | Back | w1Labs.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Labs | Results | w1Labs.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Labs | Imaging | w1Labs.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Labs | Notes | w1Labs.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Labs | Encounters | w1Labs.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Labs | Social history | w1Labs.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Labs | Family history | w1Labs.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Labs | Care gaps | w1Labs.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Labs | Immunizations | w1Labs.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Labs | Coverage | w1Labs.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Labs | Search lab tests | w1Labs.labSearch | enter / {"search":{"scope":"loinc"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Labs | Collapse section | w1Labs.labOrder | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Close | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Close | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Close | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Close | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Close | Collapse section | w1Close.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Close | Search chart | w1Close.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Close | Back | w1Close.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Close | Results | w1Close.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Close | Imaging | w1Close.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Close | Notes | w1Close.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Close | Encounters | w1Close.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Close | Social history | w1Close.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Close | Family history | w1Close.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Close | Care gaps | w1Close.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Close | Immunizations | w1Close.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Close | Coverage | w1Close.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Close | Instructions template | w1Close.avsTemplate | click / {"macro":{"id":"w1AvsTemplate"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Close | Patient instructions | w1Close.patientInstructions | enter / {"field":{"element":"patientInstructions","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w2Result | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w2Result | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w2Result | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w2Result | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w2Result | Collapse section | w2Result.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w2Result | Search chart | w2Result.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w2Result | Back | w2Result.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w2Result | All results | w2Result.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w2Result | Notes | w2Result.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w2Result | Encounters | w2Result.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w2Result | Imaging | w2Result.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w2Message | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w2Message | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w2Message | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w2Message | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w2Message | Collapse section | w2Message.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w2Message | Search chart | w2Message.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w2Message | Back | w2Message.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w2Message | All results | w2Message.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w2Message | Notes | w2Message.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w2Message | Encounters | w2Message.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w2Message | Imaging | w2Message.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w7Review | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w7Review | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w7Review | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w7Review | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w7Review | Collapse section | w7Review.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w7Review | Search chart | w7Review.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w7Review | Back | w7Review.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w7Review | Encounters | w7Review.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w7Review | Imaging | w7Review.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w7Review | Care gaps | w7Review.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w7Review | Last visit | w7Review.refillTabs | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w7Review | Labs | w7Review.refillTabs | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w7Review | Fill history | w7Review.refillTabs | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w7Review | Medications | w7Review.refillTabs | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w7Review | Last note | w7Review.refillTabs | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w7Review | Mark last visit reviewed | w7Review.review.lastVisit | click / {"button":{"action":{"markReviewed":{"info":"lastVisit"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons&inspect=1 · RN2 · P3 | w7Review | View saved record 1 | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · RN2 · P3 | w7Review | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · RN2 · P3 | w7Review | Go to decision | w7Review.decide | click / {"button":{"action":{"goto":{"screen":"w7Decision"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Triage | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Triage | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Triage | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Triage | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Triage | Collapse section | w3Triage.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Triage | Search chart | w3Triage.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Triage | Back | w3Triage.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Triage | Results | w3Triage.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Triage | Imaging | w3Triage.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Triage | Notes | w3Triage.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Triage | Encounters | w3Triage.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Triage | Collapse section | w3Triage.vitalsGroup | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Triage | Pain (0–10) | w3Triage.painScore | enter / {"field":{"element":"painScore","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Triage | Acuity (ESI) | w3Triage.triageAcuity | enter / {"field":{"element":"triageAcuity","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Triage | Arrival mode | w3Triage.arrivalMode | enter / {"field":{"element":"arrivalMode","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Triage | Isolation screen | w3Triage.isolationScreen | enter / {"field":{"element":"isolationScreen","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Triage | Collapse section | w3Triage.allergyGroup | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Triage | Mark allergies reviewed | w3Triage.review.allergyList | click / {"button":{"action":{"markReviewed":{"info":"allergyList"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Triage | View saved record 1 | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Triage | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Provider | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Provider | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Provider | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Provider | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Provider | Collapse section | w3Provider.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Provider | Search chart | w3Provider.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Provider | Back | w3Provider.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Provider | Results | w3Provider.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Provider | Imaging | w3Provider.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Provider | Notes | w3Provider.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Provider | Encounters | w3Provider.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3OrderSets | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3OrderSets | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3OrderSets | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3OrderSets | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3OrderSets | Collapse section | w3OrderSets.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3OrderSets | Search chart | w3OrderSets.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3OrderSets | Back | w3OrderSets.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3OrderSets | Results | w3OrderSets.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3OrderSets | Imaging | w3OrderSets.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3OrderSets | Notes | w3OrderSets.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3OrderSets | Encounters | w3OrderSets.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3OrderSets | Collapse section | w3OrderSets.sets | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3OrderSets | Collapse section | w3OrderSets.row10 | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3OrderSets | Collapse section | w3OrderSets.row10.medication | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3OrderSets | Collapse section | w3OrderSets.row10.dispense | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3OrderSets | Collapse section | w3OrderSets.row10.dx | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3OrderSets | Collapse section | w3OrderSets.row11 | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3OrderSets | Collapse section | w3OrderSets.row11.medication | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3OrderSets | Collapse section | w3OrderSets.row11.dispense | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3OrderSets | Collapse section | w3OrderSets.row11.dx | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3OrderSets | Review and sign | w3OrderSets.toSign | click / {"button":{"action":{"goto":{"screen":"w3Sign"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Orders | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Orders | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Orders | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Orders | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Orders | Collapse section | w3Orders.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Orders | Search chart | w3Orders.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Orders | Back | w3Orders.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Orders | Results | w3Orders.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Orders | Imaging | w3Orders.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Orders | Notes | w3Orders.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Orders | Encounters | w3Orders.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Orders | Search medications | w3Orders.orderSearch | enter / {"search":{"scope":"formulary"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Orders | Collapse section | w3Orders.prefList | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Orders | Collapse section | w3Orders.dosing | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Orders | Collapse section | w3Orders.medication | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Orders | Collapse section | w3Orders.dispense | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Orders | Collapse section | w3Orders.dx | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Orders | Expand section | w3Orders.more | click / {"group":{"collapsible":true,"startCollapsed":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Orders | Current meds | w3Orders.orderInfo | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Orders | CURES report | w3Orders.orderInfo | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Orders | Recent labs | w3Orders.orderInfo | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Orders | Accept and add another order | w3Orders.newLine | click / {"button":{"action":"newOrderLine"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Disposition | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Disposition | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Disposition | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Disposition | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Disposition | Collapse section | w3Disposition.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Disposition | Search chart | w3Disposition.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Disposition | Back | w3Disposition.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Disposition | Results | w3Disposition.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Disposition | Imaging | w3Disposition.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Disposition | Notes | w3Disposition.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Disposition | Encounters | w3Disposition.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Disposition | Collapse section | w3Disposition.admitGroup | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w3Disposition | Expand section | w3Disposition.dischargeGroup | click / {"group":{"collapsible":true,"startCollapsed":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Growth | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Growth | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Growth | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Growth | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Growth | Collapse section | w5Growth.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Growth | Search chart | w5Growth.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Growth | Back | w5Growth.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Growth | Growth chart | w5Growth.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Growth | Immunizations | w5Growth.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Growth | Results | w5Growth.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Growth | Notes | w5Growth.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Growth | Family history | w5Growth.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Growth | Care gaps | w5Growth.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Orders | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Orders | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Orders | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Orders | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Orders | Collapse section | w5Orders.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Orders | Search chart | w5Orders.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Orders | Back | w5Orders.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Orders | Growth chart | w5Orders.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Orders | Immunizations | w5Orders.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Orders | Results | w5Orders.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Orders | Notes | w5Orders.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Orders | Family history | w5Orders.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Orders | Care gaps | w5Orders.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Orders | Search medications | w5Orders.orderSearch | enter / {"search":{"scope":"formulary"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Orders | Collapse section | w5Orders.prefList | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Orders | Collapse section | w5Orders.dosing | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Orders | Collapse section | w5Orders.medication | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Orders | Collapse section | w5Orders.dispense | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Orders | Collapse section | w5Orders.dx | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Orders | Collapse section | w5Orders.controlled | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Orders | Expand section | w5Orders.more | click / {"group":{"collapsible":true,"startCollapsed":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Orders | Current meds | w5Orders.orderInfo | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Orders | CURES report | w5Orders.orderInfo | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Orders | Recent labs | w5Orders.orderInfo | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Orders | Accept and add another order | w5Orders.newLine | click / {"button":{"action":"newOrderLine"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Orders | Review and sign | w5Orders.toSign | click / {"button":{"action":{"goto":{"screen":"w5Sign"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Immunizations | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Immunizations | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Immunizations | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Immunizations | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Immunizations | Collapse section | w5Immunizations.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Immunizations | Search chart | w5Immunizations.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Immunizations | Back | w5Immunizations.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Immunizations | Growth chart | w5Immunizations.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Immunizations | Immunizations | w5Immunizations.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Immunizations | Results | w5Immunizations.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Immunizations | Notes | w5Immunizations.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Immunizations | Family history | w5Immunizations.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Immunizations | Care gaps | w5Immunizations.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Immunizations | Influenza vaccine (from inventory) | w5Immunizations.fluVaccine | click / {"macro":{"id":"w5FluVaccine"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Immunizations | Collapse section | w5Immunizations.record | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Immunizations | Vaccine | w5Immunizations.vaccine | enter / {"field":{"element":"vaccine","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Immunizations | Site | w5Immunizations.vaccineSite | enter / {"field":{"element":"vaccineSite","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Immunizations | Route | w5Immunizations.vaccineRoute | enter / {"field":{"element":"vaccineRoute","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Immunizations | VIS given before vaccination | w5Immunizations.visGiven | enter / {"field":{"element":"visGiven","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Immunizations | Record immunization | w5Immunizations.commit.recordImmunization | click / {"button":{"action":{"commit":{"commit":"recordImmunization"}}}} / lean | disabled-with-reason | entry required: Vaccine |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Close | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Close | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Close | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Close | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Close | Collapse section | w5Close.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Close | Search chart | w5Close.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Close | Back | w5Close.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Close | Growth chart | w5Close.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Close | Immunizations | w5Close.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Close | Results | w5Close.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Close | Notes | w5Close.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Close | Family history | w5Close.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Close | Care gaps | w5Close.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w5Close | Instructions for family | w5Close.patientInstructions | enter / {"field":{"element":"patientInstructions","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6ConsultClose | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6ConsultClose | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6ConsultClose | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6ConsultClose | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6ConsultClose | Collapse section | w6ConsultClose.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6ConsultClose | Search chart | w6ConsultClose.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6ConsultClose | Back | w6ConsultClose.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6ConsultClose | Imaging | w6ConsultClose.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6ConsultClose | Results | w6ConsultClose.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6ConsultClose | Notes | w6ConsultClose.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6ConsultClose | Surgical history | w6ConsultClose.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6ConsultClose | Encounters | w6ConsultClose.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6ConsultClose | Instructions (e.g. NPO) | w6ConsultClose.patientInstructions | enter / {"field":{"element":"patientInstructions","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Orders | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Orders | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Orders | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Orders | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Orders | Collapse section | w6Orders.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Orders | Search chart | w6Orders.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Orders | Back | w6Orders.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Orders | Imaging | w6Orders.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Orders | Results | w6Orders.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Orders | Notes | w6Orders.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Orders | Surgical history | w6Orders.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Orders | Encounters | w6Orders.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Orders | Search medications | w6Orders.orderSearch | enter / {"search":{"scope":"formulary"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Orders | Collapse section | w6Orders.prefList | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Orders | Collapse section | w6Orders.dosing | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Orders | Collapse section | w6Orders.medication | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Orders | Collapse section | w6Orders.dispense | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Orders | Collapse section | w6Orders.dx | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Orders | Expand section | w6Orders.more | click / {"group":{"collapsible":true,"startCollapsed":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Orders | Current meds | w6Orders.orderInfo | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Orders | CURES report | w6Orders.orderInfo | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Orders | Recent labs | w6Orders.orderInfo | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Orders | Accept and add another order | w6Orders.newLine | click / {"button":{"action":"newOrderLine"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Sign | My Patients / MAR | workspace.activity\|shiftWorklist | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Sign | Unit Census | workspace.activity\|unitCensus | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Sign | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Sign | Return to My Patients / MAR | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Sign | Collapse section | w6Sign.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Sign | Search chart | w6Sign.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Sign | Back | w6Sign.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Sign | Imaging | w6Sign.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Sign | Results | w6Sign.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Sign | Notes | w6Sign.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Sign | Surgical history | w6Sign.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Sign | Encounters | w6Sign.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Sign | Collapse section | w6Sign.weights | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w6Sign | Collapse section | w6Sign.controlled | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · RN2 · P3 | w1Orders | Mark CURES report reviewed | w1Orders.review.curesReport | click / {"button":{"action":{"markReviewed":{"info":"curesReport"}}}} / lean | works | DOM changed; validation drawer: No versioned source record is available for this review. Refresh the chart or obtain the report before retrying. Your inputs are retained. Close this panel, correct the issue, and retry the action. |
