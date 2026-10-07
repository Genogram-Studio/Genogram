export const FONT_STEPS = [6,8,9,10,11,12,14,16,18,20,22,24,28,32,36,48];
export function stepFont(value, direction) {
  return direction > 0 ? FONT_STEPS.find(n=>n>value) ?? 48 : [...FONT_STEPS].reverse().find(n=>n<value) ?? 6;
}

// Raw points remain untouched; a separate shape describes the optional clean drawing.
export function fitInkShape(stroke, kind) {
  const pts=stroke.pts||[];
  if(pts.length<2)return null;
  const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
  const first=pts[0],last=pts[pts.length-1];
  return {kind,x:Math.min(...xs),y:kind==='underline'?ys.reduce((a,b)=>a+b,0)/ys.length:Math.min(...ys),
    w:Math.max(8,Math.max(...xs)-Math.min(...xs)),h:kind==='underline'?0:Math.max(8,Math.max(...ys)-Math.min(...ys)),
    reverseX:last[0]<first[0],reverseY:last[1]<first[1]};
}
export function shapePath(s) {
  const {x,y,w,h,kind}=s;
  if(kind==='ellipse')return `M ${x+w/2} ${y} A ${w/2} ${h/2} 0 1 1 ${x+w/2} ${y+h} A ${w/2} ${h/2} 0 1 1 ${x+w/2} ${y} Z`;
  if(kind==='rectangle') {
    const r=Math.min(8,w/8,h/8);
    return `M ${x+r} ${y} H ${x+w-r} Q ${x+w} ${y} ${x+w} ${y+r} V ${y+h-r} Q ${x+w} ${y+h} ${x+w-r} ${y+h} H ${x+r} Q ${x} ${y+h} ${x} ${y+h-r} V ${y+r} Q ${x} ${y} ${x+r} ${y} Z`;
  }
  if(kind==='underline')return `M ${x} ${y} H ${x+w}`;
  const ax=s.reverseX?x+w:x,ay=s.reverseY?y+h:y,bx=s.reverseX?x:x+w,by=s.reverseY?y:y+h;
  const angle=Math.atan2(by-ay,bx-ax),head=Math.min(20,Math.max(8,Math.hypot(w,h)*.18));
  return `M ${ax} ${ay} L ${bx} ${by} M ${bx-head*Math.cos(angle-.48)} ${by-head*Math.sin(angle-.48)} L ${bx} ${by} L ${bx-head*Math.cos(angle+.48)} ${by-head*Math.sin(angle+.48)}`;
}
export function inkBounds(stroke) {
  const s=stroke.shapeEnabled&&stroke.shape;
  const pts=stroke.pts||[];
  const pad=(s?Math.min(4,stroke.w||2):stroke.w||2)/2+2;
  if(s)return {x:s.x-pad,y:s.y-pad,w:s.w+pad*2,h:s.h+pad*2};
  if(!pts.length)return {x:0,y:0,w:0,h:0};
  const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
  return {x:Math.min(...xs)-pad,y:Math.min(...ys)-pad,w:Math.max(...xs)-Math.min(...xs)+pad*2,h:Math.max(...ys)-Math.min(...ys)+pad*2};
}
export function inkHit(stroke,x,y,radius) {
  const s=stroke.shapeEnabled&&stroke.shape;
  let pts=stroke.pts||[];
  if(s){
    const {x:a,y:b,w,h}=s;
    if(s.kind==='ellipse')pts=Array.from({length:65},(_,i)=>[a+w/2+w/2*Math.cos(i*Math.PI/32),b+h/2+h/2*Math.sin(i*Math.PI/32)]);
    else if(s.kind==='rectangle')pts=[[a,b],[a+w,b],[a+w,b+h],[a,b+h],[a,b]];
    else if(s.kind==='underline')pts=[[a,b],[a+w,b]];
    else {const values=shapePath(s).match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi).map(Number);pts=[];for(let i=0;i<values.length;i+=2)pts.push([values[i],values[i+1]]);}
  }
  return pts.some((p,i)=>{
    const q=pts[Math.max(0,i-1)],dx=p[0]-q[0],dy=p[1]-q[1];
    const t=Math.max(0,Math.min(1,((x-q[0])*dx+(y-q[1])*dy)/(dx*dx+dy*dy||1)));
    return Math.hypot(x-q[0]-t*dx,y-q[1]-t*dy)<radius;
  });
}
export const boxesOverlap=(a,b,gap=16)=>a.x<b.x+b.w+gap&&a.x+a.w+gap>b.x&&a.y<b.y+b.h+gap&&a.y+a.h+gap>b.y;
export function findNoteSpace(note, obstacles, bounds) {
  const b=bounds(note);
  if(!obstacles.some(o=>boxesOverlap(b,o)))return note;
  // Search nearest free space without changing text, anchors, or box dimensions.
  const step=32;
  for(let r=1;r<=80;r++) {
    const candidates=[];
    for(let i=-r;i<=r;i++) {
      candidates.push([i*step,-r*step],[i*step,r*step]);
      if(Math.abs(i)!==r)candidates.push([-r*step,i*step],[r*step,i*step]);
    }
    candidates.sort((a,b)=>Math.hypot(...a)-Math.hypot(...b));
    for(const [dx,dy] of candidates)if(!obstacles.some(o=>boxesOverlap({...b,x:b.x+dx,y:b.y+dy},o)))return {...note,x:note.x+dx,y:note.y+dy};
  }
  const right=Math.max(b.x,...obstacles.map(o=>o.x+o.w))+32;
  return {...note,x:note.x+right-b.x};
}
