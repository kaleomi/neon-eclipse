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
  source+=`\nwindow.__parryFixture={
   async setup({type='assault',hp=100}={}){
    // Forced resets are faster than real menu navigation. Wait for the previous
    // native pointer-lock exit before setting playing again; do not disable blur/pause.
    if(document.pointerLockElement)await new Promise(resolve=>{
     const changed=()=>{if(!document.pointerLockElement){document.removeEventListener('pointerlockchange',changed);resolve();}};
     document.addEventListener('pointerlockchange',changed);document.exitPointerLock();
    });
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    reset(0);state='playing';document.body.dataset.playState=state;overlay.hidden=true;
    for(const e of enemies)disposeGroup(e.group);enemies.length=0;obstacles.length=0;
    camera.position.set(0,1.7,0);playerMotion.reset(camera.position,0);yaw=0;pitch=0;camera.rotation.set(0,0,0);camera.updateMatrixWorld(true);
    changeWeapon(3);handling.update(1,false);cooldown=0;parry.reset();
    const group=createEnemyModel(type);group.position.set(0,0,-4);scene.add(group);
    const profile=ENEMY_TYPES[type],e={group,type,hp,maxHp:hp,boss:type==='warden',bossState:type==='warden'?createBossState():null,speed:0,attack:9999,charge:0,radius:profile.radius,seed:0};
    enemies.push(e);this.actor=e;scene.updateMatrixWorld(true);return this.snapshot();
   },
   emit({color='orange',boss=false,behind=false,count=1}={}){
    enemyProjectiles.queue(new THREE.Vector3(0,1.35,behind?2:-2),new THREE.Vector3(0,1.35,0),boss,null,{color,charge:0,speed:20,damage:20,angles:Array(count).fill(0)});
    enemyProjectiles.update(0,camera.position);return this.snapshot();
   },
   wall(z){const mesh=box(4,3,.1,0,1.5,z);obstacles.push({mesh,x:0,z,w:4,d:.1,bottom:0,top:3});},
   mark(){for(let i=0;i<3;i++)registerHaloWeakHit(this.actor);},
   tick(dt){if(state==='playing')update(dt);return this.snapshot();},
   snapshot(){const a=achievementUI.attempt.state;return {state,health,kills,hp:this.actor?.hp,actors:enemies.length,selected,sprinting,parry:parry.state,guard:parry.guard,pending:meleePending,remaining:meleeRemaining,shots:[...telemetryShots],bladeKills:a.kills[3],knifeValid:a.eligible&&a.alive&&a.shots===0,ammo:rounds[selected],ads:handling.state.ads,reflected:enemyProjectiles.reflectedCount,bolts:enemyProjectiles.count,gun:{y:gun.position.y,roll:gun.rotation.z}};},
   cancelSwing(){meleeRemaining=0;meleePending=false;meleeStrike.cancel();cooldown=0;},
   resume(){return enterPlay();},finish(){end(false);return this.snapshot();},
   retry(){reset();state='playing';overlay.hidden=true;return this.snapshot();}
  };`;
  await route.fulfill({response,body:source});
 });
 await p.goto(url.href);await p.waitForFunction(()=>Boolean(window.__parryFixture));
 await p.evaluate(()=>localStorage.setItem('p1-parry-save-sentinel','keep'));
 const run=(method,arg)=>p.evaluate(([m,a])=>window.__parryFixture[m](a),[method,arg]);
 const right=()=>p.mouse.click(480,360,{button:'right'});
 let s=await run('setup',{hp:20});await run('emit');await right();s=await run('tick',.12);
 assert.equal(s.health,100);assert.equal(s.reflected,1);assert(s.parry.active);assert(s.guard>0);assert.equal(s.ads,0);assert.equal(s.shots[3],0);
 await p.waitForFunction(()=>document.querySelector('.parry-status').dataset.state==='active');assert.match(await p.locator('.parry-status').textContent(),/反射成功/);
 if(process.env.PARRY_SCREENSHOT){await mkdir(path.dirname(process.env.PARRY_SCREENSHOT),{recursive:true});await p.screenshot({path:process.env.PARRY_SCREENSHOT});}
 s=await run('tick',.12);assert.equal(s.hp,0);assert.equal(s.kills,1);assert.equal(s.bladeKills,1);assert(s.knifeValid);assert(s.shots.every(n=>n===0));assert.equal(s.bolts,0);s=await run('tick',.2);assert.equal(s.kills,1);
 await p.keyboard.press('Digit1');await run('tick',.23);await p.mouse.click(480,360);s=await run('tick',.01);assert(!s.knifeValid);assert.equal(s.shots[0],1,'firearm still invalidates pure knife');
 for(const spec of [{color:'purple'},{color:'amber'},{color:'pink'},{color:'green'},{color:'blue'},{color:'orange',boss:true},{behind:true}]){
  await run('setup');await run('emit',spec);await right();s=await run('tick',.12);assert.equal(s.health,80,JSON.stringify(spec));assert.equal(s.reflected,0);
 }
 // Reflection keeps blade attribution even after a weapon switch, and pauses in flight.
 await run('setup',{hp:20});await run('emit');await right();await run('tick',.12);await p.keyboard.press('Digit1');s=await run('tick',.12);assert.equal(s.bladeKills,1);assert(s.knifeValid);assert.equal(s.selected,0);assert(s.shots.every(n=>n===0));
 await run('setup',{hp:20});await run('emit');await right();await run('tick',.12);await p.keyboard.press('Escape');s=await run('tick',3);assert.equal(s.reflected,1);assert.equal(s.hp,20);await run('resume');s=await run('tick',.12);assert.equal(s.bladeKills,1);
 // Armour and HALO use existing damage rules, but no head/core bonus is awarded.
 await run('setup',{type:'heavy'});await run('emit');await right();await run('tick',.12);s=await run('tick',.12);assert.equal(s.hp,94,'front armour reduces raw 20 to 6');
 await run('setup');await run('mark');await run('emit');await right();await run('tick',.12);s=await run('tick',.12);assert.equal(s.hp,76,'HALO multiplier remains 1.2');
 await run('setup',{type:'warden'});await run('emit');await right();await run('tick',.12);s=await run('tick',.12);assert.equal(s.hp,100,'Boss actor blocks but receives no new reflection damage route');
 for(const z of [-1,-3]){await run('setup');await run('wall',z);await run('emit');await right();await run('tick',.12);s=await run('tick',.12);assert.equal(s.health,100);assert.equal(s.hp,100);assert.equal(s.kills,0);}
 // Contact 72.5ms into the frame must miss a window with only 10ms remaining.
 await run('setup');await right();await run('tick',.24);await run('emit');s=await run('tick',.12);assert.equal(s.health,80,'no frame-wide grace at expiration');
 await run('setup');await right();await p.keyboard.press('Digit1');await run('emit');s=await run('tick',.12);assert.equal(s.health,80);assert(!s.parry.active);assert.equal(s.guard,0);
 await run('setup');await right();await run('tick',.05);await p.keyboard.press('Escape');const paused=await run('snapshot');s=await run('tick',3);assert.equal(s.state,'paused');assert(!s.parry.active);assert.equal(s.parry.recovery,paused.parry.recovery);
 await run('resume');await run('emit');s=await run('tick',.12);assert.equal(s.health,80,'pause cancels window, not recoverable invulnerability');
 await run('setup');await p.mouse.down({button:'right'});await run('tick',.5);await run('emit');s=await run('tick',.12);assert.equal(s.health,80,'held RMB does not rearm');await p.mouse.up({button:'right'});
 await run('setup');await p.mouse.click(480,360);await run('tick',0);await right();s=await run('snapshot');assert(s.pending);assert(!s.parry.active,'cannot guard during swing');
 await run('setup');await right();await p.mouse.click(480,360);s=await run('tick',.1);assert(!s.pending,'cannot swing during guard/recovery');
 await run('setup',{hp:20});await run('emit',{count:2});await right();await run('tick',.12);s=await run('tick',.12);assert.equal(s.kills,1);assert.equal(s.bladeKills,1,'multiple returns cannot award a second kill');
 s=await run('finish');assert.equal(s.bolts,0);assert.equal(s.reflected,0);assert.equal(s.parry.recovery,0);assert(!s.parry.active);s=await run('retry');assert.equal(s.parry.recovery,0);assert.equal(s.bolts,0);
 await run('setup');await p.keyboard.press('Digit1');await p.mouse.down({button:'right'});s=await run('tick',.12);assert(s.ads>0,'firearm ADS unchanged: '+JSON.stringify(s));assert(!s.parry.active);await p.mouse.up({button:'right'});
 await run('setup');await right();await p.keyboard.down('Shift');await p.keyboard.down('w');s=await run('tick',.01);assert(!s.sprinting,'guard blocks sprint without enabling ADS');await p.keyboard.up('w');await p.keyboard.up('Shift');
 // Resize can correctly release pointer lock and pause the game. Settle that
 // lifecycle first; sample visibility and geometry atomically, not in two races.
 await p.keyboard.press('Escape');await p.waitForFunction(()=>!document.pointerLockElement&&document.body.dataset.playState==='paused'&&document.querySelector('.parry-status').hidden);
 await p.setViewportSize({width:390,height:720});await run('setup');
 const bounds=await p.waitForFunction(()=>{const el=document.querySelector('.parry-status'),r=el.getBoundingClientRect();return !el.hidden&&r.width>0?{x:r.x,width:r.width}:false;});const rect=await bounds.jsonValue();await bounds.dispose();assert(rect.x>=0&&rect.x+rect.width<=390,'hint fits narrow viewport');
 assert.equal(await p.evaluate(()=>localStorage.getItem('p1-parry-save-sentinel')),'keep');assert.deepEqual(errors,[]);
 console.log('PASS: native RMB, exact orange return and blade attribution, pure knife/firearm boundary, front/colour/Boss/armour/HALO/cover rules, 120ms expiry, held/swing/switch/pause/end/reset lifecycle, ADS, hint/guard pose and isolated storage');
 await context.close();
}finally{await browser?.close();child?.kill();}
