# Property 6: record domain (proposal, awaiting owner review)

[Overview](../../README.md) · [What is proved](../assurance.md) · [Completion checker](../methods/completion-checker.md)

Status: **draft, 2026-11-10. Nothing in `lean/` has changed.** Changing property 6
is a specification change and needs owner approval of the exact text.

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

**B. Make the property relative to the canonical program (recommended).** Ask
only that the program never strands a task the vendor's canonical program
could still complete for the same record, user and elapsed time. Records and
times at which the task is impossible for every program drop out by
themselves, with no list to maintain.

**C. Keep the definition and narrow the claim.** Leave `Completable` as it is,
keep the restricted-family proofs, and say in the documentation that the
property is false for V1–V3 over unrestricted records. The documentation now
says this; C is the state of the repository if nothing else is approved.

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

Choose A, B or C. For B, also choose between the fresh-session premise drafted
here and the stricter every-reachable-state variant, and whether
`RecordAllowsScans` stays.
