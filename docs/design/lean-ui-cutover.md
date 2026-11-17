# Plain DOM clinical cut-over checklist

[Painter and exhaustive widget inventory](../methods/lean-painter.md) ·
[Layout contract](../methods/ui-library.md) ·
[Rich displays and validation](../methods/painter-parity.md)

The clinical screens now open on `/lean.html`: Lean display parts and checked
layout geometry painted with native DOM controls. `/`, `/ehr` and
`/?workflow=chart` redirect there with their parameters, and the MAR dose list
opens each scheduled dose there. The React encounter/login shell
(`/?shell=encounter`), the standalone ADT route (`/?workflow=adt`), offline
replay (`?mode=replay`), the dashboard and the browser keep their renderers.
Application and WASM hashes have changed; retained certificates are
historical until rebound.

Browser regressions named below live in
[`cutover.pw.ts`](../../app/src/lean-ui/cutover.pw.ts) (fixture host, no
service) and [`cutover-live.pw.ts`](../../app/src/lean-ui/cutover-live.pw.ts)
(isolated real commit service: native replay, guards, Postgres). Commands are
in [painter-parity](../methods/painter-parity.md#cut-over-validation).

## Required before switching the clinical entry points

- [x] **Structured lists and tables.** Bounded paging; a record's
  single-button actions sit in its row; a click, Enter or Space on any cell of
  a record with one navigation action sends that action's click; arrow,
  Home/End, Control+Home/End and Page Up/Down move a roving focus through
  `Keyboard.grid`; in a bounded list, Page Up/Down at the edge of the page
  shown send the list's own previous/next page event, and focus keeps its cell
  across the patch. Confirmation (`confirm`) and acknowledgment (`ack`) stay
  separate events; an open alert blocks confirmation and Escape sends nothing.
  Evidence: `tables at …` (three viewports) and `confirmation and
  acknowledgment stay separate events`; page keys are a new Lean key pair
  (`grid_preserves`, `grid_page_keeps_column` in
  [Keyboard.lean](../../lean/Ehr/Layout/Keyboard.lean)).
- [ ] Improve dense geometry for large clinical boards. The complete two-patient
  note task can use the checked fixed-shell fallback; interaction works, while
  the large-board appearance remains simpler. Keep the existing admission limits.
- [x] **Tabs and panels.** Each tabs node has an accessibility-only `tablist`
  owning its tabs and a `tabpanel` labelled by the selected tab and owning the
  shown body; only the selected tab is in the Tab order and controls the panel.
  Arrows/Home/End move focus (manual activation); Enter/Space send
  `selectTab`; after the patch, focus stays on the activated tab and the panel
  relationship follows the selection. Evidence: `tabs: tablist and panel
  relationships …` at all three viewports.
- [x] **Boards** (`lean.html?patients=<Patient.id>,<Patient.id>`), at
  1440×900, 1280×800 and 1920×1080. Live service: repeated component IDs
  (one control per pane, each patient-bound), a pane offers only its own
  patient, separate sessions (signing patient A leaves patient B at version
  1), drafts kept across navigation in one pane while the other navigates,
  signing and navigation (`P2 board at …`). Fixture host: cross-patient
  modal ownership (the owning pane's acknowledgment is the only enabled
  action; Tab stays inside), the pinned urgent rail inside the viewport, and
  pane-scoped events for repeated IDs (`board fixture at every desktop size`).
  The live board service had no urgent or modal state, so those two are
  checked on the fixture only; host refusal of a queued foreign-pane event is
  a unit test (`app/tests/lean-board.test.ts`).
- [x] **MAR through the shared dose authority**
  (`marPatient`/`marRelease`/`marWorkflow`). Blocked commit with its complete
  reason before scanning; all five documented outcomes (held, refused, not
  given, delayed, given) persisted with increasing versions; a second
  administration of a given dose refused (`409 dose_already_administered`);
  a stale attempt from a second nurse's screen refused with a refresh and no
  write; a rapid double activation commits once; a high-alert dose refused
  without consent, refused when the documenting nurse consents for the
  cosigner, accepted after the second nurse (RN2) cosigns with her own
  authentication, with one `doubleCheckCosign` event; the urgent high-alert
  notice stays pinned in the viewport. Evidence: the three `MAR on
  /lean.html` tests. Notification streaming is substituted in these tests;
  the second nurse's automatic refresh uses the same session code and is
  covered by the opt-in Keycloak spec (`app/e2e/mar-service.spec.ts`), which
  was updated for the Lean page but not run here.
- [x] **Charts and timelines** against their complete values: trend point
  labels, axis endpoints and order equal the source records; an unplottable
  value stays in the table; growth labels are recorded ages and
  measurements; dated timelines keep exact timestamps, sources and undated
  entries; plain timelines keep source order (`charts and timelines …`).
- [x] **Custom families and fixed-shell fallback** on the rich shapes: an
  explicit dense family and the fixed shell are each admitted by Lean for
  every rich fixture at all three viewports with complete text; a family for
  another shape is refused, with no host fallback (same test). Bound rich
  marks are checked at runtime (G1–G11); they do not acquire the fixed-shell
  universal theorem by sharing its painter.
- [x] **Sign-in, sign-out and return URLs** on `/lean.html` against the local
  synthetic OIDC issuer used by the tests: PKCE with the exact registered
  `/lean.html` callback, the page address with its parameters restored after
  the callback (also for board and MAR URLs), silent restore on reload, Sign
  out returning to `/lean.html`, and no silent login afterwards (`sign-in,
  return URL and sign-out`). The realm template lists `/lean.html` for every
  local origin. Provisioning deployed identity systems is out of scope.
- [x] **Viewport contract (decided).** Desktop only: 1440×900, 1280×800 and
  1920×1080. There is no mobile, reflow or 200% text-resize contract; other
  sizes refuse interaction until a supported size is restored.
- [ ] **Encounter/login shell and standalone `/adt` (open).** Both stay on
  their current React renderer, unchanged: `/?shell=encounter` and
  `/?workflow=adt`. Shared dashboard/browser UI helpers keep their consumers.
- [ ] **Validate the deployed release and workload through the Lean page.**
  A one-day replay for P1–P5 ran with `run-days --screens lean` and no model
  call, and the full accessibility/screen audit pair ran once; results and
  failures are in [workload through the Lean page](#workload-through-the-lean-page).
  A deployed release was not validated.
- [x] **Switch the default clinical entry points** (this change); removed
  obligations and their replacements are [listed below](#removed-and-retained).
- [ ] Rebuild the application and WASM, record the new hashes, and rebind the
  retained run evidence against the final implementation. The WASM is
  rebuilt; recertification and rebinding follow a fresh recording and are not
  part of this change. Do not overwrite historical certificates or claim they
  certify this implementation.

## Removed and retained

Only obligations with a named replacement were removed:

| Removed | Obligation | Replacement |
|---|---|---|
| `/`, `/ehr`, `/?workflow=chart` opening the React live chart | Patient search and selection, chart session, entry, drafts, alerts and signing | `/lean.html` with the same live session and commit service: P1/P3 tasks in `workflows.pw.ts`, the board and MAR tests above |
| The MAR dose list's React chart (`MarApp`) | Scheduled-dose administration, outcomes, stale/duplicate handling, cosign consent use | The Lean MAR route; the dose list, its sign-in and the cosign button remain |
| `run-days` defaulting to the browser screen gate | Nightly screen admission for simulator and recorder runs | `--screens lean` by default (Lean G1–G11, density limits, dense/fixed-shell families); a resumed run keeps its recorded gate; single-night reruns use the run's gate |

Retained, because they still have consumers:

- The React clinical renderer (`app/src/ehr/ui`): the encounter/login shell,
  offline replay (`?mode=replay`), dashboard replay and trajectory frames,
  the browser's revision views, and `screen-check.html`.
- The browser screen gate (`app/scripts/screen-check.mjs`,
  `agent/src/screencheck.ts`): `--screens browser` runs, which archive/cadence
  and generator-only protocols require explicitly; `try-to-break-it`;
  retained-run recertification and rebinding; the accessibility/screen audit
  pair; the React e2e specs, which now select `?shell=encounter`.

## Workload through the Lean page

Results of this change's validation run (see the parity page for commands):

- One-day replay, P1–P5, `--screens lean`, replay backend: _pending_.
- Accessibility/screen audit pair (templates, then personas): _pending_.

## Implemented prerequisites

The painter shares sign-in and the existing live session/commit path. It serializes
clinical events, preserves focused editors, uses Lean tab/listbox/alert-dialog
keyboard transitions, pins the urgent strip, and refuses unsupported viewports.
The rich-family path adds patient-scoped pane controls and modal ownership,
medication day/hour cells, note/folder cards, plotted trends/growth reference
curves, timeline axes, banner-run decoration, severity marks and hotkey activation.
The [inventory](../methods/lean-painter.md#widget-inventory) is the row-by-row
status record; [implementation and validation](../methods/painter-parity.md)
states limitations and reproducible commands.
