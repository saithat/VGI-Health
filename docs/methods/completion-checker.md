# Completion checker methodology

[Overview](../../README.md) · [Methods and reproduction](../../README.md#documentation)

`Ehr.Check.CompletionModel` checks AG EF completion certificates: a finite set
containing the initial state, closed under every model edge, with a strictly
decreasing recovery rank at every unfinished state. Acceptance proves recovery
from every model-reachable state and excludes unfinished dead ends, including
self-loop traps. `Ehr.Check.CompletionModel.accepted_completable` (in
`CompletionAbstraction.lean`) transfers this result to the unchanged property 6
only with a proved `EpisodeAbstraction` for every permitted record, user and
required commit. That interface requires forward coverage of arbitrary human
and macro events and arbitrary waits, plus lifting abstract recovery edges to
human interpreter runs. The finite guard-observation lemma preserves each
listed value predicate; it does not supply those transition proofs. Current
canonical programs do not yet have these adapters; ordinary checker acceptance
still does not imply general property 6.

`ehr check-completion --spec S --program P --canonical C [--prev P0]
--scenarios FILE` adds an opt-in scenario gate after the existing static check.
`FILE` is a nonempty JSON array of `{id, facts, user, goals, space, bound}`;
`goals` uses the simulator's `commits`, `values` and `expectedAcks` schema.
`space` is `full` (default), `goalDirected` or `navigationDirected`, with the
same restrictions as minimum-click search. Optional `events` instead selects
all safe interleavings of an explicit event alphabet. Back IDs and macros
invoking Back are excluded by the proved history-erasure condition. Clock,
patient facts, user and goal values stay fixed; arbitrary text/number inputs,
macro actors, workspace patient selection and waits are outside this result.
The command emits `property6Closed: false` and never issues an ordinary
deployment certificate. It refuses budget exhaustion as `unknown`.

The native search exhausts its reachable graph, assigns ranks by reverse BFS,
then independently validates its positive certificate or a closed losing
region. Negative results include an interpreter-replayed path and trap state;
the no-continuation claim is relative to the declared move space. Regression
examples distinguish a successful minimum-click path from a premature-navigation
trap; adding a return route gives a six-state certificate checked by kernel
reduction. Hash collisions, unfinished self-loops, cycles with exits, outgoing
goal edges, incomplete certificates and infinite discovery are covered too.

New interaction specifications for owner review are in
`Ehr.Check.InteractionRules`: every firing interruptive alert key is acknowledged
before a new commit, and Back retains existing captures (including unsaved and
unconfirmed input) and commits. These follow from the existing guard and Back
semantics. Accepted scenario certificates also check alert acknowledgment and
capture/commit retention on navigation edges through `CompletionModel.edgesHold`;
`accepted_edges` proves coverage of every reachable model edge. A patient-switch
durability claim is deferred: workspace switching clears patient-local state,
while signed-data persistence belongs to the external commit service. There is
no discard-on-Back prompt in the modeled semantics because Back preserves input.

Targeted native verification for this checker:

```sh
export TMPDIR="${TMPDIR:?Set disk-backed TMPDIR}" LEAN_NUM_THREADS=6 CI=true
(cd lean && lake build && lake build completion-bench)
(cd lean && lake env lean Ehr/Check/CompletionAudit.lean)
node --test scripts/completion-check.test.mjs
lean/.lake/build/bin/completion-bench "$PWD" "$TMPDIR/completion-bench"
```

`CompletionAudit.lean` prints dependencies for all 33 new theorems. Native CLI
tests cover scenario acceptance, checked losing regions, unknown refusals,
static-rule precedence, JSON defaults and malformed input. Missing optional
scenario settings use the documented defaults; malformed present fields fail.
The benchmark reads the existing 15-persona/23-rejection matrix and writes only
to the explicit scratch directory. Canonical references are measured separately;
they remain non-deployable mixed-role references. One declared clinical task
per program is checked in `navigationDirected`, with a 2,000-state budget;
these tasks do not cover every required commit or every patient scenario.

[Completion evidence](../audits/completion-checker-20261106.json) records per-program
times, exact commands, binary/source bindings and the remaining proof work.
All 18 selected scenarios passed: 51–565 ms per persona and 2.97–3.09 s per
canonical reference, including certificate and interaction-edge validation.
The static matrix retained 15 acceptances and 23 expected rejections. A v1/P1
`full` search returned `unknown` at a 100-state budget (367 ms), rather than
accepting its explored prefix. All 33 axiom audits passed. General arbitrary-value/actor/time abstraction
adapters and a mandatory ordinary deployment gate remain unfinished. The CLI
preserves information-needs goal fields and refuses nonempty lookup requirements
because those stages are outside its scenario graph.
