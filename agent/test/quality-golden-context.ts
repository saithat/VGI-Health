import path from 'node:path';
import { llmRecordPath, llmRecordSchema } from '../src/backends/recording.js';
import { personaParamsSchema, specSchema, type DecisionRecord } from '../../app/src/dashboard/agent-evidence.js';
import { RunStore } from '../src/store.js';
import { REPO_ROOT, readJson } from '../src/util.js';
import { historyItem } from '../src/run.js';
/** Specs as they stood when runs/core-10day was archived (releases/<v>/spec.json at 66d2b2bf^, before the
 * wave-3 imagingPriority element), pinned as test fixtures so archived-night prompts do not follow later releases. */
export const ARCHIVED_SPECS=path.join(import.meta.dirname,'fixtures/archived-specs');
export async function goldenContext(record:DecisionRecord,records:readonly DecisionRecord[],specs:'archived'|'current'='archived') {
  const source=path.join(REPO_ROOT,'runs/core-10day');
  const llm=await readJson(llmRecordPath(source,`night-${String(record.night).padStart(2,'0')}/${record.persona}/propose-0`),llmRecordSchema);
  const params=personaParamsSchema.parse(JSON.parse(llm.prompt.split('## Persona behavior parameters\n')[1]?.split('\n')[0]??'null'));
  const program=await new RunStore(source).readProgram(record.persona,record.versionBefore);
  const spec=await readJson(specs==='archived'?path.join(ARCHIVED_SPECS,`${record.specVersion}.json`):path.join(REPO_ROOT,'releases',record.specVersion,'spec.json'),specSchema);
  const context={night:record.night,persona:{id:record.persona,userId:record.owner,params},program,spec,evidence:record.evidence,
    history:records.filter(r=>r.persona===record.persona&&r.night<record.night).map(historyItem)};
  return {nightly:context,choose:{...context,stabilityBudget:spec.design.stabilityBudget,hypothesis:record.hypothesis,candidates:record.candidates},
    repair:{...context,attempt:1,maxAttempts:3,failedSummaries:record.candidates.map(e=>({id:e.candidate.id,summary:e.candidate.summary,moveType:e.candidate.moveType})),failedPatch:record.candidates[0]?.candidate.patch??[],check:record.candidates[0]?.check??{status:'pass' as const,property:null,message:null,counterexample:null,screens:null,verdict:'ok' as const}}};
}
