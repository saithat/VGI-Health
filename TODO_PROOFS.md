# Proof status

`sorry` is allowed during development only if listed here. Final files must have none.
Current files have **no `sorry`**, no `native_decide`, and no new axioms. Every
listed theorem uses only `propext`, `Classical.choice`, `Quot.sound`
(`#print axioms` in `lean/Ehr/Proofs/Audit.lean`; `lake check` accepts the project).

| Theorem | Statement (plain words) | Status | Where |
|---|---|---|---|
| T0 | The interpreter never performs a commit unless its review and human-only requirements are met | **proven** for the interpreter (`T0_commit_needs_guard`, plain-logic form `commitGuard_iff`, units/human-only corollary `T0_entry_values`) | `lean/Ehr/Proofs/T0.lean` |
| T1 | If the checker accepts a program, it satisfies properties 1–12 | **in progress**: full soundness proved for properties 1, 2, 3, 4, 7, 8, 9, 12, plus all decidable structural clauses, commit entry/review/cosign/alert obligations, reachable-screen and CR-6 request invariants. Remaining: human commit/ack event provenance, general completability, popup truth and interruption invariants; assemble full theorem and Comparator statement. No unfinished theorem is asserted as proven. | `lean/Ehr/Check/{RuleSound,GuardSound,ScreenSound,PinSound,PartialSound,BudgetSound,SeveritySound,RequestSound,WritesSound,EnterOnceSound,HumanSound}.lean` |
| T2 | A review prompt is skipped only with a valid receipt | **proven** for the interpreter: an applicable review requirement whose info was not shown was covered by a valid receipt (same version, inside the window, allowed role) or a human-entered waiver (`T2_receipts_sound`); `shownOnCommit` without a waiver means shown (`T2_shownOnCommit_shown`) | `lean/Ehr/Proofs/T2.lean` |
| T3 | Human-only steps are never automated | **proven** for the interpreter: macro steps and macro runs never commit, ack, create receipts, or capture human-only values (`T3_macro_step`, `T3_macro_run`); prefill never captures human-only values (`T3_prefill_never_human_only`); a cosign is by a human and a different user (`T3_cosign_distinct`). Checker-side "rejects such programs" is part of T1. | `lean/Ehr/Proofs/T3.lean`, `T0.lean` |
| T4 | `ehr deploy` publishes only programs with an ok verdict | **proven** (`T4_publish_only_if_ok`, `T4_rejected_not_published`, `T4_published_certificate`; axioms: propext, Classical.choice, Quot.sound) | `lean/Ehr/Proofs/CheckDeploy.lean` |
| T5 | Abstraction facts match the FHIR data | not started (no FHIR → Facts function yet) | A |
| T6 | Macros behave like their expansion or stop at a guard | **proven** for the interpreter: a macro run gives the same state as folding the public `step` with `actor := macro` over its steps (`goto` as navigation), stopping at the first non-ok step; same ok/stop result (`T6_macro_is_fold`, `runMacro_ok_iff`); and, reusing T3 per step, no macro run commits, acks, creates receipts, or captures human-only values (`T6_macro_run_safe`) | `lean/Ehr/Proofs/T6.lean` |
| T7 | Counterexamples are genuine | **proven**: every returned navigation/reveal event succeeds in the public interpreter (cut paths included); at most one final triggering click may be blocked. Rejection also witnesses a failed rule. This proves replay and static-rule failure, not that every rejected program violates `Satisfies` (the checker is conservative). | `lean/Ehr/Check/ReplaySound.lean`, `RuleSound.lean` |
| T8 | Releases only tighten | Concrete additive release witnesses are proved without axioms. General full-Satisfies transport requires a revised compatible-program statement: `soundness_transport_obstruction` proves it conflicts with checker soundness when the catalog expands. Old entry and catalog membership preservation are proven. | `lean/Ehr/Specs/{Extends,V1_1,V2}.lean`, `lean/Ehr/Check/ReleaseChecks.lean` |
| T9 | Minimum clicks is exact | not started | A |
| T10 | The page shows what must be shown | not started (no `render` yet) | A |
| T11 | Panels are complete | not started (no `Display`/`render` yet) | A |
| A2 | An alert appears only when its condition holds | **proven** for the interpreter: view firing/shown (`A2_view_firing`, `A2_view_shown`), new popups (`A2_popup_holds`) | `lean/Ehr/Proofs/Alerts.lean` |
| A3 | No repeat interruptions | by construction (`popupCandidates` drops acked pairs; `A2_popup_holds` also gives `(a, k) ∉ acked`); tested in `TinyTests` | — |
| A4 | A passive alert never pops up | **proven** for the interpreter (`A4_step`, `A4_run`, `A4_passive_never_popup`) | `lean/Ehr/Proofs/Alerts.lean` |
