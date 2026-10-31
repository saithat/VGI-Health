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

## Sim validation → app: mock DecisionRecord screenCheck (2026-10-31)

App build and lint pass after main merge `b0aad8b`, but `pnpm --filter app run test`
fails loading dashboard fixtures: Zod expects `DecisionRecord.screenCheck`, absent
from `runs/mock/decisions` (and/or break records). Please regenerate the app-owned
mock run against the current agent schema. The sim lane has not edited these
artifacts. Agent's 31 tests and world's 52 tests pass.
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

