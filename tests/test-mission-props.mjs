import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from '../node_modules/three/build/three.module.js';
import {GLTFLoader} from '../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import {MISSION_PROP_ASSETS,createMissionPropVisual,createMissionPropLibrary,missionPropStats,disposeMissionProp} from '../src/mission-prop-models.js';
import {createMissionWorld} from '../src/mission-world.js';
import {SUPPLIES,STAGES} from '../src/mission.js';
const hash=b=>createHash('sha256').update(b).digest('hex');
let groups=0;const pass=s=>{groups++;console.log('PASS '+s);};
assert.throws(()=>createMissionPropVisual('invalid'),RangeError);
const roster=JSON.parse(fs.readFileSync(new URL('../models/mission-props.manifest.json',import.meta.url),'utf8'));
assert.equal(roster.total,3);assert.equal(roster.assets.length,3);
for(const [type,spec] of Object.entries(MISSION_PROP_ASSETS)){
 const root=createMissionPropVisual(type),stats=missionPropStats(root);
 assert(stats.meshes<=7);assert(stats.materials<=6);assert(stats.triangles<3000);
 root.traverse(o=>{if(o.isMesh){for(const a of Object.values(o.geometry.attributes))assert([...a.array].every(Number.isFinite));assert.equal(o.material.depthTest,true);}});
 assert.equal(new T.Raycaster(new T.Vector3(0,.15,3),new T.Vector3(0,0,-1)).intersectObject(root,true).length,0,'visual cannot intercept shots');
 if(type==='terminal'){
  assert(stats.bounds.min[0]>=-.90001&&stats.bounds.max[0]<=.90001);assert(stats.bounds.min[1]>=-1e-6&&stats.bounds.max[1]<=1.40001);assert(stats.bounds.max[2]<.51);
 }else{
  assert(stats.bounds.max[0]<=.43&&stats.bounds.max[1]<=.27&&stats.bounds.max[2]<=.347);assert(root.getObjectByName('supply-mark-top'));assert(root.getObjectByName('supply-mark-front'));
 }
 pass(spec.id+' finite geometry, mesh budget, visual-only raycasts and preserved envelope');
 const binary=fs.readFileSync(new URL('../models/'+(spec.file),import.meta.url)),manifest=JSON.parse(fs.readFileSync(new URL('../models/'+(spec.file.replace('.glb','.manifest.json')),import.meta.url),'utf8'));
 assert.equal(binary.toString('ascii',0,4),'glTF');assert.equal(binary.readUInt32LE(4),2);assert.equal(binary.readUInt32LE(8),binary.length);
 assert.equal(hash(binary),manifest.sha256);assert.equal(binary.length,manifest.bytes);assert.equal(roster.assets.find(a=>a.type===type).sha256,manifest.sha256);
 for(const [file,sha] of Object.entries(manifest.sourceHashes))assert.equal(hash(fs.readFileSync(file)),sha,file+' source provenance');
 const gltfJSON=JSON.parse(binary.toString('utf8',20,20+binary.readUInt32LE(12)));
 assert(!gltfJSON.images?.length);assert(!gltfJSON.buffers.some(b=>b.uri));
 const parsed=await new GLTFLoader().parseAsync(binary.buffer.slice(binary.byteOffset,binary.byteOffset+binary.byteLength),'');
 const imported=missionPropStats(parsed.scene);assert.equal(imported.triangles,stats.triangles);assert.equal(imported.meshes,stats.meshes);
 for(const side of ['min','max'])for(let i=0;i<3;i++)assert(Math.abs(imported.bounds[side][i]-stats.bounds[side][i])<1e-6);
 pass(spec.id+' GLB parse, source hashes, exported geometry parity, zero external buffers/textures');
 disposeMissionProp(root);disposeMissionProp(parsed.scene);
}
const library=createMissionPropLibrary(),a=library.create('health'),b=library.create('health');
const ma=a.getObjectByName('M01_Shell_Surface'),mb=b.getObjectByName('M01_Shell_Surface');assert.equal(ma.geometry,mb.geometry);assert.equal(ma.material,mb.material);
a.position.x=9;ma.scale.setScalar(2);assert.equal(b.position.x,0);assert.equal(mb.scale.x,1);
for(let i=0;i<100;i++)for(const t of Object.keys(MISSION_PROP_ASSETS))library.create(t);
assert.equal(library.stats().templates,3);let disposeCalls=0;ma.geometry.addEventListener('dispose',()=>disposeCalls++);library.dispose();library.dispose();assert.equal(disposeCalls,1);assert.throws(()=>library.create('health'));
pass('300 clones reuse bounded templates; transforms isolated; owner disposal idempotent');
const ctx={fillRect(){},strokeRect(){},fillText(){}};globalThis.document={createElement:()=>({getContext:()=>ctx})};
const scene=new T.Scene(),obstacles=[],world=createMissionWorld(scene,obstacles);scene.updateMatrixWorld(true);
const terminals=obstacles.filter(o=>o.terminal);assert.equal(terminals.length,STAGES.flatMap(s=>s.points||[s]).length-STAGES.filter(s=>s.boss||s.id==='extract').length);
for(const o of terminals){
 assert.deepEqual([o.w,o.d,o.top-o.bottom],[1.8,1,1.4]);assert.equal(o.mesh.material.visible,false);
 const geometry=o.mesh.geometry;assert.deepEqual([geometry.parameters.width,geometry.parameters.height,geometry.parameters.depth],[1.8,1.4,1]);
 const visual=o.mesh.parent.children.find(c=>c.userData.missionProp==='terminal');assert(visual);
 for(let i=0;i<8;i++){
  const theta=i*Math.PI/4,centre=o.mesh.getWorldPosition(new T.Vector3()),origin=centre.clone().add(new T.Vector3(Math.sin(theta)*4,0,Math.cos(theta)*4)),dir=centre.clone().sub(origin).normalize();
  const ray=new T.Raycaster(origin,dir),hits=ray.intersectObject(o.mesh,false);assert(hits.length>0,'invisible collider still blocks ray');
  const reference=new T.Mesh(geometry,new T.MeshBasicMaterial());reference.matrixAutoUpdate=false;reference.matrixWorld.copy(o.mesh.matrixWorld);
  assert(Math.abs(hits[0].distance-ray.intersectObject(reference,false)[0].distance)<1e-9);reference.material.dispose();
 }
}
pass('original terminal collider dimensions and eight-direction ray hit distances unchanged');
for(const def of SUPPLIES){const root=scene.getObjectByName('supply-'+def.id);assert(root.getObjectByName('supply-crate').userData.missionProp===def.type);}
const def=SUPPLIES[0],player={x:def.x,z:def.z,y:(def.feetY||0)+1.7};
world.collect(player,()=>false);assert.equal(world.collected.length,0);world.collect({...player,y:player.y+1},()=>true);assert.equal(world.collected.length,0);
world.collect(player,()=>true);assert(world.collected.includes(def.id));assert(!scene.getObjectByName('supply-'+def.id).visible);
for(let i=0;i<100;i++){world.reset();world.restore([def.id]);}assert.deepEqual(world.collected,[def.id]);world.reset();assert.equal(world.available.length,SUPPLIES.length);
pass('pickup rejection, floor gate, consumption and 100 reset/restore cycles unchanged');
console.log('PASS mission-props: '+groups+' groups');
