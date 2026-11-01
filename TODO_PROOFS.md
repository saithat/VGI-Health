# Proof status

`sorry` is allowed during development only if listed here. Final files must have none.
Implementation files have **no `sorry`**, no `native_decide`, and no new axioms.
The finished implementation theorems use only `propext`, `Classical.choice`, `Quot.sound`
(`#print axioms` in `lean/Ehr/Proofs/Audit.lean`; `lake check` accepts the project).

| Theorem | Statement (plain words) | Status | Where |
|---|---|---|---|
| Composite expansion | Source properties are the properties of successful expansion; non-use components are retained exactly | Candidate proofs compile with permitted axiom audits in `Core/composites-pending.patch`; not integrated into checker-owned `Satisfies`, full `lake check`, or Comparator. Blocked on constructor/render compatibility and owning-lane integration; no `sorry` or new axioms. | lean-core / check |
| T0 | The interpreter never performs a commit unless its review and human-only requirements are met | **proven** for the interpreter (`T0_commit_needs_guard`, plain-logic form `commitGuard_iff`, units/human-only corollary `T0_entry_values`; stronger allowed-value equivalence `commitGuard_iff_values` and value corollaries `T0_entry_values_allowed`, `T0_entry_values_perLine`, with the constraint on the same confirmed capture) | `lean/Ehr/Proofs/T0.lean` |
| T1 | If the checker accepts a program, it satisfies properties 1–13 | **unrestricted statement refuted; positive fragments proved** (`Scalar.completable`, `satisfies_of_checked_scalar`, `scalar_identity_satisfies`): general soundness proved for properties 1–5 and 7–13, plus all decidable structural clauses, commit entry/review/cosign/alert obligations, reachable-screen and CR-6 request invariants. The five expanded contract families are proved by `commitContracts`; actual human entry construction is proved by `human_enter`/`human_entry_exists`. Remaining: general completability (property 6), including navigation/reveal, archived-line invariants and joint entry repair; finite alert discharge is now proved by `human_finish_ready`; assemble full theorem and Comparator statement. No unfinished theorem is asserted as proven. | `lean/Ehr/Check/{RuleSound,GuardSound,ScreenSound,PinSound,PartialSound,BudgetSound,SeveritySound,RequestSound,WritesSound,EnterOnceSound,HumanSound,HumanEventsSound,AlertSound}.lean` |
| T2 | A review prompt is skipped only with a valid receipt | **proven** for the interpreter: an applicable review requirement whose info was not shown was covered by a valid receipt (same version, inside the window, allowed role) or a human-entered waiver (`T2_receipts_sound`); `shownOnCommit` without a waiver means shown (`T2_shownOnCommit_shown`) | `lean/Ehr/Proofs/T2.lean` |
| T3 | Human-only steps are never automated | **proven** for the interpreter: macro steps and macro runs never commit, ack, create receipts, or capture human-only values (`T3_macro_step`, `T3_macro_run`); prefill never captures human-only values (`T3_prefill_never_human_only`); a cosign is by a human and a different user (`T3_cosign_distinct`). Checker-side "rejects such programs" is part of T1. | `lean/Ehr/Proofs/T3.lean`, `T0.lean` |
| T4 | `ehr deploy` publishes only programs with an ok verdict | **proven** (`T4_publish_only_if_ok`, `T4_rejected_not_published`, `T4_published_certificate`; axioms: propext, Classical.choice, Quot.sound) | `lean/Ehr/Proofs/CheckDeploy.lean` |
| T5 | Abstraction facts match the FHIR data | **proven**: today’s weight has exact source/date/unit/value evidence; versions cover all source resources and are permutation invariant (digest collision freedom remains a stated assumption) | `lean/Ehr/Render/FhirProofs.lean` |
| T6 | Macros behave like their expansion or stop at a guard | **proven** for the interpreter: a macro run gives the same state as folding the public `step` with `actor := macro` over its steps (`goto` as navigation), stopping at the first non-ok step; same ok/stop result (`T6_macro_is_fold`, `runMacro_ok_iff`); and, reusing T3 per step, no macro run commits, acks, creates receipts, or captures human-only values (`T6_macro_run_safe`) | `lean/Ehr/Proofs/T6.lean` |
| T7 | Counterexamples are genuine | **partial**: replay and a failed static rule are proven; every returned navigation/reveal event succeeds (cut paths included), with at most one final triggering click. The BRIEF's stronger assertion that every rejection demonstrates semantic falsity is **false for the present conservative rules** (`T7_semantic_rejection_false` gives a safe rejected program). A verdict/property contract decision is required; no safety rule or property was weakened. Conservative rules can reject without establishing `¬ Satisfies`; do not present these replay theorems as full T7. | `lean/Ehr/Check/ReplaySound.lean`, `RuleSound.lean` |
| T8 | Releases preserve old obligations; only the catalog may grow | **proven** for executions of the installed release: `OldObligations` projects older entry/review requirements and preserves human actions, units and alerts. General `T8_checked_old_obligations` starts directly from `check = ok`, without assuming T1. Semantic `T8_old_obligations`, plus `T8_v1_to_v1_1` and `T8_v1_1_to_v2`, use the actual `Spec.Extends` witnesses. `T8_unqualified_false` remains the counterexample to full old-catalog transport. | `lean/Ehr/Props/OldObligations.lean`, `lean/Ehr/Check/Monotonicity.lean` |
| T9 | Minimum clicks is exact | **proven** for certified search over the reported goal-relevant space (`T9_jointMinimum`, `T9_taskSearch`, `T9_minimum`, `T9_minimum_real`): real interpreter replay at the claimed cost, and no cheaper allowed goal-reaching run; full, goalDirected and navigationDirected spaces reported separately; joint episode search preserves receipt effects and guards reset edges. Concrete kernel-decided satisfiable instance and wrong-answer rejection tests. | D/sim: `lean/Ehr/Sim/MinClicks.lean`, `Certificate.lean`, `History.lean`, `TaskMinimum.lean`, `MinClicksTests.lean`, `TaskMinimumTests.lean` |
| T10 | The page shows what must be shown | **proven**: every shown item has its id/label; only shown ids occur; no tiny class; every guard-counted info tree appears in its component; event disabled iff absent from enabled; shown commit enabled iff no popup, not already committed, and base guard | `lean/Ehr/Render/Proofs.lean`, `CommitProofs.lean` |
| T11 | Panels are complete | **proven** end to end for active FHIR allergies/medications, with no row limits; pending prefills show provenance and their confirm action | `lean/Ehr/Render/FhirProofs.lean`, `PanelProofs.lean`, `PrefillProofs.lean` |
| A2 | An alert appears only when its condition holds | **proven** for the interpreter: view firing/shown (`A2_view_firing`, `A2_view_shown`), new popups (`A2_popup_holds`) | `lean/Ehr/Proofs/Alerts.lean` |
| A3 | No repeat interruptions | by construction (`popupCandidates` drops acked pairs; `A2_popup_holds` also gives `(a, k) ∉ acked`); tested in `TinyTests` | — |
| A4 | A passive alert never pops up | **proven** for the interpreter (`A4_step`, `A4_run`, `A4_passive_never_popup`) | `lean/Ehr/Proofs/Alerts.lean` |

