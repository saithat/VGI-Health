# Handoff: sim lane

Worktree `/home/saithat/Projects/VGI-sim`, branch `lane/sim`.

## Integrated snapshot

Merged current `origin/main` at `fe475fa` in `f3a4d4d` and pushed it.
`fbe18d0` fixes history proofs for the five new Core feature groups;
`9ee5345` adopts those contracts in Goals/Policy; `f82f846` adds independent
native validation workers (`--jobs`, serial by default). All commits have the required
Codex co-author trailer. Only sim-owned files, this handoff and the permitted
change-request document were edited.

`guardReason_history` is **true as stated**. `State.history` is only the Back
screen list. External event times, artifact versions, calendars, clinical
sources, durable clocks and payloads are fixed Facts inputs; captures and clock
are preserved by the quotient. The new recursive clinical/validation ASTs made
whole-guard reduction expensive and prevented several old rfl proofs from
closing. Explicit helper lemmas now prove invariance for those ASTs, temporal
and expiry statuses, value goals, payload contracts, alerts and the guard.
No theorem was weakened and no heartbeat limit was raised. Every named
simulator theorem is axiom-audited, including the new helpers.

## Simulator adoption

- Patient predicates use Core's three-valued clinical evaluation. Unknown/stale
  sources conservatively apply requirements. A scenario-supplied captured-code
  discriminator used by entries, reviews, time windows, expiry, displays or
  alerts becomes a real UI capture goal, even if it is otherwise optional.
- Unspecified constrained goals can choose allowed/default/declared-record,
  trusted terminology, bounded quantity and relational candidates; every
  candidate is checked by Core. Explicit conflicting choices remain goals and
  are reported. This remains a finite candidate policy, not a universal solver.
- Entry planning defers relational values until their sources are captured and
  can confirm valid prefills. Goal completion rechecks Core's current validator.
- Temporal and durable-clock failures report named missing/invalid/overdue
  obligations. KLM time and interruptions advance the actual interpreter clock
  before each action. Sim never creates external evidence or renews an order.
- Structured-display panels are navigation goals independently of ReviewReqs;
  neither receipts nor a visible placeholder bypasses Core's payload contract.
- `FeatureTests.lean` adds 48 executable checks covering completing/rejected
  cases across all five groups, current/stale/missing sources, real predicate
  inputs, valid prefills, relational ordering, conditional time obligations,
  interruption expiry and certified temporal minimum search.

T9's original single/joint contracts and real-interpreter replay remain intact.
Exactness is within the reported full, goalDirected or navigationDirected
space, per joint task. Search time stays fixed; there is no global/day-wide
optimality or missing-external-event scheduling claim. See `lean/Ehr/Sim/README.md`.

## Verification

- Full `cd lean && lake build`: passes, 179 jobs.
- `lake check`: passes; only propext, Quot.sound, Classical.choice.
- `lake comparator`: passes all 18 trusted core statements.
- `python3 lean/Ehr/Sim/verify_proofs.py`: passes the explicit single/joint T9
  contracts. Proof holes occur only in Comparator reference challenges.
- Fresh native ten-day sweep with `--jobs 5`: 50 schedules, all 1284 tasks
  retained, 1271 complete. Exactly the same 13 baseline service tasks remain
  incomplete. Zero violations across all eight floor metrics for completed
  tasks; zero interruption-retention violations. All five day-one replays are
  byte-identical at seed 123 and match the serial reports, including complaints.
  Compact results and refreshed minimum examples: `lean/Ehr/Sim/validation.json`.
  Reproduce: `python3 lean/Ehr/Sim/cli_smoke.py --days 10 --jobs 5 --report /tmp/sim.json`.
  Workers never invoke Lake or write the shared report. `--require-complete`
  remains an intentional failure until the 13 baseline service scenarios work.
- World build/lint/tests pass (92 tests); agent typecheck/lint/tests pass (31).
- App build/lint pass. Tests remain 89 passed / one failed: upstream inventory
  expects 16 bad programs while content supplies 24. Real-WASM rendering passes.
- Fresh native minimum examples: day-one P1 W1-001 is 44 clicks / 223 keys;
  P3 W4-001 is 38 / 104 over two receipt-carry episodes. Both report certified
  navigationDirected exactness for each objective.
- Fresh unchanged-renewal CLI minimum `d01-P1-W7-022` still fails safely with
  no completion, reproducing the owner integration request below.

## Exactly what remains

1. **The original 13 baseline service scenarios remain incomplete:** v1 still lacks orderKind/orderCode
   declarations and composers. Content/world must provide the applicable UI or
   align release timing while retaining all requested service work. Optional
   declarations/composers exist in v1.1/v2; sim retains the unmet goals.
2. **CLI owner integration:** in `lean/Ehr/Cli/Sim.lean:minSchedule`, replace
   `let eps := episodes facts task.workflow task.choices` with
   `let eps := taskEpisodes facts task`. It is already imported through Policy.
   Persona simulation uses focused request context; minimum search still needs
   this adoption for unchanged renewals whose choices.orders is empty.
3. **App owner inventory test:** update `app/tests/app.test.tsx:25` for the
   24 bad programs now supplied by content; retain the rendering assertions.

These owning-lane changes are requested in `docs/design/changes-requests.md`,
including the section "Sim revalidation after five-feature Core merge".
Production rule/FHIR-source adoption for the new language remains under Core's
existing owning-lane requests; sim's typed Facts path and all five feature
fixtures are integrated. No production spec or safety rule was changed here.

No unfinished simulator proofs remain. Do not call the project all-green while
the owning-lane items above remain.
