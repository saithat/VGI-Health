# Semantic UI language

Status: in progress. The original hospital properties, checker and D-theorems
remain authoritative. This additive model separates clinical meaning, perception
at a moment, and interaction cost. It does not certify pixels with Lean.

## Screen meaning and perception

A screen denotes information (identity, complete labeled clinical rows, source,
units and confirmation status), action offers (identity, label, enabled state,
reason and event), and attention demands. Meaning is independent of coordinates,
DOM tags, visual ordering, or choice of presentation. Multiplicity matters: an
extension cannot silently deduplicate records or controls. Summaries do not
substitute for complete required review content.

The current adapter observes `uiAtoms`: selected tab bodies and expanded groups
have already been resolved by the per-session interpreter. A closed tab or
collapsed group contributes no hidden children. Workspace, sidebar, navigation,
banner and modal remain separate regions. In particular, structural presence in
a background region is not perception through an open modal.

A perception moment supplies, for each semantic atom, viewport intersection,
legibility and lack of occlusion. This is evidence from the painter/screen gate,
not a proposition inferred from tree membership. `Perceives` requires membership
in the active region plus all three conditions. A modal makes the background
inert; the banner may remain visually visible but is not an actionable review.
Legibility includes readable size, contrast, no clipping and preserved labels,
values and units; the present browser gate checks only a subset of these.
For long information, perception means access to the complete record; a viewport
cannot show every row at once. `Available` means each required semantic atom can
be perceived after bounded, explicit view steps. It must not be confused with
simultaneous perception. A future cell-level adapter should refine large info
atoms rather than pretending an entire long table fits on screen.

The abstract `exposed` moment puts all tree atoms in view. It is useful for
proving exact correspondence to existing tree guarantees. It is not a browser
measurement. Render implications involving actual moments require explicit
exposure evidence. In particular D1/D2 do not imply an always-visible banner or
zero-scroll review; negative examples demonstrate this gap.

## Reachability and urgency

A view graph relates moments by one deliberate interaction: scroll, switch tab,
expand, zoom, focus a command, navigate, dismiss or acknowledge. `Within` counts
these steps, including zero. `Available` bounds steps to perceive content;
`ActionWithin` bounds steps to perceive an enabled action. Disabled offers do
not satisfy action reachability. The interpreter still decides whether an event
may execute. A physical keyboard chord and pointer click can realize the same
event but have different measured costs. Existence of an interpreter event trace
(property 6) alone is not a bound on these physical steps. Navigation depth in
property 1/D5 is likewise not a physical scroll or focus bound.

`UrgentVisible` requires every designated urgent atom to be perceived now,
without scroll, tab switch, collapse expansion or dismissal of an unrelated
modal. This must hold at every certified moment, including after scrolling.
Urgency is a human-owned policy input, not a painter's severity-color heuristic.
An interruptive alert also owns the interaction boundary: its acknowledgment is
perceivable and reachable, and background commits are not actionable. Passive
alerts must never acquire a modal boundary. These requirements compose with
A1–A4 (truth, triggering, persistence and tier), rather than replacing them.
Existing D4 proves the modal and acknowledgment structure, not viewport exposure.
No unconditional legacy-to-urgency implication is possible.

## Property correspondence

The semantic screen predicates use information and action identities, complete
rows and active perception, never a section name or a particular layout kind.
`Reviews` requires the exact review content at signing; receipt/waiver validity
continues to use `ReviewMetIn`, not a visual badge. `Honest` checks every offered
action against the interpreter's existing `UiActionHonest`; `FieldsClear`
requires nonempty field labels while D6 additionally preserves source,
confirmation and human-only flags. `Banner` requires the patient's identifying
fields. `ModalAck` requires the labeled enabled acknowledgment and a nonempty clinical
attention label in the active boundary; `Nonmodal` expresses absence of that boundary. Severity and urgency
are separate: a passive warning may be urgent without becoming a popup.

