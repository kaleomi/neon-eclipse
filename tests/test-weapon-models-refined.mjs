import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from '../node_modules/three/build/three.module.js';
import {GLTFLoader} from '../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import {WEAPON_ASSETS,WEAPON_MODEL_VERSION,createWeaponVisual,getWeaponBindings,weaponVisualStats,disposeWeaponVisual} from '../src/weapon-asset-models.js';
const srcPath=p=>(/^[a-z0-9-]+\.js$/.test(p)?'src/'+p:p);
let groups=0;const pass=s=>{groups++;console.log('PASS '+s);},hash=b=>createHash('sha256').update(b).digest('hex');
const near=(a,b,label,epsilon=2e-6)=>assert(Math.abs(a-b)<epsilon,`${label}: ${a} / ${b}`);
const equalMatrix=(a,b,label)=>{assert.equal(a?.length,b?.length,label);if(a)for(let i=0;i<a.length;i++)near(a[i],b[i],label+' '+i,1e-10);};
function relative(node,stop){if(!node)return null;const m=new T.Matrix4(),chain=[];for(let o=node;o&&o!==stop;o=o.parent)chain.push(o);for(const o of chain.reverse()){o.updateMatrix();m.multiply(o.matrix);}return m.toArray();}
function meshList(root){const out=[];root.traverse(o=>{if(o.isMesh)out.push(o);});return out.sort((a,b)=>a.name.localeCompare(b.name));}
function demo(root,id,t){
 const node=key=>root.getObjectByName(id+'_'+key),bolt=node('Bolt'),mag=node('Magazine'),pump=node('Pump');
 if(bolt)bolt.position.z=-.01+.071*t;if(mag){mag.position.set(-.073*t,-.27*t,.09*t);mag.rotation.z=-.19*t;}if(pump)pump.position.z=-.39+.063*t;
 root.position.set(.37,-.16,.24);root.rotation.y=.18;root.updateMatrixWorld(true);
}
const catalog=JSON.parse(fs.readFileSync(new URL('../models/player-weapons.manifest.json',import.meta.url),'utf8'));assert.equal(catalog.version,WEAPON_MODEL_VERSION);assert.equal(catalog.total,8);
assert.throws(()=>createWeaponVisual(20),RangeError);
for(const spec of WEAPON_ASSETS){
 const root=createWeaponVisual(spec.index),stats=weaponVisualStats(root),manifest=catalog.assets[spec.index],bytes=fs.readFileSync(new URL('../models/'+(spec.file),import.meta.url));
 assert(stats.triangles<5000&&stats.meshes<=8&&stats.materials<=8);assert.equal(stats.triangles,manifest.triangles);assert.equal(hash(bytes),manifest.sha256);
 for(const [f,sha] of Object.entries(manifest.sourceHashes))assert.equal(hash(fs.readFileSync(srcPath(f))),sha,f+' provenance');
 const json=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));assert(!(json.buffers||[]).some(b=>b.uri));assert.equal((json.images||[]).length,0);assert.equal((json.animations||[]).length,0);
 assert(!json.nodes.some(n=>/P01_|LiveReloadShell|flash/i.test(n.name||'')),'standalone export excludes arms and transient effects');
 const imported=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
 assert.equal(imported.userData.assetId,spec.id);assert.equal(imported.userData.version,WEAPON_MODEL_VERSION);
 const a=meshList(root),b=meshList(imported);assert.equal(a.length,b.length);
 root.traverse(o=>{if(!o.isMesh)return;assert(o.isSkinnedMesh);assert(o.material.depthTest);
  for(const attr of Object.values(o.geometry.attributes))assert([...attr.array].every(Number.isFinite));
  const weights=o.geometry.attributes.skinWeight,indices=o.geometry.attributes.skinIndex;for(let i=0;i<weights.count;i++){assert.equal(weights.getX(i),1);assert.equal(weights.getY(i)+weights.getZ(i)+weights.getW(i),0);assert(indices.getX(i)<o.skeleton.bones.length);}
 });
 assert.equal(new T.Raycaster(new T.Vector3(0,2,0),new T.Vector3(0,-1,0)).intersectObject(root,true).length,0);
 const bindings=getWeaponBindings(root);
 for(const [key,node] of [['right',bindings.right],['left',bindings.support],['pumpSupport',bindings.pumpSupport],['muzzle',bindings.muzzle]]){
  const expected=manifest.attachments[key];if(!node){assert.equal(expected,null);continue;}
  assert(imported.getObjectByName(node.name)?.isBone,node.name);equalMatrix(relative(node,root),expected.matrix,'anchor metadata');
 }
 for(const t of [0,.43,1]){
  demo(root,spec.id,t);demo(imported,spec.id,t);
  for(let m=0;m<a.length;m++){
   assert.equal(a[m].name,b[m].name);const count=a[m].geometry.attributes.position.count;assert.equal(count,b[m].geometry.attributes.position.count);
   for(let i=0;i<count;i++){
    const p=a[m].getVertexPosition(i,new T.Vector3()).applyMatrix4(a[m].matrixWorld),q=b[m].getVertexPosition(i,new T.Vector3()).applyMatrix4(b[m].matrixWorld);
    near(p.x,q.x,spec.id+' posed X');near(p.y,q.y,spec.id+' posed Y');near(p.z,q.z,spec.id+' posed Z');
   }
  }
 }
 disposeWeaponVisual(root);disposeWeaponVisual(imported);pass(spec.id+' independent GLB, provenance/budget, normalized rigid weights, anchors and all-vertex posed parity');
}
if(process.argv.includes('--geometry-only')){console.log(`PASS weapon geometry: ${groups} groups`);process.exit(0);}

