import { multiscript } from './multiscript.mjs';
export const px = n => n * 64;
const text = (key, maxLength, maxLines = 1, extra = {}) => ({ key, maxLength, maxLines, overflow: 'wrap', safety: false, font: 0, fontSize: px(14), lineHeight: px(22), ...extra });
export function template(width = 1440, height = 900) {
  return {
    viewport: { w: px(width), h: px(height) },
    expected: [[0], [1]],
    content: [['patient', 'SYNTHETIC PATIENT  |  DOB 1970-01-01  |  MRN 001  |  Allergies reviewed'], ['sign', 'Sign'], ['review', 'Required review content. Allergy 🧬; route: PO.\n' + 'AdversarialUnbrokenDrugName0123456789'.repeat(7)]],
    tree: { type: 'Absolute', id: 'root', width: 'fill', height: 'fill', children: [
      { type: 'Text', id: 'patient-banner', source: [0], banner: true, z:20, position: { x: px(16), y: px(8) }, width: px(width-32), height: px(80), bg: {r:241,g:245,b:249}, text: text('patient', 128, 2, {safety:true,overflow:'scroll'}) },
      { type: 'Scroll', id: 'review-scroll', position: {x:px(16),y:px(112)}, width:px(width-32), height:px(height-220), children:[
        { type:'Text', id:'review', z:10, width:'fill', height:px(264), text:text('review',512,12,{safety:true,overflow:'scroll'}) },
        { type:'Stack', id:'columns', direction:'row', wrap:true, gap:px(8), children:Array.from({length:12}, (_,i) => ({type:'Rect', id:`column-${i}`, width:px(96+i), height:px(40+i), bg:{r:29,g:78,b:216}})) },
        { type:'Scroll', id:'nested', width:px(600), height:px(120), children:Array.from({length:7},(_,i)=>({type:'Rect',id:`nested-${i}`,width:px(560),height:px(50),bg:{r:180+i,g:200,b:220}})) },
      ] },
      { type: 'Button', id: 'sign', source:[1], commit:true, z:10, position:{x:px(16),y:px(height-80)}, width:px(192), height:px(40), text:text('sign',8), fg:{r:255,g:255,b:255}, bg:{r:29,g:78,b:216} },
    ] },
  };
}
export const requests = [template(), template(1280,800), template(1920,1080)];
for (const r of requests) {
  const body = r.tree.children[1];
  for(let font=0;font<8;font++) {
    const key=`font-${font}`;
    r.content.push([key,font===7?'✓◷':'AVATAR office affinity ffi To Wa WWW iii 0123456789'+(font<6?' SpO₂':'')]);
    body.children.push({type:'Text',id:key,z:10,width:'fill',height:px(128),text:text(key,128,4,{font,fontSize:px(18),lineHeight:px(32)})});
  }
  for (const [script,value] of multiscript) {
    const key=`script-${script}`;
    r.content.push([key,value.repeat(3)]);
    body.children.push({type:'Text',id:key,z:10,width:'fill',height:px(96),text:text(key,0,3,{safety:true,overflow:'scroll'})});
  }
  body.children.push({type:'Grid',id:'many-grid-columns',columns:9,gap:px(4),children:Array.from({length:27},(_,i)=>({type:'Rect',id:`grid-${i}`,width:'fill',height:px(40+i),bg:{r:200,g:200,b:220}}))});
  body.children.push({type:'Absolute',id:'shape-composition',width:'fill',height:px(140),children:[
    {type:'Circle',id:'circle',width:px(90),height:px(90),fg:{r:29,g:78,b:216}},
    {type:'Wedge',id:'rational-wedge',position:{x:px(32),y:px(12)},width:px(100),height:px(100),start:1,sweep:2,denominator:3,fg:{r:185,g:28,b:28}},
    {type:'Polyline',id:'polyline',position:{x:px(160),y:px(12)},width:px(100),height:px(100),points:[{x:0,y:0},{x:px(90),y:px(90)},{x:px(10),y:px(80)}],stroke:64},
  ]});
}
export function adversarial() {
  const r = template();
  r.tree.children.push({type:'Button',id:'tiny',position:{x:-128,y:px(8)},width:px(40),height:px(10),fg:{r:240,g:240,b:240},bg:{r:255,g:255,b:255}});
  r.tree.children.push({...r.tree.children[2],id:'duplicate-source',position:{x:px(16),y:px(820)}});
  return r;
}
