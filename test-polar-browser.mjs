// Chapter 09 browser check (L3, opt-in): boots the polar radar array in an isolated Chromium context,
// verifies the weather HUD / whiteout fog + thermal flag / warmth drain and hut recovery / frostbite damage, then replays
// the boss stage and checks the GLACIER panel armored -> sunk gating, and the v6 (eight-chapter) journey archive import. Own static server.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const root=path.dirname(fileURLToPath(import.meta.url));
async function freePort(){return new Promise((resolve,reject)=>{const s=createServer();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{const {port}=s.address();s.close(()=>resolve(port));});});}
const port=await freePort();
const child=spawn(process.execPath,['server.cjs'],{cwd:root,env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(new Error('server start timeout')),15000);child.stdout.on('data',d=>{if(String(d).includes('ready')){clearTimeout(t);resolve();}});child.on('exit',c=>{clearTimeout(t);reject(new Error('server exited '+c));});});
const base=`http://127.0.0.1:${port}`;
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
async function step(name,fn){try{await fn();results.push({name,ok:true});console.log('ok  ',name);}catch(e){results.push({name,ok:false});console.log('FAIL',name,'\n',e?.stack||e);}}
const menuOpen=page=>page.waitForFunction(()=>document.body.dataset.menuOpen==='true');
const playing=page=>page.waitForFunction(()=>document.body.dataset.menuOpen==='false');
async function newPage(context){const page=await context.newPage();page.setDefaultTimeout(45000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!/WebGL|GPU|swiftshader|Automatic fallback/i.test(m.text()))errors.push(m.text());});return {page,errors};}
const probe=page=>page.evaluate(()=>window.__polarProbe?.());
try{
 const context=await browser.newContext({viewport:{width:1280,height:850}});
 await step('polar boots with ninth chapter in menu',async()=>{
  const {page,errors}=await newPage(context);
  await page.goto(`${base}/index.html?map=polar`);await menuOpen(page);
  assert.equal(await page.getAttribute('body','data-map'),'polar');
  assert.equal(await page.locator('.menu-chapter-grid a[data-map]').count(),9,'nine chapter cards');
  assert.match(await page.locator('.menu-chapter-grid a[data-map="polar"]').getAttribute('aria-current')||'',/page/);
  assert.match(await page.locator('.menu-chapter-grid a[data-map="polar"]').innerText(),/极地雷达阵列/);
  assert.deepEqual(errors,[]);await page.close();
 });
 await step('single run: weather HUD clear -> whiteout (fog + thermal), warmth drains outdoors and recovers in the hut, frostbite at zero, checkpoint carries stormTime/warmth',async()=>{
  const {page,errors}=await newPage(context);
  await page.goto(`${base}/index.html?map=polar&menu=chapter`);await menuOpen(page);
  await page.click('#deploy');await playing(page);
  await page.waitForFunction(()=>document.querySelector('.hazard-notice.polar-notice')&&!document.querySelector('.hazard-notice.polar-notice').hidden);
  // Hounds are fast; keep the player alive through the long waits (probe heal, test-only) so warmth/hazard keep ticking.
  await page.evaluate(()=>{window.__polarKeepAlive=setInterval(()=>window.__polarProbe().heal(),400);});
  const first=await probe(page);assert.equal(first.stage,0);assert.equal(first.phase,'clear');assert.equal(first.thermal,false);assert.ok(first.warmth>95,'starts warm '+first.warmth);
  assert.match(await page.locator('.hazard-notice.polar-notice').innerText(),/天气 晴/);
  const clearFog=first.fogDensity;
  // Jump the storm clock into the whiteout (starts at 23 s).
  await page.evaluate(()=>window.__polarProbe().advanceStorm(24));
  await page.waitForFunction(()=>window.__polarProbe().phase==='whiteout',null,{timeout:10000});
  await page.waitForFunction(()=>document.querySelector('.hazard-notice.polar-notice').dataset.storm==='whiteout',null,{timeout:5000});
  const storm=await probe(page);assert.equal(storm.thermal,true,'thermal vision during whiteout');assert.ok(storm.fogDensity>clearFog*3,'fog thickens '+clearFog+' -> '+storm.fogDensity);assert.ok(storm.visibility<12,'visibility '+storm.visibility);
  assert.match(await page.locator('.hazard-notice.polar-notice').innerText(),/暴风雪/);assert.match(await page.locator('.hazard-notice.polar-notice').innerText(),/热成像/);
  // Outdoors in the storm the warmth drops; inside the west hut it climbs back.
  // Headless frames are slow (dt is capped per frame), so wait on game-state conditions rather than wall time.
  await page.evaluate(()=>window.__polarProbe().place(0,10,0,0));const w0=(await probe(page)).warmth;
  await page.waitForFunction(w=>window.__polarProbe().warmth<w-3,w0,{timeout:30000});const w1=(await probe(page)).warmth;assert.ok(w1<w0-3,'warmth drains outdoors '+w0+' -> '+w1);
  // Start the hut check from 60 so the +10 recovery is not clipped by the 100 cap.
  await page.evaluate(()=>{window.__polarProbe().place(-28,22,0,0);window.__polarProbe().setWarmth(60);});
  await page.waitForFunction(()=>window.__polarProbe().warmth>70,null,{timeout:30000});const w2=(await probe(page)).warmth;assert.ok(w2>70,'hut recovers warmth 60 -> '+w2);
  assert.match(await page.locator('.hazard-notice.polar-notice').innerText(),/暖房回温/);
  // Frostbite: force warmth to zero outdoors -> hazard damage ticks and the HUD flags it.
  await page.evaluate(()=>{window.__polarProbe().place(0,10,0,0);window.__polarProbe().setWarmth(0);});
  await page.evaluate(()=>clearInterval(window.__polarKeepAlive));await page.evaluate(()=>window.__polarProbe().heal());
  await page.waitForFunction(()=>window.__polarProbe().health<100&&/冻伤/.test(document.querySelector('.hazard-notice.polar-notice').textContent),null,{timeout:15000});
  assert.equal(await page.locator('.hazard-notice.polar-notice').getAttribute('data-phase'),'live');assert.match(await page.locator('.hazard-notice.polar-notice').innerText(),/冻伤/);
  // Tower deck (2.4 m) is heated: warmth recovers there too.
  await page.evaluate(()=>{window.__polarProbe().place(-24,-20,2.4,0);window.__polarKeepAlive=setInterval(()=>window.__polarProbe().heal(),400);});await page.waitForTimeout(300);const deck=await probe(page);assert.ok(Math.abs(deck.feetY-2.4)<.02,'on deck '+deck.feetY);await page.evaluate(()=>window.__polarProbe().setWarmth(50));await page.waitForFunction(()=>window.__polarProbe().warmth>53,null,{timeout:30000});
  await page.evaluate(()=>clearInterval(window.__polarKeepAlive));
  await page.keyboard.press('Escape');await menuOpen(page);
  const cp=await page.evaluate(()=>JSON.parse(localStorage.getItem('neon-eclipse.polar.v1')));
  assert.equal(cp?.version,1);assert.equal(cp.checkpoint.stageIndex,0);assert.ok(Number.isFinite(cp.checkpoint.stormTime),'storm clock persisted');assert.ok(Number.isFinite(cp.checkpoint.warmth),'warmth persisted');
  assert.deepEqual(errors,[]);await page.close();
 });
 await step('boss training: GLACIER panel, armored until it presses the thin ice, sunk window exposes the core',async()=>{
  const {page,errors}=await newPage(context);
  await page.goto(`${base}/index.html?map=polar`);await menuOpen(page);
  await page.evaluate(()=>localStorage.setItem('neon-eclipse.polar.v1',JSON.stringify({version:1,unlocked:4,checkpoint:null})));await page.reload();await menuOpen(page);
  await page.click('#menu-new');await page.click('#menu-levels');await page.click('.menu-view[data-view="levels"] .menu-training > summary');await page.click('#menu-training-slot .campaign-menu details > summary');await page.waitForSelector('.stage-choices button[data-stage="3"]:not([disabled])');await page.click('.stage-choices button[data-stage="3"]');await playing(page);
  const panel=page.locator('.boss-mechanic:not([hidden])');
  await page.waitForFunction(()=>[...document.querySelectorAll('.boss-mechanic')].some(p=>!p.hidden&&/GLACIER/.test(p.textContent)));
  assert.match(await panel.innerText(),/1800/);
  const p0=await probe(page);assert.equal(p0.bossBlocking,true);assert.equal(p0.stage,3);assert.equal(p0.bossPhase,'armored');
  assert.equal(await panel.getAttribute('data-exposed'),'false','fresh stage: armored');
  // Stand on the lake centre and drop the mech onto the thin ice: it presses for 2.5 s and sinks. Keep the player alive through shells and hounds (probe heal, test-only).
  await page.evaluate(()=>{window.__polarProbe().place(0,0,0,0);window.__polarKeepAlive=setInterval(()=>window.__polarProbe().heal(),400);window.__polarProbe().placeBoss(0,-6);});
  await page.evaluate(()=>window.__polarProbe().advanceBoss(3));
  await page.waitForFunction(()=>window.__polarProbe().bossPhase==='sunk',null,{timeout:30000});
  await page.waitForFunction(()=>[...document.querySelectorAll('.boss-mechanic')].some(p=>!p.hidden&&p.dataset.exposed==='true'));
  assert.match(await panel.innerText(),/陷冰/);
  // After the 8 s window + 1.5 s climb it is armored again, back at spawn.
  await page.evaluate(()=>window.__polarProbe().advanceBoss(10));
  await page.waitForFunction(()=>window.__polarProbe().bossPhase==='armored',null,{timeout:30000});
  const back=await probe(page);assert.ok(back.bossPosition.z<-15,'respawned north (then stalking again) '+JSON.stringify(back.bossPosition));
  assert.equal(await panel.getAttribute('data-exposed'),'false');
  await page.evaluate(()=>clearInterval(window.__polarKeepAlive));
  assert.deepEqual(errors,[]);await page.close();
 });
 await step('journey v6 archive resumes between chapter 8 and 9',async()=>{
  const ctx=await browser.newContext({viewport:{width:1280,height:850}});
  const {page,errors}=await newPage(ctx);
  await page.goto(`${base}/index.html`);await menuOpen(page);
  const old={version:6,chapter:7,status:'complete',checkpoint:null,results:Array.from({length:8},()=>({time:100,kills:10}))};
  await page.evaluate(v=>{localStorage.clear();localStorage.setItem('neon-eclipse.journey.v6',JSON.stringify(v));},old);
  await page.reload();await menuOpen(page);
  assert.equal(await page.evaluate(()=>localStorage.getItem('neon-eclipse.journey.v6')!==null),true,'v6 key preserved');
  assert.equal(await page.evaluate(()=>localStorage.getItem('neon-eclipse.journey.v7')),null,'read-only until the player acts');
  assert.match(await page.locator('#menu-continue').innerText(),/09|极地雷达阵列/);
  assert.deepEqual(errors,[]);await ctx.close();
 });
}finally{await browser.close();child.kill();}
const failed=results.filter(r=>!r.ok);
console.log(`polar browser: ${results.length-failed.length}/${results.length} passed`);
if(failed.length)process.exit(1);
