# Handoff: core changes (`lane/lean-core`)

Worktree: `/home/saithat/Projects/VGI-lean`. Main merged at `1f43d67` before
starting. The orchestrator's five-item core changes queue is complete.

## Completed and pushed, one item per commit

| Item | Commit | Result |
|---|---|---|
| 1 / CR-1 | `2637308` | `newOrderLine` blocks while the current drug line lacks applicable per-line entries; the view gives the same reason. |
| 2 / alerts, CR-2/4 | `5457421` | Explicit informational human alert clicks; macro alert clicks stop with a human-only reason. CR-2 retains the checker's conservative pin rule; CR-4 was already implemented/proven. |
| 3 / content, CR-3 | `52206f9` | Declared record source enforced on prefill; encounter/weight-based When conditions; workflow-keyed passive targets; optional episode context passed through FHIR. |
| 4 / world/sim | `fb1ed8c` | Optional typed clinical choices; OrderKind/W6Step; service-order prior-auth support; generic drug-name contract corrected; absolute dose caps. |
| 5 / GenTS | `ea76226` | 99 types and 24 real-JSON samples, including Display/Html/render rows and API types, Task and DaySchedule; completeness/name-collision checks. |

## Follow-ups from the consolidated checker request file

Human clicks now open the alert's first pending popup candidate, without
acknowledging it. Passive/unknown/nonfiring/acked alerts do not open; removable
alerts retain popup opt-in. This supersedes item 2's informational human click.
T0/Alerts frame lemmas cover the new popup path; statements are unchanged.
This human-alert follow-up is pushed as `f88c623`.

Checker CR-6 is also resolved in this commit (the final follow-up): prior-auth convenience actions
preserve every confirmed capture on the current slot and cannot create
never/human-only captures. Tiny v1.1 exposes a human field and retains its never
policy. Other specs may authorize the convenience action via a non-human-only
policy; macros still leave those values awaiting human confirmation.

## Validation

- `cd lean && lake build`, `lake check`, `lake comparator`: pass.
- T0, T2, T3, T6, A2, A4 remain proven. All 18 main-theorem `#print axioms`
  audits report only `propext`, `Quot.sound`, `Classical.choice`.
- No theorem statements changed; `Statements.lean` remains DRAFT, unchanged.
  Its existing challenge-only `sorry` placeholders remain isolated from the
  finished proof modules. No new unfinished proofs or axioms were introduced.
- `pnpm --filter agent exec tsc --noEmit --strict --target es2020 --moduleResolution node ../lean/generated/ehr-samples.ts`: pass.
- World typecheck/lint/test: pass, 52 tests.
- Agent typecheck/lint/test: pass, 31 tests.
- App build/lint/test: pass, 78 tests.
- Core regression guards are in `lean/Ehr/Core/Tests.lean`, imported by Ehr.
  They cover line hard stops, alert clicks, record source/unit preservation,
  conditions/workflow targeting, dose caps, typed JSON and public-step service
  order entry followed by a prior-auth request.

## Contract details for consumers

- New task/order fields are optional, so old schedules still parse. JSON names
  omit Lean's `?`. OrderChoice: supplyDays, curesExemptReason, holdReason, kind,
  code. TaskChoices: painScore, w6Step, refillReason.
- Missing order kind means medication. Medication `drug` is a lowercase generic
  formulary name. Imaging/procedure use `kind` and a service `code`, with empty
  `drug`. The UI captures orderKind/orderCode on one slot; a release spec must
  declare these fields. Drug alerts still inspect only medication order lines.
- FactsContext.encounterKind is caller-provided episode context, not historical
  encounter inference. When.encounter uses Facts.encounterKind.
- ElementSpec.recordFact is the only permitted record prefill source; none
  forbids record prefill. Incorrect sources are ignored at runtime and should
  also be rejected by the checker.
- AlertSpec.screens contains workflow tags. Use AlertSpec.targetsScreen; screen
  IDs may change freely without evading passive-alert coverage.
- maxDoseMgTenths is an absolute per-dose cap, 0 if unspecified. Both weight
  bounds are capped; absolute overdose detection works without a kg weight.
  Six existing world reference caps were populated. A drug's largest cap does
  not represent every smaller regimen-specific cap (notably amoxicillin).

## Minimal edits outside Core

- T0/T3/Alerts branch frames; Frame's record-prefill lemma; Alerts' Tiny example.
- Tiny weight-source metadata, workflow target and human prior-auth field;
  TinyTests uses the field and checks preservation. V1's four active record
  sources and three passive workflow targets. No entry/review rule was weakened.
