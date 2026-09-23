// Real app: rebind jump via the settings UI, drive movement with a fake gamepad, and confirm SFX subtitles + language switch.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import net from 'node:net';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const port=await new Promise(r=>{const s=net.createServer();s.listen(0,()=>{const p=s.address().port;s.close(()=>r(p));});});
const child=spawn(process.execPath,['server.cjs'],{env:{...process.env,PORT:String(port)},stdio:'ignore'});await new Promise(r=>setTimeout(r,1500));
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 const context=await browser.newContext(),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(45000);
 // Fake standard gamepad: tests set window.__pad to control axes/buttons.
 await context.addInitScript(()=>{window.__pad=null;navigator.getGamepads=()=>[window.__pad];});
 await context.route('**/app.js',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8')+'\nwindow.__b8={pos:()=>({x:camera.position.x,z:camera.position.z}),feetY:()=>playerMotion.state.y,state:()=>state,firing:()=>firing,selected:()=>selected,allowed:()=>[...Array(weapons.length).keys()].filter(i=>loadout.allows(i))};'}));
 await page.goto(`http://127.0.0.1:${port}/index.html?map=reactor`);await page.waitForFunction(()=>document.body.dataset.menuOpen==='true');
 // --- settings UI (home page of the menu): bindings panel renders, rebind jump Space→KeyX via listening button
 await page.click('#menu-settings');await page.click('#settings-tab-controls');await page.waitForSelector('#menu-bindings [data-bind="jump"]');
 assert.equal(await page.textContent('#menu-bindings [data-bind="jump"]'),'SPACE');
 await page.click('#menu-bindings [data-bind="jump"]');assert.equal(await page.textContent('#menu-bindings [data-bind="jump"]'),'请按键…');
 await page.keyboard.press('KeyX');await page.waitForFunction(()=>document.querySelector('#menu-bindings [data-bind="jump"]').textContent==='X');
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('neon-eclipse.bindings.v1')).overrides.jump[0]),'KeyX');
 // reserved key rejected
 await page.click('#menu-bindings [data-bind="reload"]');await page.keyboard.press('ArrowUp');
 assert.equal(await page.textContent('#menu-bindings [data-bind="reload"]'),'R');assert.equal(await page.textContent('[data-bindings-status]'),'该键为保留键');
 // a11y: subtitles on, shapes on, colour mode → canvas filter
 await page.click('#settings-tab-accessibility');await page.check('#menu-a11y input[data-a11y-subtitles]');await page.check('#menu-a11y input[data-a11y-shapes]');await page.click('input[name="menu-color-mode"][value="deuteranopia"]');
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.colorMode),'deuteranopia');
 assert.match(await page.evaluate(()=>document.querySelector('canvas').style.filter),/cvd-deuteranopia/);
 assert.ok(await page.evaluate(()=>!!document.querySelector('#a11y-filters filter#cvd-deuteranopia')));
 // language: switch to en updates settings heading, persists
 const localeTab=await page.locator('[data-locale]').evaluate(el=>el.closest('[role=tabpanel]')?.getAttribute('aria-labelledby'));if(localeTab)await page.locator('#'+localeTab).click();
 await page.selectOption('[data-locale]','en');assert.equal(await page.textContent('#menu-settings-title'),'Settings');
 assert.equal(await page.textContent('#menu-bindings h4'),'Key bindings');assert.equal(await page.evaluate(()=>document.documentElement.lang),'en');
 await page.selectOption('[data-locale]','zh-CN');assert.equal(await page.textContent('#menu-settings-title'),'设置');
 // --- play: rebound key works, old one does not
 await page.goto(`http://127.0.0.1:${port}/index.html?map=reactor&menu=chapter`);await page.waitForFunction(()=>document.body.dataset.menuOpen==='true');await page.click('#deploy');await page.waitForFunction(()=>document.body.dataset.playState==='playing');
 // jumpRequested is consumed within one frame, so observe the jump through feet height instead of the flag.
 await page.waitForTimeout(400);await page.keyboard.press('Space');await page.waitForTimeout(500);assert.ok(await page.evaluate(()=>window.__b8.feetY())<.05,'Space no longer jumps');
 await page.keyboard.press('KeyX');await page.waitForFunction(()=>window.__b8.feetY()>.1,null,{timeout:8000});await page.waitForFunction(()=>window.__b8.feetY()<.05,null,{timeout:8000});
 // --- gamepad: left stick forward moves the player; RT fires; Start pauses
 const before=await page.evaluate(()=>window.__b8.pos());
 const pad=(axes,pressed=[])=>({id:'Fake Pad (STANDARD GAMEPAD)',connected:true,mapping:'standard',axes,buttons:Array.from({length:17},(_,i)=>({pressed:pressed.includes(i),value:pressed.includes(i)?1:0}))});
 await page.evaluate(p=>{window.__pad=p;},pad([0,-1,0,0]));await page.waitForTimeout(1500);
 const after=await page.evaluate(()=>window.__b8.pos());assert.ok(Math.hypot(after.x-before.x,after.z-before.z)>.5,'stick moved player '+JSON.stringify([before,after]));
 // Software WebGL frames can take >150ms; wait on state instead of fixed sleeps.
 await page.evaluate(p=>{window.__pad=p;},pad([0,0,0,0],[7]));await page.waitForFunction(()=>window.__b8.firing()===true,null,{timeout:8000}).catch(()=>{});assert.equal(await page.evaluate(()=>window.__b8.firing()),true,'RT fires');
 await page.evaluate(p=>{window.__pad=p;},pad([0,0,0,0]));await page.waitForFunction(()=>window.__b8.firing()===false,null,{timeout:8000}).catch(()=>{});assert.equal(await page.evaluate(()=>window.__b8.firing()),false,'RT release');
 await page.evaluate(p=>{window.__pad=p;},pad([0,0,0,0],[15]));await page.waitForFunction(()=>window.__b8.selected()!==0,null,{timeout:8000}).catch(()=>{});const sel=await page.evaluate(()=>window.__b8.selected()),allowed=await page.evaluate(()=>window.__b8.allowed());console.log('allowed weapons',allowed,'selected',sel);if(allowed.length>1)assert.equal(sel,allowed.find(i=>i>0),'RB cycles to next allowed weapon');else assert.equal(sel,0,'single weapon stays');
 await page.evaluate(p=>{window.__pad=p;},pad([0,0,0,0]));await page.waitForTimeout(150);
 // subtitles: weapon.switch caption appeared while playing
 await page.keyboard.press('KeyR');await page.waitForTimeout(150);
 const captions=await page.evaluate(()=>[...document.querySelectorAll('.sfx-subtitles div')].map(d=>d.textContent));console.log('captions',captions);assert.ok(captions.length>0,'a subtitle appeared during play (weapon switch / reload / fire)');
 await page.evaluate(p=>{window.__pad=p;},pad([0,0,0,0],[9]));await page.waitForFunction(()=>document.body.dataset.playState==='paused');
 await page.evaluate(p=>{window.__pad=p;},pad([0,0,0,0]));
 assert.deepEqual(errors,[],'no page errors');
 console.log('PASS: b8 browser — rebinding UI+persist+play, reserved reject, a11y colour filter/shapes/subtitles, i18n switch, gamepad move/fire/cycle/pause');
}finally{await browser?.close();child.kill();}
