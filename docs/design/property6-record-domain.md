# Property 6: record domain (option D implemented)

[Overview](../../README.md) · [What is proved](../assurance.md) · [Completion checker](../methods/completion-checker.md)

Status: **Option D implemented alongside `Completable` (`lean/Ehr/Props/`, `lean/Ehr/Check/`).**
`Completable` and `Satisfies` remain unchanged; every new definition and theorem is
marked `"New specification for owner review"`.

## The problem

Property 6 (`Completable`, `lean/Ehr/Props/Properties.lean`) says that for
**every** patient record and every user of the program's role, each required
commit stays reachable from every reachable state. The only restriction on the
record is `RecordAllowsScans`.

Some commit preconditions can only be met by the record, never by the screen:
a trusted payload for a required display, trusted event evidence for a temporal
requirement, an order clock that has not expired. The interpreter is right to
block the commit when they are missing. Property 6 still demands that the
commit be reachable, so it cannot hold.

This is proved, not conjectured. In the opt-in `EhrHeavy` target:

- `missing_payload_not_completable` (`Check/DisplayObstruction.lean`): a record
  with an active required display and no trusted payload refutes `Completable`.
- `v1_payload_domain_not_satisfies`, and the V2 and V3 forms
  (`Check/FullDisplayObstruction.lean`): for the released rule sets,
  `¬ Satisfies spec none canonical prog` for **every** program with at least one
  required commit, the canonical program included.

Two consequences:

1. "All thirteen properties" cannot be established for any real program under
   `Completable` when always-active display requirements are present. The twelve
   `accepted_*` theorems are unaffected.
2. The rejection theorems for seeds 1, 7, 13, 15, 16 and 22 use this
   obstruction (`seed_payload_not_satisfies`). They hold for any program with a
   signing task, so they do not isolate the seeded defect.

## Options considered

**A. Enumerate what the record must supply.** Add premises next to
`RecordAllowsScans`: every required display has a complete trusted payload,
every temporal requirement has its evidence, and so on. This is explicit, but
the list follows `extraGuard` and must grow with it, and needs a separate
premise for clock expiry.

**B. Make the property relative to the canonical program.** Ask
only that the program never strands a task the vendor's canonical program
could still complete for the same record, user and elapsed time
(`CanonicalCanCommit` / `CompletableWhereCanonical`).

**C. Keep the definition and narrow the claim.** Leave `Completable` as it is,
keep the restricted-family proofs, and document that the property is false for
V1–V3 over unrestricted records.

**D. Make the property relative to what is possible at all (chosen).** Ask that
the program never strands a task that *some* program could still complete for the
same record, user and elapsed time. Like B it needs no list and handles time,
and its premise does not mention the canonical program. It asks at least as
much as B: whenever the canonical program can commit, some program can.

## What was built for option D

### 1. Core specifications (`lean/Ehr/Props/Basics.lean`, `lean/Ehr/Props/Properties.lean`)

Sub-choice defaults implemented:

- **Premise form**: fresh-session feasibility from `start` with `clock := s.clock`
  (`{ (⟨spec, p, facts, user⟩ : Episode).start with clock := clock }`).
- **Scan premise**: `RecordAllowsScans spec facts` is retained.
- **Witness program**: unconstrained in `CommitFeasible` / `CompletableWhereFeasible`,
  paired with the checker-accepted restriction `AcceptedCommitFeasible` /
  `CompletableWhereAcceptedFeasible` in `lean/Ehr/Check/FeasibleCompletion.lean`.

```lean
/-- Some program can still perform commit `c` for this record and user at elapsed time
`clock`: under these rules the task is possible at all. -/
def CommitFeasible (spec : Spec) (facts : Facts) (user : User) (clock : Nat)
    (c : CommitId) : Prop :=
  ∃ (p : Program) (es : List Event), p.role = user.role ∧
    c ∈ (Episode.afterHuman ⟨spec, p, facts, user⟩
      { (⟨spec, p, facts, user⟩ : Episode).start with clock := clock } es).commits

/-- From every reachable state, each commit in `commits` not yet done can still be
done, provided some program could still do it for this record at this time. -/
def CommitsStayReachableWhereFeasible (ep : Episode) (commits : List CommitId) : Prop :=
  Always ep fun s => ∀ c ∈ commits, c ∉ s.commits →
    CommitFeasible ep.spec ep.facts ep.user s.clock c →
    ∃ es : List Event, c ∈ (ep.afterHuman s es).commits

/-- **Property 6, feasibility form (option D).** -/
def CompletableWhereFeasible (spec : Spec) (canonical prog : Program) : Prop :=
  ∀ facts user, user.role = prog.role → RecordAllowsScans spec facts →
    CommitsStayReachableWhereFeasible ⟨spec, prog, facts, user⟩
      (requiredCommitsFor spec canonical prog facts user)
```

