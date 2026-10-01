import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const start=source.indexOf('  const saveCase = async');
const end=source.indexOf('  /* 저장하지 않은 작업',start);
let patched=0,dialog=false,asNew=false;
const ctx={doc:{title:'Test',people:[]},cases:[],Blob,
  patchDoc:d=>{patched++;ctx.doc=d;},flash:()=>{},t:x=>x,uid:()=>`case-${++ctx.sequence}`,sequence:0,
  storage:null,saveAs:async()=> 'cancelled',setCases:c=>{ctx.cases=c;},
  setFileMenuOpen:()=>{},setSaveAsMode:v=>{asNew=v;},setExitAfterSave:()=>{},setSaveDlg:v=>{dialog=v;},setScreen:()=>{},cleanRef:{current:''}};
vm.createContext(ctx);vm.runInContext(source.slice(start,end)+'\nthis.save=saveCase;this.request=requestSave;',ctx);
assert.equal(await ctx.save('New','file'),'cancelled');assert.equal(patched,0);
ctx.saveAs=async()=> 'picked';
assert.equal(await ctx.save('New','file'),'picked');assert.equal(patched,1);
ctx.request();assert.equal(dialog,true);assert.equal(asNew,false,'Save must retain the original dialog');
ctx.request(true);assert.equal(asNew,true,'Save As must be a separate action');
ctx.storage={set:async()=>{throw Error('quota');}};
assert.equal(await ctx.save('New','device'),'failed');assert.equal(patched,1);
const records=new Map();ctx.storage={set:async(k,v)=>records.set(k,v)};
assert.equal(await ctx.save('New','device'),'saved');const id=ctx.doc.id;
assert.equal(await ctx.save('Renamed','device'),'saved');assert.equal(ctx.doc.id,id);
assert.equal(await ctx.save('Copy','device',true),'saved');assert.notEqual(ctx.doc.id,id);
console.log('Save outcomes: cancellation, original save dialog, same browser case, and Save As copy passed');
