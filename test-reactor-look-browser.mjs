import {reactorLookFixture} from './browser-reactor-look-fixture.js';
// Isolated real arena + production presentation controls. Not a full combat FPS benchmark.
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {startVehicleTestServer} from './scripts/vehicle-browser-server.mjs';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const label=process.env.REACTOR_CAPTURE||'after',output='.tools/qa-reactor-look';
const server=await startVehicleTestServer();let browser;
const html=reactorLookFixture;
try{
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const p=await browser.newPage({viewport:{width:960,height:540},deviceScaleFactor:1}),errors=[];p.setDefaultTimeout(120000);p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/__reactor-look.html',r=>r.fulfill({contentType:'text/html',body:html}));await p.goto(server.base+'/__reactor-look.html');await p.waitForFunction(()=>window.rig);
 assert.deepEqual(await p.evaluate(()=>rig.assetErrors),[]);await mkdir(output,{recursive:true});const results=[];
 for(const quality of [0,1,2])for(const view of ['entry','core']){
  await p.evaluate(({quality,view})=>{rig.quality(quality);rig.view(view);},{quality,view});const m=await p.evaluate(()=>rig.measure());results.push({quality,view,...m});
  if(quality===1){await p.evaluate(()=>rig.capture());await p.screenshot({path:output+'/'+label+'-'+view+'.png'});}
  console.log('PASS capture '+label+' '+quality+' '+view+' '+JSON.stringify(m));
 }
 const boundary=await p.evaluate(()=>({collision:rig.collision,ceilings:rig.ceilings}));
 const report={label,scope:'480x270 isolated arena; SwiftShader; GPU finish; 3 warmup/9 samples. Timing diagnostic, not hardware FPS.',results,...boundary};
 await writeFile(output+'/'+label+'.json',JSON.stringify(report,null,2)+'\n');
 if(label==='after'){
  const before=JSON.parse(await readFile(output+'/before.json','utf8'));assert.deepEqual(report.collision,before.collision);assert.deepEqual(report.ceilings,before.ceilings);
  for(let i=0;i<results.length;i++){const a=results[i],b=before.results[i];for(const k of ['calls','triangles','textures','lights'])assert(a[k]<=b[k],k+' budget regression');}
  // The first high-to-low return lazily compiles no-shadow variants; compare only after warming that path.
  const warmed=await p.evaluate(()=>{rig.quality(0);rig.render();rig.quality(2);rig.render();return rig.stats();});
  const cycled=await p.evaluate(()=>{for(let i=0;i<3;i++){rig.quality(0);rig.render();rig.quality(2);rig.render();}return rig.stats();});
  for(const k of ['textures','geometries'])assert.equal(cycled[k],results.at(-1)[k],'quality cycling '+k);
  assert.equal(cycled.programs,warmed.programs,'shader cache must stabilize after warming both shadow variants');
  assert.equal(await p.evaluate(()=>rig.fallbackVisible()),false,'loaded GLB replaces placeholder');
  await p.evaluate(()=>{rig.disposeEnvironment?.();rig.disposeEnvironment?.();});console.log('PASS collision/ceiling exact match; no added draws/triangles/textures/lights; quality-cycle resource stability; idempotent environment release');
  const fallback=await browser.newPage();fallback.on('pageerror',e=>errors.push(e.message));
  await fallback.route('**/__reactor-look.html',r=>r.fulfill({contentType:'text/html',body:html}));
  await fallback.route('**/models/reactor-core.glb',r=>r.abort());await fallback.goto(server.base+'/__reactor-look.html');await fallback.waitForFunction(()=>window.rig,{},{timeout:120000});
  assert.equal(await fallback.evaluate(()=>rig.fallbackVisible()),true);
  assert.deepEqual(await fallback.evaluate(()=>rig.collision),report.collision);
  assert((await fallback.evaluate(()=>{rig.view('core');rig.render();return rig.stats();})).calls>0);
  console.log('PASS failed GLB retains visible core placeholder and unchanged collision');await fallback.close();
 }
 assert.deepEqual(errors,[]);
}finally{await browser?.close();await server.stop();}
