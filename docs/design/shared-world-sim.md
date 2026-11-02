# Shared-world simulation: one EHR, many simulated users

Status: **proposed, 2026-11-02. Needs owner review.** Sections 6 and 9 change
the measurement protocol (`past-calibration-blind-even-days-v1`) and the
meaning of the headline numbers. Nothing here changes specs, properties or
release semantics.

## 1. Summary

Today each persona's day is a separate `ehr simulate` call: one simulated user,
a fixed task list, frozen per-task facts. The world generator creates
cross-persona effects, such as ED admissions reaching the ward or surgery
writing post-op orders, but it decides them in advance. What a simulated
clinician does never changes what anyone else sees.

This design runs one simulated hospital day as **one shared clinical state
with many concurrent simulated users**. Each user has their own certified
program (their persona's revision) and their own session. All writes go
through the same Lean reducers the Postgres commit service uses. Work reaches
an actor because of something another actor (or the outside world) actually
did: an RN's medication pass exists because a physician signed the order, and
the RN gets it only once the order is signed.

Speed is not the goal. Simulation is already a small share of run time (section 2),
and a shared world will cost somewhat more per day. The goal is fidelity:
causal coupling, real timing, contention and propagated failures.

## 2. What exists now

| Piece | Behavior today | Where |
|---|---|---|
| Day simulation | One process per (persona, day, program). Tasks are played **in sequence, each starting at its scheduled `startMin`** no matter how long the previous task took. A slow UI never makes the clinician late, and a backlog never builds up. | `lean/Ehr/Sim/Policy.lean` `simulate` |
| Facts | `factsFor task`: frozen per task (fixture bundle plus the task's `todayResources`). Only review receipts carry from one task to the next for the same patient. | `Policy.lean`, `agent/src/ehr.ts` |
| Interruptions | A seeded **count** per task, placed at random positions among goal actions. Not messages from anyone. | `Policy.lean` `interruptionPositions` |
| World | Deterministic daily transition `day d = f(seed, d, state d-1)`. Fixed subsystem order: census → discharges → ED → surgery → ward passes → P1 clinic → peds. It writes each persona's schedule; outcomes such as orders, admissions and dose decisions are decided **by the generator**. | `world/src/world.ts`, `world/src/flows/` |
| Coupling across personas | Only through the generator. On world 2, day 2, 7 of 82 patients appear in more than one persona's schedule; on day 7, 3 of 89. | measured from `runs/world/2/day-*-P*.json` |
| Shared-state semantics | `Ehr.Multi` (dose-once, bed uniqueness over interleavings) and the commit authority (`Commit.check`, `Commit.Mar.commit`, `adt-commit`) behind `ehr serve`, with a 32-actor seeded load test. Not used by the clinician simulator. | `lean/Ehr/Multi/`, `services/commit/`, `docs/design/concurrency.md` |
| Cost | `ehr simulate`, P1, 40 tasks: **4.2 s, 140 MB**. `ehr check`: **0.8 s**. The `core-10day-live` run took ~9 h of wall-clock time, almost all of it in the nightly agent loop (Codex calls, candidate screen and geometry checks, repairs). | timed 2026-11-02 |

### What the current model cannot show

1. **Causality.** P3's W4 doses come from generator-written orders, not from
   orders P2 or P5 signed in the simulated EHR. If P1's v5 can't sign an order
   (the coded-indication failure on day 7), nothing downstream notices.
2. **Timing and backlog.** Because every task starts at its fixed time, a UI
   that saves 3 minutes per visit never lets the clinic catch up. One that
   costs 3 minutes never makes it fall behind. Neither shows up as late doses,
   overtime or unfinished work.
3. **Contention.** Two RNs on the same chart, admissions competing for a bed,
   a co-sign that waits on an attending, a stale read rejected at commit. These
   are proved safe (`Multi.run_invariant`), but their **effort cost** is never
   measured.
4. **Interruptions with a source.** Pages, critical-result callbacks and co-sign
   requests interrupt a specific person at a specific time, and their effect
   depends on the other person's UI. Today they are a random count.

## 3. Goals and non-goals

Goals:

- One clinical state per simulated day, shared by all actors and changed only
  through the commit reducers in Lean (no TypeScript copy of clinical logic).
- Many actors per role, for example two RNs on 4 West and an attending for
  co-sign. This gives department × role (the 2026-11-02 personalization unit)
  something to vary.
- Work created by events, with real queueing: tasks start when the actor is
  free and the work exists.
- Bit-for-bit deterministic for a given seed and set of programs; a run can be
  replayed from its event log.
- Measurements that still compare an agent arm with a control arm on matched
  work (section 6).

Non-goals:

- Making runs faster. That is separate work on the agent loop (section 10).
- Changing certification. Each program is still checked and deployed alone
  (`ehr check` / `ehr deploy`); the shared world only *uses* certified programs.
- Real Postgres or HTTP inside the simulation loop. The simulation uses the
  same Lean reducers in memory (section 5.2); the live service stays an
  integration target.
- Modeling the physical world (walking, the pharmacy robot). Exogenous delays
  are parameters.

## 4. Concepts

- **Actor.** One simulated user: `{actorId, role, department, userId,
  personaParams, program}`. Several actors can share one persona's
  parameters and revision (two RNs on P3).
- **Exogenous demand.** Anything not caused by an actor in the simulation:
  patient arrivals, clinic bookings and no-shows, lab and imaging *values*,
  patient condition draws, inbound portal messages, refill requests. It is
  drawn from the world seed and is **the same in every arm** (common random
  numbers).
- **Endogenous state.** Anything an actor's commit produces: signed orders,
  MAR events, notes, acknowledgments, bed placements, co-signs, messages. It
  comes only from committed events.
- **Work item.** A unit of work on an actor's or role's worklist, with an
  `origin` (the exogenous event or committed event that created it) and a
  `readyAt` time. It replaces today's precomputed `Task`. Its `choices` (the
  clinical decisions) still come from the generator, keyed by origin, so they
  match across arms.
- **Coupling rule.** "When event E commits, create work item W for role R at
  time t + delay." This is simulation policy, not a spec rule; it is labeled
  as such and versioned (`couplingVersion`).

## 5. Design

### 5.1 Split the world generator into demand and coupling

`world/src/flows/*` currently decides both what happens and who does it. It is
split in two:

1. **Demand** (keep in the generator): arrivals, bookings, condition and result
   draws, the clinical `choices` for each work item. The output per day is an
   exogenous event stream plus a choice table keyed by origin. No orders, MAR
   rows or admissions are written ahead of time.
2. **Coupling** (moves into the simulator): the rules that turn commits into
   downstream work. The first set reproduces what the generator already
   implies:

| Trigger (committed event) | Downstream work item | Delay source |
|---|---|---|
| ED arrival (exogenous) | P2 W3 encounter | arrival time |
| P2 admit decision + ADT bed assignment | ward admission; P3 census entry | bed availability (ADT reducer) |
| P2 / P5 / P1 signs an inpatient MedicationRequest | P3 W4 occurrences at the pass times (`PASS_CLOCKS`, `dueClocks`) | MAR schedule |
| PRN dose given | P3 reassessment item | 30–60 min (current generator value) |
| Lab ordered | result resource at `t + TAT`; critical result → urgent alert to the ordering provider, escalating after 30 min | TAT table (simulation assumption) |
| P4 (NP) signs an order that needs an attending | attending co-sign item | queue |
| P5 signs pre-op orders | pre-op RN / anesthesia items; OR case | case schedule |
| Portal message / refill request (exogenous) | P1 W2 / W7 in-basket | arrival time |

The world's day-to-day state transition (census, carry-over) reads the
**previous day's committed state**, not the generator's plan. Day *d* then
depends on what the actors actually did on day *d-1*. That is the point, and
also the main measurement change (section 6).

### 5.2 Shared state through the commit reducers

The simulator keeps an in-memory per-patient event log with the same contract
as the `commit_events` table: per-patient stream versions, events applied
atomically, expected-version writes. Every actor commit runs the same Lean
functions the service runs:

- `Commit.check` against the patient's current collection, at the version the
  session read;
- `Commit.Mar.commit` for W4, consuming doses through `Multi.step`;
- the ADT reducer for beds;
- the co-sign consent check, with a separate authenticated actor.

A session pins the patient version it opened at. If another actor committed
in the meantime, the commit is rejected as stale, exactly as the service
rejects a failed `If-Match`. The actor's policy then refreshes and retries,
and **that effort is counted**. This is how contention becomes measurable.

The `Facts` for a session are projected from the current state (the same
projection `ehr serve` uses), not taken from frozen fixtures. Fixture bundles
remain the day-0 population.

After every commit, the run checks `Multi.Invariant` (dose-once, bed
uniqueness). It is proved, so a violation means a simulator bug, and the run
stops.

### 5.3 Steppable actors

`Policy.playLoop` plays a whole episode to completion inside one function.
It becomes a resumable actor:

```
Actor.next : ActorState → Facts → (Event × DurationMs × ActorState) ⊕ Done ⊕ Blocked
```

Each call returns one UI event and its KLM duration, completion, or "blocked
waiting for X" (a co-sign, a result). The existing per-task seeded RNG
(`taskSeed seed task.id`) is keyed by the work item's origin, so the same
work draws the same choices and lapses in every arm.

**Regression bar for this refactor:** with one actor, no coupling, and
work items equal to today's tasks at their `startMin`, the new loop must give
a **byte-identical `DayResult`** to today's `ehr simulate` for all 50
persona-days of world 2 (`lean/Ehr/Sim/cli_smoke.py`). This shows the refactor
changed nothing before the model changes on purpose.

### 5.4 Scheduler

A discrete-event loop in Lean, `ehr world-sim`, runs one hospital day in
**one process**:

- A priority queue of `(time, actorId, seq)`. Ties break by actor ID, then
  sequence, so the order is total and deterministic.
- Each actor is idle, working (a session on one work item), blocked or off
  shift (`SHIFTS`). An idle actor takes the next ready item from its worklist
  by a persona-level priority rule (urgent alerts first, then due time).
  Current behavior is the special case "next item by `startMin`".
- A UI event advances that actor's clock by its KLM duration. Commits apply
  at the event's timestamp.
- **Interruptions:** urgent alerts, pages and co-sign requests addressed to a
  busy actor preempt at the next goal action (the current insertion rule). The
  cost of resuming is the existing interruption cost. The random count stays
  only as a residual exogenous term (phone calls, colleagues), and is reported
  separately.
- At shift end, unfinished items carry over as handoff to the next shift's
  actor, or to the next day.

Why Lean and not a TypeScript orchestrator: the loop calls `Actor.next`,
`Commit.check` and the reducers thousands of times per day. Doing this in one
process avoids starting the 128 MB binary per call and keeps the "no TS copy
of the logic" rule easy to audit. The scheduler is not clinical logic, but
keeping it next to the reducers makes the whole day one pure function:
`(seed, demand, coupling, actors, programs) → event log`.

Expected cost: today one persona-day takes about 4 s. A five-role day with
~150 work items plus commit checks should take tens of seconds in one
process. This is an estimate; it is measured in phase 1.

### 5.5 Outputs

- `days/day-NN/world.events.jsonl`: the merged, ordered event log (UI events
  and commits, with actor, patient, versions read and written, and origin).
- `days/day-NN/<actorId>.json`: a `DayResult` per actor, the same schema as
  today, plus `queueWaitMin`, `staleRetries`, `blockedMin` and
  `carriedOver`.
- `days/day-NN/system.json`: system metrics (section 6.3).
- A fingerprint of the log (hash) per day for replay and resume, added to
  `fingerprints.ts`.

The dashboard's Trajectories view gets a swim-lane mode: actors on one shared
timeline, with commit arrows between lanes. This can come later; the log
already holds everything it needs.

## 6. Measurement (owner decision needed)

### 6.1 Why the current comparison stops working

Today the agent and control arms play the **same fixed task list**, so savings
are per-task and paired. In a shared world the work depends on behavior: a
faster ED physician admits earlier, which changes the RN's day. The two arms
no longer have identical schedules.

### 6.2 Proposed arms

Exogenous demand and the choice table are shared across all arms. Endogenous
randomness is keyed by origin, not by order, so the arms stay aligned as far
as causality allows.

| Arm | Programs | Answers |
|---|---|---|
| **Control world** | every actor on its v0 (canonical + role view), with the same vendor releases | baseline |
| **Agent world** | every actor on its persona's latest certified revision | headline system effect |
| **One-at-a-time** (×5) | only persona X on its revision, everyone else on v0 | how much of the effect belongs to persona X |

That is 7 world-days per measurement day, which the estimate in 5.4 suggests
takes minutes, not hours. The headline becomes the agent-world vs
control-world difference. Per-persona attribution comes from the
one-at-a-time worlds. The difference between the agent world and the sum of
the one-at-a-time effects is reported as **interaction** (positive or
negative), which is something the current design can't measure at all.

### 6.3 Metrics

Per actor, unchanged: clicks, keystrokes, scrolls, scroll px, mouse travel,
KLM time, alert load. Computed only on **matched work items** (same origin in
both arms, completed in both). Unmatched items are counted and reported, as
the 11 excluded task-days are today.

New system metrics (shared world only):

- order-sign → first dose given (median, p90); doses given outside their
  timing window;
- critical result → acknowledgment; escalations;
- NP sign → attending co-sign latency;
- stale-commit retries and their effort;
- queue wait, blocked time, work carried over at shift end, overtime minutes.

Medication timing and critical-result acknowledgment should be tied to cited
sources:
- CMS timely-administration guidance: time-critical doses within 30 minutes
  of schedule; other doses within the hospital's policy window.
- Joint Commission NPSG.02.03.01 for critical results.
- The critical-result bound already proved in `Multi/Critical.lean` (under
  fair minute service). The shared world would be its first simulated
  workload.

These citations need to be checked when this is built.

### 6.4 Calibration and blind days

The odd/even split stays: odd days for calibration, even days for blind
measurement. Two parts have to change:

- **Validation holdout.** Today it is every third task of the latest odd day.
  Tasks are no longer fixed, so the proposal is to hold out by **origin**:
  every third exogenous origin (and all work it causes) is held out of
  prompts and scored only in aggregate. To validate a candidate, the night
  re-runs that odd day as a one-at-a-time world with the candidate in place.
- **Train estimate.** `TrainEstimator` re-runs the last 2 training days as
  one-at-a-time worlds (candidate vs current) instead of single-persona
  simulations.

Both keep the current integrity rule: prompts see only training-side data,
and the holdout returns aggregates only.

## 7. Agent loop changes

- The night's observation step reads that persona's actors' traces from the
  shared log. Prompts get per-actor summaries plus the system metrics for
  work the persona touched (for example "doses you ordered were given 40 min
  later on average"). Whether prompts may see the system metrics is a
  question for the owner (section 9).
- Certification, the screen check, `ehr deploy` and the no-agent release
  migration are unchanged; they work on single programs.
- The nightly unit can stay per persona, or move to department × role
  (decided 2026-11-02). The shared world supports either, because the actor
  table maps many actors to one program.

## 8. Phases

Each phase passes three gates before the next starts: (a) the same seed gives
the same log hash, (b) no invariant violations, (c) the phase-0 regression
still passes in single-actor mode.

| Phase | Scope | Done when |
|---|---|---|
| 0 | Steppable `Actor.next`; `ehr world-sim` in single-actor mode with fixed work items | byte-identical `DayResult` for all 50 world-2 persona-days |
| 1 | Shared in-memory event log through `Commit.check` / `Commit.Mar.commit` / ADT. One coupling: inpatient orders signed by P2/P5 create P3 W4 occurrences. Two RNs on 4 West. Real queueing. | W4 work comes only from simulated orders; stale retries and late doses reported; timing measured |
| 2 | Results and critical-result loop, NP→attending co-sign queue, sourced interruptions | escalations and co-sign latency in `system.json` |
| 3 | All seven workflows on coupling rules; demand/choice split in `world/src`; the seven arms | a 10-day five-persona run, agent vs control world, with attribution |
| 4 | Agent loop on the shared world (observation, origin holdout, train estimate); swim-lane dashboard | one full run with the agent in the loop |

Phases 0–1 are mostly Lean, with a small part in `world/src`. Phase 3 is
mostly `world/src`. Phases 2 and 4 are mixed.

## 9. Open questions for the owner

1. **Headline metric.** Is agent-world vs control-world (system level) the
   headline, with per-persona attribution second? Or does the per-persona,
   per-task number stay the headline?
2. **Holdout by origin** (6.4) in place of every third task. OK?
3. **Coupling assumptions** (lab turnaround, pharmacy verification delay,
   paging rules) are simulation policy. Should they be labeled the same way
   as "hospital policy (not law)", or sourced like the alert-urgency list?
4. **Prompt visibility.** May the nightly agent see system metrics, such as
   downstream delays caused by its persona's work? It is useful signal, but
   it widens what the designer optimizes.
5. **Old runs.** Keep `core-10day-live` as the historical single-session
   result, and report shared-world runs separately with a new protocol name?
   The proposal is yes; the old numbers are not comparable.
6. **Staffing.** How many actors per role for the first unit (proposal: 2 RNs,
   1 ED physician, 1 surgeon, 1 PCP, 1 NP, 1 attending co-signer)?

## 10. Not covered: making runs faster

Simulation is a small share of run time, so this design doesn't address speed.
The wins are in the agent loop, as separate work:

- reuse one long-running `ehr serve` process instead of starting the binary
  for every check, simulation and render;
- cache screen-check and geometry results by the hash of the components that
  changed;
- pre-screen candidates cheaply before full checks;
- lower reasoning effort for `choose`.
