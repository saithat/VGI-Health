/** Materialize the reviewable tracked report; raw data and images remain ignored. */
import path from 'node:path';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const run=process.argv[2]??'runs/explore-round2';
if(!path.resolve(run).startsWith(path.resolve('runs')+path.sep))throw Error('Expected runs/');
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const report=await read(`${run}/round2-report.json`);if(report.phase!=='complete')throw Error('Evaluation not complete');
const protocol=await read(`${run}/protocol.json`);
if(protocol.promotion){
 const coverage=await read(`${run}/promotion-coverage.json`),exports=await read(`${run}/export-coverage.json`);
 const reference=await read(`${run}/reference-stack.json`),sources=await read(`${run}/source-time-check.json`);
 if(report.rows.map(r=>r.id).sort().join(',')!=='r2-007,r2-008')throw Error('Unexpected promotion members');
 if(report.rows.length!==2||report.rows.some(r=>r.tier!=='proved'||r.leanVerdict!=='ok'||r.screen.status!=='pass'||r.certified||r.search.missingGeometry||r.heldout.missingGeometry))throw Error('Ordinary promotion gates incomplete');
 if(report.newModelRequests!==0||report.codexCalls!==0)throw Error('Expected recorded-cache validation');
 const f=n=>Number(n).toFixed(1),spread=s=>`${f(s.mean)} ± ${f(s.sd)} [${f(s.min)}, ${f(s.max)}]`;
 const row=(r,tier)=>`| ${r.id} | ${tier} | ${r.heldout.members.reduce((n,p)=>n+p.completed,0)}/24 | ${spread(r.heldout.effort)} | ${spread(r.heldout.mouseTravelPx)} | ${spread(r.heldout.scrollPx)} |`;
 const results=`| Design | Current tier | Held-out completion | Effort / task | Mouse px / task | Scroll px / task |
|---|---|---|---|---|---|
${row(reference,'stack reference; no new certificate')}
${report.rows.map(r=>row(r,'proved ordinary; ordinary gate passed')).join('\n')}

Spreads are mean ± population SD [min,max] across 12 physicians’ two-task means.
The original search/held-out split and seed 20261103 are retained. Both designs
completed ${report.rows.map(r=>r.search.members.reduce((n,p)=>n+p.completed,0)+'/24').join(' and ')} search executions.
Compared with this build’s stack reference, held-out mouse travel changes by
${report.rows.map(r=>r.id+': '+f(100*(r.heldout.mouseTravelPx.mean/reference.heldout.mouseTravelPx.mean-1))+'%').join('; ')}.
These are simulator/geometry measurements, not human travel paths or elapsed time.
Scrolling rises to ${report.rows.map(r=>r.id+': '+f(r.heldout.scrollPx.mean/reference.heldout.scrollPx.mean)+'×').join('; ')}
the stack reference. The declared composite effort rises by
${report.rows.map(r=>r.id+': '+f(100*(r.heldout.effort.mean/reference.heldout.effort.mean-1))+'%').join('; ')}.
No outcome-driven layout change or archive replacement follows this rerun.

All **${coverage.views}** distinct emitted ordinary views pass at 1440 and 390 px
(**${coverage.checks} checks**), including **${exports.states} native exports**.
Real W3 source checks on the actual laboratory tab emit ${sources.cases.map(c=>c.dated).join(', ')} dated entries
from shown backing rows; ${sources.cases.map(c=>c.withheld).join(', ')} unshown or unsupported
candidates are withheld. Scope is effectiveDateTime (otherwise effectivePeriod.start)
and issued on supported vital/lab rows. There are zero native/WASM mismatches. The original
**${report.importedModelScores}** probability entries suffice: **0 new model requests,
0 proposal calls**. Raw task traces, source hashes and coverage remain in
\`${run}/\`; no deployment certificate was produced.`;
 let text=await readFile('docs/design/exploration-round2.md','utf8');
 const block=`<!-- promotion-results:start -->\n${results}\n<!-- promotion-results:end -->`;
 if(text.includes('PROMOTION_RESULTS_PENDING'))text=text.replace('PROMOTION_RESULTS_PENDING',block);
 else if(text.includes('<!-- promotion-results:start -->'))text=text.replace(/<!-- promotion-results:start -->[\s\S]*?<!-- promotion-results:end -->/,block);
 else throw Error('Promotion report section missing');
 await writeFile('docs/design/exploration-round2.md',text);
 const files=['explore/round2.mjs','explore/workspace.mjs','explore/promote-coverage.mjs','explore/promote-coverage-negative.mjs','explore/promote-exports.mjs','explore/promote-source-check.mjs','explore/prepare-promotion.mjs','explore/round2-report.mjs','app/scripts/promote-gate.mjs'];
 await writeFile(`${run}/source-provenance.json`,JSON.stringify({files:Object.fromEntries(await Promise.all(files.map(async f=>[f,createHash('sha256').update(await readFile(f)).digest('hex')]))),protocol,manifest:await read('app/public/ehr/manifest.json'),baseCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()},null,2));
 console.log(JSON.stringify({report:'docs/design/exploration-round2.md',ordinaryViews:coverage.views,newModelRequests:0}));
 process.exit(0);
}
const cal=await read(`${run}/calibration/calibration.json`),gate=await read(`${run}/exotic-gate.json`),agreement=await read(`${run}/agreement.json`);
let geometryCorrection=null;
try{geometryCorrection=await read(`${run}/geometry-corrections.json`);}catch(error){if(error.code!=='ENOENT')throw error;}
const manifest=await read('app/public/ehr/manifest.json');
const historic=await read('runs/core-10day-live/certs/P2/v0.build.2.json');
const appComparison=await read(`${run}/app-binding-comparison.json`);
let before;try{before=await read(`${run}/bindings-before.json`);}catch(error){if(error.code!=='ENOENT')throw error;before=JSON.parse(execFileSync('git',['show','HEAD:app/public/ehr/manifest.json'],{encoding:'utf8'}));await writeFile(`${run}/bindings-before.json`,JSON.stringify(before,null,2));}
const files=['lean/Ehr/Sem/Exotic.lean','lean/Ehr/Sem/ExoticApi.lean','lean/Ehr/Sem/ExoticMain.lean','app/src/ehr/ui/Exotic.tsx','app/src/ehr/ui/exotic-axis.ts','app/src/ehr/ui/exotic.css','app/src/ehr/exotic-offline.tsx','app/exotic-check.html','app/scripts/exotic-gate.mjs','explore/cohort.ts','explore/round2.mjs','explore/round2-propose.ts','explore/round2-recover.ts','explore/round2-agreement.mjs','explore/round2-samples.mjs','explore/round2-report.mjs','explore/round2-descriptors.mjs','explore/round2-remeasure.mjs','explore/cost.ts','explore/geometry-check.mjs','explore/workspace.mjs','explore/full-binding-check.mjs'];
const hashes=Object.fromEntries(await Promise.all(files.map(async f=>[f,createHash('sha256').update(await readFile(f)).digest('hex')])));
await writeFile(`${run}/source-provenance.json`,JSON.stringify({files:hashes,manifest,app:protocol.build,experimentWasm:protocol.wasmSha256,ehrSha256:createHash('sha256').update(await readFile('lean/.lake/build/bin/ehr')).digest('hex'),specSha256:createHash('sha256').update(await readFile('releases/v1/spec.json')).digest('hex'),baseCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()},null,2));
const f=n=>Number(n).toFixed(1),spread=s=>s?`${f(s.mean)} ± ${f(s.sd)} [${f(s.min)}, ${f(s.max)}]`:'—';
const labels={ 'r2-001':'list / stack', 'r2-002':'list / columns', 'r2-003':'list / document', 'r2-004':'list / ordered timeline', 'r2-005':'command / keyboard', 'r2-006':'list / spatial pinned zones', 'r2-007':'board / multiple patients', 'r2-008':'list / dated UTC index / timeline' };
const table=report.rows.map(r=>`| ${r.id} | ${labels[r.id]} | ${r.tier}${r.certified?' · gates passed':''} | ${r.heldout?`${Math.round(r.heldout.completion.mean*24)}/24; ${spread(r.heldout.completion)}`:'—'} | ${spread(r.heldout?.effort)} | ${spread(r.heldout?.mouseTravelPx)} | ${spread(r.heldout?.scrollPx)} |`).join('\n');
const native=report.rows.filter(r=>r.nativeReference).map(r=>`| ${r.id} | ${r.nativeReference.filter(t=>t.completed).length}/${r.nativeReference.length} | ${r.nativeReference.reduce((n,t)=>n+t.clicks,0)} | ${r.nativeReference.reduce((n,t)=>n+t.scrolls,0)} | ${r.nativeReference.reduce((n,t)=>n+t.keystrokes,0)} |`).join('\n');
const shots=(await readdir(`${run}/screenshots`)).filter(f=>f.endsWith('.png')).sort();
const reject=report.rejections.length?report.rejections.map(r=>`- **${r.id}** (${r.stage??'gate'}): ${(r.reason+(r.resolution?' — '+r.resolution:'')).replace(/\s+/g,' ').slice(0,700)}. Full finding: \`${run}/round2-report.json\`.`).join('\n'):'No final candidates were rejected. Canonical hidden-content, duplicate-key, wrong-binding and reversed-axis controls were rejected as intended.';
const correct=cal.choiceRows.reduce((n,r)=>n+r.correct,0);
let text=`# ED exploration, round 2

Research output on branch \`lane/explore2\`; no deployment or publication. Raw
records: \`${run}/\`. README.md was read first; CLAUDE.md is absent in this
worktree. The policy lane's semantic modules and gate files were not edited.

## Outcome and assurance

Eight niche-directed Codex proposals used **${report.codexCalls} calls**, service tier
**default**, requested model \`gpt-6.1-sol\`. One proposal per target niche makes this
a small portfolio search, not an exhaustive optimum. Clinical obligations and
identity movement budgets are unchanged. Every backing program passes the native
checker before evaluation. “Gates passed” below means native acceptance plus the
whole-version stock-renderer gate; no deployment certificate was published.

An earlier pre-bound-core diagnostic run incorrectly overrode patient selection.
Its metrics are excluded under \`prebound-v1/\`; they are not the table below.
The final version keeps the program flag true and uses a fresh cohort seed after
instrumentation. Only frozen diagnostic **search-side** probability entries are
reused; no held-out scores, choices or outcomes enter search. The cache boundary
and exclusion are recorded in \`probability-cache-origin.json\` and
\`diagnostic-exclusion.json\`. The final held-out profiles were not used during
development.

All four exotic primitives remain **sandbox**. Kernel lemmas and working painters
are useful progress; the ordinary-program extension contract is not yet discharged.
A backing program's certificate cannot certify a different renderer.

| Candidate | Realized niche | Tier | Held-out completion (mean ± SD [min,max]) | Effort / task | Mouse px / task | Scroll px / task |
|---|---|---|---|---|---|---|
${table}

Spreads are across 12 physicians' two-task means, with population SD. Completion
is a fraction; the count is 24 physician-task executions per design. Each niche
contains at most one accepted candidate, so its best entry is also its only
entry. The complete categorical keys, search metrics and rejections remain in
\`round2-report.json\`; the tracked table is the summary, not a deployment pointer.
The archive has **${Object.keys(report.archive).length} cells**, including
**${Object.values(report.archive).filter(r=>r.certified).length} passing stock-renderer cells**
and **${Object.values(report.archive).filter(r=>!r.certified).length} sandbox cells**.

## Proof obligations and working UX

New files: \`lean/Ehr/Sem/Exotic.lean\`, \`ExoticApi.lean\`, \`ExoticMain.lean\`;
one import in Ehr.lean and one opt-in executable in lakefile.toml. No protected
Specs, Props, Statements or comparator files changed. Twelve named theorems
were audited with \`#print axioms\`; each uses only propext, Classical.choice and
Quot.sound, or no axioms.

- **Commands:** typed offers retain IDs, labels, enabled state and reasons.
  \`command_reachable\` proves exact-ID submission resolves an enabled offered
  command; \`resolve_authority\` proves the converse click-ID authority.
  \`commands_honest\` inherits disabled explanations and labels from semantic
  honesty, with a modal restricting the command source. The painter supports
  Ctrl+K, typed filtering, arrows and Enter. Missing: ordinary UiNode/schema and
  traversals, focus/filter transition simulation, bounded measured exposure,
  discovery, role-specific confirmation/acknowledgment event refinement and all-state
  gate coverage. The Lean resolver models clicks; the painter maps confirm/ack roles
  to the original typed events, tested separately. Typing an ID is not a proved keystroke bound.
- **Board:** opaque patient keys are unique; routing returns that pane and its
  nonempty banner. \`route_unique\`, \`route_patient\`, \`commit_banner\` and
  \`admitted_board_valid\` prove these structural claims. The browser binds every
  event to an independent RenderInput and runs the real WASM step; duplicate keys
  and source-key mismatches fail. A tested event in pane 3 leaves panes 1 and 2
  byte-identical. An additional two-patient W3 check uses the unchanged true
  selection flag, blocks an actual unbound signing control, opens/hydrates both
  source patients and returns/reopens one while preserving the other session. Missing: kernel simulation of session updates and clinical
  patient/encounter/version-to-banner correspondence, DOM/ARIA identifier scoping,
  receipt scoping, cross-patient
  urgency, ordinary UiNode integration and whole-version custom-renderer coverage.
  This lane does not claim shared dose/bed/concurrency authority.
- **Spatial:** Work and Review zones preserve all children, proved by
  \`zones_complete\`. Desktop uses two work columns and a sticky review panel;
  narrow view stacks the same full children. Missing: an admitted typed constructor,
  view-transition and continuous occlusion/exposure proofs, keyboard focus bounds,
  urgent pins and all-state geometry coverage. Dragging and overlap are unsupported.
- **Dated timeline:** UTC epoch-minute coordinates and a separate undated list.
  \`admitted_chronological\` proves every accepted axis is pairwise chronological;
  reversed input is rejected. \`axis_meaning\` and \`axis_preserves\` transport
  every semantic predicate only under the explicit exact-child-list premise.
  The canonical axis spans 2026-10-31 to 2026-11-02 with proportional spacing.
  The working W3 view adds a sorted source-date index while retaining complete
  clinical workspace rows. Invalid calendar dates and timezone-ambiguous timestamps
  receive no coordinate; pre-1970 records remain unpositioned in the complete rows.
  Date-only source values use the UTC day boundary as a plotting convention;
  the displayed midnight coordinate is not an inferred clinical time. Missing: a kernel-checked source-date projection and
  complete-child refinement for this index, ordinary program opt-in and all-state
  geometry coverage. Existing \`layout.timeline\` remains the admitted ordered-child
  primitive; this lane does not silently promote the dated sandbox into it.
  The sampled W3 display rows use formatted timestamps without offsets, so their
  index remains empty under this conservative parser. A populated source timeline
  is demonstrated by the canonical dated fixture, not established by this cohort;
  retaining machine-readable source timestamps is unfinished integration work.

All moment-based guarantees remain conditional on measured exposure. The sandbox
is served by Vite at \`/exotic-check.html?mode=command|spatial|board|dated\`.
\`window.startResearch\` runs independent Lean sessions; \`?harness=1\` exposes the
fixture seam without automatically loading the canonical example. The standalone
dated demo uses the explicit Lean canonical axis fixture; cohort axes come from
the corresponding patient’s dated source rows. It imports no
clinical persistence client. The additive gate checks both 1440×900 and 390×900;
it does not modify the policy lane's screen gate.

## Cohort, decision interface and geometry

**24 simulated ED physicians**, seed ${protocol.seed}; fixed alternating split gives 12
search and 12 held-out members. Each split contains forward, reverse and central
visual-search preferences and high, mixed and low keyboard shares. Seeded choice
lapses and navigation detours decrease by \`1 / (1 + learningRate × completedTasks)\`.
Experience resets per design and increases across tasks. These are declared
simulator assumptions, not fitted human behavior. Lapses randomize useful choices;
there is no clinical-error or typographical-error model.

Search tasks: ${protocol.searchTasks.map(x=>'\`'+x+'\`').join(', ')}.
Held-out tasks: ${protocol.heldoutTasks.map(x=>'\`'+x+'\`').join(', ')}.
Day-2 patients are disjoint from the day-1 search patients. Archived projections
supply clinical inputs and episode segmentation, never next-action labels to the
cohort. The existing Lean goal policy supplies useful legal events or a navigation
step; the model chooses among these, with the behavior mixture applied through
\`DecisionModel.choice\`. Patient selection stays enabled in the exact checked program. Native open/lookup
controls are forced goal candidates, scored through the same interface; hydration
is a recorded host step, not a second clinician activation. The native bound-source
guard remains in force for every clinical action. Backtracks stay within the
patient’s clinical navigation rather than abandoning the chart. Clinical values
come from task goals, not generated text. Behavior profiles share the fixed P2
physician authorization context; they are not 24 authenticated live users.
This restricted action support makes completion easier than unconstrained use.

The supplied server at \`http://127.0.0.1:8788/v1\` reported
\`${protocol.health.model}\`, revision \`${protocol.health.revision}\`,
license \`${protocol.health.license}\`, device **${protocol.health.device}**.
No CPU fallback was needed and no decision server was started in this sandbox.
The final decision cache contains **${report.modelCalls} distinct choice-score entries**, including
**${report.importedModelScores}** precomputed diagnostic search-only scores and
**${report.newModelRequests}** new GPU requests. Imported entries need not all be
queried by the final profiles; singleton choices are
forced and exact identical requests reuse frozen probabilities. No weights,
temperature or behavior parameters were fitted to held-out outcomes. The immutable
\`frozen-archive.json\` was written before the first held-out physician request;
held-out metrics never select or replace an entry.

The objective first maximizes completion, then minimizes
\`clicks + estimated keys/20 + mouseTravelPx/1000 + scrollPx/1000\`.
Keys are an explicit activation/typing proxy, not measured Tab sequences. The
fixed definition in \`cost.ts\` was recorded before held-out requests: entered
text for both devices, one keyboard activation, or ID length + 2 for palette clicks.
Confirmations and modal acknowledgments use one keyboard activation. Final summaries
and per-task records are normalized to that definition; corrections preserve all
events, geometry, completions and frozen selected IDs in \`metric-corrections.json\`
(zero typing corrections in the final run). The separate pane-scroll correction
below changes geometry only. Mouse
movement is straight-line travel between Chromium component rectangles; shared
component IDs can resolve to a field/confirmation wrapper rather than its exact
activation point. Scroll is
measured from actual scroll-container offsets around scrollIntoView. The browser
renders every chosen state at 1440×900. Keyboard interactions incur zero pointer
movement and still expose their target. Initial pointer is (0,0) per task. This is
not eye tracking, elapsed physician time or a measured human pointer path.
The cohort measures a rendered target then dispatches its typed interpreter event;
it does not replay physical keystrokes or establish continuous unobscured exposure.
The interpreter clock advances one simulated second per action; inference latency
is excluded. Board tasks execute sequentially with another patient’s initial
work visible; cross-patient planning/interleaving was not evaluated. Three actors
use at most six isolated pages (native picker and bound laboratory per actor). Full source and per-event metrics remain
under \`cohort/\`. Missing target geometry rejects an archive entry instead of scoring it
as cheap. The final process measured **${report.geometryStates} unique state/target/device keys**;
resumed members retain their earlier measurements in the per-event files.

Native reference estimates below use the original deterministic P2 simulator on
the same two search tasks. They are a different policy and contain no pixel
geometry; they must not be subtracted from the cohort pixel metrics as savings.

| Candidate | Native completion | Clicks | Scroll events | Keystrokes |
|---|---|---|---|---|
${native}

## Frozen-model calibration

Labels are **simulator-generated, not human**. The frozen raw model was compared
with one visible enabled recorded click per selected W3 trajectory, excluding
entries, tabs and popups. Choice accuracy: **${correct}/${cal.choice.n}**;
top-choice ECE **${cal.choice.ece.toFixed(3)}**, binary top-choice Brier
**${cal.choice.brier.toFixed(3)}**. Ten-bin counts, confidence and frequencies,
source trajectories and exclusions remain in \`calibration/calibration.json\`.
This selected 24-label sample is a smoke calibration assessment and is poorly
calibrated; it does not validate a physician choice model. It evaluates the raw
model, not the later hand-specified behavior mixture. Historical checker labels
(${cal.screen.n}; ECE ${cal.screen.ece.toFixed(3)}) are a separate, positive-heavy
screen-prediction diagnostic and do not certify programs. No label was used to fit
the model or select a held-out physician policy.

## Rejections and execution notes

${reject}

Three sandbox descriptors were corrected to the actual painter: spatial/dated
views retain ordinary list navigation, and command/spatial controls retain normal
density. Program compact-size flags are not carried by UiScreen and no separate
compact laboratory preset was implemented. The spatial zones,
command interface and dated axes remain distinct realized niches. The correction is
recorded in \`descriptor-corrections.json\`; descriptor corrections change no program,
geometry or selected ID. Typing-proxy normalization is recorded separately, with
the unnormalized report retained as \`round2-report-before-normalization.json\`.
It is not a held-out reselection. In the excluded diagnostic run, a renderer edit
triggered hot reload during board evaluation and the document scroller was counted
twice. Both instrumentation defects were fixed before the fresh final cohort ran:
HMR is disabled, renderer sources are frozen and the scroller set is deduplicated.

All eight original responses were recovered without new requests after an
orchestration defect compared JSON property order. Original transcripts and
initial error files remain under \`operators/\`; \`proposal-recovery.json\`
records the structural-comparison correction. The proposal budget claim remains
eight. Diagnostic checkpoints, repairs and remeasurements remain under
\`prebound-v1/\` for audit and contribute no final outcome metrics. The final run
uses the original patient-selection flag throughout and records its archive
before evaluating any final held-out physician. Exact-input cache entries are
predictions, not outcome labels.

${geometryCorrection?`Final review found a further accounting defect: the board's scrollable patient
article itself was absent from the scroller set. Its ${geometryCorrection.tasks}
saved traces were replayed with the pane root included, asserting identical
interpreter results at every event and making **zero new model requests**. The
table includes those corrected measurements. Original records are retained under
\`geometry-pane-v2/\`; \`geometry-corrections.json\` carries both search hashes
and every before/after task metric. The original frozen hash passed before the
repair; the repaired search hash differs, while all selected IDs are unchanged.
There is only one candidate in each niche, so this correction cannot choose a
different winner. Held-out outcomes never drove a new proposal or membership
decision. Regression checks now cover both a single document scroller and the
scrollable patient root. The earlier zero board-scroll result is not used.
Original records use geometry version 2; repaired board records use version 3.
Fresh runs require version 3 throughout and reject old resume checkpoints.`:'No post-run geometry correction was needed.'}

