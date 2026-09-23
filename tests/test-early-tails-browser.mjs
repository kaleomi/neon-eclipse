// Isolated Chromium. Checkpoint tests run real reset/retry with live encounter construction.
// Chapters 01-03 post-setup native tails: boss defeat, actual checkpoint retry, guard kills, walking, real extraction. Earlier stages/guards elided.
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

 const MAPS={
  reactor:{extract:[[0,-10],[0,0],[0,10],[0,20],[0,30],[0,32]]},
  station:{extract:[[24.5,-20],[14,-20],[8.6,-28],[-4,-28],[-14,-28],[-22,-28]]},
  roof:{extract:[[0,-20],[0,-8],[0,4],[0,16],[0,20],[0,23.5],[0,27],[0,30],[0,32]]}
 };
 for(const map of (process.env.TAIL_MAPS||Object.keys(MAPS).join(',')).split(',')){
  const p=await context.newPage();p.setDefaultTimeout(90000);p.on('pageerror',e=>{errors.push(e.message);console.error('PAGEERROR',e.stack);});p.on('console',m=>{if(m.type()==='error')console.error('CONSOLE',m.text());});p.on('requestfailed',r=>console.error('REQFAIL',r.url(),r.failure()?.errorText));
  await p.route('**/app.js',async route=>{const response=await route.fetch();let source=await response.text();source=source.replace("if(state==='playing')update(dt);",'if(false)update(dt);');source+=`
window.__tail={
 snap(){const boss=enemies.find(e=>e.boss);return {state,stage:mission.state.index,complete:mission.state.complete,defending:mission.state.defending,progress:mission.state.progress,health,kills,x:camera.position.x,z:camera.position.z,feet:playerMotion.state.y,grounded:playerMotion.state.grounded,count:enemies.length,rounds:[...rounds],saved:campaign.checkpoint,record:overseer?.battle?.summary,boss:boss?{hp:boss.hp,open:boss.bossState?.openRemaining>0,x:boss.group.position.x,z:boss.group.position.z}:null,busy:{moving,firing,reload,sw:handling.state.switchRemaining,melee:meleeRemaining,dmg:chrome.timers().damageTime},ov:overseer?(st=>({hp:st?.hp,phase:st?.phase,blocking:overseer.blocking,attack:st?.attack,attackTime:st?.attackTime,timer:st?.timer,nodes:st?.nodes?[...st.nodes]:undefined,rail:overseer.rail?{...overseer.rail}:undefined}))(overseer.state||overseer.rules?.state||overseer.boss?.rules?.state):null};},
 setup(){reset(3);for(const e of [...enemies])if(!e.boss){disposeGroup(e.group);enemies.splice(enemies.indexOf(e),1);}enemyProjectiles.clear();
  if(mission.current.id==='dispatch'&&mission.current.defenseDuration){mission.state.defending=true;mission.state.progress=mission.current.defenseDuration-.05;}
  state='playing';document.body.dataset.playState=state;overlay.hidden=true;return this.snap();},
 face(x,z,y){if(Array.isArray(x))[x,z,y]=x;if(y===undefined)y=camera.position.y;const dx=x-camera.position.x,dz=z-camera.position.z,dy=y-camera.position.y,L=Math.hypot(dx,dz)||1e-6;yaw=Math.atan2(-dx,-dz);pitch=Math.max(-1.5,Math.min(1.5,Math.atan2(dy,L)));camera.rotation.set(pitch,yaw,0,camera.rotation.order);camera.updateMatrixWorld(true);const f=camera.getWorldDirection(new THREE.Vector3()),want=new THREE.Vector3(dx,dy,dz).normalize();if(f.dot(want)<.98)throw Error('face convention mismatch '+JSON.stringify([f.toArray(),want.toArray(),camera.rotation.order]));},
 visible(mesh,others){scene.updateMatrixWorld(true);const a=mesh.getWorldPosition(new THREE.Vector3()),dir=a.clone().sub(camera.position).normalize(),ray=new THREE.Raycaster(camera.position.clone(),dir,0,60);const hit=ray.intersectObjects(others,false)[0];return !!hit&&(hit.object===mesh||hit.object.parent===mesh.parent&&hit.distance<=a.distanceTo(camera.position)+1);},
 aim(part){const m=overseer.targets.find(m=>m.userData.overseer===part);if(!m)return {ok:false};const a=m.getWorldPosition(new THREE.Vector3());this.face(a.x,a.z,a.y);scene.updateMatrixWorld(true);const ray=new THREE.Raycaster(camera.position.clone(),a.clone().sub(camera.position).normalize(),0,60),hit=ray.intersectObjects(obstacles.map(o=>o.mesh).concat(overseer.targets),false)[0];return {ok:true,visible:!!hit&&hit.object===m,distance:a.distanceTo(camera.position),x:a.x,z:a.z};},
 guardAim(){const e=enemies.sort((a,b)=>a.group.position.distanceTo(camera.position)-b.group.position.distanceTo(camera.position))[0];if(!e)return {ok:false};const zone=e.boss&&e.bossState?.openRemaining>0?'core':'head';const m=e.group.children.find(m=>m.userData.hitZone===zone)||e.group.children.find(m=>m.userData.hitZone)||e.group.children[0],a=m.getWorldPosition(new THREE.Vector3());this.face(a.x,a.z,a.y);return {ok:true,visible:this.visible(m,obstacles.map(o=>o.mesh).concat(enemies.flatMap(x=>x.group.children),overseer?.targets||[])),distance:a.distanceTo(camera.position),x:a.x,z:a.z,type:e.type};},
 missionAim(){const a=missionWorld.target(mission.current);this.face(a.x,a.z,a.y);},
 missionXZ(){const a=missionWorld.target(mission.current);return [a.x,a.z];},
 probe(a){const [x,z,y]=a;scene.updateMatrixWorld(true);const dir=camera.getWorldDirection(new THREE.Vector3()),delta=new THREE.Vector3(x,y,z).sub(camera.position),distance=delta.length(),ray=new THREE.Raycaster(camera.position.clone(),delta.clone().normalize(),0,Math.max(0,distance-.15)),hits=ray.intersectObjects(obstacles.map(o=>o.mesh),false);return {distance:+distance.toFixed(3),dot:+delta.normalize().dot(dir).toFixed(3),blockers:hits.slice(0,3).map(h=>[h.object.name||h.object.userData?.kind||'?',+h.distance.toFixed(2),h.object.position.x,h.object.position.z]),yaw:+yaw.toFixed(3),pitch:+pitch.toFixed(3),rot:[+camera.rotation.x.toFixed(3),+camera.rotation.y.toFixed(3)],keys:[...keys]};},
 tick(seconds){for(let left=seconds;left>1e-8&&state==='playing';){const dt=Math.min(.02,left);left-=dt;chrome.update(dt);update(dt);campaignUI.update(dt,true,runMode);}scene.updateMatrixWorld(true);return this.snap();},
 walkTo(a){const [x,z,limit=1600]=a;let best=1e9,worse=0;for(let i=0;i<limit&&state==='playing';i++){const d=Math.hypot(camera.position.x-x,camera.position.z-z);if(d<.12)return this.snap();if(d<best-1e-3){best=d;worse=0;}else if(++worse>40)break;this.face(x,z);this.tick(Math.min(.02,d/9));}return {...this.snap(),blocked:true,best:+best.toFixed(2)};},
 async retry(){const unlocked=document.pointerLockElement?new Promise(r=>document.addEventListener('pointerlockchange',r,{once:true})):Promise.resolve();end(false);await unlocked;await flow.retryStage();return this.snap();}
};`;await route.fulfill({response,body:source});});
  await p.goto('http://127.0.0.1:'+port+'/index.html?map='+map+'&menu=chapter');await p.waitForFunction(()=>document.body.dataset.menuOpen==='true');await p.click('#deploy');
  try{await p.waitForFunction(()=>window.__tail&&document.body.dataset.playState==='playing',null,{timeout:30000});}catch(e){throw Error(map+' did not enter play: '+JSON.stringify(await p.evaluate(()=>({...document.body.dataset,tail:!!window.__tail,deploy:document.querySelector('#deploy')?.textContent,visible:[...document.querySelectorAll('dialog[open],.menu-view:not([hidden])')].map(e=>e.id||e.className)})))+' errors='+JSON.stringify(errors));}
  const call=(m,a)=>p.evaluate(([m,a])=>window.__tail[m](a),[m,a]);
  async function shot(dt=.14){await p.mouse.click(550,380);return call('tick',dt);}
  async function hold(t){await p.keyboard.down('e');const s=await call('tick',t);await p.keyboard.up('e');return s;}
  async function reloadIfEmpty(s){if(s.rounds[0]===0){await p.keyboard.press('KeyR');return call('tick',2.6);}return s;}
  const trail=[];async function walk(x,z){const from=await call('snap');await p.keyboard.down('w');await p.keyboard.down('Shift');let s=await call('walkTo',[x,z,500]);await p.keyboard.up('w');await p.keyboard.up('Shift');
   if(s.blocked){for(const [dx,dz]of [[5,0],[-5,0],[0,5],[0,-5]]){await p.keyboard.down('w');await p.keyboard.down('Shift');s=await call('walkTo',[s.x+dx,s.z+dz,200]);if(!s.blocked)s=await call('walkTo',[x,z,500]);await p.keyboard.up('w');await p.keyboard.up('Shift');if(!s.blocked)break;}}
   trail.push([from.x.toFixed(1),from.z.toFixed(1),'->',x,z,'@',s.x.toFixed(1),s.z.toFixed(1),s.blocked?'BLOCKED':'ok',s.health]);if(trail.length>12)trail.shift();
   assert(!s.blocked,map+' walk blocked trail='+JSON.stringify(trail)+' '+JSON.stringify({state:s.state,health:s.health,count:s.count,stage:s.stage,best:s.best}));assert.equal(s.state,'playing',map+' died walking '+JSON.stringify(s));return s;}
  // Continuous native strafing while firing (alternating direction) so telegraphed shots miss more often.
  let strafeDir='a',strafeFor=0;async function strafing(on){if(on&&!strafing.on){await p.keyboard.down(strafeDir);strafing.on=true;}if(!on&&strafing.on){await p.keyboard.up(strafeDir);strafing.on=false;}}
  async function strafeStep(){strafeFor+=1;if(strafeFor%8===0){await strafing(false);strafeDir=strafeDir==='a'?'d':'a';}await strafing(true);}
  async function strafe(){await strafeStep();return call('tick',.05);}
  // Guard sweep: shoot whichever guard is visible; otherwise advance along the route so the encounter closes naturally.
  async function clearGuards(route){let s=await call('snap');let idx=0,quiet=0;
   for(let i=0;i<900&&s.count>0&&s.state==='playing';i++){const g=await call('guardAim');if(g.ok&&g.visible&&g.distance<42){quiet=0;await strafeStep();s=await reloadIfEmpty(s);s=await shot(.12);}else{await strafing(false);quiet++;if(quiet%40===0&&idx<route.length){s=await walk(...route[idx++]);}else s=await call('tick',.25);}}
   await strafing(false);assert.equal(s.count,0,map+' guards remain '+JSON.stringify(s));assert.equal(s.state,'playing',map+' died in extraction fight trail='+JSON.stringify(trail));return s;}
  let s=await call('setup');await p.keyboard.press('Digit1');s=await call('tick',.3);
  if(map==='reactor'){
   assert(s.boss&&s.boss.hp===1000,'warden present '+JSON.stringify(s));
   for(let i=0;i<900&&s.boss&&s.state==='playing';i++){const g=await call('guardAim');if(g.ok&&g.visible&&g.distance<9){await strafing(false);const k=8/Math.max(g.distance,.5);s=await walk(s.x-(g.x-s.x)*k,s.z-(g.z-s.z)*k);}else if(g.ok&&g.visible){await strafeStep();s=await reloadIfEmpty(s);s=await shot(.12);}else if(g.ok){await strafing(false);s=await walk(g.x+(g.x>s.x?-12:12),g.z+(g.z>s.z?-12:12));}}
   await strafing(false);
   assert(!s.boss,'warden defeated natively '+JSON.stringify(s));assert.equal(s.kills,1);s=await call('tick',.3);assert.equal(s.stage,4,JSON.stringify(s));
  }
  if(map==='station'){
   {const t=await call('missionXZ');s=await walk(t[0]-2.5,t[1]);}for(let i=0;i<30&&!s.ov.blocking;i++)s=await call('tick',.1);assert(s.ov.blocking&&s.ov.phase==='shield','boss activates after walking into the dispatch defense '+JSON.stringify(s));await p.keyboard.press('Digit3');s=await call('tick',.3);
   for(let cycle=0;cycle<6&&s.stage===3&&s.ov.blocking&&s.ov.phase!=='dead'&&s.state==='playing';cycle++){
    for(let i=0;i<120&&!(s.ov.rail.mode==='warning'&&s.ov.rail.timer>3.6);i++)s=await call('tick',.1);if(!s.ov.blocking||s.ov.phase==='dead')break;const lane=s.ov.rail.lane,z=[-25,-29,-35][lane];s=await walk(28.7,z);await call('face',[30,z,1.15]);
    for(let i=0;i<12&&(s.busy.dmg>0||s.busy.moving||s.busy.sw>0);i++)s=await call('tick',.1);s=await hold(.7);if(!s.ov.rail.armed&&s.ov.rail.mode==='warning'&&s.ov.rail.timer>.8){for(let i=0;i<8&&s.busy.dmg>0;i++)s=await call('tick',.1);s=await hold(.7);}
    assert(s.ov.rail.armed,'real E arms switch '+JSON.stringify({rail:s.ov.rail,busy:s.busy,x:s.x,z:s.z,feet:s.feet,grounded:s.grounded,lane,trail,probe:await call('probe',[30,z,1.15])}));
    s=await walk(24.5,-15);for(let i=0;i<120&&s.ov.phase!=='exposed'&&s.state==='playing';i++)s=await call('tick',.1);assert.equal(s.ov.phase,'exposed',JSON.stringify(s));
    s=await walk(24.5,-25);for(let i=0;i<40&&s.ov.phase==='exposed'&&s.stage===3;i++){await call('aim','core');s=await shot(.48);}
   }
   for(let i=0;i<30&&s.stage===3;i++)s=await call('tick',.1);assert.equal(s.stage,4,JSON.stringify({stage:s.stage,ov:s.ov,record:s.record}));assert.equal(s.record.status,'won');assert.equal(s.record.coreDamage,1200);assert.equal(s.kills,1);
  }
  if(map==='roof'){
   if(!s.ov.blocking){s=await walk(0,-28);await call('missionAim');s=await hold(2.2);for(let i=0;i<20&&!s.ov.blocking;i++)s=await call('tick',.1);}
   assert(s.ov.blocking,'overseer active '+JSON.stringify({ov:s.ov,defending:s.defending,progress:s.progress}));
   async function dodgeTick(t){let s=await call('snap');for(let n=0;n<t-1e-8;n+=.1){if(s.ov.attack==='warning'&&s.ov.attackTime<.25&&s.grounded)await p.keyboard.press('Space');s=await call('tick',.1);}return s;}
   for(let cycle=0;cycle<5&&s.ov.blocking&&s.state==='playing';cycle++){
    for(const part of [0,1]){await p.keyboard.press('Digit1');for(let i=0;i<90&&s.ov.nodes[part]>0;i++){const a=await call('aim',part);if(!a.visible){s=await walk(s.x+(a.x-s.x)*.35,s.z+(a.z-s.z)*.35);continue;}s=await reloadIfEmpty(s);if(s.ov.attack==='warning'&&s.ov.attackTime<.25&&s.grounded)await p.keyboard.press('Space');s=await shot(.12);}assert.equal(s.ov.nodes[part],0,map+' node '+part+' '+JSON.stringify({x:s.x,z:s.z,ov:s.ov,rounds:s.rounds,record:s.record}));}
    assert.equal(s.ov.phase,'exposed');await p.keyboard.press('Digit3');s=await call('tick',.3);
    for(let i=0;i<30&&s.ov.phase==='exposed'&&s.ov.blocking;i++){const a=await call('aim','core');if(!a.visible||a.distance>2.6){s=await walk(s.x+(a.x-s.x)*(1-2/Math.max(a.distance,2.01)),s.z+(a.z-s.z)*(1-2/Math.max(a.distance,2.01)));continue;}if(s.ov.attack==='warning'&&s.ov.attackTime<.25&&s.grounded)await p.keyboard.press('Space');s=await shot(.48);}
    if(s.ov.blocking&&s.ov.phase!=='exposed'){s=await walk(0,-32);s=await dodgeTick(.5);}
   }
   assert(!s.ov.blocking,'overseer defeated natively '+JSON.stringify(s));assert.equal(s.record.status,'won');assert.equal(s.kills,1);assert.equal(s.stage,3);
   await p.keyboard.press('Digit1');s=await walk(0,-28);await call('missionAim');s=await hold(2.2);assert(s.defending,'real E starts uplink defense '+JSON.stringify(s));
   for(let i=0;i<600&&s.stage===3&&s.state==='playing';i++){const g=await call('guardAim');if(g.ok&&g.visible){s=await reloadIfEmpty(s);s=await shot(.12);}else s=await call('tick',.2);if(Math.hypot(s.x,s.z+30)>9)s=await walk(0,-28);}
   assert.equal(s.stage,4,'uplink defense held with natural kills '+JSON.stringify(s));
  }
  const cp=s.saved;assert.equal(cp.stageIndex,4);s=await call('retry');assert.equal(s.stage,4);assert.equal(s.health,cp.health);assert.deepEqual([s.x,s.z],[cp.x,cp.z]);assert(s.count>0,'extraction guards rebuilt');
  await p.keyboard.press('Digit1');s=await call('tick',.3);s=await clearGuards(MAPS[map].extract);
  for(const [x,z]of MAPS[map].extract){if(Math.hypot(s.x-x,s.z-z)>.5)s=await walk(x,z);}
  await call('missionAim');s=await hold(2.8);assert.equal(s.complete,false);s=await call('tick',.1);assert.equal(s.progress,0);s=await hold(3.2);assert.equal(s.state,'won',map+' '+JSON.stringify(s));assert.equal(s.complete,true);assert(s.health>0);assert.deepEqual(errors,[]);
  if(process.env.TAIL_SCREENSHOTS){await mkdir(process.env.TAIL_SCREENSHOTS,{recursive:true});await p.screenshot({path:process.env.TAIL_SCREENSHOTS+'/'+map+'-extraction-won.png'});}
  console.log('PASS '+map+': native boss defeat -> actual checkpoint retry -> native guard kills -> walking -> interrupted/real extraction; kills='+s.kills+' health='+s.health);
  await p.close();
 }
 await context.close();
}finally{await browser?.close();child?.kill();}
