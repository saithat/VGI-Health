# Simulator

`Goals.lean` fixes clinical goals from the spec, typed scenario choices and FHIR
facts. `Policy.lean` plays them through the public `Ehr.step`; `Metrics.lean`
derives effort from the trace. `MinClicks.lean` searches the same interpreter
and checks both a replayable path and a lower-bound certificate.

## CLI

From the repository root, after `cd lean && lake build`:

```sh
lean/.lake/build/bin/ehr simulate --spec v2 \
  --program releases/v2/personas/P4.json --persona programs/personas/P4.json \
  --schedule runs/world/1/day-10-P4.json --world runs/world/1 --seed 123

lean/.lake/build/bin/ehr min-clicks --spec v2 \
  --program releases/v2/personas/P4.json \
  --schedule runs/world/1/day-10-P4.json --world runs/world/1
```

`--spec VERSION` resolves to `releases/VERSION/spec.json`; an explicit JSON
path also works. Simulation prints `DayResult`. Minimum search prints
`{tasks:[{task,workflow,clicks,keystrokes,path,keystrokePath,space,keystrokeSpace,
exact,episodePaths,keystrokeEpisodePaths,searchModel}]}`. Clicks and keystrokes
have independently optimized paths. `--bound N` sets the search queue-pop bound;
`--space full|goalDirected|navigationDirected|auto` selects a space (default auto).

For the earlier single-task interface, `--task task.json` replaces `--schedule`
and prints the single task result directly. `--fhir` aliases `--world`.
The facts input may be a world directory with a fixture-index manifest, a fixture
index, a patient Bundle JSON file, an array of Bundles, or a directory with
patient-ID-keyed files. Precomputed Facts are a fallback. Facts-only input with
`todayResources` is rejected because those resources cannot be merged faithfully
without a patient Bundle.

Synthea transaction `entry.fullUrl` UUIDs are materialized as resource IDs when
resource.id is absent. Today's resources replace matching (type,id) resources,
without leaking later tasks backward. Render's `Fhir.parseBundle` derives Facts.
Structured world clinical observations supply named record values, including the
naloxone response. No clinical state or display logic is reimplemented in TS.

## Search spaces and the exactness claim

**Every task answer is exact within its reported space. It is not a claim of a
global minimum over every possible interpreter event.** `searchModel` repeats
the restriction in JSON. Multi-episode tasks are searched jointly, with receipt
carry and zero-cost resets allowed only after the preceding episode completes.
They set `exact:true` and include per-episode paths. An optional early review can
therefore reduce a later episode's cost; counts are not independent episode sums.
This is per-task optimization, not joint optimization across the whole day.

- **full:** goal-value entries and confirms, goal commit buttons after the
  chosen values are met, goto buttons, tab selections, group toggles, review
  buttons, order-line creation within the task's goal slots, and macros without
  Back clicks. Navigation can reach shared order/note composers across workflow labels.
  Scroll/search are state identities and omitted; Back and all component IDs
  that can invoke Back (including inside macros) are omitted. Identical review
  receipts at the fixed search time are not appended repeatedly. Exemption
  entries are available only for an exempt scenario.
- **goalDirected:** acknowledge an open popup; otherwise enter/confirm the
  first shown unmet goal field. When none is shown, retain every non-entry
  alternative (navigation, reviews, commits and macros), as in the handoff.
- **navigationDirected:** additionally restrict navigation: choose among ready
  goal actions (commits/reviews), or follow the first event of BFS's shortest
  route to the next actionable goal. BFS explores useful container openings and
  tabs that can reveal a goal/review/route. This is a smaller, faster space.
  Greedy entry/navigation can miss a cheaper linked-prefill or macro route.

Auto attempts full up to 12 values and goalDirected up to 15 values, with at
most 20 screens for either. It falls back on failure/bound; larger programs go
directly to navigationDirected. Explicit `--space` overrides this preflight.
Exceeding a bound or failing to find a completion returns an error, never a
reported zero or a guessed path.

The key forgets **only history**. Captured values retain their complete order;
receipts, clock, expansions and tab selections are preserved. This is a stronger
key than the handoff's proposed per-element grouping, with a smaller proof
surface and potentially more search states. Structural list buckets form the
Dijkstra priority queue so concrete searches reduce in the kernel. A TreeMap
of equality-checked hash buckets holds distances; hash collisions cannot make a
false certificate pass. Search does not advance KLM time.

`T9_jointMinimum` covers the CLI’s public joint task search and automatic
fallbacks; `T9_taskSearch` connects it to actual Core transitions and guarded
episode resets. `T9_minimum` covers the single-episode auto/fallback function. `T9_minimum_real` connects
the certificate to actual `Ehr.step` runs, not a copied transition model.
`History.lean` proves the history equivalence, including safe macros.
`Certificate.lean` proves replay and the lower bound, including zero-cost edges.
`Audit.lean` prints axioms for every named simulator theorem. The concrete
satisfiable witness and wrong-answer rejection examples use kernel `decide`.

## Persona and effort model

SplitMix64 plus UTF-8 FNV-1a produces one seeded stream per (seed,task ID).
Interruptions are assigned before UI-dependent random draws and retained when a
faster UI skips entries. A fuel bound and commit retry cap prevent loops; stuck
tasks and rejected/stale receipt reasons are complaints, not successes.

W4 uses separate medication episodes plus an assessment episode when requested.
W5 uses separate vaccine episodes plus the medical/note episode. Captures,
commits and alert acknowledgments reset per episode; patient review receipts
carry forward. Typed `w6Step` sets the encounter context, including pre-op.
Supply, CURES exemptions, holds, pain and refill reasons use typed fields rather
than encoded note-section strings. Inexact or unsupported scenario values are
reported under `complaints`, following the handoff's accepted-value fallback.

K/P/C/H/M in milliseconds are 200/1100/100/400/1350 (Card, Moran & Newell, 1980).
Scan 1500, wait 60000 and scroll 1100 are modeling assumptions. Homing is inferred
across the complete operator stream. A hotkey is one activation (`clicks`),
charged as a key rather than point+click; it saves time, not activations.
Keystrokes count typed characters, not hotkey activations. The ideal floor omits
travel, removable reminders and external interruptions, permits legal prefills,
and retains human-only work and required interruptive acknowledgments.

CURES can be shown on the ideal commit screen at zero review cost, so a waiver
is not a floor item. The persona records a scenario's exemption; search may use
the cheaper legal alternative. A batch-wide waiver is offered only when every
controlled prescription has the same supported exemption. The current surgical
exemption code is surgery-7-day; supplies above seven days use report review.
Allowed-value requirements (including zero Schedule II refills) constrain
unspecified goals; conflicting explicit clinical choices remain complaints.

## Verification

```sh
cd lean
lake build Ehr.Sim.Audit Ehr.Cli.Sim
# One Lake process at a time.
cd ..
python3 lean/Ehr/Sim/cli_smoke.py --days 10 --report /tmp/sim-validation.json
```

The CLI harness checks deterministic replay, all eight floor inequalities for
every completed task, and exact interruption retention. It records all incomplete
tasks; `--require-complete` additionally fails on those scenarios. This distinction
matters when a schedule requests work absent from its chosen spec/program.
Current integration blockers and exact remaining work are in `HANDOFF-sim.md`.
