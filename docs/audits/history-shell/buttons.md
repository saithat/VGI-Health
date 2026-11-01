# Button audit

Generated 2026-11-01T16:06:05.288Z. Preview build; one Chromium worker.

| Scope | Works | Disabled with reason | Dead | Error |
|---|---:|---:|---:|---:|
| App baseline | 0 | 0 | 0 | 0 |
| App final | 352 | 71 | 0 | 0 |
| Lean final | 0 | 0 | 0 | 0 |

App coverage includes additional worklist and drawer controls after the baseline. A complete pre-fix Lean census was not retained; see README.md.

Each sampled enabled control is clicked from an observed checkpoint. A changed input echo alone does not certify a Lean search. Selected navigation and reset controls must provide feedback or a disabled reason. Disabled commits are recorded with Lean's actual reason; the audit never fabricates safety evidence to enable a write.

| Route / persona / program | Screen | Label | Comp id | Kind / owner | Status | Observed effect |
|---|---|---|---|---|---|---|
| /?audit=buttons&inspect=1 · P1 · — | sign-in | P1 · Primary care | — | button / app | works | POST /__dev/persona-password |
| /?audit=buttons&inspect=1 · P1 · — | worklist | Worklist date | — | input / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · — | worklist | Refresh worklist | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · — | worklist | Search patients | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · — | worklist | Terrance Len Abshire · 1943-12-29 | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · — | encounter picker | Live encounter | — | select / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · — | encounter picker | Medication order / MAR No medication selectedinsulin isophane, human 70 UNT/ML / insulin, regular, human 30 UNT/ML Injectable Suspension [Humulin] · dolutegravir 50 MG Oral Tablet · 24 HR tacrolimus 1 MG Extended Release Oral Tablet [Envarsus] · Take as needed.lamivudine 300 MG / tenofovir disoproxil fumarate 300 MG Oral Tablet · lisinopril 10 MG Oral Tablet · Take lisinopril 10 MG Oral Tablet by mouth daily. | — | select / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · — | encounter picker | Start new encounter | — | button / app | works | POST /medplum/fhir/R4 |
| /?audit=buttons&inspect=1 · P1 · — | encounter picker | Open EHR | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · — | live encounter header | Live encounter | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · — | live encounter header | Close live encounter | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · — | live encounter header | Return to worklist | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P1 · — | live encounter header | Sign out | — | button / app | works | POST /medplum/oauth2/logout |
| /?audit=buttons&inspect=1 · P2 · — | sign-in | P2 · Emergency | — | button / app | works | POST /__dev/persona-password; POST /medplum/auth/login; POST /medplum/oauth2/token |
| /?audit=buttons&inspect=1 · P2 · — | worklist | Worklist date | — | input / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · — | worklist | Refresh worklist | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · — | worklist | Search patients | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · — | worklist | Terrance Len Abshire · 1943-12-29 | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · — | encounter picker | Live encounter | — | select / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · — | encounter picker | Medication order / MAR No medication selectedinsulin isophane, human 70 UNT/ML / insulin, regular, human 30 UNT/ML Injectable Suspension [Humulin] · dolutegravir 50 MG Oral Tablet · 24 HR tacrolimus 1 MG Extended Release Oral Tablet [Envarsus] · Take as needed.lamivudine 300 MG / tenofovir disoproxil fumarate 300 MG Oral Tablet · lisinopril 10 MG Oral Tablet · Take lisinopril 10 MG Oral Tablet by mouth daily. | — | select / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · — | encounter picker | Admission bed Select a bed for admit4W-02-AED 20ED 18ED 224W-01-AED 05ED 14ED 07ED 08ED 09ED 11Bed 4W-01-ABed 4W-03-ABed 4W-04-ABed 4W-02-ABed 4W-05-ABed 4W-06-ABed 5S-01-A4W-06-A5S-01-A4W-07-AED 01ED 02ED 03ED 04ED 06ED 10ED 12ED 13ED 15ED 16ED 17ED 19ED 214W-03-A4W-04-A4W-05-A4W-08-A4W-09-A4W-10-A4W-11-A | — | select / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · — | encounter picker | Start new encounter | — | button / app | works | POST /medplum/fhir/R4 |
| /?audit=buttons&inspect=1 · P2 · — | encounter picker | Open EHR | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · — | live encounter header | Live encounter | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · — | live encounter header | Close live encounter | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · — | live encounter header | Return to worklist | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P2 · — | live encounter header | Sign out | — | button / app | works | POST /medplum/oauth2/logout |
| /?audit=buttons&inspect=1 · P3 · — | sign-in | P3 · Inpatient RN | — | button / app | works | POST /__dev/persona-password; POST /medplum/auth/login |
| /?audit=buttons&inspect=1 · P3 · — | worklist | Worklist date | — | input / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · — | worklist | Refresh worklist | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · — | worklist | Search patients | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · — | worklist | Terrance Len Abshire · 1943-12-29 | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · — | encounter picker | Live encounter | — | select / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · — | encounter picker | Medication order / MAR No medication selectedinsulin isophane, human 70 UNT/ML / insulin, regular, human 30 UNT/ML Injectable Suspension [Humulin] · dolutegravir 50 MG Oral Tablet · 24 HR tacrolimus 1 MG Extended Release Oral Tablet [Envarsus] · Take as needed.lamivudine 300 MG / tenofovir disoproxil fumarate 300 MG Oral Tablet · lisinopril 10 MG Oral Tablet · Take lisinopril 10 MG Oral Tablet by mouth daily. | — | select / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · — | encounter picker | Start new encounter | — | button / app | works | POST /medplum/fhir/R4 |
| /?audit=buttons&inspect=1 · P3 · — | encounter picker | Open EHR | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · — | live encounter header | Live encounter | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · — | live encounter header | Close live encounter | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · — | live encounter header | Return to worklist | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P3 · — | live encounter header | Sign out | — | button / app | works | POST /medplum/oauth2/logout |
| /?audit=buttons&inspect=1 · P4 · — | sign-in | P4 · Pediatric NP | — | button / app | works | POST /__dev/persona-password; POST /medplum/auth/login |
| /?audit=buttons&inspect=1 · P4 · — | worklist | Worklist date | — | input / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · — | worklist | Refresh worklist | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · — | worklist | Search patients | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · — | worklist | Terrance Len Abshire · 1943-12-29 | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · — | encounter picker | Live encounter | — | select / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · — | encounter picker | Medication order / MAR No medication selectedinsulin isophane, human 70 UNT/ML / insulin, regular, human 30 UNT/ML Injectable Suspension [Humulin] · dolutegravir 50 MG Oral Tablet · 24 HR tacrolimus 1 MG Extended Release Oral Tablet [Envarsus] · Take as needed.lamivudine 300 MG / tenofovir disoproxil fumarate 300 MG Oral Tablet · lisinopril 10 MG Oral Tablet · Take lisinopril 10 MG Oral Tablet by mouth daily. | — | select / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · — | encounter picker | Start new encounter | — | button / app | works | POST /medplum/fhir/R4 |
| /?audit=buttons&inspect=1 · P4 · — | encounter picker | Open EHR | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · — | live encounter header | Live encounter | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · — | live encounter header | Close live encounter | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · — | live encounter header | Return to worklist | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P4 · — | live encounter header | Sign out | — | button / app | works | POST /medplum/oauth2/logout |
| /?audit=buttons&inspect=1 · P5 · — | sign-in | P5 · Surgeon | — | button / app | works | POST /__dev/persona-password; POST /medplum/auth/login |
| /?audit=buttons&inspect=1 · P5 · — | worklist | Worklist date | — | input / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · — | worklist | Refresh worklist | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · — | worklist | Search patients | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · — | worklist | Terrance Len Abshire · 1943-12-29 | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · — | encounter picker | Live encounter | — | select / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · — | encounter picker | Medication order / MAR No medication selectedinsulin isophane, human 70 UNT/ML / insulin, regular, human 30 UNT/ML Injectable Suspension [Humulin] · dolutegravir 50 MG Oral Tablet · 24 HR tacrolimus 1 MG Extended Release Oral Tablet [Envarsus] · Take as needed.lamivudine 300 MG / tenofovir disoproxil fumarate 300 MG Oral Tablet · lisinopril 10 MG Oral Tablet · Take lisinopril 10 MG Oral Tablet by mouth daily. | — | select / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · — | encounter picker | Start new encounter | — | button / app | works | POST /medplum/fhir/R4 |
| /?audit=buttons&inspect=1 · P5 · — | encounter picker | Open EHR | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · — | live encounter header | Live encounter | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · — | live encounter header | Close live encounter | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · — | live encounter header | Return to worklist | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · P5 · — | live encounter header | Sign out | — | button / app | works | POST /medplum/oauth2/logout |
| /?audit=buttons&inspect=1 · RN2 · — | sign-in | RN2 · Second nurse | — | button / app | works | POST /__dev/persona-password; POST /medplum/auth/login |
| /?audit=buttons&inspect=1 · RN2 · — | worklist | Worklist date | — | input / app | works | DOM changed |
| /?audit=buttons&inspect=1 · RN2 · — | worklist | Refresh worklist | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · RN2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · RN2 · — | worklist | Search patients | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · RN2 · — | worklist | Terrance Len Abshire · 1943-12-29 | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · RN2 · — | encounter picker | Live encounter | — | select / app | works | DOM changed |
| /?audit=buttons&inspect=1 · RN2 · — | encounter picker | Medication order / MAR No medication selectedinsulin isophane, human 70 UNT/ML / insulin, regular, human 30 UNT/ML Injectable Suspension [Humulin] · dolutegravir 50 MG Oral Tablet · 24 HR tacrolimus 1 MG Extended Release Oral Tablet [Envarsus] · Take as needed.lamivudine 300 MG / tenofovir disoproxil fumarate 300 MG Oral Tablet · lisinopril 10 MG Oral Tablet · Take lisinopril 10 MG Oral Tablet by mouth daily. | — | select / app | works | DOM changed |
| /?audit=buttons&inspect=1 · RN2 · — | encounter picker | Start new encounter | — | button / app | works | POST /medplum/fhir/R4 |
| /?audit=buttons&inspect=1 · RN2 · — | encounter picker | Open EHR | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · RN2 · — | live encounter header | Live encounter | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · RN2 · — | live encounter header | Close live encounter | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · RN2 · — | live encounter header | Return to worklist | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · RN2 · — | live encounter header | Sign out | — | button / app | works | POST /medplum/oauth2/logout |
| /?audit=buttons&inspect=1 · baseline · — | sign-in | Original canonical EHR (baseline) | — | button / app | works | POST /__dev/persona-password; POST /medplum/auth/login |
| /?audit=buttons&inspect=1 · baseline · — | worklist | Worklist date | — | input / app | works | DOM changed |
| /?audit=buttons&inspect=1 · baseline · — | worklist | Refresh worklist | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · baseline · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · baseline · — | worklist | Search patients | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · baseline · — | worklist | Terrance Len Abshire · 1943-12-29 | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · baseline · — | encounter picker | Live encounter | — | select / app | works | DOM changed |
| /?audit=buttons&inspect=1 · baseline · — | encounter picker | Medication order / MAR No medication selectedinsulin isophane, human 70 UNT/ML / insulin, regular, human 30 UNT/ML Injectable Suspension [Humulin] · dolutegravir 50 MG Oral Tablet · 24 HR tacrolimus 1 MG Extended Release Oral Tablet [Envarsus] · Take as needed.lamivudine 300 MG / tenofovir disoproxil fumarate 300 MG Oral Tablet · lisinopril 10 MG Oral Tablet · Take lisinopril 10 MG Oral Tablet by mouth daily. | — | select / app | works | DOM changed |
| /?audit=buttons&inspect=1 · baseline · — | encounter picker | Start new encounter | — | button / app | works | POST /medplum/fhir/R4 |
| /?audit=buttons&inspect=1 · baseline · — | encounter picker | Open EHR | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · baseline · — | live encounter header | Live encounter | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · baseline · — | live encounter header | Close live encounter | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · baseline · — | live encounter header | Return to worklist | — | button / app | works | DOM changed |
| /?audit=buttons&inspect=1 · baseline · — | live encounter header | Sign out | — | button / app | works | POST /medplum/oauth2/logout |
| /browse?run=run1-P3 · — · — | program browser | VGI HEALTH | — | a / app | works | URL → / |
| /browse?run=run1-P3 · — · — | program browser | Live EHR | — | a / app | works | URL → / |
| /browse?run=run1-P3 · — · — | program browser | Dashboard | — | a / app | works | URL → /dashboard |
| /browse?run=run1-P3 · — · — | program browser | Recorded run | — | select / app | works | URL → /browse |
| /browse?run=run1-P3 · — · — | program browser | Show mock data | — | switch / app | works | URL → /browse?run=run1-P3&mock=1 |
| /browse?run=run1-P3 · — · — | program browser | v1 | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fcanonical.json&persona=P1&day=0; real EHR rendered |
| /browse?run=run1-P3 · — · — | program browser | v2 | — | a / app | works | URL → /ehr?mode=replay&release=v2&program=releases%2Fv2%2Fcanonical.json&persona=P1&day=4; real EHR rendered |
| /browse?run=run1-P3 · — · — | program browser | v3 | — | a / app | works | URL → /ehr?mode=replay&release=v3&program=releases%2Fv3%2Fcanonical.json&persona=P1&day=7; real EHR rendered |
| /browse?run=run1-P3 · — · — | program browser | P1 Primary care physician, day 0, revision 0, certified; open EHR | — | button / app | works | URL → /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&day=0 |
| /browse?run=run1-P3 · — · — | program browser | P1 Primary care physician, day 4, revision 0, certified; open EHR | — | button / app | works | URL → /ehr?mode=replay&release=v2&program=releases%2Fv2%2Fpersonas%2FP1.json&persona=P1&day=4 |
| /browse?run=run1-P3 · — · — | program browser | P2 ED physician, day 0, revision 0, certified; open EHR | — | button / app | works | URL → /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP2.json&persona=P2&day=0 |
| /browse?run=run1-P3 · — · — | program browser | P2 ED physician, day 4, revision 0, certified; open EHR | — | button / app | works | URL → /ehr?mode=replay&release=v2&program=releases%2Fv2%2Fpersonas%2FP2.json&persona=P2&day=4 |
| /browse?run=run1-P3 · — · — | program browser | P3 Inpatient RN, day 0, revision 0, certified; open EHR | — | button / app | works | URL → /ehr?mode=replay&release=v1&program=runs%2Frun1-P3%2Fprograms%2FP3%2Fv0.json&persona=P3&day=0 |
| /browse?run=run1-P3 · — · — | program browser | P3 Inpatient RN, day 1, revision 0, certified; open EHR | — | button / app | works | URL → /ehr?mode=replay&release=v1&program=runs%2Frun1-P3%2Fprograms%2FP3%2Fv0.json&persona=P3&day=1 |
| /browse?run=run1-P3 · — · — | program browser | P4 Pediatric NP, day 0, revision 0, certified; open EHR | — | button / app | works | URL → /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP4.json&persona=P4&day=0 |
| /browse?run=run1-P3 · — · — | program browser | P4 Pediatric NP, day 4, revision 0, certified; open EHR | — | button / app | works | URL → /ehr?mode=replay&release=v2&program=releases%2Fv2%2Fpersonas%2FP4.json&persona=P4&day=4 |
| /browse?run=run1-P3 · — · — | program browser | P5 General surgeon, day 0, revision 0, certified; open EHR | — | button / app | works | URL → /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP5.json&persona=P5&day=0 |
| /browse?run=run1-P3 · — · — | program browser | P5 General surgeon, day 4, revision 0, certified; open EHR | — | button / app | works | URL → /ehr?mode=replay&release=v2&program=releases%2Fv2%2Fpersonas%2FP5.json&persona=P5&day=4 |
| /browse?run=run1-P3 · — · — | program browser | Re-check against current release | — | button / app | works | DOM changed |
| /browse?run=run1-P3 · — · — | program browser | Raw JSON patch | — | summary / app | works | DOM changed |
| /browse?run=run1-P3 · — · — | program browser | Checker detail and proposed patch | — | summary / app | works | DOM changed |
| /browse?run=run1-P3 · — · — | program browser | Open this revision | — | button / app | works | URL → /ehr?mode=replay&release=v2&program=runs%2Frun1-P3%2Fprograms%2FP3%2Fv4.json&persona=P3&day=5 |
| /browse?run=run1-P3 · — · — | program browser | Compare with previous revision → | — | a / app | works | URL → /dashboard?run=run1-P3&view=Evolution&persona=P3 |
| /browse?run=run1-P3 · — · — | program browser | Replay this day’s trajectories → | — | a / app | works | URL → /dashboard?run=run1-P3&view=Trajectories&persona=P3 |
| /browse?run=run1-P3 · — · — | program browser | Open reference | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fcanonical.json&persona=P1; real EHR rendered |
| /browse?run=run1-P3 · — · — | program browser | Open reference | — | a / app | works | URL → /ehr?mode=replay&release=v2&program=releases%2Fv2%2Fcanonical.json&persona=P1; real EHR rendered |
| /browse?run=run1-P3 · — · — | program browser | Open reference | — | a / app | works | URL → /ehr?mode=replay&release=v3&program=releases%2Fv3%2Fcanonical.json&persona=P1; real EHR rendered |
| /browse?run=run1-P3 · — · — | program browser | Open | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1; real EHR rendered |
| /browse?run=run1-P3 · — · — | program browser | Open | — | a / app | works | URL → /ehr?mode=replay&release=v2&program=releases%2Fv2%2Fpersonas%2FP1.json&persona=P1; real EHR rendered |
| /browse?run=run1-P3 · — · — | program browser | Open | — | a / app | works | URL → /ehr?mode=replay&release=v3&program=releases%2Fv3%2Fpersonas%2FP1.json&persona=P1; real EHR rendered |
| /browse?run=run1-P3 · — · — | program browser | Open | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP2.json&persona=P2; real EHR rendered |
| /browse?run=run1-P3 · — · — | program browser | Open | — | a / app | works | URL → /ehr?mode=replay&release=v2&program=releases%2Fv2%2Fpersonas%2FP2.json&persona=P2; real EHR rendered |
| /browse?run=run1-P3 · — · — | program browser | Open | — | a / app | works | URL → /ehr?mode=replay&release=v3&program=releases%2Fv3%2Fpersonas%2FP2.json&persona=P2; real EHR rendered |
| /browse?run=run1-P3 · — · — | program browser | Open | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP3.json&persona=P3; real EHR rendered |
| /browse?run=run1-P3 · — · — | program browser | Open | — | a / app | works | URL → /ehr?mode=replay&release=v2&program=releases%2Fv2%2Fpersonas%2FP3.json&persona=P3; real EHR rendered |
| /browse?run=run1-P3 · — · — | program browser | Open | — | a / app | works | URL → /ehr?mode=replay&release=v3&program=releases%2Fv3%2Fpersonas%2FP3.json&persona=P3; real EHR rendered |
| /browse?run=run1-P3 · — · — | program browser | Open rev 7 | — | a / app | works | URL → /ehr?mode=replay&release=v3&program=runs%2Frun1-P3%2Fprograms%2FP3%2Fv7.json&persona=P3; real EHR rendered |
| /browse?run=run1-P3 · — · — | program browser | Open | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP4.json&persona=P4; real EHR rendered |
| /browse?run=run1-P3 · — · — | program browser | Open | — | a / app | works | URL → /ehr?mode=replay&release=v2&program=releases%2Fv2%2Fpersonas%2FP4.json&persona=P4; real EHR rendered |
| /browse?run=run1-P3 · — · — | program browser | Open | — | a / app | works | URL → /ehr?mode=replay&release=v3&program=releases%2Fv3%2Fpersonas%2FP4.json&persona=P4; real EHR rendered |
| /browse?run=run1-P3 · — · — | program browser | Open | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP5.json&persona=P5; real EHR rendered |
| /browse?run=run1-P3 · — · — | program browser | Open | — | a / app | works | URL → /ehr?mode=replay&release=v2&program=releases%2Fv2%2Fpersonas%2FP5.json&persona=P5; real EHR rendered |
| /browse?run=run1-P3 · — · — | program browser | Open | — | a / app | works | URL → /ehr?mode=replay&release=v3&program=releases%2Fv3%2Fpersonas%2FP5.json&persona=P5; real EHR rendered |
| /browse?run=run1-P3 · — · — | program browser | Bad programs (should be rejected) 33 safety examples | — | summary / app | works | DOM changed |
| /browse?run=run1-P3 · — · — | program browser | Recorded revisions Certified forks and deployment history | — | summary / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&inspect=1&audit=buttons · — · — | replay inspector | Inspector | — | button / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&inspect=1&audit=buttons · — · — | replay inspector | Reset episode | — | button / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&inspect=1&audit=buttons · — · — | replay inspector | Close inspector | — | button / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&inspect=1&audit=buttons · — · — | replay inspector | Close inspector | — | button / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&inspect=1&audit=buttons · — · — | replay inspector | ← UI browser | — | a / app | works | URL → /browse?run=run1-P3 |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&inspect=1&audit=buttons · — · — | replay inspector | Persona | — | select / app | works | URL → /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP2.json&persona=P2 |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&inspect=1&audit=buttons · — · — | replay inspector | Reset episode | — | button / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&inspect=1&audit=buttons · — · — | replay inspector | Dashboard | — | a / app | works | URL → /dashboard?run=run1-P3&view=Evolution&persona=P3 |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | VGI HEALTH | — | a / app | works | URL → / |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Recorded run | — | select / app | works | URL → /dashboard?run=mock&view=Evolution&persona=P3 |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Open EHR | — | a / app | works | URL → /ehr?mode=replay&persona=P3&run=run1-P3; real EHR rendered |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Live EHR | — | a / app | works | URL → / |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | UI browser | — | a / app | works | URL → /browse?run=run1-P3 |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Evolution | — | button / app | disabled-with-reason | Current dashboard area |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Trajectories | — | button / app | works | URL → /dashboard?run=run1-P3&view=Trajectories&persona=P3 |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Releases | — | button / app | works | URL → /dashboard?run=run1-P3&view=Releases&persona=P3 |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Try to break it | — | button / app | works | URL → /dashboard?run=run1-P3&view=Try+to+break+it&persona=P3 |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | P1 | — | button / app | disabled-with-reason | No recorded versions for this persona |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | P2 | — | button / app | disabled-with-reason | No recorded versions for this persona |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | P3 | — | button / app | disabled-with-reason | Current persona |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | P4 | — | button / app | disabled-with-reason | No recorded versions for this persona |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | P5 | — | button / app | disabled-with-reason | No recorded versions for this persona |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Complexity measure | — | select / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Complexity metric | — | select / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Compare personas | — | input / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Chart data and measurement definitions | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | rev 0 · BaselineCanonical program—0 clicks / 0s KLMCertificate recorded | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Kept rev 0 · Night 1No change deployedvs previous: 0 clicks / 0s KLMvs baseline: 0 clicks / 0s KLMskipped | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | ↳ Rejected · Night 1Put human allergy review in the home and shift-worklist sidebars.noFalseAlarms | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | ↳ Rejected · Night 1Place administration work before generic chart-reference tabs.noFalseAlarms | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | ↳ Rejected · Night 1Collapse optional chart-reference tabs above the assessment fields.noFalseAlarms | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | ↳ Rejected · Night 1Hide the administration allergy panel only while its review receipt is valid.noFalseAlarms | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | ↳ Rejected · Night 1Declutter "Administer medication": move the allergy list into a secondary tab so the sign button sits higherreviewsBeforeCommit | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | rev 1 · Night 2Copy the three common nursing navigation actions beside their patient banners.; Start general chart tabs collapsed on administration and assessment screens.vs previous: 2 clicks / 2.4s KLMvs baseline: 2 clicks / 2.4s KLMCertified · v1 | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | ↳ Rejected · Night 2Support early allergy review in the home sidebar and reuse valid receipts during administration.reviewsBeforeCommit | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | ↳ Rejected · Night 2Pre-fill patient-ID re-entry on "Sign orders" from the chart so signing needs one confirm clickhumanOnlyKept | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | rev 2 · Night 3 · v2Optional feature left out of nursing workflowvs previous: 0 clicks / 0s KLMvs baseline: 2 clicks / 2.4s KLMCertified · v2 | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | rev 3 · Night 4Place the existing shift allergy review immediately below the patient banner.vs previous: 0 clicks / 0s KLMvs baseline: 2 clicks / 2.4s KLMCertified · v2 | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | ↳ Rejected · Night 4Hide the administration allergy panel only while a valid RN review receipt exists.reviewsBeforeCommit | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | ↳ Rejected · Night 4Pre-fill weight on "Rooming" from the triage weight as entered (lb) instead of re-typing it in kgunits | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | rev 4 · Night 5Render medication review, scans, documentation and the human commit before general navigation and chart context.vs previous: 0 clicks / 0s KLMvs baseline: 2 clicks / 2.4s KLMCertified · v2 | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | ↳ Rejected · Night 5Hide the administration allergy panel only while a valid RN allergy receipt exists.reviewsBeforeCommit | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | rev 5 · Night 6 · v3R2-3: Show antibiotic indication beside MAR dose details before administration.vs previous: 0 clicks / 0s KLMvs baseline: 2 clicks / 2.4s KLMCertified · v3 | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | ↳ Rejected · Night 6v2: recheck of the previous programreviewsBeforeCommit | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | rev 6 · Night 7Place assessment entry and filing immediately after the flowsheet patient banner.vs previous: 0 clicks / 0s KLMvs baseline: 2 clicks / 2.4s KLMCertified · v3 | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | ↳ Rejected · Night 7Use valid RN allergy-review receipts to shorten the administration screen.reviewsBeforeCommit | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | rev 7 · Night 8Display the removable interaction reminder without an immediate popup.vs previous: 0 clicks / 0s KLMvs baseline: 2 clicks / 2.4s KLMCertified · v3 | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | ↳ Rejected · Night 8Hide the administration allergy panel only while a valid RN review receipt exists.reviewsBeforeCommit | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Kept rev 7 · Night 9No change deployedvs previous: 0 clicks / 0s KLMvs baseline: 2 clicks / 2.4s KLMskipped | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | ↳ Rejected · Night 9Hide administration allergies only while a valid nursing review receipt exists.reviewsBeforeCommit | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | rev 0 · BaselineCanonical program—0 clicks / 0s KLMCertificate recorded | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Baseline certificate | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next task event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset screens | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | ↳ Rejected · Night 9Hide administration allergies only while a valid nursing review receipt exists.reviewsBeforeCommit | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · home.sidebar | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin.dose, w4Admin.antibioticIndication, w4Admin.allergies, w4Admin.glucose, w4Admin.coag, w4Admin.prn | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Worklist.work, w4Mar.grid | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin.allergies | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next task event | — | button / app | disabled-with-reason | Use the counterexample path for a rejected proposal |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset screens | — | button / app | disabled-with-reason | Screens are already reset |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.toolbar.ward"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.toolbar.ward"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Open recorded decision JSON | — | a / app | works | URL → /runs/run1-P3/decisions/night-09/P3.json |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Reset | — | button / app | disabled-with-reason | Already at the first event |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Step | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Play | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Pause | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Reset | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Replay event | — | input / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Compare baseline rev 0 | — | input / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Compare baseline rev 0 | — | input / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Med rec | w1Rooming.nav.w1MedRec | click / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | HPI / ROS | w1Rooming.nav.w1Hpi | click / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Exam / A&P | w1Rooming.nav.w1Exam | click / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Orders | w1Rooming.nav.w1Orders | click / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Labs | w1Rooming.nav.w1Labs | click / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Visit close | w1Rooming.nav.w1Close | click / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Collapse section | w1Rooming.sidebar | click / app | disabled-with-reason | Collapse section · Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Search chart | w1Rooming.chartSearch | enter / app | disabled-with-reason | Search chart · Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Back | w1Rooming.back | click / app | disabled-with-reason | Back · Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Patient workspace | w1Rooming.home | click / app | disabled-with-reason | Patient workspace · Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Results | w1Rooming.chart | selectTab / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Imaging | w1Rooming.chart | selectTab / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Notes | w1Rooming.chart | selectTab / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Encounters | w1Rooming.chart | selectTab / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Social history | w1Rooming.chart | selectTab / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Family history | w1Rooming.chart | selectTab / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Care gaps | w1Rooming.chart | selectTab / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Immunizations | w1Rooming.chart | selectTab / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Coverage | w1Rooming.chart | selectTab / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Collapse section | w1Rooming.vitalsGroup | click / app | disabled-with-reason | Collapse section · Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Weight (kg) | w1Rooming.weight | enter / app | disabled-with-reason | Weight (kg) · Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Height (cm) | w1Rooming.height | enter / app | disabled-with-reason | Height (cm) · Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | BP systolic | w1Rooming.bpSystolic | enter / app | disabled-with-reason | BP systolic · Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | BP diastolic | w1Rooming.bpDiastolic | enter / app | disabled-with-reason | BP diastolic · Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Heart rate | w1Rooming.heartRate | enter / app | disabled-with-reason | Heart rate · Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Respiratory rate | w1Rooming.respRate | enter / app | disabled-with-reason | Respiratory rate · Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Temperature | w1Rooming.temperature | enter / app | disabled-with-reason | Temperature · Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | SpO₂ | w1Rooming.spo2 | enter / app | disabled-with-reason | SpO₂ · Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Pain (0–10) | w1Rooming.painScore | enter / app | disabled-with-reason | Pain (0–10) · Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Chief complaint | w1Rooming.chiefComplaint | enter / app | disabled-with-reason | Chief complaint · Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Collapse section | w1Rooming.intake | click / app | disabled-with-reason | Collapse section · Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Tobacco use | w1Rooming.tobaccoUse | enter / app | disabled-with-reason | Tobacco use · Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Fall in the past year? | w1Rooming.fallRiskScreen | enter / app | disabled-with-reason | Fall in the past year? · Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Travel in the past 30 days? | w1Rooming.travelScreen | enter / app | disabled-with-reason | Travel in the past 30 days? · Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Advance directive discussed | w1Rooming.advanceDirectiveAsked | enter / app | disabled-with-reason | Advance directive discussed · Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Interpreter needed? | w1Rooming.interpreterNeeded | enter / app | disabled-with-reason | Interpreter needed? · Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Preferred pharmacy confirmed | w1Rooming.pharmacyConfirmedRooming | enter / app | disabled-with-reason | Preferred pharmacy confirmed · Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Collapse section | w1Rooming.phq | click / app | disabled-with-reason | Collapse section · Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | PHQ-2 score | w1Rooming.depressionScreen | enter / app | disabled-with-reason | PHQ-2 score · Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Collapse section | w1Rooming.allergyGroup | click / app | disabled-with-reason | Collapse section · Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Mark allergies reviewed | w1Rooming.review.allergyList | click / app | disabled-with-reason | Mark allergies reviewed · Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Next: medication reconciliation | w1Rooming.next | click / app | disabled-with-reason | Next: medication reconciliation · Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | W4 · d01-P3-W4-00127/14 clicks · 39/20 keys · 255.1/92.3s KLM · Completed | — | option / app | disabled-with-reason | Current trajectory |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | W4 · d01-P3-W4-0246/3 clicks · 10/0 keys · 40.2/10.3s KLM · Completed | — | option / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | W4 · d01-P3-W4-03315/9 clicks · 20/11 keys · 69.5/16.1s KLM · Completed | — | option / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Trajectory day | — | select / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Search tasks | — | input / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Search tasks | — | input / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Releases&persona=P3 · P3 · run1-P3 | Releases | Inspect P3 v2 migration | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Releases&persona=P3 · P3 · run1-P3 | Releases | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Releases&persona=P3 · P3 · run1-P3 | Releases | Inspect P3 v3 migration | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Releases&persona=P3 · P3 · run1-P3 | Releases | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Try+to+break+it&persona=P3 · P3 · run1-P3 | Try to break it | Show recorded verdict | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Try+to+break+it&persona=P3 · P3 · run1-P3 | Try to break it | Show recorded verdict | — | button / app | disabled-with-reason | Already showing this recorded verdict |
| /dashboard?run=run1-P3&view=Try+to+break+it&persona=P3 · P3 · run1-P3 | Try to break it | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Try+to+break+it&persona=P3 · P3 · run1-P3 | Try to break it | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Try+to+break+it&persona=P3 · P3 · run1-P3 | Try to break it | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | VGI HEALTH | — | a / app | works | URL → / |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Recorded run | — | select / app | works | URL → /dashboard?run=run1-P3&view=Evolution&persona=P3 |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Open EHR | — | a / app | works | URL → /ehr?mode=replay&persona=P3&run=mock; real EHR rendered |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Live EHR | — | a / app | works | URL → / |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | UI browser | — | a / app | works | URL → /browse?run=run1-P3 |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Evolution | — | button / app | disabled-with-reason | Current dashboard area |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Trajectories | — | button / app | disabled-with-reason | No trajectories recorded for this run |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Releases | — | button / app | works | URL → /dashboard?run=mock&view=Releases&persona=P3 |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Try to break it | — | button / app | works | URL → /dashboard?run=mock&view=Try+to+break+it&persona=P3 |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | P1 | — | button / app | works | URL → /dashboard?run=mock&view=Evolution&persona=P1 |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | P2 | — | button / app | works | URL → /dashboard?run=mock&view=Evolution&persona=P2 |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | P3 | — | button / app | disabled-with-reason | Current persona |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | P4 | — | button / app | works | URL → /dashboard?run=mock&view=Evolution&persona=P4 |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | P5 | — | button / app | works | URL → /dashboard?run=mock&view=Evolution&persona=P5 |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Complexity measure | — | select / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Complexity metric | — | select / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Compare personas | — | input / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Chart data and measurement definitions | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | rev 0 · BaselineCanonical program—0 clicks / 0s KLMMOCK certificate | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | rev 1 · Night 1Medication passes repeatedly backtrack between the MAR and patient chart.vs previous: Unavailablevs baseline: UnavailableMOCK · v1 | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | rev 2 · Night 2Medication passes repeatedly backtrack between the MAR and patient chart.vs previous: Unavailablevs baseline: UnavailableMOCK · v1 | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | ↳ Rejected · Night 2Accept weight in poundsunitSafety | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Kept rev 2 · Night 3 · v2Optional feature left out of nursing workflowvs previous: 0 clicks / 0s KLMvs baseline: UnavailableMOCK · v2 | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | rev 3 · Night 6 · v3Indication stays visible beside the dose on the MAR.vs previous: Unavailablevs baseline: UnavailableMOCK · v3 | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | ↳ Rejected · Night 6Place indication in collapsed Details drawerreviewsBeforeCommit | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | ↳ Rejected · Night 6v2: recheck of the previous programreviewsBeforeCommit | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | rev 4 · Night 8Medication passes repeatedly backtrack between the MAR and patient chart.vs previous: Unavailablevs baseline: UnavailableMOCK · v3 | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | rev 0 · BaselineCanonical program—0 clicks / 0s KLMMOCK certificate | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Baseline certificate | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Next task event | — | button / app | disabled-with-reason | No more task events recorded for these versions |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Reset screens | — | button / app | disabled-with-reason | Screens are already reset |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | rev 5 · Night 8Rooming already reviewed the allergy list; repeat navigation adds no information.vs previous: Unavailablevs baseline: UnavailableMOCK · v3 | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | JSON patch · work, allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | MOCK certificate · v3 | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Next task event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Reset screens | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Open recorded decision JSON | — | a / app | works | URL → /runs/mock/decisions/night-08/P1.json |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | rev 0 · BaselineCanonical program—0 clicks / 0s KLMMOCK certificate | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Baseline certificate | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Next task event | — | button / app | disabled-with-reason | No more task events recorded for these versions |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Reset screens | — | button / app | disabled-with-reason | Screens are already reset |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | rev 4 · Night 8Sepsis orders repeatedly traverse four screens under time pressure.vs previous: Unavailablevs baseline: UnavailableMOCK · v3 | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | JSON patch · work, allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | MOCK certificate · v3 | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Next task event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Reset screens | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Open recorded decision JSON | — | a / app | works | URL → /runs/mock/decisions/night-08/P2.json |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | rev 0 · BaselineCanonical program—0 clicks / 0s KLMMOCK certificate | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Baseline certificate | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Next task event | — | button / app | disabled-with-reason | No more task events recorded for these versions |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Reset screens | — | button / app | disabled-with-reason | Screens are already reset |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | rev 4 · Night 8Medication passes repeatedly backtrack between the MAR and patient chart.vs previous: Unavailablevs baseline: UnavailableMOCK · v3 | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | JSON patch · work, allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | MOCK certificate · v3 | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Next task event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Reset screens | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Open recorded decision JSON | — | a / app | works | URL → /runs/mock/decisions/night-08/P3.json |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | rev 0 · BaselineCanonical program—0 clicks / 0s KLMMOCK certificate | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Baseline certificate | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Next task event | — | button / app | disabled-with-reason | No more task events recorded for these versions |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Reset screens | — | button / app | disabled-with-reason | Screens are already reset |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | rev 4 · Night 8Weight review and dose entry are separated by repeated navigation.vs previous: Unavailablevs baseline: UnavailableMOCK · v3 | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | JSON patch · work, allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | MOCK certificate · v3 | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Next task event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Reset screens | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Open recorded decision JSON | — | a / app | works | URL → /runs/mock/decisions/night-08/P4.json |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | rev 0 · BaselineCanonical program—0 clicks / 0s KLMMOCK certificate | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Baseline certificate | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Next task event | — | button / app | disabled-with-reason | No more task events recorded for these versions |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Reset screens | — | button / app | disabled-with-reason | Screens are already reset |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | rev 5 · Night 8The same surgical prophylaxis choices recur between cases.vs previous: Unavailablevs baseline: UnavailableMOCK · v3 | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | JSON patch · work, allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | MOCK certificate · v3 | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Next task event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Reset screens | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Open recorded decision JSON | — | a / app | works | URL → /runs/mock/decisions/night-08/P5.json |
| /dashboard?run=mock&view=Releases&persona=P3 · P3 · mock | Releases | Inspect P1 v2 migration | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Releases&persona=P3 · P3 · mock | Releases | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Releases&persona=P3 · P3 · mock | Releases | Inspect P5 v3 migration | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Releases&persona=P3 · P3 · mock | Releases | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Try+to+break+it&persona=P3 · P3 · mock | Try to break it | Show recorded verdict | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Try+to+break+it&persona=P3 · P3 · mock | Try to break it | Show recorded verdict | — | button / app | disabled-with-reason | Already showing this recorded verdict |
| /dashboard?run=mock&view=Try+to+break+it&persona=P3 · P3 · mock | Try to break it | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Try+to+break+it&persona=P3 · P3 · mock | Try to break it | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Try+to+break+it&persona=P3 · P3 · mock | Try to break it | Close decision record | — | button / app | works | DOM changed |
