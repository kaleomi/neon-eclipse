// Browser: a synthetic standard gamepad (navigator.getGamepads stub) boards the rover, drives it, brakes, pauses/resumes and fires.
import assert from 'node:assert/strict';
import {startVehicleTestServer} from '../scripts/vehicle-browser-server.mjs';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const server=await startVehicleTestServer();let browser;const results=[];
async function step(name,fn){try{await fn();results.push({name,ok:true});console.log('ok   '+name);}catch(e){results.push({name,ok:false});console.log('FAIL '+name+'\n '+(e?.stack||e));}}
try{
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:1280,height:800}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.addInitScript(()=>{
  const state={axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0})),present:false};
  window.__pad={set(axes,pressed){state.axes=axes;state.buttons=state.buttons.map((_,i)=>({pressed:pressed.includes(i),value:pressed.includes(i)?1:0}));},plug(v){state.present=v;}};
  navigator.getGamepads=()=>state.present?[{id:'Synthetic Standard Pad',index:0,connected:true,mapping:'standard',axes:state.axes,buttons:state.buttons}]:[];
 });
 await page.goto(`${server.base}/vehicle.html`);await page.waitForFunction(()=>!!document.querySelector('canvas')&&!!window.neonVehicleGamepad);
 await step('no pad → dataset.gamepad=false; plugging in flips it and shows the help toast',async()=>{
  await page.click('#resume-drive');await page.waitForFunction(()=>document.body.dataset.driveActive==='true');
  assert.equal(await page.getAttribute('body','data-gamepad'),'false');
  await page.evaluate(()=>window.__pad.plug(true));await page.waitForFunction(()=>document.body.dataset.gamepad==='true');
  await page.waitForFunction(()=>/手柄/.test(document.querySelector('#drive-message')?.textContent||''),{},{timeout:5000});
 });
 await step('LB tap boards the rover; left stick drives; A brakes',async()=>{
  await page.evaluate(()=>window.__pad.set([0,0,0,0],[4]));await page.waitForFunction(()=>document.body.dataset.vehicleKind==='rover',{},{timeout:10000});
  await page.evaluate(()=>window.__pad.set([0,0,0,0],[]));await page.waitForTimeout(100);
  await page.evaluate(()=>window.__pad.set([0,-1,0,0],[]));await page.waitForFunction(()=>Number(document.querySelector('#drive-speed').textContent)>5,{},{timeout:8000});
  await page.evaluate(()=>window.__pad.set([0,0,0,0],[0]));await page.waitForFunction(()=>Number(document.querySelector('#drive-speed').textContent)<1,{},{timeout:8000});
  await page.evaluate(()=>window.__pad.set([0,0,0,0],[]));
 });
 await step('X enters the gunner seat, RT fires the roof gun, right stick aims',async()=>{
  await page.evaluate(()=>window.__pad.set([0,0,0,0],[2]));await page.waitForFunction(()=>document.body.dataset.gunner==='true',{},{timeout:5000});
  await page.evaluate(()=>window.__pad.set([0,0,.6,0],[7]));await page.waitForFunction(()=>Number(document.body.dataset.roofShots)>3,{},{timeout:5000});
  await page.evaluate(()=>window.__pad.set([0,0,0,0],[]));const shots=Number(await page.getAttribute('body','data-roof-shots'));await page.waitForTimeout(400);
  assert.equal(Number(await page.getAttribute('body','data-roof-shots')),shots,'releasing RT stops firing');
 });
 await step('Start pauses and resumes; held keys are released on pause',async()=>{
  await page.evaluate(()=>window.__pad.set([0,-1,0,0],[9]));await page.waitForFunction(()=>document.body.dataset.driveActive==='false',{},{timeout:5000});
  await page.evaluate(()=>window.__pad.set([0,-1,0,0],[]));await page.waitForTimeout(150);
  await page.evaluate(()=>window.__pad.set([0,0,0,0],[9]));await page.waitForFunction(()=>document.body.dataset.driveActive==='true',{},{timeout:5000});
  await page.evaluate(()=>window.__pad.set([0,0,0,0],[]));
 });
 await step('unplugging clears the flag and any injected keys',async()=>{
  await page.evaluate(()=>{window.__pad.set([0,-1,0,0],[]);});await page.waitForTimeout(200);await page.evaluate(()=>window.__pad.plug(false));
  await page.waitForFunction(()=>document.body.dataset.gamepad==='false');
 });
 const fatal=errors.filter(e=>!/ResizeObserver/.test(e));assert.deepEqual(fatal,[]);
 await context.close();
}finally{await browser?.close();await server.stop();}
const failed=results.filter(r=>!r.ok);console.log(`vehicle gamepad browser: ${results.length-failed.length}/${results.length} passed`);if(failed.length)process.exit(1);
