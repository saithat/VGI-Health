import { z } from "zod";
import { sha256, stableStringify } from "./program.js";
const inventorySchema = z.object({
  currentLayouts: z.json(),
  screens: z.array(
    z.object({
      screen: z.string(),
      shape: z.array(
        z.object({
          path: z.array(z.number().int().nonnegative()),
          target: z.boolean(),
          region: z.enum([
            "banner",
            "title",
            "body",
            "side",
            "footer",
            "modal",
            "urgent",
          ]),
          lines: z.number().int().nonnegative(),
        }),
      ),
      denseOutline: z.json().optional(),
      occurrences: z.array(
        z.object({ path: z.array(z.number()), ids: z.array(z.string()) }),
      ),
    }),
  ),
  limits: z.json(),
});
import type { PromptParts } from "./prompts.js";
export const LAYOUT_RULE_GUIDE = `## Layout rules and G1–G11
Layout rules are the only limits on geometry; existing clinical and release rules still govern Program behavior. Layout and Program changes are both in scope. Aim for fewer clicks and scrolls for this persona, with full completion. Simulated clinicians only; no browser certificate or clinical benefit is claimed.
Use moveType "layout" for a rules patch (mixed Program edits are allowed). /layouts is the separate sidecar array, never the Program Lean reads. Patch it with ordinary RFC 6902 operations, e.g. add /layouts/- valueJson={"screen":"orders","rules":[{"kind":"firstViewport","target":{"id":"search"}}]}. Each rule entry is {screen:screenId|"*", screens?:[screenIds], rules:[...]}; screens, if present, restricts the entry. Rules apply in array order to every native shape and all three viewports. Write once, without paths or literal trees. Targets select native occurrences by {id?:componentId,role?:nativeRole,kind?:nativeKind}, combined by AND. An unknown/absent target refuses that shape explicitly; use screen scopes suited to your traces. Safety/fixed sources require a literal tree.
firstViewport {target}: lift the selected occurrence subtree to the start of the body scroll, before navigation.
region {target,region:"body"|"side"}: put the subtree in the body or side column (158 px). Nested subtrees are lifted to that column.
columns {target,count,tracks?:positiveWeights[]}: lay out a group's visible child subtrees in rows of count columns; weights set relative track widths and must have count entries.
order {targets:[selectors]}: put selected sibling subtrees first in the requested order; keep other siblings afterward.
beside {target,anchor}: merge two disjoint subtrees into one two-column row, at the anchor.
pin {target}: move the subtree to a fixed row above the commit bar, reserving body space.
Rules transform the shared dense reference from layoutFor; cards retain all semantic flags and safety text. Every expanded family passes native family-check and family-paint at the unchanged vendor screen limit. Refused output retains checked reference geometry and returns findings to repair; a candidate with such findings cannot deploy. Nothing is silently dropped. Collapse/expand is a Program group edit because it changes semantics. A field's label and control are one native occurrence. Separate label/control placement would require a richer native occurrence model; no such change is made.
Literal cases remain supported: {screen,shape:[{path,target,region,lines}],layouts:[{viewport:{w,h},tree,components?}]}. Supply 92160×57600, 81920×51200, 122880×69120 in 1/64 px. Native inventory index below supplies representative paths; remove a rule entry before supplying a literal case for the same shape. Trees use the existing ui-layout Node language (Frame, Stack, Grid, Absolute, Scroll, Text, Button, components), integer/fill/hug sizes and exact source flags; all G rules apply. Request an ordinary Program change to reach an indexed unvisited screen; the index does not restrict exploration.
G1: one fixed visible patient banner, separated from all other paint.
G2: fixed contained interruptive marks stay above ordinary paint; modals block ordinary targets.
G3: active targets are at least 24×24 px and do not overlap.
G4: paint and scroll viewports are contained; text is at least 12 px, has valid metrics/capacity, is unobscured, and safety text preserves all content by vertical wrapping/scrolling.
G5: no horizontal overflow, including scroll content.
G6: text contrast at least 4.5:1; target and painted mark contrast at least 3:1.
G7: every expected semantic occurrence exactly once, unique IDs, no invented source paths or changed flags.
G8: document order follows top-to-bottom then left-to-right; scroll content and z layers have separate reading order.
G9: at 1440×900, exactly one fixed visible current-task commit target when present.
G10: active targets at zero and every scroll offset stay within that screen's vendor limit (15 if unmeasured); never raise limits.
G11: urgent boxes remain painted, fixed, contained, active during modals and separated from every other painted box.
Refusals include rule, node, metric, actual, required and deficit when supplied. Repair against the CURRENT design. Pixel metrics constrain validation; elapsed time is not a reward.`;

