// Isolated Chromium. Checkpoint tests run real reset/retry with live encounter construction.
// Prior guards are elided. After setup/retry, all route movement and both hound kills remain native.
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
let routeWatch=false,routeSteps=0;const routeHounds=new Set();
window.__trainRoute={
 snap(){return {state,complete:mission.state.complete,stage:mission.state.index,x:camera.position.x,z:camera.position.z,feet:playerMotion.state.y,health,kills,time:mission.state.time,trainTime:art.trainTime,rounds:[...rounds],reserves:[...reserves],selected,defending:mission.state.defending,progress:mission.state.progress,count:enemies.length,phase:overseer.state.phase,hp:overseer.state.hp,timer:overseer.state.timer,arena:overseer.arena,record:overseer.battle.summary,eligible:achievementUI.attempt.state.eligible,shots:[...telemetryShots],saved:campaign.checkpoint,steps:routeSteps,hounds:enemies.filter(e=>e.type==='hound').map(e=>({hp:e.hp,x:e.group.position.x,z:e.group.position.z,y:e.group.position.y})),summoned:routeHounds.size};},
 clearPrior(){if(overseer.blocking)throw Error('Cannot elide active boss guards');const n=enemies.length;for(const e of enemies)disposeGroup(e.group);enemies.length=0;enemyProjectiles.clear();return n;},
 setup(){reset(2);const n=this.clearPrior();camera.position.set(2.3,6.2,1.9);playerMotion.reset(camera.position,4.5);yaw=0;pitch=0;state='playing';document.body.dataset.playState=state;overlay.hidden=true;routeHounds.clear();return n;},
 async retry(){routeWatch=false;const unlocked=document.pointerLockElement?new Promise(resolve=>document.addEventListener('pointerlockchange',resolve,{once:true})):Promise.resolve();end(false);await unlocked;await flow.retryStage();return this.snap();},
 async resumeSaved(){await flow.continueCampaign();return this.snap();},
 watch(){routeWatch=true;routeSteps=0;},
 face(x,z,y=camera.position.y){camera.lookAt(x,y,z);yaw=camera.rotation.y;pitch=camera.rotation.x;camera.updateMatrixWorld(true);},
 missionAim(){const a=missionWorld.target(mission.current);this.face(a.x,a.z,a.y);},
 coreAim(){const a=overseer.targets.find(m=>m.userData.overseer==='core').getWorldPosition(new THREE.Vector3());this.face(a.x,a.z,a.y);},
 guardAim(){const e=[...enemies].sort((a,b)=>a.group.position.distanceTo(camera.position)-b.group.position.distanceTo(camera.position))[0];if(!e)return false;const mesh=e.group.children.find(m=>m.userData.hitZone==='head')||e.group.children[0];const a=mesh.getWorldPosition(new THREE.Vector3());this.face(a.x,a.z,a.y);return true;},
 houndAim(){const e=enemies.filter(e=>e.type==='hound').sort((a,b)=>a.group.position.distanceTo(camera.position)-b.group.position.distanceTo(camera.position))[0];if(!e)return false;const a=e.group.position;if(Math.hypot(a.x-camera.position.x,a.z-camera.position.z)>2.8)return false;this.face(a.x,a.z,a.y+.6);return true;},
 control(id){const a=id===0?{x:2.3,z:-10,y:5.56}:{x:-1.4,z:-12,y:2.56};this.face(a.x,a.z,a.y);},
 tick(seconds){for(let left=seconds;left>1e-8&&state==='playing';){const dt=Math.min(.02,left);left-=dt;const x=camera.position.x,z=camera.position.z;chrome.update(dt);update(dt);campaignUI.update(dt,true,runMode);if(routeWatch){routeSteps++;if(Math.hypot(camera.position.x-x,camera.position.z-z)>8*dt+.03)throw Error('Unexpected relocation / '+JSON.stringify(this.snap()));}for(const e of enemies)if(e.type==='hound')routeHounds.add(e.group);}scene.updateMatrixWorld(true);return this.snap();},
 walkTo(point){const [x,z]=point;this.face(x,z);let last=Infinity,stuck=0;for(let i=0;i<2400&&state==='playing';i++){const d=Math.hypot(camera.position.x-x,camera.position.z-z);if(d<.025)return this.snap();stuck=last-d<1e-6?stuck+1:0;last=d;if(stuck>60)break;this.tick(Math.min(.02,d/8));}throw Error('Route blocked '+JSON.stringify(this.snap())+' target '+point);}
};`;await route.fulfill({response,body:s});
 });
 await p.goto('http://127.0.0.1:'+port+'/index.html?map=train&menu=chapter');assert.deepEqual(errors,[]);await p.click('#deploy');await p.waitForFunction(()=>window.__trainRoute&&document.body.dataset.playState==='playing');
 const call=(m,a)=>p.evaluate(([m,a])=>window.__trainRoute[m](a),[m,a]);
 async function walk(x,z){await p.keyboard.down('w');await p.keyboard.down('Shift');const r=await call('walkTo',[x,z]);await p.keyboard.up('w');await p.keyboard.up('Shift');return r;}
 async function route(points){let r;for(const [x,z] of points)r=await walk(x,z);return r;}
 async function holdE(seconds){await p.keyboard.down('e');const r=await call('tick',seconds);await p.keyboard.up('e');return r;}
 async function screenshot(name){if(process.env.TRAIN_ROUTE_SCREENSHOTS){await mkdir(process.env.TRAIN_ROUTE_SCREENSHOTS,{recursive:true});await p.screenshot({path:process.env.TRAIN_ROUTE_SCREENSHOTS+'/'+name+'.png'});}}
 function verifyRestore(r,cp){assert.equal(r.state,'playing');assert.equal(r.stage,cp.stageIndex);assert.deepEqual([r.x,r.z,r.feet],[cp.x,cp.z,cp.feetY]);assert.equal(r.health,cp.health);assert.equal(r.kills,cp.kills);assert.equal(r.time,cp.time);assert.equal(r.trainTime,cp.trainTime);assert.deepEqual(r.rounds.slice(0,3),cp.rounds);assert.deepEqual(r.reserves.slice(0,3),cp.reserves);assert(!r.eligible);assert(!r.defending);assert.equal(r.phase,'inactive');}
 assert.equal(await call('setup'),4);await p.keyboard.press('Digit3');await call('tick',.4);await call('missionAim');let s=await holdE(2.7);assert.equal(s.stage,3);assert.equal(s.count,3);const before=s.saved;assert.equal(before.stageIndex,3);assert.equal(before.x,2.3);assert.equal(before.z,1.9);assert.notEqual(before.z,2.4);await p.reload();assert.deepEqual(errors,[]);await p.waitForFunction(()=>window.__trainRoute);s=await call('resumeSaved');verifyRestore(s,before);s=await call('retry');verifyRestore(s,before);assert.equal(s.count,3);console.log('PASS native signal terminal -> stage 3 auto-save -> death/retry at actual non-default position, resources and train clock preserved across reload and retry');
 await call('watch');assert.equal(await call('clearPrior'),3);
 s=await route([[3.8,1.9],[3.8,-18],[-3.5,-18],[-3.5,-9.5],[0,-9.5],[0,-11.6],[2.3,-11.6]]);assert.equal(s.feet,1.5);await call('missionAim');s=await holdE(2.1);assert(s.defending);assert.equal(s.count,3);assert.equal(await call('clearPrior'),3);s=await call('tick',16.1);assert.equal(s.phase,'shield');assert.equal(s.stage,3);assert((await p.locator('.skyhook-panel').textContent()).includes('左侧楼梯上楼'));await screenshot('train-stairs-up');console.log('PASS continuous signal-roof bridge -> left stair descent -> native control interaction and full 16-second defense clock; prior guards elided');
 s=await route([[0,-11.6],[0,-9.5],[-3.5,-9.5],[-3.5,-18],[-1.6,-18],[-1.6,-8.1],[2.3,-8.1]]);assert.equal(s.feet,4.5);
 for(let unit=0;unit<2;unit++){
  if(unit===1){s=await route([[-1.6,-12.3],[-1.6,-18],[-3.5,-18],[-3.5,-9.5],[-1.4,-9.5],[-1.4,-10.1]]);assert.equal(s.feet,1.5);assert(!(await p.locator('.skyhook-panel').textContent()).includes('左侧楼梯'));}
  await call('control',unit);s=await holdE(.65);assert.equal(s.arena.mode,'operation',JSON.stringify(s));s=await route(unit===0?[[0,-8.1],[0,-12.3]]:[[0,-10.1],[0,-12.3]]);for(let i=0;i<80&&s.phase!=='exposed';i++)s=await call('tick',.02);assert.equal(s.phase,'exposed');await call('coreAim');await screenshot('train-core-'+unit);
  for(let i=0;i<10&&s.arena.index===unit&&s.phase==='exposed';i++){await p.mouse.click(550,380);s=await call('tick',.48);}
  assert(unit===0?s.arena.index===1:s.hp===0,'native core phase '+JSON.stringify(s));
  if(unit===0){assert.equal(s.summoned,2);s=await walk(1,-12.3);for(let i=0;i<150&&s.hounds.length&&s.state==='playing';i++){if(await call('houndAim')){await p.mouse.click(550,380);s=await call('tick',.48);}else s=await call('tick',.1);}assert.equal(s.hounds.length,0,JSON.stringify(s));assert.equal(s.kills,2);assert(s.health>0);if(s.arena.mode==='transition')s=await call('tick',s.arena.timer+.01);assert((await p.locator('.skyhook-panel').textContent()).includes('左侧楼梯下楼'));await screenshot('train-stairs-down');console.log('PASS roof core with two live hounds; both hounds killed using native blade, no deletion or health override');}
 }
 s=await call('tick',.9);assert.equal(s.stage,4);assert.equal(s.kills,3);assert.equal(s.record.status,'won');assert.equal(s.record.coreDamage,1600);assert.equal(s.record.windows,2);assert(s.health>0);assert.equal(s.count,4);assert.equal(s.shots.filter((_,i)=>i!==3).reduce((a,b)=>a+b,0),0);assert(s.steps>500);assert.equal(s.summoned,2);await screenshot('train-complete');const after=s.saved;assert.equal(after.stageIndex,4);s=await call('retry');verifyRestore(s,after);assert.equal(s.count,4);await p.reload();assert.deepEqual(errors,[]);await p.waitForFunction(()=>window.__trainRoute);s=await call('resumeSaved');verifyRestore(s,after);assert.equal(s.count,4);assert.deepEqual(errors,[]);console.log('PASS uninterrupted cabin -> roof -> cabin route, 2-window SKYHOOK native blade defeat, actual stage 4 auto-save/death/retry and live extraction guards; no falls/teleports');
 // Resume the actual post-boss checkpoint. No clearPrior/setup/place/forced win below.
 await call('watch');await p.keyboard.press('Digit1');s=await call('tick',.4);
 s=await walk(0,-18);
 for(let i=0;i<180&&s.count>0&&s.state==='playing';i++){
  await call('guardAim');if(s.rounds[0]===0){await p.keyboard.press('KeyR');s=await call('tick',2.5);}else{await p.mouse.click(550,380);s=await call('tick',.16);}
 }
 assert.equal(s.state,'playing','survive native guard fight '+JSON.stringify(s));assert.equal(s.count,0,'four guards defeated by weapon hits '+JSON.stringify(s));assert.equal(s.kills,7);
 s=await route([[0,-23],[0,-28]]);assert(Math.abs(s.feet-1.5)<.01);await call('missionAim');
 s=await holdE(2.8);assert.equal(s.state,'playing');assert.equal(s.complete,false);assert(s.progress>2.7);
 s=await call('tick',.1);assert.equal(s.progress,0,'release interrupts extraction');
 s=await holdE(3.2);assert.equal(s.state,'won',JSON.stringify(s));assert.equal(s.complete,true);assert.equal(s.kills,7);assert.equal(s.count,0);assert(s.health>0);assert(s.steps>100);assert.deepEqual(errors,[]);
 await screenshot('train-extraction-won');console.log('PASS actual post-boss checkpoint -> four native gun kills -> walk engine gangway -> 2.8s incomplete/release resets -> held E mission victory; kills=7, no direct clear/position/health/forced victory');
 await p.close();await context.close();
}finally{await browser?.close();child?.kill();}
