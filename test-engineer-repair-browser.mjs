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
  child=spawn(process.execPath,['server.cjs'],{cwd:process.cwd(),env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('test server timeout')),15000);child.stdout.on('data',d=>{if(String(d).includes('ready')){clearTimeout(timer);resolve();}});child.on('error',reject);child.on('exit',c=>{clearTimeout(timer);reject(new Error('server exit '+c));});});base=`http://127.0.0.1:${port}/index.html`;
 }
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const errors=[];
 const native=await browser.newContext({viewport:{width:1280,height:800}}),page=await native.newPage();page.setDefaultTimeout(60000);page.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});
 const url=new URL(base);url.search='?map=reactor&menu=chapter';await page.goto(url.href);await page.click('#deploy');await page.waitForFunction(()=>document.body.dataset.menuOpen==='false');await equipAtTerminal(page,7);await page.keyboard.press('Digit1');await page.waitForFunction(()=>document.querySelector('#ammo').textContent==='6');assert.equal(await page.locator('.loadout-card').count(),3);await native.close();console.log('PASS: unmodified reactor boots and terminal-equipped primary slot key1/only three equipped cards remain visible');
 const context=await browser.newContext({viewport:{width:1280,height:800}}),p=await context.newPage();p.setDefaultTimeout(60000);p.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});
 await p.route('**/app.js',async route=>{const response=await route.fetch();let source=await response.text();assert(source.includes("if(state==='playing')update(dt);"));source=source.replace("if(state==='playing')update(dt);",'if(false)update(dt);');source+=`
window.__engineerFixture={
 stage(i=1){reset(i);state='playing';document.body.dataset.playState=state;overlay.hidden=true;return this.snapshot();},
 snapshot(){const engineer=enemies.find(e=>e.type==='engineer');return {repairing:engineer?.engineerRepairing||false,repairRemaining:engineer?.engineerRepairRemaining||0,repairUsed:engineer?.engineerRepairUsed||0,repairCooldown:engineer?.engineerRepairCooldown||0,links:scene.children.filter(m=>m.name==='ENGINEER_REPAIR_LINK').length,turretHp:this.turret?.hp,turretEmp:this.turret?.empRemaining||0,health,charges:emp.charges,state,index:mission.state.index,defending:mission.state.defending,count:enemies.length,engineers:enemies.filter(e=>e.type==='engineer').length,sentries:enemies.filter(e=>e.type==='sentry').length,bases:obstacles.filter(o=>o.owner?.userData.sentry).length,markers:scene.children.filter(o=>o.name==='ENGINEER_DEPLOYMENT').length,building:engineer?.engineerBuilding||false,remaining:engineer?.engineerRemaining||0,spent:engineer?.engineerSpent||false,hp:this.actor?.hp,positions:enemies.filter(e=>e.type==='engineer').map(e=>e.group.position.toArray()),pending:enemyProjectiles.charging,bolts:enemyProjectiles.count,kills,rounds:[...rounds],shots:[...telemetryShots],eligible:achievementUI.attempt.state.eligible,used:engineerDirector.used};},
 defense(){this.stage();for(const e of enemies)disposeGroup(e.group);enemies.length=0;camera.position.set(28,1.7,2.3);playerMotion.reset(camera.position,0);camera.lookAt(missionWorld.target(mission.current));yaw=camera.rotation.y;pitch=camera.rotation.x;handling.update(1,false);keys.add('KeyE');update(.01);update(2.51);keys.delete('KeyE');this.actor=enemies.find(e=>e.type==='engineer');for(const e of enemies){e.attack=999;e.speed=0;}enemyFireGate=0;return this.snapshot();},
 combat(){this.defense();for(let i=enemies.length-1;i>=0;i--)if(enemies[i].type!=='engineer'){disposeGroup(enemies[i].group);enemies.splice(i,1);}obstacles.length=0;const e=this.actor;e.group.position.set(0,0,-8);e.group.rotation.y=0;e.engineerCooldown=0;e.attack=999;e.speed=0;camera.position.set(0,1.7,0);playerMotion.reset(camera.position,0);this.aim();loadout.equip(0);changeWeapon(0);handling.update(1,false);cooldown=0;enemyFireGate=0;return this.snapshot();},
 aim(){scene.updateMatrixWorld(true);camera.lookAt(this.actor.group.position.clone().add(new THREE.Vector3(0,1.16,0)));yaw=camera.rotation.y;pitch=camera.rotation.x;camera.updateMatrixWorld(true);},
 preview(){this.combat();camera.position.set(-4,3,0);playerMotion.reset(camera.position,1.3);this.aim();update(.01);handling.update(1,false);gun.position.set(.29,-.28,-.68);hud();},
 tick(dt){if(state==='playing')update(dt);return this.snapshot();},
 ready(){this.actor.engineerCooldown=0;this.actor.attack=999;enemyFireGate=0;return this.snapshot();},
 rail(){loadout.equip(6);changeWeapon(6);handling.update(1,false);cooldown=0;this.aim();},
 aimTurret(){const e=enemies.find(e=>e.type==='sentry');scene.updateMatrixWorld(true);const target=e.group.userData.parts.core.getWorldPosition(new THREE.Vector3());camera.position.copy(target).add(new THREE.Vector3(2,0,-3));camera.position.y=1.7;playerMotion.reset(camera.position,0);camera.lookAt(target);yaw=camera.rotation.y;pitch=camera.rotation.x;camera.updateMatrixWorld(true);loadout.equip(6);changeWeapon(6);handling.update(1,false);cooldown=0;},
 ownerRear(){camera.position.copy(this.actor.group.position).add(new THREE.Vector3(3,1.7,-3));playerMotion.reset(camera.position,0);this.rail();},
 repairSetup(){this.combat();this.tick(.01);this.tick(2.5);this.turret=enemies.find(e=>e.type==='sentry');if(!this.turret)throw Error('native deployment missing');this.turret.hp=60;this.turret.attack=999;this.actor.attack=999;this.actor.engineerRepairCooldown=0;camera.position.copy(this.actor.group.position).add(new THREE.Vector3(3,1.7,6));playerMotion.reset(camera.position,0);cooldown=0;handling.update(1,false);this.aim();return this.snapshot();},
 repairWall(){const a=this.actor.group.position,b=this.turret.group.position,mesh=box(8,4,.2,(a.x+b.x)/2,2,(a.z+b.z)/2);mesh.lookAt(new THREE.Vector3(b.x,2,b.z));mesh.updateWorldMatrix(true,false);this.repairCover=mesh;obstacles.push({mesh,x:mesh.position.x,z:mesh.position.z,w:8,d:.2,h:4});},
 empAim(){const p=this.turret.group.position;camera.position.set(p.x,p.y+1.7,p.z+4);playerMotion.reset(camera.position,p.y);yaw=0;pitch=-.5;camera.rotation.set(pitch,yaw,0);},
 save(){saveCheckpoint();return checkpoint();},restore(){const cp=campaign.checkpoint;reset(cp.stageIndex,cp);state='playing';overlay.hidden=true;return this.snapshot();},finish(){end(false);return this.snapshot();},resume(){return enterPlay();}
};`;await route.fulfill({response,body:source});});
 await p.goto(url.href);await p.waitForFunction(()=>!!window.__engineerFixture);
 const run=(method,arg)=>p.evaluate(([m,a])=>window.__engineerFixture[m](a),[method,arg]);
 let s=await run('repairSetup');assert(s.spent&&s.used);assert.equal(s.sentries,1);s=await run('tick',.01);assert(s.repairing);assert.equal(s.repairRemaining,1.6);assert.equal(s.links,1);assert.equal(s.turretHp,60);await p.waitForFunction(()=>document.querySelector('.enemy-inspector span')?.textContent.includes('维修炮塔'));
 if(process.env.REPAIR_SCREENSHOT){await mkdir(path.dirname(process.env.REPAIR_SCREENSHOT),{recursive:true});await p.screenshot({path:process.env.REPAIR_SCREENSHOT});}
 await p.keyboard.press('Escape');s=await run('tick',4);assert.equal(s.repairRemaining,1.6);assert.equal(s.turretHp,60);await run('resume');s=await run('tick',1.59);assert.equal(s.turretHp,60);s=await run('tick',.011);assert.equal(s.turretHp,84);assert.equal(s.repairUsed,1);assert.equal(s.links,0);s=await run('tick',6.01);assert(s.repairing);s=await run('tick',1.6);assert.equal(s.turretHp,108);assert.equal(s.repairUsed,2);s=await run('tick',9);assert(!s.repairing);assert.equal(s.turretHp,108);
 await run('repairSetup');await run('tick',.01);await run('aim');await p.mouse.click(640,400);s=await run('tick',0);assert(s.hp<90&&s.hp>0);assert(!s.repairing);assert.equal(s.turretHp,60);assert.equal(s.links,0);assert.equal(s.repairCooldown,6);assert.equal(s.repairUsed,0);
 await run('repairSetup');await run('tick',.01);await run('repairWall');s=await run('tick',0);assert(!s.repairing);assert.equal(s.turretHp,60);
 await run('repairSetup');await run('tick',.01);await run('empAim');await p.keyboard.press('g');s=await run('tick',1.21);s=await run('tick',0);assert(s.turretEmp>0,JSON.stringify(s));assert(!s.repairing);assert.equal(s.turretHp,60);assert.equal(s.hp,90);assert.equal(s.charges,1);assert.equal(s.links,0);
 await run('repairSetup');await run('tick',.01);await run('aimTurret');await p.mouse.down();s=await run('tick',.8);await p.mouse.up();assert.equal(s.sentries,0);assert.equal(s.links,0);assert(!s.repairing);s=await run('tick',10);assert.equal(s.sentries,0,'no resurrection or second deployment');
 await run('repairSetup');await run('tick',.01);await run('ownerRear');await p.mouse.down();s=await run('tick',.8);await p.mouse.up();assert.equal(s.engineers,0);assert.equal(s.links,0);assert.equal(s.turretHp,60);
 await run('repairSetup');await run('tick',.01);const cp=await run('save');assert(!Object.keys(cp).some(k=>/repair|engineer/i.test(k)));s=await run('restore');assert.equal(s.links,0);assert(!s.repairing);assert(!s.eligible);
 await run('repairSetup');await run('tick',.01);s=await run('finish');assert.equal(s.links,0);s=await run('tick',3);assert.equal(s.turretHp,60);
 assert.deepEqual(errors,[]);console.log('PASS native deployed turret repair: 1.6s telegraph/pause,24HP/two-success quota, actual rifle interruption/true cover/real G EMP, real RAIL target/source kills cancel without revival, no extra deployment, checkpoint and death beam cleanup');await context.close();
}finally{await browser?.close();child?.kill();}
