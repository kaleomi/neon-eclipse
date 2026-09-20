// Isolated browser contexts; actual game shoot(), unchanged scenery, no real player saves.
// SwiftShader screenshots and functional checks are not native GPU/performance acceptance.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const root=path.dirname(fileURLToPath(import.meta.url)),destination=path.join(root,'.tools','qa-guard-batch');
await mkdir(destination,{recursive:true});
let server,browser;const checks=[];
const record=(name,data={})=>{checks.push({name,...data});console.log('PASS:',name,JSON.stringify(data));};
async function pageFor(context){const p=await context.newPage(),errors=[];p.setDefaultTimeout(60000);p.on('pageerror',e=>errors.push(e.message));return {p,errors};}
async function instrument(context){
  await context.route('**/app.js',async route=>{
    const response=await route.fetch();let source=await response.text();const tick="if(state==='playing')update(dt);";
    assert(source.includes(tick),'fixture must recognize the current game frame loop');source=source.replace(tick,'if(false)update(dt);');
    source+=`
window.__guardBatch={
 setup(type='assault',rear=false){reset(0);this.targets=Object.fromEntries(['assault','heavy'].map(t=>[t,enemies.find(e=>e.type===t)]));
  if(!this.targets.assault||!this.targets.heavy)throw Error('Natural reactor types missing');return this.focus(type,rear);},
 focus(type='assault',rear=false){this.r=this.targets[type];this.rear=rear;camera.position.set(0,1.7,29);playerMotion.reset(camera.position,0);
  for(const [i,e]of enemies.entries()){e.group.position.set(e===this.r?0:25+i*2,0,e===this.r?22:-25);e.group.rotation.y=e===this.r&&rear?Math.PI:0;e.speed=0;e.attack=99;e.charge=0;}
  state='playing';document.body.dataset.playState=state;overlay.hidden=true;cooldown=0;reload=0;selected=0;handling.update(1,false);health=100;
  this.aim();update(0);this.aim();return this.snapshot();},
 aim(){const zone=this.r.type==='heavy'?(this.rear?'core':'armor'):'head';const mesh=this.r.group.children.find(m=>m.userData.hitZone===zone);
  scene.updateMatrixWorld(true);camera.lookAt(mesh.getWorldPosition(new THREE.Vector3()));yaw=camera.rotation.y;pitch=camera.rotation.x;},
 fire(){cooldown=0;handling.update(1,false);this.aim();shoot();return this.snapshot();},
 assets(){return Object.fromEntries(Object.entries(this.targets).map(([t,e])=>[t,{source:e.group.userData.guardVariantSource,visuals:e.group.children.filter(m=>m.name.endsWith('_Visual')).length}]));},
 snapshot(){const e=this.r,g=e.group;scene.updateMatrixWorld(true);const ray=new THREE.Raycaster(camera.position,camera.getWorldDirection(new THREE.Vector3()));
  const hit=ray.intersectObjects(g.children,false)[0];const core=g.getObjectByName('H12_CoreSocket');
  return {type:e.type,hp:e.hp,source:g.userData.guardVariantSource,proxies:g.children.filter(m=>m.isMesh).length,visuals:g.children.filter(m=>m.name.endsWith('_Visual')).length,
   rayZone:hit?.object.userData.hitZone,coreDistance:core?core.getWorldPosition(new THREE.Vector3()).distanceTo(g.userData.parts.core.getWorldPosition(new THREE.Vector3())):null,
   assets:this.assets(),shots:telemetryShots[0],types:enemies.map(e=>e.type),geometry:renderer.info.memory.geometries};},
 remember(){this.old=Object.fromEntries(Object.entries(this.targets).map(([t,e])=>[t,e.group]));return this.oldState();},
 oldState(){return Object.fromEntries(Object.entries(this.old).map(([t,g])=>[t,{parent:!!g.parent,source:g.userData.guardVariantSource,visuals:g.children.filter(m=>m.name.endsWith('_Visual')).length}]));}
};`;
    await route.fulfill({response,body:source});
  });
}
try{
  const port=await new Promise(resolve=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
  server=spawn(process.execPath,['server.cjs'],{cwd:root,env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Server timeout')),20000);server.stdout.on('data',d=>{if(String(d).includes('ready')){clearTimeout(timer);resolve();}});server.on('error',reject);});
  const base='http://127.0.0.1:'+port;
  browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const studioContext=await browser.newContext({viewport:{width:1500,height:960}});
  const {p:studio,errors:studioErrors}=await pageFor(studioContext);
  await studio.goto(base+'/enemy-roster-preview.html');await studio.waitForFunction(()=>window.__guardRoster?.state.ready);
  const roster=await studio.evaluate(()=>__guardRoster.state.units);
  for(const type of ['assault','ranged','heavy']){assert.equal(roster[type].source,'glb');assert.deepEqual(roster[type].clips,['Idle','Patrol','Aim','Hit']);}
  await studio.evaluate(()=>__guardRoster.pauseAt(.12));await studio.screenshot({path:path.join(destination,'lineup.png')});
  for(const type of ['assault','heavy']){
    await studio.click('[data-unit="'+type+'"]');assert.equal(await studio.getAttribute('[data-unit="'+type+'"]','aria-pressed'),'true');
    for(const motion of ['Patrol','Aim','Hit','Idle']){await studio.click('[data-motion="'+motion+'"]');assert.equal(await studio.getAttribute('[data-motion="'+motion+'"]','aria-pressed'),'true');}
    await studio.evaluate(()=>__guardRoster.pauseAt(.12));await studio.screenshot({path:path.join(destination,type+'-hero.png')});
  }
  await studio.locator('#wireframe').check();assert(await studio.evaluate(()=>{let ok=true;for(const u of Object.values(__guardRoster.units))u.model.traverse(o=>{if(o.isMesh&&!o.material.wireframe)ok=false;});return ok;}));
  await studio.locator('#wireframe').uncheck();await studio.click('[data-view="back"]');
  await studio.screenshot({path:path.join(destination,'heavy-back.png')});
  await studio.click('[data-view="front"]');await studio.click('[data-view="hero"]');
  record('three real GLBs, four actions each, selection, wireframe and camera controls',roster);
  await studio.setViewportSize({width:390,height:844});await studio.click('[data-unit="assault"]');
  assert(await studio.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.equal(await studio.locator('a[download]').count(),2);
  await studio.screenshot({path:path.join(destination,'mobile.png'),fullPage:true});assert.deepEqual(studioErrors,[]);
  record('390px roster preview has both downloads, no horizontal overflow or page errors');await studioContext.close();

  const context=await browser.newContext({viewport:{width:1280,height:800}});await instrument(context);
  const {p,errors}=await pageFor(context),requests={assault:0,heavy:0};
  p.on('request',r=>{if(r.url().endsWith('/assault-guard-a03.glb'))requests.assault++;if(r.url().endsWith('/heavy-guard-h12.glb'))requests.heavy++;});
  await p.goto(base+'/index.html?map=reactor&menu=chapter');await p.waitForFunction(()=>!!window.__guardBatch);
  await p.evaluate(()=>localStorage.setItem('guard-batch-sentinel','keep'));
  await p.evaluate(()=>__guardBatch.setup('assault'));await p.waitForFunction(()=>Object.values(__guardBatch.assets()).every(a=>a.source==='glb'));
  const assaultBefore=await p.evaluate(()=>__guardBatch.snapshot());assert.equal(assaultBefore.visuals,1);assert.equal(assaultBefore.rayZone,'head');assert(assaultBefore.proxies>10);
  await p.screenshot({path:path.join(destination,'assault-in-game.png')});const assaultAfter=await p.evaluate(()=>__guardBatch.fire());
  assert(assaultAfter.hp<assaultBefore.hp);assert.equal(assaultAfter.shots,assaultBefore.shots+1);
  record('natural assault spawn: GLB visible, native shoot() damages the original head proxy',{beforeHp:assaultBefore.hp,afterHp:assaultAfter.hp});
  await p.evaluate(()=>__guardBatch.setup('heavy'));await p.waitForFunction(()=>__guardBatch.snapshot().source==='glb');
  const front=await p.evaluate(()=>__guardBatch.snapshot());assert.equal(front.rayZone,'armor');assert(front.coreDistance<1e-8);
  await p.screenshot({path:path.join(destination,'heavy-front-in-game.png')});const frontAfter=await p.evaluate(()=>__guardBatch.fire());
  const frontDamage=front.hp-frontAfter.hp;assert(frontDamage>0);
  await p.evaluate(()=>__guardBatch.setup('heavy',true));await p.waitForFunction(()=>__guardBatch.snapshot().source==='glb');
  const back=await p.evaluate(()=>__guardBatch.snapshot());assert.equal(back.rayZone,'core');assert(back.coreDistance<1e-8);
  await p.screenshot({path:path.join(destination,'heavy-back-in-game.png')});const backAfter=await p.evaluate(()=>__guardBatch.fire());const coreDamage=back.hp-backAfter.hp;
  assert(coreDamage>frontDamage*4);assert(Math.abs(coreDamage/frontDamage-2/.3)<1e-6);
  record('heavy native shooting: frontal armor vs exposed rear core; real GLB core aligned',{frontHp:[front.hp,frontAfter.hp],rearHp:[back.hp,backAfter.hp],frontDamage,coreDamage,ratio:coreDamage/frontDamage});
  for(let i=0;i<6;i++){await p.evaluate(type=>__guardBatch.setup(type),i%2?'heavy':'assault');await p.waitForFunction(()=>Object.values(__guardBatch.assets()).every(a=>a.source==='glb'));}
  assert.deepEqual(requests,{assault:1,heavy:1});assert(await p.evaluate(()=>Object.values(__guardBatch.assets()).every(a=>a.visuals===1)));
  assert.equal(await p.evaluate(()=>localStorage.getItem('guard-batch-sentinel')),'keep');assert.deepEqual(errors,[]);
  record('six resets: one request per type, one visual per enemy, isolated storage preserved',requests);await context.close();

  const delayed=await browser.newContext({viewport:{width:960,height:720}});await instrument(delayed);
  let release;const gate=new Promise(resolve=>{release=resolve;});
  for(const file of ['assault-guard-a03.glb','heavy-guard-h12.glb'])await delayed.route('**/models/'+file,async route=>{await gate;await route.continue();});
  const {p:dp,errors:de}=await pageFor(delayed);await dp.goto(base+'/index.html?map=reactor&menu=chapter');await dp.waitForFunction(()=>!!window.__guardBatch);
  await dp.evaluate(()=>__guardBatch.setup());const remembered=await dp.evaluate(()=>__guardBatch.remember());assert(Object.values(remembered).every(s=>s.source==='procedural'));
  for(const type of ['assault','heavy']){const before=await dp.evaluate(t=>__guardBatch.focus(t,t==='heavy'),type),after=await dp.evaluate(()=>__guardBatch.fire());assert(after.hp<before.hp);}
  await dp.evaluate(()=>__guardBatch.setup('heavy'));release();await dp.waitForFunction(()=>Object.values(__guardBatch.assets()).every(s=>s.source==='glb'));
  const old=await dp.evaluate(()=>__guardBatch.oldState());assert(Object.values(old).every(s=>!s.parent&&s.source==='procedural'&&s.visuals===1));assert.deepEqual(de,[]);
  record('both delayed GLBs: hittable procedural fallbacks; disposed pre-reset groups not resurrected',old);await delayed.close();

  const offline=await browser.newContext({viewport:{width:960,height:720}});await instrument(offline);
  for(const file of ['assault-guard-a03.glb','heavy-guard-h12.glb'])await offline.route('**/models/'+file,route=>route.fulfill({status:404,body:'intentional asset-failure fixture'}));
  const {p:op,errors:oe}=await pageFor(offline);await op.goto(base+'/index.html?map=reactor&menu=chapter');await op.waitForFunction(()=>!!window.__guardBatch);
  await op.evaluate(()=>__guardBatch.setup());await op.waitForFunction(()=>Object.values(__guardBatch.assets()).every(s=>s.source==='procedural-fallback'));
  for(const type of ['assault','heavy']){const before=await op.evaluate(t=>__guardBatch.focus(t,t==='heavy'),type),after=await op.evaluate(()=>__guardBatch.fire());assert(after.hp<before.hp);assert.equal(after.source,'procedural-fallback');}
  assert.deepEqual(oe,[]);record('both missing GLBs: fallback visuals and actual shooting remain functional');await offline.close();
  await writeFile(path.join(destination,'browser-results.json'),JSON.stringify({checks,softwareWebGL:true,targetHardwareValidated:false},null,2)+'\n');
  console.log('PASS '+checks.length+' browser acceptance groups');
}finally{await browser?.close();server?.kill();}
