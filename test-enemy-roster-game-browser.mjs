import assert from 'node:assert/strict';
import path from 'node:path';
import {startRosterBrowser,trackedPage} from './roster-browser-driver.mjs';
async function fixture(context){await context.route('**/app.js',async route=>{const response=await route.fetch();let source=await response.text();assert(source.includes("if(state==='playing')update(dt);"));source=source.replace("if(state==='playing')update(dt);",'if(false)update(dt);');source+=`
import {animateEnemy as rosterAnimate} from './enemy-model.js';
window.__rosterGame={
 setup(type){reset(0);for(const e of enemies)disposeGroup(e.group);enemies.length=0;enemyProjectiles.clear();state='playing';document.body.dataset.playState=state;overlay.hidden=true;camera.position.set(0,1.7,29);playerMotion.reset(camera.position,0);loadout.equip(0);changeWeapon(0);handling.update(1,false);cooldown=0;reload=0;health=100;update(0);
  spawnEncounter({...mission.current,count:1,level:1,roles:[type],sentry:false,swarm:false});this.e=enemies.find(e=>e.type===type);if(!this.e)throw Error('Spawn failed '+type);const e=this.e;e.group.position.set(0,type==='swarmDrone'?1.65:0,22);e.group.rotation.y=0;e.speed=0;e.attack=999;e.charge=0;
  if(type==='shield'){camera.position.set(0,1.7,15);playerMotion.reset(camera.position,0);}this.aim();return this.snapshot();},
 aim(){scene.updateMatrixWorld(true);const head=this.e.group.children.find(m=>m.userData.hitZone==='head')||this.e.group.children.find(m=>m.isMesh&&!m.userData.combatDecoration);camera.lookAt(head.getWorldPosition(new THREE.Vector3()));yaw=camera.rotation.y;pitch=camera.rotation.x;camera.updateMatrixWorld(true);},
 source(){const d=this.e.group.userData;return d.rosterSource||d.rangedGuardSource||d.guardVariantSource||d.engineerModelSource||d.commanderModelSource||d.sniperModelSource||d.shieldModelSource;},
 snapshot(){const e=this.e,p=e?.group.userData.parts,s=p?.rosterModel;return {type:e?.type,hp:e?.hp,source:e?this.source():null,shots:telemetryShots[0],rootMeshes:e?.group.children.filter(m=>m.isMesh&&!m.userData.combatDecoration).map(m=>({visible:m.visible,zone:m.userData.hitZone})),mode:s?.pose.mode,coreVisible:p?.core?.visible,coreMaterialVisible:p?.core?.material.visible,hatchVisible:e?.group.userData.artilleryHatch?.visible,alpha:s?.visual.rig.materials.Armor?.opacity};},
 special(){const e=this.e;if(e.type==='stalker'){rosterAnimate(e,1,false,30);return this.snapshot();}if(e.type==='rusher')e.rusherBlink=.8;if(e.type==='harborElite')e.eliteState={ventRemaining:1};if(e.type==='artilleryMech')e.artillery={exposed:1};if(e.type==='warden')e.bossState.openRemaining=1;rosterAnimate(e,1.2,true,8);return this.snapshot();},
 fire(){cooldown=0;handling.update(1,false);this.aim();shoot();return this.snapshot();},
 remember(){this.old=this.e.group;return this.source();},oldState(){return {parent:!!this.old.parent,source:this.old.userData.rosterSource};}
};`;await route.fulfill({response,body:source});});}
const env=await startRosterBrowser(),checks=[];
try{
 const context=await env.browser.newContext({viewport:{width:1120,height:760}});await fixture(context);const {page:p,errors}=await trackedPage(context);const requests={};p.on('request',r=>{const m=r.url().match(/\/models\/([^/?]+\.glb)$/);if(m)requests[m[1]]=(requests[m[1]]||0)+1;});
 await p.goto(env.base+'/index.html?map=reactor&menu=chapter');await p.waitForFunction(()=>!!window.__rosterGame);await p.evaluate(()=>localStorage.setItem('roster-save-sentinel','keep'));
 const types=['ranged','assault','heavy','engineer','commander','sniper','shield','stalker','rusher','harborElite','hound','drone','swarmDrone','sentry','artilleryMech','warden'];
 for(const type of types){await p.evaluate(t=>__rosterGame.setup(t),type);await p.waitForFunction(()=>__rosterGame.snapshot().source==='glb');const before=await p.evaluate(()=>__rosterGame.snapshot());assert(before.rootMeshes.every(m=>m.visible),type+' logical visibility');
  if(['hound','artilleryMech','warden','stalker'].includes(type))await p.screenshot({path:path.join(env.dir,type+'-in-game.png')});
  const special=await p.evaluate(()=>__rosterGame.special());if(type==='stalker')assert.equal(special.alpha,.08);if(type==='artilleryMech')assert.equal(special.hatchVisible,false);if(['sentry','artilleryMech','harborElite','warden'].includes(type))assert(special.coreVisible&&special.coreMaterialVisible);
  const after=await p.evaluate(()=>__rosterGame.fire());assert(after.hp<before.hp,type+' actual shooting');assert.equal(after.shots,before.shots+1,type);checks.push({type,source:'glb',before:before.hp,after:after.hp});console.log('PASS game',type,before.hp,'->',after.hp);
 }
 assert.equal(await p.evaluate(()=>localStorage.getItem('roster-save-sentinel')),'keep');assert(Object.values(requests).every(n=>n===1),JSON.stringify(requests));assert.deepEqual(errors,[]);await context.close();
 for(const mode of ['delayed','missing']){const c=await env.browser.newContext({viewport:{width:900,height:650}});await fixture(c);let release;const gate=new Promise(r=>release=r);
  await c.route('**/models/artilleryMech-m20.glb',async route=>{if(mode==='delayed'){await gate;await route.continue();}else await route.fulfill({status:404,body:'intentional asset fixture'});});const {page:q,errors:qe}=await trackedPage(c);await q.goto(env.base+'/index.html?map=reactor&menu=chapter');await q.waitForFunction(()=>!!window.__rosterGame);await q.evaluate(()=>__rosterGame.setup('artilleryMech'));
  if(mode==='delayed'){assert.equal(await q.evaluate(()=>__rosterGame.remember()),'procedural');await q.evaluate(()=>__rosterGame.setup('artilleryMech'));release();await q.waitForFunction(()=>__rosterGame.snapshot().source==='glb');const old=await q.evaluate(()=>__rosterGame.oldState());assert(!old.parent);assert.equal(old.source,'procedural');}
  else{await q.waitForFunction(()=>__rosterGame.snapshot().source==='procedural-fallback');const before=await q.evaluate(()=>__rosterGame.snapshot());assert((await q.evaluate(()=>__rosterGame.fire())).hp<before.hp);}
  assert.deepEqual(qe,[]);await c.close();console.log('PASS artillery split hatch',mode);
 }
 await env.save('game-results.json',{types:16,checks,oneRequestPerAsset:true,delayedDispose:true,missingFallback:true,softwareWebGL:true,targetHardwareValidated:false});
}finally{await env.close();}
