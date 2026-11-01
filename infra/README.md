# infra: Medplum stack, setup, and Synthea fixtures

Lane E. This directory runs the local FHIR backend (Medplum in Docker), sets it up idempotently, and owns the synthetic patient data: generating it with Synthea, trimming it into committed fixtures, and loading it into Medplum.

```
infra/
  docker-compose.yml        Medplum server :8103, admin app :3000, Postgres 16, Redis 7 (pinned)
  scripts/                  pnpm workspace package @vgi/infra-scripts (@medplum/core 5.2.13)
    wait-healthy.mjs        block until /healthcheck is ok (and the app answers)
    setup.mjs               project, ClientApplication, persona Practitioners + users -> .env
    load.mjs                upload fixtures/synthea/*.json, each file exactly once
    seed-world.mjs          world day -> real FHIR worklists, reference verification + counts
    lib.mjs                 .env merge, identifier systems, helpers
  synthea/
    generate.sh             pinned Synthea jar -> fixtures/raw/ (gitignored)
    keep/*.json             Synthea "keep" modules for the targeted cohorts
    trim.mjs                fixtures/raw/ -> fixtures/synthea/*.json + index.json (committed)
  valuesets/                ICD-10-CM, CPT references, LOINC, CVX; sources/licenses in README.md
```

## Commands

From the repo root:

| Command | What it does |
|---|---|
| `make install` | lean build, `pnpm install`, then `infra-up`, `setup`, `load`, `seed`. Safe to re-run. |
| `make infra-up` | `docker compose up -d` and wait for the server healthcheck and the app. First boot takes about 3 minutes while Medplum migrates and seeds its database. |
| `make infra-wait` | Wait for the healthcheck only (for example, after a reboot). |
| `make setup` | `node infra/scripts/setup.mjs`: create anything missing and write `.env`. |
| `make load` | `node infra/scripts/load.mjs`: upload fixtures that are not loaded yet (about 55 s for all 174). |
| `make seed` | Seed world 1, day 1 into Medplum, verify clinical references, and query persona worklist counts. |
| `make infra-down` | Stop the containers and keep the data. |
| `make infra-reset` | Stop the containers and **delete all Medplum data** (`docker compose down -v`). |
| `make synthea` | Regenerate raw Synthea output and re-trim it (Java 17+; about 3 min plus a 200 MB download the first time). Not part of install. |

Clean-state check (verified, 3 min 37 s on this machine):

```sh
docker compose -f infra/docker-compose.yml down -v
make infra-up && node infra/scripts/setup.mjs && node infra/scripts/load.mjs
# -> "174 loaded (43821 resources) ... Patients on server: 174"
```

Querying the FHIR API (anonymous requests get 401; Medplum accepts the client credentials as HTTP Basic auth):

```sh
set -a; . ./.env; set +a
curl -s -u "$MEDPLUM_CLIENT_ID:$MEDPLUM_CLIENT_SECRET" 'http://localhost:8103/fhir/R4/Patient?_summary=count'
curl -s -u "$MEDPLUM_CLIENT_ID:$MEDPLUM_CLIENT_SECRET" 'http://localhost:8103/fhir/R4/Patient?identifier=https://github.com/synthetichealth/synthea|<id from index.json>'
```

From TypeScript, use `new MedplumClient({ baseUrl })` and either `startClientLogin(MEDPLUM_CLIENT_ID, MEDPLUM_CLIENT_SECRET)` (scripts and pipeline) or a persona login (app). The admin UI at http://localhost:3000 accepts `admin@example.com` / `medplum_admin` and the persona logins below.

## Medplum stack (`docker-compose.yml`)

Based on Medplum's official `docker-compose.full-stack.yml` (docs: "Running the full Medplum stack in Docker"). Images: `medplum/medplum-server:5.2.13`, `medplum/medplum-app:5.2.13`, `postgres:16.15`, `redis:7.4.12`. Compose project name: `vgi-medplum`. Deliberate differences from upstream:

