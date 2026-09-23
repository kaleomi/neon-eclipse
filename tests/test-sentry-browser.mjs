import {fileURLToPath} from 'node:url';
import {equipAtTerminal} from './browser-loadout-driver.mjs';
// Native input plus isolated deterministic combat fixtures. Never edits the shipped app.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
let child=null,browser=null;
try{
 let base=process.env.GAME_TEST_URL;
 if(!base){const port=await new Promise((resolve,reject)=>{const s=createServer();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
  child=spawn(process.execPath,['server.cjs'],{cwd:fileURLToPath(new URL('../',import.meta.url)),env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('test server timeout')),15000);child.stdout.on('data',d=>{if(String(d).includes('ready')){clearTimeout(timer);resolve();}});child.on('error',reject);child.on('exit',c=>{clearTimeout(timer);reject(new Error('server exit '+c));});});base=`http://127.0.0.1:${port}/index.html`;
 }
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const errors=[];
 const native=await browser.newContext({viewport:{width:1280,height:800}}),page=await native.newPage();page.setDefaultTimeout(60000);page.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});
 const url=new URL(base);url.search='?map=reactor&menu=chapter';await page.goto(url.href);await page.click('#deploy');await page.waitForFunction(()=>document.body.dataset.menuOpen==='false');await equipAtTerminal(page,7);await page.keyboard.press('Digit1');await page.waitForFunction(()=>document.querySelector('#ammo').textContent==='6');assert.equal(await page.locator('.loadout-card').count(),3);await native.close();console.log('PASS: unmodified reactor boots and terminal-equipped primary slot key1/only three equipped cards remain visible');
 const context=await browser.newContext({viewport:{width:1280,height:800}}),p=await context.newPage();p.setDefaultTimeout(60000);p.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});
 await p.route('**/app.js',async route=>{const response=await route.fetch();let source=await response.text();assert(source.includes("if(state==='playing')update(dt);"));source=source.replace("if(state==='playing')update(dt);",'if(false)update(dt);');source+=`
window.__sentryFixture={
 stage(i=1){reset(i);state='playing';document.body.dataset.playState=state;overlay.hidden=true;return this.snapshot();},
 snapshot(){return {count:enemies.length,sentries:enemies.filter(e=>e.type==='sentry').length,bases:obstacles.filter(o=>o.owner?.userData.sentry).length,pending:enemyProjectiles.charging,bolts:enemyProjectiles.count,kills,health,rounds:[...rounds],shots:[...telemetryShots],eligible:achievementUI.attempt.state.eligible,hp:this.actor?.hp};},
 preview(){this.combat();const e=this.actor;camera.position.set(-4,3,1);playerMotion.reset(camera.position,1.3);camera.lookAt(e.group.position.clone().add(new THREE.Vector3(0,1,0)));yaw=camera.rotation.y;pitch=camera.rotation.x;e.group.rotation.y=0;e.sentryHome=0;e.attack=999;scene.updateMatrixWorld(true);update(.01);loadout.equip(6);changeWeapon(6);handling.update(1,false);gun.position.set(.29,-.28,-.68);hud();},
 combat(){this.stage();for(let i=enemies.length-1;i>=0;i--)if(enemies[i].type!=='sentry'){disposeGroup(enemies[i].group);enemies.splice(i,1);}const e=enemies[0];this.actor=e;e.group.position.set(0,0,-6);for(const o of obstacles)if(o.owner===e.group){o.x=0;o.z=-6;}e.group.rotation.y=0;e.sentryHome=0;e.sentryScan=0;e.attack=0;camera.position.set(0,1.7,0);playerMotion.reset(camera.position,0);yaw=0;pitch=0;camera.rotation.set(0,0,0);loadout.equip(6);changeWeapon(6);handling.update(1,false);cooldown=0;enemyFireGate=0;scene.updateMatrixWorld(true);return this.snapshot();},
 rear(){const e=this.actor;camera.position.copy(e.group.position).add(new THREE.Vector3(0,1.7,-3));playerMotion.reset(camera.position,0);scene.updateMatrixWorld(true);camera.lookAt(e.group.userData.parts.core.getWorldPosition(new THREE.Vector3()));yaw=camera.rotation.y;pitch=camera.rotation.x;camera.updateMatrixWorld(true);cooldown=0;},
 tick(dt){if(state==='playing')update(dt);return this.snapshot();},
 defense(){this.stage();for(const e of enemies)disposeGroup(e.group);enemies.length=0;mission.state.defending=true;spawnEncounter({...mission.current,count:mission.current.defenseCount});return this.snapshot();},
 save(){saveCheckpoint();return checkpoint();},restore(){const cp=campaign.checkpoint;reset(cp.stageIndex,cp);state='playing';overlay.hidden=true;return this.snapshot();},finish(){end(false);return this.snapshot();}
};`;await route.fulfill({response,body:source});});
 await p.goto(url.href);await p.waitForFunction(()=>!!window.__sentryFixture);
 const run=(method,arg)=>p.evaluate(([m,a])=>window.__sentryFixture[m](a),[method,arg]);
 let s=await run('stage');assert.equal(s.sentries,1);assert.equal(s.count,7);assert.equal(s.bases,1);
 for(const i of [0,2,3,4]){s=await run('stage',i);assert.equal(s.sentries,0);assert.equal(s.bases,0);}
 s=await run('defense');assert.equal(s.sentries,0);assert.equal(s.count,3);assert.equal(s.bases,0);
 await run('preview');if(process.env.SENTRY_SCREENSHOT){await mkdir(path.dirname(process.env.SENTRY_SCREENSHOT),{recursive:true});await p.screenshot({path:process.env.SENTRY_SCREENSHOT});}
 await run('combat');s=await run('tick',.01);assert.equal(s.pending,1);assert.equal(s.bolts,0);await run('tick',1.19);s=await run('tick',.011);assert.equal(s.bolts,1);
 await run('combat');s=await run('tick',.01);assert.equal(s.pending,1);await run('rear');await p.mouse.move(640,400);await p.mouse.down();s=await run('tick',.8);await p.mouse.up();assert(s.hp<=0,JSON.stringify(s));assert.equal(s.kills,1);assert.equal(s.sentries,0);assert.equal(s.bases,0);assert.equal(s.pending,0);assert.equal(s.shots[6],1);assert.equal(s.rounds[6],0);assert.equal(s.eligible,false);
 const cp=await run('save');assert.equal(cp.stageIndex,1);s=await run('restore');assert.equal(s.sentries,1);assert.equal(s.count,7);assert.equal(s.bases,1);assert.equal(s.rounds[6],0);assert.equal(s.eligible,false);assert.equal(s.pending+s.bolts,0);
 await run('combat');await run('tick',.01);s=await run('finish');assert.equal(s.pending+s.bolts,0);s=await run('stage',0);assert.equal(s.bases,0);assert.equal(s.pending+s.bolts,0);
 assert.deepEqual(errors,[]);console.log('PASS: real access spawn 6+1, defense has no second turret, other stages/base cleanup, full warning, actual RAIL rear-core kill cancels queued volley and removes collider, ammo/checkpoint/strict retry/end cleanup');await context.close();
}finally{await browser?.close();child?.kill();}
