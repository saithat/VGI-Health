/**
 * TEST-ONLY scripted backend: canned LLM answers against the FAKE canonical
 * program, keyed by purpose and persona. Tests run it once through the
 * recorder, then replay the recordings with the real replay backend.
 */
import type { JsonLlm, JsonRequest, JsonResponse } from '../src/backends/types.js';
import type { LlmCandidate, LlmChoice, LlmProposal } from '../src/schema.js';

type Op = LlmCandidate['patch'][number];
const op = (o: 'add' | 'remove' | 'replace', path: string, value?: unknown): Op => ({ op: o, path, from: '', valueJson: value === undefined ? '' : JSON.stringify(value) });
const comp = (id: string, kind: unknown, extra: Record<string, unknown> = {}) => ({
  id, kind, label: id, parent: null, tab: 0, visibility: 'always', size: 'normal', hotkey: null, tag: id, copyOf: null, ...extra,
});
const cand = (id: string, moveType: LlmCandidate['moveType'], summary: string, patch: Op[], klm = 60): LlmCandidate => ({
  id, summary, moveType, rationale: `scripted: ${summary}`, targets: [], patch, predicted: { clicks: 3, keystrokes: 6, scrolls: 0, klmDeciSec: klm },
});

const macroCandidate = (id: string, screen: string, target: string, fields: string[]): LlmCandidate => cand(id, 'macro',
  `Macro on ${screen}: pre-set ${fields.join(', ')} and jump to ${target}`, [
    op('add', `/screens/[id=${screen}]/components/-`, comp(`${id}-btn`, { macro: { id: `${id}-m` } }, { label: 'Usual order', hotkey: 'Alt+U' })),
    op('add', '/macros/-', { id: `${id}-m`, label: 'Usual order', steps: [...fields.map((f) => ({ setValue: { comp: f, value: 'usual' } })), { goto: { screen: target } }] }),
  ], 150);

function nightly(persona: string): LlmProposal {
  const hypothesis = `scripted hypothesis for ${persona}`;
  switch (persona) {
    case 'P1':
      return {
        hypothesis, decision: 'change', candidates: [
          macroCandidate('p1-macro', 'w1-notes', 'w1-orders', ['w1-drug', 'w1-dose', 'w1-freq']),
          // Natural (unseeded) unsafe idea: commit from the composer, where allergies are not shown.
          cand('p1-toolbar-sign', 'copyToToolbar', 'Copy "Sign orders" onto the order composer toolbar', [
            op('add', '/screens/[id=w1-orders]/components/[id=w1-go-sign]', comp('w1-tb-sign', { button: { action: { commit: { commit: 'signOrders' } } } }, { copyOf: 'w1-sign-orders', label: 'Sign' })),
          ], 120),
          cand('p1-labs-forward', 'bringInfoForward', 'Show relevant labs on the refill screen without opening a tab', [
            op('replace', '/screens/[id=w7-refill]/components/[id=w7-labs]/tab', 0),
          ], 40),
        ],
      };
    case 'P2':
      return {
        hypothesis, decision: 'change', candidates: [
          macroCandidate('p2-orderset', 'w3-triage', 'w3-orders', ['w3-drug', 'w3-dose']),
          cand('p2-dup-passive', 'collapseOptional', 'Make the removable duplicate-therapy alert passive', [
            op('replace', '/screens/[id=w3-orders]/components/[id=w3-dup]/kind/alert/popup', false),
          ], 30),
          cand('p2-bad-selector', 'reorder', 'Reorder a component that does not exist', [op('remove', '/screens/[id=w3-orders]/components/[id=nope]')], 10),
        ],
      };
    case 'P3':
      return {
        hypothesis, decision: 'change', candidates: [
          cand('p3-pain-prefill', 'defaultConfirm', 'Default the pain score to the last value', [
            op('replace', '/screens/[id=w4-mar]/components/[id=w4-pain]/kind/field/prefill', { default: { value: '0' } }),
          ], 30),
          cand('p3-skip-worklist', 'composeTaskView', 'Open the MAR from the home screen directly', [
            op('replace', '/screens/[id=home]/components/[id=home-go-w4]/kind/button/action/goto/screen', 'w4-mar'),
            op('remove', '/screens/[id=w4-worklist]'),
          ], 50),
          cand('p3-compact', 'reorder', 'Compact the dose details panel', [op('replace', '/screens/[id=w4-mar]/components/[id=w4-dose]/size', 'compact')], 5),
        ],
      };
    case 'P4':
      return {
        hypothesis, decision: 'change', candidates: [
          macroCandidate('p4-macro', 'w5-growth', 'w5-dosing', ['w5-drug', 'w5-dose']),
          cand('p4-compact', 'reorder', 'Compact the growth chart', [op('replace', '/screens/[id=w5-growth]/components/[id=w5-growth-trend]/size', 'compact')], 5),
          cand('p4-hide-dosecheck', 'collapseOptional', 'Collapse the dose check', [op('replace', '/screens/[id=w5-dosing]/components/[id=w5-dosecheck]/size', 'tiny')], 20),
        ],
      };
    default: {
      // P5: two candidates that each pass but together exceed the stability budget (forces a repair).
      const groupInto = (gid: string, ids: string[]): Op[] => [
        op('add', `/screens/[id=w6-preop]/components/[id=${ids[0] ?? ''}]`, comp(gid, { group: { collapsible: true, startCollapsed: false } }, { label: gid })),
        ...ids.map((x) => op('replace', `/screens/[id=w6-preop]/components/[id=${x}]/parent`, gid)),
      ];
      return {
        hypothesis, decision: 'change', candidates: [
          cand('p5-group-review', 'merge', 'Group the pre-op review panels', groupInto('p5-review', ['w6-anticoag', 'w6-allergies', 'w6-meds', 'w6-consent'])),
          cand('p5-group-orders', 'merge', 'Group the pre-op order fields', groupInto('p5-orders', ['w6-drug', 'w6-dose', 'w6-idreentry'])),
          macroCandidate('p5-macro', 'w6-preop', 'w6-discharge', ['w6-dc-note']),
        ],
      };
    }
  }
}

