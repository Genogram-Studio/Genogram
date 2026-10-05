import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const start=source.indexOf('  const saveCase = async');
const end=source.indexOf('  /* 저장하지 않은 작업',start);
const writes=[],alerts=[],confirms=[],records=new Map();let patched=0,dialog=false,exitScreen=null,picks=0;
const handle={name:'case.genogram.json'};
const ctx={doc:{title:'Case',people:[]},cases:[],Blob,currentTargetRef:{current:{kind:'file',handle}},
  patchDoc:d=>{patched++;ctx.doc=d;},flash:()=>{},t:x=>x,tr:x=>x[1],li:1,uid:()=>`case-${++ctx.sequence}`,sequence:0,
  storage:{set:async(k,v)=>records.set(k,v)},setCases:c=>{ctx.cases=c;},writeCaseHandle:async(h,b)=>writes.push({h,text:await b.text()}),
  window:{confirm:m=>{confirms.push(m);return ctx.accept;},alert:m=>alerts.push(m),showSaveFilePicker:async()=>{picks++;return handle;}},
  accept:false,download:()=>{},setFileMenuOpen:()=>{},setSaveAsMode:()=>{},setExitAfterSave:()=>{},
  setSaveDlg:v=>{dialog=v;},setScreen:v=>{exitScreen=v;},cleanRef:{current:''}};
vm.createContext(ctx);vm.runInContext(source.slice(start,end)+'\nthis.save=saveCase;this.request=requestSave;this.exit=exitCase;',ctx);
assert.equal(await ctx.request(),'cancelled');assert.equal(writes.length,0);
ctx.accept=true;assert.equal(await ctx.request(),'saved');assert.equal(writes.length,1);assert.equal(picks,0);
assert.match(confirms.at(-1),/기존 저장 내용이 새 내용으로 바뀝니다/);
assert.equal(await ctx.request(false,true),'saved');assert.equal(exitScreen,'home');
ctx.currentTargetRef.current={kind:'unwritable-file',name:'old.json'};dialog=false;
assert.equal(await ctx.request(),'dialog');assert.equal(dialog,true);assert.match(alerts.at(-1),/원본 파일은 바뀌지 않습니다/);assert.equal(writes.length,2);
ctx.currentTargetRef.current=null;dialog=false;assert.equal(await ctx.request(),'dialog');assert.equal(dialog,true);
ctx.currentTargetRef.current={kind:'browser',id:'existing'};ctx.doc={id:'existing',title:'Browser',people:[]};
assert.equal(await ctx.request(),'saved');assert.equal(JSON.parse(records.get('gs:case:existing')).title,'Browser');
assert.equal(await ctx.save('Copy','device',true),'saved');assert.notEqual(ctx.doc.id,'existing');
ctx.currentTargetRef.current=null;assert.equal(await ctx.save('New','file'),'saved');assert.equal(picks,1);
console.log('Save flow: overwrite warning, direct file/browser save, unsupported-browser notice, Save As passed');
