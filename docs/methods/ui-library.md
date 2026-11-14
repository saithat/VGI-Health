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
reports overflow rather than restricting the input language. A dynamic
bounded-list authoring primitive remains to implement.

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
| G3 | Every declared target is at least 1536×1536 units (24×24 px); active target pairs are separated. Ordinary targets blocked by a modal are inactive. Shared scrollers use content coordinates; independent regions use conservative viewport envelopes. |
| G4 | Painted footprints or their outer scroll viewport are contained. Text has valid pinned metrics, positive capacity/lines, sufficient vertical reserve, bounded non-safety wrap capacity, and unbounded vertical wrapping for safety text with a pinned escape alphabet. Active text cannot intersect higher paint or unrelated paint at the same z; ancestor backgrounds at the same z are exempt. `layoutAccepted_textPixels` proves separation for arbitrary scrolling. |
| G5 | Every outer footprint has nonnegative x and right edge within viewport width; scroll content fits the nearest viewport horizontally. |
| G6 | Foreground/background contrast is at least 4.5:1 for ordinary text, 3:1 for text ≥24px or ≥18⅔px at weights ≥700, and 3:1 for targets. Colors are opaque 8-bit sRGB. Outward-rounded rational luminance bounds have exact integer fifth-power certificates (`channel_certificates`); no floating point enters the check. |
| G7 | Expected semantic occurrence paths and painted IDs are unique; each expected path is painted exactly once and no invented source path is painted. The W1 adapter derives the inventory from the actual `UiScreen`; the lower-level proposal API takes the expected inventory as an input. |
| G8 | Document order is top-to-bottom, then left-to-right at equal y. Within a shared scroller use content positions; between regions use outer viewports. Distinct z layers are separate reading regions. This does not establish an assistive technology's traversal order. |
| G9 | At 1440×900, **if any current-task commit target is present**, exactly one is fixed and fully contained without page scrolling. A screen with no current-task commit is exempt. Other sizes impose no extra commit constraint. Family admission links commit flags to the actual semantic source, preventing omission to claim an exemption. |
| G10 | *New specification (R5).* At 1440×900, at most `maxTargetsPerViewport` active targets (default 15, `DesignRules.maxTargetsPerViewport`) in the first viewport, meaning every enclosing scroll offset at zero, and at every scroll offset of each scroll viewport. Other sizes impose no density constraint. It is checked by `checkDensity` next to the G1–G9 conjunction; see "Action density" below. |

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
and grid bounds/row boundaries. Optional deletion, popup menus, multiselection,
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

`Semantic.portScreen` maps every `UiNode` occurrence, including wrappers, to a
unique path and retains user-facing labels, values and rows in safety-classified text. W1 signing
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

**Universal bridge.** `screenShape` erases patient labels/values and info-table
rows, while retaining occurrence paths, interaction/commit placement classes
and structural line reservations. `compileShape` never reads content.
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

`Realizes` includes G1–G9 on the actual semantic inventory, linked source roles,
exact full original values and the unbounded safety-text preservation/width
contract. `Covered` is finite structural family membership, with no string or
row-count bound. For a finite descriptor, `RenderCovered` requires every actual
EHR render shape reachable by human/macro events or time to belong to the
admitted family, for every Facts/Display/user. The theorem makes that premise
visible; the structural program certificate below discharges the corresponding
obligation for the fixed-shell compiler.
The all-states theorem needs no coverage or reachability premise: it establishes
partial correctness for every EHR input state, including unreachable states,
and identifies missing structural cases exactly. It does **not** promise an
output for an uncovered shape. The all-screens theorem needs only local shape
membership and applies to every payload of that shape, including unbounded
lists represented inside an info node. `realized_currentCommit_visible` proves
that a linked, complete current-task source cannot be hidden to obtain G9's
no-commit exemption. `finiteFamily_missingShape` proves that a finite shape
family cannot cover all possible UiScreens; it does not rule out coverage for a
particular EHR Program. Therefore finite probes are not treated as a global
coverage proof. Patient-directory controls can introduce structural growth even
when clinical table rows stay inside a single info node. The parameterized structural
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
commit and zero, one or two fixed interruptive occurrences. `shell_rules`
quantifies over arbitrary body lists, source paths and target masks, assuming
only unique source paths and at most two modal occurrences. Its conjunction is
the unchanged G1–G9. `Shell.certifiedClass_allScreens` has the same complete
`Realizes` conclusion as the ordinary class, now including these fixed regions.
`Shell.certified_currentCommit_visible` additionally identifies the actual
current-task source and proves its target, commit and fixed visibility flags at
1440×900, including under a modal. All strings remain unbounded scroll text.

