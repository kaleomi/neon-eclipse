// Controlled stage-3 + guard-clear fixture, matching the existing boss harness. Not a natural chapter clear.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {startVehicleTestServer} from '../scripts/vehicle-browser-server.mjs';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const server=await startVehicleTestServer(),dir='.tools/qa-switchyard-e-2026-09-22';let browser;
try{
 await mkdir(dir,{recursive:true});browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1440,height:800}}),p=await context.newPage(),errors=[];p.setDefaultTimeout(90000);p.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(()=>localStorage.setItem('neon-eclipse.presentation.v1',JSON.stringify({quality:0,motion:false})));
 await p.route('**/app.js',async route=>{const response=await route.fetch();let source=await response.text();assert(source.includes("if(state==='playing')update(dt);"));source=source.replace("if(state==='playing')update(dt);",'if(false)update(dt);');source+=`
window.__switchProbe={
 place(x,z,ty,tx=30){camera.position.set(x,1.7,z);playerMotion.reset(camera.position,0);camera.lookAt(tx,ty,z);yaw=camera.rotation.y;pitch=camera.rotation.x;camera.updateMatrixWorld(true);scene.updateMatrixWorld(true);},
 tick(seconds){for(let left=seconds;left>1e-8&&state==='playing';){const dt=Math.min(.05,left);left-=dt;chrome.update(dt);update(dt);}scene.updateMatrixWorld(true);return this.snap();},
 setup(){reset(0);enemies.forEach(e=>disposeGroup(e.group));enemies.length=0;enemyProjectiles.clear();mission.reset(3);art.setStage(3);navigation.invalidate();overseer.setStage(3);mission.state.defending=true;mission.state.progress=17.95;camera.position.set(22,1.7,-19.6);playerMotion.reset(camera.position,0);state='playing';document.body.dataset.playState=state;overlay.hidden=true;campaignUI.announce(mission.current);this.tick(.1);camera.position.set(0,1.7,30);playerMotion.reset(camera.position,0);this.tick(6.4);if(loadout.equip(1))changeWeapon(1);this.tick(.4);return this.snap();},
 snap(){return {state,stage:mission.state.index,health,selected,rail:overseer.rail,phase:overseer.state.phase,keys:[...keys],held:bindings.held(keys,'interact'),binding:bindings.codesFor('interact'),busy:{moving,firing,reload,switching:handling.state.switchRemaining,meleeRemaining,emp:emp.aiming,damage:chrome.timers().damageTime,grounded:playerMotion.state.grounded},pose:{x:camera.position.x,z:camera.position.z,y:camera.position.y,yaw,pitch,feet:playerMotion.state.y},hint:document.querySelector('.switchyard-panel')?.textContent,bars:[...document.querySelectorAll('.switchyard-panel [role=progressbar]')].map(e=>({value:e.getAttribute('aria-valuenow'),label:e.getAttribute('aria-label')}))};}
};`;await route.fulfill({response,body:source});});
 await p.goto(server.base+'/index.html?map=station&menu=chapter');await p.waitForFunction(()=>document.body.dataset.menuOpen==='true');await p.click('#deploy');await p.waitForFunction(()=>window.__switchProbe&&document.body.dataset.playState==='playing');
 const results=[];const run=(method,args=[])=>p.evaluate(([method,args])=>__switchProbe[method](...args),[method,args]);
 const meter=p.locator('.switchyard-hold-track'),fill=p.locator('.switchyard-hold-fill'),row=p.locator('.switchyard-hold');
 const progress=async()=>Number(await meter.getAttribute('aria-valuenow'));
 for(const [name,x,y]of [['west-console',28.4,1.15],['east-console',31,1.15],['east-beacon',31,1.75]]){
  await run('setup');await run('place',[x,-29,y]);await run('tick',[.05]);assert(await meter.isVisible());assert.equal(await progress(),0);
  await p.keyboard.down('KeyE');let state=await run('tick',[.3]);assert.equal(state.held,true);assert(Math.abs(state.rail.hold-.3)<1e-8);assert.equal(await progress(),50);assert.equal(await fill.evaluate(e=>e.style.width),'50%');assert.equal(await p.locator('.switchyard-health-fill').evaluate(e=>e.style.width),'100%','HP is not the interaction progress');
  const fraction=await meter.evaluate(e=>e.firstElementChild.getBoundingClientRect().width/(e.getBoundingClientRect().width-2));assert(Math.abs(fraction-.5)<.02,'a real visible half-width bar');
  if(name==='east-console')await p.screenshot({path:dir+'/after-hold-half.png'});
  await p.keyboard.up('KeyE');state=await run('tick',[.02]);assert.equal(state.rail.hold,0);assert.equal(await progress(),0);assert.equal(await fill.evaluate(e=>e.style.width),'0%');
  await p.keyboard.down('KeyE');state=await run('tick',[.65]);await p.keyboard.up('KeyE');assert(state.rail.armed);assert.equal(await progress(),100);assert.equal(await row.getAttribute('data-state'),'armed');assert.match(await meter.getAttribute('aria-valuetext'),/等待列车破盾/);
  if(name==='east-console')await p.screenshot({path:dir+'/after-armed.png'});results.push({name,armed:state.rail.armed});console.log('PASS '+name+': native E, visible 50%, release 0%, armed 100%, independent HP bar');
 }
 await run('setup');await run('place',[31,-25,1.15]);await p.keyboard.down('KeyE');let state=await run('tick',[.65]);await p.keyboard.up('KeyE');assert(!state.rail.armed);assert.equal(await progress(),0);assert.equal(await row.getAttribute('data-state'),'wrong');
 await run('setup');await run('place',[31,-29,1.7,40]);await p.keyboard.down('KeyE');state=await run('tick',[.3]);await p.keyboard.up('KeyE');assert.equal(state.rail.hold,0);assert.equal(await progress(),0);assert.equal(await row.getAttribute('data-state'),'blocked');assert.match(await p.locator('.switchyard-panel').textContent(),/准星/);
 await run('setup');await run('tick',[3.25]);await run('place',[31,-29,1.15]);await p.keyboard.down('KeyE');state=await run('tick',[.5]);await p.keyboard.up('KeyE');assert.equal(state.rail.mode,'moving');assert(!state.rail.armed);assert.equal(await progress(),0);assert.equal(await row.getAttribute('data-state'),'moving');
 console.log('PASS wrong control / facing away / departed train never fake progress or arming');
 await run('setup');await run('place',[31,-29,1.15]);await p.keyboard.down('KeyE');await run('tick',[.2]);assert((await progress())>0);await p.keyboard.press('Escape');await p.keyboard.up('KeyE');await p.waitForFunction(()=>document.body.dataset.playState==='paused');assert(await p.locator('.switchyard-panel').isHidden());await p.click('#deploy');await p.waitForFunction(()=>document.body.dataset.playState==='playing');state=await run('tick',[.05]);assert.equal(state.rail.hold,0);assert.equal(await progress(),0);
 await p.keyboard.down('KeyE');state=await run('tick',[.65]);await p.keyboard.up('KeyE');assert(state.rail.armed);await run('place',[0,30,1.7]);state=await run('tick',[5.2]);assert.equal(state.phase,'exposed');assert(await row.isHidden());
 console.log('PASS pause cancels/hides, resume resets, native train exposes core and hides obsolete hold bar');
 assert.deepEqual(errors,[]);await writeFile(dir+'/regression.json',JSON.stringify(results,null,2)+'\n');await context.close();
}finally{await browser?.close();await server.stop();}
