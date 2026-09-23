// Real menu and control binders, isolated storage; this fixture intentionally excludes WebGL.
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {startVehicleTestServer} from '../scripts/vehicle-browser-server.mjs';
import {DEPLOYMENT_PRIMARIES} from '../src/menu-deployment.js';
import {createRuntimeWeapons} from '../weapons/runtime.js';
import {THROWABLES} from '../src/tactical-rules.js';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const server=await startVehicleTestServer();let browser;
try {
 browser=await chromium.launch({headless:true,args:['--disable-gpu']});
 const context=await browser.newContext({viewport:{width:1440,height:960}}),p=await context.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(20000);
 const source=await readFile('session-chrome.js','utf8'),overlay=source.match(/overlay\.innerHTML\s*=\s*`([\s\S]*?)`;/)?.[1];assert(overlay);
 await p.route('**/app.js',r=>r.fulfill({contentType:'text/javascript',body:"import {mountCleanFixture} from '../src/browser-ui-clean-fixture.js';mountCleanFixture("+JSON.stringify(overlay)+');'}));
 await p.goto(server.base+'/index.html');await p.waitForFunction(()=>window.__cleanUI&&document.body.dataset.uiReady==='true');
 const storage=()=>p.evaluate(()=>JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]))));
 const before=await storage();await p.click('#menu-new');const weapons=createRuntimeWeapons(),shapes=new Set();
 for(const i of DEPLOYMENT_PRIMARIES){
  await p.selectOption('#menu-deploy-primary',String(i));
  assert.equal(await p.locator('[data-deploy-preview=name]').textContent(),weapons[i].name);
  assert.equal(await p.locator('[data-deploy-preview=capacity]').textContent(),weapons[i].cap+' 发');
  assert.equal(await p.locator('[data-deploy-preview=range]').textContent(),weapons[i].range+' m');
  assert.equal(await p.locator('[data-deploy-preview=reload]').textContent(),weapons[i].reload+' s');
  assert.equal(await p.locator('[data-deploy-preview=reload-label]').textContent(),weapons[i].perShell?'单发装填':'换弹时间');
  shapes.add(await p.locator('.weapon-outline').getAttribute('d'));
  for(const t of THROWABLES){await p.selectOption('#menu-deploy-throwable',t);assert((await p.locator('[data-deploy-preview=tactical]').textContent()).length>8);assert.match(await p.locator('[data-deploy-preview=status]').textContent(),/出发草稿.*开始游戏后应用/);}
 }
 assert.equal(shapes.size,DEPLOYMENT_PRIMARIES.length);assert.equal(await storage(),before);
 console.log('PASS 24 combinations: live base stats, distinct schematics, per-shell label, tactical notes, zero storage writes');
 await mkdir('.tools/qa-deployment-polish',{recursive:true});
 const shot=name=>p.screenshot({path:'.tools/qa-deployment-polish/'+name+'.png'});
 await p.selectOption('#menu-deploy-primary','5');
 for(const [w,h] of [[1440,960],[1024,640],[390,844]]){
  await p.setViewportSize({width:w,height:h});
  assert(await p.locator('.menu-views').evaluate(e=>e.scrollWidth<=e.clientWidth+2));
  assert(await p.locator('.deployment-console').evaluate(e=>e.scrollWidth<=e.clientWidth+2));
  await p.locator('#menu-begin').scrollIntoViewIfNeeded();
  assert(await p.locator('#menu-begin').evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}));
  await p.locator('#menu-prepare-title').scrollIntoViewIfNeeded();await shot('prepare-'+w);
 }
 await p.setViewportSize({width:1440,height:960});await p.locator('#menu-deploy-primary').focus();await p.keyboard.press('Tab');await p.keyboard.press('Shift+Tab');assert(await p.locator('#menu-deploy-primary').evaluate(e=>e===document.activeElement&&e.matches(':focus-visible')));
 assert.notEqual(await p.locator('#menu-deploy-primary').evaluate(e=>getComputedStyle(e).outlineStyle),'none');
 await p.keyboard.press('Escape');assert(await p.locator('#menu-new').isVisible());assert.equal(await storage(),before);
 console.log('PASS 3 deployment layouts, scroll-reachable start, visible keyboard focus, cancel preserves storage');
 await p.click('#menu-settings');await shot('settings');await p.click('#settings-tab-audio');
 await p.locator('[data-audio-bus=master]').focus();await p.keyboard.press('Tab');await p.keyboard.press('Shift+Tab');assert(await p.locator('[data-audio-bus=master]').evaluate(e=>e===document.activeElement&&e.matches(':focus-visible')));assert.notEqual(await p.locator('[data-audio-bus=master]').evaluate(e=>getComputedStyle(e).outlineStyle),'none');
 await p.click('#settings-tab-gameplay');await p.click('[data-menu-gear]');await p.locator('.carry-panel').waitFor({state:'visible'});await p.click('#equipment-tab-mods');
 await p.selectOption('[data-ui-mod-weapon]','4');
 for(const [w,h] of [[1440,960],[390,844]]){
  await p.setViewportSize({width:w,height:h});assert(await p.locator('.carry-panel').evaluate(e=>e.scrollWidth<=e.clientWidth+2));await shot('workshop-'+w);
 }
 await p.locator('[data-weapon-mod="4:0"]').focus();await p.keyboard.press('Tab');await p.keyboard.press('Shift+Tab');assert(await p.locator('[data-weapon-mod="4:0"]').evaluate(e=>e===document.activeElement&&e.matches(':focus-visible')));assert.notEqual(await p.locator('[data-weapon-mod="4:0"]').evaluate(e=>getComputedStyle(e).outlineStyle),'none');
 assert.deepEqual(errors,[]);console.log('PASS settings and workshop focus, narrow workshop, no page exceptions');
}finally{await browser?.close();await server.stop();}
