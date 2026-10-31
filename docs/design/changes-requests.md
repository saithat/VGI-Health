# World lane integration requests

## Typed simulation choices (requested by orchestrator, pending lean-core)

At `origin/lane/lean-core` abac908 (already included in main 1f43d67),
`OrderChoice` and `TaskChoices` still lack the requested `supplyDays`,
`curesExemptReason`, `holdReason`, `painScore`, `w6Step`, `refillReason`, and
imaging/procedure order kind. Please publish the authoritative Lean fields,
their placement and encodings, and regenerate `lean/generated/ehr-types.ts`.
World will migrate its flows and committed run against those types.
Also include refusal, pain reassessment, sedation, PRN reason, and naloxone
response fields to replace all remaining clinical note-string conventions.

## Pediatric absolute dose caps (lean-core/content)

The generator applies absolute per-dose caps (see `world/src/formulary.ts`,
`PEDS_DOSE_CAPS`). A heavy child's correctly capped dose can fall below the
formulary's mg/kg minimum. Lean currently has no absolute-dose-cap data, so
its dose alert may fire on such a dose. Please model indication-dependent
absolute caps without weakening the dose safety rule.

## Synthea medications outside the demo formulary (lean-core/render)

The real population includes Humulin 70/30, hydrocodone-only extended-release,
fentanyl, buprenorphine/naloxone, and diazepam. World retains these displays in
`otherMedDisplays` and does not substitute a different drug. If alert facts
need their classes or MME factors, extend the authoritative formulary/FHIR
mapping; do not equate Humulin with glargine/lispro or hydrocodone-only with
hydrocodone–acetaminophen.
