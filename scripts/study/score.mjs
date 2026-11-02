/** Frozen model predictions conditional on human-reached states, with no human label in requests. */
import path from 'node:path';
import { LocalDecision, DeterministicDecision } from '../../explore/decision.ts';
import { PhysicianDecision, physicians } from '../../explore/cohort.ts';
import { sessions, choiceRows, distribution } from './analysis.mjs';
import { read, hash, arg, outputDir, writeNew } from './common.mjs';
export async function score(out, { endpoint, model, standIn = false } = {}) {
  const manifest=await read(path.join(out,'manifest.json')), data=await sessions(out);
  if (standIn && data.provenance!=='simulated-dry-run') throw Error('Stand-in scoring is restricted to dry runs');
  if (!standIn && (!endpoint || !model)) throw Error('Supply frozen --endpoint and --model, or --stand-in for simulated dry runs');
  const base=standIn ? new DeterministicDecision() : new LocalDecision(endpoint,model);
  const profiles=physicians(20261103), rows=[], exclusions=[];
  const cache=new Map();
  for (const row of choiceRows(data.included)) {
    const ids=row.input.options.map(o=>o.id);
    let reason=null;
    if (!row.label) reason='entries, offscreen, or unexposed actions';
    else if (ids.length<2) reason='forced/singleton or empty choice';
    else if (ids.length>10) reason='full offer set exceeds LocalDecision 10-option limit; never truncated';
    else if (!ids.includes(row.label)) throw Error('Human label absent from options');
    if (reason) { exclusions.push({key:row.key,participant:row.participant,design:row.design,reason}); continue; }
    const inputHash=hash(row.input);
    const cacheKey=hash({input:row.input,experience:row.position});
    if (!cache.has(cacheKey)) {
      const decisionModel=await base.choice(row.input);
      if (decisionModel.abstain) { exclusions.push({key:row.key,reason:'model abstained'}); continue; }
      distribution(ids,decisionModel.probabilities);
      // Fixed profile mixture, same exposed actions and state. No goal oracle or future human choice.
      const components=await Promise.all(profiles.map(async profile=>{
        const policy=new PhysicianDecision({choice:async()=>decisionModel,screen:request=>base.screen(request)},profile);
        policy.experience=row.position;
        return policy.choice(row.input);
      }));
      const probabilities=Object.fromEntries(ids.map(id=>[id,components.reduce((n,p)=>n+p.probabilities[id],0)/components.length]));
      distribution(ids,probabilities);
      cache.set(cacheKey,{ decisionModel, simulator:{probabilities,abstain:false,model:`${decisionModel.model}+frozen-24-profile-mixture`} });
    }
    rows.push({key:row.key,inputHash,...cache.get(cacheKey)});
  }
  const result={schemaVersion:1,manifestHash:manifest.manifestHash,provenance:standIn?'uniform stand-in and seeded behavior adapter; pipeline test only':'frozen local decision model and seeded simulator profile mixture',
    model:standIn?'uniform-stand-in':model,endpoint:endpoint??null,profiles,seed:20261103,
    policy:'All exposed enabled button offers, never conditioned on future human actions. New observation adapter; not the round-two goal oracle. Experience is completed block position.',rows,exclusions};
  await writeNew(path.join(out,'predictions.json'),result); return result;
}
if (process.argv[1]===import.meta.filename) {
  const result=await score(outputDir(arg('out')),{endpoint:arg('endpoint'),model:arg('model'),standIn:process.argv.includes('--stand-in')});
  console.log(JSON.stringify({scored:result.rows.length,excluded:result.exclusions.length,provenance:result.provenance}));
}
