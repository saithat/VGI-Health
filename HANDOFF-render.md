# Render lane handoff

Worktree `/home/saithat/Projects/VGI-render`, branch `lane/render`.

## Completed and pushed in this continuation

- `97f1b38`: initial origin/main integration; resolved GenTS by preserving both exports.
- `4040ba7`: single shell banner; real goto comp IDs in nav; sidebar placement;
  human dates/reasons; captured order tables; compact clinical summaries; proofs.
- `f2c763f`: latest simulator and clinical app theme integration from main.
- `251464f`: remove repeated section/child labels, preserve exact editable values
  and supplied artifact rows, strengthen full-panel T11, regenerate P1 samples.
- `44044cf`: P1 orders/sign samples carry a synthetic prescription entered through
  actual human interpreter events. Export fails on hidden/blocked fields. Also
  preserve non-active summary statuses and don't invent "today" without asOf.
- `c235dd6`: merge main's live-backend brief and worklist-seeding integration
  (main at `80e45b9`); infra's new tests pass.

No Core/Specs/Canonical/Props/Check/Sim/app implementation was edited. App changes
are generated semantic samples and their README, explicitly requested. GenTS
changes are merge resolutions retaining both lanes' export checks.

## Contracts

- The program's banner contributes to `UiScreen.banner`, not a workspace panel.
- Non-collapsible groups tagged nav/navigator route ordinary enabled goto buttons
  to nav, using real comp IDs. Blocked/hotkey controls retain full workspace
  button metadata because the nav pair has no fields for it. Group titles remain.
- Sidebar-tagged groups/descendants route to side. Compact list rows retain all
  allergies/current meds, active unresolved problems, latest vitals per code.
  Full workspace panels retain full records, including resolved problems.
- T10 observes the actual workspace/side, nav pairs as click buttons, and shell
  banner data. Read-only banners/default summaries use an empty non-event ID.
- D2_workspace_required proves full-detail required reviews in workspace, even
  when the interpreter counts a compact sidebar as shown. T11_ui_full_info proves
  each workspace info's exact source ID and every full row. Semantic T11 also
  covers complete compact record projections; original HTML/FHIR statements stay
  unchanged. No guard, spec, safety rule or Props definition was weakened.
- Order-summary/controlled-signing tables read current State order captures,
  preserving captured dose+unit, route, frequency, duration, quantity, refills,
  directions, indication and prescriber details. Supplied artifact rows remain.
- Read-only ISO dates/date-times are human formatted without inventing timezone
  conversions; narratives beginning with a date aren't truncated. Editable values
  keep exact interpreter spelling. Reasons replace identifier tokens with labels.

## Verification completed so far

- Full Lean build passed before the second main merge (165 jobs).
- Initial render Comparator passed all 34 registered statements. Added the exact
  full-panel T11 theorem afterward: final registered count is 35 (20 semantic).
- Every final render module/proof/example compiles in an isolated `/tmp` library,
  with only propext, Classical.choice and Quot.sound in axiom audits. No holes.
- App build/lint/129 tests, agent typecheck/lint/31 tests, world build/lint/92 tests
  passed. Infra's newly merged seed tests pass.
- Refreshed initial and human-populated P1 samples each passed 15 desktop/narrow
  ARIA/visibility/contrast checks (3 intentional per-project skips), and 3 shots.
- Generated TS samples pass strict tsc. Finished render sources have no sorry,
  admit, new axioms or native_decide.

## Restart continuation

- Integrated main's 45-screen content blueprint as `bc457f2` (pushed).
- Reviewed the saved WIP. Added a full-render regression for non-collapsible
  navigator groups with a saved startCollapsed bit. Identical direct nested
  section titles now use a neutral inner heading without losing IDs/children.
- The exporter can also load historical spec/program JSON, so the previous
  132-screen / 4,382-variant corpus remains part of differential verification.
- Targeted `LEAN_NUM_THREADS=1 lake build Ehr.Render` passes with axiom audits.
  App build/lint/132 tests, agent typecheck/lint/31 tests, world build/lint, and
  infra's seven tests pass before the final asset refresh.
- **Full build is currently blocked by an owning-lane regression:**
  `Ehr/Sim/PolicyTests.lean:31–32` fails canonical task completion and its floor
  assertion after 830 seconds of evaluation. Both assertions are unchanged.
  This is recorded in changes-requests.md; render cannot edit Sim/content.
- The original background cells/sessions did not survive the restart. Cell 38
  was stopped after the full-build failure to avoid repeating that expensive
  failed build; its already-started Comparator process is finishing independently.
  Logs: `/tmp/render-{final-build,targeted-build,comparator}.log`.
- SDK symlinks still point to the authorized shared .tools SDK directories.
- A performance regression on the folded orders screen is fixed: Ctx now stores
  one view with a dependent proof that it equals the actual interpreter output.
  State/program fixture updates explicitly rebuild that cache. No theorem
  statement changed; all render modules, 35 Comparator contracts, and a kernel
  check of the full render export pass. Only the permitted three axioms occur.
  The exact same orders JSON takes 0.05 seconds instead of 40.06 seconds natively.
- Current/legacy exports contain 9,843 / 4,382 variants (all 45 / 132 screens).
  Rebuilt WASM matches all three regenerated native P1 samples. Before the cache
  rebuild, final app build/lint/132 tests and 15 browser checks passed (3 intended
  skips); world 92 tests passed. Differential shards and final assets remain.
- The aggregate CLI imports the failing Sim test. A temporary runtime-only
  native driver under `.tools/render-native` calls the exact exported Core/Render
  API functions, without implementing any clinical logic. The differential runner
  accepts its path through EHR_RENDER_NATIVE and records its binary hash.

## Exactly what is left

1. Finish Comparator, official exports for both canonical revisions, WASM build,
   four differential shards per corpus with coverage/hash audits, wasm-check,
   final app checks/screenshots and world tests. Attempt kernel check and record
   the full-build blocker without weakening the failing assertions. Commit/push
   generated assets and the final handoff with the required co-author footer.
2. **App owner:** paint nav pairs as clickable buttons with Event.click(comp),
   open available navigator groups by default, and include entries in fidelity.
   The old screen-ID/active-screen accordion default otherwise hides all entries.
   No new Core navigation Event is necessary. Request is in changes-requests.md.
3. **Core/content:** InfoSpec still lacks verbatim text. Add optional text and
   provide the exact 21 CFR 1311.140(a)(3) notice, then render its body verbatim.
   Current source is an authoring instruction. Render must not fabricate it.
4. **Checker/content:** integrate/certify D5 with the real interactive projection.
   The new 45-screen overview diagnostic passes; it does not certify that projection.
5. **App/infra:** prior exact Facts.patientId Synthea wristband-token request
   remains. Native/WASM acceptance/rejection stays in the differential suite.

6. **Sim/content:** repair the canonical PolicyTests regression above; full build
   and whole-project kernel check must pass after that integration.

All cross-lane requests are in docs/design/changes-requests.md. App's primary
compact-list-cell painting is resolved by main d3e0860. No unfinished render proof.