/** Lossless screen fragments: intern repeated components after replacing the
 * screen-local ID prefix. Defaults are explicitly declared in the transport. */
export function compactProgramScreens(screens: {id:string;title:string;workflow:string;components:unknown[]}[]) {
  const templates:unknown[]=[], index=new Map<string,number>();
  const normalize=(v:unknown,prefix:string):unknown=>{
    if(typeof v==='string' && v.startsWith(prefix+'.'))return {$screen:v.slice(prefix.length)};
    if(Array.isArray(v))return v.map(x=>normalize(x,prefix));
    if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,normalize(x,prefix)]));
    return v;
  };
  const rows=screens.map(screen=>({...screen,components:screen.components.map(component=>{
    const c=z.record(z.string(),z.unknown()).parse(component),fragment={...c};
    if(c['tab']===0)delete fragment['tab'];
    if(c['size']==='normal')delete fragment['size'];
    if(c['visibility']==='always')delete fragment['visibility'];
    if(c['tag']===c['id'])delete fragment['tag'];
    const value=normalize(fragment,screen.id),key=JSON.stringify(value);
    let i=index.get(key);if(i===undefined){i=templates.length;index.set(key,i);templates.push(value);}return i;
  })}));
  return {encoding:'screen-fragments-v1',defaults:{tab:0,size:'normal',visibility:'always',tag:'same as id'},localStrings:'An object {$screen:suffix} means current screen.id + suffix. Expand recursively before patching; component arrays contain template indexes.',templates,screens:rows};
}

