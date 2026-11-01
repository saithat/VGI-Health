# Cross-lane change requests

## Sim → lean-core / world: typed task choices (2026-10-31)

The sim lane merged `origin/main` and `origin/lane/lean-core`. Please add typed
`TaskChoices.curesExemptReason?`, per-drug supply days, naloxone response and
surgical phase/assessment choices, and populate these in world schedules.
The simulator must not interpret `noteSections` strings as exemption or supply
facts. Core has now landed these optional fields in `fb1ed8c`; sim is integrating
the exact names. Naloxone patient-response choices are still requested. W6 needs to distinguish
`signPreOpOrders` from `signOrders`; W4 assessment tasks need `chartAssessment`.
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

1. With `priorAuthRequest.prefill = never` (as in Tiny v2), a human's
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
  v2 declares optional `orderKind` and `orderCode` fields. W1 service ordering
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
  v2 and v3 all use them. `surgery-7-day` replaces `surgery-5-day` per
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
  v2/v3 canonical programs fail `programSchema.parse`: `actionSchema` in
  `agent/src/lean-types.ts` accepts only `back|newOrderLine`, not the core's
  `requestPriorAuth` action. The shared-composer and service request buttons fail at
  their `components[*].kind` action. Add the real constructor to the
  action schema (and the `priorAuth` kind to the known union if desired), then
  parse all `releases/{v1,v2,v3}/{spec,canonical}.json` without dropping
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
  v2/v3 canonical programs fail `programSchema.parse`: `actionSchema` in
  `agent/src/lean-types.ts` accepts only `back|newOrderLine`, not the core's
  `requestPriorAuth` action. The four request buttons fail at
  `screens[5|17|27|34].components[*].kind`. Add the real constructor to the
  action schema (and the `priorAuth` kind to the known union if desired), then
  parse all `releases/{v1,v2,v3}/{spec,canonical}.json` without dropping
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

## Sim validation → app: mock DecisionRecord screenCheck (2026-10-31)

App build and lint pass after main merge `b0aad8b`, but `pnpm --filter app run test`
fails loading dashboard fixtures: Zod expects `DecisionRecord.screenCheck`, absent
from `runs/mock/decisions` (and/or break records). Please regenerate the app-owned
mock run against the current agent schema. The sim lane has not edited these
artifacts. Agent's 31 tests and world's 52 tests pass.
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
only ordinary human Event.enter may create that capture. Tiny v2 adds that
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

## Sim → content: prior-auth guard integration is blocking full build

After merging world/core through `c98cfaf` and content through `6cdab91`,
`lake build` fails six guards in `Ehr/Canonical/ReleaseTests.lean` (14, 15,
25, 26, 38, 42). `priorAuthRequest.prefill = never` correctly requires a human
`enter`; `requestPriorAuth` clicks are now blocked for never/human-only values.
Please expose the human priorAuthRequest field in medication/service composers
and update the positive release paths to use `Event.enter ... (.flag true)`.
Keep negative coverage that a convenience request click cannot create a
never-policy capture. Do not change the spec's never policy or relax the core
hard stop to satisfy the old click-based tests. Sim's modules and T9 proofs
build with the new core; the release guards are outside sim ownership.

**Resolved by owner-authored changes merged from main.** Content now exposes
human controls and tests human entry without weakening the never policy.
The proposed sim-owned patch was removed as obsolete. Main also includes the
app owner's `screenCheck` compatibility fix; neither needs user approval.

## Sim replay → content/world: preserve blocked scenario work

Seed 1 day 1, role-projected canonical v1, seed 123:
P1 completes 39/42; P2 0/22; P3 38/38; P4 22/22; P5 14/18.
Every completed task passes all floor inequalities and keeps every interruption.
The simulator reports these incomplete tasks; it does not drop their goals.

- **Content, W3 documentation:** task choices request note sections and sim's
  existing W3 mapping requires `signNote`. W3 has no signNote button and lacks
  required note fields such as `ros`. Please provide a complete ED note-signing
  path with all unchanged spec requirements. Do not remove the goal or weaken
  signNote to obtain a completion number. All 22 day-1 ED tasks expose this.
- **World/content, service versioning:** day-1 P1 tasks W1-006, W1-010, W1-015
  and four P5 W1 tasks include typed imaging/procedure orders. Spec v1 has no
  orderKind/orderCode; those are introduced by v2. World's handoff says service
  orders occur after day 4, but the committed day-1 schedules contain them.
  Either align the scenario timing with the release, or obtain owner approval
  for baseline service-order support. Sim cannot invent medication orders or
  mark uncaptured services complete.

Reproduce with `python3 lean/Ehr/Sim/cli_smoke.py --days 1 --report /tmp/sim.json`
after a successful full build. Use `--require-complete` to fail on any blocked
scenario in addition to determinism, floor and interruption failures.

## Sim navigation correction / refill alert context

The W2/W3 missing local composers reported above are **not a completability
block once cross-workflow navigation is allowed**: the shared W1 order/note
composers remain reachable through Home and satisfy the same unchanged goals
and guards. Sim removed its own overly narrow workflow-navigation restriction.
A local ED path is still a UI improvement, not a reason to drop signNote.

A separate core/content gap remains: W7's interaction rule reads drugs in play,
but the refill UI captures no `drug`, and init does not derive a refill drug from
the FHIR Task focus. Thus an uncaptured proposed modification cannot fire that
alert. Sim's floor now uses actual goal captures, rather than raw uncaptured
order choices; this is a program-independent derivation, not a runtime clamp.
Core/render/content should agree on explicit prescription context for refill
interaction checking. Do not fabricate a MedicationAdministration or weaken the
interaction condition to address this.

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

**Resolved in core and content:** core `4a11bc8` implements generic `EntryReq.allowed?` and the `scheduleII` class. Content attaches `scheduleIIRefillsEntry signOrders` with `allowed? := some ["0"]`, preserving every prior rule. Canonical fields allow zero, all matching signing paths inherit the requirement, and seed 16 confirms its default of three and is blocked. Tests also cover mixed lines, the new-line stop, Schedule III/IV exclusions, correction to zero, and inheritance by v2/v3. No `controlled-II` alias is used: `scheduleII` is the authoritative core spelling. Downstream agent/world/WASM adoption remains below.

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

**CR-14, render: controlled prescription details must contain actual data.** `controlledRxReview` requires `orderSummary` shown, with no receipt or waiver, for controlled-II-IV signing. `InfoSpec.orderSummary` now explicitly denotes patient, drug, dose, quantity, directions and refills. At merged main `bea74d0`, `Render/Page.lean:infoContent` has no `orderSummary` arm and falls back to an empty-content message. Please render the actual current captured prescription rows and patient identity; test all these values, multiple lines, and hidden/collapsed seed 15 in the native/WASM page. A heading alone satisfies only the interpreter's abstract info visibility, not the legal display duty. The same data-fidelity issue for v3 indications is CR-10. No content file can implement the render-owned arm.

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
## App UI browser integration request (2026-10-31)

The live offline EHR now uses the actual `ehr_facts`, init/step/view envelopes and
`ehr_render` exports; all committed programs render through WASM. No Lean source
was changed in this lane.

**Checker CLI owner:** the current `lean/.lake/build/bin/ehr` usage has no `check`
command. Please expose `ehr check --spec <spec.json> --program <program.json>`
with a JSON verdict on stdout and document it in command usage. The app's
`pnpm --filter app verdicts` discovers all programs, invokes that contract if
advertised, and otherwise records “verdict not computed”. Mock certificates
are never substituted. This request does not block live interaction.
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

## Sim final integration status (2026-10-31)

Main's owner-authored prior-auth and app fixture changes resolve the historical
build blockers above. Shared W2/W3 composers work through Home. The verified
ten-day sweep before the latest merge completed 1271/1284 tasks, with all 13
incomplete tasks being P1/P5 service orders requested before v2. The fresh sweep
after the merge confirms the same counts, with zero floor/interruption violations;
results are committed in lean/Ehr/Sim/validation.json. The service versioning and W7
prescription-context requests remain open; no clinical goal or guard was removed.

Validated sim snapshot `5383fc4` includes main `cccd64e`. Shared refs subsequently
advanced to catalog main `f3dd0c2` and clinical/payload core `7e527f6`; those newer
contracts require a fresh integration/replay rather than inheriting the earlier
pass results. Catalog W7 now declares drug capture, so reassess that request
after integration instead of applying the obsolete workaround.
## CR-15: full catalog content adoption (content → render/app/world/sim/check/wasm)

All 124 `fit: spec-data` rows are now v1 data, inherited by v2/v3. See
`lean/Ehr/Specs/Rules/{Cms,Title22,CaStatutes,Federal,Entrenched}.lean`, the
catalog `encodedIn` mappings and `Canonical/RulePlacements.lean`. Content did
not edit other lanes. This request supersedes the earlier sixteen-seed counts.
There are now 24 permanent mutations; content walks test all artifact actions.

**Render:** add actual `infoContent` bindings for `resultAbnormalFlags` and all
13 `controlledSigning*` ids. Their precise contracts are in catalog
`displayContent`, the InfoSpec docstrings, and `docs/rules/catalog.md`. Iterate every
selected prescription line; bind name/address/strength/form/directions/DEA to
that artifact's captures and actual issue date to trusted artifact metadata.
The earliest-fill value belongs to a later series member, never issue date.
Render the exact §1311.140(a)(3) attestation immediately above Sign. Every
result component needs value/range and explicit normal/abnormal status. Keep
these panels expanded through signing. `Render.Page.infoContent` currently
falls back to an empty message for these ids (as it still does for
`orderSummary`, CR-14). Content pins every identifier, but does not claim that
its abstract visibility proves payload fidelity. Test actual values and
multiple rows in native/WASM output, including bad seed 22.

**Core/world reference-data owners:** the finite formulary currently has no
`controlled-V` or `ghb` products. Add correct tags only to actual supported
products, with world's reference data synchronized; don't tag an unrelated
demo drug to activate a condition. The new rules for those classes are
encoded but dormant for today's finite formulary. All supported Schedule II
and IV examples continue using their existing tags.

