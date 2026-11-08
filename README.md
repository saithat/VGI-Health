_README last reviewed against commit `b687d2cc` (2026-11-07)._

# VGI Health

[![CI](https://github.com/saithat/VGI-Health/actions/workflows/ci.yml/badge.svg)](https://github.com/saithat/VGI-Health/actions/workflows/ci.yml)

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
    PROTOCOL["Commit protocol abstraction<br/>new specs + kernel proofs"]:::proved
    CORE["Core<br/>interpreter: init · step · view<br/>commit guard"]:::proved
    CHECK["Check<br/>checker + soundness proofs"]:::proved
    RENDER["Render<br/>FHIR → facts<br/>state → screen tree"]:::proved
    SIM["Sim<br/>simulated clinicians,<br/>min-click search"]:::trusted
    SPECS --> CORE --> CHECK
    CORE --> RENDER
    CORE --> SIM
  end

  TOOLCHAIN["Lean compiler + native clang"]:::trusted
  TOOLCHAIN --> NATIVE
  NATIVE["native ehr binary"]:::trusted
  WASM["ehr-interp.wasm<br/>untrusted preview + renderer"]:::untrusted
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
  PAINTER -->|"versioned journal + painted screen hashes<br/>request-bound command"| COMMIT
  PROTOCOL -.->|"trace refinement test"| COMMIT
  OIDC --> COMMIT
  COMMIT -->|"ehr serve: native screen comparison<br/>+ current guard"| NATIVE
  COMMIT -->|"locked expected-version append<br/>+ atomic projection"| STORE
  STORE -->|"authorized chart + directory reads"| COMMIT
  IMPORT --> COMMIT
```

Green: proved in Lean. Blue: tested. Grey: trusted. Red: untrusted by design.

**One click.** WASM `step` previews the interaction and `renderUi` supplies the
screen tree. The painter records the exact object it receives, including the
banner, required reviews and interruptive alerts. The host checks Lean's
canonical serialization against an independent encoding of that painted object,
then hashes its UTF-8 bytes with SHA-256. In live mode every command binds the
ordered screen evidence to its request ID. The commit service reconstructs the
authenticated clinician's journal using its pinned release, renders each source
screen natively and compares its hash, including the command's source screen.
Missing, reordered or differing evidence returns retry-safe
`screen_fingerprint_mismatch` (422), rolls back the request reservation, and
appends no event or projection. Existing version-conflict refusals retain their
priority. Diagnostics contain the request ID, step, both
hashes and release name/hash. Corrected evidence may reuse the refused ID;
uncertain transport outcomes retain the exact original intent. WASM and
Emscripten are untrusted for this comparison; native Lean compilation and clang
remain trusted. Every clinical commit and review receipt
is a typed command with the version of the chart actually read. The service
locks the patient stream, checks the expected version and runs the native Lean
guard on current stored data. Only acceptance appends an event and materializes
its read projection in the same Postgres transaction. MAR also locks the exact
scheduled dose; clinical placement and administrative ADT commands use the same
bed streams and native ADT reducer. A rejected or stale command cannot publish
any of these effects. There is no browser FHIR writer.

Noncommitting interactions preview locally and are submitted as an ordered
human-event journal before the next command; every field edit retains its
position and displayed evidence. Each native ready screen since the previous
successful command is mandatory. Loading screens are compared when React
actually paints them; batched-away loading frames require no evidence. Returning
to the directory discards clinical state and starts a fresh patient session at
native init, so another patient's evidence cannot authorize a command. Chart
hydration and post-command rendering use native projections, avoiding browser
recomputation of the authoritative display. Version-bound native caches remain available for interaction previews. Commands
bypass them for reconstruction; a stale cache cannot suppress comparison of a new step.
The final native guard and locked version checks remain authoritative. Request IDs bind exact
intent and allow recovery of an uncertain outcome without duplicating a write.
An unresolved save blocks new interactions, including patient switches, until
the original intent is reconciled.
MAR ignores delayed notifications for a chart version already adopted, preserving
the freshly reviewed session and its subsequent journal. Newer versions still
refresh the chart and discard stale evidence.
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
  Note over P: Capture exact painted tree at each journal step
  P->>P: canonical bytes + host SHA-256
  P->>S: typed command + version + request ID + ordered screen hashes
  S->>DB: lock patient and shared resources
  S->>N: reconstruct journal + render each screen natively
  N-->>S: canonical native screen bytes
  S->>N: re-check current guard and shared transitions
  N-->>S: accept or reject
  S->>S: version checks + compare every source screen
  Note over S: Missing/mismatch: 422, rollback, diagnostic
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

Production nightly discovery now uses `hotspot-portfolio-v1`: the live run's own
past train estimates supply the measured-idea ledger, and exact program/component/
app-bound train atlases supply physical locality. Foreign run/owner records, duplicate ideas
within a decision, future/even train days and mismatched atlases fail closed.
Validation/test metrics never enter the ledger. Program rows use a lossless
columnar projection, preserving kinds, ids, order, optional fields and definitions.
Production has no tools. Frozen A/B/C prompts retain the historical representation and chooser.

Code ranks the top eight screen-effort, repeated screen-navigation and A→B→A
backtrack hotspots, with stable tie breaking. Ranking uses clicks + scrolls +
scroll pixels / 900; no elapsed-time model enters the prompt. `InformationEffort`
in `agent/src/hotspots.ts` accepts one numeric lookup-detour/memory-carry aggregate
per completed train task. The adapter is not yet connected to the opt-in
information-needs simulator output; absent evidence adds no inferred detours
or memory costs.

Each proposal requests small, medium and radical alternatives, each naming an
exact hotspot and predicting daily physical savings. Radical requires changed
screen/container/tab membership, kinds, screen topology or added components;
density/shortcut changes alone do not qualify. Structural LLM designs also pass
the independent identity movement budget. Every alternative is checked and
measured independently; missing portfolio coverage is recorded. The loop selects
the greatest measured daily click+scroll saving minus the usage-weighted movement
proxy, with a configurable minimum net effect (default 5 interactions/day), then
rechecks the complete program and applies that floor to validation as well. All
existing completion, stability, pixel, screen and deploy gates still apply.
The floor is provisional: the frozen B data has 179 positive train candidates
(minimum 1/day, lower quartile 23/day, median 40/day); 20 fall below 5 before
relearning cost. This is a selection policy, not a fitted clinical threshold.

`run-days --minimum-effect 5 --novelty-weight 0.25 --hotspots 8` configures
this policy; `RunOptions.structurePolicy` supplies the same values. Manifests bind
these values and imported archive hashes; resume rejects changes. Explicit
`--historical-nightly` (`structurePolicy: false`) is restricted to scripted/replay
verification, including the existing cadence fake and offline tailoring comparison.
New single-night reruns restore their source run's policy and train ledger after
fingerprint verification. Historical live reruns use `proposal-quality` with
recomputed evidence; scripted/replay reruns retain their original policy.

`explore/structure.ts` measures structural Jaccard distance over screens, component
kinds, placements and sibling edges; label/density/shortcut changes have zero
distance. `explore/archive.ts` exposes exploration ranking with a novelty bonus
from distance to current and nearest archived design. It changes neither archive
admission nor release scores. Nightly evidence records candidate net effects,
distances and exploration ranks; the dashboard displays the per-night rejection
gauge, native versus invalid counts, effect floor and selected distance. The rate counts native checker failures; invalid proposals are separate. Seeded
safety probes and generated bundles are excluded from the proposal denominator.
The selected distance describes a considered release, even if a later gate refuses
it; only deployed records represent shipped changes. Review-only schema extensions
live in `app/src/dashboard/agent-evidence.ts`; the shared clinical schema and
certified app hash remain unchanged.

`explore/offline.ts` exports `offlineMapElites` and a replaceable
`StructuralOperator.enumerate` interface. Today's operators enumerate complete
subtree/review placements, same-workflow cross-screen moves and admitted layouts.
`agent/src/offline-explore.ts::runOfflineExploration` supplies the native/screen
adapter, replays only recent train schedules with expert policy and no carried
memory, and writes `archive.json`. It makes no model calls. Offline quality
is recomputed as negative (clicks + scrolls + keystrokes/20) per task with zero
switching cost. Cells combine admitted design niches with screen-count and
structural-distance bins. The search returns evaluations and `{programs}` for
`run-days --protocol certified-cadence-archive-v1 --offline-archive <file>`.
Imported bytes are scoped by program identity/owner/role/spec and pass the current
native, identity, screen, train, online relearning, effect, validation and deployment
gates again. Search requires explicit passing native and screen evidence before admission;
it never deploys or treats novelty as certification evidence.

The frozen-decision `proposal-quality` evaluator adds arm D (the new prompt and
shipping rules) beside unchanged B. Reports include accepted-change rate, measured
train/net/validation effect, rejection rate and structural distance of accepted
changes. These offline acceptances are hypothetical releases; screen checks and
deployment are skipped. Nonempty historical ledgers still require a completed,
exactly bound `--ledger-from` sanity run. First-night comparisons with no earlier
candidate history may omit it because their ledger is empty. Use a small declared
`--decisions` subset and `--samples 1 --arms B,D --service-tier default`; no new
model calls occur with `--backend replay`, which tests plumbing only.

The one-context frozen B/D pilot (`night-01/P1`, one sample per arm, three live
completions total) accepted B's change and refused D's: D saved scrolls but added
three validation clicks. Both selected designs had structural distance 0.004717;
both native rejection rates were zero. This sample does not establish an
improvement from the new policy or greater boundary exploration. The gates were
retained without tuning to the result. Validation-completion fault fixtures
explicitly select the historical discovery policy so their candidate reaches
the validation gate independently of the structural effect floor. [Measurement and targeted verification](docs/audits/explore-structure-20261106.md)
records effects, costs and limitations.

Cadence runs use protocol `certified-cadence-archive-v1`. `run-days` accepts
`--protocol certified-cadence-archive-v1 --cadence nightly|weekly|N` (`N` is a
positive number of simulation days); `--cadence` alone selects that protocol.
Omitting both selects the `core-10day` nightly release path with hotspot discovery.
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

A complete bundle's release score is daily train click-plus-scroll saving minus
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

Before release, the default `ReviewGate.review` receives 1–3 niche winners meeting the net effect floor
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
pnpm --filter agent cadence-fake --out "$TMPDIR"/cadence-demo
pnpm --filter agent exec vitest run test/cadence.test.ts --maxWorkers=2
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
export TMPDIR="${TMPDIR:?Set disk-backed TMPDIR}" CI=true
export EHR_BIN=./lean/.lake/build/bin/ehr
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

## Policies awaiting owner review

The MAR, ADT, workload and interruption rules below are implemented provisional specifications.
The checks establish their stated behavior; clinical appropriateness and the
uncalibrated rates remain for owner review in this single decision list.

| Decision | Implemented policy awaiting review |
|---|---|
| MAR outcomes and timing | [Outcome policy](#medication-administration-outcomes): conditional rates, critical-drug classification, 30/60/120-minute windows, 20/45-minute re-offers, escalation thresholds and 18:59 cutoff. |
| MAR follow-up scope | Prescriber notification is nursing documentation only; live delivery and cross-shift dose ownership remain future work. |
| ADT cancellation eligibility | [Administrative rules](#administrative-adt-extension): patient's latest ADT event, of the matching kind; positive exact ordinal; active destination beds; transfer cancellation requires the original bed empty and ready after cleaning. |
| Clinical work after cancellation | Retain all documentation, orders and administrations with their original encounter links, including an encounter marked entered-in-error; append cancellation provenance. |
| Swap compatibility | Two distinct admitted patients owning distinct active occupied beds; complete signed board scope; no additional unit/service compatibility restriction. |
| ADT simulation and transport | Provisional movement/error rates and cleaning/transport delays; `adt.json` is an administrative stream, with physical transport represented separately and no change to bedside clinical effort. |
| Workload dispatch and coverage | One serial clinician/coverage chain; priority/deadline/arrival ordering; task-boundary dispatch with event-boundary communication preemption; 15-minute hospital overlap; finite successor coverage and clinic weekend closure. ESI queue deadlines are 10/30/60 minutes for ESI ≤2/3/≥4. |
| Workload scope and endpoints | Source worlds supply weekday daytime cases; extended queues do not merge subsequent days' arrivals or create independent night/weekend demand. Successor actor knowledge and live handoff acceptance remain outside this model. Result response and MAR lateness end at documentation completion; missing source timing uses planned readiness. |
| Draft ownership and authority | Frames bind clinician, source patient and task; current receipt rules filter stale evidence; changed chart data requires reconfirmation. Incomplete unsent drafts are discarded with reasons. Named handover transfers responsibility, without sign authority or another clinician's draft. |
| Interruption service and calibration | Role/setting profiles, minute-bin rates, fixed task exposure, urgency/type mix, protected-popup triage, semantic communication steps and return costs are provisional. Urgent work precedes queued return work; individual protocols and reorientation are atomic. Fixed-exposure closure waits count as wall time, excluding active effort and overtime. |

## Information needs methodology

`information-needs-v1` is an opt-in simulator specification in
`lean/Ehr/Sim/InformationNeeds.lean`, separate from the certified clinical
rulebook. `simulate --information-needs v1` performs chart lookups before each
episode's entries and commits. Omission or `off` retains the historical
protocol. Needs bind a typed question, its gated commit or exact entry slot,
source information IDs, trusted patient data and an authority classification.
A failed lookup leaves the episode incomplete; the event boundary also refuses
missing or stale answers. No lookup creates a clinical review receipt.

| Need ID | Question and gated decision | Source and modeled scope |
|---|---|---|
| `insulin-glucose` | Latest glucose (mg/dL), ≤120 min, before signing, approving a refill or administering insulin | [HUMALOG §§2.2, 5.2](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=c8ecbd7a-0e22-4fc7-a503-faa58c1b6f3f), [LANTUS §§2.2, 5.2](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=d5e07a0c-7e14-4756-9152-9fea485d654a): dosing uses glucose monitoring. The fixed two-hour window and per-action lookup are simulation assumptions. |
| `warfarin-inr` | Latest INR ({INR}), ≤24 h, before signing, refill approval or administration | [Warfarin sodium §2.4](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=bd6ea120-5d1c-4815-94f2-81e28dc6b7a9): regular INR monitoring, daily during initiation until stable; the universal 24-hour window is a simulation assumption, including maintenance/refill tasks. |
| `potassium-level` | Latest potassium (mmol/L), ≤24 h, before potassium chloride signing/administration | [Potassium chloride oral solution §2.2](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=590dd25c-c4cb-489a-a09b-eccbf1d37c1f): serum-potassium monitoring during treatment. Timing and applying this lookup to IV orders are simulation assumptions; no IV dosing rule is inferred. Conditional catalog case; potassium chloride is outside the current order formulary. |
| `potassium-renal` | Latest creatinine (mg/dL), ≤24 h, before the same potassium decision | [Same oral label §8.7](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=590dd25c-c4cb-489a-a09b-eccbf1d37c1f): assess renal function in renal impairment. Creatinine as the proxy, universal applicability and window are simulation assumptions. |
| `antibiotic-allergy` | Whether any active allergy is recorded; full allergy inventory before antibiotic signing/administration | [NICE CG183 §1.2.6](https://www.nice.org.uk/guidance/cg183/chapter/Recommendations): check allergy status before prescribing/dispensing/administering a drug. This subset models chart lookup for antibiotics; confirmation with the patient is outside the simulator. Guidance, not a US legal requirement. |
| `mar-bp-hold` | Latest systolic BP (mmHg), ≤60 min, compared with 100 mmHg before slot-0 `adminStatus` entry for an antihypertensive | **Hospital policy (not law)**: fictional illustrative hold policy. Threshold, window and applying it to these drugs are **simulation assumptions**; the chosen give/hold decision is not changed. HR hold parameters are not modeled. |
| `result-trend` | Ordered dated values of the selected numeric result over seven days before `ackResult` | **Simulation assumption**; at least two source values required. |
| `result-flags` | Any abnormal/critical flag for that analyte over seven days before `ackResult` | **Simulation assumption**; all relevant values and explicit flags required, including for a negative answer. |

Catalog measurements bind their LOINC codes; the current decoder traverses
the actual `UiNode` tree. It requires each exact
value, unit and displayed timestamp in one source row; existing flowsheet
time columns can answer when the measure, unit and exact dated cell survive; trends must retain all
in-window values in chronological or reverse chronological order. Latest-value
ties are retained. Date-only, invalid and timezone-free measurements cannot
supply a recency answer. Active-list questions require the complete inventory
with status, including inactive records, so a filtered list cannot establish
absence. Presentation, timeline, dated-timeline and reference-curve wrappers
preserve satisfaction by Lean proofs. Compact sidebar strings and chart titles
receive no credit. Future chart encodings need their own faithful decoder.
The source projection and semantic-tree-to-visible-pixels boundary remain
trusted; these proofs do not establish human comprehension.

The expert routes through the shortest ordinary navigation path. The bounded
policy uses experienced lookup locations, then visible lexical scent, then paid
help. Both pay existing component-fold scroll costs, additional ten-row pages
through intervening source rows, and modeled reading time. One faithful
read can answer several questions on that same information component. Lookup order is fixed before
all episode actions, a conservative sequencing assumption. An answer carries
one unit per source item per screen transition until its gated action;
questions sharing the same source samples and gate count those items once. This
**modeled cognitive-load proxy** has no calibrated clinical interpretation;
answers reset at episode boundaries and do not train another actor. Existing
clinical review requirements still apply independently.

`min-clicks --information-needs v1` reports independently checked per-episode
minimums in a declared staged space: catalog-order reads followed by the
existing navigation-directed action policy, with a fixed clock. Reads are
zero-activation edges; scrolling and reading time are separate simulator costs.
The sum is not a joint optimum across episode resets or arbitrary interleaving.
Workspace patient selection is outside this minimum, as in the existing search.

Generate separate fictional lookup inputs with
`pnpm --filter world gen --seed 7 --days 2 --information-needs v1 --out <scratch>`.
The generator adds only needed observations, preserves patient references and
uses no historical RNG draws. Bedside observations carry an explicit synthetic
acute encounter link; result-review selection uses the current result detail,
not the oldest point in its trend. Keep the same enriched schedules for needs-on and
needs-off comparisons. Neither generated worlds nor measurements belong in git.

A targeted seed-7 comparison uses the first task per workflow plus the first
represented insulin, warfarin, antibiotic and antihypertensive-administration
category per persona/day. The two-day v1 sample contains 31 tasks; **31/31
complete in both arms**. Layout memory starts cold each day and carries between
that day's sampled tasks. Explicit `off` and omission produce byte-identical
native outputs. These are signed needs-on minus needs-off totals, including
downstream route and practice effects; they are not isolated additive lookup
costs or a population estimate.

| Persona | Tasks | Native clicks | Native scrolls | Scroll px | Mouse travel px | Ordinal travel units | Memory carry |
|---|---:|---:|---:|---:|---:|---:|---:|
| P1 | 10 | +40 | +14 | +19,201 | +4,106.18 | +13,760 | 576 |
| P2 | 5 | +17 | +6 | +10,800 | +1,530.95 | +9,520 | 345 |
| P3 | 6 | +12 | −2 | −4,148 | −3,055.89 | +2,720 | 32 |
| P4 | 4 | 0 | 0 | 0 | 0 | 0 | 314 |
| P5 | 6 | −3 | +6 | +7,304 | −6,647.12 | −3,120 | 231 |

Pixels use Chromium's existing static geometry model at 1440×900, with the
pointer reset per matched task. Only visited screens, attempted remembered
locations and actual alert-acknowledgment targets are captured: 172 screen
states, zero missing targets. Identical pointer traces have zero delta without
additional capture. Native ordinal page counts and geometry-derived scrolling
are different models; their totals need not move together. Memory carry counts
source items × screen transitions, with identical samples shared by questions
at the same gate. It is neither time nor a measured human capacity limit.

Repeated origins are Chart History (12 answered needs), Chart Summary (11),
and the nursing flowsheet (2). Routes include Chart History → result review
(4 trend/flag questions), Chart History → order signing (2 INR questions),
Chart History → ED signing (2 glucose questions), Chart History → MAR action
(2 glucose questions), and flowsheet → MAR action (2 BP questions). Allergy
lookups lead to signing or MAR action in every role. P4 already encounters the
allergy data on its ordinary route, so this sample adds carry without extra
physical interactions. A future summary could remove a lookup only if its
decoder answers the corresponding need with the required source fidelity;
these measurements do not claim achievable summary savings.

Reproduce in scratch (the pixel pass holds the shared browser lock; it does not
run a screen audit or issue a certificate):

```sh
export TMPDIR="${TMPDIR:?Set disk-backed TMPDIR}" CI=true
pnpm --filter world gen --seed 7 --days 2 --information-needs v1 --out "$TMPDIR/info-needs-world" --quiet
python scripts/information-needs-compare.py --world "$TMPDIR/info-needs-world" --out "$TMPDIR/info-needs-final"
flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off pnpm --filter agent exec tsx ../scripts/information-needs-pixels.mts "$TMPDIR/info-needs-final/summary.json"
pnpm --filter agent exec tsc -p ../scripts/tsconfig.information-needs.json
python scripts/test-information-needs-compare.py
```

`summary.json` retains task completion in both arms, signed totals, source/gate
screen pairs and the native binary fingerprint; adjacent files retain schedules,
raw traces, lookup records and per-task geometry atlases. Failed tasks remain
visible and are excluded from cost deltas. The certificate-checked micro example
needs five activations (three ordinary actions plus two lookup navigation
activations). A real insulin-administration task exceeded the separate
128-state staged-search check; no minimum was reported. The larger search was
stopped rather than treated as evidence. Search bounds and fixed catalog-order
staging limit this expert floor.

## Local setup and live validation

Requires Node ≥22.18, pnpm 11.8, Docker Compose and the pinned Lean 4.35
(`lean/lean-toolchain`). Set `TMPDIR` to disk-backed scratch outside the repository
before using the commands below. Fixture/world/recording data is local and gitignored;
restore it before importing or running archive tests. FHIR is an initial import
format only. `fixtures/clinical/overrides.json`, dated world resources and
`runs/world/2/context/day-01.json` are composed before the immutable import;
Synthea and Synthetic Hospital identities and references are preserved. The
loader verifies fixture hashes, normalizes resource IDs/references (including
stable content-derived IDs for anonymous resources), imports each
patient exactly once and refuses a changed baseline. Rerunning an identical
import preserves every later event. There is no online import/reset API.

```sh
export TMPDIR="${TMPDIR:?Set disk-backed TMPDIR}" CI=true
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
export TMPDIR="${TMPDIR:?Set disk-backed TMPDIR}" CI=true
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

### Continuous integration

[CI](.github/workflows/ci.yml) runs on every push and pull request, on all
branches. Six Ubuntu jobs build the pinned Lean default targets and audit
headline theorem axioms; lint and typecheck app, agent, world and commit;
run fast unit suites and the information-needs Python test; run all 201
canonical conformance scenarios and the 15-accepted/23-rejected certification
matrix; and run commit integration/protocol traces against Postgres. Native
checks share the current run's `ehr` artifact. Protocol and ADT host trace checks
invoke `ehr protocol-trace` and `ehr adt-protocol-trace`; neither requires a Lean
toolchain at test runtime. Their standalone Lean entrypoints share those same
compiled checkers. The `lean` job also runs the world-to-Lean MAR
boundary test (`world/test/administration-outcomes.test.ts`) and the archived
Synthea schedule/formulary contract (`world/test/synthea.test.ts`), which need the
Lean build; these probes skip when Lean is absent. The Synthea archive probe also
requires local archived data, while its remaining archive assertions run in the unit job
when that data is present. Conformance uses its stateless
`serve` transport to avoid one process startup per event; `EHR_CONFORMANCE_TRANSPORT=cli`
retains the one-shot comparison path. Both dispatch to the same native
functions. pnpm, elan/toolchain and source-keyed Lake outputs are cached. The commit service enforces the same
TypeScript bans as agent: no explicit `any`, non-null assertions, casts except
`as const`, or TypeScript suppression comments. Opaque JSON is narrowed before
host use; mapper inputs and clinical/ADT protocol traces have runtime codecs.
ADT test instrumentation validates administrative boards and version vectors;
lost-COMMIT probes preserve the database driver overloads through proxies. The unit
runner enables unprivileged user namespaces on its ephemeral VM, installs
bubblewrap and exposes the pinned Node executable at `/usr/bin/node` for
confined queries.

No archived data or API credentials are needed. CI generates bad programs and
the commit fixture from tracked Lean inputs, and reruns the CURES-removal
checker probe against the current binary before checking its evidence bindings. Archive-backed tests skip when
recordings, worlds or patient fixtures are absent; the unit job creates an empty
`runs/` directory for output-path guard tests. Browser cache integration and
opt-in UI-library research suites stay local. CI tests the checked-in WASM
canonical-byte corpus but does not rebuild WASM. Default builds and the proof
audit reject proof placeholders; the three deliberate Comparator challenge
modules are outside these targets. Full Comparator verification remains
`make verify`.

A parallel `proof-map` job builds the default targets plus the proof modules
outside them (`scripts/proof-map/extra-modules.txt`, e.g. the UI-library range
theorems) and regenerates the proof map from the compiled environment. It fails
if any theorem depends on an axiom other than the standard three (including
`sorryAx`) or if the [proof map charts](#proof-map) in this README are out of
date. It also uploads an interactive version as the `proof-map` artifact
(download, then serve the folder, e.g. `python3 -m http.server`); the opt-in
`proof-map-pages` job publishes that to GitHub Pages on pushes to `main` once the
repository variable `PROOF_MAP_PAGES` is `true`. After changing Lean proofs,
refresh the README charts with `(cd lean && lake build && lake build $(cat
../scripts/proof-map/extra-modules.txt)) && scripts/proof-map/build.sh --readme`.

Heavy checks require matching local fixtures/recordings and, for live browser
checks, the [fresh local stack](#local-setup-and-live-validation). Run locally:

```sh
export TMPDIR="${TMPDIR:?Set disk-backed TMPDIR}" CI=true LEAN_NUM_THREADS=6
make wasm
node scripts/migrate-neutral-terms.mjs --recertify-only --runs core-10day
node scripts/audit-alert-policy.mjs "$TMPDIR/audit-templates"
node scripts/audit-alert-policy.mjs "$TMPDIR/audit-personas" --personas
APP_TEST_PREVIEW=1 pnpm --filter app exec playwright test live --project=desktop --project=narrow --workers=2
COMMIT_INTERNAL_URL=http://127.0.0.1:8091 MAR_E2E=1 ADT_E2E=1 APP_TEST_PREVIEW=1 pnpm --filter app exec playwright test mar-service.spec.ts adt-service.spec.ts --project=desktop --project=narrow --workers=2
pnpm --filter app shots
```

Keep the audit pair sequential under the shared browser lock (acquired by the
audit script); wrap other heavy browser commands in
`flock "$TMPDIR/vgi-browser-heavy.lock"` as above. Re-certification, full WCAG/screen
audits, the live e2e/MAR/ADT stack, WASM builds and screenshots are manual checks.

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
Fullscreen playback retains its dark metrics background and reserved transport
space; the recorded EHR keeps its fixed 1440×900 logical viewport.
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

Generated-world JSON under `/runs/world/<id>/` uses its own manifest inventory.
It has no recording completion marker and does not enter the recorded-run index.
The preview/dev server serves its manifest and listed artifacts while refusing
unlisted files and parent traversal. Recorded runs retain their completed-prefix
boundary.

The partial-index browser regression intercepts both direct and prefix-pinned
trajectory indices, confirms fixture injection, and checks that missing saved
controls select an available cross-day comparison.

Summary reads show completed days immediately; expensive derived evidence
loads separately. Active runs refresh every 30 seconds, without page reload
or resetting the selected view. Trajectory/Compare indices refresh when the
completed-prefix key changes. Terminal runs do not poll. The UI browser
refreshes its catalog with the selected active run. Missing derived evidence
is shown as unavailable/loading until it arrives; recorded clinical state is
never synthesized by the review layer.

Rename a stopped local recording with
`node scripts/rename-run.mjs <old> <new>`.
It refuses an existing destination, active status, unsafe IDs and symlinks;
it renames in place, rewrites embedded identity/path references (including
compressed JSON and journals), updates transitive byte/semantic SHA-256
bindings, and recomputes day/night and whole-run content digests. Clinical
results and certificate semantics are preserved. On a rewrite failure the
reported destination is retained for recovery. Test the operation on a copy
before using it on a retained recording.

Stopped recordings made before the marker protocol need one explicit in-place
upgrade after renaming: `node
scripts/mark-completed-run.mjs <id> <completed-days> <completed-nights>`.
It validates all requested clinician day/decision records and committed
pointers before installing fences. For the retained ten-day recording the
counts are `10 9`. Data and these caches remain gitignored.

Targeted checks for this path:

```sh
export TMPDIR="${TMPDIR:?Set disk-backed TMPDIR}" CI=true
node --import ./agent/node_modules/tsx/dist/loader.mjs --test scripts/run-prefix.test.mjs scripts/rename-run.test.mjs
pnpm --filter app exec vitest run tests/live-run-http.test.ts tests/run-refresh.test.ts tests/lazy-run.test.ts tests/run-selection.test.ts --maxWorkers=2
APP_TEST_PREVIEW=1 flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off pnpm --filter app exec playwright test live-dashboard.spec.ts dashboard-performance.spec.ts --project=desktop --workers=1
```


## What is proved

"Proved" means a Lean theorem checked by the kernel using only the standard
axioms (`propext`, `Classical.choice`, `Quot.sound`). The clinical statements are
cross-checked by Lean's Comparator (`make verify`). The protocol and experimental
UI-library theorems are kernel checked and are not yet in Comparator.

| Guarantee | Scope |
|---|---|
| No sign without its guard: required entries confirmed and human-entered where required, in the declared unit (lb never satisfies kg); reviews shown or covered by a valid receipt; interruptive alerts acknowledged; role allowed (`T0`, `T2`). | Every program, record and event sequence. |
| Macros and prefills never sign, acknowledge, create receipts or enter human-only values; a cosign names a second human (`T3`, `T6`). | Every program. |
| Alerts appear only when their condition holds; passive alerts never pop up (`A2`, `A4`). | Every program. |
| Checker acceptance implies 12 of 13 screen properties for every patient and reachable state (`accepted_*`). | Every accepted program. |
| Every required task stays completable (property 6). | Proved for restricted families; a kernel-proved finite-model certificate checker is available, but general program abstraction coverage remains open. |
| The screen tree keeps the patient banner, required review content, honest buttons and modal interruptive alerts (`D1`–`D6`). | Every program and record. |
| Bed assignments are exclusive; scheduled doses are given at most once; critical results are resolved or escalated by a deadline. | Lean reducers and multi-actor models. |

The [commit protocol model](#commit-protocol-methodology) adds new specifications
for owner review, outside the clinical Comparator catalog. Its executable
fine-grained transition system has unbounded kernel proofs for request effect
uniqueness, stable durable retries, guarded expected-version replacement,
refused-command isolation, shared bed/dose safety and shared/opaque-patient
projection agreement with the event log. A bounded explicit-state checker explores duplicate requests,
conflicting patients/resources, crashes, uncertain responses and retries.
These claims assume Postgres primary READ COMMITTED row/unique-key locking,
consistent initial imports, sole-writer access and atomic durable publication
of all touched events, projections and request outcomes. Cache safety is
conditional on the final native guard using the fresh locked snapshot;
a separate generic fold theorem proves cache/fresh agreement for fixed
version-bound inputs and consistent journals. Actual cached reconstruction,
external directory/time facts and clinical FHIR projections remain unproved.
Administrative ADT now has a separate executable protocol model using the actual
native reducer, with unbounded bed exclusivity, one-bed-per-patient, multi-stream
idempotency and event-fold proofs. Its new specifications need owner review;
[ADT evidence](docs/audits/adt-model-20261107.md) distinguishes these proofs from
bounded lock checks and transaction-linearized host tests.
`COMMIT_PROTOCOL_TRACE` enables a structured test exporter for `Store.submit`;
`pnpm --filter @vgi/commit test:protocol` checks real Postgres traces against the
Lean machine, including rollback and a lost COMMIT reply. This is a
transaction-linearized refinement test, not a proof of the host implementation.
[Protocol evidence](docs/audits/commit-model-20261106.md) records exact commands,
bounds and outcomes.

Not proved: host ADT/SQL/FHIR refinement, dynamic cache inputs, physical transport,
clinical completeness of the rules (including swap/cancellation), or the React painter,
browser, FHIR import mapping and storage projections (tested); the Node/SQL
wrapper, Postgres and authentication (integration-tested); the Lean compiler
and native clang (trusted); SHA-256 collision resistance (assumed); serialization
injectivity and native/WASM/host agreement (tested). WASM/Emscripten are untrusted
for displayed tree content: discrepancies refuse the next command. This does
not prove DOM pixels, CSS, browser behavior, what a person perceived, or clinical
actions outside a command. The AI agent is untrusted; only accepted programs deploy.

`UiScreen.canonical` (`lean/Ehr/Render/Json.lean`) defines `vgi-screen-v1:`:
null/booleans have single-byte tags; numbers end with `;`; strings carry UTF-8
byte lengths; arrays and objects carry entry counts, with object keys ordered
by Unicode scalar value. The derived `UiScreen` writer includes every painter
field, including the banner, modal, urgent strip and review content. The WASM
`ehr_screen_canonical` export serializes a supplied screen without re-rendering.
Native `ehr serve` exposes `screen-canonical` and `render-screen`; the latter
returns the native screen and its canonical bytes. SHA-256 belongs to the host.
Serialization injectivity is tested rather than proved.

Screen verification changes the certified clinical app and WASM/source bindings.
Certificates must bind the current native binary, app and packaged WASM;
recertification installs matching bindings and verifies strict replay.
[Screen-fingerprint evidence](docs/audits/screen-fingerprint-20261106.md)
records the canonical corpus, request/retry tests and a short added-latency sample.


### Proof map

<!-- PROOF-MAP:BEGIN (generated by scripts/proof-map/build.sh --readme; do not edit) -->

Generated from the compiled Lean environment. In the overview an arrow reads
"is stated in terms of" (thick: 100+ references, dotted: under 5). In each
layer's chart below an arrow reads "its proof cites": headline claims are
bold, lemmas they cite directly are white, lemmas from other layers are
dashed. The interactive version, with search, full
trees and each claim's trust surface, is the `proof-map` artifact of every CI
run.

```mermaid
flowchart TB
  subgraph guar_g["Guarantees"]
    proofs["Clinical guarantees<br/>151 theorems, 33 headline"]:::guar
    check["Program checker<br/>226 theorems, 51 headline"]:::guar
    render["Screen renderer<br/>189 theorems, 11 headline"]:::guar
    layout["UI library &amp; geometry<br/>89 theorems, 34 headline"]:::guar
    commit["Commit reducers<br/>20 theorems, 8 headline"]:::guar
    protocol["Commit service protocol<br/>48 theorems, 30 headline"]:::guar
    multi["Multi-actor models<br/>26 theorems, 0 headline"]:::guar
  end
  subgraph spec_g["Specification"]
    core["Rulebook &amp; interpreter<br/>1 theorems, 0 headline"]:::spec
    props["Safety properties<br/>23 theorems, 0 headline"]:::spec
    specs["Hospital rules &amp; formulary<br/>3 theorems, 0 headline"]:::spec
  end
  check ==> core
  check ==> props
  check --> specs
  commit --> core
  commit --> multi
  commit --> render
  core --> multi
  layout --> core
  layout -.-> props
  layout --> render
  proofs --> check
  proofs ==> core
  proofs --> props
  proofs ==> render
  props ==> core
  props -.-> render
  protocol --> commit
  protocol --> multi
  render -.-> check
  render ==> core
  render -.-> multi
  specs ==> core
  specs -.-> multi
  classDef spec fill:#fdf3dc,stroke:#b7791f,color:#3d2a06
  classDef guar fill:#e3eefc,stroke:#2b6cb0,color:#0f2747
```

<details><summary><b>Clinical guarantees</b>: 33 headline claims. Hard stop on signing, receipts, macros never act for a human, alert behaviour (T0–T6, A2, A4).</summary>

```mermaid
flowchart LR
  n0["Proofs.A2_popup_holds"]:::head
  n1["Proofs.A2_view_firing"]:::head
  n2["Proofs.A2_view_shown"]:::head
  n3["Proofs.A4_passive_never_popup"]:::head
  n4["Proofs.A4_run"]:::head
  n5["Proofs.A4_step"]:::head
  n6["Proofs.HypothesisExamples.all_buttons_instance"]:::head
  n7["Proofs.HypothesisExamples.cosign_distinct_instance"]:::head
  n8["Proofs.HypothesisExamples.popup_step_instance"]:::head
  n9["Proofs.HypothesisExamples.publish_ok_instance"]:::head
  n10["Proofs.HypothesisExamples.published_certificate_instance"]:::head
  n11["Proofs.HypothesisExamples.receipt_sound_instance"]:::head
  n12["Proofs.HypothesisExamples.rejected_not_published_instance"]:::head
  n13["Proofs.HypothesisExamples.shown_alert_instance"]:::head
  n14["Proofs.HypothesisExamples.shown_review_instance"]:::head
  n15["Proofs.HypothesisExamples.sign_button_honest_instance"]:::head
  n16["Proofs.HypothesisExamples.weight_label_instance"]:::head
  n17["Proofs.MacroSafe.commits"]:::head
  n18["Proofs.T0_commit_needs_guard"]:::head
  n19["Proofs.T0_entry_values"]:::head
  n20["Proofs.T2_receipts_sound"]:::head
  n21["Proofs.T2_shownOnCommit_shown"]:::head
  n22["Proofs.T3_cosign_distinct"]:::head
  n23["Proofs.T3_macro_run"]:::head
  n24["Proofs.T3_macro_step"]:::head
  n25["Proofs.T3_prefill_never_human_only"]:::head
  n26["Proofs.T4_publish_only_if_ok"]:::head
  n27["Proofs.T4_published_certificate"]:::head
  n28["Proofs.T4_rejected_not_published"]:::head
  n29["Proofs.T6_macro_is_fold"]:::head
  n30["Proofs.T6_macro_run_safe"]:::head
  n31["Proofs.commitGuard_iff"]:::head
  n32["Proofs.runMacro_ok_iff"]:::head
  n33["Proofs.HypothesisExamples.current_certificate_planned"]:::lemma
  n34["Proofs.HypothesisExamples.sign_button_present"]:::lemma
  n35["Proofs.HypothesisExamples.weight_field_present"]:::lemma
  n36["Proofs.MacroSafe.acked"]:::lemma
  n37["Proofs.MacroSafe.humanOnly"]:::lemma
  n38["Proofs.MacroSafe.receipts"]:::lemma
  n39["Proofs.T0_entry_values_allowed"]:::lemma
  n40["Proofs.canPopup_not_passive"]:::lemma
  n41["Proofs.entryMet_witness"]:::lemma
  n42["Proofs.foldMacro_safe"]:::lemma
  n43["Proofs.init_popup"]:::lemma
  n44["Proofs.macroStep_eq_macroAct"]:::lemma
  n45["Proofs.mem_popupCandidates"]:::lemma
  n46["Proofs.prefillScreen_frame"]:::lemma
  n47["Proofs.reviewMet_sound"]:::lemma
  n48["Proofs.runMacro_safe"]:::lemma
  n49["Proofs.stepCore_macro_safe"]:::lemma
  n50["Proofs.step_guarded"]:::lemma
  n51["Proofs.step_popup"]:::lemma
  n52["Proofs.valueSatisfies_cosign"]:::lemma
  n53["Render.D3_all_buttons"]:::other
  n54["Render.D3_honest_actions"]:::other
  n55["Render.D6_field_labels"]:::other
  n0 --> n45
  n0 --> n51
  n3 --> n4
  n4 --> n5
  n4 --> n43
  n5 --> n40
  n5 --> n45
  n5 --> n51
  n6 --> n34
  n6 --> n53
  n7 --> n22
  n8 --> n5
  n9 --> n33
  n9 --> n26
  n10 --> n33
  n10 --> n27
  n11 --> n20
  n12 --> n28
  n13 --> n2
  n14 --> n21
  n15 --> n34
  n15 --> n54
  n16 --> n35
  n16 --> n55
  n18 --> n50
  n19 --> n39
  n20 --> n18
  n20 --> n31
  n20 --> n47
  n21 --> n20
  n22 --> n18
  n22 --> n31
  n22 --> n41
  n22 --> n52
  n23 --> n36
  n23 --> n17
  n23 --> n37
  n23 --> n38
  n23 --> n48
  n24 --> n36
  n24 --> n17
  n24 --> n37
  n24 --> n38
  n24 --> n49
  n25 --> n46
  n27 --> n26
  n28 --> n26
  n29 --> n44
  n30 --> n36
  n30 --> n17
  n30 --> n37
  n30 --> n38
  n30 --> n29
  n30 --> n42
  n32 --> n29
  n39 --> n18
  n50 --> n17
  n50 --> n48
  n53 --> n54
  classDef head fill:#e3eefc,stroke:#2b6cb0,stroke-width:2px,color:#0f2747,font-weight:bold
  classDef lemma fill:#ffffff,stroke:#8a94a6,color:#1f2937
  classDef other fill:#f4f4f5,stroke:#a1a1aa,stroke-dasharray:4 3,color:#3f3f46
```

</details>

<details><summary><b>Program checker</b>: 51 headline claims. The checker that admits agent-written programs and its soundness: acceptance implies the screen properties (accepted_*), plus completability.</summary>

```mermaid
flowchart LR
  n0["Check.CompletionModel.accepted_completable"]:::head
  n1["Check.CompletionModel.accepted_edges"]:::head
  n2["Check.DoseCompletionObstruction.never_commits"]:::head
  n3["Check.DoseCompletionObstruction.not_completable"]:::head
  n4["Check.DoseCompletionObstruction.rejected"]:::head
  n5["Check.FixedLine.completable"]:::head
  n6["Check.FixedLine.completable_many_alerts"]:::head
  n7["Check.Scalar.completable"]:::head
  n8["Check.T7_counterexample_replays"]:::head
  n9["Check.T7_rejection"]:::head
  n10["Check.T8_checked_old_obligations"]:::head
  n11["Check.T8_old_obligations"]:::head
  n12["Check.T8_v1_to_v2"]:::head
  n13["Check.T8_v2_to_v3"]:::head
  n14["Check.accepted_alertsFire"]:::head
  n15["Check.accepted_budgets"]:::head
  n16["Check.accepted_capturesAllOnce"]:::head
  n17["Check.accepted_contracts"]:::head
  n18["Check.accepted_humanOnlyKept"]:::head
  n19["Check.accepted_navigation"]:::head
  n20["Check.accepted_noFalseAlarms"]:::head
  n21["Check.accepted_noRepeatInterruptions"]:::head
  n22["Check.accepted_reviewsBeforeCommit"]:::head
  n23["Check.accepted_severityTiers"]:::head
  n24["Check.accepted_units"]:::head
  n25["Check.accepted_wellFormed"]:::head
  n26["Check.accepted_writesOnly"]:::head
  n27["Check.alertsAcked_of_no_candidates"]:::head
  n28["Check.automated_lines_satisfies"]:::head
  n29["Check.cached_completion_eq"]:::head
  n30["Check.completion_dependency_rejected"]:::head
  n31["Check.fixed_lines_pending_nonempty"]:::head
  n32["Check.fixed_lines_satisfies"]:::head
  n33["Check.human_finish_ready"]:::head
  n34["Check.human_finish_ready_unique"]:::head
  n35["Check.many_alerts_satisfies"]:::head
  n36["Check.many_alerts_two_acknowledgments"]:::head
  n37["Check.prefill_macro_human_completion"]:::head
  n38["Check.reachable_drugSlots"]:::head
  n39["Check.receipt_lines_satisfies"]:::head
  n40["Check.receipt_review_transition"]:::head
  n41["Check.satisfies_of_checked_automated_lines"]:::head
  n42["Check.satisfies_of_checked_completable"]:::head
  n43["Check.satisfies_of_checked_fixed_lines"]:::head
  n44["Check.satisfies_of_checked_many_alerts"]:::head
  n45["Check.satisfies_of_checked_receipt_lines"]:::head
  n46["Check.satisfies_of_checked_scalar"]:::head
  n47["Check.scalar_identity_satisfies"]:::head
  n48["Check.tiny_bad_automation"]:::head
  n49["Check.tiny_bad_catalog"]:::head
  n50["Check.tiny_bad_role"]:::head
  n51["Check.CompletionModel.accepted_episode_complete"]:::lemma
  n52["Check.CompletionModel.run_closed"]:::lemma
  n53["Check.OkRun.append"]:::lemma
  n54["Check.accepted_structural"]:::lemma
  n55["Check.alertBudget_sound"]:::lemma
  n56["Check.alert_lookup_unique"]:::lemma
  n57["Check.alertsOnlyWhenTrue"]:::lemma
  n58["Check.check_ok_iff"]:::lemma
  n59["Check.commitCapturesAll"]:::lemma
  n60["Check.commitContracts"]:::lemma
  n61["Check.commitReviewsMet"]:::lemma
  n62["Check.commitUnitsRight"]:::lemma
  n63["Check.cosignIsSecondUser"]:::lemma
  n64["Check.declared_value_witness"]:::lemma
  n65["Check.enteredOnce"]:::lemma
  n66["Check.extends_contracts"]:::lemma
  n67["Check.extends_entries"]:::lemma
  n68["Check.extends_reviews"]:::lemma
  n69["Check.extends_static"]:::lemma
  n70["Check.firstFinding_some"]:::lemma
  n71["Check.followHops_sound"]:::lemma
  n72["Check.humanStepsByHuman"]:::lemma
  n73["Check.human_clear_popup"]:::lemma
  n74["Check.human_enter"]:::lemma
  n75["Check.interruptiveHandled"]:::lemma
  n76["Check.interruptsOnce"]:::lemma
  n77["Check.landmarksPinned_sound"]:::lemma
  n78["Check.onlyHumanCommitsAndAcks"]:::lemma
  n79["Check.orderLines_slots"]:::lemma
  n80["Check.passiveNeverPopsUp"]:::lemma
  n81["Check.passivePinned_sound"]:::lemma
  n82["Check.pinnedForReview_sound"]:::lemma
  n83["Check.replayOk_sound"]:::lemma
  n84["Check.reviewMet_iff"]:::lemma
  n85["Check.reviewsPinned_sound"]:::lemma
  n86["Check.step_drugSlots"]:::lemma
  n87["Check.tableReach_eq"]:::lemma
  n88["Check.writesAllowed"]:::lemma
  n89["Proofs.prefillScreen_frame"]:::other
  n90["Sim.Certificate.lookup_mem"]:::other
  n91["Specs.V2.specV2_extends_specV1"]:::other
  n92["Specs.V3.specV3_extends_specV2"]:::other
  n93["linkedDependents_not_self"]:::other
  n0 --> n51
  n1 --> n52
  n1 --> n90
  n2 --> n38
  n2 --> n89
  n3 --> n2
  n5 --> n6
  n6 --> n64
  n6 --> n73
  n6 --> n74
  n6 --> n34
  n6 --> n79
  n6 --> n82
  n6 --> n38
  n6 --> n84
  n6 --> n86
  n6 --> n93
  n7 --> n64
  n7 --> n73
  n7 --> n74
  n7 --> n33
  n8 --> n53
  n8 --> n71
  n8 --> n83
  n9 --> n8
  n9 --> n70
  n10 --> n14
  n10 --> n16
  n10 --> n18
  n10 --> n20
  n10 --> n21
  n10 --> n22
  n10 --> n23
  n10 --> n24
  n10 --> n66
  n10 --> n67
  n10 --> n68
  n10 --> n69
  n11 --> n66
  n11 --> n67
  n11 --> n68
  n11 --> n69
  n12 --> n10
  n12 --> n91
  n13 --> n10
  n13 --> n92
  n14 --> n54
  n14 --> n75
  n14 --> n81
  n15 --> n55
  n15 --> n58
  n16 --> n54
  n16 --> n59
  n16 --> n65
  n17 --> n60
  n18 --> n54
  n18 --> n63
  n18 --> n72
  n18 --> n78
  n19 --> n58
  n20 --> n54
  n20 --> n57
  n21 --> n54
  n21 --> n76
  n22 --> n54
  n22 --> n61
  n22 --> n85
  n23 --> n54
  n23 --> n80
  n24 --> n54
  n24 --> n62
  n25 --> n54
  n25 --> n77
  n26 --> n54
  n26 --> n88
  n27 --> n56
  n28 --> n41
  n29 --> n87
  n30 --> n4
  n32 --> n43
  n34 --> n27
  n34 --> n33
  n35 --> n44
  n38 --> n86
  n39 --> n45
  n41 --> n6
  n41 --> n25
  n41 --> n42
  n42 --> n14
  n42 --> n15
  n42 --> n16
  n42 --> n18
  n42 --> n19
  n42 --> n20
  n42 --> n21
  n42 --> n22
  n42 --> n23
  n42 --> n24
  n42 --> n25
  n42 --> n26
  n43 --> n5
  n43 --> n42
  n44 --> n6
  n44 --> n25
  n44 --> n42
  n45 --> n5
  n45 --> n42
  n46 --> n7
  n46 --> n42
  n47 --> n46
  n54 --> n58
  n61 --> n84
  n66 --> n60
  n71 --> n53
  n71 --> n83
  n85 --> n82
  classDef head fill:#e3eefc,stroke:#2b6cb0,stroke-width:2px,color:#0f2747,font-weight:bold
  classDef lemma fill:#ffffff,stroke:#8a94a6,color:#1f2937
  classDef other fill:#f4f4f5,stroke:#a1a1aa,stroke-dasharray:4 3,color:#3f3f46
```

</details>

<details><summary><b>Screen renderer</b>: 11 headline claims. The screen tree the painter draws, and D1–D6: banner, required content, honest buttons, modal alerts.</summary>

```mermaid
flowchart LR
  n0["Render.D1_landmark"]:::head
  n1["Render.D2_commit_review"]:::head
  n2["Render.D2_required_info"]:::head
  n3["Render.D2_workspace_required"]:::head
  n4["Render.D3_all_buttons"]:::head
  n5["Render.D3_honest_actions"]:::head
  n6["Render.D4_interruptive_modal"]:::head
  n7["Render.D4_passive_inline"]:::head
  n8["Render.D4_passive_no_modal"]:::head
  n9["Render.D6_clear_fields"]:::head
  n10["Render.D6_field_labels"]:::head
  n11["Render.Ctx.rebuild"]:::lemma
  n12["Render.T10_ui_shown"]:::lemma
  n13["Render.uiAtomsList_append"]:::lemma
  n14["Render.uiAtomsList_cons"]:::lemma
  n15["Render.uiAtomsList_nil"]:::lemma
  n16["Render.uiComponentsWhere_mem"]:::lemma
  n17["Render.uiDatedWorkspace_atoms"]:::lemma
  n18["Render.uiItem_honest"]:::lemma
  n19["Render.uiLabel_nonempty"]:::lemma
  n20["Render.uiModal_honest"]:::lemma
  n21["Render.uiPlaceFooter_mem"]:::lemma
  n22["Render.uiPresent_source"]:::lemma
  n23["Render.uiReviewStatus_readOnly"]:::lemma
  n24["Render.uiTimelineChildren_atoms"]:::lemma
  n25["Render.uiWorkspace_info"]:::lemma
  n26["Render.uiWrapFieldChoices_atoms"]:::lemma
  n27["Render.uiWrapGrowthReferences_atoms"]:::lemma
  n28["Render.uiWrapInfo_atoms"]:::lemma
  n29["Render.uiWrapRow_atoms"]:::lemma
  n1 --> n2
  n2 --> n3
  n3 --> n11
  n3 --> n13
  n3 --> n14
  n3 --> n16
  n3 --> n17
  n3 --> n21
  n3 --> n25
  n4 --> n11
  n4 --> n5
  n4 --> n20
  n5 --> n18
  n5 --> n22
  n6 --> n11
  n7 --> n12
  n7 --> n14
  n7 --> n15
  n8 --> n11
  n9 --> n12
  n9 --> n14
  n9 --> n15
  n9 --> n19
  n9 --> n26
  n10 --> n14
  n10 --> n15
  n10 --> n19
  n10 --> n22
  n10 --> n23
  n10 --> n24
  n10 --> n26
  n10 --> n27
  n10 --> n28
  n10 --> n29
  n12 --> n11
  n12 --> n13
  n12 --> n14
  n12 --> n15
  n12 --> n16
  n12 --> n17
  n12 --> n21
  n16 --> n15
  n18 --> n14
  n18 --> n15
  n18 --> n23
  n18 --> n24
  n18 --> n26
  n18 --> n27
  n18 --> n28
  n18 --> n29
  n20 --> n14
  n20 --> n15
  n21 --> n14
  n21 --> n15
  n22 --> n11
  n22 --> n13
  n22 --> n14
  n22 --> n15
  n22 --> n16
  n22 --> n17
  n22 --> n21
  n24 --> n14
  n24 --> n15
  n25 --> n14
  n25 --> n15
  n25 --> n27
  n25 --> n28
  classDef head fill:#e3eefc,stroke:#2b6cb0,stroke-width:2px,color:#0f2747,font-weight:bold
  classDef lemma fill:#ffffff,stroke:#8a94a6,color:#1f2937
  classDef other fill:#f4f4f5,stroke:#a1a1aa,stroke-dasharray:4 3,color:#3f3f46
```

</details>

<details><summary><b>UI library &amp; geometry</b>: 34 headline claims. Integer layout, layout rules G1–G9, structural certificates and the renderer-range theorem.</summary>

```mermaid
flowchart LR
  n0["Layout.Range.checkProgram_allStates"]:::head
  n1["Layout.Range.checkProgram_sound"]:::head
  n2["Layout.Range.layoutAccepted_program"]:::head
  n3["Layout.Range.renderer_range"]:::head
  n4["Layout.RenderCovered_finite_iff"]:::head
  n5["Layout.Shell.shell_rules"]:::head
  n6["Layout.advance_le_cell"]:::head
  n7["Layout.channel_certificates"]:::head
  n8["Layout.column_apart"]:::head
  n9["Layout.finiteFamily_missingShape"]:::head
  n10["Layout.geometry_independent"]:::head
  n11["Layout.greedy_complete"]:::head
  n12["Layout.greedy_width"]:::head
  n13["Layout.layoutAccepted_allPatients"]:::head
  n14["Layout.layoutAccepted_allPatients_finite"]:::head
  n15["Layout.layoutAccepted_allViewports"]:::head
  n16["Layout.layoutAccepted_bannerPixels"]:::head
  n17["Layout.layoutAccepted_reviewAllPayloads"]:::head
  n18["Layout.layoutAccepted_rules"]:::head
  n19["Layout.layoutAccepted_safety"]:::head
  n20["Layout.layoutAccepted_textComplete"]:::head
  n21["Layout.layoutAccepted_textPixels"]:::head
  n22["Layout.layout_satisfies"]:::head
  n23["Layout.modal_blocks"]:::head
  n24["Layout.paintText_supported"]:::head
  n25["Layout.portAccepted_rules"]:::head
  n26["Layout.realized_currentCommit_visible"]:::head
  n27["Layout.reviewFamily_accepted"]:::head
  n28["Layout.scroll_apart"]:::head
  n29["Layout.scroll_complete"]:::head
  n30["Layout.scroll_line_width"]:::head
  n31["Layout.textAtoms_preserve"]:::head
  n32["Layout.wrap_complete"]:::head
  n33["Layout.wrap_line_width"]:::head
  n34["Layout.Range.render_small"]:::lemma
  n35["Layout.Range.smallModal_fits"]:::lemma
  n36["Layout.RenderFamily.sound"]:::lemma
  n37["Layout.chunks_complete"]:::lemma
  n38["Layout.chunks_short"]:::lemma
  n39["Layout.codepointInk_supported"]:::lemma
  n40["Layout.column_floor"]:::lemma
  n41["Layout.constrain_satisfies"]:::lemma
  n42["Layout.layoutAccepted_allScreens"]:::lemma
  n43["Layout.layoutAccepted_geometry"]:::lemma
  n44["Layout.review_shape_payload_independent"]:::lemma
  n45["Layout.screenShape_flat_length"]:::lemma
  n46["Layout.screenShape_sources"]:::lemma
  n47["Layout.separated_pixels"]:::lemma
  n48["Layout.shift_rect"]:::lemma
  n49["Layout.textAdvance_bound"]:::lemma
  n0 --> n3
  n1 --> n3
  n2 --> n1
  n2 --> n13
  n3 --> n34
  n3 --> n35
  n8 --> n40
  n8 --> n48
  n9 --> n45
  n13 --> n36
  n14 --> n13
  n15 --> n43
  n16 --> n18
  n16 --> n47
  n17 --> n42
  n17 --> n27
  n17 --> n44
  n19 --> n18
  n19 --> n24
  n19 --> n29
  n19 --> n30
  n19 --> n31
  n20 --> n18
  n20 --> n32
  n21 --> n18
  n21 --> n47
  n22 --> n41
  n24 --> n39
  n25 --> n18
  n26 --> n46
  n29 --> n11
  n30 --> n6
  n30 --> n12
  n32 --> n37
  n33 --> n38
  n33 --> n49
  n40 --> n48
  n42 --> n18
  n42 --> n19
  n42 --> n46
  n43 --> n18
  n49 --> n6
  classDef head fill:#e3eefc,stroke:#2b6cb0,stroke-width:2px,color:#0f2747,font-weight:bold
  classDef lemma fill:#ffffff,stroke:#8a94a6,color:#1f2937
  classDef other fill:#f4f4f5,stroke:#a1a1aa,stroke-dasharray:4 3,color:#3f3f46
```

</details>

<details><summary><b>Commit reducers</b>: 8 headline claims. Medication administration and ADT reducers the commit service runs.</summary>

```mermaid
flowchart LR
  n0["Commit.Adt.bed_exclusivity"]:::head
  n1["Commit.Adt.cancellation_preserves_encounters"]:::head
  n2["Commit.Adt.cancellation_references_latest"]:::head
  n3["Commit.Adt.patient_one_bed"]:::head
  n4["Commit.Adt.swap_active"]:::head
  n5["Commit.Adt.swap_atomic"]:::head
  n6["Commit.Mar.nonadministration_preserves_shared"]:::head
  n7["Commit.Mar.reoffers_doses_unique"]:::head
  n8["Commit.Adt.accepted_guard_at_written_versions"]:::lemma
  n9["Commit.Mar.reduce_invariant"]:::lemma
  n2 --> n8
  n4 --> n8
  n5 --> n8
  n7 --> n9
  classDef head fill:#e3eefc,stroke:#2b6cb0,stroke-width:2px,color:#0f2747,font-weight:bold
  classDef lemma fill:#ffffff,stroke:#8a94a6,color:#1f2937
  classDef other fill:#f4f4f5,stroke:#a1a1aa,stroke-dasharray:4 3,color:#3f3f46
```

</details>

<details><summary><b>Commit service protocol</b>: 30 headline claims. Model of the live service: locking, retries, crashes, caches. Stated under Postgres assumptions.</summary>

```mermaid
flowchart LR
  n0["AdtModel.Invariant.projection"]:::head
  n1["AdtModel.advance_publication"]:::head
  n2["AdtModel.bed_exclusivity"]:::head
  n3["AdtModel.changed_payload_no_effect"]:::head
  n4["AdtModel.guards_and_writes_on_replaced_versions"]:::head
  n5["AdtModel.machine_invariant"]:::head
  n6["AdtModel.no_duplicate_accepted"]:::head
  n7["AdtModel.no_lost_accepted"]:::head
  n8["AdtModel.no_phantom_effect"]:::head
  n9["AdtModel.partial_write_private"]:::head
  n10["AdtModel.patient_one_bed"]:::head
  n11["AdtModel.projections_equal_fold"]:::head
  n12["AdtModel.receipt_persistent"]:::head
  n13["AdtModel.refusal_no_effect"]:::head
  n14["AdtModel.retry_stable"]:::head
  n15["advance_publication"]:::head
  n16["bed_exclusivity_and_dose_at_most_once"]:::head
  n17["cache_cannot_bypass"]:::head
  n18["changed_payload_no_effect"]:::head
  n19["guards_on_replaced_versions"]:::head
  n20["machine_invariant"]:::head
  n21["machine_patient_projection"]:::head
  n22["no_duplicate_accepted"]:::head
  n23["no_lost_accepted"]:::head
  n24["no_phantom_effect"]:::head
  n25["patient_projections_equal_fold"]:::head
  n26["projections_equal_fold"]:::head
  n27["receipt_persistent"]:::head
  n28["refusal_no_effect"]:::head
  n29["retry_stable"]:::head
  n30["Commit.Adt.bed_one_patient"]:::other
  n31["Commit.Adt.patient_one_bed"]:::other
  n32["AdtModel.Invariant.accepted"]:::lemma
  n33["AdtModel.Invariant.effects"]:::lemma
  n34["AdtModel.Invariant.history"]:::lemma
  n35["AdtModel.Invariant.unique"]:::lemma
  n36["AdtModel.Invariant.valid"]:::lemma
  n37["AdtModel.initial_invariant"]:::lemma
  n38["AdtModel.publish_invariant"]:::lemma
  n39["initial_invariant"]:::lemma
  n40["publish_invariant"]:::lemma
  n41["publish_patient_projection"]:::lemma
  n42["reachable_invariant"]:::lemma
  n2 --> n30
  n2 --> n36
  n2 --> n5
  n4 --> n34
  n4 --> n5
  n5 --> n1
  n5 --> n37
  n5 --> n38
  n6 --> n35
  n6 --> n5
  n7 --> n32
  n7 --> n5
  n8 --> n33
  n8 --> n5
  n10 --> n31
  n10 --> n36
  n10 --> n5
  n11 --> n0
  n11 --> n5
  n16 --> n42
  n17 --> n28
  n19 --> n42
  n20 --> n15
  n20 --> n39
  n20 --> n40
  n21 --> n15
  n21 --> n41
  n22 --> n42
  n23 --> n42
  n24 --> n42
  n25 --> n41
  n26 --> n42
  n38 --> n32
  n38 --> n33
  n38 --> n34
  n38 --> n0
  n38 --> n35
  n38 --> n36
  n42 --> n39
  n42 --> n40
  classDef head fill:#e3eefc,stroke:#2b6cb0,stroke-width:2px,color:#0f2747,font-weight:bold
  classDef lemma fill:#ffffff,stroke:#8a94a6,color:#1f2937
  classDef other fill:#f4f4f5,stroke:#a1a1aa,stroke-dasharray:4 3,color:#3f3f46
```

</details>

<details><summary><b>Clinician simulation</b>: 5 headline claims. Simulated clinicians and effort measurement. Not a safety claim.</summary>

```mermaid
flowchart LR
  n0["Sim.Scheduling.clock_monotone"]:::head
  n1["Sim.Scheduling.erase_conservation"]:::head
  n2["Sim.Scheduling.exogenous_arm_independent"]:::head
  n3["Sim.Scheduling.start_bounds"]:::head
  n4["Sim.Scheduling.timing_accounted"]:::head
  n0 --> n3
  classDef head fill:#e3eefc,stroke:#2b6cb0,stroke-width:2px,color:#0f2747,font-weight:bold
  classDef lemma fill:#ffffff,stroke:#8a94a6,color:#1f2937
  classDef other fill:#f4f4f5,stroke:#a1a1aa,stroke-dasharray:4 3,color:#3f3f46
```

</details>

<details><summary><b>Research semantics</b>: 1 headline claim. Exploratory boards and timelines outside the clinical runtime.</summary>

```mermaid
flowchart LR
  n0["Sem.IndexedExtension.full"]:::head
  classDef head fill:#e3eefc,stroke:#2b6cb0,stroke-width:2px,color:#0f2747,font-weight:bold
  classDef lemma fill:#ffffff,stroke:#8a94a6,color:#1f2937
  classDef other fill:#f4f4f5,stroke:#a1a1aa,stroke-dasharray:4 3,color:#3f3f46
```

</details>

<!-- PROOF-MAP:END -->

## Commit protocol methodology

`lean/Ehr/Commit/Protocol/Model.lean` is an executable transition system;
`Proofs.lean` checks its safety theorems in Lean 4.35; `Cache.lean` models
version-bound journal caches separately. `AdtModel.lean`, `AdtProofs.lean` and
`AdtCheck.lean` extend this methodology to the implemented administrative board;
`LockOrder.lean` proves the ordered-prefix circular-wait exclusion lemma.
[Verification evidence](docs/audits/commit-model-20261106.md)
records exact commands, finite bounds and outcomes. These new statements are
not entries in the clinical Comparator catalog. The default `CommitProtocol`
library checks them without importing them into the clinical executable. They do not change clinical
specifications or claim verification of TypeScript/SQL.

The machine represents arbitrary finite client/request sets, actor-scoped request
IDs, immutable payload binding, duplicate attempts through independent hosts,
request locking, incremental read-set locking, locked version reads, session base
version/revision checks, native guard decisions, provisional append/projection,
atomic publication, lock release and response. A crash can abort at every phase;
a crash after publication loses the response but preserves the outcome. A client
timeout does not cancel a running transaction. Retry uses the original intent.
Requests that throw before publication leave no receipt. Returned command
refusals are durable; replay bypasses expired sessions but still requires host
authorization. No liveness, fairness or physical administration claim is made.

### Storage assumption

Assume Postgres primary READ COMMITTED behavior: a statement after acquiring a
row lock observes the committed predecessor; exclusive row/unique-key locks last
until transaction end; unique request and stream-version constraints hold;
COMMIT atomically and durably publishes every touched stream event, snapshot and
request outcome, or publishes none. Synchronous commit is enabled. An uncertain
COMMIT is either outcome, and retry resolves it by the unique request key. Initial
imports/provisioning must be consistent and the service the sole online writer.
Network partitions, failover configuration, database implementation, external
writers, authentication and corruption are outside the theorem.

Version zero abstracts each stream's imported baseline; versions count command
appends. `projection` is the shared reducer projection; `patientProjection` stores opaque
clinical successor hashes and is also proved equal to its event fold. Clinical
FHIR transformation functions and initial imports remain implementation tests. `keys` abstracts the
complete locked patient/shared/closed-board read set, including negative bed
reads. The existing `Ehr.Multi` reducer supplies the original model's bed/dose semantics.
The separate ADT machine uses `Ehr.Commit.Adt.commit` directly, including ready,
occupied, dirty and cleaning phases. Clinical FHIR materialization remains an
implementation test. The final CAS validates the captured read vector. The ADT
checker tests lock prefixes, mutual exclusion and absence of wait cycles; the
lock theorem excludes circular waits for strictly ordered acquisition prefixes
under the service hierarchy. The host's correspondence to that hierarchy is
tested/inspected, not proved. Native clinical semantics are a fresh guard-result oracle;
`HistoryCorrect` binds each accepted oracle result to its replaced version.

### Claims and limits

| Claim | Evidence |
|---|---|
| One effect per actor-scoped request ID; changed payload cannot write | Unbounded `no_duplicate_accepted`, `changed_payload_no_effect` |
| Every accepted receipt has an event, every event an accepted receipt | Unbounded `no_lost_accepted`, `no_phantom_effect` |
| Exact stable answer when retry finds a durable receipt | Unbounded `retry_stable`, `receipt_persistent`; thrown errors and later authorization changes excluded |
| Append satisfied the guard and expected versions of its exact log prefix | Unbounded `guards_on_replaced_versions` |
| Bed exclusivity and dose uniqueness | Unbounded `bed_exclusivity_and_dose_at_most_once`, using the existing Multi proofs |
| Refused/stale new commands have no clinical effect | Unbounded `refusal_no_effect` |
| Shared and opaque patient projections equal folds of accepted events | Unbounded `projections_equal_fold`, `patient_projections_equal_fold`, `machine_patient_projection` |
| Advisory cache cannot bypass a fresh guard refusal | Unbounded conditional `cache_cannot_bypass` |
| Cache state equals fresh replay under fixed version-bound replay inputs | Unbounded `Cache.reconstruct_fresh`, `Cache.interact_consistent`, `Cache.acceptance_equals_fresh`; host refinement remains conditional |
| Every fine-grained step preserves all durable safety properties | Unbounded `advance_publication`, `machine_invariant` |
| Bad interleavings, duplicate/retried requests and crashes | Executable bounded exploration in `Check.lean` |

`cacheVersion` records hit/miss eligibility; `cacheNative` deliberately carries
an arbitrary optimistic cache answer. Acceptance still requires the fresh oracle.
This is a contract, not a proof that `Store.reconstruct`'s cached state is equal
to fresh replay. Server session/event history, release and context binding,
resource/time-derived facts and cached reconstruction require implementation
refinement. The separate generic cache model includes revision-CAS session events and
projecting-commit invalidation. It assumes version-bound pure-fold replay;
changes to external directory/time/context inputs require invalidation or an
independent final guard. Session creation, consent expiry, role changes, and all
administrative ADT operations are outside the original fine-grained host machine;
the separate ADT machine below covers their implemented command protocol.
The model has explicit provisional staging but does not model SQL statements'
private MVCC versions individually: rollback isolation and all-stream atomicity
are the stated Postgres assumption.

### Administrative ADT extension

`AdtModel` separates the complete sorted board read set from changed patient/bed
streams. It executes admit, assign, transfer, swap, cancelAdmit, cancelTransfer,
cancelDischarge, release, discharge, clean and ready through the native reducer.
Transfer and cancelTransfer publish patient + source bed + target bed atomically;
swap publishes both patients and both occupied beds in one transaction. Private UPDATE and event INSERT are separate steps, so
crashes before/after each stream write, before outcome staging, and after COMMIT
are explicit. Rollback discards all provisional writes; a lost COMMIT reply
preserves the complete durable outcome. Version counts include only changed
streams. Provisioned boards, including admitted unplaced patients, are explicit
baselines rather than empty-state assumptions.

| ADT statement (`Ehr.Commit.Protocol.AdtModel`) | Evidence |
|---|---|
| Same bed ID cannot have two patients; a patient cannot occupy two bed IDs | Unbounded `bed_exclusivity`, `patient_one_bed` for every `Reachable` interleaving from a valid baseline |
| Board equals native reducer fold of accepted transaction events | Unbounded `projections_equal_fold` |
| One multi-stream effect per actor/request ID; durable retries return the identical answer | Unbounded `no_duplicate_accepted`, `retry_stable`, `receipt_persistent`, `changed_payload_no_effect` |
| Events and accepted receipts correspond both ways | Unbounded `no_lost_accepted`, `no_phantom_effect` |
| Exact changed-stream set and guard at replaced versions | Unbounded `guards_and_writes_on_replaced_versions` |
| Every individual provisional event INSERT leaves durable state unchanged | Unbounded `partial_write_private`; all other steps covered by `advance_publication`, `machine_invariant` |
| No finite circular wait under strict ordered acquisition prefixes | Unbounded `LockOrder.no_wait_cycle`, conditional on the lock-plan correspondence |
| Actual machine locks follow sorted prefixes, remain exclusive and have no wait cycles | Bounded `AdtCheck`; host lock sequences checked in traces |

The lock hierarchy is request reservation → optional clinical session → sorted
streams; administrative commands take no session lock. Each transaction acquires
one request and at most one session. No writer holding streams acquires a later
request/session. Provisioning and offline import are excluded online writers.
The theorem does not prove Postgres internals, lock timing, absence of every SQL
error, starvation freedom or eventual response. A deliberately reversed stream
order is a detected circular-wait control.

**Administrative policy.** These are
local simulation policies, not additional clinical regulations. A17-style `swap`
requires two different admitted, placed patients, distinct beds and current
ownership of both occupied beds. Both beds must have `active = true`; provisioning
takes this fixed availability flag from the configured closed board (default true).
Admission, assignment,
transfer destinations and cancellation destinations also require active beds.
There is no online activation/deactivation command and no additional unit/service
compatibility restriction in the existing reducer. The signed actor must have the whole board's unit/patient scope. Swap
records completed placement atomically; physical transport is separate. Two
opposite transfers into occupied beds remain refused.

Every patient ADT transition advances `revision`, a patient-scoped event ordinal.
`encounter` is the admission ordinal (zero for imported encounters). Existing
boards missing these fields are read with zero/null/active defaults, without
default-only writes or version resets; pre-extension movements are not cancellable.
The immutable
accepted event log records each transition; `patient:revision` identifies its
original event. `last` retains only the latest cancellable movement. Clinical
chart edits do not advance this ADT ordinal. Assign, release, swap and cancellation
clear `last`; later admission/transfer/discharge replaces it. Thus **all three
cancellations require the original to be the patient's latest ADT event**, of the
matching kind, with a positive exact ordinal supplied in the event field:

- A11 `cancelAdmit`: patient still admitted in that admission's bed. End placement,
  mark the bed dirty and mark that encounter `entered-in-error`.
- A12 `cancelTransfer`: patient still owns the recorded destination; the recorded
  origin must be empty **and ready after cleaning**. Move back atomically and
  mark the destination dirty. No implicit hygiene override.
- A13 `cancelDischarge`: patient remains discharged/unplaced; caller explicitly
  chooses an empty ready bed, which may differ from the original. Reopen the
  same encounter and remove its end time; never create a replacement encounter.

Only charge nurses and bed managers can swap/cancel; admitting clerks retain
admit/assign permissions. Cancellations compensate **current** state, never load
an old chart/board snapshot. Clinical documentation, orders, administrations and
their original encounter links remain intact, including records from the
cancelled interval. Cancellation does not retract clinical work. A cancellation adds FHIR Provenance targeting the
encounter and referencing the original patient ADT ordinal. Encounter sequence
extensions prevent reopening another completed episode; ambiguous/missing
encounters refuse. Encounter location history is retained. The board exposes
latest-event identity, separate swap/cancel controls and specific refusal reasons.
Full sorted-board locks plus exact read vectors serialize bed reuse, transfer,
discharge, swap and cancellation; a stale command must be resubmitted with a new
request ID after review. Identical-ID retries retain the exact durable outcome.

The world CLI now exports `adt.json` (`adt-realism-v1`) alongside its clinical
schedules by default; `--adt off` selects historical generation without that
sidecar. `world/src/adt.ts` consumes the same initial census and timed admission/
discharge records, then executes every administrative transition through one
native `ehr serve` child. It adds same-unit transfers (0.03 per placed patient-day),
one possible same-unit swap (0.05 per board-day), erroneous admissions (0.01 per
admission), erroneous transfers (0.02 per transfer) and erroneous discharges
(0.002 per placed patient-day), followed by linked compensating corrections.
These low-frequency rates and 30-minute cleaning / 5–20-minute transport delays
are **provisional simulation assumptions**, not measured incidence estimates.
[HL7 v2 chapter 3](https://hl7.eu/HL7v2x/v29/std29/ch03.html) defines the A11–A13/A17
movement/correction categories; [FHIR R4 Encounter](https://hl7.org/fhir/R4/encounter.html)
distinguishes encounter lifecycle and location history. Neither source calibrates
these frequencies or approves this local cancellation policy.

The sidecar starts with 12 beds per service. When an admission has no ready
bed but the service has an empty dirty bed, an explicit native clean/ready
sequence precedes reuse, retaining the 30-minute cleaning delay. An actually
occupied service still refuses capacity exhaustion. Turnover can delay the
administrative event clock; clinical schedules are unchanged. The regression
fills a service, replaces a discharged patient after cleaning and separately
checks refusal when every bed remains occupied.

Administrative operator events and separate delayed transport completion/
supersession records are seed-deterministic; transports are not placement
authority. The sidecar does not change frozen clinical random streams, tasks,
rooms, schedules or chart documentation. Thus it exercises administrative
workload and occupancy, not clinical task effort for an ADT operator, nor a shared
physical-location model driving bedside MAR. Reservations and bed holds remain
out of scope. Forced-rate regression exercises swap, all three cancellations,
admission, transfer, discharge, cleaning and ready transitions against native
Lean, including stale transport supersession. The board controls change the certified app hash. Source-bound WASM/assets,
app bindings and recording certification/replay evidence must match the combined build.

The generic unbounded protocol invariants quantify over the expanded command
type, so their fold, exclusivity, request-uniqueness and atomic-publication claims
include swap and all three cancellations. `swap_atomic` specifies the complete
exchange successor; `cancellation_references_latest` binds every accepted
cancellation to the patient's latest ADT event, of the matching kind;
`cancellation_preserves_encounters`
preserves the complete patient-ID/encounter-identity projection under all three
compensations. `swap_active` requires both beds active at acceptance. Lock-order
exclusion remains the conditional unbounded `LockOrder.no_wait_cycle`; executable machine/host lock
correspondence remains bounded/tested. The expanded checker covers both inactive
bed refusals and the new movement races; its finite bounds are distinct from these
universally quantified safety statements.

Clinical placement's non-ADT guard and session checks remain explicit abstract
inputs; administrative guard decisions execute the native reducer without an
oracle. FHIR projection functions, initial provisioning and TypeScript/SQL
refinement remain tested rather than proved. See the
[prior ADT verification record](docs/audits/adt-model-20261107.md) for the earlier
bounds and historical audit receipts. The swap/cancellation checker exhausts
**33,467 transaction states / 244,133 transitions across 27 scenarios** (maximum
shortest-path depth 56), plus **1,257 reducer boards / 11,728 accepted edges** with
two patients, two beds, all three roles and up to three patient ADT events per
board (accepted boundary successors are also validated). Transaction graphs use
fixed request contents/IDs and include arbitrary repeated crashes, retries and
timeouts at every modeled phase, including each provisional UPDATE/INSERT pair.
No counterexample occurred; all six unsafe controls were detected. The original
protocol checker separately exhausts 21,393 transaction states and 81 cache states.

The regression suite uses an isolated Postgres primary and two actual hosts.
It tests legacy-board defaults without phantom writes; opposite-transfer refusal;
four-stream atomic swap; all cancellation eligibility/refusal paths; stale event
references; cancellation racing origin/destination reuse, transfer, discharge and
swap; late INSERT rollback; and lost COMMIT reply recovery for swap and all three
cancellations. Patient-scoped histories expose the action name and this patient's
successor only, so swap operands cannot disclose another patient. A mixed clinical
regression found an ED-disposition projection defect during implementation: using
the finished ED source encounter could create a second inpatient episode. The
fix selects the newly projected inpatient child and cancellation reopens that
same child. Clinical resources and encounter references survive unchanged.

The service integration suite requires a fresh PostgreSQL instance and the generated
native fixture. Its ADT and mixed clinical traces cover four-stream publication,
latest-event compensation, encounter retention, rollback and uncertain COMMIT.
Use the reproduction commands below; retained traces are scratch artifacts.

### Veil evaluation

Inspected upstream revision `57447722e7f25f06c75cff8735d10d41697afc14`
on 2026-11-06. Its `lean-toolchain` is exactly `leanprover/lean4:v4.35.0`, so
there is no version incompatibility. Its Lake manifest adds twelve packages
(including lean-smt/lean-cvc5, Loom, VerifiedHAMT, Lasso, Lentil, batteries,
aesop and ProofWidgets); the default library also needs an npm widget build.
For this small protocol we chose the permitted dependency-free explicit-state
checker and ordinary kernel proofs. We did not install/build Veil or claim a
runtime comparison. Sources: [toolchain](https://github.com/verse-lab/veil/blob/57447722e7f25f06c75cff8735d10d41697afc14/lean-toolchain),
[Lake configuration](https://github.com/verse-lab/veil/blob/57447722e7f25f06c75cff8735d10d41697afc14/lakefile.lean),
[manifest](https://github.com/verse-lab/veil/blob/57447722e7f25f06c75cff8735d10d41697afc14/lake-manifest.json).

### Reproduction

Use this checkout, no concurrent Lake processes, and disk-backed scratch:

```sh
export TMPDIR="${TMPDIR:?Set disk-backed TMPDIR}" CI=true LEAN_NUM_THREADS=6
cd lean
lake build
lake env lean Ehr/Commit/Protocol/Proofs.lean
lake env lean Ehr/Commit/Protocol/Cache.lean
lake env lean --run Ehr/Commit/Protocol/Check.lean
lake env lean Ehr/Commit/Protocol/AdtProofs.lean
lake env lean Ehr/Commit/Protocol/LockOrder.lean
lake env lean --run Ehr/Commit/Protocol/AdtCheck.lean
```

Every new theorem has a `#print axioms` check. The checker exhausts each finite
configuration rather than silently stopping at a depth limit; exceeding its
state budget fails the command. It retains shortest paths for counterexamples.
The host bounds are up to three simultaneous attempts/IDs, two patients, one
shared bed or scheduled dose, fixed expected versions/revisions (including
successor versions for bed release/reuse), and arbitrary retries,
crashes and timeouts within that finite state graph. This is not exhaustive
checking of all request contents or of the implementation.

The cache graph additionally checks up to three journal events and two version
advances, including writes by another session and projecting invalidation.
Unsafe negative controls must fail: duplicate effect, wrong projection, missing
receipt, missing accepted event and native refusal bypass. Fingerprint mismatches that reach enforcement abort before staging, remove the
request reservation and permit corrected same-ID retries. The machine blocks
acceptance with invalid screen evidence. Earlier version/shared refusals retain
their durable outcome and priority; preview caches remain advisory.

### Trace refinement test

`COMMIT_PROTOCOL_TRACE=/absolute/scratch/trace.jsonl` enables `Store.submit`
instrumentation; it is off by default. It records actor-scoped request/payload
hashes, hashed stream/session IDs, lock/read versions, cache eligibility, native
acceptance, provisional stream writes and snapshot hashes, staged result hashes, COMMIT intervals,
rollback/uncertainty and produced responses. It records no credentials, chart
values or native clinical states. The original adapter covers non-ADT commands
through `Store.submit`; encounter opening
and session-event transactions are not exported. `AdtStore.submit` and clinical
placement also export administrative board inputs/outputs with positional patient
aliases, hashed unit identifiers and numeric bed IDs. They contain no chart data,
credentials or clinical native states. `model/check-adt-trace.ts` requires one
explicit provisioned baseline before all writers, validates the complete lock
plan and UPDATE/INSERT pairs, and replays board contents and changed-stream
versions through `AdtModel.advance` in `AdtTrace.lean`. It accepts unchanged locked
streams. ADT integration tests exercise rollback, uncertain COMMIT and mixed
clinical/administrative writes. This remains a transaction-linearized test;
overlapping SQL lock timing and FHIR contents are not proved by the trace.

Use a new file for **one fresh test tenant**, with every command writer traced.
For the original adapter, patient imports have baseline version 1 and empty
shared streams version 0;
the adapter rejects changed/missing baselines and unsupported/no-op write sets.
The adapter checks the complete lock sequence before reads, native acceptance
before writes, before/after version agreement, complete staged writes before
COMMIT, and stable response hashes. Lean searches for a serial ordering that
respects nonoverlapping invocation/completion intervals and every locked read,
then executes **the same `Model.advance`** for each witness step. COMMIT errors
branch between rollback and commit-with-lost-reply. Budget exhaustion, incomplete
traces and mismatches fail. This serialization uses the declared database
assumption; it does not verify actual overlapping SQL lock timing or prove the
TypeScript/SQL-to-model refinement. Projection contents remain covered by the
existing integration replay tests, not by hashes in this trace test.

```sh
export TMPDIR="${TMPDIR:?Set disk-backed TMPDIR}" CI=true LEAN_NUM_THREADS=6
# Isolated 256 MB database for protocol tests; no shared database reset.
COMMIT_PG_PORT=55436 docker compose -p vgi-commit-model -f services/commit/compose.yml up -d --wait
(cd lean && lake env lean --run ../services/commit/test/Fixture.lean) > "$TMPDIR/commit-model-fixture.json"
export DATABASE_URL=postgres://vgi:vgi-dev-only@127.0.0.1:55436/vgi_commit
export COMMIT_FIXTURE="$TMPDIR/commit-model-fixture.json"
pnpm --filter @vgi/commit typecheck
pnpm --filter @vgi/commit test
pnpm --filter @vgi/commit test:protocol
pnpm --filter @vgi/commit test:adt-protocol
# Optional: retain the test's scratch trace (path printed in test diagnostics).
COMMIT_PROTOCOL_TRACE_KEEP=1 pnpm --filter @vgi/commit test:protocol
pnpm --filter @vgi/commit check:trace /absolute/scratch/trace.jsonl
# Retained administrative/clinical ADT traces use their separate adapter.
pnpm --filter @vgi/commit check:adt-trace /absolute/scratch/adt-trace.jsonl
```

The targeted test uses two actual hosts and Postgres. It compares cached/fresh
native decisions; races identical requests, doses and beds; checks a stale
session; forces native/SQL rollback; discards a real COMMIT reply and recovers
exactly one durable event. It independently folds each patient's imported
snapshot and durable command records for the exercised workflows. Tampered guard/version/partial-write traces must
fail, including a coherent false expected version rejected by Lean itself.
Scratch fixtures/traces remain outside Git.

## Completion checker methodology

`Ehr.Check.CompletionModel` checks AG EF completion certificates: a finite set
containing the initial state, closed under every model edge, with a strictly
decreasing recovery rank at every unfinished state. Acceptance proves recovery
from every model-reachable state and excludes unfinished dead ends, including
self-loop traps. `Ehr.Check.CompletionModel.accepted_completable` (in
`CompletionAbstraction.lean`) transfers this result to the unchanged property 6
only with a proved `EpisodeAbstraction` for every permitted record, user and
required commit. That interface requires forward coverage of arbitrary human
and macro events and arbitrary waits, plus lifting abstract recovery edges to
human interpreter runs. The finite guard-observation lemma preserves each
listed value predicate; it does not supply those transition proofs. Current
canonical programs do not yet have these adapters; ordinary checker acceptance
still does not imply general property 6.

`ehr check-completion --spec S --program P --canonical C [--prev P0]
--scenarios FILE` adds an opt-in scenario gate after the existing static check.
`FILE` is a nonempty JSON array of `{id, facts, user, goals, space, bound}`;
`goals` uses the simulator's `commits`, `values` and `expectedAcks` schema.
`space` is `full` (default), `goalDirected` or `navigationDirected`, with the
same restrictions as minimum-click search. Optional `events` instead selects
all safe interleavings of an explicit event alphabet. Back IDs and macros
invoking Back are excluded by the proved history-erasure condition. Clock,
patient facts, user and goal values stay fixed; arbitrary text/number inputs,
macro actors, workspace patient selection and waits are outside this result.
The command emits `property6Closed: false` and never issues an ordinary
deployment certificate. It refuses budget exhaustion as `unknown`.

The native search exhausts its reachable graph, assigns ranks by reverse BFS,
then independently validates its positive certificate or a closed losing
region. Negative results include an interpreter-replayed path and trap state;
the no-continuation claim is relative to the declared move space. Regression
examples distinguish a successful minimum-click path from a premature-navigation
trap; adding a return route gives a six-state certificate checked by kernel
reduction. Hash collisions, unfinished self-loops, cycles with exits, outgoing
goal edges, incomplete certificates and infinite discovery are covered too.

New interaction specifications for owner review are in
`Ehr.Check.InteractionRules`: every firing interruptive alert key is acknowledged
before a new commit, and Back retains existing captures (including unsaved and
unconfirmed input) and commits. These follow from the existing guard and Back
semantics. Accepted scenario certificates also check alert acknowledgment and
capture/commit retention on navigation edges through `CompletionModel.edgesHold`;
`accepted_edges` proves coverage of every reachable model edge. A patient-switch
durability claim is deferred: workspace switching clears patient-local state,
while signed-data persistence belongs to the external commit service. There is
no discard-on-Back prompt in the modeled semantics because Back preserves input.

Targeted native verification for this checker:

```sh
export TMPDIR="${TMPDIR:?Set disk-backed TMPDIR}" LEAN_NUM_THREADS=6 CI=true
(cd lean && lake build && lake build completion-bench)
(cd lean && lake env lean Ehr/Check/CompletionAudit.lean)
node --test scripts/completion-check.test.mjs
lean/.lake/build/bin/completion-bench "$PWD" "$TMPDIR/completion-bench"
```

`CompletionAudit.lean` prints dependencies for all 33 new theorems. Native CLI
tests cover scenario acceptance, checked losing regions, unknown refusals,
static-rule precedence, JSON defaults and malformed input. Missing optional
scenario settings use the documented defaults; malformed present fields fail.
The benchmark reads the existing 15-persona/23-rejection matrix and writes only
to the explicit scratch directory. Canonical references are measured separately;
they remain non-deployable mixed-role references. One declared clinical task
per program is checked in `navigationDirected`, with a 2,000-state budget;
these tasks do not cover every required commit or every patient scenario.

[Completion evidence](docs/audits/completion-checker-20261106.json) records per-program
times, exact commands, binary/source bindings and the remaining proof work.
All 18 selected scenarios passed: 51–565 ms per persona and 2.97–3.09 s per
canonical reference, including certificate and interaction-edge validation.
The static matrix retained 15 acceptances and 23 expected rejections. A v1/P1
`full` search returned `unknown` at a 100-state budget (367 ms), rather than
accepting its explored prefix. All 33 axiom audits passed. General arbitrary-value/actor/time abstraction
adapters and a mandatory ordinary deployment gate remain unfinished. The CLI
preserves information-needs goal fields and refuses nonempty lookup requirements
because those stages are outside its scenario graph.

## Lean UI library (research)

`lean/Ehr/Layout` is isolated from deployment, the generator and the clinical
checker. Its new theorems are kernel checked; they are not yet in Comparator.
`ui-layout` consumes JSONL proposals without compiling Lean per proposal.
The visual harness and its font assets live under
`app/src/browser/ui-library`, outside the certified clinical source boundary.

**Language.** Units are integer 1/64 CSS pixels. Frames, horizontal/vertical
stacks, wrapping rows, fixed/weighted grid tracks, absolute layers and fixed scroll
viewports support hug/fill/fixed dimensions, min/max requests, gaps, padding
and alignment. Spacing, radii, palette, font-instance and type-scale tokens resolve in Lean
(`space-2`, `rounded-lg`, `slate-900`, `sans-600`, `text-sm`); integer/color
literals remain legal. Absolute positions,
overlapping layers, arbitrary opaque sRGB colors and component variants/slots
remain expressible; checking happens after expansion and layout. Marks are
rectangles, circles, rational-turn wedges, lines/polylines and text. Component
expansion has a total bounded-depth parser; cycles fail explicitly. Grid tracks accept integer fixed widths and integer fractional weights
(`tracks: [6400, "1fr", {"fr": 2}]`); omitted tracks retain equal columns.
Fixed tracks are honored even when they overrun their parent, so the checker
reports overflow rather than restricting the input language. A dynamic
bounded-list authoring primitive remains to implement.

**Layout and text proofs.** `layout_satisfies` establishes incoming size
constraints; clamping a parent does not itself establish child containment.
`column_apart` proves vertical stack separation for arbitrary child heights;
`scroll_apart` preserves separation under translation. `geometry_independent`
proves that binding any two content environments preserves computed geometry.
Measurement is one structural traversal; translation and flattening are separate
traversals. Text reserves line counts before data binding. `wrap_complete` and
`layoutAccepted_textComplete` prove complete bounded wrap content;
`advance_le_cell` and `wrap_line_width` bound advances and wrapped line widths.
Scroll text uses advance-based greedy breaking and retains paragraph breaks;
`greedy_complete`, `greedy_width`, `scroll_complete` and `scroll_line_width`
establish preservation and width bounds. Under the owner's policy,
every safety-classified slot must be a vertical text scroller with wrapping,
unbounded content height and no line budget or truncation. `maxLength` applies
only to non-safety text; safety text never fails length/glyph validation. A
character absent from the pinned font is spelled `[U+HHHHHH]` with pinned ASCII
(e.g. `[U+01F9EC]`); `TextAtom` preserves each original scalar, and the full
original string is emitted as the painter's accessible label. This explicit
fallback avoids unmeasured browser fallback glyphs. `paintText_supported`,
`textAtoms_preserve` and `layoutAccepted_safety` prove this lossless source/visual
spelling contract for arbitrary Unicode strings. Layout admission requires the
chosen font to support the escape alphabet. Non-safety text retains its finite
length/glyph validation and declared overflow policy. Pinned advances and vertical extents come from static Noto Sans
400/600/650/700/750/800, Mono 400, Symbols 400, CJK SC Regular and Hebrew
Regular. Research-only font bytes live under `app/src/browser/ui-library/fonts`;
the clinical font assets and certified app hash inputs are unchanged.

| Script | Research painter support | Added WOFF2 bytes |
|---|---|---:|
| Latin Extended, Greek, Cyrillic | Selected base/extended blocks, precomposed characters; six static weights | 386,928 |
| Han, Kana, Hangul | BMP unified Han, Kana, all precomposed modern Hangul syllables; Noto CJK SC glyph forms, weight 400 | 5,401,836 |
| Hebrew | Unpointed letters and selected punctuation, weight 400 | 2,184 |
| Arabic; Devanagari and other Indic; Thai | Explicit scalar escapes; no pinned shaper is installed | 0 |
| Combining marks, Hangul Jamo, Han extensions/compatibility outside the selected subset, other missing scalars | Explicit scalar escapes; original string retained | 0 |

The added font payload is **5,790,948 bytes (5.52 MiB)** for the complete set.
CSS requests faces as used: ordinary Latin weight 400 costs 60,004 bytes; CJK
costs 5,401,836 bytes on first CJK use and Hebrew 2,184 bytes on first Hebrew
use. These research pages are outside the deployed entry point, so the
certified clinical app's font payload is unchanged. The source manifest pins
upstream URLs, SHA-256, output bytes, Unicode subsets, FontTools 4.68.0 and
Brotli 1.2.1. OFL licenses accompany the assets. `scripts/ui-library/fonts/build.py`
rebuilds subsets; `generate-fonts.py` derives integer advances and vertical
extents from the served bytes. Equal CJK advances use compressed ranges.

There is no complex shaping pipeline. Each supported scalar has a separate
integer advance cell; missing scalars use the existing pinned ASCII escapes.
The painter partitions each prebroken line into isolated runs: contiguous
Hebrew letters and following spaces use reversed scalar cells, while other
runs and digits retain logical order. Run order remains logical left-to-right.
This is an explicit limited bidi policy, **not** Unicode paragraph bidi: Hebrew
phrases are readable, but mixed directional punctuation and surrounding runs
are not reordered by UAX #9. Soft wraps are chosen in logical input order;
Lean proves widths and preservation, not linguistic visual ordering. Arabic,
Indic, Thai and combining sequences are deliberately escaped rather than drawn
with unmeasured joining/conjunct/mark placement. Synthetic bold is disabled for
single-weight fallback fonts. The expanded fallback chain applies to the six
sans instances; Mono and Symbols retain their existing small repertoires.
Previously supported visible Sans scalars, including clinical subscript `₂`,
are retained; soft hyphen is deliberately escaped as a format control.

The painter uses Lean's upward-rounded 1/64px advances for scalar cells and
checks intrinsic browser glyph advances independently in the differential.
Static instances avoid fractional variable-font interpolation discrepancies.
The 14px reference text reserve is 22px per line, sufficient for the maximum
1,453/1,000-em pinned vertical extent. Every text slot has a font, font size,
line height, reserved viewport lines and overflow policy; only non-safety slots
have a finite source-length contract.

**New rule predicates (owner review).** `layoutAccepted_rules` reflects checker
acceptance into the following conjunction. `acceptTemplate` checks 1440×900,
1280×800 and 1920×1080; `layoutAccepted_allViewports` quantifies over arbitrary
content environments for one fixed semantic template.

| Rule | Exact library predicate |
|---|---|
| G1 | Exactly one banner, outside scrolling and contained in the viewport; separated from every other painted mark. `layoutAccepted_bannerPixels` proves no shared pixel for any scroll offsets in the conservative clipping model. |
| G2 | Every active interruptive mark is fixed, contained and has strictly greater global z than ordinary paint. `modal_blocks` proves ordinary targets cannot dispatch while an interruptive layer is present. |
| G3 | Every declared target is at least 1536×1536 units (24×24 px); active target pairs are separated. Ordinary targets blocked by a modal are inactive. Shared scrollers use content coordinates; independent regions use conservative viewport envelopes. |
| G4 | Painted footprints or their outer scroll viewport are contained. Text has valid pinned metrics, positive capacity/lines, sufficient vertical reserve, bounded non-safety wrap capacity, and unbounded vertical wrapping for safety text with a pinned escape alphabet. Active text cannot intersect higher paint or unrelated paint at the same z; ancestor backgrounds at the same z are exempt. `layoutAccepted_textPixels` proves separation for arbitrary scrolling. |
| G5 | Every outer footprint has nonnegative x and right edge within viewport width; scroll content fits the nearest viewport horizontally. |
| G6 | Foreground/background contrast is at least 4.5:1 for ordinary text, 3:1 for text ≥24px or ≥18⅔px at weights ≥700, and 3:1 for targets. Colors are opaque 8-bit sRGB. Outward-rounded rational luminance bounds have exact integer fifth-power certificates (`channel_certificates`); no floating point enters the check. |
| G7 | Expected semantic occurrence paths and painted IDs are unique; each expected path is painted exactly once and no invented source path is painted. The W1 adapter derives the inventory from the actual `UiScreen`; the lower-level proposal API takes the expected inventory as an input. |
| G8 | Document order is top-to-bottom, then left-to-right at equal y. Within a shared scroller use content positions; between regions use outer viewports. Distinct z layers are separate reading regions. This does not establish an assistive technology's traversal order. |
| G9 | At 1440×900, **if any current-task commit target is present**, exactly one is fixed and fully contained without page scrolling. A screen with no current-task commit is exempt. Other sizes impose no extra commit constraint. Family admission links commit flags to the actual semantic source, preventing omission to claim an exemption. |

The pixel model overapproximates nested clipping with the outermost viewport;
inner clips can only remove pixels. Scroll ancestor identities distinguish
independent regions; this conservative envelope test can reject safe nested
designs containing targets or text in different inner regions. `findings` reports rule, node/peer, metric, actual,
required and signed deficit; warnings never admit a violation. Accepted mark
overlaps can produce `exploit` warnings for a later agent-facing odd-design log.

**Keyboard semantics.** `Keyboard` defines manual horizontal tabs, single-select
listboxes, modal dialogs and rectangular non-editable data grids against the
W3C APG [tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/),
[listbox](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/),
[dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) and
[grid](https://www.w3.org/WAI/ARIA/apg/patterns/grid/) profiles. Theorems cover
entry/activation, focus/selection bounds, modal Tab containment/Escape restoration,
and grid bounds/row boundaries. Optional deletion, popup menus, multiselection,
type-ahead and editable cells are absent. The visual harness emits requested
roles and blocks ordinary buttons beneath a modal; it does not yet connect DOM
keyboard events or ARIA relationships to these proved transition functions.

**Painter differential and W1 prototype.** The harness draws a flat global z
order, absolutely placed boxes and prebroken lines. `paint=false` suppresses all
visible ink, including text. Text has its own opaque local background above any
shape in the same box, matching the local contrast model. Native scroll offsets only
translate marks and intersect Lean-supplied clips. Kerning/ligatures are disabled;
`text-rendering: geometricPrecision` is required (ordinary hinted text produced
a 13.5px discrepancy in the initial probe). A targeted differential spans three
viewports, all eight font instances, Latin/Greek/Cyrillic/CJK/Hebrew and escaped complex-script
corpora, adversarial long labels, wrapping rows,
nine-column grids, custom shapes and nested scrolling. Browser glyph rendering
matching the pinned advance/vertical tables remains trusted, as do browser
clipping, paint and accessibility behavior; the differential validates samples,
not those assumptions universally.

`Semantic.portScreen` maps every `UiNode` occurrence, including wrappers, to a
unique path and retains user-facing labels, values and rows in safety-classified text. W1 signing
uses a persistent slate banner, blue commit control, fixed review scroller and
interruptive layers. It is a semantic prototype: fields/review rows are text
cards, not a close visual/interactive reproduction of today's EHR widgets.
The adapter identifies the first primary-role UiNode in preorder as the
current-task commit source; disabled primary buttons still count. This is the
precise task-selection convention in the absence of a separate task argument.
`portAccepted_rules` is conditional on checking the generated tree. The native
`ui-port-audit` probes every local program containing `w1Sign` with its matching
spec (frozen recorded specs where available), native group/tab/alert variants
and all supported viewports. These are probes using one synthetic patient,
not universal state coverage or clinical program certification. The all-screen audit also probes the structural
compiler and fixed-shell geometry across the complete local program/spec corpus.
Finite probes are executable regressions; the renderer-range theorem below
establishes universal coverage. The intentionally bad clinical programs remain
rejected by the unchanged clinical checker independently of layout admission.
Source data and audit outputs stay outside git.

**Universal bridge.** `screenShape` erases patient labels/values and info-table
rows, while retaining occurrence paths, interaction/commit placement classes
and structural line reservations. `compileShape` never reads content.
`Family.acceptFamily` checks every supplied shape/layout case at all supported
viewports, including semantic flag linkage (`Linked`). Layouts are arbitrary
Nodes, with per-viewport JSON cases; the reference compiler is optional.
Semantic source values bind by tree path, independently of agent text keys.
`family-check` admits references once; `family-paint` takes a new `UiScreen` or
actual `RenderInput`, binds its unrestricted values and paints without checking
safety string lengths. Omitted `layouts` selects the reference compiler;
custom layouts supply `{viewport, tree}` cases for each supported size. Request
`content`, `expected` and `components` have explicit decoder defaults; malformed
supplied values still fail. The stateless JSONL runner revalidates the supplied
family descriptor, independently of patient values. Uncovered shapes are
reported explicitly.

The following finite-family specializations remain kernel checked:

```lean
layoutAccepted_allScreens
    (family : Family) (h : acceptFamily family = true)
    (screen : UiScreen) (covered : Covered family screen)
    (v : Size) (hv : v ∈ viewports) :
  ∃ painted, familyPaint family screen v = some painted ∧ Realizes screen v painted

layoutAccepted_allStates
    (sp : Ehr.Spec) (program : Ehr.Program) (family : Family)
    (accepted : acceptFamily family = true) :
  ∀ (facts : Ehr.Facts) (display : Display) (user : Ehr.User) (state : Ehr.State),
    ∀ v ∈ viewports,
    match familyPaint family (runRenderUi ⟨sp, program, facts, display, user, state⟩) v with
    | none => ¬ Covered family (runRenderUi ⟨sp, program, facts, display, user, state⟩)
    | some painted => Realizes (runRenderUi ⟨sp, program, facts, display, user, state⟩) v painted

layoutAccepted_allPatients_finite
    (sp : Ehr.Spec) (program : Ehr.Program) (family : Family)
    (accepted : acceptFamily family = true)
    (coverage : RenderCovered sp program family) :
  ∀ (facts : Ehr.Facts) (display : Display) (user : Ehr.User) (state : Ehr.State),
    Ehr.Props.Reachable ⟨sp, program, facts, user⟩ state →
    ∀ v ∈ viewports, ∃ painted,
      familyPaint family (runRenderUi ⟨sp, program, facts, display, user, state⟩) v = some painted ∧
      Realizes (runRenderUi ⟨sp, program, facts, display, user, state⟩) v painted
```

`Realizes` includes G1–G9 on the actual semantic inventory, linked source roles,
exact full original values and the unbounded safety-text preservation/width
contract. `Covered` is finite structural family membership, with no string or
row-count bound. For a finite descriptor, `RenderCovered` requires every actual
EHR render shape reachable by human/macro events or time to belong to the
admitted family, for every Facts/Display/user. The theorem makes that premise
visible; the structural program certificate below discharges the corresponding
obligation for the fixed-shell compiler.
The all-states theorem needs no coverage or reachability premise: it establishes
partial correctness for every EHR input state, including unreachable states,
and identifies missing structural cases exactly. It does **not** promise an
output for an uncovered shape. The all-screens theorem needs only local shape
membership and applies to every payload of that shape, including unbounded
lists represented inside an info node. `realized_currentCommit_visible` proves
that a linked, complete current-task source cannot be hidden to obtain G9's
no-commit exemption. `finiteFamily_missingShape` proves that a finite shape
family cannot cover all possible UiScreens; it does not rule out coverage for a
particular EHR Program. Therefore finite probes are not treated as a global
coverage proof. Patient-directory controls can introduce structural growth even
when clinical table rows stay inside a single info node. The parameterized structural
certificate below closes the renderer range without enumerating these shapes.

**Ordinary structural certificate.** `Ehr.Layout.Structural`
adds `repeat-body-v1`: one fixed noninteractive banner and an arbitrary list of
ordinary semantic slots in one vertical scroller. Paths, target masks, labels,
record values, table row counts and list length are parameters. The certificate
is a kernel proof of the placement scheme, rather than a finite list of length
probes. In namespace `Ehr.Layout.Structural`, it proves:

```lean
repeatBody_rules (v : Size) (hv : v ∈ viewports) (first : List Nat)
    (xs : List (List Nat × Bool)) (unique : (first :: xs.map Prod.fst).Nodup) :
  Rules (first :: xs.map Prod.fst) v (placements v first xs)

certifiedClass_allScreens (screen : UiScreen)
    (accepted : accepts (screenShape screen) = true)
    (v : Size) (hv : v ∈ viewports) :
  ∃ painted, paint screen v = some painted ∧ Realizes screen v painted
```

`Structural.accepts` checks only structural
membership: one first banner, ordinary following regions and unique source
paths. The ordinary-only class is subsumed by the fixed shell below. Its
`Structural.accepts` predicate still declines commit and modal slots; their flags cannot be erased to gain admission. Synthetic
list probes exercise 0, 1, 2, 50 and 300 entries at every viewport; these are
regressions for the executable and are not the basis of the universal proof.

**Fixed commit/modal class.**
`Ehr.Layout.Shell` extends the unbounded body class with an optional current-task
commit and zero, one or two fixed interruptive occurrences. `shell_rules`
quantifies over arbitrary body lists, source paths and target masks, assuming
only unique source paths and at most two modal occurrences. Its conjunction is
the unchanged G1–G9. `Shell.certifiedClass_allScreens` has the same complete
`Realizes` conclusion as the ordinary class, now including these fixed regions.
`Shell.certified_currentCommit_visible` additionally identifies the actual
current-task source and proves its target, commit and fixed visibility flags at
1440×900, including under a modal. All strings remain unbounded scroll text.

The commit is a fixed 24px row at y=104px, between the banner ending at 104px
and the body scroller starting at 128px. It meets the unchanged 24px G3 minimum;
it is independent of body length and scroll position. Modal occurrences use a
higher fixed layer, and ordinary targets cannot dispatch while that layer is
active. `structural-paint` selects `fixed-shell-v2`; malformed/oversized modal
shapes still decline. This is a semantic text-card layout, not deployed widget
fidelity. The font assets and script policy are shared with the ordinary class.

**Program-level certificate.** `Ehr.Layout.Range.renderer_range` proves that
**every** output of the actual `runRenderUi` renderer fits `fixed-shell-v2`, for
any spec, program, Facts, Display, user and state, including unreachable states.
The proof establishes unique paths for arbitrary nested UiNode trees, the
single first-primary commit source, and the renderer's top-level modal grammar:
a section plus an acknowledgment control. Urgent-strip and patient-workspace
wrappers preserve that bound; ordinary trees and record lists are unrestricted.

Consequently `Range.checkProgram spec program` is a decidable constant-true
check on typed inputs for this fixed compiler. The universal range theorem
justifies that decision; no coverage proof is carried as an input certificate,
and finite probes are not used to infer the range. The checked class is the
standard semantic text-card compiler. Clinical admission continues through the
existing independent checker. Custom layout descriptors continue through
`acceptFamily`.

The exact program-level headlines, in namespace `Ehr.Layout.Range`, are:

```lean
checkProgram_sound (sp : Ehr.Spec) (program : Ehr.Program)
    (_accepted : checkProgram sp program = true) :
  RenderCovered sp program Library.fixedShell

layoutAccepted_program (sp : Ehr.Spec) (program : Ehr.Program)
    (accepted : checkProgram sp program = true) :
  ∀ (facts : Ehr.Facts) (display : Display) (user : Ehr.User) (state : Ehr.State),
    Ehr.Props.Reachable ⟨sp,program,facts,user⟩ state →
    ∀ v ∈ viewports, ∃ painted,
      uncheckedPaint (runRenderUi ⟨sp,program,facts,display,user,state⟩) v = some painted ∧
      Realizes (runRenderUi ⟨sp,program,facts,display,user,state⟩) v painted
```

`checkProgram_allStates` strengthens the second result by dropping reachability.
`RenderFamily` is a typeclass for finite descriptors and certified structural
compilers. `RenderCovered` keeps all its patient/state
quantifiers. `RenderCovered_finite_iff` is a definitional equivalence with the
original finite-family obligation, and `layoutAccepted_allPatients_finite`
reproduces its original conclusion. The generic `layoutAccepted_allPatients`
uses the same `Realizes` contract; `layoutAccepted_program` calls it with the
coverage hypothesis discharged by `checkProgram_sound`.

The JSONL operations are `program-check` with `{spec, program}` and
`program-paint` with `{render: RenderInput, viewport}`. Runtime program painting
binds the actual native render without repeating per-patient geometry, class
membership or text-length admission. `structural-paint` still checks arbitrary
supplied screen shapes and declines oversized modal grammars. No deployment,
clinical acceptance, event-dispatch integration or custom-widget fidelity is
inferred from layout admission. The six canonical and 52 accepted noncanonical
programs in the retained inventory are all covered by the universal theorem;
no additional class widening is needed for those programs.

The program inventory covers **6/6 canonical programs** and **52/52
accepted noncanonical programs** (54 matching spec contexts). Across all 186
paths, 113 distinct programs, 118 contexts and 3,472 declared screen occurrences,
there are **no uncovered programs or screens**. The separate empirical checks
accept 7,944/7,944 structural probes and 3,468/3,468 shell geometry checks,
including G9. The original W1 port also remains 3,468/3,468; the two named bad
clinical inputs remain refused. The [current range inventory](docs/audits/ui-certs-range-20261107.json)
records every program alias and declared screen, program/spec/source hashes,
exact theorem statements and verification commands. Those counts are backed by
`renderer_range`, rather than inferred from the finite probes.

The [earlier ordinary-class inventory](docs/audits/ui-certs-20261107.json)
records the narrower `repeat-body-v1` implementation. The current fixed-shell
range inventory supersedes its coverage limits.

There is also a closed positive certificate: `reviewFamily_accepted` proves
admission of `reviewFamily` with proof-producing `decide_cbv` (kernel checked,
no native evaluation axiom). `layoutAccepted_reviewAllPayloads` states:

```lean
∀ (banner : List (String × String)) (rows : List (List (String × String)))
  (enabled : Bool) (reason : Option String) (v : Size), v ∈ viewports →
  ∃ painted,
    familyPaint reviewFamily (reviewScreen banner rows enabled reason) v = some painted ∧
    Realizes (reviewScreen banner rows enabled reason) v painted
```

This has no length, glyph, shape-membership, coverage or runtime-acceptance
premise. It is a semantic review/sign family with arbitrary banner fields,
review-table rows and enabled/blocked reason; it is not a theorem that every
state of the deployed EHR renderer has that exact shape.

**Not proved / incomplete.** Close widget
fidelity, bounded-list authoring, complete DOM/APG integration,
Comparator coverage and deployment integration remain open. Browser glyph and
accessibility rendering remain trusted. Nothing here replaces existing clinical
certification or authorizes switching the deployed painter or generator. No data
or import bound is introduced.

Validation (from the repository root; pnpm uses `CI=true`):

```sh
export TMPDIR="${TMPDIR:?Set disk-backed TMPDIR}" CI=true LEAN_NUM_THREADS=6
(cd lean && lake build && lake build ui-layout ui-port-audit)
node --test scripts/ui-library/native.test.mjs scripts/ui-library/family.test.mjs \
  scripts/ui-library/structural.test.mjs scripts/ui-library/program.test.mjs \
  scripts/ui-library/fonts.test.mjs
node scripts/ui-library/port-audit.mjs --all-screens
pnpm --filter app typecheck
pnpm --filter app lint
flock "$TMPDIR/vgi-browser-heavy.lock" pnpm --filter app exec playwright test --config src/browser/ui-library/playwright.config.ts
```

Targeted checks passed 21 native regressions (19 layout/program tests and two
font tests) and seven Playwright tests (one worker under the shared lock, after
the refreshed port audit). The differential compared
228 boxes, 153 text lines and 6,861 intrinsic glyph advances: all worst
deviations were 0 CSS px. The named-declaration audit covers 186 theorems. Environment-wide inspection
also checks generated helper lemmas: 1,143 theorem declarations, of which 592
are axiom-free and 551 use only `propext`, `Classical.choice` and `Quot.sound`.

The targeted browser command also paints the audit's W1 sample when present
and verifies vertical scrolling/preservation of a 70,000-character safety value
with an unsupported Unicode glyph.
Port-audit baseline paths are resolved against the current checkout for the
known `releases/`, `programs/` and `runs/` corpus roots.
Metrics, corpus reports and the signing screenshot are written under `$TMPDIR`.
Font tables regenerate with `scripts/ui-library/generate-fonts.py` (fonttools
4.68.0, brotli 1.2.1); `scripts/ui-library/fonts.json` binds source bytes/instances.
`scripts/ui-library/generate-contrast.py` regenerates rational interval certificates.
The default `lake build` imports the unit tests, closed review-family certificate
and original family axiom checks; the two UI executables additionally build
the shell/range proof. The current range inventory embeds the exact axiom-audit
source used against the compiled modules; explicit source inspection is also available with
`cd lean && for module in Engine Contrast Check Keyboard Json Semantic Family Examples Structural Shell Range;
do lake env lean "Ehr/Layout/$module.lean"; done`.

Source changes require a WASM rebuild and manifest check before app build,
recording re-certification and strict replay. Full template and persona browser
audits run sequentially under the shared browser lock. Layout research does not
switch the deployed painter or generator.

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
| **Bed management (ADT)** | Admit, assign, transfer, atomic bed swap, linked admission/transfer/discharge cancellation, release, discharge and bed cleaning on a unit bed board. | Enterprise patient flow, transport authority, reservations, multiple facilities. |
| **Regulatory updates** | Vendor releases v1 → v2 → v3 that add rules, migrated per clinician and re-certified. | Real vendor upgrade tooling. |
| **Data and storage** | Immutable FHIR R4 imports and Postgres event projections: Patient, Encounter, Observation, Condition, AllergyIntolerance, MedicationRequest, MedicationAdministration, Immunization, DiagnosticReport, DocumentReference, ServiceRequest, Procedure, Consent, Appointment, Task, Communication, ChargeItem, Provenance. Native-guarded, versioned commands and live updates for all workflows. | HL7v2 interfaces, enterprise patient index, production audit logging, high availability. |
| **Identity** | Keycloak single sign-on (PKCE) for all live clinical, MAR and bed-management workflows. | Production identity, break-the-glass access. |
| **Users** | Simulated clinicians with seeded behavior and interruptions, measured in clicks, scrolls and mouse travel. The default policy plans through the current screens; an optional bounded policy learns locations and searches visible controls. | Real clinicians; no user study. Search, practice, forgetting and hidden tastes use uncalibrated simulation assumptions. |

## Medication administration outcomes

The generated release templates label all five MAR actions explicitly. Regenerate
them from Lean-owned content after changing canonical screens; recorded programs
and frozen certification inputs retain their original layouts.

Scheduled ward doses carry `OrderChoice.administration`, separately from order
`holdReason`: a typed given, held, refused, delayed or notGiven outcome, reason,
stable occurrence ID, scheduled/window/attempt minutes, re-offer and prescriber
notification decisions. Delayed is pending; each occurrence ends given, clinically
held, patient-refused or not-given. NPO oral doses and prandial insulin are held;
off-unit doses are documented rather than silently skipped. PRN generation is
unchanged. Historical schedules remain decodable; the old `patient-refused` hold
sentinel now maps to refused. Other historical holds remain held.

**Provisional simulation policy, not a universal clinical standard:** critical
medications are insulin, systemic formulary antibiotics and anticoagulants. Their
late window is 30 minutes; other daily doses use 120 minutes and other scheduled
doses 60 minutes, capped at 18:59 for expiry documentation by shift end.
Clinical acceptance of cross-shift dose ownership remains outside the outcome
model; the workload queue can carry its unchanged source tasks. One re-offer is attempted after
20/45 minutes respectively, or later when an off-unit patient returns, only within the window and before
discharge, with the original regimen order still active. No catch-up administration
is generated after expiry. A second refusal
or a held critical dose requires a separate `chartAssessment` episode documenting
prescriber notification, the outcome, reason and occurrence times. Critical missed
doses are escalated too. This simulates the nursing action/documentation; it does
not implement a prescriber inbox, delivery acknowledgment or treatment response.
The existing universal scan/review/cosign requirements remain in force even for
nonadministration documentation; bedside exception workflows remain future work.

The conditional draws below are **uncalibrated scenario rates**, not population
estimates. Clinical holds take priority, then off-unit absence, then availability,
refusal, lateness and otherwise given. Seeded draws are independent per occurrence.

| Decision | Probability at that branch |
|---|---|
| NPO oral medication / prandial insulin | 100% while NPO |
| Lisinopril SBP hold / prandial insulin poor intake | 8% each |
| Warfarin high INR / heparin or enoxaparin low platelets | 5% / 2% |
| Medication unavailable | 2%; 70% available on re-offer |
| Patient refusal | SC 5%, PO 2.5%, other routes 0.5%; 60% accept re-offer |
| First attempt beyond the window | 0.5% |
| Off-unit return | Deterministic from the existing absence interval |

[Shandilya et al., 2015](https://pmc.ncbi.nlm.nih.gov/articles/PMC4954515/)
reported refusal, inability to take medication and unavailability as distinct
omission causes and recommended team communication for recurrent omissions.
[Popoola et al., 2018](https://pubmed.ncbi.nlm.nih.gov/29523536/) found more
nonadministration of subcutaneous anticoagulants, commonly from refusal; this
motivates a higher SC scenario rate, without fitting their cohort.
[CMS hospital guidance](https://www.cms.gov/Regulations-and-Guidance/Guidance/Manuals/Downloads/som107ap_a_hospitals.pdf)
distinguishes time-critical ±30-minute and longer locally governed windows.
These sources motivate the categories and timing structure; they do not establish
our probabilities, drug classification, retries or escalation thresholds.

`Goals.lean` maps each typed outcome and its reason into MAR captures; escalation
adds a nursing documentation episode. `Commit.Mar` records delayed and notGiven
events without consuming the dose key. FHIR uses completed for given, on-hold
with a delayed reason for pending attempts, and not-done with the distinct
held/refused/not-given reason for terminal nonadministration. Only given records
contain dosage. Later giving the same occurrence consumes it once, even after
multiple nonadministration attempts; a consumed occurrence rejects further MAR
commits. The live MAR directory retains the native outcome codes and displays Given,
Held, Refused, Delayed and Not given distinctly, with nonadministration reasons.
The live two-nurse regression documents all four nonconsuming outcomes before
one administration of the same occurrence. The board browser regression exercises
swap and all three linked cancellations through real authenticated commands.
The live reducer enforces occurrence uniqueness; timing and escalation
remain generated scenario policy, rather than new live authorization guards.
No theorem statement in Specs, Props, Statements or comparator changed.
The existing four MAR invariant/guard theorems keep their statements and now range
over the two additional Event constructors. New `nonadministration_preserves_shared`
and `reoffers_doses_unique` make the nonconsumption and re-offer guarantees explicit.

Outcome regressions enumerate given, clinical hold, refusal→given, repeated
refusal, unavailable→given/missed, off-unit return/expiry, late-window miss,
discharge before re-offer and order discontinuation. The TypeScript/Lean boundary
test decodes generated seed 1/2/3 decisions, derives documentation goals, reduces
the corresponding MAR events and checks nonconsumption and dose uniqueness.
Seventeen controlled scenarios also complete through the canonical nursing UI,
including the separate escalation episode. Native Lean tests cover the historical
refusal sentinel, every FHIR outcome, omission of dosage for nonadministration and
repeated attempts by different actors. Agent validators preserve every outcome
and optional legacy data. The expanded Postgres MAR test covers the new statuses;
it requires a fresh PostgreSQL instance and generated commit fixture.

Reproduce the outcome regressions after the native build:

```sh
export TMPDIR="${TMPDIR:?Set disk-backed TMPDIR}" CI=true LEAN_NUM_THREADS=6
(cd lean && lake build && lake env lean Ehr/Commit/Mar.lean && lake exe gents)
pnpm --filter world exec vitest run test/administration-outcomes.test.ts --maxWorkers=2
pnpm --filter agent exec vitest run test/lean-types.test.ts --maxWorkers=2
pnpm --filter @vgi/commit test:integration
```

The ten-day successor comparison against the frozen ward flow found all P3
days changed for seeds 1/2/3 in both populations. Synthea P1/P2/P4/P5 schedules
change from day 2 for all three seeds; fixture-population schedules change from
day 4 for seed 1 and day 2 for seeds 2/3. Initial states remain unchanged.
Synthea attempt counts (including re-offers, rather than unique occurrences):

| Seed | Given | Held | Refused | Delayed | Not given | Re-offers | Notifications |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | 282 | 10 | 19 | 7 | 6 | 21 | 13 |
| 2 | 266 | 9 | 14 | 6 | 4 | 16 | 15 |
| 3 | 205 | 11 | 9 | 4 | 6 | 9 | 14 |

All regenerated seeds change P3 schedules, including explicit given decisions;
new task counts enter the next day's state hash, so later schedules for other
personas may change too. Seed reproducibility is retained within this successor
model. Exact archive tests inject a test-only frozen ward implementation; production
uses the successor by default. Frozen worlds 1/2 remain immutable. New outcome experiments require separate
successor worlds/schedules, simulator measurements, trajectories and task controls. Rebuild native/WASM
and re-certify all 33 retained `core-10day` revision bindings against the changed
Lean source and canonical MAR label, then remeasure/replay preserved inputs; a
frozen run does not acquire new outcome scenarios by re-certification alone.
MAR history and board display changes require matching app certificate bindings.

## Continuous workload clock

New native expert and bounded simulations default to `continuous-workload-v1`.
`lean/Ehr/Sim/Scheduling/` owns the shared queue and shift model; the policy hooks
retain the clinical interpreter and per-task random streams. `startMin` remains
the source task's planned ready time for archived schedules. Optional task
`timing` records arrival, ready, priority, deadline, result availability and MAR
occurrence/window pairs in milliseconds from the first shift's start. Without
that metadata, arrival and ready both equal `startMin`; no urgency is inferred.
The world CLI defaults to source-based timing metadata; `--clock-mode legacy`
selects task-local clocks in either the world CLI or `ehr simulate` and reproduces
the previous scheduling semantics. A schedule's `clockMode` can also select it.

The clock advances to max(previous finish, arrival, ready, shift start). Among
ready tasks it orders by ascending priority (urgent zero), deadline (finite before
absent), then arrival, retaining source order on ties. It reevaluates the queue
when an off-duty gap ends. Urgent work takes precedence at task boundaries;
clinical tasks finish before another clinical task dispatches; communication can preempt at an event boundary. The clock uses milliseconds;
clinical `Facts.now` plus the episode clock retain the subminute offset and trace
timestamps remain deciseconds. `workload.timings` records actual start/finish,
coverage ID, disposition and owned suspend/resume intervals from interruption service.

Shift intervals can be supplied as `shifts` in a schedule. The default uses the
existing persona tour lengths, 15-minute ED/ward overlaps and successor coverage;
clinic successors skip weekends. There is one serial server per persona even in
an overlap. Active work beyond its assigned shift counts as overtime; queued work
crossing a shift end is handed over to successor coverage. Each task is completed,
explicitly abandoned with a reason when its policy cannot complete the clinical
goals, or retained as carried work at the coverage horizon. Carried tasks also
receive incomplete effort rows so denominators retain every source task.
`ehr simulate --carry-out FILE` exports full unserved source tasks as a schedule;
recipient coverage must use the same time origin and replace the exhausted shifts.
This is simulator queue ownership, not the live clinical handoff acceptance protocol.

World timing projection (`world/src/timing/`) uses existing ED arrival clocks and
acuity, clinic slots, inbox resources/backlog and medication passes. Exogenous
source tasks and arrival metadata have no UI or policy input: comparison arms
receive the same world seed and schedule, while their actual starts and outcomes
can differ. Successor coverage continues through nights and weekends for hospital
work. The current world generates weekday daytime clinical cases; this change does
not fabricate independent night/weekend cases or claim calibrated 24-hour demand.
World clinical state remains exogenous rather than being altered by a faster arm.

`DayResult.workload` adds total queue delay (start minus max(arrival, ready)),
distinct overdue MAR occurrence count, completed-result response time (availability
to documentation finish, including source backlog age before the schedule origin),
active overtime and tasks handed over. Per-task timing
and pending source IDs are retained. Dose/result endpoints use the exact final
clinical-event completion, before unrelated closure communication; task service
finish and subsequent queue delay still include that communication. A dose is
overdue when task documentation
finishes after its existing MAR window, or that window has passed at the final
coverage horizon. This conservative documentation proxy includes held/refused
outcomes; it does not claim measured bedside administration time. Dashboard and
measurement reports expose these values separately from physical effort. Legacy
recordings without this envelope show timing as unavailable. Simulator type augmentation is generated in `lean/generated/sim-types.ts`;
the clinical enum/type module remains byte-stable. Simulator-only schemas
live under `app/src/dashboard/measurement-schema.ts` so source timing survives
agent load/store parsing without editing the clinical wire schema. Trajectory
extraction follows recorded dispatch order and seeds the actual subminute start.

The [owner decision list](#policies-awaiting-owner-review) collects the provisional
workload and interruption policies with the existing MAR and ADT decisions.

Kernel lemmas cover `start_bounds`, `clock_monotone`, `erase_conservation`,
`timing_accounted`, `exogenous_arm_independent`, queued-work start/duration bounds
and preservation of task start/finish when attaching interruption intervals. The full queue/coverage loop
and its output partition are executable bounded checks, not a general liveness or
fair-service proof. No clinical theorem statement or rule is changed. Headline
clinical claims and their proof map structure are unchanged.

Historical reruns select both `--clock-mode legacy --interruptions fixedCost`
on `ehr simulate` or `run-days`. New `run-days` manifests bind both modes, and
resume refuses a mode change.
`core-10day` is retained as that labeled control. Offline remeasurement uses
explicit `simulationModes` metadata, independent actual/canonical/no-agent actor
memories, and separate train/validation partitions. It preserves layout choices
and makes no model calls. `pnpm --filter agent exec tsx src/remeasure-cli.ts
--source runs/core-10day --out runs/<new-label> --world runs/world/<successor>`
creates a separately labeled real-work measurement; add both legacy flags for
a matched successor-task control. The command refuses an existing output and a
world with a different seed, insufficient days or missing clinicians. It refreshes
world/runtime fingerprints, labels the serial execution `OFFLINE`, and records
the source recording digest. Copied decision/prompt evidence is explicitly
historical. Relative paths are repository-relative.
Calibration measurements are recomputed evidence;
recorded historical decision estimates remain historical inputs. Successor world
schedules and real-work measurements belong in separately labeled local outputs;
frozen worlds 1/2 are never regenerated in place. Source-bound native/WASM assets
and certificate bindings must match before replay.
The [workload verification receipt](docs/audits/workload-clock-20261108.md) records
the bounded-check scope, source coverage limits and exact verification commands.

## Interrupting work and owned resumption

New native simulations default to `--interruptions realWork` for both expert and
bounded policies. `--interruptions fixedCost` selects the previous seeded
`Task.interruptions` count, goal-action positions and wait/think operators;
archived comparisons must select it explicitly. Real work ignores that historical
count. The clinical task trace contains only interpreter events; external
communication is measured separately in each task's optional `interruptions`
record (work, ordered steps, timestamps and closed frames). No synthetic clinical
click, receipt, prescription or result resolution is inferred from a call.

`lean/Ehr/Sim/Resumption/` defines patient-specific pages, urgent-result calls,
colleague questions, family requests and pharmacy clarifications. Each executes
patient identification, message reading, assessment, reply (or urgent escalation)
and documentation, with distinct per-step durations. Essential care is labeled
separately from routine requests. Urgent work preempts at the next event boundary;
time-sensitive work preempts nursing and inpatient-pharmacy work, while other
prescriber profiles queue it. Routine
work queues until task closure. A clinical popup must be acknowledged first;
if it remains unresolved at task closure, the clock waits for the remaining
offered arrivals and queued communication is explicitly handed to the on-call
service. Communication completion is distinct from clinical
follow-through under the existing critical-result rules: every completed urgent
notification records a separate handover of clinical follow-through to the
responsible clinical team; it never claims the result was resolved.

Draft/resumption specifications: frames belong jointly
to clinician ID, source patient ID and task ID. Foreign ownership, task or source
facts refuse restoration, with an explicit discard reason. Frames retain draft
values, screen/history, tabs, current slot and pending confirmations. Returning
advances the clock and pays `3000 + 700 × draft entries + 1000 × unconfirmed
entries` milliseconds. Current review rules filter receipts by clinician,
data version, time and allowed role. Any clinical fact change (excluding clock,
cached receipts and department directory) clears alert acknowledgments and makes
all draft entries unconfirmed; the clinician must reconfirm through normal events.
The next clinical event uses the existing guard. Named handover records transfer
work responsibility, never another clinician's sign authority. These are new
simulation policies, not additional clinical regulations or live UI behavior.

Arrivals use an independent seed/task/minute stream with at most one arrival per
minute, timestamp jitter, and fixed offered exposure: W1/W5 15 minutes, W3 12,
W4 6, W6 20, W2/W7 5. Neither layout, action count, nor behavioral RNG enters the
arrival draw. The same inputs/seed therefore offer identical work across arms.
At closure the simulator waits for unoffered arrivals in this fixed exposure and
services the queue; it does not erase arrivals when one UI finishes sooner.
The exposure windows, binomial arrival approximation, urgency/type mix, triage,
step durations, reorientation coefficients and closure policy are **provisional**.
They require calibration; these UI-task windows are not whole-shift workloads.

Default profiles are nursing/ward (5.5/hour), surgical physician (13/hour),
emergency physician (6.9/hour) and clinic prescriber (3/hour). The clinic rate is
an assumption. `--interruption-profile inpatientPharmacy` selects 10.6/hour;
other profile names are `wardNurse`, `surgicalPhysician`, `emergencyPhysician`
and `clinicPrescriber`. Profile selection does not grant a clinical role.
[Myers & Parikh](https://pubmed.ncbi.nlm.nih.gov/28871511/) observed 259
interruptions in 47.3 hours of trauma-center nursing, including beneficial work.
[Bagnasco et al.](https://pubmed.ncbi.nlm.nih.gov/28697685/) observed approximately
13/hour among doctors and nurses in six surgical units.
[Chisholm et al.](https://pubmed.ncbi.nlm.nih.gov/11073472/) distinguished
30.9 brief interruptions from 20.7 task switches per three hours; the emergency
profile uses the latter denominator (6.9/hour).
[Inpatient pharmacy observations](https://pmc.ncbi.nlm.nih.gov/articles/PMC7153068/)
reported 10.6/hour across pharmacy employees. These populations, task definitions
and denominators differ: transferring any rate to the profiles above is provisional,
particularly nursing across settings and pharmacy employees to pharmacists.

Metrics separate handled/deferred work, work milliseconds, suspension-to-return
delay, reorientation, invalidated receipts/confirmations (`revalidationPrevented`,
a prevention proxy, not observed errors), and explicitly abandoned frames.
Communication and reorientation execute on the workload clock. A call arriving
during another call joins the service queue before return work; protocols and
reorientation are individually atomic. `reorientations` records each queued
return's release, start and finish. `workload.timings.suspensions` uses the same
owned frame's absolute suspend/return timestamps. Passive closure waits remain
wall time and are excluded from active KLM effort and overtime.

The native adapter accepts `SimulateInput.interruptions` and
`interruptionProfile`, retains the optional typed task measurements through schema
validation, and the dashboard displays them per selected clinician, including
incomplete tasks. Workload and interruption headline metrics use the same blind
even-day partition when the recording declares that measurement protocol. Historical absence is reported as unmeasured, rather than zero.

Incomplete clinical tasks explicitly discard their unsent drafts with the reason
`clinical task ended incomplete; unsent draft explicitly discarded`. Completion
is evaluated before this cleanup, and incomplete work remains incomplete.

Task metadata binds the model version, selected profile/rate, fixed exposure and
full offered-arrival list, even for zero arrivals. `closureWaitMs` separates
waiting for the offered exposure from active effort: wall time includes it,
KLM effort excludes it. Call/page content is synthetic communication input,
not an inferred FHIR finding. Invalid patient/message inputs cannot complete
communication and are explicitly handed over.

Measurement validation is an extension in
`app/src/dashboard/interruption-schema.ts`, also used by the native adapter and
recording readers. The shared clinical wire schema remains unchanged, preserving
the certified painter source boundary. Revalidation tests include changed source
versions, expired reviews, foreign source/owner/task bindings, queued work,
unresolved-popup handover and both policy completion paths.

`InterruptionConfig.refreshFacts` is the scenario timeline hook at absolute
milliseconds. Both policies refresh at episode entry and on return from work;
planning and guarded events share that current snapshot. Foreign-patient
refreshes are refused, and the episode's receipt-clock origin is preserved.
The stock CLI supplies immutable task snapshots (identity refresh); concurrent
chart-version updates require the world/workload timeline to supply this hook.
Dispatch uses immutable source tasks to draw offered arrivals; queue delay does
not shift or redraw that stream. Checkpoints use actual workload-clock time,
including fractional-minute starts, communication and paid return work.

Service reconsiders urgency after each communication protocol; future arrivals
cannot cause idle waiting ahead of already-arrived routine work. Communication
protocols are atomic; nested interruption of their individual steps is not modeled.

[Interruption verification and scope](docs/audits/interruptions-20261108.md)
record theorem statements, exact commands, native matched-arm cases and scope limits.

## Bounded clinician simulation

`Ehr.Sim.Policy.simulate` retains its JSON envelope. Administration decisions and
the legacy refusal correction change the corresponding task values and traces. Select
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
`expert` contains an independent BFS-policy run with the same clock and interruption modes, inputs and
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
`python3 scripts/user-model-compare.py
--out "$TMPDIR"/user-model-comparison`. It samples the first
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
is excluded. Historical scripted/replay callers retain their original policy explicitly.
There is no in-app flag control; a future control would enqueue this annotation
without interrupting work or changing screens during a shift.

`recordSession` writes one immutable JSON record to `runs/sessions/<id>.json`
(options, full programs/certificates, recent schedules and simulated traces,
evidence, choice/reasons and comparisons). These files are gitignored data.
The offline harness runs without an LLM or deployment:

```sh
\
EHR_BIN=./lean/.lake/build/bin/ehr \
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
pnpm --filter agent exec vitest run test/session.test.ts test/bounded-tailoring.test.ts --maxWorkers=2
pnpm --filter app build
pnpm --filter app exec playwright test --config src/browser/session-playwright.config.ts
```

`run-days --protocol certified-cadence-archive-v1 --cadence weekly
--bounded-costs --tailoring-sessions` enables the connected path. On a release
slot, `sessionReviewGate` recertifies the archive's top three niche bundles in
scratch and prepares 2–3 diverse replay-complete options. The historical session comparison may consider nonpositive effort scores to express a placement preference; production releases require the configured net effect floor. Fewer than two eligible options or a `null`
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
The offline tailoring comparison explicitly selects the historical discovery policy; production defaults to the hotspot portfolio.

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
Endpoint capture disables animations and transitions, loads the pinned fonts and
waits two animation frames after painting. It avoids a redundant second frame
pair and fixed timer; fidelity, geometry and physical assertions are unchanged.
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
Native popup geometry uses one EOF-terminated JSON-lines batch per FHIR bundle,
through the existing stateless `ehr serve` renderer. Every response must match
its request index; partial, reordered or errored batches fail before supplying
geometry. This avoids starting an interpreter for each popup. A three-bundle
P1 revision comparison preserved all 87 popup files byte-for-byte.
`core-10day` is the single retained recording.

The current certified app SHA-256 is
`030fac6d782d07099213018114de92b4facd19952201e094b4c3890e7edfef60`.
The MAR outcome display, notification-version handling and ADT board controls
change the certified source boundary. All 33 retained revision bindings have
passed re-certification, remeasurement and strict replay against this build.

Changes to the bound clinical sources require a new app hash and matching
recording certificates, geometry measurements and strict replay evidence. The
board controls are included in that boundary. `pnpm-lock.yaml` also participates
in the hash. Source-bound WASM assets and their manifest must match the current
Lean sources before an app build and recording re-certification.

Code-choice fields and their confirmation wrappers reserve a text-relative
minimum width inside wrapping sections. Increasing text size expands the track
instead of clipping the selected label.

Urgent alerts appearing after mount reserve their measured height immediately. The
pinned patient banner includes that height in its scroll offset;
resizing a wrapped strip updates the scroll reveal padding. The transition
regression covers appearance, document scrolling, wrapping and removal.

Renderer changes require matching certificate bindings and fresh geometry
measurements.

Cold profiling found repeated native interpreter startup and redundant browser
settling waits. Batching popups and removing those waits cut a cold P1/v1 sample
(three FHIR bundles, 981 inputs, 819 distinct trees) from 847.23s to 651.17s,
with identical verdicts, geometry and 8,046 measurement records. Measurements at
earlier app hashes are kept in [docs/audits/](docs/audits/).

The retained recording has 33 current certificate bindings and 50 remeasured
shifts. Full re-certification took 196.86 minutes, including
a 106.46-minute batch gate.
Fresh native/WASM strict replay verified 1,284 tasks and
72,636 events with zero mismatches. Frozen inputs, schedules,
model decisions and worlds 1/2 are preserved. Two legacy patient-refusal captures
are corrected from held to refused; the other clinical trace events are unchanged.
The sequential template and persona audits checked 1,826 and
1,296 distinct trees with zero findings. The
[verified-build report](docs/audits/realism-wave1-verification-20261107.md) records
exact commands, bindings, coverage, captures and timings. Earlier measurements
and verification receipts remain in [docs/audits/](docs/audits/).

Compare cold and warm certification with one shared lock, sequential commands
and a fresh cache root for each cold experiment:

```sh
export TMPDIR="${TMPDIR:?Set disk-backed TMPDIR}" CI=true EHR_SCREEN_WORKERS=4
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
The final status is written before computing the run digest, so the digest covers
the passed manifest as well as the remeasured files.
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
EHR_SCREEN_WORKERS=4 \
flock "$TMPDIR"/vgi-browser-heavy.lock \
pnpm --filter agent exec tsx src/offline-tailoring-compare.ts \
  --out "$TMPDIR"/wire-tailoring-medication-comparison --days 8
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
fixture, alongside the independently rerun full-suite evidence.


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
pre-critical-result inputs; exact snapshot tests use the test-only frozen ward flow and construct the additive
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
- `node scripts/migrate-neutral-terms.mjs`
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
- Fonts: Noto Sans, Noto Sans Mono, Noto Sans Symbols 2, Noto Sans CJK SC and Noto Sans Hebrew (SIL OFL 1.1).
