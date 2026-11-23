# Layout change policy

Layout movement has no separate charge or displacement limit. Daily net saving equals expert gross click-plus-scroll saving and must reach five actions. Completion, the 2% key/time caps, bounded click/scroll holds and bounded-clinician relearning replay remain in force. The alert budget, context requirements, screen rules and R3 copy caps are unchanged.

## Compatibility

`design.stabilityBudget` remains an unused serialized field in Lean, the JSON codec, release specifications and TypeScript validators/types. Removing it would change decode/re-encode bytes for frozen specs, certificate hashes and archived fixtures. Retaining that compatibility surface avoids rewriting historical evidence or changing certified app fixtures. Its equality in `Spec.Extends` preserves legacy metadata; no layout check reads its value. `componentsMoved` and `stabilityOk` remain informational legacy decision fields. The older proposal loop keeps its baseline 5% simulated login-revert probability, with no movement-dependent increment.

New runs bind `hillclimb.objective = "gross-actions-v1"`; session replies use version 3. `net` and `bestNet` keep their JSON names and contain gross daily saving. New-policy resume and replay preserve command comparisons. Historical recordings remain readable, but manifests without this objective require their original revision for execution; the current code refuses to silently apply new scoring to an old run. No historical records or certificates were rewritten.
