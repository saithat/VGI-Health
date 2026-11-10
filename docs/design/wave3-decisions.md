_Owner approved all recommendations on 2026-11-09 ("approve all recommendations"). Items under Later stay deferred. Status lines record the wave-3 merge ([verification](../audits/wave3-merge-20261109.md))._

# Wave 3 owner review: calibrated realism

Sources: `docs/audits/realism-wave2-verification-20261108.md` (Owner questions), `docs/design/workflow-calibration.md` with `docs/design/workflow-sources/*.json`, and Synthetic Hospital v1.3 (`scripts/synthetic-hospital/source.json`). Duplicates are merged, and each wave-2 question is tagged **[W2]**. "Type" means one of three things: a **Lean** change (spec or property; "Sim" means the simulator layer, not the clinical specs), a **sim** assumption, or **data** only. None of these items weakens a Lean spec. Every Lean change listed adds checks. There is no clinician review, so a passing fit is a statistical-adequacy claim only, never a claim of clinical validation.

## Decide now (blocks wave 3)

**1. Target setting: US academic care, one profile per role** [W2: role/setting profiles]
- *Change:* calibrate separate profiles for the PCP (W1/W2/W7), ED resident (W3) and ICU RN pump work (W4) instead of blending everyone into one average clinician. Pharmacy, pediatrics and surgery stay scenario-only.
- *Type:* sim. *Evidence:* N1 UW primary care 2022–23 (pub. 2024); N4 ED residents 2023 (2025); N5 ICU pumps 2024 (2026); N8 pharmacists 2024 (2025, Australia, sensitivity only).
- *Recommend:* **A.** No single recent study covers a whole hospital, and mixing their means would produce numbers that measure no real clinician.
- *Options:* A) separate role profiles; B) one blended clinician; C) stay uncalibrated.
- *Status:* not started; the fitting lane runs after the wave-3 merge.

**2. Acceptance rule for fitting (no clinician reviewer)**
- *Change:* freeze the train/dev/holdout split before fitting (U8 train, U9 and U3 held out). Each of the 11 time holdouts must land within one source SD. Completion must fall inside the Wilson 95% interval, the SD ratio must be 0.5–2, and the fit must beat KLM-only. A profile that fails stays experimental.
- *Type:* sim (validation policy). *Evidence:* U8 2021, U9 2022, N1 2023. The thresholds are declared policy and come from no published standard.
- *Recommend:* **A.** Without a reviewer, the only defensible gate is one fixed before any results exist.
- *Options:* A) adopt as written; B) loosen bands (e.g. 2 SD); C) no gate, report fits only.
- *Status:* not started; the fitting lane runs after the wave-3 merge.

