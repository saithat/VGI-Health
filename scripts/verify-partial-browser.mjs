#!/usr/bin/env node
import {chromium} from '../app/node_modules/@playwright/test/index.mjs';
import {parseArgs} from 'node:util';
const {values}=parseArgs({options:{run:{type:'string',default:'core-10day-live'},url:{type:'string',default:'http://127.0.0.1:5180'},screenshot:{type:'string'}}});
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${values.url}/browse?run=${encodeURIComponent(values.run)}`);
 const timeline=page.getByRole('group',{name:'Branching persona timeline'});await timeline.waitFor({timeout:120000});
 const branches=[];
 console.log('Timeline loaded');
 for(const persona of ['P1','P2','P3','P4','P5']){
  const branch=timeline.locator(`[data-node-key="${persona}-2"]`);try{await branch.waitFor({timeout:30000});}catch(error){console.error((await page.locator('body').innerText()).slice(0,5000));if(values.screenshot)await page.screenshot({path:values.screenshot,fullPage:true});throw error;}
  const label=await branch.getAttribute('aria-label'),text=await branch.innerText();
  if(!label.includes('day 2, revision 1,')||!text.includes('rev 1'))throw new Error(`Unexpected ${persona} branch: ${label} / ${text}`);
  branches.push({persona,label,text});
 }
 if(await timeline.locator('.persona-track').count()!==5)throw new Error('Expected five persona branches');
 if(errors.length)throw new Error(errors.join('\n'));
 if(values.screenshot)await page.screenshot({path:values.screenshot,fullPage:true});
 console.log(JSON.stringify({run:values.run,status:'passed',branches,errors},null,2));
}finally{await browser.close();}