| Existing requirement | Semantic counterpart and limits |
|---|---|
| 1 WellFormed | Retain catalog/identity/reference invariants; landmark information available; required entry action reachable within declared graph depth. Browser step bounds need view-graph evidence. |
| 2 CapturesAllOnce | Same capture and persistence trace semantics; complete values, provenance and confirmation perceivable through FieldsClear/D6. No layout change may introduce writes. |
| 3 WritesOnly | Same permission/spec membership of effects; presentation contributes no new event authority. |
| 4 ReviewsBeforeCommit | Same successful-commit ReviewMetIn obligations and receipt/waiver rules; at a shown signing offer, complete applicable review content Available within the chosen bound. Zero-step perception needs explicit exposure. D2 supplements missing full reviews even for disabled signing. |
| 5 HumanOnlyKept | Same actor/event provenance and distinct cosigner; presentation/focus cannot create acknowledgments or captures. |
| 6 Completable | Same existential human event trace; ActionWithin adds a cost/exposure requirement, not implied by event-trace existence. General completion remains open. |
| 7 UnitsRight | Same typed capture units and prefill constraints; displayed unit preserved by D6. |
| 8 WithinBudgets | Same popup and moved-tag budgets; future paradigm distance is an additional human-owned metric. |
| 9 AlertsFire (A1) | Same truth-triggered inline demand and interruptive acknowledgment trace; add Perceives/Available for demands and UrgentVisible for designated urgent demands. |
| 10 NoFalseAlarms (A2) | Same alert-condition/key truth on the interpreter trace; no synthetic painter alarms. |
| 11 NoRepeatInterruptions (A3) | Same acknowledgment persistence and per-key interruption identity; view navigation does not reset it. |
| 12 SeverityTiers (A4) | Same passive-never-popup rule plus Nonmodal at render time; urgent passive information stays nonmodal. |
| 13 NavigationSane (D5) | Same Render.NavSane over actual navigator; view graph adds focus/scroll/zoom costs. No universal physical-cost implication. |
| D1 landmark | Banner structural identity; actual Banner perception conditional on exposure and no modal. |
| D2 workspace_required / required_info / commit_review | Reviews with complete uiRows, not compact summaries; structural equivalence at exposed nonmodal moments, conditional perception at measured moments. |
| D3 honest_actions / all_buttons | Honest for all offered atoms, including modal acknowledgment; converse holds because offers are preserved without filtering. |
| D4 interruptive_modal | ModalAck, with actual acknowledgment perception conditional on its exposure. |
| D4 passive_no_modal / passive_inline | Nonmodal / passive alert information present; actual perception requires exposure. |
| D6 clear_fields / field_labels | Exact capture/source/confirmation flags and FieldsClear; labels do not by themselves prove typographic legibility. |
| T10 / T11 supporting render results | Hidden controls absent; displayed records retain full source rows (or explicitly identified summaries). |

`Sem/Trace.lean` also combines the original commit-review trace obligation with
complete review content in every reachable nonmodal rendered signing view, and
proves finite interpreter-event completion equivalent to the original completion
property. This provides no uniform event bound and no physical step bound.

The Lean bridge proves the applicable render implications and structural
converses; it does not assert equivalence for stronger physical properties.
Clinical properties already stated over effects/actor traces are reused, not
renamed copies of widget predicates. Existing Specs/Props/Statements definitions
are unchanged; attention/physical policy data are additive.

## Proof-gated extension interface

A new primitive must supply:

1. A typed UiNode constructor and JSON/TypeScript schema. No string escape hatch
   may define new clinical actions or safety visibility rules.
2. A meaning adapter: complete child information/actions and attention identity,
   active-region behavior and view-graph transitions/cost. Occlusion, filtering,
   virtualization and semantic zoom require explicit information-preservation
   obligations, including how full review content is reached.
3. Kernel proofs of preservation of the semantic predicates under the adapter;
   exposure-dependent predicates carry those dependencies explicitly. Prove
   enabled offers still name interpreter events, no hidden/extra clinical
   effects, alert tier/urgency and actor restrictions. Provide concrete positive
   and rejected examples. Use only the repository's allowed axioms.
