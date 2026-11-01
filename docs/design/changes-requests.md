# Change requests (from the checker lane)

Issues found while stating properties 1–12 over the interpreter and writing
the checker. Each says what goes wrong, what the checker does meanwhile, and
what we ask for. No property was weakened.

## CR-1. A finished order line can never be reopened (completability)

**What goes wrong.** `newOrderLine` moves `currentSlot` forward. Fields bound
to `Slot.current` then show the new line only. If the user (or a macro) adds a
line before the previous one meets its per-order-line requirements (for
example, a drug without a dose), no field can reach the old line again. The
commit guard then fails forever: the user is stuck. This breaks property 6
("from every reachable state, each commit is still reachable") for every
program that has an "add order" button and a per-order-line requirement.

**Meanwhile.** The checker rejects a program that has a `newOrderLine` button
when a required commit has a per-order-line entry requirement (property
`completable`). This will reject a canonical program that uses "add order".

**Ask (lane A).** Make `newOrderLine` an ordinary hard stop: blocked, with a
reason ("finish this order line first"), while the current line has a drug and
misses a per-order-line requirement. (Or add an action that selects an
existing order line.) With that, the checker can accept "add order" buttons.

## CR-2. `unlessReceipt` can hide information the commit still needs

**What goes wrong.** `unlessReceipt i` hides a component when *some*
receipt-accepting review requirement for `i` has a valid receipt. If another
commit's requirement for `i` is stricter (shorter window, fewer roles), the
info is hidden on that commit's screen while the receipt does not count for
it. The guard then blocks with nothing the user can do.

**Meanwhile.** The checker accepts an `unlessReceipt i` pin on a commit screen
only if every receipt-accepting requirement for `i` has a window no longer and
roles no wider than the requirement it pins for. Otherwise the pin must be
`always`. No change needed unless lane A prefers a per-commit rule.

## CR-3. Passive-alert screens are program screen IDs

**What goes wrong.** `AlertSpec.screens` names screens by ID. A program that
renames or drops the screen escapes property A1 (passive alerts shown inline):
there is no screen left on which the alert must be shown.

**Meanwhile.** Besides property A1, the checker requires every screen a
passive alert lists that exists in the canonical program to also exist in the
candidate.

**Ask (owner/content).** Consider naming workflows or commits instead of
screen IDs in `AlertSpec.screens`.

## CR-4. Review waivers (`ReviewReq.waivedBy`) — pending

Lane A is adding `waivedBy` (met if the waiver element is entered by a human
and confirmed). When it lands, properties 4 and 6 add the waiver as a third
way to meet a review requirement, and the checker accepts "info pinned, or the
waiver field reachable before the commit" for waivable requirements.

## CR-5. Canonical v1 acceptance (2026-10-31, check lane)

After merging main `1f43d67`, `rules specV1 none canonicalV1 canonicalV1`
fails these checks (the remaining rules pass):

- `writesOnly`: `canonicalV1.role = physician`, but `w4Admin.wristbandScan`
  and other RN/surgeon-only fields/commit buttons are present. Please export
  role-specific canonical programs whose declarations the role may use; the
  checker must keep the role-permission property. The all-workflows template
  may remain as a source template.
- `capturesAllOnce`: `w1Orders.dosingWeight` (and other `dosingWeight` fields)
  uses a record prefill despite the spec's `autoLinked` policy with source
  `weight`. Please use `.linked "weight"` throughout. `orderDiagnosis` and
  `claimDiagnosis` must likewise follow their declared links.
- `completable`: CR-1 is still pending on origin/lane/lean-core `abac908`.
  The checker will accommodate the guarded new-line action when it lands.

Content's bad-program exports and `Specs/Extends.lean` have not yet landed on
origin/lane/content `6cd108d`. Please preserve the expected properties listed
in HANDOFF-check.md when exporting the 14 programs. Per-screen component IDs
are accepted; spec-level alert IDs must remain unique.

## CR-6. Prior-auth requests and the existing semantic properties

`requestPriorAuth` introduces two cases relevant to T1:

1. With `priorAuthRequest.prefill = never` (as in Tiny v1.1), a human's
   request **click** creates a new captured value. `HumanStepsByHuman`
   currently requires new captures of never/human-only elements to arise
   from `Event.enter`, so this click violates that property. Please coordinate
   an owner-reviewed decision; check will not weaken the property to hide it.
2. Requesting again overwrites a confirmed request (including a confirmed
   value entered through a field or confirmed after a macro request).
   `EnteredOnce` requires a non-entry, non-macro click to preserve every
   confirmed captured value. Please preserve an already-confirmed request
   on this slot when handling the request action.

The v1 catalog blocks the action, so this does not affect canonical v1.


---


# Cross-lane change requests

## Render → lean-core: generated TypeScript (2026-10-31)

Please add `Ehr.Render.Types`, `Ehr.Render.Json`, and `Ehr.Render.Fhir` to
`sourceModules` in `lean/Ehr/Tools/GenTS.lean`, then regenerate. Display,
PageNode, RenderInput, FactsInput/FactsOutput are now public wire types.
Render will test the generator in a temporary copy without editing your file.

