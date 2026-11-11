# Coverage of the deployed runtime

The deployed WASM `ehr_step` export and native `ehr serve` step operation call
`Ehr.runStep`, not `Ehr.step` directly. The existing headline theorems and twelve
`Ehr.Check.accepted_*` theorems remain correct for `step`, `init`, `view` and
`Props.Reachable`. They do not establish all their runtime analogues.

All definitions and statements in the five new `Ehr.Proofs.Runtime*` modules
are **new specifications for owner review**, outside Comparator. No runtime
behavior, existing specification, theorem statement or Comparator catalog was
changed. The modules are imported by the default `Ehr` library. Each new theorem
has a `#print axioms` command; only `propext`, `Classical.choice` and `Quot.sound`
are used (some proofs use fewer).

## What the wrappers do

For ordinary programs (`Workspace.enabled = false`), `runInit` calls `init`.
`runStep` first offers each human event to `CriticalRuntime.handle`. Matching
critical-result text entries update `State.captured` and critical workflow state;
matching receive/resolve/escalate clicks update critical workflow state. They
check responsible/covering user identity, but text entry does not check a spec
element, `enteredBy`, or the existing popup. Unhandled events call `step` with
actor `.human`. Internal macros still run through the unchanged interpreter.

For programs with `patientSelection? = some true`, `runInit` returns an empty,
unselected workspace. The handler is offered an event only when the incoming
state is already bound to the supplied source patient's facts. Otherwise, or if
the handler declines, `Workspace.step` first calls `Workspace.bind`: successful
hydration creates a fresh `init`, navigates to the selected clinical destination,
restores the workspace clock and attaches the patient context. Workspace search
and list/patient navigation are then handled outside `step`; clinical events
require a bound patient. Opening a patient or returning to a list clears patient
captures, receipts, acknowledgments, commits and popup state. A bound clinical
popup blocks workspace navigation. A critical handler entry can still change
captures while that popup remains open.

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
The new evidence projection deliberately excludes captures.

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

## Guarantee inventory

The first theorem name in each cell is fully qualified; subsequent unqualified
names in that cell share its namespace. “Open” means no full runtime theorem or
counterexample is supplied for that row; partial results are identified rather
than substituted for the original property.

