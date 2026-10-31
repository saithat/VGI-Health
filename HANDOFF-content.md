# Handoff: content lane (`lane/content`)

Worktree: `/home/saithat/Projects/VGI-content`, branch `lane/content` (pushed).
Original brief: the "EHR-content lane" task (spec v1 + canonical EHR + seeded
bad programs + export + tests + stats), plus the orchestrator's CURES/naloxone
addition. Nothing from either has been dropped. Items below are either done or
listed as remaining.

## Done (commits)

| Commit | What |
|---|---|
| `9334554` | `lean/Ehr/Specs/V1.lean`: spec v1. Has 118 elements (now 121), 43 infos (now 44), 11 commits, entry and review requirements per BRIEF 5a, 18 alerts (10 interruptive, 3 passive, 5 removable), design rules, and build-time `#guard` self-checks. Every definition has a docstring. |
| `445d080` | Merged `origin/lane/lean-core`, which brings in M2 (interpreter), M3 (API/CLI), and the CA-rules core support (`ReviewReq.waivedBy?`, `When.naloxoneRisk`, formulary with opioids/benzos, `"controlled-II-IV"`, MME). |
| `f458330` | Spec v1 gets the CA rules: info `curesReport`; `curesExemptionReason` (coded `cures-exemption`, prescribers, never, compliance) plus `curesExemptionCodes`; the `curesReview` (signOrders and signPreOpOrders, `orderClass "controlled-II-IV"`, shownOrReceipt 1440 min prescribers, `waivedBy? := some "curesExemptionReason"`); `naloxoneOffer` and `naloxoneEducation` (never, compliance), required `when := .naloxoneRisk` for both signing commits. Docstrings cite H&S §11165.4 and B&P §741. |
| `9384861` | Canonical program `canonicalV1` in `lean/Ehr/Canonical/`: `Builders.lean` (ids, components, chart shell, composer, order-set rows, macros), `W1Visit`, `W2Results`, `W3Ed`, `W4Mar`, `W5Peds`, `W6Surgery`, `W7Refills`, `Program.lean` (the `home` start screen and `canonicalV1`). Imported from `lean/Ehr.lean`, so `lake build` builds it. |

Canonical size now: **43 screens, 1649 components, 317 field components, 430
buttons and macro buttons, 39 macros**. Compact JSON is about 363 KB. Checked
ad hoc with `lake env lean` (these checks are not yet committed as tests):
- component ids are unique;
- every referenced element, info, alert, commit, goto target, and macro exists;
- every `parent?` exists on its screen;
- every macro step targets an existing component or screen;
- every spec commit has a commit button.

### Design decisions to know
- **`signPreOpOrders` is a separate commit.** `When` has no "pre-op" condition. Consent, H&P update, meds-to-hold, and `anticoagulantList` `mustShow` attach to it. The alternative is a `When.encounter "preop"` core change, which needs lane A.
- **`doseCheck` is `mustShow` on signing with `when := .always`.** This is stricter than "weight-based orders only", because `When` cannot express "the drug has a mg/kg range".
- Component ids are `"<screen>.<local>"`, and `tag = id`. Screen `workflow` is `"W1"`…`"W7"`, or `"shell"` for `home`.
- **Each element is bound at most once per workflow** (one screen), so a per-workflow enter-once check passes. Elements shared across workflows, such as `drug` in 4 composers, are on different workflow paths. W3 and W6 ask `dosingWeight` and the controlled-substance section on the sign screen (W6 also asks `weight` there), because orders arrive from both order sets and the composer.
- **Interpreter facts the design relies on** (from `docs/design/changes.md`):
  - macro-entered values need a human `confirm`;
  - a macro cannot enter `never`-policy or human-only elements, and cannot review, ack, or commit;
  - `.current`-slot fields cannot revisit an earlier order line after `newOrderLine`. So **order sets fill fixed-slot rows on lines 10+** (`orderSetRows`, `orderSet`) so that each value can be confirmed;
  - removable popups fire only at the commit, and only on a screen with `alert a (popup := true)`. Interruptive alerts pop up from the spec alone. Canonical interruptive and passive alert components use `popup := false`; removable ones on commit screens use `true`;
  - `freq` codes must be `daily|bid|tid|qid|q4h|q6h|q8h|q12h`, otherwise naloxone risk is assumed. Cefazolin uses `once`, which is fine for a non-opioid;
  - formulary dose ranges are pediatric per-dose mg/kg. Adult doses in macros were chosen to fall in range for a ~70 kg adult (W3/W6) and ~92 kg (W1). Pediatric doses assume ~20 kg.
