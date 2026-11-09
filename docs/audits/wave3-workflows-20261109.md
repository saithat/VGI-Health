# Wave-3 workflows verification — 2026-11-09

Scope: owner decisions 9–12, the phase-level increment of 15, and the approved
release capability check. Branch `lane/wave3-workflows`; implementation and
methods are committed together. See [workflow methods](../methods/workflow-phases.md)
for parameter classification, source IDs/years, compatibility and remaining scope.

## Changes

- Refill claim/delegation/review, guarded clinical decision, pharmacy response,
  notification and closure are one W7 protocol.
- Compound alert inspection, cancellation, alternative ordering and documented
  override remain one task; the signed assessment/plan retains the task/patient-bound rationale.
- MAR supports symmetric CMS windows, signed scenario offsets, distinct bedside
  and charting timestamps, explicit non-administration, successor charting and
  bedside-based overdue classification. Legacy records keep their old timing
  proxy and `--workflows legacy` retains the prior generator.
- Independent inbox streams use N1 mean inputs and scenario arrival/routing
  distributions. Ownership and accepted support review never confer sign authority.
- New chart/note preparation and result follow-through phases run around guarded
  episodes. Historical W2 tasks without a workflow plan retain their old episodes.
- Native check/deploy and agent release paths preserve the declared workload's
  reachable/revealable fields, including optional imaging/procedure controls,
  explicit choice fields and declared waiver fields.

The seven retained task IDs are `d07-P1-W1-002`, `d07-P1-W1-004`,
`d07-P1-W1-012`, `d08-P1-W1-008`, `d08-P1-W1-009`, `d09-P1-W1-005`,
`d10-P1-W1-015`. Regression inputs are copied, gitignored original data from
`/home/saithat/Projects/VGI-Health`; the investigation document was read there.
The regression runs the seven actual tasks, grouped by source day, on revision 5:
7/7 remain incomplete; restoring only reachable `orderKind`/`orderCode` completes
7/7. Capability certification rejects the original, native deploy publishes
nothing, restoration passes, and orphan restoration fails. This targeted replay
does not re-estimate the archived full-day 328/335 comparison.

## Verification

All commands use `TMPDIR=/home/saithat/Projects/run-tmp`; Lean uses
`LEAN_NUM_THREADS=4`. Node commands use existing dependency copies with
`pnpm_config_verify_deps_before_run=false` to avoid pnpm's automatic install
against the read-only shared dependency store.

| Command (repository root unless stated) | Result |
|---|---|
| `git rebase main` | Passed before implementation and after the implementation commit; the latter incorporated the proof-map documentation merge without conflicts. |
| `cd lean && lake build` | Passed, 555 jobs. |
| `cd lean && lake exe gents` | Passed, 196 types / 42 samples; simulator metadata remains in its augmentation module. |
| `LEAN_PATH=$PWD/lean/.lake/build/lib/lean lean -j4 "$TMPDIR/Wave3WorkflowAxioms.lean"` | Passed; ten `#print axioms` checks, listed below. |
| `pnpm --filter agent lint` / `pnpm --filter agent typecheck` | Both passed. |
| `pnpm --filter world lint` / `pnpm --filter world typecheck` | Both passed. |
| `pnpm --filter app lint` / `pnpm --filter app typecheck` / `pnpm --filter app build` | All passed. |
| `pnpm --filter agent exec vitest run test/workflow-protocol.test.ts test/workload-capabilities.test.ts test/lean-types.test.ts test/releases.test.ts --maxWorkers=2` | 35/35 passed; includes native compound/stream paths, all five workload-bearing canonicals and the actual seven-task replay. |
| `VGI_REQUIRE_LEAN_TESTS=1 pnpm --filter world exec vitest run test/workflows.test.ts test/administration-outcomes.test.ts test/schema.test.ts test/timing.test.ts test/consistency.test.ts test/determinism.test.ts --maxWorkers=2` | 98/98 passed; no skips. |
| `node scripts/audit-alert-policy.mjs "$TMPDIR/w3-workflows-audit-templates"` then `node scripts/audit-alert-policy.mjs "$TMPDIR/w3-workflows-audit-personas" --personas` | Template audit is running under the shared browser lock; personas follow sequentially. Results pending. |
| `git diff --check` | Passed before staging; repeated after staging and final rebase. |

An early build restart briefly overlapped an unfinished `lake` process. The
second process was interrupted as soon as the overlap was noticed. Subsequent
builds ran serially; the final build and targeted tests passed.

While reusing a fixture, importing the non-default
`Ehr.Sim.IntegrationTests` module exposed two failing fixed-wait count assertions
at lines 164–165 under the default real-work interruption mode. That module is
unchanged here; mode selection belongs to the sim/merge lane. The new field
regression instead instantiates the actual federal series rule locally. The
default build and targeted tests pass.