| Guarantee | Runtime status and exact Lean evidence |
|---|---|
| T0 commit needs guard | **Proved**, every call, at effective input: `Ehr.Runtime.T0_commit_needs_guard`. |
| T0 entry values | **Proved**, at effective input, including allowed values: `Ehr.Runtime.T0_entry_values`; all entry requirements including per-line requirements: `Ehr.Runtime.commit_entries`. |
| T3 distinct cosign | **Proved**, at effective input: `Ehr.Runtime.T3_cosign_distinct`. |
| T2 hidden review receipts/waivers | **Proved**, at effective input: `Ehr.Runtime.T2_receipts_sound`. |
| T2 shown-on-commit without waiver | **Proved**, at effective input: `Ehr.Runtime.T2_shownOnCommit_shown`. |
| A2 newly opened popup | **Proved**, firing key and prior nonacknowledgment at effective input: `Ehr.Runtime.A2_popup_holds`. This is not persistent key truth. |
| A2 shown alert in runtime view | **Proved**, current state/facts: `Ehr.Runtime.A2_view_shown`. |
| A4 one step | **Proved**, every call: `Ehr.Runtime.A4_step`. |
| A4 every run | **Proved**, all host-driven reachable states, including waiting: `Ehr.Runtime.A4_run`. |
| Wrappers never add a commit | **Proved**: `Ehr.Runtime.input_commits`, `Ehr.Runtime.new_commit_core`, `Ehr.Runtime.commit_core`. |
| Wrappers never add an acknowledgment | **Proved**: `Ehr.Runtime.input_acks`, `Ehr.Runtime.new_ack_core`, `Ehr.Runtime.ack_origin`. Clearing remains possible. |
| Wrappers never manufacture a receipt | **Proved**, allowing receipts loaded from facts: `Ehr.Runtime.input_receipts`, `Ehr.Runtime.new_receipt_core`, `Ehr.Runtime.receipt_origin`. |
| Popup blocks nonacknowledgment capture changes | **Refuted**, accepted ordinary fixed-facts run: `Ehr.Runtime.Witness.popup_does_not_block`, with `documented_reachable`, `opened_popup` and `accepted` in the same namespace. |
| 1 — `accepted_wellFormed` | **Refuted** for the global runtime-view landmark clause: `Ehr.Runtime.Witness.landing_has_no_landmark`, `workspace_accepted`. Initial reachability follows by `FixedReachable.start`. Static catalog/ID/reference/depth clauses are retained by `Ehr.Runtime.accepted_static`; no negative claim about bound-chart landmarks is made. |
| 2 — `accepted_capturesAllOnce` | **Refuted** globally: `Ehr.Runtime.Witness.return_loses_capture`, `acknowledged_reachable`, `workspace_accepted`. Workspace return is a non-entry, non-macro click that discards a confirmed capture. Commit entry obligations at effective input are proved by `Ehr.Runtime.commit_entries`; linked-prefill structure is retained by `Ehr.Runtime.accepted_static`. |
| 3 — `accepted_writesOnly` / `WritesAllowed` | **Refuted**, even within an ordinary fixed-facts episode: `Ehr.Runtime.Witness.writes_not_allowed`, `documented_reachable`, `accepted`. `Ehr.Runtime.Witness.nurse_can_document` also checks the absent role check. Declared field/button structure is retained by `Ehr.Runtime.accepted_static`. |
| 4 — `accepted_reviewsBeforeCommit` | **Open** as the full runtime analogue at the original API state, including its commit-screen view clause. `Ehr.Runtime.commit_reviews` and the runtime T2 theorems prove the commit obligations at effective input. No full runView pinning/hydration transfer is asserted. |
| 5 — `accepted_humanOnlyKept` | **Refuted** globally for the original acknowledgment-*change* clause: `Ehr.Runtime.Witness.return_loses_ack`, `acknowledged_reachable`, `workspace_accepted`. A click clears acknowledgments, so a changed list need not mean an `ack` event. This does not exhibit an automated acknowledgment or a self-cosign; origins and cosigns remain proved above. Static automation prohibitions are retained by `Ehr.Runtime.accepted_static`. |
| 7 — `accepted_units` | **Open** as the full original-state runtime analogue. `Ehr.Runtime.commit_units` proves the full whole-episode unit obligation at effective input; static quantity-prefill restrictions are retained by `Ehr.Runtime.accepted_static`. Equality with the API's pre-hydration capture list is not proved. |
| 8 — `accepted_budgets` | **Proved unchanged, entirely static**: `Ehr.Check.accepted_budgets`, also included in `Ehr.Runtime.accepted_static`. No runtime-state argument is present. |
| 9 — `accepted_alertsFire` | **Refuted** for the global runtime-view passive-inline clause: `Ehr.Runtime.Witness.landing_passive_not_shown`, `passive_landing_reachable`, `passive_accepted`. The unselected workspace view hides chart content while its underlying program screen is targeted. Interruptive handling at commits is proved at effective input by `Ehr.Runtime.commit_interruptive_handled`; no macro suppression is retained by `Ehr.Runtime.accepted_static`. |
| 10 — `accepted_noFalseAlarms` / `AlertsOnlyWhenTrue` | **Refuted**, accepted ordinary fixed-facts clinical-alert run: `Ehr.Runtime.ClinicalWitness.stale_clinical_key`, `clinical_changed`, `reachable`, `user_role`, `accepted`. Shown inline alerts still satisfy `Ehr.Runtime.A2_view_shown`; static popup declarations remain covered by `Ehr.Runtime.accepted_static`. |
| 11 — `accepted_noRepeatInterruptions` | **Refuted** globally for acknowledgment persistence: `Ehr.Runtime.Witness.return_loses_ack`, `acknowledged_reachable`, `workspace_accepted`. The static single-popup-request predicate remains covered by `Ehr.Runtime.accepted_static`. This witness does not assert repeated interruptions within one bound episode. |
| 12 — `accepted_severityTiers` | **Proved**, the entire property with runtime reachability: `Ehr.Runtime.accepted_severityTiers`. |
| 13 — `accepted_navigation` | **Proved unchanged, entirely static**: `Ehr.Check.accepted_navigation`, also included in `Ehr.Runtime.accepted_static`. Workspace navigation behavior is a separate question. |

Property 6 (completion) is not one of the twelve accepted properties and is not
extended here. Existing `runMacro`/T6 helper theorems retain their original
statements and proofs; no new blanket claim about all wrapper behavior is made.

## Counterexamples and refinement boundary

