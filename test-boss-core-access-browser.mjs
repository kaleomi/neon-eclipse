// Isolated geometry audit. Sample supported, occupiable positions and real collision rays; not input or route certification.
// Earlier enemies are elided. Boss activation is controlled; shield-hit targets also count as visible boss geometry.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
let child,browser;
try{
 const port=await new Promise((res,rej)=>{const s=createServer();s.on('error',rej);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>res(p));});});
 child=spawn(process.execPath,['server.cjs'],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
 await new Promise((res,rej)=>{const t=setTimeout(()=>rej(Error('server timeout')),15000);child.stdout.on('data',d=>{if(String(d).includes('ready')){clearTimeout(t);res();}});child.on('error',rej);});
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1100,height:760}}),errors=[];
 await context.addInitScript(()=>localStorage.setItem('neon-eclipse.presentation.v1',JSON.stringify({quality:0})));

 for(const map of ['station','roof','tower','train','harbor','orbital','datacenter','polar']){
  const p=await context.newPage();p.setDefaultTimeout(60000);p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/app.js',async route=>{const response=await route.fetch();let source=await response.text();source=source.replace("if(state==='playing')update(dt);",'if(false)update(dt);');source+=`
window.__coreAccess=()=>{
 reset(3);for(const e of enemies)disposeGroup(e.group);enemies.length=0;overseer.setStage(3);if(!overseer.blocking&&overseer.boss.rules.activate)overseer.boss.rules.activate();overseer.update(0,camera.position,playerMotion.state.y,true);scene.updateMatrixWorld(true);
 const targets=overseer.targets,core=targets.find(o=>o.userData.overseer==='core');if(!core)throw Error('No core');const c=core.getWorldPosition(new THREE.Vector3());
 const heights=[0,...new Set(obstacles.map(o=>o.top??o.h).filter(y=>y>0&&y<=10))];const hits=[];
 for(const y of heights)for(let x=-34;x<=34;x+=2)for(let z=-34;z<=34;z+=2){
  if(!playerMotion.canOccupy(x,z,y)||(IS_TRAIN&&y<.25)||(IS_HARBOR&&y<.25&&harborWater({x,z})))continue;
  if(y>0&&!obstacles.some(o=>Math.abs((o.top??o.h)-y)<.001&&Math.abs(x-o.x)<o.w/2-.35&&Math.abs(z-o.z)<o.d/2-.35))continue;
  const a=new THREE.Vector3(x,y+1.7,z),distance=a.distanceTo(c);if(distance>36||distance<.1)continue;
  const r=new THREE.Raycaster(a,c.clone().sub(a).normalize(),0,36),hit=r.intersectObjects(obstacles.map(o=>o.mesh).concat(targets),false)[0];
  if(hit?.object.userData.overseer==='core'){hits.push({x,z,feet:y,distance:hit.distance});if(hits.length>=3)return hits;}
 }
 return hits;
};`;await route.fulfill({response,body:source});});
  await p.goto('http://127.0.0.1:'+port+'/index.html?map='+map+'&menu=chapter');await p.waitForFunction(()=>window.__coreAccess);
  const hits=await p.evaluate(()=>window.__coreAccess());assert(hits.length>0,map+' core fully occluded from supported standable samples');assert.deepEqual(errors,[]);console.log('PASS core geometry reachability '+map+' '+JSON.stringify(hits));await p.close();
 }
 await context.close();
}finally{await browser?.close();child?.kill();}