**App/world/sim adapters:** implement exclusive artifact effects for the new
CommitSpec ids. A signScheduleIISeries/signEmergencyRxFollowup or direct/bedside/
self-administration authorization cannot bypass ordinary signing: content
inherits all original entries, pre-op conditions, reviews and signing alerts,
plus new prescription content and v3 antibiotic indication. Map each field's
FHIR target as documented; never persist an artifact through an unguarded
button. New scoped documents attest one artifact only. Fresh episodes/reset
are needed between physical events; retained captures do not certify repeated
restraints, shifts, doses, consent events or actual deadlines. Dates here are
nonempty ISO-labeled strings; date validity, elapsed time, expiry and lawful
eligibility remain the catalog's core-feature work.

W7 now captures `drug` and human `refillScheduleEligibility` before approval,
with an allowed `notScheduleII` value, and has a distinct denyRefill action
requiring decision=deny and a reason. A new prescription routes through
w7Orders → w7Sign/signOrders. Preserve the distinct backend effects; don't
interpret a denial as prescription issuance. This is a human eligibility
attestation, not a new automatic request-drug predicate.

**Core/check:** `currentLineComplete` currently checks every per-line entry
across all commits. Consequently series earliest-fill and controlled readiness
must be available on ordinary composers too. Content exposes them rather than
relaxing the stop. If artifact scoping is added, retain all active-commit
requirements and prove/test both line advancement and signing. The checker
must handle 24 bad programs, all new commits, allowed values, inherited alerts,
and pinned no-receipt panels without changing any property. Certification,
semantic rejection lemmas and replayable checker counterexamples remain check
work; content's executable regression oracles are not a soundness theorem.

**Agent/WASM:** adopt the actual generated releases and persona programs,
preserve every `allowed` value and condition, rebuild WASM and repeat
native/WASM equivalence and rendered hard-stop checks. The existing schema
round-trip requests CR-12/14 still apply.

**Stricter rule retained:** the plan suggested replacing the old required
`naloxoneEducation` flag with alternative outcomes. The owner explicitly
forbids weakening an existing rule. Content retains that flag and human
naloxoneOffer, adding the human outcome enum alongside them. A declined/prior
education outcome alone therefore does not bypass the older stricter flag.

## CHECK-2026-10-31: expanded canonical certification blockers (content/app)

All fifteen release/persona candidates reject in the real `ehr check` CLI. Keep the properties unchanged. This pin audit enumerates missing nonwaivable reviews; conditionally applicable reviews still range over all patient records.

### v1

- P1, P2, P4, P5: `w1Sign` / `signOrders` lacks a pinned `anticoagulantList` review.
- P1, P2, P4, P5: `w3Sign` / `signOrders` lacks a pinned `anticoagulantList` review.
- P1, P2, P4, P5: `w3Disposition` / `discharge` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w3Disposition` / `discharge` lacks a pinned `allergyList` review.
- P1, P2, P4, P5: `w5Sign` / `signOrders` lacks a pinned `anticoagulantList` review.
- P1, P2, P4, P5: `w6PostOp` / `signTreatmentOrder` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w6PostOp` / `signDietOrder` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w6Rounding` / `signProgressNote` lacks a pinned `currentMeds` review.
- P1, P2, P4: `w6Discharge` / `disposition` lacks a pinned `vitals` review.
- P1, P2, P4, P5: `w3Restraint` / `signRestraintOrder` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w4Restraint` / `signRestraintOrder` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w4SelfAdministration` / `authorizeSelfAdministration` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w4SelfAdministration` / `authorizeBedsideMedication` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w4SelfAdministration` / `authorizePatientOwnedMedication` lacks a pinned `currentMeds` review.
- P1, P2: `w6Anesthesia` / `signAnesthesiaRecord` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w6StandingOrders` / `signStandingOrder` lacks a pinned `currentMeds` review.
- P1, P2: `w6Recovery` / `signPostAnesthesiaNote` lacks a pinned `currentMeds` review.
- P1, P2: `w5OxygenOrder` / `signNewbornOxygenOrder` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w3DirectDispense` / `authorizeDirectDispensing` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w6DirectDispense` / `authorizeDirectDispensing` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w7Sign` / `signOrders` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w1EmergencyRxFollowup` / `signEmergencyRxFollowup` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w3EmergencyRxFollowup` / `signEmergencyRxFollowup` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w5EmergencyRxFollowup` / `signEmergencyRxFollowup` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w6EmergencyRxFollowup` / `signEmergencyRxFollowup` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w7EmergencyRxFollowup` / `signEmergencyRxFollowup` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w1ScheduleIISeries` / `signScheduleIISeries` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w3ScheduleIISeries` / `signScheduleIISeries` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w5ScheduleIISeries` / `signScheduleIISeries` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w6ScheduleIISeries` / `signScheduleIISeries` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w7ScheduleIISeries` / `signScheduleIISeries` lacks a pinned `currentMeds` review.
- P1, P2, P3, P4, P5: `w3SuicideAssessment` / `signSuicideRiskAssessment` lacks a pinned `currentMeds` review.
- P1, P2, P3, P4, P5: `w4SuicideAssessment` / `signSuicideRiskAssessment` lacks a pinned `currentMeds` review.

### v2

- P1, P2, P4, P5: `w1Sign` / `signOrders` lacks a pinned `anticoagulantList` review.
- P1, P2, P4, P5: `w3Sign` / `signOrders` lacks a pinned `anticoagulantList` review.
- P1, P2, P4, P5: `w3Disposition` / `discharge` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w3Disposition` / `discharge` lacks a pinned `allergyList` review.
- P1, P2, P4, P5: `w5Sign` / `signOrders` lacks a pinned `anticoagulantList` review.
- P1, P2, P4, P5: `w6PostOp` / `signTreatmentOrder` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w6PostOp` / `signDietOrder` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w6Rounding` / `signProgressNote` lacks a pinned `currentMeds` review.
- P1, P2, P4: `w6Discharge` / `disposition` lacks a pinned `vitals` review.
- P1, P2, P4, P5: `w3Restraint` / `signRestraintOrder` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w4Restraint` / `signRestraintOrder` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w4SelfAdministration` / `authorizeSelfAdministration` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w4SelfAdministration` / `authorizeBedsideMedication` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w4SelfAdministration` / `authorizePatientOwnedMedication` lacks a pinned `currentMeds` review.
- P1, P2: `w6Anesthesia` / `signAnesthesiaRecord` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w6StandingOrders` / `signStandingOrder` lacks a pinned `currentMeds` review.
- P1, P2: `w6Recovery` / `signPostAnesthesiaNote` lacks a pinned `currentMeds` review.
- P1, P2: `w5OxygenOrder` / `signNewbornOxygenOrder` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w3DirectDispense` / `authorizeDirectDispensing` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w6DirectDispense` / `authorizeDirectDispensing` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w7Sign` / `signOrders` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w1EmergencyRxFollowup` / `signEmergencyRxFollowup` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w3EmergencyRxFollowup` / `signEmergencyRxFollowup` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w5EmergencyRxFollowup` / `signEmergencyRxFollowup` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w6EmergencyRxFollowup` / `signEmergencyRxFollowup` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w7EmergencyRxFollowup` / `signEmergencyRxFollowup` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w1ScheduleIISeries` / `signScheduleIISeries` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w3ScheduleIISeries` / `signScheduleIISeries` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w5ScheduleIISeries` / `signScheduleIISeries` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w6ScheduleIISeries` / `signScheduleIISeries` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w7ScheduleIISeries` / `signScheduleIISeries` lacks a pinned `currentMeds` review.
- P1, P2, P3, P4, P5: `w3SuicideAssessment` / `signSuicideRiskAssessment` lacks a pinned `currentMeds` review.
- P1, P2, P3, P4, P5: `w4SuicideAssessment` / `signSuicideRiskAssessment` lacks a pinned `currentMeds` review.

### v3

- P1, P2, P4, P5: `w1Sign` / `signOrders` lacks a pinned `anticoagulantList` review.
- P1, P2, P4, P5: `w3Sign` / `signOrders` lacks a pinned `anticoagulantList` review.
- P1, P2, P4, P5: `w3Disposition` / `discharge` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w3Disposition` / `discharge` lacks a pinned `allergyList` review.
- P1, P2, P4, P5: `w5Sign` / `signOrders` lacks a pinned `anticoagulantList` review.
- P1, P2, P4, P5: `w6PostOp` / `signTreatmentOrder` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w6PostOp` / `signDietOrder` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w6Rounding` / `signProgressNote` lacks a pinned `currentMeds` review.
- P1, P2, P4: `w6Discharge` / `disposition` lacks a pinned `vitals` review.
- P1, P2, P4, P5: `w3Restraint` / `signRestraintOrder` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w4Restraint` / `signRestraintOrder` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w4SelfAdministration` / `authorizeSelfAdministration` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w4SelfAdministration` / `authorizeBedsideMedication` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w4SelfAdministration` / `authorizePatientOwnedMedication` lacks a pinned `currentMeds` review.
- P1, P2: `w6Anesthesia` / `signAnesthesiaRecord` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w6StandingOrders` / `signStandingOrder` lacks a pinned `currentMeds` review.
- P1, P2: `w6Recovery` / `signPostAnesthesiaNote` lacks a pinned `currentMeds` review.
- P1, P2: `w5OxygenOrder` / `signNewbornOxygenOrder` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w3DirectDispense` / `authorizeDirectDispensing` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w6DirectDispense` / `authorizeDirectDispensing` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w7Sign` / `signOrders` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w1EmergencyRxFollowup` / `signEmergencyRxFollowup` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w3EmergencyRxFollowup` / `signEmergencyRxFollowup` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w5EmergencyRxFollowup` / `signEmergencyRxFollowup` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w6EmergencyRxFollowup` / `signEmergencyRxFollowup` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w7EmergencyRxFollowup` / `signEmergencyRxFollowup` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w1ScheduleIISeries` / `signScheduleIISeries` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w3ScheduleIISeries` / `signScheduleIISeries` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w5ScheduleIISeries` / `signScheduleIISeries` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w6ScheduleIISeries` / `signScheduleIISeries` lacks a pinned `currentMeds` review.
- P1, P2, P4, P5: `w7ScheduleIISeries` / `signScheduleIISeries` lacks a pinned `currentMeds` review.
- P1, P2, P3, P4, P5: `w3SuicideAssessment` / `signSuicideRiskAssessment` lacks a pinned `currentMeds` review.
- P1, P2, P3, P4, P5: `w4SuicideAssessment` / `signSuicideRiskAssessment` lacks a pinned `currentMeds` review.

