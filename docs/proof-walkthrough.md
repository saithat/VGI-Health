# One administration per scheduled dose

The MAR guarantee is: **any finite event history preserves at most one recorded
administration per scheduled occurrence, provided the initial store satisfies
the shared invariant.** Holds, refusals, delays and later offers do not create
another occurrence. The headline theorem is
[`Ehr.Commit.Mar.reoffers_doses_unique`](../lean/Ehr/Commit/Mar.lean#L60).
It quantifies over every starting state and finite event list, with no bound on
actors, offers or history length.

This is a guarantee about the reducer's stored administration history. It does
not establish physical medication delivery, dose correctness or authorization.
The host must serialize transactions over current shared state and atomically
persist the returned state and events; the Lean reducer alone cannot enforce
that database contract. See [commit protocol assumptions](methods/commit-protocol.md)
and [MAR outcome policy](methods/medication-outcomes.md).

The [interactive proof map](proof-map.md#using-the-interactive-artifact) starts
at this theorem. Expand “What this proof cites”, then use “Read” to follow
`reduce_invariant`, `applyEvent_invariant` and `Multi.step_invariant`. The
breadcrumb records that dependency path. Each source link is pinned to the
artifact's built commit.

## What the claim means

[`Multi.DoseKey`](../lean/Ehr/Multi/Model.lean#L12) consists of patient, order
and scheduled occurrence. Actor identity is outside the key, so two nurses
attempting the same occurrence compete for the same key. A later scheduled
occurrence is a different key.

[`Multi.DosesUnique`](../lean/Ehr/Multi/Model.lean#L33) means the list of keys
obtained from the administration history has `List.Nodup`: no duplicate keys.
[`Multi.Invariant`](../lean/Ehr/Multi/Model.lean#L39) combines this property
with bed exclusivity. [`Mar.Invariant`](../lean/Ehr/Commit/Mar.lean#L37)
applies that pair of properties to the MAR state's `shared` field. The bed
condition is an explicit premise of the existing theorem, even though its
conclusion projects only dose uniqueness.

[`Mar.applyEvent`](../lean/Ehr/Commit/Mar.lean#L29) sends an `administered`
event to [`Multi.step`](../lean/Ehr/Multi/Model.lean#L43). That step checks
whether the key already occurs. If so, shared state stays unchanged. Otherwise
it prepends the key and actor. All other MAR events leave shared state
unchanged, while the MAR event log still records them.
[`Mar.reduce`](../lean/Ehr/Commit/Mar.lean#L35) folds this function over the
finite event list. Duplicate attempted events can therefore occur in the MAR
event log; the uniqueness claim concerns `shared.administrations`.

## Four key lemmas

1. [`Multi.initial_invariant`](../lean/Ehr/Multi/Proofs.lean#L5) supplies the
   starting premise for an empty shared store. Both key lists are empty and
   hence have no duplicates. This is a way to instantiate the headline's
   assumption; it is not a lemma cited by `reoffers_doses_unique` itself.
2. [`Multi.step_invariant`](../lean/Ehr/Multi/Proofs.lean#L9) preserves both
   invariants for one atomic action. For administration, an existing key
   stutters; a fresh key prepended to a duplicate-free list remains
   duplicate-free (`List.nodup_cons`). Bed assignments use the same argument;
   releases filter the bed list, which preserves no-duplicates. All action
   cases are covered.
3. [`Mar.applyEvent_invariant`](../lean/Ehr/Commit/Mar.lean#L39) lifts the
   single-action lemma to MAR events. The administration case applies
   `Multi.step_invariant`; each other case reuses the original invariant
   because shared state is unchanged.
4. [`Mar.reduce_invariant`](../lean/Ehr/Commit/Mar.lean#L43) lifts one event to
   every finite history by induction on the event list. The empty case uses
   the supplied premise. In the nonempty case, `applyEvent_invariant`
   establishes the premise for the tail; the induction hypothesis finishes.

Finally, `reoffers_doses_unique` takes the first conjunct (`.1`) of
`reduce_invariant`. This is exactly `Multi.DosesUnique` for the resulting shared
state, with no extra clinical assumption hidden in that final projection.
The companion theorem
[`nonadministration_preserves_shared`](../lean/Ehr/Commit/Mar.lean#L50)
separately states that held, refused, not-given and delayed events do not consume
the occurrence. It is proved by definitional equality and is not a proof
citation of the headline theorem.

## Reading the trust surface

The map shows the transitive logical axioms for the selected theorem, separately
from the parameters and hypotheses in its full type. The build permits only
`propext`, `Classical.choice` and `Quot.sound`. The “Definitions to review” list
follows statement references and definition bodies, excluding theorem proof
bodies. Reading those definitions is necessary to assess what was formalized;
a passing kernel check does not validate the clinical policy or storage system.

To inspect the existing theorem directly after building Lean:

```sh
cd lean
printf 'import Ehr.Commit.Mar\n#print axioms Ehr.Commit.Mar.reoffers_doses_unique\n' |
  lake env lean --stdin
```
