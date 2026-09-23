// Isolated Chromium. Checkpoint tests run real reset/retry with live encounter construction.
// Initial guards elided; one valid outside-cabinet start. Native input damage; not a natural full chapter run.
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

window.__glacierRoute={
 snap(){return {state,stage:mission.state.index,complete:mission.state.complete,health,kills,x:camera.position.x,z:camera.position.z,feet:playerMotion.state.y,grounded:playerMotion.state.grounded,hp:overseer.state.hp,phase:overseer.state.phase,attack:overseer.state.attack,attackTime:overseer.state.attackTime,timer:overseer.state.timer,nodes:[],count:enemies.length,rounds:[...rounds],saved:campaign.checkpoint,eligible:achievementUI.attempt.state.eligible,record:overseer.battle.summary,progress:mission.state.progress};},
 place(a){const [x,z,y]=a;camera.position.set(x,y+1.7,z);playerMotion.reset(camera.position,y);scene.updateMatrixWorld(true);},
 setup(){reset(3);for(const e of enemies)disposeGroup(e.group);enemies.length=0;enemyProjectiles.clear();this.place([0,0,0]);state='playing';document.body.dataset.playState=state;overlay.hidden=true;return this.snap();},
 face(x,z,y=camera.position.y){camera.lookAt(x,y,z);yaw=camera.rotation.y;pitch=camera.rotation.x;camera.updateMatrixWorld(true);},
 aim(part){const m=overseer.targets.find(m=>m.userData.overseer===part);if(!m)throw Error('Missing target '+part);const a=m.getWorldPosition(new THREE.Vector3());this.face(a.x,a.z,a.y);},
 guardAim(groundOnly){const e=enemies.filter(e=>!groundOnly||e.group.position.y<3).sort((a,b)=>a.group.position.distanceTo(camera.position)-b.group.position.distanceTo(camera.position))[0];if(!e)return false;const m=e.group.children.find(m=>m.userData.hitZone==='head')||e.group.children[0],a=m.getWorldPosition(new THREE.Vector3());this.face(a.x,a.z,a.y);return true;},
 missionAim(){const a=missionWorld.target(mission.current);this.face(a.x,a.z,a.y);},
 tick(seconds){for(let left=seconds;left>1e-8&&state==='playing';){const dt=Math.min(.02,left);left-=dt;chrome.update(dt);update(dt);campaignUI.update(dt,true,runMode);}scene.updateMatrixWorld(true);return this.snap();},
 walkTo(a){const [x,z]=a;this.face(x,z);for(let i=0;i<1600&&state==='playing';i++){const d=Math.hypot(camera.position.x-x,camera.position.z-z);if(d<.025)return this.snap();this.tick(Math.min(.02,d/8));}throw Error('walk blocked '+JSON.stringify(this.snap()));},
 async retry(){const unlocked=document.pointerLockElement?new Promise(r=>document.addEventListener('pointerlockchange',r,{once:true})):Promise.resolve();end(false);await unlocked;await flow.retryStage();return this.snap();}
};`;await route.fulfill({response,body:s});
 });
 await p.goto('http://127.0.0.1:'+port+'/index.html?map=polar&menu=chapter');await p.click('#deploy');await p.waitForFunction(()=>window.__glacierRoute&&document.body.dataset.playState==='playing');
 const call=(m,a)=>p.evaluate(([m,a])=>window.__glacierRoute[m](a),[m,a]);
 async function walk(x,z){await p.keyboard.down('w');await p.keyboard.down('Shift');const s=await call('walkTo',[x,z]);await p.keyboard.up('w');await p.keyboard.up('Shift');return s;}
 async function shot(dt=.48){await p.mouse.click(550,380);return call('tick',dt);}
 async function hold(t){await p.keyboard.down('e');const s=await call('tick',t);await p.keyboard.up('e');return s;}
 let s=await call('setup');await p.keyboard.press('Digit3');s=await call('tick',.4);
 for(let i=0;i<200&&s.phase!=='sunk';i++)s=await call('tick',.1);
 assert.equal(s.phase,'sunk','boss naturally follows player onto thin ice');assert(s.health>0);
 for(let i=0;i<20&&s.stage===3;i++){await call('aim','core');s=await shot();}
 assert.equal(s.stage,4,'native blade defeat '+JSON.stringify(s));assert.equal(s.record.status,'won');assert.equal(s.record.coreDamage,1800,'final core strike must remain core damage '+JSON.stringify(s.record));assert.equal(s.kills,1);assert.equal(s.count,4);
 const cp=s.saved;s=await call('retry');assert.equal(s.stage,4);assert.equal(s.health,cp.health);assert.deepEqual([s.x,s.z,s.feet],[cp.x,cp.z,cp.feetY]);assert.equal(s.count,4);
 await p.keyboard.press('Digit1');s=await call('tick',.4);
 for(let i=0;i<180&&s.count&&s.state==='playing';i++){await call('guardAim',false);if(s.rounds[0]===0){await p.keyboard.press('KeyR');s=await call('tick',2.5);}else s=await shot(.16);}
 assert.equal(s.state,'playing',JSON.stringify(s));assert.equal(s.count,0,JSON.stringify(s));assert.equal(s.kills,5);
 for(const point of [[-18,0],[-18,26],[-28,26],[-28,22]])s=await walk(...point);
 await call('missionAim');s=await hold(2.8);assert.equal(s.complete,false);s=await call('tick',.1);assert.equal(s.progress,0);s=await hold(3.2);assert.equal(s.state,'won',JSON.stringify(s));assert.equal(s.complete,true);assert.equal(s.kills,5);assert(s.health>0);assert.deepEqual(errors,[]);
 if(process.env.GLACIER_SCREENSHOTS){await mkdir(process.env.GLACIER_SCREENSHOTS,{recursive:true});await p.screenshot({path:process.env.GLACIER_SCREENSHOTS+'/glacier-extraction-won.png'});}
 console.log('PASS GLACIER natural stalking/thin-ice sink -> native core blade defeat (1800 core damage) -> actual checkpoint retry -> four native guard kills -> walk hut -> actual extraction; initial guards elided only');await p.close();await context.close();
}finally{await browser?.close();child?.kill();}
