# Discovery and release cadence

[Overview](../../README.md) · [Methods and reproduction](../../README.md#documentation)

## Hotspot portfolio

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
R1 also caps validation keystrokes and modeled time (`klmDeciSec`) at 2% above
baseline, without pixel rounding slack; neither replaces the release score.
Full task completion was already required. [Retained-decision replay](interaction-validation.md)
reports every shipped persona/night and distinguishes mandatory vendor updates.
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

Arm E is an opt-in tool-driven frozen-night agent (`--arms B,E`), with a minimal
starting prompt and train-only program, geometry, trace, spec, checker and estimator
queries. Claude tool use, OpenAI-compatible function calling and confined Codex MCP
share decision budgets and recorded tool-result replay. Reports include query-cache
proposals, complaints and train/validation gaps; no digest is promoted automatically.
E is not the default; only the owner may change that after reviewing measured results.
[Agent-loop methods and experiment status](agent-loop.md).

The one-context frozen B/D pilot (`night-01/P1`, one sample per arm, three live
completions total) accepted B's change and refused D's: D saved scrolls but added
three validation clicks. Both selected designs had structural distance 0.004717;
both native rejection rates were zero. This sample does not establish an
improvement from the new policy or greater boundary exploration. The gates were
retained without tuning to the result. Validation-completion fault fixtures
explicitly select the historical discovery policy so their candidate reaches
the validation gate independently of the structural effect floor. [Measurement and targeted verification](../audits/explore-structure-20261106.md)
records effects, costs and limitations.

## Archive and release cadence

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

## Bounded switch costs

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

## Review and deployment

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
A read-only simulator review is available in the
[UI version browser](tailoring-sessions.md);
there is no live clinician review control.

## Demo and regression evidence

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
