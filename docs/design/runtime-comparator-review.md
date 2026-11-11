# Runtime statements: Comparator review

Status: proposal for owner and engineer review, 2026-11-11. Nothing here is in
the Comparator catalog yet.

`make verify` runs Comparator on three configurations: `lean/comparator.json`
(18 theorems about `Ehr.step`, the core interpreter, stated in
`lean/Statements.lean`), `lean/Ehr/Check/comparator.json` (21, the checker) and
`lean/Ehr/Check/completion-comparator.json` (5). The app and
`ehr serve` call `Ehr.runStep`, which wraps `step` with the critical-result
handler and, for patient-selection programs, the workspace. The statements below
are the runtime counterparts, proved in `lean/Ehr/Proofs/Runtime*.lean`
(axioms: `propext`, `Classical.choice`, `Quot.sound`). The status of each
property is in [runtime coverage](../methods/runtime-coverage.md).

Review the definitions first. A statement is only as good as the definitions it
mentions, and a Comparator check confirms that the proof matches the
statement, not that the statement says what was intended.

## 1. Prerequisite: move definitions out of proof modules

A challenge module may import only trusted definitions; `Statements.lean`
imports `Ehr.Core.View` and `Ehr.Props.Defs`. The runtime statements need definitions that today live in
proof modules next to their proofs, and `runStep` lives in `Ehr/Api.lean`, which
also imports the JSON codecs (`Ehr.JsonCompat`). Before adding anything to the
catalog:

- Move `runInit`, `runStep`, `runView` into a module without JSON (for example
  `Ehr/Core/Runtime.lean`); `Ehr/Api.lean` imports it.
- Move the definitions in section 2 into a definitions-only module (for example
  `Ehr/Props/Runtime.lean`), leaving the theorems where they are.

Both moves preserve every proof. The second also gives the engineer one file to
read instead of six.

## 2. Definitions to review

Behaviour (trusted code, about 350 lines):

| Definition | Location | What to check |
|---|---|---|
| `runInit`, `runStep`, `runView` | `Ehr/Api.lean:17-34` | The order: the critical handler runs first (only on a bound state for workspace programs); otherwise `Workspace.step` or `step` with actor `.human`. |
| `CriticalRuntime.handle` | `Ehr/Core/CriticalRuntime.lean:39` | Matches four `critical.*:<result id>` component IDs for a current ticket; refuses under an open popup; writes only `criticalResults?` and `criticalDrafts?`. |
| `Workspace.enabled`, `bound`, `bind`, `step` | `Ehr/Core/Workspace.lean:24,129,135,148` | `bind` hydrates a fresh `init` for the selected patient, loads that patient's receipts from facts, and navigates to the destination screen. |
| `State.criticalDrafts?` | `Ehr/Core/Types.lean:941` | New field (2026-11-11), absent from JSON when `none`. A change to the specification surface. |

Specification (in `Ehr/Proofs/Runtime*.lean` until moved):

| Definition | Location | What to check |
|---|---|---|
| `Runtime.Reachable sp p u` | `RuntimeModel.lean:17` | Human API events with **any facts on every call**, plus clock advances. Over-approximates the host on purpose; it is used for the safety results (A4, severity tiers). |
| `Runtime.FixedReachable ep` | `RuntimeModel.lean:26` | The same with the episode's facts fixed. All ordinary-program results use this, so facts replaced by the host mid-run are not covered. |
| `inputState` | `RuntimeModel.lean:44` | The state the interpreter actually sees: `Workspace.bind …` for workspace programs, the API state otherwise. Commit theorems are stated **at this state**. |
| `evidence` | `RuntimeModel.lean:50` | `(commits, acked, receipts, popup?)`. Captures are deliberately excluded. A tuple read with `.2.2.1` projections; a structure like `Record` would read better. |
| `withCritical`, `forgetCritical` | `RuntimeModel.lean:66`, `RuntimeBlind.lean:12` | Replace or clear exactly the two critical fields. |
| `Record`, `record` | `RuntimeRefinement.lean:50,58` | The fields an open popup protects: captured, commits, acked, receipts, popup. |
| `next`, `FixedAlways`, `FixedEveryStep` | `RuntimeRefinement.lean:108,166,172` | Runtime analogues of `Episode.next`, `Props.Always`, `Props.EveryStep`, over human API calls. |
| Episode model: `BoundEpisode`, `start`, `Hydrates`, `workspaceEvent`, `Stays`, `InEpisode` | `RuntimeEpisode.lean:18-80` | One patient's chart from hydration until the clinician leaves or switches it, with fixed facts. `opened` is any unbound state from which hydration succeeds, not only a reachable one; hydration rebuilds the chart from a fresh `init`, so this makes the theorems stronger. The hydrated chart `start` is in the episode although it is never an API output, and the hydrating call is measured from it. Refused navigation events (under a popup) are also excluded. `unselected_not_inEpisode` rules out the landing view. |
| `ReachableFrom`, 14 `…From` forms | `RuntimeFrom.lean:21` | Core runs from an arbitrary start. Each `…From_start` equivalence (`XFrom ep ep.start ↔ Props.X ep`) is closed by a generic lemma, so the kernel checks the bodies agree. |
| `EpisodeAlways`, `EpisodeEveryStep`, 14 `Episode…` properties, `EpisodeAccepted` | `RuntimeEpisodeRefinement.lean:106,115`, `RuntimeEpisodeProps.lean:20-109` | Same bodies as the `Fixed…` forms with episode reachability; per-step clauses cover only non-navigation calls. `EpisodeHumanStepsByHuman`'s first clause is about the hydrated chart, not `runInit`. Bodies use `view`; `episode_runView` proves it equals `runView` in every episode state. |
| 14 `Fixed…` properties, `FixedAccepted` | `RuntimeOrdinary.lean:57-142` | Each repeats the `Props` body with `FixedReachable` and the API step. 11 are checked against the `Props` body by the kernel, because the proof passes the core property through unchanged. `FixedEnteredOnce`, `FixedHumanStepsByHuman`, `FixedOnlyHumanCommitsAndAcks` also drop `actor = .human` conjuncts, so compare those three by eye with `Props/Properties.lean:88,174,183`. |