The ordinary care-gap witness opens a real popup by clicking the scalar layout's
shown alert. Entering `critical.action:k1` with text `called ICU` then returns
`ok`, adds a confirmed human capture for an element absent from the spec, and
keeps the popup open. The same call to `step` is blocked. The checked program,
role equality and fixed runtime reachability are all kernel checked. An RN with
the same responsible user ID also receives `ok` in the explicit role witness;
that RN variant is not used to claim acceptance for an RN layout.

The clinical witness declares a coded spec element named `critical.action:k1`
and enters code `ready` through an ordinary field. A `.clinical (.capturedCode …)`
alert opens for a known-true key. The handler replaces that capture with text,
making the predicate unknown while the popup retains its prior key. Current
keys have a `clinical:unknown:` prefix; the retained key has `clinical:true:`.
Their distinct tenth characters give a kernel proof, without assuming the
injectivity or native evaluation of `reprStr`. The same mechanism can stale a
key even when the predicate's truth value does not change, because the key
includes the entire capture list; that unchanged-truth case is not separately
kernel proved here.

`Ehr.Runtime.Witness.not_core_reachable` uses the existing accepted writes theorem
to rule out an exact core counterpart for the extra-capture runtime state.
Dropping only fields ignored by `step` cannot generally fix this: captures are
read by guards and clinical keys. The attempted wholesale refinement therefore
stops at the critical capture path, and workspace reset/hydration additionally
requires an explicit episode boundary. No unconditional bound-patient refinement
is claimed. The remaining original-state review/unit transfers need direct
field-specific proofs through hydration and review visibility, rather than an
appeal to exact state equality; these are the two open inventory rows.

There is a useful conditional fragment:
`Ehr.Runtime.fixed_refines_core` proves exact refinement for ordinary fixed-facts
runs **if every reachable event declines the critical handler**.
`Ehr.Runtime.fixed_invariant` transfers any core state invariant under that same
explicit premise. The premise is not inferred from acceptance and has not been
proved from a general no-critical-results input criterion here. It is not a
proof that the deployed handler is transparent.

## Proposed changes for the owner

These are proposals, not applied changes. Episode scope changes require explicit
review of the new specifications; they are not behavior repairs in this lane.

- **WritesAllowed and clinical key truth:** store critical-result action text in
  dedicated workflow state instead of `State.captured`. Reserve the critical
  endpoint namespace against clinical controls/elements, or specify and check
  its element/type/role contract. This also prevents a handler from overwriting
  a declared coded capture with text.
- **Popup blocking and clinical key truth:** refuse critical handler actions
  while a clinical popup is open, or route them through the same modal guard.
  If live fact updates remain allowed during a popup, specify how to revalidate
  or replace the popup key and its acknowledgment obligations.
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

For Comparator review, prioritize the runtime T0/T2/T3 statements,
`Ehr.Runtime.A2_popup_holds`, `Ehr.Runtime.A2_view_shown`,
`Ehr.Runtime.A4_step`, `Ehr.Runtime.A4_run`, the three evidence-origin statements
(`commit_core`, `ack_origin`, `receipt_origin`), and
`Ehr.Runtime.accepted_severityTiers`. The transition definitions and
`inputState` are part of their specification surface. Counterexamples and the
static/conditional helper bundle can remain separate regression evidence.
No catalog entries were added.

## Verification and artifact boundaries

Run from the repository root, with no concurrent lake process:

```sh
export TMPDIR=/home/saithat/Projects/run-tmp LEAN_NUM_THREADS=6
(cd lean && lake build)
bash scripts/audit-verification.sh
```

The default build includes every new theorem and its axiom printout. The
verification audit checks the existing Comparator surface; it does not silently
add the new runtime statements to its catalog. No `EhrHeavy`, WASM rebuild,
proof-map regeneration or app build is part of this lane. Lean source changes
intentionally leave packaged WASM/source bindings and proof-map freshness for
the merge session to refresh. The certified app hash is unchanged.

On 2026-11-10 the default build passed (571 jobs), with permitted axioms on all
54 new theorem printouts; `audit-verification.sh` passed its existing 84-theorem
catalog. Both full browser-audit commands (templates, then `--personas`) were
attempted once sequentially and exited before screen checks with `ENOENT` for
`fixtures/synthea/index.json`, absent in this Lean-only worktree. No fixtures
were created or copied to make those unrelated checks run.
