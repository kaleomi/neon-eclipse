// Real IndexedDB transactions in isolated contexts; no production/player databases are touched.
import assert from 'node:assert/strict';
import {startVehicleTestServer} from '../scripts/vehicle-browser-server.mjs';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const server=await startVehicleTestServer();let browser;
const html=`<!doctype html><html><body><script type="module">
import {createExpeditionStore,EXPEDITION_DB} from '../src/expedition-store.js';
import {createExpeditionSession} from '../src/expedition-session.js';
window.dbName=EXPEDITION_DB;window.store=createExpeditionStore();window.session=createExpeditionSession({store,onChange:s=>window.snapshot=s});
await session.load();window.ready=true;
</script></body></html>`;
try{
  browser=await chromium.launch({headless:true});const errors=[];
  async function context(){const c=await browser.newContext();await c.route('**/expedition-storage-fixture.html',route=>route.fulfill({contentType:'text/html',body:html}));return c;}
  async function page(c){const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(30000);await p.goto(server.base+'/expedition-storage-fixture.html');await p.waitForFunction(()=>window.ready);return p;}
  const c=await context(),left=await page(c),right=await page(c);
  assert(await left.evaluate(()=>session.newCampaign('normal')));assert.equal(await right.evaluate(()=>session.newCampaign('hard')),false);
  assert.equal(await right.evaluate(()=>snapshot.error),'conflict');assert.equal(await right.evaluate(()=>session.retry()),false);
  assert.equal(await left.evaluate(async()=>(await store.read()).checkpoint.campaign.difficulty),'normal');
  assert(await right.evaluate(()=>session.load({discard:true})));assert(await right.evaluate(()=>session.newCampaign('hard')));
  assert.equal(await left.evaluate(async()=>(await store.read()).checkpoint.campaign.difficulty),'hard');await c.close();
  console.log('PASS: real multi-page CAS refuses stale overwrites and adopts only after explicit reload');

  const q=await context(),qp=await page(q);
  await qp.evaluate(()=>{const original=IDBObjectStore.prototype.put;let fail=true;IDBObjectStore.prototype.put=function(...args){if(fail&&this.transaction.db.name===dbName){fail=false;throw new DOMException('Quota','QuotaExceededError');}return original.apply(this,args);};});
  assert.equal(await qp.evaluate(()=>session.newCampaign('easy')),false);assert.equal(await qp.evaluate(()=>snapshot.error),'quota');assert(await qp.evaluate(()=>snapshot.pending));
  assert.equal(await qp.evaluate(async()=>(await store.read()).checkpoint),null,'failed transaction creates no progress');
  assert(await qp.evaluate(()=>session.retry()));assert.equal(await qp.evaluate(async()=>(await store.read()).revision),1);await q.close();
  console.log('PASS: quota failure keeps a retryable operation and does not optimistically advance');

  const rollback=await context(),rp=await page(rollback);
  await rp.evaluate(()=>{const original=IDBObjectStore.prototype.put;let fail=true;IDBObjectStore.prototype.put=function(...args){const request=original.apply(this,args);if(fail&&this.transaction.db.name===dbName){fail=false;const tx=this.transaction;request.addEventListener('success',()=>tx.abort(),{once:true});}return request;};});
  assert.equal(await rp.evaluate(()=>session.newCampaign('normal')),false);assert.equal(await rp.evaluate(async()=>(await store.read()).checkpoint),null);
  assert(await rp.evaluate(()=>session.retry()));assert.equal(await rp.evaluate(async()=>(await store.read()).revision),1);await rollback.close();
  console.log('PASS: abort after successful put rolls the entire progress transaction back');

  const uncertain=await context(),up=await page(uncertain);
  await up.evaluate(()=>{const write=store.write;let once=true;store.write=async(...args)=>{const r=await write(...args);if(r.ok&&once){once=false;return {ok:false,code:'failed'};}return r;};});
  assert.equal(await up.evaluate(()=>session.newCampaign('normal')),false);assert.equal(await up.evaluate(async()=>(await store.read()).revision),1);
  assert(await up.evaluate(()=>session.retry()));assert.equal(await up.evaluate(async()=>(await store.read()).revision),1,'same operation id dedupes committed-but-unacknowledged result');await uncertain.close();
  console.log('PASS: unknown commit outcome retries idempotently without creating another revision');

  const corrupt=await context(),cp=await page(corrupt);
  await cp.evaluate(()=>new Promise((resolve,reject)=>{const q=indexedDB.open(dbName);q.onerror=()=>reject(q.error);q.onsuccess=()=>{const db=q.result,tx=db.transaction('checkpoint','readwrite');tx.objectStore('checkpoint').put({id:'state',schema:99,important:'keep-original'});tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>reject(tx.error);};}));
  assert.equal(await cp.evaluate(()=>session.load()),false);assert.equal(await cp.evaluate(()=>snapshot.error),'corrupt');assert.equal(await cp.evaluate(()=>session.newCampaign('easy')),false);
  const raw=await cp.evaluate(()=>new Promise(resolve=>{const q=indexedDB.open(dbName);q.onsuccess=()=>{const db=q.result,tx=db.transaction('checkpoint'),r=tx.objectStore('checkpoint').get('state');r.onsuccess=()=>resolve(r.result);tx.oncomplete=()=>db.close();};}));
  assert.equal(raw.important,'keep-original');assert.equal(raw.schema,99);await corrupt.close();
  const future=await context(),fp=await page(future);
  await fp.evaluate(()=>new Promise((resolve,reject)=>{const q=indexedDB.open(dbName,2);q.onsuccess=()=>{q.result.close();resolve();};q.onerror=()=>reject(q.error);}));assert.equal(await fp.evaluate(()=>session.load()),false);assert.equal(await fp.evaluate(()=>snapshot.error),'corrupt');await future.close();
  const denied=await context();await denied.addInitScript(()=>Object.defineProperty(globalThis,'indexedDB',{get(){throw new DOMException('Denied','SecurityError');}}));const dp=await page(denied);
  assert.equal(await dp.evaluate(()=>snapshot.error),'denied');assert.equal(await dp.evaluate(()=>session.newCampaign('normal')),false);await denied.close();
  assert.deepEqual(errors,[]);console.log('PASS: corrupt/future-schema preservation and denied storage; no silent reset or cross-domain save writes');
}finally{await browser?.close();await server.stop();}
