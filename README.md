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
export TMPDIR=/home/saithat/Projects/run-tmp CI=true
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

Generated-world JSON under `/runs/world/<id>/` uses its own manifest inventory.
It has no recording completion marker and does not enter the recorded-run index.
The preview/dev server serves its manifest and listed artifacts while refusing
unlisted files and parent traversal. Recorded runs retain their completed-prefix
boundary.

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
`COMMIT_PROTOCOL_TRACE` enables a structured test exporter for `Store.submit`;
`pnpm --filter @vgi/commit test:protocol` checks real Postgres traces against the
Lean machine, including rollback and a lost COMMIT reply. This is a
transaction-linearized refinement test, not a proof of the host implementation.
[Protocol evidence](docs/audits/commit-model-20261106.md) records exact commands,
bounds and outcomes.

Not proved: that the rules are clinically complete; the React painter,
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


## Commit protocol methodology

`lean/Ehr/Commit/Protocol/Model.lean` is an executable transition system;
`Proofs.lean` checks its safety theorems in Lean 4.35; `Cache.lean` models
version-bound journal caches separately. [Verification evidence](docs/audits/commit-model-20261106.md)
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
reads. The existing `Ehr.Multi` reducer supplies bed/dose semantics; administrative
ADT's richer phases and clinical FHIR materialization are not reimplemented here.
The final CAS validates the captured read vector; sorted locking avoids modeled
stream-lock cycles, but this is not a deadlock-freedom proof (the host also takes
session locks). Native clinical semantics are a fresh guard-result oracle;
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
administrative ADT operations are outside the fine-grained host machine.
The model has explicit provisional staging but does not model SQL statements'
private MVCC versions individually: rollback isolation and all-stream atomicity
are the stated Postgres assumption.

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
export TMPDIR=/home/saithat/Projects/run-tmp CI=true LEAN_NUM_THREADS=6
cd lean
lake build
lake env lean Ehr/Commit/Protocol/Proofs.lean
lake env lean Ehr/Commit/Protocol/Cache.lean
lake env lean --run Ehr/Commit/Protocol/Check.lean
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
values or native states. It covers commands through `submit`; encounter opening,
session-event transactions and administrative `AdtStore` are not exported.

Use a new file for **one fresh test tenant**, with every command writer traced.
Patient imports have baseline version 1 and empty shared streams version 0;
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
export TMPDIR=/home/saithat/Projects/run-tmp CI=true LEAN_NUM_THREADS=6
# Isolated 256 MB database for protocol tests; no shared database reset.
COMMIT_PG_PORT=55436 docker compose -p vgi-commit-model -f services/commit/compose.yml up -d --wait
(cd lean && lake env lean --run ../services/commit/test/Fixture.lean) > "$TMPDIR/commit-model-fixture.json"
export DATABASE_URL=postgres://vgi:vgi-dev-only@127.0.0.1:55436/vgi_commit
export COMMIT_FIXTURE="$TMPDIR/commit-model-fixture.json"
pnpm --filter @vgi/commit typecheck
pnpm --filter @vgi/commit test
pnpm --filter @vgi/commit test:protocol
# Optional: retain the test's scratch trace (path printed in test diagnostics).
COMMIT_PROTOCOL_TRACE_KEEP=1 pnpm --filter @vgi/commit test:protocol
pnpm --filter @vgi/commit check:trace /absolute/scratch/trace.jsonl
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
export TMPDIR=/home/saithat/Projects/run-tmp LEAN_NUM_THREADS=6 CI=true
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

## Lean UI library (research, v1)

`lean/Ehr/Layout` is isolated from deployment, the generator and the clinical
checker. Its new theorems are kernel checked; they are not yet in Comparator.
`ui-layout` consumes JSONL proposals without compiling Lean per proposal.
The certified app sources and pinned build inputs are unchanged; the visual
harness lives entirely under `app/src/browser/ui-library`.

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
establish preservation and width bounds. Under the owner's provisional policy,
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
length/glyph validation and declared overflow policy. Pinned advances and vertical extents come from Noto Sans
400/600/650/700/750/800, Mono 400 and Symbols 400. Every text slot has a font,
font size, line height, reserved viewport lines and overflow policy; only
non-safety slots have a finite source-length contract.

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
| G9 (provisional scope) | At 1440×900, **if any current-task commit target is present**, exactly one is fixed and fully contained without page scrolling. A screen with no current-task commit is exempt. Other sizes impose no extra commit constraint. Family admission links commit flags to the actual semantic source, preventing omission to claim an exemption. |

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
viewports, all eight font instances, adversarial long labels, wrapping rows,
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
not universal state coverage or clinical program certification. The initial 2026-11-06
pass (before the provisional G9 exemption) found 76 distinct programs across 103 paths: 3,304/3,381 checks accepted;
77 G9 failures were confined to intentionally bad programs and nursing benchmark
screens without an order-sign commit. Under the provisional scope, the follow-up
pass accepts all 3,381 layout checks: all 77 previous G9 failures are exempt
(48 nursing benchmark checks; 29 checks from two intentionally bad programs).
The two bad programs remain rejected by the unchanged native clinical checker:
`05-self-cosign` violates `humanOnlyKept` through a human-only cosign prefill;
`20-no-administration-time` fails `wellFormed` on an unknown alert reference
under its selected v1 spec. This does not claim a new administration-time
counterexample. All 76 observed structural families are admitted (354 cases
summed across families); their general `RenderCovered` obligations remain open.
`scope-comparison.json` records the baseline/check mapping and clinical verdicts.
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

