# Coverage of the deployed runtime

The deployed WASM `ehr_step` export and native `ehr serve` step operation call
`Ehr.runStep`, not `Ehr.step` directly. The existing headline theorems and twelve
`Ehr.Check.accepted_*` theorems remain correct for `step`, `init`, `view` and
`Props.Reachable`. They do not establish all their runtime analogues.

All definitions and statements in the nine `Ehr.Proofs.Runtime*` modules are
**new specifications for owner review**, outside Comparator. No existing
property, theorem statement or Comparator catalog was changed. The modules are
imported by the default `Ehr` library. Each theorem has a `#print axioms`
command; only `propext`, `Classical.choice` and `Quot.sound` are used (some
proofs use fewer).

On 2026-11-10 the owner approved two repairs to the critical-result handler,
and both are applied: its action text is kept in dedicated state instead of
`State.captured`, and it is refused while an alert popup is open. `State` gained
one optional field, `criticalDrafts?`; this is a **specification-surface change
for owner review**. The three handler counterexamples of the first version of
this note are gone and are replaced by the theorems below.

## What the wrappers do

For ordinary programs (`Workspace.enabled = false`), `runInit` calls `init`.
`runStep` first offers each human event to `CriticalRuntime.handle`. The
handler matches a text entry into `critical.action:<result id>` and a click on
`critical.receive:`, `critical.resolve:` or `critical.escalate:<result id>`,
for a result in the current ticket list. A matched text entry stores the text
in `State.criticalDrafts?` (one draft per result ID); a matched click updates
`State.criticalResults?`, and resolve reads the draft. No handled event touches
`captured`, `commits`, `acked`, `receipts`, `popup?` or `screen`
(`Ehr.Runtime.critical_frame`). While an alert popup is open, every matched
event returns the unchanged state and `blocked "popup: acknowledge the alert
first"`, the interpreter's own message (`Ehr.Runtime.critical_popup`). The
handler checks the responsible/covering user ID, not the role
(`Ehr.Runtime.Witness.role_not_checked`). Unmatched events call `step` with
actor `.human`. Internal macros still run through the unchanged interpreter.

`State.criticalDrafts?` is absent from JSON when there is no draft, so states
without drafts serialize exactly as before and earlier serialized states decode
unchanged (`Ehr.Render.UrgencyTests`). The rendered action field keeps its
component ID and reads the draft.

For programs with `patientSelection? = some true`, `runInit` returns an empty,
unselected workspace. The handler is offered an event only when the incoming
state is already bound to the supplied source patient's facts. Otherwise, or if
the handler declines, `Workspace.step` first calls `Workspace.bind`: successful
hydration creates a fresh `init`, navigates to the selected clinical destination,
restores the workspace clock and attaches the patient context. Workspace search
and list/patient navigation are then handled outside `step`; clinical events
require a bound patient. Opening a patient or returning to a list clears patient
captures, receipts, acknowledgments, commits and popup state. A bound clinical
popup blocks workspace navigation, and the critical handler is refused under it
(`Ehr.Runtime.popup_blocks`).

`Ehr.Runtime.inputState` names the exact state that the inner interpreter sees:
the incoming state for ordinary programs, `Workspace.bind` for selection-enabled
programs. Already-bound inputs are unchanged by binding (`bind_of_bound`). The
runtime commit theorems use newness relative to the original API input and prove
requirements at `inputState`. They do **not** claim the host painted that hydrated
state before the event. `A2_popup_holds` likewise uses popup newness relative to
the API input and proves the firing key at the effective input.

The common proof is `Ehr.Runtime.step_shape`: the output is the inner `step`
state, preserves its commit/acknowledgment/receipt/popup evidence, or clears that
evidence. `critical_evidence`, `workspace_shape` and `bind_evidence` isolate the
wrapper cases. Binding may **load host-supplied prior receipts**; saying that
wrappers never add receipts without this qualification would be false.
`receipt_origin` accounts for existing receipts, facts receipts and core actions.
The evidence projection deliberately excludes captures: workspace navigation
clears them.

