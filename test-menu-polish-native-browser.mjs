// Actual WebGL entry, isolated origin/storage. No fixture or game-state injection.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {startVehicleTestServer} from './scripts/vehicle-browser-server.mjs';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const server=await startVehicleTestServer();let browser;
try{
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1440,height:900},locale:'zh-CN'});
 const page=await context.newPage(),errors=[];page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  localStorage.setItem('neon-eclipse.presentation.v1',JSON.stringify({quality:0,motion:false,strength:1,scale:1,density:'standard'}));
  // Freeze only frame scheduling during captures, never change game state.
  const native=requestAnimationFrame.bind(window),queue=new Set();
  window.requestAnimationFrame=fn=>native(t=>{if(window.__menuCapture&&fn.name==='frame'){queue.add(fn);window.__menuFrozen=true;return;}fn(t);});
  window.__menuUnfreeze=()=>{window.__menuCapture=false;window.__menuFrozen=false;for(const fn of queue)native(fn);queue.clear();};
 });
 const dir='.tools/qa-menu-polish';await mkdir(dir,{recursive:true});
 async function shot(name){await page.evaluate(()=>window.__menuCapture=true);await page.waitForFunction(()=>window.__menuFrozen===true);await page.screenshot({path:dir+'/'+name+'.png',timeout:30000});await page.evaluate(()=>window.__menuUnfreeze());}
 await page.goto(server.base+'/index.html?map=reactor&intro=0');
 await page.waitForFunction(()=>document.body.dataset.uiReady==='true');
 assert(await page.locator('#menu-continue').isDisabled());await shot('native-home');
 await page.click('#menu-new');await page.click('#menu-levels');assert.equal(await page.locator('.menu-chapter-grid>a').count(),9);await shot('native-chapters');
 await page.locator('.menu-chapter-grid>a[data-map=reactor]').click();await page.click('#deploy');
 await page.waitForFunction(()=>document.body.dataset.playState==='playing');
 await page.keyboard.press('Escape');await page.waitForFunction(()=>document.body.dataset.playState==='paused');
 await page.locator('.menu-rail [data-open=home]').click();
 assert.equal(await page.locator('.menu-home-actions>button').first().getAttribute('id'),'menu-continue');
 await page.click('#menu-continue');await page.waitForFunction(()=>document.body.dataset.playState==='playing');
 assert.deepEqual(errors,[]);console.log('PASS native WebGL boot, home, nine chapters, real chapter deploy, pause/home/continue; no page errors. Software rendering is not a performance benchmark.');
 await context.close();
}finally{await browser?.close();await server.stop();}
