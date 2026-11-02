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
renamed copies of widget predicates. Specs/Props/Statements are unchanged.

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
The operator may supply `EHR_URGENT_ALERT_IDS` (a JSON array, not program data).
Before geometry measurement or scroll-into-view checks, the gate requires each
emitted designated demand to be unoccluded and wholly within the viewport.
Background demands hidden by another modal fail. The policy enters the screen
cache key. The accompanying adversarial checks exercise off-viewport and
modal-occluded demands. This initial-moment check does not establish an
all-moments urgency invariant; continuous/scroll/focus coverage remains future
work for the measured-view adapter.

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
