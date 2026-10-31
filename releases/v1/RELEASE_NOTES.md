# Release v1: baseline hospital policy

Canonical W1–W7 workflows, sixteen permanent unsafe variants (seed 16 awaits the core zero-refill constraint), and California CURES/naloxone demo rules. Sources and distinctions between law, best practice and our stricter design choices are in [the regulatory audit](../../docs/regulations.md) and spec docstrings.

Generated files: `cd lean && lake exe export-content`.

`canonical.json` is the full W1–W7 authoring template. The five role-specific deployment candidates are `personas/P1.json` … `personas/P5.json`; certify the matching candidate before deployment. These exports do not themselves carry a checker certificate.

The updated baseline requires controlled-order details shown during signing (21 CFR 1311.140), plus vaccine manufacturer, administering provider and VIS edition date. Schedule II zero-refill enforcement awaits a generic core value constraint; the pending seed is explicitly recorded in HANDOFF-content.md.
