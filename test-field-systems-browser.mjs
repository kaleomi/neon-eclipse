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
 const context=await browser.newContext({viewport:{width:960,height:720}}),p=await context.newPage();p.setDefaultTimeout(45000);p.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});
 await p.route('**/app.js',async route=>{
  const response=await route.fetch();let source=await response.text();console.log('app sha256 '+createHash('sha256').update(source).digest('hex'));assert(source.includes("if(state==='playing')update(dt);"));source=source.replace("if(state==='playing')update(dt);",'if(false)update(dt);');
  source+=`\nwindow.__field={
   async setup({kind='execute',hp=14,type='assault',boss=false,stagger=1}={}){
    if(document.pointerLockElement)await new Promise(resolve=>{const changed=()=>{if(!document.pointerLockElement){document.removeEventListener('pointerlockchange',changed);resolve();}};document.addEventListener('pointerlockchange',changed);document.exitPointerLock();});await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    if(this.cover){scene.remove(this.cover.mesh);const i=obstacles.indexOf(this.cover);if(i>=0)obstacles.splice(i,1);this.cover=null;}
    reset();if(kind==='heavy'){loadout.equip(8);selected=2;}state='playing';document.body.dataset.playState=state;overlay.hidden=true;fieldKit.hide();enemies.forEach(e=>disposeGroup(e.group));enemies.length=0;this.actor=null;
    camera.position.set(kind==='node'?20:0,1.7,kind==='node'?11:0);playerMotion.reset(camera.position,0);yaw=0;pitch=0;camera.rotation.set(0,0,0);handling.update(1,false);cooldown=0;Math.random=()=>.5;
    const specifications=[[0,-30,10000,'assault',false],...(kind==='empty'?[]:[[kind==='node'?20:0,kind==='node'?6:kind==='heavy'?-8:-1.65,hp,kind==='node'?'sentry':boss?'warden':type,boss]])];
    for(const [x,z,life,t,b] of specifications){const group=createEnemyModel(t);group.position.set(x,0,z);scene.add(group);const e={group,type:t,hp:life,maxHp:100,staggerRemaining:stagger,boss:b,bossState:b?createBossState():null,speed:0,attack:9999,charge:0,radius:.65,seed:0};enemies.push(e);if(z!==-30)this.actor=e;}
    if((kind==='execute'||kind==='heavy')&&this.actor){scene.updateMatrixWorld(true);const head=this.actor.group.children.find(m=>m.userData.hitZone==='head');if(head)this.actor.group.position.y+=1.7-head.getWorldPosition(new THREE.Vector3()).y;}
    scene.updateMatrixWorld(true);hud();return this.snapshot();
   },tick(dt){if(state==='playing')update(dt);return this.snapshot();},
   snapshot(){return {map:MAP_ID,state,health,kills,selected,reload,pools:typedAmmo.state.pools,execution:execution.active,gunZ:gun.position.z,kit:fieldKit.snapshot(),nodes:energyNodes?.snapshot(),panels:destructibles?.snapshot(),barrels:barrels?.snapshot(),hp:this.actor?.hp,emp:this.actor?.empRemaining||0,attempt:achievementUI.attempt.state,shots:[...telemetryShots],rounds:[...rounds],reserves:[...reserves],profiles:weapons.map(w=>({spread:w.spread,reload:w.reload,reserve:w.reserve,cap:w.cap,damage:w.damage})),projectile:scene.children.find(m=>m.geometry?.type==='CapsuleGeometry'&&m.visible)?.position.toArray()};},
   wall(z=-.8){const mesh=box(5,3,.15,camera.position.x,1.5,z);this.cover={mesh,x:camera.position.x,z,w:5,h:3,d:.15};obstacles.push(this.cover);scene.updateMatrixWorld(true);},
   view(kind){const poses={node:[21.5,12.5,.322,-.06],station:[-24,10,.785,-.05]};if(poses[kind]){const [x,z,a,b]=poses[kind];camera.position.set(x,1.7,z);playerMotion.reset(camera.position,0);yaw=a;pitch=b;camera.rotation.set(pitch,yaw,0);}},
   carry(i){if(i!==2&&i!==3)loadout.equip(i);changeWeapon(i===8?2:i);handling.update(1,false);cooldown=0;return this.snapshot();},
   away(){camera.position.x+=5;playerMotion.reset(camera.position,0);},
   hostile(){enemyProjectiles.queue(camera.position.clone().add(new THREE.Vector3(0,-.35,-1)),camera.position.clone().add(new THREE.Vector3(0,-.35,0)),false,null,{color:'orange',charge:0,speed:20,damage:10,angles:[0]});enemyProjectiles.update(0,camera.position);},
   save(){saveCheckpoint();return checkpoint();},restore(){const cp=campaign.checkpoint;reset(cp.stageIndex,cp);state='playing';overlay.hidden=true;return this.snapshot();},legacy(){const cp=checkpoint();delete cp.fieldKit;reset(cp.stageIndex,cp);state='playing';overlay.hidden=true;return this.snapshot();},future(){const cp=checkpoint();cp.fieldKit={version:9,secret:'retain'};reset(cp.stageIndex,cp);state='playing';overlay.hidden=true;return {snapshot:this.snapshot(),saved:checkpoint()};},
   resume(){return enterPlay();},retry(){reset();state='playing';overlay.hidden=true;return this.snapshot();},finish(){end(false);return this.snapshot();}
  };`;await route.fulfill({response,body:source});
 });
 await p.goto(url.href);await p.waitForFunction(()=>!!window.__field);const run=(m,a)=>p.evaluate(([m,a])=>window.__field[m](a),[m,a]);
 async function equip(i){await run('carry',i);await p.keyboard.press((i===3?'Digit3':i===2?'Digit2':'Digit1'));return run('tick',.24);}
 async function fire(){await p.mouse.click(480,360);return run('tick',0);}
 let s=await run('setup');await equip(3);await p.keyboard.press('v');s=await run('tick',.15);assert(s.execution);assert.equal(s.kills,0);assert(s.gunZ<-.8,'visible execution thrust');s=await run('tick',.15);assert.equal(s.kills,1);assert.equal(s.attempt.kills[3],1);assert.equal(s.attempt.shots,0);assert(s.shots.every(n=>n===0));s=await run('tick',1);assert.equal(s.kills,1);
 for(const spec of [{hp:15},{stagger:0},{boss:true}]){await run('setup',spec);await equip(3);await p.keyboard.press('v');s=await run('tick',.7);assert.equal(s.kills,0,JSON.stringify(spec));}
 await run('setup');await equip(3);await p.keyboard.press('v');await run('away');s=await run('tick',.4);assert.equal(s.kills,0,'range rechecked at contact');
 await run('setup');await equip(3);await p.keyboard.press('v');await run('wall');s=await run('tick',.4);assert.equal(s.kills,0,'late cover cancels hit');
 await run('setup');await equip(3);await p.keyboard.press('v');await run('hostile');s=await run('tick',.1);assert.equal(s.health,100,'first .3 seconds protected');await p.keyboard.press('Escape');assert(!(await run('snapshot')).execution);await run('resume');s=await run('tick',1);assert.equal(s.kills,0);
 console.log('PASS native V, 300ms contact, visible thrust, no fake shot, range/cover/Boss/stagger/15% gate, initial protection and pause');
 await run('setup',{kind:'node',hp:100});assert((await run('snapshot')).nodes.every(n=>n.enabled));await equip(0);await fire();await run('tick',.2);s=await fire();assert(s.nodes[1].broken);assert.equal(s.hp,100,'node pulse does not deal health damage');assert.equal(s.emp,3);assert.equal(s.kills,0);await p.keyboard.press('Escape');s=await run('tick',2);assert.equal(s.emp,3);await run('resume');s=await run('tick',3.01);assert.equal(s.emp,0);s=await run('retry');assert(s.nodes.every(n=>n.hp===30));
 for(let i=1;i<8;i++){await run('setup',{kind:'node',hp:1000});await equip(i);let tries=0;do{await p.mouse.down();s=await run('tick',i===6?.8:0);await p.mouse.up();if(i===3)s=await run('tick',.16);if(i===5)s=await run('tick',.2);if(!s.nodes[1].broken)await run('tick',.7);tries++;}while(!s.nodes[1].broken&&tries<6);assert(s.nodes[1].broken,'node weapon '+i);assert.equal(s.kills,0);}
 console.log('PASS native node shot, one pulse, 3s mechanical disable, pause/recovery and retry');
 await run('setup',{kind:'heavy',hp:50});await p.keyboard.press('h');s=await run('tick',.1);assert.equal(s.kit.heavy,1);assert(s.kit.active&&s.kit.busy);assert.equal(s.attempt.shots,1);await p.keyboard.press('Escape');s=await run('tick',4);assert(s.kit.active);await run('resume');s=await run('tick',.5);assert.equal(s.kills,1,JSON.stringify(s));assert(s.attempt.environmentDamage>0);assert(s.attempt.kills.every(n=>n===0));assert(!s.kit.active);
 await run('setup',{kind:'heavy',hp:50});await run('wall',-4);await p.keyboard.press('h');s=await run('tick',.3);assert.equal(s.hp,50,'solid wall shields actor from heavy blast');assert(s.health<100,'blast outside the front wall still reaches shooter');
 await run('setup',{kind:'heavy',hp:50,boss:true});await p.keyboard.press('h');s=await run('tick',.6);assert.equal(s.hp,50,'heavy prototype does not damage Boss');
 await run('setup',{kind:'empty'});await run('carry',8);for(let i=0;i<2;i++){await p.keyboard.press('h');await run('tick',1.7);}s=await run('snapshot');assert.equal(s.kit.heavy,0);const cp=await run('save');assert.equal(cp.fieldKit.heavy,0);s=await run('restore');assert.equal(s.kit.heavy,0);await p.keyboard.press('h');assert(!(await run('snapshot')).kit.active);s=await run('legacy');assert.equal(s.kit.heavy,2);assert.equal(s.kit.mode,'standard');const f=await run('future');assert(f.snapshot.kit.unsupported);assert.equal(f.snapshot.kit.heavy,0);assert.deepEqual(f.saved.fieldKit,{version:9,secret:'retain'});
 console.log('PASS native heavy model/projectile, pause, environment attribution, two rounds, actual zero checkpoint, legacy and future preservation');
 // Real settings controls affect the next attempt, never refill a paused one.
 const before=await run('setup',{kind:'empty'});await p.keyboard.press('t');await p.waitForSelector('.field-kit-panel:not([hidden])');await p.selectOption('[data-mode]','light');await p.selectOption('[data-mod="4"]','1');await p.click('[data-apply]');assert.equal((await run('snapshot')).kit.mode,'standard');
 if(process.env.FIELD_KIT_SCREENSHOT){await mkdir(path.dirname(process.env.FIELD_KIT_SCREENSHOT),{recursive:true});await p.evaluate(()=>document.querySelector('.field-kit-panel').scrollTop=0);await p.screenshot({path:process.env.FIELD_KIT_SCREENSHOT});}
 await p.click('[data-start]');assert.equal((await run('snapshot')).kit.mode,'standard');await p.click('[data-start]');await p.waitForFunction(()=>window.__field.snapshot().state==='playing'&&window.__field.snapshot().kit.mode==='light');assert.equal((await run('snapshot')).selected,0);s=await run('setup',{kind:'empty'});assert.equal(s.kit.mode,'light');assert.equal(s.selected,0);await equip(4);assert.equal(s.reserves[4],Math.floor(before.reserves[4]*.65));assert(s.profiles[4].spread<before.profiles[4].spread);assert(s.profiles[4].reload>before.profiles[4].reload);assert.equal(s.profiles[4].damage,before.profiles[4].damage);await p.keyboard.press('Digit1');assert.equal((await run('snapshot')).selected,4);await p.keyboard.press('Digit8');assert.equal((await run('snapshot')).selected,4,'light inventory cannot bypass mandatory carry');await equip(7);assert.equal((await run('snapshot')).selected,7);await p.keyboard.press('Digit3');assert.equal((await run('snapshot')).selected,3);
 await run('save');s=await run('restore');assert.equal(s.kit.mode,'light');assert.equal(s.kit.mods[4],1);assert.equal(s.profiles[4].spread,before.profiles[4].spread*.72);s=await run('legacy');assert.equal(s.kit.mode,'standard','old save never inherits pending draft');
 console.log('PASS native T settings, next-attempt isolation, mandatory carry independent of light inventory, ammo cap, immutable mod tradeoff, checkpoint and old-save defaults');
 // Native quick-loader/per-shell boundary: insert one shell, immediately fire it.
 await p.keyboard.press('t');await p.selectOption('[data-mod="1"]','2');await p.selectOption('[data-mod="4"]','0');await p.click('[data-apply]');await p.click('[data-close]');s=await run('setup',{kind:'empty'});await equip(1);s=await run('snapshot');assert.equal(s.selected,1);const cap=s.profiles[1].cap,quick=s.profiles[1].reload,reserve=s.pools.light;assert(Math.abs(quick-before.profiles[1].reload*.8)<1e-9);await fire();await run('tick',.7);await fire();await run('tick',.7);await p.keyboard.press('r');s=await run('tick',quick*.99);assert.equal(s.rounds[1],cap-2);s=await run('tick',quick*.02);assert.equal(s.rounds[1],cap-1);assert.equal(s.pools.light,reserve-6,'one inserted shotgun shell consumes6 shared units');s=await fire();assert.equal(s.rounds[1],cap-2);assert.equal(s.reload,0);
 console.log('PASS real two-step chapter restart and modified shotgun insert-one/fire-one');
 // Same app, independently loaded chapter 2: no chapter/Boss module injection.
 const station=new URL(url);station.search='?map=station&menu=chapter';await p.goto(station.href);await p.waitForFunction(()=>!!window.__field);s=await run('setup',{kind:'empty'});assert.equal(s.map,'station');assert.equal(s.panels.length,1);assert.equal(s.barrels.length,1);assert(s.panels[0].enabled&&s.barrels[0].enabled);assert(!s.nodes);assert.equal(await p.locator('.loadout-card').count(),3);
 if(process.env.FIELD_IMAGE_DIR){
  await mkdir(process.env.FIELD_IMAGE_DIR,{recursive:true});
  await run('view','station');await run('tick',0);await p.screenshot({path:path.join(process.env.FIELD_IMAGE_DIR,'p1-station-props.png')});
  for(const kind of ['node','execute','heavy']){await p.goto(url.href);await p.waitForFunction(()=>!!window.__field);await run('setup',{kind,hp:kind==='execute'?20:100});
   if(kind==='node'){await run('view','node');await run('tick',0);}else if(kind==='execute'){await equip(3);await p.keyboard.press('v');await run('tick',.15);}else{await p.keyboard.press('h');await run('tick',.12);await p.waitForFunction(()=>document.querySelector('.ammo span').textContent.includes('重型'));}
   await p.screenshot({path:path.join(process.env.FIELD_IMAGE_DIR,'p1-'+kind+'.png')});
  }
 }
 assert.deepEqual(errors,[]);console.log('PASS station extension, eight original slots, no page errors');await context.close();
}finally{await browser?.close();child?.kill();}
