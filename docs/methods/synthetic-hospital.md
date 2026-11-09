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
(the CLI default). They apply only to settings with at least
`MIX_MIN_MATCHED` = 30 matched encounters (declared scenario threshold,
owner-approved 2026-11-09): **ED adult (194) and primary-care chronic focus (80)
qualify**. ED pediatric, outpatient acute, pediatric sick visits and the ward
keep their local weights. In qualifying settings:

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
coverage is low; the threshold keeps the thin settings on local draws.

Imaging priority: ED pending-imaging `ServiceRequest`s in the day context get
`priority` from the dataset's ED split, a deterministic draw keyed by seed, day
and task. The priority also appears on the track board's pending-imaging text.
The split is 70.5% stat, 28.8% urgent and 0.7% routine (702 orders). Overall it
is 36% stat, 29% urgent and 35% routine (1,865 orders), and outpatient is 72%
routine (882 orders). Clinic and surgery imaging orders get `priority` from
the outpatient split (inpatient orders would use the inpatient split, 61% stat;
the current world places none). The draw is deterministic, keyed by task and
order index, and consumes no random stream. Release v2 adds the optional
`imagingPriority` order element (`ServiceRequest.priority`, coded
`request-priority`, no entry or review requirement) with a field in the
canonical imaging/procedure group; the simulated clinician enters it when the
order carries a priority and the release declares the element. Legacy worlds
carry no priority.

## Note section text (decision 14)

Before this change, every documented section typed Lean's fixed phrase
`<section>: reviewed, see plan.` With `--note-text synthetic-hospital` (the CLI
default), the world adds `choices.noteTexts`, and the simulated clinician types
that text instead (`Goals.sectionText`). `NoteText` and
`TaskChoices.noteTexts?` are additive Lean fields; older schedules omit them.
`world/src/notes.ts` maps 30 local section ids to dataset section types (for
example `exam` to `physical_exam` and `assessmentPlan` to `assessment` + `plan`).
Each task borrows one donor encounter from its setting. The donor is matched by
diagnosis key first (the ED scenario, or for clinic and pediatric tasks the
visit kind recorded during generation: chronic focus, acute problem or
pediatric reason, `DayOutput.visitKinds`), then sex and age band; a section type the donor lacks comes
from another matched donor. Sections with no dataset counterpart (care gaps,
consent and similar) keep the fixed phrase, as does all inpatient nursing (P3)
documentation, because the dataset holds physician chart sections. Section sizes
therefore follow the dataset by construction. Donor content can still disagree
with the local case when no donor matches the key (new-patient and follow-up
visits record none). `--note-text legacy` omits all text.