/** Rebuild only the opt-in prompt. The browser builders and their bytes stay untouched. */
export function leanLayoutPrompt(parts: PromptParts, design: string, traces = '{}'): PromptParts {
  const section = (name:string) => {
    const marker='## '+name+'\n', start=parts.prompt.indexOf(marker);
    if(start<0)return '';
    const end=parts.prompt.indexOf('\n## ',start+marker.length);
    return parts.prompt.slice(start+marker.length,end<0?undefined:end).trim();
  };
  const jsonPrefix=(raw:string):unknown=>{
    let depth=0,quoted=false,escaped=false;
    for(let i=0;i<raw.length;i++) {
      const c=raw[i];
      if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;}
      else if(c==='"')quoted=true;
      else if(c==='{'||c==='[')depth++;
      else if(c==='}'||c===']'){depth--;if(depth===0)return JSON.parse(raw.slice(0,i+1));}
    }
    return JSON.parse(raw);
  };
  const inventory=z.record(z.string(),z.unknown()).parse(JSON.parse(design));
  const log=z.object({perScreen:z.array(z.object({screen:z.string()})).optional(),recentTrace:z.array(z.object({screen:z.string()})).optional(),targetFrequencies:z.array(z.object({events:z.array(z.unknown())})).optional()}).parse(JSON.parse(traces));
  const visited=new Set<string>();
  // Only committed odd-day training evidence can supply the scope.
  for(const row of (log.perScreen??[]))visited.add(row.screen);
  for(const row of (log.recentTrace??[]))visited.add(row.screen);
  for(const row of (log.targetFrequencies??[]))if(typeof row.events[0]==='string')visited.add(row.events[0]);
  const evidenceTitle=/^## (Evidence from this user's train days[^\n]*)/m.exec(parts.prompt)?.[1];
  const evidence=evidenceTitle?section(evidenceTitle):'';
  if(!visited.size && evidence) {
    for(const match of evidence.matchAll(/"screen":"([^"\n]+)"/g))visited.add(match[1]??'');
  }
  const programRaw=section('Current program');
  const program=programRaw?z.object({screens:z.array(z.object({id:z.string(),title:z.string(),workflow:z.string(),components:z.array(z.unknown())}).passthrough())}).passthrough().parse(jsonPrefix(programRaw)):undefined;
  const screens=program?.screens.filter(s=>visited.has(s.id))??[];
  const usedStrings=new Set<string>();
  const collect=(v:unknown):void=>{if(typeof v==='string')usedStrings.add(v);else if(Array.isArray(v))v.forEach(collect);else if(v&&typeof v==='object')Object.values(v).forEach(collect);};
  collect(screens);
  const specRaw=section('Hospital spec (exported from Lean)');
  const spec=specRaw?z.record(z.string(),z.unknown()).parse(JSON.parse(specRaw)):{};
  const relevantSpec=Object.fromEntries(Object.entries(spec).map(([k,v])=>[k,Array.isArray(v)?v.filter(row=>{
    if(Array.isArray(row))return row.some(x=>usedStrings.has(String(x))||screens.some(s=>s.workflow===x));
    if(row&&typeof row==='object')return Object.values(row).some(x=>typeof x==='string'&&usedStrings.has(x));
    return true;
  }):v]));
  const parsedInventory=inventorySchema.safeParse(inventory);
  const scopedInventory=parsedInventory.success?{...parsedInventory.data,screens:parsedInventory.data.screens.filter(s=>visited.has(s.screen))}:inventory;
  const designBlock=JSON.stringify({
    scope:[...visited].sort(),metadata:program?Object.fromEntries(['id','version','owner','role','specVersion','start'].map(k=>[k,program[k]])):{},program:compactProgramScreens(screens),
    macros:program?.['macros'],componentDefs:program?.['componentDefs'],presentationComponents:program?.['presentationComponents'],
    currentLayouts:inventory['currentLayouts']??[],
    denseLayouts:parsedInventory.success?[...new Set(screens.map(s=>s.id))].map(id=>{
      const shapes=parsedInventory.data.screens.filter(s=>s.screen===id);
      return {screen:id,shapeCount:shapes.length,outline:shapes.find(s=>s.denseOutline)?.denseOutline??{regions:[...new Set(shapes.flatMap(s=>s.shape.map(r=>r.region)))],note:'recorded inventory has no retained dense outline'},scope:'one representative dense outline; other shapes are independently transformed and checked'};
    }):[],
  });
  const operational=['Your previous decisions (outcomes only)','The change you chose','Its merged patch','Checker verdict on the merged program','Candidates after pre-screening','Release notes','Spec diff (exported specs, before -> after)','New Lean spec module',"The vendor's canonical change (components added or changed in the new canonical program)","Re-check of this user's current program against the new spec","This user's customization history (deployed changes, oldest first)",'Your earlier migration attempts that the checker rejected','Spec diff','How the vendor canonical program uses the new feature','Simulator-only tailoring preferences (untrusted data)','Earlier measured ideas (training days only)','Task']
    .flatMap(name=>{const body=section(name);return body?['## '+name,body]:[];}).join('\n');
  // The core semantic/patch contract remains available after the persona-first design material.
  const coreSystem=(parts.system.split('\n\n## Lean screen mode:')[0]??'').replace('Pixel values come from Chromium','Pixel values come from Lean placed boxes').replace('Allowed (moveType):','Allowed (moveType): layout,');
  return {...parts,portfolio:false,leanLayouts:true,
    system:'You redesign one simulated persona’s interface. Read their evidence first. Return the requested JSON. The layout and Program rules below are the only limits; optimize fewer clicks and scrolls with full completion.',
    prompt:[
      '## Persona evidence: logs, traces and per-screen click/scroll/travel costs',traces,
      ...(evidence?['## Training summary',evidence]:[]),
      ...(section('Physical locality (training days only)')?['## Physical locality (training days only)',section('Physical locality (training days only)')]:[]),
      parts.prompt.split('\n## ')[0]??'',
      '## Current design on visited screens',designBlock,
      LAYOUT_RULE_GUIDE,
      '## Reference index and relevant material',
      JSON.stringify({screens:program?.screens.map(s=>({id:s.id,title:s.title,workflow:s.workflow,components:s.components.length})),specSections:Object.keys(spec),omitted:'Full unvisited Program, full inventory, manual prose and recorded examples; clinical checking remains authoritative.'}),
      '## Relevant hospital spec',JSON.stringify(relevantSpec),
      '## Program vocabulary and clinical rules',coreSystem,
      '## Native inventory index for visited screens',
      parsedInventory.success?compactLeanInventory(JSON.stringify({...scopedInventory,screens:[...new Set(screens.map(s=>s.id))].flatMap(id=>{
        const shapes=parsedInventory.data.screens.filter(s=>s.screen===id);
        const representative=shapes[0];return representative?[representative]:[];
      })})):JSON.stringify(scopedInventory),
      'Inventory paths above describe one representative shape per visited screen, for optional literal authoring. Rules resolve targets from every actual shape, not these examples. All other shapes still pass the same gate; these examples do not bound the design space.',
      '## Persona behavior parameters',section('Persona behavior parameters'),
      ...(programRaw.includes('\nHypothesis:')?[programRaw.slice(programRaw.indexOf('\nHypothesis:')+1)]:[]),
      operational,
    ].join('\n\n')};
}

