import type {Page} from '@playwright/test';
/** Captured by the same Chromium painter as the safety gate, at a fixed viewport. */
export async function captureGeometry(page:Page,screen:string,state:string){
 await page.setViewportSize({width:1440,height:900});
 await page.evaluate(()=>document.fonts.ready);
 return page.evaluate(({screen,state})=>{
  const elements=[...document.querySelectorAll<HTMLElement>('[data-comp-id]')];
  const containers=[...document.querySelectorAll<HTMLElement>('*')].filter(el=>el.clientHeight>0&&(el.scrollHeight>el.clientHeight+1||el.scrollWidth>el.clientWidth+1));
  const ids=new Map<Element,string>(containers.map((el,i)=>[el,`scroll-${i}`]));
  const reset=()=>{window.scrollTo(0,0);for(const el of containers){el.style.scrollBehavior='auto';el.scrollTop=0;el.scrollLeft=0;}};
  reset();
  const scrollers:Record<string,{maxX:number;maxY:number;width:number;height:number}>={};
  for(const el of containers){const key=ids.get(el);if(key)scrollers[key]={maxX:el.scrollWidth-el.clientWidth,maxY:el.scrollHeight-el.clientHeight,width:el.clientWidth,height:el.clientHeight};}
  const components:Record<string,{center:{x:number;y:number};reveal:{x:number;y:number};chain:string[];offsets:Record<string,{x:number;y:number}>}>={};
  for(const el of elements){
   const id=el.dataset.compId;if(!id||el.closest('[inert]')||components[id]||!el.getClientRects().length||getComputedStyle(el).visibility==='hidden')continue;
   reset();const base=el.getBoundingClientRect();if(!base.width||!base.height)continue;
   const chain:string[]=[];for(let p=el.parentElement;p;p=p.parentElement){if(['fixed','sticky'].includes(getComputedStyle(p).position))break;const key=ids.get(p);if(key)chain.push(key);}
   el.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});
   const rect=el.getBoundingClientRect(),offsets:Record<string,{x:number;y:number}>={};
   for(const container of containers){const key=ids.get(container);if(key&&chain.includes(key))offsets[key]={x:container.scrollLeft,y:container.scrollTop};}
   components[id]={center:{x:base.x+base.width/2,y:base.y+base.height/2},reveal:{x:rect.x+rect.width/2,y:rect.y+rect.height/2},chain,offsets};
  }
  reset();return {screen,state,viewport:{width:1440,height:900},components,scrollers};
 },{screen,state});
}
