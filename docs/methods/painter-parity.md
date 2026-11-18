# Rich displays on the Lean clinical page

[Painter inventory](lean-painter.md) · [Remaining cut-over checks](../design/lean-ui-cutover.md)

The Lean clinical page paints patient boards, medication time grids, note and
folder cards, trend/growth plots and timeline axes using Lean display parts.
It retains the original info children and complete values below the rich view.
It is the default clinical entry point; the React renderer remains for the
encounter shell, ADT, replay, the dashboard and the browser
([cut-over](../design/lean-ui-cutover.md)).

## Patient and dose transport

`/lean.html?persona=P2&patients=<Patient.id>,<Patient.id>` creates one existing
live session per pane. Each pane explicitly selects its named patient; selecting
a different patient through that pane is refused. Controls dispatch with the
pane's binding, including text/composition, confirmation, tabs and acknowledgment.
The host rechecks modal ownership when dequeuing events, so a queued foreign
pane event cannot pass a newly opened alert. Screen journals and drafts remain
inside their existing session. Repeated component IDs use patient-scoped DOM
identity and geometry keys (`patient::component`). The first open pane modal
owns interaction; urgent information remains visible for the whole board.

`/lean.html?persona=P3&marPatient=<Patient.id>&marRelease=mar&marWorkflow=<dose>`
uses the existing MAR connection and shared scheduled-dose authority. These
parameters identify a service-provisioned dose; the browser supplies no clinical
state or new authority. The MAR dose list (`/?workflow=mar`) opens each dose
here and keeps its sign-in and cosign button. The page uses the same Keycloak
login and preserves these return parameters. Real identity deployments still
need their exact `/lean.html` callback provisioned.

## Display and geometry

`Layout.Widgets` specifies rich parts. `Layout.WidgetGeometry` scales Lean's
normalized paths into their reserved rectangles. The family API binds these
marks and checks the resulting boxes with unchanged G1–G11, including G6's 3:1
minimum for vector ink. The new rich `widgetShape` accounts for nested pane
modal/urgent regions. The original `screenShape` and fixed-shell theorem domain
are unchanged. Existing theorem statements are unchanged; the display
completeness and structural-induction proofs were extended for new parts.

