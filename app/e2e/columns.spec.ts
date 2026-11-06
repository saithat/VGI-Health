import { test, expect } from '@playwright/test';
import type { UiScreen } from '../src/ehr/ui/types';

// The renderer admits nested column groups; a wide desktop can contain a narrow group.
// Labels and controls must reflow inside that group, including at doubled text size.
const field = (id: string) => ({field:{comp:id,label:'Medication administration instructions',kind:'text',value:null,unit:null,provenance:null,pendingConfirm:false,humanOnly:true,required:true}});
const screen = {
  screen:'columns-regression',title:'Nested clinical columns',banner:[['Patient','Synthetic patient']],nav:[],side:[],modal:null,
  workspace:[{section:{id:'parent',title:'Medication review',children:[{columns:{children:[
    {section:{id:'left',title:'Medication',children:[field('medication')]}},
    {section:{id:'right',title:'Administration',children:[field('administration')]}},
  ]}}]}}],
} satisfies UiScreen;

test('nested columns reflow to the available clinical region at desktop and tablet widths', async ({page}) => {
  await page.goto('/screen-check.html');
  await page.waitForFunction(() => typeof window.renderUi === 'function');
  for (const width of [768,1280,1440,1600,1920]) {
    await page.setViewportSize({width,height:900});
    await page.evaluate(tree => {if(!window.renderUi)throw Error('Painter unavailable');window.renderUi(tree);}, screen);
    // Model an admitted group in a side region or a parent column, without altering its contents.
    await page.addStyleTag({content:'.clinical-workspace-body { max-width: 340px; }'});
    const columns=page.locator('.clinical-columns').first();
    await expect(columns).toBeVisible();
    for (const textPercent of [100,200]) {
      await page.evaluate(percent => document.documentElement.style.fontSize = `${percent}%`,textPercent);
      const rects=await columns.locator(':scope > .clinical-section').evaluateAll(elements=>elements.map(el=>{
        const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};
      }));
      expect(rects).toHaveLength(2);
      const [first,last]=rects;
      if(!first||!last)throw Error('Missing column section');
      expect(last.top).toBeGreaterThanOrEqual(first.bottom);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      for (const input of await columns.getByRole('textbox').all()) {
        const box=await input.boundingBox();
        if(!box)throw Error('Missing input geometry');
        expect(box.width).toBeGreaterThanOrEqual(24);expect(box.height).toBeGreaterThanOrEqual(24);
      }
    }
    await page.evaluate(()=>document.documentElement.style.fontSize='');
  }
});
