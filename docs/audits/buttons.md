# Button audit

Generated 2026-11-01T07:13:51.981Z. Preview build; one Chromium worker.

| Scope | Works | Disabled with reason | Dead | Error |
|---|---:|---:|---:|---:|
| App baseline | 684 | 4 | 103 | 0 |
| App final | 1970 | 292 | 0 | 0 |
| Lean final | 606 | 7 | 209 | 0 |

App coverage includes additional worklist and drawer controls after the baseline. A complete pre-fix Lean census was not retained; see README.md.

Each enabled control is clicked from an observed checkpoint. A changed input echo alone does not certify a Lean search. Selected navigation and reset controls must provide feedback or a disabled reason. Disabled commits are recorded with Lean's actual reason; the audit never fabricates safety evidence to enable a write.

| Route / persona / program | Screen | Label | Comp id | Kind / owner | Status | Observed effect |
|---|---|---|---|---|---|---|
| /?audit=buttons · P1 · — | sign-in | P1 · Primary care | — | button / app | works | POST /__dev/persona-password; POST /medplum/auth/login |
| /?audit=buttons · P1 · — | worklist | Worklist date | — | input / app | works | DOM changed |
| /?audit=buttons · P1 · — | worklist | Refresh worklist | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · — | worklist | Open patient | — | button / app | works | DOM changed |
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
| /?audit=buttons · P2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P2 · — | worklist | Open patient | — | button / app | works | DOM changed |
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
| /?audit=buttons · P3 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Search Medplum | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | worklist | Dorthea Abshire · 1973-05-02 | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | encounter picker | Live encounter | — | select / app | works | DOM changed |
| /?audit=buttons · P3 · — | encounter picker | Start new encounter | — | button / app | works | POST /medplum/fhir/R4 |
| /?audit=buttons · P3 · — | encounter picker | Open EHR | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | live encounter header | Live encounter | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | live encounter header | Close live encounter | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | live encounter header | Back to worklist / refresh chart | — | button / app | works | DOM changed |
| /?audit=buttons · P3 · — | live encounter header | Sign out | — | button / app | works | POST /medplum/oauth2/logout |
| /?audit=buttons · P4 · — | sign-in | P4 · Pediatric NP | — | button / app | works | POST /__dev/persona-password; POST /medplum/auth/login; POST /medplum/oauth2/token |
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
| /?audit=buttons · P5 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · P5 · — | worklist | Open patient | — | button / app | works | DOM changed |
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
| /?audit=buttons · RN2 · — | sign-in | RN2 · Second nurse | — | button / app | works | POST /__dev/persona-password; POST /medplum/auth/login; POST /medplum/oauth2/token |
| /?audit=buttons · RN2 · — | worklist | Worklist date | — | input / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Refresh worklist | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Open MAR patient | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Search Medplum | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | worklist | Dorthea Abshire · 1973-05-02 | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | encounter picker | Live encounter | — | select / app | works | DOM changed |
| /?audit=buttons · RN2 · — | encounter picker | Start new encounter | — | button / app | works | POST /medplum/fhir/R4 |
| /?audit=buttons · RN2 · — | encounter picker | Open EHR | — | button / app | works | Lean state changed; result null |
| /?audit=buttons · RN2 · — | live encounter header | Live encounter | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | live encounter header | Close live encounter | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | live encounter header | Back to worklist / refresh chart | — | button / app | works | DOM changed |
| /?audit=buttons · RN2 · — | live encounter header | Sign out | — | button / app | works | POST /medplum/oauth2/logout |
| /?audit=buttons · baseline · — | sign-in | Original canonical EHR (baseline) | — | button / app | works | POST /__dev/persona-password; POST /medplum/auth/login; POST /medplum/oauth2/token |
| /?audit=buttons · baseline · — | worklist | Worklist date | — | input / app | works | DOM changed |
| /?audit=buttons · baseline · — | worklist | Refresh worklist | — | button / app | works | DOM changed |
| /?audit=buttons · baseline · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · baseline · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · baseline · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · baseline · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · baseline · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · baseline · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · baseline · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · baseline · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · baseline · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · baseline · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · baseline · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · baseline · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · baseline · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · baseline · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · baseline · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · baseline · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · baseline · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · baseline · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · baseline · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · baseline · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · baseline · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · baseline · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · baseline · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · baseline · — | worklist | Open patient | — | button / app | works | DOM changed |
| /?audit=buttons · baseline · — | worklist | Search Medplum | — | button / app | works | DOM changed |
| /?audit=buttons · baseline · — | worklist | Dorthea Abshire · 1973-05-02 | — | button / app | works | DOM changed |
| /?audit=buttons · baseline · — | encounter picker | Live encounter | — | select / app | works | DOM changed |
| /?audit=buttons · baseline · — | encounter picker | Start new encounter | — | button / app | works | POST /medplum/fhir/R4 |
| /?audit=buttons · baseline · — | encounter picker | Open EHR | — | button / app | works | DOM changed |
| /?audit=buttons · baseline · — | live encounter header | Live encounter | — | button / app | works | DOM changed |
| /?audit=buttons · baseline · — | live encounter header | Close live encounter | — | button / app | works | DOM changed |
| /?audit=buttons · baseline · — | live encounter header | Back to worklist / refresh chart | — | button / app | works | DOM changed |
| /?audit=buttons · baseline · — | live encounter header | Sign out | — | button / app | works | POST /medplum/oauth2/logout |
| /browse · — · — | program browser | Recorded dashboard | — | a / app | works | URL → /dashboard |
| /browse · — · — | program browser | Search by name | — | input / app | works | DOM changed |
| /browse · — · — | program browser | Patient source | — | select / app | works | DOM changed |
| /browse · — · — | program browser | pediatric | — | input / app | works | DOM changed |
| /browse · — · — | program browser | allergic | — | input / app | works | DOM changed |
| /browse · — · — | program browser | anticoagulated | — | input / app | works | DOM changed |
| /browse · — · — | program browser | surgical | — | input / app | works | DOM changed |
| /browse · — · — | program browser | Patient | — | select / app | works | DOM changed |
| /browse · — · — | program browser | Acting persona | — | select / app | works | DOM changed |
| /browse · — · — | program browser | Current program source | — | select / app | works | DOM changed |
| /browse · — · — | program browser | Open P1’s current program → | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | Canonical source | — | a / app | works | URL → /ehr?mode=replay&release=v1.1&program=releases%2Fv1.1%2Fcanonical.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P1 projection | — | a / app | works | URL → /ehr?mode=replay&release=v1.1&program=releases%2Fv1.1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P2 projection | — | a / app | works | URL → /ehr?mode=replay&release=v1.1&program=releases%2Fv1.1%2Fpersonas%2FP2.json&persona=P2&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P3 projection | — | a / app | works | URL → /ehr?mode=replay&release=v1.1&program=releases%2Fv1.1%2Fpersonas%2FP3.json&persona=P3&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P4 projection | — | a / app | works | URL → /ehr?mode=replay&release=v1.1&program=releases%2Fv1.1%2Fpersonas%2FP4.json&persona=P4&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P5 projection | — | a / app | works | URL → /ehr?mode=replay&release=v1.1&program=releases%2Fv1.1%2Fpersonas%2FP5.json&persona=P5&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | Canonical source | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fcanonical.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P1 projection | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P2 projection | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP2.json&persona=P2&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P3 projection | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP3.json&persona=P3&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P4 projection | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP4.json&persona=P4&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P5 projection | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP5.json&persona=P5&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | Canonical source | — | a / app | works | URL → /ehr?mode=replay&release=v2&program=releases%2Fv2%2Fcanonical.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P1 projection | — | a / app | works | URL → /ehr?mode=replay&release=v2&program=releases%2Fv2%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P2 projection | — | a / app | works | URL → /ehr?mode=replay&release=v2&program=releases%2Fv2%2Fpersonas%2FP2.json&persona=P2&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P3 projection | — | a / app | works | URL → /ehr?mode=replay&release=v2&program=releases%2Fv2%2Fpersonas%2FP3.json&persona=P3&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P4 projection | — | a / app | works | URL → /ehr?mode=replay&release=v2&program=releases%2Fv2%2Fpersonas%2FP4.json&persona=P4&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P5 projection | — | a / app | works | URL → /ehr?mode=replay&release=v2&program=releases%2Fv2%2Fpersonas%2FP5.json&persona=P5&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | 01 · Allergies hidden on an unopened signing tab | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=programs%2Fbad%2F01-hidden-allergies.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | 02 · Human-only identity prefilled from chart | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=programs%2Fbad%2F02-prefilled-identity.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | 03 · Pounds used as dosing weight | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=programs%2Fbad%2F03-pounds-as-weight.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | 04 · Macro attempts alert override and signing | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=programs%2Fbad%2F04-macro-override.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | 05 · Nurse cosigns their own administration | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=programs%2Fbad%2F05-self-cosign.json&persona=P3&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | 06 · Yesterday’s weight copied as today’s | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=programs%2Fbad%2F06-stale-weight.json&persona=P4&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | 07 · Refill decision unreachable | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=programs%2Fbad%2F07-unreachable-refill.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | 08 · Macro forges consent; anticoagulants removed | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=programs%2Fbad%2F08-forged-consent.json&persona=P5&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | 09 · Allergy warning removed | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=programs%2Fbad%2F09-hidden-allergy-alert.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | 10 · Undeclared alert invented | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=programs%2Fbad%2F10-invented-alert.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | 11 · Interaction popup repeated | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=programs%2Fbad%2F11-repeated-interaction.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | 12 · Passive reminder requests popup | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=programs%2Fbad%2F12-passive-popup.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | 13 · CURES review and exemption paths removed | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=programs%2Fbad%2F13-no-cures.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | 14 · Macro claims human naloxone offer | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=programs%2Fbad%2F14-macro-naloxone.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | 15 · Controlled prescription details hidden | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=programs%2Fbad%2F15-hidden-controlled-details.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | 16 · Schedule II refills defaulted to three | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=programs%2Fbad%2F16-schedule-ii-refills.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | 17 · programs/bad/17-no-restraint-care-plan.json | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=programs%2Fbad%2F17-no-restraint-care-plan.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | 18 · programs/bad/18-no-op-technique.json | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=programs%2Fbad%2F18-no-op-technique.json&persona=P5&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | 19 · programs/bad/19-no-vaccine-provider-address.json | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=programs%2Fbad%2F19-no-vaccine-provider-address.json&persona=P4&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | 20 · programs/bad/20-no-administration-time.json | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=programs%2Fbad%2F20-no-administration-time.json&persona=P3&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | 21 · programs/bad/21-no-controlled-strength.json | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=programs%2Fbad%2F21-no-controlled-strength.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | 22 · programs/bad/22-hidden-signing-notice.json | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=programs%2Fbad%2F22-hidden-signing-notice.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | 23 · programs/bad/23-no-telehealth-consent.json | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=programs%2Fbad%2F23-no-telehealth-consent.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | 24 · programs/bad/24-default-refill-eligibility.json | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=programs%2Fbad%2F24-default-refill-eligibility.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | 25 · programs/bad/25-restart-restraint-clock.json | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=programs%2Fbad%2F25-restart-restraint-clock.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | 26 · programs/bad/26-stale-preoperative-hp.json | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=programs%2Fbad%2F26-stale-preoperative-hp.json&persona=P5&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | 27 · programs/bad/27-expired-controlled-fill.json | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=programs%2Fbad%2F27-expired-controlled-fill.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | 28 · programs/bad/28-underage-minor-consent.json | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=programs%2Fbad%2F28-underage-minor-consent.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | 29 · programs/bad/29-invalid-birth-date.json | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=programs%2Fbad%2F29-invalid-birth-date.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | 30 · programs/bad/30-daily-methotrexate-default.json | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=programs%2Fbad%2F30-daily-methotrexate-default.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | 31 · programs/bad/31-hidden-result-components.json | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=programs%2Fbad%2F31-hidden-result-components.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | 32 · programs/bad/32-misleading-signing-label.json | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=programs%2Fbad%2F32-misleading-signing-label.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | 33 · programs/bad/33-np-preop-macro.json | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=programs%2Fbad%2F33-np-preop-macro.json&persona=P4&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | 34 · programs/bad/34-prefilled-attending.json | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=programs%2Fbad%2F34-prefilled-attending.json&persona=P4&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | Canonical source | — | a / app | works | URL → /ehr?mode=replay&release=v1.1&program=programs%2Fbenchmarks%2Freleases%2Fv1.1%2Fcanonical.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | programs/benchmarks/releases/v1.1/personas/P1.json | — | a / app | works | URL → /ehr?mode=replay&release=v1.1&program=programs%2Fbenchmarks%2Freleases%2Fv1.1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | programs/benchmarks/releases/v1.1/personas/P2.json | — | a / app | works | URL → /ehr?mode=replay&release=v1.1&program=programs%2Fbenchmarks%2Freleases%2Fv1.1%2Fpersonas%2FP2.json&persona=P2&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | programs/benchmarks/releases/v1.1/personas/P3.json | — | a / app | works | URL → /ehr?mode=replay&release=v1.1&program=programs%2Fbenchmarks%2Freleases%2Fv1.1%2Fpersonas%2FP3.json&persona=P3&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | programs/benchmarks/releases/v1.1/personas/P4.json | — | a / app | works | URL → /ehr?mode=replay&release=v1.1&program=programs%2Fbenchmarks%2Freleases%2Fv1.1%2Fpersonas%2FP4.json&persona=P4&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | programs/benchmarks/releases/v1.1/personas/P5.json | — | a / app | works | URL → /ehr?mode=replay&release=v1.1&program=programs%2Fbenchmarks%2Freleases%2Fv1.1%2Fpersonas%2FP5.json&persona=P5&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | Canonical source | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=programs%2Fbenchmarks%2Freleases%2Fv1%2Fcanonical.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | programs/benchmarks/releases/v1/personas/P1.json | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=programs%2Fbenchmarks%2Freleases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | programs/benchmarks/releases/v1/personas/P2.json | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=programs%2Fbenchmarks%2Freleases%2Fv1%2Fpersonas%2FP2.json&persona=P2&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | programs/benchmarks/releases/v1/personas/P3.json | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=programs%2Fbenchmarks%2Freleases%2Fv1%2Fpersonas%2FP3.json&persona=P3&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | programs/benchmarks/releases/v1/personas/P4.json | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=programs%2Fbenchmarks%2Freleases%2Fv1%2Fpersonas%2FP4.json&persona=P4&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | programs/benchmarks/releases/v1/personas/P5.json | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=programs%2Fbenchmarks%2Freleases%2Fv1%2Fpersonas%2FP5.json&persona=P5&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | Canonical source | — | a / app | works | URL → /ehr?mode=replay&release=v2&program=programs%2Fbenchmarks%2Freleases%2Fv2%2Fcanonical.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | programs/benchmarks/releases/v2/personas/P1.json | — | a / app | works | URL → /ehr?mode=replay&release=v2&program=programs%2Fbenchmarks%2Freleases%2Fv2%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | programs/benchmarks/releases/v2/personas/P2.json | — | a / app | works | URL → /ehr?mode=replay&release=v2&program=programs%2Fbenchmarks%2Freleases%2Fv2%2Fpersonas%2FP2.json&persona=P2&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | programs/benchmarks/releases/v2/personas/P3.json | — | a / app | works | URL → /ehr?mode=replay&release=v2&program=programs%2Fbenchmarks%2Freleases%2Fv2%2Fpersonas%2FP3.json&persona=P3&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | programs/benchmarks/releases/v2/personas/P4.json | — | a / app | works | URL → /ehr?mode=replay&release=v2&program=programs%2Fbenchmarks%2Freleases%2Fv2%2Fpersonas%2FP4.json&persona=P4&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | programs/benchmarks/releases/v2/personas/P5.json | — | a / app | works | URL → /ehr?mode=replay&release=v2&program=programs%2Fbenchmarks%2Freleases%2Fv2%2Fpersonas%2FP5.json&persona=P5&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | programs/canonical/v1.json | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=programs%2Fcanonical%2Fv1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | runs/run1-P3/P3/v0.json | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=runs%2Frun1-P3%2FP3%2Fv0.json&persona=P3&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | runs/run1-P3/P3/v1.json | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=runs%2Frun1-P3%2FP3%2Fv1.json&persona=P3&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | runs/run1-P3/P3/v2.json | — | a / app | works | URL → /ehr?mode=replay&release=v1.1&program=runs%2Frun1-P3%2FP3%2Fv2.json&persona=P3&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | runs/run1-P3/P3/v3.json | — | a / app | works | URL → /ehr?mode=replay&release=v1.1&program=runs%2Frun1-P3%2FP3%2Fv3.json&persona=P3&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | runs/run1-P3/P3/v4.json | — | a / app | works | URL → /ehr?mode=replay&release=v1.1&program=runs%2Frun1-P3%2FP3%2Fv4.json&persona=P3&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | runs/run1-P3/P3/v5.json | — | a / app | works | URL → /ehr?mode=replay&release=v2&program=runs%2Frun1-P3%2FP3%2Fv5.json&persona=P3&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | runs/run1-P3/P3/v6.json | — | a / app | works | URL → /ehr?mode=replay&release=v2&program=runs%2Frun1-P3%2FP3%2Fv6.json&persona=P3&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | runs/run1-P3/P3/v7.json | — | a / app | works | URL → /ehr?mode=replay&release=v2&program=runs%2Frun1-P3%2FP3%2Fv7.json&persona=P3&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P1 · v0 | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=runs%2Fmock%2Fprograms%2FP1%2Fv0.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P1 · v1 | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=runs%2Fmock%2Fprograms%2FP1%2Fv1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P1 · v2 | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=runs%2Fmock%2Fprograms%2FP1%2Fv2.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P1 · v3 | — | a / app | works | URL → /ehr?mode=replay&release=v1.1&program=runs%2Fmock%2Fprograms%2FP1%2Fv3.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P1 · v4 | — | a / app | works | URL → /ehr?mode=replay&release=v2&program=runs%2Fmock%2Fprograms%2FP1%2Fv4.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P1 · v5 · deployed | — | a / app | works | URL → /ehr?mode=replay&release=v2&program=runs%2Fmock%2Fprograms%2FP1%2Fv5.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P2 · v0 | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=runs%2Fmock%2Fprograms%2FP2%2Fv0.json&persona=P2&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P2 · v1 | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=runs%2Fmock%2Fprograms%2FP2%2Fv1.json&persona=P2&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P2 · v2 | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=runs%2Fmock%2Fprograms%2FP2%2Fv2.json&persona=P2&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P2 · v3 | — | a / app | works | URL → /ehr?mode=replay&release=v2&program=runs%2Fmock%2Fprograms%2FP2%2Fv3.json&persona=P2&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P2 · v4 · deployed | — | a / app | works | URL → /ehr?mode=replay&release=v2&program=runs%2Fmock%2Fprograms%2FP2%2Fv4.json&persona=P2&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P3 · v0 | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=runs%2Fmock%2Fprograms%2FP3%2Fv0.json&persona=P3&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P3 · v1 | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=runs%2Fmock%2Fprograms%2FP3%2Fv1.json&persona=P3&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P3 · v2 | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=runs%2Fmock%2Fprograms%2FP3%2Fv2.json&persona=P3&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P3 · v3 | — | a / app | works | URL → /ehr?mode=replay&release=v2&program=runs%2Fmock%2Fprograms%2FP3%2Fv3.json&persona=P3&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P3 · v4 · deployed | — | a / app | works | URL → /ehr?mode=replay&release=v2&program=runs%2Fmock%2Fprograms%2FP3%2Fv4.json&persona=P3&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P4 · v0 | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=runs%2Fmock%2Fprograms%2FP4%2Fv0.json&persona=P4&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P4 · v1 | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=runs%2Fmock%2Fprograms%2FP4%2Fv1.json&persona=P4&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P4 · v2 | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=runs%2Fmock%2Fprograms%2FP4%2Fv2.json&persona=P4&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P4 · v3 | — | a / app | works | URL → /ehr?mode=replay&release=v2&program=runs%2Fmock%2Fprograms%2FP4%2Fv3.json&persona=P4&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P4 · v4 · deployed | — | a / app | works | URL → /ehr?mode=replay&release=v2&program=runs%2Fmock%2Fprograms%2FP4%2Fv4.json&persona=P4&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P5 · v0 | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=runs%2Fmock%2Fprograms%2FP5%2Fv0.json&persona=P5&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P5 · v1 | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=runs%2Fmock%2Fprograms%2FP5%2Fv1.json&persona=P5&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P5 · v2 | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=runs%2Fmock%2Fprograms%2FP5%2Fv2.json&persona=P5&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P5 · v3 | — | a / app | works | URL → /ehr?mode=replay&release=v1.1&program=runs%2Fmock%2Fprograms%2FP5%2Fv3.json&persona=P5&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P5 · v4 | — | a / app | works | URL → /ehr?mode=replay&release=v2&program=runs%2Fmock%2Fprograms%2FP5%2Fv4.json&persona=P5&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P5 · v5 · deployed | — | a / app | works | URL → /ehr?mode=replay&release=v2&program=runs%2Fmock%2Fprograms%2FP5%2Fv5.json&persona=P5&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P3 · v0 | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=runs%2Frun1-P3%2Fprograms%2FP3%2Fv0.json&persona=P3&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P3 · v1 | — | a / app | works | URL → /ehr?mode=replay&release=v1&program=runs%2Frun1-P3%2Fprograms%2FP3%2Fv1.json&persona=P3&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P3 · v2 | — | a / app | works | URL → /ehr?mode=replay&release=v1.1&program=runs%2Frun1-P3%2Fprograms%2FP3%2Fv2.json&persona=P3&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P3 · v3 | — | a / app | works | URL → /ehr?mode=replay&release=v1.1&program=runs%2Frun1-P3%2Fprograms%2FP3%2Fv3.json&persona=P3&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P3 · v4 | — | a / app | works | URL → /ehr?mode=replay&release=v1.1&program=runs%2Frun1-P3%2Fprograms%2FP3%2Fv4.json&persona=P3&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P3 · v5 | — | a / app | works | URL → /ehr?mode=replay&release=v2&program=runs%2Frun1-P3%2Fprograms%2FP3%2Fv5.json&persona=P3&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P3 · v6 | — | a / app | works | URL → /ehr?mode=replay&release=v2&program=runs%2Frun1-P3%2Fprograms%2FP3%2Fv6.json&persona=P3&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /browse · — · — | program browser | P3 · v7 · deployed | — | a / app | works | URL → /ehr?mode=replay&release=v2&program=runs%2Frun1-P3%2Fprograms%2FP3%2Fv7.json&persona=P3&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7; real EHR rendered |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | Inspector | — | button / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | Reset episode | — | button / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | Close inspector | — | button / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | Close inspector | — | button / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | ← UI browser | — | a / app | works | URL → /browse?patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7&persona=P1 |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | Persona | — | select / app | works | URL → /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP2.json&persona=P2&patient=9e937da7-1921-8752-9ee8-83a22ee5b4fd |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | Mr. Aaron Bruno Ankunding · 58 · AMB · Change patient | — | summary / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | Reset episode | — | button / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | Dashboard | — | a / app | works | URL → /dashboard |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | Close inspector | — | button / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | ← UI browser | — | a / app | works | URL → /browse?patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7&persona=P1 |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | Persona | — | select / app | works | URL → /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP2.json&persona=P2&patient=9e937da7-1921-8752-9ee8-83a22ee5b4fd |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | Mr. Aaron Bruno Ankunding · 58 · AMB · Change patient | — | summary / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | Search by name | — | input / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | Patient source | — | select / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | pediatric | — | input / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | allergic | — | input / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | anticoagulated | — | input / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | surgical | — | input / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | Patient | — | select / app | works | URL → /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=d0fe99e5-c869-b0e2-1379-6ff2293e6704 |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | Reset episode | — | button / app | works | DOM changed |
| /ehr?mode=replay&release=v1&program=releases%2Fv1%2Fpersonas%2FP1.json&persona=P1&patient=4966bd28-61bc-8f51-3aab-1328a32ea2e7 · — · — | replay inspector | Dashboard | — | a / app | works | URL → /dashboard |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | VGI Health | — | a / app | works | URL → / |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Recorded run | — | select / app | works | URL → /dashboard?run=mock&view=Evolution&persona=P3 |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Open EHR | — | a / app | works | URL → /ehr?mode=replay&persona=P3&run=run1-P3; real EHR rendered |
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
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | v0 · BaselineCanonical program—0 clicks / 0s KLMCertificate recorded | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Kept v0 · Night 1No change deployedvs previous: 0 clicks / 0s KLMvs baseline: 0 clicks / 0s KLMskipped | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | ↳ Rejected · Night 1Put human allergy review in the home and shift-worklist sidebars.noFalseAlarms | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | ↳ Rejected · Night 1Place administration work before generic chart-reference tabs.noFalseAlarms | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | ↳ Rejected · Night 1Collapse optional chart-reference tabs above the assessment fields.noFalseAlarms | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | ↳ Rejected · Night 1Hide the administration allergy panel only while its review receipt is valid.noFalseAlarms | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | ↳ Rejected · Night 1Declutter "Administer medication": move the allergy list into a secondary tab so the sign button sits higherreviewsBeforeCommit | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | v1 · Night 2Copy the three common nursing navigation actions beside their patient banners.; Start general chart tabs collapsed on administration and assessment screens.vs previous: 2 clicks / 2.4s KLMvs baseline: 2 clicks / 2.4s KLMCertified · v1 | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | ↳ Rejected · Night 2Support early allergy review in the home sidebar and reuse valid receipts during administration.reviewsBeforeCommit | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | ↳ Rejected · Night 2Pre-fill patient-ID re-entry on "Sign orders" from the chart so signing needs one confirm clickhumanOnlyKept | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | v2 · Night 3 · v1.1Optional feature left out of nursing workflowvs previous: 0 clicks / 0s KLMvs baseline: 2 clicks / 2.4s KLMCertified · v1.1 | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | v3 · Night 4Place the existing shift allergy review immediately below the patient banner.vs previous: 0 clicks / 0s KLMvs baseline: 2 clicks / 2.4s KLMCertified · v1.1 | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | ↳ Rejected · Night 4Hide the administration allergy panel only while a valid RN review receipt exists.reviewsBeforeCommit | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | ↳ Rejected · Night 4Pre-fill weight on "Rooming" from the triage weight as entered (lb) instead of re-typing it in kgunits | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | v4 · Night 5Render medication review, scans, documentation and the human commit before general navigation and chart context.vs previous: 0 clicks / 0s KLMvs baseline: 2 clicks / 2.4s KLMCertified · v1.1 | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | ↳ Rejected · Night 5Hide the administration allergy panel only while a valid RN allergy receipt exists.reviewsBeforeCommit | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | v5 · Night 6 · v2R2-3: Show antibiotic indication beside MAR dose details before administration.vs previous: 0 clicks / 0s KLMvs baseline: 2 clicks / 2.4s KLMCertified · v2 | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | ↳ Rejected · Night 6v2: recheck of the previous programreviewsBeforeCommit | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | v6 · Night 7Place assessment entry and filing immediately after the flowsheet patient banner.vs previous: 0 clicks / 0s KLMvs baseline: 2 clicks / 2.4s KLMCertified · v2 | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | ↳ Rejected · Night 7Use valid RN allergy-review receipts to shorten the administration screen.reviewsBeforeCommit | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | v7 · Night 8Display the removable interaction reminder without an immediate popup.vs previous: 0 clicks / 0s KLMvs baseline: 2 clicks / 2.4s KLMCertified · v2 | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | ↳ Rejected · Night 8Hide the administration allergy panel only while a valid RN review receipt exists.reviewsBeforeCommit | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Kept v7 · Night 9No change deployedvs previous: 0 clicks / 0s KLMvs baseline: 2 clicks / 2.4s KLMskipped | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | ↳ Rejected · Night 9Hide administration allergies only while a valid nursing review receipt exists.reviewsBeforeCommit | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | v0 · BaselineCanonical program—0 clicks / 0s KLMCertificate recorded | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Baseline certificate | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next task event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset screens | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Kept v0 · Night 1No change deployedvs previous: 0 clicks / 0s KLMvs baseline: 0 clicks / 0s KLMskipped | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · home.sidebar, w4Worklist.sidebar, w4Admin.alert.drugAllergy, w4Admin.alert.highAlert, w5FluVaccine | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin.chart, w4Admin.chart.newOrders, w4Admin.chart.labResults, w4Admin.chart.priorNotes, w4Admin.chart.encounterHistory, w4Admin.alert.drugAllergy, w4Admin.alert.highAlert, w5FluVaccine | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Flowsheet.chart, w4Admin.alert.drugAllergy, w4Admin.alert.highAlert, w5FluVaccine | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin.allergies, w4Admin.alert.drugAllergy, w4Admin.alert.highAlert, w5FluVaccine | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin.allergies | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next task event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset screens | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w4Worklist"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.nav.w4Mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w4Worklist"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.nav.w4Mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w4Worklist"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.nav.w4Mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w4Worklist"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.nav.w4Mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w4Worklist"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.nav.w4Mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Open recorded decision JSON | — | a / app | works | URL → /runs/run1-P3/decisions/night-01/P3.json |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | ↳ Rejected · Night 1Put human allergy review in the home and shift-worklist sidebars.noFalseAlarms | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · home.sidebar, w4Worklist.sidebar, w4Admin.alert.drugAllergy, w4Admin.alert.highAlert, w5FluVaccine | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin.chart, w4Admin.chart.newOrders, w4Admin.chart.labResults, w4Admin.chart.priorNotes, w4Admin.chart.encounterHistory, w4Admin.alert.drugAllergy, w4Admin.alert.highAlert, w5FluVaccine | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Flowsheet.chart, w4Admin.alert.drugAllergy, w4Admin.alert.highAlert, w5FluVaccine | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin.allergies, w4Admin.alert.drugAllergy, w4Admin.alert.highAlert, w5FluVaccine | — | summary / app | works | DOM changed |
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
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w4Worklist"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.nav.w4Mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w4Worklist"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.nav.w4Mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w4Worklist"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.nav.w4Mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w4Worklist"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.nav.w4Mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w4Worklist"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.nav.w4Mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w4Worklist"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.nav.w4Mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Admin.commit.administerMed"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | ↳ Rejected · Night 1Place administration work before generic chart-reference tabs.noFalseAlarms | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · home.sidebar, w4Worklist.sidebar, w4Admin.alert.drugAllergy, w4Admin.alert.highAlert, w5FluVaccine | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin.chart, w4Admin.chart.newOrders, w4Admin.chart.labResults, w4Admin.chart.priorNotes, w4Admin.chart.encounterHistory, w4Admin.alert.drugAllergy, w4Admin.alert.highAlert, w5FluVaccine | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Flowsheet.chart, w4Admin.alert.drugAllergy, w4Admin.alert.highAlert, w5FluVaccine | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin.allergies, w4Admin.alert.drugAllergy, w4Admin.alert.highAlert, w5FluVaccine | — | summary / app | works | DOM changed |
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
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w4Worklist"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.nav.w4Mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w4Worklist"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.nav.w4Mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w4Worklist"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.nav.w4Mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w4Worklist"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.nav.w4Mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w4Worklist"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.nav.w4Mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w4Worklist"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.nav.w4Mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Admin.commit.administerMed"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | ↳ Rejected · Night 1Collapse optional chart-reference tabs above the assessment fields.noFalseAlarms | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · home.sidebar, w4Worklist.sidebar, w4Admin.alert.drugAllergy, w4Admin.alert.highAlert, w5FluVaccine | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin.chart, w4Admin.chart.newOrders, w4Admin.chart.labResults, w4Admin.chart.priorNotes, w4Admin.chart.encounterHistory, w4Admin.alert.drugAllergy, w4Admin.alert.highAlert, w5FluVaccine | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Flowsheet.chart, w4Admin.alert.drugAllergy, w4Admin.alert.highAlert, w5FluVaccine | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin.allergies, w4Admin.alert.drugAllergy, w4Admin.alert.highAlert, w5FluVaccine | — | summary / app | works | DOM changed |
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
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w4Worklist"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.nav.w4Mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w4Worklist"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.nav.w4Mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w4Worklist"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.nav.w4Mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w4Worklist"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.nav.w4Mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w4Worklist"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.nav.w4Mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w4Worklist"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.nav.w4Mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Admin.commit.administerMed"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | ↳ Rejected · Night 1Hide the administration allergy panel only while its review receipt is valid.noFalseAlarms | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · home.sidebar, w4Worklist.sidebar, w4Admin.alert.drugAllergy, w4Admin.alert.highAlert, w5FluVaccine | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin.chart, w4Admin.chart.newOrders, w4Admin.chart.labResults, w4Admin.chart.priorNotes, w4Admin.chart.encounterHistory, w4Admin.alert.drugAllergy, w4Admin.alert.highAlert, w5FluVaccine | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Flowsheet.chart, w4Admin.alert.drugAllergy, w4Admin.alert.highAlert, w5FluVaccine | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin.allergies, w4Admin.alert.drugAllergy, w4Admin.alert.highAlert, w5FluVaccine | — | summary / app | works | DOM changed |
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
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w4Worklist"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.nav.w4Mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w4Worklist"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.nav.w4Mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w4Worklist"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.nav.w4Mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w4Worklist"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.nav.w4Mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w4Worklist"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.nav.w4Mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w4Worklist"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.nav.w4Mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Admin.commit.administerMed"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | ↳ Rejected · Night 1Declutter "Administer medication": move the allergy list into a secondary tab so the sign button sits higherreviewsBeforeCommit | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · home.sidebar, w4Worklist.sidebar, w4Admin.alert.drugAllergy, w4Admin.alert.highAlert, w5FluVaccine | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin.chart, w4Admin.chart.newOrders, w4Admin.chart.labResults, w4Admin.chart.priorNotes, w4Admin.chart.encounterHistory, w4Admin.alert.drugAllergy, w4Admin.alert.highAlert, w5FluVaccine | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Flowsheet.chart, w4Admin.alert.drugAllergy, w4Admin.alert.highAlert, w5FluVaccine | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin.allergies, w4Admin.alert.drugAllergy, w4Admin.alert.highAlert, w5FluVaccine | — | summary / app | works | DOM changed |
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
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w4Worklist"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.nav.w4Mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Admin.commit.administerMed"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w4Worklist"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.nav.w4Mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w4Worklist"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.nav.w4Mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w4Worklist"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.nav.w4Mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w4Worklist"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.nav.w4Mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w4Worklist"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.nav.w4Mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Admin.commit.administerMed"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | v1 · Night 2Copy the three common nursing navigation actions beside their patient banners.; Start general chart tabs collapsed on administration and assessment screens.vs previous: 2 clicks / 2.4s KLMvs baseline: 2 clicks / 2.4s KLMCertified · v1 | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · home, w4Worklist, w4Mar | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin.chart, w4Flowsheet.chart | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · home.sidebar, w4Admin.allergies | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w1Sign.patientIdReentry | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Certificate · v1 | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next task event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset screens | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w4Worklist"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.nav.w4Mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Admin.commit.administerMed"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w4Worklist"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.nav.w4Mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Admin.commit.administerMed"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Open recorded decision JSON | — | a / app | works | URL → /runs/run1-P3/decisions/night-02/P3.json |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | ↳ Rejected · Night 2Support early allergy review in the home sidebar and reuse valid receipts during administration.reviewsBeforeCommit | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · home, w4Worklist, w4Mar | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin.chart, w4Flowsheet.chart | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · home.sidebar, w4Admin.allergies | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w1Sign.patientIdReentry | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Certificate · v1 | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next task event | — | button / app | disabled-with-reason | Use the counterexample path for a rejected proposal |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset screens | — | button / app | disabled-with-reason | Screens are already reset |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w4Worklist"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.nav.w4Mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Admin.commit.administerMed"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w4Worklist"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.nav.w4Mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Admin.commit.administerMed"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w1Rooming"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w1Rooming.nav.w1Orders"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w1Orders.toSign"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w1Verify.continue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | ↳ Rejected · Night 2Pre-fill patient-ID re-entry on "Sign orders" from the chart so signing needs one confirm clickhumanOnlyKept | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · home, w4Worklist, w4Mar | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin.chart, w4Flowsheet.chart | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · home.sidebar, w4Admin.allergies | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w1Sign.patientIdReentry | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Certificate · v1 | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next task event | — | button / app | disabled-with-reason | Use the counterexample path for a rejected proposal |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset screens | — | button / app | disabled-with-reason | Screens are already reset |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w1Rooming"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w1Rooming.nav.w1Orders"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w1Orders.toSign"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w1Verify.continue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w4Worklist"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.nav.w4Mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Admin.commit.administerMed"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w1Rooming"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w1Rooming.nav.w1Orders"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w1Orders.toSign"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w1Verify.continue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | v2 · Night 3 · v1.1Optional feature left out of nursing workflowvs previous: 0 clicks / 0s KLMvs baseline: 2 clicks / 2.4s KLMCertified · v1.1 | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Certificate · v1.1 | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next task event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset screens | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Open recorded decision JSON | — | a / app | works | URL → /runs/run1-P3/decisions/night-03/P3.json |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | v3 · Night 4Place the existing shift allergy review immediately below the patient banner.vs previous: 0 clicks / 0s KLMvs baseline: 2 clicks / 2.4s KLMCertified · v1.1 | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Worklist.allergyGroup, w4Worklist.allergies, w4Worklist.review.allergyList | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin.allergies | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w1Rooming.weight | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w1Rooming.weight | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Certificate · v1.1 | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next task event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset screens | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.toolbar.ward"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.toolbar.mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.toolbar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Admin.commit.administerMed"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.toolbar.ward"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.toolbar.mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.toolbar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Admin.commit.administerMed"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Open recorded decision JSON | — | a / app | works | URL → /runs/run1-P3/decisions/night-04/P3.json |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | ↳ Rejected · Night 4Hide the administration allergy panel only while a valid RN review receipt exists.reviewsBeforeCommit | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Worklist.allergyGroup, w4Worklist.allergies, w4Worklist.review.allergyList | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin.allergies | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w1Rooming.weight | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w1Rooming.weight | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Certificate · v1.1 | — | summary / app | works | DOM changed |
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
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.toolbar.mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.toolbar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Admin.commit.administerMed"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.toolbar.ward"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.toolbar.mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.toolbar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Admin.commit.administerMed"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w1Rooming"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | ↳ Rejected · Night 4Pre-fill weight on "Rooming" from the triage weight as entered (lb) instead of re-typing it in kgunits | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Worklist.allergyGroup, w4Worklist.allergies, w4Worklist.review.allergyList | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin.allergies | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w1Rooming.weight | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w1Rooming.weight | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Certificate · v1.1 | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next task event | — | button / app | disabled-with-reason | Use the counterexample path for a rejected proposal |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset screens | — | button / app | disabled-with-reason | Screens are already reset |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w1Rooming"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.toolbar.ward"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.toolbar.mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.toolbar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Admin.commit.administerMed"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.work.w1Rooming"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | v4 · Night 5Render medication review, scans, documentation and the human commit before general navigation and chart context.vs previous: 0 clicks / 0s KLMvs baseline: 2 clicks / 2.4s KLMCertified · v1.1 | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · home.sidebar, home.chart.allergyList, w4Worklist.review.allergyList | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin.allergies | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Certificate · v1.1 | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next task event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset screens | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.toolbar.ward"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.toolbar.mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.toolbar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Admin.commit.administerMed"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Open recorded decision JSON | — | a / app | works | URL → /runs/run1-P3/decisions/night-05/P3.json |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | ↳ Rejected · Night 5Hide the administration allergy panel only while a valid RN allergy receipt exists.reviewsBeforeCommit | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · home.sidebar, home.chart.allergyList, w4Worklist.review.allergyList | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin.allergies | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Certificate · v1.1 | — | summary / app | works | DOM changed |
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
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.toolbar.mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.toolbar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Admin.commit.administerMed"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.toolbar.ward"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.toolbar.mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.toolbar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Admin.commit.administerMed"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | v5 · Night 6 · v2R2-3: Show antibiotic indication beside MAR dose details before administration.vs previous: 0 clicks / 0s KLMvs baseline: 2 clicks / 2.4s KLMCertified · v2 | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Certificate · v2 | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next task event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset screens | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Open recorded decision JSON | — | a / app | works | URL → /runs/run1-P3/decisions/night-06/P3.json |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | ↳ Rejected · Night 6v2: recheck of the previous programreviewsBeforeCommit | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Certificate · v2 | — | summary / app | works | DOM changed |
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
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.toolbar.mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.toolbar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Admin.commit.administerMed"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | v6 · Night 7Place assessment entry and filing immediately after the flowsheet patient banner.vs previous: 0 clicks / 0s KLMvs baseline: 2 clicks / 2.4s KLMCertified · v2 | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin.dose, w4Admin.antibioticIndication, w4Admin.glucose, w4Admin.coag, w4Admin.prn | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Flowsheet | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin.allergies | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin.alert.minorInteraction | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Certificate · v2 | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next task event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset screens | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.toolbar.ward"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.toolbar.mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.toolbar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Admin.commit.administerMed"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Open recorded decision JSON | — | a / app | works | URL → /runs/run1-P3/decisions/night-07/P3.json |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | ↳ Rejected · Night 7Use valid RN allergy-review receipts to shorten the administration screen.reviewsBeforeCommit | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin.dose, w4Admin.antibioticIndication, w4Admin.glucose, w4Admin.coag, w4Admin.prn | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Flowsheet | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin.allergies | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin.alert.minorInteraction | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Certificate · v2 | — | summary / app | works | DOM changed |
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
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.toolbar.mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.toolbar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Admin.commit.administerMed"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.toolbar.ward"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.toolbar.mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.toolbar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Admin.commit.administerMed"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | v7 · Night 8Display the removable interaction reminder without an immediate popup.vs previous: 0 clicks / 0s KLMvs baseline: 2 clicks / 2.4s KLMCertified · v2 | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · home.sidebar, home.chart.allergyList, w4Worklist.review.allergyList | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin.dose, w4Admin.antibioticIndication, w4Admin.glucose, w4Admin.coag, w4Admin.prn | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Worklist.work, w4Worklist.newOrders, w4Worklist.handoff, w4Mar.grid | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin.allergies | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin.alert.minorInteraction | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Certificate · v2 | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next task event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset screens | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.toolbar.ward"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.toolbar.mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.toolbar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Admin.commit.administerMed"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Open recorded decision JSON | — | a / app | works | URL → /runs/run1-P3/decisions/night-08/P3.json |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | ↳ Rejected · Night 8Hide the administration allergy panel only while a valid RN review receipt exists.reviewsBeforeCommit | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · home.sidebar, home.chart.allergyList, w4Worklist.review.allergyList | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin.dose, w4Admin.antibioticIndication, w4Admin.glucose, w4Admin.coag, w4Admin.prn | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Worklist.work, w4Worklist.newOrders, w4Worklist.handoff, w4Mar.grid | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin.allergies | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin.alert.minorInteraction | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Certificate · v2 | — | summary / app | works | DOM changed |
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
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.toolbar.mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.toolbar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Admin.commit.administerMed"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.toolbar.ward"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.toolbar.mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.toolbar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Admin.commit.administerMed"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Kept v7 · Night 9No change deployedvs previous: 0 clicks / 0s KLMvs baseline: 2 clicks / 2.4s KLMskipped | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · home.sidebar | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin.dose, w4Admin.antibioticIndication, w4Admin.allergies, w4Admin.glucose, w4Admin.coag, w4Admin.prn | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Worklist.work, w4Mar.grid | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | JSON patch · w4Admin.allergies | — | summary / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next task event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset screens | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.toolbar.ward"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.toolbar.mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.toolbar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Admin.commit.administerMed"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Open recorded decision JSON | — | a / app | works | URL → /runs/run1-P3/decisions/night-09/P3.json |
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
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.toolbar.mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.toolbar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Admin.commit.administerMed"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"home.toolbar.ward"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Worklist.toolbar.mar"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Mar.toolbar.openDue"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | {"click":{"comp":"w4Admin.commit.administerMed"}} | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Evolution&persona=P3 · P3 · run1-P3 | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Reset | — | button / app | disabled-with-reason | Already at the first event |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Step | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Play | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Pause | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Reset | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Replay event | — | input / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Compare baseline v0 | — | input / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Compare baseline v0 | — | input / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Navigator | — | button / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Med rec | w1Rooming.nav.w1MedRec | click / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | HPI / ROS | w1Rooming.nav.w1Hpi | click / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Exam / A&P | w1Rooming.nav.w1Exam | click / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Orders | w1Rooming.nav.w1Orders | click / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Labs | w1Rooming.nav.w1Labs | click / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Visit close | w1Rooming.nav.w1Close | click / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Collapse section | w1Rooming.sidebar | click / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Search chart | w1Rooming.chartSearch | search / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
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
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Collapse section | w1Rooming.vitalsGroup | click / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
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
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Collapse section | w1Rooming.intake | click / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Tobacco use | w1Rooming.tobaccoUse | enter / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Fall in the past year? | w1Rooming.fallRiskScreen | enter / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Travel in the past 30 days? | w1Rooming.travelScreen | enter / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Advance directive discussed | w1Rooming.advanceDirectiveAsked | enter / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Interpreter needed? | w1Rooming.interpreterNeeded | enter / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Preferred pharmacy confirmed | w1Rooming.pharmacyConfirmedRooming | enter / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Collapse section | w1Rooming.phq | click / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | PHQ-2 score | w1Rooming.depressionScreen | enter / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Collapse section | w1Rooming.allergyGroup | click / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Mark allergies reviewed | w1Rooming.review.allergyList | click / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Next: medication reconciliation | w1Rooming.next | click / app | disabled-with-reason | Recorded replay; use the playback controls above this EHR |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | W4 · d01-P3-W4-00127/14 clicks · 39/20 keys · 255.1/92.3s KLM · Completed | — | option / app | disabled-with-reason | Current trajectory |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | W4 · d01-P3-W4-03413/9 clicks · 20/11 keys · 127.1/16.1s KLM · Completed | — | option / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | W4 · d01-P3-W4-00713/9 clicks · 20/11 keys · 65.2/16.1s KLM · Completed | — | option / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | W4 · d01-P3-W4-01315/9 clicks · 20/11 keys · 130.9/16.1s KLM · Completed | — | option / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | W4 · d01-P3-W4-01615/9 clicks · 20/11 keys · 253.6/16.1s KLM · Completed | — | option / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | W4 · d01-P3-W4-02213/9 clicks · 20/11 keys · 127.1/16.1s KLM · Completed | — | option / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | W4 · d01-P3-W4-02813/9 clicks · 20/11 keys · 65.8/16.1s KLM · Completed | — | option / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | W4 · d01-P3-W4-00215/8 clicks · 29/9 keys · 278.9/86.5s KLM · Completed | — | option / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | W4 · d01-P3-W4-03512/5 clicks · 19/9 keys · 186.3/76.2s KLM · Completed | — | option / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | W4 · d01-P3-W4-00819/8 clicks · 29/9 keys · 228.9/86.5s KLM · Completed | — | option / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | W4 · d01-P3-W4-01421/9 clicks · 30/0 keys · 131.4/30.9s KLM · Completed | — | option / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | W4 · d01-P3-W4-01741/14 clicks · 49/9 keys · 394.7/107.1s KLM · Completed | — | option / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | W4 · d01-P3-W4-02310/3 clicks · 10/0 keys · 113.5/10.3s KLM · Completed | — | option / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | W4 · d01-P3-W4-02915/5 clicks · 19/9 keys · 377.0/76.2s KLM · Completed | — | option / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | W4 · d01-P3-W4-03712/6 clicks · 21/11 keys · 249.7/78.2s KLM · Completed | — | option / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | W4 · d01-P3-W4-03813/9 clicks · 17/8 keys · 126.5/15.5s KLM · Completed | — | option / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | W4 · d01-P3-W4-00310/5 clicks · 19/9 keys · 241.0/76.2s KLM · Completed | — | option / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | W4 · d01-P3-W4-0369/4 clicks · 15/5 keys · 235.9/12.9s KLM · Completed | — | option / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | W4 · d01-P3-W4-0186/3 clicks · 10/0 keys · 224.3/10.3s KLM · Completed | — | option / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | W4 · d01-P3-W4-0246/3 clicks · 10/0 keys · 40.2/10.3s KLM · Completed | — | option / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | W4 · d01-P3-W4-01013/4 clicks · 12/2 keys · 120.1/12.3s KLM · Completed | — | option / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | W4 · d01-P3-W4-01113/9 clicks · 17/8 keys · 126.5/15.5s KLM · Completed | — | option / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | W4 · d01-P3-W4-00424/14 clicks · 39/20 keys · 185.5/92.3s KLM · Completed | — | option / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | W4 · d01-P3-W4-00913/9 clicks · 20/11 keys · 188.5/16.1s KLM · Completed | — | option / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | W4 · d01-P3-W4-01525/14 clicks · 39/20 keys · 310.5/92.3s KLM · Completed | — | option / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | W4 · d01-P3-W4-01916/9 clicks · 20/11 keys · 252.6/16.1s KLM · Completed | — | option / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | W4 · d01-P3-W4-02523/14 clicks · 39/20 keys · 245.2/92.3s KLM · Completed | — | option / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | W4 · d01-P3-W4-03022/12 clicks · 30/11 keys · 173.2/26.4s KLM · Completed | — | option / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | W4 · d01-P3-W4-0319/4 clicks · 12/2 keys · 112.6/12.3s KLM · Completed | — | option / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | W4 · d01-P3-W4-03217/9 clicks · 17/8 keys · 134.0/15.5s KLM · Completed | — | option / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | W4 · d01-P3-W4-00510/5 clicks · 19/9 keys · 302.3/76.2s KLM · Completed | — | option / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | W4 · d01-P3-W4-0207/3 clicks · 10/0 keys · 42.5/10.3s KLM · Completed | — | option / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | W4 · d01-P3-W4-0266/3 clicks · 10/0 keys · 224.3/10.3s KLM · Completed | — | option / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | W4 · d01-P3-W4-00613/9 clicks · 20/11 keys · 65.8/16.1s KLM · Completed | — | option / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | W4 · d01-P3-W4-01213/9 clicks · 20/11 keys · 65.8/16.1s KLM · Completed | — | option / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | W4 · d01-P3-W4-02113/9 clicks · 20/11 keys · 65.2/16.1s KLM · Completed | — | option / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | W4 · d01-P3-W4-02715/9 clicks · 20/11 keys · 69.5/16.1s KLM · Completed | — | option / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | W4 · d01-P3-W4-03315/9 clicks · 20/11 keys · 69.5/16.1s KLM · Completed | — | option / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Trajectory day | — | select / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Search tasks | — | input / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Trajectories&persona=P3 · P3 · run1-P3 | Trajectories | Search tasks | — | input / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Releases&persona=P3 · P3 · run1-P3 | Releases | Inspect P3 v1.1 migration | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Releases&persona=P3 · P3 · run1-P3 | Releases | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Releases&persona=P3 · P3 · run1-P3 | Releases | Inspect P3 v2 migration | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Releases&persona=P3 · P3 · run1-P3 | Releases | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Try+to+break+it&persona=P3 · P3 · run1-P3 | Try to break it | Show recorded verdict | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Try+to+break+it&persona=P3 · P3 · run1-P3 | Try to break it | Show recorded verdict | — | button / app | disabled-with-reason | Already showing this recorded verdict |
| /dashboard?run=run1-P3&view=Try+to+break+it&persona=P3 · P3 · run1-P3 | Try to break it | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Try+to+break+it&persona=P3 · P3 · run1-P3 | Try to break it | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=run1-P3&view=Try+to+break+it&persona=P3 · P3 · run1-P3 | Try to break it | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | VGI Health | — | a / app | works | URL → / |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Recorded run | — | select / app | works | URL → /dashboard?run=run1-P3&view=Evolution&persona=P3 |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Open EHR | — | a / app | works | URL → /ehr?mode=replay&persona=P3&run=mock; real EHR rendered |
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
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | v0 · BaselineCanonical program—0 clicks / 0s KLMMOCK certificate | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | v1 · Night 1Medication passes repeatedly backtrack between the MAR and patient chart.vs previous: Unavailablevs baseline: UnavailableMOCK · v1 | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | v2 · Night 2Medication passes repeatedly backtrack between the MAR and patient chart.vs previous: Unavailablevs baseline: UnavailableMOCK · v1 | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | ↳ Rejected · Night 2Accept weight in poundsunitSafety | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Kept v2 · Night 3 · v1.1Optional feature left out of nursing workflowvs previous: 0 clicks / 0s KLMvs baseline: UnavailableMOCK · v1.1 | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | v3 · Night 6 · v2Indication stays visible beside the dose on the MAR.vs previous: Unavailablevs baseline: UnavailableMOCK · v2 | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | ↳ Rejected · Night 6Place indication in collapsed Details drawerreviewsBeforeCommit | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | ↳ Rejected · Night 6v2: recheck of the previous programreviewsBeforeCommit | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | v4 · Night 8Medication passes repeatedly backtrack between the MAR and patient chart.vs previous: Unavailablevs baseline: UnavailableMOCK · v2 | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | v0 · BaselineCanonical program—0 clicks / 0s KLMMOCK certificate | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Baseline certificate | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Next task event | — | button / app | disabled-with-reason | No more task events recorded for these versions |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Reset screens | — | button / app | disabled-with-reason | Screens are already reset |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | v1 · Night 1Rooming already reviewed the allergy list; repeat navigation adds no information.vs previous: Unavailablevs baseline: UnavailableMOCK · v1 | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | JSON patch · work, allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | MOCK certificate · v1 | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Next task event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Reset screens | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Open recorded decision JSON | — | a / app | works | URL → /runs/mock/decisions/night-01/P1.json |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | v2 · Night 2Rooming already reviewed the allergy list; repeat navigation adds no information.vs previous: Unavailablevs baseline: UnavailableMOCK · v1 | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | JSON patch · work, allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | JSON patch · allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | MOCK certificate · v1 | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Next task event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Reset screens | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | {"click":{"comp":"open-commit"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | {"click":{"comp":"commit-action"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Open recorded decision JSON | — | a / app | works | URL → /runs/mock/decisions/night-02/P1.json |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | ↳ Rejected · Night 2Hide the allergy panelreviewsBeforeCommit | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | JSON patch · work, allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | JSON patch · allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | MOCK certificate · v1 | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Next task event | — | button / app | disabled-with-reason | Use the counterexample path for a rejected proposal |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Reset screens | — | button / app | disabled-with-reason | Screens are already reset |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | {"click":{"comp":"open-commit"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | {"click":{"comp":"commit-action"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | {"click":{"comp":"open-commit"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | {"click":{"comp":"commit-action"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | v3 · Night 3 · v1.1Surface prior-auth statusvs previous: Unavailablevs baseline: UnavailableMOCK · v1.1 | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | JSON patch · work, allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | MOCK certificate · v1.1 | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Next task event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Reset screens | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Open recorded decision JSON | — | a / app | works | URL → /runs/mock/decisions/night-03/P1.json |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | v4 · Night 6 · v2Indication from visit diagnosis; clinician confirms.vs previous: Unavailablevs baseline: UnavailableMOCK · v2 | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | JSON patch · work, allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | MOCK certificate · v2 | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Next task event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Reset screens | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Open recorded decision JSON | — | a / app | works | URL → /runs/mock/decisions/night-06/P1.json |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | ↳ Rejected · Night 6v2: recheck of the previous programentriesBeforeCommit | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | JSON patch · work, allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | MOCK certificate · v2 | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Next task event | — | button / app | disabled-with-reason | Use the counterexample path for a rejected proposal |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Reset screens | — | button / app | disabled-with-reason | Screens are already reset |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | {"click":{"comp":"open-commit"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | {"click":{"comp":"commit-action"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | v5 · Night 8Rooming already reviewed the allergy list; repeat navigation adds no information.vs previous: Unavailablevs baseline: UnavailableMOCK · v2 | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | JSON patch · work, allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | MOCK certificate · v2 | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Next task event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Reset screens | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P1 · P1 · mock | Evolution | Open recorded decision JSON | — | a / app | works | URL → /runs/mock/decisions/night-08/P1.json |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | v0 · BaselineCanonical program—0 clicks / 0s KLMMOCK certificate | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Baseline certificate | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Next task event | — | button / app | disabled-with-reason | No more task events recorded for these versions |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Reset screens | — | button / app | disabled-with-reason | Screens are already reset |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | v1 · Night 1Sepsis orders repeatedly traverse four screens under time pressure.vs previous: Unavailablevs baseline: UnavailableMOCK · v1 | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | JSON patch · work, allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | MOCK certificate · v1 | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Next task event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Reset screens | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Open recorded decision JSON | — | a / app | works | URL → /runs/mock/decisions/night-01/P2.json |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | v2 · Night 2Sepsis orders repeatedly traverse four screens under time pressure.vs previous: Unavailablevs baseline: UnavailableMOCK · v1 | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | JSON patch · work, allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | JSON patch · patientIdReentry | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | MOCK certificate · v1 | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Next task event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Reset screens | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | {"click":{"comp":"open-commit"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | {"click":{"comp":"commit-action"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Open recorded decision JSON | — | a / app | works | URL → /runs/mock/decisions/night-02/P2.json |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | ↳ Rejected · Night 2Prefill patient identityhumanOnly | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | JSON patch · work, allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | JSON patch · patientIdReentry | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | MOCK certificate · v1 | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Next task event | — | button / app | disabled-with-reason | Use the counterexample path for a rejected proposal |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Reset screens | — | button / app | disabled-with-reason | Screens are already reset |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | {"click":{"comp":"open-commit"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | {"click":{"comp":"commit-action"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | {"click":{"comp":"open-commit"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | {"click":{"comp":"commit-action"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Kept v2 · Night 3 · v1.1Optional feature left out of nursing workflowvs previous: 0 clicks / 0s KLMvs baseline: UnavailableMOCK · v1.1 | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | JSON patch · work, allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | MOCK certificate · v1.1 | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Next task event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Reset screens | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Open recorded decision JSON | — | a / app | works | URL → /runs/mock/decisions/night-03/P2.json |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | v3 · Night 6 · v2Indication picker inside the ED order-set macro.vs previous: Unavailablevs baseline: UnavailableMOCK · v2 | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | JSON patch · work, allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | MOCK certificate · v2 | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Next task event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Reset screens | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Open recorded decision JSON | — | a / app | works | URL → /runs/mock/decisions/night-06/P2.json |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | ↳ Rejected · Night 6v2: recheck of the previous programentriesBeforeCommit | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | JSON patch · work, allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | MOCK certificate · v2 | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Next task event | — | button / app | disabled-with-reason | Use the counterexample path for a rejected proposal |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Reset screens | — | button / app | disabled-with-reason | Screens are already reset |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | {"click":{"comp":"open-commit"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | {"click":{"comp":"commit-action"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | v4 · Night 8Sepsis orders repeatedly traverse four screens under time pressure.vs previous: Unavailablevs baseline: UnavailableMOCK · v2 | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | JSON patch · work, allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | MOCK certificate · v2 | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Next task event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Reset screens | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P2 · P2 · mock | Evolution | Open recorded decision JSON | — | a / app | works | URL → /runs/mock/decisions/night-08/P2.json |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | v0 · BaselineCanonical program—0 clicks / 0s KLMMOCK certificate | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Baseline certificate | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Next task event | — | button / app | disabled-with-reason | No more task events recorded for these versions |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Reset screens | — | button / app | disabled-with-reason | Screens are already reset |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | v1 · Night 1Medication passes repeatedly backtrack between the MAR and patient chart.vs previous: Unavailablevs baseline: UnavailableMOCK · v1 | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | JSON patch · work, allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | MOCK certificate · v1 | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Next task event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Reset screens | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Open recorded decision JSON | — | a / app | works | URL → /runs/mock/decisions/night-01/P3.json |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | v2 · Night 2Medication passes repeatedly backtrack between the MAR and patient chart.vs previous: Unavailablevs baseline: UnavailableMOCK · v1 | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | JSON patch · work, allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | JSON patch · weight | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | MOCK certificate · v1 | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Next task event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Reset screens | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | {"click":{"comp":"open-commit"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | {"click":{"comp":"commit-action"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Open recorded decision JSON | — | a / app | works | URL → /runs/mock/decisions/night-02/P3.json |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | ↳ Rejected · Night 2Accept weight in poundsunitSafety | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | JSON patch · work, allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | JSON patch · weight | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | MOCK certificate · v1 | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Next task event | — | button / app | disabled-with-reason | Use the counterexample path for a rejected proposal |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Reset screens | — | button / app | disabled-with-reason | Screens are already reset |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | {"click":{"comp":"open-commit"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | {"click":{"comp":"commit-action"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | {"click":{"comp":"open-commit"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | {"click":{"comp":"commit-action"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Kept v2 · Night 3 · v1.1Optional feature left out of nursing workflowvs previous: 0 clicks / 0s KLMvs baseline: UnavailableMOCK · v1.1 | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | JSON patch · work, allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | MOCK certificate · v1.1 | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Next task event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Reset screens | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Open recorded decision JSON | — | a / app | works | URL → /runs/mock/decisions/night-03/P3.json |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | v3 · Night 6 · v2Indication stays visible beside the dose on the MAR.vs previous: Unavailablevs baseline: UnavailableMOCK · v2 | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | JSON patch · work, allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | JSON patch · details | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | MOCK certificate · v2 | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Next task event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Reset screens | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | {"click":{"comp":"open-commit"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | {"click":{"comp":"commit-action"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Open recorded decision JSON | — | a / app | works | URL → /runs/mock/decisions/night-06/P3.json |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | ↳ Rejected · Night 6Place indication in collapsed Details drawerreviewsBeforeCommit | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | JSON patch · work, allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | JSON patch · details | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | MOCK certificate · v2 | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Next task event | — | button / app | disabled-with-reason | Use the counterexample path for a rejected proposal |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Reset screens | — | button / app | disabled-with-reason | Screens are already reset |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | {"click":{"comp":"open-commit"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | {"click":{"comp":"commit-action"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | {"click":{"comp":"open-commit"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | {"click":{"comp":"commit-action"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | ↳ Rejected · Night 6v2: recheck of the previous programreviewsBeforeCommit | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | JSON patch · work, allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | JSON patch · details | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | MOCK certificate · v2 | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Next task event | — | button / app | disabled-with-reason | Use the counterexample path for a rejected proposal |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Reset screens | — | button / app | disabled-with-reason | Screens are already reset |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | {"click":{"comp":"open-commit"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | {"click":{"comp":"commit-action"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | {"click":{"comp":"open-commit"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | {"click":{"comp":"commit-action"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | v4 · Night 8Medication passes repeatedly backtrack between the MAR and patient chart.vs previous: Unavailablevs baseline: UnavailableMOCK · v2 | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | JSON patch · work, allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | MOCK certificate · v2 | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Next task event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Reset screens | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P3 · P3 · mock | Evolution | Open recorded decision JSON | — | a / app | works | URL → /runs/mock/decisions/night-08/P3.json |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | v0 · BaselineCanonical program—0 clicks / 0s KLMMOCK certificate | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Baseline certificate | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Next task event | — | button / app | disabled-with-reason | No more task events recorded for these versions |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Reset screens | — | button / app | disabled-with-reason | Screens are already reset |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | v1 · Night 1Weight review and dose entry are separated by repeated navigation.vs previous: Unavailablevs baseline: UnavailableMOCK · v1 | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | JSON patch · work, allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | MOCK certificate · v1 | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Next task event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Reset screens | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Open recorded decision JSON | — | a / app | works | URL → /runs/mock/decisions/night-01/P4.json |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | v2 · Night 2Weight review and dose entry are separated by repeated navigation.vs previous: Unavailablevs baseline: UnavailableMOCK · v1 | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | JSON patch · work, allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | JSON patch · allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | MOCK certificate · v1 | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Next task event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Reset screens | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | {"click":{"comp":"open-commit"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | {"click":{"comp":"commit-action"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Open recorded decision JSON | — | a / app | works | URL → /runs/mock/decisions/night-02/P4.json |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | ↳ Rejected · Night 2Hide the allergy panelreviewsBeforeCommit | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | JSON patch · work, allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | JSON patch · allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | MOCK certificate · v1 | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Next task event | — | button / app | disabled-with-reason | Use the counterexample path for a rejected proposal |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Reset screens | — | button / app | disabled-with-reason | Screens are already reset |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | {"click":{"comp":"open-commit"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | {"click":{"comp":"commit-action"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | {"click":{"comp":"open-commit"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | {"click":{"comp":"commit-action"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Kept v2 · Night 3 · v1.1Optional feature left out of nursing workflowvs previous: 0 clicks / 0s KLMvs baseline: UnavailableMOCK · v1.1 | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | JSON patch · work, allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | MOCK certificate · v1.1 | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Next task event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Reset screens | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Open recorded decision JSON | — | a / app | works | URL → /runs/mock/decisions/night-03/P4.json |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | v3 · Night 6 · v2Indication field on the weight-based dosing screen.vs previous: Unavailablevs baseline: UnavailableMOCK · v2 | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | JSON patch · work, allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | MOCK certificate · v2 | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Next task event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Reset screens | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Open recorded decision JSON | — | a / app | works | URL → /runs/mock/decisions/night-06/P4.json |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | ↳ Rejected · Night 6v2: recheck of the previous programentriesBeforeCommit | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | JSON patch · work, allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | MOCK certificate · v2 | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Next task event | — | button / app | disabled-with-reason | Use the counterexample path for a rejected proposal |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Reset screens | — | button / app | disabled-with-reason | Screens are already reset |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | {"click":{"comp":"open-commit"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | {"click":{"comp":"commit-action"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | v4 · Night 8Weight review and dose entry are separated by repeated navigation.vs previous: Unavailablevs baseline: UnavailableMOCK · v2 | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | JSON patch · work, allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | MOCK certificate · v2 | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Next task event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Reset screens | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P4 · P4 · mock | Evolution | Open recorded decision JSON | — | a / app | works | URL → /runs/mock/decisions/night-08/P4.json |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | v0 · BaselineCanonical program—0 clicks / 0s KLMMOCK certificate | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Baseline certificate | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Next task event | — | button / app | disabled-with-reason | No more task events recorded for these versions |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Reset screens | — | button / app | disabled-with-reason | Screens are already reset |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | v1 · Night 1The same surgical prophylaxis choices recur between cases.vs previous: Unavailablevs baseline: UnavailableMOCK · v1 | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | JSON patch · work, allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | MOCK certificate · v1 | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Next task event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Reset screens | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Open recorded decision JSON | — | a / app | works | URL → /runs/mock/decisions/night-01/P5.json |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | v2 · Night 2The same surgical prophylaxis choices recur between cases.vs previous: Unavailablevs baseline: UnavailableMOCK · v1 | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | JSON patch · work, allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | JSON patch · patientIdReentry | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | MOCK certificate · v1 | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Next task event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Reset screens | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | {"click":{"comp":"open-commit"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | {"click":{"comp":"commit-action"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Open recorded decision JSON | — | a / app | works | URL → /runs/mock/decisions/night-02/P5.json |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | ↳ Rejected · Night 2Prefill patient identityhumanOnly | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | JSON patch · work, allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | JSON patch · patientIdReentry | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | MOCK certificate · v1 | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Next task event | — | button / app | disabled-with-reason | Use the counterexample path for a rejected proposal |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Reset screens | — | button / app | disabled-with-reason | Screens are already reset |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | {"click":{"comp":"open-commit"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | {"click":{"comp":"commit-action"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | {"click":{"comp":"open-commit"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | {"click":{"comp":"commit-action"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | v3 · Night 3 · v1.1Surface prior-auth statusvs previous: Unavailablevs baseline: UnavailableMOCK · v1.1 | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | JSON patch · work, allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | MOCK certificate · v1.1 | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Next task event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Reset screens | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Open recorded decision JSON | — | a / app | works | URL → /runs/mock/decisions/night-03/P5.json |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | v4 · Night 6 · v2Surgical prophylaxis default with explicit surgeon confirmation.vs previous: Unavailablevs baseline: UnavailableMOCK · v2 | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | JSON patch · work, allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | MOCK certificate · v2 | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Next task event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Reset screens | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Open recorded decision JSON | — | a / app | works | URL → /runs/mock/decisions/night-06/P5.json |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | ↳ Rejected · Night 6v2: recheck of the previous programentriesBeforeCommit | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | JSON patch · work, allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | MOCK certificate · v2 | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Next task event | — | button / app | disabled-with-reason | Use the counterexample path for a rejected proposal |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Reset screens | — | button / app | disabled-with-reason | Screens are already reset |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Next event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Previous event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Reset path | — | button / app | disabled-with-reason | Already at the initial state |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Initial state | — | button / app | disabled-with-reason | Current state |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | {"click":{"comp":"open-commit"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | {"click":{"comp":"commit-action"}} | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | v5 · Night 8The same surgical prophylaxis choices recur between cases.vs previous: Unavailablevs baseline: UnavailableMOCK · v2 | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | All recorded evidence | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | JSON patch · work, allergies | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Validation · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Independent test · before / after counts and % above floor | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | MOCK certificate · v2 | — | summary / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Before / after on screen | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Next task event | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Reset screens | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Close decision record | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Evolution&persona=P5 · P5 · mock | Evolution | Open recorded decision JSON | — | a / app | works | URL → /runs/mock/decisions/night-08/P5.json |
| /dashboard?run=mock&view=Releases&persona=P3 · P3 · mock | Releases | Inspect P1 v1.1 migration | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Releases&persona=P3 · P3 · mock | Releases | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Releases&persona=P3 · P3 · mock | Releases | Inspect P1 v2 migration | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Releases&persona=P3 · P3 · mock | Releases | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Releases&persona=P3 · P3 · mock | Releases | Inspect P2 v1.1 migration | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Releases&persona=P3 · P3 · mock | Releases | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Releases&persona=P3 · P3 · mock | Releases | Inspect P2 v2 migration | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Releases&persona=P3 · P3 · mock | Releases | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Releases&persona=P3 · P3 · mock | Releases | Inspect P3 v1.1 migration | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Releases&persona=P3 · P3 · mock | Releases | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Releases&persona=P3 · P3 · mock | Releases | Inspect P3 v2 migration | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Releases&persona=P3 · P3 · mock | Releases | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Releases&persona=P3 · P3 · mock | Releases | Inspect P4 v1.1 migration | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Releases&persona=P3 · P3 · mock | Releases | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Releases&persona=P3 · P3 · mock | Releases | Inspect P4 v2 migration | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Releases&persona=P3 · P3 · mock | Releases | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Releases&persona=P3 · P3 · mock | Releases | Inspect P5 v1.1 migration | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Releases&persona=P3 · P3 · mock | Releases | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Releases&persona=P3 · P3 · mock | Releases | Inspect P5 v2 migration | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Releases&persona=P3 · P3 · mock | Releases | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Try+to+break+it&persona=P3 · P3 · mock | Try to break it | Show recorded verdict | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Try+to+break+it&persona=P3 · P3 · mock | Try to break it | Show recorded verdict | — | button / app | disabled-with-reason | Already showing this recorded verdict |
| /dashboard?run=mock&view=Try+to+break+it&persona=P3 · P3 · mock | Try to break it | Replay counterexample | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Try+to+break+it&persona=P3 · P3 · mock | Try to break it | Close EHR replay | — | button / app | works | DOM changed |
| /dashboard?run=mock&view=Try+to+break+it&persona=P3 · P3 · mock | Try to break it | Close decision record | — | button / app | works | DOM changed |
| / · P1 · canonical-P1 | home | 1Patient workspace | — | nav/stepper → home; missing click metadata / lean | dead | Static label for home; no interpreter click component supplied |
| /?audit=buttons · P1 · canonical-P1 | home | Search chart | home.chartSearch | search / {"search":{"scope":"chart"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| /?audit=buttons · P1 · canonical-P1 | home | Clinic visit: start rooming | home.work.w1Rooming | click / {"button":{"action":{"goto":{"screen":"w1Rooming"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | home | In-basket: results | home.work.w2Inbasket | click / {"button":{"action":{"goto":{"screen":"w2Inbasket"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | home | In-basket: refill requests | home.work.w7Queue | click / {"button":{"action":{"goto":{"screen":"w7Queue"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | home | Emergency department: track board | home.work.w3TrackBoard | click / {"button":{"action":{"goto":{"screen":"w3TrackBoard"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | home | Ward: shift worklist and MAR | home.work.w4Worklist | click / {"button":{"action":{"goto":{"screen":"w4Worklist"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | home | Pediatric clinic: start rooming | home.work.w5Rooming | click / {"button":{"action":{"goto":{"screen":"w5Rooming"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | home | Surgery: ED consult | home.work.w6Consult | click / {"button":{"action":{"goto":{"screen":"w6Consult"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | home | Surgery: pre-op | home.work.w6PreOp | click / {"button":{"action":{"goto":{"screen":"w6PreOp"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | home | Surgery: op note | home.work.w6OpNote | click / {"button":{"action":{"goto":{"screen":"w6OpNote"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | home | Surgery: post-op orders | home.work.w6PostOp | click / {"button":{"action":{"goto":{"screen":"w6PostOp"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | home | Surgery: rounding | home.work.w6Rounding | click / {"button":{"action":{"goto":{"screen":"w6Rounding"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | home | Surgery: discharge | home.work.w6Discharge | click / {"button":{"action":{"goto":{"screen":"w6Discharge"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | home | Problem list | home.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | home | Results | home.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | home | Notes | home.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | home | Medications | home.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | home | Allergies | home.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | home | Encounters | home.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | home | Coverage | home.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | home | History | home.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
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
| /?audit=buttons · P1 · canonical-P1 | w1Rooming | Collapse section | w1Rooming.vitalsGroup | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
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
| /?audit=buttons · P1 · canonical-P1 | w1Rooming | /medplum/fhir/R4/Provenance/b11aac01-93e2-429a-a090-c6110569458d | — | button / app | works | DOM changed |
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
| /?audit=buttons · P1 · canonical-P1 | w1Rooming | Next: medication reconciliation | w1Rooming.next | click / {"button":{"action":{"goto":{"screen":"w1MedRec"}}}} / lean | works | Lean state changed; result "ok" |
| / · P1 · canonical-P1 | w2Inbasket | 1In-basket | — | nav/stepper → w2Inbasket; missing click metadata / lean | dead | Static label for w2Inbasket; no interpreter click component supplied |
| / · P1 · canonical-P1 | w2Inbasket | 2Result | — | nav/stepper → w2Result; missing click metadata / lean | dead | Static label for w2Result; no interpreter click component supplied |
| / · P1 · canonical-P1 | w2Inbasket | 3Message patient | — | nav/stepper → w2Message; missing click metadata / lean | dead | Static label for w2Message; no interpreter click component supplied |
| /?audit=buttons · P1 · canonical-P1 | w2Inbasket | Search chart | w2Inbasket.chartSearch | search / {"search":{"scope":"chart"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Inbasket | Search in-basket | w2Inbasket.basketSearch | search / {"search":{"scope":"inbasket"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Inbasket | Back | w2Inbasket.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Inbasket | Patient workspace | w2Inbasket.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Inbasket | Result | w2Inbasket.nav.w2Result | click / {"button":{"action":{"goto":{"screen":"w2Result"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Inbasket | Message patient | w2Inbasket.nav.w2Message | click / {"button":{"action":{"goto":{"screen":"w2Message"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Inbasket | All results | w2Inbasket.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Inbasket | Notes | w2Inbasket.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Inbasket | Encounters | w2Inbasket.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Inbasket | Imaging | w2Inbasket.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Inbasket | Open result | w2Inbasket.openResult | click / {"button":{"action":{"goto":{"screen":"w2Result"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Inbasket | Refill requests folder | w2Inbasket.refills | click / {"button":{"action":{"goto":{"screen":"w7Queue"}}}} / lean | works | Lean state changed; result "ok" |
| / · P1 · canonical-P1 | w7Queue | 1Refill requests | — | nav/stepper → w7Queue; missing click metadata / lean | dead | Static label for w7Queue; no interpreter click component supplied |
| / · P1 · canonical-P1 | w7Queue | 2Refill: chart review | — | nav/stepper → w7Review; missing click metadata / lean | dead | Static label for w7Review; no interpreter click component supplied |
| / · P1 · canonical-P1 | w7Queue | 3Refill decision | — | nav/stepper → w7Decision; missing click metadata / lean | dead | Static label for w7Decision; no interpreter click component supplied |
| /?audit=buttons · P1 · canonical-P1 | w7Queue | Search chart | w7Queue.chartSearch | search / {"search":{"scope":"chart"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Queue | Back | w7Queue.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Queue | Patient workspace | w7Queue.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Queue | Chart review | w7Queue.nav.w7Review | click / {"button":{"action":{"goto":{"screen":"w7Review"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Queue | In-basket | w7Queue.nav.w2Inbasket | click / {"button":{"action":{"goto":{"screen":"w2Inbasket"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Queue | Encounters | w7Queue.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Queue | Imaging | w7Queue.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Queue | Care gaps | w7Queue.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Queue | Open request | w7Queue.open | click / {"button":{"action":{"goto":{"screen":"w7Review"}}}} / lean | works | Lean state changed; result "ok" |
| / · P1 · canonical-P1 | w3TrackBoard | 1ED board | — | nav/stepper → w3TrackBoard; missing click metadata / lean | dead | Static label for w3TrackBoard; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3TrackBoard | 2Triage | — | nav/stepper → w3Triage; missing click metadata / lean | dead | Static label for w3Triage; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3TrackBoard | 3ED evaluation | — | nav/stepper → w3Provider; missing click metadata / lean | dead | Static label for w3Provider; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3TrackBoard | 4ED order sets | — | nav/stepper → w3OrderSets; missing click metadata / lean | dead | Static label for w3OrderSets; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3TrackBoard | 5Orders | — | nav/stepper → w3Orders; missing click metadata / lean | dead | Static label for w3Orders; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3TrackBoard | 6Sign orders | — | nav/stepper → w3Sign; missing click metadata / lean | dead | Static label for w3Sign; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3TrackBoard | 7Disposition | — | nav/stepper → w3Disposition; missing click metadata / lean | dead | Static label for w3Disposition; no interpreter click component supplied |
| /?audit=buttons · P1 · canonical-P1 | w3TrackBoard | Search chart | w3TrackBoard.chartSearch | search / {"search":{"scope":"chart"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3TrackBoard | Back | w3TrackBoard.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3TrackBoard | Patient workspace | w3TrackBoard.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3TrackBoard | Triage | w3TrackBoard.nav.w3Triage | click / {"button":{"action":{"goto":{"screen":"w3Triage"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3TrackBoard | Provider note | w3TrackBoard.nav.w3Provider | click / {"button":{"action":{"goto":{"screen":"w3Provider"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3TrackBoard | Order sets | w3TrackBoard.nav.w3OrderSets | click / {"button":{"action":{"goto":{"screen":"w3OrderSets"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3TrackBoard | Orders | w3TrackBoard.nav.w3Orders | click / {"button":{"action":{"goto":{"screen":"w3Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3TrackBoard | Disposition | w3TrackBoard.nav.w3Disposition | click / {"button":{"action":{"goto":{"screen":"w3Disposition"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3TrackBoard | Results | w3TrackBoard.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3TrackBoard | Imaging | w3TrackBoard.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3TrackBoard | Notes | w3TrackBoard.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3TrackBoard | Encounters | w3TrackBoard.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3TrackBoard | Open patient | w3TrackBoard.open | click / {"button":{"action":{"goto":{"screen":"w3Triage"}}}} / lean | works | Lean state changed; result "ok" |
| / · P1 · canonical-P1 | w4Worklist | 1Shift worklist | — | nav/stepper → w4Worklist; missing click metadata / lean | dead | Static label for w4Worklist; no interpreter click component supplied |
| / · P1 · canonical-P1 | w4Worklist | 2MAR | — | nav/stepper → w4Mar; missing click metadata / lean | dead | Static label for w4Mar; no interpreter click component supplied |
| / · P1 · canonical-P1 | w4Worklist | 3Administer medication | — | nav/stepper → w4Admin; missing click metadata / lean | dead | Static label for w4Admin; no interpreter click component supplied |
| / · P1 · canonical-P1 | w4Worklist | 4Flowsheet | — | nav/stepper → w4Flowsheet; missing click metadata / lean | dead | Static label for w4Flowsheet; no interpreter click component supplied |
| / · P1 · canonical-P1 | w4Worklist | 5Handoff | — | nav/stepper → w4Handoff; missing click metadata / lean | dead | Static label for w4Handoff; no interpreter click component supplied |
| /?audit=buttons · P1 · canonical-P1 | w4Worklist | Search chart | w4Worklist.chartSearch | search / {"search":{"scope":"chart"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w4Worklist | Collapse section | w4Worklist.allergyGroup | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w4Worklist | Mark allergies reviewed (start of shift) | w4Worklist.review.allergyList | click / {"button":{"action":{"markReviewed":{"info":"allergyList"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons · P1 · canonical-P1 | w4Worklist | /medplum/fhir/R4/Provenance/5c93a1b5-923f-40dc-8a85-ccfcbcf205bc | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · canonical-P1 | w4Worklist | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · canonical-P1 | w4Worklist | Back | w4Worklist.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w4Worklist | Patient workspace | w4Worklist.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w4Worklist | MAR | w4Worklist.nav.w4Mar | click / {"button":{"action":{"goto":{"screen":"w4Mar"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w4Worklist | Flowsheet | w4Worklist.nav.w4Flowsheet | click / {"button":{"action":{"goto":{"screen":"w4Flowsheet"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w4Worklist | Handoff | w4Worklist.nav.w4Handoff | click / {"button":{"action":{"goto":{"screen":"w4Handoff"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w4Worklist | New orders | w4Worklist.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w4Worklist | Results | w4Worklist.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w4Worklist | Notes | w4Worklist.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w4Worklist | Encounters | w4Worklist.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w4Worklist | Open MAR | w4Worklist.toMar | click / {"button":{"action":{"goto":{"screen":"w4Mar"}}}} / lean | works | Lean state changed; result "ok" |
| / · P1 · canonical-P1 | w5Rooming | 1Pediatric rooming | — | nav/stepper → w5Rooming; missing click metadata / lean | dead | Static label for w5Rooming; no interpreter click component supplied |
| / · P1 · canonical-P1 | w5Rooming | 2Growth review | — | nav/stepper → w5Growth; missing click metadata / lean | dead | Static label for w5Growth; no interpreter click component supplied |
| / · P1 · canonical-P1 | w5Rooming | 3Orders (weight-based) | — | nav/stepper → w5Orders; missing click metadata / lean | dead | Static label for w5Orders; no interpreter click component supplied |
| / · P1 · canonical-P1 | w5Rooming | 4Sign orders | — | nav/stepper → w5Sign; missing click metadata / lean | dead | Static label for w5Sign; no interpreter click component supplied |
| / · P1 · canonical-P1 | w5Rooming | 5Immunizations | — | nav/stepper → w5Immunizations; missing click metadata / lean | dead | Static label for w5Immunizations; no interpreter click component supplied |
| / · P1 · canonical-P1 | w5Rooming | 6Visit close | — | nav/stepper → w5Close; missing click metadata / lean | dead | Static label for w5Close; no interpreter click component supplied |
| /?audit=buttons · P1 · canonical-P1 | w5Rooming | Search chart | w5Rooming.chartSearch | search / {"search":{"scope":"chart"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w5Rooming | Collapse section | w5Rooming.measures | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w5Rooming | Collapse section | w5Rooming.allergyGroup | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w5Rooming | Mark allergies reviewed | w5Rooming.review.allergyList | click / {"button":{"action":{"markReviewed":{"info":"allergyList"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons · P1 · canonical-P1 | w5Rooming | /medplum/fhir/R4/Provenance/f58c03a7-724c-4b87-b826-499ee23f95ec | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · canonical-P1 | w5Rooming | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · canonical-P1 | w5Rooming | Collapse section | w5Rooming.medRec | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w5Rooming | Medication 1: continue / stop / modify | w5Rooming.decision0 | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"medRecDecision"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w5Rooming | Medication 2: continue / stop / modify | w5Rooming.decision1 | enter / {"field":{"slot":{"fixed":{"n":1}},"prefill":"none","element":"medRecDecision"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w5Rooming | Back | w5Rooming.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w5Rooming | Patient workspace | w5Rooming.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w5Rooming | Growth | w5Rooming.nav.w5Growth | click / {"button":{"action":{"goto":{"screen":"w5Growth"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w5Rooming | Orders | w5Rooming.nav.w5Orders | click / {"button":{"action":{"goto":{"screen":"w5Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w5Rooming | Immunizations | w5Rooming.nav.w5Immunizations | click / {"button":{"action":{"goto":{"screen":"w5Immunizations"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w5Rooming | Visit close | w5Rooming.nav.w5Close | click / {"button":{"action":{"goto":{"screen":"w5Close"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w5Rooming | Growth chart | w5Rooming.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w5Rooming | Immunizations | w5Rooming.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w5Rooming | Results | w5Rooming.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w5Rooming | Notes | w5Rooming.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w5Rooming | Family history | w5Rooming.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w5Rooming | Care gaps | w5Rooming.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w5Rooming | Next: growth review | w5Rooming.next | click / {"button":{"action":{"goto":{"screen":"w5Growth"}}}} / lean | works | Lean state changed; result "ok" |
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
| /?audit=buttons · P1 · canonical-P1 | w6Consult | Diagnosis (ICD-10) | w6Consult.visitDiagnosis | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"visitDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Consult | Collapse section | w6Consult.homeMeds | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Consult | Medication 1: continue / stop / modify | w6Consult.decision0 | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"medRecDecision"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Consult | Medication 2: continue / stop / modify | w6Consult.decision1 | enter / {"field":{"slot":{"fixed":{"n":1}},"prefill":"none","element":"medRecDecision"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Consult | Back | w6Consult.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Consult | Patient workspace | w6Consult.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Consult | Consult close | w6Consult.nav.w6ConsultClose | click / {"button":{"action":{"goto":{"screen":"w6ConsultClose"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Consult | Pre-op | w6Consult.nav.w6PreOp | click / {"button":{"action":{"goto":{"screen":"w6PreOp"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Consult | Orders | w6Consult.nav.w6Orders | click / {"button":{"action":{"goto":{"screen":"w6Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Consult | Post-op order set | w6Consult.nav.w6PostOp | click / {"button":{"action":{"goto":{"screen":"w6PostOp"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Consult | Op note | w6Consult.nav.w6OpNote | click / {"button":{"action":{"goto":{"screen":"w6OpNote"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Consult | Rounding | w6Consult.nav.w6Rounding | click / {"button":{"action":{"goto":{"screen":"w6Rounding"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Consult | Discharge | w6Consult.nav.w6Discharge | click / {"button":{"action":{"goto":{"screen":"w6Discharge"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Consult | Imaging | w6Consult.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Consult | Results | w6Consult.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Consult | Notes | w6Consult.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Consult | Surgical history | w6Consult.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Consult | Encounters | w6Consult.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Consult | Next: close consult | w6Consult.next | click / {"button":{"action":{"goto":{"screen":"w6ConsultClose"}}}} / lean | works | Lean state changed; result "ok" |
| / · P1 · canonical-P1 | w6PreOp | 1Surgical consult | — | nav/stepper → w6Consult; missing click metadata / lean | dead | Static label for w6Consult; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6PreOp | 2Close consult | — | nav/stepper → w6ConsultClose; missing click metadata / lean | dead | Static label for w6ConsultClose; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6PreOp | 3Pre-op | — | nav/stepper → w6PreOp; missing click metadata / lean | dead | Static label for w6PreOp; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6PreOp | 4Orders | — | nav/stepper → w6Orders; missing click metadata / lean | dead | Static label for w6Orders; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6PreOp | 5Post-op order set | — | nav/stepper → w6PostOp; missing click metadata / lean | dead | Static label for w6PostOp; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6PreOp | 6Sign orders | — | nav/stepper → w6Sign; missing click metadata / lean | dead | Static label for w6Sign; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6PreOp | 7Brief op note | — | nav/stepper → w6OpNote; missing click metadata / lean | dead | Static label for w6OpNote; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6PreOp | 8Rounding | — | nav/stepper → w6Rounding; missing click metadata / lean | dead | Static label for w6Rounding; no interpreter click component supplied |
| / · P1 · canonical-P1 | w6PreOp | 9Discharge | — | nav/stepper → w6Discharge; missing click metadata / lean | dead | Static label for w6Discharge; no interpreter click component supplied |
| /?audit=buttons · P1 · canonical-P1 | w6PreOp | Add imaging / procedure order | w6PreOp.newServiceOrder | click / {"button":{"action":"newOrderLine"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PreOp | Kind: imaging / procedure | w6PreOp.orderKind | enter / {"field":{"slot":"current","prefill":"none","element":"orderKind"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PreOp | Service code | w6PreOp.orderCode | enter / {"field":{"slot":"current","prefill":"none","element":"orderCode"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PreOp | Request authorization (human entry) | w6PreOp.priorAuthRequest | enter / {"field":{"slot":"current","prefill":"none","element":"priorAuthRequest"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PreOp | Request service prior authorization | w6PreOp.requestServicePriorAuth | click / {"button":{"action":"requestPriorAuth"}} / lean | disabled-with-reason | no order on this line |
| /?audit=buttons · P1 · canonical-P1 | w6PreOp | Search chart | w6PreOp.chartSearch | search / {"search":{"scope":"chart"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PreOp | Surgical consent verified | w6PreOp.consentVerified | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"consentVerified"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PreOp | Back | w6PreOp.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PreOp | Patient workspace | w6PreOp.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PreOp | Consult | w6PreOp.nav.w6Consult | click / {"button":{"action":{"goto":{"screen":"w6Consult"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PreOp | Consult close | w6PreOp.nav.w6ConsultClose | click / {"button":{"action":{"goto":{"screen":"w6ConsultClose"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PreOp | Orders | w6PreOp.nav.w6Orders | click / {"button":{"action":{"goto":{"screen":"w6Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PreOp | Post-op order set | w6PreOp.nav.w6PostOp | click / {"button":{"action":{"goto":{"screen":"w6PostOp"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PreOp | Op note | w6PreOp.nav.w6OpNote | click / {"button":{"action":{"goto":{"screen":"w6OpNote"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PreOp | Rounding | w6PreOp.nav.w6Rounding | click / {"button":{"action":{"goto":{"screen":"w6Rounding"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PreOp | Discharge | w6PreOp.nav.w6Discharge | click / {"button":{"action":{"goto":{"screen":"w6Discharge"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PreOp | Imaging | w6PreOp.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PreOp | Results | w6PreOp.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PreOp | Notes | w6PreOp.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PreOp | Surgical history | w6PreOp.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PreOp | Encounters | w6PreOp.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PreOp | Pre-op orders | w6PreOp.toOrders | click / {"button":{"action":{"goto":{"screen":"w6Orders"}}}} / lean | works | Lean state changed; result "ok" |
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
| /?audit=buttons · P1 · canonical-P1 | w6OpNote | Collapse section | w6OpNote.note | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6OpNote | Back | w6OpNote.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6OpNote | Patient workspace | w6OpNote.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6OpNote | Consult | w6OpNote.nav.w6Consult | click / {"button":{"action":{"goto":{"screen":"w6Consult"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6OpNote | Consult close | w6OpNote.nav.w6ConsultClose | click / {"button":{"action":{"goto":{"screen":"w6ConsultClose"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6OpNote | Pre-op | w6OpNote.nav.w6PreOp | click / {"button":{"action":{"goto":{"screen":"w6PreOp"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6OpNote | Orders | w6OpNote.nav.w6Orders | click / {"button":{"action":{"goto":{"screen":"w6Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6OpNote | Post-op order set | w6OpNote.nav.w6PostOp | click / {"button":{"action":{"goto":{"screen":"w6PostOp"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6OpNote | Rounding | w6OpNote.nav.w6Rounding | click / {"button":{"action":{"goto":{"screen":"w6Rounding"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6OpNote | Discharge | w6OpNote.nav.w6Discharge | click / {"button":{"action":{"goto":{"screen":"w6Discharge"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6OpNote | Imaging | w6OpNote.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6OpNote | Results | w6OpNote.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6OpNote | Notes | w6OpNote.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6OpNote | Surgical history | w6OpNote.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6OpNote | Encounters | w6OpNote.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6OpNote | Next: post-op orders | w6OpNote.next | click / {"button":{"action":{"goto":{"screen":"w6PostOp"}}}} / lean | works | Lean state changed; result "ok" |
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
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Appendectomy post-op order set | w6PostOp.appendectomySet | click / {"macro":{"id":"w6AppendectomySet"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Collapse section | w6PostOp.care | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Diet | w6PostOp.postOpDiet | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"postOpDiet"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Activity | w6PostOp.postOpActivity | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"postOpActivity"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | VTE prophylaxis: mechanical | w6PostOp.vteMechanical | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"vteMechanical"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Morning labs | w6PostOp.postOpLabs | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"postOpLabs"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Vital signs frequency | w6PostOp.postOpVitalsFreq | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"postOpVitalsFreq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Collapse section | w6PostOp.row10 | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Collapse section | w6PostOp.row10.medication | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Enter Medication | w6PostOp.row10.drug | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Antibiotic indication (required for antibiotics) | w6PostOp.row10.abxIndication | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"abxIndication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Dose unit | w6PostOp.row10.doseUnit | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"doseUnit"}} / lean | works | DOM changed |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Route | w6PostOp.row10.route | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Frequency | w6PostOp.row10.freq | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | As needed (PRN) | w6PostOp.row10.prn | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"prn"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Collapse section | w6PostOp.row10.dispense | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Duration | w6PostOp.row10.duration | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Generic substitution allowed | w6PostOp.row10.substitution | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"substitution"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Collapse section | w6PostOp.row10.dx | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Pharmacy | w6PostOp.row10.pharmacy | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":{"fromRecord":{"fact":"preferredPharmacy"}},"element":"pharmacy"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Associated diagnosis (ICD-10) | w6PostOp.row10.orderDiagnosis | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":{"linked":{"element":"visitDiagnosis"}},"element":"orderDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Collapse section | w6PostOp.row11 | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Collapse section | w6PostOp.row11.medication | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Enter Medication | w6PostOp.row11.drug | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Antibiotic indication (required for antibiotics) | w6PostOp.row11.abxIndication | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"abxIndication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Dose unit | w6PostOp.row11.doseUnit | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"doseUnit"}} / lean | works | DOM changed |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Route | w6PostOp.row11.route | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Frequency | w6PostOp.row11.freq | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | As needed (PRN) | w6PostOp.row11.prn | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"prn"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Collapse section | w6PostOp.row11.dispense | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Duration | w6PostOp.row11.duration | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Generic substitution allowed | w6PostOp.row11.substitution | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"substitution"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Collapse section | w6PostOp.row11.dx | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Pharmacy | w6PostOp.row11.pharmacy | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":{"fromRecord":{"fact":"preferredPharmacy"}},"element":"pharmacy"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Associated diagnosis (ICD-10) | w6PostOp.row11.orderDiagnosis | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":{"linked":{"element":"visitDiagnosis"}},"element":"orderDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Collapse section | w6PostOp.row12 | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Collapse section | w6PostOp.row12.medication | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Enter Medication | w6PostOp.row12.drug | enter / {"field":{"slot":{"fixed":{"n":12}},"prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Antibiotic indication (required for antibiotics) | w6PostOp.row12.abxIndication | enter / {"field":{"slot":{"fixed":{"n":12}},"prefill":"none","element":"abxIndication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Dose unit | w6PostOp.row12.doseUnit | enter / {"field":{"slot":{"fixed":{"n":12}},"prefill":"none","element":"doseUnit"}} / lean | works | DOM changed |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Route | w6PostOp.row12.route | enter / {"field":{"slot":{"fixed":{"n":12}},"prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Frequency | w6PostOp.row12.freq | enter / {"field":{"slot":{"fixed":{"n":12}},"prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | As needed (PRN) | w6PostOp.row12.prn | enter / {"field":{"slot":{"fixed":{"n":12}},"prefill":"none","element":"prn"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Collapse section | w6PostOp.row12.dispense | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Duration | w6PostOp.row12.duration | enter / {"field":{"slot":{"fixed":{"n":12}},"prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Generic substitution allowed | w6PostOp.row12.substitution | enter / {"field":{"slot":{"fixed":{"n":12}},"prefill":"none","element":"substitution"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Collapse section | w6PostOp.row12.dx | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Pharmacy | w6PostOp.row12.pharmacy | enter / {"field":{"slot":{"fixed":{"n":12}},"prefill":{"fromRecord":{"fact":"preferredPharmacy"}},"element":"pharmacy"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Associated diagnosis (ICD-10) | w6PostOp.row12.orderDiagnosis | enter / {"field":{"slot":{"fixed":{"n":12}},"prefill":{"linked":{"element":"visitDiagnosis"}},"element":"orderDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Collapse section | w6PostOp.row13 | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Collapse section | w6PostOp.row13.medication | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Enter Medication | w6PostOp.row13.drug | enter / {"field":{"slot":{"fixed":{"n":13}},"prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Antibiotic indication (required for antibiotics) | w6PostOp.row13.abxIndication | enter / {"field":{"slot":{"fixed":{"n":13}},"prefill":"none","element":"abxIndication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Dose unit | w6PostOp.row13.doseUnit | enter / {"field":{"slot":{"fixed":{"n":13}},"prefill":"none","element":"doseUnit"}} / lean | works | DOM changed |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Route | w6PostOp.row13.route | enter / {"field":{"slot":{"fixed":{"n":13}},"prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Frequency | w6PostOp.row13.freq | enter / {"field":{"slot":{"fixed":{"n":13}},"prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | As needed (PRN) | w6PostOp.row13.prn | enter / {"field":{"slot":{"fixed":{"n":13}},"prefill":"none","element":"prn"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Collapse section | w6PostOp.row13.dispense | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Duration | w6PostOp.row13.duration | enter / {"field":{"slot":{"fixed":{"n":13}},"prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Generic substitution allowed | w6PostOp.row13.substitution | enter / {"field":{"slot":{"fixed":{"n":13}},"prefill":"none","element":"substitution"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Collapse section | w6PostOp.row13.dx | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Pharmacy | w6PostOp.row13.pharmacy | enter / {"field":{"slot":{"fixed":{"n":13}},"prefill":{"fromRecord":{"fact":"preferredPharmacy"}},"element":"pharmacy"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Associated diagnosis (ICD-10) | w6PostOp.row13.orderDiagnosis | enter / {"field":{"slot":{"fixed":{"n":13}},"prefill":{"linked":{"element":"visitDiagnosis"}},"element":"orderDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Back | w6PostOp.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Patient workspace | w6PostOp.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Consult | w6PostOp.nav.w6Consult | click / {"button":{"action":{"goto":{"screen":"w6Consult"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Consult close | w6PostOp.nav.w6ConsultClose | click / {"button":{"action":{"goto":{"screen":"w6ConsultClose"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Pre-op | w6PostOp.nav.w6PreOp | click / {"button":{"action":{"goto":{"screen":"w6PreOp"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Orders | w6PostOp.nav.w6Orders | click / {"button":{"action":{"goto":{"screen":"w6Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Op note | w6PostOp.nav.w6OpNote | click / {"button":{"action":{"goto":{"screen":"w6OpNote"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Rounding | w6PostOp.nav.w6Rounding | click / {"button":{"action":{"goto":{"screen":"w6Rounding"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Discharge | w6PostOp.nav.w6Discharge | click / {"button":{"action":{"goto":{"screen":"w6Discharge"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Imaging | w6PostOp.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Results | w6PostOp.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Notes | w6PostOp.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Surgical history | w6PostOp.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Encounters | w6PostOp.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Review and sign | w6PostOp.toSign | click / {"button":{"action":{"goto":{"screen":"w6Sign"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6PostOp | Add single orders | w6PostOp.toOrders | click / {"button":{"action":{"goto":{"screen":"w6Orders"}}}} / lean | works | Lean state changed; result "ok" |
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
| /?audit=buttons · P1 · canonical-P1 | w6Rounding | Back | w6Rounding.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Rounding | Patient workspace | w6Rounding.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Rounding | Consult | w6Rounding.nav.w6Consult | click / {"button":{"action":{"goto":{"screen":"w6Consult"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Rounding | Consult close | w6Rounding.nav.w6ConsultClose | click / {"button":{"action":{"goto":{"screen":"w6ConsultClose"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Rounding | Pre-op | w6Rounding.nav.w6PreOp | click / {"button":{"action":{"goto":{"screen":"w6PreOp"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Rounding | Orders | w6Rounding.nav.w6Orders | click / {"button":{"action":{"goto":{"screen":"w6Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Rounding | Post-op order set | w6Rounding.nav.w6PostOp | click / {"button":{"action":{"goto":{"screen":"w6PostOp"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Rounding | Op note | w6Rounding.nav.w6OpNote | click / {"button":{"action":{"goto":{"screen":"w6OpNote"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Rounding | Discharge | w6Rounding.nav.w6Discharge | click / {"button":{"action":{"goto":{"screen":"w6Discharge"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Rounding | Imaging | w6Rounding.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Rounding | Results | w6Rounding.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Rounding | Notes | w6Rounding.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Rounding | Surgical history | w6Rounding.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Rounding | Encounters | w6Rounding.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Rounding | Modify orders | w6Rounding.modify | click / {"button":{"action":{"goto":{"screen":"w6Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Rounding | Discharge | w6Rounding.toDischarge | click / {"button":{"action":{"goto":{"screen":"w6Discharge"}}}} / lean | works | Lean state changed; result "ok" |
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
| /?audit=buttons · P1 · canonical-P1 | w6Discharge | Collapse section | w6Discharge.medRec | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Discharge | Medication 1: continue / stop / change / new | w6Discharge.decision0 | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"dischargeMedRec"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Discharge | Medication 2: continue / stop / change / new | w6Discharge.decision1 | enter / {"field":{"slot":{"fixed":{"n":1}},"prefill":"none","element":"dischargeMedRec"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Discharge | Medication 3: continue / stop / change / new | w6Discharge.decision2 | enter / {"field":{"slot":{"fixed":{"n":2}},"prefill":"none","element":"dischargeMedRec"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Discharge | Medication 4: continue / stop / change / new | w6Discharge.decision3 | enter / {"field":{"slot":{"fixed":{"n":3}},"prefill":"none","element":"dischargeMedRec"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Discharge | Discharge diagnosis (ICD-10) | w6Discharge.dischargeDiagnosis | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"dischargeDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Discharge | Follow-up appointment | w6Discharge.dischargeFollowUp | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"dischargeFollowUp"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Discharge | Instructions: appendectomy | w6Discharge.instructionsTemplate | click / {"macro":{"id":"w6DischargeTemplate"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Discharge | Condition at discharge | w6Discharge.dischargeCondition | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"dischargeCondition"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Discharge | Discharge to | w6Discharge.dischargeDestination | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"dischargeDestination"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Discharge | Discharge patient | w6Discharge.commit.discharge | click / {"button":{"action":{"commit":{"commit":"discharge"}}}} / lean | disabled-with-reason | entry required: Discharge medication decision |
| /?audit=buttons · P1 · canonical-P1 | w6Discharge | Back | w6Discharge.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Discharge | Patient workspace | w6Discharge.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Discharge | Consult | w6Discharge.nav.w6Consult | click / {"button":{"action":{"goto":{"screen":"w6Consult"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Discharge | Consult close | w6Discharge.nav.w6ConsultClose | click / {"button":{"action":{"goto":{"screen":"w6ConsultClose"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Discharge | Pre-op | w6Discharge.nav.w6PreOp | click / {"button":{"action":{"goto":{"screen":"w6PreOp"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Discharge | Orders | w6Discharge.nav.w6Orders | click / {"button":{"action":{"goto":{"screen":"w6Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Discharge | Post-op order set | w6Discharge.nav.w6PostOp | click / {"button":{"action":{"goto":{"screen":"w6PostOp"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Discharge | Op note | w6Discharge.nav.w6OpNote | click / {"button":{"action":{"goto":{"screen":"w6OpNote"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Discharge | Rounding | w6Discharge.nav.w6Rounding | click / {"button":{"action":{"goto":{"screen":"w6Rounding"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Discharge | Imaging | w6Discharge.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Discharge | Results | w6Discharge.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Discharge | Notes | w6Discharge.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Discharge | Surgical history | w6Discharge.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Discharge | Encounters | w6Discharge.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w6Discharge | Discharge prescriptions | w6Discharge.prescriptions | click / {"button":{"action":{"goto":{"screen":"w6Orders"}}}} / lean | works | Lean state changed; result "ok" |
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
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Mark medications reviewed | w1MedRec.review.currentMeds | click / {"button":{"action":{"markReviewed":{"info":"currentMeds"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | /medplum/fhir/R4/Provenance/34888eb5-edca-43af-b1c5-d98a5dada2d4 | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Collapse section | w1MedRec.rows | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Medication 1: continue / stop / modify | w1MedRec.decision0 | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"medRecDecision"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Medication 2: continue / stop / modify | w1MedRec.decision1 | enter / {"field":{"slot":{"fixed":{"n":1}},"prefill":"none","element":"medRecDecision"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Medication 3: continue / stop / modify | w1MedRec.decision2 | enter / {"field":{"slot":{"fixed":{"n":2}},"prefill":"none","element":"medRecDecision"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Medication 4: continue / stop / modify | w1MedRec.decision3 | enter / {"field":{"slot":{"fixed":{"n":3}},"prefill":"none","element":"medRecDecision"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Last plan | w1MedRec.medTabs | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Fill history | w1MedRec.medTabs | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Back | w1MedRec.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Patient workspace | w1MedRec.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Rooming | w1MedRec.nav.w1Rooming | click / {"button":{"action":{"goto":{"screen":"w1Rooming"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | HPI / ROS | w1MedRec.nav.w1Hpi | click / {"button":{"action":{"goto":{"screen":"w1Hpi"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Exam / A&P | w1MedRec.nav.w1Exam | click / {"button":{"action":{"goto":{"screen":"w1Exam"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Orders | w1MedRec.nav.w1Orders | click / {"button":{"action":{"goto":{"screen":"w1Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Labs | w1MedRec.nav.w1Labs | click / {"button":{"action":{"goto":{"screen":"w1Labs"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Visit close | w1MedRec.nav.w1Close | click / {"button":{"action":{"goto":{"screen":"w1Close"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Results | w1MedRec.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Imaging | w1MedRec.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Notes | w1MedRec.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Encounters | w1MedRec.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Social history | w1MedRec.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Family history | w1MedRec.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Care gaps | w1MedRec.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Immunizations | w1MedRec.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Coverage | w1MedRec.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1MedRec | Next: HPI / ROS | w1MedRec.next | click / {"button":{"action":{"goto":{"screen":"w1Hpi"}}}} / lean | works | Lean state changed; result "ok" |
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
| /?audit=buttons · P1 · canonical-P1 | w1Hpi | Copy forward last note | w1Hpi.copyForward | click / {"macro":{"id":"w1CopyForward"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Hpi | ROS template (12 systems negative) | w1Hpi.rosTemplate | click / {"macro":{"id":"w1RosTemplate"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Hpi | Expand section | w1Hpi.lastNote | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Hpi | Back | w1Hpi.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Hpi | Patient workspace | w1Hpi.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Hpi | Rooming | w1Hpi.nav.w1Rooming | click / {"button":{"action":{"goto":{"screen":"w1Rooming"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Hpi | Med rec | w1Hpi.nav.w1MedRec | click / {"button":{"action":{"goto":{"screen":"w1MedRec"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Hpi | Exam / A&P | w1Hpi.nav.w1Exam | click / {"button":{"action":{"goto":{"screen":"w1Exam"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Hpi | Orders | w1Hpi.nav.w1Orders | click / {"button":{"action":{"goto":{"screen":"w1Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Hpi | Labs | w1Hpi.nav.w1Labs | click / {"button":{"action":{"goto":{"screen":"w1Labs"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Hpi | Visit close | w1Hpi.nav.w1Close | click / {"button":{"action":{"goto":{"screen":"w1Close"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Hpi | Results | w1Hpi.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Hpi | Imaging | w1Hpi.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Hpi | Notes | w1Hpi.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Hpi | Encounters | w1Hpi.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Hpi | Social history | w1Hpi.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Hpi | Family history | w1Hpi.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Hpi | Care gaps | w1Hpi.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Hpi | Immunizations | w1Hpi.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Hpi | Coverage | w1Hpi.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Hpi | Next: exam and A&P | w1Hpi.next | click / {"button":{"action":{"goto":{"screen":"w1Exam"}}}} / lean | works | Lean state changed; result "ok" |
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
| /?audit=buttons · P1 · canonical-P1 | w1Exam | Normal exam template | w1Exam.examTemplate | click / {"macro":{"id":"w1ExamTemplate"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Exam | Visit diagnosis (ICD-10) | w1Exam.visitDiagnosis | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"visitDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Exam | Back | w1Exam.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Exam | Patient workspace | w1Exam.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Exam | Rooming | w1Exam.nav.w1Rooming | click / {"button":{"action":{"goto":{"screen":"w1Rooming"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Exam | Med rec | w1Exam.nav.w1MedRec | click / {"button":{"action":{"goto":{"screen":"w1MedRec"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Exam | HPI / ROS | w1Exam.nav.w1Hpi | click / {"button":{"action":{"goto":{"screen":"w1Hpi"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Exam | Orders | w1Exam.nav.w1Orders | click / {"button":{"action":{"goto":{"screen":"w1Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Exam | Labs | w1Exam.nav.w1Labs | click / {"button":{"action":{"goto":{"screen":"w1Labs"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Exam | Visit close | w1Exam.nav.w1Close | click / {"button":{"action":{"goto":{"screen":"w1Close"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Exam | Results | w1Exam.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Exam | Imaging | w1Exam.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Exam | Notes | w1Exam.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Exam | Encounters | w1Exam.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Exam | Social history | w1Exam.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Exam | Family history | w1Exam.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Exam | Care gaps | w1Exam.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Exam | Immunizations | w1Exam.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Exam | Coverage | w1Exam.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Exam | Next: orders | w1Exam.next | click / {"button":{"action":{"goto":{"screen":"w1Orders"}}}} / lean | works | Lean state changed; result "ok" |
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
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Collapse section | w1Orders.prefList | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Lisinopril 10 mg daily | w1Orders.prefLisinopril | click / {"macro":{"id":"w1PrefLisinopril"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Atorvastatin 40 mg daily | w1Orders.prefAtorvastatin | click / {"macro":{"id":"w1PrefAtorvastatin"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Metformin 500 mg BID | w1Orders.prefMetformin | click / {"macro":{"id":"w1PrefMetformin"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Amoxicillin 1 g TID × 10 days | w1Orders.prefAmoxicillin | click / {"macro":{"id":"w1PrefAmoxicillin"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Azithromycin 500 mg daily × 5 days | w1Orders.prefAzithromycin | click / {"macro":{"id":"w1PrefAzithromycin"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Ibuprofen 600 mg TID | w1Orders.prefIbuprofen | click / {"macro":{"id":"w1PrefIbuprofen"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Oxycodone 10 mg q6h PRN × 5 days | w1Orders.prefOxycodone | click / {"macro":{"id":"w1PrefOxycodone"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Collapse section | w1Orders.dosing | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
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
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Patient workspace | w1Orders.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Rooming | w1Orders.nav.w1Rooming | click / {"button":{"action":{"goto":{"screen":"w1Rooming"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Med rec | w1Orders.nav.w1MedRec | click / {"button":{"action":{"goto":{"screen":"w1MedRec"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | HPI / ROS | w1Orders.nav.w1Hpi | click / {"button":{"action":{"goto":{"screen":"w1Hpi"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Exam / A&P | w1Orders.nav.w1Exam | click / {"button":{"action":{"goto":{"screen":"w1Exam"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Labs | w1Orders.nav.w1Labs | click / {"button":{"action":{"goto":{"screen":"w1Labs"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Visit close | w1Orders.nav.w1Close | click / {"button":{"action":{"goto":{"screen":"w1Close"}}}} / lean | works | Lean state changed; result "ok" |
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
| /?audit=buttons · P1 · canonical-P1 | w1Orders | Lab orders | w1Orders.to.w1Labs | click / {"button":{"action":{"goto":{"screen":"w1Labs"}}}} / lean | works | Lean state changed; result "ok" |
| / · P1 · canonical-P1 | w1Labs | 1Rooming | — | nav/stepper → w1Rooming; missing click metadata / lean | dead | Static label for w1Rooming; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Labs | 2Med rec | — | nav/stepper → w1MedRec; missing click metadata / lean | dead | Static label for w1MedRec; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Labs | 3HPI / ROS | — | nav/stepper → w1Hpi; missing click metadata / lean | dead | Static label for w1Hpi; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Labs | 4Exam / A&P | — | nav/stepper → w1Exam; missing click metadata / lean | dead | Static label for w1Exam; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Labs | 5Orders | — | nav/stepper → w1Orders; missing click metadata / lean | dead | Static label for w1Orders; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Labs | 6Lab orders | — | nav/stepper → w1Labs; missing click metadata / lean | dead | Static label for w1Labs; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Labs | 7Verify orders | — | nav/stepper → w1Verify; missing click metadata / lean | dead | Static label for w1Verify; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Labs | 8Sign orders | — | nav/stepper → w1Sign; missing click metadata / lean | dead | Static label for w1Sign; no interpreter click component supplied |
| / · P1 · canonical-P1 | w1Labs | 9Close visit | — | nav/stepper → w1Close; missing click metadata / lean | dead | Static label for w1Close; no interpreter click component supplied |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Add imaging / procedure order | w1Labs.newServiceOrder | click / {"button":{"action":"newOrderLine"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Kind: imaging / procedure | w1Labs.orderKind | enter / {"field":{"slot":"current","prefill":"none","element":"orderKind"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Service code | w1Labs.orderCode | enter / {"field":{"slot":"current","prefill":"none","element":"orderCode"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Request authorization (human entry) | w1Labs.priorAuthRequest | enter / {"field":{"slot":"current","prefill":"none","element":"priorAuthRequest"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Request service prior authorization | w1Labs.requestServicePriorAuth | click / {"button":{"action":"requestPriorAuth"}} / lean | disabled-with-reason | no order on this line |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Search chart | w1Labs.chartSearch | search / {"search":{"scope":"chart"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Search lab tests | w1Labs.labSearch | search / {"search":{"scope":"loinc"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Collapse section | w1Labs.labOrder | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Test | w1Labs.labTest | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"labTest"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Diagnosis (ICD-10) | w1Labs.labDiagnosis | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":{"linked":{"element":"visitDiagnosis"}},"element":"labDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Priority | w1Labs.labPriority | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"labPriority"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Fasting required | w1Labs.labFasting | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"labFasting"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Back | w1Labs.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Patient workspace | w1Labs.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Rooming | w1Labs.nav.w1Rooming | click / {"button":{"action":{"goto":{"screen":"w1Rooming"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Med rec | w1Labs.nav.w1MedRec | click / {"button":{"action":{"goto":{"screen":"w1MedRec"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | HPI / ROS | w1Labs.nav.w1Hpi | click / {"button":{"action":{"goto":{"screen":"w1Hpi"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Exam / A&P | w1Labs.nav.w1Exam | click / {"button":{"action":{"goto":{"screen":"w1Exam"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Orders | w1Labs.nav.w1Orders | click / {"button":{"action":{"goto":{"screen":"w1Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Visit close | w1Labs.nav.w1Close | click / {"button":{"action":{"goto":{"screen":"w1Close"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Results | w1Labs.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Imaging | w1Labs.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Notes | w1Labs.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Encounters | w1Labs.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Social history | w1Labs.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Family history | w1Labs.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Care gaps | w1Labs.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Immunizations | w1Labs.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Coverage | w1Labs.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Medication orders | w1Labs.toMeds | click / {"button":{"action":{"goto":{"screen":"w1Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Labs | Review and sign | w1Labs.toSign | click / {"button":{"action":{"goto":{"screen":"w1Verify"}}}} / lean | works | Lean state changed; result "ok" |
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
| /?audit=buttons · P1 · canonical-P1 | w1Close | Billing diagnosis (ICD-10) | w1Close.claimDiagnosis | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":{"linked":{"element":"visitDiagnosis"}},"element":"claimDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Close | Level of service | w1Close.levelOfService | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"levelOfService"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Close | Follow-up | w1Close.followUp | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"followUp"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Close | Instructions template | w1Close.avsTemplate | click / {"macro":{"id":"w1AvsTemplate"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Close | Sign note | w1Close.commit.signNote | click / {"button":{"action":{"commit":{"commit":"signNote"}}}} / lean | disabled-with-reason | entry required: Chief complaint |
| /?audit=buttons · P1 · canonical-P1 | w1Close | Back | w1Close.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Close | Patient workspace | w1Close.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Close | Rooming | w1Close.nav.w1Rooming | click / {"button":{"action":{"goto":{"screen":"w1Rooming"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Close | Med rec | w1Close.nav.w1MedRec | click / {"button":{"action":{"goto":{"screen":"w1MedRec"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Close | HPI / ROS | w1Close.nav.w1Hpi | click / {"button":{"action":{"goto":{"screen":"w1Hpi"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Close | Exam / A&P | w1Close.nav.w1Exam | click / {"button":{"action":{"goto":{"screen":"w1Exam"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Close | Orders | w1Close.nav.w1Orders | click / {"button":{"action":{"goto":{"screen":"w1Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Close | Labs | w1Close.nav.w1Labs | click / {"button":{"action":{"goto":{"screen":"w1Labs"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Close | Results | w1Close.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Close | Imaging | w1Close.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Close | Notes | w1Close.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Close | Encounters | w1Close.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Close | Social history | w1Close.chart | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Close | Family history | w1Close.chart | selectTab index 5 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Close | Care gaps | w1Close.chart | selectTab index 6 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Close | Immunizations | w1Close.chart | selectTab index 7 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w1Close | Coverage | w1Close.chart | selectTab index 8 / "tabs" / lean | works | Lean state changed; result "ok" |
| / · P1 · canonical-P1 | w2Result | 1In-basket | — | nav/stepper → w2Inbasket; missing click metadata / lean | dead | Static label for w2Inbasket; no interpreter click component supplied |
| / · P1 · canonical-P1 | w2Result | 2Result | — | nav/stepper → w2Result; missing click metadata / lean | dead | Static label for w2Result; no interpreter click component supplied |
| / · P1 · canonical-P1 | w2Result | 3Message patient | — | nav/stepper → w2Message; missing click metadata / lean | dead | Static label for w2Message; no interpreter click component supplied |
| /?audit=buttons · P1 · canonical-P1 | w2Result | Search chart | w2Result.chartSearch | search / {"search":{"scope":"chart"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Result | Action | w2Result.resultAction | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"resultAction"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Result | Follow-up test | w2Result.resultFollowUpOrder | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"resultFollowUpOrder"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Result | Acknowledge and mark done | w2Result.commit.ackResult | click / {"button":{"action":{"commit":{"commit":"ackResult"}}}} / lean | disabled-with-reason | entry required: Result action |
| /?audit=buttons · P1 · canonical-P1 | w2Result | Back | w2Result.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Result | Patient workspace | w2Result.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Result | In-basket | w2Result.nav.w2Inbasket | click / {"button":{"action":{"goto":{"screen":"w2Inbasket"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Result | Message patient | w2Result.nav.w2Message | click / {"button":{"action":{"goto":{"screen":"w2Message"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Result | All results | w2Result.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Result | Notes | w2Result.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Result | Encounters | w2Result.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Result | Imaging | w2Result.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Result | Message patient | w2Result.message | click / {"button":{"action":{"goto":{"screen":"w2Message"}}}} / lean | works | Lean state changed; result "ok" |
| / · P1 · canonical-P1 | w2Message | 1In-basket | — | nav/stepper → w2Inbasket; missing click metadata / lean | dead | Static label for w2Inbasket; no interpreter click component supplied |
| / · P1 · canonical-P1 | w2Message | 2Result | — | nav/stepper → w2Result; missing click metadata / lean | dead | Static label for w2Result; no interpreter click component supplied |
| / · P1 · canonical-P1 | w2Message | 3Message patient | — | nav/stepper → w2Message; missing click metadata / lean | dead | Static label for w2Message; no interpreter click component supplied |
| /?audit=buttons · P1 · canonical-P1 | w2Message | Search chart | w2Message.chartSearch | search / {"search":{"scope":"chart"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Message | Template: normal result | w2Message.normalLetter | click / {"macro":{"id":"w2NormalLetter"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Message | Template: repeat the test | w2Message.repeatLetter | click / {"macro":{"id":"w2RepeatLetter"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Message | Back | w2Message.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Message | Patient workspace | w2Message.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Message | In-basket | w2Message.nav.w2Inbasket | click / {"button":{"action":{"goto":{"screen":"w2Inbasket"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Message | Result | w2Message.nav.w2Result | click / {"button":{"action":{"goto":{"screen":"w2Result"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Message | All results | w2Message.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Message | Notes | w2Message.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Message | Encounters | w2Message.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Message | Imaging | w2Message.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w2Message | Return to result | w2Message.return | click / {"button":{"action":{"goto":{"screen":"w2Result"}}}} / lean | works | Lean state changed; result "ok" |
| / · P1 · canonical-P1 | w7Review | 1Refill requests | — | nav/stepper → w7Queue; missing click metadata / lean | dead | Static label for w7Queue; no interpreter click component supplied |
| / · P1 · canonical-P1 | w7Review | 2Refill: chart review | — | nav/stepper → w7Review; missing click metadata / lean | dead | Static label for w7Review; no interpreter click component supplied |
| / · P1 · canonical-P1 | w7Review | 3Refill decision | — | nav/stepper → w7Decision; missing click metadata / lean | dead | Static label for w7Decision; no interpreter click component supplied |
| /?audit=buttons · P1 · canonical-P1 | w7Review | Search chart | w7Review.chartSearch | search / {"search":{"scope":"chart"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Review | Last visit | w7Review.refillTabs | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Review | Labs | w7Review.refillTabs | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Review | Fill history | w7Review.refillTabs | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Review | Medications | w7Review.refillTabs | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Review | Last note | w7Review.refillTabs | selectTab index 4 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Review | Mark last visit reviewed | w7Review.review.lastVisit | click / {"button":{"action":{"markReviewed":{"info":"lastVisit"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons · P1 · canonical-P1 | w7Review | /medplum/fhir/R4/Provenance/332a9e7b-c460-4b8a-880d-8546e5f38853 | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · canonical-P1 | w7Review | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · canonical-P1 | w7Review | Back | w7Review.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Review | Patient workspace | w7Review.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Review | Refill requests | w7Review.nav.w7Queue | click / {"button":{"action":{"goto":{"screen":"w7Queue"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Review | In-basket | w7Review.nav.w2Inbasket | click / {"button":{"action":{"goto":{"screen":"w2Inbasket"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Review | Encounters | w7Review.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Review | Imaging | w7Review.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Review | Care gaps | w7Review.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w7Review | Go to decision | w7Review.decide | click / {"button":{"action":{"goto":{"screen":"w7Decision"}}}} / lean | works | Lean state changed; result "ok" |
| / · P1 · canonical-P1 | w3Triage | 1ED board | — | nav/stepper → w3TrackBoard; missing click metadata / lean | dead | Static label for w3TrackBoard; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3Triage | 2Triage | — | nav/stepper → w3Triage; missing click metadata / lean | dead | Static label for w3Triage; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3Triage | 3ED evaluation | — | nav/stepper → w3Provider; missing click metadata / lean | dead | Static label for w3Provider; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3Triage | 4ED order sets | — | nav/stepper → w3OrderSets; missing click metadata / lean | dead | Static label for w3OrderSets; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3Triage | 5Orders | — | nav/stepper → w3Orders; missing click metadata / lean | dead | Static label for w3Orders; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3Triage | 6Sign orders | — | nav/stepper → w3Sign; missing click metadata / lean | dead | Static label for w3Sign; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3Triage | 7Disposition | — | nav/stepper → w3Disposition; missing click metadata / lean | dead | Static label for w3Disposition; no interpreter click component supplied |
| /?audit=buttons · P1 · canonical-P1 | w3Triage | Search chart | w3Triage.chartSearch | search / {"search":{"scope":"chart"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Triage | Collapse section | w3Triage.vitalsGroup | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Triage | Pain (0–10) | w3Triage.painScore | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"painScore"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Triage | Acuity (ESI) | w3Triage.triageAcuity | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"triageAcuity"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Triage | Arrival mode | w3Triage.arrivalMode | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"arrivalMode"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Triage | Isolation screen | w3Triage.isolationScreen | enter / {"field":{"slot":{"fixed":{"n":0}},"prefill":"none","element":"isolationScreen"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Triage | Collapse section | w3Triage.allergyGroup | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Triage | Mark allergies reviewed | w3Triage.review.allergyList | click / {"button":{"action":{"markReviewed":{"info":"allergyList"}}}} / lean | works | POST /medplum/fhir/R4 |
| /?audit=buttons · P1 · canonical-P1 | w3Triage | /medplum/fhir/R4/Provenance/a2a15e62-2d07-49ac-a342-077a228e7747 | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · canonical-P1 | w3Triage | Close saved resource | — | button / app | works | DOM changed |
| /?audit=buttons · P1 · canonical-P1 | w3Triage | Back | w3Triage.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Triage | Patient workspace | w3Triage.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Triage | Track board | w3Triage.nav.w3TrackBoard | click / {"button":{"action":{"goto":{"screen":"w3TrackBoard"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Triage | Provider note | w3Triage.nav.w3Provider | click / {"button":{"action":{"goto":{"screen":"w3Provider"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Triage | Order sets | w3Triage.nav.w3OrderSets | click / {"button":{"action":{"goto":{"screen":"w3OrderSets"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Triage | Orders | w3Triage.nav.w3Orders | click / {"button":{"action":{"goto":{"screen":"w3Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Triage | Disposition | w3Triage.nav.w3Disposition | click / {"button":{"action":{"goto":{"screen":"w3Disposition"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Triage | Results | w3Triage.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Triage | Imaging | w3Triage.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Triage | Notes | w3Triage.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Triage | Encounters | w3Triage.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Triage | Next: provider evaluation | w3Triage.next | click / {"button":{"action":{"goto":{"screen":"w3Provider"}}}} / lean | works | Lean state changed; result "ok" |
| / · P1 · canonical-P1 | w3Provider | 1ED board | — | nav/stepper → w3TrackBoard; missing click metadata / lean | dead | Static label for w3TrackBoard; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3Provider | 2Triage | — | nav/stepper → w3Triage; missing click metadata / lean | dead | Static label for w3Triage; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3Provider | 3ED evaluation | — | nav/stepper → w3Provider; missing click metadata / lean | dead | Static label for w3Provider; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3Provider | 4ED order sets | — | nav/stepper → w3OrderSets; missing click metadata / lean | dead | Static label for w3OrderSets; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3Provider | 5Orders | — | nav/stepper → w3Orders; missing click metadata / lean | dead | Static label for w3Orders; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3Provider | 6Sign orders | — | nav/stepper → w3Sign; missing click metadata / lean | dead | Static label for w3Sign; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3Provider | 7Disposition | — | nav/stepper → w3Disposition; missing click metadata / lean | dead | Static label for w3Disposition; no interpreter click component supplied |
| /?audit=buttons · P1 · canonical-P1 | w3Provider | Search chart | w3Provider.chartSearch | search / {"search":{"scope":"chart"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Provider | Back | w3Provider.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Provider | Patient workspace | w3Provider.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Provider | Track board | w3Provider.nav.w3TrackBoard | click / {"button":{"action":{"goto":{"screen":"w3TrackBoard"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Provider | Triage | w3Provider.nav.w3Triage | click / {"button":{"action":{"goto":{"screen":"w3Triage"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Provider | Order sets | w3Provider.nav.w3OrderSets | click / {"button":{"action":{"goto":{"screen":"w3OrderSets"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Provider | Orders | w3Provider.nav.w3Orders | click / {"button":{"action":{"goto":{"screen":"w3Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Provider | Disposition | w3Provider.nav.w3Disposition | click / {"button":{"action":{"goto":{"screen":"w3Disposition"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Provider | Results | w3Provider.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Provider | Imaging | w3Provider.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Provider | Notes | w3Provider.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Provider | Encounters | w3Provider.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Provider | Order sets | w3Provider.toSets | click / {"button":{"action":{"goto":{"screen":"w3OrderSets"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Provider | Single orders | w3Provider.toOrders | click / {"button":{"action":{"goto":{"screen":"w3Orders"}}}} / lean | works | Lean state changed; result "ok" |
| / · P1 · canonical-P1 | w3OrderSets | 1ED board | — | nav/stepper → w3TrackBoard; missing click metadata / lean | dead | Static label for w3TrackBoard; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3OrderSets | 2Triage | — | nav/stepper → w3Triage; missing click metadata / lean | dead | Static label for w3Triage; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3OrderSets | 3ED evaluation | — | nav/stepper → w3Provider; missing click metadata / lean | dead | Static label for w3Provider; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3OrderSets | 4ED order sets | — | nav/stepper → w3OrderSets; missing click metadata / lean | dead | Static label for w3OrderSets; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3OrderSets | 5Orders | — | nav/stepper → w3Orders; missing click metadata / lean | dead | Static label for w3Orders; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3OrderSets | 6Sign orders | — | nav/stepper → w3Sign; missing click metadata / lean | dead | Static label for w3Sign; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3OrderSets | 7Disposition | — | nav/stepper → w3Disposition; missing click metadata / lean | dead | Static label for w3Disposition; no interpreter click component supplied |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Search chart | w3OrderSets.chartSearch | search / {"search":{"scope":"chart"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Collapse section | w3OrderSets.sets | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Sepsis (adult) | w3OrderSets.sepsis | click / {"macro":{"id":"w3SepsisSet"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Abdominal pain | w3OrderSets.abdominal | click / {"macro":{"id":"w3AbdominalPainSet"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Cellulitis | w3OrderSets.cellulitis | click / {"macro":{"id":"w3CellulitisSet"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Collapse section | w3OrderSets.row10 | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Collapse section | w3OrderSets.row10.medication | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Enter Medication | w3OrderSets.row10.drug | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Antibiotic indication (required for antibiotics) | w3OrderSets.row10.abxIndication | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"abxIndication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Dose unit | w3OrderSets.row10.doseUnit | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"doseUnit"}} / lean | works | DOM changed |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Route | w3OrderSets.row10.route | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Frequency | w3OrderSets.row10.freq | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | As needed (PRN) | w3OrderSets.row10.prn | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"prn"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Collapse section | w3OrderSets.row10.dispense | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Duration | w3OrderSets.row10.duration | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Generic substitution allowed | w3OrderSets.row10.substitution | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":"none","element":"substitution"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Collapse section | w3OrderSets.row10.dx | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Pharmacy | w3OrderSets.row10.pharmacy | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":{"fromRecord":{"fact":"preferredPharmacy"}},"element":"pharmacy"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Associated diagnosis (ICD-10) | w3OrderSets.row10.orderDiagnosis | enter / {"field":{"slot":{"fixed":{"n":10}},"prefill":{"linked":{"element":"visitDiagnosis"}},"element":"orderDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Collapse section | w3OrderSets.row11 | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Collapse section | w3OrderSets.row11.medication | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Enter Medication | w3OrderSets.row11.drug | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Antibiotic indication (required for antibiotics) | w3OrderSets.row11.abxIndication | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"abxIndication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Dose unit | w3OrderSets.row11.doseUnit | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"doseUnit"}} / lean | works | DOM changed |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Route | w3OrderSets.row11.route | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Frequency | w3OrderSets.row11.freq | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | As needed (PRN) | w3OrderSets.row11.prn | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"prn"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Collapse section | w3OrderSets.row11.dispense | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Duration | w3OrderSets.row11.duration | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Generic substitution allowed | w3OrderSets.row11.substitution | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":"none","element":"substitution"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Collapse section | w3OrderSets.row11.dx | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Pharmacy | w3OrderSets.row11.pharmacy | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":{"fromRecord":{"fact":"preferredPharmacy"}},"element":"pharmacy"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Associated diagnosis (ICD-10) | w3OrderSets.row11.orderDiagnosis | enter / {"field":{"slot":{"fixed":{"n":11}},"prefill":{"linked":{"element":"visitDiagnosis"}},"element":"orderDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Back | w3OrderSets.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Patient workspace | w3OrderSets.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Track board | w3OrderSets.nav.w3TrackBoard | click / {"button":{"action":{"goto":{"screen":"w3TrackBoard"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Triage | w3OrderSets.nav.w3Triage | click / {"button":{"action":{"goto":{"screen":"w3Triage"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Provider note | w3OrderSets.nav.w3Provider | click / {"button":{"action":{"goto":{"screen":"w3Provider"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Orders | w3OrderSets.nav.w3Orders | click / {"button":{"action":{"goto":{"screen":"w3Orders"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Disposition | w3OrderSets.nav.w3Disposition | click / {"button":{"action":{"goto":{"screen":"w3Disposition"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Results | w3OrderSets.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Imaging | w3OrderSets.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Notes | w3OrderSets.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Encounters | w3OrderSets.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Review and sign | w3OrderSets.toSign | click / {"button":{"action":{"goto":{"screen":"w3Sign"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3OrderSets | Add single orders | w3OrderSets.toOrders | click / {"button":{"action":{"goto":{"screen":"w3Orders"}}}} / lean | works | Lean state changed; result "ok" |
| / · P1 · canonical-P1 | w3Orders | 1ED board | — | nav/stepper → w3TrackBoard; missing click metadata / lean | dead | Static label for w3TrackBoard; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3Orders | 2Triage | — | nav/stepper → w3Triage; missing click metadata / lean | dead | Static label for w3Triage; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3Orders | 3ED evaluation | — | nav/stepper → w3Provider; missing click metadata / lean | dead | Static label for w3Provider; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3Orders | 4ED order sets | — | nav/stepper → w3OrderSets; missing click metadata / lean | dead | Static label for w3OrderSets; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3Orders | 5Orders | — | nav/stepper → w3Orders; missing click metadata / lean | dead | Static label for w3Orders; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3Orders | 6Sign orders | — | nav/stepper → w3Sign; missing click metadata / lean | dead | Static label for w3Sign; no interpreter click component supplied |
| / · P1 · canonical-P1 | w3Orders | 7Disposition | — | nav/stepper → w3Disposition; missing click metadata / lean | dead | Static label for w3Disposition; no interpreter click component supplied |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | Search chart | w3Orders.chartSearch | search / {"search":{"scope":"chart"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | Find orders | w3Orders.orderSearch | search / {"search":{"scope":"formulary"}} / lean | dead | Input echo only; no search results or clinical state change; interpreter result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | Collapse section | w3Orders.prefList | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | Acetaminophen 1 g PO | w3Orders.prefAcetaminophen | click / {"macro":{"id":"w3PrefAcetaminophen"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | Ibuprofen 600 mg PO | w3Orders.prefIbuprofen | click / {"macro":{"id":"w3PrefIbuprofen"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | Ondansetron 8 mg IV | w3Orders.prefOndansetron | click / {"macro":{"id":"w3PrefOndansetron"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | Ceftriaxone 2 g IV | w3Orders.prefCeftriaxone | click / {"macro":{"id":"w3PrefCeftriaxone"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | Morphine 10 mg IV q4h PRN | w3Orders.prefMorphine | click / {"macro":{"id":"w3PrefMorphine"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | Collapse section | w3Orders.dosing | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | Collapse section | w3Orders.medication | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | Enter Medication | w3Orders.drug | enter / {"field":{"slot":"current","prefill":"none","element":"drug"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | Antibiotic indication (required for antibiotics) | w3Orders.abxIndication | enter / {"field":{"slot":"current","prefill":"none","element":"abxIndication"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | Dose unit | w3Orders.doseUnit | enter / {"field":{"slot":"current","prefill":"none","element":"doseUnit"}} / lean | works | DOM changed |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | Route | w3Orders.route | enter / {"field":{"slot":"current","prefill":"none","element":"route"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | Frequency | w3Orders.freq | enter / {"field":{"slot":"current","prefill":"none","element":"freq"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | As needed (PRN) | w3Orders.prn | enter / {"field":{"slot":"current","prefill":"none","element":"prn"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | Collapse section | w3Orders.dispense | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | Duration | w3Orders.duration | enter / {"field":{"slot":"current","prefill":"none","element":"duration"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | Generic substitution allowed | w3Orders.substitution | enter / {"field":{"slot":"current","prefill":"none","element":"substitution"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | Collapse section | w3Orders.dx | click / {"group":{"startCollapsed":false,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | Pharmacy | w3Orders.pharmacy | enter / {"field":{"slot":"current","prefill":{"fromRecord":{"fact":"preferredPharmacy"}},"element":"pharmacy"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | Associated diagnosis (ICD-10) | w3Orders.orderDiagnosis | enter / {"field":{"slot":"current","prefill":{"linked":{"element":"visitDiagnosis"}},"element":"orderDiagnosis"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | Expand section | w3Orders.more | click / {"group":{"startCollapsed":true,"collapsible":true}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | Current meds | w3Orders.orderInfo | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | CURES report | w3Orders.orderInfo | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | Recent labs | w3Orders.orderInfo | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | Request authorization (human entry) | w3Orders.priorAuthRequest | enter / {"field":{"slot":"current","prefill":"none","element":"priorAuthRequest"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | Request prior authorization | w3Orders.requestPriorAuth | click / {"button":{"action":"requestPriorAuth"}} / lean | disabled-with-reason | no order on this line |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | Accept and add another order | w3Orders.newLine | click / {"button":{"action":"newOrderLine"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | Back | w3Orders.back | click / {"button":{"action":"back"}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | Patient workspace | w3Orders.home | click / {"button":{"action":{"goto":{"screen":"home"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | Track board | w3Orders.nav.w3TrackBoard | click / {"button":{"action":{"goto":{"screen":"w3TrackBoard"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | Triage | w3Orders.nav.w3Triage | click / {"button":{"action":{"goto":{"screen":"w3Triage"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | Provider note | w3Orders.nav.w3Provider | click / {"button":{"action":{"goto":{"screen":"w3Provider"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | Order sets | w3Orders.nav.w3OrderSets | click / {"button":{"action":{"goto":{"screen":"w3OrderSets"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | Disposition | w3Orders.nav.w3Disposition | click / {"button":{"action":{"goto":{"screen":"w3Disposition"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | Results | w3Orders.chart | selectTab index 0 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | Imaging | w3Orders.chart | selectTab index 1 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | Notes | w3Orders.chart | selectTab index 2 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | Encounters | w3Orders.chart | selectTab index 3 / "tabs" / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | Review and sign | w3Orders.toSign | click / {"button":{"action":{"goto":{"screen":"w3Sign"}}}} / lean | works | Lean state changed; result "ok" |
| /?audit=buttons · P1 · canonical-P1 | w3Orders | Order sets | w3Orders.to.w3OrderSets | click / {"button":{"action":{"goto":{"screen":"w3OrderSets"}}}} / lean | works | Lean state changed; result "ok" |