The shared generator is `dense-reference-v10` (v9 plus paged lists and table
grids, [bounded lists](ui-library.md#bounded-lists)). Its dedicated widget placement
function keeps these presentations separate from generic info/table/row-action
placement. Content-free admission preserves numeric/date validity and series
identity because those facts determine which plot parts exist. Lean remains
the authority on those parts and their actual labels and geometry.

- Time grids place supplied day/hour labels above medication rows and their
  due/status cells. Empty cells say “—”; repeated source cells are retained.
  Wide hour sets wrap into blocks, with all original data still readable.
  Supplied action controls retain their existing events below the display.
- Notes and folders have distinct cards; complete metadata, body text and
  source/provenance text remain readable, with scrolling for long text.
- Trend charts separate measure/unit series. Only whole decimal strings with
  at most six decimal places and valid explicit-offset timestamps are plotted.
  Other values remain in the table. UTC points include nanoseconds; no local
  offset or clinical range is invented. Growth plots use recorded ages and
  measurements with matching supplied reference curves. Solid measurement
  lines, dashed reference curves, exact decimal axis endpoints and point labels are
  Lean data. Reference source/population/sample values remain readable.
- Dated timelines have proportional UTC points and retain undated sources
  explicitly. Ordinary timelines show source order, since they have no dates.
- Banner runs are decorated within one banner box; glyph advances stay pinned.
  Alerts have geometric severity marks. Hotkeys activate a unique enabled
  button, respect modal and patient scope, and do not intercept editor input.

## Validation

Heavy commands run in separate user units with `MemoryMax=12G` and
`MemorySwapMax=0`, disk-backed `TMPDIR`, and no concurrent lake processes.
The native tests cover every new widget, its source mirror, all three desktop
viewports, nested modalities, mark contrast and patient-scoped geometry.
The app and agent unit suites, typechecks and linters cover their host paths.

The targeted browser configuration is `app/src/lean-ui/playwright.config.ts`.
It uses one worker and a disposable Postgres, under
`flock /home/saithat/Projects/run-tmp/vgi-browser-heavy.lock`. Its tasks include
P1/P3 signing, a complete P2 board note, a scheduled MAR administration and
rich-widget DOM/WASM differential checks. Authentication in these service
regressions uses a local synthetic OIDC issuer; native Lean replay, guarded
commands and Postgres are real. Notification streaming is substituted in the
MAR browser test; immediate post-command refresh still uses the existing session.

Screenshots at 1440×900 and WASM timings are written to
`/home/saithat/Projects/run-tmp/painter-parity/` (`layout-metrics.json`).
Browser measurements include cold admission/cache work and are per-paint
latency. The Node WASM samples below time one family-paint call after the module
is warm, including JSON encoding and the boundary; they are not throughput
estimates or clinical response-time guarantees. These local artifacts are not tracked.
Full browser suites and the lengthy accessibility/screen audit pair are outside
this change's requested validation scope. Historical certificates are not rebound.

The Lean source changes are limited to layout/display types, parts, rich shape
and mark binding, board-screen composition and proof-preserving adjustments to
`Display.lists_complete`, `Range.semanticNodes_unique`, `Range.leaf_plain` and
`Range.semanticNodes_all`. No existing theorem statement, rule definition or
clinical specification was changed. New definitions are marked as new
specifications for review. Explicit confirmation metadata is scoped per pane,
so another patient's confirmation button cannot suppress a required pending
confirmation control.


## Measured cases

At 1440×900, warm Node WASM family-paint samples (milliseconds) were:

| Widget fixture | WASM ms |
|---|---:|
| Medication time grid | 10.607 |
| Notes | 8.034 |
| Folder list | 8.293 |
| Trend | 14.142 |
| Growth | 8.570 |
| Timeline | 2.579 |
| Dated timeline | 2.843 |
| Board | 3.380 |
| Alert and hotkey | 2.668 |

These small fixtures have different source counts from live screens. The live
P2 board-note paint measured 795.6 ms (375 boxes) and the MAR grid 128.7 ms
(166 boxes), including browser admission/cache work. At the time of these measurements, large clinical boards could fall back to
the admitted fixed shell. The [dense board measurements](../audits/dense-boards.md)
cover the subsequent generator and the complete two-patient note workflow.

The final single-worker run passed all five targeted browser tests together: P1 note
and prescription signing, P3 assessment filing, every rich widget at all three
desktop sizes, a P2 two-patient board note, and one shared-dose MAR administration.
The board test checked that the untouched patient's version remained 1; the MAR
test checked one stored MedicationAdministration. All 39 DOM differential snapshots
passed at the 1/64 px tolerance. Recorded live snapshots had zero rectangle,
text-line-width and vector-stroke deviation; intrinsic glyph deviation was at
most 1/64 px. Failed harness attempts were corrected and only affected tests
were repeated; no full browser suite or accessibility/screen audit pair ran.

## Cut-over validation

The cut-over regressions add two files to the same configuration:
`cutover.pw.ts` runs on the widget fixture host (which records the events the
painter sends and uses the WASM keyboard) and `cutover-live.pw.ts` on the
isolated service. The service host adds an independently authenticated second
nurse (RN2) and a high-alert insulin dose on its own patient (New
specification for owner review). The [checklist](../design/lean-ui-cutover.md)
lists what each test establishes.

```sh
# Disposable Postgres in DATABASE_URL; one worker under the shared lock.
flock "$TMPDIR/vgi-browser-heavy.lock" pnpm --filter app exec playwright test \
  --config src/lean-ui/playwright.config.ts --workers=1
# One-day Lean replay for every persona, no model call.
EHR_FAKE=0 pnpm --filter agent run-days --screens lean --backend replay \
  --replay-from runs/<recorded lean run> --days 1 --personas P1,P2,P3,P4,P5 \
  --world runs/world/2 --run-id <new id> --seed-policy none
```
