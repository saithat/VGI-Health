# Handoff: sim lane

Worktree `/home/saithat/Projects/VGI-sim`, branch `lane/sim`.

## Integrated snapshot

Initially merged main `fe475fa` in `f3a4d4d`. Main advanced during validation;
merged again at `b26f772` in `bfaa352` and pushed it. The final verification below
uses that pinned revision, including its app inventory fix and semantic renderer.
`fbe18d0` fixes history proofs for the five new Core feature groups;
`9ee5345` adopts those contracts in Goals/Policy; `f82f846` adds independent
native validation workers (`--jobs`, serial by default). `85c04e8` records the
first verified checkpoint. `54489d4` fixes the exact-slot clinical dependency
edge case: an any-slot entry is fulfilled by the condition's exact binding,
so a different visible field cannot leave its predicate unknown. Every commit
has the required Codex co-author line.
Local edits are limited to sim-owned files, this handoff and the permitted
change-request document; main merges bring their owners' changes.

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
- `FeatureTests.lean` adds 52 executable checks covering completing/rejected
  cases across all five groups, current/stale/missing sources, real predicate
  inputs, valid prefills, relational ordering, conditional time obligations,
  interruption expiry, exact-slot predicate captures and certified temporal
  minimum search.

T9's original single/joint contracts and real-interpreter replay remain intact.
Exactness is within the reported full, goalDirected or navigationDirected
space, per joint task. Search time stays fixed; there is no global/day-wide
optimality or missing-external-event scheduling claim. See `lean/Ehr/Sim/README.md`.

## Verification

- Full `cd lean && lake build`: passes, 189 jobs.
- `lake check`: passes; only propext, Quot.sound, Classical.choice.
- `lake comparator`: passes all 18 trusted core statements.
- `python3 lean/Ehr/Sim/verify_proofs.py`: passes the explicit single/joint T9
  contracts. Proof holes occur only in Comparator reference challenges.
- Fresh native ten-day sweep with `--jobs 10 --timeout-seconds 240`:
  50 schedules, all 1284 tasks retained, 1271 complete. Exactly the same 13 baseline service tasks remain
  incomplete. Zero violations across all eight floor metrics for completed
  tasks; zero interruption-retention violations. All five day-one replays are
  byte-identical at seed 123 and match the serial reports, including complaints.
  All 50 reports also match the earlier full sweep exactly. The report pins the
  actual merged-main commit; it never uses the moving origin/main reference.
  Compact results and refreshed minimum examples: `lean/Ehr/Sim/validation.json`.
  Reproduce: `python3 lean/Ehr/Sim/cli_smoke.py --days 10 --jobs 10 --timeout-seconds 240 --report /tmp/sim.json`.
  `09008cb` adds the optional per-process wall budget (serial default stays
  120 seconds). Twenty workers exceeded that budget on a busy RN schedule;
  the final ten-worker run passed with an explicit 240-second process budget.
  Clinical clocks, deadlines, goals and validation checks were unchanged.
  Workers never invoke Lake or write the shared report. `--require-complete`
  remains an intentional failure until the 13 baseline service scenarios work.
- World build/lint/tests pass (92 tests); agent typecheck/lint/tests pass (31).
- App build/lint and all 129 tests pass after the second main merge, including
  inventory, real-WASM rendering and the new semantic painter. The app owner's
  16-to-24 inventory fix is integrated; this handoff item is resolved.
- Fresh native minimum examples: day-one P1 W1-001 is 44 clicks / 223 keys;
  P3 W4-001 is 38 / 104 over two receipt-carry episodes. Both report certified
  navigationDirected exactness for each objective.
- Fresh unchanged-renewal CLI minimum `d01-P1-W7-022` still fails safely with
  no completion, reproducing the owner integration request below.

## Exactly what remains

1. **The original 13 baseline service scenarios remain incomplete:** v1 still
   lacks orderKind/orderCode declarations and composers. Content/world must provide the applicable UI or
   align release timing while retaining all requested service work. Optional
   declarations/composers exist in v1.1/v2; sim retains the unmet goals.
2. **CLI owner integration:** in `lean/Ehr/Cli/Sim.lean:minSchedule`, replace
   `let eps := episodes facts task.workflow task.choices` with
   `let eps := taskEpisodes facts task`. It is already imported through Policy.
   Persona simulation uses focused request context; minimum search still needs
   this adoption for unchanged renewals whose choices.orders is empty.

The app inventory item from the original handoff is resolved by main `b26f772`.
The two remaining owning-lane changes are requested in `docs/design/changes-requests.md`,
including the section "Sim revalidation after five-feature Core merge".
Production rule/FHIR-source adoption for the new language remains under Core's
existing owning-lane requests; sim's typed Facts path and all five feature
fixtures are integrated. No production spec or safety rule was changed here.

No unfinished simulator proofs remain. Do not call the project all-green while
the owning-lane items above remain.
