// Browser smoke (L3): the shortest path that proves the shipped pages still boot and the core loops work.
// Runs its own static server on a free port and an isolated Chromium context, so it never touches the
// player's real localStorage / IndexedDB and never depends on a dev server already running on 5173.
// Env: VEHICLE_PLAYWRIGHT_MODULE (module path), SMOKE_KEEP_SERVER=1 to reuse GAME_TEST_URL instead of spawning.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {MAP_REGISTRY} from './maps/registry.js';

const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const root=path.dirname(fileURLToPath(import.meta.url));
const started=Date.now();
const log=(...a)=>console.log(`[smoke ${((Date.now()-started)/1000).toFixed(1)}s]`,...a);

async function freePort(){return new Promise((resolve,reject)=>{const s=createServer();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{const {port}=s.address();s.close(()=>resolve(port));});});}
async function startServer(){
 if(process.env.GAME_TEST_URL&&process.env.SMOKE_KEEP_SERVER==='1')return {base:new URL(process.env.GAME_TEST_URL).origin,stop(){}};
 const port=await freePort();
 const child=spawn(process.execPath,['server.cjs'],{cwd:root,env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(new Error('server start timeout')),15000);child.stdout.on('data',d=>{if(String(d).includes('ready')){clearTimeout(t);resolve();}});child.on('exit',c=>{clearTimeout(t);reject(new Error('server exited '+c));});});
 return {base:`http://127.0.0.1:${port}`,stop(){child.kill();}};
}

const server=await startServer();
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
async function step(name,fn){const t=Date.now();try{await fn();results.push({name,ok:true,ms:Date.now()-t});log('ok  ',name);}catch(e){results.push({name,ok:false,ms:Date.now()-t,error:e});log('FAIL',name,'\n',e?.stack||e);}}
async function newPage(context){const page=await context.newPage();page.setDefaultTimeout(45000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!/WebGL|GPU|swiftshader|Automatic fallback/i.test(m.text()))errors.push('console: '+m.text());});return {page,errors};}
const menuOpen=page=>page.waitForFunction(()=>document.body.dataset.menuOpen==='true');
const playing=page=>page.waitForFunction(()=>document.body.dataset.menuOpen==='false');
async function confirmIfShown(page){const dialog=page.locator('.menu-confirm');if(await dialog.isVisible().catch(()=>false))await page.click('#menu-confirm-ok');}