Render proofs live under `lean/Ehr/Render/` to respect lane ownership. Each main theorem has `#print axioms`; concrete Tiny/FHIR examples discharge the hypotheses. No unfinished render proofs remain.

Comparator-only placeholders: `lean/Statements.lean` and
`lean/Ehr/Check/ComparatorStatements.lean` deliberately use `sorry` as challenge
bodies. They are excluded from the implementation imports and are not
unfinished solution proofs. The check-lane config is `Ehr/Check/comparator.json`.

New feature safety: `CommitContracts` spells out temporal evidence, lexical/relational
validation, declared defaults, durable order expiry, and structured payload/action
labels. `accepted_contracts` is Comparator-checked separately from the original
twelve-property conjunction. Unsupported universal completion claims are rejected
conservatively by `additionalCompletionIssue`; these are not proofs of semantic
falsity. Capture-dependent per-line clinical conditions additionally need an
archived-line repair construction.

Parked seed proofs: the eight catalog regressions (17–24) retain mutation-specific
negative proof implementations, but their restructured modules are not claimed
finished. The old W1-only seed 13 had a cross-workflow CURES receipt escape; the
active seed now removes every CURES route and is rejected natively. Its kernel
proof still needs repair. Seed 16 still needs its intended stranded-refills
semantic completion obstruction. Do not label either intended proof finished.
Section 10 semantic renderer: **D1, D2, D3, D4, D6 and UiScreen T10/T11 are
proven** in `lean/Ehr/Render/UiProofs.lean`, with satisfiable examples (including
pending confirmations, actual FHIR records, interruptive/passive alerts, and a
malformed missing-review program) and `#print axioms` in `UiTests.lean`.
D2 adds complete read-only missing reviews without changing the interpreter.
D1 guarantees name/DOB/MRN fields; it cannot invent absent source identifiers.
T10 hidden-id absence applies to nonempty component ids; empty ids are reserved
for read-only sidebar and safety review info. The actual component forest has
an exact shown-item equivalence for every input, including malformed graphs.
All 18 new main semantic theorems are registered in the render Comparator audit.
D5 is intentionally **not** a universal renderer theorem: `NavSane spec prog`
is decidable and integrated with the checker. Persona navigation tests pass under
both rule profiles; the twelve-entry limit and all other D5 clauses are unchanged.
No unfinished render proof remains.

