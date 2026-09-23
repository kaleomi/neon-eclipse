// Native menus, deployment, movement, pause and native settings-radio quality controls; read-only response probe only.
// Isolated profiles. No reset/placement/guard cleanup fixture and no real save access.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {startVehicleTestServer} from '../scripts/vehicle-browser-server.mjs';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const maps=(process.env.SURFACE_BOOT_MAPS||'reactor,station,roof,tower,train,harbor,orbital,datacenter,polar').split(',');
const server=await startVehicleTestServer(),results=[];let browser;
try{
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const map of maps){
  const context=await browser.newContext({viewport:{width:1100,height:760}}),p=await context.newPage(),errors=[];p.setDefaultTimeout(90000);
  await context.addInitScript(()=>localStorage.setItem('neon-eclipse.presentation.v1',JSON.stringify({quality:0,motion:false})));
  p.on('pageerror',e=>{errors.push(e.message);console.error('PAGEERROR',e.stack);});p.on('console',m=>{if(m.type()==='error'&&/WebGLProgram|Shader Error|VALIDATE_STATUS/.test(m.text()))errors.push(m.text());});
  await p.route('**/app.js',async route=>{const response=await route.fetch();const source=await response.text();await route.fulfill({response,body:source+`
window.__chapterSurfaceSmoke=()=>{const materials=new Set();scene.traverse(o=>{if(o.isMesh)for(const material of Array.isArray(o.material)?o.material:[o.material])materials.add(material);});return {state,stage:mission.state.index,health,x:camera.position.x,z:camera.position.z,feet:playerMotion.state.y,intro:!!chapterIntro?.active,q:Number(document.body.dataset.renderQuality),surfaces:[...materials].filter(m=>m.userData.chapterSurface).map(m=>({type:m.type,...m.userData.chapterSurface,map:!!m.map,bump:!!m.bumpMap,roughness:!!m.roughnessMap,metalness:!!m.metalnessMap})),runnable:renderer.info.programs.every(p=>p.diagnostics?.runnable!==false)};};
`});});
  try{
   await p.goto(server.base+'/index.html?map='+map+'&menu=chapter');await p.waitForFunction(()=>document.body.dataset.menuOpen==='true');assert.deepEqual(errors,[],map+' boot errors');assert.equal(await p.locator('.menu-chapter-grid a[data-map]').count(),9);
   await p.click('#deploy');await p.waitForFunction(()=>window.__chapterSurfaceSmoke&&document.body.dataset.playState==='playing');let s=await p.evaluate(()=>__chapterSurfaceSmoke());if(s.intro){await p.keyboard.press('Space');await p.waitForFunction(()=>!__chapterSurfaceSmoke().intro);}
   const start=await p.evaluate(()=>__chapterSurfaceSmoke());assert.equal(start.stage,0);await p.keyboard.down('KeyW');await p.waitForTimeout(450);await p.keyboard.up('KeyW');s=await p.evaluate(()=>__chapterSurfaceSmoke());assert(Math.hypot(s.x-start.x,s.z-start.z)>.02,map+' native W displacement');assert.equal(s.stage,0);assert.equal(s.state,'playing');
   await p.keyboard.press('Escape');await p.waitForFunction(()=>document.body.dataset.playState==='paused');const paused=await p.evaluate(()=>__chapterSurfaceSmoke()),qualities=[];await p.click('.menu-rail [data-open="settings"]');
   for(const expected of [0,1,2,0]){
    // The paused menu intentionally stops key propagation. Use its real graphics radios, not the playing-only Q shortcut.
    await p.locator('label:has(input[name="menu-quality"][value="'+expected+'"])').click();await p.waitForFunction(q=>Number(document.body.dataset.renderQuality)===q,expected,{timeout:12000});await p.waitForTimeout(120);
    const state=await p.evaluate(()=>__chapterSurfaceSmoke());assert.equal(state.state,'paused');assert.equal(state.stage,0);assert.equal(state.health,paused.health);assert(state.runnable,map+' live shader compilation');
    if(map!=='reactor'){const standard=state.surfaces.filter(m=>m.type==='MeshStandardMaterial');assert(standard.length>=2,map+' live surface wiring');assert(state.surfaces.every(m=>m.map),map+' low quality keeps albedo');assert(standard.every(m=>expected===0?!m.bump&&!m.roughness&&!m.metalness:m.bump&&m.roughness&&m.metalness),map+' live quality detail policy');}
    qualities.push({q:expected,surfaces:state.surfaces.length,runnable:state.runnable});
   }
   assert.deepEqual(errors,[]);results.push({map,qualities,health:paused.health,moved:Math.hypot(s.x-start.x,s.z-start.z)});console.log('PASS native surface boot '+map+': nine-card menu, real deploy/W/pause/settings-radio 0->1->2->0, original stage/health frozen while paused, zero page/shader errors');
  }catch(error){console.error('SMOKE_FAIL '+map+' '+JSON.stringify({errors,snapshot:await p.evaluate(()=>window.__chapterSurfaceSmoke?.()||({...document.body.dataset})).catch(()=>null),focus:await p.evaluate(()=>({tag:document.activeElement?.tagName,id:document.activeElement?.id})).catch(()=>null)}));throw error;}finally{await context.close();}
 }
 await mkdir('.tools/qa-chapter-surfaces-2026-09-22-v2',{recursive:true});await writeFile('.tools/qa-chapter-surfaces-2026-09-22-v2/native-smoke.json',JSON.stringify({scope:'Native startup/movement/pause/quality; read-only probe, isolated storage; not natural chapter completion or hardware FPS.',results},null,2)+'\n');
}finally{await browser?.close();await server.stop();}
