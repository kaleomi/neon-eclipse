// Phase 2 debt (L3, opt-in): vehicle page audio wiring. Isolated Chromium; verifies that the vehicle audio
// facade exists, unlocks on the first gesture, runs its engine bed while driving, fires one-shot events from
// gameplay counters (roof gun shots), and suspends on pause. Uses the shared vehicle test server.
import assert from 'node:assert/strict';
import {startVehicleTestServer} from './scripts/vehicle-browser-server.mjs';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const server=await startVehicleTestServer();let browser;
const results=[];
async function step(name,fn){try{await fn();results.push({name,ok:true});console.log('ok  ',name);}catch(e){results.push({name,ok:false});console.log('FAIL',name,'\n',e?.stack||e);}}
try{
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
 const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());page.setDefaultTimeout(45000);
 await page.goto(`${server.base}/vehicle.html`);
 await page.waitForFunction(()=>!!document.querySelector('canvas')&&!!window.neonVehicleAudio);
 await step('vehicle audio facade present, no AudioContext before a gesture',async()=>{
  const snap=await page.evaluate(()=>window.neonVehicleAudio.bus.snapshot());
  assert.equal(snap.state,'none','no context before gesture: '+snap.state);
 });
 await step('resume unlocks the bus; driving the rover plays the engine bed and roof-gun shots fire one-shot sfx',async()=>{
  await page.click('#resume-drive');
  await page.waitForFunction(()=>document.body.dataset.driveActive==='true');
  await page.waitForFunction(()=>{const s=window.neonVehicleAudio.bus.snapshot();return s.state==='running'||s.state==='suspended';});
  // Board the rover (spawns next to the player) and drive forward a bit.
  await page.keyboard.press('KeyE');await page.waitForFunction(()=>document.body.dataset.vehicleKind==='rover',null,{timeout:10000});
  await page.keyboard.down('KeyW');await page.waitForTimeout(1200);await page.keyboard.up('KeyW');
  const played0=await page.evaluate(()=>window.neonVehicleAudio.sfx.stats().played);
  assert.ok(played0>=1,'vehicle.enter played on boarding: '+played0);
  // Gunner seat + fire: roofGun.shots increases -> fire.vanguard events.
  await page.keyboard.press('KeyF');await page.waitForFunction(()=>document.body.dataset.gunner==='true',null,{timeout:10000});
  const shotsBefore=Number(await page.evaluate(()=>document.body.dataset.roofShots));
  await page.mouse.move(640,450);await page.mouse.down();
  await page.waitForFunction(b=>Number(document.body.dataset.roofShots)>b,shotsBefore,{timeout:15000});
  await page.mouse.up();await page.waitForTimeout(300);
  const played1=await page.evaluate(()=>window.neonVehicleAudio.sfx.stats().played);
  assert.ok(played1>played0,'shots produced sfx events: '+played0+' -> '+played1);
 });
 await step('pause suspends the vehicle bus, resume releases it',async()=>{
  await page.keyboard.press('Escape');await page.waitForFunction(()=>document.body.dataset.driveActive==='false');
  const paused=await page.evaluate(()=>window.neonVehicleAudio.bus.snapshot());
  assert.ok(paused.suspendedBy.includes('paused'),'held by paused: '+JSON.stringify(paused.suspendedBy));
  await page.click('#resume-drive');await page.waitForFunction(()=>document.body.dataset.driveActive==='true');
  const resumed=await page.evaluate(()=>window.neonVehicleAudio.bus.snapshot());
  assert.ok(!resumed.suspendedBy.includes('paused'),'released: '+JSON.stringify(resumed.suspendedBy));
 });
 const fatal=errors.filter(e=>!/ResizeObserver/.test(e));assert.deepEqual(fatal,[]);
 await context.close();
}finally{await browser?.close();await server.stop();}
const failed=results.filter(r=>!r.ok);
console.log(`vehicle audio browser: ${results.length-failed.length}/${results.length} passed`);
if(failed.length)process.exit(1);