## Transition systems and facts

`Ehr.Runtime.Reachable sp p u` starts at `runInit` with any facts and closes under
human `runStep` calls with independently supplied facts and clock increments.
The spec, program and user stay fixed. Facts are call inputs, not a permanent
field of the clinical state. This permits the host to select a patient and load
that patient's facts on the next call, and permits record/directory updates.
It deliberately overapproximates host behavior: it does not prove authentication,
fact provenance, a host loading protocol, or continuity of record versions.
`Workspace.bound` still controls which loaded source identity can operate a chart.
No clinical meaning is assigned to an unselected workspace as if it were a chart.

`Ehr.Runtime.FixedReachable ep` uses the same human API and waiting transitions
but fixes the episode's facts. It covers ordinary programs with fixed facts,
and also workspace runs with an unchanged directory/record.
`fixed_reachable` includes every such run in the host-driven model. Witnesses
below use this stronger fixed-facts setting, so changing host facts is not needed
to produce the failures. The passive-alert landing witness starts at its own
`runInit`; the selected workspace witnesses actually open and hydrate a patient.

For runtime analogues, replace the old reachability/transition/view operations
with these runtime operations. A *global* analogue retains the original
retention clauses across workspace navigation; it does not silently restrict
them to a bound patient episode. Commit theorems explicitly say **effective
input** when they use `inputState`. Static predicates keep their exact original
definitions. In particular `NavigationSane` is a static renderer-tree predicate;
it does not assert navigation liveness through the workspace.

## Ordinary programs and the refinement

An *ordinary* program has no patient selection (`Workspace.enabled = false`).
For it, `runInit` is `init`, `runView` is `view` (`Ehr.Runtime.runView_ordinary`)
and the interpreter sees the API state itself (`Ehr.Runtime.inputState_ordinary`).
The only difference from the core is the critical-result handler, which now
writes two fields that nothing else reads.

`Ehr.Runtime.withCritical s c d` replaces `criticalResults?` and
`criticalDrafts?`; `forgetCritical` clears them. `Ehr.Proofs.RuntimeBlind` and
`Ehr.Proofs.RuntimeBlindStep` prove that the guard, alert keys, layout
visibility, the interpreter step and the view do not read these fields
(`Ehr.Runtime.commitGuard_critical`, `alertKeys_critical`, `step_critical`,
`view_critical`), with the technique `Ehr.Sim.History` uses for Back history.
The alert condition `criticalResult` reads the ticket list in the *facts*, not
the state.

- `Ehr.Runtime.ordinary_step`: each API call is, up to the two critical
  fields, either no step (a handled critical-result event) or the core human step.
- `Ehr.Runtime.ordinary_refines`: for fixed facts, forgetting the critical
  fields of any `FixedReachable` state gives a `Props.Reachable` state.
  `ordinary_agrees` states the same as agreement on every other field.
- `Ehr.Runtime.ordinary_always` and `ordinary_everyStep` transfer any core
  state invariant or human-step property that does not read the critical fields.

`Ehr.Proofs.RuntimeOrdinary` applies these to each reachable-state and per-step
clause of the accepted properties. Every `Fixed…` definition repeats the body
of the `Props` definition of the same name with `FixedReachable` for
`Props.Reachable` and the API's returned state for `Episode.next`. Each
`ordinary_…` theorem has the core property as its only premise besides
ordinariness. For eleven of the fourteen clauses the core property is passed to
the transfer as it is, so the kernel checks that the two bodies agree.
`FixedEnteredOnce`, `FixedHumanStepsByHuman` and `FixedOnlyHumanCommitsAndAcks`
also drop the `actor = .human` parts, because every API event is human.
`Ehr.Runtime.accepted_ordinary` bundles the fourteen clauses for a
checker-accepted ordinary program, any facts and any user of the program's
role. Scope: fixed facts and no patient selection. It says nothing about facts
the host replaces between calls.