- **W7 alerts** (interaction, active-Rx, care-gap popups) only fire if `Facts.medToGive?` is set to the requested drug in a refill episode. The world lane should set it, and tests must set it.

## In progress
Nothing is half-written. The canonical step is committed and builds.

## Remaining tasks (from the original brief plus the CA addition)

1. **Interpreter tests, step 5** (`lean/Ehr/Canonical/Tests.lean`, imported from `Ehr.lean`). Use `#guard` on happy paths through `Ehr.step`/`runAll` for every commit. Model it on `lean/Ehr/Examples/TinyTests.lean`. Use realistic Tiny-like `Facts`, e.g. W1 `RK/M/58` at 92.4 kg on lisinopril (`aceInhibitor`, `biguanide`, `statin`), and set `record` entries `appointmentReason`, `preferredPharmacy`, `requestPharmacy` where used. The commits to cover:
   - W1: signOrders and signNote;
   - W2: ackResult, with `abnormalResult := true`, so the patient message and trend are needed;
   - W3: signOrders and disposition, including lb weight → blocked, then kg;
   - W4: administerMed with insulin, which needs the cosign and `glucoseTrend`; a PRN oxycodone dose, which needs `painScore` and a cosign because it is high-alert; and chartAssessment;
   - W5: signOrders (mg/kg) and recordImmunization (also signNote);
   - W6: signNote, signPreOpOrders (consent, then cefazolin), signOpNote, signOrders (post-op set rows 10–13, confirm each value), and discharge;
   - W7: approveRefill, which needs `refillProtocolMet`, removable popups to ack, and `medToGive? := some "lisinopril"`.

   Also add CURES and naloxone paths: an oxycodone order with the report shown, one with the exemption only, and a high-MME order or a benzodiazepine in `currentMedClasses` (naloxone required).

   Also commit the structural sanity checks above as `#guard`s, plus reachability: BFS over gotos from `home` reaches every screen, and every screen can reach `home`.

   Watch these points while writing the paths:
   - groups start open unless `startCollapsed`;
   - `markReviewed` needs the info shown, so select tab 1 of `<s>.orderInfo` before `review.curesReport`;
   - each `<s>.commit.<id>` is the commit button.

2. **Seeded bad programs, step 3** (`lean/Ehr/Canonical/BadPrograms.lean`). Write 14 patches of `canonicalV1`, each with a docstring. First add small patch helpers (`Program.updateScreen`, `Screen.updateComp`, `Screen.dropComp`, `Screen.insertAfter`, `Program.addMacro`). The intended design:
   1. W1 sign: move `w1Sign.allergies` into a new tabs container at tab 1. Guard → `review required: allergyList`.
   2. `w1Sign.patientIdReentry` prefill `.fromRecord "patientIdentity"`. Interpreter ignores it (`never`); guard → entry required. Structurally: prefill on a `never` element.
   3. W3 triage: replace the weight field with a "Weight (lb)" field bound to a non-spec element `weightLb`, and link dosing weight from it. Entry → `unknown element`; sign blocked for lack of a kg weight.
   4. W3 sign: macro "Override interaction and sign" that clicks `w3Sign.alert.interaction` and then the sign button. The macro stops (the click does not apply, and a commit is human-only); the popup still blocks.
   5. W4 admin: cosign field `.default "<the nurse's own id>"`, plus a macro setting it. Prefill skipped; macro blocked; a human entering their own id is blocked ("different user").
   6. W5 rooming weight `.fromRecord "weightYesterday"`. The interpreter does NOT block this: the value is in kg and confirmed. Structurally malformed only, and that needs the type request below.
   7. Remove `w7Review.decide` (the only way into `w7Decision`). `approveRefill` becomes unreachable (BFS).
   8. W6: a pre-op macro that sets `consentVerified` (blocked: never/humanOnly), with `w6Sign.anticoagulants` removed. The guard blocks.
   9. W1 sign: drop `alert.drugAllergy`, and add a macro "Quick sign amoxicillin" that fills the order, goes to sign, and clicks Sign. Penicillin-allergic facts: the interruptive alert still pops up from the spec.
   10. Add `.alert "doseRangeEveryOrder" true` (not in the spec) on the W1 composer and sign. The interpreter never fires it; structurally it is an unknown alert, A2. With the current types, A2 cannot be violated at runtime.
   11. `interactionOrder` with `popup := true` on both `w1Orders` and `w1Sign`. The interpreter interrupts once (A3 by construction); structurally, an interruptive popup appears twice on one path.
   12. `w1Rooming.careGaps` set to `popup := true` on a passive alert. Never pops (A4); structural reject.
   13. CURES panel removed from `w1Sign`, the `orderInfo` CURES tab and its review button removed, and `controlled` fields removed from `w1Orders`. For a controlled order, signing is blocked forever (unless a prior receipt).
   14. A macro that sets `naloxoneOffer` (e.g. "Oxycodone 30 mg q4h + naloxone offered"). Blocked: a macro may not enter a `never` element.

   Tests must show each unsafe commit is blocked by the interpreter, or that the program is structurally malformed (write small test-local predicates).

