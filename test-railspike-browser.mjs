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
  child=spawn(process.execPath,['server.cjs'],{cwd:process.cwd(),env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('test server timeout')),15000);child.stdout.on('data',d=>{if(String(d).includes('ready')){clearTimeout(timer);resolve();}});child.on('error',reject);child.on('exit',c=>{clearTimeout(timer);reject(new Error('server exit '+c));});});base=`http://127.0.0.1:${port}/index.html`;
 }
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const errors=[];
 const native=await browser.newContext({viewport:{width:1280,height:800}}),page=await native.newPage();page.setDefaultTimeout(90000);page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR',e.stack);});
 const url=new URL(base);url.search='?map=reactor&menu=chapter';await page.goto(url.href);await page.click('#deploy');await page.waitForFunction(()=>document.body.dataset.menuOpen==='false');
 await page.keyboard.press('Digit7');await page.waitForFunction(()=>document.querySelector('[data-weapon=railspike]')?.classList.contains('active'));assert.equal(await page.locator('.loadout-card').count(),7);assert.equal(await page.locator('#ammo').textContent(),'1');await page.waitForFunction(()=>document.querySelector('.dynamic-crosshair').style.opacity==='1');
 if(process.env.RAIL_SCREENSHOT){await mkdir(path.dirname(process.env.RAIL_SCREENSHOT),{recursive:true});await page.screenshot({path:process.env.RAIL_SCREENSHOT});}
 await page.mouse.down();await page.waitForFunction(()=>Number(document.querySelector('.rail-charge-status').getAttribute('aria-valuenow'))>0);await page.waitForFunction(()=>document.querySelector('#ammo').textContent==='0');await page.waitForTimeout(800);assert.equal(await page.locator('#ammo').textContent(),'0');await page.mouse.up();await page.keyboard.press('r');await page.waitForFunction(()=>document.querySelector('#ammo').textContent==='1');await page.keyboard.press('Digit6');await page.waitForFunction(()=>document.querySelector('#ammo').textContent==='24');await page.keyboard.press('Digit7');await page.waitForFunction(()=>document.querySelector('[data-weapon=railspike]').classList.contains('active'));assert.equal(await page.locator('#ammo').textContent(),'1');await native.close();console.log('PASS: native key7/seven cards/charge HUD/one shot while held/reload/preserved key6');
 const context=await browser.newContext({viewport:{width:960,height:720}}),p=await context.newPage();p.setDefaultTimeout(90000);p.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR',e.stack);});
 await p.route('**/app.js',async route=>{const response=await route.fetch();let source=await response.text();assert(source.includes("if(state==='playing')update(dt);"));source=source.replace("if(state==='playing')update(dt);",'if(false)update(dt);');source+=`
window.__railFixture={
 setup({ammo=1,reserve=18,wall=null,wallZ=-1.5,count=4,type='assault'}={}){reset();enemies.forEach(e=>scene.remove(e.group));enemies.length=0;obstacles.length=0;state='playing';overlay.hidden=true;camera.position.set(0,1.7,0);yaw=0;pitch=0;camera.rotation.set(0,0,0);playerMotion.reset(camera.position,0);rounds[6]=ammo;reserves[6]=reserve;changeWeapon(6);handling.update(1,false);cooldown=0;this.actors=[];
 for(let i=0;i<count;i++){const group=createEnemyModel(type);group.position.set(0,0,-3-i*3);scene.add(group);const enemy={group,type,hp:1000,maxHp:1000,boss:false,speed:0,attack:9999,radius:.65,charge:0,seed:0};enemies.push(enemy);this.actors.push(enemy);}
 if(wall)this.wall(wall,wallZ);scene.updateMatrixWorld(true);hud();return this.snapshot();},
 wall(kind='solid',z=-1.5){const mesh=box(5,4,.2,0,2,z);if(kind==='thin'){mesh.userData.railThin=true;mesh.userData.railThickness=.2;}obstacles.push({x:0,z,w:5,d:.2,bottom:0,top:4,mesh});scene.updateMatrixWorld(true);},
 aimAway(){yaw=1;pitch=0;},markFirst(){for(let i=0;i<3;i++)registerHaloWeakHit(this.actors[0]);},
 tick(dt){if(state==='playing')update(dt);return this.snapshot();},snapshot(){return {selected,rounds:[...rounds],reserves:[...reserves],reload,state,hp:this.actors.map(e=>e.hp),progress:railCharge.progress,latched:railCharge.latched,weapon:gun.userData.weaponId,shots:[...telemetryShots],attempt:achievementUI.attempt.state,models:gun.children.filter(c=>c.isGroup&&c.visible).map(c=>c.name)};},
 resume(){return enterPlay();},save(){saveCheckpoint();return checkpoint();},restore(){const saved=campaign.checkpoint;reset(saved.stageIndex,saved);state='playing';overlay.hidden=true;return this.snapshot();},clear(){reset();return this.snapshot();},finish(){end(false);return this.snapshot();}
 };`;await route.fulfill({response,body:source});});
 await p.goto(url.href);await p.waitForFunction(()=>!!window.__railFixture);
 const setup=o=>p.evaluate(v=>window.__railFixture.setup(v),o),tick=dt=>p.evaluate(d=>window.__railFixture.tick(d),dt),snapshot=()=>p.evaluate(()=>window.__railFixture.snapshot());
 async function down(){await p.waitForFunction(()=>document.body.dataset.menuOpen==='false');await p.mouse.down();}
 async function fire(){await down();const s=await tick(.8);await p.mouse.up();return s;}
 let s=await setup();assert.equal(s.weapon,'railspike');assert.deepEqual(s.models,['RAILSPIKE']);await down();s=await tick(.799);assert.equal(s.rounds[6],1);assert.equal(s.shots[6],0);s=await tick(.001);assert.equal(s.rounds[6],0);assert.equal(s.shots[6],1);assert.equal(s.attempt.shots,1);assert(s.hp.slice(0,3).every(h=>h<1000),JSON.stringify(s));assert.equal(s.hp[3],1000);const firstDamage=1000-s.hp[0];assert(firstDamage===90||firstDamage===157.5,JSON.stringify(s));assert(Math.abs(1000-s.hp[1]-firstDamage*.75)<.01);assert(Math.abs(1000-s.hp[2]-firstDamage*.5625)<.01);s=await tick(2);assert.equal(s.shots[6],1);assert.equal(s.reload,0);await p.mouse.up();
 await setup();await down();await tick(.4);await p.mouse.up();s=await tick(1);assert.equal(s.shots[6],0);assert.equal(s.progress,0);assert.equal(s.rounds[6],1);
 for(const action of ['r','Digit1','Escape']){await setup();await down();await tick(.4);await p.keyboard.press(action);s=await tick(1);assert.equal(s.progress,0);assert.equal(s.shots[6],0);assert.equal(s.rounds[6],1);await p.mouse.up();if(action==='Escape'){await p.evaluate(()=>window.__railFixture.resume());s=await tick(1);assert.equal(s.shots[6],0);s=await fire();assert.equal(s.shots[6],1);}}
 await setup();await down();await tick(.4);s=await p.evaluate(()=>window.__railFixture.clear());await p.mouse.up();assert.equal(s.progress,0);assert.equal(s.rounds[6],1);
 for(const options of [{wall:'solid'},{wall:'thin'},{wall:'solid',wallZ:-4.5}]){await setup(options);s=await fire();if(options.wall==='thin'){assert(s.hp.slice(0,3).every(h=>h<1000));assert(Math.abs(1000-s.hp[0]-firstDamage*.85)<.01);}else if(options.wallZ){assert(s.hp[0]<1000);assert.deepEqual(s.hp.slice(1),[1000,1000,1000]);}else assert.deepEqual(s.hp,[1000,1000,1000,1000]);assert.equal(s.shots[6],1);}
 await setup();await down();await tick(.7);await p.evaluate(()=>window.__railFixture.aimAway());s=await tick(.1);await p.mouse.up();assert.deepEqual(s.hp,[1000,1000,1000,1000],'aim sampled on discharge, not charge start');
 await setup();await down();await tick(.7);await p.evaluate(()=>window.__railFixture.wall());s=await tick(.1);await p.mouse.up();assert.deepEqual(s.hp,[1000,1000,1000,1000],'cover sampled at discharge');
 await setup();await p.evaluate(()=>window.__railFixture.markFirst());s=await fire();assert(Math.abs(1000-s.hp[0]-firstDamage*1.2)<.01,'HALO shared multiplier');
 await setup({type:'heavy',count:1});s=await fire();assert(s.hp[0]<1000&&s.hp[0]>940,'rail retains frontal armor reduction');
 await setup({ammo:0,reserve:0});s=await fire();assert.equal(s.shots[6],0);assert.equal(s.rounds[6],0);assert.equal(s.reload,0);
 await setup({reserve:7});await fire();const cp=await p.evaluate(()=>window.__railFixture.save());assert.equal(cp.selected,0);assert.equal(cp.railspike.rounds,0);assert(cp.railspike.equipped);assert(!cp.halo.equipped&&!cp.tempest.equipped);s=await p.evaluate(()=>window.__railFixture.restore());assert.equal(s.selected,6);assert.equal(s.rounds[6],0);assert.equal(s.reserves[6],7);assert.equal(s.progress,0);assert(!s.attempt.eligible);await p.keyboard.press('r');s=await tick(1.91);assert.equal(s.rounds[6],1);assert.equal(s.reserves[6],6);
 await setup();await down();await tick(.4);s=await p.evaluate(()=>window.__railFixture.finish());await p.mouse.up();assert.equal(s.progress,0);s=await tick(1);assert.equal(s.shots[6],0);
 assert.deepEqual(errors,[]);console.log('PASS: actual app 799/800ms discharge, one held shot, three unique targets/attenuation, wall/thin/armor/HALO, current aim and LOS, release/R/switch/pause/reset/death cancellation, empty ammo, checkpoint and strict knife eligibility');await context.close();
}finally{await browser?.close();child?.kill();}