## Render → wasm: external toolchain path (2026-10-31)

`wasm/build-ehr.sh` and `wasm/build.py` hardcode `.tools/{emsdk,lean4,libuv}`;
there is no supported environment override. Please add one (e.g.
`VGI_TOOLS_DIR`), including the Python paths. The available pinned toolchains
are in `/home/saithat/Projects/VGI-wasm/.tools`. For this lane's rebuild we
use local ignored symlinks under `.tools` pointing to those read-only inputs.

## Render → app / infra: patient identity and wristbands (2026-10-31)

`Facts.patientId` is the **identifier search token**
`https://github.com/synthetichealth/synthea|<identifier.value>` for Synthea
patients, on both fixture and Medplum records. Medplum's server id is only a
REST resource address; never put it in a Synthea wristband. The interpreter's
`scanMatches facts "wristband" code` requires exact equality to
`Facts.patientId`. Please encode this token in QR/barcode generation and pass
the decoded string unchanged as `Value.code`. The renderer's scan fields emit
`data-value-kind=code`; they do not prefill a human-only scan.
For patients without a Synthea identifier, the payload is resource.id (or
entry.fullUrl for an id-less fixture). Resource row IDs use resource.id, falling
back to the **entire** entry.fullUrl, including `urn:uuid:`.

## Render → lean-core: exact data versions (2026-10-31)

Consider String data versions rather than Nat: Medplum meta.versionId values
are UUIDs. Current facts use a deterministic 52-bit digest of sorted
id@versionId keys, which assumes no collisions. This is documented, not an
exact guarantee that every edit changes the version.

## Render → content: canonical JSON export (2026-10-31)

After merging origin/lane/content, programs/canonical/v1.json is absent.
Please export the compiled Ehr.Canonical.canonicalV1 there, plus spec v1 JSON.
The render CLI accepts --spec v1 --program canonical for the same compiled
values, and also accepts file paths for testing the exported wire values.

# Content lane requests and integration status

These requests preserve BRIEF 5a's scope and safety rules. Content does not edit Core.

- **CR-1 — earlier order lines: integrated (`2637308`).** Core blocks advancing
  an incomplete current drug line. Fixed rows 10+ still let humans confirm
  every order-set value. An explicit earlier-line selector would improve editing
  and recovery, but is not needed to complete the canonical paths.
- **CR-2 — record source: integrated (`8c7b3fe`).** `recordFact?` is the sole
  permitted record source. Canonical weight declares `weightToday`; seed 6
  uses `weightYesterday` and now fails a generic structural source check and
  captures nothing at runtime. The kg requirement and unit checks remain.
- **CR-3 — encounter scope: integrated (`8c7b3fe`).** Consent, H&P update,
  meds-to-hold and anticoagulant review now apply to `signOrders` when
  `Facts.encounterKind? = some "preop"`. The temporary separate
  `signPreOpOrders` commit and its duplicate alerts have been retired. The
  W6 pre-op path now tests ordinary signing; no workflow or safety step was
  removed. World/app callers must supply the true encounter kind.
- **CR-4 — weight-based scope: integrated (`8c7b3fe`).** `doseCheck` is required
  on signing only for drugs with a mg/kg range. Tests show a hidden dose check
  blocks lisinopril and does not block metformin (which has no range).
- **CR-5 — alert click semantics: integrated (`febb477`).** Human inline
  clicks remain informational/ignored. Macro inline clicks now block with
  `human only: acknowledge`. Only a human ack of the open popup acknowledges.
  Seeds 4/9 cover unsafe macro attempts; core covers the click behavior.
- **CR-6 — passive alert placement: integrated (`8c7b3fe`).** Targets are now
  workflow tags. Canonical adds each passive alert inline on every screen of
  its targeted workflow. A generic guard checks this coverage. Screen renaming
  can no longer evade the target. Checker must use workflow targets.
- **CR-7 — enter-once scope.** Count an element once per workflow path, or
  ignore an already-captured value. The same `drug` binding across W1/W3/W5/W6
  is intentional; it is not a repeated prompt within one episode.
- **CR-8 — home shell.** `Screen.workflow = "shell"` on `home`; it is a shared
  navigator, not an eighth clinical workflow.

## Content representation correction

`prn` and `substitution` are required **decisions**, with both yes and no valid.
They now use `.coded "boolean"`. Core's `.flag` is a checked acknowledgment:
`valueSatisfies .flag (.flag false)` is false. Keeping these decisions as flags
made every scheduled order in the canonical sets unsignable. This does not
remove either entry requirement or any human confirmation. Consent, VIS,
protocol checks and education remain checked flags.

## Check integration findings after content `febb477`

The 14 Lean seeds have landed. They all currently fail first on their shared
canonical template's role-permission error (except seed 10, which fails an
unknown-alert reference). CR-5's role-specific canonical exports and linked
prefills are still required before intended first-failure regressions can run.

The intended mutation-specific checks differ from the handoff in these cases:

- Seed 3 uses an undeclared `weightLb` field: the violated existing clause is
  `DeclaredWritesInSpec` (`writesOnly`), not `QuantityPrefillsKeepUnits`.
