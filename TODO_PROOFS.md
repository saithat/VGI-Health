# Proof status

`sorry` is allowed during development only if listed here. Final files must have none.
Implementation files have **no `sorry`**, no `native_decide`, and no new axioms.
The finished implementation theorems use only `propext`, `Classical.choice`, `Quot.sound`
(`#print axioms` in `lean/Ehr/Proofs/Audit.lean`; `lake check` accepts the project).

| Theorem | Statement (plain words) | Status | Where |
|---|---|---|---|
| Composite expansion | Source properties are the properties of successful expansion; non-use components are retained exactly | Candidate proofs compile with permitted axiom audits in `Core/composites-pending.patch`; not integrated into checker-owned `Satisfies`, full `lake check`, or Comparator. Blocked on constructor/render compatibility and owning-lane integration; no `sorry` or new axioms. | lean-core / check |
| T0 | The interpreter never performs a commit unless its review and human-only requirements are met | **proven** for the interpreter (`T0_commit_needs_guard`, plain-logic form `commitGuard_iff`, units/human-only corollary `T0_entry_values`; stronger allowed-value equivalence `commitGuard_iff_values` and value corollaries `T0_entry_values_allowed`, `T0_entry_values_perLine`, with the constraint on the same confirmed capture) | `lean/Ehr/Proofs/T0.lean` |
| T1 | If the checker accepts a program, it satisfies properties 1–12 | **in progress**: full soundness proved for properties 1–5 and 7–12, plus all decidable structural clauses, commit entry/review/cosign/alert obligations, reachable-screen and CR-6 request invariants. The five expanded contract families are proved by `commitContracts`; actual human entry construction is proved by `human_enter`/`human_entry_exists`. Remaining: general completability (property 6), including navigation/reveal, archived-line invariants and finite alert discharge; assemble full theorem and Comparator statement. No unfinished theorem is asserted as proven. | `lean/Ehr/Check/{RuleSound,GuardSound,ScreenSound,PinSound,PartialSound,BudgetSound,SeveritySound,RequestSound,WritesSound,EnterOnceSound,HumanSound,HumanEventsSound,AlertSound}.lean` |
| T2 | A review prompt is skipped only with a valid receipt | **proven** for the interpreter: an applicable review requirement whose info was not shown was covered by a valid receipt (same version, inside the window, allowed role) or a human-entered waiver (`T2_receipts_sound`); `shownOnCommit` without a waiver means shown (`T2_shownOnCommit_shown`) | `lean/Ehr/Proofs/T2.lean` |
| T3 | Human-only steps are never automated | **proven** for the interpreter: macro steps and macro runs never commit, ack, create receipts, or capture human-only values (`T3_macro_step`, `T3_macro_run`); prefill never captures human-only values (`T3_prefill_never_human_only`); a cosign is by a human and a different user (`T3_cosign_distinct`). Checker-side "rejects such programs" is part of T1. | `lean/Ehr/Proofs/T3.lean`, `T0.lean` |
| T4 | `ehr deploy` publishes only programs with an ok verdict | **proven** (`T4_publish_only_if_ok`, `T4_rejected_not_published`, `T4_published_certificate`; axioms: propext, Classical.choice, Quot.sound) | `lean/Ehr/Proofs/CheckDeploy.lean` |
| T5 | Abstraction facts match the FHIR data | **proven**: today’s weight has exact source/date/unit/value evidence; versions cover all source resources and are permutation invariant (digest collision freedom remains a stated assumption) | `lean/Ehr/Render/FhirProofs.lean` |
| T6 | Macros behave like their expansion or stop at a guard | **proven** for the interpreter: a macro run gives the same state as folding the public `step` with `actor := macro` over its steps (`goto` as navigation), stopping at the first non-ok step; same ok/stop result (`T6_macro_is_fold`, `runMacro_ok_iff`); and, reusing T3 per step, no macro run commits, acks, creates receipts, or captures human-only values (`T6_macro_run_safe`) | `lean/Ehr/Proofs/T6.lean` |
| T7 | Counterexamples are genuine | **partial**: replay and a failed static rule are proven; every returned navigation/reveal event succeeds (cut paths included), with at most one final triggering click. The BRIEF's stronger assertion that every rejection demonstrates semantic falsity is **false for the present conservative rules** (`T7_semantic_rejection_false` gives a safe rejected program). A verdict/property contract decision is required; no safety rule or property was weakened. Conservative rules can reject without establishing `¬ Satisfies`; do not present these replay theorems as full T7. | `lean/Ehr/Check/ReplaySound.lean`, `RuleSound.lean` |
| T8 | Releases preserve old obligations; only the catalog may grow | **proven** for executions of the installed release: `OldObligations` projects older entry/review requirements and preserves human actions, units and alerts. General `T8_checked_old_obligations` starts directly from `check = ok`, without assuming T1. Semantic `T8_old_obligations`, plus `T8_v1_to_v1_1` and `T8_v1_1_to_v2`, use the actual `Spec.Extends` witnesses. `T8_unqualified_false` remains the counterexample to full old-catalog transport. | `lean/Ehr/Props/OldObligations.lean`, `lean/Ehr/Check/Monotonicity.lean` |
| T7 | Counterexamples are genuine | not started | A |
| T8 | Releases only tighten | Concrete additive witnesses proved by `decide`, with no axioms: `specV1_1_extends_specV1` and `specV2_extends_specV1_1`. General checker/deploy theorem remains with check lane. | `lean/Ehr/Specs/{Extends,V1_1,V2}.lean` |
| T9 | Minimum clicks is exact | **proven** for certified search over the reported goal-relevant space (`T9_jointMinimum`, `T9_taskSearch`, `T9_minimum`, `T9_minimum_real`): real interpreter replay at the claimed cost, and no cheaper allowed goal-reaching run; full, goalDirected and navigationDirected spaces reported separately; joint episode search preserves receipt effects and guards reset edges. Concrete kernel-decided satisfiable instance and wrong-answer rejection tests. | D/sim: `lean/Ehr/Sim/MinClicks.lean`, `Certificate.lean`, `History.lean`, `TaskMinimum.lean`, `MinClicksTests.lean`, `TaskMinimumTests.lean` |
| T8 | Releases only tighten | Concrete additive witnesses proved by `decide`, using only permitted `propext`: `specV1_1_extends_specV1` and `specV2_extends_specV1_1`. General checker/deploy theorem remains with check lane. | `lean/Ehr/Specs/{Extends,V1_1,V2}.lean` |
| T9 | Minimum clicks is exact | not started | A |
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

Owner decision 2026-10-31 resolves the NP/pre-op domain obstruction: only
physicians and surgeons may perform `signOrders` in pre-op encounters.
`np_preop_never_signs` replaces `np_preop_obstruction` with a general guard
safety theorem. Consent, H&P and medication-hold requirements and their entry
permissions are unchanged. Completion and depth obligations now exclude only
role-forbidden encounter contexts; `entry_relevant_when_allowed` proves that an
active entry remains required in every allowed context. Named persona walkthroughs
are compiled #guards, avoiding whole-program kernel reduction in the default.
`Statements.lean` changes only the role predicate in `commitGuard_iff` to
`commitRoleOk sp facts user c`; the strengthened equivalence is kernel checked.
General T1 completion remains the previously recorded unfinished construction.
Core certification is still blocked for NP pre-op episodes by the preserved
consent role rule (`np_preop_obstruction`, retained and kernel checked in the
default build). No safety rule, property domain or role permission was changed.
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
