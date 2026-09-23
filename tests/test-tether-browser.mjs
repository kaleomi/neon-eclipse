// Isolated Chromium. Checkpoint tests run real reset/retry with live encounter construction.
// Controlled placement between layers and extraction start; native weapon/physics/mission logic. NOT a continuous natural chapter run.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
let child,browser;
try{
 const port=await new Promise((res,rej)=>{const s=createServer();s.on('error',rej);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>res(p));});});
 child=spawn(process.execPath,['server.cjs'],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
 await new Promise((res,rej)=>{const t=setTimeout(()=>rej(Error('server timeout')),15000);child.stdout.on('data',d=>{if(String(d).includes('ready')){clearTimeout(t);res();}});child.on('error',rej);});
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1100,height:760}}),errors=[];
 await context.addInitScript(()=>localStorage.setItem('neon-eclipse.presentation.v1',JSON.stringify({quality:0})));
 const p=await context.newPage();p.setDefaultTimeout(60000);p.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});
 await p.route('**/app.js',async route=>{
  const response=await route.fetch();let s=await response.text();assert(s.includes("if(state==='playing')update(dt);"));s=s.replace("if(state==='playing')update(dt);",'if(false)update(dt);');s+=`

window.__tetherRoute={
 snap(){return {state,stage:mission.state.index,complete:mission.state.complete,blocking:overseer.blocking,health,kills,x:camera.position.x,z:camera.position.z,feet:playerMotion.state.y,grounded:playerMotion.state.grounded,hp:overseer.state.hp,phase:overseer.state.phase,attack:overseer.state.attack,attackTime:overseer.state.attackTime,timer:overseer.state.timer,nodes:[...overseer.state.stabilizers],count:enemies.length,rounds:[...rounds],saved:campaign.checkpoint,eligible:achievementUI.attempt.state.eligible,record:overseer.battle.summary,progress:mission.state.progress};},
 place(a){const [x,z,y]=a;if(!playerMotion.canOccupy(x,z,y))throw Error('Invalid fixture position '+a);camera.position.set(x,y+1.7,z);playerMotion.reset(camera.position,y);scene.updateMatrixWorld(true);},
 setup(){reset(3);for(const e of enemies)disposeGroup(e.group);enemies.length=0;enemyProjectiles.clear();this.place([0,-14,0]);state='playing';document.body.dataset.playState=state;overlay.hidden=true;return this.snap();},
 face(x,z,y=camera.position.y){camera.lookAt(x,y,z);yaw=camera.rotation.y;pitch=camera.rotation.x;camera.updateMatrixWorld(true);},
 aim(part){const m=overseer.targets.find(m=>m.userData.overseer===part);if(!m)throw Error('Missing target '+part);const a=m.getWorldPosition(new THREE.Vector3());this.face(a.x,a.z,a.y);},
 guardAim(groundOnly){const e=enemies.filter(e=>!groundOnly||e.group.position.y<3).sort((a,b)=>a.group.position.distanceTo(camera.position)-b.group.position.distanceTo(camera.position))[0];if(!e)return false;const m=e.group.children.find(m=>m.userData.hitZone==='head')||e.group.children[0],a=m.getWorldPosition(new THREE.Vector3());this.face(a.x,a.z,a.y);return true;},
 missionAim(){const a=missionWorld.target(mission.current);this.face(a.x,a.z,a.y);},
 tick(seconds){for(let left=seconds;left>1e-8&&state==='playing';){const dt=Math.min(.02,left);left-=dt;chrome.update(dt);update(dt);campaignUI.update(dt,true,runMode);}scene.updateMatrixWorld(true);return this.snap();},
 walkTo(a){const [x,z]=a;this.face(x,z);for(let i=0;i<1600&&state==='playing';i++){const d=Math.hypot(camera.position.x-x,camera.position.z-z);if(d<.025)return this.snap();this.tick(Math.min(.02,d/8));}throw Error('walk blocked '+JSON.stringify(this.snap()));},
 async retry(){const unlocked=document.pointerLockElement?new Promise(r=>document.addEventListener('pointerlockchange',r,{once:true})):Promise.resolve();end(false);await unlocked;await flow.retryStage();return this.snap();}
};`;await route.fulfill({response,body:s});
 });
 await p.goto('http://127.0.0.1:'+port+'/index.html?map=orbital&menu=chapter');await p.click('#deploy');await p.waitForFunction(()=>window.__tetherRoute&&document.body.dataset.playState==='playing');
 const call=(m,a)=>p.evaluate(([m,a])=>window.__tetherRoute[m](a),[m,a]);
 async function walk(x,z){await p.keyboard.down('w');await p.keyboard.down('Shift');const s=await call('walkTo',[x,z]);await p.keyboard.up('w');await p.keyboard.up('Shift');return s;}
 async function shot(dt=.48){await p.mouse.click(550,380);return call('tick',dt);}
 async function hold(t){await p.keyboard.down('e');const s=await call('tick',t);await p.keyboard.up('e');return s;}
 let s=await call('setup');assert.equal(s.hp,1600);assert.equal(s.count,0);
 await call('place',[4,0,9]);await call('aim','core');s=await shot(.2);assert.equal(s.hp,1600,'shield rejects native gun hit');
 await call('place',[0,-14,0]);for(let i=0;i<200&&!(s.attack==='warning'&&s.attackTime<.15);i++)s=await call('tick',.02);
 assert.equal(s.attack,'warning');const health=s.health;await p.keyboard.press('Space');s=await call('tick',.65);assert.equal(s.health,health,'jump avoids live pulse');s=await call('tick',.3);
 console.log('PASS native shield rejection and Space pulse dodge');
 await p.keyboard.press('Digit3');s=await call('tick',.4);
 for(let cycle=0;cycle<4&&s.stage===3;cycle++){
  for(const [i,pos] of [[0,[0,-14,0]],[1,[-9,5,4]],[2,[9,-1,9]]]){
   await call('place',pos);for(let j=0;j<8&&s.nodes[i]>0;j++){await call('aim',i);s=await shot();}assert.equal(s.nodes[i],0,JSON.stringify(s));
  }
  assert.equal(s.phase,'exposed');await call('place',[4,0,9]);
  if(cycle===0){await p.keyboard.press('Escape');await p.waitForFunction(()=>document.body.dataset.playState==='paused');const before=await call('snap');s=await call('tick',2);assert.equal(s.timer,before.timer);assert.equal(s.hp,before.hp);await p.click('#deploy');await p.waitForFunction(()=>document.body.dataset.playState==='playing');}
  const before=s.hp;for(let j=0;j<20&&s.phase==='exposed'&&s.hp>0;j++){await call('aim','core');s=await shot();}assert(s.stage===4||s.hp<before,'native core hit '+JSON.stringify(s));
 }
 s=await call('tick',.3);assert.equal(s.blocking,false);assert.equal(s.record.status,'won');assert.equal(s.stage,4);assert.equal(s.kills,1);assert.equal(s.count,4);assert.equal(s.record.coreDamage,1600);assert(s.health>0);
 const cp=s.saved;assert.equal(cp.stageIndex,4);s=await call('retry');assert.equal(s.stage,4);assert.equal(s.count,4);assert.equal(s.health,cp.health);assert.equal(s.kills,cp.kills);assert.deepEqual([s.x,s.z,s.feet],[cp.x,cp.z,cp.feetY]);assert(!s.eligible);
 console.log('PASS three-layer native blade stabilizers/core, exposure pause, 1600 core damage, one boss credit, actual post-boss checkpoint retry');
 // Controlled ground start for extraction; after this, no placement, clearing or health writes.
 await call('place',[0,26,0]);await p.keyboard.press('Digit1');s=await call('tick',.4);
 async function fight(groundOnly){for(let i=0;i<180&&s.count&&s.state==='playing';i++){if(!await call('guardAim',groundOnly))break;if(s.rounds[0]===0){await p.keyboard.press('KeyR');s=await call('tick',2.5);}else s=await shot(.16);}assert.equal(s.state,'playing',JSON.stringify(s));}
 await fight(true);s=await walk(-26,26);s=await walk(-26,0);await fight(false);assert.equal(s.count,0,JSON.stringify(s));assert.equal(s.kills,5);
 s=await walk(-26,26);s=await walk(0,26);s=await walk(0,30);await call('missionAim');s=await hold(2.8);assert.equal(s.complete,false);s=await call('tick',.1);assert.equal(s.progress,0);s=await hold(3.2);assert.equal(s.state,'won',JSON.stringify(s));assert.equal(s.complete,true);assert.equal(s.kills,5);assert(s.health>0);assert.deepEqual(errors,[]);
 if(process.env.TETHER_SCREENSHOTS){await mkdir(process.env.TETHER_SCREENSHOTS,{recursive:true});await p.screenshot({path:process.env.TETHER_SCREENSHOTS+'/tether-extraction-won.png'});}
 console.log('PASS four native extraction guard kills, walking route after controlled ground start, interrupted E reset and actual mission victory; zero page errors');await p.close();await context.close();
}finally{await browser?.close();child?.kill();}