try{
 const context=await browser.newContext({viewport:{width:1280,height:850}});
 const SENTINEL='smoke-real-save-sentinel';

 // 1. Every registered chapter boots: menu, WebGL canvas, chapter attribute, no page errors.
 for(const m of MAP_REGISTRY){
  await step(`chapter ${m.id} boots`,async()=>{
   const {page,errors}=await newPage(context);
   await page.goto(`${server.base}/index.html?map=${m.id}`);
   await menuOpen(page);
   assert.equal(await page.getAttribute('body','data-map'),m.id);
   assert.ok(await page.locator('#game canvas').count()>=1,'canvas present');
   const gl=await page.evaluate(()=>{const c=document.querySelector('#game canvas');return !!(c&&(c.getContext('webgl2')||c.getContext('webgl')));});
   assert.ok(gl,'WebGL context');
   assert.ok(await page.locator('#menu-new').isVisible());
   assert.match(await page.locator(`.menu-chapter-grid a[data-map="${m.id}"]`).getAttribute('aria-current')||'',/page/);
   assert.deepEqual(errors,[]);
   await page.close();
  });
 }

 // 2. Chapter 1: new game -> playing -> Esc pause -> retry stage -> playing; storage sentinel untouched.
 await step('start / pause / retry loop',async()=>{
  const {page,errors}=await newPage(context);
  await page.goto(`${server.base}/index.html`);await menuOpen(page);
  await page.evaluate(k=>localStorage.setItem(k,'keep'),SENTINEL);
  await page.click('#menu-new');await confirmIfShown(page);await playing(page);
  assert.equal(await page.getAttribute('body','data-play-state'),'playing');
  await page.waitForTimeout(600);
  await page.keyboard.press('Escape');await menuOpen(page);
  assert.equal(await page.getAttribute('body','data-play-state'),'paused');
  await page.click('#menu-context-restart');await page.click('#menu-confirm-ok');await playing(page);
  await page.keyboard.press('Escape');await menuOpen(page);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),SENTINEL),'keep');
  assert.ok(await page.evaluate(()=>localStorage.getItem('neon-eclipse.journey.v6')!==null),'journey slot written after new game');
  assert.deepEqual(errors,[]);
  await page.close();
 });

 // 2b. Phase 2 audio: context unlocks on the first gesture, pause/blur suspend it, volumes persist,
 // firing / reload / telegraphs run without console errors, and the settings panel round-trips.
 await step('audio: unlock, pause suspend, volume persistence, sfx during play',async()=>{
  const {page,errors}=await newPage(context);
  await page.goto(`${server.base}/index.html`);await menuOpen(page);
  assert.equal(await page.evaluate(()=>window.neonAudio?.bus.snapshot().state),'none','no AudioContext before a gesture');
  await page.click('#menu-new');await confirmIfShown(page);await playing(page);
  await page.waitForTimeout(400);
  const snap=await page.evaluate(()=>window.neonAudio.bus.snapshot());
  assert.ok(snap.state==='running'||snap.state==='suspended','context exists after gesture: '+snap.state);
  // Fire, reload, swing the blade; all must go through the procedural player without throwing.
  await page.mouse.move(640,360);await page.mouse.down();await page.waitForTimeout(350);await page.mouse.up();
  await page.keyboard.press('KeyR');await page.keyboard.press('Digit4');await page.mouse.click(640,360);await page.waitForTimeout(700);
  const stats=await page.evaluate(()=>({voices:window.neonAudio.sfx.stats().played,state:window.neonAudio.director?.state}));
  assert.ok(stats.voices>=3,'sfx played during play: '+stats.voices);
  assert.ok(['explore','combat','boss'].includes(stats.state),'music state while playing: '+stats.state);
  await page.keyboard.press('Escape');await menuOpen(page);
  const paused=await page.evaluate(()=>window.neonAudio.bus.snapshot());
  assert.ok(paused.suspendedBy.includes('paused'),'bus held while paused: '+JSON.stringify(paused));
  // Settings live on the home page of the menu, not the pause context page.
  await page.reload();await menuOpen(page);
  await page.click('#menu-settings');await page.waitForSelector('#menu-audio [data-audio-bus="music"]');
  await page.locator('#menu-audio [data-audio-bus="music"]').fill('20');
  await page.locator('#menu-audio [data-audio-mute]').check();
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('neon-eclipse.audio.v1')));
  assert.equal(stored.music,.2);assert.equal(stored.muted,true);
  await page.reload();await menuOpen(page);await page.click('#menu-settings');await page.waitForSelector('#menu-audio [data-audio-bus="music"]');
  assert.equal(await page.locator('#menu-audio [data-audio-bus="music"]').inputValue(),'20','music slider restored');
  assert.equal(await page.locator('#menu-audio [data-audio-mute]').isChecked(),true,'mute restored');
  await page.locator('#menu-audio [data-audio-mute]').uncheck();
  await page.click('#menu-audio .menu-audio-lab summary');
  await page.click('#menu-audio [data-audio-preview="kill"]');await page.waitForTimeout(150);
  assert.ok(await page.evaluate(()=>window.neonAudio.sfx.stats().played)>=1,'preview played after unlock');
  assert.deepEqual(errors,[]);
  await page.close();
 });

 // 3. Legacy journey v3 import is honoured and the old key preserved (migration sanity).
 await step('legacy journey v3 migration keeps old key',async()=>{
  const ctx=await browser.newContext({viewport:{width:1280,height:850}});
  const {page,errors}=await newPage(ctx);
  await page.goto(`${server.base}/index.html`);await menuOpen(page);
  const legacy={version:3,status:'between',next:'roof',results:[{time:120,kills:10},{time:140,kills:12}],checkpoint:null};
  await page.evaluate(v=>{localStorage.clear();localStorage.setItem('neon-eclipse.journey.v3',JSON.stringify(v));},legacy);
  await page.reload();await menuOpen(page);
  assert.equal(await page.evaluate(()=>localStorage.getItem('neon-eclipse.journey.v3')!==null),true,'legacy key preserved');
  const hint=await page.locator('#menu-continue').getAttribute('aria-disabled');
  assert.notEqual(hint,'true','continue available with legacy record');
  assert.deepEqual(errors,[]);
  await ctx.close();
 });

 // 4. Settings: SaveHub health/export/import round trip + telemetry toggle, all inside the isolated context.
 await step('settings: save hub export/import and telemetry toggle',async()=>{
  const {page,errors}=await newPage(context);
  await page.goto(`${server.base}/index.html`);await menuOpen(page);
  await page.evaluate(()=>{localStorage.setItem('neon-eclipse.combat-difficulty.v1','hard');localStorage.setItem('neon-eclipse.stars.v1',JSON.stringify({version:3,stars:['reactor'],legacyRequired:0}));});
  await page.reload();await menuOpen(page);
  await page.click('#menu-settings');
  await page.waitForSelector('#menu-save-hub [data-save-export]');
  const health=await page.locator('#menu-save-hub .menu-save-hub-group span').allTextContents();
  assert.ok(health.some(t=>/主线战斗难度 · 正常/.test(t)),'difficulty slot healthy: '+health.join('|'));
  assert.ok(health.some(t=>/隐藏星星 · 正常/.test(t)));
  const download=page.waitForEvent('download');
  await page.click('#menu-save-hub [data-save-export]');
  const file=await download;
  const text=await (await import('node:fs/promises')).readFile(await file.path(),'utf8');
  const bundle=JSON.parse(text);
  assert.equal(bundle.app,'neon-eclipse');assert.equal(bundle.slots['neon-eclipse.combat-difficulty.v1'],'hard');
  assert.match(await page.locator('#menu-save-hub [data-save-status]').textContent(),/已导出/);
  // Import a modified bundle: preview -> merge -> difficulty changes, backup exists, restore reverts.
  bundle.slots['neon-eclipse.combat-difficulty.v1']='easy';
  await page.setInputFiles('#menu-save-hub [data-save-file]',{name:'bundle.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bundle))});
  await page.waitForSelector('#menu-save-hub [data-save-apply="merge"]');
  assert.match(await page.locator('#menu-save-hub [data-save-preview]').textContent(),/主线战斗难度 — 覆盖/);
  await page.click('#menu-save-hub [data-save-apply="merge"]');
  await page.waitForFunction(()=>/导入完成/.test(document.querySelector('#menu-save-hub [data-save-status]').textContent));
  assert.equal(await page.evaluate(()=>localStorage.getItem('neon-eclipse.combat-difficulty.v1')),'easy');
  assert.ok(await page.evaluate(()=>localStorage.getItem('neon-eclipse.save-hub.backup.v1')!==null),'pre-import backup written');
  await page.click('#menu-save-hub [data-save-restore]');
  await page.waitForFunction(()=>/已恢复/.test(document.querySelector('#menu-save-hub [data-save-status]').textContent));
  assert.equal(await page.evaluate(()=>localStorage.getItem('neon-eclipse.combat-difficulty.v1')),'hard');
  // Invalid file is rejected without touching storage.
  await page.setInputFiles('#menu-save-hub [data-save-file]',{name:'x.json',mimeType:'application/json',buffer:Buffer.from('{"app":"other"}')});
  await page.waitForFunction(()=>/不是 NEON ECLIPSE/.test(document.querySelector('#menu-save-hub [data-save-status]').textContent));
  assert.equal(await page.evaluate(()=>localStorage.getItem('neon-eclipse.combat-difficulty.v1')),'hard');
  // Telemetry toggle persists.
  const toggle=page.locator('#menu-telemetry [data-telemetry-toggle]');
  assert.equal(await toggle.isChecked(),true);
  await toggle.uncheck();
  assert.equal(await page.evaluate(()=>localStorage.getItem('neon-eclipse.telemetry-enabled.v1')),'false');
  await toggle.check();
  assert.equal(await page.evaluate(()=>localStorage.getItem('neon-eclipse.telemetry-enabled.v1')),'true');
  assert.deepEqual(errors,[]);
  await page.close();
 });

 // 5. Telemetry writes one record when an attempt ends (forced loss via exposed hook is not available; use death by hazard-free path: call end through retry of a lost state is internal).
 //    We verify the plumbing instead: telemetry object exposed, enabled, store readable, and a synthetic record round-trips through IndexedDB in this origin.
 await step('telemetry store round trip in browser IndexedDB',async()=>{
  const {page,errors}=await newPage(context);
  await page.goto(`${server.base}/index.html`);await menuOpen(page);
  const r=await page.evaluate(async()=>{
   const t=window.neonTelemetry;if(!t)return {ok:false,code:'no-hook'};
   const mod=await import('./telemetry.js');
   const attempt=mod.createTelemetryAttempt({map:'reactor',mode:'campaign',difficulty:'normal'});
   const saved=await t.record({attempt,won:false,stages:[{stage:0,seconds:3,damage:20,shots:4,coreHits:0,windows:0,usedWindows:0,death:{x:1,z:2,feet:0}}],kills:1,time:3,endStage:0});
   const read=await t.read();
   const cleared=await t.clear();
   const after=await t.read();
   return {ok:saved.ok,count:read.ok?read.records.length:-1,cleared:cleared.ok,after:after.ok?after.records.length:-1};
  });
  assert.equal(r.ok,true,'telemetry saved: '+JSON.stringify(r));
  assert.ok(r.count>=1);assert.equal(r.cleared,true);assert.equal(r.after,0);
  assert.deepEqual(errors,[]);
  await page.close();
 });

 // 6. Vehicle proving ground page boots and the entry dialog from the FPS menu exists.
 await step('vehicle page boots and menu entry exists',async()=>{
  const {page,errors}=await newPage(context);
  await page.goto(`${server.base}/index.html`);await menuOpen(page);
  await page.click('#menu-levels');
  assert.ok(await page.locator('#menu-rover').isVisible(),'vehicle entry visible on level select');
  await page.click('#menu-rover');
  assert.ok(await page.locator('.menu-confirm').isVisible(),'vehicle entry asks for confirmation');
  await page.click('#menu-confirm-cancel');
  await page.goto(`${server.base}/vehicle.html`);
  await page.waitForFunction(()=>!!document.querySelector('canvas'),null,{timeout:45000});
  await page.waitForTimeout(1500);
  const fatal=errors.filter(e=>!/ResizeObserver/.test(e));
  assert.deepEqual(fatal,[]);
  await page.close();
 });

 await context.close();
}finally{
 await browser.close();server.stop();
}
const failed=results.filter(r=>!r.ok);
for(const r of results)console.log(`${r.ok?'PASS':'FAIL'} ${r.name} (${r.ms} ms)`);
console.log(`smoke: ${results.length-failed.length}/${results.length} passed in ${((Date.now()-started)/1000).toFixed(1)} s`);
if(failed.length)process.exit(1);
console.log('PASS: browser smoke — six chapters boot with WebGL, start/pause/retry, legacy journey migration, save hub export/import/restore, telemetry toggle and IndexedDB round trip, vehicle page; isolated context, real saves untouched');
