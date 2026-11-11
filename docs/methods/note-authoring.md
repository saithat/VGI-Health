# Section-level note authoring

Dataset-mode notes default to `--note-authoring template`. `--note-authoring full`
retains full keyboard entry; `--note-text legacy` retains the original short
phrases. `--note-typed-share N` overrides authoring effort with a uniform declared
scenario share (per mille, including 0 and 1000). Every mode retains the **full
section value**: neither the committed text nor length-based reading/scrolling
is truncated. Old schedules without authoring metadata still type every character.

## Verified evidence: N18 (data 2018, published 2021)

Rule A, Bedrick S, Chiang MF, Hribar MR. *Length and Redundancy of Outpatient
Progress Notes Across a Decade at an Academic Medical Center.* JAMA Network Open
2021;4(7):e2115334. DOI: [10.1001/jamanetworkopen.2021.15334](https://doi.org/10.1001/jamanetworkopen.2021.15334).
[Full-text methods and results](https://paperclip.gxl.ai/citations/papers/PMC8290305#L22-L37)
were read with paperclip on 2026-11-09; metadata and exact estimates are in
[`workflow-sources/sources.json`, N18](../design/workflow-sources/sources.json).

The study sampled OHSU outpatient office progress notes across 46 specialties.
It analyzed 2,704,800 notes from 2009–2018 for length, 1,052,445 for redundancy,
and 644,917 notes from **2017–2018** for text origin. EHR metadata counted
characters typed, copied, or templated. The 2018 results are **mean proportions
across notes**, with bootstrapped 99% confidence intervals:

| Origin | Mean | 99% CI |
|---|---:|---:|
| Directly typed | 29.4% | 28.2–30.7% |
| Copied | 14.7% | 13.1–16.5% |
| Templated | 55.9% | 54.1–57.7% |

These are neither author-time fractions nor the 58.8% median word-redundancy
result. Redundancy compares identical word sequences with the patient's previous
note by the same author and is a different measure. The paper reports typed
shares by specialty group (primary 33.8%, adult specialty 21.7%, pediatric 23.1%,
surgical 29.8%), **no section-specific origin shares**, and no separate imported
or dictated fraction. The model groups imported text with templates as a scenario;
it does not claim a source estimate for imports. The pooled input probabilities
are labeled **calibrated, N18, 2018**, explicitly older evidence. The simulator
and its authoring times are not clinically validated.

## Model and parameter provenance

Each mapped Synthetic Hospital section receives one deterministic origin, keyed
by task and section, without consuming a world random stream. The full donor
text remains in `choices.noteTexts`. The optional `authoring` object records
`origin`, `typedCharacters`, and `selections`. Sources and assumptions are also
serialized into the world manifest.

| Parameter | Value | Classification |
|---|---|---|
| Pooled typed/copied/template probabilities | 294/147/559 per mille | calibrated, N18, 2018 |
| Text and full section length | matched donor | synthetic-benchmark, Synthetic Hospital v1.3, 2026 |
| Applying pooled character shares independently to whole sections | same probabilities for every mapped section | scenario, declared, uncited; section-level shares were not reported |
| Applying outpatient evidence to ED/inpatient notes | same probabilities | scenario, declared, uncited |
| Template insertion | two selection operators, zero typed characters | scenario, declared, uncited |
| Copied-forward review/edit | one selection operator; edit 5% of characters, rounded up | scenario, declared, uncited |
| Free text | type the whole section | scenario representation of directly typed text |
| Uniform `--note-typed-share N` opt-out | ceil(N × section characters / 1000) | scenario, declared, uncited |

A selection operator is a KLM point + click (1,100 + 100 ms), in addition to
field activation and the usual mental operator. Copy review pays the full
section's reading/scroll cost under `--text-cost length`; copy edits add keys
without retyping the copied body. Section allocation approximates character
shares in expectation; a finite generated cohort need not match 29.4/14.7/55.9%,
especially when section lengths differ. Unmapped sections and P3 retain fixed
phrases and full typing. No source supports a nursing template estimate here.

The expert and bounded policies use the same authoring effort. This is an
abstract authoring model, not a new browser template widget: the ordinary human
entry event contains the full resulting text and still passes the same Lean
entry, confirmation, provenance, review and signing guards. Selection operators
count as activations and KLM effort; keystrokes count the actual typed/edit
operators. The clinical specs and theorem statements are unchanged.

## Matched comparison

The follow-up measurement uses seed 1, ten days, Synthea fixtures, realistic
workflows, continuous world/queue clocks, Synthetic Hospital case mix and the
canonical v1/v2/v3 programs (days 1–3/4–6/7–10). The three arms differ only in
note authoring: fixed phrases, full dataset typing, and the template model.
Length-based reading and scrolling remain enabled. The three comparison worlds
were frozen before the W2 presentation correction for messages without
observations; all arms share those directory inputs. Regenerated library worlds
and realism tests cover the corrected message context. This is a matched
synthetic comparison, not a final deployment benchmark. Commands and input hashes are recorded in the [follow-up audit](../audits/wave3-followups-20261109.md); the historical data-only numbers
in [Synthetic Hospital methods](synthetic-hospital.md#typing-scroll-and-reading-cost)
use an earlier timing/workflow cohort and are not this comparison.


| Persona | Keystrokes: phrases → full → template | Native KLM minutes: phrases → full → template |
|---|---:|---:|
| P1 | 72,677 → 296,944 → 114,214 | 6,198.5 → 7,161.1 → 6,573.7 |
| P2 | 123,214 → 305,287 → 164,489 | 6,457.4 → 7,232.9 → 6,778.3 |
| P4 | 26,142 → 90,775 → 36,575 | 1,059.5 → 1,336.7 → 1,162.2 |
| P5 | 20,248 → 44,450 → 25,336 | 1,291.5 → 1,396.1 → 1,334.9 |

P1 was re-run on 2026-11-11 after the [simulator fixes](../audits/sim-bugfixes-20261110.md): planned inbox notes had typed the fixed phrase instead of the supplied text, and passive response waits had counted as overtime. Before the fix P1 read 72,677 → 155,857 → 76,972 keys and 6,198.5 → 6,690.9 → 6,449.6 minutes; the phrase arm's keys and minutes are unchanged. P2–P5 are unchanged.

All **1,947/1,947 tasks** completed in every arm (P1 708, P2 413, P3 560,
P4 142, P5 124). P3 is unchanged at 23,753 keys and 1,064.0 reported minutes.
Full/template scroll totals match for P2 43,499, P4 5,156 and P5 6,428, as
expected when full section lengths are preserved. After the re-run P1 differs by
three (13,450 full, 13,453 template); the cause has not been investigated.
The template arm adds explicit selection activations; it does not simply scale
all keyboard effort by 29.4%.

These minutes sum the native `klmDeciSec` field. In wave3 it includes UI effort,
length-based reading and interruption/return service, excluding the clinical,
workflow-protocol and fixed-exposure closure-wait clocks. It is not a pure
sum of keyboard operators or observed clinician time. Queue delays are large
uncalibrated scenario outcomes; no clinical efficiency or fitted realism claim
is made. The [aggregate JSON](../audits/wave3-followups-20261109.json) retains
completion, clicks, scrolls, queue/overtime and dose outcomes for all five roles.