- Every tag is pinned (upstream uses `:latest` and major tags).
- Postgres and Redis are not published on the host, so they cannot clash with other local databases. Use `docker compose -f infra/docker-compose.yml exec postgres psql -U medplum`.
- `MEDPLUM_MAX_JSON_SIZE` is `16mb` instead of `1mb`: the largest trimmed patient bundle is 1.1 MB, and synchronous transactions are capped by this limit.
- `MEDPLUM_RATE_LIMITS_ENABLED=false`. Medplum's defaults allow 5 logins per minute per IP plus a per-user FHIR quota. Setup, bulk loading, and the simulation's persona logins exceed them. This is a local stack with synthetic data only.
- Healthchecks use `start_period`/`start_interval`, so first boot is detected within seconds of becoming ready.

## Setup (`scripts/setup.mjs`)

Logs in as the default super admin (`admin@example.com` / `medplum_admin`; override with `MEDPLUM_ADMIN_EMAIL` and `MEDPLUM_ADMIN_PASSWORD`), then ensures each of the following, creating or updating only what is missing or different:

1. Project **VGI Health**. The super admin becomes its owner. The script also turns on the project feature `transaction-bundles` (atomic FHIR transactions; only a super admin can set it), which `load.mjs` relies on.
2. ClientApplication **VGI Health App**. Its membership has no access policy, so it has full access to the project. Use it with client credentials for scripts, the agent, and deploy; use the id alone for PKCE login from the app. Redirect URIs default to `http://localhost:5173/` and `http://localhost:4173/` (override with `VGI_APP_REDIRECT_URIS`).
3. Practitioners keyed by identifier `https://vgi-health.example/fhir/sid/persona|<code>`, each with a degree qualification (v2-0360) and an NUCC taxonomy qualification:

   | Code | Persona | Name | Login |
   |---|---|---|---|
   | P1 | Primary care physician | Dr. Maya Chen, MD | `p1@vgi-health.example` |
   | P2 | ED physician | Dr. Marcus Okafor, MD | `p2@vgi-health.example` |
   | P3 | Inpatient RN | Rosa Delgado, RN | `p3@vgi-health.example` |
   | RN2 | Second inpatient RN (high-alert double checks) | Ethan Park, RN | `rn2@vgi-health.example` |
   | P4 | Pediatric NP | Priya Raman, MSN, CPNP | `p4@vgi-health.example` |
   | P5 | General surgeon | Dr. James Whitaker, MD, FACS | `p5@vgi-health.example` |

4. A login-capable User and ProjectMembership for each persona, with the Practitioner above as its profile. All personas share one password, `VGI_USER_PASSWORD` in `.env`. It is random on the first run, or you can set it before running setup. If `.env` is lost, setup generates a new password and resets the users to it.
5. `.env` at the repo root (gitignored; keys are documented in `/.env.example`): `MEDPLUM_BASE_URL`, `MEDPLUM_APP_URL`, `MEDPLUM_PROJECT_ID`, `MEDPLUM_CLIENT_ID`, `MEDPLUM_CLIENT_SECRET`, the same values with a `VITE_` prefix (except the secret), `VGI_USER_PASSWORD`, and `VGI_PRACTITIONER_<code>=Practitioner/<id>`. Only these keys are rewritten. Other lanes' keys in `.env` are preserved, and the file is written only if something changed.

A second run prints `0 created, 0 updated, 15 unchanged` and leaves `.env` untouched.

## Synthea (`synthea/generate.sh`)

- Synthea **v4.0.0** `synthea-with-dependencies.jar`, sha256-checked, cached in `.tools/synthea-v4.0.0/` (gitignored).
- Fixed seeds, a fixed reference/end date (**2026-10-31**, `REF_DATE`), Massachusetts, alive patients only, no numeric suffixes on names, clinical notes on, FHIR R4 transaction bundles.
- **Single-threaded** (`generate.thread_pool_size=1`). Multi-threaded runs with keep modules were not byte-for-byte reproducible (allergy reaction severities differed between runs).
- Raw output: `fixtures/raw/<cohort>/fhir/*.json` (about 700 MB, gitignored). `COHORTS="peds" infra/synthea/generate.sh` regenerates a subset.

