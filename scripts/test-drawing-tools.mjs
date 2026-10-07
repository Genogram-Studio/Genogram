import assert from 'node:assert/strict';
import {stepFont,fitInkShape,shapePath,inkBounds,inkHit,findNoteSpace,boxesOverlap} from '../src/drawingTools.js';
let size=12;
for(const expected of [14,16,18,20]){size=stepFont(size,1);assert.equal(size,expected);}
assert.equal(stepFont(13,1),14);assert.equal(stepFont(48,1),48);assert.equal(stepFont(6,-1),6);
const raw={id:'old-stroke',pts:[[0,0,.5],[20,12,.6],[100,50,.5]],w:24,hi:true};
const snapshot=JSON.stringify(raw);
for(const kind of ['ellipse','rectangle','underline','arrow']) {
  const shape=fitInkShape(raw,kind);assert.ok(shapePath(shape).startsWith('M '));
  const converted={...raw,shape,shapeEnabled:true};
  assert.deepEqual(JSON.parse(JSON.stringify(converted)).pts,raw.pts);
  converted.shape={...shape,x:400,y:300};assert.ok(inkBounds(converted).x>390);
  if(kind==='rectangle') {assert.ok(inkHit(converted,400,300,5));assert.ok(!inkHit(converted,0,0,5));}
  converted.shapeEnabled=false;assert.deepEqual(inkBounds(converted),inkBounds(raw));
}
assert.equal(JSON.stringify(raw),snapshot);
const bounds=n=>({x:n.x,y:n.y,w:120,h:80});
const original={id:'n',x:0,y:0,text:'preserve',anchor:{id:'person'}};
const obstacles=[bounds(original),{x:140,y:0,w:120,h:80}];
const placed=findNoteSpace(original,obstacles,bounds);
assert.ok(!obstacles.some(b=>boxesOverlap(bounds(placed),b)));
assert.equal(placed.text,original.text);assert.equal(placed.anchor,original.anchor);
assert.equal(original.x,0);
assert.equal(findNoteSpace(original,[],bounds),original);
console.log('PASS: font steps, shape conversion/original restoration, transformed bounds, collision placement');
