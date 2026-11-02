import type { JsonLlm } from '../agent/src/backends/types.js';
import { programSchema, jsonPatchOpSchema } from '../agent/src/schema.js';
import { applyPatch } from '../agent/src/jsonpatch.js';
import { bindTasks } from './bindings.js';
import { parsePoint, dimensions } from './design.js';
import { generate, type Candidate } from './generator.js';
import { taskContract } from './tasks.js';
import type { Program, Spec } from '../agent/src/schema.js';
const properties=Object.fromEntries(Object.entries(dimensions).map(([k,v])=>[k,{type:'string',enum:v}]));
export class LlmOperator {
  calls=0;
  constructor(readonly llm:JsonLlm, readonly limit:number) {
    if(!Number.isInteger(limit)||limit<0||limit>60)throw Error('LLM budget must be 0–60');
  }
  async propose(seed:Candidate, baseline:Program, spec:Spec, feedback:unknown, targetNiche=false):Promise<{candidate:Candidate;record:unknown}> {
    if(this.calls>=this.limit)throw Error('LLM budget exhausted');
    this.calls++;
    const request={callId:`explore/${this.calls}`,purpose:'design-point-and-program-mutation',
      system:'You design EHR interaction paradigms. Preserve all clinical rules, human actions, source identities and program metadata. Do not use tools. Explore distinct designs within the requested layout niche. A design alone is compiled; optional JSON patches mutate the compiled program, without a small patch-count budget. The immutable identity movement budget still applies. Return JSON only.',
      prompt:JSON.stringify({point:seed.point,workflows:seed.workflows,program:seed.program,feedback,
        constraints:{identityMovementBudget:spec.design.stabilityBudget,maxDepth:spec.design.maxDepth,taskContract:taskContract(spec,baseline,seed.workflows)},
        instruction:(targetNiche?'Fill the requested layout/navigation/tier niche. ':'Mutate the design dimensions as well as the program; target unoccupied niches. Unsupported primitives require sandbox tier. ')+ 'Propose the point plus an optional patchJson (JSON-encoded RFC6902 patch array) or programJson (JSON-encoded complete replacement Program). Use empty strings for no change. Keep dimensions within their typed vocabulary. Explain a concrete design hypothesis; leave spec/clinical values unchanged.'}),
      schemaName:'exploration_candidate',schema:{type:'object',additionalProperties:false,required:['point','patchJson','programJson','hypothesis'],properties:{
        point:{type:'object',additionalProperties:false,required:[...Object.keys(properties),'tier','taskLayouts'],properties:{...properties,tier:{type:'string',enum:['proved','checked','sandbox']},taskLayouts:{type:'object',additionalProperties:false,properties:{},required:[]}}},
        patchJson:{type:'string'},programJson:{type:'string'},hypothesis:{type:'string'}}}};
    const response=await this.llm.complete(request);
    const v=response.json as {point:unknown;patchJson:string;programJson:string;hypothesis:string};
    const candidate=generate(parsePoint(v.point),seed.workflows,baseline,spec);
    if(v.patchJson && v.programJson)throw Error('Choose patch or full program, not both');
    if(v.programJson)candidate.program=programSchema.parse(JSON.parse(v.programJson));
    if(v.patchJson){const ops=(JSON.parse(v.patchJson) as unknown[]).map(x=>jsonPatchOpSchema.parse(x));candidate.program=programSchema.parse(applyPatch(candidate.program,ops).doc);}
    candidate.taskMapping=bindTasks(candidate.program,candidate.workflows,candidate.point);
    return {candidate,record:{request,response,hypothesis:v.hypothesis}};
  }
}