4. A DOM painter with accessible identity, labels, source data and event mapping;
   a renderer entry point applying the extension to a proved screen.
5. An independent screen-gate projection, all relevant tree traversals and
   legibility/visibility rules; positive and adversarial browser checks at both
   desktop and narrow viewports. This tested refinement remains trusted.

`Sem/Admission.lean` supplies a `PresentationExtension` package: a pure screen
transformer and a kernel proof of equality of meaning. `timelineAdmission`
inhabits that interface; `renderTimelineUi` renders through it. This is the
strong presentation-only case of the contract. A primitive that changes view
states must extend the contract with transition simulation and exposure
obligations; equality of meaning alone does not establish real geometry.

The first extension is an ordered clinical timeline: a labeled region around
ordinary children, preserving their supplied order and full detail. It neither
sorts undated data nor fabricates dates. `timelineScreen` wraps the workspace;
its meaning is identical, so proofs transport every moment-based predicate and
reachability graph under the same exposure evidence. `renderTimelineUi` applies
it to renderUi. Ordinary programs can also opt in on an expanded group with
`tag := "layout.timeline"` (or a namespaced suffix). That path uses the existing
per-session interpreter, native renderer and WASM API; collapse still follows
the original interpreter rules. The transparent-child lemma keeps the original
D-theorems and checker obligations intact. `Sem/TimelineProgram.lean` proves
checker acceptance of a canonical signing program and its semantic review and
action guarantees. The browser fixtures include both the standalone wrapper and
that program's actual output, exported by `Sem/ExportTimeline.lean` (argument
`program-screen` selects the latter). The independent screen gate checks region
and list ancestry, child order, complete source cells and legibility; adversarial
hidden/reordered children fail. This small extension establishes the admission
pattern; richer zoom/filter behavior requires additional proofs. Actual urgency
exposure remains conditional on a measured moment and human-owned urgent IDs.
[Alert urgency policy](alert-urgency.md) supplies a complete source-labelled
classification of 77 alert IDs, pending owner review. `Specs/AlertUrgency.lean`
keeps this additive attention policy separate from existing severity/guard rules.
`Sem/Urgency.lean` defines clinical activity independently of tree presence and
requires perception at every reachable interpreter/view moment while active.
Current modal and passive-inline render proofs establish it under explicit
presentation-coverage and pinned-layout evidence for every reached moment.
Initial perception is a consequence, not the complete obligation; a kernel
counterexample shows initial success followed by failure on a single scroll.
Today's programs have not established the model generally before popups, after
acknowledgment, behind unrelated modals or on hidden screens.

The screen gate uses that proposal's urgent IDs by default; operator
`EHR_URGENT_ALERT_IDS` adds IDs. It checks emitted demands initially and after
finite scroll/focus samples, preserving passive/nonmodal distinction. Policy
content enters the cache key. This detects sampled violations and does not prove
all possible moments or detect clinically active warnings omitted from the tree.
The owner-selected WCAG 2.2 AA physical constants and desktop/tablet/reflow/resize
matrix are documented in [the policy](alert-urgency.md); canonical violations
remain [findings](alert-urgency-findings.md), not exceptions to the gate.

## Board and source-dated timeline admission

`UiNode.board`, `patientPane` and `datedTimeline` are ordinary wire constructors;
the JSON instances, generated TypeScript, strict schemas, atom observers, painter,
row-placement/ARIA projections and browser traversals include them. The board
is a composition of independent ordinary programs through the native `board`
operation, rather than a program tag that invents another patient's state.
`Board.decodePane` observes the actual emitted node; `encoded_meaning` and
`encoded_board` recover each patient's complete ordinary screen, with exact
multiplicity, event identities, banner and foreground. Generic unscoped screen
meaning must not be used to erase patient namespaces in this composition.
`advance_refines` is literal ordinary-interpreter execution on the selected
session. `dispatch_valid` retains unique source bindings; `other_sessions_exact`
retains every byte of the other sessions. Clinical commits keep T0, including
selection-enabled workspace steps at their hydrated pre-event state. No new
clinical event constructor or persistence authority is introduced.

