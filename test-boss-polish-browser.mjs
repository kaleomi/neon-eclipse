// Isolated Chromium. Checkpoint tests run real reset/retry with live encounter construction.
// Harbor route starts after simulated completed defense; no position writes after that setup.
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
 async function open(map){
  const p=await context.newPage();p.setDefaultTimeout(60000);p.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});
  await p.route('**/app.js',async route=>{const response=await route.fetch();let s=await response.text();assert(s.includes("if(state==='playing')update(dt);"));s=s.replace("if(state==='playing')update(dt);",'if(false)update(dt);');s+=`
window.__polish={
 snap(){return {state,stage:mission.state.index,x:camera.position.x,z:camera.position.z,feet:playerMotion.state.y,health,kills,time:mission.state.time,rounds:[...rounds],defending:mission.state.defending,count:enemies.length,expected:mission.current.count,phase:overseer?.state?.phase,hp:overseer?.state?.hp,arena:overseer?.arena,record:overseer?.battle.summary,eligible:achievementUI.attempt.state.eligible,shots:[...telemetryShots],goal:overseer?.objective?.toArray(),goalLabel:overseer?.objectiveLabel};},
 seed(index){reset(index);const e=STAGE_ENTRIES[index],current=checkpoint(),cp={stageIndex:index,health:77,kills:9,time:123,x:e.x,z:e.z,feetY:e.feetY||0,yaw:0,pitch:0,rounds:[7,2,5],reserves:[12,3,9],selected:0,collected:current.collected};if(!campaign.save(cp))throw Error('fixture checkpoint rejected');return cp;},
 async retry(){const unlocked=document.pointerLockElement?new Promise(resolve=>document.addEventListener('pointerlockchange',resolve,{once:true})):Promise.resolve();end(false);const failed=state;await unlocked;try{await retryStage();return {error:null,failed,...this.snap(),saved:campaign.checkpoint};}catch(e){return {error:e.message};}},
 setupRoute(){reset(0);for(const e of enemies)disposeGroup(e.group);enemies.length=0;enemyProjectiles.clear();mission.reset(3);art.setStage(3);navigation.invalidate();overseer.setStage(3);mission.state.defending=true;mission.state.progress=24;mission.state.wave=2;camera.position.set(12,1.7,-17.6);playerMotion.reset(camera.position,0);yaw=0;pitch=0;state='playing';document.body.dataset.playState=state;overlay.hidden=true;campaignUI.announce(mission.current);update(.02);return this.snap();},
 face(x,z,y=camera.position.y){camera.lookAt(x,y,z);yaw=camera.rotation.y;pitch=camera.rotation.x;camera.updateMatrixWorld(true);},
 tick(seconds){for(let left=seconds;left>1e-8&&state==='playing';){const dt=Math.min(.02,left);left-=dt;damageTime=Math.max(0,damageTime-dt);update(dt);campaignUI.update(dt,true,runMode);}scene.updateMatrixWorld(true);return this.snap();},
 walkTo(point){const [x,z,speed=8]=point;this.face(x,z);let last=Infinity,stuck=0;for(let i=0;i<2400&&state==='playing';i++){const distance=Math.hypot(camera.position.x-x,camera.position.z-z);if(distance<.025){scene.updateMatrixWorld(true);return this.snap();}stuck=last-distance<1e-6?stuck+1:0;last=distance;if(stuck>60)break;this.tick(Math.min(.02,distance/speed));}throw Error('route blocked / '+JSON.stringify(this.snap())+' target '+point);},
 control(id){const p=[[-3,-18.5],[10,-19],[19,-26]][id];this.face(p[0],p[1],4.06);},
 aimCore(){const p=overseer.targets.find(m=>m.userData.overseer==='core').getWorldPosition(new THREE.Vector3());this.face(p.x,p.z,p.y);}
};`;await route.fulfill({response,body:s});});
  await p.goto('http://127.0.0.1:'+port+'/index.html?map='+map+'&menu=chapter');await p.click('#deploy');await p.waitForFunction(()=>window.__polish&&document.body.dataset.playState==='playing');return p;
 }
 const call=(p,m,a)=>p.evaluate(([m,a])=>window.__polish[m](a),[m,a]);
 for(const map of ['reactor','station','roof','tower','train','harbor','orbital','datacenter','polar']){
  const p=await open(map);
  for(const index of [3,4]){const cp=await p.evaluate(i=>window.__polish.seed(i),index),s=await call(p,'retry');assert.equal(s.error,null,map+' stage '+index);assert.equal(s.failed,'lost');assert.equal(s.state,'playing');assert.deepEqual(s.rounds.slice(0,3),cp.rounds);assert.equal(s.stage,index);assert.equal(s.x,cp.x);assert.equal(s.z,cp.z);assert.equal(s.feet,cp.feetY);assert.equal(s.health,77);assert.equal(s.kills,9);assert.equal(s.time,123);assert(s.count>=s.expected);assert(!s.eligible);assert.equal(s.defending,false);}
  await p.keyboard.press('Escape');await p.waitForFunction(()=>document.body.dataset.playState==='paused');await p.click('#deploy');await p.waitForFunction(()=>document.body.dataset.playState==='playing');assert.deepEqual(errors,[]);console.log('PASS',map,'stage 3/4 reset, old schema, live encounter, resource preservation and pause/resume');await p.close();
 }
 const p=await open('harbor');let s=await call(p,'setupRoute');assert.equal(s.phase,'shield');await p.keyboard.press('Digit4');await call(p,'tick',.4);
 async function walk(x,z,jump=false){await p.keyboard.down('w');await p.keyboard.down('Shift');if(jump)await p.keyboard.press('Space');const s=await call(p,'walkTo',[x,z,8]);await p.keyboard.up('w');await p.keyboard.up('Shift');return s;}
 for(const [x,z] of [[10,-17.6],[10,-22],[-20,-22],[-20,-16],[-10,-16],[-10,-19.8],[-4,-19.8],[-4,-16.6],[-3,-16.6]])s=await walk(x,z);
 assert.equal(s.feet,3);let hits=0;
 for(let unit=0;unit<3;unit++){
  if(unit===1){for(const [x,z] of [[18,-19.8],[8,-19.8],[8,-19]])s=await walk(x,z);}
  if(unit===2){for(const [x,z] of [[15.6,-19.8],[15.6,-26],[17,-26]])s=await walk(x,z);}
  await call(p,'control',unit);await p.keyboard.down('e');s=await call(p,'tick',.65);await p.keyboard.up('e');assert.equal(s.arena.mode,'operation',JSON.stringify(s));assert(s.goalLabel.includes('核心'),'operation guides movement, not waiting at control');
  if(unit===0){for(const [x,z] of [[-4,-16.6],[-4,-19.8],[4.8,-19.8]])s=await walk(x,z);s=await walk(8,-19.8,true);s=await walk(16.8,-19.8);}
  else if(unit===1){s=await walk(8,-19.8);s=await walk(16.8,-19.8);}
  else {s=await walk(15.6,-26);s=await walk(15.6,-19.8);}
  s=await walk(18,-19.1);for(let i=0;i<120&&s.phase!=='exposed';i++)s=await call(p,'tick',.02);assert.equal(s.phase,'exposed');assert(Math.abs(s.feet-3)<.01);
  await call(p,'aimCore');
  if(process.env.POLISH_SCREENSHOTS){await mkdir(process.env.POLISH_SCREENSHOTS,{recursive:true});await p.screenshot({path:process.env.POLISH_SCREENSHOTS+'/route-'+unit+'.png'});}
  for(let i=0;i<10&&s.arena.index===unit&&s.phase==='exposed';i++){await p.mouse.click(550,380);s=await call(p,'tick',.48);hits++;}
  assert(unit===2?(s.hp===0||s.stage===4):s.arena.index===unit+1,'lock must break in the routed window '+JSON.stringify(s));
 }
 s=await call(p,'tick',.9);assert.equal(s.stage,4);assert.equal(s.kills,1);assert.equal(s.record.status,'won');assert.equal(s.record.coreDamage,1800);assert.equal(s.record.windows,3);assert.equal(s.shots.filter((_,i)=>i!==3).reduce((a,b)=>a+b,0),0);assert.equal(s.shots[3],hits);assert(s.health>0);assert.equal(s.count,4);assert.deepEqual(errors,[]);console.log('PASS harbor contiguous route: defense area -> stairs -> three E cranes -> real sprint/jump -> 3-window native blade kill -> real extraction guards, no position writes after setup; swings='+hits);const restored=await call(p,'retry');assert.equal(restored.error,null);assert.equal(restored.stage,4);assert.equal(restored.count,4);assert.equal(restored.phase,'inactive');assert.equal(restored.kills,1);assert.equal(restored.health,restored.saved.health);assert.deepEqual([restored.x,restored.z,restored.feet],[restored.saved.x,restored.saved.z,restored.saved.feetY]);assert(!restored.eligible);console.log('PASS harbor actual post-boss auto-checkpoint restores at its saved position without replaying the boss');await p.close();await context.close();
}finally{await browser?.close();child?.kill();}
