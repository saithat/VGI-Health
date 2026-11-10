# Medication administration outcomes

[Overview](../../README.md) · [Methods and reproduction](../../README.md#documentation)

The generated release templates label all five MAR actions explicitly. Regenerate
them from Lean-owned content after changing canonical screens; recorded programs
and frozen certification inputs retain their original layouts.

The wave-3 default adds [symmetric windows and separate bedside/charting clocks](workflow-phases.md#mar-timing).
The older policy and measurements below remain the frozen comparator, selected
with `world gen --workflows legacy`; they are not measurements of wave 3.

Scheduled ward doses carry `OrderChoice.administration`, separately from order
`holdReason`: a typed given, held, refused, delayed or notGiven outcome, reason,
stable occurrence ID, scheduled/window/attempt minutes, re-offer and prescriber
notification decisions. Delayed is pending; each occurrence ends given, clinically
held, patient-refused or not-given. NPO oral doses and prandial insulin are held;
off-unit doses are documented rather than silently skipped. PRN generation is
unchanged. Historical schedules remain decodable; the old `patient-refused` hold
sentinel now maps to refused. Other historical holds remain held.

**Legacy provisional simulation policy, not a universal clinical standard:** critical
medications are insulin, systemic formulary antibiotics and anticoagulants. Their
late window is 30 minutes; other daily doses use 120 minutes and other scheduled
doses 60 minutes, capped at 18:59 for expiry documentation by shift end.
Clinical acceptance of cross-shift dose ownership remains outside the outcome
model; the workload queue can carry its unchanged source tasks. One re-offer is attempted after
20/45 minutes respectively, or later when an off-unit patient returns, only within the window and before
discharge, with the original regimen order still active. No catch-up administration
is generated after expiry. A second refusal
or a held critical dose requires a separate `chartAssessment` episode documenting
prescriber notification, the outcome, reason and occurrence times. Critical missed
doses are escalated too. This simulates the nursing action/documentation; it does
not implement a prescriber inbox, delivery acknowledgment or treatment response.
The existing universal scan/review/cosign requirements remain in force even for
nonadministration documentation; bedside exception workflows remain future work.

The conditional draws below are **uncalibrated scenario rates**, not population
estimates. Clinical holds take priority, then off-unit absence, then availability,
refusal, lateness and otherwise given. Seeded draws are independent per occurrence.

| Decision | Probability at that branch |
|---|---|
| NPO oral medication / prandial insulin | 100% while NPO |
| Lisinopril SBP hold / prandial insulin poor intake | 8% each |
| Warfarin high INR / heparin or enoxaparin low platelets | 5% / 2% |
| Medication unavailable | 2%; 70% available on re-offer |
| Patient refusal | SC 5%, PO 2.5%, other routes 0.5%; 60% accept re-offer |
| First attempt beyond the window | 0.5% |
| Off-unit return | Deterministic from the existing absence interval |

[Shandilya et al., 2015](https://pmc.ncbi.nlm.nih.gov/articles/PMC4954515/)
reported refusal, inability to take medication and unavailability as distinct
omission causes and recommended team communication for recurrent omissions.
[Popoola et al., 2018](https://pubmed.ncbi.nlm.nih.gov/29523536/) found more
nonadministration of subcutaneous anticoagulants, commonly from refusal; this
motivates a higher SC scenario rate, without fitting their cohort.
[CMS hospital guidance](https://www.cms.gov/Regulations-and-Guidance/Guidance/Manuals/Downloads/som107ap_a_hospitals.pdf)
distinguishes time-critical ±30-minute and longer locally governed windows.
These sources motivate the categories and timing structure; they do not establish
our probabilities, drug classification, retries or escalation thresholds.

`Goals.lean` maps each typed outcome and its reason into MAR captures; escalation
adds a nursing documentation episode. `Commit.Mar` records delayed and notGiven
events without consuming the dose key. FHIR uses completed for given, on-hold
with a delayed reason for pending attempts, and not-done with the distinct
held/refused/not-given reason for terminal nonadministration. Only given records
contain dosage. Later giving the same occurrence consumes it once, even after
multiple nonadministration attempts; a consumed occurrence rejects further MAR
commits. The live MAR directory retains the native outcome codes and displays Given,
Held, Refused, Delayed and Not given distinctly, with nonadministration reasons.
The live two-nurse regression documents all four nonconsuming outcomes before
one administration of the same occurrence. The board browser regression exercises
swap and all three linked cancellations through real authenticated commands.
The live reducer enforces occurrence uniqueness. Wave 3 additionally validates
a supplied timing record and binds it to the confirmed outcome; legacy clients
may omit it. Escalation remains scenario documentation.
No theorem statement in Specs, Props, Statements or comparator changed.
The existing four MAR invariant/guard theorems keep their statements and now range
over the two additional Event constructors. New `nonadministration_preserves_shared`
and `reoffers_doses_unique` make the nonconsumption and re-offer guarantees explicit.

Outcome regressions enumerate given, clinical hold, refusal→given, repeated
refusal, unavailable→given/missed, off-unit return/expiry, late-window miss,
discharge before re-offer and order discontinuation. The TypeScript/Lean boundary
test decodes generated seed 1/2/3 decisions, derives documentation goals, reduces
the corresponding MAR events and checks nonconsumption and dose uniqueness.
Seventeen controlled scenarios also complete through the canonical nursing UI,
including the separate escalation episode. Native Lean tests cover the historical
refusal sentinel, every FHIR outcome, omission of dosage for nonadministration and
repeated attempts by different actors. Agent validators preserve every outcome
and optional legacy data. The expanded Postgres MAR test covers the new statuses;
it requires a fresh PostgreSQL instance and generated commit fixture.

Reproduce the outcome regressions after the native build:

```sh
export TMPDIR="${TMPDIR:?Set disk-backed TMPDIR}" CI=true LEAN_NUM_THREADS=6
(cd lean && lake build && lake env lean Ehr/Commit/Mar.lean && lake exe gents)
pnpm --filter world exec vitest run test/administration-outcomes.test.ts --maxWorkers=2
pnpm --filter agent exec vitest run test/lean-types.test.ts --maxWorkers=2
pnpm --filter @vgi/commit test:integration
```

The ten-day successor comparison against the frozen ward flow found all P3
days changed for seeds 1/2/3 in both populations. Synthea P1/P2/P4/P5 schedules
change from day 2 for all three seeds; fixture-population schedules change from
day 4 for seed 1 and day 2 for seeds 2/3. Initial states remain unchanged.
Synthea attempt counts (including re-offers, rather than unique occurrences):

| Seed | Given | Held | Refused | Delayed | Not given | Re-offers | Notifications |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | 282 | 10 | 19 | 7 | 6 | 21 | 13 |
| 2 | 266 | 9 | 14 | 6 | 4 | 16 | 15 |
| 3 | 205 | 11 | 9 | 4 | 6 | 9 | 14 |

All regenerated seeds change P3 schedules, including explicit given decisions;
new task counts enter the next day's state hash, so later schedules for other
personas may change too. Seed reproducibility is retained within this successor
model. Exact archive tests inject a test-only frozen ward implementation; production
uses the successor by default. Frozen worlds 1/2 remain immutable. New outcome experiments require separate
successor worlds/schedules, simulator measurements, trajectories and task controls. Rebuild native/WASM
and re-certify all 33 retained `core-10day` revision bindings against the changed
Lean source and canonical MAR label, then remeasure/replay preserved inputs; a
frozen run does not acquire new outcome scenarios by re-certification alone.
MAR history and board display changes require matching app certificate bindings.
