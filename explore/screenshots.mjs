/** Review screenshots are samples; the independent all-exported-states gate is separate. */
import path from 'node:path';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium} from '../app/node_modules/@playwright/test/index.mjs';
import {preview} from '../app/node_modules/vite/dist/node/index.js';
import {createEhr} from '../agent/src/ehr.ts';
import {write} from './evaluate.ts';
const run=path.resolve(process.argv[2]??'runs/explore-ed-first');
if(!run.startsWith(path.resolve('runs')+path.sep))throw Error('Expected ignored run directory');
const report=JSON.parse(await readFile(path.join(run,'report.json'),'utf8'));
const ehr=createEhr({binary:process.env.EHR_BIN??'/home/saithat/Projects/VGI-Health/lean/.lake/build/bin/ehr'});
process.env.TAILSCALE_SERVE='0';
const server=await preview({root:path.resolve('app'),configFile:path.resolve('app/vite.config.ts'),preview:{host:'127.0.0.1',port:0,open:false}});
const address=server.httpServer.address();
if(!address||typeof address==='string')throw Error('Preview did not bind TCP');
const browser=await chromium.launch({headless:true});
const screenshots=[];
const containsDocument=value=>value&&typeof value==='object'&&(value.display==='document'||Object.values(value).some(v=>Array.isArray(v)?v.some(containsDocument):containsDocument(v)));
try{
 for(const [niche,e] of Object.entries(report.archive)){
  const dir=path.join(run,'candidates',e.id,'review-states');await mkdir(dir,{recursive:true});
  const files=await ehr.renderScreens({specVersion:e.candidate.program.specVersion,program:e.candidate.program,ui:true,
    fhir:path.resolve('fixtures/synthea/Ashly_Rippin_149fcc1f.json'),outDir:dir});
  const selected=files.find(f=>path.basename(f)==='w3Orders.json')??files.find(f=>path.basename(f).startsWith('w3Orders'));
  const samples=[selected];
  if(e.candidate.point.layout==='document'){
   for(const f of files.filter(f=>path.basename(f).startsWith('w3Provider'))){if(containsDocument(JSON.parse(await readFile(f,'utf8')))){samples.push(f);break;}}
  }
  for(const [i,file]of samples.filter(Boolean).entries())for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
   const page=await browser.newPage({viewport});
   await page.goto(`http://127.0.0.1:${address.port}/screen-check.html`);
   await page.evaluate(screen=>window.renderUi(screen),JSON.parse(await readFile(file,'utf8')));
   await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(250);
   const output=path.join(run,'screenshots',`${e.id}-${i}-${viewport.width}.png`);await mkdir(path.dirname(output),{recursive:true});
   await page.screenshot({path:output});await page.close();
   screenshots.push({niche,id:e.id,state:file,viewport,path:output});
  }
 }
 await write(path.join(run,'screenshots.json'),screenshots);
 console.log(`${screenshots.length} review screenshots in ${run}/screenshots`);
}finally{await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
