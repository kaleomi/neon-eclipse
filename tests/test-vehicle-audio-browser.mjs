// Phase 2 debt (L3, opt-in): vehicle page audio wiring. Isolated Chromium; verifies that the vehicle audio
// facade exists, unlocks on the first gesture, runs its engine bed while driving, fires one-shot events from
// gameplay counters (roof gun shots), and suspends on pause. Uses the shared vehicle test server.
import assert from 'node:assert/strict';
import {startVehicleTestServer} from '../scripts/vehicle-browser-server.mjs';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const server=await startVehicleTestServer();let browser;
const results=[];
async function step(name,fn){try{await fn();results.push({name,ok:true});console.log('ok  ',name);}catch(e){results.push({name,ok:false});console.log('FAIL',name,'\n',e?.stack||e);}}
try{
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
 const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());page.setDefaultTimeout(45000);
 await page.route('**/vehicle-app.js',async route=>{const body=await (await route.fetch()).text();route.fulfill({body:body+`\nwindow.__heliAudioFixture={async killDrone(){const {spawnDrones,FRONTIER_SITES}=await import('../src/frontier-missions.js');const {damageTarget}=await import('../src/vehicle-weapons.js');frontier.stage='snipe';frontier.completed=['drive','park','climb'];frontier.gate=3;spawnDrones(frontier);const h=frontier.hostiles[0];while(h.alive)damageTarget({hits:0,kills:0},h,99);const names=[];const orig=vehicleAudio.events;vehicleAudio.events=c=>{const out=orig(c);for(const e of out)for(let i=0;i<e.count;i++)names.push(e.name);return out;};window.__sfxNames=names;window.__fxState=()=>({counts:frontier.effectCounts,steps:frontier.mechSteps,status:frontier.status,stage:frontier.stage});},async walkToDoor(){const {helicopterDoorPoints}=await import('../src/helicopter-field.js');const d=helicopterDoorPoints(heli)[0];player.x=d.x;player.z=d.z;player.yaw=heli.yaw;}};`,headers:{'content-type':'text/javascript'}});});
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
 await step('helicopter: cold rotor is a silent bed, I spool-up raises slap rate and gain, shutdown decays',async()=>{
  // Leave the gunner seat and the rover, walk (teleport fixture) to the parked helicopter's door and board with E.
  await page.keyboard.down('Space');await page.waitForFunction(()=>Number(document.querySelector('#drive-speed').textContent)<1,null,{timeout:15000});await page.keyboard.up('Space');
  await page.keyboard.press('KeyF');await page.waitForFunction(()=>document.body.dataset.gunner==='false');
  await page.keyboard.press('KeyE');await page.waitForFunction(()=>document.body.dataset.vehicleKind==='walking',null,{timeout:15000});
  await page.evaluate(()=>window.__heliAudioFixture.walkToDoor());await page.waitForTimeout(200);
  await page.keyboard.press('KeyE');await page.waitForFunction(()=>document.body.dataset.vehicleKind==='helicopter',null,{timeout:10000});
  await page.waitForTimeout(300);const cold=await page.evaluate(()=>window.neonVehicleAudio.bed());
  assert.ok(cold&&cold.kind==='helicopter'&&cold.gain===0,'cold rotor bed is silent: '+JSON.stringify(cold));
  await page.keyboard.press('KeyI');await page.waitForFunction(()=>document.body.dataset.heliPowered==='true');
  await page.waitForFunction(()=>{const b=window.neonVehicleAudio.bed();return b&&b.kind==='helicopter'&&b.gain>.05;},null,{timeout:20000});
  const warm=await page.evaluate(()=>window.neonVehicleAudio.bed());assert.ok(warm.slap>cold.slap&&warm.whineGain>0,'spool-up audible: '+JSON.stringify(warm));
  await page.keyboard.press('KeyI');await page.waitForFunction(()=>document.body.dataset.heliPowered==='false');
  await page.waitForFunction(g=>{const b=window.neonVehicleAudio.bed();return b&&b.gain<g;},warm.gain,{timeout:20000});
 });
 await step('frontier drone kill plays the explosion cue (air burst + ground impact)',async()=>{
  await page.keyboard.press('Escape');await page.waitForFunction(()=>document.body.dataset.driveActive==='false');
  await page.click('#vehicle-tab-missions');await page.click('#vehicle-mission-tab-windfarm');
  await page.click('#start-windfarm');await page.click('#start-windfarm');await page.waitForFunction(()=>document.body.dataset.frontierStatus==='active'&&document.body.dataset.driveActive==='true');
  await page.waitForTimeout(400);// let the post-reset audio baseline frame pass so both explosions are diffs, not baseline
  await page.evaluate(()=>window.__heliAudioFixture.killDrone());
  await page.waitForFunction(()=>window.__sfxNames&&window.__sfxNames.filter(n=>n==='kill.boss').length>=2,null,{timeout:15000}).catch(async e=>{throw new Error(e.message+' state='+JSON.stringify(await page.evaluate(()=>({fx:window.__fxState(),names:window.__sfxNames}))));});
  const st=await page.evaluate(()=>window.__fxState());assert.equal(st.counts.explode,2,'air burst + ground impact counted: '+JSON.stringify(st.counts));
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