## Verification and bindings

Environment for every command: \`TMPDIR=/home/saithat/Projects/run-tmp\`,
\`LEAN_NUM_THREADS=4\`; Playwright workers ≤4 and cohort pages ≤6. Executed:

\`\`\`sh
(cd lean && lake build && lake build exotic-api)
(cd lean && lake env lean Ehr/Sem/Exotic.lean)
JOBS=4 EM_CACHE="$TMPDIR/explore2-emcache" make wasm
make wasm-check
pnpm --filter app build
pnpm --filter app exec tsc --noEmit
pnpm --filter agent exec tsc -p ../explore/tsconfig.json --noEmit
node --import ./agent/node_modules/tsx/dist/loader.mjs --test explore/*.test.ts
pnpm --filter app test --maxWorkers=4
pnpm --filter app exec eslint src/ehr/ui/Exotic.tsx src/ehr/ui/exotic-axis.ts src/ehr/exotic-offline.tsx scripts/exotic-gate.mjs tests/exotic-axis.test.ts tests/exotic-command.test.ts --max-warnings 0
node app/scripts/exotic-gate.mjs ${run}
node --import ./agent/node_modules/tsx/dist/loader.mjs explore/geometry-check.mjs ${run}
node --import ./agent/node_modules/tsx/dist/loader.mjs explore/full-binding-check.mjs ${run}
node --import ./agent/node_modules/tsx/dist/loader.mjs explore/round2-agreement.mjs ${run}
node --import ./agent/node_modules/tsx/dist/loader.mjs explore/round2-descriptors.mjs ${run}
node --import ./agent/node_modules/tsx/dist/loader.mjs explore/round2-remeasure.mjs ${run}
node --import ./agent/node_modules/tsx/dist/loader.mjs explore/round2-samples.mjs ${run}
node --import ./agent/node_modules/tsx/dist/loader.mjs explore/calibration.mjs --source runs/core-10day-live --out ${run}/calibration --endpoint http://127.0.0.1:8788/v1 --model Mapika/decider-0.8b --limit 24
node --import ./agent/node_modules/tsx/dist/loader.mjs explore/round2-propose.ts ${run}
node --import ./agent/node_modules/tsx/dist/loader.mjs explore/round2-recover.ts ${run}
EHR_SCREEN_WORKERS=4 APP_TEST_PREVIEW=1 APP_TEST_PORT=4272 node --import ./agent/node_modules/tsx/dist/loader.mjs explore/round2.mjs ${run}
node --import ./agent/node_modules/tsx/dist/loader.mjs explore/round2-report.mjs ${run}
\`\`\`

Lean, both typechecks, WASM binding check, production build and changed-file lint
pass. Exploration tests: 13 passed, 1 opt-in endpoint test skipped. App tests:
316 passed in 39 files. Additive sandbox gate: ${gate.results.length} recorded
checks and ${gate.shots.length} canonical screenshots. Native/WASM agreement:
${agreement.cases??0} primitive API cases, ${agreement.choiceCases??0} W3 goal-choice boundaries,
${agreement.steps??0} real transitions plus their rendered screens,
${agreement.mismatches??0} mismatches. Ordinary renderer gates retain complete exported-state
coverage and their known-bad controls under \`stock-gates/\`; their pre-existing
skips remain explicit in those transcripts. Full \`pnpm --filter app lint\`
fails on three **pre-existing** forbidden casts in \`app/e2e/ui-check.spec.ts:685,687\`
and \`app/tests/ui-painter.test.tsx:1662\`. They were not edited.

Lean source binding: \`${before.leanSourceHash}\` →
\`${manifest.leanSourceHash}\`.
WASM SHA-256: \`${before.assets['ehr-interp.wasm']}\` →
\`${manifest.assets['ehr-interp.wasm']}\` (${(await readFile('app/public/ehr/ehr-interp.wasm')).length} bytes).
For certificate comparison, the historical P2/v0 build.2 app binding was
\`${historic.appSha256}\`; this is a recorded run binding, not a rebuild of
pre-lane HEAD. The measured production app fingerprint is unchanged against the same-worktree
HEAD baseline (isolated laboratory files are not production entries). It is
\`${protocol.build.appSha256}\`; sandbox renderer source hashes are separately
recorded in \`source-provenance.json\` because the development lab is unbound.
The baseline production app hash was \`${appComparison.baselineHead.appSha256}\`;
measured equality is \`${appComparison.sameProductionAppFingerprint}\`. The isolated
laboratory is a development entry and is source-hashed separately. App files were
added under app/, and the changed WASM/source binding invalidates recorded
certificates; no historical binding is reused or rebound.
No protected clinical rule was changed,
no deployment/push or other branch/worktree mutation was performed, and no data
path or ignore exception was added to git.

## Screenshot inventory

Images are untracked review samples, not all-state admission evidence. Eight canonical samples cover four views × two widths; other images show the two
search tasks' actual initial screens for each evaluated candidate. The four
exotic views also have working-state samples at both widths; the dated sample
selects the recorded state with the most dated source rows. Board working-state
samples use two actual source-patient projections, matching the cohort context.

${shots.map(s=>'- \`'+run+'/screenshots/'+s+'\`').join('\n')}

## Owner decisions still open

1. Whether to fund ordinary-language admission of command, spatial, board and
   dated-axis constructors, with the missing obligations listed above.
2. Whether to add an explicit density field/painter preset; this run does not
   claim a realized compact-control niche.
3. Which human-owned cross-patient urgency and receipt/version policy a board
   must enforce; this lane does not choose that policy.
4. A larger patient/task sample and human clinician validation before treating
   these simulator metrics or the poorly calibrated tiny model as usability evidence.
`;
await writeFile('docs/design/exploration-round2.md',text);
console.log(JSON.stringify({report:'docs/design/exploration-round2.md',niches:Object.keys(report.archive).length,screenshots:shots.length}));