Content must also resolve the previously proved NP pre-op consent obstruction without broadening legal role permissions or shrinking the property domain. P3 no longer certifies after the legal screen expansion; its first failure is `currentMeds` on `w3SuicideAssessment` / `signSuicideRiskAssessment`.

App: `app/scripts/verdicts.mjs` invokes `ehr check` without required `--canonical`. Supply `releases/${program.release}/canonical.json`; a nonzero exit with valid violation JSON (exit 1) is a computed rejection, not a checker invocation failure. Check lane may regenerate `app/public/verdicts.json` after this owning-lane script correction.
## Sim follow-up on merged catalog (2026-10-31)

The v1 refill rule now explicitly requires `drug`, `refillScheduleEligibility`
with `allowed = [notScheduleII]`, and separate `denyRefill`. Sim adopts these:
renewals bind the focused contained MedicationRequest from this task's
`todayResources`; denials use only denyRefill; modifications and Schedule II
renewals use ordinary signOrders, never a false notScheduleII attestation.

**CLI owner, concrete one-line integration:** in `Ehr/Cli/Sim.lean:minSchedule`,
replace `let eps := episodes facts task.workflow task.choices` with
`let eps := taskEpisodes facts task`. `TaskContext` is already imported through
Sim.Policy. This makes native minimum search use the same prescription context
as persona replay, without treating an unrelated active medication as the
requested prescription. Sim does not edit Cli under the explicit lane boundary.

**Content/world, baseline service blocker still present on main f3dd0c2:**
`releases/v1/spec.json` has neither orderKind nor orderCode, and baseline
composers expose neither field. Thirteen day-1–3 P1/P5 tasks explicitly request
imaging/procedure orders. Their captured services cannot satisfy sim's typed
goals in v1. Please either introduce the optional service fields and composers
in baseline v1 (preserving all entry/review/safety rules and the v2 prior-auth
feature), or align scenario release timing without dropping requested work.
Moving these two optional declarations to v1 and regenerating the releases is
sufficient for sim to replay the original tasks. The simulator retains all
service goals and reports incomplete tasks until their actual UI supports them.

**App owner, catalog-count regression on the same merged main:** `pnpm --filter
app build` and lint pass, but `tests/app.test.tsx:25` still expects 16 bad
programs. Content now supplies 24. The catalog correctly includes all 24;
update the expected inventory (and retain the rendering assertions). Current
app test result is 89 passed / 1 failed; sim does not edit app-owned tests.
## Rules catalog core extensions: adoption contract

Core's event-time-window API is `CommitSpec.temporal` (optional list), with
`TemporalReq {id, subject: EventRef, anchor: EventRef, metric, minOffset,
maxOffset, deadline}`. All offsets are inclusive signed integers. `EventRef`
selects `{event, artifactKey}`. Render/FHIR must supply `Facts.episodeId`,
`epochMinute` (UTC epoch minutes), `artifactBindings`, `eventEvidence` and,
for business-day rules, `calendars` with hospital-local epoch dates and explicit
coverage. Evidence must come from trusted record/scheduler events, not a typed
attestation, and must retain distinct completion/filing events. Core does not
assert a physical event occurred. Tiny adoption: CoreTests.EventWindow.

- Content: bind each unlocked temporal rule to its real artifact commit and
  completion/filing/anchor event; set exact jurisdictional bounds/deadline and
  citations. Exceptions must be explicit separate lawful routes, never invented
  timely evidence. Do not equate panel visibility with evidence completion.
- Check: validate refs, bounds, calendar coverage obligations and evidence
  collection/exception route reachability. Treat missing evidence as a live
  branch; never certify completability just because the present sample is met.
- Agent/app: preserve optional commit/Facts fields and all new JSON constructors;
  show `ScreenView.obligations` and blocked reasons; never manufacture evidence.
- Render/world: maintain absolute event timestamps and current artifact bindings
  across adapter calls; expose missing/overdue obligations, including offscreen.

## L-cost design: qualified-authorization (35 rules; do not implement yet)

Introduce opaque CapabilityId and ActionIntent {patient, episode, artifact,
version, action, scope}. `CapabilityReq` on commit/release intents names the
required licenses/scopes, privilege, relationship or designated-party role;
ordinary demo Role remains only the coarse UI permission. AuthEvidence contains
issuer, subject UserId, capability, intent binding, validFrom/until, policyVersion,
revocationVersion and authenticated signature reference. The trusted identity
adapter verifies signatures and supplies a complete current revocation snapshot.
The guard universally checks requirements against the signed-in user and exact
intent; absent/ambiguous/stale evidence blocks. No free-text cosign value counts
as authentication. Checker covers every intent-producing path and required
identity/exception collection routes. Prove new-commit authorization and replay
failure after version/relationship/user/revocation changes; exercise expired,
wrong-patient, self-sign and absent credential witnesses. Backend is responsible
for identity proofing, license accuracy and revocation delivery. Integrate with
T0 as independent guard conjuncts, never weaken the existing role/human checks.

## L-cost design: record-level-completeness (38 rules; do not implement yet)

Add ArtifactId/version, RecordSetId and a finite authoritative snapshot
{patient, version, members, completeAsOf}. `RecordSetReq` names a set, applicability,
per-member field/value/provenance requirements, parent-child linkage and allowed
age, plus closed sum/count bounds (refills, cumulative supply). Per-member
captures use artifact ID/version rather than ephemeral UI slot. Guard quantifies
over the whole trusted set, rejecting missing/duplicate/stale members and
cross-artifact witnesses; empty sets require an explicit empty-set policy.
Artifact-writing commits emit date/time/author metadata and invalidate old linked
receipts when member versions change. Checker verifies every writer's target
and member binding and reachable collection route. Prove each new commit has
one current-version witness for every required member and aggregate bounds hold;
test extra unseen members, deleted/versioned members, swapped slots, partial
snapshots, duplicate IDs and overflow boundaries. Storage durability, retention
and actual inventory completeness remain backend assumptions. Compose temporal
rules with per-member evidence, and require capability rules on relevant writers.

## L-cost design: release-access-policy (10 rules; do not implement yet)

Introduce ReadIntent/ReleaseIntent separate from ackResult, containing patient,
data categories and artifact versions, recipient/relationship/jurisdiction,
purpose, service context and requested scope. `ReadReleaseReq` is a closed policy
AST with explicit deny/allow/review-needed outcomes and refusal/appeal routes.
Versioned ConsentEvidence binds grantor, recipient, exact scope, purpose,
validity interval, jurisdiction, hold and revocation version. Missing context or
policy conflicts deny; stale grants never authorize a newer intent. Every modeled
read/export/release route must call the same guard, including preview/search,
download and batch paths. Checker enumerates those paths and validates
review/revocation reachability. Prove emitted release intents satisfy policy,
and revocation/version changes invalidate grants; test mixed-category requests,
wrong recipients, holds, unknown jurisdiction, partial consent and cache replay.
Backend enforces tokens, delivery, physical export and encryption; UI eligibility
is not proof of successful transmission. Compose qualified capabilities with
consent, never replace either with a checkbox or an ackResult receipt.

### Patient-predicate adoption (59-rule group)

Use `When.clinical` / `AlertCond.clinical` with `ClinicalPredicate`; do not encode
patient properties in encounterKind. Render/world must populate Facts.clinical
named source records and artifactBindings. Age is explicitly sourced, not guessed
from identity.ageYears's default. Unknowns apply requirements and fire unknown
alerts. Content: use actual coded source values and dedicated exception/refusal
routes. Check: cover true/false/unknown branches, code domains, slot-specific
captured dependencies (including unconfirmed captures) and all refusal routes.
Agent/app validators must round-trip recursive and/or/not, optional clinical
facts and conditional temporal requirements. Tiny: CoreTests.PatientPredicate.

### Value-validation adoption (34-rule group)

Use ElementSpec.validation (Validation AST), optional defaultValue, and
Facts.codeTables [{system, version, codes}]. The table adapter must supply vetted
terminology/product codes; a coded value-set name is still not a membership check.
Lexically significant numbers/dates/tokens use text/code fields, preserving their
raw spelling. Map those validated values to backend types explicitly. The closed
GS1 grammar is documented in changes.md; other issuers/formats need versioned
validated product tables, not weaker token validation. Content supplies clinical
factor/cap/formulation/weight constraints and table versions; core does not invent
clinical calculator data. Check must reject unsupported/missing tables, invalid
defaults and unsatisfiable or cyclic relational dependencies, prove source fields
reachable before outputs, and include stale-dependency branches in completability.
Render/app: preserve validation/default fields and display ItemView.validationError;
FHIR/world populate trusted versioned code tables. Examples: CoreTests.ValueValidation.

### Order-expiry-clock adoption (11-rule group)

Content: add CommitSpec.expiry policies, using durable orderKey bindings and the
law's actual issued/started/firstFill anchor, duration and renewal/reassessment
rules. Use separate stop/release/exception commits so expiry cannot prevent the
required safe action. Age-specific policies compose ClinicalPredicate. Do not
reset original anchors on transfer or reinterpret a UI slot as order identity.
Render/world/backend supply Facts.orderClocks and artifactBindings from durable
records. ClockStamp validates UTC/civil conversion; calendarMonths needs a unique
MonthCutoff for the exact anchor/month count, with the timezone service resolving
DST offsets. Missing/ambiguous calendar evidence blocks. Check: cover missing,
expired, renewal/refusal and stop routes; ensure every affected order action is
guarded, including refills and renewed/transfer contexts. Agent/app preserve the
new types and expose overdue obligations. Backend must separately perform actual
auto-stop/release; the core guard proves no scheduler execution. Tiny: OrderExpiry.

### Structured-display adoption (10-rule group)

