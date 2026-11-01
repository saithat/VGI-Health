# Content handoff

## Content-owned work remaining

**Nothing left.** Owner-requested catalog encoding is complete in `387e51c`
(source rules, canonical support and eight new permanent mutations) and
`6334088` (release coverage, exports, source map and statistics). Both commits
were pushed to `origin/lane/content`. Main and `origin/lane/rules-encode` were
merged first at `c0a6541`.

- All **124** `fit: spec-data` catalog rules are represented in v1: CMS 24,
  Title 22 42, California statutes 23, federal Rx/vaccine 31, entrenched 4.
  The five modules under `lean/Ehr/Specs/Rules/` contribute the lists v1
  concatenates. Every new source item has Law/Entrenched labels, citations
  and catalog ids. Shared encodings carry every citation. `catalog.json`
  records actual `encodedIn` ids, or an explicit reason for the 264
  core-feature and 139 out-of-scope rules. It also records pending renderer
  bindings and dormant Schedule V/GHB branches instead of implying coverage.
- All previous v1 declarations, requirements, alerts and design rules remain
  exact prefixes of the new exports. No property or safety rule was changed.
  The stricter old `naloxoneEducation` flag remains required alongside the
  new human education-outcome enum; this intentional deviation from the
  plan's replacement suggestion is documented in CR-15 and the catalog.
- Canonical content now has 82 screens, 224 elements, 58 infos, 45 commits,
  grouped expanded artifact/prescription sections and required review panels
  before commit buttons. Shared service links preserve patient/episode and
  Back navigation. Fixed order-set rows receive their own prescription fields.
  Each dedicated medication issuance/authorization inherits all ordinary
  signing entries, pre-op guards, reviews and signing alerts. Existing friction
  remains. These are content/visibility declarations, not payload certificates.
- W7 captures the requested drug and human notScheduleII eligibility before
  approval, adds a distinct denial action requiring a denial decision/reason,
  and routes new prescriptions through w7Orders → w7Sign/signOrders. The human
  attestation is not an automatic determination of legal eligibility.
- V1_1 imports V1 and V2 imports V1_1. Both `Extends` proofs still use
  `decide`; `#print axioms` reports only permitted `propext`. No unfinished
  content proofs. V2 indication captures and sign summaries also cover the new
  prescribing variants; all new artifact actions have completing human walks
  in each release, including an old-release-negative/new-release-positive
  antibiotic example.
- All 24 permanent seeds are exported and covered by interpreter/structural
  regressions. New seeds 17–24 remove restraint care-plan, op technique,
  vaccine-provider address, MAR time and controlled-product strength; hide the
  signing notice; omit telehealth consent; or default human refill eligibility.
  Prohibited standing/PRN restraint values also have hard-stop regressions.
  These are not the check lane's semantic rejection lemmas or certificates.
- The previous seven-day CURES correction, vaccine/VIS fields, Schedule II
  zero-refill rule, human signing and all sixteen original seeds remain intact.

## Reproduction and validation

From the root, run `python lean/Ehr/Specs/Rules/encode.py`. Then run, sequentially:

```sh
cd lean
lake build
lake check
lake comparator
lake exe export-content
cd ..
python lean/Ehr/Canonical/export_rules.py
```

The last script audits every proposed entry (scope, allowed values), every
review (shownOnCommit/no waiver), item references, release prefix inheritance
and catalog status against the actual Lean JSON. It regenerates root `STATS.md`,
`programs/canonical/STATS.md` and the source map in `docs/regulations.md`.
The older export executable's console message still says 16 seeds; its actual
export loop writes all 24, which the audit checks.

Validation:

- Full `lake build` passes all canonical, 24-seed, new-artifact and release guards.
- Final `lake check` passes: the default kernel accepts the complete solution,
  with only `propext`, `Quot.sound` and `Classical.choice`.
- Comparator accepts all 18 frozen statements; no statements or properties edited.
- Both extension theorems and the existing main theorems have axiom audits;
  no new axioms, sorry, admit or native_decide were introduced.
- Lean exports round-trip every spec/program. A fresh `/tmp` export plus the
  audit yields **48 byte-identical artifacts**. Native `ehr spec-export` agrees
  with all three specs; the separate CURES-code export agrees with its saved file.
- All **309** new source-item docstrings have source-class and catalog-id labels.
- App build/lint/tests pass (**90**); agent typecheck/lint/tests pass (**31**);
  world build/lint/tests pass (**92**). Tests were rerun after regenerating exports.
- `git diff --check` passes.

Use `pnpm --config.store-dir=/tmp/vgi-content-pnpm-store --filter <pkg> run <script>`.
Never run two Lake processes at once.

## Exactly what remains in other lanes

The actionable consolidated request is **CR-15** in
`docs/design/changes-requests.md`; earlier CR-10–14 remain where noted.

- **Render/app:** implement actual live payload bindings for all 13
  controlledSigning* panels and resultAbnormalFlags, including every selected
  prescription/result row, actual issue date, full identity, strength/form,
  directions and DEA details; render the exact legal notice immediately above
  Sign. The merged `infoContent` still falls back to an empty message for these
  ids. Existing orderSummary fidelity (CR-14) and actual v2 abxIndication rows
  (CR-10) also remain. Abstract visibility alone does not establish any of this.
- **Core/world formulary owners:** introduce correct controlled-V and ghb
  tags only when actual supported products exist, with mirrored reference data.
  Today's finite formulary has neither class, so those encoded branches are
  dormant. Existing Schedule II tags and albuterol caps are already synchronized.
- **App/world/sim adapters:** map the new CommitSpec ids to exclusive artifact
  effects and persist every field's FHIR target; supply trusted dates/provider/
  inventory data; preserve separate refill-denial and prescription-issuance
  effects. Start/reset a fresh artifact episode for later physical events.
  Existing captured flags are not proof of all doses, shifts or restraint
  episodes. ISO labels do not validate dates, deadlines or expiry. Pass true
  encounterKind=preop in surgical episodes (CR-13).
- **Core/check:** preserve the guard semantics while considering artifact
  scoping for currentLineComplete, which currently checks every per-line
  requirement across commits. Content exposes earliestFillDate and controlled
  readiness on composers to keep that stricter stop completable. Terminology
  membership and CURES exemption eligibility still need CR-11 work.
- **Check:** certify all 15 persona canonicals against the matching release,
  reject all 24 seeds with replayable counterexamples/semantic lemmas, and
  preserve human steps, allowed values, source constraints, enter-once and
  workflow-scoped passive alerts. No production checker exists in this worktree;
  content does not claim checker soundness, general T8, or certification.
- **Agent:** preserve drugClass, EntryReq.allowed and requestPriorAuth, then
  round-trip every actual release/persona export. Current real-release parsing
  fails at entries[16].when; v1.1/v2 programs fail at prior-auth action kinds,
  despite the existing 31-test suite passing (CR-12/14). Do not remove constraints
  or panels to satisfy the older validator.
- **WASM/app:** rebuild the interpreter assets and exercise the actual expanded
  specs/programs, native/WASM equivalence, legal hard stops and rendered panels.

`releases/<version>/personas/P1.json` … `P5.json` are the deployment candidates.
The all-workflows canonical is an authoring template; none of these exports is
a production checker certificate.