| Cohort | Seed | Patients | Ages | Selection (keep module) | History |
|---|---|---|---|---|---|
| adults | 1001 | 80 | 25–85 | general population | 10 y |
| hyperlipidemia | 1201 | 10 | 40–85 | active hyperlipidemia or hypertriglyceridemia | 10 y |
| allergy | 2001 | 12 | 18–85 | active penicillin or sulfamethoxazole/trimethoprim allergy | 10 y |
| anticoag | 3001 | 10 | 55–90 | active warfarin | 10 y |
| surgical | 4001 | 12 | 18–75 | appendectomy or cholecystectomy, at any age | full lifetime |
| peds | 5001 | 46 | 0–17 | general population | 10 y |
| peds_allergy | 5101 | 4 | 2–17 | active penicillin or sulfa allergy | 10 y |

What Synthea does and doesn't model, and the workaround for each gap:

- **Appendicitis**: the `appendicitis` module exists (ED visit, then admission, then appendectomy, and a lifelong "History of appendectomy" condition). Cholecystectomy comes from `gallstones`.
  - A keep module matches a procedure performed at any age. With a 10-year export window most of those operations fall outside the export, so the surgical cohort is generated with full history and trimmed by `trim.mjs` instead.
  - Synthea has no hernia repair. The few colectomies, lumpectomies, and mastectomies (cancer modules) also count as general surgery.
- **Anticoagulants**: Synthea's only chronic oral anticoagulant is **warfarin** (atrial fibrillation and valve replacement modules). It has no DOACs. Heparin and enoxaparin appear only as inpatient orders, which end at discharge.
- **Hyperlipidemia**: it comes only from `veteran_hyperlipidemia` and `metabolic_syndrome_care` (hypertriglyceridemia), so the general population has little of it. That is the reason for the extra keep cohort.
- **Drug allergies**: from `allergies/drug_allergy_incidence`: penicillin (about 10%), sulfa (about 5%), aspirin, ibuprofen, cephalosporins, and ACE-inhibitor intolerance.
- **Not produced by Synthea**: ServiceRequest, MedicationStatement, Consent, Questionnaire, QuestionnaireResponse, Task, and AuditEvent. The app and the world generator create these, along with the review-receipt Provenance.

## Trim (`synthea/trim.mjs`) and `fixtures/synthea/`

Output: 174 FHIR transaction bundles, one patient per file (`<Given>_<Family>_<id8>.json`, one entry per line), 43,821 resources, **38.7 MB** in total. The largest file is 1.1 MB and the median is 173 KB. Rules, relative to 2026-10-31:

- **Resource types**: only those in BRIEF §5a. Medication is inlined as `medicationCodeableConcept`. Practitioner, Organization, and Location references become display-only references with a `type`. Dropped:
  - Claim, ExplanationOfBenefit, CarePlan, CareTeam, Goal, Device, ImagingStudy, and SupplyDelivery;
  - Synthea's single bulk Provenance per patient, because it is not a review receipt and would pollute receipt queries;
  - DiagnosticReports that only duplicate a note (the same text is in the DocumentReference) or only wrap a survey score.
- **Window**: encounters from the last 5 years, under a per-patient budget:
  - always kept: every well-child visit and the latest adult general examination per year;
  - plus the 20 most recent other encounters. A few heavy utilizers (dialysis 3×/week, 30+ ED visits a year) would otherwise make up most of the size.
- **What is kept from those encounters**:
  - labs and trend vitals (BP, weight, height, BMI, head circumference) for all 5 years;
  - other observations, prescriptions, procedures, and medication administrations for the last 2 years;
  - screening and assessment procedures for 12 months;
  - resolved disorders for 5 years and resolved findings for 2 years;
  - the 6 most recent clinical notes (DocumentReference with base64 text).