Content: pair InfoSpec.payload with Spec.displays scoped to .commit or
.phase workflow name; set required identifier categories/row fields/groupBy,
conditional available fields, pinned, and optional selectionElement (confirmed
flag on each row's slot). Set CommitSpec.actionLabel for critical actions. A
receipt/waiver cannot satisfy a DisplayReq. Render/FHIR supplies patient/current-
version InfoPayloads through Facts.infoPayloads and artifactBindings, explicit
availability, and trusted Facts.phase. Unknown phase activates phase requirements.
Render must paint ItemView.payload's complete source, computed groups, per-row
selected flags and pinned state; do not render an empty named panel as success.
Keep EPCS details/notice pinned throughout signing. App/agent must preserve all
fields and exact action labels. Check must require contracted payload bindings,
correct labels, grouping and visibility at each affected commit and every phase
screen (including start/navigation/return paths), covering known/unknown context
and refusal routes. Phase tags are trusted context, never freely changed program
navigation tags. Per-record completeness beyond the supplied finite rows belongs
to the L-group design. Tiny examples: CoreTests.StructuredDisplay. Backend EPCS
identity and authenticated transmission remain separate duties.

### Final integration clarifications

BusinessCalendar.utcOffsets is optional: omitted explicitly means UTC. Hospitals
using local dates must supply a transition table of [UTC minute, offset minutes]
covering both endpoints, including DST transitions; duplicate thresholds and
missing coverage fail. Current event evidence may coexist with old versions.
PayloadFieldReq.kind and .validation share the element Validation AST;
PayloadContract.rowConstraints and PayloadRow.availability support per-row
external-output validation. Render/check/content must preserve and validate these
contracts, including terminology versions and relational dependencies. Unknown
clinical values should be absent optional facts, not literal codes named unknown.

For business-day TemporalReq, direction is mandatory (before/after/either);
zero business dates crossed cannot determine actual event ordering. Use the
law's ordering explicitly. Missing direction fails closed. Minute windows keep
signed offsets, and may additionally declare a direction.

Clinical alert keys are opaque acknowledgment identities containing the exact
source/capture snapshot, to avoid collision-based acknowledgment reuse. Render
must show the alert's clinical label/context rather than the raw key (the current
legacy popup prints its key); adopt that renderer change before enabling clinical
alerts in production specs. It must not expose internal source/capture dumps as
clinical alert copy.

### WASM runner memory fix (owning lane)

The expanded canonical spec makes wasm/test/equivalence.mjs fail at line 98
with RangeError: Invalid string length when joining all 4,096 JSON inputs.
Retain every case and event. Process small native batches (e.g. 16 cases),
compare/discard each batch's outputs, and translate output case indices to the
batch-local index; do not collect the full native output either (512 MB limit).
A full-case-count workaround is /tmp/lean-streamed-equivalence.mjs, with results
in /tmp/lean-streamed-equivalence-results.json. Please apply this memory-bounded
approach in the owned runner. Permanent new-feature coverage is independently
provided in lean/Ehr/Core/test-wasm-features.mjs (252 API comparisons/84 cases).

The exact minimal owned-runner patch is prepared at
/tmp/wasm-equivalence-memory.patch. It keeps the original seed, case generation,
case/event counts and full byte comparisons; only native batching and output
case-index bookkeeping change.

Final verification passed with the full original seed/corpus: 4,096 cases,
144,807 step and 144,807 view byte comparisons, plus 32 init comparisons.
The temporary parallel driver is /tmp/lean-parallel-equivalence.mjs; its workers
run no Lake commands, and the report asserts disjoint full coverage and identical
WASM hashes. For CI runtime, shard the canonical cases after one sequential Lake
setup; preserve every event and the same byte comparisons. Renderer/FHIR also
passes 174 Synthea bundles and 694 canonical page variants with current assets.

## CHECK-CORE-CONTRACT-DOMAIN (new features)

`Completable` quantifies over all records satisfying only `RecordAllowsScans`. Missing event evidence, absent code tables/payloads, and expired durable clocks are in that domain. UI events cannot create trusted external evidence. Therefore sample-based success cannot certify universal completion of an unconditional evidence-dependent commit. The checker now returns an explicit conservative `completable` finding for temporal/expiry/payload/validation contracts pending a total collection/refusal/repair construction. Core's hard stops and all five contract safety guarantees remain enforced and formally proved by `commitContracts`. Coordinate lawful completion goals/refusal commits and the evidence-domain contract before claiming general T1 for those constructs; do not pretend an expired original commit completed by taking a different commit.

App regression after expanded content merge: `app/tests/app.test.tsx` expects 16 bad programs, but the permanent corpus is now 24. App build and lint pass; 89/90 tests pass with that sole stale-count failure. Update the owning-lane assertion to 24.

## CHECK-T7: conservative rejection is not semantic falsity

The existing `passiveScreensKept` safety rule rejects removal of even an unused,
unreachable canonical workflow with no required commits. All twelve `Satisfies`
properties can still hold: candidate screens are unchanged, no task disappears,
and passive alerts target no candidate screen. `RejectionObstruction.lean`
formalizes this example and the impossibility of unqualified semantic rejection
soundness for the current checker. Preserve the safety rule. The public verdict
needs to distinguish conservative certification failures from demonstrated
semantic violations, or the trusted property must explicitly include workflow
retention with owner approval. A replayable path alone proves neither. This is
independent of the existing seed-13 escape and patient-witness API gap.

### Concrete minimal app patch for approval or the owning lane

In `app/scripts/verdicts.mjs`, immediately after `program.path` in the CLI
argument array, add `"--canonical",` and
`` `releases/${program.release}/canonical.json`, ``. Change the status expression
to `result.status === 0 || (result.status === 1 && output && typeof output === "object" && "violation" in output) ? "computed" : "checker failed"`.
In `app/tests/app.test.tsx`, change only the bad-program count assertion
`toHaveLength(16)` to `toHaveLength(24)`; retain the actual permanent-corpus tests.
No certification verdict is relabeled as accepted.

Capture-dependent per-order-line clinical predicates require special completion
handling: changing a captured predicate source can activate a requirement on any
archived line, beyond the existing naloxone dose/frequency repair rule. The
checker rejects that unsupported universal-repair claim while preserving the
interpreter's conservative true/false/unknown applicability semantics. Record-only
clinical predicates retain ordinary all-branches structural coverage. Exact
`CommitSpec.actionLabel` declarations are also checked before completion claims.

## CHECK-D5: newly merged semantic UI navigation contract

The latest main adds core-model §10 and names D5 as a checker rule (unique group
and item labels, at most 12 groups/items, no orphan screens). The current native
Program/renderer interface does not yet expose the proposed `UiScreen.nav` tree.
Render/core must provide its actual grouping function/type before check can
certify D5 against the tree the app will paint. Do not certify a separate guessed
navigation model or mistake screen-ID uniqueness for navigation-label uniqueness.
This is additional pending integration beyond the five merged core features.
## Sim revalidation after five-feature Core merge (2026-10-31)

Merged main `fe475fa` into sim (`f3a4d4d`); sim commits `fbe18d0` and `9ee5345`
restore the whole-project Lean build (179 jobs) and adopt clinical conditions,
Core value validation, temporal/expiry diagnostics and structured-display
navigation. Forty-eight new executable simulator checks include valid and
invalid external evidence, conditional captures, stale clinical provenance,
interruption expiry and actual fixed-clock minimum search. The history lemma
remains true: `State.history` contains only Back screen IDs, while event evidence
is in fixed `Facts` and the search retains clock/captures. All helper proofs and
T9 contracts retain their statements and axiom audits; no heartbeat increase.

The three owning-lane requests under "Sim follow-up on merged catalog" are
**still open on this main**:

- **Content/world:** v1 still declares neither orderKind nor orderCode; v2
  and v3 declare both. Retain every requested service task and provide its
  composer in the applicable release. Do not drop or replace those tasks.
- **CLI:** `minSchedule` still calls `episodes facts task.workflow task.choices`.
  Apply the already requested one-line `taskEpisodes facts task` integration.
  Fresh native reproduction: unchanged day-one renewal `d01-P1-W7-022` returns
  `joint click search exceeded bound or found no completion`, while persona
  replay uses the task-bound prescription. No false minimum is reported.
- **App:** build/lint pass; tests remain 89 passed and one failed at
  `tests/app.test.tsx:25` (expected 16 bad programs, received 24). Update the
  inventory expectation while retaining the real-WASM rendering assertions.

Production event/predicate/validation/expiry/payload rule and FHIR-source
adoption remain with their existing owners under the Core adoption requests
above. Sim accepts and preserves the typed trusted Facts inputs and exercises
the five feature groups through the real interpreter; it does not manufacture
external evidence or change a production hospital rule to complete a task.

Final sim revalidation: all 50 ten-day/persona schedules retained all 1284 tasks;
1271 complete, with exactly the same 13 baseline service tasks incomplete.
No completed-task floor or interruption-retention violations. All five day-one
outputs are byte-identical, and parallel-worker reports match their serial
counterparts. Both the repository Comparator (18 statements) and the explicit
single/joint T9 contracts pass. Full `lake check` accepts only the three permitted
axioms. `lean/Ehr/Sim/validation.json` records the current source/main hashes,
every schedule and incomplete ID, and refreshed native minimum examples.
## Composite expansion integration (lean-core, owner task Oct 31)

Core is adding `Kind.use (def : String) (args : List (String × String))`,
`ComponentDef`, `Program.componentDefs := []`, and Init-only `Program.expand`.
Source programs must be retained for certification/hashing. Expansion returns
ordinary components and clears defs; errors must fail closed as `wellFormed`.

- **Render (urgent build dependency):** Page.lean's exhaustive Kind match needs
  a `.use ..` arm (unexpanded use has no runtime content; reject at load).
  Core is explicitly forbidden to edit Render. Expand source programs in the
  renderer/API and `render-screens` before traversing screens/components, and
  propagate the wrapper's `tag = "composite:<name>"` into UiNode as a presentation
  key. Preserve every component/clinical field and all rendering properties.
- **Check/deploy:** expand candidate, previous, and canonical inputs before all
  structural/semantic checks. On `.error e`, return violation `wellFormed` with
  the expansion reason. State `Satisfies` over successful expansion (Core's
  `Program.Satisfies` is the property-lifting definition/theorem). Hash the SOURCE
  Program including defs; deploy/store the SOURCE program, never hash expanded
  components as a replacement. No property or theorem may be weakened.
- **Sim:** expand before simulate/min-clicks and reject expansion errors; policies,
  state exploration, metrics, and navigation must inspect the expanded screens.
- **Agent/app:** preserve `componentDefs` and `use.args` through schemas and patches;
  accept only checked composites, render wrapper presentation keys as supplied
  by Lean. No backend behavior is added by expansion.

