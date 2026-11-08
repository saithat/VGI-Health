# Offline tailoring sessions (simulator only)

[Overview](../../README.md) · [Methods and reproduction](../../README.md#documentation)

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
`prepareSession` uses the [shared bounded relearning estimator](discovery-and-cadence.md#bounded-switch-costs) and records
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

## Offline cadence comparison

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
