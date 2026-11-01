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

After integrating `32369320`, all nine live paths and their landing/chart ARIA checks pass again. App tests remain 292/292 and agent tests 95/95. Static desktop UI fidelity passes. The opt-in shared realism review separately exposes an imported-note alias regression in main's new patient-scope filter; the exact fixture, reference forms and required fix are recorded in `docs/design/changes-requests.md`. The existing assertion remains intact.

The final sampled control audit passed for all five live role landings: 45 working controls, 0 explained disabled controls, zero dead controls and zero errors. One landing configuration per persona is sampled; repeated patient-opening actions use the first, middle and last rows. The nine live path regressions separately cover each requested clinical destination. Desktop static ARIA/ui-check passed 21 tests; browser history passed three tests. The full optional realism capture remains blocked only by the imported-note alias issue above.
