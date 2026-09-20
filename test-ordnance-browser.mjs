// Native input, isolated storage. Deterministic actor/clock fixtures exist only in test responses.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
let child=null,browser=null;
try{
 let base=process.env.GAME_TEST_URL;
 if(!base){
  const port=await new Promise((resolve,reject)=>{const s=createServer();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
  child=spawn(process.execPath,['server.cjs'],{cwd:process.cwd(),env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('test server timeout')),15000);child.stdout.on('data',d=>{if(String(d).includes('ready')){clearTimeout(timer);resolve();}});child.on('error',reject);child.on('exit',c=>{clearTimeout(timer);reject(new Error('server exit '+c));});});
  base=`http://127.0.0.1:${port}/index.html`;
 }
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const errors=[],url=new URL(base);url.search='?map=reactor&menu=chapter';
 const native=await browser.newContext({viewport:{width:960,height:720}}),n=await native.newPage();n.setDefaultTimeout(45000);n.on('pageerror',e=>errors.push(e.message));
 await n.goto(url.href);await n.click('#deploy');await n.waitForFunction(()=>document.body.dataset.menuOpen==='false');await n.keyboard.press('Digit3');
 await n.waitForFunction(()=>document.querySelector('#ammo').textContent==='∞'&&!document.querySelector('.parry-status').hidden);
 assert.equal(await n.locator('.loadout-card').count(),3);assert.match(await n.locator('.parry-status').textContent(),/右键弹反/);
 await n.keyboard.press('Digit1');await n.waitForFunction(()=>document.querySelector('.parry-status').hidden);
  await n.waitForFunction(()=>document.body.dataset.playState==='playing'&&document.querySelector('.dynamic-crosshair').style.opacity==='1'); // Let the real weapon switch finish before pausing.
  // Native integration: the two equipment dialogs must never overlap; Escape works on selects.
  await n.keyboard.press('t');await n.locator('.field-kit-panel').waitFor({state:'visible'});await n.click('[data-apply]');await n.keyboard.press('u');await n.locator('.carry-panel').waitFor({state:'visible'});assert(await n.locator('.field-kit-panel').isHidden());
  await n.click('[data-equip]');await n.keyboard.press('t');await n.locator('.field-kit-panel').waitFor({state:'visible'});assert(await n.locator('.carry-panel').isHidden());await n.focus('[data-mod="0"]');await n.keyboard.press('Escape');assert(await n.locator('.field-kit-panel').isHidden());assert.equal(await n.evaluate(()=>document.body.dataset.playState),'paused');
  await n.keyboard.press('u');await n.locator('.carry-panel').waitFor({state:'visible'});await n.selectOption('[data-primary]','8');await n.click('[data-equip]');await n.keyboard.press('Escape');await n.click('#deploy');await n.waitForFunction(()=>document.body.dataset.playState==='playing');await n.waitForFunction(()=>document.body.dataset.playState==='playing'&&document.querySelector('.dynamic-crosshair').style.opacity==='1');await n.keyboard.press('h');try{await n.waitForFunction(()=>document.querySelector('.field-kit-status').textContent.includes('H 重炮 1/2'));}catch(error){console.error('NATIVE_HEAVY_DIAGNOSTIC',await n.evaluate(()=>({state:document.body.dataset.playState,focus:document.hasFocus(),active:document.activeElement?.outerHTML,status:document.querySelector('.field-kit-status')?.textContent,carry:document.querySelector('.carry-badge')?.textContent,crosshair:document.querySelector('.dynamic-crosshair')?.style.opacity})));throw error;}
  console.log('PASS native U/T mutual exclusion, select-focus Escape, U-equipped H firing');await native.close();
 console.log('PASS: uninstrumented reactor boots, eight inventory cards, blade hint and firearm hide');

 const context=await browser.newContext({viewport:{width:1280,height:800}}),p=await context.newPage();p.setDefaultTimeout(45000);p.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});
 await p.route('**/*-world.js',async route=>{const response=await route.fetch();let source=await response.text();if(source.includes('const breaker=createBossChargeInterrupt(')){source=source.replace('clear();return {interruptCharge,','window.__bossRules=rules;clear();return {interruptCharge,');}await route.fulfill({response,body:source});});
 await p.route('**/app.js',async route=>{
  const response=await route.fetch();let source=await response.text();console.log('app sha256 '+createHash('sha256').update(source).digest('hex'));assert(source.includes("if(state==='playing')update(dt);"));source="import {launchCinder,advanceCinder} from './cinder-world.js';\n"+source.replace("if(state==='playing')update(dt);",'if(false)update(dt);');
  source+=`\nwindow.__ord={
   wipe(){engineerDirector.clear();enemyDirector.clear?.();enemyProjectiles.clear();for(const e of enemies)disposeGroup(e.group);enemies.length=0;},
   async fresh(stage=1){reset(0);mission.reset(stage);this.wipe();const e=STAGE_ENTRIES[stage];camera.position.set(e.x,(e.feetY||0)+1.7,e.z);playerMotion.reset(camera.position,e.feetY||0);await enterPlay();scene.updateMatrixWorld(true);return this.snap();},
   arena(){this.wipe();obstacles.length=0;camera.position.set(0,1.7,20);playerMotion.reset(camera.position,0);yaw=0;pitch=0;camera.rotation.set(0,0,0);cooldown=0;handling.reset();return this.snap();},
   bot({x=0,z=12,hp=800,type='heavy'}={}){const group=createEnemyModel(type);group.position.set(x,0,z);scene.add(group);const e={group,type,hp,maxHp:hp,boss:false,speed:0,radius:.65,attack:9999,charge:0,seed:0};enemies.push(e);scene.updateMatrixWorld(true);return this.snap();},
   wall(z=18){const mesh=new THREE.Mesh(new THREE.BoxGeometry(8,5,.03),new THREE.MeshBasicMaterial({color:0x366578}));mesh.position.set(0,2,z);scene.add(mesh);mesh.updateMatrixWorld(true);obstacles.push({mesh,x:0,z,w:8,d:.03,h:5});return this.snap();},
   cinderTarget(){const s=launchCinder(camera.position,camera.getWorldDirection(new THREE.Vector3()));advanceCinder(s,1.2,obstacles);return this.bot({z:s.position.z,hp:800});},
   nearFlight(){const f=ordnance.snapshot().flight;camera.position.set(f.position[0],1.7,f.position[2]);playerMotion.reset(camera.position,0);},
   aim(){pitch=-Math.atan(.6/8);yaw=0;camera.rotation.set(pitch,yaw,0);return this.snap();},
   tick(dt){if(state==='playing')update(dt);scene.updateMatrixWorld(true);return this.snap();},
   async resume(){await enterPlay();return this.snap();},
   restore(cp){reset(cp.stageIndex,cp);this.wipe();return this.snap();},
   entry(stage=1){const e=STAGE_ENTRIES[stage];camera.position.set(e.x,(e.feetY||0)+1.7,e.z);playerMotion.reset(camera.position,e.feetY||0);return this.snap();},
   hstep(dt){if(state==='playing')ordnance.step(dt);scene.updateMatrixWorld(true);return this.snap();},
   boss(){this.wipe();overseer?.setStage(3);const r=window.__bossRules;if(r){if(r.activate){r.reset();r.activate();}else r.reset(true);}else{this.bot({type:'warden',z:12,hp:2000});const e=enemies[0];e.boss=true;e.bossState=createBossState();}return this.bossWarning(false);},
   bossWarning(next=false){const r=window.__bossRules;if(r){if(next){if(r.arena)r.arena.index++;else r.state.tier++;}const a=r.blast||r.beam||(typeof r.attack==='object'?r.attack:r.state),key=r.blast||r.beam||typeof r.attack==='object'?'mode':'shell'in r.state?'shell':'attack';a[key]='warning';if('target'in a)a.target={x:0,z:0};if('targetZ'in a)a.targetZ=0;if('bands'in a)a.bands=[0];overseer.update(0,camera.position,0,true);scene.updateMatrixWorld(true);const object=overseer.targets.find(o=>o.userData.overseer==='core')||overseer.targets[0],point=object.getWorldPosition(new THREE.Vector3());camera.position.copy(point).add(new THREE.Vector3(0,0,3));this.bossProbe=()=>({mode:a[key],hp:r.state.hp,phase:r.arena?.index??r.state.tier});}else{const e=enemies[0];if(next)e.bossState.phase++;enemyProjectiles.cancelOwner(e.group,true);camera.position.set(0,1.2,15);enemyProjectiles.queue(e.group.position.clone().add(new THREE.Vector3(0,1.5,0)),camera.position.clone(),true,e.group,{charge:4,angles:[0],speed:10});this.bossProbe=()=>({mode:enemyProjectiles.hasPending(e.group)?'warning':'rest',hp:e.hp,phase:e.bossState.phase});}obstacles.length=0;yaw=0;pitch=0;camera.rotation.set(0,0,0);handling.reset();toastTime=0;return this.bossProbe();},
   die(){end(false);return this.snap();},
   snap(){return {state,map:MAP_ID,primary:loadout.state.primary,melee:loadout.state.melee,selected,health,ammo:rounds.slice(),reserves:reserves.slice(),heavy:ordnance.snapshot(),enemies:enemies.map(e=>({hp:e.hp,z:e.group.position.z,type:e.type})),cp:checkpoint(),attempt:achievementUI.attempt.state,ads:handling.state.ads};}
  };`;await route.fulfill({response,body:source});
 });
 const run=(m,a)=>p.evaluate(([m,a])=>window.__ord[m](a),[m,a]);
 async function open(map='reactor'){const u=new URL(url);u.search='?map='+map+'&menu=chapter';await p.goto(u.href);await p.waitForFunction(()=>!!window.__ord);}
 async function pickup(stage){await run('fresh',stage);await p.keyboard.press('f');let s=await run('snap');assert.equal(s.primary,stage===3?0:stage+8,JSON.stringify(s));assert.equal(s.selected,stage===3?3:2);if(stage===3)assert.equal(s.melee,11);await run('tick',.5);return s;}
 await open();await pickup(1);await run('arena');await run('wall');let before=await run('snap');await p.keyboard.press('h');let s=await run('snap');assert.equal(s.heavy.rounds[0],0);assert.equal(s.attempt.shots,1);assert.deepEqual(s.ammo,before.ammo);s=await run('tick',.3);assert(s.heavy.flight.bounces>0,JSON.stringify(s));const remaining=s.heavy.flight.remaining;
 await p.keyboard.press('Escape');s=await run('tick',2);assert.equal(s.heavy.flight.remaining,remaining);await run('resume');
 if(process.env.ORDNANCE_SCREENSHOT){await mkdir(path.dirname(process.env.ORDNANCE_SCREENSHOT),{recursive:true});await p.screenshot({path:process.env.ORDNANCE_SCREENSHOT});}
 s=await run('tick',.89);assert(s.heavy.flight);await run('nearFlight');s=await run('tick',.02);assert.equal(s.heavy.flight,null);assert(s.health<100,'close bounced blast can hurt player');
 await open();await pickup(1);await run('arena');await run('cinderTarget');await p.keyboard.press('h');await run('tick',.25);if(process.env.ORDNANCE_SCREENSHOT)await p.screenshot({path:process.env.ORDNANCE_SCREENSHOT});s=await run('tick',1.21);assert(s.enemies[0].hp<800,JSON.stringify(s));assert.equal(s.attempt.shots,1);const cp=s.cp;cp.ordnance.rounds=[0,0,0];cp.ordnance.reserve=[0,0,0];cp.typedAmmo.pools.grenade=0;s=await run('restore',cp);assert.deepEqual(s.heavy.rounds,[0,0,0]);assert.equal(s.attempt.eligible,false);await run('entry',1);await run('resume');await p.keyboard.press('f');s=await run('snap');assert.deepEqual(s.heavy.reserve,[0,0,0]);assert.equal(s.heavy.owned.length,1);
 console.log('PASS native CINDER pickup/exclusive primary, thin-wall bounce/full fuse/pause/self-damage/enemy blast, no legacy ammo change, firearm eligibility, zero checkpoint/no cache farming');
 await open();await pickup(2);await run('arena');await run('bot',{z:12});await run('bot',{z:8});await run('bot',{z:4});await run('aim');await p.keyboard.press('h');s=await run('snap');assert.equal(s.heavy.rounds[1],2);assert.equal(s.attempt.shots,0);
 await p.mouse.down({button:'right'});await run('tick',.6);await p.keyboard.press('h');s=await run('snap');assert.equal(s.heavy.rounds[1],1,JSON.stringify(s));assert.equal(s.enemies[0].hp,560);assert.equal(s.enemies[1].hp,632);assert.equal(s.enemies[2].hp,800);await run('tick',.7);await p.keyboard.press('h');s=await run('snap');assert.equal(s.heavy.rounds[1],0);await p.mouse.up({button:'right'});await run('tick',.7);await p.keyboard.press('h');s=await run('tick',2.19);assert.equal(s.heavy.rounds[1],0);s=await run('tick',.02);assert.equal(s.heavy.rounds[1],2);assert.equal(s.cp.typedAmmo.pools.energy,138,'two LANCE rounds cost12 from initial90+cache60');assert.equal(s.heavy.reserve[1],10,'legacy mirror capped, authoritative pool retains remaining units');await p.mouse.up({button:'right'});
 await open();await pickup(2);await run('arena');await run('bot');await run('wall',16);await run('aim');await p.mouse.down({button:'right'});await run('tick',.6);await p.keyboard.press('h');s=await run('snap');assert.equal(s.enemies[0].hp,800,'LANCE cannot penetrate solid walls');await p.mouse.up({button:'right'});
 await open();await pickup(2);await run('arena');await run('bot',{type:'shield'});await run('aim');await p.mouse.down({button:'right'});await run('tick',.6);await p.keyboard.press('h');s=await run('snap');assert.equal(s.enemies[0].hp,560,'LANCE penetrates the front energy shield');await p.mouse.up({button:'right'});
 console.log('PASS native LANCE ADS gate, two-round magazine, finite timed reload, armor penetration/two-target cap/solid cover');
 await open();await pickup(3);await run('arena');await run('bot',{z:18});await run('bot',{x:1,z:18.2});await run('bot',{z:12});await run('aim');await p.keyboard.down('h');s=await run('tick',.89);assert.equal(s.heavy.rounds[2],0);assert.equal(s.enemies[0].hp,800);await p.keyboard.up('h');s=await run('tick',.1);assert(!s.heavy.charging);assert.equal(s.heavy.rounds[2],0);
 await p.keyboard.down('h');s=await run('tick',.89);assert(s.heavy.charging);s=await run('tick',.011);await p.keyboard.up('h');assert.equal(s.heavy.rounds[2],0);assert(s.enemies[0].hp<800);assert(s.enemies[0].z<17.5,'hammer pushes only through clear space');assert(s.enemies[1].hp<800,'area melee catches second close target');assert.equal(s.enemies[2].hp,800,'distant target cannot be hit');assert.equal(s.attempt.shots,0);assert(s.attempt.bladeDisqualified);await run('hstep',1.2);await run('arena');await run('bot',{z:18});await p.mouse.down();await run('tick',.01);s=await run('tick',.9);await p.mouse.up();assert(s.enemies[0].hp<800,'native left mouse also swings hammer');assert.equal(s.attempt.shots,0);
 await run('hstep',1.2);await run('arena');await run('bot',{type:'sentry',z:18});await run('aim');await p.keyboard.down('h');s=await run('tick',.901);await p.keyboard.up('h');assert.equal(s.enemies[0].z,18,'anchored sentry and its collider must not be displaced');assert(s.enemies[0].hp<800);
 await run('hstep',1.2);await run('entry',3);for(const melee of ['3','11']){await p.keyboard.press('u');await p.locator('.carry-panel').waitFor({state:'visible'});await p.selectOption('[data-melee]',melee);await p.click('[data-equip]');await p.keyboard.press('Escape');await p.click('#deploy');s=await run('snap');assert.equal(s.melee,+melee);assert.equal(s.primary,0);assert.equal(s.attempt.shots,0);}s=await run('die');assert(!s.heavy.charging&&!s.heavy.flight);assert.equal(s.attempt.alive,false);
 console.log('PASS native BREAKER hold/full .9s charge/release cancellation, melee-slot/zero firearm shots, area/range/knockback, strict blade disqualification and death cleanup');
 for(const map of ['station','roof','tower','train','harbor','orbital','datacenter','polar']){await open(map);s=await pickup(1);assert.equal(s.map,map);assert.equal(s.heavy.rounds[0],1);assert.equal(s.heavy.reserve[0],7);console.log('PASS original chapter cache F pickup: '+map);}

 for(const map of ['reactor','station','roof','tower','train','harbor','orbital','datacenter','polar']){
  await open(map);await pickup(3);let b=await run('boss');assert.equal(b.mode,'warning');
  await p.keyboard.down('h');await run('hstep',.5);
  if(map==='roof'&&process.env.ORDNANCE_SCREENSHOT)await p.screenshot({path:process.env.ORDNANCE_SCREENSHOT.replace('.png','-breaker.png')});
  await run('hstep',.401);await p.keyboard.up('h');b=await run('bossProbe');assert.equal(b.mode,'rest',map+' first interrupt '+JSON.stringify(await run('snap')));
  for(const next of [false,true]){await run('hstep',1.2);await run('bossWarning',next);await p.keyboard.down('h');await run('hstep',.901);await p.keyboard.up('h');b=await run('bossProbe');assert.equal(b.mode,next?'rest':'warning',map+' phase budget '+next);}
  console.log('PASS native BREAKER / actual Boss adapter / one warning per phase: '+map);
 }
 assert.deepEqual(errors,[]);await context.close();console.log('PASS ordnance browser, zero page errors');
}finally{await browser?.close();child?.kill();}
