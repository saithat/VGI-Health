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

## Content integration completion and remaining owners (2026-10-31)

Content's Schedule II rule is implemented and regenerated in all three release specs. `lake build` passes the actual canonical/seed/release paths. This resolves the previous content blocker, not the production checker's certification obligations.

**CR-14, render: controlled prescription details must contain actual data.** `controlledRxReview` requires `orderSummary` shown, with no receipt or waiver, for controlled-II-IV signing. `InfoSpec.orderSummary` now explicitly denotes patient, drug, dose, quantity, directions and refills. At merged main `bea74d0`, `Render/Page.lean:infoContent` has no `orderSummary` arm and falls back to an empty-content message. Please render the actual current captured prescription rows and patient identity; test all these values, multiple lines, and hidden/collapsed seed 15 in the native/WASM page. A heading alone satisfies only the interpreter's abstract info visibility, not the legal display duty. The same data-fidelity issue for v2 indications is CR-10. No content file can implement the render-owned arm.

**Agent compatibility remains required.** Actual release specs now contain `{ "drugClass": { "cls": "scheduleII" } }` and `allowed: ["0"]`; `agent/src/lean-types.ts` must accept and preserve both. Existing 31 agent tests pass but do not test these actual release-spec round trips. CR-12 (`requestPriorAuth` action) also remains; round-trip all release/persona programs and specs exactly.

**World compatibility:** the albuterol cap is already fixed on merged main. Current world build/lint pass; 91/92 tests pass. The one failing full-formulary comparison is the missing `scheduleII` class on morphine (and the three other Schedule II drugs listed in the core adoption request). Keep that assertion and synchronize world-owned reference data; content has not edited it.

**Vaccine integration:** required VIS edition, manufacturer and provider fields are declared and tested; every omission and a false VIS flag block recording. The flag explicitly attests that VIS was given before vaccination. No trusted delivery event/timestamp is modeled. World/app/sim must populate inventory/provider and actual statutory dates/details in the FHIR record; manual human provider entry is supported, so no unverified signed-in-user auto-link was added.

**Check/app/WASM:** certify matching persona canonicals from `releases/<version>/personas/`, reject all sixteen permanent seeds with replayable counterexamples, and rebuild/test WASM against the allowed-value guard. Seed 16 confirms a default of three and strands that value on a sign screen with no navigation or correction field. Tests verify there are no outgoing navigation edges and attempts to edit the hidden composer field are ignored. Restoring canonical navigation allows human correction to zero; the guard is never relaxed. No checker implementation exists in this merged worktree, so content does not claim a `¬ Satisfies` theorem or production certificate.

**W7 scope clarification:** the original W7 `approveRefill` decision uses `refillRefills` and the requested drug in `Facts.medToGive?`, not the `refills`/`orderLines` signing representation requested for the owner-approved Schedule II addition. Do not claim that the new per-line rule alone certifies the separate refill decision. Any adapter that creates a modified controlled prescription must route it through the ordinary `signOrders` requirements (or request an explicit equivalent workflow rule); this prevents bypassing the controlled-detail and zero-refill gates. No new refill-decision rule has been inferred from guidance.

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
## CR-15: full catalog content adoption (content → render/app/world/sim/check/wasm)

All 124 `fit: spec-data` rows are now v1 data, inherited by v1.1/v2. See
`lean/Ehr/Specs/Rules/{Cms,Title22,CaStatutes,Federal,Entrenched}.lean`, the
catalog `encodedIn` mappings and `Canonical/RulePlacements.lean`. Content did
not edit other lanes. This request supersedes the earlier sixteen-seed counts.
There are now 24 permanent mutations; content walks test all artifact actions.

**Render:** add actual `infoContent` bindings for `resultAbnormalFlags` and all
13 `controlledSigning*` ids. Their precise contracts are in catalog
`displayContent`, the InfoSpec docstrings, and encoding-plan.md. Iterate every
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
plus new prescription content and v2 antibiotic indication. Map each field's
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
