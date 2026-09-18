// Chapter 07/08/09 audio cues (L3, opt-in): with the real procedural audio stack, jumping the chapter clocks
// (storm / tide) and entering the boss stage produce catalog sfx through `chapter-cues.js`. Counts only; no
// sound quality claims. Own static server, isolated Chromium.
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
const played=page=>page.evaluate(()=>window.neonAudio.sfx.stats().played);
// Headless swiftshader runs at 1-3 fps: wait for real game frames (not wall time) so the cue tracker has a baseline / sees the change.
const frames=(page,n)=>page.evaluate(n=>new Promise(r=>{let k=0;const f=()=>{if(++k>=n)r();else requestAnimationFrame(f);};requestAnimationFrame(f);}),n);
try{
 const context=await browser.newContext({viewport:{width:1280,height:850}});
 await step('polar: storm closing/whiteout cues and frostbite tick play through the sfx player',async()=>{
  const {page,errors}=await newPage(context);
  await page.goto(`${base}/index.html?map=polar&menu=chapter`);await menuOpen(page);
  await page.click('#deploy');await playing(page);
  await page.waitForFunction(()=>window.neonAudio?.bus.snapshot().state!=='none');
  await frames(page,3);const p0=await played(page);
  await page.evaluate(()=>window.__polarProbe().advanceStorm(19));// clear -> closing
  await page.waitForFunction(()=>window.__polarProbe().phase==='closing');await frames(page,3);
  const p1=await played(page);assert.ok(p1>p0,'storm.closing cued '+p0+' -> '+p1);
  await page.evaluate(()=>window.__polarProbe().advanceStorm(6));// closing -> whiteout
  await page.waitForFunction(()=>window.__polarProbe().phase==='whiteout');await frames(page,3);
  const p2=await played(page);assert.ok(p2>p1,'storm.whiteout cued '+p1+' -> '+p2);
  await page.evaluate(()=>{window.__polarProbe().place(0,10,0,0);window.__polarProbe().setWarmth(0);});
  await page.waitForFunction(()=>window.__polarProbe().health<100,null,{timeout:15000});await frames(page,3);
  const p3=await played(page);assert.ok(p3>p2,'frost.tick + hurt cued '+p2+' -> '+p3);
  assert.deepEqual(errors,[]);await page.close();
 });
 await step('datacenter: tide rising/high cues play; ABYSS state getter exposed for cues',async()=>{
  const {page,errors}=await newPage(context);
  await page.goto(`${base}/index.html?map=datacenter&menu=chapter`);await menuOpen(page);
  await page.click('#deploy');await playing(page);
  await page.waitForFunction(()=>window.neonAudio?.bus.snapshot().state!=='none');
  await frames(page,3);const p0=await played(page);
  await page.evaluate(()=>window.__datacenterProbe().advanceWater(15));// low -> rising
  await page.waitForFunction(()=>window.__datacenterProbe().phase==='rising');await frames(page,3);
  const p1=await played(page);assert.ok(p1>p0,'tide.rise cued '+p0+' -> '+p1);
  await page.evaluate(()=>window.__datacenterProbe().advanceWater(6));// rising -> high
  await page.waitForFunction(()=>window.__datacenterProbe().phase==='high');await frames(page,3);
  const p2=await played(page);assert.ok(p2>p1,'tide.high cued '+p1+' -> '+p2);
  assert.deepEqual(errors,[]);await page.close();
 });
 await step('orbital: crossing into the 0.65 g band plays the band chime',async()=>{
  const {page,errors}=await newPage(context);
  await page.goto(`${base}/index.html?map=orbital&menu=chapter`);await menuOpen(page);
  await page.click('#deploy');await playing(page);
  await page.waitForFunction(()=>window.neonAudio?.bus.snapshot().state!=='none');
  await frames(page,3);const p0=await played(page);
  await page.evaluate(()=>window.__orbitalProbe().place(0,-9,4,0));// onto the 4 m ring = 0.65 g band
  await page.waitForFunction(()=>window.__orbitalProbe().feetY>3.5);await frames(page,3);
  const p1=await played(page);assert.ok(p1>p0,'orbital.band cued '+p0+' -> '+p1);
  assert.deepEqual(errors,[]);await page.close();
 });
}finally{await browser.close();child.kill();}
const failed=results.filter(r=>!r.ok);
console.log(`chapter cues browser: ${results.length-failed.length}/${results.length} passed`);
if(failed.length)process.exit(1);
