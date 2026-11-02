# EHR interface design space

Status: early research, 2026-11-02. Personalization belongs to a **department ×
role**, using work sampled across that department. Publication is a reviewed,
slow-cadence release (initial proposal: monthly), independent of search cadence.
Historical per-persona nightly runs are evidence inputs, not this deployment model.

## Fixed task level

Use the Cameleon chain `task model → abstract UI → concrete UI → final UI`.
A task model is independent of screen IDs. Let its syntax be
`T ::= atom | seq(T*) | parallel(T*) | choice(T*) | optional(T) | repeat(T)`.
`seq` is enabling, `parallel` allows either interleaving, and `choice` selects a
scenario branch. An atom is `(id, actor, input/output identities, commit?)`.
This is a ConcurTaskTrees-style algebra, not an import of every CTT operator.

For release spec S, clinical state x, actor u and commit c, define the immutable
commit contract:

```
K(S,c,x,u) = roleAllowed(S,c,x,u)
  ∧ ∀ e ∈ S.entries(c), whenHolds(e.when,x) → entryMet(e,x,u)
  ∧ ∀ r ∈ S.reviews(c), whenHolds(r.when,x) → reviewMet(r,x,u)
  ∧ ∀ a ∈ S.alerts(c), triggeredInterruptive(a,x) → humanAcknowledged(a,x)
```

This notation refers to the existing guard definitions; the Lean interpreter,
not this document or TypeScript, decides it. Entries include slot, unit,
confirmation, provenance and human-only requirements. Reviews include exact full
information, receipt roles, expiry, record version and specified waiver. At each
commit offer, applicable required review content must remain available with the
declared view bound; an old summary is not that content. `UrgentVisible` and
actual perception require measured exposure, independently of structural presence.

Task models below derive from `Canonical/W1Visit.lean` through `W7Refills.lean`,
`Sim/Goals.lean`, and release specs exported from `Specs/V1.lean` (with V2/V3
release deltas). The sequence describes the canonical workflow, **not a new
clinical prohibition on every other ordering**. Only guard/spec prerequisites
are hard enabling constraints. A redesign may interleave independent draft work.

| Workflow | Task decomposition (semicolon = seq, `∥` = parallel, `?` = optional, `*` = repeat) | Commits and information contract |
|---|---|---|
| W1 outpatient | select patient; room/intake; medication reconciliation; (history/ROS ∥ exam/assessment/diagnosis); (medication order* ∥ lab order*)?; review/sign orders?; instructions/follow-up/billing; sign note | `signOrders`: allergies, current medications, weight-based dose check, controlled-order CURES/summary, pre-op anticoagulants when applicable. `signNote`: all conditional note/billing entries from S; note review is canonical context, not an invented required review. |
| W2 results | select result; (review detail/trend ∥ choose clinical action); (follow-up test ∥ patient message)?; acknowledge | `ackResult`: resultDetail always, resultTrend for abnormal results; action/message/follow-up entries according to S and scenario. |
| W3 ED | track board/select patient; triage; (provider documentation ∥ single-order* or order-set draft); review/sign orders?; choose admit/discharge/transfer/observe/consult disposition; finalize note | `signOrders`: same conditional prescribing contract as W1; `disposition`: latest vitals and required disposition/diagnosis/condition/admission entries; `signNote`: required note/billing/instructions. Provider note signing exists before disposition in canonical navigation; goals may supply these fields earlier. |
| W4 ward RN | select assigned task; MAR/dose context; scans and assessment; independent check if high-alert; choose given/held/refused; record; (flowsheet/pain reassessment ∥ SBAR)? | `administerMed`: dose details, allergies (or valid RN receipt), insulin glucose, anticoagulant coagulation results, human scans/cosign and relevant documentation; `chartAssessment`: required assessment entries. This does not reserve a shared dose; see concurrency design. |
| W5 pediatric clinic | select/room with today's kg/growth measures; growth review; note/diagnosis; weight-based orders?; review/sign orders?; vaccine review/record*?; instructions/guidance/billing; sign visit | `signOrders`: prescribing contract, including doseCheck when weight-based; `recordImmunization`: allergies/history (or valid receipts), vaccine/lot/manufacturer/provider/site/route/VIS entries according to S; `signNote`: note and visit-close entries. |
| W6 surgery | choose consult/case; consult/diagnosis/sign?; pre-op consent/H&P/NPO/medication holds; orders/review/sign?; operative documentation/sign; post-op draft orders/review/sign?; rounding; discharge | `signOrders`: prescribing contract including pre-op anticoagulants; `signOpNote`: intraopRecord or valid surgeon receipt and operative entries; `discharge`: currentMeds shown, allergies shown/receipted, discharge entries. Consult `signNote` uses the ordinary note contract. |
| W7 refills | select request; (last visit ∥ relevant labs ∥ adherence/current medications); choose approve/deny/modify; pharmacy/dose/quantity/refills and rationale; commit | `approveRefill`: relevantLabs shown, lastVisit/adherence shown or valid authorized receipts; `denyRefill`: applicable denial entries from S. Canonical decision UI and scenario goals determine which branch is exercised. |

`explore/tasks.ts` extracts each workflow's commit set from canonical action
offers and copies **all** corresponding entries, reviews, alerts and role rules
from the selected release. Thus the table is readable, while the machine task
contract preserves release-specific conditions rather than an incomplete field
list. Source hashes accompany exports. No task model authorizes new clinical
effects, supplies human acknowledgments, or weakens a Lean property.