D5: `accepted_navigation` proves unique labels, twelve-group/item limits and
no orphan screen on the actual `Render.uiNav` tree. It is an additional
Comparator challenge, independent of unfinished general T1.

## Parked for iteration speed (2026-10-31)

`EhrHeavy.lean` is opt-in and excluded from `lake build`. Set `ruleProfile`
to `.full`, then run `lake build EhrHeavy` to attempt the parked suite.
The file lists every `Check/Seed*Proof`, `BadProofs`, `MacroBadProofs`,
`AdditionalBadProofs`, `LocalBadProofs` and `MissingBadProofs` module, plus
catalog-only legal/feature/workflow tests and the full-display corollaries.
General checker, interpreter, deploy and renderer theorems remain in `Ehr`.
Three Tiny rejection theorems stay in the default build with clean axiom audits.

Known unfinished/stale modules: `MacroBadProofs` and its `Seed*Proof` dependents
use fixed source indexes from the old expanded screens; `BadProofs` and
`AdditionalBadProofs` still have whole-program witnesses from before review
pinning; `MissingBadProofs` depends on those modules. Their full-profile build
is not claimed green. Seed 16's intended semantic completion proof remains
unfinished. Seed 13 now removes every CURES report/review/exemption route;
`Seed13Escape` retains the old W1-only mutation to document its receipt escape.
The old `bad13_preop_not_satisfies` witness is stale after review pinning and
must not be presented as a proof of the new seed's CURES defect.

Owner decision 2026-10-31 resolves the NP/pre-op domain obstruction:
physicians and surgeons sign directly; NPs need a human attending cosign.
`np_preop_without_cosign_never_signs` replaces `np_preop_obstruction`.
Only consent, H&P and medication-hold entries may use the attending attestation;
their original entry permissions stay unchanged. `entry_direct_or_attested`
bridges the guard and property. The macro/prefill attending safety theorems are
kernel checked with clean axiom audits. Persona walkthroughs and a deterministic
NP pre-op simulator walkthrough are compiled #guards, avoiding whole-program
kernel reduction. `Statements.lean` supplies state to the role predicate and
adds a no-attestation hypothesis to `T0_entry_values`; direct quantity, per-line
and distinct-user cosign safety statements remain unchanged.
General T1 completion remains the previously recorded unfinished construction.
Render visual-review follow-up: shell/side/nav presence is covered by T10;
semantic T11 distinguishes the requested full and compact record projections.
`D2_workspace_required` additionally proves full rows in workspace for every
applicable commit review, including when a compact sidebar is counted as shown.
All revised semantic proofs compile and are axiom-audited; no render proof hole.
The original full HTML/FHIR theorem statements remain unchanged.

