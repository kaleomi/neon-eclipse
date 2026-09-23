// S09-specific browser acceptance; fresh profiles + temporary server, no player saves.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const root=path.dirname(fileURLToPath(import.meta.url)),dir=path.join(root,'.tools','qa-sniper-s09');await mkdir(dir,{recursive:true});
const checks=[],record=(name,data={})=>{checks.push({name,...data});console.log('PASS:',name,JSON.stringify(data));};
let browser,server;
async function newPage(context){const p=await context.newPage(),errors=[];p.setDefaultTimeout(60000);p.on('pageerror',e=>errors.push(e.message));return {p,errors};}
async function fixture(context){await context.route('**/app.js',async route=>{
 const response=await route.fetch();let source=await response.text();const marker="if(state==='playing')update(dt);";assert(source.includes(marker));source=source.replace(marker,'if(false)update(dt);');
 source+=`
window.__s09Fixture={
 setup(){reset(0);for(const e of enemies)disposeGroup(e.group);enemies.length=0;enemyProjectiles.clear();
  spawnEncounter({...mission.current,count:1,level:1,roles:['sniper'],sentry:false,swarm:false});this.e=enemies.find(e=>e.type==='sniper');if(!this.e)throw Error('Native spawner did not create test sniper');
  this.e.group.position.set(0,0,22);this.e.group.rotation.y=0;this.e.speed=0;this.e.attack=999;this.e.charge=0;
  state='playing';document.body.dataset.playState=state;overlay.hidden=true;camera.position.set(0,1.7,29);playerMotion.reset(camera.position,0);
  loadout.equip(0);changeWeapon(0);handling.update(1,false);cooldown=0;reload=0;health=100;this.time=0;this.aim();update(0);return this.snapshot();},
 aim(){scene.updateMatrixWorld(true);const h=this.e.group.children.find(m=>m.userData.hitZone==='head');camera.lookAt(h.getWorldPosition(new THREE.Vector3()));yaw=camera.rotation.y;pitch=camera.rotation.x;},
 snapshot(){const e=this.e,parts=e?.group.userData.parts,proxies=e?.group.children.filter(o=>o.isMesh)||[],target=e?enemyProjectiles.aimTarget(e.group):null;return {state,hp:e?.hp,scale:e?.group.scale.x,types:enemies.map(e=>e.type),source:e?.group.userData.sniperModelSource,mode:parts?.sniperModel?.pose.mode,visuals:e?.group.children.filter(o=>o.name==='S09_Visual').length,proxies:proxies.length,logicalVisible:proxies.every(m=>m.visible&&!m.material.visible),shots:telemetryShots[0],charge:e?.charge,charging:enemyProjectiles.charging,bolts:enemyProjectiles.count,target:target?.toArray()||null};},
 fire(){cooldown=0;handling.update(1,false);this.aim();shoot();return this.snapshot();},
 warn(){enemyProjectiles.clear();this.e.attack=0;this.e.charge=0;this.e.group.rotation.y=0;camera.position.set(0,1.7,29);playerMotion.reset(camera.position,0);scene.updateMatrixWorld(true);enemyDirector.update(0,0,0);return this.snapshot();},
 tick(dt){if(state==='playing'){this.time+=dt;enemyDirector.update(dt,this.time,999);enemyProjectiles.update(dt,camera.position);}return this.snapshot();},
 dodge(){camera.position.x=3;playerMotion.reset(camera.position,0);return this.snapshot();},
 resume(){return flow.enterPlay();},
 remember(){this.old=this.e.group;return this.old.userData.sniperModelSource;},
 oldState(){return {parent:!!this.old.parent,source:this.old.userData.sniperModelSource};}
};`;
 await route.fulfill({response,body:source});
});}
try{
 const port=await new Promise(resolve=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
 server=spawn(process.execPath,['server.cjs'],{cwd:root,env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),20000);server.stdout.on('data',d=>{if(String(d).includes('ready')){clearTimeout(timer);resolve();}});server.on('error',reject);});
 const base=`http://127.0.0.1:${port}`;browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const pc=await browser.newContext({viewport:{width:1440,height:1080}}),{p:preview,errors:pe}=await newPage(pc);
 await preview.goto(base+'/enemy-sniper-preview.html');await preview.waitForFunction(()=>window.__s09Preview?.state.ready);
 assert.equal(await preview.evaluate(()=>__s09Preview.state.source),'glb');await preview.locator('#pause').check();await preview.screenshot({path:path.join(dir,'s09-hero.png')});
 for(const mode of ['Patrol','Aim','Hit','Idle']){await preview.click('[data-motion="'+mode+'"]');assert.equal(await preview.getAttribute('[data-motion="'+mode+'"]','aria-pressed'),'true');}
 await preview.locator('#wireframe').check();assert(await preview.evaluate(()=>{let ok=true;__s09Preview.model.traverse(o=>{if(o.isMesh&&!o.material.wireframe)ok=false;});return ok;}));await preview.locator('#wireframe').uncheck();
 await preview.evaluate(()=>{__s09Preview.motion('Aim');__s09Preview.mixer.update(.35);__s09Preview.renderer.render(__s09Preview.scene,__s09Preview.camera);});
 await preview.screenshot({path:path.join(dir,'s09-aim.png')});await preview.click('[data-view="back"]');await preview.screenshot({path:path.join(dir,'s09-back.png')});
 record('real GLB preview: four embedded clips, two-handed rifle and scope, wireframe and view controls',await preview.evaluate(()=>__s09Preview.state.stats));
 await preview.setViewportSize({width:390,height:844});assert(await preview.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await preview.screenshot({path:path.join(dir,'s09-mobile.png'),fullPage:true});assert.deepEqual(pe,[]);record('390px preview without horizontal overflow or page errors');await pc.close();

 const c=await browser.newContext({viewport:{width:1280,height:800}});await fixture(c);const {p,errors}=await newPage(c);let requests=0;
 p.on('request',r=>{if(r.url().endsWith('/models/sniper-guard-s09.glb'))requests++;});
 await p.goto(base+'/index.html?map=reactor&menu=chapter');await p.waitForFunction(()=>!!window.__s09Fixture);await p.evaluate(()=>localStorage.setItem('s09-save-sentinel','keep'));
 await p.evaluate(()=>__s09Fixture.setup());await p.waitForFunction(()=>__s09Fixture.snapshot().source==='glb');
 await p.screenshot({path:path.join(dir,'s09-in-game.png')});const before=await p.evaluate(()=>__s09Fixture.snapshot()),after=await p.evaluate(()=>__s09Fixture.fire());
 assert.equal(before.visuals,1);assert(before.proxies>15);assert(after.hp<before.hp);assert.equal(after.shots,before.shots+1);
 record('real spawnEncounter with test sniper role + controlled clear-lane shooting',{beforeHp:before.hp,afterHp:after.hp});
 assert.deepEqual(before.types,['sniper']);assert.equal(before.scale,1.02);assert(before.logicalVisible);
 const warn=await p.evaluate(()=>__s09Fixture.warn());assert.equal(warn.state,'playing');assert(Math.abs(warn.charge-1.65)<1e-9);assert.equal(warn.charging,1);assert.equal(warn.bolts,0);assert.equal(warn.mode,'Aim');
 await p.screenshot({path:path.join(dir,'s09-warning.png')});await p.keyboard.press('Escape');const frozen=await p.evaluate(()=>__s09Fixture.tick(2));assert.notEqual(frozen.state,'playing');assert(Math.abs(frozen.charge-1.65)<1e-9);await p.evaluate(()=>__s09Fixture.resume());
 await p.evaluate(()=>__s09Fixture.dodge());const mid=await p.evaluate(()=>__s09Fixture.tick(.8));assert(Math.abs(mid.charge-.85)<1e-9);assert.equal(mid.bolts,0);assert.deepEqual(mid.target,warn.target);
 const early=await p.evaluate(()=>__s09Fixture.tick(.799));assert.equal(early.bolts,0);assert.equal(early.charging,1);
 const fired=await p.evaluate(()=>__s09Fixture.tick(.002));assert.equal(fired.charging,0);assert.equal(fired.bolts,1);assert.equal(fired.mode,'Aim');assert.equal((await p.evaluate(()=>__s09Fixture.tick(.051))).mode,'Idle');
 record('full 1.6s warning + original 50ms pose tail, pause freeze, fixed old aim and actual emission');
 for(let i=0;i<4;i++){await p.evaluate(()=>__s09Fixture.setup());await p.waitForFunction(()=>__s09Fixture.snapshot().source==='glb');assert.equal(await p.evaluate(()=>__s09Fixture.snapshot().visuals),1);}
 assert.equal(requests,1);assert.equal(await p.evaluate(()=>localStorage.getItem('s09-save-sentinel')),'keep');assert.deepEqual(errors,[]);
 record('four respawns use one S09 GLB request; isolated save sentinel preserved');await c.close();

 const dc=await browser.newContext({viewport:{width:960,height:720}});await fixture(dc);let release;const gate=new Promise(resolve=>{release=resolve;});
 await dc.route('**/models/sniper-guard-s09.glb',async r=>{await gate;await r.continue();});const {p:dp,errors:de}=await newPage(dc);
 await dp.goto(base+'/index.html?map=reactor&menu=chapter');await dp.waitForFunction(()=>!!window.__s09Fixture);await dp.evaluate(()=>__s09Fixture.setup());
 assert.equal(await dp.evaluate(()=>__s09Fixture.remember()),'procedural');const d=await dp.evaluate(()=>__s09Fixture.snapshot());assert((await dp.evaluate(()=>__s09Fixture.fire())).hp<d.hp);
 await dp.evaluate(()=>__s09Fixture.setup());release();await dp.waitForFunction(()=>__s09Fixture.snapshot().source==='glb');
 const old=await dp.evaluate(()=>__s09Fixture.oldState());assert.equal(old.parent,false);assert.equal(old.source,'procedural');assert.deepEqual(de,[]);
 record('delayed GLB stays playable; completed request does not resurrect disposed sniper');await dc.close();

 const fc=await browser.newContext({viewport:{width:960,height:720}});await fixture(fc);await fc.route('**/models/sniper-guard-s09.glb',r=>r.fulfill({status:404,body:'intentional missing-asset fixture'}));
 const {p:fp,errors:fe}=await newPage(fc);await fp.goto(base+'/index.html?map=reactor&menu=chapter');await fp.waitForFunction(()=>!!window.__s09Fixture);await fp.evaluate(()=>__s09Fixture.setup());
 await fp.waitForFunction(()=>__s09Fixture.snapshot().source==='procedural-fallback');const f=await fp.evaluate(()=>__s09Fixture.snapshot());assert((await fp.evaluate(()=>__s09Fixture.fire())).hp<f.hp);assert.deepEqual(fe,[]);
 record('404 GLB uses a visible hittable source-built fallback');await fc.close();
 await writeFile(path.join(dir,'results.json'),JSON.stringify({checks,softwareWebGL:true,targetHardwareValidated:false},null,2)+'\n');
 console.log('PASS',checks.length,'S09 browser acceptance groups');
}finally{await browser?.close();server?.kill();}
