# Release v1: baseline hospital policy

Canonical W1–W7 workflows, sixteen permanent unsafe variants with interpreter regressions, and California CURES/naloxone demo rules. Sources and distinctions between law, best practice and our stricter design choices are in [the regulatory audit](../../docs/regulations.md) and spec docstrings.

Generated files: `cd lean && lake exe export-content`.

The corrected CURES surgical exemption code is `surgery-7-day`, for a
qualifying procedure at a listed facility and a nonrefillable supply of at
most seven days used as directed (H&S §11165.4(c)(4)). It replaces
`surgery-5-day`; no five-day hospital restriction is retained. v1.1 and v2
inherit the correction. The ED, facility-administration, terminally ill hospice
and timely-access descriptions were also checked against the statutory source;
the timely-access branch includes an unavailable alternate authorized user,
the nonrefillable seven-day limit and a medical-record reason. The separate
ED buprenorphine exemption is outside this modeled subset.

The shared [CURES codes](../cures-exemptions.json) are generated from Lean:
`cd lean && lake exe ehr cures-exemptions-export > ../releases/cures-exemptions.json`.
The existing `spec.json` files carry the value-set name only. Neither export
certifies code membership or clinical/facility/supply eligibility; core/check
adoption is tracked in CR-11.

`canonical.json` is the full W1–W7 authoring template. The five role-specific deployment candidates are `personas/P1.json` … `personas/P5.json`; certify the matching candidate before deployment. These exports do not themselves carry a checker certificate.

The updated baseline requires controlled-order details shown during signing (21 CFR 1311.140), plus vaccine manufacturer, administering provider and VIS edition date. Schedule II prescriptions require confirmed zero refills on every matching order line, using core's generic allowed-value constraint (21 CFR 1306.12(a)). Seed 16's confirmed default of three is blocked. The constraint is inherited unchanged by v1.1 and v2. VIS edition date is required compliance data.

Every spec rule docstring is labeled `Law`, `Entrenched` (with a reason/source), `Hospital policy (not law)`, or `Product design property`. Existing barcode scans are entrenched under the Leapfrog BCMA standard; two identifiers support Joint Commission accreditation. Patient-ID re-entry, second-nurse checks and kg-only weight remain local policies. No guidance or accreditation rule was added.

Content tests establish capture and visibility gates, not actual VIS delivery or full legal compliance. The rendered EPCS order-summary data and production checker certificates remain separate integration work tracked in `docs/design/changes-requests.md`.

## Owner-approved full catalog baseline

This release now inherits every one of the 124 `fit: spec-data` rules in the
reviewed catalog (120 law, 4 entrenched), in addition to 29 existing catalog
mappings. The v1 additions are split into CMS, Title 22, California statutes,
federal prescription/vaccine, and entrenched modules. v1.1 imports v1; v2
imports v1.1. Both concrete `Extends` proofs still use `decide`; their axiom
prints contain only `propext`.

The canonical now includes the planned scoped artifact screens, grouped
prescription content on each actual order row, pinned controlled-signing/result
review panels, separate refill denial, and a new-prescription path in W7.
Specialist medication authorizations inherit ordinary signing, pre-op and
alert safeguards; v2 antibiotic indication also applies to them. All existing
requirements remain. In particular, the old naloxone education flag remains
required alongside the new human outcome enum, preserving the stricter policy.

There are 24 permanent bad programs, including eight new legal-content/display
mutations. The human-event walkthroughs exercise every new artifact action.
`programs/canonical/STATS.md` reports source/basis counts. `catalog.json` records each rule's
`encodedIn`, or an explicit reason where it requires core features or lies
outside the checker boundary.

These exports do not certify actual panel contents or artifact effects.
[CR-15](../../docs/design/changes-requests.md#cr-15-full-catalog-content-adoption-content--renderappworldsimcheckwasm)
requests the 14 renderer payload bindings, actual Schedule V/GHB formulary
support, adapter writes/reset, checker certificates and WASM adoption. The
current agent validator also still needs the actual-release schema fixes in
CR-12/14. See [the source map](../../docs/regulations.md#full-catalog-encoding-map).

Regenerate with `python lean/Ehr/Specs/Rules/encode.py`, then
`cd lean && lake exe export-content`, then from the root
`python lean/Ehr/Canonical/export_rules.py`. The final command audits all 124
encodings against the actual exported specs and regenerates both statistics
files and the legal source map. The older exporter log still says 16 seeds;
the exported corpus and audited count contain all 24.
