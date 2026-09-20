// Production navigation + new-campaign loadout. Isolated browser storage and owned server.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {startVehicleTestServer} from './scripts/vehicle-browser-server.mjs';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const server=await startVehicleTestServer();let browser;
try {
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1440,height:900},locale:'zh-CN'});
 await context.addInitScript(()=>{if(!localStorage.getItem('neon-eclipse.presentation.v1'))localStorage.setItem('neon-eclipse.presentation.v1',JSON.stringify({quality:0,motion:false,strength:1,scale:1,density:'standard'}));});
 const errors=[];let p;
 const freshPage=async()=>{await p?.close();p=await context.newPage();p.setDefaultTimeout(60000);p.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});};
 await freshPage();
 const base=server.base;await mkdir('.tools/qa-menu-simplify',{recursive:true});
 const home=async()=>{await freshPage();await p.goto(base+'/index.html?intro=0');await p.locator('#menu-new').waitFor({state:'visible'});};
 const state=()=>p.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>/journey|campaign|expedition/.test(k)).sort().map(k=>[k,localStorage.getItem(k)])));
 const shot=async name=>{await p.screenshot({path:'.tools/qa-menu-simplify/'+name+'.png',timeout:60000});};
 if(!process.env.MENU_RETURN_ONLY){
 await home();
 assert.deepEqual(await p.locator('.menu-home-actions button b').allTextContents(),['继续游戏','新游戏','设置','成就']);assert.equal(await p.locator('[data-view=home] button:visible').count(),4);assert(await p.locator('#menu-continue').isDisabled());
 await shot('01-home');console.log('PASS native four-entry home in requested DOM order');
 const before=await state();await p.click('#menu-new');assert(await p.locator('#menu-prepare-title').isVisible());await p.selectOption('#menu-deploy-primary','5');await p.selectOption('#menu-deploy-throwable','smoke');assert.deepEqual(await state(),before);
 await shot('02-prepare');await p.keyboard.press('Escape');assert(await p.locator('#menu-new').isVisible());assert.deepEqual(await state(),before);console.log('PASS preparation and cancel do not replace saves or launch a game');
 await p.click('#menu-new');await p.click('#menu-levels');assert.equal(await p.locator('.menu-chapter-grid>a').count(),9);assert(await p.locator('#menu-rover').isVisible());assert(await p.locator('[data-view=levels] [data-menu-route=p4]').isVisible());assert.equal(await p.locator('[data-view=levels] [data-menu-route=archive]').count(),0);await shot('03-levels');
 await p.click('[data-view=levels] [data-menu-route=p4]');await p.waitForURL('**/p4-hub.html');console.log('PASS chapter selection contains nine chapters and actual action-hub navigation');
 await home();await p.click('#menu-achievements');assert(await p.locator('[data-view=achievements] [data-menu-route=archive]').isVisible());await p.click('[data-view=achievements] [data-menu-route=archive]');await p.waitForURL('**/operations-archive.html');console.log('PASS action archive is nested under achievements and navigates');
 await home();
 for(const [width,height] of [[1440,900],[1024,640],[390,844]]){
  await p.setViewportSize({width,height});
  for(const view of ['home','prepare','levels']){
   if(view==='prepare')await p.click('#menu-new');if(view==='levels')await p.click('#menu-levels');
   assert(await p.locator('.menu-views').evaluate(e=>e.scrollWidth<=e.clientWidth+2),view+' has no horizontal overflow at '+width);
   const button=p.locator(view==='home'?'#menu-achievements':view==='prepare'?'#menu-begin':'#menu-rover');await button.scrollIntoViewIfNeeded();
   assert(await button.evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1;}),view+' primary button inside viewport');
   if(width===390)await shot('mobile-'+view);
  }
  await home();
 }
 console.log('PASS 9 desktop/short-window/mobile layout cases');await p.setViewportSize({width:1280,height:800});
 // Real native launch, not a fixture: inspect the checkpoint created by production flow.
 await p.click('#menu-new');await p.selectOption('#menu-deploy-primary','5');await p.selectOption('#menu-deploy-throwable','smoke');await p.click('#menu-begin');await p.waitForFunction(()=>document.body.dataset.playState==='playing');
 const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('neon-eclipse.journey.v7')));assert.equal(saved.checkpoint.loadout.primary,5);assert.equal(saved.checkpoint.loadout.throwable,'smoke');assert.equal(saved.checkpoint.loadout.melee,3);
 await p.keyboard.press('Escape');await p.waitForFunction(()=>document.body.dataset.playState==='paused');console.log('PASS selected loadout reaches the actual new-campaign checkpoint');
 await home();const savedBytes=await state();await p.click('#menu-new');await p.click('#menu-begin');assert(await p.locator('.menu-confirm').isVisible());await p.click('#menu-confirm-cancel');assert.deepEqual(await state(),savedBytes);assert(await p.locator('#menu-begin').isVisible());console.log('PASS existing journey replacement requires confirmation; cancel preserves bytes');
 // Non-reactor launch transports only validated first-chapter loadout, never chapter pickups.
 await p.goto(base+'/index.html?map=station&intro=0');await p.locator('#menu-new').waitFor({state:'visible'});await p.click('#menu-new');await p.selectOption('#menu-deploy-primary','1');await p.selectOption('#menu-deploy-throwable','decoy');await p.click('#menu-begin');await p.click('#menu-confirm-ok');await p.waitForURL(/map=reactor.*menu=deploy/);await p.waitForFunction(()=>document.body.dataset.playState==='playing');
 const transported=await p.evaluate(()=>JSON.parse(localStorage.getItem('neon-eclipse.journey.v7')).checkpoint.loadout);assert.equal(transported.primary,1);assert.equal(transported.throwable,'decoy');await p.keyboard.press('Escape');console.log('PASS non-reactor new-game route retains the selected starting loadout');
 }
 await home();await p.click('#menu-new');await p.click('#menu-levels');await p.click('#menu-rover');await p.click('#menu-confirm-ok');await p.waitForURL('**/vehicle.html');await p.locator('#vehicle-return-menu').waitFor({state:'visible'});
 await shot('04-vehicle-return');
 for(const tab of ['overview','campaign','missions','settings','records']){await p.click('#vehicle-tab-'+tab);assert(await p.locator('#vehicle-return-menu').isVisible());}
 const vehicleBefore=await state();await p.click('#vehicle-return-menu');await p.waitForURL('**/index.html');await p.locator('#menu-new').waitFor({state:'visible'});assert.deepEqual(await state(),vehicleBefore);console.log('PASS vehicle entry and return to actual home from modal footer; saved progress unchanged');
 // Existing guard is reused after starting a vehicle session: cancel, then accept.
 await p.goto(base+'/vehicle.html');await p.locator('#vehicle-return-menu').waitFor({state:'visible'});await p.click('#resume-drive');await p.waitForFunction(()=>document.querySelector('#drive-overlay').hidden);await p.keyboard.press('Escape');await p.locator('#vehicle-return-menu').waitFor({state:'visible'});
 p.once('dialog',d=>d.dismiss());await p.click('#vehicle-return-menu');assert.match(p.url(),/vehicle.html/);assert(await p.locator('#vehicle-return-menu').isVisible());
 p.once('dialog',d=>d.accept());await p.click('#vehicle-return-menu');await p.waitForURL('**/index.html');console.log('PASS vehicle return preserves existing cancel/accept confirmation');
 assert.deepEqual(errors,[]);console.log('PASS no production page exceptions');
}finally{await browser?.close();await server.stop();}
