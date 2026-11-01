# Live patient selection — November 1, 2026

The live clinical snapshot defaults to the persisted seeded day, November 2, 2026. A date override remains available. The toolbar shows the clinician, role and a readable clinical date on landing lists and inside charts.

## Schedule regression

On the local Medplum, P1's Practitioner actor query returns 20 Appointments, with November 2 start times. Adding the exact `date=2026-11-02` search returned zero. P4 returned 22 versus zero with the same date restriction. The transport now retrieves all pages for the signed-in practitioner and active appointment statuses, then matches the source appointment's clinical calendar day. This preserves the recorded offset and agrees with the native list projection's day extraction. It does not alter a FHIR resource.

The live department graph supplies separate surgical procedure and consultation lists, retaining original resource references. Patient opening still uses the native workspace action and the existing Medplum chart loader. `/browse` selects only persona, revision and chart day; its links carry no patient parameter and there is no external patient picker.

## Chromium evidence

1440 × 900 screenshots are in `app/shots/realism/live-select/`, with landing and chart images for each path:

- P1 Schedule → Open chart; P1 In Basket · Results → Open chart.
- P2 Track Board → Open chart.
- P3 Unit Census → Open chart; My Patients / MAR → Open chart.
- P4 Schedule → Open chart.
- P5 OR Schedule → Open chart; Consults → Open chart.
- P1 Patient Lookup → name search → Open chart.

The live regression tests assert the landing identity, visible clinical date, populated schedules, selected/bound patient identity, semantic ARIA fidelity, and absence of clinical FHIR writes. Before/after comparison confirms the formerly empty Schedule now contains actual appointment rows, and the top toolbar displays the clinical date without adding a patient banner to the list activity.

## Local validation

Native checker rebuilt after the main merge; app build and lint, 292 app tests, 95 agent tests, and WASM freshness passed. The preview's `.env` also selected an older ignored native-checker cache; it was refreshed atomically from the rebuilt executable. No Medplum service was stopped or reset.
