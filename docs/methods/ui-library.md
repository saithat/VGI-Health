# Lean UI library (research)

[Overview](../../README.md) · [Methods and reproduction](../../README.md#documentation)

`lean/Ehr/Layout` is isolated from deployment, the generator and the clinical
checker. Its new theorems are kernel checked; they are not yet in Comparator.
`ui-layout` consumes JSONL proposals without compiling Lean per proposal.
The visual harness and its font assets live under
`app/src/browser/ui-library`, outside the certified clinical source boundary.

**Language.** Units are integer 1/64 CSS pixels. Frames, horizontal/vertical
stacks, wrapping rows, fixed/weighted grid tracks, absolute layers and fixed scroll
viewports support hug/fill/fixed dimensions, min/max requests, gaps, padding
and alignment. Spacing, radii, palette, font-instance and type-scale tokens resolve in Lean
(`space-2`, `rounded-lg`, `slate-900`, `sans-600`, `text-sm`); integer/color
literals remain legal. Absolute positions,
overlapping layers, arbitrary opaque sRGB colors and component variants/slots
remain expressible; checking happens after expansion and layout. Marks are
rectangles, circles, rational-turn wedges, lines/polylines and text. Component
expansion has a total bounded-depth parser; cycles fail explicitly. Grid tracks accept integer fixed widths and integer fractional weights
(`tracks: [6400, "1fr", {"fr": 2}]`); omitted tracks retain equal columns.
Fixed tracks are honored even when they overrun their parent, so the checker
reports overflow rather than restricting the input language. Long lists are
bounded by the layout's window ([bounded lists](#bounded-lists)), not by an
authoring primitive of the language.

**Layout and text proofs.** `layout_satisfies` establishes incoming size
constraints; clamping a parent does not itself establish child containment.
`column_apart` proves vertical stack separation for arbitrary child heights;
`scroll_apart` preserves separation under translation. `geometry_independent`
proves that binding any two content environments preserves computed geometry.
Measurement is one structural traversal; translation and flattening are separate
traversals. Text reserves line counts before data binding. `wrap_complete` and
`layoutAccepted_textComplete` prove complete bounded wrap content;
`advance_le_cell` and `wrap_line_width` bound advances and wrapped line widths.
Scroll text uses advance-based greedy breaking and retains paragraph breaks;
`greedy_complete`, `greedy_width`, `scroll_complete` and `scroll_line_width`
establish preservation and width bounds. Under the owner's policy,
every safety-classified slot must be a vertical text scroller with wrapping,
unbounded content height and no line budget or truncation. `maxLength` applies
only to non-safety text; safety text never fails length/glyph validation. A
character absent from the pinned font is spelled `[U+HHHHHH]` with pinned ASCII
(e.g. `[U+01F9EC]`); `TextAtom` preserves each original scalar, and the full
original string is emitted as the painter's accessible label. This explicit
fallback avoids unmeasured browser fallback glyphs. `paintText_supported`,
`textAtoms_preserve` and `layoutAccepted_safety` prove this lossless source/visual
spelling contract for arbitrary Unicode strings. Layout admission requires the
chosen font to support the escape alphabet. Non-safety text retains its finite
length/glyph validation and declared overflow policy. Pinned advances and vertical extents come from static Noto Sans
400/600/650/700/750/800, Mono 400, Symbols 400, CJK SC Regular and Hebrew
Regular. Research-only font bytes live under `app/src/browser/ui-library/fonts`;
the clinical font assets and certified app hash inputs are unchanged.

| Script | Research painter support | Added WOFF2 bytes |
|---|---|---:|
| Latin Extended, Greek, Cyrillic | Selected base/extended blocks, precomposed characters; six static weights | 386,928 |
| Han, Kana, Hangul | BMP unified Han, Kana, all precomposed modern Hangul syllables; Noto CJK SC glyph forms, weight 400 | 5,401,836 |
| Hebrew | Unpointed letters and selected punctuation, weight 400 | 2,184 |
| Arabic; Devanagari and other Indic; Thai | Explicit scalar escapes; no pinned shaper is installed | 0 |
| Combining marks, Hangul Jamo, Han extensions/compatibility outside the selected subset, other missing scalars | Explicit scalar escapes; original string retained | 0 |

The added font payload is **5,790,948 bytes (5.52 MiB)** for the complete set.
CSS requests faces as used: ordinary Latin weight 400 costs 60,004 bytes; CJK
costs 5,401,836 bytes on first CJK use and Hebrew 2,184 bytes on first Hebrew
use. These research pages are outside the deployed entry point, so the
certified clinical app's font payload is unchanged. The source manifest pins
upstream URLs, SHA-256, output bytes, Unicode subsets, FontTools 4.68.0 and
Brotli 1.2.1. OFL licenses accompany the assets. `scripts/ui-library/fonts/build.py`
rebuilds subsets; `generate-fonts.py` derives integer advances and vertical
extents from the served bytes. Equal CJK advances use compressed ranges.

There is no complex shaping pipeline. Each supported scalar has a separate
integer advance cell; missing scalars use the existing pinned ASCII escapes.
The painter partitions each prebroken line into isolated runs: contiguous
Hebrew letters and following spaces use reversed scalar cells, while other
runs and digits retain logical order. Run order remains logical left-to-right.
This is an explicit limited bidi policy, **not** Unicode paragraph bidi: Hebrew
phrases are readable, but mixed directional punctuation and surrounding runs
are not reordered by UAX #9. Soft wraps are chosen in logical input order;
Lean proves widths and preservation, not linguistic visual ordering. Arabic,
Indic, Thai and combining sequences are deliberately escaped rather than drawn
with unmeasured joining/conjunct/mark placement. Synthetic bold is disabled for
single-weight fallback fonts. The expanded fallback chain applies to the six
sans instances; Mono and Symbols retain their existing small repertoires.
Previously supported visible Sans scalars, including clinical subscript `₂`,
are retained; soft hyphen is deliberately escaped as a format control.

The painter uses Lean's upward-rounded 1/64px advances for scalar cells and
checks intrinsic browser glyph advances independently in the differential.
Static instances avoid fractional variable-font interpolation discrepancies.
The 14px reference text reserve is 22px per line, sufficient for the maximum
1,453/1,000-em pinned vertical extent. Every text slot has a font, font size,
line height, reserved viewport lines and overflow policy; only non-safety slots
have a finite source-length contract.

**New rule predicates (owner review).** `layoutAccepted_rules` reflects checker
acceptance into the following conjunction. `acceptTemplate` checks 1440×900,
1280×800 and 1920×1080; `layoutAccepted_allViewports` quantifies over arbitrary
content environments for one fixed semantic template.

| Rule | Exact library predicate |
|---|---|
| G1 | Exactly one banner, outside scrolling and contained in the viewport; separated from every other painted mark. `layoutAccepted_bannerPixels` proves no shared pixel for any scroll offsets in the conservative clipping model. |
| G2 | Every active interruptive mark is fixed, contained and has strictly greater global z than ordinary paint. `modal_blocks` proves ordinary targets cannot dispatch while an interruptive layer is present. |
| G3 | Every declared target is at least 1536×1536 units (24×24 px); active target pairs are separated. Ordinary targets blocked by a modal are inactive; targets of the pinned urgent strip stay active beside a modal (*new specification for owner review*), so they are separated from the modal's targets too. Shared scrollers use content coordinates; independent regions use conservative viewport envelopes. |
| G4 | Painted footprints or their outer scroll viewport are contained. Text has valid pinned metrics, a font size of at least 12 px (768 units, `PhysicalBounds.minFontPx`; *new specification for owner review*, `layoutAccepted_minFont`), positive capacity/lines, sufficient vertical reserve, bounded non-safety wrap capacity, and unbounded vertical wrapping for safety text with a pinned escape alphabet. Active text cannot intersect higher paint or unrelated paint at the same z; ancestor backgrounds at the same z are exempt. `layoutAccepted_textPixels` proves separation for arbitrary scrolling. |
| G5 | Every outer footprint has nonnegative x and right edge within viewport width; scroll content fits the nearest viewport horizontally. |
| G6 | *New specification for owner review.* Foreground/background contrast is at least 4.5:1 for all text at every size and weight (`PhysicalBounds.textContrastTenths`), and 3:1 for every target and every painted vector mark: circle, wedge, polyline (`PhysicalBounds.nontextContrastTenths`). `layoutAccepted_textContrast` and `layoutAccepted_nonTextContrast` state the consequences; `contrast_thresholds_exact` ties the thresholds to the policy constants. A plain rectangle has no ink of its own; only its text and target state are checked. Colors are opaque 8-bit sRGB. Outward-rounded rational luminance bounds have exact integer fifth-power certificates (`channel_certificates`); no floating point enters the check. |
| G7 | Expected semantic occurrence paths and painted IDs are unique; each expected path is painted exactly once and no invented source path is painted. The W1 adapter derives the inventory from the actual `UiScreen`; the lower-level proposal API takes the expected inventory as an input. |
| G10 | *New specification (R5).* At 1440×900, at most `maxTargetsPerViewport` active targets (default 15, `DesignRules.maxTargetsPerViewport`) in the first viewport, meaning every enclosing scroll offset at zero; at most that many fixed targets (outside every scroll viewport); and, at every scroll offset of each scroll viewport, at most that many fixed targets and targets in the window together. Other sizes impose no density constraint. It is checked by `checkDensity` next to the G1–G7 conjunction; see "Action density" below. |
| G11 | *New specification for owner review.* Every box flagged `urgent` (the pinned urgent strip) is painted, outside every scroll viewport, contained in the page viewport and separated from every other painted box, a modal included, whatever the stacking order; and every painted source box of an urgent occurrence of the semantic inventory carries the flag. It holds at every supported size. It is checked next to G1–G7 and G10 (`checkAll`, `layoutAccepted_all`); see "Pinned urgent strip" below. |

The decision procedures for G3 and G4 compute whether a modal is open once
per layout (`G3Hoisted`, `G4Hoisted`, equal to G3 and G4 by `G3_hoisted` and
`G4_hoisted`, both `Iff.rfl`); they previously recomputed it for every pair of
boxes, which made checking cubic in the number of boxes. With one box per
display part a 1,000-part screen took 10.5 s to paint through a family and
now takes 1.1 s; a 3,000-part screen takes 9.4 s. No rule changed.

The pixel model overapproximates nested clipping with the outermost viewport;
inner clips can only remove pixels. Scroll ancestor identities distinguish
independent regions; this conservative envelope test can reject safe nested
designs containing targets or text in different inner regions. `findings` reports rule, node/peer, metric, actual,
required and signed deficit; warnings never admit a violation. Accepted mark
overlaps can produce `exploit` warnings for a later agent-facing odd-design log.

**Keyboard semantics.** `Keyboard` defines manual horizontal tabs, single-select
listboxes, modal dialogs and rectangular non-editable data grids against the
W3C APG [tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/),
[listbox](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/),
[dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) and
[grid](https://www.w3.org/WAI/ARIA/apg/patterns/grid/) profiles. Theorems cover
entry/activation, focus/selection bounds, modal Tab containment/Escape restoration,
and grid bounds/row boundaries. *New specification for owner review:*
`alertDialog` is the profile of interruptive clinical alerts. It traps Tab like
`dialog` and no key closes it: `alertDialog_stays_open`,
`alertDialog_escape_ignored`, `alertDialog_never_closes`, `alertDialog_traps`,
`alertDialog_agrees` (it differs from `dialog` on Escape only) and
`interruptive_stays_open` (any key sequence). `dialogFor` selects the profile
from a box's `interruptive` flag. `dialog` and `dialog_escape_restores` are
unchanged and describe ordinary dismissible dialogs. The API profile name is
`alert-dialog`. Optional deletion, popup menus, multiselection,
type-ahead and editable cells are absent. The visual harness emits requested
roles and blocks ordinary buttons beneath a modal; it does not yet connect DOM
keyboard events or ARIA relationships to these proved transition functions.

**Painter differential and W1 prototype.** The harness draws a flat global z
order, absolutely placed boxes and prebroken lines. `paint=false` suppresses all
visible ink, including text. Text has its own opaque local background above any
shape in the same box, matching the local contrast model. Native scroll offsets only
translate marks and intersect Lean-supplied clips. Kerning/ligatures are disabled;
`text-rendering: geometricPrecision` is required (ordinary hinted text produced
a 13.5px discrepancy in the initial probe). A targeted differential spans three
viewports, all eight font instances, Latin/Greek/Cyrillic/CJK/Hebrew and escaped complex-script
corpora, adversarial long labels, wrapping rows,
nine-column grids, custom shapes and nested scrolling. Browser glyph rendering
matching the pinned advance/vertical tables remains trusted, as do browser
clipping, paint and accessibility behavior; the differential validates samples,
not those assumptions universally.

`Semantic.portScreen` maps every occurrence of the semantic inventory to a
unique path and binds its text in a safety-classified slot. The inventory
(`screenNodes`) lists display parts, described under "Display parts" below:
every piece of text a user sees is an occurrence of its own, so each is a
separate box under G3, G4 and G7 and each target counts under G10. The first
three roots are the banner `[0]`, the title `[1]` and the navigation `[2]` (a
wrapper, one heading per group and one target per link); workspace paths start
at `[3]`. W1 signing
uses a persistent slate banner, blue commit control, fixed review scroller and
interruptive layers. It is a semantic prototype: fields/review rows are text
cards, not a close visual/interactive reproduction of today's EHR widgets.
The adapter identifies the first primary-role UiNode in preorder as the
current-task commit source; disabled primary buttons still count. This is the
precise task-selection convention in the absence of a separate task argument.
`portAccepted_rules` is conditional on checking the generated tree. The native
`ui-port-audit` probes every local program containing `w1Sign` with its matching
spec (frozen recorded specs where available), native group/tab/alert variants
and all supported viewports. These are probes using one synthetic patient,
not universal state coverage or clinical program certification. The all-screen audit also probes the structural
compiler and fixed-shell geometry across the complete local program/spec corpus.
Finite probes are executable regressions; the renderer-range theorem below
establishes universal coverage. The intentionally bad clinical programs remain
rejected by the unchanged clinical checker independently of layout admission.
Source data and audit outputs stay outside git.

**Display parts.** *New specification for owner review.* `Ehr.Layout.Display`
decides what a clinical screen displays. A `Part` has a role (`PartRole`), the
text that is measured and painted, the recorded datum it presents (`raw`,
when a formatter reworded it) and state that is never drawn as text: target,
commit, component, kind, tone, selected, enabled, row and column, the options
of a select, the value kind and unit of an entry, a placeholder. For a node
at path `p`, `ownPart` is the occurrence `p`, `leafParts` are `p.0`, `p.1`, …
in reading order, and the child nodes follow at the next indices. A part is
present only when its datum is. No JSON is displayed.

| Node | Occurrence `p` | Further parts, then children |
|---|---|---|
| `field` | `label` | `control` at `p.0` (the target; its text is the displayed value, for a coded value the label of its option; kind `text`, `textarea`, `number`, `checkbox`, `select`, `datetime` or `search`; options, value kind and unit as data), then `unit`, `code` (the code beside its label where codes are shown), `required`, `hint`, `source`, `pending`, `human` |
| `button` | `button` (target; commit when primary; `enabled`; role as kind; the active navigation link is `selected`) | `reason` when blocked or a reason is recorded, `hotkey` |
| `alert` | `alert`: the label; the severity is kind and tone | |
| `section`, `timeline`, `datedTimeline` | `heading` | a dated timeline lists one `item` per dated and undated source; then the children |
| `tabs` | `wrapper` without text | one `tab` target per label (`col` its index, `selected` on the selected one), then the body |
| `stepper` | `wrapper` | one numbered `step` per step, the current one `selected` |
| `info` | `heading` | the cells, each with `row` and `col`: a table whose rows share their captions (two rows or more) shows the captions once as `cellLabel` in row 0 and then one value cell per record cell; otherwise each value cell follows its own `cellLabel`. A value cell is `cellValue`, `status` (a state column; `tone` from `statusTone`) or `badge` (a result flag). An empty table has one `empty` part; an empty status line has none. A paged list's cells follow its window parts: `position`, `flagged` and four `pager` targets ([bounded lists](#bounded-lists)) |
| `valueSet` | `wrapper` | the children; its options reach the fields inside as popup data |
| `rowAction` | `wrapper` with the info component and `row` | the child controls |
| `chartReferences` | `wrapper` | one `item` per reference curve with every sample |
| `board` | `wrapper` | one `alert` per demand (patient, record number, alert) |
| `patientPane` | `heading` with the pane banner as runs | one `alert` or `button` per urgent atom, then children and modal |
| `columns`, `presentation` | `wrapper` | the children |
| `text` | `text` | |

The banner `[0]` is one part of role `banner`. Rule G1 admits exactly one
banner box and keeps it fixed, visible and clear of every other box, so the
banner fields are runs of that part, not boxes: the patient name, the
identity fields (date of birth, record number, age and sex), the badges
(allergies, code status, isolation, weight), the remaining details and the
signed-in clinician, in that order. The part's text is the concatenation of
its runs (`banner_complete`), and every painted box carries the number of
glyph cells of each run (`runCells`), so a painter styles runs without
reading text. Placing banner fields as separate boxes needs a pinning rule for
them and a shell with room for them; neither exists yet.

A prefilled value awaiting confirmation has a `pending` part. Without an
explicit confirmation button on the screen that part is a target that confirms
the value, and the control stays an editor; it was an implicit second use of
the field's own rectangle. Targets of this kind count under G3 and G10.

*Formatting.* `Ehr.Layout.Format` holds the wording: captions in sentence or
title case without code-system tags, button labels without workflow
annotations, units, short names of the listed laboratory tests and vital
signs, states, encounter classes, age and sex, durations, medication
directions, the allergy summary, rounding of long observation decimals on
their recorded digits, one-line vital summaries, empty-table text, the tones,
and dates. A recorded date or date-time is shown by its own recorded
wall-time digits (`MM/DD/YYYY HHMM`, `05 Jan 2024`); no zone is applied and no
host locale or clock is read. An instant stored as an epoch minute (a late
entry's observed and signed times, an observation-time field) has no recorded
wall time and Lean has no display time zone in its data, so it is written in
UTC and labelled UTC. Narrative (`Text`, `Title`) is never reworded. The
functions are pure; `#guard` cases include those of the application's
formatter tests.

*Nothing is lost.* Per kind, the parts carry every datum of the node:
`field_complete`, `control_shows_choice`, `button_complete`, `alert_complete`,
`section_complete`, `tabs_complete`, `stepper_complete`, `info_complete`,
`info_empty`, `banner_complete`, `lists_complete`. `Parts.node_parts` proves
that the own part and every display part of every node of a screen, at any
depth, is an occurrence of the inventory, and `Range.realized_part` that a
painting which realizes the screen shows each occurrence in a box of its own
with its complete text under the safety-text contract
(`Parts.realized_node_parts`). For the renderer and the fixed shell no premise
is left:

```lean
render_parts_shown (sp : Ehr.Spec) (program : Ehr.Program) (facts : Ehr.Facts)
    (display : Display) (user : Ehr.User) (state : Ehr.State) (v : Size) (hv : v ∈ viewports) :
  ∃ painted, Range.uncheckedPaint (runRenderUi ⟨sp,program,facts,display,user,state⟩) v = some painted ∧
    ∀ path part, (path,part) ∈ screenNodes (runRenderUi ⟨sp,program,facts,display,user,state⟩) →
      ∃ d ∈ painted, d.box.info.source = some path ∧ d.box.info.paint = true ∧
        d.original = some part.text ∧
        ∃ t ∈ d.box.info.text, t.safety = true ∧
          d.lines = textLines t d.box.rect.w (paintText t part.text) ∧
          SafetyRealized t d.box.rect.w part.text
```

What these theorems do not say: that a formatter's wording is clinically
right (each formatter is a specification to review; the recorded datum stays
in `raw`), or that a painter draws the role, tone and state it is given.
`runCells` is checked by regressions and the native tests, not by a theorem.

*Consequences for layouts.* The erased shape now has one slot per part, so it
depends on which optional parts are present, on the number of table cells and
on whether a button is blocked; a layout family written for the earlier
inventory no longer matches. The JSONL operations add `parts` (the part of
each box, in box order) to `program-paint`, `structural-paint`, `family-paint`
and `port`, and `{"op":"inventory","screen":…}` (or `"render"`) returns every
path with its part and the shape. The fixed shell places one part per row in
inventory order, so a label is directly above its control and the parts of a
node stay together; its capacity of 15 targets is unchanged, because parts
other than controls, buttons, tabs and unconfirmed confirmations are not
targets and every row was already counted as if it were one. The fixed commit
row shows the button's label; its blocked reason and hotkey are body rows at
the button's place. The body is longer: on six release screens the
occurrences grew from 70–97 to 324–544 and the body from about 3,800–5,400 px
to 18,000–30,400 px, with the same 25–50 targets. That is the fixed shell;
the dense reference layouts ([reference layouts](reference-layouts.md)) place
the parts as today's application does: labels above controls in field rows,
table header rows and column tracks, tabs in one row. Still missing:
content-measured table grids, the medication time grid, charts as marks,
the multi-patient board, banner fields as boxes, and grouping of several
records into one line (blood-pressure pairs, same-time vital signs,
medication tasks), which today's application does in TypeScript.

<a id="bounded-lists"></a>
**Bounded lists.** *New specification for owner review.* Since every
displayed part is an occurrence, a list shown whole makes a screen as long as
its data: P1's result review screen (`w2Result`) had 10,930 parts. The layout
therefore pages every list it can (`Ehr.Layout.Window`, `WindowCore`,
`WindowProofs`). These are statements about the layout model, not clinical
claims; the page size, the record order and what counts as flagged are
modelling choices.

*Why unbounded lists are bad*, on the fixed shell's geometry (every renderer
output's certified painter: one 56 px row per occurrence in one body
scroller):

| Statement | Lean |
|---|---|
| Body row `i` is in the scroll window only at an offset of more than `56·i + 288 − H` px: reveal cost grows linearly with position | `WindowProofs.shell_reveal_offset` |
| Steps of at most `s` px reach offset `o` only after at least `o / s` steps | `WindowProofs.scroll_steps` |
| For every bound there is a list with a body row beyond it: no bound independent of the record count | `WindowProofs.reveal_unbounded` |
| At every supported viewport the last record of a 16-record list flagged high lies entirely outside the first viewport | `WindowProofs.critical_buried` (`shell_buried_row`) |
| A screen holding one list has at least one occurrence per record | `WindowProofs.inventory_unbounded` |

*The window.* A list is paged when it belongs to a component (so the pager's
events reach it), is not a search result list (already at most 25 matches) or
the patient directory, is not named by a row action (its actions would leave
their records), occurs once on the screen, lies outside a multi-patient board
or patient pane, and has more records than its page size (`pageable`,
`eligibleIn`, `paged`). The page size is 20 by default (`defaultPageSize`; a
caption, the pager row, the header and twenty 20 px rows fill about 470 px,
which the dense layout's first viewport holds at 1440×900); a layout may set a
list's own size, kept within 5–50 (`Config.sizeOf`). Records keep the
renderer's order: the window never reorders (`pages_cover`). That order is
each list's renderer sort key (`newestFirst`/`oldestFirst`, stable, ties in
bundle order): newest first by date for results, notes, reports, vitals,
immunizations, procedures, encounters (start), problems (onset), medications
and tasks (authored) and allergies (recorded); oldest first by time for
schedules, administrations, observations and boards (arrival). The renderer is
unchanged and still emits every record, so D2 and T11 still speak of the whole
list; `windowScreen` cuts each paged list of the workspace and side to the page
asked for and records its window (`UiScreen.windows?`). A paged list's display
parts begin with its position ("Records 21–40 of 705"), the flagged count of
other pages and four targets: previous page, next page, a page selector whose
options are every page, and the next page holding a flagged record
(`Display.pagerParts`). A target that cannot move is shown but not enabled.
Rich presentations over a paged list (a trend plot, a time grid, cards) read
the records of the page shown, like its cells.

*View state and events.* The page is view state in `State.tabSel`, where the
selected tab already lives, and is selected by the same `selectTab` event:
`selectTabCore` now also accepts a shown panel, table, trend or
prior-authorization component (*changed definition*, below). A popup blocks it
like every other event; a hidden component ignores it. The renderer passes the
selected pages on (`UiScreen.pages?`, page 0 not listed); the window shows the
page asked for, or the last page when a later one is asked. A flagged record
is an abnormal result flag (critical, high, low) or a state with the red tone
(`flaggedCell`), as the display already classifies cells.

| Contract | Lean |
|---|---|
| A page holds at most its size of records | `Window.pageRows_length`, `windowNode_info` |
| The windowed inventory does not grow with the records: windows naming the same lists give the same inventory size, so a list of `n` records and one of `n + m` records (more than a page) have the same windowed inventory size; a paged list adds six window parts and the cells of one page | `WindowProofs.windows_inventory` (`windows_length`, `windowParts_count`), `list_inventory_independent`, `infoParts_length_le` |
| Record `i` is on page `i / k` at position `i % k`, on no other page; the pages in order are the list | `Window.pageRows_get`, `page_unique`, `record_off_page`, `pages_cover` |
| When the view state asks for a record's page, the windowed inventory has every cell of the record with its complete value | `Window.record_shown`, `WindowProofs.window_record_shown` |
| The fixed shell paints the windowed screen of every renderer output and shows every part completely (the windowed `render_parts_shown`) | `WindowProofs.render_window_parts_shown` |
| From the first page, `p` next-page presses reach page `p`; the selector offers every page, so one selection reaches any record | `Window.next_reaches`, `next_target`, `selector_offers` |
| Every window says "Records a–b of n" | `Window.position_shown` |
| Either every flagged record is on the page shown, or the window counts those elsewhere (positive) and its enabled next-flagged target selects another page holding one | `Window.nothing_buried` (`nextFlagged_found`, `nextFlagged_none`, `flaggedOff_pos`) |
| The pager's event is applied by the interpreter for a shown list and changes only the view state; a popup refuses it | `WindowProofs.selectTab_selects_page`, `selectTab_blocked` |
| The renderer asks for the page the view state holds | `WindowProofs.uiPages_asks`, `withUrgentStrip_pages` |

Paging rather than a scroll window: a window that follows the scroll offset
keeps the distance to a record linear in its position and would make the
inventory depend on a scroll offset that is not interpreter state. Pages are
discrete view state, go through the event path, bound the actions to any record
(one selection) and make the inventory a function of the page size.

*Changed definitions (owner review).* `Ehr.selectTabCore` also accepts a
shown panel, table, trend or prior-authorization component and records its
page in `tabSel` (before: tabs only; other kinds ignored); `State.tabSel`'s
description says so. `UiScreen` gains `pages?` (set by `renderUi`) and
`windows?` (set by the layout only); `DisplayCx` gains `windows`; an info
node's `leafParts` are now `windowParts cx comp ++ infoParts …` (before:
`infoParts …`; unchanged when the list is not paged); `PartRole` gains
`position`, `pager` and `flagged`. `Parts.ChildOf` now passes the reference
curves and the pane context exactly as `semanticNodes` does. No theorem
statement changed; `info_complete`, `info_empty`, `selectTabCore_safe` and
`leaf_plain` have new proofs.

The layout API windows every screen it reads (`program-paint`,
`structural-paint`, `family-check`, `family-paint`, `port`, `inventory`; a
screen that already carries windows is kept) and has a `window` operation;
requests may pass `window: false` or `window: {size, sizes}`. The JavaScript
mirror (`scripts/layout-reference/window.mjs`) is tested against it; the
painter asks Lean.

**Universal bridge.** `screenShape` erases every text (labels, values, cell
contents), while retaining occurrence paths, interaction/commit placement
classes and structural line reservations. Since each display part is an
occurrence, the number of table cells and the presence of optional parts are
structure, not erased payload. `compileShape` never reads content.
`Family.acceptFamily` checks every supplied shape/layout case at all supported
viewports, including semantic flag linkage (`Linked`). Layouts are arbitrary
Nodes, with per-viewport JSON cases; the reference compiler is optional.
Semantic source values bind by tree path, independently of agent text keys.
`family-check` admits references once; `family-paint` takes a new `UiScreen` or
actual `RenderInput`, binds its unrestricted values and paints without checking
safety string lengths. Omitted `layouts` selects the reference compiler;
custom layouts supply `{viewport, tree}` cases for each supported size. Request
`content`, `expected` and `components` have explicit decoder defaults; malformed
supplied values still fail. The stateless JSONL runner revalidates the supplied
family descriptor, independently of patient values. Uncovered shapes are
reported explicitly.

The following finite-family specializations remain kernel checked:

```lean
layoutAccepted_allScreens
    (family : Family) (h : acceptFamily family = true)
    (screen : UiScreen) (covered : Covered family screen)
    (v : Size) (hv : v ∈ viewports) :
  ∃ painted, familyPaint family screen v = some painted ∧ Realizes screen v painted

layoutAccepted_allStates
    (sp : Ehr.Spec) (program : Ehr.Program) (family : Family)
    (accepted : acceptFamily family = true) :
  ∀ (facts : Ehr.Facts) (display : Display) (user : Ehr.User) (state : Ehr.State),
    ∀ v ∈ viewports,
    match familyPaint family (runRenderUi ⟨sp, program, facts, display, user, state⟩) v with
    | none => ¬ Covered family (runRenderUi ⟨sp, program, facts, display, user, state⟩)
    | some painted => Realizes (runRenderUi ⟨sp, program, facts, display, user, state⟩) v painted

layoutAccepted_allPatients_finite
    (sp : Ehr.Spec) (program : Ehr.Program) (family : Family)
    (accepted : acceptFamily family = true)
    (coverage : RenderCovered sp program family) :
  ∀ (facts : Ehr.Facts) (display : Display) (user : Ehr.User) (state : Ehr.State),
    Ehr.Props.Reachable ⟨sp, program, facts, user⟩ state →
    ∀ v ∈ viewports, ∃ painted,
      familyPaint family (runRenderUi ⟨sp, program, facts, display, user, state⟩) v = some painted ∧
      Realizes (runRenderUi ⟨sp, program, facts, display, user, state⟩) v painted
```

`Realizes` includes G1–G7 on the actual semantic inventory, linked source roles,
exact full original values and the unbounded safety-text preservation/width
contract. `Covered` is finite structural family membership, with no string
bound. For a finite descriptor, `RenderCovered` requires every actual
EHR render shape reachable by human/macro events or time to belong to the
admitted family, for every Facts/Display/user. The theorem makes that premise
visible; the structural program certificate below discharges the corresponding
obligation for the fixed-shell compiler.
The all-states theorem needs no coverage or reachability premise: it establishes
partial correctness for every EHR input state, including unreachable states,
and identifies missing structural cases exactly. It does **not** promise an
output for an uncovered shape. The all-screens theorem needs only local shape
membership and applies to every payload of that shape: every string of
whatever length. A table with another number of cells is another shape. `finiteFamily_missingShape` proves that a finite shape
family cannot cover all possible UiScreens; it does not rule out coverage for a
particular EHR Program. Therefore finite probes are not treated as a global
coverage proof. Patient-directory controls and table rows both introduce
structural growth. The parameterized structural
certificate below closes the renderer range without enumerating these shapes.

**Ordinary structural certificate.** `Ehr.Layout.Structural`
adds `repeat-body-v1`: one fixed noninteractive banner and an arbitrary list of
ordinary semantic slots in one vertical scroller. Paths, target masks, labels,
record values, table row counts and list length are parameters. The certificate
is a kernel proof of the placement scheme, rather than a finite list of length
probes. In namespace `Ehr.Layout.Structural`, it proves:

```lean
repeatBody_rules (v : Size) (hv : v ∈ viewports) (first : List Nat)
    (xs : List (List Nat × Bool)) (unique : (first :: xs.map Prod.fst).Nodup) :
  Rules (first :: xs.map Prod.fst) v (placements v first xs)

certifiedClass_allScreens (screen : UiScreen)
    (accepted : accepts (screenShape screen) = true)
    (v : Size) (hv : v ∈ viewports) :
  ∃ painted, paint screen v = some painted ∧ Realizes screen v painted
```

`Structural.accepts` checks only structural
membership: one first banner, ordinary following regions and unique source
paths. The ordinary-only class is subsumed by the fixed shell below. Its
`Structural.accepts` predicate still declines commit and modal slots; their flags cannot be erased to gain admission. Synthetic
list probes exercise 0, 1, 2, 50 and 300 entries at every viewport; these are
regressions for the executable and are not the basis of the universal proof.

**Fixed commit/modal class.**
`Ehr.Layout.Shell` extends the unbounded body class with an optional current-task
commit, zero, one or two fixed interruptive occurrences and up to six pinned
urgent occurrences. `shell_rules` quantifies over arbitrary body lists, source
paths and target masks, assuming only unique source paths, at most two modal
occurrences and at most six pinned rows. Its conjunction is G1–G7. `Shell.certifiedClass_allScreens` has the same complete
`Realizes` conclusion as the ordinary class, now including these fixed regions.
`Shell.certified_currentCommit_visible` additionally identifies the actual
current-task source and proves its target, commit and fixed visibility flags at
1440×900, including under a modal. All strings remain unbounded scroll text.

The body lists the title, the workspace and any unpinned urgent occurrences
first, then the navigation and side occurrences: with one row per link, the
navigation follows the workspace instead of preceding it.
The commit is a fixed 24px row at y=104px, below the banner ending at 104px.
The band from 128px to 272px holds the pinned urgent strip: six fixed 24px
rows. The body scroller starts at 272px. The commit meets the unchanged 24px
G3 minimum; it is independent of body length and scroll position. Modal
occurrences use a higher fixed layer over the body, and ordinary targets cannot
dispatch while that layer is active. `structural-paint` selects
`fixed-shell-v2`; malformed/oversized modal shapes still decline. This is a semantic text-card layout, not deployed widget
fidelity. The font assets and script policy are shared with the ordinary class.

**Pinned urgent strip (G11).** *New specification for owner review.* The
semantic inventory gives every occurrence of `UiScreen.urgent?` the region
`urgent`. `SourceLinked` lets only such an occurrence carry the `urgent` flag,
and G11 requires each of them to carry it and to be pinned (`PinnedBox`):
painted, outside every scroll viewport, inside the page viewport and separated
from every other painted box. `G11_fixed` proves the box occupies the same
pixels at every scroll position; `G11_pixels` proves no other painted box, a
modal included, shares a pixel with it. G4 and G6 make its text at least 12 px
and 4.5:1. A flagged target stays active beside a modal, so G3 and G10 apply to
it there; `stripDispatchable` is the dispatch relation for a painter that draws
the strip (`strip_dispatches`, `strip_modal_blocks`), and `dispatchable` and
`modal_blocks` are unchanged. Stacking order is not constrained beyond G2: the
strip is kept clear of the modal by separation, not by drawing it on top.

The fixed shell pins the strip when it has at most six occurrences
(`stripCapacity`) of which at most two are targets (`stripTargetCapacity`):
`Shell.stripFits`. Every part under a strip root is an urgent occurrence, so
the blocked reason or hotkey of a strip button counts toward the six; the
renderer's strip (alerts and enabled acknowledgments) has no such parts.
`shell_urgent`, `class_urgent` and `certifiedClass_urgent`
prove G11 for every such shape; `Density.render_urgent` extends it to every
output of the renderer. A strip that does not fit is painted as ordinary body
rows, so G1–G7 and `renderer_range` still hold for it, and G11 fails:
`structural-paint` and `program-paint` then answer `accepted: false` with a
`G11` finding (`urgent-strip-capacity` or `urgent-strip-targets`, the count and
the capacity). The decision is per state; `program-check` stays static. The
family reference layout (`compileShape`) places urgent occurrences as fixed
30px rows above its review scroller and modal layer; a shape without urgent
occurrences keeps its earlier geometry. Custom families are checked with
`acceptFamilyUrgent` (`layoutAccepted_familyUrgent`). Layout requests take
`urgent` on a node and an optional `urgentPaths` inventory.

`Ehr.Layout.Strip` connects this to the alert-urgency theorems.
`Sem.StripLayout` was the assumption that every fact of the strip is in the
viewport, legible and unoccluded at every view the user can reach.
`layoutAccepted_stripLayout` proves it from acceptance alone:

```lean
layoutAccepted_stripLayout (v : Size) (ui : UiScreen) (painted : List Drawn)
    (accepted : StripAccepted v ui painted) (offset : String → Int) :
  StripLayout ui (stripEdge v ui.urgent?) (stripMoment v ui painted offset)
```

`StripAccepted` is `Realizes` with G11. `stripMoment` reads the three
conditions off the placed boxes at scroll offsets `offset`: the strip node's
box is fixed in the viewport; its text slot is at least 12 px and 4.5:1 and
holds the node's complete text; no other painted box shares a pixel with it.
An alert's text is its label; its severity is no longer printed in brackets
but is the kind and tone of the part emitted with the box (`strip_part`,
`strip_alert_part`), so the legibility conjunct covers the label and a painter
is trusted to show the tone.
`stripEdge` is any view change (scrolling, tabs, navigation, a dialog opening
or closing) that leads to another accepted layout of a screen with the same
strip. `shell_stripLayout` and `render_stripLayout` specialise this to the
fixed shell and to the clinical screen with its strip, and
`render_strip_continuous` composes it with `strip_continuous_perceivability`:
for any spec, program, patient, user and state whose strip fits, every active
approved-urgent alert is shown in the viewport, legible and unoccluded at
every reachable view, with no layout premise. The strip content changes only
with the interpreter state, which the alert-urgency theorems quantify
separately. The module is built with `ui-port-audit`; the WASM does not link it.

**Program-level certificate.** `Ehr.Layout.Range.renderer_range` proves that
**every** output of the actual `runRenderUi` renderer fits `fixed-shell-v2`, for
any spec, program, Facts, Display, user and state, including unreachable states.
The proof establishes unique paths for arbitrary nested UiNode trees, the
single first-primary commit source, and the renderer's top-level modal grammar:
a section plus an acknowledgment control. Urgent-strip and patient-workspace
wrappers preserve that bound; ordinary trees and record lists are unrestricted.

Consequently `Range.checkProgram spec program` is a decidable constant-true
check on typed inputs for this fixed compiler. The universal range theorem
justifies that decision; no coverage proof is carried as an input certificate,
and finite probes are not used to infer the range. The checked class is the
standard semantic text-card compiler. Clinical admission continues through the
existing independent checker. Custom layout descriptors continue through
`acceptFamily`.

The exact program-level headlines, in namespace `Ehr.Layout.Range`, are:

```lean
checkProgram_sound (sp : Ehr.Spec) (program : Ehr.Program)
    (_accepted : checkProgram sp program = true) :
  RenderCovered sp program Library.fixedShell

layoutAccepted_program (sp : Ehr.Spec) (program : Ehr.Program)
    (accepted : checkProgram sp program = true) :
  ∀ (facts : Ehr.Facts) (display : Display) (user : Ehr.User) (state : Ehr.State),
    Ehr.Props.Reachable ⟨sp,program,facts,user⟩ state →
    ∀ v ∈ viewports, ∃ painted,
      uncheckedPaint (runRenderUi ⟨sp,program,facts,display,user,state⟩) v = some painted ∧
      Realizes (runRenderUi ⟨sp,program,facts,display,user,state⟩) v painted
```

`checkProgram_allStates` strengthens the second result by dropping reachability.
`RenderFamily` is a typeclass for finite descriptors and certified structural
compilers. `RenderCovered` keeps all its patient/state
quantifiers. `RenderCovered_finite_iff` is a definitional equivalence with the
original finite-family obligation, and `layoutAccepted_allPatients_finite`
reproduces its original conclusion. The generic `layoutAccepted_allPatients`
uses the same `Realizes` contract; `layoutAccepted_program` calls it with the
coverage hypothesis discharged by `checkProgram_sound`.

The JSONL operations are `program-check` with `{spec, program}` and
`program-paint` with `{render: RenderInput, viewport}`. Runtime program painting
binds the actual native render without repeating per-patient geometry, class
membership or text-length admission. `structural-paint` still checks arbitrary
supplied screen shapes and declines oversized modal grammars. No deployment,
clinical acceptance, event-dispatch integration or custom-widget fidelity is
inferred from layout admission. The six canonical and 52 accepted noncanonical
programs in the retained inventory are all covered by the universal theorem;
no additional class widening is needed for those programs.

**Action density (G10).** *New specification for owner review (rule R5 in
[metric gaming](../design/metric-gaming.md)).* `G10 limit v ps` counts active
targets (modal-aware, as in G3). The first viewport takes targets with area inside
the page and inside every enclosing scroll viewport at zero scroll. A scroll
viewport is the innermost clip; its window at offset `o` is the content band
`[y + o, bottom + o)`. Fixed targets, those outside every scroll viewport, stay
in view at every scroll position, so each window is counted together with them
(`fixedTargets`), as the browser density check counted fixed plus visible in
window. The check inspects one candidate window per target, starting on its
last row; `G10_window` proves that fixed plus window targets stay within the
limit at every offset, and `G10_fixed` bounds the fixed targets alone.
`checkDensity` is `check` plus G10 (`layoutAccepted_density`). Findings use rule
`G10` with metric `first-viewport-targets`, `fixed-targets` or
`scroll-window-targets` (node: the scroll viewport; the count includes the
fixed targets), the count, the limit and the excess.

`Ehr.Layout.Density` proves that the fixed shell meets G10 at capacity
`shellCapacity = 15` for arbitrary bodies, paths, target masks and at most two
modals and at most two pinned strip targets (`shell_density`). The body
scroller is 612 px tall with 48 px rows on a 56 px pitch, so any window meets
at most 12 rows; with the fixed commit and two pinned strip targets that is
15. The first viewport shows 11 rows. With a modal present only the modal
targets and the strip targets are active.
`render_density` extends this to every `runRenderUi` output.
`checkProgramDensity sp program` decides `15 ≤ sp.design.maxTargetsPerViewport`, and

```lean
checkProgramDensity_sound (sp : Ehr.Spec) (program : Ehr.Program)
    (accepted : checkProgramDensity sp program = true) :
  ∀ (facts : Ehr.Facts) (display : Display) (user : Ehr.User) (state : Ehr.State),
    ∀ v ∈ viewports, ∃ painted,
      Range.uncheckedPaint (runRenderUi ⟨sp,program,facts,display,user,state⟩) v = some painted ∧
      Realizes (runRenderUi ⟨sp,program,facts,display,user,state⟩) v painted ∧
      G10 sp.design.maxTargetsPerViewport v (painted.map Drawn.box)
```

Custom families use `acceptFamilyDensity limit family` (`acceptFamily` plus G10 on
every viewport case); `layoutAccepted_familyDensity` adds G10 to the
`layoutAccepted_allScreens` conclusion. The JSONL operations take an optional
`maxTargetsPerViewport` (default 15): `layout`, `port`, `family-check` and
`family-paint` refuse on G10; `program-check` and `program-paint` use the spec's
limit. `ui-port-audit` reports `firstViewportTargets` and `maxWindowTargets` per
probed state, and `--all-variants` probes every screen with the group, tab and
alert variants.

The release programs reach 11 targets in the first viewport and 14 at a scroll
position (12 body rows, the fixed commit and a strip target), and the shell's
proved capacity equals the default limit, so no fixed-shell program can fail it.
Counting each navigation link and tab does not change that bound, because they
are body rows. The two-pane family reference layout (`compileShape`) has no
such bound: with its navigation pane beside the review pane it shows 16 to 20
targets at once on three of six sampled release screens, so `family-paint`
without explicit layouts refuses those screens at the default limit of 15 and
needs the screen's own limit. Density on the fixed shell becomes scrolling. G10 constrains custom
layouts and any lower limit. A limit below 15 refuses every program, since the
program decision is static.

The program inventory covers **6/6 canonical programs** and **52/52
accepted noncanonical programs** (54 matching spec contexts). Across all 186
paths, 113 distinct programs, 118 contexts and 3,472 declared screen occurrences,
there are **no uncovered programs or screens**. The separate empirical checks
accept 7,944/7,944 structural probes and 3,468/3,468 shell geometry checks,
The original W1 port also remains 3,468/3,468; the two named bad
clinical inputs remain refused. The [current range inventory](../audits/ui-certs-range-20261107.json)
records every program alias and declared screen, program/spec/source hashes,
exact theorem statements and verification commands. Those counts are backed by
`renderer_range`, rather than inferred from the finite probes. They were taken
before rules G4, G6 and G10 were strengthened, G11 was added and navigation
links and tabs became occurrences of their own. Afterwards the audit was
repeated on the fifteen release persona programs: 4,314/4,314 class probes,
279/279 W1 port checks and 279/279 shell geometry checks pass, and every
probed urgent strip (up to four occurrences) is pinned. The recorded-run
programs were not audited again. With display parts as occurrences the same
fifteen programs were audited once more (all screens, all variants):
4,314/4,314 class probes, 279/279 W1 port checks of the family reference
layout and 279/279 shell geometry checks pass, every probed urgent strip is
pinned (1,170 probes, up to four occurrences), and no window shows more than
12 body targets.

The [earlier ordinary-class inventory](../audits/ui-certs-20261107.json)
records the narrower `repeat-body-v1` implementation. The current fixed-shell
range inventory supersedes its coverage limits.

There is also a closed positive certificate: `reviewFamily_accepted` proves
admission of `reviewFamily` with proof-producing `decide_cbv` (kernel checked,
no native evaluation axiom). Its statement changed with the display parts.
`layoutAccepted_reviewAllPayloads` states:

```lean
∀ (banner : List (String × String)) (reason : Option String) (v : Size), v ∈ viewports →
  ∃ painted,
    familyPaint reviewFamily (reviewScreen banner [] false reason) v = some painted ∧
    Realizes (reviewScreen banner [] false reason) v painted
```

It was stated for every table (`rows`) and for Sign enabled or blocked. Table
cells and the blocked reason are occurrences now; a finite family paints a
fixed number of boxes and G7 wants one per occurrence, so no finite family
covers tables of every size. The earlier conclusion holds for every payload
with the fixed shell as the painter:

```lean
Parts.layoutAccepted_reviewAllPayloads_shell
    (banner : List (String × String)) (rows : List (List (String × String)))
    (enabled : Bool) (reason : Option String) (v : Size) (hv : v ∈ viewports) :
  ∃ painted, Range.uncheckedPaint (reviewScreen banner rows enabled reason) v = some painted ∧
    Realizes (reviewScreen banner rows enabled reason) v painted
```

Neither has a length, glyph, coverage or runtime-acceptance premise. The
family certificate covers arbitrary banner fields and blocked reasons of an
empty review table; it is not a theorem that every state of the deployed EHR
renderer has that exact shape.

**Not proved / incomplete.** G10 and G11 are not part of `Realizes` or `Rules`;
they are separate conjuncts of the density and urgent-strip theorems. G11 holds
for the fixed shell only when the strip fits its six pinned rows; a state with
more urgent occurrences is refused, not painted. Close widget
fidelity, paging of the lists the window excludes (row-action lists, the
patient directory, lists in boards and panes, duplicated lists), complete
DOM/APG integration,
Comparator coverage and deployment integration remain open. Browser glyph and
accessibility rendering remain trusted. Nothing here replaces existing clinical
certification or authorizes switching the deployed painter or generator. No data
or import bound is introduced.

Validation (from the repository root; pnpm uses `CI=true`):

```sh
export TMPDIR="${TMPDIR:?Set disk-backed TMPDIR}" CI=true LEAN_NUM_THREADS=6
(cd lean && lake build && lake build ui-layout ui-port-audit)
node --test scripts/ui-library/native.test.mjs scripts/ui-library/family.test.mjs \
  scripts/ui-library/structural.test.mjs scripts/ui-library/program.test.mjs \
  scripts/ui-library/fonts.test.mjs scripts/ui-library/parts.test.mjs
node scripts/ui-library/port-audit.mjs --all-screens
pnpm --filter app typecheck
pnpm --filter app lint
flock "$TMPDIR/vgi-browser-heavy.lock" pnpm --filter app exec playwright test --config src/browser/ui-library/playwright.config.ts
```

Targeted checks pass 34 native regressions (28 layout/program tests, four
display-part tests and two font tests); the part tests compare the TypeScript
inventory mirror with Lean on eight P1/P3 screens. The named-declaration audit
covers 305 theorems in `lean/Ehr/Layout` (16 without axioms); each uses at
most `propext`, `Classical.choice` and `Quot.sound`. The following figures predate the strengthened rules G4, G6,
G10 and G11 and the per-link inventory, and were not measured again: seven
Playwright tests (one worker under the shared lock, after the refreshed port
audit); a differential of 228 boxes, 153 text lines and 6,861 intrinsic glyph
advances with all worst deviations 0 CSS px; and an environment-wide
inspection of generated helper lemmas (1,143 theorem declarations, 592
axiom-free and 551 using only `propext`, `Classical.choice` and `Quot.sound`).

The targeted browser command also paints the audit's W1 sample when present
and verifies vertical scrolling/preservation of a 70,000-character safety value
with an unsupported Unicode glyph.
Port-audit baseline paths are resolved against the current checkout for the
known `releases/`, `programs/` and `runs/` corpus roots.
Metrics, corpus reports and the signing screenshot are written under `$TMPDIR`.
Font tables regenerate with `scripts/ui-library/generate-fonts.py` (fonttools
4.68.0, brotli 1.2.1); `scripts/ui-library/fonts.json` binds source bytes/instances.
`scripts/ui-library/generate-contrast.py` regenerates rational interval certificates.
The default `lake build` imports the unit tests, closed review-family certificate
and original family axiom checks; the two UI executables additionally build
the shell/range proof. The current range inventory embeds the exact axiom-audit
source used against the compiled modules; explicit source inspection is also available with
`cd lean && for module in Engine Contrast Check Keyboard Json Format Display Semantic Family Examples Structural Shell Range Parts;
do lake env lean "Ehr/Layout/$module.lean"; done`.

Source changes require a WASM rebuild and manifest check before app build,
recording re-certification and strict replay. Full template and persona browser
audits run sequentially under the shared browser lock. Layout research does not
switch the deployed painter or generator.
