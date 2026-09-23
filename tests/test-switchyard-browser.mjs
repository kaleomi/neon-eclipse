import {fileURLToPath} from 'node:url';
// Opt-in isolated Chromium. Native pages + test-response-only fixture for deterministic combat.
// Fixture elides earlier guards/stages and positions the player; this is NOT a natural chapter clear.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
let child,browser;
try{
 const port=await new Promise((resolve,reject)=>{const s=createServer();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
 child=spawn(process.execPath,['server.cjs'],{cwd:fileURLToPath(new URL('../',import.meta.url)),env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(new Error('server timeout')),15000);child.stdout.on('data',d=>{if(String(d).includes('ready')){clearTimeout(t);resolve();}});child.on('error',reject);child.on('exit',c=>{clearTimeout(t);reject(new Error('server exit '+c));});});
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const base=`http://127.0.0.1:${port}/index.html`,errors=[];
 const context=await browser.newContext({viewport:{width:1100,height:760}});
 await context.addInitScript(()=>localStorage.setItem('neon-eclipse.presentation.v1',JSON.stringify({quality:0})));
 // Unmodified application import/lifecycle and nine-card menu. No fixture on these pages.
 for(const map of ['station','reactor','roof']){
  const page=await context.newPage();page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}?map=${map}&menu=chapter`);await page.waitForFunction(()=>document.body.dataset.menuOpen==='true');
  assert.equal(await page.locator('.menu-chapter-grid a[data-map]').count(),9);await page.click('#deploy');await page.waitForFunction(()=>document.body.dataset.playState==='playing');
  if(map==='station'){assert.equal(await page.locator('.switchyard-panel').getAttribute('data-phase'),'inactive');assert.equal(await page.locator('.switchyard-panel').isVisible(),false);}
  else assert.equal(await page.locator('.switchyard-panel').count(),0,'no station UI leaks into '+map);
  await page.keyboard.press('Escape');await page.waitForFunction(()=>document.body.dataset.playState==='paused');await page.close();
 }
 console.log('PASS: unmodified station/reactor/roof boots, nine chapter cards, no early boss or cross-map panel, pause');
 const p=await context.newPage();p.setDefaultTimeout(60000);p.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});
 await p.route('**/app.js',async route=>{
  const response=await route.fetch();let s=await response.text();assert(s.includes("if(state==='playing')update(dt);"));
  s=s.replace("if(state==='playing')update(dt);",'if(false)update(dt);');
  s+=`
window.__switchyardFixture={
 clearGuards(){enemies.forEach(e=>disposeGroup(e.group));enemies.length=0;enemyProjectiles.clear();},
 place(x,z,tx,tz,ty=1.9){camera.position.set(x,1.7,z);playerMotion.reset(camera.position,0);camera.lookAt(tx,ty,tz);yaw=camera.rotation.y;pitch=camera.rotation.x;camera.updateMatrixWorld(true);scene.updateMatrixWorld(true);},
 setup(){reset(0);this.clearGuards();mission.reset(3);art.setStage(3);navigation.invalidate();overseer.setStage(3);mission.state.defending=true;mission.state.progress=17.95;this.place(22,-19.6,22,-22);state='playing';document.body.dataset.playState=state;overlay.hidden=true;campaignUI.announce(mission.current);return this.snapshot();},
 // Damage fixture: prepare one carried primary; native terminal permissions are tested separately.
 equipWeapon(i){if(i!==2&&i!==3&&!loadout.equip(i))throw new Error('Cannot equip fixture primary');return loadout.allows(i);},
 snapshot(){return {state,stage:mission.state.index,defending:mission.state.defending,progress:mission.state.progress,hp:overseer.state.hp,phase:overseer.state.phase,blocking:overseer.blocking,rail:overseer.rail,health,kills,shots:[...telemetryShots],challenge:achievementUI.attempt.state,record:overseer.battle.summary,emp:emp.charges,gateOpen:!obstacles.some(o=>o.x===8&&o.z===-28&&o.w===.8&&o.d===8)};},
 tick(seconds){for(let left=seconds;left>1e-8&&state==='playing';){const dt=Math.min(.05,left);left-=dt;chrome.update(dt);update(dt);}scene.updateMatrixWorld(true);return this.snapshot();},
 control(id){const z=[-25,-29,-35][id];this.place(28.4,z,30,z,1.15);},
 view(){this.place(29,-20,20,-30);},safe(){this.place(0,30,0,0);},core(){this.place(24.5,-25,22,-25);},
 save(){flow.saveCheckpoint();return checkpoint();},retry(){return flow.retryStage();},
 extract(){this.clearGuards();this.place(-22,-25.6,-22,-28);},
 fail(){end(false);return this.snapshot();}
};`;
  await route.fulfill({response,body:s});
 });
 await p.goto(`${base}?map=station&menu=chapter`);await p.click('#deploy');await p.waitForFunction(()=>window.__switchyardFixture&&document.body.dataset.playState==='playing');
 const run=(method,arg)=>p.evaluate(([m,a])=>window.__switchyardFixture[m](a),[method,arg]);
 let s=await run('setup');s=await run('tick',.05);assert.equal(s.stage,3);assert.equal(s.phase,'inactive','last defense frame must not advance');s=await run('tick',.05);assert(s.blocking);assert.equal(s.phase,'shield');assert(!s.gateOpen);
 await run('core');await p.mouse.click(550,380);s=await run('tick',.25);assert.equal(s.hp,1200);assert(s.shots[0]>0,'real gun shot rejected by shield');
 await run('control',1);await p.keyboard.down('e');s=await run('tick',.65);await p.keyboard.up('e');assert(!s.rail.armed,'wrong number rejected');
 await run('control',0);await p.keyboard.down('e');await run('tick',.3);await p.keyboard.press('Escape');await p.keyboard.up('e');s=await run('snapshot');const paused=s.rail.timer;await p.waitForTimeout(200);s=await run('tick',2);assert.equal(s.rail.timer,paused);assert.equal(s.state,'paused');
 await p.click('#deploy');await p.waitForFunction(()=>document.body.dataset.playState==='playing');s=await run('tick',.05);assert(!s.rail.armed);assert.equal(s.rail.hold,0);
 console.log('PASS: real dispatch completion gate, shield raycast, wrong control, pause clears unfinished interaction and freezes clocks');
 // New isolated attempt: only the initial stages/guards are elided; actual keyboard/knife/mission paths run.
 s=await run('setup');await run('tick',.1);await run('control',0);await p.keyboard.down('e');s=await run('tick',.65);await p.keyboard.up('e');assert(s.rail.armed);
 await run('safe');s=await run('tick',6.3);assert.equal(s.phase,'exposed');assert.equal(s.hp,1200);assert.equal(s.shots.reduce((a,b)=>a+b,0),0);assert(s.challenge.eligible);assert.equal(s.challenge.shots,0);
 await run('core');await p.keyboard.press('Digit3');await run('tick',.35);
 if(process.env.SWITCHYARD_SCREENSHOT){await mkdir(path.dirname(process.env.SWITCHYARD_SCREENSHOT),{recursive:true});await p.screenshot({path:process.env.SWITCHYARD_SCREENSHOT});}
 // Native mouse attacks, original weapon damage/delay/strike window, no direct boss.hit or simulated win.
 for(let i=0;i<80;i++){
  s=await run('snapshot');if(s.stage===4)break;
  if(s.phase==='shield'){
   await run('control',s.rail.lane);await p.keyboard.down('e');s=await run('tick',.65);await p.keyboard.up('e');
   await run('safe');await run('tick',6.4);await run('core');
  }
  await p.mouse.click(550,380);s=await run('tick',.48);
 }
 s=await run('tick',.9);assert.equal(s.stage,4,JSON.stringify(s));assert(s.gateOpen);assert.equal(s.kills,1);assert.equal(s.record.status,'won');assert.equal(s.record.coreDamage,1200);assert(s.record.windows>=1);assert.equal(s.challenge.shots,0);assert(s.challenge.kills[3]>=1);assert(s.challenge.eligible&&s.challenge.alive);
 const cp=await run('save');assert.equal(cp.stageIndex,4);assert.equal(cp.switchyard,undefined);await run('retry');s=await run('snapshot');assert.equal(s.stage,4);assert.equal(s.phase,'inactive');assert(!s.blocking);assert(!s.challenge.eligible,'checkpoint retry never restores full-chapter qualification');
 await run('extract');await p.keyboard.down('e');s=await run('tick',3.2);await p.keyboard.up('e');assert.equal(s.state,'won');assert.equal(s.stage,5);assert.equal(s.kills,1);
 console.log('PASS: real E routes train, six-second exposure, native knife damage and single boss credit, battle stats, extraction gate/checkpoint/retry and won flow');
 // A fresh native page avoids a queued pointer-lock exit from the prior victory racing the fixture.
 await p.reload();await p.click('#deploy');await p.waitForFunction(()=>document.body.dataset.playState==='playing');
 for(let weapon=0;weapon<8;weapon++){
  await run('setup');await run('tick',.1);await run('control',0);await p.keyboard.down('e');s=await run('tick',.65);await p.keyboard.up('e');assert(s.rail.armed);
  await run('safe');await run('tick',6.4);await run('core');assert(await run('equipWeapon',weapon));await p.keyboard.press((weapon===3?'Digit3':weapon===2?'Digit2':'Digit1'));await run('tick',.4);
  await p.mouse.down();s=await run('tick',weapon===6?.95:.4);await p.mouse.up();
  assert(s.hp>0&&s.hp<1200,'weapon '+weapon+' actual core damage '+JSON.stringify(s));assert(s.shots[weapon]>0);
 }
 console.log('PASS: all eight weapons use real input/raycast/strike/burst/charge paths against exposed core');
 s=await run('setup');await run('tick',.1);
 if(process.env.SWITCHYARD_SCREENSHOT){await run('view');await p.screenshot({path:process.env.SWITCHYARD_SCREENSHOT.replace(/\.png$/,'-arena.png')});}
 await run('control',0);await p.keyboard.down('e');s=await run('tick',.65);await p.keyboard.up('e');assert(s.rail.armed,JSON.stringify(s));
 await run('save');await run('fail');await run('retry');s=await run('snapshot');assert.equal(s.stage,3);assert.equal(s.phase,'inactive');assert.equal(s.hp,1200);assert(!s.rail.armed);assert.equal(s.rail.hold,0);assert(!s.defending);assert(!s.gateOpen);assert(!s.challenge.eligible);
 assert.deepEqual(errors,[]);console.log('PASS: death/retry resets boss, routes and dispatch defense without new schema; no page errors');
 await context.close();
}finally{await browser?.close();child?.kill();}