The kernel-checked headline statements are:

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

layoutAccepted_allPatients
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
row-count bound. `RenderCovered` is the remaining **proof obligation**: every
actual EHR render shape reachable by human/macro events or time must be a member
of the admitted family, for every Facts/Display/user. The theorem makes that
premise visible; no general certificate for an arbitrary EHR Program is claimed.
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
when clinical table rows stay inside a single info node. Parameterized structural
certificates, or a proof of a concrete Program's finite shape coverage, are still
needed to close the general case.

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

**Not proved / incomplete.** General `RenderCovered` certificates, close widget
fidelity, bounded-list authoring, complete DOM/APG integration,
Comparator coverage and deployment integration remain open. Browser glyph and
accessibility rendering remain trusted. Nothing here replaces existing clinical
certification or authorizes switching the deployed painter or generator. No data
or import bound is introduced.

Validation (from the repository root; pnpm uses `CI=true`):

```sh
export TMPDIR=/home/saithat/Projects/run-tmp CI=true LEAN_NUM_THREADS=6
(cd lean && lake build && lake build ui-layout ui-port-audit)
node --test scripts/ui-library/native.test.mjs scripts/ui-library/family.test.mjs
node scripts/ui-library/port-audit.mjs --baseline "$TMPDIR/ui-library-port-before-scope.jsonl"
pnpm --filter app typecheck
pnpm --filter app lint
flock "$TMPDIR/vgi-browser-heavy.lock" pnpm --filter app exec playwright test --config src/browser/ui-library/playwright.config.ts
```

Targeted checks passed 13 native regressions and four
Playwright tests (one worker under the shared lock). The differential compared
198 boxes and 111 text lines: worst deviations were 0 CSS px for boxes and
1/64 CSS px for line widths. Explicit inspection reported 69 theorem axiom
outputs using only `propext`, `Classical.choice` and `Quot.sound`.

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
and headline axiom checks. Explicit axiom inspection is also available with
`cd lean && for module in Engine Contrast Check Keyboard Semantic Family Examples;
do lake env lean "Ehr/Layout/$module.lean"; done`.

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
is excluded. Historical scripted/replay callers retain their original policy explicitly.
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

At certified app hash `8d0fadf26732b5c9cc8a40c84f426b54aa4cd14eaf96c6264c983b1c35283e04`,
the 33 revisions took 98m07s cold, 9m53s warm and 98m01s with caching disabled
(six workers). Per-tree verdicts matched across all three runs: 24,353 clinical
states, 219,177 physical measurements and zero findings per run. Installation and
remeasurement preserved 1,284 tasks and 72,636 events with zero strict-replay
mismatches. [Verification evidence](docs/audits/main-verification-20261106.json)
records commands, build bindings and timings; the historical approximately
90s/revision serial baseline has no recorded cache temperature.

The current certified app hash is
`98657b3382d3a810c1ee7bcfb075f5ae653f86b18faf383538c65c8b7929a5c3`.
A cold P1/v1 profile using three FHIR bundles, 981 inputs and 819 distinct
trees took 847.23s before popup batching and capture-settling changes, and
651.17s afterward (23.14% less command wall time). Native preparation fell from
82.15s to 21.54s; the browser gate fell from 763.33s to 627.77s. All tree
verdicts, geometry and 8,046 physical measurement records matched exactly.
These are single observations; other native checks overlapped the first two
optimized browser batches. Standalone revision timing is not comparable to
the average of a cross-revision-deduplicated batch.
With the exact current context fully cached, the 33-revision batch gate took
178.11s total, with 27,371 cache hits, zero misses and the same 24,353-state /
219,177-measurement physical coverage. This gate timing excludes certificate
installation, strict replay and remeasurement.
The complete warm installation command took 91m44s: all 33 revisions received
current bindings, all 50 shifts were remeasured, and freshly regenerated native
and WASM replay verified 1,284 tasks / 72,636 events with zero mismatches. An
additional saved-context WASM replay also passed. Frozen inputs, decisions,
schedules and clinical traces were preserved.

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
