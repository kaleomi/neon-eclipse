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

 const context=await browser.newContext({viewport:{width:960,height:720}}),p=await context.newPage();p.setDefaultTimeout(60000);p.on('pageerror',e=>errors.push(e.stack));
 await p.route('**/app.js',async route=>{const response=await route.fetch();let source=await response.text();assert(source.includes("if(state==='playing')update(dt);"));source=source.replace("if(state==='playing')update(dt);",'if(false)update(dt);');source+=`
 window.__execution={
 async setup({wound=false,healthValue=60,type='assault',stagger=1,hp=14}={}){if(document.pointerLockElement)await new Promise(resolve=>{document.addEventListener('pointerlockchange',resolve,{once:true});document.exitPointerLock();});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));reset(0);state='playing';document.body.dataset.playState=state;overlay.hidden=true;enemyProjectiles.clear();enemies.forEach(e=>disposeGroup(e.group));enemies.length=0;obstacles.length=0;const floor=box(24,.2,24,0,1.9,0);obstacles.push({mesh:floor,x:0,z:0,w:24,d:24,h:2,bottom:1.8,top:2});health=healthValue;camera.position.set(0,3.7,0);playerMotion.reset(camera.position,2);yaw=pitch=0;camera.rotation.set(0,0,0);changeWeapon(3);handling.update(1,false);cooldown=0;art.hazardDamage=()=>null;
 const group=createEnemyModel(type);group.position.set(0,2,-1.65);scene.add(group);scene.updateMatrixWorld(true);const head=group.children.find(m=>m.userData.hitZone==='head');if(head)group.position.y+=camera.position.y-head.getWorldPosition(new THREE.Vector3()).y;this.actor={group,type,hp:wound?500:hp,maxHp:wound?5000:100,boss:false,speed:0,attack:999,charge:0,radius:.65,seed:0,staggerRemaining:wound?0:stagger};enemies.push(this.actor);executionStagger.update(enemies,0);scene.updateMatrixWorld(true);return this.snap();},
 tick(dt){if(state==='playing')update(dt);return this.snap();},snap(){return {state,map:MAP_ID,health,kills,hp:this.actor?.hp,stagger:this.actor?.staggerRemaining||0,active:execution.active,protected:execution.invulnerable,phase:execution.phase,eligible:!!executionTarget(),attempt:achievementUI.attempt.state,shots:[...telemetryShots],pending:enemyProjectiles.charging};},
 hostile(){const a=camera.position.clone().add(new THREE.Vector3(0,-.35,-1)),b=camera.position.clone().add(new THREE.Vector3(0,-.35,0));enemyProjectiles.queue(a,b,false,null,{charge:0,speed:20,damage:10,angles:[0]});enemyProjectiles.update(0,camera.position);enemyProjectiles.update(.08,camera.position);return this.snap();},
 blast(kind){const saved=enemies.splice(0);if(kind==='barrel')applyBarrelBlast(camera.position.clone(),{player:false},[]);else cinderBlast(camera.position.clone());enemies.push(...saved);return this.snap();},
 hazard(){art.hazardDamage=()=>({damage:10,x:0,z:0});update(.01);art.hazardDamage=()=>null;return this.snap();},
 boss(){if(!overseer)return null;const original=overseer.update;overseer.update=()=>10;update(.01);overseer.update=original;return this.snap();},
 wall(){const mesh=box(5,6,.15,0,3,-.8);obstacles.push({mesh,x:0,z:-.8,w:5,d:.15,h:6});scene.updateMatrixWorld(true);},away(){camera.position.x=6;playerMotion.reset(camera.position,0);},
 finish(){end(false);return this.snap();},retry(){const cp=checkpoint();reset(cp.stageIndex,cp);return {active:execution.active,protected:execution.invulnerable,attempt:achievementUI.attempt.state};}
 };`;await route.fulfill({response,body:source});});
 const run=(m,a)=>p.evaluate(([m,a])=>window.__execution[m](a),[m,a]);
 async function open(map='reactor'){url.search='?map='+map+'&menu=chapter';await p.goto(url.href);await p.waitForFunction(()=>!!window.__execution);}
 await open();let s=await run('setup',{wound:true});await p.keyboard.press('v');assert(!(await run('snap')).active,'low HP alone is insufficient');await p.mouse.click(480,360);await run('tick',0);s=await run('tick',.16);assert(s.hp<500&&s.hp>0,JSON.stringify(s));assert.equal(s.stagger,1,'actual blade wound arms finite stagger');s=await run('tick',.4);assert(s.eligible);await p.keyboard.press('v');s=await run('tick',.12);assert(s.protected);s=await run('hostile');assert.equal(s.health,60);s=await run('tick',.12);assert(s.protected);s=await run('tick',.06);assert.equal(s.kills,1);assert.equal(s.health,68);assert(!s.protected);assert(s.active);assert.equal(s.attempt.shots,0);assert.equal(s.attempt.kills[3],1);assert(!s.attempt.bladeDisqualified);s=await run('hostile');assert.equal(s.health,58,'damage resumes after .3s');s=await run('tick',.3);assert(!s.active);assert.equal(s.health,58,'heal occurs once');console.log('PASS real blade wound -> stagger -> native V, full .6s animation, .3s protection expiry, +8 once, strict blade attribution');
 for(const spec of [{hp:15},{stagger:0},{type:'sentry'}]){await run('setup',spec);await p.keyboard.press('v');assert(!(await run('snap')).active);}
 for(const cancel of ['wall','away']){await run('setup');await p.keyboard.press('v');await run(cancel);s=await run('tick',.3);assert.equal(s.kills,0);assert.equal(s.health,60);assert(!s.protected);}
 await run('setup',{healthValue:97});await p.keyboard.press('v');s=await run('tick',.3);assert.equal(s.health,100);
 await run('setup');await p.keyboard.press('v');await p.keyboard.press('Digit1');s=await run('snap');assert(!s.active&&!s.protected);assert.equal(s.health,60);
 await run('setup');await p.keyboard.press('v');await p.keyboard.press('Escape');s=await run('snap');assert(!s.active&&!s.protected);s=await run('tick',2);assert.equal(s.health,60);assert.equal(s.kills,0);
 await run('setup');await p.keyboard.press('v');s=await run('finish');assert(!s.active&&!s.protected);assert(!s.attempt.alive);s=await run('retry');assert(!s.active&&!s.protected);assert(!s.attempt.eligible);
 for(const kind of ['barrel','cinder']){await run('setup');await p.keyboard.press('v');s=await run('blast',kind);assert.equal(s.health,60);await p.keyboard.press('Digit1');s=await run('blast',kind);assert(s.health<60,'self explosion resumes after cancellation');}
 await run('setup');await p.keyboard.press('v');s=await run('hazard');assert.equal(s.health,60);await p.keyboard.press('Digit1');s=await run('hazard');assert.equal(s.health,50);
 console.log('PASS exact 15/stagger/robot gate, late wall/range whiff no heal, cap100, switch/pause/death/retry cleanup, real self-blast and environmental damage guards');
 for(const map of ['station','roof','tower','train','harbor','orbital','datacenter','polar']){await open(map);await run('setup',{type:'heavy'});await p.keyboard.press('v');s=await run('tick',.12);assert(s.active&&s.protected,map);assert.equal(await p.locator('.field-kit-status').isVisible(),true);s=await run('boss');if(s)assert.equal(s.health,60,map+' Boss damage protected');s=await run('tick',.3);assert.equal(s.kills,1,map);assert.equal(s.health,68,map);s=await run('boss');if(s)assert(s.health<68,map+' Boss damage resumes');console.log('PASS native execution and Boss guard: '+map);}
 assert.deepEqual(errors,[]);await context.close();console.log('PASS execution browser');
}finally{await browser?.close();child?.kill();}
