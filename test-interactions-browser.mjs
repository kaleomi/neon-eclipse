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


 const context=await browser.newContext({viewport:{width:1000,height:800}}),p=await context.newPage();p.setDefaultTimeout(60000);p.on('pageerror',e=>errors.push(e.stack));
 await p.route('**/app.js',async route=>{const response=await route.fetch();let source=await response.text();assert(source.includes("if(state==='playing')update(dt);"));source=source.replace("if(state==='playing')update(dt);",'if(false)update(dt);');source+=`
 window.__env={fresh(){reset(0);state='playing';document.body.dataset.playState=state;overlay.hidden=true;for(const e of enemies)scene.remove(e.group);enemies.length=0;enemyDirector.clear();return this.snap();},
  goto(x,z,y=0){camera.position.set(x,y+1.7,z);playerMotion.reset(camera.position,y);return this.snap();},
  layout(){return INTERACTION_LAYOUTS[MAP_ID];},
  place(type,x,z,y=0){const profile=ENEMY_TYPES[type],group=createEnemyModel(type);group.position.set(x,y,z);scene.add(group);enemies.push({flankRoute:[],group,type,hp:profile.hp,maxHp:profile.hp,boss:false,bossState:null,speed:profile.speed,attack:0,radius:profile.radius,charge:0,seed:enemies.length});return this.snap();},
  snap(){return {map:MAP_ID,state,health,toast:toast.textContent,theme:interactions?.theme,vent:{...interactions.vent.state,ready:interactions.vent.ready},light:{...interactions.light.state},hemi:hemiLight.intensity,enemies:enemies.map(e=>({type:e.type,hp:e.hp,x:e.group.position.x,z:e.group.position.z,slow:e.envSlow})),feet:playerMotion.state.y,grounded:playerMotion.state.grounded,kills};},
  tick(dt,steps=1){for(let i=0;i<steps;i++)if(state==='playing')update(dt);return this.snap();}
 };`;await route.fulfill({response,body:source});});
 const run=(m,...a)=>p.evaluate(([m,a])=>window.__env[m](...a),[m,a]);
 for(const map of ['reactor','station','roof','tower','train','harbor','orbital','datacenter','polar']){
  url.search='?map='+map+'&menu=chapter';await p.goto(url.href);await p.waitForFunction(()=>!!window.__env);let s=await run('fresh');const L=await run('layout');assert(s.theme.includes('/'),map+' theme');
  // settle on the console floor, no enemies; hint appears; hold native E for the vent
  s=await run('goto',L.vent.x+1,L.vent.z,L.vent.y||0);s=await run('tick',.05,20);assert(s.grounded,map+' grounded '+JSON.stringify({feet:s.feet}));assert(s.toast.includes('排气阀')||s.toast.includes('按住 E'),map+' vent hint: '+s.toast);
  await p.keyboard.down('e');s=await run('tick',.05,12);assert(/按住 E.*\d+%$/.test(s.toast),map+' hold progress in prompt: '+s.toast);s=await run('tick',.05,28);await p.keyboard.up('e');assert(s.vent.uses===1&&s.vent.active>0,map+' native E started the vent: '+JSON.stringify(s.vent));assert(s.toast.includes('冷却剂')||s.toast.includes('喷射'),map+' vent toast '+s.toast);
  // guard inside the cloud is slowed and takes damage; guard outside is untouched
  const zy=L.vent.zone.y??L.vent.y??0;s=await run('place','assault',L.vent.zone.x,L.vent.zone.z,zy);s=await run('place','assault',L.vent.zone.x+12,L.vent.zone.z+12,zy);const hp0=s.enemies.map(e=>e.hp);
  s=await run('tick',.05,20);assert(s.enemies[0].slow<.6,map+' inside slowed '+s.enemies[0].slow);assert(s.enemies[0].hp<hp0[0],map+' cloud damages guard');
  // light switch: walk over, hold E, floodlights dim; second press restores
  s=await run('goto',L.light.x+1,L.light.z,L.light.y||0);s=await run('tick',.05,20);const hemiBase=s.hemi;await p.keyboard.down('e');s=await run('tick',.05,20);await p.keyboard.up('e');assert(!s.light.lit,map+' lights off '+JSON.stringify(s.light));assert(s.hemi<hemiBase*.5,map+' hemi dimmed '+s.hemi);
  s=await run('tick',.05,5);await p.keyboard.down('e');s=await run('tick',.05,20);await p.keyboard.up('e');assert(s.light.lit,map+' lights back');assert(Math.abs(s.hemi-hemiBase)<1e-9,map+' hemi restored '+s.hemi);
  s=await run('fresh');assert(s.light.lit&&s.vent.uses===0,map+' reset clears both');
  console.log('PASS environment interactions in '+map+' // '+s.theme);
 }
 assert.deepEqual(errors,[]);await context.close();console.log('PASS nine-chapter native vent + light switch browser');
}finally{await browser?.close();child?.kill();}
