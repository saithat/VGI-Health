import {test,expect} from '@playwright/test';
import {readFileSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {uiScreenSchema} from '../src/ehr/ui/types';
import {expectedAria,observedAria} from '../src/ehr/ui/fidelity';
import {waitForCaptureFonts} from './capture-environment';
import type {} from '../src/ehr/offline';

test('regenerate neutral clinical screenshots from native semantic snapshots',async({page})=>{
 test.skip(!process.env.NEUTRAL_SHOTS,'Opt-in deterministic screenshot refresh');
 test.setTimeout(240000);
 await page.setViewportSize({width:1440,height:900});
 const files=readdirSync('shots',{recursive:true}).map(String).filter(f=>f.endsWith('.png')&&!f.endsWith('-full.png'));
 const captures=[];
 for(const file of files){
  const path=`shots/${file}`;let source=path.replace(/\.png$/,'.ui.json');
  if(!existsSync(source)&&file.startsWith('realism/present/'))source=`src/fixtures/presentations/${file.split('/').at(-1)?.replace(/\.png$/,'.json')}`;
  if(!existsSync(source)&&file.startsWith('final/canonical-density-before/')){
   const persona=file.split('/').at(-1)?.slice(0,2)??'';
   const names:Record<string,string>={P1:'P1-summary',P2:'P2-chart',P3:'P3-MAR',P4:'P4-growth',P5:'P5-op-note'};
   source=`shots/final/before/${names[persona]}.ui.json`;
  }
  if(!existsSync(source))continue;
  const screen=uiScreenSchema.parse(JSON.parse(readFileSync(source,'utf8')));
  await page.goto('/screen-check.html');
  await page.waitForFunction(()=>typeof window.renderUi==='function');
  await page.evaluate(screen=>window.renderUi(screen),screen);
  await waitForCaptureFonts(page);
  expect(observedAria(await page.locator('body').ariaSnapshot())).toEqual(expectedAria(screen));
  await page.mouse.move(1,1);
  await page.screenshot({path,animations:'disabled'});
  captures.push({path,source,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')});
 }
 expect(captures.length).toBeGreaterThan(70);
 writeFileSync('shots/final/neutral-manifest.json',JSON.stringify({viewport:[1440,900],source:'current native semantic exports; fictional identity seed v1',captures},null,2)+'\n');
 for(const directory of ['shots/final','shots/final/before']){
  const manifestPath=`${directory}/manifest.json`;
  const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
  manifest.source='regenerated current native semantic snapshots; directory names retain layout comparison roles';
  for(const capture of manifest.captures){
   const file=`${directory}/${capture.file}`;
   capture.sha256=createHash('sha256').update(readFileSync(file)).digest('hex');
   const persona=capture.file.slice(0,2);
   capture.programSha256=createHash('sha256').update(readFileSync(`../releases/v3/personas/${persona}.json`)).digest('hex');
   const screen=JSON.parse(readFileSync(file.replace(/\.png$/,'.ui.json'),'utf8'));
   capture.screen=screen.screen;
  }
  writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
 }
});

test('migrated recorded run verifies its current binding and renders in the dashboard',async({page})=>{
 test.skip(!process.env.NEUTRAL_SHOTS,'Opt-in migrated-run validation');
 test.setTimeout(120000);
 const run='neutral-recorded-day1';
 test.skip(!existsSync(`../runs/${run}/manifest.json`),'Migration evidence is local data');
 await page.setViewportSize({width:1440,height:900});
 await page.goto(`/ehr?mode=replay&run=${run}&persona=P3&program=runs/${run}/programs/P3/v0.json&release=v1&audit=buttons`);
 await expect(page.getByRole('textbox',{name:'Patient search by name or MRN'})).toBeVisible({timeout:30000});
 await page.getByRole('button',{name:/^Open chart:/}).first().click();
 await expect(page.getByRole('banner',{name:'Patient banner',exact:true})).toBeVisible();
 await expect(page.getByText(/Certified build mismatch|Login refused|Build rebind refused/)).toHaveCount(0);
 for(const [name,route]of [
  ['dashboard',`/dashboard?run=${run}`],
  ['ui-browser-timeline',`/browse?run=${run}`],
  ['compare',`/dashboard?run=${run}&view=compare&persona=P3&workflow=W4`],
  ['trajectory-playback',`/dashboard?run=${run}&view=Trajectories`],
 ] as const){
  await page.goto(route);
  await expect(page.getByRole('heading',{level:1})).toBeVisible({timeout:30000});
  if(name==='trajectory-playback'){
   const region=page.getByRole('region',{name:'All task trajectories'});
   await expect(region).toBeVisible();
   await expect(page.locator('iframe[title="Recorded EHR"]')).toBeVisible({timeout:30000});
  }
  await waitForCaptureFonts(page);await page.mouse.move(1,1);
  await page.screenshot({path:`shots/final/${name}.png`,animations:'disabled'});
  if(name==='trajectory-playback'){
   await page.getByRole('button',{name:'Fullscreen',exact:true}).click();
   await page.screenshot({path:'shots/final/trajectory-playback-fullscreen.png',animations:'disabled'});
  }
 }
});
