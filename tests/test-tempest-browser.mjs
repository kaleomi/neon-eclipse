import {fileURLToPath} from 'node:url';
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
  child=spawn(process.execPath,['server.cjs'],{cwd:fileURLToPath(new URL('../',import.meta.url)),env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('test server timeout')),15000);child.stdout.on('data',d=>{if(String(d).includes('ready')){clearTimeout(timer);resolve();}});child.on('error',reject);child.on('exit',c=>{clearTimeout(timer);reject(new Error('server exit '+c));});});base=`http://127.0.0.1:${port}/index.html`;
 }
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const errors=[];
 // First prove the unmodified application is playable through real controls.
 const native=await browser.newContext({viewport:{width:1280,height:800}}),page=await native.newPage();page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
 const url=new URL(base);url.search='?map=reactor&menu=chapter';await page.goto(url.href);await page.click('#deploy');await page.waitForFunction(()=>document.body.dataset.menuOpen==='false');
 await equipAtTerminal(page,4);await page.keyboard.press('Digit1');await page.waitForFunction(()=>document.querySelector('#ammo').textContent==='36');assert.equal(await page.locator('.loadout-card').count(),3);assert(await page.locator('[data-weapon=tempest]').evaluate(e=>e.classList.contains('active')));
 await page.waitForFunction(()=>document.querySelector('.dynamic-crosshair').style.opacity==='1');await page.mouse.down();await page.waitForFunction(()=>Number(document.querySelector('#ammo').textContent)<=32);await page.mouse.up();
 await page.keyboard.press('r');await page.waitForFunction(()=>document.querySelector('.reload-status').textContent.includes('可冲刺'));await page.waitForFunction(()=>document.querySelector('#ammo').textContent==='36');
 await equipAtTerminal(page,0);await page.keyboard.press('Digit1');await page.waitForFunction(()=>document.querySelector('#ammo').textContent==='30');await page.keyboard.press('Digit3');await page.waitForFunction(()=>document.querySelector('#ammo').textContent==='∞');await equipAtTerminal(page,4);await page.keyboard.press('Digit1');await page.waitForFunction(()=>document.querySelector('#ammo').textContent==='36');await page.waitForFunction(()=>document.querySelector('.dynamic-crosshair').style.opacity==='1');
 if(process.env.TEMPEST_SCREENSHOT){await mkdir(path.dirname(process.env.TEMPEST_SCREENSHOT),{recursive:true});await page.screenshot({path:process.env.TEMPEST_SCREENSHOT});}
 await native.close();console.log('PASS: uninstrumented page, native key 5, eight HUD cards, automatic fire, magazine reload hint, preserved keys 1/4 and independently retained ammo');
 const context=await browser.newContext({viewport:{width:960,height:720}}),p=await context.newPage();p.setDefaultTimeout(60000);p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{globalThis.__tempestManual=true;});
 await p.route('**/app.js',async route=>{const response=await route.fetch();let source=await response.text();assert(source.includes("if(state==='playing')update(dt);"));source=source.replace("if(state==='playing')update(dt);","if(state==='playing'&&!globalThis.__tempestManual)update(dt);");source+=`\nwindow.__tempestFixture={
 setup({index=4,wall=false,z=-2.5,ammo=36,reserve=180}={}){reset();enemies.forEach(e=>scene.remove(e.group));enemies.length=0;obstacles.length=0;state='playing';overlay.hidden=true;camera.position.set(0,1.7,0);yaw=0;pitch=-.08;camera.rotation.set(pitch,yaw,0);playerMotion.reset(camera.position,0);rounds[4]=ammo;reserves[4]=reserve;if(index!==2&&index!==3)loadout.equip(index);changeWeapon(index);handling.update(1,false);cooldown=0;
 const group=createEnemyModel('assault');group.position.set(0,0,z);scene.add(group);this.enemy={group,type:'assault',hp:1000,maxHp:1000,boss:false,speed:0,attack:9999,radius:.65,charge:0,seed:0};enemies.push(this.enemy);
 if(wall){const mesh=box(5,4,.2,0,2,-1);obstacles.push({x:0,z:-1,w:5,d:.2,bottom:0,top:4,mesh});}scene.updateMatrixWorld(true);hud();return this.snapshot();},
 tick(dt){if(state==='playing')update(dt);return this.snapshot();},snapshot(){return {selected,rounds:[...rounds],reserves:[...reserves],reload,sprinting,z:camera.position.z,state,hp:this.enemy?.hp,weapon:gun.userData.weaponId,shots:[...telemetryShots],attempt:achievementUI.attempt.state,models:gun.children.filter(c=>c.isGroup&&c.visible).map(c=>c.name)};},
 resume(){return enterPlay();},save(){saveCheckpoint();return checkpoint();},restore(){const saved=campaign.checkpoint;reset(saved.stageIndex,saved);state='playing';overlay.hidden=true;return this.snapshot();},clear(){reset();return this.snapshot();}
 };`;await route.fulfill({response,body:source});});
 await p.goto(url.href);await p.waitForFunction(()=>!!window.__tempestFixture);await p.evaluate(()=>localStorage.setItem('p1-tempest-save-sentinel','keep'));
 const setup=o=>p.evaluate(v=>window.__tempestFixture.setup(v),o),tick=dt=>p.evaluate(d=>window.__tempestFixture.tick(d),dt),snapshot=()=>p.evaluate(()=>window.__tempestFixture.snapshot());
 async function click(){await p.waitForFunction(()=>document.body.dataset.menuOpen==='false');await p.mouse.click(480,360);return tick(0);}
 let s=await setup();assert.equal(s.weapon,'tempest');assert.deepEqual(s.models,['TEMPEST']);await p.waitForFunction(()=>document.body.dataset.menuOpen==='false');await p.mouse.down();await tick(0);for(let i=0;i<6;i++)s=await tick(.07);await p.mouse.up();assert.equal(s.shots[4],7);assert.equal(s.rounds[4],29);assert.equal(s.attempt.shots,7);assert(s.hp<1000);assert.deepEqual(s.shots.slice(0,4),[0,0,0,0]);
 for(const options of [{wall:true},{z:-45}]){await setup(options);s=await click();assert.equal(s.hp,1000,'cover and maximum range respected');assert.equal(s.rounds[4],35);}
 await setup({ammo:12,reserve:30});await p.keyboard.down('Shift');await p.keyboard.down('w');await p.keyboard.press('r');s=await tick(.3);assert(s.sprinting);assert(s.z<-2.3);assert(Math.abs(s.reload-1.2)<.001);assert.equal(s.rounds[4],12);assert.equal(s.reserves[4],30);
 await p.keyboard.press('Escape');const paused=await snapshot();s=await tick(.5);assert.equal(s.state,'paused');assert.equal(s.reload,paused.reload);assert.equal(s.z,paused.z);await p.keyboard.up('w');await p.keyboard.up('Shift');await p.evaluate(()=>window.__tempestFixture.resume());s=await tick(1.21);assert.equal(s.reload,0);assert.equal(s.rounds[4],36);assert.equal(s.reserves[4],6);
 await setup({ammo:12,reserve:30});await p.keyboard.press('r');await tick(.3);await p.keyboard.press('Digit2');s=await tick(.3);assert.equal(s.reload,0);assert.equal(s.rounds[4],12);assert.equal(s.reserves[4],30);await p.keyboard.press('Digit1');await tick(.3);assert.equal((await snapshot()).weapon,'tempest');
 // Old rifle still cannot sprint while reloading.
 await setup({index:0});await click();await p.keyboard.press('r');await p.keyboard.down('Shift');await p.keyboard.down('w');s=await tick(.2);assert(!s.sprinting);assert(s.reload>0);assert(Math.abs(s.z+1)<.05);await p.keyboard.up('w');await p.keyboard.up('Shift');
 // No free ammo through save/retry and no blade-eligibility reset through checkpoint load.
 await setup({ammo:9,reserve:17});await click();const cp=await p.evaluate(()=>window.__tempestFixture.save());assert.equal(cp.selected,0);assert.equal(cp.tempest.rounds,8);assert(cp.tempest.equipped);s=await p.evaluate(()=>window.__tempestFixture.restore());assert.equal(s.selected,4);assert.equal(s.rounds[4],8);assert.equal(s.reserves[4],17);assert(!s.attempt.eligible);assert.equal(s.weapon,'tempest');
 await setup({ammo:0,reserve:0});await click();s=await tick(.3);assert.equal(s.shots[4],0);assert.equal(s.reload,0);assert.equal(s.rounds[4],0);assert.equal(s.hp,1000);s=await p.evaluate(()=>window.__tempestFixture.clear());assert.equal(s.selected,0);assert.equal(s.rounds[4],36);assert.equal(s.reload,0);
 assert.equal(await p.evaluate(()=>localStorage.getItem('p1-tempest-save-sentinel')),'keep');assert.deepEqual(errors,[]);
 console.log('PASS: real input/update/shoot damage, dedicated model and statistics, automatic cadence, wall/range blocking, sprint reload and legacy exclusion, pause/resume, switch cancellation, actual checkpoint restore without ammo refund, empty ammo, reset and challenge eligibility');await context.close();
}finally{await browser?.close();child?.kill();}
