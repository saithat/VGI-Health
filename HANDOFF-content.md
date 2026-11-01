# Content handoff

## Completed work

Merged `origin/main` first at `601991a`. Pushed implementation `a61afc6`
and integration/exports/replays `74984a8` to `origin/lane/content`.

All **181** newly qualifying catalog rows are accounted for: **155** have
concrete v1 spec representations; **26** still require language/adapter
capabilities that the five new feature families do not provide. Each has its
precise reason in `catalog.json` and below. This is not a claim that all 181
are implemented. The existing 29 plus pass-1's 124 rules remain represented,
for **308** catalog rules with representations overall.

| New family | Represented | Examined |
|---|---:|---:|
| event-time-window | 66 | 67 |
| patient-predicate | 57 | 59 |
| value-validation | 12 | 34 |
| order-expiry-clock | 10 | 11 |
| structured-display | 10 | 10 |

- `feature_data.py` is the reviewed mapping; `feature_encode.py` emits
  `Specs/Rules/Features.lean`, placements and catalog provenance. Every source
  item carries Law/Entrenched labels, citations and catalog ids. V1 appends
  clinical entries, time windows, durable clocks, validation and payload contracts.
  Validators conjoin with existing rules. All issuance variants inherit old
  signing/pre-op/review/alert requirements and new pre-op timing; actual signing
  controls have a semantic label. No core, Props, Check or statements files changed.
- V1.1/V2 inherit the rebuilt V1. Both Extends proofs use `decide`, with only
  `propext` in their axiom audits. The relation additionally preserves display
  obligations. There are no unfinished content proofs or new axioms.
- Canonical: **132 screens, 283 elements, 65 infos, 95 commits**, 90 attached
  temporal obligations, 10 durable expiry obligations, 13 display contracts.
  All original W1–W7 paths and 50 new artifact actions have completing human
  walks; all new artifacts complete in v1, v1.1 and v2. Required reviews are
  always-visible root components before commit controls (`commitReviewsPinned`).
  Phase payloads follow workflows; missing phase evidence conservatively blocks.
  Separate decline/release/stop/expired-prescription actions remain available.
- All **32** permanent seeds are exported. Seeds 25–32 exercise expired
  restraint, stale interval H&P, expired Schedule III–V Rx, underage consent,
  invalid birth date, daily methotrexate default, hidden grouped results and
  misleading signing labels. Their eight generated manifests under
  `programs/replays/` carry typed external facts and real human events, referencing
  the actual exported spec/program. `replay_features.py` confirms the intended
  native-API reason and no commits. The earlier 24 regressions remain intact.
- Qualitative source deadlines and extra numeric lookbacks are explicitly
  labeled stricter hospital policies. The adult restraint condition has no
  artificial upper age limit (age 151 is a regression). Unknown age/clinical
  facts cannot bypass eligibility. Original issue/start/first-fill anchors and
  actual six-calendar-month anniversaries are used. No typed field fabricates
  trusted event, clinical, clock or payload evidence.

## Reproduction

From the worktree root:

```sh
python -B lean/Ehr/Specs/Rules/encode.py
cd lean
lake build
lake check
lake comparator
lake exe export-content
lake env lean --run Ehr/Canonical/FeatureReplays.lean ../programs/replays
cd ..
python -B lean/Ehr/Canonical/export_rules.py
python lean/Ehr/Canonical/replay_features.py
```

Never run two Lake processes at once. The original exporter console still says
16 seeds; its actual loop exports all 32. The audit asserts the actual corpus.
The old `encoding-plan.md` describes pass 1; the executable second-pass mapping
is `feature_data.py`. Running the rules-research catalog builder can overwrite
content encoding metadata; rerun `encode.py` afterward.

Validation on the expanded exports:

- Full `lake build`: passes, including original regressions, all 50 new artifact
  walks, release walks, eight new failures, pinned reviews, dependency edits,
  unknown/underage eligibility and selected/grouped payload tests.
- `lake check`: default kernel accepts; only `propext`, `Quot.sound` and
  `Classical.choice`. Comparator accepts all 18 current statements. Its trusted
  challenge's `sorry` warnings are expected; no solution/content proof uses them.
- Export tool round-trips every spec/program. Export audit verifies 279 added
  catalog representations, all release prefixes/displays, labels, pinning,
  32 seeds and eight replay inputs. Fresh `/tmp` generation gives **64 byte-identical
  artifacts**; native `ehr spec-export` agrees with all three saved specs. Source
  generation reproduces ten generated source/catalog artifacts exactly.
- All eight new replay manifests pass through the native `run-batch` JSON API,
  with the expected hard stops and no committed effects.
- App build/lint pass; app tests **89/90 pass**. The complete-corpus real Lean
  WASM rendering test passes. The single failure is the existing app-owned
  `app/tests/app.test.tsx:25` assertion expecting 16 bad programs (main already
  had 24; now 32). No seed or test requirement was removed to conceal it.
- Agent typecheck/lint and **31 tests** pass; world build/lint and **92 tests**
  pass. All were rerun after regeneration. `git diff --check` passes.

Use `pnpm --config.store-dir=/tmp/vgi-content-pnpm-store --filter <pkg> run <script>`.

## Exactly what remains

**Content coding for the currently expressible scope: nothing left.** Full
coverage remains blocked by the following **26** precise gaps. These are
explicitly not encoded, rather than replaced by extra checkboxes:

- `cms-482.25-b5-automatic-stop`: ExpiryReq blocks actions for a known durable order, but cannot choose policy-dependent defaults when duration/dose-count is absent or run an automatic-stop scheduler. A fixed expiry on a new manual action would not implement this source rule. Needs default-policy selection plus backend auto-stop scheduling.

