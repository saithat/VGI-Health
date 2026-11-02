import { features, type DesignPoint } from './design.js';
export interface VisibleOption { id: string; label: string; event: unknown; }
export interface ChoiceRequest { state: unknown; options: VisibleOption[]; }
export interface Distribution { probabilities: Record<string, number>; abstain: boolean; model: string; }
export interface ScreenRequest { point: DesignPoint; programFeatures: number[]; context: unknown; }
export interface DecisionModel {
  choice(input: ChoiceRequest): Promise<Distribution>;
  screen(input: ScreenRequest): Promise<{ pass: number; improvement: number; model: string }>;
}
export function validateDistribution(ids: string[], values: Record<string, number>): Record<string, number> {
  if (!ids.length || new Set(ids).size !== ids.length || Object.keys(values).length !== ids.length ||
    ids.some(id => !Number.isFinite(values[id]) || values[id]! < 0) ||
    Math.abs(ids.reduce((n,id)=>n+values[id]!,0)-1)>1e-5) throw Error('Invalid decision distribution');
  return values;
}
/** Uniform, deterministic probabilities; an explicit baseline, never a clinical policy. */
export class DeterministicDecision implements DecisionModel {
  async choice(i: ChoiceRequest): Promise<Distribution> {
    const p = Object.fromEntries(i.options.map(o=>[o.id,1/i.options.length]));
    return {probabilities:validateDistribution(i.options.map(o=>o.id),p),abstain:false,model:'uniform-stand-in'};
  }
  async screen(_i: ScreenRequest) { return {pass:0.5,improvement:0.5,model:'constant-stand-in'}; }
}
export class LocalDecision implements DecisionModel {
  constructor(readonly endpoint: string, readonly model: string, readonly protocol: 'distribution'|'token-logprobs' = 'distribution') {
    const url = new URL(endpoint);
    if (!['127.0.0.1','localhost','[::1]'].includes(url.hostname)) throw Error('Local decision endpoint must be loopback');
  }
  async choice(i: ChoiceRequest): Promise<Distribution> {
    if (!i.options.length || i.options.length>10) throw Error('Local Choice supports 1–10 visible options');
    const labels=i.options.map((_,n)=>String(n));
    const prompt=`State: ${JSON.stringify(i.state)}\nChoose the next action among visible options. Return its digit only.\n${i.options.map((o,n)=>`${n}: ${o.label} (${JSON.stringify(o.event)})`).join('\n')}`;
    const response=await fetch(`${this.endpoint.replace(/\/$/,'')}/chat/completions`, {
      method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(120_000),
      body:JSON.stringify({model:this.model,messages:[{role:'user',content:prompt}],max_tokens:1,temperature:1,
        ...(this.protocol==='distribution'?{decision_options:labels}:{logprobs:true,top_logprobs:20,structured_outputs:{choice:labels}})}) });
    if(!response.ok) throw Error(`Decision HTTP ${response.status}: ${(await response.text()).slice(0,300)}`);
    const body=await response.json() as {decision_probabilities?:Record<string,number>; abstain?:boolean;
      choices?:{logprobs?:{content?:{top_logprobs:{token:string;logprob:number}[]}[]}}[]};
    let values=body.decision_probabilities;
    if(this.protocol==='token-logprobs') {
      const top=body.choices?.[0]?.logprobs?.content?.[0]?.top_logprobs;
      if(!top || labels.some(l=>!top.some(t=>t.token===l))) throw Error('Endpoint omitted choice logprobs; refusing invented probabilities');
      const logits=labels.map(l=>top.find(t=>t.token===l)!.logprob), max=Math.max(...logits);
      const weights=logits.map(x=>Math.exp(x-max)),sum=weights.reduce((a,b)=>a+b,0);
      values=Object.fromEntries(labels.map((l,n)=>[l,weights[n]!/sum]));
    }
    validateDistribution(labels,values??{});
    return {probabilities:validateDistribution(i.options.map(o=>o.id),Object.fromEntries(i.options.map((o,n)=>[o.id,values![String(n)]!]))),
      abstain:body.abstain??false,model:this.model};
  }
  async screen(i: ScreenRequest) {
    const score=async(question:string)=>(await this.choice({state:{...i,question},options:[
      {id:'yes',label:question,event:null},{id:'no',label:`Does not satisfy: ${question}`,event:null}]})).probabilities['yes']!;
    return {pass:await score('The candidate will pass the Lean checker'),improvement:await score('The candidate will improve completed-task effort'),model:this.model};
  }
}
/** TabPFN uses design features, never program/spec authority. Local Python process owns weights. */
export class TabPFNScreen extends DeterministicDecision {
  constructor(readonly endpoint: string) { super();
    if(!['localhost','127.0.0.1','[::1]'].includes(new URL(endpoint).hostname)) throw Error('TabPFN endpoint must be loopback'); }
  override async screen(i: ScreenRequest) {
    const r=await fetch(`${this.endpoint}/screen`,{method:'POST',headers:{'Content-Type':'application/json'},
      signal:AbortSignal.timeout(120_000),body:JSON.stringify({features:[...features(i.point),...i.programFeatures]})});
    if(!r.ok)throw Error(`TabPFN HTTP ${r.status}`);
    const v=await r.json() as {pass:number;improvement:number};
    if([v.pass,v.improvement].some(x=>!Number.isFinite(x)||x<0||x>1))throw Error('Invalid TabPFN probability');
    return {...v,model:'TabPFN-v2-local'};
  }
}
/** Optional integration boundary only. No network call or key discovery. */
export class JevDecision implements DecisionModel {
  async choice(_i: ChoiceRequest): Promise<Distribution> { throw Error('TypeSafe Jev adapter unconfigured; no API key or request'); }
  async screen(_i: ScreenRequest): Promise<{pass:number;improvement:number;model:string}> { throw Error('TypeSafe Jev adapter unconfigured; no API request'); }
}
