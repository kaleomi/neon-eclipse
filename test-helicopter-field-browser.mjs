// Optional browser regression: the helicopter as the fourth field vehicle on vehicle.html.
// Real key input drives boarding, engine start, lift-off, landing and exit; only the walk to the pad is shortened via a fixture hook.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const shots=process.env.VEHICLE_SCREENSHOT_DIR||fs.mkdtempSync(path.join(os.tmpdir(),'neon-heli-field-'));
fs.mkdirSync(shots,{recursive:true});
const url=process.env.VEHICLE_TEST_URL||'http://127.0.0.1:5173/vehicle.html';
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1280,height:800}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/vehicle-app.js',async route=>{
 const body=await (await route.fetch()).text();
 const hook=`\nwindow.__heliFixture={backToPad(){heli.x=196;heli.z=120;heli.vx=heli.vz=0;},skipToLastLeg(){slingRun.index=slingRun.order.length-1;},async overPod(){const {SLING}=await import('./helicopter-sling.js');const {HELICOPTER}=await import('./helicopter-rules.js');const c=sling.cargo;heli.x=c.x;heli.z=c.z;heli.y=c.y+SLING.cargoHeight+HELICOPTER.height*.35+SLING.cable+2;heli.vx=heli.vz=heli.vy=0;},async overZone(id){const {SLING,SLING_ZONES}=await import('./helicopter-sling.js');const {HELICOPTER}=await import('./helicopter-rules.js');const {fieldGround}=await import('./helicopter-field.js');const z=SLING_ZONES.find(z=>z.id===id);heli.x=z.x;heli.z=z.z;heli.y=fieldGround(z.x,z.z)+HELICOPTER.height*.35+SLING.cable+SLING.cargoHeight+.3;heli.vx=heli.vz=heli.vy=0;sling.cargo.x=z.x;sling.cargo.z=z.z;sling.cargo.vx=sling.cargo.vz=0;},async lowerForRelease(){const {SLING}=await import('./helicopter-sling.js');const {HELICOPTER}=await import('./helicopter-rules.js');heli.y=HELICOPTER.height*.35+SLING.cable+SLING.cargoHeight+.3;heli.vy=0;},async overCrate(){const {SLING_CARGO,SLING}=await import('./helicopter-sling.js');const {HELICOPTER}=await import('./helicopter-rules.js');heli.x=SLING_CARGO.x;heli.z=SLING_CARGO.z;heli.y=SLING.cargoHeight+HELICOPTER.height*.35+SLING.cable+2;heli.vx=heli.vz=heli.vy=0;},async walkToPad(){const {helicopterDoorPoints}=await import('./helicopter-field.js');const d=helicopterDoorPoints(heli)[0];player.x=d.x;player.z=d.z;player.yaw=heli.yaw;},player:()=>({x:player.x,z:player.z,yaw:player.yaw}),faceHeli(){player.yaw=Math.atan2(heli.x-player.x,-(heli.z-player.z));},heli:()=>({x:heli.x,y:heli.y,z:heli.z,status:heli.status,powered:heli.powered,grounded:heli.grounded,rpm:heli.rpm}),player:()=>({...player})};`;
 route.fulfill({body:body+hook,headers:{'content-type':'text/javascript'}});
});
await page.goto(url);await page.waitForSelector('#vehicle-scene canvas');
await page.evaluate(()=>{localStorage.setItem('neon-eclipse.journey.v6','sentinel-journey');});
await page.click('#resume-drive');await page.waitForFunction(()=>document.body.dataset.driveActive==='true');
assert.equal(await page.getAttribute('body','data-heli-status'),'ready','helicopter cold and ready at the shore pad on boot');
const spawn=await page.evaluate(()=>window.__heliFixture.heli());assert(Math.hypot(spawn.x-196,spawn.z-120)<.5,'shore pad position '+JSON.stringify(spawn));
// Walk (teleported) to the side door, board with E.
await page.evaluate(()=>window.__heliFixture.walkToPad());await page.waitForTimeout(200);await page.keyboard.press('KeyE');
await page.waitForFunction(()=>document.body.dataset.vehicleKind==='helicopter');
assert.equal(await page.locator('#drive-mode').textContent(),'AIR / 直升机');
await page.screenshot({path:`${shots}/heli-boarded.png`});
// Engine off: Shift does nothing; exit allowed while cold.
await page.keyboard.down('ShiftLeft');await page.waitForTimeout(600);await page.keyboard.up('ShiftLeft');
assert.equal(await page.getAttribute('body','data-heli-grounded'),'true','no lift without the engine');
assert.equal(await page.getAttribute('body','data-heli-powered'),'false');
// Start the engine (I), spool up, lift with Shift.
await page.keyboard.press('KeyI');await page.waitForFunction(()=>document.body.dataset.heliPowered==='true');
await page.keyboard.press('KeyE');assert.equal(await page.getAttribute('body','data-vehicle-kind'),'helicopter','cannot exit with the engine running');
await page.keyboard.down('ShiftLeft');await page.waitForFunction(()=>document.body.dataset.heliGrounded==='false',{},{timeout:30000});
await page.waitForFunction(()=>Number(document.body.dataset.heliY)>4,{},{timeout:30000});await page.keyboard.up('ShiftLeft');
await page.screenshot({path:`${shots}/heli-airborne.png`});
const air=await page.evaluate(()=>window.__heliFixture.heli());assert(air.y>4&&air.status==='running'&&!air.grounded,'airborne '+JSON.stringify(air));
assert.equal(await page.getAttribute('body','data-vehicle-kind'),'helicopter');
// Chin gun: airborne left-click fires and consumes the belt; right-click launches a rocket; weapon HUD shows the helicopter belt.
{
 const ammo0=Number(await page.getAttribute('body','data-heli-ammo'));
 await page.mouse.move(640,450);await page.mouse.down({button:'left'});await page.waitForTimeout(500);await page.mouse.up({button:'left'});
 await page.waitForFunction(a=>Number(document.body.dataset.heliShots)>0&&Number(document.body.dataset.heliAmmo)<a,ammo0,{timeout:5000});
 await page.mouse.down({button:'right'});await page.waitForTimeout(150);await page.mouse.up({button:'right'});
 await page.waitForFunction(()=>Number(document.body.dataset.heliRockets)<2,{},{timeout:5000});
 const ammoText=await page.locator('#vw-ammo').textContent();assert.match(ammoText,/\d+ \/ 140|装填/,'weapon HUD shows the helicopter belt: '+ammoText);
 await page.screenshot({path:`${shots}/heli-gun.png`});
}
// Sling load: hover over the crate at hook height, F hooks (dataset + cable), F again releases; crate stays intact from a low release.
{
 await page.evaluate(()=>window.__heliFixture.overCrate());await page.waitForTimeout(150);
 const sfxBeforeHook=await page.evaluate(()=>window.neonVehicleAudio.sfx.stats().played);
 await page.keyboard.press('KeyF');await page.waitForFunction(()=>document.body.dataset.slingHooked==='true',{},{timeout:5000});
 await page.waitForFunction(n=>window.neonVehicleAudio.sfx.stats().played>n,sfxBeforeHook,{timeout:5000});// hook latch cue
 await page.waitForFunction(()=>Number(document.body.dataset.slingCargoY)>1,{},{timeout:5000});
 await page.screenshot({path:`${shots}/heli-sling.png`});
 await page.evaluate(()=>window.__heliFixture.lowerForRelease());await page.waitForFunction(()=>Number(document.body.dataset.slingCargoY)<.6,{},{timeout:5000});
 await page.keyboard.press('KeyF');await page.waitForFunction(()=>document.body.dataset.slingHooked==='false',{},{timeout:5000});
 await page.waitForFunction(()=>Number(document.body.dataset.slingCargoY)<.05,{},{timeout:5000});
 assert.equal(await page.getAttribute('body','data-sling-damaged'),'0','low release keeps the crate intact');
 // Supply run: that stray release counts as a loss (respawn timer), the run stays on leg 0 with the garage as target.
 assert.equal(await page.getAttribute('body','data-sling-run-status'),'active');assert.equal(await page.getAttribute('body','data-sling-run-target'),'garage');
 assert.ok(Number(await page.getAttribute('body','data-sling-run-respawn'))>0,'loss starts the respawn timer');
 await page.waitForFunction(()=>Number(document.body.dataset.slingRunRespawn)===0,{},{timeout:45000});// 8 s sim; dt is clamped to 0.1 so slow swiftshader frames stretch it
 // Hook the respawned crate, carry it over the garage zone and set it down: leg 1 credited, target advances to the island.
 await page.evaluate(()=>window.__heliFixture.overCrate());await page.waitForTimeout(150);
 await page.keyboard.press('KeyF');await page.waitForFunction(()=>document.body.dataset.slingHooked==='true',{},{timeout:5000});
 await page.evaluate(()=>window.__heliFixture.overZone('garage'));await page.waitForFunction(()=>Number(document.body.dataset.slingCargoY)<.6,{},{timeout:5000});
 await page.keyboard.press('KeyF');await page.waitForFunction(()=>document.body.dataset.slingRunLeg==='1',{},{timeout:5000});
 assert.equal(await page.getAttribute('body','data-sling-run-target'),'island','next leg targets the island');assert.equal(await page.getAttribute('body','data-sling-deliveries'),'1');
 await page.screenshot({path:`${shots}/heli-sling-run.png`});
 // Medevac (plan B): finish the supply run on the platform leg → casualty pod spawns on the island with a 90 s clock;
 // carry it steadily to the shore medical zone and set it down → graded completion.
 assert.equal(await page.getAttribute('body','data-medevac-status'),'locked');
 await page.waitForFunction(()=>Number(document.body.dataset.slingRunRespawn)===0,{},{timeout:45000});
 await page.evaluate(()=>{window.__heliFixture.skipToLastLeg();return window.__heliFixture.overCrate();});await page.waitForTimeout(150);
 await page.keyboard.press('KeyF');await page.waitForFunction(()=>document.body.dataset.slingHooked==='true',{},{timeout:5000});
 await page.evaluate(()=>window.__heliFixture.overZone('platform'));await page.waitForFunction(()=>Number(document.body.dataset.slingCargoY)<12.6,{},{timeout:5000});
 await page.keyboard.press('KeyF');await page.waitForFunction(()=>document.body.dataset.slingRunStatus==='done',{},{timeout:5000});
 assert.equal(await page.getAttribute('body','data-medevac-status'),'active','supply run completion starts the medevac');
 assert.ok(Number(await page.getAttribute('body','data-heli-rockets'))>=2,'reward rockets granted');
 await page.evaluate(()=>window.__heliFixture.overPod());await page.waitForTimeout(150);
 await page.keyboard.press('KeyF');await page.waitForFunction(()=>document.body.dataset.slingHooked==='true',{},{timeout:5000});
 await page.evaluate(()=>window.__heliFixture.overZone('medical'));await page.waitForFunction(()=>Number(document.body.dataset.slingCargoY)<.6,{},{timeout:5000});
 await page.keyboard.press('KeyF');await page.waitForFunction(()=>document.body.dataset.medevacStatus==='done',{},{timeout:5000});
 const grade=await page.getAttribute('body','data-medevac-grade');assert.ok(['S','A','B'].includes(grade),'graded: '+grade);
 assert.ok(Number(await page.getAttribute('body','data-medevac-health'))>50,'teleported carry keeps the patient healthy');
 await page.screenshot({path:`${shots}/heli-medevac.png`});
 await page.evaluate(()=>window.__heliFixture.backToPad());await page.waitForTimeout(100);
}
// Hold Space (brake) then descend gently with Ctrl; expect a landing, not a crash.
await page.keyboard.down('Space');await page.waitForTimeout(800);await page.keyboard.up('Space');
// Descent from the ~13 m release height takes 45-60 s under swiftshader; allow 90 s.
await page.keyboard.down('ControlLeft');await page.waitForFunction(()=>document.body.dataset.heliGrounded==='true',{},{timeout:90000});await page.keyboard.up('ControlLeft');
const down=await page.evaluate(()=>window.__heliFixture.heli());assert.notEqual(down.status,'crashed','gentle descent lands: '+JSON.stringify(down));
// Shut down, exit on foot.
await page.keyboard.press('KeyI');await page.waitForFunction(()=>document.body.dataset.heliPowered==='false');
await page.waitForFunction(()=>window.__heliFixture.heli().rpm<.08,{},{timeout:45000});
const cold=await page.evaluate(()=>window.__heliFixture.heli());await page.keyboard.press('KeyE');
try{await page.waitForFunction(()=>document.body.dataset.vehicleKind==='walking',{},{timeout:15000});}catch(e){throw new Error('exit failed: '+JSON.stringify(cold)+' hint='+await page.locator('#drive-message').textContent().catch(()=>'?')+' '+errors.join('|'));}
await page.screenshot({path:`${shots}/heli-exit.png`});
// The parked airframe is solid to the walker: facing the cabin from the door and holding W stops well short of the centre line.
await page.evaluate(()=>window.__heliFixture.faceHeli());await page.keyboard.down('KeyW');await page.waitForTimeout(1500);await page.keyboard.up('KeyW');
{const p=await page.evaluate(()=>window.__heliFixture.player()),h=await page.evaluate(()=>window.__heliFixture.heli());const d=Math.hypot(p.x-h.x,p.z-h.z);assert(d>1.4&&d<3.6,'walker blocked by the fuselage, not inside it: distance '+d.toFixed(2));}
// Recovery from the pause overlay parks the helicopter back on the shore pad.
await page.keyboard.press('Escape');await page.click('#recover-drive');await page.click('#recover-drive');await page.click('#resume-drive');await page.waitForFunction(()=>document.body.dataset.driveActive==='true');
const parked=await page.evaluate(()=>window.__heliFixture.heli());assert(Math.hypot(parked.x-196,parked.z-120)<.5&&parked.status==='ready'&&!parked.powered,'recovered to shore pad '+JSON.stringify(parked));
// Lighthouse standalone start parks the helicopter on the island pad, cold.
await page.keyboard.press('Escape');await page.click('#start-lighthouse');await page.click('#start-lighthouse');
await page.waitForFunction(()=>document.body.dataset.lighthouseStatus==='active'&&document.body.dataset.driveActive==='true');
const island=await page.evaluate(()=>window.__heliFixture.heli());assert(Math.hypot(island.x-512,island.z-252)<.5&&island.powered===false,'island pad '+JSON.stringify(island));
assert.equal(await page.getAttribute('body','data-lighthouse-stage'),'board');
assert.deepEqual(errors,[],'no page errors');
await browser.close();
console.log('PASS: helicopter field browser — shore pad spawn, door boarding, cold-engine gate, I engine toggle, Shift lift-off, Ctrl landing, shutdown/exit, native W walk blocked by the parked fuselage, chin gun fire + rocket while airborne, sling hook/release, recovery park, lighthouse island pad. Screenshots: '+shots);
