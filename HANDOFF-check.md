# Check lane handoff — remaining work

Worktree `/home/saithat/Projects/VGI-check`, branch `lane/check`.
Latest pushed implementation: `5e85aba`. The initial main sync, core CR-1…CR-4/CR-6,
allowed-value guards, persona canonicals and content's sixteen exports are
integrated. Catalog checks use core's `Program.inCatalog`/`Kind.catalogTag`;
component IDs are unique per screen and spec alert IDs are unique.

**The requested task is not complete. The following work remains; no safety
rule or property was relaxed to hide these gaps.**

1. **Canonical acceptance beyond P3 (content/model decision).**
   P3/RN passes the actual production checker and CLI. P1/P2/P5 fail
   `reviewsBeforeCommit`: `anticoagulantList` is absent from `w1Sign` and
   other ordinary signing screens, although pre-op facts are in the
   property's universal domain and the requirement applies to `signOrders`.
   Preserve the requirement; fix placements in the content lane.
   P4/NP also lacks a reachable, authorized `consentVerified` input.
   `Ehr/Check/DomainObstruction.lean:np_preop_obstruction` proves that no NP
   program required to sign orders can satisfy the current full properties:
   the domain includes pre-op facts but consent entry excludes NP. This
   requires an agreed model/workflow solution, not broadening consent
   permissions or silently narrowing the property domain. The unprojected
   physician template is not a role-authorized persona program; use exports
   under `releases/v1/personas/` when testing persona acceptance.

2. **General T1: property 6, `Completable` (check).**
   Properties 1–5 and 7–12 are fully proved for accepted programs.
   `Ehr/Check/Sound.lean:satisfies_of_checked_completable` assembles all
   twelve only when `Completable` is supplied separately. It is explicitly
   not the complete T1 theorem. Prove completion from `completeFor`, then
   state full acceptance soundness and add it to the Comparator challenge.
   Needed construction: acknowledge an existing popup; follow verified open
   goto paths while revealing ancestors; enter common valid values for
   entries/waivers; repair relevant order slots; navigate to pinned reviews;
   acknowledge the finite pending alert keys and commit. Preserve archived
   line invariants under CR-1, fixed-slot writes and prefill.
   Existing helpers cover reachable screens, replay runs, scalar value
   witnesses, same-kind linked sources, receipt hiding, guard equivalences,
   and all eleven safety clauses. `entryValuesPossible` handles allowed-value
   intersections. `repairSlots` includes fixed writers that can invalidate
   archived per-line entries or change a naloxone dose/frequency condition.
   `ValueTests.lean` rejects receipt-hidden archived-dose repair paths.

3. **Seed 13's intended failure (content/check/model).**
   All original fourteen have `¬ Satisfies` proofs, but seed 13's explicit
   theorem is `Ehr.Check.bad13_preop_not_satisfies` in `AdditionalBadProofs.lean`: it uses the
   shared pre-op display defect, not the requested CURES completeness failure.
   Thirteen original seeds have mutation-specific negative proofs in
   `BadProofs.lean`; seed 15 also has its own display proof in
   `AdditionalBadProofs.lean`.
   The intended seed-13 witness is not justified: only W1 CURES paths were
   removed. `Seed13Escape.lean` demonstrates real events that visit W3,
   obtain a prescriber CURES receipt, return, and sign the **original
   controlled order**, without changing the drug or using an exemption.
   Even deleting all CURES paths would not by itself lock the drug against
   change under the current existential completion property. Agree a valid
   mutation/goal model before asserting its intended `¬ Completable` proof.
   Seed 16 (new content scope) has rejection/mutation-rule/replay tests but
   still needs a semantic `¬ Satisfies` proof for its stranded nonzero refills.

4. **Full BRIEF T7 (check/core/app).**
   `ReplaySound.T7_counterexample_replays` and `RuleSound.T7_rejection`
   are finished fragments: a genuine successful navigation prefix, at most
   one final triggering click, and a failing executable rule. They do not
   prove that a cut path visits a violation or that every conservative
   rejection violates the named semantic property. Do not label full T7
   finished. Counterexample replay uses a fixed normal record; the public
   verdict carries no patient/user witness, so a pre-op failure is not
   demonstrated on that record merely by reaching the sign screen.
   CHECK-REPLAY in `docs/design/changes-requests.md` requests agreement on replay
   evidence/API support and conservative-vs-semantic findings.

