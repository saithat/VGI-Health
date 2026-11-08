# Information needs methodology

[Overview](../../README.md) · [Methods and reproduction](../../README.md#documentation)

`information-needs-v1` is an opt-in simulator specification in
`lean/Ehr/Sim/InformationNeeds.lean`, separate from the certified clinical
rulebook. `simulate --information-needs v1` performs chart lookups before each
episode's entries and commits. Omission or `off` disables the lookup stage;
clock and interruption modes are selected independently. Needs bind a typed question, its gated commit or exact entry slot,
source information IDs, trusted patient data and an authority classification.
A failed lookup leaves the episode incomplete; the event boundary also refuses
missing or stale answers. No lookup creates a clinical review receipt.

| Need ID | Question and gated decision | Source and modeled scope |
|---|---|---|
| `insulin-glucose` | Latest glucose (mg/dL), ≤120 min, before signing, approving a refill or administering insulin | [HUMALOG §§2.2, 5.2](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=c8ecbd7a-0e22-4fc7-a503-faa58c1b6f3f), [LANTUS §§2.2, 5.2](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=d5e07a0c-7e14-4756-9152-9fea485d654a): dosing uses glucose monitoring. The fixed two-hour window and per-action lookup are simulation assumptions. |
| `warfarin-inr` | Latest INR ({INR}), ≤24 h, before signing, refill approval or administration | [Warfarin sodium §2.4](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=bd6ea120-5d1c-4815-94f2-81e28dc6b7a9): regular INR monitoring, daily during initiation until stable; the universal 24-hour window is a simulation assumption, including maintenance/refill tasks. |
| `potassium-level` | Latest potassium (mmol/L), ≤24 h, before potassium chloride signing/administration | [Potassium chloride oral solution §2.2](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=590dd25c-c4cb-489a-a09b-eccbf1d37c1f): serum-potassium monitoring during treatment. Timing and applying this lookup to IV orders are simulation assumptions; no IV dosing rule is inferred. Conditional catalog case; potassium chloride is outside the current order formulary. |
| `potassium-renal` | Latest creatinine (mg/dL), ≤24 h, before the same potassium decision | [Same oral label §8.7](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=590dd25c-c4cb-489a-a09b-eccbf1d37c1f): assess renal function in renal impairment. Creatinine as the proxy, universal applicability and window are simulation assumptions. |
| `antibiotic-allergy` | Whether any active allergy is recorded; full allergy inventory before antibiotic signing/administration | [NICE CG183 §1.2.6](https://www.nice.org.uk/guidance/cg183/chapter/Recommendations): check allergy status before prescribing/dispensing/administering a drug. This subset models chart lookup for antibiotics; confirmation with the patient is outside the simulator. Guidance, not a US legal requirement. |
| `mar-bp-hold` | Latest systolic BP (mmHg), ≤60 min, compared with 100 mmHg before slot-0 `adminStatus` entry for an antihypertensive | **Hospital policy (not law)**: fictional illustrative hold policy. Threshold, window and applying it to these drugs are **simulation assumptions**; the chosen give/hold decision is not changed. HR hold parameters are not modeled. |
| `result-trend` | Ordered dated values of the selected numeric result over seven days before `ackResult` | **Simulation assumption**; at least two source values required. |
| `result-flags` | Any abnormal/critical flag for that analyte over seven days before `ackResult` | **Simulation assumption**; all relevant values and explicit flags required, including for a negative answer. |

Catalog measurements bind their LOINC codes; the current decoder traverses
the actual `UiNode` tree. It requires each exact
value, unit and displayed timestamp in one source row; existing flowsheet
time columns can answer when the measure, unit and exact dated cell survive; trends must retain all
in-window values in chronological or reverse chronological order. Latest-value
ties are retained. Date-only, invalid and timezone-free measurements cannot
supply a recency answer. Active-list questions require the complete inventory
with status, including inactive records, so a filtered list cannot establish
absence. Presentation, timeline, dated-timeline and reference-curve wrappers
preserve satisfaction by Lean proofs. Compact sidebar strings and chart titles
receive no credit. Future chart encodings need their own faithful decoder.
The source projection and semantic-tree-to-visible-pixels boundary remain
trusted; these proofs do not establish human comprehension.

The expert routes through the shortest ordinary navigation path. The bounded
policy uses experienced lookup locations, then visible lexical scent, then paid
help. Both pay existing component-fold scroll costs, additional ten-row pages
through intervening source rows, and modeled reading time. One faithful
read can answer several questions on that same information component. Lookup order is fixed before
all episode actions, a conservative sequencing assumption. An answer carries
one unit per source item per screen transition until its gated action;
questions sharing the same source samples and gate count those items once. This
**modeled cognitive-load proxy** has no calibrated clinical interpretation;
answers reset at episode boundaries and do not train another actor. Existing
clinical review requirements still apply independently.

`min-clicks --information-needs v1` reports independently checked per-episode
minimums in a declared staged space: catalog-order reads followed by the
existing navigation-directed action policy, with a fixed clock. Reads are
zero-activation edges; scrolling and reading time are separate simulator costs.
The sum is not a joint optimum across episode resets or arbitrary interleaving.
Workspace patient selection is outside this minimum, as in the existing search.

Generate separate fictional lookup inputs with
`pnpm --filter world gen --seed 7 --days 2 --information-needs v1 --out <scratch>`.
The generator adds only needed observations, preserves patient references and
uses no historical RNG draws. Bedside observations carry an explicit synthetic
acute encounter link; result-review selection uses the current result detail,
not the oldest point in its trend. Keep the same enriched schedules for needs-on and
needs-off comparisons. Neither generated worlds nor measurements belong in git.

A targeted seed-7 comparison uses the first task per workflow plus the first
represented insulin, warfarin, antibiotic and antihypertensive-administration
category per persona/day. The two-day v1 sample uses the shared clock and typed interruption work: 30 tasks;
**30/30 complete in both arms**. Layout memory starts cold each day and carries between
that day's sampled tasks. Explicit `off` and omission produce byte-identical
native outputs. These are signed needs-on minus needs-off totals, including
downstream route and practice effects; they are not isolated additive lookup
costs or a population estimate.

| Persona | Tasks | Native clicks | Native scrolls | Scroll px | Mouse travel px | Ordinal travel units | Memory carry |
|---|---:|---:|---:|---:|---:|---:|---:|
| P1 | 9 | +32 | +12 | +16,628 | +4,001.80 | +12,240 | 440 |
| P2 | 5 | +16 | +6 | +10,800 | +205.97 | +7,040 | 940 |
| P3 | 6 | +12 | −2 | −4,148 | −3,055.87 | +2,720 | 32 |
| P4 | 4 | 0 | 0 | 0 | 0 | 0 | 144 |
| P5 | 6 | −3 | +6 | +7,304 | −6,647.12 | −3,120 | 231 |

Pixels use Chromium's existing static geometry model at 1440×900, with the
pointer reset per matched task. Workspace controls retain their schedule-day
samples, including the activity switch before patient selection. Only visited screens, attempted remembered
locations and actual alert-acknowledgment targets are captured: 150 screen
state occurrences, zero missing targets. Identical pointer traces have zero delta without
additional capture. Native ordinal page counts and geometry-derived scrolling
are different models; their totals need not move together. Memory carry counts
source items × screen transitions, with identical samples shared by questions
at the same gate. It is neither time nor a measured human capacity limit.

Repeated origins are Chart History (11 answered needs), Chart Summary (11),
and the nursing flowsheet (2). Routes include Chart History → result review
(four trend/flag questions), Chart History → order signing (one INR question),
Chart History → ED signing (one glucose and one INR question), Chart History →
MAR action (two glucose questions), and flowsheet → MAR action (two BP questions). Allergy
lookups lead to signing or MAR action in every role. P4 already encounters the
allergy data on its ordinary route, so this sample adds carry without extra
physical interactions. A future summary could remove a lookup only if its
decoder answers the corresponding need with the required source fidelity;
these measurements do not claim achievable summary savings.

Reproduce in scratch (the pixel pass holds the shared browser lock; it does not
run a screen audit or issue a certificate):

```sh
export TMPDIR="${TMPDIR:?Set disk-backed TMPDIR}" CI=true
pnpm --filter world gen --seed 7 --days 2 --information-needs v1 --out "$TMPDIR/info-needs-world" --quiet
python3 scripts/information-needs-compare.py --world "$TMPDIR/info-needs-world" --out "$TMPDIR/info-needs-final"
flock "$TMPDIR/vgi-browser-heavy.lock" env EHR_BROWSER_LOCK=off pnpm --filter agent exec tsx ../scripts/information-needs-pixels.mts "$TMPDIR/info-needs-final/summary.json"
pnpm --filter agent exec tsc -p ../scripts/tsconfig.information-needs.json
python3 scripts/test-information-needs-compare.py
```

`summary.json` retains task completion in both arms, signed totals, source/gate
screen pairs and the native binary fingerprint; adjacent files retain schedules,
raw traces, lookup records and per-task geometry atlases. Failed tasks remain
visible and are excluded from cost deltas. The certificate-checked micro example
needs five activations (three ordinary actions plus two lookup navigation
activations). A real insulin-administration task exceeded the separate
128-state staged-search check; no minimum was reported. The larger search was
stopped rather than treated as evidence. Search bounds and fixed catalog-order
staging limit this expert floor.