3. **Export, step 4.** `lean/Ehr/Tools/ExportContent.lean` plus `[[lean_exe]] name = "export-content"` in `lean/lakefile.toml`. Write `programs/canonical/v1.json`, `releases/v1/spec.json`, and `programs/bad/<n>-<name>.json` (pretty JSON; root arg default `..` when run from `lean/`). Commit the outputs. Optionally register `("v1", Ehr.Specs.V1.specV1)` in `specRegistry` in `lean/Main.lean` (lane A file; coordinate).

4. **Stats, step 6.** `programs/canonical/STATS.md`: counts of screens, fields, actions, alerts by tier, and prompts by friction class. Generate it from the export tool so it stays accurate, and state targets versus actual. Current numbers already exceed the targets (25–30 screens, 150+ fields, 100+ actions).

5. **Orchestrator CA addition, still open:**
   - Merge `origin/lane/regs` when it lands (it does not exist yet), then add citations from `docs/regulations.md` to the V1 docstrings. Label best practice versus law honestly.
   - Verify the CURES exemption codes in `curesExemptionCodes` against it.
   - Bad programs 13 and 14 are part of item 2 above.

6. **`docs/design/changes-requests.md`** (not written yet). It should contain:
   - **`ElementSpec.recordFact? : Option String`**: the only record fact a `recordConfirm` prefill may use (e.g. weight ← `weightToday`). Without it, bad program 6 (yesterday's weight) and a "lb value copied into kg" bug cannot be rejected generically.
   - **`When.encounter "preop"`** or similar: would let pre-op requirements live on `signOrders` instead of `signPreOpOrders`.
   - **`When.weightBased`** (the drug has a mg/kg range): would let `doseCheck` be scoped as BRIEF says.
   - An action to **select an earlier order line** (today `.current` cannot go back).
   - **The meaning of clicking an alert component** (ignored today); used by bad programs 4 and 9.
   - **Passive-alert `screens`** use canonical screen ids. Workflow tags would survive agent redesigns better.
   - **Enter-once should be per workflow path**, or ignore already-captured values: the canonical binds `drug`, `weight`, etc. once per workflow.
   - **`Screen.workflow = "shell"`** for `home`.

## How to build and test
```
cd /home/saithat/Projects/VGI-content/lean
lake build                          # builds everything, runs all #guard tests
lake build Ehr.Specs.V1             # one module
lake env lean /tmp/scratch.lean     # ad-hoc #eval against the built modules
git fetch origin && git merge origin/lane/lean-core   # keep up with lane A
```
Never run two `lake` processes at once in one checkout. `lean/Ehr.lean` is shared with lane A. Merge conflicts there are just import lists: keep both sides.

## Known pitfalls
- `lean/Ehr/Specs/**` is owner-owned after review. Keep edits minimal and readable.
- Do not edit `lean/Ehr/Core/**`; request changes in `docs/design/changes-requests.md`.
- Builders take local names; `cid s name` makes the full id. Don't reuse the shell's local names on a screen: `banner`, `chartSearch`, `back`, `home`, `nav`, `nav.*`, `sidebar`, `side.*`, `chart`, `chart.*`.
- `tabStrip` local names are `<strip>.<info>`, so the same info twice in one strip collides.
- Quantities in macro strings allow at most one decimal (`"0.5"` ok, `"0.15"` fails to parse).
- `orderSet` writes rows `row10.`, `row11.`, …; the screen must contain `orderSetRows s [10, 11, …]` with at least as many rows as lines.

## Unaddressed orchestrator messages
- "Merge lane/regs and add citations" (CA addition item 4): waiting on the branch. Everything else in that message is done (spec), or is listed above (canonical CURES/naloxone fields are done; bad programs 13 and 14 are pending).
