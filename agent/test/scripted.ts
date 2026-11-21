/**
 * TEST-ONLY scripted backend: canned LLM answers against the FAKE canonical
 * program, keyed by purpose and persona. Tests run it once through the
 * recorder, then replay the recordings with the real replay backend.
 */
import type { JsonLlm, JsonRequest, JsonResponse } from '../src/backends/types.js';
import type { LlmCandidate, LlmProposal } from '../src/schema.js';

type Op = LlmCandidate['patch'][number];
const op = (o: 'add' | 'remove' | 'replace', path: string, value?: unknown): Op => ({ op: o, path, from: '', valueJson: value === undefined ? '' : JSON.stringify(value) });
const comp = (id: string, kind: unknown, extra: Record<string, unknown> = {}) => ({
  id, kind, label: id, parent: null, tab: 0, visibility: 'always', size: 'normal', hotkey: null, tag: id, copyOf: null, ...extra,
});
const cand = (id: string, moveType: LlmCandidate['moveType'], summary: string, patch: Op[], klm = 60): LlmCandidate => ({
  id, summary, moveType, rationale: `scripted: ${summary}`, targets: [], patch, predicted: { clicks: 3, keystrokes: 6, scrolls: 0, klmDeciSec: klm },
});

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
      op('add', '/screens/[id=w1-orders]/components/[id=w1-go-sign]', comp('w1-priorauth', { priorAuth: { info: 'priorAuthStatus' } }, { tag: 'priorAuthPanel' })),
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
    let json: LlmProposal;
    switch (req.purpose) {
      case 'migrate': json = migrate(persona, attempt); break;
      case 'surface': json = surface(persona); break;
      case 'break': json = breakIt(); break;
      default: throw Error(`Unexpected scripted model request: ${req.purpose}`);
    }
    return { json, backend: 'scripted', model: this.model, servedBy: null, replayOf: null, promptMatched: null, usage: null };
  }
}
