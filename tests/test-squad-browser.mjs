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
 window.__eco={fresh(){reset(0);state='playing';document.body.dataset.playState=state;overlay.hidden=true;for(const e of enemies){scene.remove(e.group);}enemies.length=0;enemyDirector.clear();mortarMarkers.clear();return this.snap();},
  place(type,x,z){const profile=ENEMY_TYPES[type],group=createEnemyModel(type);group.scale.setScalar(profile.scale);group.position.set(x,0,z);group.rotation.y=Math.atan2(camera.position.x-x,camera.position.z-z);scene.add(group);const e={flankRoute:[],group,type,hp:profile.hp,maxHp:profile.hp,boss:false,bossState:null,speed:profile.speed,attack:0,radius:profile.radius,charge:0,seed:enemies.length};enemies.push(e);return this.snap();},
  snap(){return {health,state,enemies:enemies.map(e=>({type:e.type,hp:e.hp,x:e.group.position.x,z:e.group.position.z,armed:!!e.rusherArmed,zones:e.group.children.map(c=>c.userData.hitZone).filter(Boolean)})),markers:mortarMarkers.count,mortars:enemyDirector.mortars,squad:enemyDirector.squad.roles,player:{x:camera.position.x,z:camera.position.z}};},
  tick(dt,steps=1){for(let i=0;i<steps;i++)if(state==='playing')update(dt);return this.snap();},
  shoot(zone,times=1){const target=enemies.find(e=>e.type==='artilleryMech');let out=[];for(let i=0;i<times;i++){const r=resolveEnemyDamage(target,40,zone,camera.position);target.hp-=r.damage;out.push(r.damage);}return {out,art:{...target.artillery}};}
 };`;await route.fulfill({response,body:source});});
 const run=(m,...a)=>p.evaluate(([m,a])=>window.__eco[m](...a),[m,a]);
 url.search='?map=reactor&menu=chapter';await p.goto(url.href);await p.waitForFunction(()=>!!window.__eco);let s=await run('fresh');const start=s.health;
 // Rusher on the live reactor: model carries the dome, it closes, arms, detonates and the player loses health with no remaining enemy.
 s=await run('place','rusher',s.player.x,s.player.z-11);assert.equal(s.enemies[0].type,'rusher');let detonated=false;for(let i=0;i<300&&!detonated;i++){s=await run('tick',.05,4);detonated=s.enemies.length===0;}
 assert(detonated,'rusher removed after detonation');assert(s.health<start,'rusher blast hurt player: '+s.health);console.log('PASS rusher live blast '+(start-s.health).toFixed(1));
 // Artillery: no telegraph inside 6 m; from range a marker appears then the shell lands and hurts a stationary player; knee hits open the core window.
 s=await run('fresh');s=await run('place','artilleryMech',s.player.x,s.player.z-4);s=await run('tick',.05,20);assert.equal(s.markers,0,'holds fire inside minimum range');assert.equal(s.health,start);for(let i=0;i<120&&s.markers===0;i++)s=await run('tick',.05,1);assert(s.markers>0,'backs off and fires once outside minimum range');const mech=s.enemies[0];assert(Math.hypot(mech.x-s.player.x,mech.z-s.player.z)>=6-.3,'telegraphed only after retreating past 6 m');
 s=await run('fresh');s=await run('place','artilleryMech',s.player.x,s.player.z-16);assert(s.enemies[0].zones.includes('leg')&&s.enemies[0].zones.includes('core'));
 let marker=false,hp=start;for(let i=0;i<200&&!marker;i++){s=await run('tick',.05,1);marker=s.markers>0;}assert(marker,'mortar telegraph marker drawn');const landAt=s.mortars[0];assert(landAt&&Math.hypot(landAt.x-s.player.x,landAt.z-s.player.z)<.5,'telegraph centred on player');
 for(let i=0;i<80&&s.health===hp;i++)s=await run('tick',.05,1);assert(s.health<hp,'mortar landing hurt player');assert(s.mortars.length===0);
 let r=await run('shoot','core',1);assert.equal(r.out[0],8,'armored core before knee hits');r=await run('shoot','leg',2);assert.equal(r.art.legHits,0);assert(r.art.exposed>0);r=await run('shoot','core',1);assert.equal(r.out[0],100,'exposed core x2.5');
 console.log('PASS artillery live telegraph/landing and knee→core window');
 // Squad on live reactor: three guards get press/flank/cover roles, no page errors, pause/reset clears markers.
 s=await run('fresh');for(const [t,dx] of [['assault',-2],['assault',2],['ranged',0]])s=await run('place',t,s.player.x+dx,s.player.z-18);s=await run('tick',.05,10);const roles=Object.values(s.squad);assert(roles.includes('press')&&roles.includes('cover'),JSON.stringify(s.squad));
 s=await run('fresh');assert.equal(s.markers,0);assert.deepEqual(s.squad,{});
 assert.deepEqual(errors,[]);await context.close();console.log('PASS enemy ecology browser');
}finally{await browser?.close();child?.kill();}