`SatisfiesWhereFeasible` (`lean/Ehr/Props/Properties.lean`) replaces only
`Completable` with `CompletableWhereFeasible` in the 13-property bundle. Option B
(`CanonicalCanCommit`, `CommitsStayReachableWhereCanonical`,
`CompletableWhereCanonical`) is also defined in `lean/Ehr/Check/FeasibleCompletion.lean`
as the downstream comparison target in the implication chain.

### 2. Canonical-free required-commit set (`specRequiredCommitsFor`)

To remove the canonical program from the required-commit set as well as the
premise, `lean/Ehr/Props/Basics.lean` defines:

```lean
def specRequiredCommits (spec : Spec) (role : Role) : List CommitId :=
  (spec.commits.filter fun cs => cs.roles.contains role).map (·.id)

def specRequiredCommitsFor (spec : Spec) (role : Role) (facts : Facts)
    (user : User) : List CommitId :=
  (specRequiredCommits spec role).filter (commitRoleOk spec facts user)
```

and `CompletableWhereFeasibleSpec spec prog` (`lean/Ehr/Props/Properties.lean`)
uses `specRequiredCommitsFor spec prog.role facts user`.

What is proved about the two required-commit sets:

- **Universal inclusion and implication** (`lean/Ehr/Check/FeasibleCompletion.lean`):
  `requiredCommits_sub_specRequiredCommits` and
  `requiredCommitsFor_sub_specRequiredCommitsFor` prove that every commit in
  `requiredCommitsFor spec canonical prog facts user` belongs to
  `specRequiredCommitsFor spec prog.role facts user`. Consequently,
  `completableWhereFeasibleSpec_imp_completableWhereFeasible` proves
  `CompletableWhereFeasibleSpec spec prog → CompletableWhereFeasible spec canonical prog`.
- **Equality on single-workflow families** (`Scalar.specRequiredCommitsFor_eq`,
  `FixedLine.specRequiredCommitsFor_eq`): when the canonical program exposes every
  commit declared for the role in `spec.commits`, the two sets are identical.
- **Why `requiredCommitsFor` cannot be dropped for workflow-scoped programs**
  (`unusedWorkflow_completable_not_completableWhereFeasibleSpec`,
  `lean/Ehr/Check/FeasibleCompletionObstruction.lean`): `CommitSpec` carries
  `roles : List Role` and `encounterRoles? : Option (List String)` but no
  workflow (`W1`–`W7`) or persona (`P1`–`P5`) scope. In multi-workflow specs
  (such as `unusedWorkflowSpec` or `specV1`–`specV3`, where `.physician` is
  permitted on outpatient `signOrders`, ED `edDisposition`, inpatient
  `admitPatient`/`dischargePatient`, and procedural `recordProcedure` across
  different workflows while persona programs `P1`–`P5` each implement their own
  workflow subset), `specRequiredCommitsFor` requires a single-workflow program
  to complete every role-permitted commit in the spec whenever some other
  program can complete it. `unusedWorkflow_completable_not_completableWhereFeasibleSpec`
  proves that `emptyProgram` satisfies `Completable` and `CompletableWhereFeasible`
  against `unusedWorkflowSpec` yet refutes `CompletableWhereFeasibleSpec`. Both
  forms are therefore kept; making the canonical-free form exact for persona
  programs requires adding workflow or task-scope metadata to `CommitSpec` or
  `Program`.

### 3. Witness program caution: unconstrained vs. checker-accepted (`AcceptedCommitFeasible`)

