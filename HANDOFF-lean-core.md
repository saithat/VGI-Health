# Handoff: lean-core

Worktree: `/home/saithat/Projects/VGI-lean`; branch `lane/lean-core`.
Read this first. This continuation fetched and fast-forwarded main to `fe475fa`.
The optional composite-format checkpoint is `133e364` (pushed).

## Delivered in this continuation

- Init-only `ComponentDef { name, params, body }` and
  `Program.componentDefs : List ComponentDef := []`.
- Custom Program JSON preserves SOURCE definitions, accepts omission of the new
  field, and omits empty definitions. Existing generated JSON samples are
  unchanged, preserving legacy source/hash encodings. Malformed definitions
  remain parse errors. No new clinical/backend behavior is active yet.
- GenTS exports 138 types/42 real JSON samples, with optional `componentDefs`.
  Core guards cover definition/source round trips, legacy omission and malformed
  field rejection. The feature corpus now includes an unused-definition case.
- Rebuilt and installed WASM assets with the supplied `.tools` symlink to
  `/home/saithat/Projects/VGI-wasm/.tools`; binary is 1,924,963 bytes.
- The proposed constructor/expansion implementation is preserved in
  `lean/Ehr/Core/composites-pending.patch`. `git apply --check` passes. Applying
  the patch and running `cd lean && lake build Ehr.Core.Tests` passes. It includes
  `Kind.use`, total Init-only `Program.expand`, checked load helpers, a
  `wellFormed` error verdict helper, six candidate theorem/axiom audits, and
  Tiny vitals-strip guards and a satisfiable expanded witness. There are no
  `sorry`, `admit`, new axioms or `native_decide` in this patch.

**The expansion patch is NOT active in this checkpoint. Composite execution is
unfinished.** It was kept as a concrete reviewable patch so the pushed branch
continues to build while respecting the explicit prohibition on editing Render.

## Integration blocker and scope

Activating `Kind.use` makes `lean/Ehr/Render/Page.lean:157` fail its exhaustive
Kind match. The owner explicitly said not to edit `lean/Ehr/Render/**`, so no
Render source was edited. The exact dependency and presentation-key request are
in `docs/design/changes-requests.md`.

This main checkout also has no checker/deploy or simulation implementation/CLI
commands; those still exist on the owning branches. They were not merged or
edited without authorization. Scope questions about API/integration files and
owning-lane merges were sent to the user; no answer had arrived at this checkpoint.
The explicit GenTS and generated-WASM instructions were carried out.

## Verification of the buildable checkpoint

- `cd lean && lake build`: pass (143 jobs).
- `lake check`: pass, including the final repeat; default kernel accepts,
  using only `propext`, `Quot.sound`, and `Classical.choice`.
- `lake comparator`: pass, all 18 original statements, including final repeat.
- T0, T2, T3, T6, A2 and A4 remain proven, with unchanged statements and only
  permitted axioms. The earlier strengthened `commitGuard_iff` remains DRAFT
  for owner review, as in the previous handoff.
- `lake exe gents` and strict generated-sample TypeScript check: pass.
- Workspace build/lint and agent typecheck: pass.
- Agent tests: 31/31. World tests: 92/92. App: 89/90.
- App's existing main-branch failure: `tests/app.test.tsx:25` expects 16 bad
  programs, while the merged content catalog contains 24. The real-WASM fixture
  projection test passes. An owning-app change is requested; the test was not
  weakened or edited here.
- `make wasm` and `make wasm-check`: pass.
- `node lean/Ehr/Core/test-wasm-features.mjs`: pass, 255 native/WASM comparisons
  across all 85 cases (the previous 84 cases were retained).

The pending expansion patch has only targeted build/guard/axiom verification;
it has NOT passed a full build, `lake check`, Comparator, or WASM execution with
expansion enabled. Its proof integration is tracked in `TODO_PROOFS.md`.

## Exactly what's left

1. Render owner supplies the new Kind compatibility arm, or the user explicitly
   authorizes that edit. Coordinate it with applying
   `lean/Ehr/Core/composites-pending.patch` so the full build stays valid.
2. Wire source expansion into **all** API/native/WASM init/step/view/batch paths.
   Core's pending `Composite.loadInit/loadStep/loadView` fail closed and use the
   existing interpreter on expansion. Existing `Ehr.Api` entry points are still
   unchanged and do not yet call these helpers.
3. Check/deploy owners expand candidate, previous and canonical programs before
   evaluating properties, reject expansion failures as `wellFormed`, and hash
   and store the SOURCE program (including definitions). Integrate the actual
   checker `Satisfies` with expansion and finish its proof bridge. The pending
   generic property lift is not a claim of checker certification.
4. Sim owner expands before simulate/min-clicks, including policy/state-space
   inspection. Render owner expands before render/render-screens and propagates
   `composite:<name>` into UiNode as a presentation key. Do not edit Render
   without the requested authorization.
5. Once active, add the vitals-strip source/use/expanded examples to GenTS's
   samples and regenerate; verify agent/app schemas preserve definitions/args.
6. Run the full build, kernel check, Comparator and audits with expansion active;
   retain T0/T2/T3/T6/A2/A4 and every existing safety rule. Rebuild WASM again and
   add native/WASM coverage for successful uses and expansion failures. Current
   installed assets cover only the optional-format checkpoint.
7. App owner fixes the catalog-count baseline assertion and reruns all TS tests.
8. Update this handoff to the resulting exact remaining work, and push each
   meaningful step with the required Codex co-author line.

The previous handoff's five M rule groups, interpreter/API, date-parser fix and
prior proof milestones remain intact. The original L-group implementations are
still intentionally unrequested; their designs and all earlier owning-lane
integration requests remain in `docs/design/changes-requests.md`.
