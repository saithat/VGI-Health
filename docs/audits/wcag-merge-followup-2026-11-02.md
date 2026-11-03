# Merged WCAG follow-up: complete text values and gate verification

Date: 2026-11-02. Branch: `lane/wcag`. Owner integration point: `57f3597c`.
This worktree started at descendant `24e5f7b2`, also containing the dashboard
Evolution update and extension-proposal work. Those product changes are retained.
No Lean source, policy threshold, font asset or browser configuration is changed.

## Renderer repair

The merged audits each found three SC 1.4.10 occurrences on
`critical.action:panic-1` in `critical-documented.json`: the single-line editor
clipped `Called patient; arranged emergency evaluation` at 1280px/100%,
1280px/200% and 768px/200% text. Both reports otherwise had zero physical findings.

All plain `text` fields now use a one-row, soft-wrapping native textarea. Native
`field-sizing: content` follows changes in value, width and font metrics without
a fixed height or maximum row count. A seven-line CSS addition scopes content
sizing and wrapping to these editors. Long words also wrap. Short values retain
the dense one-row minimum. Search, scanner, identity, user/cosign and coded input
kinds, and the existing narrative editor, keep their widgets. The complete
merged template and persona inventories each have one distinct nonempty plain-text value (the
45-character critical-action sentence); other plain-text fields start empty.
The generic regression supplies additional long entered values.

The renderer preserves the complete string, controlled node identity, accessible
label, textbox role, component ID, required state and Lean enter/confirmation
events. Browser tests verify exact values and both scroll axes for the critical
sentence, longer prose and an unbroken reference at 1280px/100%, 1280px/200%,
768px/200% and 320px/100%. The configured Chromium reports native content sizing
support. The existing semantic ARIA projection passes without alteration.

The critical documented state passes semantic fidelity at both project widths
and all nine physical cases with zero findings. The generic long-text regression
also passes in both projects. Two adversarial CSS selectors now target both
inputs and textareas; all original illegibility and contrast assertions remain.

## Timeout rechecks

The owner template run measured 1,823 of 1,826 states after readiness timeouts in
zero-based batches 5 and 6. All nine state paths reported by failed checks in
those batches were rerun with three workers:

- `w1Orders-tabs-14.json` through `w1Orders-tabs-18.json`
- `w3Disposition-tabs-4.json`
- `w3Provider-expanded.json`
- `w3Provider-popup-doseRangeOrder.json`
- `w4Admin-tabs-4.json`

Result: **48 passed, 12 redundant-project skips, nine measured states, 81 physical
cases, zero findings, no timeouts**. The full audits also cover the complete
original batches. No readiness timeout or physical threshold was relaxed.

The nine-state gate used the original owner exports and this command environment:

```sh
export TMPDIR=/home/saithat/Projects/run-tmp EHR_SCREEN_WORKERS=3 EHR_SCREEN_CACHE=0
export EHR_PHYSICAL_SAMPLE_CACHE="$TMPDIR/wcag-follow-samples"
node app/scripts/screen-check.mjs --ui <the nine paths listed in wcag-follow-timeouts.json>
```

## Verification and coordination

`pnpm --filter app build`, `pnpm --filter app lint` and
`pnpm --filter app exec tsc --noEmit` pass. `pnpm --filter app test --maxWorkers=2`
passes all **321 tests in 40 files**. The initial unit run used an outdated native
checker; rebuilding the unchanged merged Lean sources with
`TMPDIR=/home/saithat/Projects/run-tmp LEAN_NUM_THREADS=2 lake build` completed
435 jobs, and the full unit rerun passed. `make wasm-check` passes with Lean
binding `d61dff3ec9ca465b5938193921234eec4de5a93b77ec08ff2304926192b3f739`.

A new dashboard test contained a lint-forbidden unchecked select cast. It now
narrows to a native select before asserting the original value. The merged
trajectory test's old Evolution heading assertion is checked against the
intentional UI evolution title; no dashboard product behavior is reverted.