## 3. Statements proposed for the catalog

All are in namespace `Ehr.Runtime`. Priority order:

1. **Runtime T0/T2/T3** (`Runtime.lean:22-74`): `T0_commit_needs_guard`,
   `T0_entry_values`, `T3_cosign_distinct`, `T2_receipts_sound`,
   `T2_shownOnCommit_shown`. A commit that is new relative to the API input
   satisfies the guard, entry, cosign and review obligations at `inputState`.
   They do not claim the host displayed the hydrated state before the event.
2. **A2/A4** (`Runtime.lean:105-196`): `A2_popup_holds` (a newly opened popup
   has a firing, unacknowledged key at the effective input), `A2_view_shown`
   (every shown alert in `runView` is true; an unbound workspace view shows
   nothing), `A4_step`, `A4_run` (no passive popup in any `Reachable` state,
   with no acceptance premise).
3. **Evidence origin**: `commit_core`, `ack_origin`, `receipt_origin`. The
   wrappers never add a commit or an acknowledgment; a receipt in the output was
   in the input, in the host's facts, or produced by `step`.
4. **`accepted_severityTiers`** (`RuntimeProperties.lean`): property 12 over
   `Reachable`, that is, any facts and every workspace state.
5. **`popup_blocks`** (`RuntimeRefinement.lean:83`): with a popup open at the
   effective input, a non-acknowledgment call leaves `record` unchanged, for
   every program.
6. **`ordinary_refines`** (`RuntimeRefinement.lean:142`): for an ordinary
   program with fixed facts, every API-reachable state with its critical fields
   cleared is `Props.Reachable`. It rests on four congruences proved for all
   inputs: `commitGuard_critical`, `alertKeys_critical`, `step_critical`,
   `view_critical`.
7. **`accepted_ordinary`** (`RuntimeOrdinary.lean:272`): checker acceptance
   implies `FixedAccepted` for an ordinary program, any facts, and any user of
   the program's role.
8. **`accepted_episode`** (`RuntimeEpisodeAccepted.lean:81`): checker
   acceptance implies `EpisodeAccepted` for a patient-selection program, any
   facts, any user of the program's role, and any pre-hydration state. It is
   proved directly, not through a refinement: `episode_not_core` shows episode
   states are never `Props.Reachable` (core runs have no patient context), and
   `Witness.start_history_not_core` shows the hydrated chart's Back history
   differs from every core run of the witness program. `episode_refines` gives
   the weaker refinement to core runs from the hydrated chart.

Not proposed: the concrete witnesses and regressions (`Runtime.Witness.*`,
`Runtime.ClinicalWitness.*`), the static bundle `accepted_static`, and the
conditional `fixed_refines_core`/`fixed_invariant`. They stay as kernel-checked
evidence outside the catalog.

## 4. Points that need a judgment

- **Effective input.** For workspace programs a commit's obligations are proved
  at the hydrated state, which the user may never have seen rendered. Decide
  whether that is the intended contract or whether the host must paint the
  hydrated state first.
- **Fixed facts.** Every ordinary-program property assumes the host does not
  replace facts between calls. Live updates while a popup is open are listed
  as an open proposal in the coverage note.
- **Stutter premise.** `ordinary_everyStep` requires the step property to hold
  when the state does not change (`hstutter`), because a handled critical event
  is a no-op once the critical fields are forgotten. It holds for every
  instantiation in `RuntimeOrdinary.lean`; check that this is the reading you
  want for the per-step properties.
- **Handler authorization** is by responsible/covering user ID, not role
  (`Runtime.Witness.role_not_checked`). The reserved `critical.*` component IDs
  are not rejected by the checker, so a program control with such an ID would be
  shadowed while that result exists.
- **Episode scope.** Reopening the same patient starts a new episode with no
  captures or acknowledgments, so an acknowledged interruptive alert interrupts
  again. Hydration jumps straight to the destination screen, skipping
  intermediate prefills. Both are current behaviour; the per-episode theorems
  describe it and do not endorse it.
- **Small handler items** (no proof depends on them): drafts are not cleared
  after a result is resolved; the `critical.escalate:` click always returns
  `blocked`, because `tickets` has already applied the time-driven `advance` and
  the rendered button is disabled. Escalation happens through time alone.

## 5. Procedure once approved

1. An agent lane does the two moves in section 1 (proofs unchanged) and adds a
   fourth configuration in the pattern of `Ehr/Check/comparator.json`: a
   challenge module with the approved statements and `sorry` bodies, a solution
   module importing the proofs, and a `comparator.json` listing their names.
   `Statements.lean` and the existing 44 entries stay untouched. The lane also
   adds the statements to `Audit.SpecSurface`, so the audit lists their
   dependency surface, and adds the config to `make verify`.
2. The engineer reviews the definitions module and the new challenge module,
   nothing else.
3. `make verify` and `bash scripts/audit-verification.sh` (its catalog, 84
   theorems today, grows by the new names).
