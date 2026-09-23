// Actual SaveHub/P3 backup components + native IDB in isolated Chromium profiles. No real player data.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {startVehicleTestServer} from '../scripts/vehicle-browser-server.mjs';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const server=await startVehicleTestServer();let browser;
const html=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:12px;background:#132931;color:white;font-family:sans-serif}*{box-sizing:border-box}</style></head><body><main></main><script type="module">
import * as model from '../src/expedition-model.js';
import {createExpeditionStore,EXPEDITION_DB} from '../src/expedition-store.js';
import {createExpeditionBackup,makeExpeditionBundle} from '../src/expedition-backup.js';
import {bindSaveHub} from '../src/save-hub-ui.js';
import {createNavalRun} from '../src/naval-checkpoint-model.js';
import {createYacht} from '../src/maritime-rules.js';
const store=createExpeditionStore(),manager=createExpeditionBackup({store});
function make(count=1,node=false){let a=model.newExpeditionCampaign(model.emptyExpedition(),'hard');
 for(let i=0;i<count;i++){const m=model.EXPEDITION_MISSIONS[i];a=model.advanceExpedition(a,{schema:1,id:crypto.randomUUID(),campaignId:a.campaign.id,mission:m.id,rule:m.rule,difficulty:m.selectable?'hard':'fixed',resumed:false,elapsedMs:100000,completedAt:100});}
 if(node){const m=createNavalRun(createYacht(),'hard');m.index=1;m.elapsed=20;const c=model.expeditionCheckpointFromMission({id:crypto.randomUUID(),campaignId:a.campaign.id,mission:'naval',difficulty:'hard',fromStart:true},m);a=model.saveExpeditionCheckpoint(a,c);}return a;}
