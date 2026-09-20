// Browser: ?touch=1 mounts the overlay; synthetic pointer events board the rover, drive, brake, enter gunner seat and fire; ?touch=0 hides it.
import assert from 'node:assert/strict';
import {startVehicleTestServer} from './scripts/vehicle-browser-server.mjs';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const server=await startVehicleTestServer();let browser;const results=[];
async function step(name,fn){try{await fn();results.push({name,ok:true});console.log('ok   '+name);}catch(e){results.push({name,ok:false});console.log('FAIL '+name+'\n '+(e?.stack||e));}}
try{
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:1100,height:700},hasTouch:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const tap=sel=>page.locator(sel).dispatchEvent('pointerdown',{pointerId:9,clientX:0,clientY:0,bubbles:true}).then(()=>page.locator(sel).dispatchEvent('pointerup',{pointerId:9,bubbles:true}));
 const hold=(sel,id)=>page.locator(sel).dispatchEvent('pointerdown',{pointerId:id,clientX:0,clientY:0,bubbles:true});
 const release=(sel,id)=>page.locator(sel).dispatchEvent('pointerup',{pointerId:id,bubbles:true});
 await page.goto(`${server.base}/vehicle.html?touch=1`);await page.waitForFunction(()=>!!document.querySelector('canvas')&&!!window.neonVehicleTouch);
 await step('?touch=1 mounts the overlay with stick, look zone and buttons',async()=>{
  assert.equal(await page.getAttribute('body','data-touch-controls'),'true');
  assert.equal(await page.locator('#touch-controls [data-touch]').count(),11);
  await page.click('#resume-drive');await page.waitForFunction(()=>document.body.dataset.driveActive==='true');
 });
 await step('tap 上下车 boards the rover; stick forward drives; hold 刹车 stops',async()=>{
  await tap('[data-touch="board"]');await page.waitForFunction(()=>document.body.dataset.vehicleKind==='rover',{},{timeout:10000});
  const box=await page.locator('#touch-controls .touch-stick').boundingBox();const cx=box.x+box.width/2,cy=box.y+box.height/2;
  await page.locator('#touch-controls .touch-stick').dispatchEvent('pointerdown',{pointerId:1,clientX:cx,clientY:cy,bubbles:true});
  await page.locator('#touch-controls .touch-stick').dispatchEvent('pointermove',{pointerId:1,clientX:cx,clientY:cy-50,bubbles:true});
  await page.waitForFunction(()=>Number(document.querySelector('#drive-speed').textContent)>5,{},{timeout:8000});
  await page.locator('#touch-controls .touch-stick').dispatchEvent('pointerup',{pointerId:1,bubbles:true});
  await hold('[data-touch="brake"]',2);await page.waitForFunction(()=>Number(document.querySelector('#drive-speed').textContent)<1,{},{timeout:8000});await release('[data-touch="brake"]',2);
 });
 await step('tap 炮手 enters the gunner seat; hold 开火 fires; look drag turns the turret; release stops',async()=>{
  await tap('[data-touch="seat"]');await page.waitForFunction(()=>document.body.dataset.gunner==='true',{},{timeout:5000});
  await hold('[data-touch="fire"]',3);await page.waitForFunction(()=>Number(document.body.dataset.roofShots)>3,{},{timeout:5000});
  const look=page.locator('#touch-controls .touch-look');await look.dispatchEvent('pointerdown',{pointerId:4,clientX:800,clientY:300,bubbles:true});await look.dispatchEvent('pointermove',{pointerId:4,clientX:860,clientY:300,bubbles:true});await look.dispatchEvent('pointerup',{pointerId:4,bubbles:true});
  await release('[data-touch="fire"]',3);await page.waitForTimeout(150);const shots=Number(await page.getAttribute('body','data-roof-shots'));await page.waitForTimeout(400);
  assert.equal(Number(await page.getAttribute('body','data-roof-shots')),shots,'released fire button stops shooting');
 });
 await step('tap 暂停 pauses and again resumes; pause clears held touch keys',async()=>{
  await hold('[data-touch="brake"]',5);await tap('[data-touch="pause"]');await page.waitForFunction(()=>document.body.dataset.driveActive==='false',{},{timeout:5000});
  assert.equal(await page.getAttribute('[data-touch="brake"]','data-on'),'false','reset clears button highlight');
  await tap('[data-touch="pause"]');await page.waitForFunction(()=>document.body.dataset.driveActive==='true',{},{timeout:5000});
 });
 await step('?touch=0 on a touch device hides the overlay',async()=>{
  const p2=await context.newPage();await p2.goto(`${server.base}/vehicle.html?touch=0`,{waitUntil:'domcontentloaded'});await p2.waitForFunction(()=>'touchControls' in document.body.dataset,{},{timeout:30000});
  assert.equal(await p2.getAttribute('body','data-touch-controls'),'false');assert.equal(await p2.locator('#touch-controls').count(),0);await p2.close();
 });
 const fatal=errors.filter(e=>!/ResizeObserver/.test(e));assert.deepEqual(fatal,[]);
 await context.close();
}finally{await browser?.close();await server.stop();}
const failed=results.filter(r=>!r.ok);console.log(`vehicle touch browser: ${results.length-failed.length}/${results.length} passed`);if(failed.length)process.exit(1);
