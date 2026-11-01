/**
 * Release-night modes and the live "try to break it" mode.
 *
 * - surface-feature (BRIEF 9b, v2 before Day 4): every program still
 *   conforms; per persona, decide from that persona's train traces whether
 *   and where to surface the new optional feature.
 * - migrate (BRIEF 9a, v3 before Day 7): re-check against the new spec; if it
 *   fails, ask for the minimal patch that keeps the customizations (<= 3
 *   attempts with counterexamples); else fall back to the new canonical plus
 *   the customizations that still pass, and flag the user. Nothing
 *   uncertified is ever deployed (T4).
 * - try-to-break-it: implement a free-text request as one candidate, check
 *   it, and return the verdict and counterexample. Never deploys.
 */
import type { Proposal } from './agent.js';
import { summarizeTrain } from './observe.js';
import { componentById, personalize } from './program.js';
import { breakPrompt, migratePrompt, surfacePrompt, type PersonaView } from './prompts.js';
import { specDiff, type Release } from './releases.js';
import type { CheckResult, Component, DecisionRecord, EvaluatedCandidate, LlmCallRef, Program, TrainSummary } from './schema.js';
import {
  InfrastructureError, MAX_REPAIRS, completionOk, interactionAcceptable, TrainEstimator, backendInfo, callId, checkPatch, deployVersion, emptyRecord, evaluateCandidate, improved,
  noteRejections, predictionVerdict, recordDeploy, sumSavings, toCheckResult, userResponse, type Gate, type LoopDeps, type NightInput, type NightResult,
} from './night.js';
import { errorMessage, hash32, writeJson } from './util.js';
import path from 'node:path';

export interface ReleaseNightInput extends NightInput {
  /** The release taking effect at the next login (NightInput.release is the one in force today). */
  next: Release;
}

/** Components present (or changed) in the new canonical program relative to the old one. */
export function vendorChanges(oldCanon: Program, newCanon: Program): { screen: string; component: Component }[] {
  const old = componentById(oldCanon);
  return newCanon.screens.flatMap((s) => s.components.flatMap((c) => {
    const prev = old.get(c.id);
    return !prev || JSON.stringify(prev.component) !== JSON.stringify(c) ? [{ screen: s.id, component: c }] : [];
  }));
}

function releaseItems(text: string): string[] {
  return [...new Set(text.match(/R\d+(?:\.\d+)?-\d+/g) ?? [])];
}

async function recheck(deps: LoopDeps, input: ReleaseNightInput): Promise<{ program: Program; check: CheckResult; gate: Gate }> {
  const gate: Gate = { specVersion: input.next.specVersion, prev: input.current, canonical: input.next.canonical, nextVersion: input.current.version + 1, night: input.night };
  const { program, check } = await checkPatch(deps.ehr, input.current, [], gate);
  if (!program) throw new Error('recheck: could not restamp the current program');
  return { program, check, gate };
}

function startRecord(deps: LoopDeps, input: ReleaseNightInput, mode: DecisionRecord['mode'], evidence: TrainSummary, check: CheckResult): DecisionRecord {
  const rec = emptyRecord(deps, { night: input.night, persona: input.persona, specVersion: input.next.specVersion, current: input.current, spec: input.next.spec }, evidence);
  rec.mode = mode;
  rec.release = {
    id: input.next.id, specVersion: input.next.specVersion, recheck: check, items: [], surfaced: null,
    customizationsKept: [], customizationsDropped: [], fallback: false, flaggedUser: false,
  };
  return rec;
}

async function finishRecord(deps: LoopDeps, rec: DecisionRecord, calls: LlmCallRef[], deployed: Program | null): Promise<NightResult> {
  rec.flags.push(...noteRejections(deps.seedState, rec.candidates));
  rec.llmCalls = calls;
  rec.backend = backendInfo(deps.agent, calls);
  await deps.store.writeDecision(rec);
  return { record: rec, deployed };
}

async function deployInto(deps: LoopDeps, rec: DecisionRecord, persona: string, program: Program, gate: Gate): Promise<boolean> {
  const dep = await deployVersion(deps, persona, program, { ...gate, validation:rec.validation.replay });
  recordDeploy(rec, dep, { candidateIds: rec.chosen?.candidateIds ?? [], patch: [] });
  if (dep.ok) rec.versionAfter = program.version;
  return dep.ok;
}

/** Outcome when deployInto returned false: a screen-check failure is distinguished from a refused deploy. */
const failOutcome = (rec: DecisionRecord): DecisionRecord['outcome'] => (rec.screenCheck?.status === 'error' ? 'error' : rec.screenCheck?.status === 'fail' ? 'screen-check-failed' : 'certification-failed');