- Render.Types/Fhir: optional encounter context and its projection.
- Formulary: six existing world pediatric caps, expressed in tenths of mg.
- Agent validator: preserve new optional fields and accept new When cases.
- Ehr.lean: register Core.Tests. Tools/GenTS and Samples: requested generator
  work. Generated TS is regenerated, never hand-edited.

## Continuation: Schedule II constraints and albuterol cap

Synced `origin/main` at `7c7596b` before changes. The original queue above remains
complete. New core work:

- `0b929f0`: albuterol absolute cap, 5 mg (`maxDoseMgTenths := 50`), retaining
  the mg/kg range. Guards cover 52.5/69.6/71.4 kg adolescent cases, doses above
  and below the capped range, a smaller child and overdose without a weight.
- `4a11bc8`: added `EntryReq.allowed? : Option (List String)` (optional JSON `allowed`).
  Allowed strings parse with the element kind and must equal the same capture
  that satisfies confirmation, human-entry, units and slot checks. Empty lists
  allow nothing; omitted constraints preserve existing behavior.
- Added `When.drugClass` as a compatible spelling of `orderClass`, including
  per-line matching, and `scheduleII` on the four requested Schedule II drugs.
  Tramadol/lorazepam/alprazolam remain outside that class.
- Both commit and new-line guards enforce allowed values. The confirmed bad
  default blocks with `value not allowed: refills (allowed: 0)`.
- Strengthened T0 coverage with `entryMet_iff_values`,
  `commitGuard_iff_values`, `T0_entry_values_allowed` and
  `T0_entry_values_perLine`. The original `T0_entry_values` follows from the
  stronger theorem; frozen Comparator statements are unchanged. Concrete
  completing examples discharge the new theorems' hypotheses. All 24 audited
  theorems use only propext, Classical.choice and Quot.sound. No unfinished
  proofs, axioms or native_decide were added.
- Regenerated 99 TS types and 26 real JSON samples, including the exact
  per-line zero-refills requirement and a constrained example spec.
- Core regressions exercise all four Schedule II drugs, Schedule IV exclusions,
  default confirmation, zero entry, wrong units, empty/invalid allowlists,
  mixed/wrong slots, pending/confirmed capture separation, inactive conditions,
  public human/macro new-line stops, view reasons, and the JSON step API.

### Continuation validation

- `cd lean && lake build`: pass.
- `lake exe gents`: pass; generated-sample strict tsc: pass.
- `lake check`: pass (default kernel accepts the solution).
- `lake comparator`: pass (`Your solution is okay!`), all 18 frozen statements.
- Workspace build, typecheck and lint: pass.
- Agent tests: 31 pass. App tests: 90 pass.
- World tests: 91 pass, 1 fails because world/src/formulary.ts has not yet
  mirrored the four new Schedule II classes (the full-field equality contract
  correctly detects this). Never change that test or remove the core class.

## What's left

Nothing left in the lean-core implementation/proof queue. Both implementation
steps are committed and pushed; final build, kernel check, Comparator, 24 axiom
audits and generated-sample typecheck pass. The full TS suite is not yet green:
the one world mirror failure below requires an owning-lane edit.

Cross-lane adoption is requested in `docs/design/changes-requests.md`:

- World: append `scheduleII` to the four corresponding class lists to restore
  the Lean/world formulary equality test.
- Agent: accept `When.drugClass` and preserve optional `entries[].allowed` in
  zod; add an exact round trip of the generated constrained spec. The current
  validator rejects drugClass and strips allowed. A concrete minimal patch for
  world/agent is prepared at `/tmp/lean-core-compat.patch`; ownership exception
  was requested asynchronously and has not been granted as of this handoff.
  Apply only with that exception or in the owning lane.
- Content: add the owner-approved per-line zero-refills requirement to every
  applicable hospital-spec signing workflow, with rule citation and permanent
  bad-program-16 regression. Core tests are adoption examples, not production
  hospital-spec changes.
- Check: account for allowed values when checking completability and rejecting
  unsafe defaults/macros; exercise mixed order lines.
- WASM: rebuild the interpreter assets with the new guard and add the new
  cases to native/WASM equivalence coverage. App's checked-in binary predates it.

Earlier cross-lane requests in `changes-requests.md` remain owned by their
lanes: workflow/passive coverage, per-workflow enter-once/source checks,
service fields and human prior-auth adoption, and typed episode/task context.
Broader unfinished project proofs remain tracked in TODO_PROOFS.md.
