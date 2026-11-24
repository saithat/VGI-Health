# Naloxone offers and patient answers

World output now derives offer eligibility from the simulator's own FHIR facts,
episodes and `deriveGoals`, rather than the historical outpatient-only check.
Every eligible task in an emitted day or continuous horizon receives its own
structured `urn:vgi:world:clinical|naloxoneOffer` Observation. The existing FHIR
adapter maps its `accepted` or `declined` value into `facts.record`.

An independent deterministic stream (`seed:naloxone:task-id`) retains the 0.65
acceptance probability without shifting other scenario draws. Acceptance uses
the existing spec's `prescribed` offer outcome and human-entered
`naloxoneEducation = true`; decline uses `offered-declined` and the same required
education. The current release models the prescription through that documented
outcome, rather than a separate naloxone product order. No specification change
or new specification proposal is needed for this modeled path.

## Diagnosis of retained complaints

Counts below deduplicate tasks across repeated baselines, decisions, training
and clinician results. There are 326 JSON complaint occurrences in
`runs/lean-10day` (40 distinct tasks) and 33 in
`runs/climb-modeltime-p2-p4-smoke` (7 distinct tasks, all already among the 40).
The primary `days/` results contain respectively 40 and 7 complaints.
Every affected task has **no own response Observation** and no response in its
loaded record. None is an emitted Observation lost by the facts adapter.

| Run / workflow | Distinct tasks | Cause |
|---|---:|---|
| lean-10day, P2 W3 | 35 | Once-only opioids have unknown daily MME under Lean. The world checked outpatient discharge prescriptions, excluding these stat/facility orders and the stricter unknown-MME rule. Includes 26 discharges, 3 consults and 6 admissions. |
| lean-10day, P5 W6 postoperative | 4 | No offer-emission call for this stage. IV hydromorphone has an unknown MME factor under Lean; one task also has a 90-MME/day oxycodone line. |
| lean-10day, P5 W6 rounding | 1 | No offer-emission call for rounding; oxycodone 10 mg q4h reaches 90 MME/day. |
| climb-modeltime-p2-p4-smoke, P2 W3 | 7 | Same once-only opioid mismatch, on days 1–2 (5 discharges, 2 consults). |
| Either run: emitted but unmapped | 0 | Existing clinical Observation mapping works. |

`naloxoneLine` is per opioid order line, with either an active benzodiazepine
class in the FHIR-derived facts or high/unknown MME. It has no outpatient or
oral-route exemption. `highMme` treats unknown dose, frequency or factor as risk;
`once` is deliberately not a daily-frequency code. The old world calculation
instead combined home/new oral MME, recognized only oral controlled
prescriptions for emission, and ran only in selected outpatient workflows.
Benzodiazepine concurrency and a threshold discrepancy are not the cause of
these particular complaints. The known 90-MME line is omitted because of its
workflow, not because the threshold differs.

Every distinct complaint is accounted for here. “Once” means unknown frequency;
“factor” means hydromorphone's unknown factor. A check in the smoke column means
the same task also complained in the newer smoke.