/** Read only this persona's committed odd-day training partitions. */
export async function leanTrainingLog(
  directory: string,
  persona: string,
  night: number,
): Promise<string> {
  const { readFile } = await import("node:fs/promises");
  const path = await import("node:path");
  const { dayResultSchema } = await import("./schema.js");
  const perScreen = new Map<string,{screen:string;clicks:number;rawScrolls:number;scrolls:number|null;scrollPx:number|null;mouseTravelPx:number|null}>();
  const counts = new Map<string, number>(),
    sequences = new Map<string, number>(),
    recent: unknown[] = [];
  for (let day = 1; day <= night; day += 2) {
    const result = dayResultSchema.parse(
      JSON.parse(
        await readFile(
          path.join(directory, "training", `day-${day}`, `${persona}.json`),
          "utf8",
        ),
      ),
    );
    if (result.day !== day || result.persona !== persona)
      throw Error("Foreign Lean training trace");
    const { loadGeometry } = await import('./geometry.js');
    const { pointingTrace } = await import('../../app/src/dashboard/bounded-pointing.js');
    const { attributePixels } = await import('./locality.js');
    const { existsSync } = await import('node:fs');
    const geometryFile=result.geometry?path.join(directory,'geometry',`${result.geometry.programHash}.${result.geometry.componentsSha256}.json`):'';
    let atlas=geometryFile&&existsSync(geometryFile)?await loadGeometry(geometryFile,result,path.join(directory,'geometry')):undefined;
    if(atlas?.appSha256.startsWith('lean-layout:')) {
      // Old flat atlases accumulate states and overwrite their top-level event
      // aliases. Select this exact committed trace before attributing costs.
      const traceKey=sha256(stableStringify(result.trace)).slice(0,12);
      const states=atlas.states.filter(s=>s.state.endsWith('-'+traceKey));
      const traceTargets:Record<string,string>={};
      for(const state of states)for(const id of Object.keys(state.components)) {
        const match=/^lean-event-(\d+)-(.+)$/.exec(id);
        if(match?.[2]===traceKey && match[1])traceTargets[match[1]]=id;
      }
      atlas=states.length?{...atlas,states,traceTargets}:undefined;
    }
    // Keep the same task-local lookahead and continuous pointer as day metrics.
    const projected=atlas?pointingTrace(result.trace,atlas,result).map((row,index)=>{
      const target=atlas.traceTargets?.[String(index)];
      const event=target&&row.event===result.trace[index]?.event&&row.event&&typeof row.event==='object'?Object.fromEntries(Object.entries(row.event).map(([kind,payload])=>[kind,payload&&typeof payload==='object'?Object.fromEntries(Object.entries(payload).map(([k,v])=>[k,['comp','alert'].includes(k)?target:v])):payload])):row.event;
      return {...row,event};
    }):[];
    const costs=atlas?attributePixels(projected,atlas,day):[];
    for(const cost of costs) {
      const screen=cost.screen;
      const total=perScreen.get(screen)??{screen,clicks:0,rawScrolls:0,scrolls:0,scrollPx:0,mouseTravelPx:0};
      total.scrolls=total.scrolls===null?null:total.scrolls+cost.scrolls;
      for(const metric of ['scrollPx','mouseTravelPx'] as const)total[metric]=total[metric]===null||cost[metric]===null?null:total[metric]+cost[metric];
      perScreen.set(screen,total);
    }
    let previous = "",
      previousTask = "";
    for (const row of result.trace) {
      const screenCost=perScreen.get(row.screen)??{screen:row.screen,clicks:0,rawScrolls:0,scrolls:null,scrollPx:null,mouseTravelPx:null};
      if(!atlas){screenCost.scrolls=null;screenCost.scrollPx=null;screenCost.mouseTravelPx=null;}
      screenCost.clicks+=row.ops.filter(op=>op==='click').length;
      screenCost.rawScrolls+=row.ops.filter(op=>op==='scroll').length;
      perScreen.set(row.screen,screenCost);
      const kind = Object.keys(row.event)[0] ?? "",
        payload = Object.values(row.event)[0];
      const target =
        payload && typeof payload === "object"
          ? Object.entries(payload).find(([key]) =>
              ["comp", "alert"].includes(key),
            )?.[1]
          : undefined;
      if (previousTask !== row.task) {
        previous = "";
        previousTask = row.task;
      }
      const key = JSON.stringify([row.screen, kind, target ?? null]);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      if (previous) {
        const sequence = JSON.stringify([previous, key]);
        sequences.set(sequence, (sequences.get(sequence) ?? 0) + 1);
      }
      previous = key;
      recent.push({
        day,
        task: row.task,
        screen: row.screen,
        kind,
        target: target ?? null,
        ops: row.ops,
        result: row.result,
      });
    }
  }
  const ranked = (map: Map<string, number>, limit: number) =>
    [...map]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, limit)
      .map(([key, count]) => ({ events: JSON.parse(key), count }));
  return JSON.stringify({
    perScreen:[...perScreen.values()].map(row=>({...row,mouseTravelPx:row.mouseTravelPx===null?null:Math.round(row.mouseTravelPx*100)/100,scrollPx:row.scrollPx===null?null:Math.round(row.scrollPx*100)/100})).sort((a,b)=>b.clicks+b.rawScrolls-a.clicks-a.rawScrolls||a.screen.localeCompare(b.screen)),
    costScope:'Committed odd-day traces only; continuous pointer replay attributed per event, with original task-local scroll lookahead. Null pixels mean unavailable; rawScrolls are trace operators.',
    targetFrequencies: ranked(counts, 60),
    commonTransitions: ranked(sequences, 30),
    recentTrace: recent.slice(-96),
  });
}

