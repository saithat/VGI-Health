# Check lane handoff — remaining work

Worktree `/home/saithat/Projects/VGI-check`, branch `lane/check`.

The requested task is **not complete**. No property, spec or safety rule was
weakened. Main's expanded legal catalog, all 24 seeds and five core language
features have been merged; main was fetched again after those features landed.

## Remaining work

1. **All 15 persona certifications (content).** The actual CLI rejects every
   P1–P5 candidate in v1, v1.1 and v2. `docs/design/changes-requests.md` section
   CHECK-2026-10-31 enumerates all 33 missing screen/commit/review pins per
   release. First failures: anticoagulantList on w1Sign for P1/P2/P4/P5;
   currentMeds on w3SuicideAssessment for P3. The NP pre-op consent permission
   obstruction also remains. Only content may repair these placements/model
   issues. The formerly passing P3 regression now requires rejection of the
   actually defective expanded canonical, explicitly linked to the request.

2. **General T1 completion (check).** Safety clauses 1–5 and 7–12, expanded
   commit contracts, scalar value witnesses and successful human entry steps
   are proved. `satisfies_of_checked_completable` is still CONDITIONAL.
   Prove arbitrary accepted-program completion from `completeFor`: navigation
   and ancestor reveal; initialization/prefill and archived-line invariants;
   fixed/current slot repairs; common allowed values and waivers; final
   reviews; finite alert acknowledgment and commit. Then assemble T1 and add
   its actual statement to Comparator. Do not claim a conditional theorem is T1.

3. **New-feature completion/phase coverage.** `CommitContracts` and
   `commitContracts` cover all five new guard families for real interpreter
   executions. The checker conservatively refuses unsupported universal
   completion claims involving external temporal evidence, missing/expired
   clocks, absent structured payloads, validators/relational dependencies, and
   capture-dependent per-line clinical predicates. `additionalCompletionIssue`
   explains why; exact action labels/default declarations are checked too.
   See CHECK-CORE-CONTRACT-DOMAIN: arbitrary records in `Completable` only
   assume medication scans are possible. UI actions cannot fabricate trusted
   evidence. Coordinate total lawful completion/refusal goals and evidence
   domain/route contracts; do not weaken guards or assume sample success is
   universal completion. Record-only clinical conditions retain conservative
   true/false/unknown coverage. Phase-wide display coverage needs integration.
   Before display contracts are adopted, extend `Spec.Extends` to preserve its
   new `displays` field and extend T8 to the five extraGuard contract families;
   current T8 covers the requested original entry/review/human/unit/alert
   projection. The concrete v1/v1.1/v2 specs have no display contracts.
   See CHECK-EXTENDS-DISPLAYS.

4. **Full T7 requires a contract decision.** The existing replay and failed-rule
   theorems remain proved, but full semantic rejection soundness is false for
   the conservative checker. `RejectionObstruction.T7_semantic_rejection_false`
   gives a fully Satisfies candidate rejected only because an unused reference
   workflow was removed. Keep the safety rule. Distinguish conservative
   certification failures from demonstrated semantic violations, or obtain
   owner approval for the missing trusted workflow-retention property.
   Public counterexamples still lack patient/user witnesses; a normal replay
   record does not demonstrate a pre-op-conditioned review failure. Cut paths
   also need actual violation evidence. See CHECK-T7 and CHECK-REPLAY.

5. **Intended seed-13 and seed-16 completion proofs.** Seed 13 still has the
   real cross-workflow CURES receipt escape (`Seed13Escape.lean`, retaining the
   original controlled drug). Its negative theorem uses the unrelated pre-op
   review defect and is labeled accordingly. Seed 16 is rejected and replay
   tested but still needs the intended semantic stranded-refills proof.
   All eight new legal seeds have mutation-specific negative implementations.

6. **App verdict generation (app ownership).** The app's
   `pnpm --filter app verdicts` script omits required `--canonical`; it also
   incorrectly labels exit-1 violation JSON as a checker failure. The exact
   minimal patch is in changes-requests.md. The async ownership-exception
   question remains pending; do not assume silence is approval. The stale
   16→24 assertion was fixed upstream and all 129 updated app tests now pass.
   The unchanged app verdict file remains a placeholder. The script's 70
   invocation failures were saved in `/tmp/vgi-check-script-failure-verdicts.json`
   and were not published as verdicts. Regenerate through the corrected real
   script after approval/owning-lane repair.

7. **D5 canonical navigation fixes (content/render).** The checker integration
   is now complete: `NavigationSane` and `accepted_navigation` inspect the real
   `Render.uiNav`, with a strict rule for unique labels, twelve-group/item
   limits and no orphan screens. Current canonical groups W1/W3/W6 contain
   14/17/18 screens respectively. Fix grouping/presentation without relaxing D5.
   New main also supplies optional source-only component definitions; runtime
   `use`/expansion integration is still a core pending patch, not something
   check claims to support before its owning API lands.

## Completed in this continuation

- T8 old-obligations projection, directly from actual checker acceptance:
  `T8_checked_old_obligations`, `T8_v1_to_v1_1`, `T8_v1_1_to_v2`.
  Does not assume unfinished T1. Includes the actual old static human/unit/alert
  predicates, using a proved old-element lookup preservation lemma.
  `T8_unqualified_false` is retained.
- D5 acceptance soundness over the actual semantic renderer navigation.
- Completion reachability is cached once per check. `cached_completion_eq`
  proves exact equality with the original algorithm for every program.
  Popup pair checks filter request components first; `filteredPopupRequests_iff`
  proves exact equivalence with the original safety property.
- Core guard/clinical-alert safety proof compatibility and expanded contract
  safety, plus actual human-entry construction lemmas.
- Seeds 8/9 timeout fix: closed local component/macro witnesses compile in
  10 seconds; no heartbeat increase or native_decide. Other static seed proofs
  have also been split into small, closed structural witnesses.
- Full current validation and final commit hashes: to be filled after the
  running serialized Lean build, Comparator and kernel checks finish.

## Working rules

Edit only Props/Check (plus explicitly authorized root notes and generated app
verdict output). Content, core, app and render requests go in changes-requests.md.
Use `pnpm --config.verify-deps-before-run=false`. Never overlap Lake processes;
world tests invoke one Lake process. Commit with the required Codex coauthor
footer and push each meaningful step to `origin lane/check`.
