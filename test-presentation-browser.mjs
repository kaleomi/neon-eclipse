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
 await p.route('**/app.js',async route=>{const response=await route.fetch();let source=await response.text();assert(source.includes("if(state==='playing')update(dt);"));source=source.replace("if(state==='playing')update(dt);",'if(false)update(dt);').replace('if(introActive)chapterIntro.step(p4RealDt);','if(false)chapterIntro.step(p4RealDt);');source+=`
 window.__env={fresh(){reset(0);state='playing';document.body.dataset.playState=state;overlay.hidden=true;for(const e of enemies)scene.remove(e.group);enemies.length=0;enemyDirector.clear();return this.snap();},
  place(type,x,z,flags={}){const profile=ENEMY_TYPES[type],group=createEnemyModel(type);group.position.set(x,0,z);scene.add(group);enemies.push({flankRoute:[],group,type,hp:profile.hp,maxHp:profile.hp,boss:false,bossState:null,speed:profile.speed,attack:0,radius:profile.radius,charge:0,seed:enemies.length,...flags});return this.snap();},
  kill(index){const e=enemies[index];e.hp=0;const before=kills;cooldown=0;reload=0;rounds[selected]=Math.max(rounds[selected],1);shoot();return {...this.snap(),killed:kills-before};},
  frame(dt,steps=1){for(let i=0;i<steps;i++){frameTimeScale=state==='playing'?slowmo.step(dt):1;if(!slowmo.active&&document.body.dataset.slowmo)delete document.body.dataset.slowmo;if(chapterIntro?.active)chapterIntro.step(dt);update(dt);killFx.update(state==='playing'?dt*frameTimeScale:0);weather.update(state==='playing'&&!chapterIntro?.active?dt*frameTimeScale:0);}return this.snap();},
  intro(){requestIntro(0,null);return enterPlay().then(()=>this.snap());},
  setFx(key,value){fxSettings[key]=value;saveFx();return fxSettings;},
  snap(){return {map:MAP_ID,state,kills,elapsed,scale:frameTimeScale,slowmo:{active:slowmo.active,remaining:slowmo.remaining},ghosts:killFx.count,ghostNodes:scene.children.filter(o=>o.userData.killGhost).length,slowmoAttr:document.body.dataset.slowmo||null,
   weather:weather.snapshot(),weatherAttr:document.body.dataset.weather,enemies:enemies.map(e=>({type:e.type,hp:e.hp,x:e.group.position.x,z:e.group.position.z})),
   intro:chapterIntro?{active:chapterIntro.active,time:chapterIntro.time,lines:[...document.querySelectorAll('.chapter-intro-lines li')].filter(l=>l.dataset.show==='true').length,card:!document.querySelector('.chapter-intro-card').hidden,skip:!document.querySelector('[data-intro-skip]').hidden,hidden:chapterIntro.element.hidden}:null,
   cinematic:document.body.dataset.cinematic||null,cam:{x:camera.position.x,y:camera.position.y,z:camera.position.z,rx:camera.rotation.x,ry:camera.rotation.y},gun:gun.visible,fx:{...fxSettings},fxStored:localStorage.getItem('neon-eclipse.presentation-fx.v1'),
   ranges:enemies.map(e=>e.envSlow),fogDensity:scene.fog?.density??null,hemi:hemiLight.intensity};}
 };`;await route.fulfill({response,body:source});});
 const run=(m,...a)=>p.evaluate(([m,a])=>window.__env[m](...a),[m,a]);
 // 1) weather: URL override applies fog density + light scale; particles for rain; harbor default stays world-owned.
 url.search='?map=reactor&menu=chapter&weather=fog';await p.goto(url.href);await p.waitForFunction(()=>!!window.__env);let s=await run('fresh');
 assert.equal(s.weatherAttr,'fog');assert(Math.abs(s.weather.fog-s.weather.baseFog*2.6)<1e-9,'fog density scaled '+JSON.stringify(s.weather));assert(Math.abs(s.weather.lights[0]-s.weather.baseLights[0]*.9)<1e-9,'light scaled');assert.equal(s.weather.particles,0);
 assert((await p.locator('[data-weather-line]').textContent()).includes('雾'),'settings show weather');
 url.search='?map=reactor&menu=chapter&weather=rain&weather-intensity=.5';await p.goto(url.href);await p.waitForFunction(()=>!!window.__env);s=await run('fresh');assert.equal(s.weatherAttr,'rain');assert(s.weather.particles>0&&s.weather.particles<=450,'half density rain particles '+s.weather.particles);
 const fog0=s.fogDensity;s=await run('frame',.05,20);assert.equal(s.fogDensity,fog0,'weather is static during play');
 url.search='?map=harbor&menu=chapter';await p.goto(url.href);await p.waitForFunction(()=>!!window.__env);s=await run('fresh');assert.equal(s.weatherAttr,'rain');assert.equal(s.weather.owned,true);assert.equal(s.weather.particles,0,'harbor world keeps its own rain');
 console.log('PASS weather presets + URL modifiers');
 // 2) kill presentation: normal kill -> ghost, no slowmo; elite kill -> slowmo 0.3 s with scaled dt; toggle off -> no slowmo.
 url.search='?map=reactor&menu=chapter&fx=1';await p.goto(url.href);await p.waitForFunction(()=>!!window.__env);s=await run('fresh');
 s=await run('place','assault',0,-8);s=await run('place','assault',3,-8,{elite:true});
 s=await run('kill',0);assert.equal(s.killed,1,'normal kill counted');assert.equal(s.ghosts,1,'ghost spawned');assert.equal(s.ghostNodes,1);assert.equal(s.slowmo.active,false,'normal kill no slowmo');
 s=await run('frame',.05,9);assert.equal(s.ghosts,0,'ghost gone after .4 s');assert.equal(s.ghostNodes,0);
 const e0=s.elapsed;s=await run('kill',0);assert.equal(s.killed,1);assert.equal(s.slowmo.active,true,'elite kill triggers slowmo');assert.equal(s.slowmoAttr,'true');
 s=await run('frame',.05,2);assert(Math.abs(s.scale-.35)<1e-9,'time scale .35');assert(Math.abs((s.elapsed-e0)-.1*.35)<1e-6,'sim dt scaled: '+(s.elapsed-e0));
 s=await run('frame',.05,5);assert.equal(s.slowmo.active,false,'slowmo ends after .3 s real');assert.equal(s.slowmoAttr,null);assert.equal(s.scale,1);
 await run('setFx','slowmo',false);s=await run('place','assault',0,-8,{elite:true});s=await run('kill',0);assert.equal(s.slowmo.active,false,'toggle off');assert(JSON.parse(s.fxStored).slowmo===false,'persisted');
 s=await run('frame',.05,10);assert.equal(s.ghosts,0,'ghosts flushed');await run('setFx','dissolve',false);s=await run('place','assault',0,-8);s=await run('kill',0);assert.equal(s.ghosts,0,'dissolve off');
 await run('setFx','slowmo',true);await run('setFx','dissolve',true);
 // pause/reset clears ghosts and slowmo
 s=await run('place','assault',0,-8,{elite:true});s=await run('kill',0);assert.equal(s.killed,1,'kill helper');assert(s.slowmo.active&&s.ghosts===1,JSON.stringify(s.slowmo)+' '+s.ghosts);s=await run('fresh');assert.equal(s.ghosts,0);assert.equal(s.slowmo.active,false);
 console.log('PASS kill ghost + elite slow-motion + toggles');
 // 3) chapter intro: fly-by camera, three lines, objective card, skip with Space; game does not simulate; camera restored.
 url.search='?map=reactor&menu=chapter&intro=1';await p.goto(url.href);await p.waitForFunction(()=>!!window.__env);s=await run('fresh');const camSpawn=s.cam;
 s=await run('intro');assert.equal(s.intro.active,true);assert.equal(s.cinematic,'true');assert.equal(s.gun,false,'weapon hidden');assert(Math.hypot(s.cam.x-camSpawn.x,s.cam.z-camSpawn.z)>3,'fly-by starts away from spawn');
 assert.equal(await p.locator('.chapter-intro-title').textContent(),'反应堆设施');
 const el0=s.elapsed;s=await run('frame',.05,80);assert(Math.abs(s.elapsed-el0)<1e-9,'no simulation during intro');assert.equal(s.intro.lines,2,'two lines at 4 s: '+JSON.stringify(s.intro));assert.equal(s.intro.card,false);assert.equal(s.intro.skip,true);
 s=await run('frame',.05,90);assert.equal(s.intro.lines,3);assert.equal(s.intro.card,true);assert((await p.locator('.chapter-intro-card strong').textContent()).length>2,'objective card text');
 await p.keyboard.press('Space');s=await run('frame',.05,1);assert.equal(s.intro.active,false,'space skips');assert.equal(s.cinematic,null);assert.equal(s.intro.hidden,true);assert.equal(await p.locator('.chapter-intro').evaluate(e=>getComputedStyle(e).display),'none','hidden must suppress actual rendering, not just set an attribute');assert(Math.abs(s.cam.x-camSpawn.x)<1e-6&&Math.abs(s.cam.z-camSpawn.z)<1e-6&&Math.abs(s.cam.y-camSpawn.y)<1e-6,'camera restored '+JSON.stringify(s.cam));assert.equal(s.gun,true);
 s=await run('frame',.05,2);assert(s.elapsed>el0,'simulation resumes after skip');
 // full run-through without skipping ends by itself; Escape cancels and restores.
 s=await run('fresh');s=await run('intro');s=await run('frame',.05,201);assert.equal(s.intro.active,false,'auto end at 10 s');assert.equal(s.cinematic,null);
 s=await run('fresh');s=await run('intro');s=await run('frame',.05,5);await p.keyboard.press('Escape');await p.waitForFunction(()=>document.body.dataset.playState==='paused');s=await run('snap');assert.equal(s.intro.active,false,'pause cancels intro');assert.equal(s.cinematic,null);
 // setting off -> no intro; default automation -> no intro
 await run('setFx','intro',false);s=await run('fresh');s=await run('intro');assert.equal(s.intro?.active??false,false,'intro toggle off');
 url.search='?map=reactor&menu=chapter';await p.goto(url.href);await p.waitForFunction(()=>!!window.__env);s=await run('fresh');await run('setFx','intro',true);s=await run('intro');assert.equal(s.intro,null,'webdriver default skips intro');
 console.log('PASS chapter intro fly-by / lines / card / skip / cancel');
 // 4) briefing screen between chapters is data-driven (journey advance state).
 await p.evaluate(()=>{localStorage.setItem('neon-eclipse.journey.v7',JSON.stringify({version:7,chapter:0,status:'between',results:[{time:123,kills:9}],checkpoint:null}));});
 url.search='?map=reactor';await p.goto(url.href);await p.waitForFunction(()=>!!window.__env);await p.waitForSelector('#menu-continue:not([aria-disabled="true"])');await p.click('#menu-continue');
 await p.waitForFunction(()=>{const b=document.querySelector('#menu-briefing');return b&&!b.hidden;},null,{timeout:15000}).catch(async e=>{throw new Error('briefing not shown; view='+await p.evaluate(()=>document.querySelector('.menu-shell,.menu-card')?.closest('[data-menu-view]')?.dataset.menuView+' / '+document.querySelector('#menu-context-kicker')?.textContent));});
 const report=await p.locator('[data-briefing=report]').textContent(),threat=await p.locator('[data-briefing=threat]').textContent(),totals=await p.locator('[data-briefing=totals]').textContent();
 assert(report.includes('反应堆设施')&&report.includes('9'),'report from journey result: '+report);assert(threat.includes('地下运输站')&&threat.includes('SWITCHYARD'),'threat preview: '+threat);assert(totals.includes('1 章'),'totals: '+totals);
 console.log('PASS between-chapter briefing');
 assert.deepEqual(errors,[]);await context.close();console.log('PASS batch-5 presentation browser');
}finally{await browser?.close();child?.kill();}
