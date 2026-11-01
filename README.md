# VGI Health · an EHR that learns your routine

Every night, an AI agent proposes a faster screen for each clinician. The hospital
sets the safety rules; a Lean checker rejects changes that break them. Less
clicking, with the patient banner, allergy review and human safety steps protected.

**See it:** sign in as a doctor or nurse, work with synthetic patients in a real
Medplum EHR, then compare an original screen with its overnight redesign. Open a
rejected proposal to see exactly why the shortcut was refused.

**What is verified:** the screen interpreter itself is written in Lean and runs
in the browser as WebAssembly. Proofs cover commit guards, review receipts,
human-only steps, and checker implications for 12 of 13 properties. General
completion remains an extra assumption. Browser drawing and FHIR writes are
tested; clinical correctness and completeness of the hospital rules are not proved.
The current release uses the owner-selected **core** rule profile.

- [3–4 minute demo, exact clicks, and 30-second pitch](docs/DEMO.md)
- [Verification: proofs, trusted code, and open gaps](docs/VERIFICATION.md)
- [Project brief](BRIEF.md) · [Status](docs/STATUS.md) · [Proof work](TODO_PROOFS.md)
- [Core model](docs/design/core-model.md) · [Design changes](docs/design/changes.md)
  · [Rules catalog](docs/rules/catalog.md) · [Rule sources](docs/regulations.md)

