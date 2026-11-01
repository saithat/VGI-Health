# Handoff: lean-core

Worktree: `/home/saithat/Projects/VGI-lean`; branch `lane/lean-core`.
Merged `origin/main` at `c0a6541`; `origin/lane/rules-encode` was already included.
The earlier interpreter/API, Schedule II allowlist and albuterol-cap work remains
intact. Main has fixed the world Schedule II mirror and adopted the production
zero-refills requirement.

## Completed

All five catalog M groups are implemented in required rule-count order and were
pushed independently. They unlock core representations for 181 catalog rules;
this is not a claim that content has encoded every unlocked rule yet.

| Group | Rules | Commit |
| --- | ---: | --- |
| event-time-window | 67 | `db1c6bb` |
| patient-predicate | 59 | `861599d` |
| value-validation | 34 | `93b537d` |
| order-expiry-clock | 11 | `b61b61c` |
| structured-display | 10 | `bfe01dc` |
| Evidence/local-time/output hardening | — | `7e527f6` |
| Portable date parser, permanent tests, installed WASM | — | `bab3f87` |

The final checkpoint adds permanent core-owned native/WASM fixtures, a portable
ISO/GS1 date parser, rebuilt installed WASM assets and the current manifest.
The previous long character-list date parser failed on WASM rejection paths;
the fixed-width group parser retains the same full Gregorian grammar. Invalid
leap dates, widths, output dates and public state-preserving rejection are tested.

Each feature has Tiny adoption examples and #guard regressions in Core.Tests.
GenTS exports 137 types and 40 real-JSON samples. New data fields are optional at
existing boundaries. Closed ASTs support conditions/unknowns, versioned sources,
time ordering/deadlines/calendars, lexical and relational validation, durable
expiry/renewal and structured payload/phase/label contracts. Detailed semantics,
trust boundaries and integration contracts are in docs/design/changes.md and
changes-requests.md.

The three L groups (qualified-authorization, record-level-completeness,
release-access-policy) have precise designs and test plans in changes-requests.md;
they were intentionally not implemented, as the owner requested.

## Proof status

T0, T2, T3, T6, A2 and A4 remain proven. All 25 core axiom audits use only
`propext`, `Classical.choice` and `Quot.sound`. No new unfinished proofs, axioms,
`admit` or `native_decide` were introduced. Existing project-wide proof work
remains tracked in TODO_PROOFS.md.

**DRAFT statement change:** commitGuard_iff adds an independent
`extraGuard = true` conjunct, describing the stronger executable guard. Its
value corollary is extended identically; T0_extra_contract proves a new commit
satisfies those contracts. The other 17 Comparator statements are unchanged.
No requirement, human step, allowed-value rule or receipt rule was weakened.

## Final verification

- `cd lean && lake build`: pass.
- `lake check`: pass, default kernel accepts the solution.
- `lake comparator`: pass, all 18 registered statements.
- `lake exe gents` and generated-sample strict TypeScript check: pass.
- Workspace build, typecheck and lint: pass.
- Agent: 31 tests; app: 90 tests; world: 92 tests. All pass.
- `wasm/build-ehr.sh && wasm/install-into-app.sh`: pass; installed WASM is
  1,921,816 bytes. Toolchain is the explicitly supplied VGI-wasm/.tools symlink.
- `make wasm-check`: pass; manifest records current Lean sources/assets.
- `node lean/Ehr/Core/test-wasm-features.mjs`: pass, 252 native/WASM API
  comparisons over 84 cases, including all five groups and Schedule II values.
- Full original equivalence corpus: 4,096 cases, 144,807 step comparisons,
  144,807 view comparisons and 32 init comparisons; pass. Original seed,
  every case/event and full byte comparisons were retained. Inputs/native output
  were batched, with disjoint worker ranges and sequential Lake setup.
- Renderer/FHIR native/WASM: pass, 174 Synthea bundles and 694 canonical page variants, including stable IDs, RN wristband acceptance/rejection and error envelopes.

The stock wasm/test/equivalence.mjs currently exceeds JavaScript's string limit
at its all-inputs join. An exact memory-bounded patch is prepared at
/tmp/wasm-equivalence-memory.patch and requested from the owning WASM lane.
The full passing workaround report is /tmp/lean-streamed-equivalence-results.json;
standalone batched runner: /tmp/lean-streamed-equivalence.mjs. No corpus was cut.

## What's left

**Lean-core implementation, proofs, generator and WASM asset queue: nothing left.**

Owning-lane integration remains explicitly requested in changes-requests.md:

- Content: encode the unlocked rules with citations and correct applicability,
  event bindings, deadlines, clock policies, validation tables and display scopes;
  use explicit lawful stop/refusal/exception routes.
- Check: validate the new contracts and certify true/false/unknown, missing/expired,
  dependency, exception and phase-navigation branches. Preserve per-line allowed
  values and all existing safety/completability properties.
- Render/world: populate trusted current-version clinical/event/calendar/order/
  terminology/payload/phase facts; paint payload groups/selection/pinning and
  enforce continuous phase presence. Clinical alert keys are opaque snapshot
  identities; replace the legacy raw-key popup body with clinical label/context
  before production adoption. Backend scheduler execution remains separate.
- Agent/app: extend validators to preserve every new constructor/optional field;
  the existing agent schema still rejects drugClass and strips entries.allowed.
  Add exact constrained-spec round trips; never strip safety constraints.
- WASM: apply the stock-runner memory fix while retaining every case/event;
  the permanent new-feature suite already lives under Core ownership.
- Owner review: the strengthened commitGuard_iff statement remains DRAFT.

No source files in Specs, Canonical, Props, Check, Render, agent, world or app
were edited by this continuation. Necessary external edits are the explicitly
requested generator/sample files, minimal T0/DRAFT-statement compatibility, design
notes, and the explicitly authorized generated app/public/ehr assets.