// ---------------------------------------------------------------- surface-feature (v2)
export async function runSurfaceFeature(deps: LoopDeps, input: ReleaseNightInput): Promise<NightResult> {
  const { night, persona, next } = input;
  const evidence = summarizeTrain(persona.id, input.current, input.train, input.programs);
  const re = await recheck(deps, input);
  const rec = startRecord(deps, input, 'surface-feature', evidence, re.check);
  const calls: LlmCallRef[] = [];
  if (re.check.status !== 'pass') {
    // An optional feature should never break conformance; if it does, migrate instead.
    rec.flags.push('current program unexpectedly fails the feature release spec; running migration');
    return runMigration(deps, input);
  }
  const recertify = async (reason: string): Promise<NightResult> => {
    rec.certification = { attempts: [{ attempt: 0, candidateIds: [], source: 'recertify', patch: [], check: re.check }], result: 'certified' };
    rec.validation.reason = reason;
    const baseline = personalize(next.canonical, persona.params, persona.userId);
    const replay = await input.holdout.validate(baseline, re.program, next.specVersion);
    if (!completionOk(replay)) return runMigration(deps, input);
    rec.validation = { replay, improved: false, stabilityOk: true, accepted: true, reason };
    rec.measured.validation = replay;
    const ok = await deployInto(deps, rec, persona.id, re.program, re.gate);
    if (!ok) return runMigration(deps, input);
    rec.outcome = rec.flags.some((f) => f.startsWith('llm-error')) ? 'llm-error' : ok ? 'not-surfaced' : failOutcome(rec);
    return finishRecord(deps, rec, calls, ok ? re.program : null);
  };

  let proposal: Proposal;
  try {
    proposal = await deps.agent.proposeCandidates({
      callId: callId(night, persona.id, 'surface-0'), purpose: 'surface', source: 'llm',
      parts: surfacePrompt({
        night, persona, spec: next.spec, program: input.current, releaseId: next.id, notes: next.notes,
        specDiff: specDiff(input.release.spec, next.spec), newKindExamples: vendorChanges(input.release.canonical, next.canonical),
        evidence, history: input.history,
      }),
    });
  } catch (e) {
    rec.flags.push(`llm-error: ${errorMessage(e)}`);
    rec.hypothesis = '(no decision: the LLM call failed; program recertified unchanged)';
    if (rec.release) rec.release.surfaced = false;
    return recertify('LLM call failed');
  }
  calls.push(proposal.call);
  rec.hypothesis = proposal.hypothesis;
  if (rec.release) rec.release.items = releaseItems(`${next.notes}`).filter((i) => proposal.hypothesis.includes(i) || proposal.candidates.some((c) => `${c.summary} ${c.rationale}`.includes(i)));
  if (proposal.decision === 'noChange' || proposal.candidates.length === 0) {
    if (rec.release) rec.release.surfaced = false;
    rec.chosen = { candidateIds: [], rationale: proposal.hypothesis, rejectedAlternatives: [], choiceBy: 'llm' };
    return recertify('agent decided not to surface the feature for this user');
  }

  const gate = re.gate;
  const estimator = new TrainEstimator(deps, input, next.specVersion);
  for (const c of proposal.candidates) rec.candidates.push(await evaluateCandidate(deps, input.current, c, gate, estimator));
  const best = rec.candidates.find((e) => e.check.status === 'pass');
  if (!best) {
    if (rec.release) rec.release.surfaced = false;
    rec.flags.push('no surfacing candidate passed the checker');
    return recertify('no surfacing candidate passed the checker');
  }
  rec.chosen = {
    candidateIds: [best.candidate.id], rationale: `${proposal.hypothesis} (first passing candidate in the agent's ranked list)`,
    rejectedAlternatives: rec.candidates.filter((e) => e !== best).map((e) => ({ id: e.candidate.id, reason: e.check.status === 'pass' ? 'ranked lower by the agent' : `checker: ${e.check.property ?? e.check.status}` })),
    choiceBy: 'llm',
  };
  rec.predicted = sumSavings([best.candidate]);
  const certified = await checkPatch(deps.ehr, input.current, best.candidate.patch, gate);
  rec.certification = { attempts: [{ attempt: 0, candidateIds: [best.candidate.id], source: 'merged', patch: best.candidate.patch, check: certified.check }], result: certified.check.status === 'pass' ? 'certified' : 'rejected' };
  if (!certified.program || certified.check.status !== 'pass') return recertify('chosen candidate failed certification');

  const replay = await input.holdout.validate(personalize(next.canonical, persona.params, persona.userId), certified.program, next.specVersion);
  rec.validation.replay = replay;
  rec.measured.validation = replay;
  const pv = predictionVerdict(rec.predicted, replay);
  rec.measured.predictionHeld = pv.held;
  rec.measured.predictionNote = pv.note;
  // Vendor surfacing preserves completion and the physical-interaction tolerances.
  const tolerable = replay ? interactionAcceptable(replay) : false;
  rec.validation.improved = replay ? improved(replay) : null;
  rec.validation.stabilityOk = true;
  if (!tolerable) {
    if (rec.release) rec.release.surfaced = false;
    return recertify('validation replay: interaction regression or missing geometry');
  }
  rec.validation.accepted = true;
  rec.validation.reason = 'validation replay within count/pixel tolerances with full completion';
  rec.userResponse = userResponse(deps, night, persona.id, best.componentsMoved ?? 0);
  if (rec.userResponse.response === 'reverted') {
    if (rec.release) rec.release.surfaced = false;
    const out = await recertify('simulated user reverted the surfaced feature');
    out.record.outcome = 'user-reverted';
    await deps.store.writeDecision(out.record);
    return out;
  }
  const ok = await deployInto(deps, rec, persona.id, certified.program, gate);
  if (!ok) return runMigration(deps, input);
  if (rec.release) rec.release.surfaced = ok;
  rec.outcome = ok ? 'surfaced' : failOutcome(rec);
  return finishRecord(deps, rec, calls, ok ? certified.program : null);
}

