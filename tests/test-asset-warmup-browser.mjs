// Real index.html boot: chapter warm-up starts the GLB loaders for the chapter roster while the menu is up,
// SFX preload is the map subset, and modulepreload hints are present. Software WebGL, isolated storage.
import assert from 'node:assert/strict';
import {startVehicleTestServer} from '../scripts/vehicle-browser-server.mjs';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const server=await startVehicleTestServer();let browser;
try{
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const [map,expectTypes,absentFile] of [['reactor',['assault','heavy','ranged','commander','warden'],'step-snow-1'],['polar',['hound'],'step-gravel-1']]){
  const context=await browser.newContext({viewport:{width:1280,height:800}}),page=await context.newPage(),errors=[],glb=[];
  page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(r.url().endsWith('.glb'))glb.push(r.url().split('/').pop());});
  await page.goto(server.base+'/index.html?map='+map+'&intro=0');
  await page.waitForFunction(()=>document.body.dataset.uiReady==='true');
  assert.equal(await page.locator('link[rel=modulepreload]').count(),7,'modulepreload hints present');
  const report=await page.evaluate(()=>window.__assetWarmup);
  assert(report,'warm-up ran on '+map);
  for(const t of expectTypes)assert(report.started.includes(t),map+' warm-up covers '+t+': '+JSON.stringify(report));
  assert.deepEqual(report.failed,[],map+' no loader failures');
  // Requests were issued during menu time, before any enemy spawned.
  assert.equal(await page.evaluate(()=>document.body.dataset.playState||'ready'),'ready');
  assert(glb.length>=expectTypes.length-1,map+' GLBs requested at menu: '+glb.join(','));
  // SFX preload is the map subset: the other map's footstep surface is not fetched.
  const samples=await page.evaluate(()=>window.neonAudio.sfx.stats().samples);
  assert(!samples.loaded.includes(absentFile)&&!samples.pending.includes(absentFile),map+' does not fetch '+absentFile);
  assert.deepEqual(errors,[]);
  console.log('ok   '+map+': warm-up started '+report.started.join('/')+' (skipped '+report.skipped.join('/')+'), '+glb.length+' GLB requests at menu, sfx subset respected');
  await context.close();
 }
 console.log('PASS asset warm-up browser: chapter GLB warm-up at menu, map-scoped SFX preload, modulepreload hints');
}finally{await browser?.close();await server.stop();}