The last review amendments affect simulation task annotation scoping and offline
field dependency extraction. Browser painter, renderer module bodies and release
inputs remain unchanged during the audit pair.

The scratch axiom file imports `Ehr.Specs.MarTiming`, `Ehr.Check.Workload`,
`Ehr.Commit.Mar`, `Ehr.Sim.Workflow.Protocol` and `Ehr.Sim.Workflow.Timing`, then
runs `#print axioms` on each fully qualified theorem in the table below.

## Axioms

`#print axioms` was checked for every new theorem and the two existing MAR
proofs changed to preserve their statements. Allowed dependencies only:

| Theorem | Axioms |
|---|---|
| `Ehr.Specs.MarTiming.valid_not_early` | `propext` |
| `Ehr.Specs.MarTiming.valid_charted_after_attempt` | `propext` |
| `Ehr.Check.Workload.check_sound` | `propext`, `Quot.sound` |
| `Ehr.Check.Workload.missing_empty_sound` | `propext`, `Classical.choice`, `Quot.sound` |
| `Ehr.Commit.Mar.accepted_timing_valid` | `propext`, `Classical.choice`, `Quot.sound` |
| `Ehr.Commit.Mar.commit_invariant` | `propext`, `Classical.choice`, `Quot.sound` |
| `Ehr.Commit.Mar.accepted_guard_at_written_version` | `propext`, `Classical.choice`, `Quot.sound` |
| `Ehr.Sim.Workflow.closed_requires_clinical` | `propext` |
| `Ehr.Sim.Workflow.closed_requires_owner` | `propext` |
| `Ehr.Sim.Workflow.administration_preserves_schedule` | `propext`, `Classical.choice`, `Quot.sound` |

## Build binding and exclusions

The certified app fingerprint changes through generated types and runtime
validators imported by the app. No `app/` source, lockfile or Vite configuration
was edited. The native interpreter also changes. The current app SHA-256 is
`f803b7f1e32fc2de98a5dbf8b9a1c056d1d3820aacf66ceba40b69a5d8333aa9`;
the native binary SHA-256 is
`f8e765e137851e54b13a75c3932dfda8313c8331c33086ba99b21eaacd9dab5a`. Packaged WASM and historical
certificates remain untouched; matching rebuild/re-certification belongs to the
merge session, as directed. No data is staged, no other branch/worktree is
modified and nothing is pushed.

