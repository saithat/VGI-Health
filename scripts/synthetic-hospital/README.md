# Synthetic Hospital → FHIR R4

This is an optional historical-chart cohort, separate from `runs/world/*`.
The released source is fully synthetic and redistributable; repository code
is MIT. We copy data, not simulator code. Cite Park, Chen, Dettmers,
*Synthetic Hospital: An Open, Verifiable, Physician-Validated Longitudinal EHR
Benchmark*, preprint 2026, [arXiv 2609.30027](https://arxiv.org/abs/2609.30027).
See [source.json](source.json) for the immutable upstream commit and SHA256s.

```sh
make synthetic-hospital                # fetch + checksum + deterministic conversion (Node + Python3)
make test-synthetic-hospital           # converter and committed-cohort tests, no Lean process
make load-synthetic-hospital           # opt-in load of committed 150, no source download
make seed SYNTHETIC_HOSPITAL=1          # world worklists + this historical cohort
make install SYNTHETIC_HOSPITAL=1       # normal install also includes this cohort
node infra/scripts/load-synthetic-hospital.mjs --verify-only
```

`make install` retains its normal Lean build; **the data-lane commands above
were tested individually without running install or any Lean build**.
`node scripts/synthetic-hospital/convert.mjs --count N` chooses another cohort
size for an offline experiment. Do not replace the committed default index on
an already loaded stack: the loader verifies exact source-tagged counts and
never deletes or resets shared data. The default is always 150.

Fetch uses raw GitHub URLs at commit
`911f34c4ac65a508543c4b3b90c373a0cd16534d`. Files are cached under the gitignored
`.cache/synthetic-hospital/`; checksums are checked on both reuse and conversion.
Only download data with the hashes in source.json; a mismatch fails closed.
The DB is opened read-only by Python's sqlite3; no extra Python packages are
needed. Its `diagnoses` table has 9,623 rows, 7,307 with an ICD-10 value and
8,469 with a SNOMED value. No terminology table exists in this release.
We use patient-linked longitudinal diagnosis ground truth first, then exact
normalized diagnosis names from the diagnosis table. Conflicting, absent,
compound, range, and syntactically invalid ICD-10 values stay text-only, with
an explanatory Condition.note. These upstream codes are not clinically
revalidated. We do not export benchmark questions, passage judgments or eval
splits, and do not use these fixtures as held-out evaluation evidence.

Selection uses SHA256 ordering and a deterministic round-robin over P1–P5
eligibility, 30 distinct primary selections each. Fits overlap. P1 means adult
with outpatient/follow-up/telehealth; P2 has ED; P3 has inpatient/ICU; P4 is under
18; P5 has positive surgical history or an explicitly surgical diagnosis.
There are 248 pediatric patients in the full 1,268-patient source.
The committed index records primary selection and all fits per patient.
The default has 637 notes/encounters and 4,383 resources: 718 coded and 356
text-only Conditions, 170 AllergyIntolerances, 383 MedicationStatements,
151 historical Procedures, 431 FamilyMemberHistories, 450 social Observations,
150 Coverages, 150 Patients and 150 Provenances. Overlapping fits are P1 95,
P2 120, P3 51, P4 34 and P5 90. All 150 were loaded locally; a full rerun
created zero resources. Five sequential live persona chart checks and an
offline replay passed using one Chromium browser; screenshot:
`app/shots/final (supersedes earlier captures)`.

DOB is approximate: source integer age subtracted from the Synthea fixture
reference date, 2026-10-31. Upstream calls that age `age_at_first_encounter`, so
ages embedded in the original notes can differ. We exclude candidate timelines
that would precede this approximate DOB (including age-zero infants with no
month/day precision). No birth details are invented. A single patient-specific
integer day offset moves that patient's newest encounter 1–365 days before the
reference date. Earlier order and spacing are preserved. Encounter extensions
record original dates and shift days. Notes retain their original UTF-8 text
verbatim, including source dates; DocumentReference descriptions disclose the
shift. No vitals, orders, dates of surgery, or active clinical work are inferred
from narrative prose.

Every resource has source tag `urn:vgi:source|synthetic-hospital` and a stable
record tag. All POSTs have conditional create criteria. Patient uses identifier
`urn:vgi:synthetic-hospital|<patient_id>`; children use deterministic identifiers;
Provenance (which has no R4 identifier element) uses its unique record tag.
Medplum's conditional transactions are limited to eight entries. The loader
sends dependency-ordered chunks of at most eight and resolves cross-chunk links
from response locations. Chunks are atomic; a patient import is resumable across
chunks. Condition identifier values are hashed to keep commas/pipes in diagnosis
names out of FHIR search operators. A rerun resolves existing or created records. The loader checks every entry's result, total source-tagged counts and
exactly one Patient per source identifier. It never logs credentials or changes
the shared stack. Historical encounters remain `finished`: importing a history
does not create an ED admission or a medication administration task. All 150
patients are available through the live Medplum patient search to every persona;
world-generated active work queues continue to come from `seed-world.mjs`.

Home medications are MedicationStatements, with dose preserved as source sig
text. RxNorm is assigned only on exact normalized generic-name match to
`lean/Ehr/Formulary.lean`, read without building or modifying Lean. No brand,
combination, strength or fuzzy matches are inferred. Historical surgery becomes
Procedure with no invented date. Family/social statements remain text; the
original complete profile is also retained in a Patient extension. Smoking uses
[LOINC 72166-2](https://loinc.org/72166-2/); alcohol history uses
[LOINC 11331-6](https://loinc.org/11331-6/). Inpatient/ICU notes use 34117-2;
other encounter notes use 11506-3, as a deterministic note-type approximation.

Fixtures are uncompressed JSON, below the 10 MB budget. The Vite catalog adds a
validated bundlePath and source for both cohorts; its development server and
production output serve identical JSON. The browser has a source filter.
This imports notes and history into Medplum and replay bundles; the certified
chart's full Notes/history presentation is described in the [root README](../../README.md).

Browser verification after starting Vite on 5195:
`node scripts/synthetic-hospital/verify-live.mjs`. Uses one browser, sequential
persona buttons, live patient search and chart open, then the offline source
filter and replay. Screenshot/evidence go under `app/shots/`. No clinical writes.