**3. Separate time clocks; serial clinical service** [W2: overlap, serial/non-preemptive service, documentation proxy]
- *Change:* keep UI, bedside/clinical service, communication, passive waiting, queueing and reorientation time separate on one serial clock. Clinical tasks stay atomic, communication can preempt at event boundaries, and the documentation-time proxy stays until note authoring is modeled.
- *Type:* Lean Sim (`Scheduling/Clock.lean`); clinical specs untouched. *Evidence:* N1: 391.3±149.1 total EHR min, 71.4 inbox min per 8 clinic hours (2023).
- *Recommend:* **A.** N1 reports these as separate quantities. Adding them up as extra waits would double-count.
- *Options:* A) approve as is; B) allow preemption of clinical tasks; C) single merged clock (legacy).
- *Status:* done ([clocks](../methods/wave3-simulation.md#separate-time-on-one-server)). Workflow protocol phases count as clinical clock time and their response wait as passive wait (merge decision).

**4. A 24-hour, 7-day world clock: nights, weekends, carry-over and boarding** [W2: merge next-day arrivals; independent night/weekend cases]
- *Change:* generate arrivals around the clock and on weekends, and let work left unfinished at shift end carry into the next day's queue. Split the ED into arrival, provider queue, admit decision and bed departure, so patients can board in the ED. Today the clinic runs weekdays only and the ED only in daytime hours.
- *Type:* sim + world generator; the Lean scheduler horizon only gets wider. *Evidence:* S15 NHAMCS 2022 (56.3% of ED visits after business hours; provider wait median 16 min); N9 boarding 2017–24 (40.1% >4 h at the Jan-2022 peak). No modern hour-by-weekday curve exists. E4 (2006) supplies the shape only.
- *Recommend:* **A.** Rule 6 of the acceptance rule requires shared 24h/7d arrivals for paired arms, and boarding is a major real workflow that is missing.
- *Options:* A) the full 24/7 increment, with declared scenario curves; B) carry-over only; C) defer.
- *Status:* done ([world clock](../methods/wave3-simulation.md#continuous-world-and-ed-stages)); hour/weekday curves are declared scenarios.

**5. Ownership, handover and successor memory** [W2: ownership/reconfirmation/discard/handover rules; successor knowledge]
- *Change:* approve the current owner+patient+task binding, reconfirmation after a fact changes, and the discard rules. Add active handover, where the sender offers and the recipient accepts. Successors get their own memory and no longer inherit the previous actor's knowledge.
- *Type:* Lean Sim (`Resumption/Workspace.lean`), additive; guard revalidation is kept. *Evidence:* FHIR Task/Workflow (S8–S10) and SAFER 2025 (S13) define structure only and give no rates.
- *Recommend:* **A.** Item 11 (doses across shifts) and result follow-through cannot work without an accepted handover.
- *Options:* A) approve rules + add accepted handover + own memory; B) approve rules only; C) revise rules first.
- *Status:* done ([ownership](../methods/wave3-simulation.md#ownership-and-acceptance)); simulated acceptance only, no live human acceptance.

**6. How to use Synthetic Hospital**
- *Change:* use its distributions as a labeled *synthetic-benchmark scenario source*, never as "calibrated from observed care". Convert all 1,268 patients and 5,602 encounters (today only 151 are converted).
- *Type:* data. *Evidence:* Park et al. 2026, arXiv:2609.30027. The data is fully synthetic, MIT-licensed and redistributable, so no anonymization is needed. Dates are monthly, so it cannot supply any timing.
- *Recommend:* **A.** It is recent and free to use, but it describes a generator, not a hospital. Items 13, 14 and 16 depend on this choice.
- *Options:* A) full conversion, scenario label; B) count it as calibration evidence; C) keep the 151-patient subset.
- *Status:* done ([conversion](../methods/synthetic-hospital.md#conversion-decision-6)): 1,268 patients and 5,602 encounters, labeled synthetic-benchmark.

## Defaults (proceed unless you object)

**7. Interruptions by role and activity** [W2: protected-popup triage, fixed-exposure closure]
- *Change:* replace the flat rates (ED 6.9/h, clinic 3/h), the five equally likely types and the fixed five-step durations. Use per-channel service times driven by the clock (N4: 27 per 4 h for ED residents; N5: 28±21.9 s per interruption). Keep popup protection and fixed-exposure closure as provisional rules.
- *Type:* Lean Sim (`Arrivals`/`Work`). *Evidence:* N4 2023, N5 2024, N8 2024, N11 2020. *Recommend:* **A.** These are the most recent role-matched rates. Recovery stays a separately fitted quantity. *Options:* A) adopt; B) rates only; C) keep flat.
- *Status:* done ([interruptions](../methods/wave3-simulation.md#roleactivity-interruptions-and-opt-outs)); legacy opt-out retained.

**8. Fit navigation on matched tasks**
- *Change:* reconstruct the U8/U9 task scripts, then fit navigation first and latency second. Keep the expert and uncalibrated modes, and add no universal novice multiplier.
- *Type:* sim. *Evidence:* U8 medication 90±40 s (2021); U9 prescription 77±46 s (2022). *Recommend:* **A.** These are the most recent public task times. *Options:* A) fit; B) keep KLM constants.
- *Status:* not started; the fitting lane runs after the wave-3 merge.