- **Always kept**:
  - the Patient;
  - every AllergyIntolerance and Immunization;
  - active Conditions and MedicationRequests;
  - surgical episodes at any date: the procedure, its encounter, and everything recorded in it;
  - the latest observation of each social-history code and the latest PRAPARE survey;
  - for children, every vital sign (growth chart).
- **References**: non-encounter resources referenced by kept ones are pulled in. An out-of-window encounter referenced by an always-kept resource becomes a display-only reference, for example "Encounter for check up on 2017-03-02".
- **Size cuts that lose no clinical content**: narratives, US Core `meta.profile` tags, resource ids, `issued`, and CodeableConcept `text` that repeats the display are removed.
  - Medplum assigns its own ids, and the `urn:uuid:<synthea id>` fullUrls link the entries within each file.
  - Patients keep the identifier `https://github.com/synthetichealth/synthea|<id>` for lookups.
  - Each Patient gets a deterministic 8-digit MRN, because Synthea's MRN is the UUID.
- **Tuning**: the knobs are `--years`, `--detail-years`, `--encounters`, and `--notes`. The defaults were chosen to land under the 40 MB budget. A plain 5-year window with every encounter came to 115 MB.

`fixtures/synthea/index.json` has the run parameters, counts, and one entry per patient:
- identity: `id` (Synthea id), `identifier`, `mrn`, `name`, `birthDate`, `age` (`ageMonths` for children), `sex`, `cohort`;
- `flags` (`pediatric`, `allergic`, `anticoagulated`, `surgical`);
- `drugAllergies`, `drugAllergyGroups`, `otherAllergies`, `anticoagulants`, `surgeries` (procedure and date; `fromHistory` when only "History of appendectomy" survives);
- `chronic` (hypertension, diabetes, hyperlipidemia, ...), `problems`, `activeMedications`, `latestWeight`;
- resource counts, `file`, `bytes`, and `sha256`.

Flag definitions:
- `allergic` means an active medication-category allergy.
- `anticoagulated` means an active MedicationRequest for warfarin, a DOAC, or a heparin.
- `surgical` means a general-surgery procedure, or "History of appendectomy".

| Flag / group | Patients |
|---|---|
| total | 174 (124 adults, 50 aged 0–17) |
| allergic (drug) | 27 (20 adults, 7 children): penicillin 17, sulfa 9 |
| anticoagulated | 10 (all warfarin; 8 with atrial fibrillation) |
| surgical | 21: 19 appendectomies, 1 laparoscopic cholecystectomy, 1 partial colectomy. 3 operations fall inside the 5-year window (appendectomies in Feb and Jul 2026, colectomy in Feb 2024) |
| hypertension / diabetes / hyperlipidemia | 48 / 35 / 41 |

## Load (`scripts/load.mjs`)

- Authenticates with the client credentials from `.env`. Each fixture file goes in as **one FHIR transaction**, to which the loader appends a marker `Basic` resource:
  - identifier `https://vgi-health.example/fhir/sid/fixture-file|<file name>`;
  - code `https://vgi-health.example/fhir/CodeSystem/vgi-infra|fixture-load-marker`;
  - `subject` = the Patient, plus extensions with the file's sha256 and resource count.
- With `transaction-bundles` on, the patient's data and its marker commit together or not at all. This was verified: one invalid entry rolls back the whole file.
- Files that already have a marker are skipped, so nothing is uploaded twice. As a second guard, a file whose Synthea Patient identifier already exists on the server is not uploaded either.
- If a committed fixture changes after it was loaded, the loader warns and does not re-upload. To reload, run `make infra-reset && make infra-up setup load`.
- `LOAD_CONCURRENCY` (default 3), `--only <file>`, `--dry-run`.

## World worklists (`scripts/seed-world.mjs`)

`make seed` authenticates using `@medplum/core` and the client credentials in this worktree's `.env`.
Run `make setup load` first on a new stack. In another worktree sharing this stack, reuse the
existing `.env` before setup: setup without an existing persona password resets the shared logins.
No credentials are committed or printed by the seeder.