`--note-typed-share N` (per mille, default 1000 = off) is a declared
template/dictation discount: only the first N/1000 of each section is
keyboard-typed and supplied; the remainder is assumed to arrive by template,
copy-forward or dictation, which the simulator does not model. It is a scenario
value without a verified recent citation. Rule et al. 2021 (JAMA Netw Open
4(7):e2115334, one academic center's outpatient notes) is a candidate source
for a typed share, but its figure was not verified from the full text.

## Distribution checks

`node scripts/synthetic-hospital/check-world.mjs --world W --baseline B
[--simulate]` compares a world with the table. Seed 1, ten days, 194 dataset ED
encounters vs 143 generated adult ED cases:

| ED adult scenario | Dataset | Weight (+1) | Generated | Legacy world |
|---|---:|---:|---:|---:|
| chest pain | 19.6% | 18.5% | 17.5% | 10.0% |
| abdominal pain | 17.5% | 16.6% | 16.1% | 8.6% |
| renal colic | 10.3% | 10.0% | 10.5% | 5.0% |
| pulmonary embolism | 9.3% | 9.0% | 6.3% | 5.7% |
| pneumonia | 7.7% | 7.6% | 8.4% | 14.3% |
| COPD/asthma | 7.2% | 7.1% | 12.6% | 2.1% |
| pyelonephritis | 6.2% | 6.2% | 7.0% | 5.7% |
| hyperglycemia | 4.6% | 4.7% | 0% | 0% |
| influenza-like (flu-week factor) | 2.6% | 2.8% | 5.6% | 10.7% |
| other 8 scenarios | 14.9% | 17.4% | 16.1% | 37.9% |

Eligibility gates (hyperglycemia needs diabetes) and the flu week shift the
generated shares from the weights. Pediatric ED, the ward and the other thin
settings keep the local weights (pediatric ED 57.9/21.1/21.1%
otitis/asthma/gastroenteritis vs the legacy world's 58.3/16.7/25.0%). ED
imaging priority over 84 generated orders is 66.7% stat, 33.3% urgent, 0%
routine; the 11 clinic and surgery imaging orders are 9 routine and 2 urgent. A
20,000-key check of the ED draw gives 70.4/28.7/0.8%. Of 356 clinic and
pediatric visits, 294 record a visit kind and 213 of those find a
diagnosis-matched donor (well-child, flu-shot and wellness visits have no
dataset counterpart). Mapped sections cover 72.4% of the generated section
entries (2,615 of 3,611). Generated vs dataset mean characters per section:

| Setting / section | Generated mean (n) | Dataset mean |
|---|---:|---:|
| ED HPI | 364 (167) | 340 |
| ED exam | 151 (167) | 170 |
| ED triage (complaint + vitals) | 178 (167) | 186 |
| ED MDM (assessment) | 74 (167) | 77 |
| Outpatient HPI | 339 (343) | 346 |
| Outpatient exam | 177 (394) | 158 |
| Outpatient assessment/plan | 134 (397) | 98 + 115 when both exist |

Mean typed characters per task rise from the fixed phrases' 197 to 1,104 (ED),
142 to 792 (primary-care visit), 114 to 592 (pediatric visit), 110 to 615
(surgery clinic) and 105 to 242 (surgery W6). A dataset ED note averages 1,992
characters over 10.9 sections, more than the local sections document.

## Typing, scroll and reading cost

Native `ehr simulate` covered ten days and five personas on the expert policy,
using releases v1/v2/v3 by day. Three worlds share the seed and case mix:
fixed phrases, dataset text, and dataset text with `--note-typed-share 294`
(an example setting of the off-by-default discount). Schedules differ only in
`noteTexts`. Every task completed in all three, including clinic imaging orders
that now enter `imagingPriority` from day 4.

| Persona | Keystrokes (phrase → text → 29.4%) | KLM minutes | Queue delay (min) |
|---|---:|---:|---:|
| P1 primary care | 36,505 → 138,395 → 53,749 | 777.6 → 1,118.3 → 835.6 | 70.3 (unchanged) |
| P2 ED | 47,980 → 125,717 → 65,229 | 1,263.0 → 1,517.1 → 1,319.1 | 262.7 → 325.9 → 276.4 |
| P3 inpatient RN | 13,773 (unchanged) | 882.8 (unchanged) | 1,086.4 (unchanged) |
| P4 pediatrics | 31,678 → 112,286 → 47,383 | 600.0 → 869.2 → 652.3 | 15.3 (unchanged) |
| P5 surgery | 22,344 → 53,242 → 27,509 | 715.8 → 819.6 → 733.2 | 348.2 → 348.2 → 348.1 |

Typing is charged at K = 200 ms per character, so full sections add about 54 s
(primary care) to 92 s (ED) per task. P2 overtime rises from 11.3 to 14.2
minutes over ten days (11.9 with the 29.4% share); overdue doses do not change.
Without the discount every character is typed, an upper bound for authoring.
P3 keeps the fixed phrases. Scroll counts are identical in all three worlds.

Scroll and reading costs do not change. The A04 viewport is ordinal (scroll
pages by component index), and reading (A17, 1,350 ms per item) is an opt-in,
item-based lookup cost; neither depends on text length. Length-dependent scroll
and reading belong to the wave3-sim lane. For scale only: with an assumed 90 characters per
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
