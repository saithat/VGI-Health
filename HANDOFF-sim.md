# Handoff: sim lane

Worktree `/home/saithat/Projects/VGI-sim`, branch `lane/sim`.

## Implemented

All implementation items from the previous handoff are present:

- Typed, spec-derived clinical goals; persona SplitMix64/FNV-1a streams;
  shortest-path navigation through the actual interpreter, including shared
  composers across workflow labels; hotkeys, confirmations, reviews, popups,
  scrolling, search, detours, fixed paired interruptions, fuel/retry bounds and
  complaints. W4 medication/assessment and W5 vaccine/note episodes are distinct.
- Pure trace effort metrics and a program-independent ideal floor. Optional
  legal waivers are not mandatory floor items. Final alert expectations use
  actual goal captures, not uncaptured proposed orders. Explicit pain and
  refill dose/reason choices are captured; unsupported values are complaints.
- Exact certificate-checked per-episode minimum clicks and keystrokes with
  separate paths. `full`, the handoff's `goalDirected` (all non-entry choices),
  and faster `navigationDirected` (BFS navigation) remain separate, selectable,
  explicitly reported spaces. Auto preflights large programs to the last space.
  No global optimum is claimed for restricted spaces. Multi-episode task
  counts are independent episode sums, labeled `exact:false` and
  `episodeExact:true`, with per-episode spaces/paths; joint episode/day
  optimization is not claimed. See `lean/Ehr/Sim/README.md` for the exact model.
- T9 for the public fallback function (`T9_minimum`) and real interpreter runs
  (`T9_minimum_real`), generic lower-bound/replay certificate theorem, history
  equivalence including macros, kernel-decided satisfiable and wrong-answer
  examples. All named simulator theorems are audited in Sim/Audit.lean.
  No unfinished simulator proofs, sorry, admits, new axioms or native_decide.
- Exact agent CLI flags: simulate uses spec/program/persona/schedule/world/seed;
  min-clicks uses spec/program/schedule/world and prints `{tasks:[...]}`.
  Version names resolve to releases/<ver>/spec.json. Legacy --task and --fhir
  aliases also work. Render's FHIR parser handles fixtures after Synthea fullUrl
  IDs are materialized and today's resources are merged without future leakage.
  Precomputed Facts are only a fallback. P1-P5 parameter files are committed.
- Regression guards for determinism, floor inequalities, canonical W1,
  redundant-prompt removal in simulation and search, scan zero weights,
  receipts, waivers, typed choices, shared composers and retained interruptions.
  `cli_smoke.py` exercises committed Synthea schedules and records incomplete
  tasks rather than silently dropping them.

Merged main, lean-core (typed choices and updated alert/prior-auth actions),
content releases/role projections, and the world lane's full typed Synthea run.
Earlier simulator milestones: 83879a1 (policy/metrics), a467aab (certificate/CLI),
9336093 (typed episodes/content), 6d29b3c (world integration).

## Verified so far

- `cd lean && lake build Ehr.Sim.Audit Ehr.Cli.Sim`: passes on current sources.
  All named simulator theorem axioms are only propext, Quot.sound, Classical.choice.
- Repository Comparator: passes its 18 existing trusted core statements.
- Independent kernel replay of exported T9 proofs: passed; rerun after any
  proof/type edits before declaring the final integration green.
- World build/lint/tests: 92 pass. Agent typecheck/lint/tests: 31 pass.
- App build/lint pass; dashboard fixture loading currently fails on missing
  `screenCheck`. The app owner's branch already contains that compatibility fix.
- Fresh native verification must rebuild *every transitive c.o*, not only
  Ehr.Cli.Sim:c.o. A prior standalone smoke binary linked stale dependencies;
  its reports are superseded. The fresh current binary completed 22/22 day-1
  ED tasks. A fresh ten-day sweep is in progress at
  `/tmp/vgi-sim-smoke/validation-current.json` (temporary artifact).

## Exactly what remains

1. Finish the fresh ten-day replay, record final floor/interruption/determinism
   results, and update this note with the final counts. The harness can run
   `--days 10 --report /tmp/sim.json`; `--require-complete` additionally rejects
   incomplete scenarios. No Lake process may overlap another Lake process.
2. Full `lake build`/`lake check` is blocked by six content release guards:
   current core correctly refuses a convenience request click for a never-policy
   priorAuthRequest, while those tests still expect the click to capture it.
   A concrete fix is prepared in `lean/Ehr/Sim/content-prior-auth.patch`: expose
   human fields, use human entry in positive tests, retain a negative click test,
   then regenerate content exports. **Not applied:** user ownership rules forbid
   editing content directly. An asynchronous user approval request is pending.
   Do not weaken the never policy or core guard. Details are in
   docs/design/changes-requests.md.
3. Resolve app mock `screenCheck` fixture compatibility through its owner branch
   or approved regeneration; rerun app tests. The same pending approval question
   covers regeneration. Do not silently edit app-owned files without approval.
4. Cross-lane scenario/model gaps are recorded in changes-requests.md:
   day-1 service orders predate v1.1's service fields (must stay incomplete under
   v1); refill interaction checking lacks explicit prescription-drug context in
   core/FHIR init. Shared W2/W3 composers are reachable after removing sim's own
   overly restrictive workflow filter, so those are no longer a completeness
   block. Preserve all clinical goals and report remaining unsupported work.

No remaining simulator theorem is unfinished. Full integration is not yet green;
keep these blockers visible instead of calling the whole task complete.
