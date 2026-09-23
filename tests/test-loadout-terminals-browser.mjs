// Lightweight DOM/scene-graph regression: no game renderer, WebGL context, gameplay loop or real saves.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
let server,browser;
try{
 let base=process.env.GAME_TEST_URL?new URL(process.env.GAME_TEST_URL).origin:null;
 if(!base){
  const port=await new Promise(resolve=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const n=s.address().port;s.close(()=>resolve(n));});});
  server=spawn(process.execPath,['server.cjs'],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('test server timeout')),15000);server.stdout.on('data',d=>{if(String(d).includes('ready')){clearTimeout(timer);resolve();}});server.on('error',reject);});base='http://127.0.0.1:'+port;
 }
 browser=await chromium.launch({headless:true,args:['--disable-gpu']});
 const context=await browser.newContext({viewport:{width:1000,height:800}}),page=await context.newPage(),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/__loadout-terminal-test__',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>'}));
 await page.goto(base+'/__loadout-terminal-test__');
 const initial=await page.evaluate(async()=>{
  const [T,{createLoadoutWorld},{createLoadoutState},{createRuntimeWeapons}]=await Promise.all([import('/node_modules/three/build/three.module.js'),import('/src/loadout-world.js'),import('/src/loadout-rules.js'),import('/weapons/runtime.js')]);
  const scene=new T.Scene(),camera=new T.PerspectiveCamera();camera.position.set(0,1.7,2);
  // An unrelated outline and solid wall must not be removed or globally hidden by this fix.
  const legitimate=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(1,1,1)),new T.LineBasicMaterial());legitimate.name='UNRELATED_OUTLINE';scene.add(legitimate);
  const wall=new T.Mesh(new T.BoxGeometry(2,3,.1),new T.MeshBasicMaterial());wall.position.set(0,1.2,1);wall.updateMatrixWorld(true);wall.visible=false;scene.add(wall);
  const before=scene.children.map(o=>o.uuid),loadout=createLoadoutState(),ray=new T.Raycaster(),resources={health:73,ammo:[0,4,10],reserve:[0,30,60],charges:{emp:0,pulse:2,decoy:2,smoke:2},kills:5};
  const entries=[{x:0,z:0,feetY:0},{x:12,z:0,feetY:6}];let state='playing',busy=false,equips=0;
  const world=createLoadoutWorld({scene,camera,entries,loadout,weapons:createRuntimeWeapons(),getState:()=>state,isBusy:()=>busy,getThrowableStock:()=>resources.charges,
   hasSight(point){ray.set(camera.position,point.clone().sub(camera.position).normalize());ray.far=camera.position.distanceTo(point);return !ray.intersectObjects(wall.visible?[wall]:[],false).length;},onEquip:()=>equips++});
  function snapshot(){let unexpectedLines=0;scene.traverse(o=>{if(o.isLineSegments&&o!==legitimate)unexpectedLines++;});return {unexpectedLines,extraNodes:scene.children.filter(o=>!before.includes(o.uuid)).map(o=>o.name),originalVisible:legitimate.visible,near:world.nearby(),primary:loadout.state.primary,equips,resources:JSON.stringify(resources),disabled:document.querySelector('[data-equip]').disabled,open:world.open,badge:document.querySelector('.carry-badge').textContent};}
  window.__terminalTest={snapshot,move(x,y,z){camera.position.set(x,y,z);world.render(true);return snapshot();},show(){world.show();return snapshot();},block(value){wall.visible=value;return snapshot();},busy(value){busy=value;},state(value){state=value;},future(){loadout.reset({version:99,opaque:{kept:true}});return loadout.checkpoint();},checkpoint:()=>loadout.checkpoint(),render(value){world.render(value);return snapshot();}};
  world.render(true);return snapshot();
 });
 console.log('SCENE unexpected terminal wireframes: '+initial.unexpectedLines);
 assert.equal(initial.unexpectedLines,0,'loadout interaction anchors must not spawn floating cuboid wireframes');assert.deepEqual(initial.extraNodes,[]);assert(initial.originalVisible);
 console.log('PASS no terminal placeholder geometry; unrelated scene content retained');
 const run=(method,...args)=>page.evaluate(([m,a])=>window.__terminalTest[m](...a),[method,args]);
 assert(initial.near);assert((await run('move',3.2,1.7,0)).near);assert(!(await run('move',3.201,1.7,0)).near);assert(!(await run('move',0,4.7,0)).near);
 assert((await run('move',12,7.7,0)).near);assert(!(await run('move',12,1.7,0)).near);console.log('PASS exact 3.2m and independent upper/lower floor boundaries');
 await run('move',0,1.7,2);assert(!(await run('block',true)).near);assert((await run('block',false)).near);console.log('PASS actual solid-wall raycast still blocks equipment access');
 const ready=await run('show');assert(!ready.disabled);assert.match(ready.badge,/可换装/);await page.selectOption('[data-primary]','1');await page.click('[data-equip]');
 let s=await run('snapshot');assert.equal(s.primary,1);assert.equal(s.equips,1);assert.equal(s.resources,initial.resources);await page.click('[data-close]');assert(!(await run('snapshot')).open);console.log('PASS native equipment button and close; no ammo/health/charge/stat changes');
 // A visible/enabled stale panel cannot bypass range checks at click time.
 await run('show');await page.selectOption('[data-primary]','4');await run('move',30,1.7,30);await page.click('[data-equip]');s=await run('snapshot');assert.equal(s.primary,1);assert.equal(s.equips,1);console.log('PASS moving away after opening does not bypass the apply guard');
 await run('move',0,1.7,2);await run('busy',true);assert((await run('show')).disabled);await run('busy',false);await run('state','paused');assert(!(await run('show')).disabled);
 await run('move',30,1.7,30);assert((await run('show')).disabled);await run('state','ready');assert(!(await run('show')).disabled);console.log('PASS busy/paused/pre-deployment permissions unchanged');
 const future=await run('future');assert((await run('show')).disabled);assert.deepEqual(await run('checkpoint'),future);console.log('PASS future-version loadout remains read-only and preserved');
 for(let i=0;i<40;i++){s=await run('render',i%2===0);assert.equal(s.unexpectedLines,0);assert.deepEqual(s.extraNodes,[]);assert(s.originalVisible);}
 assert.deepEqual(errors,[]);console.log('PASS 40 visibility toggles cannot recreate helpers; no page errors');await context.close();
}finally{await browser?.close();server?.kill();}