`demands_prepared` proves that sanitizing receipts does not change demands: clinical predicates and alert keys do not read receipt lists. Pane and rail evaluation therefore agree on the prepared session.

Board receipt import is an explicit patient/episode namespace. Every render and
step overwrites both incoming unscoped receipt lists with the filtered envelopes.
`receipt_scope`, `foreign_no_effect` and `foreign_review_inert` establish that a
foreign patient's receipt cannot affect any review or guard; concrete positive
and rejected examples exercise signing with the same receipt value. Existing
core checks retain version, age and role restrictions. An absent episode remains
explicit legacy metadata, not evidence of cross-encounter provenance. The host
still authenticates FHIR and loaded state; the API verifies matching source IDs
on facts and display and never routes by a displayed name or MRN.

The chosen cross-patient urgency policy is board-wide: all active urgent rules
for every pane contribute a patient-labelled rail, including hidden and already
acknowledged conditions. Urgency does not change an alert's tier. The rail is
inside the global modal interaction boundary and outside pane scrolling. The
first pending modal owns clinical interaction; the others wait in pane order.
`BoardView` models physical steps with an explicit measured-transition witness
and actual scoped dispatcher events. Its
`Ready` predicate requires both exposure and global interaction authority;
`view_trace_valid`, `ready_source`, `untouched_trace` and `blocked_no_effect`
connect reachable controls and events to the bound source, exact banner and
unchanged other sessions. Lookup, hydration and return keep all ordinary panes
and the global rail present, with an explicit patient-selection heading while
that pane has no clinical banner. `active_urgent_in_rail` proves clinical coverage independently of tree presence;
`render_rail_perceived`, `render_rail_urgent_visible` and
`view_semantic_urgency` connect the actual emitted rail to existing `Perceives`
and `UrgentVisible`, in separate patient namespaces with unchanged severity.
`continuous_cross_patient_urgency` proves perception through arbitrary finite
interpreter/view paths under separate viewport, legibility and occlusion evidence
at every reached moment. The full source banner stays in flow while a compact patient/MRN identity
remains pinned. Independent panes share the bounded area below the urgent rail;
modal placement uses the rail’s measured lower edge. The gate scrolls to every
enabled control and checks its hit-test together with its patient identity. A
long-banner occlusion counterexample and a covering-overlay adversary guard this
refinement. Background actions are inert while a modal owns the
board. Real geometry remains a measured refinement, including rail overflow;
no unconditional pixel or screen-reader implementation theorem is claimed.

The dated candidate projection covers exactly `effectiveDateTime`, otherwise
`effectivePeriod.start`, plus `issued` separately. It does not cover onset,
authoredOn, performed*, recordedDate, occurrence* or Encounter.period. Supported
backings are latest vital rows (same code/raw-time selection as `uiRows`) and
complete laboratory histories, with exact cell projection and information ID.
`DateIndex.select` checks the original candidate occurrence number, matching source
DTO and a complete row in the actual emitted workspace/side atoms. Thus an equal
hidden occurrence cannot borrow permission; arbitrary raw bundle membership does
not authorize an index entry. Payload overrides carry no inferred permission.
`timeline_backing_provenance`, `timeline_backing_occurrence` and
`timeline_entries_sources` connect FHIR backings to their records and enumeration.
`uiDateSourcesAt_shown`/`uiDateSources_present` and `DatedTimeline.sources_shown`
provide emitted-row witnesses. Both ordinary and native paths enforce workspace
binding and matching present source patient IDs (`sources_bound`); unbound lookup
adds no index. The render-only `date-index` API applies the same selector to native
exported snapshots; it has no execution or persistence authority.

Normalization requires full time with seconds and an explicit `Z` or numeric
offset (at most ±14:00), signed UTC seconds and up to nine fractional digits.
Nanoseconds have type `Fin 1000000000`; JSON decoding checks the bound. Stable
sorting, `chronological`, `source_exact`, `no_dated_drop` and `no_source_drop`
cover every selected occurrence. The candidate extraction lemmas are relative to
the exact three-field scope above. Date-only/local, invalid, unknown-offset
`-00:00`, leap-second and higher-precision values remain explicitly unpositioned.
Pre-1970 instants are supported. `slice_exact` retains the wasm32-safe substring
semantics. No local timezone or midnight is inferred.

