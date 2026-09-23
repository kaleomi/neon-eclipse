import {fileURLToPath} from 'node:url';
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
  child=spawn(process.execPath,['server.cjs'],{cwd:fileURLToPath(new URL('../',import.meta.url)),env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('test server timeout')),15000);child.stdout.on('data',d=>{if(String(d).includes('ready')){clearTimeout(timer);resolve();}});child.on('error',reject);child.on('exit',c=>{clearTimeout(timer);reject(new Error('server exit '+c));});});
  base=`http://127.0.0.1:${port}/index.html`;
 }
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const errors=[],url=new URL(base);url.search='?map=reactor&menu=chapter';
 const native=await browser.newContext({viewport:{width:960,height:720}}),n=await native.newPage();n.setDefaultTimeout(45000);n.on('pageerror',e=>errors.push(e.message));
 await n.goto(url.href);await n.click('#deploy');await n.waitForFunction(()=>document.body.dataset.menuOpen==='false');await n.keyboard.press('Digit3');
 await n.waitForFunction(()=>document.querySelector('#ammo').textContent==='∞'&&!document.querySelector('.parry-status').hidden);
 assert.equal(await n.locator('.loadout-card').count(),3);assert.match(await n.locator('.parry-status').textContent(),/右键弹反/);
 await n.keyboard.press('Digit1');await n.waitForFunction(()=>document.querySelector('.parry-status').hidden);await native.close();
 console.log('PASS: uninstrumented reactor boots, eight weapons, blade hint and firearm hide');
 const context=await browser.newContext({viewport:{width:960,height:720}}),p=await context.newPage();p.setDefaultTimeout(45000);p.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});
 await p.route('**/app.js',async route=>{
  const response=await route.fetch();let source=await response.text();console.log('Tested app.js sha256:'+createHash('sha256').update(source).digest('hex'));assert(source.includes("if(state==='playing')update(dt);"));
  source=source.replace("if(state==='playing')update(dt);",'if(false)update(dt);');
  source+=`\nwindow.__destructibleFixture={
   async setup(){
    if(document.pointerLockElement)await new Promise(resolve=>{const changed=()=>{if(!document.pointerLockElement){document.removeEventListener('pointerlockchange',changed);resolve();}};document.addEventListener('pointerlockchange',changed);document.exitPointerLock();});
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    reset(0);state='playing';document.body.dataset.playState=state;overlay.hidden=true;
    enemies.forEach(e=>disposeGroup(e.group));enemies.length=0;
    camera.position.set(5,1.7,27);playerMotion.reset(camera.position,0);yaw=0;pitch=0;camera.rotation.set(0,0,0);handling.update(1,false);cooldown=0;
    this.actor=this.addActor(0,-30);this.behind=null;Math.random=()=>.5;scene.updateMatrixWorld(true);hud();return this.snapshot();
   },
   addActor(x,z,hp=1000){const group=createEnemyModel('assault');group.position.set(x,0,z);scene.add(group);const e={group,type:'assault',hp,maxHp:hp,boss:false,speed:0,attack:9999,charge:0,radius:.65,seed:0};enemies.push(e);return e;},
   target(hp=1000){this.behind=this.addActor(5,22,hp);scene.updateMatrixWorld(true);this.behind.group.position.y+=1.7-this.behind.group.children.find(m=>m.userData.hitZone==='head').getWorldPosition(new THREE.Vector3()).y;scene.updateMatrixWorld(true);return this.snapshot();},
   sideTarget(){this.behind=this.addActor(6.4,23);scene.updateMatrixWorld(true);return this.snapshot();},
   tick(dt){if(state==='playing')update(dt);return this.snapshot();},
   snapshot(){const a=achievementUI.attempt.state;return {state,panels:destructibles.snapshot(),kills,health,remaining:enemies.length,objective:mission.state.index,selected,shots:[...telemetryShots],ammo:rounds[selected],knifeValid:a.eligible&&a.alive&&a.shots===0,actorHp:this.behind?.hp,marks:this.behind?.haloMark?.stacks||0,arcs:effects.filter(e=>e.mesh.name==='VOLT_CHAIN').length,position:{x:camera.position.x,y:camera.position.y,z:camera.position.z},canPass:playerMotion.canOccupy(5,24,0),bolts:enemyProjectiles.count};},
   bolt(){enemyProjectiles.queue(new THREE.Vector3(5,1.35,22),new THREE.Vector3(5,1.35,28),false,null,{color:'orange',charge:0,speed:20,damage:60,angles:[0]});enemyProjectiles.update(0,camera.position);},
   save(){saveCheckpoint();return checkpoint();},
   restore(){const saved=campaign.checkpoint;reset(saved.stageIndex,saved);state='playing';overlay.hidden=true;return this.snapshot();},
   retry(){reset();return this.snapshot();},resume(){return enterPlay();},
   view(){camera.position.set(2,1.7,28);playerMotion.reset(camera.position,0);yaw=-.64;pitch=-.02;camera.rotation.set(pitch,yaw,0);return this.snapshot();},carry(i){if(i!==2&&i!==3)loadout.equip(i);return loadout.allows(i);}
  };`;
  await route.fulfill({response,body:source});
 });
 await p.goto(url.href);await p.waitForFunction(()=>!!window.__destructibleFixture);
 await p.evaluate(()=>localStorage.setItem('destructible-sentinel','keep'));
 const run=(m,a)=>p.evaluate(([m,a])=>window.__destructibleFixture[m](a),[m,a]);
 async function equip(i){assert(await run('carry',i),'fixture must carry weapon '+i);await p.keyboard.press((i===3?'Digit3':i===2?'Digit2':'Digit1'));await run('tick',.24);}
 async function fire(i){await p.mouse.move(480,360);await p.mouse.down();let s=await run('tick',i===6?.8:0);await p.mouse.up();if(i===3)s=await run('tick',.16);if(i===5)s=await run('tick',.2);return s;}
 let s;
 for(let i=0;i<8;i++){
  await run('setup');await equip(i);let attempts=0;
  do{s=await fire(i);attempts++;if(!s.panels[1].broken)await run('tick',.65);}while(!s.panels[1].broken&&attempts<12);
  assert(s.panels[1].broken,'weapon '+i+' must destroy: '+JSON.stringify(s));assert(s.canPass);assert.equal(s.kills,0);assert.equal(s.remaining,1);assert.equal(s.objective,0);assert.equal(s.health,100);assert.equal(s.knifeValid,i===3);assert.equal(s.panels[0].hp,60);assert.equal(s.arcs,0);console.log('PASS weapon '+i+' destroys neutral foil; shots='+s.shots[i]);
 }
 await run('setup');await run('target');await equip(1);s=await fire(1);assert(s.panels[1].broken);assert(s.actorHp<1000,'remaining shotgun pellets use the newly open gap: '+JSON.stringify(s));assert.equal(s.kills,0);
 await run('setup');await run('target');await equip(6);s=await fire(6);assert(s.panels[1].broken);assert(s.actorHp<1000,'rail still penetrates and hits actor');
 await run('setup');await run('target');await equip(0);s=await fire(0);assert(s.panels[1].hp>0);assert.equal(s.actorHp,1000,'intact foil blocks ordinary fire');
 if(process.env.DESTRUCTIBLE_SCREENSHOT){await run('view');await run('tick',.2);await mkdir(path.dirname(process.env.DESTRUCTIBLE_SCREENSHOT),{recursive:true});await p.screenshot({path:process.env.DESTRUCTIBLE_SCREENSHOT});}
 // Native movement is blocked while intact, then succeeds through the cleared sheet.
 await run('setup');await p.keyboard.down('w');s=await run('tick',.8);await p.keyboard.up('w');assert(s.position.z>24.4);assert(!s.canPass);
 await run('setup');await run('target',50);await equip(3);s=await fire(3);assert(s.canPass);assert.equal(s.actorHp,50);assert.equal(s.kills,0);await p.keyboard.down('w');s=await run('tick',.7);await p.keyboard.up('w');assert(s.position.z<24,'native W traverses former collider');s=await fire(3);assert.equal(s.kills,1);assert(s.knifeValid,'actual subsequent blade kill stays eligible');
 await run('setup');await run('sideTarget');await equip(7);s=await fire(7);assert(s.panels[1].broken);assert.equal(s.arcs,0,'environment is never a VOLT source');assert.equal(s.actorHp,1000);
 // Enemy bullets break cover but that very bullet cannot also hurt the player.
 await run('setup');await run('bolt');s=await run('tick',.3);assert(s.panels[1].broken);assert.equal(s.health,100);assert.equal(s.kills,0);assert(s.knifeValid);await run('bolt');s=await run('tick',.3);assert.equal(s.health,40);
 // Pause must freeze incoming damage and destruction, not just the label.
 await run('setup');await run('bolt');await p.keyboard.press('Escape');s=await run('tick',2);assert.equal(s.panels[1].hp,60);assert.equal(s.state,'paused');await run('resume');s=await run('tick',.3);assert(s.panels[1].broken);
 // Old-format checkpoint contains no destructible schema. Saving inside the new
 // opening restores that exact position without recreating a solid inside it.
 await run('setup');await equip(3);await fire(3);await p.keyboard.down('w');s=await run('tick',.6);await p.keyboard.up('w');
 const cp=await run('save');assert(!('destructibles' in cp));assert(Math.abs(cp.z-24)<.5,JSON.stringify(cp));s=await run('restore');assert.equal(s.position.x,cp.x);assert.equal(s.position.z,cp.z);assert(!s.panels[1].enabled);assert(s.canPass);assert.equal(s.panels[0].hp,60);
 s=await run('retry');assert(s.panels.every(p=>p.hp===60&&p.colliding));assert(!s.canPass);assert.equal(s.bolts,0);
 assert.equal(await p.evaluate(()=>localStorage.getItem('destructible-sentinel')),'keep');assert.deepEqual(errors,[]);
 console.log('PASS native eight weapons/blade, same-shot pellets, rail penetration, cover/movement, hostile shots, pause, safe old-format checkpoint and retry; no page errors');await context.close();
}finally{await browser?.close();child?.kill();}
