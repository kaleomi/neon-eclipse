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


 const context=await browser.newContext({viewport:{width:1000,height:800}}),p=await context.newPage();p.setDefaultTimeout(60000);p.on('pageerror',e=>errors.push(e.stack));
 await p.route('**/app.js',async route=>{const response=await route.fetch();let source=await response.text();assert(source.includes("if(state==='playing')update(dt);"));source=source.replace("if(state==='playing')update(dt);",'if(false)update(dt);');source+=`
 window.__budget={fresh(){reset(0);state='playing';document.body.dataset.playState=state;overlay.hidden=true;for(const e of enemies)scene.remove(e.group);enemies.length=0;enemyDirector.clear();enemyProjectiles.clear();mission.reset(1);return this.snap();},
  squad(){spawnEncounter(mission.current);for(const e of enemies)e.attack=0;overseer.boss.rules.state.active=true;return this.snap();},
  place(type,x,z){const profile=ENEMY_TYPES[type],group=createEnemyModel(type);group.position.set(x,0,z);group.rotation.y=Math.atan2(camera.position.x-x,camera.position.z-z);scene.add(group);enemies.push({flankRoute:[],group,type,hp:profile.hp,maxHp:profile.hp,boss:false,bossState:null,speed:profile.speed,attack:0,radius:profile.radius,charge:0,seed:enemies.length});return this.snap();},
  snap(){return {state,health,sources:attackBudget.sources,total:attackBudget.total(),proj:attackBudget.count('projectiles'),boss:attackBudget.count('boss'),bossSnap:overseer?.boss?.snapshot(),attackers:enemyProjectiles.attackers,count:enemies.length,player:{x:camera.position.x,z:camera.position.z}};},
  warn(v){const s=overseer.boss.rules.state;s.active=true;s.attack=v;return this.snap();},interrupt(){return {ok:overseer.interruptCharge(),...this.snap()};},
  tick(dt,steps=1){for(let i=0;i<steps;i++)if(state==='playing')update(dt);return this.snap();}
 };`;await route.fulfill({response,body:source});});
 const run=(m,...a)=>p.evaluate(([m,a])=>window.__budget[m](...a),[m,a]);
 url.search='?map=roof&menu=chapter';await p.goto(url.href);await p.waitForFunction(()=>!!window.__budget);let s=await run('fresh');
 assert.deepEqual(s.sources,['projectiles','boss','mortars']);assert.equal(s.bossSnap.kind,'overseer');assert.equal(s.bossSnap.status,'inactive');assert.equal(s.bossSnap.maxHp,1920);assert.equal(s.total,0);
 // Four ranged guards at range: without a Boss telegraph three may attack at once, never four.
 s=await run('squad');assert(s.count>=4,'stage spawn count '+s.count);let maxAttackers=0;for(let i=0;i<200;i++){s=await run('tick',.05,1);maxAttackers=Math.max(maxAttackers,s.attackers);}
 assert.equal(maxAttackers,3,'three-attacker cap holds on the live roof: '+maxAttackers);
 // Boss warning: slot count drops to two for the guards while the telegraph lasts; interrupt frees it.
 s=await run('fresh');s=await run('squad');s=await run('warn','warning');assert.equal(s.boss,1);assert.equal(s.bossSnap.telegraph,'warning');
 let maxWithBoss=0;for(let i=0;i<80;i++){s=await run('tick',.05,1);if(s.boss===1)maxWithBoss=Math.max(maxWithBoss,s.attackers);await run('warn','warning');}
 assert.equal(maxWithBoss,2,'boss telegraph reserves one slot: '+maxWithBoss);assert(s.total<=3,'total never exceeds budget: '+s.total);
 s=await run('interrupt');assert(s.ok);assert.equal(s.boss,0);assert.equal(s.bossSnap.telegraph,'rest');
 assert.deepEqual(errors,[]);await context.close();console.log('PASS attack budget browser: live roof three-attacker cap, overseer telegraph reserves a slot, adapter interrupt frees it');
}finally{await browser?.close();child?.kill();}
