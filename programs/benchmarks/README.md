# Fixed union-of-workflows benchmark

Run from the repository root:

```sh
(cd lean && lake build ehr)
pnpm complexity --run run1-P3
# Future runs, including all five personas:
pnpm complexity --run <id>
# Audit committed numbers and run the browser smoke test:
pnpm test:complexity
# Canonical releases only:
pnpm complexity
# Recompute a run without rebuilding the canonical report:
pnpm complexity --run <id> --no-canonical
```

`EHR_BIN` selects a native CLI. `EHR_LEAN_DIR` selects its matching Lake build
(default `lean/`); its `ehr.rsp` and exported objects build the measurement
adapter in a temporary directory. Both must come from the same source revision.
No source in `lean/` is generated or modified. The adapter imports the existing
Ehr goal derivation, joint certified search, interpreter and KLM functions.
`EHR_FAKE=1` is rejected. A bounded or failed search stops computation; it never
becomes a zero or a claimed minimum. Commands time out rather than hang forever.
For restricted pnpm stores, add `--config.verify-deps-before-run=false` before
`complexity`, as described in docs/STATUS.md.

## Cases

`suite.json` freezes synthetic patients, day 1 resources, clinical choices,
medication doses, note sections, and time. It does not resample a future run's
patients or multiply by its daily census. Every case starts independently with
no receipts from another case. Within a task, the simulator carries receipts
between medication/vaccine episodes. Interruptions are zero.

| Workflow | Fixed work |
| --- | --- |
| W1 | Day-1 P1 first patient; lisinopril 10 mg PO daily, 30 days, 3 refills; I10 visit/order/billing diagnosis; 99214 service level; sign orders and note |
| W2 | Day-1 P1 first result patient; acknowledge the included low hemoglobin observation |
| W3 | Day-1 P2 first discharged patient; the recorded acetaminophen orders, documentation and ED discharge disposition |
| W4 | Day-1 P3 first MAR patient; insulin lispro 4 units SC, wristband/medication scans, second clinician high-alert cosign, given/scheduled decision, plus assessment |
| W5 | Day-1 P4 first pediatric patient; current recorded weight, amoxicillin 710 mg BID (45 mg/kg/dose for 15.8 kg, rounded), and CVX 150 influenza immunization |
| W6 | Day-1 P5 consult patient, frozen for all three steps: pre-op cefazolin 2 g IV once, postoperative operative note, discharge instructions. These independent steps sum into one W6 representative case |
| W7 | Day-1 P1 first refill patient; approve the included lisinopril prescription |

Source resources are copied into the suite; fixture patient bundles remain in
`fixtures/synthea`, resolved through `runs/world/1`. W5 combines the first visit's
weight-based order with a fixed influenza vaccine. W6 stages reuse one fixed
patient rather than different day-1 surgery patients. These are synthetic
benchmark scenarios, not clinical recommendations.

## Clinical values and the CLI seam

The stock `TaskChoices` cannot express diagnosis, service level or refill count.
Its standard `ehr min-clicks` result is retained verbatim under `tasks[].native`.
The benchmark's `fixedValues` additionally pin these **existing required goals**
inside `Measure.lean`, then call `Ehr.Sim.jointMinimum` for both objectives. This
uses the exact same certified search and `Ehr.step` as the CLI, rather than
silently benchmarking `other` diagnosis and a one-unit refill placeholder. No clinical
rules, safety checking, or transition logic are duplicated. Fixed values are
validated by the existing value validator before searching. The complete pinned
minimum paths are saved separately from the native unpinned paths.

## Iterations, projections and aggregation

For every manifest persona, use all numerically sorted `v*.json` files with an
`ok` certificate. Supported layouts are `programs/<persona>/vN.json` plus
`certs/<persona>/vN.json`, or `<persona>/vN.json` plus `vN.cert.json`. A recorded
v0 establishes identity and release; its benchmark program is the current
canonical persona projection for that release, as requested. Other iterations
use the actual recorded program. Certificate `specVersion` supplies the release
in force, including versions where a vendor feature was not surfaced. Sources
and hashes are recorded explicitly; historical certificates are not claimed to
certify today's regenerated canonical baseline.

Role projection retains a whole representative case only if the program has
that workflow and the release authorizes **all** its required commits for the
program role. Skipped workflows have reasons in the JSON. The present canonical
projections contain all screens, so authorization matters: the P3 RN union is
W4; it cannot prescribe or sign physician notes. P1/P2 physicians and P4 NP can
also perform workflows outside their generated day schedule. P5 surgery includes
W6 but excludes physician-only ED disposition and primary-care refill approval.
A persona's union is the sum of its supported workflow case totals, each once.
The canonical source report covers all seven workflows exactly once for each
release, choosing an authorized representative role for each case.

## Metrics and limits

- **Clicks**: certified minimum activations (scans count zero; hotkeys count one).
- **Keystrokes**: separately certified minimum typed characters, not necessarily
  the count on the minimum-click path. Both paths and search spaces are retained.
- **KLM seconds**: `actionOps` and `klmMs` on the minimum-click path, with hotkeys
  whenever available, no random overrides or detours. Includes scan, cosign wait,
  mental and hand-switch operators. Fixed search clock: KLM does not advance it.
  This is path effort, not a separately minimized time or an elapsed shift.
- **Screens**: screen visits including the initial screen and each episode reset;
  returning to a screen counts again.
- **Required fields**: distinct (episode, required element, slot) fields entered
  or confirmed on that path. Scans count as fields, optional reviews do not.
- **Popups**: interruptive acknowledgments on that path.

The theoretical floor is `Ehr.Sim.floorMetrics` on the same pinned goals and
release. Its ideal UI has one screen per episode, no travel, allowed prefills,
required human input and applicable alerts; field count excludes nonhuman
`autoLinked` values. KLM floor has the simulator's decisecond precision.

`exact: true` means **exact within the reported search space**, not globally
minimal over arbitrary UI events. `full` omits Back/search/scroll and fixes the
clock; `goalDirected` fixes the first unmet field; `navigationDirected` also
restricts navigation to goal routes. Auto uses directed spaces for large
programs. Never compare a directed result as a global minimum. The dashboard
states the scope, exposes exact tables and marks vendor/rejection nights. KLM
is an estimate. A rejection marker is placed at that night's resulting UI
version; several nights can share a marker without inventing a new iteration.

Outputs are deterministic JSON (no wall-clock timestamps or absolute build
paths), with suite/binary/adapter/program hashes and raw paths for audit. The
run report replaces atomically after a complete successful computation.

The frozen assets identify the historical run's actual releases at
`suite.releaseSource.revision`. When a new run's v0 has a different canonical
screen/macro structure, computation automatically selects current `releases/`
for that run and its canonical comparison. Use `--release-root <directory>` to
select another archived release tree explicitly (same `<version>/spec.json`, `<version>/canonical.json` and
`<version>/personas/<P>.json` layout). Every output records the selected source.
New contracts must have completable fixture scenarios; missing clinical evidence
fails the computation rather than inventing attestations.
