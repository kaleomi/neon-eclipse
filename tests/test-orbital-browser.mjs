// Chapter 07 browser check (L3, opt-in): boots the orbital map in an isolated Chromium context, starts a
// single-chapter run, verifies gravity bands / band HUD / stair climb, then replays the boss stage and
// checks the TETHER panel and stabilizer markers. Never touches the real profile; own static server.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
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
const feet=page=>page.evaluate(()=>window.__orbitalProbe?.().feetY);
try{
 const context=await browser.newContext({viewport:{width:1280,height:850}});
 await step('orbital boots with eighth chapter in menu',async()=>{
  const {page,errors}=await newPage(context);
  await page.goto(`${base}/index.html?map=orbital`);await menuOpen(page);
  assert.equal(await page.getAttribute('body','data-map'),'orbital');
  assert.equal(await page.locator('.menu-chapter-grid a[data-map]').count(),9,'nine chapter cards');
  assert.match(await page.locator('.menu-chapter-grid a[data-map="orbital"]').getAttribute('aria-current')||'',/page/);
  assert.match(await page.locator('.menu-chapter-grid a[data-map="orbital"]').innerText(),/轨道电梯基座/);
  assert.deepEqual(errors,[]);await page.close();
 });
 await step('single run: band HUD, 1 g jump, stair climb to 0.65 g band, checkpoint feetY',async()=>{
  const {page,errors}=await newPage(context);
  await page.goto(`${base}/index.html?map=orbital&menu=chapter`);await menuOpen(page);
  await page.click('#deploy');await playing(page);
  await page.waitForFunction(()=>document.querySelector('.hazard-notice.orbital-band')&&!document.querySelector('.hazard-notice.orbital-band').hidden);
  assert.match(await page.locator('.hazard-notice.orbital-band').innerText(),/一段/);
  assert.equal(await page.getAttribute('.hazard-notice.orbital-band','data-band'),'0');
  // Jump at 1 g: peak stays under 1.6 m.
  await page.keyboard.press('Space');let peak=0;for(let i=0;i<14;i++){await page.waitForTimeout(60);peak=Math.max(peak,await feet(page));}
  assert.ok(peak>1&&peak<1.65,'1 g jump peak '+peak);
  // Teleport to flight 01 foot via the debug probe and walk east up the stairs.
  await page.evaluate(()=>window.__orbitalProbe().place(-24,0,0,-Math.PI/2));
  await page.keyboard.down('KeyW');await page.waitForFunction(()=>window.__orbitalProbe().feetY>=4,null,{timeout:40000}).finally(()=>page.keyboard.up('KeyW'));
  const y=await feet(page);assert.ok(Math.abs(y-4)<.01,'on ring I after the west stairs: '+y);
  await page.waitForFunction(()=>document.querySelector('.hazard-notice.orbital-band').dataset.band==='1');
  assert.match(await page.locator('.hazard-notice.orbital-band').innerText(),/二段/);
  await page.keyboard.press('Space');peak=0;for(let i=0;i<20;i++){await page.waitForTimeout(60);peak=Math.max(peak,await feet(page)-4);}
  assert.ok(peak>1.8&&peak<2.5,'0.65 g jump peak '+peak);
  await page.keyboard.press('Escape');await menuOpen(page);
  const cp=await page.evaluate(()=>JSON.parse(localStorage.getItem('neon-eclipse.orbital.v1')));
  assert.equal(cp?.version,1);assert.equal(cp.checkpoint.stageIndex,0);
  assert.deepEqual(errors,[]);await page.close();
 });
 await step('boss training: TETHER panel, three stabilizer markers, shield feedback text',async()=>{
  const {page,errors}=await newPage(context);
  await page.goto(`${base}/index.html?map=orbital`);await menuOpen(page);
  await page.evaluate(()=>localStorage.setItem('neon-eclipse.orbital.v1',JSON.stringify({version:1,unlocked:4,checkpoint:null})));await page.reload();await menuOpen(page);
  await page.click('#menu-new');await page.click('#menu-levels');await page.click('.menu-view[data-view="levels"] .menu-training > summary');await page.click('#menu-training-slot .campaign-menu details > summary');await page.waitForSelector('.stage-choices button[data-stage="3"]:not([disabled])');await page.click('.stage-choices button[data-stage="3"]');await playing(page);
  const panel=page.locator('.boss-mechanic:not([hidden])');
  await page.waitForFunction(()=>[...document.querySelectorAll('.boss-mechanic')].some(p=>!p.hidden&&/TETHER/.test(p.textContent)));
  const text=await panel.innerText();
  assert.match(text,/1600/);assert.match(text,/剩余 3\/3/);
  assert.equal(await panel.getAttribute('data-exposed'),'false');
  const probe=await page.evaluate(()=>window.__orbitalProbe());
  assert.equal(probe.bossBlocking,true);assert.equal(probe.stage,3);
  await page.waitForTimeout(2600);
  assert.match(await panel.innerText(),/脉冲/,'pulse telegraph appears within the first cycle');
  assert.equal(await page.evaluate(()=>window.__orbitalProbe().feetY),4,'boss training starts on ring I entry');
  assert.deepEqual(errors,[]);await page.close();
 });
 await step('journey v4 archive resumes between chapter 6 and 7',async()=>{
  const ctx=await browser.newContext({viewport:{width:1280,height:850}});
  const {page,errors}=await newPage(ctx);
  await page.goto(`${base}/index.html`);await menuOpen(page);
  const old={version:4,chapter:5,status:'complete',checkpoint:null,results:Array.from({length:6},()=>({time:100,kills:10}))};
  await page.evaluate(v=>{localStorage.clear();localStorage.setItem('neon-eclipse.journey.v4',JSON.stringify(v));},old);
  await page.reload();await menuOpen(page);
  assert.equal(await page.evaluate(()=>localStorage.getItem('neon-eclipse.journey.v4')!==null),true,'v4 key preserved');
  assert.match(await page.locator('#menu-continue').innerText(),/07|轨道电梯基座/);
  assert.deepEqual(errors,[]);await ctx.close();
 });
}finally{await browser.close();child.kill();}
const failed=results.filter(r=>!r.ok);
console.log(`orbital browser: ${results.length-failed.length}/${results.length} passed`);
if(failed.length)process.exit(1);