- `ca-statutes-fam-6929-parent-initiated-disclosure`: Clinical predicates can scope UI requirements but cannot enforce requester identity, disclosure destinations or independently applicable federal confidentiality law. Requires release-access-policy; a disclosure checkbox would not enforce it.

- `ca-statutes-hsc-123115-protected-minor-proxy`: ClinicalPredicate can identify age/service/capacity but cannot filter record resources returned to a proxy or authorize that proxy. Requires release-access-policy over resource and requester identities.

- `ca-statutes-civ-56-11-authorization-expiration`: TemporalReq compares two event timestamps, but cannot authorize a future release up to a civil-year expiration/date-or-event, evaluate revocation, or enforce requested-later/research exceptions. A deadline on documenting authorization would not enforce release access. Needs release-access-policy and civil-year/event expiry.

- `federal-rx-1306-11-emergency-quantity`: supplyDaysCeil computes days supplied, but Validation has no comparison to a patient-specific emergency-period duration. An arbitrary fixed ceiling would misstate the emergency rule. Needs bounded relational comparison to trusted emergency-period evidence.

- `federal-rx-170-315-implant-lot`, `federal-rx-170-315-implant-serial`, `federal-rx-170-315-implant-expiry`: udiGs1 validates a supported UDI string but exposes no parser output/extraction into lot, serial or expiration fields. Other issuer formats need trusted product tables. Accepting a valid UDI is not the required production-identifier parsing capability; needs a typed parser/projection and persistence binding.

- `entrenched-ismp-dosing-weight-category`: The AST can restrict kg ranges but cannot select wet/dry/dosing weight by indication, fluid status and precedence or attest the selected source. A category enum would not define the required selection rules.

- `entrenched-leapfrog-bcma-wrong-dose`: Validation has no scanned-product-strength times administered-count comparison against the active administration order. drug-name scan matching is not dose matching. Requires product identity/strength relational validation.

- `entrenched-tjc-prohibited-list`, `entrenched-ismp-abbrev-iu`, `entrenched-ismp-abbrev-qd`, `entrenched-ismp-abbrev-qod`, `entrenched-ismp-abbrev-cc`, `entrenched-ismp-abbrev-microgram`, `entrenched-ismp-abbrev-dc`, `entrenched-ismp-abbrev-units`, `entrenched-ismp-abbrev-ms`, `entrenched-ismp-abbrev-mso4`, `entrenched-ismp-abbrev-mgso4`: Validation.token constrains a whole-string alphabet/length, not forbidden tokens, case/punctuation variants or context-sensitive abbreviation replacement across narratives and rendered medication communication. A vocabulary on an additional field would leave existing text unprotected; needs token-aware text/output validation.

- `entrenched-safer-allergy-synonyms`, `entrenched-safer-environmental-allergy`: codeMember validates exact membership but cannot normalize synonym aliases or route environmental allergens into Condition rather than AllergyIntolerance. Needs terminology normalization and category-specific record routing.

- `entrenched-safer-pediatric-dose-rounding`: Fixed tenths and decimal lexical validation cannot implement weight-dependent rounding precision below 0.1 units.

- `entrenched-safer-pediatric-concentration`: No validated concentration-to-volume relation or available-product selection exists; membership alone does not calculate a safe volume.

- `entrenched-safer-maximum-daily-dose`: doseByWeight caps one dose, not the sum of dose times frequency across all active/new administrations. Requires daily aggregate arithmetic with product/unit normalization.

The **83 L-group** record-level-completeness, qualified-authorization and
release-access-policy rows retain their individual unencoded reasons; the
139 out-of-scope rows remain documented. No remaining catalog row is silently
omitted or relabeled as complete.

Cross-lane actions are consolidated in **CR-16**, with **CR-15** and earlier
requests retained:

- **App:** repair the stale 16-seed assertion to cover the actual exported
  corpus. Keep all 32 programs. This is the sole current TS suite failure.
- **App/world/render:** supply coherent current patient/episode/artifact-version
  events, clinical snapshots, source code tables, local business calendars,
  durable clocks/month cutoffs, actual workflow phase and actual InfoPayloads.
  Paint groups/selection/pinning and bind every new/old panel to real data.
  Missing clinical/phase/evidence inputs intentionally block; no permissive
  fallback is authorized. `FeatureExamples` and replay facts are test-only.
  Preserve the exact controlled legal notice and all selected prescription rows;
  the old 13 controlledSigning* payload bindings and CR-10/14 fidelity work remain.
- **App/world/sim:** implement exclusive effects/FHIR writes for new artifact
  actions; preserve distinct completion/filing events and separate refusal,
  expiry, stop and release effects. Reset artifact episodes at real new events,
  never reset durable original clocks through navigation or transfer.
- **Core/check:** enforce coverage of all source rows/slots, not merely fields
  on supplied payload rows, before claiming complete prescription/result fidelity.
  Practitioner credentials and external evidence truth remain trusted adapter
  responsibilities. Preserve strict current-line/per-slot guard semantics.
- **Core/world:** actual controlled-V/GHB formulary support remains needed;
  don't create fictitious products or dilute Schedule II constraints.
- **Check/agent/sim/WASM:** consume the actual expanded releases/persona programs,
  validate all added ASTs and policy fields, certify the actual layouts and reject
  all 32 seeds with replayable semantic counterexamples. Use the supplied replay
  inputs for the new cases. Preserve existing CR-12/14 parser requests and
  native/WASM equivalence/fidelity coverage. No production checker certificate,
  T1/T4/general T8 proof or physical-care/record-completeness certificate is
  claimed by content.
