# Render lane handoff

Worktree `/home/saithat/Projects/VGI-render`, branch `lane/render`.

## Completed and pushed

- Reviewed saved WIP `f58a24e`; retained the earlier shell, clinical summary,
  captured-order, human-date and full-panel proof work.
- `bc457f2`: merged main's content blueprint (45 canonical screens).
- `d7ed156`: finished saved navigator regression, removed identical nested
  section headings, and preserved the historical corpus in the exporter.
- `dadb423`: compute the interpreter view once per render, with dependent
  equality witnesses `Ctx.v_exact` and `Ctx.rebuild`. Every registered theorem
  statement is unchanged. Native orders rendering improved from 40.06 s to
  0.05 s with identical JSON. Rebuilt WASM and populated P1 samples.
- `670a748`: merged main's live app/dashboard work; resolved its generated
  manifest conflict by rebuilding WASM.
- `1108805`: bounded differential-worker memory and added coverage/hash audits.
- `1f3ebe0`: merged main's final visible-control acceptance criterion.
- `badeb5c`: committed the complete verification receipt and exact owner blockers.
- `f313bab`: merged main checkpoint `1123612` (dashboard trajectories). No Lean,
  WASM or corpus input changed; app build/lint/152 tests, trajectory tests and the
  15 P1 browser checks passed again.
- Final verification is recorded in `lean/Ehr/Render/validation.json`.

No Core/Specs/Canonical/Props/Check/Sim/app implementation was edited. App
changes authored here are generated WASM assets, P1 semantic samples and their
README, as requested. All other-lane source changes arrived through main merges.

## Preserved contracts

- One shell banner; program banners are excluded from workspace/side. Nav-tagged
  non-collapsible groups contribute real shown, enabled goto component IDs to
  nav. Blocked/hotkey controls keep their complete workspace button metadata.
- Tagged sidebar components render in side. Compact list rows preserve every
  allergy/current medication, unresolved problem, and latest vital per code.
  Full workspace panels retain full records, including resolved problems.
- D2 requires complete review rows in workspace, even when Core counts a compact
  sidebar as shown. T11 preserves each full panel's exact source ID and rows.
- Signing tables use this episode's captured medication lines, with dose/unit,
  route, frequency, duration, quantity, refills, directions, indication and
  captured prescriber details. Supplied artifact rows remain intact.
- Read-only dates are human formatted; editable values retain exact interpreter
  spelling. Reasons use spec labels. Repeated direct parent/child headings use
  a neutral inner label without losing source IDs or children.
- Cache witnesses require the exact current interpreter output. State/program
  fixture updates rebuild the cache; stale caches do not typecheck. No property,
  guard, spec rule, or theorem statement was weakened.

## Final verification

- `LEAN_NUM_THREADS=1 lake build Ehr.Render`: **passed**, 32 jobs.
- Render Comparator: **35 contracts passed**; all 35 statement signatures match
  saved WIP `f58a24e`. Kernel check of the complete render export passed.
  Axiom audits use only propext, Quot.sound and Classical.choice. Finished render
  modules contain no sorry, admit, new axioms or native_decide.
- `make wasm` and `make wasm-check`: **passed** with the authorized SDK symlinks.
  Tested WASM SHA-256:
  `7a67c34a907a7a30724eb99e51e7c011fc137de01db31b3c92a17ebf1be083bc`.
- **14,225 native/WASM variants passed**: all 9,843 variants of the 45-screen
  current canonical plus all 4,382 variants of the 132-screen historical
  canonical. Four shards per corpus; all original state bodies/indexes, every
  expanded scan probe, disjoint coverage, and one WASM/native hash audited.
  All 174 Synthea bundles match; RN wristband acceptance/rejection is exercised.
