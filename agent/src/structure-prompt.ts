import { formatProgram, type PromptParts } from './prompts.js';
import type { Program } from './schema.js';
import type { Hotspot } from './hotspots.js';

/** Lossless columnar projection removes repeated field names, not capabilities.
 * Include future optional keys in extras so structural vocabulary can grow. */
export function compactProgram(p:Program):string {
  const keys=['id','kind','label','parent','tab','visibility','size','hotkey','tag','copyOf'];
  return 'Component rows use columns '+JSON.stringify(keys)+', then an extras object. null = absent optional key. Screen/component order is unchanged. Patch the original object keys using id/tag selectors.\n'+JSON.stringify({
    ...p,screens:p.screens.map(s=>({...s,components:s.components.map(c=>[
      ...keys.map(k=>Object.fromEntries(Object.entries(c))[k]??null),Object.fromEntries(Object.entries(c).filter(([k])=>!keys.includes(k))),
    ])})),
  });
}
export function structurePrompt(parts:PromptParts,program:Program,hotspots:readonly Hotspot[],minimumEffect:number):PromptParts {
  return {...parts,portfolio:true,prompt:parts.prompt.replace(formatProgram(program),compactProgram(program))+
    '\n\n## Ranked effort hotspots (deterministic, train only)\n'+JSON.stringify(hotspots)+
    '\n\n## Structural exploration portfolio\nReturn three independent candidates against the CURRENT program: one small, one medium, one radical. Each must include portfolio {scale, hotspotId}, naming an exact hotspot id above, and predicted daily physical savings. Small = local change; medium = a coordinated section redesign; radical = merge/split screens, move a section across screens or containers, inline a navigation target, or add a new component. A density/shortcut-only edit is not radical. Use today\'s Program kinds; do not invent unsupported kinds. Evaluate the reachable workflow and required information, not just padding. Do not repeat a failed idea without naming changed evidence.\n'+
    `The loop evaluates EVERY candidate and chooses the largest measured daily click+scroll saving minus relearning cost. Net train saving must be at least ${minimumEffect} interactions/day and positive; the complete selected program must meet the same floor on validation, with the existing completion, stability and pixel nonregression gates. Novelty only ranks exploration; it never grants admission or release. No tools are available.`};
}
