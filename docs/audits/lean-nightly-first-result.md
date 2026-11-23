# Lean nightly mode: first local result

The historical `snapshot-density.mjs` command below was a one-time freezer and has been retired; the frozen vendor-density JSON is retained.

[Mode, commands and limitations](../methods/design-discovery.md)

These are synthetic local experiments, with native clinical admission and Lean
layout geometry. They have **no browser screen certificate**, do not measure the
deployed React interface, and establish no clinical benefit.

## Real two-day trial

The confined Codex backend worked. The completed run is the gitignored
`runs/lean-night-2day-p135-compact`, world 2, P1/P3/P5, two days, one night,
`gpt-6.1-sol`, with three persona workers and serialized context extraction:

```sh
export TMPDIR=/home/saithat/Projects/run-tmp LEAN_NUM_THREADS=2 CI=true
pnpm --config.verify-deps-before-run=false --filter agent run-days \
  --screens lean --parallel --days 2 --personas P1,P3,P5 --backend codex \
  --model gpt-6.1-sol --world runs/world/2 \
  --run-id lean-night-2day-p135-compact --seed-policy none
node scripts/discovery/report.mjs runs/lean-night-2day-p135-compact
node scripts/discovery/serve.mjs --run runs/lean-night-2day-p135-compact
```

Use a **new** run ID to replicate; the completed directory is immutable evidence.
The trial's captured agent fingerprint is
`3a71d6cb7f71cdfd2776de7a9fbfcfe006b7b2f297e0c2d3565b23c9d7994d83`.
It preceded the final training-workspace inventory scoping, review-schema/hash
metadata cleanup and streaming-gallery changes. Those final changes are covered
by the current tests; these measurements describe the captured development
trial. Its inputs, decisions, certificates and fingerprints were not rebound.
A source-matched replication should start a new run from the finished commit.

All day-1 costs equal the independent no-agent arm. Day 2:

| Persona | Clicks, no agent → agent | Scrolls, no agent → agent | Completion, both arms | Night outcome |
|---|---:|---:|---:|---|
| P1, primary care | 839 → 798 | 1,053 → 997 | 40/40 | Shipped v1 |
| P3, ward nurse | 689 → 689 | 801 → 801 | 51/51 | Kept v0 |
| P5, inpatient rounds | 748 → 748 | 2,060 → 1,981 | 14/14 | Shipped v1 |

Day 1 completed 42/42 P1, 38/38 P3 and 18/18 P5 tasks in both arms. P1 shipped
an order-review shortcut, valid review-receipt reuse and removal of removable
reminders. P5 shipped a Chart Summary visit action, removal of a redundant
removable reminder and composer compaction. P3's chosen bundle failed bounded
validation: 186 → 194 clicks exceeded the existing 2% tolerance. No tolerance,
clinical rule, layout rule or default was changed.

The 12 live candidates all edited Program; **none proposed a custom layout**.
The scripted regression separately ships a Program macro plus a source-linked
custom home family, reproducing the reference geometry, after a malformed family
is refused and repaired. This verifies the sidecar/admission/publication path;
it is not evidence of model-discovered geometric novelty.

## Wall time and refusals

Per-persona phase wall seconds include independent controls and validation.
Workers overlap; do not sum them to estimate elapsed run time. Day phases exclude
initial certification and the final whole-run digest; nights include model calls.

| Persona | Day 1 seconds | Night 1 seconds | Day 2 seconds | Model-call seconds within night |
|---|---:|---:|---:|---:|
| P1 | 387.14 | 1,173.62 | 226.65 | 137.87 |
| P3 | 161.12 | 564.31 | 129.91 | 137.97 |
| P5 | 203.35 | 823.30 | 341.28 | 179.76 |

The real gate recorded 19 distinct Program/layout admissions, all passing,
537.19 summed gate seconds: **0.0354 admissions/second**, including native
screen export, shape extraction, painting and density checks. There were zero
Lean G-rule refusals in this live sample. Two candidates failed the unchanged
native navigation-label rule; one selected bundle failed bounded validation.
Navigation therefore refused the most individual live candidates (two).

