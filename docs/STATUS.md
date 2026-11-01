# Current status

Active releases are v1, v2 and v3, using the **core** rule profile. The full
regulation catalog is opt-in. v1.1 appears only in archived recordings.

The native app and browser run the same Lean interpreter. Clinicians start
from role presets and select patients inside the EHR. The AI agent proposes
UI program changes; each deployed change must pass the checker.

The five role views cover primary care, emergency care, inpatient nursing,
pediatrics and surgery. Medplum stores synthetic charts, encounters and clinical
writes. Imported Synthetic Hospital notes and history retain patient binding;
records explicitly belonging to another patient are excluded.

## Verification

The main safety proofs cover commit guards, human-only actions, review receipts,
macros, alerts and rendering. Checker acceptance proves 12 of 13 properties.
General completion remains an explicit extra assumption; named restricted
programs have completion proofs. See [VERIFICATION](VERIFICATION.md) for the
exact statements, trusted definitions and remaining limits.

Required gates are the default Lean build, kernel replay, the main and checker
Comparators, certification of all 15 persona baselines, rejection of the 23 bad
programs, and exact replay of archived run1-P3. The completion Comparator checks
the proved restricted cases separately. Application, agent and world tests and
the [clean-clone check](CLEAN-CLONE.md) cover the surrounding software.

The held-out [conformance suite](../conformance/RESULTS.md) is report-only;
it supplements certification. It does not change the acceptance rules.

## Runs and metrics

New simulations use world/2. The archived run1-P3 contains ten recorded days;
verification checks 424 tasks, 14,658 events and three baselines with 137 events.
Authored mock examples are labeled separately.

Optimization compares clicks, scroll count/distance and mouse travel.
Keystrokes are secondary; timing estimates do not decide acceptance.
Completion and screen fidelity must be preserved before savings count.

## Review and demo

Start with [the Lean reading order](../README.md#read-the-lean), then use
[DEMO](DEMO.md) for the walkthrough. [Rule sources](regulations.md) distinguish
law from hospital policy. The proof scope does not establish clinical
correctness, all legal duties, browser painting or external record effects.
