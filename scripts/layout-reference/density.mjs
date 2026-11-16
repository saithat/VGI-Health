// Measurement mirror of Layout.Check.densityCounts, never used for admission.
// Counts partial rectangle intersections and fixed targets with every window.
export function densityCounts(painted) {
  const boxes=painted.boxes.map(d=>d.box),v=painted.viewport;
  const modal=boxes.some(b=>b.info.interruptive);
  const targets=boxes.filter(b=>b.info.target&&(!modal||b.info.interruptive||b.info.urgent));
  const meets=(a,b)=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;
  const first=targets.filter(b=>meets({x:0,y:0,w:v.w,h:v.h},b.rect)&&b.clips.every(([,r])=>meets(r,b.rect))).length;
  const fixed=targets.filter(b=>!b.clips.length).length;
  let window=fixed;
  for(const q of boxes) {
    const c=q.clips[0];if(!c)continue;
    const [id,r]=c,o=q.rect.y+q.rect.h-1-r.y;
    const count=targets.filter(b=>b.clips[0]?.[0]===id&&meets({...r,y:r.y+o},b.rect)).length;
    window=Math.max(window,fixed+count);
  }
  return {firstViewport:first,scrollWindow:window,fixed};
}
