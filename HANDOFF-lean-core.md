# Handoff: lane A (Lean core)

Branch `lane/lean-core`. All of items 1–4 are done and pushed, and they build.
Checks: `cd lean && lake build`, `lake check`, and `lake comparator` all
accept. There is no `sorry` outside the challenge file and no `native_decide`.
The only axioms are `propext`, `Quot.sound`, `Classical.choice`.

| Item | Status | Commit |
|---|---|---|
| 1. Release v1.1 `Kind.priorAuth` and `Action.requestPriorAuth` | done; T0/T3/A2/A4 re-checked; TS regenerated | f9ea1fa |
| 2. T2, receipts are sound | done | 1cf49fe |
| 3. T6, macros are their expansion | done | b158465 |
| 4. Draft Comparator statements | done; `lake comparator` accepts it | (this commit) |

## Item 2: T2 (`lean/Ehr/Proofs/T2.lean`)
- `T2_receipts_sound`: suppose a step adds commit `c`. Take any review requirement `rq` of `c` with `rq ∈ sp.reviews`, `rq.commit = c`, `whenHolds facts s rq.when = true`, and `infoShown sp prog facts s rq.info = false`. Then `ValidReceiptFor sp facts s rq ∨ HumanWaiverFor s rq`.
  - Both definitions are in `lean/Ehr/Props/Defs.lean`.
  - A valid receipt has the same info, the current data version, is not from the future, is at most `window` minutes old, and comes from an allowed role.
  - A waiver is the `waivedBy` element, captured `byHuman`, confirmed, and non-empty.
- `T2_shownOnCommit_shown`: a `shownOnCommit` requirement with no waiver must have its info shown.
- Approach: use `T0_commit_needs_guard`, then `commitGuard_iff` to get `reviewMet = true`, then `reviewMet_sound`. That lemma unfolds `reviewMet`, `receiptValid` and `waived`, and destructs `List.any`.

## Item 3: T6 (`lean/Ehr/Proofs/T6.lean`)
- The reference semantics are `macroAct` and `foldMacro` (in `Props/Defs.lean`):
  - `setValue` sends `step .macro (.enter cid (macroValue …))`;
  - `click` sends `step .macro (.click cid)`;
  - `goto` calls `goTo`, refused while a popup is open;
  - the fold stops at the first step that is not ok.
- `T6_macro_is_fold`: `runMacro` gives the same state as the fold. Its result is `ok` when the fold does not stop. When the fold stops at `(j, r)`, the result is `blocked (macroStopReason j r)`. `runMacro_ok_iff` is the iff form.
- `T6_macro_run_safe` reuses `T3_macro_step` on each step: commits, acks and receipts are unchanged, and nothing human-only is newly captured.
- Proof pitfalls:
  - `step .macro e = stepCore .macro e` needs `cases e <;> rfl`.
  - In the induction, `generalize macroAct … = p`, then case on the result. A plain `split` only splits one of the two matches.

## Item 4: Comparator (`lean/Statements.lean`, `lean/Solution.lean`, `lean/comparator.json`)
- 18 theorems (T0, T2, T3, T6, A2, A4 and their corollaries), extracted verbatim from the proof files, with `sorry` proofs.
- The statement definitions moved to `lean/Ehr/Props/Defs.lean`, because the challenge cannot import the proof modules (the names would clash).
- That file is in owner-owned `Ehr/Props/**` and is marked DRAFT. **The owner must review it.**
- When a statement changes, re-extract it. Keep the names identical, and keep `Statements` and `Solution` out of `defaultTargets`.

## Pitfalls for whoever continues
- **Kernel `decide`:** the examples evaluate the real interpreter with `decide`. `String.splitOn` and `toLower` do not reduce in the kernel, so `parseTenths` and `freqPerDay` work on `toList`. Keep new runtime string code kernel-reducible, or the examples will need `native_decide` (forbidden).
- **New branches in `clickCore`, `stepEvent` or `enterCore`:** every frame proof enumerates branches in order. Update `clickCore_macro_safe` (T3), `clickCore_guarded` (T0), `clickCore_popup` and `stepCore_macro_popup` (Alerts), adding a branch lemma like the `requestPriorAuth_*` ones.
- **`exact foo ..` against `CommitsGuarded`:** it over-applies, because `CommitsGuarded` unfolds to a `∀`. Use `apply foo`.
- **Imports:** runtime modules must import only `Init`. Only `Json.lean` and `Api.lean` use `Lean.Data.Json`.
- **Generated files:** regenerate the TS with `lake exe gents`, then check it with `cd lean/generated && npx -p typescript@5 tsc --noEmit --strict --target es2020 ehr-samples.ts`.

## Still open (not started)
T1 (checker), T4, T5 (FHIR → Facts, `facts(bundle)`), T7–T9, section 9 `render`/`Display` (T10/T11), the owner review of `Props/Defs.lean` and `Statements.lean`, and the alert-ID uniqueness check for the checker. See `TODO_PROOFS.md` and `docs/design/changes.md`.
