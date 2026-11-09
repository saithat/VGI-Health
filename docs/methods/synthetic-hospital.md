# Synthetic Hospital: conversion, case mix and note sections

[Overview](../../README.md) · [Methods and reproduction](../../README.md#documentation)

Synthetic Hospital v1.3 (Park, Chen, Dettmers 2026, arXiv:2609.30027; pinned
commit `911f34c4`, `scripts/synthetic-hospital/source.json`) is a generator's
output, so every value taken from it is labeled **synthetic-benchmark**. It is a
scenario source and never evidence "calibrated from observed care". Its dates
are monthly, so it supplies no timing. Wave-3 decisions 6, 13 and 14
(`docs/design/wave3-decisions.md`) apply it in three places.

## Conversion (decision 6)

`make synthetic-hospital` fetches both release files at the pinned commit,
verifies their SHA-256, and converts **all 1,268 patients and 5,602 encounters**
(`fixtures/synthetic-hospital/`, 60 MB, untracked; `--count N` keeps a subset).
The released data is synthetic and needs no de-identification. Only real
organization and clinician names pass through `scripts/fictional-identities.mjs`.
`index.json` carries `label: "synthetic-benchmark"`.

The source `age` is the age at the **first** encounter
(`age_at_first_encounter` matches it for all 1,208 patients that record it). The
earlier converter treated it as the current age. That put some timelines
(mostly infants) before the approximate birth date, and excluding them capped
conversion at 1,193 patients. The
birth date now falls in the year before the shifted first encounter, on a
deterministic day, so every encounter follows birth and the source age holds at
the first visit. Current ages, the `pediatric` flag and persona fits use the
reference date. Bundle hashes therefore differ from the 150-patient cohort, and
the live baseline import needs a fresh tenant.

The converter also writes `fixtures/synthetic-hospital-sections.json` (12 MB,
untracked): all 59,964 released `encounter_ehr_sections` rows, each with its
setting, sex, age at encounter and matched local scenarios, with names replaced
as in the bundles. It sits outside the bundle directory, because consumers read
every `*.json` there as a bundle.

## Case mix and imaging priority (decision 13)

`scripts/synthetic-hospital/mix.mjs` reads the DB read-only
(`encounters.py`). It writes the committed aggregate table
`world/src/synthetic-hospital-mix.json`, and `--check` verifies it against the
pinned DB. Each encounter has exactly one "correct" diagnosis. The
`RULES` table maps ICD-10-CM prefixes to local scenario keys inside
each persona setting: ED adult/pediatric, primary-care chronic focus (Internal or Family
Medicine outpatient), adult outpatient acute add-ons, pediatric sick visits and
the medical ward's initial census. Encounters that match no local scenario are
counted as uncovered. They are not modeled, because they would need new order
sets.

Generation weights in `world/src/case-mix.ts`, `--case-mix synthetic-hospital`
(the CLI default):

- a scenario that the legacy weights make ineligible for the patient (weight 0,
  such as hyperglycemia without diabetes or PE while anticoagulated) stays ineligible;
- each eligible scenario weighs its dataset count + 1. The add-one pseudo-count
  is a declared scenario choice that keeps unmatched local workflows reachable;
- the legacy flu-week and urgent-care multipliers are kept as declared scenario
  factors. The legacy age, sex and history multipliers are replaced.

`--case-mix legacy` and the library default (`generateWorld` without options)
reproduce the frozen archives exactly. Settings, rates and visit counts are
unchanged: the dataset's setting mix (55% outpatient, 31% ED) does not resize
personas, and the surgical-consult rates stay local.

| Setting (dataset pool) | Encounters | Matched | Matched share |
|---|---:|---:|---:|
| ED adult | 1,499 | 194 | 12.9% |
| ED pediatric | 256 | 16 | 6.3% |
| Primary-care chronic focus | 485 | 80 | 16.5% |
| Adult outpatient acute | 2,670 | 25 | 0.9% |
| Pediatric sick visit | 469 | 19 | 4.1% |
| Medical ward admission | 190 | 9 | 4.7% |

The dataset is a mostly rare-disease, board-question-derived case set, so
coverage is low. For the thin settings (pediatric, acute outpatient and ward),
the weights are mostly the pseudo-count.

Imaging priority: ED pending-imaging `ServiceRequest`s in the day context get
`priority` from the dataset's ED split, a deterministic draw keyed by seed, day
and task. The priority also appears on the track board's pending-imaging text.
The split is 70.5% stat, 28.8% urgent and 0.7% routine (702 orders). Overall it
is 36% stat, 29% urgent and 35% routine (1,865 orders), and outpatient is 72%
routine (882 orders). Clinic and surgery imaging orders keep no priority: order
entry has no imaging-priority element, and adding one would change the spec.

## Note section text (decision 14)

Before this change, every documented section typed Lean's fixed phrase
`<section>: reviewed, see plan.` With `--note-text synthetic-hospital` (the CLI
default), the world adds `choices.noteTexts`, and the simulated clinician types
that text instead (`Goals.sectionText`). `NoteText` and
`TaskChoices.noteTexts?` are additive Lean fields; older schedules omit them.
`world/src/notes.ts` maps 30 local section ids to dataset section types (for
example `exam` to `physical_exam` and `assessmentPlan` to `assessment` + `plan`).
Each task borrows one donor encounter from its setting. The donor is matched by
ED scenario first, then sex and age band; a section type the donor lacks comes
from another matched donor. Sections with no dataset counterpart (care gaps,
consent and similar) keep the fixed phrase, as does all inpatient nursing (P3)
documentation, because the dataset holds physician chart sections. Section sizes
therefore follow the dataset by construction. Donor content can disagree with
the local scenario outside the ED match. `--note-text legacy` omits all text.

## Distribution checks

`node scripts/synthetic-hospital/check-world.mjs --world W --baseline B
[--simulate]` compares a world with the table. Seed 1, ten days, 194 dataset ED
encounters vs 135 generated adult ED cases:

| ED adult scenario | Dataset | Weight (+1) | Generated | Legacy world |
|---|---:|---:|---:|---:|
| chest pain | 19.6% | 18.5% | 24.4% | 10.0% |
| abdominal pain | 17.5% | 16.6% | 15.6% | 8.6% |
| renal colic | 10.3% | 10.0% | 11.9% | 5.0% |
| pulmonary embolism | 9.3% | 9.0% | 10.4% | 5.7% |
| pneumonia | 7.7% | 7.6% | 5.9% | 14.3% |
| COPD/asthma | 7.2% | 7.1% | 3.7% | 2.1% |
| pyelonephritis | 6.2% | 6.2% | 4.4% | 5.7% |
| hyperglycemia | 4.6% | 4.7% | 3.0% | 0% |
| influenza-like (flu-week factor) | 2.6% | 2.8% | 7.4% | 10.7% |
| other 8 scenarios | 14.9% | 17.5% | 13.3% | 37.9% |

Eligibility gates and the flu week shift the generated shares from the weights.
Pediatric ED (24 cases) is 12.5/37.5/50% otitis/asthma/gastroenteritis against
the dataset's 12.5/37.5/50%. ED imaging priority over 82 generated orders is
58.5% stat, 40.2% urgent and 1.2% routine. A 20,000-key check of the draw gives
70.4/28.7/0.8%. Mapped sections cover 70.6% of the generated section entries
(2,601 of 3,683). Generated vs dataset mean characters per section:

| Setting / section | Generated mean (n) | Dataset mean |
|---|---:|---:|
| ED HPI | 378 (168) | 340 |
| ED exam | 149 (168) | 170 |
| ED triage (complaint + vitals) | 174 (168) | 186 |
| ED MDM (assessment) | 73 (168) | 77 |
| Outpatient HPI | 350 (340) | 346 |
| Outpatient exam | 170 (394) | 158 |
| Outpatient assessment/plan | 125 (399) | 98 + 115 when both exist |

Mean typed characters per task rise from the fixed phrases' 198 to 1,121 (ED),
143 to 763 (primary-care visit), 117 to 556 (pediatric visit) and 108 to 293
(surgery). A dataset ED
note averages 1,992 characters over 10.9 sections, more than the local sections
document.

## Typing, scroll and reading cost

This data-lane measurement predates the wave-3 simulator increment. Current
length-dependent reading/scrolling and its legacy opt-out are documented in
[wave-3 simulation](wave3-simulation.md#separate-time-on-one-server).

Native `ehr simulate` covered ten days and five personas on the expert policy,
using releases v1/v2/v3 by day. It compared the dataset-text world with an
identical fixed-phrase world (same seed and case mix; schedules differ only in
`noteTexts`). Every task completed in both.

| Persona | Keystrokes | KLM minutes | Queue delay (min) | Scrolls |
|---|---:|---:|---:|---:|
| P1 primary care | 35,969 → 139,791 | 768.5 → 1,117.2 | 70.7 → 70.7 | 7,165 (unchanged) |
| P2 ED | 46,795 → 127,120 | 1,247.5 → 1,514.4 | 231.7 → 296.6 | 16,529 (unchanged) |
| P3 inpatient RN | 14,252 (unchanged) | 943.8 (unchanged) | 1,316.6 | 8,328 (unchanged) |
| P4 pediatrics | 32,352 → 107,751 | 612.0 → 862.5 | 20.9 → 20.9 | 6,360 (unchanged) |
| P5 surgery | 22,367 → 53,459 | 728.9 → 833.3 | 1,115.0 → 1,115.3 | 6,705 (unchanged) |

Typing is charged at K = 200 ms per character, so sized sections add about 54 s
(primary care) to 95 s (ED) per task. Overtime and overdue doses do not change.
Every character is typed: templates, dictation and copy-forward are not
modeled, so this is an upper bound for authoring. P3 keeps the fixed phrases.

In that data-only comparison, scroll and reading costs did not change. The A04 viewport is ordinal (scroll
pages by component index), and reading (A17, 1,350 ms per item) is an opt-in,
item-based lookup cost; neither depends on text length. Charging them by length
was outside the data lane; the owner subsequently approved and the sim lane
implemented it. For scale only: with an assumed 90 characters per
line, 10 lines per page and 200 words per minute (declared scenario values, not
used by the simulator), a dataset ED note of 1,992 characters is 23 lines (2
scroll pages, 2.2 s at A04's 1,100 ms) and about 2 minutes of reading.

## Reproduce

```sh
make synthetic-hospital            # fetch, verify SHA-256, convert, check the mix table
make test-synthetic-hospital
for m in synthetic-hospital legacy; do
  pnpm --filter world gen --seed 1 --days 10 --case-mix synthetic-hospital --note-text $m \
    --out "$TMPDIR/sh-$m" --quiet
done
node scripts/synthetic-hospital/check-world.mjs --world "$TMPDIR/sh-synthetic-hospital" \
  --baseline "$TMPDIR/sh-legacy" --simulate --jobs 6
```

World generation with the default `--note-text synthetic-hospital` needs the
local sections fixture and stops with a hint when it is missing.
