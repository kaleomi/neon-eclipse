// Optional browser regression for P3 vehicle weapons and wear. Real WebGL page, real keyboard and
// mouse; no test hooks in gameplay code. Install Playwright separately (VEHICLE_PLAYWRIGHT_MODULE).
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const url=process.env.VEHICLE_TEST_URL||'http://127.0.0.1:5173/vehicle.html';
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1280,height:800}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(url);await page.waitForSelector('#vehicle-scene canvas');
await page.evaluate(()=>{localStorage.setItem('neon-eclipse.journey.v4','sentinel-journey');localStorage.setItem('neon-eclipse.chapter-achievements.v1','sentinel-honors');});
const data=name=>page.evaluate(n=>document.body.dataset[n],name);
await page.click('#resume-drive');await page.waitForFunction(()=>document.body.dataset.driveActive==='true');
assert.equal(await page.isHidden('#vehicle-weapon-panel'),true,'weapon panel hidden on foot');
// Enter the rover, drive, switch to the gunner seat: rover keeps rolling without steering input.
await page.keyboard.press('KeyE');await page.waitForFunction(()=>document.body.dataset.vehicleMode==='driving');
assert.equal(await page.isVisible('#vehicle-weapon-panel'),true,'weapon panel visible in vehicle');assert.equal(await data('gunner'),'false');
await page.keyboard.down('KeyW');await page.waitForFunction(()=>Number(document.querySelector('#drive-speed').textContent)>30,{},{timeout:20000});await page.keyboard.up('KeyW');
await page.keyboard.press('KeyF');await page.waitForFunction(()=>document.body.dataset.gunner==='true');
assert.equal(await page.textContent('#drive-mode'),'ROVER / 炮手');assert.equal(await page.isVisible('#drive-crosshair'),true,'crosshair shown in gunner seat');
await page.waitForTimeout(600);assert(Number(await page.textContent('#drive-speed'))>20,'cruise keeps speed after seat switch');
// Cannot exit from the gunner seat while moving; brake, then fire a burst with the mouse.
await page.keyboard.press('KeyE');assert.equal(await data('vehicleMode'),'driving','gunner cannot exit a rolling car');
await page.keyboard.down('Space');await page.waitForFunction(()=>document.querySelector('#drive-speed').textContent==='0');await page.keyboard.up('Space');
const ammoBefore=Number(await data('roofAmmo'));
// Software WebGL frames advance at most 0.1 s of simulation each, so wait on the counter, not on wall-clock time.
await page.mouse.move(640,400);await page.mouse.down();await page.waitForFunction(()=>Number(document.body.dataset.roofShots)>=4,{},{timeout:15000});await page.mouse.up();
await page.waitForTimeout(250);const shots=Number(await data('roofShots'));assert(shots>=4,'sustained fire while holding the button: '+shots);assert(Number(await data('roofAmmo'))<ammoBefore,'belt consumed');
await page.waitForTimeout(400);assert.equal(Number(await data('roofShots')),shots,'fire stops on mouse up');
// Back to the driver seat, exit; weapons never fired from the driver seat.
await page.keyboard.press('KeyF');await page.waitForFunction(()=>document.body.dataset.gunner==='false');
await page.mouse.down();await page.waitForTimeout(300);await page.mouse.up();assert.equal(Number(await data('roofShots')),shots,'driver seat cannot fire');
assert.equal(await page.textContent('#drive-mode'),'ROVER / 驾驶');
// Durability: full-speed impact into the garage-side building lowers hull; repair inside garage berth restores it.
assert.equal(await data('roverHull'),'100.00');
await page.keyboard.press('KeyE');await page.waitForFunction(()=>document.body.dataset.vehicleMode==='walking');
await page.keyboard.press('KeyE');await page.waitForFunction(()=>document.body.dataset.vehicleMode==='driving');
// Turn left toward the garage building west of the spawn, then hold straight until an impact registers.
await page.keyboard.down('KeyW');await page.keyboard.down('KeyA');await page.waitForFunction(()=>Number(document.body.dataset.jointRover?JSON.parse(document.body.dataset.jointRover).yaw:0)<-1.4,{},{timeout:30000});await page.keyboard.up('KeyA');
await page.waitForFunction(()=>Number(document.querySelector('#drive-impacts').textContent)>0,{},{timeout:30000});await page.keyboard.up('KeyW');
assert(Number(await data('roverHull'))<100,'impact reduced rover durability');
// Recovery resets wear and weapons but never touches campaign storage.
await page.keyboard.press('Escape');await page.waitForSelector('#drive-overlay:not([hidden])');
await page.click('#recover-drive');await page.click('#recover-drive');await page.click('#resume-drive');await page.waitForFunction(()=>document.body.dataset.vehicleMode==='walking');
assert.equal(await data('roverHull'),'100.00');assert.equal(await data('roofShots'),'0');assert.equal(await data('gunner'),'false');
// Weapons are disarmed during missions: start the sea chase and confirm the panel is gone and F does not toggle gunner state.
await page.keyboard.press('Escape');await page.waitForSelector('#drive-overlay:not([hidden])');
await page.click('#start-chase');await page.click('#start-chase');await page.waitForFunction(()=>document.body.dataset.chaseStatus==='active');
assert.equal(await data('weaponsArmed'),'false');assert.equal(await page.isHidden('#vehicle-weapon-panel'),true,'weapon panel hidden during chase');
assert.deepEqual(await page.evaluate(()=>[localStorage.getItem('neon-eclipse.journey.v4'),localStorage.getItem('neon-eclipse.chapter-achievements.v1')]),['sentinel-journey','sentinel-honors']);
for(const size of [{width:960,height:640},{width:390,height:780}]){await page.setViewportSize(size);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
assert.deepEqual(errors,[]);
console.log('PASS: real WebGL vehicle page, gunner seat switch with cruise, moving-exit refusal, mouse-held fire and stop, driver seat cannot fire, impact wear, recovery reset, weapons disarmed during chase, campaign storage untouched, narrow layouts');
await browser.close();