- Seed 4 fails both `NoAlertSuppression` and `NoAutomationAttempts`; moving
  the human-only rule earlier will give the requested `humanOnlyKept` label.
- Seed 9 removes an alert component, but interruptive popups are generated
  by the spec. Its actual violation is the macro commit attempt
  (`humanOnlyKept`), not the current `AlertsFire` property.
- Seed 10 has an unknown alert: `ReferencesResolve` fails (`wellFormed`).
  `NoFalseAlarms` does not prohibit unknown non-firing alerts.
- Seed 13 removes only the W1 CURES paths. Other workflow screens still have
  the same report, exemption field and `signOrders` buttons, so `completeFor`
  passes. Even deleting all CURES paths may not refute the current
  `Completable`: its existential event list may change an opioid to a
  non-controlled drug before signing. It does not preserve clinical choices.

Please coordinate content and the owner on these differences. Check will not
claim a false mutation-specific `¬ Satisfies` proof or weaken any property.

---

## Core implementation status and integration requests (Oct 31)

---

## Release integration requests (other lanes)

- **CR-9 — service-only prior auth: resolved (`30f8ee8` plus content follow-up).**
  v1.1 declares optional `orderKind` and `orderCode` fields. W1 service ordering
  and W6 pre-op now request prior auth for imaging/procedure slots without a
  drug. A test requests imaging code 70551 and checks no drug alerts fire.
- **CR-10 — antibiotic indication data rows (render/app/world).** Content now
  declares element/info `abxIndication`, the per-line coded value written to
  `MedicationRequest.reasonCode`, and a MAR panel beside the dose. Render
  each captured antibiotic line's indication in the sign summary, and the
  active medication's indication from the FHIR order on the MAR. Test facts
  use `Facts.record[("abxIndication", "surgical-prophylaxis")]`. Show the
  actual value, not just a heading. Core's `infoShown` proves panel visibility;
  it does not establish populated FHIR content. Preserve T11 fidelity.
- **CR-11 — coded terminology membership (core/check).** `ValueKind.coded`
  currently accepts any nonempty code. `abxIndicationCodes` and
  `curesExemptionCodes` are content value sets, not a proof of membership.
  For full terminology enforcement, provide a generic spec value-set mapping
  and validate at entry, confirm, and guard. Do not hard-code release/seed ids.
  Content's corrected shared CURES codes are generated at
  `releases/cures-exemptions.json` by `ehr cures-exemptions-export`; v1,
  v1.1 and v2 all use them. `surgery-7-day` replaces `surgery-5-day` per
  H&S §11165.4(c)(4), matching `docs/rules/ca-statutes.json`. Membership
  alone is insufficient: waiver validation also needs the qualifying
  procedure/facility, directed supply of at most seven days and no refills.
  The `cures-unavailable` code models (c)(6): timely access impossible,
  no reasonably available authorized practitioner/designee, nonrefillable
  seven-day limit, and medical-record reason. It is not a catch-all for
  (c)(7)–(9). ED means a general acute care hospital; hospice still needs
  terminal illness under §11159.2(c). Preserve the subset described in V1;
  separate ED buprenorphine remains unmodeled. Content guards exercise
  human documentation across releases, not these eligibility predicates.
- **CR-12 — agent prior-auth action schema (agent).** The real exported
  v1.1/v2 canonical programs fail `programSchema.parse`: `actionSchema` in
  `agent/src/lean-types.ts` accepts only `back|newOrderLine`, not the core's
  `requestPriorAuth` action. The shared-composer and service request buttons fail at
  their `components[*].kind` action. Add the real constructor to the
  action schema (and the `priorAuth` kind to the known union if desired), then
  parse all `releases/{v1,v1.1,v2}/{spec,canonical}.json` without dropping
  fields. This was found with actual exports; the existing 31 agent tests pass.
- **CR-13 — pre-op encounter context (world/app/sim).** Set
  `Facts.encounterKind? := some "preop"` (JSON `encounterKind: "preop"`)
  during pre-op ordering. Core passes `FactsContext.encounterKind` through
  FHIR projection. Content no longer uses a separate `signPreOpOrders`
  commit: W6 uses ordinary `signOrders`, with the pre-op consent/H&P/hold-meds
  and anticoagulant requirements scoped by that episode fact. Test both
  incomplete pre-op rejection and ordinary post-op success. World/app currently
  have no `encounterKind` references; do not claim end-to-end pre-op enforcement
  until callers supply this fact.


## Core integration notes (historical checker request numbers above)


The core queue is landing on `lane/lean-core`, one commit per item. See
`docs/design/changes.md` for the full semantics and compatibility list.

- **CR-1 resolved:** `currentLineComplete` guards `newOrderLine` for humans
  and macros. Checker may replace its blanket rejection with this hard-stop
  semantics. No new action/event was needed.
- **Alert clicks resolved:** human clicks open the clicked alert's first pending
  popup candidate, never acknowledging it; passive alerts remain inline. Macro
  clicks are `blocked "human only: acknowledge"`. Only a human matching
  `ack` on the current popup acknowledges it; removed inline alerts do not
  disable spec interruptive alerts.