The six-case adversarial fixture benchmark measures just batched native
`family-check` over all three viewports: **219.18 candidates/second**, 27.37 ms
for six cases. One passes; five fail. Refusals by rule: G1=1, G3=1, G4=1, G6=1,
G7=1, G10=1. G3/G4 co-occur on the undersized-target case. There is no dominant
rule in that small fixture set. These fixture timings do not estimate full EHR
candidate throughput.

The final scripted/replay smoke, `runs/lean-smoke-accepted/{recorded,replay}`,
completed two days for all three personas with matching decisions and daily
counts. Scripted day phases were 0.86–1.82 s and nights 3.50–5.08 s; replay days
0.91–1.82 s and nights 3.74–5.56 s. The runs recorded 30 admission checks each,
with zero refusals, at 2.14 and 1.97 checks/second respectively. Clinical checker,
simulation and semantic screen fixtures in these smoke runs are fakes.

The supplied browser-mode reference is 15–20 hours for a ten-day recording,
mostly rendered-screen checks, with 2–4 minutes of model calls per persona/night.
This short, three-persona experiment is not a matched speed comparison. Browser
work is absent, but native replay/export/painting now dominates the measured
night phases. The development recording is 5.4 GiB; final artifact hashing adds
wall time beyond the table. The gallery indexes that corpus below 32 MiB heap,
with eight changed screens and 16 before/after paint files available, under a
256 MiB Node heap limit. It streams selected files and excludes unshipped
alternatives with the same version number.

## Verification

All commands run from the repository root with the disk-backed `TMPDIR` above.

```sh
(cd lean && lake build ehr ui-layout ui-port-audit)
pnpm --config.verify-deps-before-run=false --filter agent test --maxWorkers 2
pnpm --config.verify-deps-before-run=false --filter agent typecheck
pnpm --config.verify-deps-before-run=false --filter agent lint
pnpm --config.verify-deps-before-run=false --filter app build
pnpm --config.verify-deps-before-run=false --filter app typecheck
pnpm --config.verify-deps-before-run=false --filter app exec eslint \
  src/browser/discovery src/browser/data.ts src/dashboard/agent-evidence.ts \
  --max-warnings 0
node scripts/discovery/snapshot-density.mjs
node scripts/discovery/smoke.mjs runs/lean-smoke-accepted
node scripts/discovery/gate-benchmark.mjs runs/lean-gate-benchmark
flock -w 120 "$TMPDIR/vgi-browser-heavy.lock" \
  pnpm --config.verify-deps-before-run=false --filter app exec playwright test \
  --config src/browser/discovery/playwright.config.ts --workers 1
git diff --check
```

Results: existing native targets build (656 cached jobs); agent typecheck/lint,
app build/typecheck and scoped review-UI lint pass; the gallery test passes with
one worker, including added/removed screens. The complete agent suite passes
292 tests, with 64 existing
fixture/data-dependent skips. The 12 focused Lean-mode tests cover density,
source/viewport/linkage refusal, shadowed cases, free target placement and atlas scroll accounting,
per-event state selection, sidecar identity/immutability, source binding,
lossless inventory encoding, training-workspace scope, repair/publication,
scripted/replay orchestration and provenance-only timing exclusions.

No Lean source, certified app source, lockfile, Vite configuration or app entry
point changed. The rebuilt app SHA-256 matches the read-only reference build:
`7a6caf9be56a30668ea27dbdbebd17f35d02f8b29321997f96c0ecca9ae5b299`.
No existing recording was re-certified. The full browser audit pair and full
Playwright suites were not run, to preserve the recording using the browser.
The ten-day study remains for an external launch from a fresh run directory.

Deployment still needs an interactive painter, real events sent to Lean `step`,
focus/keyboard/ARIA integration, a reference layout matching today's dense
screens, bounded interactive lists and structural state coverage. The current
metric's clip-reveal limitation and the bounded actor's Program-slot memory
model are additional research limits described in the mode documentation.
