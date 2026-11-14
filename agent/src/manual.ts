import ts from 'typescript';
import { RELEASE_MODULES } from './release-config.js';
/** Generated from the checked-in formal sources; never reads simulation holdouts. */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { sha256 } from './program.js';
import type { Program, Spec } from './schema.js';
import { REPO_ROOT, writeJson } from './util.js';

const read = (file: string) => readFileSync(path.join(REPO_ROOT, file), 'utf8');
const docstrings = (source: string) => [...source.matchAll(/\/--\s*([\s\S]*?)\s*-\//g)].map((m) => m[1] ?? '');
export function ruleProfile(): string {
  const match = /def ruleProfile\s*:\s*RuleProfile\s*:=\s*\.(\w+)/.exec(read('lean/Ehr/Specs/Profile.lean'));
  if (!match) throw new Error('Cannot identify enforced rule profile');
  return match[1] ?? '';
}
const profileLine = () => ruleProfile() === 'core'
  ? 'Catalog additions are switched off for this run, except the explicitly retained denyRefill requirements; the hand-written base rules and all safety/design properties remain enforced.'
  : 'The full catalog profile is enforced for this run.';

function properties(): string {
  // Include supporting docstrings too: the short property headings alone omit obligations.
  return ['lean/Ehr/Props/Properties.lean', 'lean/Ehr/Props/Navigation.lean'].map((file) =>
    `Source: ${file}\n\n${docstrings(read(file)).join('\n\n')}`).join('\n\n');
}
function designRules(): string {
  return read('docs/design/core-model.md').split('**Minimal design rules')[1]?.split('Nothing else')[0] ?? '';
}
function specDocs(): { text: string; declaration: string; name: string; origin: string }[] {
  return [...Object.values(RELEASE_MODULES), 'Rules/Federal'].flatMap((name) => {
    const source = read(`lean/Ehr/Specs/${name}.lean`);
    return [...source.matchAll(/\/--\s*([\s\S]*?)\s*-\/\s*(?:def|private def)\s+(\w+)([\s\S]*?)(?=\n(?:\/--|def |private def |end |theorem )|$)/g)]
      .map((m) => ({ origin: name, name: m[2] ?? '', text: `${m[1] ?? ''} [lean/Ehr/Specs/${name}.lean:${m[2] ?? ''}]`, declaration: m[3] ?? '' }));
  });
}

/** Exact, role/workflow-relevant obligations from the exported active spec. */
export function formalRuleContext(spec: Spec, program: Program): string {
  const serialized = JSON.stringify(program);
  const commits = new Set(spec.commits.filter((c) => c.roles.includes(program.role) && serialized.includes(`"${c.id}"`)).map((c) => c.id));
  const entries = spec.entries.filter((e) => commits.has(e.commit));
  const reviews = spec.reviews.filter((e) => commits.has(e.commit));
  const ids = new Set([...entries.map((e) => e.element), ...reviews.map((e) => e.info), ...commits]);
  const labels = [...spec.elements, ...spec.infos, ...spec.commits].filter((e) => ids.has(e.id)).map((e) => ({ id: e.id, label: e.label }));
  const citations = specDocs().flatMap((d) => {
    if (d.origin.startsWith('Rules/') && ruleProfile() === 'core') {
      if (!commits.has('denyRefill') || !d.declaration.includes('"denyRefill"')) return [];
      return [`${d.text.split('\n')[0]} Only the exported denyRefill obligation is enforced; the rest of the catalog narrative is switched off. [${d.origin}:${d.name}]`];
    }
    return [...ids].some((id) => d.declaration.includes(`"${id}"`) || new RegExp(`\\b${id}\\b`).test(d.declaration)) ? [d.text] : [];
  });
  return [`Rule profile: ${ruleProfile()}. ${profileLine()}`, `Role ${program.role}; workflows ${[...new Set(program.screens.map((s) => s.workflow))].join(', ')}.`,
    'Enforced entries, reviews, alerts, labels and policy citations (the complete active spec is also supplied):',
    JSON.stringify({ commits: spec.commits.filter((c) => commits.has(c.id)), entries, reviews, alerts: spec.alerts.filter((a) => commits.has(a.commit)), labels, budgets: spec.design }), ...citations,
    'All co-signatures are human-only. A simulated attending is not designer automation and never authorizes bypassing an active encounter-role rule.'].join('\n\n');
}

export function programVocabulary(): string {
  const types=ts.createSourceFile('ehr-types.ts',read('lean/generated/ehr-types.ts'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  return ['Slot','Prefill','Action','Visibility','Size','Kind','Component','ComponentDef','Screen','MacroStep','Macro','Program'].map(name=>{
    const declaration=types.statements.find(node=>(ts.isInterfaceDeclaration(node)||ts.isTypeAliasDeclaration(node))&&node.name.text===name);
    if(!declaration)throw new Error(`Missing generated program construct ${name}`);
    return declaration.getText(types);
  }).join('\n');
}

export function capabilitiesManual(): string {
  const examples: string[] = [];
  const dir = path.join(REPO_ROOT, 'runs/core-10day/decisions');
  // Lexicographic night/persona/candidate order makes the two examples reproducible.
  for (const night of existsSync(dir) ? readdirSync(dir).sort() : []) {
    for (const file of readdirSync(path.join(dir, night)).filter(f => /^P[1-5]\.json$/.test(f)).sort()) {
      const record = z.object({ candidates: z.array(z.object({ candidate: z.object({ summary: z.string(), patch: z.unknown() }), check: z.object({ status: z.string(), property: z.string().nullable(), message: z.string().nullable() }) })) }).parse(JSON.parse(read(`runs/core-10day/decisions/${night}/${file}`)));
      for (const candidate of record.candidates) {
        const outcome = candidate.check.status === 'pass' ? 'accepted by checker' : 'rejected';
        if (examples.some(e => e.startsWith(outcome))) continue;
        examples.push(`${outcome} (recorded core-10day, ${night}/${file}): ${JSON.stringify(candidate)}`);
      }
    }
  }
  return `# Capabilities manual (generated; pnpm --filter agent manual)\n
One canonical EHR serves everyone. Each persona's v0 is the canonical with that role's permissions and pre-set view. The overnight agent evolves only that persona's FORK. Vendor releases are merged into every fork and re-certified before next login.\n
Rule profile: ${ruleProfile()}. ${profileLine()}\n
## What you can change\n
Program screens, start navigation, components, labels, grouping, tabs, visibility, density, shortcuts, copies, provenance prefills, receipts, defaults with confirmation, and guarded macros. Use the generated Program/Kind/Macro types as the exact vocabulary (lean/generated/ehr-types.ts). JSON Patch examples: add a copied button with copyOf; change a panel from normal to compact (less vertical padding, smaller gaps and tighter rows, using less vertical space; scroll distance and pointer travel can change; font sizes stay unchanged with a 12px text floor and 24×24px target floor); link an autoLinked field to its source.\n
Composite source templates use componentDefs and kind.use. The agent expands them into existing native kinds, then the real checker certifies the complete executable expansion. Source and expanded executable are saved separately and bound by hashes; the app and trajectory/complexity tools consume the certified executable. Native Lean Kind.use/Program.expand is still an upstream request; no new native semantic kind is invented here. Example: componentDefs [{name:"summary",params:["info"],body:[{id:"panel",kind:{panel:{info:"{{info}}"}},label:"Summary",tab:0,visibility:"always",size:"normal",tag:"summary"}]}], then kind {use:{name:"summary",args:[["info","currentMeds"]]}}. The use component id namespaces expanded ids. No nested use in template bodies.\n
Presentation components are declared in the source Program's presentationComponents array: {name:"Review", key:"info" or "composite:summary", source:"...TSX..."}. They live at app/src/ehr/ui/custom/<owner>/v<N>/<Name>.tsx with a per-version manifest. A fail-closed compiler accepts a declarative TSX subset: named imports of Box/Stack/Group/Paper/Flex from @mantine/core, and UiNodeView plus type PresentationProps from @ehr/presentation. Export one pure function Review({node,onEvent}: PresentationProps), returning literal layout wrappers around exactly one <UiNodeView node={node} onEvent={onEvent} />. No other JavaScript is executed: the checked TSX lowers to a typed layout manifest. No functions, hooks, globals, dynamic expressions, spread props, DOM, network, storage, timers, unsafe HTML or remapped events. Layout props have a typed allowlist. This deliberately supports layout and density changes; arbitrary React logic and new semantic behavior are unavailable. The build-bound bundle includes source and compiled layout; the real complete-version ARIA/visibility/legibility/no-cover harness paints that bundle before atomic deployment. Example source: import {Paper} from '@mantine/core'; import {UiNodeView,type PresentationProps} from '@ehr/presentation'; export default function Review({node,onEvent}:PresentationProps){return <Paper p="xs" withBorder><UiNodeView node={node} onEvent={onEvent}/></Paper>;}\n
## Exact generated UI-program vocabulary\n\n\`\`\`typescript\n${programVocabulary()}\n\`\`\`\n\n## What you cannot change\n
Never change Lean interpreter, checker, spec, properties, data/FHIR write layer or backend. The shared patientSelection binding is immutable; never disable it. No new semantic kinds. Never automate a human-only action, identity check, scan, acknowledgement, commit or cosign (including NP pre-op attending co-signature). No hidden required information and no exceeded budgets. Presentation code cannot fetch, use storage, timers, global DOM, unsafe HTML or imports outside the allowlist.\n
R7 specification change: copies beside a retained original do not count as moves. After the original is deleted, the first surviving copy represents its tag for screen/parent movement accounting, even if copyOf still names the deleted original.\n
## Enforced properties 1–13, A1–A4\n
${properties()}\n
## Design rules D1–D6\n
${designRules()}\n
## Active spec rules, labels and citations\n
Every prompt includes the persona's formalRuleContext, derived from the active releases/<version>/spec.json, its role and workflow commits; it includes exact entry/review/alert conditions, budgets and source docstrings with citations. Full exported spec follows it. Only active rules are listed; source catalog additions are not imported as obligations under core.\n
## Certification and deployment\n
Each candidate is pre-screened. Compatible candidates are merged, then checked as ONE program. The objective is clicks, scroll count, scroll pixels and mouse-travel pixels at a fixed 1440×900 viewport. Chromium measures component centers and scroll offsets. Pointer movement is straight-line with no tremor; one pointer starts at viewport center per day trace. Clicks and scroll counts may not regress; pixel metrics have a 2% + 1px tolerance, with strict improvement in at least one of those four dimensions and full completion unchanged. R1 policy change: keystrokes and modeled time (klmDeciSec) must each remain within 2% on validation, without the pixel rounding allowance. They constrain release but do not replace the click-plus-scroll score. Missing geometry or cost metrics are unavailable and cannot pass optimization. The whole merged version passes offline screen visibility, legibility, no-cover and ARIA fidelity checks before real ehr deploy re-checks it. A refusal publishes nothing. The per-user login pointer is replaced atomically only after program, components, certificate, build binding and the complete decision record are durable. Validation requires every task to complete and no completion regression; savings use tasks completed in both arms. Odd days are calibration only (a held-out task partition and independent validation seed); even days are blind measurements and never enter selection. Daily measurement compares the certified role canonical for the active release on the same schedule and seed. Rebind rechecks frozen inputs and current whole-version screen gates without changing programs or calling a model. Next login loads the certified fork; release migrations preserve customizations where certification permits. Stability and alert budgets come from spec.design and alert tiers; no budget is relaxed.\n
Counterexample: {violation:{property,message,counterexample:[Event],screens:[ScreenId]}}. Replay the events to see why the checker refused the design; repair the program, never the rule.\n
## Recorded examples\n
${examples.join('\n\n')}\n`;
}
export function promptContext(spec: Spec, program: Program) {
  const manual = capabilitiesManual();
  const rules = formalRuleContext(spec, program);
  return { manual, rules, manualHash: sha256(manual), ruleContextHash: sha256(rules), ruleProfile: ruleProfile() };
}

if (process.argv[1]?.endsWith('/manual.ts')) {
  const { mkdir, writeFile } = await import('node:fs/promises');
  await mkdir(path.join(REPO_ROOT, 'docs/agent'), { recursive: true });
  const manual = capabilitiesManual();
  await writeFile(path.join(REPO_ROOT, 'docs/agent/CAPABILITIES.md'), manual);
  await writeJson(path.join(REPO_ROOT, 'docs/agent/CAPABILITIES.sha256.json'), { sha256: sha256(manual), ruleProfile: ruleProfile() });
}