- **CR-2:** retain checker's conservative `unlessReceipt` pin rule. Core
  visibility and commit-specific receipt validity are unchanged.
- **CR-3 resolved in core:** `AlertSpec.screens` now lists workflow tags.
  Checker: use `AlertSpec.targetsScreen` on candidate screens, and require
  inline coverage for each matching screen, regardless of screen IDs. Content:
  spread passive components across the targeted workflows; the old canonical
  places them on only selected screens. Do not narrow the coverage property.
- **CR-4 already resolved:** `waivedBy?` and `waived` enforce a confirmed,
  nonempty human capture; T2 includes the human-waiver alternative.
- **Checker:** enforce `ElementSpec.recordFact?` for record prefills (none
  forbids a record source), and enter-once per workflow path. New `When` cases
  are `encounter kind` and `weightBased`; review their structural checks.
- **Content:** optional migration of pre-op requirements from signPreOpOrders
  to signOrders can now use `When.encounter "preop"`; doseCheck may use
  `When.weightBased`. Preserve all existing safety requirements when migrating.
- **World/sim:** replace overloaded note strings with the new optional typed
  fields: OrderChoice supplyDays/curesExemptReason/holdReason, TaskChoices
  painScore/w6Step/refillReason. W6Step is consult/preop/postop/rounding/discharge.
  Set FactsContext.encounterKind for the episode; it is not inferred from old
  encounter history. Medication drug strings are lowercase generic names.
- **Prior-auth release content/world:** use OrderKind imaging/procedure and
  OrderChoice.code (empty drug) for CMS-0057-F service orders. The release spec
  must declare orderKind/orderCode fields; the core recognizes them as orders
  for prior-auth requests without passing service codes to drug alerts.
- **World:** generic caps use the largest per-drug absolute cap; amoxicillin's
  1000 mg regimen cap remains distinct from its 2000 mg drug maximum. Any
  future need for regimen-specific dose checking needs an explicit spec model.

---

## Release integration requests (other lanes)

- **CR-9 — medical-service prior-auth slots (core/agent).** The current
  `requestPriorAuth` action requires a `drug` on the current slot. CMS-0057-F
  covers medical items/services, not drugs. The shared-composer demo records
  an optional ServiceRequest-target request but cannot yet represent an
  imaging-only order slot. Add service-order identity to the core model before
  claiming an imaging API implementation. Medication support anticipates
  proposed CMS-0062-P. No content safety obligation depends on this feature.
- **CR-10 — antibiotic indication data rows (render/app/world).** Content now
  declares element/info `abxIndication`, the per-line coded value written to
  `MedicationRequest.reasonCode`, and a MAR panel beside the dose. Render
  each captured antibiotic line's indication in the sign summary, and the
  active medication's indication from the FHIR order on the MAR. Test facts
  use `Facts.record[("abxIndication", "surgical-prophylaxis")]`. Show the
  actual value, not just a heading. Core's `infoShown` proves panel visibility;
  it does not establish populated FHIR content. Preserve T11 fidelity.
- **CR-11 — coded terminology membership (core/check).** `ValueKind.coded`
  currently accepts any nonempty code. `abxIndicationCodes` and
  `curesExemptionCodes` are content value sets, not a proof of membership.
  For full terminology enforcement, provide a generic spec value-set mapping
  and validate at entry, confirm, and guard. Do not hard-code release/seed ids.
- **CR-12 — agent prior-auth action schema (agent).** The real exported
  v1.1/v2 canonical programs fail `programSchema.parse`: `actionSchema` in
  `agent/src/lean-types.ts` accepts only `back|newOrderLine`, not the core's
  `requestPriorAuth` action. The four request buttons fail at
  `screens[5|17|27|34].components[*].kind`. Add the real constructor to the
  action schema (and the `priorAuth` kind to the known union if desired), then
  parse all `releases/{v1,v1.1,v2}/{spec,canonical}.json` without dropping
  fields. This was found with actual exports; the existing 31 agent tests pass.
- **CR-13 — pre-op encounter context (world/app/sim).** Set
  `Facts.encounterKind? := some "preop"` (JSON `encounterKind: "preop"`)
  during pre-op ordering. Core passes `FactsContext.encounterKind` through
  FHIR projection. Content no longer uses a separate `signPreOpOrders`
  commit: W6 uses ordinary `signOrders`, with the pre-op consent/H&P/hold-meds
  and anticoagulant requirements scoped by that episode fact. Test both
  incomplete pre-op rejection and ordinary post-op success. World/app currently
  have no `encounterKind` references; do not claim end-to-end pre-op enforcement
  until callers supply this fact.

## Check acceptance after content release merge (`6a47bbe`)

Core's workflow-targeted passive alerts and record-source declarations are
integrated into the checker. Tiny's corrected example now pins passive alerts
on every W1 screen; the pin soundness proof uses `targetsScreen` too.

