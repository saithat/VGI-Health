# Why the layout agents help so little

[Overview](../../README.md) · [Discovery and cadence](../methods/discovery-and-cadence.md) · [Metric gaming](../design/metric-gaming.md)

Analysis of the retained `runs/core-10day` recording after its 2026-11-13
re-certification. It compares each clinician's agent-adapted layouts ("agent")
with the vendor baseline plus merged releases ("vendor") on the same tasks, over
days 2–10. All numbers come from the simulated expert clinician and are not
observed clinician performance.

## Summary

1. **The real gain is modest.** On tasks both arms completed, the agent saves
   1.9–10.7% of clicks plus scrolls, and less of the modeled time.
2. **P1's headline saving is inflated by abandoned work.** From day 7 the agent
   layout fails 7 tasks that the vendor layout completes. Abandoned tasks cost
   fewer clicks, so they inflate the per-day saving to 20–31%.
3. **Those failures come from a feature the agent declined, not from a safety
   rule.** On night 3 the agent reasonably declined an optional release feature
   (service orders with prior authorization) because P1 had never ordered imaging.
   Imaging and therapy orders first appeared on day 7. No check noticed the
   missing capability, and the agent's objective does not reward fixing it.
4. **Most of the gain arrives on night 1, then progress stalls.** 18 of 45
   persona-nights shipped. Later proposals often had no measurable effect, and the
   validation sample (4–15 tasks) is too small to confirm small gains.
5. **The headroom is large.** Vendor layouts cost 3.2–4.8 times the theoretical
   minimum clicks plus scrolls. The agents captured 2–14% of that gap.
6. **The safety checker was not the constraint.** Every proposal that reached the
   checker passed.

## Savings on tasks both arms completed

| Clinician | Clicks + scrolls saved | Of which alert pop-ups | Modeled time captured of the gap to the floor |
|---|---|---|---|
| P1 | 10.7% | 10% | 8% |
| P2 | 8.2% | 4% | 8% |
| P3 | 5.6% | 0% | 2% |
| P4 | 6.3% | 0% | 2% |
| P5 | 1.9% | 23% | 2% |

Most of the saving is scrolls removed by compact control density (P4: 752 of
764 saved actions are scrolls). Compact screens remove scrolls without removing
steps, so modeled time barely moves for P3–P5.

| Clinician | Vendor effort vs floor | Agent effort vs floor | Gap captured |
|---|---|---|---|
| P1 | 4.2× | 3.8× | 14% |
| P2 | 3.8× | 3.5× | 11% |
| P3 | 3.6× | 3.4× | 8% |
| P4 | 3.2× | 3.0× | 9% |
| P5 | 4.8× | 4.7× | 2% |

The floor is an idealized interface with no navigation or scrolling, so it is
not fully reachable. It still shows that the layouts are far from saturated.

## P1's failed tasks

- All 7 are primary-care visits (W1) on days 7–10. Each needs a lab, imaging or
  therapy order (for example a lumbar MRI and a physical therapy evaluation).
- The vendor layout has these fields in a service-order group on the Labs
  screen, added by release v2. P1's fork never has them. On night 3 the agent
  recorded: "P1's recorded orders are routine medications, with no observed
  imaging, procedure, specialty-drug, or prior-authorization work ... keep the
  feature absent." No task needed the feature until day 7.
- The simulated clinician enters everything else, then stops with "no reachable
  unmet goal."
- **Why nothing caught it:**
  - The completion property is checked per commit. Signing orders stays
    completable without service-order lines, so the checker passes.
  - Validation replays an older day, which had no such tasks.
  - The release score counts clicks and scrolls, so an abandoned task makes a
    layout look cheaper.
- On nights 7–9, P1's training evidence showed "completed 90/92". The agent
  proposed scroll and shortcut changes instead, and all three were rejected.

## Night outcomes

| Outcome | Count |
|---|---|
| Deployed | 18 |
| Validation rejected | 9 |
| Agent chose no change | 8 |
| Release feature not surfaced | 5 |
| Release migrated (one by fallback) | 5 |

- Night 1 shipped for all five clinicians and produced most of each clinician's
  final saving: day 2's saving is already 1.4–6.4%.
- In 5 of the 9 rejections, the proposal had no effect at all on the validation
  replay. The others made it slightly worse.
- Predicted savings were poorly calibrated. For example, P4 on night 2 predicted
  36 clicks plus scrolls and validated at 5, and P2 on night 4 predicted 32 and
  validated at 4. Validation used 4–15 tasks.
- Every certified attempt passed the checker.

## Alerts

P1's night-1 change removed three alerts the specification marks removable,
including the high-alert medication order notice ("High-alert medication
ordered: review policy", classified advisory with cited ISMP and SAFER sources).
This is permitted by the current rules. Removed alert acknowledgments are 10% of
P1's and 23% of P5's saving.

## Recommendations

1. **Never ship a capability loss** (*new specification*). A fork must keep a
   reachable entry for every element the current release lets its role enter, not
   only those its required commits need. Every fork lacks the service-order fields
   after release v2, so this would have forced all five clinicians to keep the
   feature, and P1 would not have lost those tasks.
2. **Count incomplete tasks as costly.** Score an incomplete task at its vendor
   cost plus a penalty instead of its partial clicks, and show failed tasks to the
   agent first.
3. **Validate on more tasks.** Use every validation-eligible task from all past
   calibration days, not every third task of one day, so small real gains can be
   confirmed and null changes stop consuming nights.
4. **Measure in time as well.** R1 (approved) makes time a constraint. Reporting
   results in modeled time, not only clicks plus scrolls, avoids counting density
   alone as progress.
5. **Review which alerts are removable.** Decide whether high-alert medication
   notices should be removable per clinician.
6. **Point the agent at the structural gap.** Give it the per-workflow gap to the
   floor, so proposals target navigation and step count, not only density.

A fresh recording is needed to measure any of these. The retained recording is
frozen.

## Reproduction

The tables were computed from `runs/core-10day/days/day-NN/Px.json` (agent),
`runs/core-10day/no-agent/days/day-NN/Px.json` (vendor, including the `floor`
records) and `runs/core-10day/decisions/night-NN/Px.json`, after the 2026-11-13
re-certification (app `be573a35…`).
