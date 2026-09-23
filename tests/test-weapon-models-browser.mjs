// Eight independent GLBs, real joints/materials, narrow layout and the unmodified game boot path.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {startVehicleTestServer} from '../scripts/vehicle-browser-server.mjs';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const qa=path.resolve('.tools/qa-weapons-v2');fs.mkdirSync(qa,{recursive:true});
const catalog=JSON.parse(fs.readFileSync(new URL('../models/player-weapons.manifest.json',import.meta.url),'utf8')),appHash=createHash('sha256').update(fs.readFileSync(new URL('../src/app.js',import.meta.url))).digest('hex');
let browser,server;const groups=[],errors=[];const pass=s=>{groups.push(s);console.log('PASS '+s);};
try{
 server=await startVehicleTestServer();browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1340,height:940}});page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(server.base+'/weapon-models-preview.html');
 const ready=async(i,source)=>{await page.waitForFunction(value=>{if(document.body.dataset.loadError)throw Error(document.body.dataset.loadError);return document.body.dataset.ready===value&&document.body.dataset.rendered==='true';},i+':'+source);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));};
 for(const a of catalog.assets){
  const i=a.weaponIndex;await page.selectOption('#asset',String(i));await ready(i,'glb');await page.click('[data-view=perspective]');
  const glb=await page.evaluate(()=>window.__weaponPreview.snapshot());assert.equal(glb.stats.triangles,a.triangles);assert.equal(glb.stats.meshes,a.meshes);assert.equal(glb.stats.joints,a.joints);
  await page.locator('#stage').screenshot({path:path.join(qa,a.id.toLowerCase()+'-detail.png')});
  await page.click('[data-view=back]');await page.locator('#stage').screenshot({path:path.join(qa,a.id.toLowerCase()+'-back.png')});
  await page.check('#wire');assert((await page.evaluate(()=>window.__weaponPreview.snapshot())).materials.every(m=>m.wire));await page.uncheck('#wire');
  await page.check('#anchors');assert((await page.evaluate(()=>window.__weaponPreview.snapshot())).anchors);await page.uncheck('#anchors');
  if(i!==3){
   await page.selectOption('#pose','recoil');let s=await page.evaluate(()=>window.__weaponPreview.snapshot());assert(s.joints[a.id+'_Bolt'].position[2]>-.009);
   await page.selectOption('#pose','reload');s=await page.evaluate(()=>window.__weaponPreview.snapshot());
   if(i===1)assert(s.joints.W02_PumpSupport.position[1]<-.15);else assert(s.joints[a.id+'_Magazine'].position[1]<-.1);
   await page.locator('#stage').screenshot({path:path.join(qa,a.id.toLowerCase()+'-reload.png')});
   if(i===0){await page.check('#rig');await page.waitForFunction(()=>window.__weaponPreview.snapshot().joints.W01_Magazine.position[1]<-.05);await page.uncheck('#rig');}
   if(i>=6){await page.selectOption('#pose','charge');s=await page.evaluate(()=>window.__weaponPreview.snapshot());assert(s.materials.find(m=>m.name===a.id+'_Energy').intensity>2.4);}
   await page.selectOption('#pose','idle');
  }else{assert(await page.locator('#pose').isDisabled());assert(await page.locator('#rig').isDisabled());}
  await page.selectOption('#source','procedural');await ready(i,'procedural');const source=await page.evaluate(()=>window.__weaponPreview.snapshot());
  assert.equal(source.stats.triangles,glb.stats.triangles);assert.equal(source.stats.joints,glb.stats.joints);
  for(const end of ['min','max'])for(let j=0;j<3;j++)assert(Math.abs(source.stats.bounds[end][j]-glb.stats.bounds[end][j])<2e-6);
  await page.selectOption('#source','glb');await ready(i,'glb');pass(a.id+' GLB/source, back view, wireframe, anchors and authored motion/energy controls');
 }
 await page.setViewportSize({width:390,height:844});await page.selectOption('#asset','2');await ready(2,'glb');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(qa,'inspector-mobile.png'),fullPage:true});await page.close();pass('390px independent inspector without horizontal overflow');
 const native=await browser.newPage({viewport:{width:1280,height:800}});native.setDefaultTimeout(60000);native.on('pageerror',e=>errors.push(e.message));const requests=[];native.on('request',r=>{if(/\/models\/weapon-.*-w0[1-8]\.glb/.test(r.url()))requests.push(r.url());});
 await native.goto(server.base+'/index.html');await native.waitForFunction(()=>document.body.dataset.menuOpen==='true');await native.screenshot({path:path.join(qa,'native-menu.png')});assert.deepEqual(requests,[]);await native.close();
 const observed=await browser.newPage({viewport:{width:1280,height:800}});observed.setDefaultTimeout(60000);observed.on('pageerror',e=>errors.push(e.message));
 await observed.route('**/app.js',async route=>{const response=await route.fetch(),body=await response.text();assert.equal(createHash('sha256').update(body).digest('hex'),appHash);const hook=`\nwindow.__weaponModelsReadOnly=()=>gun.children.slice(0,8).map(root=>{let meshes=0,triangles=0;root.traverse(o=>{if(o.isMesh&&o.userData.weaponVisual){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});return {id:root.userData.assetId,version:root.userData.version,meshes,triangles,scale:root.scale.x};});\n`;await route.fulfill({response,body:body+hook});});
 await observed.goto(server.base+'/index.html');await observed.waitForFunction(()=>typeof window.__weaponModelsReadOnly==='function');const actual=await observed.evaluate(()=>window.__weaponModelsReadOnly());assert.equal(actual.length,8);
 for(const a of catalog.assets){const v=actual[a.weaponIndex];assert.equal(v.id,a.id);assert.equal(v.version,catalog.version);assert.equal(v.meshes,a.meshes);assert.equal(v.triangles,a.triangles);assert.equal(v.scale,.65);}
 await observed.close();assert.equal(createHash('sha256').update(fs.readFileSync(new URL('../src/app.js',import.meta.url))).digest('hex'),appHash);assert.deepEqual(errors,[]);
 pass('native unmodified menu boot plus read-only confirmation of eight v2 viewmodels, original scale and no weapon GLB requests');
 fs.writeFileSync(path.join(qa,'gallery-result.json'),JSON.stringify({status:'passed',groups,appSha256:appHash,errors,scope:'Chromium/SwiftShader gallery and real boot; separate P01 controlled-clock suite verifies actual first-person grips'},null,2)+'\n');
 console.log(`PASS weapon models browser: ${groups.length} groups`);
}finally{await browser?.close();await server?.stop();}
