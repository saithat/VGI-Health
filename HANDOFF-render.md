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

## In-progress verification (do not start a second Lake process)

The first post-simulator-merge `lake check` is still compiling
`Ehr/Sim/PolicyTests.lean` (real CPU progress, not a stalled process). Root check
session is 67513; a background functions cell **99** owns its polling. That cell
will sequentially run the final `lake build`, **make wasm**, official API/P1 sample
export, copy the three samples, and a fresh `lake check`. Do not poll the original
session separately or start another Lake process while cell 99 is active.

Logs: `/tmp/render-lake-check.log`, then `/tmp/render-final-{build,wasm,export,lake-check}.log`.
The latest `/tmp/render-final-api` already has the complete 4,382-variant corpus
covering 132 screens, clinical regressions and populated P1 input/sample JSON.
The queued official export refreshes it after the build. SDK symlinks already
point to `/home/saithat/Projects/VGI-wasm/.tools/{emsdk,lean4,libuv}`.

## Exactly what is left

1. Finish the queued official build/WASM/export/kernel-check pipeline. Re-run the
   final 35-statement Comparator. Run all four Node differential shards, audit
   disjoint coverage of all 4,382 indexes and one WASM hash, and make wasm-check.
   Re-run app build/lint/tests on final assets plus the three sample browser checks.
   Commit/push generated WASM/assets and final handoff with Co-Authored-By footer.
2. **App owner:** paint nav pairs as clickable buttons with Event.click(comp),
   open available navigator groups by default, and include entries in fidelity.
   The old screen-ID/active-screen accordion default otherwise hides all entries.
   No new Core navigation Event is necessary. Request is in changes-requests.md.
3. **Core/content:** InfoSpec still lacks verbatim text. Add optional text and
   provide the exact 21 CFR 1311.140(a)(3) notice, then render its body verbatim.
   Current source is an authoring instruction. Render must not fabricate it.
4. **Checker/content:** integrate/certify D5 with the real interactive projection;
   the old workflow overview still fails group limits. Nothing is truncated.
5. **App/infra:** prior exact Facts.patientId Synthea wristband-token request
   remains. Native/WASM acceptance/rejection stays in the differential suite.

All cross-lane requests are in docs/design/changes-requests.md. App's primary
compact-list-cell painting is resolved by main d3e0860. No unfinished render proof.
