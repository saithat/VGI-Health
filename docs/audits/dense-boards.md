# Dense clinical boards

`dense-reference-v12` keeps the live two-patient ED note in the dense family
through signing. On the same 36 workflow checkpoints, v11 selected dense 7
times and the checked fixed shell 29 times. V12 selected dense 36 times. The
second patient's chart version stayed at 1. This workflow has synthetic live
sessions and a real native commit service and database.

## Geometry and ownership

The checker found two separate problems in a board made by composing two
retained ED screens. At 1440×900 v11 exposed 27 targets in one scroll window
at a limit of 15. At 1920×1080 both panes' buttons could be attached to the
first table because both patients used the same component ID. V12 admits that
board at all three viewports. At 1440×900 it shows 10 targets initially and at
most 14 per scroll window.

Each pane lays out its own tables, record actions and structural gutter.
Narrow tables wrap a record across column tracks and keep its button beside
its first band. The pane caption provides the horizontal bounds for the
patient's pinned acknowledgment, commit and dialog. Board-wide demands retain
their Lean-supplied patient labels. The painter resolves grid cell clicks with
the patient and table identity and dispatches through the originating session.

The scrolling body remains a single region. Board navigation headings share
a row with their links. At the density-checked viewport, the generator
subtracts the pinned active targets from the screen limit and examines the
remaining target rectangles in vertical order. Where a window is too crowded,
it spreads the additional height across the affected rows, including their
labels and cells. The same untrusted geometry goes through native or WASM
family admission at every supported viewport. The frozen limits, semantic
paths, windowing, strip capacity and G1–G11 are unchanged. This change
introduces no Lean definitions, theorems or axioms.

## Regression coverage

A synthetic size check composed 1, 2, 3, 4 and 6 patient screens with
identical table and action IDs. Each patient had 20 rows, 10 columns, a
primary action, an alert and an acknowledgment. V11 refused dense for all
five boards. V12 admitted all five at the default limit of 15. The two-patient
regression checks the first, middle and last row in both panes, including
the variant with a modal in the second pane. Shape admission is per case.

## New specification for owner review

- `spaceBoardRows` defines the spacing of crowded board rows. `layoutFor`
  receives the caller's existing target limit. Its pane-local `arrange`,
  `paneTrack` and `pinnedRows` place dense pane bodies and pinned controls.
  A `trackBoard` structural hint selects board geometry for the ED presentation.
- The grid's `tableKey` pairs the patient namespace with its table component.
  The occurrence mirror assigns the pane namespace and component/alert IDs
  to urgent geometry. The Lean interpreter owns clinical dispatch.
- `boardPatients` and its button constructor define the repeated-ID test
  fixture. The live workflow's `boardReady` checks dense selection after the
  initial load and the interactions under test.

The 85 native layout and native/WASM tests pass, including byte comparisons on
large boards at every supported viewport. The 23 painter, board and reference
unit tests pass. The P2 browser workflow checks dense selection after editing
and navigation and verifies that the native commit writes the intended chart.