The design caution asked whether a task can be feasible in `CommitFeasible`
only via a witness program that violates another accepted-program rule. The
answer is **yes**, proved by two kernel-checked counterexamples in
`lean/Ehr/Check/FeasibleCompletionObstruction.lean`:

1. **Violating `CatalogOnly` (`catalog_commitFeasible_not_acceptedCommitFeasible`)**:
   `step` does not check `spec.design.catalog` at runtime. Under
   `unusedWorkflowSpec` (whose catalog omits `"button"`), `unusedCommitWitness`
   commits `"unused"` in one click (`CommitFeasible`), whereas no program
   satisfying `CatalogOnly` (Property 1) or accepted by `check` can contain a
   commit button (`¬ AcceptedCommitFeasible`).
2. **Violating `WritesOnly` (`linked_commitFeasible_not_acceptedCommitFeasible`)**:
   `prefillField` does not check `el.enteredBy` when copying a confirmed
   `.linked src` capture for an `.autoLinked` element. Under `linkedBypassSpec`
   (where `"target"` has `enteredBy := []`, `prefill := .autoLinked`,
   `linkedFrom? := some "src"`), `linkedBypassWitness` enters `"src"` as a
   physician, navigates to a second screen where `"target"` is auto-prefilled as
   confirmed, and commits `"sign"` (`CommitFeasible`). By `accepted_writesOnly`
   (`WritesAllowed`, Property 3), no accepted program can ever capture `"target"`
   or commit `"sign"` (`¬ AcceptedCommitFeasible`).

To restrict the witness to checker-accepted programs without re-introducing an
external canonical program into the premise, `lean/Ehr/Check/FeasibleCompletion.lean`
passes the witness `p` as both reference and candidate in `check`:

```lean
def AcceptedCommitFeasible (spec : Spec) (facts : Facts) (user : User)
    (clock : Nat) (c : CommitId) : Prop :=
  ∃ (p : Program) (es : List Event),
    p.role = user.role ∧
    check spec none p p = .ok ∧
    c ∈ ((⟨spec, p, facts, user⟩ : Episode).afterHuman
      { (⟨spec, p, facts, user⟩ : Episode).start with clock := clock } es).commits
```

Passing `prev = none` and `canonical = p` enforces every static rule checked on
the candidate (`catalog`, `screenWellFormed`, `writesAllowed`, `enterOnce`,
`reviewsShown`, `humanOnly`, `completeFor`, `unitsMatch`, `alertBudgets`,
`alertsComplete`, `alertsSound`, `noRepeatAck`, `severityTiers`, `navigation`,
`criticalIds`) while making reference-comparison checks (`presetOwner`,
`passiveWorkflows`, `patientSelect`) reflexive on `p`.

### 4. Implication chain, carry-over theorems, and payload-obstruction exclusion

In `lean/Ehr/Check/FeasibleCompletion.lean` and `lean/Ehr/Check/DisplayObstruction.lean`:

- **Implication chain**:
  - `CompletableWhereFeasibleSpec spec prog → CompletableWhereFeasible spec canonical prog`
    (`completableWhereFeasibleSpec_imp_completableWhereFeasible`)
  - `Completable spec canonical prog → CompletableWhereFeasible spec canonical prog`
    (`completable_imp_completableWhereFeasible`)
  - `CompletableWhereFeasible spec canonical prog → CompletableWhereCanonical spec canonical prog`
    (`completableWhereFeasible_imp_completableWhereCanonical`)
  - `CompletableWhereFeasible spec canonical prog → CompletableWhereAcceptedFeasible spec canonical prog`
    (`completableWhereFeasible_imp_completableWhereAcceptedFeasible`)
  - `Satisfies spec prev canonical prog → SatisfiesWhereFeasible spec prev canonical prog`
    (`satisfies_imp_satisfiesWhereFeasible`)
  - `satisfiesWhereFeasible_of_checked_completableWhereFeasible` and
    `satisfiesWhereAcceptedFeasible_of_checked` assemble the 13-property bundles
    from `check = .ok`.
- **Restricted-family and finite-certificate carry-over**:
  - `Scalar.completableWhereFeasibleSpec` and `Scalar.completableWhereFeasible`
  - `FixedLine.completableWhereFeasibleSpec_many_alerts` and
    `FixedLine.completableWhereFeasible_many_alerts`
  - `CompletionModel.accepted_completableWhereFeasible`