Canonical v1 still fails the role declarations and dosingWeight links from
check CR-5. Migrating pre-op requirements to ordinary `signOrders` adds a
third genuine failure: W1/W3/W5/etc. signOrders screens lack
`anticoagulantList`. For `Facts.encounterKind = preop`, those Sign buttons
are still shown and the pre-op review applies. `CommitScreenShowsReviews`
therefore requires the anticoagulant info on every shown signOrders screen,
or the UI must make incompatible Sign buttons unavailable for that context.
The checker cannot infer an encounter kind from a screen/workflow name.

## T8 statement coordination (check)

`Spec.Extends` preserves old prefixes while allowing new declarations and
catalog tags. Thus full `Satisfies new ... p → Satisfies old ... p` is not
monotone: a program using the new priorAuth kind is intentionally outside the
old catalog. The other direction fails when new requirements are added.
Please agree on preservation of **old safety obligations for compatible
programs**, or strengthen the relation to preserve the vocabulary, before
claiming a general Satisfies transport theorem. The concrete release-prefix
proofs in content establish the additive relation only.

### CR-6 checker containment

The checker now conservatively rejects an **active** `requestPriorAuth`
action under `humanOnlyKept` until its confirmed-capture preservation is
fixed. Disabled actions (unknown element or disallowed program role) remain
harmless; status components still use the shared catalog. This prevents a
known counterexample to T1. Remove/refine this extra rule only after proving
`EnteredOnce` and `HumanStepsByHuman` for the revised action. No property was
weakened. Prior-auth request certification remains unfinished, explicitly.

---



---

## Content response to checker acceptance requests

- The all-workflows `canonical.json` remains a source template. Deployable
  role projections are exported as `releases/<version>/personas/P1.json` …
  `P5.json` (physician, physician, RN, NP, surgeon). Their field/commit
  declarations and macro targets stay within the role. Interpreter paths
  still pass for the intended clinicians. Every seed starts from a matching
  role projection before its unsafe mutation is applied.
- All auto-linked canonical fields now use `.linked` with the spec's exact
  source (`weight`, `visitDiagnosis`). This resolves the check lane's
  LinkedNotRetyped concern without weakening that property. Repeated copies
  remain visible; no workflow screen is removed.
- **Agent integration:** select the persona canonical file for deployment;
  `loadRelease` currently reads only the all-workflows template. Do not certify
  the source template as a single-role program.
- **Checker CR-6 remains core/check work:** `requestPriorAuth` is still a
  human click capturing a never-prefill element, while HumanStepsByHuman
  currently names only `Event.enter`; repeated requests may overwrite a
  confirmed capture. No content prefill policy or safety property was weakened
  to conceal that mismatch. Resolve with owner-reviewed semantics/properties.
- **Episode/role domain:** a pediatric NP cannot verify surgical consent under
  the preserved consent role rule. An NP supplied a `preop` episode must stay
  blocked. Completability certification must honor valid persona/episode
  assignments; do not broaden consent permissions just to make it pass.

---


---

## World integration status

Core fb1ed8c supplies the requested typed fields, service order kinds and generic
absolute dose caps. World now emits the typed fields, imaging/procedure orders
and structured FHIR clinical observations, and validates all schedules through
Lean round trips.

The real population also includes Humulin 70/30, hydrocodone-only extended-release,
fentanyl, buprenorphine/naloxone and diazepam. World preserves these displays in
`otherMedDisplays` without substituting a different ingredient. If alert facts
need their classes or MME factors, lean-core/render should extend the authoritative
formulary/FHIR mapping.


## World follow-up: albuterol absolute cap (lean-core)

Please add `maxDoseMgTenths := 50` for albuterol in `Ehr/Formulary.lean`.
World's pediatric nebulizer regimen uses 0.15 mg/kg capped at 5 mg; the
remaining generic cap is currently 0 (unspecified). In the real seed-1 run,
52.5, 69.6 and 71.4 kg adolescents receive 5 mg, below the uncapped 0.1 mg/kg
minimum. These are the same heavy-child absolute-cap cases addressed by
fb1ed8c for the other pediatric drugs. Keep the mg/kg range and the 5 mg cap;
do not raise their doses or weaken the rule to hide the mismatch.

## Checker CR-6 resolution from core

Confirmed priorAuthRequest captures on the current slot are preserved exactly
by request clicks. For never/human-only elements a request click is blocked;
only ordinary human Event.enter may create that capture. Tiny v1.1 adds that
field and retains its never policy. This implements the existing literal
HumanStepsByHuman/EnteredOnce requirements without weakening either property.
Content's release program must expose the human field for such a declaration.

### CR-6 integrated and containment removed (`c98cfaf`)

The checker has now proved `requestPriorAuth_preserves_confirmed` and
`requestPriorAuth_no_human_capture` in `Check/RequestSound.lean`, with axiom
audits. The temporary active-request rejection is removed. The extended Tiny
catalog/program acceptance regression passes with the revised action. Human
never-policy requests use an explicit field, as core's new semantics require.
The safety properties are unchanged.

### Persona canonical diagnostic (`b366a59`)

P3 (RN) passes every checker rule. P1/P2/P5 fail only the signOrders
anticoagulant pin described above. P4 also lacks a reachable/permitted consent
field for a preop episode. Links and role declarations now pass. These are
facts about the current full quantified properties; check does not silently
restrict their patient/episode domain.

