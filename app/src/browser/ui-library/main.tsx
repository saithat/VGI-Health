import { createRoot } from 'react-dom/client';
import { output } from './schema';
import { Painter } from './Painter';
import './painter.css';
const root=document.getElementById('root');
if(!root) throw new Error('Missing harness root');
const renderer=createRoot(root);
// Read-only harness input. No clinical API, deployment or generator connection.
window.addEventListener('message',(event:MessageEvent<unknown>)=>{
  if(event.source!==window) return;
  const parsed=output.safeParse(event.data);
  if(!parsed.success) return;
  const data=parsed.data;
  renderer.render(<main data-accepted={String(data.accepted)} style={{position:'fixed',left:0,top:0,width:data.viewport.w/64,height:data.viewport.h/64}}><Painter boxes={data.boxes}/></main>);
});
renderer.render(<p>Supply native ui-layout output to this isolated drawing harness.</p>);
