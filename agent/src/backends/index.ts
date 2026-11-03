import { ClaudeLlm } from './claude.js';
import { CodexLlm } from './codex.js';
import { ReplayLlm } from './replay.js';
import type { JsonLlm } from './types.js';

export type BackendChoice = 'claude' | 'codex' | 'replay';
export const BACKENDS: readonly BackendChoice[] = ['claude', 'codex', 'replay'];

export function createBackend(choice: BackendChoice, opts: { replayFrom?: string | undefined; replayAllowDrift?: boolean | undefined; model?: string | undefined; serviceTier?: string | undefined; reasoningEffort?: string | undefined } = {}): JsonLlm {
  switch (choice) {
    case 'claude': return new ClaudeLlm(opts.model ? { model: opts.model } : {});
    case 'codex': return new CodexLlm({ ...(opts.model ? { model: opts.model } : {}), ...(opts.serviceTier ? { serviceTier: opts.serviceTier } : {}), ...(opts.reasoningEffort ? { reasoningEffort: opts.reasoningEffort } : {}) });
    case 'replay':
      if (!opts.replayFrom) throw new Error('--backend replay needs --replay-from <runs/run-id>');
      return new ReplayLlm(opts.replayFrom, {allowDrift:opts.replayAllowDrift??false});
  }
}

export type { JsonLlm, JsonRequest, JsonResponse, BackendName } from './types.js';
