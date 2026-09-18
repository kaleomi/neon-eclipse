// Isolated native browser exercise. All flight movement is through real keys at a controlled 50 ms clock cadence.
// Not a hardware-performance test, human acceptance, mission 5, or an expedition qualification test.
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {startVehicleTestServer} from './scripts/vehicle-browser-server.mjs';
import {helicopterPilotKeys} from './helicopter-test-pilot.mjs';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const external=process.env.HELICOPTER_TEST_URL,server=external?null:await startVehicleTestServer();
const url=external||server.base+'/helicopter.html',base=new URL(url).origin;
const shots=process.env.HELICOPTER_SCREENSHOT_DIR||fs.mkdtempSync(path.join(os.tmpdir(),'helicopter-'));fs.mkdirSync(shots,{recursive:true});
let browser;const results=[];
const pass=label=>{results.push(label);console.log('PASS '+label);};
try{
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1280,height:820}}),seed=await context.newPage();
 await seed.route('**/heli-test-seed',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Isolated storage fixture</title>'}));
 await seed.goto(base+'/heli-test-seed');
 const dbNames=['neon-eclipse.expedition.v1','neon-eclipse.flight-records.v1','neon-eclipse.joint-checkpoints.v1','neon-eclipse.naval-checkpoints.v1'];
 const values={'neon-eclipse.journey.v7':'preserve-fps-fixture','neon-eclipse.escort-difficulty.v1':'hard','neon-eclipse.audio.v1':JSON.stringify({master:.17,muted:true})};
 await seed.evaluate(async({dbNames,values})=>{
  for(const [key,value] of Object.entries(values))localStorage.setItem(key,value);
  for(const name of dbNames)await new Promise((resolve,reject)=>{const q=indexedDB.open(name,1);q.onupgradeneeded=()=>q.result.createObjectStore('sentinel');q.onerror=()=>reject(q.error);q.onsuccess=()=>{const db=q.result,tx=db.transaction('sentinel','readwrite');tx.objectStore('sentinel').put({tag:'unchanged',name},'record');tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>reject(tx.error);};});
 },{dbNames,values});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.__heliStorageAudit={localStorage:0,sessionStorage:0,indexedDB:0};
  for(const name of ['localStorage','sessionStorage','indexedDB']){
   const descriptor=Object.getOwnPropertyDescriptor(window,name),original=descriptor?.get;
   if(typeof original!=='function')throw Error('Native storage accessor unavailable for audit: '+name);
   Object.defineProperty(window,name,{configurable:true,get(){window.__heliStorageAudit[name]++;return original.call(window);}});
  }
 });
 await page.clock.install();await page.goto(url);await page.waitForFunction(()=>document.body.dataset.heliMode==='ready');
 assert.equal(await page.locator('canvas').count(),2);assert.equal(await page.getAttribute('body','data-heli-audio'),'none');
 await page.screenshot({path:path.join(shots,'helicopter-intro-desktop.png')});
 await page.clock.pauseAt(new Date(Date.now()+1000));
 // Use a modest desktop render area during flight; keep separate full desktop and narrow layout captures.
 await page.setViewportSize({width:960,height:720});await page.clock.fastForward(50);
 const read=()=>page.evaluate(()=>{const d=document.body.dataset,s={mode:d.heliMode,status:d.heliStatus,trial:d.heliTrial,stage:Number(d.heliStage),grounded:d.heliGrounded==='true',landings:Number(d.heliLandings)};
  for(const f of ['x','y','z','vx','vy','vz','yaw','pitch','roll','rpm','elapsed'])s[f]=Number(d['heli'+f[0].toUpperCase()+f.slice(1)]);return s;});
 const held=new Set();
 async function keys(next){for(const key of [...held])if(!next.includes(key)){await page.keyboard.up(key);held.delete(key);}for(const key of next)if(!held.has(key)){await page.keyboard.down(key);held.add(key);}}
 const advance=async(ms)=>{for(let i=0;i<Math.ceil(ms/50);i++)await page.clock.fastForward(50);};
 async function until(fn,limit=3000){for(let i=0;i<limit/50;i++){const s=await read();if(fn(s))return s;await advance(50);}assert.fail('native telemetry did not satisfy condition: '+JSON.stringify(await read()));}
 await page.locator('#heli-resume').press('Enter');assert.equal((await read()).mode,'active');
 await keys(['ShiftLeft']);await advance(500);let s=await read();assert.equal(s.y,0);assert(s.rpm>0&&s.rpm<.75);
 await until(s=>s.y>6,6000);await keys([]);await advance(1800);s=await read();assert(s.y>6);assert(Math.abs(s.vy)<.2);
 pass('native WebGL page, keyboard start, rotor spool, lift and release-to-hover');
 await page.keyboard.press('KeyV');assert.equal(await page.getAttribute('body','data-heli-camera'),'top');
 await keys(['KeyE']);const yaw=s.yaw;await advance(600);await keys([]);assert((await read()).yaw>yaw+.25);
 // Space must activate a focused UI button, not accidentally become a flight command.
 await page.locator('#heli-sound').focus();await page.keyboard.press('Space');
 for(let i=0;i<20&&(await page.getAttribute('body','data-heli-audio'))!=='running';i++)await advance(50);
 assert.equal(await page.getAttribute('#heli-sound','aria-pressed'),'true');assert.equal(await page.getAttribute('body','data-heli-audio'),'running');
 await keys([]);await page.keyboard.press('Escape');const paused=await read();assert.equal(paused.mode,'paused');
 await advance(2000);const after=await read();for(const key of ['x','y','z','vx','vy','vz','rpm','elapsed'])assert.equal(after[key],paused[key],key+' changed while paused');
 assert.equal(await page.getAttribute('body','data-heli-audio'),'suspended');
 await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'heli-overlay-reset');
 await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'heli-resume');
 await page.locator('#heli-resume').press('Enter');await advance(100);assert.equal((await read()).mode,'active');
 assert.equal(await page.getAttribute('body','data-heli-audio'),'running');
 await page.keyboard.press('KeyM');await advance(100);assert.equal(await page.getAttribute('#heli-sound','aria-pressed'),'false');
 pass('yaw, top view, accessible sound toggle, opt-in audio and game/audio pause-resume');
 await page.keyboard.press('KeyV');
 const visited=new Set([(await read()).stage]),deadline=Date.now()+120000;let previous=-1;
 while(Date.now()<deadline){s=await read();assert.equal(s.status,'running',JSON.stringify(s));assert.equal(s.mode,'active');visited.add(s.stage);
  if(s.stage!==previous){console.log('HELI_STAGE',s.stage,JSON.stringify(s));previous=s.stage;}
  if(s.trial==='complete')break;await keys(helicopterPilotKeys(s,s.stage));await advance(50);
 }
 await keys([]);s=await read();assert.equal(s.trial,'complete',JSON.stringify(s));assert.equal(s.stage,4);assert(s.grounded);assert.equal(s.landings,1);assert(visited.has(1)&&visited.has(2)&&visited.has(3)&&visited.has(4));
 await page.screenshot({path:path.join(shots,'helicopter-complete-desktop.png')});
 pass('four practice steps completed through real key events; no position/stage/terminal injection');
 await page.keyboard.press('KeyR');const beforeReset=await read();assert.equal(beforeReset.mode,'paused');assert.equal(beforeReset.landings,1);
 await page.locator('#heli-overlay-reset').press('Enter');s=await read();assert.equal(s.mode,'ready');assert.equal(s.stage,0);assert.equal(s.landings,0);assert.equal(s.rpm,0);assert.equal(s.elapsed,0);
 await page.locator('#heli-resume').press('Enter');await keys(['ShiftLeft']);await until(s=>s.y>7,7000);await keys([]);await advance(1000);
 await keys(['KeyC','KeyD']);await until(s=>s.status==='crashed',16000);await keys([]);s=await read();assert.equal(s.mode,'crashed');assert.equal(s.trial,'failed');assert.match(await page.locator('#heli-overlay-copy').innerText(),/硬着陆/);
 assert.equal(s.landings,0);await page.screenshot({path:path.join(shots,'helicopter-hard-landing.png')});
 pass('explicit reset confirmation and native-key banked hard landing failure, no false landing credit');
 await page.locator('#heli-resume').press('Enter');await keys(['ShiftLeft']);await until(s=>s.y>8,7000);await keys([]);await advance(1500);
 await keys(['KeyA']);await until(s=>s.status==='crashed',16000);await keys([]);assert.match(await page.locator('#heli-overlay-copy').innerText(),/越出试飞边界/);
 assert((await read()).x>=-103.6-.001);pass('native-key boundary violation stops without wrapping or teleporting');
 // A straight westbound leg from pad A passes SOUTH of the hangar. Move north into its z band first.
 await page.locator('#heli-resume').press('Enter');await keys(['ShiftLeft']);await until(s=>s.y>8,7000);await keys([]);await advance(1500);
 await keys(['KeyW']);await until(s=>s.z<13,9000);await keys(['Space']);await until(s=>Math.hypot(s.vx,s.vz)<.2,5000);await keys([]);await advance(500);
 await keys(['KeyA']);await until(s=>s.status==='crashed',10000);await keys([]);assert.match(await page.locator('#heli-overlay-copy').innerText(),/维修库/);
 pass('native-key rotor/body envelope collision stops before entering hangar');
 await page.locator('#heli-resume').press('Enter');await keys(['ShiftLeft']);await advance(1700);await keys([]);
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal((await read()).mode,'paused');const focusState=await read();await advance(500);assert.equal((await read()).elapsed,focusState.elapsed);
 await page.locator('#heli-overlay-reset').click();await page.locator('#heli-overlay-reset').click();assert.equal((await read()).mode,'ready');
 for(const width of [760,390,320]){await page.setViewportSize({width,height:844});await advance(50);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow at '+width);await page.locator('#heli-resume').scrollIntoViewIfNeeded();const b=await page.locator('#heli-resume').boundingBox();assert(b.x>=0&&b.x+b.width<=width+.5);if(width===390)await page.screenshot({path:path.join(shots,'helicopter-intro-mobile.png')});}
 pass('focus-loss event freezes state, accessible modal controls and 760/390/320 layouts');
 const audit=await page.evaluate(()=>window.__heliStorageAudit);assert.deepEqual(audit,{localStorage:0,sessionStorage:0,indexedDB:0});
 const stored=await seed.evaluate(async dbNames=>{
  const databases={};for(const name of dbNames)databases[name]=await new Promise((resolve,reject)=>{const q=indexedDB.open(name);q.onerror=()=>reject(q.error);q.onsuccess=()=>{const db=q.result,tx=db.transaction('sentinel','readonly'),get=tx.objectStore('sentinel').get('record');get.onsuccess=()=>{resolve({version:db.version,value:get.result});db.close();};get.onerror=()=>reject(get.error);};});return {local:Object.fromEntries(Object.entries(localStorage)),databases};
 },dbNames);
 assert.deepEqual(stored.local,values);for(const name of dbNames)assert.deepEqual(stored.databases[name],{version:1,value:{tag:'unchanged',name}});assert.deepEqual(errors,[]);
 await context.close();pass('zero prototype storage access; FPS/preferences and all isolated IndexedDB sentinels unchanged');
 const denied=await browser.newContext({viewport:{width:800,height:600}}),p=await denied.newPage(),deniedErrors=[];p.on('pageerror',e=>deniedErrors.push(e.message));
 await p.addInitScript(()=>{for(const key of ['localStorage','sessionStorage','indexedDB'])Object.defineProperty(window,key,{configurable:true,get(){throw new DOMException('Denied','SecurityError');}});Object.defineProperty(window,'AudioContext',{configurable:true,value:undefined});Object.defineProperty(window,'webkitAudioContext',{configurable:true,value:undefined});});
 await p.goto(url);await p.waitForFunction(()=>document.body.dataset.heliMode==='ready');await p.click('#heli-resume');await p.click('#heli-sound');assert.equal(await p.getAttribute('body','data-heli-mode'),'active');assert.equal(await p.getAttribute('body','data-heli-audio'),'none');assert.deepEqual(deniedErrors,[]);await denied.close();
 pass('denied storage and missing WebAudio do not block the independent prototype');
 const broken=await browser.newContext(),bad=await broken.newPage();await bad.route('**/helicopter-world.js',r=>r.abort());await bad.goto(url);await bad.waitForFunction(()=>document.body.dataset.heliMode==='error');assert(await bad.locator('#heli-resume').isDisabled());assert.match(await bad.locator('#heli-overlay-copy').innerText(),/没有读取或修改/);await broken.close();
 const noGL=await browser.newContext(),g=await noGL.newPage();await g.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'||type==='webgl'?null:get.call(this,type,...args);};});await g.goto(url);await g.waitForFunction(()=>document.body.dataset.heliMode==='error');assert.match(await g.locator('#heli-overlay-copy').innerText(),/WebGL 2/);assert(await g.locator('#heli-resume').isDisabled());await noGL.close();
 pass('missing module / unavailable WebGL show non-destructive startup errors');
 console.log(`helicopter browser: ${results.length}/${results.length} passed; controlled-clock keyboard tests, not human/performance acceptance; screenshots ${shots}`);
}finally{await browser?.close();await server?.stop();}
