// Opt-in, isolated storage and response-only fixture. Earlier stages/guards are elided.
// Native input, app physics, weapon rays, mechanics, checkpoints and extraction remain real.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
let child,browser;
try{
 const port=await new Promise((resolve,reject)=>{const s=createServer();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
 child=spawn(process.execPath,['server.cjs'],{cwd:process.cwd(),env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('server timeout')),15000);child.stdout.on('data',d=>{if(String(d).includes('ready')){clearTimeout(t);resolve();}});child.on('error',reject);child.on('exit',c=>{clearTimeout(t);reject(Error('server exit '+c));});});
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const base=`http://127.0.0.1:${port}/index.html`,errors=[],context=await browser.newContext({viewport:{width:1100,height:760}});
 await context.addInitScript(()=>localStorage.setItem('neon-eclipse.presentation.v1',JSON.stringify({quality:0})));
 for(const map of ['reactor','station','roof','tower','train','harbor','orbital','datacenter','polar']){
  const p=await context.newPage();p.setDefaultTimeout(60000);p.on('pageerror',e=>errors.push(e.message));await p.goto(`${base}?map=${map}&menu=chapter`);await p.waitForFunction(()=>document.body.dataset.menuOpen==='true');assert.equal(await p.locator('.menu-chapter-grid a[data-map]').count(),9);await p.click('#deploy');await p.waitForFunction(()=>document.body.dataset.playState==='playing');await p.waitForTimeout(150);assert.deepEqual(errors,[]);
  if(['train','harbor'].includes(map)){const panel=p.locator('.'+(map==='train'?'skyhook':'leviathan')+'-panel');assert.equal(await panel.getAttribute('data-phase'),'inactive');assert(!(await panel.isVisible()));}
  await p.keyboard.press('Escape');await p.waitForFunction(()=>document.body.dataset.playState==='paused');await p.close();
 }
 console.log('PASS: all nine unmodified chapters boot, menu, inactive new bosses, pause; no page errors');
 for(const map of ['train','harbor']){
  const p=await context.newPage();p.setDefaultTimeout(60000);p.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});
  await p.route('**/app.js',async route=>{
   const response=await route.fetch();let source=await response.text();assert(source.includes("if(state==='playing')update(dt);"));source=source.replace("if(state==='playing')update(dt);",'if(false)update(dt);');
   source="import {SKYHOOK as TEST_SKY,LEVIATHAN as TEST_LEV} from './siege-data.js';\n"+source+`
const testConfig=IS_TRAIN?TEST_SKY:TEST_LEV;
window.__siege={
 clearGuards(){enemies.forEach(e=>disposeGroup(e.group));enemies.length=0;enemyProjectiles.clear();},
 place(x,z,feet,tx=x,ty=feet+1.06,tz=z-2){camera.position.set(x,feet+1.7,z);playerMotion.reset(camera.position,feet);camera.lookAt(tx,ty,tz);yaw=camera.rotation.y;pitch=camera.rotation.x;camera.updateMatrixWorld(true);scene.updateMatrixWorld(true);},
 setup(){reset(0);this.clearGuards();mission.reset(3);art.setStage(3);navigation.invalidate();overseer.setStage(3);mission.state.defending=true;mission.state.progress=testConfig.defense-.05;mission.state.wave=mission.current.defenseWaves?.length||0;const m=mission.current;this.place(m.x,m.z+2.4,m.feetY);state='playing';document.body.dataset.playState=state;overlay.hidden=true;campaignUI.announce(mission.current);return this.snapshot();},
 // Damage fixture: prepare one carried primary; native terminal permissions are tested separately.
 equipWeapon(i){if(i!==2&&i!==3&&!loadout.equip(i))throw new Error('Cannot equip fixture primary');return loadout.allows(i);},
 snapshot(){return {state,stage:mission.state.index,defending:mission.state.defending,hp:overseer.state.hp,phase:overseer.state.phase,timer:overseer.state.timer,arena:overseer.arena,blocking:overseer.blocking,feet:playerMotion.state.y,grounded:playerMotion.state.grounded,x:camera.position.x,z:camera.position.z,kills,health,shots:[...telemetryShots],record:overseer.battle.summary,challenge:achievementUI.attempt.state,hounds:enemies.filter(e=>e.type==='hound').map(e=>({x:e.group.position.x,y:e.group.position.y,z:e.group.position.z})),toast:toast.textContent};},
 tick(seconds){for(let left=seconds;left>1e-8&&state==='playing';){const dt=Math.min(.05,left);left-=dt;damageTime=Math.max(0,damageTime-dt);update(dt);}scene.updateMatrixWorld(true);return this.snapshot();},
 control(id=overseer.arena.index){const a=testConfig.controls[id];if(IS_HARBOR&&id>0)this.place(a.x-2,a.z,a.feetY,a.x,a.feetY+1.06,a.z);else this.place(a.x,a.z+1.9,a.feetY,a.x,a.feetY+1.06,a.z);},
 core(){this.place(testConfig.core.x,testConfig.core.z+testConfig.core.front+2.3,overseer.floor);this.aim();},
 aim(){const target=overseer.targets.find(m=>m.userData.overseer==='core').getWorldPosition(new THREE.Vector3());camera.lookAt(target);yaw=camera.rotation.y;pitch=camera.rotation.x;camera.updateMatrixWorld(true);},
 overview(){if(IS_TRAIN)this.place(3.5,-9,4.5,0,8,-16.3);else this.place(-7,-18.8,3,12,4.5,-21);},settleUI(){campaignUI.update(20,true,runMode);},jumpStart(){this.place(4.8,-19.8,3,8,4.7,-19.8);},stairs(){this.place(-20,-16,0,-10,1.7,-16);},
 save(){saveCheckpoint();return checkpoint();},saveEntry(){const e=STAGE_ENTRIES[3];return campaign.save({...checkpoint(),x:e.x,z:e.z,feetY:e.feetY});},retry(){return retryStage();},fail(){end(false);return this.snapshot();},
 extract(){this.clearGuards();const m=mission.current;this.place(m.x,m.z+2.4,m.feetY,m.x,m.feetY+1.15,m.z);}
};`;
   await route.fulfill({response,body:source});
  });
  await p.goto(`${base}?map=${map}&menu=chapter`);await p.click('#deploy');await p.waitForFunction(()=>window.__siege&&document.body.dataset.playState==='playing');
  const run=(m,a)=>p.evaluate(([m,a])=>window.__siege[m](a),[m,a]);const max=map==='train'?1600:1800,operation=map==='train'?1.2:2;let s=await run('setup');s=await run('tick',.05);assert.equal(s.stage,3);assert.equal(s.phase,'inactive');s=await run('tick',.05);assert(s.blocking);
  if(process.env.SIEGE_SCREENSHOTS){await mkdir(process.env.SIEGE_SCREENSHOTS,{recursive:true});await run('overview');await run('settleUI');await p.screenshot({path:process.env.SIEGE_SCREENSHOTS+'/'+map+'-arena.png'});}
  await run('core');await p.mouse.click(550,380);s=await run('tick',.25);assert.equal(s.hp,max);assert(s.shots[0]>0);assert(s.toast.includes('装甲抵挡'),'real shield ray');
  await run('control',1);await p.keyboard.down('e');s=await run('tick',.65);await p.keyboard.up('e');assert.equal(s.arena.mode,'ready');
  await run('control',0);await p.keyboard.down('e');await run('tick',.3);await p.keyboard.press('Escape');await p.keyboard.up('e');s=await run('snapshot');assert.equal(s.arena.hold,0);const timer=s.timer;s=await run('tick',5);assert.equal(s.timer,timer);await p.click('#deploy');await p.waitForFunction(()=>document.body.dataset.playState==='playing');
  console.log('PASS',map,'last defense frame, shield hit, wrong control, pause clears incomplete E');
  await run('setup');await run('tick',.1);await p.keyboard.press('Digit4');await run('tick',.4);let sawHounds=false,jumped=false;const shots=new Set();
  async function arm(){await run('control');await p.keyboard.down('e');let a=await run('tick',.65);await p.keyboard.up('e');assert.equal(a.arena.mode,'operation',JSON.stringify(a));a=await run('tick',operation+.06);assert.equal(a.phase,'exposed');if(map==='train'&&a.arena.index===0&&!sawHounds){assert.equal(a.hounds.length,2);assert(a.hounds.every(h=>h.y===4.5));sawHounds=true;}await run('clearGuards');await run('core');return a;}
  for(let i=0;i<120;i++){
   s=await run('snapshot');if(s.stage===4)break;
   if(s.arena.mode==='transition'){await run('tick',2.05);continue;}
   if(s.phase==='shield'){
    if(map==='harbor'&&s.arena.index===1&&!jumped){await run('jumpStart');await p.keyboard.down('w');await p.keyboard.press('Space');await run('tick',.7);await p.keyboard.up('w');s=await run('tick',.35);assert(s.x>7.8&&Math.abs(s.feet-3)<.01&&s.grounded);jumped=true;}
    s=await arm();
    if(process.env.SIEGE_SCREENSHOTS&&!shots.has(s.arena.index)){await mkdir(process.env.SIEGE_SCREENSHOTS,{recursive:true});await run('settleUI');await p.screenshot({path:process.env.SIEGE_SCREENSHOTS+'/'+map+'-'+s.arena.index+'.png'});shots.add(s.arena.index);}
   }
   await p.mouse.click(550,380);s=await run('tick',.48);
  }
  s=await run('tick',.9);assert.equal(s.stage,4,JSON.stringify(s));assert.equal(s.kills,1);assert.equal(s.record.status,'won');assert.equal(s.record.coreDamage,max);assert.equal(s.challenge.shots,0);assert.equal(s.challenge.kills[3],1);assert(s.challenge.eligible&&s.challenge.alive);if(map==='train')assert(sawHounds);else assert(jumped);
  const cp=await run('save');assert.equal(cp.stageIndex,4);assert.equal(cp.skyhook,undefined);assert.equal(cp.leviathan,undefined);await run('retry');s=await run('snapshot');assert.equal(s.stage,4);assert(!s.blocking);assert(!s.challenge.eligible);await run('extract');await p.keyboard.down('e');s=await run('tick',3.2);await p.keyboard.up('e');assert.equal(s.state,'won');assert.equal(s.kills,1);
  console.log('PASS',map,'real E operation, phases, native knife kill, roof hounds / native catwalk jump, battle totals, old checkpoint and extraction');
  await p.reload();await p.click('#deploy');await p.waitForFunction(()=>document.body.dataset.playState==='playing');
  for(let weapon=0;weapon<8;weapon++){
   await run('setup');await run('tick',.1);assert(await run('equipWeapon',weapon));await p.keyboard.press('Digit'+(weapon+1));await run('tick',.4);await arm();await p.mouse.down();s=await run('tick',weapon===6?.95:.4);await p.mouse.up();assert(s.hp<max&&s.hp>=max-(map==='train'?800:600),'weapon '+weapon+JSON.stringify(s));assert(s.shots[weapon]>0);
  }
  await run('setup');await run('tick',.1);await run('control');await p.keyboard.down('e');await run('tick',.65);await p.keyboard.up('e');s=await run('snapshot');assert.equal(s.arena.mode,'operation');assert(await run('saveEntry'));await run('fail');await run('retry');s=await run('snapshot');assert.equal(s.stage,3);assert.equal(s.phase,'inactive');assert.equal(s.hp,max);assert.equal(s.arena.index,0);assert.equal(s.arena.hold,0);assert(!s.defending);assert(!s.challenge.eligible);assert.deepEqual(errors,[]);console.log('PASS',map,'all eight weapons, operation death/retry reset, no page errors');await p.close();
 }
 await context.close();
}finally{await browser?.close();child?.kill();}