This checkout's main still has no Check/Deploy/Sim modules or CLI commands;
these integrations must land from their owning lanes. Existing T0/T2/T3/T6/A2/A4
statements apply to every expanded Program without changing their hypotheses.

- **App baseline regression after main merge:** `pnpm --filter app test` now
  fails `tests/app.test.tsx:25`: the catalog expectation is 16 seeded bad programs,
  but content has merged 24. Please update the fixture-count assertion to cover
  the full catalog. The real-WASM projection test and the other 89 tests pass.
## Render → content/checker: section 10 navigation report

`Ehr.Render.NavRules.NavSane spec prog` is ready to wire into certification.
`#eval reportReleaseNav` reads `releases/v1/personas/P1.json` and its spec.
Current result is **false**: W1 has 14 entries, W3 17, W6 18, exceeding D5's
12-entry group limit. Labels within all groups are unique. Render retains every
screen and does not silently truncate navigation. Content/checker should agree
on a conforming program/navigation grouping before certifying this release.

## App → render/core: semantic painter integration gaps (section 10)

The React painter now consumes the generated `UiScreen` types and real P1
fixtures. The following contract gaps prevent the requested interaction/design
from being represented faithfully without inventing interpreter semantics:

- `nav` and `stepper` carry destination screen IDs, while generated `Event` only
  supports click/selectTab/enter/confirm/ack/scroll/search. Please export a
  navigation Event accepted by the interpreter, or supply actual component IDs
  for these destinations. The app currently displays the destinations as an
  overview; actual workspace nav buttons retain their real component clicks.
- `uiBanner` omits allergies and code status. Please emit clinical allergy summary
  and code status (including explicit unknown state) as banner fields. The app
  currently supplements allergy text from the supplied allergy info rows and
  displays missing code status as "Not recorded".
- `field.kind` collapses identity, scan and cosign to text/code/user and coded
  domains lose their options. Please preserve specialized kinds and coded
  choices in the semantic wire format. Until then the app can style recognizable
  identity/barcode labels and user fields, but cannot invent formulary options.
- `pendingConfirm` plus a sibling button with role `confirm` describes the same
  affordance twice. The painter supports explicit confirm nodes and uses its
  field-level affordance only when no sibling confirm node exists.
- Some real P1 sign labels are authoring instructions (for example
  `w1Sign.legal.controlledSigningLegalNotice` asks the renderer to obtain and
  display legal source text). Please supply the intended clinical text in the
  semantic tree; React must not interpret legal instructions or fabricate text.

No Lean source has been edited by the app lane. The offline fidelity command
checks the supplied semantic content exactly and does not claim D1–D6 proof or
clinical correctness of the source fixtures.
## Render → app: catalog test count after main integration

After merging `cd60f62`, app build and lint pass, but `pnpm --filter app test`
has one failure: `tests/app.test.tsx:25` expects 16 permanent bad programs and
`programs/bad/` now contains 24. Please update that source test to the current
24-seed catalog (or derive the reviewed catalog expectation). Render did not
edit app-owned tests or reduce catalog scope. The other 89 app tests pass.

CHECK-D5 update after merging b26f772: renderer `uiNav` is now available, and
check's `NavigationSane`/`accepted_navigation` use that exact function. The rule
is enabled; the earlier missing-function dependency is resolved. Content/render
must fix the actual navigation failures listed below; the twelve-entry limit
and duplicate-label checks are not relaxed.
- All five personas, all three releases (same screen inventory): workflow `W1` has 14 entries.
- All five personas, all three releases (same screen inventory): workflow `W3` has 17 entries.
- All five personas, all three releases (same screen inventory): workflow `W6` has 18 entries.

## CHECK-EXTENDS-DISPLAYS: future expanded-contract inheritance

The requested T8 projection now covers the actual older entry/review rules and
static human/unit/alert predicates, directly from `check = ok`. The concrete
v1→v2→v3 transitions have no `Spec.displays` contracts. When content adopts
the new structured-display contracts, `Spec.Extends` also needs preservation of
`(displays?.getD [])` as an old-obligations prefix: the existing relation does
not constrain this new field. Do not claim that the current T8 projection is
an inheritance theorem for all five new `extraGuard` contract families or for
continuous phase display. Expanded contract inheritance remains separate from
the proved per-commit safety theorem and needs this relation/projection work.

## CHECK-SEED13: concrete proposed CURES mutation

For content review (not an asserted proof of the present seed): remove CURES
panels/review routes and exemption fields across every workflow, then make all
drug edit fields `unlessReceipt allergyList`. A candidate counterexample enters
and confirms the original controlled order, then creates a valid allergy-review
receipt. Drug editors would then remain hidden during any `afterHuman` event
list (events do not advance the clock); prefills cannot overwrite its existing
drug capture, and macros use the same visibility checks. With all CURES and
waiver routes removed, changing the original drug should no longer be an escape.
Validate every panel/field/macro path before adopting this mutation. This changes
only a bad fixture, not a hospital rule or the completion property. The current
seed's cross-workflow escape remains reproducible until the owning lane changes it.
## CR-16 — content feature pass: adapters, output coverage, catalog gaps and app seed count

Owner-requested second-pass rule data is in `Ehr.Specs.Rules.Features`, composed
additively into v1 and inherited by v2/v3. `feature_data.py` is the reviewed
mapping; each generated item retains the exact catalog id and source label.
`catalog.json` records every qualifying row, including precise remaining AST
limitations rather than claiming unsupported rules are implemented.

- **App:** `app/tests/app.test.tsx:25` hardcodes 16 bad programs. The fetched main
  already exports 24 and fails this test; this pass adds eight permanent seeds
  (32 total). Assert the complete exported corpus dynamically, preserving the
  requirement that every actual bad program appears. Do not delete seeds or
  limit the catalog to make the assertion pass. App build/lint pass.
- **Core:** catalog rows still needing features name the precise limitations:
  UDI production-identifier projection, forbidden abbreviation token/context
  validation, synonym normalization/category routing, scanned dose/product
  arithmetic, wet/dry/dosing-weight selection, sub-tenth rounding, concentration
  and aggregate daily-dose arithmetic, dynamic emergency supply comparison,
  order default selection/automatic stop, civil-year/event authorization expiry,
  and release/access enforcement. L-group record-level-completeness,
  qualified-authorization and release-access-policy remain unencoded with
  per-row reasons. Do not replace those mechanisms with a checkbox.
- **Core/check:** structured payload row completeness currently ensures each
  supplied row has fields, not that all source order/result rows were supplied.
  Add a typed source-row/slot coverage contract before claiming complete signed
  prescription or multicomponent-result fidelity. Patient identifiers/categories
  and row values are trusted adapter facts, not verified identity semantics.
- **App/world/render:** supply patient/episode/current artifact-version event
  evidence, clinical observations, business-day calendars with local timezone
  coverage, original durable order clocks/month cutoffs, trusted terminology
  tables, workflow phase and real InfoPayload rows. UI fields cannot fabricate
  any of this evidence. Render payload groups, selected rows and pinned state;
  keep mandatory reviews and structured payloads legible before commit controls.
  Missing data intentionally blocks. Current test-only FeatureExamples is not
  a clinical fixture source or a permissive fallback for missing records.
- **App/world:** persist each new dedicated artifact action's declared fields
  and distinct completion/filing events. Release/stop/decline actions are separate
  from continuing an expired order; do not reset original anchors on a new UI
  episode, navigation, transfer or attempted renewal. New role lists authorize
  documentation only and do not establish practitioner licensing/credentialing.
- **Check/sim/agent/WASM:** adopt the actual expanded release/spec exports,
  clinical/temporal/expiry/validation/display constraints and all 32 bad seeds.
  Certify actual programs, replay failures and exercise completing human paths.
  The content regressions exercise the interpreter; they are not checker
  soundness proofs, deployment certificates, evidence of physical care, or
  proof of external record completeness.

Some sources use qualitative deadlines such as "promptly" or "immediately".
The mapping explicitly labels the stricter same-recorded-minute hospital policy;
other local lookbacks and checklist/administration windows are likewise labeled.
The ordinary access/summary deadlines are retained even where law permits an
extension. Exception/refusal/release documentation remains a separate action;
no old entry, review, alert, property or safety rule was removed.

CR-16 validation update: the expanded corpus has 32 bad programs; the app suite
is 89/90 (only its stale 16-seed assertion fails). Actual real-WASM rendering of
the full corpus passes. New seeds 25–32 additionally have exported trusted-fact /
human-event replay manifests in `programs/replays/`; run
`python lean/Ehr/Canonical/replay_features.py` after content export. All eight
replay through the native JSON API with the intended hard stops and no commits.
The original content exporter console's hardcoded "16 bad programs" message is
also stale; please update that owning-tools diagnostic to `Bad.programs.length`.

## Render → app: semantic painter integration details

`lane/render` now publishes the generated `UiNode`/`UiScreen` types, the
`ehr_render_ui` export, and **real** adult P1 samples named `w1Rooming.json`,
`w1Orders.json`, and `w1Sign.json` in `app/src/fixtures/ui/`.
Read-only sidebar and missing-required-review info nodes deliberately use empty
`comp` strings. The section 10 type permits this; the app's schema must accept
an empty info comp and must never turn a summary into a component event.

The app branch at `28cdbd9` forwards all semantic buttons as `Event.click`.
It must map `role = "toggle"` to the existing group-header `Event.click {comp}`,
`"confirm"` to `Event.confirm {comp}`, and `"ack"` to `Event.ack {alert := comp}`. Other roles
retain `Event.click`. The explicit confirm node already provides the D6
affordance; do not invent a second confirm control from pendingConfirm or the
ARIA fidelity check will see extra buttons. Use the generated types instead of
a parallel handwritten UI union. The existing generic WASM `.call` method can
invoke `ehr_render_ui` directly; no convenience wrapper change is required.

## Render/app integration resolution

Merged the app owner's `f810f92` changes. The catalog expectation, generated UI
types, empty read-only info IDs, confirm/ack mapping, and explicit-confirm
painting are integrated. All **124** app unit tests and **8** P1 desktop/narrow
ARIA fidelity checks pass. Group toggles correctly dispatch **Event.click**;
the earlier request for Event.toggle was a documentation error, now corrected.

