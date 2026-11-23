# Alert severity within one occurrence

**New specification for owner review.** An alert's own display part carries
both its complete label and the existing severity plot. It has no extra
severity-icon leaf. This applies to ordinary alerts, urgent strips, board
demands and patient-pane alert atoms. A strip's unchanged six-occurrence
capacity therefore accommodates five alerts and one acknowledgment, or four
alerts and two acknowledgments.

Lean binds normalized plot coordinates with integer arithmetic into a leading
square. Its side is the alert box height in the fixed shell and dense layouts;
for an arbitrarily narrow custom box, the side is the smaller of width and
height. `alertSquare_inside` proves containment for every rectangle, and
`alertSquare_side` proves the full-height case. `widgetBox_rect` and
`widgetBoxes_rects` prove that binding never changes occurrence rectangles.

The text slot reserves that square's width as `inset`. Capacity and scroll
wrapping use `width - inset`; `scroll_line_width_inset` proves each scroll
line's width fits that remainder. The DOM painters consume the same inset. After a modal or content change,
the Lean DOM painter also reconciles retained scroll translations with the
browser's actual offsets, including resets that delivered no scroll event.
Text and the icon share the box's opaque background and ink. Existing G4
checks the reduced text capacity, while G6 checks the plot's contrast. Bound
family, structural and program outputs run G1–G7, G10 and G11 on the bound boxes before
reporting acceptance. Custom geometry with insufficient text width is refused.

Since `dense-reference-v11`, the generator reserves the inset in both dense
and serialized fixed-shell text slots before family admission. The fixed
shell's Lean output also binds the plot and inset. No density policy, strip
capacity or screen-state enumeration changes.

New specification for owner review applies to these new or changed definitions:

| Area | Definitions |
|---|---|
| Display inventory | `ownPart`, `leafParts`, `demandPart`, `stripAtomPart` |
| Text geometry and JSON | `TextSlot` (`inset`), `capacity`, `textLines`, `Json.textSlot` |
| Mark binding | `alertSquare`, `widgetBox`, `widgetBoxes` |
| Output checks | `structuralOutput`, `programOutput` |
| Reference generation | v11 version, alert leaf inventory, `validate`, `card`, `layoutFor` and the resulting `fixedShellFor` output |
| DOM and regression host | the text-slot JSON schema, alert text positioning in `patch` and the research `Painter`; the optional synthetic allergy fixture |

Existing theorem statements are preserved. The new `alert_one_part` theorem
also states that an alert has no leaf parts and its own part carries the plot.
The regression guards restore the original strip cases, three urgent rows,
and the three-occurrence reference strip bound. The smaller added strip cases
remain checked as well.

[Verification and replay evidence](../audits/alert-occurrence.md) records the
build checks, browser comparison and retained-trace measurements.
