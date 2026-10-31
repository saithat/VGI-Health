# App lane status

## Demo dashboard (Oct 31)

`/dashboard?run=mock` implements all six decision-transparency views, plus cost
curves and a recorded try-to-break-it panel. Evolution nodes link to full Why
records; failed proposals and release rechecks link to event-by-event
counterexamples. Screens in counterexamples, paired task replay, divergence and
migration reports all use `Interp.init/step/render` and the existing painter.
The fixed EHR stylesheet and generic painter are unchanged by this dashboard.
Dashboard styles are scoped away from EHR controls and table contents.

The app imports `DecisionRecord`, `Candidate`, Program, DayResult, certificate
and event validators directly from `agent/src/schema.ts`. A Vite plugin serves
`runs/` and indexes agent directories; production builds copy their JSON plus a
static dashboard directory index. Run and view selections are in the URL.
Read-only static run requests have a dedicated, path-constrained data boundary;
all Medplum access remains in its original data module.

`runs/mock/` is an authored, prominently labeled MOCK run with five workflows,
three seeded bad proposals, both vendor releases, five distinct migrations,
P3's rejected collapsed drawer then repaired MAR, and a recorded break attempt.
Every certificate, decision and saving is illustrative; no checker, simulator,
LLM or clinical write occurred. Regenerate with `pnpm --filter app mock-run`.

The replay seam is injectable through `<Dashboard interpFactory={...} />`.
The explicit mock adapter lives in `src/mock/replay.ts`; a real run never falls
back to it. `replay.json` supplies opaque spec/bundle/user contexts and paired
same-task traces; version/spec-specific contexts are supported. Its cumulative
`klmDeciSec` is distinct from agent trace `t` (shift clock). Input contract and
WASM wiring example are in README. The pending WASM lane can plug in its Interp
without changing views, agent schemas, or the painter.

Cost charts use only `measured.test`, never evidence or validation values.
Clicks, keys, scrolls and KLM, their separate percentages above floor, and
popups/task are directly labeled in persona colors, with busy/quiet day labels
and a complete accessible data table. The break panel is explicitly recorded
replay: audience text is never misrepresented as a fresh checker result.

Validation: required app build/lint/test pass (87 Vitest tests). The dashboard
Playwright smoke passes at desktop and 390px widths, opens every view, steps a
counterexample and paired trace, checks five final UIs and ten migration
screens, and displays the recorded break verdict. Evolution, paired replay and
cost charts have also been rendered for visual review. No agent/, lean/, or
wasm/ files were edited by the dashboard implementation.

Production smoke: served `app/dist/` with a plain Python static server, opened
`/dashboard/` with all external requests blocked, and rendered the release view's
ten EHR screens successfully. The build has no dashboard CSS syntax warnings;
remaining warnings concern dependency annotations and the existing bundle size.

## EHR painter integration

Implemented owner decision (Oct 31): the EHR route is now
`Interp.render(spec, program, bundle, user, state) → Html JSON → paint`.
The 82-line generic painter uses the exact §9 tag/attribute/class vocabulary,
constructor-keyed Lean JSON, generated Event/Value types, and no clinical or
component-kind logic. It drops unsupported vocabulary with development reports.
The session forwards opaque state and bundles; no runtime tree validator,
certification check, guard, or clinical decision is introduced in the real seam.
The zod tree validator runs in the offline release check and tests.

The single `src/ehr.css` defines exactly the 58 §9.1 classes, with a dense banner,
sidebar, navigation, forms, record tables, trend, alert and action styles. A parsed
CSS policy test compares directly with the design document and rejects hiding,
clipping, zero sizes, negative offsets, positioned overlays and other concealment.
Modal styling stays in document flow. The old Mantine EHR renderer, info adapters,
chart shell, stylesheet and renderer tests are removed. Mantine/Medplum components
remain for sign-in and the development persona picker.

The explicitly selected **MOCK** interpreter emits complete W1 page trees with
all panel rows and trend points. Its component interpretation lives only in
`src/mock/page.ts`; its legacy ScreenView/spec/state fixtures remain private to
the mock. It supports navigation, editing, tabs and group expansion. Signing,
receipts, confirmation, clinical alert evaluation and macros still require the
real Lean interpreter; the mock labels itself uncertified and does no writes.

Validation:
- `pnpm --filter app build`, `lint`, and `test` pass.
- Random tree fidelity (250 cases), all tags, every event/value kind, whitelist
  dropping, CSS policy, session forwarding, W1 navigation, and data boundary tests.
- `screen-check` passed 15 W1 trees at 1440px and 390px widths, including history,
  collapsed reconciliation and expanded laboratory orders (30 screens).
- Browser regression tests detect zero bounds, off-page content, transparency,
  subminimum fonts and occlusion. A required hidden-input fixture returns exit 1.
- Main-route Chromium screenshot reviewed locally. Every check uses the same
  painter and stylesheet imports as the main route.

Integration remaining (other lanes):
- `origin/lane/render` is not published as of the latest fetch. Once it exports
  Html/Tag/Attr in `lean/generated/ehr-types.ts`, merge it and replace the clearly
  marked temporary Html type mirror in `src/ehr/html.ts`. Event/Value and the
  session's StepOutput already use generated types. No Lean types were edited.
- Wire the real WASM `init`, `step`, `view`, `render`, `facts` exports through
  `Interp`, and supply deployed program/spec/user/bundle inputs. Current WASM
  package exports only the earlier step spike. The mock is never a fallback.
- Deploy pipeline must export every candidate screen/state/sample-patient page
  tree and run `pnpm --filter app screen-check <files…>` before publishing.
  The script and browser failure gate are implemented; pipeline ownership is
  outside this lane. See README for browser installation and reproducible samples.
- Live authenticated Medplum still needs local credentials and has not been
  exercised here. Tests cover its existing pagination and offline data boundary.

Owner review: temporary app-local Html mirror requested by this task; no Lean
specs, properties, data-format declarations, or Comparator statements changed.
