# Button audit

Generated 2026-11-01T15:27:21.257Z. Preview build; one Chromium worker.

| Scope | Works | Disabled with reason | Dead | Error |
|---|---:|---:|---:|---:|
| App baseline | 0 | 0 | 0 | 0 |
| App final | 389 | 73 | 0 | 0 |
| Lean final | 333 | 6 | 0 | 0 |

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
| /?audit=buttons&inspect=1 · P2 · — | sign-in | P2 · Emergency | — | button / app | works | POST /__dev/persona-password; POST /medplum/auth/login |
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
| /?audit=buttons&inspect=1 · P4 · — | sign-in | P4 · Pediatric NP | — | button / app | works | POST /__dev/persona-password; POST /medplum/auth/login; POST /medplum/oauth2/token |
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
| /?audit=buttons&inspect=1 · P5 · — | sign-in | P5 · Surgeon | — | button / app | works | POST /__dev/persona-password; POST /medplum/auth/login; POST /medplum/oauth2/token |
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
| /?audit=buttons&inspect=1 · baseline · — | sign-in | Original canonical EHR (baseline) | — | button / app | works | POST /__dev/persona-password; POST /medplum/auth/login; POST /medplum/oauth2/token |
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
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | VGI HEALTH | — | a / app | works | URL → / |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | Live EHR | — | a / app | works | URL → / |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | Dashboard | — | a / app | works | URL → /dashboard |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | Recorded run | — | select / app | works | URL → /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | Show mock data | — | switch / app | works | URL → /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3&mock=1 |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | Change patient ↓ | — | a / app | works | URL → /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | v1 | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fcanonical.json&persona=P1&patient=50d2c695-5faa-dfae-da75-4b182154a1ea; real EHR rendered |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | v2 | — | a / app | works | URL → /ehr?mode=replay&release=v2&program=releases%2Fv2%2Fcanonical.json&persona=P1&patient=50d2c695-5faa-dfae-da75-4b182154a1ea; real EHR rendered |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | v3 | — | a / app | works | URL → /ehr?mode=replay&release=v3&program=releases%2Fv3%2Fcanonical.json&persona=P1&patient=50d2c695-5faa-dfae-da75-4b182154a1ea; real EHR rendered |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | P1 Primary care physician, day 0, revision 0, certified; open EHR | — | button / app | works | URL → /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=50d2c695-5faa-dfae-da75-4b182154a1ea |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | P1 Primary care physician, day 4, revision 0, certified; open EHR | — | button / app | works | URL → /ehr?mode=replay&release=v2&program=releases%2Fv2%2Fpersonas%2FP1.json&persona=P1&patient=50d2c695-5faa-dfae-da75-4b182154a1ea |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | P2 ED physician, day 0, revision 0, certified; open EHR | — | button / app | works | URL → /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP2.json&persona=P2&patient=50d2c695-5faa-dfae-da75-4b182154a1ea |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | P2 ED physician, day 4, revision 0, certified; open EHR | — | button / app | works | URL → /ehr?mode=replay&release=v2&program=releases%2Fv2%2Fpersonas%2FP2.json&persona=P2&patient=50d2c695-5faa-dfae-da75-4b182154a1ea |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | P3 Inpatient RN, day 0, revision 0, certified; open EHR | — | button / app | works | URL → /ehr?mode=replay&release=v1&program=runs%2Frun1-P3%2Fprograms%2FP3%2Fv0.json&persona=P3&patient=50d2c695-5faa-dfae-da75-4b182154a1ea |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | P3 Inpatient RN, day 1, revision 0, certified; open EHR | — | button / app | works | URL → /ehr?mode=replay&release=v1&program=runs%2Frun1-P3%2Fprograms%2FP3%2Fv0.json&persona=P3&patient=50d2c695-5faa-dfae-da75-4b182154a1ea |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | P4 Pediatric NP, day 0, revision 0, certified; open EHR | — | button / app | works | URL → /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP4.json&persona=P4&patient=50d2c695-5faa-dfae-da75-4b182154a1ea |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | P4 Pediatric NP, day 4, revision 0, certified; open EHR | — | button / app | works | URL → /ehr?mode=replay&release=v2&program=releases%2Fv2%2Fpersonas%2FP4.json&persona=P4&patient=50d2c695-5faa-dfae-da75-4b182154a1ea |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | P5 General surgeon, day 0, revision 0, certified; open EHR | — | button / app | works | URL → /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP5.json&persona=P5&patient=50d2c695-5faa-dfae-da75-4b182154a1ea |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | P5 General surgeon, day 4, revision 0, certified; open EHR | — | button / app | works | URL → /ehr?mode=replay&release=v2&program=releases%2Fv2%2Fpersonas%2FP5.json&persona=P5&patient=50d2c695-5faa-dfae-da75-4b182154a1ea |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | Open this revision | — | button / app | works | URL → /ehr?mode=replay&release=v2&program=runs%2Frun1-P3%2Fprograms%2FP3%2Fv4.json&persona=P3&patient=50d2c695-5faa-dfae-da75-4b182154a1ea |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | Compare with previous revision → | — | a / app | works | URL → /dashboard?run=run1-P3&view=Evolution&persona=P3 |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | Replay this day’s trajectories → | — | a / app | works | URL → /dashboard?run=run1-P3&view=Trajectories&persona=P3 |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | Search by name or MRN | — | input / app | works | DOM changed |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | All sources | — | button / app | disabled-with-reason | Current patient source |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | Synthea | — | button / app | works | DOM changed |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | Synthetic Hospital | — | button / app | works | DOM changed |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | pediatric | — | button / app | works | DOM changed |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | allergic | — | button / app | works | DOM changed |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | anticoagulated | — | button / app | works | DOM changed |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | surgical | — | button / app | works | DOM changed |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | ED | — | button / app | works | DOM changed |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | inpatient | — | button / app | works | DOM changed |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | Mr. Aaron Bruno Ankunding58 years · male · MRN 47839287 | — | button / app | works | URL → /browse?patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7&run=run1-P3 |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | Abdul Bradford Sauer13 years · male · MRN 47466339pediatric | — | button / app | works | URL → /browse?patient=d0fe99e5-c869-b0e2-1379-6ff2293e6704&run=run1-P3 |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | Open reference | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fcanonical.json&persona=P1&patient=50d2c695-5faa-dfae-da75-4b182154a1ea; real EHR rendered |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | Open reference | — | a / app | works | URL → /ehr?mode=replay&release=v2&program=releases%2Fv2%2Fcanonical.json&persona=P1&patient=50d2c695-5faa-dfae-da75-4b182154a1ea; real EHR rendered |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | Open reference | — | a / app | works | URL → /ehr?mode=replay&release=v3&program=releases%2Fv3%2Fcanonical.json&persona=P1&patient=50d2c695-5faa-dfae-da75-4b182154a1ea; real EHR rendered |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | Open | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=50d2c695-5faa-dfae-da75-4b182154a1ea; real EHR rendered |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | Open | — | a / app | works | URL → /ehr?mode=replay&release=v2&program=releases%2Fv2%2Fpersonas%2FP1.json&persona=P1&patient=50d2c695-5faa-dfae-da75-4b182154a1ea; real EHR rendered |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | Open | — | a / app | works | URL → /ehr?mode=replay&release=v3&program=releases%2Fv3%2Fpersonas%2FP1.json&persona=P1&patient=50d2c695-5faa-dfae-da75-4b182154a1ea; real EHR rendered |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | Open | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP2.json&persona=P2&patient=50d2c695-5faa-dfae-da75-4b182154a1ea; real EHR rendered |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | Open | — | a / app | works | URL → /ehr?mode=replay&release=v2&program=releases%2Fv2%2Fpersonas%2FP2.json&persona=P2&patient=50d2c695-5faa-dfae-da75-4b182154a1ea; real EHR rendered |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | Open | — | a / app | works | URL → /ehr?mode=replay&release=v3&program=releases%2Fv3%2Fpersonas%2FP2.json&persona=P2&patient=50d2c695-5faa-dfae-da75-4b182154a1ea; real EHR rendered |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | Open | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP3.json&persona=P3&patient=50d2c695-5faa-dfae-da75-4b182154a1ea; real EHR rendered |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | Open | — | a / app | works | URL → /ehr?mode=replay&release=v2&program=releases%2Fv2%2Fpersonas%2FP3.json&persona=P3&patient=50d2c695-5faa-dfae-da75-4b182154a1ea; real EHR rendered |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | Open | — | a / app | works | URL → /ehr?mode=replay&release=v3&program=releases%2Fv3%2Fpersonas%2FP3.json&persona=P3&patient=50d2c695-5faa-dfae-da75-4b182154a1ea; real EHR rendered |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | Open rev 7 | — | a / app | works | URL → /ehr?mode=replay&release=v3&program=runs%2Frun1-P3%2Fprograms%2FP3%2Fv7.json&persona=P3&patient=50d2c695-5faa-dfae-da75-4b182154a1ea; real EHR rendered |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | Open | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP4.json&persona=P4&patient=50d2c695-5faa-dfae-da75-4b182154a1ea; real EHR rendered |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | Open | — | a / app | works | URL → /ehr?mode=replay&release=v2&program=releases%2Fv2%2Fpersonas%2FP4.json&persona=P4&patient=50d2c695-5faa-dfae-da75-4b182154a1ea; real EHR rendered |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | Open | — | a / app | works | URL → /ehr?mode=replay&release=v3&program=releases%2Fv3%2Fpersonas%2FP4.json&persona=P4&patient=50d2c695-5faa-dfae-da75-4b182154a1ea; real EHR rendered |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | Open | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP5.json&persona=P5&patient=50d2c695-5faa-dfae-da75-4b182154a1ea; real EHR rendered |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | Open | — | a / app | works | URL → /ehr?mode=replay&release=v2&program=releases%2Fv2%2Fpersonas%2FP5.json&persona=P5&patient=50d2c695-5faa-dfae-da75-4b182154a1ea; real EHR rendered |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | Open | — | a / app | works | URL → /ehr?mode=replay&release=v3&program=releases%2Fv3%2Fpersonas%2FP5.json&persona=P5&patient=50d2c695-5faa-dfae-da75-4b182154a1ea; real EHR rendered |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | Bad programs (should be rejected) 33 safety examples | — | summary / app | works | DOM changed |
| /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 · — · — | program browser | Recorded revisions Certified forks and deployment history | — | summary / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7&inspect=1&audit=buttons · — · — | replay inspector | Inspector | — | button / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7&inspect=1&audit=buttons · — · — | replay inspector | Reset episode | — | button / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7&inspect=1&audit=buttons · — · — | replay inspector | Close inspector | — | button / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7&inspect=1&audit=buttons · — · — | replay inspector | Close inspector | — | button / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7&inspect=1&audit=buttons · — · — | replay inspector | ← UI browser | — | a / app | works | URL → /browse?patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7&run=run1-P3 |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7&inspect=1&audit=buttons · — · — | replay inspector | Persona | — | select / app | works | URL → /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP2.json&persona=P2&patient=9e937da7-1921-8752-9ee8-83a22ee5b4fd |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7&inspect=1&audit=buttons · — · — | replay inspector | Mr. Aaron Bruno Ankunding · 58 · AMB · Change patient | — | summary / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7&inspect=1&audit=buttons · — · — | replay inspector | Reset episode | — | button / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7&inspect=1&audit=buttons · — · — | replay inspector | Dashboard | — | a / app | works | URL → /dashboard |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7&inspect=1&audit=buttons · — · — | replay inspector | Close inspector | — | button / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7&inspect=1&audit=buttons · — · — | replay inspector | ← UI browser | — | a / app | works | URL → /browse?patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7&run=run1-P3 |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7&inspect=1&audit=buttons · — · — | replay inspector | Persona | — | select / app | works | URL → /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP2.json&persona=P2&patient=9e937da7-1921-8752-9ee8-83a22ee5b4fd |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7&inspect=1&audit=buttons · — · — | replay inspector | Mr. Aaron Bruno Ankunding · 58 · AMB · Change patient | — | summary / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7&inspect=1&audit=buttons · — · — | replay inspector | Search by name or MRN | — | input / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7&inspect=1&audit=buttons · — · — | replay inspector | All sources | — | button / app | disabled-with-reason | Current patient source |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7&inspect=1&audit=buttons · — · — | replay inspector | Synthea | — | button / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7&inspect=1&audit=buttons · — · — | replay inspector | Synthetic Hospital | — | button / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7&inspect=1&audit=buttons · — · — | replay inspector | pediatric | — | button / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7&inspect=1&audit=buttons · — · — | replay inspector | allergic | — | button / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7&inspect=1&audit=buttons · — · — | replay inspector | anticoagulated | — | button / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7&inspect=1&audit=buttons · — · — | replay inspector | surgical | — | button / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7&inspect=1&audit=buttons · — · — | replay inspector | ED | — | button / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7&inspect=1&audit=buttons · — · — | replay inspector | inpatient | — | button / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7&inspect=1&audit=buttons · — · — | replay inspector | Abdul Bradford Sauer13 years · male · MRN 47466339pediatric | — | button / app | works | URL → /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=d0fe99e5-c869-b0e2-1379-6ff2293e6704 |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7&inspect=1&audit=buttons · — · — | replay inspector | Abe Bruen11 years · male · MRN 46220082pediatric | — | button / app | works | URL → /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=03a74d02-12a9-6ff0-5eb9-c44fff429559 |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7&inspect=1&audit=buttons · — · — | replay inspector | Reset episode | — | button / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7&inspect=1&audit=buttons · — · — | replay inspector | Dashboard | — | a / app | works | URL → /dashboard?run=run1-P3&view=Evolution&persona=P3 |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | VGI HEALTH | — | a / app | works | URL → / |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Recorded run | — | select / app | works | URL → /dashboard?run=mock&view=Evolution&persona=P3 |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Open EHR | — | a / app | works | URL → /ehr?mode=replay&persona=P3&run=run1-P3; real EHR rendered |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Live EHR | — | a / app | works | URL → / |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | UI browser | — | a / app | works | URL → /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 |
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
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Back | w1Rooming.back | click / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Patient workspace | w1Rooming.home | click / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
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
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Mark allergies reviewed | w1Rooming.review.allergyList | click / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Next: medication reconciliation | w1Rooming.next | click / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
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
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | UI browser | — | a / app | works | URL → /browse?patient=50d2c695-5faa-dfae-da75-4b182154a1ea&run=run1-P3 |
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
