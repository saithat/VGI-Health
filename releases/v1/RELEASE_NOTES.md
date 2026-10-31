# Release v1: baseline hospital policy

Canonical W1–W7 workflows, fourteen permanent unsafe variants, and California CURES/naloxone demo rules. Sources and distinctions between law, best practice and our stricter design choices are in [the regulatory audit](../../docs/regulations.md) and spec docstrings.

Generated files: `cd lean && lake exe export-content`.

`canonical.json` is the full W1–W7 authoring template. The five role-specific deployment candidates are `personas/P1.json` … `personas/P5.json`; certify the matching candidate before deployment. These exports do not themselves carry a checker certificate.
