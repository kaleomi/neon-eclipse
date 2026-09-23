// DOM/P01-free independent export. Default verifies exact saved bytes, full manifests and catalog.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Scene,Matrix4,REVISION} from '../node_modules/three/build/three.module.js';
import {GLTFExporter} from '../node_modules/three/examples/jsm/exporters/GLTFExporter.js';
import {WEAPON_ASSETS,WEAPON_MODEL_VERSION,createWeaponVisual,getWeaponBindings,weaponVisualStats,disposeWeaponVisual} from '../src/weapon-asset-models.js';
class NodeFileReader {
 async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.({target:this});}
 async readAsDataURL(blob){this.result=`data:${blob.type||'application/octet-stream'};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`;this.onloadend?.({target:this});}
}
globalThis.FileReader ||= NodeFileReader;
const base=new URL('../',import.meta.url),models=new URL('models/',base),write=process.argv.includes('--write'),hash=b=>createHash('sha256').update(b).digest('hex');
const sourceHashes={};for(const f of ['src/weapon-asset-models.js','scripts/build-weapon-models.mjs'])sourceHashes[f]=hash(await readFile(new URL(f,base)));
const assets=[];if(write)await mkdir(models,{recursive:true});
function attachment(node,root){if(!node)return null;const path=[];for(let o=node;o&&o!==root;o=o.parent)path.push(o);const matrix=new Matrix4();for(const o of path.reverse()){o.updateMatrix();matrix.multiply(o.matrix);}return {node:node.name,matrix:matrix.toArray()};}
for(const spec of WEAPON_ASSETS){
 const root=createWeaponVisual(spec.index),scene=new Scene();
 try{
  const stats=weaponVisualStats(root),rig=getWeaponBindings(root);assert(stats.triangles<5000&&stats.meshes<=8&&stats.materials<=8,spec.id+' refinement budget');
  const attachments={right:attachment(rig.right,root),left:attachment(rig.support,root),pumpSupport:attachment(rig.pumpSupport,root),muzzle:attachment(rig.muzzle,root)};
  const controls=Object.fromEntries(['bolt','magazine','pump'].filter(key=>rig[key]).map(key=>[key,rig[key].name]));
  scene.name=root.name;scene.userData={...root.userData};scene.add(...[...root.children]);
  const binary=Buffer.from(await new GLTFExporter().parseAsync(scene,{binary:true,trs:true}));for(const child of [...scene.children])root.add(child);
  const data=JSON.parse(binary.toString('utf8',20,20+binary.readUInt32LE(12)).trim());
  assert.equal((data.images||[]).length,0);assert.equal((data.animations||[]).length,0);assert(!(data.buffers||[]).some(b=>b.uri));
  const jointNodes=[...new Set((data.skins||[]).flatMap(s=>s.joints))];assert.equal(jointNodes.length,stats.joints);
  const manifest={asset:spec.file,id:spec.id,code:spec.code,name:spec.name,weaponId:spec.weaponId,weaponIndex:spec.index,version:WEAPON_MODEL_VERSION,units:'metres',axis:'+Y up, -Z front',pivot:'original weapon-local origin; canonical export scale 1',viewmodelScale:.65,...stats,bytes:binary.length,sha256:hash(binary),sourceHashes,textures:0,animations:[],externalDependencies:0,rig:{skins:(data.skins||[]).length,jointNames:jointNodes.map(i=>data.nodes[i].name),mode:'rigid one-joint-per-vertex weights',controls},attachments,generator:{three:REVISION,node:process.versions.node},runtime:'Same geometry; original .65 viewmodel scale and P01 grip trajectories. No arms, flash, feed-shell or weapon GLB network loading added.'};
  const file=new URL(spec.file,models),meta=new URL(spec.file.replace('.glb','.manifest.json'),models);
  if(write){await writeFile(file,binary);await writeFile(meta,JSON.stringify(manifest,null,2)+'\n');}
  else{assert.deepEqual(await readFile(file),binary,spec.id+' saved GLB differs');assert.deepEqual(JSON.parse(await readFile(meta,'utf8')),manifest,spec.id+' complete manifest differs');}
  assets.push(manifest);console.log(`${write?'WROTE':'VERIFIED'} ${spec.id} ${spec.code}: ${stats.triangles} triangles / ${stats.meshes} meshes / ${stats.materials} materials / ${stats.joints} joints / ${binary.length} bytes`);
 }finally{for(const child of [...scene.children])root.add(child);disposeWeaponVisual(root);}
}
const catalog={version:WEAPON_MODEL_VERSION,total:assets.length,assets},file=new URL('player-weapons.manifest.json',models);
if(write)await writeFile(file,JSON.stringify(catalog,null,2)+'\n');else assert.deepEqual(JSON.parse(await readFile(file,'utf8')),catalog,'complete weapon catalog differs');
console.log('PASS weapon models: '+(write?'generated':'binary, full manifests and catalog verified'));
