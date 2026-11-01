# Verification for reviewers

The proofs cover the Lean interpreter that decides screen contents and handles events. The browser runs this code through WebAssembly. They do not prove that the hospital's rules are complete or that care is clinically correct.

**General completion remains open.** Acceptance now proves all thirteen properties for the scalar clinical fragment (`satisfies_of_checked_scalar`): one flat screen, one unrestricted scalar entry (all kinds except medication dose), a pinned allergy review in either mode, and one alert with any condition and tier. The general assembly theorem still assumes property 6. This fragment is not the entire core profile; see the exact remaining lemma in `TODO_PROOFS.md`.

## 1. What is proved: the short review

**U** means a theorem for every input covered by its stated conditions, without checker acceptance. **C** means a universal implication from checker acceptance; `ehr check` runs the check separately for each program. A compiled check on one program is not a new universal proof. All source paths below start at the repository root. The generated audit gives a file and line for every theorem.

The 18 theorems in [`lean/comparator.json`](../lean/comparator.json):

| Theorem (`Ehr.Proofs.`) | Plain meaning | Kind; file:line |
|---|---|---|
| `T0_commit_needs_guard` | Every newly added commit passed its guard in the preceding state. | U; `lean/Ehr/Proofs/T0.lean:151` |
| `commitGuard_iff` | The guard passes exactly when the encounter permits this role, entries and reviews are met, interruptive alerts are acknowledged, and the extra checks pass. | U; `lean/Ehr/Proofs/T0.lean:162` |
| `T0_entry_values` | A commit has a confirmed value for each applicable whole-episode entry, entered by a human when required and in the declared unit. | U; `lean/Ehr/Proofs/T0.lean:348` |
| `T3_cosign_distinct` | An applicable whole-episode cosign names a human-entered second user, different from the signed-in user. | U; `lean/Ehr/Proofs/T0.lean:375` |
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

