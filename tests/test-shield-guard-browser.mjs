// B04 browser acceptance: isolated storage, native spawner/shooting/EMP timers, controlled clocks.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const root=path.dirname(fileURLToPath(import.meta.url)),dir=path.join(root,'.tools','qa-shield-b04');await mkdir(dir,{recursive:true});
const checks=[],record=(name,data={})=>{checks.push({name,...data});console.log('PASS:',name,JSON.stringify(data));};
let browser,server;
async function newPage(context){const p=await context.newPage(),errors=[];p.setDefaultTimeout(60000);p.on('pageerror',e=>errors.push(e.message));return {p,errors};}
async function fixture(context){await context.route('**/app.js',async route=>{
 const response=await route.fetch();let source=await response.text();const marker="if(state==='playing')update(dt);";assert(source.includes(marker));source=source.replace(marker,'if(false)update(dt);');
 source+=`
import {applyEmp as b04ApplyEmp,empVisual as b04EmpVisual} from '../src/emp-world.js';
window.__b04Fixture={
 setup(){reset(0);for(const e of enemies)disposeGroup(e.group);enemies.length=0;enemyProjectiles.clear();this.watch=null;
  spawnEncounter({...mission.current,count:1,level:1,roles:['shield'],sentry:false,swarm:false});this.e=enemies.find(e=>e.type==='shield');if(!this.e)throw Error('Native spawner did not create test shield');
  this.e.group.position.set(0,0,22);this.e.group.rotation.y=0;this.e.speed=0;this.e.attack=999;this.e.charge=0;
  state='playing';document.body.dataset.playState=state;overlay.hidden=true;camera.position.set(0,1.7,29);playerMotion.reset(camera.position,0);
  loadout.equip(0);changeWeapon(0);handling.update(1,false);cooldown=0;reload=0;health=100;this.time=0;this.aim();update(0);return this.snapshot();},
 aim(core=false){scene.updateMatrixWorld(true);const p=this.e.group.userData.parts,h=core?p.core:p.shield[0];camera.lookAt(h.getWorldPosition(new THREE.Vector3()));yaw=camera.rotation.y;pitch=camera.rotation.x;camera.updateMatrixWorld(true);},
 shown(o){for(let n=o;n;n=n.parent)if(!n.visible)return false;return true;},
 snapshot(){const e=this.e,p=e?.group.userData.parts,s=p?.shieldModel,proxies=e?.group.children.filter(o=>o.isMesh)||[];return {state,hp:e?.hp,scale:e?.group.scale.x,types:enemies.map(e=>e.type),source:e?.group.userData.shieldModelSource,mode:s?.pose.mode,visuals:e?.group.children.filter(o=>o.name==='B04_Visual').length,proxies:proxies.length,proxyMaterialsHidden:proxies.every(m=>!m.material.visible),nativePlate:p?.shield.map(m=>m.visible),fieldVisible:s?this.shown(s.visual.rig.nodes.Shield):null,fieldParent:s?.visual.rig.nodes.Shield.parent===p?.shield[0],fieldScale:s?.visual.rig.nodes.Shield.scale.x,coreAnchor:s?.visual.rig.core.position.toArray(),shots:telemetryShots[0],charge:e?.charge,charging:enemyProjectiles.charging,bolts:enemyProjectiles.count,shieldDown:e?.shieldDownRemaining||0,empBlocked:!!e?.empBlocked,watch:this.watch};},
 fire(core=false){cooldown=0;handling.update(1,false);this.aim(core);shoot();return this.snapshot();},
 rear(){camera.position.set(0,1.7,15);playerMotion.reset(camera.position,0);this.aim(true);return this.snapshot();},
 breakShield(){scene.updateMatrixWorld(true);const affected=b04ApplyEmp(this.e.group.position.clone().add(new THREE.Vector3(0,1.3,0)),enemies,obstacles,enemyProjectiles);affected.forEach(e=>b04EmpVisual(e,true));if(!affected.includes(this.e))throw Error('Controlled native EMP pulse missed shield');return this.snapshot();},
 warn(){enemyProjectiles.clear();this.e.attack=0;this.e.charge=0;this.e.group.rotation.y=0;camera.position.set(0,1.7,29);playerMotion.reset(camera.position,0);scene.updateMatrixWorld(true);enemyDirector.update(0,this.time,0);return this.snapshot();},
 tick(dt){if(state==='playing'){this.time+=dt;emp.update(dt);enemyDirector.update(dt,this.time,999);enemyProjectiles.update(dt,camera.position);}return this.snapshot();},
 clock(dt){if(state==='playing')emp.update(dt);return this.snapshot();},
 resume(){return flow.enterPlay();},
 remember(){this.old=this.e.group;return this.old.userData.shieldModelSource;},
 oldState(){return {parent:!!this.old.parent,source:this.old.userData.shieldModelSource};},
 watchReplacement(){const p=this.e.group.userData.parts,s=p.shieldModel,geos=new Set();for(const root of [s.visual.root,s.visual.rig.nodes.Shield])root.traverse(o=>{if(o.geometry)geos.add(o.geometry);});const w=this.watch={expected:geos.size,released:0,expectedMaterials:s.visual.materials.length,releasedMaterials:0,boundReleased:0};geos.forEach(g=>g.addEventListener('dispose',()=>w.released++));s.visual.materials.forEach(m=>m.addEventListener('dispose',()=>w.releasedMaterials++));for(const m of [p.accent,p.coreMaterial])m.addEventListener('dispose',()=>w.boundReleased++);return w;}
};`;
 await route.fulfill({response,body:source});
});}
try{
 const port=await new Promise(resolve=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
 server=spawn(process.execPath,['server.cjs'],{cwd:root,env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),20000);server.stdout.on('data',d=>{if(String(d).includes('ready')){clearTimeout(timer);resolve();}});server.on('error',reject);});
 const base=`http://127.0.0.1:${port}`;browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const pc=await browser.newContext({viewport:{width:1440,height:1080}}),{p:preview,errors:pe}=await newPage(pc);
 await preview.goto(base+'/enemy-shield-preview.html');await preview.waitForFunction(()=>window.__b04Preview?.state.ready);assert.equal(await preview.evaluate(()=>__b04Preview.state.source),'glb');await preview.locator('#pause').check();await preview.screenshot({path:path.join(dir,'b04-hero.png')});
 for(const mode of ['Patrol','Aim','Exposed','Hit','Idle']){await preview.click('[data-motion="'+mode+'"]');assert.equal(await preview.getAttribute('[data-motion="'+mode+'"]','aria-pressed'),'true');}
 await preview.locator('#wireframe').check();assert(await preview.evaluate(()=>{let ok=true;__b04Preview.model.traverse(o=>{if(o.isMesh&&!o.material.wireframe)ok=false;});return ok;}));await preview.locator('#wireframe').uncheck();
 assert.equal(await preview.evaluate(()=>{__b04Preview.motion('Exposed');__b04Preview.mixer.update(.35);__b04Preview.renderer.render(__b04Preview.scene,__b04Preview.camera);return __b04Preview.model.getObjectByName('B04_Shield').scale.x;}),0);
 await preview.screenshot({path:path.join(dir,'b04-exposed.png')});await preview.click('[data-view="back"]');await preview.screenshot({path:path.join(dir,'b04-back.png')});
 record('actual GLB preview: five embedded clips, Exposed removes projection, wireframe and rear-core view',await preview.evaluate(()=>__b04Preview.state.stats));
 await preview.setViewportSize({width:390,height:844});assert(await preview.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await preview.screenshot({path:path.join(dir,'b04-mobile.png'),fullPage:true});assert.deepEqual(pe,[]);record('390px responsive preview without horizontal overflow or page errors');await pc.close();

 const c=await browser.newContext({viewport:{width:1280,height:800}});await fixture(c);const {p,errors}=await newPage(c);let requests=0;p.on('request',r=>{if(r.url().endsWith('/models/shield-guard-b04.glb'))requests++;});
 await p.goto(base+'/index.html?map=reactor&menu=chapter');await p.waitForFunction(()=>!!window.__b04Fixture);await p.evaluate(()=>localStorage.setItem('b04-save-sentinel','keep'));await p.evaluate(()=>__b04Fixture.setup());await p.waitForFunction(()=>__b04Fixture.snapshot().source==='glb');
 await p.screenshot({path:path.join(dir,'b04-in-game.png')});const before=await p.evaluate(()=>__b04Fixture.snapshot()),blocked=await p.evaluate(()=>__b04Fixture.fire());
 assert.equal(before.visuals,1);assert(before.proxies>15);assert.equal(before.scale,1.1);assert.deepEqual(before.types,['shield']);assert(before.fieldParent&&before.fieldVisible&&before.proxyMaterialsHidden);assert.equal(blocked.hp,before.hp);assert.equal(blocked.shots,before.shots+1);
 record('native spawnEncounter + actual shoot preserves frontal immunity',{hp:before.hp,blockedHp:blocked.hp,scale:before.scale});
 const broken=await p.evaluate(()=>__b04Fixture.breakShield());assert.equal(broken.shieldDown,6);assert.equal(broken.hp,before.hp);assert(!broken.fieldVisible&&!broken.empBlocked);assert.deepEqual(broken.nativePlate,[false,false]);assert.equal(broken.fieldScale,1);
 await p.screenshot({path:path.join(dir,'b04-broken-in-game.png')});const body=await p.evaluate(()=>__b04Fixture.fire());assert(body.hp<broken.hp);assert.equal(body.shots,broken.shots+1);const bodyDamage=broken.hp-body.hp;
 await p.evaluate(()=>__b04Fixture.rear());await p.screenshot({path:path.join(dir,'b04-core-in-game.png')});const core=await p.evaluate(()=>__b04Fixture.fire(true));assert(Math.abs(body.hp-core.hp-2*bodyDamage)<1e-6);
 record('native EMP pulse + real gunfire: exposed front takes damage, rear core takes exactly twice that',{beforeHp:broken.hp,bodyHp:body.hp,coreHp:core.hp,bodyDamage,coreDamage:body.hp-core.hp});
 const warn=await p.evaluate(()=>__b04Fixture.warn());assert.equal(warn.charging,1);assert(Math.abs(warn.charge-.85)<1e-9);assert.equal(warn.mode,'Aim');
 const pending=await p.evaluate(()=>__b04Fixture.breakShield());assert.equal(pending.charging,1);assert.equal(pending.shieldDown,6);await p.keyboard.press('Escape');const paused=await p.evaluate(()=>__b04Fixture.tick(2));assert.notEqual(paused.state,'playing');assert.equal(paused.shieldDown,6);assert(Math.abs(paused.charge-.85)<1e-9);await p.evaluate(()=>__b04Fixture.resume());
 const early=await p.evaluate(()=>__b04Fixture.tick(.799));assert.equal(early.bolts,0);assert.equal(early.charging,1);const fired=await p.evaluate(()=>__b04Fixture.tick(.002));assert.equal(fired.charging,0);assert.equal(fired.bolts,2);assert.equal(fired.mode,'Aim');
 const exposed=await p.evaluate(()=>__b04Fixture.tick(.051));assert.equal(exposed.mode,'Exposed');assert(!exposed.fieldVisible);const last=await p.evaluate(()=>__b04Fixture.clock(6-.852-.001));assert(Math.abs(last.shieldDown-.001)<1e-8);assert(!last.fieldVisible);
 const restored=await p.evaluate(()=>__b04Fixture.clock(.002));assert.equal(restored.shieldDown,0);assert(restored.fieldVisible&&restored.fieldParent);assert.deepEqual(restored.nativePlate,[true,true]);assert.equal(restored.fieldScale,1);const restoredShot=await p.evaluate(()=>__b04Fixture.fire());assert.equal(restoredShot.hp,restored.hp);
 record('native tactical/EMP timer: pause freezes 6s break, pending .8s amber volley survives, projection recovers before another animation tick');
 for(let i=0;i<4;i++){await p.evaluate(()=>__b04Fixture.setup());await p.waitForFunction(()=>__b04Fixture.snapshot().source==='glb');const s=await p.evaluate(()=>__b04Fixture.snapshot());assert.equal(s.visuals,1);assert(s.fieldParent&&s.fieldVisible);}
 assert.equal(requests,1);assert.equal(await p.evaluate(()=>localStorage.getItem('b04-save-sentinel')),'keep');assert.deepEqual(errors,[]);record('four respawns keep exactly one carrier/projection and reuse one asset request; isolated save sentinel preserved');await c.close();

 const dc=await browser.newContext({viewport:{width:960,height:720}});await fixture(dc);let release;const gate=new Promise(resolve=>release=resolve);await dc.route('**/models/shield-guard-b04.glb',async r=>{await gate;await r.continue();});const {p:dp,errors:de}=await newPage(dc);
 await dp.goto(base+'/index.html?map=reactor&menu=chapter');await dp.waitForFunction(()=>!!window.__b04Fixture);await dp.evaluate(()=>__b04Fixture.setup());assert.equal(await dp.evaluate(()=>__b04Fixture.remember()),'procedural');
 await dp.evaluate(()=>__b04Fixture.breakShield());const d=await dp.evaluate(()=>__b04Fixture.snapshot());assert((await dp.evaluate(()=>__b04Fixture.fire())).hp<d.hp);
 await dp.evaluate(()=>__b04Fixture.setup());await dp.evaluate(()=>__b04Fixture.watchReplacement());await dp.evaluate(()=>__b04Fixture.breakShield());release();await dp.waitForFunction(()=>__b04Fixture.snapshot().source==='glb');
 const loaded=await dp.evaluate(()=>__b04Fixture.snapshot()),old=await dp.evaluate(()=>__b04Fixture.oldState());assert(!loaded.fieldVisible&&loaded.fieldParent);assert.equal(loaded.watch.released,loaded.watch.expected);assert.equal(loaded.watch.releasedMaterials,loaded.watch.expectedMaterials);assert.equal(loaded.watch.boundReleased,0);assert.equal(old.parent,false);assert.equal(old.source,'procedural');
 assert((await dp.evaluate(()=>__b04Fixture.clock(6))).fieldVisible);assert.deepEqual(de,[]);record('delayed load during EMP preserves hidden field, frees both fallback branches, retains bound materials and never resurrects old carrier',loaded.watch);await dc.close();

 const fc=await browser.newContext({viewport:{width:960,height:720}});await fixture(fc);await fc.route('**/models/shield-guard-b04.glb',r=>r.fulfill({status:404,body:'intentional missing-asset fixture'}));const {p:fp,errors:fe}=await newPage(fc);
 await fp.goto(base+'/index.html?map=reactor&menu=chapter');await fp.waitForFunction(()=>!!window.__b04Fixture);await fp.evaluate(()=>__b04Fixture.setup());await fp.waitForFunction(()=>__b04Fixture.snapshot().source==='procedural-fallback');const f=await fp.evaluate(()=>__b04Fixture.snapshot());assert(f.fieldVisible);assert.equal((await fp.evaluate(()=>__b04Fixture.fire())).hp,f.hp);
 await fp.evaluate(()=>__b04Fixture.breakShield());assert((await fp.evaluate(()=>__b04Fixture.fire())).hp<f.hp);assert((await fp.evaluate(()=>__b04Fixture.clock(6))).fieldVisible);assert.deepEqual(fe,[]);record('404 asset fallback remains visible, damageable after EMP and recoverable at 6s');await fc.close();
 await writeFile(path.join(dir,'results.json'),JSON.stringify({checks,softwareWebGL:true,targetHardwareValidated:false,controlledFixture:true},null,2)+'\n');console.log('PASS',checks.length,'B04 browser acceptance groups');
}finally{await browser?.close();server?.kill();}
