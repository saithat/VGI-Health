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
- **CR-2 — `ElementSpec.recordFact? : Option String`: pending.** A
  `recordConfirm` prefill must use its declared fact. `weight` declares
  `weightToday`, never `weightYesterday`. Seed 6 otherwise accepts yesterday's
  kg value after confirm. Reject wrong sources generically at prefill and
  certification; do not special-case a seed. Core must retain unit checks.
- **CR-3 — `When.encounter "preop"`: pending.** Scope consent, H&P update,
  meds-to-hold and anticoagulant review to pre-op `signOrders`. The separate
  `signPreOpOrders` compatibility commit currently duplicates signing rules.
  Consent before pre-op orders is our stricter policy, not the legal deadline.
- **CR-4 — `When.weightBased`: pending.** Scope dose-check review to orders
  whose formulary drug has a mg/kg range. The current `.always` is a stricter
  temporary workaround. Do not weaken kg validation or dose checking.
- **CR-5 — alert click semantics: pending.** A human click should open a firing
  alert, never acknowledge it implicitly; a macro must not acknowledge or
  override. Seeds 4/9 cover unsafe macro attempts. Current alert clicks are ignored.
- **CR-6 — passive alert placement.** `AlertSpec.screens` names canonical screen
  IDs. Workflow-level placement would survive redesigns better; checker lane
  should preserve the declared placement until the model supports this.
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

## Core implementation status and integration requests (Oct 31)

The core queue is landing on `lane/lean-core`, one commit per item. See
`docs/design/changes.md` for the full semantics and compatibility list.

- **CR-1 resolved:** `currentLineComplete` guards `newOrderLine` for humans
  and macros. Checker may replace its blanket rejection with this hard-stop
  semantics. No new action/event was needed.
- **Alert clicks resolved:** human inline clicks are informational (`ignored`),
  macro clicks are `blocked "human only: acknowledge"`. Only a human matching
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
