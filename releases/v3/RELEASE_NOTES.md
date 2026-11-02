# Release v3: Antibiotic indication required

**Why this release exists.** Federal and California law require every hospital to run an antibiotic stewardship program. Medicare's Conditions of Participation (42 CFR 482.42(b)) require a hospital-wide program that "documents the evidence-based use of antibiotics" and "adheres to nationally recognized guidelines, as well as best practices." California Health and Safety Code §1288.85 (SB 1311) requires general acute care hospitals to adopt an antimicrobial stewardship policy "in accordance with guidelines established by the federal government and professional organizations." CMS's surveyor guidance names the CDC Core Elements of Hospital Antibiotic Stewardship as an example of such guidelines. CDC lists "Requiring an indication for antibiotic prescriptions" as a stewardship intervention, and its assessment tool asks whether the hospital requires prescribers to document "a dose, duration and indication for all antibiotic prescriptions."

**What is law and what is our policy.** No federal or California law requires an indication on each antibiotic order. The Joint Commission leaves "when indication for use is required on a medication order" to each hospital's policy. Requiring a confirmed, coded indication on every antibiotic order, and showing it to the nurse before each dose, is this hospital's stewardship policy. It is modeled on the CDC recommendation and adopted to meet the stewardship-program laws above. It is a hypothetical policy for this demo. (Showing the indication to the nurse at administration is our own addition; we found no source that requires it.)

"Release v3: antibiotic orders now carry a confirmed indication, and nurses see it before each dose. Stewardship programs are required by federal and California law; the per-order indication is our hospital's policy, modeled on CDC guidance."

**Source class:** Hospital policy (not law). The per-order coded indication and MAR display are local policy modeled on CDC guidance; 42 CFR §482.42(b) and H&S §1288.85 require stewardship programs. This release adds no new rule from guidance or accreditation beyond the owner-approved existing policy.

## Release items

- **R3-1:** Every antibiotic order line requires a coded `abxIndication`, confirmed by a prescriber, including surgeons. The old free-text label indication remains required.
- **R3-2:** Sign screens add a per-line antibiotic indication summary.
- **R3-3:** Antibiotic administration requires the indication shown beside the MAR dose; receipts and collapsed drawers do not count.
- **R3-4:** ED antibiotic order sets and surgical prophylaxis inherit the picker and confirmation requirement. Macro defaults remain pending until a human confirms.

## Validation and integration

All old rules remain unchanged. `specV3.Extends specV2` is proved by `decide`, using only the permitted `propext` axiom. This additive relation does not make old programs satisfy the new obligations: the old antibiotic composer and old MAR fail interpreter regressions. Pre-op requirements use the ordinary `signOrders` commit with `encounterKind = preop`. New canonical paths cover W1, W3 sepsis (two independently confirmed lines), W5, and W6 prophylaxis. Terminology membership beyond nonempty codes is not enforced by the current core. Actual indication rows in the rendered sign summary/MAR require render-lane integration (CR-10).

Generated `spec.json` and `canonical.json` come from `cd lean && lake exe export-content`. Source audit and primary-source links: [docs/regulations.md](../../docs/regulations.md#5-release-motivation-text-exact-phrasing-to-use). These files describe demo policy, not legal or clinical advice.

`canonical.json` is the full W1–W7 authoring template. The five role-specific deployment candidates are `personas/P1.json` … `personas/P5.json`; certify the matching candidate before deployment. These exports do not themselves carry a checker certificate.

Prior-auth requests retain the never-prefill policy: enter the request field as a human. The convenience action cannot forge that capture and preserves any confirmed request.

## Owner-approved full catalog baseline

This release now inherits every one of the 124 `fit: spec-data` rules in the
reviewed catalog (120 law, 4 entrenched), in addition to 29 existing catalog
mappings. The v1 additions are split into CMS, Title 22, California statutes,
federal prescription/vaccine, and entrenched modules. v2 imports v1; v3
imports v2. Both concrete `Extends` proofs still use `decide`; their axiom
prints contain only `propext`.

The canonical now includes the planned scoped artifact screens, grouped
prescription content on each actual order row, pinned controlled-signing/result
review panels, separate refill denial, and a new-prescription path in W7.
Specialist medication authorizations inherit ordinary signing, pre-op and
alert safeguards; v3 antibiotic indication also applies to them. All existing
requirements remain. In particular, the old naloxone education flag remains
required alongside the new human outcome enum, preserving the stricter policy.

There are 24 permanent bad programs, including eight new legal-content/display
mutations. The human-event walkthroughs exercise every new artifact action.
`programs/canonical/STATS.md` reports source/basis counts. `catalog.json` records each rule's
`encodedIn`, or an explicit reason where it requires core features or lies
outside the checker boundary.

These exports do not certify external record effects or all legal duties.
See [verification scope](../../docs/VERIFICATION.md) for current certification
and full-catalog limits.

Regenerate with `python lean/Ehr/Specs/Rules/encode.py`, then
`cd lean && lake exe export-content`, then from the root
`python lean/Ehr/Canonical/export_rules.py`. The final command audits all 124
encodings against the actual exported specs and regenerates both statistics
files and the legal source map. The older exporter log still says 16 seeds;
the exported corpus and audited count contain all 24.
