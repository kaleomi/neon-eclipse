import {equipAtTerminal} from './browser-loadout-driver.mjs';
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
 const native=await browser.newContext({viewport:{width:1280,height:800}}),page=await native.newPage();page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
 const url=new URL(base);url.search='?map=reactor&menu=chapter';await page.goto(url.href);await page.click('#deploy');await page.waitForFunction(()=>document.body.dataset.menuOpen==='false');
 await equipAtTerminal(page,5);await page.keyboard.press('Digit6');await page.waitForFunction(()=>document.querySelector('#ammo').textContent==='24');assert.equal(await page.locator('.loadout-card').count(),8);assert(await page.locator('[data-weapon=halo]').evaluate(e=>e.classList.contains('active')));
 await page.waitForFunction(()=>document.querySelector('.dynamic-crosshair').style.opacity==='1');await page.mouse.down();await page.waitForFunction(()=>document.querySelector('#ammo').textContent==='21');await page.waitForTimeout(700);assert.equal(await page.locator('#ammo').textContent(),'21');await page.mouse.up();
 await page.keyboard.press('r');await page.waitForFunction(()=>document.querySelector('#ammo').textContent==='24');
 if(process.env.HALO_SCREENSHOT){await mkdir(path.dirname(process.env.HALO_SCREENSHOT),{recursive:true});await page.screenshot({path:process.env.HALO_SCREENSHOT});}
 await native.close();console.log('PASS: unmodified page, native key6, eight cards, exactly three shots while held, native reload');
 const context=await browser.newContext({viewport:{width:960,height:720}}),p=await context.newPage();p.setDefaultTimeout(60000);p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/app.js',async route=>{const response=await route.fetch();let source=await response.text();assert(source.includes("if(state==='playing')update(dt);"));source=source.replace("if(state==='playing')update(dt);",'if(false)update(dt);');source+=`
