#!/usr/bin/env node
// Small serial visual comparison; a Vite dev server must already be running.
import {resolve,join} from 'node:path';
import {readFileSync,writeFileSync} from 'node:fs';
import {chromium} from '../../app/node_modules/@playwright/test/index.mjs';
import {args,read} from './cli.mjs';
const opts=args(process.argv.slice(2)),out=resolve(opts.out??join(process.env.TMPDIR??'/home/saithat/Projects/run-tmp','reference-layouts'));
const report=read(opts.manifest??join(out,'report.json')),url=opts.url??'http://127.0.0.1:4197';
const browser=await chromium.launch({headless:true});
try {
  const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
  const page=await context.newPage(),receipts=[];
  for(const sample of report.samples) {
    const errors=[];const onError=error=>errors.push(error.message);page.on('pageerror',onError);
    await page.goto(`${url}/tests/lean-widget-preview.html`);await page.waitForFunction(()=>typeof window.paintLeanFamily==='function');
    await page.evaluate(screen=>window.paintLeanFamily(screen,"fixed-shell"),read(join(sample.dir,'screen.json')));
    await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await page.screenshot({path:join(sample.dir,'fixed-shell.png')});
    await page.goto(`${url}/src/browser/ui-library/index.html`);await page.getByText('Supply native ui-layout output').waitFor();
    await page.evaluate(layout=>window.postMessage(layout,location.origin),JSON.parse(readFileSync(join(sample.dir,'layout.json'),'utf8')));
    await page.locator('main[data-accepted="true"]').waitFor();
    await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await page.screenshot({path:join(sample.dir,'dense.png')});
    receipts.push({...sample,errors});page.off('pageerror',onError);
    console.log(`${sample.persona}/${sample.screen}: paired screenshots; ${errors.length} page errors`);
  }
  writeFileSync(join(out,'screenshots.json'),JSON.stringify({viewport:{width:1440,height:900},workers:1,samples:receipts},null,2)+'\n');
  if(receipts.some(r=>r.errors.length)) throw Error('Visual pages had JavaScript errors');
} finally {await browser.close();}
