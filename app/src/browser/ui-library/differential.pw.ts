import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';
import { output } from './schema';
const binary=fileURLToPath(new URL('../../../../lean/.lake/build/bin/ui-layout',import.meta.url));
const cases=fileURLToPath(new URL('../../../../scripts/ui-library/cases.mjs',import.meta.url));
test('native boxes and prebroken Noto lines agree with Chromium',async({page})=>{
  const generated=spawnSync(process.execPath,['--input-type=module','-e',`import {requests} from ${JSON.stringify(cases)}; process.stdout.write(requests.map(x=>JSON.stringify(x)).join('\\n')+'\\n')`],{encoding:'utf8'});
  expect(generated.status,generated.stderr).toBe(0);
  const native=spawnSync(binary,[],{input:generated.stdout,encoding:'utf8',maxBuffer:32*1024*1024});
  expect(native.status,native.stderr).toBe(0);
  let boxWorst=0,lineWorst=0,boxCount=0,lineCount=0;
  for(const row of native.stdout.trim().split('\n')) {
    const data=output.parse(JSON.parse(row));
    expect(data.accepted).toBe(true);
    await page.setViewportSize({width:data.viewport.w/64,height:data.viewport.h/64});
    await page.goto('/src/browser/ui-library/index.html');
    await page.evaluate(data=>window.postMessage(data,window.location.origin),data);
    await expect(page.locator('main[data-accepted]')).toHaveCount(1);
    await page.evaluate(async()=>{await document.fonts.load('400 14px "VGI Noto Sans"');await document.fonts.ready;});
    for(const [i,drawn] of data.boxes.entries()) {
      const element=page.locator(`[data-box=${JSON.stringify(drawn.box.info.id)}]`);
      const dom=await element.boundingBox();
      expect(dom).not.toBeNull();
      if(!dom) continue;
      const rect=drawn.box.rect;
      const error=Math.max(Math.abs(dom.x-rect.x/64),Math.abs(dom.y-rect.y/64),Math.abs(dom.width-rect.w/64),Math.abs(dom.height-rect.h/64));
      boxWorst=Math.max(boxWorst,error); boxCount++;
      expect(error,drawn.box.info.id).toBeLessThanOrEqual(1/64);
      for(const [j,width] of (data.lineWidths[i]??[]).entries()) {
        const line=await element.locator(`:scope > .lean-lines > [data-line="${j}"]`).boundingBox();
        if(!line) continue;
        const delta=Math.abs(line.width-width/64);
        lineWorst=Math.max(lineWorst,delta);lineCount++;
        expect(delta,drawn.box.info.id+':'+j).toBeLessThanOrEqual(0.05);
      }
    }
    // Two independently scrolling ancestors: both keep the fixed banner and footer.
    await page.locator('[data-box="review-scroll"]').evaluate(e=>{e.scrollTop=60;});
    await page.locator('[data-box="nested"]').evaluate(e=>{e.scrollTop=80;});
    expect((await page.locator('[data-box="patient-banner"]').boundingBox())?.y).toBe(8);
    expect((await page.locator('[data-box="sign"]').boundingBox())?.y).toBe(data.viewport.h/64-80);
  }
  const report={boxCount,lineCount,boxWorstCssPx:boxWorst,lineWorstCssPx:lineWorst};
  writeFileSync(process.env.TMPDIR+'/ui-library-differential.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
});

test('W1 signing port keeps banner and commit visible while review content scrolls',async({page})=>{
  const samplePath=process.env.TMPDIR+'/ui-library-port/sample-layout.json';
  const {existsSync,readFileSync}=await import('node:fs');
  test.skip(!existsSync(samplePath),'Run scripts/ui-library/port-audit.mjs first for the local semantic sample.');
  const data=output.parse(JSON.parse(readFileSync(samplePath,'utf8')));
  expect(data.accepted).toBe(true);
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/src/browser/ui-library/index.html');
  await page.evaluate(data=>window.postMessage(data,window.location.origin),data);
  await expect(page.locator('main[data-accepted]')).toHaveCount(1);
  await page.evaluate(async()=>{await document.fonts.load('400 14px "VGI Noto Sans"');await document.fonts.ready;});
  const commit=data.boxes.find(d=>d.box.info.commit);
  const banner=data.boxes.find(d=>d.box.info.banner);
  expect(commit).toBeDefined(); expect(banner).toBeDefined();
  if(!commit||!banner) return;
  await page.screenshot({path:process.env.TMPDIR+'/ui-library-signing.png'});
  await page.locator('[data-box="review-viewport"]').evaluate(e=>{e.scrollTop=e.scrollHeight;});
  for(const item of [banner,commit]) {
    const rect=await page.locator(`[data-box=${JSON.stringify(item.box.info.id)}]`).boundingBox();
    expect(rect?.y).toBe(item.box.rect.y/64);
  }
  expect(await page.locator('[data-source]').count()).toBe(data.boxes.filter(d=>d.box.info.source!==null).length);
});

test('unbounded safety text is retained and vertically scrollable',async({page})=>{
  const generated=spawnSync(process.execPath,['--input-type=module','-e',`import {template} from ${JSON.stringify(cases)}; const r=template();r.content[0][1]='Allergy 🧬\\n'+'W'.repeat(70000);process.stdout.write(JSON.stringify(r)+'\\n');`],{encoding:'utf8'});
  expect(generated.status,generated.stderr).toBe(0);
  const native=spawnSync(binary,[],{input:generated.stdout,encoding:'utf8',maxBuffer:32*1024*1024});
  expect(native.status,native.stderr).toBe(0);
  const data=output.parse(JSON.parse(native.stdout));
  expect(data.accepted).toBe(true);
  const banner=data.boxes.find(d=>d.box.info.banner);
  expect(banner?.original?.length).toBeGreaterThan(70000);
  expect(banner?.lines.join('')).toContain('[U+01F9EC]');
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/src/browser/ui-library/index.html');
  await page.evaluate(data=>window.postMessage(data,window.location.origin),data);
  await expect(page.locator('main[data-accepted]')).toHaveCount(1);
  await page.evaluate(async()=>{await document.fonts.load('400 14px "VGI Noto Sans"');await document.fonts.ready;});
  const box=page.locator('[data-box="patient-banner"]');
  expect(await box.getAttribute('aria-label')).toBe(banner?.original);
  const lines=box.locator(':scope > .lean-lines');
  expect(await lines.evaluate(e=>e.scrollHeight>e.clientHeight)).toBe(true);
  await lines.evaluate(e=>{e.scrollTop=e.scrollHeight;});
  const last=await lines.locator('[data-line]').last().boundingBox();
  expect(last).not.toBeNull();
  if(last) {expect(last.y).toBeGreaterThanOrEqual(8);expect(last.y+last.height).toBeLessThanOrEqual(88.02);}
  expect((await box.boundingBox())?.y).toBe(8);
});

test('paint flags and opaque text backgrounds match the checked footprint model',async({page})=>{
  const generated=spawnSync(process.execPath,['--input-type=module','-e',`import {template} from ${JSON.stringify(cases)}; const r=template();r.tree.children[0].type='Circle';r.content.push(['ghost','should not paint']);r.tree.children.push({type:'Text',id:'ghost',paint:false,z:40,position:{x:1024,y:512},width:90112,height:1280,text:{key:'ghost',maxLength:64,maxLines:1,overflow:'wrap',safety:false,font:0,fontSize:896,lineHeight:1280}});process.stdout.write(JSON.stringify(r)+'\\n');`],{encoding:'utf8'});
  expect(generated.status,generated.stderr).toBe(0);
  const native=spawnSync(binary,[],{input:generated.stdout,encoding:'utf8',maxBuffer:32*1024*1024});
  expect(native.status,native.stderr).toBe(0);
  const data=output.parse(JSON.parse(native.stdout));
  expect(data.accepted).toBe(true);
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/src/browser/ui-library/index.html');
  await page.evaluate(data=>window.postMessage(data,window.location.origin),data);
  await expect(page.locator('main[data-accepted]')).toHaveCount(1);
  await expect(page.locator('[data-box="patient-banner"] > svg')).toHaveCount(1);
  await expect(page.locator('[data-box="patient-banner"] > .lean-lines')).toHaveCSS('background-color','rgb(241, 245, 249)');
  await expect(page.locator('[data-box="ghost"] > .lean-lines')).toHaveCount(0);
});
