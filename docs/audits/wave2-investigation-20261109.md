# Wave 2 issue investigation — 2026-11-09

Investigated on `lane/investigate`, from `e48b7504`. Data was copied from the
read-only source checkout into gitignored local paths. No historical recording,
layout choice, fixture, spec, property, theorem, app source or certificate changed.
The executable used for reproduction has SHA-256
`750e9833da4f1ac8373455de911334f6afdb7802bce95822d657b454a9b430d0`, matching
[the wave 2 verification binding](realism-wave2-verification-20261108.md#build-binding).

## Allergy probe: obsolete construction, correct checker acceptance

Classification **(b)**. The old probe hides one component, while three other
components still provide the complete `allergyList` on the same sign screen.
The owner-review flag faithfully reports a passing checker result; its assumption
that this particular mutation is unsafe is wrong. This is not evidence of a
Lean safety-property or checker gap.

`runs/core-10day/decisions/night-01/P1.json` contains this exact patch:

```json
[
  {"op":"add","path":"/screens/[id=w1Sign]/components/[id=w1Sign.allergies]","value":{"id":"seeded-tabs-w1Sign","kind":"tabs","label":"Summary | Allergies","tab":0,"visibility":"always","size":"normal","tag":"secondaryTabs"}},
  {"op":"add","path":"/screens/[id=w1Sign]/components/[id=w1Sign.allergies]/parent","value":"seeded-tabs-w1Sign"},
  {"op":"add","path":"/screens/[id=w1Sign]/components/[id=w1Sign.allergies]/tab","value":1}
]
```

The array `add` inserts tabs before the panel; it does not replace the panel.
The following operations correctly move that panel into tab 1. The remaining
providers in `programs/P1/v0.json` are:

- `w1Sign.chart.allergyList` (table in chart tabs).
- `w1Sign.patientSidebar.allergyList` (panel in an open group).
- `w1Sign.contextPanels.data.allergyList` (table in open context-card groups).

The sidebar and context-card providers remain pinned witnesses. This conclusion
does not rely on the patient banner's allergy badge standing in for the full list.

The intended violation is property 4, `ReviewsBeforeCommit`, specifically
`CommitScreenShowsReviews` in `lean/Ehr/Props/Properties.lean`: whenever a commit
button is shown, each applicable non-waived review must already be met. A valid
receipt may meet a `shownOrReceipt` requirement. `Core.infoShown` and
`Check.reviewsPinnedOn` quantify over **any** information provider; they do not
require this particular panel. The fresh sign-screen counterexample has no
receipt, so hiding every provider violates the existing property. The Lean
`Canonical.Bad.hiddenAllergies` mutation already hides every provider.

The corrected agent probe selects a screen whose commit actually has a
non-waived `allergyList` review, adds root tabs, and reparents every matching
panel/table/trend/prior-auth information provider to tab 1. Composite children
are expanded locally before patching. It records every affected provider as a
target and avoids an existing tab-ID collision. No spec change is proposed.
Seeded candidates remain ineligible for deployment, including unexpected passes.
Historical flags and decisions remain unchanged.

Native reproduction against the archived v0 program and its frozen spec:

```text
old:   "ok"
fixed: reviewsBeforeCommit
       allergyList is not shown on screen w1Sign when signOrders is clicked:
       it must be on the screen, not in a closed tab or collapsed group, and legible
```

The fixed counterexample visits `home → w1Rooming → w1Orders → w1Verify → w1Sign`
and clicks `w1Sign.commit.signOrders`. The fixed patch moves all four providers,
including the original panel. Native regressions also check baseline acceptance,
one-panel hiding acceptance, and full-probe rejection on tracked v1/v2/v3 P1
programs. Unit regressions cover duplicate/composite providers, the prior-auth
information constructor, tab-ID collisions and unrelated/waived review obligations.

## P1 completion: the 328/335 pair is the retained legacy layout comparison

The exact numbers in the issue match **days 2–10 of `core-10day`**, actual layout
versus its no-agent arm. They do not match the successor run's native day files
or the 2026-11-08 receipt. Day 1 has 42 complete tasks in both arms and is omitted
from that pair. The source receipt and run manifests identify these cohorts:

| Run and scope | Clock / interruptions | Actual complete/tasks | No-agent complete/tasks |
|---|---|---:|---:|
| `core-10day`, days 2–10 | legacy / fixedCost | 328/336 | 335/336 |
| `core-10day`, days 1–10 | legacy / fixedCost | 370/378 | 377/378 |
| `realism-wave2-workload-control`, days 1–10 | continuous / fixedCost | 382/386 | 385/386 |
| `realism-wave2-real-work`, days 1–10 | continuous / realWork | 382/386 | 385/386 |

Both successors use `runs/world/realism-wave2-seed-1`, seed 1; the source uses
`runs/world/2`, seed 1. Their source task sets differ. In the headline blind
even-day partition, each successor's P1 actual arm is **202/204**. These agree
with the archived verification receipt's `measurements.runs[*].byPersona.P1`.
No seven-task interruption-model regression exists in this retained pair.

The seven additional legacy failures are exact task matches:

| Day | Actual revision | Failed actual task(s), complete in no-agent | Actual / no-agent complete |
|---|---:|---|---:|
| 7 | 5 | `d07-P1-W1-002`, `d07-P1-W1-004`, `d07-P1-W1-012` | 37 / 40 |
| 8 | 5 | `d08-P1-W1-008`, `d08-P1-W1-009` | 37 / 39 |
| 9 | 5 | `d09-P1-W1-005` | 38 / 39 |
| 10 | 5 | `d10-P1-W1-015` | 38 / 39 |

`d06-P1-W1-005` is incomplete in both arms (40/41); it does not contribute to the
seven-task difference. Every listed task requests MRI of the lumbar spine and a
physical-therapy evaluation alongside medication orders. All end with
`no reachable unmet goal; incomplete`. Medication/note commits can succeed while
service-order value goals remain unmet; successful commits do not imply task
completion. These are neither time-budget exhaustion nor blocked-commit retry
limits.

At night 3, P1 explicitly declined the optional v2 feature (`not-surfaced`),
reasoning that observed work did not need imaging/procedure controls. The v3
migration at night 6 added antibiotic indication fields while preserving that
absence. The no-agent arm keeps its old layout through v2, then uses a v3
canonical layout containing the service controls. Its day-7 sidecar includes
`w1Labs.orderKind` and `w1Labs.orderCode`; P1 revision 5 contains neither field
anywhere. The general property-6 limitation is already documented: checker
acceptance is not a guarantee of all scenario-specific task goals.

Native full-day replay reproduces every original actual/no-agent count above.
As a diagnostic intervention, copying **only those two field components** from
the no-agent day-7 layout into P1 revision 5's `w1Labs`, with their parent removed
so they are visible at root, gives:

```text
day 7: 40/40, no incomplete tasks
day 8: 39/39, no incomplete tasks
day 9: 39/39, no incomplete tasks
day 10: 39/39, no incomplete tasks
```

This recovers all seven tasks with identical tasks, world, seed, clock and
interruption mode. The intervention is local diagnostic data, not a deployed or
re-certified revision. Its initial variant retaining the absent
`w1Labs.servicePriorAuth` parent recovered zero tasks; orphaned fields are hidden.

The successors show the same capability gap on their different task sets:

| Day | Incomplete actual task(s), both successor modes | Actual / no-agent complete |
|---|---|---:|
| 6 | `d06-P1-W1-011` | 41 / 41 (42 tasks) |
| 7 | `d07-P1-W1-009`, `d07-P1-W1-012` | 37 / 39 (39 tasks) |
| 8 | `d08-P1-W1-009` | 40 / 41 (41 tasks) |

All four have zero queue delay, zero overtime, zero handovers and no clinical
suspension intervals. The real-work arm has no offered interruptions for the
first three. Day 8's one offered colleague question is serviced in closure,
after the incomplete clinical endpoint. The failure precedes that communication.
Native replay of these three days in real-work mode reproduces the table.

**Conclusion:** a retained layout capability gap following an optional-feature
choice and differing migration strategies; not expected time-pressure realism
and not an observed scheduler/interruption simulator defect. Historical choices
must not be rewritten to manufacture completion parity. No clinical rule change
is necessary to expose these existing controls. Requiring optional capability
coverage on future deployments is a separate owner policy decision.

## Reproduction

Use disk-backed `TMPDIR=/home/saithat/Projects/run-tmp`. Copy the relevant
`core-10day` programs, decisions, frozen certifications, day files and no-agent
sidecars; both successor P1 day files; worlds `2` and `realism-wave2-seed-1`; and
`fixtures/synthea`. All copies stay gitignored. `EHR_BIN` below names the local
copy of the bound executable. Tests require installed workspace dependencies.

Probe reproduction, using the actual recorded patch and the corrected builder:

```sh
TMPDIR=/home/saithat/Projects/run-tmp node --import ./agent/node_modules/tsx/dist/loader.mjs --input-type=module <<'JS'
import {readFileSync} from 'node:fs';
import {createEhr} from './agent/src/ehr.ts';
import {applyToProgram} from './agent/src/program.ts';
import {buildSeeded} from './agent/src/seeded.ts';
import {programSchema,specSchema} from './agent/src/schema.ts';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const p=programSchema.parse(read('runs/core-10day/programs/P1/v0.json'));
const specVersion='runs/core-10day/certifications/P1/v0/spec.json';
const sp=specSchema.parse(read(specVersion));
const old=read('runs/core-10day/decisions/night-01/P1.json').candidates.find(c=>c.candidate.seededKind==='allergyHidden').candidate;
const ehr=createEhr({fake:false,binary:process.env.EHR_BIN});
for(const c of [old,buildSeeded('allergyHidden',p,sp)]) {
  const program=applyToProgram(p,c.patch,{version:1}).program;
  console.log(JSON.stringify({patch:c.patch,verdict:await ehr.check({specVersion,program,prev:p,canonical:p})}));
}
JS
```

Completion inventory and the native replay/intervention (one native process at a
time; full day preserves RNG consumption and prior patient resources):

```sh
TMPDIR=/home/saithat/Projects/run-tmp python3 - <<'PY'
import json, os, subprocess
from pathlib import Path
read=lambda p: json.loads(Path(p).read_text())
out=Path('.cache/investigate/reproduction');out.mkdir(parents=True,exist_ok=True)
for run in ['core-10day','realism-wave2-workload-control','realism-wave2-real-work']:
    days=[read(f'runs/{run}/days/day-{day:02}/P1.json') for day in range(1,11)]
    print(run, 'actual', sum(t['completed'] for d in days for t in d['tasks']),
          '/',sum(len(d['tasks']) for d in days))
for day in range(2,11):
    a=read(f'runs/core-10day/days/day-{day:02}/P1.json')
    b=read(f'runs/core-10day/no-agent/days/day-{day:02}/P1.json')
    print(day, 'actual/control',sum(t['completed'] for t in a['tasks']),
          sum(t['completed'] for t in b['tasks']),
          'extra failures',[t['task'] for t in a['tasks'] if not t['completed']
                            and next(x for x in b['tasks'] if x['task']==t['task'])['completed']])
for run,world,clock,interruptions,days in [
    ('core-10day','2','legacy','fixedCost',range(6,11)),
    ('realism-wave2-real-work','realism-wave2-seed-1','continuous','realWork',[6,7,8])]:
    for day in days:
        v=read(f'runs/{run}/days/day-{day:02}/P1.json')['programVersion']
        program=f'runs/{run}/programs/P1/v{v}.json'
        arms={'actual':program,'no-agent':f'runs/core-10day/no-agent/days/day-{day:02}/P1.program.json'}
        if run=='core-10day' and day>=7:
            p=read(program);control=read(arms['no-agent'])
            screen=next(s for s in p['screens'] if s['id']=='w1Labs')
            for s in control['screens']:
                for c in s['components']:
                    if c['id'] in ['w1Labs.orderKind','w1Labs.orderCode']:
                        c.pop('parent',None);screen['components'].append(c)
            restored=out/f'restored-{day}.json';restored.write_text(json.dumps(p))
            arms['restored']=str(restored)
        for arm,p in arms.items():
            args=[os.environ['EHR_BIN'],'simulate','--spec',f'runs/core-10day/certifications/P1/v{v}/spec.json',
                  '--program',p,'--persona',f'runs/world/{world}/personas/P1.json',
                  '--schedule',f'runs/world/{world}/schedules/day-{day:02}/P1.json',
                  '--world',f'runs/world/{world}','--seed',str(1000+day),
                  '--clock-mode',clock,'--interruptions',interruptions]
            result=subprocess.run(args,check=True,capture_output=True,text=True)
            (out/f'{run}-{day}-{arm}.json').write_text(result.stdout)
            d=json.loads(result.stdout)
            print(run,day,arm,sum(t['completed'] for t in d['tasks']),len(d['tasks']),
                  [t['task'] for t in d['tasks'] if not t['completed']])
PY
```

## Verification and owner decisions

All commands below ran from `agent/`, with disk-backed `TMPDIR` and `EHR_BIN`
pointing to the bound local binary:

- `node_modules/.bin/tsc --noEmit`: exit 0.
- `node_modules/.bin/eslint src/seeded.ts test/seeded.test.ts --max-warnings 0`: exit 0.
- `node_modules/.bin/vitest run test/seeded.test.ts test/fake-ehr.test.ts test/night.test.ts test/review-followup.test.ts --maxWorkers=2`: 26/26 passed, including native v1/v2/v3 checks (23.99 s).
- The two reproduction blocks above were extracted and executed verbatim with `EHR_BIN` set; both exited 0. Probe verdicts and all replay/restoration counts match the tables.
- `sha256sum .cache/investigate/native/ehr` (repository root): the bound SHA-256 above.
- `git diff --check` (repository root): exit 0.

No Lean edit/build/axiom audit was needed. No Chromium work or full browser audit
was run, per this lane's explicit prohibition. No certified app input changed.
No data was staged, no other branch/worktree was modified, and nothing was pushed.

Owner decision — Allergy safety: none; the existing property rejects the corrected mutation.

Owner decision — Future completion: should optional-feature and migration gates require source-task imaging/procedure capability even when the learned policy declines the feature?

Owner question — Count attribution: identify any separate capture truly showing 328/335 for the successor; the retained evidence matches the legacy actual/no-agent pair exactly.