## Design points and realizations

Let D be the typed product below, W a workflow set, and A(W) its task atoms.
A design is `(d, μ, p, r)` where `d∈D`, `μ:A(W)→abstract interactions`, p is an
interpreter program, and r a concrete renderer. The abstract interaction maps
tasks to selection, inspection, draft entry, review and explicit human commit.
The compiler realizes those interactions as existing fields/actions/containers;
the final UI is the versioned renderer + viewport + exported interpreter state.

| Dimension | Typed values | Current language / extension boundary |
|---|---|---|
| navigation | list, tabs, timeline, spatial, command, conversational | Lists of goto actions and tabbed content exist. Timeline is ordered full-detail content through `layout.timeline`, not a temporal routing engine. Search and explicit hotkeys exist; a complete command navigator needs admission and browser checks. Spatial/conversational routing is sandbox until transition refinement exists. |
| layout | stack, columns, document, timeline, spatial, board | Stack/sections and columns are Lean UiNodes. Document is full-detail document presentation inside the existing layout. Ordered timeline is admitted by `Sem/Admission`/`Timeline`. Spatial occlusion/drag/zoom and independent multi-patient board are sandbox pending extension and concurrency contracts. |
| input | mouse, keyboard, voice | Mouse and keyboard events/hotkeys map to the same interpreter. Voice capture/confirmation requires an explicit adapter, provenance and human boundary; sandbox today. |
| alert channel | spec, persistent-rail, audio | `spec` retains all configured passive/interruptive behavior. Persistent rail needs exposure/occlusion evidence and admission where semantics change. Audio cannot replace required visible acknowledgment; sandbox today. |
| density | normal, compact | Existing sizes; minimum legibility remains mandatory. No tiny text escape. |
| patient scope | single, multi | One patient-bound session plus selection exists. Simultaneous independent patients require scoped events/receipts and the concurrency lane; sandbox today. |
| temporal view | encounter, longitudinal, aligned | Encounter views and full historical tables/trends exist; timeline preserves supplied order without inventing dates. True aligned axes/filter/semantic zoom need missing-data/full-detail proofs and empirical geometry. |

An abstract request is not evidence of realization. The initial compiler supports
list navigation with stack/columns/document, timeline navigation with timeline
layout (an ordered review path), mouse/keyboard, spec alerts, normal/compact,
single patient, encounter/longitudinal. It rejects incompatible certified points;
unsupported points produce an explicitly sandboxed custom-component manifest
around a clinical program. A sandbox manifest never acquires a certificate from
checking only its backing program. The broad product is intentional: missing
primitives are research outputs, not silently coerced designs.

## Assurance and admissibility

* **Proved**: accepted unchanged Lean behavior/rules and Lean layout semantics,
  with only admitted constructors/extensions. This label does not prove pixels,
  general completion, current FHIR persistence, or human usability. Actual
  perception/reachability remains conditional on measured exposure.
* **Checked**: accepted unchanged Lean behavior/rules with another renderer.
  Every exported state at every declared viewport must pass independent
  accessibility identity/content/event and geometry assertions. Preserve full
  rows, units/source, modal boundaries, honest disabled actions and patient
  binding. Record renderer/build hashes, coverage and failures. Missing gate
  evidence fails closed; passing a few screenshots is insufficient.
* **Sandbox**: simulation only, including proposed custom primitives. Never
  deploy. Report backing-program checker results separately from renderer
  assurance; they cannot promote this tier.

The extension contract in [semantic-ui.md](semantic-ui.md) remains authoritative.
Meaning equality alone is inadequate for new view-state transitions. Shared
patient/bed/dose authority remains in [concurrency.md](concurrency.md). No tier
claims that the current client writes close the concurrency/persistence gap.

## Quality diversity and evaluation

Archive key = `(tier, navigation, layout, input, density, patientScope,
temporalView, alertChannel)`. These are categorical **realized** descriptors,
not arbitrary LLM novelty scores. Partition by department, role, release,
workflow set, renderer and workload protocol; never compare incompatible tasks.
Future empirical niches can add measured view-depth/urgency-exposure bins only
when those measurements exist. Keep program hash and the design point together.

MAP-Elites retains the best completed candidate **within each niche**, even when
it loses globally. Quality first maximizes completion, then minimizes measured
activations/scrolls/keys under a declared fixed objective; retain raw metrics.
This replaces per-persona monotonic hill-climbing and its small patch vocabulary.
Untrusted LLM operators may generate whole design points and programs, mutate
either, and combine parents from different niches. Historical stability budgets
still apply against an explicitly fixed prior release; do not certify against
the candidate itself to evade the moved-tag check.

Evaluation order: static schema/constraints → native `ehr check` hard filter for
proved/checked → renderer screen gate → department × role simulator workload.
Surrogates may prioritize evaluation, never certify or label a skipped candidate
as accepted. A deterministic baseline, local open decision model and optional
TabPFN screen share typed Choice and Score interfaces; probabilities require
calibration on held-out labeled decisions. Record the simulator provenance of
trajectory labels; no human preference claim follows from imitation.

The first run uses ED × physician / W3: triage, complex multi-order composition,
review, note and disposition stress more of the task contract than a narrow
single-form benchmark. P2 is the available synthetic policy, not the department
population. Pool multiple workload days and disclose this limitation. Search
publication remains manual and slow; this harness never calls deploy.