window.__haloFixture={
 carryRifle(){loadout.equip(0);},
 setup({ammo=24,reserve=120,wall=false,type='assault'}={}){reset();enemies.forEach(e=>scene.remove(e.group));enemies.length=0;obstacles.length=0;state='playing';overlay.hidden=true;camera.position.set(0,1.7,0);yaw=0;pitch=0;camera.rotation.set(0,0,0);playerMotion.reset(camera.position,0);rounds[5]=ammo;reserves[5]=reserve;loadout.equip(5);changeWeapon(5);handling.update(1,false);cooldown=0;
 const group=createEnemyModel(type);group.position.set(0,0,-3);scene.add(group);this.enemy={group,type,hp:1000,maxHp:1000,boss:false,speed:0,attack:9999,radius:.65,charge:0,seed:0};enemies.push(this.enemy);if(wall)this.wall();scene.updateMatrixWorld(true);this.aim('head');hud();return this.snapshot();},
 wall(){const mesh=box(5,4,.2,0,2,-1);obstacles.push({x:0,z:-1,w:5,d:.2,bottom:0,top:4,mesh});scene.updateMatrixWorld(true);},
 aim(zone){scene.updateMatrixWorld(true);const mesh=this.enemy.group.children.find(m=>m.userData.hitZone===zone);if(!mesh)throw new Error('missing zone '+zone);camera.lookAt(mesh.getWorldPosition(new THREE.Vector3()));yaw=camera.rotation.y;pitch=camera.rotation.x;camera.updateMatrixWorld(true);},
 tick(dt){if(state==='playing')update(dt);return this.snapshot();},snapshot(){return {selected,rounds:[...rounds],reserves:[...reserves],reload,state,hp:this.enemy?.hp,mark:this.enemy?.haloMark?{...this.enemy.haloMark}:null,pending:haloBurst.remaining,weapon:gun.userData.weaponId,shots:[...telemetryShots],attempt:achievementUI.attempt.state,models:gun.children.filter(c=>c.isGroup&&c.visible).map(c=>c.name)};},
 finish(){end(false);return this.snapshot();},resume(){return enterPlay();},save(){saveCheckpoint();return checkpoint();},restore(){const saved=campaign.checkpoint;reset(saved.stageIndex,saved);state='playing';overlay.hidden=true;return this.snapshot();},clear(){reset();return this.snapshot();}
 };`;await route.fulfill({response,body:source});});
 await p.goto(url.href);await p.waitForFunction(()=>!!window.__haloFixture);
 const setup=o=>p.evaluate(v=>window.__haloFixture.setup(v),o),tick=dt=>p.evaluate(d=>window.__haloFixture.tick(d),dt),snapshot=()=>p.evaluate(()=>window.__haloFixture.snapshot()),aim=z=>p.evaluate(z=>window.__haloFixture.aim(z),z);
 async function click(){await p.waitForFunction(()=>document.body.dataset.menuOpen==='false');await p.mouse.click(480,360);return tick(0);}
 let s=await setup();assert.equal(s.weapon,'halo');assert.deepEqual(s.models,['HALO']);s=await click();assert.equal(s.shots[5],1);assert.equal(s.pending,2);s=await tick(.09);assert.equal(s.shots[5],2);s=await tick(.09);assert.equal(s.shots[5],3);assert.equal(s.rounds[5],21);assert.equal(s.pending,0);assert.equal(s.mark?.stacks,3);assert(Math.abs(s.hp-856)<.01,JSON.stringify(s));assert.equal(s.attempt.shots,3);await tick(.4);s=await click();assert(Math.abs(s.hp-798.4)<.01,'fourth hit receives +20%');
 // Released click still finishes; pause does not spend ammo or age stacks.
 await setup();await click();await p.keyboard.press('Escape');const paused=await snapshot();s=await tick(10);assert.equal(s.state,'paused');assert.equal(s.pending,2);assert.deepEqual(s.mark,paused.mark);await p.evaluate(()=>window.__haloFixture.resume());s=await tick(.09);assert.equal(s.rounds[5],22);s=await tick(.09);assert.equal(s.mark?.stacks,3);
 // All subsequent weapons use the target multiplier, rather than a HALO-only bonus.
 await p.evaluate(()=>window.__haloFixture.carryRifle());await p.keyboard.press('Digit1');await tick(.4);await aim('head');const before=(await snapshot()).hp;s=await click();assert(Math.abs(before-s.hp-26*1.75*1.2)<.01,JSON.stringify({before,s}));
 // Actual reload/switch/reset cancel queued rounds without refunding the first.
 for(const action of ['r','Digit3']){await setup();await click();await p.keyboard.press(action);s=await tick(.3);assert.equal(s.pending,0);assert.equal(s.shots[5],1);assert.equal(s.rounds[5],23);}
 await setup();await click();s=await p.evaluate(()=>window.__haloFixture.clear());assert.equal(s.pending,0);assert.equal(s.rounds[5],24);
 for(const ammo of [1,2]){await setup({ammo,reserve:0});await click();s=await tick(.2);assert.equal(s.shots[5],ammo);assert.equal(s.rounds[5],0);assert.equal(s.pending,0);}await setup({ammo:0,reserve:0});s=await click();assert.equal(s.shots[5],0);
 // New rounds acquire current LOS: cover inserted after round one blocks two and three.
 await setup();s=await click();const afterFirst=s.hp;await p.evaluate(()=>window.__haloFixture.wall());s=await tick(.2);assert.equal(s.hp,afterFirst);assert.equal(s.shots[5],3);assert.equal(s.mark?.stacks,1);
 await setup();await click();await aim('body');s=await tick(.2);assert.equal(s.hp,904,'remaining rounds use current aim');assert.equal(s.mark?.stacks,1);
 await setup();await click();await click();await tick(.2);s=await tick(.5);assert.equal(s.shots[5],3,'queued click cannot start a second burst');
 await setup({type:'heavy'});await click();s=await tick(.2);assert(s.hp<1000);assert.equal(s.mark,null,'armored head hits do not stack');
 await setup({wall:true});await click();s=await tick(.2);assert.equal(s.hp,1000);assert.equal(s.mark,null);
 await setup();await aim('body');await click();s=await tick(.2);assert(s.hp<1000);assert.equal(s.mark,null,'body hits do not mark');
 await setup();await click();s=await tick(.2);assert.equal(s.mark?.stacks,3);s=await tick(6.01);assert.equal(s.mark,null,'expiry uses game time');
 await setup({ammo:9,reserve:17});await click();await tick(.2);const cp=await p.evaluate(()=>window.__haloFixture.save());assert.equal(cp.selected,0);assert.equal(cp.halo.rounds,6);assert(cp.halo.equipped);assert(!cp.tempest.equipped);s=await p.evaluate(()=>window.__haloFixture.restore());assert.equal(s.selected,5);assert.equal(s.rounds[5],6);assert.equal(s.reserves[5],17);assert.equal(s.pending,0);assert(!s.attempt.eligible);assert.equal(s.weapon,'halo');
 await setup();await click();s=await p.evaluate(()=>window.__haloFixture.finish());assert.equal(s.pending,0);s=await tick(1);assert.equal(s.shots[5],1);
 assert.deepEqual(errors,[]);console.log('PASS: actual three-round input/update/aim/damage/model; third-hit activation/fourth-hit bonus and rifle bonus, body/cover rejection, per-round LOS, pause, reload/switch/reset cancellation, short/empty magazine, expiry, checkpoint no refund and strict knife eligibility');await context.close();
}finally{await browser?.close();child?.kill();}