[`Satisfies`](../lean/Ehr/Props/Properties.lean#L428) means **all** the following. These are definitions; the acceptance theorems prove the listed implications. The semantic clauses range over every patient record and user with the program's role.

| Property | One-sentence meaning | Definition; proof |
|---|---|---|
| 1. `WellFormed` | Components come from the catalog, IDs and references are valid, landmarks stay shown, and required fields are within the navigation bound. | `Properties.lean:88`; C, `accepted_wellFormed` |
| 2. `CapturesAllOnce` | Commits capture required values, ordinary non-entry events retain confirmed values, and auto-linked fields use their declared link. | `Properties.lean:126`; C, `accepted_capturesAllOnce` |
| 3. `WritesOnly` | Declared and reachable captures, commits and new receipts stay within the spec and role permissions. | `Properties.lean:157`; C, `accepted_writesOnly` |
| 4. `ReviewsBeforeCommit` | Commits meet their reviews, and a shown commit button already has its unwaived reviews met. | `Properties.lean:181`; C, `accepted_reviewsBeforeCommit` |
| 5. `HumanOnlyKept` | Human-only entry, signing, acknowledgment and distinct-user cosigning cannot be automated, and the program does not attempt it. | `Properties.lean:236`; C, `accepted_humanOnlyKept` |
| 6. `Completable` | From every reachable state, each required, role-allowed unfinished commit has a human event path to completion, provided the record supplies any needed medication scan. | `Properties.lean:261`; fragment: `Scalar.completable` / `satisfies_of_checked_scalar`; general acceptance proof open |
| 7. `UnitsRight` | Whole-episode quantity requirements use the declared unit, and record quantity prefills use `weightToday`. | `Properties.lean:288`; C, `accepted_units` |
| 8. `WithinBudgets` | Reachable-screen popup requests do not exceed the canonical count, and moved component tags stay within the stability budget. | `Properties.lean:312`; C, `accepted_budgets` |
| 9. A1 `AlertsFire` | Interruptive keys are acknowledged before commit, firing passive alerts are shown on targeted screens, and macros do not target alerts. | `Properties.lean:342`; C, `accepted_alertsFire` |
| 10. A2 `NoFalseAlarms` | Reachable popups and shown alerts have true conditions, and programs cannot request interruptive popups directly. | `Properties.lean:368`; C, `accepted_noFalseAlarms` |
| 11. A3 `NoRepeatInterruptions` | Acknowledgments persist, open popups persist until acknowledged, acknowledged keys do not return, and interruptive requests are not spread across screens. | `Properties.lean:393`; C, `accepted_noRepeatInterruptions` |
| 12. A4 `SeverityTiers` | Passive rules cannot pop up and the program cannot request that they do. | `Properties.lean:412`; C, `accepted_severityTiers` |
| 13. D5 `NavigationSane` | The workflow overview has unique group and within-group labels, at most twelve groups and entries per group, and represents every program screen. | `lean/Ehr/Props/Navigation.lean:9`; C, `accepted_navigation` |

`Properties.lean` above is [`lean/Ehr/Props/Properties.lean`](../lean/Ehr/Props/Properties.lean). “Once” does not prohibit deliberate re-entry; the budget counts requests on reachable screens, not actual interruptions on every path; unit safety is not a proof of clinical dose correctness.

The renderer theorems describe the **semantic screen tree**, before browser drawing:

| Rule | One-sentence meaning | Kind; file:line (`lean/Ehr/Render/`) |
|---|---|---|
| D1 `D1_landmark` | The shell banner includes the supplied name, formatted birth date and medical-record number. | U; `UiProofs.lean:78` |
| D2 `D2_workspace_required` / `D2_required_info` / `D2_commit_review` | Every applicable review for a shown commit button has its full rows in the workspace, including a read-only supplement when needed. | U; `UiProofs.lean:298`, `:327`, `:430` |
| D3 `D3_honest_actions` / `D3_all_buttons` | Buttons have labels and disabled reasons, and primary buttons correspond to shown commits with interpreter enablement, including modal buttons. | U; `UiProofs.lean:383`, `:509` |
| D4 `D4_interruptive_modal` | An open interruptive rule renders a labeled modal with an enabled acknowledgment. | U; `UiProofs.lean:392` |
| D4 `D4_passive_no_modal` / `D4_passive_inline` | A passive popup state makes no modal, while a shown passive alert renders inline. | U; `UiProofs.lean:402`, `:485` |
| D5 | This is the per-program overview check above, not a theorem for every renderer input. | C; `lean/Ehr/Check/NavigationSound.lean:7` |
| D6 `D6_clear_fields` / `D6_field_labels` | Shown fields copy provenance, human-only and pending-confirmation markers, offer pending confirmation, and have nonempty labels. | U; `UiProofs.lean:410`, `:519` |

T4 and checker soundness:

- **`T4_publish_only_if_ok`:** a planned write of the current program or certificate requires checker acceptance (`lean/Ehr/Proofs/CheckDeploy.lean:26`, U).
- **`T4_rejected_not_published`:** a rejected candidate has no planned publishing write (`:41`, U).
- **`T4_published_certificate`:** a planned current certificate describes this spec and program with verdict `ok` (`:51`, U).
- **`satisfies_of_checked_completable`:** acceptance **plus a separate proof of completion** implies all thirteen properties (`lean/Ehr/Check/Sound.lean:16`, C with extra premise).

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

The fresh audit found **only `propext`, `Classical.choice`, `Quot.sound` in all 52 audited theorems**. These support reasoning about equal propositions, choices and quotients. Each theorem's exact output is in the generated appendix. There is no `sorryAx`, native-computation axiom, or extra assumption declared as an axiom in these proofs. Logical premises such as completion remain premises even when this axiom audit is clean.

The challenge files intentionally contain `sorry` placeholders; [`Solution.lean`](../lean/Solution.lean) imports the proved implementations instead. This audit does not import the challenge files. A clean axiom list is not a new Comparator or whole-project `lake check` result; the earlier reported results are in [`docs/STATUS.md:75`](STATUS.md#L75).

## 4. Can the hypotheses actually hold?

“Complete” below means a concrete example supplies all input conditions, or there are no proof conditions. “Partial” means useful examples exist but a single complete instance of that theorem is missing. Examples are usually anonymous, despite CLAUDE.md asking for names.

| Main theorem(s) | Evidence; limit |
|---|---|
| `T0_commit_needs_guard` | Complete: a new commit really occurs, `lean/Ehr/Proofs/T0.lean:403`; the theorem is applied at `:407`. |
| `commitGuard_iff` | No proof conditions; concrete true and false guards at `T0.lean:407`, `:413`, `:414`. |
| `T0_entry_values` | Complete input conditions for a stronger allowed-value result are discharged at `T0.lean:434`; the per-line case is separate at `:426`. |
| `T3_cosign_distinct` | Partial: real second-user commit and high-alert condition at `T0.lean:418`; no single example explicitly supplies all requirement/element lookup premises to this theorem. |
| `T2_receipts_sound` | Partial: hidden-review commit with current receipt at `lean/Ehr/Proofs/T2.lean:87`; the example does not explicitly supply the chosen review's membership and commit-equality premises. |
| `T2_shownOnCommit_shown` | Partial: review membership at `T2.lean:102` and committing state at `T0.lean:403`; no combined application discharges every premise. |
| `T3_macro_step`, `T3_prefill_never_human_only` | No proof conditions; executable Tiny states/programs in `lean/Ehr/Examples/TinyTests.lean`. |
| `T3_macro_run`, `T6_macro_run_safe` | Complete shared conditions: button resolves to a macro and no popup is open, `lean/Ehr/Proofs/Audit.lean:98`; the run changes the screen and captures at `:103`. |
| `T6_macro_is_fold`, `runMacro_ok_iff` | No proof conditions; stopping and successful concrete expansions at `lean/Ehr/Proofs/T6.lean:147`, `:154`. |
| `A2_view_firing` | Complete firing-item existence at `lean/Ehr/Proofs/Alerts.lean:353`. |
| `A2_view_shown` | Partial: the same example shows a firing, shown item, but does not explicitly identify its alert kind and discharge that premise. |
| `A2_popup_holds` | Complete new-popup conditions at `Alerts.lean:358`. |
| `A4_step` | Missing a concrete example explicitly discharging `PopupNotPassive` before applying this step theorem. |
| `A4_run` | No proof conditions; a concrete Tiny spec is used by the passive-rule run example at `Alerts.lean:374`. |
| `A4_passive_never_popup` | Complete lookup/tier conditions and theorem application at `Alerts.lean:370`, `:374`. |
| All twelve `accepted_*` theorems | Complete on a nonempty clinical program: `scalar_identity_satisfies` discharges acceptance by `decide` and proves all thirteen properties; `scalar_identity_required` proves the required commit list is nonempty for every physician and record. |
| `satisfies_of_checked_completable` | Complete: `scalar_identity_satisfies` supplies acceptance and the all-records/all-reachable-states proof `Scalar.completable`, with a human-only identity entry, shown allergy review, and interruptive allergy alert. |
| D1 | No proof conditions; concrete banner example at `lean/Ehr/Render/UiTests.lean:28`. |
| D2 workspace / required-info / commit-review | Complete examples at `UiTests.lean:254`, `:109`, `:32`, respectively. |
| D3 honest-actions / all-buttons | Partial: `UiTests.lean:38` specializes the context but still quantifies over nodes and their presence; no single concrete button example supplies all premises. |
| D4 modal / no-modal / inline | Complete examples at `UiTests.lean:44`, `:53`, `:120`, respectively. |
| D6 clear-fields | Complete application at `UiTests.lean:60`, including a genuinely pending confirmation at `:65`. |
| D6 field-labels | Partial: nonempty fallback-label example at `UiTests.lean:73`; no direct concrete field-presence application of `D6_field_labels`. |
| T4 publish / reject / certificate | Partial: a publishing plan and a nonpublishing plan at `lean/Ehr/Proofs/CheckDeploy.lean:66`, `:71`; no explicit per-write theorem applications, particularly the `currentCert` premise. |

The property examples at [`lean/Ehr/Props/Examples.lean:65`](../lean/Ehr/Props/Examples.lean#L65) cover clauses, not a clinical all-thirteen proof. In particular, its signing path at `:130` proves one successful continuation, not completion from every reachable state. For property 13, [`lean/Ehr/Check/Tests.lean:37`](../lean/Ehr/Check/Tests.lean#L37) directly applies `accepted_navigation` to the good Tiny program.

## 5. Does the spec reject bad behaviour?

**Fresh kernel proofs:** `tiny_bad_catalog`, `tiny_bad_role`, `tiny_bad_automation` prove `¬ Satisfies` for properties 1, 3 and 5 ([`lean/Ehr/Check/TinyRejections.lean:8`](../lean/Ehr/Check/TinyRejections.lean#L8), `:16`, `:21`). The audit imports and audits these. Smaller negative examples also reject hidden/stale reviews, pounds, a macro entering patient ID, and a passive popup (`T0.lean:413`, `T2.lean:96`, `Proofs/Audit.lean:109`, `:116`, `Proofs/Alerts.lean:381`, `Props/Examples.lean:171`).

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

The role must now pass both its ordinary permission and any encounter-specific restriction (`lean/Ehr/Core/Guard.lean:153`). An NP can prescribe in clinic but cannot sign pre-op orders. The three pre-op entries and who may enter them did not change. Completion and depth now exclude only forbidden role/encounter cases (`Props/Basics.lean:103`, `Core/Guard.lean:164`). [`np_preop_never_signs`](../lean/Ehr/Check/DomainObstruction.lean) proves refusal for every program/state/event; named P4/P5 walks are in `Check/EncounterRoleTests.lean:18`, `:23`, `:42`.

Two other scope decisions matter: the temporary core profile removes most catalog content (above), and D2 now requires full review rows in the workspace even when a compact sidebar is present (`Render/UiProofs.lean:298`). D5's current overview check must not be described as a proof about interactive navigation. Signing roles, dose units and navigation are active lanes: regenerate the appendix after merging them, then re-review these plain-language claims.

## 8. Gaps against CLAUDE.md §§4 and 7

- [x] **T1 fragment and nonempty witness:** `Scalar.completable`, `satisfies_of_checked_scalar`, `scalar_identity_satisfies`, `scalar_identity_required`. The fragment covers scalar kinds except medication doses, both review modes, every alert condition and tier. `human_finish_ready` proves finite alert discharge for the real interpreter.
- [ ] **General T1:** arbitrary accepted navigation/reveal, multiple compatible entry requirements, per-line/archived-line repair, and encounter/waiver routes. The precise `accepted_completable` lemma is recorded in `TODO_PROOFS.md`; no completion assumption or checker rule was weakened.
- [ ] **Complete the hypothesis examples:** the partial/missing rows in section 4 need complete concrete applications, especially cosign, receipt/shown-review, A4 step, D3, D6 labels and T4 certificate (`Proofs/T0.lean:418`, `T2.lean:87`, `Alerts.lean:304`, `Render/UiTests.lean:38`, `:73`, `Proofs/CheckDeploy.lean:66`).
- [ ] **Name examples:** most are anonymous (`Props/Examples.lean:65`, `Proofs/T0.lean:403`, `Render/UiTests.lean:28`); many demonstrate a clause rather than the entire property.
- [ ] **Restore current bad-output proofs:** repair parked witnesses, prove the current CURES mutation and intended Schedule II completion failure, and add full-profile negative proofs for feature seeds (`EhrHeavy.lean:1`, `Check/AdditionalBadProofs.lean:29`, `Canonical/BadPrograms.lean:110`, `:154`).
- [ ] **Align D5 with the clickable tree:** `Props/Navigation.lean:6` and `Check/NavigationSound.lean:6` say actual navigation, but `Render/NavRules.lean:12` checks `uiOverviewNav`; its own docstring records the open integration.
- [ ] **Add the Lean ARIA projection and design proofs:** current semantic rules end at `renderUi` (`Render/Ui.lean:312`), not the browser accessibility tree; see the last section of `TODO_PROOFS.md`.
- [ ] **Review docstrings:** the role comment in `Statements.lean:35` omits encounter restrictions and `extraGuard`; unit/property comments can sound broader than their clauses (`Props/Properties.lean:286`). Some public helpers lack their own docstring (`Render/UiContracts.lean:15`, `Check/Sound.lean:44`, `Render/UiTests.lean:9`). Draft owner-review notices remain (`Props/Defs.lean:4`, `Statements.lean:5`).
- [x] **Opaque contracts:** no project `opaque` or `axiom` declarations were found in `lean/Ehr/**`; there is no bodyless project contract to list. External I/O/toolchains remain trusted, not secretly proved by this result.
- [x] **Audit the main proof axioms:** the generated results contain only the three allowed axioms. This does not validate parked proofs or replace a final Comparator / `lake check` run after lane merges.
- [ ] **Review surface size:** the generated counts are large for event/check/deploy statements because they include the real interpreter, rule code and JSON definitions; these need human review, not a claim that a clean proof makes the definitions right.

No proofs or owner-owned specifications were changed for this review.

## Generated evidence

The following block is replaced by the script. The commit and content hash identify the audited source snapshot. Regeneration updates listings and locations, not the human review above. Run after other Lean builds have stopped; do not run another Lean process in this checkout alongside it.

<!-- BEGIN GENERATED AUDIT -->

Generated at `6519b3798acf7b81f0451a538d28ad97af8c9129`. Source SHA-256: `f427d821a4c6faa6cb28455860985a8c2c2ea7be434fae651c462b10302bd8a6`.

52 theorems audited; 54 statement surfaces; 36 distinct lists; 583 distinct definitions/types overall; 2–469 per statement. 72 project modules compiled or reused, one Lean process at a time. The two extra surfaces are property definitions, not proved theorems.

Counts include named project definitions and types. Compiler helpers, instances, constructors and projections are omitted from the display after traversal. Library definitions are traversed but not listed. Proof bodies are followed only for the axiom column. `P` = propext; `C` = Classical.choice; `Q` = Quot.sound; `none` = no axioms. Each S-list below gives its complete list as shared B-groups; each definition is printed once. No names are removed by this grouping.

| Declaration | Source | Surface / count | Axioms |
|---|---|---|---|
| `Ehr.Proofs.T0_commit_needs_guard` | [lean/Ehr/Proofs/T0.lean:151](../lean/Ehr/Proofs/T0.lean#L151) | S1 / 265 | C, Q, P |
| `Ehr.Proofs.commitGuard_iff` | [lean/Ehr/Proofs/T0.lean:162](../lean/Ehr/Proofs/T0.lean#L162) | S2 / 206 | C, Q, P |
| `Ehr.Proofs.T0_entry_values` | [lean/Ehr/Proofs/T0.lean:363](../lean/Ehr/Proofs/T0.lean#L363) | S3 / 264 | C, Q, P |
| `Ehr.Proofs.T3_cosign_distinct` | [lean/Ehr/Proofs/T0.lean:391](../lean/Ehr/Proofs/T0.lean#L391) | S3 / 264 | C, Q, P |
| `Ehr.Proofs.T2_receipts_sound` | [lean/Ehr/Proofs/T2.lean:52](../lean/Ehr/Proofs/T2.lean#L52) | S4 / 266 | C, Q, P |
| `Ehr.Proofs.T2_shownOnCommit_shown` | [lean/Ehr/Proofs/T2.lean:66](../lean/Ehr/Proofs/T2.lean#L66) | S3 / 264 | C, Q, P |
| `Ehr.Proofs.T3_macro_step` | [lean/Ehr/Proofs/T3.lean:159](../lean/Ehr/Proofs/T3.lean#L159) | S5 / 265 | C, Q, P |
| `Ehr.Proofs.T3_macro_run` | [lean/Ehr/Proofs/T3.lean:171](../lean/Ehr/Proofs/T3.lean#L171) | S5 / 265 | C, Q, P |
| `Ehr.Proofs.T3_prefill_never_human_only` | [lean/Ehr/Proofs/T3.lean:184](../lean/Ehr/Proofs/T3.lean#L184) | S6 / 70 | C, Q, P |
| `Ehr.Proofs.T6_macro_is_fold` | [lean/Ehr/Proofs/T6.lean:42](../lean/Ehr/Proofs/T6.lean#L42) | S7 / 266 | C, Q, P |
| `Ehr.Proofs.runMacro_ok_iff` | [lean/Ehr/Proofs/T6.lean:73](../lean/Ehr/Proofs/T6.lean#L73) | S7 / 266 | C, Q, P |
| `Ehr.Proofs.T6_macro_run_safe` | [lean/Ehr/Proofs/T6.lean:126](../lean/Ehr/Proofs/T6.lean#L126) | S5 / 265 | C, Q, P |
| `Ehr.Proofs.A2_view_firing` | [lean/Ehr/Proofs/Alerts.lean:27](../lean/Ehr/Proofs/Alerts.lean#L27) | S8 / 240 | C, Q, P |
| `Ehr.Proofs.A2_view_shown` | [lean/Ehr/Proofs/Alerts.lean:40](../lean/Ehr/Proofs/Alerts.lean#L40) | S8 / 240 | C, Q, P |
| `Ehr.Proofs.A2_popup_holds` | [lean/Ehr/Proofs/Alerts.lean:281](../lean/Ehr/Proofs/Alerts.lean#L281) | S3 / 264 | C, Q, P |
| `Ehr.Proofs.A4_step` | [lean/Ehr/Proofs/Alerts.lean:304](../lean/Ehr/Proofs/Alerts.lean#L304) | S9 / 265 | C, Q, P |
| `Ehr.Proofs.A4_run` | [lean/Ehr/Proofs/Alerts.lean:319](../lean/Ehr/Proofs/Alerts.lean#L319) | S10 / 268 | C, Q, P |
| `Ehr.Proofs.A4_passive_never_popup` | [lean/Ehr/Proofs/Alerts.lean:337](../lean/Ehr/Proofs/Alerts.lean#L337) | S11 / 267 | C, Q, P |
| `Ehr.Check.accepted_wellFormed` | [lean/Ehr/Check/PartialSound.lean:39](../lean/Ehr/Check/PartialSound.lean#L39) | S12 / 409 | C, Q, P |
| `Ehr.Check.accepted_capturesAllOnce` | [lean/Ehr/Check/EnterOnceSound.lean:120](../lean/Ehr/Check/EnterOnceSound.lean#L120) | S13 / 397 | C, Q, P |
| `Ehr.Check.accepted_writesOnly` | [lean/Ehr/Check/WritesSound.lean:270](../lean/Ehr/Check/WritesSound.lean#L270) | S14 / 389 | C, Q, P |
| `Ehr.Check.accepted_reviewsBeforeCommit` | [lean/Ehr/Check/PartialSound.lean:49](../lean/Ehr/Check/PartialSound.lean#L49) | S15 / 414 | C, Q, P |
| `Ehr.Check.accepted_humanOnlyKept` | [lean/Ehr/Check/HumanEventsSound.lean:167](../lean/Ehr/Check/HumanEventsSound.lean#L167) | S16 / 395 | C, Q, P |
| `Ehr.Check.accepted_units` | [lean/Ehr/Check/PartialSound.lean:58](../lean/Ehr/Check/PartialSound.lean#L58) | S17 / 392 | C, Q, P |
| `Ehr.Check.accepted_budgets` | [lean/Ehr/Check/BudgetSound.lean:48](../lean/Ehr/Check/BudgetSound.lean#L48) | S18 / 388 | C, Q, P |
| `Ehr.Check.accepted_alertsFire` | [lean/Ehr/Check/PartialSound.lean:64](../lean/Ehr/Check/PartialSound.lean#L64) | S19 / 409 | C, Q, P |
| `Ehr.Check.accepted_noFalseAlarms` | [lean/Ehr/Check/AlertSound.lean:169](../lean/Ehr/Check/AlertSound.lean#L169) | S20 / 405 | C, Q, P |
| `Ehr.Check.accepted_noRepeatInterruptions` | [lean/Ehr/Check/AlertSound.lean:175](../lean/Ehr/Check/AlertSound.lean#L175) | S21 / 392 | C, Q, P |
| `Ehr.Check.accepted_severityTiers` | [lean/Ehr/Check/SeveritySound.lean:29](../lean/Ehr/Check/SeveritySound.lean#L29) | S22 / 389 | C, Q, P |
| `Ehr.Check.accepted_navigation` | [lean/Ehr/Check/NavigationSound.lean:7](../lean/Ehr/Check/NavigationSound.lean#L7) | S23 / 384 | C, Q, P |
| `Ehr.Check.satisfies_of_checked_completable` | [lean/Ehr/Check/Sound.lean:17](../lean/Ehr/Check/Sound.lean#L17) | S24 / 458 | C, Q, P |
| `Ehr.Render.D1_landmark` | [lean/Ehr/Render/UiProofs.lean:78](../lean/Ehr/Render/UiProofs.lean#L78) | S25 / 321 | C, Q, P |
| `Ehr.Render.D2_workspace_required` | [lean/Ehr/Render/UiProofs.lean:301](../lean/Ehr/Render/UiProofs.lean#L301) | S26 / 323 | C, Q, P |
| `Ehr.Render.D2_required_info` | [lean/Ehr/Render/UiProofs.lean:330](../lean/Ehr/Render/UiProofs.lean#L330) | S27 / 325 | C, Q, P |
| `Ehr.Render.D2_commit_review` | [lean/Ehr/Render/UiProofs.lean:433](../lean/Ehr/Render/UiProofs.lean#L433) | S27 / 325 | C, Q, P |
| `Ehr.Render.D3_honest_actions` | [lean/Ehr/Render/UiProofs.lean:386](../lean/Ehr/Render/UiProofs.lean#L386) | S28 / 326 | C, Q, P |
| `Ehr.Render.D3_all_buttons` | [lean/Ehr/Render/UiProofs.lean:512](../lean/Ehr/Render/UiProofs.lean#L512) | S28 / 326 | C, Q, P |
| `Ehr.Render.D4_interruptive_modal` | [lean/Ehr/Render/UiProofs.lean:395](../lean/Ehr/Render/UiProofs.lean#L395) | S25 / 321 | C, Q, P |
| `Ehr.Render.D4_passive_no_modal` | [lean/Ehr/Render/UiProofs.lean:405](../lean/Ehr/Render/UiProofs.lean#L405) | S25 / 321 | C, Q, P |
| `Ehr.Render.D4_passive_inline` | [lean/Ehr/Render/UiProofs.lean:488](../lean/Ehr/Render/UiProofs.lean#L488) | S27 / 325 | C, Q, P |
| `Ehr.Render.D6_clear_fields` | [lean/Ehr/Render/UiProofs.lean:413](../lean/Ehr/Render/UiProofs.lean#L413) | S27 / 325 | C, Q, P |
| `Ehr.Render.D6_field_labels` | [lean/Ehr/Render/UiProofs.lean:522](../lean/Ehr/Render/UiProofs.lean#L522) | S27 / 325 | C, Q, P |
| `Ehr.Proofs.T4_publish_only_if_ok` | [lean/Ehr/Proofs/CheckDeploy.lean:26](../lean/Ehr/Proofs/CheckDeploy.lean#L26) | S29 / 397 | C, Q, P |
| `Ehr.Proofs.T4_rejected_not_published` | [lean/Ehr/Proofs/CheckDeploy.lean:41](../lean/Ehr/Proofs/CheckDeploy.lean#L41) | S29 / 397 | C, Q, P |
| `Ehr.Proofs.T4_published_certificate` | [lean/Ehr/Proofs/CheckDeploy.lean:51](../lean/Ehr/Proofs/CheckDeploy.lean#L51) | S30 / 396 | C, Q, P |
| `Ehr.Check.tiny_bad_catalog` | [lean/Ehr/Check/TinyRejections.lean:8](../lean/Ehr/Check/TinyRejections.lean#L8) | S31 / 397 | C, Q, P |
| `Ehr.Check.tiny_bad_role` | [lean/Ehr/Check/TinyRejections.lean:16](../lean/Ehr/Check/TinyRejections.lean#L16) | S31 / 397 | C, Q, P |
| `Ehr.Check.tiny_bad_automation` | [lean/Ehr/Check/TinyRejections.lean:21](../lean/Ehr/Check/TinyRejections.lean#L21) | S31 / 397 | C, Q, P |
| `Ehr.Props.Completable` | [lean/Ehr/Props/Properties.lean:261](../lean/Ehr/Props/Properties.lean#L261) | S32 / 2 | definition |
| `Ehr.Props.Satisfies` | [lean/Ehr/Props/Properties.lean:428](../lean/Ehr/Props/Properties.lean#L428) | S32 / 2 | definition |
| `Ehr.Check.human_finish_ready` | [lean/Ehr/Check/Completion.lean:52](../lean/Ehr/Check/Completion.lean#L52) | S33 / 265 | C, Q, P |
| `Ehr.Check.Scalar.completable` | [lean/Ehr/Check/ScalarCompletion.lean:71](../lean/Ehr/Check/ScalarCompletion.lean#L71) | S34 / 288 | C, Q, P |
| `Ehr.Check.satisfies_of_checked_scalar` | [lean/Ehr/Check/Sound.lean:35](../lean/Ehr/Check/Sound.lean#L35) | S35 / 469 | C, Q, P |
| `Ehr.Check.scalar_identity_satisfies` | [lean/Ehr/Check/Sound.lean:45](../lean/Ehr/Check/Sound.lean#L45) | S36 / 394 | C, Q, P |

**S1 (265):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B13](#audit-b13), [B14](#audit-b14), [B15](#audit-b15), [B48](#audit-b48), [B49](#audit-b49), [B50](#audit-b50), [B51](#audit-b51)

**S2 (206):** [B1](#audit-b1), [B3](#audit-b3), [B15](#audit-b15), [B48](#audit-b48), [B49](#audit-b49)

**S3 (264):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B13](#audit-b13), [B14](#audit-b14), [B15](#audit-b15), [B48](#audit-b48), [B50](#audit-b50), [B51](#audit-b51)

**S4 (266):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B13](#audit-b13), [B14](#audit-b14), [B15](#audit-b15), [B33](#audit-b33), [B48](#audit-b48), [B50](#audit-b50), [B51](#audit-b51)

**S5 (265):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B13](#audit-b13), [B14](#audit-b14), [B15](#audit-b15), [B47](#audit-b47), [B48](#audit-b48), [B50](#audit-b50), [B51](#audit-b51)

**S6 (70):** [B1](#audit-b1), [B14](#audit-b14), [B15](#audit-b15), [B47](#audit-b47), [B50](#audit-b50), [B51](#audit-b51)

**S7 (266):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B13](#audit-b13), [B14](#audit-b14), [B15](#audit-b15), [B40](#audit-b40), [B48](#audit-b48), [B50](#audit-b50), [B51](#audit-b51)

**S8 (240):** [B1](#audit-b1), [B3](#audit-b3), [B12](#audit-b12), [B13](#audit-b13), [B14](#audit-b14), [B15](#audit-b15), [B47](#audit-b47)

**S9 (265):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B13](#audit-b13), [B14](#audit-b14), [B15](#audit-b15), [B37](#audit-b37), [B48](#audit-b48), [B50](#audit-b50), [B51](#audit-b51)

**S10 (268):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B13](#audit-b13), [B14](#audit-b14), [B15](#audit-b15), [B37](#audit-b37), [B48](#audit-b48), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52), [B53](#audit-b53)

**S11 (267):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B13](#audit-b13), [B14](#audit-b14), [B15](#audit-b15), [B48](#audit-b48), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52), [B53](#audit-b53)

**S12 (409):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B4](#audit-b4), [B6](#audit-b6), [B10](#audit-b10), [B12](#audit-b12), [B13](#audit-b13), [B14](#audit-b14), [B15](#audit-b15), [B21](#audit-b21), [B23](#audit-b23), [B29](#audit-b29), [B31](#audit-b31), [B32](#audit-b32), [B34](#audit-b34), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52)

**S13 (397):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B4](#audit-b4), [B6](#audit-b6), [B10](#audit-b10), [B13](#audit-b13), [B14](#audit-b14), [B15](#audit-b15), [B20](#audit-b20), [B22](#audit-b22), [B25](#audit-b25), [B29](#audit-b29), [B30](#audit-b30), [B46](#audit-b46), [B48](#audit-b48), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52)

**S14 (389):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B4](#audit-b4), [B6](#audit-b6), [B10](#audit-b10), [B13](#audit-b13), [B14](#audit-b14), [B15](#audit-b15), [B21](#audit-b21), [B29](#audit-b29), [B39](#audit-b39), [B46](#audit-b46), [B48](#audit-b48), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52)

**S15 (414):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B4](#audit-b4), [B6](#audit-b6), [B10](#audit-b10), [B12](#audit-b12), [B13](#audit-b13), [B14](#audit-b14), [B15](#audit-b15), [B21](#audit-b21), [B22](#audit-b22), [B24](#audit-b24), [B25](#audit-b25), [B29](#audit-b29), [B30](#audit-b30), [B31](#audit-b31), [B34](#audit-b34), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52)

**S16 (395):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B4](#audit-b4), [B6](#audit-b6), [B10](#audit-b10), [B13](#audit-b13), [B14](#audit-b14), [B15](#audit-b15), [B22](#audit-b22), [B25](#audit-b25), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B46](#audit-b46), [B48](#audit-b48), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52)

**S17 (392):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B4](#audit-b4), [B6](#audit-b6), [B10](#audit-b10), [B13](#audit-b13), [B14](#audit-b14), [B15](#audit-b15), [B22](#audit-b22), [B25](#audit-b25), [B26](#audit-b26), [B29](#audit-b29), [B30](#audit-b30), [B46](#audit-b46), [B48](#audit-b48), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52)

**S18 (388):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B4](#audit-b4), [B6](#audit-b6), [B10](#audit-b10), [B13](#audit-b13), [B14](#audit-b14), [B15](#audit-b15), [B16](#audit-b16), [B32](#audit-b32), [B46](#audit-b46), [B48](#audit-b48), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52)

**S19 (409):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B4](#audit-b4), [B6](#audit-b6), [B10](#audit-b10), [B12](#audit-b12), [B13](#audit-b13), [B14](#audit-b14), [B15](#audit-b15), [B17](#audit-b17), [B18](#audit-b18), [B21](#audit-b21), [B25](#audit-b25), [B29](#audit-b29), [B30](#audit-b30), [B31](#audit-b31), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52)

**S20 (405):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B4](#audit-b4), [B6](#audit-b6), [B10](#audit-b10), [B12](#audit-b12), [B13](#audit-b13), [B14](#audit-b14), [B15](#audit-b15), [B17](#audit-b17), [B19](#audit-b19), [B21](#audit-b21), [B29](#audit-b29), [B31](#audit-b31), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52)

**S21 (392):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B4](#audit-b4), [B6](#audit-b6), [B10](#audit-b10), [B13](#audit-b13), [B14](#audit-b14), [B15](#audit-b15), [B21](#audit-b21), [B29](#audit-b29), [B30](#audit-b30), [B35](#audit-b35), [B46](#audit-b46), [B48](#audit-b48), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52)

**S22 (389):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B4](#audit-b4), [B6](#audit-b6), [B10](#audit-b10), [B13](#audit-b13), [B14](#audit-b14), [B15](#audit-b15), [B21](#audit-b21), [B29](#audit-b29), [B36](#audit-b36), [B46](#audit-b46), [B48](#audit-b48), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52)

**S23 (384):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B4](#audit-b4), [B6](#audit-b6), [B10](#audit-b10), [B13](#audit-b13), [B14](#audit-b14), [B15](#audit-b15), [B46](#audit-b46), [B48](#audit-b48), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52)

**S24 (458):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B4](#audit-b4), [B6](#audit-b6), [B10](#audit-b10), [B12](#audit-b12), [B13](#audit-b13), [B14](#audit-b14), [B15](#audit-b15), [B16](#audit-b16), [B17](#audit-b17), [B18](#audit-b18), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B31](#audit-b31), [B32](#audit-b32), [B34](#audit-b34), [B35](#audit-b35), [B36](#audit-b36), [B38](#audit-b38), [B39](#audit-b39), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52), [B53](#audit-b53)

**S25 (321):** [B1](#audit-b1), [B3](#audit-b3), [B12](#audit-b12), [B13](#audit-b13), [B14](#audit-b14), [B15](#audit-b15), [B41](#audit-b41), [B46](#audit-b46), [B47](#audit-b47), [B50](#audit-b50)

**S26 (323):** [B1](#audit-b1), [B3](#audit-b3), [B12](#audit-b12), [B13](#audit-b13), [B14](#audit-b14), [B15](#audit-b15), [B41](#audit-b41), [B44](#audit-b44), [B45](#audit-b45), [B46](#audit-b46), [B47](#audit-b47), [B50](#audit-b50)

**S27 (325):** [B1](#audit-b1), [B3](#audit-b3), [B12](#audit-b12), [B13](#audit-b13), [B14](#audit-b14), [B15](#audit-b15), [B41](#audit-b41), [B43](#audit-b43), [B45](#audit-b45), [B46](#audit-b46), [B47](#audit-b47), [B50](#audit-b50)

**S28 (326):** [B1](#audit-b1), [B3](#audit-b3), [B12](#audit-b12), [B13](#audit-b13), [B14](#audit-b14), [B15](#audit-b15), [B41](#audit-b41), [B42](#audit-b42), [B43](#audit-b43), [B45](#audit-b45), [B46](#audit-b46), [B47](#audit-b47), [B50](#audit-b50)

**S29 (397):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B4](#audit-b4), [B5](#audit-b5), [B6](#audit-b6), [B8](#audit-b8), [B9](#audit-b9), [B10](#audit-b10), [B13](#audit-b13), [B14](#audit-b14), [B15](#audit-b15), [B46](#audit-b46), [B48](#audit-b48), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52)

**S30 (396):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B4](#audit-b4), [B5](#audit-b5), [B6](#audit-b6), [B9](#audit-b9), [B10](#audit-b10), [B13](#audit-b13), [B14](#audit-b14), [B15](#audit-b15), [B46](#audit-b46), [B48](#audit-b48), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52)

**S31 (397):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B4](#audit-b4), [B9](#audit-b9), [B10](#audit-b10), [B11](#audit-b11), [B12](#audit-b12), [B13](#audit-b13), [B14](#audit-b14), [B15](#audit-b15), [B16](#audit-b16), [B17](#audit-b17), [B18](#audit-b18), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B31](#audit-b31), [B32](#audit-b32), [B34](#audit-b34), [B35](#audit-b35), [B36](#audit-b36), [B38](#audit-b38), [B39](#audit-b39), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52), [B53](#audit-b53)

**S32 (2):** [B15](#audit-b15)

**S33 (265):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B13](#audit-b13), [B14](#audit-b14), [B15](#audit-b15), [B48](#audit-b48), [B50](#audit-b50), [B51](#audit-b51), [B53](#audit-b53)

**S34 (288):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B7](#audit-b7), [B9](#audit-b9), [B10](#audit-b10), [B13](#audit-b13), [B14](#audit-b14), [B15](#audit-b15), [B21](#audit-b21), [B27](#audit-b27), [B29](#audit-b29), [B48](#audit-b48), [B50](#audit-b50), [B51](#audit-b51), [B53](#audit-b53)

**S35 (469):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B4](#audit-b4), [B6](#audit-b6), [B7](#audit-b7), [B9](#audit-b9), [B10](#audit-b10), [B12](#audit-b12), [B13](#audit-b13), [B14](#audit-b14), [B15](#audit-b15), [B16](#audit-b16), [B17](#audit-b17), [B18](#audit-b18), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B31](#audit-b31), [B32](#audit-b32), [B34](#audit-b34), [B35](#audit-b35), [B36](#audit-b36), [B38](#audit-b38), [B39](#audit-b39), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52), [B53](#audit-b53)

**S36 (394):** [B1](#audit-b1), [B2](#audit-b2), [B3](#audit-b3), [B4](#audit-b4), [B7](#audit-b7), [B9](#audit-b9), [B10](#audit-b10), [B12](#audit-b12), [B13](#audit-b13), [B14](#audit-b14), [B15](#audit-b15), [B16](#audit-b16), [B17](#audit-b17), [B18](#audit-b18), [B19](#audit-b19), [B20](#audit-b20), [B21](#audit-b21), [B22](#audit-b22), [B23](#audit-b23), [B24](#audit-b24), [B25](#audit-b25), [B26](#audit-b26), [B27](#audit-b27), [B28](#audit-b28), [B29](#audit-b29), [B30](#audit-b30), [B31](#audit-b31), [B32](#audit-b32), [B34](#audit-b34), [B35](#audit-b35), [B36](#audit-b36), [B38](#audit-b38), [B39](#audit-b39), [B46](#audit-b46), [B47](#audit-b47), [B48](#audit-b48), [B50](#audit-b50), [B51](#audit-b51), [B52](#audit-b52), [B53](#audit-b53)

<a id="audit-b1"></a>
<details>
<summary>B1: 56 shared definitions and types</summary>

`Ehr.Action`, `Ehr.AlertId`, `Ehr.Captured`, `Ehr.CodeTable`, `Ehr.CommitId`, `Ehr.CompId`, `Ehr.Component`, `Ehr.DoseUnitRule`, `Ehr.DrugInfo`, `Ehr.ElementId`, `Ehr.ElementSpec`, `Ehr.Facts`, `Ehr.InfoId`, `Ehr.Kind`, `Ehr.MacroId`, `Ehr.Prefill`, `Ehr.Program.compsOf`, `Ehr.Program.screen?`, `Ehr.Receipt`, `Ehr.Screen`, `Ehr.ScreenId`, `Ehr.Slot`, `Ehr.Spec.element?`, `Ehr.State`, `Ehr.UnitKind`, `Ehr.UnitKind.name`, `Ehr.UserId`, `Ehr.Validation`, `Ehr.Validation.brecOn.go`, `Ehr.Value`, `Ehr.ValueKind`, `Ehr.decimalValid`, `Ehr.digitVal`, `Ehr.digitsVal`, `Ehr.doseDrug?`, `Ehr.doseUnitValueValid`, `Ehr.doseUnitsAt`, `Ehr.doseValueValid`, `Ehr.drugDoseUnits`, `Ehr.drugElement`, `Ehr.elementValueValid`, `Ehr.formulary`, `Ehr.freqPerDay`, `Ehr.gtinValid`, `Ehr.isoDateValid`, `Ehr.leapYear`, `Ehr.lexicalValue`, `Ehr.lookupDrug`, `Ehr.needsHuman`, `Ehr.parseTenths`, `Ehr.parseTenthsChars`, `Ehr.parseValue`, `Ehr.udiValid`, `Ehr.validDate`, `Ehr.validationCapture`, `Ehr.validationHolds`

</details>

<a id="audit-b2"></a>
<details>
<summary>B2: 27 shared definitions and types</summary>

`Ehr.Actor`, `Ehr.Event`, `Ehr.Event.isAck`, `Ehr.MacroStep`, `Ehr.ackCore`, `Ehr.clickCommit`, `Ehr.clickCore`, `Ehr.clickedMacro?`, `Ehr.confirmCore`, `Ehr.enterCore`, `Ehr.goBack`, `Ehr.goTo`, `Ehr.macroStep`, `Ehr.macroStopReason`, `Ehr.macroValue`, `Ehr.markReviewed`, `Ehr.rejectReason`, `Ehr.requestPriorAuth`, `Ehr.runMacro`, `Ehr.searchShown`, `Ehr.selectTabCore`, `Ehr.setCaptured`, `Ehr.shownComp?`, `Ehr.step`, `Ehr.stepCore`, `Ehr.stepEvent`, `Ehr.toggle`

</details>

<a id="audit-b3"></a>
<details>
<summary>B3: 146 shared definitions and types</summary>

`Ehr.AlertCond`, `Ehr.AlertSpec`, `Ehr.ArtifactBinding`, `Ehr.BusinessCalendar`, `Ehr.ClinicalAge`, `Ehr.ClinicalFacts`, `Ehr.ClinicalFacts.field`, `Ehr.ClinicalField`, `Ehr.ClinicalObservation`, `Ehr.ClinicalPredicate`, `Ehr.ClinicalPredicate.brecOn.go`, `Ehr.ClockAnchor`, `Ehr.ClockRenewal`, `Ehr.ClockStamp`, `Ehr.CommitSpec`, `Ehr.DisplayReq`, `Ehr.DisplayScope`, `Ehr.EncounterRoleRule`, `Ehr.EntryReq`, `Ehr.EventEvidence`, `Ehr.EventId`, `Ehr.EventRef`, `Ehr.ExpiryDuration`, `Ehr.ExpiryReq`, `Ehr.IdentifierCategory`, `Ehr.InfoPayload`, `Ehr.InfoSpec`, `Ehr.Kind.ctorElimType`, `Ehr.MonthCutoff`, `Ehr.ObligationStatus`, `Ehr.OrderClock`, `Ehr.OrderClock.anchorStamp`, `Ehr.OrderInstanceId`, `Ehr.PatientIdentity`, `Ehr.PayloadContract`, `Ehr.PayloadFieldReq`, `Ehr.PayloadIdentifier`, `Ehr.PayloadRow`, `Ehr.RenewalPolicy`, `Ehr.ReviewMode`, `Ehr.ReviewReq`, `Ehr.Role`, `Ehr.Size`, `Ehr.Spec.commit?`, `Ehr.Spec.info?`, `Ehr.State.tabOf`, `Ehr.TemporalDirection`, `Ehr.TemporalReq`, `Ehr.Tier`, `Ehr.TimeMetric`, `Ehr.User`, `Ehr.Value.nonEmpty`, `Ehr.Visibility`, `Ehr.When`, `Ehr.WorkflowPhase`, `Ehr.actionLabelOk`, `Ehr.alertKeys`, `Ehr.allergyMatch`, `Ehr.bannerInfo`, `Ehr.businessLocalDay`, `Ehr.cappedDoseBound`, `Ehr.capturedSatisfies`, `Ehr.capturedWeightKg?`, `Ehr.clinicalApplies`, `Ehr.clinicalCode`, `Ehr.clinicalEval`, `Ehr.clinicalSourceValid`, `Ehr.commitRoleOk`, `Ehr.defaultsOk`, `Ehr.displayActive`, `Ehr.displayReqMet`, `Ehr.displayScopeActive`, `Ehr.displayShown`, `Ehr.displaysOk`, `Ehr.doseElement`, `Ehr.doseOutOfRange`, `Ehr.drugClasses`, `Ehr.drugsInPlay`, `Ehr.duplicate`, `Ehr.encounterMatches`, `Ehr.encounterRolesOk`, `Ehr.encounterRouteAvailable`, `Ehr.entriesOk`, `Ehr.entryDirectMet`, `Ehr.entryMet`, `Ehr.entryValueAllowed`, `Ehr.entryWaiver`, `Ehr.epochNow`, `Ehr.eventTime`, `Ehr.expiryCutoff`, `Ehr.expiryStatus`, `Ehr.extraGuard`, `Ehr.factVersion`, `Ehr.fieldRequired`, `Ehr.freqElement`, `Ehr.guardBase`, `Ehr.hasGoodEntry`, `Ehr.hasValidReceipt`, `Ehr.highMme`, `Ehr.humanWaiverMet`, `Ehr.identityText`, `Ehr.inClass`, `Ehr.infoPayload`, `Ehr.infoShown`, `Ehr.infoVersion`, `Ehr.interacts`, `Ehr.isHighAlert`, `Ehr.isLbWeight`, `Ehr.keyAt`, `Ehr.layoutShown`, `Ehr.layoutShownAux`, `Ehr.lineDoseMgTenths?`, `Ehr.lineFreqPerDay?`, `Ehr.lineMatches`, `Ehr.mmeFactor`, `Ehr.monthDays`, `Ehr.naloxoneLine`, `Ehr.namedClinicalCode`, `Ehr.nowMin`, `Ehr.orderLines`, `Ehr.ownVisible`, `Ehr.parentOpen`, `Ehr.payloadComplete`, `Ehr.payloadField`, `Ehr.payloadFieldMet`, `Ehr.primaryClass`, `Ehr.receiptValid`, `Ehr.renewalValid`, `Ehr.reviewMet`, `Ehr.reviewsOk`, `Ehr.roleOk`, `Ehr.scanMatches`, `Ehr.showsInfo`, `Ehr.stampMinute`, `Ehr.stampValid`, `Ehr.temporalOrdering`, `Ehr.temporalStatus`, `Ehr.timeDistance`, `Ehr.validationsOk`, `Ehr.valueAccepted`, `Ehr.valueSatisfies`, `Ehr.waived`, `Ehr.weightBasedDrug`, `Ehr.weightElement`, `Ehr.weightKgTenths?`, `Ehr.whenHolds`

</details>

<a id="audit-b4"></a>
<details>
<summary>B4: 39 shared definitions and types</summary>

`Ehr.AlertSpec.targetsScreen`, `Ehr.CommitSpec.encounterRoleAllowed`, `Ehr.Kind.catalogTag`, `Ehr.Props.DeclaredWritesInSpec`, `Ehr.Props.HumanMustEnter`, `Ehr.Props.IdsUnique`, `Ehr.Props.LinkedNotRetyped`, `Ehr.Props.NavigationSane`, `Ehr.Props.NoAlertSuppression`, `Ehr.Props.NoAutomationAttempts`, `Ehr.Props.NoHumanRequest`, `Ehr.Props.NoInterruptivePopupRequests`, `Ehr.Props.NoPassivePopupRequests`, `Ehr.Props.QuantityPrefillsKeepUnits`, `Ehr.Props.ReferencesResolve`, `Ehr.Props.SpecIdsUnique`, `Ehr.Props.StabilityBudget`, `Ehr.Props.alertOf?`, `Ehr.Props.allComps`, `Ehr.Props.clickTarget?`, `Ehr.Props.commitOf?`, `Ehr.Props.fieldOf?`, `Ehr.Props.gotoOf?`, `Ehr.Props.gotoStep?`, `Ehr.Props.isContainer`, `Ehr.Props.isQuantity`, `Ehr.Props.kindName`, `Ehr.Props.macroOf?`, `Ehr.Props.movedTags`, `Ehr.Props.placeOf`, `Ehr.Props.popupRequestCount`, `Ehr.Props.recordFactOf?`, `Ehr.Props.reviewOf?`, `Ehr.Props.setTarget?`, `Ehr.Props.stepTarget?`, `Ehr.Render.NavSane`, `Ehr.Render.uiOverviewNav`, `Ehr.Render.workflowLabel`, `Ehr.entryRelevantForRole`

</details>

<a id="audit-b5"></a>
<details>
<summary>B5: 10 shared definitions and types</summary>

`Ehr.Certificate`, `Ehr.Check.FileWrite`, `Ehr.Check.Target`, `Ehr.Check.certificate`, `Ehr.Check.checkerVersion`, `Ehr.Check.deployPlan`, `Ehr.Check.fnv1a64`, `Ehr.Check.hex16`, `Ehr.Check.jsonHash`, `Ehr.encodeJson`

</details>

<a id="audit-b6"></a>
<details>
<summary>B6: 75 shared definitions and types</summary>

`Ehr.Check.FilteredPopupRequests`, `Ehr.Check.Finding`, `Ehr.Check.Hop`, `Ehr.Check.Rule`, `Ehr.Check.additionalCompletionIssue`, `Ehr.Check.allGotoEdges`, `Ehr.Check.badHumanPrefill`, `Ehr.Check.badMacroStep`, `Ehr.Check.badReference`, `Ehr.Check.badWrite`, `Ehr.Check.bfs`, `Ehr.Check.bfsAux`, `Ehr.Check.bfsRound`, `Ehr.Check.check`, `Ehr.Check.clinicalUsesCapture`, `Ehr.Check.commitScreens`, `Ehr.Check.compFinding`, `Ehr.Check.completeForWithReach`, `Ehr.Check.completeViaWithReach`, `Ehr.Check.compsWithId`, `Ehr.Check.counterexample`, `Ehr.Check.drugSlots`, `Ehr.Check.entryValuesPossible`, `Ehr.Check.findComp`, `Ehr.Check.firstFinding`, `Ehr.Check.fixedShown`, `Ehr.Check.fixedShownAux`, `Ehr.Check.fixedSlot`, `Ehr.Check.followHops`, `Ehr.Check.hasNewLine`, `Ehr.Check.isGotoPath`, `Ehr.Check.isOpenGroup`, `Ehr.Check.landmarksPinned`, `Ehr.Check.linkedSourcesTyped`, `Ehr.Check.macroButton`, `Ehr.Check.macroFinding`, `Ehr.Check.navigationFinding`, `Ehr.Check.openEncounterField`, `Ehr.Check.openFieldOn`, `Ehr.Check.openGotoEdges`, `Ehr.Check.openReach`, `Ehr.Check.openReachTable`, `Ehr.Check.parentsFixed`, `Ehr.Check.passivePinned`, `Ehr.Check.passiveScreensKept`, `Ehr.Check.pathTo`, `Ehr.Check.pinnedForReview`, `Ehr.Check.plain`, `Ehr.Check.popupComponents`, `Ehr.Check.popupTier`, `Ehr.Check.receiptHideSafe`, `Ehr.Check.recordSourcesDeclared`, `Ehr.Check.repairSlots`, `Ehr.Check.repairsSlot`, `Ehr.Check.replayFacts`, `Ehr.Check.replayOk`, `Ehr.Check.replayUser`, `Ehr.Check.revealAndClick`, `Ehr.Check.revealEvents`, `Ehr.Check.revealable`, `Ehr.Check.revealableAux`, `Ehr.Check.reviewsPinned`, `Ehr.Check.reviewsPinnedOn`, `Ehr.Check.rules`, `Ehr.Check.shortPathTo`, `Ehr.Check.tableReach`, `Ehr.Check.universallyValid`, `Ehr.Check.verifiedReachable`, `Ehr.Check.waiverHasNonemptyValue`, `Ehr.ClinicalPredicate.ctorElimType`, `Ehr.ClinicalPredicate.noConfusionType`, `Ehr.Program.catalogTags`, `Ehr.Program.inCatalog`, `Ehr.Verdict`, `Ehr.When.ctorElimType`

</details>

<a id="audit-b7"></a>
<details>
<summary>B7: 9 shared definitions and types</summary>

`Ehr.Check.Scalar.alert`, `Ehr.Check.Scalar.button`, `Ehr.Check.Scalar.element`, `Ehr.Check.Scalar.entry`, `Ehr.Check.Scalar.field`, `Ehr.Check.Scalar.program`, `Ehr.Check.Scalar.review`, `Ehr.Check.Scalar.screen`, `Ehr.Check.Scalar.spec`

</details>

<a id="audit-b8"></a>
<details>
<summary>B8: 1 shared definitions and types</summary>

`Ehr.Check.Target.publishes`

</details>

<a id="audit-b9"></a>
<details>
<summary>B9: 2 shared definitions and types</summary>

`Ehr.ComponentDef`, `Ehr.Friction`

</details>

<a id="audit-b10"></a>
<details>
<summary>B10: 3 shared definitions and types</summary>

`Ehr.DesignRules`, `Ehr.Props.commitButtons`, `Ehr.Props.requiredCommits`

</details>

<a id="audit-b11"></a>
<details>
<summary>B11: 12 shared definitions and types</summary>

`Ehr.Examples.Tiny.amoxMacro`, `Ehr.Examples.Tiny.orderScreen`, `Ehr.Examples.Tiny.prescribers`, `Ehr.Examples.Tiny.program`, `Ehr.Examples.Tiny.roomingScreen`, `Ehr.Examples.Tiny.signScreen`, `Ehr.Examples.Tiny.spec`, `Ehr.Props.Examples.goodMacro`, `Ehr.Props.Examples.goodOrderScreen`, `Ehr.Props.Examples.goodProgram`, `Ehr.Props.Examples.goodSignScreen`, `Ehr.Props.Examples.pinTinyAlerts`

</details>

<a id="audit-b12"></a>
<details>
<summary>B12: 12 shared definitions and types</summary>

`Ehr.ItemView`, `Ehr.PayloadGroup`, `Ehr.PayloadView`, `Ehr.ScreenView`, `Ehr.SelectedPayloadRow`, `Ehr.actionStatus`, `Ehr.capturedAt?`, `Ehr.depthAux`, `Ehr.infoPinned`, `Ehr.itemView`, `Ehr.payloadView`, `Ehr.view`

</details>

<a id="audit-b13"></a>
<details>
<summary>B13: 21 shared definitions and types</summary>

`Ehr.Macro`, `Ehr.ObligationView`, `Ehr.Program.macro?`, `Ehr.Role.name`, `Ehr.Spec.alert?`, `Ehr.StepResult`, `Ehr.alertHolds`, `Ehr.canPopup`, `Ehr.clickAlert`, `Ehr.compShown`, `Ehr.currentLineComplete`, `Ehr.encounterRoleFailure?`, `Ehr.entryReason`, `Ehr.guardReason`, `Ehr.hasOrderAt`, `Ehr.obligationViews`, `Ehr.popupCandidates`, `Ehr.priorAuthCaptured`, `Ehr.priorAuthElement`, `Ehr.programPopsUp`, `Ehr.serviceOrderAt`

</details>

<a id="audit-b14"></a>
<details>
<summary>B14: 2 shared definitions and types</summary>

`Ehr.PrefillPolicy`, `Ehr.resolveSlot`

</details>

<a id="audit-b15"></a>
<details>
<summary>B15: 2 shared definitions and types</summary>

`Ehr.Program`, `Ehr.Spec`

</details>

<a id="audit-b16"></a>
<details>
<summary>B16: 3 shared definitions and types</summary>

`Ehr.Props.AlertBudget`, `Ehr.Props.ReachableScreen`, `Ehr.Props.WithinBudgets`

</details>

<a id="audit-b17"></a>
<details>
<summary>B17: 1 shared definitions and types</summary>

`Ehr.Props.AlertShownInline`

</details>

<a id="audit-b18"></a>
<details>
<summary>B18: 3 shared definitions and types</summary>

`Ehr.Props.AlertsFire`, `Ehr.Props.InterruptiveHandled`, `Ehr.Props.PassiveShownInline`

</details>

<a id="audit-b19"></a>
<details>
<summary>B19: 2 shared definitions and types</summary>

`Ehr.Props.AlertsOnlyWhenTrue`, `Ehr.Props.NoFalseAlarms`

</details>

<a id="audit-b20"></a>
<details>
<summary>B20: 7 shared definitions and types</summary>

`Ehr.Props.AllowedEntryValue`, `Ehr.Props.CapturesAllOnce`, `Ehr.Props.CommitCapturesAll`, `Ehr.Props.CountsFor`, `Ehr.Props.EnteredOnce`, `Ehr.Props.EntryDirectMetIn`, `Ehr.Props.EntryMetIn`

</details>

<a id="audit-b21"></a>
<details>
<summary>B21: 1 shared definitions and types</summary>

`Ehr.Props.Always`

</details>

<a id="audit-b22"></a>
<details>
<summary>B22: 1 shared definitions and types</summary>

`Ehr.Props.Applies`

</details>

<a id="audit-b23"></a>
<details>
<summary>B23: 5 shared definitions and types</summary>

`Ehr.Props.CatalogOnly`, `Ehr.Props.LandmarksShown`, `Ehr.Props.RequiredWithinDepth`, `Ehr.Props.WellFormed`, `Ehr.Props.WithinClicks`

</details>

<a id="audit-b24"></a>
<details>
<summary>B24: 7 shared definitions and types</summary>

`Ehr.Props.CommitButtonShown`, `Ehr.Props.CommitReviewsMet`, `Ehr.Props.CommitScreenShowsReviews`, `Ehr.Props.ReceiptCovers`, `Ehr.Props.ReviewMetIn`, `Ehr.Props.ReviewsBeforeCommit`, `Ehr.Props.Waived`

</details>

<a id="audit-b25"></a>
<details>
<summary>B25: 1 shared definitions and types</summary>

`Ehr.Props.CommitHappens`

</details>

<a id="audit-b26"></a>
<details>
<summary>B26: 2 shared definitions and types</summary>

`Ehr.Props.CommitUnitsRight`, `Ehr.Props.UnitsRight`

</details>

<a id="audit-b27"></a>
<details>
<summary>B27: 6 shared definitions and types</summary>

`Ehr.Props.CommitsStayReachable`, `Ehr.Props.Completable`, `Ehr.Props.Episode.afterHuman`, `Ehr.Props.RecordAllowsScans`, `Ehr.Props.requiredCommitsFor`, `Ehr.commitRolePossible`

</details>

<a id="audit-b28"></a>
<details>
<summary>B28: 5 shared definitions and types</summary>

`Ehr.Props.CosignIsSecondUser`, `Ehr.Props.Episode.start`, `Ehr.Props.HumanOnlyKept`, `Ehr.Props.HumanStepsByHuman`, `Ehr.Props.OnlyHumanCommitsAndAcks`

</details>

<a id="audit-b29"></a>
<details>
<summary>B29: 2 shared definitions and types</summary>

`Ehr.Props.Episode`, `Ehr.Props.Reachable`

</details>

<a id="audit-b30"></a>
<details>
<summary>B30: 2 shared definitions and types</summary>

`Ehr.Props.Episode.next`, `Ehr.Props.EveryStep`

</details>

<a id="audit-b31"></a>
<details>
<summary>B31: 2 shared definitions and types</summary>

`Ehr.Props.Episode.screen`, `Ehr.Props.ShowsSome`

</details>

<a id="audit-b32"></a>
<details>
<summary>B32: 1 shared definitions and types</summary>

`Ehr.Props.GotoPath`

</details>

<a id="audit-b33"></a>
<details>
<summary>B33: 2 shared definitions and types</summary>

`Ehr.Props.HumanWaiverFor`, `Ehr.Props.ValidReceiptFor`

</details>

<a id="audit-b34"></a>
<details>
<summary>B34: 1 shared definitions and types</summary>

`Ehr.Props.InfoShown`

</details>

<a id="audit-b35"></a>
<details>
<summary>B35: 3 shared definitions and types</summary>

`Ehr.Props.InterruptsOnce`, `Ehr.Props.NoRepeatInterruptions`, `Ehr.Props.PopupRequestedOnce`

</details>

<a id="audit-b36"></a>
<details>
<summary>B36: 2 shared definitions and types</summary>

`Ehr.Props.PassiveNeverPopsUp`, `Ehr.Props.SeverityTiers`

</details>

<a id="audit-b37"></a>
<details>
<summary>B37: 1 shared definitions and types</summary>

`Ehr.Props.PopupNotPassive`

</details>

<a id="audit-b38"></a>
<details>
<summary>B38: 1 shared definitions and types</summary>

`Ehr.Props.Satisfies`

</details>

<a id="audit-b39"></a>
<details>
<summary>B39: 2 shared definitions and types</summary>

`Ehr.Props.WritesAllowed`, `Ehr.Props.WritesOnly`

</details>

<a id="audit-b40"></a>
<details>
<summary>B40: 2 shared definitions and types</summary>

`Ehr.Props.foldMacro`, `Ehr.Props.macroAct`

</details>

<a id="audit-b41"></a>
<details>
<summary>B41: 79 shared definitions and types</summary>

`Ehr.Render.AllergyRow`, `Ehr.Render.BannerInfo`, `Ehr.Render.Ctx`, `Ehr.Render.Ctx.v`, `Ehr.Render.Display`, `Ehr.Render.EncRow`, `Ehr.Render.GrowthPoint`, `Ehr.Render.HistoryRow`, `Ehr.Render.ImmRow`, `Ehr.Render.InputType`, `Ehr.Render.LabRow`, `Ehr.Render.MedRow`, `Ehr.Render.NoteRow`, `Ehr.Render.ProblemRow`, `Ehr.Render.ProcRow`, `Ehr.Render.TrendPoint`, `Ehr.Render.UiBranch`, `Ehr.Render.UiNode`, `Ehr.Render.UiScreen`, `Ehr.Render.ValueKindName`, `Ehr.Render.VitalRow`, `Ehr.Render.actionRole`, `Ehr.Render.allergyCells`, `Ehr.Render.blockedReason`, `Ehr.Render.fieldKind`, `Ehr.Render.historyCells`, `Ehr.Render.infoLabel`, `Ehr.Render.medCells`, `Ehr.Render.noteCells`, `Ehr.Render.problemCells`, `Ehr.Render.renderUi`, `Ehr.Render.uiAllergySummary`, `Ehr.Render.uiBanner`, `Ehr.Render.uiBlocked`, `Ehr.Render.uiButton`, `Ehr.Render.uiCaptureText`, `Ehr.Render.uiChars`, `Ehr.Render.uiClinicalBanner`, `Ehr.Render.uiComponentsWhere`, `Ehr.Render.uiDate`, `Ehr.Render.uiEnabled`, `Ehr.Render.uiField`, `Ehr.Render.uiFieldKind`, `Ehr.Render.uiFullInfoShown`, `Ehr.Render.uiHundredths`, `Ehr.Render.uiInWorkspace`, `Ehr.Render.uiInfo`, `Ehr.Render.uiItem`, `Ehr.Render.uiItemInfo`, `Ehr.Render.uiItemRows`, `Ehr.Render.uiLatestVitals`, `Ehr.Render.uiMedSummary`, `Ehr.Render.uiMissingReviews`, `Ehr.Render.uiModal`, `Ehr.Render.uiNav`, `Ehr.Render.uiNavButton`, `Ehr.Render.uiNavGroup`, `Ehr.Render.uiNavTitle`, `Ehr.Render.uiNest`, `Ehr.Render.uiOrderInfo`, `Ehr.Render.uiOrderRows`, `Ehr.Render.uiPayloadRows`, `Ehr.Render.uiProblemSummary`, `Ehr.Render.uiReasonText`, `Ehr.Render.uiRequiredReviews`, `Ehr.Render.uiRows`, `Ehr.Render.uiRows.valueTextQty`, `Ehr.Render.uiSide`, `Ehr.Render.uiSideAt`, `Ehr.Render.uiSideAt.go`, `Ehr.Render.uiSteps`, `Ehr.Render.uiSummaryRows`, `Ehr.Render.uiTagIs`, `Ehr.Render.uiTakesChildren`, `Ehr.Render.uiTitledLabel`, `Ehr.Render.uiWorkspace`, `Ehr.Render.unitName`, `Ehr.Render.valueText`, `Ehr.Render.vitalCells`

</details>

<a id="audit-b42"></a>
<details>
<summary>B42: 1 shared definitions and types</summary>

`Ehr.Render.UiActionHonest`

</details>

<a id="audit-b43"></a>
<details>
<summary>B43: 3 shared definitions and types</summary>

`Ehr.Render.UiPresent`, `Ehr.Render.uiBannerAtom`, `Ehr.Render.uiNavAtoms`

</details>

<a id="audit-b44"></a>
<details>
<summary>B44: 1 shared definitions and types</summary>

`Ehr.Render.UiWorkspacePresent`

</details>

<a id="audit-b45"></a>
<details>
<summary>B45: 1 shared definitions and types</summary>

`Ehr.Render.uiAtomsList`

</details>

<a id="audit-b46"></a>
<details>
<summary>B46: 1 shared definitions and types</summary>

`Ehr.Render.uiLabel`

</details>

<a id="audit-b47"></a>
<details>
<summary>B47: 1 shared definitions and types</summary>

`Ehr.Spec.isHumanOnly`

</details>

<a id="audit-b48"></a>
<details>
<summary>B48: 1 shared definitions and types</summary>

`Ehr.alertsAcked`

</details>

<a id="audit-b49"></a>
<details>
<summary>B49: 1 shared definitions and types</summary>

`Ehr.commitGuard`

</details>

<a id="audit-b50"></a>
<details>
<summary>B50: 1 shared definitions and types</summary>

`Ehr.doseInputUnit?`

</details>

<a id="audit-b51"></a>
<details>
<summary>B51: 8 shared definitions and types</summary>

`Ehr.hasEntry`, `Ehr.linkedSource?`, `Ehr.parseElementValue`, `Ehr.prefillField`, `Ehr.prefillRecord`, `Ehr.prefillScreen`, `Ehr.prefillValueValid`, `Ehr.recordValue`

</details>

<a id="audit-b52"></a>
<details>
<summary>B52: 2 shared definitions and types</summary>

`Ehr.init`, `Ehr.startExpanded`

</details>

<a id="audit-b53"></a>
<details>
<summary>B53: 1 shared definitions and types</summary>

`Ehr.runAll`

</details>

<!-- END GENERATED AUDIT -->
