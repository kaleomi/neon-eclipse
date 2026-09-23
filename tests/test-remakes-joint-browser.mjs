// Cross-batch acceptance only. Production modules/assets are not edited by this test.
// Native nine-map deployments + controlled real-update FPS poses + bounded reset observations.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {FIELD_LAYOUTS} from '../src/field-layouts.js';
import {startVehicleTestServer} from '../scripts/vehicle-browser-server.mjs';
const {chromium}=await import(process.env.VEHICLE_PLAYWRIGHT_MODULE||'playwright');
const output=path.resolve('.tools/qa-remakes-joint-2026-09-21');fs.mkdirSync(output,{recursive:true});
const weapons=JSON.parse(fs.readFileSync(new URL('../models/player-weapons.manifest.json',import.meta.url),'utf8')).assets;
const appHash=createHash('sha256').update(fs.readFileSync(new URL('../src/app.js',import.meta.url))).digest('hex');
const results={scope:'14 nominated remakes, with four existing environment models and P01 as integration dependencies; software WebGL, not target-GPU/human/full-campaign acceptance',native:[],poses:[],resetSamples:[],findings:[],errors:[]};
const readOnly=String.raw`
window.__remakeJointReadOnly=()=>{
 const props=[];scene.traverse(o=>{if(o.userData.interactiveProp||o.userData.environmentProp)props.push({id:o.userData.assetId,type:o.userData.interactiveProp||o.userData.environmentProp,version:o.userData.version,visible:o.visible});});
 return {map:MAP_ID,state,props,barrels:barrels?.snapshot()||[],nodes:energyNodes?.snapshot()||[],targets:{barrels:obstacles.filter(o=>o.mesh?.userData.barrelId).length,nodes:obstacles.filter(o=>o.mesh?.userData.energyNode!==undefined).length,consoles:obstacles.filter(o=>o.interaction).length},weapons:gun.children.slice(0,8).map(r=>({id:r.userData.assetId,version:r.userData.version,scale:r.scale.x})),arms:gun.userData.playerArmsState?.source,renderer:{...renderer.info.memory,programs:renderer.info.programs?.length||0}};
};`;
const controlled=String.raw`
window.__remakeJoint={
 setup(){chapterIntro?.cancel();reset(0);state='playing';document.body.dataset.playState=state;overlay.hidden=true;document.activeElement?.blur?.();for(const e of enemies)scene.remove(e.group);enemies.length=0;enemyProjectiles.clear();enemyDirector.update=()=>0;engineerDirector.update=()=>{};keys.clear();firing=false;cooldown=0;reload=0;recoil=0;gamepad.reset();health=100;clearAim();return window.__remakeJointReadOnly();},
 step(seconds){for(let left=seconds;left>1e-8;){const dt=Math.min(.05,left);if(state==='playing')update(dt);left-=dt;}},
 pose(i,mode){if(i!==2&&i!==3)loadout.equip(i);selected=i;viewModel.select(i);handling.update(1,false);cooldown=0;firing=false;keys.clear();reload=0;recoil=0;meleeRemaining=0;clearAim();health=100;this.step(.32);aiming=mode==='ads'&&i!==3;this.step(mode==='ads'?.6:.1);if(mode==='reload'&&i!==3){rounds[i]=0;reload=weapons[i].reload*.52;this.step(.016);}renderer.render(scene,camera);return this.measure(i,mode);},
 rel(o,stop){const m=new THREE.Matrix4(),chain=[];for(let n=o;n&&n!==stop;n=n.parent)chain.push(n);for(const n of chain.reverse()){n.updateMatrix();m.multiply(n.matrix);}return new THREE.Vector3().setFromMatrixPosition(m);},
 measure(i,mode){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);const root=gun.children[i],st=gun.userData.playerArmsState;let vertices=0,front=0,inView=0,finite=true;const bounds={minX:1,minY:1,maxX:-1,maxY:-1};
 root.traverse(o=>{if(!o.isMesh||!o.userData.weaponVisual)return;const count=o.geometry.attributes.position.count;for(let k=0;k<count;k+=3){const p=o.getVertexPosition(k,new THREE.Vector3()).applyMatrix4(o.matrixWorld),v=p.clone().applyMatrix4(camera.matrixWorldInverse),n=p.project(camera);vertices++;finite=finite&&[n.x,n.y,n.z,v.z].every(Number.isFinite);if(v.z<=-camera.near)front++;if(n.x>=-1&&n.x<=1&&n.y>=-1&&n.y<=1&&n.z>=-1&&n.z<=1){inView++;bounds.minX=Math.min(bounds.minX,n.x);bounds.maxX=Math.max(bounds.maxX,n.x);bounds.minY=Math.min(bounds.minY,n.y);bounds.maxY=Math.max(bounds.maxY,n.y);}}});
 const left=i===1?st.anchors.pumpSupport:st.anchors.supports[i];return {map:MAP_ID,index:i,mode,id:root.userData.assetId,visible:root.visible&&gun.visible,finite,vertices,front,inView,bounds,ads:handling.state.ads,arms:st.source,rightError:this.rel(st.anchors.hands[i],gun).distanceTo(this.rel(st.visual.nodes.Hand_R,gun)),leftError:left?this.rel(left,gun).distanceTo(this.rel(st.visual.nodes.Hand_L,gun)):null,memory:{...renderer.info.memory,programs:renderer.info.programs?.length||0}};},
 resetCycle(){this.setup();for(let i=0;i<8;i++){this.pose(i,'hip');this.pose(i,'reload');}this.pose(0,'hip');return window.__remakeJointReadOnly();}
};`;
let server,browser;
try{
 server=await startVehicleTestServer();browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1280,height:800}});await context.addInitScript(()=>localStorage.setItem('neon-eclipse.presentation.v1',JSON.stringify({quality:0,motion:false,strength:1,scale:1,density:'standard'})));
 const page=await context.newPage();page.setDefaultTimeout(60000);page.on('pageerror',e=>results.errors.push(e.message));const requests=[];page.on('request',r=>{if(/\/models\/(weapon-.*-w0[1-8]|explosive-barrel-b01|emp-node-e01|vent-console-ev01|light-console-el01|steam-nozzle-ev02|energy-node-en01)\.glb/.test(r.url()))requests.push(r.url());});
 await page.route('**/app.js',async route=>{const response=await route.fetch(),source=await response.text();assert.equal(createHash('sha256').update(source).digest('hex'),appHash);await route.fulfill({response,body:source+readOnly});});
 for(const map of Object.keys(FIELD_LAYOUTS)){
  await page.goto(server.base+'/index.html?intro=0&map='+map+'&menu=chapter');await page.waitForFunction(()=>typeof window.__remakeJointReadOnly==='function');await page.click('#deploy');await page.waitForFunction(()=>document.body.dataset.playState==='playing');
  await page.waitForFunction(()=>window.__remakeJointReadOnly().arms==='glb');const s=await page.evaluate(()=>window.__remakeJointReadOnly()),layout=FIELD_LAYOUTS[map];
  assert.equal(s.map,map);assert.equal(s.targets.barrels,layout.barrels.length);assert.equal(s.targets.nodes,layout.nodes.length);assert.equal(s.targets.consoles,2);
  for(const type of ['vent','light','nozzle'])assert.equal(s.props.filter(p=>p.type===type&&p.version==='environment-props-v1').length,1,map+' '+type);
  assert.equal(s.props.filter(p=>p.id==='B01'&&p.version==='props-v3').length,layout.barrels.length);assert.equal(s.props.filter(p=>p.id==='EN01').length,layout.nodes.length);
  assert.deepEqual(s.weapons.map(w=>w.id),weapons.map(w=>w.id));assert(s.weapons.every(w=>w.version==='weapons-v2'&&w.scale===.65));assert(s.barrels.every(b=>b.enabled&&!b.broken&&b.colliding));
  await page.screenshot({path:path.join(output,'native-'+map+'.png')});results.native.push(s);console.log('PASS joint native deployment '+map+': eight weapons/P01, B01, authored environment and original targets');
 }
 assert.deepEqual(requests,[]);await context.close();
 const poseContext=await browser.newContext({viewport:{width:1280,height:800}});await poseContext.addInitScript(()=>localStorage.setItem('neon-eclipse.presentation.v1',JSON.stringify({quality:0,motion:false,strength:1,scale:1,density:'standard'})));
 const p=await poseContext.newPage();p.setDefaultTimeout(60000);p.on('pageerror',e=>results.errors.push(e.message));
 await p.route('**/app.js',async route=>{const response=await route.fetch(),source=await response.text();assert.equal(createHash('sha256').update(source).digest('hex'),appHash);assert(source.includes('requestAnimationFrame(frame);'));await route.fulfill({response,body:source.replaceAll('requestAnimationFrame(frame);','/* joint acceptance controlled clock */')+readOnly+controlled});});
 for(const map of ['reactor','harbor','polar']){
  await p.goto(server.base+'/index.html?intro=0&map='+map+'&menu=chapter');await p.waitForFunction(()=>typeof window.__remakeJoint==='object');await p.evaluate(()=>window.__remakeJoint.setup());await p.waitForFunction(()=>window.__remakeJointReadOnly().arms==='glb');
  for(let i=0;i<8;i++)for(const mode of ['hip','ads','reload']){
   const s=await p.evaluate(([i,m])=>window.__remakeJoint.pose(i,m),[i,mode]);assert(s.visible&&s.finite,'visible finite '+map+' '+i+' '+mode);assert(s.inView>10,'weapon disappeared '+JSON.stringify(s));assert(s.rightError<1e-6);if(s.leftError!==null)assert(s.leftError<1e-6);if(mode==='ads'&&i!==3)assert(s.ads>.95);results.poses.push(s);
   if(mode==='hip'||(map==='reactor'&&[1,3,6,7].includes(i)))await p.screenshot({path:path.join(output,`pose-${map}-w${i+1}-${mode}.png`)});
  }
  console.log('PASS joint '+map+': 24 real-update weapon poses, visible projection and P01 anchoring');
 }
 await p.goto(server.base+'/index.html?intro=0&map=reactor&menu=chapter');await p.waitForFunction(()=>typeof window.__remakeJoint==='object');await p.evaluate(()=>window.__remakeJoint.setup());await p.waitForFunction(()=>window.__remakeJointReadOnly().arms==='glb');
 for(let i=0;i<12;i++){
  const s=await p.evaluate(()=>window.__remakeJoint.resetCycle());results.resetSamples.push({cycle:i,...s.renderer});assert.equal(s.targets.barrels,2);assert.equal(s.targets.nodes,2);assert.equal(s.targets.consoles,2);assert(s.barrels.every(b=>b.enabled&&!b.broken&&b.colliding));
 }
 const tail=results.resetSamples.slice(-5),stable=['geometries','textures','programs'].every(k=>new Set(tail.map(r=>r[k])).size===1);if(!stable)results.findings.push({severity:'review',area:'render-resource-plateau',samples:tail,note:'Counts did not settle in this bounded controlled workload; not a byte-memory/GPU timing measurement.'});
 console.log('OBSERVE joint reset cycles: stable-last-five='+stable+' '+JSON.stringify(tail));await poseContext.close();
 assert.deepEqual(results.errors,[]);assert.equal(createHash('sha256').update(fs.readFileSync(new URL('../src/app.js',import.meta.url))).digest('hex'),appHash);
 results.status='passed';results.appSha256=appHash;results.renderResourcePlateau=stable;fs.writeFileSync(path.join(output,'joint-browser-result.json'),JSON.stringify(results,null,2)+'\n');console.log('PASS joint model matrix: 9 native maps, 72 controlled viewmodel poses and 12 reset observations');
}catch(error){results.status='failed';results.failure=error.stack;fs.writeFileSync(path.join(output,'joint-browser-result.json'),JSON.stringify(results,null,2)+'\n');throw error;}
finally{await browser?.close();await server?.stop();}
