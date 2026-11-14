/** Read-only R1 counterfactual on recorded validation metrics, not a new simulation. */
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { completionOk, improved, interactionAcceptable, INTERACTION_KEYS, INTERACTION_TOLERANCE } from './night.js';
import { decisionRecordSchema, type ReplayDay } from './schema.js';

export function interactionRefusals(replay: ReplayDay | null): string[] {
  if (!replay) return ['missing validation replay'];
  const reasons: string[] = completionOk(replay) ? [] : ['full task completion required'];
  for (const key of INTERACTION_KEYS) {
    const before = replay.before[key], after = replay.after[key];
    const slack = key === 'mouseTravelPx' || key === 'scrollPx' ? 1 : 0;
    if (typeof before !== 'number' || typeof after !== 'number' || !Number.isFinite(before) || !Number.isFinite(after)) {
      reasons.push(`${key}: unavailable or nonfinite`);
    } else if (after > before * (1 + INTERACTION_TOLERANCE[key] / 100) + slack) {
      reasons.push(`${key}: ${before} → ${after} exceeds ${INTERACTION_TOLERANCE[key]}%${slack ? ' + 1px' : ''}`);
    }
  }
  return reasons;
}

export async function replayInteractionGate(runDir: string) {
  const decisions = [];
  const hash = createHash('sha256');
  const root = path.join(runDir, 'decisions');
  for (const night of (await readdir(root)).filter(n => /^night-\d+$/.test(n)).sort()) {
    for (const file of (await readdir(path.join(root, night))).filter(f => f.endsWith('.json')).sort()) {
      const bytes = await readFile(path.join(root, night, file));
      hash.update(`${night}/${file}\0`).update(bytes);
      const record = decisionRecordSchema.parse(JSON.parse(bytes.toString()));
      const replay = record.validation.replay;
      const reasons = interactionRefusals(replay);
      if (replay && interactionAcceptable(replay) !== (reasons.length === 0)) throw Error('Gate/reason disagreement');
      // Mandatory vendor recertification/migration requires completion only;
      // optional surfaced features use interactionAcceptable, nightly changes improved.
      const discretionary = record.mode === 'nightly';
      const surfaced = record.outcome === 'surfaced';
      if (discretionary && replay && reasons.length === 0 && !improved(replay)) reasons.push('no strict physical interaction improvement');
      const refused = discretionary || surfaced ? reasons.length > 0 : !completionOk(replay);
      decisions.push({ night: record.night, persona: record.persona, mode: record.mode, outcome: record.outcome,
        shipped: record.deployed !== null, version: record.versionAfter,
        refused, reasons: refused ? (discretionary || surfaced ? reasons : ['full task completion required']) : [],
        fullCostRefusals: interactionRefusals(replay) });
    }
  }
  return { scope: 'Independent replay of each recorded decision; frozen validation metrics and actual release path. No resimulation, cascading alternate history, model calls or recording writes.',
    decisionSha256: hash.digest('hex'), decisions };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const runDir = process.argv[2];
  if (!runDir) throw Error('Usage: tsx src/replay-interaction-gate.ts <run-directory>');
  console.log(JSON.stringify(await replayInteractionGate(path.resolve(runDir)), null, 2));
}