function choose(prompt: string, persona: string): LlmChoice {
  const rows = prompt.split('\n').filter((l) => l.startsWith('{"id":')).flatMap((l) => {
    try {
      const r: unknown = JSON.parse(l);
      return typeof r === 'object' && r !== null ? [r] : [];
    } catch {
      return [];
    }
  });
  const passing = rows.flatMap((r) => ('id' in r && 'check' in r && 'seeded' in r && r.check === 'pass' && r.seeded === false && typeof r.id === 'string' ? [r.id] : []));
  const chosen = persona === 'P5' ? passing.filter((id) => id.startsWith('p5-group')) : passing.slice(0, 1);
  return { chosen, rationale: `scripted choice for ${persona}`, rejected: passing.filter((id) => !chosen.includes(id)).map((id) => ({ id, reason: 'scripted' })) };
}

function repair(persona: string): LlmProposal {
  const first = nightly(persona).candidates[0];
  return { hypothesis: 'scripted repair: keep only the first candidate', decision: 'change', candidates: first ? [{ ...first, id: `${first.id}-alone` }] : [] };
}

const indicationField = (id: string) => comp(id, { field: { element: 'abxIndication', slot: 'current', prefill: 'none' } }, { tag: 'abxIndication' });

function migrate(persona: string, attempt: number): LlmProposal {
  const orders: Op[] = [
    op('add', '/screens/[id=w1-orders]/components/[id=w1-dup]', indicationField('w1-indication')),
    op('add', '/screens/[id=w3-orders]/components/[id=w3-dosecheck]', indicationField('w3-indication')),
    op('add', '/screens/[id=w5-dosing]/components/[id=w5-dosecheck]', indicationField('w5-indication')),
    op('add', '/screens/[id=w6-preop]/components/[id=w6-idreentry]', indicationField('w6-indication')),
  ];
  const marPanel = comp('w4-indication', { panel: { info: 'abxIndication' } }, { tag: 'abxIndication' });
  if (persona === 'P5') {
    return { hypothesis: 'scripted: a patch that never applies (forces the fallback)', decision: 'change', candidates: [cand(`p5-mig-${attempt}`, 'migrate', 'R2-1: broken', [op('remove', '/screens/[id=missing]')])] };
  }
  if (persona === 'P3' && attempt === 1) {
    return {
      hypothesis: 'R2-3: indication in a Details drawer on the MAR panel', decision: 'change', candidates: [cand('p3-mig-drawer', 'migrate', 'R2-3: indication in a collapsed Details drawer; R2-1 fields', [
        ...orders,
        op('add', '/screens/[id=w4-mar]/components/[id=w4-hi-group]', comp('w4-details', { group: { collapsible: true, startCollapsed: true } }, { label: 'Details' })),
        op('add', '/screens/[id=w4-mar]/components/[id=w4-hi-group]', { ...marPanel, parent: 'w4-details' }),
      ])],
    };
  }
  return {
    hypothesis: `R2-1/R2-3 for ${persona}`, decision: 'change', candidates: [cand(`${persona.toLowerCase()}-mig`, 'migrate', 'R2-1: indication pickers; R2-3: indication row on the MAR', [
      ...orders, op('add', '/screens/[id=w4-mar]/components/[id=w4-hi-group]', marPanel),
    ])],
  };
}

function surface(persona: string): LlmProposal {
  if (persona === 'P1') {
    return { hypothesis: 'P1 orders imaging and specialty meds (R1.1-1)', decision: 'change', candidates: [cand('p1-priorauth', 'surfaceFeature', 'R1.1-1: prior-auth panel inline in the order composer', [
      op('add', '/screens/[id=w1-orders]/components/[id=w1-go-sign]', comp('w1-priorauth', { priorAuthStatus: { scope: 'imaging,specialtyMed' } }, { tag: 'priorAuthPanel' })),
    ], 0)] };
  }
  return { hypothesis: `${persona} does not place orders that need prior auth`, decision: 'noChange', candidates: [] };
}

function breakIt(): LlmProposal {
  return { hypothesis: 'This hides the allergy list on the sign screen; I expect the checker to reject it.', decision: 'change', candidates: [
    cand('hide-allergies', 'collapseOptional', 'Hide the allergy box on the sign screen', [op('replace', '/screens/[id=w1-sign]/components/[id=w1-sign-allergies]/size', 'tiny')], 20),
  ] };
}

export class ScriptedLlm implements JsonLlm {
  readonly name = 'scripted' as const;
  readonly model = 'scripted-test';
  readonly prompts: JsonRequest[] = [];

  async complete(req: JsonRequest): Promise<JsonResponse> {
    this.prompts.push(req);
    const persona = /(?:^|\/)(P\d)[/-]/.exec(req.callId)?.[1] ?? 'P1';
    const attempt = Number(/-(\d+)$/.exec(req.callId)?.[1] ?? '1');
    const json = req.purpose === 'choose' ? choose(req.prompt, persona)
      : req.purpose === 'repair' ? repair(persona)
        : req.purpose === 'migrate' ? migrate(persona, attempt)
          : req.purpose === 'surface' ? surface(persona)
            : req.purpose === 'break' ? breakIt()
              : nightly(persona);
    return { json, backend: 'scripted', model: this.model, servedBy: null, replayOf: null, promptMatched: null, usage: null };
  }
}
