import assert from 'node:assert/strict';
import path from 'node:path';
import { startLab, measureEvent } from '../app/scripts/exotic-gate.mjs';
import { write } from './evaluate.ts';
const out=process.argv[2]??'runs/explore-round2';
if(!path.resolve(out).startsWith(path.resolve('runs')+path.sep))throw Error('Use ignored runs/');
const lab=await startLab();
try{
 const page=await lab.browser.newPage({viewport:{width:1440,height:900}});
 await page.setContent('<style>html,body{margin:0}body{height:3100px}</style><button data-comp-id="bottom" style="position:absolute;top:3000px">Target</button>');
 const geometry=await measureEvent(page,{patient:'absent',event:{click:{comp:'bottom'}}});
 assert.equal(geometry.scrollContainerCount,1);assert.ok(geometry.scrollPx>0);assert.equal(geometry.scrollPx,geometry.documentScrollPx);
 await page.setContent('<style>html,body{margin:0}article{height:400px;overflow:auto}div{height:2400px}</style><article data-patient="bound"><div></div><button data-comp-id="inside">Inside pane</button></article>');
 const paneGeometry=await measureEvent(page,{patient:'bound',event:{click:{comp:'inside'}}});
 assert.equal(paneGeometry.scrollContainerCount,1);assert.ok(paneGeometry.scrollPx>0);assert.equal(paneGeometry.documentScrollPx,0);
 await write(`${out}/geometry-audit.json`,{status:'pass',geometry,paneGeometry,scope:'Document counted once; scrollable patient-pane root included'});
 console.log(JSON.stringify({status:'pass',documentScrollPx:geometry.scrollPx,paneScrollPx:paneGeometry.scrollPx}));
}finally{await lab.close();}