Full Comparator, Postgres/live integration, cohort remeasurement and WASM rebuild
are excluded by the lane's targeted verify-once scope. Remaining item-15 clinical
workflows are [listed explicitly](../methods/workflow-phases.md#scenario-scope).
No clinical-spec weakening or new owner decision is needed for the implemented
contracts. Phase protocols do not claim real pharmacy delivery, calibrated
service times, rich note composition or clinical validation.

## Exact MAR and release specification additions

The following is the exact diff of the changed record/commit contract and the
two additive specification modules. Existing clinical spec/property/theorem
statements and `lean/comparator.json` are unchanged.

```diff
diff --git a/lean/Ehr/Check/Workload.lean b/lean/Ehr/Check/Workload.lean
new file mode 100644
index 00000000..241caa13
--- /dev/null
+++ b/lean/Ehr/Check/Workload.lean
@@ -0,0 +1,85 @@
+import Ehr.Sim.TaskContext
+import Ehr.Check.Graph
+
+
+namespace Ehr.Check.Workload
+open Ehr Ehr.Sim
+
+/-- The scenario's typed surgical stage determines encounter-only entries.
+All other conditions remain conservative (including missing clinical facts). -/
+def entryPossible (t : Task) : When → Bool
+  | .encounter kind => match t.choices.w6Step? with
+    | some .preop => kind == "preop"
+    | some .postop => kind == "postop"
+    | some .consult => kind == "consult"
+    | some .rounding => kind == "rounding"
+    | some .discharge => kind == "discharge"
+    | none => kind != "preop" && kind != "postop" && kind != "consult" && kind != "rounding" && kind != "discharge"
+  | _ => true
+
+/-- Conservative field dependencies of the declared workload, including entries
+conditional on facts. Explicit service orders cannot vanish with optional UI. -/
+def fields (sp : Spec) (tasks : List Task) : List ElementId :=
+  (tasks.flatMap fun t =>
+    let ch := taskChoices t
+    let commits := (taskEpisodes default t).flatMap fun ep => taskCommits sp (episodeWorkflow t ep) ep.choices
+    -- Advancing an order line also checks per-line requirements belonging
+    -- to other signing artifacts (e.g. the Schedule II earliest-fill field).
+    let entries := sp.entries.filter fun r =>
+      let advances := commits.contains "signOrders" && ch.orders.length > 1 && r.perOrderLine &&
+        (match r.when with
+         | .orderClass cls | .drugClass cls => ch.orders.any (fun o => inClass o.drug cls)
+         | _ => true)
+      (commits.contains r.commit || advances) && entryPossible t r.when
+    let reviews := sp.reviews.filter (fun r => commits.contains r.commit && entryPossible t r.when)
+    let predicateInputs := (entries.flatMap (fun r => whenCaptures r.when)) ++
+      (reviews.flatMap (fun r => whenCaptures r.when)) ++
+      (commits.flatMap fun cm =>
+        let temporal := ((sp.commit? cm).bind (·.temporal?) |>.getD []).flatMap
+          (fun r => r.when?.toList.flatMap predicateCaptures)
+        let expiry := ((sp.commit? cm).bind (·.expiry?) |>.getD []).flatMap
+          (fun r => r.when?.toList.flatMap predicateCaptures)
+        temporal ++ expiry)
+    let explicitChoices :=
+      (if t.workflow == .W7 && ch.refillReason?.isSome then
+        if ch.refill? == some "deny" then ["refillDenyReason"] else ["refillNote"] else []) ++
+      (if ch.painScore?.isSome && !(t.workflow == .W4 && ch.administer.isEmpty) then ["painScore"] else [])
+    let waivers := if (taskCuresReason ch).isSome then reviews.filterMap (·.waivedBy?) else []
+    entries.map (·.element) ++ predicateInputs.map (·.1) ++ explicitChoices ++ waivers ++
+    (if ch.orders.any (fun o => o.kind?.getD .medication != .medication) then
+      ["orderKind", "orderCode"] else [])).eraseDups
+
+/-- Only reachable, revealable fields count. Orphans, cycles, tiny controls and
+unreachable screens cannot satisfy a workload declaration. -/
+def hasField (p : Program) (e : ElementId) : Bool :=
+  let reachable := (bfs p (openGotoEdges p) p.start).map (·.1)
+  p.screens.any fun s => reachable.contains s.id && s.components.any fun c =>
+    revealable s.components c &&
+    match c.kind with | .field el _ _ => el == e | _ => false
+
+/-- Additive release capability specification, independent of optional-feature
+acceptance. Structural availability is necessary, not a completion theorem. -/
+def KeepsFields (required : List ElementId) (p : Program) : Prop :=
+  ∀ e ∈ required, hasField p e = true
+
+def missing (required : List ElementId) (p : Program) : List ElementId :=
+  required.filter (fun e => !hasField p e)
+
+def check (required : List ElementId) (p : Program) : Bool := required.all (hasField p)
+
+theorem check_sound (required : List ElementId) (p : Program)
+    (h : check required p = true) : KeepsFields required p := by
+  intro e he
+  exact List.all_eq_true.mp h e he
+
+/-- The native publication gate uses `missing.isEmpty` directly. -/
+theorem missing_empty_sound (required : List ElementId) (p : Program)
+    (h : (missing required p).isEmpty = true) : KeepsFields required p := by
+  intro e he
+  have empty : missing required p = [] := List.isEmpty_iff.mp h
+  have hm := List.filter_eq_nil_iff.mp empty e he
+  simpa using hm
+
+#print axioms missing_empty_sound
+#print axioms check_sound
+end Ehr.Check.Workload
diff --git a/lean/Ehr/Commit/Mar.lean b/lean/Ehr/Commit/Mar.lean
index 5218de78..f0cebe57 100644
--- a/lean/Ehr/Commit/Mar.lean
+++ b/lean/Ehr/Commit/Mar.lean
@@ -1,0 +2 @@ import Ehr.Commit.Check
+import Ehr.Specs.MarTiming
@@ -72,0 +74,3 @@ structure Input where
+  /-- Separate charting timestamp; time remains the bedside/outcome timestamp. -/
+  chartedTime? : Option String := none
+  timing? : Option AdministrationDecision := none
@@ -99,0 +104,3 @@ def outcomeEvent (i : Input) (s : Ehr.State) : Option Event :=
+  if i.timing?.any (fun a => capturedText s "adminStatus" != match a.outcome with
+    | .given => "given" | .held => "held" | .refused => "refused"
+    | .notGiven => "not-given" | .delayed => "delayed") then none else
@@ -138 +145 @@ def resource (i : Input) (s : Ehr.State) : Json := Id.run do
-      ("authorReference", ref ("Practitioner/" ++ i.request.user.id)), ("time", .str i.time)]]),
+      ("authorReference", ref ("Practitioner/" ++ i.request.user.id)), ("time", .str (i.chartedTime?.getD i.time))]]),
@@ -189,0 +197 @@ def commit (i : Input) : Option Accepted :=
+  if i.timing?.any (fun a => !Specs.MarTiming.valid a) then none else
@@ -214,0 +223 @@ theorem commit_invariant (i : Input) (a : Accepted) (h : Invariant i.state)
+  split at accepted <;> try contradiction
@@ -227,0 +237 @@ theorem accepted_guard_at_written_version (i : Input) (a : Accepted)
+  split at accepted <;> try contradiction
@@ -238,0 +249,10 @@ theorem accepted_guard_at_written_version (i : Input) (a : Accepted)
+theorem accepted_timing_valid (i : Input) (a : Accepted) (t : AdministrationDecision)
+    (timing : i.timing? = some t) (accepted : commit i = some a) :
+    Specs.MarTiming.valid t = true := by
+  unfold commit at accepted
+  split at accepted
+  · contradiction
+  · rename_i h
+    simpa [timing] using h
+
+#print axioms accepted_timing_valid
diff --git a/lean/Ehr/Core/Json.lean b/lean/Ehr/Core/Json.lean
index dfb13ab4..079feef7 100644
--- a/lean/Ehr/Core/Json.lean
+++ b/lean/Ehr/Core/Json.lean
@@ -88,0 +89 @@ structure Task where
+  workflowPlan? : Option Sim.Workflow.WorkflowPlan := none
diff --git a/lean/Ehr/Core/Types.lean b/lean/Ehr/Core/Types.lean
index 283acf6d..f8fc2232 100644
--- a/lean/Ehr/Core/Types.lean
+++ b/lean/Ehr/Core/Types.lean
@@ -1,0 +2 @@ import Ehr.Multi.Critical
+import Ehr.Sim.Workflow.Types
@@ -1096,0 +1098,6 @@ structure AdministrationDecision where
+  /-- Inclusive early boundary; omitted only in frozen legacy schedules. -/
+  windowStartMin? : Option Nat := none
+  /-- Actual administration, absent for non-administration. -/
+  administeredMin? : Option Nat := none
+  /-- Documentation time, distinct from the bedside event. -/
+  chartedMin? : Option Nat := none
@@ -1181,0 +1189 @@ structure TaskMetrics where
+  workflow? : Option Sim.Workflow.WorkflowReport := none
diff --git a/lean/Ehr/Specs/MarTiming.lean b/lean/Ehr/Specs/MarTiming.lean
new file mode 100644
index 00000000..768455a5
--- /dev/null
+++ b/lean/Ehr/Specs/MarTiming.lean
@@ -0,0 +1,36 @@
+import Ehr.Core.Json
+
+namespace Ehr.Specs.MarTiming
+open Ehr
+
+/-- Additive scheduled-dose contract. Legacy records omit the early boundary;
+new records distinguish bedside administration from charting. CMS S14 (2026)
+supplies window widths; criticality and other clinical guards remain separate. -/
+def valid (a : AdministrationDecision) : Bool :=
+  (a.windowStartMin?.getD a.scheduledMin ≤ a.attemptMin) &&
+  (if a.outcome == .given || a.outcome == .delayed then a.attemptMin ≤ a.windowEndMin else true) &&
+  (match a.windowStartMin? with
+   | none => true
+   | some first => (first == a.scheduledMin - (a.windowEndMin - a.scheduledMin)) &&
+      [30, 60, 120].contains (a.windowEndMin - a.scheduledMin) &&
+      a.chartedMin?.any (a.attemptMin ≤ ·) &&
+      (if a.outcome == .given then a.administeredMin? == some a.attemptMin
+       else a.administeredMin?.isNone))
+
+theorem valid_not_early (a : AdministrationDecision) (h : valid a = true) :
+    a.windowStartMin?.getD a.scheduledMin ≤ a.attemptMin := by
+  simp only [valid, Bool.and_eq_true, decide_eq_true_eq] at h
+  exact h.1.1
+
+theorem valid_charted_after_attempt (a : AdministrationDecision) (first : Nat)
+    (early : a.windowStartMin? = some first) (h : valid a = true) :
+    ∃ charted, a.chartedMin? = some charted ∧ a.attemptMin ≤ charted := by
+  simp only [valid, early, Bool.and_eq_true, decide_eq_true_eq] at h
+  have hc := h.2.1.2
+  cases he : a.chartedMin? with
+  | none => simp [he] at hc
+  | some t => exact ⟨t, rfl, by simpa [he] using hc⟩
+
+#print axioms valid_not_early
+#print axioms valid_charted_after_attempt
+end Ehr.Specs.MarTiming
```