## Guarantee inventory

The first theorem name in each cell is fully qualified; subsequent unqualified
names in that cell share its namespace. “Ordinary” means an ordinary program
with fixed facts, as above. “Open” means no full runtime theorem or
counterexample is supplied for that case; partial results are identified rather
than substituted for the original property.

| Guarantee | Runtime status and exact Lean evidence |
|---|---|
| T0 commit needs guard | **Proved**, every call, at effective input: `Ehr.Runtime.T0_commit_needs_guard`. |
| T0 entry values | **Proved**, at effective input, including allowed values: `Ehr.Runtime.T0_entry_values`; all entry requirements including per-line requirements: `Ehr.Runtime.commit_entries`. |
| T3 distinct cosign | **Proved**, at effective input: `Ehr.Runtime.T3_cosign_distinct`. |
| T2 hidden review receipts/waivers | **Proved**, at effective input: `Ehr.Runtime.T2_receipts_sound`. |
| T2 shown-on-commit without waiver | **Proved**, at effective input: `Ehr.Runtime.T2_shownOnCommit_shown`. |
| A2 newly opened popup | **Proved**, firing key and prior nonacknowledgment at effective input: `Ehr.Runtime.A2_popup_holds`. Persistent key truth is property 10 below. |
| A2 shown alert in runtime view | **Proved**, current state/facts: `Ehr.Runtime.A2_view_shown`. |
| A4 one step | **Proved**, every call: `Ehr.Runtime.A4_step`. |
| A4 every run | **Proved**, all host-driven reachable states, including waiting: `Ehr.Runtime.A4_run`. |
| Wrappers never add a commit | **Proved**: `Ehr.Runtime.input_commits`, `Ehr.Runtime.new_commit_core`, `Ehr.Runtime.commit_core`. |
| Wrappers never add an acknowledgment | **Proved**: `Ehr.Runtime.input_acks`, `Ehr.Runtime.new_ack_core`, `Ehr.Runtime.ack_origin`. Clearing remains possible. |
| Wrappers never manufacture a receipt | **Proved**, allowing receipts loaded from facts: `Ehr.Runtime.input_receipts`, `Ehr.Runtime.new_receipt_core`, `Ehr.Runtime.receipt_origin`. |
| Critical handler changes only critical workflow state | **Proved**, every call: `Ehr.Runtime.critical_frame` (all fields except `criticalResults?` and `criticalDrafts?` are kept), `critical_evidence`. |
| Popup blocks every nonacknowledgment event | **Proved**. Every program, popup open at effective input: `Ehr.Runtime.popup_blocks` keeps `captured`, `commits`, `acked`, `receipts` and `popup?`; a workspace lookup query may still change the patient-selection context (`workspace_popup_blocks`). Ordinary programs: `popup_blocks_ordinary` returns the same state and the interpreter's popup refusal. Handler alone: `critical_popup`. Regression on the former counterexample: `Ehr.Runtime.Witness.popup_blocks_action`. |
| 1 — `accepted_wellFormed` | **Proved** for ordinary programs: `Ehr.Runtime.ordinary_landmarksShown`. **Refuted** for the global runtime-view landmark clause with patient selection: `Ehr.Runtime.Witness.landing_has_no_landmark`, `workspace_accepted`. Initial reachability follows by `FixedReachable.start`. Static catalog/ID/reference/depth clauses are retained by `Ehr.Runtime.accepted_static`; no negative claim about bound-chart landmarks is made. |
| 2 — `accepted_capturesAllOnce` | **Proved** for ordinary programs: `Ehr.Runtime.ordinary_commitCapturesAll`, `ordinary_enteredOnce`. **Refuted** globally with patient selection: `Ehr.Runtime.Witness.return_loses_capture`, `acknowledged_reachable`, `workspace_accepted`. Workspace return is a non-entry, non-macro click that discards a confirmed capture. Commit entry obligations at effective input are proved by `Ehr.Runtime.commit_entries`; linked-prefill structure is retained by `Ehr.Runtime.accepted_static`. |
| 3 — `accepted_writesOnly` / `WritesAllowed` | **Proved** for ordinary programs: `Ehr.Runtime.ordinary_writesAllowed` (in `accepted_ordinary`). Regressions on the former counterexample: `Ehr.Runtime.Witness.action_is_draft`, `writes_allowed`. **Open** with patient selection. Declared field/button structure is retained by `Ehr.Runtime.accepted_static`. |
| 4 — `accepted_reviewsBeforeCommit` | **Proved** for ordinary programs: `Ehr.Runtime.ordinary_commitReviewsMet`, `ordinary_commitScreenShowsReviews`. **Open** with patient selection as the full analogue at the original API state, including its commit-screen view clause; `Ehr.Runtime.commit_reviews` and the runtime T2 theorems prove the commit obligations at effective input. No full runView pinning/hydration transfer is asserted. |
| 5 — `accepted_humanOnlyKept` | **Proved** for ordinary programs: `Ehr.Runtime.ordinary_humanStepsByHuman`, `ordinary_onlyHumanCommitsAndAcks`, `ordinary_cosignIsSecondUser`. **Refuted** globally with patient selection for the original acknowledgment-*change* clause: `Ehr.Runtime.Witness.return_loses_ack`, `acknowledged_reachable`, `workspace_accepted`. A click clears acknowledgments, so a changed list need not mean an `ack` event. This does not exhibit an automated acknowledgment or a self-cosign; origins and cosigns remain proved above. Static automation prohibitions are retained by `Ehr.Runtime.accepted_static`. |
| 7 — `accepted_units` | **Proved** for ordinary programs: `Ehr.Runtime.ordinary_commitUnitsRight`. **Open** with patient selection as the full original-state analogue; `Ehr.Runtime.commit_units` proves the full whole-episode unit obligation at effective input, and static quantity-prefill restrictions are retained by `Ehr.Runtime.accepted_static`. Equality with the API's pre-hydration capture list is not proved. |
| 8 — `accepted_budgets` | **Proved unchanged, entirely static**: `Ehr.Check.accepted_budgets`, also included in `Ehr.Runtime.accepted_static`. No runtime-state argument is present. |
| 9 — `accepted_alertsFire` | **Proved** for ordinary programs: `Ehr.Runtime.ordinary_interruptiveHandled`, `ordinary_passiveShownInline`. **Refuted** for the global runtime-view passive-inline clause with patient selection: `Ehr.Runtime.Witness.landing_passive_not_shown`, `passive_landing_reachable`, `passive_accepted`. The unselected workspace view hides chart content while its underlying program screen is targeted. Interruptive handling at commits is proved at effective input by `Ehr.Runtime.commit_interruptive_handled`; no macro suppression is retained by `Ehr.Runtime.accepted_static`. |
| 10 — `accepted_noFalseAlarms` / `AlertsOnlyWhenTrue` | **Proved** for ordinary programs: `Ehr.Runtime.ordinary_alertsOnlyWhenTrue` (in `accepted_ordinary`). Regressions on the former counterexample: `Ehr.Runtime.ClinicalWitness.blocked_under_popup`, `clinical_unchanged`, `alerts_only_when_true`. **Open** with patient selection. Shown inline alerts satisfy `Ehr.Runtime.A2_view_shown` for every program; static popup declarations remain covered by `Ehr.Runtime.accepted_static`. |
| 11 — `accepted_noRepeatInterruptions` | **Proved** for ordinary programs: `Ehr.Runtime.ordinary_interruptsOnce`. **Refuted** globally with patient selection for acknowledgment persistence: `Ehr.Runtime.Witness.return_loses_ack`, `acknowledged_reachable`, `workspace_accepted`. The static single-popup-request predicate remains covered by `Ehr.Runtime.accepted_static`. This witness does not assert repeated interruptions within one bound episode. |
| 12 — `accepted_severityTiers` | **Proved**, the entire property with runtime reachability: `Ehr.Runtime.accepted_severityTiers`. |
| 13 — `accepted_navigation` | **Proved unchanged, entirely static**: `Ehr.Check.accepted_navigation`, also included in `Ehr.Runtime.accepted_static`. Workspace navigation behavior is a separate question. |

