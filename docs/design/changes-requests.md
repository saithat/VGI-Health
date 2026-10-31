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
