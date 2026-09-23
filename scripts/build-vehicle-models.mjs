// Default is a non-mutating, full binary/manifest/catalog verification. --write regenerates.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Scene,REVISION} from '../node_modules/three/build/three.module.js';
import {GLTFExporter} from '../node_modules/three/examples/jsm/exporters/GLTFExporter.js';
import {VEHICLE_ASSETS,VEHICLE_VERSION,createVehicleVisual,vehicleStats,disposeVehicle} from '../src/vehicle-models.js';
class NodeFileReader {
  async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.({target:this});}
  async readAsDataURL(blob){this.result=`data:${blob.type||'application/octet-stream'};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`;this.onloadend?.({target:this});}
}
globalThis.FileReader ||= NodeFileReader;
const base=new URL('../',import.meta.url),models=new URL('models/',base),write=process.argv.includes('--write');
const hash=data=>createHash('sha256').update(data).digest('hex'),sourceHashes={};
for(const file of ['src/vehicle-models.js','scripts/build-vehicle-models.mjs'])sourceHashes[file]=hash(await readFile(new URL(file,base)));
const assets=[];if(write)await mkdir(models,{recursive:true});
for(const [type,spec] of Object.entries(VEHICLE_ASSETS)) {
  const root=createVehicleVisual(type),scene=new Scene();
  try {
    const stats=vehicleStats(root);
    assert(stats.triangles<5000&&stats.meshes<=6&&stats.materials<=6,spec.id+' original budget exceeded');
    // glTF skinned meshes live at scene root; joints remain in their named rigid hierarchies.
    // This avoids a non-root skin transform warning without changing authored coordinates.
    scene.name=root.name;scene.userData={...root.userData};scene.add(...[...root.children]);
    const binary=Buffer.from(await new GLTFExporter().parseAsync(scene,{binary:true,trs:true}));
    for(const child of [...scene.children])root.add(child);
    const json=JSON.parse(binary.toString('utf8',20,20+binary.readUInt32LE(12)).trim());
    const joints=[...new Set((json.skins||[]).flatMap(s=>s.joints))].map(i=>json.nodes[i].name);
    assert.equal((json.images||[]).length,0);assert.equal((json.animations||[]).length,0);
    assert(!(json.buffers||[]).some(b=>b.uri));
    const manifest={
      asset:spec.file,id:spec.id,name:spec.name,type,version:VEHICLE_VERSION,units:'metres',axis:'+Y up, -Z front',
      pivot:type==='aircraft'?'original fuselage/flight origin':type==='yacht'?'original waterline origin':'original ground-level chassis origin',
      ...stats,bytes:binary.length,sha256:hash(binary),sourceHashes,textures:0,animations:[],externalDependencies:0,
      rig:{skins:(json.skins||[]).length,joints:joints.length,jointNames:joints,mode:joints.length?'rigid one-joint-per-vertex skinning':'static material batches'},
      generator:{three:REVISION,node:process.versions.node},
      runtime:'Same authored geometry and rigid joints in driving pages; no network GLB loading. Rotor blur is a separate runtime-only effect.'
    };
    const file=new URL(spec.file,models),meta=new URL(spec.file.replace('.glb','.manifest.json'),models);
    if(write){await writeFile(file,binary);await writeFile(meta,JSON.stringify(manifest,null,2)+'\n');}
    else{assert.deepEqual(await readFile(file),binary,spec.id+' saved GLB differs');assert.deepEqual(JSON.parse(await readFile(meta,'utf8')),manifest,spec.id+' complete manifest differs');}
    assets.push(manifest);console.log(`${write?'WROTE':'VERIFIED'} ${spec.id}: ${stats.triangles} triangles / ${stats.meshes} meshes / ${stats.materials} materials / ${joints.length} joints / ${binary.length} bytes`);
  } finally {for(const child of [...scene.children])root.add(child);disposeVehicle(root);}
}
const catalog={version:VEHICLE_VERSION,total:assets.length,assets},catalogFile=new URL('vehicles.manifest.json',models);
if(write)await writeFile(catalogFile,JSON.stringify(catalog,null,2)+'\n');
else assert.deepEqual(JSON.parse(await readFile(catalogFile,'utf8')),catalog,'complete vehicle catalog differs');
console.log('PASS vehicle models: '+(write?'generated':'binary, full manifests and catalog verified'));