```sh
make seed                                           # runs/world/1, day 1
make seed SEED_ARGS='--day 2'                        # chosen simulated day
node infra/scripts/seed-world.mjs --world runs/world/1 --day 1
node infra/scripts/seed-world.mjs --day 1 --dry-run   # authenticate/plan, no writes
node infra/scripts/seed-world.mjs --day 1 --verify-only
make seed SEED_ARGS='--day 1 --reset-day'             # remove/rebuild just this seed day
node --test infra/scripts/seed-world.test.mjs
```

“Today” means the simulation date from `manifest.json`, **not the computer's date**:
day 1 is **2026-11-02**, with the world's Pacific `-08:00` offset and per-persona shift starts.
Filter app worklists by that date (and/or the exact day tag); `--day` seeds an independent daily
snapshot, rather than advancing or discharging the previously seeded day's encounters.

The script reads `schedules/day-NN/P*.json` and both adjacent `state-day-*.json` snapshots:

| Worklist | FHIR resources and links |
|---|---|
| P1 clinic | Booked `Appointment`s with Patient, Practitioner P1, PractitionerRole, clinic, and start/end times. |
| P1 in-basket | Requested `Task`s owned by P1, focused on final `DiagnosticReport`s whose `result` links to the world's `Observation`s. Abnormal items are urgent. Normal result-review tasks and the unhandled in-basket backlog are retained too. |
| P1 refills | Requested `Task`s owned by P1, focused on standalone active `MedicationRequest`s promoted from the world's contained current prescriptions. The seeder does not approve/deny requests. |
| P2 ED | In-progress `Encounter`s with class `EMER`, P2 participants, individual ED room `Location`s, ESI 1–5 priority, arrived/triaged history, triage-time extension, and linked triage weight `Observation`s. Original kg/lb values and UCUM units are preserved. |
| P3 census/MAR | Shift-start `IMP` encounters with P3 participants and ward → room → bed `Location`s. Active inpatient `MedicationRequest`s retain dose, RxNorm ingredient, route, repeat frequency, due events, PRN flag, indication, and high-alert tag. Prior-state regimens preserve patients discharged later that day. No doses are recorded as administered. |
| P4 pediatrics | Booked appointments plus the world's actual dated weights, linked to the real child Patient. |
| P5 surgery | Clinic appointments; active OR `ServiceRequest`s and `Procedure.status=preparation` (FHIR R4 has no `planned` Procedure status); ED consultation ServiceRequest/Task with P2 requester, P5 performer/owner, ED encounter and supporting results; requested rounding/discharge Tasks. |
| Persona roles | Six active `PractitionerRole`s, including RN2, linked to setup's real Practitioners, organization, specialty, and Locations. Setup owns the Practitioners; reset never removes them. |

Day 1 is P5's **clinic day**, so its nine pending OR cases keep their actual future dates;
none is falsely scheduled for today. Known OR times are preserved; date-only bookings remain
date-only instead of inventing a time. Shift-start census excludes later ED admissions, as the
world's P3 schedule does. Scheduled clinic work includes add-ons; no-show patients do not get
booked work items. Clinical choices remain pending for the app to perform.

Every created resource carries both:

- `identifier`: `https://vgi-health.example/fhir/sid/world|day1-<stable key>`;
- `meta.tag`: system `https://vgi-health.example/fhir/sid/world`, code `day1`.

Worklist tags use `https://vgi-health.example/fhir/CodeSystem/worklist`, such as
`P1-inbasket`, `P1-refills`, `P2-ed`, `P3-census`, `P3-mar`, `P4-appointments`, and `P5-or`.
High-alert medication tags use `https://vgi-health.example/fhir/CodeSystem/vgi-infra|high-alert`.
ESI priorities use `https://vgi-health.example/fhir/CodeSystem/vgi-infra/esi`, with codes `1`–`5`.
The explicit triage-time extension is `https://vgi-health.example/fhir/StructureDefinition/triage-time`.

Patients are resolved by their Synthea identifiers; world UUIDs are never treated as Medplum ids.
References become server-assigned ids through dependency-ordered FHIR transactions. Medplum 5.2
limits conditional-create transactions to **eight entries**, so seeding uses resumable atomic groups
of eight. Conditional creates plus existing-identifier checks prevent duplicates, and reruns leave
completed Tasks and app edits untouched. If a seed definition changes, use `--reset-day` to rebuild.