Render preserves identity/scan/cosign field kinds and the existing formulary
choices in the kind string, and supplies allergy/code-status banner fields.
The app's remaining navigation Event request belongs to lean-core. Source
labels that contain legal authoring instructions belong to content: render
must show the interpreter's clinical text rather than fabricate legal text.

## Render → lean-core: previous GenTS request completed

The user-authorized minimal GenTS addition now imports Render.Fhir, includes
Render.Json/Fhir in sourceModules, and fail-fast checks UiNode, UiScreen, and
FactsInput. Official regenerated output has **141 types and 40 typed samples**;
strict tsc passes. No Core definitions or proof statements changed. Rebuilding
WASM after this tool-only change produces byte-for-byte identical tested assets;
the source manifest has been refreshed and make wasm-check passes.

## Render → core/content/app: visual review follow-up (Oct 31)

- **Core/content:** InfoSpec has no verbatim text field. Please add optional
  `text? : Option String` and supply the exact clinician-facing text of
  21 CFR 1311.140(a)(3) on controlledSigningLegalNotice. Its current label is an
  authoring instruction, not the notice. Render will display supplied text as a
  body row, unchanged. Content owns the legal wording; render must not invent it.
- **App:** UiScreen.nav entries will now carry real shown goto-button comp IDs,
  not destination screen IDs. Paint entries as buttons dispatching `click` with
  that ID. The screen-wide modal inertness also applies to nav. Static overview
  entries must not be treated as invented interpreter events. Update fidelity
  to check those real clickable entries. Open these available navigator groups
  by default: comp IDs no longer match the current screen ID, so the old
  active-screen accordion default otherwise collapses every nav entry. Render
  cannot edit the app painter.
- **Checker/content:** retain D5 certification work from the earlier request;
  render will not truncate groups or invent navigation actions to pass D5.
- **App/infra:** the earlier exact Facts.patientId wristband-token request remains.

Compact summary rows have one `(Record, primary text)` cell (with room for an
optional secondary). **Resolved by main `d3e0860`:** the app now paints the primary
cell as plain list text. No renderer-side clinical inference is needed.

## Sim final checkpoint after second main merge (2026-10-31)

Main `b26f772` is integrated as `bfaa352`. It resolves the app inventory request:
app build/lint and all 129 tests now pass, including all 24 bad programs and
real-WASM semantic rendering. World build/lint and all 92 tests pass (its Lean
contract test is run after Lake builds); agent typecheck/lint and 31 tests pass.
The full Lean build passes 189 jobs. Kernel check, the 18 repository Comparator
statements, and explicit single/joint T9 Comparator contracts pass with only
propext, Quot.sound and Classical.choice.

Sim `54489d4` additionally fixes exact-slot predicate planning: a matching
any-slot entry must not suppress the scenario's predicate capture on a specific
slot. Four new real-interpreter regressions bring FeatureTests to 52 checks.
No property, production spec, safety rule or theorem statement was weakened.

The final native sweep retains all 50 schedules and 1284 tasks, with 1271
complete and exactly the same 13 baseline service tasks incomplete. All eight
floor checks and interruption retention pass for completed tasks. All five
day-one byte replays are deterministic; all 50 reports match the preceding
full sweep, including complaints. Validation pins the actual merged revision,
not the shared/moving origin/main reference.

`cli_smoke.py --jobs N --timeout-seconds S` runs independent native processes;
it never starts parallel Lake processes. The process budget defaults to 120
seconds. Twenty workers hit that wall budget on a busy RN schedule; the final
run uses ten workers and an explicit 240-second process budget, keeping every
clinical deadline, goal, completion and validation check unchanged.

**Exactly two original owning-lane requests remain open:** baseline v1 service
order declarations/composers for the 13 retained tasks, and the one-line
`taskEpisodes facts task` adoption in Cli.Sim.minSchedule. The app inventory
request is closed. Exact details and the final verification are in HANDOFF-sim.md
and lean/Ehr/Sim/validation.json. No unfinished simulator proofs remain.
# Live Medplum integration requests (lane/app, 2026-10-31)

No files under `lean/` were changed for this integration. The app uses the
canonical v3 projection, real `ehr_facts` and the actual WASM interpreter. The
following gaps need spec/render ownership; none is handled by weakening a guard.

- Add an explicit rooming/vitals commit for P1/P4. There is currently no save
  action before prescribing. Rooming observations therefore persist with
  `signNote`; a patient with no recorded weight must file the note first so the
  order-entry `orderingWeight` payload can cite a real versioned Observation.
- Export workflow phase as screen metadata, and have `ehr_facts` accept/project
  selected Encounter, Task, MedicationRequest and structured source context.
  `FactsContext` currently drops phase, clinical facts, artifact bindings and
  InfoPayloads, while missing phase activates *all* phase display requirements.
  The app supplies this documented caller context: screen workflow plus
  order-entry for order/lab/sign/verify/pre-op/post-op/refill screens; other
  screens use their own screen ID as phase, and chart home is shell/care.
  Raw payloads retain actual FHIR version identities. This mapping should move
  into exported Lean screen metadata rather than relying on screen ID names.
- Project `Encounter.serviceType` and explicit risk-assessment Observations in
  Lean. Until then, the data adapter copies those codes, with artifact bindings,
  into ClinicalFacts. Risk Observation code system is
  `https://vgi-health.example/fhir/CodeSystem/clinical-risk`; the code names the
  risk and `valueCodeableConcept.coding.code` is the assessment. Absence is never
  translated to a negative assessment. Without these records, conservative
  clinical predicates can require naloxone/caregiver education and institutional
  DEA details even for a non-controlled outpatient prescription.
- `markReviewed` needs an exported source-resource selector per InfoSpec.
  Allergy/medication receipts target their exact `_history/<versionId>` resources.
  Empty lists cite the patient version as well as Lean's aggregate dataVersion;
  a subsequent list change invalidates the Lean receipt. Other source types need
  explicit contracts; do not treat a Patient reference as proof of a CURES report.
- Several existing fhirTargets describe logical content rather than the actual
  signed artifact: note fields target `Composition.section[...]`, diagnoses
  target `Encounter.diagnosis.condition`, and billing diagnosis targets Claim.
  The mapper deliberately files note sections as UTF-8 text DocumentReference
  (LOINC 11506-3 / 11504-8 / 18842-5), creates ICD-10-CM Condition records linked
  from Encounter.diagnosis, and creates ChargeItem for the six shipped CPT levels.
  Please make these transaction-level mappings explicit in the spec surface.
- Add explicit admission-bed, original-prescription, selected-MAR-order and
  Task-focus bindings. The app currently captures these as operational encounter
  context before entering the canonical EHR. Bed occupancy changes use versioned
  Location updates in the same admission/discharge transaction. MAR drug
  identity comes from Lean's own normalized `display.meds[].drug`, never a
  second TypeScript formulary. Unknown formulary entries fail explicitly.
- Add a dedicated discharge prescription composer/intent binding. The mapper
  supports captured medication lines and `category=discharge`, but a clinician
  currently has to compose the lines through the existing Orders workflow.
  Avoid silently copying every inpatient drug to a discharge prescription.
- Regulatory commit IDs beyond the mapped clinical workflow set still need
  reviewed persistence contracts; the app throws an explicit mapping error and
  retains inputs rather than recording an in-memory-only success.
## CR-17 — content blueprint integration and missing language capabilities

Content reviewed `origin/lane/render` at db48c49 integration: `uiNav`, `uiSteps`,
`uiClinicalBanner`, and `uiSide` already emit the shell independently of canonical
workspace groups. The canonical removes duplicate sidebar/navigator group headers,
retains chart-review tabs and the banner component required by landmark checks,
and keeps actual goto buttons addressable. Render currently paints the banner
component as supplementary info; please project it into the single shell banner
without dropping its safety semantics. Shell nav/stepper destinations still lack
an interpreter Event, so real workspace goto buttons must remain until core/render
provide that event or actual source component IDs. Do not invent React navigation.

**Core/render:** `Visibility` currently has only `always` / `unlessReceipt`.
Please add component/section applicability via the existing `When` / clinical
predicate AST, unknown-applicability fail-closed, shared by interpreter/checker
and render. Content cannot safely emit patient-dependent sections with the present
language. The folded sections remain open; every original conditional requirement
and independent action is preserved. Do not hide a required review using a
presentation-only condition. Per-slot controlled selection likewise needs actual
select/deselect events; current order-set macros leave values unconfirmed.

**Core/render:** `InfoSpec` has label/version/payload but no literal text member;
`Kind` has no static text. Add spec-level verbatim attestation text and render it
adjacent to the appropriate signature, distinct from the short info label. Bind
`controlledSigningLegalNotice` to the exact 21 CFR 1311.140(a)(3) source text; do
not treat its human label as the legal notice. Also support the original hospital
explanation “I reviewed these orders for this patient.” without adding an invented
mandatory checkbox. Content preserves the no-receipt notice review requirement.

**Render/app/world:** bind the blueprint tables to real data: catalog search
results; unsigned medication AND service-order summary columns/status; result
value/unit/flags/ranges/status/timestamps and dated trends; in-basket list +
selected preview; ED board; dated MAR scheduled-time columns and actual BCMA
captures; flowsheet time columns; pediatric dated growth/reference and dose basis,
range, concentration and daily total; surgical phase and discharge summaries.
Do not invent data or percentiles in labels. Content retains ordinary fields,
scans, signatures, per-field macro confirmations and the long baseline workflows.

Identity input is verified against Core.Basics.identityText: initials/sex/age
(e.g. RK/M/58). Its existing canonical label is correct; the research's claimed
patient-token discrepancy is a renderer-documentation issue. Do not change the
validator. Record-prefilled patient/prescriber name/address/registration facts are
text with nonempty validation, named recordFact sources and human confirmation;
these do not replace human-only patient-ID re-entry or credential authorization.

CR-16's 26 unexpressible feature rows and 83 L-group rows remain exact dependencies;
no source rule is removed, weakened, or represented by a substitute checkbox.