The renderer changes the app fingerprint and invalidates recorded app bindings.
No historical certificate is rebound. CSS changes are restricted to wrapping
text editors, so font bundling and browser pinning can merge independently.
No ignored data is staged, and no branch is pushed.

## Full-suite failure classification

The first full merged suite ran with
`APP_TEST_PREVIEW=1 APP_TEST_PORT=4263 pnpm --filter app exec playwright test --workers=3 --reporter=list,json`:
**236 passed, 67 skipped, 43 failed**, 10m 19.34s wall time. Every failed case
is listed below; combined project names represent separate results.

- 32 known live-auth/setup failures: missing seeded login configuration or a rejected Keycloak callback; charts never opened.
- Four known recorded-dashboard failures: complete-run playback remained loading under stale recorded build bindings.
- Three known urgency failures: the legacy `p1-alert.json` fixture predates the additive strip and retains its obstructed modal presentations.
- Four NEW merge failures: two dashboard/trajectory cases, each in both projects, still assumed the old heading, modal, or alert multiplicities.

The new cases are repaired without reverting the merged product behavior. The
trajectory test checks the UI evolution heading and the named pinned high-alert
warning, an offered acknowledgment, its removal after acknowledgment, and the
continued clinical warning. The dashboard test checks exact named clinical-alert
sets in both panes and counterexamples, including both inline and pinned
presentations. Unexpected error alerts still fail those exact-set assertions.
The focused reruns pass all ten dashboard/trajectory tests across both projects.

| Projects | Test | Classification | Disposition |
|---|---|---|---|
| desktop, narrow | `dashboard-performance.spec.ts`: trajectory filters, paging, same-task control and bookmarks on the complete run | recorded-dashboard | Retained known group |
| desktop, narrow | `dashboard-performance.spec.ts`: warm section switches reuse the index; Compare excludes incomplete tasks | recorded-dashboard | Retained known group |
| desktop, narrow | `dashboard.spec.ts`: real P3: five areas, version drawer, exact version EHR pair, and counterexample | NEW | Fixed; focused rerun passes |
| desktop, narrow | `live-login.spec.ts`: local P1 personalized login, patient search, real chart and session restoration | live-auth/setup | Retained known group |
| desktop, narrow | `live-login.spec.ts`: local P1 baseline login, patient search, real chart and session restoration | live-auth/setup | Retained known group |
| desktop, narrow | `live-login.spec.ts`: baseline entry opens the selected clinician's certified role view | live-auth/setup | Retained known group |
| desktop, narrow | `live-search.spec.ts`: live chart search: Aaron, first input and restored checkpoint | live-auth/setup | Retained known group |
| desktop, narrow | `live-search.spec.ts`: live chart search: Terrance, first input and restored checkpoint | live-auth/setup | Retained known group |
| desktop, narrow | `live-selection.spec.ts`: live P1 Schedule opens its patient without clinical writes | live-auth/setup | Retained known group |
| desktop, narrow | `live-selection.spec.ts`: live P1 In Basket Results opens its patient without clinical writes | live-auth/setup | Retained known group |
| desktop, narrow | `live-selection.spec.ts`: live P2 Track Board opens its patient without clinical writes | live-auth/setup | Retained known group |
| desktop, narrow | `live-selection.spec.ts`: live P3 Unit Census opens its patient without clinical writes | live-auth/setup | Retained known group |
| desktop, narrow | `live-selection.spec.ts`: live P3 MAR opens its patient without clinical writes | live-auth/setup | Retained known group |
| desktop, narrow | `live-selection.spec.ts`: live P4 Schedule opens its patient without clinical writes | live-auth/setup | Retained known group |
| desktop, narrow | `live-selection.spec.ts`: live P5 OR Schedule opens its patient without clinical writes | live-auth/setup | Retained known group |
| desktop, narrow | `live-selection.spec.ts`: live P5 Consults opens its patient without clinical writes | live-auth/setup | Retained known group |
| desktop, narrow | `live-selection.spec.ts`: live P1 Patient Lookup opens its patient without clinical writes | live-auth/setup | Retained known group |
| desktop, narrow | `surgery-live-realism.spec.ts`: surgical live review keeps readable receipts and the saved record binding | live-auth/setup | Retained known group |
| desktop, narrow | `surgery-live-realism.spec.ts`: normal surgical clinic keeps technical save controls out of the patient workspace | live-auth/setup | Retained known group |
| desktop, narrow | `trajectories.spec.ts`: all trajectories load on selection and replay on the semantic WASM EHR | NEW | Fixed; focused rerun passes |
| desktop, narrow | `ui-check.spec.ts`: semantic UI fidelity: p1-alert.json | urgency | Retained known group |
| desktop | `ui-check.spec.ts`: physical policy: p1-alert.json | urgency | Retained known group |