- **Payload-domain obstruction excluded**:
  - `missing_payload_not_commitFeasible` and `missing_payload_not_acceptedCommitFeasible`:
    when `rq ∈ sp.displays?.getD []` has `infoPayload facts rq.info = none` and
    `∀ s, displayActive facts s (some c) rq = true`, `¬ CommitFeasible sp facts user clock c`
    (and `¬ AcceptedCommitFeasible sp facts user clock c`) at every `clock`.
  - `release_payload_record_not_commitFeasible` and
    `full_v1_payload_record_not_commitFeasible` (`Ehr/Check/DisplayObstruction.lean`)
    prove `¬ CommitFeasible` on `releasePayloadRecord` for any full-display spec
    and specifically for `Specs.V1.specForProfile .full`.
  - In `EhrHeavy` (`Ehr/Check/FullDisplayObstruction.lean`),
    `release_payload_domain_not_commitFeasible`,
    `v1_payload_domain_not_commitFeasible`,
    `v2_payload_domain_not_commitFeasible`, and
    `v3_payload_domain_not_commitFeasible` prove that the payload-domain
    obstruction is vacuous under `CommitFeasible` for `specV1`, `specV2`, and `specV3`.

### 5. Remaining gap for V1–V3 accepted programs (`v1TrapProg` counterexample)

`lean/Ehr/Check/FeasibleV1Obstruction.lean` states the general V1–V3 completion
claims:

```lean
def AcceptedCompletableWhereFeasible (sp : Spec) : Prop :=
  ∀ prev can p, check sp prev can p = .ok → CompletableWhereFeasible sp can p

def AcceptedCompletableWhereAcceptedFeasible (sp : Spec) : Prop :=
  ∀ prev can p, check sp prev can p = .ok → CompletableWhereAcceptedFeasible sp can p
```

and proves that **both are false** for `specV1`, `specV2`, and `specV3`
(`v1_accepted_not_completableWhereAcceptedFeasible`,
`v1_v2_v3_not_acceptedCompletableWhereFeasible`).

**Why it fails (`v1TrapProg`)**:

1. `CommitFeasible` and `AcceptedCommitFeasible` test whether `c` is completable
   from a **fresh session** `{ start with clock := s.clock }` (`captured = []`),
   whereas `CompletableWhereFeasible` and `CompletableWhereAcceptedFeasible`
   quantify over **every reachable state `s`** (`Reachable ep s`).
2. At commit time, `extraGuard` checks `validationsOk` across **all** captures
   in `s.captured` (on every order slot), not only the entries required by `c`.
3. Static `check` (`completeViaWithReach` / `doseDependencyIssue`) checks only
   that fields required by `c` are reachable on a `goto` path from `p.start` to
   a screen with a commit button for `c`, and that `.medicationDose` fields have
   a reachable drug selector on the same slot. It does not check whether a
   screen with `"drug"` and `"doseUnit"` fields can be left via a one-way `goto`
   to a commit screen that lacks those fields.
4. `v1TrapProg` is a two-screen physician program accepted by `check` under
   `specV1`, `specV2`, and `specV3` (`check sp none v1TrapProg v1TrapProg = .ok`).
   Screen `"prep"` has open fields for `"drug"` and `"doseUnit"` on slot 1 and a
   one-way `goto` to `"inbox"`, which has all fields and panels required by
   `"ackResult"` on slot 0. From `start`, `v1TrapProg` completes `"ackResult"` in
   four events, so `AcceptedCommitFeasible` holds. However, after entering
   `"amoxicillin"`, `"mg"`, and `"insulin lispro"` on slot 1 on `"prep"` and
   clicking `goto "inbox"` (`trapSetupEvents`), the episode is in an `InboxTrap`
   state (`inboxTrap_step`): `"inbox"` has no `"drug"` or `"doseUnit"` fields
   and no `back` button, so `trappedDoseUnit` (`"doseUnit" = "mg"` on slot 1)
   remains paired with `"insulin lispro"` (whose valid unit is `"units"`),
   making `validationsOk = false` (`inboxTrap_validationsOk_false`) and blocking
   `"ackResult"` on every subsequent human trace (`inboxTrap_never_commits`).
