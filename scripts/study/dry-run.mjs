/** Real browser -> study API -> immutable local exports -> scoring -> analysis. */
import assert from 'node:assert/strict';
import path from 'node:path';
import { chromium } from '../../app/node_modules/@playwright/test/index.mjs';
import { prepare } from './prepare.mjs';
import { startStudy } from './server.mjs';
import { score } from './score.mjs';
import { analyze } from './analysis.mjs';
import { verifyTrajectories } from './verify-trajectories.mjs';
import { outputDir, arg, writeNew } from './common.mjs';
const out=outputDir(arg('out',`runs/study-dry-${Date.now()}`));
const count=Number(arg('participants','4'));
if(!Number.isInteger(count)||count<2||count>8) throw Error('Use 2–8 simulated participants');
await prepare(out);
const server=await startStudy({out,dryRun:true});
const browser=await chromium.launch({headless:true});
const evidence=[];
try {
  // Sequential pages: a single modest browser lane.
  for(let slot=0;slot<count;slot++) {
    const page=await browser.newPage({viewport:{width:1440,height:1000}}), errors=[];
    page.on('pageerror',error=>errors.push(String(error)));
    await page.goto(server.url);
    await page.getByText('Participant information and consent',{exact:true}).waitFor();
    await page.getByLabel('Participant ID (assigned by facilitator)').fill(`P${String(slot+1).padStart(3,'0')}`);
    await page.getByLabel('Allocation slot (assigned before arrival)').fill(String(slot));
    await page.getByRole('checkbox').check();
    await page.getByRole('button',{name:'Consent and continue',exact:true}).click();
    for(let block=-4;block<4;block++) {
      await page.getByRole('button',{name:'Start task',exact:true}).click();
      await page.waitForFunction(()=>Boolean(window.studyHarness));
      const stage=page.locator('.study-stage');
      await stage.focus(); await page.keyboard.press('Shift');
      await page.mouse.move(500,700);await page.mouse.move(550+slot*10,750);
      if(block<0) {
        await page.getByRole('button',{name:'Stop task / unable to finish',exact:true}).click(); continue;
      }
      // Exercise an actual DOM activation and scroll before semantic driver replay.
      const patient=await page.evaluate(()=>window.studyHarness.input().facts.sourcePatientId);
      await page.locator(`.study-stage [data-comp-id^="workspace.open|${patient}|"]`).first().click();
      await page.mouse.move(700,700);
      await page.mouse.wheel(0,500);
      await page.waitForTimeout(80);
      await page.screenshot({path:path.join(out,`dry-task-${slot}-${block}.png`)});
      const result=await page.evaluate(async()=>{
        const {loadEhrInterp}=await import('/ehr/interp-loader.mjs');
        const wasm=await loadEhrInterp({locateFile:filename=>`/ehr/${filename}`});
        const config=await (await fetch('/api/study/config')).json();
        let steps=0;
        while(!window.studyHarness.completed() && steps<700) {
          const render=window.studyHarness.input();
          const scenario=config.cases.find(c=>c.patient===render.facts.sourcePatientId);
          // Episode can be recovered from the distinct episode facts in this frozen case.
          const episode=scenario.episodes.findIndex(e=>JSON.stringify(e.facts)===JSON.stringify(render.facts));
          let event;
          if(render.program.patientSelection && render.state.patientContext?.bound!==render.facts.sourcePatientId) {
            const screen=JSON.parse(wasm.call('ehr_exotic',JSON.stringify({op:'render',render}))).screen;
            const flatten=nodes=>nodes.flatMap(n=>{const v=Object.values(n)[0];return v.children?flatten(v.children):'tabs'in n?flatten(n.tabs.body):[n];});
            const button=flatten([...screen.workspace,...screen.side]).find(n=>n.button?.comp.startsWith(`workspace.open|${scenario.patient}|`));
            if(!button)throw Error('Dry-run cannot find assigned patient');
            event={click:{comp:button.button.comp}};
          } else {
            // Test driver alone sees policy goal actions; the participant UI never does.
            const choice=JSON.parse(wasm.call('ehr_exotic',JSON.stringify({op:'choices',render,task:scenario.task,episode:Math.max(0,episode)})));
            event=choice.events?.[0];
            if(!event)throw Error(`Dry-run stalled: ${JSON.stringify(choice)}`);
          }
          window.studyHarness.step(event);steps++;
          await new Promise(resolve=>requestAnimationFrame(resolve));
          const viewport=document.querySelector('.study-stage');
          for(const dialog of document.querySelectorAll('[role="dialog"]')) {
            const rect=dialog.getBoundingClientRect();
            if(rect.width && rect.height && !viewport.contains(dialog))throw Error('Clinical dialog escaped study metrics');
          }
        }
        return {steps,completed:window.studyHarness.completed()};
      });
      assert.equal(result.completed,true,`participant ${slot} block ${block}`);
      evidence.push({slot,block,...result});
      await page.getByRole('button',{name:'Finish completed task',exact:true}).click();
      const numbers=page.locator('.study-card input[type=number]');
      for(let i=0;i<6;i++)await numbers.nth(i).fill(String(20+slot*5+i));
      for(let i=0;i<10;i++)await page.getByLabel(`SUS ${i+1}`,{exact:true}).selectOption(String(i%2 ? 2 : 4));
      await page.getByRole('button',{name:'Save ratings and continue',exact:true}).click();
    }
    await page.getByRole('heading',{name:'Session ended',exact:true}).waitFor();
    await page.waitForFunction(()=>document.querySelector('[role=status]')?.textContent?.startsWith('Saved locally:'));
    assert.deepEqual(errors,[]);
    await page.screenshot({path:path.join(out,`dry-session-${slot}.png`)});
    console.log(`Simulated participant ${slot+1}/${count}: all four measured tasks completed`);
    await page.close();
  }
  const replay=await verifyTrajectories(out);
  const prediction=await score(out,{standIn:true}),report=await analyze(out);
  assert.equal(report.participants,count);
  assert.equal(report.provenance,'simulated-dry-run');
  assert.ok(prediction.rows.length>0,'Need actual calibration-eligible states');
  assert.ok(report.calibration.models.decisionModel.n>0);
  for(const d of ['stack','board','dated','command']) {
    assert.equal(report.effort.summary[d].clicks.n,count);
    assert.equal(report.effort.summary[d].completed.mean,1);
    assert.ok(report.effort.summary[d].keys.mean>0,'Real DOM key counter exercised');
    assert.ok(report.effort.summary[d].clicks.mean>0,'Real DOM click counter exercised');
    assert.ok(report.effort.summary[d].scrollPx.mean>0,'Real DOM scroll counter exercised');
  }
  // Same-origin and path guards; participant files must never be served by Vite.
  const base=new URL(server.url).origin;
  const cross=await fetch(`${base}/api/study/session`,{method:'POST',headers:{origin:'https://example.org','content-type':'application/json'},body:'{}'});
  assert.equal(cross.status,400);
  const leak=await fetch(`${base}/@fs/${out}/manifest.json`);assert.equal(leak.status,403);
  await writeNew(path.join(out,'dry-run-verification.json'),{provenance:'simulated-dry-run',participants:count,tasks:evidence,
    predictions:prediction.rows.length,replayedEvents:replay.eventsVerified,replayMismatches:replay.mismatches,allCompleted:true,localWriteAndAnalysis:true,crossOriginRejected:true,runFilesNotServed:true,
    limitation:'Goal-driven semantic harness injects actions; workload magnitudes and ratings are artificial. Physical key/pointer capture is exercised but not a human-effort measurement.'});
  console.log(JSON.stringify({out,participants:count,calibrationRows:prediction.rows.length,analysis:path.join(out,'analysis/report.json')}));
} finally {await browser.close();await server.close();}
