// Isolated GLB/source inspector and production-entry acceptance. No startup or gameplay replacement.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {startVehicleTestServer} from '../scripts/vehicle-browser-server.mjs';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const shots=path.resolve('.tools/qa-vehicles-v2');fs.mkdirSync(shots,{recursive:true});
const catalog=JSON.parse(fs.readFileSync(new URL('../models/vehicles.manifest.json',import.meta.url),'utf8'));
const appHash=createHash('sha256').update(fs.readFileSync('vehicle-app.js')).digest('hex');
const groups=[],errors=[];let browser,server;
const pass=message=>{groups.push(message);console.log('PASS '+message);};
try{
  server=await startVehicleTestServer();browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1320,height:900}});page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(server.base+'/vehicle-models-preview.html');
  const ready=async(type,source)=>{await page.waitForFunction(id=>{if(document.body.dataset.loadError)throw Error(document.body.dataset.loadError);return document.body.dataset.ready===id&&document.body.dataset.rendered==='true';},type+':'+source);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));};
  for(const entry of catalog.assets){
    const type=entry.type;await page.selectOption('#asset',type);await ready(type,'glb');await page.click('[data-view=perspective]');
    const glb=await page.evaluate(()=>window.__vehiclePreview.snapshot());assert.equal(glb.stats.triangles,entry.triangles);assert.equal(glb.stats.meshes,6);assert.equal(glb.rig.joints,entry.rig.joints);
    await page.locator('#stage').screenshot({path:path.join(shots,type+'-detail.png')});
    await page.click('[data-view=front]');await page.locator('#stage').screenshot({path:path.join(shots,type+'-front.png')});
    await page.click('[data-view=back]');await page.locator('#stage').screenshot({path:path.join(shots,type+'-back.png')});
    await page.check('#wire');assert(await page.evaluate(()=>window.__vehiclePreview.snapshot().wire));await page.uncheck('#wire');
    if(type!=='yacht'){
      const name={rover:'V01_Wheel_FL',aircraft:'V03_Propeller',helicopter:'V04_RotorBlades'}[type];await page.check('#rig');
      await page.waitForFunction(n=>window.__vehiclePreview.snapshot().joints[n].some(v=>Math.abs(v)>.08),name);await page.uncheck('#rig');
    }else assert(await page.locator('#rig').isDisabled());
    await page.selectOption('#source','procedural');await ready(type,'procedural');const source=await page.evaluate(()=>window.__vehiclePreview.snapshot());
    assert.equal(source.stats.triangles,glb.stats.triangles);assert.equal(source.rig.joints,glb.rig.joints);
    for(const end of ['min','max'])for(let i=0;i<3;i++)assert(Math.abs(source.stats.bounds[end][i]-glb.stats.bounds[end][i])<2e-6,type+' source/GLB bounds');
    await page.selectOption('#source','glb');await ready(type,'glb');pass(entry.id+' actual GLB/source parity, three views, wireframe and exported joint controls');
  }
  await page.setViewportSize({width:390,height:844});await page.selectOption('#asset','rover');await ready('rover','glb');await page.click('[data-view=perspective]');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'390px horizontal overflow');
  await page.screenshot({path:path.join(shots,'inspector-mobile.png'),fullPage:true});pass('390px inspector, controls and rendered asset without horizontal overflow');await page.close();

  // First boot is completely uninstrumented, using native menu/entry/drive input.
  const native=await browser.newPage({viewport:{width:1280,height:800}});native.setDefaultTimeout(60000);native.on('pageerror',e=>errors.push(e.message));
  const requests=[];native.on('request',request=>{if(/vehicle-(rover|yacht|aircraft|helicopter)-v0[1-4]\.glb/.test(request.url()))requests.push(request.url());});
  await native.goto(server.base+'/vehicle.html');await native.waitForSelector('#vehicle-scene canvas');await native.click('#resume-drive');await native.waitForFunction(()=>document.body.dataset.driveActive==='true');
  await native.keyboard.press('KeyE');await native.waitForFunction(()=>document.body.dataset.vehicleKind==='rover');
  await native.keyboard.down('KeyW');await native.waitForFunction(()=>Number(document.querySelector('#drive-speed').textContent)>5);await native.keyboard.up('KeyW');
  await native.keyboard.press('Escape');await native.waitForSelector('#drive-overlay:not([hidden])');
  await native.screenshot({path:path.join(shots,'production-native.png')});assert.deepEqual(requests,[]);await native.close();
  pass('unmodified vehicle.html boots, native E boards / W drives / Esc pauses, no vehicle GLB network requests');

  // Read-only suffix identifies all four real scene objects. No state/pose or controller injection.
  const observed=await browser.newPage({viewport:{width:1280,height:800}});observed.setDefaultTimeout(60000);observed.on('pageerror',e=>errors.push(e.message));
  await observed.route('**/vehicle-app.js',async route=>{
    const response=await route.fetch(),body=await response.text();assert.equal(createHash('sha256').update(body).digest('hex'),appHash);
    const hook=`\nwindow.__vehicleModelsReadOnly=()=>[roverModel.root,yachtModel.root,planeModel.root,heliModel.root].map(root=>{let meshes=0,triangles=0;root.traverse(o=>{if(o.isMesh&&o.userData.vehicleVisual){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});return {id:root.userData.assetId,version:root.userData.version,meshes,triangles};});\n`;
    await route.fulfill({response,body:body+hook});
  });
  await observed.goto(server.base+'/vehicle.html');await observed.waitForFunction(()=>typeof window.__vehicleModelsReadOnly==='function');
  const live=await observed.evaluate(()=>window.__vehicleModelsReadOnly());assert.equal(live.length,4);
  for(const entry of catalog.assets){const actual=live.find(v=>v.id===entry.id);assert(actual);assert.equal(actual.version,catalog.version);assert.equal(actual.triangles,entry.triangles);assert.equal(actual.meshes,entry.meshes);}
  await observed.screenshot({path:path.join(shots,'production-four-models.png')});await observed.close();
  assert.equal(createHash('sha256').update(fs.readFileSync('vehicle-app.js')).digest('hex'),appHash);assert.deepEqual(errors,[]);
  pass('read-only scene observation confirms all four v2 geometries; no vehicle-app.js change or browser exceptions');
  fs.writeFileSync(path.join(shots,'result.json'),JSON.stringify({status:'passed',groups,productionAppSha256:appHash,assets:catalog.assets.map(a=>({id:a.id,sha256:a.sha256,triangles:a.triangles})),errors,scope:'isolated Chromium/SwiftShader; native boot plus read-only scene observation, not target-GPU/human/full-campaign acceptance'},null,2)+'\n');
  console.log(`PASS vehicle models browser: ${groups.length} groups`);
}finally{await browser?.close();await server?.stop();}
