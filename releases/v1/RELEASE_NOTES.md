# Release v1: baseline hospital policy

Canonical W1–W7 workflows, sixteen permanent unsafe variants with interpreter regressions, and California CURES/naloxone demo rules. Sources and distinctions between law, best practice and our stricter design choices are in [the regulatory audit](../../docs/regulations.md) and spec docstrings.

Generated files: `cd lean && lake exe export-content`.

`canonical.json` is the full W1–W7 authoring template. The five role-specific deployment candidates are `personas/P1.json` … `personas/P5.json`; certify the matching candidate before deployment. These exports do not themselves carry a checker certificate.

The updated baseline requires controlled-order details shown during signing (21 CFR 1311.140), plus vaccine manufacturer, administering provider and VIS edition date. Schedule II prescriptions require confirmed zero refills on every matching order line, using core's generic allowed-value constraint (21 CFR 1306.12(a)). Seed 16's confirmed default of three is blocked. The constraint is inherited unchanged by v1.1 and v2. VIS edition date is required compliance data.

Every spec rule docstring is labeled `Law`, `Entrenched` (with a reason/source), `Hospital policy (not law)`, or `Product design property`. Existing barcode scans are entrenched under the Leapfrog BCMA standard; two identifiers support Joint Commission accreditation. Patient-ID re-entry, second-nurse checks and kg-only weight remain local policies. No guidance or accreditation rule was added.

Content tests establish capture and visibility gates, not actual VIS delivery or full legal compliance. The rendered EPCS order-summary data and production checker certificates remain separate integration work tracked in `docs/design/changes-requests.md`.