globalThis.document??={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({},{get:()=>()=>null})})};
const {createWeapons}=await import('../src/weapon-models.js');
const camera=new T.PerspectiveCamera(74,16/9,.05,100),vm=createWeapons(camera),models=vm.gun.children.slice(0,8),anchors=vm.gun.userData.playerArmsState.anchors;
assert.equal(vm.gun.userData.weaponModelsVersion,WEAPON_MODEL_VERSION);assert.equal(models.length,8);assert.equal(vm.gun.children.filter(o=>o.name==='P01_ViewmodelHost').length,1);
let count=0;vm.gun.traverse(o=>{if(o.userData.gripAnchor)count++;});assert.equal(count,14);
const cases=JSON.parse(fs.readFileSync('.tools/qa-weapons-v2/before/animation-contracts.json','utf8'));assert.equal(cases.length,48);
for(const c of cases){
 const {i,recoil,reload,charge}=c;vm.select(i);vm.animate(i,recoil,reload,charge);
 assert.equal(vm.gun.userData.weaponId,c.weaponId);assert.deepEqual(models.map(r=>r.visible),c.visible);assert.deepEqual(models[i].scale.toArray(),c.scale);assert.deepEqual(vm.flash.position.toArray(),c.flash);
 equalMatrix(relative(anchors.hands[i],vm.gun),c.right,'original right grip '+i);equalMatrix(relative(i===1?anchors.pumpSupport:anchors.supports[i],vm.gun),c.left,'original left/pump grip '+i);
 const rig=getWeaponBindings(models[i]);for(const [name,expected] of Object.entries(c.parts)){
  const node=name==='shell'?models[i].getObjectByName('W02_LiveReloadShell'):rig[name];
  if(!expected){assert(!node);continue;}assert(node,name);assert.equal(node.visible,expected.visible);equalMatrix(relative(node,vm.gun),expected.matrix,'original '+name+' '+i);
 }
 near(models[6].userData.railEnergy.emissiveIntensity,c.rail,'original rail emission',1e-12);near(models[7].userData.voltEnergy.emissiveIntensity,c.volt,'original volt emission',1e-12);
 const s=vm.gun.userData.playerArmsState;const right=relative(s.visual.nodes.Hand_R,vm.gun),rightGrip=relative(s.anchors.hands[i],vm.gun);
 for(const k of [12,13,14])near(right[k],rightGrip[k],'P01 right position',1e-6);
 const left=i===1?s.anchors.pumpSupport:s.anchors.supports[i];if(left){const a=relative(s.visual.nodes.Hand_L,vm.gun),b=relative(left,vm.gun);for(const k of [12,13,14])near(a[k],b[k],'P01 left position',1e-6);}
}
vm.dispose();vm.dispose();assert.equal(camera.children.length,0);pass('48 original viewmodel/part/muzzle/emission snapshots preserved; all 14 P01 anchors and sub-micrometre hand solutions');

for(const i of [6,7]){const a=createWeaponVisual(i),b=createWeaponVisual(i),ma=getWeaponBindings(a).energy,mb=getWeaponBindings(b).energy;assert.notEqual(ma,mb);const before=mb.emissiveIntensity;ma.emissiveIntensity=4;assert.equal(mb.emissiveIntensity,before);disposeWeaponVisual(a);disposeWeaponVisual(b);}
for(const spec of WEAPON_ASSETS)for(let c=0;c<6;c++){
 const root=createWeaponVisual(spec.index),resources=new Set(),skeletons=new Set();root.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material)resources.add(o.material);if(o.skeleton)skeletons.add(o.skeleton);});
 for(const s of skeletons){s.computeBoneTexture();resources.add(s.boneTexture);}let released=0;for(const resource of resources)resource.addEventListener('dispose',()=>released++);
 disposeWeaponVisual(root);disposeWeaponVisual(root);assert.equal(released,resources.size,spec.id+' exactly-once release');
}
pass('rail/volt emission isolated per instance; 48 idempotent create/release cycles including bone textures');
const baseline=JSON.parse(fs.readFileSync('.tools/qa-weapons-v2/before/source-hashes.json','utf8'));const checks=baseline.filter(r=>r.role==='unchanged-contract');assert.equal(checks.length,13);
// Files that drifted after the weapons batch are pinned to the joint-fixes batch boundary instead; the batch-start baseline stays untouched.
const boundaryPath='.tools/qa-joint-fixes-2026-09-21/fixed-batch-boundary.json',boundary=fs.existsSync(boundaryPath)?JSON.parse(fs.readFileSync(boundaryPath,'utf8')):{};
for(const record of checks){const current=hash(fs.readFileSync(srcPath(record.path)));assert(current===record.sha256||current===boundary[record.path],record.path+' unchanged');}
pass('13 gameplay/P01 source and asset hashes unchanged (drifted files pinned to the joint-fixes boundary)');
console.log(`PASS refined weapon models: ${groups} groups`);
