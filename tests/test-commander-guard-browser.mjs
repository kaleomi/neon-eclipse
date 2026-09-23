// C01-specific browser acceptance; fresh profiles + temporary server, no player saves.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const root=path.dirname(fileURLToPath(import.meta.url)),dir=path.join(root,'.tools','qa-commander-c01');await mkdir(dir,{recursive:true});
const checks=[],record=(name,data={})=>{checks.push({name,...data});console.log('PASS:',name,JSON.stringify(data));};
let browser,server;
async function newPage(context){const p=await context.newPage(),errors=[];p.setDefaultTimeout(60000);p.on('pageerror',e=>errors.push(e.message));return {p,errors};}
async function fixture(context){await context.route('**/app.js',async route=>{
 const response=await route.fetch();let source=await response.text();const tick="if(state==='playing')update(dt);";assert(source.includes(tick));source=source.replace(tick,'if(false)update(dt);');
 source+=`
window.__c01Fixture={
 setup(){reset(4);this.original=enemies.map(e=>e.type);this.e=enemies.find(e=>e.type==='commander');if(!this.e)throw Error('Original extraction commander missing');this.allies=enemies.filter(e=>e!==this.e);
  state='playing';document.body.dataset.playState=state;overlay.hidden=true;
  for(const e of enemies){e.speed=0;e.attack=999;e.charge=0;e.group.rotation.y=0;}this.e.group.position.set(0,0,22);this.positions=[[-2,0,22],[2,0,22],[0,0,19]];this.allies.forEach((e,i)=>e.group.position.set(...this.positions[i]));
  camera.position.set(0,1.7,29);playerMotion.reset(camera.position,0);loadout.equip(0);changeWeapon(0);handling.update(1,false);cooldown=0;reload=0;health=100;
  this.aim();update(0);return this.snapshot();},
 aim(){scene.updateMatrixWorld(true);const head=this.e.group.children.find(m=>m.userData.hitZone==='head');camera.lookAt(head.getWorldPosition(new THREE.Vector3()));yaw=camera.rotation.y;pitch=camera.rotation.x;},
 snapshot(){const e=this.e,p=e?.group.userData.parts,ring=e?.group.userData.commandRing;return {original:this.original,hp:e?.hp,source:e?.group.userData.commanderModelSource,mode:p?.commanderModel?.pose.mode,visuals:e?.group.children.filter(o=>o.name==='C01_Visual').length,proxies:e?.group.children.filter(o=>o.isMesh).length,shots:telemetryShots[0],recipients:e?.commanderRecipients,ringVisible:ring?.visible,ringParent:ring?.parent===e?.group,ringOpacity:ring?.material.opacity};},
 fire(){cooldown=0;handling.update(1,false);this.aim();shoot();return this.snapshot();},
 range(inside){this.allies.forEach((e,i)=>e.group.position.set(...(inside?this.positions[i]:[30+i*2,0,22])));update(0);return this.snapshot();},
 charge(){this.e.charge=1;enemyDirector.update(0,3,999);return this.snapshot();},
 remember(){this.old=this.e.group;return this.old.userData.commanderModelSource;},
 oldState(){return {parent:!!this.old.parent,source:this.old.userData.commanderModelSource};}
};`;
 await route.fulfill({response,body:source});
});}
try{
 const port=await new Promise(resolve=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
 server=spawn(process.execPath,['server.cjs'],{cwd:root,env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),20000);server.stdout.on('data',d=>{if(String(d).includes('ready')){clearTimeout(timer);resolve();}});server.on('error',reject);});
 const base=`http://127.0.0.1:${port}`;browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const pc=await browser.newContext({viewport:{width:1440,height:1080}}),{p:preview,errors:pe}=await newPage(pc);
 await preview.goto(base+'/enemy-commander-preview.html');await preview.waitForFunction(()=>window.__c01Preview?.state.ready);
 assert.equal(await preview.evaluate(()=>__c01Preview.state.source),'glb');await preview.locator('#pause').check();await preview.screenshot({path:path.join(dir,'c01-hero.png')});
 for(const mode of ['Patrol','Aim','Command','Hit','Idle']){await preview.click('[data-motion="'+mode+'"]');assert.equal(await preview.getAttribute('[data-motion="'+mode+'"]','aria-pressed'),'true');}
 await preview.locator('#wireframe').check();assert(await preview.evaluate(()=>{let ok=true;__c01Preview.model.traverse(o=>{if(o.isMesh&&!o.material.wireframe)ok=false;});return ok;}));await preview.locator('#wireframe').uncheck();
 await preview.evaluate(()=>{__c01Preview.motion('Command');__c01Preview.mixer.update(.35);__c01Preview.renderer.render(__c01Preview.scene,__c01Preview.camera);});
 await preview.screenshot({path:path.join(dir,'c01-command.png')});await preview.click('[data-view="back"]');await preview.screenshot({path:path.join(dir,'c01-back.png')});
 record('real GLB preview: five embedded clips, segmented mantle and terminal, wireframe and view controls',await preview.evaluate(()=>__c01Preview.state.stats));
 await preview.setViewportSize({width:390,height:844});assert(await preview.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await preview.screenshot({path:path.join(dir,'c01-mobile.png'),fullPage:true});assert.deepEqual(pe,[]);record('390px preview without horizontal overflow or page errors');await pc.close();

 const c=await browser.newContext({viewport:{width:1280,height:800}});await fixture(c);const {p,errors}=await newPage(c);let requests=0;
 p.on('request',r=>{if(r.url().endsWith('/models/commander-guard-c01.glb'))requests++;});
 await p.goto(base+'/index.html?map=reactor&menu=chapter');await p.waitForFunction(()=>!!window.__c01Fixture);await p.evaluate(()=>localStorage.setItem('c01-save-sentinel','keep'));
 await p.evaluate(()=>__c01Fixture.setup());await p.waitForFunction(()=>__c01Fixture.snapshot().source==='glb');
 await p.screenshot({path:path.join(dir,'c01-in-game.png')});const before=await p.evaluate(()=>__c01Fixture.snapshot()),after=await p.evaluate(()=>__c01Fixture.fire());
 assert.equal(before.visuals,1);assert(before.proxies>15);assert(after.hp<before.hp);assert.equal(after.shots,before.shots+1);
 record('original extraction spawn + controlled clear-lane real game shooting',{beforeHp:before.hp,afterHp:after.hp});
 assert.deepEqual(before.original,['assault','commander','assault','heavy']);assert.equal(before.recipients,3);assert.equal(before.mode,'Command');assert(before.ringVisible&&before.ringParent);
 const outside=await p.evaluate(()=>__c01Fixture.range(false));assert.equal(outside.recipients,0);assert.equal(outside.mode,'Idle');assert.equal(outside.ringOpacity,.06);
 const inside=await p.evaluate(()=>__c01Fixture.range(true));assert.equal(inside.recipients,3);assert.equal(inside.mode,'Command');
 assert.equal((await p.evaluate(()=>__c01Fixture.charge())).mode,'Aim');
 record('original support counts and 12m ring survive; out-of-range folds terminal, charge overrides gesture');
 for(let i=0;i<4;i++){await p.evaluate(()=>__c01Fixture.setup());await p.waitForFunction(()=>__c01Fixture.snapshot().source==='glb');assert.equal(await p.evaluate(()=>__c01Fixture.snapshot().visuals),1);}
 assert.equal(requests,1);assert.equal(await p.evaluate(()=>localStorage.getItem('c01-save-sentinel')),'keep');assert.deepEqual(errors,[]);
 record('four respawns use one C01 GLB request; isolated save sentinel preserved');await c.close();

 const dc=await browser.newContext({viewport:{width:960,height:720}});await fixture(dc);let release;const gate=new Promise(resolve=>{release=resolve;});
 await dc.route('**/models/commander-guard-c01.glb',async r=>{await gate;await r.continue();});const {p:dp,errors:de}=await newPage(dc);
 await dp.goto(base+'/index.html?map=reactor&menu=chapter');await dp.waitForFunction(()=>!!window.__c01Fixture);await dp.evaluate(()=>__c01Fixture.setup());
 assert.equal(await dp.evaluate(()=>__c01Fixture.remember()),'procedural');const d=await dp.evaluate(()=>__c01Fixture.snapshot());assert((await dp.evaluate(()=>__c01Fixture.fire())).hp<d.hp);
 await dp.evaluate(()=>__c01Fixture.setup());release();await dp.waitForFunction(()=>__c01Fixture.snapshot().source==='glb');
 const old=await dp.evaluate(()=>__c01Fixture.oldState());assert.equal(old.parent,false);assert.equal(old.source,'procedural');assert.deepEqual(de,[]);
 record('delayed GLB stays playable; completed request does not resurrect disposed commander');await dc.close();

 const fc=await browser.newContext({viewport:{width:960,height:720}});await fixture(fc);await fc.route('**/models/commander-guard-c01.glb',r=>r.fulfill({status:404,body:'intentional missing-asset fixture'}));
 const {p:fp,errors:fe}=await newPage(fc);await fp.goto(base+'/index.html?map=reactor&menu=chapter');await fp.waitForFunction(()=>!!window.__c01Fixture);await fp.evaluate(()=>__c01Fixture.setup());
 await fp.waitForFunction(()=>__c01Fixture.snapshot().source==='procedural-fallback');const f=await fp.evaluate(()=>__c01Fixture.snapshot());assert((await fp.evaluate(()=>__c01Fixture.fire())).hp<f.hp);assert.deepEqual(fe,[]);
 record('404 GLB uses a visible hittable source-built fallback');await fc.close();
 await writeFile(path.join(dir,'results.json'),JSON.stringify({checks,softwareWebGL:true,targetHardwareValidated:false},null,2)+'\n');
 console.log('PASS',checks.length,'C01 browser acceptance groups');
}finally{await browser?.close();server?.kill();}
