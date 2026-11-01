/* global window */
// One persistent browser for explicit FAKE/replay geometry or canonical measurement batches.
// This collector never mints a passing safety-gate receipt.
import {preview} from 'vite';
import {chromium} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createInterface} from 'node:readline';
import path from 'node:path';
import {captureGeometry} from '../e2e/geometry-capture.ts';
const appDir=path.resolve(import.meta.dirname,'..');
const app=JSON.parse(await readFile(path.join(appDir,'dist/build.json'),'utf8'));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const context=digest(JSON.stringify([app,1440,900,digest(await readFile(path.join(appDir,'e2e/geometry-capture.ts'))),digest(await readFile(chromium.executablePath()))]));
const cache=path.join(process.env.EHR_GEOMETRY_CACHE??path.join(appDir,'../runs/screen-check-cache'),'geometry',context);await mkdir(cache,{recursive:true});
const server=await preview({root:appDir,configFile:false,preview:{port:0,host:'127.0.0.1'}});
const address=server.httpServer.address();if(!address||typeof address==='string')throw new Error('No geometry preview address');
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});await page.goto(`http://127.0.0.1:${address.port}/screen-check.html`);await page.waitForFunction(()=>typeof window.renderUi==='function');
try{
 for await(const line of createInterface({input:process.stdin})){
  const req=JSON.parse(line);
  try{
   const states=[];
   for(const file of req.files){
    const bytes=await readFile(file),state=digest(Buffer.concat([bytes,Buffer.from(JSON.stringify(req.bundle??null))])),cached=path.join(cache,`${state}.json`);
    let geometry;try{geometry=JSON.parse(await readFile(cached,'utf8'));}catch{
      const tree=JSON.parse(bytes);
      await page.evaluate(({tree,bundle})=>tree.screen?window.renderUi(tree,bundle):window.renderEhr(tree),{tree,bundle:req.bundle??null});
      geometry=await captureGeometry(page,tree.screen??tree.node?.attrs.find(a=>a.name==='data-screen-id')?.value??path.basename(file,'.json'),`${path.basename(file)}:${state}`);
      await writeFile(cached,JSON.stringify(geometry));
    }
    states.push(geometry);
   }
   process.stdout.write(JSON.stringify({id:req.id,appSha256:app.appSha256,states})+'\n');
  }catch(error){process.stdout.write(JSON.stringify({id:req.id,error:String(error)})+'\n');}
 }
}finally{await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
