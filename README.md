# VGI Health

A research system for clinical software that can safely change itself. It has
three parts:

1. **A realistic EHR simulator.** A hospital and clinic electronic health
   record (EHR) built on the conventions of real-world commercial EHR
   systems. It includes a patient banner and
   patient sidebar, inbox, chart history, ED track board, MAR and flowsheets,
   order entry with order favorites, interruptive and passive alerts, and
   vendor releases that change the rules. It runs on synthetic FHIR patients.
   Simulated clinicians work through generated clinical days in it, so any
   change to the screens can be measured in clicks, scrolls and mouse travel.
2. **Lean proofs of what a clinician-facing interface must preserve.** The
   hospital's rules (law, regulators and hospital policy) are written in Lean,
   and a Lean interpreter runs every click. The theorems hold for every screen
   layout. Nothing is signed without its required entries, reviews and alert
   acknowledgments. The patient banner, required information and interruptive
   alerts stay on screen. Macros never act for a human.
3. **A way for an AI model to change the interface and stay within those
   proofs.** The model edits only the screens, never the rules. A Lean checker
   accepts or rejects each proposed layout and gives a counterexample when it
   rejects one. Only accepted layouts deploy, and the guarantees of part 2
   carry over to them.

Part 2 is what makes part 3 possible. Clinical software is normally locked
down because every change must be re-validated. Here the guarantees are proved
once for every accepted layout, so the screens can be reshaped for each
clinician without re-validating each version by hand. [What is
proved](#what-is-proved) lists what is covered and what is not. [Open
problems](#open-problems) describes the weakest parts: how users are simulated
and how the agent makes its changes.

The same Lean interpreter runs natively and in the browser as WebAssembly. The
project is not affiliated with any EHR vendor.

| Primary care order entry | ED track board | Inpatient MAR |
|---|---|---|
| ![Order composer](app/shots/final/P1-orders.png) | ![Track board](app/shots/final/P2-landing.png) | ![MAR](app/shots/final/P3-chart.png) |

## How the parts fit

Two things are kept apart:

- **The rulebook** (`Spec`, in Lean): what must be entered, reviewed and
  acknowledged before an action, and by whom. For example: "signing a
  medication order needs a dosing weight in kg entered by a human, the allergy
  list on screen, and every interruptive drug-allergy alert acknowledged".
- **The screens** (`Program`, JSON): one clinician's layout of screens,
  fields, tabs, buttons and macros.

The agent may only change the screens. Every proposed program goes through
`check`; only accepted programs are deployed. At run time every click goes
through `step`, which refuses a sign unless its guard holds, whatever the
layout.

```mermaid
flowchart LR
  classDef proved fill:#d9f2e3,stroke:#1b7a43,color:#0b3d22
  classDef untrusted fill:#fde2e1,stroke:#b42318,color:#5c100b
  classDef trusted fill:#eeeeee,stroke:#777,color:#222

  RULES["Hospital rulebook<br/>(Spec)"]:::trusted
  TRACES["Clinician's<br/>interaction traces"]:::trusted
  AI["AI agent<br/>proposes a new Program"]:::untrusted
  CHECK{"Lean checker<br/>check spec program"}:::proved
  GATE{"Browser screen gate<br/>+ replay validation"}
  DEPLOY(["Deploy for this<br/>clinician"])
  KEEP["Keep current screens"]

  TRACES --> AI --> CHECK
  RULES --> CHECK
  CHECK -->|"violation + counterexample<br/>(≤ 3 repairs)"| AI
  CHECK -->|ok| GATE
  GATE -->|pass| DEPLOY
  GATE -->|fail| KEEP
```

## Architecture

One Lean code base is the single source of truth. It is compiled natively (the
`ehr` binary: checker, simulator, deploy, commit server) and, through
Lean → C → Emscripten, to WebAssembly that the browser runs. React only paints
the screen tree Lean returns; it holds no clinical logic.

```mermaid
flowchart TB
  classDef proved fill:#d9f2e3,stroke:#1b7a43,color:#0b3d22
  classDef checked fill:#dcebfb,stroke:#1f5fa8,color:#0d2b52
  classDef trusted fill:#eeeeee,stroke:#777,color:#222
  classDef untrusted fill:#fde2e1,stroke:#b42318,color:#5c100b

  subgraph LEAN["lean/ (Lean 4)"]
    direction LR
    SPECS["Specs<br/>rulebook v1–v3"]:::trusted
    CORE["Core<br/>interpreter: init · step · view<br/>commit guard"]:::proved
    CHECK["Check<br/>checker + soundness proofs"]:::proved
    RENDER["Render<br/>FHIR → facts<br/>state → screen tree"]:::proved
    SIM["Sim<br/>simulated clinicians,<br/>min-click search"]:::trusted
    SPECS --> CORE --> CHECK
    CORE --> RENDER
    CORE --> SIM
  end

  NATIVE["native ehr binary"]:::trusted
  WASM["ehr-interp.wasm"]:::trusted
  LEAN --> NATIVE
  LEAN --> WASM

  subgraph BROWSER["app/ (React)"]
    PAINTER["Painter: draws the<br/>Lean screen tree"]:::checked
    DASH["Replay, dashboard,<br/>UI version browser"]:::checked
  end
  WASM --> PAINTER

  AGENT["agent/<br/>nightly discovery + release cadence"]:::untrusted
  AGENT -->|"ehr check / gated release"| NATIVE

  subgraph BACKEND["Live authority"]
    COMMIT["services/commit<br/>typed commands + read model"]:::checked
    STORE[("Postgres<br/>initial imports + patient event log")]:::trusted
    OIDC["Keycloak OIDC<br/>identity + signed roles"]:::trusted
  end
  IMPORT["Synthea + Synthetic Hospital<br/>FHIR import (offline only)"]:::checked
  PAINTER -->|"versioned interaction / command"| COMMIT
  OIDC --> COMMIT
  COMMIT -->|"ehr serve:<br/>re-check current guard"| NATIVE
  COMMIT -->|"locked expected-version append<br/>+ atomic projection"| STORE
  STORE -->|"authorized chart + directory reads"| COMMIT
  IMPORT --> COMMIT
```

Green: proved in Lean. Blue: tested. Grey: trusted. Red: untrusted by design.

**One click.** WASM `step` previews the interaction and `renderUi` supplies the
screen tree, including honest guard explanations and interruptive alerts. In
live mode the commit service reconstructs the authenticated clinician's human
interactions using its pinned release. Every clinical commit and review receipt
is a typed command with the version of the chart actually read. The service
locks the patient stream, checks the expected version and runs the native Lean
guard on current stored data. Only acceptance appends an event and materializes
its read projection in the same Postgres transaction. MAR also locks the exact
scheduled dose; clinical placement and administrative ADT commands use the same
bed streams and native ADT reducer. A rejected or stale command cannot publish
any of these effects. There is no browser FHIR writer.

Noncommitting interactions preview locally and are submitted as an ordered
human-event journal before the next command; consecutive valid edits of one field
retain its final entered value. Server-generated session caches are bound to
the locked patient version; a successful command invalidates them. They avoid replaying the entire history on
every keystroke and never replace the final native guard. Request IDs bind exact
intent and allow recovery of an uncertain outcome without duplicating a write.
New clinical sessions recover the authenticated actor's current-day review receipts
only while every reviewed resource version still matches the stored chart.
The interaction endpoint checks the human event before hydrating a selected chart;
restoring stored receipts adds no patient event, while new reviews require a typed command.
Opening an encounter is a separate native role-guarded, versioned administrative
command; it creates no signed clinical content or bed placement.

```mermaid
sequenceDiagram
  actor C as Clinician
  participant P as Painter
  participant L as Lean (WASM)
  participant S as Commit service
  participant N as Native Lean
  participant DB as Postgres
  C->>P: clicks Sign
  P->>L: preview human step
  L-->>P: staged state / guard explanation
  P->>S: typed command + expected version + request ID
  S->>DB: lock patient and shared resources
  S->>N: reconstruct interaction, re-check current guard
  N-->>S: accept or reject
  S->>DB: accepted event + projection (atomic CAS)
  S-->>P: durable result or refusal
```

| Directory | Contents |
|---|---|
| `lean/` | Rulebook, interpreter, checker, renderer, simulator and all proofs. |
| `app/` | React app: clinical painter, live and replay modes, dashboard. |
| `agent/` | Nightly discovery, certified design archives, configurable release cadence and a typed review gate; simulator-only off-shift tailoring sessions (`session*.ts`). Historical nightly protocols remain available. The offline `proposal-quality` harness compares recorded prompt variants without deploying. |
| `services/commit/` | Sole live store/writer: native guard, versioned patient event logs, chart/worklist projections, MAR and ADT; offline FHIR bootstrap. |
| `wasm/` | Lean → C → Emscripten build. |
| `world/` | Generator of simulated clinical days (patients, tasks, schedules). |
| `conformance/` | 201 held-out rule scenarios run against every deployed revision. |
| `releases/` | Vendor releases v1–v3 (rulebook + reference screens). |
| `infra/` | Isolated Postgres + Keycloak + commit Compose stack; initial-state import and identity provisioning. |
| `explore/` | Quality-diversity archive, descriptors, admitted generators and search. The standalone research harness never deploys; `agent/` reuses these modules for cadence releases. |

Cadence runs use protocol `certified-cadence-archive-v1`. `run-days` accepts
`--protocol certified-cadence-archive-v1 --cadence nightly|weekly|N` (`N` is a
positive number of simulation days); `--cadence` alone selects that protocol.
Omitting both retains the historical `core-10day` nightly selection path.
The archive protocol defaults to nightly shipping. Weekly slots are nights
7, 14, …; every-N-day slots are N, 2N, …, anchored to the run calendar. A veto,
failed validation or empty archive waits until the next slot. No discretionary
release occurs after the final simulated day.

`agent/src/night.ts` keeps the train/holdout boundary. Discovery uses past odd
calibration days' train partitions only; archive scores are refreshed against
the deployed layout on the latest two train days. It retains every proposal,
including unchosen alternatives, failures and historical estimates, in atomic
`<run>/archives/clinicians/<scope-hash>/night-N.json` snapshots. Only designs
passing `ehr check`, the independent identity movement budget (screen, parent
and tab, including renamed tags or existing IDs claiming `copyOf`) and the existing
whole-version screen gate enter elite cells. The archive reuses `explore/`'s
niches, generators, operators' feedback envelope and search/archive machinery.
One deterministic admitted layout/density/input variant is explored per night
without an extra model call; generating a new layout removes inherited layout
tags from clinical groups so niche labels reflect the resulting layout. Disjoint pairs from the same deployed baseline
are also checked as complete bundles. Whole archived programs are rechecked
against the current version; old-spec candidates remain recorded but cannot
ship into a new vendor release. Rejected and non-improving train evidence is
fed back to the generator; validation/test measurements never enter that
feedback. Full-program patches are summarized by hash and paths in prompts.

Scopes include clinician, owner, department and role. `--departments` accepts a
JSON object such as `'{"P1":"primary-care","P2":"emergency"}'`; omitted mappings
use `unspecified`. Department × role views under `archives/departments/` index
clinician shards and their niche winners. Estimates remain clinician-specific;
there is no pooled department score or automatic cross-clinician deployment.
Archives persist across nights and `--resume` within a run, not across unrelated
runs. Retry reads only snapshots strictly earlier than the unfinished night.
Manifests bind cadence, department mappings, review/switch-cost identities and
exploration source fingerprints; resume refuses a changed policy. The native
`verify-resume` preflight checks exploration fingerprints for cadence runs too.
The single-night `night` command refuses cadence runs because it cannot restore
their archive and external review/cost hooks; use `run-days --resume`.

A complete bundle's score is daily train click-plus-scroll saving minus
`switchCost(prev, next, clinicianContext)`. Pixel improvements still pass the
existing no-regression validation gate; pixel-only improvements do not produce
a positive scalar release score. The default `usage-weighted-movement-v1` is a
**simulation assumption**: one extra click-equivalent per observed use/day of
a displaced control. Displacement includes screen, parent, tab, order, size,
layout tag and shortcut changes, including descendants of changed groups. This is not measured relearning, learning or
forgetting. `agent/src/cadence.ts` exports the replaceable `SwitchCost` interface
for alternative cost models.

Opt in with `--bounded-costs` (`RunOptions.boundedCosts`) to use
`bounded-matched-relearning-v1` from `agent/src/bounded-tailoring.ts`. It replays
the latest two train schedules on both layouts from cloned carried train memory,
then practices each layout for three matched blocks and measures a fourth warm
reference. Dates, cases and paired seeds stay fixed. The signed first-k cost
minus warm cost is reported separately for each layout, then differenced
(after minus before). Archive observations retain seconds, click-plus-scroll
actions, k, practice count and the unchanged BFS expert comparison. The release
score subtracts only the nonnegative incremental actions divided by k; signed
results remain in evidence. Incomplete bounded/expert replays leave the bundle
ineligible, with `switchCostError` in its archive observation; a session with
incomplete evidence keeps current. Identity mismatches abort rather than becoming
fallback estimates. The next clinical day can proceed after a model obstruction.
Ignored bounded clicks carry a guaranteed-absent ID through the interpreter.
`app/src/dashboard/bounded-pointing.ts` supplies a separate metrics trace: it
projects the browser-measured reveal point of the remembered ordinal slot onto
the attempted viewport, without an extra scroll or clinical event. This is an
explicit simulation assumption, recorded in complaints and named virtual atlas
targets, not an observed click coordinate. Both release accounting and locality
use that projection; the original guarded trace is retained. Unmappable slots
and ordinary missing targets remain unavailable. This prevents deliberate
failed points from making every pixel validation ineligible.
Missing carried memory or a backend without bounded output uses the explicitly
labeled movement-proxy fallback. Opted-in runs carry an independent train-only
memory across odd calibration partitions; blind/validation cases never practice
that actor. Rehearsal memory is discarded. This is an uncalibrated simulation
estimate, not measured clinician learning or a guarantee of convergence.

Before release, the default `ReviewGate.review` receives 1–3 positive-scoring niche winners
(program bundles plus train estimates, switch costs, checker/screen evidence
and movement counts). It returns an offered bundle ID or `null`, with a reason;
`auto-approve-v1` chooses the highest score. `RunOptions.reviewGate` is the
integration hook for tailoring sessions; `RunOptions.switchCost` and
`switchCostModel` supply a replacement cost model. Both review and switch-cost hooks receive cloned inputs
and cannot mutate certified program bytes or the loop’s train context. Selection is followed by the
existing past-calibration validation, simulated user response, whole-version
screen check and atomic certified deployment. Mandatory vendor recertification
and migration retain their existing schedule and bypass discretionary cadence
and review; an old-spec layout cannot remain active after a rulebook update.
A read-only simulator review is available in the UI version browser (below);
there is no live clinician review control.

The self-contained fake path uses synthetic geometry and the fake checker,
certifies nothing, and makes no live model calls:

```sh
TMPDIR=/home/saithat/Projects/run-tmp pnpm --filter agent cadence-fake --out /home/saithat/Projects/run-tmp/cadence-demo
TMPDIR=/home/saithat/Projects/run-tmp pnpm --filter agent exec vitest run test/cadence.test.ts --maxWorkers=2
```

It exercises accumulation, weekly shipping, cross-night bundles, review vetoes,
switch-cost blocking, screen rejection, train-only feedback and resume. Manual examples select the first accepted and rejected candidates in sorted
night/persona order from `runs/core-10day/decisions`; missing optional
recordings omit examples while formal rule context remains required.
The retired hackathon RN recording is preserved in the `hackathon-final` tag;
its layouts exceed D5 and are excluded from current replay and audits. The browser audit script accepts `EHR_BIN` for a prebuilt native
checker. Run the template audit and then `--personas` sequentially under the
shared browser lock, using disk-backed `TMPDIR`; neither builds Lean. Use targeted
subsets during iteration:

```sh
export TMPDIR=/home/saithat/Projects/run-tmp CI=true
export EHR_BIN=/home/saithat/Projects/VGI-Health/lean/.lake/build/bin/ehr
flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off node scripts/audit-alert-policy.mjs "$TMPDIR/cadence-audit-templates"
flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off node scripts/audit-alert-policy.mjs "$TMPDIR/cadence-audit-personas" --personas
```

The retained live recording supplies browser regression inputs and three same-task
canonical trajectory controls (days 1, 4 and 7 for P3). `scripts/export-replay.mjs` projects the
first patient episode once per persona and natively simulates every revision
against it; dashboard interpreter comparisons consume each context's matching
trace rather than combining it with a different day's patient events.
Clinical browser assertions first select and hydrate that patient and reach the
relevant workflow; checker counterexample prefixes do not supply workspace
patient selection.
Recorded frames begin in the role's unselected workspace. A sequential scroll
following asynchronous chart arrival is applied after the incoming chart DOM
mounts, so it is not lost against the loading screen. Browser regressions check
the workspace before selection, then patient banners and clinical alerts after
hydration. Counterexample expectations follow the retained run's actual
`reviewsBeforeCommit` refusal; the global proposal list is independent of the
persona selected in Evolution. View-only playback changes remain inside
`app/src/dashboard` and preserve the certified clinical app hash.

Prompt golden hashes bind the current manual text, deterministic historical
examples and all 35 retained nightly contexts.

## Local setup and live validation

Requires Node ≥22.18, pnpm 11.8, Docker Compose and the pinned Lean 4.35
(`lean/lean-toolchain`). Fixture/world/recording data is local and gitignored;
restore it before importing or running archive tests. FHIR is an initial import
format only. `fixtures/clinical/overrides.json`, dated world resources and
`runs/world/2/context/day-01.json` are composed before the immutable import;
Synthea and Synthetic Hospital identities and references are preserved. The
loader verifies fixture hashes, normalizes resource IDs/references (including
stable content-derived IDs for anonymous resources), imports each
patient exactly once and refuses a changed baseline. Rerunning an identical
import preserves every later event. There is no online import/reset API.

```sh
export TMPDIR=/home/saithat/Projects/run-tmp CI=true
COMPOSE_PROJECT_NAME=vgi-local make install SYNTHETIC_HOSPITAL=1
make run APP_PORT=5173
```

`make install` builds native Lean, installs the workspace dependencies, checks
the packaged WASM manifest, generates untracked Keycloak credentials, starts
Postgres/Keycloak, provisions local accounts, imports patient baselines and starts
the commit service. Rebuild changed Lean sources with `make wasm` before
installation; `wasm/setup.sh` installs the pinned Emscripten toolchain when needed.
`make load` and `make seed` use the same immutable baseline loader. The legacy
world-seed entrypoints load `.env` and resolve paths from the checkout root;
`SYNTHETIC_HOSPITAL=0` selects a Synthea-only baseline.
`SEED_ARGS='--world runs/world/2 --day 1'` chooses its dated inputs.
Include `SYNTHETIC_HOSPITAL=1` on reruns of a cohort imported with hospital data.
A different baseline belongs in a new tenant/database, never over live history.

Default host ports are commit **18090**, Postgres **55532**, and Keycloak
**18180**; the app proxies `/commit` to the authority. Login uses Keycloak's
Authorization Code flow with S256 PKCE. Tokens remain in memory; a reload uses
the identity provider's existing session. Local persona passwords are in the
untracked `.env`; the browser never receives a password from the app server.
The authority loads a recorded persona deployment from `core-10day` only
when its program/certificate and current app, WASM and native build bindings
match; otherwise it uses the certified canonical role preset. Set
`COMMIT_RECORDED_RUN` to select another local recording. Baseline login always
uses the canonical preset. After an approved deployment or rebind, run `make load`
and restart the selected project's commit container to pin the new release;
already-open sessions refuse a changed release. The five persona buttons open
the clinical workspace; RN2 uses the P3 layout with its own authenticated identity
and review receipts. `/?workflow=mar` opens the
scheduled-dose authority and `/?workflow=adt` opens bed management. Clinical ED
admission selects a bed under Encounter options and commits with the board read
vector. The local ED persona has the signed admitting-clerk role; the surgeon
has the signed bed-manager role for discharge. Additional 4 West/operator
accounts are provisioned additively, with their separate local password. Their
subject bindings are local to `.cache/commit/keycloak-subjects.json` (or
`KEYCLOAK_SUBJECTS`); isolated checkouts do not share a scratch-file identity map.

The default deployment bounds its administrative board to 64 patients and 64
beds; a larger imported world must be partitioned explicitly. Initial occupancy
comes from active imported inpatient encounters. Patient facts and worklists
come from Postgres projections, and directory filtering happens in SQL before
JSON decoding. The service accepts no caller-supplied state, facts, role, mapper
effects or raw transactions. Dimensionless numeric entries use Lean’s `none`
unit when the optional display unit is absent, so flowsheet vitals and refill
quantities reach the interpreter. Nursing assessments project to their declared Observation targets, including narrative
assessment and pain reassessment.
Local structural R4 types live in
`app/src/data/fhir-r4.ts`; the pure mapper is called by the authority after
native acceptance. Worklist selections retain their source encounter; a name/MRN
lookup prefers the role’s care setting before date and status. Admission bed
selection is retained across field edits and is bound into the typed command.
Discharge closes inpatient episodes and removes them from the scheduled-dose
picker; already-open MAR sessions still require current patient versions and
the native active-order/encounter guard. Administrative state comparisons are
canonical across JSONB/native key order, so another patient’s placement cannot
rewrite an unchanged inpatient episode or advance its chart version. Scoped
journal reads redact full-board evidence from both clinical and administrative
ADT events.

`COMPOSE_PROJECT_NAME` selects isolated volumes. `COMMIT_PG_PORT`,
`COMMIT_PORT`, `KEYCLOAK_PORT` and `KEYCLOAK_BASE_URL` change bindings. Set
`KEYCLOAK_URL` to the same base for identity provisioning, and set the
corresponding `DATABASE_URL`, `COMMIT_BASE_URL`, `COMMIT_INTERNAL_URL`,
`KEYCLOAK_ISSUER` and `VITE_KEYCLOAK_ISSUER` consistently. The realm permits app
callbacks on ports 4173, 4179, 4186 and 5173. `make infra-down` preserves volumes;
`make infra-reset` removes only the selected project's volumes. Do not select
another deployment's project name for either command.

Integration/browser commands against a fresh local stack:

```sh
export TMPDIR=/home/saithat/Projects/run-tmp CI=true
cd lean && lake env lean --run ../services/commit/test/Fixture.lean > "$TMPDIR/commit-fixture.json"
cd ..
export DATABASE_URL=postgres://vgi:vgi-dev-only@127.0.0.1:55532/vgi_commit
export COMMIT_FIXTURE="$TMPDIR/commit-fixture.json"
pnpm --filter @vgi/commit test
pnpm --filter @vgi/commit test:integration
pnpm --filter app build
APP_TEST_PREVIEW=1 flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off pnpm --filter app exec playwright test live --project=desktop --project=narrow
COMMIT_INTERNAL_URL=http://127.0.0.1:8091 MAR_E2E=1 ADT_E2E=1 APP_TEST_PREVIEW=1 flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off pnpm --filter app exec playwright test mar-service.spec.ts adt-service.spec.ts --project=desktop --project=narrow
```

`scripts/clean-clone-test.sh` validates an offline build and recorded browser
flows in a scratch clone; it needs no live stack or credentials.

The service browser suites apply the selected viewport to every actor context
and run on desktop and narrow screens. They create and clean up their own tenant
and listener; they use the fresh stack's Postgres and Keycloak and never substitute mocked
clinical responses. Native/Postgres workflow tests exercise stale-version and
guard refusal for every workflow family, plus persisted-review recovery,
author isolation, date expiry and target-version invalidation.


## Run data and live review

`runs/<id>` is the single recording for a run, during execution and after it
stops. The dashboard, UI browser and trajectory player read that directory
through the local Vite dev/preview data layer. There is no second recording
or copy step. The retained recording is `core-10day`.
Catalog discovery ignores unrelated research manifests under `runs/` and validates
recordings before exposing their completed prefixes. The authored `mock` fixture
uses the same day/night fences; conformance evidence loads separately from the summary.
Its sparse scripted proposals retain their original measured examples; idle nights
carry the current layout with no proposal or measurement and complete the calendar.

New manifests declare `completionProtocol: atomic-prefix-v1`. After every
clinician's shift, canonical baseline, no-agent control and calibration output
are durable, the writer atomically commits `days/day-NN/digest.json`.
After all clinicians' nightly decisions and deployment pointers commit, it
atomically commits `completion/night-NN.json`. The shared writer uses a
same-directory temporary file, fsync, rename and directory fsync. Readers
advance through consecutive day/night fences; a later day cannot pass an
unfinished preceding night. Unmarked day/night files and staged revisions
are excluded from summaries, catalogs and direct artifact URLs. Readers do
not infer completion from directory existence or run status. A stopped run
retains its last completed prefix.

The completed prefix determines a cache key. Detail/evidence requests carry
that key so a refresh cannot mix two completed prefixes. Existing replay, trajectory,
complexity and conformance evidence is reused only when it covers that prefix,
and is filtered to its committed days/revisions. Missing derived evidence is
computed lazily in `runs/<id>/.cache/completed/<key>/`; this contains derived
views and an input file list, never copied source days, decisions, programs
or certificates. Native derivation is serialized under
`$TMPDIR/vgi-derived.lock`. Lazy native derivation requires a built native
checker and matching Lean modules (`EHR_BIN` and `EHR_LEAN_DIR` may select
an existing build); it never builds or re-certifies the EHR. Failures are
retryable and never create a ready receipt. Trajectory contexts retain native/WASM replay validation and frozen
certification specs. The run already writes build bindings at deployment;
review does not rebind or re-certify recordings. Rebind after a certified
renderer change remains an explicit separate operation.

Summary reads show completed days immediately; expensive derived evidence
loads separately. Active runs refresh every 30 seconds, without page reload
or resetting the selected view. Trajectory/Compare indices refresh when the
completed-prefix key changes. Terminal runs do not poll. The UI browser
refreshes its catalog with the selected active run. Missing derived evidence
is shown as unavailable/loading until it arrives; recorded clinical state is
never synthesized by the review layer.

Rename a stopped local recording with
`TMPDIR=/home/saithat/Projects/run-tmp node scripts/rename-run.mjs <old> <new>`.
It refuses an existing destination, active status, unsafe IDs and symlinks;
it renames in place, rewrites embedded identity/path references (including
compressed JSON and journals), updates transitive byte/semantic SHA-256
bindings, and recomputes day/night and whole-run content digests. Clinical
results and certificate semantics are preserved. On a rewrite failure the
reported destination is retained for recovery. Test the operation on a copy
before using it on a retained recording.

Stopped recordings made before the marker protocol need one explicit in-place
upgrade after renaming: `TMPDIR=/home/saithat/Projects/run-tmp node
scripts/mark-completed-run.mjs <id> <completed-days> <completed-nights>`.
It validates all requested clinician day/decision records and committed
pointers before installing fences. For the retained ten-day recording the
counts are `10 9`. Data and these caches remain gitignored.

Targeted checks for this path:

```sh
export TMPDIR=/home/saithat/Projects/run-tmp CI=true
node --import ./agent/node_modules/tsx/dist/loader.mjs --test scripts/run-prefix.test.mjs scripts/rename-run.test.mjs
pnpm --filter app exec vitest run tests/live-run-http.test.ts tests/run-refresh.test.ts tests/lazy-run.test.ts tests/run-selection.test.ts --maxWorkers=2
APP_TEST_PREVIEW=1 flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off pnpm --filter app exec playwright test live-dashboard.spec.ts dashboard-performance.spec.ts --project=desktop --workers=1
```


## What is proved

"Proved" means a Lean theorem checked by the kernel using only the standard
axioms (`propext`, `Classical.choice`, `Quot.sound`), with the statements
cross-checked by Lean's Comparator (`make verify`).

| Guarantee | Scope |
|---|---|
| No sign without its guard: required entries confirmed and human-entered where required, in the declared unit (lb never satisfies kg); reviews shown or covered by a valid receipt; interruptive alerts acknowledged; role allowed (`T0`, `T2`). | Every program, record and event sequence. |
| Macros and prefills never sign, acknowledge, create receipts or enter human-only values; a cosign names a second human (`T3`, `T6`). | Every program. |
| Alerts appear only when their condition holds; passive alerts never pop up (`A2`, `A4`). | Every program. |
| Checker acceptance implies 12 of 13 screen properties for every patient and reachable state (`accepted_*`). | Every accepted program. |
| Every required task stays completable (property 6). | Proved for restricted families only; open in general. |
| The screen tree keeps the patient banner, required review content, honest buttons and modal interruptive alerts (`D1`–`D6`). | Every program and record. |
| Bed assignments are exclusive; scheduled doses are given at most once; critical results are resolved or escalated by a deadline. | Lean reducers and multi-actor models. |

Not proved: that the rules are clinically complete; the React painter,
browser, FHIR import mapping and storage projections (tested); the Node/SQL
wrapper, Postgres and authentication (integration-tested); the Lean compiler and Emscripten (trusted); the AI agent
(untrusted; only accepted programs deploy).

## What parts of a real EHR are replicated

The app models the clinician-facing workflows of a hospital and clinic EHR on
FHIR data. It is a research system on synthetic patients, not a deployable
product.

| Area | Replicated | Not replicated or simplified |
|---|---|---|
| **Workflows** | Seven end-to-end workflows: W1 adult clinic visit (rooming → history → exam → orders → sign → close), W2 results inbox and patient messages, W3 emergency department (track board, triage, orders, disposition), W4 inpatient nursing (worklist, MAR, flowsheets, SBAR handoff), W5 pediatric visit (growth charts, vaccines), W6 surgery (consult, pre-op, operative note, post-op orders, OR schedule), W7 refill requests. | Pharmacy verification and dispensing, lab and radiology departments, scheduling engine, registration, billing and claims, patient portal. |
| **Roles** | Physician, nurse practitioner, RN, surgeon; charge nurse, bed manager and admitting clerk for bed management. Five personas: primary care, ED, inpatient RN, pediatric NP, surgeon. | Pharmacists, technicians, residents with supervision chains, schedulers. |
| **Chart** | Patient banner (name, DOB, MRN, allergies, code status, isolation, weight), patient sidebar, chart history tabs (encounters, notes, results, meds, problems, allergies, imaging), lab trends and flowsheets, WHO/CDC growth curves, chart search. | Imaging viewer (PACS), scanned media, outside-records exchange. |
| **Orders** | Medication order composer with order favorites, formulary dose units, kg dosing weight, route, frequency, PRN, dispense and refills, pharmacy, indication and diagnosis; lab, imaging and procedure orders; prior authorization (release v2); coded antibiotic indication (release v3). | Real e-prescribing transmission, pharmacy interventions. |
| **Safety checks** | Hard-stop sign guards; drug-allergy, interaction, duplicate-therapy, dose-range and high-alert alerts, interruptive (modal) or passive (inline); barcode patient and medication scan at administration; second-nurse cosign for high-alert drugs; patient-ID re-entry; review receipts that expire; critical-result escalation; California controlled-substance rules (CURES check, naloxone offer, Schedule II refills). | Real CURES/PDMP queries, barcode hardware, a full drug-knowledge base (a small formulary is built in). |
| **Documentation** | Visit and operative notes, nursing assessments, vaccine administration, consent, SBAR handoff, administration records. | Note templates, dictation. |
| **Bed management (ADT)** | Admit, assign, transfer, release, discharge and bed cleaning on a unit bed board, with exclusive beds and atomic transfers. | Enterprise patient flow, transport, multiple facilities. |
| **Regulatory updates** | Vendor releases v1 → v2 → v3 that add rules, migrated per clinician and re-certified. | Real vendor upgrade tooling. |
| **Data and storage** | Immutable FHIR R4 imports and Postgres event projections: Patient, Encounter, Observation, Condition, AllergyIntolerance, MedicationRequest, MedicationAdministration, Immunization, DiagnosticReport, DocumentReference, ServiceRequest, Procedure, Consent, Appointment, Task, Communication, ChargeItem, Provenance. Native-guarded, versioned commands and live updates for all workflows. | HL7v2 interfaces, enterprise patient index, production audit logging, high availability. |
| **Identity** | Keycloak single sign-on (PKCE) for all live clinical, MAR and bed-management workflows. | Production identity, break-the-glass access. |
| **Users** | Simulated clinicians with seeded behavior and interruptions, measured in clicks, scrolls and mouse travel. The default policy plans through the current screens; an optional bounded policy learns locations and searches visible controls. | Real clinicians; no user study. Search, practice, forgetting and hidden tastes use uncalibrated simulation assumptions. |

## Bounded clinician simulation

`Ehr.Sim.Policy.simulate` and its historical JSON output are unchanged. Select
`ehr simulate ... --policy bounded` (or `"policy":"bounded"` in the persona).
`expert` is the default; an explicit CLI policy overrides the persona. Pass
`--memory-in FILE --memory-out FILE` to carry one actor's layout knowledge
across days and program revisions. The result also contains `memory`; an actor
mismatch is rejected. Do not share memory between clinicians or counterfactual
arms. Empty memory represents an unfamiliar interface.

`lean/Ehr/Sim/Bounded.lean` owns the policy. Memory is keyed by stable component
`tag`, falling back to `id`; it records screen, parent, tab, ordinal position,
experienced navigation route, last-use day and exposure count. Strength is
`1000 * sqrt(exposures / (1 + ageDays))`, rounded down, with confidence at 1400.
Using a newly discovered location resets its practice count; deploying a program
never refreshes memory. Recall uses visible links to remembered screens and
experienced container/tab events, without retracing earlier goals. A stale location
causes a charged pointing/click attempt and then visual search. The attempted
location is recorded in an observation; a guaranteed-absent ID goes through the
interpreter and is ignored, rather than activating an unrelated clinical action.

Unknown controls incur a serial scan through the shown items preceding the
control (180 ms/item). Episode-local visual working memory retains labels
already scanned, so switching a tab or backtracking does not reread unchanged
chrome. Persistent placement confidence still strengthens only on use. Navigation
starts with lexical scent, then prefers unvisited screens/views when scent
stalls. The patience budget is logarithmic in screen count; a separate hard fuel
bound scales with component count and the number of clinical goals. These
mechanics and budgets are simulation assumptions.

A clinician who still cannot find a goal types its clinical rulebook label into
a shown search box, if available, and asks for help. Internal intent keys and
scent-expansion terms are not typed or charged as human query keystrokes. `Ehr.Sim.Discovery.Guide` is a pure assistance
boundary (`Context → State → Option (List Event)`). The default simulated help
desk knows the deployed layout and uses the existing BFS navigation solver to
return one route. The unassisted clinician never gets that layout map. Help
costs the actual search activation/typing, one `waitMs` (60 seconds), one
`mentalMs` for the reply, instruction-reading time, and every guided UI event.
The help wait is an uncalibrated simulation assumption. A failed provider reports
an obstruction; it cannot supply captures, interpreter state, commits, or a guard
exemption. Help answers are recorded separately from unassisted discoveries.

Tabs expose their declared indices. `Bounded.Scent := String → Component → Nat`
is the pure, replaceable scoring interface for a future decision model. Recall
uses logarithmic choice time and a diminishing square-root practice term. The
architecture follows Cockburn, Gutwin & Greenberg, CHI 2007,
[doi:10.1145/1240624.1240723](https://doi.org/10.1145/1240624.1240723);
the coefficients and memory law remain explicitly simulation assumptions.
[CogTool's KLM tutorial](https://www.cogtool.org/tutorial/) describes skilled
execution, not a general novice/expert multiplier. Cockburn's menu calibration
also does not establish a whole-EHR ratio. Cost reports separate search/help
contributions and retain all timing coefficients rather than tuning to a desired
ratio. Every clinical event, including failed attempts and guided actions, uses
the existing guarded interpreter. There are no new clinical rules or proof
assumptions.

Bounded results retain the original `tasks`, `trace`, `floor` and `complaints`.
`expert` contains an independent unchanged BFS-policy run on the same inputs and
seed: the expert comparison, not a newly proved minimum (persona noise can make
its cost exceed the bounded run). `floor` remains the ideal-interface clinical
floor. `effort` adds per-task misses, visual searches, scanned items, backtracks,
synthetic ordinal mouse travel, cognitive milliseconds and `helpRequests`.
`expertTravelUnits` reports the same ordinal proxy for the expert trace;
`learnability` contains signed per-task gaps in clicks, scrolls, keystrokes,
time and travel. `observations` links
search/recall/miss decisions to trace indices and old locations. `assistance`
records the task, request reason/query, hinted screen/control/caption, route, and
caption-only `labelMatch` against the actual target's clinical intent. Zero
lexical overlap is a named model finding, not proof of human undiscoverability.
Task time includes cognitive time as well as trace KLM operators; visual searches are not
search-box activations. Travel is an ordinal-layout proxy, not browser pixels.
Report completion alongside costs; an incomplete task's lower cost is not an
improvement. Signed bounded-minus-expert differences measure learnability cost.
`Bounded.relearningCost firstDays steadyDays : Int` computes summed first-k-day
cost minus k times mean steady cost; use matched workloads and report k and the
steady-state sampling protocol, retaining negative results.

Hidden persona preferences are optional `hiddenPreferences` with `placements`
(`tag`, `nearTag`, `weight`) and `changeSensitivity` (zero is neutral). The pure
boundary for tailoring is
`Bounded.ratePrograms (prefs : HiddenPreferences) (before after : Program)
(recent : List RecentDay) : Rating`. Recent days contain `usedTags` and `costMs`;
the current assumption-based rating uses use frequency to weight disruption,
placement distances to score preferences, and reserves costMs for later fitting.
Positive score chooses after; ties keep before. `seededPreferences seed actor`
provides optional deterministic tastes. The native stdin command
`ehr rate-programs` exposes this pure function for the private simulated chooser
(`before`, `after`, `actor`, `seed`, optional `preferences`, and `recent`).
Hidden preferences and change sensitivity are excluded from designer prompts;
the session exports choices and qualitative reasons, not utility scores or taste
weights. These preferences do not alter clinical
goals or the historical default policy.

World generation accepts `--policy bounded` and optional `--hidden-preferences`;
its taste seed matches Lean's `seededPreferences`. Without these options the
persona JSON stays unchanged. The agent adapter accepts optional `policy` and
`memory` on `SimulateInput` and preserves the bounded result fields. `run-days`
loads the prior committed day's memory, including on resume. Canonical baselines
and vendor-only controls retain independent actor memories. Train estimates
compare both programs from the same training-day memory snapshot and discard
counterfactual updates; validation without an explicit snapshot is a cold run.

For reproducible small comparisons, run
`TMPDIR=/home/saithat/Projects/run-tmp python3 scripts/user-model-compare.py
--out /home/saithat/Projects/run-tmp/user-model-comparison`. It samples the first
task of each represented workflow for every v1/v3 persona template, verifies
byte determinism/default equivalence, and compares three adjacent historical
P1 deployments. The template comparison fails on any task completed by the expert but missed by the
bounded actor and reports its task ID. `--all-tasks --templates-only` instead
checks entire day-1/v1 and day-7/v3 schedules for every persona, starting each
workday with empty actor memory. The per-deploy protocol uses k=2 matched dated
workloads, five before-program training blocks, and an independent eight-block after-program
warm reference. It reports incomplete tasks, the common completed task set,
expert and bounded effort, help and visual-search milliseconds, and signed
relearning milliseconds. Each report fingerprints the native binary and rejects
evidence mixed across a rebuild. The completion-accounting regression runs with
`python3 scripts/test-user-model-compare.py`. Scratch JSON is evidence output; no recorded runs, fixtures or certificates are rewritten.

## Open problems

How users are simulated and how the agent changes the interface are the two
weakest parts.

- **Simulated users are uncalibrated.** The default simulated clinician still
  knows the layout: it plans the shortest path through the whole current
  program by breadth-first search over real interpreter steps
  (`lean/Ehr/Sim/Interaction.lean`), so a rearranged layout costs it nothing.
  An opt-in bounded-knowledge clinician (`lean/Ehr/Sim/Bounded.lean`,
  `Discovery.lean`) remembers where controls were, misses after a move,
  searches by label and falls back to charged help; it measures discovery and
  relearning cost, and the BFS result is kept as the expert floor. Its search,
  memory, timing, help and preference parameters are simulation assumptions,
  not estimates from clinician observations. Completion parity with the expert
  is a regression requirement on the sampled and full persona workdays, not a
  theorem. Patient-directory selection still uses the shared fixed policy.
- **Clinician participation and design exploration are limited.** Historical
  nightly runs deploy a greedy patch or disjoint bundle. The opt-in cadence
  protocol keeps certified, screen-gated alternatives in a quality-diversity
  archive, preserves unchosen train estimates and known duds, and ships through
  a configurable schedule and review hook. Optional bounded switch costs and
  tailoring sessions now connect that archive to the bounded clinician's
  relearning estimate and private choice function. Defaults retain the movement
  proxy and auto-approval. Sessions export train-only comparisons and friction
  to later nightly prompts. The admitted generator changes layout tags, density and shortcuts and can
  move review components or complete groups through the same certification gates.
  Its finite public placement enumeration still bounds which tastes can be recovered. There is
  no live in-app choice/flag control, human calibration or live cadence study.

## Offline tailoring sessions (simulator only)

`agent/src/session.ts` prepares an off-shift, weekly or monthly review from a
`SessionArchive` of whole candidate bundles. It verifies the certificate's
program hash/spec, rechecks each candidate against the current program and
canonical reference (including the current stability budget), removes duplicate
expanded layouts (ignoring unused definitions and version numbers), and selects 2–3 options by farthest-first diversity over component
changes and locations. Fewer than two eligible, replay-complete options leaves
the current layout in place by failing preparation; no option is invented or
deployed. `phase: "offShift"` is required. Cadence is review metadata here;
the archive/release scheduler remains responsible for scheduling and release gates.

Evidence reuses `EhrClient.simulate` on the same clinician's supplied recent
schedules, world and paired seeds for current versus each option. Future days,
foreign schedules and incomplete/mismatched task replays are rejected. Totals
report clicks, keystrokes and scrolls saved, with negative savings retained.
`layoutChanges` expands composites and records additions, removals, edits and
old→new screen, parent, tab and list position. Passing `bounded: {memory}` to
`prepareSession` uses the shared bounded relearning estimator above and records
bounded and expert costs beside signed relearning seconds/actions. Without
that opt-in, or when bounded evidence is unavailable, the record labels its
fallback: 0.5 minutes per moved component plus 0.25 per other change. Historical
session callers retain their existing replay policy. Neither estimate is a
measured clinician learning or clinical time benefit.

`SessionChooser` accepts the prepared record and returns one option ID or
`null` (keep current), a reason and optional per-option reasons. The temporary
`seededSessionChooser` keeps seeded preference weights private in a closure,
compares savings against estimated relearning, and can reject every option.
It remains the historical default. `boundedSessionChooser` instead calls
Lean's `Bounded.ratePrograms` inside a private clinician closure, using hidden
placement preferences, change sensitivity and train trace use frequencies;
positive utility chooses an option, and ties keep current. Among positive
options it chooses highest utility with an ID tie break. Hidden tastes do not
enter the session record or designer prompt. This remains a simulation, not a
human study. `answerSession` validates the choice and exports winner-versus-each
alternative comparisons, including current, program hashes and change features;
it infers no ranking among rejected options. `chosenSessionBundle` returns the
whole selected bundle for a later cadence gate. None of these functions deploys
or edits a program. The agent's generator authors every candidate.

`agent/src/session-schema.ts` reexports the shared review wire schema from
`app/src/browser/session-schema.ts` (inside the review-only hash boundary).
It defines optional typed friction entries alongside interaction
entries in `SessionTraceEntry`: `slowHere` or a bounded free-text `wish`, with
clinician, program hash, day, task, time, screen and optional component. They
are feedback metadata, not Lean interpreter events. `flagFriction` appends the
annotation without an interpreter call or clinical-state mutation;
`traceFriction` extracts it. `sessionGeneratorInput` scopes flags and recorded
pairwise comparisons to this clinician and past days, and marks wishes/reasons
as untrusted data. A generator passes this result as the optional
`NightlyContext.tailoring` prompt input. Opting into cadence sessions wires this input into subsequent nightly prompts;
flags must match actual train task/day IDs and the session owner, and sessions
must precede the proposal night. Foreign, future, blind and validation feedback
is excluded. Existing nightly callers are unchanged.
There is no in-app flag control; a future control would enqueue this annotation
without interrupting work or changing screens during a shift.

`recordSession` writes one immutable JSON record to `runs/sessions/<id>.json`
(options, full programs/certificates, recent schedules and simulated traces,
evidence, choice/reasons and comparisons). These files are gitignored data.
The offline harness runs without an LLM or deployment:

```sh
TMPDIR=/home/saithat/Projects/run-tmp \
EHR_BIN=/home/saithat/Projects/VGI-Health/lean/.lake/build/bin/ehr \
pnpm --filter agent exec tsx src/session-cli.ts /absolute/path/to/session-input.json
```

The input shape is `inputSchema` in `agent/src/session-cli.ts`: current and
canonical programs, persona, nonempty recent schedules, world directory,
archive candidates with certificates, session metadata, seed and optional flags.
Use absolute input/world paths; output defaults to this repo's `runs/`. The
harness always uses the simulated chooser. Fake backend evidence is permitted
only in tests and certifies nothing.

Open `/browse?session=/runs/sessions/<id>.json` for the desktop review.
Cadence records served under a run use
`/browse?session=/runs/<run-id>/runs/sessions/<id>.json`. Current
and candidate layouts appear side by side for the same selectable recent case,
with independently scrubbed recorded event sequences and highlighted targets
in a component layout map. This map shows recorded screen/order/target, not
clinical values or a full clinical painter replay. Savings, old→new locations,
labeled relearning, bounded/expert costs when available, flags, the choice and
reasons are shown explicitly. The
page is read-only, simulator-only, and covered at 1440×900. App changes stay
inside `app/src/browser`; the certified clinical app hash is unchanged.

Validation for this module uses the fake backend and no LLM calls:

```sh
TMPDIR=/home/saithat/Projects/run-tmp pnpm --filter agent exec vitest run test/session.test.ts test/bounded-tailoring.test.ts --maxWorkers=2
TMPDIR=/home/saithat/Projects/run-tmp pnpm --filter app build
TMPDIR=/home/saithat/Projects/run-tmp pnpm --filter app exec playwright test --config src/browser/session-playwright.config.ts
```

`run-days --protocol certified-cadence-archive-v1 --cadence weekly
--bounded-costs --tailoring-sessions` enables the connected path. On a release
slot, `sessionReviewGate` recertifies the archive's top three niche bundles in
scratch and prepares 2–3 diverse replay-complete options. Sessions may consider
nonpositive effort scores to express a placement preference; auto-approval still
requires a positive net score. Fewer than two eligible options or a `null`
choice keeps current. A choice still passes the existing validation, stability,
screen and atomic deployment gates. It replaces the legacy random login veto;
the simulated clinician has already decided. Session records live at
`<run>/runs/sessions/`; retry compares against the same immutable bytes. Fresh
certificate issuance times use the original timestamp for comparison; all other
proof, evidence and choice fields must match, and saved bytes are never rewritten.
Optional
`RunOptions.frictionFlags` and recorded comparisons enter later
`NightlyContext.tailoring`, scoped to past train tasks. Review/model identities,
friction inputs and discovery mode are bound in the resume manifest.

`--generator-only` selects admitted explore discovery without constructing a
live backend or injecting scripted tempting moves. `runDays` substitutes a
backend that refuses every model call, including accidental migration/repair
calls. Optional `--discovery-nights N` stops new exploration after night N
while retained bundles continue to be rescored and reviewed; the cutoff is
bound in the manifest. Fixed-release experiments use `--feature-day 100 --migration-day 101`.
It stages custom artifacts under the run directory, uses native certification
and the usual screen/validation gates, and labels manifests `OFFLINE`.
Omitting the new flags preserves the historical protocols.

`ColumnsNode` uses the group's container width: two columns from 48em and three
from 75em, each capped by its child count. Narrow-region regressions cover
768–1920px and doubled text alongside the physical screen matrix. Recheck an
offline candidate with `pnpm --filter agent exec tsx src/offline-columns-check.ts
--comparison <comparison-directory> --out <scratch>`.

Screen gates share `$TMPDIR/vgi-screen-check-cache`: `physical/` retains the
existing atomic physical samples and `results/` holds checksummed per-tree
pass/fail results, geometry and physical findings. `EHR_SCREEN_CACHE_DIR`
overrides that one root. Keys hash canonical JSON (object key order and whitespace
are irrelevant; array order is preserved), the certified app build, served
WASM/asset manifest and asset bytes, font manifest and font bytes, capture settings,
Chromium/Playwright/runtime pins, fidelity viewports, the complete physical-policy
matrix/version, assertion sources and the presentation bundle. Synthetic geometry
probes have a separate key. Run, persona, revision and path are absent from the
key. Corrupt or incomplete results miss; infrastructure errors are never cached.
Cached failures remain failures and known-bad controls run on every invocation.
`EHR_SCREEN_CACHE=0` bypasses both result and physical-sample reads/writes for an
independent comparison. Every input state retains its own result/geometry mapping.

The default pool is four workers; `EHR_SCREEN_WORKERS=1` selects serial execution,
and values above six are capped at six (browser workers also respect the existing
memory budget). Parallel `run-days` divides the default four-worker budget
across persona checkers and limits explicitly requested workers to six in total.
Distinct uncached trees run through this bounded Playwright pool.
`scripts/recertify-runs.mjs --runs core-10day --out <scratch>` concurrently
runs native deploy/export checks with isolated output directories, then batches
all revisions by presentation bundle through the same browser gate. A file
manifest avoids command-line size limits. Reports preserve persona/revision/tree
order; failed siblings retain their own refusals. Frozen spec, canonical and
previous inputs are mandatory and are never rewritten by this command. It stages
native certificates and `recertification.json` in scratch; it does not replace
recorded certificates, measurements, run metadata or replay. The migration command
below consumes this batch gate when `--recertify-only` is selected and retains its
existing certificate installation, remeasurement and strict replay checks.
`core-10day` is the single retained recording.

Compare cold and warm certification with one shared lock, sequential commands
and a fresh cache root for each cold experiment:

```sh
export TMPDIR=/home/saithat/Projects/run-tmp CI=true EHR_SCREEN_WORKERS=4
export EHR_SCREEN_CACHE_DIR="$TMPDIR/screen-recert-cache"
flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off \
  node scripts/recertify-runs.mjs --runs core-10day --out "$TMPDIR/screen-recert-cold"
flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off \
  node scripts/recertify-runs.mjs --runs core-10day --out "$TMPDIR/screen-recert-warm"
node scripts/compare-screen-results.mjs \
  "$TMPDIR/screen-recert-cold/recertification.json" \
  "$TMPDIR/screen-recert-warm/recertification.json"
flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off \
  node --test scripts/screen-cache-browser.test.mjs
```

The browser integration test compares real serial, four-worker, cold, warm and
cache-disabled per-tree verdicts and physical samples, including a deliberately
disabled urgent acknowledgment. For full audits, select a separate fresh cache
root, run templates then `--personas` sequentially, then repeat with that same
root for warm reports. Compare each output's `result.json` with
`scripts/compare-screen-results.mjs`; `elapsedMs`, cache hits/misses and physical
coverage are retained in reports. Compare a cache-disabled recording report too;
optionally rebuild after one small painter change, confirm misses, and restore
and rebuild before certificate installation.

`node scripts/migrate-neutral-terms.mjs --recertify-only --runs
core-10day` skips terminology/identity rewrites and selects only
those recordings. It retains frozen spec/canonical/previous inputs, applies
native and whole-version screen gates, updates build bindings, remeasures the
preserved schedules, regenerates trajectories (including existing same-task
baseline controls), and verifies strict WASM replay. Results are written to
`runs/recertification-report.json`; model choices remain recorded inputs.
Before remeasurement, incompatible atlas generations are renamed intact into
`migration/geometry-history/`, with byte-hash receipts; current measurements
use a new active `geometry/` namespace. The adapter still refuses mismatched
program/component/build bindings. Status remains pending until measurement and
regenerated replay verification finish.
Rejected recertifications cannot supply conformance targets.

The native offline A/B/C harness creates independent archives and memories for
nightly auto-ship, weekly auto-ship, and weekly sessions. It fixes v1, uses the
same seed-1 world and task-role-specific P1/P2 hidden preferences, and samples the first
two v1-compatible W1 tasks for P1 and two W3 tasks for P2 on each of eight workdays (32 tasks
per arm; one weekly slot, night 7). Discovery proposes one admitted variant on
each of nights 1–3 per clinician. Every third-night cycle reserves its second
night for public clinical placement proposals: move a review beside task entry,
with admitted compact fields and keyboard navigation; other nights cycle layout
variants. Complete-group reorderings follow review moves in the enumeration.
All proposals retain the same native, identity-movement, screen, replay and release
gates. Nights 4–7 rescore the retained archive. All arms share the
existing exact-tree/context screen cache, without sharing actor memory or train
scores. Discovery starts from each arm's active program, so the equal proposal
budget can produce different candidate sets after a release. Total KLM seconds
include actual search, help and relearning;
rehearsal and off-shift review duration are excluded. Reports include completion,
click-plus-scroll actions, BFS expert costs, shipped changes, review keeps,
placement availability/distance and whether each target pair ends within one
ordinal position on the same screen. Missing tags count as unrecovered, not a
neutral preference. This short experiment does not establish long-run cadence
superiority or fit preference parameters.

The new comparison declares `workflow-local-review-v1` before measurement
(`agent/src/offline-preferences.ts`). Its **simulation assumption** is that a
primary-care prescriber wants the W1 allergy context beside dose entry, and an
emergency prescriber wants the analogous W3 context there. Seeded preference
weights and disruption sensitivities are each 1–3 in the existing ordinal rating
units; seed 1 gives P1 weight 3/sensitivity 2 and P2 weight 1/sensitivity 3.
The previous universal W1 pair was absent from P2's program. The smaller declared
disruption scale permits testing local placement choices under the existing
40-units-per-ordinal cost; these are neither measured nor fitted preferences.
Native rating, completion, applicability and release assertions are unchanged.
Only the chooser receives these tastes. The generator uses public clinical
structure and receives no hidden tags or weights. `explore/placements.ts` also
supports explicit component/subtree moves across selected workflow screens,
container regions, tabs and sibling positions; it rejects cycles, unknown
anchors and movement-budget excess before the ordinary native gate.

The fixed-v1 sample excludes W1 orders whose explicit kind is imaging or
procedure: those require v2's `orderKind`/`orderCode` captures. Selection uses
clinical type before any performance measurement, preserves selected tasks,
and an independent expert preflight must complete every selected goal before
the multi-night run starts (`--preflight-only` stops after that check).

Bounded action totals use browser-normalized scroll counts; the nested unchanged
expert retains native scroll counts. Compare the reported KLM seconds for the
time comparison. Those seconds retain native operator and cognitive timing;
browser pixel accounting does not refit the timing model.

Within this immutable world/build/assertion context, `immutableScreenChecks`
also memoizes exact screen-check inputs to avoid re-exporting unchanged trees
on every rescore. Workspace/program changes miss that cache, geometry remains
delegated to the real checker, and infrastructure errors are retried. Cached
results are cloned; a physical-policy rejection remains a rejection.

Optional `--reuse-evidence <prior-output> --reuse-source <measured-commit>`
reuses only prior real screen results/rectangles for exact program/workspace
inputs. Native binary, specs, fixtures, painter/tests/policy/browser context,
world metadata/facts and rendering/client source are checked. Stored schedule
files may differ because the native API takes the full schedule explicitly;
changed task inputs miss the cache. Actor memories, simulations, archive scores,
choices and deployments are recomputed. Reuse provenance and hit counts enter
`comparison.json`; resume fingerprint checks remain unchanged.

```sh
TMPDIR=/home/saithat/Projects/run-tmp EHR_SCREEN_WORKERS=4 \
flock /home/saithat/Projects/run-tmp/vgi-browser-heavy.lock \
pnpm --filter agent exec tsx src/offline-tailoring-compare.ts \
  --out /home/saithat/Projects/run-tmp/wire-tailoring-medication-comparison --days 8
```

`--world` defaults to this checkout's `runs/world/2`. The outer `flock`
serializes this harness against full audits; agent-internal
screen checks do not take that lock themselves. Data, native transcripts,
certificates and `comparison.json` remain outside git. `--resume` resumes the same fingerprinted inputs; it cannot mix rebuilt
native binaries. The standalone session CLI accepts `bounded: true` plus
`memory` to select bounded evidence/choice; omitted fields retain its historical
seeded chooser and labeled heuristic. No WASM rebuild is needed to run this
native adapter. `node scripts/wasm-assets.mjs` verifies the installed source and
asset manifest; Lean source changes require rebuilding WASM and that manifest.

The held-out suite includes explicit source-labelled minor interaction evidence
(`CriticalResults.followThrough`, `Core.Alerts.keys`): a current-medication class
alone does not establish a minor interaction.
The fixture selects class-interaction evidence for frozen specs using
`V1.minorInteractionPopupAlert` (`cond = interaction`) and minor-only evidence
for the successor. `Core.Alerts.keys` suppresses minor alerts under severe
interaction evidence. Both contracts retain the same firing and completion
assertions, without rewriting frozen rules or changing scenario applicability;
native unit fixtures exercise both conditions. Native tests default to the
checkout's built `ehr` before the optional cached binary.

The critical-result case checks
available/unresolved urgency, non-resolution by UI acknowledgment or inbox
signing, and the separate receive/document/resolve path. The shared `chart`
scope is part of every persona's workflow contract. The CURES-removal audit is
bound to the current program/spec/binary and must fail `completable` when neither
the report nor a reachable waiver is available; stored checker evidence never
supplies behavioral expectations. Saved reports retain source-digested refresh
provenance for the complete critical-result path and version-bound nursing
fixture, alongside the independently rerun full-suite evidence. No clinical or
design rule was changed.


## Terminology and fictional identities

Screens use neutral clinical terms: Patient sidebar, Inbox, workflow, Chart
History, Activities and Order favorites. Synthea and Synthetic Hospital keep
their fictional patient identities and IDs; `scripts/fictional-identities.mjs`
replaces every facility, location, practitioner, payer and contact detail with
seeded fictional values in the fixture pipeline, and
`scripts/fictional-identities.test.mjs` fails on any name outside that
generator.

The import regression checks the restored seed-1 worklists exactly: 20 primary-care
appointments, 19 refill requests and nine future OR cases, including appointment
and surgical-case identity agreement with the source world.

World generation preserves the frozen seed-serialization keys and inbox random
stream internally (`world/src/seed-contract.ts`), so terminology changes do not
redraw clinical cases. Persisted state uses neutral keys. Worlds 1/2 are immutable
pre-critical-result inputs; exact snapshot tests construct the explicit additive
critical-result successor, and world 1 also applies the documented service-order
release gate and release-event display rename. The full current generator's
critical-route tests remain active. Clinical overlay generation fictionalizes
complete bundles once; per-resource repetition previously changed clinical
specialty text. Reproducibility tests now use scratch copies and generation
refreshes named context files without deleting recorded context directories.

Regenerating derived artifacts:

Curated screenshot fidelity covers the complete clinical root, including the
urgent strip outside the inner shell. Saved P1 UI samples come from the current
native `ExportTests.lean` inputs; stale source labels require regenerating those
samples before native/WASM comparison.

- `node scripts/regenerate-full-fixture.mjs`: the mapper's full-profile v3
  fixture.
- `node scripts/refresh-clinical-fixtures.mjs`: the five painter samples and
  saved clinical semantic screens, from the native interpreter and local world.
  `--live-selection-only` reconstructs the saved live-selection snapshot
  sidecars without rewriting painter fixture inputs. These sidecars supply the
  18 live-selection captures in the opt-in neutral screenshot refresh; images
  alone do not satisfy its semantic-fidelity coverage check. Run
  `live-selection.spec.ts` against the fresh authority after that refresh to
  replace those references with the actual live PNG/model pairs and update
  their manifest digests. Selection must issue no clinical commands.
- `node conformance/verify.mjs <run>` then `node conformance/refresh-evidence.mjs
  <run>`: agreement of independent conformance runs, then the derived case
  reports and checker probes.
- `TMPDIR=/home/saithat/Projects/run-tmp node scripts/migrate-neutral-terms.mjs`
  (after building Lean, WASM and the app): one-time rewrite of local `runs/`,
  `programs/` and `fixtures/` to the current terms and fictional identities,
  rebuilding digests, certificates and bindings and checking strict replay.
  Recordings the current gates reject are listed in
  `runs/neutral-migration-report.json` and cannot supply conformance targets or
  deployment bindings.

`AUDIT_RUN` selects the local recording for the performance audit.

## Data sources

- **Synthea** (Apache-2.0) synthetic patients. Walonoski J, et al. *Synthea.*
  JAMIA 2018;25(3):230–238.
- **Synthetic Hospital** (code MIT; data fully synthetic and redistributable)
  longitudinal records. Park, Chen, Dettmers, preprint 2026,
  https://arxiv.org/abs/2609.30027.
- CPT is a trademark of the AMA; only a few code identifiers with original
  short labels are included.
- Fonts: Noto Sans, Noto Sans Mono and Noto Sans Symbols 2 (SIL OFL 1.1).