/** Lossless dictionary encoding of every native case, path, flag and target id.
 * This changes transport size only; it does not select or rank layouts. */
export function compactLeanInventory(raw: string): string {
  const parsed = inventorySchema.safeParse(JSON.parse(raw));
  if (!parsed.success) return raw;
  const inventory = parsed.data,
    regions = ["banner", "title", "body", "side", "footer", "modal", "urgent"];
  const ids: string[] = [],
    idIndex = new Map<string, number>(),
    rows: unknown[][] = [],
    rowIndex = new Map<string, number>();
  const intern = (id: string) => {
    let index = idIndex.get(id);
    if (index === undefined) {
      index = ids.length;
      ids.push(id);
      idIndex.set(id, index);
    }
    return index;
  };
  const cases = inventory.screens.map((screen) => {
    const occurrences = new Map(
      screen.occurrences.map((o) => [o.path.join("."), o.ids]),
    );
    return {
      screen: screen.screen,
      rows: screen.shape.map((slot) => {
        const path = slot.path.join("."),
          row = [
            path,
            Number(slot.target),
            regions.indexOf(slot.region),
            slot.lines,
            (occurrences.get(path) ?? []).map(intern),
          ];
        const key = JSON.stringify(row);
        let index = rowIndex.get(key);
        if (index === undefined) {
          index = rows.length;
          rows.push(row);
          rowIndex.set(key, index);
        }
        return index;
      }),
    };
  });
  return JSON.stringify({
    encoding: "native-inventory-v1",
    currentLayouts: inventory.currentLayouts,
    ids,
    regions,
    rows,
    cases,
    limits: inventory.limits,
  });
}
