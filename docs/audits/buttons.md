# Button audit

Generated 2026-11-01T09:32:39.345Z. Preview build; one Chromium worker.

| Scope | Works | Disabled with reason | Dead | Error |
|---|---:|---:|---:|---:|
| App baseline | 684 | 4 | 103 | 0 |
| App final | 429 | 75 | 0 | 0 |
| Lean final | 2317 | 40 | 0 | 0 |

App coverage includes additional worklist and drawer controls after the baseline. A complete pre-fix Lean census was not retained; see README.md.

Each sampled enabled control is clicked from an observed checkpoint. A changed input echo alone does not certify a Lean search. Selected navigation and reset controls must provide feedback or a disabled reason. Disabled commits are recorded with Lean's actual reason; the audit never fabricates safety evidence to enable a write.

| Route / persona / program | Screen | Label | Comp id | Kind / owner | Status | Observed effect |
|---|---|---|---|---|---|---|
| /?audit=buttons · P1 · — | sign-in | P1 · Primary care | — | button / app | works | POST /__dev/persona-password; POST /medplum/auth/login |
| /?audit=buttons · P1 · — | worklist | Worklist date | — | input / app | works | DOM changed |
| /?audit=buttons · P1 · — | worklist | Refresh worklist | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · — | worklist | Search Medplum | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · — | worklist | Dorthea Abshire · 1973-05-02 | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · — | encounter picker | Live encounter | — | select / app | works | DOM changed |
| /?audit=buttons · P1 · — | encounter picker | Start new encounter | — | button / app | works | POST /medplum/fhir/R4 |
| /?audit=buttons · P1 · — | encounter picker | Open EHR | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · — | live encounter header | Live encounter | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · — | live encounter header | Close live encounter | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · — | live encounter header | Back to worklist / refresh chart | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · — | live encounter header | Sign out | — | button / app | works | POST /medplum/oauth2/logout |
| /?audit=buttons · P2 · — | sign-in | P2 · Emergency | — | button / app | works | POST /__dev/persona-password; POST /medplum/auth/login |
| /?audit=buttons · P2 · — | worklist | Worklist date | — | input / app | works | DOM changed |
| /?audit=buttons · P2 · — | worklist | Refresh worklist | — | button / app | works | DOM changed |
| /?audit=buttons · P2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P2 · — | worklist | Search Medplum | — | button / app | works | DOM changed |
| /?audit=buttons · P2 · — | worklist | Dorthea Abshire · 1973-05-02 | — | button / app | works | DOM changed |
| /?audit=buttons · P2 · — | encounter picker | Live encounter | — | select / app | works | DOM changed |
| /?audit=buttons · P2 · — | encounter picker | Admission bed Select a bed for admitBed 4W-01-ABed 4W-03-ABed 4W-04-ABed 4W-02-ABed 4W-05-ABed 4W-06-ABed 5S-01-A | — | select / app | works | DOM changed |
| /?audit=buttons · P2 · — | encounter picker | Start new encounter | — | button / app | works | POST /medplum/fhir/R4 |
| /?audit=buttons · P2 · — | encounter picker | Open EHR | — | button / app | works | DOM changed |
| /?audit=buttons · P2 · — | live encounter header | Live encounter | — | button / app | works | DOM changed |
| /?audit=buttons · P2 · — | live encounter header | Close live encounter | — | button / app | works | DOM changed |
| /?audit=buttons · P2 · — | live encounter header | Back to worklist / refresh chart | — | button / app | works | DOM changed |
| /?audit=buttons · P2 · — | live encounter header | Sign out | — | button / app | works | POST /medplum/oauth2/logout |
| /?audit=buttons · P3 · — | sign-in | P3 · Inpatient RN | — | button / app | works | POST /__dev/persona-password; POST /medplum/auth/login |
| /?audit=buttons · P3 · — | worklist | Worklist date | — | input / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Refresh worklist | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Search Medplum | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Dorthea Abshire · 1973-05-02 | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | encounter picker | Live encounter | — | select / app | works | DOM changed |
| /?audit=buttons · P3 · — | encounter picker | Start new encounter | — | button / app | works | POST /medplum/fhir/R4 |
| /?audit=buttons · P3 · — | encounter picker | Open EHR | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | live encounter header | Live encounter | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | live encounter header | Close live encounter | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | live encounter header | Back to worklist / refresh chart | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | live encounter header | Sign out | — | button / app | works | POST /medplum/oauth2/logout |
| /?audit=buttons · P4 · — | sign-in | P4 · Pediatric NP | — | button / app | works | POST /__dev/persona-password; POST /medplum/auth/login |
| /?audit=buttons · P4 · — | worklist | Worklist date | — | input / app | works | DOM changed |
| /?audit=buttons · P4 · — | worklist | Refresh worklist | — | button / app | works | DOM changed |
| /?audit=buttons · P4 · — | worklist | Search Medplum | — | button / app | works | DOM changed |
| /?audit=buttons · P4 · — | worklist | Dorthea Abshire · 1973-05-02 | — | button / app | works | DOM changed |
| /?audit=buttons · P4 · — | encounter picker | Live encounter | — | select / app | works | DOM changed |
| /?audit=buttons · P4 · — | encounter picker | Start new encounter | — | button / app | works | POST /medplum/fhir/R4 |
| /?audit=buttons · P4 · — | encounter picker | Open EHR | — | button / app | works | DOM changed |
| /?audit=buttons · P4 · — | live encounter header | Live encounter | — | button / app | works | DOM changed |
| /?audit=buttons · P4 · — | live encounter header | Close live encounter | — | button / app | works | DOM changed |
| /?audit=buttons · P4 · — | live encounter header | Back to worklist / refresh chart | — | button / app | works | DOM changed |
| /?audit=buttons · P4 · — | live encounter header | Sign out | — | button / app | works | POST /medplum/oauth2/logout |
| /?audit=buttons · P5 · — | sign-in | P5 · Surgeon | — | button / app | works | POST /__dev/persona-password; POST /medplum/auth/login |
| /?audit=buttons · P5 · — | worklist | Worklist date | — | input / app | works | DOM changed |
| /?audit=buttons · P5 · — | worklist | Refresh worklist | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · — | worklist | Search Medplum | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · — | worklist | Dorthea Abshire · 1973-05-02 | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · — | encounter picker | Live encounter | — | select / app | works | DOM changed |
| /?audit=buttons · P5 · — | encounter picker | Start new encounter | — | button / app | works | POST /medplum/fhir/R4 |
| /?audit=buttons · P5 · — | encounter picker | Open EHR | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · — | live encounter header | Live encounter | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · — | live encounter header | Close live encounter | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · — | live encounter header | Back to worklist / refresh chart | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · — | live encounter header | Sign out | — | button / app | works | POST /medplum/oauth2/logout |
| /?audit=buttons · RN2 · — | sign-in | RN2 · Second nurse | — | button / app | works | POST /__dev/persona-password; POST /medplum/auth/login |
| /?audit=buttons · RN2 · — | worklist | Worklist date | — | input / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Refresh worklist | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Search Medplum | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Dorthea Abshire · 1973-05-02 | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | encounter picker | Live encounter | — | select / app | works | DOM changed |
| /?audit=buttons · RN2 · — | encounter picker | Start new encounter | — | button / app | works | POST /medplum/fhir/R4 |
| /?audit=buttons · RN2 · — | encounter picker | Open EHR | — | button / app | works | Lean state changed; result null |
| /?audit=buttons · RN2 · — | live encounter header | Live encounter | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | live encounter header | Close live encounter | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | live encounter header | Back to worklist / refresh chart | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | live encounter header | Sign out | — | button / app | works | POST /medplum/oauth2/logout |
| /?audit=buttons · baseline · — | sign-in | Original canonical EHR (baseline) | — | button / app | works | POST /__dev/persona-password; POST /medplum/auth/login |
| /?audit=buttons · baseline · — | worklist | Worklist date | — | input / app | works | DOM changed |
| /?audit=buttons · baseline · — | worklist | Refresh worklist | — | button / app | works | DOM changed |
| /?audit=buttons · baseline · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · baseline · — | worklist | Search Medplum | — | button / app | works | DOM changed |
| /?audit=buttons · baseline · — | worklist | Dorthea Abshire · 1973-05-02 | — | button / app | works | DOM changed |
| /?audit=buttons · baseline · — | encounter picker | Live encounter | — | select / app | works | DOM changed |
| /?audit=buttons · baseline · — | encounter picker | Start new encounter | — | button / app | works | POST /medplum/fhir/R4 |
| /?audit=buttons · baseline · — | encounter picker | Open EHR | — | button / app | works | Lean state changed; result null |
| /?audit=buttons · baseline · — | live encounter header | Live encounter | — | button / app | works | DOM changed |
| /?audit=buttons · baseline · — | live encounter header | Close live encounter | — | button / app | works | DOM changed |
| /?audit=buttons · baseline · — | live encounter header | Back to worklist / refresh chart | — | button / app | works | DOM changed |
| /?audit=buttons · baseline · — | live encounter header | Sign out | — | button / app | works | POST /medplum/oauth2/logout |
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
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | Inspector | — | button / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | Reset episode | — | button / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | Close inspector | — | button / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | Close inspector | — | button / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | ← UI browser | — | a / app | works | URL → /browse?patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7&run=run1-P3 |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | Persona | — | select / app | works | URL → /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP2.json&persona=P2&patient=9e937da7-1921-8752-9ee8-83a22ee5b4fd |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | Mr. Aaron Bruno Ankunding · 58 · AMB · Change patient | — | summary / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | Reset episode | — | button / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | Dashboard | — | a / app | works | URL → /dashboard?run=run1-P3&view=Evolution&persona=P3 |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | Close inspector | — | button / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | ← UI browser | — | a / app | works | URL → /browse?patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7&run=run1-P3 |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | Persona | — | select / app | works | URL → /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP2.json&persona=P2&patient=9e937da7-1921-8752-9ee8-83a22ee5b4fd |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | Mr. Aaron Bruno Ankunding · 58 · AMB · Change patient | — | summary / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | Search by name or MRN | — | input / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | All sources | — | button / app | disabled-with-reason | Current patient source |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | Synthea | — | button / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | Synthetic Hospital | — | button / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | pediatric | — | button / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | allergic | — | button / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | anticoagulated | — | button / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | surgical | — | button / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | ED | — | button / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | inpatient | — | button / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | Abdul Bradford Sauer13 years · male · MRN 47466339pediatric | — | button / app | works | URL → /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=d0fe99e5-c869-b0e2-1379-6ff2293e6704 |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | Abe Bruen11 years · male · MRN 46220082pediatric | — | button / app | works | URL → /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=03a74d02-12a9-6ff0-5eb9-c44fff429559 |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | Reset episode | — | button / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | Dashboard | — | a / app | works | URL → /dashboard |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | VGI HEALTH | — | a / app | works | URL → / |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Recorded run | — | select / app | works | URL → /dashboard?run=mock&view=Evolution&persona=P3 |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Open EHR | — | a / app | works | URL → /ehr?mode=replay&release=v3&program=runs%2Frun1-P3%2Fprograms%2FP3%2Fv7.json&persona=P3&patient=50d2c695-5faa-dfae-da75-4b182154a1ea; real EHR rendered |
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
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Navigator | — | button / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Med rec | w1Rooming.nav.w1MedRec | click / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | HPI / ROS | w1Rooming.nav.w1Hpi | click / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Exam / A&P | w1Rooming.nav.w1Exam | click / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Orders | w1Rooming.nav.w1Orders | click / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Labs | w1Rooming.nav.w1Labs | click / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Visit close | w1Rooming.nav.w1Close | click / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Collapse section | w1Rooming.sidebar | click / app | disabled-with-reason | Collapse section · Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Search chart | w1Rooming.chartSearch | enter / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
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
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Weight (kg) | w1Rooming.weight | enter / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Height (cm) | w1Rooming.height | enter / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | BP systolic | w1Rooming.bpSystolic | enter / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | BP diastolic | w1Rooming.bpDiastolic | enter / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Heart rate | w1Rooming.heartRate | enter / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Respiratory rate | w1Rooming.respRate | enter / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Temperature | w1Rooming.temperature | enter / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | SpO₂ | w1Rooming.spo2 | enter / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Pain (0–10) | w1Rooming.painScore | enter / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Chief complaint | w1Rooming.chiefComplaint | enter / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Collapse section | w1Rooming.intake | click / app | disabled-with-reason | Collapse section · Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Tobacco use | w1Rooming.tobaccoUse | enter / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Fall in the past year? | w1Rooming.fallRiskScreen | enter / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Travel in the past 30 days? | w1Rooming.travelScreen | enter / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Advance directive discussed | w1Rooming.advanceDirectiveAsked | enter / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Interpreter needed? | w1Rooming.interpreterNeeded | enter / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Preferred pharmacy confirmed | w1Rooming.pharmacyConfirmedRooming | enter / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Collapse section | w1Rooming.phq | click / app | disabled-with-reason | Collapse section · Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | PHQ-2 score | w1Rooming.depressionScreen | enter / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
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
| /dashboard?run=run1-P3&view=Try+to+break+it&persona=P3 · P3 · run1-P3 | Try to break it | Recorded proposal P3 · Night 1 · Put human allergy review in the home and shift-worklist sidebars.P3 · Night 1 · Place administration work before generic chart-reference tabs.P3 · Night 1 · Collapse optional chart-reference tabs above the assessment fields.P3 · Night 1 · Hide the administration allergy panel only while its review receipt is valid.P3 · Night 1 · Declutter "Administer medication": move the allergy list into a secondary tab so the sign button sits higherP3 · Night 2 · Support early allergy review in the home sidebar and reuse valid receipts during administration.P3 · Night 2 · Pre-fill patient-ID re-entry on "Sign orders" from the chart so signing needs one confirm clickP3 · Night 4 · Hide the administration allergy panel only while a valid RN review receipt exists.P3 · Night 4 · Pre-fill weight on "Rooming" from the triage weight as entered (lb) instead of re-typing it in kgP3 · Night 5 · Hide the administration allergy panel only while a valid RN allergy receipt exists.P3 · Night 7 · Use valid RN allergy-review receipts to shorten the administration screen.P3 · Night 8 · Hide the administration allergy panel only while a valid RN review receipt exists.P3 · Night 9 · Hide administration allergies only while a valid nursing review receipt exists. | — | select / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Try+to+break+it&persona=P3 · P3 · run1-P3 | Try to break it | Run live attempt | — | button / app | disabled-with-reason | Enter a request first |
| /dashboard?run=run1-P3&view=Try+to+break+it&persona=P3 · P3 · run1-P3 | Try to break it | Live request | — | textarea / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Try+to+break+it&persona=P3 · P3 · run1-P3 | Try to break it | Run live attempt | — | button / app | works | DOM changed; live verdict fail (reviewsBeforeCommit) |
| /dashboard?run=run1-P3&view=Try+to+break+it&persona=P3 · P3 · run1-P3 | Try to break it | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Try+to+break+it&persona=P3 · P3 · run1-P3 | Try to break it | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Try+to+break+it&persona=P3 · P3 · run1-P3 | Try to break it | Close decision record | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · canonical-P1 | home | Search chart | home.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | home | Schedule | home.work.w1Rooming | click / {"button":{"action":{"goto":{"screen":"w1Rooming"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | home | In Basket: Results | home.work.w2Inbasket | click / {"button":{"action":{"goto":{"screen":"w2Inbasket"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | home | In Basket: Rx Requests | home.work.w7Queue | click / {"button":{"action":{"goto":{"screen":"w7Queue"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | home | Problem list | home.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | home | Results | home.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | home | Notes | home.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | home | Medications | home.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | home | Allergies | home.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | home | Encounters | home.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | home | Coverage | home.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | home | History | home.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Rooming | Search chart | w1Rooming.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Rooming | Collapse section | w1Rooming.vitalsGroup | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Rooming | Confirm prefilled value | w1Rooming.weight | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":{"fromRecord":{"fact":"weightToday"}},"element":"weight"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Rooming | Pain (0–10) | w1Rooming.painScore | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"painScore"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Rooming | Collapse section | w1Rooming.intake | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Rooming | Tobacco use | w1Rooming.tobaccoUse | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"tobaccoUse"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Rooming | Fall in the past year? | w1Rooming.fallRiskScreen | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"fallRiskScreen"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Rooming | Travel in the past 30 days? | w1Rooming.travelScreen | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"travelScreen"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Rooming | Advance directive discussed | w1Rooming.advanceDirectiveAsked | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"advanceDirectiveAsked"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Rooming | Interpreter needed? | w1Rooming.interpreterNeeded | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"interpreterNeeded"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Rooming | Preferred pharmacy confirmed | w1Rooming.pharmacyConfirmedRooming | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"pharmacyConfirmedRooming"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Rooming | Collapse section | w1Rooming.phq | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Rooming | PHQ-2 score | w1Rooming.depressionScreen | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"depressionScreen"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Rooming | Collapse section | w1Rooming.allergyGroup | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Rooming | Mark allergies reviewed | w1Rooming.review.allergyList | click / {"button":{"action":{"markReviewed":{"info":"allergyList"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons · P1 · canonical-P1 | w1Rooming | /medplum/fhir/R4/Provenance/dc3976ed-c1bd-4bb1-b87d-07ba77ecd01e | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · canonical-P1 | w1Rooming | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · canonical-P1 | w1Rooming | Back | w1Rooming.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Rooming | Patient workspace | w1Rooming.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Rooming | Med rec | w1Rooming.nav.w1MedRec | click / {"button":{"action":{"goto":{"screen":"w1MedRec"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Rooming | HPI / ROS | w1Rooming.nav.w1Hpi | click / {"button":{"action":{"goto":{"screen":"w1Hpi"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Rooming | Exam / A&P | w1Rooming.nav.w1Exam | click / {"button":{"action":{"goto":{"screen":"w1Exam"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Rooming | Orders | w1Rooming.nav.w1Orders | click / {"button":{"action":{"goto":{"screen":"w1Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Rooming | Labs | w1Rooming.nav.w1Labs | click / {"button":{"action":{"goto":{"screen":"w1Labs"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Rooming | Visit close | w1Rooming.nav.w1Close | click / {"button":{"action":{"goto":{"screen":"w1Close"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Rooming | Results | w1Rooming.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Rooming | Imaging | w1Rooming.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Rooming | Notes | w1Rooming.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Rooming | Encounters | w1Rooming.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Rooming | Social history | w1Rooming.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Rooming | Family history | w1Rooming.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Rooming | Care gaps | w1Rooming.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Rooming | Immunizations | w1Rooming.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Rooming | Coverage | w1Rooming.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Inbasket | Search chart | w2Inbasket.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Inbasket | Search in-basket | w2Inbasket.basketSearch | enter / {"search":{"scope":"inbasket"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Inbasket | Back | w2Inbasket.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Inbasket | Result | w2Inbasket.nav.w2Result | click / {"button":{"action":{"goto":{"screen":"w2Result"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Inbasket | Message patient | w2Inbasket.nav.w2Message | click / {"button":{"action":{"goto":{"screen":"w2Message"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Inbasket | All results | w2Inbasket.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Inbasket | Notes | w2Inbasket.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Inbasket | Encounters | w2Inbasket.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Inbasket | Imaging | w2Inbasket.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Queue | Search chart | w7Queue.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Queue | Back | w7Queue.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Queue | Chart review | w7Queue.nav.w7Review | click / {"button":{"action":{"goto":{"screen":"w7Review"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Queue | Encounters | w7Queue.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Queue | Imaging | w7Queue.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Queue | Care gaps | w7Queue.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Search chart | w1MedRec.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Mark medications reviewed | w1MedRec.review.currentMeds | click / {"button":{"action":{"markReviewed":{"info":"currentMeds"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | /medplum/fhir/R4/Provenance/d097cca2-0530-4877-aedd-167316fec3b0 | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Collapse section | w1MedRec.rows | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Medication 1: continue / stop / modify | w1MedRec.decision0 | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"medRecDecision"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Medication 2: continue / stop / modify | w1MedRec.decision1 | enter / {"field":{"slot":{"fixed":{"n":1}},"prefill":"none","element":"medRecDecision"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Medication 3: continue / stop / modify | w1MedRec.decision2 | enter / {"field":{"slot":{"fixed":{"n":2}},"prefill":"none","element":"medRecDecision"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Medication 4: continue / stop / modify | w1MedRec.decision3 | enter / {"field":{"slot":{"fixed":{"n":3}},"prefill":"none","element":"medRecDecision"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Last plan | w1MedRec.medTabs | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Fill history | w1MedRec.medTabs | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Back | w1MedRec.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Results | w1MedRec.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Imaging | w1MedRec.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Notes | w1MedRec.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Encounters | w1MedRec.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Social history | w1MedRec.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Family history | w1MedRec.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Care gaps | w1MedRec.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Immunizations | w1MedRec.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Coverage | w1MedRec.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Hpi | Search chart | w1Hpi.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Hpi | Copy forward last note | w1Hpi.copyForward | click / {"macro":{"id":"w1CopyForward"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Hpi | ROS template (12 systems negative) | w1Hpi.rosTemplate | click / {"macro":{"id":"w1RosTemplate"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Hpi | Expand section | w1Hpi.lastNote | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Hpi | Back | w1Hpi.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Hpi | Results | w1Hpi.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Hpi | Imaging | w1Hpi.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Hpi | Notes | w1Hpi.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Hpi | Encounters | w1Hpi.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Hpi | Social history | w1Hpi.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Hpi | Family history | w1Hpi.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Hpi | Care gaps | w1Hpi.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Hpi | Immunizations | w1Hpi.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Hpi | Coverage | w1Hpi.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Exam | Search chart | w1Exam.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Exam | Normal exam template | w1Exam.examTemplate | click / {"macro":{"id":"w1ExamTemplate"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Exam | Visit diagnosis (ICD-10) | w1Exam.visitDiagnosis | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"visitDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Exam | Back | w1Exam.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Exam | Results | w1Exam.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Exam | Imaging | w1Exam.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Exam | Notes | w1Exam.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Exam | Encounters | w1Exam.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Exam | Social history | w1Exam.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Exam | Family history | w1Exam.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Exam | Care gaps | w1Exam.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Exam | Immunizations | w1Exam.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Exam | Coverage | w1Exam.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Search chart | w1Orders.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Find orders | w1Orders.orderSearch | enter / {"search":{"scope":"formulary"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Collapse section | w1Orders.prefList | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Lisinopril 10 mg daily | w1Orders.prefLisinopril | click / {"macro":{"id":"w1PrefLisinopril"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Atorvastatin 40 mg daily | w1Orders.prefAtorvastatin | click / {"macro":{"id":"w1PrefAtorvastatin"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Metformin 500 mg BID | w1Orders.prefMetformin | click / {"macro":{"id":"w1PrefMetformin"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Amoxicillin 1 g TID × 10 days | w1Orders.prefAmoxicillin | click / {"macro":{"id":"w1PrefAmoxicillin"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Azithromycin 500 mg daily × 5 days | w1Orders.prefAzithromycin | click / {"macro":{"id":"w1PrefAzithromycin"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Ibuprofen 600 mg TID | w1Orders.prefIbuprofen | click / {"macro":{"id":"w1PrefIbuprofen"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Oxycodone 10 mg q6h PRN × 5 days | w1Orders.prefOxycodone | click / {"macro":{"id":"w1PrefOxycodone"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Collapse section | w1Orders.dosing | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Confirm prefilled value | w1Orders.dosingWeight | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":{"linked":{"element":"weight"}},"element":"dosingWeight"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Collapse section | w1Orders.medication | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Enter Medication | w1Orders.drug | enter / {"field":{"slot":"current","prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Antibiotic indication (required for antibiotics) | w1Orders.abxIndication | enter / {"field":{"slot":"current","prefill":"none","element":"abxIndication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Dose unit | w1Orders.doseUnit | enter / {"field":{"slot":"current","prefill":"none","element":"doseUnit"}} / lean | works | DOM changed |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Route | w1Orders.route | enter / {"field":{"slot":"current","prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Frequency | w1Orders.freq | enter / {"field":{"slot":"current","prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | As needed (PRN) | w1Orders.prn | enter / {"field":{"slot":"current","prefill":"none","element":"prn"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Collapse section | w1Orders.dispense | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Duration | w1Orders.duration | enter / {"field":{"slot":"current","prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Generic substitution allowed | w1Orders.substitution | enter / {"field":{"slot":"current","prefill":"none","element":"substitution"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Collapse section | w1Orders.dx | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Pharmacy | w1Orders.pharmacy | enter / {"field":{"slot":"current","prefill":{"fromRecord":{"fact":"preferredPharmacy"}},"element":"pharmacy"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Associated diagnosis (ICD-10) | w1Orders.orderDiagnosis | enter / {"field":{"slot":"current","prefill":{"linked":{"element":"visitDiagnosis"}},"element":"orderDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Collapse section | w1Orders.controlled | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | CURES not checked: exemption | w1Orders.curesExemptionReason | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"curesExemptionReason"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Naloxone offered | w1Orders.naloxoneOffer | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"naloxoneOffer"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Overdose and naloxone education given | w1Orders.naloxoneEducation | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"naloxoneEducation"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Expand section | w1Orders.more | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Current meds | w1Orders.orderInfo | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | CURES report | w1Orders.orderInfo | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Recent labs | w1Orders.orderInfo | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Request authorization (human entry) | w1Orders.priorAuthRequest | enter / {"field":{"slot":"current","prefill":"none","element":"priorAuthRequest"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Request prior authorization | w1Orders.requestPriorAuth | click / {"button":{"action":"requestPriorAuth"}} / lean | disabled-with-reason | no order on this line |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Accept and add another order | w1Orders.newLine | click / {"button":{"action":"newOrderLine"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Back | w1Orders.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Results | w1Orders.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Imaging | w1Orders.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Notes | w1Orders.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Encounters | w1Orders.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Social history | w1Orders.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Family history | w1Orders.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Care gaps | w1Orders.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Immunizations | w1Orders.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Coverage | w1Orders.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Review and sign | w1Orders.toSign | click / {"button":{"action":{"goto":{"screen":"w1Verify"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Add imaging / procedure order | w1Labs.newServiceOrder | click / {"button":{"action":"newOrderLine"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Kind: imaging / procedure | w1Labs.orderKind | enter / {"field":{"slot":"current","prefill":"none","element":"orderKind"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Service code | w1Labs.orderCode | enter / {"field":{"slot":"current","prefill":"none","element":"orderCode"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Request authorization (human entry) | w1Labs.priorAuthRequest | enter / {"field":{"slot":"current","prefill":"none","element":"priorAuthRequest"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Request service prior authorization | w1Labs.requestServicePriorAuth | click / {"button":{"action":"requestPriorAuth"}} / lean | disabled-with-reason | no order on this line |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Search chart | w1Labs.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Search lab tests | w1Labs.labSearch | enter / {"search":{"scope":"loinc"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Collapse section | w1Labs.labOrder | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Test | w1Labs.labTest | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"labTest"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Diagnosis (ICD-10) | w1Labs.labDiagnosis | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":{"linked":{"element":"visitDiagnosis"}},"element":"labDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Priority | w1Labs.labPriority | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"labPriority"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Fasting required | w1Labs.labFasting | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"labFasting"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Back | w1Labs.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Results | w1Labs.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Imaging | w1Labs.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Notes | w1Labs.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Encounters | w1Labs.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Social history | w1Labs.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Family history | w1Labs.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Care gaps | w1Labs.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Immunizations | w1Labs.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Coverage | w1Labs.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Close | Search chart | w1Close.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Close | Billing diagnosis (ICD-10) | w1Close.claimDiagnosis | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":{"linked":{"element":"visitDiagnosis"}},"element":"claimDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Close | Level of service | w1Close.levelOfService | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"levelOfService"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Close | Follow-up | w1Close.followUp | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"followUp"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Close | Instructions template | w1Close.avsTemplate | click / {"macro":{"id":"w1AvsTemplate"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Close | Sign note | w1Close.commit.signNote | click / {"button":{"action":{"commit":{"commit":"signNote"}}}} / lean | disabled-with-reason | entry required: Chief complaint |
| /?audit=buttons · P1 · canonical-P1 | w1Close | Back | w1Close.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Close | Results | w1Close.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Close | Imaging | w1Close.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Close | Notes | w1Close.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Close | Encounters | w1Close.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Close | Social history | w1Close.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Close | Family history | w1Close.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Close | Care gaps | w1Close.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Close | Immunizations | w1Close.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Close | Coverage | w1Close.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Result | Search chart | w2Result.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Result | Action | w2Result.resultAction | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"resultAction"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Result | Follow-up test | w2Result.resultFollowUpOrder | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"resultFollowUpOrder"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Result | Acknowledge and mark done | w2Result.commit.ackResult | click / {"button":{"action":{"commit":{"commit":"ackResult"}}}} / lean | disabled-with-reason | entry required: Result action |
| /?audit=buttons · P1 · canonical-P1 | w2Result | Back | w2Result.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Result | All results | w2Result.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Result | Notes | w2Result.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Result | Encounters | w2Result.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Result | Imaging | w2Result.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Message | Search chart | w2Message.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Message | Template: normal result | w2Message.normalLetter | click / {"macro":{"id":"w2NormalLetter"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Message | Template: repeat the test | w2Message.repeatLetter | click / {"macro":{"id":"w2RepeatLetter"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Message | Back | w2Message.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Message | All results | w2Message.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Message | Notes | w2Message.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Message | Encounters | w2Message.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Message | Imaging | w2Message.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Review | Search chart | w7Review.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Review | Last visit | w7Review.refillTabs | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Review | Labs | w7Review.refillTabs | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Review | Fill history | w7Review.refillTabs | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Review | Medications | w7Review.refillTabs | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Review | Last note | w7Review.refillTabs | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Review | Mark last visit reviewed | w7Review.review.lastVisit | click / {"button":{"action":{"markReviewed":{"info":"lastVisit"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons · P1 · canonical-P1 | w7Review | /medplum/fhir/R4/Provenance/58f1e13e-1d17-4f0b-a7ab-cf2d5603747e | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · canonical-P1 | w7Review | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · canonical-P1 | w7Review | Back | w7Review.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Review | Encounters | w7Review.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Review | Imaging | w7Review.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Review | Care gaps | w7Review.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Review | Go to decision | w7Review.decide | click / {"button":{"action":{"goto":{"screen":"w7Decision"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Exam | Confirm prefilled value | w1Exam.exam | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"exam"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Exam | Confirm prefilled value | w1Exam.assessmentPlan | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"assessmentPlan"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Hpi | Confirm prefilled value | w1Hpi.ros | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"ros"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Confirm prefilled value | w1Orders.drug | confirm / {"field":{"slot":"current","prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Confirm prefilled value | w1Orders.dose | confirm / {"field":{"slot":"current","prefill":"none","element":"dose"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Confirm prefilled value | w1Orders.doseUnit | confirm / {"field":{"slot":"current","prefill":"none","element":"doseUnit"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Confirm prefilled value | w1Orders.route | confirm / {"field":{"slot":"current","prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Confirm prefilled value | w1Orders.freq | confirm / {"field":{"slot":"current","prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Confirm prefilled value | w1Orders.duration | confirm / {"field":{"slot":"current","prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Confirm prefilled value | w1Orders.quantity | confirm / {"field":{"slot":"current","prefill":"none","element":"quantity"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Confirm prefilled value | w1Orders.refills | confirm / {"field":{"slot":"current","prefill":"none","element":"refills"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Accept and add another order | w1Orders.newLine | click / {"button":{"action":"newOrderLine"}} / lean | disabled-with-reason | finish this order line first |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Confirm prefilled value | w1Orders.abxIndication | confirm / {"field":{"slot":"current","prefill":"none","element":"abxIndication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | I have reviewed the patient's allergies | w1Orders.allergyReconfirmOrdering | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"allergyReconfirmOrdering"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Mark CURES report reviewed | w1Orders.review.curesReport | click / {"button":{"action":{"markReviewed":{"info":"curesReport"}}}} / lean | works | DOM changed; validation drawer: No versioned source record for review: curesReport Your inputs are retained. Close this panel, correct the issue, and retry the action. |
| /?audit=buttons · P1 · canonical-P1 | w1Verify | Search chart | w1Verify.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Verify | Allergies re-verified before signing | w1Verify.allergyReconfirmSigning | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"allergyReconfirmSigning"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Verify | Back | w1Verify.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Verify | Results | w1Verify.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Verify | Imaging | w1Verify.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Verify | Notes | w1Verify.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Verify | Encounters | w1Verify.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Verify | Social history | w1Verify.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Verify | Family history | w1Verify.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Verify | Care gaps | w1Verify.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Verify | Immunizations | w1Verify.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Verify | Coverage | w1Verify.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Verify | Continue to sign | w1Verify.continue | click / {"button":{"action":{"goto":{"screen":"w1Sign"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Close | Confirm prefilled value | w1Close.patientInstructions | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"patientInstructions"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Message | Confirm prefilled value | w2Message.patientMessage | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"patientMessage"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Review | Mark fill history reviewed | w7Review.review.adherence | click / {"button":{"action":{"markReviewed":{"info":"adherence"}}}} / lean | works | DOM changed; validation drawer: No versioned source record for review: adherence Your inputs are retained. Close this panel, correct the issue, and retry the action. |
| /?audit=buttons · P1 · canonical-P1 | w7Decision | Search chart | w7Decision.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Decision | Collapse section | w7Decision.decisionGroup | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Decision | Approve / deny / modify | w7Decision.refillDecision | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"refillDecision"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Decision | Pharmacy | w7Decision.refillPharmacy | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":{"fromRecord":{"fact":"requestPharmacy"}},"element":"refillPharmacy"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Decision | Refill protocol criteria met | w7Decision.refillProtocolMet | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"refillProtocolMet"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Decision | Reason for denial | w7Decision.refillDenyReason | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"refillDenyReason"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Decision | Deny refill | w7Decision.commit.denyRefill | click / {"button":{"action":{"commit":{"commit":"denyRefill"}}}} / lean | disabled-with-reason | entry required: Refill decision |
| /?audit=buttons · P1 · canonical-P1 | w7Decision | Sign refill decision | w7Decision.commit.approveRefill | click / {"button":{"action":{"commit":{"commit":"approveRefill"}}}} / lean | disabled-with-reason | entry required: Refill decision |
| /?audit=buttons · P1 · canonical-P1 | w7Decision | Back | w7Decision.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Decision | Encounters | w7Decision.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Decision | Imaging | w7Decision.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Decision | Care gaps | w7Decision.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Sign | Search chart | w1Sign.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Sign | Sign orders | w1Sign.commit.signOrders | click / {"button":{"action":{"commit":{"commit":"signOrders"}}}} / lean | disabled-with-reason | Re-enter patient ID (initials / sex / age) to sign |
| /?audit=buttons · P1 · canonical-P1 | w1Sign | Back | w1Sign.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Sign | Results | w1Sign.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Sign | Imaging | w1Sign.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Sign | Notes | w1Sign.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Sign | Encounters | w1Sign.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Sign | Social history | w1Sign.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Sign | Family history | w1Sign.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Sign | Care gaps | w1Sign.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Sign | Immunizations | w1Sign.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Sign | Coverage | w1Sign.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | home | Search chart | home.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | home | ED Track Board | home.work.w3TrackBoard | click / {"button":{"action":{"goto":{"screen":"w3TrackBoard"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | home | Problem list | home.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | home | Results | home.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | home | Notes | home.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | home | Medications | home.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | home | Allergies | home.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | home | Encounters | home.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | home | Coverage | home.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | home | History | home.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3TrackBoard | Search chart | w3TrackBoard.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3TrackBoard | Back | w3TrackBoard.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3TrackBoard | Patient workspace | w3TrackBoard.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3TrackBoard | Triage | w3TrackBoard.nav.w3Triage | click / {"button":{"action":{"goto":{"screen":"w3Triage"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3TrackBoard | Provider note | w3TrackBoard.nav.w3Provider | click / {"button":{"action":{"goto":{"screen":"w3Provider"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3TrackBoard | Order sets | w3TrackBoard.nav.w3OrderSets | click / {"button":{"action":{"goto":{"screen":"w3OrderSets"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3TrackBoard | Orders | w3TrackBoard.nav.w3Orders | click / {"button":{"action":{"goto":{"screen":"w3Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3TrackBoard | Disposition | w3TrackBoard.nav.w3Disposition | click / {"button":{"action":{"goto":{"screen":"w3Disposition"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3TrackBoard | Results | w3TrackBoard.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3TrackBoard | Imaging | w3TrackBoard.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3TrackBoard | Notes | w3TrackBoard.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3TrackBoard | Encounters | w3TrackBoard.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Triage | Search chart | w3Triage.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Triage | Collapse section | w3Triage.vitalsGroup | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Triage | Pain (0–10) | w3Triage.painScore | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"painScore"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Triage | Acuity (ESI) | w3Triage.triageAcuity | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"triageAcuity"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Triage | Arrival mode | w3Triage.arrivalMode | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"arrivalMode"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Triage | Isolation screen | w3Triage.isolationScreen | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"isolationScreen"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Triage | Collapse section | w3Triage.allergyGroup | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Triage | Mark allergies reviewed | w3Triage.review.allergyList | click / {"button":{"action":{"markReviewed":{"info":"allergyList"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons · P2 · canonical-P2 | w3Triage | /medplum/fhir/R4/Provenance/281bbd04-fb46-4c18-a8f3-996bbe0e4d78 | — | button / app | works | DOM changed |
| /?audit=buttons · P2 · canonical-P2 | w3Triage | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons · P2 · canonical-P2 | w3Triage | Back | w3Triage.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Triage | Results | w3Triage.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Triage | Imaging | w3Triage.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Triage | Notes | w3Triage.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Triage | Encounters | w3Triage.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Provider | Search chart | w3Provider.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Provider | Medication reconciliation decision | w3Provider.medRecDecision | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"medRecDecision"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Provider | Billing diagnosis (ICD-10) | w3Provider.claimDiagnosis | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":{"linked":{"element":"visitDiagnosis"}},"element":"claimDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Provider | Level of service | w3Provider.levelOfService | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"levelOfService"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Provider | Sign ED note | w3Provider.commit.signNote | click / {"button":{"action":{"commit":{"commit":"signNote"}}}} / lean | disabled-with-reason | entry required: Chief complaint |
| /?audit=buttons · P2 · canonical-P2 | w3Provider | Back | w3Provider.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Provider | Results | w3Provider.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Provider | Imaging | w3Provider.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Provider | Notes | w3Provider.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Provider | Encounters | w3Provider.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Search chart | w3OrderSets.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Collapse section | w3OrderSets.sets | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Sepsis (adult) | w3OrderSets.sepsis | click / {"macro":{"id":"w3SepsisSet"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Abdominal pain | w3OrderSets.abdominal | click / {"macro":{"id":"w3AbdominalPainSet"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Cellulitis | w3OrderSets.cellulitis | click / {"macro":{"id":"w3CellulitisSet"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Collapse section | w3OrderSets.row10 | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Collapse section | w3OrderSets.row10.medication | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Enter Medication | w3OrderSets.row10.drug | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Antibiotic indication (required for antibiotics) | w3OrderSets.row10.abxIndication | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"abxIndication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Dose unit | w3OrderSets.row10.doseUnit | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"doseUnit"}} / lean | works | DOM changed |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Route | w3OrderSets.row10.route | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Frequency | w3OrderSets.row10.freq | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | As needed (PRN) | w3OrderSets.row10.prn | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"prn"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Collapse section | w3OrderSets.row10.dispense | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Duration | w3OrderSets.row10.duration | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Generic substitution allowed | w3OrderSets.row10.substitution | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"substitution"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Collapse section | w3OrderSets.row10.dx | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Pharmacy | w3OrderSets.row10.pharmacy | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":{"fromRecord":{"fact":"preferredPharmacy"}},"element":"pharmacy"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Associated diagnosis (ICD-10) | w3OrderSets.row10.orderDiagnosis | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":{"linked":{"element":"visitDiagnosis"}},"element":"orderDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Collapse section | w3OrderSets.row11 | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Collapse section | w3OrderSets.row11.medication | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Enter Medication | w3OrderSets.row11.drug | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Antibiotic indication (required for antibiotics) | w3OrderSets.row11.abxIndication | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"abxIndication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Dose unit | w3OrderSets.row11.doseUnit | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"doseUnit"}} / lean | works | DOM changed |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Route | w3OrderSets.row11.route | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Frequency | w3OrderSets.row11.freq | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | As needed (PRN) | w3OrderSets.row11.prn | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"prn"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Collapse section | w3OrderSets.row11.dispense | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Duration | w3OrderSets.row11.duration | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Generic substitution allowed | w3OrderSets.row11.substitution | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"substitution"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Collapse section | w3OrderSets.row11.dx | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Pharmacy | w3OrderSets.row11.pharmacy | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":{"fromRecord":{"fact":"preferredPharmacy"}},"element":"pharmacy"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Associated diagnosis (ICD-10) | w3OrderSets.row11.orderDiagnosis | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":{"linked":{"element":"visitDiagnosis"}},"element":"orderDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Back | w3OrderSets.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Results | w3OrderSets.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Imaging | w3OrderSets.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Notes | w3OrderSets.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Encounters | w3OrderSets.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Review and sign | w3OrderSets.toSign | click / {"button":{"action":{"goto":{"screen":"w3Sign"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Search chart | w3Orders.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Find orders | w3Orders.orderSearch | enter / {"search":{"scope":"formulary"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Collapse section | w3Orders.prefList | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Acetaminophen 1 g PO | w3Orders.prefAcetaminophen | click / {"macro":{"id":"w3PrefAcetaminophen"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Ibuprofen 600 mg PO | w3Orders.prefIbuprofen | click / {"macro":{"id":"w3PrefIbuprofen"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Ondansetron 8 mg IV | w3Orders.prefOndansetron | click / {"macro":{"id":"w3PrefOndansetron"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Ceftriaxone 2 g IV | w3Orders.prefCeftriaxone | click / {"macro":{"id":"w3PrefCeftriaxone"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Morphine 10 mg IV q4h PRN | w3Orders.prefMorphine | click / {"macro":{"id":"w3PrefMorphine"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Collapse section | w3Orders.dosing | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Collapse section | w3Orders.medication | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Enter Medication | w3Orders.drug | enter / {"field":{"slot":"current","prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Antibiotic indication (required for antibiotics) | w3Orders.abxIndication | enter / {"field":{"slot":"current","prefill":"none","element":"abxIndication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Dose unit | w3Orders.doseUnit | enter / {"field":{"slot":"current","prefill":"none","element":"doseUnit"}} / lean | works | DOM changed |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Route | w3Orders.route | enter / {"field":{"slot":"current","prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Frequency | w3Orders.freq | enter / {"field":{"slot":"current","prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | As needed (PRN) | w3Orders.prn | enter / {"field":{"slot":"current","prefill":"none","element":"prn"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Collapse section | w3Orders.dispense | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Duration | w3Orders.duration | enter / {"field":{"slot":"current","prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Generic substitution allowed | w3Orders.substitution | enter / {"field":{"slot":"current","prefill":"none","element":"substitution"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Collapse section | w3Orders.dx | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Pharmacy | w3Orders.pharmacy | enter / {"field":{"slot":"current","prefill":{"fromRecord":{"fact":"preferredPharmacy"}},"element":"pharmacy"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Associated diagnosis (ICD-10) | w3Orders.orderDiagnosis | enter / {"field":{"slot":"current","prefill":{"linked":{"element":"visitDiagnosis"}},"element":"orderDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Expand section | w3Orders.more | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Current meds | w3Orders.orderInfo | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | CURES report | w3Orders.orderInfo | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Recent labs | w3Orders.orderInfo | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Request authorization (human entry) | w3Orders.priorAuthRequest | enter / {"field":{"slot":"current","prefill":"none","element":"priorAuthRequest"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Request prior authorization | w3Orders.requestPriorAuth | click / {"button":{"action":"requestPriorAuth"}} / lean | disabled-with-reason | no order on this line |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Accept and add another order | w3Orders.newLine | click / {"button":{"action":"newOrderLine"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Back | w3Orders.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Results | w3Orders.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Imaging | w3Orders.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Notes | w3Orders.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Encounters | w3Orders.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Disposition | Search chart | w3Disposition.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Disposition | Disposition | w3Disposition.dispositionChoice | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"dispositionChoice"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Disposition | ED diagnosis (ICD-10) | w3Disposition.visitDiagnosis | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"visitDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Disposition | Condition | w3Disposition.dispositionCondition | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"dispositionCondition"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Disposition | Collapse section | w3Disposition.admitGroup | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Disposition | Admitting service | w3Disposition.admitService | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"admitService"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Disposition | Level of care | w3Disposition.admitLevelOfCare | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"admitLevelOfCare"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Disposition | Expand section | w3Disposition.dischargeGroup | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Disposition | Set disposition | w3Disposition.commit.disposition | click / {"button":{"action":{"commit":{"commit":"disposition"}}}} / lean | disabled-with-reason | entry required: Disposition |
| /?audit=buttons · P2 · canonical-P2 | w3Disposition | Back | w3Disposition.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Disposition | Results | w3Disposition.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Disposition | Imaging | w3Disposition.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Disposition | Notes | w3Disposition.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Disposition | Encounters | w3Disposition.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row10.drug | confirm / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row10.abxIndication | confirm / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"abxIndication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row10.dose | confirm / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"dose"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row10.doseUnit | confirm / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"doseUnit"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row10.route | confirm / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row10.freq | confirm / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row10.prn | confirm / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"prn"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row10.duration | confirm / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row10.quantity | confirm / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"quantity"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row10.refills | confirm / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"refills"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row10.substitution | confirm / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"substitution"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row10.pharmacy | confirm / {"field":{"slot":{"fixed":{"n":10}},"prefill":{"fromRecord":{"fact":"preferredPharmacy"}},"element":"pharmacy"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row10.indication | confirm / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"indication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row10.orderDiagnosis | confirm / {"field":{"slot":{"fixed":{"n":10}},"prefill":{"linked":{"element":"visitDiagnosis"}},"element":"orderDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row11.drug | confirm / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row11.abxIndication | confirm / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"abxIndication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row11.dose | confirm / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"dose"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row11.doseUnit | confirm / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"doseUnit"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row11.route | confirm / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row11.freq | confirm / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row11.prn | confirm / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"prn"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row11.duration | confirm / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row11.quantity | confirm / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"quantity"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row11.refills | confirm / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"refills"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row11.substitution | confirm / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"substitution"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row11.pharmacy | confirm / {"field":{"slot":{"fixed":{"n":11}},"prefill":{"fromRecord":{"fact":"preferredPharmacy"}},"element":"pharmacy"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row11.indication | confirm / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"indication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3OrderSets | Confirm prefilled value | w3OrderSets.row11.orderDiagnosis | confirm / {"field":{"slot":{"fixed":{"n":11}},"prefill":{"linked":{"element":"visitDiagnosis"}},"element":"orderDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Sign | Search chart | w3Sign.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Sign | Collapse section | w3Sign.controlled | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Sign | CURES not checked: exemption | w3Sign.curesExemptionReason | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"curesExemptionReason"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Sign | Naloxone offered | w3Sign.naloxoneOffer | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"naloxoneOffer"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Sign | Overdose and naloxone education given | w3Sign.naloxoneEducation | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"naloxoneEducation"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Sign | Sign orders | w3Sign.commit.signOrders | click / {"button":{"action":{"commit":{"commit":"signOrders"}}}} / lean | disabled-with-reason | Re-enter patient ID (initials / sex / age) to sign |
| /?audit=buttons · P2 · canonical-P2 | w3Sign | Back | w3Sign.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Sign | Results | w3Sign.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Sign | Imaging | w3Sign.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Sign | Notes | w3Sign.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Sign | Encounters | w3Sign.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Confirm prefilled value | w3Orders.drug | confirm / {"field":{"slot":"current","prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Confirm prefilled value | w3Orders.dose | confirm / {"field":{"slot":"current","prefill":"none","element":"dose"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Confirm prefilled value | w3Orders.doseUnit | confirm / {"field":{"slot":"current","prefill":"none","element":"doseUnit"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Confirm prefilled value | w3Orders.route | confirm / {"field":{"slot":"current","prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Confirm prefilled value | w3Orders.freq | confirm / {"field":{"slot":"current","prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Confirm prefilled value | w3Orders.duration | confirm / {"field":{"slot":"current","prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Confirm prefilled value | w3Orders.quantity | confirm / {"field":{"slot":"current","prefill":"none","element":"quantity"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Confirm prefilled value | w3Orders.refills | confirm / {"field":{"slot":"current","prefill":"none","element":"refills"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Accept and add another order | w3Orders.newLine | click / {"button":{"action":"newOrderLine"}} / lean | disabled-with-reason | finish this order line first |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Confirm prefilled value | w3Orders.abxIndication | confirm / {"field":{"slot":"current","prefill":"none","element":"abxIndication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | I have reviewed the patient's allergies | w3Orders.allergyReconfirmOrdering | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"allergyReconfirmOrdering"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P2 · canonical-P2 | w3Orders | Mark CURES report reviewed | w3Orders.review.curesReport | click / {"button":{"action":{"markReviewed":{"info":"curesReport"}}}} / lean | works | DOM changed; validation drawer: No versioned source record for review: curesReport Your inputs are retained. Close this panel, correct the issue, and retry the action. |
| /?audit=buttons · P2 · canonical-P2 | w3Disposition | Follow-up | w3Disposition.followUp | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"followUp"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | home | Collapse section | home.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | home | Ward: shift worklist and MAR | home.toolbar.ward | click / {"button":{"action":{"goto":{"screen":"w4Worklist"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | home | Search chart | home.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | home | Problem list | home.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | home | Results | home.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | home | Notes | home.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | home | Medications | home.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | home | Allergies | home.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | home | Encounters | home.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | home | Coverage | home.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | home | Clinic visit: start rooming | home.work.w1Rooming | click / {"button":{"action":{"goto":{"screen":"w1Rooming"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | home | In-basket: results | home.work.w2Inbasket | click / {"button":{"action":{"goto":{"screen":"w2Inbasket"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | home | In-basket: refill requests | home.work.w7Queue | click / {"button":{"action":{"goto":{"screen":"w7Queue"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | home | Emergency department: track board | home.work.w3TrackBoard | click / {"button":{"action":{"goto":{"screen":"w3TrackBoard"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | home | Pediatric clinic: start rooming | home.work.w5Rooming | click / {"button":{"action":{"goto":{"screen":"w5Rooming"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | home | Surgery: ED consult | home.work.w6Consult | click / {"button":{"action":{"goto":{"screen":"w6Consult"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | home | Surgery: pre-op | home.work.w6PreOp | click / {"button":{"action":{"goto":{"screen":"w6PreOp"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | home | Surgery: op note | home.work.w6OpNote | click / {"button":{"action":{"goto":{"screen":"w6OpNote"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | home | Surgery: post-op orders | home.work.w6PostOp | click / {"button":{"action":{"goto":{"screen":"w6PostOp"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | home | Surgery: rounding | home.work.w6Rounding | click / {"button":{"action":{"goto":{"screen":"w6Rounding"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | home | Surgery: discharge | home.work.w6Discharge | click / {"button":{"action":{"goto":{"screen":"w6Discharge"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Worklist | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · P3 · P3 | w4Worklist | MAR | w4Worklist.nav.w4Mar | click / {"button":{"action":{"goto":{"screen":"w4Mar"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Worklist | Flowsheet | w4Worklist.nav.w4Flowsheet | click / {"button":{"action":{"goto":{"screen":"w4Flowsheet"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Worklist | Handoff | w4Worklist.nav.w4Handoff | click / {"button":{"action":{"goto":{"screen":"w4Handoff"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Worklist | Collapse section | w4Worklist.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Worklist | Collapse section | w4Worklist.allergyGroup | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Worklist | Mark allergies reviewed (start of shift) | w4Worklist.review.allergyList | click / {"button":{"action":{"markReviewed":{"info":"allergyList"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons · P3 · P3 | w4Worklist | /medplum/fhir/R4/Provenance/6ee30be1-c263-4675-b7df-bdaede716f77 | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · P3 | w4Worklist | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · P3 | w4Worklist | Search chart | w4Worklist.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Worklist | Back | w4Worklist.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Worklist | Patient workspace | w4Worklist.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Worklist | New orders | w4Worklist.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Worklist | Results | w4Worklist.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Worklist | Notes | w4Worklist.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Worklist | Encounters | w4Worklist.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Rooming | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · P3 · P3 | w1Rooming | Med rec | w1Rooming.nav.w1MedRec | click / {"button":{"action":{"goto":{"screen":"w1MedRec"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Rooming | HPI / ROS | w1Rooming.nav.w1Hpi | click / {"button":{"action":{"goto":{"screen":"w1Hpi"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Rooming | Exam / A&P | w1Rooming.nav.w1Exam | click / {"button":{"action":{"goto":{"screen":"w1Exam"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Rooming | Orders | w1Rooming.nav.w1Orders | click / {"button":{"action":{"goto":{"screen":"w1Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Rooming | Labs | w1Rooming.nav.w1Labs | click / {"button":{"action":{"goto":{"screen":"w1Labs"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Rooming | Visit close | w1Rooming.nav.w1Close | click / {"button":{"action":{"goto":{"screen":"w1Close"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Rooming | Collapse section | w1Rooming.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Rooming | Search chart | w1Rooming.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Rooming | Back | w1Rooming.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Rooming | Results | w1Rooming.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Rooming | Imaging | w1Rooming.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Rooming | Notes | w1Rooming.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Rooming | Encounters | w1Rooming.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Rooming | Social history | w1Rooming.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Rooming | Family history | w1Rooming.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Rooming | Care gaps | w1Rooming.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Rooming | Immunizations | w1Rooming.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Rooming | Coverage | w1Rooming.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Rooming | Collapse section | w1Rooming.vitalsGroup | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Rooming | Pain (0–10) | w1Rooming.painScore | enter / {"field":{"element":"painScore","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Rooming | Collapse section | w1Rooming.intake | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Rooming | Tobacco use | w1Rooming.tobaccoUse | enter / {"field":{"element":"tobaccoUse","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Rooming | Fall in the past year? | w1Rooming.fallRiskScreen | enter / {"field":{"element":"fallRiskScreen","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Rooming | Travel in the past 30 days? | w1Rooming.travelScreen | enter / {"field":{"element":"travelScreen","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Rooming | Advance directive discussed | w1Rooming.advanceDirectiveAsked | enter / {"field":{"element":"advanceDirectiveAsked","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Rooming | Interpreter needed? | w1Rooming.interpreterNeeded | enter / {"field":{"element":"interpreterNeeded","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Rooming | Preferred pharmacy confirmed | w1Rooming.pharmacyConfirmedRooming | enter / {"field":{"element":"pharmacyConfirmedRooming","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Rooming | Collapse section | w1Rooming.phq | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Rooming | PHQ-2 score | w1Rooming.depressionScreen | enter / {"field":{"element":"depressionScreen","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Rooming | Collapse section | w1Rooming.allergyGroup | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Rooming | Mark allergies reviewed | w1Rooming.review.allergyList | click / {"button":{"action":{"markReviewed":{"info":"allergyList"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons · P3 · P3 | w1Rooming | /medplum/fhir/R4/Provenance/3179e44e-8619-49d2-bd16-814951536842 | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · P3 | w1Rooming | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · P3 | w2Inbasket | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · P3 · P3 | w2Inbasket | Result | w2Inbasket.nav.w2Result | click / {"button":{"action":{"goto":{"screen":"w2Result"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w2Inbasket | Message patient | w2Inbasket.nav.w2Message | click / {"button":{"action":{"goto":{"screen":"w2Message"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w2Inbasket | Collapse section | w2Inbasket.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w2Inbasket | Search chart | w2Inbasket.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w2Inbasket | Back | w2Inbasket.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w2Inbasket | All results | w2Inbasket.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w2Inbasket | Notes | w2Inbasket.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w2Inbasket | Encounters | w2Inbasket.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w2Inbasket | Imaging | w2Inbasket.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w2Inbasket | Search in-basket | w2Inbasket.basketSearch | enter / {"search":{"scope":"inbasket"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w7Queue | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · P3 · P3 | w7Queue | Chart review | w7Queue.nav.w7Review | click / {"button":{"action":{"goto":{"screen":"w7Review"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w7Queue | Collapse section | w7Queue.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w7Queue | Search chart | w7Queue.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w7Queue | Back | w7Queue.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w7Queue | Encounters | w7Queue.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w7Queue | Imaging | w7Queue.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w7Queue | Care gaps | w7Queue.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3TrackBoard | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · P3 · P3 | w3TrackBoard | Triage | w3TrackBoard.nav.w3Triage | click / {"button":{"action":{"goto":{"screen":"w3Triage"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3TrackBoard | Provider note | w3TrackBoard.nav.w3Provider | click / {"button":{"action":{"goto":{"screen":"w3Provider"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3TrackBoard | Order sets | w3TrackBoard.nav.w3OrderSets | click / {"button":{"action":{"goto":{"screen":"w3OrderSets"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3TrackBoard | Orders | w3TrackBoard.nav.w3Orders | click / {"button":{"action":{"goto":{"screen":"w3Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3TrackBoard | Disposition | w3TrackBoard.nav.w3Disposition | click / {"button":{"action":{"goto":{"screen":"w3Disposition"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3TrackBoard | Collapse section | w3TrackBoard.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3TrackBoard | Search chart | w3TrackBoard.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3TrackBoard | Back | w3TrackBoard.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3TrackBoard | Results | w3TrackBoard.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3TrackBoard | Imaging | w3TrackBoard.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3TrackBoard | Notes | w3TrackBoard.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3TrackBoard | Encounters | w3TrackBoard.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Rooming | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · P3 · P3 | w5Rooming | Growth | w5Rooming.nav.w5Growth | click / {"button":{"action":{"goto":{"screen":"w5Growth"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Rooming | Orders | w5Rooming.nav.w5Orders | click / {"button":{"action":{"goto":{"screen":"w5Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Rooming | Immunizations | w5Rooming.nav.w5Immunizations | click / {"button":{"action":{"goto":{"screen":"w5Immunizations"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Rooming | Visit close | w5Rooming.nav.w5Close | click / {"button":{"action":{"goto":{"screen":"w5Close"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Rooming | Collapse section | w5Rooming.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Rooming | Search chart | w5Rooming.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Rooming | Back | w5Rooming.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Rooming | Growth chart | w5Rooming.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Rooming | Immunizations | w5Rooming.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Rooming | Results | w5Rooming.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Rooming | Notes | w5Rooming.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Rooming | Family history | w5Rooming.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Rooming | Care gaps | w5Rooming.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Rooming | Collapse section | w5Rooming.measures | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Rooming | Collapse section | w5Rooming.allergyGroup | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Rooming | Mark allergies reviewed | w5Rooming.review.allergyList | click / {"button":{"action":{"markReviewed":{"info":"allergyList"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons · P3 · P3 | w5Rooming | /medplum/fhir/R4/Provenance/95b78794-a76f-4e83-a6b4-ee5cfabf8029 | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · P3 | w5Rooming | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · P3 | w5Rooming | Collapse section | w5Rooming.medRec | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Rooming | Medication 1: continue / stop / modify | w5Rooming.decision0 | enter / {"field":{"element":"medRecDecision","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Rooming | Medication 2: continue / stop / modify | w5Rooming.decision1 | enter / {"field":{"element":"medRecDecision","slot":{"fixed":{"n":1}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Consult | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · P3 · P3 | w6Consult | Consult close | w6Consult.nav.w6ConsultClose | click / {"button":{"action":{"goto":{"screen":"w6ConsultClose"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Consult | Orders | w6Consult.nav.w6Orders | click / {"button":{"action":{"goto":{"screen":"w6Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Consult | Collapse section | w6Consult.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Consult | Search chart | w6Consult.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Consult | Back | w6Consult.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Consult | Imaging | w6Consult.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Consult | Results | w6Consult.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Consult | Notes | w6Consult.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Consult | Surgical history | w6Consult.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Consult | Encounters | w6Consult.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Consult | Collapse section | w6Consult.homeMeds | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Consult | Medication 1: continue / stop / modify | w6Consult.decision0 | enter / {"field":{"element":"medRecDecision","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Consult | Medication 2: continue / stop / modify | w6Consult.decision1 | enter / {"field":{"element":"medRecDecision","slot":{"fixed":{"n":1}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6PreOp | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · P3 · P3 | w6PreOp | Collapse section | w6PreOp.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6PreOp | Search chart | w6PreOp.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6PreOp | Back | w6PreOp.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6PreOp | Imaging | w6PreOp.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6PreOp | Results | w6PreOp.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6PreOp | Notes | w6PreOp.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6PreOp | Surgical history | w6PreOp.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6PreOp | Encounters | w6PreOp.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6OpNote | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · P3 · P3 | w6OpNote | Collapse section | w6OpNote.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6OpNote | Search chart | w6OpNote.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6OpNote | Back | w6OpNote.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6OpNote | Imaging | w6OpNote.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6OpNote | Results | w6OpNote.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6OpNote | Notes | w6OpNote.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6OpNote | Surgical history | w6OpNote.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6OpNote | Encounters | w6OpNote.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6OpNote | Collapse section | w6OpNote.note | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6PostOp | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · P3 · P3 | w6PostOp | Collapse section | w6PostOp.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6PostOp | Search chart | w6PostOp.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6PostOp | Back | w6PostOp.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6PostOp | Imaging | w6PostOp.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6PostOp | Results | w6PostOp.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6PostOp | Notes | w6PostOp.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6PostOp | Surgical history | w6PostOp.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6PostOp | Encounters | w6PostOp.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6PostOp | Collapse section | w6PostOp.care | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6PostOp | Collapse section | w6PostOp.row10 | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6PostOp | Collapse section | w6PostOp.row10.medication | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6PostOp | Collapse section | w6PostOp.row10.dispense | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6PostOp | Collapse section | w6PostOp.row10.dx | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6PostOp | Collapse section | w6PostOp.row11 | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6PostOp | Collapse section | w6PostOp.row11.medication | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6PostOp | Collapse section | w6PostOp.row11.dispense | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6PostOp | Collapse section | w6PostOp.row11.dx | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6PostOp | Collapse section | w6PostOp.row12 | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6PostOp | Collapse section | w6PostOp.row12.medication | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6PostOp | Collapse section | w6PostOp.row12.dispense | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6PostOp | Collapse section | w6PostOp.row12.dx | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6PostOp | Collapse section | w6PostOp.row13 | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6PostOp | Collapse section | w6PostOp.row13.medication | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6PostOp | Collapse section | w6PostOp.row13.dispense | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6PostOp | Collapse section | w6PostOp.row13.dx | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6PostOp | Review and sign | w6PostOp.toSign | click / {"button":{"action":{"goto":{"screen":"w6Sign"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Rounding | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · P3 · P3 | w6Rounding | Collapse section | w6Rounding.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Rounding | Search chart | w6Rounding.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Rounding | Back | w6Rounding.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Rounding | Imaging | w6Rounding.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Rounding | Results | w6Rounding.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Rounding | Notes | w6Rounding.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Rounding | Surgical history | w6Rounding.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Rounding | Encounters | w6Rounding.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Discharge | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · P3 · P3 | w6Discharge | Collapse section | w6Discharge.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Discharge | Search chart | w6Discharge.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Discharge | Back | w6Discharge.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Discharge | Imaging | w6Discharge.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Discharge | Results | w6Discharge.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Discharge | Notes | w6Discharge.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Discharge | Surgical history | w6Discharge.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Discharge | Encounters | w6Discharge.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Discharge | Collapse section | w6Discharge.medRec | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Mar | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · P3 · P3 | w4Mar | Collapse section | w4Mar.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Mar | Open due medication | w4Mar.toolbar.openDue | click / {"button":{"action":{"goto":{"screen":"w4Admin"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Mar | Search chart | w4Mar.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Mar | Back | w4Mar.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Mar | New orders | w4Mar.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Mar | Results | w4Mar.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Mar | Notes | w4Mar.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Mar | Encounters | w4Mar.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Mar | PRN history | w4Mar.marTabs | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Mar | Glucose | w4Mar.marTabs | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Mar | Coagulation labs | w4Mar.marTabs | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Flowsheet | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · P3 · P3 | w4Flowsheet | Collapse section | w4Flowsheet.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Flowsheet | Collapse section | w4Flowsheet.vitalsGroup | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Flowsheet | Pain reassessment (0–10) | w4Flowsheet.painReassessment | enter / {"field":{"element":"painReassessment","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Flowsheet | Copy forward last assessment | w4Flowsheet.copyAssessment | click / {"macro":{"id":"w4CopyAssessment"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Flowsheet | File assessment | w4Flowsheet.commit.chartAssessment | click / {"button":{"action":{"commit":{"commit":"chartAssessment"}}}} / lean | disabled-with-reason | entry required: BP systolic (mmHg) |
| /?audit=buttons · P3 · P3 | w4Flowsheet | Search chart | w4Flowsheet.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Flowsheet | Back | w4Flowsheet.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Flowsheet | Expand section | w4Flowsheet.optionalChart | click / {"group":{"collapsible":true,"startCollapsed":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Handoff | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · P3 · P3 | w4Handoff | Collapse section | w4Handoff.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Handoff | Search chart | w4Handoff.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Handoff | Back | w4Handoff.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Handoff | New orders | w4Handoff.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Handoff | Results | w4Handoff.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Handoff | Notes | w4Handoff.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Handoff | Encounters | w4Handoff.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Handoff | SBAR template | w4Handoff.template | click / {"macro":{"id":"w4HandoffTemplate"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1MedRec | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · P3 · P3 | w1MedRec | Collapse section | w1MedRec.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1MedRec | Search chart | w1MedRec.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1MedRec | Back | w1MedRec.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1MedRec | Results | w1MedRec.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1MedRec | Imaging | w1MedRec.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1MedRec | Notes | w1MedRec.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1MedRec | Encounters | w1MedRec.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1MedRec | Social history | w1MedRec.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1MedRec | Family history | w1MedRec.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1MedRec | Care gaps | w1MedRec.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1MedRec | Immunizations | w1MedRec.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1MedRec | Coverage | w1MedRec.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1MedRec | Mark medications reviewed | w1MedRec.review.currentMeds | click / {"button":{"action":{"markReviewed":{"info":"currentMeds"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons · P3 · P3 | w1MedRec | /medplum/fhir/R4/Provenance/2af498f5-e6b9-4fc3-acd8-6309584a6b1b | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · P3 | w1MedRec | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · P3 | w1MedRec | Collapse section | w1MedRec.rows | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1MedRec | Medication 1: continue / stop / modify | w1MedRec.decision0 | enter / {"field":{"element":"medRecDecision","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1MedRec | Medication 2: continue / stop / modify | w1MedRec.decision1 | enter / {"field":{"element":"medRecDecision","slot":{"fixed":{"n":1}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1MedRec | Medication 3: continue / stop / modify | w1MedRec.decision2 | enter / {"field":{"element":"medRecDecision","slot":{"fixed":{"n":2}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1MedRec | Medication 4: continue / stop / modify | w1MedRec.decision3 | enter / {"field":{"element":"medRecDecision","slot":{"fixed":{"n":3}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1MedRec | Last plan | w1MedRec.medTabs | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1MedRec | Fill history | w1MedRec.medTabs | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Hpi | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · P3 · P3 | w1Hpi | Collapse section | w1Hpi.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Hpi | Search chart | w1Hpi.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Hpi | Back | w1Hpi.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Hpi | Results | w1Hpi.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Hpi | Imaging | w1Hpi.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Hpi | Notes | w1Hpi.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Hpi | Encounters | w1Hpi.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Hpi | Social history | w1Hpi.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Hpi | Family history | w1Hpi.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Hpi | Care gaps | w1Hpi.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Hpi | Immunizations | w1Hpi.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Hpi | Coverage | w1Hpi.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Hpi | Expand section | w1Hpi.lastNote | click / {"group":{"collapsible":true,"startCollapsed":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Exam | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · P3 · P3 | w1Exam | Collapse section | w1Exam.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Exam | Search chart | w1Exam.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Exam | Back | w1Exam.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Exam | Results | w1Exam.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Exam | Imaging | w1Exam.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Exam | Notes | w1Exam.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Exam | Encounters | w1Exam.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Exam | Social history | w1Exam.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Exam | Family history | w1Exam.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Exam | Care gaps | w1Exam.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Exam | Immunizations | w1Exam.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Exam | Coverage | w1Exam.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Orders | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · P3 · P3 | w1Orders | Collapse section | w1Orders.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Orders | Search chart | w1Orders.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Orders | Back | w1Orders.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Orders | Results | w1Orders.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Orders | Imaging | w1Orders.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Orders | Notes | w1Orders.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Orders | Encounters | w1Orders.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Orders | Social history | w1Orders.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Orders | Family history | w1Orders.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Orders | Care gaps | w1Orders.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Orders | Immunizations | w1Orders.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Orders | Coverage | w1Orders.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Orders | Search medications | w1Orders.orderSearch | enter / {"search":{"scope":"formulary"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Orders | Collapse section | w1Orders.prefList | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Orders | Collapse section | w1Orders.dosing | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Orders | Collapse section | w1Orders.medication | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Orders | Collapse section | w1Orders.dispense | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Orders | Collapse section | w1Orders.dx | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Orders | Collapse section | w1Orders.controlled | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Orders | Expand section | w1Orders.more | click / {"group":{"collapsible":true,"startCollapsed":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Orders | Current meds | w1Orders.orderInfo | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Orders | CURES report | w1Orders.orderInfo | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Orders | Recent labs | w1Orders.orderInfo | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Orders | Accept and add another order | w1Orders.newLine | click / {"button":{"action":"newOrderLine"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Orders | Review and sign | w1Orders.toSign | click / {"button":{"action":{"goto":{"screen":"w1Verify"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Labs | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · P3 · P3 | w1Labs | Collapse section | w1Labs.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Labs | Search chart | w1Labs.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Labs | Back | w1Labs.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Labs | Results | w1Labs.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Labs | Imaging | w1Labs.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Labs | Notes | w1Labs.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Labs | Encounters | w1Labs.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Labs | Social history | w1Labs.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Labs | Family history | w1Labs.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Labs | Care gaps | w1Labs.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Labs | Immunizations | w1Labs.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Labs | Coverage | w1Labs.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Labs | Search lab tests | w1Labs.labSearch | enter / {"search":{"scope":"loinc"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Labs | Collapse section | w1Labs.labOrder | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Close | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · P3 · P3 | w1Close | Collapse section | w1Close.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Close | Search chart | w1Close.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Close | Back | w1Close.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Close | Results | w1Close.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Close | Imaging | w1Close.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Close | Notes | w1Close.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Close | Encounters | w1Close.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Close | Social history | w1Close.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Close | Family history | w1Close.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Close | Care gaps | w1Close.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Close | Immunizations | w1Close.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Close | Coverage | w1Close.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Close | Instructions template | w1Close.avsTemplate | click / {"macro":{"id":"w1AvsTemplate"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w2Result | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · P3 · P3 | w2Result | Collapse section | w2Result.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w2Result | Search chart | w2Result.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w2Result | Back | w2Result.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w2Result | All results | w2Result.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w2Result | Notes | w2Result.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w2Result | Encounters | w2Result.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w2Result | Imaging | w2Result.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w2Message | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · P3 · P3 | w2Message | Collapse section | w2Message.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w2Message | Search chart | w2Message.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w2Message | Back | w2Message.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w2Message | All results | w2Message.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w2Message | Notes | w2Message.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w2Message | Encounters | w2Message.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w2Message | Imaging | w2Message.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w7Review | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · P3 · P3 | w7Review | Collapse section | w7Review.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w7Review | Search chart | w7Review.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w7Review | Back | w7Review.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w7Review | Encounters | w7Review.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w7Review | Imaging | w7Review.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w7Review | Care gaps | w7Review.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w7Review | Last visit | w7Review.refillTabs | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w7Review | Labs | w7Review.refillTabs | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w7Review | Fill history | w7Review.refillTabs | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w7Review | Medications | w7Review.refillTabs | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w7Review | Last note | w7Review.refillTabs | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w7Review | Mark last visit reviewed | w7Review.review.lastVisit | click / {"button":{"action":{"markReviewed":{"info":"lastVisit"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons · P3 · P3 | w7Review | /medplum/fhir/R4/Provenance/c013c4f4-bd59-47b5-bea9-f7591a402207 | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · P3 | w7Review | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · P3 | w7Review | Go to decision | w7Review.decide | click / {"button":{"action":{"goto":{"screen":"w7Decision"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Triage | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · P3 · P3 | w3Triage | Collapse section | w3Triage.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Triage | Search chart | w3Triage.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Triage | Back | w3Triage.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Triage | Results | w3Triage.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Triage | Imaging | w3Triage.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Triage | Notes | w3Triage.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Triage | Encounters | w3Triage.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Triage | Collapse section | w3Triage.vitalsGroup | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Triage | Pain (0–10) | w3Triage.painScore | enter / {"field":{"element":"painScore","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Triage | Acuity (ESI) | w3Triage.triageAcuity | enter / {"field":{"element":"triageAcuity","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Triage | Arrival mode | w3Triage.arrivalMode | enter / {"field":{"element":"arrivalMode","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Triage | Isolation screen | w3Triage.isolationScreen | enter / {"field":{"element":"isolationScreen","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Triage | Collapse section | w3Triage.allergyGroup | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Triage | Mark allergies reviewed | w3Triage.review.allergyList | click / {"button":{"action":{"markReviewed":{"info":"allergyList"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons · P3 · P3 | w3Triage | /medplum/fhir/R4/Provenance/98a949a5-7c80-4a8c-9b67-aec8295d2640 | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · P3 | w3Triage | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · P3 | w3Provider | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · P3 · P3 | w3Provider | Collapse section | w3Provider.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Provider | Search chart | w3Provider.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Provider | Back | w3Provider.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Provider | Results | w3Provider.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Provider | Imaging | w3Provider.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Provider | Notes | w3Provider.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Provider | Encounters | w3Provider.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3OrderSets | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · P3 · P3 | w3OrderSets | Collapse section | w3OrderSets.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3OrderSets | Search chart | w3OrderSets.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3OrderSets | Back | w3OrderSets.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3OrderSets | Results | w3OrderSets.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3OrderSets | Imaging | w3OrderSets.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3OrderSets | Notes | w3OrderSets.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3OrderSets | Encounters | w3OrderSets.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3OrderSets | Collapse section | w3OrderSets.sets | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3OrderSets | Collapse section | w3OrderSets.row10 | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3OrderSets | Collapse section | w3OrderSets.row10.medication | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3OrderSets | Collapse section | w3OrderSets.row10.dispense | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3OrderSets | Collapse section | w3OrderSets.row10.dx | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3OrderSets | Collapse section | w3OrderSets.row11 | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3OrderSets | Collapse section | w3OrderSets.row11.medication | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3OrderSets | Collapse section | w3OrderSets.row11.dispense | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3OrderSets | Collapse section | w3OrderSets.row11.dx | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3OrderSets | Review and sign | w3OrderSets.toSign | click / {"button":{"action":{"goto":{"screen":"w3Sign"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Orders | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · P3 · P3 | w3Orders | Collapse section | w3Orders.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Orders | Search chart | w3Orders.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Orders | Back | w3Orders.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Orders | Results | w3Orders.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Orders | Imaging | w3Orders.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Orders | Notes | w3Orders.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Orders | Encounters | w3Orders.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Orders | Search medications | w3Orders.orderSearch | enter / {"search":{"scope":"formulary"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Orders | Collapse section | w3Orders.prefList | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Orders | Collapse section | w3Orders.dosing | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Orders | Collapse section | w3Orders.medication | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Orders | Collapse section | w3Orders.dispense | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Orders | Collapse section | w3Orders.dx | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Orders | Expand section | w3Orders.more | click / {"group":{"collapsible":true,"startCollapsed":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Orders | Current meds | w3Orders.orderInfo | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Orders | CURES report | w3Orders.orderInfo | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Orders | Recent labs | w3Orders.orderInfo | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Orders | Accept and add another order | w3Orders.newLine | click / {"button":{"action":"newOrderLine"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Disposition | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · P3 · P3 | w3Disposition | Collapse section | w3Disposition.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Disposition | Search chart | w3Disposition.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Disposition | Back | w3Disposition.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Disposition | Results | w3Disposition.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Disposition | Imaging | w3Disposition.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Disposition | Notes | w3Disposition.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Disposition | Encounters | w3Disposition.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Disposition | Collapse section | w3Disposition.admitGroup | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Disposition | Expand section | w3Disposition.dischargeGroup | click / {"group":{"collapsible":true,"startCollapsed":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Growth | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · P3 · P3 | w5Growth | Collapse section | w5Growth.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Growth | Search chart | w5Growth.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Growth | Back | w5Growth.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Growth | Growth chart | w5Growth.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Growth | Immunizations | w5Growth.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Growth | Results | w5Growth.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Growth | Notes | w5Growth.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Growth | Family history | w5Growth.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Growth | Care gaps | w5Growth.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Orders | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · P3 · P3 | w5Orders | Collapse section | w5Orders.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Orders | Search chart | w5Orders.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Orders | Back | w5Orders.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Orders | Growth chart | w5Orders.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Orders | Immunizations | w5Orders.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Orders | Results | w5Orders.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Orders | Notes | w5Orders.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Orders | Family history | w5Orders.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Orders | Care gaps | w5Orders.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Orders | Search medications | w5Orders.orderSearch | enter / {"search":{"scope":"formulary"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Orders | Collapse section | w5Orders.prefList | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Orders | Collapse section | w5Orders.dosing | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Orders | Collapse section | w5Orders.medication | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Orders | Collapse section | w5Orders.dispense | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Orders | Collapse section | w5Orders.dx | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Orders | Collapse section | w5Orders.controlled | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Orders | Expand section | w5Orders.more | click / {"group":{"collapsible":true,"startCollapsed":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Orders | Current meds | w5Orders.orderInfo | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Orders | CURES report | w5Orders.orderInfo | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Orders | Recent labs | w5Orders.orderInfo | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Orders | Accept and add another order | w5Orders.newLine | click / {"button":{"action":"newOrderLine"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Orders | Review and sign | w5Orders.toSign | click / {"button":{"action":{"goto":{"screen":"w5Sign"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Immunizations | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · P3 · P3 | w5Immunizations | Collapse section | w5Immunizations.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Immunizations | Search chart | w5Immunizations.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Immunizations | Back | w5Immunizations.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Immunizations | Growth chart | w5Immunizations.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Immunizations | Immunizations | w5Immunizations.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Immunizations | Results | w5Immunizations.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Immunizations | Notes | w5Immunizations.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Immunizations | Family history | w5Immunizations.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Immunizations | Care gaps | w5Immunizations.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Immunizations | Influenza vaccine (from inventory) | w5Immunizations.fluVaccine | click / {"macro":{"id":"w5FluVaccine"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Immunizations | Collapse section | w5Immunizations.record | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Immunizations | Vaccine | w5Immunizations.vaccine | enter / {"field":{"element":"vaccine","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Immunizations | Site | w5Immunizations.vaccineSite | enter / {"field":{"element":"vaccineSite","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Immunizations | Route | w5Immunizations.vaccineRoute | enter / {"field":{"element":"vaccineRoute","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Immunizations | VIS given before vaccination | w5Immunizations.visGiven | enter / {"field":{"element":"visGiven","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Immunizations | Record immunization | w5Immunizations.commit.recordImmunization | click / {"button":{"action":{"commit":{"commit":"recordImmunization"}}}} / lean | disabled-with-reason | entry required: Vaccine |
| /?audit=buttons · P3 · P3 | w5Close | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · P3 · P3 | w5Close | Collapse section | w5Close.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Close | Search chart | w5Close.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Close | Back | w5Close.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Close | Growth chart | w5Close.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Close | Immunizations | w5Close.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Close | Results | w5Close.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Close | Notes | w5Close.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Close | Family history | w5Close.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w5Close | Care gaps | w5Close.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6ConsultClose | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · P3 · P3 | w6ConsultClose | Collapse section | w6ConsultClose.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6ConsultClose | Search chart | w6ConsultClose.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6ConsultClose | Back | w6ConsultClose.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6ConsultClose | Imaging | w6ConsultClose.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6ConsultClose | Results | w6ConsultClose.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6ConsultClose | Notes | w6ConsultClose.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6ConsultClose | Surgical history | w6ConsultClose.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6ConsultClose | Encounters | w6ConsultClose.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Orders | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · P3 · P3 | w6Orders | Collapse section | w6Orders.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Orders | Search chart | w6Orders.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Orders | Back | w6Orders.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Orders | Imaging | w6Orders.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Orders | Results | w6Orders.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Orders | Notes | w6Orders.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Orders | Surgical history | w6Orders.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Orders | Encounters | w6Orders.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Orders | Search medications | w6Orders.orderSearch | enter / {"search":{"scope":"formulary"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Orders | Collapse section | w6Orders.prefList | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Orders | Collapse section | w6Orders.dosing | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Orders | Collapse section | w6Orders.medication | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Orders | Collapse section | w6Orders.dispense | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Orders | Collapse section | w6Orders.dx | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Orders | Expand section | w6Orders.more | click / {"group":{"collapsible":true,"startCollapsed":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Orders | Current meds | w6Orders.orderInfo | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Orders | CURES report | w6Orders.orderInfo | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Orders | Recent labs | w6Orders.orderInfo | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Orders | Accept and add another order | w6Orders.newLine | click / {"button":{"action":"newOrderLine"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Sign | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · P3 · P3 | w6Sign | Collapse section | w6Sign.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Sign | Search chart | w6Sign.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Sign | Back | w6Sign.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Sign | Imaging | w6Sign.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Sign | Results | w6Sign.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Sign | Notes | w6Sign.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Sign | Surgical history | w6Sign.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Sign | Encounters | w6Sign.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Sign | Collapse section | w6Sign.weights | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w6Sign | Collapse section | w6Sign.controlled | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Admin | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · P3 · P3 | w4Admin | Collapse section | w4Admin.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Admin | Collapse section | w4Admin.fiveRights | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Admin | Pain score before dose (0–10) | w4Admin.painScore | enter / {"field":{"element":"painScore","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Admin | Collapse section | w4Admin.documentation | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Admin | Given / held / refused | w4Admin.adminStatus | enter / {"field":{"element":"adminStatus","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Admin | Reason / comment | w4Admin.adminReason | enter / {"field":{"element":"adminReason","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Admin | Site | w4Admin.adminSite | enter / {"field":{"element":"adminSite","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Admin | Document held: NPO | w4Admin.heldNpo | click / {"macro":{"id":"w4HeldNpo"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Admin | Administer | w4Admin.commit.administerMed | click / {"button":{"action":{"commit":{"commit":"administerMed"}}}} / lean | disabled-with-reason | entry required: Scan patient wristband |
| /?audit=buttons · P3 · P3 | w4Admin | Search chart | w4Admin.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Admin | Back | w4Admin.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Admin | Expand section | w4Admin.optionalChart | click / {"group":{"collapsible":true,"startCollapsed":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Flowsheet | Confirm prefilled value | w4Flowsheet.nursingAssessment | confirm / {"field":{"element":"nursingAssessment","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Flowsheet | New orders | w4Flowsheet.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Flowsheet | Results | w4Flowsheet.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Flowsheet | Notes | w4Flowsheet.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Flowsheet | Encounters | w4Flowsheet.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Handoff | Confirm prefilled value | w4Handoff.handoffSituation | confirm / {"field":{"element":"handoffSituation","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Handoff | Confirm prefilled value | w4Handoff.handoffBackground | confirm / {"field":{"element":"handoffBackground","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Handoff | Confirm prefilled value | w4Handoff.handoffAssessment | confirm / {"field":{"element":"handoffAssessment","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w4Handoff | Confirm prefilled value | w4Handoff.handoffRecommendation | confirm / {"field":{"element":"handoffRecommendation","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Orders | Mark CURES report reviewed | w1Orders.review.curesReport | click / {"button":{"action":{"markReviewed":{"info":"curesReport"}}}} / lean | works | DOM changed; validation drawer: No versioned source record for review: curesReport Your inputs are retained. Close this panel, correct the issue, and retry the action. |
| /?audit=buttons · P3 · P3 | w1Verify | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · P3 · P3 | w1Verify | Collapse section | w1Verify.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Verify | Search chart | w1Verify.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Verify | Back | w1Verify.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Verify | Results | w1Verify.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Verify | Imaging | w1Verify.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Verify | Notes | w1Verify.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Verify | Encounters | w1Verify.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Verify | Social history | w1Verify.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Verify | Family history | w1Verify.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Verify | Care gaps | w1Verify.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Verify | Immunizations | w1Verify.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Verify | Coverage | w1Verify.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Verify | Continue to sign | w1Verify.continue | click / {"button":{"action":{"goto":{"screen":"w1Sign"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w1Close | Confirm prefilled value | w1Close.patientInstructions | confirm / {"field":{"element":"patientInstructions","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w7Review | Mark fill history reviewed | w7Review.review.adherence | click / {"button":{"action":{"markReviewed":{"info":"adherence"}}}} / lean | works | DOM changed; validation drawer: No versioned source record for review: adherence Your inputs are retained. Close this panel, correct the issue, and retry the action. |
| /?audit=buttons · P3 · P3 | w7Decision | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · P3 · P3 | w7Decision | Collapse section | w7Decision.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w7Decision | Search chart | w7Decision.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w7Decision | Back | w7Decision.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w7Decision | Encounters | w7Decision.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w7Decision | Imaging | w7Decision.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w7Decision | Care gaps | w7Decision.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w7Decision | Collapse section | w7Decision.decisionGroup | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Sign | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · P3 · P3 | w3Sign | Collapse section | w3Sign.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Sign | Search chart | w3Sign.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Sign | Back | w3Sign.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Sign | Results | w3Sign.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Sign | Imaging | w3Sign.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Sign | Notes | w3Sign.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Sign | Encounters | w3Sign.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Sign | Collapse section | w3Sign.controlled | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P3 · P3 | w3Orders | Mark CURES report reviewed | w3Orders.review.curesReport | click / {"button":{"action":{"markReviewed":{"info":"curesReport"}}}} / lean | works | DOM changed; validation drawer: No versioned source record for review: curesReport Your inputs are retained. Close this panel, correct the issue, and retry the action. |
| /?audit=buttons · P4 · canonical-P4 | home | Search chart | home.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | home | In Basket: Results | home.work.w2Inbasket | click / {"button":{"action":{"goto":{"screen":"w2Inbasket"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | home | In Basket: Rx Requests | home.work.w7Queue | click / {"button":{"action":{"goto":{"screen":"w7Queue"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | home | Schedule | home.work.w5Rooming | click / {"button":{"action":{"goto":{"screen":"w5Rooming"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | home | Problem list | home.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | home | Results | home.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | home | Notes | home.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | home | Medications | home.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | home | Allergies | home.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | home | Encounters | home.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | home | Coverage | home.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | home | History | home.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w2Inbasket | Search chart | w2Inbasket.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w2Inbasket | Search in-basket | w2Inbasket.basketSearch | enter / {"search":{"scope":"inbasket"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w2Inbasket | Back | w2Inbasket.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w2Inbasket | Patient workspace | w2Inbasket.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w2Inbasket | Result | w2Inbasket.nav.w2Result | click / {"button":{"action":{"goto":{"screen":"w2Result"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w2Inbasket | Message patient | w2Inbasket.nav.w2Message | click / {"button":{"action":{"goto":{"screen":"w2Message"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w2Inbasket | All results | w2Inbasket.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w2Inbasket | Notes | w2Inbasket.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w2Inbasket | Encounters | w2Inbasket.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w2Inbasket | Imaging | w2Inbasket.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w7Queue | Search chart | w7Queue.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w7Queue | Back | w7Queue.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w7Queue | Chart review | w7Queue.nav.w7Review | click / {"button":{"action":{"goto":{"screen":"w7Review"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w7Queue | Encounters | w7Queue.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w7Queue | Imaging | w7Queue.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w7Queue | Care gaps | w7Queue.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Rooming | Search chart | w5Rooming.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Rooming | Collapse section | w5Rooming.measures | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Rooming | Collapse section | w5Rooming.allergyGroup | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Rooming | Mark allergies reviewed | w5Rooming.review.allergyList | click / {"button":{"action":{"markReviewed":{"info":"allergyList"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons · P4 · canonical-P4 | w5Rooming | /medplum/fhir/R4/Provenance/273d4812-dd27-402a-8574-67c39e27ad70 | — | button / app | works | DOM changed |
| /?audit=buttons · P4 · canonical-P4 | w5Rooming | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons · P4 · canonical-P4 | w5Rooming | Collapse section | w5Rooming.medRec | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Rooming | Medication 1: continue / stop / modify | w5Rooming.decision0 | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"medRecDecision"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Rooming | Medication 2: continue / stop / modify | w5Rooming.decision1 | enter / {"field":{"slot":{"fixed":{"n":1}},"prefill":"none","element":"medRecDecision"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Rooming | Back | w5Rooming.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Rooming | Growth | w5Rooming.nav.w5Growth | click / {"button":{"action":{"goto":{"screen":"w5Growth"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Rooming | Orders | w5Rooming.nav.w5Orders | click / {"button":{"action":{"goto":{"screen":"w5Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Rooming | Immunizations | w5Rooming.nav.w5Immunizations | click / {"button":{"action":{"goto":{"screen":"w5Immunizations"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Rooming | Visit close | w5Rooming.nav.w5Close | click / {"button":{"action":{"goto":{"screen":"w5Close"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Rooming | Growth chart | w5Rooming.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Rooming | Immunizations | w5Rooming.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Rooming | Results | w5Rooming.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Rooming | Notes | w5Rooming.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Rooming | Family history | w5Rooming.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Rooming | Care gaps | w5Rooming.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w2Result | Search chart | w2Result.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w2Result | Action | w2Result.resultAction | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"resultAction"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w2Result | Follow-up test | w2Result.resultFollowUpOrder | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"resultFollowUpOrder"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w2Result | Acknowledge and mark done | w2Result.commit.ackResult | click / {"button":{"action":{"commit":{"commit":"ackResult"}}}} / lean | disabled-with-reason | entry required: Result action |
| /?audit=buttons · P4 · canonical-P4 | w2Result | Back | w2Result.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w2Result | All results | w2Result.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w2Result | Notes | w2Result.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w2Result | Encounters | w2Result.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w2Result | Imaging | w2Result.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w2Message | Search chart | w2Message.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w2Message | Template: normal result | w2Message.normalLetter | click / {"macro":{"id":"w2NormalLetter"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w2Message | Template: repeat the test | w2Message.repeatLetter | click / {"macro":{"id":"w2RepeatLetter"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w2Message | Back | w2Message.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w2Message | All results | w2Message.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w2Message | Notes | w2Message.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w2Message | Encounters | w2Message.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w2Message | Imaging | w2Message.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w7Review | Search chart | w7Review.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w7Review | Last visit | w7Review.refillTabs | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w7Review | Labs | w7Review.refillTabs | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w7Review | Fill history | w7Review.refillTabs | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w7Review | Medications | w7Review.refillTabs | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w7Review | Last note | w7Review.refillTabs | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w7Review | Mark last visit reviewed | w7Review.review.lastVisit | click / {"button":{"action":{"markReviewed":{"info":"lastVisit"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons · P4 · canonical-P4 | w7Review | /medplum/fhir/R4/Provenance/a15a4798-82ab-423a-8bf4-6524d32b12f4 | — | button / app | works | DOM changed |
| /?audit=buttons · P4 · canonical-P4 | w7Review | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons · P4 · canonical-P4 | w7Review | Back | w7Review.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w7Review | Encounters | w7Review.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w7Review | Imaging | w7Review.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w7Review | Care gaps | w7Review.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w7Review | Go to decision | w7Review.decide | click / {"button":{"action":{"goto":{"screen":"w7Decision"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Growth | Search chart | w5Growth.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Growth | Back | w5Growth.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Growth | Growth chart | w5Growth.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Growth | Immunizations | w5Growth.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Growth | Results | w5Growth.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Growth | Notes | w5Growth.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Growth | Family history | w5Growth.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Growth | Care gaps | w5Growth.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Search chart | w5Orders.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Find orders | w5Orders.orderSearch | enter / {"search":{"scope":"formulary"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Collapse section | w5Orders.prefList | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Amoxicillin 45 mg/kg/dose BID × 10 days | w5Orders.prefAmoxicillin | click / {"macro":{"id":"w5PrefAmoxicillin"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Ibuprofen 10 mg/kg q6h PRN | w5Orders.prefIbuprofen | click / {"macro":{"id":"w5PrefIbuprofen"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Acetaminophen 15 mg/kg q6h PRN | w5Orders.prefAcetaminophen | click / {"macro":{"id":"w5PrefAcetaminophen"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Azithromycin 10 mg/kg daily × 3 days | w5Orders.prefAzithromycin | click / {"macro":{"id":"w5PrefAzithromycin"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Albuterol 0.1 mg/kg q4h PRN | w5Orders.prefAlbuterol | click / {"macro":{"id":"w5PrefAlbuterol"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Collapse section | w5Orders.dosing | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Collapse section | w5Orders.medication | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Enter Medication | w5Orders.drug | enter / {"field":{"slot":"current","prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Antibiotic indication (required for antibiotics) | w5Orders.abxIndication | enter / {"field":{"slot":"current","prefill":"none","element":"abxIndication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Dose unit | w5Orders.doseUnit | enter / {"field":{"slot":"current","prefill":"none","element":"doseUnit"}} / lean | works | DOM changed |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Route | w5Orders.route | enter / {"field":{"slot":"current","prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Frequency | w5Orders.freq | enter / {"field":{"slot":"current","prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | As needed (PRN) | w5Orders.prn | enter / {"field":{"slot":"current","prefill":"none","element":"prn"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Collapse section | w5Orders.dispense | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Duration | w5Orders.duration | enter / {"field":{"slot":"current","prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Generic substitution allowed | w5Orders.substitution | enter / {"field":{"slot":"current","prefill":"none","element":"substitution"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Collapse section | w5Orders.dx | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Pharmacy | w5Orders.pharmacy | enter / {"field":{"slot":"current","prefill":{"fromRecord":{"fact":"preferredPharmacy"}},"element":"pharmacy"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Associated diagnosis (ICD-10) | w5Orders.orderDiagnosis | enter / {"field":{"slot":"current","prefill":{"linked":{"element":"visitDiagnosis"}},"element":"orderDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Collapse section | w5Orders.controlled | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | CURES not checked: exemption | w5Orders.curesExemptionReason | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"curesExemptionReason"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Naloxone offered | w5Orders.naloxoneOffer | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"naloxoneOffer"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Overdose and naloxone education given | w5Orders.naloxoneEducation | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"naloxoneEducation"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Expand section | w5Orders.more | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Current meds | w5Orders.orderInfo | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | CURES report | w5Orders.orderInfo | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Recent labs | w5Orders.orderInfo | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Request authorization (human entry) | w5Orders.priorAuthRequest | enter / {"field":{"slot":"current","prefill":"none","element":"priorAuthRequest"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Request prior authorization | w5Orders.requestPriorAuth | click / {"button":{"action":"requestPriorAuth"}} / lean | disabled-with-reason | no order on this line |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Accept and add another order | w5Orders.newLine | click / {"button":{"action":"newOrderLine"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Back | w5Orders.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Growth chart | w5Orders.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Immunizations | w5Orders.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Results | w5Orders.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Notes | w5Orders.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Family history | w5Orders.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Care gaps | w5Orders.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Review and sign | w5Orders.toSign | click / {"button":{"action":{"goto":{"screen":"w5Sign"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Immunizations | Search chart | w5Immunizations.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Immunizations | Influenza vaccine (from inventory) | w5Immunizations.fluVaccine | click / {"macro":{"id":"w5FluVaccine"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Immunizations | Collapse section | w5Immunizations.record | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Immunizations | Vaccine | w5Immunizations.vaccine | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"vaccine"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Immunizations | Site | w5Immunizations.vaccineSite | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"vaccineSite"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Immunizations | Route | w5Immunizations.vaccineRoute | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"vaccineRoute"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Immunizations | VIS given before vaccination | w5Immunizations.visGiven | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"visGiven"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Immunizations | Record immunization | w5Immunizations.commit.recordImmunization | click / {"button":{"action":{"commit":{"commit":"recordImmunization"}}}} / lean | disabled-with-reason | entry required: Vaccine |
| /?audit=buttons · P4 · canonical-P4 | w5Immunizations | Back | w5Immunizations.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Immunizations | Growth chart | w5Immunizations.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Immunizations | Immunizations | w5Immunizations.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Immunizations | Results | w5Immunizations.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Immunizations | Notes | w5Immunizations.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Immunizations | Family history | w5Immunizations.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Immunizations | Care gaps | w5Immunizations.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Close | Search chart | w5Close.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Close | Well-child template (age 6) | w5Close.wellChild | click / {"macro":{"id":"w5WellChildTemplate"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Close | Visit diagnosis (ICD-10) | w5Close.visitDiagnosis | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"visitDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Close | Billing diagnosis (ICD-10) | w5Close.claimDiagnosis | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":{"linked":{"element":"visitDiagnosis"}},"element":"claimDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Close | Level of service | w5Close.levelOfService | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"levelOfService"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Close | Follow-up | w5Close.followUp | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"followUp"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Close | Sign note | w5Close.commit.signNote | click / {"button":{"action":{"commit":{"commit":"signNote"}}}} / lean | disabled-with-reason | entry required: Chief complaint |
| /?audit=buttons · P4 · canonical-P4 | w5Close | Back | w5Close.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Close | Growth chart | w5Close.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Close | Immunizations | w5Close.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Close | Results | w5Close.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Close | Notes | w5Close.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Close | Family history | w5Close.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Close | Care gaps | w5Close.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w2Result | Acknowledge and mark done | w2Result.commit.ackResult | click / {"button":{"action":{"commit":{"commit":"ackResult"}}}} / lean | works | DOM changed; validation drawer: Select a Task for this patient Your inputs are retained. Close this panel, correct the issue, and retry the action. |
| /?audit=buttons · P4 · canonical-P4 | w2Message | Confirm prefilled value | w2Message.patientMessage | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"patientMessage"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w7Review | Mark fill history reviewed | w7Review.review.adherence | click / {"button":{"action":{"markReviewed":{"info":"adherence"}}}} / lean | works | DOM changed; validation drawer: No versioned source record for review: adherence Your inputs are retained. Close this panel, correct the issue, and retry the action. |
| /?audit=buttons · P4 · canonical-P4 | w7Decision | Search chart | w7Decision.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w7Decision | Collapse section | w7Decision.decisionGroup | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w7Decision | Approve / deny / modify | w7Decision.refillDecision | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"refillDecision"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w7Decision | Pharmacy | w7Decision.refillPharmacy | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":{"fromRecord":{"fact":"requestPharmacy"}},"element":"refillPharmacy"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w7Decision | Refill protocol criteria met | w7Decision.refillProtocolMet | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"refillProtocolMet"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w7Decision | Reason for denial | w7Decision.refillDenyReason | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"refillDenyReason"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w7Decision | Deny refill | w7Decision.commit.denyRefill | click / {"button":{"action":{"commit":{"commit":"denyRefill"}}}} / lean | disabled-with-reason | entry required: Refill decision |
| /?audit=buttons · P4 · canonical-P4 | w7Decision | Sign refill decision | w7Decision.commit.approveRefill | click / {"button":{"action":{"commit":{"commit":"approveRefill"}}}} / lean | disabled-with-reason | entry required: Refill decision |
| /?audit=buttons · P4 · canonical-P4 | w7Decision | Back | w7Decision.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w7Decision | Encounters | w7Decision.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w7Decision | Imaging | w7Decision.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w7Decision | Care gaps | w7Decision.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Confirm prefilled value | w5Orders.doseMgPerKg | confirm / {"field":{"slot":"current","prefill":"none","element":"doseMgPerKg"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Confirm prefilled value | w5Orders.drug | confirm / {"field":{"slot":"current","prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Confirm prefilled value | w5Orders.abxIndication | confirm / {"field":{"slot":"current","prefill":"none","element":"abxIndication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Confirm prefilled value | w5Orders.doseUnit | confirm / {"field":{"slot":"current","prefill":"none","element":"doseUnit"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Confirm prefilled value | w5Orders.route | confirm / {"field":{"slot":"current","prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Confirm prefilled value | w5Orders.freq | confirm / {"field":{"slot":"current","prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Confirm prefilled value | w5Orders.duration | confirm / {"field":{"slot":"current","prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Confirm prefilled value | w5Orders.quantity | confirm / {"field":{"slot":"current","prefill":"none","element":"quantity"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Confirm prefilled value | w5Orders.refills | confirm / {"field":{"slot":"current","prefill":"none","element":"refills"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Accept and add another order | w5Orders.newLine | click / {"button":{"action":"newOrderLine"}} / lean | disabled-with-reason | finish this order line first |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | I have reviewed the patient's allergies | w5Orders.allergyReconfirmOrdering | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"allergyReconfirmOrdering"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Orders | Mark CURES report reviewed | w5Orders.review.curesReport | click / {"button":{"action":{"markReviewed":{"info":"curesReport"}}}} / lean | works | DOM changed; validation drawer: No versioned source record for review: curesReport Your inputs are retained. Close this panel, correct the issue, and retry the action. |
| /?audit=buttons · P4 · canonical-P4 | w5Sign | Search chart | w5Sign.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Sign | Sign orders | w5Sign.commit.signOrders | click / {"button":{"action":{"commit":{"commit":"signOrders"}}}} / lean | disabled-with-reason | Re-enter patient ID (initials / sex / age) to sign |
| /?audit=buttons · P4 · canonical-P4 | w5Sign | Back | w5Sign.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Sign | Growth chart | w5Sign.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Sign | Immunizations | w5Sign.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Sign | Results | w5Sign.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Sign | Notes | w5Sign.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Sign | Family history | w5Sign.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Sign | Care gaps | w5Sign.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Immunizations | Confirm prefilled value | w5Immunizations.vaccine | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"vaccine"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Immunizations | Confirm prefilled value | w5Immunizations.vaccineLot | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"vaccineLot"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Immunizations | Confirm prefilled value | w5Immunizations.vaccineRoute | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"vaccineRoute"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Close | Confirm prefilled value | w5Close.hpi | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"hpi"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Close | Confirm prefilled value | w5Close.ros | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"ros"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Close | Confirm prefilled value | w5Close.exam | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"exam"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Close | Confirm prefilled value | w5Close.anticipatoryGuidance | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"anticipatoryGuidance"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P4 · canonical-P4 | w5Immunizations | Record immunization | w5Immunizations.commit.recordImmunization | click / {"button":{"action":{"commit":{"commit":"recordImmunization"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons · P4 · canonical-P4 | w5Immunizations | /medplum/fhir/R4/Immunization/9c29fac2-9d18-47f1-8f91-448f8312dd47 | — | button / app | works | DOM changed |
| /?audit=buttons · P4 · canonical-P4 | w5Immunizations | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · canonical-P5 | home | Search chart | home.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | home | Consults | home.work.w1Rooming | click / {"button":{"action":{"goto":{"screen":"w1Rooming"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | home | In Basket: Results | home.work.w2Inbasket | click / {"button":{"action":{"goto":{"screen":"w2Inbasket"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | home | OR Schedule | home.work.w6PreOp | click / {"button":{"action":{"goto":{"screen":"w6PreOp"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | home | Problem list | home.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | home | Results | home.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | home | Notes | home.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | home | Medications | home.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | home | Allergies | home.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | home | Encounters | home.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | home | Coverage | home.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | home | History | home.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Rooming | Search chart | w1Rooming.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Rooming | Collapse section | w1Rooming.vitalsGroup | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Rooming | Pain (0–10) | w1Rooming.painScore | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"painScore"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Rooming | Collapse section | w1Rooming.intake | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Rooming | Tobacco use | w1Rooming.tobaccoUse | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"tobaccoUse"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Rooming | Fall in the past year? | w1Rooming.fallRiskScreen | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"fallRiskScreen"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Rooming | Travel in the past 30 days? | w1Rooming.travelScreen | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"travelScreen"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Rooming | Advance directive discussed | w1Rooming.advanceDirectiveAsked | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"advanceDirectiveAsked"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Rooming | Interpreter needed? | w1Rooming.interpreterNeeded | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"interpreterNeeded"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Rooming | Preferred pharmacy confirmed | w1Rooming.pharmacyConfirmedRooming | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"pharmacyConfirmedRooming"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Rooming | Collapse section | w1Rooming.phq | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Rooming | PHQ-2 score | w1Rooming.depressionScreen | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"depressionScreen"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Rooming | Collapse section | w1Rooming.allergyGroup | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Rooming | Mark allergies reviewed | w1Rooming.review.allergyList | click / {"button":{"action":{"markReviewed":{"info":"allergyList"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons · P5 · canonical-P5 | w1Rooming | /medplum/fhir/R4/Provenance/5e533732-91ba-4c76-a386-a73b5adb33df | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · canonical-P5 | w1Rooming | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · canonical-P5 | w1Rooming | Back | w1Rooming.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Rooming | Patient workspace | w1Rooming.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Rooming | Med rec | w1Rooming.nav.w1MedRec | click / {"button":{"action":{"goto":{"screen":"w1MedRec"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Rooming | HPI / ROS | w1Rooming.nav.w1Hpi | click / {"button":{"action":{"goto":{"screen":"w1Hpi"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Rooming | Exam / A&P | w1Rooming.nav.w1Exam | click / {"button":{"action":{"goto":{"screen":"w1Exam"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Rooming | Orders | w1Rooming.nav.w1Orders | click / {"button":{"action":{"goto":{"screen":"w1Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Rooming | Labs | w1Rooming.nav.w1Labs | click / {"button":{"action":{"goto":{"screen":"w1Labs"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Rooming | Visit close | w1Rooming.nav.w1Close | click / {"button":{"action":{"goto":{"screen":"w1Close"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Rooming | Results | w1Rooming.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Rooming | Imaging | w1Rooming.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Rooming | Notes | w1Rooming.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Rooming | Encounters | w1Rooming.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Rooming | Social history | w1Rooming.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Rooming | Family history | w1Rooming.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Rooming | Care gaps | w1Rooming.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Rooming | Immunizations | w1Rooming.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Rooming | Coverage | w1Rooming.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w2Inbasket | Search chart | w2Inbasket.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w2Inbasket | Search in-basket | w2Inbasket.basketSearch | enter / {"search":{"scope":"inbasket"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w2Inbasket | Back | w2Inbasket.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w2Inbasket | Result | w2Inbasket.nav.w2Result | click / {"button":{"action":{"goto":{"screen":"w2Result"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w2Inbasket | Message patient | w2Inbasket.nav.w2Message | click / {"button":{"action":{"goto":{"screen":"w2Message"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w2Inbasket | All results | w2Inbasket.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w2Inbasket | Notes | w2Inbasket.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w2Inbasket | Encounters | w2Inbasket.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w2Inbasket | Imaging | w2Inbasket.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PreOp | Add imaging / procedure order | w6PreOp.newServiceOrder | click / {"button":{"action":"newOrderLine"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PreOp | Kind: imaging / procedure | w6PreOp.orderKind | enter / {"field":{"slot":"current","prefill":"none","element":"orderKind"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PreOp | Service code | w6PreOp.orderCode | enter / {"field":{"slot":"current","prefill":"none","element":"orderCode"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PreOp | Request authorization (human entry) | w6PreOp.priorAuthRequest | enter / {"field":{"slot":"current","prefill":"none","element":"priorAuthRequest"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PreOp | Request service prior authorization | w6PreOp.requestServicePriorAuth | click / {"button":{"action":"requestPriorAuth"}} / lean | disabled-with-reason | no order on this line |
| /?audit=buttons · P5 · canonical-P5 | w6PreOp | Search chart | w6PreOp.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PreOp | Surgical consent verified | w6PreOp.consentVerified | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"consentVerified"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PreOp | Back | w6PreOp.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PreOp | Consult | w6PreOp.nav.w6Consult | click / {"button":{"action":{"goto":{"screen":"w6Consult"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PreOp | Consult close | w6PreOp.nav.w6ConsultClose | click / {"button":{"action":{"goto":{"screen":"w6ConsultClose"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PreOp | Orders | w6PreOp.nav.w6Orders | click / {"button":{"action":{"goto":{"screen":"w6Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PreOp | Post-op order set | w6PreOp.nav.w6PostOp | click / {"button":{"action":{"goto":{"screen":"w6PostOp"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PreOp | Op note | w6PreOp.nav.w6OpNote | click / {"button":{"action":{"goto":{"screen":"w6OpNote"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PreOp | Rounding | w6PreOp.nav.w6Rounding | click / {"button":{"action":{"goto":{"screen":"w6Rounding"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PreOp | Discharge | w6PreOp.nav.w6Discharge | click / {"button":{"action":{"goto":{"screen":"w6Discharge"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PreOp | Imaging | w6PreOp.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PreOp | Results | w6PreOp.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PreOp | Notes | w6PreOp.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PreOp | Surgical history | w6PreOp.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PreOp | Encounters | w6PreOp.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1MedRec | Search chart | w1MedRec.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1MedRec | Mark medications reviewed | w1MedRec.review.currentMeds | click / {"button":{"action":{"markReviewed":{"info":"currentMeds"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons · P5 · canonical-P5 | w1MedRec | /medplum/fhir/R4/Provenance/60dda446-3671-4c00-ace3-b6beab53070e | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · canonical-P5 | w1MedRec | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · canonical-P5 | w1MedRec | Collapse section | w1MedRec.rows | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1MedRec | Medication 1: continue / stop / modify | w1MedRec.decision0 | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"medRecDecision"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1MedRec | Medication 2: continue / stop / modify | w1MedRec.decision1 | enter / {"field":{"slot":{"fixed":{"n":1}},"prefill":"none","element":"medRecDecision"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1MedRec | Medication 3: continue / stop / modify | w1MedRec.decision2 | enter / {"field":{"slot":{"fixed":{"n":2}},"prefill":"none","element":"medRecDecision"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1MedRec | Medication 4: continue / stop / modify | w1MedRec.decision3 | enter / {"field":{"slot":{"fixed":{"n":3}},"prefill":"none","element":"medRecDecision"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1MedRec | Last plan | w1MedRec.medTabs | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1MedRec | Fill history | w1MedRec.medTabs | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1MedRec | Back | w1MedRec.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1MedRec | Results | w1MedRec.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1MedRec | Imaging | w1MedRec.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1MedRec | Notes | w1MedRec.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1MedRec | Encounters | w1MedRec.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1MedRec | Social history | w1MedRec.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1MedRec | Family history | w1MedRec.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1MedRec | Care gaps | w1MedRec.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1MedRec | Immunizations | w1MedRec.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1MedRec | Coverage | w1MedRec.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Hpi | Search chart | w1Hpi.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Hpi | Copy forward last note | w1Hpi.copyForward | click / {"macro":{"id":"w1CopyForward"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Hpi | ROS template (12 systems negative) | w1Hpi.rosTemplate | click / {"macro":{"id":"w1RosTemplate"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Hpi | Expand section | w1Hpi.lastNote | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Hpi | Back | w1Hpi.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Hpi | Results | w1Hpi.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Hpi | Imaging | w1Hpi.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Hpi | Notes | w1Hpi.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Hpi | Encounters | w1Hpi.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Hpi | Social history | w1Hpi.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Hpi | Family history | w1Hpi.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Hpi | Care gaps | w1Hpi.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Hpi | Immunizations | w1Hpi.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Hpi | Coverage | w1Hpi.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Exam | Search chart | w1Exam.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Exam | Normal exam template | w1Exam.examTemplate | click / {"macro":{"id":"w1ExamTemplate"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Exam | Visit diagnosis (ICD-10) | w1Exam.visitDiagnosis | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"visitDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Exam | Back | w1Exam.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Exam | Results | w1Exam.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Exam | Imaging | w1Exam.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Exam | Notes | w1Exam.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Exam | Encounters | w1Exam.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Exam | Social history | w1Exam.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Exam | Family history | w1Exam.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Exam | Care gaps | w1Exam.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Exam | Immunizations | w1Exam.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Exam | Coverage | w1Exam.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Search chart | w1Orders.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Find orders | w1Orders.orderSearch | enter / {"search":{"scope":"formulary"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Collapse section | w1Orders.prefList | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Lisinopril 10 mg daily | w1Orders.prefLisinopril | click / {"macro":{"id":"w1PrefLisinopril"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Atorvastatin 40 mg daily | w1Orders.prefAtorvastatin | click / {"macro":{"id":"w1PrefAtorvastatin"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Metformin 500 mg BID | w1Orders.prefMetformin | click / {"macro":{"id":"w1PrefMetformin"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Amoxicillin 1 g TID × 10 days | w1Orders.prefAmoxicillin | click / {"macro":{"id":"w1PrefAmoxicillin"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Azithromycin 500 mg daily × 5 days | w1Orders.prefAzithromycin | click / {"macro":{"id":"w1PrefAzithromycin"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Ibuprofen 600 mg TID | w1Orders.prefIbuprofen | click / {"macro":{"id":"w1PrefIbuprofen"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Oxycodone 10 mg q6h PRN × 5 days | w1Orders.prefOxycodone | click / {"macro":{"id":"w1PrefOxycodone"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Collapse section | w1Orders.dosing | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Collapse section | w1Orders.medication | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Enter Medication | w1Orders.drug | enter / {"field":{"slot":"current","prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Antibiotic indication (required for antibiotics) | w1Orders.abxIndication | enter / {"field":{"slot":"current","prefill":"none","element":"abxIndication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Dose unit | w1Orders.doseUnit | enter / {"field":{"slot":"current","prefill":"none","element":"doseUnit"}} / lean | works | DOM changed |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Route | w1Orders.route | enter / {"field":{"slot":"current","prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Frequency | w1Orders.freq | enter / {"field":{"slot":"current","prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | As needed (PRN) | w1Orders.prn | enter / {"field":{"slot":"current","prefill":"none","element":"prn"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Collapse section | w1Orders.dispense | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Duration | w1Orders.duration | enter / {"field":{"slot":"current","prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Generic substitution allowed | w1Orders.substitution | enter / {"field":{"slot":"current","prefill":"none","element":"substitution"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Collapse section | w1Orders.dx | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Pharmacy | w1Orders.pharmacy | enter / {"field":{"slot":"current","prefill":{"fromRecord":{"fact":"preferredPharmacy"}},"element":"pharmacy"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Associated diagnosis (ICD-10) | w1Orders.orderDiagnosis | enter / {"field":{"slot":"current","prefill":{"linked":{"element":"visitDiagnosis"}},"element":"orderDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Collapse section | w1Orders.controlled | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | CURES not checked: exemption | w1Orders.curesExemptionReason | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"curesExemptionReason"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Naloxone offered | w1Orders.naloxoneOffer | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"naloxoneOffer"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Overdose and naloxone education given | w1Orders.naloxoneEducation | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"naloxoneEducation"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Expand section | w1Orders.more | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Current meds | w1Orders.orderInfo | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | CURES report | w1Orders.orderInfo | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Recent labs | w1Orders.orderInfo | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Request authorization (human entry) | w1Orders.priorAuthRequest | enter / {"field":{"slot":"current","prefill":"none","element":"priorAuthRequest"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Request prior authorization | w1Orders.requestPriorAuth | click / {"button":{"action":"requestPriorAuth"}} / lean | disabled-with-reason | no order on this line |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Accept and add another order | w1Orders.newLine | click / {"button":{"action":"newOrderLine"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Back | w1Orders.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Results | w1Orders.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Imaging | w1Orders.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Notes | w1Orders.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Encounters | w1Orders.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Social history | w1Orders.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Family history | w1Orders.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Care gaps | w1Orders.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Immunizations | w1Orders.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Coverage | w1Orders.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Review and sign | w1Orders.toSign | click / {"button":{"action":{"goto":{"screen":"w1Verify"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Labs | Add imaging / procedure order | w1Labs.newServiceOrder | click / {"button":{"action":"newOrderLine"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Labs | Kind: imaging / procedure | w1Labs.orderKind | enter / {"field":{"slot":"current","prefill":"none","element":"orderKind"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Labs | Service code | w1Labs.orderCode | enter / {"field":{"slot":"current","prefill":"none","element":"orderCode"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Labs | Request authorization (human entry) | w1Labs.priorAuthRequest | enter / {"field":{"slot":"current","prefill":"none","element":"priorAuthRequest"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Labs | Request service prior authorization | w1Labs.requestServicePriorAuth | click / {"button":{"action":"requestPriorAuth"}} / lean | disabled-with-reason | no order on this line |
| /?audit=buttons · P5 · canonical-P5 | w1Labs | Search chart | w1Labs.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Labs | Search lab tests | w1Labs.labSearch | enter / {"search":{"scope":"loinc"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Labs | Collapse section | w1Labs.labOrder | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Labs | Test | w1Labs.labTest | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"labTest"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Labs | Diagnosis (ICD-10) | w1Labs.labDiagnosis | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":{"linked":{"element":"visitDiagnosis"}},"element":"labDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Labs | Priority | w1Labs.labPriority | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"labPriority"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Labs | Fasting required | w1Labs.labFasting | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"labFasting"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Labs | Back | w1Labs.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Labs | Results | w1Labs.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Labs | Imaging | w1Labs.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Labs | Notes | w1Labs.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Labs | Encounters | w1Labs.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Labs | Social history | w1Labs.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Labs | Family history | w1Labs.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Labs | Care gaps | w1Labs.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Labs | Immunizations | w1Labs.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Labs | Coverage | w1Labs.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Close | Search chart | w1Close.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Close | Billing diagnosis (ICD-10) | w1Close.claimDiagnosis | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":{"linked":{"element":"visitDiagnosis"}},"element":"claimDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Close | Level of service | w1Close.levelOfService | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"levelOfService"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Close | Follow-up | w1Close.followUp | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"followUp"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Close | Instructions template | w1Close.avsTemplate | click / {"macro":{"id":"w1AvsTemplate"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Close | Sign note | w1Close.commit.signNote | click / {"button":{"action":{"commit":{"commit":"signNote"}}}} / lean | disabled-with-reason | entry required: Chief complaint |
| /?audit=buttons · P5 · canonical-P5 | w1Close | Back | w1Close.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Close | Results | w1Close.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Close | Imaging | w1Close.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Close | Notes | w1Close.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Close | Encounters | w1Close.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Close | Social history | w1Close.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Close | Family history | w1Close.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Close | Care gaps | w1Close.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Close | Immunizations | w1Close.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Close | Coverage | w1Close.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w2Result | Search chart | w2Result.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w2Result | Action | w2Result.resultAction | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"resultAction"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w2Result | Follow-up test | w2Result.resultFollowUpOrder | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"resultFollowUpOrder"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w2Result | Acknowledge and mark done | w2Result.commit.ackResult | click / {"button":{"action":{"commit":{"commit":"ackResult"}}}} / lean | disabled-with-reason | entry required: Result action |
| /?audit=buttons · P5 · canonical-P5 | w2Result | Back | w2Result.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w2Result | All results | w2Result.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w2Result | Notes | w2Result.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w2Result | Encounters | w2Result.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w2Result | Imaging | w2Result.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w2Message | Search chart | w2Message.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w2Message | Template: normal result | w2Message.normalLetter | click / {"macro":{"id":"w2NormalLetter"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w2Message | Template: repeat the test | w2Message.repeatLetter | click / {"macro":{"id":"w2RepeatLetter"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w2Message | Back | w2Message.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w2Message | All results | w2Message.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w2Message | Notes | w2Message.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w2Message | Encounters | w2Message.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w2Message | Imaging | w2Message.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Consult | Search chart | w6Consult.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Consult | Diagnosis (ICD-10) | w6Consult.visitDiagnosis | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"visitDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Consult | Surgical decision | w6Consult.surgeryDecision | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"surgeryDecision"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Consult | Collapse section | w6Consult.homeMeds | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Consult | Medication 1: continue / stop / modify | w6Consult.decision0 | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"medRecDecision"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Consult | Medication 2: continue / stop / modify | w6Consult.decision1 | enter / {"field":{"slot":{"fixed":{"n":1}},"prefill":"none","element":"medRecDecision"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Consult | Back | w6Consult.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Consult | Imaging | w6Consult.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Consult | Results | w6Consult.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Consult | Notes | w6Consult.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Consult | Surgical history | w6Consult.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Consult | Encounters | w6Consult.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6ConsultClose | Search chart | w6ConsultClose.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6ConsultClose | Billing diagnosis (ICD-10) | w6ConsultClose.claimDiagnosis | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":{"linked":{"element":"visitDiagnosis"}},"element":"claimDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6ConsultClose | Level of service | w6ConsultClose.levelOfService | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"levelOfService"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6ConsultClose | Plan / follow-up | w6ConsultClose.followUp | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"followUp"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6ConsultClose | Sign consult note | w6ConsultClose.commit.signNote | click / {"button":{"action":{"commit":{"commit":"signNote"}}}} / lean | disabled-with-reason | entry required: Chief complaint |
| /?audit=buttons · P5 · canonical-P5 | w6ConsultClose | Back | w6ConsultClose.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6ConsultClose | Imaging | w6ConsultClose.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6ConsultClose | Results | w6ConsultClose.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6ConsultClose | Notes | w6ConsultClose.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6ConsultClose | Surgical history | w6ConsultClose.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6ConsultClose | Encounters | w6ConsultClose.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Search chart | w6Orders.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Find orders | w6Orders.orderSearch | enter / {"search":{"scope":"formulary"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Collapse section | w6Orders.prefList | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Cefazolin 2 g IV (surgical prophylaxis) | w6Orders.prefCefazolin | click / {"macro":{"id":"w6PrefCefazolin"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Acetaminophen 1 g q6h | w6Orders.prefAcetaminophen | click / {"macro":{"id":"w6PrefAcetaminophen"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Oxycodone 10 mg q6h PRN | w6Orders.prefOxycodone | click / {"macro":{"id":"w6PrefOxycodone"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Enoxaparin 40 mg SC daily | w6Orders.prefEnoxaparin | click / {"macro":{"id":"w6PrefEnoxaparin"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Ondansetron 8 mg IV q8h PRN | w6Orders.prefOndansetron | click / {"macro":{"id":"w6PrefOndansetron"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Collapse section | w6Orders.dosing | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Collapse section | w6Orders.medication | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Enter Medication | w6Orders.drug | enter / {"field":{"slot":"current","prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Antibiotic indication (required for antibiotics) | w6Orders.abxIndication | enter / {"field":{"slot":"current","prefill":"none","element":"abxIndication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Dose unit | w6Orders.doseUnit | enter / {"field":{"slot":"current","prefill":"none","element":"doseUnit"}} / lean | works | DOM changed |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Route | w6Orders.route | enter / {"field":{"slot":"current","prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Frequency | w6Orders.freq | enter / {"field":{"slot":"current","prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | As needed (PRN) | w6Orders.prn | enter / {"field":{"slot":"current","prefill":"none","element":"prn"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Collapse section | w6Orders.dispense | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Duration | w6Orders.duration | enter / {"field":{"slot":"current","prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Generic substitution allowed | w6Orders.substitution | enter / {"field":{"slot":"current","prefill":"none","element":"substitution"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Collapse section | w6Orders.dx | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Pharmacy | w6Orders.pharmacy | enter / {"field":{"slot":"current","prefill":{"fromRecord":{"fact":"preferredPharmacy"}},"element":"pharmacy"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Associated diagnosis (ICD-10) | w6Orders.orderDiagnosis | enter / {"field":{"slot":"current","prefill":{"linked":{"element":"visitDiagnosis"}},"element":"orderDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Expand section | w6Orders.more | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Current meds | w6Orders.orderInfo | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | CURES report | w6Orders.orderInfo | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Recent labs | w6Orders.orderInfo | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Request authorization (human entry) | w6Orders.priorAuthRequest | enter / {"field":{"slot":"current","prefill":"none","element":"priorAuthRequest"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Request prior authorization | w6Orders.requestPriorAuth | click / {"button":{"action":"requestPriorAuth"}} / lean | disabled-with-reason | no order on this line |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Accept and add another order | w6Orders.newLine | click / {"button":{"action":"newOrderLine"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Back | w6Orders.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Imaging | w6Orders.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Results | w6Orders.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Notes | w6Orders.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Surgical history | w6Orders.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Encounters | w6Orders.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Review and sign | w6Orders.toSign | click / {"button":{"action":{"goto":{"screen":"w6Sign"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Search chart | w6PostOp.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Appendectomy post-op order set | w6PostOp.appendectomySet | click / {"macro":{"id":"w6AppendectomySet"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Collapse section | w6PostOp.care | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Diet | w6PostOp.postOpDiet | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"postOpDiet"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Activity | w6PostOp.postOpActivity | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"postOpActivity"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | VTE prophylaxis: mechanical | w6PostOp.vteMechanical | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"vteMechanical"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Morning labs | w6PostOp.postOpLabs | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"postOpLabs"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Vital signs frequency | w6PostOp.postOpVitalsFreq | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"postOpVitalsFreq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Collapse section | w6PostOp.row10 | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Collapse section | w6PostOp.row10.medication | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Enter Medication | w6PostOp.row10.drug | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Antibiotic indication (required for antibiotics) | w6PostOp.row10.abxIndication | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"abxIndication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Dose unit | w6PostOp.row10.doseUnit | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"doseUnit"}} / lean | works | DOM changed |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Route | w6PostOp.row10.route | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Frequency | w6PostOp.row10.freq | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | As needed (PRN) | w6PostOp.row10.prn | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"prn"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Collapse section | w6PostOp.row10.dispense | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Duration | w6PostOp.row10.duration | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Generic substitution allowed | w6PostOp.row10.substitution | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"substitution"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Collapse section | w6PostOp.row10.dx | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Pharmacy | w6PostOp.row10.pharmacy | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":{"fromRecord":{"fact":"preferredPharmacy"}},"element":"pharmacy"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Associated diagnosis (ICD-10) | w6PostOp.row10.orderDiagnosis | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":{"linked":{"element":"visitDiagnosis"}},"element":"orderDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Collapse section | w6PostOp.row11 | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Collapse section | w6PostOp.row11.medication | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Enter Medication | w6PostOp.row11.drug | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Antibiotic indication (required for antibiotics) | w6PostOp.row11.abxIndication | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"abxIndication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Dose unit | w6PostOp.row11.doseUnit | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"doseUnit"}} / lean | works | DOM changed |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Route | w6PostOp.row11.route | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Frequency | w6PostOp.row11.freq | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | As needed (PRN) | w6PostOp.row11.prn | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"prn"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Collapse section | w6PostOp.row11.dispense | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Duration | w6PostOp.row11.duration | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Generic substitution allowed | w6PostOp.row11.substitution | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"substitution"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Collapse section | w6PostOp.row11.dx | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Pharmacy | w6PostOp.row11.pharmacy | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":{"fromRecord":{"fact":"preferredPharmacy"}},"element":"pharmacy"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Associated diagnosis (ICD-10) | w6PostOp.row11.orderDiagnosis | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":{"linked":{"element":"visitDiagnosis"}},"element":"orderDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Collapse section | w6PostOp.row12 | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Collapse section | w6PostOp.row12.medication | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Enter Medication | w6PostOp.row12.drug | enter / {"field":{"slot":{"fixed":{"n":12}},"prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Antibiotic indication (required for antibiotics) | w6PostOp.row12.abxIndication | enter / {"field":{"slot":{"fixed":{"n":12}},"prefill":"none","element":"abxIndication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Dose unit | w6PostOp.row12.doseUnit | enter / {"field":{"slot":{"fixed":{"n":12}},"prefill":"none","element":"doseUnit"}} / lean | works | DOM changed |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Route | w6PostOp.row12.route | enter / {"field":{"slot":{"fixed":{"n":12}},"prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Frequency | w6PostOp.row12.freq | enter / {"field":{"slot":{"fixed":{"n":12}},"prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | As needed (PRN) | w6PostOp.row12.prn | enter / {"field":{"slot":{"fixed":{"n":12}},"prefill":"none","element":"prn"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Collapse section | w6PostOp.row12.dispense | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Duration | w6PostOp.row12.duration | enter / {"field":{"slot":{"fixed":{"n":12}},"prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Generic substitution allowed | w6PostOp.row12.substitution | enter / {"field":{"slot":{"fixed":{"n":12}},"prefill":"none","element":"substitution"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Collapse section | w6PostOp.row12.dx | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Pharmacy | w6PostOp.row12.pharmacy | enter / {"field":{"slot":{"fixed":{"n":12}},"prefill":{"fromRecord":{"fact":"preferredPharmacy"}},"element":"pharmacy"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Associated diagnosis (ICD-10) | w6PostOp.row12.orderDiagnosis | enter / {"field":{"slot":{"fixed":{"n":12}},"prefill":{"linked":{"element":"visitDiagnosis"}},"element":"orderDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Collapse section | w6PostOp.row13 | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Collapse section | w6PostOp.row13.medication | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Enter Medication | w6PostOp.row13.drug | enter / {"field":{"slot":{"fixed":{"n":13}},"prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Antibiotic indication (required for antibiotics) | w6PostOp.row13.abxIndication | enter / {"field":{"slot":{"fixed":{"n":13}},"prefill":"none","element":"abxIndication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Dose unit | w6PostOp.row13.doseUnit | enter / {"field":{"slot":{"fixed":{"n":13}},"prefill":"none","element":"doseUnit"}} / lean | works | DOM changed |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Route | w6PostOp.row13.route | enter / {"field":{"slot":{"fixed":{"n":13}},"prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Frequency | w6PostOp.row13.freq | enter / {"field":{"slot":{"fixed":{"n":13}},"prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | As needed (PRN) | w6PostOp.row13.prn | enter / {"field":{"slot":{"fixed":{"n":13}},"prefill":"none","element":"prn"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Collapse section | w6PostOp.row13.dispense | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Duration | w6PostOp.row13.duration | enter / {"field":{"slot":{"fixed":{"n":13}},"prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Generic substitution allowed | w6PostOp.row13.substitution | enter / {"field":{"slot":{"fixed":{"n":13}},"prefill":"none","element":"substitution"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Collapse section | w6PostOp.row13.dx | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Pharmacy | w6PostOp.row13.pharmacy | enter / {"field":{"slot":{"fixed":{"n":13}},"prefill":{"fromRecord":{"fact":"preferredPharmacy"}},"element":"pharmacy"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Associated diagnosis (ICD-10) | w6PostOp.row13.orderDiagnosis | enter / {"field":{"slot":{"fixed":{"n":13}},"prefill":{"linked":{"element":"visitDiagnosis"}},"element":"orderDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Back | w6PostOp.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Imaging | w6PostOp.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Results | w6PostOp.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Notes | w6PostOp.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Surgical history | w6PostOp.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Encounters | w6PostOp.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6OpNote | Search chart | w6OpNote.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6OpNote | Template: laparoscopic appendectomy | w6OpNote.template | click / {"macro":{"id":"w6OpNoteTemplate"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6OpNote | Collapse section | w6OpNote.note | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6OpNote | Pre-op diagnosis | w6OpNote.opPreopDiagnosis | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"opPreopDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6OpNote | Post-op diagnosis | w6OpNote.opPostopDiagnosis | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"opPostopDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6OpNote | Procedure | w6OpNote.opProcedure | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"opProcedure"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6OpNote | Anesthesia | w6OpNote.opAnesthesia | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"opAnesthesia"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6OpNote | Complications | w6OpNote.opComplications | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"opComplications"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6OpNote | Condition | w6OpNote.opCondition | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"opCondition"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6OpNote | Sign op note | w6OpNote.commit.signOpNote | click / {"button":{"action":{"commit":{"commit":"signOpNote"}}}} / lean | disabled-with-reason | entry required: Pre-op diagnosis |
| /?audit=buttons · P5 · canonical-P5 | w6OpNote | Back | w6OpNote.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6OpNote | Imaging | w6OpNote.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6OpNote | Results | w6OpNote.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6OpNote | Notes | w6OpNote.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6OpNote | Surgical history | w6OpNote.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6OpNote | Encounters | w6OpNote.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Rounding | Search chart | w6Rounding.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Rounding | Back | w6Rounding.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Rounding | Imaging | w6Rounding.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Rounding | Results | w6Rounding.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Rounding | Notes | w6Rounding.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Rounding | Surgical history | w6Rounding.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Rounding | Encounters | w6Rounding.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Discharge | Search chart | w6Discharge.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Discharge | Collapse section | w6Discharge.medRec | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Discharge | Medication 1: continue / stop / change / new | w6Discharge.decision0 | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"dischargeMedRec"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Discharge | Medication 2: continue / stop / change / new | w6Discharge.decision1 | enter / {"field":{"slot":{"fixed":{"n":1}},"prefill":"none","element":"dischargeMedRec"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Discharge | Medication 3: continue / stop / change / new | w6Discharge.decision2 | enter / {"field":{"slot":{"fixed":{"n":2}},"prefill":"none","element":"dischargeMedRec"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Discharge | Medication 4: continue / stop / change / new | w6Discharge.decision3 | enter / {"field":{"slot":{"fixed":{"n":3}},"prefill":"none","element":"dischargeMedRec"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Discharge | Discharge diagnosis (ICD-10) | w6Discharge.dischargeDiagnosis | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"dischargeDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Discharge | Follow-up appointment | w6Discharge.dischargeFollowUp | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"dischargeFollowUp"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Discharge | Instructions: appendectomy | w6Discharge.instructionsTemplate | click / {"macro":{"id":"w6DischargeTemplate"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Discharge | Condition at discharge | w6Discharge.dischargeCondition | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"dischargeCondition"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Discharge | Discharge to | w6Discharge.dischargeDestination | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"dischargeDestination"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Discharge | Discharge patient | w6Discharge.commit.discharge | click / {"button":{"action":{"commit":{"commit":"discharge"}}}} / lean | disabled-with-reason | entry required: Discharge medication decision |
| /?audit=buttons · P5 · canonical-P5 | w6Discharge | Back | w6Discharge.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Discharge | Imaging | w6Discharge.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Discharge | Results | w6Discharge.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Discharge | Notes | w6Discharge.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Discharge | Surgical history | w6Discharge.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Discharge | Encounters | w6Discharge.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Exam | Confirm prefilled value | w1Exam.exam | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"exam"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Exam | Confirm prefilled value | w1Exam.assessmentPlan | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"assessmentPlan"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Hpi | Confirm prefilled value | w1Hpi.ros | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"ros"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Confirm prefilled value | w1Orders.drug | confirm / {"field":{"slot":"current","prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Confirm prefilled value | w1Orders.dose | confirm / {"field":{"slot":"current","prefill":"none","element":"dose"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Confirm prefilled value | w1Orders.doseUnit | confirm / {"field":{"slot":"current","prefill":"none","element":"doseUnit"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Confirm prefilled value | w1Orders.route | confirm / {"field":{"slot":"current","prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Confirm prefilled value | w1Orders.freq | confirm / {"field":{"slot":"current","prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Confirm prefilled value | w1Orders.duration | confirm / {"field":{"slot":"current","prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Confirm prefilled value | w1Orders.quantity | confirm / {"field":{"slot":"current","prefill":"none","element":"quantity"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Confirm prefilled value | w1Orders.refills | confirm / {"field":{"slot":"current","prefill":"none","element":"refills"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Accept and add another order | w1Orders.newLine | click / {"button":{"action":"newOrderLine"}} / lean | disabled-with-reason | finish this order line first |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Confirm prefilled value | w1Orders.abxIndication | confirm / {"field":{"slot":"current","prefill":"none","element":"abxIndication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | I have reviewed the patient's allergies | w1Orders.allergyReconfirmOrdering | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"allergyReconfirmOrdering"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Orders | Mark CURES report reviewed | w1Orders.review.curesReport | click / {"button":{"action":{"markReviewed":{"info":"curesReport"}}}} / lean | works | DOM changed; validation drawer: No versioned source record for review: curesReport Your inputs are retained. Close this panel, correct the issue, and retry the action. |
| /?audit=buttons · P5 · canonical-P5 | w1Verify | Search chart | w1Verify.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Verify | Allergies re-verified before signing | w1Verify.allergyReconfirmSigning | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"allergyReconfirmSigning"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Verify | Back | w1Verify.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Verify | Results | w1Verify.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Verify | Imaging | w1Verify.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Verify | Notes | w1Verify.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Verify | Encounters | w1Verify.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Verify | Social history | w1Verify.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Verify | Family history | w1Verify.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Verify | Care gaps | w1Verify.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Verify | Immunizations | w1Verify.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Verify | Coverage | w1Verify.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Verify | Continue to sign | w1Verify.continue | click / {"button":{"action":{"goto":{"screen":"w1Sign"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Close | Confirm prefilled value | w1Close.patientInstructions | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"patientInstructions"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w2Result | Acknowledge and mark done | w2Result.commit.ackResult | click / {"button":{"action":{"commit":{"commit":"ackResult"}}}} / lean | works | DOM changed; validation drawer: Select a Task for this patient Your inputs are retained. Close this panel, correct the issue, and retry the action. |
| /?audit=buttons · P5 · canonical-P5 | w2Message | Confirm prefilled value | w2Message.patientMessage | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"patientMessage"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Confirm prefilled value | w6Orders.drug | confirm / {"field":{"slot":"current","prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Confirm prefilled value | w6Orders.abxIndication | confirm / {"field":{"slot":"current","prefill":"none","element":"abxIndication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Confirm prefilled value | w6Orders.dose | confirm / {"field":{"slot":"current","prefill":"none","element":"dose"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Confirm prefilled value | w6Orders.doseUnit | confirm / {"field":{"slot":"current","prefill":"none","element":"doseUnit"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Confirm prefilled value | w6Orders.route | confirm / {"field":{"slot":"current","prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Confirm prefilled value | w6Orders.freq | confirm / {"field":{"slot":"current","prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Confirm prefilled value | w6Orders.duration | confirm / {"field":{"slot":"current","prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Confirm prefilled value | w6Orders.quantity | confirm / {"field":{"slot":"current","prefill":"none","element":"quantity"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Confirm prefilled value | w6Orders.refills | confirm / {"field":{"slot":"current","prefill":"none","element":"refills"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Accept and add another order | w6Orders.newLine | click / {"button":{"action":"newOrderLine"}} / lean | disabled-with-reason | finish this order line first |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | I have reviewed the patient's allergies | w6Orders.allergyReconfirmOrdering | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"allergyReconfirmOrdering"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Orders | Mark CURES report reviewed | w6Orders.review.curesReport | click / {"button":{"action":{"markReviewed":{"info":"curesReport"}}}} / lean | works | DOM changed; validation drawer: No versioned source record for review: curesReport Your inputs are retained. Close this panel, correct the issue, and retry the action. |
| /?audit=buttons · P5 · canonical-P5 | w6Sign | Search chart | w6Sign.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Sign | Collapse section | w6Sign.weights | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Sign | Collapse section | w6Sign.controlled | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Sign | CURES not checked: exemption | w6Sign.curesExemptionReason | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"curesExemptionReason"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Sign | Naloxone offered | w6Sign.naloxoneOffer | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"naloxoneOffer"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Sign | Overdose and naloxone education given | w6Sign.naloxoneEducation | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"naloxoneEducation"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Sign | Sign orders | w6Sign.commit.signOrders | click / {"button":{"action":{"commit":{"commit":"signOrders"}}}} / lean | disabled-with-reason | Re-enter patient ID (initials / sex / age) to sign |
| /?audit=buttons · P5 · canonical-P5 | w6Sign | Back | w6Sign.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Sign | Imaging | w6Sign.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Sign | Results | w6Sign.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Sign | Notes | w6Sign.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Sign | Surgical history | w6Sign.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Sign | Encounters | w6Sign.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.postOpDiet | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"postOpDiet"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.postOpActivity | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"postOpActivity"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.vteMechanical | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"vteMechanical"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.postOpLabs | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"postOpLabs"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.postOpVitalsFreq | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"postOpVitalsFreq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.nursingOrders | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"nursingOrders"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row10.drug | confirm / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row10.dose | confirm / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"dose"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row10.doseUnit | confirm / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"doseUnit"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row10.route | confirm / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row10.freq | confirm / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row10.prn | confirm / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"prn"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row10.duration | confirm / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row10.quantity | confirm / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"quantity"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row10.refills | confirm / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"refills"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row10.substitution | confirm / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"substitution"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row10.pharmacy | confirm / {"field":{"slot":{"fixed":{"n":10}},"prefill":{"fromRecord":{"fact":"preferredPharmacy"}},"element":"pharmacy"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row10.indication | confirm / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"indication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row10.orderDiagnosis | confirm / {"field":{"slot":{"fixed":{"n":10}},"prefill":{"linked":{"element":"visitDiagnosis"}},"element":"orderDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row11.drug | confirm / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row11.dose | confirm / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"dose"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row11.doseUnit | confirm / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"doseUnit"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row11.route | confirm / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row11.freq | confirm / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row11.prn | confirm / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"prn"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row11.duration | confirm / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row11.quantity | confirm / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"quantity"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row11.refills | confirm / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"refills"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row11.substitution | confirm / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"substitution"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row11.pharmacy | confirm / {"field":{"slot":{"fixed":{"n":11}},"prefill":{"fromRecord":{"fact":"preferredPharmacy"}},"element":"pharmacy"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row11.indication | confirm / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"indication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row11.orderDiagnosis | confirm / {"field":{"slot":{"fixed":{"n":11}},"prefill":{"linked":{"element":"visitDiagnosis"}},"element":"orderDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row12.drug | confirm / {"field":{"slot":{"fixed":{"n":12}},"prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row12.dose | confirm / {"field":{"slot":{"fixed":{"n":12}},"prefill":"none","element":"dose"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row12.doseUnit | confirm / {"field":{"slot":{"fixed":{"n":12}},"prefill":"none","element":"doseUnit"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row12.route | confirm / {"field":{"slot":{"fixed":{"n":12}},"prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row12.freq | confirm / {"field":{"slot":{"fixed":{"n":12}},"prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row12.prn | confirm / {"field":{"slot":{"fixed":{"n":12}},"prefill":"none","element":"prn"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row12.duration | confirm / {"field":{"slot":{"fixed":{"n":12}},"prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row12.quantity | confirm / {"field":{"slot":{"fixed":{"n":12}},"prefill":"none","element":"quantity"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row12.refills | confirm / {"field":{"slot":{"fixed":{"n":12}},"prefill":"none","element":"refills"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row12.substitution | confirm / {"field":{"slot":{"fixed":{"n":12}},"prefill":"none","element":"substitution"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row12.pharmacy | confirm / {"field":{"slot":{"fixed":{"n":12}},"prefill":{"fromRecord":{"fact":"preferredPharmacy"}},"element":"pharmacy"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row12.indication | confirm / {"field":{"slot":{"fixed":{"n":12}},"prefill":"none","element":"indication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row12.orderDiagnosis | confirm / {"field":{"slot":{"fixed":{"n":12}},"prefill":{"linked":{"element":"visitDiagnosis"}},"element":"orderDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row13.drug | confirm / {"field":{"slot":{"fixed":{"n":13}},"prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row13.dose | confirm / {"field":{"slot":{"fixed":{"n":13}},"prefill":"none","element":"dose"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row13.doseUnit | confirm / {"field":{"slot":{"fixed":{"n":13}},"prefill":"none","element":"doseUnit"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row13.route | confirm / {"field":{"slot":{"fixed":{"n":13}},"prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row13.freq | confirm / {"field":{"slot":{"fixed":{"n":13}},"prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row13.prn | confirm / {"field":{"slot":{"fixed":{"n":13}},"prefill":"none","element":"prn"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row13.duration | confirm / {"field":{"slot":{"fixed":{"n":13}},"prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row13.quantity | confirm / {"field":{"slot":{"fixed":{"n":13}},"prefill":"none","element":"quantity"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row13.refills | confirm / {"field":{"slot":{"fixed":{"n":13}},"prefill":"none","element":"refills"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row13.substitution | confirm / {"field":{"slot":{"fixed":{"n":13}},"prefill":"none","element":"substitution"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row13.pharmacy | confirm / {"field":{"slot":{"fixed":{"n":13}},"prefill":{"fromRecord":{"fact":"preferredPharmacy"}},"element":"pharmacy"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row13.indication | confirm / {"field":{"slot":{"fixed":{"n":13}},"prefill":"none","element":"indication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6PostOp | Confirm prefilled value | w6PostOp.row13.orderDiagnosis | confirm / {"field":{"slot":{"fixed":{"n":13}},"prefill":{"linked":{"element":"visitDiagnosis"}},"element":"orderDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6OpNote | Confirm prefilled value | w6OpNote.opPreopDiagnosis | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"opPreopDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6OpNote | Confirm prefilled value | w6OpNote.opPostopDiagnosis | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"opPostopDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6OpNote | Confirm prefilled value | w6OpNote.opProcedure | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"opProcedure"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6OpNote | Confirm prefilled value | w6OpNote.opAnesthesia | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"opAnesthesia"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6OpNote | Confirm prefilled value | w6OpNote.opFindings | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"opFindings"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6OpNote | Confirm prefilled value | w6OpNote.opSpecimens | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"opSpecimens"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6OpNote | Confirm prefilled value | w6OpNote.opComplications | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"opComplications"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6OpNote | Confirm prefilled value | w6OpNote.opCondition | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"opCondition"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6Discharge | Confirm prefilled value | w6Discharge.dischargeInstructions | confirm / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"dischargeInstructions"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Sign | Search chart | w1Sign.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Sign | Sign orders | w1Sign.commit.signOrders | click / {"button":{"action":{"commit":{"commit":"signOrders"}}}} / lean | disabled-with-reason | Re-enter patient ID (initials / sex / age) to sign |
| /?audit=buttons · P5 · canonical-P5 | w1Sign | Back | w1Sign.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Sign | Results | w1Sign.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Sign | Imaging | w1Sign.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Sign | Notes | w1Sign.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Sign | Encounters | w1Sign.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Sign | Social history | w1Sign.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Sign | Family history | w1Sign.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Sign | Care gaps | w1Sign.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Sign | Immunizations | w1Sign.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w1Sign | Coverage | w1Sign.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P5 · canonical-P5 | w6OpNote | Sign op note | w6OpNote.commit.signOpNote | click / {"button":{"action":{"commit":{"commit":"signOpNote"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons · P5 · canonical-P5 | w6OpNote | /medplum/fhir/R4/DocumentReference/f296d401-dbf4-41c8-90f0-f955b9bcaeec | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · canonical-P5 | w6OpNote | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · canonical-P5 | w6OpNote | /medplum/fhir/R4/Procedure/b6dc4ea6-aa0c-4baf-b66d-0a6443b8dc5b | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · canonical-P5 | w6OpNote | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · canonical-P5 | w6Discharge | Discharge patient | w6Discharge.commit.discharge | click / {"button":{"action":{"commit":{"commit":"discharge"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons · P5 · canonical-P5 | w6Discharge | /medplum/fhir/R4/Condition/33efc477-ad0e-4db2-b9de-27e92c6f08ca | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · canonical-P5 | w6Discharge | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · canonical-P5 | w6Discharge | /medplum/fhir/R4/DocumentReference/701ee895-8440-4f1b-8cda-3d5308f2f5a6 | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · canonical-P5 | w6Discharge | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · canonical-P5 | w6Discharge | /medplum/fhir/R4/Encounter/4f941020-8186-4d48-a001-cca7e7d77896 | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · canonical-P5 | w6Discharge | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · P3 | home | Collapse section | home.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | home | Ward: shift worklist and MAR | home.toolbar.ward | click / {"button":{"action":{"goto":{"screen":"w4Worklist"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | home | Search chart | home.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | home | Problem list | home.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | home | Results | home.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | home | Notes | home.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | home | Medications | home.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | home | Allergies | home.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | home | Encounters | home.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | home | Coverage | home.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | home | Clinic visit: start rooming | home.work.w1Rooming | click / {"button":{"action":{"goto":{"screen":"w1Rooming"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | home | In-basket: results | home.work.w2Inbasket | click / {"button":{"action":{"goto":{"screen":"w2Inbasket"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | home | In-basket: refill requests | home.work.w7Queue | click / {"button":{"action":{"goto":{"screen":"w7Queue"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | home | Emergency department: track board | home.work.w3TrackBoard | click / {"button":{"action":{"goto":{"screen":"w3TrackBoard"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | home | Pediatric clinic: start rooming | home.work.w5Rooming | click / {"button":{"action":{"goto":{"screen":"w5Rooming"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | home | Surgery: ED consult | home.work.w6Consult | click / {"button":{"action":{"goto":{"screen":"w6Consult"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | home | Surgery: pre-op | home.work.w6PreOp | click / {"button":{"action":{"goto":{"screen":"w6PreOp"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | home | Surgery: op note | home.work.w6OpNote | click / {"button":{"action":{"goto":{"screen":"w6OpNote"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | home | Surgery: post-op orders | home.work.w6PostOp | click / {"button":{"action":{"goto":{"screen":"w6PostOp"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | home | Surgery: rounding | home.work.w6Rounding | click / {"button":{"action":{"goto":{"screen":"w6Rounding"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | home | Surgery: discharge | home.work.w6Discharge | click / {"button":{"action":{"goto":{"screen":"w6Discharge"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Worklist | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w4Worklist | MAR | w4Worklist.nav.w4Mar | click / {"button":{"action":{"goto":{"screen":"w4Mar"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Worklist | Flowsheet | w4Worklist.nav.w4Flowsheet | click / {"button":{"action":{"goto":{"screen":"w4Flowsheet"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Worklist | Handoff | w4Worklist.nav.w4Handoff | click / {"button":{"action":{"goto":{"screen":"w4Handoff"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Worklist | Collapse section | w4Worklist.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Worklist | Collapse section | w4Worklist.allergyGroup | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Worklist | Mark allergies reviewed (start of shift) | w4Worklist.review.allergyList | click / {"button":{"action":{"markReviewed":{"info":"allergyList"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons · RN2 · P3 | w4Worklist | /medplum/fhir/R4/Provenance/2d74d358-78dc-4af8-876d-63755365aefc | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w4Worklist | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w4Worklist | Search chart | w4Worklist.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Worklist | Back | w4Worklist.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Worklist | Patient workspace | w4Worklist.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Worklist | New orders | w4Worklist.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Worklist | Results | w4Worklist.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Worklist | Notes | w4Worklist.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Worklist | Encounters | w4Worklist.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Rooming | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w1Rooming | Med rec | w1Rooming.nav.w1MedRec | click / {"button":{"action":{"goto":{"screen":"w1MedRec"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Rooming | HPI / ROS | w1Rooming.nav.w1Hpi | click / {"button":{"action":{"goto":{"screen":"w1Hpi"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Rooming | Exam / A&P | w1Rooming.nav.w1Exam | click / {"button":{"action":{"goto":{"screen":"w1Exam"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Rooming | Orders | w1Rooming.nav.w1Orders | click / {"button":{"action":{"goto":{"screen":"w1Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Rooming | Labs | w1Rooming.nav.w1Labs | click / {"button":{"action":{"goto":{"screen":"w1Labs"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Rooming | Visit close | w1Rooming.nav.w1Close | click / {"button":{"action":{"goto":{"screen":"w1Close"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Rooming | Collapse section | w1Rooming.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Rooming | Search chart | w1Rooming.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Rooming | Back | w1Rooming.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Rooming | Results | w1Rooming.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Rooming | Imaging | w1Rooming.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Rooming | Notes | w1Rooming.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Rooming | Encounters | w1Rooming.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Rooming | Social history | w1Rooming.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Rooming | Family history | w1Rooming.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Rooming | Care gaps | w1Rooming.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Rooming | Immunizations | w1Rooming.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Rooming | Coverage | w1Rooming.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Rooming | Collapse section | w1Rooming.vitalsGroup | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Rooming | Pain (0–10) | w1Rooming.painScore | enter / {"field":{"element":"painScore","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Rooming | Collapse section | w1Rooming.intake | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Rooming | Tobacco use | w1Rooming.tobaccoUse | enter / {"field":{"element":"tobaccoUse","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Rooming | Fall in the past year? | w1Rooming.fallRiskScreen | enter / {"field":{"element":"fallRiskScreen","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Rooming | Travel in the past 30 days? | w1Rooming.travelScreen | enter / {"field":{"element":"travelScreen","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Rooming | Advance directive discussed | w1Rooming.advanceDirectiveAsked | enter / {"field":{"element":"advanceDirectiveAsked","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Rooming | Interpreter needed? | w1Rooming.interpreterNeeded | enter / {"field":{"element":"interpreterNeeded","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Rooming | Preferred pharmacy confirmed | w1Rooming.pharmacyConfirmedRooming | enter / {"field":{"element":"pharmacyConfirmedRooming","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Rooming | Collapse section | w1Rooming.phq | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Rooming | PHQ-2 score | w1Rooming.depressionScreen | enter / {"field":{"element":"depressionScreen","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Rooming | Collapse section | w1Rooming.allergyGroup | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Rooming | Mark allergies reviewed | w1Rooming.review.allergyList | click / {"button":{"action":{"markReviewed":{"info":"allergyList"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons · RN2 · P3 | w1Rooming | /medplum/fhir/R4/Provenance/b5b654ef-2cd4-4454-8689-cc0ec738acb7 | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w1Rooming | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w2Inbasket | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w2Inbasket | Result | w2Inbasket.nav.w2Result | click / {"button":{"action":{"goto":{"screen":"w2Result"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w2Inbasket | Message patient | w2Inbasket.nav.w2Message | click / {"button":{"action":{"goto":{"screen":"w2Message"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w2Inbasket | Collapse section | w2Inbasket.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w2Inbasket | Search chart | w2Inbasket.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w2Inbasket | Back | w2Inbasket.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w2Inbasket | All results | w2Inbasket.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w2Inbasket | Notes | w2Inbasket.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w2Inbasket | Encounters | w2Inbasket.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w2Inbasket | Imaging | w2Inbasket.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w2Inbasket | Search in-basket | w2Inbasket.basketSearch | enter / {"search":{"scope":"inbasket"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w7Queue | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w7Queue | Chart review | w7Queue.nav.w7Review | click / {"button":{"action":{"goto":{"screen":"w7Review"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w7Queue | Collapse section | w7Queue.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w7Queue | Search chart | w7Queue.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w7Queue | Back | w7Queue.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w7Queue | Encounters | w7Queue.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w7Queue | Imaging | w7Queue.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w7Queue | Care gaps | w7Queue.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3TrackBoard | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w3TrackBoard | Triage | w3TrackBoard.nav.w3Triage | click / {"button":{"action":{"goto":{"screen":"w3Triage"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3TrackBoard | Provider note | w3TrackBoard.nav.w3Provider | click / {"button":{"action":{"goto":{"screen":"w3Provider"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3TrackBoard | Order sets | w3TrackBoard.nav.w3OrderSets | click / {"button":{"action":{"goto":{"screen":"w3OrderSets"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3TrackBoard | Orders | w3TrackBoard.nav.w3Orders | click / {"button":{"action":{"goto":{"screen":"w3Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3TrackBoard | Disposition | w3TrackBoard.nav.w3Disposition | click / {"button":{"action":{"goto":{"screen":"w3Disposition"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3TrackBoard | Collapse section | w3TrackBoard.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3TrackBoard | Search chart | w3TrackBoard.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3TrackBoard | Back | w3TrackBoard.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3TrackBoard | Results | w3TrackBoard.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3TrackBoard | Imaging | w3TrackBoard.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3TrackBoard | Notes | w3TrackBoard.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3TrackBoard | Encounters | w3TrackBoard.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Rooming | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w5Rooming | Growth | w5Rooming.nav.w5Growth | click / {"button":{"action":{"goto":{"screen":"w5Growth"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Rooming | Orders | w5Rooming.nav.w5Orders | click / {"button":{"action":{"goto":{"screen":"w5Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Rooming | Immunizations | w5Rooming.nav.w5Immunizations | click / {"button":{"action":{"goto":{"screen":"w5Immunizations"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Rooming | Visit close | w5Rooming.nav.w5Close | click / {"button":{"action":{"goto":{"screen":"w5Close"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Rooming | Collapse section | w5Rooming.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Rooming | Search chart | w5Rooming.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Rooming | Back | w5Rooming.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Rooming | Growth chart | w5Rooming.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Rooming | Immunizations | w5Rooming.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Rooming | Results | w5Rooming.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Rooming | Notes | w5Rooming.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Rooming | Family history | w5Rooming.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Rooming | Care gaps | w5Rooming.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Rooming | Collapse section | w5Rooming.measures | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Rooming | Collapse section | w5Rooming.allergyGroup | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Rooming | Mark allergies reviewed | w5Rooming.review.allergyList | click / {"button":{"action":{"markReviewed":{"info":"allergyList"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons · RN2 · P3 | w5Rooming | /medplum/fhir/R4/Provenance/c06658b2-4d73-403a-a293-de7e4d73d7de | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w5Rooming | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w5Rooming | Collapse section | w5Rooming.medRec | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Rooming | Medication 1: continue / stop / modify | w5Rooming.decision0 | enter / {"field":{"element":"medRecDecision","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Rooming | Medication 2: continue / stop / modify | w5Rooming.decision1 | enter / {"field":{"element":"medRecDecision","slot":{"fixed":{"n":1}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Consult | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w6Consult | Consult close | w6Consult.nav.w6ConsultClose | click / {"button":{"action":{"goto":{"screen":"w6ConsultClose"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Consult | Orders | w6Consult.nav.w6Orders | click / {"button":{"action":{"goto":{"screen":"w6Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Consult | Collapse section | w6Consult.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Consult | Search chart | w6Consult.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Consult | Back | w6Consult.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Consult | Imaging | w6Consult.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Consult | Results | w6Consult.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Consult | Notes | w6Consult.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Consult | Surgical history | w6Consult.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Consult | Encounters | w6Consult.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Consult | Collapse section | w6Consult.homeMeds | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Consult | Medication 1: continue / stop / modify | w6Consult.decision0 | enter / {"field":{"element":"medRecDecision","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Consult | Medication 2: continue / stop / modify | w6Consult.decision1 | enter / {"field":{"element":"medRecDecision","slot":{"fixed":{"n":1}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6PreOp | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w6PreOp | Collapse section | w6PreOp.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6PreOp | Search chart | w6PreOp.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6PreOp | Back | w6PreOp.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6PreOp | Imaging | w6PreOp.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6PreOp | Results | w6PreOp.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6PreOp | Notes | w6PreOp.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6PreOp | Surgical history | w6PreOp.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6PreOp | Encounters | w6PreOp.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6OpNote | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w6OpNote | Collapse section | w6OpNote.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6OpNote | Search chart | w6OpNote.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6OpNote | Back | w6OpNote.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6OpNote | Imaging | w6OpNote.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6OpNote | Results | w6OpNote.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6OpNote | Notes | w6OpNote.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6OpNote | Surgical history | w6OpNote.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6OpNote | Encounters | w6OpNote.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6OpNote | Collapse section | w6OpNote.note | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6PostOp | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w6PostOp | Collapse section | w6PostOp.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6PostOp | Search chart | w6PostOp.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6PostOp | Back | w6PostOp.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6PostOp | Imaging | w6PostOp.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6PostOp | Results | w6PostOp.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6PostOp | Notes | w6PostOp.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6PostOp | Surgical history | w6PostOp.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6PostOp | Encounters | w6PostOp.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6PostOp | Collapse section | w6PostOp.care | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6PostOp | Collapse section | w6PostOp.row10 | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6PostOp | Collapse section | w6PostOp.row10.medication | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6PostOp | Collapse section | w6PostOp.row10.dispense | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6PostOp | Collapse section | w6PostOp.row10.dx | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6PostOp | Collapse section | w6PostOp.row11 | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6PostOp | Collapse section | w6PostOp.row11.medication | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6PostOp | Collapse section | w6PostOp.row11.dispense | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6PostOp | Collapse section | w6PostOp.row11.dx | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6PostOp | Collapse section | w6PostOp.row12 | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6PostOp | Collapse section | w6PostOp.row12.medication | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6PostOp | Collapse section | w6PostOp.row12.dispense | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6PostOp | Collapse section | w6PostOp.row12.dx | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6PostOp | Collapse section | w6PostOp.row13 | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6PostOp | Collapse section | w6PostOp.row13.medication | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6PostOp | Collapse section | w6PostOp.row13.dispense | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6PostOp | Collapse section | w6PostOp.row13.dx | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6PostOp | Review and sign | w6PostOp.toSign | click / {"button":{"action":{"goto":{"screen":"w6Sign"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Rounding | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w6Rounding | Collapse section | w6Rounding.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Rounding | Search chart | w6Rounding.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Rounding | Back | w6Rounding.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Rounding | Imaging | w6Rounding.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Rounding | Results | w6Rounding.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Rounding | Notes | w6Rounding.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Rounding | Surgical history | w6Rounding.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Rounding | Encounters | w6Rounding.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Discharge | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w6Discharge | Collapse section | w6Discharge.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Discharge | Search chart | w6Discharge.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Discharge | Back | w6Discharge.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Discharge | Imaging | w6Discharge.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Discharge | Results | w6Discharge.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Discharge | Notes | w6Discharge.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Discharge | Surgical history | w6Discharge.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Discharge | Encounters | w6Discharge.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Discharge | Collapse section | w6Discharge.medRec | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Mar | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w4Mar | Collapse section | w4Mar.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Mar | Open due medication | w4Mar.toolbar.openDue | click / {"button":{"action":{"goto":{"screen":"w4Admin"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Mar | Search chart | w4Mar.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Mar | Back | w4Mar.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Mar | New orders | w4Mar.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Mar | Results | w4Mar.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Mar | Notes | w4Mar.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Mar | Encounters | w4Mar.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Mar | PRN history | w4Mar.marTabs | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Mar | Glucose | w4Mar.marTabs | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Mar | Coagulation labs | w4Mar.marTabs | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Flowsheet | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w4Flowsheet | Collapse section | w4Flowsheet.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Flowsheet | Collapse section | w4Flowsheet.vitalsGroup | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Flowsheet | Pain reassessment (0–10) | w4Flowsheet.painReassessment | enter / {"field":{"element":"painReassessment","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Flowsheet | Copy forward last assessment | w4Flowsheet.copyAssessment | click / {"macro":{"id":"w4CopyAssessment"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Flowsheet | File assessment | w4Flowsheet.commit.chartAssessment | click / {"button":{"action":{"commit":{"commit":"chartAssessment"}}}} / lean | disabled-with-reason | entry required: BP systolic (mmHg) |
| /?audit=buttons · RN2 · P3 | w4Flowsheet | Search chart | w4Flowsheet.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Flowsheet | Back | w4Flowsheet.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Flowsheet | Expand section | w4Flowsheet.optionalChart | click / {"group":{"collapsible":true,"startCollapsed":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Handoff | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w4Handoff | Collapse section | w4Handoff.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Handoff | Search chart | w4Handoff.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Handoff | Back | w4Handoff.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Handoff | New orders | w4Handoff.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Handoff | Results | w4Handoff.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Handoff | Notes | w4Handoff.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Handoff | Encounters | w4Handoff.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Handoff | SBAR template | w4Handoff.template | click / {"macro":{"id":"w4HandoffTemplate"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1MedRec | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w1MedRec | Collapse section | w1MedRec.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1MedRec | Search chart | w1MedRec.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1MedRec | Back | w1MedRec.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1MedRec | Results | w1MedRec.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1MedRec | Imaging | w1MedRec.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1MedRec | Notes | w1MedRec.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1MedRec | Encounters | w1MedRec.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1MedRec | Social history | w1MedRec.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1MedRec | Family history | w1MedRec.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1MedRec | Care gaps | w1MedRec.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1MedRec | Immunizations | w1MedRec.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1MedRec | Coverage | w1MedRec.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1MedRec | Mark medications reviewed | w1MedRec.review.currentMeds | click / {"button":{"action":{"markReviewed":{"info":"currentMeds"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons · RN2 · P3 | w1MedRec | /medplum/fhir/R4/Provenance/5273e974-a70d-4294-80f8-8357f43ae107 | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w1MedRec | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w1MedRec | Collapse section | w1MedRec.rows | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1MedRec | Medication 1: continue / stop / modify | w1MedRec.decision0 | enter / {"field":{"element":"medRecDecision","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1MedRec | Medication 2: continue / stop / modify | w1MedRec.decision1 | enter / {"field":{"element":"medRecDecision","slot":{"fixed":{"n":1}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1MedRec | Medication 3: continue / stop / modify | w1MedRec.decision2 | enter / {"field":{"element":"medRecDecision","slot":{"fixed":{"n":2}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1MedRec | Medication 4: continue / stop / modify | w1MedRec.decision3 | enter / {"field":{"element":"medRecDecision","slot":{"fixed":{"n":3}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1MedRec | Last plan | w1MedRec.medTabs | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1MedRec | Fill history | w1MedRec.medTabs | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Hpi | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w1Hpi | Collapse section | w1Hpi.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Hpi | Search chart | w1Hpi.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Hpi | Back | w1Hpi.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Hpi | Results | w1Hpi.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Hpi | Imaging | w1Hpi.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Hpi | Notes | w1Hpi.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Hpi | Encounters | w1Hpi.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Hpi | Social history | w1Hpi.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Hpi | Family history | w1Hpi.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Hpi | Care gaps | w1Hpi.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Hpi | Immunizations | w1Hpi.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Hpi | Coverage | w1Hpi.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Hpi | Expand section | w1Hpi.lastNote | click / {"group":{"collapsible":true,"startCollapsed":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Exam | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w1Exam | Collapse section | w1Exam.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Exam | Search chart | w1Exam.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Exam | Back | w1Exam.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Exam | Results | w1Exam.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Exam | Imaging | w1Exam.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Exam | Notes | w1Exam.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Exam | Encounters | w1Exam.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Exam | Social history | w1Exam.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Exam | Family history | w1Exam.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Exam | Care gaps | w1Exam.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Exam | Immunizations | w1Exam.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Exam | Coverage | w1Exam.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Orders | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w1Orders | Collapse section | w1Orders.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Orders | Search chart | w1Orders.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Orders | Back | w1Orders.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Orders | Results | w1Orders.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Orders | Imaging | w1Orders.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Orders | Notes | w1Orders.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Orders | Encounters | w1Orders.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Orders | Social history | w1Orders.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Orders | Family history | w1Orders.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Orders | Care gaps | w1Orders.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Orders | Immunizations | w1Orders.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Orders | Coverage | w1Orders.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Orders | Search medications | w1Orders.orderSearch | enter / {"search":{"scope":"formulary"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Orders | Collapse section | w1Orders.prefList | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Orders | Collapse section | w1Orders.dosing | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Orders | Collapse section | w1Orders.medication | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Orders | Collapse section | w1Orders.dispense | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Orders | Collapse section | w1Orders.dx | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Orders | Collapse section | w1Orders.controlled | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Orders | Expand section | w1Orders.more | click / {"group":{"collapsible":true,"startCollapsed":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Orders | Current meds | w1Orders.orderInfo | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Orders | CURES report | w1Orders.orderInfo | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Orders | Recent labs | w1Orders.orderInfo | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Orders | Accept and add another order | w1Orders.newLine | click / {"button":{"action":"newOrderLine"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Orders | Review and sign | w1Orders.toSign | click / {"button":{"action":{"goto":{"screen":"w1Verify"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Labs | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w1Labs | Collapse section | w1Labs.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Labs | Search chart | w1Labs.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Labs | Back | w1Labs.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Labs | Results | w1Labs.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Labs | Imaging | w1Labs.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Labs | Notes | w1Labs.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Labs | Encounters | w1Labs.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Labs | Social history | w1Labs.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Labs | Family history | w1Labs.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Labs | Care gaps | w1Labs.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Labs | Immunizations | w1Labs.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Labs | Coverage | w1Labs.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Labs | Search lab tests | w1Labs.labSearch | enter / {"search":{"scope":"loinc"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Labs | Collapse section | w1Labs.labOrder | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Close | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w1Close | Collapse section | w1Close.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Close | Search chart | w1Close.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Close | Back | w1Close.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Close | Results | w1Close.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Close | Imaging | w1Close.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Close | Notes | w1Close.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Close | Encounters | w1Close.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Close | Social history | w1Close.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Close | Family history | w1Close.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Close | Care gaps | w1Close.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Close | Immunizations | w1Close.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Close | Coverage | w1Close.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Close | Instructions template | w1Close.avsTemplate | click / {"macro":{"id":"w1AvsTemplate"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w2Result | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w2Result | Collapse section | w2Result.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w2Result | Search chart | w2Result.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w2Result | Back | w2Result.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w2Result | All results | w2Result.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w2Result | Notes | w2Result.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w2Result | Encounters | w2Result.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w2Result | Imaging | w2Result.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w2Message | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w2Message | Collapse section | w2Message.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w2Message | Search chart | w2Message.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w2Message | Back | w2Message.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w2Message | All results | w2Message.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w2Message | Notes | w2Message.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w2Message | Encounters | w2Message.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w2Message | Imaging | w2Message.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w7Review | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w7Review | Collapse section | w7Review.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w7Review | Search chart | w7Review.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w7Review | Back | w7Review.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w7Review | Encounters | w7Review.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w7Review | Imaging | w7Review.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w7Review | Care gaps | w7Review.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w7Review | Last visit | w7Review.refillTabs | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w7Review | Labs | w7Review.refillTabs | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w7Review | Fill history | w7Review.refillTabs | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w7Review | Medications | w7Review.refillTabs | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w7Review | Last note | w7Review.refillTabs | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w7Review | Mark last visit reviewed | w7Review.review.lastVisit | click / {"button":{"action":{"markReviewed":{"info":"lastVisit"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons · RN2 · P3 | w7Review | /medplum/fhir/R4/Provenance/38c42652-1359-4d40-97ea-b229249f3141 | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w7Review | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w7Review | Go to decision | w7Review.decide | click / {"button":{"action":{"goto":{"screen":"w7Decision"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Triage | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w3Triage | Collapse section | w3Triage.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Triage | Search chart | w3Triage.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Triage | Back | w3Triage.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Triage | Results | w3Triage.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Triage | Imaging | w3Triage.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Triage | Notes | w3Triage.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Triage | Encounters | w3Triage.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Triage | Collapse section | w3Triage.vitalsGroup | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Triage | Pain (0–10) | w3Triage.painScore | enter / {"field":{"element":"painScore","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Triage | Acuity (ESI) | w3Triage.triageAcuity | enter / {"field":{"element":"triageAcuity","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Triage | Arrival mode | w3Triage.arrivalMode | enter / {"field":{"element":"arrivalMode","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Triage | Isolation screen | w3Triage.isolationScreen | enter / {"field":{"element":"isolationScreen","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Triage | Collapse section | w3Triage.allergyGroup | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Triage | Mark allergies reviewed | w3Triage.review.allergyList | click / {"button":{"action":{"markReviewed":{"info":"allergyList"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons · RN2 · P3 | w3Triage | /medplum/fhir/R4/Provenance/6663d79e-0cb2-4003-ac24-9aa661b6f897 | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w3Triage | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w3Provider | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w3Provider | Collapse section | w3Provider.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Provider | Search chart | w3Provider.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Provider | Back | w3Provider.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Provider | Results | w3Provider.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Provider | Imaging | w3Provider.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Provider | Notes | w3Provider.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Provider | Encounters | w3Provider.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3OrderSets | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w3OrderSets | Collapse section | w3OrderSets.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3OrderSets | Search chart | w3OrderSets.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3OrderSets | Back | w3OrderSets.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3OrderSets | Results | w3OrderSets.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3OrderSets | Imaging | w3OrderSets.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3OrderSets | Notes | w3OrderSets.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3OrderSets | Encounters | w3OrderSets.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3OrderSets | Collapse section | w3OrderSets.sets | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3OrderSets | Collapse section | w3OrderSets.row10 | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3OrderSets | Collapse section | w3OrderSets.row10.medication | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3OrderSets | Collapse section | w3OrderSets.row10.dispense | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3OrderSets | Collapse section | w3OrderSets.row10.dx | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3OrderSets | Collapse section | w3OrderSets.row11 | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3OrderSets | Collapse section | w3OrderSets.row11.medication | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3OrderSets | Collapse section | w3OrderSets.row11.dispense | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3OrderSets | Collapse section | w3OrderSets.row11.dx | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3OrderSets | Review and sign | w3OrderSets.toSign | click / {"button":{"action":{"goto":{"screen":"w3Sign"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Orders | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w3Orders | Collapse section | w3Orders.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Orders | Search chart | w3Orders.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Orders | Back | w3Orders.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Orders | Results | w3Orders.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Orders | Imaging | w3Orders.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Orders | Notes | w3Orders.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Orders | Encounters | w3Orders.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Orders | Search medications | w3Orders.orderSearch | enter / {"search":{"scope":"formulary"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Orders | Collapse section | w3Orders.prefList | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Orders | Collapse section | w3Orders.dosing | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Orders | Collapse section | w3Orders.medication | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Orders | Collapse section | w3Orders.dispense | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Orders | Collapse section | w3Orders.dx | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Orders | Expand section | w3Orders.more | click / {"group":{"collapsible":true,"startCollapsed":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Orders | Current meds | w3Orders.orderInfo | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Orders | CURES report | w3Orders.orderInfo | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Orders | Recent labs | w3Orders.orderInfo | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Orders | Accept and add another order | w3Orders.newLine | click / {"button":{"action":"newOrderLine"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Disposition | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w3Disposition | Collapse section | w3Disposition.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Disposition | Search chart | w3Disposition.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Disposition | Back | w3Disposition.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Disposition | Results | w3Disposition.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Disposition | Imaging | w3Disposition.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Disposition | Notes | w3Disposition.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Disposition | Encounters | w3Disposition.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Disposition | Collapse section | w3Disposition.admitGroup | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Disposition | Expand section | w3Disposition.dischargeGroup | click / {"group":{"collapsible":true,"startCollapsed":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Growth | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w5Growth | Collapse section | w5Growth.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Growth | Search chart | w5Growth.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Growth | Back | w5Growth.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Growth | Growth chart | w5Growth.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Growth | Immunizations | w5Growth.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Growth | Results | w5Growth.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Growth | Notes | w5Growth.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Growth | Family history | w5Growth.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Growth | Care gaps | w5Growth.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Orders | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w5Orders | Collapse section | w5Orders.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Orders | Search chart | w5Orders.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Orders | Back | w5Orders.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Orders | Growth chart | w5Orders.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Orders | Immunizations | w5Orders.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Orders | Results | w5Orders.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Orders | Notes | w5Orders.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Orders | Family history | w5Orders.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Orders | Care gaps | w5Orders.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Orders | Search medications | w5Orders.orderSearch | enter / {"search":{"scope":"formulary"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Orders | Collapse section | w5Orders.prefList | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Orders | Collapse section | w5Orders.dosing | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Orders | Collapse section | w5Orders.medication | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Orders | Collapse section | w5Orders.dispense | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Orders | Collapse section | w5Orders.dx | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Orders | Collapse section | w5Orders.controlled | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Orders | Expand section | w5Orders.more | click / {"group":{"collapsible":true,"startCollapsed":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Orders | Current meds | w5Orders.orderInfo | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Orders | CURES report | w5Orders.orderInfo | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Orders | Recent labs | w5Orders.orderInfo | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Orders | Accept and add another order | w5Orders.newLine | click / {"button":{"action":"newOrderLine"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Orders | Review and sign | w5Orders.toSign | click / {"button":{"action":{"goto":{"screen":"w5Sign"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Immunizations | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w5Immunizations | Collapse section | w5Immunizations.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Immunizations | Search chart | w5Immunizations.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Immunizations | Back | w5Immunizations.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Immunizations | Growth chart | w5Immunizations.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Immunizations | Immunizations | w5Immunizations.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Immunizations | Results | w5Immunizations.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Immunizations | Notes | w5Immunizations.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Immunizations | Family history | w5Immunizations.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Immunizations | Care gaps | w5Immunizations.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Immunizations | Influenza vaccine (from inventory) | w5Immunizations.fluVaccine | click / {"macro":{"id":"w5FluVaccine"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Immunizations | Collapse section | w5Immunizations.record | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Immunizations | Vaccine | w5Immunizations.vaccine | enter / {"field":{"element":"vaccine","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Immunizations | Site | w5Immunizations.vaccineSite | enter / {"field":{"element":"vaccineSite","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Immunizations | Route | w5Immunizations.vaccineRoute | enter / {"field":{"element":"vaccineRoute","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Immunizations | VIS given before vaccination | w5Immunizations.visGiven | enter / {"field":{"element":"visGiven","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Immunizations | Record immunization | w5Immunizations.commit.recordImmunization | click / {"button":{"action":{"commit":{"commit":"recordImmunization"}}}} / lean | disabled-with-reason | entry required: Vaccine |
| /?audit=buttons · RN2 · P3 | w5Close | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w5Close | Collapse section | w5Close.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Close | Search chart | w5Close.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Close | Back | w5Close.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Close | Growth chart | w5Close.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Close | Immunizations | w5Close.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Close | Results | w5Close.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Close | Notes | w5Close.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Close | Family history | w5Close.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w5Close | Care gaps | w5Close.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6ConsultClose | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w6ConsultClose | Collapse section | w6ConsultClose.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6ConsultClose | Search chart | w6ConsultClose.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6ConsultClose | Back | w6ConsultClose.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6ConsultClose | Imaging | w6ConsultClose.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6ConsultClose | Results | w6ConsultClose.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6ConsultClose | Notes | w6ConsultClose.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6ConsultClose | Surgical history | w6ConsultClose.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6ConsultClose | Encounters | w6ConsultClose.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Orders | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w6Orders | Collapse section | w6Orders.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Orders | Search chart | w6Orders.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Orders | Back | w6Orders.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Orders | Imaging | w6Orders.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Orders | Results | w6Orders.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Orders | Notes | w6Orders.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Orders | Surgical history | w6Orders.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Orders | Encounters | w6Orders.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Orders | Search medications | w6Orders.orderSearch | enter / {"search":{"scope":"formulary"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Orders | Collapse section | w6Orders.prefList | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Orders | Collapse section | w6Orders.dosing | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Orders | Collapse section | w6Orders.medication | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Orders | Collapse section | w6Orders.dispense | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Orders | Collapse section | w6Orders.dx | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Orders | Expand section | w6Orders.more | click / {"group":{"collapsible":true,"startCollapsed":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Orders | Current meds | w6Orders.orderInfo | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Orders | CURES report | w6Orders.orderInfo | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Orders | Recent labs | w6Orders.orderInfo | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Orders | Accept and add another order | w6Orders.newLine | click / {"button":{"action":"newOrderLine"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Sign | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w6Sign | Collapse section | w6Sign.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Sign | Search chart | w6Sign.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Sign | Back | w6Sign.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Sign | Imaging | w6Sign.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Sign | Results | w6Sign.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Sign | Notes | w6Sign.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Sign | Surgical history | w6Sign.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Sign | Encounters | w6Sign.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Sign | Collapse section | w6Sign.weights | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w6Sign | Collapse section | w6Sign.controlled | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Admin | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w4Admin | Collapse section | w4Admin.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Admin | Collapse section | w4Admin.fiveRights | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Admin | Pain score before dose (0–10) | w4Admin.painScore | enter / {"field":{"element":"painScore","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Admin | Collapse section | w4Admin.documentation | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Admin | Given / held / refused | w4Admin.adminStatus | enter / {"field":{"element":"adminStatus","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Admin | Reason / comment | w4Admin.adminReason | enter / {"field":{"element":"adminReason","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Admin | Site | w4Admin.adminSite | enter / {"field":{"element":"adminSite","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Admin | Document held: NPO | w4Admin.heldNpo | click / {"macro":{"id":"w4HeldNpo"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Admin | Administer | w4Admin.commit.administerMed | click / {"button":{"action":{"commit":{"commit":"administerMed"}}}} / lean | disabled-with-reason | entry required: Scan patient wristband |
| /?audit=buttons · RN2 · P3 | w4Admin | Search chart | w4Admin.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Admin | Back | w4Admin.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Admin | Expand section | w4Admin.optionalChart | click / {"group":{"collapsible":true,"startCollapsed":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Flowsheet | Confirm prefilled value | w4Flowsheet.nursingAssessment | confirm / {"field":{"element":"nursingAssessment","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Flowsheet | New orders | w4Flowsheet.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Flowsheet | Results | w4Flowsheet.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Flowsheet | Notes | w4Flowsheet.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Flowsheet | Encounters | w4Flowsheet.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Handoff | Confirm prefilled value | w4Handoff.handoffSituation | confirm / {"field":{"element":"handoffSituation","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Handoff | Confirm prefilled value | w4Handoff.handoffBackground | confirm / {"field":{"element":"handoffBackground","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Handoff | Confirm prefilled value | w4Handoff.handoffAssessment | confirm / {"field":{"element":"handoffAssessment","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w4Handoff | Confirm prefilled value | w4Handoff.handoffRecommendation | confirm / {"field":{"element":"handoffRecommendation","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Orders | Mark CURES report reviewed | w1Orders.review.curesReport | click / {"button":{"action":{"markReviewed":{"info":"curesReport"}}}} / lean | works | DOM changed; validation drawer: No versioned source record for review: curesReport Your inputs are retained. Close this panel, correct the issue, and retry the action. |
| /?audit=buttons · RN2 · P3 | w1Verify | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w1Verify | Collapse section | w1Verify.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Verify | Search chart | w1Verify.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Verify | Back | w1Verify.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Verify | Results | w1Verify.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Verify | Imaging | w1Verify.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Verify | Notes | w1Verify.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Verify | Encounters | w1Verify.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Verify | Social history | w1Verify.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Verify | Family history | w1Verify.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Verify | Care gaps | w1Verify.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Verify | Immunizations | w1Verify.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Verify | Coverage | w1Verify.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Verify | Continue to sign | w1Verify.continue | click / {"button":{"action":{"goto":{"screen":"w1Sign"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w1Close | Confirm prefilled value | w1Close.patientInstructions | confirm / {"field":{"element":"patientInstructions","slot":{"fixed":{"n":0}},"prefill":"none"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w7Review | Mark fill history reviewed | w7Review.review.adherence | click / {"button":{"action":{"markReviewed":{"info":"adherence"}}}} / lean | works | DOM changed; validation drawer: No versioned source record for review: adherence Your inputs are retained. Close this panel, correct the issue, and retry the action. |
| /?audit=buttons · RN2 · P3 | w7Decision | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w7Decision | Collapse section | w7Decision.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w7Decision | Search chart | w7Decision.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w7Decision | Back | w7Decision.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w7Decision | Encounters | w7Decision.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w7Decision | Imaging | w7Decision.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w7Decision | Care gaps | w7Decision.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w7Decision | Collapse section | w7Decision.decisionGroup | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Sign | Navigator | — | button / lean | works | DOM changed |
| /?audit=buttons · RN2 · P3 | w3Sign | Collapse section | w3Sign.sidebar | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Sign | Search chart | w3Sign.chartSearch | enter / {"search":{"scope":"chart"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Sign | Back | w3Sign.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Sign | Results | w3Sign.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Sign | Imaging | w3Sign.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Sign | Notes | w3Sign.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Sign | Encounters | w3Sign.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Sign | Collapse section | w3Sign.controlled | click / {"group":{"collapsible":true,"startCollapsed":false}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · RN2 · P3 | w3Orders | Mark CURES report reviewed | w3Orders.review.curesReport | click / {"button":{"action":{"markReviewed":{"info":"curesReport"}}}} / lean | works | DOM changed; validation drawer: No versioned source record for review: curesReport Your inputs are retained. Close this panel, correct the issue, and retry the action. |