## Quick start
Install **Node 22.18+**, **pnpm 11.8.0** (`corepack enable`),
[elan](https://github.com/leanprover/elan) on your PATH, a C toolchain (`cc`/`make`),
and **Docker with Docker Compose** and a running daemon. Installation downloads
packages and images. Elan automatically fetches the pinned Lean 4.35.0 toolchain;
Lean builds default to four workers. Emscripten and an AI API key are not needed.

```sh
git clone https://github.com/saithat/VGI-Health.git
cd VGI-Health
make install && make run
```

Open **http://localhost:5173/** and click a persona to sign in. `make install`
starts Medplum, loads the committed synthetic patients and seeds worklists.
It generates a private, gitignored `.env` with local credentials; **no secret or
manual `.env` step is required for a new stack**. If another checkout already
uses the named `vgi-medplum` stack, copy its `.env` locally before installing to
preserve the shared persona passwords. Never commit it.

After install, live local work and offline replay need no internet or API key.
The **Demo / replay** link opens the offline catalog. For just that catalog and
the recorded dashboard without Docker or Lean, use `pnpm install && make run`
(the committed WASM assets still run the EHR logic).

UI browser: **http://localhost:5173/browse**. Open any of the canonical releases,
P1–P5 projections, bad programs or recorded program versions with one of the
174 committed Synthea patients. Every EHR click runs **real Lean WASM**.

Offline persona defaults: **http://localhost:5173/?mode=replay&persona=P1** (change to P2–P5).
Add `&run=mock` or another recorded run id for its latest deployed program;
without a run, the v1 projection opens. P2 defaults to an ED fixture, P3 to an
inpatient fixture, P4 to a child and P5 to a surgical fixture. The inspector shows
live state, blockers and commits; committed `verdicts.json` supplies recorded checker verdicts; regenerate with
`pnpm --filter app verdicts` when the native checker CLI is available.

Dashboard: **http://localhost:5173/dashboard**. Its recorded run selection prefers
replayable real runs by newest timestamp, then recording length and ID; the committed
`run1-P3` is a real ten-day recording. Labeled authored `runs/mock` examples
remain available. Only mock dashboard replay uses a fixture interpreter. Override selection with `VGI_RUN=mock make run`.
Use `make run APP_PORT=5187` if 5173 is occupied.

For remote access from your MacBook, both `pnpm --filter app dev` and `make run`
automatically use Tailscale Serve when the local Tailscale daemon is connected.
Startup prints HTTPS links available on your tailnet, using the same HTTPS port
as the local app (normally 5173). An existing matching proxy is reused; other
Serve routes are left alone. Newly created routes stop with the app. Use
`TAILSCALE_SERVE=0 pnpm --filter app dev` (or `TAILSCALE_SERVE=0 make run`) to opt out.
Tailscale failures leave the local app available.

WASM is committed; `make wasm-check` verifies freshness. Developers rebuilding
it use `wasm/setup.sh && make wasm`. The standard `make install` also loads
the local Medplum data. Medplum API: **:8103**; admin: **http://localhost:3000/**.

To repeat individual backend setup steps (already included in `make install`):

```sh
make infra-up
make setup
make load
make seed
make run
```

Use Medplum email/password sign-in or one of the local dev persona buttons.
The buttons read `VGI_USER_PASSWORD` through a same-origin, loopback-only server
endpoint; passwords and client secrets are never put in the static app bundle.
Both Vite dev and `make run` preview support this endpoint. Other hosts use the
normal sign-in form. No internet is needed for local Medplum or WASM.

After sign-in, the home worklist queries today's assigned appointments and open
Tasks (including refills), the ED board, ward census/medication schedule, pediatric
appointments, or OR cases and consults. Empty worklists mean no matching current
FHIR records; the app does not invent appointments. Search patients, select the
encounter and optional Task/MAR order/available admission bed, then **Open EHR**. **Start new encounter** creates a real encounter for the selected patient.
LIVE uses a recorded deployed persona version when available, otherwise
the canonical v3 persona projection. The Lean WASM interpreter owns every
clinical screen, guard and alert.

The worklist date defaults to the local calendar date. For the seeded simulation,
choose **2026-11-02** (world day 1) in **Worklist date**; later days use the dates
in the world's manifest. Open Tasks and active ED/ward encounters remain visible
until completed. OR cases retain their actual scheduled dates.

Authorized commits are mapped to an atomic FHIR transaction in
`app/src/data/commitMapper.ts`; only `app/src/data/medplum.ts` calls Medplum. Notes,
vitals, ICD-10 Conditions, Encounter diagnoses, CPT charges, medication and service
orders, admissions/bed occupancy, discharges/prescriptions, administrations,
immunizations, result Tasks/messages, renewals, consents and versioned review
Provenance are supported. Saved resources appear as links in the success toast
and **Live encounter** panel. Successful writes refetch the chart and recompute
facts. Rejected transactions retain entered values and do not mark the Lean commit
complete. A failed refresh after a successful save is explicitly labeled **Saved**
and requires reopening the chart; it is not reported as a retryable write failure.

Rooming is saved with the signed note. For a new patient without a saved weight,
file the note from Visit close before signing prescriptions; the spec's ordering
weight payload must come from a persisted record. The current FHIR projector does
not yet derive all clinical/temporal/structured context. The live adapter supplies
version-bound raw display data, the screen's workflow phase, Encounter.serviceType
and explicit clinical-risk Observations. Missing clinical evidence stays unknown
and Lean can require additional attestations or block a workflow. See the live EHR
requests in [changes-requests.md](docs/design/changes-requests.md). Additional
regulatory commit IDs outside the supported mapper set fail explicitly. Complex
MAR schedules with insufficient timing remain labeled **Schedule needs review**.

Replay needs no login and performs no clinical writes. Historical fixture charts
lack some of the new source-backed phase/evidence contracts, so their signing
controls can remain blocked; the dashboard can still replay recorded episodes.
For local Medplum, persona logins are:

| Persona | Login |
|---|---|
| P1 · Dr. Maya Chen (primary care) | `p1@vgi-health.example` |
| P2 · Dr. Marcus Okafor (ED) | `p2@vgi-health.example` |
| P3 · Rosa Delgado (RN) | `p3@vgi-health.example` |
| RN2 · Ethan Park (double checks) | `rn2@vgi-health.example` |
| P4 · Priya Raman (pediatric NP) | `p4@vgi-health.example` |
| P5 · Dr. James Whitaker (surgeon) | `p5@vgi-health.example` |

Shared persona password: `VGI_USER_PASSWORD` in the generated `.env`.
Admin: `admin@example.com` / `medplum_admin`. Keep `.env` when reusing the
stack so setup preserves persona passwords. See [infra/README.md](infra/README.md).

Validation:

```sh
pnpm --filter app build
pnpm --filter app lint
pnpm --filter app test
pnpm --filter app test:live
pnpm --filter app exec playwright test ui-check.spec.ts dashboard.spec.ts live-login.spec.ts
pnpm --filter app test:replay
```

`test:live` skips only when Medplum's health endpoint is down; missing credentials
or failed assertions on a running backend fail. It creates isolated synthetic
patients and removes its resources afterwards. P1 traverses real WASM for a full
W1 visit and verifies links by querying Medplum. P2 also traverses the real WASM
disposition screen to admit into a versioned bed Location. Additional tests validate
P3/P5 transactions, results/messages, refills, immunization, operative notes,
consents and atomic rollback/input retention. P3/P4/P5 and the in-basket workflows'
full WASM click paths still need integration coverage. Browser checks cover real persona
login, restoration, search and chart opening on desktop and narrow screens.

CPT: only a small set of code identifiers and our own short labels ships in the
mapper (six clinic levels plus the three seeded surgical procedures); no full CPT
catalog or AMA descriptors are included. CPT is an AMA
trademark. Review [AMA licensing requirements](https://www.ama-assn.org/practice-management/cpt/cpt-licensing-faqs)
before distributing CPT content or using this in production.

Live agent nights: `make run-live` with `ANTHROPIC_API_KEY` exported or an
authenticated `codex` CLI. This generates a local world and calls the agent;
`LIVE_DAYS=2` and `LIVE_ARGS='--personas P1'` can shorten a run. It needs internet.

Verify a clean clone: `scripts/clean-clone-test.sh` (Linux `timeout`, `setsid`,
`curl`, Playwright system libraries). It clones **local HEAD**, installs, serves
on **5189**, and runs Chromium with external requests blocked. It reuses the
named `vgi-medplum` stack and copies local `.env` to preserve credentials; it
never resets or stops Medplum. It prints install and startup wall times and
limits Lean to four workers.
Set `CLEAN_CLONE_PORT` or `KEEP_CLONE=1` as needed. See
[clean-clone evidence](docs/CLEAN-CLONE.md) for the measured result and limits.

Trusted: Lean/Emscripten, Node/React/browser, Docker/Medplum, Synthea, and the
owner-reviewed specs. The mock run illustrates the demo; it does not establish
clinical correctness or real certification. See [BRIEF §13](BRIEF.md#13-trusted-base-say-this-in-the-readme-and-the-demo).

## Data sources and credits

- **Synthea**: synthetic patients, conditions, medications, labs and encounters
  (fixtures/synthea), loaded into Medplum. Synthea is Apache-2.0 licensed: Walonoski J,
  et al. *Synthea: An approach, method, and software mechanism for generating
  synthetic patients and the synthetic electronic health care record.* JAMIA 2018;
  25(3):230–238. https://github.com/synthetichealth/synthea
- **Synthetic Hospital** (Park, Chen, Dettmers): we import its released synthetic
  longitudinal records for chart realism. These are patient profiles with allergies,
  home medications, history and social history, plus encounters with full clinical
  notes. Code is MIT licensed; the released data is "fully synthetic and
  redistributable". Cite: Park, Chen, Dettmers. *Synthetic Hospital: An Open,
  Verifiable, Physician-Validated Longitudinal EHR Benchmark.* Preprint, 2026.
  https://arxiv.org/abs/2609.30027 · https://github.com/sparkcpark/synthetic_hospital
  Pinned source: `911f34c4ac65a508543c4b3b90c373a0cd16534d`.
  We converted and loaded **150 patients, 637 encounters/notes, 4,383 resources**
  into local Medplum; primary persona selections are 30 each for P1–P5,
  including 34 pediatric patients. The committed FHIR cohort is 6.68 MB,
  uncompressed, with source tags and per-patient Provenance. Opt in with
  `make seed SYNTHETIC_HOSPITAL=1` (also supported by `make install`), or run
  `make load-synthetic-hospital`. Mapping, checksums and limitations:
  [import guide](scripts/synthetic-hospital/README.md). Full Notes/history display
  is planned in [docs/STATUS.md](docs/STATUS.md); this phase imports the records.
  (see its CITATION.cff). Its Epic-style simulator is an API, not a UI. We took
  only its chart organization as a reference (chart summary, encounters, problem
  list; results for labs, imaging and pathology; orders) and copied no code or
  screens.
- **Medplum** (Apache-2.0): FHIR R4 backend. https://github.com/medplum/medplum
- EHR screen patterns follow public documentation and screenshots of real EHRs
  (sources in docs/design/ehr-ui-research.md). No proprietary vendor screens
  were copied.

## Why this is malleable software

[Ink & Switch, “Malleable Software”](https://www.inkandswitch.com/essay/malleable-software/) describes software people can shape to their needs.
One EHR supplies a common vendor reference; each clinician has a role-based fork.
Only the AI agent modifies UI programs, evolving each fork around its clinician’s work.
Every proposed change is checked against the rules before deployment.
Version history is a tool for inspecting decisions, comparing changes and returning to prior versions.
AI changes stay visible through readable diffs in the UI browser.
Certification answers the open problem of untrusted modifications within the modeled rules.
Read the [verification scope](docs/VERIFICATION.md) and [Lean mistakes](docs/LEAN-MISTAKES.md).

The archived `runs/run1-P3` retains historical local paths and release spellings for provenance.
