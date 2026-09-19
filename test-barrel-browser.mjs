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
 await n.goto(url.href);await n.click('#deploy');await n.waitForFunction(()=>document.body.dataset.menuOpen==='false');await n.keyboard.press('Digit4');
 await n.waitForFunction(()=>document.querySelector('#ammo').textContent==='∞'&&!document.querySelector('.parry-status').hidden);
 assert.equal(await n.locator('.loadout-card').count(),8);assert.match(await n.locator('.parry-status').textContent(),/右键弹反/);
 await n.keyboard.press('Digit1');await n.waitForFunction(()=>document.querySelector('.parry-status').hidden);await native.close();
 console.log('PASS: uninstrumented reactor boots, eight weapons, blade hint and firearm hide');
 const context=await browser.newContext({viewport:{width:960,height:720}}),p=await context.newPage();p.setDefaultTimeout(45000);p.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});
 await p.route('**/app.js',async route=>{
  const response=await route.fetch();let source=await response.text();console.log('app sha256 '+createHash('sha256').update(source).digest('hex'));source=source.replace("if(state==='playing')update(dt);",'if(false)update(dt);');
  source+=`\nwindow.__barrel={
   async setup({target=false,boss=false}={}){
    if(document.pointerLockElement)await new Promise(resolve=>{const changed=()=>{if(!document.pointerLockElement){document.removeEventListener('pointerlockchange',changed);resolve();}};document.addEventListener('pointerlockchange',changed);document.exitPointerLock();});await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    if(this.cover){scene.remove(this.cover.mesh);const i=obstacles.indexOf(this.cover);if(i>=0)obstacles.splice(i,1);this.cover=null;}
    reset();state='playing';document.body.dataset.playState=state;overlay.hidden=true;enemies.forEach(e=>disposeGroup(e.group));enemies.length=0;
    camera.position.set(19,1.7,22);playerMotion.reset(camera.position,0);yaw=0;pitch=0;camera.rotation.set(0,0,0);handling.update(1,false);cooldown=0;Math.random=()=>.5;this.victim=null;
    for(const [x,z,hp,isBoss] of [[0,-30,10000,false],...(target?[[19,17,30,boss]]:[])]){const group=createEnemyModel(isBoss?'warden':'assault');group.position.set(x,0,z);scene.add(group);const e={group,type:isBoss?'warden':'assault',hp,maxHp:hp,boss:isBoss,bossState:isBoss?createBossState():null,speed:0,attack:9999,charge:0,radius:.65,seed:0};enemies.push(e);if(target&&x===19)this.victim=e;}
    scene.updateMatrixWorld(true);hud();return this.snapshot();
   },tick(dt){if(state==='playing')update(dt);return this.snapshot();},
   snapshot(){return {state,health,kills,barrels:barrels.snapshot(),victim:this.victim?.hp,attempt:achievementUI.attempt.state,shots:[...telemetryShots],pass:playerMotion.canOccupy(19,18,0)};},
   wall(){const mesh=box(4,3,.15,19,1.5,19.5);this.cover={mesh,x:19,z:19.5,w:4,h:3,d:.15};obstacles.push(this.cover);scene.updateMatrixWorld(true);},
   bolt({near=false}={}){enemyProjectiles.queue(new THREE.Vector3(19,1.35,near?20:16),new THREE.Vector3(19,1.35,22),false,null,{color:'orange',charge:0,speed:20,damage:50,angles:[0]});enemyProjectiles.update(0,camera.position);},
   view(){camera.position.set(21,1.7,23.5);playerMotion.reset(camera.position,0);yaw=.349;pitch=-.08;camera.rotation.set(pitch,yaw,0);},
   resume(){return enterPlay();},saveInside(){camera.position.set(19,1.7,18);playerMotion.reset(camera.position,0);saveCheckpoint();return checkpoint();},restore(){const cp=campaign.checkpoint;reset(cp.stageIndex,cp);state='playing';overlay.hidden=true;return this.snapshot();},retry(){reset();return this.snapshot();}
  };`;await route.fulfill({response,body:source});
 });
 await p.goto(url.href);await p.waitForFunction(()=>!!window.__barrel);const run=(m,a)=>p.evaluate(([m,a])=>window.__barrel[m](a),[m,a]);
 async function equip(i){await p.keyboard.press('Digit'+(i+1));await run('tick',.24);}
 async function fire(i){await p.mouse.move(480,360);await p.mouse.down();let s=await run('tick',i===6?.8:0);await p.mouse.up();if(i===3)s=await run('tick',.16);if(i===5)s=await run('tick',.2);return s;}
 if(process.env.BARREL_SCREENSHOT){await run('setup');await run('view');await run('tick',.4);await mkdir(path.dirname(process.env.BARREL_SCREENSHOT),{recursive:true});await p.screenshot({path:process.env.BARREL_SCREENSHOT});}
 for(let i=0;i<8;i++){let s=await run('setup');assert(s.barrels.every(b=>b.enabled));await equip(i);let shots=0;do{s=await fire(i);shots++;if(!s.barrels[1].broken)await run('tick',.65);}while(!s.barrels[1].broken&&shots<10);assert(s.barrels[1].broken,'weapon '+i);assert(s.pass);assert(s.health<100&&s.health>0);assert.equal(s.kills,0);assert.equal(s.attempt.environmentDamage,0);console.log('PASS barrel weapon '+i);}
 await run('setup',{target:true});await equip(3);let s=await fire(3);assert.equal(s.kills,1);assert(s.victim<=0);assert.equal(s.attempt.kills[3],0);assert.equal(s.attempt.shots,0);assert(s.attempt.environmentDamage>0);s=await run('tick',1);assert.equal(s.kills,1);
 await run('setup',{target:true});await run('bolt');s=await run('tick',.3);assert.equal(s.kills,1);assert.equal(s.attempt.environmentDamage,0);assert.equal(s.attempt.shots,0);assert(s.attempt.kills.every(n=>n===0));
 await run('setup',{target:true});await equip(3);await run('bolt',{near:true});await p.mouse.click(480,360,{button:'right'});s=await run('tick',.25);assert(s.barrels[1].broken);assert.equal(s.kills,1);assert(s.attempt.environmentDamage>0);assert.equal(s.attempt.kills[3],0);assert.equal(s.attempt.shots,0);
 await run('setup',{target:true,boss:true});await equip(6);s=await fire(6);assert.equal(s.victim,30,'no Boss blast damage or rail-through-barrel');assert.equal(s.kills,0);
 await run('setup');await run('wall');await equip(0);await fire(0);s=await fire(0);assert.equal(s.barrels[1].hp,40,'wall blocks player shot');await run('bolt');s=await run('tick',.3);assert(s.barrels[1].broken);assert.equal(s.health,100,'wall shields player from blast');
 // Clear only the fixture wall; all authored scenery is preserved.
 await run('setup');await run('bolt');await p.keyboard.press('Escape');s=await run('tick',2);assert.equal(s.barrels[1].hp,40);await run('resume');s=await run('tick',.3);assert(s.barrels[1].broken);
 const cp=await run('saveInside');assert(!('barrels' in cp));s=await run('restore');assert(!s.barrels[1].enabled);assert(s.pass);s=await run('retry');assert(s.barrels[1].enabled);assert.equal(s.barrels[1].hp,40);
 assert.deepEqual(errors,[]);console.log('PASS eight native weapons, self damage, one environment kill/no fake blade kills, Boss immunity, solid cover, pause, safe checkpoint/reset');await context.close();
  // Nine-chapter environment rollout: authored barrels/panels exist with live colliders at the right deck height.
  const expect9={station:[1,1,0],roof:[2,2,0],tower:[2,2,0],train:[2,1,1.5],harbor:[2,2,0],orbital:[2,2,0],datacenter:[2,2,0],polar:[2,2,0]};
  for(const [map,[nb,np,deckY]] of Object.entries(expect9)){
   const u=new URL(base);u.search='?map='+map+'&menu=chapter';const c=await browser.newContext({viewport:{width:960,height:720}});const pg=await c.newPage();const errs=[];pg.setDefaultTimeout(60000);pg.on('pageerror',e=>{errs.push(e.message);console.error(e.stack);});
   await pg.route('**/app.js',async route=>{const response=await route.fetch();let source=await response.text();source+="\nwindow.__env9=()=>({map:MAP_ID,barrels:scene.children.filter(o=>o.userData.barrelId).map(o=>+o.position.y.toFixed(2)),panels:scene.children.filter(o=>o.userData.railThin).map(o=>+o.position.y.toFixed(2))});";await route.fulfill({response,body:source});});
   await pg.goto(u.href);await pg.click('#deploy');await pg.waitForFunction(()=>document.body.dataset.playState==='playing'&&document.querySelector('.dynamic-crosshair').style.opacity==='1');
   const s=await pg.evaluate(()=>window.__env9());
   assert.equal(s.map,map);assert.equal(s.barrels.length,nb,map+' barrel count');assert.equal(s.panels.length,np,map+' panel count');
   s.barrels.forEach(y=>assert(Math.abs(y-(deckY+.9))<1e-9,map+' barrel height '+y));s.panels.forEach(y=>assert(Math.abs(y-(deckY+.9))<1e-9,map+' panel height '+y));
   assert.deepEqual(errs,[]);await c.close();
   console.log('PASS environment rollout '+map+': '+nb+' barrels / '+np+' panels at deck '+deckY);
  }
}finally{await browser?.close();child?.kill();}
