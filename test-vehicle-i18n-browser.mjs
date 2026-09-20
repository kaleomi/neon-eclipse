// Browser: language picker in the overlay switches vehicle.html chrome to English and back; choice persists across reload; HUD dataset locale follows.
import assert from 'node:assert/strict';
import {startVehicleTestServer} from './scripts/vehicle-browser-server.mjs';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const server=await startVehicleTestServer();let browser;const results=[];
async function step(name,fn){try{await fn();results.push({name,ok:true});console.log('ok   '+name);}catch(e){results.push({name,ok:false});console.log('FAIL '+name+'\n '+(e?.stack||e));}}
try{
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:1280,height:800},locale:'zh-CN'});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(`${server.base}/vehicle.html`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.neonVehicleI18n&&!!document.querySelector('#vehicle-language-select'));
 await step('defaults to zh-CN with the source copy and a picker inside the overlay',async()=>{
  assert.equal(await page.getAttribute('html','lang'),'zh-CN');assert.equal(await page.getAttribute('body','data-locale'),'zh-CN');
  assert.equal(await page.locator('#resume-drive').textContent(),'进入试验区 →');
  assert.ok(await page.locator('#drive-overlay #vehicle-language-select').count()===1,'picker lives in the overlay');
 });
 await step('switching to English translates briefs, buttons, difficulty options, legend and panel captions',async()=>{
  await page.selectOption('#vehicle-language-select','en');
  await page.waitForFunction(()=>document.documentElement.lang==='en');
  assert.equal(await page.locator('#resume-drive').textContent(),'Enter the proving ground →');
  assert.equal(await page.locator('#frontier-free-drive').textContent(),'End the mission, back to free drive');
  assert.equal(await page.locator('#start-windfarm').textContent(),'开始风电场夺控 · 第 6 关','start buttons are runtime copy and stay zh-CN by design');
  assert.match(await page.locator('.frontier-brief > p').first().textContent(),/^Level 6, wind farm seizure/);
  assert.equal(await page.locator('#frontier-difficulty-select option[value="hard"]').textContent(),'Hard');
  assert.match(await page.locator('.shared-control-legend').textContent(),/board \/ exit/);
  assert.equal(await page.evaluate(()=>document.querySelector('#frontier-panel > small').textContent),'FRONTIER / Vanguard 6–8','hidden mission panel caption translated too');
  assert.equal(await page.locator('#pause-drive').textContent(),'Pause ESC');
  assert.equal(await page.locator('#return-menu small').textContent(),'Back to menu ↗');
 });
 await step('choice persists across reload (shared neon-eclipse.locale.v1 key) and switching back restores zh-CN',async()=>{
  const p2=await context.newPage();await p2.goto(`${server.base}/vehicle.html`,{waitUntil:'domcontentloaded'});await p2.waitForFunction(()=>document.documentElement.lang==='en',{},{timeout:30000});
  assert.equal(await p2.locator('#recover-drive').textContent(),'Recover all vehicles and reset routes');
  assert.equal(await p2.evaluate(()=>localStorage.getItem('neon-eclipse.locale.v1')),'en');
  await p2.selectOption('#vehicle-language-select','zh-CN');await p2.waitForFunction(()=>document.documentElement.lang==='zh-CN');
  assert.equal(await p2.locator('#recover-drive').textContent(),'回收全部载具并重置路线');await p2.close();
 });
 await step('gameplay still starts after switching (overlay button works, runtime copy remains zh-CN by design)',async()=>{
  await page.click('#resume-drive');await page.waitForFunction(()=>document.body.dataset.driveActive==='true');
  assert.match(await page.locator('#drive-task').textContent(),/[\u4e00-\u9fff]/);
 });
 const fatal=errors.filter(e=>!/ResizeObserver/.test(e));assert.deepEqual(fatal,[]);
 await context.close();
}finally{await browser?.close();await server.stop();}
const failed=results.filter(r=>!r.ok);console.log(`vehicle i18n browser: ${results.length-failed.length}/${results.length} passed`);if(failed.length)process.exit(1);
