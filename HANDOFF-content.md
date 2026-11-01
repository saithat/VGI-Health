# Content handoff

## Completed

Merged `origin/main` (`db48c49`) first. Checkpoint `792607f` is pushed; final
implementation/export checkpoint: `a0fa74c`. Branch: `lane/content`.

The canonical follows the reviewed blueprint on **45 screens**: home and W1–W7
with **9 / 3 / 7 / 5 / 6 / 9 / 5** steps. All **87** artifact-only screens are
relocated to clinical sections; the two W7 prescription screens remain. The
exhaustive ledger is `Canonical/Blueprint.lean`. Original clinical field and
commit component IDs, element/slot bindings, roles, allowed values, guards,
reviews, alerts, event windows, durable clocks and separate release/stop/refusal
routes remain. Source controls are checked against the assembled program.
Runtime goto destinations/macros use actual host IDs; no alias/orphan screens.
Content's patch/walk helpers resolve old artifact IDs through the same ledger.

- Artifact fields, human identity and independent actions are real children of
  open sections. Mandatory infos stay pinned at the root before each section,
  as current core pinning requires. No pinning or visibility rule was relaxed.
- Signature sections contain the required human-only, never-prefilled identity
  field immediately above their own Sign control. Initials/sex/age is the actual
  `identityText` validator; it was not changed to match renderer documentation.
- Search-first composers include catalog results and unsigned-order tables;
  issuance variants/W7 use the full composer. Order-set macros retain per-field
  unconfirmed defaults. The extra W1 Verify step, allergy reconfirmations, long
  composers/copied notes, history tabs and removable popups remain.
- Blueprint views include result tables/trends/flags/ranges, inbox list+preview,
  ED board, MAR scheduled-time schema/BCMA fields, flowsheet history, growth/dose
  schemas, prescription comparison, and surgical/discharge phase checklists.
  `Specs/ClinicalTables.lean` declares real adapter contracts; absent data is not
  manufactured. These declarations do not claim complete adapter implementation.
- Legal descriptions/citations remain in docstrings and catalog. Human labels
  are short. Unrestricted narratives are validated nonempty **text**, not coded
  pickers. Patient/prescriber and related identity facts use named `recordFact?`
  sources, record-confirm text and provenance; humans confirm them. Enumerations
  retain coded domains and all original allowed-value/clinical validation.
- Render already owns nav/stepper/clinical rail. Duplicate workspace navigator
  and sidebar groups are removed. Real goto buttons remain until core supports
  shell navigation events. The safety landmark remains; renderer projection of
  its extra workspace card is CR-17, not a deleted safety component.
- v3 antibiotic controls/defaults preserve distinct artifact composer bindings
  after folding. Seed 7 now removes every route to refill decision, including
  relocated host links, preserving its original unreachable-decision failure.
  All **32** permanent seeds remain. Eight replay manifests use actual exported
  programs/specs, trusted test evidence and human events.

All **308** catalog rules previously represented remain represented (29 original,
124 first pass, 155 feature pass). The **26** exact feature gaps below, **83**
L-group policy/completeness rows and **139** out-of-scope rows remain documented.
No source rule is weakened, dropped or replaced by a substitute checkbox.

## Validation

- Full `lake build`, all W1–W7 walkthroughs, every original/new artifact walk,
  all bad-program regressions and v2/v3 paths pass.
- `lake check` and Comparator pass all 18 statements. Kernel axioms are only
  propext / Quot.sound / Classical.choice; both Extends `#print axioms` audits
  report only propext. No content proof has sorry, admit, new axioms or native_decide.
  Comparator's trusted Statements sorry warnings are expected, not content proofs.
- The renderer's actual **NavSane** passes on **all 15 saved persona programs**
  (P1–P5 for v1/v2/v3), not just a parallel navigation model. Source checks
  also cover identity adjacency, retained clinical controls and pinned reviews.
- All eight native and installed-WASM feature failures replay with the intended
  hard stop and no commits. This tests runtime behavior, not manifest freshness.
- App **129**, agent **31**, world **92** tests pass. Workspace build/lint and
  agent typecheck pass. The old app seed-count failure was already fixed on main.
