import assert from 'node:assert/strict';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:960,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);
 await page.goto(process.env.VEHICLE_TEST_URL||'http://127.0.0.1:5173/vehicle.html');
 const box=page.locator('[data-flight-invert]');assert.equal(await box.isChecked(),false);
 await page.evaluate(()=>localStorage.setItem('campaign-test-sentinel','keep'));
 await box.check();assert.match(await page.locator('[data-flight-invert-hint]').textContent(),/W 抬头/);
 await page.reload();await box.waitFor();assert.equal(await box.isChecked(),true);
 await page.click('[data-station=airfield]');await page.click('[data-station=airfield]');await page.keyboard.press('KeyE');await page.waitForFunction(()=>document.body.dataset.vehicleKind==='plane');
 assert.match(await page.locator('#control-hints').textContent(),/W 抬头/);
 await page.keyboard.down('Shift');await page.keyboard.down('KeyW');await page.waitForFunction(()=>parseFloat(document.querySelector('#flight-altitude').textContent)>12);await page.keyboard.up('Shift');await page.keyboard.up('KeyW');
 await page.keyboard.press('Escape');await box.uncheck();assert.match(await page.locator('[data-flight-invert-hint]').textContent(),/W 压低/);
 await page.reload();await box.waitFor();assert.equal(await box.isChecked(),false);
 assert.equal(await page.evaluate(()=>localStorage.getItem('campaign-test-sentinel')),'keep');
 await page.click('[data-station=airfield]');await page.click('[data-station=airfield]');await page.keyboard.press('KeyE');await page.waitForFunction(()=>document.body.dataset.vehicleKind==='plane');
 await page.keyboard.down('Shift');await page.keyboard.down('KeyS');await page.waitForFunction(()=>parseFloat(document.querySelector('#flight-altitude').textContent)>12);await page.keyboard.up('Shift');await page.keyboard.up('KeyS');
 assert.deepEqual(errors,[]);console.log('PASS: checkbox default/toggle, reload persistence, inverted W takeoff, restored S takeoff, dynamic hints, save isolation, no page errors');
}finally{await browser.close();}
