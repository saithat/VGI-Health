# Cross-lane change requests

## Sim → lean-core / world: typed task choices (2026-10-31)

The sim lane merged `origin/main` and `origin/lane/lean-core`. Please add typed
`TaskChoices.curesExemptReason?`, per-drug supply days, naloxone response and
surgical phase/assessment choices, and populate these in world schedules.
The simulator must not interpret `noteSections` strings as exemption or supply
facts. The core branch currently has none of these fields. Sim will merge the
core update and use its exact field names. W6 needs to distinguish
`signPreOpOrders` from `signOrders`; W4 assessment tasks need `chartAssessment`.