// ---------------------------------------------------------------- migrate (v3)
export async function runMigration(deps: LoopDeps, input: ReleaseNightInput): Promise<NightResult> {
  const { night, persona, next } = input;
  const evidence = summarizeTrain(persona.id, input.current, input.train, input.programs);
  const re = await recheck(deps, input);
  const rec = startRecord(deps, input, 'migrate', evidence, re.check);
  const calls: LlmCallRef[] = [];
  const customizations = input.history.filter((h) => h.patch.length > 0);
  const label = (h: (typeof customizations)[number]) => `night ${h.night}: ${h.chosen.map((c) => c.summary).join('; ')}`;
  rec.userResponse = { response: 'not-offered', probability: 0, reason: 'regulatory migration: the user cannot keep a non-conforming version' };

  const canon = { ...personalize(next.canonical, persona.params, persona.userId), id: input.current.id, version: input.current.version + 1, specVersion: next.specVersion };
  const fbGate: Gate = { specVersion: next.specVersion, prev: canon, canonical: next.canonical, nextVersion: canon.version, night };
  const finalize = async (program: Program, gate: Gate, outcome: DecisionRecord['outcome']): Promise<NightResult> => {
    let failure: unknown;
    try {
      const replay = await input.holdout.validate(canon, program, next.specVersion);
      rec.validation = { replay, improved: replay ? improved(replay) : null, stabilityOk: true, accepted: completionOk(replay), reason: 'Release canonical comparison; full completion required on every deploy.' };
      rec.measured.validation = replay;
      if (!completionOk(replay)) throw new Error('release validation incomplete');
      if (!await deployInto(deps, rec, persona.id, program, gate)) throw new Error('release check/screen/deploy gate refused');
      rec.outcome = rec.flags.some((f) => f.startsWith('llm-error')) ? 'llm-error' : outcome;
      return finishRecord(deps, rec, calls, program);
    } catch (error) { failure = error; }
    if (outcome === 'migration-fallback') {
      rec.flags.push(`ABORT: certified canonical fallback failed: ${errorMessage(failure)}`);
      rec.outcome = rec.screenCheck?.status==='error'?'error':rec.flags.some(f=>f.startsWith('infrastructure-error'))?'infrastructure-error':'certification-failed';
      await finishRecord(deps, rec, calls, null);
      throw new InfrastructureError(`ABORT ${persona.id} ${next.id}: canonical fallback failed: ${errorMessage(failure)}`);
    }
    rec.flags.push(`Release deployment failed; falling back to certified persona canonical: ${errorMessage(failure)}`);
    if (rec.release) { rec.release.fallback = true; rec.release.flaggedUser = true; }
    return finalize(canon, fbGate, 'migration-fallback');
  };

  if (re.check.status === 'pass') {
    rec.hypothesis = `The current program already conforms to ${next.specVersion}; recertified unchanged.`;
    rec.certification = { attempts: [{ attempt: 0, candidateIds: [], source: 'recertify', patch: [], check: re.check }], result: 'certified' };
    if (rec.release) rec.release.customizationsKept = customizations.map(label);
    return finalize(re.program, re.gate, 'recertified');
  }

  // Minimal-patch migration with counterexample feedback.
  const previousFailures: { id: string; check: CheckResult }[] = [];
  for (let attempt = 1; attempt <= MAX_REPAIRS; attempt++) {
    let proposal: Proposal;
    try {
      proposal = await deps.agent.proposeCandidates({
        callId: callId(night, persona.id, `migrate-${attempt}`), purpose: 'migrate', source: 'llm',
        parts: migratePrompt({
          night, persona, spec: next.spec, program: input.current, releaseId: next.id, notes: next.notes,
          specDiff: specDiff(input.release.spec, next.spec), leanSpecSource: next.leanSpecSource,
          vendorChanges: vendorChanges(input.release.canonical, next.canonical), recheck: re.check, history: customizations,
          attempt, maxAttempts: MAX_REPAIRS, previousFailures,
        }),
      });
    } catch (e) {
      rec.flags.push(`llm-error (migrate ${attempt}): ${errorMessage(e)}`);
      break;
    }
    calls.push(proposal.call);
    if (!rec.hypothesis) rec.hypothesis = proposal.hypothesis;
    for (const c of proposal.candidates) {
      const ev: EvaluatedCandidate = await evaluateCandidate(deps, input.current, { ...c, id: `${c.id}@m${attempt}` }, re.gate, null);
      rec.candidates.push(ev);
      rec.certification.attempts.push({ attempt, candidateIds: [ev.candidate.id], source: 'migration', patch: ev.candidate.patch, check: ev.check });
      if (ev.check.status === 'pass') {
        const certified = await checkPatch(deps.ehr, input.current, ev.candidate.patch, re.gate);
        if (certified.program) {
          rec.certification.result = 'certified';
          rec.chosen = { candidateIds: [ev.candidate.id], rationale: proposal.hypothesis, rejectedAlternatives: [], choiceBy: 'llm' };
          rec.predicted = sumSavings([ev.candidate]);
          if (rec.release) {
            rec.release.items = releaseItems(`${proposal.hypothesis} ${ev.candidate.summary} ${ev.candidate.rationale}`);
            rec.release.customizationsKept = customizations.map(label);
          }
          return finalize(certified.program, re.gate, 'migrated');
        }
      }
      previousFailures.push({ id: ev.candidate.id, check: ev.check });
    }
  }

  // Fall back to the release's exact role canonical, never an unchecked customization.
  const finalCheck = toCheckResult(await deps.ehr.check({ specVersion: next.specVersion, program: canon, prev: canon, canonical: next.canonical }));
  rec.certification.attempts.push({ attempt: rec.certification.attempts.length, candidateIds: [], source: 'migration-fallback', patch: [], check: finalCheck });
  rec.certification.result = finalCheck.status === 'pass' ? 'certified' : 'rejected';
  if (rec.release) { rec.release.fallback = true; rec.release.flaggedUser = true; rec.release.customizationsDropped = customizations.map(label); }
  rec.flags.push(`user flagged: migration fell back to certified persona canonical ${next.id}`);
  return finalize(canon, fbGate, 'migration-fallback');
}

