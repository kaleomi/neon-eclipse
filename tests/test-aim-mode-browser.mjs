// Actual app event handlers and ADS interpolation; clock/actors are controlled only in this test response.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
let child,browser;
const output=path.resolve('.tools/qa-aim-mode'),passes=[],pass=text=>{passes.push(text);console.log('PASS '+text);};
try{
 const port=await new Promise(resolve=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
 child=spawn(process.execPath,['server.cjs'],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),15000);child.stdout.on('data',b=>{if(String(b).includes('ready')){clearTimeout(timer);resolve();}});child.on('error',reject);});
 await mkdir(output,{recursive:true});
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1280,height:800}}),page=await context.newPage(),errors=[];page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.stack));
 await page.addInitScript(()=>{
  if(!localStorage.getItem('neon-eclipse.controls.v1'))localStorage.setItem('neon-eclipse.controls.v1',JSON.stringify({version:1,sensitivity:1.35,keep:'legacy-preference'}));
  localStorage.setItem('neon-eclipse.presentation.v1',JSON.stringify({quality:0,motion:false,strength:1,scale:1,density:'standard'}));
 });
 await page.route('**/app.js',async route=>{
  const response=await route.fetch({maxRetries:2});let source=await response.text();assert(source.includes('requestAnimationFrame(frame);'));source=source.replaceAll('requestAnimationFrame(frame);','/* test-only manual clock */');
  source+=String.raw`
window.__aimMode={
 setup({stage=0}={}){chapterIntro?.cancel();reset(stage);state='playing';document.body.dataset.playState=state;overlay.hidden=true;document.activeElement?.blur?.();for(const e of enemies)scene.remove(e.group);enemies.length=0;enemyProjectiles.clear();enemyDirector.update=()=>0;engineerDirector.update=()=>{};camera.position.set(0,1.7,0);playerMotion.reset(camera.position,0);yaw=0;pitch=0;camera.rotation.set(0,0,0);handling.update(1,false);cooldown=0;gamepad.reset();return this.snap();},
 snap(){hud();gameMenu.update(state);return {state,aiming,ads:handling.state.ads,mode:combatUI.aimMode,selected:selectedCarriedWeapon(),controller:aimInput.active,parry:{...parry.state},ord:ordnance.snapshot(),prefs:JSON.parse(localStorage.getItem('neon-eclipse.controls.v1')),reload,rounds:rounds.slice()};},
 step(seconds){for(let left=seconds;left>1e-8;){const dt=Math.min(.05,left);if(state==='playing')update(dt);left-=dt;}return this.snap();},
 pause(){pause();return this.snap();},resume(){state='playing';document.body.dataset.playState=state;overlay.hidden=true;document.activeElement?.blur?.();return this.snap();},
 mode(value){const select=document.querySelector('[data-aim-mode]');select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));return this.snap();},
 empty(){rounds[selected]=0;return this.snap();},
 pad(on){Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[{connected:true,axes:[0,0,0,0],buttons:Array.from({length:16},(_,i)=>({pressed:i===6&&on,value:i===6&&on?1:0}))}]});pollGamepad();return this.snap();},
 cache(){const e=STAGE_ENTRIES[2];camera.position.set(e.x,(e.feetY||0)+1.7,e.z);playerMotion.reset(camera.position,e.feetY||0);handling.update(1,false);cooldown=0;if(!ordnance.pick())throw Error('LANCE cache unavailable');return this.snap();},
 end(){end(false);return this.snap();}
};`;
  await route.fulfill({response,body:source});
 });
 const url='http://127.0.0.1:'+port+'/index.html?intro=0&menu=settings&category=controls';
 await page.goto(url);await page.waitForFunction(()=>window.__aimMode&&document.body.dataset.uiReady==='true');
 const select=page.locator('[data-aim-mode]'),slider=page.locator('.sensitivity-setting input');
 assert.equal(await select.count(),1,'操作分类 must contain the hold/toggle ADS setting');assert(await select.isVisible());assert.equal(await select.inputValue(),'hold');assert.equal(await slider.inputValue(),'1.35');
 const raw=await page.evaluate(()=>localStorage.getItem('neon-eclipse.controls.v1'));assert(!JSON.parse(raw).aimMode,'opening settings must not rewrite legacy controls');
 pass('new ADS option is in Controls; old sensitivity survives and defaults to hold without a storage write');
 const run=(method,arg)=>page.evaluate(([m,a])=>window.__aimMode[m](a),[method,arg]);
 await run('setup');await page.mouse.move(640,400);await page.mouse.down({button:'right'});let s=await run('step',.6);assert(s.aiming&&s.ads>.95);await page.mouse.up({button:'right'});s=await run('step',.6);assert(!s.aiming&&s.ads<.05);
 pass('default hold mode aims only while RMB is held, using actual ADS interpolation');
 await run('pause');await page.locator('.menu-rail [data-open=settings]').click();await page.click('#settings-tab-controls');await select.selectOption('toggle');
 await slider.focus();await page.keyboard.press('ArrowRight');s=await run('snap');assert.equal(s.prefs.aimMode,'toggle');assert.equal(s.prefs.sensitivity,1.4);assert.equal(s.prefs.keep,'legacy-preference');
 await page.reload();await page.waitForFunction(()=>window.__aimMode&&document.body.dataset.uiReady==='true');assert.equal(await select.inputValue(),'toggle');assert.equal(await slider.inputValue(),'1.4');
 await select.blur();await page.screenshot({path:path.join(output,'controls-desktop.png')});
 await page.setViewportSize({width:390,height:844});assert(await select.evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;}));await page.screenshot({path:path.join(output,'controls-narrow.png')});await page.setViewportSize({width:1280,height:800});
 pass('native setting change persists across reload; changing sensitivity preserves mode and unrelated fields; desktop/narrow layout fits');
 await run('setup');await page.mouse.move(640,400);await page.mouse.click(640,400,{button:'right'});s=await run('step',.6);assert(s.aiming&&s.controller&&s.ads>.95);s=await run('step',1);assert(s.aiming&&s.ads>.95);
 await page.mouse.click(640,400,{button:'right'});s=await run('step',.6);assert(!s.aiming&&!s.controller&&s.ads<.05);
 await page.mouse.down({button:'right'});await run('step',1);s=await run('snap');assert(s.aiming);await page.mouse.up({button:'right'});assert((await run('snap')).aiming);
 pass('toggle mode survives RMB release, second click exits, and a long press only toggles once');
 await run('empty');await page.keyboard.press('KeyR');s=await run('step',.2);assert(s.reload>0&&s.aiming);assert(s.ads<.95);s=await run('step',3);assert.equal(s.reload,0);assert(s.aiming&&s.ads>.95);
 pass('reload temporarily lowers the sight without losing the toggle choice');
 await page.keyboard.press('Digit2');s=await run('step',.6);assert.equal(s.selected,2);assert(!s.aiming&&!s.controller&&s.ads<.05);await page.keyboard.press('Digit3');await run('step',.3);await page.mouse.down({button:'right'});s=await run('snap');assert(!s.aiming&&!s.controller);assert(s.parry.active||s.parry.held||s.parry.remaining>0,'right mouse still starts the real blade parry');await page.mouse.up({button:'right'});s=await run('step',.8);assert(!s.aiming);
 pass('1/2/3 weapon changes clear ADS; blade RMB stays parry, never a toggle latch');
 await run('setup');await page.mouse.click(640,400,{button:'right'});assert((await run('snap')).aiming);await page.keyboard.press('Escape');s=await run('snap');assert.equal(s.state,'paused');assert(!s.aiming&&!s.controller);await run('resume');assert(!(await run('step',1)).aiming);
 await page.mouse.click(640,400,{button:'right'});await page.evaluate(()=>window.dispatchEvent(new Event('blur')));s=await run('snap');assert.equal(s.state,'paused');assert(!s.controller);await run('resume');await page.mouse.click(640,400,{button:'right'});await page.evaluate(()=>document.dispatchEvent(new Event('pointerlockchange')));s=await run('snap');assert.equal(s.state,'paused');assert(!s.aiming&&!s.controller);
 await run('resume');await page.mouse.click(640,400,{button:'right'});s=await run('end');assert.equal(s.state,'lost');assert(!s.aiming&&!s.controller);s=await run('setup');assert(!s.aiming&&!s.controller);
 pass('pause/resume, blur, pointer-lock loss, death and reset cannot leave a stuck scope');
 await page.mouse.click(640,400,{button:'right'});await run('pad',true);s=await run('pad',false);assert(s.aiming,'releasing LT must not cancel the mouse toggle');s=await run('mode','hold');assert(!s.aiming&&!s.controller);await run('pad',true);await page.mouse.down({button:'right'});await page.mouse.up({button:'right'});assert((await run('snap')).aiming);s=await run('pad',false);assert(!s.aiming);
 await run('mode','toggle');await run('pad',true);s=await run('pad',false);assert(!s.aiming,'LT always uses hold semantics');
 pass('mouse and gamepad sources do not release each other; LT remains hold in both modes; mode changes clear aiming');
 await run('setup',{stage:2});await run('cache');await run('step',.4);const before=await run('snap');await page.mouse.click(640,400);assert.equal((await run('snap')).ord.rounds[1],before.ord.rounds[1],'unscoped LANCE is still blocked');
 await page.mouse.click(640,400,{button:'right'});s=await run('step',.6);assert(s.aiming&&s.ads>.95);await page.mouse.click(640,400);s=await run('snap');assert.equal(s.ord.rounds[1],before.ord.rounds[1]-1);assert(s.aiming);
 pass('tap-to-aim satisfies the real LANCE ADS gate, while unscoped fire remains blocked');
 assert.deepEqual(errors,[]);await context.close();
 // Separate uninstrumented production page: observe the real reticle's ADS spread, not private fixture state.
 const native=await browser.newContext({viewport:{width:1280,height:800}}),n=await native.newPage();n.setDefaultTimeout(45000);n.on('pageerror',e=>errors.push(e.stack));
 await n.addInitScript(()=>localStorage.setItem('neon-eclipse.presentation.v1',JSON.stringify({quality:0,motion:false,strength:1,scale:1,density:'standard'})));
 await n.goto(url);await n.locator('[data-aim-mode]').selectOption('toggle');await n.screenshot({path:path.join(output,'controls-native.png')});
 await n.goto('http://127.0.0.1:'+port+'/index.html?intro=0&map=reactor&menu=chapter');await n.click('#deploy');await n.waitForFunction(()=>document.body.dataset.playState==='playing'&&document.querySelector('.dynamic-crosshair').style.opacity==='1');
 const gap=await n.locator('.dynamic-crosshair').evaluate(e=>parseFloat(e.style.getPropertyValue('--gap')));assert(Number.isFinite(gap));
 await n.mouse.click(640,400,{button:'right'});await n.waitForFunction(base=>parseFloat(document.querySelector('.dynamic-crosshair').style.getPropertyValue('--gap'))<base-.2,gap);
 await n.mouse.click(640,400,{button:'right'});await n.waitForFunction(base=>parseFloat(document.querySelector('.dynamic-crosshair').style.getPropertyValue('--gap'))>base-.1,gap);
 await n.mouse.click(640,400,{button:'right'});await n.keyboard.press('Escape');await n.waitForFunction(()=>document.body.dataset.playState==='paused');await n.click('#deploy');await n.waitForFunction(base=>document.body.dataset.playState==='playing'&&parseFloat(document.querySelector('.dynamic-crosshair').style.getPropertyValue('--gap'))>base-.1,gap);
 assert.deepEqual(errors,[]);await native.close();pass('uninstrumented game loads the saved option: two native RMB clicks enter/exit ADS; resume is unscoped');
 await writeFile(path.join(output,'results.json'),JSON.stringify({passes,errors,last:s},null,2)+'\n');console.log('TOTAL '+passes.length+' groups');
}finally{await browser?.close();child?.kill();}
