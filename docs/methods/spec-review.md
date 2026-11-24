# Spec review and the trusted base

The dashboard reads `for owner review` flags from `lean/Ehr/` on every request.
It joins them to [lean/spec-surface.json](../../lean/spec-surface.json), generated
from the compiled Lean environment, and defaults to the trusted base.

- **Trusted base, review:** declarations reachable from headline statements,
  through statement types, definition bodies and constructor field types.
- **Proven lemma, no review needed:** a theorem outside that closure; Lean has
  checked its proof and no headline statement needs its statement.
- **Unverified code:** other definitions, types and inline rules outside the
  closure; no headline theorem covers them. This does not assert that each
  type is executable or that no isolated helper lemma mentions the code.

The full closure includes the roots, constructors, projections, instances and
compiler helpers. Traversal precedes any source display or line counting.
Theorems contribute their types, never their proofs. Private identities remain
unique in JSON; source ranges classify private and anonymous declarations and
inline flags. The catalog digest includes both source bytes and the generated
closure, so changing either invalidates cached content.

The roots come from the three Comparator configurations and the declarations
actually audited by `scripts/audit-verification.sh` in `Audit/SpecSurface.lean`.
The generator checks that `Statements.lean` and its Comparator configuration
agree. The clinical and entry headline guarantees are audited there too.
There is no separate handwritten list of dashboard roots. Definitions explicitly
selected by that audit contribute their bodies, including property 6.

Regenerate after the ordinary build and additional proof modules:

```sh
export TMPDIR=/home/saithat/Projects/run-tmp
cd lean
lake build
lake build $(cat ../scripts/proof-map/extra-modules.txt)
cd ..
scripts/proof-map/build.sh --readme
scripts/proof-map/build.sh --check-readme
```

The proof-map CI job runs the last command. It builds `VerificationAudit`, runs
`Audit/SpecSurfaceTests.lean`, regenerates the closure in a temporary directory
and rejects any mismatch with the committed JSON. Missing root declarations,
unexpected axioms and stale proof-map documentation also fail the job.

Both clinical catalogs now store `EntryWitness.Case` values with a `Scene` and a
`Trial Unit`. Clinical scripts use the same initialized `Realized` relation as
entry scripts. `control` combines candidate choice with checked native replay,
control observations and original-state preservation, retaining backtracking
when observations fail. Counterfactual alternatives execute at the reached
control before the original branch continues; they cannot donate state or
clinical evidence to that branch. Service routing affects candidate search;
it does not change the control relation.

[Reduction counts, statement comparison and remaining questions](../audits/spec-review-surface.md)
record the scope and limits of this consolidation.