// ---------------------------------------------------------------- try-to-break-it
export interface BreakResult {
  request: string;
  persona: string;
  backend: DecisionRecord['backend'];
  hypothesis: string;
  candidate: EvaluatedCandidate | null;
  verdict: CheckResult;
  file: string;
}

export async function runTryToBreakIt(deps: LoopDeps, args: { persona: PersonaView; release: Release; program: Program; request: string }): Promise<BreakResult> {
  const id = `break/${args.persona.id}-${hash32(args.request).toString(16)}`;
  const gate: Gate = { specVersion: args.release.specVersion, prev: args.program, canonical: args.release.canonical, nextVersion: args.program.version + 1 };
  const proposal = await deps.agent.proposeCandidates({
    callId: id, purpose: 'break', source: 'user-request',
    parts: breakPrompt({ persona: args.persona, spec: args.release.spec, program: args.program, request: args.request }),
  });
  const first = proposal.candidates[0];
  const evaluated = first ? await evaluateCandidate(deps, args.program, first, gate, null) : null;
  const verdict: CheckResult = evaluated?.check
    ?? { status: 'invalid-patch', property: null, message: proposal.undecodable[0]?.error ?? 'the agent returned no candidate', counterexample: null, screens: null, verdict: null };
  const result = {
    request: args.request,
    persona: args.persona.id,
    backend: backendInfo(deps.agent, [proposal.call]),
    hypothesis: proposal.hypothesis,
    candidate: evaluated,
    verdict,
    file: path.join(deps.store.dir, `${id}.json`),
  };
  await writeJson(result.file, { ...result, llmCall: proposal.call, ehr: { mode: deps.ehr.mode, binary: deps.ehr.binary }, createdAt: new Date().toISOString() });
  return result;
}