## Newly merged accessibility-tree requirement

Main `f60a795` adds `aria : UiScreen → AriaNode` and proofs over that expected
accessibility tree to BRIEF.md. That projection and its theorem surface are
**not started**. The existing 35 render Comparator contracts cover the semantic
UiScreen and legacy HTML/FHIR boundaries; they do not claim this new extension.
The app still computes expected ARIA in TypeScript. A follow-up must define the
Lean projection, prove its design contracts, and have the app fidelity gate
consume it, including real nav click entries. No unfinished theorem declaration
or proof hole has been added to the completed render modules.

Dose-unit follow-up: `committed_dose_native` is kernel checked and ensures that
changing a drug or selector cannot bypass the dimensional guard. Small literal
unit and cross-slot checks are in `Check/DoseTests.lean`. `human_entry_exists`
is the scalar construction lemma; its explicit non-dose/non-selector premises
reflect the new relational constraint. General constructive T1 for relational
inputs remains part of the already unfinished completion construction. No safety
theorem is parked by this change, and Statements has no additional dose diff.

## T1 completion milestone: proved fragment and exact remaining obligation

`Ehr.Check.Scalar.completable` proves all-records, all-reachable-states completion
for the actual one-screen scalar clinical program, with one human-only entry,
a pinned allergy review (either review mode), and one alert with **any condition
and any tier**. Entry kinds include text, flag, code, every quantity unit,
identity, cosign and targeted scans. Medication scans retain `RecordAllowsScans`.
Medication-dose values are excluded: they need a selected formulary drug.
There are no per-line requirements, allowed-value lists, encounter cosign routes,
waiver-only reviews or additional temporal/relational contracts in this fragment.
This is a structural family, not all programs accepted by the core profile.

`satisfies_of_checked_scalar` derives all thirteen properties from checker
acceptance without a completion premise. `scalar_identity_satisfies` discharges
its premises on a nonempty clinical program; `scalar_identity_required` proves
its required commit list is nonempty for every physician and patient record.
`human_clear_popup`, `popupCandidates_ack` and `human_finish_ready` are reusable
construction lemmas. The last supports all alert conditions and tiers, removes
duplicated pending keys too, and terminates by pending-list length.

The proof-hole form of the exact remaining lemma is recorded **only below**.
The present checker makes this target false: `completion_acceptance_counterexample`
supplies acceptance and `¬ Completable` for one program. No source theorem
purports to prove unrestricted general T1. The opt-in library
`CompletionObligations` defines `Ehr.Check.Obligations.AcceptedCompletion` as
an unproved proposition; it supplies no proof and is absent from defaultTargets.
Run `lake build CompletionObligations` to inspect that development target.

```lean
-- In namespace Ehr.Check; imports Ehr.Check.Sound.
theorem accepted_completable (sp : Spec) (prev : Option Program) (can p : Program)
    (h : check sp prev can p = .ok) : Completable sp can p := by
  sorry
```

What is missing is extraction and composition of the checker's navigation/reveal
paths, compatible captures for multiple requirements and allowed-value lists,
per-line/archived-line repair, and encounter/waiver routes. The finite alert
construction is finished, but its ready-guard and lookup-consistency premises
still need to be supplied after that general repair construction. Neither
`Completable` nor any checker rule has been weakened.

Hypothesis witnesses: `Proofs/HypothesisExamples.lean` now directly instantiates
cosign, receipt, shown-review, A2 shown-alert, A4 step, both D3 forms, D6 labels,
and all three T4 theorems. Every premise is discharged on concrete Tiny clinical
programs/states; the render witnesses use actual present nodes, and the
certificate witness is an actual planned `currentCert` write. All are in the
default import tree. The original render-owned files are untouched.

## Fixed order-line completion extension

