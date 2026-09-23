// Optional browser regression for the P3 convoy escort (先遣队第 1 关 · 荒原车队护送). Real WebGL page, real
// keyboard and mouse; no test hooks in gameplay code. Install Playwright separately (VEHICLE_PLAYWRIGHT_MODULE).
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const url=process.env.VEHICLE_TEST_URL||'http://127.0.0.1:5173/vehicle.html';
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1280,height:800}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(url);await page.waitForSelector('#vehicle-scene canvas');
await page.evaluate(()=>{localStorage.setItem('neon-eclipse.journey.v4','sentinel-journey');localStorage.setItem('neon-eclipse.chapter-achievements.v1','sentinel-honors');localStorage.removeItem('neon-eclipse.escort-difficulty.v1');});
const data=name=>page.evaluate(n=>document.body.dataset[n],name);
assert.equal(await data('escortStatus'),'idle');assert.equal(await page.isHidden('#escort-panel'),true,'escort panel hidden before the mission');
// Difficulty select persists only its own key; two-step confirm before the mission starts.
await page.selectOption('#escort-difficulty-select','easy');assert.equal(await page.evaluate(()=>localStorage.getItem('neon-eclipse.escort-difficulty.v1')),'easy');
await page.click('#start-escort');assert.equal(await data('escortStatus'),'idle','first click only arms the button');assert.match(await page.textContent('#start-escort'),/确认开始/);
await page.click('#start-escort');await page.waitForFunction(()=>document.body.dataset.escortStatus==='active'&&document.body.dataset.driveActive==='true');
assert.equal(await data('escortDifficulty'),'easy');assert.equal(await data('vehicleMode'),'driving','mission starts inside the rover');assert.equal(await data('gunner'),'true','mission starts in the gunner seat');
assert.equal(await page.isVisible('#escort-panel'),true);assert.equal(await data('weaponsArmed'),'true','roof gun stays armed during the escort');assert.equal(await page.isVisible('#vehicle-weapon-panel'),true);
assert.equal(await page.textContent('#escort-truck-hull'),'100%');assert.equal(await page.textContent('#escort-wave'),'0 / 3');
// Truck drives on its own; the rover follows the truck from the gunner seat without any key held.
const truckZ0=Number(await data('escortTruckZ'));
await page.waitForFunction(z=>Number(document.body.dataset.escortTruckZ)<z-15,truckZ0,{timeout:30000});
await page.waitForFunction(()=>Number(document.querySelector('#drive-speed').textContent)>5,{},{timeout:30000});
// Gunner cannot leave the car during the escort; E is refused, F switches to the driver seat and back.
await page.keyboard.press('KeyE');assert.equal(await data('vehicleMode'),'driving','cannot exit the rover mid-escort');
await page.keyboard.press('KeyF');await page.waitForFunction(()=>document.body.dataset.gunner==='false');assert.equal(await page.textContent('#drive-mode'),'ROVER / 驾驶');
await page.keyboard.press('KeyF');await page.waitForFunction(()=>document.body.dataset.gunner==='true');
// First ambush (west) triggers as the truck heads north; hounds appear, telegraph lines show up and the panel flags the warning.
await page.waitForFunction(()=>Number(document.body.dataset.escortWave)>=1,{},{timeout:120000});
await page.waitForFunction(()=>Number(document.body.dataset.escortAlive)>=1,{},{timeout:10000});
assert.equal(await page.textContent('#escort-wave'),'1 / 3');
await page.waitForFunction(()=>Number(document.body.dataset.escortWarnings)>=1,{},{timeout:60000});
assert.equal(await page.getAttribute('#escort-panel','data-warning'),'true','panel highlights a live telegraph');
// Firing from the gunner seat works during the escort (hounds are legal hitscan targets; range stats keep counting shots).
const shotsBefore=Number(await data('roofShots'));await page.mouse.move(640,400);await page.mouse.down();await page.waitForFunction(s=>Number(document.body.dataset.roofShots)>s+2,shotsBefore,{timeout:15000});await page.mouse.up();
// R recovery is blocked during the escort; Escape pauses and the retry / return buttons are exposed.
await page.keyboard.down('KeyR');await page.waitForTimeout(400);await page.keyboard.up('KeyR');assert.equal(await data('escortStatus'),'active','R does not abort the escort');
await page.keyboard.press('Escape');await page.waitForSelector('#drive-overlay:not([hidden])');
assert.match(await page.textContent('#start-escort'),/重试车队护送/);assert.equal(await page.isVisible('#escort-free-drive'),true);
// Returning to free drive resets the mission and the truck; campaign storage was never touched.
await page.click('#escort-free-drive');await page.waitForFunction(()=>document.body.dataset.escortStatus==='idle'&&document.body.dataset.vehicleMode==='walking');
assert.equal(await page.isHidden('#escort-panel'),true);assert.equal(await data('gunner'),'false');assert.equal(await data('escortTruckHull'),'100.0');
assert.deepEqual(await page.evaluate(()=>[localStorage.getItem('neon-eclipse.journey.v4'),localStorage.getItem('neon-eclipse.chapter-achievements.v1')]),['sentinel-journey','sentinel-honors']);
// Other missions still disarm weapons and the escort brief remains reachable in narrow layouts.
await page.keyboard.press('Escape');await page.waitForSelector('#drive-overlay:not([hidden])');
await page.click('#start-chase');await page.click('#start-chase');await page.waitForFunction(()=>document.body.dataset.chaseStatus==='active');assert.equal(await data('weaponsArmed'),'false');assert.equal(await data('escortStatus'),'idle');
for(const size of [{width:960,height:640},{width:390,height:780}]){await page.setViewportSize(size);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
assert.deepEqual(errors,[]);
console.log('PASS: real WebGL escort page, difficulty key isolated, two-step start, gunner autopilot follow, exit refusal, seat toggle, first ambush with telegraph warning, live fire, R blocked, retry/return flow, campaign storage untouched, narrow layouts');
await browser.close();