- P1 rooming/orders/sign inputs from an adult Synthea record pass all **8**
  desktop/narrow ARIA, visibility, legibility and fidelity tests. Nine actual
  painter PNGs and three native semantic JSON files are under
  `programs/canonical/review/P1/`; see the review README. Screens intentionally
  show missing adapter data and disabled signing rather than synthetic evidence.
- Final source generator reproduces ten artifacts byte-for-byte. Fresh native
  export reproduces **54** spec/program JSON artifacts byte-for-byte. Catalog
  audit verifies all 279 added representations, release inheritance and 32 seeds.
  `git diff --check` passes. No Core/Render/Props/Check or other lane source changed.

## Reproduction

From root (never run simultaneous Lake processes, including world contract tests):

```sh
python -B lean/Ehr/Specs/Rules/encode.py
cd lean
lake build
lake check
lake comparator
lake exe export-content
lake env lean --run Ehr/Canonical/FeatureReplays.lean ../programs/replays
lake env lean --run Ehr/Canonical/NavExports.lean
lake env lean --run Ehr/Canonical/ReviewScreens.lean ../fixtures/synthea/Aaron_Ankunding_4966bd28.json ../programs/canonical/review/P1
cd ..
python -B lean/Ehr/Canonical/export_rules.py
python -B lean/Ehr/Canonical/replay_features.py
node lean/Ehr/Canonical/replay_features_wasm.mjs
node lean/Ehr/Canonical/review_screens.mjs
```

Use `pnpm --config.store-dir=/tmp/vgi-content-pnpm-store --filter <pkg> run <script>`.
World's test suite invokes Lake internally: run it after all other Lake work.
`export-content`'s console still says 16 seeds; the actual loop exports all 32.
That owning-tools diagnostic is already requested in CR-16; no seed was removed.

## Exactly what remains

**Content-owned implementation expressible with the merged runtime: nothing left.**
The following project requirements remain real cross-lane dependencies, consolidated
in **CR-16 / CR-17** in `docs/design/changes-requests.md`:

1. **Core/render — conditional sections.** `Visibility` has only always and
   unlessReceipt, not When/clinical predicates. Sections therefore stay open,
   while original applicability guards fail closed. Add shared conditional
   visibility with unknown handling; do not invent React-only hiding.
2. **Core/render — literal attestation.** InfoSpec has no literal text field and
   Kind has no static text node. Add it and wire the exact controlled-prescription
   notice plus the hospital explanation. CR-17 provides verbatim 21 CFR
   1311.140(a)(3) text and its verified eCFR link. A short label is not the notice.
3. **Render/app — shell and section support.** Project the component banner into
   the one real banner, place the clinical rail on the left, and support actual
   interpreter events/IDs for shell nav/stepper. Preserve root pinning until
   always-open ancestor visibility is supported with the same safety guarantee.
4. **World/render/app — actual data/behavior.** Supply record-confirm identity
   sources, current clinical/phase/event/version evidence, calendars, clocks and
   InfoPayloads; populate search results, complete draft/service-order summaries,
   per-slot selection, results, inbox previews, ED status, MAR time columns,
   flowsheets, growth/reference/dose calculations and phase checklists. Real
   select/deselect, messaging/delivery and backend effects require actual events.
   Do not substitute fixture evidence or fake normal/completion states.
5. **Core/check — coverage and certification.** Enforce source row/slot completeness
   and certify actual migrated programs. No T1/T4/general-T8, deployment, external
   evidence-truth or physical-care certificate is claimed by these content tests.
6. **WASM — refresh build assets/manifest.** Installed runtime passes new external
   programs and all eight failure replays, but its source manifest predates this
   content change. The owning lane must rebuild/refresh it. Content has not
   edited app/wasm-owned artifacts to conceal stale source hashes.
7. **Adapters/authorization/effects — CR-16.** Persist the distinct artifact and
   completion/filing/release effects with current patient/episode/artifact version;
   preserve original durable anchors across navigation/transfer. Practitioner
   qualification, proxy/release policy, actual controlled-V/GHB formulary support,
   source-row completeness and the 83 L-group policies remain owning-lane work.

The original **26** precise unsupported feature rows remain:

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