In summary, of the twelve accepted properties: three (8, 12, 13) carry over to
`runStep` for every program; the other nine are proved for ordinary programs
with fixed facts. With patient selection, five of those nine (1, 2, 5, 9, 11)
have kernel-checked counterexamples from workspace navigation, and four (3, 4,
7, 10) are open.

Property 6 (completion) is not one of the twelve accepted properties and is not
extended here. Existing `runMacro`/T6 helper theorems retain their original
statements and proofs; no new blanket claim about all wrapper behavior is made.

## Former handler counterexamples, now regressions

The first version of this note refuted three guarantees with the handler. The
same accepted programs and events are kept as regressions.

The ordinary care-gap witness opens a real popup by clicking the scalar layout's
shown alert. Entering `critical.action:k1` with text `called ICU` used to return
`ok` and add a confirmed human capture for an element absent from the spec.
`Ehr.Runtime.Witness.popup_blocks_action` now shows the API and the core give
the same refusal and state. After the acknowledgment,
`Ehr.Runtime.Witness.action_is_draft` shows the entry returns `ok`, stores the
draft, leaves `captured` unchanged, and every capture is for a spec element.
`Ehr.Runtime.Witness.writes_allowed` instantiates the general theorem for this
program.

The clinical witness declares a coded spec element named `critical.action:k1`
and enters code `ready` through an ordinary field. A `.clinical (.capturedCode …)`
alert opens for a known-true key. The handler used to replace that capture with
text, making the predicate unknown while the popup kept its old key.
`Ehr.Runtime.ClinicalWitness.blocked_under_popup` now shows the entry is refused
with the state unchanged. `clinical_unchanged` shows that after the
acknowledgment the entry stores a draft, the declared capture is not
overwritten and the predicate stays known true. `alerts_only_when_true`
instantiates the general theorem.

