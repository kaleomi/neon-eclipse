import {fileURLToPath} from 'node:url';
// Opt-in isolated browser. Response-only fixture skips earlier guards/stages and allows explicit placement.
// Input, collision, jump, lift, shield, weapon, battle record, death/retry and extraction run the real app.
// This is controlled integration evidence, NOT a natural chapter completion or achievement certification.
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
 const base=`http://127.0.0.1:${port}/index.html`,errors=[],context=await browser.newContext({viewport:{width:1100,height:760}});
 await context.addInitScript(()=>localStorage.setItem('neon-eclipse.presentation.v1',JSON.stringify({quality:0})));
 for(const map of ['tower','station','roof']){
  const p=await context.newPage();p.setDefaultTimeout(60000);p.on('pageerror',e=>errors.push(e.message));await p.goto(`${base}?map=${map}&menu=chapter`);await p.waitForFunction(()=>document.body.dataset.menuOpen==='true');
  assert.equal(await p.locator('.menu-chapter-grid a[data-map]').count(),9);await p.click('#deploy');await p.waitForFunction(()=>document.body.dataset.playState==='playing');await p.waitForTimeout(200);assert.deepEqual(errors,[]);
  if(map==='tower'){assert.equal(await p.locator('.elevator-panel').getAttribute('data-phase'),'inactive');assert(!(await p.locator('.elevator-panel').isVisible()));}
  else assert.equal(await p.locator('.elevator-panel').count(),0);
  await p.keyboard.press('Escape');await p.waitForFunction(()=>document.body.dataset.playState==='paused');await p.close();
 }
 console.log('PASS: unmodified tower/station/roof boot, nine-card menu, hidden inactive boss, no UI leak, pause');
 const p=await context.newPage();p.setDefaultTimeout(60000);p.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});
 await p.route('**/app.js',async route=>{
  const response=await route.fetch();let source=await response.text();assert(source.includes("if(state==='playing')update(dt);"));source=source.replace("if(state==='playing')update(dt);",'if(false)update(dt);');
  source+=`
window.__elevatorFixture={
 tailLocked:false,lockTail(){this.tailLocked=true;return this.snapshot();},
 clearGuards(){if(this.tailLocked)throw Error('No guard removal in native tail');enemies.forEach(e=>disposeGroup(e.group));enemies.length=0;enemyProjectiles.clear();},
 place(x,z,feet,tx=23.5,ty=feet+1.25,tz=.3){if(this.tailLocked)throw Error('No placement in native tail');camera.position.set(x,feet+1.7,z);playerMotion.reset(camera.position,feet);camera.lookAt(tx,ty,tz);yaw=camera.rotation.y;pitch=camera.rotation.x;camera.updateMatrixWorld(true);scene.updateMatrixWorld(true);},
 setup(){reset(0);this.clearGuards();mission.reset(3);art.setStage(3);navigation.invalidate();overseer.setStage(3);mission.state.defending=true;mission.state.progress=17.95;this.place(7,-4.6,6,7,7.15,-7);state='playing';document.body.dataset.playState=state;overlay.hidden=true;campaignUI.announce(mission.current);return this.snapshot();},
 // Damage fixture: prepare one carried primary; native terminal permissions are tested separately.
 equipWeapon(i){if(i!==2&&i!==3&&!loadout.equip(i))throw new Error('Cannot equip fixture primary');return loadout.allows(i);},
 snapshot(){return {guards:enemies.map(e=>({type:e.type,hp:e.hp,x:e.group.position.x,z:e.group.position.z,feet:e.group.position.y})),count:enemies.length,rounds0:rounds[0],state,stage:mission.state.index,defending:mission.state.defending,progress:mission.state.progress,hp:overseer.state.hp,phase:overseer.state.phase,timer:overseer.state.timer,blocking:overseer.blocking,arena:overseer.arena,lift:overseer.lift,feet:playerMotion.state.y,grounded:playerMotion.state.grounded,x:camera.position.x,z:camera.position.z,health,kills,shots:[...telemetryShots],challenge:achievementUI.attempt.state,record:overseer.battle.summary};},
 tick(seconds){for(let left=seconds;left>1e-8&&state==='playing';){const dt=Math.min(.05,left);left-=dt;chrome.update(dt);update(dt);}scene.updateMatrixWorld(true);return this.snapshot();},
 pad(){this.place(23.5,1.45,overseer.arena.index*3);},offpad(){this.place(22.1,1.45,overseer.arena.index*3);},
 board(){this.place(23.5,6,overseer.lift.y);},aim(){camera.lookAt(23.5,overseer.arena.index*3+1.25,.3);yaw=camera.rotation.y;pitch=camera.rotation.x;camera.updateMatrixWorld(true);},
 portrait(){this.place(23.5,3.3,0);},fall(){this.place(23.5,12,0,23.5,1.05,10.2);},view(){this.place(28,16,0,23.5,3,2);},
 save(){flow.saveCheckpoint();return checkpoint();},retry(){return flow.retryStage();},fail(){end(false);return this.snapshot();},
 // Native tail helpers (no placement): analytic facing, controlled walking, visible-guard aim with a real first-hit visibility ray.
 face(a){let [x,z,y]=a;if(y===undefined)y=camera.position.y;const dx=x-camera.position.x,dz=z-camera.position.z,dy=y-camera.position.y,L=Math.hypot(dx,dz)||1e-6;yaw=Math.atan2(-dx,-dz);pitch=Math.max(-1.5,Math.min(1.5,Math.atan2(dy,L)));camera.rotation.set(pitch,yaw,0,camera.rotation.order);camera.updateMatrixWorld(true);},
 walkTo(a){const [x,z,limit=700]=a;let best=1e9,worse=0;for(let i=0;i<limit&&state==='playing';i++){const d=Math.hypot(camera.position.x-x,camera.position.z-z);if(d<.3)return this.snapshot();if(d<best-1e-3){best=d;worse=0;}else if(++worse>60)break;this.face([x,z]);this.tick(Math.min(.02,d/9));}return best<.8?this.snapshot():{...this.snapshot(),blocked:true,best};},
 guardAim(){scene.updateMatrixWorld(true);const all=obstacles.map(o=>o.mesh).concat(enemies.flatMap(e=>e.group.children)),list=enemies.filter(e=>e.hp>0).sort((a,b)=>a.group.position.distanceTo(camera.position)-b.group.position.distanceTo(camera.position));let fallback;
  for(const e of list){const m=e.group.children.find(m=>m.userData.hitZone==='head')||e.group.children[0],a=m.getWorldPosition(new THREE.Vector3()),ray=new THREE.Raycaster(camera.position.clone(),a.clone().sub(camera.position).normalize(),0,60),hit=ray.intersectObjects(all,false)[0],g={ok:true,visible:!!hit&&hit.object.parent===e.group,distance:a.distanceTo(camera.position),x:a.x,z:a.z,y:a.y};fallback??=g;if(g.visible){this.face([a.x,a.z,a.y]);return g;}}if(fallback)this.face([fallback.x,fallback.z,fallback.y]);return fallback||{ok:false};},
 missionAim(){const a=missionWorld.target(mission.current);this.face([a.x,a.z,a.y]);}
};`;
  await route.fulfill({response,body:source});
 });
 await p.goto(`${base}?map=tower&menu=chapter`);await p.waitForFunction(()=>document.body.dataset.menuOpen==='true');await p.click('#deploy');await p.waitForFunction(()=>window.__elevatorFixture&&document.body.dataset.playState==='playing');
 const run=(m,a)=>p.evaluate(([m,a])=>window.__elevatorFixture[m](a),[m,a]);
 let s=await run('setup');s=await run('tick',.05);assert.equal(s.stage,3);assert.equal(s.phase,'inactive');s=await run('tick',.05);assert(s.blocking);assert.equal(s.phase,'shield');
 await run('board');await p.mouse.click(550,380);s=await run('tick',.25);assert.equal(s.hp,1500);assert(s.shots[0]>0);
 await run('pad');await run('tick',.3);await p.keyboard.press('Escape');await p.waitForFunction(()=>document.body.dataset.playState==='paused');await p.waitForTimeout(200);s=await run('snapshot');assert.equal(s.arena.charge,0);const paused=s.timer;s=await run('tick',3);assert.equal(s.timer,paused);
 await p.click('#deploy');await p.waitForFunction(()=>document.body.dataset.playState==='playing');
 console.log('PASS: last defense frame cannot skip boss, real shield shot rejected, pause clears pad hold and freezes clocks');
 await run('setup');await run('tick',10.1);await run('pad');await run('tick',.65);await p.keyboard.press('Digit3');s=await run('tick',.35);assert.equal(s.phase,'exposed');
 if(process.env.ELEVATOR_SCREENSHOT){await mkdir(path.dirname(process.env.ELEVATOR_SCREENSHOT),{recursive:true});await run('portrait');await run('tick',.05);await p.screenshot({path:process.env.ELEVATOR_SCREENSHOT});await run('pad');await run('tick',.05);}
 async function rideAndJump(goal){
  await run('board');let s=await run('snapshot');s=await run('tick',Math.abs(goal-s.lift.y)/.65+.15);assert.equal(s.lift.y,goal);assert.equal(s.feet,goal);assert.equal(s.arena.mode,'dock');
  await p.keyboard.down('w');await run('tick',.35);await p.keyboard.press('Space');s=await run('tick',.55);
  for(let i=0;i<20&&s.z>1.6;i++)s=await run('tick',.05);await p.keyboard.up('w');s=await run('tick',.85);assert(Math.abs(s.feet-goal)<.01&&s.grounded,JSON.stringify(s));assert(s.z<=1.7&&s.z>=.6);assert.equal(s.phase,'exposed');await run('aim');return s;
 }
 let recalled=false;
 for(let i=0;i<100;i++){
  s=await run('snapshot');if(s.stage===4)break;
  if(s.arena.mode==='boarding'){
   const goal=s.arena.index*3;
   if(goal===6&&!recalled){
    await run('board');s=await run('tick',5);assert.equal(s.lift.y,6);await run('fall');await p.keyboard.down('e');s=await run('tick',.7);await p.keyboard.up('e');assert(s.lift.moving&&s.lift.target===0,'actual E recall');
    await p.keyboard.press('Escape');await p.waitForFunction(()=>document.body.dataset.playState==='paused');const y=s.lift.y;s=await run('tick',2);assert.equal(s.lift.y,y);await p.click('#deploy');await p.waitForFunction(()=>document.body.dataset.playState==='playing');
    s=await run('tick',10);assert.equal(s.lift.y,0);assert.equal(s.hp,500);recalled=true;
   }
   s=await rideAndJump(goal);
  }else if(s.phase==='shield'){await run('offpad');await run('tick',.05);await run('pad');s=await run('tick',.65);assert.equal(s.phase,'exposed');}
  await p.mouse.click(550,380);s=await run('tick',.48);
 }
 s=await run('tick',.9);assert(recalled);assert.equal(s.stage,4,JSON.stringify(s));assert.equal(s.kills,1);assert.equal(s.record.status,'won');assert.equal(s.record.coreDamage,1500);assert(s.record.windows>=3);assert.equal(s.challenge.shots,0);assert.equal(s.challenge.kills[3],1);assert(s.challenge.eligible&&s.challenge.alive);assert.equal(s.lift.y,6);
 const cp=await run('save');assert.equal(cp.stageIndex,4);assert.equal(cp.elevator,undefined);assert.equal(typeof cp.towerLiftTime,'number');await run('retry');s=await run('snapshot');assert.equal(s.stage,4);assert(!s.blocking);assert.equal(s.lift.y,6);assert(!s.challenge.eligible);
 // Actual stage-4 retry -> upper deck -> combat lift -> ELEVATOR_BRIDGE -> sprint jump across x=15..12 -> original stairs -> lobby.
 // Default native tail: no geometry, health, enemies or progress are patched. Placement/removal helpers are locked until the next page load.
 {
  await run('lockTail');assert.deepEqual([s.x,s.z,s.feet,s.health],[cp.x,cp.z,cp.feetY,cp.health],'actual checkpoint pose/health restored');
  const trail=[];
  const walk=async(x,z,jump=false)=>{await run('face',[x,z]);await p.keyboard.down('w');await p.keyboard.down('Shift');if(jump)await p.keyboard.press('Space');let r;try{r=await run('walkTo',[x,z]);}finally{await p.keyboard.up('w');await p.keyboard.up('Shift');}trail.push({x,z,jump,at:[r.x,r.z,r.feet],grounded:r.grounded,health:r.health});assert(!r.blocked,'tower walk blocked '+JSON.stringify({trail,r}));assert.equal(r.state,'playing',JSON.stringify({trail,r}));return r;};
  const land=async(feet,label)=>{let r=await run('snapshot');for(let i=0;i<100&&!r.grounded;i++)r=await run('tick',.02);assert(r.grounded&&Math.abs(r.feet-feet)<.05,label+' '+JSON.stringify({trail,r}));console.log('TAIL '+label+' '+JSON.stringify({x:r.x,z:r.z,feet:r.feet,health:r.health}));return r;};
  const sweep=async()=>{let r=await run('snapshot');for(let i=0;i<140&&r.count>0&&r.state==='playing';i++){const g=await run('guardAim');if(!g.ok||!g.visible||g.distance>=42)break;if(r.rounds0===0){await p.keyboard.press('KeyR');r=await run('tick',2.6);await run('guardAim');}await p.mouse.click(550,380);r=await run('tick',.12);}assert.equal(r.state,'playing','native guard fight '+JSON.stringify({trail,r}));return r;};
  await p.keyboard.press('Digit1');s=await run('tick',.3);assert.equal(s.count,4,'extraction guards rebuilt by retry');
  s=await walk(23.5,6,true);s=await land(6,'combat lift landing');
  s=await walk(15.25,6);s=await land(6,'bridge west lip');
  s=await walk(10.5,6,true);s=await land(6,'3m gap cleared onto core floor');s=await sweep();
  for(const [x,z,feet]of [[2,6,6],[1,0,6],[-7,0,3],[-10.5,0,3],[-18.8,0,0],[-18.5,2.25,0],[-20.5,2.25,0]]){s=await walk(x,z);s=await land(feet,'stairs/door '+x+','+z);s=await sweep();}
  // The x=-19.2 wall opens only at |z|<3; z=2.25 stays in the ground-level strip beside the first stairs.
  const search=[[-24,2.25],[-25,-10],[-24,2.25],[-18.6,2.25],[-18.6,-3],[-14,-12],[-18.6,-3],[-18.6,2.25],[-14,12],[2,12],[-14,12],[-18.5,2.25],[-20.5,2.25],[-24,8]];
  for(const [x,z]of search){if(!s.count)break;s=await walk(x,z);s=await sweep();}
  assert.equal(s.count,0,'extraction guards killed natively '+JSON.stringify({trail,s}));
  // Return through the same doorway even if the last guard was on the core side of the partition.
  if(s.x>-19.2){for(const point of [[-18,2.25],[-20.5,2.25]])s=await walk(...point);}s=await walk(-25,16);await run('tick',.15);
  await run('missionAim');await p.keyboard.down('e');s=await run('tick',2.8);await p.keyboard.up('e');assert.equal(s.state,'playing');s=await run('tick',.1);assert.equal(s.progress,0,'release resets incomplete extraction');
  await p.keyboard.down('e');s=await run('tick',3.2);await p.keyboard.up('e');assert.equal(s.state,'won',JSON.stringify(s));assert.equal(s.stage,5);assert.equal(s.kills,5);assert(s.health>0);
  if(process.env.ELEVATOR_SCREENSHOT)await p.screenshot({path:process.env.ELEVATOR_SCREENSHOT.replace(/\.png$/,'-extraction-won.png')});
  console.log('PASS: native upper bridge + 3m jump + 6/3/0m stairs + lobby doorway + four guard kills + interrupted/real extraction; health='+s.health);
 }
 console.log('PASS: three locks via native knife attacks, riding and W/Space jumps, E fall recovery and moving-lift pause, single credit/battle stats, stage-4 checkpoint');
 await p.reload();await p.waitForFunction(()=>document.body.dataset.menuOpen==='true');await p.click('#deploy');await p.waitForFunction(()=>document.body.dataset.playState==='playing');
 for(let weapon=0;weapon<8;weapon++){
  await run('setup');await run('tick',.1);await run('pad');await run('tick',.65);assert(await run('equipWeapon',weapon));await p.keyboard.press((weapon===3?'Digit3':weapon===2?'Digit2':'Digit1'));await run('tick',.4);await p.mouse.down();s=await run('tick',weapon===6?.95:.4);await p.mouse.up();assert(s.hp<1500&&s.hp>=1000,'weapon '+weapon+' damage '+JSON.stringify(s));assert(s.shots[weapon]>0);
 }
 console.log('PASS: all eight weapon input/raycast/melee/burst/charge paths, per-lock damage cap');
 await run('setup');await run('tick',.1);if(process.env.ELEVATOR_SCREENSHOT){await run('view');await run('tick',10);await p.screenshot({path:process.env.ELEVATOR_SCREENSHOT.replace(/\.png$/,'-arena.png')});}
 await run('pad');await run('tick',.65);await run('save');await run('fail');await run('retry');s=await run('snapshot');assert.equal(s.stage,3);assert.equal(s.phase,'inactive');assert.equal(s.hp,1500);assert.equal(s.arena.index,0);assert.equal(s.lift.y,0);assert(!s.defending);assert(!s.challenge.eligible);
 assert.deepEqual(errors,[]);console.log('PASS: death/stage-3 retry resets locks/lift/defense, old schema and original lift timer preserved, zero page errors');await context.close();
}finally{await browser?.close();child?.kill();}
