# Property 6: record domain (proposal, awaiting owner review)

[Overview](../../README.md) · [What is proved](../assurance.md) · [Completion checker](../methods/completion-checker.md)

Status: **draft, 2026-11-10. Nothing in `lean/` has changed.** Changing property 6
is a specification change and needs owner approval of the exact text.

Owner, 2026-11-10: the canonical program may not be kept in the long run. That
weighs against option B; option D below does not use it. No option is chosen yet.

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
   the present definition. The twelve `accepted_*` theorems are unaffected.
2. The rejection theorems for seeds 1, 7, 13, 15, 16 and 22 use this
   obstruction (`seed_payload_not_satisfies`). They hold for any program with a
   signing task, so they do not show the seeded defect.

## Options

**A. Enumerate what the record must supply.** Add premises next to
`RecordAllowsScans`: every required display has a complete trusted payload,
every temporal requirement has its evidence, and so on. This is explicit, but
the list follows `extraGuard` and must grow with it. It also does not cover
time: `Reachable` lets any amount of time pass, after which an expiry or a
deadline blocks the commit for good. A would need a second premise about time.

**B. Make the property relative to the canonical program.** Ask
only that the program never strands a task the vendor's canonical program
could still complete for the same record, user and elapsed time. Records and
times at which the task is impossible for every program drop out by
themselves, with no list to maintain.

**C. Keep the definition and narrow the claim.** Leave `Completable` as it is,
keep the restricted-family proofs, and say in the documentation that the
property is false for V1–V3 over unrestricted records. The documentation now
says this; C is the state of the repository if nothing else is approved.

**D. Make the property relative to what is possible at all.** Ask that the
program never strands a task that *some* program could still complete for the
same record, user and elapsed time. Like B it needs no list and handles time,
and its premise does not mention the canonical program. It asks at least as
much as B: whenever the canonical program can commit, some program can.

## Draft text for option B

```lean
/-- A fresh session of the vendor's canonical program, started at elapsed time `clock`
for the same record and user, can still perform commit `c` by some human event list. -/
def CanonicalCanCommit (spec : Spec) (canonical : Program) (facts : Facts) (user : User)
    (clock : Nat) (c : CommitId) : Prop :=
  let ep : Episode := ⟨spec, canonical, facts, user⟩
  ∃ es : List Event, c ∈ (ep.afterHuman { ep.start with clock := clock } es).commits

/-- From every reachable state, each required commit not yet done can still be done,
provided the canonical program could still do it for this record at this time. -/
def CommitsStayReachableWhereCanonical (ep : Episode) (canonical : Program)
    (commits : List CommitId) : Prop :=
  Always ep fun s => ∀ c ∈ commits, c ∉ s.commits →
    CanonicalCanCommit ep.spec canonical ep.facts ep.user s.clock c →
    ∃ es : List Event, c ∈ (ep.afterHuman s es).commits

/-- **Property 6, relative form.** The program never strands a required task that the
canonical program could still complete for the same record, user and elapsed time. -/
def CompletableWhereCanonical (spec : Spec) (canonical prog : Program) : Prop :=
  ∀ facts user, user.role = prog.role → RecordAllowsScans spec facts →
    CommitsStayReachableWhereCanonical ⟨spec, prog, facts, user⟩ canonical
      (requiredCommitsFor spec canonical prog facts user)
```

Checked against the build at `5add724f` in a scratch file outside the
repository (standard axioms only):

- The definitions type-check.
- `Completable spec canonical prog → CompletableWhereCanonical spec canonical prog`.
  Every existing completion proof (scalar, fixed-line, receipt-aware,
  many-alert and automated families) carries over unchanged.
- With a missing trusted payload under an always-active display requirement,
  `¬ CanonicalCanCommit` at every clock. The obstruction above therefore no
  longer refutes the property: the relative form asks nothing for that record.

## Draft text for option D

```lean
/-- Some program can still perform commit `c` for this record and user at elapsed time
`clock`: under these rules the task is possible at all. -/
def CommitFeasible (spec : Spec) (facts : Facts) (user : User) (clock : Nat) (c : CommitId) : Prop :=
  ∃ (p : Program) (es : List Event),
    c ∈ ((⟨spec, p, facts, user⟩ : Episode).afterHuman
      { (⟨spec, p, facts, user⟩ : Episode).start with clock := clock } es).commits

/-- **Property 6, feasibility form.** The program never strands a required task that is
still possible, for the same record, user and elapsed time, in any program at all. -/
def CompletableWhereFeasible (spec : Spec) (canonical prog : Program) : Prop :=
  ∀ facts user, user.role = prog.role → RecordAllowsScans spec facts →
    Always ⟨spec, prog, facts, user⟩ fun s =>
      ∀ c ∈ requiredCommitsFor spec canonical prog facts user, c ∉ s.commits →
        CommitFeasible spec facts user s.clock c →
        ∃ es : List Event, c ∈ ((⟨spec, prog, facts, user⟩ : Episode).afterHuman s es).commits
```

Checked the same way as option B:

- `Completable → CompletableWhereFeasible → CompletableWhereCanonical`, so D sits
  between the present property and B, and existing completion proofs carry over.
- With a missing trusted payload under an always-active display requirement,
  `¬ CommitFeasible` at every clock, so the obstruction is excluded here too.

Two cautions for D:

- The witness program is unconstrained. It need not pass the checker. If some
  task can only be completed by a program that breaks another rule (depth, the
  banner, a budget), D would demand the impossible of every accepted program.
  Restricting the witness to accepted programs fixes that, but `check` takes
  the canonical program as an argument today.
- D removes the canonical program from the premise only. The set of required
  commits (`requiredCommitsFor`) still starts from the canonical program's
  commit buttons.

## The canonical program elsewhere

Dropping the canonical program is a larger change than property 6. It is an
argument of `check` and of `Satisfies`, and it defines:

- the required commits in properties 1 and 6 (`requiredCommits`);
- the depth requirement in property 1 (`RequiredWithinDepth`);
- the popup budget in property 8 (`AlertBudget`);
- the checker's rule that passive-alert workflows of the canonical program are kept
  (it supports property 9), and its patient-selection retention rule.

If it goes, each of these needs a replacement source, for example a task list
declared in the rule set. That decision should come before choosing between B
and D.

## What option B does and does not say

- It is a comparison, not an absolute guarantee. If the canonical program
  cannot complete a task for some record, the property promises nothing there.
  That the canonical program completes ordinary records is a separate claim; it
  is exercised today by the conformance scenarios and simulated days, not proved.
- The canonical session is fresh and starts at the candidate's elapsed time.
  It does not inherit the candidate's captures, receipts or acknowledgments.
  A stricter variant would compare against every reachable canonical state at
  that time; it asks more of the program and is harder to prove.
- `RecordAllowsScans` becomes redundant (a record with no medication to scan
  blocks the canonical program too) and could be dropped in the same change.
- The six seed theorems listed above would stop being provable from the shared
  obstruction. Each would need a proof about its own defect, which is the
  outstanding question on mutation-specific proofs.
- General completion remains open under either form. A proof of the relative
  form has to turn the canonical program's event list into one for the candidate.

## Decision needed

Choose A, B, C or D, after deciding whether the canonical program stays. For B
and D, also choose between the fresh-session premise drafted here and the
stricter every-reachable-state variant, and whether `RecordAllowsScans` stays.
For D, choose whether the witness program must be an accepted one.