## Final committed e2e run

Production and test-source commit: `bd43fa1ab045094668a7d76930a888c2e15e6260`.
The final full suite against that commit returned **240 passed, 67 skipped,
39 failed, zero flaky**, with 9m 59.23s command wall time (598.314s Playwright
suite duration). The 67 existing skips are unchanged. All four NEW failures in
the first run now pass in the full suite, as do both projects of the long-text
regression and all ten dashboard/trajectory cases. No assertions or tests were
skipped to obtain that result.

| Final classification | Failed project cases | Observed failure |
|---|---:|---|
| Known live-auth/setup | 32 | Two baseline cases explicitly require local seeded credentials; remaining cases cannot open the expected worklist/chart or patient-search input after authentication. |
| Known recorded-dashboard | 4 | Both performance tests in both projects retain a disabled Play button, titled “Loading the selected trajectory,” through the 30s assertion timeout. |
| Known urgency | 3 | Legacy `p1-alert.json` lacks perceived `interactionOrder` and `doseRangeOrder` urgent alerts: desktop/narrow fidelity and desktop physical policy fail (90 urgency exposure findings in the physical case). |
| NEW | **0** | Merged heading, pinned-alert acknowledgment and exact alert-set expectations pass. |

The per-test inventory in the previous table identifies every final failure;
its two NEW rows are now passing. The native full audits use fresh merged
exports, including the pinned strip and critical workflow probes; they do not
substitute the outdated checked-in `p1-alert.json` fixture.

Exact full-suite invocation (with disk-backed scratch exported):

```sh
APP_TEST_PREVIEW=1 APP_TEST_PORT=4263 \
  PLAYWRIGHT_JSON_OUTPUT_NAME="$TMPDIR/wcag-follow-final-e2e.json" \
  /usr/bin/time -o "$TMPDIR/wcag-follow-final-e2e.time" \
  pnpm --filter app exec playwright test --workers=3 --reporter=list,json \
  > "$TMPDIR/wcag-follow-final-e2e.log" 2>&1
```

Exit status is 1 for the 39 known failures. Detailed final classifications and
unmodified error messages are retained in
`$TMPDIR/wcag-follow-final-classified.json`; the original full run is retained in
`$TMPDIR/wcag-follow-e2e.{json,log,time}`. Authentication provisioning, recorded
certificate rebinding and legacy urgency-fixture maintenance remain with their
existing lanes; this follow-up neither provisions credentials nor changes those
fixtures or certificates.

## Final full audit coverage

Both full commands run against production/test-source commit `bd43fa1a`. The
app fingerprint is
`be428e856a3456d576f50ad74c04d1d1cf2ebb919131fc94c59dd896a5b254d4`.
The final documentation-only commit leaves the app, UI assertion source and
physical-cache context unchanged. Every exported semantic-tree hash matches the
owner's corresponding merged audit; only the drawing of those trees changed.