### Completability waiver edge case

`completeVia` now checks that an unpinned review's waiver kind can always
supply a nonempty value. Wristband/medication scan codes may be empty for
records allowed by the current domain assumption; a matching empty scan is
valid input but fails `waived`'s nonempty test. Such scans cannot be the sole
waiver path. Text, code, quantity, flag, identity, cosign and other scan
targets have nonempty witnesses. Canonical's coded CURES exemption is safe.

### Content follow-up required for core `c98cfaf`

The full build now fails exactly four guards in `Canonical/ReleaseTests.lean`
(lines 14, 15, 25, 26): medication and service-order prior-auth paths still
expect a click to create a never-policy capture. Please expose the ordinary
`priorAuthRequest` human field in release composers and test entering it,
then test the convenience click preserves that confirmed capture. Keep the
never policy and safety properties; do not restore implicit capture on click.
Checker request-action proofs now pass and the temporary rejection is gone.

---


## Render → wasm: Lean 4.35 wasm32 string-list terminator (2026-10-31)

Valid ehr_facts crashed even on a Patient-only Bundle. Debug stack traces
identified lean_string_mk called by Fhir.sub. In the pinned runtime
src/runtime/object.cpp, string_to_list_core initializes its List.nil with
`lean_box_uint32(0)`; wasm32 lean_box_uint32 allocates a constructor, whereas
lean_string_mk traverses until lean_is_scalar. It therefore reads beyond the
nil object (OOB or bad_alloc). Native 64-bit boxes UInt32 as a scalar, masking
the bug. Please fix/validate the wasm32 runtime input upstream in your lane.
Render uses a structural List.foldl String.push reconstruction for sub/initials
instead of String.ofList; this preserves the source semantics and avoids the
mismatched runtime primitive. Other lanes using String.ofList after toList
should be regression-tested on valid data too.

## Render → app: generated WASM assets and lint (2026-10-31)

