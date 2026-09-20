import {equipAtTerminal} from './browser-loadout-driver.mjs';
// Chapter 08 browser check (L3, opt-in): boots the sunken data center in an isolated Chromium context,
// verifies the tide HUD / water slow / energy-weapon short, the dry plinth top, then replays the boss stage
// and checks the ABYSS panel gating and the v5 (seven-chapter) journey archive import. Own static server.
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
async function newPage(context){const page=await context.newPage();page.setDefaultTimeout(45000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!/WebGL|GPU|swiftshader|Automatic fallback/i.test(m.text()))errors.push(m.text());});// Controlled simulation clock: wall-clock waits under software WebGL are not speed evidence.
await page.route('**/app.js',async route=>{const response=await route.fetch();let source=await response.text();const clock='const dt=Math.max(0,Math.min((now-last)/1000,.05));last=now;';assert(source.includes(clock));source=source.replace(clock,'const dt=.05;last=now;').replace("if(state==='playing')update(dt);","if(state==='playing'){update(dt);window.__waterFrames=(window.__waterFrames||0)+1;}");await route.fulfill({response,body:source});});return {page,errors};}
const probe=page=>page.evaluate(()=>window.__datacenterProbe?.());
try{
 const context=await browser.newContext({viewport:{width:1280,height:850}});
 await step('datacenter boots with eighth chapter in menu',async()=>{
  const {page,errors}=await newPage(context);
  await page.goto(`${base}/index.html?map=datacenter`);await menuOpen(page);
  assert.equal(await page.getAttribute('body','data-map'),'datacenter');
  assert.equal(await page.locator('.menu-chapter-grid a[data-map]').count(),9,'nine chapter cards');
  assert.match(await page.locator('.menu-chapter-grid a[data-map="datacenter"]').getAttribute('aria-current')||'',/page/);
  assert.match(await page.locator('.menu-chapter-grid a[data-map="datacenter"]').innerText(),/沉没数据中心/);
  assert.deepEqual(errors,[]);await page.close();
 });
 await step('single run: tide HUD cycles low -> rising -> high, water slows walking, energy weapon shorts, plinth top stays dry',async()=>{
  const {page,errors}=await newPage(context);
  await page.goto(`${base}/index.html?map=datacenter&menu=chapter`);await menuOpen(page);
  await page.click('#deploy');await playing(page);await equipAtTerminal(page,5);
  await page.waitForFunction(()=>document.querySelector('.hazard-notice.water-notice')&&!document.querySelector('.hazard-notice.water-notice').hidden);
  const first=await probe(page);assert.equal(first.stage,0);assert.equal(first.pumps,0);assert.equal(first.level,0);assert.equal(first.phase,'low');
  assert.match(await page.locator('.hazard-notice.water-notice').innerText(),/低水位/);
  // Dry-floor speed sample: walk north on open floor for 1 s.
  await page.evaluate(()=>window.__datacenterProbe().place(0,10,0,0));
  {const start=await page.evaluate(()=>window.__waterFrames||0);await page.keyboard.down('KeyW');await page.waitForFunction(n=>(window.__waterFrames||0)>=n+20,start);await page.keyboard.up('KeyW');}
  const dry=await probe(page);const dryDist=10-dry.z;assert.ok(dryDist>1,'dry walk distance '+dryDist);
  // Jump the tide clock to HIGH water (rise starts at 14 s, high at 20 s), then repeat the walk.
  await page.evaluate(()=>window.__datacenterProbe().advanceWater(21));
  await page.waitForFunction(()=>window.__datacenterProbe().phase==='high',null,{timeout:10000});
  await page.waitForFunction(()=>document.querySelector('.hazard-notice.water-notice').dataset.phase==='live',null,{timeout:5000});
  assert.match(await page.locator('.hazard-notice.water-notice').innerText(),/高水位/);
  const high=await probe(page);assert.ok(Math.abs(high.level-1.2)<.01,'level at high '+high.level);
  await page.evaluate(()=>window.__datacenterProbe().place(0,10,0,0));
  {const start=await page.evaluate(()=>window.__waterFrames||0);await page.keyboard.down('KeyW');await page.waitForFunction(n=>(window.__waterFrames||0)>=n+20,start);await page.keyboard.up('KeyW');}
  const wet=await probe(page);const wetDist=10-wet.z;
  assert.equal(wet.speedScale,.55,'water speed scale');assert.ok(wetDist<dryDist*.75,'wet walk '+wetDist+' vs dry '+dryDist);
  assert.match(await page.locator('.hazard-notice.water-notice').innerText(),/短路/);
  // Energy weapon (HALO, key 6) refuses to fire under water and shows the short-circuit notice.
  await page.keyboard.press('Digit1');await page.waitForTimeout(700);await page.mouse.down();await page.waitForTimeout(300);await page.mouse.up();
  await page.waitForFunction(()=>window.__datacenterProbe().shorted===true&&/短路/.test(window.__datacenterProbe().toast),null,{timeout:5000});
  // Plinth top (1.5 m) is above HIGH water: speed scale back to 1.
  await page.evaluate(()=>window.__datacenterProbe().place(-20,20,1.5,0));await page.waitForTimeout(200);
  const top=await probe(page);assert.ok(Math.abs(top.feetY-1.5)<.02,'on plinth '+top.feetY);assert.equal(top.speedScale,1);assert.equal(top.shorted,false);
  await page.keyboard.press('Escape');await menuOpen(page);
  const cp=await page.evaluate(()=>JSON.parse(localStorage.getItem('neon-eclipse.datacenter.v1')));
  assert.equal(cp?.version,1);assert.equal(cp.checkpoint.stageIndex,0);assert.ok(Number.isFinite(cp.checkpoint.waterTime),'water clock persisted');
  assert.deepEqual(errors,[]);await page.close();
 });
 await step('boss training: ABYSS panel, shield until drained, two pumps running, exposed at low water',async()=>{
  const {page,errors}=await newPage(context);
  await page.goto(`${base}/index.html?map=datacenter`);await menuOpen(page);
  await page.evaluate(()=>localStorage.setItem('neon-eclipse.datacenter.v1',JSON.stringify({version:1,unlocked:4,checkpoint:null})));await page.reload();await menuOpen(page);
  await page.click('#menu-new');await page.click('#menu-levels');await page.click('.menu-view[data-view="levels"] .menu-training > summary');await page.click('#menu-training-slot .campaign-menu details > summary');await page.waitForSelector('.stage-choices button[data-stage="3"]:not([disabled])');await page.click('.stage-choices button[data-stage="3"]');await playing(page);
  const panel=page.locator('.boss-mechanic:not([hidden])');
  await page.waitForFunction(()=>[...document.querySelectorAll('.boss-mechanic')].some(p=>!p.hidden&&/ABYSS/.test(p.textContent)));
  assert.match(await panel.innerText(),/1500/);
  const p0=await probe(page);assert.equal(p0.bossBlocking,true);assert.equal(p0.stage,3);assert.equal(p0.pumps,2,'both pumps run in the boss stage');
  assert.equal(await panel.getAttribute('data-exposed'),'true','fresh stage starts at low water: core exposed');
  await page.evaluate(()=>window.__datacenterProbe().advanceWater(21));
  await page.waitForFunction(()=>window.__datacenterProbe().phase==='high',null,{timeout:10000});
  await page.waitForFunction(()=>[...document.querySelectorAll('.boss-mechanic')].some(p=>!p.hidden&&p.dataset.exposed==='false'));
  assert.match(await panel.innerText(),/涨水|放电/);
  await page.evaluate(()=>window.__datacenterProbe().advanceWater(13));
  await page.waitForFunction(()=>window.__datacenterProbe().phase==='low',null,{timeout:10000});
  await page.waitForFunction(()=>[...document.querySelectorAll('.boss-mechanic')].some(p=>!p.hidden&&p.dataset.exposed==='true'));
  assert.equal(await panel.getAttribute('data-exposed'),'true','core exposed again once drained');
  assert.deepEqual(errors,[]);await page.close();
 });
 await step('journey v5 archive resumes between chapter 7 and 8',async()=>{
  const ctx=await browser.newContext({viewport:{width:1280,height:850}});
  const {page,errors}=await newPage(ctx);
  await page.goto(`${base}/index.html`);await menuOpen(page);
  const old={version:5,chapter:6,status:'complete',checkpoint:null,results:Array.from({length:7},()=>({time:100,kills:10}))};
  await page.evaluate(v=>{localStorage.clear();localStorage.setItem('neon-eclipse.journey.v5',JSON.stringify(v));},old);
  await page.reload();await menuOpen(page);
  assert.equal(await page.evaluate(()=>localStorage.getItem('neon-eclipse.journey.v5')!==null),true,'v5 key preserved');
  assert.equal(await page.evaluate(()=>localStorage.getItem('neon-eclipse.journey.v7')),null,'read-only until the player acts');
  assert.match(await page.locator('#menu-continue').innerText(),/08|沉没数据中心/);
  assert.deepEqual(errors,[]);await ctx.close();
 });
}finally{await browser.close();child.kill();}
const failed=results.filter(r=>!r.ok);
console.log(`datacenter browser: ${results.length-failed.length}/${results.length} passed`);
if(failed.length)process.exit(1);
