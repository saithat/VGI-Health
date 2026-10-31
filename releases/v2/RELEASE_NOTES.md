# Release v2: Antibiotic indication required

**Why this release exists.** Federal and California law require every hospital to run an antibiotic stewardship program. Medicare's Conditions of Participation (42 CFR 482.42(b)) require a hospital-wide program that "documents the evidence-based use of antibiotics" and "adheres to nationally recognized guidelines, as well as best practices." California Health and Safety Code §1288.85 (SB 1311) requires general acute care hospitals to adopt an antimicrobial stewardship policy "in accordance with guidelines established by the federal government and professional organizations." CMS's surveyor guidance names the CDC Core Elements of Hospital Antibiotic Stewardship as an example of such guidelines. CDC lists "Requiring an indication for antibiotic prescriptions" as a stewardship intervention, and its assessment tool asks whether the hospital requires prescribers to document "a dose, duration and indication for all antibiotic prescriptions."

**What is law and what is our policy.** No federal or California law requires an indication on each antibiotic order. The Joint Commission leaves "when indication for use is required on a medication order" to each hospital's policy. Requiring a confirmed, coded indication on every antibiotic order, and showing it to the nurse before each dose, is this hospital's stewardship policy. It is modeled on the CDC recommendation and adopted to meet the stewardship-program laws above. It is a hypothetical policy for this demo. (Showing the indication to the nurse at administration is our own addition; we found no source that requires it.)

"Release v2: antibiotic orders now carry a confirmed indication, and nurses see it before each dose. Stewardship programs are required by federal and California law; the per-order indication is our hospital's policy, modeled on CDC guidance."

## Release items

- **R2-1:** Every antibiotic order line requires a coded `abxIndication`, confirmed by a prescriber, including surgeons. The old free-text label indication remains required.
- **R2-2:** Sign screens add a per-line antibiotic indication summary.
- **R2-3:** Antibiotic administration requires the indication shown beside the MAR dose; receipts and collapsed drawers do not count.
- **R2-4:** ED antibiotic order sets and surgical prophylaxis inherit the picker and confirmation requirement. Macro defaults remain pending until a human confirms.

## Validation and integration

All old rules remain unchanged. `specV2.Extends specV1_1` is proved by `decide`, with no axioms. This additive relation does not make old programs satisfy the new obligations: the old antibiotic composer and old MAR fail interpreter regressions. Pre-op requirements use the ordinary `signOrders` commit with `encounterKind = preop`. New canonical paths cover W1, W3 sepsis (two independently confirmed lines), W5, and W6 prophylaxis. Terminology membership beyond nonempty codes is not enforced by the current core. Actual indication rows in the rendered sign summary/MAR require render-lane integration (CR-10).

Generated `spec.json` and `canonical.json` come from `cd lean && lake exe export-content`. Source audit and primary-source links: [docs/regulations.md](../../docs/regulations.md#5-release-motivation-text-exact-phrasing-to-use). These files describe demo policy, not legal or clinical advice.