After the required wasm/install-into-app.sh, plain `pnpm --filter app lint`
scans gitignored generated public/ehr/ehr-interp.mjs and reports 88 vendor-code
errors (including Emscripten's fetch implementation). Please ignore
`public/ehr/**` in app/eslint.config.js, keeping all source/test boundary
checks unchanged. `pnpm --filter app lint --ignore-pattern 'public/ehr/**'`
passes; app build and all unit tests also pass. Render cannot edit app-owned
configuration. Installed assets are retained for actual runtime verification.

## New BRIEF value-constraint request (content → core)

**Resolved in core and content:** core `4a11bc8` implements generic `EntryReq.allowed?` and the `scheduleII` class. Content attaches `scheduleIIRefillsEntry signOrders` with `allowed? := some ["0"]`, preserving every prior rule. Canonical fields allow zero, all matching signing paths inherit the requirement, and seed 16 confirms its default of three and is blocked. Tests also cover mixed lines, the new-line stop, Schedule III/IV exclusions, correction to zero, and inheritance by v1.1/v2. No `controlled-II` alias is used: `scheduleII` is the authoritative core spelling. Downstream agent/world/WASM adoption remains below.

**Checker CR-6 is now resolved in core (`c98cfaf`).** Content is exposing the
never-policy human request field and preserving the policy. Tests check that
convenience clicks neither forge nor overwrite the human capture.

## New BRIEF immunization integration

Content now requires `visEditionDate`, `vaccineManufacturer`, and
`vaccineProvider` as well as the existing vaccine, lot, route/site and VIS flag.
The W5 UI exposes all fields and its interpreter test records them. World/sim
and FHIR write adapters must supply the actual vaccine inventory manufacturer,
administering provider and VIS edition date. The entry guard establishes their
capture, not actual prior delivery of the VIS or full statutory record content.

## World regression from core albuterol-cap merge

`pnpm --filter world test` now runs 92 tests: 91 pass, one fails in
`world/test/synthea.test.ts:114`. Lean albuterol `maxDoseMgTenths = 50`, while
world's FORMULARY still gives `maxDoseTenths = 0`. Synchronize the TS reference
to the already-requested 5 mg absolute cap; do not weaken the assertion or
remove the cap. World typecheck and lint pass. Content did not edit world files.

## Schedule II zero refills: adoption by content, check and agent

Core now exposes `EntryReq.allowed? : Option (List String)` (optional JSON key
`allowed`) and `When.drugClass cls` (JSON `{ "drugClass": { "cls": ... } }`).
`orderClass` remains supported with identical semantics. Allowed strings are
parsed with the element's kind and compared to the very capture satisfying the
confirmation, human-entry and unit checks. `none` preserves the old behavior;
`some []` permits no value. Numeric refills use `some ["0"]`, not tenths `"0.0"`
(the latter is equivalent but less readable). A confirmed default of three is
blocked with `value not allowed: refills (allowed: 0)`. Per-line matching and
the `newOrderLine` hard stop both enforce the constraint.

**Content:** apply this owner-approved rule to every order-signing commit
(including pre/post-op and refill-modification paths) in the applicable specs:

```lean
{ commit := c.id, element := "refills", when := .drugClass "scheduleII",
  perOrderLine := true, allowed? := some ["0"] }
```

Keep refills as `.quantity .none`. The formulary now tags morphine,
hydromorphone, oxycodone and hydrocodone-acetaminophen with `scheduleII`.
Tramadol, lorazepam and alprazolam remain controlled-II-IV and are not scheduleII.
The source is 21 CFR 1306.12(a):
https://www.ecfr.gov/current/title-21/section-1306.12 . Preserve each existing
requirement and add the permanent bad-program-16 regression and rule citation.
Core's `CoreTests.ScheduleII` and generated `scheduleIIRefillsRequirement` /
`scheduleIIRefillsSpec` are executable adoption examples, not a replacement for
content's hospital spec.

**Check:** ensure completability respects constrained values and reports
unrepairable defaults/macros rather than accepting a mere confirmed capture.
A default of three must not satisfy the zero-refills requirement. Test mixed
order lines and zero entered on the wrong slot. No property may be weakened.

**Agent:** extend `whenSchema` in `agent/src/lean-types.ts` with `drugClass` and
preserve optional `entries[].allowed` with the existing `dropNulls` convention.
Its current zod object strips the new constraint and rejects the new condition.
Add exact schema round trips for the two new generated samples. Generated TS
already includes the constructor and optional list. No agent files were edited
by lean-core because of lane ownership.

**WASM:** rebuild interpreter artifacts after merging the core guard change;
the checked-in app binary predates this constraint. Use native/WASM equivalence
coverage for confirmed nonzero Schedule II refills and mixed-line constraints.


**World compatibility blocker (validated after the core change):**
`pnpm --filter world test` now reports 91 passing tests and one failure in
`test/synthea.test.ts`'s full formulary equality contract. Append `"scheduleII"`
to the `classes` arrays in `world/src/formulary.ts` for morphine,
hydromorphone, oxycodone and hydrocodone-acetaminophen, matching the order in
Lean. Keep the equality contract unchanged. World's albuterol cap is already
5 mg and agrees with the new Lean cap. The exact world/agent compatibility
patch is prepared locally at `/tmp/lean-core-compat.patch`; the requested
ownership exception is pending. Core implementation commits are `0b929f0`
(albuterol) and `4a11bc8` (constraints, proofs and regenerated TypeScript).

Validation of `4a11bc8`: Lean build, kernel check, Comparator (all 18 frozen
statements), 24 permitted-only axiom audits, and generated-sample strict tsc
pass. Workspace builds/typechecks/lints pass; agent 31/app 90 tests pass.


## World compatibility resolution (2026-10-31)

Resolved in `0454841` after merging main through `bea74d0`: world's formulary
now mirrors the 5 mg albuterol cap and all four `scheduleII` classes exactly.
The full equality contract remains intact, with an additional DEA Schedule II
correspondence assertion. Lean build and world build/lint/all 92 tests pass.
Seed-1 ten-day regeneration produces no changes to `runs/world/1`.

## Value-constraint integration in check

The world reference fix brings core's `EntryReq.allowed` API into this lane.
`EntryMetIn` now requires the **same** captured value to satisfy both its kind
and the parsed allowed-value constraint. This strengthens the property to
match the new guard; `entryMet_iff` is re-proved against that implementation.
Completability also checks a common universally valid scalar value across
constraints on the same element, with nonempty values for waiver elements.
Empty, unparseable and conflicting allowed lists are rejected. Fixed allowed
lists for record-dependent identity/scan/cosign values are conservatively
rejected; no clinical permission or guard is relaxed. Zero-refill quantities
are supported generically.

---

## Content integration completion and remaining owners (2026-10-31)

Content's Schedule II rule is implemented and regenerated in all three release specs. `lake build` passes the actual canonical/seed/release paths. This resolves the previous content blocker, not the production checker's certification obligations.

**CR-14, render: controlled prescription details must contain actual data.** `controlledRxReview` requires `orderSummary` shown, with no receipt or waiver, for controlled-II-IV signing. `InfoSpec.orderSummary` now explicitly denotes patient, drug, dose, quantity, directions and refills. At merged main `bea74d0`, `Render/Page.lean:infoContent` has no `orderSummary` arm and falls back to an empty-content message. Please render the actual current captured prescription rows and patient identity; test all these values, multiple lines, and hidden/collapsed seed 15 in the native/WASM page. A heading alone satisfies only the interpreter's abstract info visibility, not the legal display duty. The same data-fidelity issue for v2 indications is CR-10. No content file can implement the render-owned arm.

**Agent compatibility remains required.** Actual release specs now contain `{ "drugClass": { "cls": "scheduleII" } }` and `allowed: ["0"]`; `agent/src/lean-types.ts` must accept and preserve both. Existing 31 agent tests pass but do not test these actual release-spec round trips. CR-12 (`requestPriorAuth` action) also remains; round-trip all release/persona programs and specs exactly.

**World compatibility:** the albuterol cap is already fixed on merged main. Current world build/lint pass; 91/92 tests pass. The one failing full-formulary comparison is the missing `scheduleII` class on morphine (and the three other Schedule II drugs listed in the core adoption request). Keep that assertion and synchronize world-owned reference data; content has not edited it.

**Vaccine integration:** required VIS edition, manufacturer and provider fields are declared and tested; every omission and a false VIS flag block recording. The flag explicitly attests that VIS was given before vaccination. No trusted delivery event/timestamp is modeled. World/app/sim must populate inventory/provider and actual statutory dates/details in the FHIR record; manual human provider entry is supported, so no unverified signed-in-user auto-link was added.

**Check/app/WASM:** certify matching persona canonicals from `releases/<version>/personas/`, reject all sixteen permanent seeds with replayable counterexamples, and rebuild/test WASM against the allowed-value guard. Seed 16 confirms a default of three and strands that value on a sign screen with no navigation or correction field. Tests verify there are no outgoing navigation edges and attempts to edit the hidden composer field are ignored. Restoring canonical navigation allows human correction to zero; the guard is never relaxed. No checker implementation exists in this merged worktree, so content does not claim a `¬ Satisfies` theorem or production certificate.

**W7 scope clarification:** the original W7 `approveRefill` decision uses `refillRefills` and the requested drug in `Facts.medToGive?`, not the `refills`/`orderLines` signing representation requested for the owner-approved Schedule II addition. Do not claim that the new per-line rule alone certifies the separate refill decision. Any adapter that creates a modified controlled prescription must route it through the ordinary `signOrders` requirements (or request an explicit equivalent workflow rule); this prevents bypassing the controlled-detail and zero-refill gates. No new refill-decision rule has been inferred from guidance.

### Linked prefill type preservation

Linked prefill copies values without conversion. Check now requires known
source/target elements with equal kinds, including quantity units. A kg weight
cannot silently become an mg dose. This also prevents malformed linked values
from being archived behind `newOrderLine` and then becoming impossible to
restore through a correctly typed input. Canonical's weight and diagnosis
links have matching kinds. This is an extra conservative checker rule; no
property or interpreter guard is weakened.

Macro attempts to invoke a never/human-required prior-auth request are also
rejected under `humanOnlyKept`, matching the revised human-entry API.

### Archived fixed-slot writes and proof limits

The completion audit found another repair obligation: after `newOrderLine`,
a fixed-slot field can still modify an archived line, including a macro
making its capture unconfirmed or a dose/frequency change triggering the
naloxone requirement. A current-slot input cannot repair that older slot.
`repairSlots` now includes fixed writers of per-line requirement elements
and dose/frequency dependencies of per-line naloxone conditions. Each such
slot needs reachable, revealable fields for the per-line requirements.
The receipt-hidden archived-dose regression is rejected. This strengthens
the checker and does not change any clinical requirement or interpreter guard.

The proof status also distinguishes BRIEF T7 from replay validation. The
finished T7-labelled lemmas prove a real successful navigation prefix and a
failed checker rule, with an optional final triggering click. They do not
prove that a cut path visits the violation or that every conservative
rejection witnesses the named semantic property. Full T7 is still open.

All original fourteen seeds have negative property proofs once the separate
`bad13_preop_not_satisfies` diagnostic is included. That theorem explicitly
uses the shared pre-op anticoagulant display defect, not the CURES mutation;
the requested mutation-specific seed-13 completeness witness is still missing.
`Ehr/Check/Seed13Escape.lean` now demonstrates the escape through real events:
from the blocked W1 controlled order, visit W3, show its CURES tab, mark the
report reviewed, return to W1, and sign the original controlled order using
that fresh receipt. No drug change or safety exemption is used. Both the
receipt and successful commit are permanent interpreter regressions.
Seed 15 has its own controlled-detail display witness. The original expected
labels for seeds 3, 9 and 10 also differ from their actual encoded defects:
unknown field (`writesOnly`), attempted macro commit (`humanOnlyKept`), and
unknown alert (`wellFormed`). Runtime-generated interruptive alerts survive
removing a UI alert component, as required by the preserved safety model.

**CHECK-REPLAY (core/app/check): property-specific replay evidence.** The public
violation currently carries events and screen IDs but no patient/user
witness. Check's fixed replay record has no pre-op encounter, so a real
navigation path to the missing anticoagulant panel does not itself
demonstrate the conditional pre-op review failure on that record. To finish
BRIEF T7, agree how violations carry/reproduce the witness facts and user,
and distinguish conservative static-rule rejections from runs demonstrating
a named semantic failure. Check must additionally prove the latter for each
supported finding; successful navigation alone is insufficient. This is a
request for the owning API/app lanes, not a change to their files here.

**T8 direct obstruction (content/check):**
`Ehr/Check/MonotonicityObstruction.lean:T8_unqualified_false` now refutes the
unqualified statement directly, without assuming general T1. An empty task
family gains a status info and the new `priorAuth` catalog kind. The later
program fully satisfies all twelve properties (completion is vacuous because
there are no commits), yet fails the old catalog. The release meets the
current `Spec.Extends`. Owner agreement on an old-vocabulary compatibility
condition or an old-obligations projection is needed; asserting full T8 as
written would be false. No property or Extends definition was changed here.
