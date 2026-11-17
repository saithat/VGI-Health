# Plain DOM clinical cut-over checklist

[Painter and exhaustive widget inventory](../methods/lean-painter.md) ·
[Layout contract](../methods/ui-library.md)

The experimental `/lean.html` page uses Lean display parts and checked layout
geometry with native DOM controls. The default application still uses React.
The dashboard and browser retain their own renderers. Application and WASM
hashes have changed; retained certificates are historical until rebound.

## Required before switching the clinical entry points

- [ ] Finish the structured list/table work: bounded paging, table and row-action
  placement, whole-row navigation, and the proved grid keyboard transitions.
  Keep complete source values and separate confirmation/acknowledgment events.
- [x] Improve dense geometry for large clinical boards. The two-patient ED note
  workflow uses the admitted dense family through signing. [Retained board
  measurements and live workflow](../audits/dense-boards.md).
- [ ] Relate tabs and their visible panels with the appropriate ARIA references;
  verify focus, arrow navigation and activation across patches.
- [ ] Validate board tasks with repeated component IDs and separate patient
  sessions, cross-patient modal ownership, urgent-rail visibility, drafts,
  signing and navigation at all three supported desktop viewports. The opt-in
  board URL is `lean.html?patients=<Patient.id>,<Patient.id>`; each pane must
  select its named patient explicitly. This is not the administrative bed board.
- [ ] Validate scheduled-dose MAR through the shared dose authority, including
  duplicate/stale attempts, blocked controls, all documented outcomes and
  independently authenticated cosigning. The opt-in Lean route accepts
  `marPatient`, `marRelease` and `marWorkflow` and uses the existing MAR session.
- [ ] Review charts and timelines using their complete values as well as their
  visual encodings. Lean supplies numeric/time geometry, axes, labels and
  reference curves. Unsupported numeric/date strings stay in the table. Plain
  timelines show source order; only dated timelines have a proportional UTC axis.
- [ ] Validate custom families and fixed-shell fallback on new rich shapes;
  a fallback may retain complete text while providing a simpler appearance.
  Bound rich marks undergo runtime G1–G11 checks. They do not acquire the
  fixed-shell universal theorem merely by sharing its painter.
- [ ] Provision the exact `/lean.html` authentication callback URLs in each
  identity deployment and exercise real sign-in, logout and return URLs.
- [ ] Decide the supported mobile/reflow and 200% text-resize contract. Current
  admission supports 1440×900, 1280×800 and 1920×1080 desktop viewports only.
- [ ] Decide the scope of the encounter/login shell and standalone `/adt` route.
  Do not delete shared dashboard/browser UI helpers while they have consumers.
- [ ] Validate the complete deployed release and workload through the Lean page,
  with required accessibility, screen, replay and protocol checks. Targeted
  widget tests establish their measured cases, not universal workflow coverage.
- [ ] Switch default clinical entry points only in a subsequent explicit change;
  remove the old clinical renderer/browser gate only after all its obligations
  have a named replacement and no remaining consumers.
- [ ] Rebuild the application and WASM, record the new hashes, and rebind the
  retained run evidence against the final implementation. Do not overwrite
  historical certificates or claim they certify this implementation.

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
