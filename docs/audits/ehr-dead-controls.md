# Lean-rendered dead controls

Content lane: remove inert components or give them interpreter behavior. Render lane: emit click component metadata for nav/stepper destinations. Static nav entries and stepper labels are listed explicitly even when they are not DOM buttons.

| Route / persona / program | Screen | Label | Comp id | Kind / owner | Status | Observed effect |
|---|---|---|---|---|---|---|
| / · P1 · canonical-P1 | home | 1Patient workspace | — | nav/stepper → home; missing click metadata / lean | dead | Static label for home; no interpreter click component supplied |
| /?audit=buttons · P1 · canonical-P1 | home | Search chart | home.chartSearch | search / {"search":{"scope":"chart"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| / · P1 · canonical-P1 | w1Rooming | 1Rooming | — | nav/stepper → w1Rooming; missing click metadata / lean | dead | Static label for w1Rooming; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Rooming | 2Med rec | — | nav/stepper → w1MedRec; missing click metadata / lean | dead | Static label for w1MedRec; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Rooming | 3HPI / ROS | — | nav/stepper → w1Hpi; missing click metadata / lean | dead | Static label for w1Hpi; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Rooming | 4Exam / A&P | — | nav/stepper → w1Exam; missing click metadata / lean | dead | Static label for w1Exam; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Rooming | 5Orders | — | nav/stepper → w1Orders; missing click metadata / lean | dead | Static label for w1Orders; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Rooming | 6Lab orders | — | nav/stepper → w1Labs; missing click metadata / lean | dead | Static label for w1Labs; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Rooming | 7Verify orders | — | nav/stepper → w1Verify; missing click metadata / lean | dead | Static label for w1Verify; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Rooming | 8Sign orders | — | nav/stepper → w1Sign; missing click metadata / lean | dead | Static label for w1Sign; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Rooming | 9Close visit | — | nav/stepper → w1Close; missing click metadata / lean | dead | Static label for w1Close; no interpreter click component supplied |
| /?audit=buttons · P1 · canonical-P1 | w1Rooming | Search chart | w1Rooming.chartSearch | search / {"search":{"scope":"chart"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| / · P1 · canonical-P1 | w2Inbasket | 1In-basket | — | nav/stepper → w2Inbasket; missing click metadata / lean | dead | Static label for w2Inbasket; no interpreter click component supplied |
| / · P1 · canonical-P1 | w2Inbasket | 2Result | — | nav/stepper → w2Result; missing click metadata / lean | dead | Static label for w2Result; no interpreter click component supplied |
| / · P1 · canonical-P1 | w2Inbasket | 3Message patient | — | nav/stepper → w2Message; missing click metadata / lean | dead | Static label for w2Message; no interpreter click component supplied |
| /?audit=buttons · P1 · canonical-P1 | w2Inbasket | Search chart | w2Inbasket.chartSearch | search / {"search":{"scope":"chart"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Inbasket | Search in-basket | w2Inbasket.basketSearch | search / {"search":{"scope":"inbasket"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| / · P1 · canonical-P1 | w7Queue | 1Refill requests | — | nav/stepper → w7Queue; missing click metadata / lean | dead | Static label for w7Queue; no interpreter click component supplied |
| / · P1 · canonical-P1 | w7Queue | 2Refill: chart review | — | nav/stepper → w7Review; missing click metadata / lean | dead | Static label for w7Review; no interpreter click component supplied |
| / · P1 · canonical-P1 | w7Queue | 3Refill decision | — | nav/stepper → w7Decision; missing click metadata / lean | dead | Static label for w7Decision; no interpreter click component supplied |
| /?audit=buttons · P1 · canonical-P1 | w7Queue | Search chart | w7Queue.chartSearch | search / {"search":{"scope":"chart"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| / · P1 · canonical-P1 | w3TrackBoard | 1ED board | — | nav/stepper → w3TrackBoard; missing click metadata / lean | dead | Static label for w3TrackBoard; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3TrackBoard | 2Triage | — | nav/stepper → w3Triage; missing click metadata / lean | dead | Static label for w3Triage; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3TrackBoard | 3ED evaluation | — | nav/stepper → w3Provider; missing click metadata / lean | dead | Static label for w3Provider; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3TrackBoard | 4ED order sets | — | nav/stepper → w3OrderSets; missing click metadata / lean | dead | Static label for w3OrderSets; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3TrackBoard | 5Orders | — | nav/stepper → w3Orders; missing click metadata / lean | dead | Static label for w3Orders; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3TrackBoard | 6Sign orders | — | nav/stepper → w3Sign; missing click metadata / lean | dead | Static label for w3Sign; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3TrackBoard | 7Disposition | — | nav/stepper → w3Disposition; missing click metadata / lean | dead | Static label for w3Disposition; no interpreter click component supplied |
| /?audit=buttons · P1 · canonical-P1 | w3TrackBoard | Search chart | w3TrackBoard.chartSearch | search / {"search":{"scope":"chart"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| / · P1 · canonical-P1 | w4Worklist | 1Shift worklist | — | nav/stepper → w4Worklist; missing click metadata / lean | dead | Static label for w4Worklist; no interpreter click component supplied |
| / · P1 · canonical-P1 | w4Worklist | 2MAR | — | nav/stepper → w4Mar; missing click metadata / lean | dead | Static label for w4Mar; no interpreter click component supplied |
| / · P1 · canonical-P1 | w4Worklist | 3Administer medication | — | nav/stepper → w4Admin; missing click metadata / lean | dead | Static label for w4Admin; no interpreter click component supplied |
| / · P1 · canonical-P1 | w4Worklist | 4Flowsheet | — | nav/stepper → w4Flowsheet; missing click metadata / lean | dead | Static label for w4Flowsheet; no interpreter click component supplied |
| / · P1 · canonical-P1 | w4Worklist | 5Handoff | — | nav/stepper → w4Handoff; missing click metadata / lean | dead | Static label for w4Handoff; no interpreter click component supplied |
| /?audit=buttons · P1 · canonical-P1 | w4Worklist | Search chart | w4Worklist.chartSearch | search / {"search":{"scope":"chart"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| / · P1 · canonical-P1 | w5Rooming | 1Pediatric rooming | — | nav/stepper → w5Rooming; missing click metadata / lean | dead | Static label for w5Rooming; no interpreter click component supplied |
| / · P1 · canonical-P1 | w5Rooming | 2Growth review | — | nav/stepper → w5Growth; missing click metadata / lean | dead | Static label for w5Growth; no interpreter click component supplied |
| / · P1 · canonical-P1 | w5Rooming | 3Orders (weight-based) | — | nav/stepper → w5Orders; missing click metadata / lean | dead | Static label for w5Orders; no interpreter click component supplied |
| / · P1 · canonical-P1 | w5Rooming | 4Sign orders | — | nav/stepper → w5Sign; missing click metadata / lean | dead | Static label for w5Sign; no interpreter click component supplied |
| / · P1 · canonical-P1 | w5Rooming | 5Immunizations | — | nav/stepper → w5Immunizations; missing click metadata / lean | dead | Static label for w5Immunizations; no interpreter click component supplied |
| / · P1 · canonical-P1 | w5Rooming | 6Visit close | — | nav/stepper → w5Close; missing click metadata / lean | dead | Static label for w5Close; no interpreter click component supplied |
| /?audit=buttons · P1 · canonical-P1 | w5Rooming | Search chart | w5Rooming.chartSearch | search / {"search":{"scope":"chart"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| / · P1 · canonical-P1 | w6Consult | 1Surgical consult | — | nav/stepper → w6Consult; missing click metadata / lean | dead | Static label for w6Consult; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6Consult | 2Close consult | — | nav/stepper → w6ConsultClose; missing click metadata / lean | dead | Static label for w6ConsultClose; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6Consult | 3Pre-op | — | nav/stepper → w6PreOp; missing click metadata / lean | dead | Static label for w6PreOp; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6Consult | 4Orders | — | nav/stepper → w6Orders; missing click metadata / lean | dead | Static label for w6Orders; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6Consult | 5Post-op order set | — | nav/stepper → w6PostOp; missing click metadata / lean | dead | Static label for w6PostOp; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6Consult | 6Sign orders | — | nav/stepper → w6Sign; missing click metadata / lean | dead | Static label for w6Sign; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6Consult | 7Brief op note | — | nav/stepper → w6OpNote; missing click metadata / lean | dead | Static label for w6OpNote; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6Consult | 8Rounding | — | nav/stepper → w6Rounding; missing click metadata / lean | dead | Static label for w6Rounding; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6Consult | 9Discharge | — | nav/stepper → w6Discharge; missing click metadata / lean | dead | Static label for w6Discharge; no interpreter click component supplied |
| /?audit=buttons · P1 · canonical-P1 | w6Consult | Search chart | w6Consult.chartSearch | search / {"search":{"scope":"chart"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| / · P1 · canonical-P1 | w6PreOp | 1Surgical consult | — | nav/stepper → w6Consult; missing click metadata / lean | dead | Static label for w6Consult; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6PreOp | 2Close consult | — | nav/stepper → w6ConsultClose; missing click metadata / lean | dead | Static label for w6ConsultClose; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6PreOp | 3Pre-op | — | nav/stepper → w6PreOp; missing click metadata / lean | dead | Static label for w6PreOp; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6PreOp | 4Orders | — | nav/stepper → w6Orders; missing click metadata / lean | dead | Static label for w6Orders; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6PreOp | 5Post-op order set | — | nav/stepper → w6PostOp; missing click metadata / lean | dead | Static label for w6PostOp; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6PreOp | 6Sign orders | — | nav/stepper → w6Sign; missing click metadata / lean | dead | Static label for w6Sign; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6PreOp | 7Brief op note | — | nav/stepper → w6OpNote; missing click metadata / lean | dead | Static label for w6OpNote; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6PreOp | 8Rounding | — | nav/stepper → w6Rounding; missing click metadata / lean | dead | Static label for w6Rounding; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6PreOp | 9Discharge | — | nav/stepper → w6Discharge; missing click metadata / lean | dead | Static label for w6Discharge; no interpreter click component supplied |
| /?audit=buttons · P1 · canonical-P1 | w6PreOp | Search chart | w6PreOp.chartSearch | search / {"search":{"scope":"chart"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| / · P1 · canonical-P1 | w6OpNote | 1Surgical consult | — | nav/stepper → w6Consult; missing click metadata / lean | dead | Static label for w6Consult; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6OpNote | 2Close consult | — | nav/stepper → w6ConsultClose; missing click metadata / lean | dead | Static label for w6ConsultClose; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6OpNote | 3Pre-op | — | nav/stepper → w6PreOp; missing click metadata / lean | dead | Static label for w6PreOp; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6OpNote | 4Orders | — | nav/stepper → w6Orders; missing click metadata / lean | dead | Static label for w6Orders; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6OpNote | 5Post-op order set | — | nav/stepper → w6PostOp; missing click metadata / lean | dead | Static label for w6PostOp; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6OpNote | 6Sign orders | — | nav/stepper → w6Sign; missing click metadata / lean | dead | Static label for w6Sign; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6OpNote | 7Brief op note | — | nav/stepper → w6OpNote; missing click metadata / lean | dead | Static label for w6OpNote; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6OpNote | 8Rounding | — | nav/stepper → w6Rounding; missing click metadata / lean | dead | Static label for w6Rounding; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6OpNote | 9Discharge | — | nav/stepper → w6Discharge; missing click metadata / lean | dead | Static label for w6Discharge; no interpreter click component supplied |
| /?audit=buttons · P1 · canonical-P1 | w6OpNote | Search chart | w6OpNote.chartSearch | search / {"search":{"scope":"chart"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| / · P1 · canonical-P1 | w6PostOp | 1Surgical consult | — | nav/stepper → w6Consult; missing click metadata / lean | dead | Static label for w6Consult; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6PostOp | 2Close consult | — | nav/stepper → w6ConsultClose; missing click metadata / lean | dead | Static label for w6ConsultClose; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6PostOp | 3Pre-op | — | nav/stepper → w6PreOp; missing click metadata / lean | dead | Static label for w6PreOp; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6PostOp | 4Orders | — | nav/stepper → w6Orders; missing click metadata / lean | dead | Static label for w6Orders; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6PostOp | 5Post-op order set | — | nav/stepper → w6PostOp; missing click metadata / lean | dead | Static label for w6PostOp; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6PostOp | 6Sign orders | — | nav/stepper → w6Sign; missing click metadata / lean | dead | Static label for w6Sign; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6PostOp | 7Brief op note | — | nav/stepper → w6OpNote; missing click metadata / lean | dead | Static label for w6OpNote; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6PostOp | 8Rounding | — | nav/stepper → w6Rounding; missing click metadata / lean | dead | Static label for w6Rounding; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6PostOp | 9Discharge | — | nav/stepper → w6Discharge; missing click metadata / lean | dead | Static label for w6Discharge; no interpreter click component supplied |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Search chart | w6PostOp.chartSearch | search / {"search":{"scope":"chart"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| / · P1 · canonical-P1 | w6Rounding | 1Surgical consult | — | nav/stepper → w6Consult; missing click metadata / lean | dead | Static label for w6Consult; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6Rounding | 2Close consult | — | nav/stepper → w6ConsultClose; missing click metadata / lean | dead | Static label for w6ConsultClose; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6Rounding | 3Pre-op | — | nav/stepper → w6PreOp; missing click metadata / lean | dead | Static label for w6PreOp; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6Rounding | 4Orders | — | nav/stepper → w6Orders; missing click metadata / lean | dead | Static label for w6Orders; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6Rounding | 5Post-op order set | — | nav/stepper → w6PostOp; missing click metadata / lean | dead | Static label for w6PostOp; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6Rounding | 6Sign orders | — | nav/stepper → w6Sign; missing click metadata / lean | dead | Static label for w6Sign; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6Rounding | 7Brief op note | — | nav/stepper → w6OpNote; missing click metadata / lean | dead | Static label for w6OpNote; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6Rounding | 8Rounding | — | nav/stepper → w6Rounding; missing click metadata / lean | dead | Static label for w6Rounding; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6Rounding | 9Discharge | — | nav/stepper → w6Discharge; missing click metadata / lean | dead | Static label for w6Discharge; no interpreter click component supplied |
| /?audit=buttons · P1 · canonical-P1 | w6Rounding | Search chart | w6Rounding.chartSearch | search / {"search":{"scope":"chart"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| / · P1 · canonical-P1 | w6Discharge | 1Surgical consult | — | nav/stepper → w6Consult; missing click metadata / lean | dead | Static label for w6Consult; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6Discharge | 2Close consult | — | nav/stepper → w6ConsultClose; missing click metadata / lean | dead | Static label for w6ConsultClose; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6Discharge | 3Pre-op | — | nav/stepper → w6PreOp; missing click metadata / lean | dead | Static label for w6PreOp; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6Discharge | 4Orders | — | nav/stepper → w6Orders; missing click metadata / lean | dead | Static label for w6Orders; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6Discharge | 5Post-op order set | — | nav/stepper → w6PostOp; missing click metadata / lean | dead | Static label for w6PostOp; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6Discharge | 6Sign orders | — | nav/stepper → w6Sign; missing click metadata / lean | dead | Static label for w6Sign; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6Discharge | 7Brief op note | — | nav/stepper → w6OpNote; missing click metadata / lean | dead | Static label for w6OpNote; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6Discharge | 8Rounding | — | nav/stepper → w6Rounding; missing click metadata / lean | dead | Static label for w6Rounding; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6Discharge | 9Discharge | — | nav/stepper → w6Discharge; missing click metadata / lean | dead | Static label for w6Discharge; no interpreter click component supplied |
| /?audit=buttons · P1 · canonical-P1 | w6Discharge | Search chart | w6Discharge.chartSearch | search / {"search":{"scope":"chart"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| / · P1 · canonical-P1 | w1MedRec | 1Rooming | — | nav/stepper → w1Rooming; missing click metadata / lean | dead | Static label for w1Rooming; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1MedRec | 2Med rec | — | nav/stepper → w1MedRec; missing click metadata / lean | dead | Static label for w1MedRec; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1MedRec | 3HPI / ROS | — | nav/stepper → w1Hpi; missing click metadata / lean | dead | Static label for w1Hpi; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1MedRec | 4Exam / A&P | — | nav/stepper → w1Exam; missing click metadata / lean | dead | Static label for w1Exam; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1MedRec | 5Orders | — | nav/stepper → w1Orders; missing click metadata / lean | dead | Static label for w1Orders; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1MedRec | 6Lab orders | — | nav/stepper → w1Labs; missing click metadata / lean | dead | Static label for w1Labs; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1MedRec | 7Verify orders | — | nav/stepper → w1Verify; missing click metadata / lean | dead | Static label for w1Verify; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1MedRec | 8Sign orders | — | nav/stepper → w1Sign; missing click metadata / lean | dead | Static label for w1Sign; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1MedRec | 9Close visit | — | nav/stepper → w1Close; missing click metadata / lean | dead | Static label for w1Close; no interpreter click component supplied |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Search chart | w1MedRec.chartSearch | search / {"search":{"scope":"chart"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| / · P1 · canonical-P1 | w1Hpi | 1Rooming | — | nav/stepper → w1Rooming; missing click metadata / lean | dead | Static label for w1Rooming; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Hpi | 2Med rec | — | nav/stepper → w1MedRec; missing click metadata / lean | dead | Static label for w1MedRec; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Hpi | 3HPI / ROS | — | nav/stepper → w1Hpi; missing click metadata / lean | dead | Static label for w1Hpi; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Hpi | 4Exam / A&P | — | nav/stepper → w1Exam; missing click metadata / lean | dead | Static label for w1Exam; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Hpi | 5Orders | — | nav/stepper → w1Orders; missing click metadata / lean | dead | Static label for w1Orders; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Hpi | 6Lab orders | — | nav/stepper → w1Labs; missing click metadata / lean | dead | Static label for w1Labs; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Hpi | 7Verify orders | — | nav/stepper → w1Verify; missing click metadata / lean | dead | Static label for w1Verify; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Hpi | 8Sign orders | — | nav/stepper → w1Sign; missing click metadata / lean | dead | Static label for w1Sign; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Hpi | 9Close visit | — | nav/stepper → w1Close; missing click metadata / lean | dead | Static label for w1Close; no interpreter click component supplied |
| /?audit=buttons · P1 · canonical-P1 | w1Hpi | Search chart | w1Hpi.chartSearch | search / {"search":{"scope":"chart"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| / · P1 · canonical-P1 | w1Exam | 1Rooming | — | nav/stepper → w1Rooming; missing click metadata / lean | dead | Static label for w1Rooming; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Exam | 2Med rec | — | nav/stepper → w1MedRec; missing click metadata / lean | dead | Static label for w1MedRec; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Exam | 3HPI / ROS | — | nav/stepper → w1Hpi; missing click metadata / lean | dead | Static label for w1Hpi; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Exam | 4Exam / A&P | — | nav/stepper → w1Exam; missing click metadata / lean | dead | Static label for w1Exam; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Exam | 5Orders | — | nav/stepper → w1Orders; missing click metadata / lean | dead | Static label for w1Orders; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Exam | 6Lab orders | — | nav/stepper → w1Labs; missing click metadata / lean | dead | Static label for w1Labs; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Exam | 7Verify orders | — | nav/stepper → w1Verify; missing click metadata / lean | dead | Static label for w1Verify; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Exam | 8Sign orders | — | nav/stepper → w1Sign; missing click metadata / lean | dead | Static label for w1Sign; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Exam | 9Close visit | — | nav/stepper → w1Close; missing click metadata / lean | dead | Static label for w1Close; no interpreter click component supplied |
| /?audit=buttons · P1 · canonical-P1 | w1Exam | Search chart | w1Exam.chartSearch | search / {"search":{"scope":"chart"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| / · P1 · canonical-P1 | w1Orders | 1Rooming | — | nav/stepper → w1Rooming; missing click metadata / lean | dead | Static label for w1Rooming; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Orders | 2Med rec | — | nav/stepper → w1MedRec; missing click metadata / lean | dead | Static label for w1MedRec; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Orders | 3HPI / ROS | — | nav/stepper → w1Hpi; missing click metadata / lean | dead | Static label for w1Hpi; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Orders | 4Exam / A&P | — | nav/stepper → w1Exam; missing click metadata / lean | dead | Static label for w1Exam; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Orders | 5Orders | — | nav/stepper → w1Orders; missing click metadata / lean | dead | Static label for w1Orders; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Orders | 6Lab orders | — | nav/stepper → w1Labs; missing click metadata / lean | dead | Static label for w1Labs; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Orders | 7Verify orders | — | nav/stepper → w1Verify; missing click metadata / lean | dead | Static label for w1Verify; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Orders | 8Sign orders | — | nav/stepper → w1Sign; missing click metadata / lean | dead | Static label for w1Sign; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Orders | 9Close visit | — | nav/stepper → w1Close; missing click metadata / lean | dead | Static label for w1Close; no interpreter click component supplied |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Search chart | w1Orders.chartSearch | search / {"search":{"scope":"chart"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Find orders | w1Orders.orderSearch | search / {"search":{"scope":"formulary"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| / · P1 · canonical-P1 | w1Labs | 1Rooming | — | nav/stepper → w1Rooming; missing click metadata / lean | dead | Static label for w1Rooming; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Labs | 2Med rec | — | nav/stepper → w1MedRec; missing click metadata / lean | dead | Static label for w1MedRec; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Labs | 3HPI / ROS | — | nav/stepper → w1Hpi; missing click metadata / lean | dead | Static label for w1Hpi; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Labs | 4Exam / A&P | — | nav/stepper → w1Exam; missing click metadata / lean | dead | Static label for w1Exam; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Labs | 5Orders | — | nav/stepper → w1Orders; missing click metadata / lean | dead | Static label for w1Orders; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Labs | 6Lab orders | — | nav/stepper → w1Labs; missing click metadata / lean | dead | Static label for w1Labs; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Labs | 7Verify orders | — | nav/stepper → w1Verify; missing click metadata / lean | dead | Static label for w1Verify; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Labs | 8Sign orders | — | nav/stepper → w1Sign; missing click metadata / lean | dead | Static label for w1Sign; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Labs | 9Close visit | — | nav/stepper → w1Close; missing click metadata / lean | dead | Static label for w1Close; no interpreter click component supplied |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Search chart | w1Labs.chartSearch | search / {"search":{"scope":"chart"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Search lab tests | w1Labs.labSearch | search / {"search":{"scope":"loinc"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| / · P1 · canonical-P1 | w1Close | 1Rooming | — | nav/stepper → w1Rooming; missing click metadata / lean | dead | Static label for w1Rooming; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Close | 2Med rec | — | nav/stepper → w1MedRec; missing click metadata / lean | dead | Static label for w1MedRec; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Close | 3HPI / ROS | — | nav/stepper → w1Hpi; missing click metadata / lean | dead | Static label for w1Hpi; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Close | 4Exam / A&P | — | nav/stepper → w1Exam; missing click metadata / lean | dead | Static label for w1Exam; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Close | 5Orders | — | nav/stepper → w1Orders; missing click metadata / lean | dead | Static label for w1Orders; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Close | 6Lab orders | — | nav/stepper → w1Labs; missing click metadata / lean | dead | Static label for w1Labs; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Close | 7Verify orders | — | nav/stepper → w1Verify; missing click metadata / lean | dead | Static label for w1Verify; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Close | 8Sign orders | — | nav/stepper → w1Sign; missing click metadata / lean | dead | Static label for w1Sign; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Close | 9Close visit | — | nav/stepper → w1Close; missing click metadata / lean | dead | Static label for w1Close; no interpreter click component supplied |
| /?audit=buttons · P1 · canonical-P1 | w1Close | Search chart | w1Close.chartSearch | search / {"search":{"scope":"chart"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| / · P1 · canonical-P1 | w2Result | 1In-basket | — | nav/stepper → w2Inbasket; missing click metadata / lean | dead | Static label for w2Inbasket; no interpreter click component supplied |
| / · P1 · canonical-P1 | w2Result | 2Result | — | nav/stepper → w2Result; missing click metadata / lean | dead | Static label for w2Result; no interpreter click component supplied |
| / · P1 · canonical-P1 | w2Result | 3Message patient | — | nav/stepper → w2Message; missing click metadata / lean | dead | Static label for w2Message; no interpreter click component supplied |
| /?audit=buttons · P1 · canonical-P1 | w2Result | Search chart | w2Result.chartSearch | search / {"search":{"scope":"chart"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| / · P1 · canonical-P1 | w2Message | 1In-basket | — | nav/stepper → w2Inbasket; missing click metadata / lean | dead | Static label for w2Inbasket; no interpreter click component supplied |
| / · P1 · canonical-P1 | w2Message | 2Result | — | nav/stepper → w2Result; missing click metadata / lean | dead | Static label for w2Result; no interpreter click component supplied |
| / · P1 · canonical-P1 | w2Message | 3Message patient | — | nav/stepper → w2Message; missing click metadata / lean | dead | Static label for w2Message; no interpreter click component supplied |
| /?audit=buttons · P1 · canonical-P1 | w2Message | Search chart | w2Message.chartSearch | search / {"search":{"scope":"chart"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| / · P1 · canonical-P1 | w7Review | 1Refill requests | — | nav/stepper → w7Queue; missing click metadata / lean | dead | Static label for w7Queue; no interpreter click component supplied |
| / · P1 · canonical-P1 | w7Review | 2Refill: chart review | — | nav/stepper → w7Review; missing click metadata / lean | dead | Static label for w7Review; no interpreter click component supplied |
| / · P1 · canonical-P1 | w7Review | 3Refill decision | — | nav/stepper → w7Decision; missing click metadata / lean | dead | Static label for w7Decision; no interpreter click component supplied |
| /?audit=buttons · P1 · canonical-P1 | w7Review | Search chart | w7Review.chartSearch | search / {"search":{"scope":"chart"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| / · P1 · canonical-P1 | w3Triage | 1ED board | — | nav/stepper → w3TrackBoard; missing click metadata / lean | dead | Static label for w3TrackBoard; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3Triage | 2Triage | — | nav/stepper → w3Triage; missing click metadata / lean | dead | Static label for w3Triage; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3Triage | 3ED evaluation | — | nav/stepper → w3Provider; missing click metadata / lean | dead | Static label for w3Provider; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3Triage | 4ED order sets | — | nav/stepper → w3OrderSets; missing click metadata / lean | dead | Static label for w3OrderSets; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3Triage | 5Orders | — | nav/stepper → w3Orders; missing click metadata / lean | dead | Static label for w3Orders; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3Triage | 6Sign orders | — | nav/stepper → w3Sign; missing click metadata / lean | dead | Static label for w3Sign; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3Triage | 7Disposition | — | nav/stepper → w3Disposition; missing click metadata / lean | dead | Static label for w3Disposition; no interpreter click component supplied |
| /?audit=buttons · P1 · canonical-P1 | w3Triage | Search chart | w3Triage.chartSearch | search / {"search":{"scope":"chart"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| / · P1 · canonical-P1 | w3Provider | 1ED board | — | nav/stepper → w3TrackBoard; missing click metadata / lean | dead | Static label for w3TrackBoard; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3Provider | 2Triage | — | nav/stepper → w3Triage; missing click metadata / lean | dead | Static label for w3Triage; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3Provider | 3ED evaluation | — | nav/stepper → w3Provider; missing click metadata / lean | dead | Static label for w3Provider; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3Provider | 4ED order sets | — | nav/stepper → w3OrderSets; missing click metadata / lean | dead | Static label for w3OrderSets; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3Provider | 5Orders | — | nav/stepper → w3Orders; missing click metadata / lean | dead | Static label for w3Orders; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3Provider | 6Sign orders | — | nav/stepper → w3Sign; missing click metadata / lean | dead | Static label for w3Sign; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3Provider | 7Disposition | — | nav/stepper → w3Disposition; missing click metadata / lean | dead | Static label for w3Disposition; no interpreter click component supplied |
| /?audit=buttons · P1 · canonical-P1 | w3Provider | Search chart | w3Provider.chartSearch | search / {"search":{"scope":"chart"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| / · P1 · canonical-P1 | w3OrderSets | 1ED board | — | nav/stepper → w3TrackBoard; missing click metadata / lean | dead | Static label for w3TrackBoard; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3OrderSets | 2Triage | — | nav/stepper → w3Triage; missing click metadata / lean | dead | Static label for w3Triage; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3OrderSets | 3ED evaluation | — | nav/stepper → w3Provider; missing click metadata / lean | dead | Static label for w3Provider; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3OrderSets | 4ED order sets | — | nav/stepper → w3OrderSets; missing click metadata / lean | dead | Static label for w3OrderSets; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3OrderSets | 5Orders | — | nav/stepper → w3Orders; missing click metadata / lean | dead | Static label for w3Orders; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3OrderSets | 6Sign orders | — | nav/stepper → w3Sign; missing click metadata / lean | dead | Static label for w3Sign; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3OrderSets | 7Disposition | — | nav/stepper → w3Disposition; missing click metadata / lean | dead | Static label for w3Disposition; no interpreter click component supplied |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Search chart | w3OrderSets.chartSearch | search / {"search":{"scope":"chart"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| / · P1 · canonical-P1 | w3Orders | 1ED board | — | nav/stepper → w3TrackBoard; missing click metadata / lean | dead | Static label for w3TrackBoard; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3Orders | 2Triage | — | nav/stepper → w3Triage; missing click metadata / lean | dead | Static label for w3Triage; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3Orders | 3ED evaluation | — | nav/stepper → w3Provider; missing click metadata / lean | dead | Static label for w3Provider; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3Orders | 4ED order sets | — | nav/stepper → w3OrderSets; missing click metadata / lean | dead | Static label for w3OrderSets; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3Orders | 5Orders | — | nav/stepper → w3Orders; missing click metadata / lean | dead | Static label for w3Orders; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3Orders | 6Sign orders | — | nav/stepper → w3Sign; missing click metadata / lean | dead | Static label for w3Sign; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3Orders | 7Disposition | — | nav/stepper → w3Disposition; missing click metadata / lean | dead | Static label for w3Disposition; no interpreter click component supplied |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | Search chart | w3Orders.chartSearch | search / {"search":{"scope":"chart"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | Find orders | w3Orders.orderSearch | search / {"search":{"scope":"formulary"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