| Task | Stage | Lean risk source | In newer smoke |
|---|---|---|---|
| d01-P2-W3-006 | discharge | morphine (once) | yes |
| d01-P2-W3-008 | consult | morphine (once) | yes |
| d01-P2-W3-014 | discharge | hydromorphone (once + factor) | yes |
| d01-P2-W3-022 | discharge | morphine (once) | yes |
| d02-P2-W3-005 | discharge | morphine (once) | yes |
| d02-P2-W3-006 | discharge | morphine (once) | yes |
| d02-P2-W3-014 | consult | morphine (once) | yes |
| d02-P5-W6-004 | postop | hydromorphone (factor) |  |
| d03-P2-W3-006 | discharge | morphine (once) |  |
| d03-P2-W3-009 | discharge | morphine (once) |  |
| d03-P5-W6-005 | postop | hydromorphone (factor) |  |
| d04-P2-W3-001 | discharge | morphine (once) |  |
| d04-P2-W3-005 | discharge | morphine (once) |  |
| d04-P2-W3-009 | discharge | hydromorphone (once + factor) |  |
| d04-P5-W6-003 | postop | oxycodone (90 MME/day); hydromorphone (factor) |  |
| d05-P2-W3-012 | discharge | morphine (once) |  |
| d05-P2-W3-019 | discharge | morphine (once) |  |
| d05-P5-W6-001 | rounding | oxycodone (90 MME/day) |  |
| d06-P2-W3-002 | admit | morphine (once) |  |
| d06-P2-W3-004 | discharge | morphine (once) |  |
| d06-P2-W3-005 | discharge | morphine (once) |  |
| d06-P2-W3-007 | discharge | hydrocodone-acetaminophen (once) |  |
| d06-P2-W3-015 | admit | morphine (once) |  |
| d06-P2-W3-016 | discharge | morphine (once) |  |
| d06-P2-W3-020 | discharge | morphine (once) |  |
| d07-P2-W3-001 | discharge | hydrocodone-acetaminophen (once) |  |
| d07-P2-W3-006 | discharge | morphine (once) |  |
| d07-P2-W3-007 | admit | morphine (once) |  |
| d07-P2-W3-010 | discharge | hydrocodone-acetaminophen (once) |  |
| d07-P2-W3-011 | consult | morphine (once) |  |
| d07-P2-W3-012 | discharge | morphine (once) |  |
| d08-P2-W3-002 | discharge | morphine (once) |  |
| d08-P2-W3-003 | admit | hydromorphone (once + factor) |  |
| d08-P2-W3-006 | admit | morphine (once) |  |
| d08-P2-W3-008 | admit | morphine (once) |  |
| d08-P2-W3-009 | discharge | morphine (once) |  |
| d08-P2-W3-015 | discharge | morphine (once) |  |
| d08-P5-W6-003 | postop | hydromorphone (factor) |  |
| d09-P2-W3-012 | discharge | morphine (once) |  |
| d10-P2-W3-011 | discharge | morphine (once) |  |

## Generation and compatibility

`pnpm --filter world gen` stages the complete schedules, queries all artifacts in
one native batch, then replaces historical offer observations and writes the
final day files and schedule aliases. Continuous horizons are checked with their
own cumulative facts. Native evidence must have exactly one row per task;
missing or malformed evidence aborts generation. No second eligibility rule is
used for emitted output.

The generation-only driver is `world/native/Naloxone.lean`. It links against the
existing Lean build's objects, omitting its CLI entry point. Its cached executable
is keyed by driver source, native build identity and link inputs under
`.cache/naloxone/`. Run `(cd lean && lake build)` first. Generation uses `lean`
and `leanc` selected by the checkout's pinned toolchain, without spawning Lake.
CI builds and packages this driver for binary-only workers; `VGI_NALOXONE_BIN`
selects that packaged executable. It does not replace `ehr`.

The pure `generateWorld` / `advanceDay` scenario library and its historical
outpatient draws retain frozen-snapshot behavior; use the world CLI to emit a
complete world. The simulator's missing-response diagnostic remains for frozen,
custom, or unfinalized library inputs. It is not silently replaced with a drawn
answer during replay. Its measured count is zero in the finalized replay below. A native facts/goal audit of all 286 emitted tasks in this two-day world finds 9 required offers, 9 own responses (5 accepted, 4 declined), and zero missing answers.

New world: **`runs/world/naloxone-native-v1`**, seed 1, two days. It uses the
retained world's legacy clock, workflow, case-mix and note modes to isolate this
change as far as current tooling permits. Current scenario generation has
changed since the retained world, so the timing comparison uses identical new
world tasks with only the new response observations removed as the before arm.
A direct raw-library regeneration confirms these P2/P5 tasks had no historical
response observations and identical choices.

```sh
export TMPDIR=/home/saithat/Projects/run-tmp
pnpm --filter world gen --seed 1 --days 2 --case-mix legacy --note-text legacy \
  --world-clock legacy --clock-mode legacy --workflows legacy --adt off \
  --out "$PWD/runs/world/naloxone-native-v1" --quiet
```

`runs/world/2` was not modified. Frozen day-1 vendor replays for P2 and P5 are
byte-identical before and after (all 40 tasks complete). The rebuilt `ehr` binary
itself is byte-identical to the starting binary, SHA-256
`8e58889f0b3b75987bf0cb1e93fe4b50d46afb0a8808ef8507f127f7fe47c6d5`.
Existing recordings continue to read their own frozen worlds; this check does
not recertify their historical certificates.

## Matched one-day replay

