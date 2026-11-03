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
kinds, and the existing narrative editor, keep their widgets.

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
zero-based batches 5 and 6. All nine failed states were rerun with three workers:

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
