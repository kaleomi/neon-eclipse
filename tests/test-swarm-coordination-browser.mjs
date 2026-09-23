import {fileURLToPath} from 'node:url';
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
 const context=await browser.newContext({viewport:{width:1280,height:800}}),p=await context.newPage();p.setDefaultTimeout(60000);p.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});
 const url=new URL(base);url.search='?map=reactor&menu=chapter';
 await p.route('**/app.js',async route=>{const response=await route.fetch();let source=await response.text();assert(source.includes("if(state==='playing')update(dt);"));source=source.replace("if(state==='playing')update(dt);",'if(false)update(dt);');source+=`
window.__coordFixture={
 setup(){reset(2);state='playing';document.body.dataset.playState=state;overlay.hidden=true;enemyProjectiles.clear();enemyDirector.clear();const drone=enemies.find(e=>e.type==='swarmDrone'),guards=enemies.filter(e=>e.type==='ranged').slice(0,2),keep=[drone,...guards];for(let i=enemies.length-1;i>=0;i--)if(!keep.includes(enemies[i])){disposeGroup(enemies[i].group);enemies.splice(i,1);}obstacles.length=0;camera.position.set(0,1.7,0);playerMotion.reset(camera.position,0);drone.group.position.set(0,1.9,-9);drone.swarm.center={x:0,y:1.9,z:-8.35};drone.swarmSlot=1;drone.attack=0;drone.charge=0;guards.forEach((e,i)=>{e.group.position.set(4+i*2,0,-9);e.attack=9999;e.charge=0;e.speed=0;});this.source=drone;this.guards=guards;const mesh=box(4,4,.2,3,2,-7);obstacles.push({x:3,z:-7,w:4,d:.2,h:4,mesh});loadout.equip(6);changeWeapon(6);handling.update(1,false);cooldown=0;enemyFireGate=0;this.aim();gun.position.set(.29,-.28,-.68);gun.rotation.set(0,.16,0);hud();scene.updateMatrixWorld(true);return this.snapshot();},
 aim(){camera.lookAt(this.source.group.position);yaw=camera.rotation.y;pitch=camera.rotation.x;camera.updateMatrixWorld(true);},
 tick(dt){if(state==='playing')update(dt);return this.snapshot();},snapshot(){return {state,intel:enemyDirector.coordination,receivers:enemies.filter(e=>e.swarmIntel).map(e=>({point:e.swarmIntel.point,remaining:e.swarmIntel.remaining,lit:e.swarmIntel.lit})),drones:enemies.filter(e=>e.type==='swarmDrone').length,pending:enemyProjectiles.charging,bolts:enemyProjectiles.count,sourceHp:this.source?.hp,rounds:[...rounds],shots:[...telemetryShots],health,attempt:achievementUI.attempt.state};},
 sidestep(){camera.position.x=2;playerMotion.reset(camera.position,0);},cover(){const mesh=box(4,4,.2,0,2,-4);obstacles.push({x:0,z:-4,w:4,d:.2,h:4,mesh});scene.updateMatrixWorld(true);},resume(){return enterPlay();},save(){saveCheckpoint();return checkpoint();},restore(){const cp=campaign.checkpoint;reset(cp.stageIndex,cp);state='playing';overlay.hidden=true;return this.snapshot();},finish(){end(false);return this.snapshot();}
 };`;await route.fulfill({response,body:source});});
 await p.goto(url.href);await p.waitForFunction(()=>!!window.__coordFixture);const setup=()=>p.evaluate(()=>window.__coordFixture.setup()),tick=d=>p.evaluate(d=>window.__coordFixture.tick(d),d);
 let s=await setup();s=await tick(.01);assert.equal(s.receivers.length,2);assert(s.intel.lit);assert.equal(s.pending,1);assert.equal(s.intel.point.x,0);await p.waitForFunction(()=>document.querySelector('.swarm-coordination-status').dataset.lit==='true');assert((await p.locator('.swarm-coordination-status').textContent()).includes('2 名远程'));
 if(process.env.COORD_SCREENSHOT){await mkdir(path.dirname(process.env.COORD_SCREENSHOT),{recursive:true});await p.screenshot({path:process.env.COORD_SCREENSHOT});}
 await p.keyboard.press('Escape');const saved=s.intel;s=await tick(5);assert.equal(s.state,'paused');assert.deepEqual(s.intel,saved);await p.evaluate(()=>window.__coordFixture.resume());await p.evaluate(()=>window.__coordFixture.sidestep());s=await tick(.1);assert(!s.intel.lit);assert.equal(s.intel.point.x,0);assert(s.receivers.every(r=>r.point.x===0));await p.waitForFunction(()=>document.querySelector('.swarm-coordination-status').textContent.includes('搜索旧位置'));s=await tick(2.91);assert.equal(s.intel,null);assert.equal(s.receivers.length,0);await p.waitForFunction(()=>document.querySelector('.swarm-coordination-status').hidden);
 await setup();await tick(.01);await p.evaluate(()=>window.__coordFixture.cover());s=await tick(.01);assert(!s.intel.lit);assert.equal(s.receivers.length,2,'cover interrupts light but leaves static expiring memory');assert.equal(s.intel.point.x,0);
 // Kill the actual emitting model with actual held RAILSPIKE input, before its warning ends.
 await setup();await tick(.01);await p.evaluate(()=>window.__coordFixture.aim());await p.mouse.down();s=await tick(.8);await p.mouse.up();assert(s.sourceHp<=0,JSON.stringify(s));assert.equal(s.shots[6],1);assert.equal(s.intel,null);assert.equal(s.receivers.length,0);assert.equal(s.pending,0);await p.waitForFunction(()=>document.querySelector('.swarm-coordination-status').hidden);
 await setup();await tick(.01);const cp=await p.evaluate(()=>window.__coordFixture.save());assert.equal(cp.stageIndex,2);assert(!Object.hasOwn(cp,'swarmIntel'));s=await p.evaluate(()=>window.__coordFixture.restore());assert.equal(s.drones,6);assert.equal(s.intel,null);assert.equal(s.pending+s.bolts,0);assert.equal(s.receivers.length,0);assert(!s.attempt.eligible);
 await setup();await tick(.01);s=await p.evaluate(()=>window.__coordFixture.finish());assert.equal(s.intel,null);assert.equal(s.receivers.length,0);assert.equal(s.pending+s.bolts,0);s=await tick(2);assert.equal(s.intel,null);
 assert.deepEqual(errors,[]);console.log('PASS: actual app blue queue/2 recipients and readable HUD, frozen memory/side-step/cover/expiry/pause, real RAIL kill interrupts relay, checkpoint no transient serialization and strict retry, death cleanup');await context.close();
}finally{await browser?.close();child?.kill();}
