// Headless geometry/rules only: no WebGL, audio device, browser, native storage or real save.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from './node_modules/three/build/three.module.js';
import {buildProvingGround} from './vehicle-world.js';
import {buildSeaAirField} from './sea-air-world.js';
import {terrainHeight} from './vehicle-rules.js';
import {roverEngine,planeEngine,yachtEngine,vehicleAudioEvents} from './audio/vehicle-audio.js';
const near=(a,b,eps=1e-7)=>assert.ok(Math.abs(a-b)<eps,`${a} != ${b}`);
function makeScene(combined){
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document'),scene=new T.Scene();
 try{
  globalThis.document={createElement(){return {width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})};}};
  if(combined)buildProvingGround(scene,{extended:true});buildSeaAirField(scene,{provingGroundPresent:combined});scene.updateMatrixWorld(true);
 }finally{if(previous)Object.defineProperty(globalThis,'document',previous);else delete globalThis.document;}
 const floors=scene.children.filter(o=>o.isMesh&&o.material?.type==='MeshStandardMaterial'&&['PlaneGeometry','BoxGeometry'].includes(o.geometry?.type)).filter(o=>{
  o.geometry.computeBoundingBox();const b=o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld),s=b.getSize(new T.Vector3());return s.x*s.z>150000&&s.y<2;
 });
 const heights=(x,z)=>{const hits=new T.Raycaster(new T.Vector3(x,5,z),new T.Vector3(0,-1,0),0,10).intersectObjects(floors,false),seen=new Set();return hits.filter(h=>{if(seen.has(h.object))return false;seen.add(h.object);return true;}).map(h=>h.point.y);};
 return {scene,floors,heights,dispose(){const geometries=new Set(),materials=new Set(),textures=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});for(const m of materials){if(m.map)textures.add(m.map);m.dispose();}for(const t of textures)t.dispose();for(const g of geometries)g.dispose();}};
}
let passed=0,failed=0;
function test(name,fn){try{fn();passed++;console.log('PASS',name);}catch(e){failed++;console.error('FAIL',name,e.message.split('\n').slice(0,3).join(' '));}}
test('rover engine bed is trimmed to 65 percent without changing pitch/load response',()=>{
 for(const speed of [0,9,-9,18,29,40])for(const throttle of [-1,0,.5,1]){
  const load=Math.max(0,Math.min(1,Math.abs(throttle))),rpm=.25+Math.min(1,Math.abs(speed)/29)*.75*(.6+.4*load),e=roverEngine(speed,throttle);
  near(e.gain,(.16+rpm*.22+load*.06)*.65);near(e.freq,38+rpm*110);near(e.cutoff,400+rpm*1600);
 }
});
test('plane, yacht and one-shot feedback are not reduced with the rover',()=>{
 near(planeEngine(1,50,false).gain,.36);near(planeEngine(1,50,false).wind,.36);near(yachtEngine(13,1).gain,.33);near(yachtEngine(13,1).wave,.2);
 const events=vehicleAudioEvents({roofShots:0,checkpoints:0},{roofShots:1,checkpoints:1});assert.deepEqual(events.map(e=>e.name),['fire.vanguard','vehicle.checkpoint']);assert.ok(events.every(e=>e.opts===undefined));
});
test('combined land has exactly one ground surface under the original proving ground',()=>{
 const f=makeScene(true);try{
  for(const [x,z] of [[0,0],[-75,75],[105,-60],[180,180],[-200,-200]]){const heights=f.heights(x,z);assert.equal(heights.length,1,`overlapping floors at ${x},${z}: ${heights}`);near(heights[0],terrainHeight(x,z)-.025);}
  const src=fs.readFileSync(new URL('./vehicle-app.js',import.meta.url),'utf8');assert.ok(src.includes('buildSeaAirField(scene,{provingGroundPresent:true})'),'production entry must opt into non-overlapping composition');
 }finally{f.dispose();}
});
test('outer land and all seams retain coverage at the same flat height',()=>{
 const f=makeScene(true);try{
  for(const [x,z] of [[-599,-599],[-599,599],[219,-599],[219,599],[-300,0],[-220.01,100],[-219.99,100],[-220.01,-300],[-219.99,-300],[0,-220.01],[0,-219.99],[0,219.99],[0,220.01]]){
   const heights=f.heights(x,z);assert.equal(heights.length,1,`hole/overlap at ${x},${z}`);near(heights[0],-.025);
  }
 }finally{f.dispose();}
});
test('standalone sea/air field keeps full land but no thin self-shadowing ground box',()=>{
 const f=makeScene(false);try{
  for(const [x,z] of [[0,0],[-599,-599],[-300,100],[219,599]])assert.equal(f.heights(x,z).length,1);
  assert.ok(f.floors.length);for(const floor of f.floors){assert.equal(floor.geometry.type,'PlaneGeometry');assert.equal(floor.castShadow,false);assert.equal(floor.receiveShadow,true);assert.equal(floor.material.depthTest,true);}
 }finally{f.dispose();}
});
test('original terrain height field, runway and dock geometry remain intact',()=>{
 const f=makeScene(true);try{
  const terrain=f.floors.find(o=>o.material.vertexColors);assert.ok(terrain);const p=terrain.geometry.attributes.position;assert.equal(p.count,161*161);
  for(let i=0;i<p.count;i++)near(p.getY(i),terrainHeight(p.getX(i),p.getZ(i))-.025,1e-6);
  for(const [width,depth,top] of [[44,760,.07],[67,12,.8]]){const mesh=f.scene.children.find(o=>o.geometry?.type==='BoxGeometry'&&o.geometry.parameters.width===width&&o.geometry.parameters.depth===depth);assert.ok(mesh);mesh.geometry.computeBoundingBox();near(mesh.geometry.boundingBox.max.y+mesh.position.y,top);}
 }finally{f.dispose();}
});
console.log(`ground/audio feedback: ${passed}/${passed+failed} passed; geometry and pure audio mapping only`);if(failed)process.exitCode=1;
