/** One harness loop for API tool calling. Codex delegates turns to its CLI but
 * dispatches the very same decision-scoped ToolSession over confined MCP. */
import type { JsonRequest } from './backends/types.js';
export interface ToolCall {id:string;name:string;arguments:unknown}
export interface ToolTurn {calls:ToolCall[];inputTokens:number;outputTokens:number;cachedInputTokens:number;servedBy:string;raw:unknown}
export async function runToolTurns(req:JsonRequest,exchange:(results:readonly {id:string;result:unknown}[])=>Promise<ToolTurn>){
  const session=req.toolSession;if(!session)throw new Error('Missing tool session');
  const eventStart=session.events.length;
  const turns:unknown[]=[];let results:{id:string;result:unknown}[]=[];
  let input=0,output=0,cached=0,servedBy:string|null=null;
  session.chargeVisible(req.system+req.prompt+JSON.stringify(session.definitions));
  while(!session.done){
    session.assertBudget();
    const turn=await exchange(results);turns.push(turn.raw);servedBy=turn.servedBy;
    session.chargeUsage(turn.inputTokens,turn.outputTokens);input+=turn.inputTokens;output+=turn.outputTokens;cached+=turn.cachedInputTokens;
    if(!turn.calls.length)throw new Error('Tool agent must end through submit');
    results=[];
    for(const call of turn.calls){
      if(session.done)throw new Error('Tool call after submit in same model turn');
      results.push({id:call.id,result:await session.execute(call.name,call.arguments)});
    }
  }
  return {json:session.final,servedBy,usage:{input_tokens:input,output_tokens:output,cached_input_tokens:cached},
    transcript:{turns,toolEvents:session.events.slice(eventStart),toolStats:session.stats()}};
}
