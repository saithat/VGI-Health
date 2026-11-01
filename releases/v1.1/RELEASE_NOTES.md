# Release v1.1: Prior-authorization status

**Why this release exists.** Under CMS's Interoperability and Prior Authorization final rule (CMS-0057-F, 2024), Medicare Advantage plans, state Medicaid and CHIP fee-for-service programs, Medicaid and CHIP managed care plans, and Marketplace (FFE) plans must offer a prior-authorization API starting in 2027 (January 1, 2027 for MA and state fee-for-service programs; the first rating period or plan year on or after that date for the others). ONC added matching certification criteria for EHRs (45 CFR 170.315(g)(31)–(33), HTI-4, 2025). CMS rewards hospitals that send at least one prior-authorization request through such an API (a bonus measure in CY 2027).

**Scope.** The 2024 rule covers medical items and services, such as imaging. It does **not** cover drugs. A proposed rule (CMS-0062-P, April 2026) would extend electronic prior authorization to drugs; it is not final. So the panel for imaging follows a final rule, and the panel for specialty medications anticipates a proposed one.

**What the release changes.** The panel is optional. It adds no required entry or review, so every certified screen stays certified.

"Release v1.1: a prior-auth status panel in the order composer. Payers must offer prior-auth APIs from January 2027 under CMS's 2024 rule (imaging and other services; drugs are only in a proposed rule). The feature is optional, so nothing anyone customized breaks."

## Release items

- **R1.1-1:** Adds optional prior-auth status info and request element. No new entry or review requirement.
- **R1.1-2:** Adds the `priorAuth` catalog tag for the status component and request action.
- **R1.1-3:** Adds imaging/procedure controls in W1 lab/service ordering and W6 pre-op; also surfaces optional status in shared W1/W3/W5/W6 medication composers. Personalized UIs may keep it absent.

## Validation and integration

The interpreter now recognizes imaging/procedure service slots (`orderKind`, `orderCode`) without a drug. The canonical service request writes only the declared ServiceRequest target and does not contact a payer API. A regression requests prior auth for imaging code 70551 with no medication line and no drug alerts. The optional medication-composer feature anticipates the proposed drug rule, not the final services rule.

Generated `spec.json` and `canonical.json` come from `cd lean && lake exe export-content`. Source audit and primary-source links: [docs/regulations.md](../../docs/regulations.md#5-release-motivation-text-exact-phrasing-to-use). These files describe demo policy, not legal or clinical advice.

`canonical.json` is the full W1–W7 authoring template. The five role-specific deployment candidates are `personas/P1.json` … `personas/P5.json`; certify the matching candidate before deployment. These exports do not themselves carry a checker certificate.

Prior-auth requests retain the never-prefill policy: enter the request field as a human. The convenience action cannot forge that capture and preserves any confirmed request.

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
`STATS.md` reports source/basis counts. `catalog.json` records each rule's
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