Day 2, vendor `releases/v1/personas/{P2,P5}.json`, seed 7, expert policy,
legacy schedule clock, current default simulation and text costs. This is an
offline native replay, with no recording, night agent or live stack.

| Persona | Completed before → after | Missing response complaints | KLM modeled minutes before → after | Summed task wall minutes before → after |
|---|---|---|---|---|
| P2 | 19/19 → 19/19 | 4 → 0 | 136.44 → 136.44 | 186 → 186 |
| P5 | 14/14 → 14/14 | 1 → 0 | 134.18 → 134.18 | 207 → 207 |

Of those five answers, two are accepted. Replay enters `prescribed` and
`naloxoneEducation = true` for both accepted tasks, before signing. The three
other answers enter `offered-declined` and education. Coded selections do not
change the action count or modeled time in these layouts.

Exact after-arm commands (run from the repository root):

```sh
for p in P2 P5; do
  lean/.lake/build/bin/ehr simulate --spec v1 \
    --program "releases/v1/personas/$p.json" \
    --persona "runs/world/naloxone-native-v1/personas/$p.json" \
    --schedule "runs/world/naloxone-native-v1/day-2-$p.json" \
    --world runs/world/naloxone-native-v1 --seed 7 > "$TMPDIR/naloxone/after-$p.json"
done
```

The before commands are identical except `--schedule` points at
`$TMPDIR/naloxone/before-day2-$p-schedule.json`, containing the identical tasks
with only resources whose id is `task.id + "-naloxone-response"` removed. Frozen
compatibility commands substitute `runs/world/2` and `day-1-$p.json` and compare
the complete stdout with the saved pre-change binary's output.

## Verification

With `TMPDIR=/home/saithat/Projects/run-tmp` throughout:

- `VITEST_MAX_WORKERS=2 pnpm --filter world test`: 150 tests pass, two unavailable archive-snapshot tests skip; all five realism tests pass.
- `pnpm --filter world typecheck` and `pnpm --filter world lint`: pass.
- `pnpm --filter agent exec vitest run test/ehr-adapter.test.ts test/simulation-modes.test.ts test/user-model.test.ts test/workflow-protocol.test.ts --maxWorkers=2`: 18 tests pass.
- `(cd lean && LEAN_NUM_THREADS=4 lake build)`: pass, 687 build jobs.
- All 16 Sim test modules built with the following invocation: pass, 148 build jobs.

  ```sh
  (cd lean && LEAN_NUM_THREADS=4 lake build Ehr.Sim.BoundedTests Ehr.Sim.DiscoveryTests Ehr.Sim.FactsTests Ehr.Sim.FeatureTests Ehr.Sim.GoalsTests Ehr.Sim.InformationNeedsTests Ehr.Sim.IntegrationTests Ehr.Sim.MinClicksTests Ehr.Sim.PolicyTests Ehr.Sim.Resumption.Tests Ehr.Sim.RoleCalibrationTests Ehr.Sim.Scheduling.CombinedTests Ehr.Sim.Scheduling.Tests Ehr.Sim.Scheduling.Wave3Tests Ehr.Sim.TaskMinimumTests Ehr.Sim.Workflow.Tests)
  ```
- `#print axioms` for the generation driver and its accepted-path regression definition: only `propext`, `Classical.choice`, `Quot.sound`. No theorem or specification was changed.
- Packaged-driver verification: `pnpm --filter world exec tsx src/build-naloxone.ts "$TMPDIR/naloxone/packaged-naloxone"`, then `VGI_NALOXONE_BIN="$TMPDIR/naloxone/packaged-naloxone" pnpm --filter world exec vitest run test/naloxone.test.ts --maxWorkers=2`: all four tests pass.
- `EHR_CONFORMANCE_TRANSPORT=serve node conformance/index.mjs --canonical --jobs 4`: 1,592 pass, zero failures, 1,438 not applicable across 15 canonical revision/persona combinations. The stateless server transport is also used by CI.

`node scripts/wasm-assets.mjs` reports pre-existing stale packaged evidence:
20 source files under `lean/` already differ from its recorded source map.
This patch changes none of those files, no WASM inputs, and nothing under
`app/`; the certified app hash is unchanged. WASM rebuilding and evidence
rebinding are therefore left outside this generation-only fix.

No Docker, live stack, recordings, night agent, retained-run conformance,
retained-run recertification, or push was performed. No live stack verification
is required by this change. No new specification proposal or blocking owner
question remains.
