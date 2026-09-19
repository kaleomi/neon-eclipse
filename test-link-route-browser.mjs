// Isolated, controlled-clock routes. Prior guards are elided; no position writes after setup/recovery.
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
 for(const map of (process.env.LINK_ROUTE_MAP?[process.env.LINK_ROUTE_MAP]:['station','tower'])){
 const p=await context.newPage();p.setDefaultTimeout(60000);p.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});
 await p.route('**/app.js',async route=>{const response=await route.fetch();let s=await response.text();assert(s.includes("if(state==='playing')update(dt);"));s=s.replace("if(state==='playing')update(dt);",'if(false)update(dt);');s+=`
let linkWatch=false,linkSteps=0;
window.__link={
 snap(){return {state,stage:mission.state.index,x:camera.position.x,z:camera.position.z,feet:playerMotion.state.y,grounded:playerMotion.state.grounded,health,kills,time:mission.state.time,liftTime:art.liftTime,rounds:[...rounds],reserves:[...reserves],selected,count:enemies.length,defending:mission.state.defending,progress:mission.state.progress,hp:overseer.state.hp,phase:overseer.state.phase,timer:overseer.state.timer,rail:overseer.rail,arena:overseer.arena,lift:overseer.lift,record:overseer.battle.summary,saved:campaign.checkpoint,eligible:achievementUI.attempt.state.eligible,shots:[...telemetryShots],steps:linkSteps,goal:overseer.objective.toArray(),goalLabel:overseer.objectiveLabel};},
 clearPrior(){if(overseer.blocking)throw Error('Cannot delete guards in active boss');const n=enemies.length;for(const e of enemies)disposeGroup(e.group);enemies.length=0;enemyProjectiles.clear();return n;},
 setup(){reset(2);const n=this.clearPrior();camera.position.set(IS_TOWER?7:.5,IS_TOWER?7.7:1.7,IS_TOWER?9.2:-7.6);playerMotion.reset(camera.position,IS_TOWER?6:0);yaw=0;pitch=0;state='playing';document.body.dataset.playState=state;overlay.hidden=true;return n;},
 async retry(){linkWatch=false;const released=document.pointerLockElement?new Promise(r=>document.addEventListener('pointerlockchange',r,{once:true})):Promise.resolve();end(false);await released;await retryStage();return this.snap();},
 async resume(){await continueCampaign();return this.snap();},watch(){linkWatch=true;linkSteps=0;},
 face(x,z,y=camera.position.y){camera.lookAt(x,y,z);yaw=camera.rotation.y;pitch=camera.rotation.x;camera.updateMatrixWorld(true);},
 missionAim(){const a=missionWorld.target(mission.current);this.face(a.x,a.z,a.y);},
 coreAim(){const a=overseer.targets.find(m=>m.userData.overseer==='core').getWorldPosition(new THREE.Vector3());this.face(a.x,a.z,a.y);},
 control(id){this.face(30,[-25,-29,-35][id],1.15);},
 tick(seconds){for(let left=seconds;left>1e-8&&state==='playing';){const dt=Math.min(.02,left);left-=dt;const x=camera.position.x,z=camera.position.z;damageTime=Math.max(0,damageTime-dt);update(dt);campaignUI.update(dt,true,runMode);if(linkWatch){linkSteps++;if(Math.hypot(camera.position.x-x,camera.position.z-z)>8*dt+.03)throw Error('Unexpected relocation '+JSON.stringify(this.snap()));}}scene.updateMatrixWorld(true);return this.snap();},
 walkTo(point){const [x,z,speed]=point;this.face(x,z);let last=Infinity,stuck=0;for(let i=0;i<2400&&state==='playing';i++){const d=Math.hypot(camera.position.x-x,camera.position.z-z);if(d<.015)return this.snap();stuck=last-d<1e-6?stuck+1:0;last=d;if(stuck>60)break;this.tick(Math.min(.02,d/speed));}throw Error('Route blocked '+JSON.stringify(this.snap())+' goal '+point);}
};`;await route.fulfill({response,body:s});});
 await p.goto('http://127.0.0.1:'+port+'/index.html?map='+map+'&menu=chapter');assert.deepEqual(errors,[]);await p.click('#deploy');await p.waitForFunction(()=>window.__link&&document.body.dataset.playState==='playing');
 const call=(m,a)=>p.evaluate(([m,a])=>window.__link[m](a),[m,a]);
 async function walk(x,z,jump=false,speed=8){await p.keyboard.down('w');if(speed===8)await p.keyboard.down('Shift');if(jump)await p.keyboard.press('Space');const r=await call('walkTo',[x,z,speed]);await p.keyboard.up('w');await p.keyboard.up('Shift');return r;}
 async function route(points){let r;for(const a of points)r=await walk(...a);return r;}
 async function hold(seconds){await p.keyboard.down('e');const r=await call('tick',seconds);await p.keyboard.up('e');return r;}
 async function shot(){await call('coreAim');await p.mouse.click(550,380);return call('tick',.48);}
 async function screenshot(name){if(process.env.LINK_ROUTE_SCREENSHOTS){await mkdir(process.env.LINK_ROUTE_SCREENSHOTS,{recursive:true});await p.screenshot({path:process.env.LINK_ROUTE_SCREENSHOTS+'/'+map+'-'+name+'.png'});}}
 function checkRestore(r,c){assert.equal(r.state,'playing');assert.equal(r.stage,c.stageIndex);assert.equal(r.count,c.stageIndex===4?4:map==='station'?4:3);assert.deepEqual([r.x,r.z,r.feet],[c.x,c.z,c.feetY]);assert.equal(r.health,c.health);assert.equal(r.kills,c.kills);assert.equal(r.time,c.time);assert.equal(r.selected,c.selected);assert.deepEqual(r.rounds.slice(0,3),c.rounds);assert.deepEqual(r.reserves.slice(0,3),c.reserves);assert.equal(r.phase,'inactive');assert(!r.defending);assert(!r.eligible);if(map==='tower'){assert.equal(r.liftTime,c.towerLiftTime);assert.equal(r.lift.y,c.stageIndex===4?6:0);}}
 async function reload(){await p.reload();assert.deepEqual(errors,[]);await p.waitForFunction(()=>window.__link);return call('resume');}
 assert.equal(await call('setup'),map==='station'?5:4);await p.keyboard.press('Digit4');await call('tick',.4);await call('missionAim');let s=await hold(map==='station'?1.7:2.7);assert.equal(s.stage,3);const entry=s.saved;assert.equal(entry.stageIndex,3);assert.deepEqual([entry.x,entry.z,entry.feetY],map==='station'?[.5,-7.6,0]:[7,9.2,6]);checkRestore(await reload(),entry);checkRestore(await call('retry'),entry);console.log('PASS',map,'actual stage 2 -> 3 E transition, non-default auto-checkpoint, page reload and death/retry');
 await call('watch');assert.equal(await call('clearPrior'),map==='station'?4:3);
 s=await route(map==='station'?[[2,-7.6],[2,-12],[12,-12],[22,-12],[22,-19.6]]:[[5.5,9.2],[5.5,-4.6],[7,-4.6]]);await call('missionAim');s=await hold(2.1);assert(s.defending);assert.equal(s.count,3);assert.equal(await call('clearPrior'),3);s=await call('tick',18.1);assert.equal(s.phase,'shield');assert.equal(s.stage,3);
 if(map==='station'){
  for(let lane=0;lane<3;lane++){
   s=await route([[28.4,s.z],[28.4,[-25,-29,-35][lane]]]);assert.equal(s.rail.lane,lane);await call('control',lane);s=await hold(.65);assert(s.rail.armed,JSON.stringify(s));assert.deepEqual(s.goal,[22,1.9,-25]);assert(s.goalLabel.includes('核心'));if(lane===0)await screenshot('armed');s=await walk(24.5,-25);
   for(let i=0;i<150&&s.phase==='shield';i++)s=await call('tick',.05);assert.equal(s.phase,'exposed');await call('coreAim');await screenshot('core-'+lane);
   for(let j=0;j<[8,3,2][lane];j++)s=await shot();
   if(lane<2){s=await call('tick',Math.max(0,s.timer)+.05);assert.equal(s.phase,'shield');assert.equal(s.rail.lane,lane+1);}else assert.equal(s.hp,0);
  }
 }else{
  s=await route([[5.5,-4.6],[1.5,-4.6],[1.5,0],[-10,0],[-18.2,0],[-18.2,12],[21,12],[21,6],[23.5,6]]);assert.equal(s.feet,0);
  for(let level=0;level<3;level++){
   if(level){s=await walk(23.5,1.8,false,5);s=await walk(23.5,5.2,true,5);s=await call('tick',.9);s=await call('tick',Math.abs(level*3-s.lift.y)/.65+.2);assert.equal(s.lift.y,level*3);assert(Math.abs(s.feet-level*3)<.01);}
   s=await walk(23.5,4.25,false,5);s=await walk(23.5,1.45,true,5);s=await call('tick',1.1);assert.equal(s.feet,level*3);assert(s.grounded);assert.equal(s.phase,'exposed',JSON.stringify(s));assert(s.goalLabel.includes('胸核'));assert(Math.abs(s.goal[1]-(level*3+1.25))<1e-8);await call('coreAim');await screenshot('core-'+level);
   for(let j=0;j<6;j++)s=await shot();assert(level===2?s.hp===0:s.arena.index===level+1,JSON.stringify(s));
  }
 }
 s=await call('tick',.9);assert.equal(s.stage,4);assert.equal(s.count,4);assert.equal(s.kills,1);assert.equal(s.record.status,'won');assert.equal(s.record.coreDamage,map==='station'?1200:1500);assert.equal(s.record.windows,3);assert(s.health>0);assert.equal(s.shots.filter((_,i)=>i!==3).reduce((a,b)=>a+b,0),0);assert(s.steps>500);await screenshot('complete');const exit=s.saved;assert.equal(exit.stageIndex,4);checkRestore(await call('retry'),exit);checkRestore(await reload(),exit);assert.deepEqual(errors,[]);console.log('PASS',map,'continuous native movement/three mechanisms/blade kill, real stage 4 auto-save, reload/retry, four extraction guards; no position writes or relocation');await p.close();
 }
 await context.close();
}finally{await browser?.close();child?.kill();}