5. **T8 as requested is false under current `Spec.Extends` (content/check).**
   `MonotonicityObstruction.lean:T8_unqualified_false` is a direct proof:
   a later-release program fully satisfies all twelve properties, but uses
   the newly available `priorAuth` kind, which the older catalog rejects.
   This counterexample does not assume general T1; its task family has no
   commits and completion is genuinely vacuous. Coordinate an agreed
   old-vocabulary compatibility condition or old-obligations projection with
   content's `Ehr/Specs/Extends.lean`. Do not assert unqualified full-Satisfies
   transport or change the content-owned relation unilaterally.

6. **Align expected seed labels without relabeling actual verdicts.**
   Current first verdicts for 1–16 are:
   `reviewsBeforeCommit`, `humanOnlyKept`, `writesOnly`, `humanOnlyKept`,
   `humanOnlyKept`, `units`, `reviewsBeforeCommit`, `humanOnlyKept`,
   `humanOnlyKept`, `wellFormed`, `noRepeatInterruptions`, `severityTiers`,
   `reviewsBeforeCommit`, `humanOnlyKept`, `reviewsBeforeCommit`,
   `reviewsBeforeCommit`.
   Seeds 7 and 16 have separately tested `completable` rule failures, masked
   by the shared earlier review failure. Seed 3 writes an unknown pounds
   element; seed 9 attempts a macro commit while the interpreter still
   generates its allergy alert; seed 10 names an undeclared alert. Preserve
   those safety semantics. `SeedTests.lean` tests every first rejection and
   replay flag, plus the actual mutation-specific failed rules where known.

## New upstream queue discovered on the final fetch

This tested snapshot does **not** include the separate rules-catalog expansion
now at `origin/lane/lean-core` `7e527f6` and `origin/lane/content` `5624528`.
Core adds temporal obligations, clinical predicates, lexical/relational
validation, expiry clocks and structured payload/display contracts; content
adds 124 catalog encodings, new artifact commits and seeds 17–24. These go
beyond the original CR-1…CR-4 / fourteen-seed handoff. Scope clarification was
requested asynchronously; absent a scope update, this iteration retained the
original queue. Do not claim that this branch covers those APIs,
the expanded 24-seed corpus, or all fifteen release/persona candidates.
Adoption will require merging both owning lanes, updating the safety proofs
for stronger guards/prefill/entry branches, extending completion checks for
the new contracts, and rerunning all validation. The original blockers above
also remain; the new content does not resolve their model issues.

## Validation and proof audit

- `cd lean && lake build` passes (201 jobs), including canonical P3 acceptance,
  all sixteen seeded rejection/replay regressions, negative proofs and CLI.
- Check-lane Comparator (`lake comparator --config Ehr/Check/comparator.json`)
  passes for eleven accepted safety clauses, conditional assembly and both
  replay/static-rule fragments. Default `lake comparator` also passes.
- Finished theorem `#print axioms` output contains only `propext`,
  `Classical.choice`, `Quot.sound` (some require no axioms).
- Full `lake check` passes: Lean's default kernel accepts the entire solution
  using only those three permitted axioms.
- Implementation files have no `sorry`, `admit`, new axioms or `native_decide`.
  `ComparatorStatements.lean` contains intentional challenge placeholders,
  excluded from implementation imports and recorded in `TODO_PROOFS.md`.
- TypeScript typechecks/lint and app/world builds pass. App 90, agent 31 and
  world 92 tests pass: 213 tests total. The world suite ran after the kernel
  audit, with its single Lake contract invocation serialized.

Use `pnpm --config.verify-deps-before-run=false` for the workspace commands.
Dependencies were installed with store `/tmp/vgi-check-pnpm-store` and
`--config.enable-global-virtual-store=false` because the default global
pnpm metadata store is read-only in this sandbox.

Never run another Lake process while the world suite runs: its contract test
starts one `lake env lean --run` process. Large kernel seed proofs can take
minutes; keep them separated from checker-rule imports to avoid unnecessary
rebuilds. Continue obeying lane ownership and the required commit footer;
push every meaningful step with `git push -u origin lane/check`.
