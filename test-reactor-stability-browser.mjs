// Sustained animated scene rendering, not a natural combat playthrough or hardware benchmark.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {reactorLookFixture} from './browser-reactor-look-fixture.js';
import {startVehicleTestServer} from './scripts/vehicle-browser-server.mjs';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const seconds=Number(process.env.REACTOR_SOAK_SECONDS||60);
assert(Number.isInteger(seconds)&&seconds>=30&&seconds<=600&&seconds%30===0,'duration must be 30..600 seconds in multiples of 30');
const output='.tools/qa-reactor-stability',server=await startVehicleTestServer();let browser,timer;
try{
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 timer=setTimeout(()=>browser?.close(),(seconds+120)*1000);
 const p=await browser.newPage({viewport:{width:960,height:540},deviceScaleFactor:1}),errors=[],failed=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('requestfailed',r=>failed.push(r.url()));
 await p.route('**/__reactor-soak.html',r=>r.fulfill({contentType:'text/html',body:reactorLookFixture}));
 await p.goto(server.base+'/__reactor-soak.html');await p.waitForFunction(()=>window.rig,{},{timeout:120000});
 assert.deepEqual(await p.evaluate(()=>rig.assetErrors),[]);
 const baseline=await p.evaluate(()=>{
  window.__contextLost=0;document.querySelector('canvas').addEventListener('webglcontextlost',()=>window.__contextLost++);
  rig.view('entry');for(let i=0;i<3;i++)for(const q of [0,1,2]){rig.quality(q);rig.render();rig.render();}
  return rig.stats();
 });
 await mkdir(output,{recursive:true});const windows=[],started=Date.now();
 const report=()=>({scope:'Animated arena only. Real presentation quality controller; no enemies, damage, saves or natural combat. SwiftShader; wall-clock RAF intervals, not GPU-only timing.',seconds,elapsedSeconds:(Date.now()-started)/1000,baseline,windows,errors,failed});
 for(let i=0;i<seconds/10;i++){
  const sample=await p.evaluate(async({q,index})=>{
   rig.quality(q);rig.render();await new Promise(requestAnimationFrame);
   const start=performance.now(),dt=[];let last=start;
   while(performance.now()-start<10000){
    const now=await new Promise(requestAnimationFrame);dt.push(now-last);rig.step(Math.min(.05,Math.max(0,(now-last)/1000)),now/1000);rig.render();last=now;
   }
   const sorted=[...dt].sort((a,b)=>a-b),percent=p=>sorted[Math.min(sorted.length-1,Math.floor(p*sorted.length))];
   return {index,quality:q,elapsedMs:performance.now()-start,frames:dt.length,p50Ms:percent(.5),p95Ms:percent(.95),maxMs:sorted.at(-1),...rig.stats(),contextLost:window.__contextLost};
  },{q:i%3,index:i});
  windows.push(sample);await writeFile(output+'/soak.json',JSON.stringify(report(),null,2)+'\n');
  assert(sample.frames>=2,'render loop stopped');assert.equal(sample.contextLost,0);
  for(const key of ['geometries','textures','programs'])assert(sample[key]<=baseline[key],key+' grew after warmup: '+JSON.stringify(sample));
  console.log('PASS window '+(i+1)+'/'+seconds/10+' '+JSON.stringify(sample));
 }
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 await writeFile(output+'/soak.json',JSON.stringify({...report(),passed:true},null,2)+'\n');
 console.log('PASS sustained '+seconds+'s animated reactor; '+windows.length+' quality windows; no resource growth or context loss after warmup');
}finally{clearTimeout(timer);await browser?.close();await server.stop();}