The original `uiAtoms`/`meaning` projection and preservation/perception/urgency
lemmas cover clinical children only. They do not establish index soundness.
`DateIndex.observe` instead retains the complete dated and undated payloads,
including raw provenance, order, duplicates and patient/modal namespaces;
`payload_injective` prevents erasure from justifying admission. `IndexedExtension`
requires this full observation equation as well as clinical preservation.
`fullAdmission`, `full_preserves`, `render_full`, `node_observation` and
`uiDatedWorkspace_observed` discharge it for the actual presentations. Native
responses export that observation and the independent gate compares source bytes,
coordinates, multiplicity, order and patient scope against DOM rows, including
reorder/drop adversaries. The existing clinical view graph and exposure hypotheses
are unchanged. The single-patient dated board shares the cross-patient urgent rail.
The index never replaces clinical rows, reviews, actions or modals.
A canonical program passes
the unchanged checker. Browser adversaries reject reordered/dropped entries and
hidden urgent demands at desktop and narrow widths. The ordinary gate covers
all emitted cohort views and composed native program exports; the stock gate
attempts all exported backing-program states, including unbound patient pickers.
Its legacy unrelated-modal urgency findings are retained and do not certify the
promoted painter. Actual ordinary composition has a separate mandatory gate.

## Target design space

| Paradigm | Semantic shape | Hard obligations |
|---|---|---|
| Timeline chart | Events, orders and notes aligned on a shared temporal axis with full-detail children | Undated/conflicting records, complete reviews spanning time, urgent demands while scrolling |
| Semantic zoom | Patient overview → episode → record detail, with explicit zoom transitions | Summary versus full-review evidence, bounded access to hidden detail, preserved units/source |
| Spatial workspace | Movable patient-bound documents and action surfaces | Occlusion, identity after dragging, keyboard focus, pinned urgent demands |
| Keyboard command interface | Discoverable commands and typed fields with the same interpreter events | Honest disabled commands, no bypass of human review, focus-step bounds, visible acknowledgment |
| Multi-patient board | Independent patient-bound meaning with scoped action offers | Wrong-patient prevention, cross-patient urgency, review receipts bound to patient/version; requires separate concurrency semantics |
| Ambient glanceable display | Persistent compact demands with drill-in clinical records | Legibility at distance, passive/interruptive distinction, full detail without alert fatigue |

The per-session Lean interpreter and DOM renderer remain mandatory in all six.
The independent concurrency lane owns Ehr/Multi and the commit service; this
work does not alter them or claim cross-session guarantees.

## Overnight exploration proposal

Propose one paradigm hypothesis per persona/workflow, then generate several
variants with distinct information organization and interaction paths. Restrict
generation to admitted primitives; proposing a new primitive starts a separate
reviewable language-extension change with proofs and screen rules. Certify the
unchanged clinical obligations plus the semantic exposure/reachability contract,
then exercise the simulator and browser gate. Keep a portfolio across completion,
interaction cost, urgency exposure, stability and paradigm diversity. Compare on
held-out workflows and release migrations; do not collapse the portfolio to one
locally optimized fork. Human review owns policy, urgency classification, bounds
and admission of new semantics. Existing checker acceptance is necessary and
remains insufficient for unproved completion or measured perception guarantees.

The stock urgency gate uses the same `UrgentDemand` alternative as the proofs:
a matching modal title and enabled acknowledgment can convey that alert while
its inline background copy is inert. A different alert's modal cannot satisfy
it. Regression checks cover the positive same-alert case, unrelated modals,
hidden acknowledgments and disabled acknowledgments at both widths. The initial
promotion gate failures and the correction remain in the ignored run artifacts;
no urgency ID, tier or hospital obligation was changed.