`reachable_drugSlots` proves a general invariant for every program whose drug
fields bind to declared fixed slots: all reachable drug captures stay within
those slots. The proof includes arbitrary macros, prefills, navigation,
new-order-line actions and elapsed time, without assuming checker acceptance.

`FixedLine.completable` uses that invariant to repair a per-order-line human
entry on both fixed slots 0 and 1, even after currentSlot advances. It retains
either review mode and every alert condition/tier. `satisfies_of_checked_fixed_lines`
assembles all thirteen properties from acceptance without a completion premise;
`fixed_lines_satisfies` discharges acceptance and `fixed_lines_pending_nonempty`
exhibits two real drug lines with unsatisfied per-line entries.

This is still a structural family: one screen, two fixed drug slots, one
unrestricted scalar requirement per line, pinned allergy review and one alert.
Dynamic current-slot composers and their archived-line invariants, arbitrary
multiple/allowed-value requirements, navigation/reveal and general review
collection remain open. The general `accepted_completable` target above is
unchanged. No attending route or entry attestation is used by the extension.

Completed completion-fragment statements have a separate opt-in Comparator challenge,
`Ehr/Check/completion-comparator.json`; its placeholder bodies are excluded
from the default import tree, like the two existing challenge modules.

## Kernel-proved obstruction to unrestricted T1

`DoseCompletionObstruction.accepted` proves that the scalar program with a
`medicationDose` assessment and no drug field passes `check`. Its required dose
has no selected drug from which to obtain a valid native unit.
`never_commits` proves that no reachable state can contain its required commit,
using the generic empty drug-slot bound and `committed_dose_native`.
`not_completable` discharges the role and scan-domain premises and proves
`¬ Completable` for that same accepted program.
`completion_acceptance_counterexample` packages both facts and is Comparator
checked. `CompletionObligations.refuted` proves that the exact isolated general
target is currently false. A dependency-aware completion rule is required;
neither the checker nor Completable was weakened or edited by this lane.

The exact theorem skeleton above is retained as a **checker-repair target**,
not as a plausible unfinished proof for the current rules. Positive completion
fragments continue independently; they exclude medication-dose inputs unless a
selected-drug/native-unit construction is supplied.

## Receipt-aware review completion extension

`FixedLine.completable` now also covers a receipt-aware presentation mode.
A shown-or-receipt review panel uses `unlessReceipt`; `pinnedForReview_sound`
proves the review stays met whether a valid receipt hides it or expiry reveals
it again. The construction handles every record, user and reachable clock.
`satisfies_of_checked_receipt_lines` assembles all thirteen properties directly
from acceptance. `receipt_lines_satisfies` discharges acceptance, and
`receipt_review_transition` exhibits an actual current RN receipt hiding the
review and its reappearance after 24 hours. The previous fixed-line theorem's
default presentation and statement remain compatible.

This supplies receipt-sensitive presentation, not an arbitrary multi-screen
receipt-collection route. General navigation/reveal, arbitrary entry/allowed-value
combinations and dynamic current-slot archival remain outside this family;
the dose dependency counterexample to unrestricted T1 remains unchanged.

## Arbitrary finite alert-family completion extension

`alert_lookup_unique` and `alertsAcked_of_no_candidates` prove that the native
unique-alert-ID condition supplies the lookup consistency needed for finite
popup discharge. `human_finish_ready_unique` handles every alert condition and
tier for any finite unique-ID rule list, through actual click/ack events.
`FixedLine.completable_many_alerts` composes this with the line repair and
receipt-aware review constructions. `satisfies_of_checked_many_alerts` obtains
unique IDs from checker acceptance and supplies all thirteen properties without
assuming completion. `many_alerts_satisfies` discharges acceptance, and
`many_alerts_two_acknowledgments` runs a two-line clinical instance through two
distinct required acknowledgments before a real commit.

The alert-family cardinality restriction is closed for this structural family.
General state/navigation and entry-dependency construction remain open, including
the accepted dose-only counterexample; the general target has not been weakened.