async function raw(value){await store.read();return new Promise((resolve,reject)=>{const q=indexedDB.open(EXPEDITION_DB);q.onerror=()=>reject(q.error);q.onsuccess=()=>{const db=q.result,tx=db.transaction('checkpoint',value?'readwrite':'readonly'),s=tx.objectStore('checkpoint');let result;const r=value?s.put(value):s.get('state');r.onsuccess=()=>result=r.result;tx.oncomplete=()=>{db.close();resolve(result);};tx.onabort=()=>{db.close();reject(tx.error);};};});}
window.api={store,manager,make,raw,model,bundle:makeExpeditionBundle,dbName:EXPEDITION_DB};bindSaveHub(document.querySelector('main'));window.ready=true;
</script></body></html>`;
try{
  browser=await chromium.launch({headless:true});const errors=[];
  async function context(){const c=await browser.newContext({acceptDownloads:true});await c.route('**/expedition-backup-fixture.html',r=>r.fulfill({contentType:'text/html',body:html}));return c;}
  async function page(c){const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(30000);await p.goto(server.base+'/expedition-backup-fixture.html');await p.waitForFunction(()=>window.ready);return p;}
  const c=await context(),p=await page(c);
  const rawBefore=await p.evaluate(async()=>{localStorage.setItem('neon-eclipse.journey.v7','preserve-fps');const a=api.make(2);a.schema=1;delete a.checkpoint;delete a.undo;await api.raw({id:'state',schema:1,revision:7,operationId:crypto.randomUUID(),checkpoint:a});return api.raw();});
  await p.click('.expedition-backup>summary');await p.waitForFunction(()=>document.querySelector('[data-exp-backup-health]').textContent.includes('2/8'));
  assert(await p.locator('[data-exp-backup-undo]').isDisabled());
  const [download]=await Promise.all([p.waitForEvent('download'),p.click('[data-exp-backup-export]')]);
  const exported=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.equal(exported.kind,'expedition');assert.equal(exported.archive.schema,2);assert.equal(exported.archive.undo,null);assert.equal(exported.archive.records.length,2);
  assert.deepEqual(await p.evaluate(()=>api.raw()),rawBefore,'read/export never migrates the row by writing');
  const incoming=await p.evaluate(()=>api.bundle(api.make(1,true)));
  const upload=async bundle=>{await p.focus('[data-exp-backup-select]');const [chooser]=await Promise.all([p.waitForEvent('filechooser'),p.keyboard.press('Enter')]);await chooser.setFiles({name:'expedition.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bundle))});await p.waitForFunction(()=>document.querySelector('[data-exp-backup-preview]').hidden===false&&document.querySelector('[data-exp-backup]').dataset.busy==='false');};
  await upload(incoming);assert.deepEqual(await p.evaluate(()=>api.raw()),rawBefore);await p.click('[data-exp-backup-cancel]');assert.deepEqual(await p.evaluate(()=>api.raw()),rawBefore);
  await upload(incoming);await p.click('[data-exp-backup-apply]');await p.waitForFunction(()=>document.querySelector('[data-exp-backup-status]').textContent.includes('替换已提交'));
  const applied=await p.evaluate(()=>api.raw());assert.equal(applied.checkpoint.campaign.completed.length,1);assert(applied.checkpoint.checkpoint);assert.deepEqual(applied.checkpoint.undo.archive.records,rawBefore.checkpoint.records);
  await upload(incoming);await p.click('[data-exp-backup-apply]');await p.waitForFunction(()=>document.querySelector('[data-exp-backup-status]').textContent.includes('内容一致'));assert.deepEqual(await p.evaluate(()=>api.raw()),applied,'a new preview of identical content preserves the undo snapshot and revision');
  await p.click('[data-exp-backup-undo]');await p.waitForFunction(()=>!document.querySelector('[data-exp-backup-apply]').disabled);await p.click('[data-exp-backup-apply]');
  await p.waitForFunction(()=>document.querySelector('[data-exp-backup-health]').textContent.includes('2/8'));
  await p.reload();await p.waitForFunction(()=>window.ready);await p.click('.expedition-backup>summary');await p.waitForFunction(()=>document.querySelector('[data-exp-backup-health]').textContent.includes('2/8'));
  assert(!(await p.locator('[data-exp-backup-undo]').isDisabled()));assert.equal(await p.evaluate(()=>localStorage.getItem('neon-eclipse.journey.v7')),'preserve-fps');
  const beforeInvalid=await p.evaluate(()=>api.raw());await p.setInputFiles('[data-exp-backup-file]',{name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"app":"neon-eclipse","kind":"expedition","schema":99}')});
  await p.waitForFunction(()=>document.querySelector('[data-exp-backup-status]').textContent.includes('无效'));assert.deepEqual(await p.evaluate(()=>api.raw()),beforeInvalid);
  await p.setInputFiles('[data-exp-backup-file]',{name:'oversized.json',mimeType:'application/json',buffer:Buffer.alloc(4*1024*1024+1,32)});await p.waitForFunction(()=>document.querySelector('[data-exp-backup-status]').textContent.includes('超过'));assert.deepEqual(await p.evaluate(()=>api.raw()),beforeInvalid);
  assert((await p.evaluate(async()=>{const {createSaveHub}=await import('../src/save-hub.js');return createSaveHub().importBundle({app:'neon-eclipse',schema:1,slots:{}},{mode:'replace'});})).ok);assert.deepEqual(await p.evaluate(()=>api.raw()),beforeInvalid,'original FPS replacement must not clear the expedition database');
  for(const width of [1280,390,320]){await p.setViewportSize({width,height:900});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'backup layout '+width);}
  console.log('PASS SaveHub dedicated UI: legacy read/export, real download, preview/cancel, atomic import+undo, reload, invalid refusal, FPS preservation and narrow layouts');

  // Each fault targets only this isolated test database. Verify the complete row, including undo, survives rollback.
  for(const fault of ['quota','rollback','uncertain']){
    const result=await p.evaluate(async fault=>{
      const before=await api.raw(),plan=await api.manager.previewImport(api.bundle(api.make(1,true)));
      const put=IDBObjectStore.prototype.put,write=api.store.write;let once=true;
      if(fault==='uncertain')api.store.write=async(...args)=>{const r=await write(...args);if(r.ok&&once){once=false;return {ok:false,code:'failed'};}return r;};
      else IDBObjectStore.prototype.put=function(...args){
        if(once&&this.transaction.db.name===api.dbName){once=false;if(fault==='quota')throw new DOMException('Quota','QuotaExceededError');const q=put.apply(this,args),tx=this.transaction;q.addEventListener('success',()=>tx.abort(),{once:true});return q;}return put.apply(this,args);
      };
      try{const failed=await api.manager.apply(plan),during=await api.raw(),retry=await api.manager.apply(plan),after=await api.raw();return {before,failed,during,retry,after};}
      finally{IDBObjectStore.prototype.put=put;api.store.write=write;}
    },fault);
    assert(!result.failed.ok);assert(result.retry.ok);
    if(fault==='uncertain'){assert.equal(result.during.revision,result.after.revision);assert(result.retry.duplicate);}
    else assert.deepEqual(result.during,result.before);
    assert.equal(result.after.revision,result.before.revision+1);assert.deepEqual(result.after.checkpoint.undo.archive.records,result.before.checkpoint.records);
  }
  console.log('PASS native quota and post-put rollback retain both state/undo; uncertain acknowledgement retries without a second replacement');
  const other=await page(c);
  assert(await p.evaluate(async()=>{window.stale=await api.manager.previewImport(api.bundle(api.make(0)));return stale.ok;}));
  assert(await other.evaluate(async()=>{const x=await api.manager.previewImport(api.bundle(api.make(3)));return (await api.manager.apply(x)).ok;}));
  const newest=await other.evaluate(()=>api.raw());assert.equal(await p.evaluate(async()=>(await api.manager.apply(stale)).code),'conflict');assert.deepEqual(await p.evaluate(()=>api.raw()),newest);
  const oldWriter=await p.evaluate(async()=>{const {createCheckpointStore}=await import('../src/joint-checkpoint-store.js');const old=createCheckpointStore({dbName:api.dbName,valid:a=>a?.schema===1,canonical:a=>a});const a=api.make(0);a.schema=1;delete a.checkpoint;delete a.undo;const result=await old.write({operationId:crypto.randomUUID(),checkpoint:a},(await api.raw()).revision);old.close();return result;});assert.equal(oldWriter.code,'corrupt');assert.deepEqual(await p.evaluate(()=>api.raw()),newest,'schema-1 writers cannot downgrade a schema-2 payload');
  await p.evaluate(()=>api.raw({id:'state',schema:1,revision:20,operationId:crypto.randomUUID(),checkpoint:{schema:99,important:'preserve-future'}}));
  assert.equal(await p.evaluate(async()=>(await api.manager.exportBundle()).code),'corrupt');assert.equal(await p.evaluate(async()=>(await api.manager.previewImport(api.bundle(api.make(0)))).code),'corrupt');
  assert.equal((await p.evaluate(()=>api.raw())).checkpoint.important,'preserve-future');await c.close();
  const denied=await context();await denied.addInitScript(()=>Object.defineProperty(globalThis,'indexedDB',{get(){throw new DOMException('Denied','SecurityError');}}));const dp=await page(denied);
  assert.equal(await dp.evaluate(async()=>(await api.manager.exportBundle()).code),'denied');await denied.close();
  assert.deepEqual(errors,[]);console.log('PASS native multi-page CAS, corrupt/future payload preservation and denied storage');
}finally{await browser?.close();await server.stop();}