The earlier conditional fragment remains: `Ehr.Runtime.fixed_refines_core` proves
*exact* refinement for ordinary fixed-facts runs if every reachable event
declines the critical handler, and `Ehr.Runtime.fixed_invariant` transfers any
core state invariant under that premise. `ordinary_refines` needs no premise
and holds up to the two critical fields.

## Remaining boundary: patient selection

Workspace reset and hydration need an explicit episode boundary. No
unconditional bound-patient refinement is claimed. The remaining original-state
transfers for properties 3, 4, 7 and 10 with patient selection need
field-specific proofs through hydration and review visibility, rather than an
appeal to state equality. The five workspace counterexamples are unchanged;
they are a separate owner decision.

## Proposed changes for the owner

The first two items below were approved and applied on 2026-11-10. The rest are
proposals, not applied changes. Episode scope changes require explicit review
of the new specifications; they are not behavior repairs.

- **Applied: action text out of `captured`.** Critical-result action text is
  stored in `State.criticalDrafts?`. This also prevents the handler from
  overwriting a declared coded capture with text.
- **Applied: handler refused under a popup.** Every matched handler event is
  refused while an alert popup is open.
- **Still proposed: reserve the critical endpoint names.** The handler matches
  component IDs `critical.action:`, `critical.receive:`, `critical.resolve:` and
  `critical.escalate:` followed by a current result ID, before the program sees
  the event. A program control with such an ID would be shadowed while that
  result exists. Nothing is written outside the rule set, but the checker does
  not reject such IDs.
