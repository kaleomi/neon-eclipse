import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import assert from 'node:assert/strict';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const shots=process.env.VEHICLE_SCREENSHOT_DIR||fs.mkdtempSync(path.join(os.tmpdir(),'neon-sea-air-'));fs.mkdirSync(shots,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:960,height:640}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);
 await page.goto(process.env.VEHICLE_TEST_URL||'http://127.0.0.1:5173/vehicle.html');await page.waitForSelector('#vehicle-scene canvas');
 await page.evaluate(()=>{localStorage.setItem('neon-eclipse.journey.v4','unchanged-journey');localStorage.setItem('neon-eclipse.chapter-achievements.v1','unchanged-awards');});
 await page.screenshot({path:path.join(shots,'joint-intro.png')});
 await page.click('[data-station=airfield]');await page.click('[data-station=airfield]');await page.waitForFunction(()=>document.body.dataset.driveActive==='true');
 await page.screenshot({path:path.join(shots,'aircraft-parked.png')});
 await page.keyboard.press('KeyE');await page.waitForFunction(()=>document.body.dataset.vehicleKind==='plane');
 await page.keyboard.press('KeyE');await page.waitForFunction(()=>document.body.dataset.vehicleKind==='walking');await page.keyboard.press('KeyE');await page.waitForFunction(()=>document.body.dataset.vehicleKind==='plane');
 await page.keyboard.down('Shift');await page.keyboard.down('KeyS');await page.waitForFunction(()=>parseFloat(document.querySelector('#flight-altitude').textContent)>8,{},{timeout:90000});await page.keyboard.up('Shift');await page.keyboard.up('KeyS');
 assert.equal(await page.locator('#drive-gear').textContent(),'飞行');await page.keyboard.press('KeyE');assert.equal(await page.getAttribute('body','data-vehicle-kind'),'plane','airborne exit must be denied');
 await page.screenshot({path:path.join(shots,'aircraft-flight.png')});await page.keyboard.press('KeyC');await page.waitForFunction(()=>document.body.dataset.cameraMode==='hood');await page.keyboard.press('Escape');await page.waitForSelector('#drive-overlay:not([hidden])');
 const altitude=await page.locator('#flight-altitude').textContent();await page.waitForTimeout(300);assert.equal(await page.locator('#flight-altitude').textContent(),altitude,'pause freezes altitude');
 await page.click('[data-station=marina]');await page.click('[data-station=marina]');await page.waitForFunction(()=>document.body.dataset.vehicleKind==='walking');await page.screenshot({path:path.join(shots,'yacht-moored.png')});
 await page.keyboard.press('KeyE');await page.waitForFunction(()=>document.body.dataset.vehicleKind==='yacht');await page.keyboard.press('KeyE');await page.waitForFunction(()=>document.body.dataset.vehicleKind==='walking');await page.keyboard.press('KeyE');await page.waitForFunction(()=>document.body.dataset.vehicleKind==='yacht');
 await page.keyboard.down('KeyW');await page.waitForFunction(()=>Number(document.querySelector('#drive-speed').textContent)>75);await page.keyboard.up('KeyW');await page.keyboard.press('KeyE');assert.equal(await page.getAttribute('body','data-vehicle-kind'),'yacht');
 if(await page.getAttribute('body','data-camera-mode')==='hood'){await page.keyboard.press('KeyC');await page.waitForFunction(()=>document.body.dataset.cameraMode==='chase');}
 await page.keyboard.press('KeyC');await page.waitForFunction(()=>document.body.dataset.cameraMode==='hood');assert.match(await page.locator('#drive-camera-label').textContent(),/前向/,'yacht hood label');await page.keyboard.press('KeyC');await page.waitForFunction(()=>document.body.dataset.cameraMode==='chase');
 await page.screenshot({path:path.join(shots,'yacht-underway.png')});await page.keyboard.down('Space');await page.waitForFunction(()=>document.querySelector('#drive-speed').textContent==='0');await page.keyboard.up('Space');
 await page.keyboard.press('KeyE');assert.equal(await page.getAttribute('body','data-vehicle-kind'),'yacht','open water exit must be denied');
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.waitForSelector('#drive-overlay:not([hidden])');
 await page.click('[data-station=garage]');await page.click('[data-station=garage]');await page.keyboard.press('KeyE');await page.waitForFunction(()=>document.body.dataset.vehicleKind==='rover');await page.keyboard.down('KeyW');await page.waitForFunction(()=>Number(document.querySelector('#drive-speed').textContent)>10);await page.keyboard.up('KeyW');await page.keyboard.press('Escape');
 assert.deepEqual(await page.evaluate(()=>[localStorage.getItem('neon-eclipse.journey.v4'),localStorage.getItem('neon-eclipse.chapter-achievements.v1')]),['unchanged-journey','unchanged-awards']);
 for(const size of [{width:1280,height:800},{width:390,height:780}]){await page.setViewportSize(size);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 assert.deepEqual(errors,[]);console.log('PASS: real three-vehicle selection and boarding, fixed-wing keyboard takeoff/no-air-exit/pause, yacht mooring/acceleration/braking/no-water-exit, station reset, rover regression, isolated saves, responsive UI and no page errors');
}finally{await browser.close();}
