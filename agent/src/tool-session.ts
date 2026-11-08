/** Decision-scoped capability/budget boundary, shared by every tool transport. */
import { z } from 'zod';
import { stableStringify } from './program.js';
import { validateReply } from './backends/openai-compat.js';

export const toolBudgetSchema=z.object({
  maxCalls:z.number().int().positive().max(200),maxChecks:z.number().int().nonnegative().max(50),
  maxEstimates:z.number().int().nonnegative().max(30),wallMs:z.number().int().positive().max(3_600_000),
  maxTokens:z.number().int().positive(),
});
export type ToolBudget=z.infer<typeof toolBudgetSchema>;
export const DEFAULT_TOOL_BUDGET:ToolBudget={maxCalls:60,maxChecks:12,maxEstimates:8,wallMs:900_000,maxTokens:120_000};
export interface ToolDefinition {name:string;description:string;inputSchema:Record<string,unknown>}
export const toolEventSchema=z.object({index:z.number(),tool:z.string(),arguments:z.unknown(),result:z.unknown(),resultBytes:z.number(),accounting:z.object({inputTokens:z.number(),outputTokens:z.number(),visibleBytes:z.number()})});
export type ToolEvent=z.infer<typeof toolEventSchema>;
export class ToolBudgetError extends Error {}
export class ToolSession {
  readonly events:ToolEvent[]=[];
  readonly complaints:string[]=[];
  readonly budget:ToolBudget;
  private start=Date.now();
  private checks=0;
  private estimates=0;
  private visibleBytes=0;
  private inputTokens=0;
  private outputTokens=0;
  private submission:unknown;
  private submitted=false;
  private exceeded:string|null=null;
  private tail:Promise<unknown>=Promise.resolve();
  constructor(readonly definitions:readonly ToolDefinition[],budget:ToolBudget,
    private readonly dispatch:(name:string,args:unknown)=>Promise<unknown>,
    private readonly persist?:(event:ToolEvent)=>Promise<void>) {this.budget=toolBudgetSchema.parse(budget);}
  beginLoop(){this.submitted=false;this.submission=undefined;}
  get remainingMs(){return Math.max(0,this.budget.wallMs-(Date.now()-this.start));}
  get remainingTokens(){return Math.max(0,this.budget.maxTokens-Math.max(this.visibleBytes,this.inputTokens+this.outputTokens));}
  get done(){return this.submitted;}
  get final(){if(!this.submitted)throw new Error('Tool loop ended without submit');this.assertBudget();return this.submission;}
  private fail(message:string):never{this.exceeded=message;throw new ToolBudgetError(message);}
  assertBudget(){
    if(this.exceeded)this.fail(this.exceeded);
    if(this.remainingMs===0)this.fail('wall time budget exhausted');
    if(this.remainingTokens===0)this.fail('token budget exhausted');
  }
  chargeVisible(text:string){this.visibleBytes+=Buffer.byteLength(text);this.assertBudget();}
  chargeUsage(input:number,output:number){this.inputTokens+=input;this.outputTokens+=output;this.assertBudget();}
  submit(value:unknown){if(this.submitted)throw new Error('Already submitted');this.submission=value;this.submitted=true;}
  /** Serialize parallel MCP calls before assigning indexes, enforcing quotas or dispatching. */
  execute(name:string,args:unknown):Promise<unknown>{
    const pending=this.tail.then(()=>this.invoke(name,args));this.tail=pending.catch(()=>undefined);return pending;
  }
  private async invoke(name:string,args:unknown):Promise<unknown>{
    const accounting={inputTokens:this.inputTokens,outputTokens:this.outputTokens,visibleBytes:this.visibleBytes};
    let result:unknown;
    try {
      this.assertBudget();
      if(this.submitted)throw new Error('Loop has ended; no calls after submit');
      if(this.events.length>=this.budget.maxCalls)this.fail('tool call budget exhausted');
      const def=this.definitions.find(t=>t.name===name);if(!def)throw new Error('Unknown tool');
      validateReply(def.inputSchema,args);
      if(name==='check_patch'&&++this.checks>this.budget.maxChecks)this.fail('check budget exhausted');
      if(name==='estimate_patch'&&++this.estimates>this.budget.maxEstimates)this.fail('estimate budget exhausted');
      this.chargeVisible(JSON.stringify(args));
      result=await this.dispatch(name,args);
    } catch(error) {result={error:error instanceof Error?error.message.replace(/\/(?:home|tmp|etc|usr|var|proc|run)\/[^\s"'<>]*/g,'[confined path]').slice(0,2000):'Tool failed'};}
    // Stable result bytes have no durations, clock, file paths or provider identifiers.
    const event={accounting,index:this.events.length,tool:name,arguments:structuredClone(args),result:structuredClone(result),resultBytes:Buffer.byteLength(JSON.stringify(result))};
    this.events.push(event);await this.persist?.(event);
    this.visibleBytes+=event.resultBytes;
    if(this.visibleBytes>=this.budget.maxTokens)this.exceeded='token budget exhausted';
    return structuredClone(result);
  }
  stats(){return {budget:this.budget,calls:this.events.length,checks:this.checks,estimates:this.estimates,
    wallMs:Date.now()-this.start,inputTokens:this.inputTokens,outputTokens:this.outputTokens,
    visibleTokenUpperBound:this.visibleBytes,exceeded:this.exceeded,
    tally:Object.fromEntries([...new Set(this.events.map(e=>e.tool))].map(name=>[name,this.events.filter(e=>e.tool===name).length])),
    complaints:[...new Set(this.complaints)]};}
  async replay(events:readonly ToolEvent[],requireSubmit=true){
    for(const event of events){
      this.inputTokens=event.accounting.inputTokens;this.outputTokens=event.accounting.outputTokens;this.visibleBytes=event.accounting.visibleBytes;
      const actual=await this.execute(event.tool,event.arguments);
      if(event.index!==this.events.length-1||stableStringify(actual)!==stableStringify(event.result)||Buffer.byteLength(JSON.stringify(actual))!==event.resultBytes)
        throw new Error(`Tool replay diverged at ${event.index}: ${event.tool}`);
    }
    return requireSubmit?this.final:undefined;
  }
  restoreAccounting(stats:{inputTokens:number;outputTokens:number;exceeded:string|null}){this.inputTokens=stats.inputTokens;this.outputTokens=stats.outputTokens;this.exceeded=stats.exceeded;}
}