**9. Refill as its own workflow**
- *Change:* claim/delegate → review → approve/deny/change → pharmacy response → notify/close.
- *Type:* sim + new workflow. *Evidence:* U1 52±21 s (2018, older, retained; no newer equivalent exists); N16 2020–24 turnaround. *Recommend:* **A.** Realism default; label the time as older evidence. *Options:* A) add; B) defer.
- *Status:* done ([refill phases](../methods/workflow-phases.md#phase-execution)).

**10. Alert inspection and amendment as one task**
- *Change:* model cancel, alternative order, inspection and documented override as one compound task. No guard-bypass probability is added.
- *Type:* sim; no guard change. *Evidence:* U8 150±48 s (2021). *Recommend:* **A.** It matches what the source actually measured. *Options:* A) adopt; B) keep the simple allergy/interaction tasks.
- *Status:* done ([compound alerts](../methods/workflow-phases.md#compound-alerts)).

**11. MAR timing across shifts: give, omit, document**
- *Change:* use CMS dose windows of ±30/60/120 min, including early administration. Record administration time, charting time and non-administration separately, and replace the Bernoulli lateness draw. Criticality, holds and retry policy stay as they are.
- *Type:* **Lean (flag):** adds an early-window check and a charting-time field to the MAR records (both add checks). *Evidence:* S14 CMS SOM rev. 248 (2026); N6 lateness median 15 min (2023); N7 charting lag median 6 min (2021); N15 omissions (2023). *Recommend:* **A.** This is a current regulatory rule, in line with the law/regulator direction. *Options:* A) adopt; B) windows only; C) defer.
- *Status:* done ([MAR timing](../methods/workflow-phases.md#mar-timing)).

**12. Contemporary inbox streams**
- *Change:* replace the capped refill/result bursts with separate patient-advice, prescription, result, call and consult arrivals, each with ownership and delegation.
- *Type:* sim + workflows. *Evidence:* N1 15.3 / 14.3 / 12.3 / 23.5 / 0.31 per 8 h (2023); N2 doubling of portal messages (2021). *Recommend:* **A.** The current inbox reflects pre-2020 volumes. *Options:* A) adopt; B) rescale the existing bursts.
- *Status:* done ([inbox streams](../methods/workflow-phases.md#inbox-streams)).

**13. Case mix and imaging priority from Synthetic Hospital**
- *Change:* draw the department/diagnosis mix within each setting, and the imaging priority split (36% stat / 29% urgent / 35% routine across 1,865 orders), from the dataset.
- *Type:* data (replaces local draws in A43). *Evidence:* Synthetic Hospital 2026. *Recommend:* **A.** It is better grounded than hand-picked values. Its setting mix (55% outpatient / 31% ED) is not used to resize the personas. *Options:* A) adopt; B) imaging priority only.
- *Status:* done ([case mix](../methods/synthetic-hospital.md#case-mix-and-imaging-priority-decision-13)); settings under 30 matched encounters keep legacy weights; P5 inpatient rounds now use the inpatient imaging split with [scenario ordering rates](../methods/workflow-phases.md#inpatient-imaging).

**14. Chart and note sizes from Synthetic Hospital**
- *Change:* replace the fixed-phrase synthetic notes with sections sized from the dataset (~60K sections averaging ~150 characters; a whole note of about 11 sections averages ~1,930 characters; corrected 2026-11-09, owner-approved). This raises reading, scrolling and typing costs.
- *Type:* sim (A04/A05) + data. *Evidence:* Synthetic Hospital 2026. *Recommend:* **A.** Notes are currently far too short to be realistic. *Options:* A) sizes + text; B) sizes only.
- *Status:* done ([note text](../methods/synthetic-hospital.md#note-section-text-decision-14)); length-based reading and scrolling are in [wave-3 methods](../methods/wave3-simulation.md#separate-time-on-one-server). Verified N18 (2018) pooled origin shares now drive the default [section authoring model](../methods/note-authoring.md), with scenario section/operator assumptions and full-typing opt-outs.

**15. Add the missing workflow phases**
- *Change:* add chart synthesis and note authoring; pharmacy clarification; dispensing; result follow-through; interleaved ED work-ups; external reconciliation; Rx amend/cancel; caregiver, vaccine and peri-operative coordination. Each runs as a scenario with no calibrated rates.
- *Type:* sim + workflows. *Evidence:* S8–S13 (structure only). *Recommend:* **A.** Adding real workflows is your default. *Options:* A) add all; B) pick a subset.
- *Status:* partial ([scope](../methods/workflow-phases.md#scenario-scope)): chart synthesis, note preparation, result follow-through and the other listed phases run as declared scenario phases; full pharmacy exchange, external reconciliation, prescription acknowledgments, ED work-ups, caregiver/vaccine exchange, perioperative coordination and a browser note-template widget remain. Section-level authoring effort is now [modeled](../methods/note-authoring.md).

## Later

**16. Information-need lookups from relevance judgments**
- *Change:* choose which chart sections a lookup reads using the dataset's 59K judgments. The recency windows and thresholds stay as they are.
- *Type:* sim (A16/A17) + data; Lean thresholds unchanged. *Evidence:* Synthetic Hospital 2026 (relevance only, no timing). *Recommend:* **Later.** It depends on item 14, and the feature is opt-in. *Options:* A) after item 14; B) now; C) never.
- *Status:* deferred (Later).

**17. MIMIC-IV / CHPL access**
- *Change:* extract eMAR, ED-stay and result intervals from MIMIC under a DUA; use a CHPL key to run a listing census.
- *Type:* data. *Evidence:* S4/S5 (the MIMIC releases have date shifts and no click timing). *Recommend:* **Later.** Public evidence is enough for this plan. *Options:* A) defer; B) apply now.
- *Status:* deferred (Later).

**18. Pediatric, surgical and pharmacy defaults**
- *Change:* calibrate these roles once at least two matched, recent task families each are found.
- *Type:* sim. *Evidence:* none sufficient (N8 2024 is Australian). *Recommend:* **Later.** Too little evidence to calibrate yet. *Options:* A) scenario-only; B) borrow adult profiles.
- *Status:* deferred (Later).

**19. Unidentified learning and recovery coefficients**
- *Change:* day-scale forgetting, per-draft recovery slopes and movement preferences keep their ranges and are not fitted.
- *Type:* sim (A09–A15, A23, A48–A50). *Evidence:* N12 2022 tests recovery performance, not time lags. *Recommend:* **Later.** No data identifies these coefficients. *Options:* A) keep ranges; B) fit on proxies.
- *Status:* deferred (Later).

---
**Counts:** Decide now 6 · Defaults 9 · Later 4 (19 items total).