The commit is a fixed 24px row at y=104px, between the banner ending at 104px
and the body scroller starting at 128px. It meets the unchanged 24px G3 minimum;
it is independent of body length and scroll position. Modal occurrences use a
higher fixed layer, and ordinary targets cannot dispatch while that layer is
active. `structural-paint` selects `fixed-shell-v2`; malformed/oversized modal
shapes still decline. This is a semantic text-card layout, not deployed widget
fidelity. The font assets and script policy are shared with the ordinary class.

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
`[y + o, bottom + o)`. The check inspects one candidate window per target,
starting on its last row; `G10_window` proves this bounds every offset.
`checkDensity` is `check` plus G10 (`layoutAccepted_density`). Findings use rule
`G10` with metric `first-viewport-targets` or `scroll-window-targets` (node: the
scroll viewport), the count, the limit and the excess.

`Ehr.Layout.Density` proves that the fixed shell meets G10 at capacity
`shellCapacity = 15` for arbitrary bodies, paths, target masks and at most two
modals (`shell_density`). The body scroller is 756 px tall with 48 px rows on a
56 px pitch, so any window meets at most 15 rows; the first viewport shows 14 rows
plus the fixed commit. With a modal present only the modal targets are active.
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

The release programs reach 11 targets in the first viewport and 15 in a scroll
window, so the default limit equals the shell's capacity and no fixed-shell program
can fail it. Density on the fixed shell becomes scrolling. G10 constrains custom
layouts and any lower limit. A limit below 15 refuses every program, since the
program decision is static.

The program inventory covers **6/6 canonical programs** and **52/52
accepted noncanonical programs** (54 matching spec contexts). Across all 186
paths, 113 distinct programs, 118 contexts and 3,472 declared screen occurrences,
there are **no uncovered programs or screens**. The separate empirical checks
accept 7,944/7,944 structural probes and 3,468/3,468 shell geometry checks,
including G9. The original W1 port also remains 3,468/3,468; the two named bad
clinical inputs remain refused. The [current range inventory](../audits/ui-certs-range-20261107.json)
records every program alias and declared screen, program/spec/source hashes,
exact theorem statements and verification commands. Those counts are backed by
`renderer_range`, rather than inferred from the finite probes.

The [earlier ordinary-class inventory](../audits/ui-certs-20261107.json)
records the narrower `repeat-body-v1` implementation. The current fixed-shell
range inventory supersedes its coverage limits.

There is also a closed positive certificate: `reviewFamily_accepted` proves
admission of `reviewFamily` with proof-producing `decide_cbv` (kernel checked,
no native evaluation axiom). `layoutAccepted_reviewAllPayloads` states:

```lean
∀ (banner : List (String × String)) (rows : List (List (String × String)))
  (enabled : Bool) (reason : Option String) (v : Size), v ∈ viewports →
  ∃ painted,
    familyPaint reviewFamily (reviewScreen banner rows enabled reason) v = some painted ∧
    Realizes (reviewScreen banner rows enabled reason) v painted
```

This has no length, glyph, shape-membership, coverage or runtime-acceptance
premise. It is a semantic review/sign family with arbitrary banner fields,
review-table rows and enabled/blocked reason; it is not a theorem that every
state of the deployed EHR renderer has that exact shape.

**Not proved / incomplete.** G10 is not part of `Realizes` or `Rules`; it is a
separate conjunct of the density theorems. Close widget
fidelity, bounded-list authoring, complete DOM/APG integration,
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
  scripts/ui-library/fonts.test.mjs
node scripts/ui-library/port-audit.mjs --all-screens
pnpm --filter app typecheck
pnpm --filter app lint
flock "$TMPDIR/vgi-browser-heavy.lock" pnpm --filter app exec playwright test --config src/browser/ui-library/playwright.config.ts
```

Targeted checks passed 21 native regressions (19 layout/program tests and two
font tests) and seven Playwright tests (one worker under the shared lock, after
the refreshed port audit). The differential compared
228 boxes, 153 text lines and 6,861 intrinsic glyph advances: all worst
deviations were 0 CSS px. The named-declaration audit covers 186 theorems. Environment-wide inspection
also checks generated helper lemmas: 1,143 theorem declarations, of which 592
are axiom-free and 551 use only `propext`, `Classical.choice` and `Quot.sound`.

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
`cd lean && for module in Engine Contrast Check Keyboard Json Semantic Family Examples Structural Shell Range;
do lake env lean "Ehr/Layout/$module.lean"; done`.

Source changes require a WASM rebuild and manifest check before app build,
recording re-certification and strict replay. Full template and persona browser
audits run sequentially under the shared browser lock. Layout research does not
switch the deployed painter or generator.
