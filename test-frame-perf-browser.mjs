// Real app: play a few frames, die, and confirm the saved telemetry record carries a frame-timing summary.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import net from 'node:net';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const port=await new Promise(r=>{const s=net.createServer();s.listen(0,()=>{const p=s.address().port;s.close(()=>r(p));});});
const child=spawn(process.execPath,['server.cjs'],{env:{...process.env,PORT:String(port)},stdio:'ignore'});await new Promise(r=>setTimeout(r,1500));
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 const context=await browser.newContext(),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(45000);
 await context.addInitScript(()=>localStorage.setItem('neon-eclipse.telemetry-enabled.v1','true'));
 // Browser-route-only hook: count actual playing samples without altering timing; expose end for controlled loss.
 // A fixed 2.5s delay does not guarantee enough samples on software WebGL.
 await context.route('**/app.js',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync(new URL('./app.js',import.meta.url),'utf8')+'\nlet perfPlayingFrames=0;const nativePerfSample=frameStats.sample.bind(frameStats);frameStats.sample=now=>{if(state==="playing")perfPlayingFrames++;return nativePerfSample(now);};window.__perfProbe={die(){health=0;end(false);},frames:()=>perfPlayingFrames,fps:()=>document.querySelector("#fps").textContent};'}));
 await page.goto(`http://127.0.0.1:${port}/index.html?map=reactor&menu=chapter`);await page.waitForFunction(()=>document.body.dataset.menuOpen==='true');
 await page.click('#deploy');await page.waitForFunction(()=>document.body.dataset.playState==='playing');
 await page.waitForFunction(()=>window.__perfProbe.frames()>=20,{},{timeout:90000});const hud=await page.evaluate(()=>window.__perfProbe.fps());assert.match(hud,/^\d+$/);assert(Number(hud)>0,'hud fps shows a number');
 await page.keyboard.press('KeyQ');await page.waitForTimeout(600);
 await page.evaluate(()=>window.__perfProbe.die());await page.waitForFunction(()=>document.body.dataset.playState==='lost');
 const record=await page.evaluate(async()=>{const r=await window.neonTelemetry.read();return r.ok?r.records.at(-1):r;});
 assert(record&&record.won===false,'loss recorded');assert(record.perf,'perf attached: '+JSON.stringify(record));
 assert(record.perf.frames>10&&record.perf.avgFps>0&&record.perf.p95Ms>=record.perf.p50Ms&&record.perf.maxMs>=record.perf.p95Ms,JSON.stringify(record.perf));
 assert([0,1,2].includes(record.perf.quality),'quality recorded after Q toggle');
 // Archive page renders the timing panel from the same store.
 await page.goto(`http://127.0.0.1:${port}/operations-archive.html`);await page.waitForFunction(()=>/含帧时序/.test(document.querySelector('#perf-samples').textContent));
 assert.match(await page.textContent('#perf-fps'),/\d+ FPS/);assert.match(await page.textContent('#perf-quality'),/次 · 平均 \d+ FPS/);
 assert.deepEqual(errors,[]);
 console.log('PASS: real reactor run records frame timing (hud fps, percentiles, quality tier) on death and the archive page aggregates it');
}finally{await browser?.close();child.kill();}
