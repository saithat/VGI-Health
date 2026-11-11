# Coverage of the deployed runtime

The deployed WASM `ehr_step` export and native `ehr serve` step operation call
`Ehr.runStep`, not `Ehr.step` directly. The existing headline theorems and twelve
`Ehr.Check.accepted_*` theorems remain correct for `step`, `init`, `view` and
`Props.Reachable`. They do not establish all their runtime analogues.

All definitions and statements in the twenty-four `Ehr.Proofs.Runtime*` modules
are **new specifications for owner review**, outside Comparator. No existing
property, theorem statement or Comparator catalog was changed. The modules are
imported by the default `Ehr` library. Each theorem has a `#print axioms`
command; only `propext`, `Classical.choice` and `Quot.sound` are used (some
proofs use fewer).

On 2026-11-11 the owner approved restating properties 1, 2, 5, 9 and 11 **per
bound patient episode**: clearing a patient's state when the clinician leaves
the chart is intended, so the properties are scoped to match. This is a
specification change. The per-episode forms, and the same forms of properties
3, 4, 7 and 10, are defined and proved in [Bound patient
episodes](#bound-patient-episodes).

Later on 2026-11-11 the owner decided four further points, and this note
describes the result. They are **behavior changes and new specifications for
owner review**:

1. Each patient's unsigned work is kept across workspace navigation
   ([Per-patient drafts](#per-patient-drafts)). `State` gained one optional
   field, `patientDrafts?`.
2. The call that hydrates a chart refuses a commit click and an
   acknowledgment ([The hydrating call](#the-hydrating-call)).
3. No patient data is shown before a patient is selected
   ([Unselected views](#unselected-views)), a new property.
4. Hydration by a direct `goTo` is accepted as it is; see
   [Refinement and its qualification](#refinement-and-its-qualification).

With the drafts, the earlier counterexamples `return_loses_capture` and
`return_loses_ack` no longer describe a loss. [Across workspace
navigation](#across-workspace-navigation) states what holds globally now.

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
restores the selected patient's stored draft, restores the workspace clock and
attaches the patient context. Workspace search and list/patient navigation are
then handled outside `step`; clinical events require a bound patient. Opening a
patient or returning to a list gives an empty workspace state: `captured`,
`receipts`, `acked`, `commits` and the popup are empty there. The captures and
acknowledgments of the chart being left are saved as that patient's draft
first; commits, receipts and the popup are not kept. A bound clinical popup
blocks workspace navigation, and the critical handler is refused under it
(`Ehr.Runtime.popup_blocks`). On the call that hydrates a chart, a commit click
and an acknowledgment are refused with `blocked "Chart is loading"`.

`Ehr.Runtime.inputState` names the exact state that the inner interpreter sees:
the incoming state for ordinary programs, `Workspace.bind` for selection-enabled
programs. Already-bound inputs are unchanged by binding (`bind_of_bound`). The
runtime commit theorems use newness relative to the original API input and prove
requirements at `inputState`. They do **not** claim the host painted that hydrated
state before the event. `A2_popup_holds` likewise uses popup newness relative to
the API input and proves the firing key at the effective input. Since the
hydrating call refuses commits, a call that returns a state with a commit did
not hydrate: `Ehr.Runtime.commit_input` proves `inputState i = i.state` for it,
for every program. So every commit theorem at the effective input is a theorem
about the state the client sent.

The common proof is `Ehr.Runtime.step_shape`: the output is the inner `step`
state, preserves its commit/acknowledgment/receipt/popup evidence, or clears that
evidence. `critical_evidence`, `workspace_shape` and `bind_evidence` isolate the
wrapper cases. Binding may **load host-supplied prior receipts** and
**restores the acknowledgments stored for the selected patient**; saying that
wrappers never add receipts or acknowledgments without these qualifications
would be false. `receipt_origin` accounts for existing receipts, facts receipts
and core actions; `ack_origin` and `input_acks` account for acknowledgments in
the API state, in the stored draft and from core actions. The evidence
projection deliberately excludes captures: workspace navigation moves them to
the draft store and hydration restores the human entries among them.

## Per-patient drafts

`State.patientDrafts?` holds one `PatientDraft` (patient ID, captures,
acknowledgments) per patient whose chart the clinician has left with unsigned
work, for the signed-in session: it lives in `State` and `runInit` starts
without it. It is absent from JSON when there is no draft, so states without
drafts serialize exactly as before and earlier serialized states decode
unchanged (`#guard`s in `Ehr.Proofs.RuntimeDraftWitness`). Only
`Ehr.Workspace` reads or writes it; the interpreter step never changes it
(`Ehr.Runtime.step_drafts`).

- **Saving** (`Workspace.save`). Workspace navigation that leaves a hydrated
  chart (Return to the list, an activity list, Patient Lookup, and through them
  opening another patient) stores the chart's `captured` and `acked` as that
  patient's draft, replacing an earlier one. A chart with neither leaves no
  entry. A state that holds no hydrated chart (`Workspace.chart? = none`) leaves
  the store unchanged, so leaving a selected but not yet hydrated patient does
  not overwrite that patient's draft. `save_self`, `save_ne`.
- **Restoring** (`Workspace.restore`, in `Workspace.bind`). Hydration builds the
  fresh chart as before, then adds the stored captures that are *restorable*
  (`Workspace.restorable`): entered by a human, confirmed, and for a spec
  element the signed-in role may enter. A restored entry replaces a fresh
  prefill of the same element and order line. The chart's acknowledgments
  become exactly the stored ones (`start_acked`). The draft is taken out of the
  store. Commits, receipts and the popup are **not** restored: the hydrated
  chart has no commit and no popup (`start_fresh`), and its receipts come from
  the facts as before.
- **Other patients.** Hydration and saving keep every other patient's draft
  (`others_ne`, `save_ne`), and a chart receives only its own patient's draft:
  `Workspace.opening_clears_patient_state` is unchanged, and the two-patient
  `#guard`s open B after A and then A again.

Decisions taken here, **for owner review**:

- **Prefilled values are not restored**, confirmed or not. Hydration computes
  prefills again from the current record, so a prefill whose source value
  changed shows the new value, unconfirmed, and the clinician confirms it
  again. A confirmation of a prefill is therefore lost on leaving the chart.
- **An entry whose requirement no longer applies is restored.** Requirements
  are evaluated at the commit against the current facts, as inside an episode;
  an entry for an element that is no longer required has no effect.
- **An entry that is no longer valid under the current facts is restored**
  and shown. The view marks it "value validation failed" and the commit guard
  refuses until it is corrected, exactly as for a value that becomes invalid
  inside an episode (the guard's `validationsOk` checks every capture, so the
  runtime `T0_commit_needs_guard` covers it). It is not dropped silently.
- **An entry for an element that left the spec, or that the role may no
  longer enter, is dropped.** This keeps `WritesAllowed` for any stored draft.
- **Acknowledgments are restored as stored.** They are keyed by alert and
  alert key, and the key carries the fact the alert fired on. A changed fact
  gives a new key, which is not acknowledged in the hydrated chart
  (`start_unacked`), so the alert interrupts again; the witness
  `changed_fact_interrupts` runs this. This was confirmed in Lean as asked.
- **Signed captures are restored too.** Leaving a chart clears `commits`, and
  the captures behind a commit stay in the draft. After reopening, the same
  entries can be signed again with one click, subject to the guard and the
  current facts. Before this change they had to be entered again. Whether a
  signed entry should leave the draft is an open question for the owner.

Where stored entries come from: `Ehr.Runtime.draft_origin` proves that after
any API call an entry of a patient's stored draft was already stored for that
patient, or the call left that patient's hydrated chart and the entry was in
the chart. `restore_mem` proves a capture of the hydrated chart is a fresh
prefill or a restorable stored one.

## The hydrating call

Hydration happens on the first call after selection, and that call's event is
applied to the freshly loaded chart, which the clinician has not seen. The app
hydrates with a `scroll` event; other API clients can send anything.

`Workspace.hydrates` says the call hydrates: the incoming state is not bound to
the facts' patient and `Workspace.bind` gives a state that is.
`Ehr.Runtime.loadingEvent` names the refused events: every `ack`, and a click
on a commit button of the hydrated chart's screen (`Workspace.commitClick`).
The message is the existing `"Chart is loading"` (`Workspace.loading`), which a
search before hydration already returned; no clearer wording was introduced.

- `Ehr.Runtime.hydrating_refuses`: on a hydrating call, a refused event that is
  not workspace navigation returns the hydrated chart and `blocked "Chart is
  loading"`. `hydrating_ack` is the case of an acknowledgment.
- `hydrating_applies`: every other event that is not workspace navigation is
  one human interpreter step on the hydrated chart, as before.
- `hydrating_adds_nothing`: for **every** event, the state a hydrating call
  returns has no commit, and each of its acknowledgments is one stored for the
  selected patient.
- `commit_input`: a call that returns a state with a commit did not hydrate.

A commit button whose ID is also a workspace control ID is handled as workspace
navigation, as before; `hydrating_adds_nothing` covers that case too.

## Unselected views

**New property for owner review:** no patient data is shown before a patient is
selected. `Ehr.Runtime.Unselected s` says the patient-selection context of `s`
selects no patient: the landing view, an activity list and Patient Lookup.
`Ehr.Runtime.WorkspaceOnly i` makes "no patient data" in `runView` precise:

- `noItems`: the view has no item. So no chart component, field value, info
  panel, review or alert is shown.
- `noBlocked`: the view reports no blocked commit.
- `controls`: every enabled control is one `Workspace.action?` resolves: an
  activity list, Patient Lookup, or opening a patient from the day list or the
  lookup results.
- `directoryOnly`: the whole view is a function of the program, the screen
  name, the selection context (activity and lookup query) and the facts'
  patient directory. No other part of the facts, no other part of the state
  (captures, acknowledgments, commits, receipts, popup, stored drafts, critical
  workflow fields), and neither the spec nor the user can change it.

The directory itself (names, record numbers and list rows of the day's
patients) counts as workspace navigation and lookup data, not as chart data.

`Ehr.Runtime.unselected_view` proves `WorkspaceOnly` for every program with
patient selection and every unselected state, with any spec, facts and user.
`runInit_unselected`: the deployed initial state is unselected. `unbound_view`
gives the first two clauses also for a selected patient whose chart is not yet
hydrated. `Ehr.Runtime.reachable_settled` adds that a state without a hydrated
chart, when reached through the API with any facts, holds no capture,
acknowledgment, commit or popup: unsigned work is only in the draft store,
which no view reads before the patient is hydrated again. The existing
`Ehr.Render.unbound_has_no_chart` is the same statement for the rendered UI
tree's banner, sidebar and modal.

Properties 1 and 9 still fail in their global form on the landing view
(`landing_has_no_landmark`, `landing_passive_not_shown`). This property is what
holds there instead: showing a patient banner or a patient's passive alert
before selection would contradict it.

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

## Bound patient episodes

For a program with patient selection, a *bound patient episode* is the time one
clinician keeps one patient's chart open. `Ehr.Runtime.BoundEpisode` names its
parameters: the spec, program, facts and user (fixed for the whole episode; the
facts are the selected patient's) and `opened`, the API state in which the
patient is selected but the chart is not yet hydrated.

- `BoundEpisode.start` is the hydrated chart, `Workspace.bind` applied to
  `opened`, with the patient's stored draft restored. It is the effective input
  of the hydrating API call, not an API output.
- `BoundEpisode.Hydrates` says hydration succeeds: the program has patient
  selection, `opened` is not bound to the facts' source patient, and `start` is.
- `Ehr.Runtime.workspaceEvent` is workspace navigation in a bound chart: a
  click on a control that `Workspace.action?` resolves (an activity list,
  Patient Lookup, Return to the list) and an entry into the workspace search
  box. `BoundEpisode.Stays` is its negation.
- `Ehr.Runtime.InEpisode E s` holds for the hydrated chart, the state the
  hydrating call returns (the hydrated chart itself when the event is refused),
  every state a later call returns for an event that is not workspace
  navigation, and those states after waiting.

**Excluded:** the unselected landing view, list and lookup states, the opened
but not yet hydrated state, and every transition that leaves or switches the
chart. A later hydration starts another episode, also of the same patient; it
begins with that patient's restored draft. If hydration does not succeed,
no state is in the episode. A navigation click that is refused because a popup
is open leaves the state unchanged; it is excluded as an event all the same.
Facts are fixed inside an episode; facts the host replaces while a chart is open
are not covered.

Supporting theorems, all in `Ehr.Runtime`:

- `step_context`: the interpreter step never changes `State.patientContext?`.
  `episode_context` and `episode_bound`: every episode state has the hydrated
  chart's patient context and is bound to the facts' source patient.
- `workspace_core`: in a bound chart, an event that is not workspace navigation
  is exactly one human interpreter step. `first_step`: the hydrating call
  returns the hydrated chart for a refused event (`loadingEvent`) and otherwise
  applies its event to the hydrated chart; the critical-result handler is not
  offered an event before the chart is bound.
- `navigation_leaves`: a navigation click that is not refused returns a state
  bound to no patient. `unbound_not_inEpisode` and `unselected_not_inEpisode`:
  an unbound state is not in the episode, and a state without a selected
  patient is in no episode at all.
- `episode_runView`: in every episode state the API view is the interpreter's
  view, so `InfoShown`, `CommitButtonShown` and `AlertShownInline` describe what
  the API paints.

### Refinement and its qualification

`Ehr.Runtime.ReachableFrom ep s₀` is the core transition system of
`Props.Reachable` (any actor, any event, waiting) started at an arbitrary state
`s₀`; `reachableFrom_start` shows that `s₀ = ep.start` gives `Props.Reachable`.

- `Ehr.Runtime.episode_step`: each API call of an episode is, up to the two
  critical workflow fields, either no step or the core human step.
- `Ehr.Runtime.episode_refines`: forgetting the critical workflow fields of
  any episode state gives a state the core reaches **from the hydrated chart**
  with the same facts. `episode_agrees` states the same as agreement on every
  other field. The patient context is kept as it is.

The qualification is the start state. The refinement is by core runs from
`E.start`, not from `init`, and this cannot be removed:

- `Ehr.Runtime.episode_not_core`: no episode state is `Props.Reachable` as it
  is, because core runs have no patient context (`core_context`).
- `Ehr.Runtime.Witness.start_history_not_core`: also with the patient context
  ignored, the hydrated chart of the workspace witness is not core reachable.
  Hydration goes to the selected screen directly and records the start screen
  in the Back history (`start_history`); a program without navigation controls
  never has a Back history in a core run (`core_history`).
- `Ehr.Runtime.start_eq` gives the exact shape: the hydrated chart is
  `Ehr.Runtime.chart` (the core start after one direct `goTo`) with the stored
  draft restored (`Workspace.restore`), the workspace clock, a patient context
  and the draft store without that draft. Prior receipts come from the facts,
  as in `init`; the restored clock is the opened state's. A restored draft is a
  second reason the hydrated chart is not a core start state.
- **Accepted (owner, 2026-11-11): hydration goes to the selected screen with a
  direct `goTo`.** Equality with the state after clicking through is not
  required and is not claimed; the per-episode properties hold for the chart as
  hydration builds it.
- **Open:** whether every hydrated chart agrees with some `Props.Reachable`
  state up to the patient context *and* the Back history. It is expected when
  the selected screen is one shown "go to" click from the start screen (that
  click is the same `goTo`). It is not expected in general: clicking through
  intermediate screens prefills their fields, which hydration skips, and
  hydrating onto the start screen runs its prefill a second time. Neither
  direction is proved and no counterexample is supplied. So the clicks that
  property 13 guarantees to exist are not known to give the same state.

So the per-episode properties are **not** obtained from the core properties by
this refinement. They are proved from the per-step lemmas behind the
`Ehr.Check` soundness theorems, which hold from every state, plus what
hydration establishes about the chart (`chart_names`, `chart_writes`,
`chart_noHuman`, `chart_humanCaptured`, `chart_popup`): program screen names,
allowed writes, no prefilled human-required value, and no popup; and what
restoring a draft keeps (`restore_writes`, `restore_humanCaptured`,
`restore_human`). Because hydration restores only confirmed human entries for
spec elements the role may enter, **no premise on the stored draft is needed**:
`accepted_episode` holds for any opened state, whatever its draft store.

### Per-episode properties

The statements are built in two steps so that the kernel checks their bodies
against the originals.

1. `Ehr.Proofs.RuntimeFrom`: each `…From ep s₀` definition repeats the body of
   the `Props` definition of the same name with `ReachableFrom ep s₀`. Each
   `…From_start` theorem proves `XFrom ep ep.start ↔ Props.X ep` from the
   reachability equivalence alone. `Ehr.Proofs.RuntimeFromProofs` proves each
   `…From` form (`landmarksShown_from`, …, `interruptsOnce_from`) from stated
   conditions on `s₀`.
2. `Ehr.Proofs.RuntimeEpisodeProps`: each `Episode… E` definition repeats the
   `Fixed…` definition of the same name with `EpisodeAlways E` (all episode
   states) for `FixedAlways` and `EpisodeEveryStep E` for `FixedEveryStep`.
   Each `episode_…` theorem has the `…From` form at the hydrated chart as its
   premise and passes it to `episode_always` or `episode_everyStep`, as the
   `ordinary_…` theorems do with the core property.

`Ehr.Runtime.accepted_episode` bundles the fourteen clauses
(`EpisodeAccepted`) for a checker-accepted program, any facts, any user of the
program's role and any opened state.

Clauses that differ from the `Props` bodies beyond the episode scope:

- **Per-step clauses** (`EpisodeEveryStep`) cover the episode's API calls with
  an event that is not workspace navigation. The hydrating call is related to
  its effective input `E.start`, not to the API input `E.opened`.
- **`actor = .human` parts are dropped** in `EpisodeEnteredOnce`,
  `EpisodeHumanStepsByHuman` and `EpisodeOnlyHumanCommitsAndAcks`, as in the
  `Fixed…` forms: every API event is human.
- **`EpisodeHumanStepsByHuman`, first clause, replaced.** It was "the hydrated
  chart holds no value for an element a human must enter", which restoring
  drafts makes false. It is now: every such value in the hydrated chart is a
  confirmed human entry (`byHuman` and `confirmed`) of the draft stored for the
  selected patient. `draft_origin` and the per-step clause say where such
  stored entries come from: a human entry event in an earlier episode of that
  patient. For an arbitrary `opened` state the draft store is arbitrary, so the
  clause cannot say more than "it was stored as a human entry".
- **`view`, not `runView`:** the bodies use the interpreter's view;
  `episode_runView` proves it is the API view in every episode state.
- **Acknowledgment-change clause of property 5: unchanged.** Inside an episode
  the acknowledgment list changes only by an `ack` event.
- `Commits s s'` is the runtime form of `CommitHappens`, as for ordinary
  programs.

Apart from that replaced first clause, no clause was changed, and no clause
fails per episode. The per-step clauses hold for the hydrating call also when
its event is refused: the call then returns the hydrated chart unchanged.

Regression on the workspace witness (`Ehr.Proofs.RuntimeEpisodeWitness`):
`acknowledged_inEpisode`; `landing_not_inEpisode` and `returned_not_inEpisode`
(for every episode); `selected_not_inEpisode`; `return_leaves` (the Return
click of the counterexamples is workspace navigation); `episode_accepted`,
`acknowledged_landmark`, `acknowledged_keeps_captures` and
`acknowledged_keeps_acks` instantiate the general theorems.
`Ehr.Proofs.RuntimeDraftWitness` continues the run through Return and
reopening: `reopened_inEpisode` puts the reopened chart, with its restored
draft, in a second episode that satisfies `EpisodeAccepted`.

## Across workspace navigation

`Ehr.Proofs.RuntimeSession` and `Ehr.Proofs.RuntimeGlobal` state properties 2,
5 and 11 for whole API runs of a program with patient selection, across
leaving and reopening charts. They need **no checker premise and no
reachability premise** beyond the three invariants of `Settled` where noted.

`Ehr.Runtime.sessionCaptured pid s` and `sessionAcked pid s` are patient
`pid`'s captures and acknowledgments in the session: those of the open chart
if it is that patient's, otherwise those of the patient's stored draft.
`Ehr.Runtime.CallShape` gives the exact cases of one API call (`call_shape`):
the effective input returned up to the critical workflow fields; one
interpreter step in a bound chart; a lookup query; or leaving, which saves the
chart. `Ehr.Runtime.Settled` holds in every state reached through the API with
any facts (`reachable_settled`): a state without a hydrated chart holds no
popup, capture, acknowledgment or commit; human-required values are confirmed
human entries; an open popup is not acknowledged.

`Ehr.Runtime.selection_global` proves `SelectionGlobal ep` for every program
with patient selection, any facts and any user, over `FixedReachable`:

| Clause | Form proved | Per-call theorem |
|---|---|---|
| 2, commits capture all | Original `FixedCommitCapturesAll` | `commit_entries` with `commit_input` |
| 2, entered once | **Session form** `SessionEnteredOnce`: each patient's confirmed, restorable session captures are kept by every non-entry, non-macro call | `session_captures` |
| 5, human entries, start | Original first clause of `FixedHumanStepsByHuman` | (the landing state has no capture) |
| 5, human entries, per step | **Session form** `SessionHumanEntries`: a human-required value new in a patient's session captures comes from an entry event | `session_humanEntries` (needs `Settled`) |
| 5, commits by a commit click | Original commit clause, `FixedCommitsByClick`, on the screen of the API state | `commit_byClick` |
| 5, acknowledgments by `ack` | **Session form** `SessionAcksByAck` | `session_acks` |
| 5, cosign is a second user | Original `FixedCosignIsSecondUser` | runtime `T3_cosign_distinct` with `commit_input` |
| 11, acknowledgments persist | **Session form** in `SessionInterruptsOnce` | `session_acks` |
| 11, popup stays until acknowledged | Original clause | `popup_kept` (needs `Settled`) |
| 11, open popup is not acknowledged | Original clause | `Settled.unacked` |

The per-call theorems hold for every API state (or every `Settled` state) and
any facts, so they also cover facts the host replaces between calls. The commit
clauses hold in the original form because of the hydrating-call refusal: at a
commit the effective input is the API state.

What still fails in the **original** global form, with kernel-checked
witnesses on the same accepted program and run:

- `FixedEnteredOnce`: `Ehr.Runtime.Witness.return_empties_captured`. The
  Return click, a non-entry, non-macro click, leaves `State.captured` empty.
  Exact reason: leaving moves the chart's captures to the patient's stored
  draft; the list state holds no clinical work. The capture is not lost:
  `return_keeps_capture`.
- Acknowledgment persistence of `FixedInterruptsOnce` and the acknowledgment
  clause of `FixedOnlyHumanCommitsAndAcks`: `return_empties_acked`. Same
  reason for `State.acked`; the event is a click. `return_keeps_ack`.
- The per-step clause of `FixedHumanStepsByHuman`: `reopen_restores_entry`.
  On the hydrating `scroll` the restored entry is new in `State.captured`.
  Exact reason: hydration moves the stored human entry back into the chart; it
  was made by an entry event in the first episode.

Two limits of the session forms, both intended:

- **Prefill confirmations.** `SessionEnteredOnce` covers restorable captures.
  A confirmed prefill stays in the session captures until the chart is
  reopened and is then replaced by a fresh, unconfirmed prefill (see
  [Per-patient drafts](#per-patient-drafts)). No witness is supplied: the
  witness program has no prefill. `restore_mem` is the general statement.
- **Commits.** `commits` is cleared on leaving and is not restored, because
  signed work is in the record. No global statement about commits across
  episodes is made.

Regressions on the witness (`Ehr.Proofs.RuntimeDraftWitness`), a fixed-facts
run through Return, reopening and a hydrating `scroll` (`reopened_reachable`):
`return_keeps_capture`, `return_keeps_ack`, `reopened_store`,
`reopen_does_not_interrupt` (the commit click that opened the interruptive
alert in the first chart commits in the reopened chart with no popup),
`changed_fact_interrupts`, `hydrating_call_refuses`, `witness_global`,
`landing_workspaceOnly`, and `#guard`s for save and restore, two patients,
what is restorable, the refusal, and JSON with and without stored drafts.

Fifteen public lemmas were added to `Ehr.Check` for this (`landmarksPinned_at`,
`passivePinned_at`, `reviewsPinned_at`, `accepted_pinRules`, `enteredOnce_at`,
`onlyHumanCommitsAndAcks_at`, `goTo_noNewHuman`, `step_noNewHuman`,
`step_humanCaptured`, `goTo_writesState`, `step_writesState`,
`alertKeys_of_captured`, `popupKeys_step`, `interruptsOnce_at`,
`popupUnacked_step`). They state the existing per-step arguments for every
state instead of every `Props.Reachable` state. No existing statement changed;
nine existing proofs now call them, and two private lemmas lost an unused
reachability premise.

## Guarantee inventory

The first theorem name in each cell is fully qualified; subsequent unqualified
names in that cell share its namespace. “Ordinary” means an ordinary program
with fixed facts, as above. “Per episode” means every bound patient episode of
a checker-accepted program with patient selection, with fixed facts, in the
`Episode…` form (`Ehr.Runtime.accepted_episode`). “Refuted in the global form”
means the clause as originally scoped, across workspace navigation and the
landing view; those counterexamples are unchanged and show why the global form
is not the right statement.

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
| Wrappers add no acknowledgment except stored ones | **Proved**, restated: `Ehr.Runtime.input_acks` (an acknowledgment at the effective input was in the API state or is stored for the selected patient), `Ehr.Runtime.new_ack_core`, `Ehr.Runtime.ack_origin` (gained the premise "not stored for the selected patient"). The earlier statements without the stored-draft case are false now and were replaced. Stored acknowledgments come only from a chart being left: `Ehr.Runtime.draft_origin`. |
| Hydrating call refuses commits and acknowledgments | **Proved**, every program with patient selection: `Ehr.Runtime.hydrating_refuses`, `hydrating_ack`, `hydrating_applies`, `hydrating_adds_nothing`; `commit_input` for every program. Regression: `Ehr.Runtime.Witness.hydrating_call_refuses`. |
| No patient data before selection | **Proved**, new property: `Ehr.Runtime.unselected_view` (`WorkspaceOnly`), `runInit_unselected`, `unbound_view`, `reachable_settled`. Regression: `Ehr.Runtime.Witness.landing_workspaceOnly`. |
| Per-patient drafts | **Proved**: `Ehr.Runtime.step_drafts`, `save_self`, `save_ne`, `others_ne`, `bind_hydrates`, `restore_mem`, `restore_keeps`, `start_acked`, `start_unacked`, `start_fresh`, `draft_origin`, `session_bind`. Regressions: `Ehr.Runtime.Witness.return_keeps_capture`, `return_keeps_ack`, `reopen_does_not_interrupt`, `changed_fact_interrupts`. |
| Wrappers never manufacture a receipt | **Proved**, allowing receipts loaded from facts: `Ehr.Runtime.input_receipts`, `Ehr.Runtime.new_receipt_core`, `Ehr.Runtime.receipt_origin`. |
| Critical handler changes only critical workflow state | **Proved**, every call: `Ehr.Runtime.critical_frame` (all fields except `criticalResults?` and `criticalDrafts?` are kept), `critical_evidence`. |
| Popup blocks every nonacknowledgment event | **Proved**. Every program, popup open at effective input: `Ehr.Runtime.popup_blocks` keeps `captured`, `commits`, `acked`, `receipts` and `popup?`; a workspace lookup query may still change the patient-selection context (`workspace_popup_blocks`). Ordinary programs: `popup_blocks_ordinary` returns the same state and the interpreter's popup refusal. Handler alone: `critical_popup`. Regression on the former counterexample: `Ehr.Runtime.Witness.popup_blocks_action`. |
| 1 — `accepted_wellFormed` | **Proved** for ordinary programs: `Ehr.Runtime.ordinary_landmarksShown`. **Proved per episode** with patient selection: `Ehr.Runtime.episode_landmarksShown` (`EpisodeLandmarksShown`), with `episode_runView`; regression `Ehr.Runtime.Witness.acknowledged_landmark`. **Refuted in the global form** (runtime-view landmark clause on the unselected landing view): `Ehr.Runtime.Witness.landing_has_no_landmark`, `workspace_accepted`; the landing view is in no episode (`landing_not_inEpisode`), and what holds there is `Ehr.Runtime.unselected_view`. Static catalog/ID/reference/depth clauses are retained by `Ehr.Runtime.accepted_static`. |
| 2 — `accepted_capturesAllOnce` | **Proved** for ordinary programs: `Ehr.Runtime.ordinary_commitCapturesAll`, `ordinary_enteredOnce`. **Proved per episode** with patient selection: `Ehr.Runtime.episode_commitCapturesAll`, `episode_enteredOnce`; regression `Ehr.Runtime.Witness.acknowledged_keeps_captures`. **Across navigation:** the commit clause holds in the original form and retention in the session form (`Ehr.Runtime.selection_global`, `session_captures`); regression `Ehr.Runtime.Witness.return_keeps_capture`. **Still refuted in the original global form** of retention: `Ehr.Runtime.Witness.return_empties_captured`, `acknowledged_reachable`, `workspace_accepted`: Return moves the captures to the stored draft, so `State.captured` is empty on the list; that click leaves the episode (`return_leaves`). Commit entry obligations at effective input for every call: `Ehr.Runtime.commit_entries`; linked-prefill structure is retained by `Ehr.Runtime.accepted_static`. |
| 3 — `accepted_writesOnly` / `WritesAllowed` | **Proved** for ordinary programs: `Ehr.Runtime.ordinary_writesAllowed` (in `accepted_ordinary`). Regressions on the former counterexample: `Ehr.Runtime.Witness.action_is_draft`, `writes_allowed`. **Proved per episode** with patient selection: `Ehr.Runtime.episode_writesAllowed` (`EpisodeWritesAllowed`); receipts loaded at hydration are the facts' receipts (`chart_writes`). No global-form statement or counterexample with patient selection is supplied. Declared field/button structure is retained by `Ehr.Runtime.accepted_static`. |
| 4 — `accepted_reviewsBeforeCommit` | **Proved** for ordinary programs: `Ehr.Runtime.ordinary_commitReviewsMet`, `ordinary_commitScreenShowsReviews`. **Proved per episode** with patient selection, including the commit-screen view clause: `Ehr.Runtime.episode_commitReviewsMet`, `episode_commitScreenShowsReviews`, with `episode_runView`. The hydrating call is related to the hydrated chart, its effective input. For every call, `Ehr.Runtime.commit_reviews` and the runtime T2 theorems prove the commit obligations at effective input. |
| 5 — `accepted_humanOnlyKept` | **Proved** for ordinary programs: `Ehr.Runtime.ordinary_humanStepsByHuman`, `ordinary_onlyHumanCommitsAndAcks`, `ordinary_cosignIsSecondUser`. **Proved per episode** with patient selection: `Ehr.Runtime.episode_humanStepsByHuman`, `episode_onlyHumanCommitsAndAcks`, `episode_cosignIsSecondUser`; the acknowledgment-change clause is the original one; regression `Ehr.Runtime.Witness.acknowledged_keeps_acks`. **Across navigation:** the commit and cosign clauses hold in the original form, the acknowledgment and per-step human-entry clauses in the session form (`Ehr.Runtime.selection_global`, `session_acks`, `session_humanEntries`, `commit_byClick`). **Still refuted in the original global form:** the acknowledgment clause (`Ehr.Runtime.Witness.return_empties_acked`: a workspace click moves the acknowledgments to the stored draft) and the per-step human-entry clause (`reopen_restores_entry`: the hydrating call moves a stored human entry back). Neither exhibits an automated acknowledgment, an automated entry or a self-cosign. Static automation prohibitions are retained by `Ehr.Runtime.accepted_static`. |
| 7 — `accepted_units` | **Proved** for ordinary programs: `Ehr.Runtime.ordinary_commitUnitsRight`. **Proved per episode** with patient selection: `Ehr.Runtime.episode_commitUnitsRight`; the captures are those of the episode state before the call (the hydrated chart for the hydrating call). For every call, `Ehr.Runtime.commit_units` proves the whole-episode unit obligation at effective input; static quantity-prefill restrictions are retained by `Ehr.Runtime.accepted_static`. |
| 8 — `accepted_budgets` | **Proved unchanged, entirely static**: `Ehr.Check.accepted_budgets`, also included in `Ehr.Runtime.accepted_static`. No runtime-state argument is present. |
| 9 — `accepted_alertsFire` | **Proved** for ordinary programs: `Ehr.Runtime.ordinary_interruptiveHandled`, `ordinary_passiveShownInline`. **Proved per episode** with patient selection: `Ehr.Runtime.episode_interruptiveHandled`, `episode_passiveShownInline`, with `episode_runView`. **Refuted in the global form** (runtime-view passive-inline clause on the unselected landing view): `Ehr.Runtime.Witness.landing_passive_not_shown`, `passive_landing_reachable`, `passive_accepted`. The unselected workspace view hides chart content while its underlying program screen is targeted; it is in no episode, and `Ehr.Runtime.unselected_view` proves it shows no patient data. Interruptive handling at commits is proved at effective input for every call by `Ehr.Runtime.commit_interruptive_handled`; no macro suppression is retained by `Ehr.Runtime.accepted_static`. |
| 10 — `accepted_noFalseAlarms` / `AlertsOnlyWhenTrue` | **Proved** for ordinary programs: `Ehr.Runtime.ordinary_alertsOnlyWhenTrue` (in `accepted_ordinary`). Regressions on the former counterexample: `Ehr.Runtime.ClinicalWitness.blocked_under_popup`, `clinical_unchanged`, `alerts_only_when_true`. **Proved per episode** with patient selection: `Ehr.Runtime.episode_alertsOnlyWhenTrue` (`EpisodeAlertsOnlyWhenTrue`); the hydrated chart has no popup (`chart_popup`). No global-form statement or counterexample with patient selection is supplied. Shown inline alerts satisfy `Ehr.Runtime.A2_view_shown` for every program; static popup declarations remain covered by `Ehr.Runtime.accepted_static`. |
| 11 — `accepted_noRepeatInterruptions` | **Proved** for ordinary programs: `Ehr.Runtime.ordinary_interruptsOnce`. **Proved per episode** with patient selection: `Ehr.Runtime.episode_interruptsOnce` (`EpisodeInterruptsOnce`): inside an episode acknowledgments persist, a popup stays until acknowledged and an acknowledged key does not pop up again; regression `Ehr.Runtime.Witness.acknowledged_keeps_acks`. **Across navigation:** persistence holds in the session form and both popup clauses in the original form (`Ehr.Runtime.selection_global`, `session_acks`, `popup_kept`); reopening the same patient restores the acknowledgments, so an acknowledged alert does not interrupt again (`Ehr.Runtime.Witness.reopen_does_not_interrupt`) unless its fact changed (`changed_fact_interrupts`). **Still refuted in the original global form** of persistence: `Ehr.Runtime.Witness.return_empties_acked`. The static single-popup-request predicate remains covered by `Ehr.Runtime.accepted_static`. |
| 12 — `accepted_severityTiers` | **Proved**, the entire property with runtime reachability: `Ehr.Runtime.accepted_severityTiers`. |
| 13 — `accepted_navigation` | **Proved unchanged, entirely static**: `Ehr.Check.accepted_navigation`, also included in `Ehr.Runtime.accepted_static`. Workspace navigation behavior is a separate question. |

In summary, of the twelve accepted properties: three (8, 12, 13) carry over to
`runStep` for every program; the other nine are proved for ordinary programs
with fixed facts, and with patient selection all nine are proved per bound
patient episode with fixed facts (`Ehr.Runtime.accepted_episode`). Across
workspace navigation, properties 2, 5 and 11 are proved in the form of
`Ehr.Runtime.selection_global`: commit clauses as originally stated, retention
and acknowledgment clauses for each patient's session work. Their original
global form keeps three kernel-checked counterexamples, which now show work
moving to and from the draft store, not being lost. Properties 1 and 9 keep
their counterexamples on the landing view, where `Ehr.Runtime.unselected_view`
holds instead. For the other four (3, 4, 7, 10) no global-form statement with
patient selection is supplied; their commit clauses hold at the API state by
`commit_input`. None of the nine is open per episode.

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

The episode boundary is now explicit (`InEpisode`). What is not covered with
patient selection:

- **Across episodes.** Properties 2, 5 and 11 are covered by
  `selection_global` in the forms listed above, and the landing, list and
  lookup views by `unselected_view`. Properties 3, 4, 7 and 10 have no
  statement across episodes, and nothing is claimed about commits across
  episodes.
- **Refinement by `Props.Reachable`.** The episode refinement starts at the
  hydrated chart. Agreement with a core run from `init` up to patient context
  and Back history is open (see above).
- **Changing facts inside an episode.** `InEpisode` fixes the facts. The
  host-driven model `Reachable` allows new facts on every call; the per-episode
  theorems do not cover that.
- **The hydrated chart as a painted state.** `E.start` is the effective input
  of the hydrating call. The theorems do not claim the host painted it before
  the event; until a call hydrates the chart, `runView` shows the list view.
  The hydrating call can no longer commit or acknowledge, but it can still
  enter a value or navigate in a chart the clinician has not seen.
- **The host must keep the returned state.** Drafts live in `State`. A host
  that replaces the state with a fresh `runInit` when the clinician leaves a
  chart discards them. `app/src/core/liveSession.ts` does this today (it calls
  `interp.init` when the selected patient changes away from a chart, and
  resets its event journal); the Lean theorems are about `runStep` and do not
  cover it. See the proposals.

## Proposed changes for the owner

The first two items below were approved and applied on 2026-11-10. The rest are
proposals or decisions, not applied changes. The episode scope is a
specification change: it needs review of the new statements and changes no
behavior.

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
- **Approved 2026-11-11, for review: per-episode scope.** Properties 1, 2, 5,
  9 and 11, and also 3, 4, 7 and 10, are stated and proved per bound patient
  episode (`Ehr.Runtime.accepted_episode`). To review: `BoundEpisode`,
  `Hydrates`, `workspaceEvent`, `InEpisode`, `EpisodeAlways`,
  `EpisodeEveryStep`, the fourteen `Episode…` definitions and the `…From`
  definitions (`HumanEntriesFrom` is new; it is the per-step half of
  `HumanStepsByHumanFrom`).
- **Decided 2026-11-11 and applied, for review: per-patient drafts.** A
  reopened chart gets its patient's captures and acknowledgments back. To
  review: `PatientDraft`, `State.patientDrafts?`, `Workspace.chart?`, `draft`,
  `others`, `save`, `restorable`, `restore`, the changed `openPatient`,
  `showList` and `bind`, and in the proofs `pending`, `Hydrated`,
  `sessionCaptured`, `sessionAcked`, `CallShape`, `Settled` and
  `SelectionGlobal` with its four `Session…` definitions and
  `FixedCommitsByClick`. The restore policy decisions are listed under
  [Per-patient drafts](#per-patient-drafts).
- **Decided 2026-11-11 and applied, for review: hydrating-call refusal.**
  `Workspace.hydrates`, `commitClick`, `loading`, `Ehr.Runtime.loadingEvent`.
- **Decided 2026-11-11 and applied, for review: unselected views.**
  `Unselected`, `WorkspaceOnly`. Landmarks and alert obligations are not
  wanted before selection; the property says the opposite holds.
- **Open: the live host discards the state on leaving a chart.**
  `app/src/core/liveSession.ts` replaces the state with a fresh `init` and
  clears its event journal when the clinician leaves a chart, so in the live
  app the drafts do not survive yet. Keeping them needs a host change (keep
  the returned state, or carry `patientDrafts` over) and a decision on the
  commit service's event journal, which replays a session from `init`. Not
  changed in this lane.
- **Open: signed captures in the draft.** See [Per-patient
  drafts](#per-patient-drafts).
- **Open: drafts and the simulator.** `Ehr.Sim.Resumption` models interrupted
  work with its own frames and rule (a clinical fact change clears
  acknowledgments and unconfirms all entries). The runtime rule here differs:
  acknowledgments are kept per alert key and human entries stay confirmed.
  Decide whether the two should agree.
- **Decision: which events count as leaving.** `workspaceEvent` excludes every
  click that resolves to a workspace control and every entry into the
  workspace search box, also when the workspace refuses it (popup open, or
  search inside a chart) and the state is unchanged. Counting refused events as
  staying would only add calls that return the same state.
- **Accepted 2026-11-11: the hydrated chart.** Hydration goes to the selected
  screen with a direct `goTo`. It does not prefill the screens in between, and
  it records the start screen in the Back history. Per-episode properties hold
  for this chart as it is; equality with the state after clicking through is
  not required.
- **Live fact updates during a popup:** the fixed-facts theorems do not cover
  facts the host replaces while a popup is open. If that is allowed, specify
  how to revalidate or replace the popup key and its acknowledgment obligations.

For Comparator review, prioritize the runtime T0/T2/T3 statements,
`Ehr.Runtime.A2_popup_holds`, `Ehr.Runtime.A2_view_shown`,
`Ehr.Runtime.A4_step`, `Ehr.Runtime.A4_run`, the three evidence-origin statements
(`commit_core`, `ack_origin`, `receipt_origin`),
`Ehr.Runtime.accepted_severityTiers`, `Ehr.Runtime.popup_blocks`,
`Ehr.Runtime.ordinary_refines`, `Ehr.Runtime.accepted_ordinary`,
`Ehr.Runtime.episode_refines`, `Ehr.Runtime.accepted_episode`,
`Ehr.Runtime.hydrating_adds_nothing`, `Ehr.Runtime.commit_input`,
`Ehr.Runtime.unselected_view` and `Ehr.Runtime.selection_global`. The
transition definitions, `inputState`, `withCritical`, the `Fixed…`
definitions, `BoundEpisode`, `InEpisode`, `workspaceEvent`, `ReachableFrom`,
the `…From` and `Episode…` definitions, and the draft, session and
unselected-view definitions listed above are part of their specification surface. Regressions,
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

Each new `State` field changes the generated `lean/generated/ehr-types.ts`
(`criticalDrafts?`, and on 2026-11-11 `patientDrafts?` with the new
`PatientDraft` interface; regenerated with `lake exe gents`). No file
under `app/` changed. The app build fingerprints that generated file as source
text, because `app/src/ehr/ui/types.ts` imports a value from it, so the
certified app hash changes at the next app build. The app was not built here.

On 2026-11-11, after adding per-patient drafts, the hydrating-call refusal and
the unselected-view property (behavior change in `lean/Ehr/Core/Workspace.lean`
and one new `State` field in `lean/Ehr/Core/Types.lean`; no file under `app/`,
`wasm/` or `services/` changed):

- The default build passed (609 jobs). All 1128 axiom printouts in the build
  use only the permitted axioms. The twenty-four `Runtime*` modules print 348
  theorems: 72 in the six new modules (`RuntimeDrafts`, `RuntimeSession`,
  `RuntimeHydration`, `RuntimeGlobal`, `RuntimeUnselected`,
  `RuntimeDraftWitness`) and 9 added to existing ones.
- Replaced statements, each false after the behavior change: `bind_evidence`
  and `input_acks` (hydration restores stored acknowledgments), `ack_origin`
  (new stored-draft premise), `first_step` (the hydrating call may refuse),
  `bind_cases`, `start_eq` and `start_lift` (the hydrated chart has a restored
  draft), the first clause of `EpisodeHumanStepsByHuman` with
  `episode_humanStepsByHuman`, and the witnesses `return_loses_capture` and
  `return_loses_ack` (now `return_empties_captured`, `return_empties_acked`,
  with `return_keeps_capture`, `return_keeps_ack`). No statement in
  `lean/Ehr/Props`, `lean/Ehr/Specs`, `lean/Statements.lean` or a Comparator
  catalog changed.
- `audit-verification.sh` passed its existing 84-theorem catalog.
- `node conformance/index.mjs --canonical` against the native binary, with
  scenario expectations unchanged: 15 targets, 201 scenarios, 1584 passed,
  0 failed, as before the change. `selection.switch-isolation` passes; its
  description says A's state is "cleared", which now means cleared from the
  open chart (A's unsigned work is in A's stored draft). `node --test
  conformance/workspace.test.mjs`: 4 passed.
- Not run: WASM and browser suites (they need the WASM rebuild and the app
  build, which the merge session does). The agent suites skip without run data.

On 2026-11-11, after adding bound patient episodes (no behavior change; no
file under `lean/Ehr/Core`, `lean/Ehr/Api.lean`, `lean/Ehr/Render`, `app/`,
`wasm/` or `services/` changed):

- The default build passed (597 jobs). All 1047 axiom printouts in the build
  use only the permitted axioms. The eighteen `Runtime*` modules print 267
  theorems; 107 are in the nine new modules, and 15 more are the new
  `Ehr.Check` lemmas.
- `audit-verification.sh` passed its existing 84-theorem catalog.
- Not run: conformance, WASM and browser suites; nothing they execute changed.

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
