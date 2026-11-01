# Verification for reviewers

The proofs cover the Lean interpreter that decides screen contents and handles events. The browser runs this code through WebAssembly. They do not prove that the hospital's rules are complete or that care is clinically correct.

**Unrestricted completion from acceptance remains open.** The former dose-only counterexample is now rejected by `completion_dependency_rejected`: its medication-dose requirement has no reachable drug input to supply a valid native unit. The kernel rejection and non-completability proofs are in `Check/DoseCompletionObstruction.lean`. A general dependency-aware completion construction is still required for unrestricted T1. Acceptance now proves all thirteen properties for the scalar clinical fragment (`satisfies_of_checked_scalar`): one flat screen, one unrestricted scalar entry (all kinds except medication dose), a pinned allergy review in either mode, and one alert with any condition and tier. The general assembly theorem still assumes property 6. This fragment is not the entire core profile; see the exact remaining lemma in `TODO_PROOFS.md` and its unproved proposition in the opt-in `CompletionObligations` library.

The extension `satisfies_of_checked_fixed_lines` also covers a two-fixed-slot
order composer with a real per-order-line human requirement. Its generic
`reachable_drugSlots` invariant includes macros, prefills and new-line actions;
`FixedLine.completable` repairs both slots from every reachable state, including
states after current-slot advancement. `fixed_lines_pending_nonempty` proves
two drug lines can really be pending with their entries unmet. This is not the
unrestricted dynamic order-line checker theorem.

`satisfies_of_checked_receipt_lines` extends the same order composer with
receipt-sensitive review visibility. Valid receipts may hide the panel; absent,
stale or expired receipts leave it shown. The all-records/all-reachable-states
completion proof covers both cases, with a concrete expiry witness.

`satisfies_of_checked_many_alerts` supports any finite unique-ID alert family
in this same fixed-line/receipt-aware fragment. Unique IDs come from acceptance.
The generic `human_finish_ready_unique` discharges all firing interruptive keys
through real click/ack steps; a two-interruption, two-line witness commits only
after both distinct acknowledgments.

`satisfies_of_checked_automated_lines` adds arbitrary drug prefills and finite
macro steps to that same family. The proof covers every reachable outcome,
including stopped macro runs; acceptance retains the existing human-action and
source rules. A concrete witness starts with two unconfirmed presets, runs the
actual macro button, enters both human assessments, handles two interruptions
and commits. The four fragment extensions compose in one accepted program.

## 1. What is proved: the short review

**U** means a theorem for every input covered by its stated conditions, without checker acceptance. **C** means a universal implication from checker acceptance; `ehr check` runs the check separately for each program. A compiled check on one program is not a new universal proof. All source paths below start at the repository root. The generated audit gives a file and line for every theorem.

The 18 theorems in [`lean/comparator.json`](../lean/comparator.json):

| Theorem (`Ehr.Proofs.`) | Plain meaning | Kind; file:line |
|---|---|---|
| `T0_commit_needs_guard` | Every newly added commit passed its guard in the preceding state. | U; `lean/Ehr/Proofs/T0.lean:151` |
| `commitGuard_iff` | The guard passes exactly when the encounter permits this role, entries and reviews are met, interruptive alerts are acknowledged, and the extra checks pass. | U; `lean/Ehr/Proofs/T0.lean:162` |
| `T0_entry_values` | A commit has a confirmed value for each applicable whole-episode entry, entered by a human when required and in the declared unit. | U; `lean/Ehr/Proofs/T0.lean:363` |
| `T3_cosign_distinct` | An applicable whole-episode cosign names a human-entered second user, different from the signed-in user. | U; `lean/Ehr/Proofs/T0.lean:391` |
| `T2_receipts_sound` | An applicable review hidden at commit has a matching, timely, role-allowed receipt or a human-entered waiver. | U; `lean/Ehr/Proofs/T2.lean:52` |
| `T2_shownOnCommit_shown` | A review that forbids receipts and has no waiver is shown when its commit happens. | U; `lean/Ehr/Proofs/T2.lean:66` |
| `T3_macro_step` | An event sent as a macro cannot add commits, acknowledgments, receipts or human-only captures. | U; `lean/Ehr/Proofs/T3.lean:159` |
| `T3_macro_run` | Clicking a macro without an open popup preserves those same four protections. | U; `lean/Ehr/Proofs/T3.lean:171` |
| `T3_prefill_never_human_only` | Entering a screen cannot prefill a new human-only capture. | U; `lean/Ehr/Proofs/T3.lean:184` |
| `T6_macro_is_fold` | A macro has the reference expansion's final state and reports the first stopped step. | U; `lean/Ehr/Proofs/T6.lean:42` |
| `runMacro_ok_iff` | A macro reports success exactly when its reference expansion does not stop. | U; `lean/Ehr/Proofs/T6.lean:73` |
| `T6_macro_run_safe` | A clicked macro preserves the four human-action protections, using the expansion proof. | U; `lean/Ehr/Proofs/T6.lean:126` |
| `A2_view_firing` | An item marked as firing is an alert whose condition holds. | U; `lean/Ehr/Proofs/Alerts.lean:27` |
| `A2_view_shown` | A shown alert component has a true alert condition. | U; `lean/Ehr/Proofs/Alerts.lean:40` |
| `A2_popup_holds` | A newly opened popup has a firing rule and key that was not already acknowledged. | U; `lean/Ehr/Proofs/Alerts.lean:281` |
| `A4_step` | One event preserves the condition that an open popup belongs to a non-passive rule. | U; `lean/Ehr/Proofs/Alerts.lean:304` |
| `A4_run` | Every event run from the initial state has only non-passive popups. | U; `lean/Ehr/Proofs/Alerts.lean:319` |
| `A4_passive_never_popup` | A passive rule looked up by its ID never becomes a popup in such a run. | U; `lean/Ehr/Proofs/Alerts.lean:337` |