```sh
export TMPDIR=/home/saithat/Projects/run-tmp
export EHR_SCREEN_WORKERS=3 EHR_SCREEN_BATCH_SIZE=128 EHR_SCREEN_CACHE=0
export EHR_PHYSICAL_SAMPLE_CACHE="$TMPDIR/wcag-follow-samples"
/usr/bin/time -o "$TMPDIR/wcag-follow-templates.time" \
  node scripts/audit-alert-policy.mjs "$TMPDIR/wcag-follow-templates" \
  > "$TMPDIR/wcag-follow-templates.log" 2>&1
/usr/bin/time -o "$TMPDIR/wcag-follow-personas.time" \
  node scripts/audit-alert-policy.mjs "$TMPDIR/wcag-follow-personas" --personas \
  > "$TMPDIR/wcag-follow-personas.log" 2>&1
```

| Scope | Raw exports | Distinct measured trees | Matrix cases | Findings before → after | Gate time | Whole command |
|---|---:|---:|---:|---:|---:|---:|
| Templates | 4,813 | 1,826 / 1,826 | 16,434 | 3 → **0** | 2,399.793s | 40m 13.36s |
| Personas | 3,619 | 1,296 / 1,296 | 11,664 | 3 → **0** | 1,413.471s | 23m 52.17s |

Templates return **pass**, exit 0, with all 15 batches passing: 5,499 browser
checks pass and 1,829 redundant-project checks skip. There are no unmeasured
states or batch errors. Original zero-based batches 5 and 6 pass in 131.956s and
139.430s respectively, each checking all 128 trees (1,152 physical cases).
The separate nine-state recheck took 22.478s gate time.

Personas return **pass**, exit 0, with all 11 batches passing: 3,909 browser
checks pass and 1,299 redundant-project checks skip. All 1,296 expected states
are measured, with no batch errors. The critical-documented state has zero
findings in all nine cases in both full reports. Across both manifests there
are 8,432 raw exports and **2,679 distinct trees**, including 443 shared trees.
The reports retain 28,098 matrix cases in total; exact duplicate physical
samples share the same app/assertion/browser/policy context. These are bounded
sampled geometry checks, with the original thresholds and enforcement retained.

A separate coverage audit verifies every export SHA-256, every distinct checked
path, the current app and UI assertion hashes, enabled enforcement, all nine
required viewport/text-size combinations (and background phases where declared),
zero findings of any kind and passing status for every batch. It passes for
both full audits. Summaries are retained in each output directory's
`verified-coverage.json`; full evidence is in `exports.json`, `physical.json`
and `result.json`, alongside the command logs and timings above. Both runs bind
the unchanged physical context
`9d3cf1bf43e237d66fe64416a27040f651407894df8a62b33c2653d8284e98f4`.
Whole-tree receipt caching is disabled for these runs. Bound physical samples
may be reused across exact duplicate trees; both fidelity projects still run
for every distinct supplied tree. No timeout or threshold is relaxed.

## Remaining validation commands and scope

```sh
export TMPDIR=/home/saithat/Projects/run-tmp
pnpm --filter app build
pnpm --filter app lint
pnpm --filter app exec tsc --noEmit
pnpm --filter app test --maxWorkers=2
(cd lean && LEAN_NUM_THREADS=2 lake build)
make wasm-check
```

Results are respectively build pass, lint pass, TypeScript pass, **321 unit tests
passing in 40 files**, **435 Lean build jobs passing**, and current WASM binding
pass. The native rebuild uses unchanged Lean sources; no theorem was edited,
so edited-theorem `#print axioms` checks and a Comparator rerun were not needed.

No font bundling, browser pinning, canonical-program edit or Lean source change
was needed. The only stylesheet delta is the seven-line plain-text editor rule.
Historical certificate rebinding, live authentication provisioning and the known
urgency fixture are retained for their existing work; the owner must decide the
disposition of those three failure groups before publishing the integrated
branch. There are no new unresolved renderer or physical-policy questions.
Generated screenshots are restored. Ignored data and `.gitignore` are untouched;
all durable audit artifacts stay in disk-backed scratch. No branch is pushed.
The requested root `CLAUDE.md` is absent in the supplied checkout; `README.md`
was read and updated.