`--reset-day` searches only the listed seeder resource types with the **exact day tag**, checks
each also has a matching `dayN-` identifier, and deletes those resources in a transaction before
reseeding. It never deletes Patients, setup Practitioners/users, fixture resources, or another day.
Different `--world` directories share the day namespace: reset the chosen day when replacing its
source world. A dry run reports the proposed reset and new resources without deleting anything.

After writes, the script verifies the clinical reference graph and issues actual Medplum searches
by practitioner/owner/performer, status, class, and day tag. Worklist-tag queries also retain the
day filter (repeated `_tag` parameters mean AND). Example direct queries after loading `.env`:

```sh
set -a; . ./.env; set +a
curl -sG -u "$MEDPLUM_CLIENT_ID:$MEDPLUM_CLIENT_SECRET" http://localhost:8103/fhir/R4/Appointment \
  --data-urlencode "actor=$VGI_PRACTITIONER_P1" --data-urlencode 'status=booked' \
  --data-urlencode '_tag=https://vgi-health.example/fhir/sid/world|day1' --data-urlencode '_summary=count'
curl -sG -u "$MEDPLUM_CLIENT_ID:$MEDPLUM_CLIENT_SECRET" http://localhost:8103/fhir/R4/Task \
  --data-urlencode "owner=$VGI_PRACTITIONER_P1" --data-urlencode 'status=requested' \
  --data-urlencode '_tag=https://vgi-health.example/fhir/sid/world|day1'
```

Verified against the running :8103 stack: 308 seeded resources, a second run with zero creates,
and a scoped reset/reseed preserving fixture counts (174 Patients, 174 load markers, 2,548
Conditions, 3,407 Immunizations, 1,035 DocumentReferences) and all seven existing Practitioners.
The five persona username/password logins were also checked against their real FHIR worklists.

```text
P1: appointments=20 results=5 abnormal=1 refills=19
P2: ed=22 weights=22
P3: census=7 mar=33 highAlert=13; PRN orders=13
P4: appointments=22 weights=22
P5: appointments=15 orPlanned=9 orToday=0 consults=1 rounding=2
```

Reference value sets for the app/spec are in [`valuesets/`](valuesets/README.md). They are
checked-in JSON and do not require a terminology service at runtime.

## Gotchas

- **Ports 8103 and 3000 must be free.** The compose file publishes only those two.
- **First boot is slow** (about 3 min). `make infra-up` blocks until the server is healthy, and so does `docker compose up -d`, because the app container waits on the server's healthcheck.
- **Anonymous FHIR requests return 401.** Use the client credentials (Basic auth or `startClientLogin`) or a persona login.
- **`@medplum/core` PKCE in Node.** The client hashes the code verifier with `window.btoa`, so in Node it falls back to `plain` and prints a warning. `setup.mjs` computes the S256 challenge itself and stores the verifier in the client's storage.
- **pnpm 11 `minimumReleaseAge`** (1 day) refuses packages newer than a day. `@medplum/core` 5.2.13 was published on 2026-10-30, so a `pnpm install` before 22:38 UTC on 2026-10-31 failed. No workspace setting was changed.
- **Data is anchored to 2026-10-31.** Synthea timestamps carry local offsets (Massachusetts). If the simulation needs "today", shift dates at generation time with `REF_DATE`, then regenerate and re-trim.
- **Synthea quirks you will see:** children with an ACE-inhibitor "intolerance", a few dialysis or transplant patients with dense histories, and dental procedures.
- **Medplum deletes are soft deletes**, and fixtures are never re-uploaded. To start over, use `make infra-reset`, which wipes the Postgres volume.
- **Binary storage** (`MEDPLUM_BINARY_STORAGE=file:./binary/`) lives in the server container, as upstream configures it. It survives restarts but not container recreation. Nothing in this lane stores Binaries.