CR-17 attestation handoff, verified against the current
[eCFR §1311.140(a)(3)](https://www.ecfr.gov/current/title-21/chapter-II/part-1311/subpart-C/section-1311.140):

> By completing the two-factor authentication protocol at this time, you are legally signing the prescription(s) and authorizing the transmission of the above information to the pharmacy for dispensing. The two-factor authentication protocol may only be completed by the practitioner whose name and DEA registration number appear above.

Content's `Specs/ClinicalTables.lean` records the blueprint's full table schemas,
including unsigned service orders, MAR time cells and growth reference provenance.
The canonical declares the actual tables/previews/checklists; adapters must populate
those named views with coherent records. The current renderer's built-in dose/growth
rows do not yet supply every schema column. Missing reference data must stay unknown.

CR-17 section layout detail: the core's pinned payload check requires root
components, so required infos remain root siblings immediately before each open
artifact section. The section contains its original fields, alerts, identity and
independent commit controls. Please support provably always-open section ancestors
for pinning before nesting required payloads; do not relax their actual visibility.
Content's tests retain the existing root-pinning requirement.

### Render continuation after the blueprint merge

The render lane integrated content's 45-screen canonical and retains the prior
132-screen / 4,382-variant corpus as an additional native/WASM regression input.
The workflow overview `NavSane` diagnostic now passes on P1; this does **not**
certify the actual clickable shell projection. Checker integration of that
projection remains required. The new P1 blueprint's ordinary root goto controls
remain workspace controls; render never invents events for the overview stepper.

The existing app request is still open: `Screen.tsx:WorkflowNav` paints entries
as non-clickable list text, and opens groups only when a component ID equals the
current screen ID. Paint the supplied component IDs as `Event.click` buttons,
open available groups, and observe their labels/events in fidelity checks.
The existing core/content text request is also still open: `InfoSpec` has no
literal text member. The source quotation above is reviewed content, but is not
yet part of the spec consumed by native/WASM render. Add the spec field and bind
the notice there; render must not substitute a heading or hard-coded legal body.

Render also handles identical direct parent/child section titles with a neutral
inner heading, retaining the section ID and every child. No guard, safety
property, review requirement, or theorem statement was weakened.

**Sim/content build regression:** after merging main's blueprint into render
(`bc457f2`), `LEAN_NUM_THREADS=1 lake build` fails the existing assertions at
`Ehr/Sim/PolicyTests.lean:31` (`canonicalDay.tasks.all completed`) and line 32
(`canonicalDay.floor.zip canonicalDay.tasks` satisfies `below`). The module
spent 830 seconds evaluating before reporting these failures. Please repair the
canonical/simulator integration while retaining both assertions. Render's
targeted `lake build Ehr.Render` passes. Render has not edited Sim or content.

A compiled replay of the **unchanged** `PolicyTests.canonicalDay` definitions
confirms `completed = false` and reports the concrete blockers:
`ca-title22-70223-hp-24-hours:temporal026` and `:temporal027` are missing, followed
by `structured display or action label required` and `no reachable unmet goal`.
Its actual trace has zero popups while the reported completed-task floor has one,
which also explains the second assertion failure. Please supply truthful episode
phase/encounter context and required structured data through the owning adapters;
do not fabricate completed H&P evidence to enable an outpatient prescription.
The diagnostic uses the real compiled `simulate`, not a replacement planner.

**New main brief requirement (`f60a795`):** coordinate a Lean-owned
`aria : UiScreen → AriaNode` contract and its app fidelity consumer. Existing
render theorems are over UiScreen; `app/src/ehr/ui/fidelity.ts` still derives
expected ARIA in TypeScript and retains the old nav interpretation. That is not
a proved Lean ARIA projection. The new work is explicitly tracked in
TODO_PROOFS.md, separately from the completed semantic render proofs.

**New visible-control acceptance criterion (`2710777`):** app/core/content must
implement `pnpm --filter app audit:buttons`, its `docs/audits/buttons.md` report
and regression gate. The script is currently absent from app/package.json.
Retain D3 enabled-state fidelity and T10 shown-component presence: implement the
actual event effect or remove an unsupported control in its owning program/core
source, rather than dropping a shown component in the painter to pass the audit.

**WASM owner:** rebuild/refresh installed assets and source manifest after merging
this content checkpoint. Core/Render runtime definitions and wire types were not
changed here, but the manifest hashes content sources and is now stale. Native and
installed-WASM replay tests must still be run against the new external programs;
content has not edited app/wasm-owned assets to disguise the stale build receipt.

P1 screenshot review also confirms two owning-renderer/painter layout issues:
`Kind.banner` still appears as a second patient-info card in the workspace in
addition to the real banner, and `side` is painted on the right although the
blueprint calls for the left clinical summary rail. Please project/place these
through the shell without deleting the canonical landmark or hiding required
workspace information. No content workaround changes clinical identity semantics.

Nonempty narratives (directions, medical-purpose statements and documentation)
now use text inputs with the exact nonempty validator; they were previously
arbitrary-string coded fields. Enumerated choices and code-table membership
remain coded. Patient/prescriber record-confirm fields retain their named sources,
nonempty validation and human confirmation. No allowed value, predicate, entry,
review, alert, temporal or expiry requirement was removed.

P1 review inputs under `programs/canonical/review/P1/` use the real saved release
and an adult Synthea patient. Empty summaries and blocked signatures are deliberate
when the trusted adapter has not supplied a current payload/clinical fact; these
screenshots are not permission to insert permissive fixture evidence into the app.
`ReviewScreens.lean` and `review_screens.mjs` reproduce the JSON and desktop/narrow
PNGs. The eight feature replay manifests have an additional installed-WASM runner
at `Canonical/replay_features_wasm.mjs`; passing it is runtime behavior evidence,
not an up-to-date WASM source manifest or deployment certificate.

## Live integration continuation after restart (lane/app, 2026-10-31)

The saved WIP was reviewed and merged with main. P1's complete W1 and P2's
admission now traverse the canonical v3 program in the real WASM interpreter and
persist/query actual Medplum transactions. All persona worklist searches use real
persona logins. Seeded world day 1 is 2026-11-02; the home date selector exposes it
without changing the clinical clock. The OR list displays the ServiceRequest's
saved schedule, including date-only bookings. Work item selection carries its
Task, Encounter or MAR order into chart context.

The trusted transaction adapter now handles the spec's boolean `visGiven` as a
recorded date-precision attestation, rather than the invalid FHIR dateTime
"true". **Content request:** add an explicit VIS presentation date/time field if
an exact historical delivery time is needed; a checkbox alone cannot supply one.
Explicit `vaccineAdministrationDate` remains the vaccine occurrence date. Risk
Observations are restricted to the selected encounter, newest per risk. A prior
encounter's negative risk is never substituted for missing current evidence.
CPT storage is limited to the six clinic levels plus 44970, 47562 and 49650, using
project-authored short labels and the license note in README.

**Remaining core/content integration requests (no guard is bypassed):**

- Export the selected-encounter and workflow-phase contracts described above;
  the current adapter still supplies caller context outside `FactsContext`.
- Provide the prospective-commit event-evidence contract for MAR, immunization,
  and operative-note temporal obligations. Saved scheduled times and human-entered
  actual times need an explicit, owner-reviewed route to `eventEvidence`; the
  adapter must not manufacture a completed administration merely to enable its
  own commit. The transaction mappings validate on Medplum, but those full WASM
  paths are not yet certified by the live integration suite.
- Export receipt source selectors and complete bindings for the other structured
  payloads. Unsupported review sources and regulatory commit mappings fail with
  retained inputs. Transfers/observation dispositions also fail explicitly until
  their persistence contracts exist; they are never recorded as consultations.
- Preserve the rooming-save and dedicated discharge-prescription requests above.
  The tested P1 path signs the note (and vitals) before signing its prescription.
  The discharge mapper writes only explicitly composed medication lines.

Performance evidence for render ownership: on the merged canonical Orders tree,
unused legacy HTML rendering took about 2.5 seconds per event, and semantic
rendering about 1.4 seconds in a Node WASM measurement. The app now computes
legacy HTML and the inspection view lazily, with immutable snapshot inputs.
Please continue profiling semantic rendering/structured-payload checks in Lean;
UI logic remains there. No files under lean/ were edited for these changes.

## Visible control audit handoff (lane/app, 2026-10-31)

The owner requires every visible enabled control to produce an observable effect
within approximately two seconds. The app shell audit and fixes are in
`docs/audits/buttons.md`. The precise clinical inventory, including program,
screen, component id, label, action, and observed result, is generated in
[`ehr-dead-controls.md`](../audits/ehr-dead-controls.md).

**Content lane:** resolve the precise components in the generated inventory.
Chart-search inputs currently echo the query without results or a clinical state
change, even when the interpreter reports `ok`; remove them or implement search.
Any confirmation, selected tab, or repeated action listed as `ignored` or unchanged
needs meaningful behavior or an explicitly disabled reason. Retain actual clinical
guards; the audit must not invent patient evidence to make a commit clickable.
Commit paths blocked by missing phase/temporal/source contracts remain content/core
integration work. Runtime nav metadata has landed: the former Patient workspace
placeholder now navigates successfully, and Navigator/Sidebar placeholders are
absent from the current projection. This supersedes the earlier blanket request
to remove those labels.

**Render lane status after main's d932551:** nav pairs now contain real goto
component IDs. The app dispatches those IDs with Event.click, opens available
groups by default and omits empty groups. Stepper overview pairs still contain
screen destinations, so they remain static and are listed with null component
IDs in the inventory. Supply click metadata or an explicitly informational or
disabled treatment for those steps. No screen ID is converted into an invented
click. The final audit uses the newly committed cached-view WASM without a Lean
build.

## CHECK-2026-11-01: current baseline and evidence-domain obstruction

This supersedes the stale CHECK-2026-10-31 missing-review and D5 reports for
current main. The native CLI now rejects **all 15 personas** in v1/v2/v3 first
at `completable`, `recordCommunicationNeeds`: structured payload may be absent.
The actual buttons are on `w1Rooming`, `w3Triage`, `w4Flowsheet`, `w5Rooming`,
and `w6Consult` (role projections retain their authorized controls). The updated
matrix, input hashes and public-interpreter navigation replays are reproducible
with `python3 lean/Ehr/Check/certify.py`; it deliberately exits 1 while any
canonical fails. The corpus is now **32**, not 24; all 32 reject and all returned
navigation prefixes replay successfully. Content's eight new trusted-fact replay
manifests also block their intended commits with no successful commit.

**Core/content/owner contract decision required.** The inherited structured
rule `Features.display002` (catalog `federal-rx-170-315-dsi-source-citation`, info
`dsiSources`, phase W1/decision-support) activates when Facts.phase is absent.
`RecordAllowsScans` admits records with no phase or infoPayloads. On that record,
`displayReqMet` is false on every screen of every program, and no UI event can
change Facts. Therefore every commit is blocked: any nonempty required task
family fails Completable, regardless of field/review placement. The check-owned
`DisplayObstruction.lean` proves this obstruction for all three releases and all
persona roles, with no canonical kernel evaluation. Adding panels alone cannot
fix it. Other missing temporal evidence and expired original clocks create
related obstructions. Preserve all guards and rules; explicitly settle a trusted
evidence precondition, real evidence-collection events, or another lawful task
contract before claiming the baseline universally completable. Completing a
refusal action does not establish completion of the blocked original action.

**CHECK-EXTENDS-DISPLAYS is resolved for per-commit inheritance.** Content now
preserves `displays?` exactly in Spec.Extends. Check's OldObligations and T8 now
include old temporal, validator/default, expiry, display and signing-label
contracts. Continuous phase-wide display coverage is still separate from this
per-commit guarantee. No old obligation or safety rule has been weakened.


## CHECK-CORE-2026-10-31: certification and day-1 smoke blockers

The owner-selected core profile is active. The owner resolved the NP pre-op
blocker on 2026-10-31: only physicians and surgeons perform `signOrders` for a
pre-op encounter. `CommitSpec.encounterRoles?` encodes this hospital policy.
The three existing entry requirements and permissions remain unchanged.
`np_preop_never_signs` proves the guard refuses every NP pre-op signature;
`entry_relevant_when_allowed` justifies excluding forbidden-context entries
from depth and completion checks. All 15 persona baselines now certify.
The three shared canonical masters mix roles and are reference programs, not
single-role deployable baselines; only their persona projections are certified.
World 1 has 15 pre-op tasks, all P5, and none on day 1. P4 has no pre-op tasks.
The named P5 pre-op walkthrough signs after the three required human captures.

Simulator smoke commands used the real native binary, `--spec v1` (also v2,
v3), `--program releases/v1/personas/P1.json`,
`--persona runs/world/1/personas/P1.json`,
`--schedule runs/world/1/day-1-P1.json --world runs/world/1 --seed 7`, replacing
release/persona for each of 15 runs. Completed/incomplete counts:

| Release | P1 | P2 | P3 | P4 | P5 |
|---|---:|---:|---:|---:|---:|
| v1 | 39/3 | 22/0 | 38/0 | 22/0 | 14/4 |
| v2 | 42/0 | 22/0 | 38/0 | 22/0 | 18/0 |
| v3 | 42/0 | 22/0 | 38/0 | 22/0 | 18/0 |

The W7 denial gap is resolved: core explicitly keeps `denyRefill`, its two
Federal entries and the action on `w7Decision`, reusing both base inputs. P1
refill-denial tasks `d01-P1-W7-027`, `028`, `033` now complete in all releases.
The actual simulator goal function reports zero core/full differences across
1,284 world tasks (115 W7 tasks, including 20 denials in the current files).
No `Sim/**` changes were needed. See `lean/Ehr/Check/profile-goals-report.json`.

The v1-only incomplete
W1 tasks are P1 `006`, `010`, `015` and P5 `008`, `010`, `016`, `018`; complaints
include absent `orderKind`/`orderCode` (introduced in v2). P1 `010` makes one
navigation click before giving up; the other listed W1 tasks make none.
v2/v3 complete those W1 tasks. The smoke report preserves exact task choices
and complaints; these observations are not a claim that every complaint caused
a particular failure. P5 also reports an incompatible dose unit and fallback to
an accepted value; clinical-choice fidelity needs review even when a task completes.
P4's complete day-1 schedule does not discharge universal pre-op completability.
See `lean/Ehr/Check/sim-smoke-report.json`. Sim changes remain with its lane.

## Overnight all-persona smoke prerequisite (lane/run, 2026-10-31)

Native core-profile `ehr check --spec releases/v1/spec.json --program releases/v1/personas/P4.json --prev releases/v1/personas/P4.json --canonical releases/v1/personas/P4.json` still rejects P4 with `completable`: `commit signOrders: no field the user can reach for required element consentVerified`. Counterexample follows home → w1Rooming → w1Orders → w1Verify → w1Sign → signOrders. Owner now requires NP pre-op orders to have a **human-only attending co-signature**, supplied by a simulated attending, never automated by the overnight agent. Please land the corresponding spec/canonical/simulator fix and regenerated release exports on main; lane/run will not change protected Lean directories or weaken the universal completion property. This blocks a certified all-five-persona smoke and the full run.

Composite prerequisite: main currently has `ComponentDef`/`Program.componentDefs`, but no `Kind.use` or `Program.expand` in Core. Please supply finite structural expansion, source certificate binding and checker/render/sim integration; the agent must not invent an unchecked semantic kind.

## SIM-WORLD2-DOSE-2026-10-31: incompatible medication units need core/content change

**Resolved:** all 1,284 world-2 tasks now complete. The report below describes the original obstruction.

World choices and formulary correctly use units for heparin and insulin, and
mcg for inhaled albuterol. `Specs/V1.lean` declares `dose` as `quantity mg`
(and labels it Dose (mg)); `doseUnit` is a separate coded input. Insulin/heparin
units cannot be converted to mg without drug/product-specific data. Fractional
mg such as albuterol 180 mcg also cannot be represented by tenths of mg.
`Sim/Goals.checkFit` previously erased these choices and substituted an accepted
mg value, falsely reporting completion. The simulator now preserves the chosen
value and reports the actual obstruction.

Requested core/content change: supply a unit-aware dose input/guard that accepts
the chosen medication's units and precision, consistently across exported specs,
canonicals, dose alerts and FHIR writes. Preserve dimensional checks and clinical
values; do not permit arbitrary units or reinterpret units as mg. This lane is
restricted to Sim/world/config/docs and will not edit those owner-owned modules.
The world2 validation records each affected task and chosen dose precisely.

Validation on world 2: **38 / 1,284** tasks remain incomplete, all with this
specific dose obstruction; P1 has 4, P2 has 29, P5 has 5. P3/P4 complete all tasks;
P4 has no pre-op tasks. `lean/Ehr/Sim/validation-world2.json` contains every
blocked task ID and its exact drug/dose/unit choices. The per-day table is in
`docs/STATUS.md`. No service-order release mismatch remains.


Resolved by the check lane: native-unit dose kind, per-slot formulary/selector
validation, unit-aware composer and UCUM FHIR writes. The same 1,284 tasks now
complete with zero incomplete; see `lean/Ehr/Sim/validation-world2.json` and
`docs/STATUS.md`. The earlier 38-task obstruction above records the pre-fix result.

## SIM-WORLD2-AGENT-SCHEMA-2026-10-31: new runs reject the active core spec

**Resolved:** all three active specs now round-trip through the agent schema exactly.

Agent lane: `agent/src/lean-types.ts` `whenSchema` rejects
`releases/v1/spec.json` `entries[16].when = {drugClass:{cls:"scheduleII"}}`.
The current spec also carries `allowed:["0"]`, which must be preserved by the
agent boundary. A `make -n run-live` validation unexpectedly executed the compound
recipe because it contains recursive Make, reached real agent loading, and failed
with `entries.16.when: Invalid input` before any LLM call or deployment. The sole
incidental manifest was removed.

Requested change: adopt current generated Lean types/validators at the agent
boundary, preserving all spec fields and Schedule II constraints. New-run defaults
now select world 2, but this separate schema mismatch must be fixed before an
actual overnight agent run. Native `ehr simulate` reads the spec successfully.

### Overnight preflight update

The P4 startup obstruction above is resolved by main `72bee1e`/`3da9ace`, with
an encounter-specific signing policy: physicians/surgeons sign pre-op orders;
NP pre-op signing is refused. The agent adopts that exported rule unchanged and
never treats an attending co-signature as automatable. World 2 arrived in
`181ceb3`. The world-1 blocked/diagnostic attempts are archived separately;
`smoke-core` will be a fresh all-five, world-2 run. Composite expansion remains
an open protected-core prerequisite.
Resolved by the check lane: the generated-type boundary now accepts and preserves
`drugClass`, `allowed`, encounter/cosign/waiver fields and `medicationDose`.
All three active specs round-trip exactly; agent tests and typecheck pass.

## SHELL-POLISH-2026-11-01: semantic placement of workspace navigation

To amb/acute/surg content lanes: shared rendering now presents ordinary goto/Back
controls as bordered buttons and groups adjacent navigation controls into a compact
action bar, preserving their exact component IDs, DOM order, accessible names and
events. Current source programs place Back / Patient workspace between clinical
panels and chart tabs (for example `w4Mar`). Please move those existing controls
into a semantic footer group after the workspace content, or retain them in a
properly tagged navigator. Do not delete them or move required review content off
commit screens. The painter will not reorder the semantic tree to simulate a footer.

To presentation/content: empty info nodes now retain an explicit named `note`
landmark with one short message rather than a fabricated empty Record table.
`orderCatalog` with zero rows says “Search to add orders”; an empty allergy list
says “Allergies not on file”, never “No Known Allergies”. Explicit negative-allergy
wording is normalized only when supplied. Source codes/text remain in accessible
row labels and native tooltips; no FHIR resource or captured value is rewritten.

## Presentation handoff — banner provider provenance (1 Nov realism review)

For SHELL / semantic banner ownership: `Render/Fhir.lean:bannerOf` falls back from a missing `Patient.generalPractitioner` to the first encounter participant, then also labels that participant Attending. The adult Synthea sample used by the canonical capture has no `generalPractitioner` and only a `PPRF` participant type; the current frame consequently shows that encounter provider as PCP and Attending.

Please keep the PCP tied to its supplied patient care-provider reference (resolving provided resources/display text) and use encounter-role evidence for the attending label. Missing assignments should remain explicit. [FHIR R4 Patient.generalPractitioner](https://hl7.org/fhir/R4/patient-definitions.html#Patient.generalPractitioner) and [Encounter.participant.type](https://hl7.org/fhir/R4/encounter-definitions.html#Encounter.participant.type) define those separate associations. This is a semantic data follow-up for the shared banner; no spec/guard relaxation or widget API change is requested. Presentation leaves that shared-shell mapping unchanged in its frozen build.
