# Button audit

Generated 2026-11-01T17:13:29.077Z. Preview build; one Chromium worker.

| Scope | Works | Disabled with reason | Dead | Error |
|---|---:|---:|---:|---:|
| App baseline | 0 | 0 | 0 | 0 |
| App final | 8 | 0 | 0 | 0 |
| Lean final | 226 | 1 | 0 | 0 |

App coverage includes additional worklist and drawer controls after the baseline. A complete pre-fix Lean census was not retained; see README.md.

Each sampled enabled control is clicked from an observed checkpoint. A changed input echo alone does not certify a Lean search. Selected navigation and reset controls must provide feedback or a disabled reason. Disabled commits are recorded with Lean's actual reason; the audit never fabricates safety evidence to enable a write.

| Route / persona / program | Screen | Label | Comp id | Kind / owner | Status | Observed effect |
|---|---|---|---|---|---|---|
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Patient search by name or MRN | workspace.search | enter / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | Return to patient list | workspace.return | click / lean | works | Lean state changed; result "ok" |
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
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | w1Rooming | Patient workspace | w1Rooming.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Open chart: Batz, Malissa Lin (MRN 22725311) | workspace.open\|44252521-d61a-4c6f-9f95-fdc9ebba3809\|0\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Open chart: Brooks, Rowan (MRN SH00002872) | workspace.open\|cd235951-b98c-4f65-b692-bd86083151cc\|1\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Open chart: Ellis, Casey (MRN SH00001725) | workspace.open\|80996a80-77c5-46e9-835a-bfbc539f4925\|2\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Open chart: Foster, Riley (MRN SH00002472) | workspace.open\|135d1fd3-c960-415a-9359-6ed187c0e7cd\|3\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Open chart: Hackett, Robert Fritz (MRN 26872402) | workspace.open\|1f091052-6d19-4b6e-92a1-e14946cb74bc\|4\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Open chart: Hernádez, Mario (MRN 72621047) | workspace.open\|3fb650a5-aef2-413e-8519-9a401c2c6274\|5\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Open chart: Kling, Tashia Corazon (MRN 23407288) | workspace.open\|6995fbff-bc47-4634-97e6-c7eb03eed80f\|6\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Open chart: Koss, Emmanuel Guy (MRN 46727478) | workspace.open\|d37291cd-1b5a-460e-8803-d3c1c51bcee7\|7\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Open chart: Park, Taylor (MRN SH00001723) | workspace.open\|21b0f320-2c06-4926-93eb-8ddd0d5f3000\|8\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Open chart: Reed, Drew (MRN SH00001772) | workspace.open\|c6762e08-36a3-408a-a662-eca2379af47e\|9\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Open chart: Reynolds, Chase Ramiro (MRN 72289834) | workspace.open\|cfd64dc0-1d8e-4301-8ef0-bfb72e25e05e\|10\|lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Open chart: Rippin, Silvia Ardelia (MRN 75726058) | workspace.open\|f8bfe5aa-3e41-4995-a01d-af30e805d36f\|11\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Open chart: Schmeler, Burt Hosea (MRN 86720835) | workspace.open\|3b1049a1-e01f-49ac-ad5a-2eadba858974\|12\|lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Open chart: Schmitt, Alva Greg (MRN 82246729) | workspace.open\|6e0f5788-87f2-4580-a892-95000b823484\|13\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Open chart: Schultz, Earnest Sergio (MRN 76725335) | workspace.open\|5ab598cb-5fb7-4559-90ff-aa099cb56dbb\|14\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Open chart: Shaw, Skyler (MRN SH00001972) | workspace.open\|662941eb-3517-449c-8bb5-9195f961f8b6\|15\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Open chart: Torp, Omar (MRN 85507720) | workspace.open\|187a191d-50a8-4cda-9293-5d774f1d87b8\|16\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Open chart: Waters, Marco Rolf (MRN 57280109) | workspace.open\|5e1a035e-fe76-4964-864c-4c2a9ce6f914\|17\|lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P1 · canonical-P1 | home | Open chart: Wolff, Providencia Karena (MRN 93017203) | workspace.open\|9a769021-7983-40bf-b7ed-748f440537dc\|18\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | home | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | home | Patient search by name or MRN | workspace.search | enter / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Return to patient list | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Track board | w3Triage.nav.w3TrackBoard | click / {"button":{"action":{"goto":{"screen":"w3TrackBoard"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Provider note | w3Triage.nav.w3Provider | click / {"button":{"action":{"goto":{"screen":"w3Provider"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Order sets | w3Triage.nav.w3OrderSets | click / {"button":{"action":{"goto":{"screen":"w3OrderSets"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Orders | w3Triage.nav.w3Orders | click / {"button":{"action":{"goto":{"screen":"w3Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Disposition | w3Triage.nav.w3Disposition | click / {"button":{"action":{"goto":{"screen":"w3Disposition"}}}} / lean | works | Lean state changed; result "ok" |
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
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Patient workspace | w3Triage.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Results | w3Triage.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Imaging | w3Triage.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Notes | w3Triage.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | w3Triage | Encounters | w3Triage.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | home | Open chart: Batz, Malissa Lin (MRN 22725311) | workspace.open\|44252521-d61a-4c6f-9f95-fdc9ebba3809\|0\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | home | Open chart: Brooks, Rowan (MRN SH00002872) | workspace.open\|cd235951-b98c-4f65-b692-bd86083151cc\|1\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | home | Open chart: Ellis, Casey (MRN SH00001725) | workspace.open\|80996a80-77c5-46e9-835a-bfbc539f4925\|2\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | home | Open chart: Foster, Riley (MRN SH00002472) | workspace.open\|135d1fd3-c960-415a-9359-6ed187c0e7cd\|3\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | home | Open chart: Hackett, Robert Fritz (MRN 26872402) | workspace.open\|1f091052-6d19-4b6e-92a1-e14946cb74bc\|4\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | home | Open chart: Hernádez, Mario (MRN 72621047) | workspace.open\|3fb650a5-aef2-413e-8519-9a401c2c6274\|5\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | home | Open chart: Kling, Tashia Corazon (MRN 23407288) | workspace.open\|6995fbff-bc47-4634-97e6-c7eb03eed80f\|6\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | home | Open chart: Koss, Emmanuel Guy (MRN 46727478) | workspace.open\|d37291cd-1b5a-460e-8803-d3c1c51bcee7\|7\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | home | Open chart: Park, Taylor (MRN SH00001723) | workspace.open\|21b0f320-2c06-4926-93eb-8ddd0d5f3000\|8\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | home | Open chart: Reed, Drew (MRN SH00001772) | workspace.open\|c6762e08-36a3-408a-a662-eca2379af47e\|9\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | home | Open chart: Reynolds, Chase Ramiro (MRN 72289834) | workspace.open\|cfd64dc0-1d8e-4301-8ef0-bfb72e25e05e\|10\|lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | home | Open chart: Rippin, Silvia Ardelia (MRN 75726058) | workspace.open\|f8bfe5aa-3e41-4995-a01d-af30e805d36f\|11\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | home | Open chart: Schmeler, Burt Hosea (MRN 86720835) | workspace.open\|3b1049a1-e01f-49ac-ad5a-2eadba858974\|12\|lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | home | Open chart: Schmitt, Alva Greg (MRN 82246729) | workspace.open\|6e0f5788-87f2-4580-a892-95000b823484\|13\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | home | Open chart: Schultz, Earnest Sergio (MRN 76725335) | workspace.open\|5ab598cb-5fb7-4559-90ff-aa099cb56dbb\|14\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | home | Open chart: Shaw, Skyler (MRN SH00001972) | workspace.open\|662941eb-3517-449c-8bb5-9195f961f8b6\|15\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | home | Open chart: Torp, Omar (MRN 85507720) | workspace.open\|187a191d-50a8-4cda-9293-5d774f1d87b8\|16\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | home | Open chart: Waters, Marco Rolf (MRN 57280109) | workspace.open\|5e1a035e-fe76-4964-864c-4c2a9ce6f914\|17\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · canonical-P2 | home | Open chart: Wolff, Providencia Karena (MRN 93017203) | workspace.open\|9a769021-7983-40bf-b7ed-748f440537dc\|18\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | home | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | home | Patient search by name or MRN | workspace.search | enter / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Mar | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Mar | Return to patient list | workspace.return | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Mar | Worklist | w4Mar.nav.w4Worklist | click / {"button":{"action":{"goto":{"screen":"w4Worklist"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Mar | Flowsheet | w4Mar.nav.w4Flowsheet | click / {"button":{"action":{"goto":{"screen":"w4Flowsheet"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Mar | Handoff | w4Mar.nav.w4Handoff | click / {"button":{"action":{"goto":{"screen":"w4Handoff"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Mar | Search chart | w4Mar.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Mar | PRN history | w4Mar.marTabs | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Mar | Glucose | w4Mar.marTabs | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Mar | Coagulation labs | w4Mar.marTabs | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Mar | Back | w4Mar.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Mar | Patient workspace | w4Mar.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Mar | New orders | w4Mar.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Mar | Results | w4Mar.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Mar | Notes | w4Mar.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Mar | Encounters | w4Mar.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | w4Mar | Open due medication | w4Mar.openDue | click / {"button":{"action":{"goto":{"screen":"w4Admin"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | home | Open chart: Batz, Malissa Lin (MRN 22725311) | workspace.open\|44252521-d61a-4c6f-9f95-fdc9ebba3809\|0\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | home | Open chart: Brooks, Rowan (MRN SH00002872) | workspace.open\|cd235951-b98c-4f65-b692-bd86083151cc\|1\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | home | Open chart: Ellis, Casey (MRN SH00001725) | workspace.open\|80996a80-77c5-46e9-835a-bfbc539f4925\|2\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | home | Open chart: Foster, Riley (MRN SH00002472) | workspace.open\|135d1fd3-c960-415a-9359-6ed187c0e7cd\|3\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | home | Open chart: Hackett, Robert Fritz (MRN 26872402) | workspace.open\|1f091052-6d19-4b6e-92a1-e14946cb74bc\|4\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | home | Open chart: Hernádez, Mario (MRN 72621047) | workspace.open\|3fb650a5-aef2-413e-8519-9a401c2c6274\|5\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | home | Open chart: Kling, Tashia Corazon (MRN 23407288) | workspace.open\|6995fbff-bc47-4634-97e6-c7eb03eed80f\|6\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | home | Open chart: Koss, Emmanuel Guy (MRN 46727478) | workspace.open\|d37291cd-1b5a-460e-8803-d3c1c51bcee7\|7\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | home | Open chart: Park, Taylor (MRN SH00001723) | workspace.open\|21b0f320-2c06-4926-93eb-8ddd0d5f3000\|8\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | home | Open chart: Reed, Drew (MRN SH00001772) | workspace.open\|c6762e08-36a3-408a-a662-eca2379af47e\|9\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | home | Open chart: Reynolds, Chase Ramiro (MRN 72289834) | workspace.open\|cfd64dc0-1d8e-4301-8ef0-bfb72e25e05e\|10\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | home | Open chart: Rippin, Silvia Ardelia (MRN 75726058) | workspace.open\|f8bfe5aa-3e41-4995-a01d-af30e805d36f\|11\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | home | Open chart: Schmeler, Burt Hosea (MRN 86720835) | workspace.open\|3b1049a1-e01f-49ac-ad5a-2eadba858974\|12\|lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | home | Open chart: Schmitt, Alva Greg (MRN 82246729) | workspace.open\|6e0f5788-87f2-4580-a892-95000b823484\|13\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | home | Open chart: Schultz, Earnest Sergio (MRN 76725335) | workspace.open\|5ab598cb-5fb7-4559-90ff-aa099cb56dbb\|14\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | home | Open chart: Shaw, Skyler (MRN SH00001972) | workspace.open\|662941eb-3517-449c-8bb5-9195f961f8b6\|15\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | home | Open chart: Torp, Omar (MRN 85507720) | workspace.open\|187a191d-50a8-4cda-9293-5d774f1d87b8\|16\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | home | Open chart: Waters, Marco Rolf (MRN 57280109) | workspace.open\|5e1a035e-fe76-4964-864c-4c2a9ce6f914\|17\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · canonical-P3 | home | Open chart: Wolff, Providencia Karena (MRN 93017203) | workspace.open\|9a769021-7983-40bf-b7ed-748f440537dc\|18\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Patient search by name or MRN | workspace.search | enter / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Rooming | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Rooming | Return to patient list | workspace.return | click / lean | works | Lean state changed; result "ok" |
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
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | w5Rooming | Patient workspace | w5Rooming.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Open chart: Batz, Malissa Lin (MRN 22725311) | workspace.open\|44252521-d61a-4c6f-9f95-fdc9ebba3809\|0\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Open chart: Brooks, Rowan (MRN SH00002872) | workspace.open\|cd235951-b98c-4f65-b692-bd86083151cc\|1\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Open chart: Ellis, Casey (MRN SH00001725) | workspace.open\|80996a80-77c5-46e9-835a-bfbc539f4925\|2\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Open chart: Foster, Riley (MRN SH00002472) | workspace.open\|135d1fd3-c960-415a-9359-6ed187c0e7cd\|3\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Open chart: Hackett, Robert Fritz (MRN 26872402) | workspace.open\|1f091052-6d19-4b6e-92a1-e14946cb74bc\|4\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Open chart: Hernádez, Mario (MRN 72621047) | workspace.open\|3fb650a5-aef2-413e-8519-9a401c2c6274\|5\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Open chart: Kling, Tashia Corazon (MRN 23407288) | workspace.open\|6995fbff-bc47-4634-97e6-c7eb03eed80f\|6\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Open chart: Koss, Emmanuel Guy (MRN 46727478) | workspace.open\|d37291cd-1b5a-460e-8803-d3c1c51bcee7\|7\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Open chart: Park, Taylor (MRN SH00001723) | workspace.open\|21b0f320-2c06-4926-93eb-8ddd0d5f3000\|8\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Open chart: Reed, Drew (MRN SH00001772) | workspace.open\|c6762e08-36a3-408a-a662-eca2379af47e\|9\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Open chart: Reynolds, Chase Ramiro (MRN 72289834) | workspace.open\|cfd64dc0-1d8e-4301-8ef0-bfb72e25e05e\|10\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Open chart: Rippin, Silvia Ardelia (MRN 75726058) | workspace.open\|f8bfe5aa-3e41-4995-a01d-af30e805d36f\|11\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Open chart: Schmeler, Burt Hosea (MRN 86720835) | workspace.open\|3b1049a1-e01f-49ac-ad5a-2eadba858974\|12\|lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Open chart: Schmitt, Alva Greg (MRN 82246729) | workspace.open\|6e0f5788-87f2-4580-a892-95000b823484\|13\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Open chart: Schultz, Earnest Sergio (MRN 76725335) | workspace.open\|5ab598cb-5fb7-4559-90ff-aa099cb56dbb\|14\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Open chart: Shaw, Skyler (MRN SH00001972) | workspace.open\|662941eb-3517-449c-8bb5-9195f961f8b6\|15\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Open chart: Torp, Omar (MRN 85507720) | workspace.open\|187a191d-50a8-4cda-9293-5d774f1d87b8\|16\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Open chart: Waters, Marco Rolf (MRN 57280109) | workspace.open\|5e1a035e-fe76-4964-864c-4c2a9ce6f914\|17\|lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P4 · canonical-P4 | home | Open chart: Wolff, Providencia Karena (MRN 93017203) | workspace.open\|9a769021-7983-40bf-b7ed-748f440537dc\|18\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Patient search by name or MRN | workspace.search | enter / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Patient Lookup | workspace.lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Return to patient list | workspace.return | click / lean | works | Lean state changed; result "ok" |
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
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | w6PreOp | Expand section | w6PreOp.chart.includeResolved | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
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
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Batz, Malissa Lin (MRN 22725311) | workspace.open\|44252521-d61a-4c6f-9f95-fdc9ebba3809\|0\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Brooks, Rowan (MRN SH00002872) | workspace.open\|cd235951-b98c-4f65-b692-bd86083151cc\|1\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Ellis, Casey (MRN SH00001725) | workspace.open\|80996a80-77c5-46e9-835a-bfbc539f4925\|2\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Foster, Riley (MRN SH00002472) | workspace.open\|135d1fd3-c960-415a-9359-6ed187c0e7cd\|3\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Hackett, Robert Fritz (MRN 26872402) | workspace.open\|1f091052-6d19-4b6e-92a1-e14946cb74bc\|4\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Hernádez, Mario (MRN 72621047) | workspace.open\|3fb650a5-aef2-413e-8519-9a401c2c6274\|5\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Kling, Tashia Corazon (MRN 23407288) | workspace.open\|6995fbff-bc47-4634-97e6-c7eb03eed80f\|6\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Koss, Emmanuel Guy (MRN 46727478) | workspace.open\|d37291cd-1b5a-460e-8803-d3c1c51bcee7\|7\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Park, Taylor (MRN SH00001723) | workspace.open\|21b0f320-2c06-4926-93eb-8ddd0d5f3000\|8\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Reed, Drew (MRN SH00001772) | workspace.open\|c6762e08-36a3-408a-a662-eca2379af47e\|9\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Reynolds, Chase Ramiro (MRN 72289834) | workspace.open\|cfd64dc0-1d8e-4301-8ef0-bfb72e25e05e\|10\|lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Rippin, Silvia Ardelia (MRN 75726058) | workspace.open\|f8bfe5aa-3e41-4995-a01d-af30e805d36f\|11\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Schmeler, Burt Hosea (MRN 86720835) | workspace.open\|3b1049a1-e01f-49ac-ad5a-2eadba858974\|12\|lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Schmitt, Alva Greg (MRN 82246729) | workspace.open\|6e0f5788-87f2-4580-a892-95000b823484\|13\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Schultz, Earnest Sergio (MRN 76725335) | workspace.open\|5ab598cb-5fb7-4559-90ff-aa099cb56dbb\|14\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Shaw, Skyler (MRN SH00001972) | workspace.open\|662941eb-3517-449c-8bb5-9195f961f8b6\|15\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Torp, Omar (MRN 85507720) | workspace.open\|187a191d-50a8-4cda-9293-5d774f1d87b8\|16\|lookup | click / lean | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Waters, Marco Rolf (MRN 57280109) | workspace.open\|5e1a035e-fe76-4964-864c-4c2a9ce6f914\|17\|lookup | click / lean | works | Lean state changed; result "ok" |
| /?audit=buttons&inspect=1 · P5 · canonical-P5 | home | Open chart: Wolff, Providencia Karena (MRN 93017203) | workspace.open\|9a769021-7983-40bf-b7ed-748f440537dc\|18\|lookup | click / lean | works | DOM changed |