[`Satisfies`](../lean/Ehr/Props/Properties.lean#L430) means **all** the following. These are definitions; the acceptance theorems prove the listed implications. The semantic clauses range over every patient record and user with the program's role.

| Property | One-sentence meaning | Definition; proof |
|---|---|---|
| 1. `WellFormed` | Components come from the catalog, IDs and references are valid, landmarks stay shown, and required fields are within the navigation bound. | `Properties.lean:88`; C, `accepted_wellFormed` |
| 2. `CapturesAllOnce` | Commits capture required values, ordinary non-entry events retain confirmed values, and auto-linked fields use their declared link. | `Properties.lean:126`; C, `accepted_capturesAllOnce` |
| 3. `WritesOnly` | Declared and reachable captures, commits and new receipts stay within the spec and role permissions. | `Properties.lean:157`; C, `accepted_writesOnly` |
| 4. `ReviewsBeforeCommit` | Commits meet their reviews, and a shown commit button already has its unwaived reviews met. | `Properties.lean:181`; C, `accepted_reviewsBeforeCommit` |
| 5. `HumanOnlyKept` | Human-only entry, signing, acknowledgment and distinct-user cosigning cannot be automated, and the program does not attempt it. | `Properties.lean:236`; C, `accepted_humanOnlyKept` |
| 6. `Completable` | From every reachable state, each required, role-allowed unfinished commit has a human event path to completion, provided the record supplies any needed medication scan. | `Properties.lean:261`; fragment: `Scalar.completable` / `satisfies_of_checked_scalar`; general acceptance proof open |
| 7. `UnitsRight` | Whole-episode quantity requirements use the declared unit, and record quantity prefills use `weightToday`. | `Properties.lean:290`; C, `accepted_units` |
| 8. `WithinBudgets` | Reachable-screen popup requests do not exceed the canonical count, and moved component tags stay within the stability budget. | `Properties.lean:314`; C, `accepted_budgets` |
| 9. A1 `AlertsFire` | Interruptive keys are acknowledged before commit, firing passive alerts are shown on targeted screens, and macros do not target alerts. | `Properties.lean:344`; C, `accepted_alertsFire` |
| 10. A2 `NoFalseAlarms` | Reachable popups and shown alerts have true conditions, and programs cannot request interruptive popups directly. | `Properties.lean:370`; C, `accepted_noFalseAlarms` |
| 11. A3 `NoRepeatInterruptions` | Acknowledgments persist, open popups persist until acknowledged, acknowledged keys do not return, and interruptive requests are not spread across screens. | `Properties.lean:395`; C, `accepted_noRepeatInterruptions` |
| 12. A4 `SeverityTiers` | Passive rules cannot pop up and the program cannot request that they do. | `Properties.lean:414`; C, `accepted_severityTiers` |
| 13. D5 `NavigationSane` | The workflow overview has unique group and within-group labels, at most twelve groups and entries per group, and represents every program screen. | `lean/Ehr/Props/Navigation.lean:9`; C, `accepted_navigation` |

`Properties.lean` above is [`lean/Ehr/Props/Properties.lean`](../lean/Ehr/Props/Properties.lean). “Once” does not prohibit deliberate re-entry; the budget counts requests on reachable screens, not actual interruptions on every path; unit safety is not a proof of clinical dose correctness.

The renderer theorems describe the **semantic screen tree**, before browser drawing:

| Rule | One-sentence meaning | Kind; file:line (`lean/Ehr/Render/`) |
|---|---|---|
| D1 `D1_landmark` | The shell banner includes the supplied name, formatted birth date and medical-record number. | U; `UiProofs.lean:78` |
| D2 `D2_workspace_required` / `D2_required_info` / `D2_commit_review` | Every applicable review for a shown commit button has its full rows in the workspace, including a read-only supplement when needed. | U; `UiProofs.lean:301`, `:330`, `:433` |
| D3 `D3_honest_actions` / `D3_all_buttons` | Buttons have labels and disabled reasons, and primary buttons correspond to shown commits with interpreter enablement, including modal buttons. | U; `UiProofs.lean:386`, `:512` |
| D4 `D4_interruptive_modal` | An open interruptive rule renders a labeled modal with an enabled acknowledgment. | U; `UiProofs.lean:395` |
| D4 `D4_passive_no_modal` / `D4_passive_inline` | A passive popup state makes no modal, while a shown passive alert renders inline. | U; `UiProofs.lean:405`, `:488` |
| D5 | This is the per-program overview check above, not a theorem for every renderer input. | C; `lean/Ehr/Check/NavigationSound.lean:7` |
| D6 `D6_clear_fields` / `D6_field_labels` | Shown fields copy provenance, human-only and pending-confirmation markers, offer pending confirmation, and have nonempty labels. | U; `UiProofs.lean:413`, `:522` |

T4 and checker soundness:

- **`T4_publish_only_if_ok`:** a planned write of the current program or certificate requires checker acceptance (`lean/Ehr/Proofs/CheckDeploy.lean:26`, U).
- **`T4_rejected_not_published`:** a rejected candidate has no planned publishing write (`:41`, U).
- **`T4_published_certificate`:** a planned current certificate describes this spec and program with verdict `ok` (`:51`, U).
- **`satisfies_of_checked_completable`:** acceptance **plus a separate proof of completion** implies all thirteen properties (`Check/Sound.lean`, C with extra premise).
- **`satisfies_of_checked_scalar`:** acceptance implies all thirteen for the explicitly defined scalar clinical family, with completion proved by `Scalar.completable` (`Check/Sound.lean`, C).

**T4 does not prove crash-safe atomic publication.** The CLI writes files one at a time ([`lean/Ehr/Cli/Check.lean:82`](../lean/Ehr/Cli/Check.lean#L82)); no theorem makes the program/certificate pair an atomic filesystem or Medplum transaction.


## 2. What the statements depend on

Run `scripts/audit-verification.sh`. It uses the appendix's `#spec_surface` and `#audit_axioms` approach in [`lean/Audit/SpecSurface.lean`](../lean/Audit/SpecSurface.lean). `VerificationAudit` is an opt-in library, absent from `defaultTargets`. To keep memory bounded, the script compiles only its import graph through `lake env`, serially, with `LEAN_NUM_THREADS=4`. It does not build `EhrHeavy`, run Comparator, or run `lake check`.

The generated appendix lists every audited theorem's source, surface size, full project dependency list and axioms. It also lists `Satisfies` and `Completable` as definitions. The surface follows the statement and definition bodies, **not the proof**. It includes named project types; it traverses library code but displays only definitions from `Ehr` modules. Shared lists avoid repeating names. A small count is not evidence that the statement is useful.

Read these definitions first:

| Definition | Plain meaning; source |
|---|---|
| `Spec`, `Program`, `Facts`, `State`, `User` | The hospital rules, screen program, patient facts, current interaction state and signed-in user; `lean/Ehr/Core/Types.lean`. |
| `step`, `init`, `runAll` | Handle an event, start an episode, and handle a list of events; `lean/Ehr/Core/Interp.lean`. |
| `commitGuard`, `commitRoleOk` | Check everything required before committing, including encounter-specific signing permission; `lean/Ehr/Core/Guard.lean`. |
| `entryMet`, `reviewMet` | Check required captures and reviews; `lean/Ehr/Core/Guard.lean:108`, `:135`. |
| `extraGuard` | Check time evidence, value constraints, defaults, expiry and required display/action contracts; `lean/Ehr/Core/Basics.lean:808`. |
| `infoShown`, `compShown` | Decide whether the interpreter counts information/components as shown, including screen, group, tab and size conditions; `lean/Ehr/Core/Guard.lean:38`, `lean/Ehr/Core/Basics.lean`. |
| `ValidReceiptFor`, `HumanWaiverFor` | A review receipt matches version, time and role, or a human supplied a confirmed nonempty waiver; `lean/Ehr/Props/Defs.lean:21`, `:27`. |
| `macroAct`, `foldMacro` | Expand macro actions through the same event interface and stop at the first failure; `lean/Ehr/Props/Defs.lean:44`, `:54`. |
| `Reachable`, `EveryStep`, `Always` | States obtainable from the start, including time passing, and conditions over all those events/states; `lean/Ehr/Props/Basics.lean:61`, `:77`, `:72`. |
| `requiredCommitsFor` | Commits on the canonical or candidate buttons, restricted by role and encounter; `lean/Ehr/Props/Basics.lean:103`. |
| `check`, `rules` | Run structural checks and return acceptance or a finding; `lean/Ehr/Check/Check.lean`. |
| `renderUi`, `UiPresent`, `UiWorkspacePresent` | Construct the semantic screen and observe nodes across the screen or in its workspace only; `lean/Ehr/Render/Ui.lean:312`, `UiContracts.lean:33`, `:38`. |
| `NavSane`, `uiOverviewNav` | Check the workflow-wide overview, which differs from the interactive `uiNav`; `lean/Ehr/Render/NavRules.lean:12`, `Ui.lean:36`. |
| `deployPlan`, `certificate` | Plan version/current writes and bind the recorded verdict to hashes of the spec and program; `lean/Ehr/Check/Deploy.lean:90`, `:79`. |

## 3. Axioms

The fresh audit found **only `propext`, `Classical.choice`, `Quot.sound` in all 84 audited theorems**. These support reasoning about equal propositions, choices and quotients. Each theorem's exact output is in the generated appendix. There is no `sorryAx`, native-computation axiom, or extra assumption declared as an axiom in these proofs. Logical premises such as completion remain premises even when this axiom audit is clean.

The challenge files intentionally contain `sorry` placeholders; [`Solution.lean`](../lean/Solution.lean) imports the proved implementations instead. This audit does not import the challenge files. Each verification milestone passed the default `lake build`, whole-project `lake check`, and root `lake comparator`. The final milestone also passed the checker’s separate `Ehr/Check/comparator.json` challenge (21 statements), in addition to the 18 root Comparator statements. The fixed-line extension also passed its separate `Ehr/Check/completion-comparator.json` challenge. These checks are distinct from the generated statement/axiom audit. `CompletionObligations` is an opt-in proposition with no supplied proof; its presence does not close general T1.

## 4. Can the hypotheses actually hold?

“Complete” below means a concrete example supplies all input conditions, or there are no proof conditions. “Partial” means useful examples exist but a single complete instance of that theorem is missing. The formerly partial/missing cases now have named complete applications in [`lean/Ehr/Proofs/HypothesisExamples.lean`](../lean/Ehr/Proofs/HypothesisExamples.lean), under `Ehr.Proofs.HypothesisExamples`. Each named application supplies every premise; presence and actual popup-opening witnesses prevent vacuous renderer/alert examples.

| Main theorem(s) | Evidence; limit |
|---|---|
| `T0_commit_needs_guard` | Complete: `Ehr.Proofs.tiny_sign_commit_occurs` proves a real new commit; `tiny_sign_guard_holds` applies T0 to it (`Proofs/T0.lean`). |
| `commitGuard_iff` | No proof conditions; `tiny_sign_guard_holds`, `tiny_hidden_review_blocks`, and `tiny_pounds_blocks` supply true and false guards (`Proofs/T0.lean`). |
| `T0_entry_values` | Complete conditions for the stronger allowed-value forms: `scheduleII_zero_refills_whole_episode` and `scheduleII_zero_refills_per_line` (`Proofs/T0.lean`). |
| `T3_cosign_distinct` | Complete: `cosign_distinct_instance` applies T3 to a real high-alert commit with requirement membership, applicability, per-line flag, declaration lookup and cosign kind all discharged. |
| `T2_receipts_sound` | Complete: `receipt_sound_instance` applies T2 to a real hidden-review commit with a current receipt, including review membership and commit equality. |
| `T2_shownOnCommit_shown` | Complete: `shown_review_instance` supplies a committing state and the actual shown-only dose review, with all premises discharged. |
| `T3_macro_step`, `T3_prefill_never_human_only` | No proof conditions; executable Tiny states/programs in `lean/Ehr/Examples/TinyTests.lean`. |
| `T3_macro_run`, `T6_macro_run_safe` | Complete shared conditions: `tiny_macro_run_premises`; observable navigation/capture effects: `tiny_macro_changes_screen_and_captures` (`Proofs/Audit.lean`). |
| `T6_macro_is_fold`, `runMacro_ok_iff` | No proof conditions; `tiny_macro_stops_at_identity` and `tiny_safe_macro_prefix_succeeds` give concrete stopping and successful expansions (`Proofs/T6.lean`). |
| `A2_view_firing` | Complete firing-item existence: `tiny_care_gap_firing_and_shown` (`Proofs/Alerts.lean`). |
| `A2_view_shown` | Complete: `shown_alert_instance` supplies the exact shown care-gap alert item, its view membership and alert kind. |
| `A2_popup_holds` | Complete new-popup conditions: `tiny_allergy_click_opens_popup` (`Proofs/Alerts.lean`). |
| `A4_step` | Complete: `popup_step_instance` proves the initial `PopupNotPassive` premise and applies A4 to a real step; `popup_step_opens` proves an interruptive popup actually opens. |
| `A4_run` | No proof conditions; `tiny_passive_never_popup` uses the concrete Tiny program for every event list (`Proofs/Alerts.lean`). |
| `A4_passive_never_popup` | Complete lookup/tier conditions and application: `tiny_passive_rule_lookup` and `tiny_passive_never_popup` (`Proofs/Alerts.lean`). |
| All twelve `accepted_*` theorems | Complete on a nonempty clinical program: `scalar_identity_satisfies` discharges acceptance by `decide` and proves all thirteen properties; `scalar_identity_required` proves the required commit list is nonempty for every physician and record. |
| `satisfies_of_checked_completable` | Complete: `scalar_identity_satisfies` supplies acceptance and the all-records/all-reachable-states proof `Scalar.completable`, with a human-only identity entry, shown allergy review, and interruptive allergy alert. |
| D1 | No proof conditions; `RenderExamples.patient_banner_present` supplies the concrete name/DOB banner example. |
| D2 workspace / required-info / commit-review | Complete: `RenderExamples.shell_review_in_workspace`, `missing_review_is_supplemented`, and `sign_allergy_review_present`. |
| D3 honest-actions / all-buttons | Complete: `sign_button_honest_instance` and `all_buttons_instance` apply both theorems to one concrete primary Sign button; `sign_button_present` supplies presence. |
| D4 modal / no-modal / inline | Complete: `RenderExamples.interruptive_allergy_modal`, `passive_rule_has_no_modal`, and `passive_care_gap_inline`. |
| D6 clear-fields | Complete: `RenderExamples.weight_field_present`, `weight_confirmation_pending`, and `weight_confirmation_action_present`. |
| D6 field-labels | Complete: `weight_label_instance` directly applies D6 to a present, pending clinical weight field, using `weight_field_present`. |
| T4 publish / reject / certificate | Complete: `publish_ok_instance`, `rejected_not_published_instance`, and `published_certificate_instance` apply T4 to concrete planned writes. `current_certificate_planned` proves membership and `currentCert` is discharged. |

The named property examples in [`lean/Ehr/Props/Examples.lean`](../lean/Ehr/Props/Examples.lean) describe individual clauses. `good_sign_has_one_continuation` proves one successful signing continuation; `Scalar.completable` supplies the separate all-records/all-reachable-states completion theorem. Named renderer counterparts are in [`lean/Ehr/Proofs/RenderExamples.lean`](../lean/Ehr/Proofs/RenderExamples.lean), under `Ehr.Proofs.RenderExamples`; the owning lane’s `Render/**` files remain untouched. For property 13, [`lean/Ehr/Check/Tests.lean:37`](../lean/Ehr/Check/Tests.lean#L37) directly applies `accepted_navigation` to the good Tiny program.


## 5. Does the spec reject bad behaviour?

**Fresh kernel proofs:** `tiny_bad_catalog`, `tiny_bad_role`, `tiny_bad_automation` prove `¬ Satisfies` for properties 1, 3 and 5 ([`lean/Ehr/Check/TinyRejections.lean:8`](../lean/Ehr/Check/TinyRejections.lean#L8), `:16`, `:21`). The audit imports and audits these. Named negative examples also reject hidden/stale reviews (`tiny_hidden_review_blocks`, `tiny_stale_receipt_blocks`), pounds (`tiny_pounds_blocks`), automated identity capture (`macro_identity_capture_is_unsafe`), and passive popups (`tiny_passive_popup_state_rejected`, `passive_popup_request_rejected`).

**Compiled checks, not `¬ Satisfies` proofs:** the 17 core seeds have mutation-specific failing-rule and replay checks at [`lean/Ehr/Check/SeedTests.lean:31`](../lean/Ehr/Check/SeedTests.lean#L31). `#guard` executes a check; it is not `native_decide` and adds no theorem or axiom. The saved [`certification-report.json`](../lean/Ehr/Check/certification-report.json) records 17/17 rejected and 15/15 accepted persona baselines. It labels its source revision `ce226d8…` **dirty**; this is prior run evidence, not a fresh run of this audit.

| Seed: bad behaviour | Failing rule (property) | Mutation in `lean/Ehr/Canonical/BadPrograms.lean` |
|---|---|---|
| 01: hide allergies | `reviewsBeforeCommit` (4) | `:14` |
| 02: prefill identity re-entry | `humanOnlyKept` (5) | `:18` |
| 03: write invented pounds field | `writesOnly` (3), not a clinical dose theorem | `:22` |
| 04: macro overrides human steps | `humanOnlyKept` (5) | `:28` |
| 05: automate cosign | `humanOnlyKept` (5) | `:35` |
| 06: prefill yesterday's weight | `units` (7) | `:44` |
| 07: strand refill decision | `completable` (6) | `:49` |
| 08: forge consent by macro | `humanOnlyKept` (5) | `:54` |
| 09: macro targets allergy alert | `humanOnlyKept` (5); this reported rule is not labeled A1 | `:62` |
| 10: invent alert reference | `wellFormed` (1) | `:71` |
| 11: repeat interruptive request | `noRepeatInterruptions` (11/A3) | `:76` |
| 12: request passive popup | `severityTiers` (12/A4) | `:82` |
| 13: remove every CURES route | `completable` (6) | `:86` |
| 14: macro enters naloxone offer | `humanOnlyKept` (5) | `:94` |
| 15: hide controlled-order details | `reviewsBeforeCommit` (4) | `:103` |
| 16: strand a nonzero Schedule II refill default | `completable` (6) | `:110` |
| 33: NP pre-op macro-sign bypass | `humanOnlyKept` (5); encounter guard also refuses signing | `:198` |

**Parked kernel proof source is not a current passing proof suite.** [`lean/EhrHeavy.lean:1`](../lean/EhrHeavy.lean#L1) imports whole-program bad/seed proofs only on request; it requires the full profile and has known stale modules. Sources for seeds 01/07 are `Check/BadProofs.lean:82`, `:61`; 08/09 are `MacroBadProofs.lean:66`, `:121`; 15 is `AdditionalBadProofs.lean:55`; 02–06, 10–12 and 14 each have `Check/SeedNNProof.lean` and a `badNN_not_satisfies` theorem. These were **not built by this audit**. The old seed-13 proof at `AdditionalBadProofs.lean:29` concerns a shared pre-op defect, not the current CURES mutation. Seed 16's intended semantic completion proof is missing.

Full-only seeds 17–24 remove restraint plans, operative technique, vaccine address, administration time, product strength, signing notice, telehealth consent, or automate refill eligibility (`BadPrograms.lean:126`–`:148`). Their intended failing rules are completion (17–21, 23), reviews (22), and human-only (24); `Check/FullSeedTests.lean:46` and `Check/Seed17Proof.lean` through `Seed24Proof.lean` contain parked checks/proof source.

Full-only seeds 25–32 try to reset restraint time, use stale H&P, fill expired prescriptions, approve underage consent, enter an invalid date, change a required default, hide grouped results, or mislabel signing (`BadPrograms.lean:154`–`:193`). They exercise the **additional commit contracts**, not eight extra clauses of `Satisfies`: time/expiry, validation, defaults, structured displays and action labels (`lean/Ehr/Props/Contracts.lean:11`). Compiled positive/negative walks are in `lean/Ehr/Canonical/FeatureTests.lean:20`, `:33`, `:44`, `:52`, `:70`, `:79`, `:86`, `:91`; parked with `EhrHeavy`, not rerun here. Their general proof is separate, `lean/Ehr/Check/ContractSound.lean:22` (`accepted_contracts`), outside this document's main-theorem audit.

A rejection finding is not always a proof of semantic failure: conservative checks can reject a safe design. [`lean/Ehr/Check/RejectionObstruction.lean:57`](../lean/Ehr/Check/RejectionObstruction.lean#L57) records that obstruction; replayable navigation alone is not a proof of `¬ Satisfies`.

## 6. What is not proved; what must be trusted

- **Rules and clinical meaning:** the owner must review the spec, input assumptions and source facts; visibility does not mean a clinician read or understood information.
- **Temporary core profile:** [`lean/Ehr/Specs/Profile.lean:14`](../lean/Ehr/Specs/Profile.lean#L14) selects `.core`. Most regulation-catalog additions and feature strengthening are switched off. `denyRefill` is a retained catalog exception. Generic theorems still quantify over arbitrary specs; current release certification only covers the selected content. The full catalog is not certified by a core run.
- **Lean kernel and build tools:** proof checking trusts Lean's kernel; running native or WASM code also trusts the Lean compiler/runtime, Emscripten and bindings. Native/WASM agreement is tested, not a compiler-correctness proof.
- **React painter, CSS and browser:** theorems concern Lean trees. Browser visibility and ARIA fidelity are tests. The requested Lean `aria : UiScreen → AriaNode` projection and its proofs are still missing; do not claim a proved screen-reader tree (`TODO_PROOFS.md`, “Newly merged accessibility-tree requirement”).
- **Medplum/FHIR writes:** TypeScript mapping, network, database transactions, authentication and record refresh are outside these proofs. `WritesOnly` constrains interpreter declarations/state, not every resource actually written by the adapter. T4 concerns a pure write plan, not crash recovery, atomic I/O or cryptographic authenticity of FNV hashes.
- **Simulator:** it models clinicians; its choices and time estimates are not evidence about all real clinicians. A minimum over a reported search space is not a global best interface.
- **LLM agent:** untrusted by design; proposals must pass the checker and deployment gates. Theorems do not prove that the agent is honest, useful or clinically correct. A recorded mock run is not certification.

## 7. Recent owner decisions that changed statements

Owner hospital policy, **2026-10-31**, implemented by commit [`5aad7a9`](https://github.com/saithat/VGI-Health/commit/5aad7a968d67511c03c84b28df0c87c73b43166d): pre-op orders may be signed only by a physician or surgeon. The actual change to `lean/Statements.lean:41` was:

```diff
-      roleOk sp user c = true ∧
+      commitRoleOk sp facts user c = true ∧
```

The role must pass both ordinary permission and the encounter-specific role restriction. Pre-op orders require a physician or surgeon; NPs cannot sign them and must route the work to the surgeon. `commitRoleOk` checks encounter roles without an attending-cosign route. `np_preop_never_signs` proves refusal for every program, event and state; named P4/P5 walks are in `Check/EncounterRoleTests.lean`.

Two other scope decisions matter: the temporary core profile removes most catalog content (above), and D2 now requires full review rows in the workspace even when a compact sidebar is present (`Render/UiProofs.lean:298`). D5's current overview check must not be described as a proof about interactive navigation. Signing roles, dose units and navigation are active lanes: regenerate the appendix after merging them, then re-review these plain-language claims.

## 8. Gaps against CLAUDE.md §§4 and 7

- [x] **T1 fragment and nonempty witness:** `Scalar.completable`, `satisfies_of_checked_scalar`, `scalar_identity_satisfies`, `scalar_identity_required`. The fragment covers scalar kinds except medication doses, both review modes, every alert condition and tier. `human_finish_ready` proves finite alert discharge for the real interpreter.
- [x] **Fixed per-order-line T1 fragment:** `FixedLine.completable`, `satisfies_of_checked_fixed_lines`, `fixed_lines_satisfies`, and `fixed_lines_pending_nonempty`. Both fixed slots can be repaired after new-line advancement.
- [x] **Receipt-aware T1 fragment:** `satisfies_of_checked_receipt_lines` uses a proved valid-receipt/visible-review alternative for every reachable state. `receipt_review_transition` exhibits hiding by a real current receipt and reappearance after expiry.
- [x] **Finite interruptive-family T1 fragment:** `human_finish_ready_unique`, `FixedLine.completable_many_alerts`, and `satisfies_of_checked_many_alerts`; acceptance supplies the unique-ID premise, and a concrete two-interruption path is kernel checked.
- [x] **Prefill/macro T1 fragment:** `satisfies_of_checked_automated_lines`, `automated_lines_satisfies`, and `prefill_macro_human_completion`. Arbitrary finite macro outcomes and drug prefills are covered by the general slot invariant; the concrete full path is kernel checked.
- [ ] **General T1 (open):** `completion_dependency_rejected` proves the former medication-dose counterexample is rejected. This closes the missing-drug bug while preserving the unchanged general target. Remaining positive constructions include arbitrary accepted navigation/reveal, multiple compatible entry requirements, per-line/archived-line repair, encounter restrictions and review waivers. The precise `accepted_completable` lemma is recorded in `TODO_PROOFS.md`, and `CompletionObligations.AcceptedCompletion` records its proposition in a non-default library without assuming or proving it. No property or checker rule was weakened.
- [x] **Complete the hypothesis examples:** all formerly partial/missing section 4 cases have named concrete applications with every premise discharged in `Proofs/HypothesisExamples.lean`; T1 has the nonempty all-records/all-reachable-states witness in `Check/Sound.lean`.
- [x] **Name cited examples:** 47 previously anonymous property/interpreter/deploy/soundness examples now have descriptive theorem names and docstrings. Sixteen named renderer counterparts live in `Proofs/RenderExamples.lean` to preserve lane ownership. Each states its individual clause; the one-path signing witness does not claim universal completion.
- [ ] **Restore current bad-output proofs:** repair parked witnesses, prove the current CURES mutation and intended Schedule II completion failure, and add full-profile negative proofs for feature seeds (`EhrHeavy.lean:1`, `Check/AdditionalBadProofs.lean:29`, `Canonical/BadPrograms.lean:110`, `:154`).
- [ ] **Align D5 with the clickable tree:** `Props/Navigation.lean:6` and `Check/NavigationSound.lean:6` say actual navigation, but `Render/NavRules.lean:12` checks `uiOverviewNav`; its own docstring records the open integration.
- [ ] **Add the Lean ARIA projection and design proofs:** current semantic rules end at `renderUi` (`Render/Ui.lean:312`), not the browser accessibility tree; see the last section of `TODO_PROOFS.md`.
- [x] **Correct role/unit/property comments and checker helper docstrings:** `Statements.lean` now describes encounter-role restrictions and `extraGuard`; its declaration tokens are unchanged. Property comments now state whole-episode and declared-unit scope, capture retention and linked-prefill declarations precisely. Twenty-five public checker helper docstrings were added.
- [ ] **Renderer-owned helper docstrings:** the original `Render/UiContracts.uiAtomsList` and several `Render/UiTests` fixtures still lack declaration docstrings. `Render/**` was left untouched for the active checker lane; named renderer counterparts in `Proofs/RenderExamples.lean` are documented. Existing owner-review notices in `Props/Defs.lean` and `Statements.lean` remain explicit.
- [x] **Opaque contracts:** no project `opaque` or `axiom` declarations were found in `lean/Ehr/**`; there is no bodyless project contract to list. External I/O/toolchains remain trusted, not secretly proved by this result.
- [x] **Audit the main proof axioms:** the generated results contain only the three allowed axioms. This does not validate parked proofs or replace a final Comparator / `lake check` run after lane merges.
- [ ] **Review surface size:** the generated counts are large for event/check/deploy statements because they include the real interpreter, rule code and JSON definitions; these need human review, not a claim that a clean proof makes the definitions right.

No proofs or owner-owned specifications were changed for this review.

## Generated evidence

The following block is replaced by the script. The commit and content hash identify the audited source snapshot. Regeneration updates listings and locations, not the human review above. Run after other Lean builds have stopped; do not run another Lean process in this checkout alongside it.

<!-- BEGIN GENERATED AUDIT -->

Generated with Git HEAD `5e2b1316ececed18ca68202a0bd622662b523c7a`. Audited source SHA-256: `38c629792f06ac86143808fd6791fa41df36e2360b7a8407474cac8fa227e07a`. The source hash includes uncommitted source changes; HEAD identifies the checkout base.

84 theorems audited; 86 statement surfaces; 60 distinct lists; 931 distinct definitions/types overall; 0–502 per statement. 89 project modules compiled or reused, one Lean process at a time. The two extra surfaces are property definitions, not proved theorems.

Counts include named project definitions and types. Compiler helpers, instances, constructors and projections are omitted from the display after traversal. Library definitions are traversed but not listed. Proof bodies are followed only for the axiom column. `P` = propext; `C` = Classical.choice; `Q` = Quot.sound; `none` = no axioms. Each S-list below gives its complete list as shared B-groups; each definition is printed once. No names are removed by this grouping.

| Declaration | Source | Surface / count | Axioms |
|---|---|---|---|
| `Ehr.Proofs.T0_commit_needs_guard` | [lean/Ehr/Proofs/T0.lean:151](../lean/Ehr/Proofs/T0.lean#L151) | S1 / 270 | C, Q, P |
| `Ehr.Proofs.commitGuard_iff` | [lean/Ehr/Proofs/T0.lean:162](../lean/Ehr/Proofs/T0.lean#L162) | S2 / 209 | C, Q, P |
| `Ehr.Proofs.T0_entry_values` | [lean/Ehr/Proofs/T0.lean:348](../lean/Ehr/Proofs/T0.lean#L348) | S3 / 269 | C, Q, P |
| `Ehr.Proofs.T3_cosign_distinct` | [lean/Ehr/Proofs/T0.lean:375](../lean/Ehr/Proofs/T0.lean#L375) | S3 / 269 | C, Q, P |
| `Ehr.Proofs.T2_receipts_sound` | [lean/Ehr/Proofs/T2.lean:54](../lean/Ehr/Proofs/T2.lean#L54) | S4 / 271 | C, Q, P |
| `Ehr.Proofs.T2_shownOnCommit_shown` | [lean/Ehr/Proofs/T2.lean:68](../lean/Ehr/Proofs/T2.lean#L68) | S3 / 269 | C, Q, P |
| `Ehr.Proofs.T3_macro_step` | [lean/Ehr/Proofs/T3.lean:147](../lean/Ehr/Proofs/T3.lean#L147) | S5 / 270 | C, Q, P |
| `Ehr.Proofs.T3_macro_run` | [lean/Ehr/Proofs/T3.lean:159](../lean/Ehr/Proofs/T3.lean#L159) | S5 / 270 | C, Q, P |
| `Ehr.Proofs.T3_prefill_never_human_only` | [lean/Ehr/Proofs/T3.lean:172](../lean/Ehr/Proofs/T3.lean#L172) | S6 / 71 | C, Q, P |
| `Ehr.Proofs.T6_macro_is_fold` | [lean/Ehr/Proofs/T6.lean:42](../lean/Ehr/Proofs/T6.lean#L42) | S7 / 271 | C, Q, P |
| `Ehr.Proofs.runMacro_ok_iff` | [lean/Ehr/Proofs/T6.lean:73](../lean/Ehr/Proofs/T6.lean#L73) | S7 / 271 | C, Q, P |
| `Ehr.Proofs.T6_macro_run_safe` | [lean/Ehr/Proofs/T6.lean:126](../lean/Ehr/Proofs/T6.lean#L126) | S5 / 270 | C, Q, P |
| `Ehr.Proofs.A2_view_firing` | [lean/Ehr/Proofs/Alerts.lean:27](../lean/Ehr/Proofs/Alerts.lean#L27) | S8 / 242 | C, Q, P |
| `Ehr.Proofs.A2_view_shown` | [lean/Ehr/Proofs/Alerts.lean:40](../lean/Ehr/Proofs/Alerts.lean#L40) | S8 / 242 | C, Q, P |
| `Ehr.Proofs.A2_popup_holds` | [lean/Ehr/Proofs/Alerts.lean:281](../lean/Ehr/Proofs/Alerts.lean#L281) | S3 / 269 | C, Q, P |
| `Ehr.Proofs.A4_step` | [lean/Ehr/Proofs/Alerts.lean:304](../lean/Ehr/Proofs/Alerts.lean#L304) | S9 / 270 | C, Q, P |
| `Ehr.Proofs.A4_run` | [lean/Ehr/Proofs/Alerts.lean:319](../lean/Ehr/Proofs/Alerts.lean#L319) | S10 / 273 | C, Q, P |
| `Ehr.Proofs.A4_passive_never_popup` | [lean/Ehr/Proofs/Alerts.lean:337](../lean/Ehr/Proofs/Alerts.lean#L337) | S11 / 272 | C, Q, P |
| `Ehr.Check.accepted_wellFormed` | [lean/Ehr/Check/PartialSound.lean:39](../lean/Ehr/Check/PartialSound.lean#L39) | S12 / 420 | C, Q, P |
| `Ehr.Check.accepted_capturesAllOnce` | [lean/Ehr/Check/EnterOnceSound.lean:120](../lean/Ehr/Check/EnterOnceSound.lean#L120) | S13 / 407 | C, Q, P |
| `Ehr.Check.accepted_writesOnly` | [lean/Ehr/Check/WritesSound.lean:271](../lean/Ehr/Check/WritesSound.lean#L271) | S14 / 400 | C, Q, P |
| `Ehr.Check.accepted_reviewsBeforeCommit` | [lean/Ehr/Check/PartialSound.lean:49](../lean/Ehr/Check/PartialSound.lean#L49) | S15 / 425 | C, Q, P |
| `Ehr.Check.accepted_humanOnlyKept` | [lean/Ehr/Check/HumanEventsSound.lean:167](../lean/Ehr/Check/HumanEventsSound.lean#L167) | S16 / 406 | C, Q, P |
| `Ehr.Check.accepted_units` | [lean/Ehr/Check/PartialSound.lean:58](../lean/Ehr/Check/PartialSound.lean#L58) | S17 / 403 | C, Q, P |
| `Ehr.Check.accepted_budgets` | [lean/Ehr/Check/BudgetSound.lean:48](../lean/Ehr/Check/BudgetSound.lean#L48) | S18 / 399 | C, Q, P |
| `Ehr.Check.accepted_alertsFire` | [lean/Ehr/Check/PartialSound.lean:64](../lean/Ehr/Check/PartialSound.lean#L64) | S19 / 420 | C, Q, P |
| `Ehr.Check.accepted_noFalseAlarms` | [lean/Ehr/Check/AlertSound.lean:169](../lean/Ehr/Check/AlertSound.lean#L169) | S20 / 416 | C, Q, P |
| `Ehr.Check.accepted_noRepeatInterruptions` | [lean/Ehr/Check/AlertSound.lean:175](../lean/Ehr/Check/AlertSound.lean#L175) | S21 / 403 | C, Q, P |
| `Ehr.Check.accepted_severityTiers` | [lean/Ehr/Check/SeveritySound.lean:29](../lean/Ehr/Check/SeveritySound.lean#L29) | S22 / 400 | C, Q, P |
| `Ehr.Check.accepted_navigation` | [lean/Ehr/Check/NavigationSound.lean:7](../lean/Ehr/Check/NavigationSound.lean#L7) | S23 / 395 | C, Q, P |
| `Ehr.Check.satisfies_of_checked_completable` | [lean/Ehr/Check/Sound.lean:19](../lean/Ehr/Check/Sound.lean#L19) | S24 / 467 | C, Q, P |
| `Ehr.Render.D1_landmark` | [lean/Ehr/Render/UiProofs.lean:202](../lean/Ehr/Render/UiProofs.lean#L202) | S25 / 430 | C, Q, P |
| `Ehr.Render.D2_workspace_required` | [lean/Ehr/Render/UiProofs.lean:446](../lean/Ehr/Render/UiProofs.lean#L446) | S26 / 432 | C, Q, P |
| `Ehr.Render.D2_required_info` | [lean/Ehr/Render/UiProofs.lean:475](../lean/Ehr/Render/UiProofs.lean#L475) | S27 / 434 | C, Q, P |
| `Ehr.Render.D2_commit_review` | [lean/Ehr/Render/UiProofs.lean:580](../lean/Ehr/Render/UiProofs.lean#L580) | S27 / 434 | C, Q, P |
| `Ehr.Render.D3_honest_actions` | [lean/Ehr/Render/UiProofs.lean:533](../lean/Ehr/Render/UiProofs.lean#L533) | S28 / 435 | C, Q, P |
| `Ehr.Render.D3_all_buttons` | [lean/Ehr/Render/UiProofs.lean:659](../lean/Ehr/Render/UiProofs.lean#L659) | S28 / 435 | C, Q, P |
| `Ehr.Render.D4_interruptive_modal` | [lean/Ehr/Render/UiProofs.lean:542](../lean/Ehr/Render/UiProofs.lean#L542) | S25 / 430 | C, Q, P |
| `Ehr.Render.D4_passive_no_modal` | [lean/Ehr/Render/UiProofs.lean:552](../lean/Ehr/Render/UiProofs.lean#L552) | S25 / 430 | C, Q, P |
| `Ehr.Render.D4_passive_inline` | [lean/Ehr/Render/UiProofs.lean:635](../lean/Ehr/Render/UiProofs.lean#L635) | S27 / 434 | C, Q, P |
| `Ehr.Render.D6_clear_fields` | [lean/Ehr/Render/UiProofs.lean:560](../lean/Ehr/Render/UiProofs.lean#L560) | S27 / 434 | C, Q, P |
| `Ehr.Render.D6_field_labels` | [lean/Ehr/Render/UiProofs.lean:669](../lean/Ehr/Render/UiProofs.lean#L669) | S27 / 434 | C, Q, P |
| `Ehr.Proofs.T4_publish_only_if_ok` | [lean/Ehr/Proofs/CheckDeploy.lean:26](../lean/Ehr/Proofs/CheckDeploy.lean#L26) | S29 / 407 | C, Q, P |
| `Ehr.Proofs.T4_rejected_not_published` | [lean/Ehr/Proofs/CheckDeploy.lean:41](../lean/Ehr/Proofs/CheckDeploy.lean#L41) | S29 / 407 | C, Q, P |
| `Ehr.Proofs.T4_published_certificate` | [lean/Ehr/Proofs/CheckDeploy.lean:51](../lean/Ehr/Proofs/CheckDeploy.lean#L51) | S30 / 406 | C, Q, P |
| `Ehr.Check.tiny_bad_catalog` | [lean/Ehr/Check/TinyRejections.lean:8](../lean/Ehr/Check/TinyRejections.lean#L8) | S31 / 402 | C, Q, P |
| `Ehr.Check.tiny_bad_role` | [lean/Ehr/Check/TinyRejections.lean:16](../lean/Ehr/Check/TinyRejections.lean#L16) | S31 / 402 | C, Q, P |
| `Ehr.Check.tiny_bad_automation` | [lean/Ehr/Check/TinyRejections.lean:21](../lean/Ehr/Check/TinyRejections.lean#L21) | S31 / 402 | C, Q, P |
| `Ehr.Props.Completable` | [lean/Ehr/Props/Properties.lean:261](../lean/Ehr/Props/Properties.lean#L261) | S32 / 2 | definition |
| `Ehr.Props.Satisfies` | [lean/Ehr/Props/Properties.lean:430](../lean/Ehr/Props/Properties.lean#L430) | S32 / 2 | definition |
| `Ehr.Check.human_finish_ready` | [lean/Ehr/Check/Completion.lean:52](../lean/Ehr/Check/Completion.lean#L52) | S33 / 270 | C, Q, P |
| `Ehr.Check.Scalar.completable` | [lean/Ehr/Check/ScalarCompletion.lean:71](../lean/Ehr/Check/ScalarCompletion.lean#L71) | S34 / 295 | C, Q, P |
| `Ehr.Check.satisfies_of_checked_scalar` | [lean/Ehr/Check/Sound.lean:37](../lean/Ehr/Check/Sound.lean#L37) | S35 / 477 | C, Q, P |
| `Ehr.Check.scalar_identity_satisfies` | [lean/Ehr/Check/Sound.lean:47](../lean/Ehr/Check/Sound.lean#L47) | S36 / 399 | C, Q, P |
| `Ehr.Proofs.HypothesisExamples.cosign_distinct_instance` | [lean/Ehr/Proofs/HypothesisExamples.lean:25](../lean/Ehr/Proofs/HypothesisExamples.lean#L25) | S37 / 289 | C, Q, P |
| `Ehr.Proofs.HypothesisExamples.receipt_sound_instance` | [lean/Ehr/Proofs/HypothesisExamples.lean:38](../lean/Ehr/Proofs/HypothesisExamples.lean#L38) | S38 / 291 | C, Q, P |
| `Ehr.Proofs.HypothesisExamples.shown_review_instance` | [lean/Ehr/Proofs/HypothesisExamples.lean:51](../lean/Ehr/Proofs/HypothesisExamples.lean#L51) | S39 / 289 | C, Q, P |
| `Ehr.Proofs.HypothesisExamples.shown_alert_instance` | [lean/Ehr/Proofs/HypothesisExamples.lean:61](../lean/Ehr/Proofs/HypothesisExamples.lean#L61) | S40 / 287 | C, Q, P |
| `Ehr.Proofs.HypothesisExamples.popup_step_instance` | [lean/Ehr/Proofs/HypothesisExamples.lean:66](../lean/Ehr/Proofs/HypothesisExamples.lean#L66) | S41 / 289 | C, Q, P |
| `Ehr.Proofs.HypothesisExamples.sign_button_honest_instance` | [lean/Ehr/Proofs/HypothesisExamples.lean:88](../lean/Ehr/Proofs/HypothesisExamples.lean#L88) | S42 / 502 | C, Q, P |
| `Ehr.Proofs.HypothesisExamples.all_buttons_instance` | [lean/Ehr/Proofs/HypothesisExamples.lean:92](../lean/Ehr/Proofs/HypothesisExamples.lean#L92) | S42 / 502 | C, Q, P |
| `Ehr.Proofs.HypothesisExamples.weight_label_instance` | [lean/Ehr/Proofs/HypothesisExamples.lean:103](../lean/Ehr/Proofs/HypothesisExamples.lean#L103) | S43 / 0 | C, Q, P |
| `Ehr.Proofs.HypothesisExamples.publish_ok_instance` | [lean/Ehr/Proofs/HypothesisExamples.lean:118](../lean/Ehr/Proofs/HypothesisExamples.lean#L118) | S44 / 408 | C, Q, P |
| `Ehr.Proofs.HypothesisExamples.published_certificate_instance` | [lean/Ehr/Proofs/HypothesisExamples.lean:124](../lean/Ehr/Proofs/HypothesisExamples.lean#L124) | S45 / 83 | C, Q, P |
| `Ehr.Proofs.HypothesisExamples.rejected_not_published_instance` | [lean/Ehr/Proofs/HypothesisExamples.lean:134](../lean/Ehr/Proofs/HypothesisExamples.lean#L134) | S46 / 30 | C, Q, P |
| `Ehr.Check.reachable_drugSlots` | [lean/Ehr/Check/CaptureSlots.lean:233](../lean/Ehr/Check/CaptureSlots.lean#L233) | S47 / 16 | C, Q, P |
| `Ehr.Check.FixedLine.completable` | [lean/Ehr/Check/FixedLineCompletion.lean:195](../lean/Ehr/Check/FixedLineCompletion.lean#L195) | S48 / 305 | C, Q, P |
| `Ehr.Check.satisfies_of_checked_fixed_lines` | [lean/Ehr/Check/Sound.lean:63](../lean/Ehr/Check/Sound.lean#L63) | S49 / 487 | C, Q, P |
| `Ehr.Check.fixed_lines_satisfies` | [lean/Ehr/Check/Sound.lean:71](../lean/Ehr/Check/Sound.lean#L71) | S50 / 409 | C, Q, P |
| `Ehr.Check.fixed_lines_pending_nonempty` | [lean/Ehr/Check/Sound.lean:78](../lean/Ehr/Check/Sound.lean#L78) | S51 / 296 | C, Q, P |
| `Ehr.Check.DoseCompletionObstruction.rejected` | [lean/Ehr/Check/DoseCompletionObstruction.lean:17](../lean/Ehr/Check/DoseCompletionObstruction.lean#L17) | S52 / 407 | C, Q, P |
| `Ehr.Check.DoseCompletionObstruction.never_commits` | [lean/Ehr/Check/DoseCompletionObstruction.lean:56](../lean/Ehr/Check/DoseCompletionObstruction.lean#L56) | S53 / 57 | C, Q, P |
| `Ehr.Check.DoseCompletionObstruction.not_completable` | [lean/Ehr/Check/DoseCompletionObstruction.lean:75](../lean/Ehr/Check/DoseCompletionObstruction.lean#L75) | S54 / 297 | C, Q, P |
| `Ehr.Check.completion_dependency_rejected` | [lean/Ehr/Check/Sound.lean:217](../lean/Ehr/Check/Sound.lean#L217) | S52 / 407 | C, Q, P |
| `Ehr.Check.satisfies_of_checked_receipt_lines` | [lean/Ehr/Check/Sound.lean:91](../lean/Ehr/Check/Sound.lean#L91) | S49 / 487 | C, Q, P |
| `Ehr.Check.receipt_lines_satisfies` | [lean/Ehr/Check/Sound.lean:100](../lean/Ehr/Check/Sound.lean#L100) | S50 / 409 | C, Q, P |
| `Ehr.Check.receipt_review_transition` | [lean/Ehr/Check/Sound.lean:108](../lean/Ehr/Check/Sound.lean#L108) | S55 / 171 | C, Q, P |
| `Ehr.Check.alertsAcked_of_no_candidates` | [lean/Ehr/Check/AlertCompletion.lean:28](../lean/Ehr/Check/AlertCompletion.lean#L28) | S56 / 67 | C, Q, P |
| `Ehr.Check.human_finish_ready_unique` | [lean/Ehr/Check/AlertCompletion.lean:54](../lean/Ehr/Check/AlertCompletion.lean#L54) | S33 / 270 | C, Q, P |
| `Ehr.Check.FixedLine.completable_many_alerts` | [lean/Ehr/Check/FixedLineCompletion.lean:93](../lean/Ehr/Check/FixedLineCompletion.lean#L93) | S48 / 305 | C, Q, P |
| `Ehr.Check.satisfies_of_checked_many_alerts` | [lean/Ehr/Check/Sound.lean:121](../lean/Ehr/Check/Sound.lean#L121) | S49 / 487 | C, Q, P |
| `Ehr.Check.many_alerts_satisfies` | [lean/Ehr/Check/Sound.lean:140](../lean/Ehr/Check/Sound.lean#L140) | S57 / 410 | C, Q, P |
| `Ehr.Check.many_alerts_two_acknowledgments` | [lean/Ehr/Check/Sound.lean:149](../lean/Ehr/Check/Sound.lean#L149) | S58 / 297 | C, Q, P |
| `Ehr.Check.satisfies_of_checked_automated_lines` | [lean/Ehr/Check/Sound.lean:166](../lean/Ehr/Check/Sound.lean#L166) | S49 / 487 | C, Q, P |
| `Ehr.Check.automated_lines_satisfies` | [lean/Ehr/Check/Sound.lean:186](../lean/Ehr/Check/Sound.lean#L186) | S59 / 411 | C, Q, P |
| `Ehr.Check.prefill_macro_human_completion` | [lean/Ehr/Check/Sound.lean:198](../lean/Ehr/Check/Sound.lean#L198) | S60 / 299 | C, Q, P |

**S1 (270):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B43](#audit-b43), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B99](#audit-b99), [B100](#audit-b100), [B101](#audit-b101), [B102](#audit-b102), [B103](#audit-b103), [B106](#audit-b106)

**S2 (209):** [B1](#audit-b1), [B3](#audit-b3), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B28](#audit-b28), [B29](#audit-b29), [B43](#audit-b43), [B47](#audit-b47), [B51](#audit-b51), [B90](#audit-b90), [B91](#audit-b91), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B99](#audit-b99), [B100](#audit-b100), [B101](#audit-b101)

**S3 (269):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B43](#audit-b43), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B106](#audit-b106)

**S4 (271):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B43](#audit-b43), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B73](#audit-b73), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B106](#audit-b106)

**S5 (270):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B43](#audit-b43), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B93](#audit-b93), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B106](#audit-b106)

**S6 (71):** [B1](#audit-b1), [B7](#audit-b7), [B22](#audit-b22), [B24](#audit-b24), [B25](#audit-b25), [B28](#audit-b28), [B29](#audit-b29), [B43](#audit-b43), [B47](#audit-b47), [B50](#audit-b50), [B51](#audit-b51), [B91](#audit-b91), [B93](#audit-b93), [B94](#audit-b94), [B95](#audit-b95), [B97](#audit-b97), [B102](#audit-b102), [B103](#audit-b103), [B106](#audit-b106)

**S7 (271):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B43](#audit-b43), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B81](#audit-b81), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B106](#audit-b106)

**S8 (242):** [B1](#audit-b1), [B3](#audit-b3), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B28](#audit-b28), [B29](#audit-b29), [B43](#audit-b43), [B45](#audit-b45), [B46](#audit-b46), [B47](#audit-b47), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B93](#audit-b93), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B99](#audit-b99), [B106](#audit-b106)

**S9 (270):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B43](#audit-b43), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B77](#audit-b77), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B106](#audit-b106)

**S10 (273):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B43](#audit-b43), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B77](#audit-b77), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B104](#audit-b104), [B106](#audit-b106), [B107](#audit-b107)

**S11 (272):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B43](#audit-b43), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B104](#audit-b104), [B106](#audit-b106), [B107](#audit-b107)

**S12 (420):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B4](#audit-b4), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B12](#audit-b12), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B43](#audit-b43), [B45](#audit-b45), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52), [B60](#audit-b60), [B62](#audit-b62), [B68](#audit-b68), [B70](#audit-b70), [B72](#audit-b72), [B74](#audit-b74), [B80](#audit-b80), [B89](#audit-b89), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B93](#audit-b93), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B98](#audit-b98), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B104](#audit-b104), [B105](#audit-b105), [B106](#audit-b106)

**S13 (407):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B4](#audit-b4), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B12](#audit-b12), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B43](#audit-b43), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52), [B59](#audit-b59), [B61](#audit-b61), [B64](#audit-b64), [B68](#audit-b68), [B69](#audit-b69), [B80](#audit-b80), [B89](#audit-b89), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B98](#audit-b98), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B104](#audit-b104), [B105](#audit-b105), [B106](#audit-b106)

**S14 (400):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B4](#audit-b4), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B12](#audit-b12), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B43](#audit-b43), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52), [B60](#audit-b60), [B68](#audit-b68), [B79](#audit-b79), [B80](#audit-b80), [B89](#audit-b89), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B98](#audit-b98), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B104](#audit-b104), [B105](#audit-b105), [B106](#audit-b106)

**S15 (425):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B4](#audit-b4), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B12](#audit-b12), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B43](#audit-b43), [B45](#audit-b45), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52), [B60](#audit-b60), [B61](#audit-b61), [B63](#audit-b63), [B64](#audit-b64), [B68](#audit-b68), [B69](#audit-b69), [B70](#audit-b70), [B74](#audit-b74), [B80](#audit-b80), [B89](#audit-b89), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B93](#audit-b93), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B98](#audit-b98), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B104](#audit-b104), [B105](#audit-b105), [B106](#audit-b106)

**S16 (406):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B4](#audit-b4), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B12](#audit-b12), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B43](#audit-b43), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52), [B61](#audit-b61), [B64](#audit-b64), [B67](#audit-b67), [B68](#audit-b68), [B69](#audit-b69), [B80](#audit-b80), [B89](#audit-b89), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B98](#audit-b98), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B104](#audit-b104), [B105](#audit-b105), [B106](#audit-b106)

**S17 (403):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B4](#audit-b4), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B12](#audit-b12), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B43](#audit-b43), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52), [B61](#audit-b61), [B64](#audit-b64), [B65](#audit-b65), [B68](#audit-b68), [B69](#audit-b69), [B80](#audit-b80), [B89](#audit-b89), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B98](#audit-b98), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B104](#audit-b104), [B105](#audit-b105), [B106](#audit-b106)

**S18 (399):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B4](#audit-b4), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B12](#audit-b12), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B43](#audit-b43), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52), [B55](#audit-b55), [B72](#audit-b72), [B80](#audit-b80), [B89](#audit-b89), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B98](#audit-b98), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B104](#audit-b104), [B105](#audit-b105), [B106](#audit-b106)

**S19 (420):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B4](#audit-b4), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B12](#audit-b12), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B43](#audit-b43), [B45](#audit-b45), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52), [B56](#audit-b56), [B57](#audit-b57), [B60](#audit-b60), [B64](#audit-b64), [B68](#audit-b68), [B69](#audit-b69), [B70](#audit-b70), [B80](#audit-b80), [B89](#audit-b89), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B93](#audit-b93), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B98](#audit-b98), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B104](#audit-b104), [B105](#audit-b105), [B106](#audit-b106)

**S20 (416):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B4](#audit-b4), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B12](#audit-b12), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B43](#audit-b43), [B45](#audit-b45), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52), [B56](#audit-b56), [B58](#audit-b58), [B60](#audit-b60), [B68](#audit-b68), [B70](#audit-b70), [B80](#audit-b80), [B89](#audit-b89), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B93](#audit-b93), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B98](#audit-b98), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B104](#audit-b104), [B105](#audit-b105), [B106](#audit-b106)

**S21 (403):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B4](#audit-b4), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B12](#audit-b12), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B43](#audit-b43), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52), [B60](#audit-b60), [B68](#audit-b68), [B69](#audit-b69), [B75](#audit-b75), [B80](#audit-b80), [B89](#audit-b89), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B98](#audit-b98), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B104](#audit-b104), [B105](#audit-b105), [B106](#audit-b106)

**S22 (400):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B4](#audit-b4), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B12](#audit-b12), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B43](#audit-b43), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52), [B60](#audit-b60), [B68](#audit-b68), [B76](#audit-b76), [B80](#audit-b80), [B89](#audit-b89), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B98](#audit-b98), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B104](#audit-b104), [B105](#audit-b105), [B106](#audit-b106)

**S23 (395):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B4](#audit-b4), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B12](#audit-b12), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B43](#audit-b43), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52), [B80](#audit-b80), [B89](#audit-b89), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B98](#audit-b98), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B104](#audit-b104), [B105](#audit-b105), [B106](#audit-b106)

**S24 (467):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B4](#audit-b4), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B12](#audit-b12), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B43](#audit-b43), [B45](#audit-b45), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52), [B55](#audit-b55), [B56](#audit-b56), [B57](#audit-b57), [B58](#audit-b58), [B59](#audit-b59), [B60](#audit-b60), [B61](#audit-b61), [B62](#audit-b62), [B63](#audit-b63), [B64](#audit-b64), [B65](#audit-b65), [B66](#audit-b66), [B67](#audit-b67), [B68](#audit-b68), [B69](#audit-b69), [B70](#audit-b70), [B72](#audit-b72), [B74](#audit-b74), [B75](#audit-b75), [B76](#audit-b76), [B78](#audit-b78), [B79](#audit-b79), [B80](#audit-b80), [B89](#audit-b89), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B93](#audit-b93), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B98](#audit-b98), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B104](#audit-b104), [B105](#audit-b105), [B106](#audit-b106), [B107](#audit-b107)

**S25 (430):** [B1](#audit-b1), [B3](#audit-b3), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B28](#audit-b28), [B29](#audit-b29), [B43](#audit-b43), [B45](#audit-b45), [B46](#audit-b46), [B47](#audit-b47), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B82](#audit-b82), [B84](#audit-b84), [B89](#audit-b89), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B93](#audit-b93), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B99](#audit-b99), [B102](#audit-b102), [B105](#audit-b105), [B106](#audit-b106)

**S26 (432):** [B1](#audit-b1), [B3](#audit-b3), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B28](#audit-b28), [B29](#audit-b29), [B43](#audit-b43), [B45](#audit-b45), [B46](#audit-b46), [B47](#audit-b47), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B82](#audit-b82), [B84](#audit-b84), [B87](#audit-b87), [B88](#audit-b88), [B89](#audit-b89), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B93](#audit-b93), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B99](#audit-b99), [B102](#audit-b102), [B105](#audit-b105), [B106](#audit-b106)

**S27 (434):** [B1](#audit-b1), [B3](#audit-b3), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B28](#audit-b28), [B29](#audit-b29), [B43](#audit-b43), [B45](#audit-b45), [B46](#audit-b46), [B47](#audit-b47), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B82](#audit-b82), [B84](#audit-b84), [B86](#audit-b86), [B88](#audit-b88), [B89](#audit-b89), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B93](#audit-b93), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B99](#audit-b99), [B102](#audit-b102), [B105](#audit-b105), [B106](#audit-b106)

**S28 (435):** [B1](#audit-b1), [B3](#audit-b3), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B28](#audit-b28), [B29](#audit-b29), [B43](#audit-b43), [B45](#audit-b45), [B46](#audit-b46), [B47](#audit-b47), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B82](#audit-b82), [B84](#audit-b84), [B85](#audit-b85), [B86](#audit-b86), [B88](#audit-b88), [B89](#audit-b89), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B93](#audit-b93), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B99](#audit-b99), [B102](#audit-b102), [B105](#audit-b105), [B106](#audit-b106)

**S29 (407):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B4](#audit-b4), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B8](#audit-b8), [B11](#audit-b11), [B12](#audit-b12), [B15](#audit-b15), [B16](#audit-b16), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B43](#audit-b43), [B44](#audit-b44), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52), [B80](#audit-b80), [B89](#audit-b89), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B98](#audit-b98), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B104](#audit-b104), [B105](#audit-b105), [B106](#audit-b106)

**S30 (406):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B4](#audit-b4), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B8](#audit-b8), [B11](#audit-b11), [B12](#audit-b12), [B16](#audit-b16), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B43](#audit-b43), [B44](#audit-b44), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52), [B80](#audit-b80), [B89](#audit-b89), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B98](#audit-b98), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B104](#audit-b104), [B105](#audit-b105), [B106](#audit-b106)

**S31 (402):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B4](#audit-b4), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B31](#audit-b31), [B33](#audit-b33), [B43](#audit-b43), [B44](#audit-b44), [B45](#audit-b45), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52), [B55](#audit-b55), [B56](#audit-b56), [B57](#audit-b57), [B58](#audit-b58), [B59](#audit-b59), [B60](#audit-b60), [B61](#audit-b61), [B62](#audit-b62), [B63](#audit-b63), [B64](#audit-b64), [B65](#audit-b65), [B66](#audit-b66), [B67](#audit-b67), [B68](#audit-b68), [B69](#audit-b69), [B70](#audit-b70), [B71](#audit-b71), [B72](#audit-b72), [B74](#audit-b74), [B75](#audit-b75), [B76](#audit-b76), [B78](#audit-b78), [B79](#audit-b79), [B80](#audit-b80), [B89](#audit-b89), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B93](#audit-b93), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B104](#audit-b104), [B105](#audit-b105), [B106](#audit-b106), [B107](#audit-b107)

**S32 (2):** [B51](#audit-b51), [B91](#audit-b91)

**S33 (270):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B43](#audit-b43), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B106](#audit-b106), [B107](#audit-b107)

**S34 (295):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B14](#audit-b14), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B43](#audit-b43), [B44](#audit-b44), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52), [B60](#audit-b60), [B66](#audit-b66), [B68](#audit-b68), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B106](#audit-b106), [B107](#audit-b107)

**S35 (477):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B4](#audit-b4), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B12](#audit-b12), [B14](#audit-b14), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B43](#audit-b43), [B44](#audit-b44), [B45](#audit-b45), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52), [B55](#audit-b55), [B56](#audit-b56), [B57](#audit-b57), [B58](#audit-b58), [B59](#audit-b59), [B60](#audit-b60), [B61](#audit-b61), [B62](#audit-b62), [B63](#audit-b63), [B64](#audit-b64), [B65](#audit-b65), [B66](#audit-b66), [B67](#audit-b67), [B68](#audit-b68), [B69](#audit-b69), [B70](#audit-b70), [B72](#audit-b72), [B74](#audit-b74), [B75](#audit-b75), [B76](#audit-b76), [B78](#audit-b78), [B79](#audit-b79), [B80](#audit-b80), [B89](#audit-b89), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B93](#audit-b93), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B98](#audit-b98), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B104](#audit-b104), [B105](#audit-b105), [B106](#audit-b106), [B107](#audit-b107)

**S36 (399):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B4](#audit-b4), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B14](#audit-b14), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B43](#audit-b43), [B44](#audit-b44), [B45](#audit-b45), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52), [B55](#audit-b55), [B56](#audit-b56), [B57](#audit-b57), [B58](#audit-b58), [B59](#audit-b59), [B60](#audit-b60), [B61](#audit-b61), [B62](#audit-b62), [B63](#audit-b63), [B64](#audit-b64), [B65](#audit-b65), [B66](#audit-b66), [B67](#audit-b67), [B68](#audit-b68), [B69](#audit-b69), [B70](#audit-b70), [B72](#audit-b72), [B74](#audit-b74), [B75](#audit-b75), [B76](#audit-b76), [B78](#audit-b78), [B79](#audit-b79), [B80](#audit-b80), [B89](#audit-b89), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B93](#audit-b93), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B104](#audit-b104), [B105](#audit-b105), [B106](#audit-b106), [B107](#audit-b107)

**S37 (289):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B31](#audit-b31), [B32](#audit-b32), [B33](#audit-b33), [B37](#audit-b37), [B40](#audit-b40), [B41](#audit-b41), [B42](#audit-b42), [B43](#audit-b43), [B44](#audit-b44), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B104](#audit-b104), [B106](#audit-b106), [B107](#audit-b107)

**S38 (291):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B31](#audit-b31), [B32](#audit-b32), [B33](#audit-b33), [B38](#audit-b38), [B39](#audit-b39), [B40](#audit-b40), [B42](#audit-b42), [B43](#audit-b43), [B44](#audit-b44), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B73](#audit-b73), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B104](#audit-b104), [B106](#audit-b106), [B107](#audit-b107)

**S39 (289):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B31](#audit-b31), [B32](#audit-b32), [B33](#audit-b33), [B35](#audit-b35), [B40](#audit-b40), [B41](#audit-b41), [B42](#audit-b42), [B43](#audit-b43), [B44](#audit-b44), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B104](#audit-b104), [B106](#audit-b106), [B107](#audit-b107)

**S40 (287):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B31](#audit-b31), [B32](#audit-b32), [B33](#audit-b33), [B34](#audit-b34), [B40](#audit-b40), [B41](#audit-b41), [B43](#audit-b43), [B44](#audit-b44), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B104](#audit-b104), [B106](#audit-b106), [B107](#audit-b107)

**S41 (289):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B31](#audit-b31), [B32](#audit-b32), [B33](#audit-b33), [B36](#audit-b36), [B40](#audit-b40), [B41](#audit-b41), [B42](#audit-b42), [B43](#audit-b43), [B44](#audit-b44), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B77](#audit-b77), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B104](#audit-b104), [B106](#audit-b106), [B107](#audit-b107)

**S42 (502):** [B1](#audit-b1), [B3](#audit-b3), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B28](#audit-b28), [B29](#audit-b29), [B31](#audit-b31), [B32](#audit-b32), [B33](#audit-b33), [B43](#audit-b43), [B44](#audit-b44), [B45](#audit-b45), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B82](#audit-b82), [B83](#audit-b83), [B85](#audit-b85), [B89](#audit-b89), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B93](#audit-b93), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B99](#audit-b99), [B102](#audit-b102), [B103](#audit-b103), [B104](#audit-b104), [B106](#audit-b106)

**S43 (0):**

**S44 (408):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B4](#audit-b4), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B12](#audit-b12), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B31](#audit-b31), [B33](#audit-b33), [B43](#audit-b43), [B44](#audit-b44), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52), [B71](#audit-b71), [B80](#audit-b80), [B89](#audit-b89), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B98](#audit-b98), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B104](#audit-b104), [B105](#audit-b105), [B106](#audit-b106)

**S45 (83):** [B1](#audit-b1), [B3](#audit-b3), [B8](#audit-b8), [B11](#audit-b11), [B19](#audit-b19), [B20](#audit-b20), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B29](#audit-b29), [B30](#audit-b30), [B31](#audit-b31), [B33](#audit-b33), [B44](#audit-b44), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B50](#audit-b50), [B51](#audit-b51), [B53](#audit-b53), [B71](#audit-b71), [B90](#audit-b90), [B91](#audit-b91), [B95](#audit-b95), [B97](#audit-b97), [B98](#audit-b98)

**S46 (30):** [B1](#audit-b1), [B11](#audit-b11), [B15](#audit-b15), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B31](#audit-b31), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B51](#audit-b51), [B54](#audit-b54), [B90](#audit-b90)

**S47 (16):** [B7](#audit-b7), [B10](#audit-b10), [B25](#audit-b25), [B51](#audit-b51), [B60](#audit-b60), [B68](#audit-b68), [B80](#audit-b80), [B94](#audit-b94)

**S48 (305):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B13](#audit-b13), [B14](#audit-b14), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B43](#audit-b43), [B44](#audit-b44), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52), [B60](#audit-b60), [B66](#audit-b66), [B68](#audit-b68), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B106](#audit-b106), [B107](#audit-b107)

**S49 (487):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B4](#audit-b4), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B12](#audit-b12), [B13](#audit-b13), [B14](#audit-b14), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B43](#audit-b43), [B44](#audit-b44), [B45](#audit-b45), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52), [B55](#audit-b55), [B56](#audit-b56), [B57](#audit-b57), [B58](#audit-b58), [B59](#audit-b59), [B60](#audit-b60), [B61](#audit-b61), [B62](#audit-b62), [B63](#audit-b63), [B64](#audit-b64), [B65](#audit-b65), [B66](#audit-b66), [B67](#audit-b67), [B68](#audit-b68), [B69](#audit-b69), [B70](#audit-b70), [B72](#audit-b72), [B74](#audit-b74), [B75](#audit-b75), [B76](#audit-b76), [B78](#audit-b78), [B79](#audit-b79), [B80](#audit-b80), [B89](#audit-b89), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B93](#audit-b93), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B98](#audit-b98), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B104](#audit-b104), [B105](#audit-b105), [B106](#audit-b106), [B107](#audit-b107)

**S50 (409):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B4](#audit-b4), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B13](#audit-b13), [B14](#audit-b14), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B43](#audit-b43), [B44](#audit-b44), [B45](#audit-b45), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52), [B55](#audit-b55), [B56](#audit-b56), [B57](#audit-b57), [B58](#audit-b58), [B59](#audit-b59), [B60](#audit-b60), [B61](#audit-b61), [B62](#audit-b62), [B63](#audit-b63), [B64](#audit-b64), [B65](#audit-b65), [B66](#audit-b66), [B67](#audit-b67), [B68](#audit-b68), [B69](#audit-b69), [B70](#audit-b70), [B72](#audit-b72), [B74](#audit-b74), [B75](#audit-b75), [B76](#audit-b76), [B78](#audit-b78), [B79](#audit-b79), [B80](#audit-b80), [B89](#audit-b89), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B93](#audit-b93), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B104](#audit-b104), [B105](#audit-b105), [B106](#audit-b106), [B107](#audit-b107)

**S51 (296):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B13](#audit-b13), [B14](#audit-b14), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B32](#audit-b32), [B43](#audit-b43), [B44](#audit-b44), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B104](#audit-b104), [B106](#audit-b106), [B107](#audit-b107)

**S52 (407):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B4](#audit-b4), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B9](#audit-b9), [B12](#audit-b12), [B14](#audit-b14), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B43](#audit-b43), [B44](#audit-b44), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52), [B80](#audit-b80), [B89](#audit-b89), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B98](#audit-b98), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B104](#audit-b104), [B105](#audit-b105), [B106](#audit-b106)

**S53 (57):** [B1](#audit-b1), [B3](#audit-b3), [B9](#audit-b9), [B14](#audit-b14), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B29](#audit-b29), [B43](#audit-b43), [B44](#audit-b44), [B46](#audit-b46), [B50](#audit-b50), [B51](#audit-b51), [B60](#audit-b60), [B68](#audit-b68), [B90](#audit-b90), [B91](#audit-b91), [B94](#audit-b94), [B96](#audit-b96)

**S54 (297):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B9](#audit-b9), [B14](#audit-b14), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B43](#audit-b43), [B44](#audit-b44), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52), [B60](#audit-b60), [B66](#audit-b66), [B68](#audit-b68), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B106](#audit-b106), [B107](#audit-b107)

**S55 (171):** [B1](#audit-b1), [B3](#audit-b3), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B13](#audit-b13), [B14](#audit-b14), [B19](#audit-b19), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B28](#audit-b28), [B29](#audit-b29), [B32](#audit-b32), [B39](#audit-b39), [B43](#audit-b43), [B44](#audit-b44), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B50](#audit-b50), [B51](#audit-b51), [B90](#audit-b90), [B91](#audit-b91), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B102](#audit-b102), [B103](#audit-b103), [B104](#audit-b104), [B106](#audit-b106)

**S56 (67):** [B1](#audit-b1), [B3](#audit-b3), [B5](#audit-b5), [B7](#audit-b7), [B19](#audit-b19), [B25](#audit-b25), [B28](#audit-b28), [B43](#audit-b43), [B47](#audit-b47), [B51](#audit-b51), [B91](#audit-b91), [B92](#audit-b92), [B94](#audit-b94), [B95](#audit-b95), [B99](#audit-b99), [B100](#audit-b100)

**S57 (410):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B4](#audit-b4), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B13](#audit-b13), [B14](#audit-b14), [B18](#audit-b18), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B43](#audit-b43), [B44](#audit-b44), [B45](#audit-b45), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52), [B55](#audit-b55), [B56](#audit-b56), [B57](#audit-b57), [B58](#audit-b58), [B59](#audit-b59), [B60](#audit-b60), [B61](#audit-b61), [B62](#audit-b62), [B63](#audit-b63), [B64](#audit-b64), [B65](#audit-b65), [B66](#audit-b66), [B67](#audit-b67), [B68](#audit-b68), [B69](#audit-b69), [B70](#audit-b70), [B72](#audit-b72), [B74](#audit-b74), [B75](#audit-b75), [B76](#audit-b76), [B78](#audit-b78), [B79](#audit-b79), [B80](#audit-b80), [B89](#audit-b89), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B93](#audit-b93), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B104](#audit-b104), [B105](#audit-b105), [B106](#audit-b106), [B107](#audit-b107)

**S58 (297):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B13](#audit-b13), [B14](#audit-b14), [B18](#audit-b18), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B32](#audit-b32), [B43](#audit-b43), [B44](#audit-b44), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B104](#audit-b104), [B106](#audit-b106), [B107](#audit-b107)

**S59 (411):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B4](#audit-b4), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B13](#audit-b13), [B14](#audit-b14), [B17](#audit-b17), [B18](#audit-b18), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B43](#audit-b43), [B44](#audit-b44), [B45](#audit-b45), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52), [B55](#audit-b55), [B56](#audit-b56), [B57](#audit-b57), [B58](#audit-b58), [B59](#audit-b59), [B60](#audit-b60), [B61](#audit-b61), [B62](#audit-b62), [B63](#audit-b63), [B64](#audit-b64), [B65](#audit-b65), [B66](#audit-b66), [B67](#audit-b67), [B68](#audit-b68), [B69](#audit-b69), [B70](#audit-b70), [B72](#audit-b72), [B74](#audit-b74), [B75](#audit-b75), [B76](#audit-b76), [B78](#audit-b78), [B79](#audit-b79), [B80](#audit-b80), [B89](#audit-b89), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B93](#audit-b93), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B104](#audit-b104), [B105](#audit-b105), [B106](#audit-b106), [B107](#audit-b107)

**S60 (299):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B5](#audit-b5), [B6](#audit-b6), [B7](#audit-b7), [B13](#audit-b13), [B14](#audit-b14), [B17](#audit-b17), [B18](#audit-b18), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B32](#audit-b32), [B39](#audit-b39), [B43](#audit-b43), [B44](#audit-b44), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51), [B90](#audit-b90), [B91](#audit-b91), [B92](#audit-b92), [B94](#audit-b94), [B95](#audit-b95), [B96](#audit-b96), [B97](#audit-b97), [B99](#audit-b99), [B100](#audit-b100), [B102](#audit-b102), [B103](#audit-b103), [B104](#audit-b104), [B106](#audit-b106), [B107](#audit-b107)

<a id="audit-b1"></a>
<details>
<summary>B1: 6 shared definitions and types</summary>

`Ehr.Action`, `Ehr.AlertId`, `Ehr.CommitId`, `Ehr.InfoId`, `Ehr.ScreenId`, `Ehr.UserId`

</details>

<a id="audit-b2"></a>
<details>
<summary>B2: 28 shared definitions and types</summary>

`Ehr.Actor`, `Ehr.Event.isAck`, `Ehr.ackCore`, `Ehr.clickCommit`, `Ehr.clickCore`, `Ehr.clickedMacro?`, `Ehr.confirmCore`, `Ehr.enterCore`, `Ehr.goBack`, `Ehr.goTo`, `Ehr.linkedClosure`, `Ehr.linkedDependents`, `Ehr.macroStep`, `Ehr.macroStopReason`, `Ehr.macroValue`, `Ehr.markReviewed`, `Ehr.rejectReason`, `Ehr.requestPriorAuth`, `Ehr.runMacro`, `Ehr.searchShown`, `Ehr.selectTabCore`, `Ehr.setCaptured`, `Ehr.shownComp?`, `Ehr.step`, `Ehr.stepCore`, `Ehr.stepEvent`, `Ehr.storedCapture`, `Ehr.toggle`

</details>

<a id="audit-b3"></a>
<details>
<summary>B3: 3 shared definitions and types</summary>

`Ehr.AlertCond`, `Ehr.AlertSpec`, `Ehr.Tier`

</details>

<a id="audit-b4"></a>
<details>
<summary>B4: 36 shared definitions and types</summary>

`Ehr.AlertSpec.targetsScreen`, `Ehr.Kind.catalogTag`, `Ehr.Props.DeclaredWritesInSpec`, `Ehr.Props.HumanMustEnter`, `Ehr.Props.IdsUnique`, `Ehr.Props.LinkedNotRetyped`, `Ehr.Props.NavigationSane`, `Ehr.Props.NoAlertSuppression`, `Ehr.Props.NoAutomationAttempts`, `Ehr.Props.NoHumanRequest`, `Ehr.Props.NoInterruptivePopupRequests`, `Ehr.Props.NoPassivePopupRequests`, `Ehr.Props.QuantityPrefillsKeepUnits`, `Ehr.Props.ReferencesResolve`, `Ehr.Props.SpecIdsUnique`, `Ehr.Props.StabilityBudget`, `Ehr.Props.alertOf?`, `Ehr.Props.clickTarget?`, `Ehr.Props.commitOf?`, `Ehr.Props.fieldOf?`, `Ehr.Props.gotoOf?`, `Ehr.Props.gotoStep?`, `Ehr.Props.isContainer`, `Ehr.Props.isQuantity`, `Ehr.Props.kindName`, `Ehr.Props.macroOf?`, `Ehr.Props.movedTags`, `Ehr.Props.placeOf`, `Ehr.Props.popupRequestCount`, `Ehr.Props.recordFactOf?`, `Ehr.Props.reviewOf?`, `Ehr.Props.setTarget?`, `Ehr.Props.stepTarget?`, `Ehr.Render.NavSane`, `Ehr.Render.uiOverviewNav`, `Ehr.entryRelevantForRole`

</details>

<a id="audit-b5"></a>
<details>
<summary>B5: 16 shared definitions and types</summary>

`Ehr.ArtifactBinding`, `Ehr.ClinicalAge`, `Ehr.ClinicalFacts`, `Ehr.ClinicalFacts.field`, `Ehr.ClinicalObservation`, `Ehr.clinicalCode`, `Ehr.clinicalEval`, `Ehr.clinicalSourceValid`, `Ehr.doseElement`, `Ehr.drugClasses`, `Ehr.drugsInPlay`, `Ehr.inClass`, `Ehr.isHighAlert`, `Ehr.lineDoseMgTenths?`, `Ehr.namedClinicalCode`, `Ehr.orderLines`

</details>

<a id="audit-b6"></a>
<details>
<summary>B6: 35 shared definitions and types</summary>

`Ehr.BusinessCalendar`, `Ehr.EventEvidence`, `Ehr.InfoPayload`, `Ehr.OrderClock`, `Ehr.PatientDirectory`, `Ehr.PatientIdentity`, `Ehr.Spec.info?`, `Ehr.State.tabOf`, `Ehr.Value.nonEmpty`, `Ehr.WorkflowPhase`, `Ehr.bannerInfo`, `Ehr.clinicalApplies`, `Ehr.curesExemptionEligible`, `Ehr.encounterMatches`, `Ehr.factVersion`, `Ehr.freqElement`, `Ehr.hasValidReceipt`, `Ehr.highMme`, `Ehr.infoShown`, `Ehr.infoVersion`, `Ehr.layoutShown`, `Ehr.layoutShownAux`, `Ehr.lineFreqPerDay?`, `Ehr.mmeFactor`, `Ehr.naloxoneLine`, `Ehr.nowMin`, `Ehr.ownVisible`, `Ehr.parentOpen`, `Ehr.receiptValid`, `Ehr.reviewMet`, `Ehr.showsInfo`, `Ehr.waived`, `Ehr.waiverEligible`, `Ehr.weightBasedDrug`, `Ehr.whenHolds`

</details>

<a id="audit-b7"></a>
<details>
<summary>B7: 2 shared definitions and types</summary>

`Ehr.Captured`, `Ehr.drugElement`

</details>

<a id="audit-b8"></a>
<details>
<summary>B8: 7 shared definitions and types</summary>

`Ehr.Certificate`, `Ehr.Check.certificate`, `Ehr.Check.checkerVersion`, `Ehr.Check.fnv1a64`, `Ehr.Check.hex16`, `Ehr.Check.jsonHash`, `Ehr.encodeJson`

</details>

<a id="audit-b9"></a>
<details>
<summary>B9: 2 shared definitions and types</summary>

`Ehr.Check.DoseCompletionObstruction.program`, `Ehr.Check.DoseCompletionObstruction.spec`

</details>

<a id="audit-b10"></a>
<details>
<summary>B10: 2 shared definitions and types</summary>

`Ehr.Check.DrugSlotsWithin`, `Ehr.Check.FixedDrugSlots`

</details>

<a id="audit-b11"></a>
<details>
<summary>B11: 2 shared definitions and types</summary>

`Ehr.Check.FileWrite`, `Ehr.Check.Target`

</details>

<a id="audit-b12"></a>
<details>
<summary>B12: 77 shared definitions and types</summary>

`Ehr.Check.FilteredPopupRequests`, `Ehr.Check.Finding`, `Ehr.Check.Hop`, `Ehr.Check.Rule`, `Ehr.Check.additionalCompletionIssue`, `Ehr.Check.allGotoEdges`, `Ehr.Check.badHumanPrefill`, `Ehr.Check.badMacroStep`, `Ehr.Check.badReference`, `Ehr.Check.badWrite`, `Ehr.Check.bfs`, `Ehr.Check.bfsAux`, `Ehr.Check.bfsRound`, `Ehr.Check.check`, `Ehr.Check.clinicalUsesCapture`, `Ehr.Check.commitScreens`, `Ehr.Check.compFinding`, `Ehr.Check.completeForWithReach`, `Ehr.Check.completeViaWithReach`, `Ehr.Check.compsWithId`, `Ehr.Check.counterexample`, `Ehr.Check.doseDependencyIssue`, `Ehr.Check.doseDrugSelectable`, `Ehr.Check.drugSlots`, `Ehr.Check.entryValuesPossible`, `Ehr.Check.findComp`, `Ehr.Check.firstFinding`, `Ehr.Check.fixedShown`, `Ehr.Check.fixedShownAux`, `Ehr.Check.fixedSlot`, `Ehr.Check.followHops`, `Ehr.Check.hasNewLine`, `Ehr.Check.isGotoPath`, `Ehr.Check.isOpenGroup`, `Ehr.Check.landmarksPinned`, `Ehr.Check.linkedSourcesTyped`, `Ehr.Check.macroButton`, `Ehr.Check.macroFinding`, `Ehr.Check.navigationFinding`, `Ehr.Check.openEncounterField`, `Ehr.Check.openFieldOn`, `Ehr.Check.openGotoEdges`, `Ehr.Check.openReach`, `Ehr.Check.openReachTable`, `Ehr.Check.orderSelectionAvailable`, `Ehr.Check.parentsFixed`, `Ehr.Check.passivePinned`, `Ehr.Check.passiveScreensKept`, `Ehr.Check.pathTo`, `Ehr.Check.pinnedForReview`, `Ehr.Check.plain`, `Ehr.Check.popupComponents`, `Ehr.Check.popupTier`, `Ehr.Check.receiptHideSafe`, `Ehr.Check.recordSourcesDeclared`, `Ehr.Check.repairSlots`, `Ehr.Check.repairsSlot`, `Ehr.Check.replayFacts`, `Ehr.Check.replayOk`, `Ehr.Check.replayUser`, `Ehr.Check.revealAndClick`, `Ehr.Check.revealEvents`, `Ehr.Check.revealable`, `Ehr.Check.revealableAux`, `Ehr.Check.reviewsPinned`, `Ehr.Check.reviewsPinnedOn`, `Ehr.Check.rules`, `Ehr.Check.shortPathTo`, `Ehr.Check.tableReach`, `Ehr.Check.universallyValid`, `Ehr.Check.verifiedReachable`, `Ehr.Check.waiverHasNonemptyValue`, `Ehr.ClinicalPredicate.ctorElimType`, `Ehr.ClinicalPredicate.noConfusionType`, `Ehr.Program.catalogTags`, `Ehr.Program.inCatalog`, `Ehr.When.ctorElimType`

</details>

<a id="audit-b13"></a>
<details>
<summary>B13: 10 shared definitions and types</summary>

`Ehr.Check.FixedLine.assessmentField`, `Ehr.Check.FixedLine.drug`, `Ehr.Check.FixedLine.drugField`, `Ehr.Check.FixedLine.entry`, `Ehr.Check.FixedLine.macroButton`, `Ehr.Check.FixedLine.orderMacro`, `Ehr.Check.FixedLine.program`, `Ehr.Check.FixedLine.reviewVisibility`, `Ehr.Check.FixedLine.screen`, `Ehr.Check.FixedLine.spec`

</details>

<a id="audit-b14"></a>
<details>
<summary>B14: 9 shared definitions and types</summary>

`Ehr.Check.Scalar.alert`, `Ehr.Check.Scalar.button`, `Ehr.Check.Scalar.element`, `Ehr.Check.Scalar.entry`, `Ehr.Check.Scalar.field`, `Ehr.Check.Scalar.program`, `Ehr.Check.Scalar.review`, `Ehr.Check.Scalar.screen`, `Ehr.Check.Scalar.spec`

</details>

<a id="audit-b15"></a>
<details>
<summary>B15: 1 shared definitions and types</summary>

`Ehr.Check.Target.publishes`

</details>

<a id="audit-b16"></a>
<details>
<summary>B16: 1 shared definitions and types</summary>

`Ehr.Check.deployPlan`

</details>

<a id="audit-b17"></a>
<details>
<summary>B17: 1 shared definitions and types</summary>

`Ehr.Check.orderFillSteps`

</details>

<a id="audit-b18"></a>
<details>
<summary>B18: 1 shared definitions and types</summary>

`Ehr.Check.secondSafetyAlert`

</details>

<a id="audit-b19"></a>
<details>
<summary>B19: 3 shared definitions and types</summary>

`Ehr.ClinicalField`, `Ehr.ClinicalPredicate`, `Ehr.ClinicalPredicate.brecOn.go`

</details>

<a id="audit-b20"></a>
<details>
<summary>B20: 11 shared definitions and types</summary>

`Ehr.ClockAnchor`, `Ehr.DisplayScope`, `Ehr.EventId`, `Ehr.EventRef`, `Ehr.ExpiryDuration`, `Ehr.IdentifierCategory`, `Ehr.Kind.ctorElimType`, `Ehr.PayloadFieldReq`, `Ehr.RenewalPolicy`, `Ehr.TemporalDirection`, `Ehr.TimeMetric`

</details>

<a id="audit-b21"></a>
<details>
<summary>B21: 53 shared definitions and types</summary>

`Ehr.ClockRenewal`, `Ehr.ClockStamp`, `Ehr.CommitSpec.encounterRoleAllowed`, `Ehr.MonthCutoff`, `Ehr.ObligationStatus`, `Ehr.OrderClock.anchorStamp`, `Ehr.OrderInstanceId`, `Ehr.PayloadIdentifier`, `Ehr.PayloadRow`, `Ehr.Spec.commit?`, `Ehr.actionLabelOk`, `Ehr.businessLocalDay`, `Ehr.capturedSatisfies`, `Ehr.commitRoleOk`, `Ehr.defaultsOk`, `Ehr.displayActive`, `Ehr.displayReqMet`, `Ehr.displayScopeActive`, `Ehr.displayShown`, `Ehr.displaysOk`, `Ehr.encounterRolesOk`, `Ehr.entriesOk`, `Ehr.entryMet`, `Ehr.entryValueAllowed`, `Ehr.epochNow`, `Ehr.eventTime`, `Ehr.expiryCutoff`, `Ehr.expiryStatus`, `Ehr.extraGuard`, `Ehr.fieldRequired`, `Ehr.guardBase`, `Ehr.hasGoodEntry`, `Ehr.identityText`, `Ehr.infoPayload`, `Ehr.lineMatches`, `Ehr.monthDays`, `Ehr.payloadComplete`, `Ehr.payloadField`, `Ehr.payloadFieldMet`, `Ehr.renewalValid`, `Ehr.reviewsOk`, `Ehr.roleOk`, `Ehr.scanMatches`, `Ehr.serviceOrderAt`, `Ehr.signingHasOrder`, `Ehr.stampMinute`, `Ehr.stampValid`, `Ehr.temporalOrdering`, `Ehr.temporalStatus`, `Ehr.timeDistance`, `Ehr.validationsOk`, `Ehr.valueAccepted`, `Ehr.valueSatisfies`

</details>

<a id="audit-b22"></a>
<details>
<summary>B22: 26 shared definitions and types</summary>

`Ehr.CodeTable`, `Ehr.PatientContext`, `Ehr.Receipt`, `Ehr.Spec.element?`, `Ehr.UnitKind.name`, `Ehr.decimalValid`, `Ehr.digitVal`, `Ehr.digitsVal`, `Ehr.doseDrug?`, `Ehr.doseUnitValueValid`, `Ehr.doseUnitsAt`, `Ehr.doseValueValid`, `Ehr.elementValueValid`, `Ehr.freqPerDay`, `Ehr.gtinValid`, `Ehr.isoDateValid`, `Ehr.leapYear`, `Ehr.lexicalValue`, `Ehr.needsHuman`, `Ehr.parseTenths`, `Ehr.parseTenthsChars`, `Ehr.parseValue`, `Ehr.udiValid`, `Ehr.validDate`, `Ehr.validationCapture`, `Ehr.validationHolds`

</details>

<a id="audit-b23"></a>
<details>
<summary>B23: 11 shared definitions and types</summary>

`Ehr.CommitSpec`, `Ehr.DisplayReq`, `Ehr.EncounterRoleRule`, `Ehr.EntryReq`, `Ehr.ExpiryReq`, `Ehr.InfoSpec`, `Ehr.PayloadContract`, `Ehr.ReviewMode`, `Ehr.ReviewReq`, `Ehr.TemporalReq`, `Ehr.When`

</details>

<a id="audit-b24"></a>
<details>
<summary>B24: 1 shared definitions and types</summary>

`Ehr.CompId`

</details>

<a id="audit-b25"></a>
<details>
<summary>B25: 6 shared definitions and types</summary>

`Ehr.Component`, `Ehr.ElementId`, `Ehr.Kind`, `Ehr.Prefill`, `Ehr.Screen`, `Ehr.Slot`

</details>

<a id="audit-b26"></a>
<details>
<summary>B26: 1 shared definitions and types</summary>

`Ehr.ComponentDef`

</details>

<a id="audit-b27"></a>
<details>
<summary>B27: 1 shared definitions and types</summary>

`Ehr.DesignRules`

</details>

<a id="audit-b28"></a>
<details>
<summary>B28: 7 shared definitions and types</summary>

`Ehr.DoseUnitRule`, `Ehr.DrugInfo`, `Ehr.Program.compsOf`, `Ehr.Program.screen?`, `Ehr.drugDoseUnits`, `Ehr.formulary`, `Ehr.lookupDrug`

</details>

<a id="audit-b29"></a>
<details>
<summary>B29: 3 shared definitions and types</summary>

`Ehr.ElementSpec`, `Ehr.Validation`, `Ehr.ValueKind`

</details>

<a id="audit-b30"></a>
<details>
<summary>B30: 1 shared definitions and types</summary>

`Ehr.Event`

</details>

<a id="audit-b31"></a>
<details>
<summary>B31: 5 shared definitions and types</summary>

`Ehr.Examples.Tiny.amoxMacro`, `Ehr.Examples.Tiny.orderScreen`, `Ehr.Examples.Tiny.program`, `Ehr.Examples.Tiny.roomingScreen`, `Ehr.Examples.Tiny.signScreen`

</details>

<a id="audit-b32"></a>
<details>
<summary>B32: 2 shared definitions and types</summary>

`Ehr.Examples.Tiny.facts`, `Ehr.Examples.Tiny.user`

</details>

<a id="audit-b33"></a>
<details>
<summary>B33: 2 shared definitions and types</summary>

`Ehr.Examples.Tiny.prescribers`, `Ehr.Examples.Tiny.spec`

</details>

<a id="audit-b34"></a>
<details>
<summary>B34: 1 shared definitions and types</summary>

`Ehr.Examples.TinyTests.atOrder`

</details>

<a id="audit-b35"></a>
<details>
<summary>B35: 2 shared definitions and types</summary>

`Ehr.Examples.TinyTests.atSign`, `Ehr.Examples.TinyTests.atSignTab`

</details>

<a id="audit-b36"></a>
<details>
<summary>B36: 1 shared definitions and types</summary>

`Ehr.Examples.TinyTests.atSignAmox`

</details>

<a id="audit-b37"></a>
<details>
<summary>B37: 2 shared definitions and types</summary>

`Ehr.Examples.TinyTests.atSignWarfarin`, `Ehr.Proofs.HypothesisExamples.signedWarfarin`

</details>

<a id="audit-b38"></a>
<details>
<summary>B38: 2 shared definitions and types</summary>

`Ehr.Examples.TinyTests.atSignWith`, `Ehr.Proofs.HypothesisExamples.allergyReview`

</details>

<a id="audit-b39"></a>
<details>
<summary>B39: 1 shared definitions and types</summary>

`Ehr.Examples.TinyTests.factsWithReceipt`

</details>

<a id="audit-b40"></a>
<details>
<summary>B40: 1 shared definitions and types</summary>

`Ehr.Examples.TinyTests.run`

</details>

<a id="audit-b41"></a>
<details>
<summary>B41: 1 shared definitions and types</summary>

`Ehr.Examples.TinyTests.s0`

</details>

<a id="audit-b42"></a>
<details>
<summary>B42: 1 shared definitions and types</summary>

`Ehr.Examples.TinyTests.toSign`

</details>

<a id="audit-b43"></a>
<details>
<summary>B43: 1 shared definitions and types</summary>

`Ehr.Facts`

</details>

<a id="audit-b44"></a>
<details>
<summary>B44: 1 shared definitions and types</summary>

`Ehr.Friction`

</details>

<a id="audit-b45"></a>
<details>
<summary>B45: 12 shared definitions and types</summary>

`Ehr.ItemView`, `Ehr.PayloadGroup`, `Ehr.PayloadView`, `Ehr.ScreenView`, `Ehr.SelectedPayloadRow`, `Ehr.actionStatus`, `Ehr.capturedAt?`, `Ehr.depthAux`, `Ehr.infoPinned`, `Ehr.itemView`, `Ehr.payloadView`, `Ehr.view`

</details>

<a id="audit-b46"></a>
<details>
<summary>B46: 1 shared definitions and types</summary>

`Ehr.Macro`

</details>

<a id="audit-b47"></a>
<details>
<summary>B47: 1 shared definitions and types</summary>

`Ehr.MacroId`

</details>

<a id="audit-b48"></a>
<details>
<summary>B48: 1 shared definitions and types</summary>

`Ehr.MacroStep`

</details>

<a id="audit-b49"></a>
<details>
<summary>B49: 15 shared definitions and types</summary>

`Ehr.ObligationView`, `Ehr.Program.macro?`, `Ehr.Role.name`, `Ehr.StepResult`, `Ehr.alertHolds`, `Ehr.clickAlert`, `Ehr.compShown`, `Ehr.currentLineComplete`, `Ehr.encounterRoleFailure?`, `Ehr.entryReason`, `Ehr.guardReason`, `Ehr.hasOrderAt`, `Ehr.obligationViews`, `Ehr.priorAuthCaptured`, `Ehr.priorAuthElement`

</details>

<a id="audit-b50"></a>
<details>
<summary>B50: 1 shared definitions and types</summary>

`Ehr.PrefillPolicy`

</details>

<a id="audit-b51"></a>
<details>
<summary>B51: 1 shared definitions and types</summary>

`Ehr.Program`

</details>

<a id="audit-b52"></a>
<details>
<summary>B52: 5 shared definitions and types</summary>

`Ehr.Program.presetOwner`, `Ehr.Props.commitButtons`, `Ehr.Props.requiredCommits`, `Ehr.presetScreen`, `Ehr.presetWorkflows`

</details>

<a id="audit-b53"></a>
<details>
<summary>B53: 1 shared definitions and types</summary>

`Ehr.Proofs.HypothesisExamples.currentCertificate`

</details>

<a id="audit-b54"></a>
<details>
<summary>B54: 1 shared definitions and types</summary>

`Ehr.Proofs.HypothesisExamples.rejectedVersion`

</details>

<a id="audit-b55"></a>
<details>
<summary>B55: 3 shared definitions and types</summary>

`Ehr.Props.AlertBudget`, `Ehr.Props.ReachableScreen`, `Ehr.Props.WithinBudgets`

</details>

<a id="audit-b56"></a>
<details>
<summary>B56: 1 shared definitions and types</summary>

`Ehr.Props.AlertShownInline`

</details>

<a id="audit-b57"></a>
<details>
<summary>B57: 3 shared definitions and types</summary>

`Ehr.Props.AlertsFire`, `Ehr.Props.InterruptiveHandled`, `Ehr.Props.PassiveShownInline`

</details>

<a id="audit-b58"></a>
<details>
<summary>B58: 2 shared definitions and types</summary>

`Ehr.Props.AlertsOnlyWhenTrue`, `Ehr.Props.NoFalseAlarms`

</details>

<a id="audit-b59"></a>
<details>
<summary>B59: 6 shared definitions and types</summary>

`Ehr.Props.AllowedEntryValue`, `Ehr.Props.CapturesAllOnce`, `Ehr.Props.CommitCapturesAll`, `Ehr.Props.CountsFor`, `Ehr.Props.EnteredOnce`, `Ehr.Props.EntryMetIn`

</details>

<a id="audit-b60"></a>
<details>
<summary>B60: 1 shared definitions and types</summary>

`Ehr.Props.Always`

</details>

<a id="audit-b61"></a>
<details>
<summary>B61: 1 shared definitions and types</summary>

`Ehr.Props.Applies`

</details>

<a id="audit-b62"></a>
<details>
<summary>B62: 5 shared definitions and types</summary>

`Ehr.Props.CatalogOnly`, `Ehr.Props.LandmarksShown`, `Ehr.Props.RequiredWithinDepth`, `Ehr.Props.WellFormed`, `Ehr.Props.WithinClicks`

</details>

<a id="audit-b63"></a>
<details>
<summary>B63: 7 shared definitions and types</summary>

`Ehr.Props.CommitButtonShown`, `Ehr.Props.CommitReviewsMet`, `Ehr.Props.CommitScreenShowsReviews`, `Ehr.Props.ReceiptCovers`, `Ehr.Props.ReviewMetIn`, `Ehr.Props.ReviewsBeforeCommit`, `Ehr.Props.Waived`

</details>

<a id="audit-b64"></a>
<details>
<summary>B64: 1 shared definitions and types</summary>

`Ehr.Props.CommitHappens`

</details>

<a id="audit-b65"></a>
<details>
<summary>B65: 2 shared definitions and types</summary>

`Ehr.Props.CommitUnitsRight`, `Ehr.Props.UnitsRight`

</details>

<a id="audit-b66"></a>
<details>
<summary>B66: 5 shared definitions and types</summary>

`Ehr.Props.CommitsStayReachable`, `Ehr.Props.Completable`, `Ehr.Props.Episode.afterHuman`, `Ehr.Props.RecordAllowsScans`, `Ehr.Props.requiredCommitsFor`

</details>

<a id="audit-b67"></a>
<details>
<summary>B67: 5 shared definitions and types</summary>

`Ehr.Props.CosignIsSecondUser`, `Ehr.Props.Episode.start`, `Ehr.Props.HumanOnlyKept`, `Ehr.Props.HumanStepsByHuman`, `Ehr.Props.OnlyHumanCommitsAndAcks`

</details>

<a id="audit-b68"></a>
<details>
<summary>B68: 2 shared definitions and types</summary>

`Ehr.Props.Episode`, `Ehr.Props.Reachable`

</details>

<a id="audit-b69"></a>
<details>
<summary>B69: 2 shared definitions and types</summary>

`Ehr.Props.Episode.next`, `Ehr.Props.EveryStep`

</details>

<a id="audit-b70"></a>
<details>
<summary>B70: 2 shared definitions and types</summary>

`Ehr.Props.Episode.screen`, `Ehr.Props.ShowsSome`

</details>

<a id="audit-b71"></a>
<details>
<summary>B71: 5 shared definitions and types</summary>

`Ehr.Props.Examples.goodMacro`, `Ehr.Props.Examples.goodOrderScreen`, `Ehr.Props.Examples.goodProgram`, `Ehr.Props.Examples.goodSignScreen`, `Ehr.Props.Examples.pinTinyAlerts`

</details>

<a id="audit-b72"></a>
<details>
<summary>B72: 1 shared definitions and types</summary>

`Ehr.Props.GotoPath`

</details>

<a id="audit-b73"></a>
<details>
<summary>B73: 2 shared definitions and types</summary>

`Ehr.Props.HumanWaiverFor`, `Ehr.Props.ValidReceiptFor`

</details>

<a id="audit-b74"></a>
<details>
<summary>B74: 1 shared definitions and types</summary>

`Ehr.Props.InfoShown`

</details>

<a id="audit-b75"></a>
<details>
<summary>B75: 3 shared definitions and types</summary>

`Ehr.Props.InterruptsOnce`, `Ehr.Props.NoRepeatInterruptions`, `Ehr.Props.PopupRequestedOnce`

</details>

<a id="audit-b76"></a>
<details>
<summary>B76: 2 shared definitions and types</summary>

`Ehr.Props.PassiveNeverPopsUp`, `Ehr.Props.SeverityTiers`

</details>

<a id="audit-b77"></a>
<details>
<summary>B77: 1 shared definitions and types</summary>

`Ehr.Props.PopupNotPassive`

</details>

<a id="audit-b78"></a>
<details>
<summary>B78: 1 shared definitions and types</summary>

`Ehr.Props.Satisfies`

</details>

<a id="audit-b79"></a>
<details>
<summary>B79: 2 shared definitions and types</summary>

`Ehr.Props.WritesAllowed`, `Ehr.Props.WritesOnly`

</details>

<a id="audit-b80"></a>
<details>
<summary>B80: 1 shared definitions and types</summary>

`Ehr.Props.allComps`

</details>

<a id="audit-b81"></a>
<details>
<summary>B81: 2 shared definitions and types</summary>

`Ehr.Props.foldMacro`, `Ehr.Props.macroAct`

</details>

<a id="audit-b82"></a>
<details>
<summary>B82: 32 shared definitions and types</summary>

`Ehr.Render.AdministrationRow`, `Ehr.Render.AllergyRow`, `Ehr.Render.BannerInfo`, `Ehr.Render.BoardRow`, `Ehr.Render.ClinicianRow`, `Ehr.Render.Ctx`, `Ehr.Render.Ctx.v`, `Ehr.Render.Display`, `Ehr.Render.EncRow`, `Ehr.Render.GrowthPoint`, `Ehr.Render.HistoryRow`, `Ehr.Render.ImmRow`, `Ehr.Render.LabResultRow`, `Ehr.Render.LabRow`, `Ehr.Render.MarOrderRow`, `Ehr.Render.MedRow`, `Ehr.Render.NoteRow`, `Ehr.Render.ObservationRow`, `Ehr.Render.ProblemRow`, `Ehr.Render.ProcRow`, `Ehr.Render.ScheduleRow`, `Ehr.Render.TrendPoint`, `Ehr.Render.UiChartReference`, `Ehr.Render.UiCodeChoice`, `Ehr.Render.UiNode`, `Ehr.Render.UiPresentationKind`, `Ehr.Render.VitalRow`, `Ehr.Render.blockedReason`, `Ehr.Render.uiBlocked`, `Ehr.Render.uiButton`, `Ehr.Render.uiEnabled`, `Ehr.Render.uiReasonText`

</details>

<a id="audit-b83"></a>
<details>
<summary>B83: 202 shared definitions and types</summary>

`Ehr.Render.Display.empty`, `Ehr.Render.FactsContext`, `Ehr.Render.Fhir.Ambulatory.AmbulatoryMessageRow`, `Ehr.Render.Fhir.Ambulatory.AmbulatoryScheduleRow`, `Ehr.Render.Fhir.Ambulatory.currentRefillPrescription`, `Ehr.Render.Fhir.Ambulatory.forecastRows`, `Ehr.Render.Fhir.Ambulatory.latestResultSources`, `Ehr.Render.Fhir.Ambulatory.messageRows`, `Ehr.Render.Fhir.Ambulatory.patientTasks`, `Ehr.Render.Fhir.Ambulatory.payload`, `Ehr.Render.Fhir.Ambulatory.payloads`, `Ehr.Render.Fhir.Ambulatory.prescriptionPharmacy`, `Ehr.Render.Fhir.Ambulatory.referenceMatches`, `Ehr.Render.Fhir.Ambulatory.refillComparisonRows`, `Ehr.Render.Fhir.Ambulatory.refillLastFill`, `Ehr.Render.Fhir.Ambulatory.refillMedication`, `Ehr.Render.Fhir.Ambulatory.refillPatientCompatible`, `Ehr.Render.Fhir.Ambulatory.refillPrescriptionDetail`, `Ehr.Render.Fhir.Ambulatory.resolveReference`, `Ehr.Render.Fhir.Ambulatory.resultRows`, `Ehr.Render.Fhir.Ambulatory.scheduleRows`, `Ehr.Render.Fhir.Ambulatory.selectedResultSources`, `Ehr.Render.Fhir.Ambulatory.selectedTrendRows`, `Ehr.Render.Fhir.Ambulatory.taskFolder`, `Ehr.Render.Fhir.LabPoint`, `Ehr.Render.Fhir.LabPoint.abnormal`, `Ehr.Render.Fhir.SurgicalCaseRow`, `Ehr.Render.Fhir.SurgicalCaseRow.cells`, `Ehr.Render.Fhir.abnormalCodes`, `Ehr.Render.Fhir.administrationRow`, `Ehr.Render.Fhir.administrationRows`, `Ehr.Render.Fhir.administrationStatus`, `Ehr.Render.Fhir.ageMonths`, `Ehr.Render.Fhir.ageYears`, `Ehr.Render.Fhir.allergenClasses`, `Ehr.Render.Fhir.allergyActive`, `Ehr.Render.Fhir.allergyClassesOf`, `Ehr.Render.Fhir.allergyRow`, `Ehr.Render.Fhir.allergyRows`, `Ehr.Render.Fhir.appointmentActor`, `Ehr.Render.Fhir.arr`, `Ehr.Render.Fhir.bannerOf`, `Ehr.Render.Fhir.bannerWeightOf`, `Ehr.Render.Fhir.base64Bytes`, `Ehr.Render.Fhir.base64Digit`, `Ehr.Render.Fhir.boardRow`, `Ehr.Render.Fhir.boardRows`, `Ehr.Render.Fhir.bodyHeightCode`, `Ehr.Render.Fhir.bodyWeightCode`, `Ehr.Render.Fhir.bundleResources`, `Ehr.Render.Fhir.careGapsOf`, `Ehr.Render.Fhir.categoryCodes`, `Ehr.Render.Fhir.categoryText`, `Ehr.Render.Fhir.ccText`, `Ehr.Render.Fhir.clinicalStatus`, `Ehr.Render.Fhir.clinicianRows`, `Ehr.Render.Fhir.codings`, `Ehr.Render.Fhir.containsStr`, `Ehr.Render.Fhir.coverageOf`, `Ehr.Render.Fhir.dayOf`, `Ehr.Render.Fhir.decodeBase64Utf8`, `Ehr.Render.Fhir.displayName`, `Ehr.Render.Fhir.displayOf`, `Ehr.Render.Fhir.documentVisible`, `Ehr.Render.Fhir.encRow`, `Ehr.Render.Fhir.encounterKindOf`, `Ehr.Render.Fhir.encounterParticipant`, `Ehr.Render.Fhir.encounterRecords`, `Ehr.Render.Fhir.entryResource`, `Ehr.Render.Fhir.extensionText`, `Ehr.Render.Fhir.factsOf`, `Ehr.Render.Fhir.familyHistoryRows`, `Ehr.Render.Fhir.field`, `Ehr.Render.Fhir.first`, `Ehr.Render.Fhir.firstCode`, `Ehr.Render.Fhir.fluCvx`, `Ehr.Render.Fhir.fmtHundredths`, `Ehr.Render.Fhir.givenNames`, `Ehr.Render.Fhir.growthPoints`, `Ehr.Render.Fhir.growthReferenceSex`, `Ehr.Render.Fhir.hasCode`, `Ehr.Render.Fhir.heightCmTenths`, `Ehr.Render.Fhir.historyRows`, `Ehr.Render.Fhir.historyVersionOf`, `Ehr.Render.Fhir.humanRef`, `Ehr.Render.Fhir.immRow`, `Ehr.Render.Fhir.initials`, `Ehr.Render.Fhir.isAllergy`, `Ehr.Render.Fhir.isBodyWeight`, `Ehr.Render.Fhir.isDocumentReference`, `Ehr.Render.Fhir.isHistoryResource`, `Ehr.Render.Fhir.isLab`, `Ehr.Render.Fhir.isMedRequest`, `Ehr.Render.Fhir.isObservation`, `Ehr.Render.Fhir.isSocialCondition`, `Ehr.Render.Fhir.isVital`, `Ehr.Render.Fhir.knownText`, `Ehr.Render.Fhir.labComponentResultRow`, `Ehr.Render.Fhir.labDemoRangeCompatible`, `Ehr.Render.Fhir.labDisplayAliases`, `Ehr.Render.Fhir.labDisplayName`, `Ehr.Render.Fhir.labFlag`, `Ehr.Render.Fhir.labFlags`, `Ehr.Render.Fhir.labPoint`, `Ehr.Render.Fhir.labQuantityText`, `Ehr.Render.Fhir.labRangeText`, `Ehr.Render.Fhir.labResultFlag`, `Ehr.Render.Fhir.labResultRange`, `Ehr.Render.Fhir.labResultRow`, `Ehr.Render.Fhir.labResultRows`, `Ehr.Render.Fhir.labResultRowsFor`, `Ehr.Render.Fhir.labResultValue`, `Ehr.Render.Fhir.labRows`, `Ehr.Render.Fhir.labSampledValue`, `Ehr.Render.Fhir.labSourceFlags`, `Ehr.Render.Fhir.latestBy`, `Ehr.Render.Fhir.latestEncounter`, `Ehr.Render.Fhir.listVersion`, `Ehr.Render.Fhir.marOrderRow`, `Ehr.Render.Fhir.marOrderRows`, `Ehr.Render.Fhir.medActive`, `Ehr.Render.Fhir.medCode`, `Ehr.Render.Fhir.medCurrent`, `Ehr.Render.Fhir.medDrug`, `Ehr.Render.Fhir.medName`, `Ehr.Render.Fhir.medRow`, `Ehr.Render.Fhir.medRows`, `Ehr.Render.Fhir.medicationStatementHistoryRow`, `Ehr.Render.Fhir.mrnOf`, `Ehr.Render.Fhir.newestFirst`, `Ehr.Render.Fhir.noteAttachmentText`, `Ehr.Render.Fhir.noteRow`, `Ehr.Render.Fhir.noteRows`, `Ehr.Render.Fhir.notesVersionOf`, `Ehr.Render.Fhir.obsValue`, `Ehr.Render.Fhir.obsWhen`, `Ehr.Render.Fhir.observationBpValue?`, `Ehr.Render.Fhir.observationComponentRow`, `Ehr.Render.Fhir.observationRow`, `Ehr.Render.Fhir.observationRows`, `Ehr.Render.Fhir.observationRowsFor`, `Ehr.Render.Fhir.ofType`, `Ehr.Render.Fhir.officialName`, `Ehr.Render.Fhir.oldestFirst`, `Ehr.Render.Fhir.patientIdOf`, `Ehr.Render.Fhir.periopIndicationText`, `Ehr.Render.Fhir.periopReferenceMatches`, `Ehr.Render.Fhir.periopReferenceName`, `Ehr.Render.Fhir.periopSubject`, `Ehr.Render.Fhir.practitionerName`, `Ehr.Render.Fhir.problemRow`, `Ehr.Render.Fhir.procRow`, `Ehr.Render.Fhir.procedureHistoryRow`, `Ehr.Render.Fhir.qtyScaled`, `Ehr.Render.Fhir.qtyText`, `Ehr.Render.Fhir.qtyUnitText`, `Ehr.Render.Fhir.quantityLabel`, `Ehr.Render.Fhir.reactionText`, `Ehr.Render.Fhir.refAgeSex`, `Ehr.Render.Fhir.refRanges`, `Ehr.Render.Fhir.refText`, `Ehr.Render.Fhir.referenced?`, `Ehr.Render.Fhir.renderRefUnits`, `Ehr.Render.Fhir.resourceType`, `Ehr.Render.Fhir.scaled`, `Ehr.Render.Fhir.scheduleRow`, `Ehr.Render.Fhir.scheduleRows`, `Ehr.Render.Fhir.severityText`, `Ehr.Render.Fhir.sexOf`, `Ehr.Render.Fhir.sigText`, `Ehr.Render.Fhir.socialFindingCodes`, `Ehr.Render.Fhir.socialHistoryRow`, `Ehr.Render.Fhir.str`, `Ehr.Render.Fhir.stringOfChars`, `Ehr.Render.Fhir.sub`, `Ehr.Render.Fhir.surgicalCaseRows`, `Ehr.Render.Fhir.surgicalConsentRows`, `Ehr.Render.Fhir.surgicalConsultRows`, `Ehr.Render.Fhir.surgicalPayloads`, `Ehr.Render.Fhir.surgicalRecordRows`, `Ehr.Render.Fhir.tinyAllergy`, `Ehr.Render.Fhir.tinyBundle`, `Ehr.Render.Fhir.tinyDisplay`, `Ehr.Render.Fhir.tinyFacts`, `Ehr.Render.Fhir.tinyMed`, `Ehr.Render.Fhir.tinyPatient`, `Ehr.Render.Fhir.tinyWeight`, `Ehr.Render.Fhir.unitOf`, `Ehr.Render.Fhir.verificationStatus`, `Ehr.Render.Fhir.versionDigest`, `Ehr.Render.Fhir.versionKey`, `Ehr.Render.Fhir.vitalRow`, `Ehr.Render.Fhir.weightReading`, `Ehr.Render.Fhir.weightTodayOf`, `Ehr.Render.Fhir.yearsBefore`, `Ehr.Render.Fhir.ymd`, `Ehr.Render.Tests.context`, `Ehr.Render.tinyCtx`, `Ehr.Render.tinyFhirCtx`, `Ehr.Render.uiRoomCtx`, `Ehr.Render.uiSignCtx`, `Ehr.Render.uiSignItem`

</details>

<a id="audit-b84"></a>
<details>
<summary>B84: 153 shared definitions and types</summary>

`Ehr.Render.InputType`, `Ehr.Render.UiBranch`, `Ehr.Render.UiCodeChoices`, `Ehr.Render.UiPresentationKind.tag`, `Ehr.Render.UiScreen`, `Ehr.Render.ValueKindName`, `Ehr.Render.actionRole`, `Ehr.Render.administrationFor`, `Ehr.Render.administrationText`, `Ehr.Render.allergyCells`, `Ehr.Render.boardCells`, `Ehr.Render.cdcHeightBoys5`, `Ehr.Render.cdcHeightBoys50`, `Ehr.Render.cdcHeightBoys95`, `Ehr.Render.cdcHeightGirls5`, `Ehr.Render.cdcHeightGirls50`, `Ehr.Render.cdcHeightGirls95`, `Ehr.Render.cdcWeightBoys5`, `Ehr.Render.cdcWeightBoys50`, `Ehr.Render.cdcWeightBoys95`, `Ehr.Render.cdcWeightGirls5`, `Ehr.Render.cdcWeightGirls50`, `Ehr.Render.cdcWeightGirls95`, `Ehr.Render.commonDiagnosisChoices`, `Ehr.Render.commonLabChoices`, `Ehr.Render.fieldKind`, `Ehr.Render.flowsheetCells`, `Ehr.Render.flowsheetObservation`, `Ehr.Render.gridHour`, `Ehr.Render.gridTime`, `Ehr.Render.growthReferenceCatalog`, `Ehr.Render.historyCells`, `Ehr.Render.infoLabel`, `Ehr.Render.labResultCells`, `Ehr.Render.labResultLabel`, `Ehr.Render.marCells`, `Ehr.Render.marClock`, `Ehr.Render.marTimeColumns`, `Ehr.Render.medCells`, `Ehr.Render.noteCells`, `Ehr.Render.presentationKind?`, `Ehr.Render.presentationKinds`, `Ehr.Render.problemCells`, `Ehr.Render.renderUi`, `Ehr.Render.scheduleCells`, `Ehr.Render.structuredRows?`, `Ehr.Render.surgicalChoices`, `Ehr.Render.surgicalDiagnosisChoices`, `Ehr.Render.surgicalProcedureChoices`, `Ehr.Render.uiActiveNav`, `Ehr.Render.uiAllergySummary`, `Ehr.Render.uiAntithrombotic`, `Ehr.Render.uiBanner`, `Ehr.Render.uiBannerWeight`, `Ehr.Render.uiCaptureText`, `Ehr.Render.uiCaseValue`, `Ehr.Render.uiChars`, `Ehr.Render.uiClinicalBanner`, `Ehr.Render.uiClinicalHeading`, `Ehr.Render.uiClinicianViewer`, `Ehr.Render.uiColumnChildren`, `Ehr.Render.uiColumnTag`, `Ehr.Render.uiComponentsWhere`, `Ehr.Render.uiDate`, `Ehr.Render.uiDoseRows`, `Ehr.Render.uiEncounterBanner`, `Ehr.Render.uiEntryHint`, `Ehr.Render.uiEntryHints`, `Ehr.Render.uiField`, `Ehr.Render.uiFieldChoices`, `Ehr.Render.uiFieldKind`, `Ehr.Render.uiFieldSourceText`, `Ehr.Render.uiFieldSources`, `Ehr.Render.uiFooterNode`, `Ehr.Render.uiFullInfoShown`, `Ehr.Render.uiGrowthReferences`, `Ehr.Render.uiHundredths`, `Ehr.Render.uiInWorkspace`, `Ehr.Render.uiInfo`, `Ehr.Render.uiItem`, `Ehr.Render.uiItemInfo`, `Ehr.Render.uiItemRows`, `Ehr.Render.uiLatestVitals`, `Ehr.Render.uiMedSummary`, `Ehr.Render.uiMedicationFieldLabel`, `Ehr.Render.uiMissingReviews`, `Ehr.Render.uiModal`, `Ehr.Render.uiNarrativeElement`, `Ehr.Render.uiNav`, `Ehr.Render.uiNavButton`, `Ehr.Render.uiNavGroup`, `Ehr.Render.uiNavTitle`, `Ehr.Render.uiNest`, `Ehr.Render.uiNoteSummaryRows`, `Ehr.Render.uiOrderInfo`, `Ehr.Render.uiOrderRows`, `Ehr.Render.uiOverview`, `Ehr.Render.uiOverviewTag`, `Ehr.Render.uiPayloadRows`, `Ehr.Render.uiPlaceFooter`, `Ehr.Render.uiProblemSummary`, `Ehr.Render.uiProgress`, `Ehr.Render.uiProvenanceSourceLabel`, `Ehr.Render.uiProvenanceText`, `Ehr.Render.uiQueueRowTag`, `Ehr.Render.uiRefillComparisonRows`, `Ehr.Render.uiRequiredReviews`, `Ehr.Render.uiReviewStatus`, `Ehr.Render.uiRowTarget?`, `Ehr.Render.uiRows`, `Ehr.Render.uiRows.valueTextQty`, `Ehr.Render.uiSearchCells`, `Ehr.Render.uiSearchExcerpt`, `Ehr.Render.uiSearchLabs`, `Ehr.Render.uiSearchRows`, `Ehr.Render.uiSearchSource`, `Ehr.Render.uiSearchSummary`, `Ehr.Render.uiSide`, `Ehr.Render.uiSideAt`, `Ehr.Render.uiSideAt.go`, `Ehr.Render.uiSourceLabels`, `Ehr.Render.uiSourceText`, `Ehr.Render.uiSteps`, `Ehr.Render.uiSummaryRows`, `Ehr.Render.uiTagIs`, `Ehr.Render.uiTakesChildren`, `Ehr.Render.uiTenths`, `Ehr.Render.uiTitledLabel`, `Ehr.Render.uiValueSetChoices`, `Ehr.Render.uiViewer`, `Ehr.Render.uiVisitNoteElements`, `Ehr.Render.uiVisitNoteRow`, `Ehr.Render.uiVisitNoteRows`, `Ehr.Render.uiWorkspace`, `Ehr.Render.uiWrapFieldChoices`, `Ehr.Render.uiWrapGrowthReferences`, `Ehr.Render.uiWrapInfo`, `Ehr.Render.uiWrapRow`, `Ehr.Render.unitName`, `Ehr.Render.valueText`, `Ehr.Render.vitalCells`, `Ehr.Render.whoHeightBoys5`, `Ehr.Render.whoHeightBoys50`, `Ehr.Render.whoHeightBoys95`, `Ehr.Render.whoHeightGirls5`, `Ehr.Render.whoHeightGirls50`, `Ehr.Render.whoHeightGirls95`, `Ehr.Render.whoWeightBoys5`, `Ehr.Render.whoWeightBoys50`, `Ehr.Render.whoWeightBoys95`, `Ehr.Render.whoWeightGirls5`, `Ehr.Render.whoWeightGirls50`, `Ehr.Render.whoWeightGirls95`

</details>

<a id="audit-b85"></a>
<details>
<summary>B85: 1 shared definitions and types</summary>

`Ehr.Render.UiActionHonest`

</details>

<a id="audit-b86"></a>
<details>
<summary>B86: 3 shared definitions and types</summary>

`Ehr.Render.UiPresent`, `Ehr.Render.uiBannerAtom`, `Ehr.Render.uiNavAtoms`

</details>

<a id="audit-b87"></a>
<details>
<summary>B87: 1 shared definitions and types</summary>

`Ehr.Render.UiWorkspacePresent`

</details>

<a id="audit-b88"></a>
<details>
<summary>B88: 1 shared definitions and types</summary>

`Ehr.Render.uiAtomsList`

</details>

<a id="audit-b89"></a>
<details>
<summary>B89: 1 shared definitions and types</summary>

`Ehr.Render.uiLabel`

</details>

<a id="audit-b90"></a>
<details>
<summary>B90: 3 shared definitions and types</summary>

`Ehr.Role`, `Ehr.Size`, `Ehr.Visibility`

</details>

<a id="audit-b91"></a>
<details>
<summary>B91: 1 shared definitions and types</summary>

`Ehr.Spec`

</details>

<a id="audit-b92"></a>
<details>
<summary>B92: 4 shared definitions and types</summary>

`Ehr.Spec.alert?`, `Ehr.canPopup`, `Ehr.popupCandidates`, `Ehr.programPopsUp`

</details>

<a id="audit-b93"></a>
<details>
<summary>B93: 1 shared definitions and types</summary>

`Ehr.Spec.isHumanOnly`

</details>

<a id="audit-b94"></a>
<details>
<summary>B94: 1 shared definitions and types</summary>

`Ehr.State`

</details>

<a id="audit-b95"></a>
<details>
<summary>B95: 2 shared definitions and types</summary>

`Ehr.UnitKind`, `Ehr.Value`

</details>

<a id="audit-b96"></a>
<details>
<summary>B96: 1 shared definitions and types</summary>

`Ehr.User`

</details>

<a id="audit-b97"></a>
<details>
<summary>B97: 1 shared definitions and types</summary>

`Ehr.Validation.brecOn.go`

</details>

<a id="audit-b98"></a>
<details>
<summary>B98: 1 shared definitions and types</summary>

`Ehr.Verdict`

</details>

<a id="audit-b99"></a>
<details>
<summary>B99: 12 shared definitions and types</summary>

`Ehr.alertKeys`, `Ehr.allergyMatch`, `Ehr.cappedDoseBound`, `Ehr.capturedWeightKg?`, `Ehr.doseOutOfRange`, `Ehr.duplicate`, `Ehr.interacts`, `Ehr.isLbWeight`, `Ehr.keyAt`, `Ehr.primaryClass`, `Ehr.weightElement`, `Ehr.weightKgTenths?`

</details>

<a id="audit-b100"></a>
<details>
<summary>B100: 1 shared definitions and types</summary>

`Ehr.alertsAcked`

</details>

<a id="audit-b101"></a>
<details>
<summary>B101: 1 shared definitions and types</summary>

`Ehr.commitGuard`

</details>

<a id="audit-b102"></a>
<details>
<summary>B102: 1 shared definitions and types</summary>

`Ehr.doseInputUnit?`

</details>

<a id="audit-b103"></a>
<details>
<summary>B103: 8 shared definitions and types</summary>

`Ehr.hasEntry`, `Ehr.linkedSource?`, `Ehr.parseElementValue`, `Ehr.prefillField`, `Ehr.prefillRecord`, `Ehr.prefillScreen`, `Ehr.prefillValueValid`, `Ehr.recordValue`

</details>

<a id="audit-b104"></a>
<details>
<summary>B104: 2 shared definitions and types</summary>

`Ehr.init`, `Ehr.startExpanded`

</details>

<a id="audit-b105"></a>
<details>
<summary>B105: 1 shared definitions and types</summary>

`Ehr.navigatorNames`

</details>

<a id="audit-b106"></a>
<details>
<summary>B106: 1 shared definitions and types</summary>

`Ehr.resolveSlot`

</details>

<a id="audit-b107"></a>
<details>
<summary>B107: 1 shared definitions and types</summary>

`Ehr.runAll`

</details>

<!-- END GENERATED AUDIT -->

## Held-out rule conformance

The held-out [conformance suite](../conformance/) is report-only and covers 200 scenarios, including native in-UI patient selection and A→B isolation. The completed full reruns record 1,575 passes / 0 failures on 15 canonicals and 347 passes / 0 failures on eight archived revisions; non-applicable checks are recorded separately. The five earlier gap families remain at zero failures. It supplements certification and does not alter the acceptance gate. See [conformance results](../conformance/RESULTS.md).