- **Still proposed: role contract for the handler.** Authorization is by
  responsible/covering user ID only (`Ehr.Runtime.Witness.role_not_checked`).
  Specify whether a role check is wanted.
- **Capture retention and acknowledgment persistence:** preserve separate
  per-patient episode state on workspace navigation if retention across return
  is intended. Otherwise review an explicitly scoped per-bound-episode theorem;
  the current global properties cannot silently become that theorem. The
  acknowledgment-origin specification should distinguish additions from
  clearing a list (the old clause detects any change).
- **Unselected landmarks and passive inline alerts:** specify workspace landing
  landmarks and alert obligations separately from bound clinical charts. If
  the global clauses are desired unchanged, render their required content on
  the landing view too. Showing patient-specific alerts before selecting a
  patient needs a deliberate policy decision.
- **Live fact updates during a popup:** the fixed-facts theorems do not cover
  facts the host replaces while a popup is open. If that is allowed, specify
  how to revalidate or replace the popup key and its acknowledgment obligations.

For Comparator review, prioritize the runtime T0/T2/T3 statements,
`Ehr.Runtime.A2_popup_holds`, `Ehr.Runtime.A2_view_shown`,
`Ehr.Runtime.A4_step`, `Ehr.Runtime.A4_run`, the three evidence-origin statements
(`commit_core`, `ack_origin`, `receipt_origin`),
`Ehr.Runtime.accepted_severityTiers`, `Ehr.Runtime.popup_blocks`,
`Ehr.Runtime.ordinary_refines` and `Ehr.Runtime.accepted_ordinary`. The
transition definitions, `inputState`, `withCritical` and the `Fixed…`
definitions are part of their specification surface. Regressions,
counterexamples and the static/conditional helper bundle can remain separate
evidence. No catalog entries were added.

## Verification and artifact boundaries

Run from the repository root, with no concurrent lake process:

```sh
export TMPDIR=/home/saithat/Projects/run-tmp LEAN_NUM_THREADS=6
(cd lean && lake build)
bash scripts/audit-verification.sh
```

The default build includes every theorem and its axiom printout. The
verification audit checks the existing Comparator surface; it does not silently
add the runtime statements to its catalog. No `EhrHeavy`, WASM rebuild,
proof-map regeneration or app build is part of this lane. Lean source changes
leave packaged WASM/source bindings and proof-map freshness for the merge
session to refresh, so `node scripts/wasm-assets.mjs` and the proof-map
freshness check fail until then.

The new `State` field changes the generated `lean/generated/ehr-types.ts`
(one optional field on `State`; regenerated with `lake exe gents`). No file
under `app/` changed. The app build fingerprints that generated file as source
text, because `app/src/ehr/ui/types.ts` imports a value from it, so the
certified app hash changes at the next app build. The app was not built here.

On 2026-11-10, after the handler repair:

- The default build passed (579 jobs). All 925 axiom printouts in the build use
  only the permitted axioms. The nine `Runtime*` modules print 160 theorems:
  112 are new and 6 handler counterexamples were removed from the earlier 54.
- `audit-verification.sh` passed its existing 84-theorem catalog.
- `node conformance/index.mjs --canonical` against the native binary, with
  scenario expectations unchanged: 15 targets, 201 scenarios, 1584 passed,
  0 failed. `alert.passive.criticalResult` passed on its 9 applicable targets.
- The native binary before and after the change gives byte-identical output for
  every state without a draft in the receive/document/resolve flow, and for
  `ehr urgency-probes`. States with a draft differ only in `captured` and
  `criticalDrafts`.
- Not run: `wasm/test/urgency.mjs` (needs the WASM rebuild) and the browser
  audits. The three agent suites that call the native binary skip all 18 tests
  in a worktree without run data, so they give no evidence here.