- App build/lint/**152 tests**, agent typecheck/lint/**31 tests**, world
  build/lint/**92 tests**, infra **7 tests**, generated-sample strict tsc: passed.
- Dashboard trajectory replay also passes 2 node tests and 1 browser smoke test
  on main checkpoint `1123612` (all 424 saved tasks remain available). Its test
  screenshot is preserved at `/tmp/render-final-trajectories.png`; the app-owned
  tracked image was restored after the test.
- The three populated P1 samples pass **15 browser checks** (3 intentional skips)
  and **3 screenshot checks** (6 PNGs). Rooming/orders/sign images were reviewed,
  including the populated signing table. Screenshots are under `app/shots/`.
- **Full project Lean build fails** the unchanged canonical task-completion and
  floor assertions at `Ehr/Sim/PolicyTests.lean:31–32`. The initial render failure
  during iteration was fixed and all render modules subsequently rebuilt. The
  whole-project kernel check remains blocked by that owning-lane build failure;
  the successful render-export kernel check is not a whole-project claim.

No render build/test process remains running. All eight differential shards and
both auditors finished successfully. Logs and reports are `/tmp/render-*`.

## Reproduction notes

The aggregate CLI imports the failing Sim test. The differential tests therefore
use a runtime-only native driver calling the **exact exported Core/Render API
functions**, with no replacement clinical logic. Build it with
`lean/Ehr/Render/build-native-test.sh` (one Lake process at a time). The tracked
script's driver source matches the tested source byte for byte.

Set `EHR_RENDER_NATIVE="$PWD/.tools/render-native/.lake/build/bin/render-native"`.
`prepare-shards.py` creates the four memory-bounded inputs from each complete
`states.json`; `test-wasm.mjs` accepts EHR_RENDER_SHARD_COUNT/INDEX/INPUT/REPORT;
`audit-shards.py <corpus-dir> <four-reports>` checks the exact original bodies,
scan probes, complete disjoint indexes and current binary hashes. Both the
current and historical native/WASM inputs remain in `/tmp/render-{final,legacy}-api`.
The historical spec/program are from `f58a24e`. Current P1 samples come from the
complete current release and actual checked human enter events.

For pnpm 11 in this sandbox, set
`pnpm_config_store_dir="$PWD/.tools/pnpm-store"`; its default external SQLite
store is read-only. Shared SDK links remain under this worktree's `.tools`.

## Exactly what is left

1. **Sim/content:** repair `PolicyTests.lean:31–32`, then pass the full Lean build
   and whole-project kernel check. Compiled replay of the unchanged fixture
   reports missing `ca-title22-70223-hp-24-hours:temporal026` / `:temporal027`,
   followed by the structured-display/action-label hard stop and an unreachable
   goal. Actual popups are 0 versus floor 1. Supply truthful episode context and
   required data; never fabricate completed H&P evidence or weaken assertions.
2. **App:** paint nav pairs as buttons dispatching `Event.click(compId)`, open
   available groups by default, and observe their real entries/events in fidelity.
   The current painter still treats component IDs like screen IDs and uses text.
3. **Core/content, then render:** add literal InfoSpec text, supply the exact
   21 CFR 1311.140(a)(3) notice, and render its body verbatim. The reviewed quote
   is in changes-requests.md, but the compiled spec still has no text member.
4. **Checker/content:** certify D5 against the real interactive projection. The
   45-screen workflow overview diagnostic passes; it does not certify that nav.
5. **App/infra:** complete the exact Facts.patientId Synthea wristband-token
   integration. Native/WASM acceptance/rejection is verified; this is an app/data
   integration request, not a new validator or permissive token fallback.
6. **New main requirement (render/app):** define/prove Lean `aria : UiScreen →
   AriaNode` and have app fidelity consume it (BRIEF `f60a795`). Existing proofs
   cover UiScreen and expected ARIA remains TypeScript. This new work is marked
   not started in TODO_PROOFS.md; no unfinished proof declaration is hidden.
7. **New main requirement (app/core/content):** implement `audit:buttons`,
   `docs/audits/buttons.md` and the regression gate from BRIEF `2710777`. The
   package script does not exist yet. Keep shown components and D3/T10 semantics
   intact while implementing real actions or removing them in the owning source.

All cross-lane requests and the concrete simulator diagnosis are in
`docs/design/changes-requests.md`. The requested render visual-fix verification,
WASM rebuild, sample regeneration and both complete corpus audits are finished.
