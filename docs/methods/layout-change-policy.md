# Layout change policy

Layout movement has no separate charge or displacement limit. Both clinicians must complete every task without increasing total modeled time over observed days; the expert’s modeled-time saving per day must be strictly positive. Popup counts, repeated popup declarations and start-screen field depth have no separate checker constraints. Context reachability, clinical safety, copy limits and geometry rules G1–G7, G10 and G11 remain in force.

## Compatibility

`design.stabilityBudget` remains an unused serialized field in Lean, the JSON codec, release specifications and TypeScript validators/types. Removing it would change decode/re-encode bytes for frozen specs, certificate hashes and archived fixtures. Retaining that compatibility surface avoids rewriting historical evidence or changing certified app fixtures. Its equality in `Spec.Extends` preserves legacy metadata; no layout check reads its value. `componentsMoved` and `stabilityOk` remain informational legacy decision fields. The older proposal loop keeps its baseline 5% simulated login-revert probability, with no movement-dependent increment.

New runs bind `hillclimb.objective = "modeled-time-v1"`; session replies use version 3. `net` and `bestNet` keep their JSON names and contain expert modeled-time saving in deciseconds per observed day. New-policy resume and replay preserve command comparisons. Historical recordings remain readable, but manifests with an older or missing objective require their original revision for execution; the current code refuses to silently apply new scoring to an old run. No historical records or certificates were rewritten.
