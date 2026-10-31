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
