import path from 'node:path';
import { attributeDay, localityDigest } from '../src/locality.js';
import { loadGeometry } from '../src/geometry.js';
import { dayResultSchema } from '../src/schema.js';
import { REPO_ROOT, readJson } from '../src/util.js';
import { withData } from './data.js';

withData('runs/core-10day-live/geometry').it('conserves recorded per-task physical costs for all five personas on day 1',async()=>{
  let tasks=0;
  for(const persona of ['P1','P2','P3','P4','P5']) {
    const root=path.join(REPO_ROOT,'runs/core-10day-live');
    const result=await readJson(path.join(root,'days/day-01',`${persona}.json`),dayResultSchema);
    if(!result.geometry)throw new Error('Missing archived geometry metadata');
    const loaded=await loadGeometry(path.join(root,'geometry',`${result.geometry.programHash}.json`));
    const atlas={...loaded,aliases:loaded.aliases??{}};
    const rows=attributeDay(result,atlas);
    for(const task of result.tasks) {
      const own=rows.filter(r=>r.task===task.task);
      for(const key of ['clicks','keystrokes','scrolls','mouseTravelPx','scrollPx'] as const) {
        expect(own.reduce((n,r)=>n+Math.round((r[key]??0)*100),0)).toBe(Math.round((task[key]??0)*100));
      }
    }
    const digest=localityDigest([{result,atlas}]);
    for(const key of ['clicks','keystrokes','scrolls','mouseTravelPx','scrollPx'] as const) {
      const screens=digest.screens.reduce((n,r)=>n+Math.round((r[key]??0)*100),0);
      const components=digest.components.reduce((n,r)=>n+Math.round((r[key]??0)*100),Math.round((digest.otherComponents[key]??0)*100));
      expect(screens).toBe(Math.round((digest.totals[key]??0)*100));expect(components).toBe(screens);
    }
    tasks+=result.tasks.length;
  }
  expect(tasks).toBeGreaterThan(100);
},60000);
